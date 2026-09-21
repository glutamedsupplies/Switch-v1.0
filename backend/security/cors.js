"use strict";

/**
 * Default CORS allowlist: localhost Flutter / admin origins only.
 *
 * Loopback hosts (http and https, any port):
 * - localhost
 * - 127.0.0.1
 * - [::1]
 *
 * Typical origins that match:
 * - http://127.0.0.1:8080        backend-served admin console
 * - http://localhost:8080        same, via localhost
 * - http://127.0.0.1:<port>      Flutter web / dart debug
 * - http://localhost:<port>      Flutter Chrome (`flutter run -d chrome`)
 * - http://[::1]:<port>          IPv6 loopback
 *
 * Additional exact origins may be added with CORS_ALLOWED_ORIGINS
 * (comma-separated). Access-Control-Allow-Origin is never `*`.
 */
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

const CORS_ALLOWED_HEADERS = [
  "Content-Type",
  "Authorization",
  "If-Match",
  "X-Request-ID",
  "X-File-Name",
  "X-Switch-Session",
  "X-GMS-Admin-ID",
  "X-Admin-ID",
  "X-GMS-Account-ID",
  "X-Account-ID",
  "X-GMS-Account-Email",
  "X-Account-Email",
  "X-GMS-Super-Admin-Token",
].join(",");

function normalizeOrigin(value) {
  return String(value ?? "").trim().replace(/\/$/, "");
}

function parseCorsAllowedOrigins(rawValue) {
  return String(rawValue ?? "")
    .split(",")
    .map((value) => normalizeOrigin(value))
    .filter(Boolean);
}

function isLoopbackOrigin(originValue) {
  const origin = normalizeOrigin(originValue);
  if (!origin) {
    return false;
  }

  try {
    const url = new URL(origin);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return false;
    }
    const hostname = String(url.hostname || "")
      .trim()
      .toLowerCase()
      .replace(/^\[|\]$/g, "");
    return LOOPBACK_HOSTS.has(hostname);
  } catch (_) {
    return false;
  }
}

function resolveAllowedOrigin(requestOrigin, extraAllowedOrigins = []) {
  const origin = normalizeOrigin(requestOrigin);
  if (!origin) {
    return "";
  }
  if (isLoopbackOrigin(origin)) {
    return origin;
  }
  const allowlist = Array.isArray(extraAllowedOrigins) ? extraAllowedOrigins : [];
  return allowlist.some((allowed) => normalizeOrigin(allowed) === origin) ? origin : "";
}

function applyCorsHeaders(response, request, extraAllowedOrigins = []) {
  const origin = normalizeOrigin(request?.headers?.origin);
  const allowedOrigin = resolveAllowedOrigin(origin, extraAllowedOrigins);
  if (allowedOrigin) {
    response.setHeader("Access-Control-Allow-Origin", allowedOrigin);
    response.setHeader("Access-Control-Allow-Credentials", "true");
    response.setHeader("Vary", "Origin");
  }
  response.setHeader("Access-Control-Allow-Headers", CORS_ALLOWED_HEADERS);
  response.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  );
}

function isDisallowedCrossOrigin(request, extraAllowedOrigins = []) {
  const origin = normalizeOrigin(request?.headers?.origin);
  if (!origin) {
    return false;
  }
  return !resolveAllowedOrigin(origin, extraAllowedOrigins);
}

module.exports = {
  CORS_ALLOWED_HEADERS,
  LOOPBACK_HOSTS,
  normalizeOrigin,
  parseCorsAllowedOrigins,
  isLoopbackOrigin,
  resolveAllowedOrigin,
  applyCorsHeaders,
  isDisallowedCrossOrigin,
};
