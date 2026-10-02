"use strict";

const RISK = Object.freeze({ LOW: "low", MEDIUM: "medium", HIGH: "high" });

function money(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.round(number * 100) / 100;
}

function peso(value) {
  const amount = money(value);
  const hasCents = Math.abs(amount % 1) > 0.001;
  return `₱${amount.toLocaleString("en-PH", {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

function cleanText(value, max = 500) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function toInt(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : fallback;
}

function toolError(message, { status = 400, code = "AI_TOOL_ERROR", extras = {} } = {}) {
  const error = new Error(message);
  error.statusCode = status;
  error.code = code;
  error.toolError = true;
  Object.assign(error, extras);
  return error;
}

function ok({
  message = "",
  blocks = [],
  data = null,
  suggestions = null,
  entity = null,
  events = [],
  clientEffects = null,
} = {}) {
  return { ok: true, message, blocks: blocks.filter(Boolean), data, suggestions, entity, events, clientEffects };
}

function toolAction(label, tool, args = {}, style = "secondary") {
  return { label, kind: "tool", tool, args, style };
}

function promptAction(label, text, style = "secondary") {
  return { label, kind: "prompt", text: text || label, style };
}

function notice(text, tone = "info") {
  return { type: "notice", tone, text };
}

/**
 * Calls an existing backend route through the internal dispatcher so the
 * route's own auth, tenant scope, validation and notifications apply.
 * Non-2xx responses surface the backend's real message to the user.
 */
async function callApi(ctx, method, path, { query = null, body = undefined, allowStatuses = [] } = {}) {
  const result = await ctx.dispatch({ method, path, query, body });
  const status = Number(result?.status) || 500;
  if ((status >= 200 && status < 300) || allowStatuses.includes(status)) {
    return result.body ?? {};
  }
  const message =
    cleanText(result?.body?.message || result?.body?.error, 400) ||
    `The request failed (${status}).`;
  throw toolError(message, {
    status,
    code: cleanText(result?.body?.code, 80) || "AI_BACKEND_ERROR",
    extras: { backendBody: result?.body || null },
  });
}

function dayBounds(offsetDays = 0, nowMs = Date.now(), timeZone = "Asia/Manila") {
  const now = new Date(nowMs);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type) => Number(parts.find((part) => part.type === type)?.value);
  const utcMidnight = Date.UTC(get("year"), get("month") - 1, get("day"));
  const tzOffsetMs = zoneOffsetMs(timeZone, now);
  const start = utcMidnight - tzOffsetMs + offsetDays * 86400000;
  return { start, end: start + 86400000 };
}

function zoneOffsetMs(timeZone, date) {
  const local = new Date(date.toLocaleString("en-US", { timeZone }));
  const utc = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  return local.getTime() - utc.getTime();
}

function formatDateTime(ms, timeZone = "Asia/Manila") {
  if (!Number.isFinite(Number(ms)) || Number(ms) <= 0) return "";
  return new Intl.DateTimeFormat("en-PH", {
    timeZone,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(Number(ms)));
}

function percentChange(current, previous) {
  const a = Number(current) || 0;
  const b = Number(previous) || 0;
  if (b <= 0) return a > 0 ? null : 0;
  return Math.round(((a - b) / b) * 1000) / 10;
}

module.exports = {
  RISK,
  money,
  peso,
  cleanText,
  toInt,
  toolError,
  ok,
  toolAction,
  promptAction,
  notice,
  callApi,
  dayBounds,
  zoneOffsetMs,
  formatDateTime,
  percentChange,
};
