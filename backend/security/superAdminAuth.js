"use strict";

const crypto = require("crypto");
const { verifyPassword, looksLikeBcryptHash } = require("../db/password");

const DEFAULT_SESSION_TTL_SECONDS = 8 * 60 * 60;
const MAX_SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
const LEGACY_DEFAULT_USERNAME = "root";
const LEGACY_DEFAULT_PASSWORD = ["Root@", "12345"].join("");

function parseSessionTtlSeconds(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_SESSION_TTL_SECONDS;
  }
  return Math.min(Math.trunc(parsed), MAX_SESSION_TTL_SECONDS);
}

function timingSafeStringEqual(leftValue, rightValue) {
  const leftDigest = crypto.createHash("sha256").update(String(leftValue ?? "")).digest();
  const rightDigest = crypto.createHash("sha256").update(String(rightValue ?? "")).digest();
  return crypto.timingSafeEqual(leftDigest, rightDigest);
}

function isLegacyDefaultCredentialPair(username, password) {
  return (
    String(username ?? "").trim().toLowerCase() === LEGACY_DEFAULT_USERNAME
    && timingSafeStringEqual(password, LEGACY_DEFAULT_PASSWORD)
  );
}

function createSuperAdminAuth(environment = process.env, options = {}) {
  const username = String(environment.SUPER_ADMIN_USERNAME ?? "").trim();
  const password = String(environment.SUPER_ADMIN_PASSWORD ?? "");
  const sessionSecret = String(environment.ADMIN_API_SESSION_SECRET ?? "");
  const sessionTtlSeconds = parseSessionTtlSeconds(
    environment.SUPER_ADMIN_SESSION_TTL_SECONDS,
  );
  const requireSecrets =
    String(environment.NODE_ENV ?? "").trim().toLowerCase() === "production"
    || String(environment.REQUIRE_SECRETS ?? "").trim() === "1";
  const now = typeof options.now === "function" ? options.now : Date.now;
  const missingConfiguration = [
    ["SUPER_ADMIN_USERNAME", username],
    ["SUPER_ADMIN_PASSWORD", password],
    ["ADMIN_API_SESSION_SECRET", sessionSecret],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);
  const hasLegacyDefaultCredentials = isLegacyDefaultCredentialPair(username, password);
  const hasInvalidPasswordHash = Boolean(password) && !looksLikeBcryptHash(password);

  function assertStartupConfiguration() {
    if (requireSecrets && missingConfiguration.length > 0) {
      throw new Error(
        `Missing required super-admin environment variables: ${missingConfiguration.join(", ")}`,
      );
    }
    if (requireSecrets && hasLegacyDefaultCredentials) {
      throw new Error("The retired default super-admin credentials are not allowed.");
    }
    if (requireSecrets && hasInvalidPasswordHash) {
      throw new Error("SUPER_ADMIN_PASSWORD must contain a bcrypt hash.");
    }
  }

  function isConfigured() {
    return (
      missingConfiguration.length === 0
      && !hasLegacyDefaultCredentials
      && !hasInvalidPasswordHash
    );
  }

  async function verifyCredentials(submittedUsername, submittedPassword) {
    if (!isConfigured()) {
      return false;
    }

    const usernameMatches = timingSafeStringEqual(
      String(submittedUsername ?? "").trim(),
      username,
    );
    if (isLegacyDefaultCredentialPair(submittedUsername, submittedPassword)) {
      return false;
    }
    const passwordMatches = await verifyPassword(submittedPassword, password);
    return usernameMatches && passwordMatches;
  }

  function signPayload(encodedPayload) {
    return crypto
      .createHmac("sha256", sessionSecret)
      .update(`v1.${encodedPayload}`)
      .digest();
  }

  function issueSession() {
    if (!isConfigured()) {
      throw new Error("Super-admin authentication is not configured.");
    }

    const issuedAt = Math.floor(now() / 1000);
    const expiresAt = issuedAt + sessionTtlSeconds;
    const payload = {
      sub: username,
      role: "super-admin",
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
    };
  }

  function verifySession(tokenValue) {
    if (!isConfigured()) {
      return null;
    }

    const token = String(tokenValue ?? "").trim();
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
      if (
        payload?.sub !== username
        || payload?.role !== "super-admin"
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

      return payload;
    } catch (error) {
      return null;
    }
  }

  return Object.freeze({
    username,
    sessionTtlSeconds,
    hasLegacyDefaultCredentials,
    hasInvalidPasswordHash,
    missingConfiguration: Object.freeze([...missingConfiguration]),
    assertStartupConfiguration,
    isConfigured,
    verifyCredentials,
    issueSession,
    verifySession,
  });
}

module.exports = {
  createSuperAdminAuth,
};
