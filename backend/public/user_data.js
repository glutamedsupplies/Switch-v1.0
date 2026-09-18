const buyerAccountSubNavStorageKey = "gms-super-admin-user-data-account-filter";
const buyerNewRegistrationWindowMs = 24 * 60 * 60 * 1000;
const buyerNewRegistrationRefreshIntervalMs = 60 * 1000;
let lastBuyerNewRegistrationCount = -1;

function getSavedBuyerAccountSubNav() {
  try {
    const value = String(window.localStorage.getItem(buyerAccountSubNavStorageKey) || "").trim().toLowerCase();
    return ["all", "new", "low-risk", "restricted", "banned"].includes(value) ? value : "all";
  } catch (error) {
    return "all";
  }
}

function saveBuyerAccountSubNav(value) {
  try {
    const normalizedValue = normalizeBuyerStatusSubNavValue(value);
    window.localStorage.setItem(buyerAccountSubNavStorageKey, normalizedValue);
  } catch (error) {
    // The current User Data sub-button remains selected without storage.
  }
}

const initialBuyerAccountSubNav = getSavedBuyerAccountSubNav();

const buyerElements = {
  list: document.getElementById("user-account-list"),
  search: document.querySelector("[data-user-data-search]"),
  statusFilter: document.querySelector("[data-buyer-status-filter]"),
  verificationFilter: document.querySelector("[data-buyer-verification-filter]"),
  dateFilter: document.querySelector("[data-buyer-date-filter]"),
  sort: document.querySelector("[data-user-data-sort]"),
  filterToggle: document.querySelector("[data-buyer-filter-toggle]"),
  filterPanel: document.querySelector("[data-buyer-filter-panel]"),
  filterSummary: document.querySelector("[data-buyer-filter-summary]"),
  filterControls: Array.from(document.querySelectorAll("[data-buyer-filter]")),
  sortControls: Array.from(document.querySelectorAll("[data-buyer-sort]")),
  statusSubNavItems: Array.from(document.querySelectorAll("[data-buyer-account-filter]")),
  navBadge: document.querySelector("[data-super-admin-user-data-new-count]"),
  newFilterNavItem: document.querySelector('[data-buyer-account-filter="new"]'),
  filterClear: document.querySelector("[data-buyer-filter-clear]"),
  resetFilters: document.querySelector("[data-buyer-reset-filters]"),
  stats: {
    totalLabel: document.querySelector('[data-buyer-stat="total-label"]'),
    total: document.querySelector('[data-buyer-stat="total"]'),
    active: document.querySelector('[data-buyer-stat="active"]'),
    activePercent: document.querySelector('[data-buyer-stat="active-percent"]'),
    online: document.querySelector('[data-buyer-stat="online"]'),
    banned: document.querySelector('[data-buyer-stat="banned"]'),
    bannedPercent: document.querySelector('[data-buyer-stat="banned-percent"]'),
    limited: document.querySelector('[data-buyer-stat="limited"]'),
    limitedPercent: document.querySelector('[data-buyer-stat="limited-percent"]'),
    new: document.querySelector('[data-buyer-stat="new"]'),
  },
  pageMeta: document.querySelector("[data-buyer-page-meta]"),
  pagination: document.querySelector("[data-buyer-pagination]"),
  pageLabel: document.querySelector("[data-buyer-page-label]"),
  pagePrev: document.querySelector("[data-buyer-page-prev]"),
  pageNext: document.querySelector("[data-buyer-page-next]"),
  pageSize: document.querySelector("[data-buyer-page-size]"),
  drawer: document.querySelector("[data-buyer-drawer]"),
  drawerBackdrop: document.querySelector("[data-buyer-drawer-backdrop]"),
  drawerClose: document.querySelector("[data-buyer-drawer-close]"),
  drawerIdentity: document.querySelector("[data-buyer-drawer-identity]"),
  drawerContent: document.querySelector("[data-buyer-drawer-content]"),
  drawerTabs: Array.from(document.querySelectorAll("[data-buyer-tab]")),
  actionModal: document.querySelector("[data-buyer-action-modal]"),
  actionDialog: document.querySelector("[data-buyer-action-dialog]"),
  actionForm: document.querySelector("[data-buyer-action-form]"),
  actionId: document.querySelector("[data-buyer-action-id]"),
  actionType: document.querySelector("[data-buyer-action-type]"),
  actionTitle: document.querySelector("[data-buyer-action-title]"),
  actionCopy: document.querySelector("[data-buyer-action-copy]"),
  actionIcon: document.querySelector("[data-buyer-action-icon]"),
  actionReasonTextField: document.querySelector("[data-buyer-action-reason-text-field]"),
  actionReasonTextLabel: document.querySelector("[data-buyer-action-reason-text-label]"),
  actionReasonText: document.querySelector("[data-buyer-action-reason-text]"),
  actionReasonField: document.querySelector("[data-buyer-action-reason-field]"),
  actionReasonFieldLabel: document.querySelector("[data-buyer-action-reason-field-label]"),
  actionReasonDropdown: document.querySelector("[data-buyer-action-reason-dropdown]"),
  actionReason: document.querySelector("[data-buyer-action-reason]"),
  actionReasonTrigger: document.querySelector("[data-buyer-action-reason-trigger]"),
  actionReasonLabel: document.querySelector("[data-buyer-action-reason-label]"),
  actionReasonMenu: document.querySelector("[data-buyer-action-reason-menu]"),
  actionReasonOptions: Array.from(document.querySelectorAll("[data-buyer-action-reason-option]")),
  actionDurationRow: document.querySelector("[data-buyer-action-duration-row]"),
  actionDuration: document.querySelector("[data-buyer-action-duration]"),
  actionDurationUnit: document.querySelector("[data-buyer-action-duration-unit]"),
  actionDurationUnitDropdown: document.querySelector("[data-buyer-action-duration-unit-dropdown]"),
  actionDurationUnitTrigger: document.querySelector("[data-buyer-action-duration-unit-trigger]"),
  actionDurationUnitLabel: document.querySelector("[data-buyer-action-duration-unit-label]"),
  actionDurationUnitMenu: document.querySelector("[data-buyer-action-duration-unit-menu]"),
  actionDurationUnitOptions: Array.from(document.querySelectorAll("[data-buyer-action-duration-unit-option]")),
  actionNote: document.querySelector("[data-buyer-action-note]"),
  actionDescriptionLabel: document.querySelector("[data-buyer-action-description-label]"),
  actionSummarizeAiButton: document.querySelector("[data-buyer-action-summarize-ai]"),
  actionSummarizeAiLabel: document.querySelector("[data-buyer-action-summarize-ai-label]"),
  actionFeedback: document.querySelector("[data-buyer-action-feedback]"),
  actionSubmit: document.querySelector("[data-buyer-action-submit]"),
  actionNotificationField: document.querySelector("[data-buyer-action-notification-field]"),
  actionNotificationDropdown: document.querySelector("[data-buyer-action-notification-dropdown]"),
  actionNotificationType: document.querySelector("[data-buyer-action-notification-type]"),
  actionNotificationTrigger: document.querySelector("[data-buyer-action-notification-trigger]"),
  actionNotificationLabel: document.querySelector("[data-buyer-action-notification-label]"),
  actionNotificationMenu: document.querySelector("[data-buyer-action-notification-menu]"),
  actionNotificationOptions: Array.from(document.querySelectorAll("[data-buyer-action-notification-option]")),
  actionClose: document.querySelector("[data-buyer-action-close]"),
  actionCancel: document.querySelector("[data-buyer-action-cancel]"),
};

const buyerState = {
  buyers: [],
  orders: [],
  filteredBuyers: [],
  page: 1,
  pageSize: 10,
  searchTerm: "",
  searchLoading: false,
  status: initialBuyerAccountSubNav === "low-risk" ? "active" : initialBuyerAccountSubNav,
  verification: "all",
  activity: "all",
  dateJoined: "all",
  sort: ["newest"],
  activeBuyerId: "",
  activeTab: "overview",
  activeMenu: null,
  isSubmittingAction: false,
  isSummarizingAction: false,
};

const buyerActivityLogCache = new Map();
const buyerActivityLogLoading = new Set();
const buyerActivityLogErrors = new Map();
let activeBuyerActivityModal = null;
let activeBuyerActivityModalTrigger = null;
let buyerLoadRequestSequence = 0;
let buyerRealtimeRefreshTimer = 0;
let buyerRealtimeRefreshInFlight = false;
let buyerRealtimeRefreshQueued = false;
let buyerRealtimeRefreshDirty = false;
let buyerActionAiAbortController = null;
const buyerRealtimeRefreshDebounceMs = 180;

const buyerActionConfig = {
  notify: {
    title: "Notify User",
    copy: "Send a system notification to this user.",
    icon: '<path d="M11 6a13 13 0 0 0 8.4-2.8A1 1 0 0 1 21 4v12a1 1 0 0 1-1.6.8A13 13 0 0 0 11 14H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"></path><path d="M6 14a12 12 0 0 0 2.4 7.2 2 2 0 0 0 3.2-2.4A8 8 0 0 1 10 14"></path><path d="M8 6v8"></path>',
    button: "Send Notification",
    showDuration: false,
    showNotificationType: true,
    reasonPlaceholder: "Short message or concern",
  },
  restrict: {
    title: "Restrict User",
    copy: "Limit selected user features for a temporary period.",
    icon: '<path d="M2 21a8 8 0 0 1 10.434-7.62"></path><circle cx="10" cy="8" r="5"></circle><circle cx="18" cy="18" r="4.5"></circle><line x1="18" x2="18" y1="16.1" y2="17.7"></line><line x1="18" x2="18.01" y1="19.9" y2="19.9"></line>',
    button: "Restrict User",
    showDuration: true,
    showReasonDropdown: true,
    reasonLabel: "Reason for Restriction",
    reasonPrompt: "Select Restriction Reason",
    danger: false,
  },
  ban: {
    title: "Ban User",
    copy: "Permanently block this user account.",
    icon: '<path d="M2 21a8 8 0 0 1 10.434-7.62"></path><circle cx="10" cy="8" r="5"></circle><circle cx="18" cy="18" r="4"></circle><path d="M15.5 15.5 20.5 20.5"></path>',
    button: "Ban User",
    showDuration: true,
    showReasonDropdown: true,
    reasonLabel: "Reason for Ban",
    reasonPrompt: "Select Ban Reason",
    danger: true,
    durationUnit: "permanent",
  },
  activate: {
    title: "Restore Active Status",
    copy: "Return this user to normal account access.",
    icon: "fa-solid fa-circle-check",
    button: "Set Active",
    showDuration: false,
  },
  "require-password-reset": {
    title: "Require Password Reset",
    copy: "Force the user to reset their password on the next login.",
    icon: "fa-solid fa-key",
    button: "Require Password Reset",
    showDuration: false,
  },
  "logout-devices": {
    title: "Log Out All Devices",
    copy: "Invalidate current user sessions and mark the account offline.",
    icon: "fa-solid fa-right-from-bracket",
    button: "Log Out Devices",
    showDuration: false,
  },
  lock: {
    title: "Lock Suspicious Account",
    copy: "Lock this account while suspicious activity is reviewed.",
    icon: "fa-solid fa-lock",
    button: "Lock Account",
    showDuration: false,
    danger: true,
  },
};

const buyerActionSuccessTitles = Object.freeze({
  notify: "User Notified",
  restrict: "User Restricted",
  suspend: "User Suspended",
  ban: "User Banned",
  activate: "User Reactivated",
  "require-verification": "Verification Required",
  "require-contact-verification": "Verification Required",
  "require-password-reset": "Password Reset Required",
  "logout-devices": "Devices Logged Out",
  lock: "User Locked",
});

const buyerFilterDefaults = Object.freeze({
  status: "all",
  verification: "all",
  activity: "all",
  dateJoined: "all",
  sort: "newest",
});

const buyerFilterOptions = Object.freeze({
  status: new Set(["all", "new", "active", "restricted", "banned", "deleted"]),
  verification: new Set([
    "all",
    "verified",
    "unverified",
    "pending",
    "rejected",
    "email-verified",
    "phone-verified",
    "identity-verified",
  ]),
  activity: new Set(["all", "online-today", "has-orders", "has-bookings", "no-history"]),
  dateJoined: new Set(["all", "30", "90", "365"]),
});

const buyerSortOptions = new Set(["newest", "oldest", "last-active", "orders", "order-count", "bookings", "a-z"]);

const buyerFilterLabels = Object.freeze({
  status: {
    all: "All status",
    new: "New registrations",
    active: "Active",
    restricted: "Restricted",
    banned: "Banned",
    deleted: "Deleted",
  },
  verification: {
    all: "All verification",
    verified: "Verified",
    unverified: "Unverified",
    pending: "Pending",
    rejected: "Rejected",
    "email-verified": "Email verified",
    "phone-verified": "Phone verified",
    "identity-verified": "Identity verified",
  },
  activity: {
    all: "All activity",
    "online-today": "Online today",
    "has-orders": "Has orders",
    "has-bookings": "Has bookings",
    "no-history": "No orders/bookings",
  },
  dateJoined: {
    all: "All time",
    30: "Last 30 days",
    90: "Last 90 days",
    365: "Last 12 months",
  },
});

const buyerSortLabels = Object.freeze({
  newest: "Newest",
  oldest: "Oldest",
  "last-active": "Last active",
  orders: "Orders / bookings",
  "order-count": "Most orders",
  bookings: "Most bookings",
  "a-z": "Buyer name A-Z",
});

const buyerStatusSubNavMap = Object.freeze({
  all: "all",
  new: "new",
  "low-risk": "active",
  restricted: "restricted",
  banned: "banned",
});

const buyerListTableColumns =
  "minmax(0, 1.2fr) minmax(0, 0.55fr) minmax(118px, 0.62fr) minmax(0, 0.62fr) minmax(0, 0.7fr) minmax(0, 0.55fr) minmax(96px, 0.52fr) minmax(204px, 0.88fr)";

const buyerListIconPaths = Object.freeze({
  verified: '<circle cx="12" cy="12" r="8"></circle><path d="m8.5 12 2.2 2.2 4.8-5"></path>',
  warning: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path>',
  ellipsis: '<circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="19" r="1"></circle>',
  eye: '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"></path><circle cx="12" cy="12" r="3"></circle>',
  eyeOff: '<path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"></path><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"></path><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-4.86"></path><path d="m2 2 20 20"></path>',
  key: '<path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z"></path><circle cx="16.5" cy="7.5" r=".5" fill="currentColor"></circle>',
  copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>',
});

const buyerListActionIconPaths = Object.freeze({
  "view-profile": '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"></path><circle cx="12" cy="12" r="3"></circle>',
  orders: '<path d="M8 2v4"></path><path d="M16 2v4"></path><rect x="3" y="4" width="18" height="18" rx="2"></rect><path d="M8 11h8"></path><path d="M8 15h5"></path>',
  bookings: '<path d="M8 2v4"></path><path d="M16 2v4"></path><rect x="3" y="4" width="18" height="18" rx="2"></rect><path d="m9 14 2 2 4-5"></path>',
  notify: '<path d="M11 6a13 13 0 0 0 8.4-2.8A1 1 0 0 1 21 4v12a1 1 0 0 1-1.6.8A13 13 0 0 0 11 14H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"></path><path d="M6 14a12 12 0 0 0 2.4 7.2 2 2 0 0 0 3.2-2.4A8 8 0 0 1 10 14"></path><path d="M8 6v8"></path>',
  restrict: '<path d="M2 21a8 8 0 0 1 10.434-7.62"></path><circle cx="10" cy="8" r="5"></circle><circle cx="18" cy="18" r="4.5"></circle><line x1="18" x2="18" y1="16.1" y2="17.7"></line><line x1="18" x2="18.01" y1="19.9" y2="19.9"></line>',
  ban: '<path d="M2 21a8 8 0 0 1 10.434-7.62"></path><circle cx="10" cy="8" r="5"></circle><circle cx="18" cy="18" r="4"></circle><path d="M15.5 15.5 20.5 20.5"></path>',
  activity: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path><path d="M12 7v5l4 2"></path>',
});

const buyerActivityActionIconPaths = Object.freeze({
  addList: '<path d="M8 6h8"></path><path d="M8 10h8"></path><path d="M8 14h5"></path><path d="M5 6h.01"></path><path d="M5 10h.01"></path><path d="M5 14h.01"></path><path d="M16 19h6"></path><path d="M19 16v6"></path>',
  editList: '<path d="M8 6h8"></path><path d="M8 10h7"></path><path d="M8 14h4"></path><path d="M5 6h.01"></path><path d="M5 10h.01"></path><path d="M5 14h.01"></path><path d="m14 20 5.5-5.5a1.5 1.5 0 0 0-2-2L12 18v2h2Z"></path><path d="m17 13 2 2"></path>',
  trash: '<path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><path d="m19 6-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path>',
});

const buyerActivityActionIconConfigs = Object.freeze({
  add: { lucide: "ListPlus", tabler: "playlist-add", fallback: buyerActivityActionIconPaths.addList },
  edit: { lucide: "SquarePen", tabler: "file-pencil", fallback: buyerActivityActionIconPaths.editList },
  delete: { lucide: "Trash2", tabler: "trash", fallback: buyerActivityActionIconPaths.trash },
});

const buyerDrawerIconPaths = Object.freeze({
  user: buyerListActionIconPaths["view-profile"],
  orders: buyerListActionIconPaths.orders,
  bookings: buyerListActionIconPaths.bookings,
  reports: buyerListIconPaths.warning,
  activity: buyerListActionIconPaths.activity,
  status: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path><path d="m9 12 2 2 4-4"></path>',
  verification: buyerListIconPaths.verified,
  restriction: buyerListActionIconPaths.restrict,
});

function escapeCssValue(value) {
  const text = String(value ?? "");
  if (window.CSS && typeof window.CSS.escape === "function") {
    return window.CSS.escape(text);
  }
  return text.replace(/["\\]/g, "\\$&");
}

function readSuperAdminSession() {
  try {
    const rawSession = window.sessionStorage.getItem("gms-super-admin-session");
    return rawSession ? JSON.parse(rawSession) : null;
  } catch (error) {
    return null;
  }
}

function getSuperAdminHeaders(extraHeaders = {}) {
  const token = String(readSuperAdminSession()?.token ?? "").trim();
  return {
    ...(token ? { "X-GMS-Super-Admin-Token": token } : {}),
    ...extraHeaders,
  };
}

function normalizeText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeKey(value) {
  return normalizeText(value).toLowerCase();
}

function formatNumber(value) {
  return new Intl.NumberFormat().format(Math.max(0, Math.trunc(Number(value) || 0)));
}

function formatMoney(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return "-";
  }
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

function parseDate(value) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function formatDate(value, fallback = "-") {
  const date = parseDate(value);
  if (!date) {
    return fallback;
  }
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(value, fallback = "-") {
  const date = parseDate(value);
  if (!date) {
    return fallback;
  }
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function createElement(tagName, className = "", text = "") {
  const element = document.createElement(tagName);
  if (className) {
    element.className = className;
  }
  if (text !== "") {
    element.textContent = text;
  }
  return element;
}

function createBuyerSearchState(options = {}) {
  if (window.SuperAdminSearchState?.create) {
    return window.SuperAdminSearchState.create(options);
  }
  return createElement(
    "div",
    `super-admin-search-state is-${options.variant === "loading" ? "loading" : "empty"}`,
    options.message || "No results found.",
  );
}

function setBuyerSearchInputBusy(isBusy) {
  if (window.SuperAdminSearchState?.setInputBusy) {
    window.SuperAdminSearchState.setInputBusy(buyerElements.search, isBusy);
    return;
  }
  buyerElements.search?.setAttribute?.("aria-busy", String(Boolean(isBusy)));
}

function createIcon(classNameOrSvg) {
  if (typeof classNameOrSvg === "string" && classNameOrSvg.trim().startsWith("<")) {
    return createSvgIcon(classNameOrSvg);
  }
  const icon = document.createElement("i");
  icon.className = classNameOrSvg;
  icon.setAttribute("aria-hidden", "true");
  return icon;
}

function createSvgIcon(paths) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  svg.innerHTML = paths;
  return svg;
}

function createCloseIconSvg() {
  return createSvgIcon('<path d="M18 6 6 18"></path><path d="m6 6 12 12"></path>');
}

function formatRelativeTime(value) {
  const date = parseDate(value);
  if (!date) {
    return "Never";
  }
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) {
    return formatDate(date);
  }
  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;
  if (diffMs < minuteMs) {
    return "Just now";
  }
  if (diffMs < hourMs) {
    return `${Math.max(1, Math.floor(diffMs / minuteMs))}m ago`;
  }
  if (diffMs < dayMs) {
    return `${Math.max(1, Math.floor(diffMs / hourMs))}h ago`;
  }
  if (diffMs < 30 * dayMs) {
    return `${Math.max(1, Math.floor(diffMs / dayMs))}d ago`;
  }
  return formatDate(date);
}

function getBuyerToneIndex(account) {
  const source = `${getBuyerId(account)}${getBuyerName(account)}`;
  let hash = 0;
  for (const char of source) {
    hash = (hash + char.charCodeAt(0)) % 6;
  }
  return hash + 1;
}

function getBuyerId(account) {
  return normalizeText(account?.id || account?.accountId || account?.accountCode || account?.email);
}

function getBuyerCode(account) {
  return normalizeText(account?.accountCode || account?.userId || account?.id || "Unknown");
}

function getBuyerName(account) {
  return normalizeText(
    [account?.firstName, account?.middleName, account?.lastName, account?.suffix]
      .map(normalizeText)
      .filter(Boolean)
      .join(" "),
  ) || normalizeText(account?.displayName || account?.fullName || account?.email) || "Buyer";
}

function getBuyerInitials(account) {
  const name = getBuyerName(account);
  const initials = name
    .split(" ")
    .map((part) => part.charAt(0))
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return initials || "B";
}

function getBuyerPhone(account) {
  const mobileNumber = normalizeText(account?.mobileNumber || account?.phoneNumber || account?.phone);
  if (!mobileNumber) {
    return "";
  }
  const countryCode = normalizeText(account?.countryCode) || "+63";
  return mobileNumber.startsWith("+") ? mobileNumber : `${countryCode} ${mobileNumber}`;
}

function getBuyerEmail(account) {
  return normalizeText(account?.email || account?.registerEmail);
}

function getBuyerAddress(account) {
  const savedAddresses = Array.isArray(account?.savedAddresses)
    ? account.savedAddresses
    : Array.isArray(account?.deliveryAddresses)
      ? account.deliveryAddresses
      : [];
  const firstSavedAddress = savedAddresses
    .map((address) => {
      if (typeof address === "string") {
        return normalizeText(address);
      }
      return normalizeText(
        address?.fullAddress ||
          address?.address ||
          [address?.street, address?.barangay, address?.city, address?.province]
            .map(normalizeText)
            .filter(Boolean)
            .join(", "),
      );
    })
    .find(Boolean);
  return normalizeText(
    account?.savedDeliveryAddress ||
      account?.deliveryAddress ||
      account?.defaultDeliveryAddress ||
      account?.address ||
      firstSavedAddress,
  ) || "-";
}

function getBuyerStatus(account) {
  const rawStatus = normalizeKey(
    account?.accountStatus ||
      account?.userStatus ||
      account?.status ||
      account?.accountState ||
      "",
  );
  if (account?.deletedAt || rawStatus === "deleted") {
    return "deleted";
  }
  if (account?.isBanned === true || account?.banned === true || rawStatus === "banned") {
    return "banned";
  }
  if (
    account?.isSuspended === true ||
    account?.suspended === true ||
    rawStatus === "suspended" ||
    account?.isRestricted === true ||
    account?.restricted === true ||
    rawStatus === "restricted" ||
    account?.locked === true ||
    rawStatus === "locked"
  ) {
    return "restricted";
  }
  return rawStatus || "active";
}

function getBuyerStatusLabel(status) {
  const labels = {
    active: "Active",
    restricted: "Restricted",
    banned: "Banned",
    deleted: "Deleted",
  };
  return labels[status] || "Active";
}

function getBuyerVerificationStatus(account) {
  const rawStatus = normalizeKey(
    account?.identityVerificationStatus ||
      account?.verificationStatus ||
      account?.kycStatus ||
      "",
  );
  if (["verified", "pending", "rejected", "unverified"].includes(rawStatus)) {
    return rawStatus;
  }
  if (
    account?.faceVerified === true ||
    account?.identityVerified === true ||
    account?.verifiedAt ||
    account?.emailVerified === true ||
    account?.phoneVerified === true
  ) {
    return "verified";
  }
  return "unverified";
}

function getBuyerVerificationLabel(status) {
  const labels = {
    verified: "Verified",
    pending: "Pending",
    rejected: "Rejected",
    unverified: "Unverified",
  };
  return labels[status] || "Unverified";
}

function getBuyerRestrictionDescriptor(account) {
  const explicitLevel = normalizeKey(
    account?.restrictionLevel ||
      account?.riskLevel ||
      account?.violationLevel ||
      account?.warningLevel ||
      "",
  );
  if (["high", "medium", "low"].includes(explicitLevel)) {
    return {
      label: explicitLevel.charAt(0).toUpperCase() + explicitLevel.slice(1),
      meter: explicitLevel === "high" ? 3 : explicitLevel === "medium" ? 2 : 1,
    };
  }

  const status = getBuyerStatus(account);
  if (status === "banned" || status === "deleted") {
    return { label: "High", meter: 3 };
  }
  if (status === "restricted") {
    return { label: "Low", meter: 1 };
  }

  const reportCount = normalizeReportRecords(account).length;
  if (reportCount >= 3) {
    return { label: "High", meter: 3 };
  }
  if (reportCount >= 2) {
    return { label: "Medium", meter: 2 };
  }
  if (reportCount >= 1) {
    return { label: "Low", meter: 1 };
  }

  return { label: "None", meter: 0 };
}

function isBuyerAccount(account) {
  if (!account || typeof account !== "object") {
    return false;
  }
  const role = normalizeKey(account.role);
  const source = normalizeKey(account.source);
  if (role === "admin" || role === "employee") {
    return false;
  }
  return source === "app" || role === "user" || role === "buyer" || role === "customer";
}

function getBuyerMatchKeys(account) {
  return [
    account?.id,
    account?.accountId,
    account?.accountCode,
    account?.userId,
    account?.email,
    account?.mobileNumber,
  ]
    .map(normalizeKey)
    .filter(Boolean);
}

function getOrderAccountKey(order) {
  return normalizeKey(
    order?.accountId ||
      order?.customerAccountId ||
      order?.userId ||
      order?.customerId ||
      order?.email ||
      order?.clientEmail,
  );
}

function isBookingRecord(order) {
  const type = normalizeKey(order?.type || order?.transactionType || order?.orderType || "");
  return Boolean(
    type.includes("booking") ||
      order?.bookingId ||
      order?.bookingDate ||
      order?.serviceId ||
      order?.serviceName,
  );
}

function getBuyerOrders(account, includeBookings = true) {
  const keys = new Set(getBuyerMatchKeys(account));
  return buyerState.orders.filter((order) => {
    const accountKey = getOrderAccountKey(order);
    if (!accountKey || !keys.has(accountKey)) {
      return false;
    }
    return includeBookings ? true : !isBookingRecord(order);
  });
}

function getBuyerBookings(account) {
  return getBuyerOrders(account, true).filter(isBookingRecord);
}

function getBuyerOrderCount(account) {
  return getBuyerOrders(account, false).length;
}

function getBuyerBookingCount(account) {
  return getBuyerBookings(account).length;
}

function getBuyerLastActive(account) {
  return (
    account?.lastActiveAt ||
    account?.lastLoginAt ||
    account?.presenceUpdatedAt ||
    account?.updatedAt ||
    account?.createdAt ||
    ""
  );
}

function getBuyerSearchText(account) {
  return [
    getBuyerName(account),
    getBuyerCode(account),
    getBuyerEmail(account),
    getBuyerPhone(account),
    getBuyerAddress(account),
    getBuyerStatus(account),
    getBuyerVerificationStatus(account),
  ]
    .map(normalizeKey)
    .filter(Boolean)
    .join(" ");
}

function isBuyerOnlineToday(account) {
  if (
    account?.isOnline === true ||
    account?.online === true ||
    normalizeKey(account?.presenceStatus || account?.statusText) === "online"
  ) {
    return true;
  }
  const lastActive = parseDate(getBuyerLastActive(account));
  if (!lastActive) {
    return false;
  }
  const today = new Date();
  return (
    lastActive.getFullYear() === today.getFullYear() &&
    lastActive.getMonth() === today.getMonth() &&
    lastActive.getDate() === today.getDate()
  );
}

function normalizeBuyerFilterValue(type, value) {
  const key = normalizeText(value || buyerFilterDefaults[type] || "all");
  return buyerFilterOptions[type]?.has(key) ? key : buyerFilterDefaults[type] || "all";
}

function normalizeBuyerStatusSubNavValue(value) {
  const key = normalizeText(value || "all");
  return Object.prototype.hasOwnProperty.call(buyerStatusSubNavMap, key) ? key : "all";
}

function getBuyerStatusForSubNavValue(value) {
  return buyerStatusSubNavMap[normalizeBuyerStatusSubNavValue(value)] || "all";
}

function getBuyerSubNavValueForStatus(status) {
  const normalizedStatus = normalizeBuyerFilterValue("status", status);
  if (normalizedStatus === "new") {
    return "new";
  }
  if (normalizedStatus === "active") {
    return "low-risk";
  }
  if (normalizedStatus === "restricted" || normalizedStatus === "banned") {
    return normalizedStatus;
  }
  return normalizedStatus === "all" ? "all" : "";
}

function isNewlyRegisteredBuyer(account) {
  const created = parseDate(account?.createdAt);
  if (!created) {
    return false;
  }
  return Date.now() - created.getTime() <= buyerNewRegistrationWindowMs;
}

function getNewlyRegisteredBuyers(buyers = buyerState.buyers) {
  return (Array.isArray(buyers) ? buyers : []).filter(isNewlyRegisteredBuyer);
}

function syncBuyerNewRegistrationNavBadge(buyers = buyerState.buyers) {
  const newCount = getNewlyRegisteredBuyers(buyers).length;
  window.GMSSuperAdminNavNewBadge?.sync?.(buyerElements.navBadge, newCount, "user registrations");
  window.GMSSuperAdminNavNewBadge?.syncSubNavItem?.(
    buyerElements.newFilterNavItem,
    newCount,
    "user registrations",
  );
  lastBuyerNewRegistrationCount = newCount;
  return newCount;
}

function refreshBuyerNewRegistrationState(buyers = buyerState.buyers) {
  const previousCount = lastBuyerNewRegistrationCount;
  const newCount = syncBuyerNewRegistrationNavBadge(buyers);
  if (previousCount === newCount) {
    return;
  }
  if (normalizeBuyerFilterValue("status", buyerState.status) !== "new") {
    return;
  }
  if (newCount <= 0) {
    setBuyerStatusFromSubNav("all");
    return;
  }
  renderBuyerTable();
}

function normalizeBuyerSortValue(value) {
  const key = normalizeText(value || buyerFilterDefaults.sort);
  return buyerSortOptions.has(key) ? key : buyerFilterDefaults.sort;
}

function normalizeBuyerSortValues(value) {
  const rawValues = Array.isArray(value) ? value : [value];
  const normalizedValues = [];
  const seenValues = new Set();

  for (const rawValue of rawValues) {
    const normalizedValue = normalizeBuyerSortValue(rawValue);
    if (!seenValues.has(normalizedValue)) {
      seenValues.add(normalizedValue);
      normalizedValues.push(normalizedValue);
    }
  }

  const nonDefaultValues = normalizedValues.filter((normalizedValue) => normalizedValue !== buyerFilterDefaults.sort);
  return nonDefaultValues.length ? nonDefaultValues : (normalizedValues.length ? normalizedValues : [buyerFilterDefaults.sort]);
}

function getBuyerFilterLabel(type, value) {
  const normalizedValue = normalizeBuyerFilterValue(type, value);
  return buyerFilterLabels[type]?.[normalizedValue] || buyerFilterLabels[type]?.all || "All";
}

function getBuyerSortLabel(value) {
  return buyerSortLabels[normalizeBuyerSortValue(value)] || buyerSortLabels.newest;
}

function getBuyerSortSummaryLabel(values) {
  return normalizeBuyerSortValues(values).map(getBuyerSortLabel).join(", ");
}

function hasBuyerEmailVerification(account) {
  return account?.emailVerified === true || Boolean(account?.emailVerifiedAt || account?.verifiedEmailAt);
}

function hasBuyerPhoneVerification(account) {
  return account?.phoneVerified === true || Boolean(account?.phoneVerifiedAt || account?.verifiedPhoneAt);
}

function hasBuyerIdentityVerification(account) {
  return Boolean(
    account?.faceVerified === true ||
      account?.identityVerified === true ||
      account?.identityVerifiedAt ||
      account?.verifiedAt,
  );
}

function matchesBuyerVerificationFilter(account, filterValue) {
  const verification = normalizeBuyerFilterValue("verification", filterValue);
  if (verification === "all") {
    return true;
  }
  if (verification === "email-verified") {
    return hasBuyerEmailVerification(account);
  }
  if (verification === "phone-verified") {
    return hasBuyerPhoneVerification(account);
  }
  if (verification === "identity-verified") {
    return hasBuyerIdentityVerification(account);
  }
  return getBuyerVerificationStatus(account) === verification;
}

function matchesBuyerActivityFilter(account, filterValue) {
  const activity = normalizeBuyerFilterValue("activity", filterValue);
  if (activity === "all") {
    return true;
  }
  const orderCount = getBuyerOrderCount(account);
  const bookingCount = getBuyerBookingCount(account);
  if (activity === "online-today") {
    return isBuyerOnlineToday(account);
  }
  if (activity === "has-orders") {
    return orderCount > 0;
  }
  if (activity === "has-bookings") {
    return bookingCount > 0;
  }
  if (activity === "no-history") {
    return orderCount + bookingCount === 0;
  }
  return true;
}

function setSelectValue(select, value, fallback = "all") {
  if (!select) {
    return;
  }
  const nextValue = normalizeText(value);
  const hasOption = Array.from(select.options || []).some((option) => option.value === nextValue);
  select.value = hasOption ? nextValue : fallback;
}

function getCheckedBuyerFilterValue(type) {
  const checked = buyerElements.filterControls.find(
    (control) => control.dataset.buyerFilter === type && control.checked,
  );
  if (checked) {
    return normalizeBuyerFilterValue(type, checked.value);
  }
  if (type === "status" && buyerElements.statusFilter) {
    return normalizeBuyerFilterValue(type, buyerElements.statusFilter.value);
  }
  if (type === "verification" && buyerElements.verificationFilter) {
    return normalizeBuyerFilterValue(type, buyerElements.verificationFilter.value);
  }
  if (type === "dateJoined" && buyerElements.dateFilter) {
    return normalizeBuyerFilterValue(type, buyerElements.dateFilter.value);
  }
  return normalizeBuyerFilterValue(type, buyerState[type] || buyerFilterDefaults[type]);
}

function getCheckedBuyerSortValues() {
  const checkedValues = buyerElements.sortControls
    .filter((control) => control.checked)
    .map((control) => control.value);
  if (checkedValues.length) {
    return normalizeBuyerSortValues(checkedValues);
  }
  if (buyerElements.sort) {
    return normalizeBuyerSortValues([buyerElements.sort.value]);
  }
  return normalizeBuyerSortValues(buyerState.sort);
}

function setBuyerRadioChecked(dataSelector, value) {
  const radio = document.querySelector(`${dataSelector}[value="${escapeCssValue(value)}"]`);
  if (radio) {
    radio.checked = true;
  }
}

function setBuyerSortControlsChecked(values) {
  const normalizedValues = normalizeBuyerSortValues(values);
  const selectedValues = new Set(normalizedValues);
  let hasCheckedControl = false;

  for (const control of buyerElements.sortControls) {
    control.checked = selectedValues.has(normalizeBuyerSortValue(control.value));
    hasCheckedControl = hasCheckedControl || control.checked;
  }

  const fallbackControl = buyerElements.sortControls.find(
    (control) => normalizeBuyerSortValue(control.value) === buyerFilterDefaults.sort,
  );
  if (
    fallbackControl?.checked &&
    buyerElements.sortControls.some((control) => control !== fallbackControl && control.checked)
  ) {
    fallbackControl.checked = false;
    hasCheckedControl = buyerElements.sortControls.some((control) => control.checked);
  }

  if (!hasCheckedControl) {
    if (fallbackControl) {
      fallbackControl.checked = true;
    }
  }
}

function enforceBuyerSortCheckboxFallback(changedControl = null) {
  if (!buyerElements.sortControls.length) {
    return;
  }

  const fallbackControl = buyerElements.sortControls.find(
    (control) => normalizeBuyerSortValue(control.value) === buyerFilterDefaults.sort,
  );
  if (!fallbackControl) {
    return;
  }

  if (
    changedControl instanceof HTMLInputElement &&
    changedControl.checked &&
    normalizeBuyerSortValue(changedControl.value) !== buyerFilterDefaults.sort
  ) {
    fallbackControl.checked = false;
  }

  if (
    changedControl instanceof HTMLInputElement &&
    changedControl.checked &&
    normalizeBuyerSortValue(changedControl.value) === buyerFilterDefaults.sort
  ) {
    for (const control of buyerElements.sortControls) {
      if (control !== changedControl) {
        control.checked = false;
      }
    }
  }

  if (
    fallbackControl.checked &&
    buyerElements.sortControls.some((control) => control !== fallbackControl && control.checked)
  ) {
    fallbackControl.checked = false;
  }

  if (!buyerElements.sortControls.some((control) => control.checked)) {
    fallbackControl.checked = true;
  }
}

function syncBuyerFilterControlsFromState() {
  buyerState.status = normalizeBuyerFilterValue("status", buyerState.status);
  buyerState.verification = normalizeBuyerFilterValue("verification", buyerState.verification);
  buyerState.activity = normalizeBuyerFilterValue("activity", buyerState.activity);
  buyerState.dateJoined = normalizeBuyerFilterValue("dateJoined", buyerState.dateJoined);
  buyerState.sort = normalizeBuyerSortValues(buyerState.sort);

  setBuyerRadioChecked('[data-buyer-filter="status"]', buyerState.status);
  setBuyerRadioChecked('[data-buyer-filter="verification"]', buyerState.verification);
  setBuyerRadioChecked('[data-buyer-filter="activity"]', buyerState.activity);
  setBuyerRadioChecked('[data-buyer-filter="dateJoined"]', buyerState.dateJoined);
  setBuyerSortControlsChecked(buyerState.sort);

  setSelectValue(buyerElements.statusFilter, buyerState.status);
  setSelectValue(buyerElements.verificationFilter, buyerState.verification);
  setSelectValue(buyerElements.dateFilter, buyerState.dateJoined);
  setSelectValue(buyerElements.sort, buyerState.sort[0], buyerFilterDefaults.sort);
  syncBuyerStatusSubNav();
}

function syncBuyerStatusSubNav() {
  const activeSubNavValue = getBuyerSubNavValueForStatus(buyerState.status);
  if (activeSubNavValue) {
    saveBuyerAccountSubNav(activeSubNavValue);
  }
  for (const button of buyerElements.statusSubNavItems) {
    const buttonValue = normalizeBuyerStatusSubNavValue(button.dataset.buyerAccountFilter);
    const isActive = buttonValue === activeSubNavValue;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
    if (isActive) {
      button.setAttribute("aria-disabled", "true");
    } else {
      button.removeAttribute("aria-disabled");
    }
  }
}

function setBuyerStatusFromSubNav(value) {
  buyerState.status = getBuyerStatusForSubNavValue(value);
  saveBuyerAccountSubNav(value);
  buyerState.page = 1;
  syncBuyerFilterControlsFromState();
  syncBuyerFilterSummary();
  renderBuyerTable();
}

function syncBuyerFilterSummary() {
  if (!buyerElements.filterSummary) {
    return;
  }
  const activeFilters = [];
  if (buyerState.status !== "all") {
    activeFilters.push(getBuyerFilterLabel("status", buyerState.status));
  }
  if (buyerState.verification !== "all") {
    activeFilters.push(getBuyerFilterLabel("verification", buyerState.verification));
  }
  if (buyerState.activity !== "all") {
    activeFilters.push(getBuyerFilterLabel("activity", buyerState.activity));
  }
  if (buyerState.dateJoined !== "all") {
    activeFilters.push(getBuyerFilterLabel("dateJoined", buyerState.dateJoined));
  }
  buyerElements.filterSummary.textContent = `${activeFilters.length ? activeFilters.join(", ") : "All"}, ${getBuyerSortSummaryLabel(buyerState.sort)}`;
}

function toggleBuyerFilterDropdown(forceOpen) {
  if (!buyerElements.filterToggle || !buyerElements.filterPanel) {
    return;
  }
  const shouldOpen = typeof forceOpen === "boolean" ? forceOpen : buyerElements.filterPanel.hidden;
  if (shouldOpen) {
    syncBuyerFilterControlsFromState();
  }
  buyerElements.filterPanel.hidden = !shouldOpen;
  buyerElements.filterToggle.setAttribute("aria-expanded", String(shouldOpen));
}

function applyBuyerFiltersFromControls() {
  buyerState.status = getCheckedBuyerFilterValue("status");
  buyerState.verification = getCheckedBuyerFilterValue("verification");
  buyerState.activity = getCheckedBuyerFilterValue("activity");
  buyerState.dateJoined = getCheckedBuyerFilterValue("dateJoined");
  enforceBuyerSortCheckboxFallback();
  buyerState.sort = getCheckedBuyerSortValues();
  buyerState.page = 1;
  syncBuyerFilterControlsFromState();
  syncBuyerFilterSummary();
  renderBuyerTable();
}

function clearBuyerFiltersFromControls() {
  buyerState.status = buyerFilterDefaults.status;
  buyerState.verification = buyerFilterDefaults.verification;
  buyerState.activity = buyerFilterDefaults.activity;
  buyerState.dateJoined = buyerFilterDefaults.dateJoined;
  buyerState.sort = [buyerFilterDefaults.sort];
  buyerState.page = 1;
  syncBuyerFilterControlsFromState();
  syncBuyerFilterSummary();
  renderBuyerTable();
}

function updateSummaryCards() {
  const buyers = buyerState.buyers;
  const total = buyers.length;
  const active = buyers.filter((buyer) => getBuyerStatus(buyer) === "active").length;
  const online = buyers.filter(isBuyerOnlineToday).length;
  const banned = buyers.filter((buyer) => getBuyerStatus(buyer) === "banned").length;
  const limited = buyers.filter((buyer) => getBuyerStatus(buyer) === "restricted").length;
  const newBuyers = buyers.filter(isNewlyRegisteredBuyer).length;

  if (buyerElements.stats.totalLabel) buyerElements.stats.totalLabel.textContent = `(${formatNumber(total)})`;
  if (buyerElements.stats.total) buyerElements.stats.total.textContent = formatNumber(total);
  if (buyerElements.stats.active) buyerElements.stats.active.textContent = formatNumber(active);
  if (buyerElements.stats.online) buyerElements.stats.online.textContent = formatNumber(online);
  if (buyerElements.stats.banned) buyerElements.stats.banned.textContent = formatNumber(banned);
  if (buyerElements.stats.limited) buyerElements.stats.limited.textContent = formatNumber(limited);
  if (buyerElements.stats.new) buyerElements.stats.new.textContent = formatNumber(newBuyers);
  if (buyerElements.stats.activePercent) {
    window.GMSSuperAdminStatTrend?.setRawPair?.(buyerElements.stats.activePercent, active, 0);
  }
  if (buyerElements.stats.bannedPercent) {
    window.GMSSuperAdminStatTrend?.setRawPair?.(buyerElements.stats.bannedPercent, 0, banned);
  }
  if (buyerElements.stats.limitedPercent) {
    window.GMSSuperAdminStatTrend?.setRawPair?.(buyerElements.stats.limitedPercent, 0, limited);
  }
}

function filterBuyers() {
  const query = buyerState.searchTerm;
  const status = normalizeBuyerFilterValue("status", buyerState.status);
  const verification = normalizeBuyerFilterValue("verification", buyerState.verification);
  const activity = normalizeBuyerFilterValue("activity", buyerState.activity);
  const dateJoined = normalizeBuyerFilterValue("dateJoined", buyerState.dateJoined);
  const maxAgeDays = dateJoined === "all" ? 0 : Number(dateJoined);
  const now = Date.now();

  let filtered = buyerState.buyers.filter((buyer) => {
    if (query && !getBuyerSearchText(buyer).includes(query)) {
      return false;
    }
    if (status === "new" && !isNewlyRegisteredBuyer(buyer)) {
      return false;
    }
    if (status !== "all" && status !== "new" && getBuyerStatus(buyer) !== status) {
      return false;
    }
    if (!matchesBuyerVerificationFilter(buyer, verification)) {
      return false;
    }
    if (!matchesBuyerActivityFilter(buyer, activity)) {
      return false;
    }
    if (maxAgeDays > 0) {
      const created = parseDate(buyer?.createdAt);
      if (!created || now - created.getTime() > maxAgeDays * 86400000) {
        return false;
      }
    }
    return true;
  });

  filtered = sortBuyers(filtered);
  buyerState.filteredBuyers = filtered;
  const maxPage = Math.max(1, Math.ceil(filtered.length / buyerState.pageSize));
  if (buyerState.page > maxPage) {
    buyerState.page = maxPage;
  }
  return filtered;
}

function sortBuyers(buyers) {
  const sorted = [...buyers];
  sorted.sort((first, second) => {
    for (const sort of normalizeBuyerSortValues(buyerState.sort)) {
      const compareResult = compareBuyersBySortValue(first, second, sort);
      if (compareResult !== 0) {
        return compareResult;
      }
    }
    return compareBuyerNames(first, second);
  });
  return sorted;
}

function compareBuyerNames(first, second) {
  return getBuyerName(first).localeCompare(getBuyerName(second), undefined, { sensitivity: "base" });
}

function compareBuyersBySortValue(first, second, sort) {
  switch (sort) {
    case "oldest":
      return (parseDate(first?.createdAt)?.getTime() || 0) - (parseDate(second?.createdAt)?.getTime() || 0);
    case "last-active":
      return (parseDate(getBuyerLastActive(second))?.getTime() || 0) - (parseDate(getBuyerLastActive(first))?.getTime() || 0);
    case "orders":
      return (getBuyerOrderCount(second) + getBuyerBookingCount(second)) -
        (getBuyerOrderCount(first) + getBuyerBookingCount(first));
    case "order-count":
      return getBuyerOrderCount(second) - getBuyerOrderCount(first);
    case "bookings":
      return getBuyerBookingCount(second) - getBuyerBookingCount(first);
    case "a-z":
      return compareBuyerNames(first, second);
    case "newest":
    default:
      return (parseDate(second?.createdAt)?.getTime() || 0) - (parseDate(first?.createdAt)?.getTime() || 0);
  }
}

function createBuyerAvatar(account) {
  const avatar = createElement(
    "span",
    `buyer-data-avatar buyer-data-list-avatar super-admin-company-card__logo super-admin-company-card__logo--tone-${getBuyerToneIndex(account)}`,
  );
  const initials = getBuyerInitials(account);
  const imageUrl = normalizeText(
    account?.profileImageUrl ||
      account?.avatarUrl ||
      account?.photoUrl ||
      account?.pictureUrl ||
      "",
  );
  if (imageUrl) {
    const image = document.createElement("img");
    image.src = imageUrl;
    image.alt = "";
    image.loading = "lazy";
    image.decoding = "async";
    if (
      /googleusercontent\.com|ggpht\.com|google\.com\/a\//i.test(imageUrl)
    ) {
      image.referrerPolicy = "no-referrer";
    }
    avatar.classList.add("has-image");
    image.addEventListener(
      "error",
      () => {
        avatar.classList.remove("has-image");
        const preserved = Array.from(avatar.children).filter((child) => child !== image);
        image.remove();
        avatar.replaceChildren(document.createTextNode(initials), ...preserved);
      },
      { once: true },
    );
    avatar.appendChild(image);
  } else {
    avatar.textContent = initials;
  }
  return avatar;
}

function createBadge(type, label) {
  const badge = createElement("span", `buyer-data-badge buyer-data-badge--${type}`, label);
  return badge;
}

function getBuyerActionDefinitions(account) {
  return [
    ["view-profile", "View Profile"],
    ["notify", "Notify User"],
    ["restrict", "Restrict"],
    ["activity", "Activity Logs"],
    ["ban", "Ban", "danger"],
  ].map(([id, label, tone]) => ({
    id,
    label,
    icon: buyerListActionIconPaths[id] || buyerListActionIconPaths["view-profile"],
    buyerId: getBuyerId(account),
    danger: tone === "danger",
  }));
}

function createBuyerActionElement(action, options = {}) {
  const compact = options.compact === true;
  const button = document.createElement("button");
  button.type = "button";
  button.className = compact
    ? `super-admin-company-card__quick-action${action.danger ? " super-admin-company-card__quick-action--danger" : ""}`
    : `super-admin-company-card__action-item${action.danger ? " super-admin-company-card__action-item--danger" : ""}`;
  button.dataset.buyerAction = action.id;
  button.dataset.buyerId = action.buyerId;
  button.setAttribute("aria-label", action.label);
  button.title = action.label;
  if (!compact) {
    button.setAttribute("role", "menuitem");
  }
  button.appendChild(createSvgIcon(action.icon));
  if (!compact) {
    button.appendChild(createElement("span", "", action.label));
  }
  return button;
}

function createBuyerQuickActions(account) {
  const quickActions = document.createElement("div");
  quickActions.className = "super-admin-company-card__quick-actions buyer-data-list-row__quick-actions";
  quickActions.setAttribute("aria-label", `Quick actions for ${getBuyerName(account)}`);

  for (const action of getBuyerActionDefinitions(account)) {
    quickActions.appendChild(createBuyerActionElement(action, { compact: true }));
  }

  return quickActions;
}

function createBuyerActionMenu(account) {
  const buyerId = getBuyerId(account);
  const wrap = createElement(
    "div",
    "buyer-data-actions universal-dropdown super-admin-company-card__action-dropdown super-admin-company-card__dropdown",
  );
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "buyer-data-actions__toggle super-admin-company-card__menu super-admin-company-card__dropdown-trigger";
  toggle.dataset.buyerMenuToggle = buyerId;
  toggle.dataset.buyerActionDropdownTrigger = "";
  toggle.setAttribute("aria-label", `Actions for ${getBuyerName(account)}`);
  toggle.setAttribute("aria-haspopup", "menu");
  toggle.setAttribute("aria-expanded", "false");
  toggle.title = "Actions";
  toggle.appendChild(createSvgIcon(buyerListIconPaths.ellipsis));

  const menu = createElement(
    "div",
    "buyer-data-actions__menu universal-dropdown__panel super-admin-company-card__action-menu super-admin-company-card__dropdown-panel",
  );
  menu.dataset.buyerMenu = buyerId;
  menu.setAttribute("role", "menu");
  menu.hidden = true;

  const caret = document.createElement("span");
  caret.className = "super-admin-company-card__action-menu-caret";
  caret.setAttribute("aria-hidden", "true");
  menu.appendChild(caret);

  for (const action of getBuyerActionDefinitions(account)) {
    menu.appendChild(createBuyerActionElement(action));
  }

  wrap.append(toggle, menu);
  return wrap;
}

function setBuyerListViewShell() {
  if (!buyerElements.list) {
    return;
  }
  buyerElements.list.classList.add("buyer-data-list", "super-admin-company-list", "is-list-view");
  buyerElements.list.style.setProperty("--company-list-table-columns", buyerListTableColumns);
  buyerElements.list.style.setProperty("--buyer-data-list-columns", buyerListTableColumns);
}

function createBuyerTableHeader() {
  const header = document.createElement("div");
  header.className = "super-admin-data-table-header super-admin-company-table-header buyer-data-list-header";
  header.setAttribute("role", "row");
  ["User", "Contact", "Security", "Verification", "Restriction Level", "Last Active", "Registered", "Actions"].forEach((label) => {
    const cell = document.createElement("span");
    cell.textContent = label;
    header.appendChild(cell);
  });
  return header;
}

function createBuyerContactCopyField(value, label, className, canCopy = true) {
  const field = document.createElement("span");
  field.className = `${className} super-admin-company-copy-field`;

  const copy = createElement("span", "super-admin-company-copy-field__text", value);
  field.append(copy);

  if (canCopy && normalizeText(value)) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "super-admin-company-copy-button";
    button.dataset.buyerContactCopy = normalizeText(value);
    button.dataset.buyerContactLabel = label;
    button.setAttribute("aria-label", `Copy ${label.toLowerCase()}`);
    button.title = `Copy ${label.toLowerCase()}`;
    button.append(createSvgIcon(buyerListIconPaths.copy));
    field.append(button);
  }

  return field;
}

function createBuyerListIdentityCell(account) {
  const buyerId = getBuyerId(account);
  const identity = document.createElement("div");
  identity.className = "super-admin-company-card__header buyer-data-list-row__identity";
  identity.dataset.buyerAction = "view-profile";
  identity.dataset.buyerId = buyerId;
  identity.setAttribute("role", "button");
  identity.setAttribute("aria-label", `Open profile for ${getBuyerName(account)}`);

  const titleWrap = createElement("span", "super-admin-company-card__title buyer-data-list-row__title");
  const titleContainer = createElement("span", "super-admin-company-card__title-container");
  const title = createElement("h3", "super-admin-company-card__title-text", getBuyerName(account));
  const emailValue = getBuyerEmail(account) || `ID: ${getBuyerCode(account)}`;
  const email = createBuyerContactCopyField(
    emailValue,
    "Email",
    "super-admin-company-card__table-user-email buyer-data-list-row__email",
    Boolean(getBuyerEmail(account)),
  );
  const avatar = createBuyerAvatar(account);
  const buyerOnline = isBuyerOnline(account);
  const presenceDot = createElement(
    "span",
    `super-admin-company-card__avatar-status-dot buyer-data-list-avatar__presence ${buyerOnline ? "is-online" : "is-offline"}`,
  );
  presenceDot.setAttribute("role", "img");
  presenceDot.setAttribute("aria-label", buyerOnline ? "Online" : "Offline");
  presenceDot.title = buyerOnline ? "Online" : "Offline";
  avatar.appendChild(presenceDot);
  titleContainer.appendChild(title);
  titleWrap.append(titleContainer, email);
  identity.append(avatar, titleWrap);
  return identity;
}

function createBuyerListContactCell(account) {
  const phone = getBuyerPhone(account);
  const cell = document.createElement("div");
  cell.className = "super-admin-company-card__table-role buyer-data-list-row__contact";
  cell.append(
    createBuyerContactCopyField(
      phone || "No phone",
      "Phone number",
      "buyer-data-list-row__contact-value",
      Boolean(phone),
    ),
  );
  return cell;
}

function createBuyerListTextCell(className, value) {
  const cell = createElement("div", className, value || "-");
  cell.title = value || "-";
  return cell;
}

function createBuyerListStatusCell(account) {
  const status = getBuyerStatus(account);
  const statusClass = status === "deleted" ? "banned" : status;
  const cell = document.createElement("div");
  cell.className = "super-admin-company-card__table-status buyer-data-list-row__status";
  cell.innerHTML = `
    <span class="super-admin-company-card__status-pill is-${statusClass}">
      <span class="super-admin-company-card__status-pill-dot" aria-hidden="true"></span>
      <span></span>
    </span>
  `;
  cell.querySelector(".super-admin-company-card__status-pill span:last-child").textContent =
    getBuyerStatusLabel(status);
  return cell;
}

function createBuyerListVerificationCell(account) {
  const verification = getBuyerVerificationStatus(account);
  const isVerified = verification === "verified";
  const cell = document.createElement("div");
  cell.className = "super-admin-company-card__table-verification buyer-data-list-row__verification";
  const pill = createElement(
    "span",
    `super-admin-company-card__verification-pill ${isVerified ? "is-verified" : "is-unverified"}`,
  );
  pill.append(
    createSvgIcon(isVerified ? buyerListIconPaths.verified : buyerListIconPaths.warning),
    createElement("span", "", getBuyerVerificationLabel(verification)),
  );
  cell.appendChild(pill);
  return cell;
}

function createBuyerListRestrictionCell(account) {
  const descriptor = getBuyerRestrictionDescriptor(account);
  const activeBarCount = Math.max(0, Math.min(3, Number(descriptor.meter) || 0));
  const meterClass =
    activeBarCount >= 3 ? "is-high" : activeBarCount === 2 ? "is-medium" : activeBarCount === 1 ? "is-low" : "";
  const cell = document.createElement("div");
  cell.className = "super-admin-company-card__table-restriction buyer-data-list-row__restriction";
  cell.innerHTML = `
    <span class="super-admin-company-card__restriction-summary ${activeBarCount > 0 ? "has-meter" : ""} ${meterClass}">
      <span class="super-admin-company-card__restriction-label"></span>
      <span class="super-admin-company-card__restriction-bars" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
      </span>
    </span>
  `;
  cell.querySelector(".super-admin-company-card__restriction-label").textContent = descriptor.label;
  cell
    .querySelectorAll(".super-admin-company-card__restriction-bars span")
    .forEach((bar, index) => bar.classList.toggle("is-active", index < activeBarCount));
  return cell;
}

function createBuyerPasswordResetField(account) {
  const buyerId = getBuyerId(account);
  const buyerName = getBuyerName(account);
  const field = document.createElement("div");
  field.className = "sa-secret-field";
  field.dataset.saSecretField = "password-reset";

  const value = createElement("span", "sa-secret-field__value", "Hashed");

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "sa-secret-field__toggle";
  toggle.dataset.saSecretReset = "buyer-password";
  toggle.dataset.buyerId = buyerId;
  toggle.dataset.buyerName = buyerName;
  toggle.title = "Reset password";
  toggle.setAttribute("aria-label", `Reset password for ${buyerName}`);
  toggle.append(createSvgIcon(buyerListIconPaths.key));

  field.append(value, toggle);
  return field;
}

function createBuyerListPasswordCell(account) {
  const cell = document.createElement("div");
  cell.className = "super-admin-company-card__table-password buyer-data-list-row__password";
  cell.append(createBuyerPasswordResetField(account));
  return cell;
}

async function resetBuyerPassword(toggleButton) {
  if (!(toggleButton instanceof HTMLButtonElement)) {
    return;
  }

  const buyerId = normalizeText(toggleButton.dataset.buyerId || "");
  const buyerName = normalizeText(toggleButton.dataset.buyerName || "");
  if (!buyerId) {
    return;
  }

  const authorize = window.gmsAuthorizeSuperAdminFingerprint;
  if (typeof authorize !== "function") {
    void window.GMSSuperAdminValidationModal?.showError?.(
      "Biometric Unavailable",
      "Connect the retina scan controller, then try again.",
    );
    return;
  }

  toggleButton.disabled = true;
  try {
    const authorized = await authorize("reset this user password");
    if (!authorized) {
      return;
    }
    const confirmed = window.confirm(
      `Reset login password for ${buyerName || "this user"}?\n\n` +
        "A temporary password will be shown once. Existing passwords cannot be viewed.",
    );
    if (!confirmed) {
      return;
    }
    const response = await fetch(`/api/super-admin/buyers/${encodeURIComponent(buyerId)}/reset-password`, {
      method: "POST",
      cache: "no-store",
      headers: getSuperAdminHeaders({
        Accept: "application/json",
        "Content-Type": "application/json",
      }),
      body: "{}",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || "Unable to reset password.");
    }
    const temporaryPassword = String(data.temporaryPassword ?? "").trim();
    if (!temporaryPassword) {
      throw new Error("Reset succeeded but no temporary password was returned.");
    }
    const opened = window.GMSSuperAdminPasswordRevealModal?.open?.(
      {
        title: "Temporary Password",
        subject: buyerName || buyerId,
        password: temporaryPassword,
      },
    );
    if (!opened) {
      throw new Error("Temporary password snackbar is unavailable.");
    }
  } catch (error) {
    void window.GMSSuperAdminValidationModal?.showError?.(
      "Password Reset Failed",
      error instanceof Error ? error.message : "Unable to reset password.",
    );
  } finally {
    toggleButton.disabled = false;
  }
}

function isBuyerOnline(account) {
  return Boolean(
    account?.isOnline === true ||
      account?.online === true ||
      normalizeKey(account?.presenceStatus || account?.statusText) === "online"
  );
}

function createBuyerListLastActiveCell(account) {
  const cell = document.createElement("div");
  cell.className = "super-admin-company-card__table-last-active buyer-data-list-row__last-active";
  cell.append(createElement("span", "", formatRelativeTime(getBuyerLastActive(account))));
  return cell;
}

function createBuyerRow(account) {
  const status = getBuyerStatus(account);
  const row = document.createElement("article");
  row.className = "super-admin-company-card buyer-data-list-row";
  row.dataset.buyerRow = getBuyerId(account);
  row.setAttribute("role", "row");
  row.tabIndex = 0;
  row.setAttribute("aria-label", `Open profile for ${getBuyerName(account)}`);
  row.setAttribute("aria-keyshortcuts", "Enter Space ContextMenu Shift+F10");
  row.classList.toggle("is-banned", status === "banned" || status === "deleted");
  row.classList.toggle("is-restricted", status === "restricted");

  const actionCell = document.createElement("div");
  actionCell.className = "super-admin-company-card__actions-cell buyer-data-list-row__actions";
  actionCell.append(createBuyerQuickActions(account), createBuyerActionMenu(account));

  row.append(
    createBuyerListIdentityCell(account),
    createBuyerListContactCell(account),
    createBuyerListPasswordCell(account),
    createBuyerListVerificationCell(account),
    createBuyerListRestrictionCell(account),
    createBuyerListLastActiveCell(account),
    createBuyerListTextCell("super-admin-company-card__table-registered buyer-data-list-row__registered", formatDate(account?.createdAt)),
    actionCell,
  );
  return row;
}

function renderBuyerTable() {
  if (!buyerElements.list) {
    return;
  }

  const filtered = filterBuyers();
  refreshBuyerNewRegistrationState();
  buyerElements.list.replaceChildren();
  setBuyerListViewShell();

  if (buyerState.searchLoading) {
    buyerElements.list.append(
      createBuyerTableHeader(),
      createBuyerSearchState({
        variant: "loading",
        message: "Searching users...",
        className: "buyer-data-empty buyer-data-list-empty",
      }),
    );
    if (buyerElements.pageMeta) {
      buyerElements.pageMeta.textContent = "Searching users...";
    }
    if (buyerElements.pagination) {
      buyerElements.pagination.replaceChildren();
      buyerElements.pagination.hidden = true;
    }
    return;
  }

  if (!filtered.length) {
    buyerElements.list.append(
      createBuyerTableHeader(),
      createBuyerSearchState({
        variant: "empty",
        message: buyerState.searchTerm
          ? "No users match your search."
          : "No users match the current filters.",
        className: "buyer-data-empty buyer-data-list-empty",
      }),
    );
    updatePagination();
    return;
  }

  const pageStart = (buyerState.page - 1) * buyerState.pageSize;
  const pageBuyers = filtered.slice(pageStart, pageStart + buyerState.pageSize);
  buyerElements.list.append(createBuyerTableHeader(), ...pageBuyers.map((buyer) => createBuyerRow(buyer)));
  updatePagination();
}

function getBuyerVisiblePaginationPages(pageCount) {
  if (pageCount <= 6) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }
  if (buyerState.page <= 3) {
    return [1, 2, 3, 4, "ellipsis", pageCount];
  }
  if (buyerState.page >= pageCount - 2) {
    return [1, "ellipsis", pageCount - 3, pageCount - 2, pageCount - 1, pageCount];
  }
  return [1, "ellipsis", buyerState.page - 1, buyerState.page, buyerState.page + 1, "ellipsis", pageCount];
}

function createBuyerPageButton(content, page, options = {}) {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.buyerPage = String(page);
  button.setAttribute("aria-label", options.ariaLabel || `Page ${page}`);
  button.classList.toggle("is-active", options.active === true);
  if (options.active === true) {
    button.setAttribute("aria-current", "page");
  }
  button.disabled = options.disabled === true;
  if (content instanceof Node) {
    button.appendChild(content);
  } else {
    button.textContent = content;
  }
  return button;
}

function appendBuyerPaginationEllipsis(pagination) {
  const marker = createElement("span", "super-admin-pagination__ellipsis", "...");
  marker.setAttribute("aria-hidden", "true");
  pagination.appendChild(marker);
}

function updatePagination() {
  const total = buyerState.filteredBuyers.length;
  const pageCount = Math.max(1, Math.ceil(total / buyerState.pageSize));
  buyerState.page = Math.min(Math.max(1, Number(buyerState.page) || 1), pageCount);
  const start = total ? (buyerState.page - 1) * buyerState.pageSize + 1 : 0;
  const end = Math.min(total, buyerState.page * buyerState.pageSize);

  if (buyerElements.pageMeta) {
    buyerElements.pageMeta.textContent = `Showing ${formatNumber(start)} to ${formatNumber(end)} of ${formatNumber(total)} results`;
  }
  if (buyerElements.pageLabel) {
    buyerElements.pageLabel.textContent = `${buyerState.page} / ${pageCount}`;
  }
  if (buyerElements.pagePrev) {
    buyerElements.pagePrev.disabled = buyerState.page <= 1;
  }
  if (buyerElements.pageNext) {
    buyerElements.pageNext.disabled = buyerState.page >= pageCount;
  }
  if (!buyerElements.pagination) {
    return;
  }

  const pagination = buyerElements.pagination;
  pagination.replaceChildren();
  pagination.hidden = pageCount <= 1;
  if (pageCount <= 1) {
    return;
  }

  pagination.append(createBuyerPageButton(
    createSvgIcon('<path d="m11 17-5-5 5-5"></path><path d="m18 17-5-5 5-5"></path>'),
    1,
    { ariaLabel: "First page", disabled: buyerState.page <= 1 },
  ));
  pagination.append(createBuyerPageButton(
    createSvgIcon('<path d="m15 18-6-6 6-6"></path>'),
    buyerState.page - 1,
    { ariaLabel: "Previous page", disabled: buyerState.page <= 1 },
  ));
  for (const page of getBuyerVisiblePaginationPages(pageCount)) {
    if (page === "ellipsis") {
      appendBuyerPaginationEllipsis(pagination);
      continue;
    }
    pagination.append(createBuyerPageButton(formatNumber(page), page, {
      active: page === buyerState.page,
    }));
  }
  pagination.append(createBuyerPageButton(
    createSvgIcon('<path d="m9 18 6-6-6-6"></path>'),
    buyerState.page + 1,
    { ariaLabel: "Next page", disabled: buyerState.page >= pageCount },
  ));
  pagination.append(createBuyerPageButton(
    createSvgIcon('<path d="m6 17 5-5-5-5"></path><path d="m13 17 5-5-5-5"></path>'),
    pageCount,
    { ariaLabel: "Last page", disabled: buyerState.page >= pageCount },
  ));
}

function getBuyerById(buyerId) {
  const normalizedId = normalizeKey(buyerId);
  return buyerState.buyers.find((buyer) => getBuyerMatchKeys(buyer).includes(normalizedId)) || null;
}

function setBuyerDrawerOpen(isOpen) {
  if (!buyerElements.drawer || !buyerElements.drawerBackdrop) {
    return;
  }
  const drawerMotion = window.GMSSuperAdminDrawerMotion;
  if (drawerMotion && typeof drawerMotion.open === "function" && typeof drawerMotion.close === "function") {
    if (isOpen) {
      drawerMotion.open(buyerElements.drawer, buyerElements.drawerBackdrop, {
        bodyClass: "buyer-data-drawer-open",
        onOpened: () => {
          window.setTimeout(() => buyerElements.drawer?.focus(), 0);
        },
      });
    } else {
      drawerMotion.close(buyerElements.drawer, buyerElements.drawerBackdrop, {
        bodyClass: "buyer-data-drawer-open",
      });
    }
    return;
  }
  buyerElements.drawer.hidden = !isOpen;
  buyerElements.drawerBackdrop.hidden = !isOpen;
  document.body.classList.toggle("buyer-data-drawer-open", isOpen);
  if (isOpen) {
    window.setTimeout(() => buyerElements.drawer?.focus(), 0);
  }
}

function openBuyerDrawer(buyerId, tab = "overview") {
  if (tab === "activity") {
    openBuyerActivityModal(buyerId);
    return;
  }

  const buyer = getBuyerById(buyerId);
  if (!buyer) {
    return;
  }
  buyerState.activeBuyerId = getBuyerId(buyer);
  buyerState.activeTab = tab;
  renderBuyerDrawer();
  setBuyerDrawerOpen(true);
}

function closeBuyerDrawer() {
  setBuyerDrawerOpen(false);
}

function renderBuyerDrawerIdentity(account) {
  if (!buyerElements.drawerIdentity) {
    return;
  }
  buyerElements.drawerIdentity.replaceChildren();
  const title = createElement("h2", "");
  title.id = "buyer-drawer-title";
  title.textContent = "User Profile";
  buyerElements.drawerIdentity.append(title);
}

function renderBuyerDrawer() {
  const buyer = getBuyerById(buyerState.activeBuyerId);
  if (!buyer || !buyerElements.drawerContent) {
    return;
  }
  if (buyerState.activeTab === "activity") {
    buyerState.activeTab = "overview";
  }

  renderBuyerDrawerIdentity(buyer);
  buyerElements.drawerTabs.forEach((tab) => {
    const isActive = tab.dataset.buyerTab === buyerState.activeTab;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", isActive ? "true" : "false");
  });

  buyerElements.drawerContent.replaceChildren();
  if (buyerState.activeTab === "orders") {
    buyerElements.drawerContent.appendChild(renderOrderHistory(buyer, false));
  } else if (buyerState.activeTab === "bookings") {
    buyerElements.drawerContent.appendChild(renderOrderHistory(buyer, true));
  } else if (buyerState.activeTab === "reports") {
    buyerElements.drawerContent.appendChild(renderReports(buyer));
  } else {
    buyerElements.drawerContent.appendChild(renderOverview(buyer));
  }
}

function createBuyerDrawerStatItem(iconPath, label, value) {
  const item = createElement("div", "super-admin-company-drawer__stat-item");
  item.dataset.buyerDrawerStat = normalizeKey(label);
  const icon = createElement("span", "super-admin-company-drawer__stat-icon");
  icon.appendChild(createSvgIcon(iconPath));
  const copy = createElement("span", "super-admin-company-drawer__stat-copy");
  copy.append(
    createElement("strong", "super-admin-company-drawer__stat-value", value),
    createElement("span", "super-admin-company-drawer__stat-label", label),
  );
  item.append(icon, copy);
  return item;
}

function getBuyerDrawerStatusDescriptor(account) {
  const status = getBuyerStatus(account);
  if (status === "banned" || status === "deleted") {
    return { label: getBuyerStatusLabel(status), tone: "danger" };
  }
  if (status === "restricted") {
    return { label: getBuyerStatusLabel(status), tone: "warning" };
  }
  return { label: isBuyerOnline(account) ? "Online" : "Active", tone: isBuyerOnline(account) ? "success" : "neutral" };
}

function getBuyerDrawerVerificationDescriptor(account) {
  const verification = getBuyerVerificationStatus(account);
  if (verification === "verified") {
    return { label: "Verified", tone: "success" };
  }
  if (verification === "rejected") {
    return { label: "Rejected", tone: "danger" };
  }
  return { label: getBuyerVerificationLabel(verification), tone: "warning" };
}

function getBuyerDrawerRestrictionLevel(account) {
  const descriptor = getBuyerRestrictionDescriptor(account);
  const meter = Math.max(0, Math.min(3, Number(descriptor.meter) || 0));
  return {
    label: descriptor.label,
    meter,
    tone: meter >= 3 ? "danger" : meter > 0 ? "warning" : "neutral",
  };
}

function createBuyerDrawerOverviewRow(iconPath, label, descriptor) {
  const row = createElement("div", "super-admin-company-drawer__overview-row");
  const icon = createElement("span", "super-admin-company-drawer__overview-icon");
  icon.appendChild(createSvgIcon(iconPath));
  const labelElement = createElement("span", "super-admin-company-drawer__overview-label", label);
  const chip = createElement("span", `super-admin-company-drawer__status-chip is-${descriptor.tone || "neutral"}`);

  const activeBarCount = Math.max(0, Math.min(3, Number(descriptor.meter) || 0));
  if (activeBarCount > 0) {
    chip.classList.add("super-admin-company-drawer__restriction-meter");
    chip.append(
      createElement("span", "super-admin-company-drawer__restriction-label", descriptor.label),
      createElement("span", "super-admin-company-drawer__restriction-bars"),
    );
    const bars = chip.querySelector(".super-admin-company-drawer__restriction-bars");
    bars.setAttribute("aria-hidden", "true");
    for (let index = 0; index < 3; index += 1) {
      const bar = createElement("span");
      bar.classList.toggle("is-active", index < activeBarCount);
      bars.appendChild(bar);
    }
  } else {
    chip.textContent = descriptor.label;
  }

  row.append(icon, labelElement, chip);
  return row;
}

function createBuyerDrawerInfoRow(label, values) {
  const row = createElement("div", "super-admin-company-drawer__info-row");
  const labelElement = createElement("span", "super-admin-company-drawer__info-label", label);
  const valueElement = createElement("span", "super-admin-company-drawer__info-value");
  for (const value of Array.isArray(values) ? values : [values]) {
    valueElement.appendChild(createElement("span", "", normalizeText(value) || "-"));
  }
  row.append(labelElement, valueElement);
  return row;
}

function getBuyerDrawerWarningDescriptor(account) {
  const status = getBuyerStatus(account);
  const reports = normalizeReportRecords(account).length;
  const restriction = getBuyerRestrictionDescriptor(account);
  if (status === "banned" || status === "deleted") {
    return {
      tone: "danger",
      heading: "Account is blocked",
      reason: getBuyerStatusLabel(status),
      description: "This user currently has no normal account access.",
      meta: reports ? `${formatNumber(reports)} report${reports === 1 ? "" : "s"} recorded` : "No reports recorded",
    };
  }
  if (status === "restricted") {
    return {
      tone: "warning",
      heading: "Account has limited access",
      reason: `${getBuyerStatusLabel(status)} account`,
      description: `Restriction level is ${restriction.label.toLowerCase()}. Review the account before restoring full access.`,
      meta: reports ? `${formatNumber(reports)} report${reports === 1 ? "" : "s"} recorded` : "No reports recorded",
    };
  }
  if (reports > 0) {
    return {
      tone: "warning",
      heading: "Reports need review",
      reason: `${formatNumber(reports)} report${reports === 1 ? "" : "s"} recorded`,
      description: "Check reports and activity logs before applying account actions.",
      meta: `Last active ${formatRelativeTime(getBuyerLastActive(account))}`,
    };
  }
  return {
    tone: "clear",
    heading: "No active warning",
    reason: "Account looks clear",
    description: "No restrictions, bans, or reports are currently attached to this user.",
    meta: `Last active ${formatRelativeTime(getBuyerLastActive(account))}`,
  };
}

function createDetailItem(label, value) {
  const item = createElement("div", "buyer-data-detail");
  item.append(createElement("span", "", label), createElement("strong", "", normalizeText(value) || "-"));
  return item;
}

function renderOverview(account) {
  const wrap = createElement("div", "buyer-data-overview buyer-data-drawer-profile");
  const status = getBuyerStatus(account);
  const warningDescriptor = getBuyerDrawerWarningDescriptor(account);

  const summary = createElement("div", "super-admin-company-drawer__summary");
  const avatar = createBuyerAvatar(account);
  avatar.classList.add("super-admin-company-drawer__logo");
  const profileStatus = createElement("span", "super-admin-company-drawer__profile-status");
  profileStatus.classList.add(
    status === "banned" || status === "deleted"
      ? "is-danger"
      : status === "restricted"
        ? "is-warning"
        : isBuyerOnline(account)
          ? "is-online"
          : "is-offline",
  );
  avatar.appendChild(profileStatus);
  const summaryCopy = createElement("div", "super-admin-company-drawer__summary-copy");
  summaryCopy.append(
    createElement("strong", "", getBuyerName(account)),
    createElement("span", "", getBuyerEmail(account) || getBuyerCode(account)),
    createElement("span", "", getBuyerPhone(account) || "No phone"),
  );
  summary.append(avatar, summaryCopy);

  const stats = createElement("div", "super-admin-company-drawer__stats");
  stats.append(
    createBuyerDrawerStatItem(buyerDrawerIconPaths.orders, "Orders", formatNumber(getBuyerOrderCount(account))),
    createBuyerDrawerStatItem(buyerDrawerIconPaths.bookings, "Bookings", formatNumber(getBuyerBookingCount(account))),
    createBuyerDrawerStatItem(buyerDrawerIconPaths.reports, "Reports", formatNumber(normalizeReportRecords(account).length)),
    createBuyerDrawerStatItem(buyerDrawerIconPaths.activity, "Activity", formatNumber(getBuyerActivityRecords(account).length)),
  );

  const overview = createElement("div", "super-admin-company-drawer__overview");
  overview.append(
    createBuyerDrawerOverviewRow(buyerDrawerIconPaths.status, "Account Status", getBuyerDrawerStatusDescriptor(account)),
    createBuyerDrawerOverviewRow(buyerDrawerIconPaths.verification, "Verification", getBuyerDrawerVerificationDescriptor(account)),
    createBuyerDrawerOverviewRow(buyerDrawerIconPaths.restriction, "Restriction Level", getBuyerDrawerRestrictionLevel(account)),
  );

  const information = createElement("div", "super-admin-company-drawer__information");
  information.append(
    createBuyerDrawerInfoRow("User ID", getBuyerCode(account)),
    createBuyerDrawerInfoRow("Address", getBuyerAddress(account)),
    createBuyerDrawerInfoRow("Registered", formatDateTime(account?.createdAt)),
    createBuyerDrawerInfoRow("Last Active", formatDateTime(getBuyerLastActive(account))),
  );

  const warningSection = createElement("section", "super-admin-company-drawer__section");
  const warningHeading = createElement("div", "super-admin-company-drawer__section-heading");
  warningHeading.appendChild(createElement("h3", "", "Warning / Penalty Details"));
  const warningCard = createElement("div", `super-admin-company-drawer__warning-card is-${warningDescriptor.tone}`);
  const warningIcon = createElement("span", "super-admin-company-drawer__warning-icon");
  warningIcon.appendChild(createSvgIcon(
    warningDescriptor.tone === "clear"
      ? buyerDrawerIconPaths.verification
      : warningDescriptor.tone === "danger"
        ? buyerListActionIconPaths.ban
        : buyerListActionIconPaths.restrict,
  ));
  const warningCopy = createElement("span", "super-admin-company-drawer__warning-copy");
  warningCopy.append(
    createElement("strong", "", warningDescriptor.heading),
    createElement("span", "super-admin-company-drawer__warning-reason", warningDescriptor.reason),
    createElement("span", "super-admin-company-drawer__warning-description", warningDescriptor.description),
    createElement("small", "", warningDescriptor.meta),
  );
  warningCard.append(warningIcon, warningCopy);
  warningSection.append(warningHeading, warningCard);

  const actionsSection = createElement("section", "super-admin-company-drawer__section super-admin-company-drawer__actions-section");
  const actionsHeading = createElement("div", "super-admin-company-drawer__section-heading");
  actionsHeading.appendChild(createElement("h3", "", "Action"));
  const actionsGrid = createElement("div", "super-admin-company-drawer__actions-grid");
  actionsGrid.setAttribute("aria-label", `Actions for ${getBuyerName(account)}`);
  getBuyerActionDefinitions(account)
    .filter((action) => action.id !== "view-profile")
    .forEach((action) => {
      const actionElement = createBuyerActionElement(action);
      actionElement.classList.add("super-admin-company-drawer__action-button");
      actionElement.removeAttribute("role");
      actionsGrid.appendChild(actionElement);
    });
  actionsSection.append(actionsHeading, actionsGrid);

  wrap.append(summary, stats, overview, information, warningSection, actionsSection);
  return wrap;
}

function getOrderCreatedAt(order) {
  return order?.createdAt || (order?.createdAtEpochMs ? new Date(Number(order.createdAtEpochMs)).toISOString() : "");
}

function getOrderTotal(order) {
  return order?.grandTotalAmount ?? order?.amountToPayAmount ?? order?.total ?? order?.amount ?? order?.price;
}

function renderOrderHistory(account, bookingsOnly) {
  const records = bookingsOnly ? getBuyerBookings(account) : getBuyerOrders(account, false);
  const wrap = createElement("section", "buyer-data-history");
  const title = createElement("h3", "", bookingsOnly ? "Bookings" : "Orders");
  wrap.appendChild(title);

  if (!records.length) {
    wrap.appendChild(createElement("div", "buyer-data-empty buyer-data-empty--compact", bookingsOnly ? "No booking history yet." : "No order history yet."));
    return wrap;
  }

  const table = document.createElement("table");
  table.className = "buyer-data-mini-table";
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  ["ID", "Seller / Business", "Product / Service", "Total", "Payment", "Status", "Date"].forEach((label) => {
    const th = document.createElement("th");
    th.scope = "col";
    th.textContent = label;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  const tbody = document.createElement("tbody");
  records
    .slice()
    .sort((first, second) => (parseDate(getOrderCreatedAt(second))?.getTime() || 0) - (parseDate(getOrderCreatedAt(first))?.getTime() || 0))
    .forEach((order) => {
      const row = document.createElement("tr");
      [
        normalizeText(order?.bookingId || order?.orderId || order?.id),
        normalizeText(order?.companyName || order?.storeName || order?.sellerName || order?.adminId),
        normalizeText(order?.serviceName || order?.productName || order?.product || "Order item"),
        formatMoney(getOrderTotal(order)),
        normalizeText(order?.paymentStatus || order?.paymentOptionLabel || order?.paymentMethod || order?.payment || "-"),
        normalizeText(order?.bookingStatus || order?.orderStatus || order?.stage || order?.status || "-"),
        formatDateTime(getOrderCreatedAt(order)),
      ].forEach((value) => {
        const td = document.createElement("td");
        td.textContent = value || "-";
        row.appendChild(td);
      });
      tbody.appendChild(row);
    });
  table.append(thead, tbody);
  wrap.appendChild(table);
  return wrap;
}

function normalizeReportRecords(account) {
  const reports = []
    .concat(Array.isArray(account?.buyerReports) ? account.buyerReports : [])
    .concat(Array.isArray(account?.reports) ? account.reports : [])
    .concat(Array.isArray(account?.violations) ? account.violations : []);
  return reports.filter((report) => report && typeof report === "object");
}

function renderReports(account) {
  const wrap = createElement("section", "buyer-data-reports");
  wrap.appendChild(createElement("h3", "", "Reports and Violations"));
  const reports = normalizeReportRecords(account);
  if (!reports.length) {
    wrap.appendChild(createElement("div", "buyer-data-empty buyer-data-empty--compact", "No reports or violations recorded."));
    return wrap;
  }
  const list = createElement("div", "buyer-data-report-list");
  reports.forEach((report) => {
    const card = createElement("article", "buyer-data-report");
    card.append(
      createElement("strong", "", normalizeText(report.reason || report.reportReason || report.type || "Report")),
      createElement("span", "", `Related: ${normalizeText(report.relatedOrderId || report.orderId || report.bookingId || "N/A")}`),
      createElement("span", "", `Evidence: ${normalizeText(report.evidence || report.evidenceUrl || "No evidence attached")}`),
      createElement("span", "", `Status: ${normalizeText(report.status || "Pending")}`),
      createElement("span", "", `Decision: ${normalizeText(report.adminDecision || report.decision || "No decision yet")}`),
    );
    list.appendChild(card);
  });
  wrap.appendChild(list);
  return wrap;
}

function getBuyerActivityRecords(account) {
  const cacheKey = getBuyerActivityCacheKey(account);
  if (cacheKey && buyerActivityLogCache.has(cacheKey)) {
    return buyerActivityLogCache.get(cacheKey);
  }

  return getBuyerFallbackActivityRecords(account);
}

function getBuyerFallbackActivityRecords(account) {
  return []
    .concat(Array.isArray(account?.buyerAdminActions) ? account.buyerAdminActions : [])
    .concat(Array.isArray(account?.superAdminBuyerActions) ? account.superAdminBuyerActions : [])
    .concat(Array.isArray(account?.buyerSecurityActions) ? account.buyerSecurityActions : [])
    .concat(Array.isArray(account?.buyerNotifications) ? account.buyerNotifications : [])
    .filter((entry) => entry && typeof entry === "object")
    .sort((first, second) => (parseDate(second.createdAt || second.sentAt)?.getTime() || 0) - (parseDate(first.createdAt || first.sentAt)?.getTime() || 0));
}

function getBuyerActivityCacheKey(accountOrId) {
  if (accountOrId && typeof accountOrId === "object") {
    return normalizeKey(getBuyerId(accountOrId));
  }
  return normalizeKey(accountOrId);
}

function refreshBuyerActivityDrawer(buyerId) {
  const cacheKey = getBuyerActivityCacheKey(buyerId);
  if (
    activeBuyerActivityModal instanceof HTMLElement &&
    getBuyerActivityCacheKey(activeBuyerActivityModal.dataset.buyerActivityId) === cacheKey
  ) {
    const buyer = getBuyerById(buyerId);
    const modalBody = activeBuyerActivityModal.querySelector("[data-buyer-activity-modal-body]");
    if (buyer && modalBody instanceof HTMLElement) {
      renderBuyerActivityModalContent(buyer, modalBody);
    }
  }

  if (getBuyerActivityCacheKey(buyerState.activeBuyerId) === cacheKey && !buyerElements.drawer?.hidden) {
    renderBuyerDrawer();
  }
}

async function loadBuyerActivityLogs(buyerId, options = {}) {
  const cacheKey = getBuyerActivityCacheKey(buyerId);
  if (!cacheKey) {
    return;
  }
  if (!options.force && (buyerActivityLogCache.has(cacheKey) || buyerActivityLogLoading.has(cacheKey))) {
    return;
  }

  buyerActivityLogLoading.add(cacheKey);
  buyerActivityLogErrors.delete(cacheKey);

  try {
    const response = await fetch(`/api/super-admin/buyers/${encodeURIComponent(buyerId)}/activity?limit=50`, {
      cache: "no-store",
      headers: getSuperAdminHeaders({ Accept: "application/json" }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || "Unable to load buyer activity.");
    }
    buyerActivityLogCache.set(cacheKey, Array.isArray(data.activities) ? data.activities : []);
  } catch (error) {
    buyerActivityLogErrors.set(cacheKey, error instanceof Error ? error.message : "Unable to load buyer activity.");
  } finally {
    buyerActivityLogLoading.delete(cacheKey);
    refreshBuyerActivityDrawer(buyerId);
  }
}

function invalidateBuyerActivityLogs(buyerId) {
  const cacheKey = getBuyerActivityCacheKey(buyerId);
  if (!cacheKey) {
    return;
  }
  buyerActivityLogCache.delete(cacheKey);
  buyerActivityLogErrors.delete(cacheKey);
}

function getBuyerActivityActionTone(activityOrKind) {
  const normalizedKind = normalizeKey(
    activityOrKind && typeof activityOrKind === "object"
      ? [
          activityOrKind.kind,
          activityOrKind.activity,
          activityOrKind.action,
          activityOrKind.type,
          activityOrKind.title,
        ].filter(Boolean).join(" ")
      : activityOrKind,
  );
  if (
    normalizedKind.includes("delete") ||
    normalizedKind.includes("deleted") ||
    normalizedKind.includes("remove") ||
    normalizedKind.includes("removed") ||
    normalizedKind.includes("cancel")
  ) {
    return "delete";
  }
  if (
    normalizedKind.includes("add") ||
    normalizedKind.includes("added") ||
    normalizedKind.includes("created") ||
    normalizedKind.includes("registered") ||
    normalizedKind.includes("upload")
  ) {
    return "add";
  }
  if (
    normalizedKind.includes("edit") ||
    normalizedKind.includes("edited") ||
    normalizedKind.includes("update") ||
    normalizedKind.includes("updated") ||
    normalizedKind.includes("change") ||
    normalizedKind.includes("changed") ||
    normalizedKind.includes("review") ||
    normalizedKind.includes("rating")
  ) {
    return "edit";
  }
  return "";
}

function getBuyerActivityIconPath(activityOrKind) {
  const normalizedKind = normalizeKey(
    activityOrKind && typeof activityOrKind === "object"
      ? activityOrKind.kind
      : activityOrKind,
  );
  const actionTone = getBuyerActivityActionTone(activityOrKind);
  if (actionTone === "delete") {
    return buyerActivityActionIconPaths.trash;
  }
  if (actionTone === "add") {
    return buyerActivityActionIconPaths.addList;
  }
  if (actionTone === "edit") {
    return buyerActivityActionIconPaths.editList;
  }
  if (normalizedKind === "checkout" || normalizedKind === "cancel-order") {
    return buyerListActionIconPaths.orders;
  }
  if (normalizedKind === "booking") {
    return buyerListActionIconPaths.bookings;
  }
  if (normalizedKind === "reports") {
    return buyerDrawerIconPaths.reports;
  }
  if (normalizedKind === "user-login" || normalizedKind === "user-logout" || normalizedKind === "update-profile") {
    return buyerListActionIconPaths["view-profile"];
  }
  return buyerListActionIconPaths.activity;
}

function createBuyerActivityLibraryIcon(config) {
  const icons = window.lucide?.icons || {};
  if (config?.lucide && Array.isArray(icons[config.lucide]) && window.lucide?.createElement) {
    const svgElement = window.lucide.createElement(icons[config.lucide], {
      "aria-hidden": "true",
      focusable: "false",
    });
    svgElement.setAttribute("viewBox", "0 0 24 24");
    svgElement.setAttribute("fill", "none");
    svgElement.setAttribute("stroke", "currentColor");
    svgElement.setAttribute("stroke-width", "2");
    svgElement.setAttribute("stroke-linecap", "round");
    svgElement.setAttribute("stroke-linejoin", "round");
    return svgElement;
  }

  const tablerPath = config?.tabler ? window.tablerIcons?.icons?.[config.tabler] || "" : "";
  return createSvgIcon(tablerPath || config?.fallback || buyerListActionIconPaths.activity);
}

function createBuyerActivityIcon(entry) {
  const actionTone = getBuyerActivityActionTone(entry);
  if (actionTone && buyerActivityActionIconConfigs[actionTone]) {
    return createBuyerActivityLibraryIcon(buyerActivityActionIconConfigs[actionTone]);
  }
  return createSvgIcon(getBuyerActivityIconPath(entry));
}

function formatBuyerActivityDateParts(value) {
  const date = parseDate(value);
  if (!date) {
    return { date: "-", time: "" };
  }
  return {
    date: date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    time: date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }),
  };
}

function createBuyerActivityHeaderRow() {
  const row = createElement("div", "super-admin-company-activity-log__row super-admin-company-activity-log__row--header");
  ["Activity", "User", "Details", "IP Address", "Date & Time"].forEach((label) => {
    row.appendChild(createElement("div", "super-admin-company-activity-log__cell", label));
  });
  return row;
}

function createBuyerActivityTableRow(entry) {
  const row = createElement("div", "super-admin-company-activity-log__row");
  const activityCell = createElement("div", "super-admin-company-activity-log__cell super-admin-company-activity-log__cell--activity");
  const icon = createElement("span", "super-admin-company-activity-log__icon");
  const activityTone = getBuyerActivityActionTone(entry);
  if (activityTone) {
    icon.classList.add(`is-${activityTone}`);
  }
  icon.appendChild(createBuyerActivityIcon(entry));
  activityCell.append(
    icon,
    createElement("span", "super-admin-company-activity-log__activity-label", normalizeText(entry?.activity || entry?.action || entry?.type || entry?.title || "Buyer Activity")),
  );

  const userCell = createElement("div", "super-admin-company-activity-log__cell super-admin-company-activity-log__cell--user");
  userCell.append(
    createElement("strong", "", normalizeText(entry?.userName || entry?.createdBy || entry?.sentBy || entry?.admin || getBuyerName(getBuyerById(buyerState.activeBuyerId)) || "Buyer")),
    createElement("span", "", normalizeText(entry?.userEmail || entry?.email || "")),
  );

  const detailsCell = createElement(
    "div",
    "super-admin-company-activity-log__cell super-admin-company-activity-log__cell--details",
    normalizeText(entry?.details || entry?.description || entry?.reason || entry?.message || entry?.internalNote || entry?.note || "Buyer activity recorded."),
  );
  const ipCell = createElement(
    "div",
    "super-admin-company-activity-log__cell super-admin-company-activity-log__cell--ip",
    normalizeText(entry?.ipAddress || entry?.ip || "-") || "-",
  );
  const dateParts = formatBuyerActivityDateParts(entry?.createdAt || entry?.sentAt);
  const dateCell = createElement("div", "super-admin-company-activity-log__cell super-admin-company-activity-log__cell--date");
  dateCell.append(createElement("span", "", dateParts.date), createElement("span", "", dateParts.time));

  row.append(activityCell, userCell, detailsCell, ipCell, dateCell);
  return row;
}

function createBuyerActivityStatus(message, options = {}) {
  const status = createElement(
    "div",
    `super-admin-company-activity-log__status${options.error ? " is-error" : ""}`,
    message,
  );
  if (options.retry) {
    const retry = createElement("button", "super-admin-company-activity-log__retry", "Retry");
    retry.type = "button";
    retry.addEventListener("click", () => options.retry());
    status.appendChild(retry);
  }
  return status;
}

function createBuyerActivityTable(account) {
  const buyerId = getBuyerId(account);
  const cacheKey = getBuyerActivityCacheKey(account);
  const entries = getBuyerActivityRecords(account);
  const isLoading = cacheKey ? buyerActivityLogLoading.has(cacheKey) : false;
  const errorMessage = cacheKey ? buyerActivityLogErrors.get(cacheKey) : "";
  const table = createElement("div", "super-admin-company-activity-log__table buyer-data-activity-log__table");
  table.appendChild(createBuyerActivityHeaderRow());
  if (!entries.length) {
    if (isLoading) {
      table.appendChild(createBuyerActivityStatus("Loading latest buyer activity..."));
    } else if (errorMessage) {
      table.appendChild(createBuyerActivityStatus(errorMessage, {
        error: true,
        retry: () => loadBuyerActivityLogs(buyerId, { force: true }),
      }));
    } else {
      table.appendChild(createBuyerActivityStatus("No recent buyer activity recorded."));
    }
    return table;
  }

  entries.forEach((entry) => {
    table.appendChild(createBuyerActivityTableRow(entry));
  });
  if (isLoading) {
    table.appendChild(createBuyerActivityStatus("Refreshing latest buyer activity..."));
  } else if (errorMessage) {
    table.appendChild(createBuyerActivityStatus(errorMessage, {
      error: true,
      retry: () => loadBuyerActivityLogs(buyerId, { force: true }),
    }));
  }
  return table;
}

function renderBuyerActivityModalContent(account, modalBody) {
  if (!(modalBody instanceof HTMLElement)) {
    return;
  }

  const buyerId = getBuyerId(account);
  activeBuyerActivityModal?.setAttribute("data-buyer-activity-id", buyerId);
  modalBody.replaceChildren(createBuyerActivityTable(account));
}

function handleBuyerActivityModalKeydown(event) {
  if (event.key !== "Escape") {
    return;
  }

  event.preventDefault();
  closeBuyerActivityModal();
}

function closeBuyerActivityModal(options = {}) {
  if (!(activeBuyerActivityModal instanceof HTMLElement)) {
    return;
  }

  const modal = activeBuyerActivityModal;
  activeBuyerActivityModal = null;
  modal.remove();
  document.removeEventListener("keydown", handleBuyerActivityModalKeydown);
  document.body.classList.remove("super-admin-company-activity-modal-open");
  if (options.restoreFocus !== false && activeBuyerActivityModalTrigger instanceof HTMLElement) {
    activeBuyerActivityModalTrigger.focus();
  }
  activeBuyerActivityModalTrigger = null;
}

function openBuyerActivityModal(buyerId, options = {}) {
  const buyer = getBuyerById(buyerId);
  if (!buyer) {
    return;
  }

  closeBuyerActivityModal({ restoreFocus: false });
  activeBuyerActivityModalTrigger = document.activeElement instanceof HTMLElement
    ? document.activeElement
    : null;
  buyerState.activeBuyerId = getBuyerId(buyer);
  closeBuyerDrawer();
  if (activeBuyerActivityModalTrigger && buyerElements.drawer?.contains(activeBuyerActivityModalTrigger)) {
    activeBuyerActivityModalTrigger = null;
  }

  const titleId = `buyer-activity-modal-title-${Date.now()}`;
  const overlay = createElement("div", "super-admin-company-activity-modal-overlay buyer-data-activity-modal-overlay");
  overlay.dataset.buyerActivityId = getBuyerId(buyer);

  const dialog = createElement("section", "super-admin-company-activity-modal buyer-data-activity-modal");
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-labelledby", titleId);
  dialog.tabIndex = -1;

  const closeButton = createElement("button", "super-admin-company-activity-modal__close");
  closeButton.type = "button";
  closeButton.title = "Close";
  closeButton.setAttribute("aria-label", "Close activity logs");
  closeButton.appendChild(createCloseIconSvg());

  const header = createElement("header", "super-admin-company-activity-modal__header");
  const headerIcon = createElement("span", "super-admin-company-activity-modal__icon");
  headerIcon.setAttribute("aria-hidden", "true");
  headerIcon.appendChild(createBuyerActivityLibraryIcon({
    lucide: "History",
    tabler: "history",
    fallback: buyerListActionIconPaths.activity,
  }));
  const titleCopy = createElement("span", "super-admin-company-activity-modal__title-copy");
  const title = createElement("h2", "", "Activity Logs");
  title.id = titleId;
  titleCopy.append(title, createElement("span", "", getBuyerName(buyer)));
  header.append(headerIcon, titleCopy);

  const modalBody = createElement("div", "super-admin-company-activity-modal__body");
  modalBody.dataset.buyerActivityModalBody = "";
  dialog.append(closeButton, header, modalBody);
  overlay.appendChild(dialog);
  activeBuyerActivityModal = overlay;
  document.body.appendChild(overlay);
  document.body.classList.add("super-admin-company-activity-modal-open");

  const cacheKey = getBuyerActivityCacheKey(buyer);
  if (options.force === true || (cacheKey && !buyerActivityLogCache.has(cacheKey))) {
    void loadBuyerActivityLogs(getBuyerId(buyer), { force: options.force === true });
  }
  renderBuyerActivityModalContent(buyer, modalBody);

  closeButton.addEventListener("click", () => closeBuyerActivityModal());
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closeBuyerActivityModal();
    }
  });
  document.addEventListener("keydown", handleBuyerActivityModalKeydown);
  window.setTimeout(() => dialog.focus(), 0);
}

function clearBuyerMenuPosition(dropdown) {
  const menu = dropdown?.querySelector?.("[data-buyer-menu]");
  if (!(menu instanceof HTMLElement)) {
    return;
  }
  menu.classList.remove(
    "is-cursor-positioned",
    "is-fixed-positioned",
    "is-trigger-positioned",
    "is-open-up",
  );
  for (const property of [
    "position",
    "top",
    "right",
    "bottom",
    "left",
    "transform",
    "transform-origin",
    "--company-action-menu-arrow-left",
  ]) {
    menu.style.removeProperty(property);
  }
}

function positionBuyerMenuAtCursor(dropdown, cursorPosition) {
  const menu = dropdown?.querySelector?.("[data-buyer-menu]");
  if (!(menu instanceof HTMLElement) || !cursorPosition) {
    return;
  }

  const viewportPadding = 8;
  const cursorX = Number(cursorPosition.clientX);
  const cursorY = Number(cursorPosition.clientY);
  if (!Number.isFinite(cursorX) || !Number.isFinite(cursorY)) {
    return;
  }

  menu.classList.add("is-fixed-positioned", "is-cursor-positioned");
  menu.classList.remove("is-trigger-positioned");
  menu.style.setProperty("position", "fixed");
  menu.style.setProperty("right", "auto");
  menu.style.setProperty("bottom", "auto");

  const rect = menu.getBoundingClientRect();
  const menuWidth = rect.width || menu.offsetWidth || 176;
  const menuHeight = rect.height || menu.offsetHeight || 220;
  const arrowInset = 14;
  const maxLeft = Math.max(viewportPadding, window.innerWidth - menuWidth - viewportPadding);
  const left = Math.min(Math.max(cursorX - menuWidth / 2, viewportPadding), maxLeft);
  const hasRoomBelow = cursorY + 10 + menuHeight + viewportPadding <= window.innerHeight;
  const hasRoomAbove = cursorY - menuHeight - 10 - viewportPadding >= 0;
  const opensUp = !hasRoomBelow && hasRoomAbove;
  const preferredTop = opensUp ? cursorY - menuHeight - 10 : cursorY + 10;
  const maxTop = Math.max(viewportPadding, window.innerHeight - menuHeight - viewportPadding);
  const top = Math.min(Math.max(preferredTop, viewportPadding), maxTop);
  const arrowLeft = Math.min(
    Math.max(cursorX - left, arrowInset),
    Math.max(arrowInset, menuWidth - arrowInset),
  );

  menu.classList.toggle("is-open-up", opensUp);
  menu.style.setProperty("transform", "none");
  menu.style.setProperty("transform-origin", opensUp ? "center bottom" : "center top");
  menu.style.setProperty("left", `${left}px`);
  menu.style.setProperty("top", `${top}px`);
  menu.style.setProperty("--company-action-menu-arrow-left", `${arrowLeft}px`);
}

function positionBuyerMenuAtTrigger(dropdown, triggerElement) {
  const menu = dropdown?.querySelector?.("[data-buyer-menu]");
  if (!(menu instanceof HTMLElement) || !(triggerElement instanceof HTMLElement)) {
    return;
  }

  const viewportPadding = 10;
  const triggerGap = 10;
  const triggerRect = triggerElement.getBoundingClientRect();
  const menuRect = menu.getBoundingClientRect();
  const menuWidth = menuRect.width || menu.offsetWidth || 176;
  const menuHeight = menuRect.height || menu.offsetHeight || 220;
  const arrowInset = 14;
  const triggerCenterX = triggerRect.left + triggerRect.width / 2;
  const preferredLeft = triggerCenterX - menuWidth / 2;
  const maxLeft = Math.max(viewportPadding, window.innerWidth - menuWidth - viewportPadding);
  const left = Math.min(Math.max(preferredLeft, viewportPadding), maxLeft);
  const baseTop = triggerRect.bottom + triggerGap;
  const hasRoomBelow = baseTop + menuHeight + viewportPadding <= window.innerHeight;
  const hasRoomAbove = triggerRect.top - menuHeight - triggerGap - viewportPadding >= 0;
  const opensUp = !hasRoomBelow && hasRoomAbove;
  const preferredTop = opensUp ? triggerRect.top - menuHeight - triggerGap : baseTop;
  const maxTop = Math.max(viewportPadding, window.innerHeight - menuHeight - viewportPadding);
  const top = Math.min(Math.max(preferredTop, viewportPadding), maxTop);
  const arrowLeft = Math.min(
    Math.max(triggerCenterX - left, arrowInset),
    Math.max(arrowInset, menuWidth - arrowInset),
  );

  menu.classList.add("is-fixed-positioned", "is-trigger-positioned");
  menu.classList.remove("is-cursor-positioned");
  menu.classList.toggle("is-open-up", opensUp);
  menu.style.setProperty("position", "fixed");
  menu.style.setProperty("right", "auto");
  menu.style.setProperty("bottom", "auto");
  menu.style.setProperty("transform", "none");
  menu.style.setProperty("transform-origin", opensUp ? "center bottom" : "center top");
  menu.style.setProperty("left", `${left}px`);
  menu.style.setProperty("top", `${top}px`);
  menu.style.setProperty("--company-action-menu-arrow-left", `${arrowLeft}px`);
}

function setBuyerMenuOpen(dropdown, isOpen, options = {}) {
  if (!(dropdown instanceof HTMLElement)) {
    return;
  }

  const menu = dropdown.querySelector("[data-buyer-menu]");
  const toggle = dropdown.querySelector("[data-buyer-menu-toggle]");
  if (toggle instanceof HTMLButtonElement) {
    toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
  }

  if (!isOpen) {
    dropdown.classList.remove("is-open");
    clearBuyerMenuPosition(dropdown);
    if (menu instanceof HTMLElement) {
      menu.classList.remove("is-positioning");
      menu.style.removeProperty("visibility");
      menu.hidden = true;
    }
    return;
  }

  if (menu instanceof HTMLElement) {
    menu.classList.add("is-positioning", "is-fixed-positioned");
    menu.style.setProperty("visibility", "hidden");
    menu.style.setProperty("position", "fixed");
    menu.style.setProperty("right", "auto");
    menu.style.setProperty("bottom", "auto");
    menu.style.setProperty("left", "-9999px");
    menu.style.setProperty("top", "-9999px");
    menu.style.setProperty("transform", "none");
    menu.style.setProperty("transform-origin", "center top");
    menu.hidden = false;
  }

  dropdown.classList.add("is-open");
  const explicitAnchor = options.anchorElement instanceof HTMLElement ? options.anchorElement : null;
  if (explicitAnchor) {
    positionBuyerMenuAtTrigger(dropdown, explicitAnchor);
  } else if (options.cursorPosition) {
    positionBuyerMenuAtCursor(dropdown, options.cursorPosition);
  } else if (toggle instanceof HTMLElement) {
    positionBuyerMenuAtTrigger(dropdown, toggle);
  } else {
    clearBuyerMenuPosition(dropdown);
  }

  if (menu instanceof HTMLElement) {
    menu.classList.remove("is-positioning");
    menu.style.removeProperty("visibility");
  }
}

function closeBuyerMenus(exceptDropdown = null) {
  document.querySelectorAll(".buyer-data-actions").forEach((dropdown) => {
    if (dropdown === exceptDropdown) {
      return;
    }
    setBuyerMenuOpen(dropdown, false);
  });
  if (!exceptDropdown) {
    buyerState.activeMenu = null;
  }
}

function closeBuyerMenusOnScroll() {
  if (!document.querySelector(".buyer-data-actions.is-open")) {
    return;
  }
  closeBuyerMenus();
}

function getBuyerMenuItems(menu) {
  return Array.from(menu?.querySelectorAll("[data-buyer-action]") || []).filter((item) =>
    item instanceof HTMLElement && !item.hidden,
  );
}

function focusBuyerMenuItem(menu, nextIndex = 0) {
  const items = getBuyerMenuItems(menu);
  if (!items.length) {
    return;
  }
  const normalizedIndex = ((nextIndex % items.length) + items.length) % items.length;
  items[normalizedIndex].focus();
}

function openBuyerRowActionMenu(row, options = {}) {
  if (!(row instanceof HTMLElement)) {
    return;
  }
  const dropdown = row.querySelector(".buyer-data-actions");
  if (!(dropdown instanceof HTMLElement)) {
    return;
  }
  closeBuyerMenus(dropdown);
  const explicitAnchor = options.anchorElement instanceof HTMLElement ? options.anchorElement : null;
  const fallbackAnchor = dropdown.querySelector("[data-buyer-menu-toggle]");
  setBuyerMenuOpen(
    dropdown,
    true,
    explicitAnchor
      ? { anchorElement: explicitAnchor }
      : options.cursorPosition
        ? { cursorPosition: options.cursorPosition }
        : { anchorElement: fallbackAnchor },
  );
  buyerState.activeMenu = dropdown.querySelector("[data-buyer-menu]");
  if (options.focusFirst === true) {
    window.requestAnimationFrame(() => focusBuyerMenuItem(buyerState.activeMenu, 0));
  }
}

function toggleBuyerMenu(buyerId, options = {}) {
  const menu = document.querySelector(`[data-buyer-menu="${escapeCssValue(buyerId)}"]`);
  const toggle = document.querySelector(`[data-buyer-menu-toggle="${escapeCssValue(buyerId)}"]`);
  if (!(menu instanceof HTMLElement) || !(toggle instanceof HTMLButtonElement)) {
    return;
  }
  const dropdown = menu.closest(".buyer-data-actions");
  if (!(dropdown instanceof HTMLElement)) {
    return;
  }
  const shouldOpen = menu.hidden;
  if (shouldOpen) {
    closeBuyerMenus(dropdown);
    setBuyerMenuOpen(dropdown, true, { anchorElement: options.anchorElement || toggle });
  } else {
    setBuyerMenuOpen(dropdown, false);
  }
  buyerState.activeMenu = shouldOpen ? menu : null;
}

function handleBuyerMenuKeydown(event) {
  if (!(event.target instanceof Element)) {
    return false;
  }

  const menu = event.target.closest("[data-buyer-menu]");
  if (!(menu instanceof HTMLElement)) {
    return false;
  }

  const items = getBuyerMenuItems(menu);
  const currentIndex = items.findIndex((item) => item === event.target);
  if (!items.length) {
    return false;
  }

  if (event.key === "ArrowDown" || event.key === "ArrowRight") {
    event.preventDefault();
    focusBuyerMenuItem(menu, currentIndex + 1);
    return true;
  }
  if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
    event.preventDefault();
    focusBuyerMenuItem(menu, currentIndex - 1);
    return true;
  }
  if (event.key === "Home") {
    event.preventDefault();
    focusBuyerMenuItem(menu, 0);
    return true;
  }
  if (event.key === "End") {
    event.preventDefault();
    focusBuyerMenuItem(menu, items.length - 1);
    return true;
  }
  if (event.key === "Escape") {
    event.preventDefault();
    const dropdown = menu.closest(".buyer-data-actions");
    setBuyerMenuOpen(dropdown, false);
    dropdown?.querySelector("[data-buyer-menu-toggle]")?.focus?.();
    buyerState.activeMenu = null;
    return true;
  }

  return false;
}

const buyerActionDropdowns = {
  notification: {
    field: buyerElements.actionNotificationField,
    dropdown: buyerElements.actionNotificationDropdown,
    select: buyerElements.actionNotificationType,
    trigger: buyerElements.actionNotificationTrigger,
    label: buyerElements.actionNotificationLabel,
    menu: buyerElements.actionNotificationMenu,
    options: buyerElements.actionNotificationOptions,
    optionKey: "buyerActionNotificationOption",
    emptyLabel: "Select Notification Type",
  },
  reason: {
    field: buyerElements.actionReasonField,
    dropdown: buyerElements.actionReasonDropdown,
    select: buyerElements.actionReason,
    trigger: buyerElements.actionReasonTrigger,
    label: buyerElements.actionReasonLabel,
    menu: buyerElements.actionReasonMenu,
    options: buyerElements.actionReasonOptions,
    optionKey: "buyerActionReasonOption",
    emptyLabel: "Select Reason",
  },
  duration: {
    field: buyerElements.actionDurationRow,
    dropdown: buyerElements.actionDurationUnitDropdown,
    select: buyerElements.actionDurationUnit,
    trigger: buyerElements.actionDurationUnitTrigger,
    label: buyerElements.actionDurationUnitLabel,
    menu: buyerElements.actionDurationUnitMenu,
    options: buyerElements.actionDurationUnitOptions,
    optionKey: "buyerActionDurationUnitOption",
    emptyLabel: "Select Unit",
  },
};

function getBuyerActionDropdown(type) {
  return buyerActionDropdowns[type] || null;
}

function isBuyerActionDropdownVisible(dropdown) {
  return dropdown?.field instanceof HTMLElement && !dropdown.field.hidden;
}

function syncBuyerActionDropdown(type) {
  const dropdown = getBuyerActionDropdown(type);
  const select = dropdown?.select;
  if (!dropdown || !(select instanceof HTMLSelectElement)) {
    return;
  }

  const value = normalizeText(select.value);
  const selectedOption = select.selectedOptions?.[0];
  const placeholder = normalizeText(dropdown.trigger?.dataset.placeholder) || dropdown.emptyLabel;
  const label = value && selectedOption
    ? normalizeText(selectedOption.textContent) || value
    : placeholder;

  if (dropdown.label instanceof HTMLElement) {
    dropdown.label.textContent = label;
    dropdown.label.title = value ? label : "";
  }

  dropdown.options.forEach((option) => {
    const isSelected = option.dataset[dropdown.optionKey] === value;
    option.classList.toggle("is-selected", isSelected);
    option.setAttribute("aria-checked", String(isSelected));
  });
}

function setBuyerActionDropdownOpen(type, isOpen, { focusOption = false } = {}) {
  Object.entries(buyerActionDropdowns).forEach(([dropdownType, dropdown]) => {
    const shouldOpen = Boolean(
      dropdownType === type &&
      isOpen &&
      isBuyerActionDropdownVisible(dropdown),
    );
    dropdown.dropdown?.classList.toggle("is-open", shouldOpen);
    dropdown.trigger?.setAttribute("aria-expanded", String(shouldOpen));
    if (dropdown.menu instanceof HTMLElement) {
      dropdown.menu.hidden = !shouldOpen;
    }

    if (shouldOpen && focusOption) {
      const selectedOption = dropdown.options.find((option) => option.getAttribute("aria-checked") === "true");
      window.setTimeout(() => (selectedOption || dropdown.options[0])?.focus(), 0);
    }
  });
}

function closeBuyerActionDropdowns() {
  Object.keys(buyerActionDropdowns).forEach((type) => setBuyerActionDropdownOpen(type, false));
}

function getOpenBuyerActionDropdownType() {
  return Object.entries(buyerActionDropdowns).find(([, dropdown]) =>
    dropdown.trigger?.getAttribute("aria-expanded") === "true"
  )?.[0] || "";
}

function setBuyerActionDropdownValue(type, value, { dispatchChange = false } = {}) {
  const dropdown = getBuyerActionDropdown(type);
  const select = dropdown?.select;
  if (!dropdown || !(select instanceof HTMLSelectElement)) {
    return;
  }

  const hasOption = Array.from(select.options).some((option) => option.value === value);
  if (!hasOption) {
    return;
  }

  select.value = value;
  syncBuyerActionDropdown(type);
  if (dispatchChange) {
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

function focusBuyerActionDropdownOption(type, offset) {
  const options = getBuyerActionDropdown(type)?.options || [];
  if (!options.length) {
    return;
  }
  const currentIndex = options.indexOf(document.activeElement);
  const nextIndex = currentIndex < 0
    ? (offset < 0 ? options.length - 1 : 0)
    : (currentIndex + offset + options.length) % options.length;
  options[nextIndex]?.focus();
}

function isBuyerModerationAction(action = buyerElements.actionType?.value) {
  return ["restrict", "ban"].includes(normalizeKey(action));
}

function getBuyerActionReasonValue() {
  const action = normalizeKey(buyerElements.actionType?.value);
  const config = buyerActionConfig[action];
  return normalizeText(
    config?.showReasonDropdown
      ? buyerElements.actionReason?.value
      : buyerElements.actionReasonText?.value,
  );
}

function syncBuyerActionAiButton() {
  const button = buyerElements.actionSummarizeAiButton;
  const action = normalizeKey(buyerElements.actionType?.value);
  const isModeration = isBuyerModerationAction(action);
  const hasReason = Boolean(getBuyerActionReasonValue());
  if (buyerElements.actionDescriptionLabel instanceof HTMLElement) {
    buyerElements.actionDescriptionLabel.textContent = isModeration ? "Description" : "Internal Note";
  }
  if (buyerElements.actionNote instanceof HTMLTextAreaElement) {
    buyerElements.actionNote.placeholder = isModeration
      ? "Add a clear description for this action"
      : "Visible to Super Admin only";
  }
  if (!(button instanceof HTMLButtonElement)) {
    return;
  }
  const actionLabel = action === "ban" ? "ban" : "restriction";
  button.hidden = !isModeration;
  button.disabled = !isModeration || !hasReason || buyerState.isSummarizingAction;
  button.classList.toggle("is-loading", buyerState.isSummarizingAction);
  button.setAttribute("aria-busy", String(buyerState.isSummarizingAction));
  button.title = !hasReason
    ? `Select a ${actionLabel} reason, then create a user-ready description`
    : buyerState.isSummarizingAction
      ? `AI is preparing the ${actionLabel} description`
      : `Create a user-ready description from the selected ${actionLabel} reason`;
  if (buyerElements.actionSummarizeAiLabel instanceof HTMLElement) {
    buyerElements.actionSummarizeAiLabel.textContent = buyerState.isSummarizingAction
      ? "Summarizing..."
      : "Summarize with AI";
  }
}

function cancelBuyerActionAiSummary() {
  const controller = buyerActionAiAbortController;
  buyerActionAiAbortController = null;
  if (controller instanceof AbortController) {
    controller.abort();
  }
  buyerState.isSummarizingAction = false;
  syncBuyerActionAiButton();
}

async function summarizeBuyerActionWithAi() {
  const action = normalizeKey(buyerElements.actionType?.value);
  if (!isBuyerModerationAction(action) || buyerState.isSummarizingAction) {
    return;
  }
  const reason = getBuyerActionReasonValue();
  if (!reason) {
    buyerElements.actionFeedback.textContent = `Select a ${action === "ban" ? "ban" : "restriction"} reason before using AI.`;
    buyerElements.actionReasonTrigger?.focus?.();
    return;
  }
  const summarize = window.GMSSuperAdminAI?.summarizeModerationDescription;
  if (typeof summarize !== "function") {
    buyerElements.actionFeedback.textContent = "AI summary is unavailable. Refresh Super Admin and try again.";
    return;
  }

  const buyerId = normalizeText(buyerElements.actionId?.value);
  const buyer = getBuyerById(buyerId);
  const durationValue = Math.max(1, Math.trunc(Number(buyerElements.actionDuration?.value || 1)));
  const durationUnit = normalizeKey(buyerElements.actionDurationUnit?.value || "days");
  const duration = durationUnit === "permanent" ? "Permanent" : `${durationValue} ${durationUnit}`;
  const controller = new AbortController();
  buyerActionAiAbortController = controller;
  buyerState.isSummarizingAction = true;
  buyerElements.actionFeedback.textContent = "AI is preparing the description...";
  syncBuyerActionAiButton();

  try {
    const data = await summarize({
      action,
      subjectType: "user",
      subjectName: getBuyerName(buyer),
      audience: "user",
      reason,
      description: normalizeText(buyerElements.actionNote?.value),
      duration,
      impacts: action === "ban"
        ? ["Permanent user account access block"]
        : ["Temporary limits on selected user account features"],
    }, { signal: controller.signal });
    if (getBuyerActionReasonValue() !== reason || normalizeKey(buyerElements.actionType?.value) !== action) {
      return;
    }
    if (buyerElements.actionNote instanceof HTMLTextAreaElement) {
      buyerElements.actionNote.value = data.summary;
      buyerElements.actionNote.dispatchEvent(new Event("input", { bubbles: true }));
      buyerElements.actionNote.focus();
      buyerElements.actionNote.setSelectionRange(data.summary.length, data.summary.length);
    }
    buyerElements.actionFeedback.textContent = `${data.providerLabel || "AI"} prepared the description from the selected reason.`;
    window.GMSSuperAdminAI?.showSummaryReady?.();
  } catch (error) {
    if (controller.signal.aborted || error?.name === "AbortError") {
      return;
    }
    const needsIntegration = error?.status === 428 || error?.code === "CHAT_AI_UNAVAILABLE";
    buyerElements.actionFeedback.textContent = error instanceof Error
      ? error.message
      : "Unable to summarize the description with AI.";
    if (needsIntegration && typeof window.GMSSuperAdminValidationModal?.showError === "function") {
      void window.GMSSuperAdminValidationModal.showError("AI Integration Required", buyerElements.actionFeedback.textContent);
    }
  } finally {
    if (buyerActionAiAbortController === controller) {
      buyerActionAiAbortController = null;
      buyerState.isSummarizingAction = false;
      syncBuyerActionAiButton();
    }
  }
}

function openActionModal(action, buyerId) {
  const buyer = getBuyerById(buyerId);
  const config = buyerActionConfig[action];
  if (!buyer || !config || !buyerElements.actionDialog || !buyerElements.actionModal) {
    return;
  }
  cancelBuyerActionAiSummary();
  buyerElements.actionId.value = getBuyerId(buyer);
  buyerElements.actionType.value = action;
  buyerElements.actionTitle.textContent = config.title;
  buyerElements.actionCopy.textContent = `${config.copy} User: ${getBuyerName(buyer)}.`;
  buyerElements.actionIcon.replaceChildren(createIcon(config.icon));
  buyerElements.actionDialog.dataset.buyerActionTone = ["notify", "restrict", "ban"].includes(action)
    ? action
    : "default";
  const usesReasonDropdown = config.showReasonDropdown === true;
  const reasonPrompt = config.reasonPrompt || "Select Reason";
  buyerElements.actionReasonTextField.hidden = usesReasonDropdown;
  buyerElements.actionReasonField.hidden = !usesReasonDropdown;
  buyerElements.actionReasonText.value = "";
  buyerElements.actionReasonText.placeholder = config.reasonPlaceholder || "Enter reason";
  buyerElements.actionReasonText.required = !usesReasonDropdown;
  buyerElements.actionReasonTextLabel.textContent = action === "notify" ? "Message" : "Reason";
  buyerElements.actionReason.value = "";
  buyerElements.actionReason.required = false;
  buyerElements.actionReasonTrigger.setAttribute("aria-required", String(usesReasonDropdown));
  buyerElements.actionReasonFieldLabel.textContent = config.reasonLabel || "Reason";
  buyerElements.actionReasonTrigger.dataset.placeholder = reasonPrompt;
  const reasonPlaceholderOption = buyerElements.actionReason.options?.[0];
  if (reasonPlaceholderOption?.value === "") {
    reasonPlaceholderOption.textContent = reasonPrompt;
  }
  buyerElements.actionDuration.value = "1";
  buyerElements.actionDurationUnit.value = config.durationUnit || "days";
  buyerElements.actionDurationRow.hidden = !config.showDuration;
  buyerElements.actionNotificationField.hidden = !config.showNotificationType;
  buyerElements.actionNotificationType.value = "account-warning";
  closeBuyerActionDropdowns();
  Object.keys(buyerActionDropdowns).forEach(syncBuyerActionDropdown);
  buyerElements.actionNote.value = "";
  buyerElements.actionFeedback.textContent = "";
  syncBuyerActionAiButton();
  buyerElements.actionSubmit.textContent = config.button || "Apply Action";
  buyerElements.actionSubmit.classList.toggle("is-danger", Boolean(config.danger));
  buyerElements.actionModal.hidden = false;
  buyerElements.actionDialog.hidden = false;
  document.body.classList.add("buyer-data-modal-open");
  window.setTimeout(() => {
    (usesReasonDropdown ? buyerElements.actionReasonTrigger : buyerElements.actionReasonText)?.focus();
  }, 0);
}

function closeActionModal() {
  cancelBuyerActionAiSummary();
  closeBuyerActionDropdowns();
  buyerElements.actionModal.hidden = true;
  buyerElements.actionDialog.hidden = true;
  buyerElements.actionDialog.removeAttribute("data-buyer-action-tone");
  document.body.classList.remove("buyer-data-modal-open");
}

async function submitBuyerAction(event) {
  event.preventDefault();
  if (buyerState.isSubmittingAction) {
    return;
  }
  const buyerId = normalizeText(buyerElements.actionId?.value);
  const action = normalizeKey(buyerElements.actionType?.value);
  const config = buyerActionConfig[action];
  const reason = normalizeText(
    config?.showReasonDropdown
      ? buyerElements.actionReason?.value
      : buyerElements.actionReasonText?.value,
  );
  const internalNote = normalizeText(buyerElements.actionNote?.value);

  if (!buyerId || !config) {
    return;
  }
  if (!reason) {
    buyerElements.actionFeedback.textContent = "Reason is required.";
    return;
  }
  if (!internalNote) {
    buyerElements.actionFeedback.textContent = isBuyerModerationAction(action)
      ? "Description is required."
      : "Internal note is required.";
    return;
  }

  const fingerprintRequiredActions = new Set(["notify", "restrict", "ban", "suspend"]);
  if (fingerprintRequiredActions.has(action)) {
    const authorize = window.gmsAuthorizeSuperAdminFingerprint;
    if (typeof authorize !== "function") {
      buyerElements.actionFeedback.textContent =
        "Biometric security is unavailable. Connect the retina scan controller, then try again.";
      return;
    }
    const actionLabels = {
      notify: "notify this user",
      restrict: "restrict this user",
      ban: "ban this user",
      suspend: "suspend this user",
    };
    buyerElements.actionFeedback.textContent = "Retina Security · Place your finger to proceed...";
    const authorized = await authorize(actionLabels[action] || "continue this user action");
    if (!authorized) {
      buyerElements.actionFeedback.textContent = "Retina Security cancelled or failed.";
      return;
    }
  }

  buyerState.isSubmittingAction = true;
  buyerElements.actionSubmit.disabled = true;
  buyerElements.actionFeedback.textContent = "Applying action...";

  try {
    const response = await fetch(`/api/super-admin/buyers/${encodeURIComponent(buyerId)}/action`, {
      method: "POST",
      cache: "no-store",
      headers: getSuperAdminHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        action,
        reason,
        internalNote,
        durationValue: Number(buyerElements.actionDuration?.value || 0),
        durationUnit: normalizeText(buyerElements.actionDurationUnit?.value || "days"),
        notificationType: normalizeText(buyerElements.actionNotificationType?.value || ""),
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || "Unable to apply user action.");
    }
    if (data.account) {
      upsertBuyer(data.account);
      invalidateBuyerActivityLogs(getBuyerId(data.account));
    } else {
      invalidateBuyerActivityLogs(buyerId);
    }
    closeActionModal();
    updateSummaryCards();
    renderBuyerTable();
    if (buyerState.activeBuyerId && !buyerElements.drawer?.hidden) {
      renderBuyerDrawer();
    }
    if (activeBuyerActivityModal instanceof HTMLElement) {
      void loadBuyerActivityLogs(activeBuyerActivityModal.dataset.buyerActivityId || buyerId, { force: true });
    }
    const successTitle = buyerActionSuccessTitles[action] || "User Updated";
    const successMessage = normalizeText(data.message) || `${successTitle}.`;
    void window.GMSSuperAdminValidationModal?.showSuccess?.(successTitle, successMessage);
  } catch (error) {
    buyerElements.actionFeedback.textContent = error instanceof Error ? error.message : "Unable to apply user action.";
  } finally {
    buyerState.isSubmittingAction = false;
    buyerElements.actionSubmit.disabled = false;
  }
}

function upsertBuyer(account) {
  if (!isBuyerAccount(account)) {
    return;
  }
  const buyerId = getBuyerId(account);
  const index = buyerState.buyers.findIndex((buyer) => getBuyerId(buyer) === buyerId);
  if (index >= 0) {
    buyerState.buyers[index] = account;
  } else {
    buyerState.buyers.unshift(account);
  }
}

function handleBuyerAction(action, buyerId) {
  closeBuyerMenus();
  if (action === "view-profile") {
    openBuyerDrawer(buyerId, "overview");
    return;
  }
  if (action === "activity") {
    openBuyerActivityModal(buyerId);
    return;
  }
  openActionModal(action, buyerId);
}

function bindEvents() {
  let searchTimer = 0;
  buyerElements.search?.addEventListener("input", (event) => {
    window.clearTimeout(searchTimer);
    const nextSearchTerm = normalizeKey(event.target.value);
    buyerState.searchLoading = Boolean(nextSearchTerm);
    setBuyerSearchInputBusy(buyerState.searchLoading);
    if (!buyerState.searchLoading) {
      buyerState.searchTerm = "";
      buyerState.page = 1;
      renderBuyerTable();
      return;
    }
    renderBuyerTable();
    searchTimer = window.setTimeout(() => {
      buyerState.searchTerm = nextSearchTerm;
      buyerState.searchLoading = false;
      setBuyerSearchInputBusy(false);
      buyerState.page = 1;
      renderBuyerTable();
    }, 250);
  });
  buyerElements.statusFilter?.addEventListener("change", (event) => {
    buyerState.status = normalizeBuyerFilterValue("status", event.target.value);
    buyerState.page = 1;
    syncBuyerFilterControlsFromState();
    syncBuyerFilterSummary();
    renderBuyerTable();
  });
  buyerElements.verificationFilter?.addEventListener("change", (event) => {
    buyerState.verification = normalizeBuyerFilterValue("verification", event.target.value);
    buyerState.page = 1;
    syncBuyerFilterControlsFromState();
    syncBuyerFilterSummary();
    renderBuyerTable();
  });
  buyerElements.dateFilter?.addEventListener("change", (event) => {
    buyerState.dateJoined = normalizeBuyerFilterValue("dateJoined", event.target.value);
    buyerState.page = 1;
    syncBuyerFilterControlsFromState();
    syncBuyerFilterSummary();
    renderBuyerTable();
  });
  buyerElements.sort?.addEventListener("change", (event) => {
    buyerState.sort = [normalizeBuyerSortValue(event.target.value)];
    buyerState.page = 1;
    syncBuyerFilterControlsFromState();
    syncBuyerFilterSummary();
    renderBuyerTable();
  });
  buyerElements.statusSubNavItems.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      const nextStatus = getBuyerStatusForSubNavValue(button.dataset.buyerAccountFilter);
      if (nextStatus === normalizeBuyerFilterValue("status", buyerState.status)) {
        syncBuyerStatusSubNav();
        return;
      }
      setBuyerStatusFromSubNav(button.dataset.buyerAccountFilter);
    });
  });
  buyerElements.filterToggle?.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleBuyerFilterDropdown();
  });
  buyerElements.filterClear?.addEventListener("click", () => {
    clearBuyerFiltersFromControls();
  });
  [...buyerElements.filterControls, ...buyerElements.sortControls].forEach((control) => {
    control.addEventListener("change", () => {
      if (control.matches("[data-buyer-sort]")) {
        enforceBuyerSortCheckboxFallback(control);
      }
      applyBuyerFiltersFromControls();
    });
  });
  buyerElements.resetFilters?.addEventListener("click", () => {
    buyerState.searchTerm = "";
    buyerState.status = buyerFilterDefaults.status;
    buyerState.verification = buyerFilterDefaults.verification;
    buyerState.activity = buyerFilterDefaults.activity;
    buyerState.dateJoined = buyerFilterDefaults.dateJoined;
    buyerState.sort = [buyerFilterDefaults.sort];
    buyerState.page = 1;
    if (buyerElements.search) buyerElements.search.value = "";
    syncBuyerFilterControlsFromState();
    syncBuyerFilterSummary();
    renderBuyerTable();
  });
  buyerElements.pagePrev?.addEventListener("click", () => {
    if (buyerState.page > 1) {
      buyerState.page -= 1;
      renderBuyerTable();
    }
  });
  buyerElements.pageNext?.addEventListener("click", () => {
    const pageCount = Math.max(1, Math.ceil(buyerState.filteredBuyers.length / buyerState.pageSize));
    if (buyerState.page < pageCount) {
      buyerState.page += 1;
      renderBuyerTable();
    }
  });
  buyerElements.pagination?.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }
    const button = event.target.closest("[data-buyer-page]");
    if (!(button instanceof HTMLButtonElement) || button.disabled) {
      return;
    }
    const pageCount = Math.max(1, Math.ceil(buyerState.filteredBuyers.length / buyerState.pageSize));
    const nextPage = Math.min(Math.max(1, Number(button.dataset.buyerPage) || 1), pageCount);
    if (nextPage === buyerState.page) {
      return;
    }
    buyerState.page = nextPage;
    renderBuyerTable();
  });
  buyerElements.pageSize?.addEventListener("change", (event) => {
    buyerState.pageSize = Math.max(1, Number(event.target.value) || 10);
    buyerState.page = 1;
    renderBuyerTable();
  });
  buyerElements.list?.addEventListener("contextmenu", (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }
    if (event.target.closest("[data-buyer-menu]")) {
      return;
    }
    const menuToggle = event.target.closest("[data-buyer-menu-toggle]");
    const row = event.target.closest(".buyer-data-list-row");
    if (!(row instanceof HTMLElement)) {
      return;
    }
    event.preventDefault();
    openBuyerRowActionMenu(
      row,
      menuToggle instanceof HTMLElement
        ? { focusFirst: true, anchorElement: menuToggle }
        : { focusFirst: true, cursorPosition: { clientX: event.clientX, clientY: event.clientY } },
    );
  });
  buyerElements.list?.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }
    if (
      event.target.closest("[data-buyer-action], [data-buyer-menu-toggle], [data-buyer-menu], .buyer-data-actions, [data-sa-secret-reveal], [data-buyer-contact-copy]") ||
      event.target.closest("button, a, input, select, textarea")
    ) {
      return;
    }
    const row = event.target.closest(".buyer-data-list-row");
    if (!(row instanceof HTMLElement)) {
      return;
    }
    closeBuyerMenus();
    openBuyerDrawer(row.dataset.buyerRow || "", "overview");
  });
  buyerElements.list?.addEventListener("keydown", (event) => {
    if (handleBuyerMenuKeydown(event)) {
      return;
    }
    if (!(event.target instanceof Element)) {
      return;
    }
    if (event.target.closest("[data-buyer-action], [data-buyer-menu-toggle], [data-sa-secret-reveal]")) {
      return;
    }
    const row = event.target.closest(".buyer-data-list-row");
    if (!(row instanceof HTMLElement)) {
      return;
    }
    if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
      event.preventDefault();
      openBuyerRowActionMenu(row, { focusFirst: true });
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      closeBuyerMenus();
      openBuyerDrawer(row.dataset.buyerRow || "", "overview");
    }
  });
  document.addEventListener("click", (event) => {
    const openActionDropdownType = getOpenBuyerActionDropdownType();
    const openActionDropdown = getBuyerActionDropdown(openActionDropdownType);
    if (
      openActionDropdown
      && event.target instanceof Node
      && openActionDropdown.dropdown instanceof HTMLElement
      && !openActionDropdown.dropdown.contains(event.target)
    ) {
      setBuyerActionDropdownOpen(openActionDropdownType, false);
    }

    if (event.target.closest("[data-buyer-filter-toggle]")) {
      return;
    }
    if (buyerElements.filterPanel?.contains(event.target)) {
      return;
    }
    toggleBuyerFilterDropdown(false);

    const menuToggle = event.target.closest("[data-buyer-menu-toggle]");
    if (menuToggle) {
      event.stopPropagation();
      toggleBuyerMenu(menuToggle.dataset.buyerMenuToggle || "", { anchorElement: menuToggle });
      return;
    }

    const contactCopy = event.target.closest("[data-buyer-contact-copy]");
    if (contactCopy instanceof HTMLButtonElement) {
      event.preventDefault();
      event.stopPropagation();
      const value = normalizeText(contactCopy.dataset.buyerContactCopy || "");
      const label = normalizeText(contactCopy.dataset.buyerContactLabel || "Value") || "Value";
      void window.GMSSuperAdminClipboard?.copy?.(value, label);
      return;
    }

    const secretReset = event.target.closest("[data-sa-secret-reset]");
    if (secretReset instanceof HTMLButtonElement) {
      event.preventDefault();
      event.stopPropagation();
      void resetBuyerPassword(secretReset);
      return;
    }

    const secretReveal = event.target.closest("[data-sa-secret-reveal]");
    if (secretReveal instanceof HTMLButtonElement) {
      event.preventDefault();
      event.stopPropagation();
      void resetBuyerPassword(secretReveal);
      return;
    }

    const actionButton = event.target.closest("[data-buyer-action]");
    if (actionButton) {
      if (event.target.closest("[data-buyer-contact-copy], [data-sa-secret-reset], [data-sa-secret-reveal]")) {
        return;
      }
      event.preventDefault();
      handleBuyerAction(actionButton.dataset.buyerAction || "", actionButton.dataset.buyerId || "");
      return;
    }

    if (!event.target.closest(".buyer-data-actions")) {
      closeBuyerMenus();
    }
  });
  document.addEventListener("wheel", closeBuyerMenusOnScroll, { capture: true, passive: true });
  document.addEventListener("scroll", closeBuyerMenusOnScroll, true);
  buyerElements.drawerClose?.addEventListener("click", closeBuyerDrawer);
  buyerElements.drawerBackdrop?.addEventListener("click", closeBuyerDrawer);
  buyerElements.drawerTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const nextTab = tab.dataset.buyerTab || "overview";
      if (nextTab === "activity") {
        openBuyerActivityModal(buyerState.activeBuyerId);
        return;
      }
      buyerState.activeTab = nextTab;
      renderBuyerDrawer();
    });
  });
  buyerElements.actionForm?.addEventListener("submit", submitBuyerAction);
  Object.entries(buyerActionDropdowns).forEach(([type, dropdown]) => {
    dropdown.select?.addEventListener("change", () => {
      if (type === "reason" && buyerState.isSummarizingAction) {
        cancelBuyerActionAiSummary();
      }
      syncBuyerActionDropdown(type);
      syncBuyerActionAiButton();
    });
    dropdown.trigger?.addEventListener("click", (event) => {
      event.preventDefault();
      const isOpen = dropdown.trigger.getAttribute("aria-expanded") === "true";
      setBuyerActionDropdownOpen(type, !isOpen);
    });
    dropdown.trigger?.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
        return;
      }
      event.preventDefault();
      setBuyerActionDropdownOpen(type, true, { focusOption: true });
    });
    dropdown.menu?.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        focusBuyerActionDropdownOption(type, 1);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        focusBuyerActionDropdownOption(type, -1);
        return;
      }
      if (event.key === "Home" || event.key === "End") {
        event.preventDefault();
        const index = event.key === "Home" ? 0 : dropdown.options.length - 1;
        dropdown.options[index]?.focus();
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setBuyerActionDropdownOpen(type, false);
        dropdown.trigger?.focus();
        return;
      }
      if (event.key === "Tab") {
        setBuyerActionDropdownOpen(type, false);
      }
    });
    dropdown.options.forEach((option) => {
      option.addEventListener("click", () => {
        setBuyerActionDropdownValue(type, option.dataset[dropdown.optionKey] || "", { dispatchChange: true });
        setBuyerActionDropdownOpen(type, false);
        dropdown.trigger?.focus();
      });
    });
  });
  buyerElements.actionSummarizeAiButton?.addEventListener("click", () => {
    void summarizeBuyerActionWithAi();
  });
  buyerElements.actionClose?.addEventListener("click", closeActionModal);
  buyerElements.actionCancel?.addEventListener("click", closeActionModal);
  buyerElements.actionModal?.addEventListener("click", closeActionModal);
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }
    const openActionDropdownType = getOpenBuyerActionDropdownType();
    if (openActionDropdownType) {
      event.preventDefault();
      const openActionDropdown = getBuyerActionDropdown(openActionDropdownType);
      setBuyerActionDropdownOpen(openActionDropdownType, false);
      openActionDropdown?.trigger?.focus();
      return;
    }
    closeBuyerMenus();
    toggleBuyerFilterDropdown(false);
    if (activeBuyerActivityModal instanceof HTMLElement) {
      closeBuyerActivityModal();
      return;
    }
    if (!buyerElements.actionDialog?.hidden) {
      closeActionModal();
      return;
    }
    if (!buyerElements.drawer?.hidden) {
      closeBuyerDrawer();
    }
  });
}

async function loadBuyers(options = {}) {
  const quiet = options.quiet === true;
  const showLoading = options.showLoading !== false;
  const requestSequence = ++buyerLoadRequestSequence;
  const drawerWasOpen = Boolean(buyerElements.drawer && !buyerElements.drawer.hidden);
  const activeBuyerId = buyerState.activeBuyerId;
  const activityBuyerId = normalizeText(activeBuyerActivityModal?.dataset?.buyerActivityId);

  if (showLoading && buyerElements.list) {
    setBuyerListViewShell();
    buyerElements.list.replaceChildren(
      createElement("div", "buyer-data-empty buyer-data-loading-state", "Loading buyers..."),
    );
  }

  try {
    const [accountsResponse, ordersResponse] = await Promise.all([
      fetch("/api/accounts", {
        cache: "no-store",
        headers: getSuperAdminHeaders(),
      }),
      fetch("/api/orders", {
        cache: "no-store",
        headers: getSuperAdminHeaders(),
      }).catch(() => null),
    ]);
    const accountsData = await accountsResponse.json();
    if (!accountsResponse.ok) {
      throw new Error(accountsData.message || "Unable to load buyer accounts.");
    }
    const ordersData = ordersResponse ? await ordersResponse.json().catch(() => ({})) : {};
    if (requestSequence !== buyerLoadRequestSequence) {
      return false;
    }
    buyerState.orders = ordersResponse?.ok && Array.isArray(ordersData.orders)
      ? ordersData.orders
      : quiet
        ? buyerState.orders
        : [];
    buyerState.buyers = (Array.isArray(accountsData.accounts) ? accountsData.accounts : [])
      .filter(isBuyerAccount);
    updateSummaryCards();
    renderBuyerTable();
    window.GMSSuperAdminDashboard?.refresh?.();
    if (drawerWasOpen && activeBuyerId) {
      if (getBuyerById(activeBuyerId)) {
        buyerState.activeBuyerId = activeBuyerId;
        renderBuyerDrawer();
      } else {
        closeBuyerDrawer();
      }
    }
    if (activeBuyerActivityModal instanceof HTMLElement && activityBuyerId) {
      if (getBuyerById(activityBuyerId)) {
        refreshBuyerActivityDrawer(activityBuyerId);
      } else {
        closeBuyerActivityModal({ restoreFocus: false });
      }
    }
    return true;
  } catch (error) {
    if (requestSequence !== buyerLoadRequestSequence) {
      return false;
    }
    console.error(error);
    if (!quiet) {
      setBuyerListViewShell();
      buyerElements.list?.replaceChildren(
        createElement("div", "buyer-data-empty", error instanceof Error ? error.message : "Unable to load registered buyers right now."),
      );
    }
    return false;
  }
}

function normalizeBuyerRealtimeTopic(value) {
  const topic = normalizeKey(value).replace(/_/g, "-");
  const aliases = {
    account: "accounts",
    buyer: "buyers",
    order: "orders",
  };
  return aliases[topic] || topic;
}

function getBuyerRealtimeTopics(detail = {}) {
  const supportedTopics = new Set([
    "presence",
    "admins",
    "accounts",
    "buyers",
    "employees",
    "products",
    "product-requests",
    "yolo",
    "inventory",
    "orders",
    "chat",
    "followers",
    "delivery-partners",
    "payment-partners",
    "store-types",
    "categories",
    "settings",
    "activity",
    "all",
  ]);
  const rawTopics = Array.isArray(detail?.topics)
    ? detail.topics
    : detail?.topics
      ? [detail.topics]
      : detail?.topic || detail?.resource
        ? [detail.topic || detail.resource]
        : [];
  const topics = new Set(rawTopics.map(normalizeBuyerRealtimeTopic).filter(Boolean));
  if (normalizeKey(detail?.type) === "ready" || !topics.size) {
    topics.add("all");
  }
  if ([...topics].some((topic) => !supportedTopics.has(topic))) {
    topics.add("all");
  }
  return topics;
}

function isBuyerDataSectionActive() {
  const section = buyerElements.list?.closest('[data-super-admin-section="user-data"]');
  return !(section instanceof HTMLElement) || !section.hidden;
}

async function flushBuyerRealtimeRefresh() {
  buyerRealtimeRefreshTimer = 0;
  if (buyerRealtimeRefreshInFlight) {
    buyerRealtimeRefreshQueued = true;
    return;
  }

  buyerRealtimeRefreshInFlight = true;
  try {
    await loadBuyers({ quiet: true, showLoading: false });
  } finally {
    buyerRealtimeRefreshInFlight = false;
    if (buyerRealtimeRefreshQueued) {
      buyerRealtimeRefreshQueued = false;
      scheduleBuyerRealtimeRefresh({ force: true });
    }
  }
}

function scheduleBuyerRealtimeRefresh(options = {}) {
  const force = options.force === true;
  if (!force && !isBuyerDataSectionActive()) {
    buyerRealtimeRefreshDirty = true;
    return;
  }
  buyerRealtimeRefreshDirty = false;
  if (buyerRealtimeRefreshInFlight) {
    buyerRealtimeRefreshQueued = true;
    return;
  }
  if (buyerRealtimeRefreshTimer) {
    window.clearTimeout(buyerRealtimeRefreshTimer);
  }
  buyerRealtimeRefreshTimer = window.setTimeout(() => {
    void flushBuyerRealtimeRefresh();
  }, buyerRealtimeRefreshDebounceMs);
}

function refreshRealtimeBuyerActivity(detail = {}) {
  const activeActivityBuyerId = normalizeText(activeBuyerActivityModal?.dataset?.buyerActivityId);
  const changedBuyerId = normalizeText(detail?.buyerId || detail?.entityId || activeActivityBuyerId);
  if (!changedBuyerId || (!getBuyerById(changedBuyerId) && changedBuyerId !== activeActivityBuyerId)) {
    return;
  }
  invalidateBuyerActivityLogs(changedBuyerId);
  if (activeActivityBuyerId && activeActivityBuyerId === changedBuyerId) {
    void loadBuyerActivityLogs(changedBuyerId, { force: true });
  }
}

function handleBuyerRealtimeChange(event) {
  const detail = event?.detail && typeof event.detail === "object" ? event.detail : {};
  const topics = getBuyerRealtimeTopics(detail);
  if (topics.has("all")) {
    scheduleBuyerRealtimeRefresh();
    refreshRealtimeBuyerActivity();
    return;
  }
  if (topics.has("accounts") || topics.has("buyers") || topics.has("orders")) {
    scheduleBuyerRealtimeRefresh();
  }
  if (topics.has("activity")) {
    scheduleBuyerRealtimeRefresh();
    refreshRealtimeBuyerActivity(detail);
  }
}

function handleSuperAdminSectionChanged(event) {
  if (normalizeKey(event?.detail?.section) !== "user-data") {
    return;
  }
  if (buyerRealtimeRefreshDirty || isBuyerDataSectionActive()) {
    scheduleBuyerRealtimeRefresh({ force: true });
  }
}

function mountBuyerActionModalAtDocumentRoot() {
  // Keep fixed modal layers outside the User Data panel's stacking context.
  [buyerElements.actionModal, buyerElements.actionDialog].forEach((element) => {
    if (element instanceof HTMLElement && element.parentElement !== document.body) {
      document.body.appendChild(element);
    }
  });
}

mountBuyerActionModalAtDocumentRoot();
bindEvents();
window.addEventListener("gms:realtime-change", handleBuyerRealtimeChange);
window.addEventListener("gms:super-admin-section-changed", handleSuperAdminSectionChanged);
window.GMSBuyerData = Object.freeze({
  getSnapshot() {
    return {
      buyers: Array.isArray(buyerState.buyers) ? buyerState.buyers : [],
      orders: Array.isArray(buyerState.orders) ? buyerState.orders : [],
    };
  },
});
Object.keys(buyerActionDropdowns).forEach(syncBuyerActionDropdown);
syncBuyerFilterControlsFromState();
syncBuyerFilterSummary();
void loadBuyers();
window.setInterval(() => {
  refreshBuyerNewRegistrationState();
}, buyerNewRegistrationRefreshIntervalMs);
