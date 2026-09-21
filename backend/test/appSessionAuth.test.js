"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  createAppSessionAuth,
  getRequestSessionToken,
  validateIdentityHints,
} = require("../security/appSessionAuth");

const TEST_SECRET = "test-app-session-secret-with-at-least-32-bytes";

test("strict startup rejects a missing app session secret", () => {
  const auth = createAppSessionAuth({ NODE_ENV: "production" });
  assert.equal(auth.isConfigured(), false);
  assert.throws(auth.assertStartupConfiguration, /APP_SESSION_SECRET/);
});

test("signed tenant sessions verify, expire, and reject forgery", () => {
  let currentTime = Date.UTC(2026, 0, 1, 0, 0, 0);
  const auth = createAppSessionAuth(
    {
      APP_SESSION_SECRET: TEST_SECRET,
      APP_SESSION_TTL_SECONDS: "2",
    },
    { now: () => currentTime },
  );
  const session = auth.issueSession({
    accountId: "seller-account-1",
    email: "seller@example.com",
    role: "seller",
    adminId: "tenant-one",
  });

  assert.equal(auth.verifySession(session.token)?.adminId, "tenant-one");
  const [version, payload, signature] = session.token.split(".");
  const forgedCharacter = signature.startsWith("A") ? "B" : "A";
  assert.equal(
    auth.verifySession(`${version}.${payload}.${forgedCharacter}${signature.slice(1)}`),
    null,
  );

  currentTime += 3_000;
  assert.equal(auth.verifySession(session.token), null);
});

test("session token extraction supports header, bearer, and cookie", () => {
  assert.equal(
    getRequestSessionToken({ headers: { "x-switch-session": "header-token" } }),
    "header-token",
  );
  assert.equal(
    getRequestSessionToken({ headers: { authorization: "Bearer bearer-token" } }),
    "bearer-token",
  );
  assert.equal(
    getRequestSessionToken({ headers: { cookie: "theme=dark; switch_session=cookie-token" } }),
    "cookie-token",
  );
});

test("identity hints reject cross-account and cross-tenant spoofing", () => {
  const session = {
    accountId: "account-one",
    email: "buyer@example.com",
    adminId: "tenant-one",
  };

  assert.deepEqual(
    validateIdentityHints(session, {
      accountId: "account-one",
      email: "BUYER@example.com",
      adminId: "TENANT-ONE",
    }),
    { ok: true, field: "" },
  );
  assert.deepEqual(
    validateIdentityHints(session, { accountId: "account-two" }),
    { ok: false, field: "accountId" },
  );
  assert.deepEqual(
    validateIdentityHints(session, { adminId: "tenant-two" }),
    { ok: false, field: "adminId" },
  );
});
