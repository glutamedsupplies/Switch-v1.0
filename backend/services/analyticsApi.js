"use strict";

const crypto = require("crypto");
const { isPostgresConfigured, query, withTransaction } = require("../db/pool");

const ANALYTICS_EVENT_NAMES = Object.freeze([
  "product_view",
  "add_to_cart",
  "begin_checkout",
  "place_order",
  "payment_initiated",
  "payment_succeeded",
  "payment_failed",
  "pack",
  "ship",
  "cancel",
]);

const ANALYTICS_EVENT_NAME_SET = new Set(ANALYTICS_EVENT_NAMES);

const FUNNEL_STAGE_NAMES = Object.freeze([
  "product_view",
  "add_to_cart",
  "begin_checkout",
  "place_order",
  "payment_initiated",
  "payment_succeeded",
  "pack",
  "ship",
]);

const ORDER_BACKED_EVENT_NAMES = new Set([
  "place_order",
  "payment_initiated",
  "payment_succeeded",
  "pack",
  "ship",
  "cancel",
]);

const FAILED_PAYMENT_STATUSES = new Set([
  "failed",
  "fail",
  "declined",
  "expired",
  "canceled",
  "cancelled",
]);

const PAID_STAGES = new Set([
  "toPrepare",
  "awaitingWaybill",
  "toShip",
  "toReceive",
  "toReview",
]);

const MAX_BATCH_EVENTS = 100;
const MAX_PROPERTY_BYTES = 8 * 1024;
const MAX_ID_LENGTH = 120;
const DEFAULT_RANGE_DAYS = 7;
const MAX_RANGE_DAYS = 90;

function createHttpError(message, statusCode = 400, extra = {}) {
  const error = new Error(message);
  error.statusCode = statusCode;
  Object.assign(error, extra);
  return error;
}

function normalizeText(value, { max = MAX_ID_LENGTH } = {}) {
  return String(value ?? "")
    .trim()
    .slice(0, max);
}

function normalizeEventName(value) {
  return normalizeText(value, { max: 64 }).toLowerCase();
}

function isAllowedEventName(value) {
  return ANALYTICS_EVENT_NAME_SET.has(normalizeEventName(value));
}

function newAnalyticsEventId() {
  return `ae_${crypto.randomBytes(12).toString("hex")}`;
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function parseProperties(value) {
  const properties = asObject(value);
  let encoded = "{}";
  try {
    encoded = JSON.stringify(properties);
  } catch (_) {
    throw createHttpError("Event properties must be JSON-serializable.", 400, {
      code: "ANALYTICS_PROPERTIES_INVALID",
    });
  }
  if (Buffer.byteLength(encoded, "utf8") > MAX_PROPERTY_BYTES) {
    throw createHttpError("Event properties are too large.", 400, {
      code: "ANALYTICS_PROPERTIES_TOO_LARGE",
    });
  }
  return JSON.parse(encoded);
}

function ratio(numerator, denominator) {
  const top = Number(numerator) || 0;
  const bottom = Number(denominator) || 0;
  if (bottom <= 0 || top < 0) {
    return 0;
  }
  return Math.round((top / bottom) * 10000) / 10000;
}

function money(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) {
    return 0;
  }
  return Math.round(amount * 100) / 100;
}

function parseIsoDate(value, fallback) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return fallback;
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }
  return parsed;
}

function parseAnalyticsRange(source = {}, now = new Date()) {
  const get = (key) => {
    if (source instanceof URLSearchParams) {
      return source.get(key);
    }
    return source[key];
  };

  const to = parseIsoDate(get("to"), now);
  const fromParam = get("from");
  const daysRaw = Number(get("days"));
  const days = Number.isFinite(daysRaw) && daysRaw > 0
    ? Math.min(MAX_RANGE_DAYS, Math.max(1, Math.trunc(daysRaw)))
    : DEFAULT_RANGE_DAYS;
  const from = fromParam
    ? parseIsoDate(fromParam, new Date(to.getTime() - days * 24 * 60 * 60 * 1000))
    : new Date(to.getTime() - days * 24 * 60 * 60 * 1000);

  if (from.getTime() >= to.getTime()) {
    throw createHttpError("Analytics range `from` must be earlier than `to`.", 400, {
      code: "ANALYTICS_RANGE_INVALID",
    });
  }

  const spanDays = Math.max(1, Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)));
  return {
    from,
    to,
    days: spanDays,
    fromIso: from.toISOString(),
    toIso: to.toISOString(),
  };
}

function getAnalyticsSessionPolicy(pathname, methodValue) {
  const pathValue = String(pathname || "");
  const method = String(methodValue || "GET").toUpperCase();
  if (pathValue === "/api/analytics/events" && method === "POST") {
    return { roles: ["buyer", "seller", "employee"], identityKind: "auto" };
  }
  if (
    (pathValue === "/api/analytics/funnel" || pathValue === "/api/analytics/summary")
    && method === "GET"
  ) {
    return { roles: ["seller", "employee"], identityKind: "admin" };
  }
  return null;
}

function extractEventPayloads(body) {
  const source = asObject(body);
  if (Array.isArray(body)) {
    return body;
  }
  if (Array.isArray(source.events)) {
    return source.events;
  }
  if (source.event && typeof source.event === "object") {
    return [source.event];
  }
  if (source.eventName || source.event_name || source.name) {
    return [source];
  }
  return [];
}

function normalizeIncomingEvent(raw, context = {}) {
  const source = asObject(raw);
  const eventName = normalizeEventName(
    source.eventName ?? source.event_name ?? source.name ?? source.event,
  );
  if (!isAllowedEventName(eventName)) {
    throw createHttpError(
      `Unknown analytics event_name. Allowed: ${ANALYTICS_EVENT_NAMES.join(", ")}.`,
      400,
      { code: "ANALYTICS_EVENT_NAME_INVALID", eventName },
    );
  }

  const sessionAdminId = normalizeText(context.adminId);
  const clientAdminId = normalizeText(
    source.adminId ?? source.admin_id ?? source.tenantId ?? source.sellerAdminId,
  );
  const adminId = sessionAdminId || clientAdminId;
  const userId = normalizeText(
    context.userId
      || source.userId
      || source.user_id
      || source.accountId
      || source.account_id,
  ) || null;
  const sessionId = normalizeText(
    source.sessionId ?? source.session_id ?? context.sessionId,
  ) || null;
  const productId = normalizeText(
    source.productId ?? source.product_id,
  ) || null;
  const orderId = normalizeText(
    source.orderId ?? source.order_id ?? source.orderGroupId ?? source.order_group_id,
  ) || null;

  const properties = parseProperties(
    source.properties ?? source.props ?? source.payload,
  );
  if (source.quantity != null && properties.quantity == null) {
    properties.quantity = source.quantity;
  }
  if (source.variantId && !properties.variantId) {
    properties.variantId = normalizeText(source.variantId);
  }

  return {
    id: normalizeText(source.id) || newAnalyticsEventId(),
    adminId,
    userId,
    sessionId,
    eventName,
    productId,
    orderId,
    properties,
  };
}

function validateEventBatch(body, context = {}) {
  const payloads = extractEventPayloads(body);
  if (!payloads.length) {
    throw createHttpError("Provide an event object or an events array.", 400, {
      code: "ANALYTICS_EVENTS_EMPTY",
    });
  }
  if (payloads.length > MAX_BATCH_EVENTS) {
    throw createHttpError(`A batch may contain at most ${MAX_BATCH_EVENTS} events.`, 400, {
      code: "ANALYTICS_BATCH_TOO_LARGE",
    });
  }
  return payloads.map((payload) => normalizeIncomingEvent(payload, context));
}

function conversionFromPrevious(stages) {
  return stages.map((stage, index) => {
    const previous = index === 0 ? null : stages[index - 1];
    return {
      ...stage,
      conversionFromPrevious: previous ? ratio(stage.count, previous.count) : null,
      conversionFromStart: ratio(stage.count, stages[0]?.count || 0),
    };
  });
}

function computeFunnelFromCounts(counts = {}, options = {}) {
  const eventCounts = asObject(counts.eventCounts);
  const orderCounts = asObject(counts.orderCounts);
  const stages = FUNNEL_STAGE_NAMES.map((eventName) => {
    const eventCount = Number(eventCounts[eventName]) || 0;
    const orderCount = Number(orderCounts[eventName]) || 0;
    const prefersOrders = ORDER_BACKED_EVENT_NAMES.has(eventName);
    const count = prefersOrders && orderCount > 0 ? orderCount : (orderCount || eventCount);
    return {
      eventName,
      count,
      eventCount,
      orderCount,
      source: prefersOrders && orderCount > 0 ? "orders" : "events",
    };
  });

  const placed = Number(orderCounts.place_order) || Number(eventCounts.place_order) || 0;
  const cancelled = Number(orderCounts.cancel) || Number(eventCounts.cancel) || 0;

  return {
    range: options.range || null,
    adminId: options.adminId || "",
    stages: conversionFromPrevious(stages),
    cancel: {
      eventName: "cancel",
      count: cancelled,
      eventCount: Number(eventCounts.cancel) || 0,
      orderCount: Number(orderCounts.cancel) || 0,
      rate: ratio(cancelled, placed),
    },
    paymentFailed: {
      eventName: "payment_failed",
      count: Number(eventCounts.payment_failed) || 0,
    },
  };
}

function computeSummaryFromTotals(totals = {}, options = {}) {
  const placedOrderCount = Number(totals.placedOrderCount) || 0;
  const paidOrderCount = Number(totals.paidOrderCount) || 0;
  const cancelledOrderCount = Number(totals.cancelledOrderCount) || 0;
  const gmv = money(totals.gmv);
  return {
    range: options.range || null,
    adminId: options.adminId || "",
    currency: options.currency || "PHP",
    gmv,
    paidOrderCount,
    aov: paidOrderCount > 0 ? money(gmv / paidOrderCount) : 0,
    placedOrderCount,
    cancelledOrderCount,
    cancelRate: ratio(cancelledOrderCount, placedOrderCount),
  };
}

function groupOrderEntries(entries) {
  const groups = new Map();
  for (const entry of asArray(entries)) {
    const orderId = normalizeText(
      entry?.orderGroupId ?? entry?.order_group_id ?? entry?.id,
    );
    if (!orderId) {
      continue;
    }
    if (!groups.has(orderId)) {
      groups.set(orderId, []);
    }
    groups.get(orderId).push(entry);
  }
  return groups;
}

function firstNonEmpty(values) {
  for (const value of values) {
    const text = normalizeText(value);
    if (text) {
      return text;
    }
  }
  return "";
}

function hasTimestamp(value) {
  if (value == null || value === "") {
    return false;
  }
  if (value instanceof Date) {
    return !Number.isNaN(value.getTime());
  }
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) {
    return true;
  }
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
}

function groupSnapshot(entries) {
  const items = asArray(entries);
  const primary = items[0] || {};
  const stages = new Set(items.map((item) => normalizeText(item?.stage)));
  const paymentStatuses = items.map((item) =>
    normalizeText(item?.paymentStatus ?? item?.payment_status).toLowerCase(),
  );
  return {
    orderId: firstNonEmpty([
      primary.orderGroupId,
      primary.order_group_id,
      primary.id,
    ]),
    adminId: firstNonEmpty(items.map((item) => item?.adminId ?? item?.admin_id)),
    userId: firstNonEmpty(items.map((item) => item?.accountId ?? item?.account_id)),
    productId: firstNonEmpty(items.map((item) => item?.productId ?? item?.product_id)),
    paid: items.some((item) =>
      hasTimestamp(item?.paidAt ?? item?.paid_at ?? item?.paidAtEpochMs)
      || PAID_STAGES.has(normalizeText(item?.stage)),
    ),
    unpaid: items.some((item) => normalizeText(item?.stage) === "toPay"),
    packed: items.some((item) =>
      hasTimestamp(item?.packedAt ?? item?.packed_at ?? item?.packedAtEpochMs)
      || normalizeText(item?.stage) === "toShip"
      || normalizeText(item?.stage) === "toReceive"
      || normalizeText(item?.stage) === "toReview",
    ),
    shipped: items.some((item) =>
      hasTimestamp(item?.shippedAt ?? item?.shipped_at ?? item?.shippedAtEpochMs)
      || normalizeText(item?.stage) === "toReceive"
      || normalizeText(item?.stage) === "toReview",
    ),
    cancelled: items.some((item) =>
      hasTimestamp(item?.cancelledAt ?? item?.cancelled_at ?? item?.cancelledAtEpochMs)
      || normalizeText(item?.stage) === "cancelled",
    ),
    paymentFailed: paymentStatuses.some((status) => FAILED_PAYMENT_STATUSES.has(status)),
    stages: [...stages],
  };
}

function diffOrderLifecycleEvents(previousEntries, nextEntries) {
  const previousGroups = groupOrderEntries(previousEntries);
  const nextGroups = groupOrderEntries(nextEntries);
  const events = [];

  for (const [orderId, nextItems] of nextGroups.entries()) {
    const next = groupSnapshot(nextItems);
    const previousItems = previousGroups.get(orderId);
    const previous = previousItems ? groupSnapshot(previousItems) : null;
    const base = {
      adminId: next.adminId,
      userId: next.userId,
      productId: next.productId,
      orderId,
      properties: { source: "order_lifecycle" },
    };

    if (!previous) {
      events.push({ ...base, eventName: "place_order" });
    }
    const paymentInitiated = next.unpaid || next.paid || next.paymentFailed;
    const wasPaymentInitiated = Boolean(
      previous && (previous.unpaid || previous.paid || previous.paymentFailed),
    );
    if (paymentInitiated && !wasPaymentInitiated) {
      events.push({ ...base, eventName: "payment_initiated" });
    }
    if (next.paid && !previous?.paid) {
      events.push({ ...base, eventName: "payment_succeeded" });
    } else if (next.paymentFailed && !previous?.paymentFailed && !next.paid) {
      events.push({ ...base, eventName: "payment_failed" });
    }
    if (next.packed && !previous?.packed) {
      events.push({ ...base, eventName: "pack" });
    }
    if (next.shipped && !previous?.shipped) {
      events.push({ ...base, eventName: "ship" });
    }
    if (next.cancelled && !previous?.cancelled) {
      events.push({ ...base, eventName: "cancel" });
    }
  }

  return events;
}

function buildScope(adminId, from, to, { adminColumn = "admin_id" } = {}) {
  const params = [from, to];
  let adminSql = "";
  if (adminId) {
    params.push(adminId);
    adminSql = ` AND ${adminColumn} = $${params.length}`;
  }
  return { params, adminSql };
}

async function isAnalyticsPostgresReady() {
  if (!isPostgresConfigured()) {
    return false;
  }
  try {
    const result = await query(`SELECT to_regclass('public.analytics_events') AS table_name`);
    return Boolean(result.rows[0]?.table_name);
  } catch (_) {
    return false;
  }
}

async function existingOrderIds(orderIds) {
  const ids = [...new Set(asArray(orderIds).map((id) => normalizeText(id)).filter(Boolean))];
  if (!ids.length) {
    return new Set();
  }
  const result = await query(`SELECT id FROM orders WHERE id = ANY($1::text[])`, [ids]);
  return new Set(result.rows.map((row) => row.id));
}

async function insertAnalyticsEvents(events, { knownOrderIds } = {}) {
  const rows = asArray(events);
  if (!rows.length) {
    return [];
  }
  const orderIds = knownOrderIds || await existingOrderIds(rows.map((event) => event.orderId));
  const inserted = [];

  await withTransaction(async (client) => {
    for (const event of rows) {
      const orderId = event.orderId && orderIds.has(event.orderId) ? event.orderId : null;
      const id = event.id || newAnalyticsEventId();
      await client.query(
        `
        INSERT INTO analytics_events (
          id, admin_id, user_id, session_id, event_name,
          product_id, order_id, properties, created_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8::jsonb, NOW()
        )
        `,
        [
          id,
          event.adminId || "",
          event.userId || null,
          event.sessionId || null,
          event.eventName,
          event.productId || null,
          orderId,
          JSON.stringify(event.properties || {}),
        ],
      );
      inserted.push({ ...event, id, orderId });
    }
  });

  return inserted;
}

async function loadEventCounts({ adminId, from, to }) {
  const { params, adminSql } = buildScope(adminId, from, to);
  const result = await query(
    `
    SELECT event_name, COUNT(*)::int AS count
    FROM analytics_events
    WHERE created_at >= $1 AND created_at < $2
      ${adminSql}
    GROUP BY event_name
    `,
    params,
  );
  const eventCounts = {};
  for (const row of result.rows) {
    eventCounts[row.event_name] = row.count;
  }
  return eventCounts;
}

async function loadOrderFunnelCounts({ adminId, from, to }) {
  const { params, adminSql } = buildScope(adminId, from, to);
  const result = await query(
    `
    SELECT
      COUNT(*) FILTER (WHERE created_at >= $1 AND created_at < $2)::int AS place_order,
      COUNT(*) FILTER (WHERE created_at >= $1 AND created_at < $2)::int AS payment_initiated,
      COUNT(*) FILTER (WHERE paid_at IS NOT NULL AND paid_at >= $1 AND paid_at < $2)::int AS payment_succeeded,
      COUNT(*) FILTER (WHERE packed_at IS NOT NULL AND packed_at >= $1 AND packed_at < $2)::int AS pack,
      COUNT(*) FILTER (WHERE shipped_at IS NOT NULL AND shipped_at >= $1 AND shipped_at < $2)::int AS ship,
      COUNT(*) FILTER (WHERE cancelled_at IS NOT NULL AND cancelled_at >= $1 AND cancelled_at < $2)::int AS cancel
    FROM orders
    WHERE 1=1
      ${adminSql}
    `,
    params,
  );
  return result.rows[0] || {
    place_order: 0,
    payment_initiated: 0,
    payment_succeeded: 0,
    pack: 0,
    ship: 0,
    cancel: 0,
  };
}

async function loadSummaryTotals({ adminId, from, to }) {
  const orderScope = buildScope(adminId, from, to);
  const gmvScope = buildScope(adminId, from, to, { adminColumn: "o.admin_id" });
  const [counts, gmv] = await Promise.all([
    query(
      `
      SELECT
        COUNT(*) FILTER (WHERE created_at >= $1 AND created_at < $2)::int AS placed_order_count,
        COUNT(*) FILTER (WHERE paid_at IS NOT NULL AND paid_at >= $1 AND paid_at < $2)::int AS paid_order_count,
        COUNT(*) FILTER (
          WHERE cancelled_at IS NOT NULL AND cancelled_at >= $1 AND cancelled_at < $2
        )::int AS cancelled_order_count
      FROM orders
      WHERE 1=1
        ${orderScope.adminSql}
      `,
      orderScope.params,
    ),
    query(
      `
      SELECT COALESCE(SUM(oi.quantity * oi.unit_price), 0)::numeric AS gmv
      FROM orders o
      JOIN order_items oi ON oi.order_group_id = o.id
      WHERE o.paid_at IS NOT NULL
        AND o.paid_at >= $1 AND o.paid_at < $2
        ${gmvScope.adminSql}
      `,
      gmvScope.params,
    ),
  ]);
  return {
    placedOrderCount: counts.rows[0]?.placed_order_count || 0,
    paidOrderCount: counts.rows[0]?.paid_order_count || 0,
    cancelledOrderCount: counts.rows[0]?.cancelled_order_count || 0,
    gmv: Number(gmv.rows[0]?.gmv || 0),
  };
}

async function getAnalyticsFunnel({ adminId = "", from, to } = {}) {
  const [eventCounts, orderCounts] = await Promise.all([
    loadEventCounts({ adminId, from, to }),
    loadOrderFunnelCounts({ adminId, from, to }),
  ]);
  return computeFunnelFromCounts(
    { eventCounts, orderCounts },
    { adminId, range: { from: from.toISOString(), to: to.toISOString() } },
  );
}

async function getAnalyticsSummary({ adminId = "", from, to } = {}) {
  const totals = await loadSummaryTotals({ adminId, from, to });
  return computeSummaryFromTotals(totals, {
    adminId,
    range: { from: from.toISOString(), to: to.toISOString() },
  });
}

function resolveAnalyticsAdminId(request, { forWrite = false } = {}) {
  const session = request?.authSession || {};
  const role = String(session.role || "").trim().toLowerCase();
  const sessionAdminId = normalizeText(session.adminId);
  if (role === "seller" || role === "employee") {
    return sessionAdminId;
  }
  if (forWrite) {
    return "";
  }
  return "";
}

function createAnalyticsApi(deps = {}) {
  const {
    sendJson,
    parseRequestBody,
    isSuperAdminAuthorized,
  } = deps;

  function unavailable(response) {
    sendJson(response, 503, {
      message: "Analytics requires PostgreSQL. Set DATABASE_URL and run migrations.",
      code: "ANALYTICS_UNAVAILABLE",
    });
  }

  function sendError(response, error) {
    const statusCode = Number(error?.statusCode) || 400;
    sendJson(response, statusCode, {
      message: error instanceof Error ? error.message : "Analytics request failed.",
      code: error?.code || "ANALYTICS_ERROR",
      ...(error?.eventName ? { eventName: error.eventName } : {}),
    });
  }

  function ingestContext(request, body) {
    const session = request?.authSession || {};
    const source = asObject(body);
    return {
      adminId: resolveAnalyticsAdminId(request, { forWrite: true }),
      userId: normalizeText(session.accountId),
      sessionId: normalizeText(source.sessionId ?? source.session_id),
    };
  }

  async function recordOrderLifecycleEvents(previousEntries, nextEntries, extra = {}) {
    if (!(await isAnalyticsPostgresReady())) {
      return [];
    }
    const events = diffOrderLifecycleEvents(previousEntries, nextEntries).map((event) => ({
      ...event,
      adminId: event.adminId || extra.adminId || "",
      userId: event.userId || extra.userId || null,
      properties: {
        ...(event.properties || {}),
        ...(extra.source ? { actor: extra.source } : {}),
      },
    }));
    if (!events.length) {
      return [];
    }
    return insertAnalyticsEvents(events);
  }

  async function handleIngest(request, response) {
    if (!(await isAnalyticsPostgresReady())) {
      unavailable(response);
      return;
    }
    try {
      const body = await parseRequestBody(request);
      const context = ingestContext(request, body);
      const events = validateEventBatch(body, context);
      const inserted = await insertAnalyticsEvents(events);
      sendJson(response, 201, {
        accepted: inserted.length,
        events: inserted.map((event) => ({
          id: event.id,
          eventName: event.eventName,
          productId: event.productId,
          orderId: event.orderId,
        })),
      });
    } catch (error) {
      sendError(response, error);
    }
  }

  async function handleRead(request, response, requestUrl, kind) {
    if (!(await isAnalyticsPostgresReady())) {
      unavailable(response);
      return;
    }
    try {
      const range = parseAnalyticsRange(requestUrl.searchParams);
      const superAdmin = Boolean(
        typeof isSuperAdminAuthorized === "function" && isSuperAdminAuthorized(request),
      );
      const sessionAdminId = resolveAnalyticsAdminId(request);
      const requestedAdminId = normalizeText(requestUrl.searchParams.get("adminId"));
      let adminId = sessionAdminId;
      if (superAdmin) {
        adminId = requestedAdminId;
      } else if (requestedAdminId && requestedAdminId !== sessionAdminId) {
        sendJson(response, 403, {
          message: "The supplied adminId does not match the signed session.",
          code: "APP_SESSION_IDENTITY_MISMATCH",
          field: "adminId",
        });
        return;
      }

      const payload = kind === "summary"
        ? await getAnalyticsSummary({ adminId, from: range.from, to: range.to })
        : await getAnalyticsFunnel({ adminId, from: range.from, to: range.to });
      sendJson(response, 200, {
        ...payload,
        range: {
          from: range.fromIso,
          to: range.toIso,
          days: range.days,
        },
      });
    } catch (error) {
      sendError(response, error);
    }
  }

  async function tryHandleAnalyticsRoutes(request, response, requestUrl) {
    const { pathname } = requestUrl;
    if (pathname === "/api/analytics/events") {
      if (request.method !== "POST") {
        sendJson(response, 405, { message: "Method not allowed." });
        return true;
      }
      await handleIngest(request, response);
      return true;
    }
    if (pathname === "/api/analytics/funnel") {
      if (request.method !== "GET") {
        sendJson(response, 405, { message: "Method not allowed." });
        return true;
      }
      await handleRead(request, response, requestUrl, "funnel");
      return true;
    }
    if (pathname === "/api/analytics/summary") {
      if (request.method !== "GET") {
        sendJson(response, 405, { message: "Method not allowed." });
        return true;
      }
      await handleRead(request, response, requestUrl, "summary");
      return true;
    }
    return false;
  }

  return Object.freeze({
    tryHandleAnalyticsRoutes,
    recordOrderLifecycleEvents,
  });
}

module.exports = {
  ANALYTICS_EVENT_NAMES,
  FUNNEL_STAGE_NAMES,
  MAX_BATCH_EVENTS,
  createAnalyticsApi,
  getAnalyticsSessionPolicy,
  isAllowedEventName,
  normalizeIncomingEvent,
  validateEventBatch,
  parseAnalyticsRange,
  computeFunnelFromCounts,
  computeSummaryFromTotals,
  diffOrderLifecycleEvents,
  insertAnalyticsEvents,
  getAnalyticsFunnel,
  getAnalyticsSummary,
  isAnalyticsPostgresReady,
  ratio,
};
