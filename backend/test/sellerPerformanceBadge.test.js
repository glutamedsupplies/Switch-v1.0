"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  evaluateSellerPerformanceBadge,
  buildSellerPerformanceMetrics,
} = require("../services/sellerPerformanceBadge");

test("preferred badge needs completed volume, rating, and chats", () => {
  assert.equal(
    evaluateSellerPerformanceBadge({
      rating: 4.9,
      reviews: 2,
      orders: 3,
      chats: 1,
    }).earned,
    false,
  );
  assert.equal(
    evaluateSellerPerformanceBadge({
      rating: 4.8,
      reviews: 20,
      orders: 40,
      chats: 12,
    }).earned,
    true,
  );
});

test("preferred badge uses first-reply hours when enough timed chats exist", () => {
  const slow = evaluateSellerPerformanceBadge({
    rating: 4.9,
    reviews: 20,
    completedOrders: 40,
    chats: 20,
    timedReplies: 8,
    avgFirstResponseHours: 9,
  });
  assert.equal(slow.earned, false);
  assert.ok(slow.missing.includes("Fast client response"));

  const fast = evaluateSellerPerformanceBadge({
    rating: 4.9,
    reviews: 20,
    completedOrders: 40,
    chats: 20,
    timedReplies: 8,
    avgFirstResponseHours: 1.2,
  });
  assert.equal(fast.earned, true);
});

test("high cancel rate or stale concerns block the preferred badge", () => {
  const cancelHeavy = evaluateSellerPerformanceBadge({
    rating: 4.9,
    reviews: 20,
    completedOrders: 40,
    chats: 12,
    cancelRate: 0.45,
  });
  assert.equal(cancelHeavy.earned, false);
  assert.ok(cancelHeavy.missing.includes("Strong shop performance"));

  const stale = evaluateSellerPerformanceBadge({
    rating: 4.9,
    reviews: 20,
    completedOrders: 40,
    chats: 12,
    openStaleConcerns: 1,
  });
  assert.equal(stale.earned, false);
  assert.ok(stale.missing.includes("Fast problem resolution"));
});

test("banned or heavily reported shops cannot keep the preferred badge", () => {
  const banned = evaluateSellerPerformanceBadge({
    rating: 4.9,
    reviews: 20,
    completedOrders: 40,
    chats: 12,
    accountState: "banned",
  });
  assert.equal(banned.earned, false);
  assert.ok(banned.missing.includes("Clean buyer trust"));

  const reported = evaluateSellerPerformanceBadge({
    rating: 4.9,
    reviews: 20,
    completedOrders: 40,
    chats: 12,
    reportSummary: { openCount: 4, needsWarning: true },
  });
  assert.equal(reported.earned, false);
  assert.ok(reported.missing.includes("Clean buyer trust"));
});

test("metrics builder times first replies and completed orders", () => {
  const buyerAt = "2026-09-23T01:00:00.000Z";
  const sellerAt = "2026-09-23T02:30:00.000Z";
  const metrics = buildSellerPerformanceMetrics({
    orders: [
      { stage: "received", customerReceivedAtEpochMs: Date.parse("2026-09-20T00:00:00.000Z") },
      { stage: "packing" },
      {
        stage: "cancelled",
        cancelRequestSubmittedAtEpochMs: Date.parse("2026-09-21T00:00:00.000Z"),
        cancelRequestResolvedAtEpochMs: Date.parse("2026-09-21T10:00:00.000Z"),
      },
    ],
    chatThreads: [
      {
        messages: [
          { text: "help", isFromSupport: false, timestamp: buyerAt },
          { text: "on it", isFromSupport: true, senderRole: "seller", timestamp: sellerAt },
        ],
      },
    ],
  });
  assert.equal(metrics.completedOrders, 1);
  assert.equal(metrics.cancelledOrders, 1);
  assert.equal(metrics.cancelRate, 0.5);
  assert.equal(metrics.timedReplies, 1);
  assert.equal(metrics.avgFirstResponseHours, 1.5);
  assert.equal(metrics.resolvedConcerns, 1);
  assert.equal(metrics.avgResolutionHours, 10);
});
