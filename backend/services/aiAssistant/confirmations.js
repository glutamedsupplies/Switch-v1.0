"use strict";

const crypto = require("crypto");

const DEFAULT_TTL_MS = 10 * 60 * 1000;

function base64url(input) {
  return Buffer.from(input).toString("base64").replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function fromBase64url(input) {
  return Buffer.from(String(input).replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

/**
 * Signed, single-use confirmation tokens for HIGH-risk assistant actions.
 * The token carries the exact tool arguments the user reviewed, bound to the
 * user, role, and tenant, so a confirm request cannot swap in other arguments
 * or be replayed by another account.
 */
function createConfirmationService({ secret, now = () => Date.now(), ttlMs = DEFAULT_TTL_MS } = {}) {
  const key = crypto.createHmac("sha256", String(secret || "")).update("switch-ai-confirmation-v1").digest();
  const usedNonces = new Map();

  function sign(body) {
    return base64url(crypto.createHmac("sha256", key).update(body).digest());
  }

  function sweep() {
    const current = now();
    for (const [nonce, expiresAt] of usedNonces) {
      if (expiresAt <= current) usedNonces.delete(nonce);
    }
  }

  function issue({ owner, tool, args, summary = "" }) {
    if (!secret) throw Object.assign(new Error("Assistant confirmations are not configured."), { statusCode: 503 });
    const payload = {
      v: 1,
      uk: String(owner.userKey || ""),
      role: String(owner.role || ""),
      tn: String(owner.adminId || owner.riderId || ""),
      tool: String(tool),
      args: args && typeof args === "object" ? args : {},
      sum: String(summary || "").slice(0, 200),
      exp: now() + ttlMs,
      n: crypto.randomBytes(9).toString("hex"),
    };
    const body = base64url(JSON.stringify(payload));
    return { token: `${body}.${sign(body)}`, expiresAt: new Date(payload.exp).toISOString() };
  }

  /** Verifies and consumes a token. Throws a 4xx error when it is not usable. */
  function consume(token, owner) {
    const [body, signature] = String(token || "").split(".");
    if (!body || !signature) throw Object.assign(new Error("This confirmation is invalid."), { statusCode: 400, code: "AI_CONFIRMATION_INVALID" });
    const expected = sign(body);
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      throw Object.assign(new Error("This confirmation is invalid."), { statusCode: 400, code: "AI_CONFIRMATION_INVALID" });
    }
    let payload;
    try {
      payload = JSON.parse(fromBase64url(body));
    } catch (_) {
      throw Object.assign(new Error("This confirmation is invalid."), { statusCode: 400, code: "AI_CONFIRMATION_INVALID" });
    }
    if (
      payload.uk !== String(owner.userKey || "")
      || payload.role !== String(owner.role || "")
      || payload.tn !== String(owner.adminId || owner.riderId || "")
    ) {
      throw Object.assign(new Error("This confirmation belongs to another account."), { statusCode: 403, code: "AI_CONFIRMATION_FORBIDDEN" });
    }
    if (Number(payload.exp) <= now()) {
      throw Object.assign(new Error("This confirmation expired. Please ask again so I can re-check the details."), {
        statusCode: 410,
        code: "AI_CONFIRMATION_EXPIRED",
      });
    }
    sweep();
    if (usedNonces.has(payload.n)) {
      throw Object.assign(new Error("This action was already confirmed."), { statusCode: 409, code: "AI_CONFIRMATION_USED" });
    }
    usedNonces.set(payload.n, Number(payload.exp));
    return { tool: payload.tool, args: payload.args || {}, summary: payload.sum || "" };
  }

  return { issue, consume };
}

module.exports = { createConfirmationService };
