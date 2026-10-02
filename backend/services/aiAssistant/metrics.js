"use strict";

const TRACKED_EVENTS = Object.freeze([
  "chat_request",
  "chat_error",
  "llm_request",
  "llm_error",
  "tool_success",
  "tool_failure",
  "product_search",
  "search_result_click",
  "ai_add_to_cart",
  "ai_checkout_start",
  "ai_order_placed",
  "ai_payment_started",
  "seller_draft_created",
  "seller_promotion_created",
  "seller_inventory_action",
  "rider_assist",
  "rider_issue_report",
  "rate_limited",
]);

/** In-process counters and latency for assistant observability (no model reasoning is recorded). */
function createAssistantMetrics({ now = () => Date.now() } = {}) {
  const startedAt = now();
  const counters = new Map();
  const tools = new Map();
  const latency = { count: 0, totalMs: 0, maxMs: 0 };

  function key(event, role) {
    return `${role || "all"}:${event}`;
  }

  function increment(event, role = "", by = 1) {
    counters.set(key(event, role), (counters.get(key(event, role)) || 0) + by);
    if (role) counters.set(key(event, ""), (counters.get(key(event, "")) || 0) + by);
  }

  function recordTool(tool, ok, ms) {
    const entry = tools.get(tool) || { success: 0, failure: 0, totalMs: 0 };
    if (ok) entry.success += 1;
    else entry.failure += 1;
    entry.totalMs += Math.max(0, Number(ms) || 0);
    tools.set(tool, entry);
  }

  function recordLatency(ms) {
    const value = Math.max(0, Number(ms) || 0);
    latency.count += 1;
    latency.totalMs += value;
    latency.maxMs = Math.max(latency.maxMs, value);
  }

  function snapshot() {
    const byRole = {};
    for (const [compound, value] of counters) {
      const [role, event] = compound.split(":");
      byRole[role] = byRole[role] || {};
      byRole[role][event] = value;
    }
    return {
      since: new Date(startedAt).toISOString(),
      events: byRole,
      tools: Object.fromEntries(
        [...tools].map(([name, entry]) => [
          name,
          {
            success: entry.success,
            failure: entry.failure,
            avgMs: Math.round(entry.totalMs / Math.max(1, entry.success + entry.failure)),
          },
        ]),
      ),
      latency: {
        requests: latency.count,
        avgMs: Math.round(latency.totalMs / Math.max(1, latency.count)),
        maxMs: Math.round(latency.maxMs),
      },
    };
  }

  return { increment, recordTool, recordLatency, snapshot, TRACKED_EVENTS };
}

module.exports = { createAssistantMetrics, TRACKED_EVENTS };
