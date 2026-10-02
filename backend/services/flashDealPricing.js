"use strict";

const DEAL_TYPE_SELLER = "seller";
const DEAL_TYPE_PLATFORM = "platform";
const FUNDING_SELLER = "seller";
const FUNDING_PLATFORM = "platform";
const FUNDING_SHARED = "shared";
const DISCOUNT_FIXED = "fixed_price";
const DISCOUNT_PERCENT = "percentage";

const OVERLAP_WARNING =
  "This product already has an active Seller Flash Deal. The Platform Flash Deal will temporarily take priority during the overlapping schedule. The Seller Flash Deal will automatically resume when the Platform Flash Deal ends.";

function parseMoney(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
}

function parseNonNegInt(value) {
  const num = Number(String(value ?? "").trim());
  if (!Number.isFinite(num) || num < 0) return null;
  return Math.trunc(num);
}

function dealRemaining(deal) {
  const limit = Number(deal?.dealStockLimit ?? 0) || 0;
  const sold = Number(deal?.dealStockSold ?? 0) || 0;
  const reserved = Number(deal?.dealStockReserved ?? 0) || 0;
  return Math.max(0, limit - sold - reserved);
}

function normalizeDealType(deal) {
  const explicit = String(deal?.dealType || "").trim().toLowerCase();
  if (explicit === DEAL_TYPE_PLATFORM || explicit === "super_admin") {
    return DEAL_TYPE_PLATFORM;
  }
  if (explicit === DEAL_TYPE_SELLER) return DEAL_TYPE_SELLER;
  const role = String(deal?.createdByRole || "").trim().toLowerCase();
  if (role === "super_admin" || role === "platform") return DEAL_TYPE_PLATFORM;
  return DEAL_TYPE_SELLER;
}

function normalizeFundingSource(value, dealType) {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === FUNDING_PLATFORM || raw === FUNDING_SHARED || raw === FUNDING_SELLER) {
    return raw;
  }
  return dealType === DEAL_TYPE_PLATFORM ? FUNDING_PLATFORM : FUNDING_SELLER;
}

function hydrateDeal(deal) {
  if (!deal || typeof deal !== "object") return deal;
  const dealType = normalizeDealType(deal);
  return {
    ...deal,
    dealType,
    fundingSource: normalizeFundingSource(deal.fundingSource, dealType),
    priority: Number.isFinite(Number(deal.priority))
      ? Number(deal.priority)
      : dealType === DEAL_TYPE_PLATFORM
        ? 100
        : 10,
  };
}

function effectiveApprovalStatus(deal) {
  const approval = String(deal?.approvalStatus || "").trim().toLowerCase();
  if (approval === "rejected") return "rejected";
  if (approval === "approved") return "approved";
  return "approved";
}

function deriveDealStatus(deal, nowMs = Date.now()) {
  const stored = String(deal?.status || "").trim().toLowerCase();
  if (
    stored === "cancelled" ||
    stored === "draft" ||
    stored === "paused"
  ) {
    return stored;
  }
  const approval = effectiveApprovalStatus(deal);
  if (approval === "rejected") return "cancelled";
  const startMs = Date.parse(String(deal?.startsAt || ""));
  const endMs = Date.parse(String(deal?.endsAt || ""));
  if (Number.isFinite(endMs) && nowMs >= endMs) return "ended";
  if (dealRemaining(deal) <= 0) return "ended";
  if (Number.isFinite(startMs) && nowMs < startMs) return "upcoming";
  if (approval === "approved") return "live";
  return stored || "upcoming";
}

function isDealWindowActive(deal, nowMs = Date.now()) {
  const startMs = Date.parse(String(deal?.startsAt || ""));
  const endMs = Date.parse(String(deal?.endsAt || ""));
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return false;
  return startMs <= nowMs && nowMs < endMs;
}

function isUsableDeal(deal, nowMs = Date.now()) {
  if (!deal) return false;
  const status = deriveDealStatus(deal, nowMs);
  if (status !== "live") return false;
  if (effectiveApprovalStatus(deal) === "rejected") return false;
  if (dealRemaining(deal) <= 0) return false;
  if (!isDealWindowActive(deal, nowMs)) return false;
  const variantOk = true;
  return variantOk;
}

function dealMatchesVariant(deal, variantId) {
  const selected = String(variantId || "").trim();
  const allowed = Array.isArray(deal?.variantIds)
    ? deal.variantIds.map((id) => String(id || "").trim()).filter(Boolean)
    : [];
  if (allowed.length && selected && !allowed.includes(selected)) return false;
  const dealVariant = String(deal?.variantId || "").trim();
  if (!dealVariant) return true;
  if (!selected) return true;
  return dealVariant === selected;
}

function platformShareRatio(fundingSource, platformSharePct) {
  if (fundingSource === FUNDING_SELLER) return 0;
  if (fundingSource === FUNDING_SHARED) {
    const pct = Number(platformSharePct);
    const safe = Number.isFinite(pct) ? Math.min(100, Math.max(0, pct)) : 50;
    return safe / 100;
  }
  return 1;
}

function roundMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function isSellerBlockingDeal(deal, nowMs = Date.now()) {
  if (normalizeDealType(deal) !== DEAL_TYPE_SELLER) return false;
  const status = deriveDealStatus(deal, nowMs);
  if (status === "cancelled" || status === "ended") return false;
  if (effectiveApprovalStatus(deal) === "rejected") return false;
  return true;
}

function isPlatformBlockingDeal(deal, nowMs = Date.now()) {
  if (normalizeDealType(deal) !== DEAL_TYPE_PLATFORM) return false;
  const status = deriveDealStatus(deal, nowMs);
  if (status === "cancelled" || status === "ended" || status === "paused") {
    return false;
  }
  if (effectiveApprovalStatus(deal) === "rejected") return false;
  return true;
}

function canSellerMutateDeal(deal, sellerAdminId) {
  if (!deal) return { ok: false, message: "Flash Deal not found." };
  if (normalizeDealType(deal) === DEAL_TYPE_PLATFORM) {
    return { ok: false, message: "Sellers cannot edit Platform Flash Deals." };
  }
  const owned = String(deal.sellerAdminId || "").trim().toLowerCase();
  const wanted = String(sellerAdminId || "").trim().toLowerCase();
  if (!owned || !wanted || owned !== wanted) {
    return { ok: false, message: "You can only manage Flash Deals for your own listings." };
  }
  return { ok: true };
}

function getRegularSellingPrice(product, variantId = "") {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  const wanted = String(variantId || "").trim();
  const variant = wanted
    ? variants.find(
        (entry) =>
          String(entry?.id || entry?.variantId || "").trim() === wanted,
      )
    : null;
  const original =
    parseMoney(variant?.originalPrice) ??
    parseMoney(product?.originalPrice) ??
    parseMoney(product?.price) ??
    0;
  const sales =
    parseMoney(variant?.salesPrice) ?? parseMoney(product?.salesPrice);
  const sellingPrice =
    sales !== null && sales >= 0 && sales < original ? sales : original;
  return { originalPrice: original, sellingPrice };
}

function getProductSellableStock(product) {
  const stock = parseNonNegInt(product?.inventoryStock ?? product?.stock ?? 0);
  return stock === null ? 0 : stock;
}

function productSellerAdminId(product) {
  return String(
    product?.sellerAdminId ||
      product?.adminId ||
      product?.sellerId ||
      "",
  ).trim();
}

function productCategoryTokens(product) {
  const tokens = [];
  const push = (value) => {
    if (value && typeof value === "object") {
      push(value.id);
      push(value.categoryId);
      push(value.name);
      return;
    }
    const text = String(value || "").trim().toLowerCase();
    if (text) tokens.push(text);
  };
  push(product?.category);
  push(product?.categoryId);
  for (const value of Array.isArray(product?.categories) ? product.categories : []) {
    push(value);
  }
  for (const value of Array.isArray(product?.categoryIds) ? product.categoryIds : []) {
    push(value);
  }
  push(product?.brand);
  push(product?.brandId);
  push(product?.brandName);
  return tokens;
}

function normalizeProductSettings(raw) {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const next = {};
  for (const [key, value] of Object.entries(source)) {
    const productId = String(key || "").trim();
    if (!productId) continue;
    const row = value && typeof value === "object" ? value : {};
    const dealStock = parseNonNegInt(row.dealStock ?? row.dealStockLimit);
    const perBuyerLimit = parseNonNegInt(row.perBuyerLimit);
    const variantIds = (Array.isArray(row.variantIds) ? row.variantIds : [])
      .map((id) => String(id || "").trim())
      .filter(Boolean);
    next[productId] = {
      dealStock: dealStock > 0 ? dealStock : null,
      perBuyerLimit: perBuyerLimit > 0 ? perBuyerLimit : null,
      variantIds: [...new Set(variantIds)],
    };
  }
  return next;
}

function productCampaignSettings(campaign, productId) {
  const settings = campaign?.productSettings;
  if (!settings || typeof settings !== "object") return {};
  return settings[String(productId || "").trim()] || {};
}

function normalizeEligibility(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const scope = String(source.scope || "all").trim().toLowerCase() || "all";
  const list = (value) =>
    (Array.isArray(value) ? value : String(value || "").split(/[\s,]+/))
      .map((entry) => String(entry || "").trim())
      .filter(Boolean);
  return {
    scope,
    sellerAdminIds: list(source.sellerAdminIds).map((id) => id.toLowerCase()),
    categoryIds: list(source.categoryIds).map((id) => id.toLowerCase()),
    brandIds: list(source.brandIds).map((id) => id.toLowerCase()),
    productIds: list(source.productIds),
    excludeProductIds: list(source.excludeProductIds),
    minStock: parseNonNegInt(source.minStock) || 0,
    minPrice: parseMoney(source.minPrice) ?? 0,
    maxPrice: parseMoney(source.maxPrice),
    minDiscountPercent: parseMoney(source.minDiscountPercent),
    maxDiscountPercent: parseMoney(source.maxDiscountPercent),
  };
}

function productMatchesEligibility(product, eligibility, { dealPrice = null } = {}) {
  if (!product) return false;
  const rules = normalizeEligibility(eligibility);
  const productId = String(product.id || "").trim();
  if (!productId) return false;
  if (rules.excludeProductIds.includes(productId)) return false;
  if (rules.scope === "products" && !rules.productIds.includes(productId)) return false;
  if (rules.productIds.length && !rules.productIds.includes(productId)) {
    return false;
  }
  const sellerId = productSellerAdminId(product).toLowerCase();
  if (
    (rules.scope === "sellers" || rules.sellerAdminIds.length) &&
    rules.sellerAdminIds.length &&
    !rules.sellerAdminIds.includes(sellerId)
  ) {
    return false;
  }
  const tokens = productCategoryTokens(product);
  if (rules.categoryIds.length) {
    const hit = rules.categoryIds.some((id) => tokens.includes(id));
    if (!hit) return false;
  }
  if (rules.brandIds.length) {
    const hit = rules.brandIds.some((id) => tokens.includes(id));
    if (!hit) return false;
  }
  const stock = getProductSellableStock(product);
  if (stock < rules.minStock) return false;
  const { originalPrice } = getRegularSellingPrice(product);
  if (!(originalPrice > 0)) return false;
  if (originalPrice < rules.minPrice) return false;
  if (rules.maxPrice !== null && originalPrice > rules.maxPrice) return false;
  if (dealPrice !== null) {
    if (!(dealPrice > 0) || !(dealPrice < originalPrice)) return false;
    const percent = ((originalPrice - dealPrice) / originalPrice) * 100;
    if (
      rules.minDiscountPercent !== null &&
      percent < rules.minDiscountPercent
    ) {
      return false;
    }
    if (
      rules.maxDiscountPercent !== null &&
      percent > rules.maxDiscountPercent
    ) {
      return false;
    }
  }
  return true;
}

function computeCampaignDealPrice(campaign, regularPrice) {
  const type = String(campaign?.discountType || DISCOUNT_PERCENT)
    .trim()
    .toLowerCase();
  const value = parseMoney(campaign?.discountValue);
  if (value === null || !(regularPrice > 0)) return null;
  let price = null;
  if (type === DISCOUNT_FIXED) {
    // Legacy campaigns saved before Flash Deals became percentage-only.
    price = value;
  } else {
    if (value <= 0 || value >= 100) return null;
    let discount = regularPrice * (value / 100);
    const cap = parseMoney(campaign?.maxDiscountAmount);
    if (cap !== null && cap > 0) discount = Math.min(discount, cap);
    price = roundMoney(regularPrice - discount);
  }
  if (!(price > 0) || !(price < regularPrice)) return null;
  return price;
}

function campaignBudgetRemaining(campaign) {
  const budget = parseMoney(campaign?.budgetAmount);
  if (budget === null || budget <= 0) return Number.POSITIVE_INFINITY;
  const committed = Math.max(0, Number(campaign?.budgetCommitted) || 0);
  return Math.max(0, roundMoney(budget - committed));
}

function deriveCampaignStatus(campaign, nowMs = Date.now()) {
  const stored = String(campaign?.status || "").trim().toLowerCase();
  if (
    stored === "cancelled" ||
    stored === "draft" ||
    stored === "paused" ||
    stored === "ended"
  ) {
    return stored;
  }
  const startMs = Date.parse(String(campaign?.startsAt || ""));
  const endMs = Date.parse(String(campaign?.endsAt || ""));
  if (Number.isFinite(endMs) && nowMs >= endMs) return "ended";
  if (campaignBudgetRemaining(campaign) <= 0) return "budget_exhausted";
  if (Number.isFinite(startMs) && nowMs < startMs) return "scheduled";
  return "active";
}

function isCampaignActive(campaign, nowMs = Date.now()) {
  return deriveCampaignStatus(campaign, nowMs) === "active";
}

function normalizeTargetIds(value, { lowercase = false } = {}) {
  const seen = new Set();
  const ids = [];
  for (const entry of Array.isArray(value) ? value : []) {
    let id = String(entry ?? "").trim().slice(0, 120);
    if (lowercase) id = id.toLowerCase();
    const key = id.toLowerCase();
    if (!id || seen.has(key)) continue;
    seen.add(key);
    ids.push(id);
  }
  return ids.slice(0, 200);
}

function normalizeCampaign(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const discountType =
    String(source.discountType || DISCOUNT_PERCENT).trim().toLowerCase() ===
    DISCOUNT_FIXED
      ? DISCOUNT_FIXED
      : DISCOUNT_PERCENT;
  const fundingSource = normalizeFundingSource(source.fundingSource, DEAL_TYPE_PLATFORM);
  const maxDiscountAmount = parseMoney(source.maxDiscountAmount);
  const budgetAmount = parseMoney(source.budgetAmount);
  const sharePct = parseMoney(source.platformSharePct);
  return {
    id: String(source.id || "").trim(),
    name: String(source.name || "").trim() || "Platform Flash Deal",
    displayLabel: String(source.displayLabel || "").trim().slice(0, 60),
    platformIds: normalizeTargetIds(source.platformIds, { lowercase: true }).filter(
      (id) => id !== "all",
    ),
    businessTypeIds: normalizeTargetIds(source.businessTypeIds),
    startsAt: String(source.startsAt || "").trim(),
    endsAt: String(source.endsAt || "").trim(),
    status: String(source.status || "scheduled").trim().toLowerCase() || "scheduled",
    discountType,
    discountValue: parseMoney(source.discountValue),
    maxDiscountAmount: maxDiscountAmount !== null && maxDiscountAmount > 0 ? maxDiscountAmount : null,
    freeShipping: source.freeShipping === true || source.freeShipping === "true",
    budgetAmount: budgetAmount !== null && budgetAmount > 0 ? budgetAmount : null,
    budgetCommitted: Math.max(0, Number(source.budgetCommitted) || 0),
    fundingSource,
    platformSharePct:
      fundingSource === FUNDING_SHARED
        ? sharePct !== null && sharePct > 0 && sharePct < 100
          ? sharePct
          : 50
        : fundingSource === FUNDING_SELLER
          ? 0
          : 100,
    priority: Number.isFinite(Number(source.priority))
      ? Number(source.priority)
      : 100,
    eligibility: normalizeEligibility(source.eligibility),
    productSettings: normalizeProductSettings(source.productSettings),
    dealStockPerProduct: parseNonNegInt(source.dealStockPerProduct),
    perBuyerLimit: parseNonNegInt(source.perBuyerLimit) || 1,
    notes: String(source.notes || "").trim().slice(0, 500),
    createdBy: String(source.createdBy || "").trim(),
    createdAt: String(source.createdAt || "").trim(),
    updatedAt: String(source.updatedAt || "").trim(),
  };
}

function virtualPlatformDealId(campaignId, productId) {
  return `flash-plat:${String(campaignId || "").trim()}:${String(productId || "").trim()}`;
}

function parseVirtualPlatformDealId(dealId) {
  const raw = String(dealId || "").trim();
  const match = raw.match(/^flash-plat:([^:]+):(.+)$/);
  if (!match) return null;
  return { campaignId: match[1], productId: match[2] };
}

function comparePlatformCandidates(a, b) {
  const aPriority = Number(a?.priority) || 0;
  const bPriority = Number(b?.priority) || 0;
  if (bPriority !== aPriority) return bPriority - aPriority;
  const aSpecific = a?.specificity || 0;
  const bSpecific = b?.specificity || 0;
  if (bSpecific !== aSpecific) return bSpecific - aSpecific;
  return String(b?.createdAt || "").localeCompare(String(a?.createdAt || ""));
}

function eligibilitySpecificity(eligibility) {
  const rules = normalizeEligibility(eligibility);
  if (rules.productIds.length) return 400;
  if (rules.sellerAdminIds.length) return 300;
  if (rules.categoryIds.length || rules.brandIds.length) return 200;
  return 100;
}

function campaignDealStockLimit(campaign, product) {
  const sellable = getProductSellableStock(product);
  const settings = productCampaignSettings(campaign, product?.id);
  const requestedStock = settings.dealStock || campaign?.dealStockPerProduct;
  return requestedStock ? Math.min(requestedStock, sellable) : sellable;
}

function campaignToVirtualDeal(campaign, product, variantId = "") {
  if (!product) return null;
  const settings = productCampaignSettings(campaign, product.id);
  const variantIds = Array.isArray(settings.variantIds) ? settings.variantIds : [];
  const selectedVariant = String(variantId || "").trim();
  if (variantIds.length && selectedVariant && !variantIds.includes(selectedVariant)) {
    return null;
  }
  const { originalPrice, sellingPrice } = getRegularSellingPrice(product, selectedVariant);
  const flashPrice = computeCampaignDealPrice(campaign, sellingPrice);
  if (flashPrice === null) return null;
  if (!productMatchesEligibility(product, campaign.eligibility, { dealPrice: flashPrice })) {
    return null;
  }
  const stockCap = campaignDealStockLimit(campaign, product);
  if (stockCap < 1) return null;
  return hydrateDeal({
    id: virtualPlatformDealId(campaign.id, product.id),
    dealType: DEAL_TYPE_PLATFORM,
    campaignId: campaign.id,
    campaignName: campaign.name,
    campaignLabel: campaign.displayLabel || "",
    freeShipping: Boolean(campaign.freeShipping),
    productId: String(product.id || "").trim(),
    sellerAdminId: productSellerAdminId(product),
    variantIds,
    flashPrice,
    originalPriceSnapshot: originalPrice,
    regularPriceSnapshot: sellingPrice,
    dealStockLimit: stockCap,
    dealStockSold: 0,
    dealStockReserved: 0,
    perBuyerLimit: settings.perBuyerLimit || campaign.perBuyerLimit || 1,
    startsAt: campaign.startsAt,
    endsAt: campaign.endsAt,
    status: "live",
    approvalStatus: "approved",
    fundingSource: campaign.fundingSource,
    platformSharePct: campaign.platformSharePct,
    priority: campaign.priority,
    createdAt: campaign.createdAt,
    createdByRole: "super_admin",
    virtual: true,
  });
}

/**
 * Materialized campaign deals only track stock; price, schedule, variants and
 * limits always come from the live campaign so edits/pauses apply immediately.
 */
function applyCampaignToMaterializedDeal(deal, campaign, product, variantId = "") {
  const virtual = campaignToVirtualDeal(campaign, product, variantId);
  if (!virtual) return null;
  return {
    ...deal,
    flashPrice: virtual.flashPrice,
    originalPriceSnapshot: virtual.originalPriceSnapshot,
    regularPriceSnapshot: virtual.regularPriceSnapshot,
    startsAt: virtual.startsAt,
    endsAt: virtual.endsAt,
    perBuyerLimit: virtual.perBuyerLimit,
    variantIds: virtual.variantIds,
    campaignName: virtual.campaignName,
    campaignLabel: virtual.campaignLabel,
    freeShipping: virtual.freeShipping,
    fundingSource: virtual.fundingSource,
    platformSharePct: virtual.platformSharePct,
    priority: virtual.priority,
  };
}

function pickBestSellerDeal(deals, { productId, variantId, nowMs }) {
  const wanted = String(productId || "").trim();
  let best = null;
  for (const deal of Array.isArray(deals) ? deals : []) {
    const hydrated = hydrateDeal(deal);
    if (normalizeDealType(hydrated) !== DEAL_TYPE_SELLER) continue;
    if (String(hydrated.productId || "").trim() !== wanted) continue;
    if (!dealMatchesVariant(hydrated, variantId)) continue;
    if (!isUsableDeal(hydrated, nowMs)) continue;
    if (!best || String(hydrated.createdAt || "") > String(best.createdAt || "")) {
      best = hydrated;
    }
  }
  return best;
}

function pickBestPlatformDeal({
  product,
  variantId,
  deals,
  campaigns,
  nowMs,
}) {
  const productId = String(product?.id || "").trim();
  const candidates = [];
  const materializedCampaignIds = new Set();
  for (const deal of Array.isArray(deals) ? deals : []) {
    let hydrated = hydrateDeal(deal);
    if (normalizeDealType(hydrated) !== DEAL_TYPE_PLATFORM) continue;
    if (String(hydrated.productId || "").trim() !== productId) continue;
    const campaignId = String(hydrated.campaignId || "").trim();
    if (campaignId) materializedCampaignIds.add(campaignId);
    const campaign = campaignId
      ? (Array.isArray(campaigns) ? campaigns : []).find(
          (entry) => String(entry?.id || "").trim() === campaignId,
        )
      : null;
    if (campaign) {
      const normalized = normalizeCampaign(campaign);
      if (!isCampaignActive(normalized, nowMs)) continue;
      hydrated = applyCampaignToMaterializedDeal(hydrated, normalized, product, variantId);
      if (!hydrated) continue;
    }
    if (!dealMatchesVariant(hydrated, variantId)) continue;
    if (!isUsableDeal(hydrated, nowMs)) continue;
    candidates.push({
      deal: hydrated,
      priority: hydrated.priority,
      specificity: campaignId ? eligibilitySpecificity(campaign?.eligibility) : 350,
      createdAt: hydrated.createdAt,
    });
  }
  for (const campaign of Array.isArray(campaigns) ? campaigns : []) {
    const normalized = normalizeCampaign(campaign);
    if (!isCampaignActive(normalized, nowMs)) continue;
    // A materialized row owns this product's stock, even when sold out.
    if (materializedCampaignIds.has(normalized.id)) continue;
    const virtual = campaignToVirtualDeal(normalized, product, variantId);
    if (!virtual || !dealMatchesVariant(virtual, variantId)) continue;
    candidates.push({
      deal: virtual,
      priority: normalized.priority,
      specificity: eligibilitySpecificity(normalized.eligibility),
      createdAt: normalized.createdAt,
    });
  }
  if (!candidates.length) return null;
  candidates.sort(comparePlatformCandidates);
  return candidates[0].deal;
}

function emptyResolution(regularPrice) {
  return {
    regularPrice,
    finalPrice: regularPrice,
    dealPrice: null,
    dealType: null,
    dealId: "",
    campaignId: "",
    discountAmount: 0,
    sellerReceivable: regularPrice,
    platformSubsidy: 0,
    sellerDealPrice: null,
    platformDealPrice: null,
    startAt: "",
    endAt: "",
    overridden: false,
    overlapWarning: "",
    source: "regular",
  };
}

function resolveProductPrice({
  product,
  variantId = "",
  deals = [],
  campaigns = [],
  nowMs = Date.now(),
} = {}) {
  const { originalPrice, sellingPrice } = getRegularSellingPrice(product, variantId);
  if (!(originalPrice > 0)) {
    return emptyResolution(0);
  }
  const sellerDeal = pickBestSellerDeal(deals, {
    productId: product?.id,
    variantId,
    nowMs,
  });
  const platformDeal = pickBestPlatformDeal({
    product,
    variantId,
    deals,
    campaigns,
    nowMs,
  });

  if (platformDeal) {
    const customerPrice = Number(platformDeal.flashPrice);
    const funding = normalizeFundingSource(
      platformDeal.fundingSource,
      DEAL_TYPE_PLATFORM,
    );
    const sellerDealPrice = sellerDeal ? Number(sellerDeal.flashPrice) : null;
    const receivableBase = sellerDealPrice !== null ? sellerDealPrice : sellingPrice;
    const discountGap = Math.max(0, receivableBase - customerPrice);
    const platformSubsidy = roundMoney(
      discountGap * platformShareRatio(funding, platformDeal.platformSharePct),
    );
    const sellerReceivable = roundMoney(customerPrice + platformSubsidy);
    return {
      regularPrice: originalPrice,
      finalPrice: customerPrice,
      dealPrice: customerPrice,
      dealType: DEAL_TYPE_PLATFORM,
      dealId: platformDeal.id || "",
      campaignId: String(platformDeal.campaignId || "").trim(),
      discountAmount: Math.max(0, originalPrice - customerPrice),
      sellerReceivable,
      platformSubsidy,
      sellerDealPrice,
      platformDealPrice: customerPrice,
      startAt: platformDeal.startsAt || "",
      endAt: platformDeal.endsAt || "",
      overridden: Boolean(sellerDeal),
      overlapWarning: sellerDeal ? OVERLAP_WARNING : "",
      source: DEAL_TYPE_PLATFORM,
      deal: platformDeal,
      sellerDeal: sellerDeal || null,
    };
  }

  if (sellerDeal) {
    const customerPrice = Number(sellerDeal.flashPrice);
    return {
      regularPrice: originalPrice,
      finalPrice: customerPrice,
      dealPrice: customerPrice,
      dealType: DEAL_TYPE_SELLER,
      dealId: sellerDeal.id || "",
      campaignId: "",
      discountAmount: Math.max(0, originalPrice - customerPrice),
      sellerReceivable: customerPrice,
      platformSubsidy: 0,
      sellerDealPrice: customerPrice,
      platformDealPrice: null,
      startAt: sellerDeal.startsAt || "",
      endAt: sellerDeal.endsAt || "",
      overridden: false,
      overlapWarning: "",
      source: DEAL_TYPE_SELLER,
      deal: sellerDeal,
      sellerDeal,
    };
  }

  return emptyResolution(originalPrice);
}

function buildPriceSnapshot(resolved) {
  const result = resolved || emptyResolution(0);
  return {
    originalPrice: result.regularPrice,
    sellerDealPrice: result.sellerDealPrice,
    platformDealPrice: result.platformDealPrice,
    finalCustomerPrice: result.finalPrice,
    sellerReceivablePrice: result.sellerReceivable,
    platformSubsidy: result.platformSubsidy,
    appliedFlashDealId: result.dealId || "",
    appliedFlashDealType: result.dealType || "",
    campaignId: result.campaignId || "",
  };
}

function winningLiveDealsByProduct({ deals, campaigns, productsById, nowMs }) {
  const byProduct = new Map();
  for (const deal of Array.isArray(deals) ? deals : []) {
    const productId = String(deal?.productId || "").trim();
    if (productId) byProduct.set(productId, true);
  }
  for (const campaign of Array.isArray(campaigns) ? campaigns : []) {
    const normalized = normalizeCampaign(campaign);
    if (!isCampaignActive(normalized, nowMs)) continue;
    for (const productId of normalized.eligibility.productIds) {
      byProduct.set(productId, true);
    }
  }
  const winners = [];
  for (const productId of byProduct.keys()) {
    const product =
      productsById instanceof Map
        ? productsById.get(productId)
        : productsById?.[productId] || { id: productId };
    if (!product?.id) continue;
    const resolved = resolveProductPrice({
      product,
      deals,
      campaigns,
      nowMs,
    });
    if (resolved.deal && resolved.dealType) {
      winners.push(resolved);
    }
  }
  return winners;
}

function paginateEligibleProducts(products, campaign, { q = "", offset = 0, limit = 40 } = {}) {
  const normalized = normalizeCampaign(campaign);
  const query = String(q || "").trim().toLowerCase();
  const matched = [];
  for (const product of Array.isArray(products) ? products : []) {
    const { sellingPrice } = getRegularSellingPrice(product);
    const dealPrice = computeCampaignDealPrice(normalized, sellingPrice);
    if (!productMatchesEligibility(product, normalized.eligibility, { dealPrice })) {
      continue;
    }
    if (query) {
      const haystack = [
        product.id,
        product.name,
        productSellerAdminId(product),
        product.platformId,
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) continue;
    }
    matched.push(product);
  }
  const start = Math.max(0, Number(offset) || 0);
  const size = Math.max(1, Math.min(100, Number(limit) || 40));
  return {
    total: matched.length,
    products: matched.slice(start, start + size),
  };
}

module.exports = {
  DEAL_TYPE_SELLER,
  DEAL_TYPE_PLATFORM,
  FUNDING_SELLER,
  FUNDING_PLATFORM,
  FUNDING_SHARED,
  DISCOUNT_FIXED,
  DISCOUNT_PERCENT,
  OVERLAP_WARNING,
  parseMoney,
  parseNonNegInt,
  dealRemaining,
  normalizeDealType,
  normalizeFundingSource,
  hydrateDeal,
  effectiveApprovalStatus,
  deriveDealStatus,
  isDealWindowActive,
  isUsableDeal,
  dealMatchesVariant,
  isSellerBlockingDeal,
  isPlatformBlockingDeal,
  canSellerMutateDeal,
  getRegularSellingPrice,
  getProductSellableStock,
  productSellerAdminId,
  normalizeEligibility,
  normalizeProductSettings,
  productCampaignSettings,
  productMatchesEligibility,
  computeCampaignDealPrice,
  campaignBudgetRemaining,
  campaignDealStockLimit,
  applyCampaignToMaterializedDeal,
  platformShareRatio,
  deriveCampaignStatus,
  isCampaignActive,
  normalizeCampaign,
  virtualPlatformDealId,
  parseVirtualPlatformDealId,
  campaignToVirtualDeal,
  pickBestSellerDeal,
  pickBestPlatformDeal,
  resolveProductPrice,
  buildPriceSnapshot,
  winningLiveDealsByProduct,
  paginateEligibleProducts,
  comparePlatformCandidates,
};
