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

async function verifyPassword(plainPassword, passwordHash) {
  const password = String(plainPassword ?? "");
  const stored = String(passwordHash ?? "");
  if (!password || !looksLikeBcryptHash(stored)) {
    return false;
  }

  return bcrypt.compare(password, stored);
}

module.exports = {
  hashPassword,
  verifyPassword,
  looksLikeBcryptHash,
};
