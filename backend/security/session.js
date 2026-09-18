"use strict";

const crypto = require("crypto");

const SESSION_COOKIE_NAME = "gms_session";
const SESSION_HEADER_NAME = "x-gms-session-token";
const SUPER_ADMIN_TOKEN_HEADER = "x-gms-super-admin-token";

function toBase64Url(value) {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(String(value));
  return buffer.toString("base64url");
}

function fromBase64Url(value) {
  return Buffer.from(String(value ?? ""), "base64url");
}

function signPayload(payload, secret) {
  const encoded = toBase64Url(JSON.stringify(payload));
  const signature = crypto
    .createHmac("sha256", secret)
    .update(encoded)
    .digest();
  return `${encoded}.${toBase64Url(signature)}`;
}

function createSessionToken(claims, { secret, ttlSeconds }) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const payload = {
    v: 1,
    iat: nowSeconds,
    exp: nowSeconds + Math.max(60, Number(ttlSeconds) || 60 * 60 * 12),
    role: String(claims.role ?? "").trim().toLowerCase(),
    sub: String(claims.sub ?? claims.accountId ?? claims.username ?? "").trim(),
    accountId: String(claims.accountId ?? "").trim(),
    adminId: String(claims.adminId ?? "").trim(),
    username: String(claims.username ?? "").trim(),
    email: String(claims.email ?? "").trim().toLowerCase(),
  };
  if (!payload.role) {
    throw new Error("Session role is required.");
  }
  return signPayload(payload, secret);
}

function verifySessionToken(token, secret) {
  const raw = String(token ?? "").trim();
  if (!raw || !secret || !raw.includes(".")) {
    return null;
  }

  const separator = raw.lastIndexOf(".");
  const encoded = raw.slice(0, separator);
  const providedSignature = raw.slice(separator + 1);
  if (!encoded || !providedSignature) {
    return null;
  }

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(encoded)
    .digest();
  let provided;
  try {
    provided = fromBase64Url(providedSignature);
  } catch (_) {
    return null;
  }
  if (
    provided.length !== expectedSignature.length ||
    !crypto.timingSafeEqual(provided, expectedSignature)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(fromBase64Url(encoded).toString("utf8"));
    if (!payload || payload.v !== 1 || !payload.role) {
      return null;
    }
    if (!Number.isFinite(payload.exp) || payload.exp * 1000 <= Date.now()) {
      return null;
    }
    return payload;
  } catch (_) {
    return null;
  }
}

function parseCookieHeader(cookieHeader) {
  const cookies = {};
  for (const part of String(cookieHeader ?? "").split(";")) {
    const separator = part.indexOf("=");
    if (separator <= 0) {
      continue;
    }
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (!key) {
      continue;
    }
    try {
      cookies[key] = decodeURIComponent(value);
    } catch (_) {
      cookies[key] = value;
    }
  }
  return cookies;
}

function readBearerToken(authorizationHeader) {
  const value = String(authorizationHeader ?? "").trim();
  if (!value.toLowerCase().startsWith("bearer ")) {
    return "";
  }
  return value.slice(7).trim();
}

function extractSessionToken(request) {
  const cookies = parseCookieHeader(request?.headers?.cookie);
  return (
    String(cookies[SESSION_COOKIE_NAME] ?? "").trim() ||
    String(request?.headers?.[SESSION_HEADER_NAME] ?? "").trim() ||
    readBearerToken(request?.headers?.authorization) ||
    String(request?.headers?.[SUPER_ADMIN_TOKEN_HEADER] ?? "").trim()
  );
}

function attachRequestAuth(request, secret) {
  const token = extractSessionToken(request);
  const session = token ? verifySessionToken(token, secret) : null;
  request.gmsAuth = session;
  request.gmsSessionToken = session ? token : "";
  return session;
}

function buildSessionCookie(token, { ttlSeconds, secure = false, path = "/" } = {}) {
  const maxAge = Math.max(60, Number(ttlSeconds) || 60 * 60 * 12);
  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    `Path=${path}`,
    `Max-Age=${maxAge}`,
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (secure) {
    parts.push("Secure");
  }
  return parts.join("; ");
}

function setSessionCookie(response, token, options) {
  const cookie = buildSessionCookie(token, options);
  const previous = response.getHeader("Set-Cookie");
  if (!previous) {
    response.setHeader("Set-Cookie", cookie);
    return;
  }
  const cookies = Array.isArray(previous) ? previous : [String(previous)];
  response.setHeader("Set-Cookie", [...cookies, cookie]);
}

function clearSessionCookie(response, { secure = false, path = "/" } = {}) {
  const cookie = [
    `${SESSION_COOKIE_NAME}=`,
    `Path=${path}`,
    "Max-Age=0",
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (secure) {
    cookie.push("Secure");
  }
  response.setHeader("Set-Cookie", cookie.join("; "));
}

module.exports = {
  SESSION_COOKIE_NAME,
  SESSION_HEADER_NAME,
  SUPER_ADMIN_TOKEN_HEADER,
  createSessionToken,
  verifySessionToken,
  extractSessionToken,
  attachRequestAuth,
  buildSessionCookie,
  setSessionCookie,
  clearSessionCookie,
  parseCookieHeader,
};
