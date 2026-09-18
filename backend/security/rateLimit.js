"use strict";

function createLoginRateLimiter({
  maxAttempts = 8,
  ipMaxAttempts = 40,
  windowMs = 15 * 60 * 1000,
  nowFn = () => Date.now(),
} = {}) {
  const attempts = new Map();

  function prune(now) {
    for (const [key, bucket] of attempts.entries()) {
      if (!bucket?.resetAt || bucket.resetAt <= now) {
        attempts.delete(key);
      }
    }
  }

  function consume(key, limit = maxAttempts) {
    const now = nowFn();
    prune(now);
    const normalizedKey = String(key ?? "").trim() || "unknown";
    const existing = attempts.get(normalizedKey);
    if (!existing || existing.resetAt <= now) {
      attempts.set(normalizedKey, { count: 1, resetAt: now + windowMs });
      return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 };
    }
    if (existing.count >= limit) {
      return {
        ok: false,
        remaining: 0,
        retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
      };
    }
    existing.count += 1;
    return {
      ok: true,
      remaining: Math.max(0, limit - existing.count),
      retryAfterSeconds: 0,
    };
  }

  function reset(key) {
    attempts.delete(String(key ?? "").trim());
  }

  function consumeLogin({ ip, identifier }) {
    const clientIp = String(ip ?? "").trim() || "unknown";
    const loginId = String(identifier ?? "").trim().toLowerCase() || "unknown";
    const ipResult = consume(`ip:${clientIp}`, ipMaxAttempts);
    if (!ipResult.ok) {
      return { ...ipResult, key: `ip:${clientIp}` };
    }
    const idResult = consume(`id:${clientIp}|${loginId}`, maxAttempts);
    return { ...idResult, key: `id:${clientIp}|${loginId}` };
  }

  function resetLogin({ ip, identifier }) {
    const clientIp = String(ip ?? "").trim() || "unknown";
    const loginId = String(identifier ?? "").trim().toLowerCase() || "unknown";
    reset(`id:${clientIp}|${loginId}`);
  }

  return {
    consume,
    reset,
    consumeLogin,
    resetLogin,
  };
}

function getClientIp(request) {
  const forwarded = String(request?.headers?.["x-forwarded-for"] ?? "")
    .split(",")[0]
    .trim();
  if (forwarded) {
    return forwarded;
  }
  return String(
    request?.socket?.remoteAddress ??
      request?.connection?.remoteAddress ??
      "",
  ).trim() || "unknown";
}

module.exports = {
  createLoginRateLimiter,
  getClientIp,
};
