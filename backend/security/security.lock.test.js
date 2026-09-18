"use strict";

const assert = require("assert");
const http = require("http");
const path = require("path");
const { spawn } = require("child_process");
const {
  assertSecurityConfig,
  collectMissingSecurityEnv,
  createSessionToken,
  verifySessionToken,
  attachRequestAuth,
  applyCorsHeaders,
  resolveAllowedOrigin,
  createLoginRateLimiter,
  evaluateTenantScope,
  requireSignedSession,
  isUploadApiPath,
} = require("./index");
const {
  hashPassword,
  verifyPassword,
  verifyAndRehash,
  looksLikeBcryptHash,
} = require("../db/password");

let failed = 0;
function test(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      console.log(`ok  ${name}`);
    })
    .catch((error) => {
      failed += 1;
      console.error(`not ok  ${name}`);
      console.error(error);
    });
}

function mockResponse() {
  const headers = {};
  return {
    headers,
    setHeader(key, value) {
      headers[String(key).toLowerCase()] = value;
    },
    getHeader(key) {
      return headers[String(key).toLowerCase()];
    },
  };
}

async function runUnitTests() {
  await test("fails closed when super-admin env is missing", () => {
    const missing = collectMissingSecurityEnv({});
    assert.deepStrictEqual(missing, [
      "SUPER_ADMIN_USERNAME",
      "SUPER_ADMIN_PASSWORD",
      "ADMIN_API_SESSION_SECRET",
    ]);
    assert.throws(
      () => assertSecurityConfig({}),
      (error) => error.code === "SECURITY_CONFIG_MISSING",
    );
  });

  await test("rejects hardcoded Root@12345 default password", () => {
    assert.throws(
      () =>
        assertSecurityConfig({
          SUPER_ADMIN_USERNAME: "ops",
          SUPER_ADMIN_PASSWORD: "Root@12345",
          ADMIN_API_SESSION_SECRET: "0123456789abcdef",
        }),
      (error) => error.code === "SECURITY_CONFIG_INSECURE_DEFAULTS",
    );
  });

  await test("accepts required env without hardcoded defaults", () => {
    const config = assertSecurityConfig({
      SUPER_ADMIN_USERNAME: "switch-root",
      SUPER_ADMIN_PASSWORD: "UniquePass!23456",
      ADMIN_API_SESSION_SECRET: "0123456789abcdef",
      CORS_ALLOWED_ORIGINS: "http://127.0.0.1:8080, https://admin.example",
    });
    assert.strictEqual(config.superAdminUsername, "switch-root");
    assert.deepStrictEqual(config.corsAllowedOrigins, [
      "http://127.0.0.1:8080",
      "https://admin.example",
    ]);
  });

  await test("signed session verifies and rejects spoofed tokens", () => {
    const secret = "session-secret-value";
    const token = createSessionToken(
      { role: "admin", adminId: "admin-1", accountId: "admin-1" },
      { secret, ttlSeconds: 3600 },
    );
    const session = verifySessionToken(token, secret);
    assert.strictEqual(session.role, "admin");
    assert.strictEqual(session.adminId, "admin-1");
    assert.strictEqual(verifySessionToken(token, "other-secret-value"), null);
    assert.strictEqual(verifySessionToken("not-a-token", secret), null);
  });

  await test("tenant spoof without session is 401", () => {
    const request = {
      headers: { "x-gms-admin-id": "admin-victim" },
      url: "/api/orders",
    };
    const result = evaluateTenantScope(request, new URL("http://127.0.0.1/api/orders"));
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.statusCode, 401);
  });

  await test("tenant spoof with other admin session is 403", () => {
    const request = {
      gmsAuth: { role: "admin", adminId: "admin-own" },
      headers: { "x-gms-admin-id": "admin-victim" },
      url: "/api/orders",
    };
    const result = evaluateTenantScope(request, new URL("http://127.0.0.1/api/orders"));
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.statusCode, 403);
  });

  await test("matching signed session allows tenant scope", () => {
    const request = {
      gmsAuth: { role: "admin", adminId: "admin-1" },
      headers: { "x-gms-admin-id": "admin-1" },
      url: "/api/orders",
    };
    const result = evaluateTenantScope(request, new URL("http://127.0.0.1/api/orders"));
    assert.strictEqual(result.ok, true);
  });

  await test("upload paths require auth helper", () => {
    assert.strictEqual(isUploadApiPath("/api/uploads"), true);
    const denied = requireSignedSession(null);
    assert.strictEqual(denied.ok, false);
    assert.strictEqual(denied.statusCode, 401);
  });

  await test("CORS does not allow * and only reflects allowlisted origins", () => {
    assert.strictEqual(resolveAllowedOrigin("http://evil.example", ["http://127.0.0.1:8080"]), "");
    const response = mockResponse();
    applyCorsHeaders(
      response,
      { headers: { origin: "http://evil.example" } },
      ["http://127.0.0.1:8080"],
    );
    assert.notStrictEqual(response.headers["access-control-allow-origin"], "*");
    assert.strictEqual(response.headers["access-control-allow-origin"], undefined);

    const allowed = mockResponse();
    applyCorsHeaders(
      allowed,
      { headers: { origin: "http://127.0.0.1:8080" } },
      ["http://127.0.0.1:8080"],
    );
    assert.strictEqual(allowed.headers["access-control-allow-origin"], "http://127.0.0.1:8080");
  });

  await test("login rate limit is per IP + identifier", () => {
    const limiter = createLoginRateLimiter({ maxAttempts: 3, windowMs: 60_000 });
    assert.strictEqual(limiter.consumeLogin({ ip: "1.1.1.1", identifier: "a@x.com" }).ok, true);
    assert.strictEqual(limiter.consumeLogin({ ip: "1.1.1.1", identifier: "a@x.com" }).ok, true);
    assert.strictEqual(limiter.consumeLogin({ ip: "1.1.1.1", identifier: "a@x.com" }).ok, true);
    assert.strictEqual(limiter.consumeLogin({ ip: "1.1.1.1", identifier: "a@x.com" }).ok, false);
    assert.strictEqual(limiter.consumeLogin({ ip: "1.1.1.1", identifier: "b@x.com" }).ok, true);
    assert.strictEqual(limiter.consumeLogin({ ip: "9.9.9.9", identifier: "a@x.com" }).ok, true);
  });

  await test("bcrypt verify re-hashes legacy plaintext", async () => {
    const hashed = await hashPassword("CorrectHorse1");
    assert.strictEqual(looksLikeBcryptHash(hashed), true);
    assert.strictEqual(await verifyPassword("CorrectHorse1", hashed), true);
    assert.strictEqual(await verifyPassword("CorrectHorse1", "CorrectHorse1"), true);
    const migrated = await verifyAndRehash("CorrectHorse1", "CorrectHorse1");
    assert.strictEqual(migrated.valid, true);
    assert.strictEqual(migrated.rehashed, true);
    assert.strictEqual(looksLikeBcryptHash(migrated.nextHash), true);
    assert.strictEqual(await verifyPassword("CorrectHorse1", migrated.nextHash), true);
  });

  await test("attachRequestAuth reads bearer and cookie", () => {
    const secret = "attach-secret-value";
    const token = createSessionToken(
      { role: "buyer", accountId: "user-1", email: "a@x.com" },
      { secret, ttlSeconds: 3600 },
    );
    const bearerRequest = { headers: { authorization: `Bearer ${token}` } };
    assert.strictEqual(attachRequestAuth(bearerRequest, secret).role, "buyer");
    const cookieRequest = { headers: { cookie: `gms_session=${encodeURIComponent(token)}` } };
    assert.strictEqual(attachRequestAuth(cookieRequest, secret).accountId, "user-1");
  });
}

function requestJson(port, { method, path: urlPath, headers = {}, body = null, origin = "" }) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        method,
        path: urlPath,
        headers: {
          ...(body ? { "content-type": "application/json" } : {}),
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
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

function waitForOutput(child, pattern, timeoutMs = 20_000) {
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

async function runHttpTests() {
  const port = 18080;
  const env = {
    ...process.env,
    PORT: String(port),
    SUPER_ADMIN_USERNAME: "switch-root",
    SUPER_ADMIN_PASSWORD: "UniquePass!23456",
    ADMIN_API_SESSION_SECRET: "integration-session-secret",
    CORS_ALLOWED_ORIGINS: "http://127.0.0.1:18080",
    DATABASE_URL: "",
  };

  await test("server exits when required secrets are missing", async () => {
    const child = spawn(process.execPath, ["server.js"], {
      cwd: path.join(__dirname, ".."),
      env: {
        ...process.env,
        PORT: "18081",
        SUPER_ADMIN_USERNAME: "",
        SUPER_ADMIN_PASSWORD: "",
        ADMIN_API_SESSION_SECRET: "",
        DATABASE_URL: "",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    const output = await new Promise((resolve) => {
      let combined = "";
      child.stderr.on("data", (chunk) => {
        combined += String(chunk);
      });
      child.stdout.on("data", (chunk) => {
        combined += String(chunk);
      });
      child.on("exit", (code) => resolve({ code, combined }));
    });
    assert.notStrictEqual(output.code, 0);
    assert.match(output.combined, /Missing required environment variables/);
    assert.doesNotMatch(output.combined, /Root@12345/);
  });

  const child = spawn(process.execPath, ["server.js"], {
    cwd: path.join(__dirname, ".."),
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  try {
    await waitForOutput(child, /backend running/i);

    await test("spoofed x-gms-admin-id without session is 401", async () => {
      const res = await requestJson(port, {
        method: "GET",
        path: "/api/orders",
        headers: { "x-gms-admin-id": "admin-victim" },
      });
      assert.ok(res.status === 401 || res.status === 403, `expected 401/403, got ${res.status}`);
    });

    await test("upload without auth is 401", async () => {
      const res = await requestJson(port, {
        method: "POST",
        path: "/api/uploads",
        headers: { "content-type": "image/png", "x-file-name": "x.png" },
      });
      assert.strictEqual(res.status, 401);
    });

    await test("CORS is allowlisted and never *", async () => {
      const blocked = await requestJson(port, {
        method: "OPTIONS",
        path: "/api/orders",
        origin: "http://evil.example",
      });
      assert.notStrictEqual(blocked.headers["access-control-allow-origin"], "*");
      const allowed = await requestJson(port, {
        method: "OPTIONS",
        path: "/api/orders",
        origin: "http://127.0.0.1:18080",
      });
      assert.strictEqual(allowed.headers["access-control-allow-origin"], "http://127.0.0.1:18080");
    });

    await test("super-admin login hashes, issues session, omits password fields", async () => {
      const res = await requestJson(port, {
        method: "POST",
        path: "/api/super-admin-login",
        body: { username: "switch-root", password: "UniquePass!23456" },
      });
      assert.strictEqual(res.status, 200, res.raw);
      assert.ok(res.json.token);
      assert.ok(res.json.sessionToken);
      assert.ok(String(res.headers["set-cookie"] || "").includes("gms_session="));
      assert.strictEqual(res.json.root?.password, undefined);
      const spoofWithOtherSession = await requestJson(port, {
        method: "GET",
        path: "/api/orders",
        headers: {
          "x-gms-admin-id": "admin-victim",
          "x-gms-session-token": res.json.sessionToken,
        },
      });
      assert.notStrictEqual(spoofWithOtherSession.status, 401);
    });

    await test("login rate limit returns 429", async () => {
      let last = null;
      for (let i = 0; i < 12; i += 1) {
        last = await requestJson(port, {
          method: "POST",
          path: "/api/super-admin-login",
          body: { username: "switch-root", password: "wrong-password" },
        });
      }
      assert.strictEqual(last.status, 429);
    });
  } finally {
    child.kill("SIGTERM");
    await new Promise((resolve) => child.on("exit", resolve));
  }
}

(async () => {
  await runUnitTests();
  await runHttpTests();
  if (failed) {
    console.error(`\n${failed} test(s) failed`);
    process.exit(1);
  }
  console.log("\nAll security lock tests passed.");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
