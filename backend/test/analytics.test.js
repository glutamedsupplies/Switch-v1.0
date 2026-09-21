"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  ANALYTICS_EVENT_NAMES,
  MAX_BATCH_EVENTS,
  isAllowedEventName,
  validateEventBatch,
  parseAnalyticsRange,
  computeFunnelFromCounts,
  computeSummaryFromTotals,
  diffOrderLifecycleEvents,
  getAnalyticsSessionPolicy,
  ratio,
  createAnalyticsApi,
} = require("../services/analyticsApi");

test("analytics event allowlist accepts taxonomy names only", () => {
  for (const name of ANALYTICS_EVENT_NAMES) {
    assert.equal(isAllowedEventName(name), true, name);
  }
  assert.equal(isAllowedEventName("PRODUCT_VIEW"), true);
  assert.equal(isAllowedEventName("page_view"), false);
  assert.equal(isAllowedEventName("click"), false);
  assert.equal(isAllowedEventName("payment_success"), false);
  assert.equal(isAllowedEventName("payment_fail"), false);
  assert.equal(isAllowedEventName(""), false);
});

test("ingest validation rejects unknown names, empty batches, and oversized batches", () => {
  const buyer = { userId: "acct-1", adminId: "" };
  const accepted = validateEventBatch(
    {
      events: [
        { eventName: "product_view", productId: "prd-1", adminId: "seller-1" },
        { event_name: "add_to_cart", productId: "prd-1" },
      ],
    },
    buyer,
  );
  assert.equal(accepted.length, 2);
  assert.equal(accepted[0].eventName, "product_view");
  assert.equal(accepted[0].userId, "acct-1");
  assert.equal(accepted[0].productId, "prd-1");

  const single = validateEventBatch({ eventName: "begin_checkout", sessionId: "sess-1" }, buyer);
  assert.equal(single.length, 1);
  assert.equal(single[0].sessionId, "sess-1");

  assert.throws(
    () => validateEventBatch({ eventName: "not_a_real_event" }, buyer),
    (error) => error.code === "ANALYTICS_EVENT_NAME_INVALID" && error.statusCode === 400,
  );
  assert.throws(
    () => validateEventBatch({ events: [] }, buyer),
    (error) => error.code === "ANALYTICS_EVENTS_EMPTY",
  );
  assert.throws(
    () => validateEventBatch({
      events: Array.from({ length: MAX_BATCH_EVENTS + 1 }, () => ({ eventName: "product_view" })),
    }, buyer),
    (error) => error.code === "ANALYTICS_BATCH_TOO_LARGE",
  );
});

test("seller ingest context forces tenant adminId onto events", () => {
  const events = validateEventBatch(
    { eventName: "pack", orderId: "og_1", adminId: "spoofed-tenant" },
    { adminId: "tenant-one", userId: "seller-1" },
  );
  assert.equal(events[0].adminId, "tenant-one");
  assert.equal(events[0].orderId, "og_1");
});

test("funnel math uses order-backed counts when present and computes conversion rates", () => {
  const funnel = computeFunnelFromCounts({
    eventCounts: {
      product_view: 100,
      add_to_cart: 40,
      begin_checkout: 20,
      place_order: 99,
      payment_failed: 3,
    },
    orderCounts: {
      place_order: 10,
      payment_initiated: 9,
      payment_succeeded: 8,
      pack: 6,
      ship: 5,
      cancel: 2,
    },
  });

  assert.equal(funnel.stages[0].eventName, "product_view");
  assert.equal(funnel.stages[0].count, 100);
  assert.equal(funnel.stages[0].source, "events");
  assert.equal(funnel.stages[3].eventName, "place_order");
  assert.equal(funnel.stages[3].count, 10, "orders win over inflated event count");
  assert.equal(funnel.stages[3].source, "orders");
  assert.equal(funnel.stages[4].eventName, "payment_initiated");
  assert.equal(funnel.stages[4].count, 9);
  assert.equal(funnel.stages[5].eventName, "payment_succeeded");
  assert.equal(funnel.stages[5].count, 8);
  assert.equal(funnel.stages[1].conversionFromPrevious, 0.4);
  assert.equal(funnel.stages[3].conversionFromPrevious, 0.5);
  assert.equal(funnel.stages[4].conversionFromPrevious, 0.9);
  assert.equal(funnel.stages[5].conversionFromPrevious, 0.8889);
  assert.equal(funnel.cancel.count, 2);
  assert.equal(funnel.cancel.rate, 0.2);
  assert.equal(funnel.paymentFailed.count, 3);
});

test("funnel falls back to events when no orders exist yet", () => {
  const funnel = computeFunnelFromCounts({
    eventCounts: { product_view: 10, add_to_cart: 5, place_order: 2 },
    orderCounts: {},
  });
  assert.equal(funnel.stages[3].count, 2);
  assert.equal(funnel.stages[3].source, "events");
  assert.equal(funnel.stages[1].conversionFromPrevious, 0.5);
});

test("summary GMV / AOV / cancel rate use paid order totals", () => {
  const summary = computeSummaryFromTotals({
    gmv: 1500.5,
    paidOrderCount: 10,
    placedOrderCount: 12,
    cancelledOrderCount: 3,
  });
  assert.equal(summary.gmv, 1500.5);
  assert.equal(summary.aov, 150.05);
  assert.equal(summary.cancelRate, 0.25);
  assert.equal(computeSummaryFromTotals({ gmv: 0, paidOrderCount: 0 }).aov, 0);
});

test("lifecycle diff emits place_order, payment, pack, ship, and cancel once", () => {
  const created = [
    {
      id: "line-1",
      orderGroupId: "og_1",
      adminId: "tenant-one",
      accountId: "buyer-1",
      productId: "prd-1",
      stage: "toPay",
    },
  ];
  const placed = diffOrderLifecycleEvents([], created);
  assert.deepEqual(
    placed.map((event) => event.eventName),
    ["place_order", "payment_initiated"],
  );

  const paid = diffOrderLifecycleEvents(created, [
    { ...created[0], stage: "toPrepare", paidAt: "2026-09-21T00:00:00.000Z" },
  ]);
  assert.deepEqual(
    paid.map((event) => event.eventName),
    ["payment_succeeded"],
  );

  const packed = diffOrderLifecycleEvents(
    [{ ...created[0], stage: "toPrepare", paidAt: "2026-09-21T00:00:00.000Z" }],
    [{
      ...created[0],
      stage: "toShip",
      paidAt: "2026-09-21T00:00:00.000Z",
      packedAt: "2026-09-21T01:00:00.000Z",
    }],
  );
  assert.deepEqual(
    packed.map((event) => event.eventName),
    ["pack"],
  );

  const cancelled = diffOrderLifecycleEvents(created, [
    { ...created[0], stage: "cancelled", cancelledAt: "2026-09-21T02:00:00.000Z" },
  ]);
  assert.deepEqual(
    cancelled.map((event) => event.eventName),
    ["cancel"],
  );

  const failedPay = diffOrderLifecycleEvents(created, [
    { ...created[0], stage: "toPay", paymentStatus: "failed" },
  ]);
  assert.deepEqual(
    failedPay.map((event) => event.eventName),
    ["payment_failed"],
  );

  const paidAtCreate = diffOrderLifecycleEvents([], [
    { ...created[0], stage: "toPrepare", paidAt: "2026-09-21T00:00:00.000Z" },
  ]);
  assert.deepEqual(
    paidAtCreate.map((event) => event.eventName),
    ["place_order", "payment_initiated", "payment_succeeded"],
  );

  const unchanged = diffOrderLifecycleEvents(created, created);
  assert.equal(unchanged.length, 0);
});

test("analytics session policy is auth-gated by role", () => {
  assert.deepEqual(
    getAnalyticsSessionPolicy("/api/analytics/events", "POST"),
    { roles: ["buyer", "seller", "employee"], identityKind: "auto" },
  );
  assert.deepEqual(
    getAnalyticsSessionPolicy("/api/analytics/funnel", "GET"),
    { roles: ["seller", "employee"], identityKind: "admin" },
  );
  assert.deepEqual(
    getAnalyticsSessionPolicy("/api/analytics/summary", "GET"),
    { roles: ["seller", "employee"], identityKind: "admin" },
  );
  assert.equal(getAnalyticsSessionPolicy("/api/analytics/funnel", "POST"), null);
  assert.equal(getAnalyticsSessionPolicy("/api/orders", "GET"), null);
});

test("analytics router only claims taxonomy paths", async () => {
  const captured = [];
  const api = createAnalyticsApi({
    sendJson(_response, status, body) {
      captured.push({ status, body });
    },
    parseRequestBody: async () => ({}),
    isSuperAdminAuthorized: () => false,
  });
  assert.equal(
    await api.tryHandleAnalyticsRoutes(
      { method: "GET" },
      {},
      new URL("http://127.0.0.1/api/orders"),
    ),
    false,
  );
  assert.equal(
    await api.tryHandleAnalyticsRoutes(
      { method: "GET" },
      {},
      new URL("http://127.0.0.1/api/analytics/events"),
    ),
    true,
  );
  assert.equal(captured[0].status, 405);
});

test("default analytics range is 7 days", () => {
  const now = new Date("2026-09-21T12:00:00.000Z");
  const range = parseAnalyticsRange({}, now);
  assert.equal(range.days, 7);
  assert.equal(range.toIso, now.toISOString());
  assert.equal(
    range.fromIso,
    new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  );

  const custom = parseAnalyticsRange(
    new URLSearchParams("from=2026-09-01T00:00:00.000Z&to=2026-09-11T00:00:00.000Z"),
    now,
  );
  assert.equal(custom.days, 10);

  assert.throws(
    () => parseAnalyticsRange({
      from: "2026-09-21T00:00:00.000Z",
      to: "2026-09-20T00:00:00.000Z",
    }),
    (error) => error.code === "ANALYTICS_RANGE_INVALID",
  );
});

test("ratio helper is zero-safe", () => {
  assert.equal(ratio(1, 4), 0.25);
  assert.equal(ratio(1, 0), 0);
  assert.equal(ratio(2, 3), 0.6667);
});
