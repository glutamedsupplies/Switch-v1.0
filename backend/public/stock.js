const stockProductList = document.getElementById("stock-product-list");
const stockPriorityList = document.getElementById("stock-priority-list");
const stockCategoryList = document.getElementById("stock-category-list");
const stockSearchInput = document.getElementById("stock-search-input");
const stockCategoryFilterDropdown = document.getElementById("stock-category-filter");
const stockCategoryFilterTrigger = document.getElementById("stock-category-filter-trigger");
const stockCategoryFilterSummary = document.getElementById("stock-category-filter-summary");
const stockCategoryFilterMenu = document.getElementById("stock-category-filter-menu");
const stockDetailTitle = document.getElementById("stock-detail-title");
const stockDetailSubtitle = document.getElementById("stock-detail-subtitle");
const stockDetailList = document.getElementById("stock-detail-list");
const stockPriorityFilterButtons = Array.from(
  document.querySelectorAll("[data-stock-priority-filter]"),
);
const stockTotalProducts = document.getElementById("stock-total-products");
const stockTotalUnits = document.getElementById("stock-total-units");
const stockLowCount = document.getElementById("stock-low-count");
const stockEmptyCount = document.getElementById("stock-empty-count");
const stockNearExpiryCount = document.getElementById("stock-near-expiry-count");
const stockRefreshButton = document.getElementById("stock-refresh-button");
const stockRecordHeadings = document.querySelector(".stock-record-headings");
const stockWorkspaceLink = document.querySelector("[data-stock-workspace-link]");
const stockWorkspaceNav = document.querySelector("[data-stock-nav]");
const stockWorkspaceLabel = document.querySelector("[data-stock-workspace-label]");
const stockWorkspaceSubtitle = document.querySelector("[data-stock-workspace-subtitle]");
const stockWorkspaceAvatarImage = document.querySelector(".product-panel-toolbar__avatar-image");
const stockWorkspaceAvatarPlaceholder = document.querySelector(
  ".product-panel-toolbar__avatar-placeholder[data-logo-placeholder]",
);
const stockWorkspaceSidebarLogoImage = document.querySelector(".dashboard-sidebar__logo-image");
const stockNotificationFocusSurface =
  stockProductList?.closest(".dashboard-content") ??
  document.querySelector(".stock-monitor-shell .dashboard-content");
const stockMonitorControlsPanel = document.querySelector(".stock-monitor-controls-panel");
const stockListShell = document.querySelector(".stock-list-shell");
const stockWorkspaceNavItems = Object.freeze({
  dashboard: document.querySelector('[data-stock-nav-item="dashboard"]'),
  insight: document.querySelector('[data-stock-nav-item="insight"]'),
  productInsight: document.querySelector('[data-stock-nav-item="product-insight"]'),
  products: document.querySelector('[data-stock-nav-item="products"]'),
  stock: document.querySelector('[data-stock-nav-item="stock"]'),
  paymentPartners: document.querySelector('[data-stock-nav-item="payment-partners"]'),
  deliveryPartners: document.querySelector('[data-stock-nav-item="delivery-partners"]'),
  userData: document.querySelector('[data-stock-nav-item="user-data"]'),
  employeeData: document.querySelector('[data-stock-nav-item="employee-data"]'),
  register: document.querySelector('[data-stock-nav-item="register"]'),
  login: document.querySelector('[data-stock-nav-item="login"]'),
});

function getStockWorkspaceDefaultLogoIconMarkup() {
  return `
    <svg viewBox="0 -960 960 960" fill="none" aria-hidden="true">
      <path d="M179-120q-24 0-42-18t-18-42v-339q-28-24-37-59t2-70l43-135q8-27 28-42t46-15h553q28 0 49 15.5t29 41.5l44 135q11 35 1.5 70T840-519v339q0 24-18 42t-42 18H179Zm391-430q29 0 49-19t16-46l-25-165H510v165q0 26 17 45.5t43 19.5Zm-187 0q28 0 47.5-19t19.5-46v-165H350l-25 165q-4 26 14 45.5t44 19.5Zm-182 0q24 0 41.5-16.5T263-607l26-173H189l-46 146q-10 31 8 57.5t50 26.5Zm557 0q32 0 50.5-26t8.5-58l-46-146H671l26 173q3 24 20.5 40.5T758-550ZM179-180h601v-311q1 1-6.5 1H758q-25 0-47.5-10.5T666-533q-16 20-40 31.5T573-490q-30 0-51.5-8.5T480-527q-15 18-38 27.5t-52 9.5q-31 0-55-11t-41-32q-24 21-47 32t-46 11h-13.5q-6.5 0-8.5-1v311Zm601 0H179h601Z" fill="currentColor"></path>
    </svg>`;
}

const STOCK_METER_MAX = 50;
const STOCK_NEW_WINDOW_DAYS = 7;
const STOCK_NEAR_EXPIRY_WINDOW_DAYS = 365;
const STOCK_TIME_ZONE = "Asia/Singapore";
const STOCK_TIME_ZONE_OFFSET_MINUTES = 8 * 60;
const STOCK_WORKSPACE_ROLE_QUERY_PARAM = "role";
const STOCK_WORKSPACE_ROLES = Object.freeze({
  ADMIN: "admin",
  EMPLOYEE: "employee",
});
const STOCK_EMPLOYEE_WORKSPACE_PERMISSION_BY_PATH = Object.freeze({
  "/stock.html": "admin-inventory",
  "/employee_stock.html": "employee-inventory",
});
const STOCK_EMPLOYEE_REFERRER_PATTERN = /\/(?:employee_dashboard|face_verfication)\.html(?:[?#]|$)/i;
const STOCK_EMPLOYEE_PAGE_PATH_PATTERN = /\/employee_stock\.html$/i;
const STOCK_EMBEDDED_LIVE_CHAT_SELECTOR = ".live-chat-shell";
const STOCK_PRODUCTS_UPDATED_STORAGE_KEY = "gms-stock-products-updated-at";
const STOCK_SUCCESS_LOTTIE_PLAYER_URL = "/vendor/lottie.min.js";
const STOCK_SUCCESS_ANIMATION_PATH = "/animations/employee-account-check.json";
const STOCK_DELETE_SUCCESS_AUDIO_URL = "/audio/delete-success.m4a";
const STOCK_DEDUCT_REASON_OPTIONS = Object.freeze([
  { value: "wrong-entry", label: "Wrong Type / Wrong Entry" },
  { value: "walk-in-order-pickup", label: "Walk-in Order Pickup" },
  { value: "damaged-accident", label: "Damaged / Accident" },
  { value: "missing-lost", label: "Missing / Lost" },
  { value: "expired-disposed", label: "Expired / Disposed" },
  { value: "other", label: "Other" },
]);
const STOCK_LOCAL_DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?$/;
const stockDateTimeDisplayFormatter = new Intl.DateTimeFormat("en-PH", {
  timeZone: STOCK_TIME_ZONE,
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});
const stockDateTimeDisplayWithSecondsFormatter = new Intl.DateTimeFormat("en-PH", {
  timeZone: STOCK_TIME_ZONE,
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit",
});
const stockDateDisplayFormatter = new Intl.DateTimeFormat("en-PH", {
  timeZone: STOCK_TIME_ZONE,
  month: "short",
  day: "numeric",
  year: "numeric",
});
const stockTimeDisplayFormatter = new Intl.DateTimeFormat("en-PH", {
  timeZone: STOCK_TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
});
const stockTimeZoneDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: STOCK_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const stockTimeZoneDateTimeFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: STOCK_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
const STOCK_CALENDAR_ICON_MARKUP = `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
    <rect x="3.5" y="5.5" width="17" height="15" rx="3"></rect>
    <path d="M7.5 3.5v4"></path>
    <path d="M16.5 3.5v4"></path>
    <path d="M3.5 9.5h17"></path>
  </svg>
`;
const STOCK_STOCKED_DATE_ICON_MARKUP = `
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M3 9H21V20A1 1 0 0 1 20 21H4A1 1 0 0 1 3 20V9Z" fill="none"></path>
    <path
      d="M20 21H4A1 1 0 0 1 3 20V9H21V20A1 1 0 0 1 20 21ZM21 5A1 1 0 0 0 20 4H4A1 1 0 0 0 3 5V9H21ZM16 3V6M8 3V6"
      fill="none"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="1.5"
    ></path>
    <path
      d="M9 15 11 17 15 13"
      fill="none"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="1.5"
    ></path>
  </svg>
`;
const STOCK_EXPIRY_DATE_ICON_MARKUP = `
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M3 9H21V20A1 1 0 0 1 20 21H4A1 1 0 0 1 3 20V9Z" fill="none"></path>
    <path
      d="M20 21H4A1 1 0 0 1 3 20V9H21V20A1 1 0 0 1 20 21ZM21 5A1 1 0 0 0 20 4H4A1 1 0 0 0 3 5V9H21ZM16 3V6M8 3V6"
      fill="none"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="1.5"
    ></path>
    <path
      d="M14 17 10 13"
      fill="none"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="1.5"
    ></path>
    <path
      d="M10 17 14 13"
      fill="none"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="1.5"
    ></path>
  </svg>
`;

let currentStockProducts = [];
let stockSearchTerm = "";
let stockSearchTimer = 0;
let stockCategoryFilter = "";
let stockPriorityFilter = "all";
let selectedStockProductId = "";
let editingStockProductId = "";
let stockEditModalClockIntervalId = 0;
let stockDeleteModalElements = null;
let stockSuccessModalElements = null;
let stockSuccessAutoCloseTimer = 0;
let stockSuccessAnimation = null;
let stockSuccessLottieLoadPromise = null;
let stockDeleteSuccessAudio = null;
let activeStockWorkspaceRole = resolveStockWorkspaceRole();
let pendingStockNotificationFocusRequest = resolveInitialStockNotificationFocusRequest();
let stockNotificationFocusTimer = 0;
let stockNotificationFocusTimers = [];
let stockNotificationFocusSpotlightFrame = 0;

function normalizeStockWorkspaceRole(value) {
  return String(value ?? "").trim().toLowerCase() === STOCK_WORKSPACE_ROLES.EMPLOYEE
    ? STOCK_WORKSPACE_ROLES.EMPLOYEE
    : STOCK_WORKSPACE_ROLES.ADMIN;
}

function isEmployeeStockPagePath(pathname = window.location.pathname) {
  return STOCK_EMPLOYEE_PAGE_PATH_PATTERN.test(String(pathname ?? "").trim().toLowerCase());
}

function isEmbeddedLiveChatStockWorkspace() {
  return Boolean(document.querySelector(STOCK_EMBEDDED_LIVE_CHAT_SELECTOR) && stockProductList);
}

function isAdminLiveChatReadOnlyWorkspace() {
  return Boolean(
    document.documentElement.classList.contains("admin-live-chat-readonly") ||
    document.body?.classList.contains("admin-live-chat-readonly"),
  );
}

function resolveStockWorkspaceRole() {
  if (isEmbeddedLiveChatStockWorkspace()) {
    return isAdminLiveChatReadOnlyWorkspace()
      ? STOCK_WORKSPACE_ROLES.ADMIN
      : STOCK_WORKSPACE_ROLES.EMPLOYEE;
  }

  if (isEmployeeStockPagePath(window.location.pathname)) {
    return STOCK_WORKSPACE_ROLES.EMPLOYEE;
  }

  const searchParams = new URLSearchParams(window.location.search);
  if (searchParams.has(STOCK_WORKSPACE_ROLE_QUERY_PARAM)) {
    return normalizeStockWorkspaceRole(
      searchParams.get(STOCK_WORKSPACE_ROLE_QUERY_PARAM),
    );
  }

  const referrer = String(document.referrer ?? "").trim();
  return STOCK_EMPLOYEE_REFERRER_PATTERN.test(referrer)
    ? STOCK_WORKSPACE_ROLES.EMPLOYEE
    : STOCK_WORKSPACE_ROLES.ADMIN;
}

function buildStockWorkspaceUrl(role = activeStockWorkspaceRole) {
  return normalizeStockWorkspaceRole(role) === STOCK_WORKSPACE_ROLES.EMPLOYEE
    ? "/employee_stock.html"
    : "/stock.html";
}

function isEmployeeStockWorkspace() {
  return activeStockWorkspaceRole === STOCK_WORKSPACE_ROLES.EMPLOYEE;
}

function readStockSessionStorageJson(key) {
  try {
    return JSON.parse(window.sessionStorage?.getItem(key) || "null");
  } catch (error) {
    return null;
  }
}

function normalizeStockAdminTenantId(value, fallback = "") {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || fallback;
}

function isUsableStockAdminTenantId(value) {
  const normalizedValue = normalizeStockAdminTenantId(value, "");
  return Boolean(normalizedValue) && normalizedValue !== "admin";
}

function resolveStockAdminTenantIdFromSession(session, fallback = "") {
  if (!session || typeof session !== "object") {
    return fallback;
  }

  return [
    session.adminId,
    session.ownerAdminId,
    session.tenantId,
    session.workspaceId,
    session.storeAdminId,
    session.sellerId,
    session.shopId,
    session.id,
    session.accountCode,
    session.userId,
    session.email,
  ]
    .map((value) => normalizeStockAdminTenantId(value, ""))
    .find(isUsableStockAdminTenantId) || fallback;
}

function getStoredStockAdminTenantId() {
  try {
    return normalizeStockAdminTenantId(window.localStorage?.getItem("gms-admin-id"), "");
  } catch (error) {
    return "";
  }
}

function getActiveStockAdminTenantId() {
  const employeeSession = readStockSessionStorageJson("gms-employee-session");
  const employeeAdminId = resolveStockAdminTenantIdFromSession(employeeSession, "");
  if (isUsableStockAdminTenantId(employeeAdminId)) {
    return employeeAdminId;
  }

  const adminSession = readStockSessionStorageJson("gms-admin-session");
  const adminId = resolveStockAdminTenantIdFromSession(adminSession, "");
  if (isUsableStockAdminTenantId(adminId)) {
    return adminId;
  }

  const storedAdminId = getStoredStockAdminTenantId();
  return isUsableStockAdminTenantId(storedAdminId) ? storedAdminId : "";
}

function requireActiveStockAdminTenantId() {
  const adminId = getActiveStockAdminTenantId();
  if (!adminId) {
    throw new Error("Unable to identify the logged-in account. Please sign in again.");
  }
  return adminId;
}

function withStockAdminScopeHeaders(headers = {}) {
  return {
    ...headers,
    "X-GMS-Admin-ID": requireActiveStockAdminTenantId(),
  };
}

function withStockAdminScopePayload(payload = {}) {
  return {
    ...payload,
    adminId: requireActiveStockAdminTenantId(),
  };
}

function getStockSessionProfileImageUrl(session) {
  return [
    session?.profileImageUrl,
    session?.avatarUrl,
    session?.photoUrl,
    session?.profilePhotoUrl,
    session?.employeePhotoUrl,
    session?.pictureUrl,
    session?.imageUrl,
    session?.logoUrl,
  ]
    .map((value) => String(value ?? "").trim())
    .find(Boolean) || "";
}

function getStockStoredLoginLogoUrl() {
  try {
    const adminSession = readStockSessionStorageJson("gms-admin-session");
    const adminScope = String(
      adminSession?.adminId ??
        adminSession?.id ??
        adminSession?.accountCode ??
        adminSession?.email ??
        "",
    )
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const scopedLogoKey = adminScope ? `gms-login-logo:admin:${adminScope}` : "gms-login-logo";
    return String(window.localStorage?.getItem(scopedLogoKey) || "").trim();
  } catch (error) {
    return "";
  }
}

function getStockAdminDisplayName(adminSession) {
  const fullName = String(
    [adminSession?.firstName, adminSession?.lastName].filter(Boolean).join(" "),
  ).replace(/\s+/g, " ").trim();
  const companyName = String(
    adminSession?.companyName ?? adminSession?.storeName ?? adminSession?.businessName ?? "",
  ).replace(/\s+/g, " ").trim();
  return (
    companyName ||
    fullName ||
    String(adminSession?.displayName ?? "").replace(/\s+/g, " ").trim() ||
    String(adminSession?.email ?? "").trim().split("@")[0] ||
    "Admin"
  );
}

function isStockEmployeeSession(session) {
  if (!session || typeof session !== "object") {
    return false;
  }

  const role = String(session.role ?? "").trim().toLowerCase();
  const accountId = String(
    session.employeeId ??
      session.accountCode ??
      session.id ??
      session.email ??
      "",
  ).trim();
  const position = String(session.position ?? "").trim();
  const accessPermissions = Array.isArray(session.accessPermissions)
    ? session.accessPermissions
        .map((permission) => String(permission ?? "").trim())
        .filter(Boolean)
    : [];

  return Boolean(role === "employee" || accountId || position || accessPermissions.length);
}

function normalizeStockEmployeeAccessPermissions(value) {
  return (Array.isArray(value) ? value : [])
    .map((permission) => String(permission ?? "").trim().toLowerCase())
    .filter(Boolean);
}

function getStockCurrentPageEmployeePermissionKey() {
  const pathname = String(window.location.pathname || "").trim().toLowerCase();
  return STOCK_EMPLOYEE_WORKSPACE_PERMISSION_BY_PATH[pathname] || "";
}

function hasStockEmployeeAccessToCurrentPage(session) {
  if (!isStockEmployeeSession(session)) {
    return false;
  }

  const pathname = String(window.location.pathname || "").trim().toLowerCase();
  const searchParams = new URLSearchParams(window.location.search);
  const explicitRole = String(searchParams.get(STOCK_WORKSPACE_ROLE_QUERY_PARAM) ?? "")
    .trim()
    .toLowerCase();

  if (isEmployeeStockPagePath(window.location.pathname)) {
    return true;
  }

  if (isEmbeddedLiveChatStockWorkspace()) {
    return !isAdminLiveChatReadOnlyWorkspace();
  }

  if (pathname === "/stock.html" && explicitRole === STOCK_WORKSPACE_ROLES.ADMIN) {
    return true;
  }

  const permissionKey = getStockCurrentPageEmployeePermissionKey();
  if (!permissionKey) {
    return false;
  }

  const accessPermissions = normalizeStockEmployeeAccessPermissions(session.accessPermissions);
  const hasConfiguredAccess = Boolean(
    session.accessPermissionsConfigured || accessPermissions.length > 0,
  );
  return Boolean(hasConfiguredAccess && accessPermissions.includes(permissionKey));
}

function getStockEmployeeActivityActor(employeeSession) {
  const displayName = String(
    [employeeSession.firstName, employeeSession.lastName].filter(Boolean).join(" ") ||
      employeeSession.displayName ||
      employeeSession.fullName ||
      "",
  ).replace(/\s+/g, " ").trim();

  return {
    role: "employee",
    accountId: String(
      employeeSession.employeeId ??
        employeeSession.accountCode ??
        employeeSession.id ??
        employeeSession.email ??
        "",
    ).trim(),
    displayName: displayName || "Employee",
    profileImageUrl: getStockSessionProfileImageUrl(employeeSession),
  };
}

function getStockAdminActivityActor(adminSession) {
  return {
    role: "admin",
    accountId: String(adminSession?.email ?? "admin").trim(),
    displayName: getStockAdminDisplayName(adminSession),
    profileImageUrl: getStockSessionProfileImageUrl(adminSession) || getStockStoredLoginLogoUrl(),
  };
}

function getStockActivityActor() {
  const employeeSession = readStockSessionStorageJson("gms-employee-session");
  if (hasStockEmployeeAccessToCurrentPage(employeeSession)) {
    return getStockEmployeeActivityActor(employeeSession);
  }

  return getStockAdminActivityActor(
    readStockSessionStorageJson("gms-admin-session"),
  );
}

function normalizeStockNotificationFocusTarget(value) {
  const target = String(value ?? "").trim().toLowerCase();
  if (["add", "added", "add-stock", "stock-add", "restock", "new-stock"].includes(target)) {
    return "add";
  }
  if (["deduct", "deducted", "deduct-stock", "stock-deduct", "subtract"].includes(target)) {
    return "deduct";
  }
  if (["expiry", "expiry-date", "expire-date", "expiration", "expiration-date"].includes(target)) {
    return "expiry";
  }
  if (["card", "product", "inventory", "details"].includes(target)) {
    return "card";
  }
  return "card";
}

function resolveInitialStockNotificationFocusRequest() {
  const searchParams = new URLSearchParams(window.location.search);
  const productId = String(
    searchParams.get("product") ??
      searchParams.get("edit") ??
      searchParams.get("stockProduct") ??
      "",
  ).trim();
  const displayProductId = String(
    searchParams.get("stockProduct") ??
      searchParams.get("displayProduct") ??
      "",
  ).trim();
  const shouldFocus = searchParams.get("notificationFocus") === "1" && Boolean(productId || displayProductId);
  if (!shouldFocus) {
    return null;
  }

  const stockRecordId = String(
    searchParams.get("stockRecord") ??
      searchParams.get("stockRecordId") ??
      "",
  ).trim();
  const stockRecordModifiedAt = String(
    searchParams.get("stockRecordModifiedAt") ??
      searchParams.get("modifiedAt") ??
      "",
  ).trim();

  return {
    productId,
    displayProductId,
    stockRecordId,
    stockRecordModifiedAt,
    target: normalizeStockNotificationFocusTarget(searchParams.get("focus")),
  };
}

function getStockNotificationFocusTargets(targets) {
  return [...new Set(
    (Array.isArray(targets) ? targets : [])
      .map(normalizeStockNotificationFocusTarget)
      .filter((target) => target !== "card"),
  )];
}

function getStockNotificationActivityTarget(targets) {
  const normalizedTargets = getStockNotificationFocusTargets(targets);
  return normalizedTargets.length === 1 ? normalizedTargets[0] : "card";
}

function doesStockProductMatchNotificationFocus(product, request) {
  if (!product || !request) {
    return false;
  }

  const sourceProduct = getStockSourceProduct(product);
  const matchIds = [
    getStockProductIdentifier(product),
    product?.stockDisplayId,
    product?.id,
    sourceProduct?.id,
    getStockProductIdentifier(sourceProduct),
  ]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);
  const requestedDisplayProductId = String(request.displayProductId ?? "").trim();
  const requestedProductId = String(request.productId ?? "").trim();
  return matchIds.some((id) => id === requestedDisplayProductId || id === requestedProductId);
}

function findStockNotificationFocusProduct(request = pendingStockNotificationFocusRequest) {
  if (!request) {
    return null;
  }

  const displayProducts = getFilteredStockProducts(getStockDisplayProducts(currentStockProducts));
  const requestedDisplayProductId = String(request.displayProductId ?? "").trim();
  if (requestedDisplayProductId) {
    const exactDisplayProduct = displayProducts.find(
      (product) => getStockProductIdentifier(product) === requestedDisplayProductId,
    );
    if (exactDisplayProduct) {
      return exactDisplayProduct;
    }
  }

  return displayProducts.find((product) => doesStockProductMatchNotificationFocus(product, request)) || null;
}

function preparePendingStockNotificationFocusSelection() {
  const focusProduct = findStockNotificationFocusProduct();
  if (!focusProduct) {
    return null;
  }

  selectedStockProductId = getStockProductIdentifier(focusProduct);
  return focusProduct;
}

function getStockProductCardElement(productIdentifier) {
  const normalizedIdentifier = String(productIdentifier ?? "").trim();
  if (!normalizedIdentifier || !(stockProductList instanceof HTMLElement)) {
    return null;
  }

  return Array.from(
    stockProductList.querySelectorAll(".stock-product-card[data-stock-product-id]"),
  ).find((card) => String(card?.dataset?.stockProductId ?? "").trim() === normalizedIdentifier) || null;
}

function clearStockNotificationFocusSpotlight() {
  if (stockNotificationFocusSpotlightFrame) {
    window.cancelAnimationFrame(stockNotificationFocusSpotlightFrame);
    stockNotificationFocusSpotlightFrame = 0;
  }

  if (stockNotificationFocusSurface instanceof HTMLElement) {
    stockNotificationFocusSurface.style.removeProperty("--stock-notification-focus-left");
    stockNotificationFocusSurface.style.removeProperty("--stock-notification-focus-top");
    stockNotificationFocusSurface.style.removeProperty("--stock-notification-focus-width");
    stockNotificationFocusSurface.style.removeProperty("--stock-notification-focus-height");
  }
}

function updateStockNotificationFocusSpotlight(target) {
  if (!(stockNotificationFocusSurface instanceof HTMLElement) || !(target instanceof HTMLElement)) {
    return;
  }

  const focusPadding = 14;
  const targetRect = target.getBoundingClientRect();
  const left = Math.max(0, targetRect.left - focusPadding);
  const top = Math.max(0, targetRect.top - focusPadding);
  const width = Math.min(window.innerWidth - left, targetRect.width + (focusPadding * 2));
  const height = Math.min(window.innerHeight - top, targetRect.height + (focusPadding * 2));

  stockNotificationFocusSurface.style.setProperty("--stock-notification-focus-left", `${left}px`);
  stockNotificationFocusSurface.style.setProperty("--stock-notification-focus-top", `${top}px`);
  stockNotificationFocusSurface.style.setProperty("--stock-notification-focus-width", `${Math.max(0, width)}px`);
  stockNotificationFocusSurface.style.setProperty("--stock-notification-focus-height", `${Math.max(0, height)}px`);
}

function startStockNotificationFocusSpotlight(target) {
  clearStockNotificationFocusSpotlight();

  const trackSpotlight = () => {
    updateStockNotificationFocusSpotlight(target);
    stockNotificationFocusSpotlightFrame = window.requestAnimationFrame(trackSpotlight);
  };

  trackSpotlight();
}

function clearStockNotificationFocusElements() {
  if (stockNotificationFocusTimer) {
    window.clearTimeout(stockNotificationFocusTimer);
    stockNotificationFocusTimer = 0;
  }

  for (const timer of stockNotificationFocusTimers) {
    window.clearTimeout(timer);
  }
  stockNotificationFocusTimers = [];

  document
    .querySelectorAll(
      ".is-stock-notification-focus-pop, .is-notification-focus-pop, .is-stock-notification-record-focus-pop",
    )
    .forEach((focusedElement) => {
      focusedElement.classList.remove(
        "is-stock-notification-focus-pop",
        "is-notification-focus-pop",
        "is-stock-notification-record-focus-pop",
      );
    });

  stockProductList?.classList.remove("is-stock-notification-focus-active");
  stockNotificationFocusSurface?.classList.remove("is-stock-notification-focus-active");
  clearStockNotificationFocusSpotlight();
}

function flashStockNotificationFocusElement(element, options = {}) {
  if (!(element instanceof HTMLElement)) {
    return;
  }

  if (options.clearExisting !== false) {
    clearStockNotificationFocusElements();
  }

  element.scrollIntoView({ behavior: "smooth", block: options.block || "center", inline: "nearest" });
  const recordShell = element.closest?.(".stock-detail-panel__table-shell");
  if (recordShell instanceof HTMLElement) {
    recordShell.classList.add("is-stock-notification-record-focus-pop");
  }
  element.classList.add("is-notification-focus-pop", "is-stock-notification-focus-pop");
  if (options.focus !== false && typeof element.focus === "function") {
    window.requestAnimationFrame(() => {
      element.focus({ preventScroll: true });
    });
  }

  const focusTimer = window.setTimeout(() => {
    element.classList.remove("is-notification-focus-pop", "is-stock-notification-focus-pop");
    recordShell?.classList?.remove("is-stock-notification-record-focus-pop");
    stockNotificationFocusTimers = stockNotificationFocusTimers.filter((timer) => timer !== focusTimer);
    if (stockNotificationFocusTimer === focusTimer) {
      stockNotificationFocusTimer = stockNotificationFocusTimers[stockNotificationFocusTimers.length - 1] || 0;
    }
  }, 1700);
  stockNotificationFocusTimers.push(focusTimer);
  stockNotificationFocusTimer = focusTimer;
}

function flashStockNotificationCard(product, options = {}) {
  const productIdentifier = getStockProductIdentifier(product);
  const card = getStockProductCardElement(productIdentifier);
  if (!(card instanceof HTMLElement)) {
    return;
  }

  flashStockNotificationFocusElement(card, { focus: true, ...options });
  stockProductList?.classList.add("is-stock-notification-focus-active");
  stockNotificationFocusSurface?.classList.add("is-stock-notification-focus-active");
  startStockNotificationFocusSpotlight(card);

  const spotlightTimer = window.setTimeout(() => {
    stockProductList?.classList.remove("is-stock-notification-focus-active");
    stockNotificationFocusSurface?.classList.remove("is-stock-notification-focus-active");
    clearStockNotificationFocusSpotlight();
    stockNotificationFocusTimers = stockNotificationFocusTimers.filter((timer) => timer !== spotlightTimer);
  }, 1700);
  stockNotificationFocusTimers.push(spotlightTimer);
}

function getStockNotificationRecordFocusTypeFromRow(row) {
  return String(row?.dataset?.stockRecordFocusType ?? "").trim();
}

function getStockNotificationRecordRows() {
  if (!(stockDetailList instanceof HTMLElement)) {
    return [];
  }

  return Array.from(
    stockDetailList.querySelectorAll(".stock-detail-table__row[data-stock-record-focus-type]"),
  );
}

function getStockNotificationRecordFocusCell(row, target) {
  if (!(row instanceof HTMLElement)) {
    return null;
  }

  if (target === "expiry") {
    return row.querySelector("[data-stock-record-focus-cell='expiry']") || row;
  }

  if (target === "add" || target === "deduct") {
    return row.querySelector("[data-stock-record-focus-cell='stocks']") || row;
  }

  return row;
}

function findStockNotificationRecordRow(recordRows, request = null) {
  const normalizedRecordId = String(
    request?.stockRecordId ??
      request?.stockRecord ??
      "",
  ).trim();
  if (normalizedRecordId) {
    const matchingRecordRow = recordRows.find(
      (row) => String(row?.dataset?.stockRecordId ?? "").trim() === normalizedRecordId,
    );
    if (matchingRecordRow) {
      return matchingRecordRow;
    }
  }

  const normalizedModifiedAt = String(
    request?.stockRecordModifiedAt ??
      request?.modifiedAt ??
      "",
  ).trim();
  if (normalizedModifiedAt) {
    return recordRows.find(
      (row) => String(row?.dataset?.stockRecordModifiedAt ?? "").trim() === normalizedModifiedAt,
    ) || null;
  }

  return null;
}

function getStockNotificationRecordFocusElement(target, request = null) {
  const normalizedTarget = normalizeStockNotificationFocusTarget(target);
  const recordRows = getStockNotificationRecordRows();
  if (!recordRows.length) {
    return null;
  }

  const exactRecordRow = findStockNotificationRecordRow(recordRows, request);
  if (exactRecordRow) {
    return exactRecordRow;
  }

  const matchingRow = normalizedTarget === "card"
    ? recordRows[0]
    : recordRows.find((row) => getStockNotificationRecordFocusTypeFromRow(row) === normalizedTarget);
  return matchingRow || recordRows[0];
}

function getStockNotificationModalTargetElement(target, controls = {}) {
  if (target === "add") {
    return controls.addStockInput || null;
  }
  if (target === "deduct") {
    return controls.deductInput || null;
  }
  if (target === "expiry") {
    return controls.expiryTrigger || null;
  }
  return null;
}

function focusStockNotificationModalTarget(target, controls = {}) {
  const targetElement = getStockNotificationModalTargetElement(target, controls);
  if (!targetElement) {
    return false;
  }

  flashStockNotificationFocusElement(targetElement, { focus: true });
  return true;
}

function applyPendingStockNotificationFocus() {
  if (!pendingStockNotificationFocusRequest) {
    return;
  }

  const request = pendingStockNotificationFocusRequest;
  const focusProduct = findStockNotificationFocusProduct(request);
  if (!focusProduct) {
    return;
  }

  selectedStockProductId = getStockProductIdentifier(focusProduct);
  const target = normalizeStockNotificationFocusTarget(request.target);
  pendingStockNotificationFocusRequest = null;

  editingStockProductId = "";
  removeStockEditModalOverlay();
  renderStockDashboard(currentStockProducts);
  window.requestAnimationFrame(() => {
    clearStockNotificationFocusElements();
    flashStockNotificationCard(focusProduct, {
      block: "nearest",
      clearExisting: false,
      focus: true,
    });
    const recordFocusElement = getStockNotificationRecordFocusElement(target, request);
    flashStockNotificationFocusElement(recordFocusElement, {
      block: "center",
      clearExisting: false,
      focus: false,
    });
  });
}

function broadcastStockProductsUpdated() {
  try {
    window.localStorage?.setItem(STOCK_PRODUCTS_UPDATED_STORAGE_KEY, String(Date.now()));
  } catch (error) {
    // Ignore storage sync failures and keep the current page responsive.
  }
}

function setStockWorkspaceNavItemVisibility(item, isVisible) {
  if (!item) {
    return;
  }

  item.hidden = !isVisible;
  if (isVisible) {
    item.removeAttribute("aria-hidden");
    return;
  }

  item.setAttribute("aria-hidden", "true");
}

function isEmployeeAccessManagedNavItem(item) {
  return Boolean(item?.dataset?.employeeAccessPermission);
}

function configureStockWorkspaceNavItem(item, options = {}) {
  if (!item) {
    return;
  }

  const {
    href,
    ariaLabel,
    title,
    label,
    iconMarkup,
  } = options;

  if (typeof href === "string" && href) {
    item.setAttribute("href", href);
  }

  if (typeof ariaLabel === "string" && ariaLabel) {
    item.setAttribute("aria-label", ariaLabel);
  }

  if (typeof title === "string" && title) {
    item.setAttribute("title", title);
    item.dataset.navTooltip = title;
  }

  if (typeof label === "string" && label) {
    const labelElement = item.querySelector(".dashboard-nav__label");
    if (labelElement) {
      labelElement.textContent = label;
    }
  }

  if (typeof iconMarkup === "string" && iconMarkup) {
    const iconElement = item.querySelector(".dashboard-nav__icon");
    if (iconElement) {
      iconElement.innerHTML = iconMarkup;
    }
  }
}

function applyStockWorkspaceRole() {
  const isEmployeeWorkspace = isEmployeeStockWorkspace();
  const isEmbeddedLiveChatWorkspace = isEmbeddedLiveChatStockWorkspace();

  if (
    isEmployeeWorkspace
    && !isEmployeeStockPagePath(window.location.pathname)
    && !isEmbeddedLiveChatWorkspace
  ) {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get(STOCK_WORKSPACE_ROLE_QUERY_PARAM) !== STOCK_WORKSPACE_ROLES.EMPLOYEE) {
      searchParams.set(STOCK_WORKSPACE_ROLE_QUERY_PARAM, STOCK_WORKSPACE_ROLES.EMPLOYEE);
      const nextSearch = searchParams.toString();
      const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`;
      window.history.replaceState({}, "", nextUrl);
    }
  }

  document.body.dataset.stockWorkspaceRole = activeStockWorkspaceRole;
  if (!isEmbeddedLiveChatWorkspace) {
    document.title = "Inventory";
  }

  if (stockWorkspaceLink) {
    stockWorkspaceLink.setAttribute(
      "href",
      isEmployeeWorkspace ? "/employee_dashboard.html" : "/admin_dashboard.html",
    );
    stockWorkspaceLink.setAttribute(
      "aria-label",
      isEmployeeWorkspace ? "Employee dashboard home" : "Admin dashboard home",
    );
    stockWorkspaceLink.setAttribute(
      "title",
      isEmployeeWorkspace ? "Employee dashboard" : "Admin dashboard",
    );
  }

  if (stockWorkspaceNav) {
    stockWorkspaceNav.setAttribute(
      "aria-label",
      isEmployeeWorkspace ? "Employee navigation" : "Admin navigation",
    );
  }

  if (stockRecordHeadings) {
    stockRecordHeadings.hidden = false;
  }

  if (stockWorkspaceLabel) {
    stockWorkspaceLabel.textContent = isEmployeeWorkspace
      ? "Employee Workspace"
      : getStockAdminDisplayName(readStockSessionStorageJson("gms-admin-session"));
  }

  if (stockWorkspaceSubtitle) {
    stockWorkspaceSubtitle.textContent = isEmployeeWorkspace ? "Inventory" : "Free Plan";
  }

  if (stockWorkspaceAvatarImage) {
    stockWorkspaceAvatarImage.alt = isEmployeeWorkspace ? "Employee logo" : "Admin logo";
  }

  if (stockWorkspaceSidebarLogoImage) {
    stockWorkspaceSidebarLogoImage.alt = isEmployeeWorkspace ? "Employee logo" : "Admin logo";
  }

  if (stockWorkspaceAvatarPlaceholder) {
    stockWorkspaceAvatarPlaceholder.innerHTML = isEmployeeWorkspace
      ? "EM"
      : getStockWorkspaceDefaultLogoIconMarkup();
  }

  configureStockWorkspaceNavItem(stockWorkspaceNavItems.dashboard, {
    href: isEmployeeWorkspace ? "/employee_dashboard.html" : "/admin_dashboard.html",
    ariaLabel: isEmployeeWorkspace ? "Employee dashboard" : "Dashboard",
    title: isEmployeeWorkspace ? "Employee dashboard" : "Dashboard",
    label: "Dashboard",
  });
  configureStockWorkspaceNavItem(stockWorkspaceNavItems.stock, {
    href: buildStockWorkspaceUrl(activeStockWorkspaceRole),
    ariaLabel: "Inventory",
    title: "Inventory",
    label: "Inventory",
  });
  configureStockWorkspaceNavItem(stockWorkspaceNavItems.employeeData, {
    href: "/Employee_data.html",
    ariaLabel: "Employee data",
    title: "Employee data",
    label: "Employee Data",
    iconMarkup: "",
  });
  configureStockWorkspaceNavItem(stockWorkspaceNavItems.register, {
    href: "/register.html",
    ariaLabel: "Register",
    title: "Register",
    label: "Register",
    iconMarkup: `<svg viewBox="0 -960 960 960" fill="none" aria-hidden="true">
        <path d="M730-530H630q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h100v-100q0-12.75 8.68-21.38 8.67-8.62 21.5-8.62 12.82 0 21.32 8.62 8.5 8.63 8.5 21.38v100h100q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H790v100q0 12.75-8.68 21.37-8.67 8.63-21.5 8.63-12.82 0-21.32-8.63-8.5-8.62-8.5-21.37v-100Zm-478 7q-42-42-42-108t42-108q42-42 108-42t108 42q42 42 42 108t-42 108q-42 42-108 42t-108-42ZM40-220v-34q0-35 17.5-63.5T108-360q75-33 133.34-46.5t118.5-13.5Q420-420 478-406.5T611-360q33 15 51 43t18 63v34q0 24.75-17.62 42.37Q644.75-160 620-160H100q-24.75 0-42.37-17.63Q40-195.25 40-220Zm60 0h520v-34q0-16-9-30.5T587-306q-71-33-120-43.5T360-360q-58 0-107.5 10.5T132-306q-15 7-23.5 21.5T100-254v34Zm324.5-346.5Q450-592 450-631t-25.5-64.5Q399-721 360-721t-64.5 25.5Q270-670 270-631t25.5 64.5Q321-541 360-541t64.5-25.5ZM360-631Zm0 411Z" fill="currentColor"></path>
      </svg>`,
  });

  setStockWorkspaceNavItemVisibility(stockWorkspaceNavItems.dashboard, true);
  setStockWorkspaceNavItemVisibility(stockWorkspaceNavItems.stock, true);
  setStockWorkspaceNavItemVisibility(stockWorkspaceNavItems.employeeData, !isEmployeeWorkspace);
  setStockWorkspaceNavItemVisibility(
    stockWorkspaceNavItems.register,
    !isEmployeeWorkspace || isEmployeeAccessManagedNavItem(stockWorkspaceNavItems.register),
  );
  setStockWorkspaceNavItemVisibility(
    stockWorkspaceNavItems.insight,
    !isEmployeeWorkspace,
  );
  setStockWorkspaceNavItemVisibility(
    stockWorkspaceNavItems.productInsight,
    !isEmployeeWorkspace,
  );
  setStockWorkspaceNavItemVisibility(
    stockWorkspaceNavItems.products,
    !isEmployeeWorkspace,
  );
  setStockWorkspaceNavItemVisibility(
    stockWorkspaceNavItems.userData,
    !isEmployeeWorkspace,
  );
  setStockWorkspaceNavItemVisibility(
    stockWorkspaceNavItems.paymentPartners,
    !isEmployeeWorkspace,
  );
  setStockWorkspaceNavItemVisibility(
    stockWorkspaceNavItems.deliveryPartners,
    !isEmployeeWorkspace,
  );
  setStockWorkspaceNavItemVisibility(
    stockWorkspaceNavItems.login,
    !isEmployeeWorkspace,
  );

  if (isEmployeeWorkspace) {
    editingStockProductId = "";
    removeStockEditModalOverlay();
    window.gmsApplyEmployeeWorkspaceProfile?.();
    window.setTimeout(() => window.gmsApplyEmployeeWorkspaceProfile?.(), 0);
  }
}

function syncStockModalOpenClass() {
  const hasOpenModal = Boolean(
    document.querySelector(".stock-edit-modal-overlay")
    || document.querySelector(".stock-delete-modal-overlay:not([hidden])")
    || document.querySelector(".stock-success-modal-overlay:not([hidden])"),
  );
  document.body.classList.toggle("modal-open", hasOpenModal);
}

function setSummaryValue(element, value) {
  if (!element) {
    return;
  }

  element.textContent = String(value);
}

function normalizeStockSearchTerm(value) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeStockDeductReason(value) {
  const normalizedValue = String(value ?? "").trim().toLowerCase();
  return STOCK_DEDUCT_REASON_OPTIONS.some((option) => option.value === normalizedValue)
    ? normalizedValue
    : "";
}

function getStockDeductReasonLabel(value) {
  const normalizedValue = normalizeStockDeductReason(value);
  return STOCK_DEDUCT_REASON_OPTIONS.find((option) => option.value === normalizedValue)?.label ?? "";
}

function normalizeStockDeductReasonDetail(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeStockCategoryName(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeStockCategoryFilter(value) {
  return normalizeStockCategoryName(value).toLowerCase();
}

function getStockProductCategoryList(product) {
  const rawCategories = [
    ...(Array.isArray(product?.categories) ? product.categories : []),
    product?.category,
  ];
  const seen = new Set();
  const categories = [];

  for (const value of rawCategories) {
    const normalizedCategory = normalizeStockCategoryName(value);
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

function syncStockCategoryFilterSummary() {
  if (!stockCategoryFilterSummary) {
    return;
  }

  stockCategoryFilterSummary.textContent =
    normalizeStockCategoryName(stockCategoryFilter) || "All Categories";
}

function setStockCategoryFilterOpen(isOpen) {
  if (
    !stockCategoryFilterDropdown
    || !stockCategoryFilterTrigger
    || !stockCategoryFilterMenu
  ) {
    return;
  }

  stockCategoryFilterDropdown.classList.toggle("is-open", Boolean(isOpen));
  stockCategoryFilterTrigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
  stockCategoryFilterMenu.hidden = !isOpen;
}

function getStockSearchDocument(product) {
  return [
    product?.name,
    ...getStockProductCategoryList(product),
    product?.id,
    product?.stock,
    product?.originalPrice,
    product?.salesPrice,
    product?.stockDisplayLabel,
    isExpiredStockDisplayEntry(product) ? "expired offline batch" : "",
    isFreshStockDisplayEntry(product) ? "new available batch" : "",
  ]
    .map((value) => String(value ?? "").trim().toLowerCase())
    .filter(Boolean)
    .join(" ");
}

function getFilteredStockProducts(
  products,
  searchTerm = stockSearchTerm,
  stockFilter = stockPriorityFilter,
  categoryFilter = stockCategoryFilter,
) {
  const normalizedProducts = Array.isArray(products) ? products : [];
  const normalizedSearchTerm = normalizeStockSearchTerm(searchTerm);
  const normalizedFilter = normalizeStockPriorityFilter(stockFilter);
  const normalizedCategoryFilter = normalizeStockCategoryFilter(categoryFilter);

  const searchFilteredProducts = !normalizedSearchTerm
    ? normalizedProducts
    : normalizedProducts.filter((product) =>
        getStockSearchDocument(product).includes(normalizedSearchTerm),
      );

  const categoryFilteredProducts = !normalizedCategoryFilter
    ? searchFilteredProducts
    : searchFilteredProducts.filter((product) =>
        getStockProductCategoryList(product).some(
          (category) => normalizeStockCategoryFilter(category) === normalizedCategoryFilter,
        ),
      );

  if (normalizedFilter === "low-stock") {
    return categoryFilteredProducts.filter((product) => isLowStockProduct(product));
  }

  if (normalizedFilter === "out-of-stock") {
    return categoryFilteredProducts.filter((product) => getStock(product) === 0);
  }

  if (normalizedFilter === "near-expiry") {
    return categoryFilteredProducts.filter((product) => isNearExpiryProduct(product));
  }

  if (normalizedFilter === "expired-product" || normalizedFilter === "expired") {
    return categoryFilteredProducts.filter((product) => isExpiredProduct(product));
  }

  if (normalizedFilter === "new-stock") {
    return categoryFilteredProducts.filter((product) => isNewStockFilterMatch(product));
  }

  return categoryFilteredProducts;
}

function isLowStockProduct(product) {
  const stock = getStock(product);
  if (stock <= 0 || stock > 10) {
    return false;
  }

  return !isExpiredProduct(product) && !isExpiredStockDisplayEntry(product);
}

function normalizeStockPriorityFilter(value) {
  const normalizedValue = String(value ?? "").trim().toLowerCase();
  if (normalizedValue === "new-stock") {
    return "new-stock";
  }

  if (normalizedValue === "low-stock") {
    return "low-stock";
  }

  if (normalizedValue === "out-of-stock") {
    return "out-of-stock";
  }

  if (normalizedValue === "near-expiry") {
    return "near-expiry";
  }

  if (normalizedValue === "expired-product" || normalizedValue === "expired") {
    return "expired-product";
  }

  return "all";
}

function getStockPriorityFilterLabel(filter = stockPriorityFilter) {
  const normalizedFilter = normalizeStockPriorityFilter(filter);
  if (normalizedFilter === "new-stock") {
    return "new stock";
  }

  if (normalizedFilter === "low-stock") {
    return "low stock";
  }

  if (normalizedFilter === "out-of-stock") {
    return "out of stock";
  }

  if (normalizedFilter === "near-expiry") {
    return "near expiry";
  }

  if (normalizedFilter === "expired-product") {
    return "expired product";
  }

  return "all";
}

function syncStockPriorityFilterButtons() {
  stockPriorityFilterButtons.forEach((button) => {
    const isActive =
      normalizeStockPriorityFilter(button?.dataset?.stockPriorityFilter) === stockPriorityFilter;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

function renderStockCategoryFilterOptions(products = currentStockProducts) {
  if (!stockCategoryFilterMenu) {
    return;
  }

  const nextCategories = [];
  const seen = new Set();

  for (const product of Array.isArray(products) ? products : []) {
    for (const category of getStockProductCategoryList(product)) {
      const normalizedKey = normalizeStockCategoryFilter(category);
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
  const normalizedSelectedFilter = normalizeStockCategoryFilter(stockCategoryFilter);
  const resolvedSelectedFilter = nextCategories.find(
    (category) => normalizeStockCategoryFilter(category) === normalizedSelectedFilter,
  );

  stockCategoryFilter = resolvedSelectedFilter ?? "";
  syncStockCategoryFilterSummary();
  stockCategoryFilterMenu.innerHTML = "";

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
      normalizeStockCategoryFilter(optionConfig.value) === normalizeStockCategoryFilter(stockCategoryFilter);
    option.setAttribute("aria-selected", isSelected ? "true" : "false");
    if (isSelected) {
      option.classList.add("is-selected");
    }

    option.textContent = optionConfig.label;
    option.addEventListener("click", () => {
      stockCategoryFilter = optionConfig.value;
      syncStockCategoryFilterSummary();
      renderStockCategoryFilterOptions(currentStockProducts);
      setStockCategoryFilterOpen(false);
      stockCategoryFilterTrigger?.focus();
      editingStockProductId = "";
      renderStockDashboard(currentStockProducts);
    });

    stockCategoryFilterMenu.appendChild(option);
  }
}

function getStock(product) {
  const stockSource = isSplitStockDisplayEntry(product)
    ? product?.stock
    : (
        product?.inventoryStock ??
        product?.totalStock ??
        product?.stock
      );
  const stock = Number(stockSource ?? 0);
  return Number.isFinite(stock) && stock >= 0 ? Math.trunc(stock) : 0;
}

function getOriginalPrice(product) {
  return Number(product.originalPrice ?? product.price ?? 0);
}

function getSalesPrice(product) {
  if (
    product.salesPrice === null ||
    product.salesPrice === undefined ||
    product.salesPrice === ""
  ) {
    return null;
  }

  return Number(product.salesPrice);
}

function getResolvedPrice(product) {
  const salesPrice = getSalesPrice(product);
  if (salesPrice !== null && Number.isFinite(salesPrice) && salesPrice >= 0) {
    return salesPrice;
  }

  return getOriginalPrice(product);
}

function formatPrice(price) {
  return `PHP ${Number(price).toFixed(2)}`;
}

function formatUnits(value) {
  return `${value} unit${value === 1 ? "" : "s"}`;
}

function formatStockCountDisplay(value) {
  return new Intl.NumberFormat("en-PH").format(Number(value) || 0);
}

function getProductOldStockCount(product) {
  const stock = Number(
    product?.lastRestockPreviousStock ??
      product?.oldStockCount ??
      product?.previousStockCount ??
      0,
  );
  return Number.isFinite(stock) && stock >= 0 ? Math.trunc(stock) : 0;
}

function getProductNewStockCount(product) {
  const stock = Number(
    product?.lastRestockAddedStock ??
      product?.newStockCount ??
      product?.addedStockCount ??
      0,
  );
  return Number.isFinite(stock) && stock >= 0 ? Math.trunc(stock) : 0;
}

function getProductLastAddedStockQuantity(product) {
  const quantity = Number(
    product?.lastStockAddedQuantity ??
      product?.lastAddedStockQuantity ??
      product?.lastAddStockQuantity ??
      0,
  );
  return Number.isFinite(quantity) && quantity >= 0 ? Math.trunc(quantity) : 0;
}

function getProductLastDeductedStockQuantity(product) {
  const quantity = Number(
    product?.lastStockDeductedQuantity ??
      product?.lastDeductedStockQuantity ??
      product?.lastDeductStockQuantity ??
      0,
  );
  return Number.isFinite(quantity) && quantity >= 0 ? Math.trunc(quantity) : 0;
}

function getProductNewStockDate(product) {
  const explicitDate = String(
    product?.lastRestockExpiryDate ??
      product?.newStockDate ??
      product?.newStockExpiryDate ??
      product?.restockExpiryDate ??
      "",
  ).trim();

  if (explicitDate) {
    return explicitDate;
  }

  return getProductNewStockCount(product) > 0
    ? String(getProductExpiryDate(product) ?? "").trim()
    : "";
}

function getProductOldStockExpiryDate(product) {
  const explicitDate = String(
    product?.lastRestockPreviousExpiryDate ??
      product?.oldStockExpiryDate ??
      product?.previousExpiryDate ??
      "",
  ).trim();

  if (explicitDate) {
    return explicitDate;
  }

  const currentExpiryDate = String(getProductExpiryDate(product) ?? "").trim();
  if (getProductOldStockCount(product) > 0 && getProductNewStockCount(product) <= 0 && currentExpiryDate) {
    return currentExpiryDate;
  }

  return "";
}

function hasProductRestockDetails(product) {
  return getProductOldStockCount(product) > 0 || getProductNewStockCount(product) > 0;
}

function getProductStockBreakdown(product) {
  const totalStock = getStock(product);
  if (!hasProductRestockDetails(product)) {
    return {
      oldStock: totalStock,
      newStock: 0,
    };
  }

  const storedOldStock = Math.max(0, getProductOldStockCount(product));
  const storedNewStock = Math.max(0, getProductNewStockCount(product));
  if (storedOldStock > 0 || storedNewStock > 0) {
    return {
      oldStock: storedOldStock,
      newStock: storedNewStock,
    };
  }

  return {
    oldStock: totalStock,
    newStock: 0,
  };
}

function isExpiryDateValueExpired(value) {
  const expiryDayStartTimestamp = getLocalDateStartTimestamp(value);
  if (!Number.isFinite(expiryDayStartTimestamp)) {
    return false;
  }

  return expiryDayStartTimestamp < getTodayStartTimestamp();
}

function isNearExpiryDateValue(value) {
  const expiryDayStartTimestamp = getLocalDateStartTimestamp(value);
  if (!Number.isFinite(expiryDayStartTimestamp) || isExpiryDateValueExpired(value)) {
    return false;
  }

  const timeUntilExpiry = expiryDayStartTimestamp - getTodayStartTimestamp();
  return timeUntilExpiry >= 0 && timeUntilExpiry <= STOCK_NEAR_EXPIRY_WINDOW_DAYS * 24 * 60 * 60 * 1000;
}

function isSplitStockDisplayEntry(product) {
  return Boolean(product?.isSplitStockDisplayEntry);
}

function isExpiredStockDisplayEntry(product) {
  return String(product?.stockDisplayRole ?? "").trim().toLowerCase() === "expired";
}

function isFreshStockDisplayEntry(product) {
  return String(product?.stockDisplayRole ?? "").trim().toLowerCase() === "fresh";
}

function isNewStockFilterMatch(product) {
  if (isExpiredStockDisplayEntry(product)) {
    return false;
  }

  if (isFreshStockDisplayEntry(product)) {
    return getStockDisplaySourceBatch(product) === "new"
      && isNewStockProduct(getStockSourceProduct(product));
  }

  return isNewStockProduct(product);
}

function getStockDisplaySourceBatch(product) {
  const normalizedValue = String(product?.stockDisplaySourceBatch ?? "").trim().toLowerCase();
  return normalizedValue === "old" || normalizedValue === "new"
    ? normalizedValue
    : "";
}

function getStockSourceProduct(product) {
  return product?.sourceProduct && typeof product.sourceProduct === "object"
    ? product.sourceProduct
    : product;
}

function getProductVariants(product) {
  const sourceProduct = getStockSourceProduct(product);
  return Array.isArray(sourceProduct?.variants)
    ? sourceProduct.variants.filter((variant) => variant && typeof variant === "object")
    : [];
}

function formatProductVariantLabel(variant, index = 0) {
  const variantName = String(variant?.name ?? "").trim();
  const variantQuantity = String(variant?.quantity ?? "").trim();
  if (variantName && variantQuantity) {
    return `${variantName} (${variantQuantity})`;
  }

  if (variantName || variantQuantity) {
    return variantName || variantQuantity;
  }

  return `Variant ${index + 1}`;
}

function getProductVariantSummary(product, maxVisible = 3) {
  const variantLabels = getProductVariants(product)
    .map((variant, index) => formatProductVariantLabel(variant, index))
    .filter(Boolean);
  if (!variantLabels.length) {
    return "";
  }

  const visibleCount = Math.max(1, Math.trunc(Number(maxVisible) || 0));
  const visibleLabels = variantLabels.slice(0, visibleCount);
  const hiddenCount = Math.max(0, variantLabels.length - visibleLabels.length);
  return hiddenCount > 0
    ? `${visibleLabels.join(", ")} +${hiddenCount} more`
    : visibleLabels.join(", ");
}

function findInventoryProductById(productId, products = currentStockProducts) {
  const normalizedProductId = String(productId ?? "").trim().toLowerCase();
  if (!normalizedProductId) {
    return null;
  }

  const normalizedProducts = Array.isArray(products) ? products : [];
  for (const candidate of normalizedProducts) {
    const sourceProduct = getStockSourceProduct(candidate);
    const candidateId = String(sourceProduct?.id ?? candidate?.id ?? "").trim().toLowerCase();
    if (candidateId === normalizedProductId) {
      return sourceProduct ?? candidate;
    }
  }

  return null;
}

function getVariantAvailableStock(product, variant, products = currentStockProducts) {
  const variantAddOns = Array.isArray(variant?.addOns) ? variant.addOns : [];
  if (!variantAddOns.length) {
    return getStock(product);
  }

  const normalizedProducts = Array.isArray(products) ? products : [];
  if (!normalizedProducts.length) {
    return 0;
  }

  let availableStock = null;
  for (const addOn of variantAddOns) {
    const addOnId = String(addOn?.id ?? "").trim().toLowerCase();
    const requiredQuantity = Math.max(1, Math.trunc(Number(addOn?.quantity ?? 1) || 1));
    if (!addOnId) {
      return 0;
    }

    const inventoryProduct = findInventoryProductById(addOnId, normalizedProducts);
    const inventoryStock = getStock(inventoryProduct);
    if (!inventoryProduct || inventoryStock <= 0) {
      return 0;
    }

    const supportedUnits = Math.trunc(inventoryStock / requiredQuantity);
    if (supportedUnits <= 0) {
      return 0;
    }

    if (availableStock === null || supportedUnits < availableStock) {
      availableStock = supportedUnits;
    }
  }

  return availableStock ?? 0;
}

function getVariantAddOnSummary(variant) {
  const addOnLabels = (Array.isArray(variant?.addOns) ? variant.addOns : [])
    .map((addOn) => {
      const addOnName = String(addOn?.name ?? "").trim();
      const addOnQuantity = Math.max(1, Math.trunc(Number(addOn?.quantity ?? 1) || 1));
      if (!addOnName) {
        return "";
      }

      return addOnQuantity > 1 ? `${addOnName} x${addOnQuantity}` : addOnName;
    })
    .filter(Boolean);
  if (!addOnLabels.length) {
    return "";
  }

  return addOnLabels.join(", ");
}

function createVariantStockMetaItem(label, value, itemModifierClass = "", valueTooltip = "") {
  const item = document.createElement("div");
  item.className = "stock-variant-card__meta-item";
  if (itemModifierClass) {
    item.classList.add(itemModifierClass);
  }

  const labelElement = document.createElement("span");
  labelElement.className = "stock-variant-card__meta-label";
  labelElement.textContent = label;

  const valueElement = document.createElement("strong");
  valueElement.className = "stock-variant-card__meta-value";
  valueElement.textContent = value;
  if (valueTooltip) {
    valueElement.dataset.stockTimeTooltip = valueTooltip;
    valueElement.tabIndex = 0;
    valueElement.setAttribute("aria-label", `${value} ${valueTooltip}`);
  }

  item.append(labelElement, valueElement);
  return item;
}

function createVariantStockCard(product, variant, index = 0) {
  const card = document.createElement("article");
  card.className = "stock-variant-card";

  const header = document.createElement("div");
  header.className = "stock-variant-card__header";

  const title = document.createElement("strong");
  title.className = "stock-variant-card__title";
  title.textContent = formatProductVariantLabel(variant, index);

  const stock = getVariantAvailableStock(product, variant);
  const stockState = getStockState(stock);
  const chip = document.createElement("span");
  chip.className = `stock-chip ${stockState.className}`;
  chip.textContent = stockState.label;
  header.append(title, chip);

  const copyParts = [];
  const variantQuantity = String(variant?.quantity ?? "").trim();
  if (variantQuantity) {
    copyParts.push(variantQuantity);
  }

  const addOnSummary = getVariantAddOnSummary(variant);
  if (addOnSummary) {
    copyParts.push(`Add-ons: ${addOnSummary}`);
  }

  const meter = document.createElement("div");
  meter.className = "stock-meter";

  const meterFill = document.createElement("span");
  meterFill.className = `stock-meter__fill ${stockState.className}`;
  const fillWidth = stock <= 0
    ? 0
    : Math.max(8, Math.round((Math.min(stock, STOCK_METER_MAX) / STOCK_METER_MAX) * 100));
  meterFill.style.width = `${Math.min(fillWidth, 100)}%`;
  meter.appendChild(meterFill);

  const stockedDate = getProductStockedDate(product);
  const meta = document.createElement("div");
  meta.className = "stock-variant-card__meta";
  meta.append(
    createVariantStockMetaItem("Stock", formatUnits(stock)),
    createVariantStockMetaItem(
      "Date Stock",
      formatOptionalDate(stockedDate, "Not recorded yet"),
      "stock-variant-card__meta-item--stocked-date",
      formatOptionalTime(stockedDate),
    ),
  );

  card.appendChild(header);

  if (copyParts.length) {
    const copy = document.createElement("p");
    copy.className = "stock-variant-card__copy";
    copy.textContent = copyParts.join(" - ");
    card.appendChild(copy);
  }

  card.appendChild(meter);
  card.appendChild(meta);
  return card;
}

function createVariantStockSection(product) {
  const variants = getProductVariants(product);
  if (!variants.length) {
    return null;
  }

  const section = document.createElement("section");
  section.className = "stock-variant-section";

  const title = document.createElement("p");
  title.className = "stock-variant-section__title";
  title.textContent = "Variants";

  const grid = document.createElement("div");
  grid.className = "stock-variant-grid";
  variants.forEach((variant, index) => {
    grid.appendChild(createVariantStockCard(product, variant, index));
  });

  section.append(title, grid);
  return section;
}

function getStockDisplayBatchRole(product) {
  if (isExpiredStockDisplayEntry(product)) {
    return "expired";
  }

  if (isFreshStockDisplayEntry(product)) {
    return "fresh";
  }

  return "";
}

function getStockDisplayIdentifierForRole(product, role = "") {
  const sourceProduct = getStockSourceProduct(product);
  const baseIdentifier =
    sourceProduct && sourceProduct !== product
      ? getStockProductIdentifier(sourceProduct)
      : getStockProductIdentifier(product);
  return role ? `${baseIdentifier}::${role}` : baseIdentifier;
}

function getSplitStockDisplayConfig(product) {
  const { oldStock, newStock } = getProductStockBreakdown(product);
  if (oldStock <= 0 || newStock <= 0) {
    return null;
  }

  const productStockedDate = String(getProductStockedDate(product) ?? "").trim();
  const lastRestockedDate = String(getProductLastRestockedDate(product) ?? "").trim();
  const oldStockExpiryDate = String(getProductOldStockExpiryDate(product) ?? "").trim();
  const newStockExpiryDate = String(
    getProductNewStockDate(product) ?? getProductExpiryDate(product) ?? "",
  ).trim();
  const oldStockIsExpired = isExpiryDateValueExpired(getProductOldStockExpiryDate(product));
  const newStockIsExpired = isExpiryDateValueExpired(
    getProductNewStockDate(product) ?? getProductExpiryDate(product),
  );
  if (oldStockIsExpired === newStockIsExpired) {
    return null;
  }

  if (oldStockIsExpired) {
    return {
      expired: {
        sourceBatch: "old",
        stock: oldStock,
        expiryDate: oldStockExpiryDate,
        stockedDate: productStockedDate,
        isActive: false,
        label: "Expired Stock",
      },
      fresh: {
        sourceBatch: "new",
        stock: newStock,
        expiryDate: newStockExpiryDate,
        stockedDate: lastRestockedDate || productStockedDate,
        isActive: product?.isActive,
        label: isNewStockProduct(product) ? "New Stock" : "",
      },
    };
  }

  return {
    expired: {
      sourceBatch: "new",
      stock: newStock,
      expiryDate: newStockExpiryDate,
      stockedDate: lastRestockedDate || productStockedDate,
      isActive: false,
      label: "Expired Stock",
    },
      fresh: {
        sourceBatch: "old",
        stock: oldStock,
        expiryDate: oldStockExpiryDate,
        stockedDate: productStockedDate,
        isActive: product?.isActive,
        label: "",
      },
    };
}

function shouldSplitProductIntoStockDisplayCards(product) {
  return Boolean(getSplitStockDisplayConfig(product));
}

function createSplitStockDisplayEntry(product, overrides = {}) {
  const baseProduct = product && typeof product === "object" ? product : {};
  return {
    ...baseProduct,
    ...overrides,
    sourceProduct: baseProduct,
    isSplitStockDisplayEntry: true,
    lastRestockPreviousStock: 0,
    lastRestockPreviousExpiryDate: "",
    lastRestockAddedStock: 0,
    lastRestockExpiryDate: "",
  };
}

function getStockDisplayProducts(products = currentStockProducts) {
  const normalizedProducts = Array.isArray(products) ? products : [];
  return normalizedProducts.flatMap((product) => {
    const splitDisplayConfig = getSplitStockDisplayConfig(product);
    if (!splitDisplayConfig) {
      return [product];
    }

    const productIdentifier = getStockProductIdentifier(product);
    const productModifiedDate = String(getProductModifiedDate(product) ?? "").trim();

    const expiredEntry = createSplitStockDisplayEntry(product, {
      stockDisplayId: `${productIdentifier}::expired`,
      stockDisplayRole: "expired",
      stockDisplayLabel: splitDisplayConfig.expired.label,
      stockDisplaySourceBatch: splitDisplayConfig.expired.sourceBatch,
      stockDisplaySortOrder: 1,
      stock: splitDisplayConfig.expired.stock,
      expiryDate: splitDisplayConfig.expired.expiryDate,
      stockedDate: splitDisplayConfig.expired.stockedDate,
      isActive: false,
      updatedAt: productModifiedDate,
    });

    const freshEntry = createSplitStockDisplayEntry(product, {
      stockDisplayId: `${productIdentifier}::fresh`,
      stockDisplayRole: "fresh",
      stockDisplayLabel: splitDisplayConfig.fresh.label,
      stockDisplaySourceBatch: splitDisplayConfig.fresh.sourceBatch,
      stockDisplaySortOrder: 0,
      stock: splitDisplayConfig.fresh.stock,
      expiryDate: splitDisplayConfig.fresh.expiryDate,
      stockedDate: splitDisplayConfig.fresh.stockedDate,
      isActive: product?.isActive,
      updatedAt: productModifiedDate,
    });

    return [freshEntry, expiredEntry];
  });
}

function padStockDatePart(value) {
  return String(value).padStart(2, "0");
}

function getFormatterPartMap(formatter, date) {
  const partMap = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type === "literal") {
      continue;
    }

    partMap[part.type] = part.value;
  }

  return partMap;
}

function getStockTimeZoneDatePartsFromDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return null;
  }

  const partMap = getFormatterPartMap(stockTimeZoneDateFormatter, date);
  return {
    year: Number(partMap.year),
    month: Number(partMap.month),
    day: Number(partMap.day),
  };
}

function getStockTimeZoneDateTimePartsFromDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return null;
  }

  const partMap = getFormatterPartMap(stockTimeZoneDateTimeFormatter, date);
  return {
    year: Number(partMap.year),
    month: Number(partMap.month),
    day: Number(partMap.day),
    hour: Number(partMap.hour),
    minute: Number(partMap.minute),
  };
}

function parseStockDateTimeValue(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : new Date(value.getTime());
  }

  const trimmedValue = String(value ?? "").trim();
  if (!trimmedValue) {
    return null;
  }

  const localDateMatch = trimmedValue.match(STOCK_LOCAL_DATE_TIME_PATTERN);
  if (localDateMatch) {
    const [
      ,
      year,
      month,
      day,
      hour = "00",
      minute = "00",
      second = "00",
    ] = localDateMatch;
    const utcTimestamp = Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute) - STOCK_TIME_ZONE_OFFSET_MINUTES,
      Number(second),
    );
    return new Date(utcTimestamp);
  }

  const parsedDate = new Date(trimmedValue);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function getStockTimeZoneDateParts(value) {
  const trimmedValue = String(value ?? "").trim();
  if (!trimmedValue) {
    return null;
  }

  const localDateMatch = trimmedValue.match(STOCK_LOCAL_DATE_TIME_PATTERN);
  if (localDateMatch) {
    return {
      year: Number(localDateMatch[1]),
      month: Number(localDateMatch[2]),
      day: Number(localDateMatch[3]),
    };
  }

  return getStockTimeZoneDatePartsFromDate(parseStockDateTimeValue(trimmedValue));
}

function getStockTimeZoneDateTimeParts(value) {
  const trimmedValue = String(value ?? "").trim();
  if (!trimmedValue) {
    return null;
  }

  const localDateMatch = trimmedValue.match(STOCK_LOCAL_DATE_TIME_PATTERN);
  if (localDateMatch) {
    return {
      year: Number(localDateMatch[1]),
      month: Number(localDateMatch[2]),
      day: Number(localDateMatch[3]),
      hour: Number(localDateMatch[4] ?? "00"),
      minute: Number(localDateMatch[5] ?? "00"),
    };
  }

  return getStockTimeZoneDateTimePartsFromDate(parseStockDateTimeValue(trimmedValue));
}

function formatOptionalDateTime(value, fallback = "Not recorded yet") {
  if (value === null || value === undefined) {
    return fallback;
  }

  const trimmedValue = String(value).trim();
  if (!trimmedValue) {
    return fallback;
  }

  const parsedDate = parseStockDateTimeValue(trimmedValue);
  if (!(parsedDate instanceof Date) || Number.isNaN(parsedDate.getTime())) {
    return fallback;
  }

  return stockDateTimeDisplayFormatter.format(parsedDate);
}

function formatOptionalDateTimeWithSeconds(value, fallback = "Not recorded yet") {
  if (value === null || value === undefined) {
    return fallback;
  }

  const trimmedValue = String(value).trim();
  if (!trimmedValue) {
    return fallback;
  }

  const parsedDate = parseStockDateTimeValue(trimmedValue);
  if (!(parsedDate instanceof Date) || Number.isNaN(parsedDate.getTime())) {
    return fallback;
  }

  return stockDateTimeDisplayWithSecondsFormatter.format(parsedDate);
}

function formatOptionalDate(value, fallback = "Not recorded yet") {
  if (value === null || value === undefined) {
    return fallback;
  }

  const trimmedValue = String(value).trim();
  if (!trimmedValue) {
    return fallback;
  }

  const parsedDate = parseStockDateTimeValue(trimmedValue);
  if (!(parsedDate instanceof Date) || Number.isNaN(parsedDate.getTime())) {
    return fallback;
  }

  return stockDateDisplayFormatter.format(parsedDate);
}

function formatOptionalTime(value, fallback = "") {
  if (value === null || value === undefined) {
    return fallback;
  }

  const trimmedValue = String(value).trim();
  if (!trimmedValue) {
    return fallback;
  }

  if (!(value instanceof Date) && !/(?:T|\s)\d{1,2}:\d{2}/.test(trimmedValue)) {
    return fallback;
  }

  const parsedDate = parseStockDateTimeValue(trimmedValue);
  if (!(parsedDate instanceof Date) || Number.isNaN(parsedDate.getTime())) {
    return fallback;
  }

  return stockTimeDisplayFormatter.format(parsedDate);
}

function formatExpiryDateDisplay(value, fallback = "Not recorded yet") {
  return formatOptionalDate(value, fallback);
}

function getStandaloneProductEditorUrl(productId = "") {
  const normalizedProductId = String(productId ?? "").trim();
  return normalizedProductId
    ? `/edit_products.html?edit=${encodeURIComponent(normalizedProductId)}`
    : "/edit_products.html";
}

function formatDateTimeLocalValue(value) {
  if (value === null || value === undefined) {
    return "";
  }

  const trimmedValue = String(value).trim();
  if (!trimmedValue) {
    return "";
  }

  const dateTimeParts = getStockTimeZoneDateTimeParts(trimmedValue);
  if (!dateTimeParts) {
    return "";
  }

  return [
    dateTimeParts.year,
    padStockDatePart(dateTimeParts.month),
    padStockDatePart(dateTimeParts.day),
  ].join("-") + `T${padStockDatePart(dateTimeParts.hour)}:${padStockDatePart(dateTimeParts.minute)}`;
}

function formatDateTimeLocalFromDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "";
  }

  return [
    date.getFullYear(),
    padStockDatePart(date.getMonth() + 1),
    padStockDatePart(date.getDate()),
  ].join("-") + `T${padStockDatePart(date.getHours())}:${padStockDatePart(date.getMinutes())}`;
}

function normalizeExpiryDateInputValue(value) {
  const trimmedValue = String(value ?? "").trim();
  if (!trimmedValue) {
    return "";
  }

  const parsedDate = parseStockDateTimeValue(trimmedValue);
  return !(parsedDate instanceof Date) || Number.isNaN(parsedDate.getTime())
    ? ""
    : parsedDate.toISOString();
}

function formatCalendarMonthYear(date) {
  return new Intl.DateTimeFormat("en-PH", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function buildCalendarGridDates(viewDate) {
  const monthStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const weekStartOffset = (monthStart.getDay() + 6) % 7;
  const monthEnd = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
  const daysInMonth = monthEnd.getDate();
  const totalVisibleCells = weekStartOffset + daysInMonth;
  const trailingPlaceholderCount = (7 - (totalVisibleCells % 7)) % 7;
  const calendarCells = [];

  for (let index = 0; index < weekStartOffset; index += 1) {
    calendarCells.push(null);
  }

  for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber += 1) {
    calendarCells.push(new Date(viewDate.getFullYear(), viewDate.getMonth(), dayNumber));
  }

  for (let index = 0; index < trailingPlaceholderCount; index += 1) {
    calendarCells.push(null);
  }

  return calendarCells;
}

function isSameCalendarDay(left, right) {
  if (!(left instanceof Date) || !(right instanceof Date)) {
    return false;
  }

  return (
    left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate()
  );
}

function getStockProductIdentifier(product) {
  const splitDisplayId = String(product?.stockDisplayId ?? "").trim();
  if (splitDisplayId) {
    return splitDisplayId;
  }

  const explicitId = String(product?.id ?? "").trim();
  if (explicitId) {
    return explicitId;
  }

  return [
    product?.name,
    product?.category,
    product?.createdAt,
  ]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)
    .join("::");
}

function getProductStockedDate(product) {
  return (
    product?.stockedDate ??
    product?.stockDate ??
    product?.dateStocked ??
    product?.createdAt ??
    ""
  );

  return parts.join(" • ");
}

function getProductStockedTimestamp(product) {
  const stockedDate = String(getProductStockedDate(product) ?? "").trim();
  if (!stockedDate) {
    return NaN;
  }

  const parsedDate = parseStockDateTimeValue(stockedDate);
  return parsedDate instanceof Date && !Number.isNaN(parsedDate.getTime())
    ? parsedDate.getTime()
    : NaN;
}

function getProductLastRestockedDate(product) {
  return (
    product?.lastRestockedAt ??
    product?.restockedAt ??
    product?.stockAddedAt ??
    ""
  );
}

function getProductLastRestockedTimestamp(product) {
  const restockedDate = String(getProductLastRestockedDate(product) ?? "").trim();
  if (!restockedDate) {
    return NaN;
  }

  const parsedDate = parseStockDateTimeValue(restockedDate);
  return parsedDate instanceof Date && !Number.isNaN(parsedDate.getTime())
    ? parsedDate.getTime()
    : NaN;
}

function hasInitialAddProductStockHistoryRecord(product) {
  const rawRecords = Array.isArray(product?.stockHistory)
    ? product.stockHistory
    : Array.isArray(product?.stockRecords)
      ? product.stockRecords
      : [];

  return rawRecords.some((record) => isInitialAddProductStockHistoryRecord(record, product));
}

function getProductNewStockTimestamp(product) {
  const restockedTimestamp = getProductLastRestockedTimestamp(product);
  if (Number.isFinite(restockedTimestamp)) {
    return restockedTimestamp;
  }

  if (!hasInitialAddProductStockHistoryRecord(product)) {
    return NaN;
  }

  const stockedTimestamp = getProductStockedTimestamp(product);
  if (Number.isFinite(stockedTimestamp)) {
    return stockedTimestamp;
  }

  return getProductCreatedTimestamp(product);
}

function isNewStockProduct(product) {
  if (getProductNewStockCount(product) <= 0 && !hasInitialAddProductStockHistoryRecord(product)) {
    return false;
  }

  const newStockTimestamp = getProductNewStockTimestamp(product);
  if (!Number.isFinite(newStockTimestamp)) {
    return false;
  }

  const ageInMs = Date.now() - newStockTimestamp;
  return ageInMs >= 0 && ageInMs <= STOCK_NEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;
}

function getProductExpiryDate(product) {
  return (
    product?.expiryDate ??
    product?.expirationDate ??
    product?.expiredDate ??
    product?.expireDate ??
    product?.bestBeforeDate ??
    product?.bestBefore ??
    ""
  );
}

function getProductExpiryTimestamp(product) {
  const expiryDate = String(getProductExpiryDate(product) ?? "").trim();
  if (!expiryDate) {
    return NaN;
  }

  const parsedDate = parseStockDateTimeValue(expiryDate);
  return parsedDate instanceof Date && !Number.isNaN(parsedDate.getTime())
    ? parsedDate.getTime()
    : NaN;
}

function getLocalDateStartTimestamp(value) {
  const dateParts = getStockTimeZoneDateParts(value);
  if (!dateParts) {
    return NaN;
  }

  return Date.UTC(dateParts.year, dateParts.month - 1, dateParts.day);
}

function getTodayStartTimestamp() {
  const todayParts = getStockTimeZoneDatePartsFromDate(new Date());
  if (!todayParts) {
    return NaN;
  }

  return Date.UTC(todayParts.year, todayParts.month - 1, todayParts.day);
}

function getProductExpiryDayStartTimestamp(product) {
  return getLocalDateStartTimestamp(getProductExpiryDate(product));
}

function isExpiredProduct(product) {
  if (getStock(product) <= 0) {
    return false;
  }

  const expiryDayStartTimestamp = getProductExpiryDayStartTimestamp(product);
  if (!Number.isFinite(expiryDayStartTimestamp)) {
    return false;
  }

  return expiryDayStartTimestamp < getTodayStartTimestamp();
}

function isNearExpiryProduct(product) {
  if (getStock(product) <= 0 || isExpiredProduct(product)) {
    return false;
  }

  const expiryDayStartTimestamp = getProductExpiryDayStartTimestamp(product);
  if (!Number.isFinite(expiryDayStartTimestamp)) {
    return false;
  }

  const timeUntilExpiry = expiryDayStartTimestamp - getTodayStartTimestamp();
  return timeUntilExpiry >= 0 && timeUntilExpiry <= STOCK_NEAR_EXPIRY_WINDOW_DAYS * 24 * 60 * 60 * 1000;
}

function getProductLastOutOfStockDate(product) {
  return (
    product?.lastOutOfStockAt ??
    product?.lastOutOfStockDate ??
    product?.outOfStockAt ??
    product?.outOfStockDate ??
    ""
  );
}

function formatProductLastOutOfStock(product) {
  const lastOutOfStockDate = String(getProductLastOutOfStockDate(product) ?? "").trim();
  if (lastOutOfStockDate) {
    return formatOptionalDateTime(lastOutOfStockDate, "Not recorded yet");
  }

  return formatOptionalDateTime(getProductStockedDate(product), "Not recorded yet");
}

function getProductStockedDateLabel(product) {
  return getStock(product) <= 0 ? "Last date stock" : "Date stocked";
}

function getProductModifiedDate(product) {
  const candidates = [
    product?.updatedAt,
    product?.modifiedAt,
    product?.lastModifiedAt,
    getProductLastRestockedDate(product),
    getProductLastOutOfStockDate(product),
    getProductStockedDate(product),
    product?.createdAt,
  ];

  return candidates
    .map((value) => String(value ?? "").trim())
    .find(Boolean) ?? "";
}

function normalizeStockHistoryLabel(value, fallback = "Saved Stock") {
  const normalizedValue = String(value ?? fallback ?? "").replace(/\s+/g, " ").trim();
  return normalizedValue || fallback;
}

function isExpiryEditStockHistoryLabel(value) {
  const normalizedValue = normalizeStockHistoryLabel(value, "");
  return /^(?:edit expiry date|updated(?: (?:fresh|new|expired) stock)? expiry)$/i.test(
    normalizedValue,
  );
}

function getStockHistoryDisplayLabel(value, fallback = "Saved Stock") {
  const normalizedValue = normalizeStockHistoryLabel(value, fallback);
  return isExpiryEditStockHistoryLabel(normalizedValue)
    ? "Edit Expiry Date"
    : normalizedValue;
}

function normalizeStockHistoryBatchRole(value) {
  const normalizedValue = String(value ?? "").trim().toLowerCase();
  return normalizedValue === "expired" || normalizedValue === "fresh"
    ? normalizedValue
    : "";
}

function extractStockDeductReasonFromLabel(label) {
  const normalizedLabel = String(label ?? "").trim();
  if (!/^deducted\s*:/i.test(normalizedLabel)) {
    return "";
  }

  return normalizeStockDeductReasonDetail(normalizedLabel.replace(/^deducted\s*:/i, ""));
}

function getStockRecordLabelClassName(label) {
  const normalizedLabel = String(label ?? "").trim().toLowerCase();
  if (!normalizedLabel) {
    return "";
  }

  if (normalizedLabel === "new stock") {
    return "stock-detail-table__label--new";
  }

  if (normalizedLabel === "old stock") {
    return "stock-detail-table__label--old";
  }

  return "";
}

function getStockRecordAdjustmentClassName(value) {
  const normalizedValue = String(value ?? "").trim();
  return normalizedValue.startsWith("-")
    ? "stock-detail-table__adjustment--deducted"
    : "";
}

function getProductCreatedTimestamp(product) {
  const createdAt = String(product?.createdAt ?? "").trim();
  if (!createdAt) {
    return NaN;
  }

  const parsedDate = parseStockDateTimeValue(createdAt);
  return parsedDate instanceof Date && !Number.isNaN(parsedDate.getTime())
    ? parsedDate.getTime()
    : NaN;
}

function isInitialAddProductStockHistoryRecord(record, product) {
  const normalizedLabel = normalizeStockHistoryLabel(record?.label, "");
  if (!/^(?:added|new) stock$/i.test(normalizedLabel)) {
    return false;
  }

  const stock = Number(record?.stock ?? 0);
  const addedQuantity = Number(record?.addedQuantity ?? 0);
  const deductedQuantity = Number(record?.deductedQuantity ?? 0);
  if (!(Number.isFinite(stock) && stock >= 0)) {
    return false;
  }

  if (!(Number.isFinite(addedQuantity) && addedQuantity > 0)) {
    return false;
  }

  if (Number.isFinite(deductedQuantity) && deductedQuantity > 0) {
    return false;
  }

  if (Math.trunc(stock) !== Math.trunc(addedQuantity)) {
    return false;
  }

  const modifiedAt = String(
    record?.modifiedAt ??
      record?.updatedAt ??
      record?.timestamp ??
      "",
  ).trim();
  if (!modifiedAt) {
    return false;
  }

  const parsedModifiedAt = parseStockDateTimeValue(modifiedAt);
  if (!(parsedModifiedAt instanceof Date) || Number.isNaN(parsedModifiedAt.getTime())) {
    return false;
  }

  const modifiedTimestamp = parsedModifiedAt.getTime();
  const comparableTimestamps = [
    getProductCreatedTimestamp(product),
    getProductStockedTimestamp(product),
  ].filter((timestamp) => Number.isFinite(timestamp));

  return comparableTimestamps.some(
    (timestamp) => Math.abs(timestamp - modifiedTimestamp) <= 5000,
  );
}

function getProductStockHistoryRecords(product) {
  const rawRecords = Array.isArray(product?.stockHistory)
    ? product.stockHistory
    : Array.isArray(product?.stockRecords)
      ? product.stockRecords
      : [];

  return rawRecords
    .map((record, index) => {
      if (!record || typeof record !== "object") {
        return null;
      }

      const modifiedAt = String(
        record?.modifiedAt ??
          record?.updatedAt ??
          record?.timestamp ??
          record?.savedAt ??
          "",
      ).trim();
      const stock = Number(record?.stock ?? record?.stocks ?? record?.stockAfter ?? 0);
      const addedQuantity = Number(
        record?.addedQuantity ??
          record?.addedStock ??
          record?.add ??
          0,
      );
      const deductedQuantity = Number(
        record?.deductedQuantity ??
          record?.deductedStock ??
          record?.deduct ??
          0,
      );
      const expiryDate = String(
        record?.expiryDate ??
          record?.expireDate ??
          record?.expirationDate ??
          "",
      ).trim();
      const normalizedLabel = normalizeStockHistoryLabel(
        record?.label,
        addedQuantity > 0
          ? "Added Stock"
          : deductedQuantity > 0
            ? "Deducted Stock"
            : "Saved Stock",
      );
      const label = isInitialAddProductStockHistoryRecord(
        {
          label: normalizedLabel,
          stock,
          addedQuantity,
          deductedQuantity,
          modifiedAt,
        },
        product,
      )
        ? "New Stock"
        : normalizedLabel;
      const batchRole = normalizeStockHistoryBatchRole(
        record?.batchRole ??
          record?.stockBatchRole ??
          record?.batch,
      );
      const deductReason = normalizeStockDeductReasonDetail(
        record?.reason ??
          record?.deductReason ??
          extractStockDeductReasonFromLabel(label),
      );
      const sortTimestamp = modifiedAt ? Date.parse(modifiedAt) : NaN;

      return {
        id: String(record?.id ?? `stock-history-${index + 1}`).trim() || `stock-history-${index + 1}`,
        stock: Number.isFinite(stock) && stock >= 0 ? Math.trunc(stock) : 0,
        addedQuantity:
          Number.isFinite(addedQuantity) && addedQuantity >= 0 ? Math.trunc(addedQuantity) : 0,
        deductedQuantity:
          Number.isFinite(deductedQuantity) && deductedQuantity >= 0 ? Math.trunc(deductedQuantity) : 0,
        expiryDate,
        modifiedAt,
        label,
        batchRole,
        deductReason,
        sortTimestamp,
      };
    })
    .filter(Boolean)
    .sort((left, right) => {
      const leftTimestamp = Number.isFinite(left?.sortTimestamp) ? left.sortTimestamp : 0;
      const rightTimestamp = Number.isFinite(right?.sortTimestamp) ? right.sortTimestamp : 0;
      return rightTimestamp - leftTimestamp;
    });
}

function createStockHistoryPayloadRecord(record) {
  if (!record || typeof record !== "object") {
    return null;
  }

  const normalizedId = String(record?.id ?? "").trim();
  const normalizedReason = normalizeStockDeductReasonDetail(
    record?.deductReason ?? record?.reason,
  );
  return {
    ...(normalizedId ? { id: normalizedId } : {}),
    stock: Number.isFinite(Number(record?.stock)) && Number(record.stock) >= 0
      ? Math.trunc(Number(record.stock))
      : 0,
    addedQuantity:
      Number.isFinite(Number(record?.addedQuantity)) && Number(record.addedQuantity) >= 0
        ? Math.trunc(Number(record.addedQuantity))
        : 0,
    deductedQuantity:
      Number.isFinite(Number(record?.deductedQuantity)) && Number(record.deductedQuantity) >= 0
        ? Math.trunc(Number(record.deductedQuantity))
        : 0,
    expiryDate: String(record?.expiryDate ?? "").trim(),
    modifiedAt: String(record?.modifiedAt ?? "").trim(),
    reason: normalizedReason,
    label: normalizeStockHistoryLabel(record?.label),
    ...(normalizeStockHistoryBatchRole(record?.batchRole)
      ? { batchRole: normalizeStockHistoryBatchRole(record.batchRole) }
      : {}),
  };
}

function createStockHistoryRecordId(modifiedAt = "") {
  const parsedTimestamp = Date.parse(modifiedAt);
  const timestamp = Number.isFinite(parsedTimestamp) ? parsedTimestamp : Date.now();
  const randomPart =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().split("-")[0]
      : Math.random().toString(36).slice(2, 8);
  return `stock-history-${timestamp}-${randomPart}`;
}

async function deleteStockHistoryRecord(
  productId,
  recordId,
  actionElement = null,
  recordLabelOverride = "",
) {
  const normalizedProductId = String(productId ?? "").trim();
  const normalizedRecordId = String(recordId ?? "").trim();
  if (!normalizedProductId || !normalizedRecordId) {
    return false;
  }

  const product = currentStockProducts.find(
    (candidate) => String(candidate?.id ?? "").trim() === normalizedProductId,
  );
  if (!product) {
    return false;
  }

  const stockHistoryRecords = getProductStockHistoryRecords(product);
  const targetRecord = stockHistoryRecords.find(
    (record) => String(record?.id ?? "").trim() === normalizedRecordId,
  );
  if (!targetRecord) {
    return false;
  }
  const deletedRecordLabel = String(recordLabelOverride ?? "").trim()
    || normalizeStockHistoryLabel(targetRecord?.label, "Stock Record");

  const nextStockHistory = stockHistoryRecords
    .filter((record) => String(record?.id ?? "").trim() !== normalizedRecordId)
    .map(createStockHistoryPayloadRecord)
    .filter(Boolean);

  try {
    actionElement?.classList.add("is-saving");
    if ("disabled" in (actionElement ?? {})) {
      actionElement.disabled = true;
    }

    const response = await fetch(`/api/products/${encodeURIComponent(normalizedProductId)}`, {
      method: "PUT",
      headers: withStockAdminScopeHeaders({
        "Content-Type": "application/json",
      }),
      body: JSON.stringify(withStockAdminScopePayload({
        ...product,
        stockHistory: nextStockHistory,
        replaceStockHistory: true,
        __activityContext: "inventory",
        __activityTarget: "card",
        __activityInventoryChangeCount: 2,
        __activityDisplayStockProductId: getStockProductIdentifier(product),
        __activityActor: getStockActivityActor(),
      })),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.message || "Unable to delete stock record.");
    }

    const updatedProduct = {
      ...product,
      ...(data?.product ?? {}),
      stockHistory: nextStockHistory,
    };
    const updatedProductIdentifier = getStockProductIdentifier(updatedProduct);

    currentStockProducts = currentStockProducts.map((candidate) =>
      String(candidate?.id ?? "").trim() === normalizedProductId
        ? updatedProduct
        : candidate,
    );

    if (editingStockProductId === updatedProductIdentifier) {
      editingStockProductId = "";
      removeStockEditModalOverlay();
    }

    selectedStockProductId = updatedProductIdentifier;
    renderStockDashboard(currentStockProducts);
    broadcastStockProductsUpdated();
    openStockSuccessModal(`Deleted "${deletedRecordLabel}" successfully.`, {
      hideAction: true,
      hideClose: true,
      allowOverlayClose: false,
      autoCloseMs: 2000,
      playDeleteSound: true,
    });
    return true;
  } catch (error) {
    console.error(error);
    window.alert(
      error instanceof Error ? error.message : "Unable to delete stock record.",
    );
    return false;
  } finally {
    actionElement?.classList.remove("is-saving");
    if ("disabled" in (actionElement ?? {})) {
      actionElement.disabled = false;
    }
  }
}

function isStockProductEditing(product) {
  return getStockProductIdentifier(product) === editingStockProductId;
}

function getCurrentEditingStockProduct(products = currentStockProducts) {
  return (Array.isArray(products) ? products : []).find(
    (product) => getStockProductIdentifier(product) === editingStockProductId,
  ) ?? null;
}

function clearStockEditModalClockInterval() {
  if (stockEditModalClockIntervalId) {
    window.clearInterval(stockEditModalClockIntervalId);
    stockEditModalClockIntervalId = 0;
  }
}

function ensureStockDeleteConfirmationModal() {
  if (stockDeleteModalElements) {
    return stockDeleteModalElements;
  }

  const overlay = document.createElement("div");
  overlay.className = "validation-modal-overlay stock-delete-modal-overlay";
  overlay.hidden = true;
  overlay.innerHTML = `
    <section
      class="validation-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="stock-delete-modal-title"
    >
      <button
        type="button"
        class="product-gallery-modal__close validation-modal__close"
        data-stock-delete-modal-close
        aria-label="Close delete modal"
        title="Close delete modal"
      >
        <i class="fa-solid fa-xmark" aria-hidden="true"></i>
      </button>
      <div class="validation-modal__top">
        <div
          class="validation-modal__icon validation-modal__icon--error validation-modal__icon--delete"
          aria-hidden="true"
          role="presentation"
          tabindex="-1"
        >
          <i class="fa-solid fa-trash-can" aria-hidden="true"></i>
        </div>
      </div>
      <div class="validation-modal__body">
        <h2 class="validation-modal__title" id="stock-delete-modal-title">Opps!</h2>
        <p class="validation-modal__copy" data-stock-delete-modal-copy></p>
        <div class="validation-modal__actions">
          <button
            type="button"
            class="ghost-button validation-modal__action-button validation-modal__action-button--secondary"
            data-stock-delete-modal-secondary
          >
            Cancel
          </button>
          <button
            type="button"
            class="validation-modal__action-button"
            data-stock-delete-modal-action
          >
            Continue
          </button>
        </div>
      </div>
    </section>
  `;

  document.body.appendChild(overlay);

  const closeButton = overlay.querySelector("[data-stock-delete-modal-close]");
  const copy = overlay.querySelector("[data-stock-delete-modal-copy]");
  const secondaryButton = overlay.querySelector("[data-stock-delete-modal-secondary]");
  const actionButton = overlay.querySelector("[data-stock-delete-modal-action]");

  stockDeleteModalElements = {
    overlay,
    closeButton,
    copy,
    secondaryButton,
    actionButton,
    onAction: null,
    onSecondaryAction: null,
    allowOverlayClose: false,
  };

  if (closeButton instanceof HTMLButtonElement) {
    closeButton.addEventListener("click", () => {
      closeStockDeleteConfirmationModal();
    });
  }

  if (actionButton instanceof HTMLButtonElement) {
    actionButton.addEventListener("click", () => {
      if (typeof stockDeleteModalElements?.onAction === "function") {
        const handled = stockDeleteModalElements.onAction();
        if (handled === true) {
          return;
        }
      }
      closeStockDeleteConfirmationModal();
    });
  }

  if (secondaryButton instanceof HTMLButtonElement) {
    secondaryButton.addEventListener("click", () => {
      if (typeof stockDeleteModalElements?.onSecondaryAction === "function") {
        const handled = stockDeleteModalElements.onSecondaryAction();
        if (handled === true) {
          return;
        }
      }
      closeStockDeleteConfirmationModal();
    });
  }

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay && stockDeleteModalElements?.allowOverlayClose !== false) {
      closeStockDeleteConfirmationModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && stockDeleteModalElements && !stockDeleteModalElements.overlay.hidden) {
      event.preventDefault();
      closeStockDeleteConfirmationModal();
    }
  });

  window.WebTheme?.applyFontAwesomeIcons?.(overlay);

  return stockDeleteModalElements;
}

function hideStockValidationOverlay(overlay, callback) {
  if (!(overlay instanceof HTMLElement)) {
    if (typeof callback === "function") {
      callback();
    }
    return;
  }

  overlay.classList.remove("is-open");

  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) {
      return;
    }

    cleanedUp = true;
    overlay.hidden = true;
    overlay.removeEventListener("transitionend", handleTransitionEnd);
    window.clearTimeout(exitTimer);

    if (typeof callback === "function") {
      callback();
    }
  };

  const handleTransitionEnd = (event) => {
    if (event.target !== overlay) {
      return;
    }
    cleanup();
  };

  overlay.addEventListener("transitionend", handleTransitionEnd);
  const exitTimer = window.setTimeout(cleanup, 300);
}

function closeStockDeleteConfirmationModal(onClosed = null) {
  if (!stockDeleteModalElements) {
    return;
  }

  hideStockValidationOverlay(stockDeleteModalElements.overlay, () => {
    stockDeleteModalElements.onAction = null;
    stockDeleteModalElements.onSecondaryAction = null;
    stockDeleteModalElements.allowOverlayClose = false;
    syncStockModalOpenClass();

    if (typeof onClosed === "function") {
      onClosed();
    }
  });
}

function clearStockSuccessAutoCloseTimer() {
  if (stockSuccessAutoCloseTimer) {
    window.clearTimeout(stockSuccessAutoCloseTimer);
    stockSuccessAutoCloseTimer = 0;
  }
}

function ensureStockSuccessLottiePlayer() {
  if (window.lottie?.loadAnimation) {
    return Promise.resolve(true);
  }

  if (stockSuccessLottieLoadPromise) {
    return stockSuccessLottieLoadPromise;
  }

  stockSuccessLottieLoadPromise = new Promise((resolve) => {
    const existingScript = document.querySelector(
      `script[src$="${STOCK_SUCCESS_LOTTIE_PLAYER_URL}"], script[src*="${STOCK_SUCCESS_LOTTIE_PLAYER_URL}?"]`,
    );
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(Boolean(window.lottie?.loadAnimation)), { once: true });
      existingScript.addEventListener("error", () => resolve(false), { once: true });
      if (window.lottie?.loadAnimation) {
        resolve(true);
      }
      return;
    }

    const scriptElement = document.createElement("script");
    scriptElement.src = STOCK_SUCCESS_LOTTIE_PLAYER_URL;
    scriptElement.async = true;
    scriptElement.addEventListener("load", () => resolve(Boolean(window.lottie?.loadAnimation)), { once: true });
    scriptElement.addEventListener("error", () => resolve(false), { once: true });
    document.head.appendChild(scriptElement);
  });

  return stockSuccessLottieLoadPromise;
}

function destroyStockSuccessAnimation() {
  if (stockSuccessAnimation?.destroy) {
    stockSuccessAnimation.destroy();
  }
  stockSuccessAnimation = null;
}

async function playStockSuccessAnimation() {
  const container = stockSuccessModalElements?.icon?.querySelector("[data-stock-success-lottie-check]");
  if (!(container instanceof HTMLElement)) {
    return;
  }

  destroyStockSuccessAnimation();
  container.innerHTML = "";

  const canUseLottie = await ensureStockSuccessLottiePlayer();
  if (
    !canUseLottie
    || !window.lottie?.loadAnimation
    || !container.isConnected
    || stockSuccessModalElements?.overlay?.hidden
  ) {
    return;
  }

  stockSuccessAnimation = window.lottie.loadAnimation({
    container,
    renderer: "svg",
    loop: false,
    autoplay: true,
    path: STOCK_SUCCESS_ANIMATION_PATH,
  });
}

function getStockDeleteSuccessAudio() {
  if (typeof Audio !== "function") {
    return null;
  }

  if (!stockDeleteSuccessAudio) {
    stockDeleteSuccessAudio = new Audio(STOCK_DELETE_SUCCESS_AUDIO_URL);
    stockDeleteSuccessAudio.preload = "auto";
  }

  return stockDeleteSuccessAudio;
}

function prepareStockDeleteSuccessAudio() {
  const audio = getStockDeleteSuccessAudio();
  if (audio?.load) {
    audio.load();
  }
}

function playStockDeleteSuccessAudio() {
  const audio = getStockDeleteSuccessAudio();
  if (!audio) {
    return;
  }

  try {
    audio.pause();
    audio.currentTime = 0;
    const playResult = audio.play();
    if (playResult?.catch) {
      playResult.catch((error) => {
        console.warn("Unable to play delete success audio.", error);
      });
    }
  } catch (error) {
    console.warn("Unable to play delete success audio.", error);
  }
}

function ensureStockSuccessModal() {
  if (stockSuccessModalElements) {
    return stockSuccessModalElements;
  }

  const overlay = document.createElement("div");
  overlay.className = "validation-modal-overlay stock-success-modal-overlay";
  overlay.hidden = true;
  overlay.innerHTML = `
    <section
      class="validation-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="stock-success-modal-title"
    >
      <button
        type="button"
        class="product-gallery-modal__close validation-modal__close"
        data-stock-success-modal-close
        aria-label="Close success modal"
        title="Close success modal"
      >
        <i class="fa-solid fa-xmark" aria-hidden="true"></i>
      </button>
      <div class="validation-modal__top">
        <div
          class="validation-modal__icon validation-modal__icon--success"
          aria-hidden="true"
          role="presentation"
          tabindex="-1"
        >
          <div class="product-validation-lottie-check" data-stock-success-lottie-check></div>
        </div>
      </div>
      <div class="validation-modal__body">
        <h2 class="validation-modal__title" id="stock-success-modal-title">Success</h2>
        <p class="validation-modal__copy" data-stock-success-modal-copy></p>
      </div>
    </section>
  `;

  document.body.appendChild(overlay);

  const closeButton = overlay.querySelector("[data-stock-success-modal-close]");
  const icon = overlay.querySelector(".validation-modal__icon");
  const copy = overlay.querySelector("[data-stock-success-modal-copy]");
  const actions = overlay.querySelector(".validation-modal__actions");
  const actionButton = overlay.querySelector("[data-stock-success-modal-action]");

  stockSuccessModalElements = {
    overlay,
    closeButton,
    icon,
    copy,
    actions,
    actionButton,
    allowOverlayClose: true,
  };

  function closeModal() {
    closeStockSuccessModal();
  }

  if (closeButton instanceof HTMLButtonElement) {
    closeButton.addEventListener("click", closeModal);
  }

  if (actionButton instanceof HTMLButtonElement) {
    actionButton.addEventListener("click", closeModal);
  }

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay && stockSuccessModalElements?.allowOverlayClose !== false) {
      closeModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape"
      && stockSuccessModalElements
      && !stockSuccessModalElements.overlay.hidden
      && stockSuccessModalElements.allowOverlayClose !== false
    ) {
      event.preventDefault();
      closeModal();
    }
  });

  window.WebTheme?.applyFontAwesomeIcons?.(overlay);

  return stockSuccessModalElements;
}

function closeStockSuccessModal() {
  if (!stockSuccessModalElements) {
    return;
  }

  clearStockSuccessAutoCloseTimer();
  destroyStockSuccessAnimation();
  hideStockValidationOverlay(stockSuccessModalElements.overlay, () => {
    stockSuccessModalElements.allowOverlayClose = true;
    syncStockModalOpenClass();
  });
}

function openStockSuccessModal(copy = "Stock changes saved successfully.", options = {}) {
  const modal = ensureStockSuccessModal();
  if (!modal) {
    return;
  }
  const modalOptions = options && typeof options === "object" ? options : {};

  clearStockSuccessAutoCloseTimer();
  destroyStockSuccessAnimation();

  modal.copy.textContent = String(copy ?? "").trim() || "Stock changes saved successfully.";
  modal.allowOverlayClose = modalOptions.allowOverlayClose !== false;
  const hideClose = modalOptions.hideClose ?? true;
  const hideAction = modalOptions.hideAction ?? true;
  if (modal.closeButton instanceof HTMLButtonElement) {
    modal.closeButton.hidden = hideClose === true;
  }
  if (modal.actions instanceof HTMLElement) {
    modal.actions.hidden = hideAction === true;
  }
  if (modal.actionButton instanceof HTMLButtonElement) {
    modal.actionButton.hidden = hideAction === true;
  }
  modal.overlay.hidden = false;
  if (modalOptions.playDeleteSound === true) {
    playStockDeleteSuccessAudio();
  }
  void playStockSuccessAnimation();
  window.requestAnimationFrame(() => {
    modal.overlay.classList.add("is-open");
  });
  syncStockModalOpenClass();

  const normalizedAutoCloseMs = Number(
    Object.prototype.hasOwnProperty.call(modalOptions, "autoCloseMs")
      ? modalOptions.autoCloseMs
      : 2000,
  );
  if (Number.isFinite(normalizedAutoCloseMs) && normalizedAutoCloseMs > 0) {
    stockSuccessAutoCloseTimer = window.setTimeout(() => {
      stockSuccessAutoCloseTimer = 0;
      closeStockSuccessModal();
    }, normalizedAutoCloseMs);
  }

  window.requestAnimationFrame(() => {
    if (modal.actionButton instanceof HTMLButtonElement && !modal.actionButton.hidden) {
      modal.actionButton.focus();
    } else if (modal.closeButton instanceof HTMLButtonElement && !modal.closeButton.hidden) {
      modal.closeButton.focus();
    }
  });
}

function openStockDeleteConfirmationModal(
  productId,
  recordId,
  actionElement = null,
  recordLabelOverride = "",
) {
  const modal = ensureStockDeleteConfirmationModal();
  if (!modal) {
    return;
  }

  const normalizedProductId = String(productId ?? "").trim();
  const normalizedRecordId = String(recordId ?? "").trim();
  const product = currentStockProducts.find(
    (candidate) => String(candidate?.id ?? "").trim() === normalizedProductId,
  );
  if (!product) {
    return;
  }

  const stockHistoryRecords = getProductStockHistoryRecords(product);
  const targetRecord = stockHistoryRecords.find(
    (record) => String(record?.id ?? "").trim() === normalizedRecordId,
  );
  if (!targetRecord) {
    return;
  }

  const recordLabel = String(recordLabelOverride ?? "").trim()
    || normalizeStockHistoryLabel(targetRecord?.label, "Stock Record");
  const productName = String(product?.name ?? "this product").trim() || "this product";

  modal.copy.textContent = `Are you sure you want to delete "${recordLabel}" from ${productName}?`;
  modal.onAction = () => {
    prepareStockDeleteSuccessAudio();
    closeStockDeleteConfirmationModal(() => {
      void deleteStockHistoryRecord(
        normalizedProductId,
        normalizedRecordId,
        actionElement,
        recordLabel,
      );
    });
    return true;
  };
  modal.onSecondaryAction = () => {
    closeStockDeleteConfirmationModal();
    return true;
  };
  modal.allowOverlayClose = false;
  modal.overlay.hidden = false;
  window.requestAnimationFrame(() => {
    modal.overlay.classList.add("is-open");
  });
  syncStockModalOpenClass();

  window.requestAnimationFrame(() => {
    if (modal.actionButton instanceof HTMLButtonElement) {
      modal.actionButton.focus();
    }
  });
}

function removeStockEditModalOverlay() {
  clearStockEditModalClockInterval();
  document.querySelector(".stock-edit-modal-overlay")?.remove();
  syncStockModalOpenClass();
}

function closeStockEditModal() {
  removeStockEditModalOverlay();
  editingStockProductId = "";
  renderStockDashboard(currentStockProducts);
}

function syncSelectedStockProduct(products) {
  const normalizedProducts = Array.isArray(products) ? products : [];
  if (!normalizedProducts.length) {
    selectedStockProductId = "";
    return null;
  }

  if (!selectedStockProductId) {
    return null;
  }

  const selectedProduct = normalizedProducts.find(
    (product) => getStockProductIdentifier(product) === selectedStockProductId,
  );

  if (!selectedProduct) {
    selectedStockProductId = "";
    return null;
  }

  selectedStockProductId = getStockProductIdentifier(selectedProduct);
  return selectedProduct;
}

function getStockState(stock) {
  if (stock <= 0) {
    return { label: "Out of Stock", className: "is-empty" };
  }

  if (stock <= 5) {
    return { label: "Low Stock", className: "is-critical" };
  }

  if (stock <= 10) {
    return { label: "Low Stock", className: "is-low" };
  }

  return { label: "Good", className: "is-healthy" };
}

function createEmptyState(message) {
  const emptyState = document.createElement("div");
  emptyState.className = "empty-state";
  emptyState.textContent = message;
  return emptyState;
}

function createInfoRow(label, value) {
  const row = document.createElement("div");
  row.className = "dashboard-info-row";

  const labelElement = document.createElement("span");
  labelElement.textContent = label;

  const valueElement = document.createElement("strong");
  valueElement.textContent = value;

  row.append(labelElement, valueElement);
  return row;
}

function buildStockRecordRows(product) {
  const editingProduct = isSplitDisplayProduct ? displayProduct : sourceProduct;
  const stock = getStock(editingProduct);
  const currentModifiedDate = getProductModifiedDate(product);
  const rows = [
    {
      stocks: formatUnits(stock),
      modified: formatOptionalDateTime(currentModifiedDate, "Not recorded yet"),
      expireDate:
        stock > 0
          ? formatExpiryDateDisplay(getProductExpiryDate(product), "—")
          : "—",
      label: stock > 0 ? "Current Stock" : "Out of Stock",
    },
  ];

  if (stock > 0 && hasProductRestockDetails(product)) {
    const restockedDate = getProductLastRestockedDate(product) || currentModifiedDate;
    const newStockCount = getProductNewStockCount(product);
    const oldStockCount = getProductOldStockCount(product);

    if (newStockCount > 0) {
      rows.push({
        stocks: formatUnits(newStockCount),
        modified: formatOptionalDateTime(restockedDate, "Not recorded yet"),
        expireDate: formatExpiryDateDisplay(getProductNewStockDate(product), "—"),
        label: "New Stock",
      });
    }

    if (oldStockCount > 0) {
      rows.push({
        stocks: formatUnits(oldStockCount),
        modified: formatOptionalDateTime(restockedDate, "Not recorded yet"),
        expireDate: formatExpiryDateDisplay(getProductOldStockExpiryDate(product), "—"),
        label: "Old Stock",
      });
    }
  }

  return rows;
}

function createStockRecordTable(records) {
  const tableShell = document.createElement("div");
  tableShell.className = "stock-detail-panel__table-shell";

  const table = document.createElement("table");
  table.className = "stock-detail-table";

  const tableHead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  ["Stock", "Quantity", "Modified", "Expire Date", "Reason", "Condition"].forEach((label) => {
    const headerCell = document.createElement("th");
    headerCell.scope = "col";
    headerCell.textContent = label;
    headerRow.appendChild(headerCell);
  });
  tableHead.appendChild(headerRow);

  const tableBody = document.createElement("tbody");
  for (const record of Array.isArray(records) ? records : []) {
    const row = document.createElement("tr");

    const stocksCell = document.createElement("td");
    stocksCell.textContent = record?.stocks ?? "—";
    const stocksClassName = getStockRecordAdjustmentClassName(record?.stocks);
    if (stocksClassName) {
      stocksCell.classList.add(stocksClassName);
    }

    const quantityCell = document.createElement("td");
    quantityCell.textContent = record?.quantity ?? "—";

    const modifiedCell = document.createElement("td");
    modifiedCell.textContent = record?.modified ?? "—";

    const expiryCell = document.createElement("td");
    expiryCell.textContent = record?.expireDate ?? "—";

    const reasonCell = document.createElement("td");
    reasonCell.textContent = String(record?.reason ?? "").trim() || "-";

    const labelCell = document.createElement("td");
    const recordLabel = String(record?.label ?? "").trim();
    if (recordLabel) {
      const labelPill = document.createElement("span");
      const labelClassName = getStockRecordLabelClassName(recordLabel);
      labelPill.className = labelClassName
        ? `stock-detail-table__label ${labelClassName}`
        : "stock-detail-table__label";
      labelPill.textContent = recordLabel;
      labelCell.appendChild(labelPill);
    }

    row.append(stocksCell, quantityCell, modifiedCell, expiryCell, reasonCell, labelCell);
    tableBody.appendChild(row);
  }

  table.append(tableHead, tableBody);
  tableShell.appendChild(table);
  return tableShell;
}

function createStockMetaIconElement(iconMarkup) {
  const iconElement = document.createElement("span");
  iconElement.className = "stock-product-card__meta-label-icon";
  iconElement.setAttribute("aria-hidden", "true");
  iconElement.innerHTML = iconMarkup;
  return iconElement;
}

function createStockMetaCopyElement(label) {
  const copyElement = document.createElement("div");
  copyElement.className = "stock-product-card__meta-copy";

  const labelElement = document.createElement("span");
  labelElement.className = "stock-product-card__meta-label-text";
  labelElement.textContent = label;

  copyElement.appendChild(labelElement);
  return copyElement;
}

function createStockMetaRow(label, value, iconMarkup, rowModifierClass = "", valueTooltip = "") {
  const row = document.createElement("div");
  row.className = "dashboard-info-row stock-product-card__meta-row";
  if (rowModifierClass) {
    row.classList.add(rowModifierClass);
  }

  const iconElement = createStockMetaIconElement(iconMarkup);
  const copyElement = createStockMetaCopyElement(label);

  const valueElement = document.createElement("strong");
  valueElement.textContent = value;
  if (valueTooltip) {
    valueElement.dataset.stockTimeTooltip = valueTooltip;
    valueElement.tabIndex = 0;
    valueElement.setAttribute("aria-label", `${value} ${valueTooltip}`);
  }
  copyElement.appendChild(valueElement);

  row.append(iconElement, copyElement);
  return row;
}

function createStockCountMetaRow(product) {
  const row = document.createElement("div");
  row.className = "dashboard-info-row stock-product-card__meta-row stock-product-card__meta-row--stock";

  const iconElement = createStockMetaIconElement(
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <path d="M4 8L12 4L20 8L12 12L4 8Z" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M4 12L12 16L20 12" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M4 16L12 20L20 16" stroke-linecap="round" stroke-linejoin="round"></path>
    </svg>`,
  );
  const copyElement = createStockMetaCopyElement("Stock");

  const valueGroup = document.createElement("div");
  valueGroup.className = "stock-product-card__meta-value-group";

  const totalValueElement = document.createElement("strong");
  totalValueElement.textContent = formatStockCountDisplay(getStock(product));
  valueGroup.appendChild(totalValueElement);
  if (shouldSplitProductIntoStockDisplayCards(product)) {
    const restockSummary = document.createElement("small");
    restockSummary.className = "stock-product-card__meta-subvalue";
    restockSummary.textContent =
      `Old Stock: ${formatStockCountDisplay(getProductOldStockCount(product))} | ` +
      `New Stock: ${formatStockCountDisplay(getProductNewStockCount(product))}`;
    valueGroup.appendChild(restockSummary);
  }

  copyElement.appendChild(valueGroup);
  row.append(iconElement, copyElement);
  return row;
}

function createStockMetaExpiryDateRow(product, iconMarkup) {
  if (getStock(product) <= 0) {
    const lastOutOfStockIconMarkup = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="3.5" y="5.5" width="17" height="15" rx="3"></rect>
        <path d="M7.5 3.5v4"></path>
        <path d="M16.5 3.5v4"></path>
        <path d="M3.5 9.5h17"></path>
        <path d="M12 12.5v4"></path>
        <circle cx="12" cy="17.8" r="0.75" fill="currentColor" stroke="none"></circle>
      </svg>`;
    return createStockMetaRow(
      "Last out of stock",
      formatProductLastOutOfStock(product),
      lastOutOfStockIconMarkup,
    );
  }

  if (shouldSplitProductIntoStockDisplayCards(product)) {
    const row = document.createElement("div");
    row.className = "dashboard-info-row stock-product-card__meta-row";

    const iconElement = createStockMetaIconElement(iconMarkup);
    const copyElement = createStockMetaCopyElement("Expiry date");
    const valueGroup = document.createElement("div");
    valueGroup.className = "stock-product-card__meta-value-group";

    const expiryLines = [];
    const newStockExpiryDate = getProductNewStockDate(product);
    const oldStockExpiryDate = getProductOldStockExpiryDate(product);

    if (getProductNewStockCount(product) > 0 && newStockExpiryDate) {
      expiryLines.push(`New Stock: ${formatExpiryDateDisplay(newStockExpiryDate)}`);
    }

    if (getProductOldStockCount(product) > 0 && oldStockExpiryDate) {
      expiryLines.push(`Old Stock: ${formatExpiryDateDisplay(oldStockExpiryDate)}`);
    }

    if (expiryLines.length > 0) {
      const primaryValue = document.createElement("strong");
      primaryValue.textContent = expiryLines[0];
      valueGroup.appendChild(primaryValue);

      if (expiryLines.length > 1) {
        const secondaryValue = document.createElement("small");
        secondaryValue.className = "stock-product-card__meta-subvalue";
        secondaryValue.textContent = expiryLines.slice(1).join(" | ");
        valueGroup.appendChild(secondaryValue);
      }

      copyElement.appendChild(valueGroup);
      row.append(iconElement, copyElement);
      return row;
    }
  }

  return createStockMetaRow("Expiry date", formatExpiryDateDisplay(getProductExpiryDate(product)), iconMarkup);
}

function createStockDetailNumberInputRow(label, value, onInput) {
  const row = document.createElement("div");
  row.className = "dashboard-info-row stock-detail-panel__input-row";

  const labelElement = document.createElement("span");
  labelElement.textContent = label;

  const fieldGroup = document.createElement("div");
  fieldGroup.className = "stock-detail-panel__input-group";

  const input = document.createElement("input");
  input.type = "number";
  input.min = "0";
  input.step = "1";
  input.inputMode = "numeric";
  input.className = "stock-detail-panel__number-input";
  input.value = String(getStock({ stock: value }));

  function getNormalizedInputValue() {
    const parsedValue = Number(input.value);
    if (!Number.isFinite(parsedValue) || parsedValue < 0) {
      return "";
    }

    return String(Math.trunc(parsedValue));
  }

  input.addEventListener("input", () => {
    input.classList.remove("is-error");
    onInput?.(getNormalizedInputValue(), input);
  });

  fieldGroup.append(input);
  row.append(labelElement, fieldGroup);
  return {
    row,
    input,
    getNormalizedValue: getNormalizedInputValue,
  };
}

function createStockDetailReadOnlyNumberRow(label, value) {
  const row = document.createElement("div");
  row.className = "dashboard-info-row stock-detail-panel__input-row";

  const labelElement = document.createElement("span");
  labelElement.textContent = label;

  const fieldGroup = document.createElement("div");
  fieldGroup.className = "stock-detail-panel__input-group";

  const input = document.createElement("input");
  input.type = "text";
  input.value = String(getStock({ stock: value }));
  input.readOnly = true;
  input.tabIndex = -1;
  input.setAttribute("aria-readonly", "true");
  input.className = "stock-detail-panel__number-input stock-detail-panel__number-input--readonly";

  fieldGroup.append(input);
  row.append(labelElement, fieldGroup);
  return {
    row,
    input,
  };
}

function createStockDetailDeductInputRow(label, value, onInput) {
  const row = document.createElement("div");
  row.className = "dashboard-info-row stock-detail-panel__input-row";

  const labelElement = document.createElement("span");
  labelElement.textContent = label;

  const fieldGroup = document.createElement("div");
  fieldGroup.className = "stock-detail-panel__input-group";

  const input = document.createElement("input");
  input.type = "text";
  input.inputMode = "numeric";
  input.autocomplete = "off";
  input.spellcheck = false;
  input.className = "stock-detail-panel__number-input";

  function getNormalizedInputValue(rawValue = input.value) {
    const digits = String(rawValue ?? "").replace(/\D+/g, "");
    const normalizedQuantity = digits ? Math.trunc(Number(digits)) : 0;
    return normalizedQuantity > 0 ? `-${String(normalizedQuantity)}` : "";
  }

  input.value = getNormalizedInputValue(value);
  input.addEventListener("input", () => {
    input.value = getNormalizedInputValue();
    input.classList.remove("is-error");
    onInput?.(input.value, input);
  });

  fieldGroup.append(input);
  row.append(labelElement, fieldGroup);
  return {
    row,
    input,
    getNormalizedValue: () => getNormalizedInputValue(),
  };
}

function createStockDetailDeductReasonRow(label, value, onChange) {
  const row = document.createElement("div");
  row.className = "dashboard-info-row stock-detail-panel__input-row stock-edit-modal__reason-row";

  const labelElement = document.createElement("span");
  labelElement.textContent = label;

  const fieldGroup = document.createElement("div");
  fieldGroup.className = "stock-detail-panel__input-group";

  const select = document.createElement("select");
  select.className = "stock-detail-panel__select-input";

  const placeholderOption = document.createElement("option");
  placeholderOption.value = "";
  placeholderOption.textContent = "Select deduct reason";
  select.appendChild(placeholderOption);

  for (const optionConfig of STOCK_DEDUCT_REASON_OPTIONS) {
    const option = document.createElement("option");
    option.value = optionConfig.value;
    option.textContent = optionConfig.label;
    select.appendChild(option);
  }

  select.value = normalizeStockDeductReason(value);
  select.addEventListener("change", () => {
    select.classList.remove("is-error");
    onChange?.(normalizeStockDeductReason(select.value), select);
  });

  fieldGroup.append(select);
  row.append(labelElement, fieldGroup);
  return {
    row,
    select,
    getValue: () => normalizeStockDeductReason(select.value),
  };
}

function createStockDetailTextInputRow(label, value, placeholder, onInput) {
  const row = document.createElement("div");
  row.className = "dashboard-info-row stock-detail-panel__input-row stock-edit-modal__reason-detail-row";

  const labelElement = document.createElement("span");
  labelElement.textContent = label;

  const fieldGroup = document.createElement("div");
  fieldGroup.className = "stock-detail-panel__input-group";

  const input = document.createElement("input");
  input.type = "text";
  input.autocomplete = "off";
  input.spellcheck = false;
  input.placeholder = String(placeholder ?? "").trim();
  input.className = "stock-detail-panel__text-input";
  input.value = normalizeStockDeductReasonDetail(value);

  input.addEventListener("input", () => {
    input.classList.remove("is-error");
    onInput?.(normalizeStockDeductReasonDetail(input.value), input);
  });

  fieldGroup.append(input);
  row.append(labelElement, fieldGroup);
  return {
    row,
    input,
    getValue: () => normalizeStockDeductReasonDetail(input.value),
  };
}

function createStockDetailCheckboxRow(label, checked = false, onChange) {
  const row = document.createElement("div");
  row.className = "dashboard-info-row stock-detail-panel__checkbox-row";

  const field = document.createElement("label");
  field.className = "checkbox-field stock-edit-modal__checkbox-field";

  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = Boolean(checked);
  input.className = "stock-edit-modal__same-expiry-checkbox";
  input.setAttribute("aria-label", label);

  const labelText = document.createElement("span");
  labelText.textContent = label;

  input.addEventListener("change", () => {
    onChange?.(input.checked, input);
  });

  field.append(input, labelText);
  row.append(field);
  return {
    row,
    field,
    input,
  };
}

function createStockDetailDateInputRow(label, value, onChange) {
  const row = document.createElement("div");
  row.className = "dashboard-info-row stock-detail-panel__date-input-row";

  const labelElement = document.createElement("span");
  labelElement.textContent = label;

  const triggerButton = document.createElement("button");
  triggerButton.type = "button";
  triggerButton.className = "stock-detail-panel__date-trigger";

  const triggerLabel = document.createElement("span");
  triggerLabel.className = "stock-detail-panel__date-trigger-value";

  const triggerIcon = document.createElement("span");
  triggerIcon.className = "stock-detail-panel__date-trigger-icon";
  triggerIcon.innerHTML = /^expiry date$/i.test(label)
    ? STOCK_EXPIRY_DATE_ICON_MARKUP
    : STOCK_CALENDAR_ICON_MARKUP;
  triggerButton.append(triggerLabel, triggerIcon);

  const popover = document.createElement("div");
  popover.className = "stock-detail-panel__calendar-popover";
  popover.hidden = true;

  const calendarHeader = document.createElement("div");
  calendarHeader.className = "stock-detail-panel__calendar-header";

  const calendarNavLeft = document.createElement("div");
  calendarNavLeft.className = "stock-detail-panel__calendar-nav-group";
  const calendarNavRight = document.createElement("div");
  calendarNavRight.className = "stock-detail-panel__calendar-nav-group";

  const prevYearButton = document.createElement("button");
  prevYearButton.type = "button";
  prevYearButton.className = "stock-detail-panel__calendar-nav-button";
  prevYearButton.setAttribute("aria-label", "Previous year");
  prevYearButton.innerHTML = `
    <svg
      class="stock-detail-panel__calendar-nav-icon"
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M29 15.5 19.5 24 29 32.5"></path>
      <path d="M21 15.5 11.5 24 21 32.5"></path>
    </svg>
  `;

  const prevMonthButton = document.createElement("button");
  prevMonthButton.type = "button";
  prevMonthButton.className = "stock-detail-panel__calendar-nav-button";
  prevMonthButton.setAttribute("aria-label", "Previous month");
  prevMonthButton.innerHTML = `
    <svg
      class="stock-detail-panel__calendar-nav-icon"
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M27.5 15.5 18 24l9.5 8.5"></path>
    </svg>
  `;

  const nextMonthButton = document.createElement("button");
  nextMonthButton.type = "button";
  nextMonthButton.className = "stock-detail-panel__calendar-nav-button";
  nextMonthButton.setAttribute("aria-label", "Next month");
  nextMonthButton.innerHTML = `
    <svg
      class="stock-detail-panel__calendar-nav-icon"
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M20.5 15.5 30 24l-9.5 8.5"></path>
    </svg>
  `;

  const nextYearButton = document.createElement("button");
  nextYearButton.type = "button";
  nextYearButton.className = "stock-detail-panel__calendar-nav-button";
  nextYearButton.setAttribute("aria-label", "Next year");
  nextYearButton.innerHTML = `
    <svg
      class="stock-detail-panel__calendar-nav-icon"
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M19 15.5 28.5 24 19 32.5"></path>
      <path d="M27 15.5 36.5 24 27 32.5"></path>
    </svg>
  `;

  const monthLabel = document.createElement("strong");
  monthLabel.className = "stock-detail-panel__calendar-month";

  calendarNavLeft.append(prevYearButton, prevMonthButton);
  calendarNavRight.append(nextMonthButton, nextYearButton);
  calendarHeader.append(calendarNavLeft, monthLabel, calendarNavRight);

  const weekdayRow = document.createElement("div");
  weekdayRow.className = "stock-detail-panel__calendar-weekdays";
  ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].forEach((weekdayLabel) => {
    const weekdayCell = document.createElement("span");
    weekdayCell.textContent = weekdayLabel;
    weekdayRow.appendChild(weekdayCell);
  });

  const daysGrid = document.createElement("div");
  daysGrid.className = "stock-detail-panel__calendar-grid";

  const actionRow = document.createElement("div");
  actionRow.className = "stock-detail-panel__calendar-actions";

  const cancelButton = document.createElement("button");
  cancelButton.type = "button";
  cancelButton.className = "stock-detail-panel__calendar-action-button";
  cancelButton.textContent = "Cancel";

  const applyButton = document.createElement("button");
  applyButton.type = "button";
  applyButton.className = "stock-detail-panel__calendar-action-button is-primary";
  applyButton.textContent = "Apply";

  actionRow.append(cancelButton, applyButton);
  popover.append(calendarHeader, weekdayRow, daysGrid, actionRow);

  let committedValue = formatDateTimeLocalValue(value);
  let draftDate = committedValue ? new Date(committedValue) : new Date();
  draftDate.setSeconds(0, 0);
  let viewDate = new Date(draftDate.getFullYear(), draftDate.getMonth(), 1);

  function syncTriggerLabel() {
    triggerLabel.textContent = committedValue
      ? formatExpiryDateDisplay(committedValue)
      : "Select expiry date";
    triggerButton.classList.toggle("is-empty", !committedValue);
  }

  function resetDraftDate() {
    draftDate = committedValue ? new Date(committedValue) : new Date();
    draftDate.setSeconds(0, 0);
    viewDate = new Date(draftDate.getFullYear(), draftDate.getMonth(), 1);
  }

  function syncCalendarMonthLabelSize() {
    const baseFontSize = 12;
    const minFontSize = 8;
    let nextFontSize = baseFontSize;

    monthLabel.style.fontSize = `${nextFontSize}px`;
    while (nextFontSize > minFontSize && monthLabel.scrollWidth > monthLabel.clientWidth) {
      nextFontSize -= 0.5;
      monthLabel.style.fontSize = `${nextFontSize}px`;
    }
  }

  function renderCalendarGrid() {
    monthLabel.textContent = formatCalendarMonthYear(viewDate);
    window.requestAnimationFrame(syncCalendarMonthLabelSize);
    daysGrid.replaceChildren();

    const today = new Date();
    for (const dayDate of buildCalendarGridDates(viewDate)) {
      if (!(dayDate instanceof Date)) {
        const dayPlaceholder = document.createElement("span");
        dayPlaceholder.className = "stock-detail-panel__calendar-day-placeholder";
        daysGrid.appendChild(dayPlaceholder);
        continue;
      }

      const dayButton = document.createElement("button");
      dayButton.type = "button";
      dayButton.className = "stock-detail-panel__calendar-day";
      dayButton.textContent = String(dayDate.getDate());

      if (isSameCalendarDay(dayDate, today)) {
        dayButton.classList.add("is-today");
      }

      if (isSameCalendarDay(dayDate, draftDate)) {
        dayButton.classList.add("is-selected");
      }

      dayButton.addEventListener("click", () => {
        draftDate.setFullYear(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());
        renderCalendarGrid();
      });

      daysGrid.appendChild(dayButton);
    }
  }

  function openPopover() {
    resetDraftDate();
    popover.hidden = false;
    row.classList.add("is-open");
    renderCalendarGrid();
  }

  function closePopover() {
    popover.hidden = true;
    row.classList.remove("is-open");
  }

  prevYearButton.addEventListener("click", () => {
    viewDate = new Date(viewDate.getFullYear() - 1, viewDate.getMonth(), 1);
    renderCalendarGrid();
  });

  prevMonthButton.addEventListener("click", () => {
    viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1);
    renderCalendarGrid();
  });

  nextMonthButton.addEventListener("click", () => {
    viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
    renderCalendarGrid();
  });

  nextYearButton.addEventListener("click", () => {
    viewDate = new Date(viewDate.getFullYear() + 1, viewDate.getMonth(), 1);
    renderCalendarGrid();
  });

  triggerButton.addEventListener("click", () => {
    if (popover.hidden) {
      openPopover();
      return;
    }

    closePopover();
  });

  cancelButton.addEventListener("click", () => {
    closePopover();
  });

  applyButton.addEventListener("click", () => {
    committedValue = formatDateTimeLocalFromDate(draftDate);
    syncTriggerLabel();
    closePopover();
    onChange?.(committedValue, triggerButton);
  });

  syncTriggerLabel();
  row.append(labelElement, triggerButton, popover);
  return {
    row,
    triggerButton,
    getValue: () => committedValue,
    setValue: (nextValue) => {
      committedValue = formatDateTimeLocalValue(nextValue);
      syncTriggerLabel();
      closePopover();
    },
  };
}

function openStockEditModal(product, options = {}) {
  if (isEmployeeStockWorkspace()) {
    return;
  }

  const sourceProduct = getStockSourceProduct(product);
  const displayProduct =
    options?.displayProduct && typeof options.displayProduct === "object"
      ? options.displayProduct
      : product;
  if (!sourceProduct || !displayProduct) {
    return;
  }

  const productIdentifier = getStockProductIdentifier(displayProduct);
  const batchRole = getStockDisplayBatchRole(displayProduct);
  const isSplitDisplayProduct = isSplitStockDisplayEntry(displayProduct);
  const batchLabel = batchRole === "expired"
    ? "Expired Batch"
    : batchRole === "fresh"
      ? (displayProduct?.stockDisplayLabel || "Fresh Batch")
      : "";
  const notificationFocusTarget = normalizeStockNotificationFocusTarget(options?.notificationFocusTarget);
  editingStockProductId = productIdentifier;
  selectedStockProductId = productIdentifier;
  removeStockEditModalOverlay();

  const overlay = document.createElement("div");
  overlay.className = "stock-edit-modal-overlay";
  overlay.tabIndex = -1;

  const dialog = document.createElement("section");
  dialog.className = "stock-edit-modal product-form";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-labelledby", "stock-edit-modal-title");

  const header = document.createElement("div");
  header.className = "stock-edit-modal__header";

  const copy = document.createElement("div");
  copy.className = "stock-edit-modal__copy";

  const title = document.createElement("h2");
  title.className = "stock-edit-modal__title";
  title.id = "stock-edit-modal-title";
  title.textContent = sourceProduct.name || "Unnamed Product";

  const subtitle = document.createElement("p");
  subtitle.className = "stock-edit-modal__subtitle";
  subtitle.textContent = `${product.category || "General"} • ${formatPrice(getResolvedPrice(product))}`;

  subtitle.textContent = `${product.category || "General"} â€¢ ${formatPrice(getResolvedPrice(product))}`;
  subtitle.textContent = batchLabel
    ? `${sourceProduct.category || "General"} - ${batchLabel}`
    : `${sourceProduct.category || "General"} - ${formatPrice(getResolvedPrice(sourceProduct))}`;
  copy.append(title, subtitle);

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "product-gallery-modal__close validation-modal__close";
  closeButton.setAttribute("aria-label", "Close stock editor");
  closeButton.title = "Close stock editor";
  closeButton.innerHTML = `<i class="fa-solid fa-xmark" aria-hidden="true"></i>`;

  header.append(copy, closeButton);

  const body = document.createElement("div");
  body.className = "dashboard-info-list stock-edit-modal__list";

  const editingProduct = isSplitDisplayProduct ? displayProduct : sourceProduct;
  const stock = getStock(editingProduct);
  const initialAddStockValue = "0";
  const initialDeductValue = "";
  const initialDeductReasonValue = "";
  const initialDeductReasonDetailValue = "";
  const initialExpiryValue = formatDateTimeLocalValue(getProductExpiryDate(editingProduct));
  const hasInitialExpiryValue = Boolean(initialExpiryValue);
  let draftAddStockValue = initialAddStockValue;
  let draftDeductValue = initialDeductValue;
  let draftDeductReasonValue = initialDeductReasonValue;
  let draftDeductReasonDetailValue = initialDeductReasonDetailValue;
  let draftExpiryValue = initialExpiryValue;
  let isSameExpiryDateSelected = hasInitialExpiryValue;

  const stockField = createStockDetailReadOnlyNumberRow(
    isSplitDisplayProduct ? "Batch Stock" : "Stock",
    stock,
  );
  const addStockField = createStockDetailNumberInputRow("Add Stock", 0, (nextValue) => {
    draftAddStockValue = nextValue;
    syncAdjustmentLockState();
    syncActionState();
    syncStockedDatePreview();
  });
  const deductField = createStockDetailDeductInputRow("Deduct", "", (nextValue) => {
    draftDeductValue = nextValue;
    syncAdjustmentLockState();
    syncActionState();
    syncStockedDatePreview();
  });
  const deductReasonField = createStockDetailDeductReasonRow(
    "Deduct Reason",
    initialDeductReasonValue,
    (nextValue) => {
      draftDeductReasonValue = nextValue;
      syncAdjustmentLockState();
      syncActionState();
    },
  );
  const deductReasonDetailField = createStockDetailTextInputRow(
    "Other Reason",
    initialDeductReasonDetailValue,
    "Type the deduct reason",
    (nextValue) => {
      draftDeductReasonDetailValue = nextValue;
      syncActionState();
    },
  );
  const expiryField = createStockDetailDateInputRow(
    "Expiry Date",
    getProductExpiryDate(editingProduct),
    (nextValue) => {
      draftExpiryValue = String(nextValue ?? "").trim();
      syncActionState();
    },
  );
  const sameExpiryDateField = createStockDetailCheckboxRow(
    "Same Expiry Date",
    hasInitialExpiryValue,
    (isChecked) => {
      isSameExpiryDateSelected = isChecked && hasInitialExpiryValue;
      sameExpiryDateCheckbox.checked = isSameExpiryDateSelected;
      if (isSameExpiryDateSelected) {
        draftExpiryValue = initialExpiryValue;
        expiryField.setValue(initialExpiryValue);
      }
      syncAdjustmentLockState();
      syncActionState();
    },
  );
  const sameExpiryDateCheckbox = sameExpiryDateField.input;
  addStockField.input.dataset.stockNotificationFocus = "add";
  deductField.input.dataset.stockNotificationFocus = "deduct";
  expiryField.triggerButton.dataset.stockNotificationFocus = "expiry";
  if (notificationFocusTarget === "expiry") {
    isSameExpiryDateSelected = false;
    sameExpiryDateCheckbox.checked = false;
  }

  const stockAdjustmentsLayout = document.createElement("div");
  stockAdjustmentsLayout.className = "stock-edit-modal__stock-grid";

  const stockAdjustmentsSide = document.createElement("div");
  stockAdjustmentsSide.className = "stock-edit-modal__stock-adjustments";
  stockAdjustmentsSide.append(addStockField.row, deductField.row);

  stockAdjustmentsLayout.append(stockField.row, stockAdjustmentsSide);

  const stockDatesLayout = document.createElement("div");
  stockDatesLayout.className = "stock-edit-modal__date-grid";
  const expiryDateColumn = document.createElement("div");
  expiryDateColumn.className = "stock-edit-modal__date-column stock-edit-modal__date-column--expiry";
  const stockedDateRow = createInfoRow(
    "Date Stocked",
    formatOptionalDateTimeWithSeconds(new Date().toISOString()),
  );
  stockedDateRow.classList.add("stock-edit-modal__stocked-date-row");
  const stockedDateValueElement = stockedDateRow.querySelector("strong");
  expiryDateColumn.append(expiryField.row, sameExpiryDateField.row);
  stockDatesLayout.append(stockedDateRow, expiryDateColumn);

  body.append(
    stockAdjustmentsLayout,
    deductReasonField.row,
    deductReasonDetailField.row,
    stockDatesLayout,
  );

  const actions = document.createElement("div");
  actions.className = "validation-modal__actions stock-edit-modal__actions";

  const secondaryButton = document.createElement("button");
  secondaryButton.type = "button";
  secondaryButton.className = "ghost-button validation-modal__action-button validation-modal__action-button--secondary";
  secondaryButton.textContent = "Cancel";

  const primaryButton = document.createElement("button");
  primaryButton.type = "button";
  primaryButton.className = "validation-modal__action-button";
  primaryButton.textContent = "Save";

  function getAddStockQuantity() {
    const parsedStock = Number(draftAddStockValue);
    return Number.isFinite(parsedStock) && parsedStock >= 0 && Number.isInteger(parsedStock)
      ? Math.trunc(parsedStock)
      : NaN;
  }

  function getDeductQuantity() {
    const normalizedValue = String(draftDeductValue ?? "").trim();
    if (!normalizedValue) {
      return 0;
    }

    const parsedStock = Number(normalizedValue);
    return Number.isFinite(parsedStock) && parsedStock <= 0 && Number.isInteger(parsedStock)
      ? Math.abs(Math.trunc(parsedStock))
      : NaN;
  }

  function hasValidAdjustmentDrafts() {
    const addStockQuantity = getAddStockQuantity();
    const deductQuantity = getDeductQuantity();
    if (!Number.isFinite(addStockQuantity) || !Number.isFinite(deductQuantity)) {
      return false;
    }

    return stock + addStockQuantity - deductQuantity >= 0;
  }

  function hasRequiredDeductReason() {
    const deductQuantity = getDeductQuantity();
    if (!Number.isFinite(deductQuantity)) {
      return false;
    }

    if (deductQuantity <= 0) {
      return true;
    }

    const normalizedReason = normalizeStockDeductReason(draftDeductReasonValue);
    if (!normalizedReason) {
      return false;
    }

    if (normalizedReason !== "other") {
      return true;
    }

    return Boolean(normalizeStockDeductReasonDetail(draftDeductReasonDetailValue));
  }

  function hasChanges() {
    return (
      String(draftAddStockValue) !== initialAddStockValue ||
      String(draftDeductValue) !== initialDeductValue ||
      normalizeExpiryDateInputValue(draftExpiryValue) !== normalizeExpiryDateInputValue(initialExpiryValue)
    );
  }

  function syncActionState() {
    primaryButton.disabled =
      !hasValidAdjustmentDrafts()
      || !hasRequiredDeductReason()
      || !hasChanges();
  }

  function syncAdjustmentLockState() {
    const addStockQuantity = getAddStockQuantity();
    const deductQuantity = getDeductQuantity();
    const shouldDisableDeduct = Number.isFinite(addStockQuantity) && addStockQuantity > 0;
    const shouldDisableAddStockAndExpiry =
      Number.isFinite(deductQuantity) && deductQuantity > 0;

    if (shouldDisableDeduct) {
      draftDeductValue = "";
      deductField.input.value = "";
      deductField.input.classList.remove("is-error");
    }

    if (shouldDisableAddStockAndExpiry) {
      draftAddStockValue = "0";
      addStockField.input.value = "0";
      addStockField.input.classList.remove("is-error");
    }

    const shouldRequireDeductReason =
      Number.isFinite(deductQuantity) && deductQuantity > 0 && !shouldDisableDeduct;
    const shouldRequireCustomDeductReason =
      shouldRequireDeductReason && normalizeStockDeductReason(draftDeductReasonValue) === "other";
    if (!shouldRequireDeductReason) {
      draftDeductReasonValue = "";
      deductReasonField.select.value = "";
      deductReasonField.select.classList.remove("is-error");
    }
    if (!shouldRequireCustomDeductReason) {
      draftDeductReasonDetailValue = "";
      deductReasonDetailField.input.value = "";
      deductReasonDetailField.input.classList.remove("is-error");
    }

    deductField.input.disabled = shouldDisableDeduct;
    deductField.input.classList.toggle("is-disabled", shouldDisableDeduct);
    addStockField.input.disabled = shouldDisableAddStockAndExpiry;
    addStockField.input.classList.toggle("is-disabled", shouldDisableAddStockAndExpiry);
    expiryField.triggerButton.disabled = shouldDisableAddStockAndExpiry || isSameExpiryDateSelected;
    expiryField.triggerButton.classList.toggle(
      "is-disabled",
      shouldDisableAddStockAndExpiry || isSameExpiryDateSelected,
    );
    sameExpiryDateCheckbox.disabled = false;
    sameExpiryDateCheckbox.removeAttribute("disabled");
    sameExpiryDateField.field.classList.remove("is-disabled");
    deductReasonField.row.hidden = !shouldRequireDeductReason;
    deductReasonField.select.disabled = !shouldRequireDeductReason;
    deductReasonField.select.classList.toggle("is-disabled", !shouldRequireDeductReason);
    deductReasonDetailField.row.hidden = !shouldRequireCustomDeductReason;
    deductReasonDetailField.input.disabled = !shouldRequireCustomDeductReason;
    deductReasonDetailField.input.classList.toggle("is-disabled", !shouldRequireCustomDeductReason);
  }

  function syncStockedDatePreview() {
    if (stockedDateValueElement) {
      stockedDateValueElement.textContent = formatOptionalDateTimeWithSeconds(new Date().toISOString());
    }
  }

  actions.append(secondaryButton, primaryButton);
  syncAdjustmentLockState();
  syncActionState();
  syncStockedDatePreview();

  dialog.append(header, body, actions);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
  syncStockModalOpenClass();
  stockEditModalClockIntervalId = window.setInterval(syncStockedDatePreview, 1000);
  const modalControlRefs = {
    displayProduct,
    addStockInput: addStockField.input,
    deductInput: deductField.input,
    deductReasonSelect: deductReasonField.select,
    deductReasonDetailInput: deductReasonDetailField.input,
    expiryTrigger: expiryField.triggerButton,
    primaryButton,
    secondaryButton,
  };

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closeStockEditModal();
    }
  });
  overlay.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeStockEditModal();
    }
  });
  dialog.addEventListener("click", (event) => {
    event.stopPropagation();
  });
  closeButton.addEventListener("click", () => {
    closeStockEditModal();
  });
  secondaryButton.addEventListener("click", () => {
    closeStockEditModal();
  });
  primaryButton.addEventListener("click", () => {
    void saveStockEditModalChanges(
      sourceProduct,
      draftAddStockValue,
      draftDeductValue,
      draftDeductReasonValue,
      draftDeductReasonDetailValue,
      draftExpiryValue,
      modalControlRefs,
    );
  });

  window.requestAnimationFrame(() => {
    if (notificationFocusTarget !== "card" && focusStockNotificationModalTarget(notificationFocusTarget, modalControlRefs)) {
      return;
    }
    closeButton.focus();
  });
}

function createStockCard(product) {
  const article = document.createElement("article");
  article.className = "stock-product-card";
  const productIdentifier = getStockProductIdentifier(product);
  const isSelected = productIdentifier === selectedStockProductId;
  const isEditing = productIdentifier === editingStockProductId;
  const isEmployeeWorkspace = isEmployeeStockWorkspace();
  const isEmbeddedLiveChatWorkspace = isEmbeddedLiveChatStockWorkspace();
  const sourceProduct = getStockSourceProduct(product);
  const productId = String(sourceProduct?.id ?? "").trim();
  const isExpiredBatch = isExpiredStockDisplayEntry(product);
  const isFreshBatch = isFreshStockDisplayEntry(product);
  const variants = isEmbeddedLiveChatWorkspace ? getProductVariants(product) : [];
  const hasVariants = variants.length > 0;
  if (!isEmbeddedLiveChatWorkspace) {
    article.dataset.stockProductId = productIdentifier;
    article.tabIndex = 0;
    article.setAttribute("role", "button");
    article.setAttribute("aria-pressed", isSelected ? "true" : "false");
    article.classList.toggle("is-selected", isSelected);
  }

  const header = document.createElement("div");
  header.className = "stock-product-card__header";

  const media = document.createElement("div");
  media.className = "stock-product-card__media";

  let editButton = null;
  if (!isEmployeeWorkspace && !isEmbeddedLiveChatWorkspace) {
    editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "edit-button icon-action-button stock-product-card__edit-button";
    editButton.classList.toggle("is-editing", isEditing);
    editButton.setAttribute(
      "aria-label",
      isEditing ? "Stop editing stock details" : "Edit stock details",
    );
    editButton.title = isEditing ? "Stop editing stock details" : "Edit stock details";
    editButton.innerHTML = `<i class="fa-regular fa-pen-to-square" aria-hidden="true"></i>`;

    if (!productId) {
      editButton.disabled = true;
      editButton.setAttribute("aria-disabled", "true");
    } else {
      editButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (isEditing) {
          closeStockEditModal();
          return;
        }

        selectedStockProductId = productIdentifier;
        editingStockProductId = productIdentifier;
        renderStockDashboard(currentStockProducts);
        openStockEditModal(sourceProduct, { displayProduct: product });
      });
      editButton.addEventListener("keydown", (event) => {
        event.stopPropagation();
      });
    }
  }

  let variantToggleButton = null;
  if (hasVariants) {
    article.classList.add("stock-product-card--has-variants");

    variantToggleButton = document.createElement("button");
    variantToggleButton.type = "button";
    variantToggleButton.className = "stock-product-card__variant-toggle";
    variantToggleButton.setAttribute("aria-expanded", "false");
    variantToggleButton.setAttribute("aria-label", "Show variants");
    variantToggleButton.title = "Show variants";
    variantToggleButton.innerHTML = `<span class="stock-product-card__variant-toggle-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m6 9 6 6 6-6"></path>
      </svg>
    </span>`;
  }

  if (product.imageUrl) {
    const image = document.createElement("img");
    image.src = product.imageUrl;
    image.alt = product.name || "Product image";
    media.appendChild(image);
  } else {
    const placeholder = document.createElement("span");
    placeholder.className = "stock-product-card__placeholder";
    placeholder.textContent = "No image";
    media.appendChild(placeholder);
  }

  const titleWrap = document.createElement("div");
  titleWrap.className = "stock-product-card__title";

  const title = document.createElement("h3");
  title.textContent = product.name || "Unnamed Product";

  const subtitle = document.createElement("p");
  subtitle.textContent = `${product.category || "General"} • ${formatPrice(getResolvedPrice(product))}`;

  subtitle.textContent = `${product.category || "General"} â€¢ ${formatPrice(getResolvedPrice(product))}`;
  subtitle.textContent = `${product.category || "General"} - ${formatPrice(getResolvedPrice(product))}`;
  titleWrap.append(title, subtitle);

  header.append(media, titleWrap);

  const stock = getStock(product);
  const state = isExpiredBatch
    ? { label: "Expired", className: "is-empty" }
    : getStockState(stock);

  const chip = document.createElement("span");
  chip.className = `stock-chip ${state.className}`;
  chip.textContent = state.label;

  const chipGroup = document.createElement("div");
  chipGroup.className = "stock-chip-group";
  chipGroup.appendChild(chip);

  if (isFreshBatch) {
    const freshBatchLabel = String(product?.stockDisplayLabel ?? "").trim();
    if (freshBatchLabel) {
      const freshStockChip = document.createElement("span");
      freshStockChip.className = "stock-chip is-new";
      freshStockChip.textContent = freshBatchLabel;
      chipGroup.appendChild(freshStockChip);
    }
  } else if (isNewStockProduct(product)) {
    const newStockChip = document.createElement("span");
    newStockChip.className = "stock-chip is-new";
    newStockChip.textContent = "New Stock";
    chipGroup.appendChild(newStockChip);
  }

  if (isNearExpiryProduct(product)) {
    const nearExpiryChip = document.createElement("span");
    nearExpiryChip.className = "stock-chip is-near-expiry";
    nearExpiryChip.textContent = "Near Expiry";
    chipGroup.appendChild(nearExpiryChip);
  }

  const meter = document.createElement("div");
  meter.className = "stock-meter";

  const meterFill = document.createElement("span");
  meterFill.className = `stock-meter__fill ${state.className}`;
  const fillWidth = stock <= 0
    ? 0
    : Math.max(8, Math.round((Math.min(stock, STOCK_METER_MAX) / STOCK_METER_MAX) * 100));
  meterFill.style.width = `${Math.min(fillWidth, 100)}%`;
  meter.appendChild(meterFill);

  const stockedDate = getProductStockedDate(product);
  const meta = document.createElement("div");
  meta.className = "stock-product-card__meta";
  meta.append(
    createStockCountMetaRow(product),
    createStockMetaRow(
      getProductStockedDateLabel(product),
      formatOptionalDate(stockedDate),
      STOCK_STOCKED_DATE_ICON_MARKUP,
      "stock-product-card__meta-row--stocked-date",
      formatOptionalTime(stockedDate),
    ),
    createStockMetaExpiryDateRow(
      product,
      STOCK_EXPIRY_DATE_ICON_MARKUP,
    ),
  );

  if (editButton) {
    article.append(editButton);
  }
  if (variantToggleButton) {
    article.append(variantToggleButton);
  }
  article.append(header, chipGroup, meter, meta);

  if (hasVariants) {
    const variantSection = createVariantStockSection(product);
    if (variantSection) {
      variantSection.hidden = true;
      article.appendChild(variantSection);

      const syncVariantExpansion = (isExpanded) => {
        article.classList.toggle("is-variants-open", isExpanded);
        variantSection.hidden = !isExpanded;
        if (variantToggleButton) {
          variantToggleButton.classList.toggle("is-open", isExpanded);
          variantToggleButton.setAttribute("aria-expanded", isExpanded ? "true" : "false");
          variantToggleButton.setAttribute("aria-label", isExpanded ? "Hide variants" : "Show variants");
          variantToggleButton.title = isExpanded ? "Hide variants" : "Show variants";
        }
      };

      syncVariantExpansion(false);
      variantToggleButton?.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        syncVariantExpansion(variantSection.hidden);
      });
    }
  }

  return article;
}

function setSummary(products) {
  const totalProducts = products.length;
  const totalUnits = products.reduce((sum, product) => sum + getStock(product), 0);
  const lowStockItems = products.filter((product) => isLowStockProduct(product)).length;
  const outOfStockItems = products.filter((product) => getStock(product) === 0).length;
  const nearExpiryItems = products.filter((product) => isNearExpiryProduct(product)).length;

  setSummaryValue(stockTotalProducts, totalProducts);
  setSummaryValue(stockTotalUnits, totalUnits);
  setSummaryValue(stockLowCount, lowStockItems);
  setSummaryValue(stockEmptyCount, outOfStockItems);
  setSummaryValue(stockNearExpiryCount, nearExpiryItems);
}

function renderProducts(products) {
  stockProductList.replaceChildren();

  if (!products.length) {
    const activeFilterLabel = getStockPriorityFilterLabel();
    const hasSearchOrCategoryFilter =
      Boolean(normalizeStockSearchTerm(stockSearchTerm))
      || Boolean(normalizeStockCategoryFilter(stockCategoryFilter));
    stockProductList.appendChild(
      createEmptyState(
        hasSearchOrCategoryFilter
          ? `No ${activeFilterLabel} products match the current search or category filter.`
          : stockPriorityFilter === "all"
            ? "No saved products available yet."
            : `No ${activeFilterLabel} products available right now.`,
      ),
    );
    return;
  }

  const sortedProducts = [...products].sort((left, right) => {
    if (stockPriorityFilter === "new-stock") {
      return getProductNewStockTimestamp(right) - getProductNewStockTimestamp(left);
    }

    if (stockPriorityFilter === "expired-product") {
      return getProductExpiryDayStartTimestamp(left) - getProductExpiryDayStartTimestamp(right);
    }

    if (stockPriorityFilter === "near-expiry") {
      return getProductExpiryDayStartTimestamp(left) - getProductExpiryDayStartTimestamp(right);
    }

    const nameComparison = String(left.name || "").localeCompare(String(right.name || ""));
    if (nameComparison !== 0) {
      return nameComparison;
    }

    const leftSortOrder = Number.isFinite(Number(left?.stockDisplaySortOrder))
      ? Number(left.stockDisplaySortOrder)
      : 0;
    const rightSortOrder = Number.isFinite(Number(right?.stockDisplaySortOrder))
      ? Number(right.stockDisplaySortOrder)
      : 0;
    return leftSortOrder - rightSortOrder;
  });

  for (const product of sortedProducts) {
    stockProductList.appendChild(createStockCard(product));
  }
}

function renderRestockPriority(products) {
  if (!stockPriorityList) {
    return;
  }

  stockPriorityList.replaceChildren();

  const priorityProducts = [...products]
    .filter((product) => {
      if (stockPriorityFilter === "low-stock") {
        return isLowStockProduct(product);
      }

      return getStock(product) === 0;
    })
    .sort((left, right) =>
      stockPriorityFilter === "low-stock"
        ? getStock(left) - getStock(right)
        : String(left.name || "").localeCompare(String(right.name || "")),
    )
    .slice(0, 5);

  if (!priorityProducts.length) {
    stockPriorityList.appendChild(
      createEmptyState(
        stockSearchTerm
          ? `No ${
            stockPriorityFilter === "low-stock" ? "low stock" : "out of stock"
          } items match the current search.`
          : `No ${
            stockPriorityFilter === "low-stock" ? "low stock" : "out of stock"
          } items right now.`,
      ),
    );
    return;
  }

  for (const product of priorityProducts) {
    stockPriorityList.appendChild(
      createInfoRow(product.name || "Unnamed Product", `${getStock(product)} left`),
    );
  }
}

function renderCategorySummary(products) {
  if (!stockCategoryList) {
    return;
  }

  stockCategoryList.replaceChildren();

  const categoryMap = new Map();
  for (const product of products) {
    const category = String(product.category || "General").trim() || "General";
    const current = categoryMap.get(category) || { count: 0, units: 0 };
    current.count += 1;
    current.units += getStock(product);
    categoryMap.set(category, current);
  }

  const categories = [...categoryMap.entries()].sort((left, right) => right[1].units - left[1].units);

  if (!categories.length) {
    stockCategoryList.appendChild(
      createEmptyState(
        stockSearchTerm
          ? "No category data match the current search."
          : "No category data available.",
      ),
    );
    return;
  }

  for (const [category, summary] of categories) {
    stockCategoryList.appendChild(
      createInfoRow(
        category,
        `${summary.count} item${summary.count === 1 ? "" : "s"} • ${summary.units} units`,
      ),
    );
  }
}

async function saveProductExpiryDate(product, rawValue, inputElement) {
  if (!product?.id) {
    return;
  }

  const nextExpiryDate = normalizeExpiryDateInputValue(rawValue);
  const currentExpiryDate = normalizeExpiryDateInputValue(getProductExpiryDate(product));

  if (nextExpiryDate === currentExpiryDate) {
    return;
  }

  try {
    inputElement?.classList.add("is-saving");
    inputElement?.setAttribute("aria-busy", "true");
    if ("disabled" in (inputElement ?? {})) {
      inputElement.disabled = true;
    }

    const response = await fetch(`/api/products/${encodeURIComponent(product.id)}`, {
      method: "PUT",
      headers: withStockAdminScopeHeaders({
        "Content-Type": "application/json",
      }),
      body: JSON.stringify(withStockAdminScopePayload({
        ...product,
        expiryDate: nextExpiryDate,
        __activityContext: "inventory",
        __activityTarget: "expiry",
        __activityInventoryChangeCount: 1,
        __activityDisplayStockProductId: getStockProductIdentifier(product),
        __activityActor: getStockActivityActor(),
      })),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.message || "Unable to save expiry date.");
    }

    const updatedProduct = {
      ...product,
      ...(data?.product ?? {}),
      expiryDate: nextExpiryDate,
    };

    currentStockProducts = currentStockProducts.map((candidate) =>
      String(candidate?.id ?? "").trim() === String(product.id).trim()
        ? updatedProduct
        : candidate,
    );
    selectedStockProductId = getStockProductIdentifier(updatedProduct);
    renderStockDashboard(currentStockProducts);
    broadcastStockProductsUpdated();
    if (editingStockProductId) {
      openStockEditModal(updatedProduct);
    }
  } catch (error) {
    console.error(error);
    if (inputElement) {
      inputElement.classList.add("is-error");
      window.setTimeout(() => inputElement.classList.remove("is-error"), 1800);
    }
  } finally {
    inputElement?.classList.remove("is-saving");
    inputElement?.removeAttribute("aria-busy");
    if ("disabled" in (inputElement ?? {})) {
      inputElement.disabled = false;
    }
  }
}

async function saveProductStock(product, nextStockValue, inputElement, actionElement) {
  if (!product?.id) {
    return;
  }

  const normalizedStock = Number(nextStockValue);
  const currentStock = getStock(product);
  if (!Number.isFinite(normalizedStock) || normalizedStock < 0 || !Number.isInteger(normalizedStock)) {
    throw new Error("Stock must be a valid whole number greater than or equal to zero.");
  }

  if (normalizedStock === currentStock) {
    return;
  }

  try {
    inputElement?.classList.add("is-saving");
    actionElement?.classList.add("is-saving");
    if ("disabled" in (inputElement ?? {})) {
      inputElement.disabled = true;
    }
    if ("disabled" in (actionElement ?? {})) {
      actionElement.disabled = true;
    }

    const response = await fetch(`/api/products/${encodeURIComponent(product.id)}`, {
      method: "PUT",
      headers: withStockAdminScopeHeaders({
        "Content-Type": "application/json",
      }),
      body: JSON.stringify(withStockAdminScopePayload({
        ...product,
        stock: normalizedStock,
        __activityContext: "inventory",
        __activityTarget: normalizedStock > currentStock ? "add" : "deduct",
        __activityInventoryChangeCount: 1,
        __activityDisplayStockProductId: getStockProductIdentifier(product),
        __activityActor: getStockActivityActor(),
      })),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.message || "Unable to save stock.");
    }

    const updatedProduct = {
      ...product,
      ...(data?.product ?? {}),
      stock: normalizedStock,
    };

    currentStockProducts = currentStockProducts.map((candidate) =>
      String(candidate?.id ?? "").trim() === String(product.id).trim()
        ? updatedProduct
        : candidate,
    );
    const updatedIdentifier = getStockProductIdentifier(updatedProduct);
    selectedStockProductId = updatedIdentifier;
    editingStockProductId = updatedIdentifier;
    renderStockDashboard(currentStockProducts);
    broadcastStockProductsUpdated();
    openStockEditModal(updatedProduct);
  } catch (error) {
    console.error(error);
    inputElement?.classList.add("is-error");
    window.setTimeout(() => inputElement?.classList.remove("is-error"), 1800);
  } finally {
    inputElement?.classList.remove("is-saving");
    actionElement?.classList.remove("is-saving");
    if ("disabled" in (inputElement ?? {})) {
      inputElement.disabled = false;
    }
    if ("disabled" in (actionElement ?? {})) {
      actionElement.disabled = false;
    }
  }
}

async function saveStockEditModalChanges(
  product,
  draftAddStockValue,
  draftDeductValue,
  draftDeductReasonValue,
  draftDeductReasonDetailValue,
  draftExpiryValue,
  controls = {},
) {
  if (!product?.id) {
    return false;
  }

  const {
    displayProduct,
    addStockInput,
    deductInput,
    deductReasonSelect,
    deductReasonDetailInput,
    expiryTrigger,
    primaryButton,
    secondaryButton,
  } = controls;

  const parsedAddStock = Number(draftAddStockValue);
  if (!Number.isFinite(parsedAddStock) || parsedAddStock < 0 || !Number.isInteger(parsedAddStock)) {
    addStockInput?.classList.add("is-error");
    window.setTimeout(() => addStockInput?.classList.remove("is-error"), 1800);
    return false;
  }

  const normalizedAddStock = Math.trunc(parsedAddStock);
  const normalizedDeductValue = String(draftDeductValue ?? "").trim();
  const parsedDeductStock = normalizedDeductValue ? Number(normalizedDeductValue) : 0;
  if (
    !Number.isFinite(parsedDeductStock) ||
    parsedDeductStock > 0 ||
    !Number.isInteger(parsedDeductStock)
  ) {
    deductInput?.classList.add("is-error");
    window.setTimeout(() => deductInput?.classList.remove("is-error"), 1800);
    return false;
  }

  const normalizedDeductStock = Math.abs(Math.trunc(parsedDeductStock));
  const normalizedDeductReason = normalizeStockDeductReason(draftDeductReasonValue);
  const normalizedDeductReasonDetail = normalizeStockDeductReasonDetail(draftDeductReasonDetailValue);
  if (normalizedDeductStock > 0 && !normalizedDeductReason) {
    deductReasonSelect?.classList.add("is-error");
    window.setTimeout(() => deductReasonSelect?.classList.remove("is-error"), 1800);
    deductReasonSelect?.focus();
    return false;
  }
  if (normalizedDeductStock > 0 && normalizedDeductReason === "other" && !normalizedDeductReasonDetail) {
    deductReasonDetailInput?.classList.add("is-error");
    window.setTimeout(() => deductReasonDetailInput?.classList.remove("is-error"), 1800);
    deductReasonDetailInput?.focus();
    return false;
  }

  const sourceProduct = getStockSourceProduct(product);
  const activeDisplayProduct =
    displayProduct && typeof displayProduct === "object"
      ? displayProduct
      : sourceProduct;
  const displayBatchRole = getStockDisplayBatchRole(activeDisplayProduct);
  const displaySourceBatch = getStockDisplaySourceBatch(activeDisplayProduct);
  const isSplitBatchEdit =
    isSplitStockDisplayEntry(activeDisplayProduct) && Boolean(displayBatchRole);

  const currentStock = getStock(sourceProduct);
  const hadRestockDetails = hasProductRestockDetails(sourceProduct);
  const currentBreakdown = getProductStockBreakdown(sourceProduct);
  const currentOldStock = currentBreakdown.oldStock;
  const currentNewStock = currentBreakdown.newStock;
  const currentProductExpiryDate = normalizeExpiryDateInputValue(getProductExpiryDate(sourceProduct));
  const currentOldStockExpiryDate = normalizeExpiryDateInputValue(getProductOldStockExpiryDate(sourceProduct));
  const currentNewStockExpiryDate = normalizeExpiryDateInputValue(getProductNewStockDate(sourceProduct));
  const currentLastRestockedAt = String(getProductLastRestockedDate(sourceProduct) ?? "").trim();
  const currentStockedDate = String(getProductStockedDate(sourceProduct) ?? "").trim();
  const currentDisplayExpiryDate = normalizeExpiryDateInputValue(getProductExpiryDate(activeDisplayProduct));
  const normalizedExpiryDate = normalizeExpiryDateInputValue(draftExpiryValue);
  const inventoryActivityTargets = [];
  if (normalizedAddStock > 0) {
    inventoryActivityTargets.push("add");
  }
  if (normalizedDeductStock > 0) {
    inventoryActivityTargets.push("deduct");
  }
  if (normalizedDeductStock <= 0 && normalizedExpiryDate !== currentDisplayExpiryDate) {
    inventoryActivityTargets.push("expiry");
  }
  const inventoryActivityFocusTargets = getStockNotificationFocusTargets(inventoryActivityTargets);
  const inventoryActivityTarget = getStockNotificationActivityTarget(inventoryActivityTargets);
  const nextModifiedAt = new Date().toISOString();
  const stockHistoryRecordId = createStockHistoryRecordId(nextModifiedAt);
  const resolvedOldStockExpiryDate = currentOldStockExpiryDate || currentProductExpiryDate;
  const resolvedNewStockExpiryDate = currentNewStockExpiryDate || currentProductExpiryDate;

  let updatedOldStock = currentOldStock;
  let updatedNewStock = currentNewStock;
  let nextRestockedAt = currentLastRestockedAt;
  let nextStockedDate = currentStockedDate;
  let nextOldStockExpiryDate = updatedOldStock > 0 ? resolvedOldStockExpiryDate : "";
  let nextNewStockDate = updatedNewStock > 0 ? resolvedNewStockExpiryDate : "";
  let stockHistoryExpiryDate = normalizedDeductStock > 0 ? "" : normalizedExpiryDate;
  let stockHistoryLabel = "";
  let stockHistoryBatchRole = "";

  if (isSplitBatchEdit) {
    const batchCurrentStock = getStock(activeDisplayProduct);
    if (normalizedDeductStock > batchCurrentStock) {
      deductInput?.classList.add("is-error");
      window.setTimeout(() => deductInput?.classList.remove("is-error"), 1800);
      return false;
    }

    if ((displaySourceBatch || "old") === "old") {
      updatedOldStock = Math.max(0, currentOldStock + normalizedAddStock - normalizedDeductStock);
      nextOldStockExpiryDate = updatedOldStock > 0
        ? (normalizedExpiryDate || resolvedOldStockExpiryDate)
        : "";
      nextNewStockDate = updatedNewStock > 0 ? resolvedNewStockExpiryDate : "";
      if (normalizedAddStock > 0) {
        nextStockedDate = nextModifiedAt;
      }
      stockHistoryExpiryDate = normalizedDeductStock > 0 ? "" : nextOldStockExpiryDate;
      stockHistoryLabel =
        displayBatchRole === "expired"
          ? (
              normalizedAddStock > 0
                ? "Added Expired Stock"
                : normalizedDeductStock > 0
                  ? "Deducted Expired Stock"
                  : normalizedExpiryDate !== resolvedOldStockExpiryDate
                    ? "Edit Expiry Date"
                    : "Saved Expired Stock"
            )
          : (
              normalizedAddStock > 0
                ? "Added New Stock"
                : normalizedDeductStock > 0
                  ? "Deducted New Stock"
                  : normalizedExpiryDate !== resolvedOldStockExpiryDate
                    ? "Edit Expiry Date"
                    : "Saved New Stock"
            );
      stockHistoryBatchRole = displayBatchRole;
    } else {
      updatedNewStock = Math.max(0, currentNewStock + normalizedAddStock - normalizedDeductStock);
      nextOldStockExpiryDate = updatedOldStock > 0 ? resolvedOldStockExpiryDate : "";
      nextNewStockDate = updatedNewStock > 0
        ? (normalizedExpiryDate || resolvedNewStockExpiryDate)
        : "";
      if (normalizedAddStock > 0) {
        nextRestockedAt = nextModifiedAt;
      }
      stockHistoryExpiryDate = normalizedDeductStock > 0 ? "" : nextNewStockDate;
      stockHistoryLabel =
        displayBatchRole === "expired"
          ? (
              normalizedAddStock > 0
                ? "Added Expired Stock"
                : normalizedDeductStock > 0
                  ? "Deducted Expired Stock"
                  : normalizedExpiryDate !== resolvedNewStockExpiryDate
                    ? "Edit Expiry Date"
                    : "Saved Expired Stock"
            )
          : (
              normalizedAddStock > 0
                ? "Added New Stock"
                : normalizedDeductStock > 0
                  ? "Deducted New Stock"
                  : normalizedExpiryDate !== resolvedNewStockExpiryDate
                    ? "Edit Expiry Date"
                    : "Saved New Stock"
            );
      stockHistoryBatchRole = displayBatchRole;
    }
  } else {
    const baseOldStock = normalizedAddStock > 0 ? currentStock : currentOldStock;
    updatedNewStock = normalizedAddStock > 0 ? normalizedAddStock : currentNewStock;
    let remainingDeductStock = normalizedDeductStock;

    const deductedFromNewStock = Math.min(updatedNewStock, remainingDeductStock);
    updatedNewStock -= deductedFromNewStock;
    remainingDeductStock -= deductedFromNewStock;

    updatedOldStock = Math.max(0, baseOldStock - remainingDeductStock);
    nextRestockedAt = normalizedAddStock > 0 ? nextModifiedAt : currentLastRestockedAt;
    nextStockedDate = normalizedAddStock > 0 ? nextRestockedAt : currentStockedDate;
    const baseOldStockExpiryDate = normalizedAddStock > 0
      ? (
          currentOldStock > 0
            ? currentOldStockExpiryDate || currentProductExpiryDate
            : currentProductExpiryDate
        )
      : (
          currentOldStock > 0
            ? (
                currentNewStock > 0
                  ? currentOldStockExpiryDate || currentProductExpiryDate
                  : normalizedExpiryDate || currentOldStockExpiryDate || currentProductExpiryDate
              )
            : ""
        );
    nextOldStockExpiryDate = updatedOldStock > 0 ? baseOldStockExpiryDate : "";
    const baseNewStockExpiryDate = normalizedAddStock > 0
      ? normalizedExpiryDate
      : (
          currentNewStock > 0
            ? normalizedExpiryDate || currentNewStockExpiryDate || currentProductExpiryDate
            : ""
        );
    nextNewStockDate = updatedNewStock > 0 ? baseNewStockExpiryDate : "";
    stockHistoryExpiryDate = normalizedDeductStock > 0 ? "" : normalizedExpiryDate;
    stockHistoryLabel =
      normalizedAddStock > 0
        ? (currentStock === 0 ? "New Stock" : "Added Stock")
        : normalizedDeductStock > 0
          ? "Deducted"
          : normalizedExpiryDate !== currentProductExpiryDate
            ? "Edit Expiry Date"
            : "Saved Stock";
  }

  const normalizedStock = updatedOldStock + updatedNewStock;
  if (normalizedStock < 0) {
    deductInput?.classList.add("is-error");
    window.setTimeout(() => deductInput?.classList.remove("is-error"), 1800);
    return false;
  }

  const oldBatchIsExpiredAfterSave =
    updatedOldStock > 0 && isExpiryDateValueExpired(nextOldStockExpiryDate);
  const newBatchIsExpiredAfterSave =
    updatedNewStock > 0 && isExpiryDateValueExpired(nextNewStockDate);
  const shouldSplitAfterSave =
    updatedOldStock > 0 &&
    updatedNewStock > 0 &&
    oldBatchIsExpiredAfterSave !== newBatchIsExpiredAfterSave;
  let stockHistoryRecordStock = normalizedStock;
  if (isSplitBatchEdit) {
    stockHistoryRecordStock = (displaySourceBatch || "old") === "old"
      ? updatedOldStock
      : updatedNewStock;
  } else if (normalizedAddStock > 0 && shouldSplitAfterSave) {
    stockHistoryRecordStock = updatedNewStock;
    stockHistoryBatchRole = newBatchIsExpiredAfterSave ? "expired" : "fresh";
    stockHistoryLabel = newBatchIsExpiredAfterSave ? "Added Expired Stock" : "Added New Stock";
  }

  const nextProductExpiryDate =
    shouldSplitAfterSave
      ? (
          oldBatchIsExpiredAfterSave
            ? nextNewStockDate
            : nextOldStockExpiryDate
        )
      : updatedNewStock > 0
        ? nextNewStockDate
        : updatedOldStock > 0
          ? nextOldStockExpiryDate
          : "";
  const restockMetadata = normalizedAddStock > 0 || hadRestockDetails
    ? {
        lastRestockPreviousStock: updatedOldStock,
        lastRestockPreviousExpiryDate: nextOldStockExpiryDate,
        lastRestockAddedStock: updatedNewStock,
        lastRestockedAt: nextRestockedAt,
        lastRestockExpiryDate: nextNewStockDate,
      }
    : {};
  const stockHistoryEntry = {
    id: stockHistoryRecordId,
    stock: stockHistoryRecordStock,
    addedQuantity: normalizedAddStock,
    deductedQuantity: normalizedDeductStock,
    expiryDate: stockHistoryExpiryDate,
    modifiedAt: nextModifiedAt,
    reason:
      normalizedDeductStock > 0
        ? (
            normalizedDeductReason === "other"
              ? normalizedDeductReasonDetail
              : getStockDeductReasonLabel(normalizedDeductReason) || ""
          )
        : "",
    label: stockHistoryLabel,
    ...(stockHistoryBatchRole ? { batchRole: stockHistoryBatchRole } : {}),
  };

  try {
    addStockInput?.classList.add("is-saving");
    deductInput?.classList.add("is-saving");
    deductReasonSelect?.classList.add("is-saving");
    deductReasonDetailInput?.classList.add("is-saving");
    expiryTrigger?.classList.add("is-saving");
    primaryButton?.classList.add("is-saving");
    if ("disabled" in (addStockInput ?? {})) {
      addStockInput.disabled = true;
    }
    if ("disabled" in (deductInput ?? {})) {
      deductInput.disabled = true;
    }
    if ("disabled" in (deductReasonSelect ?? {})) {
      deductReasonSelect.disabled = true;
    }
    if ("disabled" in (deductReasonDetailInput ?? {})) {
      deductReasonDetailInput.disabled = true;
    }
    if ("disabled" in (expiryTrigger ?? {})) {
      expiryTrigger.disabled = true;
    }
    if ("disabled" in (primaryButton ?? {})) {
      primaryButton.disabled = true;
    }
    if ("disabled" in (secondaryButton ?? {})) {
      secondaryButton.disabled = true;
    }

    const response = await fetch(`/api/products/${encodeURIComponent(sourceProduct.id)}`, {
      method: "PUT",
      headers: withStockAdminScopeHeaders({
        "Content-Type": "application/json",
      }),
      body: JSON.stringify(withStockAdminScopePayload({
        ...sourceProduct,
        ...restockMetadata,
        stockHistoryEntry,
        stockedDate: nextStockedDate,
        stock: normalizedStock,
        expiryDate: nextProductExpiryDate,
        __activityContext: "inventory",
        __activityTarget: inventoryActivityTarget,
        __activityInventoryChangeCount: inventoryActivityFocusTargets.length,
        __activityDisplayStockProductId: getStockProductIdentifier(activeDisplayProduct),
        __activityStockRecordId: stockHistoryRecordId,
        __activityStockRecordModifiedAt: nextModifiedAt,
        __activityActor: getStockActivityActor(),
      })),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.message || "Unable to save stock changes.");
    }

    const updatedProduct = {
      ...sourceProduct,
      ...(data?.product ?? {}),
      ...restockMetadata,
      inventoryStock: normalizedStock,
      stockedDate: nextStockedDate,
      stock: normalizedStock,
      expiryDate: nextProductExpiryDate,
    };

    currentStockProducts = currentStockProducts.map((candidate) =>
      String(candidate?.id ?? "").trim() === String(sourceProduct.id).trim()
        ? updatedProduct
        : candidate,
    );
    selectedStockProductId =
      (isSplitBatchEdit || shouldSplitAfterSave) && shouldSplitProductIntoStockDisplayCards(updatedProduct)
        ? getStockDisplayIdentifierForRole(
            updatedProduct,
            isSplitBatchEdit
              ? displayBatchRole
              : (newBatchIsExpiredAfterSave ? "expired" : "fresh"),
          )
        : getStockProductIdentifier(updatedProduct);
    editingStockProductId = "";
    removeStockEditModalOverlay();
    renderStockDashboard(currentStockProducts);
    broadcastStockProductsUpdated();
    openStockSuccessModal(`Saved "${updatedProduct.name || "product"}" stock changes successfully.`);
    return true;
  } catch (error) {
    console.error(error);
    primaryButton?.classList.add("is-error");
    window.setTimeout(() => primaryButton?.classList.remove("is-error"), 1800);
    return false;
  } finally {
    addStockInput?.classList.remove("is-saving");
    deductInput?.classList.remove("is-saving");
    deductReasonSelect?.classList.remove("is-saving");
    deductReasonDetailInput?.classList.remove("is-saving");
    expiryTrigger?.classList.remove("is-saving");
    primaryButton?.classList.remove("is-saving");
    if ("disabled" in (addStockInput ?? {})) {
      const parsedDeductInputValue = Number(deductInput?.value ?? 0);
      const shouldDisableAddStockInput =
        Number.isFinite(parsedDeductInputValue) && parsedDeductInputValue < 0;
      addStockInput.disabled = shouldDisableAddStockInput;
      addStockInput.classList.toggle("is-disabled", shouldDisableAddStockInput);
    }
    if ("disabled" in (deductInput ?? {})) {
      const parsedAddStockInputValue = Number(addStockInput?.value ?? 0);
      const shouldDisableDeductInput =
        Number.isFinite(parsedAddStockInputValue) && parsedAddStockInputValue > 0;
      deductInput.disabled = shouldDisableDeductInput;
      deductInput.classList.toggle("is-disabled", shouldDisableDeductInput);
    }
    if ("disabled" in (deductReasonSelect ?? {})) {
      const parsedDeductInputValue = Number(deductInput?.value ?? 0);
      const shouldEnableDeductReason =
        Number.isFinite(parsedDeductInputValue) && parsedDeductInputValue < 0;
      deductReasonSelect.disabled = !shouldEnableDeductReason;
      deductReasonSelect.classList.toggle("is-disabled", !shouldEnableDeductReason);
    }
    if ("disabled" in (deductReasonDetailInput ?? {})) {
      const parsedDeductInputValue = Number(deductInput?.value ?? 0);
      const shouldEnableDeductReasonDetail =
        Number.isFinite(parsedDeductInputValue)
        && parsedDeductInputValue < 0
        && normalizeStockDeductReason(deductReasonSelect?.value) === "other";
      deductReasonDetailInput.disabled = !shouldEnableDeductReasonDetail;
      deductReasonDetailInput.classList.toggle("is-disabled", !shouldEnableDeductReasonDetail);
    }
    if ("disabled" in (expiryTrigger ?? {})) {
      const parsedDeductInputValue = Number(deductInput?.value ?? 0);
      const shouldDisableExpiryTrigger =
        Number.isFinite(parsedDeductInputValue) && parsedDeductInputValue < 0;
      expiryTrigger.disabled = shouldDisableExpiryTrigger;
      expiryTrigger.classList.toggle("is-disabled", shouldDisableExpiryTrigger);
    }
    if ("disabled" in (primaryButton ?? {})) {
      primaryButton.disabled = false;
    }
    if ("disabled" in (secondaryButton ?? {})) {
      secondaryButton.disabled = false;
    }
  }
}

function renderStockDetails(product) {
  if (!stockDetailTitle || !stockDetailSubtitle || !stockDetailList) {
    return;
  }

  const stockDetailHeader = stockDetailTitle.closest(".stock-detail-panel__header");
  stockDetailList.replaceChildren();

  if (!product) {
    stockDetailHeader?.setAttribute("hidden", "true");
    stockDetailTitle.textContent = "";
    stockDetailSubtitle.textContent = "";
    stockDetailList.appendChild(createEmptyState("Select a product to view stock details."));
    return;
  }

  stockDetailHeader?.setAttribute("hidden", "true");
  const stock = getStock(product);
  stockDetailTitle.textContent = product.name || "Unnamed Product";
  stockDetailSubtitle.textContent = `${product.category || "General"} • ${formatUnits(stock)}`;
  stockDetailSubtitle.textContent = `${product.category || "General"} â€¢ ${formatUnits(stock)}`;
  stockDetailSubtitle.textContent = `${product.category || "General"} - ${formatUnits(stock)}`;
  const stockDetailRows = [];

  if (stock <= 0) {
    stockDetailRows.push(
      createInfoRow("Last Out of Stock", formatProductLastOutOfStock(product)),
    );
  }

  if (!stockDetailRows.length) {
    stockDetailRows.push(createEmptyState("No stock details available right now."));
  }

  stockDetailList.append(...stockDetailRows);
}

function createStockRecordTable(records) {
  const tableShell = document.createElement("div");
  tableShell.className = "stock-detail-panel__table-shell";

  const table = document.createElement("table");
  table.className = "stock-detail-table";

  const tableColumnGroup = document.createElement("colgroup");
  ["stocks", "quantity", "modified", "expiry", "reason", "label"].forEach((columnName) => {
    const column = document.createElement("col");
    column.className = `stock-detail-table__col stock-detail-table__col--${columnName}`;
    tableColumnGroup.appendChild(column);
  });

  const tableBody = document.createElement("tbody");
  for (const record of Array.isArray(records) ? records : []) {
    const normalizedRecordId = String(record?.recordId ?? "").trim();
    const normalizedRecordModifiedAt = String(record?.modifiedAt ?? "").trim();
    const normalizedProductId = String(record?.productId ?? "").trim();
    const normalizedStocksValue = String(record?.stocks ?? "").trim();
    const recordLabel = String(record?.label ?? "").trim();
    const isExpiryFocusRecord =
      isExpiryEditStockHistoryLabel(recordLabel) || normalizedStocksValue === "+0";
    const stockRecordFocusType = isExpiryFocusRecord
      ? "expiry"
      : normalizedStocksValue.startsWith("-")
        ? "deduct"
        : normalizedStocksValue.startsWith("+")
          ? "add"
          : "card";
    const row = document.createElement("tr");
    row.className = "stock-detail-table__row";
    row.tabIndex = -1;
    row.dataset.stockRecordFocusType = stockRecordFocusType;
    if (normalizedRecordId) {
      row.dataset.stockRecordId = normalizedRecordId;
    }
    if (normalizedRecordModifiedAt) {
      row.dataset.stockRecordModifiedAt = normalizedRecordModifiedAt;
    }
    if (normalizedProductId) {
      row.dataset.stockProductId = normalizedProductId;
    }

    const stocksCell = document.createElement("td");
    stocksCell.className = "stock-detail-table__cell stock-detail-table__cell--stocks";
    stocksCell.dataset.stockRecordFocusCell = "stocks";
    stocksCell.textContent = record?.stocks ?? "-";
    const stocksClassName = getStockRecordAdjustmentClassName(record?.stocks);
    if (stocksClassName) {
      stocksCell.classList.add(stocksClassName);
    }

    const quantityCell = document.createElement("td");
    quantityCell.className = "stock-detail-table__cell stock-detail-table__cell--quantity";
    quantityCell.textContent = record?.quantity ?? "-";

    const modifiedCell = document.createElement("td");
    modifiedCell.className = "stock-detail-table__cell stock-detail-table__cell--modified";
    modifiedCell.textContent = record?.modified ?? "-";

    const expiryCell = document.createElement("td");
    expiryCell.className = "stock-detail-table__cell stock-detail-table__cell--expiry";
    expiryCell.dataset.stockRecordFocusCell = "expiry";
    const expiryContent = document.createElement("div");
    expiryContent.textContent = record?.expireDate ?? "-";
    expiryCell.appendChild(expiryContent);
    if (String(record?.expiryMeta ?? "").trim()) {
      const expiryMeta = document.createElement("div");
      expiryMeta.className = "stock-detail-table__meta stock-detail-table__meta--warning";
      expiryMeta.textContent = String(record.expiryMeta).trim();
      expiryCell.appendChild(expiryMeta);
    }

    const reasonCell = document.createElement("td");
    reasonCell.className = "stock-detail-table__cell stock-detail-table__cell--reason";
    reasonCell.textContent = String(record?.reason ?? "").trim() || "-";

    const labelCell = document.createElement("td");
    labelCell.className = "stock-detail-table__cell stock-detail-table__cell--label";
    const labelContent = document.createElement("div");
    labelContent.className = "stock-detail-table__label-cell";
    if (recordLabel) {
      const labelPill = document.createElement("span");
      const labelClassName = getStockRecordLabelClassName(recordLabel);
      labelPill.className = labelClassName
        ? `stock-detail-table__label ${labelClassName}`
        : "stock-detail-table__label";
      labelPill.textContent = recordLabel;
      labelContent.appendChild(labelPill);
    }

    if (record?.canDelete && normalizedRecordId && normalizedProductId) {
      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className =
        "stock-detail-table__delete-button delete-button icon-action-button icon-action-button--danger";
      deleteButton.dataset.stockRecordDelete = "true";
      deleteButton.dataset.stockRecordId = normalizedRecordId;
      deleteButton.dataset.stockProductId = normalizedProductId;
      deleteButton.dataset.stockRecordLabel = recordLabel || "Stock Record";
      deleteButton.setAttribute(
        "aria-label",
        `Delete ${recordLabel || "stock record"}`,
      );
      deleteButton.title = `Delete ${recordLabel || "stock record"}`;
      deleteButton.innerHTML = `<i class="fa-solid fa-trash-can" aria-hidden="true"></i>`;
      labelContent.appendChild(deleteButton);
    }

    if (labelContent.childNodes.length) {
      labelCell.appendChild(labelContent);
    } else {
      labelCell.textContent = "-";
    }

    row.append(stocksCell, quantityCell, modifiedCell, expiryCell, reasonCell, labelCell);
    tableBody.appendChild(row);
  }

  table.append(tableColumnGroup, tableBody);
  tableShell.appendChild(table);
  return tableShell;
}

function formatStockAdjustmentValue(addedQuantity, deductedQuantity, options = {}) {
  const normalizedAddedQuantity = Number.isFinite(Number(addedQuantity))
    ? Math.max(0, Math.trunc(Number(addedQuantity)))
    : 0;
  const normalizedDeductedQuantity = Number.isFinite(Number(deductedQuantity))
    ? Math.max(0, Math.trunc(Number(deductedQuantity)))
    : 0;
  const { zeroAsPositive = false } = options;

  if (normalizedAddedQuantity > 0) {
    return `+${normalizedAddedQuantity}`;
  }

  if (normalizedDeductedQuantity > 0) {
    return `-${normalizedDeductedQuantity}`;
  }

  return zeroAsPositive ? "+0" : "0";
}

function formatStockRecordQuantityValue(value) {
  const normalizedValue = Number.isFinite(Number(value))
    ? Math.max(0, Math.trunc(Number(value)))
    : 0;
  return String(normalizedValue);
}

function getCurrentExpiredBatchStockCount(product) {
  const { oldStock, newStock } = getProductStockBreakdown(product);
  const oldExpiredStock = isExpiryDateValueExpired(getProductOldStockExpiryDate(product))
    ? oldStock
    : 0;
  const newExpiredStock = isExpiryDateValueExpired(
    getProductNewStockDate(product) ?? getProductExpiryDate(product),
  )
    ? newStock
    : 0;
  return oldExpiredStock + newExpiredStock;
}

function getSplitBatchRoleForSourceBatch(product, sourceBatch = "") {
  const splitDisplayConfig = getSplitStockDisplayConfig(product);
  if (!splitDisplayConfig) {
    return "";
  }

  if (splitDisplayConfig.expired.sourceBatch === sourceBatch) {
    return "expired";
  }

  if (splitDisplayConfig.fresh.sourceBatch === sourceBatch) {
    return "fresh";
  }

  return "";
}

function resolveStockHistoryRecordBatchRole(record, product) {
  const explicitBatchRole = normalizeStockHistoryBatchRole(record?.batchRole);
  if (explicitBatchRole) {
    return explicitBatchRole;
  }

  const normalizedLabel = normalizeStockHistoryLabel(record?.label, "");
  if (/expired stock/i.test(normalizedLabel)) {
    return "expired";
  }

  if (/(?:fresh|new) stock/i.test(normalizedLabel)) {
    return "fresh";
  }

  const splitRoleForOldBatch = getSplitBatchRoleForSourceBatch(product, "old");
  const splitRoleForNewBatch = getSplitBatchRoleForSourceBatch(product, "new");
  if (/^old stock$/i.test(normalizedLabel)) {
    return splitRoleForOldBatch || "expired";
  }

  if (/^new stock$/i.test(normalizedLabel)) {
    return splitRoleForNewBatch || "fresh";
  }

  const normalizedRecordExpiryDate = normalizeExpiryDateInputValue(record?.expiryDate);
  const normalizedOldStockExpiryDate = normalizeExpiryDateInputValue(getProductOldStockExpiryDate(product));
  const normalizedNewStockExpiryDate = normalizeExpiryDateInputValue(
    getProductNewStockDate(product) ?? getProductExpiryDate(product),
  );

  if (
    normalizedRecordExpiryDate &&
    normalizedNewStockExpiryDate &&
    normalizedRecordExpiryDate === normalizedNewStockExpiryDate
  ) {
    return splitRoleForNewBatch;
  }

  if (
    normalizedRecordExpiryDate &&
    normalizedOldStockExpiryDate &&
    normalizedRecordExpiryDate === normalizedOldStockExpiryDate
  ) {
    return splitRoleForOldBatch;
  }

  const hasAddedQuantity =
    Number.isFinite(Number(record?.addedQuantity)) && Number(record.addedQuantity) > 0;
  if (hasAddedQuantity && /^added stock$/i.test(normalizedLabel)) {
    return splitRoleForNewBatch;
  }

  return "";
}

function getStockHistoryRecordDisplayQuantity(record, product, batchRole = "") {
  const normalizedBatchRole = normalizeStockHistoryBatchRole(batchRole);
  const resolvedBatchRole = resolveStockHistoryRecordBatchRole(record, product);
  const explicitBatchRole = normalizeStockHistoryBatchRole(record?.batchRole);
  const normalizedRecordLabel = normalizeStockHistoryLabel(record?.label, "");

  if (
    normalizedBatchRole &&
    resolvedBatchRole === normalizedBatchRole &&
    !explicitBatchRole &&
    /^added stock$/i.test(normalizedRecordLabel)
  ) {
    const addedQuantity = Number(record?.addedQuantity ?? 0);
    return Number.isFinite(addedQuantity) && addedQuantity >= 0
      ? Math.trunc(addedQuantity)
      : 0;
  }

  const stock = Number(record?.stock ?? 0);
  return Number.isFinite(stock) && stock >= 0 ? Math.trunc(stock) : 0;
}

function buildStockRecordRows(product, options = {}) {
  const requestedBatchRole = normalizeStockHistoryBatchRole(options?.batchRole);
  const canDeleteRecords = options?.allowDelete !== false;
  const shouldShowSplitBatchLabels =
    Boolean(requestedBatchRole) || shouldSplitProductIntoStockDisplayCards(product);
  const shouldShowNearExpiryIndicator =
    !requestedBatchRole && !shouldSplitProductIntoStockDisplayCards(product);
  const hasCurrentExpiredBatchStock = getCurrentExpiredBatchStockCount(product) > 0;
  const stockHistoryRecords = getProductStockHistoryRecords(product)
    .filter((record) => {
      const resolvedBatchRole = resolveStockHistoryRecordBatchRole(record, product);
      if (resolvedBatchRole === "expired" && !hasCurrentExpiredBatchStock) {
        return false;
      }

      if (!requestedBatchRole) {
        return true;
      }

      return resolvedBatchRole === requestedBatchRole;
    });
  const productId = String(product?.id ?? "").trim();
  if (stockHistoryRecords.length) {
    let hasAssignedNewStockLabel = false;
    return stockHistoryRecords.map((record) => {
      const hasAddedQuantity =
        Number.isFinite(Number(record?.addedQuantity)) && Number(record.addedQuantity) > 0;
      const normalizedRecordLabel = normalizeStockHistoryLabel(record?.label, "Stock Record");
      const displayRecordLabel = getStockHistoryDisplayLabel(normalizedRecordLabel, "Stock Record");
      const isGenericAddedLabel = /^added stock$/i.test(normalizedRecordLabel);
      const isGenericDeductedLabel = /^deducted(?: stock)?$/i.test(normalizedRecordLabel);
      const isExpiryEditLabel = isExpiryEditStockHistoryLabel(normalizedRecordLabel);

      let nextLabel = "";
      if (shouldShowSplitBatchLabels && hasAddedQuantity && isGenericAddedLabel) {
        nextLabel = hasAssignedNewStockLabel ? "Old Stock" : "New Stock";
        hasAssignedNewStockLabel = true;
      }

      return {
        recordId: String(record?.id ?? "").trim(),
        modifiedAt: String(record?.modifiedAt ?? "").trim(),
        productId,
        canDelete: canDeleteRecords && Boolean(productId && String(record?.id ?? "").trim()),
        stocks: formatStockAdjustmentValue(record.addedQuantity, record.deductedQuantity, {
          zeroAsPositive: isExpiryEditLabel,
        }),
        quantity: formatStockRecordQuantityValue(
          getStockHistoryRecordDisplayQuantity(record, product, requestedBatchRole),
        ),
        modified: formatOptionalDateTime(record.modifiedAt, "Not recorded yet"),
        expireDate: record.expiryDate
          ? formatExpiryDateDisplay(record.expiryDate, "-")
          : "-",
        expiryMeta:
          shouldShowNearExpiryIndicator && isNearExpiryDateValue(record?.expiryDate)
            ? "Nearly Expired"
            : "",
        reason:
          hasAddedQuantity
            ? "-"
            : (
                Number(record?.deductedQuantity) > 0
                  ? normalizeStockDeductReasonDetail(record?.deductReason) || "-"
                  : "-"
              ),
        label:
          nextLabel
          || (
            Number(record?.deductedQuantity) > 0
              ? (isGenericDeductedLabel ? "Deducted" : displayRecordLabel)
              : displayRecordLabel
          ),
      };
    });
  }

  if (requestedBatchRole) {
    return [];
  }

  const stock = getStock(product);
  const currentModifiedDate = getProductModifiedDate(product);
  const addedQuantity = getProductLastAddedStockQuantity(product);
  const deductedQuantity = getProductLastDeductedStockQuantity(product);
  return [
    {
      recordId: "",
      modifiedAt: String(currentModifiedDate ?? "").trim(),
      productId,
      canDelete: false,
      stocks: formatStockAdjustmentValue(addedQuantity, deductedQuantity),
      quantity: formatStockRecordQuantityValue(stock),
      modified: formatOptionalDateTime(currentModifiedDate, "Not recorded yet"),
      expireDate:
        stock > 0
          ? formatExpiryDateDisplay(getProductExpiryDate(product), "-")
          : "-",
      expiryMeta:
        shouldShowNearExpiryIndicator && stock > 0 && isNearExpiryProduct(product)
          ? "Nearly Expired"
          : "",
      reason: "-",
      label: addedQuantity > 0 ? "New Stock" : "",
    },
  ];
}

function buildEmployeeStockDetailRows(product) {
  const sourceProduct = getStockSourceProduct(product);
  const stock = getStock(product);
  const isExpiredBatch = isExpiredStockDisplayEntry(product);
  const isFreshBatch = isFreshStockDisplayEntry(product);
  const isSplitBatchEntry = isSplitStockDisplayEntry(product);
  const statusLabel = isExpiredBatch || isExpiredProduct(product)
    ? "Expired"
    : isNearExpiryProduct(product)
      ? "Near Expiry"
      : getStockState(stock).label;
  const rows = [
    createInfoRow("Current Stock", formatUnits(stock)),
    createInfoRow("Status", statusLabel),
    createInfoRow(
      getProductStockedDateLabel(product),
      formatOptionalDateTime(getProductStockedDate(product)),
    ),
    createInfoRow(
      "Last Updated",
      formatOptionalDateTime(getProductModifiedDate(sourceProduct)),
    ),
  ];

  if (isSplitBatchEntry) {
    const batchLabel = isExpiredBatch
      ? "Expired Batch"
      : (product?.stockDisplayLabel || (isFreshBatch ? "Fresh Batch" : "Available Batch"));
    rows.splice(2, 0, createInfoRow("Batch", batchLabel));
  }

  const expiryDate = getProductExpiryDate(product);
  if (stock > 0 || String(expiryDate ?? "").trim()) {
    rows.push(
      createInfoRow("Expiry Date", formatExpiryDateDisplay(expiryDate, "-")),
    );
  }

  if (stock <= 0) {
    rows.push(
      createInfoRow("Last Out of Stock", formatProductLastOutOfStock(sourceProduct)),
    );
  }

  return rows;
}

function renderStockDetails(product) {
  if (!stockDetailTitle || !stockDetailSubtitle || !stockDetailList) {
    return;
  }

  const stockDetailHeader = stockDetailTitle.closest(".stock-detail-panel__header");
  stockDetailList.replaceChildren();

  if (!product) {
    stockDetailHeader?.setAttribute("hidden", "true");
    stockDetailTitle.textContent = "";
    stockDetailSubtitle.textContent = "";
    stockDetailList.appendChild(
      createEmptyState(
        isEmployeeStockWorkspace()
          ? "Select a product to view current stock summary."
          : "Select a product to view stock details.",
      ),
    );
    return;
  }

  stockDetailHeader?.setAttribute("hidden", "true");
  const stock = getStock(product);
  const sourceProduct = getStockSourceProduct(product);
  const isExpiredBatch = isExpiredStockDisplayEntry(product);
  const isFreshBatch = isFreshStockDisplayEntry(product);
  stockDetailTitle.textContent = product.name || "Unnamed Product";

  if (isEmployeeStockWorkspace()) {
    stockDetailSubtitle.textContent = `${product.category || "General"} - record view`;
    stockDetailList.append(...buildEmployeeStockDetailRows(product));
    const employeeStockRecordRows = buildStockRecordRows(sourceProduct, {
      allowDelete: false,
      batchRole: isSplitStockDisplayEntry(product) ? getStockDisplayBatchRole(product) : "",
    });
    if (employeeStockRecordRows.length) {
      stockDetailList.appendChild(createStockRecordTable(employeeStockRecordRows));
    }
    return;
  }

  if (isSplitStockDisplayEntry(product)) {
    const batchLabel = isExpiredBatch
      ? "Expired Batch"
      : (product?.stockDisplayLabel || (isFreshBatch ? "Fresh Batch" : "Available Batch"));
    stockDetailSubtitle.textContent = `${product.category || "General"} - ${batchLabel}`;
    stockDetailList.append(
      createInfoRow("Batch", batchLabel),
    );

    const stockRecordRows = buildStockRecordRows(sourceProduct, {
      batchRole: getStockDisplayBatchRole(product),
    });
    if (stockRecordRows.length) {
      stockDetailList.appendChild(createStockRecordTable(stockRecordRows));
    } else {
      stockDetailList.appendChild(createEmptyState("No stock records available for this batch."));
    }
    return;
  }

  stockDetailSubtitle.textContent = `${product.category || "General"} - record view`;

  const stockRecordRows = buildStockRecordRows(product);
  if (!stockRecordRows.length) {
    stockDetailList.appendChild(createEmptyState("No stock records available right now."));
    return;
  }

  stockDetailList.appendChild(createStockRecordTable(stockRecordRows));
}

function renderStockDashboard(products = currentStockProducts) {
  const displayProducts = getStockDisplayProducts(products);
  const filteredProducts = getFilteredStockProducts(displayProducts);
  if (
    editingStockProductId &&
    !filteredProducts.some(
      (product) => getStockProductIdentifier(product) === editingStockProductId,
    )
  ) {
    editingStockProductId = "";
  }

  const selectedProduct = syncSelectedStockProduct(filteredProducts);
  if (
    selectedProduct &&
    editingStockProductId &&
    getStockProductIdentifier(selectedProduct) !== editingStockProductId
  ) {
    editingStockProductId = "";
  }
  if (!editingStockProductId) {
    removeStockEditModalOverlay();
  }
  syncStockPriorityFilterButtons();
  setSummary(filteredProducts);
  renderProducts(filteredProducts);
  renderStockDetails(selectedProduct);
}

async function loadStockData() {
  try {
    if (stockRefreshButton) {
      stockRefreshButton.disabled = true;
      stockRefreshButton.classList.add("is-spinning");
    }
    const response = await fetch("/api/products", {
      cache: "no-store",
      headers: withStockAdminScopeHeaders({ Accept: "application/json" }),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to load saved products.");
    }

    currentStockProducts = Array.isArray(data.products) ? data.products : [];
    renderStockCategoryFilterOptions(currentStockProducts);
    preparePendingStockNotificationFocusSelection();
    renderStockDashboard(currentStockProducts);
    window.requestAnimationFrame(applyPendingStockNotificationFocus);
  } catch (error) {
    console.error(error);
    stockProductList.replaceChildren(createEmptyState("Unable to load stock data right now."));
    stockPriorityList?.replaceChildren(createEmptyState("Unable to load restock data right now."));
    stockCategoryList?.replaceChildren(createEmptyState("Unable to load category data right now."));
    setSummaryValue(stockTotalProducts, 0);
    setSummaryValue(stockTotalUnits, 0);
    setSummaryValue(stockLowCount, 0);
    setSummaryValue(stockEmptyCount, 0);
    setSummaryValue(stockNearExpiryCount, 0);
  } finally {
    if (stockRefreshButton) {
      stockRefreshButton.disabled = false;
      stockRefreshButton.classList.remove("is-spinning");
    }
  }
}

stockSearchInput?.addEventListener("input", () => {
  window.clearTimeout(stockSearchTimer);
  stockSearchTimer = window.setTimeout(() => {
    stockSearchTerm = normalizeStockSearchTerm(stockSearchInput.value);
    renderStockDashboard(currentStockProducts);
  }, 500);
});

stockCategoryFilterTrigger?.addEventListener("click", () => {
  setStockCategoryFilterOpen(stockCategoryFilterMenu?.hidden ?? true);
});

stockPriorityFilterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    stockPriorityFilter = normalizeStockPriorityFilter(button?.dataset?.stockPriorityFilter);
    editingStockProductId = "";
    renderStockDashboard(currentStockProducts);
  });
});

function syncStockMonitorControlsScrollState() {
  if (!(stockListShell instanceof HTMLElement) || !(stockProductList instanceof HTMLElement)) {
    return;
  }

  stockListShell.classList.toggle("is-stock-list-scrolled", stockProductList.scrollTop > 4);
}

function setupStockMonitorControlsScrollAnimation() {
  if (!(stockMonitorControlsPanel instanceof HTMLElement) || !(stockProductList instanceof HTMLElement)) {
    return;
  }

  let frameId = 0;

  const requestScrollStateSync = () => {
    if (frameId) {
      return;
    }

    frameId = window.requestAnimationFrame(() => {
      frameId = 0;
      syncStockMonitorControlsScrollState();
    });
  };

  stockProductList.addEventListener("scroll", requestScrollStateSync, { passive: true });
  syncStockMonitorControlsScrollState();
}

stockProductList?.addEventListener("click", (event) => {
  if (isEmbeddedLiveChatStockWorkspace()) {
    return;
  }

  const card = event.target.closest(".stock-product-card[data-stock-product-id]");
  if (!card || !stockProductList.contains(card)) {
    return;
  }

  selectedStockProductId = String(card.dataset.stockProductId ?? "").trim();
  editingStockProductId = "";
  removeStockEditModalOverlay();
  renderStockDashboard(currentStockProducts);
});

stockProductList?.addEventListener("keydown", (event) => {
  if (isEmbeddedLiveChatStockWorkspace()) {
    return;
  }

  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  const card = event.target.closest(".stock-product-card[data-stock-product-id]");
  if (!card || !stockProductList.contains(card)) {
    return;
  }

  event.preventDefault();
  selectedStockProductId = String(card.dataset.stockProductId ?? "").trim();
  editingStockProductId = "";
  removeStockEditModalOverlay();
  renderStockDashboard(currentStockProducts);
});

stockDetailList?.addEventListener("click", (event) => {
  if (isEmployeeStockWorkspace()) {
    return;
  }

  if (!(event.target instanceof Element)) {
    return;
  }

  const deleteButton = event.target.closest("[data-stock-record-delete]");
  if (!deleteButton || !stockDetailList.contains(deleteButton)) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  openStockDeleteConfirmationModal(
    deleteButton.dataset.stockProductId,
    deleteButton.dataset.stockRecordId,
    deleteButton,
    deleteButton.dataset.stockRecordLabel,
  );
});

stockRefreshButton?.addEventListener("click", loadStockData);
document.addEventListener("click", (event) => {
  if (
    stockCategoryFilterDropdown
    && event.target instanceof Node
    && !stockCategoryFilterDropdown.contains(event.target)
  ) {
    setStockCategoryFilterOpen(false);
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && stockCategoryFilterMenu && !stockCategoryFilterMenu.hidden) {
    setStockCategoryFilterOpen(false);
    stockCategoryFilterTrigger?.focus();
  }
});
window.addEventListener("storage", (event) => {
  if (event.key !== STOCK_PRODUCTS_UPDATED_STORAGE_KEY) {
    return;
  }

  loadStockData();
});
window.addEventListener("gms:products-updated", loadStockData);
applyStockWorkspaceRole();
syncStockCategoryFilterSummary();
setupStockMonitorControlsScrollAnimation();
loadStockData();  
