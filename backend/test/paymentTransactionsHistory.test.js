"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { buildPaymentPartnerTransactions } = require("../services/paymentTransactionsHistory");

function line(overrides = {}) {
  return {
    id: "o1",
    adminId: "seller-a",
    accountId: "buyer-1",
    productName: "Mug",
    quantity: 1,
    unitPrice: 250,
    grandTotalAmount: 300,
    amountToPayAmount: 0,
    stage: "toPrepare",
    paymentStatus: "paid",
    paymentPartnerName: "GCash",
    orderGroupId: "og_1",
    createdAtEpochMs: 1_000,
    clientName: "Ana",
    ...overrides,
  };
}

test("groups line items into one checkout without multiplying the group total", () => {
  const { transactions, summary } = buildPaymentPartnerTransactions({
    partner: { id: "p1", branch: "GCash" },
    orders: [line(), line({ id: "o2", productName: "Plate", quantity: 2 })],
    companyNames: new Map([["seller-a", "Shop A"]]),
  });
  assert.equal(transactions.length, 1);
  assert.equal(transactions[0].amount, 300);
  assert.equal(transactions[0].itemCount, 3);
  assert.equal(transactions[0].companyName, "Shop A");
  assert.deepEqual(transactions[0].productNames, ["Mug", "Plate"]);
  assert.equal(summary.paidAmount, 300);
});

test("matches partner names loosely and ignores other payment methods", () => {
  const { transactions } = buildPaymentPartnerTransactions({
    partner: { id: "p1", branch: "GCash" },
    orders: [
      line({ paymentPartnerName: "G-Cash" }),
      line({ id: "o3", orderGroupId: "og_2", paymentPartnerName: "Maya" }),
    ],
  });
  assert.deepEqual(transactions.map((entry) => entry.id), ["og_1"]);
});

test("seller-scoped partners only see their own seller's checkouts", () => {
  const { transactions } = buildPaymentPartnerTransactions({
    partner: { id: "p1", branch: "GCash", adminId: "seller-b" },
    orders: [line(), line({ id: "o4", orderGroupId: "og_4", adminId: "seller-b" })],
  });
  assert.deepEqual(transactions.map((entry) => entry.id), ["og_4"]);
});

test("derives status and sorts newest first", () => {
  const { transactions, summary } = buildPaymentPartnerTransactions({
    partner: { id: "p1", branch: "GCash" },
    orders: [
      line({ orderGroupId: "paid", createdAtEpochMs: 1 }),
      line({ orderGroupId: "pending", stage: "toPay", paymentStatus: "pending", amountToPayAmount: 300, createdAtEpochMs: 3 }),
      line({ orderGroupId: "failed", stage: "toPay", paymentStatus: "expired", amountToPayAmount: 300, createdAtEpochMs: 2 }),
    ],
  });
  assert.deepEqual(transactions.map((entry) => entry.status), ["pending", "failed", "paid"]);
  assert.equal(summary.counts.pending, 1);
  assert.equal(summary.pendingAmount, 300);
  assert.equal(summary.lastCheckoutAtEpochMs, 3);
});
