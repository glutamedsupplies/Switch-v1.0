"use strict";

const bcrypt = require("bcryptjs");

const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 10;

function looksLikeBcryptHash(value) {
  return /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(String(value ?? ""));
}

async function hashPassword(plainPassword) {
  const password = String(plainPassword ?? "");
  if (!password) {
    throw new Error("Password is required.");
  }
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

async function verifyPassword(plainPassword, passwordHashOrLegacy) {
  const password = String(plainPassword ?? "");
  const stored = String(passwordHashOrLegacy ?? "");
  if (!password || !stored) {
    return false;
  }

  if (looksLikeBcryptHash(stored)) {
    return bcrypt.compare(password, stored);
  }

  // Legacy plaintext from accounts.json during migration window.
  return password === stored;
}

module.exports = {
  hashPassword,
  verifyPassword,
  looksLikeBcryptHash,
};
