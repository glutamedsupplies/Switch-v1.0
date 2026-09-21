"use strict";

const crypto = require("crypto");

const DEFAULT_SESSION_TTL_SECONDS = 24 * 60 * 60;
const MAX_SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;
const ALLOWED_ROLES = new Set(["buyer", "seller", "employee"]);

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizeIdentityValue(value) {
  return normalizeText(value).toLowerCase();
}

function normalizeRole(value) {
  const role = normalizeIdentityValue(value);
  if (role === "admin") return "seller";
  if (role === "user" || role === "customer") return "buyer";
  return ALLOWED_ROLES.has(role) ? role : "";
}

function parseSessionTtlSeconds(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_SESSION_TTL_SECONDS;
  }
  return Math.min(Math.trunc(parsed), MAX_SESSION_TTL_SECONDS);
}

function getBearerToken(authorizationValue) {
  const authorization = normalizeText(authorizationValue);
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match ? normalizeText(match[1]) : "";
}

function getCookieValue(cookieHeader, name) {
  const targetName = normalizeText(name);
  if (!targetName) return "";

  for (const part of String(cookieHeader ?? "").split(";")) {
    const separatorIndex = part.indexOf("=");
    if (separatorIndex < 0) continue;
    const key = part.slice(0, separatorIndex).trim();
    if (key !== targetName) continue;
    try {
      return decodeURIComponent(part.slice(separatorIndex + 1).trim());
    } catch (_) {
      return "";
    }
  }
  return "";
}

function getRequestSessionToken(request, cookieName = "switch_session") {
  const headers = request?.headers || {};
  return normalizeText(
    headers["x-switch-session"]
      || getBearerToken(headers.authorization)
      || getCookieValue(headers.cookie, cookieName),
  );
}

function validateIdentityHints(session, hints = {}) {
  if (!session || typeof session !== "object") {
    return { ok: false, field: "session" };
  }

  const comparisons = [
    ["accountId", session.accountId, hints.accountId],
    ["email", session.email, hints.email],
    ["adminId", session.adminId, hints.adminId],
  ];
  for (const [field, expectedValue, hintedValue] of comparisons) {
    const hint = normalizeIdentityValue(hintedValue);
    if (!hint) continue;
    const expected = normalizeIdentityValue(expectedValue);
    if (!expected || hint !== expected) {
      return { ok: false, field };
    }
  }
  return { ok: true, field: "" };
}

function createAppSessionAuth(environment = process.env, options = {}) {
  const dedicatedSecret = normalizeText(environment.APP_SESSION_SECRET);
  const fallbackSecret = normalizeText(environment.ADMIN_API_SESSION_SECRET);
  const sessionSecret = dedicatedSecret || fallbackSecret;
  const sessionTtlSeconds = parseSessionTtlSeconds(environment.APP_SESSION_TTL_SECONDS);
  const requireSecrets =
    normalizeIdentityValue(environment.NODE_ENV) === "production"
    || normalizeText(environment.REQUIRE_SECRETS) === "1";
  const now = typeof options.now === "function" ? options.now : Date.now;

  function assertStartupConfiguration() {
    if (requireSecrets && !sessionSecret) {
      throw new Error(
        "Missing required app session secret: APP_SESSION_SECRET or ADMIN_API_SESSION_SECRET",
      );
    }
  }

  function isConfigured() {
    return Boolean(sessionSecret);
  }

  function signPayload(encodedPayload) {
    return crypto
      .createHmac("sha256", sessionSecret)
      .update(`switch-app-session:v1.${encodedPayload}`)
      .digest();
  }

  function issueSession(identity = {}) {
    if (!isConfigured()) {
      throw new Error("App session authentication is not configured.");
    }

    const role = normalizeRole(identity.role);
    const accountId = normalizeText(identity.accountId || identity.id || identity.email);
    const email = normalizeIdentityValue(identity.email);
    const adminId = normalizeIdentityValue(identity.adminId);
    if (!role || !accountId) {
      throw new Error("A valid account identity and role are required.");
    }
    if ((role === "seller" || role === "employee") && !adminId) {
      throw new Error("A tenant admin ID is required for seller and employee sessions.");
    }

    const issuedAt = Math.floor(now() / 1000);
    const expiresAt = issuedAt + sessionTtlSeconds;
    const payload = {
      sub: accountId,
      role,
      accountId,
      email,
      adminId,
      iat: issuedAt,
      exp: expiresAt,
      nonce: crypto.randomBytes(16).toString("base64url"),
    };
    const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
    const signature = signPayload(encodedPayload).toString("base64url");

    return {
      token: `v1.${encodedPayload}.${signature}`,
      expiresAt: new Date(expiresAt * 1000).toISOString(),
      expiresInSeconds: sessionTtlSeconds,
      payload,
    };
  }

  function verifySession(tokenValue) {
    if (!isConfigured()) return null;

    const token = normalizeText(tokenValue);
    const parts = token.split(".");
    if (parts.length !== 3 || parts[0] !== "v1" || !parts[1] || !parts[2]) {
      return null;
    }

    try {
      const expectedSignature = signPayload(parts[1]);
      const suppliedSignature = Buffer.from(parts[2], "base64url");
      if (
        suppliedSignature.length !== expectedSignature.length
        || !crypto.timingSafeEqual(suppliedSignature, expectedSignature)
      ) {
        return null;
      }

      const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
      const currentTime = Math.floor(now() / 1000);
      const role = normalizeRole(payload?.role);
      const accountId = normalizeText(payload?.accountId);
      const adminId = normalizeIdentityValue(payload?.adminId);
      if (
        payload?.sub !== accountId
        || !role
        || !accountId
        || ((role === "seller" || role === "employee") && !adminId)
        || !Number.isInteger(payload?.iat)
        || !Number.isInteger(payload?.exp)
        || payload.exp <= payload.iat
        || payload.iat > currentTime + 60
        || payload.exp <= currentTime
        || typeof payload?.nonce !== "string"
        || payload.nonce.length < 16
      ) {
        return null;
      }

      return {
        ...payload,
        role,
        accountId,
        email: normalizeIdentityValue(payload.email),
        adminId,
      };
    } catch (_) {
      return null;
    }
  }

  return Object.freeze({
    sessionTtlSeconds,
    usesDedicatedSecret: Boolean(dedicatedSecret),
    assertStartupConfiguration,
    isConfigured,
    issueSession,
    verifySession,
    getRequestSessionToken,
  });
}

module.exports = {
  createAppSessionAuth,
  getRequestSessionToken,
  validateIdentityHints,
};
