"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  normalizeEventName,
  normalizeOccurredAt,
  summarizeEvents,
} = require("../services/analyticsApi");

test("analytics event names normalize to stable snake case", () => {
  assert.equal(normalizeEventName("Product Viewed"), "product_viewed");
  assert.equal(normalizeEventName("added-to-cart"), "added_to_cart");
  assert.equal(normalizeEventName("PAYMENT_SUCCEEDED"), "payment_succeeded");
});

test("analytics timestamps accept millisecond epoch values from order records", () => {
  assert.equal(
    normalizeOccurredAt("1789948800000", { trusted: true }),
    "2026-09-21T00:00:00.000Z",
  );
});

test("analytics summary returns funnel conversion, daily, and product totals", () => {
  const events = [
    ["v1", "product_viewed", "buyer-0001", "p1", "2026-09-20T01:00:00.000Z"],
    ["v2", "product_viewed", "buyer-0002", "p1", "2026-09-20T02:00:00.000Z"],
    ["c1", "added_to_cart", "buyer-0001", "p1", "2026-09-20T03:00:00.000Z"],
    ["x1", "checkout_started", "buyer-0001", "p1", "2026-09-20T04:00:00.000Z"],
    ["o1", "order_created", "buyer-0001", "p1", "2026-09-20T05:00:00.000Z"],
  ].map(([id, eventName, accountId, productId, occurredAt]) => ({
    id,
    eventName,
    accountId,
    anonymousId: "",
    sessionId: "",
    productId,
    occurredAt,
  }));

  const summary = summarizeEvents(events, {
    from: "2026-09-20T00:00:00.000Z",
    to: "2026-09-21T00:00:00.000Z",
    days: 1,
  });

  assert.equal(summary.totals.events, 5);
  assert.equal(summary.totals.uniqueActors, 2);
  assert.deepEqual(
    summary.funnel.map((step) => [step.eventName, step.count]),
    [
      ["product_viewed", 2],
      ["added_to_cart", 1],
      ["checkout_started", 1],
      ["order_created", 1],
      ["payment_succeeded", 0],
    ],
  );
  assert.equal(summary.funnel[1].conversionFromStart, 50);
  assert.equal(summary.topProducts[0].productId, "p1");
  assert.equal(summary.topProducts[0].orders, 1);
  assert.equal(summary.daily[0].total, 5);
});
