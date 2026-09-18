const salesChart = document.getElementById("sales-chart");
const salesChartTotalPill = document.getElementById("sales-chart-total-pill");
const salesChartPeriodLabel = document.getElementById("sales-chart-period-label");
const salesChartPeakLabel = document.getElementById("sales-chart-peak-label");
const salesPeriodButtons = document.querySelectorAll("[data-sales-period-button]");
const salesPanelViewButtons = document.querySelectorAll("[data-sales-panel-view-button]");
const salesPanelViews = document.querySelectorAll("[data-sales-panel-view-panel]");
const dashboardStatCards = new Map(
  Array.from(document.querySelectorAll("[data-dashboard-stat]")).map((card) => [
    card.dataset.dashboardStat,
    {
      value: card.querySelector("[data-dashboard-stat-value]"),
      meta: card.querySelector("[data-dashboard-stat-meta]"),
    },
  ]),
);

const SALES_PERIOD_CONFIG = Object.freeze({
  daily: { label: "Daily Sales" },
  weekly: { label: "Weekly Sales" },
  monthly: { label: "Monthly Sales" },
  yearly: { label: "Yearly Sales" },
});

let activeSalesPeriod = "daily";
let activeSalesPanelView = "dashboard";
let currentSalesSeries = createEmptySalesSeries();
let dashboardRealtimeRefreshTimer = 0;
let dashboardRealtimeRefreshInFlight = false;
let dashboardRealtimeRefreshQueued = false;
const salesChartViewportState = new Map();
const dashboardDayLabelFormatter = new Intl.DateTimeFormat("en-PH", { weekday: "short" });
const dashboardMonthLabelFormatter = new Intl.DateTimeFormat("en-PH", { month: "short" });
const dashboardIntegerFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const dashboardRealtimeTopics = new Set([
  "all",
  "accounts",
  "buyers",
  "employees",
  "products",
  "product-requests",
  "inventory",
  "orders",
  "followers",
]);

// Sync workspace color from superadmin picker
function syncWorkspaceColorFromSuperAdmin() {
  let savedColor = "";
  try {
    savedColor = String(window.localStorage?.getItem("gms-workspace-color") || "").trim().toLowerCase();
  } catch (error) {
    savedColor = "";
  }

  if (!/^#[0-9a-f]{6}$/i.test(savedColor)) {
    return;
  }

  const rgb = savedColor
    .slice(1)
    .match(/.{2}/g)
    ?.map((part) => String(Number.parseInt(part, 16)))
    .join(", ");

  if (!rgb) {
    return;
  }

  const appliedSharedTheme = Boolean(window.WebTheme?.applyWorkspaceColor);
  if (appliedSharedTheme) {
    window.WebTheme.applyWorkspaceColor(savedColor, {
      cache: false,
      dispatch: false,
      source: "dashboard-sync",
    });
  }

  if (!appliedSharedTheme) {
    document.documentElement.style.setProperty("--accent", savedColor);
    document.documentElement.style.setProperty("--accent-text", savedColor);
    document.documentElement.style.setProperty("--accent-strong", savedColor);
    document.documentElement.style.setProperty("--accent-button-bg", savedColor);
    document.documentElement.style.setProperty("--accent-button-hover-bg", savedColor);
    document.documentElement.style.setProperty("--accent-rgb", rgb);
  }

  // Update color picker in settings dropdown if exists
  const colorInput = document.querySelector("[data-theme-color-input]");
  const hexLabel = document.querySelector("[data-theme-hex]");
  const rgbLabel = document.querySelector("[data-theme-rgb]");

  if (colorInput instanceof HTMLInputElement) {
    colorInput.value = savedColor;
  }
  if (hexLabel) {
    hexLabel.textContent = savedColor.toUpperCase();
  }
  if (rgbLabel) {
    rgbLabel.textContent = `RGB ${rgb}`;
  }
}

// Initialize on page load
syncWorkspaceColorFromSuperAdmin();

// Listen for storage changes from superadmin
window.addEventListener("storage", (event) => {
  if (event.key === "gms-workspace-color") {
    syncWorkspaceColorFromSuperAdmin();
  }
});
window.addEventListener("gms:workspace-color-changed", syncWorkspaceColorFromSuperAdmin);

function createEmptySalesSeries() {
  return Object.fromEntries(
    Object.entries(SALES_PERIOD_CONFIG).map(([period, config]) => [
      period,
      {
        label: config.label,
        totalLabel: "PHP 0",
        points: [],
      },
    ]),
  );
}

function readDashboardSessionStorageJson(key) {
  try {
    return JSON.parse(window.sessionStorage?.getItem(key) || "null");
  } catch (error) {
    return null;
  }
}

function normalizeDashboardAdminTenantId(value, fallback = "") {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || fallback;
}

function resolveDashboardAdminTenantIdFromSession(session, fallback = "") {
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
    .map((value) => normalizeDashboardAdminTenantId(value, ""))
    .find(Boolean) || fallback;
}

function getActiveDashboardAdminTenantId() {
  const adminSession = readDashboardSessionStorageJson("gms-admin-session");
  const adminId = resolveDashboardAdminTenantIdFromSession(adminSession, "");
  if (adminId) {
    return adminId;
  }

  const employeeSession = readDashboardSessionStorageJson("gms-employee-session");
  const employeeAdminId = resolveDashboardAdminTenantIdFromSession(employeeSession, "");
  if (employeeAdminId) {
    return employeeAdminId;
  }

  try {
    return normalizeDashboardAdminTenantId(window.localStorage?.getItem("gms-admin-id"), "");
  } catch (error) {
    return "";
  }
}

function withDashboardAdminTenantHeaders(headers = {}) {
  const adminId = getActiveDashboardAdminTenantId();
  if (!adminId) {
    return headers;
  }

  return {
    ...headers,
    "X-GMS-Admin-ID": adminId,
  };
}

function formatDashboardInteger(value) {
  return dashboardIntegerFormatter.format(Math.max(0, Math.trunc(Number(value) || 0)));
}

function setDashboardStat(key, value, meta) {
  const stat = dashboardStatCards.get(key);
  if (!stat) {
    return;
  }

  if (stat.value) {
    stat.value.textContent = String(value);
  }

  if (stat.meta) {
    stat.meta.textContent = String(meta);
  }
}

function renderFollowersDashboardStat(followersCountValue) {
  const followersCount = Number(followersCountValue ?? 0);
  setDashboardStat(
    "followers",
    formatDashboardInteger(followersCount),
    followersCount > 0
      ? `${formatDashboardInteger(followersCount)} people following this store.`
      : "No followers yet.",
  );
}

async function loadDashboardJson(path) {
  if (!getActiveDashboardAdminTenantId()) {
    return null;
  }

  try {
    const response = await fetch(path, {
      cache: "no-store",
      headers: withDashboardAdminTenantHeaders({ Accept: "application/json" }),
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    return null;
  }
}

function getDashboardCollection(payload, key) {
  if (Array.isArray(payload?.[key])) {
    return payload[key];
  }

  return Array.isArray(payload) ? payload : [];
}

async function loadDashboardData() {
  const [ordersPayload, productsPayload, accountsPayload, followersPayload] = await Promise.all([
    loadDashboardJson("/api/orders"),
    loadDashboardJson("/api/products"),
    loadDashboardJson("/api/accounts"),
    loadDashboardJson("/api/admin-followers-count"),
  ]);

  return {
    orders: getDashboardCollection(ordersPayload, "orders"),
    products: getDashboardCollection(productsPayload, "products"),
    accounts: getDashboardCollection(accountsPayload, "accounts"),
    followersCount: followersPayload?.followerCount ?? 0,
    loadComplete: [ordersPayload, productsPayload, accountsPayload, followersPayload]
      .every((payload) => payload !== null),
  };
}

function normalizeDashboardText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getDashboardOrderDate(order) {
  const epochMs = Math.trunc(Number(order?.createdAtEpochMs ?? order?.createdAtMs ?? 0) || 0);
  if (epochMs > 0) {
    const date = new Date(epochMs);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  const timestamp = [
    order?.createdAt,
    order?.orderDate,
    order?.placedAt,
    order?.timestamp,
    order?.date,
  ]
    .map((value) => String(value ?? "").trim())
    .find(Boolean);

  if (!timestamp) {
    return null;
  }

  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDashboardDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDashboardDays(date, days) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function getDashboardDateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function isSameDashboardDay(leftDate, rightDate) {
  return Boolean(leftDate && rightDate) && getDashboardDateKey(leftDate) === getDashboardDateKey(rightDate);
}

function getDashboardWeekStart(date) {
  const dayOffset = (date.getDay() + 6) % 7;
  return addDashboardDays(startOfDashboardDay(date), -dayOffset);
}

function getDashboardOrderGroupKey(order, index) {
  const epochMs = Math.trunc(Number(order?.createdAtEpochMs ?? 0) || 0);
  if (epochMs > 0) {
    return `epoch:${epochMs}`;
  }

  const stableId = [
    order?.orderGroupId,
    order?.groupId,
    order?.orderId,
    order?.transactionId,
    order?.checkoutId,
    order?.id,
  ]
    .map((value) => String(value ?? "").trim())
    .find(Boolean);

  return stableId ? `id:${stableId}` : `row:${index}`;
}

function getDashboardOrderQuantity(order) {
  return Math.max(1, Math.trunc(Number(order?.quantity ?? order?.items ?? 1) || 1));
}

function getDashboardOrderAmount(order) {
  const explicitAmount = Number(
    order?.grandTotalAmount ??
      order?.amount ??
      order?.total ??
      order?.subtotal ??
      order?.lineTotal ??
      0,
  ) || 0;
  if (explicitAmount > 0) {
    return explicitAmount;
  }

  const unitPrice = Number(order?.price ?? order?.unitPrice ?? order?.productPrice ?? 0) || 0;
  return unitPrice * getDashboardOrderQuantity(order);
}

function groupDashboardOrders(orders) {
  const groups = new Map();

  (Array.isArray(orders) ? orders : []).forEach((order, index) => {
    const key = getDashboardOrderGroupKey(order, index);
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        entries: [],
        date: getDashboardOrderDate(order),
      });
    }

    const group = groups.get(key);
    group.entries.push(order);
    if (!group.date) {
      group.date = getDashboardOrderDate(order);
    }
  });

  return Array.from(groups.values()).map((group) => {
    const firstEntry = group.entries[0] || {};
    const groupAmount = Number(firstEntry?.grandTotalAmount ?? 0) || 0;
    return {
      ...group,
      amount: groupAmount > 0
        ? groupAmount
        : group.entries.reduce((sum, entry) => sum + getDashboardOrderAmount(entry), 0),
    };
  });
}

function getDashboardOrderStatusToken(order) {
  return normalizeDashboardText(
    order?.status ??
      order?.orderStatus ??
      order?.fulfillmentStatus ??
      order?.stage ??
      order?.state ??
      "",
  );
}

function groupHasDashboardStatus(group, matcher) {
  return (group?.entries || []).some((entry) => matcher(getDashboardOrderStatusToken(entry)));
}

function isDashboardPendingStatus(statusToken) {
  return [
    "pending",
    "to prepare",
    "prepare",
    "preparing",
    "packing",
    "processing",
    "queued",
    "waiting",
  ].some((token) => statusToken.includes(token));
}

function isDashboardCancelledStatus(statusToken) {
  return statusToken.includes("cancel");
}

function getDashboardOrderCourierToken(order) {
  return normalizeDashboardText(
    order?.courier ??
      order?.deliveryPartnerName ??
      order?.deliveryProvider ??
      order?.deliveryPartner ??
      order?.deliveryMethod ??
      "",
  );
}

function groupHasDashboardCourier(group, matcher) {
  return (group?.entries || []).some((entry) => matcher(getDashboardOrderCourierToken(entry)));
}

function getDashboardProductName(product) {
  return String(product?.name ?? product?.productName ?? product?.title ?? "Unnamed Product").trim() ||
    "Unnamed Product";
}

function getDashboardProductStock(product) {
  const directStock = Number(
    product?.inventoryStock ??
      product?.stock ??
      product?.totalStock ??
      product?.quantity ??
      product?.availableStock,
  );

  if (Number.isFinite(directStock)) {
    return Math.max(0, Math.trunc(directStock));
  }

  if (Array.isArray(product?.variants)) {
    return product.variants.reduce(
      (sum, variant) => sum + Math.max(0, Math.trunc(Number(variant?.stock ?? variant?.quantity ?? 0) || 0)),
      0,
    );
  }

  return 0;
}

function getDashboardProductSold(product) {
  return Math.max(0, Math.trunc(Number(product?.sold ?? product?.sales ?? product?.soldCount ?? 0) || 0));
}

function getDashboardProductRating(product) {
  return Number(product?.rating ?? product?.reviewRating ?? product?.averageRating ?? 0) || 0;
}

function getDashboardTopSellingProduct(products, orders) {
  const productSales = new Map();

  (Array.isArray(products) ? products : []).forEach((product) => {
    const name = getDashboardProductName(product);
    productSales.set(name, Math.max(productSales.get(name) || 0, getDashboardProductSold(product)));
  });

  (Array.isArray(orders) ? orders : []).forEach((order) => {
    const name = String(order?.productName ?? order?.name ?? "").trim();
    if (!name) {
      return;
    }

    productSales.set(name, (productSales.get(name) || 0) + getDashboardOrderQuantity(order));
  });

  return Array.from(productSales.entries())
    .map(([name, sold]) => ({ name, sold }))
    .filter((item) => item.sold > 0)
    .sort((left, right) => right.sold - left.sold)[0] || null;
}

function getDashboardTopReviewedProduct(products) {
  return (Array.isArray(products) ? products : [])
    .map((product) => ({
      name: getDashboardProductName(product),
      rating: getDashboardProductRating(product),
    }))
    .filter((item) => item.rating > 0)
    .sort((left, right) => right.rating - left.rating)[0] || null;
}

function isDashboardStaffOnline(account) {
  const statusToken = normalizeDashboardText(
    account?.presenceStatus ?? account?.onlineStatus ?? account?.status ?? "",
  );
  return Boolean(account?.isOnline || account?.online || statusToken.includes("online"));
}

function renderDashboardStats(data = {}) {
  const orders = Array.isArray(data.orders) ? data.orders : [];
  const products = Array.isArray(data.products) ? data.products : [];
  const accounts = Array.isArray(data.accounts) ? data.accounts : [];
  const orderGroups = groupDashboardOrders(orders);
  const today = new Date();
  const todaysOrders = orderGroups.filter((group) => isSameDashboardDay(group.date, today));
  const pendingOrders = orderGroups.filter((group) =>
    groupHasDashboardStatus(group, isDashboardPendingStatus),
  );
  const cancelledOrders = orderGroups.filter((group) =>
    groupHasDashboardStatus(group, isDashboardCancelledStatus),
  );
  const lbcOrders = orderGroups.filter((group) =>
    groupHasDashboardCourier(group, (courier) => courier.includes("lbc")),
  );
  const lalamoveOrders = orderGroups.filter((group) =>
    groupHasDashboardCourier(group, (courier) => courier.includes("lalamove")),
  );
  const jntOrders = orderGroups.filter((group) =>
    groupHasDashboardCourier(group, (courier) =>
      courier.includes("j t") || courier.includes("jnt") || courier.includes("jt express"),
    ),
  );
  const lowStockProducts = products.filter((product) => getDashboardProductStock(product) <= 5);
  const deadStockProducts = products.filter((product) => getDashboardProductSold(product) <= 0);
  const onlineStaffCount = accounts.filter(isDashboardStaffOnline).length;
  const topSelling = getDashboardTopSellingProduct(products, orders);
  const topReviewed = getDashboardTopReviewedProduct(products);

  setDashboardStat(
    "orders-today",
    formatDashboardInteger(todaysOrders.length),
    todaysOrders.length
      ? `${formatDashboardInteger(todaysOrders.length)} orders placed today.`
      : "No orders placed today.",
  );
  setDashboardStat(
    "pending-orders",
    formatDashboardInteger(pendingOrders.length),
    pendingOrders.length
      ? `${formatDashboardInteger(pendingOrders.length)} orders waiting for action.`
      : "No pending orders.",
  );
  setDashboardStat(
    "cancel-orders",
    formatDashboardInteger(cancelledOrders.length),
    cancelledOrders.length
      ? `${formatDashboardInteger(cancelledOrders.length)} cancelled orders in this workspace.`
      : "No cancelled orders.",
  );
  setDashboardStat(
    "lbc-orders",
    formatDashboardInteger(lbcOrders.length),
    lbcOrders.length ? "Orders assigned to LBC." : "No LBC orders yet.",
  );
  setDashboardStat(
    "lalamove-orders",
    formatDashboardInteger(lalamoveOrders.length),
    lalamoveOrders.length ? "Orders assigned to Lalamove." : "No Lalamove orders yet.",
  );
  setDashboardStat(
    "jnt-orders",
    formatDashboardInteger(jntOrders.length),
    jntOrders.length ? "Orders assigned to J&T Express." : "No J&T orders yet.",
  );
  setDashboardStat(
    "low-stock",
    `${formatDashboardInteger(lowStockProducts.length)} Items`,
    products.length ? "Products with 5 stocks or less." : "No products in this workspace.",
  );
  setDashboardStat(
    "dead-stock",
    `${formatDashboardInteger(deadStockProducts.length)} Items`,
    products.length ? "Products with no recorded sales yet." : "No products in this workspace.",
  );
  setDashboardStat(
    "staff-online",
    formatDashboardInteger(onlineStaffCount),
    accounts.length ? `${formatDashboardInteger(accounts.length)} staff accounts in this workspace.` : "No staff accounts yet.",
  );
  setDashboardStat("active-users", "0", "No active users right now.");
  setDashboardStat(
    "top-selling",
    topSelling ? topSelling.name : "None",
    topSelling ? `${formatDashboardInteger(topSelling.sold)} units sold.` : "No product sales yet.",
  );
  setDashboardStat(
    "top-reviews",
    topReviewed ? topReviewed.name : "None",
    topReviewed ? `Highest rating with ${topReviewed.rating.toFixed(1)} review score.` : "No reviewed products yet.",
  );

  renderFollowersDashboardStat(data.followersCount);
}

function buildDashboardSalesSeries(orders) {
  const orderGroups = groupDashboardOrders(orders).filter((group) => group.date);
  const hasOrders = orderGroups.length > 0;
  const series = createEmptySalesSeries();

  if (!hasOrders) {
    return series;
  }

  const todayStart = startOfDashboardDay(new Date());
  const addGroupAmount = (map, key, amount) => {
    map.set(key, (map.get(key) || 0) + amount);
  };

  const dailyTotals = new Map();
  const dailyStart = addDashboardDays(todayStart, -6);
  orderGroups.forEach((group) => {
    const groupDay = startOfDashboardDay(group.date);
    if (groupDay >= dailyStart && groupDay <= todayStart) {
      addGroupAmount(dailyTotals, getDashboardDateKey(groupDay), group.amount);
    }
  });
  const dailyPoints = Array.from({ length: 7 }, (_, index) => {
    const date = addDashboardDays(dailyStart, index);
    return {
      label: dashboardDayLabelFormatter.format(date),
      value: dailyTotals.get(getDashboardDateKey(date)) || 0,
    };
  });
  series.daily.points = dailyPoints;
  series.daily.totalLabel = formatCompactCurrency(dailyPoints.reduce((sum, point) => sum + point.value, 0));

  const weeklyTotals = new Map();
  const currentWeekStart = getDashboardWeekStart(todayStart);
  const weekStarts = Array.from({ length: 4 }, (_, index) => addDashboardDays(currentWeekStart, (index - 3) * 7));
  orderGroups.forEach((group) => {
    const weekStart = getDashboardWeekStart(group.date);
    addGroupAmount(weeklyTotals, getDashboardDateKey(weekStart), group.amount);
  });
  const weeklyPoints = weekStarts.map((weekStart, index) => ({
    label: `W${index + 1}`,
    value: weeklyTotals.get(getDashboardDateKey(weekStart)) || 0,
  }));
  series.weekly.points = weeklyPoints;
  series.weekly.totalLabel = formatCompactCurrency(weeklyPoints.reduce((sum, point) => sum + point.value, 0));

  const monthlyTotals = new Map();
  const currentYear = todayStart.getFullYear();
  orderGroups.forEach((group) => {
    if (group.date.getFullYear() === currentYear) {
      addGroupAmount(monthlyTotals, String(group.date.getMonth()), group.amount);
    }
  });
  const monthlyPoints = Array.from({ length: 12 }, (_, monthIndex) => {
    const date = new Date(currentYear, monthIndex, 1);
    return {
      label: dashboardMonthLabelFormatter.format(date),
      value: monthlyTotals.get(String(monthIndex)) || 0,
    };
  });
  series.monthly.points = monthlyPoints;
  series.monthly.totalLabel = formatCompactCurrency(monthlyPoints.reduce((sum, point) => sum + point.value, 0));

  const yearlyTotals = new Map();
  const startYear = currentYear - 4;
  orderGroups.forEach((group) => {
    const year = group.date.getFullYear();
    if (year >= startYear && year <= currentYear) {
      addGroupAmount(yearlyTotals, String(year), group.amount);
    }
  });
  const yearlyPoints = Array.from({ length: 5 }, (_, index) => {
    const year = startYear + index;
    return {
      label: String(year),
      value: yearlyTotals.get(String(year)) || 0,
    };
  });
  series.yearly.points = yearlyPoints;
  series.yearly.totalLabel = formatCompactCurrency(yearlyPoints.reduce((sum, point) => sum + point.value, 0));

  return series;
}

async function initializeAdminDashboard() {
  renderDashboardStats();
  currentSalesSeries = createEmptySalesSeries();
  renderSalesChart();

  const dashboardData = await loadDashboardData();
  renderDashboardStats(dashboardData);
  currentSalesSeries = buildDashboardSalesSeries(dashboardData.orders);
  renderSalesChart();
}

async function refreshAdminDashboardFromRealtime() {
  if (dashboardRealtimeRefreshInFlight) {
    dashboardRealtimeRefreshQueued = true;
    return;
  }

  dashboardRealtimeRefreshInFlight = true;
  try {
    const dashboardData = await loadDashboardData();
    if (!dashboardData.loadComplete) {
      return;
    }
    renderDashboardStats(dashboardData);
    currentSalesSeries = buildDashboardSalesSeries(dashboardData.orders);
    renderSalesChart();
  } finally {
    dashboardRealtimeRefreshInFlight = false;
    if (dashboardRealtimeRefreshQueued) {
      dashboardRealtimeRefreshQueued = false;
      scheduleAdminDashboardRealtimeRefresh();
    }
  }
}

function scheduleAdminDashboardRealtimeRefresh() {
  window.clearTimeout(dashboardRealtimeRefreshTimer);
  dashboardRealtimeRefreshTimer = window.setTimeout(() => {
    dashboardRealtimeRefreshTimer = 0;
    void refreshAdminDashboardFromRealtime();
  }, 200);
}

function handleAdminDashboardRealtimeChange(event) {
  const detail = event?.detail;
  const isReconnect = detail?.type === "ready" && detail?.reconnected === true;
  if (detail?.type !== "data-change" && !isReconnect) {
    return;
  }

  const topics = new Set(
    (Array.isArray(detail?.topics) ? detail.topics : [])
      .map((topic) => String(topic || "").trim().toLowerCase())
      .filter(Boolean),
  );
  if (!isReconnect && !Array.from(topics).some((topic) => dashboardRealtimeTopics.has(topic))) {
    return;
  }

  scheduleAdminDashboardRealtimeRefresh();
}

async function refreshDashboardFollowersStat() {
  if (document.hidden) {
    return;
  }

  const followersPayload = await loadDashboardJson("/api/admin-followers-count");
  if (!followersPayload) {
    return;
  }

  renderFollowersDashboardStat(
    followersPayload.followersCount ?? followersPayload.followerCount ?? 0,
  );
}

function formatCurrency(value) {
  const numericValue = Number(value) || 0;
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: numericValue >= 1000000 ? 0 : 2,
  }).format(numericValue);
}

function formatCompactCurrency(value) {
  const numericValue = Number(value) || 0;
  if (numericValue >= 1000000) {
    return `PHP ${(numericValue / 1000000).toFixed(1)}M`;
  }

  return formatCurrency(numericValue);
}

function formatWholeCurrency(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function toNumber(value) {
  return Number(value) || 0;
}

function clampValue(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function updateSalesPeriodButtons() {
  for (const button of salesPeriodButtons) {
    const isActive = button.dataset.salesPeriod === activeSalesPeriod;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  }
}

function updateSalesPanelView() {
  for (const button of salesPanelViewButtons) {
    const isActive = button.dataset.salesPanelView === activeSalesPanelView;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  }

  for (const panel of salesPanelViews) {
    const isActive = panel.dataset.salesPanelViewPanel === activeSalesPanelView;
    panel.classList.toggle("is-active", isActive);
    panel.hidden = !isActive;
  }
}

function getDashboardNiceStep(rawStep) {
  const safeStep = Math.max(1, toNumber(rawStep));
  const exponent = Math.floor(Math.log10(safeStep));
  const magnitude = 10 ** exponent;
  const normalized = safeStep / magnitude;

  if (normalized <= 1) {
    return magnitude;
  }

  if (normalized <= 2) {
    return 2 * magnitude;
  }

  if (normalized <= 5) {
    return 5 * magnitude;
  }

  return 10 * magnitude;
}

function getDashboardChartAxisConfig(yMin, yMax, targetIntervals = 4) {
  const safeMin = Math.max(0, Math.trunc(toNumber(yMin)));
  const safeRawMax = Math.max(safeMin + 1, Math.trunc(toNumber(yMax)));
  const roughStep = Math.max(1, Math.ceil((safeRawMax - safeMin) / Math.max(1, targetIntervals)));
  const step = Math.max(1, getDashboardNiceStep(roughStep));
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
    ticks,
  };
}

function buildDashboardSmoothLinePath(coordinates) {
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

function createSalesInsightChart(points) {
  const svgNamespace = "http://www.w3.org/2000/svg";
  const chart = document.createElement("div");
  chart.className = "product-insight-rank-card__back-chart sales-chart__insight";

  const plotShell = document.createElement("div");
  plotShell.className = "product-insight-rank-card__back-chart-plot-shell";

  const plot = document.createElement("div");
  plot.className = "product-insight-rank-card__back-chart-plot";

  const axis = document.createElement("div");
  axis.className = "product-insight-rank-card__back-chart-axis";

  const svg = document.createElementNS(svgNamespace, "svg");
  svg.setAttribute("class", "product-insight-rank-card__back-chart-svg");
  svg.setAttribute("viewBox", "0 0 220 110");
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("aria-hidden", "true");

  const defs = document.createElementNS(svgNamespace, "defs");
  const gradientId = `dashboard-sales-chart-gradient-${activeSalesPeriod}`;
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

  const footer = document.createElement("div");
  footer.className = "product-insight-rank-card__back-chart-footer";

  const footerSpacer = document.createElement("div");
  footerSpacer.className = "product-insight-rank-card__back-chart-footer-spacer";

  const highestValue = points.reduce((bestValue, point) => Math.max(bestValue, Math.max(0, toNumber(point?.value))), 0);
  const defaultAxisConfig = getDashboardChartAxisConfig(0, highestValue, 4);
  const defaultVisibleCount = points.length;
  const minVisibleCount = Math.max(2, Math.min(points.length, Math.ceil(points.length / 2)));
  const maxVisibleCount = points.length;
  const minYMax = Math.max(
    1,
    getDashboardChartAxisConfig(0, Math.max(1, highestValue * 0.35), 4).max,
  );
  const maxYMax = Math.max(defaultAxisConfig.max * 3, defaultAxisConfig.max + minYMax);
  const chartStateKey = activeSalesPeriod;
  let isDragging = false;

  const createDefaultViewport = () => ({
    xStart: 0,
    visibleCount: defaultVisibleCount,
    yMax: defaultAxisConfig.max,
  });

  const clampViewportState = (nextState) => {
    const requestedVisibleCount = Math.round(toNumber(nextState?.visibleCount)) || defaultVisibleCount;
    const visibleCount = clampValue(requestedVisibleCount, minVisibleCount, maxVisibleCount);
    const maxStart = Math.max(0, points.length - visibleCount);
    const xStart = clampValue(Math.round(toNumber(nextState?.xStart)), 0, maxStart);
    const yMax = clampValue(
      Math.round(toNumber(nextState?.yMax)) || defaultAxisConfig.max,
      minYMax,
      maxYMax,
    );

    return {
      xStart,
      visibleCount,
      yMax: Math.max(minYMax, yMax),
    };
  };

  let viewportState = clampViewportState(
    salesChartViewportState.get(chartStateKey) ?? createDefaultViewport(),
  );

  const setViewportState = (nextState) => {
    viewportState = clampViewportState(nextState);
    salesChartViewportState.set(chartStateKey, viewportState);
  };

  const renderViewport = () => {
    const visiblePoints = points.slice(
      viewportState.xStart,
      viewportState.xStart + viewportState.visibleCount,
    );
    const axisConfig = getDashboardChartAxisConfig(0, viewportState.yMax, 6);
    const yMin = axisConfig.min;
    const yMax = axisConfig.max;
    const ySpan = Math.max(1, yMax - yMin);
    const stepX = visiblePoints.length > 1 ? usableWidth / (visiblePoints.length - 1) : 0;

    axis.replaceChildren();
    axisConfig.ticks.forEach((tickValue) => {
      const axisLabel = document.createElement("span");
      axisLabel.className = "product-insight-rank-card__back-chart-axis-label";
      axisLabel.textContent = formatWholeCurrency(tickValue);
      axis.appendChild(axisLabel);
    });

    svg.replaceChildren(defs);
    footer.replaceChildren();

    const coordinates = visiblePoints.map((point, index) => {
      const x = paddingLeft + (stepX * index);
      const normalizedValue = (toNumber(point.value) - yMin) / ySpan;
      const y = paddingTop + (1 - normalizedValue) * usableHeight;

      return {
        x: Number(x.toFixed(2)),
        y: Number(y.toFixed(2)),
        label: String(point.label || ""),
        value: Math.max(0, Math.trunc(toNumber(point.value))),
      };
    });

    axisConfig.ticks.slice(1, -1).forEach((tickValue) => {
      const guide = document.createElementNS(svgNamespace, "line");
      const guideY = paddingTop + (1 - ((tickValue - yMin) / ySpan)) * usableHeight;
      guide.setAttribute("class", "product-insight-rank-card__back-chart-guide");
      guide.setAttribute("x1", String(paddingLeft));
      guide.setAttribute("x2", String(svgWidth - paddingRight));
      guide.setAttribute("y1", String(guideY));
      guide.setAttribute("y2", String(guideY));
      svg.appendChild(guide);
    });

    const linePathData = buildDashboardSmoothLinePath(coordinates);
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

    const latestCoordinate = coordinates[coordinates.length - 1] ?? null;
    if (latestCoordinate) {
      const previousCoordinate = coordinates[coordinates.length - 2] ?? null;
      const previousValue = Math.max(0, Math.trunc(toNumber(previousCoordinate?.value)));
      const latestValue = latestCoordinate.value;
      const activeDirection = previousCoordinate
        ? (latestValue > previousValue
            ? "is-up"
            : latestValue < previousValue
              ? "is-down"
              : "is-flat")
        : "is-flat";

      const activePrice = document.createElement("div");
      activePrice.className = `product-insight-rank-card__back-chart-active-price ${activeDirection}`;
      activePrice.textContent = formatWholeCurrency(latestValue);
      activePrice.style.top = `${(latestCoordinate.y / svgHeight) * 100}%`;
      activePrice.style.transform = "translateY(-50%)";
      axis.appendChild(activePrice);

      const activeLine = document.createElementNS(svgNamespace, "line");
      activeLine.setAttribute(
        "class",
        `product-insight-rank-card__back-chart-active-line ${activeDirection}`,
      );
      activeLine.setAttribute("x1", String(paddingLeft));
      activeLine.setAttribute("x2", String(svgWidth - paddingRight));
      activeLine.setAttribute("y1", String(latestCoordinate.y));
      activeLine.setAttribute("y2", String(latestCoordinate.y));
      svg.appendChild(activeLine);

      const dot = document.createElementNS(svgNamespace, "circle");
      dot.setAttribute("class", "product-insight-rank-card__back-chart-dot");
      dot.setAttribute("cx", String(latestCoordinate.x));
      dot.setAttribute("cy", String(latestCoordinate.y));
      dot.setAttribute("r", "2.8");
      svg.appendChild(dot);
    }

    coordinates.forEach((coordinate) => {
      const stat = document.createElement("div");
      stat.className = "product-insight-rank-card__back-chart-stat";
      stat.style.left = `${(coordinate.x / svgWidth) * 100}%`;

      const label = document.createElement("span");
      label.className = "product-insight-rank-card__back-chart-stat-label";
      label.textContent = coordinate.label;
      stat.appendChild(label);

      footer.appendChild(stat);
    });
  };

  plotShell.classList.add("is-scale-draggable");
  axis.classList.add("is-scale-draggable");
  plot.appendChild(svg);
  plotShell.append(plot, axis);
  footerShell.append(footer, footerSpacer);
  chart.append(plotShell, footerShell);

  renderViewport();

  plotShell.addEventListener("dblclick", () => {
    setViewportState(createDefaultViewport());
    renderViewport();
  });

  plotShell.addEventListener("wheel", (event) => {
    if (!event.deltaY || maxVisibleCount <= minVisibleCount) {
      return;
    }

    event.preventDefault();
    const zoomStep = Math.max(1, Math.round(viewportState.visibleCount * 0.2));
    const nextVisibleCount = clampValue(
      viewportState.visibleCount + (event.deltaY > 0 ? zoomStep : -zoomStep),
      minVisibleCount,
      maxVisibleCount,
    );

    if (nextVisibleCount === viewportState.visibleCount) {
      return;
    }

    const bounds = plot.getBoundingClientRect();
    const ratio = bounds.width
      ? clampValue((event.clientX - bounds.left) / bounds.width, 0, 1)
      : 1;
    const anchorOffset = Math.round((viewportState.visibleCount - 1) * ratio);
    const anchorIndex = viewportState.xStart + anchorOffset;
    const nextStart = anchorIndex - Math.round((nextVisibleCount - 1) * ratio);

    setViewportState({
      xStart: nextStart,
      visibleCount: nextVisibleCount,
      yMax: viewportState.yMax,
    });
    renderViewport();
  }, { passive: false });

  axis.addEventListener("wheel", (event) => {
    if (!event.deltaY) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const nextYMax = clampValue(
      Math.round(viewportState.yMax * (event.deltaY > 0 ? 1.12 : 0.9)),
      minYMax,
      maxYMax,
    );

    if (nextYMax === viewportState.yMax) {
      return;
    }

    setViewportState({
      xStart: viewportState.xStart,
      visibleCount: viewportState.visibleCount,
      yMax: nextYMax,
    });
    renderViewport();
  }, { passive: false });

  axis.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    isDragging = true;
    const startY = event.clientY;
    const startViewport = { ...viewportState };
    axis.classList.add("is-scale-dragging");

    const handlePointerMove = (moveEvent) => {
      const deltaY = moveEvent.clientY - startY;
      const zoomFactor = Math.exp(deltaY / 180);
      const nextYMax = clampValue(
        Math.round(startViewport.yMax * zoomFactor),
        minYMax,
        maxYMax,
      );
      setViewportState({
        xStart: startViewport.xStart,
        visibleCount: startViewport.visibleCount,
        yMax: nextYMax,
      });
      renderViewport();
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

  plotShell.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || viewportState.visibleCount >= maxVisibleCount) {
      return;
    }

    event.preventDefault();
    isDragging = true;
    const startViewport = { ...viewportState };
    const startX = event.clientX;
    const stepPixels = startViewport.visibleCount > 1
      ? usableWidth / (startViewport.visibleCount - 1)
      : usableWidth;

    plotShell.classList.add("is-dragging");

    const handlePointerMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const xShift = stepPixels > 0 ? Math.round((-deltaX / stepPixels)) : 0;

      setViewportState({
        xStart: startViewport.xStart + xShift,
        visibleCount: startViewport.visibleCount,
        yMax: startViewport.yMax,
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

function renderSalesChart() {
  if (!salesChart) {
    return;
  }

  const series = currentSalesSeries[activeSalesPeriod] || currentSalesSeries.daily || createEmptySalesSeries().daily;
  const points = Array.isArray(series.points) ? series.points : [];
  const highestPoint = points.reduce(
    (best, point) => (point.value > best.value ? point : best),
    { label: "-", value: 0 },
  );

  updateSalesPeriodButtons();
  salesChart.replaceChildren();

  if (salesChartPeriodLabel) {
    salesChartPeriodLabel.textContent = series.label;
  }

  if (salesChartTotalPill) {
    salesChartTotalPill.textContent = series.totalLabel;
  }

  if (salesChartPeakLabel) {
    salesChartPeakLabel.textContent = points.length
      ? `${highestPoint.label} - ${formatCompactCurrency(highestPoint.value)}`
      : "No data";
  }

  if (!points.length) {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";
    emptyState.textContent = "No sales data available right now.";
    salesChart.appendChild(emptyState);
    return;
  }

  salesChart.appendChild(createSalesInsightChart(points));
}

for (const button of salesPeriodButtons) {
  button.addEventListener("click", () => {
    activeSalesPeriod = button.dataset.salesPeriod || "daily";
    renderSalesChart();
  });
}

for (const button of salesPanelViewButtons) {
  button.addEventListener("click", () => {
    activeSalesPanelView = button.dataset.salesPanelView || "dashboard";
    updateSalesPanelView();
  });
}

updateSalesPanelView();
initializeAdminDashboard();
window.setInterval(refreshDashboardFollowersStat, 15000);
window.addEventListener("gms:realtime-change", handleAdminDashboardRealtimeChange);
