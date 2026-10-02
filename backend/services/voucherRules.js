"use strict";

const REDEMPTION_METHODS = Object.freeze({
  ENTER_CODE: "enter_code",
  CLAIM: "claim",
  AUTO_APPLY: "auto_apply",
});

const SCOPE_TYPES = Object.freeze({
  PLATFORM: "entire_platform",
  SELLERS: "selected_sellers",
  CATEGORIES: "selected_categories",
  BUSINESS_TYPES: "selected_business_types",
  BRANDS: "selected_brands",
  PRODUCTS: "selected_products",
  VARIANTS: "selected_variants",
});

const FUNDING_SOURCES = Object.freeze({
  PLATFORM: "platform",
  SELLER: "seller",
  SHARED: "shared",
});

const CUSTOMER_ELIGIBILITY = Object.freeze({
  ALL: "all",
  NEW: "new_customers",
  FIRST_ORDER: "first_order",
  RETURNING: "returning",
  NO_PREVIOUS_ORDER: "no_previous_order",
  SEGMENT: "segment",
});

const SHIPPING_DISCOUNT_TYPES = Object.freeze({
  FULL: "full",
  CAP: "cap",
});

const CAMPAIGN_STATUSES = Object.freeze([
  "draft",
  "scheduled",
  "active",
  "paused",
  "expired",
  "fully_redeemed",
  "budget_exhausted",
  "cancelled",
  "inactive",
  "used",
]);

const WEEKDAY_KEYS = Object.freeze(["sun", "mon", "tue", "wed", "thu", "fri", "sat"]);

function money(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.round(amount * 100) / 100;
}

function asIdList(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.map((entry) => String(entry || "").trim()).filter(Boolean))];
  }
  return String(value || "")
    .split(/[\n,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeRedemptionMethod(input, existing = null) {
  const raw = String(input ?? existing?.redemptionMethod ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (raw === "enter_code" || raw === "code") return REDEMPTION_METHODS.ENTER_CODE;
  if (raw === "claim" || raw === "collect") return REDEMPTION_METHODS.CLAIM;
  if (raw === "auto_apply" || raw === "auto" || raw === "passive") {
    return REDEMPTION_METHODS.AUTO_APPLY;
  }
  if (existing?.passive === true || existing?.isPassive === true) {
    return REDEMPTION_METHODS.AUTO_APPLY;
  }
  return REDEMPTION_METHODS.ENTER_CODE;
}

function normalizeScopeType(value) {
  const raw = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  return Object.values(SCOPE_TYPES).includes(raw) ? raw : SCOPE_TYPES.PLATFORM;
}

function normalizeFundingSource(value) {
  const raw = String(value || "")
    .trim()
    .toLowerCase();
  if (raw === "seller" || raw === "seller_funded") return FUNDING_SOURCES.SELLER;
  if (raw === "shared" || raw === "shared_funding") return FUNDING_SOURCES.SHARED;
  return FUNDING_SOURCES.PLATFORM;
}

function normalizeCustomerEligibility(value) {
  const raw = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  return Object.values(CUSTOMER_ELIGIBILITY).includes(raw)
    ? raw
    : CUSTOMER_ELIGIBILITY.ALL;
}

function normalizeShippingDiscountType(value) {
  const raw = String(value || "")
    .trim()
    .toLowerCase();
  return raw === SHIPPING_DISCOUNT_TYPES.CAP
    ? SHIPPING_DISCOUNT_TYPES.CAP
    : SHIPPING_DISCOUNT_TYPES.FULL;
}

function normalizePriority(value) {
  const parsed = Number.parseInt(String(value ?? "0"), 10);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(9999, parsed));
}

function unlimitedOrCount(value) {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw || raw === "unlimited" || raw === "0") return 0;
  const parsed = Number.parseInt(raw.replace(/[^\d]/g, ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function computeMerchandiseDiscount({
  discountType = "percent",
  discountValue = 0,
  maximumDiscount = 0,
  eligibleSubtotal = 0,
} = {}) {
  const subtotal = money(eligibleSubtotal);
  if (subtotal <= 0) return 0;
  const type = String(discountType || "percent").trim().toLowerCase();
  const value = money(discountValue);
  if (type === "fixed") {
    return Math.min(subtotal, value);
  }
  const uncapped = money((subtotal * value) / 100);
  const cap = money(maximumDiscount);
  if (cap > 0) return Math.min(uncapped, cap);
  return uncapped;
}

function computeShippingDiscount({
  freeShipping = false,
  shippingDiscountType = SHIPPING_DISCOUNT_TYPES.FULL,
  shippingDiscountCap = 0,
  shippingFee = 0,
} = {}) {
  if (!freeShipping) return 0;
  const fee = money(shippingFee);
  if (fee <= 0) return 0;
  if (normalizeShippingDiscountType(shippingDiscountType) === SHIPPING_DISCOUNT_TYPES.CAP) {
    const cap = money(shippingDiscountCap);
    if (cap <= 0) return 0;
    return Math.min(fee, cap);
  }
  return fee;
}

function computeFundingSplit({
  fundingSource = FUNDING_SOURCES.PLATFORM,
  platformSharePct = 100,
  sellerSharePct = 0,
  merchandiseDiscount = 0,
  shippingDiscount = 0,
} = {}) {
  const total = money(merchandiseDiscount) + money(shippingDiscount);
  const source = normalizeFundingSource(fundingSource);
  if (total <= 0) {
    return { platformFundedAmount: 0, sellerFundedAmount: 0, fundingSource: source };
  }
  if (source === FUNDING_SOURCES.SELLER) {
    return {
      platformFundedAmount: 0,
      sellerFundedAmount: total,
      fundingSource: source,
    };
  }
  if (source === FUNDING_SOURCES.SHARED) {
    const platformPct = Math.max(0, Math.min(100, Number(platformSharePct) || 0));
    const sellerPctRaw = Number(sellerSharePct);
    const sellerPct = Number.isFinite(sellerPctRaw)
      ? Math.max(0, Math.min(100, sellerPctRaw))
      : 100 - platformPct;
    const platformAmount = money((total * platformPct) / 100);
    return {
      platformFundedAmount: platformAmount,
      sellerFundedAmount: money(total - platformAmount),
      fundingSource: source,
      platformSharePct: platformPct,
      sellerSharePct: sellerPct,
    };
  }
  return {
    platformFundedAmount: total,
    sellerFundedAmount: 0,
    fundingSource: source,
  };
}

function lineCategoryKeys(line = {}) {
  const values = [line?.categoryId, line?.category];
  if (Array.isArray(line?.categories)) values.push(...line.categories);
  return [
    ...new Set(
      values.map((value) => String(value || "").trim().toLowerCase()).filter(Boolean),
    ),
  ];
}

function lineBusinessTypeKeys(line = {}) {
  const values = [line?.businessTypeId, line?.businessType, line?.storeType];
  if (Array.isArray(line?.businessTypes)) values.push(...line.businessTypes);
  return [
    ...new Set(
      values.map((value) => String(value || "").trim().toLowerCase()).filter(Boolean),
    ),
  ];
}

function eligibleLineSubtotal(lines = [], voucher = {}) {
  const includeCategoryKeys = new Set(
    asIdList(voucher.includeCategoryIds).map((value) => value.toLowerCase()),
  );
  const includeBusinessTypeKeys = new Set(
    asIdList(voucher.includeBusinessTypeIds).map((value) => value.toLowerCase()),
  );
  const excludeCategoryKeys = new Set(
    asIdList(voucher.excludeCategoryIds).map((value) => value.toLowerCase()),
  );
  const include = {
    sellerIds: asIdList(voucher.includeSellerIds),
    brandIds: asIdList(voucher.includeBrandIds),
    productIds: asIdList(voucher.includeProductIds),
    variantIds: asIdList(voucher.includeVariantIds),
  };
  const exclude = {
    sellerIds: new Set(asIdList(voucher.excludeSellerIds)),
    brandIds: new Set(asIdList(voucher.excludeBrandIds)),
    productIds: new Set(asIdList(voucher.excludeProductIds)),
    variantIds: new Set(asIdList(voucher.excludeVariantIds)),
  };
  const scope = normalizeScopeType(voucher.scopeType);
  let total = 0;
  for (const line of Array.isArray(lines) ? lines : []) {
    const productId = String(line?.productId || line?.id || "").trim();
    const variantId = String(line?.variantId || "").trim();
    const sellerId = String(line?.sellerAdminId || line?.sellerId || "").trim();
    const categoryKeys = lineCategoryKeys(line);
    const brandId = String(line?.brandId || line?.brand || "").trim();
    if (exclude.productIds.has(productId) || exclude.variantIds.has(variantId)) continue;
    if (exclude.sellerIds.has(sellerId)) continue;
    if (categoryKeys.some((key) => excludeCategoryKeys.has(key))) continue;
    if (exclude.brandIds.has(brandId)) continue;

    let included = scope === SCOPE_TYPES.PLATFORM;
    if (scope === SCOPE_TYPES.SELLERS) included = include.sellerIds.includes(sellerId);
    if (scope === SCOPE_TYPES.CATEGORIES) {
      included = categoryKeys.some((key) => includeCategoryKeys.has(key));
    }
    if (scope === SCOPE_TYPES.BUSINESS_TYPES) {
      included = lineBusinessTypeKeys(line).some((key) => includeBusinessTypeKeys.has(key));
    }
    if (scope === SCOPE_TYPES.BRANDS) included = include.brandIds.includes(brandId);
    if (scope === SCOPE_TYPES.PRODUCTS) included = include.productIds.includes(productId);
    if (scope === SCOPE_TYPES.VARIANTS) included = include.variantIds.includes(variantId);
    if (!included) continue;

    const qty = Math.max(1, Number(line?.quantity) || 1);
    const unit = money(line?.unitPrice ?? line?.price ?? 0);
    total += unit * qty;
  }
  return money(total);
}

function qualifiesMinSpend(voucher, eligibleSubtotal) {
  const minSpend = money(voucher?.minimumSpend);
  if (minSpend <= 0) return true;
  return money(eligibleSubtotal) >= minSpend;
}

function parseClockMinutes(value) {
  const raw = String(value || "").trim();
  const match = raw.match(/^(\d{1,2}):(\d{2})(?:\s*([AP]M))?$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const mer = String(match[3] || "").toUpperCase();
  if (mer === "PM" && hour < 12) hour += 12;
  if (mer === "AM" && hour === 12) hour = 0;
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return hour * 60 + minute;
}

function isWithinRepeatWindow(voucher, now = new Date()) {
  if (!voucher?.repeatWeekly) return true;
  const days = asIdList(voucher.repeatDays).map((day) => day.slice(0, 3).toLowerCase());
  if (!days.length) return false;
  const weekday = WEEKDAY_KEYS[now.getDay()];
  if (!days.includes(weekday)) return false;
  const startMin = parseClockMinutes(voucher.repeatStartTime);
  if (startMin == null) return false;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const endMin = parseClockMinutes(voucher.repeatEndTime);
  if (endMin == null) return nowMin >= startMin;
  if (endMin > startMin) return nowMin >= startMin && nowMin < endMin;
  return nowMin >= startMin || nowMin < endMin;
}

function isWithinCampaignWindow(voucher, nowMs = Date.now()) {
  const startMs = Number(voucher?.startsAtMs);
  const endMs = Number(voucher?.endsAtMs);
  if (Number.isFinite(startMs) && nowMs < startMs) return false;
  if (Number.isFinite(endMs) && nowMs > endMs) return false;
  return true;
}

function customerMatchesEligibility(voucher, customer = {}) {
  const rule = normalizeCustomerEligibility(voucher?.customerEligibility);
  const orderCount = Math.max(0, Number(customer.orderCount) || 0);
  const isNew = customer.isNew === true || orderCount <= 0;
  if (rule === CUSTOMER_ELIGIBILITY.ALL) return true;
  if (rule === CUSTOMER_ELIGIBILITY.NEW || rule === CUSTOMER_ELIGIBILITY.NO_PREVIOUS_ORDER) {
    return isNew;
  }
  if (rule === CUSTOMER_ELIGIBILITY.FIRST_ORDER) return orderCount === 0;
  if (rule === CUSTOMER_ELIGIBILITY.RETURNING) return orderCount > 0;
  if (rule === CUSTOMER_ELIGIBILITY.SEGMENT) {
    const wanted = new Set(asIdList(voucher.customerSegmentIds));
    const actual = asIdList(customer.segmentIds);
    return actual.some((id) => wanted.has(id));
  }
  return true;
}

function stackingAllowed(voucher, context = {}) {
  const rules = voucher?.combinationRules && typeof voucher.combinationRules === "object"
    ? voucher.combinationRules
    : {};
  if (context.hasFlashDeal && rules.combineFlashDeal === false) return false;
  if (context.hasSellerVoucher && rules.combineSellerVoucher === false) return false;
  if (context.hasPlatformVoucher && rules.combinePlatformVoucher === false) return false;
  if (context.hasFreeShippingVoucher && rules.combineFreeShipping === false) return false;
  if (context.hasRewards && rules.combineRewards === false) return false;
  return true;
}

function remainingBudget(voucher) {
  const allocated = money(voucher?.allocatedBudget);
  if (allocated <= 0) return Number.POSITIVE_INFINITY;
  const used = money(voucher?.usedBudget);
  return Math.max(0, money(allocated - used));
}

function remainingTotalUses(voucher) {
  const limit = unlimitedOrCount(voucher?.totalUsageLimit);
  if (limit <= 0) return Number.POSITIVE_INFINITY;
  const used = Math.max(0, Number(voucher?.usedTimes) || 0);
  return Math.max(0, limit - used);
}

function resolveCampaignStatus(voucher, nowMs = Date.now()) {
  const explicit = String(voucher?.status || "").trim().toLowerCase();
  if (explicit === "cancelled" || explicit === "paused" || explicit === "draft" || explicit === "inactive") {
    return explicit;
  }
  if (remainingTotalUses(voucher) <= 0) return "fully_redeemed";
  if (Number.isFinite(remainingBudget(voucher)) && remainingBudget(voucher) <= 0) {
    return "budget_exhausted";
  }
  if (!isWithinCampaignWindow(voucher, nowMs) && Number(voucher?.endsAtMs) < nowMs) {
    return "expired";
  }
  if (Number.isFinite(Number(voucher?.startsAtMs)) && nowMs < Number(voucher.startsAtMs)) {
    return "scheduled";
  }
  return explicit === "used" ? "used" : "active";
}

function evaluateVoucher(voucher, context = {}) {
  const now = context.now instanceof Date ? context.now : new Date(context.nowMs || Date.now());
  const nowMs = now.getTime();
  const status = resolveCampaignStatus(voucher, nowMs);
  const reasons = [];
  if (status !== "active") {
    return {
      ok: false,
      status,
      reasons: [`Voucher is ${String(status || "unavailable").replace(/_/g, " ")}.`],
      merchandiseDiscount: 0,
      shippingDiscount: 0,
      eligibleSubtotal: 0,
      totalDiscount: 0,
    };
  }
  if (!isWithinCampaignWindow(voucher, nowMs)) {
    reasons.push("Voucher is outside its campaign dates.");
  }
  if (!isWithinRepeatWindow(voucher, now)) {
    reasons.push("Voucher is outside its repeat schedule.");
  }
  if (!customerMatchesEligibility(voucher, context.customer || {})) {
    reasons.push("User is not eligible for this voucher.");
  }
  const redemption = normalizeRedemptionMethod(voucher?.redemptionMethod, voucher);
  if (redemption === REDEMPTION_METHODS.CLAIM) {
    const userId = String(context.accountId || context.customer?.id || "").trim();
    const claimed = new Set(asIdList(voucher?.claimedByUserIds));
    if (!userId || !claimed.has(userId)) {
      reasons.push("Claim this voucher before using it.");
    }
  }
  if (
    redemption === REDEMPTION_METHODS.ENTER_CODE &&
    context.requireEnteredCode &&
    normalizeCodeLike(context.enteredCode) !== normalizeCodeLike(voucher?.code)
  ) {
    reasons.push("Enter the voucher code to redeem this offer.");
  }
  if (!stackingAllowed(voucher, context)) {
    reasons.push("This voucher cannot be combined with the other offers in this cart.");
  }
  const eligibleSubtotal = eligibleLineSubtotal(context.lines || [], voucher);
  if (!qualifiesMinSpend(voucher, eligibleSubtotal)) {
    reasons.push("Eligible items do not meet the minimum spend.");
  }
  const merchandiseDiscount = computeMerchandiseDiscount({
    discountType: voucher.discountType,
    discountValue: voucher.discountValue,
    maximumDiscount: voucher.maximumDiscount,
    eligibleSubtotal,
  });
  const shippingDiscount = computeShippingDiscount({
    freeShipping: voucher.freeShipping,
    shippingDiscountType: voucher.shippingDiscountType,
    shippingDiscountCap: voucher.shippingDiscountCap,
    shippingFee: context.shippingFee,
  });
  const funding = computeFundingSplit({
    fundingSource: voucher.fundingSource,
    platformSharePct: voucher.platformSharePct,
    sellerSharePct: voucher.sellerSharePct,
    merchandiseDiscount,
    shippingDiscount,
  });
  const budgetLeft = remainingBudget(voucher);
  const totalDiscount = money(merchandiseDiscount + shippingDiscount);
  if (Number.isFinite(budgetLeft) && totalDiscount > budgetLeft) {
    reasons.push("Campaign budget is exhausted.");
  }
  if (remainingTotalUses(voucher) <= 0) {
    reasons.push("Voucher is fully redeemed.");
  }
  const ok =
    reasons.length === 0 &&
    (merchandiseDiscount > 0 || shippingDiscount > 0 || Boolean(voucher.freeShipping));
  return {
    ok,
    status: ok ? "active" : resolveCampaignStatus(voucher, nowMs),
    reasons,
    eligibleSubtotal,
    merchandiseDiscount,
    shippingDiscount,
    totalDiscount,
    ...funding,
  };
}

function normalizeCodeLike(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function pickVoucher(vouchers, context = {}) {
  const ranked = (Array.isArray(vouchers) ? vouchers : [])
    .map((voucher) => ({ voucher, result: evaluateVoucher(voucher, context) }))
    .filter((entry) => entry.result.ok);
  ranked.sort((a, b) => {
    const selectedA = String(context.selectedVoucherId || "") === String(a.voucher.id || "");
    const selectedB = String(context.selectedVoucherId || "") === String(b.voucher.id || "");
    if (selectedA !== selectedB) return selectedA ? -1 : 1;
    const autoA = normalizeRedemptionMethod(a.voucher.redemptionMethod, a.voucher) === REDEMPTION_METHODS.AUTO_APPLY;
    const autoB = normalizeRedemptionMethod(b.voucher.redemptionMethod, b.voucher) === REDEMPTION_METHODS.AUTO_APPLY;
    if (context.preferAutoApply && autoA !== autoB) return autoA ? -1 : 1;
    const priorityDelta = normalizePriority(b.voucher.priority) - normalizePriority(a.voucher.priority);
    if (priorityDelta) return priorityDelta;
    return money(b.result.totalDiscount) - money(a.result.totalDiscount);
  });
  return ranked[0] || null;
}

function buildOrderSnapshot(voucher, evaluation = {}) {
  return {
    voucherId: String(voucher?.id || "").trim(),
    voucherTitle: String(voucher?.title || "").trim(),
    voucherCode: String(voucher?.code || "").trim(),
    voucherType: String(voucher?.kind || voucher?.discountType || "").trim(),
    discountType: String(voucher?.discountType || "").trim(),
    discountValue: String(voucher?.discountValue || "").trim(),
    actualDiscountAmount: money(evaluation.merchandiseDiscount),
    shippingDiscountAmount: money(evaluation.shippingDiscount),
    fundingSource: evaluation.fundingSource || normalizeFundingSource(voucher?.fundingSource),
    platformFundedAmount: money(evaluation.platformFundedAmount),
    sellerFundedAmount: money(evaluation.sellerFundedAmount),
    campaignId: String(voucher?.campaignId || "").trim(),
    redemptionMethod: normalizeRedemptionMethod(voucher?.redemptionMethod, voucher),
  };
}

function schedulePreview(voucher) {
  const days = asIdList(voucher?.repeatDays);
  const dayLabel = days.length
    ? days
        .map((day) => day.slice(0, 1).toUpperCase() + day.slice(1, 3))
        .join(", ")
    : "";
  const start = String(voucher?.startDate || "").trim();
  const end = String(voucher?.date || "").trim();
  if (voucher?.repeatWeekly && dayLabel) {
    const startTime = String(voucher.repeatStartTime || "").trim() || "start of day";
    const endTime = String(voucher.repeatEndTime || "").trim() || "end of day";
    return `Active every ${dayLabel} · ${startTime} – ${endTime}${start || end ? ` · ${start || "now"} to ${end || "no end"}` : ""}`;
  }
  if (start || end) return `Active ${start || "on publish"} to ${end || "no end date"}`;
  return "Active whenever published";
}

module.exports = {
  REDEMPTION_METHODS,
  SCOPE_TYPES,
  FUNDING_SOURCES,
  CUSTOMER_ELIGIBILITY,
  SHIPPING_DISCOUNT_TYPES,
  CAMPAIGN_STATUSES,
  asIdList,
  money,
  normalizeRedemptionMethod,
  normalizeScopeType,
  normalizeFundingSource,
  normalizeCustomerEligibility,
  normalizeShippingDiscountType,
  normalizePriority,
  unlimitedOrCount,
  computeMerchandiseDiscount,
  computeShippingDiscount,
  computeFundingSplit,
  eligibleLineSubtotal,
  qualifiesMinSpend,
  isWithinRepeatWindow,
  isWithinCampaignWindow,
  customerMatchesEligibility,
  stackingAllowed,
  remainingBudget,
  remainingTotalUses,
  resolveCampaignStatus,
  evaluateVoucher,
  pickVoucher,
  buildOrderSnapshot,
  schedulePreview,
  normalizeCodeLike,
};
