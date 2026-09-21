"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  hashPassword,
  verifyPassword,
  looksLikeBcryptHash,
} = require("../db/password");
const {
  migrateAccountsPasswords,
} = require("../scripts/migrate-json-passwords-to-bcrypt");

test("plaintext stored passwords are never accepted", async () => {
  assert.equal(await verifyPassword("ExamplePass1!", "ExamplePass1!"), false);
});

test("bcrypt passwords verify successfully", async () => {
  const passwordHash = await hashPassword("ExamplePass1!");

  assert.equal(looksLikeBcryptHash(passwordHash), true);
  assert.equal(await verifyPassword("ExamplePass1!", passwordHash), true);
  assert.equal(await verifyPassword("WrongPass1!", passwordHash), false);
});

test("JSON password migration is dry-run safe and idempotent", async () => {
  const sourceAccounts = [
    { id: "plain", password: "ExamplePass1!" },
    { id: "google", password: "" },
  ];
  const dryRun = await migrateAccountsPasswords(sourceAccounts, { write: false });

  assert.equal(dryRun.changed, 1);
  assert.equal(dryRun.accounts[0].password, "ExamplePass1!");

  const firstRun = await migrateAccountsPasswords(sourceAccounts, { write: true });
  assert.equal(firstRun.changed, 1);
  assert.equal(looksLikeBcryptHash(firstRun.accounts[0].password), true);

  const secondRun = await migrateAccountsPasswords(firstRun.accounts, { write: true });
  assert.equal(secondRun.changed, 0);
  assert.equal(secondRun.accounts[0].password, firstRun.accounts[0].password);
});
