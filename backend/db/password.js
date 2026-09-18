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

async function hashPasswordForStorage(plainOrHash) {
  const value = String(plainOrHash ?? "");
  if (!value) {
    return "";
  }
  if (looksLikeBcryptHash(value)) {
    return value;
  }
  return hashPassword(value);
}

async function verifyAndRehash(plainPassword, passwordHashOrLegacy) {
  const stored = String(passwordHashOrLegacy ?? "");
  const valid = await verifyPassword(plainPassword, stored);
  if (!valid) {
    return { valid: false, nextHash: stored, rehashed: false };
  }
  if (looksLikeBcryptHash(stored)) {
    return { valid: true, nextHash: stored, rehashed: false };
  }
  return {
    valid: true,
    nextHash: await hashPassword(plainPassword),
    rehashed: true,
  };
}

module.exports = {
  hashPassword,
  verifyPassword,
  looksLikeBcryptHash,
  hashPasswordForStorage,
  verifyAndRehash,
};
