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
const stockNewCount = document.getElementById("stock-new-count");
const stockLowCount = document.getElementById("stock-low-count");
const stockEmptyCount = document.getElementById("stock-empty-count");
const stockNearExpiryCount = document.getElementById("stock-near-expiry-count");
const stockExpiredCount = document.getElementById("stock-expired-count");
const stockRefreshButton = document.getElementById("stock-refresh-button");
const stockRecordHeadings = document.querySelector(".stock-record-headings");
const stockRecordDrawerTitle = document.querySelector("[data-stock-record-drawer-title]");
const stockRecordDrawerSubtitle = document.querySelector("[data-stock-record-drawer-subtitle]");
const stockRecordDrawerIcon = document.querySelector(".stock-record-drawer-titlebar__icon");
const stockRecordDrawerCloseButtons = Array.from(
  document.querySelectorAll("[data-stock-record-drawer-close]"),
);
const stockRecordDrawerBackdrop = document.querySelector(".stock-record-drawer-backdrop");
const stockRecordDrawerPanel = document.querySelector(".stock-detail-panel");
const stockRecordBatchFilterHost = document.querySelector("[data-stock-record-batch-filter]");
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
const stockInventoryPagination = document.querySelector("[data-stock-inventory-pagination]");
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
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-building2-icon lucide-building-2" aria-hidden="true">
      <path d="M10 12h4"></path><path d="M10 8h4"></path><path d="M14 21v-3a2 2 0 0 0-4 0v3"></path><path d="M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2"></path><path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"></path>
    </svg>`;
}

const STOCK_METER_MAX = 50;
const STOCK_INVENTORY_PAGE_SIZE = 6;
const stockSquarePenIconMarkup = '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-square-pen-icon lucide-square-pen"><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"/></svg>';
const STOCK_ADD_ACTION_ICON_MARKUP = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14"/><path d="M5 12h14"/></svg>';
const STOCK_DEDUCT_ACTION_ICON_MARKUP = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/></svg>';
const STOCK_ACTIVITY_ACTION_ICON_MARKUP = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>';
const STOCK_DELETE_ACTION_ICON_MARKUP = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
const STOCK_NEAR_EXPIRY_REASON_ICON_MARKUP = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>';
const STOCK_EXPIRY_DETAILS_ICON_MARKUP = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-calendar-days-icon lucide-calendar-days" aria-hidden="true"><path d="M8 2v3"/><path d="M16 2v3"/><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M8 13h.01"/><path d="M12 13h.01"/><path d="M16 13h.01"/><path d="M8 17h.01"/><path d="M12 17h.01"/><path d="M16 17h.01"/></svg>';
const STOCK_EXPIRED_REASON_ICON_MARKUP = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>';
const STOCK_NEW_WINDOW_DAYS = 7;
const STOCK_NEAR_EXPIRY_WINDOW_DAYS = 365;
const STOCK_SELL_PRIORITY_LOCK_DAYS = 3;
const STOCK_SNACKBAR_AUTO_DISMISS_MS = 15000;
const STOCK_TIME_ZONE = "Asia/Singapore";
const STOCK_TIME_ZONE_OFFSET_MINUTES = 8 * 60;
const STOCK_WORKSPACE_ROLE_QUERY_PARAM = "role";
const STOCK_MAIN_INVENTORY_QUERY_PARAM = "main_inventory";
const STOCK_WORKSPACE_ROLES = Object.freeze({
  ADMIN: "admin",
  EMPLOYEE: "employee",
});
const STOCK_EMPLOYEE_WORKSPACE_PERMISSION_BY_PATH = Object.freeze({
  "/stock.html": "admin-inventory",
  "/main_inventory_embed.html": "admin-inventory",
  "/employee_stock.html": "employee-inventory",
});
const STOCK_EMPLOYEE_REFERRER_PATTERN = /\/(?:employee_dashboard|face_verfication)\.html(?:[?#]|$)/i;
const STOCK_EMPLOYEE_PAGE_PATH_PATTERN = /\/employee_stock\.html$/i;
const STOCK_EMBEDDED_LIVE_CHAT_SELECTOR = ".live-chat-shell";
let embeddedMainInventoryAdminId = "";
let embeddedMainInventorySessionToken = "";
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
let hasLoadedStockData = false;
let stockSearchTerm = "";
let stockSearchTimer = 0;
let stockRealtimeRefreshTimer = 0;
let stockRealtimeRefreshInFlight = false;
let stockRealtimeRefreshQueued = false;
let stockCategoryFilter = "";
let stockPriorityFilter = "all";
let selectedStockProductId = "";
let editingStockProductId = "";
let stockInventoryPage = 1;
let stockEditModalClockIntervalId = 0;
let stockActionDropdown = null;
let stockActionDropdownToggle = null;
let stockActionDropdownCard = null;
let stockActionDropdownMode = "";
let stockNearExpiryOverlay = null;
let stockNearExpiryOverlayToggle = null;
let stockNearExpiryOverlayCard = null;
let stockNearExpiryDisclosureSerial = 0;
let closeOpenStockDeductReasonMenu = null;
let stockDeductReasonDropdownSerial = 0;
let stockDeductBatchDropdownSerial = 0;
let stockRecordDrawerMode = "records";
let stockRecordBatchFilterKey = "all";
let stockRecordBatchFilterSerial = 0;
let closeOpenStockRecordBatchFilterMenu = null;
let stockDeleteModalElements = null;
let stockSuccessModalElements = null;
let stockSuccessAutoCloseTimer = 0;
let stockSuccessAnimation = null;
let stockSuccessLottieLoadPromise = null;
let stockDeleteSuccessAudio = null;
let stockEditorSnackbarElements = null;
let stockEditorSnackbarTimer = 0;
let activeStockWorkspaceRole = resolveStockWorkspaceRole();
let pendingStockNotificationFocusRequest = resolveInitialStockNotificationFocusRequest();
let stockNotificationFocusTimer = 0;
let stockNotificationFocusTimers = [];
let stockNotificationFocusSpotlightFrame = 0;
const stockRealtimeTopics = new Set([
  "all",
  "products",
  "product-requests",
  "inventory",
  "orders",
]);
let stockIgnoreRealtimeRefreshUntil = 0;

function suppressStockRealtimeRefresh(durationMs = 1600) {
  stockIgnoreRealtimeRefreshUntil = Date.now() + Math.max(0, Number(durationMs) || 0);
}

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

function isMainInventoryStockWorkspace() {
  const searchParams = new URLSearchParams(window.location.search);
  return (
    searchParams.get(STOCK_MAIN_INVENTORY_QUERY_PARAM) === "1" ||
    document.body?.classList.contains("stock-main-inventory-embedded")
  );
}

function isStockInventoryTableWorkspace() {
  return Boolean(
    isMainInventoryStockWorkspace()
    || document.body?.classList.contains("stock-employee-inventory-table-view"),
  );
}

function activateEmployeeInventoryTableMode() {
  const searchParams = new URLSearchParams(window.location.search);
  if (
    searchParams.get("employee_inventory_table") !== "1"
    && !isEmployeeStockPagePath(window.location.pathname)
  ) {
    return false;
  }

  document.body?.classList.add(
    "stock-employee-inventory-table-view",
    "stock-inventory-table-view",
  );
  return true;
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

function isAdminInventoryPagePath(pathname = window.location.pathname) {
  const normalizedPath = String(pathname ?? "").trim().toLowerCase();
  return normalizedPath === "/stock.html" || normalizedPath === "/main_inventory_embed.html";
}

function buildStockWorkspaceUrl(role = activeStockWorkspaceRole) {
  return normalizeStockWorkspaceRole(role) === STOCK_WORKSPACE_ROLES.EMPLOYEE
    ? "/employee_stock.html"
    : "/main.html#inventory";
}

function isEmployeeStockWorkspace() {
  return activeStockWorkspaceRole === STOCK_WORKSPACE_ROLES.EMPLOYEE;
}

function readStockSessionStorageJson(key) {
  const readFromStorage = (storage) => {
    try {
      const parsed = JSON.parse(storage?.getItem(key) || "null");
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (error) {
      return null;
    }
  };

  const localValue = readFromStorage(window.sessionStorage);
  if (localValue) {
    return localValue;
  }

  if (window.parent !== window) {
    try {
      if (window.parent.location.origin === window.location.origin) {
        return readFromStorage(window.parent.sessionStorage);
      }
    } catch (error) {
      return null;
    }
  }

  return null;
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

function rememberEmbeddedMainInventoryAuth(adminId, sessionToken = "") {
  const normalizedAdminId = normalizeStockAdminTenantId(adminId, "");
  if (!isUsableStockAdminTenantId(normalizedAdminId)) {
    return false;
  }

  embeddedMainInventoryAdminId = normalizedAdminId;
  embeddedMainInventorySessionToken = String(sessionToken ?? "").trim();

  try {
    window.localStorage?.setItem("gms-admin-id", normalizedAdminId);
  } catch (error) {
    // Ignore storage failures in embedded mode.
  }

  return true;
}

function getActiveStockAdminTenantId() {
  if (
    isMainInventoryStockWorkspace()
    && isUsableStockAdminTenantId(embeddedMainInventoryAdminId)
  ) {
    return embeddedMainInventoryAdminId;
  }

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

  if (isAdminInventoryPagePath(pathname) && explicitRole === STOCK_WORKSPACE_ROLES.ADMIN) {
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
      isEmployeeWorkspace ? "/employee_dashboard.html" : "/main.html#inventory",
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
    href: isEmployeeWorkspace ? "/employee_dashboard.html" : "/main.html#dashboard",
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
  const hasEditModal = Boolean(document.querySelector(".stock-edit-modal-overlay"));
  const hasOpenModal = Boolean(
    hasEditModal
    || document.querySelector(".stock-delete-modal-overlay:not([hidden])")
    || document.querySelector(".stock-success-modal-overlay:not([hidden])"),
  );
  document.body.classList.toggle("modal-open", hasOpenModal);
  notifyMainInventoryStockEditModalState(hasEditModal);
}

function setSummaryValue(element, value) {
  if (!element) {
    return;
  }

  element.textContent = String(value);
}

function activateMainInventoryStockMode() {
  if (!isMainInventoryStockWorkspace()) {
    return false;
  }

  document.body.classList.add(
    "stock-main-inventory-embedded",
    "stock-inventory-table-view",
    "stock-record-modal-surface",
  );
  document.querySelector(".stock-summary-grid")?.classList.add("super-admin-stats");
  return true;
}

function notifyMainInventoryStockRecordModalState(isOpen) {
  if (window.parent === window) {
    return;
  }

  window.parent.postMessage(
    {
      type: "gms-main-inventory-stock-record-modal-state",
      isOpen: Boolean(isOpen),
    },
    window.location.origin,
  );
}

function notifyMainInventoryStockEditModalState(isOpen) {
  if (window.parent === window) {
    return;
  }

  window.parent.postMessage(
    {
      type: "gms-main-inventory-stock-edit-modal-state",
      isOpen: Boolean(isOpen),
    },
    window.location.origin,
  );
}

function setStockRecordDrawerOpen(isOpen) {
  if (!activateMainInventoryStockMode()) {
    return;
  }

  const shouldOpen = Boolean(isOpen);
  document.body.classList.toggle("stock-record-drawer-open", shouldOpen);
  if (stockRecordDrawerBackdrop instanceof HTMLElement) {
    stockRecordDrawerBackdrop.hidden = !shouldOpen;
  }
  if (stockRecordDrawerPanel instanceof HTMLElement) {
    stockRecordDrawerPanel.setAttribute("aria-hidden", shouldOpen ? "false" : "true");
  }
  notifyMainInventoryStockRecordModalState(shouldOpen);
}

function renderStockRecordDrawerIcon(product) {
  if (!stockRecordDrawerIcon) {
    return;
  }

  stockRecordDrawerIcon.innerHTML = "";
  if (product?.imageUrl) {
    const image = document.createElement("img");
    image.src = product.imageUrl;
    image.alt = product.name ? `${product.name} image` : "Product image";
    image.loading = "lazy";
    image.decoding = "async";
    image.addEventListener("error", () => {
      stockRecordDrawerIcon.innerHTML = stockSquarePenIconMarkup;
    });
    stockRecordDrawerIcon.appendChild(image);
    return;
  }

  stockRecordDrawerIcon.innerHTML = stockSquarePenIconMarkup;
}

function isStockMovementDrawerMode() {
  return stockRecordDrawerMode === "movement";
}

function syncStockRecordDrawer(product, subtitleOverride = "") {
  const hasProduct = Boolean(product);
  const isMovementView = hasProduct && isStockMovementDrawerMode();
  if (stockRecordDrawerPanel instanceof HTMLElement) {
    stockRecordDrawerPanel.classList.toggle("is-movement-view", isMovementView);
  }
  if (stockRecordDrawerTitle) {
    stockRecordDrawerTitle.textContent = isMovementView ? "Stock Movement" : "Stock Records";
  }
  if (stockRecordDrawerSubtitle) {
    stockRecordDrawerSubtitle.textContent = hasProduct
      ? `${product.name || "Unnamed Product"} - ${
        subtitleOverride
        || (isMovementView
          ? `${product.category || "General"} add stock history`
          : `${product.category || "General"} record list`)
      }`
      : isStockMovementDrawerMode()
        ? "Select a product to review its added stock history."
        : "Select a product to review its stock history.";
  }
  renderStockRecordDrawerIcon(product);
  if (!hasProduct) {
    stockRecordBatchFilterKey = "all";
  }
  syncStockRecordBatchFilterControl(product);
  if (!activateMainInventoryStockMode()) {
    return;
  }
  setStockRecordDrawerOpen(hasProduct);
}

function getStockRecordBatchFilterLabel(expiryDate) {
  return hasStockExpiryDate(expiryDate)
    ? formatExpiryDateDisplay(expiryDate, "Dated batch")
    : "No expiry date";
}

function getStockRecordBatchFilterOptions(product) {
  const options = [{ key: "all", label: "All" }];
  const seen = new Set(["all"]);

  const addOption = (expiryDate) => {
    const key = getInventoryExpiryBatchKey(expiryDate);
    if (!key || seen.has(key)) {
      return;
    }
    seen.add(key);
    options.push({
      key,
      label: getStockRecordBatchFilterLabel(expiryDate),
      expiryDate: hasStockExpiryDate(expiryDate) ? String(expiryDate).trim() : "",
    });
  };

  getInventoryExpiryBatches(product).forEach((batch) => {
    addOption(batch?.expiryDate);
  });
  getProductStockHistoryRecords(product).forEach((record) => {
    addOption(record?.expiryDate);
  });

  const [allOption, ...batchOptions] = options;
  batchOptions.sort((left, right) => {
    const leftIsUndated = left.key === "none";
    const rightIsUndated = right.key === "none";
    if (leftIsUndated !== rightIsUndated) {
      return leftIsUndated ? -1 : 1;
    }
    const leftDay = getLocalDateStartTimestamp(left.expiryDate);
    const rightDay = getLocalDateStartTimestamp(right.expiryDate);
    return (Number.isFinite(leftDay) ? leftDay : Number.MAX_SAFE_INTEGER)
      - (Number.isFinite(rightDay) ? rightDay : Number.MAX_SAFE_INTEGER);
  });
  return [allOption, ...batchOptions];
}

function countStockRecordBatchFilterBatches(product) {
  return Math.max(0, getStockRecordBatchFilterOptions(product).length - 1);
}

function productHasStockRecordBatchFilter(product) {
  // Only offer batch sorting when there are at least 2 distinct expiry batches.
  return countStockRecordBatchFilterBatches(product) >= 2;
}

function getActiveStockRecordDisplayProduct() {
  if (!selectedStockProductId) {
    return null;
  }
  const displayProducts = getStockDisplayProducts(currentStockProducts);
  return displayProducts.find(
    (product) => getStockProductIdentifier(product) === selectedStockProductId,
  ) || null;
}

function closeStockRecordBatchFilterMenu() {
  if (typeof closeOpenStockRecordBatchFilterMenu === "function") {
    closeOpenStockRecordBatchFilterMenu();
  }
}

function syncStockRecordBatchFilterControl(product) {
  if (!(stockRecordBatchFilterHost instanceof HTMLElement)) {
    return;
  }

  closeStockRecordBatchFilterMenu();
  stockRecordBatchFilterHost.replaceChildren();
  stockRecordBatchFilterHost.hidden = true;

  if (!product || !activateMainInventoryStockMode()) {
    stockRecordBatchFilterKey = "all";
    delete stockRecordBatchFilterHost.dataset.stockRecordFilterProductId;
    return;
  }

  const productIdentifier = getStockProductIdentifier(product);
  if (
    stockRecordBatchFilterHost.dataset.stockRecordFilterProductId !== productIdentifier
  ) {
    stockRecordBatchFilterHost.dataset.stockRecordFilterProductId = productIdentifier;
    stockRecordBatchFilterKey = "all";
  }

  const filterOptions = getStockRecordBatchFilterOptions(product);
  // Hide sorting for single-batch / no-batch products so all records stay visible.
  if (!productHasStockRecordBatchFilter(product)) {
    stockRecordBatchFilterKey = "all";
    return;
  }

  if (!filterOptions.some((option) => option.key === stockRecordBatchFilterKey)) {
    stockRecordBatchFilterKey = "all";
  }

  const dropdownId = `stock-record-batch-filter-${++stockRecordBatchFilterSerial}`;
  const fieldGroup = document.createElement("div");
  fieldGroup.className = "stock-record-batch-filter__dropdown stock-deduct-reason-dropdown";

  const select = document.createElement("select");
  select.className = "stock-deduct-reason-dropdown__native";
  select.tabIndex = -1;
  select.setAttribute("aria-hidden", "true");
  filterOptions.forEach((option) => {
    const optionElement = document.createElement("option");
    optionElement.value = option.key;
    optionElement.textContent = option.label;
    select.appendChild(optionElement);
  });
  select.value = stockRecordBatchFilterKey;

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "stock-deduct-reason-dropdown__trigger stock-record-batch-filter__trigger";
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");
  trigger.setAttribute("aria-controls", `${dropdownId}-menu`);
  trigger.setAttribute("aria-label", "Filter stock records by batch");
  trigger.title = "Filter by batch";

  const triggerLabel = document.createElement("span");
  triggerLabel.className = "stock-deduct-reason-dropdown__label";

  const triggerIcon = document.createElement("span");
  triggerIcon.className = "stock-record-batch-filter__icon";
  triggerIcon.setAttribute("aria-hidden", "true");
  triggerIcon.innerHTML = STOCK_EXPIRY_DETAILS_ICON_MARKUP;

  const triggerArrow = document.createElement("span");
  triggerArrow.className = "stock-deduct-reason-dropdown__arrow";
  triggerArrow.setAttribute("aria-hidden", "true");
  triggerArrow.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"></path></svg>`;
  trigger.append(triggerIcon, triggerLabel, triggerArrow);

  const menu = document.createElement("div");
  menu.id = `${dropdownId}-menu`;
  menu.className = "stock-deduct-reason-dropdown__menu stock-record-batch-filter__menu";
  menu.setAttribute("role", "listbox");
  menu.setAttribute("aria-label", "Filter stock records by batch");
  menu.hidden = true;

  const optionButtons = filterOptions.map((option) => {
    const optionButton = document.createElement("button");
    optionButton.type = "button";
    optionButton.className = "stock-deduct-reason-dropdown__option";
    optionButton.dataset.batchFilterKey = option.key;
    optionButton.setAttribute("role", "option");
    optionButton.setAttribute("aria-selected", "false");
    optionButton.textContent = option.label;
    optionButton.addEventListener("click", () => {
      select.value = option.key;
      setBatchMenuOpen(false);
      applyStockRecordBatchFilter(option.key);
      trigger.focus();
    });
    menu.appendChild(optionButton);
    return optionButton;
  });

  function syncBatchFilterUi() {
    const currentValue = String(select.value || "all");
    const selectedOption = filterOptions.find((option) => option.key === currentValue)
      || filterOptions[0];
    triggerLabel.textContent = selectedOption?.label || "All";
    optionButtons.forEach((optionButton) => {
      const isSelected = optionButton.dataset.batchFilterKey === currentValue;
      optionButton.classList.toggle("is-selected", isSelected);
      optionButton.setAttribute("aria-selected", isSelected ? "true" : "false");
    });
  }

  function setBatchMenuOpen(isOpen) {
    const nextOpen = Boolean(isOpen);
    fieldGroup.classList.toggle("is-open", nextOpen);
    trigger.setAttribute("aria-expanded", nextOpen ? "true" : "false");
    menu.hidden = !nextOpen;
    if (nextOpen) {
      if (
        typeof closeOpenStockRecordBatchFilterMenu === "function"
        && closeOpenStockRecordBatchFilterMenu !== closeThisMenu
      ) {
        closeOpenStockRecordBatchFilterMenu();
      }
      closeOpenStockRecordBatchFilterMenu = closeThisMenu;
      const selectedButton = optionButtons.find((button) => button.classList.contains("is-selected"));
      window.requestAnimationFrame(() => (selectedButton || optionButtons[0])?.focus());
    } else if (closeOpenStockRecordBatchFilterMenu === closeThisMenu) {
      closeOpenStockRecordBatchFilterMenu = null;
    }
  }

  function closeThisMenu() {
    setBatchMenuOpen(false);
  }

  function handlePointerDown(event) {
    if (!fieldGroup.isConnected) {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      return;
    }
    if (!fieldGroup.classList.contains("is-open")) {
      return;
    }
    if (event.target instanceof Node && fieldGroup.contains(event.target)) {
      return;
    }
    setBatchMenuOpen(false);
  }

  trigger.addEventListener("click", () => {
    setBatchMenuOpen(!fieldGroup.classList.contains("is-open"));
  });
  menu.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      setBatchMenuOpen(false);
      trigger.focus();
    }
  });
  document.addEventListener("pointerdown", handlePointerDown, true);

  fieldGroup.append(select, trigger, menu);
  stockRecordBatchFilterHost.appendChild(fieldGroup);
  stockRecordBatchFilterHost.hidden = false;
  syncBatchFilterUi();
}

function applyStockRecordBatchFilter(nextFilterKey) {
  const normalizedKey = String(nextFilterKey ?? "all").trim() || "all";
  if (stockRecordBatchFilterKey === normalizedKey) {
    return;
  }
  stockRecordBatchFilterKey = normalizedKey;
  const activeProduct = getActiveStockRecordDisplayProduct();
  if (activeProduct) {
    renderStockDetails(activeProduct);
  }
}

function filterStockRecordRowsByBatch(rows, filterKey = stockRecordBatchFilterKey, product = null) {
  const normalizedFilterKey = String(filterKey ?? "all").trim() || "all";
  const sourceRows = Array.isArray(rows) ? rows : [];
  // Products without multiple batches should always show the full record list.
  if (
    normalizedFilterKey === "all"
    || (product && !productHasStockRecordBatchFilter(product))
  ) {
    return sourceRows;
  }
  return sourceRows.filter((row) =>
    String(row?.expiryBatchKey ?? "") === normalizedFilterKey
  );
}

function closeStockRecordDrawer() {
  if (!isMainInventoryStockWorkspace()) {
    return;
  }

  if (document.body.classList.contains("stock-record-modal-closing")) {
    return;
  }

  const previouslySelectedProductId = selectedStockProductId;
  selectedStockProductId = "";
  editingStockProductId = "";
  stockRecordDrawerMode = "records";
  stockRecordBatchFilterKey = "all";
  closeStockRecordBatchFilterMenu();
  removeStockEditModalOverlay();
  closeStockActionDropdown();
  closeNearExpiryBatchOverlay();

  // Freeze the record surface and hide inventory underneath while the parent
  // modal animates out — prevents the inventory table flashing mid-close.
  document.body.classList.add("stock-record-modal-closing");
  notifyMainInventoryStockRecordModalState(false);
  if (stockRecordDrawerBackdrop instanceof HTMLElement) {
    stockRecordDrawerBackdrop.hidden = true;
  }

  window.setTimeout(() => {
    document.body.classList.remove(
      "stock-record-drawer-open",
      "stock-record-modal-closing",
    );
    if (stockRecordDrawerPanel instanceof HTMLElement) {
      stockRecordDrawerPanel.setAttribute("aria-hidden", "true");
      stockRecordDrawerPanel.classList.remove("is-movement-view");
    }

    const displayProducts = getStockDisplayProducts(currentStockProducts);
    const filteredProducts = getFilteredStockProducts(displayProducts);
    syncSelectedStockProduct(filteredProducts);
    syncStockPriorityFilterButtons();
    setSummary(filteredProducts);
    renderProducts(filteredProducts);

    if (!selectedStockProductId) {
      renderStockDetails(null);
    }

    window.requestAnimationFrame(() => {
      getStockProductCardElement(previouslySelectedProductId)?.focus();
    });
  }, 280);
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
    return categoryFilteredProducts.filter((product) =>
      isNearExpiryProduct(product)
      || groupNearExpiryInventoryBatches(product).length > 0,
    );
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

function isInventoryWarningTableView() {
  const filter = normalizeStockPriorityFilter(stockPriorityFilter);
  return filter === "near-expiry" || filter === "expired-product";
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
      stockInventoryPage = 1;
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

  return "";
}

function getProductBatchExpiryDate(product) {
  if (isSplitStockDisplayEntry(product)) {
    return String(getProductExpiryDate(product) ?? "").trim();
  }

  const newStockExpiryDate = getProductNewStockDate(product);
  const oldStockExpiryDate = getProductOldStockExpiryDate(product);
  const { oldStock, newStock } = getProductStockBreakdown(product);
  if (oldStock > 0 && newStock > 0) {
    if (newStockExpiryDate && !oldStockExpiryDate) {
      return newStockExpiryDate;
    }
    if (oldStockExpiryDate && !newStockExpiryDate) {
      return oldStockExpiryDate;
    }
    if (oldStockExpiryDate && newStockExpiryDate) {
      return isStockExpiryDateAhead(oldStockExpiryDate, newStockExpiryDate)
        ? oldStockExpiryDate
        : newStockExpiryDate;
    }
    return "";
  }

  return String(getProductExpiryDate(product) ?? "").trim();
}

function inferPreviousStockExpiryFromHistory(product) {
  const historyRecords = getProductStockHistoryRecords(product);
  if (!historyRecords.length) {
    return "";
  }

  const restockedAt = String(getProductLastRestockedDate(product) ?? "").trim();
  const restockedAtTimestamp = Date.parse(restockedAt);
  const candidateRecords = historyRecords
    .filter((record) => {
      const recordExpiryDate = String(record?.expiryDate ?? "").trim();
      if (!recordExpiryDate) {
        return false;
      }

      if (!Number.isFinite(restockedAtTimestamp)) {
        return true;
      }

      const recordTimestamp = Date.parse(String(record?.modifiedAt ?? "").trim());
      return !Number.isFinite(recordTimestamp) || recordTimestamp < restockedAtTimestamp;
    })
    .sort((left, right) => {
      const leftTimestamp = Date.parse(String(left?.modifiedAt ?? "").trim());
      const rightTimestamp = Date.parse(String(right?.modifiedAt ?? "").trim());
      return (Number.isFinite(rightTimestamp) ? rightTimestamp : 0) -
        (Number.isFinite(leftTimestamp) ? leftTimestamp : 0);
    });

  return String(candidateRecords[0]?.expiryDate ?? "").trim();
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
  const oldStockCount = getProductOldStockCount(product);
  const newStockCount = getProductNewStockCount(product);
  if (oldStockCount > 0 && newStockCount <= 0 && currentExpiryDate) {
    return currentExpiryDate;
  }

  if (oldStockCount > 0 && newStockCount > 0) {
    const inferredHistoryExpiryDate = inferPreviousStockExpiryFromHistory(product);
    if (inferredHistoryExpiryDate) {
      return inferredHistoryExpiryDate;
    }

    // Keep a usable previous expiry when restock meta lost the old date but the
    // product still carries one (prevents OK + expired stock from staying merged).
    if (currentExpiryDate) {
      const newStockExpiryDate = String(getProductNewStockDate(product) ?? "").trim();
      if (!newStockExpiryDate || newStockExpiryDate !== currentExpiryDate) {
        return currentExpiryDate;
      }
    }
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

  let storedOldStock = Math.max(0, getProductOldStockCount(product));
  let storedNewStock = Math.max(0, getProductNewStockCount(product));
  if (storedOldStock <= 0 && storedNewStock <= 0) {
    return {
      oldStock: totalStock,
      newStock: 0,
    };
  }

  const storedTotalStock = storedOldStock + storedNewStock;
  if (storedTotalStock > totalStock) {
    // Reconcile legacy records using the same priority order as app checkout.
    // Newer order movements update both totals and batch metadata atomically.
    let remainingToRemove = storedTotalStock - totalStock;
    const deductOldFirst = mapSellPriorityBatchKeyToOldNew(
      getSellPrioritySourceBatch(product),
      product,
    ) === "old";
    if (deductOldFirst) {
      const removedFromOldStock = Math.min(storedOldStock, remainingToRemove);
      storedOldStock -= removedFromOldStock;
      remainingToRemove -= removedFromOldStock;
      storedNewStock = Math.max(0, storedNewStock - remainingToRemove);
    } else {
      const removedFromNewStock = Math.min(storedNewStock, remainingToRemove);
      storedNewStock -= removedFromNewStock;
      remainingToRemove -= removedFromNewStock;
      storedOldStock = Math.max(0, storedOldStock - remainingToRemove);
    }
  }

  return {
    oldStock: storedOldStock,
    newStock: storedNewStock,
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
  if (!hasStockExpiryDate(value)) {
    return false;
  }

  const expiryDayStartTimestamp = getLocalDateStartTimestamp(value);
  if (!Number.isFinite(expiryDayStartTimestamp) || isExpiryDateValueExpired(value)) {
    return false;
  }

  const timeUntilExpiry = expiryDayStartTimestamp - getTodayStartTimestamp();
  return timeUntilExpiry >= 0 && timeUntilExpiry <= STOCK_NEAR_EXPIRY_WINDOW_DAYS * 24 * 60 * 60 * 1000;
}

function getDaysUntilExpiryValue(value) {
  const expiryDayStartTimestamp = getLocalDateStartTimestamp(value);
  if (!Number.isFinite(expiryDayStartTimestamp)) {
    return null;
  }

  return Math.round(
    (expiryDayStartTimestamp - getTodayStartTimestamp()) / (24 * 60 * 60 * 1000),
  );
}

function isSellPriorityLockedForExpiryDate(value) {
  const daysUntilExpiry = getDaysUntilExpiryValue(value);
  return daysUntilExpiry !== null
    && daysUntilExpiry >= 0
    && daysUntilExpiry <= STOCK_SELL_PRIORITY_LOCK_DAYS;
}

function normalizeSellPriorityBatchKey(value) {
  const normalizedValue = String(value ?? "").trim().toLowerCase();
  if (
    normalizedValue === "old"
    || normalizedValue === "new"
    || normalizedValue === "undated"
  ) {
    return normalizedValue;
  }
  if (/^dated-\d+$/.test(normalizedValue)) {
    return normalizedValue;
  }
  return "";
}

function resolveExpiryDetailPriorityBatchKey(batch, sourceBatchOverride = "") {
  if (batch && !hasStockExpiryDate(batch.expiryDate)) {
    return "undated";
  }
  return normalizeSellPriorityBatchKey(
    sourceBatchOverride || batch?.sourceBatch || "",
  );
}

function mapSellPriorityBatchKeyToOldNew(priorityKey, product) {
  const key = normalizeSellPriorityBatchKey(priorityKey);
  if (key === "old" || key === "new") {
    return key;
  }

  const oldExpiryDate = String(getProductOldStockExpiryDate(product) ?? "").trim();
  const newExpiryDate = String(getProductNewStockDate(product) ?? "").trim();

  if (key === "undated") {
    if (!hasStockExpiryDate(oldExpiryDate)) {
      return "old";
    }
    if (!hasStockExpiryDate(newExpiryDate)) {
      return "new";
    }
    return "old";
  }

  if (key.startsWith("dated-")) {
    const priorityDay = Number(key.slice(6));
    const oldDay = getLocalDateStartTimestamp(oldExpiryDate);
    const newDay = getLocalDateStartTimestamp(newExpiryDate);
    if (Number.isFinite(priorityDay) && Number.isFinite(oldDay) && priorityDay === oldDay) {
      return "old";
    }
    if (Number.isFinite(priorityDay) && Number.isFinite(newDay) && priorityDay === newDay) {
      return "new";
    }
  }

  return "";
}

function getSellPrioritySourceBatch(product) {
  const sourceProduct = getStockSourceProduct(product);
  const productId = String(sourceProduct?.id ?? "").trim();
  const liveProduct = productId
    ? currentStockProducts.find((candidate) => String(candidate?.id ?? "").trim() === productId)
    : null;
  return normalizeSellPriorityBatchKey(
    (liveProduct ?? sourceProduct)?.sellPrioritySourceBatch ?? "",
  );
}

function canShowSellPriorityControl(product, sourceBatchOverride = "") {
  if (isEmployeeStockWorkspace() || isEmbeddedLiveChatStockWorkspace()) {
    return false;
  }
  if (isExpiredStockDisplayEntry(product) || isExpiredInventoryRow(product)) {
    return false;
  }

  const sourceProduct = getStockSourceProduct(product);
  const sellableBatches = getClassifiedInventoryBatches(sourceProduct)
    .filter((batch) => !batch.isExpired && batch.stock > 0);
  if (sellableBatches.length < 2 || !sellableBatches.some((batch) => batch.isNearExpiry)) {
    return false;
  }

  const currentSourceBatch = normalizeSellPriorityBatchKey(
    sourceBatchOverride || getStockDisplaySourceBatch(product) || "",
  );
  if (currentSourceBatch !== "old" && currentSourceBatch !== "new") {
    return false;
  }

  const currentBatch = sellableBatches.find((batch) => batch.sourceBatch === currentSourceBatch);
  if (!currentBatch || isExpiryDateValueExpired(currentBatch.expiryDate)) {
    return false;
  }

  return true;
}

function canShowExpiryDetailSellPriorityControl(product, sourceBatchOverride = "") {
  if (isEmployeeStockWorkspace() || isEmbeddedLiveChatStockWorkspace()) {
    return false;
  }
  if (isExpiredStockDisplayEntry(product) || isExpiredInventoryRow(product)) {
    return false;
  }

  const sourceProduct = getStockSourceProduct(product);
  const sellableBatches = getInventoryExpiryBatches(sourceProduct)
    .filter((batch) => !batch.isExpired && batch.stock > 0);
  if (sellableBatches.length < 2) {
    return false;
  }

  const currentSourceBatch = normalizeSellPriorityBatchKey(sourceBatchOverride);
  if (!currentSourceBatch) {
    return false;
  }

  const currentBatch = sellableBatches.find((batch) =>
    resolveExpiryDetailPriorityBatchKey(batch) === currentSourceBatch
  );
  if (!currentBatch || currentBatch.isExpired || currentBatch.stock <= 0) {
    return false;
  }

  return true;
}

function notifyExpiredStockNotAllowed() {
  showStockEditorSnackbar(
    "Expired stock",
    "Expired stock cannot be added. Expired batches stay as records only and cannot be listed in the app.",
    "error",
  );
}

function notifyNearExpiryStockAddNotAllowed() {
  showStockEditorSnackbar(
    "Expiry too soon",
    `Choose a date more than ${STOCK_SELL_PRIORITY_LOCK_DAYS} days from today. Dates within ${STOCK_SELL_PRIORITY_LOCK_DAYS} days cannot be added as new stock.`,
    "error",
  );
}

function isStockAddExpiryDateBlocked(value) {
  return isExpiryDateValueExpired(value) || isSellPriorityLockedForExpiryDate(value);
}

function getSellPriorityLockedReason() {
  return `Set Priority is locked within ${STOCK_SELL_PRIORITY_LOCK_DAYS} days of expiry. This batch is deducted from the listing.`;
}

function notifySellPriorityLocked() {
  showStockEditorSnackbar(
    "Set Priority unavailable",
    `${getSellPriorityLockedReason()} It stays as an inventory record only.`,
    "error",
  );
}

function isExpiredInventoryRow(product) {
  return isExpiredStockDisplayEntry(product) || isExpiredProduct(product);
}

function isNearExpiryInventoryRow(product) {
  if (isExpiredInventoryRow(product)) {
    return false;
  }
  if (getInventoryMainGoodBatch(product)) {
    return false;
  }
  return isNearExpiryProduct(product)
    || getClassifiedInventoryBatches(product).some((batch) => batch.isNearExpiry);
}

function canDeleteExpiredInventoryRow(product) {
  if (isEmployeeStockWorkspace() || isEmbeddedLiveChatStockWorkspace()) {
    return false;
  }

  return isExpiredInventoryRow(product) && getStock(product) > 0;
}

function getDeletableNearExpiryInventoryBatches(product) {
  const sourceProduct = getStockSourceProduct(product);
  const displaySourceBatch = isSplitStockDisplayEntry(product)
    ? getStockDisplaySourceBatch(product)
    : "";

  return getInventoryExpiryBatches(sourceProduct).filter((batch) => {
    if (batch.stock <= 0 || batch.isExpired) {
      return false;
    }
    if (displaySourceBatch && batch.sourceBatch !== displaySourceBatch) {
      return false;
    }
    return isSellPriorityLockedForExpiryDate(batch.expiryDate);
  });
}

function canDeleteNearExpiryInventoryRow(product) {
  if (isEmployeeStockWorkspace() || isEmbeddedLiveChatStockWorkspace()) {
    return false;
  }

  const sourceProduct = getStockSourceProduct(product);
  if (!String(sourceProduct?.id ?? "").trim()) {
    return false;
  }

  const nearExpiryBatches = getDeletableNearExpiryInventoryBatches(product);
  if (!nearExpiryBatches.length) {
    return false;
  }

  // Keep delete hidden while any good/sellable stock remains.
  // Only allow it when every remaining unit is near-expiry (within lock days) or expired.
  const remainingBatches = getInventoryExpiryBatches(sourceProduct)
    .filter((batch) => Math.max(0, Math.trunc(Number(batch?.stock) || 0)) > 0);
  if (!remainingBatches.length) {
    return false;
  }

  return remainingBatches.every((batch) =>
    Boolean(batch?.isExpired)
    || isSellPriorityLockedForExpiryDate(batch?.expiryDate)
  );
}

function hideStockEditorSnackbar() {
  const snackbar = stockEditorSnackbarElements?.root;
  if (!(snackbar instanceof HTMLElement)) {
    return;
  }
  window.clearTimeout(stockEditorSnackbarTimer);
  stockEditorSnackbarTimer = 0;
  const timerBar = stockEditorSnackbarElements?.timerBar;
  if (timerBar instanceof HTMLElement) {
    timerBar.classList.remove("is-running");
  }
  snackbar.classList.remove("is-visible");
  window.setTimeout(() => {
    if (!snackbar.classList.contains("is-visible")) {
      snackbar.hidden = true;
    }
  }, 180);
}

function ensureStockEditorSnackbar() {
  if (stockEditorSnackbarElements?.root?.isConnected) {
    return stockEditorSnackbarElements;
  }

  const root = document.createElement("div");
  root.className = "product-editor-snackbar";
  root.hidden = true;
  root.setAttribute("role", "status");
  root.setAttribute("aria-live", "polite");

  const icon = document.createElement("span");
  icon.className = "product-editor-snackbar__icon";
  icon.setAttribute("aria-hidden", "true");
  icon.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <path d="M12 8v4"></path>
      <path d="M12 16h.01"></path>
    </svg>
  `;

  const copy = document.createElement("span");
  copy.className = "product-editor-snackbar__copy";
  const title = document.createElement("strong");
  const message = document.createElement("span");
  copy.append(title, message);

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "product-editor-snackbar__close";
  closeButton.setAttribute("aria-label", "Dismiss notification");
  closeButton.title = "Dismiss";
  closeButton.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M18 6 6 18"></path>
      <path d="m6 6 12 12"></path>
    </svg>
  `;
  closeButton.addEventListener("click", () => hideStockEditorSnackbar());

  const timer = document.createElement("div");
  timer.className = "product-editor-snackbar__timer";
  timer.setAttribute("aria-hidden", "true");
  const timerBar = document.createElement("span");
  timerBar.className = "product-editor-snackbar__timer-bar";
  timer.appendChild(timerBar);

  root.append(icon, copy, closeButton, timer);
  document.body?.appendChild(root);
  stockEditorSnackbarElements = { root, title, message, timerBar };
  return stockEditorSnackbarElements;
}

function showStockEditorSnackbar(title, message, mode = "warning") {
  const snackbar = ensureStockEditorSnackbar();
  snackbar.title.textContent = String(title || "Notice").trim() || "Notice";
  snackbar.message.textContent = String(message || "").replace(/\s+/g, " ").trim();
  snackbar.root.classList.toggle("is-error", mode === "error");
  snackbar.root.classList.toggle("is-success", mode === "success");
  snackbar.root.hidden = false;
  window.clearTimeout(stockEditorSnackbarTimer);
  window.requestAnimationFrame(() => {
    snackbar.root.classList.add("is-visible");
    snackbar.timerBar.classList.remove("is-running");
    void snackbar.timerBar.offsetWidth;
    snackbar.timerBar.classList.add("is-running");
  });
  stockEditorSnackbarTimer = window.setTimeout(
    hideStockEditorSnackbar,
    STOCK_SNACKBAR_AUTO_DISMISS_MS,
  );
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

function getInventorySourceBatches(product) {
  const sourceProduct = getStockSourceProduct(product);
  const { oldStock, newStock } = getProductStockBreakdown(sourceProduct);
  const productStockedDate = String(getProductStockedDate(sourceProduct) ?? "").trim();
  const lastRestockedDate = String(getProductLastRestockedDate(sourceProduct) ?? "").trim();
  const oldStockExpiryDate = String(getProductOldStockExpiryDate(sourceProduct) ?? "").trim();
  const newStockExpiryDate = String(getProductNewStockDate(sourceProduct) ?? "").trim();
  const batches = [];

  if (oldStock > 0) {
    batches.push({
      sourceBatch: "old",
      stock: oldStock,
      expiryDate: oldStockExpiryDate,
      stockedDate: productStockedDate,
    });
  }

  if (newStock > 0) {
    batches.push({
      sourceBatch: "new",
      stock: newStock,
      expiryDate: newStockExpiryDate,
      stockedDate: lastRestockedDate || productStockedDate,
    });
  }

  return batches;
}

function classifyInventoryBatch(batch) {
  const expiryDate = String(batch?.expiryDate ?? "").trim();
  const isExpired = hasStockExpiryDate(expiryDate) && isExpiryDateValueExpired(expiryDate);
  const isNearExpiry = !isExpired && isNearExpiryDateValue(expiryDate);
  const rawSourceBatch = String(batch?.sourceBatch ?? "").trim().toLowerCase();
  const sourceBatch = rawSourceBatch === "new"
    ? "new"
    : rawSourceBatch === "undated"
      ? "undated"
      : rawSourceBatch.startsWith("dated-")
        ? rawSourceBatch
        : "old";
  return {
    sourceBatch,
    stock: Math.max(0, Math.trunc(Number(batch?.stock) || 0)),
    expiryDate,
    stockedDate: String(batch?.stockedDate ?? "").trim(),
    isExpired,
    isNearExpiry,
    isGood: !isExpired && !isNearExpiry,
  };
}

function getClassifiedInventoryBatches(product) {
  return getInventorySourceBatches(product).map(classifyInventoryBatch);
}

function getInventoryExpiryBatchKey(expiryDate) {
  if (!hasStockExpiryDate(expiryDate)) {
    return "none";
  }
  const expiryDay = getLocalDateStartTimestamp(expiryDate);
  if (Number.isFinite(expiryDay)) {
    return `day:${expiryDay}`;
  }
  return `value:${String(expiryDate ?? "").trim().toLowerCase()}`;
}

function compareInventoryExpiryBatchDeductOrder(left, right) {
  const leftExpired = hasStockExpiryDate(left?.expiryDate) && isExpiryDateValueExpired(left.expiryDate);
  const rightExpired = hasStockExpiryDate(right?.expiryDate) && isExpiryDateValueExpired(right.expiryDate);
  if (leftExpired !== rightExpired) {
    return leftExpired ? -1 : 1;
  }

  const leftHasExpiry = hasStockExpiryDate(left?.expiryDate);
  const rightHasExpiry = hasStockExpiryDate(right?.expiryDate);
  if (leftHasExpiry !== rightHasExpiry) {
    return leftHasExpiry ? -1 : 1;
  }

  const leftExpiry = getLocalDateStartTimestamp(left?.expiryDate);
  const rightExpiry = getLocalDateStartTimestamp(right?.expiryDate);
  if (Number.isFinite(leftExpiry) || Number.isFinite(rightExpiry)) {
    return (Number.isFinite(leftExpiry) ? leftExpiry : Number.MAX_SAFE_INTEGER)
      - (Number.isFinite(rightExpiry) ? rightExpiry : Number.MAX_SAFE_INTEGER);
  }

  const leftStocked = Date.parse(String(left?.stockedDate ?? "").trim());
  const rightStocked = Date.parse(String(right?.stockedDate ?? "").trim());
  return (Number.isFinite(leftStocked) ? leftStocked : 0)
    - (Number.isFinite(rightStocked) ? rightStocked : 0);
}

function deductInventoryExpiryBatchStock(batchesByKey, quantity) {
  let remaining = Math.max(0, Math.trunc(Number(quantity) || 0));
  if (remaining <= 0) {
    return;
  }

  const orderedBatches = [...batchesByKey.values()]
    .filter((batch) => batch.stock > 0)
    .sort(compareInventoryExpiryBatchDeductOrder);

  for (const batch of orderedBatches) {
    if (remaining <= 0) {
      break;
    }
    const take = Math.min(batch.stock, remaining);
    batch.stock -= take;
    remaining -= take;
  }
}

function reconcileInventoryExpiryBatchStocks(batchesByKey, totalStock) {
  const targetStock = Math.max(0, Math.trunc(Number(totalStock) || 0));
  let currentStock = [...batchesByKey.values()].reduce((sum, batch) => sum + batch.stock, 0);

  if (currentStock > targetStock) {
    deductInventoryExpiryBatchStock(batchesByKey, currentStock - targetStock);
    return;
  }

  if (currentStock < targetStock) {
    const undatedKey = getInventoryExpiryBatchKey("");
    let undatedBatch = batchesByKey.get(undatedKey);
    if (!undatedBatch) {
      undatedBatch = {
        key: undatedKey,
        expiryDate: "",
        stock: 0,
        stockedDate: "",
      };
      batchesByKey.set(undatedKey, undatedBatch);
    }
    undatedBatch.stock += targetStock - currentStock;
  }
}

function buildInventoryExpiryBatchesFromHistory(product) {
  const historyRecords = getProductStockHistoryRecords(product);
  if (!historyRecords.length) {
    return null;
  }

  const chronologicalRecords = historyRecords
    .slice()
    .sort((left, right) => {
      const leftTimestamp = Number.isFinite(left?.sortTimestamp) ? left.sortTimestamp : 0;
      const rightTimestamp = Number.isFinite(right?.sortTimestamp) ? right.sortTimestamp : 0;
      return leftTimestamp - rightTimestamp;
    });

  const hasAddOrInitialRecord = chronologicalRecords.some((record) => {
    if (record.addedQuantity > 0) {
      return true;
    }
    return isInitialAddProductStockHistoryRecord(record, product) && record.stock > 0;
  });
  if (!hasAddOrInitialRecord) {
    return null;
  }

  const batchesByKey = new Map();
  const ensureBatch = (expiryDate, stockedDate = "") => {
    const key = getInventoryExpiryBatchKey(expiryDate);
    let batch = batchesByKey.get(key);
    if (!batch) {
      batch = {
        key,
        expiryDate: hasStockExpiryDate(expiryDate) ? String(expiryDate).trim() : "",
        stock: 0,
        stockedDate: String(stockedDate ?? "").trim(),
      };
      batchesByKey.set(key, batch);
      return batch;
    }

    const nextStockedDate = String(stockedDate ?? "").trim();
    if (nextStockedDate) {
      const existingTimestamp = Date.parse(batch.stockedDate);
      const nextTimestamp = Date.parse(nextStockedDate);
      if (
        !batch.stockedDate
        || !Number.isFinite(existingTimestamp)
        || (Number.isFinite(nextTimestamp) && nextTimestamp < existingTimestamp)
      ) {
        batch.stockedDate = nextStockedDate;
      }
    }
    return batch;
  };

  chronologicalRecords.forEach((record) => {
    const addedQuantity = Math.max(0, Math.trunc(Number(record?.addedQuantity) || 0));
    const deductedQuantity = Math.max(0, Math.trunc(Number(record?.deductedQuantity) || 0));
    const recordStock = Math.max(0, Math.trunc(Number(record?.stock) || 0));
    const isInitialRecord = isInitialAddProductStockHistoryRecord(record, product);
    const effectiveAddQuantity = addedQuantity > 0
      ? addedQuantity
      : (isInitialRecord && deductedQuantity <= 0 ? recordStock : 0);

    if (effectiveAddQuantity > 0) {
      const batch = ensureBatch(record.expiryDate, record.modifiedAt);
      batch.stock += effectiveAddQuantity;
    }

    if (deductedQuantity > 0) {
      if (hasStockExpiryDate(record.expiryDate)) {
        const batch = ensureBatch(record.expiryDate, record.modifiedAt);
        batch.stock = Math.max(0, batch.stock - deductedQuantity);
      } else {
        const sourceKey = normalizeSellPriorityBatchKey(record?.sourceBatch);
        if (sourceKey === "undated") {
          const undatedBatch = batchesByKey.get(getInventoryExpiryBatchKey(""));
          if (undatedBatch) {
            undatedBatch.stock = Math.max(0, undatedBatch.stock - deductedQuantity);
          } else {
            deductInventoryExpiryBatchStock(batchesByKey, deductedQuantity);
          }
        } else {
          deductInventoryExpiryBatchStock(batchesByKey, deductedQuantity);
        }
      }
    }
  });

  reconcileInventoryExpiryBatchStocks(batchesByKey, getStock(product));

  const remainingBatches = [...batchesByKey.values()].filter((batch) => batch.stock > 0);
  return remainingBatches.length ? remainingBatches : null;
}

function resolveInventoryExpiryDetailSourceBatch(batch, product, latestExpiryDate, previousExpiryDate) {
  if (!hasStockExpiryDate(batch?.expiryDate)) {
    return "undated";
  }
  if (
    hasStockExpiryDate(latestExpiryDate)
    && stockBatchesShareExpiryDate(batch.expiryDate, latestExpiryDate)
  ) {
    return "new";
  }
  if (
    hasStockExpiryDate(previousExpiryDate)
    && stockBatchesShareExpiryDate(batch.expiryDate, previousExpiryDate)
  ) {
    return "old";
  }
  const expiryDay = getLocalDateStartTimestamp(batch.expiryDate);
  return Number.isFinite(expiryDay) ? `dated-${expiryDay}` : "old";
}

function resolveInventoryExpiryDetailLabel(batch, sourceBatch, datedBatchCount) {
  if (!hasStockExpiryDate(batch?.expiryDate)) {
    return "No expiry date";
  }
  if (sourceBatch === "new") {
    return "Latest stock";
  }
  if (sourceBatch === "old" || datedBatchCount <= 2) {
    return "Previous stock";
  }
  return "Dated stock";
}

function getInventoryExpiryBatches(product) {
  const sourceProduct = getStockSourceProduct(product);
  const { oldStock, newStock } = getProductStockBreakdown(sourceProduct);
  const hasRestockDetails = hasProductRestockDetails(sourceProduct);
  const currentExpiryDate = String(getProductExpiryDate(sourceProduct) ?? "").trim();
  const displayExpiryDate = String(getProductExpiryDate(product) ?? currentExpiryDate).trim();
  const oldStockExpiryDate = String(
    getProductOldStockExpiryDate(sourceProduct)
      || (!hasRestockDetails ? currentExpiryDate : ""),
  ).trim();
  const newStockExpiryDate = String(getProductNewStockDate(sourceProduct) ?? "").trim();
  const productStockedDate = String(getProductStockedDate(sourceProduct) ?? "").trim();
  const lastRestockedDate = String(getProductLastRestockedDate(sourceProduct) ?? "").trim();
  const displaySourceBatch = isSplitStockDisplayEntry(product)
    ? getStockDisplaySourceBatch(product)
    : "";
  const candidates = [];

  const addCandidate = (candidate) => {
    const expiryDate = String(candidate?.expiryDate ?? "").trim();
    const sourceBatch = String(candidate?.sourceBatch ?? "").trim().toLowerCase();
    if (displaySourceBatch && sourceBatch !== displaySourceBatch) {
      return;
    }
    const classifiedBatch = classifyInventoryBatch({
      ...candidate,
      expiryDate,
    });
    candidates.push({
      ...classifiedBatch,
      label: String(candidate?.label ?? "Current stock").trim() || "Current stock",
      daysUntilExpiry: hasStockExpiryDate(expiryDate)
        ? getDaysUntilExpiryValue(expiryDate)
        : null,
    });
  };

  const historyBatches = buildInventoryExpiryBatchesFromHistory(sourceProduct);
  if (Array.isArray(historyBatches) && historyBatches.length) {
    const datedBatchCount = historyBatches.filter((batch) => hasStockExpiryDate(batch.expiryDate)).length;
    historyBatches.forEach((batch) => {
      const sourceBatch = resolveInventoryExpiryDetailSourceBatch(
        batch,
        sourceProduct,
        newStockExpiryDate,
        oldStockExpiryDate,
      );
      addCandidate({
        sourceBatch,
        label: resolveInventoryExpiryDetailLabel(batch, sourceBatch, datedBatchCount),
        stock: batch.stock,
        expiryDate: batch.expiryDate,
        stockedDate: batch.stockedDate || productStockedDate,
      });
    });
  } else if (hasRestockDetails) {
    if (oldStock > 0) {
      addCandidate({
        sourceBatch: hasStockExpiryDate(oldStockExpiryDate) ? "old" : "undated",
        label: hasStockExpiryDate(oldStockExpiryDate) ? "Previous stock" : "No expiry date",
        stock: oldStock,
        expiryDate: oldStockExpiryDate,
        stockedDate: productStockedDate,
      });
    }
    if (newStock > 0) {
      addCandidate({
        sourceBatch: hasStockExpiryDate(newStockExpiryDate) ? "new" : "undated",
        label: hasStockExpiryDate(newStockExpiryDate) ? "Latest stock" : "No expiry date",
        stock: newStock,
        expiryDate: newStockExpiryDate,
        stockedDate: lastRestockedDate || productStockedDate,
      });
    }
  } else {
    const totalStock = getStock(sourceProduct);
    if (totalStock > 0) {
      addCandidate({
        sourceBatch: hasStockExpiryDate(currentExpiryDate || oldStockExpiryDate) ? "old" : "undated",
        label: hasStockExpiryDate(currentExpiryDate || oldStockExpiryDate)
          ? "Current stock"
          : "No expiry date",
        stock: totalStock,
        expiryDate: currentExpiryDate || oldStockExpiryDate,
        stockedDate: productStockedDate,
      });
    }
  }

  if (!candidates.length && getStock(product) > 0 && hasStockExpiryDate(displayExpiryDate)) {
    addCandidate({
      sourceBatch: displaySourceBatch || "old",
      label: displaySourceBatch === "new" ? "Latest stock" : "Current stock",
      stock: getStock(product),
      expiryDate: displayExpiryDate,
      stockedDate: productStockedDate,
    });
  }

  return candidates.sort((left, right) => {
    const leftHasExpiry = hasStockExpiryDate(left.expiryDate);
    const rightHasExpiry = hasStockExpiryDate(right.expiryDate);
    if (leftHasExpiry !== rightHasExpiry) {
      return leftHasExpiry ? -1 : 1;
    }

    const leftIsLatestStock = left.sourceBatch === "new";
    const rightIsLatestStock = right.sourceBatch === "new";
    if (leftIsLatestStock !== rightIsLatestStock) {
      return leftIsLatestStock ? -1 : 1;
    }

    const leftStockedTimestamp = Date.parse(String(left.stockedDate ?? "").trim());
    const rightStockedTimestamp = Date.parse(String(right.stockedDate ?? "").trim());
    if (Number.isFinite(leftStockedTimestamp) || Number.isFinite(rightStockedTimestamp)) {
      const stockedDateOrder = (Number.isFinite(rightStockedTimestamp) ? rightStockedTimestamp : 0)
        - (Number.isFinite(leftStockedTimestamp) ? leftStockedTimestamp : 0);
      if (stockedDateOrder !== 0) {
        return stockedDateOrder;
      }
    }

    const leftTimestamp = getLocalDateStartTimestamp(left.expiryDate);
    const rightTimestamp = getLocalDateStartTimestamp(right.expiryDate);
    const expiryOrder = (Number.isFinite(rightTimestamp) ? rightTimestamp : 0)
      - (Number.isFinite(leftTimestamp) ? leftTimestamp : 0);
    if (expiryOrder !== 0) {
      return expiryOrder;
    }
    return 0;
  });
}

function hasInventoryExpiryDetails(product) {
  // Calendar / expiry details is only needed when there are multiple batches to manage.
  // A single stock pool is the automatic default deduct target — no priority setup.
  return getInventoryExpiryBatches(product).filter((batch) => batch.stock > 0).length >= 2;
}

function getInventoryBatchExpiryKey(expiryDate) {
  const expiryDay = getLocalDateStartTimestamp(expiryDate);
  if (Number.isFinite(expiryDay)) {
    return `day:${expiryDay}`;
  }
  const normalizedExpiryDate = String(expiryDate ?? "").trim().toLowerCase();
  return normalizedExpiryDate ? `value:${normalizedExpiryDate}` : "none";
}

function getInventoryMainGoodBatch(product) {
  const goodBatches = getClassifiedInventoryBatches(product)
    .filter((batch) => batch.isGood && batch.stock > 0);
  if (!goodBatches.length) {
    return null;
  }

  return [...goodBatches].sort((left, right) => {
    const leftTimestamp = getLocalDateStartTimestamp(left.expiryDate);
    const rightTimestamp = getLocalDateStartTimestamp(right.expiryDate);
    return (Number.isFinite(rightTimestamp) ? rightTimestamp : 0)
      - (Number.isFinite(leftTimestamp) ? leftTimestamp : 0);
  })[0];
}

function groupNearExpiryInventoryBatches(product) {
  const groupedBatches = new Map();
  for (const batch of getClassifiedInventoryBatches(product)) {
    if (!batch.isNearExpiry || batch.stock <= 0) {
      continue;
    }

    const groupKey = getInventoryBatchExpiryKey(batch.expiryDate);
    const existingGroup = groupedBatches.get(groupKey);
    if (existingGroup) {
      existingGroup.stock += batch.stock;
      if (!existingGroup.sourceBatches.includes(batch.sourceBatch)) {
        existingGroup.sourceBatches.push(batch.sourceBatch);
      }
      continue;
    }

    groupedBatches.set(groupKey, {
      ...batch,
      sourceBatches: [batch.sourceBatch],
    });
  }

  return [...groupedBatches.values()].sort((left, right) => {
    const leftTimestamp = getLocalDateStartTimestamp(left.expiryDate);
    const rightTimestamp = getLocalDateStartTimestamp(right.expiryDate);
    return (Number.isFinite(leftTimestamp) ? leftTimestamp : Number.MAX_SAFE_INTEGER)
      - (Number.isFinite(rightTimestamp) ? rightTimestamp : Number.MAX_SAFE_INTEGER);
  });
}

function shouldShowNearExpiryBatchDropdown(product) {
  if (isExpiredStockDisplayEntry(product) || isExpiredInventoryRow(product)) {
    return false;
  }

  const nearExpiryGroups = groupNearExpiryInventoryBatches(product);
  if (!nearExpiryGroups.length) {
    return false;
  }

  return true;
}

function getSplitStockDisplayConfig(product) {
  const { oldStock, newStock } = getProductStockBreakdown(product);
  if (oldStock <= 0 || newStock <= 0) {
    return null;
  }

  const productStockedDate = String(getProductStockedDate(product) ?? "").trim();
  const lastRestockedDate = String(getProductLastRestockedDate(product) ?? "").trim();
  const oldStockExpiryDate = String(getProductOldStockExpiryDate(product) ?? "").trim();
  const newStockExpiryDate = String(getProductNewStockDate(product) ?? "").trim();
  const oldStockIsExpired = isExpiryDateValueExpired(oldStockExpiryDate);
  const newStockIsExpired = isExpiryDateValueExpired(newStockExpiryDate);

  // Keep expired stock on its own row. Do not split OK vs near-expiry.
  if (oldStockIsExpired === newStockIsExpired) {
    return null;
  }

  const oldIsAhead = isStockExpiryDateAhead(oldStockExpiryDate, newStockExpiryDate);
  const oldBatch = {
    sourceBatch: "old",
    stock: oldStock,
    expiryDate: oldStockExpiryDate,
    stockedDate: productStockedDate,
    isActive: oldStockIsExpired ? false : product?.isActive,
    label: oldStockIsExpired ? "Expired Stock" : (oldIsAhead ? "New Stock" : "Old Stock"),
    role: oldStockIsExpired ? "expired" : "fresh",
  };
  const newBatch = {
    sourceBatch: "new",
    stock: newStock,
    expiryDate: newStockExpiryDate,
    stockedDate: lastRestockedDate || productStockedDate,
    isActive: newStockIsExpired ? false : product?.isActive,
    label: newStockIsExpired ? "Expired Stock" : (oldIsAhead ? "Old Stock" : "New Stock"),
    role: newStockIsExpired ? "expired" : "fresh",
  };

  if (oldStockIsExpired !== newStockIsExpired) {
    return {
      expired: oldStockIsExpired ? oldBatch : newBatch,
      fresh: oldStockIsExpired ? newBatch : oldBatch,
    };
  }

  return null;
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
    const expiredBatch = splitDisplayConfig.expired;
    const freshBatch = splitDisplayConfig.fresh;
    const expiredRole = expiredBatch.role || "expired";
    const freshRole = freshBatch.role || "fresh";
    const expiredDisplayKey =
      expiredRole === freshRole ? `${expiredRole}-${expiredBatch.sourceBatch}` : expiredRole;
    const freshDisplayKey =
      expiredRole === freshRole ? `${freshRole}-${freshBatch.sourceBatch}` : freshRole;

    const expiredEntry = createSplitStockDisplayEntry(product, {
      stockDisplayId: `${productIdentifier}::${expiredDisplayKey}`,
      stockDisplayRole: expiredRole,
      stockDisplayLabel: expiredBatch.label,
      stockDisplaySourceBatch: expiredBatch.sourceBatch,
      stockDisplaySortOrder: expiredRole === "expired" ? 1 : 1,
      stock: expiredBatch.stock,
      expiryDate: expiredBatch.expiryDate,
      stockedDate: expiredBatch.stockedDate,
      isActive: expiredBatch.isActive,
      updatedAt: productModifiedDate,
    });

    const freshEntry = createSplitStockDisplayEntry(product, {
      stockDisplayId: `${productIdentifier}::${freshDisplayKey}`,
      stockDisplayRole: freshRole,
      stockDisplayLabel: freshBatch.label,
      stockDisplaySourceBatch: freshBatch.sourceBatch,
      stockDisplaySortOrder: freshRole === "fresh" ? 0 : 0,
      stock: freshBatch.stock,
      expiryDate: freshBatch.expiryDate,
      stockedDate: freshBatch.stockedDate,
      isActive: freshBatch.isActive,
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

  const expiryDate = getProductBatchExpiryDate(product);
  if (!hasStockExpiryDate(expiryDate)) {
    return false;
  }

  return isNearExpiryDateValue(expiryDate);
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

function normalizeStockHistorySourceBatch(value) {
  const normalizedValue = String(value ?? "").trim().toLowerCase();
  return normalizedValue === "old" || normalizedValue === "new"
    ? normalizedValue
    : "";
}

function stockHistoryExpiryDatesMatch(left, right) {
  const normalizedLeft = normalizeExpiryDateInputValue(left);
  const normalizedRight = normalizeExpiryDateInputValue(right);
  return Boolean(normalizedLeft && normalizedRight && normalizedLeft === normalizedRight);
}

function hasStockExpiryDate(value) {
  return Boolean(normalizeExpiryDateInputValue(value));
}

function stockBatchesShareExpiryDate(left, right) {
  const normalizedLeft = normalizeExpiryDateInputValue(left);
  const normalizedRight = normalizeExpiryDateInputValue(right);
  if (!normalizedLeft && !normalizedRight) {
    return true;
  }
  return Boolean(normalizedLeft && normalizedRight && normalizedLeft === normalizedRight);
}

function isStockExpiryDateAhead(left, right) {
  const leftTimestamp = getLocalDateStartTimestamp(left);
  const rightTimestamp = getLocalDateStartTimestamp(right);
  if (!Number.isFinite(leftTimestamp) || !Number.isFinite(rightTimestamp)) {
    return false;
  }
  return leftTimestamp > rightTimestamp;
}

function alignOldNewBatchesByAheadExpiry(oldStock, newStock, oldExpiry, newExpiry) {
  const normalizedOldStock = Math.max(0, Math.trunc(Number(oldStock) || 0));
  const normalizedNewStock = Math.max(0, Math.trunc(Number(newStock) || 0));
  if (
    normalizedOldStock > 0
    && normalizedNewStock > 0
    && isStockExpiryDateAhead(oldExpiry, newExpiry)
  ) {
    return {
      oldStock: normalizedNewStock,
      newStock: normalizedOldStock,
      oldExpiry: newExpiry,
      newExpiry: oldExpiry,
      swapped: true,
    };
  }

  return {
    oldStock: normalizedOldStock,
    newStock: normalizedNewStock,
    oldExpiry,
    newExpiry,
    swapped: false,
  };
}

function getAheadStockExpiryDate(product) {
  const oldExpiry = getProductOldStockExpiryDate(product);
  const newExpiry = getProductNewStockDate(product) || getProductExpiryDate(product);
  return isStockExpiryDateAhead(oldExpiry, newExpiry) ? oldExpiry : newExpiry;
}

function getBehindStockExpiryDate(product) {
  const oldExpiry = getProductOldStockExpiryDate(product);
  const newExpiry = getProductNewStockDate(product) || getProductExpiryDate(product);
  return isStockExpiryDateAhead(oldExpiry, newExpiry) ? newExpiry : oldExpiry;
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

  if (normalizedLabel === "new stock" || normalizedLabel.includes("new stock")) {
    return "stock-detail-table__label--new";
  }

  if (normalizedLabel === "old stock" || normalizedLabel.includes("old stock")) {
    return "stock-detail-table__label--old";
  }

  if (normalizedLabel.includes("expired")) {
    return "stock-detail-table__label--expired";
  }

  if (normalizedLabel.startsWith("deducted")) {
    return "stock-detail-table__label--deducted";
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
          record?.stockBatchRole,
      );
      const sourceBatch = normalizeStockHistorySourceBatch(
        record?.sourceBatch ??
          record?.stockSourceBatch,
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
        sourceBatch,
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
    ...(normalizeStockHistorySourceBatch(record?.sourceBatch)
      ? { sourceBatch: normalizeStockHistorySourceBatch(record.sourceBatch) }
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
          <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash2-icon lucide-trash-2" aria-hidden="true"><path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
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

function openStockExpiredDeleteConfirmationModal(product, actionElement = null) {
  const modal = ensureStockDeleteConfirmationModal();
  if (!modal || !canDeleteExpiredInventoryRow(product)) {
    return;
  }

  const sourceProduct = getStockSourceProduct(product);
  const productName = String(sourceProduct?.name ?? "this product").trim() || "this product";
  const isSplitExpiredBatch = isSplitStockDisplayEntry(product) && isExpiredStockDisplayEntry(product);
  modal.copy.textContent = isSplitExpiredBatch
    ? `Are you sure you want to delete this expired stock from ${productName}?`
    : `Are you sure you want to delete expired product "${productName}"?`;
  modal.onAction = () => {
    prepareStockDeleteSuccessAudio();
    closeStockDeleteConfirmationModal(() => {
      void deleteExpiredInventoryRow(product, actionElement);
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

function openStockNearExpiryDeleteConfirmationModal(product, actionElement = null) {
  const modal = ensureStockDeleteConfirmationModal();
  const nearExpiryBatches = getDeletableNearExpiryInventoryBatches(product);
  if (!modal || !nearExpiryBatches.length || !canDeleteNearExpiryInventoryRow(product)) {
    return;
  }

  const sourceProduct = getStockSourceProduct(product);
  const productName = String(sourceProduct?.name ?? "this product").trim() || "this product";
  modal.copy.textContent = nearExpiryBatches.length === 1
    ? `Are you sure you want to delete the batch of "${productName}" that expires within ${STOCK_SELL_PRIORITY_LOCK_DAYS} days?`
    : `Are you sure you want to delete all ${nearExpiryBatches.length} batches of "${productName}" that expire within ${STOCK_SELL_PRIORITY_LOCK_DAYS} days?`;
  modal.onAction = () => {
    prepareStockDeleteSuccessAudio();
    closeStockDeleteConfirmationModal(() => {
      void deleteNearExpiryInventoryRow(product, actionElement);
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

async function deleteExpiredInventoryRow(product, actionElement = null) {
  const sourceProduct = getStockSourceProduct(product);
  const productId = String(sourceProduct?.id ?? "").trim();
  const productName = String(sourceProduct?.name ?? "this product").trim() || "this product";
  if (!productId || !canDeleteExpiredInventoryRow(product)) {
    return false;
  }

  const isSplitExpiredBatch = isSplitStockDisplayEntry(product) && isExpiredStockDisplayEntry(product);
  const sourceBatch = getStockDisplaySourceBatch(product);
  const currentBreakdown = getProductStockBreakdown(sourceProduct);
  const expiredStock = getStock(product);
  let updatedOldStock = currentBreakdown.oldStock;
  let updatedNewStock = currentBreakdown.newStock;
  if (isSplitExpiredBatch && sourceBatch === "old") {
    updatedOldStock = 0;
  } else if (isSplitExpiredBatch && sourceBatch === "new") {
    updatedNewStock = 0;
  } else {
    updatedOldStock = 0;
    updatedNewStock = 0;
  }

  const remainingStock = updatedOldStock + updatedNewStock;
  const shouldDeleteProduct = remainingStock <= 0;

  try {
    actionElement?.classList.add("is-saving");
    if ("disabled" in (actionElement ?? {})) {
      actionElement.disabled = true;
    }

    if (shouldDeleteProduct) {
      const response = await fetch(`/api/products/${encodeURIComponent(productId)}`, {
        method: "DELETE",
        headers: withStockAdminScopeHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(withStockAdminScopePayload({
          __activityContext: "inventory",
          __activityActor: getStockActivityActor(),
        })),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Unable to delete expired stock.");
      }

      currentStockProducts = currentStockProducts.filter(
        (candidate) => String(candidate?.id ?? "").trim() !== productId,
      );
      if (String(selectedStockProductId ?? "").startsWith(productId)) {
        selectedStockProductId = "";
      }
      editingStockProductId = "";
      renderStockDashboard(currentStockProducts);
      broadcastStockProductsUpdated();
      openStockSuccessModal(`Deleted expired product "${productName}" successfully.`, {
        hideAction: true,
        hideClose: true,
        allowOverlayClose: false,
        autoCloseMs: 2000,
        playDeleteSound: true,
      });
      return true;
    }

    const currentOldStockExpiryDate = String(getProductOldStockExpiryDate(sourceProduct) ?? "").trim();
    const currentNewStockExpiryDate = String(getProductNewStockDate(sourceProduct) ?? "").trim();
    const nextOldStockExpiryDate = updatedOldStock > 0 ? currentOldStockExpiryDate : "";
    const nextNewStockDate = updatedNewStock > 0 ? currentNewStockExpiryDate : "";
    const nextProductExpiryDate = updatedNewStock > 0
      ? nextNewStockDate
      : nextOldStockExpiryDate;
    const currentPriority = getSellPrioritySourceBatch(sourceProduct);
    const nextPriority = currentPriority && (
      (sourceBatch === "old" && currentPriority === "old")
      || (sourceBatch === "new" && currentPriority === "new")
    )
      ? ""
      : currentPriority;
    const nextModifiedAt = new Date().toISOString();
    const stockHistoryRecordId = createStockHistoryRecordId(nextModifiedAt);
    const stockHistoryEntry = {
      id: stockHistoryRecordId,
      stock: remainingStock,
      addedQuantity: 0,
      deductedQuantity: expiredStock,
      expiryDate: "",
      modifiedAt: nextModifiedAt,
      reason: getStockDeductReasonLabel("expired-disposed") || "Expired / Disposed",
      label: "Deleted Expired Stock",
      batchRole: "expired",
      ...(sourceBatch ? { sourceBatch } : {}),
    };

    const response = await fetch(`/api/products/${encodeURIComponent(productId)}`, {
      method: "PUT",
      headers: withStockAdminScopeHeaders({
        "Content-Type": "application/json",
      }),
      body: JSON.stringify(withStockAdminScopePayload({
        ...sourceProduct,
        stock: remainingStock,
        inventoryStock: remainingStock,
        expiryDate: nextProductExpiryDate,
        lastRestockPreviousStock: updatedOldStock,
        lastRestockPreviousExpiryDate: nextOldStockExpiryDate,
        lastRestockAddedStock: updatedNewStock,
        lastRestockExpiryDate: nextNewStockDate,
        sellPrioritySourceBatch: nextPriority,
        stockHistoryEntry,
        __activityContext: "inventory",
        __activityTarget: "card",
        __activityInventoryChangeCount: 2,
        __activityDisplayStockProductId: getStockProductIdentifier(sourceProduct),
        __activityStockRecordId: stockHistoryRecordId,
        __activityStockRecordModifiedAt: nextModifiedAt,
        __activityActor: getStockActivityActor(),
      })),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.message || "Unable to delete expired stock.");
    }

    const updatedProduct = {
      ...sourceProduct,
      ...(data?.product ?? {}),
      stock: remainingStock,
      inventoryStock: remainingStock,
      expiryDate: nextProductExpiryDate,
      lastRestockPreviousStock: updatedOldStock,
      lastRestockPreviousExpiryDate: nextOldStockExpiryDate,
      lastRestockAddedStock: updatedNewStock,
      lastRestockExpiryDate: nextNewStockDate,
      sellPrioritySourceBatch: nextPriority,
    };
    currentStockProducts = currentStockProducts.map((candidate) =>
      String(candidate?.id ?? "").trim() === productId
        ? updatedProduct
        : candidate,
    );
    selectedStockProductId = getStockProductIdentifier(updatedProduct);
    renderStockDashboard(currentStockProducts);
    broadcastStockProductsUpdated();
    openStockSuccessModal(`Deleted expired stock from "${productName}" successfully.`, {
      hideAction: true,
      hideClose: true,
      allowOverlayClose: false,
      autoCloseMs: 2000,
      playDeleteSound: true,
    });
    return true;
  } catch (error) {
    console.error(error);
    showStockEditorSnackbar(
      "Delete expired stock",
      error instanceof Error ? error.message : "Unable to delete expired stock.",
      "error",
    );
    return false;
  } finally {
    actionElement?.classList.remove("is-saving");
    if ("disabled" in (actionElement ?? {})) {
      actionElement.disabled = false;
    }
  }
}

async function deleteNearExpiryInventoryRow(product, actionElement = null) {
  const sourceProduct = getStockSourceProduct(product);
  const productId = String(sourceProduct?.id ?? "").trim();
  const productName = String(sourceProduct?.name ?? "this product").trim() || "this product";
  const nearExpiryBatches = getDeletableNearExpiryInventoryBatches(product);
  if (!productId || !nearExpiryBatches.length || !canDeleteNearExpiryInventoryRow(product)) {
    return false;
  }

  const sourceBatchesToDelete = new Set(
    nearExpiryBatches.map((batch) => batch.sourceBatch),
  );
  const currentBreakdown = getProductStockBreakdown(sourceProduct);
  const updatedOldStock = sourceBatchesToDelete.has("old")
    ? 0
    : currentBreakdown.oldStock;
  const updatedNewStock = sourceBatchesToDelete.has("new")
    ? 0
    : currentBreakdown.newStock;
  const removedStock = nearExpiryBatches.reduce(
    (total, batch) => total + Math.max(0, Math.trunc(Number(batch.stock) || 0)),
    0,
  );
  const remainingStock = updatedOldStock + updatedNewStock;
  const shouldDeleteProduct = remainingStock <= 0;

  try {
    actionElement?.classList.add("is-saving");
    if ("disabled" in (actionElement ?? {})) {
      actionElement.disabled = true;
    }

    if (shouldDeleteProduct) {
      const response = await fetch(`/api/products/${encodeURIComponent(productId)}`, {
        method: "DELETE",
        headers: withStockAdminScopeHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(withStockAdminScopePayload({
          __activityContext: "inventory",
          __activityActor: getStockActivityActor(),
        })),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Unable to delete near-expiry stock.");
      }

      currentStockProducts = currentStockProducts.filter(
        (candidate) => String(candidate?.id ?? "").trim() !== productId,
      );
      if (String(selectedStockProductId ?? "").startsWith(productId)) {
        selectedStockProductId = "";
      }
      editingStockProductId = "";
      renderStockDashboard(currentStockProducts);
      broadcastStockProductsUpdated();
      openStockSuccessModal(`Deleted near-expiry product "${productName}" successfully.`, {
        hideAction: true,
        hideClose: true,
        allowOverlayClose: false,
        autoCloseMs: 2000,
        playDeleteSound: true,
      });
      return true;
    }

    const currentOldStockExpiryDate = String(getProductOldStockExpiryDate(sourceProduct) ?? "").trim();
    const currentNewStockExpiryDate = String(getProductNewStockDate(sourceProduct) ?? "").trim();
    const nextOldStockExpiryDate = updatedOldStock > 0 ? currentOldStockExpiryDate : "";
    const nextNewStockDate = updatedNewStock > 0 ? currentNewStockExpiryDate : "";
    const nextProductExpiryDate = updatedNewStock > 0
      ? nextNewStockDate
      : nextOldStockExpiryDate;
    const currentPriority = getSellPrioritySourceBatch(sourceProduct);
    const nextPriority = sourceBatchesToDelete.has(currentPriority) ? "" : currentPriority;
    const nextModifiedAt = new Date().toISOString();
    const stockHistoryRecordId = createStockHistoryRecordId(nextModifiedAt);
    const singleSourceBatch = sourceBatchesToDelete.size === 1
      ? [...sourceBatchesToDelete][0]
      : "";
    const stockHistoryEntry = {
      id: stockHistoryRecordId,
      stock: remainingStock,
      addedQuantity: 0,
      deductedQuantity: removedStock,
      expiryDate: nearExpiryBatches.length === 1 ? nearExpiryBatches[0].expiryDate : "",
      modifiedAt: nextModifiedAt,
      reason: "Near Expiry / Disposed",
      label: "Deleted Near Expiry Stock",
      batchRole: "fresh",
      ...(singleSourceBatch ? { sourceBatch: singleSourceBatch } : {}),
    };

    const response = await fetch(`/api/products/${encodeURIComponent(productId)}`, {
      method: "PUT",
      headers: withStockAdminScopeHeaders({
        "Content-Type": "application/json",
      }),
      body: JSON.stringify(withStockAdminScopePayload({
        ...sourceProduct,
        stock: remainingStock,
        inventoryStock: remainingStock,
        expiryDate: nextProductExpiryDate,
        lastRestockPreviousStock: updatedOldStock,
        lastRestockPreviousExpiryDate: nextOldStockExpiryDate,
        lastRestockAddedStock: updatedNewStock,
        lastRestockExpiryDate: nextNewStockDate,
        sellPrioritySourceBatch: nextPriority,
        stockHistoryEntry,
        __activityContext: "inventory",
        __activityTarget: "card",
        __activityInventoryChangeCount: 2,
        __activityDisplayStockProductId: getStockProductIdentifier(sourceProduct),
        __activityStockRecordId: stockHistoryRecordId,
        __activityStockRecordModifiedAt: nextModifiedAt,
        __activityActor: getStockActivityActor(),
      })),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.message || "Unable to delete near-expiry stock.");
    }

    const updatedProduct = {
      ...sourceProduct,
      ...(data?.product ?? {}),
      stock: remainingStock,
      inventoryStock: remainingStock,
      expiryDate: nextProductExpiryDate,
      lastRestockPreviousStock: updatedOldStock,
      lastRestockPreviousExpiryDate: nextOldStockExpiryDate,
      lastRestockAddedStock: updatedNewStock,
      lastRestockExpiryDate: nextNewStockDate,
      sellPrioritySourceBatch: nextPriority,
    };
    currentStockProducts = currentStockProducts.map((candidate) =>
      String(candidate?.id ?? "").trim() === productId
        ? updatedProduct
        : candidate,
    );
    selectedStockProductId = getStockProductIdentifier(updatedProduct);
    renderStockDashboard(currentStockProducts);
    broadcastStockProductsUpdated();
    openStockSuccessModal(`Deleted near-expiry stock from "${productName}" successfully.`, {
      hideAction: true,
      hideClose: true,
      allowOverlayClose: false,
      autoCloseMs: 2000,
      playDeleteSound: true,
    });
    return true;
  } catch (error) {
    console.error(error);
    showStockEditorSnackbar(
      "Delete near-expiry stock",
      error instanceof Error ? error.message : "Unable to delete near-expiry stock.",
      "error",
    );
    return false;
  } finally {
    actionElement?.classList.remove("is-saving");
    if ("disabled" in (actionElement ?? {})) {
      actionElement.disabled = false;
    }
  }
}

function canDeleteInventoryExpiryDetailBatch(product, batch = null) {
  if (isEmployeeStockWorkspace() || isEmbeddedLiveChatStockWorkspace()) {
    return false;
  }
  const sourceProduct = getStockSourceProduct(product);
  const productId = String(sourceProduct?.id ?? "").trim();
  if (!productId) {
    return false;
  }
  // Hammer only: hide batch hover-delete while listing stock is not fully expired.
  if (productId === "prd-1787212040822") {
    return false;
  }
  return Math.max(0, Math.trunc(Number(batch?.stock) || 0)) > 0;
}

function resolveSellPriorityAfterExpiryBatchDelete(product, deletedSourceBatch, remainingBatches) {
  const deletedKey = normalizeSellPriorityBatchKey(deletedSourceBatch);
  const currentPriority = getSellPrioritySourceBatch(product);
  const sellableRemaining = (Array.isArray(remainingBatches) ? remainingBatches : [])
    .filter((batch) =>
      batch
      && batch.stock > 0
      && !batch.isExpired
      && !isSellPriorityLockedForExpiryDate(batch.expiryDate)
    )
    .map((batch) => ({
      ...batch,
      sourceBatch: normalizeSellPriorityBatchKey(batch.sourceBatch),
    }))
    .filter((batch) => batch.sourceBatch && batch.sourceBatch !== deletedKey);

  if (
    currentPriority
    && currentPriority !== deletedKey
    && sellableRemaining.some((batch) => batch.sourceBatch === currentPriority)
  ) {
    return currentPriority;
  }

  if (sellableRemaining.length <= 1) {
    return sellableRemaining[0]?.sourceBatch || "";
  }

  // Prefer "previous" stock: undated first, then earliest expiry date.
  const sorted = sellableRemaining.slice().sort((left, right) => {
    const leftUndated = !hasStockExpiryDate(left.expiryDate);
    const rightUndated = !hasStockExpiryDate(right.expiryDate);
    if (leftUndated !== rightUndated) {
      return leftUndated ? -1 : 1;
    }
    const leftDay = getLocalDateStartTimestamp(left.expiryDate);
    const rightDay = getLocalDateStartTimestamp(right.expiryDate);
    return (Number.isFinite(leftDay) ? leftDay : Number.MAX_SAFE_INTEGER)
      - (Number.isFinite(rightDay) ? rightDay : Number.MAX_SAFE_INTEGER);
  });
  return sorted[0]?.sourceBatch || "";
}

function openStockExpiryBatchDeleteConfirmationModal(product, batch, actionElement = null) {
  const modal = ensureStockDeleteConfirmationModal();
  if (!modal || !canDeleteInventoryExpiryDetailBatch(product, batch)) {
    return;
  }

  const sourceProduct = getStockSourceProduct(product);
  const productName = String(sourceProduct?.name ?? "this product").trim() || "this product";
  const batchStock = Math.max(0, Math.trunc(Number(batch?.stock) || 0));
  const remainingStock = Math.max(0, getStock(sourceProduct) - batchStock);
  const expiryLabel = hasStockExpiryDate(batch?.expiryDate)
    ? formatExpiryDateDisplay(batch.expiryDate)
    : "No expiry date";
  const batchLabel = String(batch?.label ?? "batch").trim() || "batch";

  modal.copy.textContent = remainingStock <= 0
    ? `Delete the last stock batch of "${productName}" (${expiryLabel})? This removes the listing stock completely.`
    : `Delete "${batchLabel}" (${formatUnits(batchStock)}, ${expiryLabel}) from "${productName}"? This quickly deducts that batch.`;

  modal.onAction = () => {
    prepareStockDeleteSuccessAudio();
    closeStockDeleteConfirmationModal(() => {
      void deleteInventoryExpiryDetailBatch(product, batch, actionElement);
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

async function deleteInventoryExpiryDetailBatch(product, batch, actionElement = null) {
  const sourceProduct = getStockSourceProduct(product);
  const productId = String(sourceProduct?.id ?? "").trim();
  const productName = String(sourceProduct?.name ?? "this product").trim() || "this product";
  const batchStock = Math.max(0, Math.trunc(Number(batch?.stock) || 0));
  const batchKey = normalizeSellPriorityBatchKey(batch?.sourceBatch);
  const batchExpiryKey = getInventoryExpiryBatchKey(batch?.expiryDate);

  if (!productId || !canDeleteInventoryExpiryDetailBatch(sourceProduct, batch) || !batchKey) {
    return false;
  }

  const liveBatches = getInventoryExpiryBatches(sourceProduct).filter((candidate) => candidate.stock > 0);
  const targetBatch = liveBatches.find((candidate) =>
    normalizeSellPriorityBatchKey(candidate.sourceBatch) === batchKey
    && getInventoryExpiryBatchKey(candidate.expiryDate) === batchExpiryKey
  ) || liveBatches.find((candidate) =>
    normalizeSellPriorityBatchKey(candidate.sourceBatch) === batchKey
  );
  if (!targetBatch || targetBatch.stock <= 0) {
    showStockEditorSnackbar(
      "Delete batch",
      "This batch is no longer available.",
      "error",
    );
    return false;
  }

  const removedStock = Math.max(0, Math.trunc(Number(targetBatch.stock) || 0));
  const remainingStock = Math.max(0, getStock(sourceProduct) - removedStock);
  const remainingBatches = liveBatches
    .filter((candidate) => !(
      normalizeSellPriorityBatchKey(candidate.sourceBatch) === batchKey
      && getInventoryExpiryBatchKey(candidate.expiryDate) === batchExpiryKey
    ))
    .map((candidate) => ({ ...candidate }));
  const nextPriority = resolveSellPriorityAfterExpiryBatchDelete(
    sourceProduct,
    batchKey,
    remainingBatches,
  );
  const reopenExpiryToggle = stockActionDropdownToggle instanceof HTMLElement
    && stockActionDropdownMode === "expiry"
      ? stockActionDropdownToggle
      : null;
  const reopenDisplayProduct = product;

  try {
    actionElement?.classList.add("is-saving");
    if ("disabled" in (actionElement ?? {})) {
      actionElement.disabled = true;
    }
    suppressStockRealtimeRefresh();

    if (remainingStock <= 0) {
      const response = await fetch(`/api/products/${encodeURIComponent(productId)}`, {
        method: "DELETE",
        headers: withStockAdminScopeHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(withStockAdminScopePayload({
          __activityContext: "inventory",
          __activityActor: getStockActivityActor(),
        })),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Unable to delete batch stock.");
      }

      currentStockProducts = currentStockProducts.filter(
        (candidate) => String(candidate?.id ?? "").trim() !== productId,
      );
      if (String(selectedStockProductId ?? "").startsWith(productId)) {
        selectedStockProductId = "";
      }
      editingStockProductId = "";
      closeStockActionDropdown();
      renderStockDashboard(currentStockProducts);
      broadcastStockProductsUpdated();
      openStockSuccessModal(`Deleted listing stock for "${productName}" successfully.`, {
        hideAction: true,
        hideClose: true,
        allowOverlayClose: false,
        autoCloseMs: 2000,
        playDeleteSound: true,
      });
      return true;
    }

    const deductReason = targetBatch.isExpired || isSellPriorityLockedForExpiryDate(targetBatch.expiryDate)
      ? "expired-disposed"
      : "damaged-accident";
    const didSave = await saveStockEditModalChanges(
      sourceProduct,
      "0",
      String(-removedStock),
      deductReason,
      "",
      "",
      {
        displayProduct: sourceProduct,
        selectProductOnSave: false,
        selectedDeductBatchKey: batchKey,
        primaryButton: actionElement,
      },
    );
    if (!didSave) {
      return false;
    }

    const updatedLiveProduct = currentStockProducts.find((candidate) =>
      String(candidate?.id ?? "").trim() === productId,
    ) || sourceProduct;
    const currentPriorityAfterSave = getSellPrioritySourceBatch(updatedLiveProduct);
    if (
      currentPriorityAfterSave === batchKey
      || (nextPriority && currentPriorityAfterSave !== nextPriority)
    ) {
      if (nextPriority) {
        await saveSellPrioritySourceBatch(updatedLiveProduct, nextPriority);
      } else if (currentPriorityAfterSave === batchKey) {
        const cleared = await saveSellPrioritySourceBatch(updatedLiveProduct, "");
        if (!cleared) {
          const fallbackPriority = resolveSellPriorityAfterExpiryBatchDelete(
            updatedLiveProduct,
            batchKey,
            getInventoryExpiryBatches(updatedLiveProduct).filter((candidate) => candidate.stock > 0),
          );
          if (fallbackPriority) {
            await saveSellPrioritySourceBatch(updatedLiveProduct, fallbackPriority);
          }
        }
      }
    }

    closeStockActionDropdown();
    renderStockDashboard(currentStockProducts);
    broadcastStockProductsUpdated();

    const refreshedSource = currentStockProducts.find((candidate) =>
      String(candidate?.id ?? "").trim() === productId,
    ) || updatedLiveProduct;
    if (
      reopenExpiryToggle?.isConnected
      && getStock(refreshedSource) > 0
      && hasInventoryExpiryDetails(refreshedSource)
    ) {
      const refreshedProduct = getStockDisplayProducts(currentStockProducts).find((candidate) =>
        getStockProductIdentifier(candidate) === getStockProductIdentifier(reopenDisplayProduct)
        || String(getStockSourceProduct(candidate)?.id ?? "").trim() === productId
      ) || refreshedSource;
      window.requestAnimationFrame(() => {
        openStockActionDropdown(reopenExpiryToggle, "expiry", refreshedProduct, {
          skipAnimation: true,
        });
      });
    }

    openStockSuccessModal(
      `Deleted ${formatUnits(removedStock)} from "${productName}" successfully.`,
      {
        hideAction: true,
        hideClose: true,
        allowOverlayClose: false,
        autoCloseMs: 2000,
        playDeleteSound: true,
      },
    );
    return true;
  } catch (error) {
    console.error(error);
    showStockEditorSnackbar(
      "Delete batch",
      error instanceof Error ? error.message : "Unable to delete batch stock.",
      "error",
    );
    return false;
  } finally {
    actionElement?.classList.remove("is-saving");
    if ("disabled" in (actionElement ?? {})) {
      actionElement.disabled = false;
    }
  }
}

function removeStockEditModalOverlay() {
  clearStockEditModalClockInterval();
  document.querySelector(".stock-edit-modal-overlay")?.remove();
  syncStockModalOpenClass();
}

function closeStockEditModal() {
  removeStockEditModalOverlay();
  closeStockActionDropdown();
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
  if (window.GMS_ADMIN_EMPTY_STATE_LOTTIE?.create) {
    return window.GMS_ADMIN_EMPTY_STATE_LOTTIE.create({
      className: "stock-inventory-empty-state",
      label: message,
      copy: "Inventory records will appear here once products are available.",
    });
  }
  const emptyState = document.createElement("div");
  emptyState.className = "stock-inventory-empty-state";
  emptyState.textContent = message;
  return emptyState;
}

function createStockInventoryEmptyRow(content) {
  const row = document.createElement("div");
  row.className = "stock-inventory-empty-row table-row-no-hover";
  row.setAttribute("role", "row");

  const cell = document.createElement("div");
  cell.className = "stock-inventory-empty-cell";
  cell.setAttribute("role", "cell");
  cell.setAttribute("aria-colspan", "6");

  if (content instanceof Node) {
    cell.appendChild(content);
  } else {
    cell.appendChild(createEmptyState(String(content || "No data yet")));
  }

  row.appendChild(cell);
  return row;
}

function hydrateInventoryEmptyStatePlaceholders() {
  if (!window.GMS_ADMIN_EMPTY_STATE_LOTTIE?.create) {
    return;
  }

  document.querySelectorAll('[data-gms-admin-empty-state-lottie="true"]').forEach((placeholder) => {
    const label = placeholder.getAttribute("data-empty-state-label") || "No data yet";
    const copy = placeholder.getAttribute("data-empty-state-copy") || "Inventory records will appear here once products are available.";
    const replacement = window.GMS_ADMIN_EMPTY_STATE_LOTTIE.create({
      label,
      copy,
      className: placeholder.className,
    });
    placeholder.replaceWith(replacement);
  });
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

document.addEventListener("DOMContentLoaded", hydrateInventoryEmptyStatePlaceholders, { once: true });

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
    quantityCell.className = "stock-detail-table__cell stock-detail-table__cell--quantity";
    quantityCell.appendChild(createStockRecordQuantityValueElement(record));

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

  const mainGoodBatch = getInventoryMainGoodBatch(product);
  if (mainGoodBatch && shouldShowNearExpiryBatchDropdown(product)) {
    return createStockMetaRow(
      "Expiry date",
      formatExpiryDateDisplay(mainGoodBatch.expiryDate),
      iconMarkup,
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
  const dropdownId = `stock-deduct-reason-${++stockDeductReasonDropdownSerial}`;
  const placeholderText = "Select deduct reason";
  const row = document.createElement("div");
  row.className = "dashboard-info-row stock-detail-panel__input-row stock-edit-modal__reason-row";

  const labelElement = document.createElement("span");
  labelElement.textContent = label;

  const fieldGroup = document.createElement("div");
  fieldGroup.className = "stock-detail-panel__input-group stock-deduct-reason-dropdown";

  const select = document.createElement("select");
  select.className = "stock-detail-panel__select-input stock-deduct-reason-dropdown__native";
  select.tabIndex = -1;
  select.setAttribute("aria-hidden", "true");

  const placeholderOption = document.createElement("option");
  placeholderOption.value = "";
  placeholderOption.textContent = placeholderText;
  select.appendChild(placeholderOption);

  for (const optionConfig of STOCK_DEDUCT_REASON_OPTIONS) {
    const option = document.createElement("option");
    option.value = optionConfig.value;
    option.textContent = optionConfig.label;
    select.appendChild(option);
  }

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "stock-deduct-reason-dropdown__trigger";
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");
  trigger.setAttribute("aria-controls", `${dropdownId}-menu`);
  trigger.setAttribute("aria-label", label);

  const triggerLabel = document.createElement("span");
  triggerLabel.className = "stock-deduct-reason-dropdown__label";

  const triggerArrow = document.createElement("span");
  triggerArrow.className = "stock-deduct-reason-dropdown__arrow";
  triggerArrow.setAttribute("aria-hidden", "true");
  triggerArrow.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"></path></svg>`;
  trigger.append(triggerLabel, triggerArrow);

  const menu = document.createElement("div");
  menu.id = `${dropdownId}-menu`;
  menu.className = "stock-deduct-reason-dropdown__menu";
  menu.setAttribute("role", "listbox");
  menu.setAttribute("aria-label", label);
  menu.hidden = true;

  const optionButtons = STOCK_DEDUCT_REASON_OPTIONS.map((optionConfig) => {
    const optionButton = document.createElement("button");
    optionButton.type = "button";
    optionButton.className = "stock-deduct-reason-dropdown__option";
    optionButton.dataset.reasonOption = optionConfig.value;
    optionButton.setAttribute("role", "option");
    optionButton.setAttribute("aria-selected", "false");
    optionButton.textContent = optionConfig.label;
    optionButton.addEventListener("click", () => {
      select.value = optionConfig.value;
      select.classList.remove("is-error");
      setReasonMenuOpen(false);
      onChange?.(normalizeStockDeductReason(select.value), select);
      trigger.focus();
    });
    menu.appendChild(optionButton);
    return optionButton;
  });

  function isReasonControlDisabled() {
    return select.disabled || select.classList.contains("is-disabled");
  }

  function syncReasonDropdownUi() {
    const currentValue = normalizeStockDeductReason(select.value);
    const selectedLabel = getStockDeductReasonLabel(currentValue);
    triggerLabel.textContent = selectedLabel || placeholderText;
    triggerLabel.classList.toggle("is-placeholder", !currentValue);
    trigger.classList.toggle("is-placeholder", !currentValue);
    trigger.classList.toggle("is-error", select.classList.contains("is-error"));
    trigger.classList.toggle("is-saving", select.classList.contains("is-saving"));
    trigger.classList.toggle("is-disabled", isReasonControlDisabled());
    trigger.disabled = isReasonControlDisabled();
    optionButtons.forEach((optionButton) => {
      const isSelected = optionButton.dataset.reasonOption === currentValue;
      optionButton.classList.toggle("is-selected", isSelected);
      optionButton.setAttribute("aria-selected", isSelected ? "true" : "false");
    });
    if (isReasonControlDisabled()) {
      setReasonMenuOpen(false);
    }
  }

  function closeThisReasonMenu() {
    setReasonMenuOpen(false);
  }

  function positionReasonMenu() {
    menu.classList.remove("is-above");
    const triggerRect = trigger.getBoundingClientRect();
    const estimatedHeight = Math.min(menu.scrollHeight || 220, 220);
    const spaceBelow = window.innerHeight - triggerRect.bottom;
    const spaceAbove = triggerRect.top;
    if (spaceBelow < estimatedHeight + 12 && spaceAbove > spaceBelow) {
      menu.classList.add("is-above");
    }
  }

  function setReasonMenuOpen(isOpen) {
    const nextOpen = Boolean(isOpen) && !isReasonControlDisabled();
    fieldGroup.classList.toggle("is-open", nextOpen);
    trigger.setAttribute("aria-expanded", nextOpen ? "true" : "false");
    menu.hidden = !nextOpen;
    if (nextOpen) {
      if (typeof closeOpenStockDeductReasonMenu === "function" && closeOpenStockDeductReasonMenu !== closeThisReasonMenu) {
        closeOpenStockDeductReasonMenu();
      }
      positionReasonMenu();
      closeOpenStockDeductReasonMenu = closeThisReasonMenu;
      const selectedButton = optionButtons.find((optionButton) => optionButton.classList.contains("is-selected"));
      window.requestAnimationFrame(() => (selectedButton || optionButtons[0])?.focus());
    } else if (closeOpenStockDeductReasonMenu === closeThisReasonMenu) {
      closeOpenStockDeductReasonMenu = null;
    }
  }

  function handleReasonPointerDown(event) {
    if (!fieldGroup.isConnected) {
      document.removeEventListener("pointerdown", handleReasonPointerDown, true);
      return;
    }
    if (!fieldGroup.classList.contains("is-open")) {
      return;
    }
    if (event.target instanceof Node && fieldGroup.contains(event.target)) {
      return;
    }
    setReasonMenuOpen(false);
  }

  trigger.addEventListener("click", () => {
    setReasonMenuOpen(!fieldGroup.classList.contains("is-open"));
  });
  trigger.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setReasonMenuOpen(true);
    }
  });
  menu.addEventListener("keydown", (event) => {
    const currentIndex = optionButtons.findIndex((optionButton) => optionButton === document.activeElement);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      optionButtons[Math.min(optionButtons.length - 1, Math.max(0, currentIndex) + 1)]?.focus();
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      optionButtons[Math.max(0, currentIndex - 1)]?.focus();
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      optionButtons[0]?.focus();
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      optionButtons[optionButtons.length - 1]?.focus();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      setReasonMenuOpen(false);
      trigger.focus();
    }
  });

  select.value = normalizeStockDeductReason(value);
  select.addEventListener("change", () => {
    select.classList.remove("is-error");
    syncReasonDropdownUi();
    onChange?.(normalizeStockDeductReason(select.value), select);
  });

  const nativeValueDescriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
  if (nativeValueDescriptor?.get && nativeValueDescriptor?.set) {
    Object.defineProperty(select, "value", {
      configurable: true,
      enumerable: true,
      get() {
        return nativeValueDescriptor.get.call(this);
      },
      set(nextValue) {
        nativeValueDescriptor.set.call(this, nextValue);
        syncReasonDropdownUi();
      },
    });
  }

  const nativeDisabledDescriptor =
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "disabled") ||
    Object.getOwnPropertyDescriptor(HTMLElement.prototype, "disabled");
  if (nativeDisabledDescriptor?.get && nativeDisabledDescriptor?.set) {
    Object.defineProperty(select, "disabled", {
      configurable: true,
      enumerable: true,
      get() {
        return nativeDisabledDescriptor.get.call(this);
      },
      set(nextValue) {
        nativeDisabledDescriptor.set.call(this, nextValue);
        syncReasonDropdownUi();
      },
    });
  }

  const classObserver = new MutationObserver(syncReasonDropdownUi);
  classObserver.observe(select, { attributes: true, attributeFilter: ["class", "disabled"] });
  document.addEventListener("pointerdown", handleReasonPointerDown, true);

  fieldGroup.append(select, trigger, menu);
  row.append(labelElement, fieldGroup);
  syncReasonDropdownUi();
  return {
    row,
    select,
    trigger,
    getValue: () => normalizeStockDeductReason(select.value),
  };
}

function formatStockDeductBatchOptionLabel(batch) {
  const batchLabel = String(batch?.label ?? "Stock batch").trim() || "Stock batch";
  const stockLabel = formatUnits(Math.max(0, Math.trunc(Number(batch?.stock) || 0)));
  const expiryLabel = hasStockExpiryDate(batch?.expiryDate)
    ? formatExpiryDateDisplay(batch.expiryDate)
    : "No expiry date";
  return `${batchLabel} · ${stockLabel} · ${expiryLabel}`;
}

function createStockDetailBatchSelectRow(label, batches, selectedValue, onChange) {
  const dropdownId = `stock-deduct-batch-${++stockDeductBatchDropdownSerial}`;
  const placeholderText = "Select batch";
  const normalizedBatches = (Array.isArray(batches) ? batches : [])
    .filter((batch) => batch && batch.stock > 0)
    .map((batch) => ({
      ...batch,
      sourceBatch: normalizeSellPriorityBatchKey(batch.sourceBatch) || "old",
    }));

  const row = document.createElement("div");
  row.className = "dashboard-info-row stock-detail-panel__input-row stock-edit-modal__batch-row";

  const labelElement = document.createElement("span");
  labelElement.textContent = label;

  const fieldGroup = document.createElement("div");
  fieldGroup.className = "stock-detail-panel__input-group stock-deduct-reason-dropdown stock-deduct-batch-dropdown";

  const select = document.createElement("select");
  select.className = "stock-detail-panel__select-input stock-deduct-reason-dropdown__native";
  select.tabIndex = -1;
  select.setAttribute("aria-hidden", "true");

  const placeholderOption = document.createElement("option");
  placeholderOption.value = "";
  placeholderOption.textContent = placeholderText;
  select.appendChild(placeholderOption);

  normalizedBatches.forEach((batch) => {
    const option = document.createElement("option");
    option.value = batch.sourceBatch;
    option.textContent = formatStockDeductBatchOptionLabel(batch);
    select.appendChild(option);
  });

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "stock-deduct-reason-dropdown__trigger";
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");
  trigger.setAttribute("aria-controls", `${dropdownId}-menu`);
  trigger.setAttribute("aria-label", label);

  const triggerLabel = document.createElement("span");
  triggerLabel.className = "stock-deduct-reason-dropdown__label";

  const triggerArrow = document.createElement("span");
  triggerArrow.className = "stock-deduct-reason-dropdown__arrow";
  triggerArrow.setAttribute("aria-hidden", "true");
  triggerArrow.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"></path></svg>`;
  trigger.append(triggerLabel, triggerArrow);

  const menu = document.createElement("div");
  menu.id = `${dropdownId}-menu`;
  menu.className = "stock-deduct-reason-dropdown__menu";
  menu.setAttribute("role", "listbox");
  menu.setAttribute("aria-label", label);
  menu.hidden = true;

  const optionButtons = normalizedBatches.map((batch) => {
    const optionButton = document.createElement("button");
    optionButton.type = "button";
    optionButton.className = "stock-deduct-reason-dropdown__option";
    optionButton.dataset.batchOption = batch.sourceBatch;
    optionButton.setAttribute("role", "option");
    optionButton.setAttribute("aria-selected", "false");
    optionButton.textContent = formatStockDeductBatchOptionLabel(batch);
    optionButton.addEventListener("click", () => {
      select.value = batch.sourceBatch;
      select.classList.remove("is-error");
      setBatchMenuOpen(false);
      onChange?.(normalizeSellPriorityBatchKey(select.value), select, batch);
      trigger.focus();
    });
    menu.appendChild(optionButton);
    return optionButton;
  });

  function isBatchControlDisabled() {
    return select.disabled || select.classList.contains("is-disabled");
  }

  function syncBatchDropdownUi() {
    const currentValue = normalizeSellPriorityBatchKey(select.value);
    const selectedBatch = normalizedBatches.find((batch) => batch.sourceBatch === currentValue);
    const selectedLabel = selectedBatch
      ? formatStockDeductBatchOptionLabel(selectedBatch)
      : "";
    triggerLabel.textContent = selectedLabel || placeholderText;
    triggerLabel.classList.toggle("is-placeholder", !currentValue);
    trigger.classList.toggle("is-placeholder", !currentValue);
    trigger.classList.toggle("is-error", select.classList.contains("is-error"));
    trigger.classList.toggle("is-saving", select.classList.contains("is-saving"));
    trigger.classList.toggle("is-disabled", isBatchControlDisabled());
    trigger.disabled = isBatchControlDisabled();
    optionButtons.forEach((optionButton) => {
      const isSelected = optionButton.dataset.batchOption === currentValue;
      optionButton.classList.toggle("is-selected", isSelected);
      optionButton.setAttribute("aria-selected", isSelected ? "true" : "false");
    });
    if (isBatchControlDisabled()) {
      setBatchMenuOpen(false);
    }
  }

  function closeThisBatchMenu() {
    setBatchMenuOpen(false);
  }

  function positionBatchMenu() {
    menu.classList.remove("is-above");
    const triggerRect = trigger.getBoundingClientRect();
    const estimatedHeight = Math.min(menu.scrollHeight || 220, 260);
    const spaceBelow = window.innerHeight - triggerRect.bottom;
    const spaceAbove = triggerRect.top;
    if (spaceBelow < estimatedHeight + 12 && spaceAbove > spaceBelow) {
      menu.classList.add("is-above");
    }
  }

  function setBatchMenuOpen(isOpen) {
    const nextOpen = Boolean(isOpen) && !isBatchControlDisabled();
    fieldGroup.classList.toggle("is-open", nextOpen);
    trigger.setAttribute("aria-expanded", nextOpen ? "true" : "false");
    menu.hidden = !nextOpen;
    if (nextOpen) {
      if (typeof closeOpenStockDeductReasonMenu === "function" && closeOpenStockDeductReasonMenu !== closeThisBatchMenu) {
        closeOpenStockDeductReasonMenu();
      }
      positionBatchMenu();
      closeOpenStockDeductReasonMenu = closeThisBatchMenu;
      const selectedButton = optionButtons.find((optionButton) => optionButton.classList.contains("is-selected"));
      window.requestAnimationFrame(() => (selectedButton || optionButtons[0])?.focus());
    } else if (closeOpenStockDeductReasonMenu === closeThisBatchMenu) {
      closeOpenStockDeductReasonMenu = null;
    }
  }

  function handleBatchPointerDown(event) {
    if (!fieldGroup.isConnected) {
      document.removeEventListener("pointerdown", handleBatchPointerDown, true);
      return;
    }
    if (!fieldGroup.classList.contains("is-open")) {
      return;
    }
    if (event.target instanceof Node && fieldGroup.contains(event.target)) {
      return;
    }
    setBatchMenuOpen(false);
  }

  trigger.addEventListener("click", () => {
    setBatchMenuOpen(!fieldGroup.classList.contains("is-open"));
  });
  trigger.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setBatchMenuOpen(true);
    }
  });
  menu.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      setBatchMenuOpen(false);
      trigger.focus();
    }
  });

  select.value = normalizeSellPriorityBatchKey(selectedValue);
  select.addEventListener("change", () => {
    select.classList.remove("is-error");
    syncBatchDropdownUi();
    const currentValue = normalizeSellPriorityBatchKey(select.value);
    const selectedBatch = normalizedBatches.find((batch) => batch.sourceBatch === currentValue);
    onChange?.(currentValue, select, selectedBatch || null);
  });

  const nativeValueDescriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
  if (nativeValueDescriptor?.get && nativeValueDescriptor?.set) {
    Object.defineProperty(select, "value", {
      configurable: true,
      enumerable: true,
      get() {
        return nativeValueDescriptor.get.call(this);
      },
      set(nextValue) {
        nativeValueDescriptor.set.call(this, nextValue);
        syncBatchDropdownUi();
      },
    });
  }

  const classObserver = new MutationObserver(syncBatchDropdownUi);
  classObserver.observe(select, { attributes: true, attributeFilter: ["class", "disabled"] });
  document.addEventListener("pointerdown", handleBatchPointerDown, true);

  fieldGroup.append(select, trigger, menu);
  row.append(labelElement, fieldGroup);
  syncBatchDropdownUi();
  return {
    row,
    select,
    trigger,
    getValue: () => normalizeSellPriorityBatchKey(select.value),
    getSelectedBatch: () => {
      const currentValue = normalizeSellPriorityBatchKey(select.value);
      return normalizedBatches.find((batch) => batch.sourceBatch === currentValue) || null;
    },
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

function createStockDetailRadioRow(label, name, value, checked = false, onChange) {
  const row = document.createElement("div");
  row.className = "dashboard-info-row stock-detail-panel__checkbox-row stock-detail-panel__radio-row";

  const field = document.createElement("label");
  field.className = "checkbox-field stock-edit-modal__checkbox-field stock-edit-modal__radio-field";

  const input = document.createElement("input");
  input.type = "radio";
  input.name = String(name || "stock-expiry-option");
  input.value = String(value ?? "");
  input.checked = Boolean(checked);
  input.className = "stock-edit-modal__same-expiry-checkbox stock-edit-modal__expiry-option-radio";
  input.setAttribute("aria-label", label);

  const labelText = document.createElement("span");
  labelText.textContent = label;

  input.addEventListener("change", () => {
    if (input.checked) {
      onChange?.(input.value, input);
    }
  });

  field.append(input, labelText);
  row.append(field);
  return {
    row,
    field,
    input,
  };
}

function createStockDetailDateInputRow(label, value, onChange, options = {}) {
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

      const dayValue = formatDateTimeLocalFromDate(dayDate);
      const isExpiredDay = Boolean(options.rejectExpired) && isExpiryDateValueExpired(dayValue);
      const isLockWindowDay = Number.isFinite(Number(options.rejectWithinLockDays))
        && Number(options.rejectWithinLockDays) >= 0
        && isSellPriorityLockedForExpiryDate(dayValue);
      if (isExpiredDay || isLockWindowDay) {
        dayButton.classList.add("is-expired");
        dayButton.disabled = true;
        dayButton.title = isExpiredDay
          ? "Expired dates cannot be selected"
          : `Dates within ${STOCK_SELL_PRIORITY_LOCK_DAYS} days cannot be selected`;
      } else if (options.rejectExpired || Number.isFinite(Number(options.rejectWithinLockDays))) {
        dayButton.classList.add("is-good");
      }

      dayButton.addEventListener("click", () => {
        if (dayButton.disabled) {
          return;
        }
        draftDate.setFullYear(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());
        renderCalendarGrid();
      });

      daysGrid.appendChild(dayButton);
    }
  }

  function positionPopover() {
    if (popover.hidden) {
      return;
    }

    const pad = 12;
    const gap = 12;
    const triggerRect = triggerButton.getBoundingClientRect();
    const popHeight = popover.offsetHeight;
    const overflowBelow = triggerRect.bottom + gap + popHeight > window.innerHeight - pad;
    const fitsAbove = triggerRect.top - gap - popHeight >= pad;
    const spaceBelow = window.innerHeight - pad - triggerRect.bottom;
    const spaceAbove = triggerRect.top - pad;
    popover.classList.toggle(
      "is-above",
      overflowBelow && (fitsAbove || spaceAbove > spaceBelow),
    );
  }

  function requestPopoverPosition() {
    window.requestAnimationFrame(positionPopover);
  }

  function openPopover() {
    resetDraftDate();
    popover.hidden = false;
    row.classList.add("is-open");
    renderCalendarGrid();
    requestPopoverPosition();
    window.addEventListener("resize", requestPopoverPosition);
    window.addEventListener("scroll", requestPopoverPosition, true);
  }

  function closePopover() {
    popover.hidden = true;
    row.classList.remove("is-open");
    popover.classList.remove("is-above");
    window.removeEventListener("resize", requestPopoverPosition);
    window.removeEventListener("scroll", requestPopoverPosition, true);
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
    const nextValue = formatDateTimeLocalFromDate(draftDate);
    if (options.rejectExpired && isExpiryDateValueExpired(nextValue)) {
      notifyExpiredStockNotAllowed();
      return;
    }
    if (
      Number.isFinite(Number(options.rejectWithinLockDays))
      && Number(options.rejectWithinLockDays) >= 0
      && isSellPriorityLockedForExpiryDate(nextValue)
    ) {
      notifyNearExpiryStockAddNotAllowed();
      return;
    }
    committedValue = nextValue;
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
  const shouldSelectProduct = options?.selectProduct !== false;
  editingStockProductId = productIdentifier;
  if (shouldSelectProduct) {
    selectedStockProductId = productIdentifier;
  }
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
  let isSameExpiryDateSelected =
    hasInitialExpiryValue && !isExpiryDateValueExpired(initialExpiryValue);

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
    isSameExpiryDateSelected,
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
    selectProductOnSave: shouldSelectProduct,
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
      if (typeof closeOpenStockDeductReasonMenu === "function") {
        closeOpenStockDeductReasonMenu();
        return;
      }
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

function closeStockActionDropdown() {
  if (typeof closeOpenStockDeductReasonMenu === "function") {
    closeOpenStockDeductReasonMenu();
  }
  stockActionDropdownCard?.classList.remove("is-action-open");
  stockActionDropdownToggle?.classList.remove("is-open");
  stockActionDropdownToggle?.setAttribute("aria-expanded", "false");
  stockActionDropdown?.remove();
  stockActionDropdown = null;
  stockActionDropdownToggle = null;
  stockActionDropdownCard = null;
  stockActionDropdownMode = "";
  window.removeEventListener("resize", positionStockActionDropdown);
  window.removeEventListener("scroll", positionStockActionDropdown, true);
  document.removeEventListener("keydown", handleStockActionDropdownKeydown, true);
  document.removeEventListener("pointerdown", handleStockActionDropdownPointerDown, true);
}

function handleStockActionDropdownKeydown(event) {
  if (event.key === "Escape") {
    event.preventDefault();
    if (typeof closeOpenStockDeductReasonMenu === "function") {
      event.stopPropagation();
      closeOpenStockDeductReasonMenu();
      return;
    }
    closeStockActionDropdown();
  }
}

function handleStockActionDropdownPointerDown(event) {
  const target = event.target;
  if (!(target instanceof Node)) {
    return;
  }
  if (stockActionDropdown?.contains(target) || stockActionDropdownToggle?.contains(target)) {
    return;
  }
  closeStockActionDropdown();
}

function positionStockActionDropdown() {
  const panel = stockActionDropdown;
  const toggle = stockActionDropdownToggle;
  if (!(panel instanceof HTMLElement) || !(toggle instanceof HTMLElement)) {
    return;
  }

  const rect = toggle.getBoundingClientRect();
  const gap = 10;
  const pad = 12;
  const expiryTable = stockActionDropdownMode === "expiry"
    ? panel.querySelector(".stock-expiry-dropdown__table")
    : null;
  const expiryContentWidth = expiryTable instanceof HTMLElement
    ? Math.ceil(expiryTable.scrollWidth) + 2
    : 560;
  const preferredWidth = stockActionDropdownMode === "expiry"
    ? Math.min(720, Math.max(420, expiryContentWidth))
    : 420;
  const width = Math.min(
    preferredWidth,
    Math.max(280, window.innerWidth - pad * 2),
  );
  let left = Math.round(rect.right - width);
  left = Math.min(left, window.innerWidth - width - pad);
  left = Math.max(pad, left);
  let top = Math.round(rect.bottom + gap);
  let arrowLeft = rect.left + rect.width / 2 - left;
  arrowLeft = Math.min(Math.max(arrowLeft, 18), width - 18);

  panel.style.position = "fixed";
  panel.style.left = `${left}px`;
  panel.style.top = `${top}px`;
  panel.style.width = `${Math.round(width)}px`;
  panel.style.setProperty("--stock-action-dropdown-arrow-left", `${Math.round(arrowLeft)}px`);
  panel.classList.remove("is-above");

  const dialog = panel.querySelector(".stock-action-dropdown__dialog");
  const height = dialog instanceof HTMLElement
    ? dialog.getBoundingClientRect().height
    : panel.offsetHeight;
  if (top + height + pad > window.innerHeight) {
    const above = Math.round(rect.top - height - gap);
    if (above >= pad) {
      panel.style.top = `${above}px`;
      panel.classList.add("is-above");
    } else {
      panel.style.top = `${Math.max(pad, window.innerHeight - height - pad)}px`;
    }
  }
}

function createStockActionButton(action, label, iconMarkup) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `stock-product-card__action-button stock-product-card__action-button--${action}`;
  button.dataset.stockAction = action;
  button.setAttribute("aria-label", label);
  button.setAttribute("aria-haspopup", "dialog");
  button.setAttribute("aria-expanded", "false");
  button.title = label;
  button.innerHTML = iconMarkup;
  return button;
}

function applyInventoryExpiryActionTone(button, expiryBatches) {
  if (!(button instanceof HTMLButtonElement)) {
    return;
  }

  const normalizedBatches = Array.isArray(expiryBatches) ? expiryBatches : [];
  const hasGoodBatch = normalizedBatches.some((batch) => batch?.isGood);
  const hasWarningBatch = normalizedBatches.some(
    (batch) => batch?.isNearExpiry || batch?.isExpired || !batch?.isGood,
  );
  const tone = hasGoodBatch && hasWarningBatch
    ? "mixed"
    : hasGoodBatch
      ? "good"
      : "warning";
  const toneDescription = tone === "mixed"
    ? "Mixed good and near-expiry batches"
    : tone === "good"
      ? "All expiry batches are good"
      : "All expiry batches need expiry attention";

  button.classList.add(`is-expiry-${tone}`);
  button.dataset.expiryTone = tone;
  button.title = `${button.title} - ${toneDescription}`;
  button.setAttribute("aria-label", `${button.getAttribute("aria-label")} - ${toneDescription}`);

  if (tone !== "mixed") {
    return;
  }

  const icon = document.createElement("span");
  icon.className = "stock-expiry-action-tone-icon";
  const goodLayer = document.createElement("span");
  goodLayer.className = "stock-expiry-action-tone-icon__layer is-good";
  goodLayer.innerHTML = STOCK_EXPIRY_DETAILS_ICON_MARKUP;
  const warningLayer = document.createElement("span");
  warningLayer.className = "stock-expiry-action-tone-icon__layer is-warning";
  warningLayer.innerHTML = STOCK_EXPIRY_DETAILS_ICON_MARKUP;
  icon.append(goodLayer, warningLayer);
  button.replaceChildren(icon);
}

const STOCK_ACTION_DROPDOWN_CLOSE_ICON_MARKUP = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>`;

function createStockActionDropdownButton(label, variant) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `stock-action-dropdown__button stock-action-dropdown__button--${variant}`;
  button.textContent = label;
  return button;
}

function createStockActionDropdownSplitRow(quantityField, wideField) {
  const row = document.createElement("div");
  row.className = "stock-action-dropdown__split-row";
  quantityField.row.classList.add("stock-action-dropdown__split-field--quantity");
  wideField.row.classList.add("stock-action-dropdown__split-field--wide");
  row.append(quantityField.row, wideField.row);
  return row;
}

function createStockActionDropdownShell({ title, subtitle, iconMarkup, mode }) {
  const panel = document.createElement("div");
  panel.className = `stock-action-dropdown stock-action-dropdown--${mode}`;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-labelledby", "stock-action-dropdown-title");

  const dialog = document.createElement("section");
  dialog.className = "stock-action-dropdown__dialog";

  const header = document.createElement("header");
  header.className = "stock-action-dropdown__header";

  const icon = document.createElement("span");
  icon.className = "stock-action-dropdown__icon";
  icon.setAttribute("aria-hidden", "true");
  icon.innerHTML = iconMarkup;

  const copy = document.createElement("div");
  const heading = document.createElement("h3");
  heading.id = "stock-action-dropdown-title";
  heading.textContent = title;
  const description = document.createElement("p");
  description.textContent = subtitle;
  copy.append(heading, description);

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "stock-action-dropdown__close";
  closeButton.setAttribute("aria-label", `Close ${title}`);
  closeButton.title = "Close";
  closeButton.innerHTML = STOCK_ACTION_DROPDOWN_CLOSE_ICON_MARKUP;
  closeButton.addEventListener("click", () => closeStockActionDropdown());

  header.append(icon, copy, closeButton);

  const body = document.createElement("div");
  body.className = "stock-action-dropdown__body";

  const footer = document.createElement("footer");
  footer.className = "stock-action-dropdown__footer";

  dialog.append(header, body, footer);
  panel.appendChild(dialog);
  return { panel, dialog, body, footer };
}

function openStockMovementModal(product) {
  if (!product) {
    return;
  }

  const productIdentifier = getStockProductIdentifier(product);
  closeNearExpiryBatchOverlay();
  closeStockActionDropdown();
  removeStockEditModalOverlay();
  editingStockProductId = "";

  if (isStockMovementDrawerMode() && selectedStockProductId === productIdentifier) {
    selectedStockProductId = "";
    stockRecordDrawerMode = "records";
    renderStockDashboard(currentStockProducts);
    return;
  }

  stockRecordDrawerMode = "movement";
  selectedStockProductId = productIdentifier;
  renderStockDashboard(currentStockProducts);
}

function openStockActionDropdown(toggle, mode, product, options = {}) {
  if (!(toggle instanceof HTMLElement) || !product) {
    return;
  }

  if (mode === "activity") {
    openStockMovementModal(product);
    return;
  }

  if (
    stockActionDropdownToggle === toggle &&
    stockActionDropdownMode === mode &&
    stockActionDropdown instanceof HTMLElement
  ) {
    closeStockActionDropdown();
    return;
  }

  closeNearExpiryBatchOverlay();
  closeStockActionDropdown();
  removeStockEditModalOverlay();
  editingStockProductId = "";

  const sourceProduct = getStockSourceProduct(product);
  const expiryBatches = mode === "expiry" ? getInventoryExpiryBatches(product) : [];
  const expiryBatchCountLabel = expiryBatches.length === 1
    ? "1 dated batch"
    : `${expiryBatches.length} dated batches`;
  const configs = {
    add: {
      title: "Add Stock",
      subtitle: "Increase available units and set expiry.",
      iconMarkup: STOCK_ADD_ACTION_ICON_MARKUP,
    },
    deduct: {
      title: "Deduct Stock",
      subtitle: "Remove units and choose a deduct reason.",
      iconMarkup: STOCK_DEDUCT_ACTION_ICON_MARKUP,
    },
    expiry: {
      title: "Expiry details",
      subtitle: expiryBatchCountLabel,
      iconMarkup: STOCK_EXPIRY_DETAILS_ICON_MARKUP,
    },
  };
  const config = configs[mode];
  if (!config) {
    return;
  }

  const { panel, body, footer } = createStockActionDropdownShell({
    ...config,
    mode,
  });
  if (options?.skipAnimation === true) {
    panel.classList.add("is-refresh-restored");
  }
  stockActionDropdown = panel;
  stockActionDropdownToggle = toggle;
  stockActionDropdownCard = toggle.closest(".stock-product-card");
  stockActionDropdownMode = mode;
  stockActionDropdownCard?.classList.add("is-action-open");
  toggle.classList.add("is-open");
  toggle.setAttribute("aria-expanded", "true");

  if (mode === "add") {
    fillStockAddDropdown(body, footer, sourceProduct, product);
  } else if (mode === "deduct") {
    fillStockDeductDropdown(body, footer, sourceProduct, product);
  } else if (mode === "expiry") {
    fillStockExpiryDropdown(body, footer, sourceProduct, product);
  }

  document.body.appendChild(panel);
  window.addEventListener("resize", positionStockActionDropdown);
  window.addEventListener("scroll", positionStockActionDropdown, true);
  document.addEventListener("keydown", handleStockActionDropdownKeydown, true);
  document.addEventListener("pointerdown", handleStockActionDropdownPointerDown, true);
  positionStockActionDropdown();
}

function fillStockAddDropdown(body, footer, sourceProduct, displayProduct) {
  const editingProduct = isSplitStockDisplayEntry(displayProduct) ? displayProduct : sourceProduct;
  const currentExpiryDate =
    getAheadStockExpiryDate(sourceProduct)
    || getProductExpiryDate(editingProduct);
  const shouldClearExpiredDefault =
    isExpiredStockDisplayEntry(displayProduct) || isExpiryDateValueExpired(currentExpiryDate);
  const initialExpiryValue = shouldClearExpiredDefault
    ? ""
    : formatDateTimeLocalValue(currentExpiryDate);
  const hasInitialExpiryValue = Boolean(initialExpiryValue);
  const canUsePerBatch = hasInventoryExpiryDetails(sourceProduct);
  const addBatches = canUsePerBatch
    ? getInventoryExpiryBatches(sourceProduct)
      .filter((batch) => batch.stock > 0 && !batch.isExpired)
    : [];
  let draftAddStockValue = "0";
  let draftExpiryValue = initialExpiryValue;
  let draftAddBatchKey = "";
  let addExpiryMode = hasInitialExpiryValue ? "same" : "none";

  const quantityField = createStockDetailNumberInputRow("Quantity", 0, (nextValue) => {
    draftAddStockValue = nextValue;
    syncSaveState();
  });
  const expiryField = createStockDetailDateInputRow(
    "Expiry Date",
    initialExpiryValue,
    (nextValue) => {
      if (isExpiryDateValueExpired(nextValue)) {
        notifyExpiredStockNotAllowed();
        return;
      }
      if (isSellPriorityLockedForExpiryDate(nextValue)) {
        notifyNearExpiryStockAddNotAllowed();
        return;
      }
      draftExpiryValue = String(nextValue ?? "").trim();
      syncSaveState();
    },
    {
      rejectExpired: true,
      rejectWithinLockDays: STOCK_SELL_PRIORITY_LOCK_DAYS,
    },
  );
  const batchField = canUsePerBatch && addBatches.length
    ? createStockDetailBatchSelectRow(
        "Select Batch",
        addBatches,
        "",
        (nextValue, _select, selectedBatch) => {
          draftAddBatchKey = normalizeSellPriorityBatchKey(nextValue);
          draftExpiryValue = selectedBatch
            ? formatDateTimeLocalValue(selectedBatch.expiryDate || "")
            : "";
          syncSaveState();
        },
      )
    : null;
  if (batchField) {
    batchField.row.hidden = true;
  }
  const addWideSlot = {
    row: document.createElement("div"),
  };
  addWideSlot.row.className = "stock-action-dropdown__add-wide-slot";
  addWideSlot.row.appendChild(expiryField.row);
  if (batchField) {
    addWideSlot.row.appendChild(batchField.row);
  }

  const radioGroupName = `stock-add-expiry-mode-${String(sourceProduct?.id ?? "item").trim() || "item"}`;

  function syncAddExpiryModeRadios() {
    sameExpiryDateField.input.checked = addExpiryMode === "same";
    newExpiryDateField.input.checked = addExpiryMode === "new";
    noExpiryDateField.input.checked = addExpiryMode === "none";
    if (perBatchField?.input) {
      perBatchField.input.checked = addExpiryMode === "per-batch";
    }
  }

  function applyAddExpiryMode(nextMode) {
    if (nextMode === "same") {
      if (isExpiryDateValueExpired(currentExpiryDate)) {
        notifyExpiredStockNotAllowed();
        syncAddExpiryModeRadios();
        return;
      }
      if (!hasInitialExpiryValue) {
        syncAddExpiryModeRadios();
        return;
      }
      addExpiryMode = "same";
      draftAddBatchKey = "";
      if (batchField?.select) {
        batchField.select.value = "";
      }
      draftExpiryValue = initialExpiryValue;
      expiryField.setValue(initialExpiryValue);
    } else if (nextMode === "new") {
      addExpiryMode = "new";
      draftAddBatchKey = "";
      if (batchField?.select) {
        batchField.select.value = "";
      }
      draftExpiryValue = "";
      expiryField.setValue("");
    } else if (nextMode === "none") {
      addExpiryMode = "none";
      draftAddBatchKey = "";
      if (batchField?.select) {
        batchField.select.value = "";
      }
      draftExpiryValue = "";
      expiryField.setValue("");
    } else if (nextMode === "per-batch" && batchField) {
      addExpiryMode = "per-batch";
      draftAddBatchKey = "";
      if (batchField.select) {
        batchField.select.value = "";
      }
      draftExpiryValue = "";
    } else {
      return;
    }

    syncAddExpiryModeRadios();
    syncPerBatchUi();
    syncExpiryLockState();
    syncSaveState();
  }

  const sameExpiryDateField = createStockDetailRadioRow(
    "Same Expiry Date",
    radioGroupName,
    "same",
    addExpiryMode === "same",
    () => applyAddExpiryMode("same"),
  );
  const newExpiryDateField = createStockDetailRadioRow(
    "New",
    radioGroupName,
    "new",
    false,
    () => applyAddExpiryMode("new"),
  );
  const noExpiryDateField = createStockDetailRadioRow(
    "No Expiry Date",
    radioGroupName,
    "none",
    addExpiryMode === "none",
    () => applyAddExpiryMode("none"),
  );
  const perBatchField = batchField
    ? createStockDetailRadioRow(
        "Per Batch",
        radioGroupName,
        "per-batch",
        false,
        () => applyAddExpiryMode("per-batch"),
      )
    : null;

  const expiryOptions = document.createElement("div");
  expiryOptions.className = "stock-action-dropdown__expiry-options";
  expiryOptions.append(
    sameExpiryDateField.row,
    newExpiryDateField.row,
    noExpiryDateField.row,
  );
  if (perBatchField) {
    expiryOptions.appendChild(perBatchField.row);
  }

  const splitRow = createStockActionDropdownSplitRow(quantityField, addWideSlot);

  function syncPerBatchUi() {
    const isPerBatchSelected = addExpiryMode === "per-batch";
    if (batchField) {
      expiryField.row.hidden = isPerBatchSelected;
      batchField.row.hidden = !isPerBatchSelected;
    } else {
      expiryField.row.hidden = false;
    }
    // Same / New / No Expiry stay visible with Per Batch (radio group).
    if (stockActionDropdown?.isConnected) {
      positionStockActionDropdown();
    }
  }

  function syncExpiryLockState() {
    const shouldLockExpiryField =
      addExpiryMode === "same"
      || addExpiryMode === "none"
      || addExpiryMode === "per-batch";
    expiryField.triggerButton.disabled = shouldLockExpiryField;
    expiryField.triggerButton.classList.toggle("is-disabled", shouldLockExpiryField);
  }

  const cancelButton = createStockActionDropdownButton("Cancel", "secondary");
  const saveButton = createStockActionDropdownButton("Add Stock", "primary");
  cancelButton.addEventListener("click", () => closeStockActionDropdown());

  function syncSaveState() {
    const parsedStock = Number(draftAddStockValue);
    const hasQuantity = Number.isFinite(parsedStock)
      && parsedStock > 0
      && Number.isInteger(parsedStock);
    const isPerBatchSelected = addExpiryMode === "per-batch";
    const hasBatch = !isPerBatchSelected || Boolean(normalizeSellPriorityBatchKey(draftAddBatchKey));
    const hasValidNewExpiry = addExpiryMode !== "new"
      || (
        Boolean(String(draftExpiryValue ?? "").trim())
        && !isStockAddExpiryDateBlocked(draftExpiryValue)
      );
    saveButton.disabled = !(
      hasQuantity
      && hasBatch
      && hasValidNewExpiry
      && !isExpiryDateValueExpired(draftExpiryValue)
      && !(
        addExpiryMode === "new"
        && isSellPriorityLockedForExpiryDate(draftExpiryValue)
      )
    );
  }

  saveButton.addEventListener("click", () => {
    const isPerBatchSelected = addExpiryMode === "per-batch";
    if (isPerBatchSelected && !normalizeSellPriorityBatchKey(draftAddBatchKey)) {
      batchField?.select?.classList.add("is-error");
      window.setTimeout(() => batchField?.select?.classList.remove("is-error"), 1800);
      batchField?.trigger?.focus();
      showStockEditorSnackbar(
        "Select Batch",
        "Choose which batch to add stock to.",
        "error",
      );
      return;
    }
    if (addExpiryMode === "new") {
      if (!String(draftExpiryValue ?? "").trim()) {
        showStockEditorSnackbar(
          "Expiry Date",
          "Choose a new expiry date before adding stock.",
          "error",
        );
        return;
      }
      if (isExpiryDateValueExpired(draftExpiryValue)) {
        notifyExpiredStockNotAllowed();
        return;
      }
      if (isSellPriorityLockedForExpiryDate(draftExpiryValue)) {
        notifyNearExpiryStockAddNotAllowed();
        return;
      }
    }
    if (isExpiryDateValueExpired(draftExpiryValue)) {
      notifyExpiredStockNotAllowed();
      return;
    }
    const selectedBatch = isPerBatchSelected
      ? (batchField?.getSelectedBatch?.() || null)
      : null;
    if (selectedBatch) {
      draftExpiryValue = formatDateTimeLocalValue(selectedBatch.expiryDate || "");
    }
    void saveStockEditModalChanges(
      sourceProduct,
      draftAddStockValue,
      "",
      "",
      "",
      draftExpiryValue,
      {
        displayProduct,
        selectProductOnSave: false,
        addStockInput: quantityField.input,
        primaryButton: saveButton,
        selectedAddBatchKey: isPerBatchSelected ? draftAddBatchKey : "",
      },
    ).then((didSave) => {
      if (didSave) {
        closeStockActionDropdown();
      }
    });
  });

  body.append(splitRow, expiryOptions);
  footer.append(cancelButton, saveButton);
  quantityField.input.setAttribute("aria-label", "Add quantity");
  syncPerBatchUi();
  syncExpiryLockState();
  syncSaveState();
  window.requestAnimationFrame(() => quantityField.input.focus());
}

function fillStockDeductDropdown(body, footer, sourceProduct, displayProduct) {
  let draftDeductValue = "";
  let draftDeductReasonValue = "";
  let draftDeductReasonDetailValue = "";
  let draftDeductBatchKey = "";

  const deductBatches = hasInventoryExpiryDetails(sourceProduct)
    ? getInventoryExpiryBatches(sourceProduct).filter((batch) => batch.stock > 0)
    : [];
  const requiresBatchSelection = deductBatches.length >= 2;

  const quantityField = createStockDetailDeductInputRow("Quantity", "", (nextValue) => {
    draftDeductValue = nextValue;
    syncSaveState();
  });
  const reasonField = createStockDetailDeductReasonRow("Reason", "", (nextValue) => {
    draftDeductReasonValue = nextValue;
    syncSaveState();
  });
  const batchField = requiresBatchSelection
    ? createStockDetailBatchSelectRow(
        "Select Batch",
        deductBatches,
        "",
        (nextValue) => {
          draftDeductBatchKey = normalizeSellPriorityBatchKey(nextValue);
          syncSaveState();
        },
      )
    : null;
  const reasonDetailField = createStockDetailTextInputRow(
    "Other Reason",
    "",
    "Type the deduct reason",
    (nextValue) => {
      draftDeductReasonDetailValue = nextValue;
      syncSaveState();
    },
  );
  reasonDetailField.row.hidden = true;

  const cancelButton = createStockActionDropdownButton("Cancel", "secondary");
  const saveButton = createStockActionDropdownButton("Deduct Stock", "primary");
  cancelButton.addEventListener("click", () => closeStockActionDropdown());

  function syncSaveState() {
    const parsedStock = Number(draftDeductValue);
    const hasQuantity = Number.isFinite(parsedStock) && parsedStock < 0;
    const reason = normalizeStockDeductReason(draftDeductReasonValue);
    const needsOther = reason === "other";
    const hasBatch = !requiresBatchSelection || Boolean(normalizeSellPriorityBatchKey(draftDeductBatchKey));
    reasonDetailField.row.hidden = !needsOther;
    saveButton.disabled = !(
      hasQuantity &&
      reason &&
      hasBatch &&
      (!needsOther || Boolean(normalizeStockDeductReasonDetail(draftDeductReasonDetailValue)))
    );
    if (stockActionDropdown?.isConnected) {
      positionStockActionDropdown();
    }
  }

  saveButton.addEventListener("click", () => {
    if (requiresBatchSelection && !normalizeSellPriorityBatchKey(draftDeductBatchKey)) {
      batchField?.select?.classList.add("is-error");
      window.setTimeout(() => batchField?.select?.classList.remove("is-error"), 1800);
      batchField?.trigger?.focus();
      return;
    }
    const selectedBatch = batchField?.getSelectedBatch?.() || null;
    if (requiresBatchSelection && selectedBatch) {
      const parsedStock = Math.abs(Math.trunc(Number(draftDeductValue) || 0));
      if (parsedStock > selectedBatch.stock) {
        quantityField.input?.classList.add("is-error");
        window.setTimeout(() => quantityField.input?.classList.remove("is-error"), 1800);
        showStockEditorSnackbar(
          "Select Batch",
          `This batch only has ${formatUnits(selectedBatch.stock)} available.`,
          "error",
        );
        return;
      }
    }
    void saveStockEditModalChanges(
      sourceProduct,
      "0",
      draftDeductValue,
      draftDeductReasonValue,
      draftDeductReasonDetailValue,
      formatDateTimeLocalValue(
        selectedBatch?.expiryDate
          || getProductExpiryDate(
            isSplitStockDisplayEntry(displayProduct) ? displayProduct : sourceProduct,
          ),
      ),
      {
        displayProduct,
        selectProductOnSave: false,
        deductInput: quantityField.input,
        deductReasonSelect: reasonField.select,
        deductReasonDetailInput: reasonDetailField.input,
        deductBatchSelect: batchField?.select || null,
        selectedDeductBatchKey: draftDeductBatchKey,
        primaryButton: saveButton,
      },
    ).then((didSave) => {
      if (didSave) {
        closeStockActionDropdown();
      }
    });
  });

  body.append(createStockActionDropdownSplitRow(quantityField, reasonField));
  if (batchField) {
    body.appendChild(batchField.row);
  }
  body.appendChild(reasonDetailField.row);
  footer.append(cancelButton, saveButton);
  quantityField.input.setAttribute("aria-label", "Deduct quantity");
  syncSaveState();
  window.requestAnimationFrame(() => quantityField.input.focus());
}

function getInventoryExpiryStatusMeta(batch) {
  if (!hasStockExpiryDate(batch?.expiryDate)) {
    return { label: "No expiry date", className: "is-neutral" };
  }
  const daysUntilExpiry = Number.isFinite(batch?.daysUntilExpiry)
    ? batch.daysUntilExpiry
    : getDaysUntilExpiryValue(batch?.expiryDate);
  if (!Number.isFinite(daysUntilExpiry)) {
    return { label: "Date unavailable", className: "is-neutral" };
  }
  if (daysUntilExpiry < 0) {
    const elapsedDays = Math.abs(daysUntilExpiry);
    return {
      label: elapsedDays === 1 ? "Expired 1 day ago" : `Expired ${elapsedDays} days ago`,
      className: "is-expired",
    };
  }
  if (daysUntilExpiry === 0) {
    return { label: "Expires today", className: "is-warning" };
  }
  if (daysUntilExpiry === 1) {
    return { label: "Near expiry - 1 day left", className: "is-warning" };
  }
  if (batch?.isNearExpiry) {
    return {
      label: `Near expiry - ${daysUntilExpiry} days left`,
      className: "is-warning",
    };
  }
  return {
    label: `Active - ${daysUntilExpiry} days left`,
    className: "is-active",
  };
}

function fillStockExpiryDropdown(body, footer, sourceProduct, displayProduct) {
  const expiryBatches = getInventoryExpiryBatches(displayProduct);
  body.classList.add("stock-action-dropdown__body--expiry");
  footer.remove();

  if (!expiryBatches.length) {
    const emptyState = document.createElement("p");
    emptyState.className = "stock-expiry-dropdown__empty";
    emptyState.textContent = "No stock batches are recorded for this listing.";
    body.appendChild(emptyState);
    return;
  }

  const tableShell = document.createElement("div");
  tableShell.className = "stock-expiry-dropdown__table-shell";

  const table = document.createElement("table");
  table.className = "stock-expiry-dropdown__table";

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  ["Batch", "Stock", "Expiry date", "Status", "Priority", "Action"].forEach((label) => {
    const th = document.createElement("th");
    th.scope = "col";
    th.textContent = label;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);

  const tbody = document.createElement("tbody");
  expiryBatches.forEach((batch) => {
    const row = document.createElement("tr");
    row.className = "stock-expiry-dropdown__row";

    const batchCell = document.createElement("td");
    batchCell.className = "stock-expiry-dropdown__batch";
    batchCell.textContent = batch.label;

    const stockCell = document.createElement("td");
    stockCell.className = "stock-expiry-dropdown__stock";
    stockCell.textContent = formatStockCountDisplay(batch.stock);

    const expiryCell = document.createElement("td");
    expiryCell.className = "stock-expiry-dropdown__date";
    expiryCell.textContent = hasStockExpiryDate(batch.expiryDate)
      ? formatExpiryDateDisplay(batch.expiryDate)
      : "No expiry date";

    const statusCell = document.createElement("td");
    const statusMeta = getInventoryExpiryStatusMeta(batch);
    const statusBadge = document.createElement("span");
    statusBadge.className = `stock-expiry-dropdown__status ${statusMeta.className}`;
    statusBadge.textContent = statusMeta.label;
    statusCell.appendChild(statusBadge);

    const priorityCell = document.createElement("td");
    priorityCell.className = "stock-expiry-dropdown__priority";
    const priorityButton = createSellPriorityToggleControl(
      sourceProduct,
      resolveExpiryDetailPriorityBatchKey(batch),
      { labelMode: "on-off", forExpiryDetails: true },
    );
    if (priorityButton) {
      priorityButton.classList.add("stock-expiry-dropdown__priority-button");
      priorityCell.appendChild(priorityButton);
    } else {
      const fallbackButton = document.createElement("button");
      const sellableBatchCount = expiryBatches.filter((candidate) =>
        !candidate.isExpired && candidate.stock > 0
      ).length;
      const isDefaultOnlyBatch = sellableBatchCount <= 1
        && !batch.isExpired
        && batch.stock > 0;
      const priorityBatchKey = resolveExpiryDetailPriorityBatchKey(batch);
      const isPriorityOn = getSellPrioritySourceBatch(sourceProduct) === priorityBatchKey;
      fallbackButton.type = "button";
      fallbackButton.className = "stock-chip stock-priority-toggle stock-expiry-dropdown__priority-button";
      fallbackButton.classList.toggle("is-active", isPriorityOn || isDefaultOnlyBatch);
      fallbackButton.textContent = isDefaultOnlyBatch
        ? "Default"
        : (isPriorityOn ? "On" : "Off");
      fallbackButton.disabled = true;
      fallbackButton.setAttribute("role", "switch");
      fallbackButton.setAttribute(
        "aria-checked",
        (isPriorityOn || isDefaultOnlyBatch) ? "true" : "false",
      );
      fallbackButton.setAttribute(
        "aria-label",
        isDefaultOnlyBatch
          ? "Default sell order; this is the only stock batch"
          : `Sell priority ${isPriorityOn ? "on" : "off"}; unavailable for this batch`,
      );
      fallbackButton.title = batch.isExpired || batch.stock <= 0
        ? "Priority is unavailable for this batch."
        : isDefaultOnlyBatch
          ? "Only one stock batch is available, so the system deducts from this batch by default."
          : "Priority is not needed when only one sellable batch is available.";
      priorityCell.appendChild(fallbackButton);
    }

    const actionCell = document.createElement("td");
    actionCell.className = "stock-expiry-dropdown__action";
    if (canDeleteInventoryExpiryDetailBatch(sourceProduct, batch)) {
      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "stock-expiry-dropdown__delete-button";
      deleteButton.innerHTML = STOCK_DELETE_ACTION_ICON_MARKUP;
      deleteButton.title = "Delete this batch";
      deleteButton.setAttribute("aria-label", `Delete ${batch.label || "batch"}`);
      deleteButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        openStockExpiryBatchDeleteConfirmationModal(sourceProduct, batch, deleteButton);
      });
      actionCell.appendChild(deleteButton);
    } else {
      actionCell.textContent = "—";
    }

    row.append(batchCell, stockCell, expiryCell, statusCell, priorityCell, actionCell);
    tbody.appendChild(row);
  });

  table.append(thead, tbody);
  tableShell.appendChild(table);
  body.appendChild(tableShell);
}

async function saveSellPrioritySourceBatch(product, nextSourceBatch) {
  const sourceProduct = getStockSourceProduct(product);
  const productId = String(sourceProduct?.id ?? "").trim();
  if (!productId) {
    return false;
  }
  const liveProduct = currentStockProducts.find((candidate) =>
    String(candidate?.id ?? "").trim() === productId,
  ) || sourceProduct;

  const expiryDropdownToRefresh =
    stockActionDropdownMode === "expiry" && stockActionDropdown instanceof HTMLElement
      ? stockActionDropdown
      : null;

  const normalizedNextSourceBatch = normalizeSellPriorityBatchKey(nextSourceBatch);
  const resolvedNextSourceBatch = normalizedNextSourceBatch;
  const currentPriority = getSellPrioritySourceBatch(liveProduct);
  if (
    !resolvedNextSourceBatch
    && currentPriority
    && hasInventoryExpiryDetails(liveProduct)
  ) {
    showStockEditorSnackbar(
      "Priority required",
      "At least one batch must stay On in Expiry Details. Turn On another batch instead of turning this Off.",
      "error",
    );
    return false;
  }

  try {
    suppressStockRealtimeRefresh();
    const inventoryStock = getStock(liveProduct);
    const response = await fetch(`/api/products/${encodeURIComponent(productId)}`, {
      method: "PUT",
      headers: withStockAdminScopeHeaders({
        "Content-Type": "application/json",
      }),
      // Keep full product fields (normalizeProduct needs name/description/etc.) while
      // still marking this as an inventory action so approval stays approved.
      body: JSON.stringify(withStockAdminScopePayload({
        ...liveProduct,
        stock: inventoryStock,
        inventoryStock,
        lastRestockPreviousStock: getProductOldStockCount(liveProduct),
        lastRestockPreviousExpiryDate: String(getProductOldStockExpiryDate(liveProduct) ?? "").trim(),
        lastRestockAddedStock: getProductNewStockCount(liveProduct),
        lastRestockExpiryDate: String(getProductNewStockDate(liveProduct) ?? "").trim(),
        lastRestockedAt: String(getProductLastRestockedDate(liveProduct) ?? "").trim(),
        lastStockAddedQuantity: getProductLastAddedStockQuantity(liveProduct),
        lastStockDeductedQuantity: getProductLastDeductedStockQuantity(liveProduct),
        sellPrioritySourceBatch: resolvedNextSourceBatch,
        __activityContext: "inventory",
        __activityActor: getStockActivityActor(),
      })),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.message || "Unable to save sell priority.");
    }

    const persistedPriority = normalizeSellPriorityBatchKey(
      data?.product?.sellPrioritySourceBatch ?? resolvedNextSourceBatch,
    );
    const nextPriorityToApply = (
      resolvedNextSourceBatch && persistedPriority === resolvedNextSourceBatch
    ) || !resolvedNextSourceBatch
      ? (persistedPriority || resolvedNextSourceBatch)
      : resolvedNextSourceBatch;

    const updatedProduct = {
      ...liveProduct,
      ...(data?.product ?? {}),
      sellPrioritySourceBatch: nextPriorityToApply,
    };
    currentStockProducts = currentStockProducts.map((candidate) =>
      String(candidate?.id ?? "").trim() === productId
        ? updatedProduct
        : candidate,
    );
    suppressStockRealtimeRefresh();
    syncSellPriorityButtonsInPlace(updatedProduct);
    if (
      expiryDropdownToRefresh
      && stockActionDropdown === expiryDropdownToRefresh
      && stockActionDropdownMode === "expiry"
      && expiryDropdownToRefresh.isConnected
    ) {
      positionStockActionDropdown();
    }
    broadcastStockProductsUpdated();
    showStockEditorSnackbar(
      resolvedNextSourceBatch ? "Priority set" : "Priority cleared",
      resolvedNextSourceBatch
        ? "This batch will be sold first."
        : "Sell priority was cleared.",
      "success",
    );
    return true;
  } catch (error) {
    console.error(error);
    showStockEditorSnackbar(
      "Set Priority",
      error instanceof Error ? error.message : "Unable to save sell priority.",
      "error",
    );
    return false;
  }
}

function applySellPriorityButtonState(priorityButton, sourceProduct, sourceBatch) {
  if (!(priorityButton instanceof HTMLElement)) {
    return;
  }
  const currentSourceBatch = normalizeSellPriorityBatchKey(sourceBatch);
  const isSellPriorityBatch = getSellPrioritySourceBatch(sourceProduct) === currentSourceBatch
    && Boolean(currentSourceBatch);
  const expiryDetailBatch = getInventoryExpiryBatches(sourceProduct)
    .find((batch) => resolveExpiryDetailPriorityBatchKey(batch) === currentSourceBatch);
  const classifiedBatch = getClassifiedInventoryBatches(sourceProduct)
    .find((batch) => batch.sourceBatch === currentSourceBatch);
  // No-expiry batches are never priority-locked. Do not fall back to another batch's date.
  const batchExpiryDate = String(
    expiryDetailBatch?.expiryDate
      ?? classifiedBatch?.expiryDate
      ?? "",
  ).trim();
  const isNoExpiryPriorityBatch = currentSourceBatch === "undated"
    || !hasStockExpiryDate(batchExpiryDate);
  const isPriorityLocked = !isNoExpiryPriorityBatch
    && hasStockExpiryDate(batchExpiryDate)
    && isSellPriorityLockedForExpiryDate(batchExpiryDate);
  const lockedReason = getSellPriorityLockedReason();
  const usesOnOffLabels = priorityButton.dataset.stockPriorityLabelMode === "on-off";

  priorityButton.classList.toggle("is-active", isSellPriorityBatch);
  priorityButton.classList.toggle("is-locked", isPriorityLocked);
  priorityButton.textContent = usesOnOffLabels
    ? (isSellPriorityBatch ? "On" : "Off")
    : (isSellPriorityBatch ? "Priority" : "Set Priority");
  if (usesOnOffLabels) {
    priorityButton.setAttribute("role", "switch");
    priorityButton.setAttribute("aria-checked", isSellPriorityBatch ? "true" : "false");
    priorityButton.removeAttribute("aria-pressed");
  } else {
    priorityButton.removeAttribute("role");
    priorityButton.removeAttribute("aria-checked");
    priorityButton.setAttribute("aria-pressed", isSellPriorityBatch ? "true" : "false");
  }
  if (isPriorityLocked) {
    priorityButton.disabled = true;
    priorityButton.title = lockedReason;
    priorityButton.setAttribute("aria-label", lockedReason);
    return;
  }
  priorityButton.disabled = false;
  priorityButton.title = usesOnOffLabels
    ? `Turn priority ${isSellPriorityBatch ? "off" : "on"}`
    : isSellPriorityBatch
      ? "This batch will be sold first. Click to clear priority."
      : "Sell this batch first";
  priorityButton.setAttribute(
    "aria-label",
    usesOnOffLabels
      ? `Turn sell priority ${isSellPriorityBatch ? "off" : "on"}`
      : isSellPriorityBatch ? "Clear sell priority" : "Set sell priority",
  );
}

function syncSellPriorityButtonsInPlace(sourceProduct) {
  const productId = String(sourceProduct?.id ?? "").trim();
  if (!productId) {
    return;
  }

  document.querySelectorAll(".stock-priority-toggle").forEach((button) => {
    if (!(button instanceof HTMLElement)) {
      return;
    }
    if (String(button.dataset.stockSourceProductId ?? "").trim() !== productId) {
      return;
    }
    applySellPriorityButtonState(
      button,
      sourceProduct,
      button.dataset.stockPriorityBatch,
    );
  });
}

function createSellPriorityToggleControl(product, sourceBatchOverride = "", options = {}) {
  const sourceProduct = getStockSourceProduct(product);
  const matchedExpiryBatch = options.forExpiryDetails === true
    ? getInventoryExpiryBatches(sourceProduct).find((batch) =>
      resolveExpiryDetailPriorityBatchKey(batch) === normalizeSellPriorityBatchKey(sourceBatchOverride)
      || normalizeSellPriorityBatchKey(batch.sourceBatch) === normalizeSellPriorityBatchKey(sourceBatchOverride)
    )
    : null;
  const currentSourceBatch = options.forExpiryDetails === true
    ? resolveExpiryDetailPriorityBatchKey(matchedExpiryBatch, sourceBatchOverride)
    : normalizeSellPriorityBatchKey(
      sourceBatchOverride || getStockDisplaySourceBatch(product) || "",
    );
  const canShow = options.forExpiryDetails === true
    ? canShowExpiryDetailSellPriorityControl(product, currentSourceBatch)
    : canShowSellPriorityControl(product, currentSourceBatch);
  if (!canShow || !currentSourceBatch) {
    return null;
  }
  const priorityButton = document.createElement("button");
  priorityButton.type = "button";
  priorityButton.className = "stock-chip stock-priority-toggle";
  priorityButton.dataset.stockSourceProductId = String(sourceProduct?.id ?? "").trim();
  priorityButton.dataset.stockPriorityBatch = currentSourceBatch;
  if (options.labelMode === "on-off") {
    priorityButton.dataset.stockPriorityLabelMode = "on-off";
  }
  applySellPriorityButtonState(priorityButton, sourceProduct, currentSourceBatch);
  priorityButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (priorityButton.disabled || priorityButton.classList.contains("is-locked")) {
      notifySellPriorityLocked();
      return;
    }
    const currentlyActive = getSellPrioritySourceBatch(sourceProduct) === currentSourceBatch;
    if (currentlyActive && options.forExpiryDetails === true) {
      showStockEditorSnackbar(
        "Priority required",
        "At least one batch must stay On in Expiry Details. Turn On another batch instead of turning this Off.",
        "error",
      );
      return;
    }
    void saveSellPrioritySourceBatch(
      sourceProduct,
      currentlyActive ? "" : currentSourceBatch,
    );
  });
  return priorityButton;
}

function closeNearExpiryBatchOverlay() {
  const overlay = stockNearExpiryOverlay;
  const toggle = stockNearExpiryOverlayToggle;
  const panel = toggle?.closest(".stock-product-card__near-expiry-curtain");
  toggle?.classList.remove("is-open");
  toggle?.setAttribute("aria-expanded", "false");
  panel?.classList.remove("is-open");
  stockNearExpiryOverlayCard?.classList.remove("is-near-expiry-curtain-open");
  if (overlay instanceof HTMLElement) {
    overlay.hidden = true;
    overlay.setAttribute("hidden", "");
    overlay.classList.remove("is-open", "is-above");
    overlay.style.cssText = "";
  }
  stockNearExpiryOverlay = null;
  stockNearExpiryOverlayToggle = null;
  stockNearExpiryOverlayCard = null;
  document.removeEventListener("keydown", handleNearExpiryBatchOverlayKeydown, true);
}

function handleNearExpiryBatchOverlayKeydown(event) {
  if (event.key === "Escape") {
    event.preventDefault();
    closeNearExpiryBatchOverlay();
  }
}

function openNearExpiryBatchOverlay(toggle, menu, card) {
  if (!(toggle instanceof HTMLElement) || !(menu instanceof HTMLElement)) {
    return;
  }

  if (stockNearExpiryOverlayToggle === toggle && stockNearExpiryOverlay === menu) {
    closeNearExpiryBatchOverlay();
    return;
  }

  closeStockActionDropdown();
  closeNearExpiryBatchOverlay();

  // Keep the Near Expiry dropdown independent from the Add/Deduct form dropdown.
  menu.classList.remove("stock-action-dropdown");
  menu.classList.remove("stock-action-dropdown--add");
  menu.classList.remove("stock-action-dropdown--deduct");
  menu.style.removeProperty("--stock-action-dropdown-arrow-left");

  stockNearExpiryOverlay = menu;
  stockNearExpiryOverlayToggle = toggle;
  stockNearExpiryOverlayCard = card instanceof HTMLElement
    ? card
    : toggle.closest(".stock-product-card");

  menu.classList.add("is-open");
  menu.hidden = false;
  menu.removeAttribute("hidden");
  menu.style.cssText = "";
  toggle.classList.add("is-open");
  toggle.setAttribute("aria-expanded", "true");
  toggle.closest(".stock-product-card__near-expiry-curtain")?.classList.add("is-open");
  stockNearExpiryOverlayCard?.classList.add("is-near-expiry-curtain-open");

  document.addEventListener("keydown", handleNearExpiryBatchOverlayKeydown, true);
}

function formatNearExpiryDaysLabel(expiryDate) {
  const daysUntilExpiry = getDaysUntilExpiryValue(expiryDate);
  if (daysUntilExpiry === null) {
    return "";
  }
  if (daysUntilExpiry === 0) {
    return "Expires today";
  }
  if (daysUntilExpiry === 1) {
    return "1 day left";
  }
  return `${daysUntilExpiry} days left`;
}

function createNearExpiryBatchDropdown(product) {
  const nearExpiryGroups = groupNearExpiryInventoryBatches(product);
  if (!shouldShowNearExpiryBatchDropdown(product)) {
    return null;
  }

  const sourceProduct = getStockSourceProduct(product);
  const totalNearExpiryUnits = nearExpiryGroups.reduce((sum, group) => sum + group.stock, 0);
  const dateCountLabel = nearExpiryGroups.length === 1
    ? "1 date"
    : `${nearExpiryGroups.length} dates`;
  const showWarningTone = isInventoryWarningTableView();

  const panel = document.createElement("div");
  panel.className = `stock-product-card__batch-panel stock-product-card__near-expiry-curtain${showWarningTone ? " is-warning" : ""}`;
  panel.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
  });
  panel.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = `stock-product-card__batch-toggle stock-product-card__near-expiry-curtain-toggle${showWarningTone ? " is-warning" : ""}`;
  toggle.setAttribute("aria-expanded", "false");
  toggle.title = "Show near expiry batches";
  toggle.setAttribute(
    "aria-label",
    `Near expiry, ${formatStockCountDisplay(totalNearExpiryUnits)} units, ${dateCountLabel}`,
  );
  toggle.innerHTML = `<span class="stock-product-card__near-expiry-curtain-handle" aria-hidden="true"><span class="stock-product-card__near-expiry-curtain-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"></path></svg></span></span>`;

  const menu = document.createElement("div");
  const menuId = `stock-near-expiry-batches-${++stockNearExpiryDisclosureSerial}`;
  menu.id = menuId;
  menu.className = `stock-product-card__batch-menu${showWarningTone ? " is-warning" : ""}`;
  menu.hidden = true;
  menu.setAttribute("role", "region");
  menu.setAttribute("aria-label", "Near expiry batches");
  toggle.setAttribute("aria-controls", menuId);
  menu.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
  });
  menu.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  const menuDialog = document.createElement("section");
  menuDialog.className = "stock-product-card__batch-menu-dialog";

  const menuHeader = document.createElement("header");
  menuHeader.className = "stock-product-card__batch-menu-header";

  const menuIcon = document.createElement("span");
  menuIcon.className = "stock-product-card__batch-menu-icon";
  menuIcon.setAttribute("aria-hidden", "true");
  menuIcon.innerHTML = STOCK_NEAR_EXPIRY_REASON_ICON_MARKUP;

  const menuCopy = document.createElement("div");
  const menuTitle = document.createElement("h3");
  menuTitle.textContent = "Near expiry batches";
  const menuSubtitle = document.createElement("p");
  menuSubtitle.textContent = `${formatStockCountDisplay(totalNearExpiryUnits)} units · ${dateCountLabel}`;
  menuCopy.append(menuTitle, menuSubtitle);

  const menuClose = document.createElement("button");
  menuClose.type = "button";
  menuClose.className = "stock-product-card__batch-menu-close";
  menuClose.setAttribute("aria-label", "Close near expiry batches");
  menuClose.title = "Close";
  menuClose.innerHTML = STOCK_ACTION_DROPDOWN_CLOSE_ICON_MARKUP;
  menuClose.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    closeNearExpiryBatchOverlay();
  });
  menuHeader.append(menuIcon, menuCopy, menuClose);

  const menuBody = document.createElement("div");
  menuBody.className = "stock-product-card__batch-menu-body";

  const tableShell = document.createElement("div");
  tableShell.className = "stock-product-card__batch-table-shell";

  const table = document.createElement("table");
  table.className = "stock-product-card__batch-table";

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  ["Units", "Expiry date", "Days left", "Priority"].forEach((label) => {
    const th = document.createElement("th");
    th.scope = "col";
    th.textContent = label;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);

  const tbody = document.createElement("tbody");
  nearExpiryGroups.forEach((group) => {
    const row = document.createElement("tr");
    row.className = "stock-product-card__batch-table-row";

    const unitsCell = document.createElement("td");
    unitsCell.className = "stock-product-card__batch-table-cell stock-product-card__batch-table-cell--units";
    unitsCell.textContent = formatStockCountDisplay(group.stock);

    const expiryCell = document.createElement("td");
    expiryCell.className = "stock-product-card__batch-table-cell stock-product-card__batch-table-cell--expiry";
    expiryCell.textContent = formatExpiryDateDisplay(group.expiryDate);

    const daysCell = document.createElement("td");
    daysCell.className = "stock-product-card__batch-table-cell stock-product-card__batch-table-cell--days";
    daysCell.textContent = formatNearExpiryDaysLabel(group.expiryDate) || "—";

    const priorityCell = document.createElement("td");
    priorityCell.className = "stock-product-card__batch-table-cell stock-product-card__batch-table-cell--priority";
    const priorityButton = createSellPriorityToggleControl(sourceProduct, group.sourceBatch);
    if (priorityButton) {
      priorityButton.classList.add("stock-product-card__batch-item-priority");
      priorityCell.appendChild(priorityButton);
    } else {
      priorityCell.textContent = "—";
    }

    row.append(unitsCell, expiryCell, daysCell, priorityCell);
    tbody.appendChild(row);
  });

  table.append(thead, tbody);
  tableShell.appendChild(table);
  menuBody.appendChild(tableShell);
  menuDialog.append(menuHeader, menuBody);
  menu.appendChild(menuDialog);

  function toggleNearExpiryOverlay(event) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    const card = panel.closest(".stock-product-card");
    openNearExpiryBatchOverlay(toggle, menu, card);
  }

  toggle.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
  }, true);
  toggle.addEventListener("click", toggleNearExpiryOverlay, true);

  panel.append(toggle, menu);
  return panel;
}

function createStockExpiryReasonPanel(product) {
  if (!isInventoryWarningTableView()) {
    return null;
  }
  const isExpiredRow = isExpiredInventoryRow(product);
  const isNearExpiryRow = isNearExpiryInventoryRow(product);
  if (!isExpiredRow && !isNearExpiryRow) {
    return null;
  }
  if (!isExpiredRow && hasInventoryExpiryDetails(product)) {
    return null;
  }

  const isPriorityLocked = !isExpiredRow
    && isSellPriorityLockedForExpiryDate(getProductExpiryDate(product));
  const panel = document.createElement("div");
  panel.className = `stock-product-card__table-reason${isExpiredRow ? " is-expired" : " is-near-expiry"}`;
  panel.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  const copy = document.createElement("span");
  copy.className = "stock-product-card__table-reason-copy";
  copy.innerHTML = isExpiredRow
    ? STOCK_EXPIRED_REASON_ICON_MARKUP
    : STOCK_NEAR_EXPIRY_REASON_ICON_MARKUP;

  const copyText = document.createElement("span");
  const reasonLabel = document.createElement("strong");
  reasonLabel.textContent = "Reason:";
  const reasonValue = document.createElement("span");
  reasonValue.dataset.stockTableReason = "";
  if (isExpiredRow) {
    reasonValue.textContent = "Expired";
  } else if (isPriorityLocked) {
    reasonValue.textContent = `Near expiry. ${getSellPriorityLockedReason()}`;
  } else {
    reasonValue.textContent = "Near expiry";
  }
  copyText.append(reasonLabel, " ", reasonValue);
  copy.appendChild(copyText);
  panel.appendChild(copy);

  if (isExpiredRow && canDeleteExpiredInventoryRow(product)) {
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "stock-product-card__table-reason-action stock-product-card__table-reason-action--delete";
    deleteButton.innerHTML = `${STOCK_DELETE_ACTION_ICON_MARKUP}<span>Delete</span>`;
    deleteButton.title = "Delete expired stock";
    deleteButton.setAttribute("aria-label", "Delete expired stock");
    deleteButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openStockExpiredDeleteConfirmationModal(product, deleteButton);
    });
    panel.appendChild(deleteButton);
    return panel;
  }

  const prioritySourceBatch = getStockDisplaySourceBatch(product)
    || getClassifiedInventoryBatches(getStockSourceProduct(product))
      .find((batch) => batch.isNearExpiry)
      ?.sourceBatch
    || "";
  const priorityButton = createSellPriorityToggleControl(product, prioritySourceBatch);
  if (priorityButton) {
    priorityButton.classList.add("stock-product-card__table-reason-action");
    panel.appendChild(priorityButton);
  }

  return panel;
}

function createStockCard(product) {
  const article = document.createElement("article");
  article.className = "stock-product-card";
  if (isInventoryWarningTableView()) {
    if (isExpiredInventoryRow(product)) {
      article.classList.add("is-expired");
    } else if (isNearExpiryInventoryRow(product)) {
      article.classList.add("is-near-expiry");
    }
  }
  const productIdentifier = getStockProductIdentifier(product);
  const isSelected = productIdentifier === selectedStockProductId;
  const isEmployeeWorkspace = isEmployeeStockWorkspace();
  const isEmbeddedLiveChatWorkspace = isEmbeddedLiveChatStockWorkspace();
  const isMainInventoryWorkspace = isMainInventoryStockWorkspace();
  const sourceProduct = getStockSourceProduct(product);
  const productId = String(sourceProduct?.id ?? "").trim();
  const expiryBatches = getInventoryExpiryBatches(product);
  const sourceExpiryBatches = getInventoryExpiryBatches(sourceProduct);
  const hasSplitExpiryBatchData = isMainInventoryWorkspace
    && sourceExpiryBatches.length > 0
    && (
      isSplitStockDisplayEntry(product)
      || hasProductRestockDetails(sourceProduct)
    );
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

  let actionGroup = null;
  if (!isEmployeeWorkspace && !isEmbeddedLiveChatWorkspace) {
    actionGroup = document.createElement("div");
    actionGroup.className = isMainInventoryWorkspace
      ? "stock-product-card__actions stock-product-card__table-action"
      : "stock-product-card__actions";
    const addButton = createStockActionButton("add", "Add stock", STOCK_ADD_ACTION_ICON_MARKUP);
    const deductButton = createStockActionButton("deduct", "Deduct stock", STOCK_DEDUCT_ACTION_ICON_MARKUP);
    const activityButton = createStockActionButton(
      "activity",
      "Stock movement",
      STOCK_ACTIVITY_ACTION_ICON_MARKUP,
    );
    actionGroup.append(addButton, deductButton, activityButton);
    const nearExpiryDeleteButton = isMainInventoryWorkspace
      && canDeleteNearExpiryInventoryRow(product)
      ? createStockActionButton(
          "delete",
          `Delete stock expiring within ${STOCK_SELL_PRIORITY_LOCK_DAYS} days`,
          STOCK_DELETE_ACTION_ICON_MARKUP,
        )
      : null;
    if (nearExpiryDeleteButton) {
      actionGroup.appendChild(nearExpiryDeleteButton);
    }
    const visibleExpiryBatches = expiryBatches.filter((batch) => batch.stock > 0);
    const expiryButton = hasInventoryExpiryDetails(product)
      ? createStockActionButton(
          "expiry",
          visibleExpiryBatches.length === 1
            ? "View 1 expiry batch"
            : `View ${visibleExpiryBatches.length} expiry batches`,
          STOCK_EXPIRY_DETAILS_ICON_MARKUP,
        )
      : null;
    if (expiryButton) {
      applyInventoryExpiryActionTone(expiryButton, expiryBatches);
      actionGroup.classList.add("has-expiry-action");
      actionGroup.appendChild(expiryButton);
    }
    actionGroup.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });

    const bindActionButton = (button, mode) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (mode === "activity") {
          openStockMovementModal(product);
          return;
        }
        if (isMainInventoryWorkspace) {
          stockRecordDrawerMode = "records";
          selectedStockProductId = "";
          syncStockRecordDrawer(null);
        }
        openStockActionDropdown(button, mode, product);
      });
      button.addEventListener("keydown", (event) => {
        event.stopPropagation();
      });
    };

    if (!productId) {
      [addButton, deductButton, activityButton].forEach((button) => {
        button.disabled = true;
        button.setAttribute("aria-disabled", "true");
      });
    } else {
      bindActionButton(addButton, "add");
      bindActionButton(deductButton, "deduct");
      bindActionButton(activityButton, "activity");
    }
    if (expiryButton) {
      bindActionButton(expiryButton, "expiry");
    }
    if (nearExpiryDeleteButton) {
      nearExpiryDeleteButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        openStockNearExpiryDeleteConfirmationModal(product, nearExpiryDeleteButton);
      });
      nearExpiryDeleteButton.addEventListener("keydown", (event) => {
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
    image.loading = "eager";
    image.decoding = "sync";
    image.fetchPriority = "high";
    image.setAttribute("data-no-lazy", "");
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
  const isExpiredRow = isExpiredInventoryRow(product);
  const state = isExpiredRow
    ? { label: "Expired", className: "is-empty" }
    : getStockState(stock);

  const chip = document.createElement("span");
  chip.className = hasSplitExpiryBatchData
    ? "stock-chip is-batch-summary"
    : `stock-chip ${state.className}`;
  chip.textContent = hasSplitExpiryBatchData ? "Batch" : state.label;
  if (hasSplitExpiryBatchData) {
    chip.title = "View exact status in Expiry Details";
  }

  const chipGroup = document.createElement("div");
  chipGroup.className = "stock-chip-group";
  chipGroup.appendChild(chip);

  if (!hasSplitExpiryBatchData && isFreshBatch) {
    const freshBatchLabel = String(product?.stockDisplayLabel ?? "").trim();
    if (freshBatchLabel) {
      const freshStockChip = document.createElement("span");
      freshStockChip.className = "stock-chip is-new";
      freshStockChip.textContent = freshBatchLabel;
      chipGroup.appendChild(freshStockChip);
    }
  } else if (!hasSplitExpiryBatchData && isNewStockProduct(product)) {
    const newStockChip = document.createElement("span");
    newStockChip.className = "stock-chip is-new";
    newStockChip.textContent = "New Stock";
    chipGroup.appendChild(newStockChip);
  }

  const mainGoodBatch = getInventoryMainGoodBatch(product);

  const unlistedExpiryDate = mainGoodBatch?.expiryDate || getProductExpiryDate(product);
  if (
    !hasSplitExpiryBatchData
    && !isExpiredRow
    && !mainGoodBatch
    && isSellPriorityLockedForExpiryDate(unlistedExpiryDate)
  ) {
    const unlistedChip = document.createElement("span");
    unlistedChip.className = "stock-chip is-empty";
    unlistedChip.textContent = "Unlisted";
    unlistedChip.title = getSellPriorityLockedReason();
    chipGroup.appendChild(unlistedChip);
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
  const stockedDateRow = hasSplitExpiryBatchData
    ? createStockMetaRow(
        "Stocked",
        "Batch",
        STOCK_STOCKED_DATE_ICON_MARKUP,
        "stock-product-card__meta-row--stocked-date",
      )
    : createStockMetaRow(
        getProductStockedDateLabel(product),
        formatOptionalDate(stockedDate),
        STOCK_STOCKED_DATE_ICON_MARKUP,
        "stock-product-card__meta-row--stocked-date",
        formatOptionalTime(stockedDate),
      );
  const expiryDateRow = hasSplitExpiryBatchData
    ? createStockMetaRow(
        "Expiry",
        "Batch",
        STOCK_EXPIRY_DATE_ICON_MARKUP,
      )
    : createStockMetaExpiryDateRow(
        product,
        STOCK_EXPIRY_DATE_ICON_MARKUP,
      );
  if (hasSplitExpiryBatchData) {
    stockedDateRow.classList.add("stock-product-card__meta-row--batch-summary");
    expiryDateRow.classList.add("stock-product-card__meta-row--batch-summary");
    stockedDateRow.title = "View exact stocked dates in Expiry Details";
    expiryDateRow.title = "View exact expiry dates in Expiry Details";
  }
  const meta = document.createElement("div");
  meta.className = "stock-product-card__meta";
  meta.append(
    createStockCountMetaRow(product),
    stockedDateRow,
    expiryDateRow,
  );

  if (actionGroup) {
    article.append(actionGroup);
  }
  if (variantToggleButton) {
    article.append(variantToggleButton);
  }
  const reasonPanel = createStockExpiryReasonPanel(product);
  article.append(header, chipGroup, meter, meta);
  if (reasonPanel) {
    article.appendChild(reasonPanel);
  }

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
  const newStockItems = products.filter((product) => isNewStockFilterMatch(product)).length;
  const lowStockItems = products.filter((product) => isLowStockProduct(product)).length;
  const outOfStockItems = products.filter((product) => getStock(product) === 0).length;
  const nearExpiryItems = products.filter((product) => isNearExpiryProduct(product)).length;
  const expiredItems = products.filter((product) => isExpiredProduct(product)).length;

  setSummaryValue(stockTotalProducts, totalProducts);
  setSummaryValue(stockTotalUnits, totalUnits);
  setSummaryValue(stockNewCount, newStockItems);
  setSummaryValue(stockLowCount, lowStockItems);
  setSummaryValue(stockEmptyCount, outOfStockItems);
  setSummaryValue(stockNearExpiryCount, nearExpiryItems);
  setSummaryValue(stockExpiredCount, expiredItems);
}

function renderStockInventoryPagination(totalItems) {
  if (!(stockInventoryPagination instanceof HTMLElement)) {
    return;
  }

  stockInventoryPagination.replaceChildren();
  const total = Math.max(0, Number(totalItems) || 0);
  if (!isStockInventoryTableWorkspace() || total <= STOCK_INVENTORY_PAGE_SIZE) {
    stockInventoryPagination.hidden = true;
    return;
  }

  stockInventoryPagination.hidden = false;
  const pageCount = Math.max(1, Math.ceil(total / STOCK_INVENTORY_PAGE_SIZE));
  stockInventoryPage = Math.min(Math.max(1, stockInventoryPage), pageCount);
  const firstRecord = total ? ((stockInventoryPage - 1) * STOCK_INVENTORY_PAGE_SIZE) + 1 : 0;
  const lastRecord = Math.min(total, stockInventoryPage * STOCK_INVENTORY_PAGE_SIZE);

  const info = document.createElement("span");
  info.className = "stock-inventory-pagination__info";
  info.textContent = `Showing ${firstRecord} to ${lastRecord} of ${total} items`;

  const controls = document.createElement("div");
  controls.className = "stock-inventory-pagination__controls";

  function createPageButton(options) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `stock-inventory-page-button${options.active ? " is-active" : ""}`;
    button.disabled = Boolean(options.disabled);
    button.setAttribute("aria-label", options.ariaLabel || `Page ${options.page}`);
    if (options.active) {
      button.setAttribute("aria-current", "page");
    }
    if (options.icon) {
      button.innerHTML = options.icon;
    } else {
      button.textContent = String(options.page);
    }
    button.addEventListener("click", () => {
      if (button.disabled || options.page === stockInventoryPage) {
        return;
      }
      stockInventoryPage = options.page;
      renderStockDashboard(currentStockProducts);
      stockProductList?.scrollTo({ top: 0, behavior: "smooth" });
    });
    return button;
  }

  const previousIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>';
  const nextIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>';

  controls.appendChild(createPageButton({
    page: Math.max(1, stockInventoryPage - 1),
    icon: previousIcon,
    ariaLabel: "Previous page",
    disabled: stockInventoryPage === 1,
  }));

  const visiblePages = Array.from(
    { length: pageCount },
    (_, index) => index + 1,
  ).slice(Math.max(0, stockInventoryPage - 3), Math.max(5, stockInventoryPage + 2));

  visiblePages.forEach((page) => {
    controls.appendChild(createPageButton({
      page,
      active: page === stockInventoryPage,
    }));
  });

  controls.appendChild(createPageButton({
    page: Math.min(pageCount, stockInventoryPage + 1),
    icon: nextIcon,
    ariaLabel: "Next page",
    disabled: stockInventoryPage === pageCount,
  }));

  stockInventoryPagination.append(info, controls);
}

function renderProducts(products) {
  stockProductList.replaceChildren();

  if (!products.length) {
    renderStockInventoryPagination(0);
    const hasSearch = Boolean(normalizeStockSearchTerm(stockSearchTerm));
    if (hasSearch && window.GMS_ADMIN_SEARCH_NOT_FOUND) {
      stockProductList.appendChild(
        createStockInventoryEmptyRow(window.GMS_ADMIN_SEARCH_NOT_FOUND.create()),
      );
      return;
    }

    const activeFilterLabel = getStockPriorityFilterLabel();
    const hasCategoryFilter = Boolean(normalizeStockCategoryFilter(stockCategoryFilter));
    stockProductList.appendChild(
      createStockInventoryEmptyRow(
        createEmptyState(
          hasCategoryFilter
            ? `No ${activeFilterLabel} products match the current category filter.`
            : stockPriorityFilter === "all"
              ? "No saved products available yet."
              : `No ${activeFilterLabel} products available right now.`,
        ),
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

  const visibleProducts = isStockInventoryTableWorkspace()
    ? (() => {
      const pageCount = Math.max(1, Math.ceil(sortedProducts.length / STOCK_INVENTORY_PAGE_SIZE));
      stockInventoryPage = Math.min(Math.max(1, stockInventoryPage), pageCount);
      const startIndex = (stockInventoryPage - 1) * STOCK_INVENTORY_PAGE_SIZE;
      return sortedProducts.slice(startIndex, startIndex + STOCK_INVENTORY_PAGE_SIZE);
    })()
    : sortedProducts;

  renderStockInventoryPagination(sortedProducts.length);
  for (const product of visibleProducts) {
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
      editingStockProductId = "";
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
    editingStockProductId = "";
    renderStockDashboard(currentStockProducts);
    broadcastStockProductsUpdated();
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
    selectProductOnSave,
    addStockInput,
    deductInput,
    deductReasonSelect,
    deductReasonDetailInput,
    deductBatchSelect,
    selectedDeductBatchKey,
    selectedAddBatchKey,
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
  if (normalizedAddStock > 0 && isExpiryDateValueExpired(draftExpiryValue)) {
    notifyExpiredStockNotAllowed();
    return false;
  }
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

  const selectedAddBatchKeyNormalized = normalizeSellPriorityBatchKey(selectedAddBatchKey);
  let selectedAddBatch = null;
  if (normalizedAddStock > 0 && selectedAddBatchKeyNormalized) {
    selectedAddBatch = getInventoryExpiryBatches(sourceProduct).find((batch) =>
      normalizeSellPriorityBatchKey(batch.sourceBatch) === selectedAddBatchKeyNormalized
      && batch.stock > 0
      && !batch.isExpired
    ) || null;
    if (!selectedAddBatch) {
      showStockEditorSnackbar(
        "Select Batch",
        "The selected batch is no longer available.",
        "error",
      );
      return false;
    }
  }

  const selectedDeductBatchKeyNormalized = normalizeSellPriorityBatchKey(selectedDeductBatchKey);
  const availableDeductBatches = normalizedDeductStock > 0
    ? getInventoryExpiryBatches(sourceProduct).filter((batch) => batch.stock > 0)
    : [];
  const requiresDeductBatchSelection = availableDeductBatches.length >= 2;
  let selectedDeductBatch = null;
  if (normalizedDeductStock > 0 && requiresDeductBatchSelection) {
    if (!selectedDeductBatchKeyNormalized) {
      deductBatchSelect?.classList.add("is-error");
      window.setTimeout(() => deductBatchSelect?.classList.remove("is-error"), 1800);
      showStockEditorSnackbar(
        "Select Batch",
        "Choose which batch to deduct stock from.",
        "error",
      );
      return false;
    }
    selectedDeductBatch = availableDeductBatches.find((batch) =>
      normalizeSellPriorityBatchKey(batch.sourceBatch) === selectedDeductBatchKeyNormalized
    ) || null;
    if (!selectedDeductBatch) {
      deductBatchSelect?.classList.add("is-error");
      window.setTimeout(() => deductBatchSelect?.classList.remove("is-error"), 1800);
      showStockEditorSnackbar(
        "Select Batch",
        "The selected batch is no longer available.",
        "error",
      );
      return false;
    }
    if (normalizedDeductStock > selectedDeductBatch.stock) {
      deductInput?.classList.add("is-error");
      window.setTimeout(() => deductInput?.classList.remove("is-error"), 1800);
      showStockEditorSnackbar(
        "Select Batch",
        `This batch only has ${formatUnits(selectedDeductBatch.stock)} available.`,
        "error",
      );
      return false;
    }
  }

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
  const normalizedExpiryDate = selectedAddBatch
    ? normalizeExpiryDateInputValue(selectedAddBatch.expiryDate)
    : normalizeExpiryDateInputValue(draftExpiryValue);
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
  let stockHistorySourceBatch = "";
  let targetSourceBatch = displaySourceBatch || "old";
  if (isSplitBatchEdit && normalizedAddStock > 0 && normalizedDeductStock <= 0 && normalizedExpiryDate) {
    if (stockHistoryExpiryDatesMatch(normalizedExpiryDate, resolvedNewStockExpiryDate)) {
      targetSourceBatch = "new";
    } else if (stockHistoryExpiryDatesMatch(normalizedExpiryDate, resolvedOldStockExpiryDate)) {
      targetSourceBatch = "old";
    } else if (
      isStockExpiryDateAhead(normalizedExpiryDate, resolvedOldStockExpiryDate)
      && (
        !resolvedNewStockExpiryDate
        || isStockExpiryDateAhead(normalizedExpiryDate, resolvedNewStockExpiryDate)
      )
    ) {
      targetSourceBatch = "new";
    } else if (isStockExpiryDateAhead(resolvedNewStockExpiryDate, normalizedExpiryDate)) {
      targetSourceBatch = "old";
    }
  }

  const usingSelectedDeductBatch =
    Boolean(selectedDeductBatch)
    && normalizedDeductStock > 0
    && normalizedAddStock <= 0;
  const usingSelectedAddBatch =
    Boolean(selectedAddBatch)
    && normalizedAddStock > 0
    && normalizedDeductStock <= 0;

  if (usingSelectedAddBatch) {
    updatedOldStock = currentOldStock;
    updatedNewStock = currentNewStock;
    const mappedBatch = mapSellPriorityBatchKeyToOldNew(
      selectedAddBatch.sourceBatch,
      sourceProduct,
    );
    if (mappedBatch === "new") {
      updatedNewStock += normalizedAddStock;
      targetSourceBatch = "new";
      stockHistorySourceBatch = selectedAddBatch.sourceBatch === "undated"
        ? "undated"
        : "new";
    } else if (mappedBatch === "old") {
      updatedOldStock += normalizedAddStock;
      targetSourceBatch = "old";
      stockHistorySourceBatch = selectedAddBatch.sourceBatch === "undated"
        ? "undated"
        : "old";
    } else if (
      hasStockExpiryDate(normalizedExpiryDate)
      && stockBatchesShareExpiryDate(normalizedExpiryDate, resolvedNewStockExpiryDate)
      && currentNewStock > 0
    ) {
      updatedNewStock += normalizedAddStock;
      targetSourceBatch = "new";
      stockHistorySourceBatch = "new";
    } else if (
      hasStockExpiryDate(normalizedExpiryDate)
      && stockBatchesShareExpiryDate(normalizedExpiryDate, resolvedOldStockExpiryDate)
      && currentOldStock > 0
    ) {
      updatedOldStock += normalizedAddStock;
      targetSourceBatch = "old";
      stockHistorySourceBatch = "old";
    } else if (!hasStockExpiryDate(normalizedExpiryDate)) {
      // Undated / no-expiry batch that is only tracked via history.
      updatedOldStock += normalizedAddStock;
      targetSourceBatch = "old";
      stockHistorySourceBatch = "undated";
    } else {
      // Dated history batch that is not currently mapped to old/new fields.
      // Keep product expiry fields stable; history expiry rebuilds the batch.
      updatedOldStock += normalizedAddStock;
      targetSourceBatch = "old";
      stockHistorySourceBatch = normalizeSellPriorityBatchKey(selectedAddBatch.sourceBatch) || "old";
    }

    nextOldStockExpiryDate = updatedOldStock > 0 ? resolvedOldStockExpiryDate : "";
    nextNewStockDate = updatedNewStock > 0 ? resolvedNewStockExpiryDate : "";
    nextRestockedAt = nextModifiedAt;
    nextStockedDate = nextModifiedAt;
    stockHistoryExpiryDate = hasStockExpiryDate(normalizedExpiryDate) ? normalizedExpiryDate : "";
    stockHistoryLabel = currentStock === 0 ? "New Stock" : "Added Stock";
    stockHistoryBatchRole = "fresh";
  } else if (usingSelectedDeductBatch) {
    const mappedBatch = mapSellPriorityBatchKeyToOldNew(
      selectedDeductBatch.sourceBatch,
      sourceProduct,
    ) || (selectedDeductBatch.sourceBatch === "new" ? "new" : "old");

    updatedOldStock = currentOldStock;
    updatedNewStock = currentNewStock;
    let remainingDeductFromBatch = normalizedDeductStock;
    if (mappedBatch === "new") {
      const fromNew = Math.min(updatedNewStock, remainingDeductFromBatch);
      updatedNewStock -= fromNew;
      remainingDeductFromBatch -= fromNew;
      if (remainingDeductFromBatch > 0) {
        updatedOldStock = Math.max(0, updatedOldStock - remainingDeductFromBatch);
      }
    } else {
      const fromOld = Math.min(updatedOldStock, remainingDeductFromBatch);
      updatedOldStock -= fromOld;
      remainingDeductFromBatch -= fromOld;
      if (remainingDeductFromBatch > 0) {
        updatedNewStock = Math.max(0, updatedNewStock - remainingDeductFromBatch);
      }
    }

    nextOldStockExpiryDate = updatedOldStock > 0 ? resolvedOldStockExpiryDate : "";
    nextNewStockDate = updatedNewStock > 0 ? resolvedNewStockExpiryDate : "";
    // Keep the selected batch expiry on history so remaining batches rebuild correctly.
    stockHistoryExpiryDate = String(selectedDeductBatch.expiryDate ?? "").trim();
    stockHistoryLabel = "Deducted";
    stockHistorySourceBatch = selectedDeductBatch.sourceBatch === "undated"
      ? "undated"
      : mappedBatch;
    stockHistoryBatchRole = selectedDeductBatch.isExpired ? "expired" : "fresh";
    targetSourceBatch = mappedBatch;
  } else if (isSplitBatchEdit) {
    const batchCurrentStock = getStock(activeDisplayProduct);
    if (normalizedDeductStock > batchCurrentStock) {
      deductInput?.classList.add("is-error");
      window.setTimeout(() => deductInput?.classList.remove("is-error"), 1800);
      return false;
    }

    if (targetSourceBatch === "old") {
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
      stockHistorySourceBatch = "old";
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
      stockHistorySourceBatch = "new";
    }
  } else {
    const addMatchesNewStockExpiry =
      normalizedAddStock > 0
      && currentNewStock > 0
      && stockBatchesShareExpiryDate(normalizedExpiryDate, resolvedNewStockExpiryDate);
    const addMatchesOldStockExpiry =
      normalizedAddStock > 0
      && currentOldStock > 0
      && stockBatchesShareExpiryDate(normalizedExpiryDate, resolvedOldStockExpiryDate);

    if (addMatchesNewStockExpiry || addMatchesOldStockExpiry) {
      // "Same Expiry Date" belongs to the existing matching batch. Keeping the
      // quantity in that batch prevents the latest expiry from being replaced by
      // a second batch that happens to carry the same date.
      updatedOldStock = currentOldStock;
      updatedNewStock = currentNewStock;
      if (addMatchesNewStockExpiry) {
        updatedNewStock += normalizedAddStock;
        targetSourceBatch = "new";
        stockHistorySourceBatch = "new";
      } else {
        updatedOldStock += normalizedAddStock;
        targetSourceBatch = "old";
        stockHistorySourceBatch = "old";
      }
      nextOldStockExpiryDate = updatedOldStock > 0 ? resolvedOldStockExpiryDate : "";
      nextNewStockDate = updatedNewStock > 0 ? resolvedNewStockExpiryDate : "";
      nextRestockedAt = nextModifiedAt;
      nextStockedDate = nextModifiedAt;
      stockHistoryExpiryDate = normalizedExpiryDate;
      stockHistoryLabel = currentStock === 0 ? "New Stock" : "Added Stock";
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
      const preservedOldStockExpiryDate =
        currentOldStockExpiryDate ||
        currentProductExpiryDate ||
        (
          currentOldStock > 0 && currentNewStock > 0
            ? ""
            : currentNewStockExpiryDate
        );
      const baseOldStockExpiryDate = normalizedAddStock > 0
        ? (
            currentStock > 0
              ? preservedOldStockExpiryDate
              : ""
          )
        : (
            currentOldStock > 0
              ? (
                  currentNewStock > 0
                    ? (currentOldStockExpiryDate || currentProductExpiryDate)
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
  }

  const alignedBatches = alignOldNewBatchesByAheadExpiry(
    updatedOldStock,
    updatedNewStock,
    nextOldStockExpiryDate,
    nextNewStockDate,
  );
  updatedOldStock = alignedBatches.oldStock;
  updatedNewStock = alignedBatches.newStock;
  nextOldStockExpiryDate = alignedBatches.oldExpiry;
  nextNewStockDate = alignedBatches.newExpiry;
  if (alignedBatches.swapped && stockHistorySourceBatch) {
    if (stockHistorySourceBatch === "old") {
      stockHistorySourceBatch = "new";
    } else if (stockHistorySourceBatch === "new") {
      stockHistorySourceBatch = "old";
    }
  }
  if (
    !usingSelectedAddBatch
    && normalizedAddStock > 0
    && !hasStockExpiryDate(stockHistoryExpiryDate)
    && normalizedDeductStock <= 0
  ) {
    stockHistorySourceBatch = "new";
    stockHistoryLabel = currentStock === 0 && !isSplitBatchEdit
      ? "New Stock"
      : "Added New Stock";
    stockHistoryBatchRole = "fresh";
  } else if (!usingSelectedAddBatch && normalizedAddStock > 0 && stockHistoryExpiryDate) {
    if (stockBatchesShareExpiryDate(stockHistoryExpiryDate, nextNewStockDate)) {
      stockHistorySourceBatch = "new";
      if (!isExpiryDateValueExpired(stockHistoryExpiryDate)) {
        stockHistoryLabel = currentStock === 0 && !isSplitBatchEdit
          ? "New Stock"
          : "Added New Stock";
        stockHistoryBatchRole = stockHistoryBatchRole === "expired" ? "expired" : "fresh";
      }
    } else if (stockHistoryExpiryDatesMatch(stockHistoryExpiryDate, nextOldStockExpiryDate)) {
      stockHistorySourceBatch = "old";
      if (
        !isExpiryDateValueExpired(stockHistoryExpiryDate)
        && /new stock/i.test(stockHistoryLabel)
      ) {
        stockHistoryLabel = "Added Stock";
      }
    }
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
  const oldExpiryDayAfterSave = getLocalDateStartTimestamp(nextOldStockExpiryDate);
  const newExpiryDayAfterSave = getLocalDateStartTimestamp(nextNewStockDate);
  const expiryDatesDifferAfterSave =
    Boolean(nextOldStockExpiryDate) !== Boolean(nextNewStockDate) ||
    (
      Number.isFinite(oldExpiryDayAfterSave) &&
      Number.isFinite(newExpiryDayAfterSave) &&
      oldExpiryDayAfterSave !== newExpiryDayAfterSave
    );
  const shouldSplitAfterSave =
    updatedOldStock > 0 &&
    updatedNewStock > 0 &&
    (
      oldBatchIsExpiredAfterSave !== newBatchIsExpiredAfterSave ||
      expiryDatesDifferAfterSave
    );
  const stockHistoryRecordStock = normalizedStock;
  if (!usingSelectedAddBatch && normalizedAddStock > 0 && shouldSplitAfterSave) {
    const addedIsNewBatch = !hasStockExpiryDate(stockHistoryExpiryDate)
      || stockBatchesShareExpiryDate(stockHistoryExpiryDate, nextNewStockDate);
    stockHistorySourceBatch = addedIsNewBatch ? "new" : "old";
    if (isExpiryDateValueExpired(stockHistoryExpiryDate)) {
      stockHistoryBatchRole = "expired";
      stockHistoryLabel = "Added Expired Stock";
    } else {
      stockHistoryBatchRole = "fresh";
      stockHistoryLabel = addedIsNewBatch ? "Added New Stock" : "Added Stock";
    }
  }

  const nextProductExpiryDate =
    shouldSplitAfterSave
      ? (
          oldBatchIsExpiredAfterSave && !newBatchIsExpiredAfterSave
            ? nextNewStockDate
            : newBatchIsExpiredAfterSave && !oldBatchIsExpiredAfterSave
              ? nextOldStockExpiryDate
              : (nextNewStockDate || nextOldStockExpiryDate)
        )
      : updatedNewStock > 0
        ? nextNewStockDate
        : updatedOldStock > 0
          ? nextOldStockExpiryDate
          : "";

  let nextSellPrioritySourceBatch = getSellPrioritySourceBatch(sourceProduct);
  if (alignedBatches.swapped) {
    nextSellPrioritySourceBatch = nextSellPrioritySourceBatch === "old"
      ? "new"
      : nextSellPrioritySourceBatch === "new"
        ? "old"
        : nextSellPrioritySourceBatch;
  }

  // Adding stock by a distinct expiry date creates Latest + Previous batches.
  // Auto-enable priority on Previous stock so sellers don't need to set it manually.
  // Skip when adding into an existing Per Batch selection.
  const addedDistinctExpiryBatch =
    !usingSelectedAddBatch
    && normalizedAddStock > 0
    && normalizedDeductStock <= 0
    && hasStockExpiryDate(stockHistoryExpiryDate)
    && updatedOldStock > 0
    && updatedNewStock > 0
    && (
      shouldSplitAfterSave
      || !stockBatchesShareExpiryDate(nextOldStockExpiryDate, nextNewStockDate)
    )
    && (
      !hasStockExpiryDate(nextOldStockExpiryDate)
      || !stockBatchesShareExpiryDate(stockHistoryExpiryDate, nextOldStockExpiryDate)
    );

  if (addedDistinctExpiryBatch) {
    const previousIsExpired = isExpiryDateValueExpired(nextOldStockExpiryDate);
    const previousIsLocked = hasStockExpiryDate(nextOldStockExpiryDate)
      && isSellPriorityLockedForExpiryDate(nextOldStockExpiryDate);
    if (!previousIsExpired && !previousIsLocked) {
      nextSellPrioritySourceBatch = hasStockExpiryDate(nextOldStockExpiryDate)
        ? "old"
        : "undated";
    }
  }

  const restockMetadata = normalizedAddStock > 0
    || hadRestockDetails
    || shouldSplitAfterSave
    || usingSelectedDeductBatch
    || usingSelectedAddBatch
    || Boolean(nextSellPrioritySourceBatch)
    ? {
        lastRestockPreviousStock: updatedOldStock,
        lastRestockPreviousExpiryDate: nextOldStockExpiryDate,
        lastRestockAddedStock: updatedNewStock,
        lastRestockedAt: nextRestockedAt,
        lastRestockExpiryDate: nextNewStockDate,
        sellPrioritySourceBatch: nextSellPrioritySourceBatch,
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
    ...(stockHistorySourceBatch ? { sourceBatch: stockHistorySourceBatch } : {}),
  };

  try {
    addStockInput?.classList.add("is-saving");
    deductInput?.classList.add("is-saving");
    deductReasonSelect?.classList.add("is-saving");
    deductReasonDetailInput?.classList.add("is-saving");
    deductBatchSelect?.classList.add("is-saving");
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
    if ("disabled" in (deductBatchSelect ?? {})) {
      deductBatchSelect.disabled = true;
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
    const updatedDisplayProductIdentifier =
      (isSplitBatchEdit || shouldSplitAfterSave) && shouldSplitProductIntoStockDisplayCards(updatedProduct)
        ? getStockDisplayIdentifierForSplitBatch(
            updatedProduct,
            isSplitBatchEdit
              ? displayBatchRole
              : (newBatchIsExpiredAfterSave ? "expired" : "fresh"),
            isSplitBatchEdit
              ? (displaySourceBatch || "")
              : "new",
          )
        : getStockProductIdentifier(updatedProduct);
    selectedStockProductId = selectProductOnSave === false ? "" : updatedDisplayProductIdentifier;
    editingStockProductId = "";
    removeStockEditModalOverlay();
    closeStockActionDropdown();
    renderStockDashboard(currentStockProducts);
    broadcastStockProductsUpdated();
    openStockSuccessModal(`Saved "${updatedProduct.name || "product"}" stock changes successfully.`);
    return true;
  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : "Unable to save stock changes.";
    if (/expired/i.test(errorMessage)) {
      showStockEditorSnackbar("Expired stock", errorMessage, "error");
    }
    primaryButton?.classList.add("is-error");
    window.setTimeout(() => primaryButton?.classList.remove("is-error"), 1800);
    return false;
  } finally {
    addStockInput?.classList.remove("is-saving");
    deductInput?.classList.remove("is-saving");
    deductReasonSelect?.classList.remove("is-saving");
    deductReasonDetailInput?.classList.remove("is-saving");
    deductBatchSelect?.classList.remove("is-saving");
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
    if ("disabled" in (deductBatchSelect ?? {})) {
      deductBatchSelect.disabled = false;
      deductBatchSelect.classList.remove("is-disabled");
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
    quantityCell.appendChild(createStockRecordQuantityValueElement(record));

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
    const conditionLabel = recordLabel || "Current Stock";
    const labelPill = document.createElement("span");
    const labelClassName = getStockRecordLabelClassName(conditionLabel);
    labelPill.className = labelClassName
      ? `stock-detail-table__label ${labelClassName}`
      : "stock-detail-table__label";
    labelPill.textContent = conditionLabel;
    labelContent.appendChild(labelPill);

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
      deleteButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash2-icon lucide-trash-2" aria-hidden="true"><path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;
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

function createStockRecordQuantityValueElement(record) {
  const quantityValueShell = document.createElement("div");
  quantityValueShell.className = "stock-detail-table__quantity-value";

  const quantityValue = document.createElement("span");
  quantityValue.className = "stock-detail-table__quantity-number";
  quantityValue.textContent = record?.quantity ?? "-";

  const normalizedStocksValue = String(record?.stocks ?? "").trim();
  if (normalizedStocksValue.startsWith("+")) {
    const directionIcon = document.createElement("span");
    directionIcon.className = "stock-detail-table__quantity-icon-wrap";
    directionIcon.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="stock-detail-table__quantity-icon stock-detail-table__quantity-icon--up" aria-hidden="true"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>';
    quantityValueShell.append(directionIcon, quantityValue);
    return quantityValueShell;
  }

  if (normalizedStocksValue.startsWith("-")) {
    const directionIcon = document.createElement("span");
    directionIcon.className = "stock-detail-table__quantity-icon-wrap";
    directionIcon.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-down-icon lucide-arrow-down stock-detail-table__quantity-icon stock-detail-table__quantity-icon--down" aria-hidden="true"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>';
    quantityValueShell.append(directionIcon, quantityValue);
    return quantityValueShell;
  }

  quantityValueShell.appendChild(quantityValue);
  return quantityValueShell;
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

  if (splitDisplayConfig.expired?.sourceBatch === sourceBatch) {
    return splitDisplayConfig.expired.role || "expired";
  }

  if (splitDisplayConfig.fresh?.sourceBatch === sourceBatch) {
    return splitDisplayConfig.fresh.role || "fresh";
  }

  return "";
}

function getStockDisplayIdentifierForSplitBatch(product, role = "", sourceBatch = "") {
  const splitDisplayConfig = getSplitStockDisplayConfig(product);
  const sourceProduct = getStockSourceProduct(product);
  const baseIdentifier =
    sourceProduct && sourceProduct !== product
      ? getStockProductIdentifier(sourceProduct)
      : getStockProductIdentifier(product);

  if (!splitDisplayConfig) {
    return role ? `${baseIdentifier}::${role}` : baseIdentifier;
  }

  const matchedBatch = [splitDisplayConfig.fresh, splitDisplayConfig.expired].find((batch) => {
    if (!batch) {
      return false;
    }
    if (sourceBatch && batch.sourceBatch === sourceBatch) {
      return true;
    }
    return !sourceBatch && role && (batch.role || "") === role;
  });

  if (!matchedBatch) {
    return role ? `${baseIdentifier}::${role}` : baseIdentifier;
  }

  const matchedRole = matchedBatch.role || role || "fresh";
  const otherBatch =
    matchedBatch === splitDisplayConfig.fresh
      ? splitDisplayConfig.expired
      : splitDisplayConfig.fresh;
  const otherRole = otherBatch?.role || "";
  const displayKey =
    matchedRole && otherRole && matchedRole === otherRole
      ? `${matchedRole}-${matchedBatch.sourceBatch}`
      : matchedRole;

  return `${baseIdentifier}::${displayKey}`;
}

function resolveStockHistoryRecordSourceBatch(record, product) {
  const recordExpiry = record?.expiryDate;
  const addedQuantity = Number(record?.addedQuantity ?? 0);
  const hasAddedQuantity = Number.isFinite(addedQuantity) && addedQuantity > 0;
  if (hasAddedQuantity && !hasStockExpiryDate(recordExpiry)) {
    return "new";
  }

  const oldExpiry = getProductOldStockExpiryDate(product);
  const newExpiry = getProductNewStockDate(product) ?? getProductExpiryDate(product);
  const matchesOldExpiry = stockBatchesShareExpiryDate(recordExpiry, oldExpiry)
    && hasStockExpiryDate(recordExpiry);
  const matchesNewExpiry = stockBatchesShareExpiryDate(recordExpiry, newExpiry)
    && hasStockExpiryDate(recordExpiry);

  if (matchesNewExpiry && !matchesOldExpiry) {
    return "new";
  }
  if (matchesOldExpiry && !matchesNewExpiry) {
    return "old";
  }
  if (recordExpiry && isStockExpiryDateAhead(recordExpiry, oldExpiry) && !isStockExpiryDateAhead(newExpiry, recordExpiry)) {
    return "new";
  }
  if (recordExpiry && isStockExpiryDateAhead(oldExpiry, recordExpiry)) {
    return "old";
  }

  const explicitSourceBatch = normalizeStockHistorySourceBatch(record?.sourceBatch);
  if (explicitSourceBatch) {
    return explicitSourceBatch;
  }

  const lastRestockedTimestamp = getProductLastRestockedTimestamp(product);
  const recordTimestamp = Date.parse(String(record?.modifiedAt ?? "").trim());
  const isBeforeLastRestock =
    Number.isFinite(lastRestockedTimestamp) &&
    Number.isFinite(recordTimestamp) &&
    recordTimestamp < lastRestockedTimestamp - 2000;
  const explicitBatchRole = normalizeStockHistoryBatchRole(record?.batchRole);
  const splitDisplayConfig = getSplitStockDisplayConfig(product);

  if (explicitBatchRole && splitDisplayConfig) {
    const expiredRole = splitDisplayConfig.expired?.role || "expired";
    const freshRole = splitDisplayConfig.fresh?.role || "fresh";
    if (explicitBatchRole === expiredRole && explicitBatchRole !== freshRole) {
      return splitDisplayConfig.expired?.sourceBatch || "old";
    }
    if (explicitBatchRole === freshRole && explicitBatchRole !== expiredRole) {
      return splitDisplayConfig.fresh?.sourceBatch || "new";
    }
  }

  const normalizedLabel = normalizeStockHistoryLabel(record?.label, "");
  if (/added expired stock/i.test(normalizedLabel)) {
    return splitDisplayConfig?.expired?.sourceBatch || "new";
  }
  if (/added new stock/i.test(normalizedLabel) || /^new stock$/i.test(normalizedLabel)) {
    return isStockExpiryDateAhead(oldExpiry, newExpiry) ? "old" : "new";
  }

  if (
    !isBeforeLastRestock &&
    hasAddedQuantity &&
    (matchesNewExpiry || /added (?:new|expired) stock/i.test(normalizedLabel) || explicitBatchRole)
  ) {
    return "new";
  }

  return isBeforeLastRestock ? "old" : (explicitSourceBatch || "old");
}

function resolveStockHistoryRecordBatchRole(record, product) {
  const explicitBatchRole = normalizeStockHistoryBatchRole(record?.batchRole);
  if (explicitBatchRole) {
    return explicitBatchRole;
  }

  const sourceBatch = resolveStockHistoryRecordSourceBatch(record, product);
  const splitRoleForSource = getSplitBatchRoleForSourceBatch(product, sourceBatch);
  if (splitRoleForSource) {
    return splitRoleForSource;
  }

  const normalizedLabel = normalizeStockHistoryLabel(record?.label, "");
  if (/expired stock/i.test(normalizedLabel)) {
    return "expired";
  }
  if (/(?:fresh|new) stock/i.test(normalizedLabel)) {
    return "fresh";
  }

  return sourceBatch === "new" ? "fresh" : "";
}

function createStockHistoryLatestQuantityMap(records, product) {
  const quantityByRecord = new Map();
  let latestStockQuantity = getStock(product);

  for (const record of Array.isArray(records) ? records : []) {
    quantityByRecord.set(record, latestStockQuantity);

    const addedQuantity = Number(record?.addedQuantity ?? 0);
    const deductedQuantity = Number(record?.deductedQuantity ?? 0);
    const normalizedAddedQuantity = Number.isFinite(addedQuantity)
      ? Math.max(0, Math.trunc(addedQuantity))
      : 0;
    const normalizedDeductedQuantity = Number.isFinite(deductedQuantity)
      ? Math.max(0, Math.trunc(deductedQuantity))
      : 0;
    latestStockQuantity = Math.max(
      0,
      latestStockQuantity - normalizedAddedQuantity + normalizedDeductedQuantity,
    );
  }

  return quantityByRecord;
}

function getStockHistoryRecordDisplayQuantity(record, latestStockQuantity = null) {
  if (Number.isFinite(Number(latestStockQuantity))) {
    return Math.max(0, Math.trunc(Number(latestStockQuantity)));
  }

  const stock = Number(record?.stock ?? 0);
  return Number.isFinite(stock) && stock >= 0 ? Math.trunc(stock) : 0;
}

function resolveStockRecordConditionLabel(record, product, sourceBatch = "") {
  const normalizedLabel = normalizeStockHistoryLabel(record?.label, "");
  const displayLabel = getStockHistoryDisplayLabel(normalizedLabel, "");
  const requestedSourceBatch = normalizeStockHistorySourceBatch(sourceBatch);
  const isSplitView =
    shouldSplitProductIntoStockDisplayCards(product) || Boolean(requestedSourceBatch);
  const recordSourceBatch = requestedSourceBatch || (
    isSplitView ? resolveStockHistoryRecordSourceBatch(record, product) : ""
  );
  const hasAddedQuantity =
    Number.isFinite(Number(record?.addedQuantity)) && Number(record.addedQuantity) > 0;
  const hasDeductedQuantity =
    Number.isFinite(Number(record?.deductedQuantity)) && Number(record.deductedQuantity) > 0;

  if (isExpiryEditStockHistoryLabel(normalizedLabel)) {
    return "Edit Expiry Date";
  }

  if (hasDeductedQuantity) {
    if (displayLabel && !/^deducted(?: stock)?$/i.test(displayLabel)) {
      return displayLabel;
    }
    return "Deducted";
  }

  if (hasAddedQuantity) {
    if (/expired/i.test(normalizedLabel) || isExpiryDateValueExpired(record?.expiryDate)) {
      return "Expired Stock";
    }

    if (!hasStockExpiryDate(record?.expiryDate)) {
      return "New Stock";
    }

    const aheadExpiry = getAheadStockExpiryDate(product);
    const behindExpiry = getBehindStockExpiryDate(product);
    if (
      stockHistoryExpiryDatesMatch(record?.expiryDate, aheadExpiry)
      || isStockExpiryDateAhead(record?.expiryDate, behindExpiry)
    ) {
      return "New Stock";
    }
    if (
      isSplitView
      && stockHistoryExpiryDatesMatch(record?.expiryDate, behindExpiry)
    ) {
      return "Old Stock";
    }
  }

  if (displayLabel && displayLabel !== "Stock Record") {
    return displayLabel;
  }

  if (hasAddedQuantity) {
    return "Added Stock";
  }

  return "Current Stock";
}

function buildStockRecordRows(product, options = {}) {
  const requestedBatchRole = normalizeStockHistoryBatchRole(options?.batchRole);
  const requestedSourceBatch = normalizeStockHistorySourceBatch(options?.sourceBatch);
  const canDeleteRecords = options?.allowDelete !== false && options?.movementOnly !== true;
  const movementOnly = options?.movementOnly === true;
  const nearExpiryOnly = options?.nearExpiryOnly === true;
  const shouldShowNearExpiryIndicator =
    !requestedBatchRole &&
    !requestedSourceBatch &&
    !shouldSplitProductIntoStockDisplayCards(product);
  const hasCurrentExpiredBatchStock = getCurrentExpiredBatchStockCount(product) > 0;
  const allStockHistoryRecords = getProductStockHistoryRecords(product);
  const latestQuantityByRecord = createStockHistoryLatestQuantityMap(
    allStockHistoryRecords,
    product,
  );
  const stockHistoryRecords = allStockHistoryRecords
    .filter((record) => {
      if (nearExpiryOnly && !isNearExpiryDateValue(record?.expiryDate)) {
        return false;
      }

      if (requestedSourceBatch) {
        return resolveStockHistoryRecordSourceBatch(record, product) === requestedSourceBatch;
      }

      if (requestedBatchRole) {
        return resolveStockHistoryRecordBatchRole(record, product) === requestedBatchRole;
      }

      const resolvedBatchRole = resolveStockHistoryRecordBatchRole(record, product);
      if (resolvedBatchRole === "expired" && !hasCurrentExpiredBatchStock) {
        return false;
      }

      return true;
    })
    .filter((record) => {
      if (!movementOnly) {
        return true;
      }

      const addedQuantity = Number(record?.addedQuantity);
      const deductedQuantity = Number(record?.deductedQuantity);
      return Number.isFinite(addedQuantity) && addedQuantity > 0
        && !(Number.isFinite(deductedQuantity) && deductedQuantity > 0);
    });
  const productId = String(product?.id ?? "").trim();
  if (stockHistoryRecords.length) {
    return stockHistoryRecords.map((record) => {
      const hasAddedQuantity =
        Number.isFinite(Number(record?.addedQuantity)) && Number(record.addedQuantity) > 0;
      const isExpiryEditLabel = isExpiryEditStockHistoryLabel(record?.label);

      return {
        recordId: String(record?.id ?? "").trim(),
        modifiedAt: String(record?.modifiedAt ?? "").trim(),
        productId,
        canDelete: canDeleteRecords && Boolean(productId && String(record?.id ?? "").trim()),
        stocks: formatStockAdjustmentValue(record.addedQuantity, record.deductedQuantity, {
          zeroAsPositive: isExpiryEditLabel,
        }),
        quantity: formatStockRecordQuantityValue(
          getStockHistoryRecordDisplayQuantity(
            record,
            latestQuantityByRecord.get(record),
          ),
        ),
        modified: formatOptionalDateTime(record.modifiedAt, "Not recorded yet"),
        expireDate: record.expiryDate
          ? formatExpiryDateDisplay(record.expiryDate, "-")
          : "-",
        expiryBatchKey: getInventoryExpiryBatchKey(record?.expiryDate),
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
        label: resolveStockRecordConditionLabel(record, product, requestedSourceBatch),
      };
    });
  }

  if (requestedBatchRole || requestedSourceBatch || movementOnly || nearExpiryOnly) {
    return [];
  }

  const stock = getStock(product);
  const currentModifiedDate = getProductModifiedDate(product);
  const addedQuantity = getProductLastAddedStockQuantity(product);
  const deductedQuantity = getProductLastDeductedStockQuantity(product);
  const batchExpiryDate = getProductBatchExpiryDate(product);
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
        stock > 0 && hasStockExpiryDate(batchExpiryDate)
          ? formatExpiryDateDisplay(batchExpiryDate, "-")
          : "-",
      expiryBatchKey: getInventoryExpiryBatchKey(
        stock > 0 && hasStockExpiryDate(batchExpiryDate) ? batchExpiryDate : "",
      ),
      expiryMeta:
        shouldShowNearExpiryIndicator && stock > 0 && isNearExpiryProduct(product)
          ? "Nearly Expired"
          : "",
      reason: "-",
      label: addedQuantity > 0 ? "New Stock" : "Current Stock",
    },
  ];
}

function buildEmployeeStockDetailRows(product) {
  const sourceProduct = getStockSourceProduct(product);
  const stock = getStock(product);
  const isExpiredBatch = isExpiredStockDisplayEntry(product);
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
    // Skip empty-state Lottie when the stock-record modal is already closed/closing.
    const shouldShowEmptyPlaceholder =
      !isMainInventoryStockWorkspace()
      || document.body.classList.contains("stock-record-drawer-open");
    if (shouldShowEmptyPlaceholder) {
      stockDetailList.appendChild(
        createEmptyState(
          isEmployeeStockWorkspace()
            ? "Select a product to view current stock summary."
            : "Select a product to view stock details.",
        ),
      );
    }
    syncStockRecordDrawer(null);
    return;
  }

  const isMovementView = isStockMovementDrawerMode();
  stockDetailHeader?.setAttribute("hidden", "true");
  const sourceProduct = getStockSourceProduct(product);
  stockDetailTitle.textContent = product.name || "Unnamed Product";

  if (isEmployeeStockWorkspace() && !isMovementView) {
    stockDetailSubtitle.textContent = `${product.category || "General"} - record view`;
    syncStockRecordDrawer(product, stockDetailSubtitle.textContent);
    stockDetailList.append(...buildEmployeeStockDetailRows(product));
    const employeeStockRecordRows = filterStockRecordRowsByBatch(
      buildStockRecordRows(sourceProduct, {
        allowDelete: false,
        nearExpiryOnly: stockPriorityFilter === "near-expiry",
        batchRole: isSplitStockDisplayEntry(product) ? getStockDisplayBatchRole(product) : "",
        sourceBatch: isSplitStockDisplayEntry(product) ? getStockDisplaySourceBatch(product) : "",
      }),
      stockRecordBatchFilterKey,
      sourceProduct,
    );
    if (employeeStockRecordRows.length) {
      stockDetailList.appendChild(createStockRecordTable(employeeStockRecordRows));
    }
    return;
  }

  stockDetailSubtitle.textContent = isMovementView
    ? `${product.category || "General"} - add stock history`
    : `${product.category || "General"} - record view`;
  syncStockRecordDrawer(product, stockDetailSubtitle.textContent);

  const stockRecordRows = filterStockRecordRowsByBatch(
    buildStockRecordRows(sourceProduct, {
      allowDelete: !isMovementView,
      movementOnly: isMovementView,
      nearExpiryOnly: stockPriorityFilter === "near-expiry",
      batchRole: isSplitStockDisplayEntry(product) ? getStockDisplayBatchRole(product) : "",
      sourceBatch: isSplitStockDisplayEntry(product) ? getStockDisplaySourceBatch(product) : "",
    }),
    stockRecordBatchFilterKey,
    sourceProduct,
  );
  if (!stockRecordRows.length) {
    stockDetailList.appendChild(
      createEmptyState(
        productHasStockRecordBatchFilter(sourceProduct)
          && stockRecordBatchFilterKey !== "all"
          ? "No stock records for this batch."
          : isMovementView
            ? "No add stock movement yet."
            : isSplitStockDisplayEntry(product)
              ? "No stock records available for this batch."
              : "No stock records available right now.",
      ),
    );
    return;
  }

  stockDetailList.appendChild(createStockRecordTable(stockRecordRows));
}

function renderStockDashboard(products = currentStockProducts) {
  const openExpiryDropdownProductIdentifier =
    stockActionDropdownMode === "expiry"
    && stockActionDropdown instanceof HTMLElement
    && stockActionDropdown.isConnected
      ? String(stockActionDropdownCard?.dataset?.stockProductId ?? "").trim()
      : "";
  closeStockActionDropdown();
  closeNearExpiryBatchOverlay();
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

  if (openExpiryDropdownProductIdentifier) {
    const refreshedDisplayProduct = filteredProducts.find(
      (candidate) =>
        getStockProductIdentifier(candidate) === openExpiryDropdownProductIdentifier,
    );
    const refreshedCard = [...stockProductList.querySelectorAll(".stock-product-card")]
      .find(
        (candidate) =>
          String(candidate?.dataset?.stockProductId ?? "").trim()
            === openExpiryDropdownProductIdentifier,
      );
    const refreshedExpiryToggle = refreshedCard?.querySelector(
      ".stock-product-card__action-button--expiry",
    );
    if (refreshedDisplayProduct && refreshedExpiryToggle instanceof HTMLElement) {
      openStockActionDropdown(
        refreshedExpiryToggle,
        "expiry",
        refreshedDisplayProduct,
        { skipAnimation: true },
      );
    }
  }
}

function isApprovedInventoryProduct(product) {
  const approvalStatus = String(product?.approvalStatus ?? "").trim().toLowerCase();
  return approvalStatus === "approved" || approvalStatus === "accepted";
}

function getStockProductsRenderSignature(products) {
  try {
    return JSON.stringify(Array.isArray(products) ? products : []);
  } catch (error) {
    return (Array.isArray(products) ? products : [])
      .map((product) => [
        String(product?.id ?? "").trim(),
        String(product?.updatedAt ?? product?.modifiedAt ?? "").trim(),
        getStock(product),
        String(product?.imageUrl ?? "").trim(),
      ].join(":"))
      .join("|");
  }
}

async function loadStockData(options = {}) {
  const quiet = options?.quiet === true;
  try {
    if (!quiet && stockRefreshButton) {
      stockRefreshButton.disabled = true;
      stockRefreshButton.classList.add("is-spinning");
    }
    const response = await fetch("/api/products?approvalStatus=approved", {
      cache: "no-store",
      headers: withStockAdminScopeHeaders({ Accept: "application/json" }),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to load saved products.");
    }

    const nextStockProducts = (Array.isArray(data.products) ? data.products : [])
      .filter(isApprovedInventoryProduct);
    const shouldRenderStockData = !hasLoadedStockData
      || !quiet
      || getStockProductsRenderSignature(currentStockProducts)
        !== getStockProductsRenderSignature(nextStockProducts);
    currentStockProducts = nextStockProducts;
    hasLoadedStockData = true;
    if (shouldRenderStockData) {
      renderStockCategoryFilterOptions(currentStockProducts);
    }
    preparePendingStockNotificationFocusSelection();
    if (shouldRenderStockData) {
      renderStockDashboard(currentStockProducts);
    }
    window.requestAnimationFrame(applyPendingStockNotificationFocus);
    return true;
  } catch (error) {
    console.error(error);
    if (quiet) {
      return false;
    }
    stockProductList.replaceChildren(createEmptyState("Unable to load stock data right now."));
    stockPriorityList?.replaceChildren(createEmptyState("Unable to load restock data right now."));
    stockCategoryList?.replaceChildren(createEmptyState("Unable to load category data right now."));
    setSummaryValue(stockTotalProducts, 0);
    setSummaryValue(stockTotalUnits, 0);
    setSummaryValue(stockNewCount, 0);
    setSummaryValue(stockLowCount, 0);
    setSummaryValue(stockEmptyCount, 0);
    setSummaryValue(stockNearExpiryCount, 0);
    setSummaryValue(stockExpiredCount, 0);
    return false;
  } finally {
    if (!quiet && stockRefreshButton) {
      stockRefreshButton.disabled = false;
      stockRefreshButton.classList.remove("is-spinning");
    }
  }
}

async function refreshStockDataFromRealtime() {
  if (stockRealtimeRefreshInFlight) {
    stockRealtimeRefreshQueued = true;
    return;
  }

  stockRealtimeRefreshInFlight = true;
  try {
    await loadStockData({ quiet: true });
  } finally {
    stockRealtimeRefreshInFlight = false;
    if (stockRealtimeRefreshQueued) {
      stockRealtimeRefreshQueued = false;
      scheduleStockRealtimeRefresh();
    }
  }
}

function scheduleStockRealtimeRefresh() {
  if (Date.now() < stockIgnoreRealtimeRefreshUntil) {
    return;
  }
  window.clearTimeout(stockRealtimeRefreshTimer);
  stockRealtimeRefreshTimer = window.setTimeout(() => {
    stockRealtimeRefreshTimer = 0;
    if (Date.now() < stockIgnoreRealtimeRefreshUntil) {
      return;
    }
    void refreshStockDataFromRealtime();
  }, 200);
}

function handleStockRealtimeChange(event) {
  const detail = event?.detail;
  const isReconnect = detail?.type === "ready" && detail?.reconnected === true;
  if (detail?.type !== "data-change" && !isReconnect) {
    return;
  }

  const topics = (Array.isArray(detail?.topics) ? detail.topics : [])
    .map((topic) => String(topic || "").trim().toLowerCase())
    .filter(Boolean);
  if (!isReconnect && !topics.some((topic) => stockRealtimeTopics.has(topic))) {
    return;
  }
  scheduleStockRealtimeRefresh();
}

stockSearchInput?.addEventListener("input", () => {
  window.clearTimeout(stockSearchTimer);
  stockSearchTimer = window.setTimeout(() => {
    stockSearchTerm = normalizeStockSearchTerm(stockSearchInput.value);
    stockInventoryPage = 1;
    renderStockDashboard(currentStockProducts);
  }, 500);
});

stockCategoryFilterTrigger?.addEventListener("click", () => {
  setStockCategoryFilterOpen(stockCategoryFilterMenu?.hidden ?? true);
});

stockPriorityFilterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    stockPriorityFilter = normalizeStockPriorityFilter(button?.dataset?.stockPriorityFilter);
    stockInventoryPage = 1;
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
  stockRecordDrawerMode = "records";
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
  stockRecordDrawerMode = "records";
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

stockRecordDrawerCloseButtons.forEach((button) => {
  button.addEventListener("click", () => {
    closeStockRecordDrawer();
  });
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
  if (event.key === "Escape" && document.body.classList.contains("stock-record-drawer-open")) {
    closeStockRecordDrawer();
    return;
  }

  if (event.key === "Escape" && stockCategoryFilterMenu && !stockCategoryFilterMenu.hidden) {
    setStockCategoryFilterOpen(false);
    stockCategoryFilterTrigger?.focus();
  }
});
window.addEventListener("message", (event) => {
  if (
    event.origin !== window.location.origin
    || event.source !== window.parent
  ) {
    return;
  }

  if (event.data?.type === "gms-main-inventory-auth") {
    const didRememberAuth = rememberEmbeddedMainInventoryAuth(
      event.data?.adminId,
      event.data?.sessionToken,
    );
    if (didRememberAuth) {
      void loadStockData({ quiet: hasLoadedStockData });
    }
    return;
  }

  if (event.data?.type === "gms-main-inventory-stock-record-modal-close") {
    closeStockRecordDrawer();
    return;
  }

  if (event.data?.type === "gms-main-inventory-stock-edit-modal-close") {
    closeStockEditModal();
  }
});
window.addEventListener("pagehide", () => {
  notifyMainInventoryStockRecordModalState(false);
  notifyMainInventoryStockEditModalState(false);
});
window.addEventListener("storage", (event) => {
  if (event.key !== STOCK_PRODUCTS_UPDATED_STORAGE_KEY) {
    return;
  }

  loadStockData({ quiet: true });
});
window.addEventListener("gms:products-updated", () => loadStockData({ quiet: true }));
window.addEventListener("gms:realtime-change", handleStockRealtimeChange);
activateMainInventoryStockMode();
activateEmployeeInventoryTableMode();
applyStockWorkspaceRole();
syncStockCategoryFilterSummary();
setupStockMonitorControlsScrollAnimation();

function bootstrapStockWorkspaceData() {
  const shouldWaitForParentAuth = isMainInventoryStockWorkspace()
    && window.parent !== window
    && !getActiveStockAdminTenantId();

  if (!shouldWaitForParentAuth) {
    void loadStockData();
    return;
  }

  window.setTimeout(() => {
    if (getActiveStockAdminTenantId()) {
      void loadStockData();
      return;
    }

    stockProductList?.replaceChildren(
      createStockInventoryEmptyRow("Unable to identify the logged-in account. Please refresh the workspace."),
    );
  }, 2000);
}

bootstrapStockWorkspaceData();
