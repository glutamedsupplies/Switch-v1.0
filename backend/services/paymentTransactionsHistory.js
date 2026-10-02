"use strict";

const TRANSACTION_STATUSES = ["paid", "pending", "failed", "refunded", "cancelled"];

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** "G-Cash", "gcash " and "GCash" all compare equal. */
function paymentNameKey(value) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function getPartnerNameKeys(partner) {
  return new Set(
    [partner?.branch, partner?.name]
      .map(paymentNameKey)
      .filter(Boolean),
  );
}

function getOrderPaymentNameKey(entry) {
  return paymentNameKey(entry?.paymentPartnerName || entry?.paymentOptionLabel || entry?.paymentMethod);
}

function getOrderGroupKey(entry) {
  const groupId = String(entry?.orderGroupId ?? entry?.groupId ?? "").trim();
  if (groupId) return groupId;
  const epoch = Math.trunc(toNumber(entry?.createdAtEpochMs, 0));
  return `${String(entry?.accountId ?? "").trim()}|${epoch || String(entry?.id ?? "").trim()}`;
}

function resolveTransactionStatus(entries) {
  const primary = entries[0] || {};
  const paymentStatus = String(primary.paymentStatus ?? "").trim().toLowerCase();
  const stage = String(primary.stage ?? "").trim();
  const stageKey = stage.toLowerCase();
  if (paymentStatus === "refunded") return "refunded";
  if (["failed", "expired", "declined"].includes(paymentStatus)) return "failed";
  const paid = paymentStatus === "paid"
    || (stageKey !== "topay" && stageKey !== "cancelled"
      && entries.every((entry) => toNumber(entry?.amountToPayAmount, 0) <= 0.009));
  if (paid) return "paid";
  if (stageKey === "cancelled" || stageKey === "canceled") return "cancelled";
  return "pending";
}

function resolveTransactionAmount(entries) {
  // Every line item stores the same group total, so summing would multiply it.
  const groupTotal = Math.max(0, ...entries.map((entry) => toNumber(entry?.grandTotalAmount, 0)));
  if (groupTotal > 0.009) return groupTotal;
  return entries.reduce(
    (total, entry) => total + toNumber(entry?.unitPrice, 0) * Math.max(1, Math.trunc(toNumber(entry?.quantity, 1))),
    0,
  );
}

function buildTransaction(groupKey, entries, companyNames) {
  const primary = entries[0] || {};
  const adminId = String(primary.adminId ?? "").trim();
  const createdAtEpochMs = Math.min(
    ...entries.map((entry) => Math.trunc(toNumber(entry?.createdAtEpochMs, 0)) || Number.MAX_SAFE_INTEGER),
  );
  const paidAtEpochMs = Math.max(0, ...entries.map((entry) => Math.trunc(toNumber(entry?.paidAtEpochMs, 0))));
  return {
    id: groupKey,
    orderGroupId: String(primary.orderGroupId ?? "").trim(),
    paymentReference: String(primary.paymentReference ?? "").trim(),
    paymentProvider: String(primary.paymentProvider ?? "").trim(),
    status: resolveTransactionStatus(entries),
    stage: String(primary.stage ?? "").trim(),
    amount: Math.round(resolveTransactionAmount(entries) * 100) / 100,
    itemCount: entries.reduce((total, entry) => total + Math.max(1, Math.trunc(toNumber(entry?.quantity, 1))), 0),
    productNames: [...new Set(entries.map((entry) => String(entry?.productName ?? "").trim()).filter(Boolean))].slice(0, 3),
    buyerName: String(primary.clientName || primary.buyerName || "").trim(),
    adminId,
    companyName: String(companyNames?.get?.(adminId) || primary.companyName || "").trim(),
    createdAtEpochMs: createdAtEpochMs === Number.MAX_SAFE_INTEGER ? 0 : createdAtEpochMs,
    paidAtEpochMs,
  };
}

/**
 * Checkout history for one payment partner. Orders are matched by the payment
 * partner name the buyer picked at checkout; a seller-scoped partner only sees
 * its own seller's orders.
 */
function buildPaymentPartnerTransactions({ partner, orders = [], companyNames = new Map(), limit = 200 } = {}) {
  const nameKeys = getPartnerNameKeys(partner);
  const scopeAdminId = String(partner?.adminId ?? "").trim().toLowerCase();
  const groups = new Map();
  if (nameKeys.size) {
    for (const entry of Array.isArray(orders) ? orders : []) {
      if (!nameKeys.has(getOrderPaymentNameKey(entry))) continue;
      if (scopeAdminId && String(entry?.adminId ?? "").trim().toLowerCase() !== scopeAdminId) continue;
      const key = getOrderGroupKey(entry);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(entry);
    }
  }

  const transactions = [...groups.entries()]
    .map(([key, entries]) => buildTransaction(key, entries, companyNames))
    .sort((left, right) => right.createdAtEpochMs - left.createdAtEpochMs);

  const counts = Object.fromEntries(TRANSACTION_STATUSES.map((status) => [status, 0]));
  let paidAmount = 0;
  let pendingAmount = 0;
  for (const transaction of transactions) {
    counts[transaction.status] += 1;
    if (transaction.status === "paid") paidAmount += transaction.amount;
    if (transaction.status === "pending") pendingAmount += transaction.amount;
  }

  const safeLimit = Math.max(1, Math.min(500, Math.trunc(toNumber(limit, 200)) || 200));
  return {
    transactions: transactions.slice(0, safeLimit),
    summary: {
      total: transactions.length,
      counts,
      paidAmount: Math.round(paidAmount * 100) / 100,
      pendingAmount: Math.round(pendingAmount * 100) / 100,
      lastCheckoutAtEpochMs: transactions[0]?.createdAtEpochMs || 0,
    },
  };
}

module.exports = {
  TRANSACTION_STATUSES,
  buildPaymentPartnerTransactions,
  paymentNameKey,
};
