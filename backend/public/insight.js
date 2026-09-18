const ORDER_DATA = Object.freeze([
  {
    id: "ORD-240511-001",
    customerName: "Alyssa Cruz",
    city: "Quezon City",
    items: 2,
    amount: 1840,
    courier: "LBC",
    status: "Pending",
    payment: "COD",
    receivedAt: "2026-05-11T08:15:00+08:00",
  },
  {
    id: "ORD-240511-002",
    customerName: "Ramon Dela Fuente",
    city: "Makati City",
    items: 1,
    amount: 920,
    courier: "Lalamove",
    status: "Packed",
    payment: "GCash",
    receivedAt: "2026-05-11T08:42:00+08:00",
  },
  {
    id: "ORD-240511-003",
    customerName: "Jessa Aquino",
    city: "Pasig City",
    items: 4,
    amount: 2760,
    courier: "JnT Express",
    status: "Pending",
    payment: "COD",
    receivedAt: "2026-05-11T09:10:00+08:00",
  },
  {
    id: "ORD-240511-004",
    customerName: "Noel Garcia",
    city: "Taguig City",
    items: 3,
    amount: 2310,
    courier: "LBC",
    status: "In Transit",
    payment: "Card",
    receivedAt: "2026-05-11T09:38:00+08:00",
  },
  {
    id: "ORD-240511-005",
    customerName: "Camille Santos",
    city: "Marikina City",
    items: 2,
    amount: 1580,
    courier: "Lalamove",
    status: "Packed",
    payment: "GCash",
    receivedAt: "2026-05-11T10:05:00+08:00",  
  },
  {
    id: "ORD-240511-006",
    customerName: "Bryan Lopez",
    city: "Caloocan City",
    items: 1,
    amount: 690,
    courier: "JnT Express",
    status: "Delivered",
    payment: "COD",
    receivedAt: "2026-05-11T10:36:00+08:00",
  },
  {
    id: "ORD-240511-007",
    customerName: "Katrina Velasco",
    city: "Mandaluyong City",
    items: 5,
    amount: 3480,
    courier: "JnT Express",
    status: "Pending",
    payment: "Maya",
    receivedAt: "2026-05-11T11:02:00+08:00",
  },
  {
    id: "ORD-240511-008",
    customerName: "Paolo Reyes",
    city: "San Juan City",
    items: 2,
    amount: 1290,
    courier: "LBC",
    status: "In Transit",
    payment: "COD",
    receivedAt: "2026-05-11T11:20:00+08:00",
  },
]);

const mainOrdersEmbeddedMode = new URLSearchParams(window.location.search).get("main_orders") === "1"
  || document.body.classList.contains("main-orders-embedded");
document.body.classList.toggle("main-orders-embedded", mainOrdersEmbeddedMode);

const courierTabsEl = document.getElementById("insight-courier-tabs");
const orderSearchInputEl = document.getElementById("insight-order-search");
const courierDropdownEl = document.getElementById("insight-courier-dropdown");
const courierDropdownTrigger = document.getElementById("insight-courier-trigger");
const courierDropdownSummary = document.getElementById("insight-courier-summary");
const courierDropdownMenu = document.getElementById("insight-courier-menu");
const orderListEl = document.getElementById("insight-order-list");
const courierListEl = document.getElementById("insight-courier-list");
const orderDetailEl = document.getElementById("insight-order-detail");
const trackingDetailEl = document.getElementById("insight-tracking-detail");
const orderConversationEl = document.getElementById("insight-order-conversation");
const mainOrdersSummaryEl = document.querySelector("[data-main-orders-summary]");
const mainOrdersUpdatedEl = document.querySelector("[data-main-orders-updated]");
const mainOrdersPaginationEl = document.querySelector("[data-main-orders-pagination]");
const mainOrdersPageMetaEl = document.querySelector("[data-main-orders-page-meta]");
const mainOrdersPaginationNavEl = document.querySelector("[data-main-orders-pagination-nav]");
const mainOrdersPaginationControlsEl = mainOrdersPaginationEl?.querySelector(".main-orders-pagination__controls");
const mainOrdersFilterTriggerEl = document.querySelector("[data-main-orders-filter-trigger]");
const mainOrdersWaybillPrintButtonEl = document.querySelector("[data-main-orders-waybill-print]");
const mainOrdersWaybillPrintCountEl = document.querySelector("[data-main-orders-waybill-print-count]");
const mainOrdersSelectAllEl = document.querySelector("[data-main-orders-select-all]");
const mainOrdersDetailViewEl = document.querySelector("[data-main-orders-detail-view]");
const insightSideViewButtons = Array.from(
  document.querySelectorAll("[data-insight-side-view]"),
);
const insightSidePanels = Array.from(
  document.querySelectorAll("[data-insight-side-panel]"),
);
const INSIGHT_STATUS_FILTER_OPTIONS = Object.freeze([
  { value: "all", label: "All" },
  { value: "to-prepare", label: "To prepare" },
  { value: "to-ship", label: "To ship" },
  { value: "in-transit", label: "In transit" },
  { value: "delivered", label: "Delivered" },
  { value: "cancel", label: "Cancel" },
  { value: "returns", label: "Returns" },
]);
const MAIN_ORDERS_STATUS_FILTER_OPTIONS = Object.freeze([
  { value: "all", label: "All Orders" },
  { value: "new", label: "New Orders" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "returned", label: "Returned" },
]);
const MAIN_ORDERS_HISTORY_SORT_OPTIONS = Object.freeze([
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
]);
const MAIN_ORDERS_HISTORY_STATUS_OPTIONS = Object.freeze([
  { value: "all", label: "All orders" },
  { value: "active", label: "Active orders" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "returned", label: "Returned" },
]);
let activeCourierFilter = "all";
let activeStatusFilter = "all";
let mainOrdersAdvancedFilters = {
  action: "all",
  payment: "all",
  paymentPartner: "all",
  waybill: "all",
  date: "all",
  customStart: "",
  customEnd: "",
  sort: "newest",
};
let mainOrdersHistorySort = "newest";
let mainOrdersHistoryStatus = "all";
let activeInsightSideView = "orders";
let orderSearchTerm = "";
let orderSearchTimer = 0;
let selectedInsightOrderId = "";
let currentInsightDetailOrder = null;
let activeInsightProfileModalEl = null;
let activeInsightProductPhotoModalEl = null;
let activeInsightProductPhotoTriggerEl = null;
let currentInsightOrders = [];
let currentInsightChatThreads = [];
let hasLoadedInsightChatThreads = false;
let currentInsightCourierOptions = [{ value: "all", label: mainOrdersEmbeddedMode ? "All Couriers" : "All" }];
let currentInsightCourierMediaMap = new Map();
let currentInsightDeliveryPartners = [];
const mainOrdersWaybillSelection = new Set();
let mainOrdersWaybillPrintInFlight = false;
let lastInsightConversationRenderSignature = "";
let orderInsightScrollProxyEl = null;
let orderInsightScrollProxySpacerEl = null;
let isSyncingOrderInsightScrollProxy = false;
let orderInsightScrollProxyFrame = 0;
let orderInsightSpacerStateFrame = 0;
let mainOrdersPage = 1;
let mainOrdersRefreshInFlight = false;
let mainOrdersDataSignature = "";
let insightRealtimeRefreshTimer = 0;
let insightRealtimeRefreshInFlight = false;
let insightRealtimeRefreshQueued = false;
const pendingInsightRealtimeTopics = new Set();
let mainOrdersDetailOrderId = "";
let mainOrdersDetailMode = "tracking";
let mainOrdersDetailStatusMessage = "";
let mainOrdersStatusUpdateInFlight = false;
let mainOrdersDetailTriggerEl = null;
let mainOrdersLottieLoadPromise = null;
let mainOrdersWorkspaceThemeSyncFrame = 0;
const mainOrdersTimelineLotties = new Map();
const mainOrdersTimelineLottieResetTimers = new Map();
const MAIN_ORDERS_PAGE_SIZE = 8;
const INSIGHT_CHAT_REFRESH_INTERVAL_MS = 1000;
const insightRealtimeTopics = new Set([
  "all",
  "orders",
  "accounts",
  "buyers",
  "chat",
  "delivery-partners",
]);
const INSIGHT_CHAT_TYPING_ACTIVE_WINDOW_MS = 5000;
const INSIGHT_CHAT_ONLINE_ACTIVE_WINDOW_MS = 45000;
const MAIN_ORDERS_WORKSPACE_COLOR_STORAGE_KEY = "gms-workspace-color";
const MAIN_ORDERS_TO_PREPARE_LOTTIE_PATH = "/animations/to-prepare-cardboard-box-loading.json?v=main-orders-tracking-lottie-38";
const MAIN_ORDERS_TO_SHIP_LOTTIE_PATH = "/animations/to-ship-shipment.json?v=main-orders-tracking-lottie-38";
const MAIN_ORDERS_IN_TRANSIT_LOTTIE_PATH = "/animations/in-transit-delivery-truck-loading.json?v=main-orders-tracking-lottie-38";
const MAIN_ORDERS_COMPLETED_LOTTIE_PATH = "/animations/completed-green-checkmark.json?v=main-orders-tracking-lottie-38";
const MAIN_ORDERS_TO_SHIP_LOTTIE_START_FRAME = 10;
const MAIN_ORDERS_TO_SHIP_LOTTIE_END_FRAME = 60;
const MAIN_ORDERS_COMPLETED_LOTTIE_START_FRAME = 72;
const MAIN_ORDERS_COMPLETED_LOTTIE_STEADY_FRAME = 93;
const MAIN_ORDERS_COMPLETED_LOTTIE_END_FRAME = 180;
const MAIN_ORDERS_COMPLETED_LOTTIE_RESET_DELAY_MS = 1000;
const MAIN_ORDERS_LOTTIE_PLAYER_SRC = "/vendor/lottie.min.js";
const MAIN_ORDERS_ORDER_PLACED_ICON_MARKUP = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-shopping-bag-check" aria-hidden="true"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M11.5 21h-2.926a3 3 0 0 1-2.965-2.544l-1.255-8.152a2 2 0 0 1 1.977-2.304h11.339a2 2 0 0 1 1.977 2.304l-.5 3.248"/><path d="M9 11V6a3 3 0 0 1 6 0v5"/><path d="m15 19 2 2 4-4"/></svg>';
const MAIN_ORDERS_COMPLETE_ICON_MARKUP = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-package-check-icon lucide-package-check" aria-hidden="true"><path d="M12 22V12"/><path d="m16 17 2 2 4-4"/><path d="M21 11.127V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.729l7 4a2 2 0 0 0 2 .001l1.32-.753"/><path d="M3.29 7 12 12l8.71-5"/><path d="m7.5 4.27 8.997 5.148"/></svg>';
const MAIN_ORDERS_DETAIL_DELIVERY_MAP_ICON_MARKUP = '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-icon lucide-map" aria-hidden="true"><path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"/><path d="M15 5.764v15"/><path d="M9 3.236v15"/></svg>';
const MAIN_ORDERS_DETAIL_ORDER_SUMMARY_ICON_MARKUP = '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-receipt-text-icon lucide-receipt-text" aria-hidden="true"><path d="M13 16H8"/><path d="M14 8H8"/><path d="M16 12H8"/><path d="M4 3a1 1 0 0 1 1-1 1.3 1.3 0 0 1 .7.2l.933.6a1.3 1.3 0 0 0 1.4 0l.934-.6a1.3 1.3 0 0 1 1.4 0l.933.6a1.3 1.3 0 0 0 1.4 0l.933-.6a1.3 1.3 0 0 1 1.4 0l.934.6a1.3 1.3 0 0 0 1.4 0l.933-.6A1.3 1.3 0 0 1 19 2a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1 1.3 1.3 0 0 1-.7-.2l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.934.6a1.3 1.3 0 0 1-1.4 0l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-1.4 0l-.934-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-.7.2 1 1 0 0 1-1-1z"/></svg>';
const MAIN_ORDERS_DETAIL_TRANSIT_TIMELINE_ICON_MARKUP = '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-route-icon lucide-route"><circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/></svg>';
const MAIN_ORDERS_DELIVERY_FIELD_ICONS = Object.freeze({
  recipient: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></svg>',
  contact: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"/></svg>',
  address: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>',
  payment: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>',
  status: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m16 9-5.5 5.5L8 12"/></svg>',
  method: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>',
  estimate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m18 14-1-3"/><path d="m3 9 6 2a2 2 0 0 1 2-2h2a2 2 0 0 1 1.99 1.81"/><path d="M8 17h3a1 1 0 0 0 1-1 6 6 0 0 1 6-6 1 1 0 0 0 1-1v-.75A5 5 0 0 0 17 5"/><circle cx="19" cy="17" r="3"/><circle cx="5" cy="17" r="3"/></svg>',
});

const moneyFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const orderSheetDateFormatter = new Intl.DateTimeFormat("en-PH", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

function readInsightSessionStorageJson(key) {
  try {
    return JSON.parse(window.sessionStorage?.getItem(key) || "null");
  } catch (error) {
    return null;
  }
}

function normalizeInsightAdminTenantId(value, fallback = "") {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || fallback;
}

function resolveInsightAdminTenantIdFromSession(session, fallback = "") {
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
    .map((value) => normalizeInsightAdminTenantId(value, ""))
    .find(Boolean) || fallback;
}

function getActiveInsightAdminTenantId() {
  const employeeSession = readInsightSessionStorageJson("gms-employee-session");
  const employeeAdminId = resolveInsightAdminTenantIdFromSession(employeeSession, "");
  if (employeeAdminId) {
    return employeeAdminId;
  }

  const adminSession = readInsightSessionStorageJson("gms-admin-session");
  const adminId = resolveInsightAdminTenantIdFromSession(adminSession, "");
  if (adminId) {
    return adminId;
  }

  try {
    return normalizeInsightAdminTenantId(window.localStorage?.getItem("gms-admin-id"), "");
  } catch (error) {
    return "";
  }
}

function withInsightAdminTenantHeaders(headers = {}) {
  const adminId = getActiveInsightAdminTenantId();
  if (!adminId) {
    return headers;
  }

  return {
    ...headers,
    "X-GMS-Admin-ID": adminId,
  };
}

const INSIGHT_ORDER_COURIER_ICON_MARKUP = `
  <svg viewBox="0 0 640 640" fill="none" aria-hidden="true">
    <path
      d="M96 144C87.2 144 80 151.2 80 160L80 448C80 456.8 87.2 464 96 464L99.3 464C109.7 427.1 143.7 400 184 400C224.3 400 258.2 427.1 268.7 464L371.3 464C376.2 446.6 386.4 431.3 400 420.1L400 160C400 151.2 392.8 144 384 144L96 144zM99.3 512L96 512C60.7 512 32 483.3 32 448L32 160C32 124.7 60.7 96 96 96L384 96C419.3 96 448 124.7 448 160L448 192L503.4 192C520.4 192 536.7 198.7 548.7 210.7L589.3 251.3C601.3 263.3 608 279.6 608 296.6L608 448C608 483.3 579.3 512 544 512L540.7 512C530.3 548.9 496.3 576 456 576C415.7 576 381.8 548.9 371.3 512L268.7 512C258.3 548.9 224.3 576 184 576C143.7 576 109.8 548.9 99.3 512zM448 320L560 320L560 296.6C560 292.4 558.3 288.3 555.3 285.3L514.7 244.7C511.7 241.7 507.6 240 503.4 240L448 240L448 320zM448 368L448 400.4C450.6 400.2 453.3 400 456 400C496.3 400 530.2 427.1 540.7 464L544 464C552.8 464 560 456.8 560 448L560 368L448 368zM184 528C206.1 528 224 510.1 224 488C224 465.9 206.1 448 184 448C161.9 448 144 465.9 144 488C144 510.1 161.9 528 184 528zM456 528C478.1 528 496 510.1 496 488C496 465.9 478.1 448 456 448C433.9 448 416 465.9 416 488C416 510.1 433.9 528 456 528z"
      fill="currentColor"
    ></path>
  </svg>
`;

const INSIGHT_ORDER_CLOCK_ICON_MARKUP = `
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M12 7V12L14.5 13.5M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
      stroke="currentColor"
      stroke-width="1.7"
      stroke-linecap="round"
      stroke-linejoin="round"
    ></path>
  </svg>
`;

const INSIGHT_ORDER_AMOUNT_ICON_MARKUP = `
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M13 5C13 6.10457 10.5376 7 7.5 7C4.46243 7 2 6.10457 2 5M13 5C13 3.89543 10.5376 3 7.5 3C4.46243 3 2 3.89543 2 5M13 5V6.5M2 5V17C2 18.1046 4.46243 19 7.5 19M7.5 11C7.33145 11 7.16468 10.9972 7 10.9918C4.19675 10.9 2 10.0433 2 9M7.5 15C4.46243 15 2 14.1046 2 13M22 11.5C22 12.6046 19.5376 13.5 16.5 13.5C13.4624 13.5 11 12.6046 11 11.5M22 11.5C22 10.3954 19.5376 9.5 16.5 9.5C13.4624 9.5 11 10.3954 11 11.5M22 11.5V19C22 20.1046 19.5376 21 16.5 21C13.4624 21 11 20.1046 11 19V11.5M22 15.25C22 16.3546 19.5376 17.25 16.5 17.25C13.4624 17.25 11 16.3546 11 15.25"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    ></path>
  </svg>
`;

function formatMoney(value) {
  return moneyFormatter.format(Number(value) || 0);
}

function formatOrderCount(value) {
  return `${value} order${value === 1 ? "" : "s"}`;
}

function getOrderInsightScrollProxy() {
  if (!document.body?.classList.contains("order-insight-page") || !orderListEl) {
    return null;
  }

  if (orderInsightScrollProxyEl && orderInsightScrollProxySpacerEl) {
    return orderInsightScrollProxyEl;
  }

  orderInsightScrollProxyEl = document.createElement("div");
  orderInsightScrollProxyEl.className = "order-insight-scroll-proxy";
  orderInsightScrollProxyEl.setAttribute("aria-hidden", "true");
  orderInsightScrollProxyEl.hidden = true;

  orderInsightScrollProxySpacerEl = document.createElement("div");
  orderInsightScrollProxySpacerEl.className = "order-insight-scroll-proxy__spacer";
  orderInsightScrollProxyEl.appendChild(orderInsightScrollProxySpacerEl);
  document.body.appendChild(orderInsightScrollProxyEl);

  orderInsightScrollProxyEl.addEventListener("scroll", () => {
    if (isSyncingOrderInsightScrollProxy || !orderListEl || !orderInsightScrollProxyEl) {
      return;
    }

    isSyncingOrderInsightScrollProxy = true;
    orderListEl.scrollTop = orderInsightScrollProxyEl.scrollTop;
    requestOrderInsightSpacerScrollState();
    window.requestAnimationFrame(() => {
      isSyncingOrderInsightScrollProxy = false;
    });
  });

  orderListEl.addEventListener("scroll", () => {
    requestOrderInsightSpacerScrollState();

    if (isSyncingOrderInsightScrollProxy || !orderInsightScrollProxyEl || orderInsightScrollProxyEl.hidden) {
      return;
    }

    isSyncingOrderInsightScrollProxy = true;
    orderInsightScrollProxyEl.scrollTop = orderListEl.scrollTop;
    window.requestAnimationFrame(() => {
      isSyncingOrderInsightScrollProxy = false;
    });
  });

  return orderInsightScrollProxyEl;
}

function syncOrderInsightSpacerScrollState() {
  const orderPanel = orderListEl?.closest(".insight-order-list-shell");
  if (!orderPanel || !orderListEl) {
    return;
  }

  orderPanel.classList.toggle("is-order-list-scrolled", orderListEl.scrollTop > 4);
}

function requestOrderInsightSpacerScrollState() {
  if (orderInsightSpacerStateFrame) {
    return;
  }

  orderInsightSpacerStateFrame = window.requestAnimationFrame(() => {
    orderInsightSpacerStateFrame = 0;
    syncOrderInsightSpacerScrollState();
  });
}

function updateOrderInsightScrollProxy() {
  const proxyEl = getOrderInsightScrollProxy();
  if (!proxyEl || !orderInsightScrollProxySpacerEl || !orderListEl) {
    return;
  }

  const maxOrderListScroll = Math.max(0, orderListEl.scrollHeight - orderListEl.clientHeight);
  if (maxOrderListScroll <= 1) {
    proxyEl.hidden = true;
    proxyEl.scrollTop = 0;
    syncOrderInsightSpacerScrollState();
    return;
  }

  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  orderInsightScrollProxySpacerEl.style.height = `${Math.ceil(viewportHeight + maxOrderListScroll)}px`;
  proxyEl.hidden = false;
  proxyEl.scrollTop = Math.min(orderListEl.scrollTop, maxOrderListScroll);
  syncOrderInsightSpacerScrollState();
}

function requestOrderInsightScrollProxyUpdate() {
  if (orderInsightScrollProxyFrame) {
    return;
  }

  orderInsightScrollProxyFrame = window.requestAnimationFrame(() => {
    orderInsightScrollProxyFrame = 0;
    updateOrderInsightScrollProxy();
  });
}

function getInsightMetricKey(label) {
  return String(label || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getInsightMetricIconMarkup(metricKey) {
  switch (metricKey) {
    case "courier":
      return INSIGHT_ORDER_COURIER_ICON_MARKUP;
    case "amount":
      return INSIGHT_ORDER_AMOUNT_ICON_MARKUP;
    case "place-order-time":
    case "received":
      return INSIGHT_ORDER_CLOCK_ICON_MARKUP;
    default:
      return "";
  }
}

function createInsightMetricIcon(metricKey, className = "product-insight-metric-icon") {
  const markup = getInsightMetricIconMarkup(metricKey);
  if (!markup) {
    return null;
  }

  const icon = document.createElement("span");
  icon.className = className;
  icon.innerHTML = markup;
  return icon;
}

function createInsightMetricCopy(label) {
  const copy = document.createElement("div");
  copy.className = "product-insight-rank-card__metric-copy";

  const labelEl = document.createElement("span");
  labelEl.className = "product-insight-rank-card__metric-label";
  labelEl.textContent = label;

  copy.appendChild(labelEl);
  return copy;
}

function normalizeStatus(status) {
  return String(status || "")
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/\s+/g, "-");
}

function getInsightStatusFilterOptions() {
  return mainOrdersEmbeddedMode
    ? MAIN_ORDERS_STATUS_FILTER_OPTIONS
    : INSIGHT_STATUS_FILTER_OPTIONS;
}

function normalizeInsightStatusFilterValue(value) {
  const normalizedValue = String(value ?? "").trim().toLowerCase();
  if (mainOrdersEmbeddedMode && normalizedValue === "delivered") {
    return "completed";
  }
  return getInsightStatusFilterOptions().some((option) => option.value === normalizedValue)
    ? normalizedValue
    : "all";
}

function setMainOrdersStatusFilter(value) {
  activeStatusFilter = normalizeInsightStatusFilterValue(value);
  mainOrdersPage = 1;
  mainOrdersWaybillSelection.clear();
  syncMainOrdersWaybillPrintButton();
  renderCourierTabs();
  renderInsightContent();
}

if (mainOrdersEmbeddedMode) {
  activeStatusFilter = normalizeInsightStatusFilterValue(
    new URLSearchParams(window.location.search).get("main_orders_status"),
  );
  window.GMS_MAIN_ORDERS_SET_STATUS_FILTER = setMainOrdersStatusFilter;
  window.GMS_MAIN_ORDERS_SET_ADVANCED_FILTERS = setMainOrdersAdvancedFilters;
  window.GMS_MAIN_ORDERS_GET_FILTER_OPTIONS = getMainOrdersHeaderFilterOptions;
}

function getActiveStatusFilterLabel() {
  return (
    getInsightStatusFilterOptions().find((option) => option.value === activeStatusFilter)?.label
    || "All"
  );
}

function normalizeInsightSideView(value) {
  const normalizedValue = String(value ?? "").trim().toLowerCase();
  return ["orders", "tracking"].includes(normalizedValue)
    ? normalizedValue
    : "orders";
}

function setActiveInsightSideView(view) {
  activeInsightSideView = normalizeInsightSideView(view);
  insightSideViewButtons.forEach((button) => {
    const isActive = (button.dataset.insightSideView || "") === activeInsightSideView;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
  insightSidePanels.forEach((panel) => {
    panel.hidden = (panel.getAttribute("data-insight-side-panel") || "") !== activeInsightSideView;
  });
  window.requestAnimationFrame(() => {
    syncInsightColumnHeights();
    if (orderConversationEl && activeInsightSideView === "conversation") {
      requestScrollInsightConversationToLatest();
    }
  });
}

function resolveInsightOrderStatusFilter(status) {
  const normalizedStatus = normalizeStatus(status);

  if (
    normalizedStatus === "pending"
    || normalizedStatus === "preparing"
    || normalizedStatus === "processing"
    || normalizedStatus === "to-prepare"
  ) {
    return "to-prepare";
  }

  if (
    normalizedStatus === "packed"
    || normalizedStatus === "ready"
    || normalizedStatus === "ready-to-ship"
    || normalizedStatus === "to-ship"
  ) {
    return "to-ship";
  }

  if (
    normalizedStatus === "in-transit"
    || normalizedStatus === "shipped"
    || normalizedStatus === "out-for-delivery"
    || normalizedStatus === "to-receive"
  ) {
    return "in-transit";
  }

  if (
    normalizedStatus === "delivered"
    || normalizedStatus === "completed"
    || normalizedStatus === "to-review"
    || normalizedStatus === "received"
    || normalizedStatus === "customer-received"
  ) {
    return "delivered";
  }

  if (
    normalizedStatus === "cancel"
    || normalizedStatus === "cancelled"
    || normalizedStatus === "canceled"
  ) {
    return "cancel";
  }

  if (
    normalizedStatus === "return"
    || normalizedStatus === "returned"
    || normalizedStatus === "returns"
  ) {
    return "returns";
  }

  return "all";
}

function resolveMainOrdersStatusFilter(status) {
  const normalizedStatus = normalizeStatus(status);

  if (["new", "pending", "confirmed"].includes(normalizedStatus)) {
    return "new";
  }
  if (["preparing", "processing", "to-prepare", "packing", "awaitingwaybill", "awaiting-waybill"].includes(normalizedStatus)) {
    return "processing";
  }
  if (["packed", "ready", "ready-to-ship", "to-ship", "in-transit", "shipped", "out-for-delivery", "to-receive"].includes(normalizedStatus)) {
    return "shipped";
  }
  if (["delivered", "completed", "complete", "to-review", "received", "customer-received", "fulfilled", "done"].includes(normalizedStatus)) {
    return "completed";
  }
  if (["cancel", "cancelled", "canceled"].includes(normalizedStatus)) {
    return "cancelled";
  }
  if ([
    "return",
    "returned",
    "returns",
    "return-request",
    "return-requested",
    "refund",
    "refunded",
  ].includes(normalizedStatus)) {
    return "returned";
  }
  return "new";
}

function humanizeInsightOrderStatus(status) {
  const normalizedStatus = normalizeStatus(status) || "pending";
  if (normalizedStatus === "awaitingwaybill" || normalizedStatus === "awaiting-waybill") {
    return "Awaiting Waybill";
  }
  return normalizedStatus
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getInsightOrderStatusLabel(status) {
  if (mainOrdersEmbeddedMode) {
    return humanizeInsightOrderStatus(status);
  }

  switch (resolveInsightOrderStatusFilter(status)) {
    case "to-prepare":
      return "To prepare";
    case "to-ship":
      return "To ship";
    case "in-transit":
      return "In transit";
    case "delivered":
      return "Delivered";
    case "cancel":
      return "Cancel";
    case "returns":
      return "Returns";
    default:
      return String(status || "Pending").trim() || "Pending";
  }
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }

  return dateFormatter.format(date);
}

function formatInsightOrderSheetDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return orderSheetDateFormatter.format(date).toUpperCase();
}

function parseInsightConversationDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function isSameInsightConversationCalendarDay(leftValue, rightValue) {
  const leftDate = parseInsightConversationDate(leftValue);
  const rightDate = parseInsightConversationDate(rightValue);

  if (!leftDate || !rightDate) {
    return false;
  }

  return (
    leftDate.getFullYear() === rightDate.getFullYear() &&
    leftDate.getMonth() === rightDate.getMonth() &&
    leftDate.getDate() === rightDate.getDate()
  );
}

function getInsightConversationCalendarDayKey(value) {
  const date = parseInsightConversationDate(value);
  if (!date) {
    return "";
  }

  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function hasInsightConversationTimestampGap(currentValue, previousValue, minimumGapMs = 60 * 60 * 1000) {
  const currentDate = parseInsightConversationDate(currentValue);
  const previousDate = parseInsightConversationDate(previousValue);

  if (!currentDate) {
    return false;
  }

  if (!previousDate) {
    return true;
  }

  return currentDate.getTime() - previousDate.getTime() >= minimumGapMs;
}

function formatInsightConversationTime(value, options = {}) {
  const date = parseInsightConversationDate(value);
  if (!date) {
    return "";
  }

  if (options.includeDate === true) {
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function setTextContent(element, value) {
  if (element) {
    element.textContent = value;
  }
}

function normalizeCourierFilterValue(value) {
  const normalizedValue = String(value ?? "").trim().toLowerCase();
  const compactValue = normalizedValue.replace(/[^a-z0-9]+/g, "");

  if (
    compactValue === "jt"
    || compactValue === "jtexpress"
    || compactValue === "jntexpress"
    || compactValue === "jandt"
    || compactValue === "jandtexpress"
  ) {
    return "jnt-express";
  }

  return normalizedValue || "all";
}

function getActiveCourierFilterLabel() {
  return (
    currentInsightCourierOptions.find((option) => option.value === activeCourierFilter)?.label
    || "All"
  );
}

function buildCourierFilterOptions(orders, partners) {
  const options = [{ value: "all", label: mainOrdersEmbeddedMode ? "All Couriers" : "All" }];
  const seenValues = new Set(["all"]);

  function appendOption(label) {
    const trimmedLabel = String(label ?? "").trim();
    if (!trimmedLabel) {
      return;
    }

    const normalizedValue = normalizeCourierFilterValue(trimmedLabel);
    if (seenValues.has(normalizedValue)) {
      return;
    }

    seenValues.add(normalizedValue);
    options.push({
      value: normalizedValue,
      label: trimmedLabel,
    });
  }

  (Array.isArray(partners) ? partners : []).forEach((partner) => {
    appendOption(partner?.branch || partner?.name || partner?.deliveryPartnerName);
  });

  (Array.isArray(orders) ? orders : []).forEach((order) => {
    appendOption(order?.courier);
  });

  return options;
}

function renderCourierTabs() {
  if (!courierTabsEl) {
    return;
  }

  courierTabsEl.replaceChildren();

  getInsightStatusFilterOptions().forEach((option) => {
    const button = document.createElement("button");
    const isActive = option.value === activeStatusFilter;
    button.type = "button";
    button.className = `product-form-section-carousel__button${isActive ? " is-active" : ""}`;
    button.dataset.insightStatusFilter = option.value;
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
    const label = document.createElement("span");
    label.textContent = option.label;
    button.appendChild(label);
    if (mainOrdersEmbeddedMode) {
      const count = document.createElement("span");
      count.className = "main-orders-tab-count";
      count.textContent = String(currentInsightOrders.filter((order) => (
        option.value === "all" || resolveMainOrdersStatusFilter(order?.status) === option.value
      )).length);
      button.appendChild(count);
    }
    button.addEventListener("click", function () {
      if (activeStatusFilter === option.value) {
        return;
      }

      setMainOrdersStatusFilter(option.value);
    });
    courierTabsEl.appendChild(button);
  });
}

function renderCourierSelectOptions() {
  if (!courierDropdownMenu) {
    return;
  }

  courierDropdownMenu.replaceChildren();

  currentInsightCourierOptions.forEach((option) => {
    const optionButton = document.createElement("button");
    const isSelected = option.value === activeCourierFilter;
    optionButton.type = "button";
    optionButton.className = "product-category-multiselect__option";
    optionButton.setAttribute("role", "option");
    optionButton.setAttribute("aria-selected", isSelected ? "true" : "false");
    if (isSelected) {
      optionButton.classList.add("is-selected");
    }

    optionButton.textContent = option.label;
    optionButton.addEventListener("click", function () {
      activeCourierFilter = option.value;
      mainOrdersPage = 1;
      syncCourierSelect();
      renderCourierSelectOptions();
      setCourierDropdownOpen(false);
      courierDropdownTrigger?.focus();
      renderInsightContent();
    });
    courierDropdownMenu.appendChild(optionButton);
  });

  syncCourierSelect();
}

function syncCourierSelect() {
  if (courierDropdownSummary) {
    courierDropdownSummary.textContent = getActiveCourierFilterLabel();
  }
}

function setCourierDropdownOpen(isOpen) {
  if (!courierDropdownEl || !courierDropdownTrigger || !courierDropdownMenu) {
    return;
  }

  courierDropdownEl.classList.toggle("is-open", Boolean(isOpen));
  courierDropdownTrigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
  courierDropdownMenu.hidden = !isOpen;
}

function normalizeMainOrdersAdvancedFilters(filters = mainOrdersAdvancedFilters) {
  const source = filters && typeof filters === "object" ? filters : {};
  const normalizeChoice = (value, allowed, fallback = "all") => {
    const normalizedValue = String(value ?? "").trim().toLowerCase();
    return allowed.includes(normalizedValue) ? normalizedValue : fallback;
  };
  return {
    action: normalizeChoice(source.action, ["all", "payment-required", "waybill-required", "ready-to-pack", "cancel-request"]),
    payment: normalizeChoice(source.payment, ["all", "paid", "balance-due", "cod"]),
    paymentPartner: String(source.paymentPartner ?? "").trim().toLowerCase() || "all",
    waybill: normalizeChoice(source.waybill, ["all", "not-printed", "printed", "not-required"]),
    date: normalizeChoice(source.date, ["all", "today", "7-days", "30-days", "custom"]),
    customStart: /^\d{4}-\d{2}-\d{2}$/.test(String(source.customStart || "")) ? String(source.customStart) : "",
    customEnd: /^\d{4}-\d{2}-\d{2}$/.test(String(source.customEnd || "")) ? String(source.customEnd) : "",
    sort: normalizeChoice(source.sort, ["newest", "oldest", "amount-high", "amount-low", "quantity-high", "quantity-low"], "newest"),
  };
}

function getMainOrdersPaymentPartnerValue(order) {
  return String(
    order?.paymentPartnerName || order?.paymentMethod || order?.payment || "Unspecified",
  ).trim().toLowerCase() || "unspecified";
}

function doesMainOrderMatchDateFilter(order, dateFilter, filters = mainOrdersAdvancedFilters) {
  if (dateFilter === "all") {
    return true;
  }
  const orderTime = new Date(order?.receivedAt || order?.createdAt || order?.createdAtEpochMs || 0).getTime();
  if (!Number.isFinite(orderTime) || orderTime <= 0) {
    return false;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startTime = today.getTime();
  if (dateFilter === "custom") {
    const customStart = String(filters?.customStart || "").trim();
    const customEnd = String(filters?.customEnd || "").trim();
    const customStartTime = customStart ? new Date(`${customStart}T00:00:00`).getTime() : Number.NEGATIVE_INFINITY;
    const customEndTime = customEnd ? new Date(`${customEnd}T23:59:59.999`).getTime() : Number.POSITIVE_INFINITY;
    return orderTime >= customStartTime && orderTime <= customEndTime;
  }
  if (dateFilter === "today") {
    return orderTime >= startTime;
  }
  const days = dateFilter === "7-days" ? 7 : 30;
  return orderTime >= startTime - ((days - 1) * 24 * 60 * 60 * 1000);
}

function doesMainOrderMatchActionFilter(order, actionFilter) {
  if (actionFilter === "all") {
    return true;
  }
  const status = normalizeStatus(order?.stage || order?.status);
  const outstandingAmount = getInsightOrderOutstandingAmount(order);
  const needsWaybill = orderNeedsWaybill(order);
  const printed = hasPrintedOrderWaybill(order);
  if (actionFilter === "payment-required") {
    return outstandingAmount > 0.009;
  }
  if (actionFilter === "waybill-required") {
    return needsWaybill && !printed && (
      order?.canPrintWaybill === true
      || ["awaitingwaybill", "awaiting-waybill", "toprepare", "to-prepare"].includes(status)
    );
  }
  if (actionFilter === "ready-to-pack") {
    return outstandingAmount <= 0.009
      && ["toprepare", "to-prepare", "preparing", "processing", "packing"].includes(status)
      && (!needsWaybill || printed);
  }
  if (actionFilter === "cancel-request") {
    return String(order?.cancelRequestStatus || "").trim().toLowerCase() === "pending";
  }
  return true;
}

function doesMainOrderMatchAdvancedFilters(order) {
  const filters = normalizeMainOrdersAdvancedFilters(mainOrdersAdvancedFilters);
  const outstandingAmount = getInsightOrderOutstandingAmount(order);
  const needsWaybill = orderNeedsWaybill(order);
  const printed = hasPrintedOrderWaybill(order);
  const matchesPayment = filters.payment === "all"
    || (filters.payment === "paid" && outstandingAmount <= 0.009)
    || (filters.payment === "balance-due" && outstandingAmount > 0.009)
    || (filters.payment === "cod" && isInsightOrderCod(order));
  const matchesWaybill = filters.waybill === "all"
    || (filters.waybill === "printed" && needsWaybill && printed)
    || (filters.waybill === "not-printed" && needsWaybill && !printed)
    || (filters.waybill === "not-required" && !needsWaybill);
  const matchesPaymentPartner = filters.paymentPartner === "all"
    || getMainOrdersPaymentPartnerValue(order) === filters.paymentPartner;
  return matchesPayment
    && matchesWaybill
    && matchesPaymentPartner
    && doesMainOrderMatchDateFilter(order, filters.date, filters)
    && doesMainOrderMatchActionFilter(order, filters.action);
}

function getMainOrdersHeaderFilterOptions() {
  const courierMap = new Map();
  const paymentPartnerMap = new Map();
  currentInsightOrders.forEach((order) => {
    const courierLabel = String(order?.courier || order?.deliveryPartnerName || "").trim();
    const courierValue = normalizeCourierFilterValue(courierLabel);
    if (courierLabel && courierValue !== "all") {
      courierMap.set(courierValue, courierLabel);
    }
    const paymentLabel = String(
      order?.paymentPartnerName || order?.paymentMethod || order?.payment || "",
    ).trim();
    const paymentValue = getMainOrdersPaymentPartnerValue(order);
    if (paymentLabel && paymentValue !== "all") {
      paymentPartnerMap.set(paymentValue, paymentLabel);
    }
  });
  const toOptions = (map) => [...map.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((left, right) => left.label.localeCompare(right.label));
  return {
    couriers: toOptions(courierMap),
    paymentPartners: toOptions(paymentPartnerMap),
  };
}

function notifyMainOrdersHeaderFilterOptions() {
  if (!mainOrdersEmbeddedMode || !window.parent || window.parent === window) {
    return;
  }
  window.parent.postMessage({
    type: "gms-main-orders-filter-options",
    ...getMainOrdersHeaderFilterOptions(),
  }, window.location.origin);
}

function setMainOrdersAdvancedFilters(filters = {}) {
  const source = filters && typeof filters === "object" ? filters : {};
  mainOrdersAdvancedFilters = normalizeMainOrdersAdvancedFilters(source);
  activeCourierFilter = normalizeCourierFilterValue(source.courier || "all");
  if (!currentInsightCourierOptions.some((option) => option.value === activeCourierFilter)) {
    activeCourierFilter = "all";
  }
  mainOrdersPage = 1;
  mainOrdersWaybillSelection.clear();
  syncMainOrdersWaybillPrintButton();
  syncCourierSelect();
  renderCourierSelectOptions();
  renderInsightContent();
}

function getFilteredOrders(orders = currentInsightOrders) {
  return (Array.isArray(orders) ? orders : []).filter((order) => {
    const matchesCourier = activeCourierFilter === "all"
      || normalizeCourierFilterValue(order?.courier) === activeCourierFilter;
    const resolvedStatus = mainOrdersEmbeddedMode
      ? resolveMainOrdersStatusFilter(order?.status)
      : resolveInsightOrderStatusFilter(order?.status);
    const matchesStatus = activeStatusFilter === "all" || resolvedStatus === activeStatusFilter;
    return matchesCourier && matchesStatus && doesMainOrderMatchAdvancedFilters(order);
  });
}

function createInsightMetricItem(label, value) {
  const item = document.createElement("div");
  item.className = "product-insight-rank-card__metric";
  const metricKey = getInsightMetricKey(label);
  item.dataset.metric = metricKey;

  const icon = createInsightMetricIcon(metricKey);
  const copy = createInsightMetricCopy(label);

  const valueEl = document.createElement("strong");
  valueEl.className = "product-insight-rank-card__metric-value";
  valueEl.textContent = value;
  copy.appendChild(valueEl);

  if (icon) {
    item.append(icon, copy);
  } else {
    item.append(copy);
  }
  return item;
}

function getCourierInitials(value) {
  const words = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) {
    return "NA";
  }

  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

function createInsightCourierMedia(order) {
  const media = document.createElement("div");
  media.className = "product-insight-rank-card__media insight-order-card__media";

  const courierName = String(order?.courier || "Unknown").trim() || "Unknown";
  const imageUrl = currentInsightCourierMediaMap.get(normalizeCourierFilterValue(courierName)) || "";

  if (imageUrl) {
    const image = document.createElement("img");
    image.alt = `${courierName} logo`;
    image.src = imageUrl;
    media.appendChild(image);
    return media;
  }

  const fallback = document.createElement("span");
  fallback.className = "insight-order-card__media-fallback";
  fallback.textContent = getCourierInitials(courierName);
  media.appendChild(fallback);
  return media;
}

function matchesInsightOrderSearch(order, term = orderSearchTerm) {
  const normalizedTerm = String(term ?? "").trim().toLowerCase();
  if (!normalizedTerm) {
    return true;
  }

  const searchableText = [
    order?.id,
    order?.customerName,
    order?.city,
    order?.courier,
    order?.status,
    order?.payment,
    order?.paymentMethod,
    order?.paymentPartnerName,
    order?.paymentOptionLabel,
    order?.productName,
    order?.variantName,
    formatMoney(order?.amount),
  ]
    .map((value) => String(value ?? "").trim().toLowerCase())
    .join(" ");

  return searchableText.includes(normalizedTerm);
}

function createInsightMetricItem(label, value) {
  const item = document.createElement("div");
  item.className = "product-insight-rank-card__metric";
  const metricKey = getInsightMetricKey(label);
  item.dataset.metric = metricKey;

  const icon = createInsightMetricIcon(metricKey);
  const copy = createInsightMetricCopy(label);

  const valueEl = document.createElement("strong");
  valueEl.className = "product-insight-rank-card__metric-value";
  valueEl.textContent = value;
  copy.appendChild(valueEl);

  if (icon) {
    item.append(icon, copy);
  } else {
    item.append(copy);
  }
  return item;
}

function getCourierInitials(value) {
  const words = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) {
    return "NA";
  }

  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

function createInsightCourierMedia(order) {
  const media = document.createElement("div");
  media.className = "product-insight-rank-card__media insight-order-card__media";

  const courierName = String(order?.courier || "Unknown").trim() || "Unknown";
  const imageUrl = currentInsightCourierMediaMap.get(normalizeCourierFilterValue(courierName)) || "";

  if (imageUrl) {
    const image = document.createElement("img");
    image.alt = `${courierName} logo`;
    image.src = imageUrl;
    media.appendChild(image);
    return media;
  }

  const fallback = document.createElement("span");
  fallback.className = "insight-order-card__media-fallback";
  fallback.textContent = getCourierInitials(courierName);
  media.appendChild(fallback);
  return media;
}

function getStatusTotals(orders) {
  const counts = new Map();

  for (const order of orders) {
    const key = order.status || "Unknown";
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  return [...counts.entries()].sort((left, right) => right[1] - left[1]);
}

function getCourierTotals(orders) {
  const totals = new Map();

  for (const order of orders) {
    const key = order.courier || "Unknown";
    const current = totals.get(key) || { count: 0, amount: 0 };
    current.count += 1;
    current.amount += Number(order.amount) || 0;
    totals.set(key, current);
  }

  return [...totals.entries()].sort((left, right) => right[1].count - left[1].count);
}

function createInfoRow(label, value) {
  const row = document.createElement("div");
  row.className = "dashboard-info-row";

  const labelEl = document.createElement("span");
  labelEl.textContent = label;

  const valueEl = document.createElement("strong");
  valueEl.textContent = value;

  row.append(labelEl, valueEl);
  return row;
}

function createMetaItem(label, value) {
  const item = document.createElement("div");
  item.className = "insight-order-card__meta-item product-insight-rank-card__metric";
  const metricKey = getInsightMetricKey(label);
  item.dataset.metric = metricKey;

  const icon = createInsightMetricIcon(metricKey);
  const copy = createInsightMetricCopy(label);

  const valueEl = document.createElement("strong");
  valueEl.className = "product-insight-rank-card__metric-value";
  valueEl.textContent = value;
  copy.appendChild(valueEl);

  if (icon) {
    item.append(icon, copy);
  } else {
    item.append(copy);
  }
  return item;
}

function createStatusBadge(status) {
  const badge = document.createElement("span");
  const statusKey = normalizeStatus(status);
  badge.className = `insight-order-chip is-${statusKey}`;
  badge.textContent = getInsightOrderStatusLabel(status);
  return badge;
}

function getInsightOrderIdentifier(order) {
  return String(order?.id ?? "").trim();
}

function formatMainOrdersClock(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }
  return date.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });
}

function formatMainOrdersRelativeTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const differenceMs = Math.max(0, Date.now() - date.getTime());
  const minutes = Math.floor(differenceMs / 60000);
  if (minutes < 1) {
    return "Just now";
  }
  if (minutes < 60) {
    return `${minutes} min ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hr ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function normalizeMainOrdersMediaUrl(imageUrl) {
  const rawUrl = String(imageUrl || "").trim();
  if (!rawUrl) {
    return "";
  }

  try {
    const parsedUrl = new URL(rawUrl, window.location.origin);
    if (parsedUrl.pathname.startsWith("/uploads/")) {
      return `${window.location.origin}${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
    }
    return parsedUrl.href;
  } catch (error) {
    return rawUrl;
  }
}

function createMainOrdersMedia(imageUrl, fallbackText, className) {
  const media = document.createElement("span");
  media.className = className;
  const normalizedImageUrl = normalizeMainOrdersMediaUrl(imageUrl);
  if (!normalizedImageUrl) {
    media.textContent = fallbackText;
    return media;
  }

  media.classList.add("has-image");
  const image = document.createElement("img");
  image.src = normalizedImageUrl;
  image.alt = "";
  image.loading = "lazy";
  image.addEventListener("error", function () {
    image.remove();
    media.classList.remove("has-image");
    media.textContent = fallbackText;
  }, { once: true });
  media.appendChild(image);
  return media;
}

function getMainOrdersToneIndex(value) {
  const source = String(value || "");
  let hash = 0;
  for (const char of source) {
    hash = (hash + char.charCodeAt(0)) % 6;
  }
  return hash + 1;
}

function createMainOrdersCell(className, label) {
  const cell = document.createElement("div");
  cell.className = `main-orders-cell ${className}`;
  cell.dataset.label = label;
  return cell;
}

function createMainOrdersCourierMedia(order) {
  const courierName = String(order?.courier || "Unknown courier").trim() || "Unknown courier";
  const imageUrl = String(order?.deliveryPartnerImageUrl || "").trim()
    || currentInsightCourierMediaMap.get(normalizeCourierFilterValue(courierName))
    || "";
  const media = createMainOrdersMedia(
    imageUrl,
    getCourierInitials(courierName),
    "main-orders-partner-icon main-orders-courier-icon",
  );
  media.title = courierName;
  media.setAttribute("role", "img");
  media.setAttribute("aria-label", `${courierName} courier`);
  return media;
}

function createMainOrdersPaymentMedia(order) {
  const paymentName = String(
    order?.paymentPartnerName
    || order?.paymentMethod
    || order?.paymentOptionLabel
    || order?.payment
    || "Unspecified payment",
  ).trim() || "Unspecified payment";
  const media = createMainOrdersMedia(
    String(order?.paymentPartnerImageUrl || "").trim(),
    getCourierInitials(paymentName),
    "main-orders-partner-icon main-orders-payment-icon",
  );
  media.title = paymentName;
  media.setAttribute("role", "img");
  media.setAttribute("aria-label", `${paymentName} payment method`);
  return media;
}

function getInsightOrderGroupId(order) {
  return Math.trunc(Number(order?.createdAtEpochMs) || 0);
}

function resolveInsightDeliveryPartnerForOrder(order, partners = currentInsightDeliveryPartners) {
  const partnerName = String(
    order?.deliveryPartnerName ?? order?.courier ?? order?.deliveryProvider ?? "",
  ).trim().toLowerCase();
  if (!partnerName) {
    return null;
  }
  return (Array.isArray(partners) ? partners : []).find((partner) =>
    String(partner?.branch ?? partner?.name ?? "").trim().toLowerCase() === partnerName,
  ) || null;
}

function orderNeedsWaybill(order, partners = currentInsightDeliveryPartners) {
  if (order?.needsWaybill === true) {
    return true;
  }
  if (order?.needsWaybill === false) {
    return false;
  }
  const courierName = String(
    order?.deliveryPartnerName ?? order?.courier ?? order?.deliveryProvider ?? "",
  ).trim();
  if (!courierName) {
    return false;
  }
  const partner = resolveInsightDeliveryPartnerForOrder(order, partners);
  if (!partner) {
    return true;
  }
  return partner.needsWaybill !== false;
}

function hasPrintedOrderWaybill(order) {
  return order?.waybillPrinted === true
    || Math.trunc(Number(order?.waybillPrintedAtEpochMs) || 0) > 0;
}

function canSelectOrderForWaybill(order) {
  if (!mainOrdersEmbeddedMode || !orderNeedsWaybill(order)) {
    return false;
  }
  if (hasPrintedOrderWaybill(order)) {
    return true;
  }
  const normalizedStatus = normalizeStatus(order?.stage || order?.status);
  return order?.canPrintWaybill === true
    || normalizedStatus === "awaitingwaybill"
    || normalizedStatus === "awaiting-waybill"
    || normalizedStatus === "toprepare"
    || normalizedStatus === "to-prepare";
}

function syncMainOrdersWaybillPrintButton() {
  const selectedCount = mainOrdersWaybillSelection.size;
  const shouldShow = selectedCount > 0;

  if (mainOrdersWaybillPrintButtonEl) {
    if (mainOrdersEmbeddedMode) {
      mainOrdersWaybillPrintButtonEl.hidden = true;
    } else {
      mainOrdersWaybillPrintButtonEl.hidden = !shouldShow;
      mainOrdersWaybillPrintButtonEl.disabled = mainOrdersWaybillPrintInFlight || !shouldShow;
    }
    if (mainOrdersWaybillPrintCountEl && !mainOrdersEmbeddedMode) {
      mainOrdersWaybillPrintCountEl.hidden = !shouldShow;
      mainOrdersWaybillPrintCountEl.textContent = `(${selectedCount})`;
    }
  }

  if (mainOrdersEmbeddedMode && window.parent && window.parent !== window) {
    window.parent.postMessage({
      type: "gms-main-orders-waybill-selection-state",
      selectedCount,
      inFlight: mainOrdersWaybillPrintInFlight,
    }, window.location.origin);
  }
}

function getVisibleMainOrdersWaybillGroupIds() {
  return [...new Set(
    Array.from(orderListEl?.querySelectorAll(".main-orders-row[data-main-orders-waybill-group-id]") || [])
      .map((row) => String(row.dataset.mainOrdersWaybillGroupId || "").trim())
      .filter((groupId) => groupId && groupId !== "0"),
  )];
}

function syncMainOrdersSelectAllCheckbox() {
  if (!(mainOrdersSelectAllEl instanceof HTMLInputElement)) {
    return;
  }
  const visibleGroupIds = getVisibleMainOrdersWaybillGroupIds();
  const selectedVisibleCount = visibleGroupIds.filter(
    (groupId) => mainOrdersWaybillSelection.has(groupId),
  ).length;
  const hasSelectableOrders = visibleGroupIds.length > 0;
  const allVisibleSelected = hasSelectableOrders
    && selectedVisibleCount === visibleGroupIds.length;

  mainOrdersSelectAllEl.disabled = !hasSelectableOrders;
  mainOrdersSelectAllEl.checked = allVisibleSelected;
  mainOrdersSelectAllEl.indeterminate = selectedVisibleCount > 0 && !allVisibleSelected;
  mainOrdersSelectAllEl.setAttribute(
    "aria-label",
    allVisibleSelected ? "Deselect all orders on this page" : "Select all orders on this page",
  );
  const label = mainOrdersSelectAllEl.closest(".main-orders-waybill-select--all");
  if (label instanceof HTMLElement) {
    label.title = allVisibleSelected
      ? "Deselect all orders on this page"
      : "Select all orders on this page";
  }
}

function syncMainOrdersWaybillSelectionRows() {
  const selectModeActive = mainOrdersWaybillSelection.size > 0;
  document.body.classList.toggle("main-orders-select-mode", selectModeActive);

  orderListEl?.querySelectorAll(".main-orders-row").forEach((row) => {
    const groupId = String(row.dataset.mainOrdersWaybillGroupId || "");
    const selected = Boolean(groupId && mainOrdersWaybillSelection.has(groupId));
    const checkbox = row.querySelector(".main-orders-waybill-select__input");
    const actions = row.querySelector(".main-orders-cell--actions");
    const orderIdentifier = String(row.dataset.insightOrderId || "").trim();

    if (checkbox instanceof HTMLInputElement) {
      checkbox.checked = selected;
    }
    row.classList.toggle("is-selected", selected);
    if (groupId) {
      row.setAttribute("aria-selected", selected ? "true" : "false");
    } else {
      row.removeAttribute("aria-selected");
    }
    row.tabIndex = selectModeActive && !groupId ? -1 : 0;
    row.toggleAttribute("aria-disabled", selectModeActive && !groupId);
    row.setAttribute(
      "aria-label",
      selectModeActive
        ? groupId
          ? `${selected ? "Deselect" : "Select"} order ${orderIdentifier}`
          : `Order ${orderIdentifier} is unavailable for waybill selection`
        : `Open order ${orderIdentifier}`,
    );
    if (actions instanceof HTMLElement) {
      actions.setAttribute("aria-hidden", selectModeActive ? "true" : "false");
      actions.querySelectorAll("button, a").forEach((control) => {
        control.tabIndex = selectModeActive ? -1 : 0;
      });
    }
  });
  syncMainOrdersSelectAllCheckbox();
}

function setMainOrdersWaybillGroupSelected(groupId, selected) {
  const normalizedGroupId = String(groupId || "").trim();
  if (!normalizedGroupId || normalizedGroupId === "0") {
    return false;
  }
  if (selected) {
    mainOrdersWaybillSelection.add(normalizedGroupId);
  } else {
    mainOrdersWaybillSelection.delete(normalizedGroupId);
  }
  syncMainOrdersWaybillPrintButton();
  syncMainOrdersWaybillSelectionRows();
  return true;
}

function toggleMainOrdersRowWaybillSelection(row) {
  if (!(row instanceof HTMLElement)) {
    return false;
  }
  const groupId = String(row.dataset.mainOrdersWaybillGroupId || "").trim();
  if (!groupId || !row.querySelector(".main-orders-waybill-select__input")) {
    return false;
  }
  return setMainOrdersWaybillGroupSelected(
    groupId,
    !mainOrdersWaybillSelection.has(groupId),
  );
}

function pruneMainOrdersWaybillSelection(orders = currentInsightOrders) {
  const eligibleGroupIds = new Set(
    (Array.isArray(orders) ? orders : [])
      .filter((order) => canSelectOrderForWaybill(order))
      .map((order) => String(getInsightOrderGroupId(order)))
      .filter((groupId) => groupId !== "0"),
  );
  for (const groupId of [...mainOrdersWaybillSelection]) {
    if (!eligibleGroupIds.has(groupId)) {
      mainOrdersWaybillSelection.delete(groupId);
    }
  }
  syncMainOrdersWaybillPrintButton();
  syncMainOrdersWaybillSelectionRows();
}

function notifyMainOrdersWaybillError(message) {
  const normalizedMessage = String(message || "Unable to print waybills.").replace(/\s+/g, " ").trim();
  if (mainOrdersEmbeddedMode && window.parent && window.parent !== window) {
    window.parent.postMessage({
      type: "gms-main-orders-waybill-preview-error",
      message: normalizedMessage,
    }, window.location.origin);
    return;
  }
  showMainOrdersWaybillSnackbar("Print Waybill Failed", normalizedMessage, "error");
}

function notifyMainOrdersWaybillPrintError(message) {
  const normalizedMessage = String(message || "Unable to print waybills.").replace(/\s+/g, " ").trim();
  if (mainOrdersEmbeddedMode && window.parent && window.parent !== window) {
    window.parent.postMessage({
      type: "gms-main-orders-waybill-print-error",
      message: normalizedMessage,
    }, window.location.origin);
    return;
  }
  showMainOrdersWaybillSnackbar("Print Waybill Failed", normalizedMessage, "error");
}

let mainOrdersWaybillSnackbarTimer = 0;

function hideMainOrdersWaybillSnackbar() {
  const snackbar = document.querySelector("[data-main-orders-waybill-snackbar]");
  const timerBar = snackbar?.querySelector("[data-main-orders-waybill-snackbar-timer]");
  if (!(snackbar instanceof HTMLElement)) {
    return;
  }
  window.clearTimeout(mainOrdersWaybillSnackbarTimer);
  mainOrdersWaybillSnackbarTimer = 0;
  if (timerBar instanceof HTMLElement) {
    timerBar.classList.remove("is-running");
  }
  snackbar.classList.remove("is-visible");
  window.setTimeout(() => {
    if (!snackbar.classList.contains("is-visible")) {
      snackbar.hidden = true;
      snackbar.classList.remove("is-error", "is-success");
    }
  }, 180);
}

function ensureMainOrdersWaybillSnackbar() {
  let snackbar = document.querySelector("[data-main-orders-waybill-snackbar]");
  if (snackbar instanceof HTMLElement) {
    return snackbar;
  }

  snackbar = document.createElement("div");
  snackbar.className = "product-editor-snackbar main-orders-waybill-snackbar";
  snackbar.dataset.mainOrdersWaybillSnackbar = "";
  snackbar.setAttribute("role", "status");
  snackbar.setAttribute("aria-live", "polite");
  snackbar.hidden = true;
  snackbar.innerHTML = `
    <span class="product-editor-snackbar__icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M12 8v4"></path>
        <path d="M12 16h.01"></path>
      </svg>
    </span>
    <span class="product-editor-snackbar__copy">
      <strong data-main-orders-waybill-snackbar-title>Print Waybill</strong>
      <span data-main-orders-waybill-snackbar-message></span>
    </span>
    <button type="button" class="product-editor-snackbar__close" data-main-orders-waybill-snackbar-close aria-label="Dismiss notification">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
        <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
      </svg>
    </button>
    <div class="product-editor-snackbar__timer" aria-hidden="true">
      <span class="product-editor-snackbar__timer-bar" data-main-orders-waybill-snackbar-timer></span>
    </div>`;
  document.body?.appendChild(snackbar);
  snackbar.querySelector("[data-main-orders-waybill-snackbar-close]")
    ?.addEventListener("click", () => hideMainOrdersWaybillSnackbar());
  return snackbar;
}

function showMainOrdersWaybillSnackbar(title, message, mode = "error") {
  const snackbar = ensureMainOrdersWaybillSnackbar();
  const titleEl = snackbar.querySelector("[data-main-orders-waybill-snackbar-title]");
  const messageEl = snackbar.querySelector("[data-main-orders-waybill-snackbar-message]");
  const timerBar = snackbar.querySelector("[data-main-orders-waybill-snackbar-timer]");
  if (titleEl instanceof HTMLElement) {
    titleEl.textContent = String(title || "Print Waybill").trim() || "Print Waybill";
  }
  if (messageEl instanceof HTMLElement) {
    messageEl.textContent = String(message || "").replace(/\s+/g, " ").trim();
  }
  snackbar.classList.toggle("is-error", mode === "error");
  snackbar.classList.toggle("is-success", mode === "success");
  snackbar.hidden = false;
  window.clearTimeout(mainOrdersWaybillSnackbarTimer);
  if (timerBar instanceof HTMLElement) {
    timerBar.classList.remove("is-running");
    void timerBar.offsetWidth;
    timerBar.classList.add("is-running");
  }
  window.requestAnimationFrame(() => {
    snackbar.classList.add("is-visible");
  });
  mainOrdersWaybillSnackbarTimer = window.setTimeout(() => {
    hideMainOrdersWaybillSnackbar();
  }, 6500);
}

function getSelectedMainOrdersWaybillGroupIds() {
  return [...mainOrdersWaybillSelection]
    .map((value) => Math.trunc(Number(value)))
    .filter((value) => Number.isFinite(value) && value > 0);
}

async function readWaybillApiResponse(response) {
  const rawText = await response.text();
  const trimmedText = rawText.trim();
  if (!trimmedText) {
    return {
      data: {},
      message: `Request failed (${response.status}).`,
    };
  }

  try {
    return {
      data: JSON.parse(trimmedText),
      message: "",
    };
  } catch (_) {
    return {
      data: {},
      message: trimmedText,
    };
  }
}

function buildWaybillPrintDocumentHtml(sectionsHtml) {
  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="UTF-8" />',
    "<title>Waybills</title>",
    '<link rel="stylesheet" href="/waybill-print.css?v=waybill-full-bleed-2" />',
    '<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>',
    "</head>",
    "<body>",
    String(sectionsHtml || ""),
    "</body>",
    "<script>",
    "function resolveWaybillBarcodeFormat(value) {",
    "  var normalized = String(value || '').trim();",
    "  if (/^\\d{13}$/.test(normalized) || /^\\d{12}$/.test(normalized)) {",
    "    return 'EAN13';",
    "  }",
    "  if (/^\\d{8}$/.test(normalized)) {",
    "    return 'EAN8';",
    "  }",
    "  return 'CODE128';",
    "}",
    "function runWaybillPrint() {",
    "  try {",
    '    document.querySelectorAll(".waybill-barcode").forEach(function (node) {',
    '      var value = String(node.getAttribute("data-barcode") || "").trim();',
    "      if (!value || typeof JsBarcode !== \"function\") {",
    "        return;",
    "      }",
    '      var format = String(node.getAttribute("data-barcode-format") || "").trim()',
    "        || resolveWaybillBarcodeFormat(value);",
    '      var isListingBarcode = Boolean(node.closest(".waybill-table__barcode--listing"));',
    "      JsBarcode(node, value, {",
    "        format: format,",
    "        displayValue: false,",
    "        margin: 0,",
    "        width: isListingBarcode ? 2 : 1.6,",
    "        height: isListingBarcode ? 58 : 52",
    "      });",
    "    });",
    "  } catch (error) {",
    "    console.error(error);",
    "  }",
    "  window.setTimeout(function () {",
    "    window.focus();",
    "    window.print();",
    "    window.dispatchEvent(new Event('gms-waybill-print-dialog-closed'));",
    "  }, 180);",
    "}",
    'window.addEventListener("load", runWaybillPrint);',
    "</script>",
    "</html>",
  ].join("\n");
}

function openMainOrdersWaybillPrintWindow(waybills = [], onPrintDialogClosed = null) {
  const documents = Array.isArray(waybills) ? waybills : [];
  const htmlDocuments = documents
    .map((entry) => String(entry?.html ?? "").trim())
    .filter(Boolean);
  if (!htmlDocuments.length) {
    return false;
  }

  const sections = htmlDocuments.map((html) => {
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const sectionBody = bodyMatch?.[1]?.trim() || html.trim();
    return '<section class="main-orders-waybill-print-page">' + sectionBody + "</section>";
  }).join("");

  const printFrame = document.createElement("iframe");
  printFrame.setAttribute("aria-hidden", "true");
  printFrame.style.position = "fixed";
  printFrame.style.right = "0";
  printFrame.style.bottom = "0";
  printFrame.style.width = "0";
  printFrame.style.height = "0";
  printFrame.style.border = "0";
  document.body.appendChild(printFrame);

  const printDocument = printFrame.contentDocument;
  const printWindow = printFrame.contentWindow;
  if (!printDocument || !printWindow) {
    printFrame.remove();
    notifyMainOrdersWaybillPrintError("Unable to start the print dialog.");
    return false;
  }

  printDocument.open();
  printDocument.write(buildWaybillPrintDocumentHtml(sections));
  printDocument.close();
  if (typeof onPrintDialogClosed === "function") {
    printWindow.addEventListener(
      "gms-waybill-print-dialog-closed",
      () => onPrintDialogClosed(),
      { once: true },
    );
  }
  window.setTimeout(() => {
    printFrame.remove();
  }, 3000);
  return true;
}

async function previewSelectedMainOrdersWaybills(createdAtEpochMsList = null) {
  const requestedGroupIds = Array.isArray(createdAtEpochMsList)
    ? createdAtEpochMsList
    : getSelectedMainOrdersWaybillGroupIds();
  if (mainOrdersWaybillPrintInFlight || !requestedGroupIds.length) {
    return;
  }

  const normalizedGroupIds = [...new Set(
    requestedGroupIds
      .map((value) => Math.trunc(Number(value)))
      .filter((value) => Number.isFinite(value) && value > 0),
  )];
  if (!normalizedGroupIds.length) {
    notifyMainOrdersWaybillError("Select at least one order to print.");
    return;
  }

  mainOrdersWaybillPrintInFlight = true;
  syncMainOrdersWaybillPrintButton();
  try {
    const response = await fetch("/api/orders/waybills/print", {
      method: "POST",
      cache: "no-store",
      headers: withInsightAdminTenantHeaders({
        Accept: "application/json",
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        preview: true,
        createdAtEpochMsList: normalizedGroupIds,
      }),
    });
    const { data, message: rawMessage } = await readWaybillApiResponse(response);
    if (!response.ok) {
      throw new Error(data?.message || rawMessage || "Unable to preview waybills.");
    }

    if (mainOrdersEmbeddedMode && window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: "gms-main-orders-waybill-preview-ready",
        waybills: data?.waybills || [],
        createdAtEpochMsList: data?.createdAtEpochMsList || normalizedGroupIds,
      }, window.location.origin);
      return;
    }

    openMainOrdersWaybillPreviewModalLocal({
      waybills: data?.waybills || [],
      createdAtEpochMsList: data?.createdAtEpochMsList || normalizedGroupIds,
    });
  } catch (error) {
    notifyMainOrdersWaybillError(
      error instanceof Error ? error.message : "Unable to preview waybills.",
    );
  } finally {
    mainOrdersWaybillPrintInFlight = false;
    syncMainOrdersWaybillPrintButton();
  }
}

async function confirmSelectedMainOrdersWaybillPrint(createdAtEpochMsList = null, options = {}) {
  const normalizedGroupIds = [...new Set(
    (Array.isArray(createdAtEpochMsList) ? createdAtEpochMsList : getSelectedMainOrdersWaybillGroupIds())
      .map((value) => Math.trunc(Number(value)))
      .filter((value) => Number.isFinite(value) && value > 0),
  )];
  if (!normalizedGroupIds.length || mainOrdersWaybillPrintInFlight) {
    notifyMainOrdersWaybillPrintError("Select at least one order to print.");
    return;
  }

  mainOrdersWaybillPrintInFlight = true;
  syncMainOrdersWaybillPrintButton();
  try {
    const response = await fetch("/api/orders/waybills/print", {
      method: "POST",
      cache: "no-store",
      headers: withInsightAdminTenantHeaders({
        Accept: "application/json",
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        createdAtEpochMsList: normalizedGroupIds,
        printed: true,
      }),
    });
    const { data, message: rawMessage } = await readWaybillApiResponse(response);
    if (!response.ok) {
      throw new Error(data?.message || rawMessage || "Unable to print waybills.");
    }

    mainOrdersWaybillSelection.clear();
    const refreshedOrders = await loadOrders({ preserveOnError: true });
    if (Array.isArray(refreshedOrders)) {
      currentInsightOrders = refreshedOrders;
      mainOrdersDataSignature = getMainOrdersDataSignature(refreshedOrders);
      pruneMainOrdersWaybillSelection(refreshedOrders);
      renderCourierTabs();
      renderInsightContent();
    }

    if (mainOrdersEmbeddedMode && window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: "gms-main-orders-waybill-print-complete",
        waybills: data?.waybills || [],
        message: data?.message || "Waybill sent to print.",
      }, window.location.origin);
      return;
    }

    if (options?.skipPrintOutput !== true) {
      openMainOrdersWaybillPrintWindow(data?.waybills);
    }
    showMainOrdersWaybillSnackbar(
      "Print Waybill",
      data?.message || "Waybill sent to print.",
      "success",
    );
  } catch (error) {
    notifyMainOrdersWaybillPrintError(
      error instanceof Error ? error.message : "Unable to print waybills.",
    );
  } finally {
    mainOrdersWaybillPrintInFlight = false;
    syncMainOrdersWaybillPrintButton();
  }
}

let mainOrdersWaybillPreviewModalState = {
  waybills: [],
  createdAtEpochMsList: [],
};

function openMainOrdersWaybillPreviewModalLocal(payload = {}) {
  /* standalone fallback when not embedded in main dashboard */
  const waybills = Array.isArray(payload?.waybills) ? payload.waybills : [];
  mainOrdersWaybillPreviewModalState = {
    waybills,
    createdAtEpochMsList: Array.isArray(payload?.createdAtEpochMsList)
      ? payload.createdAtEpochMsList
      : waybills.map((entry) => entry?.createdAtEpochMs).filter(Boolean),
  };
  if (!waybills.length) {
    notifyMainOrdersWaybillError("Unable to open the waybill preview.");
    return;
  }
  const didOpenPrintDialog = openMainOrdersWaybillPrintWindow(waybills, () => {
    const didPrint = window.confirm(
      "Did the selected waybill print successfully? Select OK only after a successful print.",
    );
    if (didPrint) {
      void confirmSelectedMainOrdersWaybillPrint(
        mainOrdersWaybillPreviewModalState.createdAtEpochMsList,
        { skipPrintOutput: true },
      );
      return;
    }
    showMainOrdersWaybillSnackbar(
      "Print Waybill",
      "Print was not confirmed. The order remains Awaiting Waybill.",
      "default",
    );
  });
  if (!didOpenPrintDialog) {
    mainOrdersWaybillPreviewModalState = { waybills: [], createdAtEpochMsList: [] };
  }
}

async function printSelectedMainOrdersWaybills() {
  await previewSelectedMainOrdersWaybills();
}

function createMainOrdersTableRow(order, options = {}) {
  const orderIdentifier = String(options.orderIdentifier || getInsightOrderIdentifier(order)).trim();
  const row = document.createElement("article");
  row.className = "insight-order-card main-orders-row is-interactive";
  row.dataset.insightOrderId = orderIdentifier;
  row.tabIndex = 0;
  row.setAttribute("role", "button");
  row.setAttribute("aria-label", `Open order ${orderIdentifier}`);

  const idCell = createMainOrdersCell("main-orders-cell--id", "Order ID");
  const orderId = document.createElement("strong");
  orderId.textContent = orderIdentifier.startsWith("#") ? orderIdentifier : `#${orderIdentifier}`;
  idCell.appendChild(orderId);
  if (resolveMainOrdersStatusFilter(order.status) === "new") {
    const newBadge = document.createElement("span");
    newBadge.className = "main-orders-new-badge";
    newBadge.textContent = "New";
    idCell.appendChild(newBadge);
  }

  const selectCell = createMainOrdersCell("main-orders-cell--select", "Select");
  if (canSelectOrderForWaybill(order)) {
    const groupId = String(getInsightOrderGroupId(order));
    row.dataset.mainOrdersWaybillGroupId = groupId;
    const checkboxWrap = document.createElement("label");
    checkboxWrap.className = "main-orders-waybill-select";
    checkboxWrap.title = "Select for waybill printing";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "main-orders-waybill-select__input";
    checkbox.checked = mainOrdersWaybillSelection.has(groupId);
    checkbox.setAttribute("aria-label", `Select order ${orderIdentifier} for waybill printing`);
    checkbox.addEventListener("click", (event) => {
      event.stopPropagation();
    });
    checkbox.addEventListener("change", (event) => {
      event.stopPropagation();
      setMainOrdersWaybillGroupSelected(groupId, checkbox.checked);
    });
    checkboxWrap.appendChild(checkbox);
    selectCell.appendChild(checkboxWrap);
  }

  const customerCell = createMainOrdersCell("main-orders-cell--customer", "Customer");
  const customerAvatar = createMainOrdersMedia(
    getInsightOrderCustomerProfileImageUrl(order),
    getInsightOrderCustomerInitials(order),
    "main-orders-avatar",
  );
  customerAvatar.classList.add(
    `main-orders-avatar--tone-${getInsightOrderCustomerToneIndex(order)}`,
  );
  customerCell.appendChild(customerAvatar);
  const customerCopy = document.createElement("span");
  customerCopy.className = "main-orders-cell-copy";
  const customerName = document.createElement("strong");
  customerName.textContent = getInsightOrderCustomerName(order);
  const customerMeta = document.createElement("small");
  customerMeta.textContent = String(order.contactNumber || order.city || "No contact details");
  customerCopy.append(customerName, customerMeta);
  customerCell.appendChild(customerCopy);

  const courierCell = createMainOrdersCell("main-orders-cell--courier", "Courier");
  courierCell.appendChild(createMainOrdersCourierMedia(order));

  const quantityCell = createMainOrdersCell("main-orders-cell--quantity", "Quantity");
  quantityCell.textContent = String(getInsightOrderQuantity(order));

  const paymentCell = createMainOrdersCell("main-orders-cell--payment", "Payment Method");
  paymentCell.appendChild(createMainOrdersPaymentMedia(order));

  const statusCell = createMainOrdersCell("main-orders-cell--status", "Status");
  statusCell.appendChild(createStatusBadge(order.status));

  const timeCell = createMainOrdersCell("main-orders-cell--time", "Time");
  const exactTime = document.createElement("strong");
  exactTime.textContent = formatMainOrdersClock(order.receivedAt);
  const relativeTime = document.createElement("small");
  relativeTime.textContent = formatMainOrdersRelativeTime(order.receivedAt);
  timeCell.append(exactTime, relativeTime);

  const actionsCell = createMainOrdersCell("main-orders-cell--actions", "Actions");
  const viewButton = document.createElement("button");
  viewButton.type = "button";
  viewButton.className = "main-orders-icon-button main-orders-view-button";
  viewButton.title = "View order";
  viewButton.setAttribute("aria-label", `View order ${orderIdentifier}`);
  viewButton.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.1 12a10.8 10.8 0 0 1 19.8 0 10.8 10.8 0 0 1-19.8 0Z"/><circle cx="12" cy="12" r="3"/></svg>';
  viewButton.addEventListener("click", function (event) {
    event.stopPropagation();
    openMainOrdersDetail(orderIdentifier);
  });

  const historyButton = document.createElement("button");
  historyButton.type = "button";
  historyButton.className = "main-orders-icon-button main-orders-history-button";
  historyButton.title = "Order history";
  historyButton.setAttribute("aria-label", `View history for order ${orderIdentifier}`);
  historyButton.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.708L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>';
  historyButton.addEventListener("click", function (event) {
    event.stopPropagation();
    openMainOrdersDetail(orderIdentifier, { mode: "history" });
  });

  const menuWrap = document.createElement("span");
  menuWrap.className = "main-orders-action-menu";
  const moreButton = document.createElement("button");
  moreButton.type = "button";
  moreButton.className = "main-orders-icon-button";
  moreButton.title = "More actions";
  moreButton.setAttribute("aria-label", `More actions for ${orderIdentifier}`);
  moreButton.setAttribute("aria-expanded", "false");
  moreButton.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="19" r="1.7"/></svg>';
  const menu = document.createElement("span");
  menu.className = "main-orders-action-menu__popup";
  menu.hidden = true;
  const profileButton = document.createElement("button");
  profileButton.type = "button";
  profileButton.textContent = "Customer profile";
  profileButton.addEventListener("click", function (event) {
    event.stopPropagation();
    menu.hidden = true;
    moreButton.setAttribute("aria-expanded", "false");
    openInsightOrderProfileModal(order);
  });
  moreButton.addEventListener("click", function (event) {
    event.stopPropagation();
    const willOpen = menu.hidden;
    document.querySelectorAll(".main-orders-action-menu__popup:not([hidden])").forEach((popup) => {
      popup.hidden = true;
      popup.previousElementSibling?.setAttribute("aria-expanded", "false");
    });
    menu.hidden = !willOpen;
    moreButton.setAttribute("aria-expanded", willOpen ? "true" : "false");
  });
  menu.append(profileButton);
  menuWrap.append(moreButton, menu);
  actionsCell.append(viewButton, historyButton, menuWrap);

  row.append(
    selectCell,
    customerCell,
    idCell,
    courierCell,
    paymentCell,
    quantityCell,
    statusCell,
    timeCell,
    actionsCell,
  );
  return row;
}

function createInsightOrderCard(order, options = {}) {
  const { interactive = false, selected = false, orderIdentifier = "" } = options;
  const card = document.createElement("article");
  card.className = "insight-order-card product-insight-rank-card";

  if (interactive && orderIdentifier) {
    card.dataset.insightOrderId = orderIdentifier;
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-pressed", selected ? "true" : "false");
    card.classList.add("is-interactive");
    card.classList.toggle("is-selected", selected);
  }

  const header = document.createElement("div");
  header.className = "insight-order-card__header product-insight-rank-card__header";

  const leading = document.createElement("div");
  leading.className = "product-insight-rank-card__leading";
  leading.appendChild(createInsightCourierMedia(order));

  const headerText = document.createElement("div");
  headerText.className = "insight-order-card__title product-insight-rank-card__title";

  const customer = document.createElement("h3");
  customer.textContent = order.customerName;

  const route = document.createElement("p");
  route.className = "insight-order-card__route";
  route.textContent = String(order.address || order.city || "No address").trim() || "No address";

  const fulfillment = document.createElement("p");
  fulfillment.className = "insight-order-card__fulfillment";
  fulfillment.textContent = String(order.contactNumber || "No contact number").trim() || "No contact number";

  headerText.append(customer, route, fulfillment);
  leading.appendChild(headerText);
  header.append(leading, createStatusBadge(order.status));

  const metrics = document.createElement("div");
  metrics.className = "insight-order-card__meta product-insight-rank-card__metrics";
  metrics.append(
    createInsightMetricItem("Courier", order.courier),
    createInsightMetricItem("Amount", formatMoney(order.amount)),
    createInsightMetricItem("Place order time", formatDateTime(order.receivedAt)),
  );

  card.append(header, metrics);
  return card;
}

function getInsightOrderGroupKey(order) {
  const createdAtEpochMs = Math.trunc(Number(order?.createdAtEpochMs) || 0);
  return createdAtEpochMs > 0
    ? `group-${createdAtEpochMs}`
    : `order-${getInsightOrderIdentifier(order)}`;
}

function getInsightOrderQuantity(order) {
  return Math.max(1, Number(order?.quantity || order?.items || 1) || 1);
}

function getInsightOrderGroupEntries(order, orders = currentInsightOrders) {
  const targetGroupKey = getInsightOrderGroupKey(order);
  return (Array.isArray(orders) ? orders : []).filter(
    (entry) => getInsightOrderGroupKey(entry) === targetGroupKey,
  );
}

function getInsightOrderGroupQuantity(entries = [], fallbackOrder = null) {
  const normalizedEntries = Array.isArray(entries) && entries.length
    ? entries
    : fallbackOrder
      ? [fallbackOrder]
      : [];

  return normalizedEntries.reduce((sum, entry) => sum + getInsightOrderQuantity(entry), 0);
}

function getInsightOrderLineAmount(order) {
  const quantity = getInsightOrderQuantity(order);
  const unitPrice = Number(order?.unitPrice || 0) || 0;
  if (unitPrice > 0) {
    return unitPrice * quantity;
  }

  return Number(order?.amount || order?.total || order?.price || 0) || 0;
}

function getInsightOrderGroupTotal(entries, fallbackOrder = null) {
  const normalizedEntries = Array.isArray(entries) ? entries : [];
  const firstEntry = normalizedEntries[0] || fallbackOrder || null;
  const explicitTotal = Number(
    firstEntry?.grandTotalAmount
    || firstEntry?.amount
    || firstEntry?.total
    || firstEntry?.price
    || 0,
  ) || 0;

  if (explicitTotal > 0) {
    return explicitTotal;
  }

  return normalizedEntries.reduce((sum, entry) => sum + getInsightOrderLineAmount(entry), 0);
}

function getInsightOrderOutstandingAmount(order) {
  return Math.max(
    Number(order?.amountToPayAmount || 0) || 0,
    Number(order?.remainingBalanceAmount || 0) || 0,
    0,
  );
}

function getInsightOrderAdminName(order) {
  const rawName = String(
    order?.employeeFirstName
    || order?.employeeName
    || order?.handledBy
    || order?.assignedEmployee
    || order?.adminName
    || "",
  ).trim();

  if (!rawName) {
    return "Example Employee";
  }

  return rawName.split(/\s+/)[0] || "Example Employee";
}

function getInsightOrderPaymentDisplay(order) {
  const primaryMethod = String(
    order?.paymentMethod || order?.paymentPartnerName || order?.payment || "",
  ).trim();
  const secondaryLabel = String(
    order?.payment || order?.paymentOptionLabel || "",
  ).trim();

  if (primaryMethod && secondaryLabel && primaryMethod.toLowerCase() !== secondaryLabel.toLowerCase()) {
    return `${primaryMethod} * ${secondaryLabel}`;
  }

  return primaryMethod || secondaryLabel || "Unspecified";
}

function isInsightOrderCod(order) {
  return [
    order?.paymentOptionLabel,
    order?.payment,
    order?.paymentMethod,
  ].some((value) => {
    const normalizedValue = String(value || "").trim().toLowerCase();
    return normalizedValue === "cod" || normalizedValue.startsWith("cash on delivery");
  });
}

function getInsightOrderPaymentState(order, outstandingAmount, isFullyPaid) {
  const lifecycleStatus = resolveInsightOrderStatusFilter(order?.status);

  if (isInsightOrderCod(order)) {
    if (lifecycleStatus === "delivered") {
      return "fully-paid";
    }

    if (
      lifecycleStatus === "to-prepare"
      || lifecycleStatus === "to-ship"
      || lifecycleStatus === "in-transit"
    ) {
      return "not-fully-paid";
    }
  }

  return isFullyPaid || outstandingAmount <= 0.009 ? "fully-paid" : "not-fully-paid";
}

const INSIGHT_TRACKING_BOX_ICON_MARKUP = `
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path
      d="m15.66 7-.91-2.68L8.62.85a1.28 1.28 0 0 0-1.24 0L1.25 4.32.34 7a1.24 1.24 0 0 0 .58 1.5l.33.18V11a1.25 1.25 0 0 0 .63 1l5.5 3.11a1.28 1.28 0 0 0 1.24 0l5.5-3.11a1.25 1.25 0 0 0 .63-1V8.68l.33-.18a1.24 1.24 0 0 0 .58-1.5zM10 9.87l-.48-1.28L14 6.13l.44 1.28zM8 1.94 13.46 5 8 8 2.54 5zM1.52 7.41 2 6.13l4.48 2.46L6 9.87zm1 1.95 4.25 2.32.62-1.84v3.87L2.5 11zM13.5 11l-4.88 2.71V9.84l.63 1.84 4.25-2.32z"
      fill="currentColor"
    ></path>
  </svg>
`;

const INSIGHT_TRACKING_ROUTE_ICON_MARKUP = `
  <svg viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
    <path d="M34.247 185.385c7.166 14.354 14.824 28.68 22.481 42.331 2.681 4.779 5.173 9.137 7.414 12.992 1.357 2.334 2.339 3.997 2.882 4.906 8.256 13.81 28.246 13.858 36.569.087.545-.903 1.529-2.552 2.889-4.868 2.244-3.822 4.738-8.144 7.422-12.888 7.664-13.548 15.328-27.79 22.501-42.094 4.526-9.024 8.716-17.801 12.505-26.249 13.899-30.994 21.759-55.711 21.759-74.269C170.667 38.202 132.465 0 85.333 0S0 38.202 0 85.333c0 18.429 8.057 43.366 22.31 74.989 3.639 8.072 7.637 16.45 11.937 25.063zM85.333 42.667c23.567 0 42.667 19.099 42.667 42.667 0 10.682-6.49 31.091-18.024 56.811-3.522 7.855-7.45 16.082-11.712 24.58-4.135 8.246-8.458 16.499-12.853 24.607-4.443-8.248-8.812-16.635-12.99-25.005-4.059-8.131-7.817-16.006-11.212-23.537C49.37 116.523 42.667 95.778 42.667 85.333c0-23.567 19.099-42.666 42.666-42.666z"></path>
    <path d="M426.667 256c-47.131 0-85.333 38.202-85.333 85.333 0 18.429 8.057 43.366 22.31 74.989 3.638 8.072 7.636 16.45 11.936 25.063 7.167 14.354 14.824 28.68 22.481 42.331 2.681 4.779 5.173 9.137 7.414 12.992 1.357 2.334 2.339 3.997 2.882 4.906 8.256 13.81 28.246 13.858 36.569.087.545-.903 1.529-2.552 2.889-4.868 2.244-3.822 4.738-8.145 7.422-12.888 7.664-13.548 15.328-27.79 22.501-42.094 4.526-9.024 8.716-17.801 12.505-26.249C504.14 384.608 512 359.891 512 341.333 512 294.202 473.798 256 426.667 256zm24.642 142.144c-3.522 7.855-7.45 16.082-11.712 24.58-4.135 8.246-8.458 16.499-12.853 24.607-4.443-8.247-8.812-16.635-12.99-25.005-4.059-8.131-7.817-16.006-11.212-23.537C390.703 372.523 384 351.778 384 341.333c0-23.567 19.099-42.667 42.667-42.667s42.667 19.099 42.667 42.667c-.001 10.683-6.491 31.091-18.025 56.811z"></path>
    <path d="M85.333 341.333H160c29.446 0 53.333-23.887 53.333-53.333 0-5.882 4.785-10.667 10.667-10.667h74.667c35.249 0 64-28.751 64-64s-28.751-64-64-64h-85.333c-11.782 0-21.333 9.551-21.333 21.333s9.551 21.333 21.333 21.333h85.333c11.685 0 21.333 9.649 21.333 21.333s-9.649 21.333-21.333 21.333H224c-29.446 0-53.333 23.887-53.333 53.333 0 5.882-4.785 10.667-10.667 10.667H85.333c-35.249 0-64 28.751-64 64s28.751 64 64 64h192c11.782 0 21.333-9.551 21.333-21.333s-9.551-21.333-21.333-21.333h-192C73.649 384 64 374.351 64 362.667s9.649-21.334 21.333-21.334z"></path>
  </svg>
`;

const INSIGHT_TRACKING_SUCCESS_ICON_MARKUP = `
  <svg viewBox="-3.5 0 19 19" aria-hidden="true">
    <path
      d="M4.63 15.638a1.028 1.028 0 0 1-.79-.37L.36 11.09a1.03 1.03 0 1 1 1.58-1.316l2.535 3.043L9.958 3.32a1.029 1.029 0 0 1 1.783 1.03L5.52 15.122a1.03 1.03 0 0 1-.803.511.89.89 0 0 1-.088.004z"
      fill="currentColor"
    ></path>
  </svg>
`;

const INSIGHT_GOOGLE_MAP_DEFAULT_EMBED_URL =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3861.123456789!2d120.9842195!3d14.5995124!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3397ca3c1a3b1fbf%3A0x9c2d3b456789!2sManila!5e0!3m2!1sen!2sph!4v1700000000000!5m2!1sen!2sph";
const INSIGHT_ORDER_ROUTE_ORIGIN_LABEL = "Switch Packing Hub";

const INSIGHT_ORDER_TRACKING_STEPS = Object.freeze([
  { key: "to-prepare", label: "Packing", icon: INSIGHT_TRACKING_BOX_ICON_MARKUP },
  { key: "to-ship", label: "Ready", icon: INSIGHT_ORDER_COURIER_ICON_MARKUP },
  { key: "in-transit", label: "On route", icon: INSIGHT_TRACKING_ROUTE_ICON_MARKUP },
  { key: "delivered", label: "Delivered", icon: INSIGHT_TRACKING_SUCCESS_ICON_MARKUP },
]);

function getInsightOrderTrackingActiveIndex(order) {
  switch (resolveInsightOrderStatusFilter(order?.status)) {
    case "to-prepare":
      return 0;
    case "to-ship":
      return 1;
    case "in-transit":
      return 2;
    case "delivered":
      return 3;
    default:
      return 0;
  }
}

function createInsightOrderTrackingSection(order) {
  const activeIndex = getInsightOrderTrackingActiveIndex(order);
  const section = document.createElement("section");
  section.className = "insight-order-tracking";

  const heading = document.createElement("h3");
  heading.className = "insight-order-detail__heading insight-order-tracking__heading";
  heading.textContent = "Tracking";

  const steps = document.createElement("ol");
  steps.className = "insight-order-tracking__steps";

  INSIGHT_ORDER_TRACKING_STEPS.forEach((step, index) => {
    const item = document.createElement("li");
    item.className = "insight-order-tracking__step";
    item.dataset.trackingStep = step.key;
    item.setAttribute("aria-label", step.label);
    if (index < activeIndex) {
      item.classList.add("is-complete");
    } else if (index === activeIndex) {
      item.classList.add("is-active");
      item.setAttribute("aria-current", "step");
    }

    const dot = document.createElement("span");
    dot.className = "insight-order-tracking__dot";
    dot.setAttribute("aria-hidden", "true");
    dot.innerHTML = step.icon;

    item.appendChild(dot);
    steps.appendChild(item);

    if (index < INSIGHT_ORDER_TRACKING_STEPS.length - 1) {
      const connector = document.createElement("li");
      connector.className = "insight-order-tracking__connector";
      connector.setAttribute("aria-hidden", "true");
      connector.setAttribute("role", "presentation");
      if (index < activeIndex) {
        connector.classList.add("is-complete");
      } else if (index === activeIndex) {
        connector.classList.add("is-active");
      }
      steps.appendChild(connector);
    }
  });

  section.append(heading, steps, createInsightOrderRouteSummary(order));
  return section;
}

function getInsightOrderDestinationLabel(order) {
  return String(
    order?.address ||
    order?.city ||
    order?.clientAddress ||
    "",
  ).trim() || "Customer house";
}

function createInsightOrderRoutePoint(type, label, caption) {
  const item = document.createElement("li");
  item.className = `insight-order-route__point insight-order-route__point--${type}`;

  const marker = document.createElement("span");
  marker.className = "insight-order-route__marker";
  marker.setAttribute("aria-hidden", "true");

  const copy = document.createElement("span");
  copy.className = "insight-order-route__copy";

  const title = document.createElement("strong");
  title.textContent = label;

  const meta = document.createElement("span");
  meta.textContent = caption;

  copy.append(title, meta);
  item.append(marker, copy);
  return item;
}

function createInsightOrderRouteSummary(order) {
  const route = document.createElement("ol");
  route.className = "insight-order-route";
  route.setAttribute("aria-label", "Order route");
  route.append(
    createInsightOrderRoutePoint(
      "origin",
      INSIGHT_ORDER_ROUTE_ORIGIN_LABEL,
      "Hub",
    ),
    createInsightOrderRoutePoint(
      "destination",
      getInsightOrderDestinationLabel(order),
      "Customer house",
    ),
  );
  return route;
}

function buildInsightOrderMapEmbedUrl(order) {
  const destination = getInsightOrderDestinationLabel(order);

  if (destination === "Customer house") {
    return INSIGHT_GOOGLE_MAP_DEFAULT_EMBED_URL;
  }

  return `https://www.google.com/maps?q=${encodeURIComponent(destination)}&z=17&output=embed`;
}

function createInsightOrderMapEmbed(order) {
  const map = document.createElement("section");
  map.className = "insight-tracking-map";

  const iframe = document.createElement("iframe");
  iframe.className = "insight-tracking-map__frame";
  iframe.src = buildInsightOrderMapEmbedUrl(order);
  iframe.width = "100%";
  iframe.loading = "lazy";
  iframe.allowFullscreen = true;
  iframe.referrerPolicy = "no-referrer-when-downgrade";
  iframe.title = "Order delivery map";
  iframe.setAttribute("aria-label", "Order delivery map");

  map.appendChild(iframe);
  return map;
}

function getInsightOrderSheetStatus(order, paymentState) {
  const lifecycleStatus = resolveInsightOrderStatusFilter(order?.status);

  if (lifecycleStatus === "cancel") {
    return {
      label: "Refunded",
      valueClassName: "insight-order-sheet__value--unpaid",
    };
  }

  if (lifecycleStatus === "returns") {
    return {
      label: "Returns",
      valueClassName: "insight-order-sheet__value--unpaid",
    };
  }

  return paymentState === "fully-paid"
    ? {
        label: "Fully paid",
        valueClassName: "insight-order-sheet__value--paid",
      }
    : {
        label: "Not fully paid",
        valueClassName: "insight-order-sheet__value--unpaid",
      };
}

function createInsightOrderSheetRow(label, value, options = {}) {
  const { valueClassName = "", isMultiline = false } = options;
  const row = document.createElement("div");
  row.className = "insight-order-sheet__row";

  const labelEl = document.createElement("span");
  labelEl.className = "insight-order-sheet__label";
  labelEl.textContent = `${label} :`;

  const valueEl = document.createElement(isMultiline ? "div" : "strong");
  valueEl.className = `insight-order-sheet__value${valueClassName ? ` ${valueClassName}` : ""}`;
  valueEl.textContent = value;

  row.append(labelEl, valueEl);
  return row;
}

function getInsightOrderProductImageUrl(order) {
  const listing = order?.product || order?.listing || order?.productSnapshot || {};
  const imageSources = [
    order?.productImageUrl,
    order?.productCardImageUrl,
    order?.cardImageUrl,
    order?.mainImageUrl,
    order?.imageUrl,
    order?.imageUrls,
    listing?.cardImageUrl,
    listing?.mainImageUrl,
    listing?.imageUrl,
    listing?.imageUrls,
    listing?.buyModalImageUrl,
  ];
  return imageSources
    .flat()
    .map((value) => String(value || "").trim())
    .find(Boolean) || "";
}

function getThemedProductPhotoIconMarkup() {
  return `
    <svg class="insight-order-item__photo-icon" viewBox="0 -960 960 960" aria-hidden="true" focusable="false">
      <path fill="currentColor" stroke="none" d="M180-120q-24 0-42-18t-18-42v-600q0-24 18-42t42-18h600q24 0 42 18t18 42v600q0 24-18 42t-42 18H180Zm86-157h429q9 0 13-8t-1-16L590-457q-5-6-12-6t-12 6L446-302l-81-111q-5-6-12-6t-12 6l-86 112q-6 8-2 16t13 8Zm109.5-307.5Q390-599 390-620t-14.5-35.5Q361-670 340-670t-35.5 14.5Q290-641 290-620t14.5 35.5Q319-570 340-570t35.5-14.5Z"></path>
    </svg>
  `;
}

function createInsightOrderItemPhotoButton(order) {
  const productName = String(order?.productName || "Ordered item").trim() || "Ordered item";
  const imageUrl = getInsightOrderProductImageUrl(order);
  const button = document.createElement("button");
  button.type = "button";
  button.className = "insight-order-item__photo-btn insight-order-detail__item-photo-btn";
  button.innerHTML = getThemedProductPhotoIconMarkup();

  if (!imageUrl) {
    button.disabled = true;
    button.setAttribute("aria-label", "No product photo available");
    button.title = "No product photo available";
    return button;
  }

  button.setAttribute("aria-label", `View ${productName} photo`);
  button.title = "View product photo";
  button.addEventListener("click", function (event) {
    event.preventDefault();
    event.stopPropagation();
    openInsightOrderProductPhotoModal(order, button);
  });
  return button;
}

function getInsightOrderCustomerName(order) {
  return String(order?.customerName || "Unknown customer").trim() || "Unknown customer";
}

function getInsightOrderCustomerInitials(order) {
  return getInsightOrderCustomerName(order)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "U";
}

function getInsightOrderCustomerToneSource(order) {
  const accountIdentity = String(
    order?.customerAccountId ||
      order?.accountId ||
      order?.customerId ||
      order?.userId ||
      "",
  ).trim();
  return `${accountIdentity || getInsightOrderIdentifier(order)}${getInsightOrderCustomerName(order)}`;
}

function getInsightOrderCustomerToneIndex(order) {
  const linkedToneIndex = Math.trunc(Number(order?.customerAvatarToneIndex));
  if (linkedToneIndex >= 1 && linkedToneIndex <= 6) {
    return linkedToneIndex;
  }
  return getMainOrdersToneIndex(getInsightOrderCustomerToneSource(order));
}

function getInsightOrderCustomerProfileImageUrl(order) {
  const customer = order?.customer || order?.buyer || order?.account || {};
  return [
    order?.customerProfileImageUrl,
    order?.customerAvatarUrl,
    order?.customerImageUrl,
    order?.profileImageUrl,
    order?.avatarUrl,
    customer?.profileImageUrl,
    customer?.avatarUrl,
    customer?.photoUrl,
    customer?.pictureUrl,
    customer?.imageUrl,
  ]
    .map((value) => String(value || "").trim())
    .find(Boolean) || "";
}

function createInsightOrderProfileAvatar(order, className) {
  const avatar = document.createElement("div");
  avatar.className = className;
  avatar.classList.add(
    `main-orders-avatar--tone-${getInsightOrderCustomerToneIndex(order)}`,
  );

  const imageUrl = getInsightOrderCustomerProfileImageUrl(order);

  if (imageUrl) {
    const image = document.createElement("img");
    image.src = imageUrl;
    image.alt = getInsightOrderCustomerName(order);
    image.loading = "lazy";
    image.addEventListener("error", function () {
      image.remove();
      avatar.classList.remove("has-image");
      avatar.textContent = getInsightOrderCustomerInitials(order);
    }, { once: true });
    avatar.classList.add("has-image");
    avatar.appendChild(image);
    return avatar;
  }

  avatar.textContent = getInsightOrderCustomerInitials(order);
  return avatar;
}

function buildInsightOrderLiveChatUrl(order) {
  const params = new URLSearchParams();
  const orderId = getInsightOrderIdentifier(order);
  const customerName = getInsightOrderCustomerName(order);
  const productId = String(order?.productId || "").trim();
  const productName = String(order?.productName || "").trim();

  if (orderId) {
    params.set("order", orderId);
  }
  if (customerName) {
    params.set("customer", customerName);
  }
  if (productId) {
    params.set("productId", productId);
  }
  if (productName) {
    params.set("product", productName);
  }
  params.set("source", "order-insight");

  const query = params.toString();
  return `/main.html${query ? `?${query}` : ""}#live-chat`;
}

function createInsightOrderLiveChatLink(order) {
  const customerName = getInsightOrderCustomerName(order);
  const link = document.createElement("a");
  link.className = "insight-order-detail__live-chat-link";
  link.href = buildInsightOrderLiveChatUrl(order);
  link.setAttribute("aria-label", `Open live chat for ${customerName}`);
  link.title = "Open live chat";
  link.innerHTML = `
    <svg viewBox="0 -960 960 960" aria-hidden="true" focusable="false">
      <path
        d="M240-240 131-131q-14 14-32.5 6.34Q80-132.31 80-152v-668q0-24 18-42t42-18h680q24 0 42 18t18 42v520q0 24-18 42t-42 18H240Zm94.5-294.5Q346-546 346-563t-11.5-28.5Q323-603 306-603t-28.5 11.5Q266-580 266-563t11.5 28.5Q289-523 306-523t28.5-11.5Zm177 0Q523-546 523-563t-11.5-28.5Q500-603 483-603t-28.5 11.5Q443-580 443-563t11.5 28.5Q466-523 483-523t28.5-11.5Zm170 0Q693-546 693-563t-11.5-28.5Q670-603 653-603t-28.5 11.5Q613-580 613-563t11.5 28.5Q636-523 653-523t28.5-11.5Z"
        fill="currentColor"
      ></path>
    </svg>
  `;
  return link;
}

function createInsightOrderProfileHeader(order) {
  const profile = document.createElement("div");
  profile.className = "insight-order-detail__profile";

  const avatar = createInsightOrderProfileAvatar(order, "insight-order-detail__profile-avatar");
  const customerName = getInsightOrderCustomerName(order);

  const avatarButton = document.createElement("button");
  avatarButton.type = "button";
  avatarButton.className = "insight-order-detail__profile-avatar-button is-clickable";
  avatarButton.dataset.insightOrderProfileTrigger = "true";
  avatarButton.setAttribute("aria-label", "Open customer profile");
  avatarButton.appendChild(avatar);

  const copy = document.createElement("div");
  copy.className = "insight-order-detail__profile-copy";

  const title = document.createElement("span");
  title.className = "insight-order-detail__profile-name";

  const nameButton = document.createElement("button");
  nameButton.type = "button";
  nameButton.className = "insight-order-detail__profile-name-button";
  nameButton.dataset.insightOrderProfileTrigger = "true";
  nameButton.textContent = customerName;
  nameButton.setAttribute("aria-label", "Open customer profile");

  title.appendChild(nameButton);

  const subtitle = document.createElement("span");
  subtitle.textContent = "Order profile";

  copy.append(title, subtitle);
  profile.append(avatarButton, copy, createInsightOrderLiveChatLink(order));
  return profile;
}

function createInsightOrderProfileModal(order) {
  const overlay = document.createElement("div");
  overlay.className = "insight-order-profile-modal-overlay";
  overlay.setAttribute("role", "presentation");

  const modal = document.createElement("div");
  modal.className = "insight-order-profile-modal";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-label", "Customer profile");

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "product-gallery-modal__close validation-modal__close insight-order-profile-modal__close";
  closeButton.setAttribute("aria-label", "Close customer profile");
  closeButton.title = "Close customer profile";
  closeButton.innerHTML = `<i class="fa-solid fa-xmark" aria-hidden="true"></i>`;

  const stage = document.createElement("div");
  stage.className = "insight-order-profile-modal__stage";
  stage.appendChild(
    createInsightOrderProfileAvatar(order, "insight-order-profile-modal__avatar"),
  );

  modal.append(closeButton, stage);
  overlay.appendChild(modal);

  overlay.addEventListener("click", function (event) {
    if (event.target === overlay) {
      closeInsightOrderProfileModal();
    }
  });

  closeButton.addEventListener("click", function () {
    closeInsightOrderProfileModal();
  });

  return overlay;
}

function openInsightOrderProfileModal(order) {
  if (!order) {
    return;
  }

  closeInsightOrderProfileModal();
  activeInsightProfileModalEl = createInsightOrderProfileModal(order);
  document.body.appendChild(activeInsightProfileModalEl);
  document.body.classList.add("modal-open");
}

function closeInsightOrderProfileModal() {
  if (!activeInsightProfileModalEl) {
    return;
  }

  activeInsightProfileModalEl.remove();
  activeInsightProfileModalEl = null;
  if (!activeInsightProductPhotoModalEl) {
    document.body.classList.remove("modal-open");
  }
}

function createInsightOrderProductPhotoModal(order) {
  const productName = String(order?.productName || "Ordered item").trim() || "Ordered item";
  const imageUrl = getInsightOrderProductImageUrl(order);
  const overlay = document.createElement("div");
  overlay.className = "product-gallery-modal-overlay insight-order-product-photo-modal";
  overlay.setAttribute("role", "presentation");

  const modal = document.createElement("article");
  modal.className = "product-gallery-modal insight-order-product-photo-modal__dialog";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", "insight-order-product-photo-title");

  const header = document.createElement("div");
  header.className = "product-gallery-modal__header";

  const titleGroup = document.createElement("div");
  const title = document.createElement("h2");
  title.id = "insight-order-product-photo-title";
  title.textContent = productName;

  const meta = document.createElement("p");
  meta.className = "product-gallery-modal__meta";
  meta.textContent = [
    String(order?.variantName || "").trim(),
    `Qty ${getInsightOrderQuantity(order)}`,
  ]
    .filter(Boolean)
    .join(" | ");
  meta.hidden = !meta.textContent;

  titleGroup.append(title, meta);

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "product-gallery-modal__close validation-modal__close";
  closeButton.setAttribute("aria-label", "Close product photo");
  closeButton.title = "Close product photo";
  closeButton.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';

  header.append(titleGroup, closeButton);

  const viewer = document.createElement("div");
  viewer.className = "product-gallery-modal__viewer insight-order-product-photo-modal__viewer";

  const stage = document.createElement("div");
  stage.className = "product-gallery-modal__stage insight-order-product-photo-modal__stage";

  const image = document.createElement("img");
  image.src = imageUrl;
  image.alt = productName;
  stage.appendChild(image);
  viewer.appendChild(stage);

  modal.append(header, viewer);
  overlay.appendChild(modal);

  overlay.addEventListener("click", function (event) {
    if (event.target === overlay) {
      closeInsightOrderProductPhotoModal();
    }
  });
  modal.addEventListener("click", function (event) {
    event.stopPropagation();
  });
  closeButton.addEventListener("click", function () {
    closeInsightOrderProductPhotoModal();
  });

  return overlay;
}

function openInsightOrderProductPhotoModal(order, triggerEl = null) {
  if (!getInsightOrderProductImageUrl(order)) {
    return;
  }

  closeInsightOrderProductPhotoModal();
  activeInsightProductPhotoTriggerEl = triggerEl instanceof HTMLElement ? triggerEl : null;
  activeInsightProductPhotoModalEl = createInsightOrderProductPhotoModal(order);
  document.body.appendChild(activeInsightProductPhotoModalEl);
  document.body.classList.add("modal-open");
  activeInsightProductPhotoModalEl
    .querySelector(".product-gallery-modal__close")
    ?.focus({ preventScroll: true });
}

function closeInsightOrderProductPhotoModal() {
  if (!activeInsightProductPhotoModalEl) {
    return;
  }

  activeInsightProductPhotoModalEl.remove();
  activeInsightProductPhotoModalEl = null;
  if (activeInsightProductPhotoTriggerEl instanceof HTMLElement) {
    activeInsightProductPhotoTriggerEl.focus({ preventScroll: true });
  }
  activeInsightProductPhotoTriggerEl = null;
  if (!activeInsightProfileModalEl) {
    document.body.classList.remove("modal-open");
  }
}

function createInsightOrderDetailPanel(order, entries = []) {
  const detail = document.createElement("div");
  detail.className = "insight-order-detail__content";

  const orderEntries = Array.isArray(entries) && entries.length ? entries : [order];
  const firstEntry = orderEntries[0] || order;
  const totalAmount = getInsightOrderGroupTotal(orderEntries, order);
  const outstandingAmount = getInsightOrderOutstandingAmount(firstEntry);
  const downpaymentAmount = Math.max(totalAmount - outstandingAmount, 0);
  const isFullyPaid = totalAmount > 0 && outstandingAmount <= 0.009;
  const isCodOrder = isInsightOrderCod(firstEntry);
  const paymentState = getInsightOrderPaymentState(firstEntry, outstandingAmount, isFullyPaid);
  const sheetStatus = getInsightOrderSheetStatus(firstEntry, paymentState);

  const info = document.createElement("div");
  info.className = "insight-order-sheet";
  info.append(
    createInsightOrderProfileHeader(firstEntry),
    createInsightOrderSheetRow("Date", formatInsightOrderSheetDate(firstEntry?.receivedAt)),
    createInsightOrderSheetRow("Contact", firstEntry?.contactNumber || "No contact number"),
    createInsightOrderSheetRow("Address", firstEntry?.address || firstEntry?.city || "No address", {
      isMultiline: true,
    }),
    createInsightOrderSheetRow("Type of delivery", firstEntry?.courier || "Unspecified"),
    createInsightOrderSheetRow("Mode of payment", getInsightOrderPaymentDisplay(firstEntry)),
    createInsightOrderSheetRow("Admin", getInsightOrderAdminName(firstEntry)),
  );

  const listSection = document.createElement("section");
  listSection.className = "insight-order-detail__order-list";

  const listHeading = document.createElement("h3");
  listHeading.className = "insight-order-detail__heading";
  listHeading.textContent = "Order list";
  listSection.appendChild(listHeading);

  const listSummary = document.createElement("p");
  listSummary.className = "insight-order-detail__summary";
  const totalQuantity = getInsightOrderGroupQuantity(orderEntries, order);
  listSummary.textContent = `Quantity: ${totalQuantity} item${totalQuantity === 1 ? "" : "s"}`;
  listSection.appendChild(listSummary);

  const list = document.createElement("div");
  list.className = "insight-order-detail__items";

  orderEntries.forEach((entry) => {
    const item = document.createElement("article");
    item.className = "insight-order-detail__item";

    const leading = document.createElement("div");
    leading.className = "insight-order-detail__item-leading";
    leading.appendChild(createInsightOrderItemPhotoButton(entry));

    const copy = document.createElement("div");
    copy.className = "insight-order-detail__item-copy";

    const line = document.createElement("div");
    line.className = "insight-order-detail__item-line";

    const productName = String(entry?.productName || "Ordered item").trim() || "Ordered item";
    const variantName = String(entry?.variantName || "").trim();
    const quantityCount = getInsightOrderQuantity(entry);
    const productLabel = variantName
      ? `${productName} - ${variantName}`
      : productName;
    const titleText = `${quantityCount} - ${productLabel}`;
    if (titleText.length > 58) {
      line.classList.add("is-long");
    }
    if (titleText.length > 82) {
      line.classList.add("is-extra-long");
    }

    const quantity = document.createElement("span");
    quantity.className = "insight-order-detail__item-muted";
    quantity.textContent = `${quantityCount} - `;

    const title = document.createElement("strong");
    title.textContent = productLabel;

    line.append(quantity, title);

    copy.appendChild(line);
    leading.appendChild(copy);

    const amount = document.createElement("span");
    amount.className = "insight-order-detail__item-amount";
    amount.textContent = formatMoney(getInsightOrderLineAmount(entry));

    item.append(leading, amount);
    list.appendChild(item);
  });

  listSection.appendChild(list);

  const totalSection = document.createElement("div");
  totalSection.className = "insight-order-detail__total";
  totalSection.append(
    createInsightOrderSheetRow("Total", formatMoney(totalAmount), {
      valueClassName: "insight-order-sheet__value--total",
    }),
  );

  totalSection.append(
    createInsightOrderSheetRow("Status", sheetStatus.label, {
      valueClassName: sheetStatus.valueClassName,
    }),
  );

  if (paymentState === "not-fully-paid" && isCodOrder) {
    totalSection.append(
      createInsightOrderSheetRow("Downpayment", formatMoney(downpaymentAmount)),
      createInsightOrderSheetRow("Balance", formatMoney(outstandingAmount)),
    );
  }

  detail.append(info, listSection, totalSection);
  return detail;
}

function normalizeInsightConversationMatchValue(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function hasUsefulInsightConversationToken(value) {
  const token = normalizeInsightConversationMatchValue(value);
  return Boolean(
    token &&
    token.length >= 3 &&
    !["appuser", "customer", "unknowncustomer", "user"].includes(token)
  );
}

function getInsightConversationMessages(thread) {
  return Array.isArray(thread?.messages) ? thread.messages : [];
}

function getInsightConversationCustomerName(thread, order = null) {
  const candidates = [
    order?.customerName,
    order?.clientName,
    thread?.customerName,
    thread?.clientName,
    thread?.fullName,
    thread?.displayName,
    thread?.userName,
    thread?.customerLabel,
  ];

  for (const candidate of candidates) {
    const label = String(candidate || "").trim();
    if (label) {
      return label;
    }
  }

  return "App User";
}

function getInsightConversationAvatarInitial(thread, order = null) {
  return (
    getInsightConversationCustomerName(thread, order)
      .trim()
      .charAt(0)
      .toUpperCase() || "U"
  );
}

function getInsightConversationProductName(thread, order = null) {
  return String(order?.productName || thread?.productName || "Product conversation").trim()
    || "Product conversation";
}

function isInsightConversationDeletedMessage(message) {
  return Boolean(String(message?.deletedAt || "").trim());
}

function isInsightConversationPinMessage(message) {
  const source = String(message?.source || "").trim().toLowerCase();
  const messageId = String(message?.id || "").trim().toLowerCase();
  return source === "pin-product" || messageId.startsWith("pin-");
}

function isInsightConversationVideoAttachment(url, name = "") {
  const normalizedUrl = String(url || "").trim().toLowerCase();
  const normalizedName = String(name || "").trim().toLowerCase();
  return [".mp4", ".mov", ".m4v", ".webm", ".avi", ".mkv", ".3gp"].some(
    (extension) => normalizedUrl.endsWith(extension) || normalizedName.endsWith(extension),
  );
}

function getInsightConversationProductTokens(thread) {
  const tokens = new Set();
  const productName = getInsightConversationProductName(thread);
  const productToken = normalizeInsightConversationMatchValue(productName);
  if (productToken) {
    tokens.add(productToken);
  }

  getInsightConversationMessages(thread).forEach((message) => {
    if (!isInsightConversationPinMessage(message) || isInsightConversationDeletedMessage(message)) {
      return;
    }

    const pinnedProductToken = normalizeInsightConversationMatchValue(message?.text);
    if (pinnedProductToken) {
      tokens.add(pinnedProductToken);
    }
  });

  return tokens;
}

function getInsightOrderConversationEntries(order) {
  if (!order) {
    return [];
  }

  const groupKey = getInsightOrderGroupKey(order);
  const groupedEntries = currentInsightOrders.filter(
    (entry) => getInsightOrderGroupKey(entry) === groupKey,
  );
  return groupedEntries.length ? groupedEntries : [order];
}

function getInsightOrderConversationMatchScore(thread, order, entries = []) {
  if (!thread || !order) {
    return 0;
  }

  const orderEntries = entries.length ? entries : getInsightOrderConversationEntries(order);
  let score = 0;

  const threadCustomerToken = normalizeInsightConversationMatchValue(
    getInsightConversationCustomerName(thread),
  );
  const orderCustomerToken = normalizeInsightConversationMatchValue(order?.customerName);
  if (
    hasUsefulInsightConversationToken(threadCustomerToken) &&
    hasUsefulInsightConversationToken(orderCustomerToken)
  ) {
    if (threadCustomerToken === orderCustomerToken) {
      score += 70;
    } else if (
      threadCustomerToken.includes(orderCustomerToken) ||
      orderCustomerToken.includes(threadCustomerToken)
    ) {
      score += 42;
    }
  }

  const threadProductId = normalizeInsightConversationMatchValue(thread?.productId);
  const threadProductTokens = getInsightConversationProductTokens(thread);

  orderEntries.forEach((entry) => {
    const entryProductId = normalizeInsightConversationMatchValue(entry?.productId);
    if (threadProductId && entryProductId && threadProductId === entryProductId) {
      score += 90;
    }

    const entryProductToken = normalizeInsightConversationMatchValue(entry?.productName);
    if (!entryProductToken) {
      return;
    }

    threadProductTokens.forEach((threadProductToken) => {
      if (threadProductToken === entryProductToken) {
        score += 72;
      } else if (
        threadProductToken.includes(entryProductToken) ||
        entryProductToken.includes(threadProductToken)
      ) {
        score += 48;
      }
    });
  });

  return score;
}

function findInsightOrderConversationThread(order) {
  if (!order || !currentInsightChatThreads.length) {
    return null;
  }

  const entries = getInsightOrderConversationEntries(order);
  return currentInsightChatThreads.reduce(
    (best, thread) => {
      const score = getInsightOrderConversationMatchScore(thread, order, entries);
      if (score <= 0) {
        return best;
      }

      const updatedAt = new Date(thread?.updatedAt || 0).getTime() || 0;
      if (!best.thread || score > best.score || (score === best.score && updatedAt > best.updatedAt)) {
        return { thread, score, updatedAt };
      }

      return best;
    },
    { thread: null, score: 0, updatedAt: 0 },
  ).thread;
}

function normalizeInsightConversationHeartText(value) {
  return String(value || "")
    .replace(/\uFE0F/g, "")
    .replace(/\u200D/g, "")
    .trim();
}

function isInsightConversationHeartMessage(message) {
  if (String(message?.imageUrl || "").trim()) {
    return false;
  }

  return normalizeInsightConversationHeartText(message?.text) === "\u2764";
}

function isInsightConversationEmojiOnlyText(value) {
  const normalizedText = String(value || "").trim();
  if (!normalizedText) {
    return false;
  }

  const compactText = normalizedText.replace(/\s+/g, "");
  return (
    /[\p{Extended_Pictographic}\p{Regional_Indicator}]/u.test(compactText) &&
    /^(?:\p{Extended_Pictographic}|\p{Regional_Indicator}|\uFE0F|\u200D|\u{1F3FB}|\u{1F3FC}|\u{1F3FD}|\u{1F3FE}|\u{1F3FF})+$/u.test(compactText)
  );
}

function getInsightConversationTypingActor(thread, actor, activeWindowMs) {
  const normalizedActor = String(actor || "").trim().toLowerCase();
  const typing = thread?.typing && typeof thread.typing === "object" ? thread.typing : {};
  const entry = typing[normalizedActor];
  if (!entry) {
    return null;
  }

  const updatedAt = new Date(entry.updatedAt);
  if (Number.isNaN(updatedAt.getTime()) || Date.now() - updatedAt.getTime() > activeWindowMs) {
    return null;
  }

  return entry;
}

function getInsightConversationPresenceState(thread) {
  const customerPresence = getInsightConversationTypingActor(
    thread,
    "user",
    INSIGHT_CHAT_ONLINE_ACTIVE_WINDOW_MS,
  );
  return customerPresence?.isOnline === true
    ? { className: "is-online", label: "Customer online" }
    : { className: "is-offline", label: "Customer offline" };
}

function isInsightConversationActorTyping(thread, actor) {
  const entry = getInsightConversationTypingActor(
    thread,
    actor,
    INSIGHT_CHAT_TYPING_ACTIVE_WINDOW_MS,
  );
  return entry?.isTyping === true;
}

function createInsightConversationEmptyState(message) {
  const empty = document.createElement("div");
  empty.className = "empty-state";
  empty.textContent = message;
  return empty;
}

function createInsightConversationHeader(thread, order = null) {
  const header = document.createElement("header");
  header.className = "employee-chat-conversation-header insight-conversation__header";

  const product = document.createElement("div");
  product.className = "employee-chat-conversation-product";

  const avatar = document.createElement("span");
  avatar.className = "employee-chat-conversation-avatar insight-conversation__avatar";
  avatar.textContent = getInsightConversationAvatarInitial(thread, order);

  const copy = document.createElement("div");
  copy.className = "employee-chat-conversation-copy insight-conversation__header-copy";

  const eyebrow = document.createElement("p");
  eyebrow.className = "employee-chat-conversation-eyebrow";
  eyebrow.textContent = getInsightConversationProductName(thread, order);

  const title = document.createElement("h3");
  title.textContent = getInsightConversationCustomerName(thread, order);

  const presenceState = getInsightConversationPresenceState(thread);
  const meta = document.createElement("p");
  meta.className = `employee-chat-conversation-status ${presenceState.className}`;
  meta.innerHTML = '<span class="employee-chat-conversation-status__dot" aria-hidden="true"></span>';
  const metaText = document.createElement("span");
  metaText.textContent = presenceState.label;
  meta.appendChild(metaText);

  copy.append(eyebrow, title, meta);
  product.append(avatar, copy);
  header.appendChild(product);
  return header;
}

function createInsightConversationReplyBubble(message) {
  const reply = message?.replyTo;
  const senderLabel = String(reply?.senderLabel || "").trim();
  const previewText = String(reply?.previewText || "").trim();
  if (!senderLabel || !previewText) {
    return null;
  }

  const preview = document.createElement("div");
  preview.className = "employee-chat-message__reply-bubble";

  const text = document.createElement("span");
  text.className = "employee-chat-message__reply-preview";
  text.textContent = `${senderLabel.toLowerCase() === "you" ? "Employee" : senderLabel}: ${previewText}`;

  preview.appendChild(text);
  return preview;
}

function createInsightConversationMedia(message) {
  const imageUrl = String(message?.imageUrl || "").trim();
  if (!imageUrl) {
    return null;
  }

  const imageName = String(message?.imageName || "").trim();

  if (isInsightConversationVideoAttachment(imageUrl, imageName)) {
    const media = document.createElement("span");
    media.className =
      "employee-chat-message__attachment-button employee-chat-message__attachment-button--video";

    const video = document.createElement("video");
    video.className = "employee-chat-message__attachment employee-chat-message__attachment--video";
    video.src = imageUrl;
    video.controls = true;
    video.preload = "metadata";
    video.playsInline = true;

    const play = document.createElement("span");
    play.className = "employee-chat-message__attachment-play";
    play.setAttribute("aria-hidden", "true");
    play.innerHTML = '<i class="fa-solid fa-play"></i>';

    media.append(video, play);
    return media;
  }

  const media = document.createElement("span");
  media.className =
    "employee-chat-message__attachment-button employee-chat-message__attachment-button--image";

  const image = document.createElement("img");
  image.className = "employee-chat-message__attachment employee-chat-message__attachment--image";
  image.src = imageUrl;
  image.alt = imageName || "Chat attachment";
  image.loading = "lazy";
  media.appendChild(image);
  return media;
}

function createInsightConversationPinEvent(message) {
  const event = document.createElement("article");
  event.className = "employee-chat-pin-event";

  const icon = document.createElement("span");
  icon.className = "employee-chat-pin-event__icon";
  icon.innerHTML = '<i class="fa-solid fa-thumbtack" aria-hidden="true"></i>';

  const text = document.createElement("span");
  text.className = "employee-chat-pin-event__text";
  const title = document.createElement("strong");
  title.textContent = String(message?.text || "Pinned product").trim() || "Pinned product";

  text.appendChild(title);
  event.append(icon, text);
  return event;
}

function createInsightConversationMessage(message, thread, order = null, options = {}) {
  if (isInsightConversationPinMessage(message) && !isInsightConversationDeletedMessage(message)) {
    return createInsightConversationPinEvent(message);
  }

  const isEmployee = message?.isFromSupport === true;
  const shouldShowTimestamp = options.shouldShowTimestamp === true;
  const timestampLabel = String(options.timestampLabel || "").trim();
  const messageText = String(message?.text || "").trim();
  const imageUrl = String(message?.imageUrl || "").trim();
  const hasMedia = Boolean(imageUrl);
  const isDeleted = isInsightConversationDeletedMessage(message);
  const isHeartOnly = isInsightConversationHeartMessage(message);
  const isEmojiOnly =
    !isDeleted && !hasMedia && !isHeartOnly && isInsightConversationEmojiOnlyText(messageText);
  const isLongCopy = messageText.length >= 56;
  const replyBubble = isDeleted ? null : createInsightConversationReplyBubble(message);
  const media = isDeleted ? null : createInsightConversationMedia(message);

  const article = document.createElement("article");
  article.className = [
    "employee-chat-message",
    isEmployee ? "is-support" : "is-user",
    shouldShowTimestamp ? "has-meta" : "",
    isHeartOnly ? "is-heart" : "",
    isEmojiOnly ? "is-emoji" : "",
  ].filter(Boolean).join(" ");

  const avatar = document.createElement("div");
  avatar.className = `employee-chat-message__avatar-badge ${isEmployee ? "is-support" : "is-user"}`;
  avatar.textContent = isEmployee ? "S" : getInsightConversationAvatarInitial(thread, order);

  const stack = document.createElement("div");
  stack.className = "employee-chat-message__stack";

  const contentRow = document.createElement("div");
  contentRow.className = "employee-chat-message__content-row";

  const bubbleThread = document.createElement("div");
  bubbleThread.className = [
    "employee-chat-message__bubble-thread",
    replyBubble ? "has-reply" : "",
    isLongCopy ? "has-long-copy" : "",
    hasMedia && !messageText ? "has-media-only" : "",
  ].filter(Boolean).join(" ");

  const mainRow = document.createElement("div");
  mainRow.className = [
    "employee-chat-message__main-row",
    replyBubble ? "has-reply" : "",
    isLongCopy ? "has-long-copy" : "",
    hasMedia && !messageText ? "has-media-only" : "",
  ].filter(Boolean).join(" ");

  const bubbleBody = document.createElement("div");
  bubbleBody.className = [
    "employee-chat-message__bubble-body",
    replyBubble ? "has-reply" : "",
    isLongCopy ? "is-long-copy" : "",
    hasMedia && !messageText ? "has-media-only" : "",
  ].filter(Boolean).join(" ");

  if (replyBubble) {
    bubbleBody.appendChild(replyBubble);
  }

  const bubble = document.createElement("div");
  bubble.className = [
    "employee-chat-message__bubble",
    isDeleted ? "is-deleted" : "",
    isLongCopy ? "is-long-copy" : "",
    isHeartOnly ? "is-heart" : "",
    isEmojiOnly ? "is-emoji" : "",
    hasMedia ? "has-media" : "",
    hasMedia && !messageText ? "has-media-only" : "",
  ].filter(Boolean).join(" ");

  if (isDeleted) {
    const deleted = document.createElement("div");
    deleted.className = "employee-chat-message__deleted-content";
    deleted.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash2-icon lucide-trash-2" aria-hidden="true"><path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
    const deletedText = document.createElement("span");
    deletedText.textContent = isEmployee ? "Employee deleted a message" : "Customer deleted a message";
    deleted.appendChild(deletedText);
    bubble.appendChild(deleted);
  } else {
    if (media) {
      bubble.appendChild(media);
    }

    if (isHeartOnly) {
      const heart = document.createElement("div");
      heart.className = "employee-chat-message__heart";
      heart.setAttribute("role", "img");
      heart.setAttribute("aria-label", "Heart");
      heart.textContent = "\u2764\uFE0F";
      bubble.appendChild(heart);
    } else if (isEmojiOnly) {
      const emoji = document.createElement("p");
      emoji.className = "employee-chat-message__emoji-text";
      emoji.textContent = messageText;
      bubble.appendChild(emoji);
    } else if (messageText) {
      const text = document.createElement("p");
      text.textContent = messageText;
      bubble.appendChild(text);
    }
  }

  if (!bubble.childElementCount) {
    return null;
  }

  bubbleBody.appendChild(bubble);
  mainRow.appendChild(bubbleBody);
  bubbleThread.appendChild(mainRow);
  contentRow.appendChild(bubbleThread);
  if (shouldShowTimestamp && timestampLabel) {
    const meta = document.createElement("div");
    meta.className = "employee-chat-message__meta";
    const time = document.createElement("span");
    time.textContent = timestampLabel;
    meta.appendChild(time);
    stack.appendChild(meta);
  }
  stack.appendChild(contentRow);
  article.append(avatar, stack);
  return article;
}

function createInsightConversationTypingIndicator(thread, order = null, actor = "user") {
  const isEmployee = String(actor || "").trim().toLowerCase() === "support";
  const article = document.createElement("article");
  article.className = `employee-chat-message ${isEmployee ? "is-support" : "is-user"} is-typing`;
  article.setAttribute(
    "aria-label",
    `${isEmployee ? "Employee" : getInsightConversationCustomerName(thread, order)} is typing`,
  );

  const avatar = document.createElement("div");
  avatar.className = `employee-chat-message__avatar-badge ${isEmployee ? "is-support" : "is-user"}`;
  avatar.textContent = isEmployee ? "S" : getInsightConversationAvatarInitial(thread, order);

  const stack = document.createElement("div");
  stack.className = "employee-chat-message__stack";

  const contentRow = document.createElement("div");
  contentRow.className = "employee-chat-message__content-row";

  const typingBubble = document.createElement("div");
  typingBubble.className = "employee-chat-message__typing-bubble";
  typingBubble.title = `${isEmployee ? "Employee" : getInsightConversationCustomerName(thread, order)} is typing`;

  for (let index = 0; index < 3; index += 1) {
    const dot = document.createElement("span");
    dot.className = "employee-chat-message__typing-dot";
    typingBubble.appendChild(dot);
  }

  contentRow.appendChild(typingBubble);
  stack.appendChild(contentRow);
  article.append(avatar, stack);
  return article;
}

function getInsightElementOuterHeight(element) {
  if (!element) {
    return 0;
  }

  const rect = element.getBoundingClientRect();
  const styles = window.getComputedStyle(element);
  const marginTop = Number.parseFloat(styles.marginTop) || 0;
  const marginBottom = Number.parseFloat(styles.marginBottom) || 0;
  return rect.height + marginTop + marginBottom;
}

function syncInsightConversationHeight() {
  const shell = orderConversationEl?.querySelector(".employee-chat-conversation-shell");
  if (!shell || !trackingDetailEl) {
    return;
  }

  if (window.matchMedia("(max-width: 860px)").matches) {
    shell.style.removeProperty("height");
    shell.style.removeProperty("min-height");
    shell.style.removeProperty("max-height");
    return;
  }

  const trackingHeight = trackingDetailEl.getBoundingClientRect().height;
  if (!Number.isFinite(trackingHeight) || trackingHeight <= 0) {
    return;
  }

  const sideTabs = document.querySelector(".order-insight-shell .insight-order-detail-panel .insight-side-tabs");
  const reservedHeight = getInsightElementOuterHeight(sideTabs);
  const targetHeight = Math.max(420, Math.round(trackingHeight - reservedHeight));
  const heightValue = `${targetHeight}px`;

  shell.style.height = heightValue;
  shell.style.minHeight = heightValue;
  shell.style.maxHeight = heightValue;
}

function syncInsightOrderListHeight() {
  const orderPanel = orderListEl?.closest(".insight-order-list-shell");
  if (!orderPanel) {
    return;
  }

  orderPanel.style.removeProperty("height");
  orderPanel.style.removeProperty("min-height");
  orderPanel.style.removeProperty("max-height");
}

function syncInsightColumnHeights() {
  syncInsightConversationHeight();
  syncInsightOrderListHeight();
}

function scrollInsightConversationToLatest() {
  const messageList = orderConversationEl?.querySelector(".employee-chat-message-list");
  if (!messageList) {
    return;
  }

  messageList.scrollTop = messageList.scrollHeight;
}

function requestScrollInsightConversationToLatest() {
  window.requestAnimationFrame(() => {
    syncInsightColumnHeights();
    scrollInsightConversationToLatest();
    window.requestAnimationFrame(scrollInsightConversationToLatest);
  });
}

function getInsightConversationRenderSignature(order, thread, messages, typingState) {
  const orderIdentifier = getInsightOrderIdentifier(order);
  const threadIdentifier = String(thread?.id || thread?.threadId || thread?.conversationId || "").trim();
  const messageSignature = messages.map((message) => ({
    id: String(message?.id || message?.messageId || message?.clientId || "").trim(),
    timestamp: String(message?.timestamp || message?.createdAt || "").trim(),
    text: String(message?.text || "").trim(),
    imageUrl: String(message?.imageUrl || "").trim(),
    videoUrl: String(message?.videoUrl || "").trim(),
    isFromSupport: message?.isFromSupport === true,
    deletedAt: String(message?.deletedAt || "").trim(),
    editedAt: String(message?.editedAt || "").trim(),
    replyToMessageId: String(message?.replyToMessageId || message?.replyToId || "").trim(),
  }));

  return JSON.stringify({
    orderIdentifier,
    threadIdentifier,
    typingUser: typingState.user === true,
    typingSupport: typingState.support === true,
    messages: messageSignature,
  });
}

function renderSelectedInsightConversation(order, options = {}) {
  if (!orderConversationEl) {
    return;
  }

  const previousMessageList = orderConversationEl.querySelector(".employee-chat-message-list");
  const previousScrollTop = previousMessageList ? previousMessageList.scrollTop : 0;
  const shouldPreserveScroll = options.preserveScroll === true;
  const wasNearBottom = previousMessageList
    ? previousMessageList.scrollHeight -
        (previousMessageList.scrollTop + previousMessageList.clientHeight) <= 32
    : true;
  const selectedOrderIdentifier = order ? getInsightOrderIdentifier(order) : "";
  let thread = null;
  let threadMessages = [];
  let typingState = { user: false, support: false };
  let renderSignature = `no-order:${selectedOrderIdentifier}`;

  if (!order) {
    if (shouldPreserveScroll && renderSignature === lastInsightConversationRenderSignature) {
      return;
    }
    lastInsightConversationRenderSignature = renderSignature;
    orderConversationEl.replaceChildren();
    orderConversationEl.appendChild(createInsightConversationEmptyState("No conversation available."));
    return;
  }

  renderSignature = `loading:${selectedOrderIdentifier}`;
  if (!hasLoadedInsightChatThreads) {
    if (shouldPreserveScroll && renderSignature === lastInsightConversationRenderSignature) {
      return;
    }
    lastInsightConversationRenderSignature = renderSignature;
    orderConversationEl.replaceChildren();
    orderConversationEl.appendChild(createInsightConversationEmptyState("Loading conversation..."));
    return;
  }

  thread = findInsightOrderConversationThread(order);
  if (!thread) {
    renderSignature = `empty:${selectedOrderIdentifier}`;
    if (shouldPreserveScroll && renderSignature === lastInsightConversationRenderSignature) {
      return;
    }
    lastInsightConversationRenderSignature = renderSignature;
    orderConversationEl.replaceChildren();
    orderConversationEl.appendChild(
      createInsightConversationEmptyState("No conversation found for this order yet."),
    );
    return;
  }

  threadMessages = getInsightConversationMessages(thread);
  typingState = {
    user: isInsightConversationActorTyping(thread, "user"),
    support: isInsightConversationActorTyping(thread, "support"),
  };
  renderSignature = getInsightConversationRenderSignature(order, thread, threadMessages, typingState);
  if (shouldPreserveScroll && renderSignature === lastInsightConversationRenderSignature) {
    return;
  }
  lastInsightConversationRenderSignature = renderSignature;
  orderConversationEl.replaceChildren();

  const messages = threadMessages
    .map((message, index) => {
      const previousTimestamp = threadMessages[index - 1]?.timestamp;
      const currentDayKey = getInsightConversationCalendarDayKey(message?.timestamp);
      const previousDayKey = getInsightConversationCalendarDayKey(previousTimestamp);
      const isFirstMessage = index === 0;
      const isNewDay = Boolean(currentDayKey && currentDayKey !== previousDayKey);
      const shouldShowTimestamp =
        isFirstMessage ||
        isNewDay ||
        hasInsightConversationTimestampGap(message?.timestamp, previousTimestamp);
      const shouldShowFullDate =
        isNewDay &&
        !isSameInsightConversationCalendarDay(message?.timestamp, new Date());
      const timestampLabel = formatInsightConversationTime(message?.timestamp, {
        includeDate: shouldShowFullDate,
      });

      return createInsightConversationMessage(message, thread, order, {
        shouldShowTimestamp,
        timestampLabel,
      });
    })
    .filter(Boolean);

  const shell = document.createElement("section");
  shell.className = "employee-chat-conversation-shell insight-conversation__shell";
  shell.appendChild(createInsightConversationHeader(thread, order));

  const typingIndicators = [];
  if (typingState.user) {
    typingIndicators.push(createInsightConversationTypingIndicator(thread, order, "user"));
  }
  if (typingState.support) {
    typingIndicators.push(createInsightConversationTypingIndicator(thread, order, "support"));
  }

  if (!messages.length && !typingIndicators.length) {
    shell.appendChild(createInsightConversationEmptyState("No messages yet."));
    orderConversationEl.appendChild(shell);
    window.requestAnimationFrame(syncInsightColumnHeights);
    return;
  }

  const messageList = document.createElement("div");
  messageList.className = "employee-chat-message-list";
  messages.forEach((message) => messageList.appendChild(message));
  typingIndicators.forEach((indicator) => messageList.appendChild(indicator));
  shell.appendChild(messageList);
  orderConversationEl.appendChild(shell);

  window.requestAnimationFrame(() => {
    syncInsightColumnHeights();
    if (shouldPreserveScroll && previousMessageList && !wasNearBottom) {
      const maxScrollTop = Math.max(0, messageList.scrollHeight - messageList.clientHeight);
      messageList.scrollTop = Math.min(previousScrollTop, maxScrollTop);
      return;
    }

    scrollInsightConversationToLatest();
    window.requestAnimationFrame(scrollInsightConversationToLatest);
  });
}

function createOrderCard(order) {
  const card = document.createElement("article");
  card.className = "insight-order-card";

  const header = document.createElement("div");
  header.className = "insight-order-card__header";

  const headerText = document.createElement("div");

  const customer = document.createElement("h3");
  customer.textContent = order.customerName;

  const route = document.createElement("p");
  route.className = "insight-order-card__route";
  route.textContent = `${order.city} • ${order.items} item${order.items === 1 ? "" : "s"} • ${order.payment}`;

  route.textContent = String(order.address || order.city || "No address").trim() || "No address";

  const fulfillment = document.createElement("p");
  fulfillment.className = "insight-order-card__fulfillment";
  fulfillment.textContent = String(order.contactNumber || "No contact number").trim() || "No contact number";

  headerText.append(customer, route, fulfillment);
  header.append(headerText, createStatusBadge(order.status));

  const meta = document.createElement("div");
  meta.className = "insight-order-card__meta";
  meta.append(
    createMetaItem("Courier", order.courier),
    createMetaItem("Amount", formatMoney(order.amount)),
    createMetaItem("Received", formatDateTime(order.receivedAt))
  );

  card.append(header, meta);
  return card;
}

function getInsightOrdersEmptyStateLabel() {
  if (orderSearchTerm) {
    return "Not Found";
  }
  if (activeStatusFilter !== "all") {
    return `No orders in ${getActiveStatusFilterLabel()} yet.`;
  }
  if (activeCourierFilter !== "all") {
    return `No incoming orders for ${getActiveCourierFilterLabel()} yet.`;
  }
  return "No incoming orders yet.";
}

function createInsightOrdersEmptyState() {
  const options = {
    className: "main-orders-empty-state",
    label: getInsightOrdersEmptyStateLabel(),
    copy: orderSearchTerm ? "No orders match your search." : "",
  };
  if (orderSearchTerm && window.GMS_ADMIN_SEARCH_NOT_FOUND?.create) {
    return window.GMS_ADMIN_SEARCH_NOT_FOUND.create(options);
  }
  if (!orderSearchTerm && window.GMS_ADMIN_EMPTY_STATE_LOTTIE?.create) {
    return window.GMS_ADMIN_EMPTY_STATE_LOTTIE.create({
      ...options,
      copy: "Orders will appear here once customers place them.",
    });
  }

  const emptyState = document.createElement("div");
  emptyState.className = "empty-state main-orders-empty-state";
  emptyState.textContent = options.label;
  return emptyState;
}

function getVisibleMainOrdersPage(sortedOrders) {
  const orders = Array.isArray(sortedOrders) ? sortedOrders : [];
  if (!mainOrdersEmbeddedMode) {
    return orders.slice(0, MAIN_ORDERS_PAGE_SIZE);
  }

  const pageCount = Math.max(1, Math.ceil(orders.length / MAIN_ORDERS_PAGE_SIZE));
  mainOrdersPage = Math.min(Math.max(1, mainOrdersPage), pageCount);
  const startIndex = (mainOrdersPage - 1) * MAIN_ORDERS_PAGE_SIZE;
  return orders.slice(startIndex, startIndex + MAIN_ORDERS_PAGE_SIZE);
}

function renderOrders(orders) {
  if (!orderListEl) {
    return;
  }

  orderListEl.replaceChildren();

  if (!orders.length) {
    if (mainOrdersEmbeddedMode) {
      mainOrdersPage = 1;
      renderMainOrdersPagination(0);
    }
    orderListEl.appendChild(createInsightOrdersEmptyState());
    syncMainOrdersSelectAllCheckbox();
    requestOrderInsightScrollProxyUpdate();
    return;
  }

  const sortMode = normalizeMainOrdersAdvancedFilters(mainOrdersAdvancedFilters).sort;
  const sortedOrders = [...orders].sort((left, right) => {
    const newestDifference = new Date(right.receivedAt).getTime() - new Date(left.receivedAt).getTime();
    if (sortMode === "oldest") {
      return -newestDifference;
    }
    if (sortMode === "amount-high" || sortMode === "amount-low") {
      const difference = getInsightOrderGroupTotal(getInsightOrderGroupEntries(right), right)
        - getInsightOrderGroupTotal(getInsightOrderGroupEntries(left), left);
      return sortMode === "amount-low" ? -difference : difference;
    }
    if (sortMode === "quantity-high" || sortMode === "quantity-low") {
      const difference = getInsightOrderGroupQuantity(getInsightOrderGroupEntries(right), right)
        - getInsightOrderGroupQuantity(getInsightOrderGroupEntries(left), left);
      return sortMode === "quantity-low" ? -difference : difference;
    }
    return newestDifference;
  });

  if (mainOrdersEmbeddedMode) {
    renderMainOrdersPagination(sortedOrders.length);
  }

  const visibleOrders = getVisibleMainOrdersPage(sortedOrders);

  for (const order of visibleOrders) {
    const orderIdentifier = getInsightOrderIdentifier(order);
    orderListEl.appendChild(
      mainOrdersEmbeddedMode
        ? createMainOrdersTableRow(order, {
            selected: orderIdentifier === selectedInsightOrderId,
            orderIdentifier,
          })
        : createInsightOrderCard(order, {
            interactive: Boolean(orderIdentifier),
            selected: orderIdentifier === selectedInsightOrderId,
            orderIdentifier,
          }),
    );
  }

  syncMainOrdersWaybillSelectionRows();

  requestOrderInsightScrollProxyUpdate();
}

function renderCourierBreakdown(orders) {
  if (!courierListEl) {
    return;
  }

  courierListEl.replaceChildren();

  const courierTotals = getCourierTotals(orders);
  if (!courierTotals.length) {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";
    emptyState.textContent = "No courier data available.";
    courierListEl.appendChild(emptyState);
    return;
  }

  for (const [courier, summary] of courierTotals) {
    courierListEl.appendChild(
      createInfoRow(courier, `${formatOrderCount(summary.count)} • ${formatMoney(summary.amount)}`)
    );
  }
}

function syncSelectedInsightOrder(orders) {
  const normalizedOrders = Array.isArray(orders) ? orders : [];
  const selectedOrder = normalizedOrders.find(
    (order) => getInsightOrderIdentifier(order) === selectedInsightOrderId,
  ) || normalizedOrders[0] || null;

  selectedInsightOrderId = selectedOrder ? getInsightOrderIdentifier(selectedOrder) : "";
  return selectedOrder;
}

function renderSelectedInsightOrder(order) {
  if (!orderDetailEl) {
    return;
  }

  currentInsightDetailOrder = order || null;
  orderDetailEl.replaceChildren();

  if (!order) {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";
    emptyState.textContent = "No order details available.";
    orderDetailEl.appendChild(emptyState);
    return;
  }

  const groupKey = getInsightOrderGroupKey(order);
  const groupedEntries = currentInsightOrders.filter(
    (entry) => getInsightOrderGroupKey(entry) === groupKey,
  );

  orderDetailEl.appendChild(createInsightOrderDetailPanel(order, groupedEntries));
}

function renderSelectedInsightTracking(order) {
  if (!trackingDetailEl) {
    return;
  }

  trackingDetailEl.replaceChildren();

  if (!order) {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";
    emptyState.textContent = "No tracking updates available yet.";
    trackingDetailEl.appendChild(emptyState);
    return;
  }

  trackingDetailEl.append(
    createInsightOrderTrackingSection(order),
  );
  window.requestAnimationFrame(syncInsightColumnHeights);
}

function renderMainOrdersSummary(orders = currentInsightOrders) {
  if (!mainOrdersEmbeddedMode || !mainOrdersSummaryEl) {
    return;
  }

  const normalizedOrders = Array.isArray(orders) ? orders : [];
  const summaries = [
    {
      key: "total",
      label: "Total Live Orders",
      value: normalizedOrders.length,
      note: "All current records",
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shopping-bag-icon lucide-shopping-bag" aria-hidden="true"><path d="M16 10a4 4 0 0 1-8 0"/><path d="M3.103 6.034h17.794"/><path d="M3.4 5.467a2 2 0 0 0-.4 1.2V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.667a2 2 0 0 0-.4-1.2l-2-2.667A2 2 0 0 0 17 2H7a2 2 0 0 0-1.6.8z"/></svg>',
    },
    {
      key: "pending",
      label: "Pending",
      value: normalizedOrders.filter((order) => resolveMainOrdersStatusFilter(order.status) === "new").length,
      note: "Awaiting confirmation",
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clock-icon lucide-clock" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
    },
    {
      key: "processing",
      label: "Processing",
      value: normalizedOrders.filter((order) => resolveMainOrdersStatusFilter(order.status) === "processing").length,
      note: "Being prepared",
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-package-open-icon lucide-package-open" aria-hidden="true"><path d="M12 22v-9"/><path d="M15.17 2.21a1.67 1.67 0 0 1 1.63 0L21 4.57a1.93 1.93 0 0 1 0 3.36L8.82 14.79a1.655 1.655 0 0 1-1.64 0L3 12.43a1.93 1.93 0 0 1 0-3.36z"/><path d="M20 13v3.87a2.06 2.06 0 0 1-1.11 1.83l-6 3.08a1.93 1.93 0 0 1-1.78 0l-6-3.08A2.06 2.06 0 0 1 4 16.87V13"/><path d="M21 12.43a1.93 1.93 0 0 0 0-3.36L8.83 2.2a1.64 1.64 0 0 0-1.63 0L3 4.57a1.93 1.93 0 0 0 0 3.36l12.18 6.86a1.636 1.636 0 0 0 1.63 0z"/></svg>',
    },
    {
      key: "delivery",
      label: "Out for Delivery",
      value: normalizedOrders.filter((order) => ["in-transit", "out-for-delivery", "to-receive"].includes(normalizeStatus(order.status))).length,
      note: "On the way to customers",
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-map-x" aria-hidden="true"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M14 19.5l-5 -2.5l-6 3v-13l6 -3l6 3l6 -3v9"/><path d="M9 4v13"/><path d="M15 7v6.5"/><path d="M22 22l-5 -5"/><path d="M17 22l5 -5"/></svg>',
    },
    {
      key: "completed",
      label: "Completed",
      value: normalizedOrders.filter(
        (order) => resolveMainOrdersStatusFilter(order.status) === "completed",
      ).length,
      note: "Finished orders",
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clipboard-check-icon lucide-clipboard-check" aria-hidden="true"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/></svg>',
    },
  ];

  mainOrdersSummaryEl.classList.add("super-admin-stats", "main-orders-summary");
  if (window.GmsAdminSummaryCards?.render) {
    window.GmsAdminSummaryCards.render(mainOrdersSummaryEl, summaries.map((summary) => ({
      key: summary.key,
      label: summary.label,
      value: summary.value,
      note: summary.note,
      icon: summary.icon,
      tone: summary.key === "delivery" ? "delivery" : summary.key,
      trendClass: summary.key === "total" ? "is-neutral" : "",
    })));
  } else {
    mainOrdersSummaryEl.replaceChildren(...summaries.map((summary) => {
      const card = document.createElement("article");
      card.className = `super-admin-stat`;
      card.dataset.adminSummaryStat = summary.key;
      card.dataset.adminSummaryTone = summary.key;
      card.innerHTML = `<span class="super-admin-stat__label">${summary.label}</span><span class="super-admin-stat__icon">${summary.icon}</span><strong>${summary.value}</strong><span class="super-admin-stat__trend"><span class="super-admin-stat__trend-value">${summary.note}</span><span class="super-admin-stat__trend-period"></span></span>`;
      return card;
    }));
  }

  if (mainOrdersUpdatedEl) {
    mainOrdersUpdatedEl.textContent = `Updated ${new Date().toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })}`;
  }
}

function renderMainOrdersPagination(totalOrders) {
  if (!mainOrdersEmbeddedMode || !mainOrdersPaginationEl) {
    return;
  }

  const total = Math.max(0, Number(totalOrders) || 0);
  const pageCount = Math.max(1, Math.ceil(total / MAIN_ORDERS_PAGE_SIZE));
  mainOrdersPage = Math.min(Math.max(1, mainOrdersPage), pageCount);
  const firstRecord = total ? ((mainOrdersPage - 1) * MAIN_ORDERS_PAGE_SIZE) + 1 : 0;
  const lastRecord = Math.min(total, mainOrdersPage * MAIN_ORDERS_PAGE_SIZE);
  const hasPageNavigation = pageCount > 1;

  if (mainOrdersPageMetaEl) {
    mainOrdersPageMetaEl.textContent = `Showing ${firstRecord} to ${lastRecord} of ${total} results`;
  }
  if (!mainOrdersPaginationNavEl) {
    return;
  }

  mainOrdersPaginationNavEl.replaceChildren();
  mainOrdersPaginationNavEl.hidden = !hasPageNavigation;
  mainOrdersPaginationControlsEl?.classList.toggle("is-empty", !hasPageNavigation);
  if (!hasPageNavigation) {
    return;
  }

  function createPageButton(label, targetPage, options = {}) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `main-orders-page-button${options.active ? " is-active" : ""}`;
    button.disabled = options.disabled === true;
    button.setAttribute("aria-label", options.ariaLabel || `Page ${targetPage}`);
    if (options.active) {
      button.setAttribute("aria-current", "page");
    }
    button.innerHTML = label;
    button.addEventListener("click", function () {
      if (button.disabled || targetPage === mainOrdersPage) {
        return;
      }
      mainOrdersPage = Math.min(Math.max(1, targetPage), pageCount);
      renderInsightContent();
      orderListEl?.scrollTo({ top: 0, behavior: "smooth" });
    });
    return button;
  }

  const firstPageIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m11 17-5-5 5-5"></path><path d="m18 17-5-5 5-5"></path></svg>';
  const previousPageIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>';
  const nextPageIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"></path></svg>';
  const lastPageIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m13 17 5-5-5-5"></path><path d="m6 17 5-5-5-5"></path></svg>';

  mainOrdersPaginationNavEl.append(
    createPageButton(firstPageIcon, 1, {
      ariaLabel: "First page",
      disabled: mainOrdersPage <= 1,
    }),
    createPageButton(previousPageIcon, mainOrdersPage - 1, {
      ariaLabel: "Previous page",
      disabled: mainOrdersPage <= 1,
    }),
    createPageButton(String(mainOrdersPage), mainOrdersPage, {
      active: true,
    }),
    createPageButton(nextPageIcon, mainOrdersPage + 1, {
      ariaLabel: "Next page",
      disabled: mainOrdersPage >= pageCount,
    }),
    createPageButton(lastPageIcon, pageCount, {
      ariaLabel: "Last page",
      disabled: mainOrdersPage >= pageCount,
    }),
  );
}

const MAIN_ORDERS_DETAIL_PROGRESS_STEPS = Object.freeze([
  { key: "order-placed", label: "Order Placed" },
  { key: "to-prepare", label: "To Prepare" },
  { key: "to-ship", label: "To Ship" },
  { key: "in-transit", label: "In Transit" },
  { key: "completed", label: "Completed" },
]);

function getMainOrdersDetailProgressIndex(order) {
  const status = normalizeStatus(order?.status);
  if (["to-pay", "payment-pending", "unpaid"].includes(status)) {
    return -1;
  }
  if (["delivered", "completed", "to-review", "received", "customer-received"].includes(status)) {
    return 4;
  }
  if (["in-transit", "shipped", "out-for-delivery", "to-receive"].includes(status)) {
    return 3;
  }
  if (["packed", "ready", "ready-to-ship", "to-ship"].includes(status)) {
    return 2;
  }
  return 1;
}

function getMainOrdersStatusAction(order) {
  const status = normalizeStatus(order?.status);
  if (["to-pay", "payment-pending", "unpaid"].includes(status)) {
    return {
      target: "to-pay",
      label: "To Pay",
      buttonLabel: "Awaiting Payment",
      endpointAction: "",
      message: "Payment is still pending. Fulfillment actions will be available after payment confirmation.",
    };
  }
  if (["new", "pending", "confirmed", "preparing", "processing", "to-prepare", "packing"].includes(status)) {
    return {
      target: "to-ship",
      label: "To Ship",
      buttonLabel: "Mark as Ready",
      endpointAction: "pack",
      message: "Order is being prepared. Confirm when it is ready for courier handoff.",
    };
  }
  if (["packed", "ready", "ready-to-ship", "to-ship"].includes(status)) {
    return {
      target: "in-transit",
      label: "In Transit",
      buttonLabel: "Mark as Shipped",
      endpointAction: "ship",
      message: "Order is ready to be shipped. Print the receipt and hand it over to the courier.",
    };
  }
  if (["in-transit", "shipped", "out-for-delivery", "to-receive"].includes(status)) {
    return {
      target: "in-transit",
      label: "In Transit",
      buttonLabel: "In Transit",
      endpointAction: "",
      message: "Order has been handed to the courier and is on the way to the customer.",
    };
  }
  if (["delivered", "completed", "to-review", "received", "customer-received"].includes(status)) {
    return {
      target: "delivered",
      label: "Delivered",
      buttonLabel: "Delivered",
      endpointAction: "",
      message: "Order delivery has been completed.",
    };
  }
  return {
    target: "cancelled",
    label: "Cancelled",
    buttonLabel: "Cancelled",
    endpointAction: "",
    message: "This order has been cancelled.",
  };
}

function formatMainOrdersDetailDate(value, options = {}) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return options.fallback || "Not available";
  }
  return date.toLocaleString("en-PH", options.dateOnly
    ? { month: "short", day: "numeric", year: "numeric" }
    : { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function getMainOrdersTimestampValue(epochMs, fallback = "") {
  const normalizedEpochMs = Math.trunc(Number(epochMs) || 0);
  return normalizedEpochMs > 0 ? new Date(normalizedEpochMs) : fallback;
}

function createMainOrdersDetailButton(label, iconMarkup, className = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `main-orders-detail-button${className ? ` ${className}` : ""}`;
  button.innerHTML = `${iconMarkup}<span>${label}</span>`;
  return button;
}

function notifyMainOrdersDetailModalState(isOpen) {
  if (window.parent === window) {
    return;
  }

  const shouldOpen = Boolean(isOpen);
  try {
    const parentDocument = window.parent.document;
    parentDocument.documentElement.classList.toggle("main-orders-detail-modal-open", shouldOpen);
    parentDocument.body?.classList.toggle("main-orders-detail-modal-open", shouldOpen);
    window.frameElement
      ?.closest?.(".main-orders-frame-shell")
      ?.classList.toggle("is-order-detail-modal-open", shouldOpen);
  } catch (_error) {
    // The postMessage bridge below remains the cross-origin fallback.
  }

  window.parent.postMessage(
    {
      type: "gms-main-orders-detail-modal-state",
      isOpen: shouldOpen,
    },
    window.location.origin,
  );
}

function createMainOrdersDetailPanel(title, className = "", options = {}) {
  const panel = document.createElement("section");
  panel.className = `main-orders-detail-panel${className ? ` ${className}` : ""}`;
  const heading = document.createElement("header");
  heading.className = "main-orders-detail-panel__heading";
  const headingTitleWrap = document.createElement("div");
  headingTitleWrap.className = "main-orders-detail-panel__title";
  if (options.iconMarkup) {
    const headingIcon = document.createElement("span");
    headingIcon.className = `main-orders-detail-panel__icon${options.iconClassName ? ` ${options.iconClassName}` : ""}`;
    headingIcon.setAttribute("aria-hidden", "true");
    headingIcon.innerHTML = options.iconMarkup;
    headingTitleWrap.appendChild(headingIcon);
  }
  const headingTitle = document.createElement("h2");
  headingTitle.textContent = title;
  headingTitleWrap.appendChild(headingTitle);
  heading.appendChild(headingTitleWrap);
  panel.appendChild(heading);
  return { panel, heading };
}

function createMainOrdersGoogleMapPanel(order) {
  const { panel } = createMainOrdersDetailPanel(
    "Delivery Map",
    "main-orders-detail-map",
    {
      iconClassName: "main-orders-detail-panel__icon--map",
      iconMarkup: MAIN_ORDERS_DETAIL_DELIVERY_MAP_ICON_MARKUP,
    },
  );
  panel.appendChild(createInsightOrderMapEmbed(order));
  return panel;
}

function createMainOrdersDetailDefinition(label, value, options = {}) {
  const row = document.createElement("div");
  row.className = [
    "main-orders-detail-definition",
    options.emphasis ? "is-emphasis" : "",
    options.className || "",
  ].filter(Boolean).join(" ");
  const labelEl = document.createElement("span");
  if (options.iconMarkup) {
    labelEl.className = "main-orders-detail-definition__label";
    const icon = document.createElement("span");
    icon.className = "main-orders-detail-definition__icon";
    icon.setAttribute("aria-hidden", "true");
    icon.innerHTML = options.iconMarkup;
    const labelText = document.createElement("span");
    labelText.textContent = label;
    labelEl.append(icon, labelText);
  } else {
    labelEl.textContent = label;
  }
  const valueEl = document.createElement("strong");
  valueEl.textContent = value;
  row.append(labelEl, valueEl);
  return row;
}

function getMainOrdersGroupLatestTimestamp(entries) {
  return Math.max(
    0,
    ...entries.map((entry) => {
      const receivedAt = new Date(entry?.receivedAt).getTime();
      return Number.isFinite(receivedAt)
        ? receivedAt
        : Math.trunc(Number(entry?.createdAtEpochMs) || 0);
    }),
  );
}

function getMainOrdersCustomerOrderGroups(order) {
  const targetAccountId = String(order?.accountId || "").trim();
  const targetEmail = String(order?.customerEmail || "").trim().toLowerCase();
  const targetContact = String(order?.contactNumber || "").replace(/\D/g, "");
  const targetName = getInsightOrderCustomerName(order).trim().toLowerCase();
  const matchingOrders = currentInsightOrders.filter((entry) => {
    const entryAccountId = String(entry?.accountId || "").trim();
    if (targetAccountId && entryAccountId) {
      return entryAccountId === targetAccountId;
    }

    const entryEmail = String(entry?.customerEmail || "").trim().toLowerCase();
    if (targetEmail && entryEmail) {
      return entryEmail === targetEmail;
    }

    const entryContact = String(entry?.contactNumber || "").replace(/\D/g, "");
    if (targetContact && entryContact) {
      return entryContact === targetContact;
    }

    return getInsightOrderCustomerName(entry).trim().toLowerCase() === targetName;
  });
  const groups = new Map();
  matchingOrders.forEach((entry) => {
    const groupKey = getInsightOrderGroupKey(entry);
    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey).push(entry);
  });
  return Array.from(groups.values()).sort(
    (leftEntries, rightEntries) => (
      getMainOrdersGroupLatestTimestamp(rightEntries)
      - getMainOrdersGroupLatestTimestamp(leftEntries)
    ),
  );
}

function getMainOrdersCustomerStats(order) {
  const orderGroups = getMainOrdersCustomerOrderGroups(order);
  return {
    totalOrders: orderGroups.length,
    totalSpent: orderGroups.reduce(
      (sum, entries) => sum + getInsightOrderGroupTotal(entries, entries[0]),
      0,
    ),
  };
}

function getMainOrdersStoreIdentity() {
  const session = readInsightSessionStorageJson("gms-admin-session") || {};
  return {
    name: String(
      session.companyName || session.storeName || session.businessName || session.sellerName || "Switch Store",
    ).trim() || "Switch Store",
    email: String(session.email || session.companyEmail || "").trim(),
    contact: String(session.contactNumber || session.phone || "").trim(),
  };
}

function syncMainOrdersWorkspaceAccent() {
  let storedColor = "";
  try {
    storedColor = String(
      window.localStorage?.getItem(MAIN_ORDERS_WORKSPACE_COLOR_STORAGE_KEY) || "",
    ).trim().toLowerCase();
  } catch (error) {
    storedColor = "";
  }

  const match = storedColor.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!match) {
    return "";
  }

  const channels = match.slice(1).map((part) => Number.parseInt(part, 16));
  const rgb = channels.join(", ");
  const perceivedBrightness = (
    (channels[0] * 299)
    + (channels[1] * 587)
    + (channels[2] * 114)
  ) / 1000;
  const root = document.documentElement;
  root.style.setProperty("--accent", storedColor);
  root.style.setProperty("--accent-rgb", rgb);
  root.style.setProperty("--accent-strong", storedColor);
  root.style.setProperty("--accent-text", storedColor);
  root.style.setProperty("--accent-soft", `rgba(${rgb}, 0.14)`);
  root.style.setProperty("--accent-muted", `rgba(${rgb}, 0.08)`);
  root.style.setProperty("--accent-button-bg", storedColor);
  root.style.setProperty("--accent-button-hover-bg", storedColor);
  root.style.setProperty("--main-orders-workspace-accent", storedColor);
  root.style.setProperty("--main-orders-workspace-accent-rgb", rgb);
  root.style.setProperty(
    "--main-orders-workspace-contrast",
    perceivedBrightness >= 168 ? "#111827" : "#ffffff",
  );
  root.style.setProperty("--table-row-hover-bg", `rgba(${rgb}, 0.055)`);
  root.style.setProperty(
    "--table-row-hover-shadow",
    `inset 3px 0 0 rgba(${rgb}, 0.55)`,
  );
  root.style.setProperty(
    "--accent-contrast",
    perceivedBrightness >= 168 ? "#111827" : "#ffffff",
  );
  return storedColor;
}

function getMainOrdersCssAccentColor() {
  const workspaceAccent = syncMainOrdersWorkspaceAccent();
  if (workspaceAccent) {
    return workspaceAccent;
  }

  const styles = window.getComputedStyle(document.documentElement);
  const accent = String(styles.getPropertyValue("--accent") || "").trim();
  if (accent) {
    return accent;
  }

  const accentRgb = String(styles.getPropertyValue("--accent-rgb") || "").trim();
  return accentRgb ? `rgb(${accentRgb})` : "#1686bc";
}

function ensureMainOrdersLottiePlayer() {
  if (window.lottie?.loadAnimation) {
    return Promise.resolve(true);
  }

  if (mainOrdersLottieLoadPromise) {
    return mainOrdersLottieLoadPromise;
  }

  mainOrdersLottieLoadPromise = new Promise((resolve) => {
    const existingScript = document.querySelector(
      `script[src$="${MAIN_ORDERS_LOTTIE_PLAYER_SRC}"], script[src*="${MAIN_ORDERS_LOTTIE_PLAYER_SRC}?"]`,
    );
    if (existingScript) {
      if (window.lottie?.loadAnimation) {
        resolve(true);
        return;
      }
      existingScript.addEventListener("load", () => resolve(Boolean(window.lottie?.loadAnimation)), { once: true });
      existingScript.addEventListener("error", () => resolve(false), { once: true });
      return;
    }

    const scriptElement = document.createElement("script");
    scriptElement.src = MAIN_ORDERS_LOTTIE_PLAYER_SRC;
    scriptElement.async = true;
    scriptElement.addEventListener("load", () => resolve(Boolean(window.lottie?.loadAnimation)), { once: true });
    scriptElement.addEventListener("error", () => resolve(false), { once: true });
    document.head.appendChild(scriptElement);
  });

  return mainOrdersLottieLoadPromise;
}

function isMainOrdersWhiteLottieColor(value) {
  const color = String(value || "").trim().toLowerCase().replace(/\s+/g, "");
  if (["white", "#fff", "#ffffff", "rgb(255,255,255)", "rgba(255,255,255,1)"].includes(color)) {
    return true;
  }

  const rgbMatch = color.match(/^rgba?\((\d+),(\d+),(\d+)(?:,([.\d]+))?\)$/);
  return Boolean(
    rgbMatch
    && Number(rgbMatch[1]) >= 245
    && Number(rgbMatch[2]) >= 245
    && Number(rgbMatch[3]) >= 245
    && Number(rgbMatch[4] ?? 1) > 0,
  );
}

function tintMainOrdersTimelineLottie(container) {
  if (!container) {
    return;
  }

  const step = container.closest(".main-orders-detail-progress__step");
  const isSteady = step?.classList.contains("is-lottie-steady");
  const preserveColors = container.dataset.mainOrdersLottiePreserveColors === "true";
  if (preserveColors && !isSteady) {
    const fixedColor = String(container.dataset.mainOrdersLottieColor || "").trim();
    if (fixedColor) {
      container.style.color = fixedColor;
      container.style.setProperty("--main-orders-timeline-lottie-color", fixedColor);
    }
    return;
  }

  const accentColor = isSteady
    ? String(window.getComputedStyle(step).color || "").trim() || "#98a2b3"
    : getMainOrdersCssAccentColor();
  container.style.color = accentColor;
  container.style.setProperty("--main-orders-timeline-lottie-color", accentColor);
  const svg = container.querySelector("svg");
  if (!svg) {
    return;
  }

  svg.style.color = accentColor;
  svg.querySelectorAll("[stroke]").forEach((node) => {
    const stroke = String(node.getAttribute("stroke") || "").trim().toLowerCase();
    if (
      stroke
      && stroke !== "none"
      && stroke !== "transparent"
      && !stroke.startsWith("url(")
      && !(preserveColors && isMainOrdersWhiteLottieColor(stroke))
    ) {
      node.setAttribute("stroke", accentColor);
      node.style.setProperty("stroke", accentColor, "important");
    }
  });

  if (isSteady || container.dataset.mainOrdersLottieTintFills === "true") {
    svg.querySelectorAll("[fill]").forEach((node) => {
      const fill = String(node.getAttribute("fill") || "").trim().toLowerCase();
      if (
        fill
        && fill !== "none"
        && fill !== "transparent"
        && !fill.startsWith("url(")
        && !isMainOrdersWhiteLottieColor(fill)
      ) {
        node.setAttribute("fill", accentColor);
        node.style.setProperty("fill", accentColor, "important");
      }
    });
  }
}

async function mountMainOrdersTimelineLottie(container) {
  if (!container || !container.isConnected) {
    return;
  }

  const animationPath = String(container.dataset.mainOrdersLottiePath || "").trim();
  if (!animationPath.startsWith("/animations/")) {
    return;
  }

  const canUseLottie = await ensureMainOrdersLottiePlayer();
  if (!canUseLottie || !window.lottie?.loadAnimation || !container.isConnected) {
    return;
  }

  const existingResetTimer = mainOrdersTimelineLottieResetTimers.get(container);
  if (existingResetTimer) {
    window.clearTimeout(existingResetTimer);
    mainOrdersTimelineLottieResetTimers.delete(container);
  }
  mainOrdersTimelineLotties.get(container)?.destroy?.();
  container.replaceChildren();
  tintMainOrdersTimelineLottie(container);

  const startFrame = Number(container.dataset.mainOrdersLottieStartFrame);
  const steadyFrame = Number(container.dataset.mainOrdersLottieSteadyFrame);
  const endFrame = Number(container.dataset.mainOrdersLottieEndFrame);
  const hasInitialSegment = Number.isFinite(startFrame)
    && Number.isFinite(endFrame)
    && startFrame >= 0
    && endFrame > startFrame;
  const shouldAutoplay = container.dataset.mainOrdersLottieAutoplay !== "false";
  const hasSteadyFrame = Number.isFinite(steadyFrame) && steadyFrame >= 0;
  const idleFrame = hasSteadyFrame
    ? steadyFrame
    : hasInitialSegment
      ? startFrame
      : 0;
  const resetDelayMs = Math.max(
    0,
    Math.trunc(Number(container.dataset.mainOrdersLottieResetDelay) || 0),
  );
  const hasDelayedReset = shouldAutoplay && hasInitialSegment && resetDelayMs > 0;
  const animationOptions = {
    container,
    renderer: "svg",
    loop: !hasDelayedReset,
    autoplay: shouldAutoplay && !hasDelayedReset,
    path: animationPath,
  };
  if (hasInitialSegment && (shouldAutoplay || !hasSteadyFrame)) {
    animationOptions.initialSegment = [startFrame, endFrame];
  }

  const animation = window.lottie.loadAnimation(animationOptions);
  mainOrdersTimelineLotties.set(container, animation);
  let hasStartedDelayedSegment = false;

  if (hasDelayedReset) {
    animation.addEventListener?.("complete", () => {
      const pendingResetTimer = mainOrdersTimelineLottieResetTimers.get(container);
      if (pendingResetTimer) {
        window.clearTimeout(pendingResetTimer);
      }
      const resetTimer = window.setTimeout(() => {
        mainOrdersTimelineLottieResetTimers.delete(container);
        if (
          !container.isConnected
          || mainOrdersTimelineLotties.get(container) !== animation
        ) {
          return;
        }
        animation.goToAndStop(startFrame, true);
        animation.playSegments([startFrame, endFrame], true);
      }, resetDelayMs);
      mainOrdersTimelineLottieResetTimers.set(container, resetTimer);
    });
  }

  const syncAnimationState = () => {
    tintMainOrdersTimelineLottie(container);
    if (!shouldAutoplay) {
      animation.goToAndStop(idleFrame, true);
    }
  };
  const syncLoadedAnimationState = () => {
    syncAnimationState();
    if (hasDelayedReset && !hasStartedDelayedSegment) {
      hasStartedDelayedSegment = true;
      animation.goToAndStop(startFrame, true);
      animation.playSegments([startFrame, endFrame], true);
    }
  };
  animation.addEventListener?.("DOMLoaded", syncLoadedAnimationState);
  animation.addEventListener?.("data_ready", syncLoadedAnimationState);
  window.requestAnimationFrame(syncAnimationState);
  window.setTimeout(syncAnimationState, 120);
}

function mountMainOrdersTimelineLotties(root = document) {
  root
    .querySelectorAll?.("[data-main-orders-timeline-lottie]")
    .forEach((container) => {
      void mountMainOrdersTimelineLottie(container);
    });
}

function refreshMainOrdersTimelineLottieTint() {
  document
    .querySelectorAll("[data-main-orders-timeline-lottie]")
    .forEach((container) => tintMainOrdersTimelineLottie(container));
}

function destroyMainOrdersTimelineLotties(root = null) {
  mainOrdersTimelineLotties.forEach((animation, container) => {
    if (root && container.isConnected && !root.contains(container)) {
      return;
    }
    const resetTimer = mainOrdersTimelineLottieResetTimers.get(container);
    if (resetTimer) {
      window.clearTimeout(resetTimer);
      mainOrdersTimelineLottieResetTimers.delete(container);
    }
    animation?.destroy?.();
    mainOrdersTimelineLotties.delete(container);
  });
}

function syncMainOrdersTimelineTheme() {
  syncMainOrdersWorkspaceAccent();
  refreshMainOrdersTimelineLottieTint();
}

function preserveMainOrdersWorkspaceTheme() {
  syncMainOrdersWorkspaceAccent();
  window.cancelAnimationFrame(mainOrdersWorkspaceThemeSyncFrame);
  mainOrdersWorkspaceThemeSyncFrame = window.requestAnimationFrame(() => {
    mainOrdersWorkspaceThemeSyncFrame = 0;
    syncMainOrdersTimelineTheme();
  });
}

syncMainOrdersWorkspaceAccent();
document.addEventListener("pointerdown", preserveMainOrdersWorkspaceTheme, true);
document.addEventListener("click", preserveMainOrdersWorkspaceTheme, true);
document.addEventListener("focusin", preserveMainOrdersWorkspaceTheme, true);

window.addEventListener("storage", (event) => {
  if (
    event.key === MAIN_ORDERS_WORKSPACE_COLOR_STORAGE_KEY ||
    event.key === "gms-web-theme" ||
    String(event.key || "").includes("gms-web-theme")
  ) {
    syncMainOrdersTimelineTheme();
  }
});
window.addEventListener("gms-theme-updated", syncMainOrdersTimelineTheme);
window.addEventListener("gms-theme-scope-updated", syncMainOrdersTimelineTheme);

function getMainOrdersDetailAmounts(order, entries) {
  const subtotal = entries.reduce((sum, entry) => sum + getInsightOrderLineAmount(entry), 0);
  const shippingFee = Math.max(0, Number(order?.shippingFeeAmount || 0) || 0);
  const total = getInsightOrderGroupTotal(entries, order);
  const explicitDiscount = Math.max(0, Number(order?.discountAmount || 0) || 0);
  const inferredDiscount = Math.max(0, subtotal + shippingFee - total);
  return {
    subtotal,
    shippingFee,
    discount: explicitDiscount || inferredDiscount,
    total,
  };
}

function createMainOrdersProgress(order) {
  const activeIndex = getMainOrdersDetailProgressIndex(order);
  const isCancelled = resolveMainOrdersStatusFilter(order?.status) === "cancelled";
  const progress = document.createElement("ol");
  const isAwaitingPayment = !isCancelled && activeIndex < 0;
  const usesTimelineLottieLayout = !isCancelled;
  const hasLoadingConnector = !isCancelled
    && activeIndex >= 1
    && activeIndex < MAIN_ORDERS_DETAIL_PROGRESS_STEPS.length - 1;
  const loadingConnectorIndex = activeIndex - 1;
  const loadingTargetIndex = activeIndex;
  progress.className = [
    "main-orders-detail-progress",
    isCancelled ? "is-cancelled" : "",
    isAwaitingPayment ? "is-awaiting-payment" : "",
    hasLoadingConnector ? "has-loading-connector" : "",
    usesTimelineLottieLayout ? "has-timeline-lottie" : "",
  ].filter(Boolean).join(" ");

  MAIN_ORDERS_DETAIL_PROGRESS_STEPS.forEach((step, index) => {
    const item = document.createElement("li");
    item.className = "main-orders-detail-progress__step";
    item.dataset.mainOrdersProgressStep = step.key;
    const isOrderPlacedStep = step.key === "order-placed";
    const isCompleteStep = !isCancelled && (isOrderPlacedStep || index < activeIndex);
    const isActiveStep = !isCancelled && index === activeIndex;
    const isPendingStep = !isCancelled && !isCompleteStep && index > activeIndex;
    const shouldShowToPrepareLottie = !isCompleteStep
      && !isCancelled
      && step.key === "to-prepare";
    const shouldShowToShipLottie = !isCompleteStep
      && !isCancelled
      && step.key === "to-ship";
    const shouldShowInTransitLottie = !isCompleteStep
      && !isCancelled
      && step.key === "in-transit";
    const shouldShowCompletedLottie = !isCompleteStep
      && !isCancelled
      && step.key === "completed";
    const shouldShowTimelineLottie = shouldShowToPrepareLottie
      || shouldShowToShipLottie
      || shouldShowInTransitLottie
      || shouldShowCompletedLottie;
    const shouldAnimateTimelineLottie = shouldShowTimelineLottie && isActiveStep;
    const lottieAutoplay = shouldAnimateTimelineLottie ? "true" : "false";
    if (shouldShowToPrepareLottie) {
      item.classList.add("has-to-prepare-lottie");
    }
    if (shouldShowToShipLottie) {
      item.classList.add("has-to-ship-lottie");
    }
    if (shouldShowInTransitLottie) {
      item.classList.add("has-in-transit-lottie");
    }
    if (shouldShowCompletedLottie) {
      item.classList.add("has-completed-lottie");
    }
    if (isOrderPlacedStep) {
      item.classList.add("has-order-placed-icon");
    }
    if (shouldAnimateTimelineLottie) {
      item.classList.add("is-lottie-animating");
    } else if (shouldShowTimelineLottie && isPendingStep) {
      item.classList.add("is-lottie-steady");
    }
    if (hasLoadingConnector && index === loadingConnectorIndex) {
      item.classList.add("is-loading-connector");
    } else if (hasLoadingConnector && index === loadingTargetIndex) {
      item.classList.add("is-loading-target");
    }
    if (isCompleteStep) {
      item.classList.add("is-complete");
    } else if (isActiveStep) {
      item.classList.add("is-active");
      item.setAttribute("aria-current", "step");
    }

    const marker = document.createElement("span");
    marker.className = [
      "main-orders-detail-progress__marker",
      shouldShowTimelineLottie ? "main-orders-detail-progress__marker--lottie" : "",
      isCompleteStep ? "main-orders-detail-progress__marker--complete" : "",
      isOrderPlacedStep ? "main-orders-detail-progress__marker--order-placed" : "",
    ].filter(Boolean).join(" ");
    marker.innerHTML = shouldShowToPrepareLottie
      ? `<span class="main-orders-detail-progress__lottie" data-main-orders-timeline-lottie data-main-orders-lottie-path="${MAIN_ORDERS_TO_PREPARE_LOTTIE_PATH}" data-main-orders-lottie-autoplay="${lottieAutoplay}" aria-hidden="true"><svg class="main-orders-detail-progress__lottie-fallback" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m21 8-9-5-9 5 9 5 9-5Z"/><path d="m3 8 9 5 9-5"/><path d="M12 13v9"/><path d="m21 8v9l-9 5-9-5V8"/></svg></span>`
      : shouldShowToShipLottie
        ? `<span class="main-orders-detail-progress__lottie" data-main-orders-timeline-lottie data-main-orders-lottie-path="${MAIN_ORDERS_TO_SHIP_LOTTIE_PATH}" data-main-orders-lottie-start-frame="${MAIN_ORDERS_TO_SHIP_LOTTIE_START_FRAME}" data-main-orders-lottie-end-frame="${MAIN_ORDERS_TO_SHIP_LOTTIE_END_FRAME}" data-main-orders-lottie-autoplay="${lottieAutoplay}" data-main-orders-lottie-tint-fills="true" aria-hidden="true"><svg class="main-orders-detail-progress__lottie-fallback" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 17h4V5H2v12h3"/><path d="M14 9h4l4 4v4h-3"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="17.5" r="2.5"/></svg></span>`
      : shouldShowInTransitLottie
          ? `<span class="main-orders-detail-progress__lottie" data-main-orders-timeline-lottie data-main-orders-lottie-path="${MAIN_ORDERS_IN_TRANSIT_LOTTIE_PATH}" data-main-orders-lottie-autoplay="${lottieAutoplay}" aria-hidden="true"><svg class="main-orders-detail-progress__lottie-fallback" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 17h4V5H2v12h3"/><path d="M14 9h4l4 4v4h-3"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="17.5" r="2.5"/></svg></span>`
        : shouldShowCompletedLottie
          ? `<span class="main-orders-detail-progress__lottie" data-main-orders-timeline-lottie data-main-orders-lottie-path="${MAIN_ORDERS_COMPLETED_LOTTIE_PATH}" data-main-orders-lottie-start-frame="${MAIN_ORDERS_COMPLETED_LOTTIE_START_FRAME}" data-main-orders-lottie-steady-frame="${MAIN_ORDERS_COMPLETED_LOTTIE_STEADY_FRAME}" data-main-orders-lottie-end-frame="${MAIN_ORDERS_COMPLETED_LOTTIE_END_FRAME}" data-main-orders-lottie-reset-delay="${MAIN_ORDERS_COMPLETED_LOTTIE_RESET_DELAY_MS}" data-main-orders-lottie-autoplay="${lottieAutoplay}" data-main-orders-lottie-preserve-colors="true" data-main-orders-lottie-color="#2ea86b" aria-hidden="true"><svg class="main-orders-detail-progress__lottie-fallback" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg></span>`
      : isCompleteStep
        ? isOrderPlacedStep
          ? MAIN_ORDERS_ORDER_PLACED_ICON_MARKUP
          : MAIN_ORDERS_COMPLETE_ICON_MARKUP
        : '<span aria-hidden="true"></span>';
    const label = document.createElement("strong");
    label.textContent = step.label;
    const time = document.createElement("small");
    if (step.key === "order-placed" || step.key === "to-prepare") {
      time.textContent = formatMainOrdersDetailDate(order.receivedAt);
    } else if (step.key === "to-ship" && order.inventoryDeductedAtEpochMs) {
      time.textContent = formatMainOrdersDetailDate(new Date(order.inventoryDeductedAtEpochMs));
    } else if (step.key === "in-transit" && order.shippedAtEpochMs) {
      time.textContent = formatMainOrdersDetailDate(new Date(order.shippedAtEpochMs));
    } else if (step.key === "completed" && order.deliveredAtEpochMs) {
      time.textContent = formatMainOrdersDetailDate(new Date(order.deliveredAtEpochMs));
    } else {
      time.textContent = index < activeIndex ? "Completed" : "Pending";
    }
    if (item.classList.contains("is-loading-connector")) {
      const loadingRail = document.createElement("span");
      loadingRail.className = "main-orders-detail-progress__loading-rail";
      loadingRail.setAttribute("aria-hidden", "true");
      item.append(marker, loadingRail, label, time);
    } else {
      item.append(marker, label, time);
    }
    progress.appendChild(item);
  });
  return progress;
}

function createMainOrdersSummarySection(title, className = "") {
  const section = document.createElement("section");
  section.className = `main-orders-detail-summary-section${className ? ` ${className}` : ""}`;
  const heading = document.createElement("h3");
  heading.className = "main-orders-detail-summary-section__heading";
  heading.textContent = title;
  section.appendChild(heading);
  return section;
}

function getMainOrdersEstimatedDelivery(order) {
  const startDate = new Date(order.receivedAt);
  const estimateStart = Number.isNaN(startDate.getTime()) ? null : new Date(startDate.getTime() + (2 * 86400000));
  const estimateEnd = Number.isNaN(startDate.getTime()) ? null : new Date(startDate.getTime() + (4 * 86400000));
  return estimateStart && estimateEnd
    ? `${formatMainOrdersDetailDate(estimateStart, { dateOnly: true })} - ${formatMainOrdersDetailDate(estimateEnd, { dateOnly: true })}`
    : "To be confirmed";
}

function createMainOrdersDeliverySummarySection(order) {
  const section = createMainOrdersSummarySection(
    "Delivery Information",
    "main-orders-detail-summary-delivery",
  );
  const fields = document.createElement("div");
  fields.className = "main-orders-detail-summary-delivery__grid";
  const recipient = createMainOrdersDetailDefinition(
    "Recipient",
    getInsightOrderCustomerName(order),
    { iconMarkup: MAIN_ORDERS_DELIVERY_FIELD_ICONS.recipient },
  );
  const contact = createMainOrdersDetailDefinition(
    "Contact",
    order.contactNumber || "No contact number",
    { iconMarkup: MAIN_ORDERS_DELIVERY_FIELD_ICONS.contact },
  );
  const address = createMainOrdersDetailDefinition(
    "Delivery Address",
    order.address || order.city || "No delivery address",
    { iconMarkup: MAIN_ORDERS_DELIVERY_FIELD_ICONS.address },
  );
  const paymentMethod = createMainOrdersDetailDefinition(
    "Payment Method",
    getInsightOrderPaymentDisplay(order),
    { iconMarkup: MAIN_ORDERS_DELIVERY_FIELD_ICONS.payment },
  );
  const status = createMainOrdersDetailDefinition(
    "Status",
    getInsightOrderStatusLabel(order.status),
    { iconMarkup: MAIN_ORDERS_DELIVERY_FIELD_ICONS.status },
  );
  const method = createMainOrdersDetailDefinition(
    "Delivery Method",
    order.courier || "Unspecified",
    { iconMarkup: MAIN_ORDERS_DELIVERY_FIELD_ICONS.method },
  );
  const estimate = createMainOrdersDetailDefinition(
    "Estimated Delivery",
    getMainOrdersEstimatedDelivery(order),
    { iconMarkup: MAIN_ORDERS_DELIVERY_FIELD_ICONS.estimate },
  );
  fields.append(recipient, contact, address, paymentMethod, status, method, estimate);
  section.appendChild(fields);
  return section;
}

function createMainOrdersCustomerPanel(order) {
  const { panel } = createMainOrdersDetailPanel("Customer Information", "main-orders-detail-customer");
  const stats = getMainOrdersCustomerStats(order);
  const profile = document.createElement("div");
  profile.className = "main-orders-detail-customer__profile";
  profile.appendChild(createInsightOrderProfileAvatar(order, "main-orders-detail-customer__avatar"));
  const copy = document.createElement("div");
  copy.className = "main-orders-detail-customer__copy";
  const nameLine = document.createElement("div");
  nameLine.className = "main-orders-detail-customer__name";
  const name = document.createElement("strong");
  name.textContent = getInsightOrderCustomerName(order);
  const badge = document.createElement("span");
  badge.textContent = stats.totalOrders > 1 ? "Returning Customer" : "New Customer";
  nameLine.append(name, badge);
  const email = document.createElement("span");
  email.textContent = order.customerEmail || order.contactNumber || "No contact details";
  const address = document.createElement("span");
  address.textContent = order.address || order.city || "No address";
  copy.append(nameLine, email, address);
  profile.appendChild(copy);
  const metrics = document.createElement("div");
  metrics.className = "main-orders-detail-customer__metrics";
  metrics.append(
    createMainOrdersDetailDefinition("Total Orders", String(stats.totalOrders)),
    createMainOrdersDetailDefinition("Total Spent", formatMoney(stats.totalSpent)),
  );
  const viewButton = document.createElement("button");
  viewButton.type = "button";
  viewButton.className = "main-orders-detail-wide-button";
  viewButton.textContent = "View Customer";
  viewButton.addEventListener("click", () => openInsightOrderProfileModal(order));
  panel.append(profile, metrics, viewButton);
  return panel;
}

function createMainOrdersSummaryPanel(order, entries, amounts) {
  const { panel } = createMainOrdersDetailPanel(
    "Order Summary",
    "main-orders-detail-summary-panel",
    {
      iconClassName: "main-orders-detail-panel__icon--summary",
      iconMarkup: MAIN_ORDERS_DETAIL_ORDER_SUMMARY_ICON_MARKUP,
    },
  );
  const body = document.createElement("div");
  body.className = "main-orders-detail-summary-panel__body main-orders-detail-summary-panel__totals";
  body.append(
    createMainOrdersDetailDefinition(
      `Subtotal (${getInsightOrderGroupQuantity(entries, order)} items)`,
      formatMoney(amounts.subtotal),
      { className: "main-orders-detail-definition--pricing-line" },
    ),
    createMainOrdersDetailDefinition(
      "Shipping Fee",
      formatMoney(amounts.shippingFee),
      { className: "main-orders-detail-definition--pricing-line" },
    ),
    createMainOrdersDetailDefinition(
      "Discount",
      `-${formatMoney(amounts.discount)}`,
      { className: "main-orders-detail-definition--pricing-line" },
    ),
    createMainOrdersDetailDefinition("Total", formatMoney(amounts.total), {
      emphasis: true,
      className: "main-orders-detail-definition--pricing-line",
    }),
  );
  panel.append(
    createMainOrdersDeliverySummarySection(order),
    createMainOrdersItemsSection(order, entries),
    body,
  );
  return panel;
}

function doesMainOrdersHistoryGroupMatchStatus(entries, statusFilter) {
  if (statusFilter === "all") {
    return true;
  }
  const resolvedStatuses = entries.map((entry) => resolveMainOrdersStatusFilter(entry?.status));
  if (statusFilter === "active") {
    return resolvedStatuses.some((status) => ["new", "processing", "shipped"].includes(status));
  }
  return resolvedStatuses.includes(statusFilter);
}

function createMainOrdersHistoryFilter(order) {
  const filter = document.createElement("div");
  filter.className = "main-orders-detail-history-filter";
  filter.dataset.mainOrdersHistoryFilter = "true";

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "main-orders-detail-history-filter__trigger";
  trigger.dataset.mainOrdersHistoryFilterTrigger = "true";
  trigger.setAttribute("aria-label", "Sort and filter order history");
  trigger.setAttribute("aria-haspopup", "menu");
  trigger.setAttribute("aria-expanded", "false");
  trigger.setAttribute("aria-controls", "main-orders-detail-history-filter-menu");
  trigger.title = "Sort and filter order history";
  trigger.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z"/></svg>';
  trigger.classList.toggle(
    "is-filtered",
    mainOrdersHistorySort !== "newest" || mainOrdersHistoryStatus !== "all",
  );

  const menu = document.createElement("div");
  menu.id = "main-orders-detail-history-filter-menu";
  menu.className = "main-orders-detail-history-filter__menu";
  menu.setAttribute("role", "menu");
  menu.setAttribute("aria-label", "Order history sorting and filters");
  menu.hidden = true;

  const documentPointerHandler = (event) => {
    if (!filter.contains(event.target)) {
      closeMenu();
    }
  };
  const closeMenu = ({ restoreFocus = false } = {}) => {
    menu.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    document.removeEventListener("pointerdown", documentPointerHandler, true);
    if (restoreFocus) {
      trigger.focus();
    }
  };
  const openMenu = () => {
    menu.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    document.addEventListener("pointerdown", documentPointerHandler, true);
    menu.querySelector(".is-selected")?.focus();
  };
  const selectOption = (type, value) => {
    closeMenu();
    if (type === "sort") {
      mainOrdersHistorySort = value;
    } else {
      mainOrdersHistoryStatus = value;
    }
    renderMainOrdersDetail(order);
    window.requestAnimationFrame(() => {
      mainOrdersDetailViewEl
        ?.querySelector("[data-main-orders-history-filter-trigger]")
        ?.focus();
    });
  };
  const appendOptionGroup = (label, type, options, selectedValue) => {
    const group = document.createElement("div");
    group.className = "main-orders-detail-history-filter__group";
    group.setAttribute("role", "group");
    group.setAttribute("aria-label", label);
    const groupLabel = document.createElement("span");
    groupLabel.className = "main-orders-detail-history-filter__label";
    groupLabel.textContent = label;
    group.appendChild(groupLabel);
    options.forEach((option) => {
      const optionButton = document.createElement("button");
      const isSelected = option.value === selectedValue;
      optionButton.type = "button";
      optionButton.className = `main-orders-detail-history-filter__option${isSelected ? " is-selected" : ""}`;
      optionButton.setAttribute("role", "menuitemradio");
      optionButton.setAttribute("aria-checked", isSelected ? "true" : "false");
      optionButton.innerHTML = `<span>${option.label}</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>`;
      optionButton.addEventListener("click", () => selectOption(type, option.value));
      group.appendChild(optionButton);
    });
    menu.appendChild(group);
  };

  appendOptionGroup("Sort by date", "sort", MAIN_ORDERS_HISTORY_SORT_OPTIONS, mainOrdersHistorySort);
  appendOptionGroup("Filter by status", "status", MAIN_ORDERS_HISTORY_STATUS_OPTIONS, mainOrdersHistoryStatus);

  trigger.addEventListener("click", () => {
    if (menu.hidden) {
      openMenu();
    } else {
      closeMenu({ restoreFocus: true });
    }
  });
  filter.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !menu.hidden) {
      event.preventDefault();
      closeMenu({ restoreFocus: true });
    }
  });
  filter.append(trigger, menu);
  return filter;
}

function createMainOrdersCustomerHistoryPanel(order) {
  const { panel, heading } = createMainOrdersDetailPanel("Order History", "main-orders-detail-history-panel");
  heading.appendChild(createMainOrdersHistoryFilter(order));
  const orderGroups = getMainOrdersCustomerOrderGroups(order);
  const currentGroupKey = getInsightOrderGroupKey(order);
  const historyGroups = (orderGroups.length ? orderGroups : [[order]])
    .slice()
    .filter((entries) => {
      const isCurrent = getInsightOrderGroupKey(entries[0] || order) === currentGroupKey;
      return isCurrent || doesMainOrdersHistoryGroupMatchStatus(entries, mainOrdersHistoryStatus);
    })
    .sort((leftEntries, rightEntries) => {
      const leftIsCurrent = getInsightOrderGroupKey(leftEntries[0] || order) === currentGroupKey;
      const rightIsCurrent = getInsightOrderGroupKey(rightEntries[0] || order) === currentGroupKey;
      if (leftIsCurrent !== rightIsCurrent) {
        return leftIsCurrent ? -1 : 1;
      }
      const dateDifference = (
        getMainOrdersGroupLatestTimestamp(rightEntries)
        - getMainOrdersGroupLatestTimestamp(leftEntries)
      );
      return mainOrdersHistorySort === "oldest" ? -dateDifference : dateDifference;
    });

  const table = document.createElement("div");
  table.className = "main-orders-detail-history__table";
  table.setAttribute("role", "table");
  table.setAttribute("aria-label", "Customer order history");

  const tableHeading = document.createElement("div");
  tableHeading.className = "main-orders-detail-history__heading";
  tableHeading.setAttribute("role", "row");
  ["Order ID", "Date", "Courier", "Total", "Status"].forEach((label) => {
    const cell = document.createElement("span");
    cell.setAttribute("role", "columnheader");
    cell.textContent = label;
    tableHeading.appendChild(cell);
  });
  table.appendChild(tableHeading);

  const list = document.createElement("ol");
  list.className = "main-orders-detail-history__list";
  list.setAttribute("role", "rowgroup");
  historyGroups.forEach((entries) => {
    const historyOrder = entries[0] || order;
    const isCurrent = getInsightOrderGroupKey(historyOrder) === currentGroupKey;
    const row = document.createElement("li");
    row.className = `main-orders-detail-history__row${isCurrent ? " is-current" : ""}`;
    row.setAttribute("role", "row");

    const identifier = document.createElement("div");
    identifier.className = "main-orders-detail-history__order";
    identifier.setAttribute("role", "cell");
    identifier.dataset.label = "Order ID";
    const identifierText = document.createElement("strong");
    const historyOrderId = getInsightOrderIdentifier(historyOrder);
    identifierText.textContent = historyOrderId.startsWith("#") ? historyOrderId : `#${historyOrderId}`;
    identifier.appendChild(identifierText);
    if (isCurrent) {
      const currentBadge = document.createElement("span");
      currentBadge.textContent = "Current";
      identifier.appendChild(currentBadge);
    }

    const date = document.createElement("span");
    date.setAttribute("role", "cell");
    date.dataset.label = "Date";
    date.textContent = formatMainOrdersDetailDate(historyOrder.receivedAt, { dateOnly: true });

    const courier = document.createElement("span");
    courier.setAttribute("role", "cell");
    courier.dataset.label = "Courier";
    courier.textContent = String(
      historyOrder.deliveryPartnerName
      || historyOrder.courier
      || historyOrder.deliveryProvider
      || "Unspecified",
    ).trim() || "Unspecified";

    const total = document.createElement("strong");
    total.setAttribute("role", "cell");
    total.dataset.label = "Total";
    total.textContent = formatMoney(getInsightOrderGroupTotal(entries, historyOrder));

    const status = createStatusBadge(historyOrder.status);
    status.setAttribute("role", "cell");
    status.dataset.label = "Status";
    row.append(identifier, date, courier, total, status);
    list.appendChild(row);
  });
  table.appendChild(list);
  panel.appendChild(table);
  return panel;
}

function createMainOrdersHistoryView(order) {
  const historyView = document.createElement("div");
  historyView.className = "main-orders-detail-history-view";
  historyView.append(
    createMainOrdersCustomerPanel(order),
    createMainOrdersCustomerHistoryPanel(order),
  );
  return historyView;
}

function createMainOrdersDetailFooter(order) {
  const footer = document.createElement("footer");
  footer.className = "main-orders-detail-footer";
  footer.setAttribute("aria-label", "Order detail actions");
  const actions = document.createElement("div");
  actions.className = "main-orders-detail-footer__actions";

  const primaryButton = createMainOrdersDetailButton(
    "Print Waybill",
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 9V2h12v7"/><rect x="6" y="14" width="12" height="8"/></svg>',
    "main-orders-detail-footer__button is-primary",
  );
  primaryButton.dataset.mainOrdersDetailFooterPrimary = "true";
  const canPrintCurrentOrder = canSelectOrderForWaybill(order) && getInsightOrderGroupId(order) > 0;
  const isWaybillReprint = hasPrintedOrderWaybill(order);
  primaryButton.disabled = mainOrdersWaybillPrintInFlight || !canPrintCurrentOrder;
  primaryButton.title = canPrintCurrentOrder
    ? isWaybillReprint
      ? "Reprint this order's waybill"
      : "Print this order's waybill"
    : "Waybill is unavailable for this order";
  primaryButton.addEventListener("click", async () => {
    if (!canPrintCurrentOrder || mainOrdersWaybillPrintInFlight) {
      return;
    }
    primaryButton.disabled = true;
    await previewSelectedMainOrdersWaybills([getInsightOrderGroupId(order)]);
    const refreshedOrder = currentInsightOrders.find(
      (entry) => getInsightOrderIdentifier(entry) === mainOrdersDetailOrderId,
    );
    if (refreshedOrder && !mainOrdersDetailViewEl?.hidden) {
      renderMainOrdersDetail(refreshedOrder);
    }
  });

  const closeButton = createMainOrdersDetailButton(
    "Close",
    "",
    "main-orders-detail-footer__button main-orders-detail-footer__close",
  );
  closeButton.addEventListener("click", closeMainOrdersDetail);
  actions.append(closeButton, primaryButton);
  footer.appendChild(actions);
  return footer;
}

function getMainOrdersTransitTimelineActiveIndex(order, eventCount) {
  const status = normalizeStatus(order?.status);
  if (["delivered", "completed", "to-review", "received", "customer-received"].includes(status)) {
    return eventCount;
  }
  if (["out-for-delivery", "to-receive"].includes(status)) {
    return 5;
  }
  if (status === "in-transit") {
    return 3;
  }
  if (status === "shipped") {
    return 2;
  }
  if (["packed", "ready", "ready-to-ship", "to-ship"].includes(status)) {
    return 0;
  }
  return -1;
}

function getMainOrdersSampleTransitEvents(order) {
  const receivedAt = new Date(order?.receivedAt);
  const readyAt = getMainOrdersTimestampValue(order?.inventoryDeductedAtEpochMs);
  const baseDate = readyAt instanceof Date && !Number.isNaN(readyAt.getTime())
    ? readyAt
    : !Number.isNaN(receivedAt.getTime())
      ? receivedAt
      : new Date();
  const courierName = String(
    order?.deliveryPartnerName
    || order?.courier
    || order?.deliveryProvider
    || "Courier",
  ).trim() || "Courier";
  const destinationArea = String(order?.city || order?.address || "Destination")
    .split(",")[0]
    .trim() || "Destination";
  const customerName = getInsightOrderCustomerName(order);
  const deliveredAt = getMainOrdersTimestampValue(order?.deliveredAtEpochMs);
  const atMinuteOffset = (minutes) => new Date(baseDate.getTime() + (minutes * 60000));

  return [
    {
      label: "Waiting for courier to pick up parcel",
      description: "Parcel is packed and ready at Switch Packing Hub.",
      timestamp: atMinuteOffset(0),
    },
    {
      label: "Rider picked up parcel",
      description: `${courierName} pickup rider collected the parcel.`,
      timestamp: atMinuteOffset(45),
    },
    {
      label: "Arrived at origin sorting facility",
      description: `Checked in at the ${courierName} origin sorting facility.`,
      timestamp: atMinuteOffset(180),
    },
    {
      label: "Departed origin sorting facility",
      description: "Parcel is moving to the destination distribution hub.",
      timestamp: atMinuteOffset(360),
    },
    {
      label: "Arrived at destination sorting facility",
      description: `Parcel was scanned at the ${destinationArea} sorting facility.`,
      timestamp: atMinuteOffset(900),
    },
    {
      label: "Out for delivery",
      description: "Parcel was assigned to the destination delivery rider.",
      timestamp: atMinuteOffset(1200),
    },
    {
      label: "Delivered to customer",
      description: `Parcel received by ${customerName}.`,
      timestamp: deliveredAt instanceof Date && !Number.isNaN(deliveredAt.getTime())
        ? deliveredAt
        : atMinuteOffset(1440),
    },
  ];
}

function createMainOrdersTransitTimelinePanel(order) {
  const { panel, heading } = createMainOrdersDetailPanel(
    "In Transit Timeline",
    "main-orders-detail-timeline",
    {
      iconClassName: "main-orders-detail-panel__icon--timeline",
      iconMarkup: MAIN_ORDERS_DETAIL_TRANSIT_TIMELINE_ICON_MARKUP,
    },
  );
  const sampleBadge = document.createElement("span");
  sampleBadge.className = "main-orders-detail-timeline__sample-badge";
  sampleBadge.textContent = "Sample data";
  heading.appendChild(sampleBadge);

  const events = getMainOrdersSampleTransitEvents(order);
  const timelineActiveIndex = getMainOrdersTransitTimelineActiveIndex(order, events.length);
  const list = document.createElement("ol");
  list.className = "main-orders-detail-timeline__list";
  events.forEach((event, index) => {
    const item = document.createElement("li");
    const isComplete = timelineActiveIndex >= events.length || index < timelineActiveIndex;
    const isActive = index === timelineActiveIndex;
    if (isComplete) {
      item.classList.add("is-complete");
    }
    if (isActive) {
      item.classList.add("is-active");
    }
    item.setAttribute(
      "aria-label",
      `${event.label}, ${isComplete ? "completed" : isActive ? "in progress" : "pending"}`,
    );
    const marker = document.createElement("span");
    marker.className = "main-orders-detail-timeline__marker";
    const eventCopy = document.createElement("div");
    eventCopy.className = "main-orders-detail-timeline__event";
    const itemLabel = document.createElement("strong");
    itemLabel.textContent = event.label;
    const itemDescription = document.createElement("span");
    itemDescription.textContent = event.description;
    const itemTime = document.createElement("time");
    itemTime.className = "main-orders-detail-timeline__time";
    if (isComplete || isActive) {
      itemTime.dateTime = event.timestamp.toISOString();
      itemTime.textContent = formatMainOrdersDetailDate(event.timestamp);
    } else {
      itemTime.textContent = "Pending";
    }
    eventCopy.append(itemLabel, itemDescription, itemTime);
    item.append(marker, eventCopy);
    list.appendChild(item);
  });
  panel.appendChild(list);
  return panel;
}

function createMainOrdersItemRow(entry) {
  const row = document.createElement("article");
  const quantityCount = getInsightOrderQuantity(entry);
  const hasMultipleQuantity = quantityCount > 1;
  row.className = `main-orders-detail-item${hasMultipleQuantity ? " has-multiple-quantity" : ""}`;
  const product = document.createElement("div");
  product.className = "main-orders-detail-item__product";
  const productName = String(entry.productName || "Ordered item").trim() || "Ordered item";
  product.appendChild(createMainOrdersMedia(
    getInsightOrderProductImageUrl(entry),
    productName.charAt(0).toUpperCase(),
    "main-orders-detail-item__image",
  ));
  const copy = document.createElement("div");
  const title = document.createElement("strong");
  title.textContent = `${productName} (${quantityCount})`;
  const variant = document.createElement("span");
  variant.textContent = entry.variantName || "Standard item";
  copy.append(title, variant);
  product.appendChild(copy);
  const unitPrice = document.createElement("span");
  unitPrice.className = "main-orders-detail-item__unit-price";
  unitPrice.dataset.label = "Unit Price";
  unitPrice.textContent = formatMoney(
    Number(entry.unitPrice || 0)
      || (getInsightOrderLineAmount(entry) / getInsightOrderQuantity(entry)),
  );
  row.append(product, unitPrice);
  if (hasMultipleQuantity) {
    const amount = document.createElement("strong");
    amount.className = "main-orders-detail-item__total-price";
    amount.dataset.label = "Total";
    amount.textContent = formatMoney(getInsightOrderLineAmount(entry));
    row.appendChild(amount);
  }
  return row;
}

function createMainOrdersItemsTable(entries, className = "") {
  const table = document.createElement("div");
  table.className = `main-orders-detail-items__table${className ? ` ${className}` : ""}`;
  entries.forEach((entry) => table.appendChild(createMainOrdersItemRow(entry)));
  return table;
}

function createMainOrdersItemsSection(order, entries) {
  const productEntries = Array.isArray(entries) && entries.length ? entries : [order];
  const visibleEntries = productEntries.slice(0, 2);
  const remainingEntries = productEntries.slice(2);
  const section = createMainOrdersSummarySection(
    `Order Items (${getInsightOrderGroupQuantity(productEntries, order)})`,
    "main-orders-detail-summary-items",
  );
  section.appendChild(createMainOrdersItemsTable(visibleEntries));

  if (!remainingEntries.length) {
    return section;
  }

  const orderKey = String(getInsightOrderIdentifier(order) || "order")
    .replace(/[^a-z0-9_-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  const overlayId = `main-orders-items-overlay-${orderKey || "order"}`;
  const disclosure = document.createElement("details");
  disclosure.className = "main-orders-detail-items-disclosure";
  const toggle = document.createElement("summary");
  toggle.className = "main-orders-detail-items-toggle";
  toggle.setAttribute("aria-controls", overlayId);
  const toggleLabel = document.createElement("span");
  toggleLabel.textContent = "View More";
  toggle.appendChild(toggleLabel);
  toggle.insertAdjacentHTML(
    "beforeend",
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
  );

  const overlay = document.createElement("div");
  overlay.id = overlayId;
  overlay.className = "main-orders-detail-items-overlay";
  overlay.setAttribute("role", "region");
  overlay.setAttribute("aria-label", "More order items");
  const overlayHeading = document.createElement("div");
  overlayHeading.className = "main-orders-detail-items-overlay__heading";
  const overlayTitle = document.createElement("strong");
  overlayTitle.textContent = "More Order Items";
  const overlayCount = document.createElement("span");
  overlayCount.textContent = `${remainingEntries.length} more product${remainingEntries.length === 1 ? "" : "s"}`;
  overlayHeading.append(overlayTitle, overlayCount);
  overlay.append(
    overlayHeading,
    createMainOrdersItemsTable(
      remainingEntries,
      "main-orders-detail-items__table--overlay",
    ),
  );

  disclosure.append(toggle, overlay);
  disclosure.addEventListener("toggle", () => {
    const isOpen = disclosure.open;
    section.classList.toggle("is-items-overlay-open", isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
    toggleLabel.textContent = isOpen ? "See Less" : "View More";
  });
  disclosure.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !disclosure.open) {
      return;
    }
    event.preventDefault();
    disclosure.open = false;
    toggle.focus();
  });

  section.appendChild(disclosure);
  return section;
}

async function updateMainOrdersStatus(order, targetStatus) {
  if (mainOrdersStatusUpdateInFlight || !order) {
    return;
  }
  const action = getMainOrdersStatusAction(order);
  const target = String(targetStatus || "").trim();
  const isCancel = target === "cancelled";
  const endpointAction = isCancel ? "cancel" : target === action.target ? action.endpointAction : "";
  if (!endpointAction) {
    renderMainOrdersDetail(order);
    return;
  }
  if (isCancel && !window.confirm("Cancel this order? This action may restore deducted inventory.")) {
    renderMainOrdersDetail(order);
    return;
  }

  const groupId = Math.trunc(Number(order.createdAtEpochMs) || 0);
  if (!groupId) {
    mainOrdersDetailStatusMessage = "This order does not have a valid group identifier.";
    renderMainOrdersDetail(order);
    return;
  }

  mainOrdersStatusUpdateInFlight = true;
  mainOrdersDetailStatusMessage = "Updating order status...";
  renderMainOrdersDetail(order);
  try {
    const response = await fetch(`/api/orders/${encodeURIComponent(groupId)}/${endpointAction}`, {
      method: "POST",
      cache: "no-store",
      headers: withInsightAdminTenantHeaders({
        Accept: "application/json",
        "Content-Type": "application/json",
      }),
      body: endpointAction === "pack" ? JSON.stringify({ deductInventory: true }) : JSON.stringify({}),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.message || "Unable to update the order status.");
    }
    const refreshedOrders = await loadOrders({ preserveOnError: true });
    if (Array.isArray(refreshedOrders)) {
      currentInsightOrders = refreshedOrders;
      mainOrdersDataSignature = getMainOrdersDataSignature(refreshedOrders);
    }
    mainOrdersDetailStatusMessage = data?.message || "Order status updated.";
    if (Array.isArray(refreshedOrders)) {
      renderCourierTabs();
      renderInsightContent();
    }
  } catch (error) {
    mainOrdersDetailStatusMessage = error instanceof Error ? error.message : "Unable to update the order status.";
    renderMainOrdersDetail(order);
  } finally {
    mainOrdersStatusUpdateInFlight = false;
    const refreshedOrder = currentInsightOrders.find(
      (entry) => getInsightOrderIdentifier(entry) === mainOrdersDetailOrderId,
    ) || order;
    renderMainOrdersDetail(refreshedOrder);
  }
}

function renderMainOrdersDetail(order) {
  if (!mainOrdersDetailViewEl) {
    return;
  }
  syncMainOrdersWorkspaceAccent();
  destroyMainOrdersTimelineLotties(mainOrdersDetailViewEl);
  mainOrdersDetailViewEl.replaceChildren();
  if (!order) {
    closeMainOrdersDetail();
    return;
  }

  const entries = getInsightOrderGroupEntries(order);
  const amounts = getMainOrdersDetailAmounts(order, entries);
  const shell = document.createElement("div");
  shell.className = "main-orders-detail-shell";

  const top = document.createElement("header");
  top.className = "main-orders-detail-top";
  const titleGroup = document.createElement("div");
  titleGroup.className = "main-orders-detail-top__title";
  const modalIcon = document.createElement("span");
  modalIcon.className = "main-orders-detail-top__icon main-orders-detail-top__icon--live-order";
  modalIcon.setAttribute("aria-hidden", "true");
  modalIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pinned-icon lucide-map-pinned" aria-hidden="true"><path d="M18 8c0 3.613-3.869 7.429-5.393 8.795a1 1 0 0 1-1.214 0C9.87 15.429 6 11.613 6 8a6 6 0 0 1 12 0"/><circle cx="12" cy="8" r="2"/><path d="M8.714 14h-3.71a1 1 0 0 0-.948.683l-2.004 6A1 1 0 0 0 3 22h18a1 1 0 0 0 .948-1.316l-2-6a1 1 0 0 0-.949-.684h-3.712"/></svg>';
  const headingCopy = document.createElement("div");
  const titleLine = document.createElement("div");
  titleLine.className = "main-orders-detail-top__title-line";
  const title = document.createElement("h1");
  title.textContent = `Order #${getInsightOrderIdentifier(order).replace(/^#/, "")}`;
  titleLine.appendChild(title);
  const placed = document.createElement("p");
  placed.textContent = `Placed on ${formatMainOrdersDetailDate(order.receivedAt)}`;
  headingCopy.append(titleLine, placed);
  titleGroup.append(modalIcon, headingCopy);

  top.appendChild(titleGroup);

  const content = document.createElement("div");
  content.className = "main-orders-detail-content";
  let progress = null;
  if (mainOrdersDetailMode === "history") {
    content.appendChild(createMainOrdersHistoryView(order));
  } else {
    progress = createMainOrdersProgress(order);
    const layout = document.createElement("div");
    layout.className = "main-orders-detail-layout";
    const mainColumn = document.createElement("div");
    mainColumn.className = "main-orders-detail-main";
    const infoGrid = document.createElement("div");
    infoGrid.className = "main-orders-detail-info-grid";
    const mapColumn = document.createElement("div");
    mapColumn.className = "main-orders-detail-map-column";
    mapColumn.appendChild(createMainOrdersGoogleMapPanel(order));
    const informationStack = document.createElement("div");
    informationStack.className = "main-orders-detail-information-stack";
    informationStack.appendChild(createMainOrdersSummaryPanel(order, entries, amounts));
    infoGrid.append(mapColumn, informationStack);
    mainColumn.appendChild(infoGrid);
    const sidebar = document.createElement("aside");
    sidebar.className = "main-orders-detail-sidebar";
    sidebar.append(createMainOrdersTransitTimelinePanel(order));
    layout.append(mainColumn, sidebar);
    content.append(progress, layout);
  }

  shell.append(top, content, createMainOrdersDetailFooter(order));
  mainOrdersDetailViewEl.appendChild(shell);
  if (progress) {
    mountMainOrdersTimelineLotties(progress);
  }
}

function openMainOrdersDetail(orderIdentifier, options = {}) {
  if (!mainOrdersDetailViewEl) {
    return;
  }
  const normalizedIdentifier = String(orderIdentifier || "").trim();
  const order = currentInsightOrders.find(
    (entry) => getInsightOrderIdentifier(entry) === normalizedIdentifier,
  );
  if (!order) {
    return;
  }
  mainOrdersDetailOrderId = normalizedIdentifier;
  mainOrdersDetailMode = options?.mode === "history" ? "history" : "tracking";
  selectedInsightOrderId = normalizedIdentifier;
  mainOrdersDetailStatusMessage = "";
  mainOrdersDetailTriggerEl = document.activeElement instanceof HTMLElement
    ? document.activeElement
    : null;

  if (!mainOrdersEmbeddedMode) {
    document.body.classList.add("main-orders-standalone-modal-active", "main-orders-embedded");
  }

  renderMainOrdersDetail(order);
  notifyMainOrdersDetailModalState(true);
  document.body.classList.add("main-orders-detail-active");
  mainOrdersDetailViewEl.hidden = false;
  mainOrdersDetailViewEl.scrollTo({ top: 0, behavior: "auto" });
  window.requestAnimationFrame(() => {
    mainOrdersDetailViewEl.querySelector(".main-orders-detail-back")?.focus();
  });
}

function closeMainOrdersDetail() {
  preserveMainOrdersWorkspaceTheme();
  const triggerEl = mainOrdersDetailTriggerEl;
  mainOrdersDetailTriggerEl = null;
  mainOrdersDetailOrderId = "";
  mainOrdersDetailMode = "tracking";
  mainOrdersDetailStatusMessage = "";
  if (mainOrdersDetailViewEl) {
    destroyMainOrdersTimelineLotties(mainOrdersDetailViewEl);
    mainOrdersDetailViewEl.hidden = true;
    mainOrdersDetailViewEl.replaceChildren();
  }
  document.body.classList.remove("main-orders-detail-active");
  if (document.body.classList.contains("main-orders-standalone-modal-active")) {
    document.body.classList.remove("main-orders-standalone-modal-active", "main-orders-embedded");
  }
  selectedInsightOrderId = "";
  notifyMainOrdersDetailModalState(false);
  if (triggerEl?.isConnected) {
    window.requestAnimationFrame(() => triggerEl.focus());
  }
}

function getNormalizedInsightOrderReceivedAt(order) {
  const storedValue = String(order?.receivedAt || order?.createdAt || "").trim();
  if (storedValue) {
    return storedValue;
  }
  const createdAtEpochMs = Number(order?.createdAtEpochMs);
  const createdAt = new Date(createdAtEpochMs);
  return Number.isFinite(createdAtEpochMs) && createdAtEpochMs > 0 && !Number.isNaN(createdAt.getTime())
    ? createdAt.toISOString()
    : "";
}

function getMainOrdersCustomerReceivedAtEpochMs(order) {
  return Math.max(
    0,
    Math.trunc(
      Number(
        order?.customerReceivedAtEpochMs
          || order?.orderReceivedAtEpochMs
          || order?.receivedAtEpochMs,
      ) || 0,
    ),
  );
}

function getNormalizedMainOrderStatus(order) {
  const sourceStatus = order?.status || order?.stage || "Pending";
  const normalizedStatus = normalizeStatus(sourceStatus);
  const isCancelledOrReturned = [
    "cancel",
    "cancelled",
    "canceled",
    "return",
    "returned",
    "returns",
    "return-request",
    "return-requested",
    "refund",
    "refunded",
  ].includes(normalizedStatus);
  const isCompletedStatus = [
    "delivered",
    "completed",
    "complete",
    "to-review",
    "received",
    "customer-received",
    "fulfilled",
    "done",
  ].includes(normalizedStatus);

  if (!isCancelledOrReturned && (
    isCompletedStatus
    || getMainOrdersCustomerReceivedAtEpochMs(order) > 0
  )) {
    return "completed";
  }

  return sourceStatus;
}

function normalizeOrders(payload) {
  const rawOrders = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.orders)
      ? payload.orders
      : [];

  return rawOrders
    .map((order, index) => ({
      id: order.id || order.orderId || `ORD-${index + 1}`,
      adminId: String(order.adminId || order.ownerAdminId || "").trim(),
      accountId: String(order.customerAccountId || order.accountId || order.customerId || order.userId || "").trim(),
      customerAccountId: String(order.customerAccountId || order.accountId || order.customerId || order.userId || "").trim(),
      customerAvatarToneIndex: Math.trunc(Number(order.customerAvatarToneIndex) || 0),
      productId: String(order.productId || "").trim(),
      productName: String(order.productName || "").trim() || "Ordered item",
      productImageUrl: String(order.productImageUrl || "").trim(),
      variantName: String(order.variantName || "").trim(),
      quantity: Math.max(1, Number(order.quantity || order.items || 0) || 1),
      unitPrice: Number(order.unitPrice || 0) || 0,
      createdAtEpochMs: Math.trunc(Number(order.createdAtEpochMs) || 0),
      stage: String(order.stage || order.status || "").trim(),
      needsWaybill: typeof order.needsWaybill === "boolean" ? order.needsWaybill : undefined,
      waybillPrinted: order.waybillPrinted === true,
      waybillPrintedAtEpochMs: Math.trunc(Number(order.waybillPrintedAtEpochMs) || 0),
      canPrintWaybill: order.canPrintWaybill === true,
      grandTotalAmount: Number(order.grandTotalAmount || order.amount || order.total || order.price || 0) || 0,
      amountToPayAmount: Number(order.amountToPayAmount || 0) || 0,
      remainingBalanceAmount: Number(order.remainingBalanceAmount || 0) || 0,
      shippingFeeAmount: Math.max(0, Number(order.shippingFeeAmount || order.shippingFee || 0) || 0),
      discountAmount: Math.max(0, Number(order.discountAmount || order.discount || 0) || 0),
      customerName:
        order.customerName ||
        order.clientName ||
        order.customer ||
        [order.firstName, order.lastName].filter(Boolean).join(" ") ||
        "Unknown customer",
      contactNumber: String(order.contactNumber || order.clientContactNumber || "").trim(),
      customerEmail: String(order.customerEmail || order.clientEmail || order.email || "").trim(),
      address: String(order.address || order.clientAddress || "").trim(),
      city: order.city || order.address || order.clientAddress || "No location",
      items: Number(order.items || order.quantity || 0) || 1,
      amount:
        Number(order.amount || order.grandTotalAmount || order.total || order.price || 0) || 0,
      courier:
        order.deliveryPartnerName
        || order.deliveryPartner
        || order.deliveryProvider
        || order.courier
        || "Unknown",
      status: getNormalizedMainOrderStatus(order),
      payment: order.payment || order.paymentOptionLabel || order.paymentMethod || "Unspecified",
      paymentOptionLabel: String(order.paymentOptionLabel || "").trim(),
      paymentMethod:
        order.paymentMethod || order.paymentPartnerName || order.payment || order.paymentOptionLabel || "Unspecified",
      paymentPartnerName: String(order.paymentPartnerName || "").trim(),
      paymentPartnerImageUrl: String(order.paymentPartnerImageUrl || "").trim(),
      deliveryPartnerImageUrl: String(order.deliveryPartnerImageUrl || "").trim(),
      customerProfileImageUrl: String(
        order.customerProfileImageUrl || order.profileImageUrl || order.customerImageUrl || "",
      ).trim(),
      receivedAt: getNormalizedInsightOrderReceivedAt(order),
      customerReceivedAtEpochMs: getMainOrdersCustomerReceivedAtEpochMs(order),
      inventoryDeductedAtEpochMs: Math.trunc(Number(order.inventoryDeductedAtEpochMs) || 0),
      shippedAtEpochMs: Math.trunc(Number(order.shippedAtEpochMs || order.inTransitAtEpochMs) || 0),
      deliveredAtEpochMs: Math.trunc(Number(
        order.deliveredAtEpochMs
          || order.completedAtEpochMs
          || order.customerReceivedAtEpochMs
          || order.orderReceivedAtEpochMs,
      ) || 0),
      cancelRequestResolvedAtEpochMs: Math.trunc(Number(order.cancelRequestResolvedAtEpochMs) || 0),
      cancelRequestStatus: String(order.cancelRequestStatus || "").trim(),
      cancelRequestReason: String(order.cancelRequestReason || "").trim(),
      cancelRequestSubmittedAtEpochMs: Math.trunc(Number(order.cancelRequestSubmittedAtEpochMs) || 0),
      employeeName: String(order.employeeName || order.handledBy || order.adminName || "").trim(),
      employeeFirstName: String(order.employeeFirstName || "").trim(),
    }))
    .filter((order) => order.id && order.customerName);
}

function getMainOrdersDataSignature(orders = []) {
  const orderSignatures = (Array.isArray(orders) ? orders : []).map((order) => {
    const stableOrder = {};
    Object.keys(order || {}).sort().forEach((key) => {
      stableOrder[key] = order[key];
    });
    return JSON.stringify(stableOrder);
  });
  orderSignatures.sort();
  return orderSignatures.join("\n");
}

async function loadOrders(options = {}) {
  const preserveOnError = options.preserveOnError === true;
  try {
    const response = await fetch("/api/orders", {
      cache: "no-store",
      headers: withInsightAdminTenantHeaders({ Accept: "application/json" }),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.message || "Unable to load orders.");
    }

    return normalizeOrders(data);
  } catch (error) {
    void error;
  }

  return preserveOnError ? null : [];
}

async function loadDeliveryPartners(options = {}) {
  try {
    const response = await fetch("/api/delivery-partners", {
      cache: "no-store",
      headers: withInsightAdminTenantHeaders({ Accept: "application/json" }),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.message || "Unable to load delivery partners.");
    }

    return Array.isArray(data?.partners) ? data.partners : [];
  } catch (error) {
    void error;
    return options?.preserveOnError === true ? null : [];
  }
}

async function loadInsightChatThreads(options = {}) {
  try {
    const response = await fetch("/api/chat-support", {
      cache: "no-store",
      headers: withInsightAdminTenantHeaders({ Accept: "application/json" }),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.message || "Unable to load conversations.");
    }

    return Array.isArray(data?.threads) ? data.threads : [];
  } catch (error) {
    void error;
    return options?.preserveOnError === true ? null : [];
  } finally {
    hasLoadedInsightChatThreads = true;
  }
}

async function refreshInsightChatThreads() {
  if (!orderConversationEl || !currentInsightOrders.length) {
    return;
  }

  const chatThreads = await loadInsightChatThreads();
  currentInsightChatThreads = chatThreads;

  const selectedOrder = currentInsightOrders.find(
    (order) => getInsightOrderIdentifier(order) === selectedInsightOrderId,
  ) || null;
  renderSelectedInsightConversation(selectedOrder, { preserveScroll: true });
}

if (orderSearchInputEl) {
  if (mainOrdersEmbeddedMode) {
    orderSearchInputEl.placeholder = "Search by customer, order ID, courier, payment...";
  }
  orderSearchInputEl.addEventListener("input", function () {
    window.clearTimeout(orderSearchTimer);
    orderSearchTimer = window.setTimeout(() => {
      orderSearchTerm = String(orderSearchInputEl.value ?? "").trim();
      mainOrdersPage = 1;
      renderInsightContent();
    }, 500);
  });
}

courierDropdownTrigger?.addEventListener("click", function () {
  setCourierDropdownOpen(courierDropdownMenu?.hidden ?? true);
});

mainOrdersFilterTriggerEl?.addEventListener("click", function () {
  setCourierDropdownOpen(courierDropdownMenu?.hidden ?? true);
  courierDropdownTrigger?.focus();
});

mainOrdersWaybillPrintButtonEl?.addEventListener("click", function (event) {
  event.preventDefault();
  void printSelectedMainOrdersWaybills();
});

mainOrdersDetailViewEl?.addEventListener("click", function (event) {
  if (event.target === mainOrdersDetailViewEl) {
    closeMainOrdersDetail();
  }
});

window.addEventListener("message", function (event) {
  if (
    event.origin === window.location.origin
    && event.source === window.parent
    && event.data?.type === "gms-main-orders-detail-modal-close"
  ) {
    closeMainOrdersDetail();
  }
});

window.addEventListener("pagehide", function () {
  notifyMainOrdersDetailModalState(false);
});

document.addEventListener("click", function (event) {
  if (
    courierDropdownEl
    && event.target instanceof Node
    && !courierDropdownEl.contains(event.target)
  ) {
    setCourierDropdownOpen(false);
  }

  if (
    (mainOrdersEmbeddedMode || document.body.classList.contains("main-orders-detail-active"))
    && event.target instanceof Node
  ) {
    document.querySelectorAll(".main-orders-action-menu__popup:not([hidden])").forEach((popup) => {
      if (popup.parentElement?.contains(event.target)) {
        return;
      }
      popup.hidden = true;
      popup.previousElementSibling?.setAttribute("aria-expanded", "false");
    });
    const detailMoreMenu = document.querySelector(".main-orders-detail-more__menu:not([hidden])");
    const detailMoreWrap = detailMoreMenu?.closest(".main-orders-detail-more");
    if (detailMoreMenu && !detailMoreWrap?.contains(event.target)) {
      detailMoreMenu.hidden = true;
      detailMoreWrap?.querySelector("button")?.setAttribute("aria-expanded", "false");
    }
  }
});

document.addEventListener("keydown", function (event) {
  if (event.key === "Escape" && activeInsightProductPhotoModalEl) {
    closeInsightOrderProductPhotoModal();
    return;
  }

  if (event.key === "Escape" && activeInsightProfileModalEl) {
    closeInsightOrderProfileModal();
    return;
  }

  if (event.key === "Escape" && document.body.classList.contains("main-orders-detail-active")) {
    closeMainOrdersDetail();
    return;
  }

  if (event.key === "Escape" && courierDropdownMenu && !courierDropdownMenu.hidden) {
    setCourierDropdownOpen(false);
    courierDropdownTrigger?.focus();
  }
});

insightSideViewButtons.forEach((button) => {
  button.addEventListener("click", function () {
    setActiveInsightSideView(button.dataset.insightSideView || "orders");
  });
});

orderListEl?.addEventListener("click", function (event) {
  if (!(event.target instanceof Element)) {
    return;
  }

  const card = event.target.closest(".insight-order-card[data-insight-order-id]");
  if (!card || !orderListEl.contains(card)) {
    return;
  }

  if (event.target.closest("button, input, label, a, [role='menuitem']")) {
    return;
  }

  if (mainOrdersEmbeddedMode && mainOrdersWaybillSelection.size > 0) {
    event.preventDefault();
    toggleMainOrdersRowWaybillSelection(card);
    return;
  }

  const orderIdentifier = String(card.dataset.insightOrderId ?? "").trim();
  openMainOrdersDetail(orderIdentifier);
});

orderListEl?.addEventListener("keydown", function (event) {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }

  const card = target.closest(".insight-order-card[data-insight-order-id]");
  if (!card || !orderListEl.contains(card)) {
    return;
  }

  if (target.closest("button, input, label, a, [role='menuitem']")) {
    return;
  }

  event.preventDefault();
  if (mainOrdersEmbeddedMode && mainOrdersWaybillSelection.size > 0) {
    toggleMainOrdersRowWaybillSelection(card);
    return;
  }
  const orderIdentifier = String(card.dataset.insightOrderId ?? "").trim();
  openMainOrdersDetail(orderIdentifier);
});

mainOrdersSelectAllEl?.addEventListener("change", function (event) {
  event.stopPropagation();
  const visibleGroupIds = getVisibleMainOrdersWaybillGroupIds();
  visibleGroupIds.forEach((groupId) => {
    if (mainOrdersSelectAllEl.checked) {
      mainOrdersWaybillSelection.add(groupId);
    } else {
      mainOrdersWaybillSelection.delete(groupId);
    }
  });
  syncMainOrdersWaybillPrintButton();
  syncMainOrdersWaybillSelectionRows();
});

function renderInsightContent() {
  renderMainOrdersSummary(currentInsightOrders);
  const filteredOrders = getFilteredOrders(currentInsightOrders)
    .filter((order) => matchesInsightOrderSearch(order));
  if (
    selectedInsightOrderId
    && !filteredOrders.some(
      (order) => getInsightOrderIdentifier(order) === selectedInsightOrderId,
    )
  ) {
    selectedInsightOrderId = "";
  }
  renderOrders(filteredOrders);
  renderCourierBreakdown(filteredOrders);
  if (mainOrdersDetailOrderId) {
    const detailOrder = currentInsightOrders.find(
      (order) => getInsightOrderIdentifier(order) === mainOrdersDetailOrderId,
    );
    if (detailOrder) {
      renderMainOrdersDetail(detailOrder);
    } else {
      closeMainOrdersDetail();
    }
  }
}

async function renderInsightPage(options = {}) {
  const quiet = options?.quiet === true;
  const [orders, deliveryPartners, chatThreads] = await Promise.all([
    loadOrders({ preserveOnError: quiet }),
    loadDeliveryPartners({ preserveOnError: quiet }),
    orderConversationEl && !mainOrdersEmbeddedMode
      ? loadInsightChatThreads({ preserveOnError: quiet })
      : Promise.resolve([]),
  ]);
  if (!Array.isArray(orders)) {
    return false;
  }
  currentInsightOrders = orders;
  mainOrdersDataSignature = getMainOrdersDataSignature(orders);
  if (Array.isArray(chatThreads)) {
    currentInsightChatThreads = chatThreads;
  }
  if (!orderConversationEl || mainOrdersEmbeddedMode) {
    hasLoadedInsightChatThreads = true;
  }
  if (Array.isArray(deliveryPartners)) {
    currentInsightDeliveryPartners = deliveryPartners;
    currentInsightCourierOptions = buildCourierFilterOptions(orders, deliveryPartners);
    currentInsightCourierMediaMap = new Map(
      deliveryPartners
        .map((partner) => [
          normalizeCourierFilterValue(partner?.branch || partner?.name || partner?.deliveryPartnerName),
          String(partner?.imageUrl || "").trim(),
        ])
        .filter(([value, imageUrl]) => value && imageUrl),
    );
  }

  if (!currentInsightCourierOptions.some((option) => option.value === activeCourierFilter)) {
    activeCourierFilter = "all";
  }

  renderCourierTabs();
  renderCourierSelectOptions();
  notifyMainOrdersHeaderFilterOptions();
  setActiveInsightSideView(activeInsightSideView);
  pruneMainOrdersWaybillSelection(orders);
  renderInsightContent();
  return true;
}

async function refreshMainOrders() {
  if (!mainOrdersEmbeddedMode || mainOrdersRefreshInFlight || document.hidden) {
    return;
  }
  mainOrdersRefreshInFlight = true;
  try {
    const refreshedOrders = await loadOrders({ preserveOnError: true });
    if (!Array.isArray(refreshedOrders)) {
      return;
    }
    const refreshedSignature = getMainOrdersDataSignature(refreshedOrders);
    if (refreshedSignature === mainOrdersDataSignature) {
      return;
    }
    currentInsightOrders = refreshedOrders;
    mainOrdersDataSignature = refreshedSignature;
    renderCourierTabs();
    renderInsightContent();
  } finally {
    mainOrdersRefreshInFlight = false;
  }
}

async function flushInsightRealtimeRefresh() {
  if (insightRealtimeRefreshInFlight) {
    insightRealtimeRefreshQueued = true;
    return;
  }

  const topics = new Set(pendingInsightRealtimeTopics);
  pendingInsightRealtimeTopics.clear();
  if (!topics.size) {
    return;
  }

  insightRealtimeRefreshInFlight = true;
  try {
    const needsFullRefresh = topics.has("all")
      || topics.has("delivery-partners")
      || topics.has("accounts")
      || topics.has("buyers");
    if (needsFullRefresh || (topics.has("orders") && !mainOrdersEmbeddedMode)) {
      await renderInsightPage({ quiet: true });
      return;
    }

    if (topics.has("orders")) {
      await refreshMainOrders();
    }
    if (topics.has("chat")) {
      await refreshInsightChatThreads();
    }
  } finally {
    insightRealtimeRefreshInFlight = false;
    if (insightRealtimeRefreshQueued || pendingInsightRealtimeTopics.size) {
      insightRealtimeRefreshQueued = false;
      scheduleInsightRealtimeRefresh();
    }
  }
}

function scheduleInsightRealtimeRefresh(topics = []) {
  (Array.isArray(topics) ? topics : []).forEach((topic) => {
    const normalizedTopic = String(topic || "").trim().toLowerCase();
    if (normalizedTopic) {
      pendingInsightRealtimeTopics.add(normalizedTopic);
    }
  });
  if (!pendingInsightRealtimeTopics.size) {
    return;
  }

  window.clearTimeout(insightRealtimeRefreshTimer);
  insightRealtimeRefreshTimer = window.setTimeout(() => {
    insightRealtimeRefreshTimer = 0;
    void flushInsightRealtimeRefresh();
  }, 200);
}

function handleInsightRealtimeChange(event) {
  const detail = event?.detail;
  const isReconnect = detail?.type === "ready" && detail?.reconnected === true;
  if (detail?.type !== "data-change" && !isReconnect) {
    return;
  }

  const topics = (Array.isArray(detail?.topics) ? detail.topics : [])
    .map((topic) => String(topic || "").trim().toLowerCase())
    .filter(Boolean);
  if (isReconnect) {
    scheduleInsightRealtimeRefresh(["all"]);
    return;
  }
  if (!topics.some((topic) => insightRealtimeTopics.has(topic))) {
    return;
  }
  scheduleInsightRealtimeRefresh(topics);
}

renderInsightPage();
if (mainOrdersEmbeddedMode) {
  syncMainOrdersWaybillPrintButton();
  window.addEventListener("message", (event) => {
    if (event.origin !== window.location.origin) {
      return;
    }
    if (event.data?.type === "gms-main-orders-waybill-preview-request") {
      void previewSelectedMainOrdersWaybills();
      return;
    }
    if (event.data?.type === "gms-main-orders-waybill-print-confirm") {
      void confirmSelectedMainOrdersWaybillPrint(event.data?.createdAtEpochMsList || []);
      return;
    }
  });
}
if (orderConversationEl && !mainOrdersEmbeddedMode) {
  window.setInterval(refreshInsightChatThreads, INSIGHT_CHAT_REFRESH_INTERVAL_MS);
}
window.addEventListener("gms:realtime-change", handleInsightRealtimeChange);
window.addEventListener("resize", () => {
  window.requestAnimationFrame(syncInsightColumnHeights);
  requestOrderInsightScrollProxyUpdate();
});
