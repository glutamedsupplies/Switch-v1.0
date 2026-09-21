"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const bcrypt = require("bcryptjs");
const { createSuperAdminAuth } = require("../security/superAdminAuth");

test("production startup rejects missing super-admin secrets", () => {
  const auth = createSuperAdminAuth({ NODE_ENV: "production" });

  assert.equal(auth.isConfigured(), false);
  assert.throws(
    () => auth.assertStartupConfiguration(),
    /SUPER_ADMIN_USERNAME, SUPER_ADMIN_PASSWORD, ADMIN_API_SESSION_SECRET/,
  );
});

test("REQUIRE_SECRETS enforces configuration outside production", () => {
  const auth = createSuperAdminAuth({ REQUIRE_SECRETS: "1" });

  assert.throws(() => auth.assertStartupConfiguration(), /Missing required/);
});

test("login verifies bcrypt credentials and rejects the legacy default", async () => {
  const expectedPassword = "test-only-password-8f4e";
  const passwordHash = await bcrypt.hash(expectedPassword, 4);
  const legacyDefaultPassword = ["Root@", "12345"].join("");
  const auth = createSuperAdminAuth({
    SUPER_ADMIN_USERNAME: "security-test-admin",
    SUPER_ADMIN_PASSWORD: passwordHash,
    ADMIN_API_SESSION_SECRET: "test-session-secret-with-at-least-32-bytes",
  });
  assert.equal(
    await auth.verifyCredentials("security-test-admin", expectedPassword),
    true,
  );
  assert.equal(
    await auth.verifyCredentials("security-test-admin", legacyDefaultPassword),
    false,
  );

  const legacyHashAuth = createSuperAdminAuth({
    SUPER_ADMIN_USERNAME: "root",
    SUPER_ADMIN_PASSWORD: await bcrypt.hash(legacyDefaultPassword, 4),
    ADMIN_API_SESSION_SECRET: "test-session-secret-with-at-least-32-bytes",
  });
  assert.equal(
    await legacyHashAuth.verifyCredentials("root", legacyDefaultPassword),
    false,
  );
});

test("strict startup rejects explicitly configured legacy defaults", () => {
  const auth = createSuperAdminAuth({
    NODE_ENV: "production",
    SUPER_ADMIN_USERNAME: "root",
    SUPER_ADMIN_PASSWORD: ["Root@", "12345"].join(""),
    ADMIN_API_SESSION_SECRET: "test-session-secret-with-at-least-32-bytes",
  });

  assert.equal(auth.isConfigured(), false);
  assert.throws(auth.assertStartupConfiguration, /retired default/);
});

test("strict startup rejects plaintext super-admin passwords", () => {
  const auth = createSuperAdminAuth({
    NODE_ENV: "production",
    SUPER_ADMIN_USERNAME: "security-test-admin",
    SUPER_ADMIN_PASSWORD: "test-only-password-8f4e",
    ADMIN_API_SESSION_SECRET: "test-session-secret-with-at-least-32-bytes",
  });

  assert.equal(auth.isConfigured(), false);
  assert.throws(auth.assertStartupConfiguration, /bcrypt hash/);
});

test("signed sessions are random, reject forgery, and expire", async () => {
  let currentTime = Date.UTC(2026, 0, 1, 0, 0, 0);
  const auth = createSuperAdminAuth(
    {
      SUPER_ADMIN_USERNAME: "security-test-admin",
      SUPER_ADMIN_PASSWORD: await bcrypt.hash("test-only-password-8f4e", 4),
      ADMIN_API_SESSION_SECRET: "test-session-secret-with-at-least-32-bytes",
      SUPER_ADMIN_SESSION_TTL_SECONDS: "2",
    },
    { now: () => currentTime },
  );

  const firstSession = auth.issueSession();
  const secondSession = auth.issueSession();
  assert.notEqual(firstSession.token, secondSession.token);
  assert.equal(auth.verifySession(firstSession.token)?.role, "super-admin");

  const [version, payload, signature] = firstSession.token.split(".");
  const forgedFirstCharacter = signature.startsWith("A") ? "B" : "A";
  const forgedToken = `${version}.${payload}.${forgedFirstCharacter}${signature.slice(1)}`;
  assert.equal(auth.verifySession(forgedToken), null);

  currentTime += 3_000;
  assert.equal(auth.verifySession(firstSession.token), null);
});
