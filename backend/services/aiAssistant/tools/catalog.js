"use strict";

const { money, cleanText } = require("./common");

/**
 * Shared, read-only view over the public catalog. Products always come from
 * the existing products route and prices from the Flash Deal pricing engine,
 * so the assistant never shows a price or stock figure the backend did not
 * produce.
 */
function createCatalogService({ flashDealPricing, flashDealsApi, now = () => Date.now(), cacheMs = 20000 }) {
  let cache = null;
  let inflight = null;

  async function loadDealContext() {
    const [deals, campaigns] = await Promise.all([
      typeof flashDealsApi?.readFlashDeals === "function" ? flashDealsApi.readFlashDeals().catch(() => []) : [],
      typeof flashDealsApi?.readFlashCampaigns === "function" ? flashDealsApi.readFlashCampaigns().catch(() => []) : [],
    ]);
    return { deals: Array.isArray(deals) ? deals : [], campaigns: Array.isArray(campaigns) ? campaigns : [] };
  }

  async function fetchCatalog(ctx) {
    const result = await ctx.dispatch({
      method: "GET",
      path: "/api/products",
      query: { approvalStatus: "approved" },
    });
    if (result.status !== 200) {
      const error = new Error(result.body?.message || "The product catalog is unavailable right now.");
      error.statusCode = result.status || 502;
      throw error;
    }
    const products = (Array.isArray(result.body?.products) ? result.body.products : []).filter(isSellable);
    const dealContext = await loadDealContext();
    return { products, byId: new Map(products.map((product) => [String(product.id), product])), dealContext, loadedAt: now() };
  }

  async function load(ctx, { fresh = false } = {}) {
    if (!fresh && cache && now() - cache.loadedAt < cacheMs) return cache;
    if (!fresh && inflight) return inflight;
    const task = fetchCatalog(ctx).then((value) => {
      cache = value;
      return value;
    });
    if (!fresh) {
      inflight = task.finally(() => {
        inflight = null;
      });
      return inflight;
    }
    return task;
  }

  function invalidate() {
    cache = null;
  }

  function priceFor(product, variantId, dealContext) {
    const regular = flashDealPricing.getRegularSellingPrice(product, variantId || "");
    const resolution = flashDealPricing.resolveProductPrice({
      product,
      variantId: variantId || "",
      deals: dealContext?.deals || [],
      campaigns: dealContext?.campaigns || [],
      nowMs: now(),
    });
    const hasDeal = Boolean(resolution?.dealType) && Number(resolution.finalPrice) > 0;
    const finalPrice = hasDeal ? money(resolution.finalPrice) : money(regular.sellingPrice);
    return {
      price: finalPrice,
      originalPrice: money(regular.originalPrice),
      regularPrice: money(regular.sellingPrice),
      discountPercent:
        regular.originalPrice > finalPrice && regular.originalPrice > 0
          ? Math.round(((regular.originalPrice - finalPrice) / regular.originalPrice) * 100)
          : 0,
      deal: hasDeal
        ? {
            id: String(resolution.dealId || ""),
            type: String(resolution.dealType || ""),
            endsAt: String(resolution.endAt || ""),
            freeShipping: Boolean(resolution.deal?.freeShipping),
          }
        : null,
    };
  }

  return { load, invalidate, priceFor };
}

function isSellable(product) {
  if (!product || !product.id) return false;
  if (product.isActive === false) return false;
  if (product.companyIsBanned === true || product.sellerIsBanned === true) return false;
  return true;
}

function productStock(product) {
  const raw = product?.inventoryStock ?? product?.stock;
  const value = Math.trunc(Number(raw));
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function productVariants(product) {
  return (Array.isArray(product?.variants) ? product.variants : [])
    .map((variant) => ({
      id: String(variant?.id ?? variant?.variantId ?? "").trim(),
      name: cleanText(variant?.name ?? variant?.label ?? "", 120),
      stock: Math.max(0, Math.trunc(Number(variant?.stock) || 0)),
      raw: variant,
    }))
    .filter((variant) => variant.id && variant.name);
}

/** Product-level stock is always authoritative; variant stock only narrows it when the seller tracks it. */
function variantAvailability(product, variantId) {
  const base = productStock(product);
  const variants = productVariants(product);
  if (!variants.length) return base;
  const tracked = variants.some((variant) => variant.stock > 0);
  if (!variantId) return tracked ? 0 : base;
  const variant = variants.find((entry) => entry.id === variantId);
  if (!variant) return 0;
  return tracked ? Math.min(base, variant.stock) : base;
}

function productImage(product) {
  const urls = Array.isArray(product?.imageUrls) ? product.imageUrls : [];
  return String(product?.mainImageUrl || product?.imageUrl || urls[0] || "").trim();
}

function productSellerName(product) {
  return cleanText(product?.companyName || product?.storeName || product?.businessName || "", 120);
}

function productCategories(product) {
  const list = Array.isArray(product?.categories) ? product.categories : [];
  return [...new Set([product?.category, ...list].map((entry) => cleanText(entry, 80)).filter(Boolean))];
}

function productSearchText(product) {
  return [
    product?.name,
    product?.description,
    productCategories(product).join(" "),
    productVariants(product).map((variant) => variant.name).join(" "),
    productSellerName(product),
    product?.brand,
  ]
    .map((part) => String(part ?? "").toLowerCase())
    .join(" \u0001 ");
}

module.exports = {
  createCatalogService,
  isSellable,
  productStock,
  productVariants,
  variantAvailability,
  productImage,
  productSellerName,
  productCategories,
  productSearchText,
};
