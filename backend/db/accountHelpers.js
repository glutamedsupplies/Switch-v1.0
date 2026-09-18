"use strict";

function normalizeEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizePhone(value) {
  return String(value ?? "").replace(/\D/g, "").trim();
}

function toIso(value) {
  if (value == null || value === "") {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function coerceAccountStatus(value) {
  const status = String(value ?? "active").trim().toLowerCase();
  const allowed = new Set([
    "active",
    "inactive",
    "pending",
    "on_leave",
    "probation",
    "restricted",
    "banned",
    "suspended",
    "locked",
    "deactivated",
    "deleted",
  ]);
  if (status === "on-leave") {
    return "on_leave";
  }
  return allowed.has(status) ? status : "active";
}

function stripInternalFields(account) {
  if (!account) {
    return null;
  }
  const { _passwordHash, ...safe } = account;
  return safe;
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

module.exports = {
  normalizeEmail,
  normalizePhone,
  toIso,
  coerceAccountStatus,
  stripInternalFields,
  asObject,
};
