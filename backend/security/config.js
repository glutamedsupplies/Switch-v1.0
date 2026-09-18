"use strict";

const REQUIRED_SECRETS = [
  "SUPER_ADMIN_USERNAME",
  "SUPER_ADMIN_PASSWORD",
  "ADMIN_API_SESSION_SECRET",
];

const INSECURE_SUPER_ADMIN_DEFAULTS = new Set([
  "root",
  "Root@12345",
  "admin",
  "password",
  "changeme",
]);

function readRequired(env, key) {
  return String(env?.[key] ?? "").trim();
}

function collectMissingSecurityEnv(env = process.env) {
  return REQUIRED_SECRETS.filter((key) => !readRequired(env, key));
}

function assertSecurityConfig(env = process.env) {
  const missing = collectMissingSecurityEnv(env);
  if (missing.length) {
    const error = new Error(
      `Missing required environment variables: ${missing.join(", ")}. ` +
        "Set them in backend/.env before starting the server. " +
        "There are no default super-admin credentials.",
    );
    error.code = "SECURITY_CONFIG_MISSING";
    throw error;
  }

  const username = readRequired(env, "SUPER_ADMIN_USERNAME");
  const password = readRequired(env, "SUPER_ADMIN_PASSWORD");
  const sessionSecret = readRequired(env, "ADMIN_API_SESSION_SECRET");

  if (sessionSecret.length < 16) {
    const error = new Error(
      "ADMIN_API_SESSION_SECRET must be at least 16 characters.",
    );
    error.code = "SECURITY_CONFIG_WEAK";
    throw error;
  }

  if (
    password === "Root@12345" ||
    (
      INSECURE_SUPER_ADMIN_DEFAULTS.has(username) &&
      INSECURE_SUPER_ADMIN_DEFAULTS.has(password)
    )
  ) {
    const error = new Error(
      "Refusing to start with well-known default super-admin credentials. " +
        "Set unique SUPER_ADMIN_USERNAME and SUPER_ADMIN_PASSWORD in the environment.",
    );
    error.code = "SECURITY_CONFIG_INSECURE_DEFAULTS";
    throw error;
  }

  return {
    superAdminUsername: username,
    superAdminPassword: password,
    sessionSecret,
    sessionTtlSeconds: Math.max(
      300,
      Number(env.ADMIN_API_SESSION_TTL_SECONDS) || 60 * 60 * 12,
    ),
    corsAllowedOrigins: parseCorsAllowedOrigins(env.CORS_ALLOWED_ORIGINS),
    cookieSecure: String(env.COOKIE_SECURE ?? "").trim().toLowerCase() === "true",
    loginRateLimitMax: Math.max(3, Number(env.LOGIN_RATE_LIMIT_MAX) || 8),
    loginRateLimitIpMax: Math.max(10, Number(env.LOGIN_RATE_LIMIT_IP_MAX) || 40),
    loginRateLimitWindowMs: Math.max(
      30_000,
      Number(env.LOGIN_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    ),
  };
}

function parseCorsAllowedOrigins(rawValue) {
  return String(rawValue ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => value.replace(/\/$/, ""));
}

function loadSecurityConfigOrExit(env = process.env, exitFn = process.exit) {
  try {
    return assertSecurityConfig(env);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    exitFn(1);
    return null;
  }
}

module.exports = {
  REQUIRED_SECRETS,
  collectMissingSecurityEnv,
  assertSecurityConfig,
  parseCorsAllowedOrigins,
  loadSecurityConfigOrExit,
};
