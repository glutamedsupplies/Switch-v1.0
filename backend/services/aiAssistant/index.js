"use strict";

const { createAssistantStore } = require("./store");
const { createConfirmationService } = require("./confirmations");
const { createInternalDispatcher } = require("./internalDispatch");
const { createAssistantMetrics } = require("./metrics");
const { createLlmClient } = require("./llmClient");
const { createAssistantOrchestrator } = require("./orchestrator");
const { createCatalogService } = require("./tools/catalog");
const { createBuyerTools } = require("./tools/buyerTools");
const { createSellerTools } = require("./tools/sellerTools");
const { createRiderTools } = require("./tools/riderTools");

const BUYER_PREFIX = "/api/assistant/";
const RIDER_PREFIX = "/api/rider/assistant/";
const MAX_BODY_BYTES = 32 * 1024;

function readPositiveInt(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.trunc(number) : fallback;
}

/** Sliding-window limiter keyed by assistant user. */
function createRateLimiter({ max, windowMs, now }) {
  const hits = new Map();
  return function consume(key) {
    const current = now();
    const list = (hits.get(key) || []).filter((stamp) => current - stamp < windowMs);
    if (list.length >= max) {
      hits.set(key, list);
      return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((windowMs - (current - list[0])) / 1000)) };
    }
    list.push(current);
    hits.set(key, list);
    if (hits.size > 5000) {
      for (const [entryKey, stamps] of hits) {
        if (!stamps.some((stamp) => current - stamp < windowMs)) hits.delete(entryKey);
      }
    }
    return { ok: true };
  };
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error("Message is too large."), { statusCode: 413 }));
        request.destroy?.();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => {
      const text = Buffer.concat(chunks).toString("utf8").trim();
      if (!text) return resolve({});
      try {
        const parsed = JSON.parse(text);
        resolve(parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {});
      } catch (_) {
        reject(Object.assign(new Error("Invalid JSON body."), { statusCode: 400 }));
      }
    });
    request.on("error", reject);
  });
}

/**
 * Role-aware Switch AI assistant API.
 * - /api/assistant/*        buyer and seller (app session token)
 * - /api/rider/assistant/*  rider (rider session token)
 * Each request is bound to the signed session; the role decides which tool
 * registry is used, so no role can reach another role's tools or data.
 */
function createAiAssistantApi(deps) {
  const {
    DATA_DIR,
    pg = null,
    sendJson,
    getSessionToken,
    getHandler,
    getPlatformSettings,
    isPlatformSettingEnabled,
    flashDealPricing,
    flashDealsApi,
    vouchersApi,
    voucherRules,
    readOrders,
    getBuyerProfile,
    getSwitchRiderBuyerTracking,
    isSwitchRiderPartnerName,
    resolveLaunchedProvider,
    isSuperAdminAuthorized = () => false,
    confirmationSecret,
    env = process.env,
    now = () => Date.now(),
    logger = console,
    llm: injectedLlm,
    fetchImpl,
  } = deps;

  const store = createAssistantStore({ dataDir: DATA_DIR, pg, now, logger });
  const confirmations = createConfirmationService({ secret: confirmationSecret, now });
  const metrics = createAssistantMetrics({ now });
  const dispatcher = createInternalDispatcher({ getHandler, getSessionToken });
  const llm = injectedLlm !== undefined
    ? injectedLlm
    : createLlmClient({ resolveLaunchedProvider, env, fetchImpl, now, logger });
  const catalog = createCatalogService({ flashDealPricing, flashDealsApi, now });

  const orchestrator = createAssistantOrchestrator({
    store,
    confirmations,
    metrics,
    llm,
    toolsets: {
      buyer: createBuyerTools({
        store,
        catalog,
        vouchersApi,
        voucherRules,
        readOrders,
        getBuyerProfile,
        getSwitchRiderBuyerTracking,
        isSwitchRiderPartnerName,
      }),
      seller: createSellerTools({ readOrders, now }),
      rider: createRiderTools(),
    },
    getPlatformSettings,
    isPlatformSettingEnabled,
    now,
    logger,
  });

  const chatLimiter = createRateLimiter({
    max: readPositiveInt(env.AI_ASSISTANT_RATE_MAX, 40),
    windowMs: readPositiveInt(env.AI_ASSISTANT_RATE_WINDOW_MS, 5 * 60 * 1000),
    now,
  });
  const actionLimiter = createRateLimiter({
    max: readPositiveInt(env.AI_ASSISTANT_ACTION_RATE_MAX, 60),
    windowMs: readPositiveInt(env.AI_ASSISTANT_RATE_WINDOW_MS, 5 * 60 * 1000),
    now,
  });

  function ownerFromAppSession(request) {
    const session = request.authSession;
    if (!session) return null;
    const accountId = String(session.accountId || "").trim();
    if (!accountId) return null;
    if (session.role === "buyer") {
      return { userKey: `buyer:${accountId}`, role: "buyer", accountId, adminId: "", riderId: "", email: String(session.email || "") };
    }
    if (session.role === "seller" || session.role === "employee") {
      const adminId = String(session.adminId || "").trim();
      if (!adminId) return null;
      return { userKey: `${session.role}:${accountId}`, role: "seller", accountId, adminId, riderId: "", email: String(session.email || "") };
    }
    return null;
  }

  function ownerFromRiderSession(request) {
    const session = request.riderSession;
    if (!session || session.role !== "rider") return null;
    const riderId = String(session.accountId || "").trim();
    if (!riderId) return null;
    return { userKey: `rider:${riderId}`, role: "rider", accountId: riderId, adminId: "", riderId, email: "" };
  }

  function sendError(response, error) {
    const status = Number(error?.statusCode) || 500;
    if (status >= 500) logger.error?.("[ai-assistant] request failed:", error);
    sendJson(response, status, {
      message: status >= 500 ? "The assistant is having trouble right now. Please try again." : String(error?.message || "Request failed."),
      code: error?.code || (status >= 500 ? "AI_ASSISTANT_ERROR" : "AI_ASSISTANT_REQUEST_FAILED"),
      ...(error?.retryAfterSeconds ? { retryAfterSeconds: error.retryAfterSeconds } : {}),
    });
  }

  function limit(limiter, owner, role) {
    const result = limiter(owner.userKey);
    if (!result.ok) {
      metrics.increment("rate_limited", role);
      throw Object.assign(new Error("You're sending messages too quickly. Please wait a moment."), {
        statusCode: 429,
        code: "AI_RATE_LIMITED",
        retryAfterSeconds: result.retryAfterSeconds,
      });
    }
  }

  async function handleRoute(request, response, url, owner, action) {
    const method = String(request.method || "GET").toUpperCase();
    const dispatch = (spec) => dispatcher(request, spec);
    const context = {
      page: url.searchParams.get("page") || "",
      productId: url.searchParams.get("productId") || "",
    };

    if (action === "session" && method === "GET") {
      return sendJson(response, 200, await orchestrator.describe({ owner, context }));
    }
    if (action === "session" && method === "DELETE") {
      return sendJson(response, 200, await orchestrator.reset({ owner }));
    }
    if (action === "chat" && method === "POST") {
      limit(chatLimiter, owner, owner.role);
      const body = await readBody(request);
      return sendJson(response, 200, await orchestrator.chat({ owner, message: body.message, context: body.context, dispatch }));
    }
    if (action === "actions" && method === "POST") {
      limit(actionLimiter, owner, owner.role);
      const body = await readBody(request);
      return sendJson(response, 200, await orchestrator.runAction({ owner, tool: body.tool, args: body.args, context: body.context, dispatch }));
    }
    if (action === "confirm" && method === "POST") {
      limit(actionLimiter, owner, owner.role);
      const body = await readBody(request);
      return sendJson(
        response,
        200,
        await orchestrator.confirm({ owner, token: body.token, inputs: body.inputs, cancel: body.cancel === true, dispatch }),
      );
    }
    if (owner.role === "buyer" && action === "cart" && method === "GET") {
      return sendJson(response, 200, { items: await store.getCart(owner.accountId) });
    }
    if (owner.role === "buyer" && action === "cart/sync" && method === "POST") {
      limit(actionLimiter, owner, owner.role);
      const body = await readBody(request);
      const items = await store.saveCart(owner.accountId, Array.isArray(body.items) ? body.items : []);
      return sendJson(response, 200, { items });
    }
    return sendJson(response, 404, { message: "Not found.", code: "NOT_FOUND" });
  }

  async function tryHandleAssistantRoutes(request, response, url) {
    const pathname = url.pathname;
    try {
      if (pathname === "/api/super-admin/ai-assistant/metrics") {
        if (!isSuperAdminAuthorized(request)) {
          sendJson(response, 401, { message: "Super Admin sign-in required." });
          return true;
        }
        const recent = await store.listActions({ limit: 50 });
        sendJson(response, 200, {
          metrics: metrics.snapshot(),
          storage: store.storageMode(),
          provider: llm ? await llm.status() : { available: false, provider: "rules" },
          recentActions: recent.map((entry) => ({
            role: entry.role,
            tool: entry.tool,
            risk: entry.risk,
            source: entry.source,
            ok: entry.ok,
            latencyMs: entry.latencyMs,
            createdAt: entry.createdAt,
          })),
          tools: { buyer: orchestrator.listTools("buyer"), seller: orchestrator.listTools("seller"), rider: orchestrator.listTools("rider") },
        });
        return true;
      }

      if (pathname.startsWith(RIDER_PREFIX)) {
        const owner = ownerFromRiderSession(request);
        if (!owner) {
          sendJson(response, 401, { message: "Please sign in to Switch Rider.", code: "RIDER_SESSION_REQUIRED" });
          return true;
        }
        await handleRoute(request, response, url, owner, pathname.slice(RIDER_PREFIX.length).replace(/\/+$/, ""));
        return true;
      }

      if (pathname.startsWith(BUYER_PREFIX)) {
        const owner = ownerFromAppSession(request);
        if (!owner) {
          sendJson(response, 401, { message: "Please sign in to use the Switch AI assistant.", code: "APP_SESSION_INVALID" });
          return true;
        }
        await handleRoute(request, response, url, owner, pathname.slice(BUYER_PREFIX.length).replace(/\/+$/, ""));
        return true;
      }
    } catch (error) {
      if (!response.headersSent) sendError(response, error);
      return true;
    }
    return false;
  }

  return { tryHandleAssistantRoutes, orchestrator, store, metrics, llm };
}

module.exports = { createAiAssistantApi, createRateLimiter };
