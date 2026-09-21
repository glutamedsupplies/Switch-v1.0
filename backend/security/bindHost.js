"use strict";

function resolveBindHost(env = process.env) {
  const value = String(env.BIND_HOST ?? "127.0.0.1").trim();
  return value || "127.0.0.1";
}

function isWildcardBind(host) {
  const normalized = String(host ?? "").trim();
  return normalized === "0.0.0.0" || normalized === "::" || normalized === "*";
}

function isLoopbackBind(host) {
  const normalized = String(host ?? "").trim().toLowerCase();
  return (
    normalized === "127.0.0.1"
    || normalized === "localhost"
    || normalized === "::1"
    || normalized === "[::1]"
  );
}

module.exports = {
  resolveBindHost,
  isWildcardBind,
  isLoopbackBind,
};
