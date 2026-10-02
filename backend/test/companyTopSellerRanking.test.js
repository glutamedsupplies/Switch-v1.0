"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  COMPANY_TOP_SELLER_RULES,
  getCompanyTopSellerEvaluation,
  scoreCompanyTopSeller,
  scoreStoreTypeRankingItem,
  compareCompanyTopSellerRows,
} = require("../services/companyTopSellerRanking");

const DAY_MS = 24 * 60 * 60 * 1000;
const now = Date.parse("2026-09-26T00:00:00.000Z");

test("new companies stay in the 3-month evaluation window", () => {
  const createdAt = new Date(now - 20 * DAY_MS).toISOString();
  const evaluation = getCompanyTopSellerEvaluation({ createdAt }, now);
  const early = scoreCompanyTopSeller({
    createdAt,
    rating: 4.9,
    reviews: 18,
    completedOrders: 16,
    unitsSold: 22,
    chats: 10,
    timedReplies: 8,
    avgFirstResponseHours: 1,
  }, now);
  assert.equal(evaluation.eligible, false);
  assert.equal(evaluation.evaluating, true);
  assert.equal(evaluation.daysRemaining, 70);
  assert.equal(early.eligible, false);
  assert.equal(early.evaluating, true);
  assert.ok(early.score > 0);
  assert.equal(early.earlyScore, early.score);
});

test("one strong review cannot look like a finished top seller", () => {
  const createdAt = new Date(now - 10 * DAY_MS).toISOString();
  const thin = scoreCompanyTopSeller({
    createdAt,
    rating: 5,
    reviews: 1,
    completedOrders: 1,
    unitsSold: 1,
    productCount: 1,
  }, now);
  assert.equal(thin.evaluating, true);
  assert.equal(thin.eligible, false);
  assert.ok(thin.score < 20);
  assert.ok(thin.breakdown.rating < 6);
});

test("early calculation carries into the official score after 3 months", () => {
  const metrics = {
    rating: 4.8,
    reviews: 20,
    completedOrders: 22,
    unitsSold: 30,
    cancelRate: 0.04,
    chats: 12,
    timedReplies: 8,
    avgFirstResponseHours: 1.1,
  };
  const during = scoreCompanyTopSeller({
    ...metrics,
    createdAt: new Date(now - 40 * DAY_MS).toISOString(),
  }, now);
  const after = scoreCompanyTopSeller({
    ...metrics,
    createdAt: new Date(now - 200 * DAY_MS).toISOString(),
  }, now);
  assert.equal(during.eligible, false);
  assert.equal(after.eligible, true);
  assert.equal(during.score, after.score);
});

test("ranking starts only after the evaluation window ends", () => {
  const createdAt = new Date(now - COMPANY_TOP_SELLER_RULES.evaluationDays * DAY_MS).toISOString();
  const evaluation = getCompanyTopSellerEvaluation({ createdAt }, now);
  assert.equal(evaluation.eligible, true);
  assert.equal(evaluation.evaluating, false);
  assert.equal(evaluation.daysRemaining, 0);
});

test("missing join date cannot become a top seller", () => {
  const result = scoreCompanyTopSeller({ rating: 5, reviews: 80 }, now);
  assert.equal(result.eligible, false);
  assert.equal(result.evaluating, true);
  assert.ok(result.score > 0);
});

test("banned companies stay out of top seller ranking", () => {
  const createdAt = new Date(now - 200 * DAY_MS).toISOString();
  const result = scoreCompanyTopSeller({
    createdAt,
    accountState: "banned",
    rating: 5,
    reviews: 80,
  }, now);
  assert.equal(result.eligible, false);
  assert.equal(result.blocked, true);
  assert.equal(result.score, 0);
});

test("well-run shops beat high-volume shops with weak service", () => {
  const createdAt = new Date(now - 200 * DAY_MS).toISOString();
  const qualityShop = scoreCompanyTopSeller({
    createdAt,
    rating: 4.9,
    reviews: 24,
    completedOrders: 18,
    unitsSold: 40,
    cancelRate: 0.05,
    chats: 16,
    timedReplies: 12,
    avgFirstResponseHours: 0.8,
  }, now);
  const volumeShop = scoreCompanyTopSeller({
    createdAt,
    rating: 3.2,
    reviews: 4,
    completedOrders: 120,
    unitsSold: 800,
    cancelRate: 0.28,
    chats: 30,
    timedReplies: 10,
    avgFirstResponseHours: 9,
  }, now);
  assert.equal(qualityShop.eligible, true);
  assert.ok(qualityShop.score > volumeShop.score);
  assert.ok(qualityShop.breakdown.response > volumeShop.breakdown.response);
  assert.ok(qualityShop.breakdown.rating > volumeShop.breakdown.rating);
});

test("listing count is not required for a strong score", () => {
  const createdAt = new Date(now - 200 * DAY_MS).toISOString();
  const fewListings = scoreCompanyTopSeller({
    createdAt,
    rating: 4.8,
    reviews: 20,
    completedOrders: 22,
    unitsSold: 30,
    cancelRate: 0.04,
    chats: 12,
    timedReplies: 8,
    avgFirstResponseHours: 1.1,
    productCount: 3,
  }, now);
  assert.equal(fewListings.eligible, true);
  assert.ok(fewListings.score >= 70);
});

test("compare helper prefers higher quality score", () => {
  const ranked = [
    { companyName: "Beta", score: 71, rating: 4.2, reviewCount: 10 },
    { companyName: "Alpha", score: 88, rating: 4.9, reviewCount: 20 },
  ].sort(compareCompanyTopSellerRows);
  assert.equal(ranked[0].companyName, "Alpha");
});

test("item ranking uses a 100-point calculation", () => {
  const thin = scoreStoreTypeRankingItem({
    unitsSold: 1,
    income: 100,
    rating: 5,
    ratingCount: 1,
  });
  const strong = scoreStoreTypeRankingItem({
    unitsSold: 80,
    income: 24000,
    rating: 4.8,
    ratingCount: 30,
  });
  assert.ok(thin.score < 25);
  assert.ok(strong.score > thin.score);
  assert.ok(strong.score <= 100);
  assert.ok(strong.breakdown.sold > thin.breakdown.sold);
});
