"use strict";

const crypto = require("crypto");

const PIN_PURPOSES = new Set(["pickup", "delivery", "return"]);

function resolveSwitchRiderSecret(env = process.env) {
  const dedicated = String(env.SWITCH_RIDER_SECRET ?? "").trim();
  if (dedicated) return dedicated;
  const fallback = String(env.APP_SESSION_SECRET ?? env.ADMIN_API_SESSION_SECRET ?? "").trim();
  return fallback ? `switch-rider:v1:${fallback}` : "";
}

function requireSecret(secret) {
  const value = String(secret ?? "").trim();
  if (!value) {
    const error = new Error("Switch Rider signing secret is not configured.");
    error.statusCode = 503;
    error.code = "SWITCH_RIDER_SECRET_MISSING";
    throw error;
  }
  return value;
}

function newPinNonce() {
  return crypto.randomBytes(16).toString("base64url");
}

/**
 * PINs are derived, never stored: HMAC(secret, jobId | nonce | purpose) → 6 digits.
 * Seller/buyer screens recompute them; rotating pin_nonce invalidates all PINs.
 */
function derivePin(secret, { deliveryId, pinNonce, purpose }) {
  if (!PIN_PURPOSES.has(purpose)) throw new Error(`Unknown PIN purpose: ${purpose}`);
  const digest = crypto
    .createHmac("sha256", requireSecret(secret))
    .update(`pin|${deliveryId}|${pinNonce}|${purpose}`)
    .digest();
  const value = digest.readUInt32BE(0) % 1_000_000;
  return String(value).padStart(6, "0");
}

function pinsMatch(expected, supplied) {
  const a = Buffer.from(String(expected ?? ""));
  const b = Buffer.from(String(supplied ?? "").replace(/\D/g, ""));
  return a.length === b.length && a.length > 0 && crypto.timingSafeEqual(a, b);
}

function signQuote(secret, payload) {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = crypto
    .createHmac("sha256", requireSecret(secret))
    .update(`quote|${body}`)
    .digest("base64url");
  return `srq1.${body}.${sig}`;
}

function verifyQuote(secret, token, nowMs = Date.now()) {
  const parts = String(token ?? "").trim().split(".");
  if (parts.length !== 3 || parts[0] !== "srq1") return null;
  const expected = crypto
    .createHmac("sha256", requireSecret(secret))
    .update(`quote|${parts[1]}`)
    .digest();
  const supplied = Buffer.from(parts[2], "base64url");
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    if (!payload || typeof payload !== "object") return null;
    if (!Number.isFinite(payload.exp) || payload.exp * 1000 <= nowMs) return null;
    return payload;
  } catch (_) {
    return null;
  }
}

function newId(prefix) {
  return `${prefix}_${crypto.randomBytes(12).toString("hex")}`;
}

module.exports = {
  resolveSwitchRiderSecret,
  newPinNonce,
  derivePin,
  pinsMatch,
  signQuote,
  verifyQuote,
  newId,
};
