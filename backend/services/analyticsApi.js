"use strict";

const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const { isPostgresConfigured, query } = require("../db/pool");

const PUBLIC_EVENT_NAMES = new Set([
  "product_viewed",
  "added_to_cart",
  "checkout_started",
]);
const FUNNEL_EVENT_NAMES = [
  "product_viewed",
  "added_to_cart",
  "checkout_started",
  "order_created",
  "payment_succeeded",
];
const MAX_EVENT_BATCH = 20;
const MAX_JSON_EVENTS = 100_000;

function text(value, maxLength = 180) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function normalizeEventName(value) {
  return text(value, 80)
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function normalizeActorId(value) {
  const normalized = text(value, 160);
  return /^[a-zA-Z0-9._:-]{8,160}$/.test(normalized) ? normalized : "";
}

function normalizeProperties(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const serialized = JSON.stringify(value);
  if (Buffer.byteLength(serialized, "utf8") > 4_096) {
    const error = new Error("Analytics event properties are too large.");
    error.statusCode = 400;
    throw error;
  }
  return JSON.parse(serialized);
}

function normalizeOccurredAt(value, { trusted = false } = {}) {
  const normalizedValue = typeof value === "number"
    || /^\d+$/.test(String(value ?? "").trim())
    ? Number(value)
    : value || Date.now();
  const date = new Date(normalizedValue);
  const epoch = date.getTime();
  const now = Date.now();
  const oldest = now - 30 * 24 * 60 * 60 * 1000;
  if (
    !Number.isFinite(epoch)
    || (!trusted && (epoch < oldest || epoch > now + 5 * 60 * 1000))
  ) {
    const error = new Error("Analytics event timestamp is outside the accepted window.");
    error.statusCode = 400;
    throw error;
  }
  return date.toISOString();
}

function createEventId(rawId = "") {
  const supplied = text(rawId, 180);
  if (supplied && /^[a-zA-Z0-9._:-]{8,180}$/.test(supplied)) {
    return supplied;
  }
  return `evt_${crypto.randomUUID()}`;
}

function eventActorKey(event) {
  return event.accountId || event.anonymousId || event.sessionId || `event:${event.id}`;
}

function summarizeEvents(events, { from, to, days, productId = "" }) {
  const funnel = FUNNEL_EVENT_NAMES.map((eventName, index) => {
    const matching = events.filter((event) => event.eventName === eventName);
    const uniqueActors = new Set(matching.map(eventActorKey)).size;
    const previousCount = index > 0
      ? events.filter((event) => event.eventName === FUNNEL_EVENT_NAMES[index - 1]).length
      : matching.length;
    const startCount = events.filter(
      (event) => event.eventName === FUNNEL_EVENT_NAMES[0],
    ).length;
    return {
      eventName,
      count: matching.length,
      uniqueActors,
      conversionFromPrevious: previousCount > 0
        ? Number(((matching.length / previousCount) * 100).toFixed(2))
        : 0,
      conversionFromStart: startCount > 0
        ? Number(((matching.length / startCount) * 100).toFixed(2))
        : 0,
    };
  });

  const dailyMap = new Map();
  const productMap = new Map();
  for (const event of events) {
    const day = String(event.occurredAt || "").slice(0, 10);
    if (day) {
      const current = dailyMap.get(day) || { date: day, total: 0 };
      current.total += 1;
      current[event.eventName] = (current[event.eventName] || 0) + 1;
      dailyMap.set(day, current);
    }
    if (event.productId) {
      const current = productMap.get(event.productId) || {
        productId: event.productId,
        events: 0,
        views: 0,
        addToCarts: 0,
        checkouts: 0,
        orders: 0,
      };
      current.events += 1;
      if (event.eventName === "product_viewed") current.views += 1;
      if (event.eventName === "added_to_cart") current.addToCarts += 1;
      if (event.eventName === "checkout_started") current.checkouts += 1;
      if (event.eventName === "order_created") current.orders += 1;
      productMap.set(event.productId, current);
    }
  }

  return {
    range: { from, to, days, productId },
    totals: {
      events: events.length,
      uniqueActors: new Set(events.map(eventActorKey)).size,
    },
    funnel,
    daily: [...dailyMap.values()].sort((a, b) => a.date.localeCompare(b.date)),
    topProducts: [...productMap.values()]
      .sort((a, b) => b.events - a.events || b.orders - a.orders)
      .slice(0, 20),
    generatedAt: new Date().toISOString(),
  };
}

function createAnalyticsApi(deps) {
  const {
    DATA_DIR,
    readProducts,
    getRecordAdminId,
    normalizeAdminTenantId,
    enqueueSerializedMutation,
    parseRequestBody,
    sendJson,
    isSuperAdminAuthorized,
  } = deps;
  const jsonFile = path.join(DATA_DIR, "analytics_events.json");

  async function readJsonEvents() {
    try {
      const parsed = JSON.parse(await fs.readFile(jsonFile, "utf8"));
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      if (error?.code === "ENOENT") return [];
      throw error;
    }
  }

  async function writeJsonEvents(events) {
    const tempFile = `${jsonFile}.${process.pid}.${Date.now()}.tmp`;
    await fs.mkdir(path.dirname(jsonFile), { recursive: true });
    await fs.writeFile(tempFile, `${JSON.stringify(events, null, 2)}\n`, "utf8");
    await fs.rename(tempFile, jsonFile);
  }

  async function insertEvents(events) {
    if (isPostgresConfigured()) {
      let accepted = 0;
      for (const event of events) {
        const result = await query(
          `
            INSERT INTO analytics_events (
              id, event_name, occurred_at, admin_id, account_id,
              anonymous_id, session_id, product_id, order_group_id,
              platform_id, source, properties
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb
            )
            ON CONFLICT (id) DO NOTHING
          `,
          [
            event.id,
            event.eventName,
            event.occurredAt,
            event.adminId,
            event.accountId,
            event.anonymousId,
            event.sessionId,
            event.productId,
            event.orderGroupId,
            event.platformId,
            event.source,
            JSON.stringify(event.properties),
          ],
        );
        accepted += result.rowCount;
      }
      return { accepted, duplicates: events.length - accepted };
    }

    return enqueueSerializedMutation("analytics:events", async () => {
      const existing = await readJsonEvents();
      const existingIds = new Set(existing.map((event) => event?.id).filter(Boolean));
      const fresh = events.filter((event) => !existingIds.has(event.id));
      if (fresh.length) {
        await writeJsonEvents([...fresh, ...existing].slice(0, MAX_JSON_EVENTS));
      }
      return { accepted: fresh.length, duplicates: events.length - fresh.length };
    });
  }

  async function loadEvents({ adminId = "", from, to, productId = "" }) {
    if (isPostgresConfigured()) {
      const result = await query(
        `
          SELECT
            id,
            event_name,
            occurred_at,
            admin_id,
            account_id,
            anonymous_id,
            session_id,
            product_id,
            order_group_id,
            platform_id,
            source,
            properties
          FROM analytics_events
          WHERE ($1 = '' OR admin_id = $1)
            AND occurred_at >= $2::timestamptz
            AND occurred_at < $3::timestamptz
            AND ($4 = '' OR product_id = $4)
          ORDER BY occurred_at DESC
          LIMIT 50000
        `,
        [adminId, from, to, productId],
      );
      return result.rows.map((row) => ({
        id: row.id,
        eventName: row.event_name,
        occurredAt: new Date(row.occurred_at).toISOString(),
        adminId: row.admin_id,
        accountId: row.account_id || "",
        anonymousId: row.anonymous_id || "",
        sessionId: row.session_id || "",
        productId: row.product_id || "",
        orderGroupId: row.order_group_id || "",
        platformId: row.platform_id || "",
        source: row.source || "",
        properties: row.properties || {},
      }));
    }

    const fromEpoch = Date.parse(from);
    const toEpoch = Date.parse(to);
    return (await readJsonEvents()).filter((event) => {
      const epoch = Date.parse(event?.occurredAt || "");
      return Number.isFinite(epoch)
        && epoch >= fromEpoch
        && epoch < toEpoch
        && (!adminId || event?.adminId === adminId)
        && (!productId || event?.productId === productId);
    });
  }

  async function normalizePublicEvents(payload, request) {
    const rawEvents = Array.isArray(payload?.events)
      ? payload.events
      : [payload?.event && typeof payload.event === "object" ? payload.event : payload];
    if (!rawEvents.length || rawEvents.length > MAX_EVENT_BATCH) {
      const error = new Error(`Analytics batches must contain 1-${MAX_EVENT_BATCH} events.`);
      error.statusCode = 400;
      throw error;
    }

    const products = await readProducts({ publicCatalog: true });
    const productsById = new Map(
      (Array.isArray(products) ? products : [])
        .map((product) => [text(product?.id ?? product?.productId), product])
        .filter(([productId]) => productId),
    );
    const authenticatedAccountId = text(request?.authSession?.accountId, 160);

    return rawEvents.map((rawEvent) => {
      const eventName = normalizeEventName(rawEvent?.eventName ?? rawEvent?.name ?? rawEvent?.type);
      if (!PUBLIC_EVENT_NAMES.has(eventName)) {
        const error = new Error("Unsupported public analytics event name.");
        error.statusCode = 400;
        throw error;
      }
      const productId = text(rawEvent?.productId);
      const product = productsById.get(productId);
      if (!product) {
        const error = new Error("Analytics product was not found in the public catalog.");
        error.statusCode = 404;
        throw error;
      }
      const adminId = normalizeAdminTenantId(getRecordAdminId(product, ""), "");
      if (!adminId) {
        const error = new Error("Analytics product is missing seller scope.");
        error.statusCode = 409;
        throw error;
      }
      const anonymousId = authenticatedAccountId
        ? ""
        : normalizeActorId(rawEvent?.anonymousId ?? payload?.anonymousId);
      if (!authenticatedAccountId && !anonymousId) {
        const error = new Error("A valid anonymousId is required for guest analytics.");
        error.statusCode = 400;
        throw error;
      }
      return {
        id: createEventId(rawEvent?.id ?? rawEvent?.eventId),
        eventName,
        occurredAt: normalizeOccurredAt(rawEvent?.occurredAt ?? rawEvent?.timestamp),
        adminId,
        accountId: authenticatedAccountId,
        anonymousId,
        sessionId: normalizeActorId(rawEvent?.sessionId ?? payload?.sessionId),
        productId,
        orderGroupId: "",
        platformId: text(rawEvent?.platformId ?? payload?.platformId, 80),
        source: text(rawEvent?.source ?? payload?.source, 80) || "buyer_app",
        properties: normalizeProperties(rawEvent?.properties),
      };
    });
  }

  async function handleEvents(request, response) {
    if (request.method !== "POST") {
      sendJson(response, 405, { message: "Method not allowed." });
      return;
    }
    try {
      const payload = await parseRequestBody(request);
      const events = await normalizePublicEvents(payload, request);
      const result = await insertEvents(events);
      sendJson(response, result.accepted ? 202 : 200, {
        ...result,
        eventIds: events.map((event) => event.id),
        message: result.accepted ? "Analytics events accepted." : "Analytics events already received.",
      });
    } catch (error) {
      sendJson(response, error?.statusCode || 400, {
        message: error instanceof Error ? error.message : "Unable to record analytics events.",
      });
    }
  }

  async function handleSummary(request, response, requestUrl) {
    if (request.method !== "GET") {
      sendJson(response, 405, { message: "Method not allowed." });
      return;
    }
    try {
      const superAdmin = isSuperAdminAuthorized(request);
      const sessionAdminId = normalizeAdminTenantId(request?.authSession?.adminId, "");
      const requestedAdminId = normalizeAdminTenantId(
        requestUrl.searchParams.get("adminId"),
        "",
      );
      const adminId = superAdmin ? requestedAdminId : sessionAdminId;
      if (!superAdmin && !adminId) {
        sendJson(response, 403, { message: "Signed store scope is required." });
        return;
      }
      const days = Math.min(365, Math.max(1, Math.trunc(
        Number(requestUrl.searchParams.get("days")) || 30,
      )));
      const toDate = new Date();
      const fromDate = new Date(toDate.getTime() - days * 24 * 60 * 60 * 1000);
      const productId = text(requestUrl.searchParams.get("productId"));
      const events = await loadEvents({
        adminId,
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        productId,
      });
      sendJson(response, 200, {
        summary: summarizeEvents(events, {
          from: fromDate.toISOString(),
          to: toDate.toISOString(),
          days,
          productId,
        }),
      });
    } catch (error) {
      sendJson(response, 500, {
        message: error instanceof Error ? error.message : "Unable to load analytics summary.",
      });
    }
  }

  async function recordOrderCreated(orderEntries) {
    const products = await readProducts();
    const productsById = new Map(
      (Array.isArray(products) ? products : [])
        .map((product) => [text(product?.id ?? product?.productId), product])
        .filter(([productId]) => productId),
    );
    const seen = new Set();
    const events = [];
    for (const entry of Array.isArray(orderEntries) ? orderEntries : []) {
      const productId = text(entry?.productId);
      const product = productsById.get(productId);
      const adminId = normalizeAdminTenantId(getRecordAdminId(product, ""), "");
      const orderGroupId = text(
        entry?.orderGroupId ?? entry?.createdAtEpochMs ?? entry?.checkoutId,
      );
      if (!adminId || !productId || !orderGroupId) continue;
      const uniqueKey = `${adminId}|${orderGroupId}|${productId}`;
      if (!seen.add(uniqueKey)) continue;
      const digest = crypto.createHash("sha256").update(uniqueKey).digest("hex").slice(0, 32);
      events.push({
        id: `order_created_${digest}`,
        eventName: "order_created",
        occurredAt: normalizeOccurredAt(
          entry?.createdAt || entry?.createdAtEpochMs,
          { trusted: true },
        ),
        adminId,
        accountId: text(entry?.accountId ?? entry?.customerId, 160),
        anonymousId: "",
        sessionId: "",
        productId,
        orderGroupId,
        platformId: text(entry?.platformId, 80),
        source: "orders_api",
        properties: {
          quantity: Math.max(1, Math.trunc(Number(entry?.quantity) || 1)),
          grandTotalAmount: Math.max(0, Number(entry?.grandTotalAmount) || 0),
        },
      });
      const paidAt = entry?.paidAt || entry?.paidAtEpochMs;
      if (paidAt) {
        events.push({
          id: `payment_succeeded_${digest}`,
          eventName: "payment_succeeded",
          occurredAt: normalizeOccurredAt(paidAt, { trusted: true }),
          adminId,
          accountId: text(entry?.accountId ?? entry?.customerId, 160),
          anonymousId: "",
          sessionId: "",
          productId,
          orderGroupId,
          platformId: text(entry?.platformId, 80),
          source: "orders_api",
          properties: {
            quantity: Math.max(1, Math.trunc(Number(entry?.quantity) || 1)),
            grandTotalAmount: Math.max(0, Number(entry?.grandTotalAmount) || 0),
          },
        });
      }
    }
    return events.length ? insertEvents(events) : { accepted: 0, duplicates: 0 };
  }

  return {
    handleEvents,
    handleSummary,
    recordOrderCreated,
  };
}

module.exports = {
  createAnalyticsApi,
  normalizeEventName,
  normalizeOccurredAt,
  summarizeEvents,
};
