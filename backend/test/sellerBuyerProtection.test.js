"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  normalizeCategory,
  canSellerActOnBuyer,
  isBuyerBlockedByStore,
  computeBuyerStoreRisk,
  TICKET_CATEGORIES,
} = require("../services/sellerBuyerProtection");

test("seller protection categories stay explicit", () => {
  assert.equal(normalizeCategory("harassment", TICKET_CATEGORIES), "harassment");
  assert.equal(normalizeCategory("not-real", TICKET_CATEGORIES), "");
});

test("seller cannot open a protection case against their own account", () => {
  const blocked = canSellerActOnBuyer({
    sellerAccountId: "acc-1",
    buyerAccountId: "acc-1",
  });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.code, "OWN_ACCOUNT");
});

test("store block list is store-scoped not a platform ban", () => {
  const blocks = [
    { buyerAccountId: "buyer-1", companyId: "co-a", adminId: "adm-a" },
  ];
  assert.equal(isBuyerBlockedByStore(blocks, {
    buyerAccountId: "buyer-1",
    companyId: "co-a",
    adminId: "adm-a",
  }), true);
  assert.equal(isBuyerBlockedByStore(blocks, {
    buyerAccountId: "buyer-1",
    companyId: "co-b",
    adminId: "adm-b",
  }), false);
});

test("one seller ticket does not auto-flag a buyer as high risk", () => {
  const risk = computeBuyerStoreRisk({
    tickets: [{ adminId: "adm-1", status: "pending" }],
    returns: 0,
    blocks: [],
    warningThreshold: 3,
  });
  assert.equal(risk.flagged, false);
});

test("repeat returns or multiple seller tickets flag the buyer for Security Center", () => {
  const returns = computeBuyerStoreRisk({
    tickets: [],
    returns: 3,
    blocks: [],
    warningThreshold: 3,
  });
  assert.equal(returns.flagged, true);
  assert.equal(returns.reason, "repeat_returns");

  const multi = computeBuyerStoreRisk({
    tickets: [
      { adminId: "adm-1", status: "pending" },
      { adminId: "adm-2", status: "upheld" },
    ],
    returns: 0,
    blocks: [],
  });
  assert.equal(multi.flagged, true);
});
