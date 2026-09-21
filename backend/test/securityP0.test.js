"use strict";

const assert = require("node:assert/strict");
const http = require("node:http");
const path = require("node:path");
const { spawn } = require("node:child_process");
const test = require("node:test");
const bcrypt = require("bcryptjs");
const crypto = require("node:crypto");
const {
  applyCorsHeaders,
  isDisallowedCrossOrigin,
  isLoopbackOrigin,
  resolveAllowedOrigin,
} = require("../security/cors");
const { createLoginLockout, createRateLimiter } = require("../security/rateLimit");
const { isLoopbackBind, isWildcardBind, resolveBindHost } = require("../security/bindHost");
const { verifyPaymongoWebhook } = require("../services/sellerCheckoutGateway");
const { createAppSessionAuth } = require("../security/appSessionAuth");

const TEST_APP_SECRET = "test-app-session-secret-with-at-least-32-bytes";
const TEST_ADMIN_SECRET = "test-admin-session-secret-with-at-least-32-bytes";
const TEST_WEBHOOK_SECRET = "whsec_test_paymongo_p0";
const HTTP_PORT = 18123;

function mockResponse() {
  const headers = {};
  return {
    headers,
    setHeader(key, value) {
      headers[String(key).toLowerCase()] = value;
    },
  };
}

function signPaymongoBody(
  rawBody,
  secret,
  timestamp = String(Math.floor(Date.now() / 1000)),
) {
  const digest = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");
  return `t=${timestamp},te=${digest},li=${digest}`;
}

test("BIND_HOST defaults to 127.0.0.1 and can be overridden", () => {
  assert.equal(resolveBindHost({}), "127.0.0.1");
  assert.equal(resolveBindHost({ BIND_HOST: "" }), "127.0.0.1");
  assert.equal(resolveBindHost({ BIND_HOST: "0.0.0.0" }), "0.0.0.0");
  assert.equal(isWildcardBind("0.0.0.0"), true);
  assert.equal(isLoopbackBind("127.0.0.1"), true);
  assert.equal(isWildcardBind("127.0.0.1"), false);
});

test("CORS allowlists localhost Flutter/admin origins and never uses *", () => {
  const extra = ["https://admin.internal.example"];
  assert.equal(isLoopbackOrigin("http://127.0.0.1:8080"), true);
  assert.equal(isLoopbackOrigin("http://localhost:7357"), true);
  assert.equal(isLoopbackOrigin("http://[::1]:8080"), true);
  assert.equal(isLoopbackOrigin("https://localhost"), true);
  assert.equal(isLoopbackOrigin("http://evil.example"), false);
  assert.equal(resolveAllowedOrigin("http://evil.example", extra), "");
  assert.equal(
    resolveAllowedOrigin("https://admin.internal.example", extra),
    "https://admin.internal.example",
  );

  const blocked = mockResponse();
  applyCorsHeaders(blocked, { headers: { origin: "http://evil.example" } }, extra);
  assert.equal(blocked.headers["access-control-allow-origin"], undefined);
  assert.notEqual(blocked.headers["access-control-allow-origin"], "*");
  assert.equal(isDisallowedCrossOrigin({ headers: { origin: "http://evil.example" } }, extra), true);

  const allowed = mockResponse();
  applyCorsHeaders(allowed, { headers: { origin: "http://localhost:12345" } }, extra);
  assert.equal(allowed.headers["access-control-allow-origin"], "http://localhost:12345");
  assert.equal(allowed.headers["access-control-allow-credentials"], "true");
});

test("login lockout is per IP + identifier", () => {
  const lockout = createLoginLockout({ maxAttempts: 3, ipMaxAttempts: 10, windowMs: 60_000 });
  const first = { ip: "1.1.1.1", identifier: "a@x.com" };
  assert.equal(lockout.check(first).ok, true);
  lockout.recordFailure(first);
  lockout.recordFailure(first);
  lockout.recordFailure(first);
  assert.equal(lockout.check(first).ok, false);
  assert.equal(lockout.check({ ip: "1.1.1.1", identifier: "b@x.com" }).ok, true);
  assert.equal(lockout.check({ ip: "9.9.9.9", identifier: "a@x.com" }).ok, true);
  lockout.recordSuccess(first);
  assert.equal(lockout.check(first).ok, true);
});

test("generic rate limiter blocks after max hits", () => {
  const limiter = createRateLimiter({ max: 2, windowMs: 60_000 });
  assert.equal(limiter.consume("upload:ip:1.1.1.1").ok, true);
  assert.equal(limiter.consume("upload:ip:1.1.1.1").ok, true);
  assert.equal(limiter.consume("upload:ip:1.1.1.1").ok, false);
});

test("PayMongo webhook rejects missing secret, unsigned, and bad signatures", () => {
  const rawBody = JSON.stringify({ data: { type: "checkout_session.payment.paid" } });
  assert.equal(
    verifyPaymongoWebhook({ rawBody, signatureHeader: "", webhookSecret: "" }),
    false,
  );
  assert.equal(
    verifyPaymongoWebhook({
      rawBody,
      signatureHeader: "t=1,te=deadbeef",
      webhookSecret: TEST_WEBHOOK_SECRET,
    }),
    false,
  );
  const good = signPaymongoBody(rawBody, TEST_WEBHOOK_SECRET);
  assert.equal(
    verifyPaymongoWebhook({
      rawBody,
      signatureHeader: good,
      webhookSecret: TEST_WEBHOOK_SECRET,
    }),
    true,
  );
  const stale = signPaymongoBody(rawBody, TEST_WEBHOOK_SECRET, "1710000000");
  assert.equal(
    verifyPaymongoWebhook({
      rawBody,
      signatureHeader: stale,
      webhookSecret: TEST_WEBHOOK_SECRET,
    }),
    false,
  );
});

function requestHttp(port, {
  method,
  path: urlPath,
  headers = {},
  body = null,
  origin = "",
} = {}) {
  return new Promise((resolve, reject) => {
    const payload = body == null
      ? null
      : Buffer.isBuffer(body) || typeof body === "string"
        ? body
        : JSON.stringify(body);
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        method,
        path: urlPath,
        headers: {
          ...(payload && !headers["content-type"] && !headers["Content-Type"]
            ? { "content-type": "application/json" }
            : {}),
          ...(payload ? { "content-length": Buffer.byteLength(payload) } : {}),
          ...(origin ? { origin } : {}),
          ...headers,
        },
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf8");
          let json = null;
          try {
            json = raw ? JSON.parse(raw) : null;
          } catch (_) {
            json = null;
          }
          resolve({ status: res.statusCode, headers: res.headers, raw, json });
        });
      },
    );
    req.on("error", reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

function waitForOutput(child, pattern, timeoutMs = 25_000) {
  return new Promise((resolve, reject) => {
    let combined = "";
    const onData = (chunk) => {
      combined += String(chunk);
      if (pattern.test(combined)) {
        cleanup();
        resolve(combined);
      }
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for server start.\n${combined}`));
    }, timeoutMs);
    const cleanup = () => {
      clearTimeout(timer);
      child.stdout?.off("data", onData);
      child.stderr?.off("data", onData);
    };
    child.stdout?.on("data", onData);
    child.stderr?.on("data", onData);
  });
}

test("HTTP security P0 acceptance", { timeout: 60_000 }, async (t) => {
  const password = "UniquePass!23456";
  const passwordHash = await bcrypt.hash(password, 4);
  const env = {
    ...process.env,
    PORT: String(HTTP_PORT),
    BIND_HOST: "127.0.0.1",
    REQUIRE_SECRETS: "0",
    SUPER_ADMIN_USERNAME: "security-p0-root",
    SUPER_ADMIN_PASSWORD: passwordHash,
    ADMIN_API_SESSION_SECRET: TEST_ADMIN_SECRET,
    APP_SESSION_SECRET: TEST_APP_SECRET,
    LOGIN_RATE_LIMIT_MAX: "3",
    LOGIN_RATE_LIMIT_IP_MAX: "40",
    LOGIN_RATE_LIMIT_WINDOW_MS: "60000",
    UPLOAD_RATE_LIMIT_MAX: "8",
    AI_RATE_LIMIT_MAX: "8",
    VISUAL_SEARCH_RATE_LIMIT_MAX: "8",
    PAYMONGO_WEBHOOK_SECRET: TEST_WEBHOOK_SECRET,
  };
  delete env.DATABASE_URL;
  delete env.PAYMONGO_SECRET_KEY;

  const child = spawn(process.execPath, ["server.js"], {
    cwd: path.join(__dirname, ".."),
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  try {
    const startupLog = await waitForOutput(child, /listening on 127\.0\.0\.1:18123/);
    assert.match(startupLog, /listening on 127\.0\.0\.1:18123/);

    await t.test("unauthenticated uploads return 401 before validation", async () => {
      for (const urlPath of [
        "/api/uploads",
        "/api/chat-uploads",
        "/api/review-uploads",
        "/api/document-uploads",
      ]) {
        const res = await requestHttp(HTTP_PORT, {
          method: "POST",
          path: urlPath,
          headers: { "content-type": "text/plain", "x-file-name": "nope.txt" },
          body: "not-a-valid-upload",
        });
        assert.equal(res.status, 401, `${urlPath} expected 401, got ${res.status} ${res.raw}`);
        assert.equal(res.json?.code, "APP_SESSION_INVALID");
      }
    });

    await t.test("forged or missing session is 401; wrong role/tenant is 403", async () => {
      const missing = await requestHttp(HTTP_PORT, {
        method: "GET",
        path: "/api/orders",
      });
      assert.equal(missing.status, 401);

      const missingAnalyticsSummary = await requestHttp(HTTP_PORT, {
        method: "GET",
        path: "/api/analytics/summary",
      });
      assert.equal(missingAnalyticsSummary.status, 401);

      const forged = await requestHttp(HTTP_PORT, {
        method: "GET",
        path: "/api/orders",
        headers: { "x-switch-session": "forged-token" },
      });
      assert.equal(forged.status, 401);

      const pastAuth = createAppSessionAuth(
        { APP_SESSION_SECRET: TEST_APP_SECRET, APP_SESSION_TTL_SECONDS: "2" },
        { now: () => Date.now() - 10_000 },
      );
      const expired = pastAuth.issueSession({
        accountId: "buyer-1",
        email: "buyer@example.com",
        role: "buyer",
      });
      const expiredRes = await requestHttp(HTTP_PORT, {
        method: "GET",
        path: "/api/orders",
        headers: { "x-switch-session": expired.token },
      });
      assert.equal(expiredRes.status, 401);

      const liveAuth = createAppSessionAuth({ APP_SESSION_SECRET: TEST_APP_SECRET });
      const buyer = liveAuth.issueSession({
        accountId: "buyer-1",
        email: "buyer@example.com",
        role: "buyer",
      });
      const wrongRole = await requestHttp(HTTP_PORT, {
        method: "POST",
        path: "/api/products",
        headers: { "x-switch-session": buyer.token },
        body: { name: "Nope" },
      });
      assert.equal(wrongRole.status, 403);

      const seller = liveAuth.issueSession({
        accountId: "seller-1",
        email: "seller@example.com",
        role: "seller",
        adminId: "tenant-one",
      });
      const wrongTenant = await requestHttp(HTTP_PORT, {
        method: "GET",
        path: "/api/orders",
        headers: {
          "x-switch-session": seller.token,
          "x-gms-admin-id": "tenant-two",
        },
      });
      assert.equal(wrongTenant.status, 403);
    });

    await t.test("partner management requires admin auth but product options remain public", async () => {
      const liveAuth = createAppSessionAuth({ APP_SESSION_SECRET: TEST_APP_SECRET });
      const seller = liveAuth.issueSession({
        accountId: "seller-partners",
        email: "seller-partners@example.com",
        role: "seller",
        adminId: "tenant-partners",
      });
      for (const urlPath of ["/api/delivery-partners", "/api/payment-partners"]) {
        const adminList = await requestHttp(HTTP_PORT, {
          method: "GET",
          path: urlPath,
        });
        assert.equal(adminList.status, 401, `${urlPath} admin list must require auth`);

        const mutation = await requestHttp(HTTP_PORT, {
          method: "POST",
          path: urlPath,
          body: { branch: "Unauthorized Partner" },
        });
        assert.equal(mutation.status, 401, `${urlPath} mutation must require auth`);

        const tenantList = await requestHttp(HTTP_PORT, {
          method: "GET",
          path: urlPath,
          headers: { "x-switch-session": seller.token },
        });
        assert.equal(tenantList.status, 200, `${urlPath} signed tenant list must work`);

        const publicOptions = await requestHttp(HTTP_PORT, {
          method: "GET",
          path: `${urlPath}?productOptions=1`,
        });
        assert.equal(publicOptions.status, 200, `${urlPath} product options must remain public`);
        assert.ok(Array.isArray(publicOptions.json?.partners));
      }
    });

    await t.test("CORS never reflects * and blocks non-localhost origins", async () => {
      const blocked = await requestHttp(HTTP_PORT, {
        method: "OPTIONS",
        path: "/api/orders",
        origin: "http://evil.example",
      });
      assert.equal(blocked.status, 403);
      assert.notEqual(blocked.headers["access-control-allow-origin"], "*");

      const allowed = await requestHttp(HTTP_PORT, {
        method: "OPTIONS",
        path: "/api/orders",
        origin: "http://localhost:7357",
      });
      assert.equal(allowed.status, 204);
      assert.equal(allowed.headers["access-control-allow-origin"], "http://localhost:7357");
    });

    await t.test("login lockout returns 429", async () => {
      let last = null;
      for (let i = 0; i < 4; i += 1) {
        last = await requestHttp(HTTP_PORT, {
          method: "POST",
          path: "/api/super-admin-login",
          body: { username: "security-p0-root", password: "wrong-password" },
        });
      }
      assert.equal(last.status, 429);
      assert.equal(last.json?.code, "LOGIN_LOCKED");
    });

    await t.test("AI and visual-search rate limits return 429", async () => {
      const liveAuth = createAppSessionAuth({ APP_SESSION_SECRET: TEST_APP_SECRET });
      const seller = liveAuth.issueSession({
        accountId: "seller-rate",
        email: "seller-rate@example.com",
        role: "seller",
        adminId: "tenant-rate",
      });
      let lastAi = null;
      for (let i = 0; i < 9; i += 1) {
        lastAi = await requestHttp(HTTP_PORT, {
          method: "POST",
          path: "/api/chat-support/thread-rate/ai-reply",
          headers: { "x-switch-session": seller.token },
          body: {},
        });
      }
      assert.equal(lastAi.status, 429);

      let lastSearch = null;
      for (let i = 0; i < 9; i += 1) {
        lastSearch = await requestHttp(HTTP_PORT, {
          method: "POST",
          path: "/api/products/visual-search",
          headers: {
            "content-type": "image/jpeg",
            "x-file-name": "cam.jpg",
            "x-switch-session": seller.token,
          },
          body: Buffer.from("not-an-image"),
        });
      }
      assert.equal(lastSearch.status, 429);
    });

    await t.test("PayMongo webhook rejects unsigned and bad signatures", async () => {
      const rawBody = JSON.stringify({
        data: { type: "event.ping", livemode: false },
      });
      const unsigned = await requestHttp(HTTP_PORT, {
        method: "POST",
        path: "/api/payments/paymongo/seller-webhook",
        headers: { "content-type": "application/json" },
        body: rawBody,
      });
      assert.equal(unsigned.status, 401);

      const bad = await requestHttp(HTTP_PORT, {
        method: "POST",
        path: "/api/payments/paymongo/seller-webhook",
        headers: {
          "content-type": "application/json",
          "paymongo-signature": "t=1,te=deadbeefdeadbeef",
        },
        body: rawBody,
      });
      assert.equal(bad.status, 401);

      const good = await requestHttp(HTTP_PORT, {
        method: "POST",
        path: "/api/payments/paymongo/seller-webhook",
        headers: {
          "content-type": "application/json",
          "paymongo-signature": signPaymongoBody(rawBody, TEST_WEBHOOK_SECRET),
        },
        body: rawBody,
      });
      assert.equal(good.status, 200);
      assert.equal(good.json?.ignored, true);

      const buyerUnsigned = await requestHttp(HTTP_PORT, {
        method: "POST",
        path: "/api/payments/paymongo/buyer-webhook",
        headers: { "content-type": "application/json" },
        body: rawBody,
      });
      assert.equal(buyerUnsigned.status, 401);
    });

    await t.test("unauthenticated confirm-payment returns 401", async () => {
      const res = await requestHttp(HTTP_PORT, {
        method: "POST",
        path: "/api/account/become-seller/confirm-payment",
        body: {
          accountId: "acct-1",
          companyId: "co-1",
          paymentGateway: "paymongo",
          paymentReference: "steal-activation",
        },
      });
      assert.equal(res.status, 401);
    });
  } finally {
    child.kill("SIGTERM");
    await new Promise((resolve) => {
      const timer = setTimeout(resolve, 3000);
      child.on("exit", () => {
        clearTimeout(timer);
        resolve();
      });
    });
  }
});

test("PayMongo webhook without shared secret returns 503", { timeout: 45_000 }, async () => {
  const port = 18124;
  const passwordHash = await bcrypt.hash("UniquePass!23456", 4);
  const env = {
    ...process.env,
    PORT: String(port),
    BIND_HOST: "127.0.0.1",
    REQUIRE_SECRETS: "0",
    SUPER_ADMIN_USERNAME: "security-p0-root",
    SUPER_ADMIN_PASSWORD: passwordHash,
    ADMIN_API_SESSION_SECRET: TEST_ADMIN_SECRET,
    APP_SESSION_SECRET: TEST_APP_SECRET,
    PAYMONGO_WEBHOOK_SECRET: "",
  };
  delete env.DATABASE_URL;
  delete env.PAYMONGO_SECRET_KEY;

  const child = spawn(process.execPath, ["server.js"], {
    cwd: path.join(__dirname, ".."),
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  try {
    await waitForOutput(child, /backend running/i);
    const res = await requestHttp(port, {
      method: "POST",
      path: "/api/payments/paymongo/seller-webhook",
      body: { data: { type: "checkout_session.payment.paid" } },
    });
    assert.equal(res.status, 503);
    assert.equal(res.json?.code, "PAYMONGO_WEBHOOK_SECRET_MISSING");
  } finally {
    child.kill("SIGTERM");
    await new Promise((resolve) => {
      const timer = setTimeout(resolve, 3000);
      child.on("exit", () => {
        clearTimeout(timer);
        resolve();
      });
    });
  }
});
