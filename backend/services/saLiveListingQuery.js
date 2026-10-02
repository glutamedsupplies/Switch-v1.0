"use strict";

/**
 * Server-side search, filters, sort, and paging for the Super Admin Live listing
 * view. Mirrors the client rules in super_admin.js (getFilteredProductRequests)
 * so the browser only receives the page it shows.
 */

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;
const AGING_REVIEW_HOURS = 48;

const CATEGORY_FILTERS = new Set(["with-category", "no-category"]);
const PRICING_FILTERS = new Set(["discounted", "regular-price", "missing-price"]);
const SIGNAL_FILTERS = new Set([
  "illegal-alert",
  "needs-revision",
  "aging-review",
  "multiple-media",
  "has-video",
  "missing-image",
]);
const SORT_VALUES = new Set([
  "newest",
  "oldest",
  "name-asc",
  "price-desc",
  "price-asc",
  "stock-desc",
  "reviews-desc",
]);

function normalizeChoice(value, allowed) {
  const normalized = String(value || "").trim().toLowerCase();
  return allowed.has(normalized) ? normalized : "all";
}

function normalizeSort(value) {
  const values = String(value || "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => SORT_VALUES.has(entry));
  const unique = [...new Set(values)];
  return unique.length ? unique : ["newest"];
}

function parseLiveListingQuery(searchParams) {
  const params = searchParams instanceof URLSearchParams ? searchParams : new URLSearchParams();
  const pageSizeRaw = Math.trunc(Number(params.get("pageSize")));
  const pageRaw = Math.trunc(Number(params.get("page")));
  return {
    search: String(params.get("q") || "").trim().toLowerCase().slice(0, 200),
    category: normalizeChoice(params.get("category"), CATEGORY_FILTERS),
    pricing: normalizeChoice(params.get("pricing"), PRICING_FILTERS),
    signal: normalizeChoice(params.get("signal"), SIGNAL_FILTERS),
    sort: normalizeSort(params.get("sort")),
    page: Number.isInteger(pageRaw) && pageRaw >= 1 ? pageRaw : 1,
    pageSize:
      Number.isInteger(pageSizeRaw) && pageSizeRaw >= 1
        ? Math.min(MAX_PAGE_SIZE, pageSizeRaw)
        : DEFAULT_PAGE_SIZE,
  };
}

function urlList(values) {
  const urls = [];
  const seen = new Set();
  const append = (value) => {
    if (Array.isArray(value)) {
      value.forEach(append);
      return;
    }
    const url = String(value || "").trim();
    const key = url.toLowerCase();
    if (!url || seen.has(key)) return;
    seen.add(key);
    urls.push(url);
  };
  append(values);
  return urls;
}

function categoryLabel(product) {
  const categories = Array.isArray(product?.categories)
    ? product.categories.map((category) => String(category || "").trim()).filter(Boolean)
    : [];
  const visible = categories.filter((category) => category.toLowerCase() !== "food");
  const fallback = String(product?.category || "").trim();
  if (
    fallback &&
    fallback.toLowerCase() !== "food" &&
    !visible.some((category) => category.toLowerCase() === fallback.toLowerCase())
  ) {
    visible.push(fallback);
  }
  return visible.join(", ");
}

function companyLabel(product) {
  return String(
    product?.companyName || product?.storeName || product?.businessName || product?.adminId || "Company",
  ).trim();
}

function priceValue(product) {
  const salesPrice = Number(product?.salesPrice);
  if (Number.isFinite(salesPrice) && salesPrice >= 0) return salesPrice;
  const originalPrice = Number(product?.originalPrice ?? product?.price);
  return Number.isFinite(originalPrice) && originalPrice >= 0 ? originalPrice : NaN;
}

function stockValue(product) {
  const stock = Number(product?.inventoryStock ?? product?.stock ?? 0);
  return Number.isFinite(stock) && stock >= 0 ? Math.trunc(stock) : 0;
}

function reviewCount(product) {
  const count = Number(
    product?.commentCount ??
      product?.reviewCount ??
      product?.reviewsCount ??
      product?.ratingCount ??
      product?.ratingsCount ??
      (Array.isArray(product?.reviews) ? product.reviews.length : 0),
  );
  return Number.isFinite(count) && count > 0 ? Math.trunc(count) : 0;
}

function ratingScore(product) {
  const count = Number(product?.ratingCount ?? product?.ratingsCount);
  const points = Number(product?.ratingPoints ?? product?.totalRatingPoints);
  const rating =
    Number.isFinite(count) && count > 0 && Number.isFinite(points)
      ? points / count
      : Number(product?.rating ?? product?.productRating ?? product?.averageRating);
  return Number.isFinite(rating) ? Math.min(5, Math.max(0, rating)) : 0;
}

function sortTimestamp(product) {
  const status = String(product?.approvalStatus || "pending").trim().toLowerCase();
  const candidates =
    status === "approved"
      ? [product?.approvedAt, product?.approvalUpdatedAt, product?.submittedAt, product?.createdAt, product?.updatedAt]
      : status === "rejected"
        ? [product?.rejectedAt, product?.approvalUpdatedAt, product?.submittedAt, product?.createdAt, product?.updatedAt]
        : [product?.submittedAt, product?.createdAt, product?.updatedAt, product?.approvalUpdatedAt];
  for (const value of candidates) {
    const timestamp = new Date(value || "").getTime();
    if (!Number.isNaN(timestamp)) return timestamp;
  }
  return 0;
}

function ageHours(product, nowMs) {
  if (Number.isFinite(Number(product?.reviewAgeHours))) {
    return Math.max(0, Number(product.reviewAgeHours));
  }
  const timestamp = new Date(product?.submittedAt || product?.createdAt || product?.updatedAt || "").getTime();
  return Number.isNaN(timestamp) ? 0 : Math.max(0, (nowMs - timestamp) / 3600000);
}

function rejectedEvidenceMatch(product) {
  const match =
    product?.yoloInspection?.rejectedEvidenceMatch ?? product?.rejectedEvidenceMatch ?? product?.illegalProductMatch;
  if (!match || typeof match !== "object") return false;
  const score = Number(match.score ?? match.visualSearchScore ?? match.confidence);
  const threshold = Number(match.threshold ?? 0);
  return (
    match.flagged === true ||
    String(match.status || "").trim().toLowerCase() === "matched" ||
    (Number.isFinite(score) && Number.isFinite(threshold) && threshold > 0 && score >= threshold)
  );
}

function revisionSignal(product) {
  const revision = product?.yoloRevision ?? product?.revisionSignal;
  if (!revision || typeof revision !== "object") return false;
  const status = String(revision.status || "").trim().toLowerCase();
  return revision.flagged === true || status === "suggested" || status === "requested";
}

function hasImage(product) {
  return (
    urlList([
      product?.cardImageUrl,
      product?.mainImageUrl,
      product?.imageUrl,
      product?.imageUrls,
      product?.listingImageUrls,
    ]).length > 0
  );
}

function moneySearchText(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "";
  const formatted = amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `\u20B1 ${formatted} ${amount}`;
}

function createdDayText(product) {
  const date = new Date(product?.createdAt || product?.submittedAt || product?.updatedAt || "");
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function searchText(product) {
  return [
    product?.name,
    product?.category,
    Array.isArray(product?.categories) ? product.categories.join(" ") : "",
    companyLabel(product),
    product?.description,
    product?.sku,
    product?.id,
    rejectedEvidenceMatch(product) ? "illegal product rejected evidence yolo flagged" : "",
    revisionSignal(product) ? "revision needs edit category mismatch caution" : "",
    moneySearchText(product?.salesPrice ?? product?.originalPrice ?? product?.price),
    reviewCount(product),
    ratingScore(product).toFixed(1),
    createdDayText(product),
  ]
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean)
    .join(" ");
}

function matchesFilters(product, query, nowMs) {
  const hasCategory = Boolean(categoryLabel(product));
  if (query.category === "with-category" && !hasCategory) return false;
  if (query.category === "no-category" && hasCategory) return false;

  if (query.pricing !== "all") {
    const salesPrice = Number(product?.salesPrice);
    const originalPrice = Number(product?.originalPrice ?? product?.price);
    const display = priceValue(product);
    const hasPrice = Number.isFinite(display) && display >= 0;
    const hasDiscount =
      Number.isFinite(salesPrice) &&
      salesPrice >= 0 &&
      Number.isFinite(originalPrice) &&
      originalPrice > 0 &&
      salesPrice < originalPrice;
    if (query.pricing === "discounted" && !hasDiscount) return false;
    if (query.pricing === "regular-price" && (!hasPrice || hasDiscount)) return false;
    if (query.pricing === "missing-price" && hasPrice) return false;
  }

  if (query.signal !== "all") {
    const status = String(product?.approvalStatus || "pending").trim().toLowerCase();
    const images = urlList([product?.imageUrls, product?.imageUrl, product?.mainImageUrl]).length;
    const videos = urlList([product?.videoUrls, product?.videoUrl]).length;
    const signals = {
      "illegal-alert": status === "rejected" || rejectedEvidenceMatch(product),
      "needs-revision": revisionSignal(product),
      "aging-review": Boolean(product?.isAgingReview) || ageHours(product, nowMs) >= AGING_REVIEW_HOURS,
      "multiple-media": images > 1 || videos > 0,
      "has-video": videos > 0,
      "missing-image": !hasImage(product),
    };
    if (!signals[query.signal]) return false;
  }
  return true;
}

function compareNames(left, right) {
  return String(left?.name || "Unnamed product").localeCompare(String(right?.name || "Unnamed product"), undefined, {
    sensitivity: "base",
  });
}

function compareBy(left, right, sortValue) {
  if (sortValue === "oldest") return sortTimestamp(left) - sortTimestamp(right);
  if (sortValue === "name-asc") return compareNames(left, right);
  if (sortValue === "price-desc" || sortValue === "price-asc") {
    const missing = sortValue === "price-desc" ? -Infinity : Infinity;
    const leftPrice = Number.isFinite(priceValue(left)) ? priceValue(left) : missing;
    const rightPrice = Number.isFinite(priceValue(right)) ? priceValue(right) : missing;
    if (leftPrice === rightPrice) return 0;
    return sortValue === "price-desc" ? (rightPrice > leftPrice ? 1 : -1) : leftPrice > rightPrice ? 1 : -1;
  }
  if (sortValue === "stock-desc") return stockValue(right) - stockValue(left);
  if (sortValue === "reviews-desc") return reviewCount(right) - reviewCount(left);
  return sortTimestamp(right) - sortTimestamp(left);
}

function filterAndSortLiveListings(products, query, { nowMs = Date.now() } = {}) {
  const list = Array.isArray(products) ? products : [];
  return list
    .filter((product) => matchesFilters(product, query, nowMs))
    .filter((product) => !query.search || searchText(product).includes(query.search))
    .sort((left, right) => {
      for (const sortValue of query.sort) {
        const result = compareBy(left, right, sortValue);
        if (result !== 0) return result;
      }
      return compareNames(left, right);
    });
}

/**
 * Returns only the requested page. When `focusId` is in the filtered result,
 * the page that contains it wins so notification deep links still land on the card.
 */
function paginateLiveListings(products, query, { focusId = "", nowMs = Date.now() } = {}) {
  const filtered = filterAndSortLiveListings(products, query, { nowMs });
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
  let page = Math.min(Math.max(1, query.page), totalPages);
  const focus = String(focusId || "").trim();
  if (focus) {
    const focusIndex = filtered.findIndex((product) => String(product?.id ?? "").trim() === focus);
    if (focusIndex >= 0) page = Math.floor(focusIndex / query.pageSize) + 1;
  }
  const start = (page - 1) * query.pageSize;
  return {
    items: filtered.slice(start, start + query.pageSize),
    total,
    page,
    pageSize: query.pageSize,
    totalPages,
  };
}

module.exports = {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  filterAndSortLiveListings,
  paginateLiveListings,
  parseLiveListingQuery,
};
