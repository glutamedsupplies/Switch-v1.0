"use strict";

const PUBLIC_API_PATHS = new Set([
  "/api/admin-login",
  "/api/accounts/login",
  "/api/employee-login",
  "/api/super-admin-login",
  "/api/admin-register",
  "/api/admin-signup-availability",
  "/api/admin-lookup",
  "/api/employee-lookup",
  "/api/auth/verification/send",
  "/api/auth/verification/verify",
  "/api/auth/password-reset",
  "/api/auth/google/config",
  "/api/auth/google/login",
  "/api/auth/google/seller-login",
  "/api/auth/google/profile",
  "/api/workspace-theme",
  "/api/payments/paymongo/seller-webhook",
]);

const PUBLIC_GET_PREFIXES = [
  "/api/products",
  "/api/categories",
  "/api/platforms",
  "/api/store-types",
  "/api/sellers",
  "/api/maps",
  "/api/trending-searches",
];

const UPLOAD_API_PATHS = new Set([
  "/api/uploads",
  "/api/chat-uploads",
  "/api/review-uploads",
  "/api/document-uploads",
  "/api/product-models/from-frames",
  "/api/product-models/from-scan",
  "/api/platform-feedback/uploads",
]);

function normalizeTenantId(value, fallback = "") {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || fallback;
}

function readClaimedAdminId(request, requestUrl = null) {
  const url = requestUrl || (request?.url
    ? new URL(request.url, "http://127.0.0.1")
    : null);
  return normalizeTenantId(
    request?.headers?.["x-gms-admin-id"] ??
      request?.headers?.["x-admin-id"] ??
      url?.searchParams.get("adminId") ??
      url?.searchParams.get("tenantId") ??
      url?.searchParams.get("workspaceId"),
    "",
  );
}

function isPublicApiPath(pathname, method = "GET") {
  const path = String(pathname ?? "").split("?")[0];
  if (PUBLIC_API_PATHS.has(path)) {
    return true;
  }
  const normalizedMethod = String(method || "GET").toUpperCase();
  if (normalizedMethod === "GET" || normalizedMethod === "HEAD") {
    return PUBLIC_GET_PREFIXES.some(
      (prefix) => path === prefix || path.startsWith(`${prefix}/`),
    );
  }
  return false;
}

function isUploadApiPath(pathname) {
  const path = String(pathname ?? "").split("?")[0];
  return UPLOAD_API_PATHS.has(path) || path.startsWith("/api/platform-feedback/uploads");
}

function getSessionAdminId(session) {
  if (!session) {
    return "";
  }
  return normalizeTenantId(session.adminId || "", "");
}

function isSuperAdminSession(session) {
  return String(session?.role ?? "").trim().toLowerCase() === "super-admin";
}

function resolveTenantAdminId(request, requestUrl, fallback = "") {
  const session = request?.gmsAuth || null;
  const claimed = readClaimedAdminId(request, requestUrl);
  if (isSuperAdminSession(session)) {
    return claimed || normalizeTenantId(fallback, "");
  }
  const sessionAdminId = getSessionAdminId(session);
  if (sessionAdminId) {
    return sessionAdminId;
  }
  return normalizeTenantId(fallback, "");
}

function hasAuthenticatedAdminScope(request) {
  const session = request?.gmsAuth || null;
  return Boolean(isSuperAdminSession(session) || getSessionAdminId(session));
}

function evaluateTenantScope(request, requestUrl = null) {
  const claimed = readClaimedAdminId(request, requestUrl);
  if (!claimed) {
    return { ok: true, claimed: "", statusCode: 0, message: "" };
  }

  const session = request?.gmsAuth || null;
  if (!session) {
    return {
      ok: false,
      claimed,
      statusCode: 401,
      message: "A signed session is required for tenant scope.",
    };
  }

  if (isSuperAdminSession(session)) {
    return { ok: true, claimed, statusCode: 0, message: "" };
  }

  const sessionAdminId = getSessionAdminId(session);
  if (sessionAdminId && sessionAdminId !== claimed) {
    return {
      ok: false,
      claimed,
      statusCode: 403,
      message: "Tenant scope does not match the signed session.",
    };
  }

  // Buyer/other signed sessions do not inherit caller-supplied tenant headers.
  return { ok: true, claimed, statusCode: 0, message: "" };
}

function requireSignedSession(session, { roles = null } = {}) {
  if (!session) {
    return {
      ok: false,
      statusCode: 401,
      message: "Sign in is required.",
    };
  }
  if (Array.isArray(roles) && roles.length) {
    const role = String(session.role ?? "").trim().toLowerCase();
    if (!roles.includes(role)) {
      return {
        ok: false,
        statusCode: 403,
        message: "This account cannot perform that action.",
      };
    }
  }
  return { ok: true, statusCode: 0, message: "" };
}

module.exports = {
  PUBLIC_API_PATHS,
  PUBLIC_GET_PREFIXES,
  UPLOAD_API_PATHS,
  normalizeTenantId,
  readClaimedAdminId,
  isPublicApiPath,
  isUploadApiPath,
  getSessionAdminId,
  isSuperAdminSession,
  resolveTenantAdminId,
  hasAuthenticatedAdminScope,
  evaluateTenantScope,
  requireSignedSession,
};
