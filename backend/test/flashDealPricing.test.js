"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const pricing = require("../services/flashDealPricing");

function product(overrides = {}) {
  return {
    id: "p1",
    name: "Widget",
    originalPrice: 1000,
    stock: 20,
    sellerAdminId: "seller-1",
    category: "gadgets",
    ...overrides,
  };
}

function sellerDeal(overrides = {}) {
  return pricing.hydrateDeal({
    id: "seller-deal",
    dealType: "seller",
    productId: "p1",
    sellerAdminId: "seller-1",
    flashPrice: 850,
    originalPriceSnapshot: 1000,
    dealStockLimit: 10,
    dealStockSold: 0,
    dealStockReserved: 0,
    startsAt: "2026-09-28T05:00:00.000Z",
    endsAt: "2026-09-28T10:00:00.000Z",
    status: "live",
    approvalStatus: "approved",
    createdAt: "2026-09-27T00:00:00.000Z",
    ...overrides,
  });
}

function platformDeal(overrides = {}) {
  return pricing.hydrateDeal({
    id: "platform-deal",
    dealType: "platform",
    campaignId: "camp-1",
    productId: "p1",
    flashPrice: 799,
    originalPriceSnapshot: 1000,
    dealStockLimit: 10,
    dealStockSold: 0,
    dealStockReserved: 0,
    startsAt: "2026-09-28T07:00:00.000Z",
    endsAt: "2026-09-28T09:00:00.000Z",
    status: "live",
    approvalStatus: "approved",
    fundingSource: "platform",
    priority: 100,
    createdByRole: "super_admin",
    createdAt: "2026-09-27T12:00:00.000Z",
    ...overrides,
  });
}

function campaign(overrides = {}) {
  return pricing.normalizeCampaign({
    id: "camp-1",
    name: "Noon sale",
    startsAt: "2026-09-28T07:00:00.000Z",
    endsAt: "2026-09-28T09:00:00.000Z",
    status: "active",
    discountType: "percentage",
    discountValue: 20,
    fundingSource: "platform",
    priority: 100,
    eligibility: { scope: "all" },
    createdAt: "2026-09-27T12:00:00.000Z",
    ...overrides,
  });
}

const BEFORE = Date.parse("2026-09-28T06:00:00.000Z");
const DURING = Date.parse("2026-09-28T08:00:00.000Z");
const AFTER_PLATFORM = Date.parse("2026-09-28T09:30:00.000Z");
const AFTER_BOTH = Date.parse("2026-09-28T11:00:00.000Z");

test("1. regular product with no Flash Deal uses original price", () => {
  const resolved = pricing.resolveProductPrice({
    product: product(),
    deals: [],
    campaigns: [],
    nowMs: DURING,
  });
  assert.equal(resolved.finalPrice, 1000);
  assert.equal(resolved.dealType, null);
  assert.equal(resolved.source, "regular");
});

test("2. Seller Flash Deal only", () => {
  const resolved = pricing.resolveProductPrice({
    product: product(),
    deals: [sellerDeal()],
    nowMs: BEFORE,
  });
  assert.equal(resolved.finalPrice, 850);
  assert.equal(resolved.dealType, "seller");
  assert.equal(resolved.sellerReceivable, 850);
  assert.equal(resolved.platformSubsidy, 0);
});

test("3. Platform Flash Deal only", () => {
  const resolved = pricing.resolveProductPrice({
    product: product(),
    deals: [platformDeal()],
    nowMs: DURING,
  });
  assert.equal(resolved.finalPrice, 799);
  assert.equal(resolved.dealType, "platform");
  assert.equal(resolved.sellerReceivable, 1000);
  assert.equal(resolved.platformSubsidy, 201);
});

test("4. overlapping Seller + Platform uses Platform price", () => {
  const resolved = pricing.resolveProductPrice({
    product: product(),
    deals: [sellerDeal(), platformDeal()],
    nowMs: DURING,
  });
  assert.equal(resolved.finalPrice, 799);
  assert.equal(resolved.dealType, "platform");
  assert.equal(resolved.overridden, true);
  assert.match(resolved.overlapWarning, /temporarily take priority/i);
  assert.equal(resolved.sellerDealPrice, 850);
  assert.equal(resolved.sellerReceivable, 850);
  assert.equal(resolved.platformSubsidy, 51);
});

test("5. Platform ends while Seller is still active", () => {
  const resolved = pricing.resolveProductPrice({
    product: product(),
    deals: [sellerDeal(), platformDeal()],
    nowMs: AFTER_PLATFORM,
  });
  assert.equal(resolved.finalPrice, 850);
  assert.equal(resolved.dealType, "seller");
  assert.equal(resolved.overridden, false);
});

test("6. Seller expires while Platform is active", () => {
  const resolved = pricing.resolveProductPrice({
    product: product(),
    deals: [
      sellerDeal({ endsAt: "2026-09-28T07:30:00.000Z" }),
      platformDeal(),
    ],
    nowMs: DURING,
  });
  assert.equal(resolved.finalPrice, 799);
  assert.equal(resolved.dealType, "platform");
  assert.equal(resolved.sellerDealPrice, null);
  assert.equal(resolved.sellerReceivable, 1000);
  assert.equal(resolved.platformSubsidy, 201);
});

test("7. both deals expired return regular price", () => {
  const resolved = pricing.resolveProductPrice({
    product: product(),
    deals: [sellerDeal(), platformDeal()],
    nowMs: AFTER_BOTH,
  });
  assert.equal(resolved.finalPrice, 1000);
  assert.equal(resolved.dealType, null);
});

test("8. Platform Flash Deal out of stock is ignored", () => {
  const resolved = pricing.resolveProductPrice({
    product: product(),
    deals: [
      sellerDeal(),
      platformDeal({ dealStockLimit: 5, dealStockSold: 5 }),
    ],
    nowMs: DURING,
  });
  assert.equal(resolved.finalPrice, 850);
  assert.equal(resolved.dealType, "seller");
});

test("9. Seller Flash Deal out of stock is ignored", () => {
  const resolved = pricing.resolveProductPrice({
    product: product(),
    deals: [sellerDeal({ dealStockLimit: 2, dealStockSold: 2 })],
    nowMs: BEFORE,
  });
  assert.equal(resolved.finalPrice, 1000);
  assert.equal(resolved.dealType, null);
});

test("10. deal expiry between cart and checkout switches to next valid price", () => {
  const inCart = pricing.resolveProductPrice({
    product: product(),
    deals: [sellerDeal(), platformDeal()],
    nowMs: DURING,
  });
  assert.equal(inCart.finalPrice, 799);
  const atCheckout = pricing.resolveProductPrice({
    product: product(),
    deals: [sellerDeal(), platformDeal()],
    nowMs: AFTER_PLATFORM,
  });
  assert.equal(atCheckout.finalPrice, 850);
  assert.equal(atCheckout.dealType, "seller");
});

test("11. remaining stock never goes negative under concurrent sold+reserved", () => {
  assert.equal(
    pricing.dealRemaining({
      dealStockLimit: 3,
      dealStockSold: 2,
      dealStockReserved: 1,
    }),
    0,
  );
  assert.equal(
    pricing.isUsableDeal(
      platformDeal({ dealStockLimit: 3, dealStockSold: 2, dealStockReserved: 1 }),
      DURING,
    ),
    false,
  );
});

test("12. platform subsidy uses seller deal floor when funding is platform", () => {
  const snapshot = pricing.buildPriceSnapshot(
    pricing.resolveProductPrice({
      product: product(),
      deals: [sellerDeal(), platformDeal()],
      nowMs: DURING,
    }),
  );
  assert.equal(snapshot.originalPrice, 1000);
  assert.equal(snapshot.sellerDealPrice, 850);
  assert.equal(snapshot.platformDealPrice, 799);
  assert.equal(snapshot.finalCustomerPrice, 799);
  assert.equal(snapshot.sellerReceivablePrice, 850);
  assert.equal(snapshot.platformSubsidy, 51);
  assert.equal(snapshot.appliedFlashDealType, "platform");
});

test("13. seller cannot mutate a Platform deal", () => {
  const result = pricing.canSellerMutateDeal(platformDeal(), "seller-1");
  assert.equal(result.ok, false);
  assert.match(result.message, /cannot edit Platform/i);
});

test("14. seller cannot manage another seller's deal", () => {
  const result = pricing.canSellerMutateDeal(sellerDeal(), "seller-2");
  assert.equal(result.ok, false);
  assert.match(result.message, /your own listings/i);
});

test("15. Super Admin campaign matches products by rule without listing every SKU", () => {
  const camp = campaign({
    eligibility: { scope: "sellers", sellerAdminIds: ["seller-1"] },
  });
  const hit = product();
  const miss = product({ id: "p2", sellerAdminId: "seller-2" });
  const resolvedHit = pricing.resolveProductPrice({
    product: hit,
    deals: [sellerDeal()],
    campaigns: [camp],
    nowMs: DURING,
  });
  const resolvedMiss = pricing.resolveProductPrice({
    product: miss,
    deals: [],
    campaigns: [camp],
    nowMs: DURING,
  });
  assert.equal(resolvedHit.finalPrice, 800);
  assert.equal(resolvedHit.dealType, "platform");
  assert.equal(resolvedMiss.finalPrice, 1000);
  const page = pricing.paginateEligibleProducts([hit, miss, product({ id: "p3", originalPrice: 0 })], camp, {
    limit: 10,
  });
  assert.equal(page.total, 1);
  assert.equal(page.products[0].id, "p1");
});

test("legacy createdByRole super_admin is treated as platform", () => {
  const deal = pricing.hydrateDeal({
    id: "legacy-sa",
    createdByRole: "super_admin",
    productId: "p1",
    flashPrice: 700,
    dealStockLimit: 4,
    startsAt: "2026-09-28T07:00:00.000Z",
    endsAt: "2026-09-28T09:00:00.000Z",
    status: "live",
    approvalStatus: "approved",
  });
  assert.equal(deal.dealType, "platform");
});

test("paused or cancelled platform deals never win", () => {
  const paused = pricing.resolveProductPrice({
    product: product(),
    deals: [sellerDeal(), platformDeal({ status: "paused" })],
    nowMs: DURING,
  });
  assert.equal(paused.dealType, "seller");
  const cancelled = pricing.resolveProductPrice({
    product: product(),
    deals: [sellerDeal(), platformDeal({ status: "cancelled" })],
    nowMs: DURING,
  });
  assert.equal(cancelled.dealType, "seller");
});

test("overlapping platform campaigns use higher priority then latest created", () => {
  const low = platformDeal({
    id: "plat-low",
    flashPrice: 900,
    priority: 10,
    createdAt: "2026-09-28T00:00:00.000Z",
  });
  const high = platformDeal({
    id: "plat-high",
    flashPrice: 750,
    priority: 200,
    createdAt: "2026-09-27T00:00:00.000Z",
  });
  const resolved = pricing.resolveProductPrice({
    product: product(),
    deals: [low, high],
    nowMs: DURING,
  });
  assert.equal(resolved.dealId, "plat-high");
  assert.equal(resolved.finalPrice, 750);
});

test("seller vs seller blocking still treats upcoming seller deals as blocking", () => {
  assert.equal(
    pricing.isSellerBlockingDeal(
      sellerDeal({
        status: "upcoming",
        startsAt: "2026-09-28T12:00:00.000Z",
        endsAt: "2026-09-28T14:00:00.000Z",
      }),
      Date.parse("2026-09-28T06:00:00.000Z"),
    ),
    true,
  );
  assert.equal(pricing.isSellerBlockingDeal(platformDeal(), DURING), false);
  assert.equal(
    pricing.isSellerBlockingDeal(
      sellerDeal({
        status: "ended",
        endsAt: "2026-09-28T01:00:00.000Z",
      }),
      DURING,
    ),
    false,
  );
});

test("seller funding means no platform subsidy", () => {
  const resolved = pricing.resolveProductPrice({
    product: product(),
    deals: [sellerDeal(), platformDeal({ fundingSource: "seller" })],
    nowMs: DURING,
  });
  assert.equal(resolved.finalPrice, 799);
  assert.equal(resolved.sellerReceivable, 799);
  assert.equal(resolved.platformSubsidy, 0);
});

test("campaign product settings cap deal stock and per-buyer limit", () => {
  const virtual = pricing.campaignToVirtualDeal(
    campaign({
      eligibility: { scope: "products", productIds: ["p1"] },
      dealStockPerProduct: 20,
      perBuyerLimit: 1,
      productSettings: {
        p1: { dealStock: 4, perBuyerLimit: 2 },
      },
    }),
    product({ stock: 20 }),
  );
  assert.equal(virtual.dealStockLimit, 4);
  assert.equal(virtual.perBuyerLimit, 2);
  assert.equal(virtual.flashPrice, 800);
});

test("a product-scoped campaign with no registered listings discounts nothing", () => {
  const virtual = pricing.campaignToVirtualDeal(
    campaign({ eligibility: { scope: "products", productIds: [] } }),
    product(),
  );
  assert.equal(virtual, null);
});

test("campaign free shipping flows to its deals without changing the price", () => {
  const eligibility = { scope: "products", productIds: ["p1"] };
  assert.equal(pricing.normalizeCampaign({ id: "c", discountValue: 20 }).freeShipping, false);
  const withShipping = pricing.campaignToVirtualDeal(
    campaign({ eligibility, freeShipping: true }),
    product(),
  );
  const withoutShipping = pricing.campaignToVirtualDeal(campaign({ eligibility }), product());
  assert.equal(withShipping.freeShipping, true);
  assert.equal(withoutShipping.freeShipping, false);
  assert.equal(withShipping.flashPrice, withoutShipping.flashPrice);
});

test("campaigns default to percentage off", () => {
  const camp = pricing.normalizeCampaign({ id: "c", discountValue: 25 });
  assert.equal(camp.discountType, "percentage");
  assert.equal(pricing.computeCampaignDealPrice(camp, 1000), 750);
  assert.equal(pricing.computeCampaignDealPrice({ ...camp, discountValue: 100 }, 1000), null);
});

test("legacy fixed-price campaigns keep their saved deal price", () => {
  const camp = campaign({ discountType: "fixed_price", discountValue: 799 });
  assert.equal(camp.discountType, "fixed_price");
  assert.equal(pricing.computeCampaignDealPrice(camp, 1000), 799);
});

test("max discount caps the peso discount per unit", () => {
  const camp = campaign({ discountValue: 50, maxDiscountAmount: 100 });
  assert.equal(pricing.computeCampaignDealPrice(camp, 1000), 900);
  assert.equal(pricing.computeCampaignDealPrice(camp, 150), 75);
});

test("campaign percentage applies to the current selling price, not the original", () => {
  const resolved = pricing.resolveProductPrice({
    product: product({ salesPrice: 800 }),
    campaigns: [campaign({ discountValue: 25 })],
    nowMs: DURING,
  });
  assert.equal(resolved.finalPrice, 600);
  assert.equal(resolved.regularPrice, 1000);
  assert.equal(resolved.platformSubsidy, 200);
  assert.equal(resolved.sellerReceivable, 800);
});

test("shared funding splits the discount between platform and seller", () => {
  const resolved = pricing.resolveProductPrice({
    product: product(),
    campaigns: [campaign({ fundingSource: "shared", platformSharePct: 40 })],
    nowMs: DURING,
  });
  assert.equal(resolved.finalPrice, 800);
  assert.equal(resolved.platformSubsidy, 80);
  assert.equal(resolved.sellerReceivable, 880);
});

test("seller-funded campaigns store a zero platform share", () => {
  const camp = campaign({ fundingSource: "seller", platformSharePct: 70 });
  assert.equal(camp.platformSharePct, 0);
  const resolved = pricing.resolveProductPrice({
    product: product(),
    campaigns: [camp],
    nowMs: DURING,
  });
  assert.equal(resolved.platformSubsidy, 0);
  assert.equal(resolved.sellerReceivable, 800);
});

test("campaign variant selection only discounts chosen variants", () => {
  const variantProduct = product({
    variants: [
      { id: "red", name: "Red", originalPrice: 1000 },
      { id: "blue", name: "Blue", originalPrice: 1200 },
    ],
  });
  const camp = campaign({
    eligibility: { scope: "products", productIds: ["p1"] },
    productSettings: { p1: { variantIds: ["red"] } },
  });
  const red = pricing.resolveProductPrice({
    product: variantProduct,
    variantId: "red",
    campaigns: [camp],
    nowMs: DURING,
  });
  const blue = pricing.resolveProductPrice({
    product: variantProduct,
    variantId: "blue",
    campaigns: [camp],
    nowMs: DURING,
  });
  assert.equal(red.finalPrice, 800);
  assert.equal(red.dealType, "platform");
  assert.equal(blue.dealType, null);
  assert.equal(blue.finalPrice, 1200);
});

test("budget used up marks the campaign budget_exhausted and stops pricing", () => {
  const camp = campaign({ budgetAmount: 1000, budgetCommitted: 1000 });
  assert.equal(pricing.campaignBudgetRemaining(camp), 0);
  assert.equal(pricing.deriveCampaignStatus(camp, DURING), "budget_exhausted");
  const resolved = pricing.resolveProductPrice({
    product: product(),
    campaigns: [camp],
    nowMs: DURING,
  });
  assert.equal(resolved.dealType, null);
  assert.equal(
    pricing.campaignBudgetRemaining(campaign({ budgetAmount: 1000, budgetCommitted: 250 })),
    750,
  );
  assert.equal(pricing.campaignBudgetRemaining(campaign()), Number.POSITIVE_INFINITY);
});

test("materialized campaign deals follow campaign edits", () => {
  const materialized = platformDeal({ flashPrice: 799, dealStockSold: 2 });
  const resolved = pricing.resolveProductPrice({
    product: product(),
    deals: [materialized],
    campaigns: [campaign({ discountValue: 30 })],
    nowMs: DURING,
  });
  assert.equal(resolved.dealId, "platform-deal");
  assert.equal(resolved.finalPrice, 700);
});

test("materialized campaign deals stop when the campaign is paused", () => {
  const resolved = pricing.resolveProductPrice({
    product: product(),
    deals: [platformDeal()],
    campaigns: [campaign({ status: "paused" })],
    nowMs: DURING,
  });
  assert.equal(resolved.dealType, null);
  assert.equal(resolved.finalPrice, 1000);
});

test("a sold-out materialized row blocks the campaign from re-offering fresh stock", () => {
  const resolved = pricing.resolveProductPrice({
    product: product(),
    deals: [platformDeal({ dealStockLimit: 3, dealStockSold: 3 })],
    campaigns: [campaign()],
    nowMs: DURING,
  });
  assert.equal(resolved.dealType, null);
});

test("live deal listing includes campaign products before any reservation", () => {
  const winners = pricing.winningLiveDealsByProduct({
    deals: [],
    campaigns: [campaign({ eligibility: { scope: "products", productIds: ["p1"] } })],
    productsById: new Map([["p1", product()]]),
    nowMs: DURING,
  });
  assert.equal(winners.length, 1);
  assert.equal(winners[0].finalPrice, 800);
});

test("campaign platform and business type targets are normalized", () => {
  const normalized = pricing.normalizeCampaign({
    platformIds: ["Food", "food", "all", "", "Shop"],
    businessTypeIds: ["bt-cafe", "BT-CAFE", " bt-bakery "],
  });
  assert.deepEqual(normalized.platformIds, ["food", "shop"]);
  assert.deepEqual(normalized.businessTypeIds, ["bt-cafe", "bt-bakery"]);
  assert.deepEqual(pricing.normalizeCampaign({}).platformIds, []);
  assert.deepEqual(pricing.normalizeCampaign({}).businessTypeIds, []);
});
