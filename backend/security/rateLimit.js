"use strict";

function createRateLimiter({
  max = 60,
  windowMs = 15 * 60 * 1000,
  nowFn = () => Date.now(),
} = {}) {
  const buckets = new Map();

  function prune(now) {
    if (buckets.size < 256) {
      return;
    }
    for (const [key, bucket] of buckets.entries()) {
      if (!bucket?.resetAt || bucket.resetAt <= now) {
        buckets.delete(key);
      }
    }
  }

  function read(key, now) {
    const normalizedKey = String(key ?? "").trim() || "unknown";
    const existing = buckets.get(normalizedKey);
    if (!existing || existing.resetAt <= now) {
      return { key: normalizedKey, count: 0, resetAt: now + windowMs, fresh: true };
    }
    return { key: normalizedKey, count: existing.count, resetAt: existing.resetAt, fresh: false };
  }

  function peek(key, limit = max) {
    const now = nowFn();
    const state = read(key, now);
    if (state.count >= limit) {
      return {
        ok: false,
        remaining: 0,
        retryAfterSeconds: Math.max(1, Math.ceil((state.resetAt - now) / 1000)),
      };
    }
    return {
      ok: true,
      remaining: Math.max(0, limit - state.count),
      retryAfterSeconds: 0,
    };
  }

  function consume(key, limit = max) {
    const now = nowFn();
    prune(now);
    const state = read(key, now);
    if (state.count >= limit) {
      return {
        ok: false,
        remaining: 0,
        retryAfterSeconds: Math.max(1, Math.ceil((state.resetAt - now) / 1000)),
      };
    }
    const count = state.count + 1;
    buckets.set(state.key, {
      count,
      resetAt: state.fresh ? now + windowMs : state.resetAt,
    });
    return {
      ok: true,
      remaining: Math.max(0, limit - count),
      retryAfterSeconds: 0,
    };
  }

  function reset(key) {
    buckets.delete(String(key ?? "").trim());
  }

  return { peek, consume, reset };
}

function createLoginLockout({
  maxAttempts = 5,
  ipMaxAttempts = 40,
  windowMs = 15 * 60 * 1000,
  nowFn = () => Date.now(),
} = {}) {
  const limiter = createRateLimiter({ max: maxAttempts, windowMs, nowFn });

  function keys({ ip, identifier }) {
    const clientIp = String(ip ?? "").trim() || "unknown";
    const loginId = String(identifier ?? "").trim().toLowerCase() || "unknown";
    return {
      ip: `login-ip:${clientIp}`,
      id: `login-id:${clientIp}|${loginId}`,
    };
  }

  function check({ ip, identifier }) {
    const namedKeys = keys({ ip, identifier });
    const ipResult = limiter.peek(namedKeys.ip, ipMaxAttempts);
    if (!ipResult.ok) {
      return { ...ipResult, code: "LOGIN_LOCKED" };
    }
    const idResult = limiter.peek(namedKeys.id, maxAttempts);
    if (!idResult.ok) {
      return { ...idResult, code: "LOGIN_LOCKED" };
    }
    return { ok: true, remaining: idResult.remaining, retryAfterSeconds: 0, code: "" };
  }

  function recordFailure({ ip, identifier }) {
    const namedKeys = keys({ ip, identifier });
    limiter.consume(namedKeys.ip, ipMaxAttempts);
    const idResult = limiter.consume(namedKeys.id, maxAttempts);
    return { ...idResult, code: idResult.ok ? "" : "LOGIN_LOCKED" };
  }

  function recordSuccess({ ip, identifier }) {
    const namedKeys = keys({ ip, identifier });
    limiter.reset(namedKeys.id);
  }

  return { check, recordFailure, recordSuccess };
}

module.exports = {
  createRateLimiter,
  createLoginLockout,
};
