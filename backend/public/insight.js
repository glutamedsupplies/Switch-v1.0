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
let activeCourierFilter = "all";
let activeStatusFilter = "all";
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
let currentInsightCourierOptions = [{ value: "all", label: "All" }];
let currentInsightCourierMediaMap = new Map();
let lastInsightConversationRenderSignature = "";
let orderInsightScrollProxyEl = null;
let orderInsightScrollProxySpacerEl = null;
let isSyncingOrderInsightScrollProxy = false;
let orderInsightScrollProxyFrame = 0;
let orderInsightSpacerStateFrame = 0;
const INSIGHT_CHAT_REFRESH_INTERVAL_MS = 1000;
const INSIGHT_CHAT_TYPING_ACTIVE_WINDOW_MS = 5000;
const INSIGHT_CHAT_ONLINE_ACTIVE_WINDOW_MS = 45000;

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

function normalizeInsightStatusFilterValue(value) {
  const normalizedValue = String(value ?? "").trim().toLowerCase();
  return INSIGHT_STATUS_FILTER_OPTIONS.some((option) => option.value === normalizedValue)
    ? normalizedValue
    : "all";
}

function getActiveStatusFilterLabel() {
  return (
    INSIGHT_STATUS_FILTER_OPTIONS.find((option) => option.value === activeStatusFilter)?.label
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

function getInsightOrderStatusLabel(status) {
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
  const options = [{ value: "all", label: "All" }];
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

  INSIGHT_STATUS_FILTER_OPTIONS.forEach((option) => {
    const button = document.createElement("button");
    const isActive = option.value === activeStatusFilter;
    button.type = "button";
    button.className = `product-form-section-carousel__button${isActive ? " is-active" : ""}`;
    button.dataset.insightStatusFilter = option.value;
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
    button.textContent = option.label;
    button.addEventListener("click", function () {
      if (activeStatusFilter === option.value) {
        return;
      }

      activeStatusFilter = option.value;
      renderCourierTabs();
      renderInsightContent();
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

function getFilteredOrders(orders = currentInsightOrders) {
  return (Array.isArray(orders) ? orders : []).filter((order) => {
    const matchesCourier = activeCourierFilter === "all"
      || normalizeCourierFilterValue(order?.courier) === activeCourierFilter;
    const matchesStatus = activeStatusFilter === "all"
      || resolveInsightOrderStatusFilter(order?.status) === activeStatusFilter;
    return matchesCourier && matchesStatus;
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
const INSIGHT_ORDER_ROUTE_ORIGIN_LABEL = "GMS Packing Hub";

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
  iframe.height = "260";
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
  return String(
    order?.productImageUrl
    || order?.mainImageUrl
    || order?.imageUrl
    || "",
  ).trim();
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

function createInsightOrderProfileAvatar(order, className) {
  const avatar = document.createElement("div");
  avatar.className = className;

  const imageUrl = String(
    order?.customerProfileImageUrl
    || order?.profileImageUrl
    || order?.customerImageUrl
    || "",
  ).trim();

  if (imageUrl) {
    const image = document.createElement("img");
    image.src = imageUrl;
    image.alt = getInsightOrderCustomerName(order);
    image.loading = "lazy";
    image.addEventListener("error", function () {
      image.remove();
      avatar.textContent = getInsightOrderCustomerInitials(order);
    }, { once: true });
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
  return `/live_chat.html${query ? `?${query}` : ""}`;
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
    deleted.innerHTML = '<i class="fa-regular fa-trash-can" aria-hidden="true"></i>';
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

function renderOrders(orders) {
  if (!orderListEl) {
    return;
  }

  orderListEl.replaceChildren();

  if (!orders.length) {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";
    emptyState.textContent = orderSearchTerm
      ? "No matching orders found."
      : activeStatusFilter !== "all"
        ? `No orders in ${getActiveStatusFilterLabel()} yet.`
        : activeCourierFilter !== "all"
          ? `No incoming orders for ${getActiveCourierFilterLabel()} yet.`
          : "No incoming orders yet.";
    orderListEl.appendChild(emptyState);
    requestOrderInsightScrollProxyUpdate();
    return;
  }

  const sortedOrders = [...orders].sort(
    (left, right) => new Date(right.receivedAt).getTime() - new Date(left.receivedAt).getTime()
  );

  for (const order of sortedOrders) {
    const orderIdentifier = getInsightOrderIdentifier(order);
    orderListEl.appendChild(
      createInsightOrderCard(order, {
        interactive: Boolean(orderIdentifier),
        selected: orderIdentifier === selectedInsightOrderId,
        orderIdentifier,
      }),
    );
  }

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
    createInsightOrderMapEmbed(order),
  );
  window.requestAnimationFrame(syncInsightColumnHeights);
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
      productId: String(order.productId || "").trim(),
      productName: String(order.productName || "").trim() || "Ordered item",
      productImageUrl: String(order.productImageUrl || "").trim(),
      variantName: String(order.variantName || "").trim(),
      quantity: Math.max(1, Number(order.quantity || order.items || 0) || 1),
      unitPrice: Number(order.unitPrice || 0) || 0,
      createdAtEpochMs: Math.trunc(Number(order.createdAtEpochMs) || 0),
      grandTotalAmount: Number(order.grandTotalAmount || order.amount || order.total || order.price || 0) || 0,
      amountToPayAmount: Number(order.amountToPayAmount || 0) || 0,
      remainingBalanceAmount: Number(order.remainingBalanceAmount || 0) || 0,
      customerName:
        order.customerName ||
        order.clientName ||
        order.customer ||
        [order.firstName, order.lastName].filter(Boolean).join(" ") ||
        "Unknown customer",
      contactNumber: String(order.contactNumber || order.clientContactNumber || "").trim(),
      address: String(order.address || order.clientAddress || "").trim(),
      city: order.city || order.address || order.clientAddress || "No location",
      items: Number(order.items || order.quantity || 0) || 1,
      amount:
        Number(order.amount || order.grandTotalAmount || order.total || order.price || 0) || 0,
      courier: order.courier || order.deliveryProvider || "Unknown",
      status: order.status || order.stage || "Pending",
      payment: order.payment || order.paymentOptionLabel || order.paymentMethod || "Unspecified",
      paymentOptionLabel: String(order.paymentOptionLabel || "").trim(),
      paymentMethod:
        order.paymentMethod || order.paymentPartnerName || order.payment || order.paymentOptionLabel || "Unspecified",
      paymentPartnerName: String(order.paymentPartnerName || "").trim(),
      customerProfileImageUrl: String(
        order.customerProfileImageUrl || order.profileImageUrl || order.customerImageUrl || "",
      ).trim(),
      receivedAt: order.receivedAt || order.createdAt || new Date().toISOString(),
      employeeName: String(order.employeeName || order.handledBy || order.adminName || "").trim(),
      employeeFirstName: String(order.employeeFirstName || "").trim(),
    }))
    .filter((order) => order.id && order.customerName);
}

async function loadOrders() {
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

  return [];
}

async function loadDeliveryPartners() {
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
    return [];
  }
}

async function loadInsightChatThreads() {
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
    return [];
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
  orderSearchInputEl.addEventListener("input", function () {
    window.clearTimeout(orderSearchTimer);
    orderSearchTimer = window.setTimeout(() => {
      orderSearchTerm = String(orderSearchInputEl.value ?? "").trim();
      renderInsightContent();
    }, 500);
  });
}

courierDropdownTrigger?.addEventListener("click", function () {
  setCourierDropdownOpen(courierDropdownMenu?.hidden ?? true);
});

document.addEventListener("click", function (event) {
  if (
    courierDropdownEl
    && event.target instanceof Node
    && !courierDropdownEl.contains(event.target)
  ) {
    setCourierDropdownOpen(false);
  }
});

document.addEventListener("keydown", function (event) {
  if (event.key === "Escape" && courierDropdownMenu && !courierDropdownMenu.hidden) {
    setCourierDropdownOpen(false);
    courierDropdownTrigger?.focus();
    return;
  }

  if (event.key === "Escape" && activeInsightProductPhotoModalEl) {
    closeInsightOrderProductPhotoModal();
    return;
  }

  if (event.key === "Escape" && activeInsightProfileModalEl) {
    closeInsightOrderProfileModal();
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

  selectedInsightOrderId = String(card.dataset.insightOrderId ?? "").trim();
  renderInsightContent();
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

  event.preventDefault();
  selectedInsightOrderId = String(card.dataset.insightOrderId ?? "").trim();
  renderInsightContent();
});

orderDetailEl?.addEventListener("click", function (event) {
  if (!(event.target instanceof Element)) {
    return;
  }

  const trigger = event.target.closest("[data-insight-order-profile-trigger]");
  if (!trigger || !orderDetailEl.contains(trigger) || !currentInsightDetailOrder) {
    return;
  }

  openInsightOrderProfileModal(currentInsightDetailOrder);
});

function renderInsightContent() {
  const filteredOrders = getFilteredOrders(currentInsightOrders)
    .filter((order) => matchesInsightOrderSearch(order));
  const selectedOrder = syncSelectedInsightOrder(filteredOrders);
  renderOrders(filteredOrders);
  renderCourierBreakdown(filteredOrders);
  renderSelectedInsightOrder(selectedOrder);
  renderSelectedInsightTracking(selectedOrder);
  if (orderConversationEl) {
    renderSelectedInsightConversation(selectedOrder);
  }
}

async function renderInsightPage() {
  const [orders, deliveryPartners, chatThreads] = await Promise.all([
    loadOrders(),
    loadDeliveryPartners(),
    orderConversationEl ? loadInsightChatThreads() : Promise.resolve([]),
  ]);
  currentInsightOrders = orders;
  currentInsightChatThreads = chatThreads;
  if (!orderConversationEl) {
    hasLoadedInsightChatThreads = true;
  }
  currentInsightCourierOptions = buildCourierFilterOptions(orders, deliveryPartners);
  currentInsightCourierMediaMap = new Map(
    (Array.isArray(deliveryPartners) ? deliveryPartners : [])
      .map((partner) => [
        normalizeCourierFilterValue(partner?.branch || partner?.name || partner?.deliveryPartnerName),
        String(partner?.imageUrl || "").trim(),
      ])
      .filter(([value, imageUrl]) => value && imageUrl),
  );

  if (!currentInsightCourierOptions.some((option) => option.value === activeCourierFilter)) {
    activeCourierFilter = "all";
  }

  renderCourierTabs();
  renderCourierSelectOptions();
  setActiveInsightSideView(activeInsightSideView);
  renderInsightContent();
}

renderInsightPage();
if (orderConversationEl) {
  window.setInterval(refreshInsightChatThreads, INSIGHT_CHAT_REFRESH_INTERVAL_MS);
}
window.addEventListener("resize", () => {
  window.requestAnimationFrame(syncInsightColumnHeights);
  requestOrderInsightScrollProxyUpdate();
});
