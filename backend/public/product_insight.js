const totalProductsEl = document.getElementById("product-insight-total-products");
const topSoldEl = document.getElementById("product-insight-top-sold");
const topRatingEl = document.getElementById("product-insight-top-rating");
const ratedProductsEl = document.getElementById("product-insight-rated-products");
const soldCountPillEl = document.getElementById("product-insight-sold-count-pill");
const reviewCountPillEl = document.getElementById("product-insight-review-count-pill");
const soldListEl = document.getElementById("product-insight-sold-list");
const sideDetailEl = document.getElementById("product-insight-side-detail");
const soldToolsEl = document.getElementById("product-insight-sold-tools");
const reviewSearchShellEl = document.getElementById("product-insight-review-search-shell");
const reviewSearchInput = document.getElementById("product-insight-review-search");
const leaderGridEl = document.getElementById("product-insight-leader-grid");
const soldSearchInput = document.getElementById("product-insight-sold-search");
const soldCategoryFilterDropdown = document.getElementById("product-insight-category-filter");
const soldCategoryFilterTrigger = document.getElementById("product-insight-category-filter-trigger");
const soldCategoryFilterSummary = document.getElementById("product-insight-category-filter-summary");
const soldCategoryFilterMenu = document.getElementById("product-insight-category-filter-menu");
const soldMetricFilterDropdown = document.getElementById("product-insight-metric-filter");
const soldMetricFilterTrigger = document.getElementById("product-insight-metric-filter-trigger");
const soldMetricFilterSummary = document.getElementById("product-insight-metric-filter-summary");
const soldMetricFilterMenu = document.getElementById("product-insight-metric-filter-menu");
const timeframeFilterButtons = Array.from(
  document.querySelectorAll("[data-product-insight-range-filter]"),
);
const sideViewButtons = Array.from(
  document.querySelectorAll("[data-product-insight-side-view]"),
);
let currentProductInsightProducts = [];
let soldCategoryFilter = "";
let soldMetricFilter = "all";
let soldRangeFilter = "all";
let selectedSoldProductId = "";
let activeProductInsightSideView = "sold";
let reviewSearchTerm = "";
let soldSearchTimer = 0;
let reviewSearchTimer = 0;
let productInsightStarGradientId = 0;
let reviewSortMode = "relevant";
let reviewRatingFilter = "";
let activeProductInsightReviewModalOverlay = null;
let activeProductInsightReviewModalKeyHandler = null;
let productInsightScrollProxyEl = null;
let productInsightScrollProxySpacerEl = null;
let isSyncingProductInsightScrollProxy = false;
let productInsightScrollProxyFrame = 0;
let productInsightSoldSpacerFrame = 0;
const productInsightChartViewportState = new Map();
const PRODUCT_INSIGHT_METRIC_FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "sold", label: "Top Sold" },
  { value: "rating", label: "Top Rating" },
  { value: "income", label: "Total Income" },
];
const PRODUCT_INSIGHT_SOLD_ICON_MARKUP = `
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M21 11L13.4059 3.40589C12.887 2.88703 12.6276 2.6276 12.3249 2.44208C12.0564 2.27759 11.7638 2.15638 11.4577 2.08289C11.1124 2 10.7455 2 10.0118 2L6 2M3 8.7L3 10.6745C3 11.1637 3 11.4083 3.05526 11.6385C3.10425 11.8425 3.18506 12.0376 3.29472 12.2166C3.4184 12.4184 3.59136 12.5914 3.93726 12.9373L11.7373 20.7373C12.5293 21.5293 12.9253 21.9253 13.382 22.0737C13.7837 22.2042 14.2163 22.2042 14.618 22.0737C15.0747 21.9253 15.4707 21.5293 16.2627 20.7373L18.7373 18.2627C19.5293 17.4707 19.9253 17.0747 20.0737 16.618C20.2042 16.2163 20.2042 15.7837 20.0737 15.382C19.9253 14.9253 19.5293 14.5293 18.7373 13.7373L11.4373 6.43726C11.0914 6.09136 10.9184 5.9184 10.7166 5.79472C10.5376 5.68506 10.3425 5.60425 10.1385 5.55526C9.90829 5.5 9.6637 5.5 9.17452 5.5H6.2C5.0799 5.5 4.51984 5.5 4.09202 5.71799C3.7157 5.90973 3.40973 6.21569 3.21799 6.59202C3 7.01984 3 7.57989 3 8.7Z"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
    ></path>
  </svg>
`;
const PRODUCT_INSIGHT_TOTAL_INCOME_ICON_MARKUP = `
  <svg viewBox="0 0 1024 1024" fill="currentColor" aria-hidden="true">
    <path d="M256 640v192h640V384H768v-64h150.976c14.272 0 19.456 1.472 24.64 4.288a29.056 29.056 0 0 1 12.16 12.096c2.752 5.184 4.224 10.368 4.224 24.64v493.952c0 14.272-1.472 19.456-4.288 24.64a29.056 29.056 0 0 1-12.096 12.16c-5.184 2.752-10.368 4.224-24.64 4.224H233.024c-14.272 0-19.456-1.472-24.64-4.288a29.056 29.056 0 0 1-12.16-12.096c-2.688-5.184-4.224-10.368-4.224-24.576V640h64z"></path>
    <path d="M768 192H128v448h640V192zm64-22.976v493.952c0 14.272-1.472 19.456-4.288 24.64a29.056 29.056 0 0 1-12.096 12.16c-5.184 2.752-10.368 4.224-24.64 4.224H105.024c-14.272 0-19.456-1.472-24.64-4.288a29.056 29.056 0 0 1-12.16-12.096C65.536 682.432 64 677.248 64 663.04V169.024c0-14.272 1.472-19.456 4.288-24.64a29.056 29.056 0 0 1 12.096-12.16C85.568 129.536 90.752 128 104.96 128h685.952c14.272 0 19.456 1.472 24.64 4.288a29.056 29.056 0 0 1 12.16 12.096c2.752 5.184 4.224 10.368 4.224 24.64z"></path>
    <path d="M448 576a160 160 0 1 1 0-320 160 160 0 0 1 0 320zm0-64a96 96 0 1 0 0-192 96 96 0 0 0 0 192z"></path>
  </svg>
`;
const PRODUCT_INSIGHT_RATING_ICON_MARKUP = `
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2.2 14.95 8.18 21.55 9.14 16.78 13.79 17.91 20.35 12 17.24 6.09 20.35 7.22 13.79 2.45 9.14 9.05 8.18 12 2.2Z"></path>
  </svg>
`;
const PRODUCT_INSIGHT_REVIEWS_ICON_MARKUP = `
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M5.25 5.75h13.5a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2H10.4L6.2 20.4a.6.6 0 0 1-.95-.48v-2.67a2 2 0 0 1-2-2v-7.5a2 2 0 0 1 2-2Z"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
    ></path>
    <path
      d="M7.75 9.5h8.5M7.75 13h5.5"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
    ></path>
  </svg>
`;

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function readProductInsightSessionStorageJson(key) {
  try {
    return JSON.parse(window.sessionStorage?.getItem(key) || "null");
  } catch (error) {
    return null;
  }
}

function normalizeProductInsightAdminTenantId(value, fallback = "") {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || fallback;
}

function resolveProductInsightAdminTenantIdFromSession(session, fallback = "") {
  if (!session || typeof session !== "object") {
    return fallback;
  }

  return [
    session.adminId,
    session.ownerAdminId,
    session.tenantId,
    session.workspaceId,
    session.storeAdminId,
    session.id,
    session.accountCode,
  ]
    .map((value) => normalizeProductInsightAdminTenantId(value, ""))
    .find(Boolean) || fallback;
}

function getActiveProductInsightAdminTenantId() {
  const adminSession = readProductInsightSessionStorageJson("gms-admin-session");
  const adminId = resolveProductInsightAdminTenantIdFromSession(adminSession, "");
  if (adminId) {
    return adminId;
  }

  const employeeSession = readProductInsightSessionStorageJson("gms-employee-session");
  const employeeAdminId = resolveProductInsightAdminTenantIdFromSession(employeeSession, "");
  if (employeeAdminId) {
    return employeeAdminId;
  }

  try {
    return normalizeProductInsightAdminTenantId(window.localStorage?.getItem("gms-admin-id"), "");
  } catch (error) {
    return "";
  }
}

function withProductInsightAdminTenantHeaders(headers = {}) {
  const adminId = getActiveProductInsightAdminTenantId();
  if (!adminId) {
    return headers;
  }

  return {
    ...headers,
    "X-GMS-Admin-ID": adminId,
  };
}

async function loadProductInsightJson(path) {
  const response = await fetch(path, {
    cache: "no-store",
    headers: withProductInsightAdminTenantHeaders({ Accept: "application/json" }),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `Request failed: ${response.status}`);
  }

  return data;
}

function getProductInsightOrderProductId(order) {
  return String(order?.productId ?? order?.productID ?? order?.itemProductId ?? "").trim();
}

function getProductInsightOrderAccountId(order) {
  return String(
    order?.accountId
    ?? order?.customerAccountId
    ?? order?.userAccountId
    ?? order?.userId
    ?? order?.uid
    ?? order?.accountEmail
    ?? order?.userEmail
    ?? order?.email
    ?? "",
  ).trim();
}

function isProductInsightRealOrderAccountId(accountId) {
  const normalizedAccountId = String(accountId ?? "").trim().toLowerCase();
  if (!normalizedAccountId) {
    return false;
  }

  return !(
    normalizedAccountId === "guest" ||
    normalizedAccountId === "anonymous" ||
    normalizedAccountId === "unknown" ||
    normalizedAccountId === "test" ||
    normalizedAccountId.startsWith("guest_") ||
    normalizedAccountId.startsWith("guest-") ||
    normalizedAccountId.startsWith("anonymous_") ||
    normalizedAccountId.startsWith("anonymous-") ||
    normalizedAccountId.startsWith("test_") ||
    normalizedAccountId.startsWith("test-") ||
    normalizedAccountId.startsWith("sample_") ||
    normalizedAccountId.startsWith("sample-")
  );
}

function isProductInsightPlacedOrder(order) {
  if (!order || typeof order !== "object") {
    return false;
  }

  const productId = getProductInsightOrderProductId(order);
  if (!productId || !isProductInsightRealOrderAccountId(getProductInsightOrderAccountId(order))) {
    return false;
  }

  const stage = String(order.stage ?? order.status ?? "").trim().toLowerCase();
  const cancelStatus = String(order.cancelRequestStatus ?? "").trim().toLowerCase();
  return stage !== "cancelled" && cancelStatus !== "accepted";
}

function getProductInsightOrderDate(order) {
  const epochMs = Math.trunc(
    toNumber(order?.createdAtEpochMs ?? order?.placedAtEpochMs ?? order?.createdAtMs),
  );
  if (epochMs > 0) {
    const date = new Date(epochMs);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  const timestamp = [
    order?.createdAt,
    order?.placedAt,
    order?.orderDate,
    order?.timestamp,
    order?.date,
  ]
    .map((value) => String(value ?? "").trim())
    .find(Boolean);
  const date = timestamp ? new Date(timestamp) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function getProductInsightOrderQuantity(order) {
  const quantity = Math.trunc(toNumber(order?.quantity ?? order?.count ?? order?.qty));
  return quantity > 0 ? quantity : 0;
}

function getProductInsightOrderIncome(order, quantity) {
  const normalizedQuantity = Math.max(0, Math.trunc(toNumber(quantity)));
  const unitPrice = toNumber(order?.unitPrice ?? order?.productUnitPrice ?? order?.itemPrice);
  if (unitPrice > 0 && normalizedQuantity > 0) {
    return unitPrice * normalizedQuantity;
  }

  const directSubtotal = toNumber(
    order?.productSubtotalAmount
    ?? order?.lineTotalAmount
    ?? order?.itemTotalAmount
    ?? order?.productTotalAmount
    ?? order?.subtotalAmount,
  );
  if (directSubtotal > 0) {
    return directSubtotal;
  }

  const grandTotal = toNumber(
    order?.grandTotalAmount
    ?? order?.amount
    ?? order?.total
    ?? order?.price,
  );
  const shippingFee = toNumber(order?.shippingFeeAmount ?? order?.deliveryFeeAmount);
  return Math.max(0, grandTotal - Math.max(0, shippingFee));
}

function getProductInsightRangeStart(range, referenceDate = new Date()) {
  const date = referenceDate instanceof Date ? new Date(referenceDate) : new Date();
  switch (normalizeProductInsightSoldRange(range)) {
    case "daily":
      return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    case "weekly": {
      const weekStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayOfWeek = weekStart.getDay();
      weekStart.setDate(weekStart.getDate() + (dayOfWeek === 0 ? -6 : 1 - dayOfWeek));
      return weekStart;
    }
    case "monthly":
      return new Date(date.getFullYear(), date.getMonth(), 1);
    case "yearly":
      return new Date(date.getFullYear(), 0, 1);
    default:
      return null;
  }
}

function getProductInsightRangeEnd(range, referenceDate = new Date()) {
  const start = getProductInsightRangeStart(range, referenceDate);
  if (!start) {
    return null;
  }

  switch (normalizeProductInsightSoldRange(range)) {
    case "daily": {
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      return end;
    }
    case "weekly": {
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      return end;
    }
    case "monthly":
      return new Date(start.getFullYear(), start.getMonth() + 1, 1);
    case "yearly":
      return new Date(start.getFullYear() + 1, 0, 1);
    default:
      return null;
  }
}

function isProductInsightDateInRange(date, range, referenceDate = new Date()) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return false;
  }

  const start = getProductInsightRangeStart(range, referenceDate);
  const end = getProductInsightRangeEnd(range, referenceDate);
  return Boolean(start && end && date >= start && date < end);
}

function createProductInsightOrderMetricBucket() {
  const currentDayOfMonth = Math.max(1, new Date().getDate());
  return {
    sold: 0,
    income: 0,
    soldByRange: {
      daily: 0,
      weekly: 0,
      monthly: 0,
      yearly: 0,
    },
    incomeByRange: {
      daily: 0,
      weekly: 0,
      monthly: 0,
      yearly: 0,
    },
    soldHistory: {
      daily: Array(24).fill(0),
      weekly: Array(6).fill(0),
      monthly: Array(currentDayOfMonth).fill(0),
      yearly: Array(12).fill(0),
    },
    incomeHistory: {
      daily: Array(24).fill(0),
      weekly: Array(6).fill(0),
      monthly: Array(currentDayOfMonth).fill(0),
      yearly: Array(12).fill(0),
    },
  };
}

function getProductInsightMetricBucket(map, productId) {
  const normalizedProductId = String(productId ?? "").trim();
  if (!normalizedProductId) {
    return null;
  }

  if (!map.has(normalizedProductId)) {
    map.set(normalizedProductId, createProductInsightOrderMetricBucket());
  }

  return map.get(normalizedProductId);
}

function addProductInsightMetricValue(bucket, metricType, range, index, amount) {
  const normalizedRange = normalizeProductInsightSoldRange(range);
  const value = Math.max(0, Math.trunc(toNumber(amount)));
  if (!bucket || value <= 0 || normalizedRange === "all") {
    return;
  }

  bucket[`${metricType}ByRange`][normalizedRange] += value;
  const history = bucket[`${metricType}History`][normalizedRange];
  if (Array.isArray(history) && index >= 0 && index < history.length) {
    history[index] += value;
  }
}

function applyProductInsightOrderMetricToRanges(bucket, date, quantity, income) {
  const normalizedQuantity = Math.max(0, Math.trunc(toNumber(quantity)));
  const normalizedIncome = Math.max(0, toNumber(income));
  const referenceDate = new Date();

  if (isProductInsightDateInRange(date, "daily", referenceDate)) {
    const hourIndex = date.getHours();
    addProductInsightMetricValue(bucket, "sold", "daily", hourIndex, normalizedQuantity);
    addProductInsightMetricValue(bucket, "income", "daily", hourIndex, normalizedIncome);
  }

  if (isProductInsightDateInRange(date, "weekly", referenceDate)) {
    const dayOfWeek = date.getDay();
    const weekIndex = dayOfWeek === 0 ? -1 : dayOfWeek - 1;
    addProductInsightMetricValue(bucket, "sold", "weekly", weekIndex, normalizedQuantity);
    addProductInsightMetricValue(bucket, "income", "weekly", weekIndex, normalizedIncome);
  }

  if (isProductInsightDateInRange(date, "monthly", referenceDate)) {
    const monthIndex = date.getDate() - 1;
    addProductInsightMetricValue(bucket, "sold", "monthly", monthIndex, normalizedQuantity);
    addProductInsightMetricValue(bucket, "income", "monthly", monthIndex, normalizedIncome);
  }

  if (isProductInsightDateInRange(date, "yearly", referenceDate)) {
    const yearIndex = date.getMonth();
    addProductInsightMetricValue(bucket, "sold", "yearly", yearIndex, normalizedQuantity);
    addProductInsightMetricValue(bucket, "income", "yearly", yearIndex, normalizedIncome);
  }
}

function buildProductInsightOrderMetricMap(orders) {
  const metricMap = new Map();

  for (const order of Array.isArray(orders) ? orders : []) {
    if (!isProductInsightPlacedOrder(order)) {
      continue;
    }

    const productId = getProductInsightOrderProductId(order);
    const quantity = getProductInsightOrderQuantity(order);
    if (quantity <= 0) {
      continue;
    }

    const bucket = getProductInsightMetricBucket(metricMap, productId);
    if (!bucket) {
      continue;
    }

    const income = getProductInsightOrderIncome(order, quantity);
    const orderDate = getProductInsightOrderDate(order);
    bucket.sold += quantity;
    bucket.income += Math.max(0, toNumber(income));

    if (orderDate) {
      applyProductInsightOrderMetricToRanges(bucket, orderDate, quantity, income);
    }
  }

  return metricMap;
}

function attachProductInsightOrderMetrics(products, orders) {
  const metricMap = buildProductInsightOrderMetricMap(orders);
  return (Array.isArray(products) ? products : []).map((product) => {
    const productId = getProductInsightProductIdentifier(product);
    const bucket = metricMap.get(productId) ?? createProductInsightOrderMetricBucket();
    return {
      ...product,
      __appOrderSold: Math.max(0, Math.trunc(toNumber(bucket.sold))),
      __appOrderTotalIncome: Math.max(0, toNumber(bucket.income)),
      __appOrderDailySold: bucket.soldByRange.daily,
      __appOrderWeeklySold: bucket.soldByRange.weekly,
      __appOrderMonthlySold: bucket.soldByRange.monthly,
      __appOrderYearlySold: bucket.soldByRange.yearly,
      __appOrderDailyIncome: bucket.incomeByRange.daily,
      __appOrderWeeklyIncome: bucket.incomeByRange.weekly,
      __appOrderMonthlyIncome: bucket.incomeByRange.monthly,
      __appOrderYearlyIncome: bucket.incomeByRange.yearly,
      __appOrderDailySoldHistory: [...bucket.soldHistory.daily],
      __appOrderWeeklySoldHistory: [...bucket.soldHistory.weekly],
      __appOrderMonthlySoldHistory: [...bucket.soldHistory.monthly],
      __appOrderYearlySoldHistory: [...bucket.soldHistory.yearly],
      __appOrderDailyIncomeHistory: [...bucket.incomeHistory.daily],
      __appOrderWeeklyIncomeHistory: [...bucket.incomeHistory.weekly],
      __appOrderMonthlyIncomeHistory: [...bucket.incomeHistory.monthly],
      __appOrderYearlyIncomeHistory: [...bucket.incomeHistory.yearly],
    };
  });
}

function getProductInsightMetricIconMarkup(metricKey) {
  const normalizedMetricKey = String(metricKey ?? "").trim().toLowerCase();
  if (normalizedMetricKey.startsWith("sold")) {
    return PRODUCT_INSIGHT_SOLD_ICON_MARKUP;
  }
  if (normalizedMetricKey === "rating") {
    return PRODUCT_INSIGHT_RATING_ICON_MARKUP;
  }
  if (normalizedMetricKey === "reviews") {
    return PRODUCT_INSIGHT_REVIEWS_ICON_MARKUP;
  }
  if (normalizedMetricKey === "total-income") {
    return PRODUCT_INSIGHT_TOTAL_INCOME_ICON_MARKUP;
  }
  return "";
}

function createProductInsightMetricIcon(metricKey, className = "product-insight-metric-icon") {
  const markup = getProductInsightMetricIconMarkup(metricKey);
  if (!markup) {
    return null;
  }

  const icon = document.createElement("span");
  icon.className = className;
  icon.setAttribute("aria-hidden", "true");
  icon.innerHTML = markup;
  return icon;
}

function createProductInsightMetricCopy(label, className = "product-insight-metric-copy") {
  const copy = document.createElement("div");
  copy.className = className;

  const labelEl = document.createElement("span");
  labelEl.className = "product-insight-rank-card__metric-label";

  const labelTextEl = document.createElement("span");
  labelTextEl.className = "product-insight-rank-card__metric-label-text";
  labelTextEl.textContent = label;
  labelEl.appendChild(labelTextEl);

  copy.appendChild(labelEl);
  return { copy, labelEl };
}

function getSold(product) {
  const sold = toNumber(product?.__appOrderSold);
  return sold > 0 ? Math.trunc(sold) : 0;
}

function getRating(product) {
  const rating = toNumber(product?.rating);
  return rating > 0 ? Math.min(rating, 5) : 0;
}

function getProductInsightGeneratedReviewComment(rating) {
  const normalizedRating = Math.max(1, Math.min(5, Math.round(toNumber(rating))));
  if (!toNumber(rating)) {
    return "";
  }

  if (normalizedRating === 1) {
    return "Very Bad";
  }
  if (normalizedRating === 2) {
    return "Bad";
  }
  if (normalizedRating === 3) {
    return "Good";
  }
  if (normalizedRating === 4) {
    return "Very Good";
  }
  return "Excellent";
}

function inferProductInsightReviewMediaType(media) {
  const type = String(media?.type ?? media?.mediaType ?? media?.kind ?? "")
    .trim()
    .toLowerCase();
  const contentType = String(media?.contentType ?? media?.mimeType ?? "")
    .trim()
    .toLowerCase();
  const url = String(media?.url ?? media?.mediaUrl ?? media?.imageUrl ?? media?.videoUrl ?? "")
    .trim()
    .toLowerCase()
    .split("?")[0];

  if (type.includes("video") || contentType.startsWith("video/")) {
    return "video";
  }
  if (type.includes("image") || type.includes("photo") || contentType.startsWith("image/")) {
    return "image";
  }
  if (/\.(mp4|mov|m4v|webm|avi|mkv|3gp)$/i.test(url)) {
    return "video";
  }
  return "image";
}

function normalizeProductInsightReviewMedia(review) {
  const rawMedia = [
    review?.media,
    review?.reviewMedia,
    review?.mediaItems,
    review?.attachments,
    review?.mediaUrls,
    review?.imageUrls,
    review?.videoUrls,
  ]
    .filter(Array.isArray)
    .flat();
  if (!rawMedia.length) {
    return [];
  }

  const seenUrls = new Set();
  return rawMedia
    .map((item, index) => {
      const media = typeof item === "string" ? { url: item } : item;
      if (!media || typeof media !== "object") {
        return null;
      }

      const url = String(
        media.url ?? media.mediaUrl ?? media.src ?? media.imageUrl ?? media.videoUrl ?? "",
      ).trim();
      if (!url) {
        return null;
      }

      const key = url.toLowerCase();
      if (seenUrls.has(key)) {
        return null;
      }
      seenUrls.add(key);

      const type = inferProductInsightReviewMediaType({ ...media, url });
      return {
        id: String(media.id ?? `${type}-${index + 1}`).trim(),
        type,
        url,
        fileName: String(media.fileName ?? media.name ?? "").trim(),
        contentType: String(media.contentType ?? media.mimeType ?? "").trim(),
      };
    })
    .filter(Boolean);
}

function normalizeProductInsightSellerReply(review) {
  const rawReply =
    review?.sellerReply ??
    review?.reply ??
    review?.sellerResponse ??
    review?.response ??
    null;
  const reply =
    rawReply && typeof rawReply === "object"
      ? rawReply
      : {
          message: rawReply,
        };
  const message = String(
    reply?.message ??
      reply?.reply ??
      reply?.text ??
      reply?.comment ??
      review?.sellerReplyMessage ??
      review?.replyMessage ??
      "",
  ).trim();
  if (!message) {
    return null;
  }

  const companyName = String(
    reply?.companyName ??
      reply?.storeName ??
      reply?.businessName ??
      review?.sellerReplyCompanyName ??
      "",
  ).trim();
  const companyPictureUrl = String(
    reply?.companyPictureUrl ??
      reply?.companyProfileImageUrl ??
      reply?.profileImageUrl ??
      review?.sellerReplyCompanyPictureUrl ??
      "",
  ).trim();
  const author = String(
    reply?.author ??
      reply?.sellerName ??
      companyName ??
      review?.sellerReplyAuthor ??
      "",
  ).trim();
  const createdAt = String(
    reply?.createdAt ?? reply?.repliedAt ?? review?.sellerReplyCreatedAt ?? "",
  ).trim();
  const updatedAt = String(
    reply?.updatedAt ?? reply?.editedAt ?? review?.sellerReplyUpdatedAt ?? createdAt,
  ).trim();

  return {
    message,
    text: message,
    author,
    companyName,
    companyPictureUrl,
    createdAt,
    updatedAt,
  };
}

function getProductInsightReviewComments(product) {
  const rawComments =
    product?.reviewComments ?? product?.productReviewComments ?? product?.reviews;
  if (!Array.isArray(rawComments)) {
    return [];
  }

  return rawComments
    .map((review, index) => {
      const comment = String(
        review?.comment ?? review?.message ?? review?.text ?? review?.review ?? "",
      ).trim();
      const media = normalizeProductInsightReviewMedia(review);
      const sellerReply = normalizeProductInsightSellerReply(review);
      const rating = Math.max(1, Math.min(5, toNumber(review?.rating) || getRating(product) || 5));
      const resolvedComment = comment || getProductInsightGeneratedReviewComment(rating);
      if (!resolvedComment && !media.length) {
        return null;
      }

      const author = String(
        review?.author ??
          review?.reviewer ??
          review?.user ??
          review?.userName ??
          `Customer ${index + 1}`,
      ).trim() || `Customer ${index + 1}`;
      const dateValue = String(
        review?.dateLabel ?? review?.date ?? review?.createdAt ?? "",
      ).trim();

      return {
        id: String(review?.id ?? `${product?.id ?? "product"}-review-${index + 1}`).trim(),
        orderId: String(review?.orderId ?? "").trim(),
        productId: String(review?.productId ?? product?.id ?? "").trim(),
        adminId: String(review?.adminId ?? product?.adminId ?? product?.tenantId ?? "").trim(),
        author,
        rating,
        age: dateValue,
        date: dateValue,
        comment: resolvedComment,
        media,
        sellerReply,
        likeCount: Math.max(0, Math.trunc(toNumber(review?.likeCount ?? review?.likes))),
        commentCount: Math.max(
          sellerReply ? 1 : 0,
          Math.trunc(toNumber(review?.commentCount ?? review?.replyCount)),
        ),
      };
    })
    .filter(Boolean);
}

function getStock(product) {
  const stock = toNumber(product?.stock);
  return stock > 0 ? Math.trunc(stock) : 0;
}

function getPrice(product) {
  const salesPrice = toNumber(product?.salesPrice);  
  if (salesPrice > 0) {
    return salesPrice;
  }

  return toNumber(product?.originalPrice ?? product?.price);
}

function getTotalIncome(product) {
  const directIncome = toNumber(product?.__appOrderTotalIncome);
  return directIncome > 0 ? directIncome : 0;
}

function formatPrice(value) {
  return `PHP ${toNumber(value).toFixed(2)}`;
}

function formatRating(value) {
  return toNumber(value).toFixed(1);
}
  
function getStarFillPercentage(rating, starIndex) {
  const normalizedRating = Math.max(0, Math.min(5, toNumber(rating)));
  const rawFill = Math.max(0, Math.min(1, normalizedRating - starIndex));
  const steppedFill = Math.round(rawFill * 100) / 100;
  return steppedFill * 100;
}

function getProductInsightProductIdentifier(product) {
  return String(
    product?.id
    ?? product?.sku
    ?? product?.stockKeepingUnit
    ?? product?.name
    ?? "",
  ).trim();
}

function normalizeProductInsightSearch(value) {
  return String(value ?? "").trim().toLowerCase();
}

function getProductInsightScrollProxy() {
  if (!document.body?.classList.contains("product-insight-page") || !soldListEl) {
    return null;
  }

  if (productInsightScrollProxyEl && productInsightScrollProxySpacerEl) {
    return productInsightScrollProxyEl;
  }

  productInsightScrollProxyEl = document.createElement("div");
  productInsightScrollProxyEl.className = "product-insight-scroll-proxy";
  productInsightScrollProxyEl.setAttribute("aria-hidden", "true");
  productInsightScrollProxyEl.hidden = true;

  productInsightScrollProxySpacerEl = document.createElement("div");
  productInsightScrollProxySpacerEl.className = "product-insight-scroll-proxy__spacer";
  productInsightScrollProxyEl.appendChild(productInsightScrollProxySpacerEl);
  document.body.appendChild(productInsightScrollProxyEl);

  productInsightScrollProxyEl.addEventListener("scroll", () => {
    if (isSyncingProductInsightScrollProxy || !soldListEl || !productInsightScrollProxyEl) {
      return;
    }

    isSyncingProductInsightScrollProxy = true;
    soldListEl.scrollTop = productInsightScrollProxyEl.scrollTop;
    requestProductInsightSoldSpacerScrollState();
    window.requestAnimationFrame(() => {
      isSyncingProductInsightScrollProxy = false;
    });
  });

  soldListEl.addEventListener("scroll", () => {
    requestProductInsightSoldSpacerScrollState();

    if (isSyncingProductInsightScrollProxy || !productInsightScrollProxyEl || productInsightScrollProxyEl.hidden) {
      return;
    }

    isSyncingProductInsightScrollProxy = true;
    productInsightScrollProxyEl.scrollTop = soldListEl.scrollTop;
    window.requestAnimationFrame(() => {
      isSyncingProductInsightScrollProxy = false;
    });
  });

  return productInsightScrollProxyEl;
}

function syncProductInsightSoldSpacerScrollState() {
  const shell = soldListEl?.closest(".product-insight-sold-list-shell");
  if (!shell || !soldListEl) {
    return;
  }

  shell.classList.toggle("is-product-list-scrolled", soldListEl.scrollTop > 4);
}

function requestProductInsightSoldSpacerScrollState() {
  if (productInsightSoldSpacerFrame) {
    return;
  }

  productInsightSoldSpacerFrame = window.requestAnimationFrame(() => {
    productInsightSoldSpacerFrame = 0;
    syncProductInsightSoldSpacerScrollState();
  });
}

function updateProductInsightScrollProxy() {
  const proxyEl = getProductInsightScrollProxy();
  if (!proxyEl || !productInsightScrollProxySpacerEl || !soldListEl) {
    return;
  }

  const maxSoldListScroll = Math.max(0, soldListEl.scrollHeight - soldListEl.clientHeight);
  if (maxSoldListScroll <= 1) {
    proxyEl.hidden = true;
    proxyEl.scrollTop = 0;
    syncProductInsightSoldSpacerScrollState();
    return;
  }

  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  productInsightScrollProxySpacerEl.style.height = `${Math.ceil(viewportHeight + maxSoldListScroll)}px`;
  proxyEl.hidden = false;
  proxyEl.scrollTop = Math.min(soldListEl.scrollTop, maxSoldListScroll);
  syncProductInsightSoldSpacerScrollState();
}

function requestProductInsightScrollProxyUpdate() {
  if (productInsightScrollProxyFrame) {
    return;
  }

  productInsightScrollProxyFrame = window.requestAnimationFrame(() => {
    productInsightScrollProxyFrame = 0;
    updateProductInsightScrollProxy();
    window.requestAnimationFrame(updateProductInsightScrollProxy);
  });
}

function getProductInsightWheelDelta(event) {
  const unit =
    event.deltaMode === WheelEvent.DOM_DELTA_PAGE
      ? Math.max(1, window.innerHeight || document.documentElement.clientHeight || 800)
      : event.deltaMode === WheelEvent.DOM_DELTA_LINE
        ? 16
        : 1;
  return event.deltaY * unit;
}

function shouldProductInsightWheelTargetStayLocal(target) {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(
    target.closest(
      [
        ".product-insight-review-comments",
        ".product-insight-review-modal-overlay",
        ".product-category-multiselect__menu",
        ".settings-dropdown",
        ".product-insight-rank-card__back-chart",
        "input",
        "textarea",
        "select",
      ].join(", "),
    ),
  );
}

function handleProductInsightPageWheel(event) {
  if (!document.body?.classList.contains("product-insight-page") || event.defaultPrevented) {
    return;
  }

  if (!(soldListEl instanceof HTMLElement) || shouldProductInsightWheelTargetStayLocal(event.target)) {
    return;
  }

  const deltaY = getProductInsightWheelDelta(event);
  if (!Number.isFinite(deltaY) || deltaY === 0) {
    return;
  }

  const maxScrollTop = Math.max(0, soldListEl.scrollHeight - soldListEl.clientHeight);
  if (maxScrollTop <= 0) {
    return;
  }

  const nextScrollTop = Math.min(maxScrollTop, Math.max(0, soldListEl.scrollTop + deltaY));
  if (nextScrollTop === soldListEl.scrollTop) {
    event.preventDefault();
    return;
  }

  event.preventDefault();
  soldListEl.scrollTop = nextScrollTop;
  requestProductInsightSoldSpacerScrollState();
  requestProductInsightScrollProxyUpdate();
}

function normalizeProductInsightSoldRange(value) {
  switch (String(value ?? "").trim().toLowerCase()) {
    case "daily":
      return "daily";
    case "weekly":
      return "weekly";
    case "monthly":
      return "monthly";
    case "yearly":
      return "yearly";
    default:
      return "all";
  }
}

function getProductInsightSoldRangeLabel(value) {
  switch (normalizeProductInsightSoldRange(value)) {
    case "daily":
      return "Daily";
    case "weekly":
      return "Weekly";
    case "monthly":
      return "Monthly";
    case "yearly":
      return "Yearly";
    default:
      return "Overall";
  }
}

function getProductInsightIncomeChartRange(value = soldRangeFilter) {
  const normalizedRange = normalizeProductInsightSoldRange(value);
  return normalizedRange === "all" ? "daily" : normalizeProductInsightChartRange(normalizedRange);
}

function getProductInsightSoldLeaderTitle(range = soldRangeFilter) {
  const normalizedRange = normalizeProductInsightSoldRange(range);
  switch (normalizedRange) {
    case "daily":
      return "Highest Sold For The Day";
    case "weekly":
      return "Highest Sold For The Week";
    case "monthly":
      return "Highest Sold For The Month";
    case "yearly":
      return "Highest Sold For The Year";
    default:
      return "Top Selling";
  }
}

function getProductInsightSoldMetricLabel(range = soldRangeFilter) {
  const normalizedRange = normalizeProductInsightSoldRange(range);
  switch (normalizedRange) {
    case "daily":
      return "Sold today";
    case "weekly":
      return "Sold this week";
    case "monthly":
      return "Sold this month";
    case "yearly":
      return "Sold this year";
    default:
      return "Sold";
  }
}

function readProductInsightMetricValue(product, candidateKeys) {
  if (!product || !Array.isArray(candidateKeys) || !candidateKeys.length) {
    return null;
  }

  for (const key of candidateKeys) {
    if (!Object.prototype.hasOwnProperty.call(product, key)) {
      continue;
    }

    const rawValue = product[key];
    if (rawValue == null || rawValue === "") {
      continue;
    }

    const numericValue = toNumber(rawValue);
    if (!Number.isFinite(numericValue)) {
      continue;
    }

    return Math.max(0, Math.trunc(numericValue));
  }

  return null;
}

function getProductInsightSoldCount(product, range = soldRangeFilter) {
  const normalizedRange = normalizeProductInsightSoldRange(range);
  if (normalizedRange === "all") {
    return getSold(product);
  }

  const candidateKeyMap = {
    daily: ["__appOrderDailySold"],
    weekly: ["__appOrderWeeklySold"],
    monthly: ["__appOrderMonthlySold"],
    yearly: ["__appOrderYearlySold"],
  };

  const resolvedValue = readProductInsightMetricValue(
    product,
    candidateKeyMap[normalizedRange] ?? [],
  );
  return resolvedValue === null ? getSold(product) : resolvedValue;
}

function getProductInsightIncomeAmount(product, range = "all") {
  const normalizedRange = normalizeProductInsightSoldRange(range);
  if (normalizedRange === "all") {
    return Math.max(0, Math.trunc(getTotalIncome(product)));
  }

  const resolvedValue = readProductInsightIncomePeriodAmount(product, normalizedRange);
  return resolvedValue === null
    ? Math.max(0, Math.trunc(getTotalIncome(product)))
    : resolvedValue;
}

function readProductInsightIncomePeriodAmount(product, range = "all") {
  const normalizedRange = normalizeProductInsightSoldRange(range);
  if (normalizedRange === "all") {
    return Math.max(0, Math.trunc(getTotalIncome(product)));
  }

  const candidateKeyMap = {
    daily: ["__appOrderDailyIncome"],
    weekly: ["__appOrderWeeklyIncome"],
    monthly: ["__appOrderMonthlyIncome"],
    yearly: ["__appOrderYearlyIncome"],
  };

  const resolvedValue = readProductInsightMetricValue(
    product,
    candidateKeyMap[normalizedRange] ?? [],
  );
  return resolvedValue === null ? null : resolvedValue;
}

function formatProductInsightInteger(value) {
  return Math.max(0, Math.trunc(toNumber(value))).toLocaleString("en-US");
}

function formatProductInsightCompactCurrency(value) {
  const numericValue = Math.max(0, toNumber(value));
  if (numericValue < 1000) {
    return `\u20B1${Math.trunc(numericValue).toLocaleString("en-US")}`;
  }

  return `\u20B1${new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(numericValue)}`;
}

function formatProductInsightCurrency(value) {
  return `\u20B1${Math.max(0, toNumber(value)).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatProductInsightWholeCurrency(value) {
  return `\u20B1${Math.max(0, Math.trunc(toNumber(value))).toLocaleString("en-US")}`;
}

function getProductInsightIncomeTrendSnapshot(product, range = soldRangeFilter) {
  const normalizedRange = normalizeProductInsightChartRange(range);
  const series = getProductInsightInteractiveIncomeSeries(product, normalizedRange);
  const currentPoint = series[series.length - 1] ?? null;
  const previousPoint = series[series.length - 2] ?? null;
  const explicitCurrentAmount = readProductInsightIncomePeriodAmount(product, normalizedRange);
  const currentAmount = explicitCurrentAmount === null
    ? Math.max(0, Math.trunc(toNumber(currentPoint?.value)))
    : explicitCurrentAmount;
  const previousAmount = Math.max(0, Math.trunc(toNumber(previousPoint?.value)));
  const deltaAmount = currentAmount - previousAmount;
  const percentageChange = previousAmount > 0
    ? (deltaAmount / previousAmount) * 100
    : currentAmount > 0
      ? 100
      : 0;
  const direction = deltaAmount > 0 ? "up" : deltaAmount < 0 ? "down" : "flat";

  return {
    range: normalizedRange,
    currentAmount,
    previousAmount,
    deltaAmount,
    percentageChange,
    direction,
    currentLabel: currentPoint?.fullLabel ?? getProductInsightSoldRangeLabel(normalizedRange),
    previousLabel: previousPoint?.fullLabel ?? "Previous period",
  };
}

function getProductInsightHashSeed(value) {
  const normalizedValue = String(value ?? "");
  let hash = 0;

  for (let index = 0; index < normalizedValue.length; index += 1) {
    hash = ((hash * 31) + normalizedValue.charCodeAt(index)) | 0;
  }

  return Math.abs(hash);
}

function getProductInsightDailyHourEntries() {
  return Array.from({ length: 24 }, (_, index) => {
    const hour = index + 1;
    return {
      label: String(hour),
      fullLabel: `${String(hour).padStart(2, "0")}:00`,
    };
  });
}

function getProductInsightMonthLabels() {
  return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
}

function getProductInsightWeeklyDayEntries() {
  return [
    { label: "Mon", fullLabel: "Monday" },
    { label: "Tue", fullLabel: "Tuesday" },
    { label: "Wed", fullLabel: "Wednesday" },
    { label: "Thu", fullLabel: "Thursday" },
    { label: "Fri", fullLabel: "Friday" },
    { label: "Sat", fullLabel: "Saturday" },
  ];
}

function getProductInsightMonthlyDayEntries(pointCount = 30, endDate = new Date()) {
  const safeEndDate = endDate instanceof Date ? new Date(endDate) : new Date();
  const entries = [];
  const currentDayOfMonth = Math.max(1, safeEndDate.getDate());
  const safePointCount = Math.max(
    1,
    Math.min(currentDayOfMonth, Math.trunc(toNumber(pointCount)) || currentDayOfMonth),
  );

  for (let dayNumber = 1; dayNumber <= safePointCount; dayNumber += 1) {
    const dayDate = new Date(safeEndDate.getFullYear(), safeEndDate.getMonth(), dayNumber);
    entries.push({
      label: String(dayNumber),
      fullLabel: dayDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    });
  }

  return entries;
}

function normalizeProductInsightChartRange(value) {
  const normalizedRange = normalizeProductInsightSoldRange(value);
  return normalizedRange === "all" ? "weekly" : normalizedRange;
}

function readProductInsightSeriesPoints(product, candidateKeys, fallbackLabels = []) {
  if (!product || !Array.isArray(candidateKeys) || !candidateKeys.length) {
    return [];
  }

  for (const key of candidateKeys) {
    if (!Object.prototype.hasOwnProperty.call(product, key)) {
      continue;
    }

    const rawValue = product[key];
    const sourcePoints = Array.isArray(rawValue)
      ? rawValue
      : rawValue && typeof rawValue === "object"
        ? (Array.isArray(rawValue.points) ? rawValue.points : Array.isArray(rawValue.series) ? rawValue.series : [])
        : [];

    if (!sourcePoints.length) {
      continue;
    }

    const normalizedPoints = sourcePoints
      .map((entry, index) => {
        const fallbackLabel = fallbackLabels[index] ?? `P${index + 1}`;

        if (typeof entry === "number" || typeof entry === "string") {
          return {
            label: fallbackLabel,
            value: Math.max(0, Math.trunc(toNumber(entry))),
          };
        }

        if (!entry || typeof entry !== "object") {
          return null;
        }

        const label = String(entry.label ?? entry.name ?? fallbackLabel).trim() || fallbackLabel;
        const numericValue = toNumber(
          entry.value
          ?? entry.count
          ?? entry.total
          ?? entry.income
          ?? entry.revenue
          ?? entry.grossSales
          ?? entry.earnings
          ?? entry.sold
          ?? entry.amount,
        );

        if (!Number.isFinite(numericValue)) {
          return null;
        }

        return {
          label,
          value: Math.max(0, Math.trunc(numericValue)),
        };
      })
      .filter(Boolean);

    if (normalizedPoints.length) {
      return normalizedPoints;
    }
  }

  return [];
}

function buildProductInsightFallbackSeries(total, labels, seedSource = "") {
  const safeLabels = Array.isArray(labels) && labels.length ? labels : ["W1", "W2", "W3", "W4"];
  const safeTotal = Math.max(0, Math.trunc(toNumber(total)));
  if (safeTotal <= 0) {
    return safeLabels.map((label) => ({ label, value: 0 }));
  }

  const seed = getProductInsightHashSeed(seedSource);
  const weights = safeLabels.map((label, index) => {
    const weightedIndex = index + 2;
    return ((seed + (weightedIndex * 11)) % 7) + weightedIndex;
  });
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  const rawValues = weights.map((weight) => (weight / totalWeight) * safeTotal);
  const values = rawValues.map((value) => Math.floor(value));
  let remaining = safeTotal - values.reduce((sum, value) => sum + value, 0);

  const fractions = rawValues
    .map((value, index) => ({
      index,
      fraction: value - Math.floor(value),
    }))
    .sort((left, right) => right.fraction - left.fraction);

  while (remaining > 0 && fractions.length) {
    const nextFraction = fractions[(remaining - 1) % fractions.length];
    values[nextFraction.index] += 1;
    remaining -= 1;
  }

  return safeLabels.map((label, index) => ({
    label,
    value: values[index] ?? 0,
  }));
}

function normalizeProductInsightChartPoints(points, range) {
  if (!Array.isArray(points)) {
    return [];
  }

  const normalizedRange = normalizeProductInsightChartRange(range);
  if (normalizedRange === "daily") {
    const dailyLabels = getProductInsightDailyHourEntries();
    return points
      .slice(0, dailyLabels.length)
      .map((point, index) => ({
        ...point,
        label: dailyLabels[index]?.label ?? point.label,
        fullLabel: dailyLabels[index]?.fullLabel ?? point.fullLabel ?? point.label,
      }));
  }

  if (normalizedRange === "weekly") {
    const weeklyLabels = getProductInsightWeeklyDayEntries();
    return points
      .slice(0, weeklyLabels.length)
      .map((point, index) => ({
        ...point,
        label: weeklyLabels[index]?.label ?? point.label,
        fullLabel: weeklyLabels[index]?.fullLabel ?? point.fullLabel ?? point.label,
      }));
  }

  if (normalizedRange === "monthly") {
    const monthlyLabels = getProductInsightMonthlyDayEntries(points.length || 30);
    return points
      .slice(0, monthlyLabels.length)
      .map((point, index) => ({
        ...point,
        label: monthlyLabels[index]?.label ?? point.label,
        fullLabel: monthlyLabels[index]?.fullLabel ?? point.fullLabel ?? point.label,
      }));
  }

  return points;
}

function getProductInsightCardChartSeries(product, range = "weekly") {
  const normalizedRange = normalizeProductInsightChartRange(range);
  const labelMap = {
    daily: getProductInsightDailyHourEntries().map((entry) => entry.label),
    weekly: getProductInsightWeeklyDayEntries().map((entry) => entry.label),
    monthly: getProductInsightMonthlyDayEntries().map((entry) => entry.label),
    yearly: getProductInsightMonthLabels(),
  };
  const candidateKeyMap = {
    daily: ["__appOrderDailySoldHistory"],
    weekly: ["__appOrderWeeklySoldHistory"],
    monthly: ["__appOrderMonthlySoldHistory"],
    yearly: ["__appOrderYearlySoldHistory"],
  };

  const labels = labelMap[normalizedRange] ?? labelMap.weekly;
  const resolvedSeries = readProductInsightSeriesPoints(
    product,
    candidateKeyMap[normalizedRange] ?? [],
    labels,
  );
  if (resolvedSeries.length) {
    return normalizeProductInsightChartPoints(resolvedSeries, normalizedRange);
  }

  return normalizeProductInsightChartPoints(
    buildProductInsightFallbackSeries(
      getProductInsightSoldCount(product, normalizedRange),
      labels,
      `${getProductInsightProductIdentifier(product)}:${normalizedRange}`,
    ),
    normalizedRange,
  );
}

function getProductInsightCardIncomeSeries(product, range = "weekly") {
  const normalizedRange = normalizeProductInsightChartRange(range);
  const labelMap = {
    daily: getProductInsightDailyHourEntries().map((entry) => entry.label),
    weekly: getProductInsightWeeklyDayEntries().map((entry) => entry.label),
    monthly: getProductInsightMonthlyDayEntries().map((entry) => entry.label),
    yearly: getProductInsightMonthLabels(),
  };
  const candidateKeyMap = {
    daily: ["__appOrderDailyIncomeHistory"],
    weekly: ["__appOrderWeeklyIncomeHistory"],
    monthly: ["__appOrderMonthlyIncomeHistory"],
    yearly: ["__appOrderYearlyIncomeHistory"],
  };

  const labels = labelMap[normalizedRange] ?? labelMap.weekly;
  const resolvedSeries = readProductInsightSeriesPoints(
    product,
    candidateKeyMap[normalizedRange] ?? [],
    labels,
  );
  if (resolvedSeries.length) {
    return normalizeProductInsightChartPoints(resolvedSeries, normalizedRange);
  }

  return normalizeProductInsightChartPoints(
    buildProductInsightFallbackSeries(
      getProductInsightIncomeAmount(product, normalizedRange),
      labels,
      `${getProductInsightProductIdentifier(product)}:${normalizedRange}:income`,
    ),
    normalizedRange,
  );
}

function getProductInsightChartVisibleCount(range) {
  const normalizedRange = normalizeProductInsightChartRange(range);
  switch (normalizedRange) {
    case "daily":
      return 24;
    case "weekly":
      return 6;
    case "monthly":
      return 30;
    case "yearly":
      return 12;
    default:
      return 4;
  }
}

function getProductInsightChartMinimumVisibleCount(range) {
  const normalizedRange = normalizeProductInsightChartRange(range);
  switch (normalizedRange) {
    case "daily":
      return 6;
    case "weekly":
      return 2;
    case "monthly":
      return 3;
    case "yearly":
      return 2;
    default:
      return 2;
  }
}

function getProductInsightChartFooterLabelStep(range, visiblePointCount) {
  const normalizedRange = normalizeProductInsightChartRange(range);
  const safeCount = Math.max(1, Math.trunc(toNumber(visiblePointCount)));

  switch (normalizedRange) {
    case "daily":
      return 1;
    case "weekly":
      return 1;
    case "monthly":
      return 1;
    case "yearly":
      return 1;
    default:
      return Math.max(1, Math.ceil(safeCount / 6));
  }
}

function getProductInsightChartAxisConfig(yMin, yMax, options = {}) {
  const safeMin = Math.max(0, Math.trunc(toNumber(yMin)));
  const safeRawMax = Math.max(safeMin + 1, Math.trunc(toNumber(yMax)));
  const targetIntervals = Math.max(1, Math.trunc(toNumber(options.targetIntervals)) || 4);
  const minStep = Math.max(1, Math.trunc(toNumber(options.minStep)) || 10000);
  const roughStep = Math.max(minStep, Math.ceil((safeRawMax - safeMin) / targetIntervals));
  const step = Math.max(minStep, Math.ceil(roughStep / minStep) * minStep);
  const normalizedMax = Math.max(safeMin + step, Math.ceil(safeRawMax / step) * step);
  const ticks = [];

  for (let value = normalizedMax; value >= safeMin; value -= step) {
    ticks.push(value);
  }

  if (ticks[ticks.length - 1] !== safeMin) {
    ticks.push(safeMin);
  }

  return {
    min: safeMin,
    max: normalizedMax,
    step,
    ticks,
  };
}

function buildProductInsightSmoothLinePath(coordinates) {
  if (!Array.isArray(coordinates) || !coordinates.length) {
    return "";
  }

  if (coordinates.length === 1) {
    return `M ${coordinates[0].x} ${coordinates[0].y}`;
  }

  let path = `M ${coordinates[0].x} ${coordinates[0].y}`;

  for (let index = 0; index < coordinates.length - 1; index += 1) {
    const currentPoint = coordinates[index];
    const nextPoint = coordinates[index + 1];
    const controlX = currentPoint.x + ((nextPoint.x - currentPoint.x) / 2);
    path += ` C ${controlX} ${currentPoint.y}, ${controlX} ${nextPoint.y}, ${nextPoint.x} ${nextPoint.y}`;
  }

  return path;
}

function buildProductInsightAxisTicksFromRange(minValue, maxValue, segments = 4) {
  const safeMin = Math.max(0, toNumber(minValue));
  const safeMax = Math.max(safeMin + 1, toNumber(maxValue));
  const safeSegments = Math.max(1, Math.trunc(toNumber(segments)) || 4);
  const step = (safeMax - safeMin) / safeSegments;
  const ticks = [];

  for (let index = safeSegments; index >= 0; index -= 1) {
    const tickValue = safeMin + (step * index);
    ticks.push(Math.max(0, Math.round(tickValue)));
  }

  ticks[ticks.length - 1] = Math.round(safeMin);
  ticks[0] = Math.round(safeMax);
  return ticks;
}

function getProductInsightChartZoomedYMax(options = {}) {
  const safeAllTimeHighValue = Math.max(1, Math.trunc(toNumber(options.allTimeHighValue)));
  const safeDefaultVisibleCount = Math.max(1, Math.trunc(toNumber(options.defaultVisibleCount)));
  const safeMinVisibleCount = Math.max(
    1,
    Math.min(
      safeDefaultVisibleCount,
      Math.trunc(toNumber(options.minVisibleCount)) || safeDefaultVisibleCount,
    ),
  );
  const safeVisibleCount = Math.max(1, Math.trunc(toNumber(options.visibleCount)));

  if (safeVisibleCount >= safeDefaultVisibleCount) {
    return safeAllTimeHighValue;
  }

  const zoomSpan = Math.max(1, safeDefaultVisibleCount - safeMinVisibleCount);
  const zoomProgress = clampProductInsightValue(
    (safeDefaultVisibleCount - safeVisibleCount) / zoomSpan,
    0,
    1,
  );
  const focusBaseValue = Math.max(
    1,
    Math.trunc(toNumber(options.latestValue)),
    Math.trunc(toNumber(options.visibleHigh)),
  );
  const focusYMax = clampProductInsightValue(
    Math.ceil(focusBaseValue * 1.1),
    1,
    safeAllTimeHighValue,
  );

  const rawMax = Math.max(
    1,
    Math.round(
      safeAllTimeHighValue
      - ((safeAllTimeHighValue - focusYMax) * zoomProgress),
    ),
  );

  return getProductInsightChartAxisConfig(0, rawMax).max;
}

function getProductInsightChartHistoryPointCount(range) {
  const normalizedRange = normalizeProductInsightChartRange(range);
  switch (normalizedRange) {
    case "daily":
      return 24;
    case "weekly":
      return 6;
    case "monthly":
      return 30;
    case "yearly":
      return 12;
    default:
      return 20;
  }
}

function clampProductInsightValue(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function createProductInsightHistoryLabelEntries(range) {
  const normalizedRange = normalizeProductInsightChartRange(range);
  const pointCount = getProductInsightChartHistoryPointCount(normalizedRange);
  const labels = [];
  const today = new Date();

  if (normalizedRange === "daily") {
    getProductInsightDailyHourEntries().slice(0, pointCount).forEach((entry) => {
      labels.push({
        label: entry.label,
        yearLabel: "",
        fullLabel: `${today.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })} ${entry.fullLabel}`,
      });
    });
    return labels;
  }

  if (normalizedRange === "weekly") {
    const weekStart = new Date(today);
    const dayOfWeek = weekStart.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    weekStart.setDate(weekStart.getDate() + mondayOffset);

    getProductInsightWeeklyDayEntries().slice(0, pointCount).forEach((entry, index) => {
      const weekDate = new Date(weekStart);
      weekDate.setDate(weekStart.getDate() + index);
      labels.push({
        label: entry.label,
        yearLabel: "",
        fullLabel: weekDate.toLocaleDateString("en-US", {
          weekday: "long",
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
      });
    });
    return labels;
  }

  if (normalizedRange === "monthly") {
    getProductInsightMonthlyDayEntries(pointCount, today).forEach((entry) => {
      labels.push({
        label: entry.label,
        yearLabel: "",
        fullLabel: entry.fullLabel,
      });
    });
    return labels;
  }

  getProductInsightMonthLabels().slice(0, pointCount).forEach((monthLabel, monthIndex) => {
    const monthDate = new Date(today.getFullYear(), monthIndex, 1);
    labels.push({
      label: monthLabel,
      yearLabel: "",
      fullLabel: monthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    });
  });
  return labels;
}

function buildProductInsightGeneratedIncomeHistorySeries(product, range) {
  const normalizedRange = normalizeProductInsightChartRange(range);
  const labels = createProductInsightHistoryLabelEntries(normalizedRange);
  const generatedValues = buildProductInsightFallbackSeries(
    getProductInsightIncomeAmount(product, normalizedRange),
    labels.map((entry) => entry.label),
    `${getProductInsightProductIdentifier(product)}:${normalizedRange}:interactive-income`,
  );

  return labels.map((entry, index) => ({
    label: entry.label,
    yearLabel: entry.yearLabel ?? "",
    fullLabel: entry.fullLabel,
    value: Math.max(0, Math.trunc(toNumber(generatedValues[index]?.value))),
  }));
}

function buildProductInsightGeneratedSoldHistorySeries(product, range) {
  const normalizedRange = normalizeProductInsightChartRange(range);
  const labels = createProductInsightHistoryLabelEntries(normalizedRange);
  const generatedValues = buildProductInsightFallbackSeries(
    getProductInsightSoldCount(product, normalizedRange),
    labels.map((entry) => entry.label),
    `${getProductInsightProductIdentifier(product)}:${normalizedRange}:interactive-sold`,
  );

  return labels.map((entry, index) => ({
    label: entry.label,
    yearLabel: entry.yearLabel ?? "",
    fullLabel: entry.fullLabel,
    value: Math.max(0, Math.trunc(toNumber(generatedValues[index]?.value))),
  }));
}

function getProductInsightIncomeChartContextLabel(range) {
  const normalizedRange = normalizeProductInsightChartRange(range);
  const today = new Date();

  if (normalizedRange === "daily") {
    return today.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  if (normalizedRange === "yearly") {
    return today.toLocaleDateString("en-US", { year: "numeric" });
  }

  if (normalizedRange === "monthly") {
    return today.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  }

  return "";
}

function getProductInsightInteractiveIncomeSeries(product, range = "weekly") {
  const normalizedRange = normalizeProductInsightChartRange(range);
  const labels = createProductInsightHistoryLabelEntries(normalizedRange);
  const generatedSeries = buildProductInsightGeneratedIncomeHistorySeries(product, normalizedRange);
  const actualSeries = getProductInsightCardIncomeSeries(product, normalizedRange);

  if (!actualSeries.length) {
    return generatedSeries;
  }

  const mergedSeries = generatedSeries.slice();
  const visibleSeries = actualSeries.slice(-Math.min(actualSeries.length, mergedSeries.length));
  const startIndex = Math.max(0, mergedSeries.length - visibleSeries.length);

  visibleSeries.forEach((point, index) => {
    const targetIndex = startIndex + index;
    mergedSeries[targetIndex] = {
      label: labels[targetIndex]?.label ?? point.label,
      yearLabel: labels[targetIndex]?.yearLabel ?? "",
      fullLabel: labels[targetIndex]?.fullLabel ?? point.label,
      value: Math.max(0, Math.trunc(toNumber(point.value))),
    };
  });

  return mergedSeries;
}

function getProductInsightInteractiveSoldSeries(product, range = "weekly") {
  const normalizedRange = normalizeProductInsightChartRange(range);
  const labels = createProductInsightHistoryLabelEntries(normalizedRange);
  const generatedSeries = buildProductInsightGeneratedSoldHistorySeries(product, normalizedRange);
  const actualSeries = getProductInsightCardChartSeries(product, normalizedRange);

  if (!actualSeries.length) {
    return generatedSeries;
  }

  const mergedSeries = generatedSeries.slice();
  const visibleSeries = actualSeries.slice(-Math.min(actualSeries.length, mergedSeries.length));
  const startIndex = Math.max(0, mergedSeries.length - visibleSeries.length);

  visibleSeries.forEach((point, index) => {
    const targetIndex = startIndex + index;
    mergedSeries[targetIndex] = {
      label: labels[targetIndex]?.label ?? point.label,
      yearLabel: labels[targetIndex]?.yearLabel ?? "",
      fullLabel: labels[targetIndex]?.fullLabel ?? point.label,
      value: Math.max(0, Math.trunc(toNumber(point.value))),
    };
  });

  return mergedSeries;
}

function getProductInsightChartViewportStateKey(product, range) {
  return `${getProductInsightProductIdentifier(product)}:${normalizeProductInsightChartRange(range)}`;
}

function matchesProductInsightReviewSearch(review, searchTerm) {
  if (!searchTerm) {
    return true;
  }

  const haystack = [
    review?.author,
    review?.comment,
    review?.sellerReply?.message,
    review?.sellerReply?.companyName,
    review?.sellerReply?.author,
    review?.age,
    review?.rating,
    ...(Array.isArray(review?.media)
      ? review.media.flatMap((item) => [item?.type, item?.fileName, item?.url])
      : []),
  ]
    .map((value) => String(value ?? "").trim().toLowerCase())
    .filter(Boolean)
    .join(" ");

  return haystack.includes(searchTerm);
}

function matchesProductInsightReviewRating(review, ratingFilter) {
  if (!ratingFilter) {
    return true;
  }

  const normalizedFilter = Math.max(1, Math.min(5, Math.trunc(toNumber(ratingFilter))));
  const normalizedRating = Math.max(1, Math.min(5, toNumber(review?.rating)));

  if (normalizedFilter >= 5) {
    return normalizedRating >= 5;
  }

  return normalizedRating >= normalizedFilter && normalizedRating < normalizedFilter + 1;
}

function getProductInsightReviewAgeDays(review, fallbackIndex = 0) {
  const ageText = String(review?.age ?? "").trim().toLowerCase();
  if (!ageText) {
    return fallbackIndex + 1;
  }

  if (ageText.includes("just now") || ageText.includes("today")) {
    return 0;
  }

  const match = ageText.match(/(\d+(?:\.\d+)?)\s*(minute|minutes|hour|hours|day|days|week|weeks|month|months|year|years)/i);
  if (!match) {
    return fallbackIndex + 1;
  }

  const amount = toNumber(match[1]);
  const unit = String(match[2] ?? "").toLowerCase();
  const multiplier = unit.startsWith("minute")
    ? 1 / 1440
    : unit.startsWith("hour")
      ? 1 / 24
      : unit.startsWith("day")
        ? 1
        : unit.startsWith("week")
          ? 7
          : unit.startsWith("month")
            ? 30
            : unit.startsWith("year")
              ? 365
              : 1;

  return amount * multiplier;
}

function formatProductInsightReviewNumericDate(review) {
  const rawValue = String(review?.age ?? review?.date ?? review?.dateLabel ?? "").trim();
  if (!rawValue) {
    return "";
  }

  const directNumericDate = rawValue.match(/\b\d{1,2}[\/-]\d{1,2}(?:[\/-]\d{2,4})?\b/);
  if (directNumericDate) {
    return directNumericDate[0];
  }

  const parsedDate = new Date(rawValue);
  if (!Number.isNaN(parsedDate.getTime())) {
    const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
    const day = String(parsedDate.getDate()).padStart(2, "0");
    const year = String(parsedDate.getFullYear());
    return `${month}/${day}/${year}`;
  }

  const ageInDays = getProductInsightReviewAgeDays(review, 0);
  if (!Number.isFinite(ageInDays)) {
    return "";
  }

  const baseDate = new Date();
  baseDate.setHours(0, 0, 0, 0);
  baseDate.setDate(baseDate.getDate() - Math.max(0, Math.round(ageInDays)));

  const month = String(baseDate.getMonth() + 1).padStart(2, "0");
  const day = String(baseDate.getDate()).padStart(2, "0");
  const year = String(baseDate.getFullYear());
  return `${month}/${day}/${year}`;
}

function createProductInsightReviewMediaGallery(review, options = {}) {
  const media = Array.isArray(review?.media) ? review.media : [];
  if (!media.length) {
    return null;
  }

  const { isModal = false } = options;
  const gallery = document.createElement("div");
  gallery.className = isModal
    ? "product-insight-review-media product-insight-review-media--modal"
    : "product-insight-review-media";

  media.forEach((item, index) => {
    const frame = document.createElement("figure");
    frame.className = `product-insight-review-media__item product-insight-review-media__item--${item.type === "video" ? "video" : "image"}`;

    if (item.type === "video") {
      const video = document.createElement("video");
      video.src = item.url;
      video.controls = true;
      video.muted = true;
      video.playsInline = true;
      video.preload = "metadata";
      video.setAttribute("aria-label", `Review video ${index + 1}`);
      frame.appendChild(video);
    } else {
      const image = document.createElement("img");
      image.src = item.url;
      image.loading = "lazy";
      image.alt = item.fileName || `Review photo ${index + 1}`;
      frame.appendChild(image);
    }

    const badge = document.createElement("figcaption");
    badge.className = "product-insight-review-media__badge";
    badge.textContent = item.type === "video" ? "Video" : "Photo";
    frame.appendChild(badge);
    gallery.appendChild(frame);
  });

  return gallery;
}

function closeProductInsightReviewCommentModal() {
  if (activeProductInsightReviewModalKeyHandler) {
    document.removeEventListener("keydown", activeProductInsightReviewModalKeyHandler);
    activeProductInsightReviewModalKeyHandler = null;
  }

  if (activeProductInsightReviewModalOverlay) {
    activeProductInsightReviewModalOverlay.remove();
    activeProductInsightReviewModalOverlay = null;
  }

  document.body.classList.remove("modal-open");
}

function openProductInsightReviewCommentModal(review) {
  closeProductInsightReviewCommentModal();

  const overlay = document.createElement("div");
  overlay.className = "product-insight-review-modal-overlay";

  const modal = document.createElement("article");
  modal.className = "product-insight-review-modal";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-label", "Full review comment");

  const header = document.createElement("div");
  header.className = "product-insight-review-modal__header";

  const person = document.createElement("div");
  person.className = "product-insight-review-modal__person";

  const identity = document.createElement("div");
  identity.className = "product-insight-review-modal__identity";

  const author = document.createElement("strong");
  author.textContent = review.author;

  const reviewDate = document.createElement("span");
  reviewDate.textContent = formatProductInsightReviewNumericDate(review);

  identity.append(author, reviewDate);
  person.append(createProductInsightReviewAvatar(review.author), identity);

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "product-gallery-modal__close validation-modal__close product-insight-review-modal__close";
  closeButton.setAttribute("aria-label", "Close review comment");
  closeButton.title = "Close review comment";
  closeButton.innerHTML = `<i class="fa-solid fa-xmark" aria-hidden="true"></i>`;

  header.append(person, closeButton);

  const rating = createRatingStars(review.rating);
  rating.classList.add("product-insight-review-modal__rating");

  const copy = document.createElement("p");
  copy.className = "product-insight-review-modal__copy";
  copy.textContent = review.comment;

  const mediaGallery = createProductInsightReviewMediaGallery(review, {
    isModal: true,
  });
  const sellerReplyBlock = createProductInsightSellerReplyBlock(review.sellerReply);

  modal.append(header, rating);
  if (review.comment) {
    modal.appendChild(copy);
  }
  if (mediaGallery) {
    modal.appendChild(mediaGallery);
  }
  if (sellerReplyBlock) {
    modal.appendChild(sellerReplyBlock);
  }
  overlay.appendChild(modal);

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closeProductInsightReviewCommentModal();
    }
  });
  closeButton.addEventListener("click", closeProductInsightReviewCommentModal);

  activeProductInsightReviewModalKeyHandler = (event) => {
    if (event.key === "Escape") {
      closeProductInsightReviewCommentModal();
    }
  };
  document.addEventListener("keydown", activeProductInsightReviewModalKeyHandler);

  activeProductInsightReviewModalOverlay = overlay;
  document.body.appendChild(overlay);
  document.body.classList.add("modal-open");
  closeButton.focus();
}

function enableExpandableProductInsightComment(comment, review) {
  if (!(comment instanceof HTMLElement) || comment.dataset.expandableBound === "true") {
    return;
  }

  const openModal = () => openProductInsightReviewCommentModal(review);

  comment.dataset.expandableBound = "true";
  comment.classList.add("is-expandable");
  comment.tabIndex = 0;
  comment.setAttribute("role", "button");
  comment.setAttribute("aria-label", `Open full review from ${review.author}`);
  comment.addEventListener("click", openModal);
  comment.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openModal();
    }
  });
}

function normalizeProductInsightCategoryName(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeProductInsightCategoryFilter(value) {
  return normalizeProductInsightCategoryName(value).toLowerCase();
}

function getProductInsightCategoryList(product) {
  const rawCategories = [
    ...(Array.isArray(product?.categories) ? product.categories : []),
    product?.category,
  ];
  const seen = new Set();
  const categories = [];

  for (const value of rawCategories) {
    const normalizedCategory = normalizeProductInsightCategoryName(value);
    if (!normalizedCategory) {
      continue;
    }

    const normalizedKey = normalizedCategory.toLowerCase();
    if (seen.has(normalizedKey)) {
      continue;
    }

    seen.add(normalizedKey);
    categories.push(normalizedCategory);
  }

  return categories.length ? categories : ["General"];
}

function syncSoldCategoryFilterSummary() {
  if (!soldCategoryFilterSummary) {
    return;
  }

  soldCategoryFilterSummary.textContent =
    normalizeProductInsightCategoryName(soldCategoryFilter) || "All Categories";
}

function setSoldCategoryFilterOpen(isOpen) {
  if (
    !soldCategoryFilterDropdown
    || !soldCategoryFilterTrigger
    || !soldCategoryFilterMenu
  ) {
    return;
  }

  soldCategoryFilterDropdown.classList.toggle("is-open", Boolean(isOpen));
  soldCategoryFilterTrigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
  soldCategoryFilterMenu.hidden = !isOpen;
}

function normalizeProductInsightMetricFilter(value) {
  const normalizedValue = String(value ?? "").trim().toLowerCase();
  if (!normalizedValue || normalizedValue === "all") {
    return "all";
  }
  if (["rating", "top-rating", "ratings"].includes(normalizedValue)) {
    return "rating";
  }
  if (["income", "total-income", "revenue", "sales"].includes(normalizedValue)) {
    return "income";
  }
  return "sold";
}

function getProductInsightMetricFilterOption(value = soldMetricFilter) {
  const normalizedValue = normalizeProductInsightMetricFilter(value);
  return PRODUCT_INSIGHT_METRIC_FILTER_OPTIONS.find((option) => option.value === normalizedValue)
    || PRODUCT_INSIGHT_METRIC_FILTER_OPTIONS[0];
}

function syncSoldMetricFilterSummary() {
  if (!soldMetricFilterSummary) {
    return;
  }

  soldMetricFilterSummary.textContent = getProductInsightMetricFilterOption().label;
}

function setSoldMetricFilterOpen(isOpen) {
  if (
    !soldMetricFilterDropdown
    || !soldMetricFilterTrigger
    || !soldMetricFilterMenu
  ) {
    return;
  }

  soldMetricFilterDropdown.classList.toggle("is-open", Boolean(isOpen));
  soldMetricFilterTrigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
  soldMetricFilterMenu.hidden = !isOpen;
}

function renderSoldMetricFilterOptions() {
  if (!soldMetricFilterMenu) {
    return;
  }

  soldMetricFilter = normalizeProductInsightMetricFilter(soldMetricFilter);
  syncSoldMetricFilterSummary();
  soldMetricFilterMenu.innerHTML = "";

  for (const optionConfig of PRODUCT_INSIGHT_METRIC_FILTER_OPTIONS) {
    const option = document.createElement("button");
    option.type = "button";
    option.className = "product-category-multiselect__option";
    option.setAttribute("role", "option");

    const isSelected = optionConfig.value === soldMetricFilter;
    option.setAttribute("aria-selected", isSelected ? "true" : "false");
    if (isSelected) {
      option.classList.add("is-selected");
    }

    option.textContent = optionConfig.label;
    option.addEventListener("click", () => {
      soldMetricFilter = optionConfig.value;
      syncSoldMetricFilterSummary();
      renderSoldMetricFilterOptions();
      setSoldMetricFilterOpen(false);
      soldMetricFilterTrigger?.focus();
      renderProductInsight(currentProductInsightProducts);
    });

    soldMetricFilterMenu.appendChild(option);
  }
}

function setProductInsightDropdownOpen(dropdown, isOpen) {
  if (!(dropdown instanceof HTMLElement)) {
    return;
  }

  const trigger = dropdown.querySelector(".product-category-multiselect__trigger");
  const menu = dropdown.querySelector(".product-category-multiselect__menu");
  if (!(trigger instanceof HTMLElement) || !(menu instanceof HTMLElement)) {
    return;
  }

  dropdown.classList.toggle("is-open", Boolean(isOpen));
  trigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
  menu.hidden = !isOpen;
}

function closeProductInsightDropdowns() {
  document
    .querySelectorAll(".product-insight-dropdown")
    .forEach((dropdown) => setProductInsightDropdownOpen(dropdown, false));
}

function createProductInsightDropdown({
  name,
  ariaLabel,
  value,
  summary,
  options,
  onSelect,
  dataAttributes = {},
}) {
  const dropdown = document.createElement("div");
  dropdown.className =
    "product-insight-dropdown product-category-multiselect product-insight-review-summary__dropdown";

  Object.entries(dataAttributes).forEach(([key, attributeValue]) => {
    dropdown.dataset[key] = String(attributeValue);
  });

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className =
    "product-category-multiselect__trigger product-insight-review-summary__trigger";
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");
  trigger.setAttribute("aria-label", ariaLabel);

  const summaryEl = document.createElement("span");
  summaryEl.className = "product-category-multiselect__summary";
  summaryEl.textContent = summary;

  const icon = document.createElement("span");
  icon.className = "product-panel-grid__inventory-category-filter-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
      <path d="m6.5 9.5 5.5 5 5.5-5" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  `;

  trigger.append(summaryEl, icon);

  const menu = document.createElement("div");
  menu.className = "product-category-multiselect__menu product-insight-review-summary__menu";
  menu.setAttribute("role", "listbox");
  menu.hidden = true;

  options.forEach((optionConfig) => {
    const option = document.createElement("button");
    option.type = "button";
    option.className = "product-category-multiselect__option";
    option.setAttribute("role", "option");
    const isSelected = String(optionConfig.value) === String(value);
    option.setAttribute("aria-selected", isSelected ? "true" : "false");
    if (isSelected) {
      option.classList.add("is-selected");
    }
    option.textContent = optionConfig.label;
    option.addEventListener("click", () => {
      onSelect(optionConfig.value);
      renderProductInsight(currentProductInsightProducts);
    });
    menu.appendChild(option);
  });

  trigger.addEventListener("click", () => {
    const shouldOpen = menu.hidden;
    closeProductInsightDropdowns();
    setProductInsightDropdownOpen(dropdown, shouldOpen);
  });

  dropdown.append(trigger, menu);
  return dropdown;
}

function renderSoldCategoryFilterOptions(products) {
  if (!soldCategoryFilterMenu) {
    return;
  }

  const nextCategories = [];
  const seen = new Set();

  for (const product of Array.isArray(products) ? products : []) {
    for (const category of getProductInsightCategoryList(product)) {
      const normalizedKey = normalizeProductInsightCategoryFilter(category);
      if (!normalizedKey || seen.has(normalizedKey)) {
        continue;
      }

      seen.add(normalizedKey);
      nextCategories.push(category);
    }
  }

  nextCategories.sort((left, right) =>
    String(left).localeCompare(String(right), undefined, { sensitivity: "base" }),
  );

  const normalizedSelectedFilter = normalizeProductInsightCategoryFilter(soldCategoryFilter);
  const resolvedSelectedFilter = nextCategories.find(
    (category) => normalizeProductInsightCategoryFilter(category) === normalizedSelectedFilter,
  );

  soldCategoryFilter = resolvedSelectedFilter ?? "";
  syncSoldCategoryFilterSummary();
  soldCategoryFilterMenu.innerHTML = "";

  const options = [{ value: "", label: "All Categories" }, ...nextCategories.map((category) => ({
    value: category,
    label: category,
  }))];

  for (const optionConfig of options) {
    const option = document.createElement("button");
    option.type = "button";
    option.className = "product-category-multiselect__option";
    option.setAttribute("role", "option");

    const isSelected =
      normalizeProductInsightCategoryFilter(optionConfig.value)
      === normalizeProductInsightCategoryFilter(soldCategoryFilter);
    option.setAttribute("aria-selected", isSelected ? "true" : "false");
    if (isSelected) {
      option.classList.add("is-selected");
    }

    option.textContent = optionConfig.label;
    option.addEventListener("click", () => {
      soldCategoryFilter = optionConfig.value;
      syncSoldCategoryFilterSummary();
      renderSoldCategoryFilterOptions(currentProductInsightProducts);
      setSoldCategoryFilterOpen(false);
      soldCategoryFilterTrigger?.focus();
      renderProductInsight(currentProductInsightProducts);
    });

    soldCategoryFilterMenu.appendChild(option);
  }
}

function matchesProductInsightSearch(product, searchTerm) {
  if (!searchTerm) {
    return true;
  }

  const haystack = [
    product?.name,
    ...getProductInsightCategoryList(product),
    product?.id,
    product?.sku,
    product?.stockKeepingUnit,
  ]
    .map((value) => String(value ?? "").trim().toLowerCase())
    .filter(Boolean)
    .join(" ");

  return haystack.includes(searchTerm);
}

function matchesProductInsightCategory(product, categoryFilter) {
  const normalizedCategoryFilter = normalizeProductInsightCategoryFilter(categoryFilter);
  if (!normalizedCategoryFilter) {
    return true;
  }

  return getProductInsightCategoryList(product).some(
    (category) => normalizeProductInsightCategoryFilter(category) === normalizedCategoryFilter,
  );
}

function getProductInsightRankingMetricValue(product, metric = soldMetricFilter) {
  const normalizedMetric = normalizeProductInsightMetricFilter(metric);
  if (normalizedMetric === "rating") {
    return getRating(product);
  }
  if (normalizedMetric === "income") {
    return getProductInsightIncomeAmount(product, soldRangeFilter);
  }
  return getProductInsightSoldCount(product);
}

function hasProductInsightAnyRankingMetric(product) {
  return (
    getProductInsightSoldCount(product) > 0
    || getRating(product) > 0
    || getProductInsightIncomeAmount(product, soldRangeFilter) > 0
  );
}

function getProductInsightMetricLabel(metric = soldMetricFilter) {
  const normalizedMetric = normalizeProductInsightMetricFilter(metric);
  if (normalizedMetric === "all") {
    return "All";
  }
  if (normalizedMetric === "rating") {
    return "Rating";
  }
  if (normalizedMetric === "income") {
    return "Total income";
  }
  return getProductInsightSoldMetricLabel();
}

function getProductInsightRankedProducts(products, metric = soldMetricFilter) {
  const normalizedMetric = normalizeProductInsightMetricFilter(metric);
  const normalizedProducts = Array.isArray(products) ? products : [];
  return normalizedProducts
    .filter((product) => (
      normalizedMetric === "all"
        ? hasProductInsightAnyRankingMetric(product)
        : getProductInsightRankingMetricValue(product, normalizedMetric) > 0
    ))
    .sort((left, right) => {
      if (normalizedMetric === "all") {
        const soldDiff = getProductInsightSoldCount(right) - getProductInsightSoldCount(left);
        if (soldDiff !== 0) {
          return soldDiff;
        }

        const ratingDiff = getRating(right) - getRating(left);
        if (ratingDiff !== 0) {
          return ratingDiff;
        }

        const incomeDiff =
          getProductInsightIncomeAmount(right, soldRangeFilter)
          - getProductInsightIncomeAmount(left, soldRangeFilter);
        if (incomeDiff !== 0) {
          return incomeDiff;
        }

        return String(left.name || "").localeCompare(String(right.name || ""));
      }

      const metricDiff =
        getProductInsightRankingMetricValue(right, normalizedMetric)
        - getProductInsightRankingMetricValue(left, normalizedMetric);
      if (metricDiff !== 0) {
        return metricDiff;
      }

      if (normalizedMetric !== "sold") {
        const soldDiff = getProductInsightSoldCount(right) - getProductInsightSoldCount(left);
        if (soldDiff !== 0) {
          return soldDiff;
        }
      }

      if (normalizedMetric !== "rating") {
        const ratingDiff = getRating(right) - getRating(left);
        if (ratingDiff !== 0) {
          return ratingDiff;
        }
      }

      if (normalizedMetric !== "income") {
        const incomeDiff =
          getProductInsightIncomeAmount(right, soldRangeFilter)
          - getProductInsightIncomeAmount(left, soldRangeFilter);
        if (incomeDiff !== 0) {
          return incomeDiff;
        }
      }

      return String(left.name || "").localeCompare(String(right.name || ""));
    });
}

function buildProductInsightRankMetric(product, metric = soldMetricFilter) {
  const normalizedMetric = normalizeProductInsightMetricFilter(metric);
  if (normalizedMetric === "rating") {
    return {
      metricText: `${formatRating(getRating(product))} rating`,
      metricMode: "rating",
    };
  }
  if (normalizedMetric === "income") {
    return {
      metricText: formatProductInsightCurrency(getProductInsightIncomeAmount(product, soldRangeFilter)),
      metricMode: "income",
    };
  }
  return {
    metricText: `${getProductInsightSoldCount(product)} sold`,
    metricMode: "sold",
  };
}

function getProductInsightReviewCount(product) {
  const directRatingCount = toNumber(
    product?.ratingCount
    ?? product?.ratingsCount
    ?? product?.reviewRatingCount
    ?? product?.productRatingCount,
  );
  if (directRatingCount > 0) {
    return Math.trunc(directRatingCount);
  }

  const directReviewCount = toNumber(
    product?.reviewCount
    ?? product?.reviewsCount
    ?? product?.totalReviews
    ?? product?.commentCount
    ?? product?.reviewCommentCount
    ?? product?.productReviewCommentCount,
  );
  if (directReviewCount > 0) {
    return Math.trunc(directReviewCount);
  }

  return getProductInsightReviewComments(product).length;
}

function resolveProductInsightRatingRatios(rating) {
  if (rating >= 4.7) {
    return [0.72, 0.18, 0.06, 0.025, 0.015];
  }

  if (rating >= 4.3) {
    return [0.58, 0.24, 0.1, 0.05, 0.03];
  }

  if (rating >= 3.8) {
    return [0.4, 0.3, 0.17, 0.08, 0.05];
  }

  if (rating >= 3.3) {
    return [0.24, 0.28, 0.24, 0.14, 0.1];
  }

  if (rating >= 2.8) {
    return [0.16, 0.2, 0.25, 0.22, 0.17];
  }

  if (rating >= 2.2) {
    return [0.1, 0.15, 0.22, 0.26, 0.27];
  }

  return [0.07, 0.08, 0.15, 0.25, 0.45];
}

function buildProductInsightRatingBreakdown(product) {
  const totalReviews = getProductInsightReviewCount(product);
  const rating = getRating(product);
  const stars = [5, 4, 3, 2, 1];
  const storedBreakdown = product?.ratingBreakdown ?? product?.productRatingBreakdown;

  if (storedBreakdown && typeof storedBreakdown === "object") {
    const rows = stars.map((star) => ({
      stars: star,
      count: Math.max(
        0,
        Math.trunc(toNumber(storedBreakdown[star] ?? storedBreakdown[String(star)])),
      ),
      percentage: 0,
    }));
    const storedTotal = rows.reduce((sum, row) => sum + row.count, 0);
    if (storedTotal > 0) {
      return rows.map((row) => ({
        ...row,
        percentage: (row.count / storedTotal) * 100,
      }));
    }
  }

  if (totalReviews <= 0 || rating <= 0) {
    return stars.map((star) => ({
      stars: star,
      count: 0,
      percentage: 0,
    }));
  }

  const ratios = resolveProductInsightRatingRatios(rating);
  const counts = ratios.map((ratio) => Math.floor(totalReviews * ratio));
  let assignedCount = counts.reduce((sum, value) => sum + value, 0);
  let index = 0;

  while (assignedCount < totalReviews) {
    counts[index % counts.length] += 1;
    assignedCount += 1;
    index += 1;
  }

  return stars.map((star, starIndex) => ({
    stars: star,
    count: counts[starIndex],
    percentage: totalReviews > 0 ? (counts[starIndex] / totalReviews) * 100 : 0,
  }));
}

function buildProductInsightExampleReviews(product) {
  return getProductInsightReviewComments(product);
}

function createEmptyState(message) {
  const state = document.createElement("div");
  state.className = "empty-state";
  state.textContent = message;
  return state;
}

function createMetricItem(label, value) {
  const item = document.createElement("div");
  item.className = "product-insight-rank-card__metric";
  const metricKey = String(label ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  item.dataset.metric = metricKey;

  const iconEl = createProductInsightMetricIcon(metricKey);
  const { copy, labelEl } = createProductInsightMetricCopy(label);

  if (iconEl) {
    item.appendChild(iconEl);
  }

  const valueEl = document.createElement("strong");
  valueEl.className = "product-insight-rank-card__metric-value";
  if (value instanceof Node) {
    valueEl.appendChild(value);
  } else {
    valueEl.textContent = value;
  }

  copy.appendChild(valueEl);
  item.appendChild(copy);
  return item;
}

function createProductInsightCurrencyValue(amount, options = {}) {
  const { prefix = "\u20B1" } = options;
  const value = document.createElement("span");
  value.className = "product-insight-currency-value";

  const prefixEl = document.createElement("span");
  prefixEl.className = "product-insight-currency-value__prefix";
  prefixEl.textContent = prefix;

  const amountEl = document.createElement("span");
  amountEl.className = "product-insight-currency-value__amount";
  amountEl.textContent = toNumber(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  value.append(prefixEl, document.createTextNode(" "), amountEl);
  return value;
}

function applyProductInsightIncomeOverviewSnapshot(overview, snapshot) {
  if (!(overview instanceof HTMLElement) || !snapshot) {
    return;
  }

  overview.classList.remove("is-up", "is-down", "is-flat");
  overview.classList.add(
    snapshot.direction === "up"
      ? "is-up"
      : snapshot.direction === "down"
        ? "is-down"
        : "is-flat",
  );

  const value = overview.querySelector(".product-insight-income-chart-summary__overview-value");
  const change = overview.querySelector(".product-insight-income-chart-summary__overview-change");

  if (value) {
    value.textContent = formatProductInsightCurrency(snapshot.currentAmount);
  }

  if (change) {
    change.classList.remove("is-up", "is-down", "is-flat");
    change.classList.add(
      snapshot.direction === "up"
        ? "is-up"
        : snapshot.direction === "down"
          ? "is-down"
          : "is-flat",
    );
    change.textContent = `${snapshot.percentageChange >= 0 ? "+" : ""}${snapshot.percentageChange.toFixed(1)}%`;
  }
}

function createProductInsightIncomeOverview(product, range = soldRangeFilter) {
  const snapshot = getProductInsightIncomeTrendSnapshot(product, range);
  const overview = document.createElement("div");
  overview.className = "product-insight-income-chart-summary__overview";

  const icon = createProductInsightMetricIcon(
    "total-income",
    "product-insight-income-chart-summary__overview-icon",
  );
  if (icon) {
    overview.appendChild(icon);
  }

  const copy = document.createElement("div");
  copy.className = "product-insight-income-chart-summary__overview-copy";

  const label = document.createElement("span");
  label.className = "product-insight-income-chart-summary__overview-label";
  const labelText = document.createElement("span");
  labelText.className = "product-insight-income-chart-summary__overview-label-text";
  labelText.textContent = "Total income";
  label.appendChild(labelText);

  const value = document.createElement("strong");
  value.className = "product-insight-income-chart-summary__overview-value";
  value.textContent = formatProductInsightCurrency(snapshot.currentAmount);

  const change = document.createElement("span");
  change.className = "product-insight-income-chart-summary__overview-change";

  const main = document.createElement("div");
  main.className = "product-insight-income-chart-summary__overview-main";
  main.append(value, change);

  copy.append(label, main);
  overview.appendChild(copy);
  applyProductInsightIncomeOverviewSnapshot(overview, snapshot);
  return overview;
}

function createRankBadge(rank) {
  const badge = document.createElement("span");
  badge.className = "product-insight-rank-card__position";

  if (rank >= 1 && rank <= 3) {
    badge.classList.add("is-trophy", `is-rank-${rank}`);
    badge.setAttribute("aria-label", `Rank ${rank}`);
    badge.title = `Rank ${rank}`;
    badge.innerHTML = `
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M6 3.75A1.75 1.75 0 0 1 7.75 2h8.5A1.75 1.75 0 0 1 18 3.75V5h1.75A1.25 1.25 0 0 1 21 6.25v.45a5.25 5.25 0 0 1-4.42 5.18 5.53 5.53 0 0 1-3.33 2.28v2.09h2.1a1 1 0 0 1 .97.77l.48 2A1 1 0 0 1 15.83 20H8.17a1 1 0 0 1-.97-1.23l.48-2a1 1 0 0 1 .97-.77h2.1v-2.09a5.53 5.53 0 0 1-3.33-2.28A5.25 5.25 0 0 1 3 6.7v-.45A1.25 1.25 0 0 1 4.25 5H6V3.75Zm0 3H4.5v.05a3.75 3.75 0 0 0 2.07 3.35A5.56 5.56 0 0 1 6 7.75v-1Zm12 0v1a5.56 5.56 0 0 1-.57 2.4A3.75 3.75 0 0 0 19.5 6.8v-.05H18Z"/>
      </svg>
      <span class="product-insight-rank-card__trophy-number">${rank}</span>
    `;
    return badge;
  }

  if (rank >= 4 && rank <= 10) {
    badge.classList.add("is-theme-rank");
  }

  badge.textContent = String(rank);
  return badge;
}

function createStarSvg(svgNamespace, fillPercentage) {
  const starSvg = document.createElementNS(svgNamespace, "svg");
  starSvg.setAttribute("viewBox", "0 0 24 24");
  starSvg.setAttribute("focusable", "false");
  starSvg.setAttribute("aria-hidden", "true");
  starSvg.setAttribute("class", "product-insight-star__svg");

  const defs = document.createElementNS(svgNamespace, "defs");
  const gradient = document.createElementNS(svgNamespace, "linearGradient");
  const gradientId = `product-insight-star-gradient-${productInsightStarGradientId += 1}`;
  const clampedFill = Math.max(0, Math.min(100, fillPercentage));

  gradient.setAttribute("id", gradientId);
  gradient.setAttribute("x1", "0%");
  gradient.setAttribute("y1", "0%");
  gradient.setAttribute("x2", "100%");
  gradient.setAttribute("y2", "0%");

  [
    ["0%", "#f59e0b"],
    [`${clampedFill}%`, "#f59e0b"],
    [`${clampedFill}%`, "#d1d5db"],
    ["100%", "#d1d5db"],
  ].forEach(([offset, color]) => {
    const stop = document.createElementNS(svgNamespace, "stop");
    stop.setAttribute("offset", offset);
    stop.setAttribute("stop-color", color);
    gradient.appendChild(stop);
  });

  defs.appendChild(gradient);

  const shape = document.createElementNS(svgNamespace, "path");
  shape.setAttribute(
    "d",
    "M12 2.2 14.95 8.18 21.55 9.14 16.78 13.79 17.91 20.35 12 17.24 6.09 20.35 7.22 13.79 2.45 9.14 9.05 8.18 12 2.2Z",
  );
  shape.setAttribute("fill", `url(#${gradientId})`);
  starSvg.append(defs, shape);
  return starSvg;
}

function createRatingStars(rating, options = {}) {
  const { compact = false, maxStars = 5 } = options;
  const stars = document.createElement("span");
  stars.className = `product-insight-stars${compact ? " is-compact" : ""}`;
  const svgNamespace = "http://www.w3.org/2000/svg";

  for (let index = 0; index < maxStars; index += 1) {
    const fillPercentage = getStarFillPercentage(rating, index);
    const star = document.createElement("span");
    star.className = "product-insight-star";
    star.setAttribute("aria-hidden", "true");
    star.appendChild(createStarSvg(svgNamespace, fillPercentage));
    stars.appendChild(star);
  }

  return stars;
}

function createRatingDisplay(rating, options = {}) {
  const { compact = false, stacked = false, summary = false, singleStar = false } = options;
  const display = document.createElement("span");
  display.className = [
    "product-insight-rating",
    compact ? "is-compact" : "",
    stacked ? "is-stacked" : "",
    summary ? "is-summary" : "",
    singleStar ? "is-single-star" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const value = document.createElement("span");
  value.className = "product-insight-rating__value";
  value.textContent = formatRating(rating);

  const renderedStarRating = singleStar
    ? (toNumber(rating) > 0 ? 1 : 0)
    : rating;

  display.append(
    value,
    createRatingStars(renderedStarRating, {
      compact,
      maxStars: singleStar ? 1 : 5,
    }),
  );
  return display;
}

function renderSummaryRating(element, rating) {
  if (!element) {
    return;
  }

  element.textContent = formatRating(rating);
}

function createProductMedia(product) {
  const media = document.createElement("div");
  media.className = "product-insight-rank-card__media";

  if (product?.imageUrl) {
    const image = document.createElement("img");
    image.src = product.imageUrl;
    image.alt = product.name || "Product image";
    media.appendChild(image);
    return media;
  }

  const placeholder = document.createElement("span");
  placeholder.className = "product-insight-rank-card__placeholder";
  placeholder.textContent = "No image";
  media.appendChild(placeholder);
  return media;
}

function syncProductInsightRankCardSelectionState(productIdentifier = "") {
  if (!(soldListEl instanceof HTMLElement)) {
    return;
  }

  const normalizedIdentifier = String(productIdentifier ?? "").trim();
  soldListEl
    .querySelectorAll(".product-insight-rank-card[data-product-insight-product-id]")
    .forEach((card) => {
      if (!(card instanceof HTMLElement)) {
        return;
      }

      const cardIdentifier = String(card.dataset.productInsightProductId ?? "").trim();
      const isSelected = Boolean(normalizedIdentifier) && cardIdentifier === normalizedIdentifier;
      card.classList.toggle("is-selected", isSelected);
      card.setAttribute("aria-pressed", isSelected ? "true" : "false");
    });
}

function createProductInsightIncomeChartPanel(product, options = {}) {
  const {
    range = soldRangeFilter,
    onHoverChange = null,
    onHoverReset = null,
  } = options;
  const chartRange = normalizeProductInsightChartRange(range);
  const allPoints = getProductInsightInteractiveIncomeSeries(product, chartRange);
  const allSoldPoints = getProductInsightInteractiveSoldSeries(product, chartRange);
  const isFixedRangeChart =
    chartRange === "daily"
    || chartRange === "weekly"
    || chartRange === "monthly"
    || chartRange === "yearly";
  const isScaleInteractiveChart = isFixedRangeChart;
  const defaultVisibleCount = Math.max(
    1,
    Math.min(getProductInsightChartVisibleCount(chartRange), allPoints.length || 1),
  );
  const configuredMaxVisibleCount = Math.max(1, allPoints.length || 1);
  const configuredMinVisibleCount = Math.max(
    1,
    Math.min(getProductInsightChartMinimumVisibleCount(chartRange), configuredMaxVisibleCount),
  );
  const maxVisibleCount = isFixedRangeChart ? defaultVisibleCount : configuredMaxVisibleCount;
  const minVisibleCount = isFixedRangeChart ? defaultVisibleCount : configuredMinVisibleCount;
  const chartStateKey = getProductInsightChartViewportStateKey(product, chartRange);
  const allTimeHighValue = Math.max(
    1,
    allPoints.reduce((bestValue, point) => Math.max(bestValue, Math.max(0, toNumber(point?.value))), 0),
  );
  const latestIncomeValue = Math.max(
    0,
    Math.trunc(toNumber(allPoints[allPoints.length - 1]?.value)),
  );
  const dailyPriceScaleMinY = 1;
  const dailyVisibleHighValue = Math.max(
    1,
    allPoints.reduce((bestValue, point) => Math.max(bestValue, Math.max(0, toNumber(point?.value))), 0),
  );

  const chart = document.createElement("div");
  chart.className = "product-insight-rank-card__back-chart";

  const plotShell = document.createElement("div");
  plotShell.className = "product-insight-rank-card__back-chart-plot-shell";
  plotShell.title = isScaleInteractiveChart
    ? "Drag the graph up and down to move the income chart, or drag the total income scale on the right to zoom it."
    : isFixedRangeChart
      ? "Hover to inspect the fixed income chart and double-click to reset."
    : "Use mouse wheel or the zoom slider, drag to pan, and double-click to reset.";
  if (isScaleInteractiveChart) {
    plotShell.classList.add("is-scale-draggable");
  }

  const axis = document.createElement("div");
  axis.className = "product-insight-rank-card__back-chart-axis";
  if (isScaleInteractiveChart) {
    axis.classList.add("is-scale-draggable");
  }

  const plot = document.createElement("div");
  plot.className = "product-insight-rank-card__back-chart-plot";

  const svgNamespace = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNamespace, "svg");
  svg.setAttribute("class", "product-insight-rank-card__back-chart-svg");
  svg.setAttribute("viewBox", "0 0 220 110");
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("aria-hidden", "true");

  const defs = document.createElementNS(svgNamespace, "defs");
  const gradientId = `product-insight-line-gradient-${++productInsightStarGradientId}`;
  const gradient = document.createElementNS(svgNamespace, "linearGradient");
  gradient.setAttribute("id", gradientId);
  gradient.setAttribute("x1", "0%");
  gradient.setAttribute("y1", "0%");
  gradient.setAttribute("x2", "0%");
  gradient.setAttribute("y2", "100%");

  const topStop = document.createElementNS(svgNamespace, "stop");
  topStop.setAttribute("offset", "0%");
  topStop.setAttribute("style", "stop-color: rgba(var(--accent-rgb), 0.34)");

  const bottomStop = document.createElementNS(svgNamespace, "stop");
  bottomStop.setAttribute("offset", "100%");
  bottomStop.setAttribute("style", "stop-color: rgba(var(--accent-rgb), 0)");

  gradient.append(topStop, bottomStop);
  defs.appendChild(gradient);
  svg.appendChild(defs);

  const svgWidth = 220;
  const svgHeight = 110;
  const paddingLeft = 12;
  const paddingRight = 12;
  const paddingTop = 12;
  const paddingBottom = 16;
  const usableWidth = svgWidth - paddingLeft - paddingRight;
  const usableHeight = svgHeight - paddingTop - paddingBottom;
  const baselineY = svgHeight - paddingBottom;
  const footerShell = document.createElement("div");
  footerShell.className = "product-insight-rank-card__back-chart-footer-shell";

  const footerSpacer = document.createElement("div");
  footerSpacer.className = "product-insight-rank-card__back-chart-footer-spacer";

  const footer = document.createElement("div");
  footer.className = "product-insight-rank-card__back-chart-footer";

  const tooltip = document.createElement("div");
  tooltip.className = "product-insight-rank-card__back-chart-tooltip";
  tooltip.hidden = true;

  const zoom = document.createElement("div");
  zoom.className = "product-insight-rank-card__back-chart-zoom";

  const zoomLabel = document.createElement("span");
  zoomLabel.className = "product-insight-rank-card__back-chart-zoom-label";
  zoomLabel.textContent = "Zoom";

  const zoomRange = document.createElement("input");
  zoomRange.className = "product-insight-rank-card__back-chart-zoom-range";
  zoomRange.type = "range";
  zoomRange.min = String(minVisibleCount);
  zoomRange.max = String(maxVisibleCount);
  zoomRange.step = "1";
  zoomRange.setAttribute("aria-label", "Zoom income chart");

  const zoomScale = document.createElement("div");
  zoomScale.className = "product-insight-rank-card__back-chart-zoom-scale";

  const zoomInLabel = document.createElement("span");
  zoomInLabel.textContent = "In";

  const zoomOutLabel = document.createElement("span");
  zoomOutLabel.textContent = "Out";

  zoomScale.append(zoomInLabel, zoomOutLabel);
  zoom.append(zoomLabel, zoomRange, zoomScale);

  plotShell.append(plot, axis);
  footerShell.append(footer, footerSpacer);
  chart.append(plotShell, footerShell);
  if (!isFixedRangeChart) {
    chart.appendChild(zoom);
  }

  const getVisibleWindowHigh = (xStart, visibleCount) => {
    const safeStart = Math.max(0, Math.trunc(toNumber(xStart)));
    const safeVisibleCount = Math.max(1, Math.trunc(toNumber(visibleCount)));
    return allPoints
      .slice(safeStart, safeStart + safeVisibleCount)
      .reduce((bestValue, point) => Math.max(bestValue, Math.max(0, toNumber(point?.value))), 0);
  };

  const resolveViewportYMax = (xStart, visibleCount) => {
    if (chartRange === "daily") {
      return dailyVisibleHighValue;
    }

    const visibleHigh = getVisibleWindowHigh(xStart, visibleCount);
    return getProductInsightChartZoomedYMax({
      allTimeHighValue,
      latestValue: latestIncomeValue,
      visibleHigh,
      defaultVisibleCount,
      minVisibleCount,
      visibleCount,
    });
  };

  const createDefaultViewport = () => {
    const defaultStart = Math.max(0, allPoints.length - defaultVisibleCount);

    return {
      xStart: defaultStart,
      visibleCount: defaultVisibleCount,
      yMin: 0,
      yMax: resolveViewportYMax(defaultStart, defaultVisibleCount),
    };
  };

  const clampViewportState = (nextState) => {
    const requestedVisibleCount = Math.round(toNumber(nextState?.visibleCount)) || defaultVisibleCount;
    const resolvedVisibleCount = clampProductInsightValue(
      requestedVisibleCount,
      minVisibleCount,
      maxVisibleCount,
    );
    const maxStart = Math.max(0, allPoints.length - resolvedVisibleCount);
    const xStart = clampProductInsightValue(Math.round(toNumber(nextState?.xStart)), 0, maxStart);
    const requestedYMin = toNumber(nextState?.yMin);
    const requestedYMax = toNumber(nextState?.yMax);
    const resolvedYAxis = isScaleInteractiveChart
      ? (() => {
          let nextYMin = requestedYMin >= 0 ? requestedYMin : 0;
          const fallbackYMax = resolveViewportYMax(xStart, resolvedVisibleCount);
          let nextYMax = requestedYMax > nextYMin
            ? requestedYMax
            : Math.max(nextYMin + dailyPriceScaleMinY, fallbackYMax);

          if (nextYMin < 0) {
            nextYMax += -nextYMin;
            nextYMin = 0;
          }

          if (nextYMax <= nextYMin) {
            nextYMax = nextYMin + dailyPriceScaleMinY;
          }

          return {
            yMin: nextYMin,
            yMax: nextYMax,
          };
        })()
      : {
          yMin: 0,
          yMax: resolveViewportYMax(xStart, resolvedVisibleCount),
        };

    return {
      xStart,
      visibleCount: resolvedVisibleCount,
      yMin: resolvedYAxis.yMin,
      yMax: resolvedYAxis.yMax,
    };
  };

  let viewportState = clampViewportState(
    productInsightChartViewportState.get(chartStateKey) ?? createDefaultViewport(),
  );
  productInsightChartViewportState.set(chartStateKey, viewportState);
  let hoveredCoordinateIndex = -1;
  let currentCoordinates = [];
  let isDragging = false;
  const getDailyViewportSpan = (viewport) => Math.max(
    1,
    toNumber(viewport?.yMax) - toNumber(viewport?.yMin),
  );

  const applyDailyScaleZoom = (baseViewport, deltaY) => {
    const zoomFactor = Math.exp(deltaY / 180);
    const baseYMin = Math.max(0, toNumber(baseViewport?.yMin));
    const baseSpan = getDailyViewportSpan(baseViewport);
    const nextSpan = Math.max(dailyPriceScaleMinY, baseSpan * zoomFactor);
    setViewportState({
      xStart: baseViewport.xStart,
      visibleCount: baseViewport.visibleCount,
      yMin: baseYMin,
      yMax: baseYMin + nextSpan,
    });
    renderViewport();
  };

  const applyDailyChartMove = (baseViewport, deltaY, boundsHeight) => {
    const safeHeight = Math.max(1, toNumber(boundsHeight));
    const baseYMin = Math.max(0, toNumber(baseViewport?.yMin));
    const baseSpan = getDailyViewportSpan(baseViewport);
    const valueShift = (deltaY / safeHeight) * baseSpan;
    let nextYMin = baseYMin + valueShift;
    let nextYMax = baseYMin + baseSpan + valueShift;

    if (nextYMin < 0) {
      nextYMax += -nextYMin;
      nextYMin = 0;
    }

    setViewportState({
      xStart: baseViewport.xStart,
      visibleCount: baseViewport.visibleCount,
      yMin: nextYMin,
      yMax: Math.max(nextYMin + dailyPriceScaleMinY, nextYMax),
    });
    renderViewport();
  };

  const syncZoomRange = () => {
    if (isFixedRangeChart) {
      return;
    }

    zoomRange.value = String(viewportState.visibleCount);
    const progress = maxVisibleCount > minVisibleCount
      ? ((viewportState.visibleCount - minVisibleCount) / (maxVisibleCount - minVisibleCount)) * 100
      : 0;
    zoomRange.style.setProperty("--product-insight-zoom-fill", `${progress}%`);
  };

  const renderViewport = () => {
    const visiblePoints = allPoints.slice(
      viewportState.xStart,
      viewportState.xStart + viewportState.visibleCount,
    );
    const axisTicks = isScaleInteractiveChart
      ? buildProductInsightAxisTicksFromRange(viewportState.yMin, viewportState.yMax, 7)
      : getProductInsightChartAxisConfig(viewportState.yMin, viewportState.yMax).ticks;
    const yMax = Math.max(1, axisTicks[0] ?? viewportState.yMax);
    const ySpan = Math.max(1, yMax - viewportState.yMin);
    const stepX = visiblePoints.length > 1 ? usableWidth / (visiblePoints.length - 1) : 0;

    axis.replaceChildren();
    axisTicks.forEach((tickValue) => {
      const axisLabel = document.createElement("span");
      axisLabel.className = "product-insight-rank-card__back-chart-axis-label";
      axisLabel.textContent = formatProductInsightWholeCurrency(tickValue);
      axis.appendChild(axisLabel);
    });

    svg.replaceChildren(defs);
    footer.replaceChildren();

    const coordinates = visiblePoints.map((point, index) => {
      const x = paddingLeft + (stepX * index);
      const normalizedValue = (point.value - viewportState.yMin) / ySpan;
      const y = paddingTop + (1 - normalizedValue) * usableHeight;

      return {
        x: Number(x.toFixed(2)),
        y: Number(y.toFixed(2)),
        seriesIndex: viewportState.xStart + index,
        label: point.label,
        yearLabel: point.yearLabel ?? "",
        fullLabel: point.fullLabel ?? point.label,
        value: Math.max(0, Math.trunc(toNumber(point.value))),
      };
    });
    currentCoordinates = coordinates;

    axisTicks.slice(1, -1).forEach((tickValue) => {
      const guide = document.createElementNS(svgNamespace, "line");
      const guideY = paddingTop + (1 - ((tickValue - viewportState.yMin) / ySpan)) * usableHeight;
      guide.setAttribute("class", "product-insight-rank-card__back-chart-guide");
      guide.setAttribute("x1", String(paddingLeft));
      guide.setAttribute("x2", String(svgWidth - paddingRight));
      guide.setAttribute("y1", String(guideY));
      guide.setAttribute("y2", String(guideY));
      svg.appendChild(guide);
    });

    const linePathData = buildProductInsightSmoothLinePath(coordinates);

    const areaPathData = coordinates.length
      ? `${linePathData} L ${coordinates[coordinates.length - 1].x} ${baselineY} L ${coordinates[0].x} ${baselineY} Z`
      : "";

    if (areaPathData) {
      const areaPath = document.createElementNS(svgNamespace, "path");
      areaPath.setAttribute("class", "product-insight-rank-card__back-chart-area");
      areaPath.setAttribute("d", areaPathData);
      areaPath.setAttribute("fill", `url(#${gradientId})`);
      svg.appendChild(areaPath);
    }

    if (linePathData) {
      const linePath = document.createElementNS(svgNamespace, "path");
      linePath.setAttribute("class", "product-insight-rank-card__back-chart-line");
      linePath.setAttribute("d", linePathData);
      svg.appendChild(linePath);
    }

    const latestIncomeSeriesIndex = Math.max(0, allPoints.length - 1);
    const latestPoint = allPoints[latestIncomeSeriesIndex] ?? null;
    const latestValue = Math.max(0, Math.trunc(toNumber(latestPoint?.value)));
    const latestY = paddingTop + (1 - ((latestValue - viewportState.yMin) / ySpan)) * usableHeight;
    const latestCoordinate = coordinates.find(
      (coordinate) => coordinate.seriesIndex === latestIncomeSeriesIndex,
    ) ?? null;

    if (latestPoint) {
      const previousPoint = allPoints[latestIncomeSeriesIndex - 1] ?? null;
      const previousValue = Math.max(0, Math.trunc(toNumber(previousPoint?.value)));
      const activeDirection = previousPoint
        ? (latestValue > previousValue
            ? "is-up"
            : latestValue < previousValue
              ? "is-down"
              : "is-flat")
        : "is-flat";

      const activePrice = document.createElement("div");
      activePrice.className = [
        "product-insight-rank-card__back-chart-active-price",
        activeDirection,
      ].join(" ");
      activePrice.textContent = formatProductInsightWholeCurrency(latestValue);
      axis.appendChild(activePrice);

      const latestVisualY = latestY;
      activePrice.style.top = `${(latestVisualY / svgHeight) * 100}%`;
      activePrice.style.transform = "translateY(-50%)";

      if (viewportState.visibleCount <= defaultVisibleCount) {
        const activeLine = document.createElementNS(svgNamespace, "line");
        activeLine.setAttribute(
          "class",
          `product-insight-rank-card__back-chart-active-line ${activeDirection}`,
        );
        activeLine.setAttribute("x1", String(paddingLeft));
        activeLine.setAttribute("x2", String(svgWidth - paddingRight));
        activeLine.setAttribute("y1", String(latestVisualY));
        activeLine.setAttribute("y2", String(latestVisualY));
        svg.appendChild(activeLine);
      }

      if (latestCoordinate) {
        const dot = document.createElementNS(svgNamespace, "circle");
        dot.setAttribute("class", "product-insight-rank-card__back-chart-dot");
        dot.setAttribute("cx", String(latestCoordinate.x));
        dot.setAttribute("cy", String(latestVisualY));
        dot.setAttribute("r", "2.8");
        svg.appendChild(dot);
      }
    }

    const footerLabelStep = getProductInsightChartFooterLabelStep(chartRange, coordinates.length);
    const footerLabelIndexes = new Set([0, Math.max(0, coordinates.length - 1)]);
    for (let index = 0; index < coordinates.length; index += footerLabelStep) {
      footerLabelIndexes.add(index);
    }
    if (coordinates.length > 2 && footerLabelStep > 1) {
      footerLabelIndexes.add(Math.floor((coordinates.length - 1) / 2));
    }

    coordinates.forEach((coordinate, index) => {
      if (!footerLabelIndexes.has(index)) {
        return;
      }

      const stat = document.createElement("div");
      stat.className = "product-insight-rank-card__back-chart-stat";
      stat.style.left = `${(coordinate.x / svgWidth) * 100}%`;
      stat.title = coordinate.fullLabel;

      const label = document.createElement("span");
      label.className = "product-insight-rank-card__back-chart-stat-label";
      label.textContent = coordinate.label;
      stat.appendChild(label);

      if (coordinate.yearLabel) {
        const year = document.createElement("span");
        year.className = "product-insight-rank-card__back-chart-stat-year";
        year.textContent = coordinate.yearLabel;
        stat.appendChild(year);
      }

      footer.appendChild(stat);
    });

    const hoveredCoordinate = coordinates[hoveredCoordinateIndex] ?? null;
    if (hoveredCoordinate) {
      const previousPoint = allPoints[hoveredCoordinate.seriesIndex - 1] ?? null;
      const previousAmount = Math.max(0, Math.trunc(toNumber(previousPoint?.value)));
      const deltaAmount = hoveredCoordinate.value - previousAmount;
      const hoveredSoldPoint = allSoldPoints[hoveredCoordinate.seriesIndex] ?? null;
      const hoveredSoldValue = Math.max(0, Math.trunc(toNumber(hoveredSoldPoint?.value)));
      const percentageChange = previousAmount > 0
        ? (deltaAmount / previousAmount) * 100
        : hoveredCoordinate.value > 0
          ? 100
          : 0;
      const hoverSnapshot = {
        currentAmount: hoveredCoordinate.value,
        previousAmount,
        deltaAmount,
        percentageChange,
        direction: deltaAmount > 0 ? "up" : deltaAmount < 0 ? "down" : "flat",
        currentLabel: hoveredCoordinate.fullLabel,
        previousLabel: previousPoint?.fullLabel ?? "Previous point",
        currentSold: hoveredSoldValue,
      };
      const hoverLine = document.createElementNS(svgNamespace, "line");
      hoverLine.setAttribute("class", "product-insight-rank-card__back-chart-hover-line");
      hoverLine.setAttribute("x1", String(hoveredCoordinate.x));
      hoverLine.setAttribute("x2", String(hoveredCoordinate.x));
      hoverLine.setAttribute("y1", String(paddingTop));
      hoverLine.setAttribute("y2", String(baselineY));
      svg.appendChild(hoverLine);

      const hoverDot = document.createElementNS(svgNamespace, "circle");
      hoverDot.setAttribute("class", "product-insight-rank-card__back-chart-hover-dot");
      hoverDot.setAttribute("cx", String(hoveredCoordinate.x));
      hoverDot.setAttribute("cy", String(hoveredCoordinate.y));
      hoverDot.setAttribute("r", "3.4");
      svg.appendChild(hoverDot);

      const tooltipTitle = document.createElement("strong");
      tooltipTitle.textContent = hoveredCoordinate.fullLabel;

      const tooltipValue = document.createElement("span");
      tooltipValue.textContent = `Total income: ${formatProductInsightCurrency(hoveredCoordinate.value)}`;

      const tooltipSold = document.createElement("span");
      tooltipSold.textContent = `Total sold: ${hoveredSoldValue}`;

      tooltip.replaceChildren(tooltipTitle, tooltipValue, tooltipSold);
      tooltip.hidden = false;
      tooltip.style.left = `${clampProductInsightValue((hoveredCoordinate.x / svgWidth) * 100, 18, 82)}%`;
      tooltip.style.top = `${clampProductInsightValue((hoveredCoordinate.y / svgHeight) * 100, 22, 82)}%`;
      if (typeof onHoverChange === "function") {
        onHoverChange(hoverSnapshot);
      }
    } else {
      tooltip.hidden = true;
      tooltip.replaceChildren();
      if (typeof onHoverReset === "function") {
        onHoverReset();
      }
    }
    syncZoomRange();
  };

  const setViewportState = (nextState) => {
    viewportState = clampViewportState(nextState);
    productInsightChartViewportState.set(chartStateKey, viewportState);
  };

  const clearHoveredCoordinate = (shouldRender = true) => {
    if (hoveredCoordinateIndex === -1) {
      tooltip.hidden = true;
      return;
    }

    hoveredCoordinateIndex = -1;
    tooltip.hidden = true;
    if (shouldRender) {
      renderViewport();
    }
  };

  const updateHoveredCoordinate = (event) => {
    if (isDragging || !currentCoordinates.length) {
      return;
    }

    const bounds = plot.getBoundingClientRect();
    if (!bounds.width) {
      return;
    }

    const relativeX = clampProductInsightValue(
      ((event.clientX - bounds.left) / bounds.width) * svgWidth,
      paddingLeft,
      svgWidth - paddingRight,
    );
    const nextIndex = currentCoordinates.reduce((bestIndex, coordinate, index, list) => {
      if (bestIndex < 0) {
        return index;
      }

      const bestDistance = Math.abs(list[bestIndex].x - relativeX);
      const nextDistance = Math.abs(coordinate.x - relativeX);
      return nextDistance < bestDistance ? index : bestIndex;
    }, -1);

    if (nextIndex === hoveredCoordinateIndex) {
      return;
    }

    hoveredCoordinateIndex = nextIndex;
    renderViewport();
  };

  plot.append(svg, tooltip);
  renderViewport();

  plotShell.addEventListener("dblclick", () => {
    setViewportState(createDefaultViewport());
    renderViewport();
  });

  plotShell.addEventListener("pointermove", (event) => {
    updateHoveredCoordinate(event);
  });

  plotShell.addEventListener("pointerleave", () => {
    if (isDragging) {
      return;
    }
    clearHoveredCoordinate();
  });

  if (isScaleInteractiveChart) {
    axis.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      isDragging = true;
      clearHoveredCoordinate(false);
      const startY = event.clientY;
      const startViewport = { ...viewportState };
      const minYMax = dailyPriceScaleMinY;
      axis.classList.add("is-scale-dragging");

      const handlePointerMove = (moveEvent) => {
        const deltaY = moveEvent.clientY - startY;
        applyDailyScaleZoom(
          {
            xStart: startViewport.xStart,
            visibleCount: startViewport.visibleCount,
            yMin: Math.max(0, startViewport.yMin),
            yMax: Math.max(minYMax, startViewport.yMax),
          },
          deltaY,
        );
      };

      const handlePointerUp = () => {
        isDragging = false;
        axis.classList.remove("is-scale-dragging");
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        window.removeEventListener("pointercancel", handlePointerUp);
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
      window.addEventListener("pointercancel", handlePointerUp);
    });

    axis.addEventListener("wheel", (event) => {
      if (!event.deltaY) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      const currentSpan = getDailyViewportSpan(viewportState);
      const nextSpan = Math.max(
        dailyPriceScaleMinY,
        currentSpan * (event.deltaY > 0 ? 1.12 : 0.9),
      );

      if (Math.abs(nextSpan - currentSpan) < 1) {
        return;
      }

      setViewportState({
        xStart: viewportState.xStart,
        visibleCount: viewportState.visibleCount,
        yMin: Math.max(0, viewportState.yMin),
        yMax: Math.max(0, viewportState.yMin) + nextSpan,
      });
      renderViewport();
    }, { passive: false });
  }

  if (!isFixedRangeChart) {
    plotShell.addEventListener("wheel", (event) => {
      if (!currentCoordinates.length || !event.deltaY) {
        return;
      }

      event.preventDefault();
      const zoomStep = Math.max(1, Math.round(viewportState.visibleCount * 0.14));
      const nextVisibleCount = clampProductInsightValue(
        viewportState.visibleCount + (event.deltaY > 0 ? zoomStep : -zoomStep),
        minVisibleCount,
        maxVisibleCount,
      );

      if (nextVisibleCount === viewportState.visibleCount) {
        updateHoveredCoordinate(event);
        return;
      }

      const bounds = plot.getBoundingClientRect();
      const ratio = bounds.width
        ? clampProductInsightValue((event.clientX - bounds.left) / bounds.width, 0, 1)
        : 1;
      const anchorOffset = Math.round((viewportState.visibleCount - 1) * ratio);
      const anchorIndex = viewportState.xStart + anchorOffset;
      const nextStart = anchorIndex - Math.round((nextVisibleCount - 1) * ratio);

      hoveredCoordinateIndex = -1;
      setViewportState({
        xStart: nextStart,
        visibleCount: nextVisibleCount,
      });
      renderViewport();
      updateHoveredCoordinate(event);
    }, { passive: false });

    zoomRange.addEventListener("input", () => {
      const nextVisibleCount = clampProductInsightValue(
        Math.round(toNumber(zoomRange.value)),
        minVisibleCount,
        maxVisibleCount,
      );

      if (nextVisibleCount === viewportState.visibleCount) {
        syncZoomRange();
        return;
      }

      const anchorIndex = viewportState.xStart + Math.round((viewportState.visibleCount - 1) / 2);
      const nextStart = anchorIndex - Math.round((nextVisibleCount - 1) / 2);
      hoveredCoordinateIndex = -1;
      setViewportState({
        xStart: nextStart,
        visibleCount: nextVisibleCount,
      });
      renderViewport();
    });
  }

  plotShell.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    isDragging = true;
    clearHoveredCoordinate();
    const startViewport = { ...viewportState };

    if (isScaleInteractiveChart) {
      const startY = event.clientY;
      const plotBounds = plot.getBoundingClientRect();
      plotShell.classList.add("is-scale-dragging");
      if (typeof plotShell.setPointerCapture === "function") {
        try {
          plotShell.setPointerCapture(event.pointerId);
        } catch {}
      }

      const handlePointerMove = (moveEvent) => {
        const deltaY = moveEvent.clientY - startY;
        applyDailyChartMove(startViewport, deltaY, plotBounds.height);
      };

      const handlePointerUp = () => {
        isDragging = false;
        plotShell.classList.remove("is-scale-dragging");
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        window.removeEventListener("pointercancel", handlePointerUp);
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
      window.addEventListener("pointercancel", handlePointerUp);
      return;
    }

    const startX = event.clientX;
    const stepPixels = startViewport.visibleCount > 1
      ? usableWidth / (startViewport.visibleCount - 1)
      : usableWidth;

    plotShell.classList.add("is-dragging");
    if (typeof plotShell.setPointerCapture === "function") {
      try {
        plotShell.setPointerCapture(event.pointerId);
      } catch {}
    }

    const handlePointerMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const xShift = stepPixels > 0 ? Math.round((-deltaX / stepPixels)) : 0;

      setViewportState({
        xStart: startViewport.xStart + xShift,
        visibleCount: startViewport.visibleCount,
      });
      renderViewport();
    };

    const handlePointerUp = () => {
      isDragging = false;
      plotShell.classList.remove("is-dragging");
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
  });

  return chart;
}

function createRankCard(product, options) {
  const {
    rank,
    metricText,
    metricMode,
    metricNode,
    interactive = false,
    selected = false,
    productIdentifier = "",
  } = options;
  const card = document.createElement("article");
  card.className = "product-insight-rank-card";

  if (interactive && productIdentifier) {
    card.dataset.productInsightProductId = productIdentifier;
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-pressed", selected ? "true" : "false");
    card.classList.add("is-interactive");
    card.classList.toggle("is-selected", selected);
  }

  const header = document.createElement("div");
  header.className = "product-insight-rank-card__header";

  const leading = document.createElement("div");
  leading.className = "product-insight-rank-card__leading";
  leading.append(createRankBadge(rank), createProductMedia(product));

  const info = document.createElement("div");
  info.className = "product-insight-rank-card__title";

  const title = document.createElement("h3");
  title.textContent = product.name || "Unnamed Product";

  const subtitle = document.createElement("p");
  subtitle.textContent = `${product.category || "General"} - ${formatPrice(getPrice(product))}`;

  info.append(title, subtitle);
  header.append(leading, info);

  const metrics = document.createElement("div");
  metrics.className = "product-insight-rank-card__metrics";
  metrics.append(
    createMetricItem("Rating", formatRating(getRating(product))),
    createMetricItem("Reviews", String(getProductInsightReviewCount(product))),
    createMetricItem(
      metricMode === "sold" ? getProductInsightSoldMetricLabel() : "Sold",
      String(getProductInsightSoldCount(product)),
    ),
    createMetricItem("Total income", createProductInsightCurrencyValue(getTotalIncome(product))),
  );

  card.append(header, metrics);

  return card;
}

function createLeaderCard(title, product, metricText, metricMode, metricNode) {
  const card = document.createElement("article");
  card.className = "product-insight-leader-card";

  const eyebrow = document.createElement("p");
  eyebrow.className = "section-label";
  eyebrow.textContent = title;

  const header = document.createElement("div");
  header.className = "product-insight-leader-card__header";
  header.append(createProductMedia(product));

  const body = document.createElement("div");
  body.className = "product-insight-leader-card__body";

  const name = document.createElement("h3");
  name.textContent = product.name || "Unnamed Product";

  const copy = document.createElement("p");
  copy.textContent = `${product.category || "General"} - ${formatPrice(getPrice(product))}`;

  body.append(name, copy);
  header.appendChild(body);

  const metrics = document.createElement("div");
  metrics.className = "product-insight-rank-card__metrics";
  metrics.append(
    createMetricItem("Rating", formatRating(getRating(product))),
    createMetricItem("Reviews", String(getProductInsightReviewCount(product))),
    createMetricItem(getProductInsightSoldMetricLabel(), String(getProductInsightSoldCount(product))),
  );

  card.append(eyebrow, header, metrics);
  return card;
}

function renderSummary(products, soldProducts, ratedProducts) {
  const topSoldProduct = soldProducts[0] || null;
  const topRatedProduct = ratedProducts[0] || null;

  if (totalProductsEl) {
    totalProductsEl.textContent = String(products.length);
  }

  if (topSoldEl) {
    topSoldEl.textContent = String(getProductInsightSoldCount(topSoldProduct));
  }

  renderSummaryRating(topRatingEl, getRating(topRatedProduct));

  if (ratedProductsEl) {
    ratedProductsEl.textContent = String(ratedProducts.length);
  }

  if (soldCountPillEl) {
    soldCountPillEl.textContent = `${soldProducts.length} item${soldProducts.length === 1 ? "" : "s"}`;
  }

  if (reviewCountPillEl) {
    reviewCountPillEl.textContent = `${ratedProducts.length} item${ratedProducts.length === 1 ? "" : "s"}`;
  }
}

function renderRankList(element, products, emptyMessage, metricBuilder, options = {}) {
  if (!element) {
    return;
  }

  const { interactive = false, selectedProductId = "", rankMap = null } = options;

  element.replaceChildren();

  if (!products.length) {
    element.appendChild(createEmptyState(emptyMessage));
    return;
  }

  products.forEach((product, index) => {
    const productIdentifier = getProductInsightProductIdentifier(product);
    const resolvedRank = rankMap instanceof Map
      ? (rankMap.get(productIdentifier) ?? (index + 1))
      : (index + 1);
    element.appendChild(
      createRankCard(product, {
        rank: resolvedRank,
        ...metricBuilder(product),
        interactive,
        productIdentifier,
        selected: interactive && productIdentifier === selectedProductId,
      }),
    );
  });
}

function createProductInsightReviewBarRow(entry) {
  const row = document.createElement("div");
  row.className = "product-insight-review-breakdown__row";

  const label = document.createElement("span");
  label.className = "product-insight-review-breakdown__label";
  label.textContent = `${entry.stars}`;

  const track = document.createElement("div");
  track.className = "product-insight-review-breakdown__track";

  const fill = document.createElement("span");
  fill.className = "product-insight-review-breakdown__fill";
  fill.style.width = `${Math.max(0, Math.min(100, entry.percentage))}%`;
  track.appendChild(fill);

  const count = document.createElement("span");
  count.className = "product-insight-review-breakdown__count";
  count.textContent = String(entry.count);

  row.append(label, track, count);
  return row;
}

function createProductInsightReviewAvatar(authorName) {
  const avatar = document.createElement("span");
  avatar.className = "product-insight-review-comment__avatar";

  const initials = String(authorName ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  avatar.textContent = initials || "CU";
  return avatar;
}

function createProductInsightSellerReplyAvatar(reply) {
  const avatar = document.createElement("span");
  avatar.className = "product-insight-review-reply__avatar";
  const imageUrl = String(reply?.companyPictureUrl ?? "").trim();
  const label = String(reply?.companyName ?? reply?.author ?? "Seller").trim();

  if (imageUrl) {
    const image = document.createElement("img");
    image.src = imageUrl;
    image.alt = `${label || "Seller"} profile`;
    image.loading = "lazy";
    avatar.appendChild(image);
    return avatar;
  }

  avatar.textContent = (label.charAt(0) || "S").toUpperCase();
  return avatar;
}

function createProductInsightSellerReplyBlock(reply) {
  if (!reply?.message) {
    return null;
  }

  const block = document.createElement("section");
  block.className = "product-insight-review-reply";

  const identity = document.createElement("div");
  identity.className = "product-insight-review-reply__identity";

  const company = document.createElement("strong");
  company.textContent = reply.companyName || reply.author || "Seller";

  const label = document.createElement("span");
  label.textContent = "Seller reply";

  identity.append(company, label);

  const message = document.createElement("p");
  message.className = "product-insight-review-reply__copy";
  message.textContent = reply.message;

  const body = document.createElement("div");
  body.className = "product-insight-review-reply__body";
  body.append(identity, message);

  block.append(createProductInsightSellerReplyAvatar(reply), body);
  return block;
}

async function saveProductInsightReviewReply(review, replyText, controls = {}) {
  const productId = String(review?.productId ?? selectedSoldProductId ?? "").trim();
  const reviewId = String(review?.id ?? "").trim();
  const orderId = String(review?.orderId ?? "").trim();
  const normalizedReplyText = String(replyText ?? "").replace(/\s+/g, " ").trim();

  if (!normalizedReplyText) {
    throw new Error("Write a reply before saving.");
  }
  if (!productId || (!reviewId && !orderId)) {
    throw new Error("Unable to identify this review.");
  }

  controls.saveButton?.setAttribute("disabled", "true");
  if (controls.status) {
    controls.status.textContent = "Saving reply...";
  }

  const response = await fetch("/api/product-reviews/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      productId,
      reviewId,
      orderId,
      reply: normalizedReplyText,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Unable to save seller reply.");
  }

  if (controls.status) {
    controls.status.textContent = "Reply saved.";
  }
  setActiveProductInsightSideView("reviews");
  await loadProductInsight();
}

function createProductInsightReviewReplyEditor(review) {
  const editor = document.createElement("form");
  editor.className = "product-insight-review-reply-form";
  editor.hidden = true;

  const textarea = document.createElement("textarea");
  textarea.className = "product-insight-review-reply-form__input";
  textarea.rows = 3;
  textarea.maxLength = 500;
  textarea.placeholder = "Write a seller reply...";
  textarea.value = review?.sellerReply?.message ?? "";
  textarea.setAttribute("aria-label", `Seller reply to ${review.author}`);

  const footer = document.createElement("div");
  footer.className = "product-insight-review-reply-form__footer";

  const status = document.createElement("span");
  status.className = "product-insight-review-reply-form__status";
  status.setAttribute("role", "status");

  const cancelButton = document.createElement("button");
  cancelButton.type = "button";
  cancelButton.className = "product-insight-review-reply-form__button";
  cancelButton.textContent = "Cancel";

  const saveButton = document.createElement("button");
  saveButton.type = "submit";
  saveButton.className = "product-insight-review-reply-form__button is-primary";
  saveButton.textContent = "Save Reply";

  footer.append(status, cancelButton, saveButton);
  editor.append(textarea, footer);

  cancelButton.addEventListener("click", () => {
    editor.hidden = true;
    status.textContent = "";
  });

  editor.addEventListener("submit", async (event) => {
    event.preventDefault();
    status.textContent = "";
    try {
      await saveProductInsightReviewReply(review, textarea.value, {
        saveButton,
        status,
      });
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : "Unable to save reply.";
      saveButton.removeAttribute("disabled");
    }
  });

  return {
    editor,
    textarea,
    show() {
      editor.hidden = false;
      window.requestAnimationFrame(() => textarea.focus());
    },
  };
}

function createProductInsightReviewCommentCard(review) {
  const card = document.createElement("article");
  card.className = "product-insight-review-comment";

  const person = document.createElement("div");
  person.className = "product-insight-review-comment__person";

  const identity = document.createElement("div");
  identity.className = "product-insight-review-comment__identity";

  const author = document.createElement("strong");
  author.textContent = review.author;

  const age = document.createElement("span");
  age.textContent = review.age;

  const rating = createRatingStars(review.rating);
  rating.classList.add("product-insight-review-comment__rating");

  const ratingRow = document.createElement("div");
  ratingRow.className = "product-insight-review-comment__rating-row";

  const reviewDate = document.createElement("span");
  reviewDate.className = "product-insight-review-comment__date";
  reviewDate.textContent = formatProductInsightReviewNumericDate(review);

  identity.append(author, age);
  ratingRow.append(rating, reviewDate);

  const comment = document.createElement("p");
  comment.className = "product-insight-review-comment__copy";
  comment.textContent = review.comment;

  const mediaGallery = createProductInsightReviewMediaGallery(review);
  const sellerReplyBlock = createProductInsightSellerReplyBlock(review.sellerReply);
  const replyEditor = createProductInsightReviewReplyEditor(review);

  const actions = document.createElement("div");
  actions.className = "product-insight-review-comment__actions";

  const likeButton = document.createElement("button");
  likeButton.type = "button";
  likeButton.className = "product-insight-review-comment__action";
  likeButton.setAttribute("aria-label", `Like review from ${review.author}`);

  const likeIcon = document.createElement("span");
  likeIcon.className = "product-insight-review-comment__action-icon";
  likeIcon.setAttribute("aria-hidden", "true");
  likeIcon.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9">
      <path
        d="M12 20.4 4.9 13.8a4.5 4.5 0 0 1 6.36-6.36L12 8.18l.74-.74a4.5 4.5 0 0 1 6.36 6.36L12 20.4Z"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  `;

  const likeLabel = document.createElement("span");
  likeLabel.textContent = "Like";

  const likeCount = document.createElement("span");
  likeCount.className = "product-insight-review-comment__action-count";

  let currentLikeCount = Math.max(0, Math.trunc(toNumber(review?.likeCount)));
  let isLiked = false;

  const syncLikeButton = () => {
    likeButton.classList.toggle("is-active", isLiked);
    likeButton.setAttribute("aria-pressed", isLiked ? "true" : "false");
    likeCount.textContent = String(currentLikeCount);
  };

  likeButton.addEventListener("click", () => {
    isLiked = !isLiked;
    currentLikeCount += isLiked ? 1 : -1;
    syncLikeButton();
  });
  likeButton.append(likeIcon, likeLabel, likeCount);
  syncLikeButton();

  const commentButton = document.createElement("button");
  commentButton.type = "button";
  commentButton.className = "product-insight-review-comment__action";
  commentButton.setAttribute("aria-label", `Open comments for review from ${review.author}`);
  commentButton.addEventListener("click", () => {
    openProductInsightReviewCommentModal(review);
  });

  const commentIcon = document.createElement("span");
  commentIcon.className = "product-insight-review-comment__action-icon";
  commentIcon.setAttribute("aria-hidden", "true");
  commentIcon.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9">
      <path
        d="M7 17.5H4.8A1.8 1.8 0 0 1 3 15.7V6.8A1.8 1.8 0 0 1 4.8 5h14.4A1.8 1.8 0 0 1 21 6.8v8.9a1.8 1.8 0 0 1-1.8 1.8H11l-4 3v-3Z"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  `;

  const commentLabel = document.createElement("span");
  commentLabel.textContent = "Comment";

  const commentCount = document.createElement("span");
  commentCount.className = "product-insight-review-comment__action-count";
  commentCount.textContent = String(
    Math.max(0, Math.trunc(toNumber(review?.commentCount))),
  );

  commentButton.append(commentIcon, commentLabel, commentCount);

  const replyButton = document.createElement("button");
  replyButton.type = "button";
  replyButton.className = "product-insight-review-comment__action";
  replyButton.setAttribute(
    "aria-label",
    `${review.sellerReply ? "Edit seller reply" : "Reply"} to review from ${review.author}`,
  );
  replyButton.addEventListener("click", () => {
    replyEditor.show();
  });

  const replyIcon = document.createElement("span");
  replyIcon.className = "product-insight-review-comment__action-icon";
  replyIcon.setAttribute("aria-hidden", "true");
  replyIcon.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9">
      <path
        d="M9 10 4 15l5 5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M5 15h8.5A6.5 6.5 0 0 0 20 8.5V7"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  `;

  const replyLabel = document.createElement("span");
  replyLabel.textContent = review.sellerReply ? "Edit Reply" : "Reply";
  replyButton.append(replyIcon, replyLabel);

  actions.append(likeButton, commentButton, replyButton);

  person.append(createProductInsightReviewAvatar(review.author), identity);
  card.append(person, ratingRow);
  if (review.comment) {
    card.appendChild(comment);
  }
  if (mediaGallery) {
    card.appendChild(mediaGallery);
  }
  if (sellerReplyBlock) {
    card.appendChild(sellerReplyBlock);
  }
  card.appendChild(actions);
  card.appendChild(replyEditor.editor);

  if (review.comment) {
    requestAnimationFrame(() => {
      if (!(comment instanceof HTMLElement) || !comment.isConnected) {
        return;
      }

      if (comment.scrollHeight > comment.clientHeight + 1) {
        enableExpandableProductInsightComment(comment, review);
      }
    });
  }

  return card;
}

function createProductInsightReviewControls() {
  const controls = document.createElement("div");
  controls.className = "product-insight-review-summary__controls";

  controls.append(
    createProductInsightDropdown({
      name: "sort",
      ariaLabel: "Sort reviews",
      value: reviewSortMode,
      summary: reviewSortMode === "recent" ? "Most recent" : "Most relevant",
      dataAttributes: {
        reviewDropdown: "sort",
      },
      options: [
        { value: "relevant", label: "Most relevant" },
        { value: "recent", label: "Most recent" },
      ],
      onSelect: (nextValue) => {
        reviewSortMode = nextValue === "recent" ? "recent" : "relevant";
      },
    }),
    createProductInsightDropdown({
      name: "rating",
      ariaLabel: "Filter review rating",
      value: reviewRatingFilter,
      summary: reviewRatingFilter ? `Rating ${reviewRatingFilter}` : "Rating",
      dataAttributes: {
        reviewDropdown: "rating",
      },
      options: [
        { value: "", label: "Rating" },
        { value: "1", label: "1" },
        { value: "2", label: "2" },
        { value: "3", label: "3" },
        { value: "4", label: "4" },
        { value: "5", label: "5" },
      ],
      onSelect: (nextValue) => {
        reviewRatingFilter = String(nextValue ?? "").trim();
      },
    }),
  );
  return controls;
}

function createProductInsightSoldControls(options = {}) {
  const {
    includeOverall = true,
    value = soldRangeFilter,
    ariaLabel = "Filter sold products by timeframe",
  } = options;
  const controls = document.createElement("div");
  controls.className =
    "product-insight-review-summary__controls product-insight-sold-controls__inner";
  const resolvedValue = includeOverall
    ? normalizeProductInsightSoldRange(value)
    : normalizeProductInsightChartRange(value);
  const resolvedOptions = includeOverall
    ? [
        { value: "all", label: "Overall" },
        { value: "daily", label: "Daily" },
        { value: "weekly", label: "Weekly" },
        { value: "monthly", label: "Monthly" },
        { value: "yearly", label: "Yearly" },
      ]
    : [
        { value: "daily", label: "Daily" },
        { value: "weekly", label: "Weekly" },
        { value: "monthly", label: "Monthly" },
        { value: "yearly", label: "Yearly" },
      ];

  controls.append(
    createProductInsightDropdown({
      name: "range",
      ariaLabel,
      value: resolvedValue,
      summary: getProductInsightSoldRangeLabel(resolvedValue),
      dataAttributes: {
        soldDropdown: "range",
      },
      options: resolvedOptions,
      onSelect: (nextValue) => {
        soldRangeFilter = includeOverall
          ? normalizeProductInsightSoldRange(nextValue)
          : normalizeProductInsightChartRange(nextValue);
      },
    }),
  );

  return controls;
}

function createProductInsightSideSummary(product) {
  const summary = document.createElement("div");
  summary.className = "product-insight-side-summary";
  const controls = createProductInsightSoldControls();
  summary.append(controls);
  return summary;
}

function createProductInsightIncomeChartSummary(product) {
  const summary = document.createElement("div");
  summary.className = "product-insight-side-summary product-insight-income-chart-summary";
  const incomeChartRange = getProductInsightIncomeChartRange(soldRangeFilter);
  const defaultSnapshot = getProductInsightIncomeTrendSnapshot(product, incomeChartRange);
  const controls = createProductInsightSoldControls({
    includeOverall: false,
    value: incomeChartRange,
    ariaLabel: "Filter income chart by timeframe",
  });
  controls.classList.add("product-insight-income-chart-summary__controls");
  const topRow = document.createElement("div");
  topRow.className = "product-insight-income-chart-summary__top";
  const overview = createProductInsightIncomeOverview(product, incomeChartRange);

  const chart = createProductInsightIncomeChartPanel(product, {
    range: incomeChartRange,
    onHoverChange: (snapshot) => {
      applyProductInsightIncomeOverviewSnapshot(overview, snapshot);
    },
    onHoverReset: () => {
      applyProductInsightIncomeOverviewSnapshot(overview, defaultSnapshot);
    },
  });
  chart.classList.add("product-insight-income-chart-summary__chart");

  controls.appendChild(overview);
  topRow.appendChild(controls);
  summary.append(topRow, chart);
  return summary;
}

function createProductInsightReviewSummary(product, options = {}) {
  const { searchTerm = "" } = options;
  const rating = getRating(product);
  const totalReviews = getProductInsightReviewCount(product);
  const breakdown = buildProductInsightRatingBreakdown(product);
  const comments = buildProductInsightExampleReviews(product);
  const filteredComments = comments
    .filter((review) => matchesProductInsightReviewSearch(review, searchTerm))
    .filter((review) => matchesProductInsightReviewRating(review, reviewRatingFilter));
  const visibleComments = reviewSortMode === "recent"
    ? filteredComments
        .map((review, index) => ({ review, index }))
        .sort(
          (left, right) =>
            getProductInsightReviewAgeDays(left.review, left.index)
            - getProductInsightReviewAgeDays(right.review, right.index),
        )
        .map(({ review }) => review)
    : filteredComments;
  const panel = document.createElement("div");
  panel.className = "product-insight-review-summary";

  if (rating <= 0 || totalReviews <= 0) {
    panel.appendChild(createEmptyState("No review details available yet for this product."));
    return panel;
  }

  const hero = document.createElement("div");
  hero.className = "product-insight-review-summary__hero";

  const controls = createProductInsightReviewControls();

  const score = document.createElement("div");
  score.className = "product-insight-review-summary__score";

  const scoreValue = document.createElement("strong");
  scoreValue.className = "product-insight-review-summary__score-value";
  scoreValue.textContent = formatRating(rating);

  const stars = createRatingStars(rating);
  stars.classList.add("product-insight-review-summary__stars");

  const total = document.createElement("span");
  total.className = "product-insight-review-summary__total";
  total.textContent = `${totalReviews} total review${totalReviews === 1 ? "" : "s"}`;

  score.append(scoreValue, stars, total);

  const bars = document.createElement("div");
  bars.className = "product-insight-review-breakdown";
  breakdown.forEach((entry) => {
    bars.appendChild(createProductInsightReviewBarRow(entry));
  });

  hero.append(score, bars);

  const commentsHeading = document.createElement("div");
  commentsHeading.className = "product-insight-review-summary__comments-heading";

  const commentsTitle = document.createElement("strong");
  commentsTitle.textContent = "Comment reviews";

  commentsHeading.appendChild(commentsTitle);

  const commentsList = document.createElement("div");
  commentsList.className = "product-insight-review-comments";
  if (visibleComments.length) {
    visibleComments.forEach((review) => {
      commentsList.appendChild(createProductInsightReviewCommentCard(review));
    });
  } else {
    commentsList.appendChild(createEmptyState("No matching comment reviews found."));
  }

  panel.append(controls, hero, commentsHeading, commentsList);
  return panel;
}

function renderProductInsightSideDetail(product) {
  if (!sideDetailEl) {
    return;
  }

  sideDetailEl.replaceChildren();

  if (!product) {
    if (activeProductInsightSideView === "sold") {
      sideDetailEl.appendChild(createProductInsightSideSummary());
      return;
    }

    sideDetailEl.appendChild(
      createEmptyState(
        activeProductInsightSideView === "reviews"
          ? "Click a product card to review rating details."
          : activeProductInsightSideView === "income"
            ? "Click a product card to review income chart details."
            : "Click a product card to review sold details.",
      ),
    );
    return;
  }

  sideDetailEl.appendChild(
    activeProductInsightSideView === "reviews"
      ? createProductInsightReviewSummary(product, { searchTerm: reviewSearchTerm })
      : activeProductInsightSideView === "income"
        ? createProductInsightIncomeChartSummary(product)
        : createProductInsightSideSummary(product),
  );
}

function renderLeaders(soldProducts, ratedProducts) {
  if (!leaderGridEl) {
    return;
  }

  leaderGridEl.replaceChildren();

  const topSoldProduct = soldProducts[0] || null;
  const topRatedProduct = ratedProducts[0] || null;

  if (!topSoldProduct && !topRatedProduct) {
    leaderGridEl.appendChild(createEmptyState("No product leaders available yet."));
    return;
  }

  if (topSoldProduct) {
    leaderGridEl.appendChild(
      createLeaderCard(
        getProductInsightSoldLeaderTitle(),
        topSoldProduct,
        `${getProductInsightSoldCount(topSoldProduct)} sold`,
        "sold",
      ),
    );
  }

  if (topRatedProduct) {
    leaderGridEl.appendChild(
      createLeaderCard(
        "Top Reviews",
        topRatedProduct,
        formatRating(getRating(topRatedProduct)),
        "review",
      ),
    );
  }
}

function setActiveTimeframeFilter(value) {
  soldRangeFilter = normalizeProductInsightSoldRange(value);
  timeframeFilterButtons.forEach((button) => {
    const isActive =
      normalizeProductInsightSoldRange(button.dataset.productInsightRangeFilter)
      === soldRangeFilter;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

function setActiveProductInsightSideView(value) {
  activeProductInsightSideView = value === "reviews"
    ? "reviews"
    : value === "income"
      ? "income"
      : "sold";
  sideViewButtons.forEach((button) => {
    const isActive = button.dataset.productInsightSideView === activeProductInsightSideView;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

function syncProductInsightReviewSearchState(product) {
  if (!reviewSearchInput || !reviewSearchShellEl) {
    return;
  }

  const hasSelectedProduct = Boolean(product);
  reviewSearchShellEl.hidden = activeProductInsightSideView !== "reviews" || !hasSelectedProduct;
  reviewSearchInput.disabled = !hasSelectedProduct;
  reviewSearchInput.setAttribute("aria-disabled", hasSelectedProduct ? "false" : "true");
  reviewSearchShellEl.classList.toggle("is-disabled", !hasSelectedProduct);
}

function renderProductInsight(products) {
  soldRangeFilter = normalizeProductInsightSoldRange(soldRangeFilter);
  soldMetricFilter = normalizeProductInsightMetricFilter(soldMetricFilter);
  setActiveTimeframeFilter(soldRangeFilter);
  renderSoldMetricFilterOptions();

  const soldProducts = [...products]
    .filter((product) => getProductInsightSoldCount(product) > 0)
    .sort((left, right) => {
      const soldDiff = getProductInsightSoldCount(right) - getProductInsightSoldCount(left);
      if (soldDiff !== 0) {
        return soldDiff;
      }

      const ratingDiff = getRating(right) - getRating(left);
      if (ratingDiff !== 0) {
        return ratingDiff;
      }

      return String(left.name || "").localeCompare(String(right.name || ""));
    });

  const ratedProducts = [...products]
    .filter((product) => getRating(product) > 0)
    .sort((left, right) => {
      const ratingDiff = getRating(right) - getRating(left);
      if (ratingDiff !== 0) {
        return ratingDiff;
      }

      const soldDiff = getProductInsightSoldCount(right) - getProductInsightSoldCount(left);
      if (soldDiff !== 0) {
        return soldDiff;
      }

      return String(left.name || "").localeCompare(String(right.name || ""));
    });

  const metricRankProducts = getProductInsightRankedProducts(products, soldMetricFilter);
  renderSoldCategoryFilterOptions(metricRankProducts);

  const soldSearchTerm = normalizeProductInsightSearch(soldSearchInput?.value);
  const hasSoldCategoryFilter = Boolean(
    normalizeProductInsightCategoryFilter(soldCategoryFilter),
  );
  const filteredSoldProducts = metricRankProducts.filter((product) =>
    matchesProductInsightSearch(product, soldSearchTerm)
    && matchesProductInsightCategory(product, soldCategoryFilter),
  );
  const rankedSoldProducts = getProductInsightRankedProducts(filteredSoldProducts, soldMetricFilter).slice(0, 10);
  const soldRankMap = new Map(
    rankedSoldProducts.map((product, index) => [getProductInsightProductIdentifier(product), index + 1]),
  );
  const selectedProduct = rankedSoldProducts.find(
    (product) => getProductInsightProductIdentifier(product) === selectedSoldProductId,
  ) || null;

  setActiveProductInsightSideView(activeProductInsightSideView);
  syncProductInsightReviewSearchState(selectedProduct);
  renderSummary(products, soldProducts, ratedProducts);
  renderRankList(
    soldListEl,
    rankedSoldProducts,
    soldSearchTerm || hasSoldCategoryFilter
      ? "No matching sold products found."
      : "No sold data available yet.",
    (product) => buildProductInsightRankMetric(product, soldMetricFilter),
    {
      interactive: true,
      selectedProductId: selectedSoldProductId,
      rankMap: soldRankMap,
    },
  );
  requestProductInsightSoldSpacerScrollState();
  requestProductInsightScrollProxyUpdate();
  renderProductInsightSideDetail(selectedProduct);
}

async function loadProductInsight() {
  try {
    const [productsPayload, ordersPayload] = await Promise.all([
      loadProductInsightJson("/api/products"),
      loadProductInsightJson("/api/orders"),
    ]);
    const products = Array.isArray(productsPayload.products) ? productsPayload.products : [];
    const orders = Array.isArray(ordersPayload.orders) ? ordersPayload.orders : [];

    currentProductInsightProducts = attachProductInsightOrderMetrics(products, orders);
    renderProductInsight(currentProductInsightProducts);
  } catch (error) {
    console.error(error);
    const message = "Unable to load product insight data right now.";

    if (soldListEl) {
      soldListEl.replaceChildren(createEmptyState(message));
    }

    syncProductInsightReviewSearchState(null);

    if (sideDetailEl) {
      sideDetailEl.replaceChildren(createEmptyState(message));
    }

    if (leaderGridEl) {
      leaderGridEl.replaceChildren(createEmptyState(message));
    }

    if (totalProductsEl) {
      totalProductsEl.textContent = "0";
    }

    if (topSoldEl) {
      topSoldEl.textContent = "0";
    }

    renderSummaryRating(topRatingEl, 0);

    if (ratedProductsEl) {
      ratedProductsEl.textContent = "0";
    }

    if (soldCountPillEl) {
      soldCountPillEl.textContent = "0 items";
    }

    if (reviewCountPillEl) {
      reviewCountPillEl.textContent = "0 items";
    }

    requestProductInsightScrollProxyUpdate();
  }
}

window.addEventListener("gms:products-updated", loadProductInsight);
window.addEventListener("resize", requestProductInsightScrollProxyUpdate);
document.addEventListener("wheel", handleProductInsightPageWheel, { passive: false });

timeframeFilterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setActiveTimeframeFilter(button.dataset.productInsightRangeFilter || "all");
    renderProductInsight(currentProductInsightProducts);
  });
});

sideViewButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setActiveProductInsightSideView(button.dataset.productInsightSideView || "sold");
    renderProductInsight(currentProductInsightProducts);
  });
});

soldSearchInput?.addEventListener("input", () => {
  window.clearTimeout(soldSearchTimer);
  soldSearchTimer = window.setTimeout(() => {
    renderProductInsight(currentProductInsightProducts);
  }, 500);
});

soldListEl?.addEventListener("scroll", () => {
  requestProductInsightSoldSpacerScrollState();
  requestProductInsightScrollProxyUpdate();
});

reviewSearchInput?.addEventListener("input", () => {
  window.clearTimeout(reviewSearchTimer);
  reviewSearchTimer = window.setTimeout(() => {
    reviewSearchTerm = normalizeProductInsightSearch(reviewSearchInput.value);
    renderProductInsight(currentProductInsightProducts);
  }, 500);
});

soldListEl?.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) {
    return;
  }

  const card = event.target.closest(".product-insight-rank-card[data-product-insight-product-id]");
  if (!card || !soldListEl.contains(card)) {
    return;
  }

  selectedSoldProductId = String(card.dataset.productInsightProductId ?? "").trim();
  setActiveProductInsightSideView("reviews");
  renderProductInsight(currentProductInsightProducts);
});

soldListEl?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  const card = event.target.closest(".product-insight-rank-card[data-product-insight-product-id]");
  if (!card || !soldListEl.contains(card)) {
    return;
  }

  event.preventDefault();
  selectedSoldProductId = String(card.dataset.productInsightProductId ?? "").trim();
  setActiveProductInsightSideView("reviews");
  renderProductInsight(currentProductInsightProducts);
});

soldCategoryFilterTrigger?.addEventListener("click", () => {
  setSoldMetricFilterOpen(false);
  setSoldCategoryFilterOpen(soldCategoryFilterMenu?.hidden ?? true);
});

soldMetricFilterTrigger?.addEventListener("click", () => {
  setSoldCategoryFilterOpen(false);
  setSoldMetricFilterOpen(soldMetricFilterMenu?.hidden ?? true);
});

document.addEventListener("click", (event) => {
  if (
    soldCategoryFilterDropdown
    && event.target instanceof Node
    && !soldCategoryFilterDropdown.contains(event.target)
  ) {
    setSoldCategoryFilterOpen(false);
  }

  if (
    soldMetricFilterDropdown
    && event.target instanceof Node
    && !soldMetricFilterDropdown.contains(event.target)
  ) {
    setSoldMetricFilterOpen(false);
  }

  if (
    event.target instanceof Node
    && !Array.from(document.querySelectorAll(".product-insight-dropdown")).some(
      (dropdown) => dropdown.contains(event.target),
    )
  ) {
    closeProductInsightDropdowns();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && soldCategoryFilterMenu && !soldCategoryFilterMenu.hidden) {
    setSoldCategoryFilterOpen(false);
    soldCategoryFilterTrigger?.focus();
  }

  if (event.key === "Escape" && soldMetricFilterMenu && !soldMetricFilterMenu.hidden) {
    setSoldMetricFilterOpen(false);
    soldMetricFilterTrigger?.focus();
  }

  if (event.key === "Escape") {
    const openReviewDropdown = document.querySelector(".product-insight-dropdown.is-open");
    if (openReviewDropdown instanceof HTMLElement) {
      closeProductInsightDropdowns();
      openReviewDropdown.querySelector(".product-category-multiselect__trigger")?.focus();
    }
  }
});

syncSoldCategoryFilterSummary();
syncSoldMetricFilterSummary();
renderSoldMetricFilterOptions();
setActiveTimeframeFilter(soldRangeFilter);
setActiveProductInsightSideView(activeProductInsightSideView);
loadProductInsight();
