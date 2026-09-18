"use strict";

const CORS_ALLOWED_HEADERS = [
  "Content-Type",
  "If-Match",
  "X-Request-ID",
  "X-File-Name",
  "X-GMS-Admin-ID",
  "X-Admin-ID",
  "X-GMS-Super-Admin-Token",
  "X-GMS-Session-Token",
  "Authorization",
].join(",");

function normalizeOrigin(value) {
  return String(value ?? "").trim().replace(/\/$/, "");
}

function resolveAllowedOrigin(requestOrigin, allowedOrigins = []) {
  const origin = normalizeOrigin(requestOrigin);
  if (!origin) {
    return "";
  }
  const allowlist = Array.isArray(allowedOrigins) ? allowedOrigins : [];
  return allowlist.some((allowed) => normalizeOrigin(allowed) === origin)
    ? origin
    : "";
}

function applyCorsHeaders(response, request, allowedOrigins = []) {
  const origin = normalizeOrigin(request?.headers?.origin);
  const allowedOrigin = resolveAllowedOrigin(origin, allowedOrigins);
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

function isDisallowedCrossOrigin(request, allowedOrigins = []) {
  const origin = normalizeOrigin(request?.headers?.origin);
  if (!origin) {
    return false;
  }
  return !resolveAllowedOrigin(origin, allowedOrigins);
}

module.exports = {
  CORS_ALLOWED_HEADERS,
  normalizeOrigin,
  resolveAllowedOrigin,
  applyCorsHeaders,
  isDisallowedCrossOrigin,
};
