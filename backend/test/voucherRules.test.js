"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const rules = require("../services/voucherRules");

function voucher(overrides = {}) {
  return {
    id: "v1",
    status: "active",
    discountType: "percent",
    discountValue: "20",
    maximumDiscount: "300",
    minimumSpend: "500",
    freeShipping: false,
    scopeType: "selected_categories",
    includeCategoryIds: ["beauty"],
    excludeProductIds: [],
    redemptionMethod: "enter_code",
    usesPerAccount: 1,
    totalUsageLimit: 10000,
    usedTimes: 0,
    fundingSource: "platform",
    allocatedBudget: 1000000,
    usedBudget: 0,
    combinationRules: {
      combineFlashDeal: false,
      combineSellerVoucher: true,
      combinePlatformVoucher: false,
      combineFreeShipping: true,
      combineRewards: true,
    },
    customerEligibility: "all",
    priority: 10,
    startsAtMs: Date.parse("2026-09-01T00:00:00.000Z"),
    endsAtMs: Date.parse("2026-09-30T23:59:59.000Z"),
    ...overrides,
  };
}

const LINES = [
  { productId: "p-beauty", category: "beauty", unitPrice: 600, quantity: 1 },
  { productId: "p-elec", category: "electronics", unitPrice: 1000, quantity: 1 },
];

test("percentage voucher applies a maximum discount cap", () => {
  const discount = rules.computeMerchandiseDiscount({
    discountType: "percent",
    discountValue: 20,
    maximumDiscount: 300,
    eligibleSubtotal: 5000,
  });
  assert.equal(discount, 300);
});

test("fixed voucher never exceeds eligible subtotal", () => {
  assert.equal(
    rules.computeMerchandiseDiscount({
      discountType: "fixed",
      discountValue: 1000,
      eligibleSubtotal: 400,
    }),
    400,
  );
});

test("minimum spend uses eligible product subtotal only", () => {
  const eligible = rules.eligibleLineSubtotal(LINES, voucher());
  assert.equal(eligible, 600);
  assert.equal(rules.qualifiesMinSpend(voucher({ minimumSpend: 500 }), eligible), true);
  assert.equal(rules.qualifiesMinSpend(voucher({ minimumSpend: 700 }), eligible), false);
});

test("excluded products drop out of eligible subtotal", () => {
  const eligible = rules.eligibleLineSubtotal(LINES, voucher({
    excludeProductIds: ["p-beauty"],
  }));
  assert.equal(eligible, 0);
});

test("platform-wide voucher includes every non-excluded line", () => {
  const eligible = rules.eligibleLineSubtotal(LINES, voucher({
    scopeType: "entire_platform",
    includeCategoryIds: [],
  }));
  assert.equal(eligible, 1600);
});

test("selected categories match by name, ignoring case, across product categories", () => {
  const eligible = rules.eligibleLineSubtotal(
    [
      { productId: "a", category: "pizza", unitPrice: 100, quantity: 2 },
      { productId: "b", categories: ["Burgers", "DRINKS"], unitPrice: 50, quantity: 1 },
      { productId: "c", category: "Burgers", unitPrice: 70, quantity: 1 },
    ],
    voucher({ includeCategoryIds: ["Pizza", "Drinks"] }),
  );
  assert.equal(eligible, 250);
});

test("selected business types match any business type key on the line", () => {
  const eligible = rules.eligibleLineSubtotal(
    [
      { productId: "a", businessTypes: ["type-electronics", "electronics"], unitPrice: 100, quantity: 2 },
      { productId: "b", businessType: "Fashion", unitPrice: 50, quantity: 1 },
      { productId: "c", businessTypes: ["home"], unitPrice: 70, quantity: 1 },
    ],
    voucher({
      scopeType: "selected_business_types",
      includeCategoryIds: [],
      includeBusinessTypeIds: ["TYPE-ELECTRONICS", "fashion"],
    }),
  );
  assert.equal(eligible, 250);
});

test("maps legacy passive vouchers to auto apply", () => {
  assert.equal(rules.normalizeRedemptionMethod(null, { passive: true }), "auto_apply");
  assert.equal(rules.normalizeRedemptionMethod("claim"), "claim");
  assert.equal(rules.normalizeRedemptionMethod("enter_code"), "enter_code");
});

test("claim vouchers require a prior claim", () => {
  const claimed = voucher({
    redemptionMethod: "claim",
    claimedByUserIds: ["buyer-1"],
    discountType: "fixed",
    discountValue: "50",
    scopeType: "entire_platform",
  });
  const nowMs = Date.parse("2026-09-15T04:00:00.000Z");
  const denied = rules.evaluateVoucher(claimed, { lines: LINES, nowMs, accountId: "buyer-2" });
  const allowed = rules.evaluateVoucher(claimed, { lines: LINES, nowMs, accountId: "buyer-1" });
  assert.equal(denied.ok, false);
  assert.equal(allowed.ok, true);
});

test("selected seller scope only counts that seller's lines", () => {
  const eligible = rules.eligibleLineSubtotal(
    [
      { productId: "a", sellerAdminId: "seller-a", unitPrice: 400, quantity: 1 },
      { productId: "b", sellerAdminId: "seller-b", unitPrice: 900, quantity: 1 },
    ],
    voucher({
      scopeType: "selected_sellers",
      includeSellerIds: ["seller-a"],
      includeCategoryIds: [],
    }),
  );
  assert.equal(eligible, 400);
});

test("uses per account and total redemption limits", () => {
  assert.equal(rules.remainingTotalUses(voucher({ totalUsageLimit: 3, usedTimes: 2 })), 1);
  assert.equal(rules.resolveCampaignStatus(voucher({ totalUsageLimit: 3, usedTimes: 3 })), "fully_redeemed");
});

test("free shipping cap leaves the remainder to the buyer", () => {
  const shipping = rules.computeShippingDiscount({
    freeShipping: true,
    shippingDiscountType: "cap",
    shippingDiscountCap: 100,
    shippingFee: 160,
  });
  assert.equal(shipping, 100);
});

test("customer eligibility first-order vs returning", () => {
  const first = voucher({ customerEligibility: "first_order" });
  assert.equal(rules.customerMatchesEligibility(first, { orderCount: 0 }), true);
  assert.equal(rules.customerMatchesEligibility(first, { orderCount: 2 }), false);
  assert.equal(
    rules.customerMatchesEligibility(voucher({ customerEligibility: "returning" }), { orderCount: 2 }),
    true,
  );
});

test("flash deal stacking can be blocked", () => {
  assert.equal(rules.stackingAllowed(voucher(), { hasFlashDeal: true }), false);
  assert.equal(
    rules.stackingAllowed(
      voucher({ combinationRules: { combineFlashDeal: true } }),
      { hasFlashDeal: true },
    ),
    true,
  );
});

test("platform budget exhaustion stops redemption", () => {
  const result = rules.evaluateVoucher(
    voucher({
      allocatedBudget: 200,
      usedBudget: 200,
      discountType: "fixed",
      discountValue: "100",
      scopeType: "entire_platform",
    }),
    {
      lines: LINES,
      nowMs: Date.parse("2026-09-15T04:00:00.000Z"),
    },
  );
  assert.equal(result.ok, false);
  assert.match(result.reasons.join(" "), /budget/i);
});

test("repeat schedule only allows selected weekdays and hours", () => {
  const scheduled = voucher({
    repeatWeekly: true,
    repeatDays: ["mon", "wed", "fri"],
    repeatStartTime: "14:00",
    repeatEndTime: "18:00",
  });
  const mondayAfternoon = new Date("2026-09-14T06:30:00.000Z"); // 14:30 PH if +8, but use local clock
  mondayAfternoon.setHours(15, 0, 0, 0);
  mondayAfternoon.setDate(14);
  while (mondayAfternoon.getDay() !== 1) mondayAfternoon.setDate(mondayAfternoon.getDate() + 1);
  assert.equal(rules.isWithinRepeatWindow(scheduled, mondayAfternoon), true);
  const tuesday = new Date(mondayAfternoon);
  tuesday.setDate(mondayAfternoon.getDate() + 1);
  assert.equal(rules.isWithinRepeatWindow(scheduled, tuesday), false);
});

test("expired and paused vouchers are not usable", () => {
  const nowMs = Date.parse("2026-10-02T00:00:00.000Z");
  assert.equal(rules.resolveCampaignStatus(voucher(), nowMs), "expired");
  assert.equal(rules.resolveCampaignStatus(voucher({ status: "paused" }), nowMs), "paused");
});

test("shared funding splits the discount", () => {
  const split = rules.computeFundingSplit({
    fundingSource: "shared",
    platformSharePct: 60,
    sellerSharePct: 40,
    merchandiseDiscount: 100,
  });
  assert.equal(split.platformFundedAmount, 60);
  assert.equal(split.sellerFundedAmount, 40);
});

test("simultaneous last redemption is serialized by remaining uses", () => {
  const last = voucher({ totalUsageLimit: 1, usedTimes: 0, discountType: "fixed", discountValue: "50", scopeType: "entire_platform" });
  const first = rules.evaluateVoucher(last, { lines: LINES, nowMs: Date.parse("2026-09-15T04:00:00.000Z") });
  const second = rules.evaluateVoucher(
    { ...last, usedTimes: 1 },
    { lines: LINES, nowMs: Date.parse("2026-09-15T04:00:00.000Z") },
  );
  assert.equal(first.ok, true);
  assert.equal(second.ok, false);
});

test("auto-apply and priority pick a deterministic voucher", () => {
  const low = voucher({ id: "low", priority: 1, discountType: "fixed", discountValue: "20", scopeType: "entire_platform" });
  const high = voucher({
    id: "high",
    priority: 50,
    discountType: "fixed",
    discountValue: "10",
    scopeType: "entire_platform",
    redemptionMethod: "auto_apply",
  });
  const picked = rules.pickVoucher([low, high], {
    lines: LINES,
    nowMs: Date.parse("2026-09-15T04:00:00.000Z"),
    preferAutoApply: true,
  });
  assert.equal(picked.voucher.id, "high");
});
