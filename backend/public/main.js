(function () {
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

    if (window.WebTheme?.applyWorkspaceColor) {
      window.WebTheme.applyWorkspaceColor(savedColor, {
        cache: false,
        dispatch: false,
        source: "main-sync",
      });
      return;
    }

    // Apply color to CSS variables
    document.documentElement.style.setProperty("--accent", savedColor);
    document.documentElement.style.setProperty("--accent-rgb", rgb);
    document.documentElement.style.setProperty("--accent-strong", savedColor);
    document.documentElement.style.setProperty("--accent-text", savedColor);
    document.documentElement.style.setProperty("--accent-button-bg", savedColor);
    document.documentElement.style.setProperty("--accent-button-hover-bg", savedColor);
    document.documentElement.style.setProperty("--accent-contrast", savedColor === "#ffffff" ? "#000000" : "#ffffff");
    document.documentElement.style.setProperty("--accent-selected-bg", savedColor === "#ffffff" ? "#000000" : "#ffffff");
    document.documentElement.style.setProperty("--accent-selected-fg", savedColor === "#ffffff" ? "#000000" : "#ffffff");
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

  const mainPath = "/main.html";
  const adminSessionKey = "gms-admin-session";
  const employeeSessionKey = "gms-employee-session";
  const superAdminSessionKey = "gms-super-admin-session";
  const adminScopeStorageKey = "gms-admin-id";
  const mainSidebarOpenStorageKey = "gms-main-sidebar-open";
  const expandedMainNavStorageKey = "gms-main-expanded-nav-key";
  const liveChatNavBadgeRefreshIntervalMs = 5000;
  const sellerPresenceHeartbeatIntervalMs = 20000;
  const ordersDocumentSrc = "/main_orders_embed.html?__gms_admin_spa_frame=1&main_orders=1&v=timeline-loading-sweep-1";
  const listingInsightDocumentSrc = "/main_listing_insight_embed.html?__gms_admin_spa_frame=1&main_listing_insight=1&v=listing-insight-own-product-1";
  const productListingDocumentSrc = "/product_panel.html?__gms_admin_spa_frame=1&v=flash-deal-app-ribbon-1";
const inventoryDocumentSrc = "/main_inventory_embed.html?__gms_admin_spa_frame=1&main_inventory=1&v=inventory-gap-1";
const inventoryFrameQueryKeys = Object.freeze([
  "product",
  "focus",
  "notificationFocus",
  "stockProduct",
  "stockRecord",
  "stockRecordModifiedAt",
  "role",
  "employee_inventory_table",
]);
  const employeesDocumentSrc = "/employees.html?__gms_admin_spa_frame=1&main_employees=1&v=admin-seller-main-styles-1";
  const packingDocumentSrc = "/packing_admin.html?__gms_admin_spa_frame=1&main_packing=1&v=admin-seller-main-styles-1";
  const mainStylesheetHref = "/main.css?v=flash-deal-app-ribbon-1";
  const productListingFrameStylesheetHref = "/admin_spa.css?v=listing-poppins-summary-2";
  const adminFontsStylesheetHref = "/admin-fonts.css?v=admin-seller-super-admin-font-2";
  let liveChatUnreadCount = 0;
  let liveChatNavBadgeRefreshInFlight = false;
  let liveChatNavBadgeRefreshTimer = 0;
  let sellerPresenceHeartbeatTimer = 0;
  let mainRealtimeRefreshTimer = 0;
  let mainRealtimeRefreshInFlight = false;
  let mainRealtimeChatPending = false;
  let mainRealtimeProfilePending = false;
  let mainRealtimeThemePending = false;
  let liveChatLoadPromise = null;
  let ordersLoadStarted = false;
  let ordersLoadFailureTimer = 0;
  let listingInsightLoadStarted = false;
  let listingInsightLoadFailureTimer = 0;
  let productListingLoadStarted = false;
  let productListingLoadFailureTimer = 0;
  let productListingFrameResizeTimer = 0;
  let productListingFrameResizeObserver = null;
  let productListingFrameMutationObserver = null;
  let productListingFrameAbortController = null;
  let productListingFrameLastHeight = 0;
  let productListingComposerLastOpenedAt = 0;
  let mainOrdersDetailModalOpen = false;
  let mainOrdersWaybillPreviewState = {
    waybills: [],
    createdAtEpochMsList: [],
  };
  let mainOrdersWaybillSelectedCount = 0;
  let mainOrdersWaybillSelectionInFlight = false;
  let mainOrdersWaybillAwaitingPrintConfirmation = false;
  let mainOrdersWaybillPrintConfirmationModalEl = null;
  let mainOrdersWaybillSnackbarTimer = 0;
  let mainListingInsightDetailModalOpen = false;
  let mainInventoryStockRecordModalOpen = false;
  let mainInventoryStockRecordModalCloseTimer = 0;
  const MAIN_INVENTORY_STOCK_RECORD_MODAL_CLOSE_MS = 240;
  let mainInventoryStockEditModalOpen = false;
  let mainEmployeesRegisterModalOpen = false;
  let mainEmployeesDrawerOpen = false;
  let mainEmployeesDrawerPortalCloseTimer = 0;
  let inventoryLoadStarted = false;
  let inventoryLoadFailureTimer = 0;
  let employeesLoadStarted = false;
  let employeesLoadFailureTimer = 0;
  let packingLoadStarted = false;
  let packingLoadFailureTimer = 0;
  const mainEmbeddedFrameHeightSyncs = new Map();
  const mainSectionCountObservers = new Map();
  let dashboardSearchQuery = "";
  let liveChatSearchQuery = "";
  let ordersSearchQuery = "";
  let ordersStatusFilter = "all";
  let ordersAdvancedFilters = {
    action: "all",
    courier: "all",
    payment: "all",
    paymentPartner: "all",
    waybill: "all",
    date: "all",
    customStart: "",
    customEnd: "",
    sort: "newest",
  };
  let listingInsightSearchQuery = "";
  let listingInsightRankingMode = "sold";
  let listingInsightHeaderFilters = {
    category: "all",
    availability: "all",
    period: "all",
  };
  let listingInsightHeaderCategoryOptions = [];
  let productListingSearchQuery = "";
  let inventorySearchQuery = "";
  let employeesSearchQuery = "";
  let packingSearchQuery = "";
  let packingStationFilter = "packing-station";
  let inventoryPriorityFilter = "all";
  let listingStatusFilter = "all";
  let expandedMainNavKey = "";
  let collapseMainNavTimer = 0;
  let mainNavPointerFocus = false;
  let collapsedMainSubNavTooltip = null;
  let collapsedMainSubNavTooltipAnchor = null;
  let brandMarqueeFrame = 0;
  let brandMarqueeTimeout = 0;
  const sellerEmptyLogoSvg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-building2-icon lucide-building-2"><path d="M10 12h4"/><path d="M10 8h4"/><path d="M14 21v-3a2 2 0 0 0-4 0v3"/><path d="M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2"/><path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"/></svg>';
  const sellerLogoToneClasses = Object.freeze(
    Array.from({ length: 6 }, (_, index) => `seller-company-logo--tone-${index + 1}`),
  );

  function getSellerCompanyLogoToneIndex(session = authState?.session || {}, companyName = "") {
    const source = String(
      session?.adminId
      || session?.id
      || session?.email
      || companyName
      || "Company Seller",
    );
    let hash = 0;
    for (const char of source) {
      hash = (hash + char.charCodeAt(0)) % 6;
    }
    return hash + 1;
  }

  function applySellerCompanyLogoTone(target, companyName = "") {
    if (!(target instanceof HTMLElement)) {
      return;
    }
    target.classList.remove(...sellerLogoToneClasses);
    target.classList.add(`seller-company-logo--tone-${getSellerCompanyLogoToneIndex(authState?.session, companyName)}`);
  }

  const ordersStatusFilterItems = Object.freeze([
    { title: "All Orders", filter: "all" },
    { title: "New Orders", filter: "new" },
    { title: "Processing", filter: "processing" },
    { title: "Shipped", filter: "shipped" },
    { title: "Completed", filter: "completed" },
    { title: "Cancelled", filter: "cancelled" },
    { title: "Returned", filter: "returned" },
  ]);
  const inventoryFilterItems = Object.freeze([
    { title: "All", filter: "all" },
    { title: "New Stock", filter: "new-stock" },
    { title: "Low Stock", filter: "low-stock" },
    { title: "Out of Stock", filter: "out-of-stock" },
    { title: "Near Expiry", filter: "near-expiry" },
    { title: "Expired", filter: "expired-product" },
  ]);
  const listingFilterItems = Object.freeze([
    { title: "Total Listing", filter: "all" },
    { title: "Active", filter: "active" },
    { title: "Inactive", filter: "inactive" },
    { title: "In Review", filter: "review" },
    { title: "In Revision", filter: "revision" },
    { title: "Restricted", filter: "restricted" },
  ]);
  const listingInsightRankingItems = Object.freeze([
    { title: "Sold", mode: "sold" },
    { title: "Income", mode: "income" },
    { title: "Trend", mode: "trend" },
  ]);
  const packingStationFilterItems = Object.freeze([
    { title: "Packing Station", filter: "packing-station" },
    { title: "Shipping Station", filter: "shipping-station" },
  ]);
  const mainSectionCountConfigs = Object.freeze({
    orders: {
      rootSelector: "[data-main-orders-summary]",
      valueSelector: '.super-admin-stat[data-admin-summary-stat="total"] strong',
    },
    "listing-insight": {
      rootSelector: ".product-insight-sold-list-shell",
      valueSelector: "[data-listing-insight-visible-count]",
    },
    listing: {
      rootSelector: ".product-listing-summary",
      valueSelector: "[data-product-listing-total]",
    },
    inventory: {
      rootSelector: ".stock-summary-grid",
      valueSelector: "#stock-total-products",
    },
    employees: {
      rootSelector: "[data-employee-summary]",
      valueSelector: '.super-admin-stat[data-admin-summary-stat="total"] strong',
    },
    packing: {
      rootSelector: ".packing-admin-summary",
      valueSelector: "[data-packing-order-count]",
    },
  });

  const elements = {
    body: document.body,
    refreshLoading: document.querySelector("[data-main-refresh-loading]"),
    sidebar: document.querySelector("[data-main-sidebar]"),
    backdrop: document.querySelector("[data-main-backdrop]"),
    sidebarToggle: document.querySelector("[data-main-sidebar-toggle]"),
    name: document.querySelector("[data-main-name]"),
    nameText: document.querySelector("[data-main-name-text]"),
    subtitle: document.querySelector("[data-main-subtitle]"),
    logo: document.querySelector("[data-main-logo]"),
    fallback: document.querySelector("[data-main-fallback]"),
    nav: document.querySelector("[data-main-nav]"),
    sidebarFooter: document.querySelector("[data-main-sidebar-footer]"),
    search: document.querySelector("[data-main-search]"),
    searchClear: document.querySelector("[data-main-search-clear]"),
    ordersHeaderFilter: document.querySelector("[data-main-orders-header-filter]"),
    ordersHeaderFilterToggle: document.querySelector("[data-main-orders-header-filter-toggle]"),
    ordersHeaderFilterPanel: document.querySelector("[data-main-orders-header-filter-panel]"),
    ordersHeaderFilterSummary: document.querySelector("[data-main-orders-header-filter-summary]"),
    ordersHeaderStatusFilters: Array.from(document.querySelectorAll("[data-main-orders-header-status-filter]")),
    ordersHeaderCourierOptions: document.querySelector("[data-main-orders-header-courier-options]"),
    ordersHeaderPaymentPartnerOptions: document.querySelector("[data-main-orders-header-payment-partner-options]"),
    ordersHeaderDateRange: document.querySelector("[data-main-orders-header-date-range]"),
    ordersHeaderCustomDates: Array.from(document.querySelectorAll("[data-main-orders-header-custom-date]")),
    ordersHeaderFilterReset: document.querySelector("[data-main-orders-header-filter-reset]"),
    listingInsightHeaderFilter: document.querySelector("[data-main-listing-insight-header-filter]"),
    listingInsightHeaderFilterToggle: document.querySelector("[data-main-listing-insight-header-filter-toggle]"),
    listingInsightHeaderFilterPanel: document.querySelector("[data-main-listing-insight-header-filter-panel]"),
    listingInsightHeaderFilterSummary: document.querySelector("[data-main-listing-insight-header-filter-summary]"),
    listingInsightHeaderRankingFilters: Array.from(document.querySelectorAll("[data-main-listing-insight-ranking-filter]")),
    listingInsightHeaderCategoryOptions: document.querySelector("[data-main-listing-insight-header-category-options]"),
    listingInsightHeaderFilterReset: document.querySelector("[data-main-listing-insight-header-filter-reset]"),
    filter: document.querySelector("[data-main-filter]"),
    content: document.querySelector("[data-main-content]"),
    dashboardView: document.querySelector("[data-main-dashboard-view]"),
    liveChatView: document.querySelector("[data-main-live-chat-view]"),
    liveChatMount: document.querySelector("[data-main-live-chat-mount]"),
    liveChatSearchBridge: document.querySelector("[data-employee-chat-search]"),
    ordersView: document.querySelector("[data-main-orders-view]"),
    ordersFrameShell: document.querySelector(".main-orders-frame-shell"),
    ordersFrame: document.querySelector("[data-main-orders-frame]"),
    ordersLoading: document.querySelector("[data-main-orders-loading]"),
    ordersError: document.querySelector("[data-main-orders-error]"),
    ordersBreadcrumbFilter: document.querySelector("[data-main-orders-breadcrumb-filter]"),
    ordersWaybillPrintButton: document.querySelector("[data-main-orders-waybill-print]"),
    ordersWaybillPrintCount: document.querySelector("[data-main-orders-waybill-print-count]"),
    ordersWaybillSnackbar: document.querySelector("[data-main-orders-waybill-snackbar]"),
    ordersWaybillSnackbarTitle: document.querySelector("[data-main-orders-waybill-snackbar-title]"),
    ordersWaybillSnackbarMessage: document.querySelector("[data-main-orders-waybill-snackbar-message]"),
    ordersWaybillSnackbarClose: document.querySelector("[data-main-orders-waybill-snackbar-close]"),
    ordersWaybillSnackbarTimer: document.querySelector("[data-main-orders-waybill-snackbar-timer]"),
    listingInsightBreadcrumbFilter: document.querySelector("[data-main-listing-insight-breadcrumb-filter]"),
    listingBreadcrumbFilter: document.querySelector("[data-main-listing-breadcrumb-filter]"),
    listingInsightView: document.querySelector("[data-main-listing-insight-view]"),
    listingInsightFrameShell: document.querySelector(".main-listing-insight-frame-shell"),
    listingInsightFrame: document.querySelector("[data-main-listing-insight-frame]"),
    listingInsightLoading: document.querySelector("[data-main-listing-insight-loading]"),
    listingInsightError: document.querySelector("[data-main-listing-insight-error]"),
    listingView: document.querySelector("[data-main-listing-view]"),
    listingFrame: document.querySelector("[data-main-listing-frame]"),
    listingLoading: document.querySelector("[data-main-listing-loading]"),
    listingError: document.querySelector("[data-main-listing-error]"),
    inventoryView: document.querySelector("[data-main-inventory-view]"),
    inventoryFrameShell: document.querySelector(".main-inventory-frame-shell"),
    inventoryFrame: document.querySelector("[data-main-inventory-frame]"),
    inventoryLoading: document.querySelector("[data-main-inventory-loading]"),
    inventoryError: document.querySelector("[data-main-inventory-error]"),
    inventoryBreadcrumbFilter: document.querySelector("[data-main-inventory-breadcrumb-filter]"),
    vouchersView: document.querySelector("[data-main-vouchers-view]"),
    employeesView: document.querySelector("[data-main-employees-view]"),
    employeesFrameShell: document.querySelector(".main-employees-frame-shell"),
    employeesFrame: document.querySelector("[data-main-employees-frame]"),
    employeesLoading: document.querySelector("[data-main-employees-loading]"),
    employeesError: document.querySelector("[data-main-employees-error]"),
    employeesAdd: document.querySelector("[data-main-employees-add]"),
    employeesDrawerPortal: document.querySelector("[data-main-employees-drawer-portal]"),
    employeesDrawerPortalFrame: document.querySelector("[data-main-employees-drawer-portal-frame]"),
    employeesDrawerPortalClose: document.querySelector("[data-main-employees-drawer-portal-close]"),
    packingView: document.querySelector("[data-main-packing-view]"),
    packingFrame: document.querySelector("[data-main-packing-frame]"),
    packingLoading: document.querySelector("[data-main-packing-loading]"),
    packingError: document.querySelector("[data-main-packing-error]"),
    packingBreadcrumbFilter: document.querySelector("[data-main-packing-breadcrumb-filter]"),
    title: document.querySelector("[data-main-title]"),
    description: document.querySelector("[data-main-description]"),
    breadcrumb: document.querySelector("[data-main-breadcrumb]"),
    summary: document.querySelector("[data-main-summary]"),
    links: document.querySelector("[data-main-links]"),
    openDashboard: document.querySelector("[data-main-open-dashboard]"),
    notificationToggle: document.querySelector("[data-main-notification-toggle]"),
    notificationPanel: document.querySelector("[data-main-notification-panel]"),
    notificationList: document.querySelector("[data-main-notification-list]"),
    notificationBadge: document.querySelector("[data-main-notification-badge]"),
    notificationClose: document.querySelector("[data-main-notification-close]"),
    notificationFooter: document.querySelector("[data-main-notification-footer]"),
    notificationShowAll: document.querySelector("[data-main-notification-show-all]"),
    notificationFilterButtons: Array.from(document.querySelectorAll("[data-main-notification-filter]")),
    headerProfileMenu: document.querySelector("[data-main-header-profile-menu]"),
    headerProfileToggle: document.querySelector("[data-main-header-profile-toggle]"),
    headerProfileDropdown: document.querySelector("[data-main-header-profile-dropdown]"),
    headerProfileImage: document.querySelector("[data-main-header-profile-image]"),
    headerProfileFallback: document.querySelector("[data-main-header-profile-fallback]"),
    headerProfileDropdownName: document.querySelector("[data-main-header-profile-dropdown-name]"),
    headerProfileEmail: document.querySelector("[data-main-header-profile-email]"),
  };

  const MAIN_INITIAL_LOADING_MIN_MS = 450;
  const mainInitialLoadingStartedAt = window.performance?.now?.() || Date.now();
  let mainInitialLoadingFinishing = false;

  function finishMainInitialLoading(view = activeMainView) {
    const targetView = normalizeText(view).toLowerCase();
    if (
      !elements.body?.classList.contains("main-initial-loading")
      || mainInitialLoadingFinishing
      || targetView !== activeMainView
    ) {
      return;
    }

    mainInitialLoadingFinishing = true;
    const elapsedMs = (window.performance?.now?.() || Date.now()) - mainInitialLoadingStartedAt;
    const remainingMs = Math.max(0, MAIN_INITIAL_LOADING_MIN_MS - elapsedMs);
    window.setTimeout(() => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          if (targetView !== activeMainView) {
            mainInitialLoadingFinishing = false;
            finishMainInitialLoading(activeMainView);
            return;
          }
          elements.body?.classList.remove("main-initial-loading");
          elements.refreshLoading?.setAttribute("aria-hidden", "true");
          window.setTimeout(() => {
            if (elements.refreshLoading instanceof HTMLElement) {
              elements.refreshLoading.hidden = true;
            }
          }, 0);
        });
      });
    }, remainingMs);
  }

  function normalizeMainSectionCount(value) {
    const countMatch = String(value ?? "").match(/\d[\d,]*/);
    if (!countMatch) {
      return 0;
    }
    return Math.max(0, Number.parseInt(countMatch[0].replaceAll(",", ""), 10) || 0);
  }

  function updateMainSectionCount(view, value) {
    const normalizedView = normalizeText(view).toLowerCase();
    const normalizedCount = normalizeMainSectionCount(value);
    document.querySelectorAll("[data-main-section-count]").forEach((countElement) => {
      if (normalizeText(countElement.dataset.mainSectionCount).toLowerCase() !== normalizedView) {
        return;
      }
      countElement.textContent = `(${normalizedCount.toLocaleString("en-US")})`;
    });
  }

  function disconnectMainSectionCountSync(view) {
    const normalizedView = normalizeText(view).toLowerCase();
    mainSectionCountObservers.get(normalizedView)?.disconnect();
    mainSectionCountObservers.delete(normalizedView);
  }

  function installMainSectionCountSync(view, sourceDocument) {
    const normalizedView = normalizeText(view).toLowerCase();
    const config = mainSectionCountConfigs[normalizedView];
    if (!config || !sourceDocument?.querySelector) {
      return;
    }

    disconnectMainSectionCountSync(normalizedView);
    const root = sourceDocument.querySelector(config.rootSelector);
    if (!root) {
      updateMainSectionCount(normalizedView, 0);
      return;
    }

    const syncCount = () => {
      if (config.countSelector) {
        updateMainSectionCount(
          normalizedView,
          sourceDocument.querySelectorAll(config.countSelector).length,
        );
        return;
      }
      updateMainSectionCount(
        normalizedView,
        sourceDocument.querySelector(config.valueSelector)?.textContent || 0,
      );
    };

    syncCount();
    const CountMutationObserver = sourceDocument.defaultView?.MutationObserver || window.MutationObserver;
    const observer = new CountMutationObserver(syncCount);
    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    mainSectionCountObservers.set(normalizedView, observer);
  }

  function mountInlineProductComposerPortal() {
    const modal = document.getElementById("product-composer-modal");
    if (!(modal instanceof HTMLElement) || modal.closest("[data-main-product-composer-portal]")) {
      return;
    }

    modal.classList.add("product-status-shell", "main-product-composer-body-portal");
    modal.dataset.mainProductComposerPortal = "";
    elements.body?.append(modal);
  }

  mountInlineProductComposerPortal();

  const mainEmbeddedFrameConfigs = Object.freeze({
    orders: {
      view: "orders",
      frameKey: "ordersFrame",
      cssVar: "--main-orders-frame-height",
      minHeight: 0,
      measureSelectors: [
        ".order-insight-shell",
        ".dashboard-layout",
        ".dashboard-content",
        ".insight-main-grid",
        ".insight-order-list-shell",
        ".main-orders-table-shell",
        ".insight-order-list",
      ],
    },
    "listing-insight": {
      view: "listing-insight",
      frameKey: "listingInsightFrame",
      cssVar: "--main-listing-insight-frame-height",
      minHeight: 0,
      measureSelectors: [
        ".product-insight-shell",
        ".dashboard-layout",
        ".dashboard-content",
        ".product-insight-main-grid",
        ".product-insight-sold-list-shell",
        ".product-insight-sold-rank-list",
      ],
    },
    inventory: {
      view: "inventory",
      frameKey: "inventoryFrame",
      cssVar: "--main-inventory-frame-height",
      minHeight: 720,
      measureSelectors: [
        ".stock-monitor-shell",
        ".dashboard-layout",
        ".dashboard-content",
        ".stock-summary-grid",
        ".stock-main-grid",
        ".stock-list-shell",
        ".stock-product-list",
      ],
    },
    employees: {
      view: "employees",
      frameKey: "employeesFrame",
      cssVar: "--main-employees-frame-height",
      minHeight: 720,
      measureSelectors: [
        ".employee-workspace",
        ".employee-summary",
        ".employee-directory",
        ".employee-table-shell",
        ".employee-table__body",
      ],
    },
    packing: {
      view: "packing",
      frameKey: "packingFrame",
      cssVar: "--main-packing-frame-height",
      minHeight: 720,
      measureSelectors: [
        ".packing-admin-workspace",
        ".packing-admin-summary",
        ".packing-admin-board",
        ".packing-admin-station",
        ".packing-admin-queue",
      ],
    },
  });

  const icons = {
    dashboard: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-layout-dashboard" aria-hidden="true">
        <rect width="7" height="9" x="3" y="3" rx="1" />
        <rect width="7" height="5" x="14" y="3" rx="1" />
        <rect width="7" height="9" x="14" y="12" rx="1" />
        <rect width="7" height="5" x="3" y="16" rx="1" />
      </svg>`,
    company: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-building2-icon lucide-building-2" aria-hidden="true">
        <path d="M10 12h4" />
        <path d="M10 8h4" />
        <path d="M14 21v-3a2 2 0 0 0-4 0v3" />
        <path d="M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2" />
        <path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16" />
      </svg>`,
    listing: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z" />
        <path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12" />
        <path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17" />
      </svg>`,
    type: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true">
        <path d="M5 21V9l7-5 7 5v12" />
        <path d="M9 21v-7h6v7M8 10h.01M12 10h.01M16 10h.01" stroke-linecap="round" />
      </svg>`,
    payment: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true">
        <path d="M3.5 6.5h17v11h-17z" />
        <path d="M3.5 10h17M7 15h4" stroke-linecap="round" />
      </svg>`,
    delivery: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true">
        <path d="M3 7h11v9H3zM14 10h3.5l3.5 4v2h-7z" />
        <circle cx="7" cy="18" r="2" />
        <circle cx="18" cy="18" r="2" />
      </svg>`,
    user: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true">
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <circle cx="12" cy="9" r="2.5" />
        <path d="M8 17a4 4 0 0 1 8 0" stroke-linecap="round" />
      </svg>`,
    settings: `
      <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-settings-icon lucide-settings" aria-hidden="true">
        <path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>`,
    signOut: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-log-out-icon lucide-log-out" aria-hidden="true">
        <path d="m16 17 5-5-5-5" />
        <path d="M21 12H9" />
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      </svg>`,
    chat: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-messages-square-icon lucide-messages-square" aria-hidden="true">
        <path d="M16 10a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 14.286V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        <path d="M20 9a2 2 0 0 1 2 2v10.286a.71.71 0 0 1-1.212.502l-2.202-2.202A2 2 0 0 0 17.172 19H10a2 2 0 0 1-2-2v-1" />
      </svg>`,
    orders: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shopping-bag-icon lucide-shopping-bag" aria-hidden="true">
        <path d="M16 10a4 4 0 0 1-8 0"/>
        <path d="M3.103 6.034h17.794"/>
        <path d="M3.4 5.467a2 2 0 0 0-.4 1.2V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.667a2 2 0 0 0-.4-1.2l-2-2.667A2 2 0 0 0 17 2H7a2 2 0 0 0-1.6.8z"/>
      </svg>`,
    insight: `
      <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chart-no-axes-combined-icon lucide-chart-no-axes-combined" aria-hidden="true">
        <path d="M12 16v5"/><path d="M16 14.639V21"/><path d="M20 10.656V21"/><path d="m22 3-8.646 8.646a.5.5 0 0 1-.708 0L9.354 8.354a.5.5 0 0 0-.707 0L2 15"/><path d="M4 18.463V21"/><path d="M8 14.656V21"/>
      </svg>`,
    stock: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true">
        <path d="M4 7h16v13H4zM4 7l2-3h12l2 3" />
        <path d="M9 12h6" stroke-linecap="round" />
      </svg>`,
    employees: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-users-round" aria-hidden="true">
        <path d="M18 21a8 8 0 0 0-16 0" />
        <circle cx="10" cy="8" r="5" />
        <path d="M22 20c0-3.37-2-6.5-5-8a5 5 0 0 0-.45-8.3" />
      </svg>`,
    packing: `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-package-icon lucide-package" aria-hidden="true">
        <path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/>
        <path d="M12 22V12"/>
        <polyline points="3.29 7 12 12 20.71 7"/>
        <path d="m7.5 4.27 9 5.15"/>
      </svg>`,
    vouchers: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>
        <path d="M13 5v2M13 11v2M13 17v2"/>
      </svg>`,
    feedback: `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-message-square-more-icon lucide-message-square-more" aria-hidden="true">
        <path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"/>
        <path d="M12 11h.01"/>
        <path d="M16 11h.01"/>
        <path d="M8 11h.01"/>
      </svg>`,
  };

  function readJsonSession(key) {
    try {
      const rawValue = window.sessionStorage.getItem(key);
      return rawValue ? JSON.parse(rawValue) : null;
    } catch (error) {
      return null;
    }
  }

  function writeJsonSession(key, value) {
    try {
      window.sessionStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn("Unable to update session.", error);
    }
  }

  function normalizeText(value) {
    return String(value ?? "").replace(/\s+/g, " ").trim();
  }

  function firstText(candidates, fallback = "") {
    return candidates.map(normalizeText).find(Boolean) || fallback;
  }

  function firstUrl(candidates) {
    return candidates.map((value) => String(value ?? "").trim()).find(Boolean) || "";
  }

  function getInitials(value, fallback = "SW") {
    const words = normalizeText(value).split(/\s+/).filter(Boolean);
    const initials = words.length > 1
      ? `${words[0][0] || ""}${words[1][0] || ""}`
      : String(words[0] || fallback).slice(0, 2);
    return initials.toUpperCase() || fallback;
  }

  function getSessionAdminId(session) {
    return firstText([
      session?.adminId,
      session?.ownerAdminId,
      session?.tenantId,
      session?.workspaceId,
      session?.storeAdminId,
      session?.id,
      session?.accountCode,
    ]);
  }

  function hasAdminSession(session) {
    return Boolean(
      session &&
      typeof session === "object" &&
      (normalizeText(session.role).toLowerCase() === "admin" || session.adminId || session.email || session.id),
    );
  }

  function hasEmployeeSession(session) {
    return Boolean(
      session &&
      typeof session === "object" &&
      (session.employeeId || session.accountCode || normalizeText(session.role).toLowerCase() === "employee"),
    );
  }

  function getAuthState() {
    const adminSession = readJsonSession(adminSessionKey);
    if (hasAdminSession(adminSession)) {
      return { role: "seller", session: adminSession };
    }

    const employeeSession = readJsonSession(employeeSessionKey);
    if (hasEmployeeSession(employeeSession)) {
      return { role: "employee", session: employeeSession };
    }

    return null;
  }

  function syncAdminScopeStorage(session) {
    const adminId = [
      session?.adminId,
      session?.ownerAdminId,
      session?.tenantId,
      session?.workspaceId,
      session?.storeAdminId,
      session?.sellerId,
      session?.shopId,
      session?.id,
      session?.accountCode,
    ]
      .map((value) => String(value ?? "").trim())
      .find((value) => value && value.toLowerCase() !== "admin")
      || getSessionAdminId(session);

    if (!adminId || adminId.toLowerCase() === "admin") {
      return;
    }

    try {
      window.localStorage.setItem(adminScopeStorageKey, adminId);
    } catch (error) {
      console.warn("Unable to sync admin scope.", error);
    }
  }

  let authState = getAuthState();
  if (!authState) {
    window.location.replace("/login.html");
    return;
  }

  if (authState.role === "seller") {
    syncAdminScopeStorage(authState.session);
  }

  function getMainViewFromHash() {
    const hash = window.location.hash.toLowerCase();
    if (hash === "#live-chat") {
      return "live-chat";
    }
    if (hash === "#orders" || hash.startsWith("#orders/")) {
      return "orders";
    }
    if (hash === "#listing-insight" || hash.startsWith("#listing-insight/")) {
      return "listing-insight";
    }
    if (hash === "#listing") {
      return "listing";
    }
    if (hash === "#inventory") {
      return "inventory";
    }
    if (hash === "#employees") {
      return "employees";
    }
    if (hash === "#vouchers") {
      return "vouchers";
    }
    if (
      hash === "#packing"
      || hash.startsWith("#packing/")
      || hash === "#dispatching"
      || hash.startsWith("#dispatching/")
    ) {
      return "packing";
    }
    return "dashboard";
  }

  function normalizePackingStationFilter(value) {
    const normalizedValue = normalizeText(value).toLowerCase();
    if (normalizedValue === "packing" || normalizedValue === "packing-station") {
      return "packing-station";
    }
    if (normalizedValue === "shipping" || normalizedValue === "shipping-station") {
      return "shipping-station";
    }
    return packingStationFilterItems.some((item) => item.filter === normalizedValue)
      ? normalizedValue
      : "packing-station";
  }

  function getPackingStationFilterFromHash() {
    const match = window.location.hash.toLowerCase().match(/^#(?:packing|dispatching)(?:\/([^/?#]+))?$/);
    return normalizePackingStationFilter(match?.[1] || "packing-station");
  }

  function normalizeOrdersStatusFilter(value) {
    const normalizedValue = normalizeText(value).toLowerCase();
    if (normalizedValue === "delivered") {
      return "completed";
    }
    return ordersStatusFilterItems.some((item) => item.filter === normalizedValue)
      ? normalizedValue
      : "all";
  }

  function getOrdersStatusFilterFromHash() {
    const match = window.location.hash.toLowerCase().match(/^#orders(?:\/([^/?#]+))?$/);
    return normalizeOrdersStatusFilter(match?.[1] || "all");
  }

  function normalizeListingInsightRankingMode(value) {
    const normalizedValue = normalizeText(value).toLowerCase();
    if (["income", "trend"].includes(normalizedValue)) {
      return normalizedValue;
    }
    return "sold";
  }

  function getListingInsightRankingModeFromHash() {
    const match = window.location.hash.toLowerCase().match(/^#listing-insight(?:\/([^/?#]+))?$/);
    return normalizeListingInsightRankingMode(match?.[1] || "sold");
  }

  function getMainViewTitle(view) {
    if (view === "live-chat") {
      return "Live Chat";
    }
    if (view === "orders") {
      return "Live Orders";
    }
    if (view === "listing-insight") {
      return "Listing Insight";
    }
    if (view === "listing") {
      return "Product Listing";
    }
    if (view === "inventory") {
      return "Inventory";
    }
    if (view === "employees") {
      return "Employees";
    }
    if (view === "packing") {
      return "Dispatching";
    }
    if (view === "vouchers") {
      return "Store Vouchers";
    }
    return "Main";
  }

  function normalizeInventoryPriorityFilter(value) {
    const normalizedValue = normalizeText(value).toLowerCase();
    return inventoryFilterItems.some((item) => item.filter === normalizedValue)
      ? normalizedValue
      : "all";
  }

  function normalizeListingStatusFilter(value) {
    const normalizedValue = normalizeText(value).toLowerCase();
    if (normalizedValue === "pending" || normalizedValue === "in-review") {
      return "review";
    }
    if (
      normalizedValue === "in-revision"
      || normalizedValue === "needs-revision"
      || normalizedValue === "revision-requested"
    ) {
      return "revision";
    }
    if (normalizedValue === "total" || normalizedValue === "total-listing") {
      return "all";
    }
    return listingFilterItems.some((item) => item.filter === normalizedValue)
      ? normalizedValue
      : "all";
  }

  function syncListingStatusFilter(filter = listingStatusFilter) {
    listingStatusFilter = normalizeListingStatusFilter(filter);
    const setter = window.gmsSetProductListingStatusFilter;
    if (typeof setter === "function") {
      setter(listingStatusFilter);
    }
    syncMainFilterBreadcrumbs();
    renderNav();
  }

  function syncMainFilterBreadcrumbs() {
    const activeOrdersFilter = ordersStatusFilterItems.find(
      (item) => item.filter === normalizeOrdersStatusFilter(ordersStatusFilter),
    );
    const activeInventoryFilter = inventoryFilterItems.find(
      (item) => item.filter === normalizeInventoryPriorityFilter(inventoryPriorityFilter),
    );
    const activeListingInsightRanking = listingInsightRankingItems.find(
      (item) => item.mode === normalizeListingInsightRankingMode(listingInsightRankingMode),
    );
    const activeListingFilter = listingFilterItems.find(
      (item) => item.filter === normalizeListingStatusFilter(listingStatusFilter),
    );

    if (elements.ordersBreadcrumbFilter) {
      elements.ordersBreadcrumbFilter.textContent = activeOrdersFilter?.title || "All Orders";
    }
    if (elements.inventoryBreadcrumbFilter) {
      elements.inventoryBreadcrumbFilter.textContent = activeInventoryFilter?.title || "All";
    }
    if (elements.listingInsightBreadcrumbFilter) {
      elements.listingInsightBreadcrumbFilter.textContent = activeListingInsightRanking?.title || "Sold";
    }
    if (elements.listingBreadcrumbFilter) {
      elements.listingBreadcrumbFilter.textContent = activeListingFilter?.title || "Total Listing";
    }
    const activePackingStationFilter = packingStationFilterItems.find(
      (item) => item.filter === normalizePackingStationFilter(packingStationFilter),
    );
    if (elements.packingBreadcrumbFilter) {
      elements.packingBreadcrumbFilter.textContent = activePackingStationFilter?.title || "Packing Station";
    }
  }

  let activeMainView = getMainViewFromHash();
  ordersStatusFilter = getOrdersStatusFilterFromHash();
  listingInsightRankingMode = getListingInsightRankingModeFromHash();
  packingStationFilter = getPackingStationFilterFromHash();

  function getEmployeeDashboardPath(session) {
    const position = normalizeText(session?.position).toLowerCase();
    const storedPath = normalizeText(session?.dashboardPath);
    if (/^\/live_chat\.html(?:[?#]|$)/i.test(storedPath)) {
      return "/main.html#live-chat";
    }
    if (storedPath && storedPath !== mainPath) {
      return storedPath;
    }
    if (position === "packing") {
      return "/packing_dashboard.html";
    }
    return position ? "/employee_dashboard.html" : "/employee_access_pending.html";
  }

  function getDashboardPath() {
    if (authState.role === "seller") {
      const storedPath = normalizeText(authState.session?.dashboardPath);
      return storedPath && storedPath !== mainPath ? storedPath : "/main.html#dashboard";
    }

    return getEmployeeDashboardPath(authState.session);
  }

  function getIdentity() {
    const session = authState.session || {};
    if (authState.role === "seller") {
      const name = firstText([
        session.companyName,
        session.storeName,
        session.businessName,
        session.sellerName,
        session.shopName,
        session.company?.name,
        session.store?.name,
        session.displayName,
        session.name,
        session.email,
      ], "Company Seller");
      const subtitle = firstText([
        session.businessType,
        session.storeType,
        session.storeTypeName,
        session.businessCategory,
        session.company?.businessType,
        session.store?.businessType,
      ], "Business Type");
      const logoUrl = session.businessLogoSkipped === true ? "" : firstUrl([
        session.companyPictureUrl,
        session.companyProfileImageUrl,
        session.businessLogoUrl,
        session.profileImageUrl,
        session.avatarUrl,
        session.photoUrl,
        session.profilePhotoUrl,
        session.pictureUrl,
        session.imageUrl,
        session.logoUrl,
        session.company?.companyPictureUrl,
        session.company?.profileImageUrl,
        session.company?.logoUrl,
        session.store?.companyPictureUrl,
        session.store?.profileImageUrl,
        session.store?.logoUrl,
        session.profile?.companyPictureUrl,
        session.profile?.profileImageUrl,
        session.profile?.logoUrl,
      ]);
      return { name, subtitle, logoUrl, fallback: getInitials(name, "CS") };
    }

    const fullName = [session.firstName, session.lastName].map(normalizeText).filter(Boolean).join(" ");
    const name = firstText([
      fullName,
      session.name,
      session.displayName,
      session.employeeName,
      session.email,
      session.employeeId,
    ], "Employee");
    const subtitle = firstText([session.position, session.role], "Employee");
    const logoUrl = firstUrl([
      session.profileImageUrl,
      session.avatarUrl,
      session.photoUrl,
      session.profilePhotoUrl,
      session.employeePhotoUrl,
      session.pictureUrl,
      session.imageUrl,
    ]);
    return { name, subtitle, logoUrl, fallback: getInitials(name, "EM") };
  }

  function getPermissionSet() {
    const permissions = Array.isArray(authState.session?.accessPermissions)
      ? authState.session.accessPermissions
      : [];
    const hasStoredPermissions = permissions.length > 0 || authState.session?.accessPermissionsConfigured;
    const fallbackPermissions = [];
    const position = normalizeText(authState.session?.position).toLowerCase();

    if (!hasStoredPermissions) {
      if (position === "admin employee") {
        fallbackPermissions.push("employee-dashboard", "live-chat");
      } else if (position === "packing") {
        fallbackPermissions.push("packing-dashboard");
      } else if (position) {
        fallbackPermissions.push("employee-dashboard");
      }
    }

    return new Set(
      (hasStoredPermissions ? permissions : fallbackPermissions)
        .map((permission) => normalizeText(permission).toLowerCase())
        .filter(Boolean),
    );
  }

  function hasPermission(permission) {
    const permissionSet = getPermissionSet();
    return permissionSet.has(permission);
  }

  function canAccessLiveChat() {
    return authState.role === "seller" || hasPermission("live-chat");
  }

  function canAccessProductListing() {
    return authState.role === "seller" || hasPermission("products");
  }

  function canAccessOrders() {
    return authState.role === "seller";
  }

  function canAccessListingInsight() {
    return authState.role === "seller";
  }

  function canAccessInventory() {
    return authState.role === "seller" || hasPermission("admin-inventory") || hasPermission("employee-inventory");
  }

  function canAccessEmployees() {
    return authState.role === "seller";
  }

  function canAccessPacking() {
    return authState.role === "seller";
  }

  function canAccessVouchers() {
    return authState.role === "seller";
  }

  function getSellerNavItems() {
    return [
      {
        key: "dashboard",
        title: "Dashboard",
        view: "dashboard",
        icon: "dashboard",
        description: "Store overview, notices, and account activity.",
        children: [
          { title: "Overview", view: "dashboard" },
        ],
      },
      { key: "live-chat", title: "Live Chat", view: "live-chat", icon: "chat", description: "Open customer conversations and support messages." },
      {
        key: "orders",
        title: "Live Orders",
        view: "orders",
        icon: "orders",
        description: "Monitor live customer orders and fulfillment status.",
        children: ordersStatusFilterItems.map((item) => ({
          title: item.title,
          view: "orders",
          ordersFilter: item.filter,
        })),
      },
      {
        key: "listing-insight",
        title: "Listing Insight",
        view: "listing-insight",
        icon: "insight",
        description: "Review top products, sold units, revenue, and sales movement.",
        children: listingInsightRankingItems.map((item) => ({
          title: item.title,
          view: "listing-insight",
          listingInsightRanking: item.mode,
        })),
      },
      {
        key: "listing",
        title: "Listing",
        view: "listing",
        icon: "listing",
        description: "Manage product listings and item details.",
        children: listingFilterItems.map((item) => ({
          title: item.title,
          view: "listing",
          listingFilter: item.filter,
        })),
      },
      {
        key: "inventory",
        title: "Inventory",
        view: "inventory",
        icon: "stock",
        description: "Track stock levels, expiry status, and stock records.",
        children: inventoryFilterItems.map((item) => ({
          title: item.title,
          view: "inventory",
          inventoryFilter: item.filter,
        })),
      },
      {
        key: "vouchers",
        title: "Store Vouchers",
        view: "vouchers",
        icon: "vouchers",
        description: "Create store promos buyers can use at checkout on your listings.",
      },
      { key: "employees", title: "Employees", view: "employees", icon: "employees", description: "Manage employee records, access, and work information." },
      {
        key: "packing",
        title: "Dispatching",
        view: "packing",
        icon: "packing",
        description: "Scan, pack, and hand orders over to couriers.",
        children: packingStationFilterItems.map((item) => ({
          title: item.title,
          view: "packing",
          packingStation: item.filter,
        })),
      },
      { key: "feedback", title: "Feedback", action: "feedback", icon: "feedback", description: "Send platform feedback and ratings to Super Admin." },
      { key: "settings", title: "Settings", action: "account-settings", icon: "settings", description: "View profile, plan, and registration details." },
      { key: "sign-out", title: "Sign out", action: "sign-out", icon: "signOut", danger: true },
    ];
  }

  function getEmployeeNavItems() {
    const dashboardPath = getDashboardPath();
    const items = [
      {
        key: "dashboard",
        title: "Dashboard",
        view: "dashboard",
        icon: "dashboard",
        description: "Employee overview and assigned workspace.",
        children: [
          { title: "Overview", view: "dashboard" },
          { title: "Access", href: "/employee_access_pending.html" },
        ],
      },
    ];

    if (hasPermission("live-chat")) {
      items.push({ key: "live-chat", title: "Live Chat", view: "live-chat", icon: "chat", description: "Open assigned live chat workspace." });
    }
    if (hasPermission("employee-order")) {
      items.push({ key: "orders", title: "Orders", href: "/employee_order_insight.html", icon: "listing", description: "Open assigned order activity." });
    }
    if (hasPermission("employee-inventory") || hasPermission("admin-inventory")) {
      items.push({ key: "inventory", title: "Inventory", href: "/employee_stock.html", icon: "stock", description: "Open assigned stock workspace." });
    }
    if (normalizeText(authState.session?.position).toLowerCase() === "packing" || hasPermission("packing-dashboard")) {
      items.push({ key: "packing", title: "Packing", href: "/packing_dashboard.html", icon: "delivery", description: "Open packing dashboard." });
    }

    items.push(
      { key: "profile", title: "User Data", href: dashboardPath, icon: "user", description: "Open employee account workspace." },
      { key: "settings", title: "Settings", href: dashboardPath, icon: "settings", description: "Open employee settings." },
      { key: "sign-out", title: "Sign out", action: "sign-out", icon: "signOut", danger: true },
    );
    return items;
  }

  function getNavItems() {
    return authState.role === "seller" ? getSellerNavItems() : getEmployeeNavItems();
  }

  function readStoredMainSidebarOpen() {
    try {
      return window.localStorage?.getItem(mainSidebarOpenStorageKey) === "1";
    } catch (error) {
      return false;
    }
  }

  function writeStoredMainSidebarOpen(isOpen) {
    try {
      window.localStorage?.setItem(mainSidebarOpenStorageKey, isOpen ? "1" : "0");
    } catch (error) {
      // The drawer still works if browser storage is unavailable.
    }
  }

  function readStoredExpandedMainNavKey() {
    try {
      return normalizeText(window.localStorage?.getItem(expandedMainNavStorageKey)).toLowerCase();
    } catch (error) {
      return "";
    }
  }

  function writeStoredExpandedMainNavKey(key) {
    const nextKey = normalizeText(key).toLowerCase();
    try {
      if (nextKey) {
        window.localStorage?.setItem(expandedMainNavStorageKey, nextKey);
      } else {
        window.localStorage?.removeItem(expandedMainNavStorageKey);
      }
    } catch (error) {
      // Navigation can still work if storage is unavailable.
    }
  }

  function hasMainNavChildren(item) {
    return Array.isArray(item?.children) && item.children.length > 0;
  }

  function isMainNavChildActive(child) {
    if (child?.ordersFilter) {
      return activeMainView === "orders"
        && normalizeOrdersStatusFilter(child.ordersFilter) === ordersStatusFilter;
    }
    if (child?.inventoryFilter) {
      return activeMainView === "inventory"
        && normalizeInventoryPriorityFilter(child.inventoryFilter) === inventoryPriorityFilter;
    }
    if (child?.listingInsightRanking) {
      return activeMainView === "listing-insight"
        && normalizeListingInsightRankingMode(child.listingInsightRanking) === listingInsightRankingMode;
    }
    if (child?.listingFilter) {
      return activeMainView === "listing"
        && normalizeListingStatusFilter(child.listingFilter) === listingStatusFilter;
    }
    if (child?.packingStation) {
      return activeMainView === "packing"
        && normalizePackingStationFilter(child.packingStation) === packingStationFilter;
    }
    return child?.view === activeMainView;
  }

  function isMainNavExpandableKey(key, items = getNavItems()) {
    const normalizedKey = normalizeText(key).toLowerCase();
    return Boolean(
      normalizedKey
      && items.some((item) => normalizeText(item?.key).toLowerCase() === normalizedKey && hasMainNavChildren(item)),
    );
  }

  function getMainNavExpandedViewKey(view) {
    const normalizedView = normalizeText(view).toLowerCase();
    return ["orders", "listing-insight", "listing", "inventory", "packing"].includes(normalizedView)
      ? normalizedView
      : "";
  }

  function resolveMainNavExpandedKey(items = getNavItems()) {
    const currentKey = isMainNavExpandableKey(expandedMainNavKey, items)
      ? expandedMainNavKey
      : "";
    if (currentKey) {
      return currentKey;
    }

    const activeKey = getMainNavExpandedViewKey(activeMainView);
    return isMainNavExpandableKey(activeKey, items) ? activeKey : "";
  }

  function getBrandNameTextElement() {
    if (!elements.name) {
      return null;
    }

    if (elements.nameText instanceof HTMLElement && elements.name.contains(elements.nameText)) {
      return elements.nameText;
    }

    const existingText = elements.name.querySelector("[data-main-name-text]");
    if (existingText instanceof HTMLElement) {
      elements.nameText = existingText;
      return existingText;
    }

    const text = document.createElement("span");
    text.className = "main-brand__marquee-text";
    text.dataset.mainNameText = "true";
    text.textContent = normalizeText(elements.name.textContent) || "Switch";
    elements.name.replaceChildren(text);
    elements.nameText = text;
    return text;
  }

  function syncBrandMarquee() {
    const name = elements.name;
    const text = getBrandNameTextElement();
    if (!name || !text) {
      return;
    }

    name.classList.remove("is-marquee");
    text.style.removeProperty("--main-brand-marquee-distance");
    text.style.removeProperty("--main-brand-marquee-duration");

    if (!isSidebarOpen()) {
      return;
    }

    const availableWidth = name.clientWidth;
    const overflow = text.scrollWidth - availableWidth;
    if (availableWidth <= 0 || overflow <= 4) {
      return;
    }

    const distance = Math.ceil(overflow + 20);
    const duration = Math.max(7, Math.min(18, distance / 12));
    name.classList.add("is-marquee");
    text.style.setProperty("--main-brand-marquee-distance", `-${distance}px`);
    text.style.setProperty("--main-brand-marquee-duration", `${duration.toFixed(2)}s`);
  }

  function queueBrandMarqueeSync() {
    if (brandMarqueeFrame) {
      window.cancelAnimationFrame(brandMarqueeFrame);
    }
    brandMarqueeFrame = window.requestAnimationFrame(() => {
      brandMarqueeFrame = 0;
      syncBrandMarquee();
    });
  }

  function renderSellerEmptyLogo(brandMark) {
    brandMark?.classList.add("main-brand__mark--seller-empty");
    brandMark?.classList.remove("has-image");
    if (elements.logo instanceof HTMLImageElement) {
      elements.logo.onerror = null;
      elements.logo.removeAttribute("src");
      elements.logo.alt = "";
      elements.logo.hidden = true;
    }
    if (elements.fallback) {
      elements.fallback.innerHTML = sellerEmptyLogoSvg;
      elements.fallback.hidden = false;
    }
  }

  function renderMainHeaderProfile(identity = getIdentity()) {
    const isSeller = authState?.role === "seller";
    if (elements.headerProfileMenu instanceof HTMLElement) {
      elements.headerProfileMenu.hidden = !isSeller;
    }
    if (!isSeller) {
      setMainHeaderProfileMenuOpen(false);
      return;
    }

    const session = authState?.session || {};
    const profileName = firstText([identity?.name], "Company Seller");
    const profileEmail = firstText([
      session.email,
      session.adminEmail,
      session.contactEmail,
    ], "Seller account");
    const profileImageUrl = session.businessLogoSkipped === true ? "" : firstUrl([
      session.companyPictureUrl,
      session.companyProfileImageUrl,
      session.businessLogoUrl,
      session.profileImageUrl,
      session.avatarUrl,
      session.photoUrl,
      session.profilePhotoUrl,
      session.pictureUrl,
      session.imageUrl,
      session.logoUrl,
      session.company?.companyPictureUrl,
      session.company?.profileImageUrl,
      session.company?.logoUrl,
      session.store?.companyPictureUrl,
      session.store?.profileImageUrl,
      session.store?.logoUrl,
      session.profile?.companyPictureUrl,
      session.profile?.profileImageUrl,
      session.profile?.logoUrl,
      identity?.logoUrl,
    ]);
    const profileAvatar = elements.headerProfileImage?.closest?.(".main-header-profile__avatar");
    applySellerCompanyLogoTone(profileAvatar, profileName);
    profileAvatar?.classList.toggle("has-image", Boolean(profileImageUrl));

    elements.headerProfileToggle?.setAttribute("aria-label", `Open ${profileName} profile menu`);
    if (elements.headerProfileDropdownName) {
      elements.headerProfileDropdownName.textContent = profileName;
    }
    if (elements.headerProfileEmail) {
      elements.headerProfileEmail.textContent = profileEmail;
      elements.headerProfileEmail.title = profileEmail;
    }
    if (elements.headerProfileFallback) {
      elements.headerProfileFallback.innerHTML = sellerEmptyLogoSvg;
      elements.headerProfileFallback.hidden = Boolean(profileImageUrl);
    }
    if (elements.headerProfileImage instanceof HTMLImageElement) {
      elements.headerProfileImage.onerror = () => {
        elements.headerProfileImage.removeAttribute("src");
        elements.headerProfileImage.hidden = true;
        profileAvatar?.classList.remove("has-image");
        if (elements.headerProfileFallback) {
          elements.headerProfileFallback.hidden = false;
        }
      };
      if (profileImageUrl) {
        elements.headerProfileImage.src = profileImageUrl;
        elements.headerProfileImage.alt = `${profileName} profile`;
        elements.headerProfileImage.hidden = false;
      } else {
        elements.headerProfileImage.removeAttribute("src");
        elements.headerProfileImage.alt = "";
        elements.headerProfileImage.hidden = true;
      }
    }
  }

  function renderIdentity() {
    const identity = getIdentity();
    document.title = `${identity.name} - ${getMainViewTitle(activeMainView)}`;
    const nameText = getBrandNameTextElement();
    if (nameText) {
      nameText.textContent = identity.name;
      if (elements.name) {
        elements.name.title = identity.name;
      }
    } else if (elements.name) {
      elements.name.textContent = identity.name;
      elements.name.title = identity.name;
    }
    if (elements.subtitle) {
      elements.subtitle.textContent = identity.subtitle;
    }
    const brandMark = elements.logo?.closest?.(".main-brand__mark");
    if (authState.role === "seller") {
      applySellerCompanyLogoTone(brandMark, identity.name);
    }
    const isSellerEmptyLogo = authState.role === "seller" && !identity.logoUrl;
    brandMark?.classList.toggle("main-brand__mark--seller-empty", isSellerEmptyLogo);
    brandMark?.classList.toggle("has-image", authState.role === "seller" && Boolean(identity.logoUrl));
    if (elements.fallback) {
      if (isSellerEmptyLogo) {
        elements.fallback.innerHTML = sellerEmptyLogoSvg;
        elements.fallback.hidden = false;
      } else {
        elements.fallback.textContent = identity.fallback;
        elements.fallback.hidden = Boolean(identity.logoUrl);
      }
    }
    if (elements.logo instanceof HTMLImageElement) {
      if (identity.logoUrl) {
        elements.logo.onerror = () => {
          if (authState.role === "seller") {
            renderSellerEmptyLogo(brandMark);
            return;
          }
          elements.logo.hidden = true;
          if (elements.fallback) {
            elements.fallback.hidden = false;
          }
        };
        elements.logo.src = identity.logoUrl;
        elements.logo.alt = `${identity.name} logo`;
        elements.logo.hidden = false;
      } else if (authState.role === "seller") {
        renderSellerEmptyLogo(brandMark);
      } else {
        elements.logo.onerror = null;
        elements.logo.removeAttribute("src");
        elements.logo.alt = "";
        elements.logo.hidden = true;
      }
    }
    renderMainHeaderProfile(identity);
    queueBrandMarqueeSync();
  }

  function renderNav() {
    const items = getNavItems();
    const mainItems = items.filter((item) => item.action !== "sign-out");
    const signOutItem = items.find((item) => item.action === "sign-out");
    if (!elements.nav) {
      return;
    }

    const resolvedExpandedMainNavKey = resolveMainNavExpandedKey(items);
    if (expandedMainNavKey !== resolvedExpandedMainNavKey) {
      expandedMainNavKey = resolvedExpandedMainNavKey;
    }

    hideCollapsedMainSubNavTooltip();
    elements.nav.innerHTML = mainItems.map((item) => {
      const hasActiveChild = hasMainNavChildren(item)
        && item.children.some(isMainNavChildActive);
      const hasChildren = hasMainNavChildren(item);
      const subNavExpandedHeight = hasChildren
        ? (item.children.length * 29) + (Math.max(0, item.children.length - 1) * 2) + 4
        : 0;
      const isDashboardParent = item.key === "dashboard" && hasChildren;
      const isActive = isDashboardParent
        ? false
        : hasActiveChild || (item.view ? item.view === activeMainView : item.key === activeMainView);
      const isExpanded = hasChildren && item.key === resolvedExpandedMainNavKey;
      const isSubNavVisible = isExpanded || hasActiveChild;
      const children = hasChildren
          ? `<div
            class="main-nav__sublist${isExpanded ? " is-open" : ""}${hasActiveChild ? " has-active-child" : ""}${isSubNavVisible ? "" : " is-collapsed"}"
            data-main-nav-sublist
            aria-hidden="${isSubNavVisible ? "false" : "true"}"
            style="--main-subnav-expanded-height: ${subNavExpandedHeight}px"
          >
            ${item.children.map((child, index) => `
              <button
                type="button"
                class="main-nav__subitem${isMainNavChildActive(child) ? " is-active" : ""}"
                tabindex="${isSubNavVisible ? "0" : "-1"}"
                ${child.href ? `data-main-route="${child.href}"` : ""}
                ${child.view ? `data-main-view="${child.view}"` : ""}
                ${child.ordersFilter ? `data-main-orders-filter="${child.ordersFilter}"` : ""}
                ${child.listingInsightRanking ? `data-main-listing-insight-ranking="${child.listingInsightRanking}"` : ""}
                ${child.inventoryFilter ? `data-main-inventory-filter="${child.inventoryFilter}"` : ""}
                ${child.listingFilter ? `data-main-listing-filter="${child.listingFilter}"` : ""}
                ${child.packingStation ? `data-main-packing-station="${child.packingStation}"` : ""}
                ${isMainNavChildActive(child) ? 'aria-current="page"' : ""}
                data-main-search-text="${normalizeText(`${child.title} ${item.title}`).toLowerCase()}"
              >${child.title}</button>
            `).join("")}
          </div>`
        : "";
      return `
        <div
          class="main-nav__group${isExpanded ? " is-expanded" : ""}"
          data-main-nav-group
          data-main-nav-group-key="${item.key}"
          data-main-search-text="${normalizeText(`${item.title} ${item.description || ""}`).toLowerCase()}"
        >
          <button
            type="button"
            class="main-nav__item${isActive ? " is-active" : ""}${item.key === "live-chat" ? " main-nav__item--live-chat" : ""}${item.danger ? " main-nav__item--danger" : ""}"
            data-main-nav-key="${item.key}"
            ${item.href ? `data-main-route="${item.href}"` : ""}
            ${item.view ? `data-main-view="${item.view}"` : ""}
            ${item.action ? `data-main-action="${item.action}"` : ""}
            ${hasChildren ? `aria-expanded="${isExpanded ? "true" : "false"}"` : ""}
            ${isActive ? 'aria-current="page"' : ""}
          >
            <span class="main-nav__icon" aria-hidden="true">
              ${icons[item.icon] || icons.dashboard}
              ${item.key === "live-chat" ? '<span class="main-nav__badge" data-main-live-chat-badge hidden aria-hidden="true"></span>' : ""}
            </span>
            <span class="main-nav__label">${item.title}</span>
          </button>
          ${children}
        </div>`;
    }).join("");
    if (elements.sidebarFooter) {
      elements.sidebarFooter.innerHTML = signOutItem
        ? `
          <button
            type="button"
            class="main-nav__item main-nav__item--danger main-sidebar__sign-out"
            data-main-action="sign-out"
            aria-label="${signOutItem.title}"
            title="${signOutItem.title}"
          >
            <span class="main-nav__icon" aria-hidden="true">
              ${icons[signOutItem.icon] || icons.signOut}
            </span>
            <span class="main-nav__label">${signOutItem.title}</span>
          </button>`
        : "";
    }
    syncLiveChatNavBadge();
  }

  function syncMainNavSublistVisibility(sublist) {
    if (!(sublist instanceof HTMLElement)) {
      return;
    }

    if (sublist.classList.contains("is-opening")) {
      return;
    }

    const isRail = isMainSidebarCollapsedRail();
    const isOpen = sublist.classList.contains("is-open");
    const hasActiveChild = sublist.classList.contains("has-active-child");
    const isVisible = isRail ? (isOpen || hasActiveChild) : isOpen;
    const rowCount = sublist.querySelectorAll(".main-nav__subitem").length;
    const expandedHeight = rowCount > 0
      ? (rowCount * 29) + (Math.max(0, rowCount - 1) * 2) + 4
      : 0;
    sublist.style.setProperty("--main-subnav-expanded-height", `${expandedHeight}px`);
    sublist.classList.toggle("is-collapsed", !isVisible);
    sublist.setAttribute("aria-hidden", isVisible ? "false" : "true");
    sublist.querySelectorAll(".main-nav__subitem").forEach((subitem) => {
      subitem.tabIndex = isVisible ? 0 : -1;
    });
  }

  function expandMainNavGroup(groupKey, options = {}) {
    const normalizedKey = normalizeText(groupKey).toLowerCase();
    if (!normalizedKey || !isMainNavExpandableKey(normalizedKey)) {
      return;
    }

    const wasSidebarClosed = !isSidebarOpen();
    setSidebarOpen(true, { allowClosedOpen: true, preserveExpanded: true });

    const isAlreadyExpanded = expandedMainNavKey === normalizedKey;
    const nextKey = options.forceOpen === true
      ? normalizedKey
      : (isAlreadyExpanded && options.allowToggle !== false ? "" : normalizedKey);

    const applyExpansion = () => {
      const targetGroup = Array.from(elements.nav?.querySelectorAll("[data-main-nav-group]") || [])
        .find((item) => normalizeText(item.dataset.mainNavGroupKey).toLowerCase() === nextKey);
      const targetSublist = targetGroup?.querySelector("[data-main-nav-sublist]");
      const shouldForceFromCollapsed = options.forceFromCollapsed === true
        || wasSidebarClosed
        || targetSublist?.classList.contains("is-collapsed");

      setExpandedMainNavKey(nextKey, {
        persist: options.persist !== false,
        allowClose: !nextKey,
        skipSync: shouldForceFromCollapsed,
      });

      if (nextKey && shouldForceFromCollapsed) {
        targetGroup?.classList.add("is-expanded");
        targetSublist?.classList.add("is-open");
        targetGroup?.querySelector("[data-main-nav-key]")?.setAttribute("aria-expanded", "true");
        replayMainNavSublistOpen(nextKey, { forceFromCollapsed: true });
      } else if (nextKey) {
        replayMainNavSublistOpen(nextKey, { forceFromCollapsed: false });
      }

      if (typeof options.onExpanded === "function") {
        options.onExpanded();
      }
    };

    // Opening the drawer from the rail uses display changes; wait a frame so
    // max-height accordion can animate from 0 → expanded.
    if (wasSidebarClosed && nextKey) {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(applyExpansion);
      });
      return;
    }

    applyExpansion();
  }

  function syncMainNavExpansion() {
    if (!elements.nav) {
      return;
    }

    elements.nav.querySelectorAll("[data-main-nav-group]").forEach((group) => {
      const groupKey = normalizeText(group.dataset.mainNavGroupKey).toLowerCase();
      const isExpanded = Boolean(groupKey && groupKey === expandedMainNavKey);
      group.classList.toggle("is-expanded", isExpanded);

      const navButton = group.querySelector("[data-main-nav-key]");
      if (navButton) {
        if (group.querySelector("[data-main-nav-sublist]")) {
          navButton.setAttribute("aria-expanded", isExpanded ? "true" : "false");
        } else {
          navButton.removeAttribute("aria-expanded");
        }
      }

      const sublist = group.querySelector("[data-main-nav-sublist]");
      if (sublist) {
        sublist.classList.toggle("is-open", isExpanded);
        syncMainNavSublistVisibility(sublist);
      }
    });
  }

  function syncMainNavSelection() {
    if (!elements.nav) {
      return;
    }

    const itemsByKey = new Map(
      getNavItems().map((item) => [
        normalizeText(item?.key).toLowerCase(),
        item,
      ]),
    );

    elements.nav.querySelectorAll("[data-main-nav-group]").forEach((group) => {
      const groupKey = normalizeText(group.dataset.mainNavGroupKey).toLowerCase();
      const item = itemsByKey.get(groupKey);
      if (!item) {
        return;
      }

      const hasChildren = hasMainNavChildren(item);
      const hasActiveChild = hasChildren && item.children.some(isMainNavChildActive);
      const isDashboardParent = item.key === "dashboard" && hasChildren;
      const isActive = isDashboardParent
        ? false
        : hasActiveChild || (item.view ? item.view === activeMainView : item.key === activeMainView);
      const navButton = group.querySelector("[data-main-nav-key]");
      if (navButton) {
        navButton.classList.toggle("is-active", isActive);
        if (isActive) {
          navButton.setAttribute("aria-current", "page");
        } else {
          navButton.removeAttribute("aria-current");
        }
      }

      const subitems = Array.from(group.querySelectorAll(".main-nav__subitem"));
      const sublist = group.querySelector("[data-main-nav-sublist]");
      sublist?.classList.toggle("has-active-child", hasActiveChild);
      syncMainNavSublistVisibility(sublist);
      subitems.forEach((subitem, index) => {
        const isChildActive = Boolean(item.children?.[index])
          && isMainNavChildActive(item.children[index]);
        subitem.classList.toggle("is-active", isChildActive);
        if (isChildActive) {
          subitem.setAttribute("aria-current", "page");
        } else {
          subitem.removeAttribute("aria-current");
        }
      });
    });

    syncLiveChatNavBadge();
  }

  function focusMainNavButton(key) {
    const normalizedKey = normalizeText(key).toLowerCase();
    if (!normalizedKey || !elements.nav) {
      return;
    }

    const applyFocus = () => {
      const navButton = Array.from(elements.nav.querySelectorAll("[data-main-nav-key]"))
        .find((button) => normalizeText(button.dataset.mainNavKey).toLowerCase() === normalizedKey);
      if (!(navButton instanceof HTMLElement)) {
        return;
      }

      try {
        navButton.focus({ preventScroll: true });
      } catch (error) {
        navButton.focus();
      }
    };

    applyFocus();
    window.requestAnimationFrame(applyFocus);
  }

  function replayMainNavSublistOpen(key, options = {}) {
    const normalizedKey = normalizeText(key).toLowerCase();
    if (!normalizedKey || !elements.nav) {
      return;
    }

    const group = Array.from(elements.nav.querySelectorAll("[data-main-nav-group]"))
      .find((item) => normalizeText(item.dataset.mainNavGroupKey).toLowerCase() === normalizedKey);
    const sublist = group?.querySelector("[data-main-nav-sublist]");
    if (!(sublist instanceof HTMLElement)) {
      return;
    }

    if (!sublist.classList.contains("is-open")) {
      sublist.classList.add("is-open");
    }

    if (options.forceFromCollapsed === true) {
      sublist.classList.add("is-collapsed");
      void sublist.offsetWidth;
    }

    sublist.classList.remove("is-collapsed");
    sublist.classList.remove("is-opening");
    void sublist.offsetWidth;
    sublist.classList.add("is-opening");
    window.setTimeout(() => {
      sublist.classList.remove("is-opening");
      syncMainNavSublistVisibility(sublist);
    }, 260);
  }

  function setExpandedMainNavKey(key, options = {}) {
    const requestedKey = normalizeText(key).toLowerCase();
    const requestedNextKey = requestedKey && isMainNavExpandableKey(requestedKey) ? requestedKey : "";
    const shouldKeepOpenSubmenu = !requestedNextKey
      && options.allowClose !== true
      && isMainNavExpandableKey(expandedMainNavKey);
    const nextKey = shouldKeepOpenSubmenu ? expandedMainNavKey : requestedNextKey;
    if (nextKey && collapseMainNavTimer) {
      window.clearTimeout(collapseMainNavTimer);
      collapseMainNavTimer = 0;
    }
    if (expandedMainNavKey === nextKey) {
      if (options.persist !== false) {
        writeStoredExpandedMainNavKey(nextKey);
      }
      if (options.skipSync !== true) {
        syncMainNavExpansion();
      }
      return;
    }

    expandedMainNavKey = nextKey;
    if (options.persist !== false) {
      writeStoredExpandedMainNavKey(nextKey);
    }
    if (options.render === true) {
      renderNav();
      return;
    }

    if (options.skipSync !== true) {
      syncMainNavExpansion();
    }
  }

  function countUnreadCustomerChatMessages(thread) {
    const messages = Array.isArray(thread?.messages) ? thread.messages : [];
    if (!messages.length) {
      return 0;
    }

    const supportReadAt = normalizeText(thread?.supportReadAt);
    let supportReadTime = null;
    if (supportReadAt) {
      const supportReadDate = new Date(supportReadAt);
      if (!Number.isNaN(supportReadDate.getTime())) {
        supportReadTime = supportReadDate.getTime();
      }
    }

    let count = 0;
    messages.forEach((message) => {
      if (message?.isFromSupport === true) {
        return;
      }
      const timestamp = normalizeText(message?.timestamp);
      if (!timestamp) {
        return;
      }
      const messageDate = new Date(timestamp);
      if (Number.isNaN(messageDate.getTime())) {
        return;
      }
      if (supportReadTime === null || messageDate.getTime() > supportReadTime) {
        count += 1;
      }
    });
    return count;
  }

  function hasUnreadCustomerChatMessage(thread) {
    return countUnreadCustomerChatMessages(thread) > 0;
  }

  function formatLiveChatNavBadgeCount(count) {
    const safeCount = Math.max(0, Number(count) || 0);
    if (safeCount <= 0) {
      return "";
    }
    if (safeCount > 99) {
      return "99+";
    }
    return String(safeCount);
  }

  function liveChatCountUnreadChats() {
    return liveChatRedesignConversations.filter((conversation) => {
      if (liveChatPrefsFor(conversation.id).muted) {
        return false;
      }
      return Number(conversation.unread) > 0;
    }).length;
  }

  function syncLiveChatNavBadge() {
    const badge = elements.nav?.querySelector("[data-main-live-chat-badge]");
    if (!badge) {
      return;
    }
    const label = formatLiveChatNavBadgeCount(liveChatUnreadCount);
    const visible = liveChatUnreadCount > 0;
    badge.hidden = !visible;
    badge.textContent = label;
    badge.classList.toggle("is-wide", label === "99+");
    badge.setAttribute("aria-hidden", visible ? "false" : "true");
    if (visible) {
      badge.setAttribute(
        "aria-label",
        `${liveChatUnreadCount > 99 ? "99 plus" : liveChatUnreadCount} unread chats`,
      );
    } else {
      badge.removeAttribute("aria-label");
    }
  }

  async function refreshLiveChatNavBadge() {
    if (!elements.nav?.querySelector("[data-main-nav-key='live-chat']")) {
      return;
    }
    if (liveChatNavBadgeRefreshInFlight) {
      return;
    }

    liveChatNavBadgeRefreshInFlight = true;
    try {
      const response = await fetch("/api/chat-support", {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message || "Unable to load live chat unread count.");
      }

      liveChatUnreadCount = (Array.isArray(data?.threads) ? data.threads : [])
        .filter(hasUnreadCustomerChatMessage)
        .length;
    } catch (_) {
      liveChatUnreadCount = Math.max(0, liveChatUnreadCount);
    } finally {
      liveChatNavBadgeRefreshInFlight = false;
      syncLiveChatNavBadge();
    }
  }

  function startLiveChatNavBadgeMonitoring() {
    if (!elements.nav?.querySelector("[data-main-nav-key='live-chat']")) {
      if (liveChatNavBadgeRefreshTimer) {
        window.clearInterval(liveChatNavBadgeRefreshTimer);
        liveChatNavBadgeRefreshTimer = 0;
      }
      liveChatUnreadCount = 0;
      return;
    }
    syncLiveChatNavBadge();
    void refreshLiveChatNavBadge();
    if (!liveChatNavBadgeRefreshTimer) {
      liveChatNavBadgeRefreshTimer = window.setInterval(
        refreshLiveChatNavBadge,
        liveChatNavBadgeRefreshIntervalMs,
      );
    }
  }

  function renderSummary() {
    const identity = getIdentity();
    const dashboardPath = getDashboardPath();
    const navItems = getNavItems().filter((item) => item.action !== "sign-out");
    const summary = [
      { key: "company", label: "Workspace", value: authState.role === "seller" ? "Seller" : "Employee", note: identity.subtitle, icon: icons.company, tone: "company" },
      { key: "dashboard", label: "Dashboard", value: "Ready", note: dashboardPath.replace("/", ""), icon: icons.dashboard, tone: "dashboard" },
      { key: "tools", label: "Tools", value: String(navItems.length), note: "Available links", icon: icons.listing, tone: "tools" },
      { key: "settings", label: "Status", value: "Online", note: "Live session", icon: icons.settings, tone: "live", trendClass: "is-neutral" },
    ];

    if (elements.summary) {
      elements.summary.classList.add("super-admin-stats", "main-summary");
      if (window.GmsAdminSummaryCards?.render) {
        window.GmsAdminSummaryCards.render(elements.summary, summary.map((item) => ({
          key: item.key,
          label: item.label,
          value: item.value,
          note: item.note,
          icon: item.icon,
          tone: item.tone,
          trendClass: item.trendClass || "",
          dataset: {
            mainSearchText: normalizeText(`${item.label} ${item.value} ${item.note}`).toLowerCase(),
          },
        })));
        elements.summary.querySelectorAll(".super-admin-stat").forEach((card) => {
          if (card instanceof HTMLElement && card.dataset.mainSearchText) {
            card.setAttribute("data-main-search-text", card.dataset.mainSearchText);
          }
        });
      }
    }

    if (elements.links) {
      elements.links.innerHTML = navItems.map((item) => `
        <a
          class="main-tool"
          href="${item.view ? (item.view === "dashboard" ? "#dashboard" : `#${item.view}`) : item.href || dashboardPath}"
          ${item.view ? `data-main-view="${item.view}"` : ""}
          data-main-search-text="${normalizeText(`${item.title} ${item.description || ""}`).toLowerCase()}"
        >
          <span class="main-tool__top">
            <span class="main-tool__icon">${icons[item.icon] || icons.dashboard}</span>
            <span class="main-tool__status">Open</span>
          </span>
          <span>
            <h2>${item.title}</h2>
            <p>${item.description || "Open workspace tool."}</p>
          </span>
        </a>
      `).join("");
    }

    if (elements.openDashboard) {
      elements.openDashboard.href = dashboardPath;
    }
    if (elements.title) {
      elements.title.textContent = authState.role === "seller" ? "Seller Workspace" : "Employee Workspace";
    }
    if (elements.description) {
      elements.description.textContent = authState.role === "seller"
        ? "Monitor seller activity, listings, partners, and employee records."
        : "Monitor assigned tools, session status, and employee workspace access.";
    }
    if (elements.breadcrumb) {
      elements.breadcrumb.textContent = authState.role === "seller"
        ? "Dashboard / Seller / Main"
        : "Dashboard / Employee / Main";
    }
    if (elements.search instanceof HTMLInputElement && activeMainView === "dashboard") {
      elements.search.placeholder = authState.role === "seller" ? "Search Seller Workspace" : "Search Employee Workspace";
    }
  }

  function isSidebarOpen() {
    return elements.body.classList.contains("main-sidebar-open");
  }

  function isMainSidebarCollapsedRail() {
    return window.matchMedia("(min-width: 861px)").matches && !isSidebarOpen();
  }

  function ensureCollapsedMainSubNavTooltip() {
    if (collapsedMainSubNavTooltip instanceof HTMLElement) {
      return collapsedMainSubNavTooltip;
    }

    const tooltip = document.createElement("div");
    tooltip.id = "main-collapsed-subnav-tooltip";
    tooltip.className = "main-collapsed-subnav-tooltip";
    tooltip.setAttribute("role", "tooltip");
    tooltip.hidden = true;
    document.body.appendChild(tooltip);
    collapsedMainSubNavTooltip = tooltip;
    return tooltip;
  }

  function hideCollapsedMainSubNavTooltip() {
    collapsedMainSubNavTooltipAnchor?.removeAttribute("aria-describedby");
    collapsedMainSubNavTooltipAnchor = null;
    if (!(collapsedMainSubNavTooltip instanceof HTMLElement)) {
      return;
    }
    collapsedMainSubNavTooltip.classList.remove("is-visible");
    collapsedMainSubNavTooltip.hidden = true;
  }

  function showCollapsedMainSubNavTooltip(item) {
    const isSubNavItem = item instanceof HTMLElement
      && item.matches(".main-nav__subitem");
    if (
      !(item instanceof HTMLElement)
      || !isMainSidebarCollapsedRail()
      || (
        isSubNavItem
        && !item.closest(".main-nav__sublist:is(.is-open, .has-active-child)")
      )
    ) {
      hideCollapsedMainSubNavTooltip();
      return;
    }

    const label = normalizeText(
      (isSubNavItem ? item : item.querySelector(".main-nav__label"))?.textContent
      || item.getAttribute("aria-label")
      || item.getAttribute("title")
      || "",
    );
    if (!label) {
      hideCollapsedMainSubNavTooltip();
      return;
    }

    const tooltip = ensureCollapsedMainSubNavTooltip();
    tooltip.textContent = label;
    tooltip.hidden = false;
    collapsedMainSubNavTooltipAnchor?.removeAttribute("aria-describedby");
    collapsedMainSubNavTooltipAnchor = item;
    item.setAttribute("aria-describedby", tooltip.id);

    const itemRect = item.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const left = Math.min(window.innerWidth - tooltipRect.width - 10, itemRect.right + 10);
    const top = Math.max(
      8,
      Math.min(
        window.innerHeight - tooltipRect.height - 8,
        itemRect.top + (itemRect.height - tooltipRect.height) / 2,
      ),
    );
    tooltip.style.left = `${Math.round(left)}px`;
    tooltip.style.top = `${Math.round(top)}px`;
    tooltip.classList.add("is-visible");
  }

  function syncSidebarToggleState() {
    const isOpen = isSidebarOpen();
    document.querySelectorAll("[data-main-sidebar-toggle], [data-lcx-navigation-toggle]").forEach((toggle) => {
      toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
      toggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
      toggle.setAttribute("title", isOpen ? "Close navigation" : "Open navigation");
    });
  }

  function setSidebarOpen(isOpen, options = {}) {
    const shouldOpen = Boolean(isOpen);
    if (shouldOpen && !isSidebarOpen() && options.allowClosedOpen !== true) {
      syncSidebarToggleState();
      return;
    }
    hideCollapsedMainSubNavTooltip();
    elements.body.classList.toggle("main-sidebar-open", shouldOpen);
    writeStoredMainSidebarOpen(shouldOpen);
    if (shouldOpen) {
      const restoredExpandedKey = resolveMainNavExpandedKey();
      if (restoredExpandedKey && restoredExpandedKey !== expandedMainNavKey) {
        setExpandedMainNavKey(restoredExpandedKey, { persist: false });
      } else {
        syncMainNavExpansion();
      }
    } else if (options.preserveExpanded !== true) {
      setExpandedMainNavKey("", { persist: false });
    }
    syncSidebarToggleState();
    queueBrandMarqueeSync();
    if (brandMarqueeTimeout) {
      window.clearTimeout(brandMarqueeTimeout);
    }
    brandMarqueeTimeout = window.setTimeout(() => {
      brandMarqueeTimeout = 0;
      queueBrandMarqueeSync();
      syncMainEmployeesDrawerMetrics();
    }, 260);
    syncMainEmployeesDrawerMetrics();
  }

  function filterWorkspace(query) {
    const normalizedQuery = normalizeText(query).toLowerCase();
    const searchableItems = document.querySelectorAll("[data-main-search-text]");
    let visibleTools = 0;

    searchableItems.forEach((item) => {
      const isVisible = !normalizedQuery || normalizeText(item.dataset.mainSearchText).includes(normalizedQuery);
      item.hidden = !isVisible;
      if (item.classList.contains("main-tool") && isVisible) {
        visibleTools += 1;
      }
    });

    const existingEmpty = elements.links?.querySelector("[data-main-empty]");
    if (existingEmpty) {
      existingEmpty.remove();
    }
    if (elements.links && normalizedQuery && visibleTools === 0) {
      const empty = window.GMS_ADMIN_SEARCH_NOT_FOUND?.create({
        className: "main-empty",
      }) || document.createElement("div");
      empty.dataset.mainEmpty = "true";
      if (!empty.dataset.gmsAdminSearchNotFound) {
        empty.className = "main-empty";
        empty.textContent = "Not Found";
      }
      elements.links.appendChild(empty);
    }
  }

  function syncLiveChatSearch(query) {
    liveChatSearchQuery = String(query ?? "");
    if (!(elements.liveChatSearchBridge instanceof HTMLInputElement)) {
      return;
    }

    elements.liveChatSearchBridge.value = liveChatSearchQuery;
    elements.liveChatSearchBridge.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function syncListingInsightSearch(query) {
    listingInsightSearchQuery = String(query ?? "");
    const frame = elements.listingInsightFrame;
    if (!(frame instanceof HTMLIFrameElement)) {
      return;
    }

    try {
      const searchInput = frame.contentDocument?.getElementById("product-insight-sold-search");
      const inputConstructor = frame.contentWindow?.HTMLInputElement;
      if (!inputConstructor || !(searchInput instanceof inputConstructor)) {
        return;
      }
      searchInput.value = listingInsightSearchQuery;
      searchInput.dispatchEvent(new Event("input", { bubbles: true }));
    } catch (error) {
      // The iframe may still be navigating; the search is synced again on load.
    }
  }

  function setListingInsightHeaderFilterOpen(isOpen) {
    const shouldOpen = Boolean(isOpen && activeMainView === "listing-insight");
    if (elements.listingInsightHeaderFilterPanel instanceof HTMLElement) {
      elements.listingInsightHeaderFilterPanel.hidden = !shouldOpen;
    }
    elements.listingInsightHeaderFilterToggle?.setAttribute(
      "aria-expanded",
      shouldOpen ? "true" : "false",
    );
    elements.listingInsightHeaderFilter?.classList.toggle("is-open", shouldOpen);
  }

  function normalizeListingInsightHeaderFilters(filters = listingInsightHeaderFilters) {
    const source = filters && typeof filters === "object" ? filters : {};
    const normalizeChoice = (value, allowed, fallback = "all") => {
      const normalizedValue = normalizeText(value).toLowerCase();
      return allowed.includes(normalizedValue) ? normalizedValue : fallback;
    };
    return {
      category: normalizeText(source.category).toLowerCase() || "all",
      availability: normalizeChoice(
        source.availability,
        ["all", "active", "out-of-stock", "inactive"],
      ),
      period: normalizeChoice(
        source.period,
        ["all", "daily", "weekly", "monthly", "yearly"],
      ),
    };
  }

  function getListingInsightHeaderFilterControlLabel(control) {
    return normalizeText(control?.closest?.("label")?.querySelector("span:last-child")?.textContent);
  }

  function getListingInsightHeaderFilterControls() {
    return Array.from(
      elements.listingInsightHeaderFilterPanel?.querySelectorAll(
        "[data-main-listing-insight-header-filter-control]",
      ) || [],
    );
  }

  function renderListingInsightHeaderCategoryOptions(categories = []) {
    const container = elements.listingInsightHeaderCategoryOptions;
    if (!(container instanceof HTMLElement)) {
      return;
    }

    const seen = new Set();
    listingInsightHeaderCategoryOptions = (Array.isArray(categories) ? categories : [])
      .map((category) => normalizeText(category))
      .filter((category) => {
        const key = category.toLowerCase();
        if (!key || seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });

    listingInsightHeaderFilters = normalizeListingInsightHeaderFilters(listingInsightHeaderFilters);
    const selectedCategory = listingInsightHeaderFilters.category;
    const categoryStillExists = selectedCategory === "all"
      || listingInsightHeaderCategoryOptions.some(
        (category) => category.toLowerCase() === selectedCategory,
      );
    if (!categoryStillExists) {
      listingInsightHeaderFilters.category = "all";
    }

    const fragment = document.createDocumentFragment();
    const options = [
      { value: "all", label: "All categories" },
      ...listingInsightHeaderCategoryOptions.map((category) => ({
        value: category.toLowerCase(),
        label: category,
      })),
    ];
    options.forEach((option) => {
      const label = document.createElement("label");
      label.className = "main-orders-header-filter__radio";

      const input = document.createElement("input");
      input.type = "radio";
      input.name = "main-listing-insight-category-filter";
      input.value = option.value;
      input.dataset.mainListingInsightHeaderFilterControl = "category";
      input.checked = option.value === listingInsightHeaderFilters.category;

      const mark = document.createElement("span");
      mark.className = "main-orders-header-filter__radio-mark";
      mark.setAttribute("aria-hidden", "true");

      const copy = document.createElement("span");
      copy.textContent = option.label;
      label.append(input, mark, copy);
      fragment.appendChild(label);
    });
    container.replaceChildren(fragment);
    syncListingInsightHeaderFilterUi();
  }

  function syncListingInsightHeaderFilterUi() {
    listingInsightHeaderFilters = normalizeListingInsightHeaderFilters(
      listingInsightHeaderFilters,
    );
    const normalizedRanking = normalizeListingInsightRankingMode(listingInsightRankingMode);
    elements.listingInsightHeaderRankingFilters.forEach((control) => {
      if (control instanceof HTMLInputElement) {
        control.checked = control.value === normalizedRanking;
      }
    });

    const controls = getListingInsightHeaderFilterControls();
    controls.forEach((control) => {
      if (!(control instanceof HTMLInputElement)) {
        return;
      }
      const field = control.dataset.mainListingInsightHeaderFilterControl;
      control.checked = control.value === String(listingInsightHeaderFilters[field] || "all");
    });

    if (!elements.listingInsightHeaderFilterSummary) {
      return;
    }
    const rankingControl = elements.listingInsightHeaderRankingFilters.find(
      (control) => control instanceof HTMLInputElement && control.checked,
    );
    const categoryControl = controls.find(
      (control) => control instanceof HTMLInputElement
        && control.dataset.mainListingInsightHeaderFilterControl === "category"
        && control.checked,
    );
    const availabilityControl = controls.find(
      (control) => control instanceof HTMLInputElement
        && control.dataset.mainListingInsightHeaderFilterControl === "availability"
        && control.checked,
    );
    const periodControl = controls.find(
      (control) => control instanceof HTMLInputElement
        && control.dataset.mainListingInsightHeaderFilterControl === "period"
        && control.checked,
    );
    const scopeLabels = [];
    if (listingInsightHeaderFilters.category !== "all") {
      scopeLabels.push(getListingInsightHeaderFilterControlLabel(categoryControl));
    }
    if (listingInsightHeaderFilters.availability !== "all") {
      scopeLabels.push(getListingInsightHeaderFilterControlLabel(availabilityControl));
    }
    if (!scopeLabels.length) {
      scopeLabels.push("All Listings");
    }
    scopeLabels.push(
      getListingInsightHeaderFilterControlLabel(rankingControl) || "Sold",
      getListingInsightHeaderFilterControlLabel(periodControl) || "Overall",
    );
    elements.listingInsightHeaderFilterSummary.textContent = scopeLabels.filter(Boolean).join(", ");
  }

  function syncListingInsightHeaderFilters() {
    listingInsightHeaderFilters = normalizeListingInsightHeaderFilters(
      listingInsightHeaderFilters,
    );
    const frame = elements.listingInsightFrame;
    if (!(frame instanceof HTMLIFrameElement)) {
      return;
    }
    const payload = { ...listingInsightHeaderFilters };
    try {
      const frameWindow = frame.contentWindow;
      const setter = frameWindow?.GMS_MAIN_LISTING_INSIGHT_SET_FILTERS;
      if (typeof setter === "function") {
        setter(payload);
        return;
      }
      frameWindow?.postMessage(
        { type: "gms-main-listing-insight-filters", filters: payload },
        window.location.origin,
      );
    } catch (error) {
      // The iframe may still be navigating; filters are synced again on load.
    }
  }

  function replaceListingInsightRankingHistory() {
    if (activeMainView !== "listing-insight") {
      return;
    }
    const url = new URL(window.location.href);
    url.hash = `listing-insight/${normalizeListingInsightRankingMode(listingInsightRankingMode)}`;
    window.history.replaceState(
      { mainView: "listing-insight", listingInsightRankingMode },
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  }

  function syncListingInsightRankingMode(mode = listingInsightRankingMode) {
    listingInsightRankingMode = normalizeListingInsightRankingMode(mode);
    syncListingInsightHeaderFilterUi();
    syncMainFilterBreadcrumbs();
    const frame = elements.listingInsightFrame;
    if (!(frame instanceof HTMLIFrameElement)) {
      return;
    }

    try {
      const frameWindow = frame.contentWindow;
      const rankingSetter = frameWindow?.GMS_MAIN_LISTING_INSIGHT_SET_RANKING_MODE;
      if (typeof rankingSetter === "function") {
        rankingSetter(listingInsightRankingMode);
        return;
      }
      frameWindow?.postMessage(
        {
          type: "gms-main-listing-insight-ranking-mode",
          mode: listingInsightRankingMode,
        },
        window.location.origin,
      );
    } catch (error) {
      // The iframe may still be navigating; the mode is synced again on load.
    }
  }

  function syncOrdersSearch(query) {
    ordersSearchQuery = String(query ?? "");
    const frame = elements.ordersFrame;
    if (!(frame instanceof HTMLIFrameElement)) {
      return;
    }

    try {
      const searchInput = frame.contentDocument?.getElementById("insight-order-search");
      const inputConstructor = frame.contentWindow?.HTMLInputElement;
      if (!inputConstructor || !(searchInput instanceof inputConstructor)) {
        return;
      }
      searchInput.value = ordersSearchQuery;
      searchInput.dispatchEvent(new Event("input", { bubbles: true }));
    } catch (error) {
      // The iframe may still be navigating; the search is synced again on load.
    }
  }

  function syncOrdersStatusFilter(filter = ordersStatusFilter) {
    ordersStatusFilter = normalizeOrdersStatusFilter(filter);
    const frame = elements.ordersFrame;
    if (!(frame instanceof HTMLIFrameElement)) {
      return;
    }

    try {
      const frameWindow = frame.contentWindow;
      const statusSetter = frameWindow?.GMS_MAIN_ORDERS_SET_STATUS_FILTER;
      if (typeof statusSetter === "function") {
        statusSetter(ordersStatusFilter);
        return;
      }

      const statusButton = frame.contentDocument?.querySelector(
        `[data-insight-status-filter="${ordersStatusFilter}"]`,
      );
      const elementConstructor = frameWindow?.HTMLElement;
      if (
        elementConstructor
        && statusButton instanceof elementConstructor
        && statusButton.getAttribute("aria-pressed") !== "true"
      ) {
        statusButton.click();
      }
    } catch (error) {
      // The iframe may still be navigating; the status is synced again on load.
    }
  }

  function setOrdersHeaderFilterOpen(isOpen) {
    const shouldOpen = Boolean(isOpen && activeMainView === "orders");
    if (elements.ordersHeaderFilterPanel instanceof HTMLElement) {
      elements.ordersHeaderFilterPanel.hidden = !shouldOpen;
    }
    elements.ordersHeaderFilterToggle?.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
    elements.ordersHeaderFilter?.classList.toggle("is-open", shouldOpen);
  }

  function normalizeOrdersAdvancedFilters(filters = ordersAdvancedFilters) {
    const source = filters && typeof filters === "object" ? filters : {};
    const normalizeChoice = (value, allowed, fallback = "all") => {
      const normalizedValue = normalizeText(value).toLowerCase();
      return allowed.includes(normalizedValue) ? normalizedValue : fallback;
    };
    return {
      action: normalizeChoice(source.action, ["all", "payment-required", "waybill-required", "ready-to-pack", "cancel-request"]),
      courier: normalizeText(source.courier).toLowerCase() || "all",
      payment: normalizeChoice(source.payment, ["all", "paid", "balance-due", "cod"]),
      paymentPartner: normalizeText(source.paymentPartner).toLowerCase() || "all",
      waybill: normalizeChoice(source.waybill, ["all", "not-printed", "printed", "not-required"]),
      date: normalizeChoice(source.date, ["all", "today", "7-days", "30-days", "custom"]),
      customStart: /^\d{4}-\d{2}-\d{2}$/.test(String(source.customStart || "")) ? String(source.customStart) : "",
      customEnd: /^\d{4}-\d{2}-\d{2}$/.test(String(source.customEnd || "")) ? String(source.customEnd) : "",
      sort: normalizeChoice(source.sort, ["newest", "oldest", "amount-high", "amount-low", "quantity-high", "quantity-low"], "newest"),
    };
  }

  function getOrdersHeaderFilterControlLabel(control) {
    return normalizeText(control?.closest?.("label")?.querySelector("span:last-child")?.textContent);
  }

  function renderOrdersHeaderDynamicFilterOptions(container, config = {}) {
    if (!(container instanceof HTMLElement)) {
      return;
    }
    const options = Array.isArray(config.options) ? config.options : [];
    const fragment = document.createDocumentFragment();
    const normalizedOptions = [
      { value: "all", label: config.allLabel || "All" },
      ...options
        .map((option) => ({
          value: normalizeText(option?.value).toLowerCase(),
          label: normalizeText(option?.label),
        }))
        .filter((option) => option.value && option.value !== "all" && option.label),
    ];
    normalizedOptions.forEach((option) => {
      const label = document.createElement("label");
      label.className = "main-orders-header-filter__radio";
      const input = document.createElement("input");
      input.type = "radio";
      input.name = config.name;
      input.value = option.value;
      input.dataset.mainOrdersHeaderAdvancedFilter = config.field;
      const mark = document.createElement("span");
      mark.className = "main-orders-header-filter__radio-mark";
      mark.setAttribute("aria-hidden", "true");
      const copy = document.createElement("span");
      copy.textContent = option.label;
      label.append(input, mark, copy);
      fragment.append(label);
    });
    container.replaceChildren(fragment);
  }

  function updateOrdersHeaderFilterOptions(payload = {}) {
    renderOrdersHeaderDynamicFilterOptions(elements.ordersHeaderCourierOptions, {
      name: "main-orders-header-courier-filter",
      field: "courier",
      allLabel: "All couriers",
      options: payload.couriers,
    });
    renderOrdersHeaderDynamicFilterOptions(elements.ordersHeaderPaymentPartnerOptions, {
      name: "main-orders-header-payment-partner-filter",
      field: "paymentPartner",
      allLabel: "All partners",
      options: payload.paymentPartners,
    });
    syncOrdersHeaderFilterUi();
  }

  function syncOrdersAdvancedFilters() {
    ordersAdvancedFilters = normalizeOrdersAdvancedFilters(ordersAdvancedFilters);
    const frame = elements.ordersFrame;
    if (!(frame instanceof HTMLIFrameElement)) {
      return;
    }
    try {
      frame.contentWindow?.GMS_MAIN_ORDERS_SET_ADVANCED_FILTERS?.({ ...ordersAdvancedFilters });
    } catch (error) {
      // The iframe may still be navigating; filters are synced again on load.
    }
  }

  function syncOrdersHeaderFilterUi() {
    const normalizedFilter = normalizeOrdersStatusFilter(ordersStatusFilter);
    const activeFilter = ordersStatusFilterItems.find((item) => item.filter === normalizedFilter);
    ordersAdvancedFilters = normalizeOrdersAdvancedFilters(ordersAdvancedFilters);
    elements.ordersHeaderStatusFilters.forEach((control) => {
      if (control instanceof HTMLInputElement) {
        control.checked = control.value === normalizedFilter;
      }
    });
    const advancedControls = Array.from(
      elements.ordersHeaderFilterPanel?.querySelectorAll("[data-main-orders-header-advanced-filter]") || [],
    );
    advancedControls.forEach((control) => {
      if (!(control instanceof HTMLInputElement)) {
        return;
      }
      const field = control.dataset.mainOrdersHeaderAdvancedFilter;
      control.checked = control.value === String(ordersAdvancedFilters[field] || "all");
    });
    elements.ordersHeaderCustomDates.forEach((control) => {
      if (control instanceof HTMLInputElement) {
        const field = control.dataset.mainOrdersHeaderCustomDate;
        control.value = String(ordersAdvancedFilters[field] || "");
      }
    });
    if (elements.ordersHeaderDateRange instanceof HTMLElement) {
      elements.ordersHeaderDateRange.hidden = ordersAdvancedFilters.date !== "custom";
    }

    const activeLabels = [];
    if (normalizedFilter !== "all") {
      activeLabels.push(activeFilter?.title || "Filtered status");
    }
    const defaultValues = {
      action: "all",
      courier: "all",
      payment: "all",
      paymentPartner: "all",
      waybill: "all",
      date: "all",
    };
    Object.entries(defaultValues).forEach(([field, defaultValue]) => {
      if (ordersAdvancedFilters[field] === defaultValue) {
        return;
      }
      const selectedControl = advancedControls.find(
        (control) => control instanceof HTMLInputElement
          && control.dataset.mainOrdersHeaderAdvancedFilter === field
          && control.checked,
      );
      activeLabels.push(getOrdersHeaderFilterControlLabel(selectedControl) || "Filtered");
    });
    if (!activeLabels.length) {
      activeLabels.push("All");
    }
    const selectedSortControl = advancedControls.find(
      (control) => control instanceof HTMLInputElement
        && control.dataset.mainOrdersHeaderAdvancedFilter === "sort"
        && control.checked,
    );
    activeLabels.push(getOrdersHeaderFilterControlLabel(selectedSortControl) || "Newest");
    if (elements.ordersHeaderFilterSummary) {
      elements.ordersHeaderFilterSummary.textContent = activeLabels.join(", ");
    }
  }

  function applyOrdersHeaderStatusFilter(filter, options = {}) {
    ordersStatusFilter = normalizeOrdersStatusFilter(filter);
    syncOrdersStatusFilter(ordersStatusFilter);
    syncOrdersAdvancedFilters();
    syncOrdersHeaderFilterUi();
    syncMainFilterBreadcrumbs();
    renderNav();

    if (options.updateHistory !== false) {
      const url = new URL(window.location.href);
      url.hash = ordersStatusFilter === "all" ? "orders" : `orders/${ordersStatusFilter}`;
      window.history.pushState({ mainView: "orders" }, "", `${url.pathname}${url.search}${url.hash}`);
    }
  }

  function syncProductListingSearch(query) {
    productListingSearchQuery = String(query ?? "");
    const inlineSearchInput = document.getElementById("product-search-input");
    if (inlineSearchInput instanceof HTMLInputElement) {
      if (inlineSearchInput.value !== productListingSearchQuery) {
        inlineSearchInput.value = productListingSearchQuery;
      }
      inlineSearchInput.dispatchEvent(new Event("input", { bubbles: true }));
      return;
    }

    const frame = elements.listingFrame;
    if (!(frame instanceof HTMLIFrameElement)) {
      return;
    }

    try {
      const searchInput = frame.contentDocument?.getElementById("product-search-input");
      const inputConstructor = frame.contentWindow?.HTMLInputElement;
      if (!inputConstructor || !(searchInput instanceof inputConstructor)) {
        return;
      }
      searchInput.value = productListingSearchQuery;
      searchInput.dispatchEvent(new Event("input", { bubbles: true }));
    } catch (error) {
      // The iframe may still be navigating; the search is synced again on load.
    }
  }

  function syncInventorySearch(query) {
    inventorySearchQuery = String(query ?? "");
    const frame = elements.inventoryFrame;
    if (!(frame instanceof HTMLIFrameElement)) {
      return;
    }

    try {
      const searchInput = frame.contentDocument?.getElementById("stock-search-input");
      const inputConstructor = frame.contentWindow?.HTMLInputElement;
      if (!inputConstructor || !(searchInput instanceof inputConstructor)) {
        return;
      }
      searchInput.value = inventorySearchQuery;
      searchInput.dispatchEvent(new Event("input", { bubbles: true }));
    } catch (error) {
      // The iframe may still be navigating; the search is synced again on load.
    }
  }

  function syncEmployeesSearch(query) {
    employeesSearchQuery = String(query ?? "");
    const frame = elements.employeesFrame;
    if (!(frame instanceof HTMLIFrameElement)) {
      return;
    }

    try {
      const searchInput = frame.contentDocument?.getElementById("employee-workspace-search");
      const inputConstructor = frame.contentWindow?.HTMLInputElement;
      if (!inputConstructor || !(searchInput instanceof inputConstructor)) {
        return;
      }
      searchInput.value = employeesSearchQuery;
      searchInput.dispatchEvent(new Event("input", { bubbles: true }));
    } catch (error) {
      // The iframe may still be navigating; the search is synced again on load.
    }
  }

  function syncPackingSearch(query) {
    packingSearchQuery = String(query ?? "");
    const frame = elements.packingFrame;
    if (!(frame instanceof HTMLIFrameElement)) {
      return;
    }

    try {
      const searchInput = frame.contentDocument?.getElementById("packing-workspace-search");
      const inputConstructor = frame.contentWindow?.HTMLInputElement;
      if (!inputConstructor || !(searchInput instanceof inputConstructor)) {
        return;
      }
      searchInput.value = packingSearchQuery;
      searchInput.dispatchEvent(new Event("input", { bubbles: true }));
    } catch (error) {
      // The iframe may still be navigating; the search is synced again on load.
    }
  }

  function syncPackingStationFilter(filter = packingStationFilter) {
    packingStationFilter = normalizePackingStationFilter(filter);
    const frame = elements.packingFrame;
    if (!(frame instanceof HTMLIFrameElement)) {
      syncMainFilterBreadcrumbs();
      renderNav();
      return;
    }

    try {
      const frameDocument = frame.contentDocument;
      const frameBody = frameDocument?.body;
      if (frameBody) {
        frameBody.classList.remove(
          "main-packing-station--packing",
          "main-packing-station--shipping",
        );
        frameBody.classList.add(
          packingStationFilter === "shipping-station"
            ? "main-packing-station--shipping"
            : "main-packing-station--packing",
        );
      }
      queueMainEmbeddedFrameHeightSync("packing");
    } catch (error) {
      // The iframe may still be navigating; the station is synced again on load.
    }

    syncMainFilterBreadcrumbs();
  }

  function syncInventoryPriorityFilter(filter = inventoryPriorityFilter) {
    inventoryPriorityFilter = normalizeInventoryPriorityFilter(filter);
    const frame = elements.inventoryFrame;
    if (!(frame instanceof HTMLIFrameElement)) {
      return;
    }

    try {
      const frameDocument = frame.contentDocument;
      const filterButton = Array.from(
        frameDocument?.querySelectorAll("[data-stock-priority-filter]") || [],
      ).find((button) =>
        normalizeInventoryPriorityFilter(button?.dataset?.stockPriorityFilter) === inventoryPriorityFilter,
      );
      const buttonConstructor = frame.contentWindow?.HTMLButtonElement;
      if (!buttonConstructor || !(filterButton instanceof buttonConstructor)) {
        return;
      }

      const isActive = filterButton.classList.contains("is-active")
        || filterButton.getAttribute("aria-pressed") === "true";
      if (!isActive) {
        filterButton.click();
      }
    } catch (error) {
      // The iframe may still be navigating; the filter is synced again on load.
    }
  }

  function loadScriptOnce(src, markerAttribute) {
    const existingScript = document.querySelector(`script[${markerAttribute}]`);
    if (existingScript) {
      if (existingScript.dataset.loaded === "true") {
        return Promise.resolve();
      }
      return new Promise((resolve, reject) => {
        existingScript.addEventListener("load", resolve, { once: true });
        existingScript.addEventListener("error", reject, { once: true });
      });
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.setAttribute(markerAttribute, "true");
      script.addEventListener("load", () => {
        script.dataset.loaded = "true";
        resolve();
      }, { once: true });
      script.addEventListener("error", () => reject(new Error("Unable to load the Live Chat controller.")), { once: true });
      document.body.appendChild(script);
    });
  }

  function getMainEmbeddedFrameConfig(view) {
    return mainEmbeddedFrameConfigs[view] || null;
  }

  function getMainEmbeddedFrame(frameConfig) {
    const frame = elements[frameConfig?.frameKey];
    return frame instanceof HTMLIFrameElement ? frame : null;
  }

  function getMainEmbeddedFrameSyncState(view) {
    let state = mainEmbeddedFrameHeightSyncs.get(view);
    if (!state) {
      state = {
        resizeTimer: 0,
        resizeObserver: null,
        mutationObserver: null,
        abortController: null,
        lastHeight: 0,
        edgeScrollInstalled: false,
      };
      mainEmbeddedFrameHeightSyncs.set(view, state);
    }
    return state;
  }

  function disconnectMainEmbeddedFrameHeightSync(view) {
    const state = mainEmbeddedFrameHeightSyncs.get(view);
    if (!state) {
      return;
    }

    window.clearTimeout(state.resizeTimer);
    state.resizeTimer = 0;
    state.resizeObserver?.disconnect();
    state.resizeObserver = null;
    state.mutationObserver?.disconnect();
    state.mutationObserver = null;
    state.abortController?.abort();
    state.abortController = null;
    state.lastHeight = 0;
    state.edgeScrollInstalled = false;
  }

  function resetMainEmbeddedFrameHeight(view) {
    const frameConfig = getMainEmbeddedFrameConfig(view);
    const frame = getMainEmbeddedFrame(frameConfig);
    disconnectMainEmbeddedFrameHeightSync(view);
    if (!frame || !frameConfig) {
      return;
    }

    frame.style.removeProperty(frameConfig.cssVar);
    frame.style.removeProperty("height");
    frame.removeAttribute("scrolling");
  }

  function waitForMainStylesheet(stylesheet) {
    if (String(stylesheet?.tagName || "").toLowerCase() !== "link" || stylesheet.sheet) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      let finished = false;
      const finish = () => {
        if (finished) {
          return;
        }
        finished = true;
        resolve();
      };
      stylesheet.addEventListener("load", finish, { once: true });
      stylesheet.addEventListener("error", finish, { once: true });
      window.setTimeout(finish, 800);
    });
  }

  function ensureAdminFontsStylesheet(frameDocument) {
    const frameWindow = frameDocument.defaultView;
    if (!frameWindow || !frameDocument.head) {
      return Promise.resolve();
    }

    const ensureLink = (href, dataAttr, append = false) => {
      let stylesheet = frameDocument.querySelector(`link[${dataAttr}]`);
      if (stylesheet instanceof frameWindow.HTMLLinkElement) {
        return waitForMainStylesheet(stylesheet);
      }

      stylesheet = frameDocument.createElement("link");
      stylesheet.rel = "stylesheet";
      stylesheet.href = href;
      stylesheet.setAttribute(dataAttr, "true");
      if (append) {
        frameDocument.head.appendChild(stylesheet);
      } else {
        frameDocument.head.insertBefore(stylesheet, frameDocument.head.firstChild);
      }
      return waitForMainStylesheet(stylesheet);
    };

    return ensureLink(adminFontsStylesheetHref, "data-admin-fonts-styles");
  }

  function installMainOwnedStylesheet(frameDocument) {
    const frameWindow = frameDocument.defaultView;
    if (!frameWindow || !frameDocument.head) {
      return Promise.resolve();
    }

    const ownedHref = new URL(mainStylesheetHref, window.location.origin).href;
    Array.from(frameDocument.querySelectorAll('link[rel~="stylesheet"]')).forEach((link) => {
      if (!(link instanceof frameWindow.HTMLLinkElement)) {
        return;
      }
      if (link.dataset.mainOwnedStyles === "true" || link.hasAttribute("data-admin-fonts-styles")) {
        return;
      }
      if (
        frameDocument.body?.classList.contains("listing-insight-embedded")
        || frameDocument.body?.classList.contains("main-orders-embedded")
        || frameDocument.body?.classList.contains("order-insight-page")
      ) {
        link.remove();
      }
    });

    let stylesheet = frameDocument.querySelector("link[data-main-owned-styles]");

    if (!(stylesheet instanceof frameWindow.HTMLLinkElement)) {
      stylesheet = frameDocument.createElement("link");
      stylesheet.rel = "stylesheet";
      stylesheet.dataset.mainOwnedStyles = "true";
      frameDocument.head.appendChild(stylesheet);
    }

    if (stylesheet.href !== ownedHref) {
      stylesheet.href = mainStylesheetHref;
    }

    return Promise.all([
      ensureAdminFontsStylesheet(frameDocument),
      waitForMainStylesheet(stylesheet),
    ]).then(() => undefined);
  }

  function installMainEmbeddedFrameEdgeScrollStyles(frameDocument, frameConfig) {
    if (!frameDocument.defaultView || !frameDocument.documentElement) {
      return Promise.resolve();
    }

    frameDocument.documentElement.classList.add("main-edge-scroll-frame");
    frameDocument.documentElement.dataset.mainEdgeScrollFrame = frameConfig.view;
    frameDocument.body?.classList.add("main-edge-scroll-frame-body");
    return installMainOwnedStylesheet(frameDocument);
  }

  function collectMainEmbeddedFrameHeightCandidates(frameDocument, frameConfig) {
    const frameWindow = frameDocument.defaultView;
    const candidates = new Set();
    const pushElement = (element) => {
      if (
        frameWindow
        && element instanceof frameWindow.HTMLElement
        && element !== frameDocument.documentElement
        && element !== frameDocument.body
      ) {
        candidates.add(element);
      }
    };

    Array.from(frameDocument.body?.children || []).forEach(pushElement);
    (frameConfig.measureSelectors || []).forEach((selector) => {
      frameDocument.querySelectorAll(selector).forEach(pushElement);
    });
    Array.from(candidates).forEach((element) => {
      Array.from(element.children || []).forEach(pushElement);
    });
    return Array.from(candidates);
  }

  function isInsideFixedAncestor(element, frameDocument) {
    let current = element.parentElement;
    while (current && current !== frameDocument.body && current !== frameDocument.documentElement) {
      const style = frameDocument.defaultView.getComputedStyle(current);
      if (style.position === "fixed") {
        return true;
      }
      current = current.parentElement;
    }
    return false;
  }

  function getMainEmbeddedFrameContentHeight(frameDocument, frameConfig) {
    const frameWindow = frameDocument.defaultView;
    if (!frameWindow) {
      return frameConfig.minHeight;
    }

    const candidates = collectMainEmbeddedFrameHeightCandidates(frameDocument, frameConfig);
    const contentHeight = candidates.reduce((height, element) => {
      const style = frameWindow.getComputedStyle(element);
      if (
        style.display === "none"
        || style.visibility === "hidden"
        || style.position === "fixed"
        || isInsideFixedAncestor(element, frameDocument)
      ) {
        return height;
      }

      const rect = element.getBoundingClientRect();
      return Math.max(
        height,
        Math.ceil(rect.bottom + frameWindow.scrollY),
        element.scrollHeight,
        element.offsetHeight,
      );
    }, 0);

    if (contentHeight > 0) {
      return Math.max(frameConfig.minHeight, contentHeight + 2);
    }

    return Math.max(
      frameConfig.minHeight,
      frameDocument.body?.scrollHeight || 0,
      frameDocument.documentElement?.scrollHeight || 0,
    );
  }

  function syncMainEmbeddedFrameHeight(view) {
    const frameConfig = getMainEmbeddedFrameConfig(view);
    const frame = getMainEmbeddedFrame(frameConfig);
    if (!frame || !frameConfig || activeMainView !== frameConfig.view) {
      return;
    }

    try {
      const frameDocument = frame.contentDocument;
      const frameWindow = frame.contentWindow;
      if (!frameDocument || !frameWindow || frameWindow.location.href === "about:blank") {
        return;
      }

      const state = getMainEmbeddedFrameSyncState(view);
      if (!state.edgeScrollInstalled) {
        installMainEmbeddedFrameEdgeScrollStyles(frameDocument, frameConfig);
        state.edgeScrollInstalled = true;
      }
      const nextHeightValue = getMainEmbeddedFrameContentHeight(frameDocument, frameConfig);
      if (Math.abs(nextHeightValue - state.lastHeight) < 4) {
        return;
      }

      state.lastHeight = nextHeightValue;
      const nextHeight = `${nextHeightValue}px`;
      frame.style.setProperty(frameConfig.cssVar, nextHeight);
      frame.style.height = nextHeight;
      frame.setAttribute("scrolling", "no");
    } catch (error) {
      // The iframe can be between navigations during a reload.
    }
  }

  function queueMainEmbeddedFrameHeightSync(view, delay = 0) {
    const frameConfig = getMainEmbeddedFrameConfig(view);
    if (!frameConfig) {
      return;
    }

    const state = getMainEmbeddedFrameSyncState(view);
    window.clearTimeout(state.resizeTimer);
    state.resizeTimer = window.setTimeout(() => {
      state.resizeTimer = 0;
      window.requestAnimationFrame(() => syncMainEmbeddedFrameHeight(view));
    }, delay);
  }

  function queueActiveMainEmbeddedFrameHeightSync(delay = 0) {
    if (getMainEmbeddedFrameConfig(activeMainView)) {
      queueMainEmbeddedFrameHeightSync(activeMainView, delay);
    }
  }

  function installMainEmbeddedFrameHeightSync(view, frameDocument) {
    const frameConfig = getMainEmbeddedFrameConfig(view);
    const frameWindow = frameDocument.defaultView;
    if (!frameConfig || !frameWindow) {
      return;
    }

    disconnectMainEmbeddedFrameHeightSync(view);
    installMainEmbeddedFrameEdgeScrollStyles(frameDocument, frameConfig);

    const state = getMainEmbeddedFrameSyncState(view);
    state.abortController = new AbortController();
    const { signal } = state.abortController;
    const observedElements = [
      frameDocument.body,
      ...collectMainEmbeddedFrameHeightCandidates(frameDocument, frameConfig),
    ].filter((element) => element instanceof frameWindow.HTMLElement);

    if (typeof frameWindow.ResizeObserver === "function") {
      state.resizeObserver = new frameWindow.ResizeObserver(() => {
        queueMainEmbeddedFrameHeightSync(view);
      });
      observedElements.forEach((element) => state.resizeObserver.observe(element));
    }

    if (typeof frameWindow.MutationObserver === "function" && frameDocument.body) {
      state.mutationObserver = new frameWindow.MutationObserver(() => {
        queueMainEmbeddedFrameHeightSync(view, view === "inventory" ? 180 : 40);
      });
      state.mutationObserver.observe(frameDocument.body, {
        attributes: true,
        childList: true,
        subtree: true,
      });
    }

    frameWindow.addEventListener("resize", () => queueMainEmbeddedFrameHeightSync(view), { signal });
    frameDocument.addEventListener("load", () => queueMainEmbeddedFrameHeightSync(view), {
      capture: true,
      signal,
    });
    frameDocument.addEventListener("transitionend", () => queueMainEmbeddedFrameHeightSync(view), {
      capture: true,
      signal,
    });

    if (frameDocument.fonts?.ready) {
      void frameDocument.fonts.ready
        .then(() => queueMainEmbeddedFrameHeightSync(view))
        .catch(() => {});
    }
    queueMainEmbeddedFrameHeightSync(view);
    window.setTimeout(() => queueMainEmbeddedFrameHeightSync(view), 180);
    window.setTimeout(() => queueMainEmbeddedFrameHeightSync(view), 700);
  }

  const LIVE_CHAT_ACTIVE_CONVERSATION_STORAGE_KEY = (() => {
    const session = authState?.session || {};
    const adminScope = String(
      session.adminId || session.ownerAdminId || session.tenantId || session.companyId || "",
    ).trim();
    const accountScope = String(
      session.id || session.accountId || session.employeeId || session.email || authState?.role || "account",
    ).trim();
    return `gms-live-chat-active-conversation:${adminScope || "workspace"}:${accountScope || "account"}`;
  })();
  const LIVE_CHAT_THREAD_LIST_POSITION_STORAGE_KEY = `${LIVE_CHAT_ACTIVE_CONVERSATION_STORAGE_KEY}:thread-list-position`;

  function liveChatReadStoredActiveId() {
    try {
      return String(window.localStorage?.getItem(LIVE_CHAT_ACTIVE_CONVERSATION_STORAGE_KEY) || "").trim();
    } catch (_) {
      return "";
    }
  }

  function liveChatWriteStoredActiveId(value) {
    const activeId = String(value || "").trim();
    try {
      if (activeId) {
        window.localStorage?.setItem(LIVE_CHAT_ACTIVE_CONVERSATION_STORAGE_KEY, activeId);
      } else {
        window.localStorage?.removeItem(LIVE_CHAT_ACTIVE_CONVERSATION_STORAGE_KEY);
      }
    } catch (_) {}
    return activeId;
  }

  function liveChatReadStoredThreadListPosition() {
    try {
      const stored = JSON.parse(
        window.localStorage?.getItem(LIVE_CHAT_THREAD_LIST_POSITION_STORAGE_KEY) || "null",
      );
      if (!stored || typeof stored !== "object") {
        return null;
      }
      const scrollTop = Number(stored.scrollTop);
      const anchorOffset = Number(stored.anchorOffset);
      const activeOffset = Number(stored.activeOffset);
      return {
        scrollTop: Number.isFinite(scrollTop) ? Math.max(0, scrollTop) : 0,
        anchorThreadId: String(stored.anchorThreadId || "").trim(),
        anchorOffset: Number.isFinite(anchorOffset) ? anchorOffset : 0,
        activeThreadId: String(stored.activeThreadId || "").trim(),
        activeOffset: Number.isFinite(activeOffset) ? activeOffset : 0,
      };
    } catch (_) {
      return null;
    }
  }

  function liveChatWriteStoredThreadListPosition(position) {
    if (!position || typeof position !== "object") {
      return;
    }
    const scrollTop = Number(position.scrollTop);
    const anchorOffset = Number(position.anchorOffset);
    const activeOffset = Number(position.activeOffset);
    try {
      window.localStorage?.setItem(LIVE_CHAT_THREAD_LIST_POSITION_STORAGE_KEY, JSON.stringify({
        scrollTop: Number.isFinite(scrollTop) ? Math.max(0, scrollTop) : 0,
        anchorThreadId: String(position.anchorThreadId || "").trim(),
        anchorOffset: Number.isFinite(anchorOffset) ? anchorOffset : 0,
        activeThreadId: String(position.activeThreadId || liveChatRedesignState?.activeId || "").trim(),
        activeOffset: Number.isFinite(activeOffset) ? activeOffset : 0,
      }));
    } catch (_) {}
  }

  const liveChatRedesignState = {
    activeId: liveChatReadStoredActiveId() || "gluta-white",
    filter: "all",
    search: "",
    mediaExpanded: false,
    detailsOpen: true,
    detailsPane: "",
    isLoading: false,
    isSending: false,
    isEditing: false,
    isAiReplying: false,
    aiAssistant: {
      loaded: false,
      available: false,
      manualReplyEnabled: false,
      autoReplyEnabled: false,
      provider: "",
      providerLabel: "",
      model: "",
      source: "super-admin",
      chatbot: null,
      autoReply: null,
    },
    forceMessageScrollBottom: true,
    messageScrollPinned: true,
    pendingReply: null,
    replyStateEnter: false,
    pendingEdit: null,
    editStateEnter: false,
    prefs: {},
    assignPickerOpen: false,
    assignPickerQuery: "",
    participantQuery: "",
    chatFindOpen: false,
    chatFindQuery: "",
    chatFindMatchIndex: 0,
    emojiPickerOpen: false,
    reactionPicker: null,
    pinnedProductExpandedByThread: {},
    pendingAttachments: [],
    expandedPhotoGrids: new Set(),
    messageLazyByThread: {},
    messageAnimationEnterIds: new Set(),
    messageAnimationSeenByThread: {},
  };

  function liveChatSetActiveId(value, options = {}) {
    const activeId = String(value || "").trim();
    liveChatRedesignState.activeId = activeId;
    if (options.persist !== false) {
      liveChatWriteStoredActiveId(activeId);
    }
    return activeId;
  }
  const LIVE_CHAT_MAX_PENDING_ATTACHMENTS = 10;
  let liveChatChatFindTimer = 0;
  let liveChatChatFindTargetTimer = 0;
  let liveChatThreadListPositionPersistFrame = 0;
  let liveChatSupportTypingClearTimeoutId = 0;
  let liveChatSupportTypingLastSentAt = 0;
  let liveChatSupportTypingThreadId = "";
  let liveChatTypingPollTimer = 0;
  let liveChatTypingPollInFlight = false;
  const LIVE_CHAT_TYPING_ACTIVE_WINDOW_MS = 5000;
  const LIVE_CHAT_TYPING_IDLE_MS = 2500;
  const LIVE_CHAT_TYPING_REFRESH_MS = 1200;
  const LIVE_CHAT_TYPING_POLL_MS = 1800;
  const LIVE_CHAT_LIVE_SYNC_POLL_MS = 500;
  const LIVE_CHAT_SCROLL_BOTTOM_THRESHOLD = 72;
  const LIVE_CHAT_LAZY_BUDGET_BYTES = 100 * 1024 * 1024;
  const LIVE_CHAT_LAZY_SCROLL_TOP_THRESHOLD = 160;
  const LIVE_CHAT_LAZY_MIN_MESSAGES = 24;
  const LIVE_CHAT_LAZY_LOAD_BATCH = 30;
  const LIVE_CHAT_LAZY_MEDIA_ESTIMATE_BYTES = {
    image: 280 * 1024,
    video: 5 * 1024 * 1024,
    audio: 450 * 1024,
  };
  let liveChatMessageAreaLastScrollTop = 0;
  const LIVE_CHAT_LAZY_SCROLL_DIRECTION_THRESHOLD = 4;
  let liveChatReplyJumpToken = 0;
  let liveChatReplyJumpAnimationFrame = 0;
  let liveChatReplyJumpClearTimer = 0;
  const LIVE_CHAT_LOTTIE_PLAYER_URL = "/vendor/lottie.min.js";
  let liveChatLottieLoadPromise = null;
  const liveChatEmojiLottieInstances = new Map();
  const liveChatAudioSession = {
    mode: "idle",
    mediaRecorder: null,
    stream: null,
    chunks: [],
    blob: null,
    objectUrl: "",
    mimeType: "",
    durationMs: 0,
    startedAt: 0,
    timerId: 0,
    previewAudio: null,
    isPlaying: false,
    audioContext: null,
    analyser: null,
    levelAnimationId: 0,
  };
  const liveChatCameraSession = {
    stream: null,
    isOpen: false,
  };
  // Keep in sync with Flutter `_chooserEmojiOptions` in lib/chat_support.dart
  const LIVE_CHAT_CHOOSER_EMOJI_OPTIONS = [
    { emoji: "\u2764\uFE0F", assetPath: "assets/animations/reaction_heart.json", previewProgress: 0.3 },
    { emoji: "\u{1F602}", assetPath: "assets/animations/reaction_laugh.json" },
    { emoji: "\u{1F62E}", assetPath: "assets/animations/reaction_wow.json" },
    { emoji: "\u{1F622}", assetPath: "assets/animations/reaction_cry.json", previewProgress: 0.5 },
    { emoji: "\u{1F621}", assetPath: "assets/animations/reaction_rage.json", previewProgress: 0.7 },
    { emoji: "\u{1F494}", assetPath: "assets/animations/lottie_broken_heart.json", previewProgress: 0.2 },
    { emoji: "\u2B50", assetPath: "assets/animations/lottie_star.json" },
    { emoji: "\u{1F525}", assetPath: "assets/animations/lottie_fire.json" },
    { emoji: "\u{1F4AF}", assetPath: "assets/animations/lottie_100.json" },
    { emoji: "\u{1F44F}", assetPath: "assets/animations/lottie_clap.json" },
    { emoji: "\u{1F91D}", assetPath: "assets/animations/lottie_shakehands.json" },
    { emoji: "\u{1F64F}", assetPath: "assets/animations/lottie_folded-hands.json" },
    { emoji: "\u{1F631}", assetPath: "assets/animations/lottie_screaming.json", previewProgress: 0.4 },
    { emoji: "\u{1F60E}", assetPath: "assets/animations/lottie_sunglasses_face.json" },
    { emoji: "\u{1F607}", assetPath: "assets/animations/lottie_halo.json", previewProgress: 0.4 },
    { emoji: "\u{1F620}", assetPath: "assets/animations/lottie_angry.json" },
    { emoji: "\u{1F92D}", assetPath: "assets/animations/lottie_smiling_with_hand.json" },
    { emoji: "\u{1F97A}", assetPath: "assets/animations/lottie_pleading.json" },
    { emoji: "\u{1F60F}", assetPath: "assets/animations/lottie_smirk.json" },
    { emoji: "\u{1F929}", assetPath: "assets/animations/lottie_star_struck.json" },
    { emoji: "\u263A\uFE0F", assetPath: "assets/animations/lottie_warm_smile.json", previewProgress: 0.4 },
    { emoji: "\u{1F60A}", assetPath: "assets/animations/lottie_blush.json", previewProgress: 0.4 },
    { emoji: "\u{1F979}", assetPath: "assets/animations/lottie_holding_back_tears.json", previewProgress: 0.4 },
    { emoji: "\u{1F60D}", assetPath: "assets/animations/lottie_heart_eye.json" },
    { emoji: "\u{1F970}", assetPath: "assets/animations/lottie_heart_face.json" },
    { emoji: "\u{1F609}", assetPath: "assets/animations/lottie_wink.json", previewProgress: 0.4 },
    { emoji: "\u{1F62D}", assetPath: "assets/animations/lottie_crying.json", previewProgress: 0.4 },
    { emoji: "\u{1F605}", assetPath: "assets/animations/lottie_grin_sweat.json", previewProgress: 0.4 },
    { emoji: "\u{1F606}", assetPath: "assets/animations/lottie_laughing.json" },
    { emoji: "\u{1F642}", assetPath: "assets/animations/lottie_smile.json", previewProgress: 0.4 },
  ];
  // Keep in sync with Flutter `_reactionPickerOptions` in lib/chat_support.dart
  const LIVE_CHAT_REACTION_EMOJI_OPTIONS = [
    { emoji: "\u2764\uFE0F", assetPath: "assets/animations/reaction_heart.json" },
    { emoji: "\u{1F602}", assetPath: "assets/animations/reaction_laugh.json" },
    { emoji: "\u{1F62E}", assetPath: "assets/animations/reaction_wow.json" },
    { emoji: "\u{1F622}", assetPath: "assets/animations/reaction_cry.json" },
    { emoji: "\u{1F621}", assetPath: "assets/animations/reaction_rage.json" },
  ];
  const LIVE_CHAT_PREFS_STORAGE_KEY = "gms-live-chat-prefs";
  let liveChatPrefsHydrated = false;
  let liveChatDetailsPaneTimer = 0;
  let liveChatEmployeeDirectory = [];
  let liveChatEmployeeDirectoryLoaded = false;
  let liveChatMediaSkeletonObserver = null;
  const liveChatMediaSkeletonRoots = new WeakSet();
  const liveChatMediaSkeletonHostByElement = new WeakMap();

  const liveChatRedesignSeed = [
    {
      id: "gluta-white",
      name: "Gluta White Distributor",
      initials: "GW",
      avatar: "",
      online: true,
      starred: true,
      unread: 2,
      time: "2m ago",
      preview: "Thank you! We'll review it...",
      about: "Wholesale distributor of Glutathione, beauty and wellness products.",
      email: "orders@glutawhite.ph",
      phone: "+63 917 845 2210",
      address: "Quezon City, Metro Manila",
      customerSince: "Feb 2024",
      totalOrders: 12,
      totalSpent: 28450,
      category: "Shipping Inquiry",
      tags: ["VIP", "COD", "Wholesale"],
      order: {
        id: "SW12345",
        productName: "Gluta White Premium Bundle",
        productImage: "",
        sku: "GWP-BDL",
        color: "Assorted",
        quantity: 12,
        unitPrice: 2999,
        total: 2999,
        paymentMethod: "Cash on Delivery",
        paymentStatus: "Paid",
        shippingStatus: "In Transit",
        courier: "Lalamove",
        trackingNumber: "GMS987654321",
        placedAt: "May 12, 2026",
        expectedDelivery: "May 17, 2026",
        stock: 42,
      },
      orders: [
        {
          id: "SW12345",
          productName: "Gluta White Premium Bundle",
          productImage: "assets/product-list-features.jpg",
          quantity: 12,
          total: 2999,
          paymentStatus: "Paid",
          shippingStatus: "In Transit",
          placedAt: "May 12, 2026",
        },
        {
          id: "SW11802",
          productName: "L-Carnitine Starter Pack",
          productImage: "assets/business-types/drinks.png",
          quantity: 6,
          total: 1480,
          paymentStatus: "Paid",
          shippingStatus: "Delivered",
          placedAt: "Apr 3, 2026",
        },
        {
          id: "SW10944",
          productName: "Wholesale Beauty Crate",
          productImage: "assets/business-types/produce.jpg",
          quantity: 20,
          total: 5420,
          paymentStatus: "Paid",
          shippingStatus: "Delivered",
          placedAt: "Feb 18, 2026",
        },
      ],
      media: [
        { src: "assets/product-list-features.jpg", alt: "Gluta White premium product campaign" },
        { src: "assets/business-types/produce.jpg", alt: "Gluta White brightening collection" },
        { src: "assets/business-types/drinks.png", alt: "Gluta White product bundle" },
      ],
      files: [
        { name: "Price List 2026.pdf", type: "PDF", size: "2.4 MB", time: "10:32 AM" },
        { name: "Terms & Conditions.docx", type: "DOCX", size: "1.8 MB", time: "10:34 AM" },
        { name: "Google Drive Contract Folder", type: "Drive", size: "Shared link", time: "10:36 AM", url: "https://drive.google.com/" },
      ],
      messages: [
        { side: "customer", text: "Hello! I would like to inquire about your Glutathione products.", time: "10:30 AM" },
        { side: "support", text: "Hi! Thank you for reaching out. How can we help you today? 😊", time: "10:32 AM", seen: true },
        { side: "customer", text: "Do you have stocks available for wholesale?", time: "10:33 AM" },
        { side: "support", text: "Yes, we do! Which product are you interested in?", time: "10:34 AM", seen: true },
        { side: "customer", text: "I'm interested in Gluta White Premium and L-Carnitine.", time: "10:35 AM" },
        { side: "support", text: "Great choices! I'll send you the price list and more details: https://swiftcart.ph/gluta-white", time: "10:36 AM", seen: true },
        { side: "customer", text: "Thank you! I'll wait for it.", time: "10:37 AM" },
      ],
    },
    {
      id: "rb-milk-tea",
      name: "R&B Milk Tea",
      initials: "R&B",
      online: true,
      starred: false,
      unread: 1,
      time: "15m ago",
      preview: "Can we schedule a meeting...",
      about: "Local milk tea shop looking for employee wellness packages.",
      media: [{ src: "assets/business-types/meals.webp", alt: "Wellness collection" }],
      files: [{ name: "Corporate Package.pdf", type: "PDF", size: "1.2 MB", time: "9:48 AM" }],
      messages: [
        { side: "customer", text: "Hi, can we schedule a meeting about a bulk wellness package?", time: "9:42 AM" },
        { side: "support", text: "Certainly. Please share your preferred date and number of participants.", time: "9:45 AM", seen: true },
      ],
    },
    {
      id: "juan-dela-cruz",
      name: "Juan Dela Cruz",
      initials: "JD",
      online: true,
      starred: false,
      unread: 0,
      time: "1h ago",
      preview: "Yes, the product is available.",
      about: "Retail customer asking about product availability and delivery.",
      media: [],
      files: [],
      messages: [
        { side: "customer", text: "Is the L-Carnitine bundle still available?", time: "8:16 AM" },
        { side: "support", text: "Yes, the product is available. We can arrange delivery today.", time: "8:20 AM", seen: true },
      ],
    },
    {
      id: "sari-sari-store",
      name: "Sari Sari Store PH",
      initials: "SS",
      online: true,
      starred: true,
      unread: 3,
      time: "2h ago",
      preview: "See you tomorrow!",
      about: "Community reseller interested in starter inventory packages.",
      media: [{ src: "assets/business-types/drinks.png", alt: "Starter bundle" }],
      files: [{ name: "Reseller Starter Guide.pdf", type: "PDF", size: "980 KB", time: "Yesterday" }],
      messages: [
        { side: "support", text: "Your reseller orientation is confirmed for tomorrow at 2:00 PM.", time: "Yesterday", seen: true },
        { side: "customer", text: "Perfect, see you tomorrow!", time: "Yesterday" },
      ],
    },
    {
      id: "maria-santos",
      name: "Maria Santos",
      initials: "MS",
      online: true,
      starred: false,
      unread: 0,
      time: "3h ago",
      preview: "I have a question about...",
      about: "Returning customer with a product usage question.",
      media: [],
      files: [],
      messages: [
        { side: "customer", text: "I have a question about the recommended daily use.", time: "7:10 AM" },
        { side: "support", text: "We can help with the product directions printed on the label.", time: "7:14 AM", seen: true },
      ],
    },
    {
      id: "tech-solutions",
      name: "Tech Solutions",
      initials: "TS",
      online: true,
      starred: false,
      unread: 0,
      time: "5h ago",
      preview: "We've sent the documents.",
      about: "Corporate account requesting documents for supplier accreditation.",
      media: [],
      files: [
        { name: "Company Profile.pdf", type: "PDF", size: "4.2 MB", time: "6:12 AM" },
        { name: "Business Permit.pdf", type: "PDF", size: "1.5 MB", time: "6:14 AM" },
      ],
      messages: [
        { side: "support", text: "We've sent the documents required for accreditation.", time: "6:15 AM", seen: true },
      ],
    },
    {
      id: "abc-trading",
      name: "ABC Trading",
      initials: "AT",
      online: true,
      starred: false,
      unread: 0,
      time: "1d ago",
      preview: "Thanks for your response.",
      about: "Wholesale buyer comparing available product bundles.",
      media: [{ src: "assets/product-list-features.jpg", alt: "Premium wholesale bundle" }],
      files: [],
      messages: [
        { side: "customer", text: "Thanks for your response. We'll review the quotation.", time: "Yesterday" },
      ],
    },
  ];

  let liveChatRedesignConversations = [];
  let liveChatOrders = [];

  function liveChatApiHeaders(headers = {}) {
    const adminId = getSessionAdminId(authState?.session || {});
    const sessionToken = normalizeText(authState?.session?.sessionToken);
    const employeeId = authState?.role === "employee"
      ? firstText([
          authState.session?.employeeId,
          authState.session?.accountCode,
          authState.session?.id,
          authState.session?.email,
        ])
      : "";
    return {
      ...headers,
      ...(adminId ? { "X-GMS-Admin-ID": adminId } : {}),
      ...(employeeId ? { "X-GMS-Employee-ID": employeeId } : {}),
      ...(sessionToken ? { "X-GMS-Admin-Session": sessionToken } : {}),
    };
  }

  function liveChatNormalizeAiCapabilityStatus(input, capability) {
    const status = input && typeof input === "object" ? input : {};
    return {
      capability,
      available: status.available === true,
      configured: status.configured === true,
      launched: status.launched === true,
      enabled: status.enabled === true,
      provider: normalizeText(status.provider),
      providerLabel: normalizeText(status.providerLabel),
      model: normalizeText(status.model),
      source: normalizeText(status.source) || "super-admin",
      message: normalizeText(status.message),
    };
  }

  function liveChatApplyAiAssistantStatus(input) {
    const status = input && typeof input === "object" ? input : {};
    const chatbot = liveChatNormalizeAiCapabilityStatus(status.chatbot, "chatbot");
    const autoReply = liveChatNormalizeAiCapabilityStatus(status.autoReply, "autoReply");
    liveChatRedesignState.aiAssistant = {
      loaded: true,
      available: status.available === true || chatbot.available || autoReply.available,
      manualReplyEnabled: status.manualReplyEnabled === true || chatbot.available,
      autoReplyEnabled: status.autoReplyEnabled === true || autoReply.available,
      provider: normalizeText(status.provider || autoReply.provider || chatbot.provider),
      providerLabel: normalizeText(
        status.providerLabel || autoReply.providerLabel || chatbot.providerLabel,
      ),
      model: normalizeText(status.model || autoReply.model || chatbot.model),
      source: normalizeText(status.source || autoReply.source || chatbot.source) || "super-admin",
      chatbot,
      autoReply,
    };
  }

  function liveChatAiAssistantStatusSignature() {
    const status = liveChatRedesignState.aiAssistant || {};
    return [
      status.loaded ? "1" : "0",
      status.available ? "1" : "0",
      status.manualReplyEnabled ? "1" : "0",
      status.autoReplyEnabled ? "1" : "0",
      normalizeText(status.provider),
      normalizeText(status.providerLabel),
      normalizeText(status.model),
      normalizeText(status.chatbot?.message),
      normalizeText(status.autoReply?.message),
    ].join("|");
  }

  function liveChatCanManageParticipants() {
    return authState?.role === "seller";
  }

  function liveChatCurrentActor() {
    const session = authState?.session || {};
    const identity = getIdentity();
    const isAdmin = authState?.role === "seller";
    const employeeFullName = [session?.firstName, session?.lastName]
      .map(normalizeText)
      .filter(Boolean)
      .join(" ");

    return {
      senderRole: isAdmin ? "admin" : "employee",
      senderId: isAdmin
        ? firstText([
            session?.id,
            session?.accountCode,
            session?.email,
            getSessionAdminId(session),
          ])
        : firstText([
            session?.employeeId,
            session?.accountCode,
            session?.id,
            session?.email,
          ]),
      senderName: isAdmin
        ? firstText([
            session?.displayName,
            session?.name,
            session?.adminName,
            session?.email,
            identity?.name,
          ], "Admin")
        : firstText([
            employeeFullName,
            session?.displayName,
            session?.name,
            session?.employeeName,
            session?.email,
            identity?.name,
          ], "Employee"),
      senderAvatarUrl: firstUrl([
        session?.profileImageUrl,
        session?.avatarUrl,
        session?.photoUrl,
        session?.profilePhotoUrl,
        session?.employeePhotoUrl,
        identity?.logoUrl,
      ]),
    };
  }

  function liveChatNormalizeSupportRole(value) {
    const role = normalizeText(value).toLowerCase();
    if (["admin", "administrator", "seller", "owner"].includes(role)) {
      return "admin";
    }
    if (["employee", "staff", "agent"].includes(role)) {
      return "employee";
    }
    return role;
  }

  function liveChatNormalizeAgentHandoff(value) {
    const raw = value && typeof value === "object" ? value : {};
    const rawStatus = normalizeText(raw.status || raw.state || raw.supportMode).toLowerCase();
    const status = ["pending", "requested", "waiting"].includes(rawStatus)
      ? "pending"
      : ["accepted", "human", "active"].includes(rawStatus)
        ? "accepted"
        : "ai";
    const rawAgent = raw.activeAgent && typeof raw.activeAgent === "object"
      ? raw.activeAgent
      : {};
    const activeAgent = status === "accepted"
      ? {
          senderRole: liveChatNormalizeSupportRole(rawAgent.senderRole || rawAgent.role),
          senderId: normalizeText(rawAgent.senderId || rawAgent.id || rawAgent.accountId),
          senderName: normalizeText(rawAgent.senderName || rawAgent.name) || "Support agent",
          senderAvatarUrl: liveChatNormalizeAssetUrl(
            rawAgent.senderAvatarUrl || rawAgent.avatarUrl || rawAgent.profileImageUrl,
          ),
        }
      : null;
    return {
      status: status === "accepted" && !activeAgent?.senderId ? "ai" : status,
      supportMode: status === "accepted" && activeAgent?.senderId ? "human" : "ai",
      requestedAt: normalizeText(raw.requestedAt),
      acceptedAt: normalizeText(raw.acceptedAt),
      lastActivityAt: normalizeText(raw.lastActivityAt),
      expiresAt: normalizeText(raw.expiresAt),
      returnedToAiAt: normalizeText(raw.returnedToAiAt),
      activeAgent,
    };
  }

  function liveChatCurrentActorMatchesHandoff(active) {
    const handoff = liveChatNormalizeAgentHandoff(active?.agentHandoff);
    const agent = handoff.activeAgent;
    if (handoff.status !== "accepted" || !agent) {
      return false;
    }
    const expectedRole = authState?.role === "seller" ? "admin" : "employee";
    if (liveChatNormalizeSupportRole(agent.senderRole) !== expectedRole) {
      return false;
    }
    const session = authState?.session || {};
    const actorKeys = new Set([
      session?.id,
      session?.adminId,
      session?.employeeId,
      session?.accountCode,
      session?.email,
      getSessionAdminId(session),
    ].map((item) => normalizeText(item).toLowerCase()).filter(Boolean));
    return actorKeys.has(normalizeText(agent.senderId).toLowerCase());
  }

  function liveChatCanCurrentActorReply(active) {
    return liveChatCurrentActorMatchesHandoff(active);
  }

  function liveChatIsCurrentEmployeeAssigned(active) {
    if (authState?.role !== "employee" || !active) {
      return false;
    }
    const actor = liveChatCurrentActor();
    const actorKeys = new Set([
      actor.senderId,
      authState?.session?.employeeId,
      authState?.session?.accountCode,
      authState?.session?.id,
      authState?.session?.email,
    ].map((value) => normalizeText(value).toLowerCase()).filter(Boolean));
    return liveChatNormalizeAssignedEmployees(active?.assignedEmployees).some((person) => (
      [person.id, person.employeeId, person.accountCode, person.email]
        .some((value) => actorKeys.has(normalizeText(value).toLowerCase()))
    ));
  }

  function liveChatCanAcceptAgentHandoff(active) {
    const handoff = liveChatNormalizeAgentHandoff(active?.agentHandoff);
    if (authState?.role === "seller") {
      return handoff.status === "pending";
    }
    if (authState?.role === "employee" && liveChatIsCurrentEmployeeAssigned(active)) {
      return handoff.status === "pending" || handoff.status === "ai";
    }
    return false;
  }

  function liveChatNormalizeAssignedEmployees(value) {
    return (Array.isArray(value) ? value : [])
      .map((person) => {
        const name = normalizeText(
          person?.name
          || [person?.firstName, person?.lastName].filter(Boolean).join(" ")
          || person?.email,
        ) || "Employee";
        return {
          id: normalizeText(person?.id || person?.employeeId || person?.accountCode || person?.email),
          employeeId: normalizeText(person?.employeeId),
          accountCode: normalizeText(person?.accountCode),
          name,
          firstName: normalizeText(person?.firstName),
          lastName: normalizeText(person?.lastName),
          email: normalizeText(person?.email),
          avatarUrl: liveChatNormalizeAssetUrl(person?.avatarUrl || person?.profileImageUrl || person?.photoUrl),
          position: normalizeText(person?.position || person?.employeeRole || "Employee"),
          assignedAt: normalizeText(person?.assignedAt),
        };
      })
      .filter((person) => person.id);
  }

  function liveChatAssignedPeopleFor(active) {
    return liveChatNormalizeAssignedEmployees(active?.assignedEmployees).map((person) => ({
      id: person.id,
      name: person.name,
      searchName: person.name,
      initials: getInitials(person.name, "EM"),
      avatar: liveChatNormalizeAssetUrl(person.avatarUrl),
      email: person.email,
      position: person.position,
      role: "employee",
      subtitle: person.position || "Assigned employee",
    }));
  }

  function liveChatChatAdminPerson() {
    const store = liveChatStoreBrand();
    const actor = liveChatCurrentActor();
    if (authState?.role === "seller") {
      return {
        id: actor.senderId || "admin",
        name: store.name,
        searchName: actor.senderName || store.name,
        initials: store.initials,
        avatar: store.avatar,
        subtitle: "You",
        role: "admin",
        isYou: true,
      };
    }
    return {
      id: "store",
      name: store.name,
      searchName: store.name,
      initials: store.initials,
      avatar: store.avatar,
      subtitle: "Store admin",
      role: "admin",
      isYou: false,
    };
  }

  function liveChatEmployeeSearchText(person) {
    return normalizeText(`${person?.searchName || ""} ${person?.name || ""} ${person?.email || ""} ${person?.position || ""} ${person?.employeeId || ""}`).toLowerCase();
  }

  function liveChatIsEmployeeAssigned(active, employee) {
    const keys = new Set(
      [employee?.id, employee?.employeeId, employee?.accountCode, employee?.email]
        .map((value) => normalizeText(value).toLowerCase())
        .filter(Boolean),
    );
    return liveChatNormalizeAssignedEmployees(active?.assignedEmployees).some((person) => (
      keys.has(normalizeText(person.id).toLowerCase())
      || keys.has(normalizeText(person.employeeId).toLowerCase())
      || keys.has(normalizeText(person.accountCode).toLowerCase())
      || keys.has(normalizeText(person.email).toLowerCase())
    ));
  }

  function liveChatParticipantRowMarkup(person, options = {}) {
    const canRemove = options.canRemove === true;
    const displayName = person.name || liveChatStoreName();
    return `
      <div class="lcx-participant-row" data-lcx-participant-row="${liveChatEscape(liveChatEmployeeSearchText(person))}">
        ${liveChatAvatar(person, "lcx-avatar--member", { storeLogo: liveChatIsSellerStorePerson(person) })}
        <span class="lcx-participant-row__copy">
          <strong>${liveChatEscape(displayName)}</strong>
          <small>${liveChatEscape(person.subtitle || person.position || "")}</small>
        </span>
        ${canRemove ? `<button type="button" class="lcx-participant-row__remove" data-lcx-action="remove-participant" data-lcx-employee-id="${liveChatEscape(person.id)}" aria-label="Remove ${liveChatEscape(displayName)}">${liveChatIcon("close", 16)}</button>` : ""}
      </div>`;
  }

  async function liveChatEnsureEmployeeDirectory() {
    if (liveChatEmployeeDirectoryLoaded) {
      return liveChatEmployeeDirectory;
    }
    try {
      const response = await fetch("/api/accounts", {
        cache: "no-store",
        headers: liveChatApiHeaders({ Accept: "application/json" }),
      });
      const data = await response.json().catch(() => ({}));
      liveChatEmployeeDirectory = (Array.isArray(data.accounts) ? data.accounts : [])
        .filter((account) => String(account?.source || "").toLowerCase() === "web")
        .map((account) => {
          const name = firstText([
            [account.firstName, account.lastName].filter(Boolean).join(" "),
            account.email,
          ], "Employee");
          return {
            id: firstText([account.id, account.employeeId, account.accountCode, account.email]),
            employeeId: normalizeText(account.employeeId),
            accountCode: normalizeText(account.accountCode),
            name,
            initials: getInitials(name, "EM"),
            email: normalizeText(account.email),
            avatar: liveChatNormalizeAssetUrl(account.profileImageUrl || account.avatarUrl || account.photoUrl),
            position: normalizeText(account.position || account.employeeRole || "Employee"),
          };
        })
        .filter((person) => person.id);
    } catch (error) {
      liveChatEmployeeDirectory = [];
    }
    liveChatEmployeeDirectoryLoaded = true;
    return liveChatEmployeeDirectory;
  }

  async function liveChatOpenAssignPicker() {
    if (!liveChatCanManageParticipants() || !liveChatGetActive()) {
      return;
    }
    liveChatRedesignState.detailsOpen = true;
    liveChatRedesignState.detailsPane = "participants";
    liveChatRedesignState.assignPickerOpen = true;
    liveChatRenderBoard();
    await liveChatEnsureEmployeeDirectory();
    if (liveChatRedesignState.assignPickerOpen) {
      liveChatRenderBoard();
      const search = elements.liveChatMount?.querySelector("[data-lcx-assign-search]");
      if (search instanceof HTMLInputElement) {
        search.focus();
      }
    }
  }

  async function liveChatAssignEmployee(employeeId, remove = false) {
    const active = liveChatGetActive();
    const threadId = normalizeText(active?.sourceThreadId);
    if (!threadId || !employeeId) {
      return;
    }
    try {
      const response = await fetch(`/api/chat-support/${encodeURIComponent(threadId)}/assign`, {
        method: "POST",
        headers: liveChatApiHeaders({
          Accept: "application/json",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({ employeeId, remove }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message || "Unable to update chat assignment.");
      }
      liveChatRedesignState.assignPickerOpen = false;
      liveChatRedesignState.assignPickerQuery = "";
      await liveChatLoadRemoteData();
      liveChatRenderBoard();
      liveChatShowToast(
        remove
          ? "Employee removed from this chat."
          : "Employee assigned. They can now open this chat only.",
      );
    } catch (error) {
      liveChatShowToast(error?.message || "Unable to update chat assignment.");
    }
  }

  function liveChatAssignPickerMarkup(active) {
    if (!liveChatRedesignState.assignPickerOpen) {
      return "";
    }
    const query = normalizeText(liveChatRedesignState.assignPickerQuery).toLowerCase();
    const candidates = liveChatEmployeeDirectory.filter((person) => (
      !liveChatIsEmployeeAssigned(active, person)
      && (!query || liveChatEmployeeSearchText(person).includes(query))
    ));
    const emptyCopy = !liveChatEmployeeDirectoryLoaded
      ? "Loading employees..."
      : !liveChatEmployeeDirectory.length
        ? "No existing employees to assign."
        : "All existing employees are already in this chat.";
    return `
      <div class="lcx-assign-picker" role="dialog" aria-label="Assign employee">
        <header class="lcx-assign-picker__head">
          <button type="button" class="lcx-subhead__back" data-lcx-action="close-assign-picker" aria-label="Close assign picker">${liveChatIcon("back", 20)}</button>
          <h2>Assign employee</h2>
        </header>
        <label class="lcx-assign-picker__search">
          ${liveChatIcon("search", 15)}
          <input type="search" value="${liveChatEscape(liveChatRedesignState.assignPickerQuery)}" placeholder="Search existing employees" data-lcx-assign-search aria-label="Search existing employees" />
        </label>
        <div class="lcx-assign-picker__list">
          ${candidates.length ? candidates.map((person) => `
            <button type="button" class="lcx-assign-candidate" data-lcx-action="pick-employee" data-lcx-employee-id="${liveChatEscape(person.id)}" data-lcx-assign-candidate="${liveChatEscape(liveChatEmployeeSearchText(person))}">
              ${liveChatAvatar(person, "lcx-avatar--member", { storeLogo: liveChatIsSellerStorePerson(person) })}
              <span class="lcx-assign-candidate__copy">
                <strong>${liveChatEscape(person.name)}</strong>
                <small>${liveChatEscape(person.position || person.email || "Employee")}</small>
              </span>
            </button>`).join("") : `<div class="lcx-participant-empty">${liveChatEscape(emptyCopy)}</div>`}
        </div>
      </div>`;
  }

  function liveChatCanEditMessage(message) {
    const actor = liveChatCurrentActor();
    const actorId = normalizeText(actor.senderId).toLowerCase();
    const senderId = normalizeText(message?.senderId).toLowerCase();
    return Boolean(
      authState?.role === "seller"
        && message?.side === "support"
        && normalizeText(message?.text)
        && normalizeText(message?.source).toLowerCase() !== "ai"
        && !normalizeText(message?.deletedAt)
        && liveChatNormalizeSupportRole(message?.senderRole) === "admin"
        && actorId
        && senderId
        && actorId === senderId,
    );
  }

  function liveChatDateValue(value, fallback = "") {
    if (!value) {
      return fallback;
    }
    const date = new Date(value || 0);
    if (Number.isNaN(date.getTime())) {
      return fallback;
    }
    try {
      return new Intl.DateTimeFormat("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(date);
    } catch (_) {
      return fallback;
    }
  }

  function liveChatTimeValue(value, fallback = "") {
    if (!value) {
      return fallback;
    }
    const date = new Date(value || 0);
    if (Number.isNaN(date.getTime())) {
      return fallback;
    }
    try {
      return new Intl.DateTimeFormat("en-PH", {
        hour: "numeric",
        minute: "2-digit",
      }).format(date);
    } catch (_) {
      return fallback;
    }
  }

  function liveChatRelativeValue(value) {
    const date = new Date(value || 0);
    if (Number.isNaN(date.getTime())) {
      return "";
    }
    const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return days < 7 ? `${days}d ago` : liveChatDateValue(date, "Recently");
  }

  function liveChatOrderStageLabel(value) {
    const stage = normalizeText(value).toLowerCase();
    if (/receive|deliver|complete/.test(stage)) return "Delivered";
    if (/ship|transit/.test(stage)) return "In Transit";
    if (/pack|process/.test(stage)) return "Processing";
    if (/cancel/.test(stage)) return "Cancelled";
    if (/return/.test(stage)) return "Return Requested";
    return normalizeText(value) || "Processing";
  }

  function liveChatDisplayOrderId(value) {
    const orderId = normalizeText(value);
    if (orderId.length <= 16) {
      return orderId;
    }
    const primaryToken = normalizeText(orderId.split("_")[0]);
    const compactToken = (primaryToken || orderId).replace(/[^a-z0-9]/gi, "").slice(-8);
    return compactToken ? `GMS-${compactToken.toUpperCase()}` : orderId.slice(0, 16);
  }

  function liveChatFileExtension(value) {
    const normalized = normalizeText(value).toLowerCase().split(/[?#]/)[0];
    const match = normalized.match(/\.([a-z0-9]{2,8})$/i);
    return match ? match[1].toUpperCase() : "";
  }

  function liveChatNormalizeAssetUrl(value) {
    const assetUrl = normalizeText(value);
    if (!assetUrl || /^(?:data|blob):/i.test(assetUrl)) {
      return assetUrl;
    }
    try {
      const parsedUrl = new URL(assetUrl, window.location.origin);
      if (parsedUrl.pathname.startsWith("/uploads/")) {
        return `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
      }
    } catch (_) {
      // Keep non-standard URLs unchanged so their original fallback can handle them.
    }
    return assetUrl;
  }

  function liveChatIsVoiceAttachment(attachment) {
    const url = normalizeText(
      attachment?.url
        || attachment?.src
        || attachment?.imageUrl
        || attachment?.mediaUrl
        || attachment?.attachmentUrl
        || attachment?.fileUrl,
    );
    const name = normalizeText(attachment?.name || attachment?.imageName || attachment?.fileName || attachment?.title)
      || (url ? url.split("/").pop()?.split("?")[0] : "");
    const type = normalizeText(attachment?.type || attachment?.contentType || attachment?.mimeType).toLowerCase();
    return /^voice-/i.test(name)
      || /\/voice-/i.test(url)
      || /^audio\//.test(type);
  }

  function liveChatAttachmentKind(attachment) {
    const url = liveChatNormalizeAssetUrl(
      attachment?.url
        || attachment?.src
        || attachment?.imageUrl
        || attachment?.mediaUrl
        || attachment?.attachmentUrl
        || attachment?.documentUrl
        || attachment?.fileUrl,
    );
    const name = normalizeText(attachment?.name || attachment?.imageName || attachment?.fileName || attachment?.title)
      || (url ? url.split("/").pop()?.split("?")[0] : "");
    const type = normalizeText(attachment?.type || attachment?.contentType || attachment?.mimeType).toLowerCase();
    const extension = liveChatFileExtension(name) || liveChatFileExtension(url);
    const haystack = `${type} ${extension} ${url} ${name}`.toLowerCase();
    if (/drive\.google\.com|docs\.google\.com/.test(haystack)) {
      return "file";
    }
    if (liveChatIsVoiceAttachment({ ...attachment, url, name, type })) {
      return "audio";
    }
    if (/^audio\//.test(type) || ["OGG", "MP3", "M4A", "WAV", "AAC"].includes(extension)) {
      return "audio";
    }
    if (
      extension === "WEBM"
      && (/^voice-/i.test(name) || /\/voice-/i.test(url) || /^audio\//.test(type))
    ) {
      return "audio";
    }
    if (/^image\//.test(type) || ["PNG", "JPG", "JPEG", "WEBP", "GIF", "SVG"].includes(extension)) {
      return "image";
    }
    if (/^video\//.test(type) || ["MP4", "MOV", "M4V", "WEBM", "AVI", "MKV", "3GP"].includes(extension)) {
      return "video";
    }
    if (
      /pdf|word|document|spreadsheet|presentation|excel|powerpoint|sheet|drive|file/.test(haystack)
      || ["PDF", "DOC", "DOCX", "XLS", "XLSX", "PPT", "PPTX", "CSV", "TXT", "ZIP"].includes(extension)
    ) {
      return "file";
    }
    return url ? "image" : "file";
  }

  function liveChatSplitMessageAttachments(items) {
    const media = [];
    const audio = [];
    const files = [];
    (Array.isArray(items) ? items : []).forEach((item) => {
      const normalized = item?.kind
        ? item
        : liveChatNormalizeAttachment(item, normalizeText(item?.time));
      if (!normalizeText(normalized?.url || normalized?.src)) {
        return;
      }
      if (normalized.kind === "audio") {
        audio.push(normalized);
        return;
      }
      if (normalized.kind === "file") {
        files.push(normalized);
        return;
      }
      if (normalized.kind === "image" || normalized.kind === "video") {
        media.push(normalized);
      }
    });
    return { media, audio, files };
  }

  function liveChatNormalizeAttachment(attachment, fallbackTime = "") {
    const url = liveChatNormalizeAssetUrl(
      attachment?.url
        || attachment?.src
        || attachment?.imageUrl
        || attachment?.mediaUrl
        || attachment?.attachmentUrl
        || attachment?.documentUrl
        || attachment?.fileUrl,
    );
    const name = normalizeText(
      attachment?.name
        || attachment?.imageName
        || attachment?.fileName
        || attachment?.title,
    ) || (url ? url.split("/").pop()?.split("?")[0] : "") || "Attachment";
    const kind = liveChatAttachmentKind({ ...attachment, url, name });
    const extension = liveChatFileExtension(name) || liveChatFileExtension(url);
    const type = normalizeText(attachment?.type || attachment?.contentType || attachment?.mimeType)
      || (kind === "file" && extension ? extension : kind.toUpperCase());
    return {
      kind,
      url,
      src: url,
      name,
      alt: normalizeText(attachment?.alt) || name,
      type,
      size: normalizeText(attachment?.size || attachment?.sizeLabel),
      time: normalizeText(attachment?.time) || fallbackTime,
    };
  }

  function liveChatAttachmentDedupeKey(item) {
    const raw = normalizeText(item?.url || item?.src || item?.name).toLowerCase();
    if (!raw) {
      return "";
    }
    try {
      const parsed = new URL(raw, window.location.origin);
      return `${parsed.origin}${parsed.pathname}`.toLowerCase();
    } catch (_) {
      return raw.split("#")[0].split("?")[0];
    }
  }

  function liveChatUniqueAttachments(items) {
    const seen = new Set();
    return items.filter((item) => {
      const key = liveChatAttachmentDedupeKey(item);
      if (!key || seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  function liveChatSortAttachmentEntriesNewestFirst(entries) {
    return [...entries].sort((left, right) => {
      const epochDiff = (Number(right?.epochMs) || 0) - (Number(left?.epochMs) || 0);
      if (epochDiff !== 0) {
        return epochDiff;
      }
      return (Number(left?.index) || 0) - (Number(right?.index) || 0);
    });
  }

  function liveChatBuildConversationAttachmentEntries(active, bucket = "media") {
    const messages = Array.isArray(active?.messages) ? active.messages : [];
    const entries = [];
    messages.forEach((message) => {
      const epochMs = liveChatMessageEpochMs(message);
      const messageSide = message?.side === "support" ? "support" : "customer";
      const sourceItems = bucket === "file"
        ? (Array.isArray(message?.files) ? message.files : [])
        : (Array.isArray(message?.media) ? message.media : []);
      sourceItems.slice().reverse().forEach((item, index) => {
        const normalized = {
          ...liveChatNormalizeAttachment(item, item?.time || message?.time || ""),
          ...(bucket === "media" ? { messageSide } : {}),
        };
        if (!normalizeText(normalized?.url || normalized?.src || normalized?.name)) {
          return;
        }
        entries.push({ item: normalized, epochMs, index });
      });
    });
    const conversationItems = bucket === "file"
      ? (Array.isArray(active?.files) ? active.files : [])
      : (Array.isArray(active?.media) ? active.media : []);
    conversationItems.slice().reverse().forEach((item, index) => {
      const normalized = liveChatNormalizeAttachment(item, item?.time || "");
      if (!normalizeText(normalized?.url || normalized?.src || normalized?.name)) {
        return;
      }
      entries.push({
        item: normalized,
        epochMs: liveChatMessageEpochMs({ timestamp: item?.timestamp || item?.createdAt || item?.sentAt }),
        index,
      });
    });
    return liveChatSortAttachmentEntriesNewestFirst(entries);
  }

  function liveChatCollectMessageAttachments(storedMessages) {
    const attachments = [];
    (Array.isArray(storedMessages) ? storedMessages : []).slice().reverse().forEach((message) => {
      const timestamp = message?.timestamp || message?.createdAt || message?.sentAt;
      const timeLabel = liveChatTimeValue(timestamp, "");
      const imageUrls = Array.isArray(message?.imageUrls)
        ? message.imageUrls.map((url) => normalizeText(url)).filter(Boolean)
        : [];
      const imageNames = Array.isArray(message?.imageNames) ? message.imageNames : [];
      if (imageUrls.length) {
        imageUrls.slice().reverse().forEach((url, index) => {
          attachments.push(liveChatNormalizeAttachment({
            url,
            name: imageNames[(imageUrls.length - 1) - index]
              || imageNames[index]
              || message?.imageName
              || message?.mediaName
              || "",
            contentType: message?.contentType,
            type: message?.attachmentType || "image",
          }, timeLabel));
        });
        return;
      }
      const attachment = liveChatNormalizeAttachment({
        url: message?.imageUrl || message?.mediaUrl || message?.attachmentUrl || message?.fileUrl,
        name: message?.imageName || message?.mediaName || message?.attachmentName || message?.fileName,
        contentType: message?.contentType,
        type: message?.attachmentType,
      }, timeLabel);
      if (normalizeText(attachment.url)) {
        attachments.push(attachment);
      }
    });
    return attachments;
  }

  function liveChatNormalizeReplyReference(input) {
    const messageId = normalizeText(input?.messageId || input?.id);
    const senderLabel = normalizeText(input?.senderLabel || input?.sender || input?.from);
    const previewText = normalizeText(input?.previewText || input?.preview || input?.text);
    const rawPreviewPhotos = Array.isArray(input?.previewPhotos)
      ? input.previewPhotos
      : [input?.previewPhoto, input?.photoUrl, input?.imageUrl];
    const previewPhotos = rawPreviewPhotos
      .map((item) => liveChatNormalizeAssetUrl(item))
      .filter(Boolean)
      .slice(0, 2);
    if (!messageId || !senderLabel || !previewText) {
      return null;
    }
    return {
      messageId,
      senderLabel,
      previewText: previewText.length > 120 ? `${previewText.slice(0, 117).trimEnd()}...` : previewText,
      previewPhotos,
    };
  }

  function liveChatCollectReplyPreviewPhotoSources(message, active = null, limit = 2, visited = null) {
    const maxItems = Math.max(1, Number(limit) || 2);
    const seenIds = visited instanceof Set ? visited : new Set();
    const sources = [];

    const appendSources = (items) => {
      (Array.isArray(items) ? items : []).forEach((item) => {
        const source = liveChatNormalizeAssetUrl(item);
        if (!source || sources.includes(source)) {
          return;
        }
        sources.push(source);
      });
    };

    const visitMessage = (entry) => {
      if (!entry || sources.length >= maxItems) {
        return;
      }
      const messageId = normalizeText(entry?.id);
      if (messageId) {
        if (seenIds.has(messageId)) {
          return;
        }
        seenIds.add(messageId);
      }

      appendSources(
        (Array.isArray(entry?.media) ? entry.media : [])
          .filter((item) => item?.kind !== "video")
          .map((item) => item?.url || item?.src),
      );
      if (sources.length >= maxItems) {
        return;
      }

      const replyMessageId = normalizeText(entry?.replyTo?.messageId);
      if (replyMessageId && active) {
        const parent = (Array.isArray(active?.messages) ? active.messages : [])
          .find((item) => normalizeText(item?.id) === replyMessageId);
        if (parent) {
          visitMessage(parent);
        }
      }
      if (sources.length < maxItems) {
        appendSources(entry?.replyTo?.previewPhotos);
      }
    };

    visitMessage(message);
    return sources.slice(0, maxItems);
  }

  function liveChatReplyPreviewPhotos(message, limit = 2, active = null) {
    return liveChatCollectReplyPreviewPhotoSources(message, active, limit);
  }

  function liveChatResolveReplyPreviewPhotos(replyMeta, active) {
    const stored = (Array.isArray(replyMeta?.previewPhotos) ? replyMeta.previewPhotos : [])
      .map((item) => liveChatNormalizeAssetUrl(item))
      .filter(Boolean)
      .slice(0, 2);
    const messageId = normalizeText(replyMeta?.messageId);
    if (!messageId) {
      return stored;
    }
    const original = (Array.isArray(active?.messages) ? active.messages : [])
      .find((message) => normalizeText(message?.id) === messageId);
    if (!original) {
      return stored;
    }
    const resolved = liveChatCollectReplyPreviewPhotoSources(original, active, 2);
    return resolved.length ? resolved : stored;
  }

  function liveChatReplyPreviewText(message, active = null) {
    const text = liveChatDisplayMessageText(message);
    if (text) {
      return text.length > 120 ? `${text.slice(0, 117).trimEnd()}...` : text;
    }

    const files = Array.isArray(message?.files) ? message.files : [];
    const fileNames = files
      .map((file) => liveChatFileMeta(file).name)
      .map(normalizeText)
      .filter(Boolean);
    if (fileNames.length) {
      const label = fileNames.length === 1 ? fileNames[0] : `${fileNames.length} files`;
      return label.length > 120 ? `${label.slice(0, 117).trimEnd()}...` : label;
    }

    const messageMedia = Array.isArray(message?.media) ? message.media : [];
    const hasVideo = messageMedia.some((item) => item?.kind === "video" && normalizeText(item?.url || item?.src));
    const hasPhoto = messageMedia.some((item) => item?.kind !== "video" && normalizeText(item?.url || item?.src))
      || liveChatCollectReplyPreviewPhotoSources(message, active, 1).length > 0;
    if (hasPhoto) {
      return "Photo";
    }
    if (hasVideo) {
      return "Video";
    }

    return "Attachment";
  }

  function liveChatReplySenderLabel(active, message) {
    return message?.side === "support"
      ? "You"
      : normalizeText(active?.name) || "Customer";
  }

  function liveChatPendingReplyFor(active) {
    const pendingReply = liveChatRedesignState.pendingReply;
    if (!pendingReply || pendingReply.conversationId !== normalizeText(active?.id)) {
      return null;
    }
    return liveChatNormalizeReplyReference(pendingReply);
  }

  function liveChatBuildReplyPayload(active) {
    const pendingReply = liveChatPendingReplyFor(active);
    if (!pendingReply) {
      return null;
    }
    return {
      messageId: pendingReply.messageId,
      senderLabel: pendingReply.senderLabel,
      previewText: pendingReply.previewText,
      previewPhotos: Array.isArray(pendingReply.previewPhotos)
        ? pendingReply.previewPhotos.slice(0, 2)
        : [],
    };
  }

  function liveChatSetPendingReply(active, message, index = 0) {
    if (!active || !message) {
      return;
    }
    liveChatClearPendingEdit({ render: false });
    const messageId = normalizeText(message?.id) || `local-${Math.max(0, Number(index) || 0)}`;
    const previewText = liveChatReplyPreviewText(message, active);
    if (!messageId || !previewText) {
      return;
    }
    liveChatRedesignState.pendingReply = {
      conversationId: normalizeText(active.id),
      messageId,
      senderLabel: liveChatReplySenderLabel(active, message),
      previewText,
      previewPhotos: liveChatReplyPreviewPhotos(message, 2, active),
    };
    liveChatRedesignState.replyStateEnter = true;
    liveChatRenderBoard({ preserveMessageScrollExact: true });
    window.requestAnimationFrame(() => {
      const input = elements.liveChatMount?.querySelector("[data-lcx-message-input]");
      if (input instanceof HTMLTextAreaElement) {
        input.focus({ preventScroll: true });
        input.setSelectionRange(input.value.length, input.value.length);
      }
    });
  }

  function liveChatClearPendingReply(options = {}) {
    if (!options.skipAnimation) {
      const replyEl = elements.liveChatMount?.querySelector("[data-lcx-reply-state]");
      if (replyEl instanceof HTMLElement && !replyEl.classList.contains("is-closing")) {
        replyEl.classList.remove("is-entering");
        replyEl.classList.add("is-closing");
        window.setTimeout(() => {
          liveChatClearPendingReply({ ...options, skipAnimation: true });
        }, 220);
        return;
      }
    }
    liveChatRedesignState.pendingReply = null;
    liveChatRedesignState.replyStateEnter = false;
    if (options.render !== false) {
      liveChatRenderBoard({ preserveMessageScrollExact: true });
    }
  }

  function liveChatPendingEditFor(active) {
    const pendingEdit = liveChatRedesignState.pendingEdit;
    if (!pendingEdit || pendingEdit.conversationId !== normalizeText(active?.id)) {
      return null;
    }
    return pendingEdit;
  }

  function liveChatSetPendingEdit(active, message, index = 0) {
    if (!active || !message || !liveChatCanEditMessage(message)) {
      liveChatShowToast("Only your own admin messages can be edited.");
      return;
    }
    const messageId = normalizeText(message?.id) || `local-${Math.max(0, Number(index) || 0)}`;
    const originalText = normalizeText(message.text);
    const previewText = liveChatReplyPreviewText(message, active);
    if (!messageId || !originalText || !previewText) {
      return;
    }
    liveChatClearPendingReply({ render: false, skipAnimation: true });
    liveChatCloseMessageContextMenu();
    liveChatRedesignState.pendingEdit = {
      conversationId: normalizeText(active.id),
      messageId,
      messageIndex: Math.max(0, Number(index) || 0),
      previewText,
      originalText,
      draftText: originalText,
    };
    liveChatRedesignState.editStateEnter = true;
    liveChatRedesignState.emojiPickerOpen = false;
    liveChatRenderBoard({ preserveMessageScrollExact: true });
    window.requestAnimationFrame(() => {
      const input = elements.liveChatMount?.querySelector("[data-lcx-message-input]");
      if (input instanceof HTMLTextAreaElement) {
        input.value = originalText;
        const send = elements.liveChatMount?.querySelector("[data-lcx-send]");
        liveChatSyncSendButtonState();
        input.focus({ preventScroll: true });
        input.setSelectionRange(input.value.length, input.value.length);
      }
    });
  }

  function liveChatClearPendingEdit(options = {}) {
    if (!options.skipAnimation) {
      const editEl = elements.liveChatMount?.querySelector("[data-lcx-edit-state]");
      if (editEl instanceof HTMLElement && !editEl.classList.contains("is-closing")) {
        editEl.classList.remove("is-entering");
        editEl.classList.add("is-closing");
        window.setTimeout(() => {
          liveChatClearPendingEdit({ ...options, skipAnimation: true });
        }, 220);
        return;
      }
    }
    liveChatRedesignState.pendingEdit = null;
    liveChatRedesignState.editStateEnter = false;
    if (options.render !== false) {
      liveChatRenderBoard({ preserveMessageScrollExact: true });
    }
  }

  function liveChatEditStateMarkup(active) {
    const pendingEdit = liveChatPendingEditFor(active);
    if (!pendingEdit) {
      return "";
    }
    return `
      <div class="lcx-reply-state-shell" data-lcx-edit-shell>
        <div class="lcx-reply-state lcx-edit-state" data-lcx-edit-state role="status" aria-live="polite">
          <div class="lcx-reply-state__content">
            <strong class="lcx-reply-state__label">Edit message</strong>
            ${liveChatReplyEmojiPreviewMarkup(pendingEdit.previewText, pendingEdit.messageId, "state")}
          </div>
          <button type="button" class="lcx-reply-state__clear" data-lcx-action="clear-edit" aria-label="Cancel edit">${liveChatIcon("close", 16)}</button>
        </div>
      </div>`;
  }

  function liveChatSyncEditStateAnimation() {
    const editEl = elements.liveChatMount?.querySelector("[data-lcx-edit-state]");
    if (!(editEl instanceof HTMLElement)) {
      return;
    }
    if (liveChatRedesignState.editStateEnter) {
      liveChatRedesignState.editStateEnter = false;
      editEl.classList.remove("is-closing");
      window.requestAnimationFrame(() => {
        editEl.classList.add("is-entering");
      });
    }
  }

  function liveChatSyncEditComposerDraft() {
    const active = liveChatGetActive();
    const pendingEdit = liveChatPendingEditFor(active);
    const input = elements.liveChatMount?.querySelector("[data-lcx-message-input]");
    if (!pendingEdit || !(input instanceof HTMLTextAreaElement)) {
      return;
    }
    const draft = normalizeText(pendingEdit.draftText ?? pendingEdit.originalText);
    if (normalizeText(input.value) !== draft) {
      input.value = draft;
      const send = elements.liveChatMount?.querySelector("[data-lcx-send]");
      liveChatSyncSendButtonState();
    }
  }

  function liveChatReplyPreviewContentMarkup({ previewText, previewPhotos = [], keyPrefix = "", variant = "quote" } = {}) {
    const photos = (Array.isArray(previewPhotos) ? previewPhotos : [])
      .map((item) => liveChatNormalizeAssetUrl(item))
      .filter(Boolean)
      .slice(0, 2);
    if (photos.length) {
      const tag = variant === "state" ? "div" : "span";
      const className = variant === "state"
        ? "lcx-reply-state__preview lcx-reply-state__preview--photos"
        : "lcx-message__reply-photos";
      const photoCount = Math.min(photos.length, 2);
      return `<${tag} class="${className}" data-photo-count="${photoCount}" aria-label="${liveChatEscape(previewText || "Photo")}">${photos.map((source) => `
          <img
            class="lcx-reply-preview-photo"
            src="${liveChatEscape(source)}"
            alt=""
            loading="lazy"
            decoding="async"
          />`).join("")}</${tag}>`;
    }
    return liveChatReplyEmojiPreviewMarkup(previewText, keyPrefix, variant);
  }

  function liveChatReplyEmojiPreviewMarkup(previewText, keyPrefix, variant = "quote") {
    const text = normalizeText(previewText);
    if (!text) {
      return variant === "state"
        ? `<p class="lcx-reply-state__preview"></p>`
        : `<span class="lcx-message__reply-quote"></span>`;
    }
    const isEmojiOnly = liveChatIsEmojiOnlyText(text);
    if (isEmojiOnly) {
      return liveChatEmojiOnlyContentMarkup(text, keyPrefix, { variant });
    }
    if (variant === "state") {
      return `<p class="lcx-reply-state__preview">${liveChatEscape(text)}</p>`;
    }
    return `<span class="lcx-message__reply-quote">${liveChatEscape(text)}</span>`;
  }

  function liveChatClearReplyFocusHighlight() {
    elements.liveChatMount?.querySelectorAll(".lcx-message.is-reply-highlight, .lcx-message.is-reply-dimmed").forEach((element) => {
      element.classList.remove("is-reply-highlight", "is-reply-dimmed");
    });
  }

  function liveChatSyncReplyFocusHighlight() {
    const active = liveChatGetActive();
    const pendingReply = liveChatPendingReplyFor(active);
    const pendingEdit = liveChatPendingEditFor(active);
    const conversation = elements.liveChatMount?.querySelector(".lcx-conversation");
    const messageArea = elements.liveChatMount?.querySelector("[data-lcx-message-area]");
    liveChatClearReplyFocusHighlight();
    if (!(conversation instanceof HTMLElement)) {
      return;
    }
    conversation.classList.toggle("is-replying", Boolean(pendingReply || pendingEdit));
    const focusMessageId = normalizeText(pendingReply?.messageId || pendingEdit?.messageId);
    if (!focusMessageId) {
      return;
    }
    const targetMessage = liveChatFindMessageElementById(focusMessageId);
    if (!(targetMessage instanceof HTMLElement) || !(messageArea instanceof HTMLElement)) {
      return;
    }
    targetMessage.classList.add("is-reply-highlight");
    messageArea.querySelectorAll(".lcx-message").forEach((messageElement) => {
      if (messageElement !== targetMessage) {
        messageElement.classList.add("is-reply-dimmed");
      }
    });
  }

  function liveChatReplyLineLabel(replyMeta, supportMessage, active) {
    const senderLabel = normalizeText(replyMeta?.senderLabel);
    if (!senderLabel) {
      return "";
    }
    const normalizedSender = senderLabel.toLowerCase();
    if (supportMessage) {
      return normalizedSender === "you"
        ? "You replied to yourself"
        : `You replied to ${senderLabel}`;
    }
    const customerLabel = normalizeText(active?.name) || "Customer";
    return normalizedSender === "you"
      ? `${customerLabel} replied to you`
      : `${customerLabel} replied to ${senderLabel}`;
  }

  function liveChatReplyStateMarkup(active) {
    const pendingReply = liveChatPendingReplyFor(active);
    if (!pendingReply) {
      return "";
    }
    const label = pendingReply.senderLabel.toLowerCase() === "you"
      ? "Reply to yourself"
      : `Reply to ${pendingReply.senderLabel}`;
    return `
      <div class="lcx-reply-state-shell" data-lcx-reply-shell>
        <div class="lcx-reply-state" data-lcx-reply-state role="status" aria-live="polite">
          <div class="lcx-reply-state__content">
            <strong class="lcx-reply-state__label">${liveChatEscape(label)}</strong>
            ${liveChatReplyPreviewContentMarkup({
              previewText: pendingReply.previewText,
              previewPhotos: pendingReply.previewPhotos,
              keyPrefix: pendingReply.messageId,
              variant: "state",
            })}
          </div>
          <button type="button" class="lcx-reply-state__clear" data-lcx-action="clear-reply" aria-label="Cancel reply">${liveChatIcon("close", 16)}</button>
        </div>
      </div>`;
  }

  function liveChatPendingAttachmentsFor(conversation) {
    const conversationId = normalizeText(conversation?.id);
    if (!conversationId) {
      return [];
    }
    return (Array.isArray(liveChatRedesignState.pendingAttachments) ? liveChatRedesignState.pendingAttachments : [])
      .filter((item) => item?.conversationId === conversationId);
  }

  function liveChatRevokePendingAttachmentPreview(item) {
    const previewUrl = normalizeText(item?.previewUrl);
    if (previewUrl.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(previewUrl);
      } catch (_) {
      }
    }
  }

  function liveChatClearPendingAttachments(conversationId = "") {
    const normalizedConversationId = normalizeText(conversationId);
    const items = Array.isArray(liveChatRedesignState.pendingAttachments)
      ? liveChatRedesignState.pendingAttachments
      : [];
    items.forEach((item) => {
      if (!normalizedConversationId || item?.conversationId === normalizedConversationId) {
        liveChatRevokePendingAttachmentPreview(item);
      }
    });
    liveChatRedesignState.pendingAttachments = normalizedConversationId
      ? items.filter((item) => item?.conversationId !== normalizedConversationId)
      : [];
  }

  function liveChatRemovePendingAttachment(attachmentId, conversation) {
    const normalizedAttachmentId = normalizeText(attachmentId);
    const conversationId = normalizeText(conversation?.id);
    if (!normalizedAttachmentId || !conversationId) {
      return;
    }
    const items = Array.isArray(liveChatRedesignState.pendingAttachments)
      ? liveChatRedesignState.pendingAttachments
      : [];
    const target = items.find((item) => item?.id === normalizedAttachmentId && item?.conversationId === conversationId);
    if (!target) {
      return;
    }
    liveChatRevokePendingAttachmentPreview(target);
    liveChatRedesignState.pendingAttachments = items.filter((item) => item !== target);
    liveChatRenderBoard({ preserveComposer: liveChatCaptureComposerState() });
    liveChatSyncSendButtonState();
  }

  function liveChatStageComposerAttachments(files, conversation) {
    const conversationId = normalizeText(conversation?.id);
    if (!conversationId || !files?.length) {
      return;
    }
    const current = liveChatPendingAttachmentsFor(conversation);
    const remaining = LIVE_CHAT_MAX_PENDING_ATTACHMENTS - current.length;
    if (remaining <= 0) {
      liveChatShowToast(`You can attach up to ${LIVE_CHAT_MAX_PENDING_ATTACHMENTS} files at once.`);
      return;
    }
    const accepted = files.slice(0, remaining);
    const staged = accepted.map((file) => {
      const normalized = liveChatNormalizeAttachment({
        name: file.name,
        type: file.type,
        contentType: file.type,
        size: Number.isFinite(file.size) && file.size > 0 ? `${Math.max(1, Math.round(file.size / 1024))} KB` : "",
      }, liveChatFormatCurrentTime());
      const previewUrl = normalized.kind === "image" || normalized.kind === "video"
        ? URL.createObjectURL(file)
        : "";
      return {
        id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        conversationId,
        file,
        previewUrl,
        name: normalized.name,
        type: normalized.type,
        kind: normalized.kind,
        size: normalized.size,
      };
    });
    liveChatRedesignState.pendingAttachments = [
      ...(Array.isArray(liveChatRedesignState.pendingAttachments) ? liveChatRedesignState.pendingAttachments : []),
      ...staged,
    ];
    if (files.length > remaining) {
      liveChatShowToast(`Only ${remaining} more file${remaining === 1 ? "" : "s"} can be added.`);
    }
    liveChatRenderBoard({ preserveComposer: liveChatCaptureComposerState() });
    liveChatSyncSendButtonState();
  }

  function liveChatAttachmentComposerThumbMarkup(item) {
    const previewMarkup = item.kind === "image" && item.previewUrl
      ? `<img src="${liveChatEscape(item.previewUrl)}" alt="${liveChatEscape(item.name)}" loading="lazy" />`
      : item.kind === "video" && item.previewUrl
        ? `<video src="${liveChatEscape(item.previewUrl)}" muted playsinline preload="metadata" aria-hidden="true"></video><span class="lcx-attachment-composer__thumb-badge">${liveChatIcon("video", 14)}</span>`
        : `<span class="lcx-attachment-composer__thumb-file" aria-hidden="true">${liveChatIcon(item.kind === "file" ? "file" : "image", 22)}</span><span class="lcx-attachment-composer__thumb-name">${liveChatEscape(item.name)}</span>`;
    return `
      <div class="lcx-attachment-composer__thumb" data-lcx-pending-attachment-id="${liveChatEscape(item.id)}">
        <div class="lcx-attachment-composer__thumb-preview">${previewMarkup}</div>
        <button
          type="button"
          class="lcx-attachment-composer__thumb-remove"
          data-lcx-action="remove-pending-attachment"
          data-lcx-pending-attachment-id="${liveChatEscape(item.id)}"
          aria-label="Remove ${liveChatEscape(item.name)}"
          title="Remove"
        >${liveChatIcon("close", 12)}</button>
      </div>`;
  }

  function liveChatAttachmentComposerMarkup(conversation) {
    const pendingAttachments = liveChatPendingAttachmentsFor(conversation);
    if (!pendingAttachments.length) {
      return "";
    }
    const atLimit = pendingAttachments.length >= LIVE_CHAT_MAX_PENDING_ATTACHMENTS;
    return `
      <div class="lcx-attachment-composer-shell" data-lcx-attachment-composer>
        <div class="lcx-attachment-composer" role="region" aria-label="Attachments ready to send">
          <div class="lcx-attachment-composer__list" data-lcx-attachment-list tabindex="0">
            <button
              type="button"
              class="lcx-attachment-composer__dropzone${atLimit ? " is-limit-reached" : ""}"
              data-lcx-action="attach"
              data-lcx-attachment-dropzone
              ${atLimit ? "disabled" : ""}
              aria-label="${atLimit ? "Attachment limit reached" : "Click or drag to add photos and files"}"
            >
              <span class="lcx-attachment-composer__dropzone-icon" aria-hidden="true">${liveChatIcon("cloud-upload", 24)}</span>
              <strong>Drag &amp; drop photos here</strong>
              <span class="lcx-attachment-composer__dropzone-or">or</span>
              <span class="lcx-attachment-composer__dropzone-browse">Browse Files</span>
            </button>
            ${pendingAttachments.map(liveChatAttachmentComposerThumbMarkup).join("")}
          </div>
        </div>
      </div>`;
  }

  function liveChatStopCameraStream() {
    if (liveChatCameraSession.stream) {
      liveChatCameraSession.stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (_) {
        }
      });
      liveChatCameraSession.stream = null;
    }
    const preview = document.querySelector("[data-lcx-camera-preview]");
    if (preview instanceof HTMLVideoElement) {
      preview.srcObject = null;
    }
  }

  function liveChatCloseCameraModal() {
    liveChatStopCameraStream();
    const modal = document.querySelector("[data-lcx-camera-modal]");
    if (modal instanceof HTMLElement) {
      modal.hidden = true;
    }
    document.documentElement.classList.remove("lcx-camera-modal-open");
    document.body.classList.remove("lcx-camera-modal-open");
    liveChatCameraSession.isOpen = false;
  }

  function liveChatEnsureCameraModal() {
    let modal = document.querySelector("[data-lcx-camera-modal]");
    if (modal instanceof HTMLElement) {
      return modal;
    }
    modal = document.createElement("div");
    modal.className = "lcx-camera-modal";
    modal.dataset.lcxCameraModal = "";
    modal.hidden = true;
    modal.innerHTML = `
      <div class="lcx-camera-modal__backdrop" data-lcx-action="close-camera-modal"></div>
      <div class="lcx-camera-modal__dialog" role="dialog" aria-modal="true" aria-label="Camera capture">
        <header class="lcx-camera-modal__header">
          <strong class="lcx-camera-modal__title">Take photo</strong>
          <button type="button" class="lcx-camera-modal__close" data-lcx-action="close-camera-modal" aria-label="Close camera">${liveChatIcon("close", 18)}</button>
        </header>
        <div class="lcx-camera-modal__stage">
          <video class="lcx-camera-modal__preview" data-lcx-camera-preview autoplay playsinline muted aria-label="Camera preview"></video>
          <p class="lcx-camera-modal__message" data-lcx-camera-message hidden></p>
        </div>
        <footer class="lcx-camera-modal__footer">
          <p class="lcx-camera-modal__hint">Captured photos are added to your attachments before sending.</p>
          <div class="lcx-camera-modal__actions">
            <button type="button" class="lcx-camera-modal__capture" data-lcx-action="capture-camera-photo" aria-label="Capture photo">
              <span class="lcx-camera-modal__capture-ring" aria-hidden="true"></span>
            </button>
            <button type="button" class="lcx-camera-modal__done" data-lcx-action="close-camera-modal">Done</button>
          </div>
        </footer>
      </div>`;
    document.body.appendChild(modal);
    liveChatObserveMediaSkeletons(modal);

    modal.addEventListener("click", (event) => {
      const actionButton = event.target instanceof Element
        ? event.target.closest("[data-lcx-action]")
        : null;
      if (!(actionButton instanceof HTMLElement)) {
        return;
      }
      const action = actionButton.dataset.lcxAction || "";
      if (action === "close-camera-modal") {
        liveChatCloseCameraModal();
        return;
      }
      if (action === "capture-camera-photo") {
        void liveChatCaptureCameraPhoto();
      }
    });

    if (document.body.dataset.lcxCameraEscapeBound !== "true") {
      document.body.dataset.lcxCameraEscapeBound = "true";
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && liveChatCameraSession.isOpen) {
          event.preventDefault();
          liveChatCloseCameraModal();
        }
      });
    }

    return modal;
  }

  async function liveChatStartCameraPreview() {
    const preview = document.querySelector("[data-lcx-camera-preview]");
    const message = document.querySelector("[data-lcx-camera-message]");
    if (!(preview instanceof HTMLVideoElement)) {
      return;
    }
    liveChatStopCameraStream();
    liveChatSetMediaSkeletonState(preview, true);
    if (message instanceof HTMLElement) {
      message.hidden = true;
      message.textContent = "";
    }
    if (typeof navigator?.mediaDevices?.getUserMedia !== "function") {
      if (message instanceof HTMLElement) {
        message.hidden = false;
        message.textContent = "Camera is not supported in this browser.";
      }
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      liveChatCameraSession.stream = stream;
      preview.srcObject = stream;
      await preview.play();
      liveChatSetMediaSkeletonState(preview, false);
    } catch (error) {
      liveChatSetMediaSkeletonState(preview, false, true);
      if (message instanceof HTMLElement) {
        message.hidden = false;
        message.textContent = error?.message || "Unable to access the camera. Check permissions and try again.";
      }
    }
  }

  async function liveChatOpenCameraModal() {
    const active = liveChatGetActive();
    if (!active) {
      return;
    }
    if (liveChatPendingAttachmentsFor(active).length >= LIVE_CHAT_MAX_PENDING_ATTACHMENTS) {
      liveChatShowToast(`You can attach up to ${LIVE_CHAT_MAX_PENDING_ATTACHMENTS} files at once.`);
      return;
    }
    liveChatSetEmojiPickerOpen(false);
    liveChatEnsureCameraModal().hidden = false;
    document.documentElement.classList.add("lcx-camera-modal-open");
    document.body.classList.add("lcx-camera-modal-open");
    liveChatCameraSession.isOpen = true;
    await liveChatStartCameraPreview();
  }

  async function liveChatCaptureCameraPhoto() {
    const active = liveChatGetActive();
    if (!active) {
      return;
    }
    if (liveChatPendingAttachmentsFor(active).length >= LIVE_CHAT_MAX_PENDING_ATTACHMENTS) {
      liveChatShowToast(`You can attach up to ${LIVE_CHAT_MAX_PENDING_ATTACHMENTS} files at once.`);
      liveChatCloseCameraModal();
      return;
    }
    const preview = document.querySelector("[data-lcx-camera-preview]");
    if (!(preview instanceof HTMLVideoElement) || !preview.videoWidth || !preview.videoHeight) {
      liveChatShowToast("Camera is not ready yet.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = preview.videoWidth;
    canvas.height = preview.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      liveChatShowToast("Unable to capture photo.");
      return;
    }
    context.drawImage(preview, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.92);
    });
    if (!(blob instanceof Blob)) {
      liveChatShowToast("Unable to capture photo.");
      return;
    }
    const fileName = `camera-${Date.now()}.jpg`;
    const file = new File([blob], fileName, { type: "image/jpeg" });
    liveChatStageComposerAttachments([file], active);
    liveChatShowToast("Photo added to attachments.");
    if (liveChatPendingAttachmentsFor(active).length >= LIVE_CHAT_MAX_PENDING_ATTACHMENTS) {
      liveChatCloseCameraModal();
    }
  }

  function liveChatSyncReplyStateAnimation() {
    const replyEl = elements.liveChatMount?.querySelector("[data-lcx-reply-state]");
    if (!(replyEl instanceof HTMLElement)) {
      return;
    }
    if (liveChatRedesignState.replyStateEnter) {
      liveChatRedesignState.replyStateEnter = false;
      replyEl.classList.remove("is-closing");
      window.requestAnimationFrame(() => {
        replyEl.classList.add("is-entering");
      });
    }
  }

  function liveChatFindMessageElementById(messageId) {
    const normalizedMessageId = normalizeText(messageId);
    if (!normalizedMessageId) {
      return null;
    }
    return [...(elements.liveChatMount?.querySelectorAll("[data-lcx-message-id]") || [])]
      .find((item) => item instanceof HTMLElement && item.dataset.lcxMessageId === normalizedMessageId) || null;
  }

  function liveChatClearReplyJumpAnimation() {
    liveChatReplyJumpToken += 1;
    if (liveChatReplyJumpAnimationFrame) {
      window.cancelAnimationFrame(liveChatReplyJumpAnimationFrame);
      liveChatReplyJumpAnimationFrame = 0;
    }
    if (liveChatReplyJumpClearTimer) {
      window.clearTimeout(liveChatReplyJumpClearTimer);
      liveChatReplyJumpClearTimer = 0;
    }
    elements.liveChatMount?.querySelectorAll(".is-reply-tracing, .is-reply-target").forEach((element) => {
      element.classList.remove("is-reply-tracing", "is-reply-target");
    });
  }

  function liveChatFinishReplyJump(messageElement, triggerElement, jumpToken) {
    if (jumpToken !== liveChatReplyJumpToken || !(messageElement instanceof HTMLElement) || !messageElement.isConnected) {
      return;
    }
    liveChatReplyJumpAnimationFrame = 0;
    triggerElement?.classList.remove("is-reply-tracing");
    messageElement.classList.remove("is-reply-tracing", "is-reply-target");
    void messageElement.offsetWidth;
    messageElement.classList.add("is-reply-target");
    liveChatReplyJumpClearTimer = window.setTimeout(() => {
      if (jumpToken !== liveChatReplyJumpToken) {
        return;
      }
      messageElement.classList.remove("is-reply-target");
      liveChatReplyJumpClearTimer = 0;
    }, 720);
  }

  function liveChatTraceReplyJump(messageElement, messageArea, triggerElement, jumpToken) {
    const startedAt = window.performance.now();
    let previousTop = null;
    let stableFrames = 0;
    const traceFrame = (now) => {
      if (jumpToken !== liveChatReplyJumpToken || !messageElement.isConnected) {
        return;
      }
      const messageRect = messageElement.getBoundingClientRect();
      const areaRect = messageArea instanceof HTMLElement
        ? messageArea.getBoundingClientRect()
        : { top: 0, height: window.innerHeight };
      const messageCenter = messageRect.top + (messageRect.height / 2);
      const areaCenter = areaRect.top + (areaRect.height / 2);
      const centerDelta = Math.abs(messageCenter - areaCenter);
      const movement = previousTop === null ? Number.POSITIVE_INFINITY : Math.abs(messageRect.top - previousTop);
      previousTop = messageRect.top;
      stableFrames = movement < 0.75 ? stableFrames + 1 : 0;

      const elapsed = now - startedAt;
      const closeToCenter = centerDelta <= Math.max(24, Math.min(72, messageRect.height * 0.35));
      const targetVisible = messageRect.bottom >= areaRect.top + 8
        && messageRect.top <= areaRect.top + areaRect.height - 8;
      const scrollSettled = (closeToCenter || targetVisible) && stableFrames >= 3 && elapsed >= 180;
      if (scrollSettled || elapsed >= 760) {
        liveChatFinishReplyJump(messageElement, triggerElement, jumpToken);
        return;
      }
      liveChatReplyJumpAnimationFrame = window.requestAnimationFrame(traceFrame);
    };
    liveChatReplyJumpAnimationFrame = window.requestAnimationFrame(traceFrame);
  }

  function liveChatJumpToMessage(messageId, triggerElement = null) {
    liveChatClearReplyJumpAnimation();
    const jumpToken = liveChatReplyJumpToken;
    let messageElement = liveChatFindMessageElementById(messageId);
    if (!(messageElement instanceof HTMLElement)) {
      const active = liveChatGetActive();
      const messages = Array.isArray(active?.messages) ? active.messages : [];
      const messageIndex = messages.findIndex((message) => normalizeText(message?.id) === normalizeText(messageId));
      if (messageIndex >= 0) {
        liveChatEnsureMessageInLazyWindow(messageIndex);
        messageElement = liveChatFindMessageElementById(messageId);
      }
    }
    if (!(messageElement instanceof HTMLElement)) {
      liveChatShowToast("Original message is not visible in this chat.");
      return;
    }
    liveChatRedesignState.messageScrollPinned = false;
    liveChatRedesignState.forceMessageScrollBottom = false;
    const messageArea = messageElement.closest("[data-lcx-message-area]");
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
    if (triggerElement instanceof HTMLElement) {
      triggerElement.classList.add("is-reply-tracing");
    }
    messageElement.classList.add("is-reply-tracing");
    messageElement.scrollIntoView({ block: "center", behavior: reducedMotion ? "auto" : "smooth" });
    if (messageArea instanceof HTMLElement) {
      liveChatLoadVisibleScrollLazyMedia(messageArea);
    }
    if (reducedMotion) {
      liveChatFinishReplyJump(messageElement, triggerElement, jumpToken);
      return;
    }
    liveChatTraceReplyJump(messageElement, messageArea, triggerElement, jumpToken);
  }

  function liveChatClearChatFindHighlights(root) {
    const scope = root instanceof HTMLElement
      ? root
      : elements.liveChatMount?.querySelector("[data-lcx-message-area]");
    scope?.querySelectorAll("mark.lcx-chat-find-mark").forEach((mark) => {
      const text = mark.textContent || "";
      const parent = mark.parentNode;
      if (!parent) {
        return;
      }
      parent.replaceChild(document.createTextNode(text), mark);
      parent.normalize();
    });
  }

  function liveChatHighlightTextNode(textNode, query, matches) {
    const text = textNode.textContent || "";
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    if (!lowerQuery || !lowerText.includes(lowerQuery)) {
      return;
    }

    const fragment = document.createDocumentFragment();
    let start = 0;
    let index = lowerText.indexOf(lowerQuery, start);
    while (index !== -1) {
      if (index > start) {
        fragment.appendChild(document.createTextNode(text.slice(start, index)));
      }
      const mark = document.createElement("mark");
      mark.className = "lcx-chat-find-mark";
      mark.textContent = text.slice(index, index + query.length);
      fragment.appendChild(mark);
      matches.push(mark);
      start = index + query.length;
      index = lowerText.indexOf(lowerQuery, start);
    }
    if (start < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(start)));
    }
    textNode.parentNode?.replaceChild(fragment, textNode);
  }

  function liveChatCollectChatFindTextNodes(messageArea) {
    const selectors = [
      ".lcx-message__bubble p",
      ".lcx-message__reply-quote",
      ".lcx-message-file span",
    ];
    const textNodes = [];
    selectors.forEach((selector) => {
      messageArea.querySelectorAll(selector).forEach((element) => {
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
          acceptNode(node) {
            const parent = node.parentElement;
            if (parent?.closest("time, .lcx-message__time, .lcx-message__sender, .lcx-message__meta")) {
              return NodeFilter.FILTER_REJECT;
            }
            return node.textContent?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
          },
        });
        let node = walker.nextNode();
        while (node) {
          textNodes.push(node);
          node = walker.nextNode();
        }
      });
    });
    return textNodes;
  }

  function liveChatCollectChatFindMatches() {
    const messageArea = elements.liveChatMount?.querySelector("[data-lcx-message-area]");
    if (!messageArea) {
      return [];
    }
    return [...messageArea.querySelectorAll("mark.lcx-chat-find-mark")];
  }

  function liveChatUpdateChatFindStatus(current, total) {
    const status = elements.liveChatMount?.querySelector("[data-lcx-chat-find-status]");
    if (status instanceof HTMLElement) {
      if (!normalizeText(liveChatRedesignState.chatFindQuery)) {
        status.textContent = "";
      } else if (!total) {
        status.textContent = "0/0";
      } else {
        status.textContent = `${current}/${total}`;
      }
    }

    elements.liveChatMount?.querySelectorAll("[data-lcx-action='chat-find-prev'], [data-lcx-action='chat-find-next']").forEach((button) => {
      if (!(button instanceof HTMLButtonElement)) {
        return;
      }
      button.disabled = total <= 1;
    });
  }

  function liveChatChatFindGoTo(index) {
    const matches = liveChatCollectChatFindMatches();
    if (!matches.length) {
      liveChatUpdateChatFindStatus(0, 0);
      return;
    }

    const normalized = ((index % matches.length) + matches.length) % matches.length;
    liveChatRedesignState.chatFindMatchIndex = normalized;
    matches.forEach((mark, markIndex) => {
      mark.classList.toggle("is-current", markIndex === normalized);
    });
    liveChatUpdateChatFindStatus(normalized + 1, matches.length);

    const current = matches[normalized];
    current.scrollIntoView({ block: "center", behavior: "smooth" });
    const message = current.closest(".lcx-message");
    if (message instanceof HTMLElement) {
      window.clearTimeout(liveChatChatFindTargetTimer);
      message.classList.add("is-find-target");
      liveChatChatFindTargetTimer = window.setTimeout(() => {
        message.classList.remove("is-find-target");
      }, 900);
    }
  }

  function liveChatChatFindStep(direction) {
    const matches = liveChatCollectChatFindMatches();
    if (!matches.length) {
      return;
    }
    liveChatChatFindGoTo(liveChatRedesignState.chatFindMatchIndex + direction);
  }

  function liveChatSyncChatFindHighlights(options = {}) {
    const messageArea = elements.liveChatMount?.querySelector("[data-lcx-message-area]");
    liveChatClearChatFindHighlights(messageArea);

    const query = normalizeText(liveChatRedesignState.chatFindQuery);
    if (!query || !(messageArea instanceof HTMLElement)) {
      liveChatRedesignState.chatFindMatchIndex = 0;
      liveChatUpdateChatFindStatus(0, 0);
      return [];
    }

    const matches = [];
    liveChatCollectChatFindTextNodes(messageArea).forEach((textNode) => {
      liveChatHighlightTextNode(textNode, query, matches);
    });

    let activeIndex = Number(liveChatRedesignState.chatFindMatchIndex) || 0;
    if (options.goToIndex !== null && Number.isFinite(options.goToIndex)) {
      activeIndex = options.goToIndex;
    } else if (matches.length && activeIndex >= matches.length) {
      activeIndex = 0;
    }
    liveChatRedesignState.chatFindMatchIndex = activeIndex;

    if (matches.length) {
      liveChatChatFindGoTo(activeIndex);
    } else {
      liveChatUpdateChatFindStatus(0, 0);
    }

    return matches;
  }

  function liveChatSyncChatFindWidget() {
    const findRoot = elements.liveChatMount?.querySelector("[data-lcx-chat-find]");
    const trigger = elements.liveChatMount?.querySelector("[data-lcx-action='toggle-chat-find']");
    if (findRoot instanceof HTMLElement) {
      findRoot.classList.toggle("is-open", liveChatRedesignState.chatFindOpen);
      findRoot.setAttribute("aria-hidden", liveChatRedesignState.chatFindOpen ? "false" : "true");
      const input = findRoot.querySelector("[data-lcx-chat-find-input]");
      if (input instanceof HTMLInputElement && input.value !== liveChatRedesignState.chatFindQuery) {
        input.value = liveChatRedesignState.chatFindQuery;
      }
    }
    if (trigger instanceof HTMLElement) {
      trigger.classList.toggle("is-active", liveChatRedesignState.chatFindOpen);
      trigger.setAttribute("aria-expanded", liveChatRedesignState.chatFindOpen ? "true" : "false");
    }
  }

  function liveChatOpenChatFind(options = {}) {
    if (!liveChatGetActive()) {
      liveChatShowToast("Select a conversation to search.");
      return;
    }

    liveChatRedesignState.chatFindOpen = true;
    if (options.query !== undefined) {
      liveChatRedesignState.chatFindQuery = String(options.query ?? "");
      liveChatRedesignState.chatFindMatchIndex = 0;
    }

    liveChatSyncChatFindWidget();
    const input = elements.liveChatMount?.querySelector("[data-lcx-chat-find-input]");
    if (input instanceof HTMLInputElement) {
      if (options.query !== undefined) {
        input.value = liveChatRedesignState.chatFindQuery;
      }
      window.requestAnimationFrame(() => {
        input.focus({ preventScroll: true });
        if (options.select) {
          input.select();
        }
      });
    }
    liveChatSyncChatFindHighlights({ goToIndex: liveChatRedesignState.chatFindMatchIndex });
  }

  function liveChatCloseChatFind() {
    liveChatRedesignState.chatFindOpen = false;
    liveChatRedesignState.chatFindQuery = "";
    liveChatRedesignState.chatFindMatchIndex = 0;
    liveChatClearChatFindHighlights();
    liveChatSyncChatFindWidget();
    liveChatUpdateChatFindStatus(0, 0);
    const input = elements.liveChatMount?.querySelector("[data-lcx-chat-find-input]");
    if (input instanceof HTMLInputElement) {
      input.value = "";
    }
  }

  function liveChatFindOrderForThread(thread) {
    const customerId = normalizeText(thread?.customerAccountId || thread?.accountId || thread?.customerId || thread?.userId);
    const productId = normalizeText(thread?.productId);
    const matchingOrders = liveChatOrders.filter((order) => {
      const orderCustomerId = normalizeText(order?.accountId || order?.customerId || order?.userId);
      if (customerId && orderCustomerId === customerId) {
        return true;
      }
      return productId && normalizeText(order?.productId) === productId;
    });
    return matchingOrders.sort((left, right) => {
      const leftTime = Number(left?.createdAtEpochMs) || new Date(left?.createdAt || 0).getTime() || 0;
      const rightTime = Number(right?.createdAtEpochMs) || new Date(right?.createdAt || 0).getTime() || 0;
      return rightTime - leftTime;
    })[0] || null;
  }

  function liveChatIsPinProductMessage(message) {
    return normalizeText(message?.source).toLowerCase() === "pin-product";
  }

  function liveChatGetLatestPinnedProductMessage(thread) {
    const messages = Array.isArray(thread?.messages)
      ? thread.messages
      : (Array.isArray(thread?.rawThread?.messages) ? thread.rawThread.messages : []);
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      if (liveChatIsPinProductMessage(message) && !normalizeText(message?.deletedAt)) {
        return message;
      }
    }
    return null;
  }

  function liveChatHasPinnedProductContext(conversation) {
    const thread = conversation?.rawThread || conversation;
    return Boolean(
      liveChatGetLatestPinnedProductMessage(conversation)
        || liveChatGetLatestPinnedProductMessage(thread)
        || normalizeText(conversation?.productId || thread?.productId)
        || normalizeText(conversation?.productName || thread?.productName),
    );
  }

  function liveChatResolveActiveIdAfterSync(previousActiveId, previousConversations, nextConversations) {
    if (nextConversations.some((item) => item.id === previousActiveId)) {
      return previousActiveId;
    }
    const previous = previousConversations.find((item) => item.id === previousActiveId);
    if (!previous) {
      return nextConversations[0]?.id || "";
    }
    const buyerId = normalizeText(previous.buyerId);
    const match = nextConversations.find((item) => normalizeText(item.buyerId) === buyerId);
    return match?.id || previousActiveId || nextConversations[0]?.id || "";
  }

  function liveChatMergeConversationOrder(previousConversations, nextConversations) {
    const nextById = new Map(nextConversations.map((item) => [item.id, item]));
    const nextByBuyer = new Map(
      nextConversations
        .filter((item) => normalizeText(item.buyerId))
        .map((item) => [normalizeText(item.buyerId), item]),
    );
    const ordered = [];
    const used = new Set();

    previousConversations.forEach((previous) => {
      let item = nextById.get(previous.id);
      if (!item && normalizeText(previous.buyerId)) {
        item = nextByBuyer.get(normalizeText(previous.buyerId));
      }
      if (item && !used.has(item.id)) {
        ordered.push(item);
        used.add(item.id);
      }
    });

    nextConversations.forEach((item) => {
      if (!used.has(item.id)) {
        ordered.push(item);
        used.add(item.id);
      }
    });

    return ordered;
  }

  function liveChatConversationLastActivityTime(conversation) {
    const messages = Array.isArray(conversation?.messages) ? conversation.messages : [];
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const timestamp = normalizeText(messages[index]?.timestamp);
      if (!timestamp) {
        continue;
      }
      const parsed = new Date(timestamp);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.getTime();
      }
    }
    const updatedAt = normalizeText(conversation?.rawThread?.updatedAt);
    if (updatedAt) {
      const parsed = new Date(updatedAt);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.getTime();
      }
    }
    return 0;
  }

  function liveChatConversationHasNewActivity(previous, next) {
    if (!previous || !next) {
      return false;
    }
    if (liveChatMessagesDataSignature(previous.messages) !== liveChatMessagesDataSignature(next.messages)) {
      return true;
    }
    if ((Number(next.unread) || 0) > (Number(previous.unread) || 0)) {
      return true;
    }
    return normalizeText(previous.preview) !== normalizeText(next.preview);
  }

  function liveChatOrderConversations(previousConversations, nextConversations) {
    const merged = liveChatMergeConversationOrder(previousConversations, nextConversations);
    if (!Array.isArray(previousConversations) || !previousConversations.length) {
      return merged.slice().sort((left, right) => (
        liveChatConversationLastActivityTime(right) - liveChatConversationLastActivityTime(left)
      ));
    }

    const previousById = new Map(
      previousConversations.map((conversation) => [conversation.id, conversation]),
    );
    const bubble = [];
    const stay = [];

    merged.forEach((conversation) => {
      const previous = previousById.get(conversation.id);
      const isBrandNew = !previous;
      const shouldBubble = (
        !liveChatPrefsFor(conversation.id).muted
        && (isBrandNew || liveChatConversationHasNewActivity(previous, conversation))
      );
      if (shouldBubble) {
        bubble.push(conversation);
      } else {
        stay.push(conversation);
      }
    });

    bubble.sort((left, right) => (
      liveChatConversationLastActivityTime(right) - liveChatConversationLastActivityTime(left)
    ));

    return bubble.concat(stay);
  }

  function liveChatNormalizeThread(thread) {
    const storedMessages = Array.isArray(thread?.messages) ? thread.messages : [];
    const latestMessage = storedMessages[storedMessages.length - 1] || {};
    const previewMessage = storedMessages.slice().reverse().find((message) => !liveChatIsPinProductMessage(message))
      || latestMessage;
    const matchingOrder = liveChatFindOrderForThread(thread);
    const customerId = normalizeText(thread?.customerAccountId || thread?.accountId || thread?.customerId || thread?.userId);
    const customerOrders = liveChatOrders.filter((order) => {
      const orderCustomerId = normalizeText(order?.accountId || order?.customerId || order?.userId);
      return customerId && customerId === orderCustomerId;
    });
    const uniqueOrders = new Map();
    customerOrders.forEach((order) => {
      const key = normalizeText(order?.orderId || order?.groupId || order?.createdAtEpochMs || order?.id);
      if (!key) return;
      const previous = uniqueOrders.get(key);
      if (!previous || Number(order?.grandTotalAmount || order?.total || 0) > Number(previous?.grandTotalAmount || previous?.total || 0)) {
        uniqueOrders.set(key, order);
      }
    });
    const totalSpent = [...uniqueOrders.values()].reduce(
      (total, order) => total + (Number(order?.grandTotalAmount ?? order?.total ?? order?.amount) || 0),
      0,
    );
    const stage = liveChatOrderStageLabel(matchingOrder?.stage || matchingOrder?.status);
    const category = /return/i.test(stage)
      ? "Return Request"
      : /cancel|failed/i.test(stage)
        ? "Priority"
        : matchingOrder
          ? "Order Inquiry"
          : "Product Query";
    const productName = normalizeText(matchingOrder?.productName || thread?.productName) || "Product inquiry";
    const productImage = liveChatNormalizeAssetUrl(
      thread?.productImageUrl
        || thread?.productImage
        || thread?.product?.cardImageUrl
        || thread?.product?.mainImageUrl
        || thread?.product?.imageUrl
        || thread?.product?.image
        || matchingOrder?.productImageUrl
        || matchingOrder?.productImage
        || matchingOrder?.imageUrl
        || matchingOrder?.mainImageUrl,
    );
    const latestTimestamp = previewMessage?.timestamp || thread?.updatedAt;
    const messageAttachments = liveChatCollectMessageAttachments(storedMessages);
    const threadMedia = [
      ...(Array.isArray(thread?.media) ? thread.media : []),
      ...(Array.isArray(thread?.attachments) ? thread.attachments : []),
    ].slice().reverse().map((item) => liveChatNormalizeAttachment(item, ""))
      .filter((attachment) => normalizeText(attachment.url));
    const media = liveChatUniqueAttachments([
      ...messageAttachments.filter((attachment) => attachment.kind === "image" || attachment.kind === "video"),
      ...threadMedia.filter((attachment) => attachment.kind === "image" || attachment.kind === "video"),
    ]);
    const files = liveChatUniqueAttachments([
      ...messageAttachments.filter((attachment) => attachment.kind === "file"),
      ...threadMedia.filter((attachment) => attachment.kind === "file"),
    ]);
    const tags = [
      category,
      matchingOrder?.paymentMethod || matchingOrder?.paymentPartnerName,
      /cancel|return|failed/i.test(stage) ? "Priority" : "",
    ].map(normalizeText).filter(Boolean).slice(0, 4);

    return {
      id: normalizeText(thread?.threadId) || `thread-${Date.now()}`,
      sourceThreadId: normalizeText(thread?.threadId),
      lastReadAt: normalizeText(thread?.lastReadAt),
      buyerId: normalizeText(thread?.customerAccountId || thread?.accountId || thread?.customerId || thread?.userId || thread?.customerEmail),
      name: normalizeText(thread?.customerName || thread?.customerLabel || thread?.userName) || "Customer",
      initials: getInitials(thread?.customerName || thread?.customerLabel || "Customer", "CU"),
      avatar: liveChatNormalizeAssetUrl(
        thread?.customerAvatarUrl
          || thread?.customerProfileImageUrl
          || thread?.customerImageUrl
          || thread?.userAvatarUrl
          || thread?.profileImageUrl
          || thread?.avatarUrl,
      ),
      online: Boolean(
        thread?.typing?.user?.isTyping === true
        || thread?.typing?.user?.isOnline === true
        || thread?.typing?.user === true,
      ),
      lastActiveAt: normalizeText(
        thread?.customerLastActiveAt
          || thread?.customerLastOnlineAt
          || thread?.lastOnlineAt
          || thread?.typing?.user?.updatedAt
          || latestTimestamp,
      ),
      typing: thread?.typing && typeof thread.typing === "object" ? thread.typing : {},
      starred: tags.some((tag) => /priority|vip/i.test(tag)),
      unread: countUnreadCustomerChatMessages(thread),
      time: liveChatRelativeValue(latestTimestamp),
      preview: liveChatDisplayMessageText(previewMessage)
        || (String(previewMessage?.contentType || previewMessage?.mimeType || "").toLowerCase().startsWith("audio/")
          ? "Voice message"
          : previewMessage?.imageUrl || previewMessage?.mediaUrl || previewMessage?.attachmentUrl || previewMessage?.fileUrl
          ? "Sent an attachment"
          : liveChatIsPinProductMessage(latestMessage)
            ? `Pinned ${productName}`
            : `Inquiry about ${productName}`),
      about: normalizeText(thread?.productDescription) || `Customer inquiry about ${productName}.`,
      email: normalizeText(thread?.customerEmail || matchingOrder?.email),
      phone: normalizeText(thread?.customerPhone || matchingOrder?.contactNumber || matchingOrder?.clientContactNumber),
      address: normalizeText(thread?.customerAddress || matchingOrder?.address || matchingOrder?.clientAddress),
      customerSince: liveChatDateValue(
        thread?.customerCreatedAt
          || thread?.accountCreatedAt
          || customerOrders.reduce((earliest, order) => {
            const timestamp = Number(order?.createdAtEpochMs) || new Date(order?.createdAt || 0).getTime() || 0;
            return timestamp && (!earliest || timestamp < earliest) ? timestamp : earliest;
          }, 0),
        "New customer",
      ),
      totalOrders: uniqueOrders.size,
      totalSpent,
      productName,
      productImage,
      productId: normalizeText(thread?.productId),
      productDescription: normalizeText(thread?.productDescription),
      productCategory: normalizeText(thread?.productCategory),
      productOriginalPrice: Number(thread?.productOriginalPrice),
      productSalesPrice: typeof thread?.productSalesPrice === "number" ? Number(thread.productSalesPrice) : null,
      productRating: Number(thread?.productRating),
      productSold: Number(thread?.productSold),
      productPrice: Number(thread?.productSalesPrice ?? thread?.productOriginalPrice),
      productStock: Number(thread?.productStock),
      category,
      tags,
      order: matchingOrder ? {
        id: liveChatDisplayOrderId(matchingOrder?.orderId || matchingOrder?.groupId || matchingOrder?.id),
        rawId: normalizeText(matchingOrder?.orderId || matchingOrder?.groupId || matchingOrder?.id),
        productName,
        productImage,
        sku: normalizeText(matchingOrder?.sku || matchingOrder?.productSku || matchingOrder?.productSKU || matchingOrder?.variantSku),
        color: normalizeText(matchingOrder?.color || matchingOrder?.productColor || matchingOrder?.variantColor || matchingOrder?.variationName),
        quantity: Number(matchingOrder?.quantity) || 1,
        unitPrice: Number(matchingOrder?.unitPrice),
        total: Number(matchingOrder?.grandTotalAmount ?? matchingOrder?.total ?? matchingOrder?.amount),
        paymentMethod: normalizeText(matchingOrder?.paymentMethod || matchingOrder?.paymentPartnerName || matchingOrder?.payment),
        paymentStatus: Number(matchingOrder?.amountToPayAmount) > 0 ? "Pending" : "Paid",
        shippingStatus: stage,
        courier: normalizeText(matchingOrder?.courier || matchingOrder?.deliveryProvider || matchingOrder?.deliveryPartnerName),
        trackingNumber: normalizeText(matchingOrder?.trackingNumber || matchingOrder?.trackingNo),
        placedAt: liveChatDateValue(matchingOrder?.createdAt || matchingOrder?.createdAtEpochMs, "Recently"),
        expectedDelivery: normalizeText(matchingOrder?.expectedDelivery || matchingOrder?.deliveryDate) || "In progress",
        stock: Number(thread?.productStock),
      } : {
        productName,
        productImage,
        unitPrice: Number(thread?.productSalesPrice ?? thread?.productOriginalPrice),
        stock: Number(thread?.productStock),
      },
      orders: [...uniqueOrders.values()].map((rawOrder) => {
        const orderStage = liveChatOrderStageLabel(rawOrder?.stage || rawOrder?.status);
        return {
          id: liveChatDisplayOrderId(rawOrder?.orderId || rawOrder?.groupId || rawOrder?.id),
          rawId: normalizeText(rawOrder?.orderId || rawOrder?.groupId || rawOrder?.id),
          productName: normalizeText(rawOrder?.productName || thread?.productName) || productName,
          productImage: liveChatNormalizeAssetUrl(
            rawOrder?.productImageUrl
              || rawOrder?.productImage
              || rawOrder?.imageUrl
              || rawOrder?.mainImageUrl
              || productImage,
          ),
          quantity: Number(rawOrder?.quantity) || 1,
          total: Number(rawOrder?.grandTotalAmount ?? rawOrder?.total ?? rawOrder?.amount),
          paymentStatus: Number(rawOrder?.amountToPayAmount) > 0 ? "Pending" : "Paid",
          shippingStatus: orderStage,
          placedAt: liveChatDateValue(rawOrder?.createdAt || rawOrder?.createdAtEpochMs, "Recently"),
        };
      }),
      media,
      files,
      messages: storedMessages
        .filter((message) => !normalizeText(message?.source).toLowerCase().includes("pin-product"))
        .map((message) => {
          const timestamp = message?.timestamp || message?.createdAt || message?.sentAt;
          const imageUrls = Array.isArray(message?.imageUrls)
            ? message.imageUrls.map((url) => normalizeText(url)).filter(Boolean)
            : [];
          const imageNames = Array.isArray(message?.imageNames) ? message.imageNames : [];
          const attachment = liveChatNormalizeAttachment({
            url: message?.imageUrl || message?.mediaUrl || message?.attachmentUrl || message?.fileUrl,
            name: message?.imageName || message?.mediaName || message?.attachmentName || message?.fileName,
            contentType: message?.contentType,
            type: message?.attachmentType,
          }, liveChatTimeValue(timestamp, ""));
          const hasAttachment = normalizeText(attachment.url);
          const urlAttachments = imageUrls.length
            ? imageUrls.map((url, index) => liveChatNormalizeAttachment({
              url,
              name: imageNames[index]
                || message?.imageName
                || message?.mediaName
                || (url ? url.split("/").pop()?.split("?")[0] : ""),
              contentType: message?.contentType,
              type: message?.attachmentType || message?.contentType || "",
            }, liveChatTimeValue(timestamp, "")))
            : (hasAttachment && (attachment.kind === "image" || attachment.kind === "video" || attachment.kind === "audio")
              ? [attachment]
              : []);
          const splitFromUrls = liveChatSplitMessageAttachments(urlAttachments);
          const mediaFromUrls = splitFromUrls.media;
          const audioFromUrls = splitFromUrls.audio;
          const audioFromAttachment = hasAttachment && attachment.kind === "audio" && !imageUrls.length
            ? [attachment]
            : [];
          const audioFromMisclassifiedVideo = hasAttachment
            && attachment.kind === "video"
            && !imageUrls.length
            && (
              /^audio\//i.test(normalizeText(message?.contentType))
              || /^voice-/i.test(normalizeText(attachment.name))
              || /\/voice-/i.test(normalizeText(attachment.url))
            )
            ? [{ ...attachment, kind: "audio" }]
            : [];
          const messageAudio = liveChatUniqueAttachments([
            ...audioFromUrls,
            ...audioFromAttachment,
            ...audioFromMisclassifiedVideo,
          ]);
          return {
            id: normalizeText(message?.id),
            side: message?.isFromSupport === true ? "support" : "customer",
            text: normalizeText(message?.deletedAt)
              ? "Message deleted"
              : liveChatDisplayMessageText(message),
            media: mediaFromUrls,
            audio: messageAudio,
            files: hasAttachment && attachment.kind === "file" && !imageUrls.length
              ? [attachment]
              : splitFromUrls.files,
            replyTo: liveChatNormalizeReplyReference(message?.replyTo),
            timestamp: normalizeText(timestamp),
            time: liveChatTimeValue(timestamp, ""),
            seen: message?.isFromSupport === true,
            source: normalizeText(message?.source).toLowerCase(),
            senderRole: normalizeText(message?.senderRole || message?.sender_role).toLowerCase(),
            senderId: normalizeText(message?.senderId || message?.sender_id),
            senderName: normalizeText(
              message?.senderName
                || message?.senderDisplayName
                || message?.sender?.displayName
                || message?.sender?.name,
            ),
            senderAvatarUrl: liveChatNormalizeAssetUrl(
              message?.senderAvatarUrl
                || message?.sender_avatar_url
                || message?.sender?.avatarUrl
                || message?.sender?.profileImageUrl,
            ),
            editedAt: normalizeText(message?.editedAt),
            deletedAt: normalizeText(message?.deletedAt),
            reactionEmoji: normalizeText(message?.reactionEmoji),
          };
        }),
      agentHandoff: liveChatNormalizeAgentHandoff(thread?.agentHandoff),
      assignedEmployees: liveChatNormalizeAssignedEmployees(thread?.assignedEmployees).slice(0, 1),
      rawThread: thread,
    };
  }

  function liveChatGetTypingActor(conversation, actor) {
    const normalizedActor = String(actor || "").trim().toLowerCase();
    const typing = conversation?.typing && typeof conversation.typing === "object"
      ? conversation.typing
      : (conversation?.rawThread?.typing && typeof conversation.rawThread.typing === "object"
        ? conversation.rawThread.typing
        : {});
    const entry = typing[normalizedActor];
    if (!entry || entry.isTyping !== true) {
      return null;
    }
    const updatedAt = new Date(entry.updatedAt);
    if (Number.isNaN(updatedAt.getTime())) {
      return null;
    }
    if (Date.now() - updatedAt.getTime() > LIVE_CHAT_TYPING_ACTIVE_WINDOW_MS) {
      return null;
    }
    return entry;
  }

  function liveChatIsCustomerTyping(conversation) {
    return Boolean(liveChatGetTypingActor(conversation, "user"));
  }

  function liveChatTypingActorSignature(entry) {
    if (!entry || entry.isTyping !== true) {
      return "";
    }
    return `${normalizeText(entry.updatedAt)}|${normalizeText(entry.displayName)}|1`;
  }

  function liveChatConversationParticipantCount(conversation) {
    return liveChatParticipantsFor(conversation).length;
  }

  function liveChatConversationStatusLabel(conversation) {
    const count = liveChatConversationParticipantCount(conversation);
    if (count === 1) {
      return "1 participant";
    }
    return `${count} participants`;
  }

  function liveChatConversationNameMarkup(conversation) {
    const onlineDot = conversation?.online
      ? `<span class="lcx-conversation__online-dot" aria-label="Online"></span>`
      : "";
    return `<span class="lcx-conversation__name">${liveChatEscape(conversation?.name || "Customer")}</span>${onlineDot}`;
  }

  function liveChatSyncConversationHeaderIdentity(conversation) {
    if (!conversation) {
      return;
    }
    const title = elements.liveChatMount?.querySelector(".lcx-conversation__identity h2");
    const status = elements.liveChatMount?.querySelector("[data-lcx-conversation-status]");
    if (title instanceof HTMLElement) {
      title.innerHTML = liveChatConversationNameMarkup(conversation);
    }
    if (status instanceof HTMLElement) {
      status.textContent = liveChatConversationStatusLabel(conversation);
      status.classList.remove("is-typing");
    }
  }

  function liveChatTypingIndicatorMarkup(conversation) {
    if (!liveChatIsCustomerTyping(conversation)) {
      return "";
    }
    const name = normalizeText(conversation?.name) || "Customer";
    const buyerPerson = liveChatBuyerParticipantPerson(conversation);
    return `
      <article class="lcx-message is-customer is-typing" data-lcx-typing-indicator aria-live="polite" aria-label="${liveChatEscape(name)} is typing">
        ${buyerPerson ? liveChatAvatar(buyerPerson, "lcx-avatar--message") : ""}
        <div class="lcx-message__stack">
          <div class="lcx-message__bubble-row">
            <div class="lcx-typing-bubble" title="${liveChatEscape(name)} is typing">
              <span class="lcx-typing-dot"></span>
              <span class="lcx-typing-dot"></span>
              <span class="lcx-typing-dot"></span>
            </div>
          </div>
        </div>
      </article>`;
  }

  function liveChatIsEmojiOnlyText(value) {
    const normalizedText = String(value || "").trim();
    if (!normalizedText) {
      return false;
    }
    const compactText = normalizedText.replace(/\s+/g, "");
    try {
      return (
        /[\p{Extended_Pictographic}\p{Regional_Indicator}]/u.test(compactText)
        && /^(?:\p{Extended_Pictographic}|\p{Regional_Indicator}|\uFE0F|\u200D|\u{1F3FB}|\u{1F3FC}|\u{1F3FD}|\u{1F3FE}|\u{1F3FF})+$/u.test(compactText)
      );
    } catch (_) {
      return /^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\uFE0F\u200D]+$/u.test(compactText);
    }
  }

  function liveChatNormalizeEmojiText(value) {
    return String(value || "").replace(/\uFE0F/g, "").replace(/\u200D/g, "").trim();
  }

  function liveChatSplitEmojiSequence(value) {
    const compactText = String(value || "").trim().replace(/\s+/g, "");
    if (!compactText) {
      return [];
    }
    try {
      if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
        return [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(compactText)]
          .map((part) => part.segment)
          .filter(Boolean);
      }
    } catch (_) {
    }
    const segments = compactText.match(
      /(?:\p{Regional_Indicator}{2})|(?:\p{Extended_Pictographic}(?:[\uFE0F\u200D\u20E3]|\p{Extended_Pictographic}|[\u{1F3FB}-\u{1F3FF}])*)/gu,
    );
    return segments && segments.length ? segments : [compactText];
  }

  function liveChatEmojiOnlyContentMarkup(text, keyPrefix, options = {}) {
    const variant = options.variant || "message";
    const trimmedText = normalizeText(text);
    if (!trimmedText) {
      return variant === "state"
        ? `<p class="lcx-reply-state__preview"></p>`
        : variant === "quote"
          ? `<span class="lcx-message__reply-quote"></span>`
          : "";
    }
    const segments = liveChatSplitEmojiSequence(trimmedText);
    if (!segments.length) {
      return variant === "message"
        ? `<p class="lcx-message__emoji-text">${liveChatEscape(trimmedText)}</p>`
        : `<span class="lcx-message__emoji-text">${liveChatEscape(trimmedText)}</span>`;
    }
    const safeKey = normalizeText(keyPrefix).replace(/[^a-zA-Z0-9_-]/g, "") || "emoji";
    const lottieClass = variant === "state"
      ? "lcx-message__emoji-lottie lcx-reply-state__emoji-lottie"
      : variant === "quote"
        ? "lcx-message__emoji-lottie lcx-message__reply-emoji-lottie"
        : "lcx-message__emoji-lottie";
    const textClass = variant === "message"
      ? "lcx-message__emoji-text lcx-message__emoji-text--animated"
      : "lcx-message__emoji-text lcx-message__emoji-text--animated lcx-message__emoji-text--compact";
    const cells = segments.map((segment, index) => {
      const emojiOption = liveChatFindEmojiOption(segment);
      if (emojiOption) {
        const lottieKey = variant === "message"
          ? `msg-${safeKey}-${index}`
          : `reply-${variant}-${safeKey}-${index}`;
        return `<span
          class="${lottieClass}"
          data-lcx-lottie-emoji
          data-lcx-lottie-key="${lottieKey}"
          data-lcx-lottie-path="${liveChatEscape(emojiOption.assetPath)}"
          data-lcx-lottie-loop="true"
          aria-label="${liveChatEscape(segment)}"
        ></span>`;
      }
      return `<span class="${textClass}" aria-label="${liveChatEscape(segment)}">${liveChatEscape(segment)}</span>`;
    }).join("");
    const rowClass = variant === "message"
      ? "lcx-message__emoji-row"
      : "lcx-message__emoji-row lcx-message__emoji-row--compact";
    const rowMarkup = `<span class="${rowClass}" aria-label="${liveChatEscape(trimmedText)}">${cells}</span>`;
    if (variant === "state") {
      return `<div class="lcx-reply-state__preview lcx-reply-state__preview--emoji">${rowMarkup}</div>`;
    }
    if (variant === "quote") {
      return `<span class="lcx-message__reply-quote lcx-message__reply-quote--emoji">${rowMarkup}</span>`;
    }
    return rowMarkup;
  }

  function liveChatFindEmojiOption(value) {
    const normalizedText = liveChatNormalizeEmojiText(value);
    if (!normalizedText) {
      return null;
    }
    return LIVE_CHAT_CHOOSER_EMOJI_OPTIONS.find(
      (option) => liveChatNormalizeEmojiText(option.emoji) === normalizedText,
    ) || null;
  }

  function liveChatEmojiAssetUrl(assetPath) {
    const normalizedPath = String(assetPath || "").replace(/^assets\//, "");
    return `/assets/animations/${normalizedPath.replace(/^animations\//, "")}`;
  }

  function liveChatEnsureLottiePlayer() {
    if (window.lottie?.loadAnimation) {
      return Promise.resolve(true);
    }
    if (liveChatLottieLoadPromise) {
      return liveChatLottieLoadPromise;
    }
    liveChatLottieLoadPromise = new Promise((resolve) => {
      const existingScript = document.querySelector(
        `script[src$="${LIVE_CHAT_LOTTIE_PLAYER_URL}"], script[src*="${LIVE_CHAT_LOTTIE_PLAYER_URL}?"]`,
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
      scriptElement.src = LIVE_CHAT_LOTTIE_PLAYER_URL;
      scriptElement.async = true;
      scriptElement.addEventListener("load", () => resolve(Boolean(window.lottie?.loadAnimation)), { once: true });
      scriptElement.addEventListener("error", () => resolve(false), { once: true });
      document.head.appendChild(scriptElement);
    });
    return liveChatLottieLoadPromise;
  }

  function liveChatDestroyPickerEmojiLotties() {
    [...liveChatEmojiLottieInstances.entries()].forEach(([key, animation]) => {
      if (!key.startsWith("picker-")) {
        return;
      }
      if (animation?.destroy) {
        animation.destroy();
      }
      liveChatEmojiLottieInstances.delete(key);
    });
    elements.liveChatMount?.querySelectorAll("[data-lcx-lottie-key^='picker-']").forEach((target) => {
      if (target instanceof HTMLElement) {
        target.textContent = "";
        target.removeAttribute("data-lcx-lottie-mounted");
      }
    });
    elements.liveChatMount?.querySelector("[data-lcx-emoji-picker-grid]")?.classList.remove("is-loading");
    elements.liveChatMount?.querySelector("[data-lcx-emoji-picker-loading]")?.remove();
  }

  function liveChatDestroyMessageEmojiLotties() {
    [...liveChatEmojiLottieInstances.entries()].forEach(([key, animation]) => {
      if (!key.startsWith("msg-") && !key.startsWith("reaction-chip-") && !key.startsWith("reply-")) {
        return;
      }
      if (animation?.destroy) {
        animation.destroy();
      }
      liveChatEmojiLottieInstances.delete(key);
    });
    elements.liveChatMount?.querySelectorAll(
      "[data-lcx-lottie-key^='msg-'], [data-lcx-lottie-key^='reaction-chip-'], [data-lcx-lottie-key^='reply-']",
    ).forEach((target) => {
      if (target instanceof HTMLElement) {
        target.textContent = "";
        target.removeAttribute("data-lcx-lottie-mounted");
      }
    });
  }

  function liveChatResolveLottiePreviewProgress(target, assetPath) {
    const explicit = Number(target.dataset.lcxLottieProgress);
    if (Number.isFinite(explicit) && explicit >= 0 && explicit <= 1) {
      return explicit;
    }
    const normalizedPath = normalizeText(assetPath);
    const chooserOption = LIVE_CHAT_CHOOSER_EMOJI_OPTIONS.find(
      (option) => normalizeText(option.assetPath) === normalizedPath,
    );
    if (chooserOption && Number.isFinite(chooserOption.previewProgress)) {
      return chooserOption.previewProgress;
    }
    return 0.35;
  }

  function liveChatMountLottieTarget(target, key) {
    const assetPath = normalizeText(target.dataset.lcxLottiePath);
    if (!assetPath || target.dataset.lcxLottieMounted === "true") {
      return null;
    }
    const shouldLoop = target.dataset.lcxLottieLoop !== "false";
    const previewProgress = liveChatResolveLottiePreviewProgress(target, assetPath);
    target.textContent = "";
    const animation = window.lottie.loadAnimation({
      container: target,
      renderer: "svg",
      loop: shouldLoop,
      autoplay: false,
      path: liveChatEmojiAssetUrl(assetPath),
    });
    const startAnimation = () => {
      const totalFrames = Number(animation.totalFrames) || 0;
      if (totalFrames > 0) {
        animation.goToAndStop(Math.floor(totalFrames * previewProgress), true);
      }
      if (shouldLoop) {
        animation.play();
      }
    };
    animation.addEventListener("DOMLoaded", startAnimation);
    if (animation.isLoaded) {
      startAnimation();
    }
    target.dataset.lcxLottieMounted = "true";
    liveChatEmojiLottieInstances.set(key, animation);
    return animation;
  }

  async function liveChatMountPickerEmojiLotties() {
    if (!liveChatRedesignState.emojiPickerOpen) {
      return;
    }
    const mount = elements.liveChatMount;
    if (!(mount instanceof HTMLElement)) {
      return;
    }
    const grid = mount.querySelector("[data-lcx-emoji-picker-grid]");
    const targets = [...mount.querySelectorAll("[data-lcx-lottie-key^='picker-']")];
    if (!(grid instanceof HTMLElement) || !targets.length) {
      return;
    }
    liveChatDestroyPickerEmojiLotties();
    grid.classList.add("is-loading");
    if (!grid.querySelector("[data-lcx-emoji-picker-loading]")) {
      grid.insertAdjacentHTML("afterbegin", '<p class="lcx-emoji-picker__loading" data-lcx-emoji-picker-loading>Loading emojis...</p>');
    }
    const ready = await liveChatEnsureLottiePlayer();
    if (!ready || !liveChatRedesignState.emojiPickerOpen) {
      grid.classList.remove("is-loading");
      grid.querySelector("[data-lcx-emoji-picker-loading]")?.remove();
      return;
    }
    targets.forEach((target) => {
      if (!(target instanceof HTMLElement)) {
        return;
      }
      const key = normalizeText(target.dataset.lcxLottieKey);
      if (!key) {
        return;
      }
      liveChatMountLottieTarget(target, key);
    });
    grid.classList.remove("is-loading");
    grid.querySelector("[data-lcx-emoji-picker-loading]")?.remove();
  }

  async function liveChatMountMessageEmojiLotties() {
    const mount = elements.liveChatMount;
    if (!(mount instanceof HTMLElement)) {
      return;
    }
    const targets = [
      ...mount.querySelectorAll("[data-lcx-lottie-key^='msg-']"),
      ...mount.querySelectorAll("[data-lcx-lottie-key^='reaction-chip-']"),
      ...mount.querySelectorAll("[data-lcx-lottie-key^='reply-']"),
    ];
    if (!targets.length) {
      liveChatDestroyMessageEmojiLotties();
      return;
    }
    const ready = await liveChatEnsureLottiePlayer();
    if (!ready) {
      return;
    }
    const activeKeys = new Set();
    targets.forEach((target) => {
      if (!(target instanceof HTMLElement)) {
        return;
      }
      const key = normalizeText(target.dataset.lcxLottieKey);
      if (key) {
        activeKeys.add(key);
      }
    });
    [...liveChatEmojiLottieInstances.entries()].forEach(([key, animation]) => {
      if (!key.startsWith("msg-") && !key.startsWith("reaction-chip-") && !key.startsWith("reply-")) {
        return;
      }
      if (activeKeys.has(key)) {
        return;
      }
      if (animation?.destroy) {
        animation.destroy();
      }
      liveChatEmojiLottieInstances.delete(key);
    });
    targets.forEach((target) => {
      if (!(target instanceof HTMLElement)) {
        return;
      }
      const key = normalizeText(target.dataset.lcxLottieKey);
      if (!key || target.dataset.lcxLottieMounted === "true") {
        return;
      }
      liveChatMountLottieTarget(target, key);
    });
  }

  function liveChatFindReactionOption(value) {
    return liveChatFindEmojiOption(value)
      || LIVE_CHAT_REACTION_EMOJI_OPTIONS.find(
        (option) => liveChatNormalizeEmojiText(option.emoji) === liveChatNormalizeEmojiText(value),
      )
      || null;
  }

  function liveChatTranslateActionMarkup(messageIndex) {
    return `<button
      type="button"
      class="lcx-message__translate-action"
      data-lcx-action="translate-message"
      data-lcx-message-index="${liveChatEscape(messageIndex)}"
      aria-label="Translate message"
      title="Translate"
    >${liveChatIcon("translate", 18)}</button>`;
  }

  function liveChatReactActionMarkup(messageIndex, reactionEmoji, messageId) {
    const normalizedReaction = normalizeText(reactionEmoji);
    const reactionOption = normalizedReaction ? liveChatFindReactionOption(normalizedReaction) : null;
    const hasReaction = Boolean(normalizedReaction);
    const iconMarkup = hasReaction
      ? (reactionOption
        ? `<span
            class="lcx-message__reaction-lottie"
            data-lcx-lottie-emoji
            data-lcx-lottie-key="reaction-chip-${liveChatEscape(messageId)}"
            data-lcx-lottie-path="${liveChatEscape(reactionOption.assetPath)}"
            data-lcx-lottie-loop="true"
            aria-hidden="true"
          ></span>`
        : `<span class="lcx-message__reaction-text">${liveChatEscape(normalizedReaction)}</span>`)
      : liveChatIcon("smile", 18);
    return `<button
      type="button"
      class="lcx-message__react-action${hasReaction ? " has-reaction" : ""}"
      data-lcx-action="react-message"
      data-lcx-message-index="${liveChatEscape(messageIndex)}"
      aria-label="${hasReaction ? `Change reaction ${liveChatEscape(normalizedReaction)}` : "React to this message"}"
      title="${hasReaction ? "Change reaction" : "React"}"
    >${iconMarkup}</button>`;
  }

  function liveChatDestroyReactionPickerLotties() {
    [...liveChatEmojiLottieInstances.entries()].forEach(([key, animation]) => {
      if (!key.startsWith("reaction-picker-")) {
        return;
      }
      if (animation?.destroy) {
        animation.destroy();
      }
      liveChatEmojiLottieInstances.delete(key);
    });
    elements.liveChatMount?.querySelectorAll("[data-lcx-lottie-key^='reaction-picker-']").forEach((target) => {
      if (target instanceof HTMLElement) {
        target.textContent = "";
        target.removeAttribute("data-lcx-lottie-mounted");
      }
    });
  }

  function liveChatCloseReactionPicker() {
    liveChatRedesignState.reactionPicker = null;
    const backdrop = elements.liveChatMount?.querySelector("[data-lcx-reaction-backdrop]");
    const picker = elements.liveChatMount?.querySelector("[data-lcx-reaction-picker]");
    if (backdrop instanceof HTMLElement) {
      backdrop.hidden = true;
    }
    if (picker instanceof HTMLElement) {
      picker.hidden = true;
    }
    liveChatDestroyReactionPickerLotties();
  }

  async function liveChatMountReactionPickerLotties() {
    if (!liveChatRedesignState.reactionPicker) {
      return;
    }
    const mount = elements.liveChatMount;
    const picker = mount?.querySelector("[data-lcx-reaction-picker]");
    if (!(picker instanceof HTMLElement)) {
      return;
    }
    liveChatDestroyReactionPickerLotties();
    const ready = await liveChatEnsureLottiePlayer();
    if (!ready || !liveChatRedesignState.reactionPicker) {
      return;
    }
    picker.querySelectorAll("[data-lcx-lottie-key^='reaction-picker-']").forEach((target) => {
      if (!(target instanceof HTMLElement)) {
        return;
      }
      const key = normalizeText(target.dataset.lcxLottieKey);
      if (!key) {
        return;
      }
      liveChatMountLottieTarget(target, key);
    });
  }

  function liveChatSyncReactionPickerPosition() {
    const pickerState = liveChatRedesignState.reactionPicker;
    const picker = elements.liveChatMount?.querySelector("[data-lcx-reaction-picker]");
    if (!pickerState || !(picker instanceof HTMLElement)) {
      return;
    }
    const messageEl = elements.liveChatMount?.querySelector(
      `[data-lcx-message-index="${CSS.escape(String(pickerState.messageIndex))}"]`,
    );
    if (!(messageEl instanceof HTMLElement)) {
      liveChatCloseReactionPicker();
      return;
    }
    const reactButton = messageEl.querySelector("[data-lcx-action='react-message']");
    const bubbleRow = messageEl.querySelector(".lcx-message__bubble-row");
    const anchor = reactButton instanceof HTMLElement
      ? reactButton
      : (bubbleRow instanceof HTMLElement ? bubbleRow : messageEl);
    const anchorRect = anchor.getBoundingClientRect();
    const board = elements.liveChatMount?.querySelector("[data-lcx-board]");
    const boardRect = board instanceof HTMLElement ? board.getBoundingClientRect() : anchorRect;
    const pickerWidth = 248;
    const pickerHeight = 58;
    const padding = 10;
    let left = anchorRect.left - boardRect.left + (anchorRect.width / 2) - (pickerWidth / 2);
    const maxLeft = boardRect.width - pickerWidth - padding;
    left = Math.max(padding, Math.min(left, maxLeft));
    let top = anchorRect.top - boardRect.top - pickerHeight - 10;
    if (top < padding) {
      top = anchorRect.bottom - boardRect.top + 8;
    }
    picker.style.left = `${left}px`;
    picker.style.top = `${top}px`;
  }

  function liveChatOpenReactionPicker(messageIndex) {
    const active = liveChatGetActive();
    const messages = Array.isArray(active?.messages) ? active.messages : [];
    const message = messages[Number(messageIndex)];
    if (!active || !message || normalizeText(message.deletedAt)) {
      return;
    }
    const messageId = normalizeText(message.id);
    if (!messageId) {
      return;
    }
    liveChatCloseMessageContextMenu();
    liveChatSetEmojiPickerOpen(false);
    liveChatRedesignState.reactionPicker = {
      messageIndex: Number(messageIndex),
      messageId,
      currentReaction: normalizeText(message.reactionEmoji),
    };
    const backdrop = elements.liveChatMount?.querySelector("[data-lcx-reaction-backdrop]");
    const picker = elements.liveChatMount?.querySelector("[data-lcx-reaction-picker]");
    if (backdrop instanceof HTMLElement) {
      backdrop.hidden = false;
    }
    if (picker instanceof HTMLElement) {
      picker.hidden = false;
      picker.querySelectorAll("[data-lcx-reaction-item]").forEach((button) => {
        if (!(button instanceof HTMLElement)) {
          return;
        }
        const emoji = normalizeText(button.dataset.lcxReactionEmoji);
        button.classList.toggle(
          "is-selected",
          emoji && emoji === liveChatRedesignState.reactionPicker.currentReaction,
        );
      });
    }
    liveChatSyncReactionPickerPosition();
    void liveChatMountReactionPickerLotties();
  }

  function liveChatReactionPickerMarkup() {
    return `
      <div class="lcx-reaction-picker-backdrop" data-lcx-reaction-backdrop data-lcx-action="close-reaction-picker" hidden aria-hidden="true"></div>
      <div class="lcx-reaction-picker" data-lcx-reaction-picker role="dialog" aria-label="React to message" hidden>
        ${LIVE_CHAT_REACTION_EMOJI_OPTIONS.map((option, index) => `
          <button
            type="button"
            class="lcx-reaction-picker__item"
            data-lcx-reaction-item
            data-lcx-action="pick-reaction"
            data-lcx-reaction-emoji="${liveChatEscape(option.emoji)}"
            aria-label="React with ${liveChatEscape(option.emoji)}"
          ><span
            class="lcx-reaction-picker__lottie"
            data-lcx-lottie-emoji
            data-lcx-lottie-key="reaction-picker-${index}"
            data-lcx-lottie-path="${liveChatEscape(option.assetPath)}"
            data-lcx-lottie-loop="true"
            aria-hidden="true"
          ></span></button>
        `).join("")}
      </div>`;
  }

  async function liveChatPostReaction(conversation, messageId, reactionEmoji) {
    const threadId = normalizeText(conversation?.sourceThreadId);
    if (!threadId || !messageId) {
      return null;
    }
    const response = await fetch(`/api/chat-support/${encodeURIComponent(threadId)}/react-message`, {
      method: "POST",
      headers: liveChatApiHeaders({
        Accept: "application/json",
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        messageId,
        reactionEmoji,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.message || "Unable to react to this message.");
    }
    return data;
  }

  async function liveChatApplyReaction(messageIndex, reactionEmoji) {
    const active = liveChatGetActive();
    const messages = Array.isArray(active?.messages) ? active.messages : [];
    const message = messages[Number(messageIndex)];
    if (!active || !message) {
      return;
    }
    const messageId = normalizeText(message.id);
    if (!messageId) {
      return;
    }
    liveChatCloseReactionPicker();
    try {
      if (active.sourceThreadId) {
        await liveChatPostReaction(active, messageId, reactionEmoji);
        await liveChatLoadRemoteData();
      } else {
        const currentReaction = normalizeText(message.reactionEmoji);
        message.reactionEmoji = currentReaction === normalizeText(reactionEmoji) ? "" : normalizeText(reactionEmoji);
      }
      liveChatRenderBoard();
    } catch (error) {
      liveChatShowToast(error?.message || "Unable to react to this message.");
    }
  }

  function liveChatEmojiPickerMarkup() {
    return `
      <div class="lcx-emoji-picker${liveChatRedesignState.emojiPickerOpen ? " is-open" : ""}" data-lcx-emoji-picker ${liveChatRedesignState.emojiPickerOpen ? "" : "hidden"}>
        <header class="lcx-emoji-picker__head">
          <strong>Choose emoji</strong>
          <button type="button" class="lcx-emoji-picker__close" data-lcx-action="close-emoji-picker" aria-label="Close emoji picker">${liveChatIcon("close", 14)}</button>
        </header>
        <div class="lcx-emoji-picker__grid" data-lcx-emoji-picker-grid role="listbox" aria-label="Emoji list">
          ${LIVE_CHAT_CHOOSER_EMOJI_OPTIONS.map((option, index) => `
            <button
              type="button"
              class="lcx-emoji-picker__item"
              data-lcx-action="pick-emoji"
              data-lcx-emoji="${liveChatEscape(option.emoji)}"
              role="option"
              aria-label="Add ${liveChatEscape(option.emoji)}"
            ><span
              class="lcx-emoji-picker__lottie"
              data-lcx-lottie-emoji
              data-lcx-lottie-key="picker-${index}"
              data-lcx-lottie-path="${liveChatEscape(option.assetPath)}"
              data-lcx-lottie-loop="true"
              ${Number.isFinite(option.previewProgress) ? `data-lcx-lottie-progress="${option.previewProgress}"` : ""}
              aria-hidden="true"
            ></span></button>
          `).join("")}
        </div>
      </div>`;
  }

  function liveChatSetEmojiPickerOpen(open) {
    liveChatRedesignState.emojiPickerOpen = Boolean(open);
    const picker = elements.liveChatMount?.querySelector("[data-lcx-emoji-picker]");
    const trigger = elements.liveChatMount?.querySelector("[data-lcx-action='emoji']");
    if (picker instanceof HTMLElement) {
      picker.classList.toggle("is-open", liveChatRedesignState.emojiPickerOpen);
      picker.hidden = !liveChatRedesignState.emojiPickerOpen;
    }
    if (trigger instanceof HTMLElement) {
      trigger.classList.toggle("is-active", liveChatRedesignState.emojiPickerOpen);
      trigger.setAttribute("aria-expanded", liveChatRedesignState.emojiPickerOpen ? "true" : "false");
    }
    if (liveChatRedesignState.emojiPickerOpen) {
      void liveChatMountPickerEmojiLotties();
    } else {
      liveChatDestroyPickerEmojiLotties();
    }
  }

  function liveChatSyncSendButtonState() {
    const send = elements.liveChatMount?.querySelector("[data-lcx-send]");
    const input = elements.liveChatMount?.querySelector("[data-lcx-message-input]");
    const active = liveChatGetActive();
    const hasText = input instanceof HTMLTextAreaElement && Boolean(normalizeText(input.value));
    const hasAudioPreview = liveChatAudioSession.mode === "preview" && Boolean(liveChatAudioSession.blob);
    const hasPendingAttachments = liveChatPendingAttachmentsFor(active).length > 0;
    send?.classList.toggle("has-text", hasText || hasAudioPreview || hasPendingAttachments);
    send?.classList.toggle("has-audio-preview", hasAudioPreview);
  }

  const LIVE_CHAT_COMPOSER_LINE_HEIGHT = 22;
  const LIVE_CHAT_COMPOSER_MAX_LINES = 10;

  function liveChatSyncComposerTextareaHeight(input = null) {
    const textarea = input instanceof HTMLTextAreaElement
      ? input
      : elements.liveChatMount?.querySelector("[data-lcx-message-input]");
    if (!(textarea instanceof HTMLTextAreaElement)) {
      return;
    }
    const maxHeight = LIVE_CHAT_COMPOSER_LINE_HEIGHT * LIVE_CHAT_COMPOSER_MAX_LINES;
    textarea.style.height = `${LIVE_CHAT_COMPOSER_LINE_HEIGHT}px`;
    textarea.style.overflowY = "hidden";
    const scrollHeight = textarea.scrollHeight;
    const nextHeight = Math.min(
      Math.max(scrollHeight, LIVE_CHAT_COMPOSER_LINE_HEIGHT),
      maxHeight,
    );
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = scrollHeight > maxHeight ? "auto" : "hidden";
  }

  function liveChatFormatAudioDuration(ms) {
    const totalSec = Math.max(0, Math.floor(Number(ms) / 1000));
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${String(sec).padStart(2, "0")}`;
  }

  function liveChatGetSupportedAudioMimeType() {
    if (typeof MediaRecorder === "undefined") {
      return "";
    }
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/mp4",
    ];
    return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || "";
  }

  function liveChatAudioFileExtension(mimeType) {
    const type = String(mimeType || "").toLowerCase();
    if (type.includes("ogg")) {
      return "ogg";
    }
    if (type.includes("mp4")) {
      return "m4a";
    }
    if (type.includes("mpeg")) {
      return "mp3";
    }
    if (type.includes("wav")) {
      return "wav";
    }
    return "webm";
  }

  function liveChatAudioWaveBarsMarkup(options = {}) {
    const count = Number(options.count) || 36;
    const barClass = options.barClass || "lcx-audio-wave__bar";
    const animated = options.animated !== false;
    const seed = Number(options.seed) || 0;
    return Array.from({ length: count }, (_, index) => {
      const pseudoRandom = Math.abs(Math.sin((index + 1) * 1.65 + seed * 0.17));
      const height = 5 + Math.round(pseudoRandom * 18);
      const delay = (index % 8) * 0.07;
      return `<span class="${barClass}${animated ? " is-animated" : ""}" style="--lcx-audio-bar-height:${height}px;--lcx-audio-bar-delay:${delay}s"></span>`;
    }).join("");
  }

  function liveChatSyncAudioWaveProgress(container, audio, barSelector = ".lcx-audio-wave__bar") {
    const waves = container?.querySelector?.("[data-lcx-audio-waves]");
    if (!(waves instanceof HTMLElement)) {
      return;
    }
    const bars = waves.querySelectorAll(barSelector);
    const ratio = audio instanceof HTMLAudioElement
      && Number.isFinite(audio.duration)
      && audio.duration > 0
      ? Math.min(1, audio.currentTime / audio.duration)
      : 0;
    const isPlaying = audio instanceof HTMLAudioElement && !audio.paused && !audio.ended;
    bars.forEach((bar, index) => {
      bar.classList.toggle("is-active", isPlaying && (index + 1) / bars.length <= ratio);
    });
  }

  let liveChatActiveMessageAudio = null;
  let liveChatAudioStartRequestId = 0;

  function liveChatSyncMessageAudioShellUi(shell, isPlaying) {
    if (!(shell instanceof HTMLElement)) {
      return;
    }
    shell.classList.toggle("is-playing", Boolean(isPlaying));
    const playIcon = shell.querySelector("[data-lcx-message-audio-play-icon]");
    const pauseIcon = shell.querySelector("[data-lcx-message-audio-pause-icon]");
    if (playIcon instanceof HTMLElement && pauseIcon instanceof HTMLElement) {
      playIcon.hidden = Boolean(isPlaying);
      pauseIcon.hidden = !isPlaying;
    }
  }

  function liveChatMessageAudioBubbleMarkup(source, label, support, metaMarkup = "") {
    const seed = normalizeText(source).length;
    return `
      <div class="lcx-message-audio-bubble${support ? " is-support" : " is-customer"}" data-lcx-message-audio>
        <button type="button" class="lcx-message-audio-bubble__play" data-lcx-action="toggle-message-audio" aria-label="Play voice message">
          <span class="lcx-message-audio-bubble__play-icon" data-lcx-message-audio-play-icon>${liveChatIcon("play", 18)}</span>
          <span class="lcx-message-audio-bubble__play-icon" data-lcx-message-audio-pause-icon hidden>${liveChatIcon("pause", 18)}</span>
        </button>
        <button
          type="button"
          class="lcx-message-audio-bubble__track"
          data-lcx-action="toggle-message-audio"
          aria-label="Play voice message"
        >
          <div class="lcx-message-audio-bubble__waves" data-lcx-audio-waves aria-hidden="true">${liveChatAudioWaveBarsMarkup({
            count: 44,
            barClass: "lcx-message-audio-bubble__bar",
            animated: true,
            seed,
          })}</div>
          <span class="lcx-message-audio-bubble__time" data-lcx-message-audio-time>0:00</span>
        </button>
        ${metaMarkup}
        <audio class="lcx-message-audio-bubble__source is-lazy-pending" data-lcx-lazy-src="${liveChatEscape(source)}" data-lcx-lazy-kind="audio" data-lcx-lazy-policy="tap" preload="none" aria-label="${label}"></audio>
      </div>`;
  }

  function liveChatInitMessageAudioPlayers() {
    const mount = elements.liveChatMount;
    if (!(mount instanceof HTMLElement)) {
      return;
    }
    mount.querySelectorAll("[data-lcx-message-audio]").forEach((shell) => {
      if (!(shell instanceof HTMLElement) || shell.dataset.lcxAudioBound === "true") {
        return;
      }
      const audio = shell.querySelector(".lcx-message-audio-bubble__source");
      const timeEl = shell.querySelector("[data-lcx-message-audio-time]");
      if (!(audio instanceof HTMLAudioElement) || !(timeEl instanceof HTMLElement)) {
        return;
      }
      shell.dataset.lcxAudioBound = "true";
      const setDurationLabel = () => {
        if (Number.isFinite(audio.duration) && audio.duration > 0) {
          timeEl.dataset.lcxAudioDurationMs = String(Math.round(audio.duration * 1000));
          if (!shell.classList.contains("is-playing")) {
            timeEl.textContent = liveChatFormatAudioDuration(audio.duration * 1000);
          }
        }
      };
      if (audio.readyState >= 1) {
        setDurationLabel();
      } else {
        audio.addEventListener("loadedmetadata", setDurationLabel, { once: true });
      }
      audio.addEventListener("timeupdate", () => {
        if (audio.paused) {
          return;
        }
        timeEl.textContent = liveChatFormatAudioDuration(audio.currentTime * 1000);
        liveChatSyncAudioWaveProgress(shell, audio, ".lcx-message-audio-bubble__bar");
      });
      audio.addEventListener("pause", () => {
        if (liveChatActiveMessageAudio === audio) {
          liveChatActiveMessageAudio = null;
        }
        liveChatSyncMessageAudioShellUi(shell, false);
        liveChatSyncAudioWaveProgress(shell, audio, ".lcx-message-audio-bubble__bar");
        const durationMs = Number(timeEl.dataset.lcxAudioDurationMs);
        if (Number.isFinite(durationMs) && durationMs > 0 && audio.currentTime <= 0.05) {
          timeEl.textContent = liveChatFormatAudioDuration(durationMs);
        }
      });
      audio.addEventListener("ended", () => {
        if (liveChatActiveMessageAudio === audio) {
          liveChatActiveMessageAudio = null;
        }
        liveChatSyncMessageAudioShellUi(shell, false);
        liveChatSyncAudioWaveProgress(shell, null, ".lcx-message-audio-bubble__bar");
        const durationMs = Number(timeEl.dataset.lcxAudioDurationMs);
        if (Number.isFinite(durationMs) && durationMs > 0) {
          timeEl.textContent = liveChatFormatAudioDuration(durationMs);
        }
      });
    });
  }

  function liveChatToggleMessageAudio(shell) {
    if (!(shell instanceof HTMLElement)) {
      return;
    }
    const audio = shell.querySelector(".lcx-message-audio-bubble__source");
    if (!(audio instanceof HTMLAudioElement)) {
      return;
    }
    if (liveChatActiveMessageAudio && liveChatActiveMessageAudio !== audio) {
      liveChatActiveMessageAudio.pause();
      liveChatActiveMessageAudio.currentTime = 0;
      const previousShell = liveChatActiveMessageAudio.closest("[data-lcx-message-audio]");
      if (previousShell instanceof HTMLElement) {
        liveChatSyncMessageAudioShellUi(previousShell, false);
        liveChatSyncAudioWaveProgress(previousShell, null, ".lcx-message-audio-bubble__bar");
      }
    }
    if (audio.paused) {
      const messageArea = shell.closest("[data-lcx-message-area]");
      liveChatActivateLazyMediaElement(audio, messageArea instanceof HTMLElement ? messageArea : null);
      void audio.play().then(() => {
        liveChatActiveMessageAudio = audio;
        liveChatSyncMessageAudioShellUi(shell, true);
      }).catch(() => {
        liveChatShowToast("Unable to play this voice message.");
      });
      return;
    }
    audio.pause();
    liveChatActiveMessageAudio = null;
    liveChatSyncMessageAudioShellUi(shell, false);
  }

  function liveChatAudioComposerMarkup() {
    return `
      <div class="lcx-audio-composer" data-lcx-audio-composer hidden>
        <div class="lcx-audio-composer__loading" data-lcx-audio-loading hidden>
          <span class="lcx-audio-composer__loader" aria-hidden="true"></span>
          <span class="lcx-audio-composer__loading-label">Preparing microphone...</span>
        </div>
        <div class="lcx-audio-composer__recording" data-lcx-audio-recording hidden>
          <div class="lcx-audio-composer__waves" data-lcx-audio-waves aria-hidden="true">${liveChatAudioWaveBarsMarkup({ count: 42, barClass: "lcx-audio-composer__bar", animated: true })}</div>
          <span class="lcx-audio-composer__time" data-lcx-audio-time>0:00</span>
          <button type="button" class="lcx-audio-composer__stop" data-lcx-action="audio-stop" aria-label="Stop recording">${liveChatIcon("square", 14)}</button>
        </div>
        <div class="lcx-audio-composer__preview" data-lcx-audio-preview hidden>
          <button type="button" class="lcx-audio-composer__play" data-lcx-action="audio-play-toggle" aria-label="Play recording">
            <span class="lcx-audio-composer__play-icon" data-lcx-audio-play-icon>${liveChatIcon("play", 20)}</span>
            <span class="lcx-audio-composer__play-icon" data-lcx-audio-pause-icon hidden>${liveChatIcon("pause", 20)}</span>
          </button>
          <div class="lcx-audio-composer__preview-track">
            <div class="lcx-audio-composer__waves" data-lcx-audio-waves aria-hidden="true">${liveChatAudioWaveBarsMarkup({ count: 42, barClass: "lcx-audio-composer__bar", animated: true })}</div>
            <span class="lcx-audio-composer__preview-time" data-lcx-audio-preview-time>0:00</span>
          </div>
          <button type="button" class="lcx-audio-composer__discard" data-lcx-action="audio-discard" aria-label="Discard recording"><span class="lcx-audio-composer__discard-icon">${liveChatIcon("trash-2", 20)}</span></button>
        </div>
      </div>`;
  }

  function liveChatStopAudioLevelAnimation() {
    if (liveChatAudioSession.levelAnimationId) {
      window.cancelAnimationFrame(liveChatAudioSession.levelAnimationId);
      liveChatAudioSession.levelAnimationId = 0;
    }
    if (liveChatAudioSession.audioContext) {
      void liveChatAudioSession.audioContext.close().catch(() => {});
      liveChatAudioSession.audioContext = null;
    }
    liveChatAudioSession.analyser = null;
  }

  function liveChatStartAudioLevelAnimation(stream) {
    liveChatStopAudioLevelAnimation();
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor || !stream) {
      return;
    }
    const mount = elements.liveChatMount;
    const waves = mount?.querySelector("[data-lcx-audio-recording] [data-lcx-audio-waves]");
    if (!(waves instanceof HTMLElement)) {
      return;
    }
    const bars = [...waves.querySelectorAll(".lcx-audio-composer__bar")];
    if (!bars.length) {
      return;
    }

    let audioContext = null;
    try {
      audioContext = new AudioContextCtor();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.72;
      source.connect(analyser);
      liveChatAudioSession.audioContext = audioContext;
      liveChatAudioSession.analyser = analyser;
      void audioContext.resume().catch(() => {});
    } catch (_) {
      if (audioContext) {
        void audioContext.close().catch(() => {});
      }
      bars.forEach((bar, index) => {
        bar.classList.add("is-animated");
        bar.style.setProperty("--lcx-audio-bar-delay", `${(index % 8) * 0.07}s`);
      });
      return;
    }

    const data = new Uint8Array(liveChatAudioSession.analyser.frequencyBinCount);
    const tick = () => {
      if (liveChatAudioSession.mode !== "recording" || !(liveChatAudioSession.analyser instanceof AnalyserNode)) {
        liveChatStopAudioLevelAnimation();
        return;
      }
      liveChatAudioSession.analyser.getByteFrequencyData(data);
      bars.forEach((bar, index) => {
        const bucket = Math.min(data.length - 1, Math.floor((index / bars.length) * data.length));
        const value = data[bucket] || 0;
        const height = 4 + Math.round((value / 255) * 24);
        bar.style.setProperty("--lcx-audio-bar-height", `${height}px`);
        bar.style.height = `${height}px`;
        bar.style.opacity = String(0.3 + (value / 255) * 0.7);
      });
      liveChatAudioSession.levelAnimationId = window.requestAnimationFrame(tick);
    };
    liveChatAudioSession.levelAnimationId = window.requestAnimationFrame(tick);
  }

  function liveChatSyncAudioComposerUi() {
    const mount = elements.liveChatMount;
    if (!(mount instanceof HTMLElement)) {
      return;
    }
    const field = mount.querySelector("[data-lcx-composer-field]");
    const input = mount.querySelector("[data-lcx-message-input]");
    const audioComposer = mount.querySelector("[data-lcx-audio-composer]");
    const loading = mount.querySelector("[data-lcx-audio-loading]");
    const recording = mount.querySelector("[data-lcx-audio-recording]");
    const preview = mount.querySelector("[data-lcx-audio-preview]");
    const micButton = mount.querySelector("[data-lcx-action='audio-record']");
    const mode = liveChatAudioSession.mode;
    const isActive = mode === "starting" || mode === "recording" || mode === "preview";

    if (field instanceof HTMLElement) {
      field.classList.toggle("is-audio-active", isActive);
      field.classList.toggle("is-audio-loading", mode === "starting");
      field.classList.toggle("is-audio-recording-live", mode === "recording");
    }
    if (input instanceof HTMLTextAreaElement) {
      input.hidden = isActive;
      input.disabled = isActive;
      input.setAttribute("aria-hidden", isActive ? "true" : "false");
    }
    if (audioComposer instanceof HTMLElement) {
      audioComposer.hidden = !isActive;
      audioComposer.classList.toggle("is-loading", mode === "starting");
      audioComposer.classList.toggle("is-recording", mode === "recording");
    }
    if (loading instanceof HTMLElement) {
      loading.hidden = mode !== "starting";
    }
    if (recording instanceof HTMLElement) {
      recording.hidden = mode !== "recording";
    }
    if (preview instanceof HTMLElement) {
      preview.hidden = mode !== "preview";
      preview.classList.toggle("is-playing", mode === "preview" && liveChatAudioSession.isPlaying);
    }
    if (micButton instanceof HTMLElement) {
      micButton.classList.toggle("is-loading", mode === "starting");
      micButton.classList.toggle("is-active", mode === "recording");
      micButton.setAttribute("aria-busy", mode === "starting" ? "true" : "false");
      micButton.setAttribute("aria-pressed", mode === "recording" ? "true" : "false");
    }

    const composer = mount.querySelector("[data-lcx-composer]");
    if (composer instanceof HTMLElement) {
      composer.classList.toggle("is-audio-recording", mode === "recording" || mode === "starting");
    }

    const send = mount.querySelector("[data-lcx-send]");
    if (send instanceof HTMLElement) {
      send.hidden = mode === "recording" || mode === "starting";
      send.setAttribute("aria-hidden", mode === "recording" || mode === "starting" ? "true" : "false");
    }

    const timeEl = mount.querySelector("[data-lcx-audio-time]");
    if (timeEl instanceof HTMLElement) {
      const elapsed = mode === "recording" && liveChatAudioSession.startedAt
        ? Date.now() - liveChatAudioSession.startedAt
        : liveChatAudioSession.durationMs;
      timeEl.textContent = liveChatFormatAudioDuration(elapsed);
    }

    const previewTimeEl = mount.querySelector("[data-lcx-audio-preview-time]");
    if (previewTimeEl instanceof HTMLElement) {
      if (liveChatAudioSession.isPlaying && liveChatAudioSession.previewAudio instanceof HTMLAudioElement) {
        previewTimeEl.textContent = liveChatFormatAudioDuration(liveChatAudioSession.previewAudio.currentTime * 1000);
      } else {
        previewTimeEl.textContent = liveChatFormatAudioDuration(liveChatAudioSession.durationMs);
      }
    }

    const playIcon = mount.querySelector("[data-lcx-audio-play-icon]");
    const pauseIcon = mount.querySelector("[data-lcx-audio-pause-icon]");
    if (playIcon instanceof HTMLElement && pauseIcon instanceof HTMLElement) {
      playIcon.hidden = liveChatAudioSession.isPlaying;
      pauseIcon.hidden = !liveChatAudioSession.isPlaying;
    }

    const previewShell = mount.querySelector("[data-lcx-audio-preview]");
    if (previewShell instanceof HTMLElement) {
      if (liveChatAudioSession.isPlaying && liveChatAudioSession.previewAudio instanceof HTMLAudioElement) {
        liveChatSyncAudioWaveProgress(previewShell, liveChatAudioSession.previewAudio, ".lcx-audio-composer__bar");
      } else {
        liveChatSyncAudioWaveProgress(previewShell, null, ".lcx-audio-composer__bar");
      }
    }

    liveChatSyncSendButtonState();
  }

  function liveChatStopAudioPreviewPlayback() {
    if (liveChatAudioSession.previewAudio instanceof HTMLAudioElement) {
      liveChatAudioSession.previewAudio.pause();
      liveChatAudioSession.previewAudio.currentTime = 0;
    }
    liveChatAudioSession.isPlaying = false;
  }

  function liveChatReleaseAudioStream() {
    if (liveChatAudioSession.stream) {
      liveChatAudioSession.stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (_) {}
      });
    }
    liveChatAudioSession.stream = null;
  }

  function liveChatResetAudioSession(options = {}) {
    liveChatAudioStartRequestId += 1;
    if (liveChatAudioSession.timerId) {
      window.clearInterval(liveChatAudioSession.timerId);
      liveChatAudioSession.timerId = 0;
    }
    liveChatStopAudioLevelAnimation();
    if (liveChatAudioSession.mediaRecorder && liveChatAudioSession.mediaRecorder.state !== "inactive") {
      try {
        liveChatAudioSession.mediaRecorder.stop();
      } catch (_) {}
    }
    liveChatStopAudioPreviewPlayback();
    liveChatReleaseAudioStream();
    if (liveChatAudioSession.objectUrl) {
      URL.revokeObjectURL(liveChatAudioSession.objectUrl);
    }
    liveChatAudioSession.mode = "idle";
    liveChatAudioSession.mediaRecorder = null;
    liveChatAudioSession.chunks = [];
    liveChatAudioSession.blob = null;
    liveChatAudioSession.objectUrl = "";
    liveChatAudioSession.mimeType = "";
    liveChatAudioSession.durationMs = 0;
    liveChatAudioSession.startedAt = 0;
    liveChatAudioSession.previewAudio = null;
    liveChatAudioSession.isPlaying = false;
    if (!options.silent) {
      liveChatSyncAudioComposerUi();
    }
  }

  function liveChatDiscardAudioRecording(options = {}) {
    liveChatResetAudioSession(options);
  }

  async function liveChatStartAudioRecording() {
    if (liveChatRedesignState.isSending) {
      return;
    }
    if (liveChatAudioSession.mode === "starting" || liveChatAudioSession.mode === "recording") {
      return;
    }
    if (liveChatAudioSession.mode === "preview") {
      liveChatResetAudioSession({ silent: true });
    }

    const mimeType = liveChatGetSupportedAudioMimeType();
    if (!mimeType || typeof navigator?.mediaDevices?.getUserMedia !== "function") {
      liveChatShowToast("Voice recording is not supported in this browser.");
      return;
    }

    liveChatSetEmojiPickerOpen(false);
    liveChatStopSupportTyping({ force: true });
    liveChatAudioSession.mode = "starting";
    liveChatSyncAudioComposerUi();
    const requestId = liveChatAudioStartRequestId;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (requestId !== liveChatAudioStartRequestId || liveChatAudioSession.mode !== "starting") {
        stream.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch (_) {}
        });
        return;
      }
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      liveChatAudioSession.stream = stream;
      liveChatAudioSession.mediaRecorder = mediaRecorder;
      liveChatAudioSession.chunks = [];
      liveChatAudioSession.mimeType = mimeType;
      liveChatAudioSession.mode = "recording";
      liveChatAudioSession.startedAt = Date.now();
      liveChatAudioSession.durationMs = 0;

      mediaRecorder.addEventListener("dataavailable", (event) => {
        if (event.data && event.data.size > 0) {
          liveChatAudioSession.chunks.push(event.data);
        }
      });

      mediaRecorder.addEventListener("stop", () => {
        liveChatStopAudioLevelAnimation();
        liveChatReleaseAudioStream();
        const blob = new Blob(liveChatAudioSession.chunks, {
          type: liveChatAudioSession.mimeType || mimeType,
        });
        if (!blob.size) {
          liveChatResetAudioSession();
          liveChatShowToast("Recording was too short.");
          return;
        }
        liveChatAudioSession.blob = blob;
        liveChatAudioSession.durationMs = Math.max(
          500,
          Date.now() - (liveChatAudioSession.startedAt || Date.now()),
        );
        if (liveChatAudioSession.objectUrl) {
          URL.revokeObjectURL(liveChatAudioSession.objectUrl);
        }
        liveChatAudioSession.objectUrl = URL.createObjectURL(blob);
        liveChatAudioSession.previewAudio = new Audio(liveChatAudioSession.objectUrl);
        liveChatAudioSession.previewAudio.addEventListener("timeupdate", () => {
          liveChatSyncAudioComposerUi();
        });
        liveChatAudioSession.previewAudio.addEventListener("ended", () => {
          liveChatAudioSession.isPlaying = false;
          liveChatSyncAudioComposerUi();
        });
        liveChatAudioSession.mode = "preview";
        liveChatAudioSession.isPlaying = false;
        liveChatAudioSession.mediaRecorder = null;
        liveChatAudioSession.chunks = [];
        if (liveChatAudioSession.timerId) {
          window.clearInterval(liveChatAudioSession.timerId);
          liveChatAudioSession.timerId = 0;
        }
        liveChatSyncAudioComposerUi();
      });

      mediaRecorder.start(250);
      liveChatStartAudioLevelAnimation(stream);
      liveChatSyncAudioComposerUi();
      liveChatAudioSession.timerId = window.setInterval(() => {
        if (liveChatAudioSession.mode !== "recording") {
          return;
        }
        liveChatSyncAudioComposerUi();
      }, 250);
    } catch (error) {
      liveChatResetAudioSession({ silent: true });
      liveChatShowToast(error?.message || "Microphone access was denied.");
    }
  }

  function liveChatStopAudioRecording() {
    if (liveChatAudioSession.mode !== "recording") {
      return;
    }
    const recorder = liveChatAudioSession.mediaRecorder;
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch (_) {
        liveChatResetAudioSession();
      }
      return;
    }
    liveChatResetAudioSession();
  }

  function liveChatToggleAudioPreviewPlayback() {
    if (liveChatAudioSession.mode !== "preview" || !(liveChatAudioSession.previewAudio instanceof HTMLAudioElement)) {
      return;
    }
    const audio = liveChatAudioSession.previewAudio;
    if (liveChatAudioSession.isPlaying) {
      audio.pause();
      liveChatAudioSession.isPlaying = false;
    } else {
      void audio.play().then(() => {
        liveChatAudioSession.isPlaying = true;
        liveChatSyncAudioComposerUi();
      }).catch(() => {
        liveChatShowToast("Unable to play this recording.");
      });
      return;
    }
    liveChatSyncAudioComposerUi();
  }

  async function liveChatSendAudioMessage() {
    const active = liveChatGetActive();
    if (!active || liveChatRedesignState.isSending) {
      return false;
    }
    if (liveChatAudioSession.mode !== "preview" || !liveChatAudioSession.blob) {
      liveChatShowToast("Record a voice message first.");
      return false;
    }

    const mimeType = liveChatAudioSession.mimeType
      || liveChatAudioSession.blob.type
      || liveChatGetSupportedAudioMimeType()
      || "audio/webm";
    const extension = liveChatAudioFileExtension(mimeType);
    const fileName = `voice-${Date.now()}.${extension}`;
    const file = new File([liveChatAudioSession.blob], fileName, { type: mimeType });
    const replyTo = liveChatBuildReplyPayload(active);
    const sentAt = new Date().toISOString();
    const actor = liveChatCurrentActor();
    const localAttachment = liveChatNormalizeAttachment({
      name: fileName,
      type: mimeType,
      contentType: mimeType,
    }, liveChatFormatCurrentTime());

    liveChatStopAudioPreviewPlayback();
    liveChatRedesignState.isSending = true;
    liveChatRedesignState.forceMessageScrollBottom = true;
    liveChatRedesignState.messageScrollPinned = true;
    liveChatRedesignState.emojiPickerOpen = false;
    liveChatResetAudioSession({ silent: true });
    liveChatRenderBoard();

    let feedback = "Voice message sent.";
    let didSend = false;
    try {
      if (typeof window.GMS_LIVE_CHAT_ON_ATTACH === "function") {
        const attachmentMessage = {
          id: `local-support-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          side: "support",
          source: "support",
          text: "",
          audio: [localAttachment],
          replyTo,
          timestamp: sentAt,
          time: liveChatFormatCurrentTime(),
          seen: true,
          ...actor,
        };
        await Promise.resolve(window.GMS_LIVE_CHAT_ON_ATTACH({ conversation: active, files: [file], message: attachmentMessage }));
      } else if (active.sourceThreadId) {
        const uploaded = await liveChatUploadAttachment(file);
        await liveChatPostReply(active, "", uploaded, replyTo);
      } else {
        active.messages = Array.isArray(active.messages) ? active.messages : [];
        active.messages.push({
          id: `local-support-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          side: "support",
          source: "support",
          text: "",
          audio: [localAttachment],
          replyTo,
          timestamp: sentAt,
          time: liveChatFormatCurrentTime(),
          seen: true,
          ...actor,
        });
        active.preview = "Voice message";
        active.time = "Just now";
      }

      if (active.sourceThreadId) {
        await liveChatLoadRemoteData();
      }
      didSend = true;
    } catch (error) {
      console.warn("Live Chat voice send failed.", error);
      feedback = error?.message || "Unable to send voice message.";
    } finally {
      if (didSend) {
        liveChatRedesignState.pendingReply = null;
      }
      liveChatRedesignState.isSending = false;
      liveChatRenderBoard();
      liveChatShowToast(feedback);
    }
    return didSend;
  }

  function liveChatInsertEmojiIntoComposer(emoji) {
    const input = elements.liveChatMount?.querySelector("[data-lcx-message-input]");
    if (!(input instanceof HTMLTextAreaElement)) {
      return;
    }
    const value = String(input.value || "");
    const start = Number.isFinite(input.selectionStart) ? input.selectionStart : value.length;
    const end = Number.isFinite(input.selectionEnd) ? input.selectionEnd : value.length;
    input.value = `${value.slice(0, start)}${emoji}${value.slice(end)}`;
    const nextCaret = start + emoji.length;
    input.focus();
    input.setSelectionRange(nextCaret, nextCaret);
    liveChatSyncSendButtonState();
    liveChatSyncSupportTypingFromComposer(input);
  }

  async function liveChatDispatchStagedAttachments(conversation, options = {}) {
    const pendingAttachments = liveChatPendingAttachmentsFor(conversation);
    if (!pendingAttachments.length) {
      return false;
    }
    const text = normalizeText(options.text);
    const replyTo = options.replyTo || null;
    const sentAt = options.sentAt || new Date().toISOString();
    const actor = options.actor || liveChatCurrentActor();
    const attachmentTime = liveChatFormatCurrentTime();
    const files = pendingAttachments.map((item) => item.file).filter(Boolean);
    const attachmentItems = pendingAttachments.map((item) => liveChatNormalizeAttachment({
      url: item.previewUrl || "",
      name: item.name,
      type: item.type,
      contentType: item.type,
      size: item.size,
    }, attachmentTime));
    const documentFiles = attachmentItems.filter((item) => item.kind === "file");
    const mediaFiles = attachmentItems.filter((item) => item.kind === "image" || item.kind === "video");
    const attachmentMessage = {
      id: `local-support-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      side: "support",
      source: "support",
      text: text || (documentFiles.length ? "" : ""),
      media: mediaFiles,
      files: documentFiles,
      replyTo,
      timestamp: sentAt,
      time: attachmentTime,
      seen: true,
      ...actor,
    };

    if (typeof window.GMS_LIVE_CHAT_ON_ATTACH === "function") {
      await Promise.resolve(window.GMS_LIVE_CHAT_ON_ATTACH({ conversation, files, message: attachmentMessage }));
    } else if (conversation.sourceThreadId) {
      const imageFiles = [];
      const videoFiles = [];
      const nonVisualFiles = [];
      files.forEach((file, index) => {
        const kind = mediaFiles[index]?.kind
          || liveChatNormalizeAttachment({ type: file?.type, name: file?.name, contentType: file?.type }).kind;
        if (kind === "image") {
          imageFiles.push(file);
        } else if (kind === "video") {
          videoFiles.push(file);
        } else {
          nonVisualFiles.push(file);
        }
      });
      const uploadedImages = [];
      for (const file of imageFiles) {
        uploadedImages.push(await liveChatUploadAttachment(file));
      }
      if (uploadedImages.length) {
        await liveChatPostReply(conversation, text, {
          imageUrls: uploadedImages.map((item) => item.imageUrl).filter(Boolean),
          imageNames: uploadedImages.map((item) => item.imageName).filter(Boolean),
          contentType: uploadedImages[0]?.contentType || "image/jpeg",
        }, replyTo);
      } else if (text) {
        await liveChatPostReply(conversation, text, null, replyTo);
      }
      for (const [index, file] of videoFiles.entries()) {
        const attachment = await liveChatUploadAttachment(file);
        await liveChatPostReply(conversation, "", attachment, !uploadedImages.length && index === 0 ? replyTo : null);
      }
      for (const [index, file] of nonVisualFiles.entries()) {
        const attachment = await liveChatUploadAttachment(file);
        await liveChatPostReply(
          conversation,
          "",
          attachment,
          !uploadedImages.length && !videoFiles.length && index === 0 ? replyTo : null,
        );
      }
    } else {
      conversation.messages = Array.isArray(conversation.messages) ? conversation.messages : [];
      conversation.files = Array.isArray(conversation.files) ? conversation.files : [];
      if (documentFiles.length) {
        conversation.files.push(...documentFiles);
      }
      conversation.messages.push(attachmentMessage);
      conversation.preview = text || `Sent ${files.length} file${files.length > 1 ? "s" : ""}`;
      conversation.time = "Just now";
      liveChatRedesignState.forceMessageScrollBottom = true;
      liveChatRedesignState.messageScrollPinned = true;
    }

    if (conversation.sourceThreadId) {
      await liveChatLoadRemoteData();
    }
    return true;
  }

  async function liveChatSendComposerText(rawText, options = {}) {
    const active = liveChatGetActive();
    const text = normalizeText(rawText);
    const pendingAttachments = liveChatPendingAttachmentsFor(active);
    const pendingEdit = liveChatPendingEditFor(active);
    if (active && !liveChatCanCurrentActorReply(active)) {
      liveChatShowToast("Only the participant who accepted the buyer's request can reply.");
      return false;
    }
    if (pendingEdit) {
      return liveChatSubmitPendingEdit(text, options);
    }
    if (!active || liveChatRedesignState.isSending) {
      return false;
    }
    if (!text && !pendingAttachments.length) {
      liveChatShowToast("Type a message to send, or add attachments.");
      return false;
    }

    liveChatRedesignState.emojiPickerOpen = false;
    liveChatStopSupportTyping({ threadId: active.sourceThreadId, force: true });
    const replyTo = liveChatBuildReplyPayload(active);
    const sentAt = new Date().toISOString();
    const actor = liveChatCurrentActor();
    liveChatRedesignState.isSending = true;
    liveChatRedesignState.forceMessageScrollBottom = true;
    liveChatRedesignState.messageScrollPinned = true;
    liveChatRenderBoard();
    let feedback = options.successMessage || (pendingAttachments.length && !text
      ? `${pendingAttachments.length} attachment${pendingAttachments.length > 1 ? "s" : ""} sent.`
      : "Reply sent successfully.");
    let didSend = false;
    try {
      if (pendingAttachments.length) {
        await liveChatDispatchStagedAttachments(active, { text, replyTo, sentAt, actor });
        didSend = true;
      } else {
        const sentMessage = {
          id: `local-support-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          side: "support",
          source: "support",
          text,
          replyTo,
          timestamp: sentAt,
          time: liveChatTimeValue(sentAt, liveChatFormatCurrentTime()),
          seen: true,
          ...actor,
        };
        if (typeof window.GMS_LIVE_CHAT_ON_SEND === "function") {
          await Promise.resolve(window.GMS_LIVE_CHAT_ON_SEND({ conversation: active, message: sentMessage }));
        } else if (active.sourceThreadId) {
          await liveChatPostReply(active, text, null, replyTo);
        }

        if (active.sourceThreadId) {
          await liveChatLoadRemoteData();
        } else {
          active.messages = Array.isArray(active.messages) ? active.messages : [];
          active.messages.push(sentMessage);
          active.preview = text;
          active.time = "Just now";
          liveChatTrackNewMessagesForAnimation(active.id, active.messages);
          liveChatRedesignState.forceMessageScrollBottom = true;
          liveChatRedesignState.messageScrollPinned = true;
        }
        didSend = true;
      }
    } catch (error) {
      console.warn("Live Chat send failed.", error);
      feedback = error?.message || "Unable to send reply.";
    } finally {
      if (didSend) {
        liveChatRedesignState.pendingReply = null;
        liveChatClearPendingAttachments(active.id);
        const input = elements.liveChatMount?.querySelector("[data-lcx-message-input]");
        if (input instanceof HTMLTextAreaElement) {
          input.value = "";
        }
      }
      liveChatRedesignState.isSending = false;
      liveChatRenderBoard();
      liveChatShowToast(feedback);
    }
    return didSend;
  }

  function liveChatHandleEmojiSelected(emoji) {
    const selected = normalizeText(emoji);
    if (!selected) {
      return;
    }
    liveChatInsertEmojiIntoComposer(selected);
    const input = elements.liveChatMount?.querySelector("[data-lcx-message-input]");
    if (input instanceof HTMLTextAreaElement) {
      liveChatSyncComposerTextareaHeight(input);
    }
  }

  function liveChatClearSupportTypingTimer() {
    if (liveChatSupportTypingClearTimeoutId) {
      window.clearTimeout(liveChatSupportTypingClearTimeoutId);
      liveChatSupportTypingClearTimeoutId = 0;
    }
  }

  async function liveChatSendSupportTypingState(threadId, isTyping, options = {}) {
    const normalizedThreadId = normalizeText(threadId);
    if (!normalizedThreadId) {
      return;
    }

    const now = Date.now();
    if (isTyping) {
      if (
        !options.force
        && liveChatSupportTypingThreadId === normalizedThreadId
        && now - liveChatSupportTypingLastSentAt < LIVE_CHAT_TYPING_REFRESH_MS
      ) {
        return;
      }
      liveChatSupportTypingThreadId = normalizedThreadId;
      liveChatSupportTypingLastSentAt = now;
    } else if (
      !options.force
      && liveChatSupportTypingThreadId !== normalizedThreadId
      && !liveChatSupportTypingLastSentAt
    ) {
      return;
    }

    if (!isTyping && liveChatSupportTypingThreadId === normalizedThreadId) {
      liveChatSupportTypingThreadId = "";
      liveChatSupportTypingLastSentAt = 0;
    }

    try {
      const actor = liveChatCurrentActor();
      await fetch(`/api/chat-support/${encodeURIComponent(normalizedThreadId)}/typing`, {
        method: "POST",
        headers: liveChatApiHeaders({
          Accept: "application/json",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          actor: "employee",
          isTyping: Boolean(isTyping),
          displayName: actor.senderName,
          avatarUrl: actor.senderAvatarUrl,
        }),
      });
    } catch (_) {}
  }

  function liveChatStopSupportTyping(options = {}) {
    liveChatClearSupportTypingTimer();
    const threadId = normalizeText(
      options.threadId
      || liveChatSupportTypingThreadId
      || liveChatGetActive()?.sourceThreadId,
    );
    if (!threadId) {
      return;
    }
    void liveChatSendSupportTypingState(threadId, false, { force: true });
  }

  function liveChatSyncSupportTypingFromComposer(input) {
    const active = liveChatGetActive();
    const threadId = normalizeText(active?.sourceThreadId);
    if (!threadId || liveChatRedesignState.isSending) {
      return;
    }
    const hasText = Boolean(normalizeText(input?.value));
    if (!hasText) {
      liveChatStopSupportTyping({ threadId });
      return;
    }
    void liveChatSendSupportTypingState(threadId, true);
    liveChatClearSupportTypingTimer();
    liveChatSupportTypingClearTimeoutId = window.setTimeout(() => {
      liveChatStopSupportTyping({ threadId });
    }, LIVE_CHAT_TYPING_IDLE_MS);
  }

  function liveChatSyncTypingUi() {
    const active = liveChatGetActive();
    liveChatSyncConversationHeaderIdentity(active);

    const messageArea = elements.liveChatMount?.querySelector("[data-lcx-message-area]");
    if (messageArea instanceof HTMLElement && active) {
      const existing = messageArea.querySelector("[data-lcx-typing-indicator]");
      const shouldShow = liveChatIsCustomerTyping(active);
      if (shouldShow && !existing) {
        const wasNearBottom = liveChatIsMessageAreaNearBottom(messageArea);
        messageArea.insertAdjacentHTML("beforeend", liveChatTypingIndicatorMarkup(active));
        if (wasNearBottom && liveChatRedesignState.messageScrollPinned) {
          liveChatStickMessageAreaToBottom(messageArea);
        }
      } else if (!shouldShow && existing) {
        existing.remove();
      }
    }

    elements.liveChatMount?.querySelectorAll("[data-lcx-thread]").forEach((threadEl) => {
      const conversation = liveChatRedesignConversations.find((item) => item.id === threadEl.dataset.lcxThread);
      if (!conversation) {
        return;
      }
      threadEl.querySelector(".lcx-thread__unread-copy")?.remove();
      liveChatApplyThreadSubtitle(threadEl.querySelector(".lcx-thread__preview"), conversation);
      liveChatApplyThreadMeta(threadEl, conversation);
    });
  }

  function liveChatStopTypingPoll() {
    if (liveChatTypingPollTimer) {
      window.clearInterval(liveChatTypingPollTimer);
      liveChatTypingPollTimer = 0;
    }
  }

  function liveChatStartTypingPoll() {
    liveChatStopTypingPoll();
    liveChatTypingPollTimer = window.setInterval(() => {
      void liveChatPollLiveChatState();
    }, LIVE_CHAT_LIVE_SYNC_POLL_MS || LIVE_CHAT_TYPING_POLL_MS);
    void liveChatPollLiveChatState();
  }

  function liveChatFindConversationInList(conversations, candidate) {
    const list = Array.isArray(conversations) ? conversations : [];
    const candidateId = normalizeText(candidate?.id);
    if (candidateId) {
      const byId = list.find((item) => item.id === candidateId);
      if (byId) {
        return byId;
      }
    }
    const candidateBuyerId = normalizeText(candidate?.buyerId);
    if (candidateBuyerId) {
      return list.find((item) => normalizeText(item?.buyerId) === candidateBuyerId) || null;
    }
    return null;
  }

  function liveChatMessagesDataSignature(messages) {
    return (Array.isArray(messages) ? messages : []).map((message) => [
      normalizeText(message?.id),
      normalizeText(message?.side),
      normalizeText(message?.text),
      normalizeText(message?.timestamp),
      normalizeText(message?.reactionEmoji),
      normalizeText(message?.editedAt),
      normalizeText(message?.deletedAt),
      normalizeText(message?.source),
      (Array.isArray(message?.media) ? message.media : [])
        .map((item) => normalizeText(item?.url || item?.src))
        .filter(Boolean)
        .join(","),
      (Array.isArray(message?.files) ? message.files : [])
        .map((item) => normalizeText(item?.url || item?.src))
        .filter(Boolean)
        .join(","),
    ].join(":")).join("|");
  }

  function liveChatConversationProductSignature(conversation) {
    return [
      normalizeText(conversation?.productId),
      normalizeText(conversation?.productName),
      normalizeText(conversation?.productDescription),
      normalizeText(conversation?.productImage || conversation?.productImageUrl),
      Number(conversation?.productOriginalPrice) || 0,
      Number(conversation?.productSalesPrice),
      Number(conversation?.productStock),
      Number(conversation?.productRating),
      Number(conversation?.productSold),
    ].join("|");
  }

  function liveChatConversationStructuralSignature(conversation) {
    const messages = Array.isArray(conversation?.messages) ? conversation.messages : [];
    const last = messages[messages.length - 1] || {};
    const media = Array.isArray(last?.media) ? last.media : [];
    return [
      normalizeText(conversation?.id || conversation?.sourceThreadId),
      normalizeText(conversation?.buyerId),
      liveChatMessagesDataSignature(messages),
      Number(conversation?.unread) || 0,
      normalizeText(conversation?.preview),
      normalizeText(conversation?.lastReadAt || conversation?.rawThread?.lastReadAt),
      normalizeText(last?.id),
      normalizeText(last?.timestamp || last?.createdAt || last?.sentAt || last?.time),
      normalizeText(last?.text),
      normalizeText(last?.reactionEmoji),
      normalizeText(last?.editedAt),
      normalizeText(last?.deletedAt),
      media.map((item) => normalizeText(item?.url || item?.src)).filter(Boolean).join(","),
      liveChatConversationProductSignature(conversation),
      normalizeText(conversation?.agentHandoff?.status),
      normalizeText(conversation?.agentHandoff?.requestedAt),
      normalizeText(conversation?.agentHandoff?.lastActivityAt),
      normalizeText(conversation?.agentHandoff?.expiresAt),
      normalizeText(conversation?.agentHandoff?.activeAgent?.senderRole),
      normalizeText(conversation?.agentHandoff?.activeAgent?.senderId),
    ].join("|");
  }

  function liveChatConversationSyncSignature(conversation) {
    return [
      liveChatConversationStructuralSignature(conversation),
      liveChatTypingActorSignature(conversation?.typing?.user),
      liveChatTypingActorSignature(conversation?.typing?.employee),
      conversation?.online ? "1" : "0",
      normalizeText(conversation?.lastActiveAt),
    ].join("|");
  }

  function liveChatBoardStructuralSignature(conversations) {
    return (Array.isArray(conversations) ? conversations : [])
      .map((conversation) => liveChatConversationStructuralSignature(conversation))
      .join("||");
  }

  function liveChatBoardSyncSignature(conversations) {
    return (Array.isArray(conversations) ? conversations : [])
      .map((conversation) => liveChatConversationSyncSignature(conversation))
      .join("||");
  }

  function liveChatMergeConversationUiState(conversation, existingUiState) {
    const byId = existingUiState.get(conversation.id);
    const byBuyer = normalizeText(conversation?.buyerId)
      ? existingUiState.get(`buyer:${normalizeText(conversation.buyerId)}`)
      : null;
    return { ...conversation, ...(byId || byBuyer || {}) };
  }

  function liveChatBuildExistingUiStateMap(conversations) {
    const existingUiState = new Map();
    (Array.isArray(conversations) ? conversations : []).forEach((conversation) => {
      const ui = {
        assignedAgent: conversation.assignedAgent,
        resolved: conversation.resolved,
      };
      existingUiState.set(conversation.id, ui);
      const buyerId = normalizeText(conversation?.buyerId);
      if (buyerId) {
        existingUiState.set(`buyer:${buyerId}`, ui);
      }
    });
    return existingUiState;
  }

  function liveChatSyncActiveConversationIfMessagesChanged(
    previousConversations,
    nextConversations,
    options = {},
  ) {
    const activeBefore = liveChatGetActive();
    const activeAfter = liveChatFindConversationInList(
      nextConversations,
      activeBefore || { id: liveChatRedesignState.activeId },
    );
    if (
      !activeBefore
      || !activeAfter
      || liveChatMessagesDataSignature(activeBefore.messages)
        === liveChatMessagesDataSignature(activeAfter.messages)
    ) {
      return false;
    }

    const previousScroll = liveChatCaptureMessageScroll(activeBefore.id);
    const previousMessageCount = Array.isArray(activeBefore.messages)
      ? activeBefore.messages.length
      : 0;
    const previousActiveId = liveChatRedesignState.activeId;
    liveChatRedesignConversations = nextConversations;
    liveChatSetActiveId(liveChatResolveActiveIdAfterSync(
      previousActiveId,
      previousConversations,
      nextConversations,
    ));
    const activeNow = liveChatGetActive();
    const nextMessageCount = Array.isArray(activeNow?.messages) ? activeNow.messages.length : 0;
    if (nextMessageCount > previousMessageCount) {
      liveChatTrackNewMessagesForAnimation(activeNow?.id, activeNow?.messages);
    }
    if (
      nextMessageCount > previousMessageCount
      && liveChatRedesignState.messageScrollPinned
      && (!previousScroll || previousScroll.wasNearBottom)
    ) {
      liveChatRedesignState.forceMessageScrollBottom = true;
    }
    liveChatSyncThreadListMarkup();
    liveChatSyncActiveMessageArea(activeNow);
    liveChatSyncActiveConversationChrome(activeNow);
    if (options.refreshNavBadge === true) {
      void refreshLiveChatNavBadge();
    }
    return true;
  }

  function liveChatTryApplySoftPollUpdate(previousConversations, nextConversations) {
    const previousStructural = liveChatBoardStructuralSignature(previousConversations);
    const nextStructural = liveChatBoardStructuralSignature(nextConversations);
    if (previousStructural === nextStructural) {
      liveChatRedesignConversations = nextConversations;
      liveChatSyncThreadListMarkup();
      if (
        liveChatSyncActiveConversationIfMessagesChanged(
          previousConversations,
          nextConversations,
        )
      ) {
        return true;
      }
      liveChatSyncActiveConversationChrome(liveChatGetActive());
      return true;
    }

    const activeBefore = liveChatGetActive();
    const activeAfter = liveChatFindConversationInList(
      nextConversations,
      activeBefore || { id: liveChatRedesignState.activeId },
    );
    const activeHandoffChanged = Boolean(
      activeBefore
      && activeAfter
      && [
        normalizeText(activeBefore.agentHandoff?.status),
        normalizeText(activeBefore.agentHandoff?.lastActivityAt),
        normalizeText(activeBefore.agentHandoff?.activeAgent?.senderId),
      ].join("|") !== [
        normalizeText(activeAfter.agentHandoff?.status),
        normalizeText(activeAfter.agentHandoff?.lastActivityAt),
        normalizeText(activeAfter.agentHandoff?.activeAgent?.senderId),
      ].join("|")
    );
    if (activeHandoffChanged) {
      return false;
    }
    if (
      activeBefore
      && activeAfter
      && liveChatMessagesDataSignature(activeBefore.messages) === liveChatMessagesDataSignature(activeAfter.messages)
    ) {
      const previousActiveId = liveChatRedesignState.activeId;
      liveChatRedesignConversations = nextConversations;
      liveChatSetActiveId(liveChatResolveActiveIdAfterSync(
        previousActiveId,
        previousConversations,
        nextConversations,
      ));
      liveChatSyncThreadListMarkup();
      liveChatSyncActiveConversationChrome(liveChatGetActive());
      return true;
    }

    if (activeBefore && activeAfter) {
      const maskedPrevious = previousConversations.map((conversation) => (
        liveChatFindConversationInList([activeBefore], conversation)
          ? { ...conversation, messages: activeBefore.messages }
          : conversation
      ));
      if (liveChatBoardStructuralSignature(maskedPrevious) === nextStructural) {
        const previousScroll = liveChatCaptureMessageScroll(activeBefore.id);
        const previousMessageCount = Array.isArray(activeBefore.messages) ? activeBefore.messages.length : 0;
        const previousActiveId = liveChatRedesignState.activeId;
        liveChatRedesignConversations = nextConversations;
        liveChatSetActiveId(liveChatResolveActiveIdAfterSync(
          previousActiveId,
          previousConversations,
          nextConversations,
        ));
        const activeNow = liveChatGetActive();
        const nextMessageCount = Array.isArray(activeNow?.messages) ? activeNow.messages.length : 0;
        if (nextMessageCount > previousMessageCount) {
          liveChatTrackNewMessagesForAnimation(activeNow?.id, activeNow?.messages);
        }
        if (
          nextMessageCount > previousMessageCount
          && liveChatRedesignState.messageScrollPinned
          && (!previousScroll || previousScroll.wasNearBottom)
        ) {
          liveChatRedesignState.forceMessageScrollBottom = true;
        }
        liveChatSyncThreadListMarkup();
        liveChatSyncActiveMessageArea(activeNow);
        liveChatSyncActiveConversationChrome(activeNow);
        return true;
      }
    }

    return false;
  }

  function liveChatSyncThreadListMarkup() {
    const list = elements.liveChatMount?.querySelector("[data-lcx-thread-list]");
    if (!(list instanceof HTMLElement)) {
      return;
    }
    liveChatSyncConversationFilterTabs();
    const threads = liveChatFilteredConversations();
    const hasAgentRequests = threads.some((conversation) => (
      liveChatNormalizeAgentHandoff(conversation?.agentHandoff).status === "pending"
    ));
    list.classList.toggle("is-agent-list-view", hasAgentRequests);
    const previousThreadListScroll = liveChatCaptureThreadListScroll();
    list.innerHTML = threads.length ? threads.map(liveChatThreadMarkup).join("") : liveChatEmptyThreadsMarkup();
    liveChatRestoreThreadListScroll(previousThreadListScroll);
  }

  function liveChatSyncPinnedProductSlot(conversation) {
    const slot = elements.liveChatMount?.querySelector(".lcx-pinned-product-slot");
    if (!(slot instanceof HTMLElement)) {
      return;
    }
    const chatFind = slot.querySelector("[data-lcx-chat-find]");
    const pinnedMarkup = liveChatPinnedProductMarkup(conversation);
    const expanded = conversation && liveChatHasPinnedProductContext(conversation)
      ? liveChatIsPinnedProductExpanded(conversation)
      : false;
    slot.classList.toggle("is-expanded", expanded);
    slot.classList.toggle("is-collapsed", Boolean(conversation && liveChatHasPinnedProductContext(conversation) && !expanded));
    Array.from(slot.children).forEach((child) => {
      if (child instanceof HTMLElement && child.matches("[data-lcx-chat-find]")) {
        return;
      }
      child.remove();
    });
    if (pinnedMarkup) {
      if (chatFind instanceof HTMLElement) {
        chatFind.insertAdjacentHTML("beforebegin", pinnedMarkup);
      } else {
        slot.insertAdjacentHTML("afterbegin", pinnedMarkup);
      }
    }
  }

  function liveChatSyncActiveMessageArea(active) {
    if (!active) {
      return;
    }
    const messageArea = elements.liveChatMount?.querySelector("[data-lcx-message-area]");
    if (!(messageArea instanceof HTMLElement)) {
      return;
    }
    const previousScroll = liveChatCaptureMessageScroll(active.id);
    const messages = Array.isArray(active.messages) ? active.messages : [];
    const order = liveChatOrderFor(active);
    const orderSummaryIndex = order.id
      ? Math.max(0, messages.findIndex((message) => message?.side === "support"))
      : -1;
    const typingMarkup = liveChatTypingIndicatorMarkup(active);
    messageArea.dataset.lcxConversationId = normalizeText(active.id);
    messageArea.innerHTML = messages.length
      ? `${liveChatBuildMessageAreaInnerHtml(active, orderSummaryIndex)}${typingMarkup}`
      : `<div class="lcx-empty-messages"><strong>Start the conversation</strong><p>Send a message to this customer.</p></div>${typingMarkup}`;
    liveChatInitPhotoBubbles();
    liveChatInitMessageAudioPlayers();
    liveChatInitMessageVideos();
    liveChatScanMediaSkeletons(messageArea);
    liveChatResetLazyMediaScrollTracking(messageArea);
    liveChatLoadVisibleScrollLazyMedia(messageArea);
    const shouldStickBottom = liveChatRedesignState.forceMessageScrollBottom
      || liveChatRedesignState.messageScrollPinned;
    liveChatRestoreMessageScroll(active.id, previousScroll);
    if (shouldStickBottom) {
      liveChatScheduleMessageScrollBottomStick(active.id);
    }
    void liveChatMountMessageEmojiLotties().then(() => {
      if (shouldStickBottom) {
        liveChatScheduleMessageScrollBottomStick(active.id);
      }
      liveChatConsumeMessageEnterAnimations();
    });
    liveChatConsumeMessageEnterAnimations();
  }

  function liveChatSyncActiveConversationChrome(conversation) {
    liveChatSyncTypingUi();
    liveChatSyncPinnedProductSlot(conversation);
  }

  function liveChatCaptureComposerState() {
    const mount = elements.liveChatMount;
    if (!(mount instanceof HTMLElement)) {
      return null;
    }
    const input = mount.querySelector("[data-lcx-message-input]");
    if (!(input instanceof HTMLTextAreaElement)) {
      return null;
    }
    return {
      value: String(input.value || ""),
      selectionStart: Number.isFinite(input.selectionStart) ? input.selectionStart : String(input.value || "").length,
      selectionEnd: Number.isFinite(input.selectionEnd) ? input.selectionEnd : String(input.value || "").length,
      focused: document.activeElement === input,
      conversationId: normalizeText(liveChatRedesignState.activeId),
    };
  }

  function liveChatRestoreComposerState(state) {
    if (!state) {
      return;
    }
    const mount = elements.liveChatMount;
    if (!(mount instanceof HTMLElement)) {
      return;
    }
    if (normalizeText(state.conversationId) && normalizeText(state.conversationId) !== normalizeText(liveChatRedesignState.activeId)) {
      return;
    }
    const input = mount.querySelector("[data-lcx-message-input]");
    if (!(input instanceof HTMLTextAreaElement)) {
      return;
    }
    input.value = String(state.value || "");
    liveChatSyncComposerTextareaHeight(input);
    liveChatSyncSendButtonState();
    if (state.focused) {
      window.requestAnimationFrame(() => {
        input.focus({ preventScroll: true });
        try {
          const start = Math.max(0, Math.min(Number(state.selectionStart) || 0, input.value.length));
          const end = Math.max(start, Math.min(Number(state.selectionEnd) || start, input.value.length));
          input.setSelectionRange(start, end);
        } catch (_) {
        }
      });
    }
  }

  async function liveChatPollLiveChatState() {
    if (activeMainView !== "live-chat" || liveChatTypingPollInFlight) {
      return;
    }
    if (!(elements.liveChatMount instanceof HTMLElement) || elements.liveChatMount.dataset.mainLiveChatReady !== "true") {
      return;
    }
    liveChatTypingPollInFlight = true;
    try {
      const previousAiStatusSignature = liveChatAiAssistantStatusSignature();
      const response = await fetch("/api/chat-support", {
        cache: "no-store",
        headers: liveChatApiHeaders({ Accept: "application/json" }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return;
      }
      liveChatApplyAiAssistantStatus(data?.aiAssistant);
      const aiStatusChanged = previousAiStatusSignature !== liveChatAiAssistantStatusSignature();
      const threads = Array.isArray(data?.threads) ? data.threads : [];
      const previousConversations = liveChatRedesignConversations.slice();
      const existingUiState = liveChatBuildExistingUiStateMap(previousConversations);
      const nextConversations = liveChatOrderConversations(
        previousConversations,
        threads.map((thread) => liveChatMergeConversationUiState(liveChatNormalizeThread(thread), existingUiState)),
      );
      const previousSignature = liveChatBoardSyncSignature(previousConversations);
      const nextSignature = liveChatBoardSyncSignature(nextConversations);
      if (previousSignature === nextSignature && !aiStatusChanged) {
        return;
      }

      if (!aiStatusChanged && liveChatTryApplySoftPollUpdate(previousConversations, nextConversations)) {
        void refreshLiveChatNavBadge();
        return;
      }

      if (
        liveChatRedesignState.isSending
        || liveChatRedesignState.isEditing
        || liveChatRedesignState.isAiReplying
      ) {
        mainRealtimeChatPending = true;
        scheduleMainRealtimeRefresh(250);
        return;
      }

      const activeBefore = liveChatGetActive();
      const previousScroll = liveChatCaptureMessageScroll(activeBefore?.id);
      const previousMessageCount = Array.isArray(activeBefore?.messages) ? activeBefore.messages.length : 0;
      const composerState = liveChatCaptureComposerState();
      const previousActiveId = liveChatRedesignState.activeId;
      liveChatRedesignConversations = nextConversations;
      liveChatSetActiveId(liveChatResolveActiveIdAfterSync(
        previousActiveId,
        previousConversations,
        nextConversations,
      ));
      if (!liveChatRedesignConversations.some((item) => item.id === liveChatRedesignState.activeId)) {
        liveChatSetActiveId(liveChatRedesignConversations[0]?.id || "");
      }
      const activeAfter = liveChatGetActive();
      const nextMessageCount = Array.isArray(activeAfter?.messages) ? activeAfter.messages.length : 0;
      if (activeAfter && nextMessageCount > previousMessageCount) {
        liveChatTrackNewMessagesForAnimation(activeAfter.id, activeAfter.messages);
      }
      if (
        activeBefore
        && activeAfter
        && activeBefore.id === activeAfter.id
        && nextMessageCount > previousMessageCount
        && liveChatRedesignState.messageScrollPinned
        && (!previousScroll || previousScroll.wasNearBottom)
      ) {
        liveChatRedesignState.forceMessageScrollBottom = true;
      }
      liveChatRenderBoard({
        preserveComposer: composerState,
        preserveReactionPicker: Boolean(liveChatRedesignState.reactionPicker),
      });
      void refreshLiveChatNavBadge();
    } catch (_) {
    } finally {
      liveChatTypingPollInFlight = false;
    }
  }

  async function liveChatLoadWallpapers() {
    try {
      const response = await fetch("/api/chat-wallpapers", {
        cache: "no-store",
        headers: liveChatApiHeaders({ Accept: "application/json" }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message || "Unable to load chat backgrounds.");
      }
      liveChatCustomWallpapers = Array.isArray(data.wallpapers) ? data.wallpapers : [];
    } catch (error) {
      console.warn("Live Chat custom backgrounds could not be loaded.", error);
    }
  }

  async function liveChatLoadRemoteData() {
    const [threadResponse, orderResponse] = await Promise.all([
      fetch("/api/chat-support", {
        cache: "no-store",
        headers: liveChatApiHeaders({ Accept: "application/json" }),
      }),
      fetch("/api/orders", {
        cache: "no-store",
        headers: liveChatApiHeaders({ Accept: "application/json" }),
      }).catch(() => null),
      liveChatLoadWallpapers(),
    ]);
    const threadData = await threadResponse.json().catch(() => ({}));
    if (!threadResponse.ok) {
      throw new Error(threadData?.message || "Unable to load conversations.");
    }
    const orderData = orderResponse && orderResponse.ok
      ? await orderResponse.json().catch(() => ({}))
      : {};
    liveChatApplyAiAssistantStatus(threadData?.aiAssistant);
    liveChatOrders = Array.isArray(orderData?.orders) ? orderData.orders : [];
    const threads = Array.isArray(threadData?.threads) ? threadData.threads : [];
    const previousConversations = liveChatRedesignConversations.slice();
    const existingUiState = liveChatBuildExistingUiStateMap(previousConversations);
    const previousActiveId = liveChatRedesignState.activeId;
    liveChatRedesignConversations = liveChatOrderConversations(
      previousConversations,
      threads.map((thread) => liveChatMergeConversationUiState(liveChatNormalizeThread(thread), existingUiState)),
    );
    liveChatSetActiveId(liveChatResolveActiveIdAfterSync(
      previousActiveId,
      previousConversations,
      liveChatRedesignConversations,
    ));
  }

  function liveChatCloneSeed() {
    const externalData = Array.isArray(window.GMS_LIVE_CHAT_DATA) ? window.GMS_LIVE_CHAT_DATA : null;
    const source = externalData && externalData.length ? externalData : liveChatRedesignSeed;
    try {
      return JSON.parse(JSON.stringify(source));
    } catch (error) {
      return liveChatRedesignSeed.map((conversation) => ({ ...conversation }));
    }
  }

  function liveChatEscape(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  const mainLiveChatReceiptCheckIconMarkup = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lcx-receipt__check-icon" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';

  function liveChatIcon(name, size = 20) {
    const paths = {
      compose: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"/>',
      chat: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
      "square-pen": '<path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"/>',
      chevron: '<path d="m9 18 6-6-6-6"/>',
      down: '<path d="m6 9 6 6 6-6"/>',
      phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.78.62 2.63a2 2 0 0 1-.45 2.11L8 9.73a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.85.29 1.73.5 2.63.62A2 2 0 0 1 22 16.92Z"/>',
      video: '<path d="m16 13 5 3V8l-5 3Z"/><rect x="3" y="6" width="13" height="12" rx="2"/>',
      more: '<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>',
      user: '<path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/>',
      bell: '<path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
      search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
      filter: '<path d="M4 6h16"/><path d="M7 12h10"/><path d="M10 18h4"/>',
      paperclip: '<path d="m16 6-8.414 8.586a2 2 0 0 0 2.829 2.829l8.414-8.586a4 4 0 1 0-5.657-5.657l-8.379 8.551a6 6 0 1 0 8.485 8.485l8.379-8.551"/>',
      smile: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/>',
      send: '<path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/>',
      close: '<path d="m18 6-12 12M6 6l12 12"/>',
      file: '<path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/><path d="M14 2v5a1 1 0 0 0 1 1h5"/>',
      image: '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
      back: '<path d="m15 18-6-6 6-6"/>',
      star: '<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>',
      agent: '<circle cx="9" cy="7" r="4"/><path d="M3 21v-2a6 6 0 0 1 6-6h1"/><path d="M16 11v6M13 14h6"/>',
      check: '<path d="m20 6-11 11-5-5"/>',
      highlighter: '<path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/>',
      pin: '<path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/>',
      cart: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
      package: '<path d="M12 22v-9"/><path d="M15.17 2.21a1.67 1.67 0 0 1 1.63 0L21 4.57a1.93 1.93 0 0 1 0 3.36L8.82 14.79a1.655 1.655 0 0 1-1.64 0L3 12.43a1.93 1.93 0 0 1 0-3.36z"/><path d="M20 13v3.87a2.06 2.06 0 0 1-1.11 1.83l-6 3.08a1.93 1.93 0 0 1-1.78 0l-6-3.08A2.06 2.06 0 0 1 4 16.87V13"/><path d="M21 12.43a1.93 1.93 0 0 0 0-3.36L8.83 2.2a1.64 1.64 0 0 0-1.63 0L3 4.57a1.93 1.93 0 0 0 0 3.36l12.18 6.86a1.636 1.636 0 0 0 1.63 0z"/>',
      external: '<path d="M15 3h6v6"/><path d="m10 14 11-11"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
      tag: '<path d="M20 13 13 20l-9-9V4h7Z"/><circle cx="8.5" cy="8.5" r="1"/>',
      truck: '<path d="M10 17h4V5H2v12h3"/><path d="M14 9h4l4 4v4h-3"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="17.5" r="2.5"/>',
      refund: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v10M15 9.5c-.7-.7-1.7-1-3-1-1.7 0-3 .8-3 2s1.3 2 3 2 3 .8 3 2-1.3 2-3 2c-1.3 0-2.3-.3-3-1"/>',
      discount: '<circle cx="12" cy="12" r="9"/><path d="m8.5 15.5 7-7"/><circle cx="9" cy="9" r="1"/><circle cx="15" cy="15" r="1"/>',
      return: '<path d="m9 14-4-4 4-4"/><path d="M5 10h8a6 6 0 0 1 6 6v2"/>',
      reply: '<path d="M20 18v-2a4 4 0 0 0-4-4H4"/><path d="m9 17-5-5 5-5"/>',
      menu: '<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/>',
      clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
      "list-sort-descending": '<path d="M15 12H3"/><path d="M3 5h18"/><path d="M9 19H3"/>',
      "mic-vocal": '<path d="m11 7.601-5.994 8.19a1 1 0 0 0 .1 1.298l.817.818a1 1 0 0 0 1.314.087L15.09 12"/><path d="M16.5 21.174C15.5 20.5 14.372 20 13 20c-2.058 0-3.928 2.356-6 2-2.072-.356-2.775-3.369-1.5-4.5"/><circle cx="16" cy="7" r="5"/>',
      plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
      mic: '<path d="M12 3a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><path d="M12 19v3"/>',
      "face-slightly-smiling": '<path d="M15 10V9"/><path d="M16.472 15a6 6 0 0 1-8.943 0"/><path d="M9 10V9"/><circle cx="12" cy="12" r="10"/>',
      sticker: '<rect x="3" y="3" width="18" height="18" rx="5"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01"/><path d="M15 9h.01"/>',
      timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M9 2h6"/>',
      info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
      pencil: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
      "user-plus": '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6"/><path d="M22 11h-6"/>',
      gif: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 15v-3a2 2 0 0 1 2-2h1"/><path d="M10 12H8"/><path d="M13 9v6"/><path d="M17 9v6"/><path d="M15 12h2"/>',
      square: '<rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor" stroke="none"/>',
      play: '<path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"/>',
      pause: '<rect x="14" y="3" width="5" height="18" rx="1"/><rect x="5" y="3" width="5" height="18" rx="1"/>',
      scan: '<path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/>',
      download: '<path d="M12 15V3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/>',
      link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
      copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
      translate: '<path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/>',
      forward: '<path d="m15 17 5-5-5-5"/><path d="M4 18v-2a4 4 0 0 1 4-4h12"/>',
      "pen-line": '<path d="M13 21h8"/><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>',
      "trash-2": '<path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
      reminder: '<path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/>',
      users: '<path d="M18 21a8 8 0 0 0-16 0"/><circle cx="10" cy="8" r="5"/><path d="M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3"/>',
      image2: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
      "cloud-upload": '<path d="M12 13v8"/><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="m8 17 4-4 4 4"/>',
      camera: '<path d="M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z"/><circle cx="12" cy="13" r="3"/>',
      wallpaper: '<path d="M12 17v4"/><path d="M8 21h8"/><path d="m9 17 6.1-6.1a2 2 0 0 1 2.81.01L22 15"/><circle cx="8" cy="9" r="2"/><rect x="2" y="3" width="20" height="14" rx="2"/>',
      check: '<path d="M20 6 9 17l-5-5"/>',
      crown: '<path d="m3 8 4 3 5-6 5 6 4-3v10H3Z"/><path d="M5 20h14"/>',
      mute: '<path d="m11 5-5 4H2v6h4l5 4z"/><path d="m22 9-6 6"/><path d="m16 9 6 6"/>',
      mail: '<path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7"/><rect x="2" y="4" width="20" height="16" rx="2"/>',
      flag: '<path d="M4 22V4a1 1 0 0 1 1-1h1a4 4 0 0 1 3 1.25A4 4 0 0 1 12 3h1a1 1 0 0 1 1 1v18"/>',
      folder: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
      "circle-dashed": '<path d="M10.1 2.18a9.93 9.93 0 0 1 8.8 0"/><path d="M21.8 8.22a10 10 0 0 1 0 7.56"/><path d="M13.9 21.82a9.93 9.93 0 0 1-8.8 0"/><path d="M2.2 15.78a10 10 0 0 1 0-7.56"/>',
      history: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
      trash: '<path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="m19 6-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>',
      bot: '<path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>',
    };
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.more}</svg>`;
  }

  function getParticipantToneIndex(source) {
    let hash = 0;
    const normalized = String(source || "");
    for (const char of normalized) {
      hash = (hash + char.charCodeAt(0)) % 6;
    }
    return hash + 1;
  }

  function liveChatBuyerToneSource(person) {
    const rawThread = person?.rawThread && typeof person.rawThread === "object"
      ? person.rawThread
      : {};
    const buyerId = normalizeText(
      person?.buyerId
      || person?.accountId
      || person?.accountCode
      || person?.customerId
      || person?.customerAccountId
      || person?.userId
      || person?.customerEmail
      || person?.email
      || rawThread?.customerAccountId
      || rawThread?.accountId
      || rawThread?.customerId
      || rawThread?.userId
      || rawThread?.customerEmail
      || person?.id,
    );
    const buyerName = normalizeText(
      person?.name
      || person?.customerName
      || person?.customerLabel
      || person?.userName
      || rawThread?.customerName
      || rawThread?.customerLabel
      || rawThread?.userName,
    ) || "Buyer";
    return `${buyerId}${buyerName}`;
  }

  function liveChatBuyerToneIndex(conversation) {
    return getParticipantToneIndex(liveChatBuyerToneSource(conversation));
  }

  function liveChatAvatarToneIndex(person) {
    if (!person) {
      return 1;
    }
    const role = normalizeText(person?.role).toLowerCase();
    const isBuyer = ["buyer", "customer", "user"].includes(role) || Boolean(
      person?.buyerId
      || person?.customerId
      || person?.customerAccountId
      || person?.customerEmail
      || person?.rawThread?.customerAccountId
      || person?.rawThread?.customerId,
    );
    if (isBuyer) {
      return liveChatBuyerToneIndex(person);
    }
    const name = normalizeText(person?.name) || (role === "customer" ? "Buyer" : "Participant");
    const id = normalizeText(person?.id || person?.employeeId || person?.accountCode || person?.email || person?.senderId);
    return getParticipantToneIndex(`${id}${name}`);
  }

  function liveChatIsStoreBrandPerson(person) {
    return liveChatIsSellerStorePerson(person);
  }

  function liveChatPresenceBadgeLabel(value) {
    const date = new Date(value || 0);
    if (Number.isNaN(date.getTime())) {
      return "";
    }

    const diffMinutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
    if (diffMinutes < 1) {
      return "now";
    }
    if (diffMinutes < 60) {
      return `${diffMinutes}m`;
    }

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      return `${diffHours}h`;
    }

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) {
      return `${diffDays}d`;
    }

    const diffWeeks = Math.floor(diffDays / 7);
    if (diffWeeks < 5) {
      return `${diffWeeks}w`;
    }

    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) {
      return `${Math.max(1, diffMonths)}mo`;
    }

    const diffYears = Math.floor(diffDays / 365);
    return `${Math.max(1, diffYears)}y`;
  }

  function liveChatCustomerLastActiveAt(conversation) {
    const thread = conversation?.rawThread || conversation;
    const messages = Array.isArray(conversation?.messages) ? conversation.messages : [];
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      if (message?.side !== "customer") {
        continue;
      }
      const timestamp = normalizeText(message?.timestamp || message?.createdAt || message?.sentAt);
      if (timestamp) {
        return timestamp;
      }
    }

    return normalizeText(
      conversation?.lastActiveAt
        || thread?.customerLastActiveAt
        || thread?.customerLastOnlineAt
        || thread?.lastOnlineAt
        || thread?.typing?.user?.updatedAt
        || thread?.updatedAt,
    );
  }

  function liveChatAvatarStatusMarkup(conversation) {
    if (conversation?.online === true) {
      return '<span class="lcx-avatar__status" aria-label="Online"></span>';
    }

    const lastActiveLabel = liveChatPresenceBadgeLabel(liveChatCustomerLastActiveAt(conversation));
    if (!lastActiveLabel) {
      return '<span class="lcx-avatar__status is-offline" aria-label="Offline"></span>';
    }

    return `<span class="lcx-avatar__status is-offline" aria-label="Last active ${liveChatEscape(lastActiveLabel)}"><span class="lcx-avatar__status-label">${liveChatEscape(lastActiveLabel)}</span></span>`;
  }

  function liveChatAvatar(conversation, sizeClass = "", options = {}) {
    if (conversation?.isBot === true || conversation?.role === "ai") {
      return liveChatBotAvatarMarkup(sizeClass);
    }
    const isSellerStore = options.storeLogo === true || liveChatIsSellerStorePerson(conversation);
    if (isSellerStore) {
      const storeName = liveChatStoreName();
      const image = liveChatSellerProfileImageUrl();
      const toneIndex = getSellerCompanyLogoToneIndex(authState?.session, storeName);
      const status = options?.showStatus ? liveChatAvatarStatusMarkup(conversation) : "";
      const imageClass = image ? " has-image" : "";
      const avatarClass = `lcx-avatar seller-company-logo--tone-${toneIndex} is-seller-store${sizeClass ? ` ${sizeClass}` : ""}${imageClass}${image ? " is-store-logo" : ""}`;
      const fallbackMarkup = `<span class="lcx-avatar__fallback" aria-hidden="true">${sellerEmptyLogoSvg}</span>`;
      if (image) {
        return `<span class="${avatarClass}">${fallbackMarkup}<img src="${liveChatEscape(image)}" alt="" onerror="this.remove(); this.parentElement?.classList.remove('has-image');" />${status}</span>`;
      }
      return `<span class="${avatarClass}">${fallbackMarkup}${status}</span>`;
    }
    const image = liveChatNormalizeAssetUrl(conversation?.avatar);
    const isStoreLogo = options.storeLogo === true || liveChatIsStoreBrandPerson(conversation);
    const status = options?.showStatus ? liveChatAvatarStatusMarkup(conversation) : "";
    const fallback = liveChatEscape(conversation?.initials || getInitials(conversation?.name, "CU"));
    const imageClass = image ? " has-image" : "";
    const storeLogoClass = image && isStoreLogo ? " is-store-logo" : "";
    const toneIndex = liveChatAvatarToneIndex(conversation);
    const avatarClass = `lcx-avatar super-admin-company-card__logo super-admin-company-card__logo--tone-${toneIndex} lcx-avatar--tone-${toneIndex}${sizeClass ? ` ${sizeClass}` : ""}${imageClass}${storeLogoClass}`;
    if (image) {
      return `<span class="${avatarClass}"><span class="lcx-avatar__fallback">${fallback}</span><img src="${liveChatEscape(image)}" alt="" onerror="this.remove(); this.parentElement?.classList.remove('has-image', 'is-store-logo');" />${status}</span>`;
    }
    return `<span class="${avatarClass}"><span class="lcx-avatar__fallback">${fallback}</span>${status}</span>`;
  }

  function liveChatBotIconSvg() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>`;
  }

  function liveChatAgentIconSvg() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></svg>`;
  }

  function liveChatAgentRequestIconSvg() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 21a8 8 0 0 1 13.292-6"/><circle cx="10" cy="8" r="5"/><path d="M19 16v6"/><path d="M22 19h-6"/></svg>`;
  }

  function liveChatBotAvatarMarkup(sizeClass = "lcx-avatar--message") {
    return `<span class="lcx-bot-avatar ${sizeClass}" aria-hidden="true">${liveChatBotIconSvg()}</span>`;
  }

  function liveChatIsAiMessage(message) {
    return normalizeText(message?.source) === "ai";
  }

  function liveChatMessageSenderKeys(message) {
    return [
      message?.senderId,
      message?.sender_id,
      message?.employeeId,
      message?.accountCode,
      message?.email,
    ]
      .map((value) => normalizeText(value).toLowerCase())
      .filter(Boolean);
  }

  function liveChatIsAssignedSupportMessage(message, active) {
    if (message?.side !== "support" || liveChatIsAiMessage(message)) {
      return false;
    }
    const senderKeys = new Set(liveChatMessageSenderKeys(message));
    if (!senderKeys.size) {
      return false;
    }
    return liveChatNormalizeAssignedEmployees(active?.assignedEmployees).some((person) => (
      [person.id, person.employeeId, person.accountCode, person.email]
        .some((value) => senderKeys.has(normalizeText(value).toLowerCase()))
    ));
  }

  function liveChatMessageLane(message, active) {
    if (message?.side === "customer") {
      return "buyer";
    }
    if (liveChatIsAiMessage(message)) {
      return "ai";
    }
    if (liveChatIsAssignedSupportMessage(message, active)) {
      return "assigned";
    }
    return "support";
  }

  function liveChatAssignedParticipantPerson(message, active) {
    const senderKeys = new Set(liveChatMessageSenderKeys(message));
    const assigned = liveChatNormalizeAssignedEmployees(active?.assignedEmployees).find((person) => (
      [person.id, person.employeeId, person.accountCode, person.email]
        .some((value) => senderKeys.has(normalizeText(value).toLowerCase()))
    ));
    const name = assigned?.name || normalizeText(message?.senderName) || "Assigned employee";
    return {
      id: assigned?.id || normalizeText(message?.senderId) || "assigned",
      name,
      initials: getInitials(name, "EM"),
      avatar: liveChatNormalizeAssetUrl(assigned?.avatarUrl || message?.senderAvatarUrl),
      role: "employee",
      employeeId: assigned?.employeeId,
      accountCode: assigned?.accountCode,
      email: assigned?.email || normalizeText(message?.email),
      position: assigned?.position || "Assigned employee",
    };
  }

  function liveChatNormalizeAiMessageText(value) {
    let text = String(value ?? "").trim();
    if (!text) {
      return text;
    }

    text = text
      .replace(/^```(?:text|markdown)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    text = text.replace(/\*\*([^*\n]+)\*\*/g, "$1");
    text = text.replace(/__([^_\n]+)__/g, "$1");
    text = text.replace(/(?<!\w)\*([^*\n]+)\*(?!\w)/g, "$1");
    text = text.replace(/(?<!\w)_([^_\n]+)_(?!\w)/g, "$1");
    text = text.replace(/`([^`\n]+)`/g, "$1");
    text = text.replace(/^\s{0,3}#{1,6}\s+/gm, "");
    text = text.replace(/^\s*[-*+]\s+/gm, "");
    text = text.replace(/^\s*\d+\.\s+/gm, "");
    text = text.replace(/[*_`~]/g, "");
    text = text.replace(/[ \t]{2,}/g, " ");

    return text.trim();
  }

  function liveChatDisplayMessageText(message) {
    const raw = normalizeText(message?.text);
    if (!raw || !liveChatIsAiMessage(message)) {
      return raw;
    }
    return liveChatNormalizeAiMessageText(raw);
  }

  function liveChatBuyerParticipantPerson(active) {
    if (!active) {
      return null;
    }
    const name = normalizeText(active.name) || "Customer";
    return {
      id: normalizeText(active.buyerId || active.accountId || active.customerId || active.id) || "buyer",
      buyerId: normalizeText(active.buyerId || active.accountId || active.customerId),
      name,
      searchName: `${name} customer buyer`,
      initials: active.initials || getInitials(active.name, "CU"),
      avatar: liveChatNormalizeAssetUrl(active.avatar),
      online: active.online === true,
      subtitle: active.online ? "Online" : "Offline",
      role: "customer",
    };
  }

  function liveChatAiParticipantPerson(active = null) {
    const aiAssistant = liveChatRedesignState.aiAssistant || {};
    const handoff = liveChatNormalizeAgentHandoff(active?.agentHandoff);
    const isPausedForRequest = handoff.status === "pending";
    const online = aiAssistant.available === true && !isPausedForRequest;
    return {
      id: "ai-assistant",
      name: "AI Assistant",
      searchName: "AI Assistant bot auto reply",
      initials: "AI",
      subtitle: isPausedForRequest
        ? "Paused while buyer waits for an agent"
        : aiAssistant.autoReplyEnabled
        ? "Auto Reply is active"
        : aiAssistant.manualReplyEnabled
          ? "Manual AI replies"
          : "Not launched",
      role: "ai",
      isBot: true,
      online,
    };
  }

  function liveChatHandoffHumanAgentPerson(active) {
    const handoff = liveChatNormalizeAgentHandoff(active?.agentHandoff);
    if (handoff.status !== "accepted" || !handoff.activeAgent) {
      return null;
    }
    return {
      id: handoff.activeAgent.senderId,
      name: handoff.activeAgent.senderName,
      searchName: `${handoff.activeAgent.senderName} ${handoff.activeAgent.senderRole} human agent`,
      initials: getInitials(handoff.activeAgent.senderName, "AG"),
      avatar: liveChatNormalizeSupportRole(handoff.activeAgent.senderRole) === "admin"
        ? liveChatSellerProfileImageUrl()
        : liveChatNormalizeAssetUrl(handoff.activeAgent.senderAvatarUrl),
      position: liveChatNormalizeSupportRole(handoff.activeAgent.senderRole) === "admin" ? "Store admin" : "Employee",
      subtitle: liveChatCurrentActorMatchesHandoff(active) ? "Currently assisting · You" : "Currently assisting",
      role: liveChatNormalizeSupportRole(handoff.activeAgent.senderRole),
    };
  }

  function liveChatOrderedFaceStackParticipants(active) {
    if (!active) {
      return [];
    }
    const buyerPerson = liveChatBuyerParticipantPerson(active);
    const adminPerson = liveChatChatAdminPerson();
    const assignedPeople = liveChatAssignedPeopleFor(active);
    const aiPerson = liveChatAiParticipantPerson(active);
    const humanAgent = liveChatHandoffHumanAgentPerson(active);
    const handoff = liveChatNormalizeAgentHandoff(active.agentHandoff);
    const people = [];
    const seen = new Set();
    const pushPerson = (person) => {
      if (!person) {
        return;
      }
      const key = normalizeText(person?.id || person?.name).toLowerCase();
      if (!key || seen.has(key)) {
        return;
      }
      seen.add(key);
      people.push(person);
    };

    pushPerson(buyerPerson ? {
      ...buyerPerson,
      unread: Number(active.unread) || 0,
    } : null);
    pushPerson(adminPerson);
    assignedPeople.forEach((person) => pushPerson(person));
    if (handoff.status !== "accepted") {
      pushPerson(aiPerson);
    }
    pushPerson(humanAgent);

    return people;
  }

  function liveChatMessageAvatarMarkup(message, active) {
    if (message?.side === "customer") {
      return liveChatAvatar(liveChatBuyerParticipantPerson(active), "lcx-avatar--message");
    }
    if (message?.side === "support" && liveChatIsAiMessage(message)) {
      return liveChatBotAvatarMarkup("lcx-avatar--message");
    }
    if (message?.side === "support" && liveChatIsAssignedSupportMessage(message, active)) {
      return liveChatAvatar(liveChatAssignedParticipantPerson(message, active), "lcx-avatar--message");
    }
    return "";
  }

  function liveChatResetMessageAnimationsForThread(conversationId, messages) {
    const threadId = normalizeText(conversationId);
    if (!threadId) {
      return;
    }
    liveChatRedesignState.messageAnimationSeenByThread[threadId] = new Set(
      (Array.isArray(messages) ? messages : [])
        .map((message) => normalizeText(message?.id))
        .filter(Boolean),
    );
    liveChatRedesignState.messageAnimationEnterIds.clear();
  }

  function liveChatTrackNewMessagesForAnimation(conversationId, nextMessages) {
    const threadId = normalizeText(conversationId);
    if (!threadId) {
      return;
    }
    if (!liveChatRedesignState.messageAnimationSeenByThread[threadId]) {
      liveChatRedesignState.messageAnimationSeenByThread[threadId] = new Set();
    }
    const seen = liveChatRedesignState.messageAnimationSeenByThread[threadId];
    (Array.isArray(nextMessages) ? nextMessages : []).forEach((message) => {
      const messageId = normalizeText(message?.id);
      if (!messageId || seen.has(messageId)) {
        return;
      }
      seen.add(messageId);
      liveChatRedesignState.messageAnimationEnterIds.add(messageId);
    });
  }

  function liveChatShouldAnimateMessage(messageId) {
    return liveChatRedesignState.messageAnimationEnterIds.has(normalizeText(messageId));
  }

  function liveChatConsumeMessageEnterAnimations() {
    const pendingIds = liveChatRedesignState.messageAnimationEnterIds;
    if (!pendingIds.size) {
      return;
    }
    const messageArea = elements.liveChatMount?.querySelector("[data-lcx-message-area]");
    if (!(messageArea instanceof HTMLElement)) {
      return;
    }
    const finish = (element) => {
      if (!(element instanceof HTMLElement)) {
        return;
      }
      const messageId = normalizeText(element.dataset.lcxMessageId);
      element.classList.remove("is-entering");
      if (messageId) {
        pendingIds.delete(messageId);
      }
    };
    messageArea.querySelectorAll(".lcx-message.is-entering").forEach((element) => {
      element.addEventListener("animationend", () => finish(element), { once: true });
      window.setTimeout(() => finish(element), 720);
    });
  }

  function liveChatGetActive() {
    return liveChatRedesignConversations.find((item) => item.id === liveChatRedesignState.activeId)
      || liveChatRedesignConversations[0]
      || null;
  }

  function liveChatStoreName() {
    return firstText([getIdentity()?.name], "Store");
  }

  function liveChatSellerProfileImageUrl() {
    const session = authState?.session || {};
    const identity = getIdentity();
    if (session.businessLogoSkipped === true) {
      return "";
    }
    return liveChatNormalizeAssetUrl(firstUrl([
      session.companyPictureUrl,
      session.companyProfileImageUrl,
      session.businessLogoUrl,
      session.profileImageUrl,
      session.avatarUrl,
      session.photoUrl,
      session.profilePhotoUrl,
      session.pictureUrl,
      session.imageUrl,
      session.logoUrl,
      session.company?.companyPictureUrl,
      session.company?.profileImageUrl,
      session.company?.logoUrl,
      session.store?.companyPictureUrl,
      session.store?.profileImageUrl,
      session.store?.logoUrl,
      session.profile?.companyPictureUrl,
      session.profile?.profileImageUrl,
      session.profile?.logoUrl,
      identity?.logoUrl,
    ]));
  }

  function liveChatIsSellerStorePerson(person) {
    return liveChatNormalizeSupportRole(person?.role) === "admin";
  }

  function liveChatStoreBrand() {
    const identity = getIdentity();
    const name = liveChatStoreName();
    const avatar = liveChatSellerProfileImageUrl();
    return {
      name,
      initials: identity?.fallback || getInitials(name, "ST"),
      avatar,
      logoUrl: avatar,
    };
  }

  function liveChatHydratePrefs() {
    if (liveChatPrefsHydrated) {
      return;
    }
    liveChatPrefsHydrated = true;
    try {
      const stored = JSON.parse(localStorage.getItem(LIVE_CHAT_PREFS_STORAGE_KEY) || "{}");
      if (stored && typeof stored === "object") {
        liveChatRedesignState.prefs = stored;
      }
    } catch (_) {
      liveChatRedesignState.prefs = {};
    }
  }

  function liveChatPersistPrefs() {
    try {
      localStorage.setItem(LIVE_CHAT_PREFS_STORAGE_KEY, JSON.stringify(liveChatRedesignState.prefs));
    } catch (_) {}
  }

  function liveChatPrefsFor(conversationId) {
    liveChatHydratePrefs();
    const id = normalizeText(conversationId);
    if (!id) {
      return { muted: false, snoozed: false, starred: false, incomplete: false, wallpaper: "doodle", reminders: [] };
    }
    if (!liveChatRedesignState.prefs[id]) {
      const conversation = liveChatRedesignConversations.find((item) => item.id === id);
      liveChatRedesignState.prefs[id] = {
        muted: false,
        snoozed: false,
        incomplete: false,
        starred: conversation?.starred === true,
        wallpaper: "doodle",
        reminders: [],
      };
    }
    if (typeof liveChatRedesignState.prefs[id].incomplete !== "boolean") {
      liveChatRedesignState.prefs[id].incomplete = false;
    }
    if (!Array.isArray(liveChatRedesignState.prefs[id].reminders)) {
      liveChatRedesignState.prefs[id].reminders = [];
    }
    return liveChatRedesignState.prefs[id];
  }

  const LIVE_CHAT_WALLPAPERS = [
    { id: "doodle", label: "Doodle", preview: "/assets/live-chat-doodle-wallpaper.jpg" },
    { id: "cafe", label: "Cafe", preview: "/assets/live-chat-cafe-wallpaper.jpg" },
    { id: "plain", label: "Plain", preview: "" },
    { id: "mesh", label: "Soft light", preview: "" },
  ];
  const LIVE_CHAT_WALLPAPER_IDS = new Set(LIVE_CHAT_WALLPAPERS.map((item) => item.id));
  let liveChatCustomWallpapers = [];

  function liveChatCustomWallpaperById(wallpaperId) {
    const id = normalizeText(wallpaperId);
    return liveChatCustomWallpapers.find((item) => item.id === id) || null;
  }

  function liveChatAvailableWallpapers() {
    return [
      ...LIVE_CHAT_WALLPAPERS,
      ...liveChatCustomWallpapers.map((item) => ({
        id: item.id,
        label: item.label || "Background",
        preview: item.src,
        custom: true,
      })),
    ];
  }

  function liveChatNormalizeWallpaper(value) {
    const id = normalizeText(value);
    if (LIVE_CHAT_WALLPAPER_IDS.has(id) || liveChatCustomWallpaperById(id)) {
      return id;
    }
    return "doodle";
  }

  function liveChatWallpaperClassName(wallpaper) {
    if (liveChatCustomWallpaperById(wallpaper)) {
      return " is-wallpaper-custom";
    }
    const id = liveChatNormalizeWallpaper(wallpaper);
    if (id === "plain") {
      return " is-wallpaper-plain";
    }
    if (id === "mesh") {
      return " is-wallpaper-mesh";
    }
    if (id === "cafe") {
      return " is-wallpaper-cafe";
    }
    return "";
  }

  function liveChatCustomWallpaperStyle(wallpaper) {
    const custom = liveChatCustomWallpaperById(wallpaper);
    if (!custom?.src) {
      return "";
    }
    return ` style="--lcx-custom-wallpaper: url(${liveChatEscape(JSON.stringify(custom.src))})"`;
  }

  function liveChatWallpaperPickerMarkup(selectedWallpaper) {
    const selected = liveChatNormalizeWallpaper(selectedWallpaper);
    return `
      <p class="lcx-wallpaper-hint">Pick a wallpaper for this conversation. It updates the chat right away.</p>
      <div class="lcx-wallpaper-grid" role="listbox" aria-label="Chat backgrounds">
        ${liveChatAvailableWallpapers().map((item) => {
          const isSelected = item.id === selected;
          const previewClass = item.id === "plain" || item.id === "mesh" ? ` lcx-wallpaper-card__preview--${item.id}` : "";
          const previewImage = item.preview
            ? `<img src="${liveChatEscape(item.preview)}" alt="" />`
            : "";
          return `
            <button
              type="button"
              class="lcx-wallpaper-card${isSelected ? " is-selected" : ""}"
              data-lcx-action="choose-wallpaper"
              data-lcx-wallpaper="${liveChatEscape(item.id)}"
              role="option"
              aria-selected="${isSelected ? "true" : "false"}"
              aria-label="${liveChatEscape(item.label)} background"
            >
              <span class="lcx-wallpaper-card__preview${previewClass}">${previewImage}<span class="lcx-wallpaper-card__check" aria-hidden="true">${liveChatIcon("check", 14)}</span></span>
              <span class="lcx-wallpaper-card__label">${liveChatEscape(item.label)}</span>
            </button>`;
        }).join("")}
      </div>`;
  }

  function liveChatApplyWallpaper(wallpaper) {
    const messageArea = elements.liveChatMount?.querySelector("[data-lcx-message-area]");
    if (!(messageArea instanceof HTMLElement)) {
      return;
    }
    const custom = liveChatCustomWallpaperById(wallpaper);
    messageArea.classList.remove("is-wallpaper-plain", "is-wallpaper-mesh", "is-wallpaper-cafe", "is-wallpaper-custom");
    messageArea.style.removeProperty("--lcx-custom-wallpaper");
    if (custom?.src) {
      messageArea.classList.add("is-wallpaper-custom");
      messageArea.style.setProperty("--lcx-custom-wallpaper", `url(${JSON.stringify(custom.src)})`);
    } else {
      const extra = liveChatWallpaperClassName(wallpaper).trim();
      if (extra) {
        messageArea.classList.add(extra);
      }
    }
    elements.liveChatMount.querySelectorAll("[data-lcx-wallpaper]").forEach((card) => {
      if (!(card instanceof HTMLElement)) {
        return;
      }
      const isSelected = card.dataset.lcxWallpaper === liveChatNormalizeWallpaper(wallpaper);
      card.classList.toggle("is-selected", isSelected);
      card.setAttribute("aria-selected", isSelected ? "true" : "false");
    });
  }

  function liveChatStoryRowMarkup(conversations) {
    const stories = (Array.isArray(conversations) ? conversations : []).slice(0, 10);
    if (!stories.length) {
      return "";
    }
    return `
      <div class="lcx-story-row" aria-label="Recent conversations">
        ${stories.map((conversation) => `
          <button
            type="button"
            class="lcx-story${conversation.id === liveChatRedesignState.activeId ? " is-active" : ""}"
            data-lcx-thread="${liveChatEscape(conversation.id)}"
            aria-label="${liveChatEscape(conversation.name)}"
            title="${liveChatEscape(conversation.name)}"
          >${liveChatAvatar(conversation, "lcx-avatar--story", { showStatus: true })}</button>
        `).join("")}
      </div>`;
  }

  function liveChatSharedStats(active) {
    const media = liveChatConversationMedia(active);
    const files = liveChatConversationFiles(active);
    const links = liveChatConversationLinks(active);
    const gifs = media.filter((item) => /\.gif(\?|$)/i.test(normalizeText(item?.src || item?.url || item?.name))).length;
    const reminders = Array.isArray(liveChatPrefsFor(active?.id).reminders) ? liveChatPrefsFor(active?.id).reminders.length : 0;
    return {
      media: media.length,
      files: files.length,
      links: links.length,
      gifs,
      reminders,
      orders: liveChatOrdersFor(active).length,
      participants: liveChatAssignedPeopleFor(active).length,
    };
  }

  function liveChatConversationMedia(active) {
    return liveChatUniqueAttachments(
      liveChatBuildConversationAttachmentEntries(active, "media")
        .map((entry) => entry.item),
    ).filter((item) => normalizeText(item?.src || item?.url) && (item.kind === "image" || item.kind === "video"));
  }

  function liveChatConversationFiles(active) {
    return liveChatUniqueAttachments(
      liveChatBuildConversationAttachmentEntries(active, "file")
        .map((entry) => entry.item),
    ).filter((item) => normalizeText(item?.name || item?.src || item?.url) && item.kind === "file");
  }

  function liveChatConversationLinks(active) {
    const messages = Array.isArray(active?.messages) ? active.messages : [];
    const links = [];
    const seen = new Set();
    messages.forEach((message) => {
      const matches = normalizeText(message?.text).match(/https?:\/\/[^\s<>"]+/gi) || [];
      matches.forEach((url) => {
        const clean = url.replace(/[),.;]+$/, "");
        if (!clean || seen.has(clean)) {
          return;
        }
        seen.add(clean);
        let host = clean;
        try {
          host = new URL(clean).hostname.replace(/^www\./, "");
        } catch (_) {}
        links.push({
          url: clean,
          host,
          preview: normalizeText(message?.text).slice(0, 90),
          time: normalizeText(message?.time),
        });
      });
    });
    return links;
  }

  function liveChatOrdersFor(conversation) {
    if (Array.isArray(conversation?.orders) && conversation.orders.length) {
      return conversation.orders.filter((order) => normalizeText(order?.id || order?.rawId));
    }
    const order = liveChatOrderFor(conversation);
    return normalizeText(order.id) ? [order] : [];
  }

  function liveChatParticipantsFor(active) {
    return liveChatOrderedFaceStackParticipants(active);
  }

  function liveChatFaceStackMarkup(people, options = {}) {
    const max = Number(options.max) || 4;
    const allPeople = Array.isArray(people) ? people : [];
    const faces = allPeople.slice(0, max);
    const overflow = Math.max(0, allPeople.length - max);
    if (!faces.length && overflow <= 0) {
      return "";
    }
    return `
      <span class="lcx-face-stack" aria-hidden="true">
        ${faces.map((person, index) => {
          const badge = Number(person.unread) > 0
            ? `<span class="lcx-face-badge is-count">${Number(person.unread) > 9 ? "9+" : Number(person.unread)}</span>`
            : "";
          const stackIndex = index + 1;
          return `<span class="lcx-face-stack__item" style="--lcx-face-stack-index:${stackIndex};z-index:${stackIndex}">${liveChatAvatar(person, "lcx-avatar--face", { storeLogo: liveChatIsSellerStorePerson(person) })}${badge}</span>`;
        }).join("")}
        ${overflow > 0 ? `<span class="lcx-face-stack__item lcx-face-stack__more" style="--lcx-face-stack-index:${faces.length + 1};z-index:${faces.length + 1}"><span class="lcx-face-stack__overflow">+${overflow}</span></span>` : ""}
      </span>`;
  }

  function liveChatDetailsPaneIcon(pane = "") {
    switch (pane) {
      case "media":
        return "image";
      case "gifs":
        return "gif";
      case "reminders":
        return "reminder";
      case "links":
        return "link";
      case "files":
        return "file";
      case "participants":
        return "users";
      case "orders":
        return "history";
      case "wallpaper":
        return "wallpaper";
      default:
        return "info";
    }
  }

  function liveChatDetailsHeadIconMarkup(iconName) {
    return `<span class="lcx-details-head__icon" aria-hidden="true">${liveChatIcon(iconName, 16)}</span>`;
  }

  function liveChatDetailsHeadMarkup(title, options = {}) {
    const showIcon = options.showIcon === true;
    const iconName = options.icon || liveChatDetailsPaneIcon(options.pane || "");
    const centered = options.centered === true || !showIcon;
    return `
      <header class="lcx-details-head${centered ? " is-centered" : ""}">
        ${showIcon ? liveChatDetailsHeadIconMarkup(iconName) : ""}
        <h2>${liveChatEscape(title)}</h2>
      </header>`;
  }

  function liveChatDetailsSubheadMarkup(pane) {
    const title = liveChatDetailsPaneTitle(pane);
    return `
      <header class="lcx-subhead">
        <button type="button" class="lcx-subhead__back" data-lcx-action="close-details-pane" aria-label="Back to chat info">${liveChatIcon("back", 20)}</button>
        ${liveChatDetailsHeadIconMarkup(liveChatDetailsPaneIcon(pane))}
        <h2>${liveChatEscape(title)}</h2>
      </header>`;
  }

  function liveChatDetailsPaneTitle(pane) {
    switch (pane) {
      case "media":
        return "Media";
      case "reminders":
        return "Reminders";
      case "gifs":
        return "GIFs";
      case "links":
        return "Links";
      case "files":
        return "Files";
      case "participants":
        return "Participants";
      case "orders":
        return "Order History";
      case "wallpaper":
        return "Background";
      default:
        return "Chat info";
    }
  }

  function liveChatEmptyPaneMarkup(title, copy) {
    return `<div class="lcx-pane-empty"><strong>${liveChatEscape(title)}</strong><p>${liveChatEscape(copy)}</p></div>`;
  }

  function liveChatCustomerProfileSubtitleMarkup(active) {
    if (liveChatOrdersFor(active).length > 0) {
      return "";
    }
    return `<p>First time buyer</p>`;
  }

  function liveChatDetailsHomeMarkup(active, chatPrefs, sharedStats, storeName) {
    const participants = liveChatOrderedFaceStackParticipants(active);
    return `
      <section class="lcx-profile-card">
        <div class="lcx-profile-card__identity">
          <div class="lcx-profile-avatar-wrap">
            ${liveChatAvatar(active, "lcx-avatar--profile")}
          </div>
          <div>
            <h2>${liveChatEscape(active.name)}${active.vip ? '<span class="lcx-vip">VIP</span>' : ""}</h2>
            ${liveChatCustomerProfileSubtitleMarkup(active)}
          </div>
        </div>
      </section>
      <button type="button" class="lcx-info-row" data-lcx-action="view-media">
        <span class="lcx-info-row__icon">${liveChatIcon("image", 16)}</span>
        <span class="lcx-info-row__copy"><strong>Media</strong></span>
        <span class="lcx-info-row__meta">${sharedStats.media}</span>
        ${liveChatIcon("chevron", 16)}
      </button>
      <button type="button" class="lcx-info-row" data-lcx-action="reminders">
        <span class="lcx-info-row__icon">${liveChatIcon("reminder", 16)}</span>
        <span class="lcx-info-row__copy"><strong>Reminders</strong></span>
        <span class="lcx-info-row__meta">${sharedStats.reminders}</span>
        ${liveChatIcon("chevron", 16)}
      </button>
      <button type="button" class="lcx-info-row" data-lcx-action="links">
        <span class="lcx-info-row__icon">${liveChatIcon("link", 16)}</span>
        <span class="lcx-info-row__copy"><strong>Links</strong></span>
        <span class="lcx-info-row__meta">${sharedStats.links}</span>
        ${liveChatIcon("chevron", 16)}
      </button>
      <button type="button" class="lcx-info-row" data-lcx-action="files-panel">
        <span class="lcx-info-row__icon">${liveChatIcon("file", 16)}</span>
        <span class="lcx-info-row__copy"><strong>Files</strong></span>
        <span class="lcx-info-row__meta">${sharedStats.files}</span>
        ${liveChatIcon("chevron", 16)}
      </button>
      <button type="button" class="lcx-info-row lcx-info-row--faces" data-lcx-action="participants">
        <span class="lcx-info-row__icon">${liveChatIcon("users", 16)}</span>
        <span class="lcx-info-row__copy"><strong>Participants</strong></span>
        ${liveChatFaceStackMarkup(participants, { max: 4 })}
        ${liveChatIcon("chevron", 16)}
      </button>
      <button type="button" class="lcx-info-row" data-lcx-action="orders">
        <span class="lcx-info-row__icon">${liveChatIcon("history", 16)}</span>
        <span class="lcx-info-row__copy"><strong>Order History</strong></span>
        <span class="lcx-info-row__meta">${sharedStats.orders}</span>
        ${liveChatIcon("chevron", 16)}
      </button>
      <div class="lcx-setting-row">
        <span class="lcx-info-row__copy"><strong>Mute chat</strong><p>You will not receive any notification for messages.</p></span>
        <button type="button" class="lcx-toggle${chatPrefs.muted ? " is-on" : ""}" data-lcx-action="mute-chat" role="switch" aria-checked="${chatPrefs.muted ? "true" : "false"}" aria-label="Mute chat"><span class="lcx-toggle__knob"></span></button>
      </div>
      <button type="button" class="lcx-info-row" data-lcx-action="set-background">
        <span class="lcx-info-row__icon">${liveChatIcon("wallpaper", 16)}</span>
        <span class="lcx-info-row__copy"><strong>Set background</strong></span>
        ${liveChatIcon("chevron", 16)}
      </button>
      <div class="lcx-setting-row">
        <span class="lcx-info-row__copy"><strong>Snooze for 30 days</strong><p>This chat will move to the bottom of the chat list.</p></span>
        <button type="button" class="lcx-toggle${chatPrefs.snoozed ? " is-on" : ""}" data-lcx-action="snooze-chat" role="switch" aria-checked="${chatPrefs.snoozed ? "true" : "false"}" aria-label="Snooze chat"><span class="lcx-toggle__knob"></span></button>
      </div>
      <button type="button" class="lcx-info-row lcx-info-row--danger" data-lcx-action="delete-chat">
        <span class="lcx-info-row__icon">${liveChatIcon("trash-2", 16)}</span>
        <span class="lcx-info-row__copy"><strong>Delete chat</strong></span>
      </button>`;
  }

  function liveChatDetailsSubviewMarkup(active, pane) {
    if (!active || !pane) {
      return `<div class="lcx-pane-empty"><strong>Chat info</strong><p>Choose an item from the conversation details.</p></div>`;
    }
    const title = liveChatDetailsPaneTitle(pane);
    const header = liveChatDetailsSubheadMarkup(pane);
    if (pane === "media" || pane === "gifs") {
      const media = liveChatConversationMedia(active).filter((item) => (
        pane === "media" || /\.gif(\?|$)/i.test(normalizeText(item.src || item.name))
      ));
      return `${header}${media.length ? `
        <div class="lcx-media-grid">
          ${media.map((item, index) => `
            <button type="button" class="lcx-media-tile" data-lcx-action="open-media-viewer" data-lcx-media-kind="${liveChatEscape(item.kind || "image")}" data-lcx-media-src="${liveChatEscape(item.src)}" data-lcx-media-label="${liveChatEscape(item.alt || item.name || "Media")}" data-lcx-media-side="${liveChatEscape(item.messageSide || "support")}" aria-label="Open ${item.kind === "video" ? "video" : "photo"} ${index + 1}">
              ${item.kind === "video"
                ? `<video src="${liveChatEscape(item.src)}" muted playsinline preload="metadata"></video>`
                : `<img src="${liveChatEscape(item.src)}" alt="" onerror="this.closest('button').classList.add('is-broken')" />`}
            </button>`).join("")}
        </div>` : liveChatEmptyPaneMarkup(pane === "gifs" ? "No GIFs" : "No media yet", pane === "gifs" ? "GIFs shared in this chat will appear here." : "Photos and videos shared in this chat will appear here.")}`;
    }
    if (pane === "reminders") {
      const reminders = liveChatPrefsFor(active.id).reminders;
      return `${header}
        <form class="lcx-reminder-form" data-lcx-reminder-form>
          <input type="text" name="text" maxlength="120" placeholder="Remind me about..." aria-label="Reminder" required />
          <input type="datetime-local" name="when" aria-label="Reminder time" />
          <button type="submit">Add</button>
        </form>
        ${reminders.length ? `<div class="lcx-reminder-list">${reminders.map((item) => `
          <article class="lcx-reminder">
            <span><strong>${liveChatEscape(item.text)}</strong><small>${liveChatEscape(item.whenLabel || "Saved reminder")}</small></span>
            <button type="button" data-lcx-action="delete-reminder" data-lcx-reminder-id="${liveChatEscape(item.id)}" aria-label="Remove reminder">${liveChatIcon("close", 14)}</button>
          </article>`).join("")}</div>` : liveChatEmptyPaneMarkup("No reminders", "Add a reminder to follow up on this conversation.")}`;
    }
    if (pane === "links") {
      const links = liveChatConversationLinks(active);
      return `${header}${links.length ? `<div class="lcx-link-list">${links.map((item) => `
        <button type="button" class="lcx-link-row" data-lcx-action="open-attachment" data-lcx-file-url="${liveChatEscape(item.url)}">
          <span class="lcx-info-row__icon">${liveChatIcon("link", 16)}</span>
          <span class="lcx-info-row__copy"><strong>${liveChatEscape(item.host)}</strong><small>${liveChatEscape(item.url)}</small></span>
        </button>`).join("")}</div>` : liveChatEmptyPaneMarkup("No links", "Links shared in this chat will appear here.")}`;
    }
    if (pane === "files") {
      const files = liveChatConversationFiles(active);
      return `${header}${files.length ? `<div class="lcx-file-list">${files.map(liveChatFileMarkup).join("")}</div>` : liveChatEmptyPaneMarkup("No files", "Documents shared in this chat will appear here.")}`;
    }
    if (pane === "participants") {
      const buyerPerson = liveChatBuyerParticipantPerson(active);
      const aiPerson = liveChatAiParticipantPerson(active);
      const adminPerson = liveChatChatAdminPerson();
      const assignedPeople = liveChatAssignedPeopleFor(active);
      const canManage = liveChatCanManageParticipants();
      const handoff = liveChatNormalizeAgentHandoff(active.agentHandoff);
      const humanAgent = liveChatHandoffHumanAgentPerson(active);
      const query = normalizeText(liveChatRedesignState.participantQuery).toLowerCase();
      const buyerVisible = buyerPerson && (!query || liveChatEmployeeSearchText(buyerPerson).includes(query));
      const adminVisible = adminPerson && (!query || liveChatEmployeeSearchText(adminPerson).includes(query));
      const assignedVisible = assignedPeople.filter((person) => (
        !query || liveChatEmployeeSearchText(person).includes(query)
      ));
      const aiVisible = handoff.status !== "accepted"
        && (!query || liveChatEmployeeSearchText(aiPerson).includes(query));
      const humanVisible = humanAgent
        && (!query || liveChatEmployeeSearchText(humanAgent).includes(query));
      const heroPeople = liveChatOrderedFaceStackParticipants(active);
      return `${header}
        <div class="lcx-participants-page">
          ${heroPeople.length ? `<div class="lcx-participants-hero">${liveChatFaceStackMarkup(heroPeople, { max: 5 })}</div>` : ""}
          <label class="lcx-participants-search">
            ${liveChatIcon("search", 15)}
            <input type="search" value="${liveChatEscape(liveChatRedesignState.participantQuery)}" placeholder="Search for a contact" data-lcx-participant-search aria-label="Search participants" />
          </label>
          <section class="lcx-participant-section">
            <div class="lcx-participant-section__head">
              <h3>Customer${buyerVisible ? " (1)" : " (0)"}</h3>
            </div>
            ${buyerVisible ? liveChatParticipantRowMarkup(buyerPerson) : ""}
          </section>
          <section class="lcx-participant-section">
            <div class="lcx-participant-section__head">
              <h3>Store team${adminVisible ? " (1)" : ""}</h3>
            </div>
            ${adminVisible ? liveChatParticipantRowMarkup(adminPerson) : ""}
          </section>
          <section class="lcx-participant-section">
            <div class="lcx-participant-section__head">
              <h3>Assigned employees (${assignedVisible.length})</h3>
              ${canManage ? `<button type="button" class="lcx-participant-add" data-lcx-action="open-assign-picker">Assign</button>` : ""}
            </div>
            ${assignedVisible.length
              ? assignedVisible.map((person) => liveChatParticipantRowMarkup(person, { canRemove: canManage })).join("")
              : `<p class="lcx-participant-empty">${canManage ? "Assign an employee so they can open and assist this chat." : "No employee assigned to this chat yet."}</p>`}
          </section>
          ${handoff.status !== "accepted" ? `<section class="lcx-participant-section">
            <div class="lcx-participant-section__head">
              <h3>AI Assistant${aiVisible ? " (1)" : " (0)"}</h3>
            </div>
            ${aiVisible ? liveChatParticipantRowMarkup(aiPerson) : ""}
          </section>` : ""}
          <section class="lcx-participant-section">
            <div class="lcx-participant-section__head">
              <h3>Human agent${humanVisible ? " (1)" : " (0)"}</h3>
            </div>
            ${humanVisible
              ? liveChatParticipantRowMarkup(humanAgent)
              : `<p class="lcx-participant-empty">${handoff.status === "pending" ? "The buyer is waiting for one participant to accept." : "No human agent is assisting this chat."}</p>`}
          </section>
        </div>`;
    }
    if (pane === "orders") {
      const orders = liveChatOrdersFor(active);
      return `${header}${orders.length ? `<div class="lcx-order-history">${orders.map((order) => `
        <button type="button" class="lcx-order-history__item" data-lcx-action="view-order">
          <span class="lcx-order-history__thumb">${order.productImage ? `<img src="${liveChatEscape(order.productImage)}" alt="" onerror="this.remove()" />` : liveChatIcon("package", 18)}</span>
          <span class="lcx-info-row__copy">
            <strong>${liveChatEscape(order.productName || "Order")}</strong>
            <small>#${liveChatEscape(order.id)} · ${liveChatEscape(order.placedAt || "")}</small>
          </span>
          <span class="lcx-order-history__meta">
            <strong>${liveChatFormatMoney(order.total)}</strong>
            <small class="lcx-status ${liveChatStatusClass(order.shippingStatus || order.paymentStatus)}">${liveChatEscape(order.shippingStatus || order.paymentStatus || "")}</small>
          </span>
        </button>`).join("")}</div>` : liveChatEmptyPaneMarkup("No orders yet", "Orders from this customer will appear here.")}`;
    }
    if (pane === "wallpaper") {
      return `${header}${liveChatWallpaperPickerMarkup(liveChatPrefsFor(active.id).wallpaper)}`;
    }
    return `${header}${liveChatEmptyPaneMarkup(title, "Nothing to show yet.")}`;
  }

  function liveChatOpenDetailsPane(pane) {
    const active = liveChatGetActive();
    if (!active || !pane) {
      return;
    }
    window.clearTimeout(liveChatDetailsPaneTimer);
    liveChatRedesignState.detailsOpen = true;
    liveChatRedesignState.detailsPane = pane;
    liveChatSyncDetailsPanelOpen();
    const stage = elements.liveChatMount?.querySelector("[data-lcx-details-stage]");
    const sub = elements.liveChatMount?.querySelector("[data-lcx-details-sub]");
    if (stage instanceof HTMLElement && sub instanceof HTMLElement) {
      sub.innerHTML = liveChatDetailsSubviewMarkup(active, pane);
      requestAnimationFrame(() => {
        stage.classList.add("is-subview");
      });
      return;
    }
    liveChatRenderBoard();
    requestAnimationFrame(() => {
      elements.liveChatMount?.querySelector("[data-lcx-details-stage]")?.classList.add("is-subview");
    });
  }

  function liveChatCloseDetailsPane() {
    const stage = elements.liveChatMount?.querySelector("[data-lcx-details-stage]");
    window.clearTimeout(liveChatDetailsPaneTimer);
    if (stage instanceof HTMLElement && stage.classList.contains("is-subview")) {
      stage.classList.remove("is-subview");
      liveChatDetailsPaneTimer = window.setTimeout(() => {
        liveChatRedesignState.detailsPane = "";
        const sub = elements.liveChatMount?.querySelector("[data-lcx-details-sub]");
        if (sub) {
          sub.innerHTML = liveChatDetailsSubviewMarkup(liveChatGetActive(), "");
        }
      }, 280);
      return;
    }
    liveChatRedesignState.detailsPane = "";
  }

  function liveChatConfirmDeleteConversation(conversation) {
    const overlay = document.querySelector("[data-live-chat-delete-modal]");
    const modal = overlay?.querySelector(".live-chat-delete-modal");
    const copy = overlay?.querySelector("[data-live-chat-delete-modal-copy]");
    const confirmButton = overlay?.querySelector("[data-live-chat-delete-modal-confirm]");
    if (!(overlay instanceof HTMLElement) || !(modal instanceof HTMLElement) || !(confirmButton instanceof HTMLButtonElement)) {
      const fallbackLabel = normalizeText(conversation?.name) || "this chat";
      return Promise.resolve(window.confirm(`Delete chat with ${fallbackLabel}? This cannot be undone.`));
    }

    const label = normalizeText(conversation?.name) || "this chat";
    if (copy instanceof HTMLElement) {
      copy.textContent = `Delete the chat with ${label}? This action cannot be undone and will be permanent.`;
    }

    return new Promise((resolve) => {
      const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      let settled = false;

      const settle = (confirmed) => {
        if (settled) {
          return;
        }
        settled = true;
        overlay.removeEventListener("click", onClick);
        document.removeEventListener("keydown", onKeydown);
        overlay.classList.remove("is-open");
        overlay.setAttribute("aria-hidden", "true");
        window.setTimeout(() => {
          overlay.hidden = true;
          if (!confirmed && previousFocus?.isConnected) {
            previousFocus.focus({ preventScroll: true });
          }
        }, 180);
        resolve(confirmed);
      };

      const onClick = (event) => {
        const target = event.target instanceof Element ? event.target : null;
        if (target?.closest("[data-live-chat-delete-modal-confirm]")) {
          settle(true);
          return;
        }
        if (
          event.target === overlay
          || target?.closest("[data-live-chat-delete-modal-close]")
          || target?.closest("[data-live-chat-delete-modal-cancel]")
        ) {
          settle(false);
        }
      };

      const onKeydown = (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          settle(false);
        }
      };

      overlay.addEventListener("click", onClick);
      document.addEventListener("keydown", onKeydown);
      overlay.hidden = false;
      overlay.setAttribute("aria-hidden", "false");
      window.requestAnimationFrame(() => {
        overlay.classList.add("is-open");
        modal.focus({ preventScroll: true });
      });
    });
  }

  async function liveChatDeleteConversation(conversation) {
    if (!conversation) {
      return;
    }
    if (!await liveChatConfirmDeleteConversation(conversation)) {
      return;
    }
    try {
      if (normalizeText(conversation.sourceThreadId)) {
        const response = await fetch(`/api/chat-support/${encodeURIComponent(conversation.sourceThreadId)}`, {
          method: "DELETE",
          headers: liveChatApiHeaders({ Accept: "application/json" }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data?.message || "Unable to delete chat.");
        }
      }
      const wasActive = conversation.id === liveChatRedesignState.activeId;
      liveChatRedesignConversations = liveChatRedesignConversations.filter((item) => item.id !== conversation.id);
      delete liveChatRedesignState.prefs[conversation.id];
      liveChatPersistPrefs();
      if (wasActive) {
        liveChatRedesignState.detailsPane = "";
        liveChatSetActiveId(liveChatRedesignConversations[0]?.id || "");
        liveChatRenderBoard();
      } else {
        liveChatSyncThreadListMarkup();
      }
      liveChatShowToast("Chat deleted.");
    } catch (error) {
      liveChatShowToast(error?.message || "Unable to delete chat.");
    }
  }

  async function liveChatDeleteActiveChat() {
    await liveChatDeleteConversation(liveChatGetActive());
  }

  function liveChatIsPriorityConversation(conversation) {
    if (!conversation) {
      return false;
    }
    const prefs = liveChatPrefsFor(conversation.id);
    if (prefs.starred || conversation.starred === true) {
      return true;
    }
    return (Array.isArray(conversation.tags) ? conversation.tags : []).some((tag) =>
      /priority|vip|urgent/i.test(normalizeText(tag)),
    );
  }

  function liveChatIsPendingConversation(conversation) {
    if (!conversation) {
      return false;
    }
    return liveChatPrefsFor(conversation.id).incomplete === true;
  }

  function liveChatCountPriorityConversations() {
    return liveChatRedesignConversations.filter(liveChatIsPriorityConversation).length;
  }

  function liveChatCountPendingConversations() {
    return liveChatRedesignConversations.filter(liveChatIsPendingConversation).length;
  }

  function liveChatConversationFilterTabsMarkup() {
    const unreadTotal = liveChatRedesignConversations.reduce((total, item) => (
      liveChatPrefsFor(item.id).muted ? total : total + (Number(item.unread) || 0)
    ), 0);
    const priorityTotal = liveChatCountPriorityConversations();
    const pendingTotal = liveChatCountPendingConversations();
    const filter = liveChatRedesignState.filter === "store" ? "all" : liveChatRedesignState.filter;
    if (liveChatRedesignState.filter === "store") {
      liveChatRedesignState.filter = "all";
    }
    return `
      <button type="button" class="lcx-tab${filter === "all" ? " is-active" : ""}" data-lcx-filter="all">All</button>
      <button type="button" class="lcx-tab${filter === "unread" ? " is-active" : ""}" data-lcx-filter="unread">Unread${unreadTotal ? `<span>${unreadTotal}</span>` : ""}</button>
      <button type="button" class="lcx-tab${filter === "priority" ? " is-active" : ""}" data-lcx-filter="priority">Priority${priorityTotal ? `<span>${priorityTotal}</span>` : ""}</button>
      <button type="button" class="lcx-tab${filter === "pending" ? " is-active" : ""}" data-lcx-filter="pending">Pending${pendingTotal ? `<span>${pendingTotal}</span>` : ""}</button>
    `;
  }

  function liveChatGetFilterTabsCarousel() {
    return elements.liveChatMount?.querySelector("[data-lcx-tabs-carousel]");
  }

  function liveChatSyncFilterTabsCarouselNav(carousel = liveChatGetFilterTabsCarousel()) {
    if (!(carousel instanceof HTMLElement)) {
      return;
    }
    const track = carousel.querySelector(".lcx-tabs");
    const prev = carousel.querySelector("[data-lcx-action='tabs-prev']");
    const next = carousel.querySelector("[data-lcx-action='tabs-next']");
    if (!(track instanceof HTMLElement) || !(prev instanceof HTMLElement) || !(next instanceof HTMLElement)) {
      return;
    }
    const overflow = track.scrollWidth > track.clientWidth + 1;
    const atStart = track.scrollLeft <= 1;
    const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 1;
    carousel.classList.toggle("is-overflowing", overflow);
    prev.hidden = !overflow;
    next.hidden = !overflow;
    prev.toggleAttribute("disabled", !overflow || atStart);
    next.toggleAttribute("disabled", !overflow || atEnd);
    prev.setAttribute("aria-disabled", !overflow || atStart ? "true" : "false");
    next.setAttribute("aria-disabled", !overflow || atEnd ? "true" : "false");
  }

  function liveChatScrollFilterTabs(direction = "next") {
    const carousel = liveChatGetFilterTabsCarousel();
    const track = carousel?.querySelector(".lcx-tabs");
    if (!(track instanceof HTMLElement)) {
      return;
    }
    const amount = Math.max(120, Math.round(track.clientWidth * 0.65));
    track.scrollBy({
      left: direction === "prev" ? -amount : amount,
      behavior: "smooth",
    });
  }

  function liveChatScrollActiveFilterTabIntoView() {
    const carousel = liveChatGetFilterTabsCarousel();
    const track = carousel?.querySelector(".lcx-tabs");
    const activeTab = track?.querySelector(".lcx-tab.is-active");
    if (!(activeTab instanceof HTMLElement)) {
      return;
    }
    activeTab.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }

  function liveChatInitFilterTabsCarousel() {
    const carousel = liveChatGetFilterTabsCarousel();
    const track = carousel?.querySelector(".lcx-tabs");
    if (!(carousel instanceof HTMLElement) || !(track instanceof HTMLElement)) {
      return;
    }
    if (track.dataset.lcxTabsCarouselBound !== "true") {
      track.dataset.lcxTabsCarouselBound = "true";
      track.addEventListener("scroll", () => liveChatSyncFilterTabsCarouselNav(carousel), { passive: true });
    }
    liveChatSyncFilterTabsCarouselNav(carousel);
    requestAnimationFrame(() => {
      liveChatScrollActiveFilterTabIntoView();
      liveChatSyncFilterTabsCarouselNav(carousel);
    });
  }

  function liveChatSyncConversationFilterTabs() {
    const tabs = elements.liveChatMount?.querySelector(".lcx-tabs");
    if (!(tabs instanceof HTMLElement)) {
      return;
    }
    tabs.innerHTML = liveChatConversationFilterTabsMarkup();
    liveChatInitFilterTabsCarousel();
  }

  function liveChatFilteredConversations() {
    const query = normalizeText(liveChatRedesignState.search).toLowerCase();
    return liveChatRedesignConversations.filter((conversation) => {
      if (liveChatRedesignState.filter === "unread" && (liveChatPrefsFor(conversation.id).muted || !(Number(conversation.unread) > 0))) {
        return false;
      }
      if (liveChatRedesignState.filter === "starred" && conversation.starred !== true) {
        return false;
      }
      if (
        liveChatRedesignState.filter === "orders"
        && !normalizeText(conversation?.order?.id || conversation?.orderId)
      ) {
        return false;
      }
      if (
        liveChatRedesignState.filter === "returns"
        && !normalizeText(`${conversation?.category} ${(conversation?.tags || []).join(" ")}`).toLowerCase().includes("return")
      ) {
        return false;
      }
      if (
        liveChatRedesignState.filter === "priority"
        && !liveChatIsPriorityConversation(conversation)
      ) {
        return false;
      }
      if (
        liveChatRedesignState.filter === "pending"
        && !liveChatIsPendingConversation(conversation)
      ) {
        return false;
      }
      if (!query) {
        return true;
      }
      return normalizeText(`${conversation.name} ${conversation.preview} ${conversation.about} ${conversation?.order?.id || ""} ${conversation?.category || ""}`).toLowerCase().includes(query);
    }).sort((left, right) => {
      const leftSnoozed = liveChatPrefsFor(left.id).snoozed ? 1 : 0;
      const rightSnoozed = liveChatPrefsFor(right.id).snoozed ? 1 : 0;
      return leftSnoozed - rightSnoozed;
    });
  }

  function liveChatFormatMoney(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount)) {
      return "—";
    }
    try {
      return new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
        maximumFractionDigits: 2,
      }).format(amount);
    } catch (_) {
      return `PHP ${amount.toFixed(2)}`;
    }
  }

  function liveChatOrderFor(conversation) {
    return conversation?.order && typeof conversation.order === "object"
      ? conversation.order
      : {};
  }

  function liveChatStatusClass(value) {
    const status = normalizeText(value).toLowerCase();
    if (/paid|delivered|complete|resolved/.test(status)) {
      return "is-success";
    }
    if (/transit|ship|receive|process|pack/.test(status)) {
      return "is-info";
    }
    if (/cancel|return|refund|failed|priority/.test(status)) {
      return "is-danger";
    }
    return "is-neutral";
  }

  function liveChatProductFor(conversation) {
    const order = liveChatOrderFor(conversation);
    const thread = conversation?.rawThread || conversation;
    const salesPrice = typeof conversation?.productSalesPrice === "number"
      ? conversation.productSalesPrice
      : (typeof thread?.productSalesPrice === "number" ? thread.productSalesPrice : null);
    const originalPrice = Number(conversation?.productOriginalPrice ?? thread?.productOriginalPrice);
    const price = [salesPrice, order.unitPrice, conversation?.productPrice, originalPrice, order.total]
      .map((value) => Number(value))
      .find((value) => Number.isFinite(value) && value >= 0);
    const mediaFallback = Array.isArray(conversation?.media)
      ? conversation.media.find((item) => normalizeText(item?.src || item?.url))
      : null;
    const stock = Number(conversation?.productStock ?? thread?.productStock ?? order.stock);
    const rating = Number(conversation?.productRating ?? thread?.productRating);
    const reviewCount = Number(conversation?.productSold ?? thread?.productSold);
    return {
      name: normalizeText(order.productName || conversation?.productName || thread?.productName || conversation?.product?.name) || "Product inquiry",
      description: normalizeText(conversation?.productDescription || thread?.productDescription || conversation?.about),
      image: normalizeText(
        order.productImage
          || order.productImageUrl
          || order.imageUrl
          || order.mainImageUrl
          || conversation?.productImage
          || conversation?.productImageUrl
          || thread?.productImageUrl
          || conversation?.product?.image
          || conversation?.product?.imageUrl
          || mediaFallback?.src
          || mediaFallback?.url,
      ),
      sku: normalizeText(order.sku || conversation?.sku) || "Linked product",
      color: normalizeText(order.color || conversation?.productColor || conversation?.product?.color),
      price,
      originalPrice: Number.isFinite(originalPrice) && originalPrice > 0 ? originalPrice : null,
      salesPrice: Number.isFinite(salesPrice) && salesPrice >= 0 ? salesPrice : null,
      stock: Number.isFinite(stock) ? stock : null,
      inStock: Number.isFinite(stock) ? stock > 0 : null,
      rating: Number.isFinite(rating) && rating > 0 ? rating : null,
      reviewCount: Number.isFinite(reviewCount) && reviewCount > 0 ? reviewCount : null,
      category: normalizeText(
        order.productCategory
          || order.category
          || conversation?.productCategory
          || thread?.productCategory
          || conversation?.product?.category
          || conversation?.product?.categoryName,
      ),
    };
  }

  function liveChatPinnedProductStateKey(conversation) {
    return normalizeText(conversation?.id || conversation?.buyerId);
  }

  function liveChatIsPinnedProductExpanded(conversation) {
    const stateKey = liveChatPinnedProductStateKey(conversation);
    if (!stateKey) {
      return true;
    }
    return liveChatRedesignState.pinnedProductExpandedByThread[stateKey] !== false;
  }

  function liveChatSyncPinnedProductCurtain(conversation, isExpanded) {
    const slot = elements.liveChatMount?.querySelector(".lcx-pinned-product-slot");
    if (!slot) {
      return;
    }

    slot.classList.toggle("is-expanded", isExpanded);
    slot.classList.toggle("is-collapsed", !isExpanded);

    const curtain = slot.querySelector(".lcx-pinned-product-curtain");
    curtain?.classList.toggle("is-expanded", isExpanded);
    curtain?.classList.toggle("is-collapsed", !isExpanded);

    const card = slot.querySelector(".lcx-pinned-product-card");
    if (card instanceof HTMLElement) {
      card.setAttribute("aria-hidden", isExpanded ? "false" : "true");
    }

    const toggle = slot.querySelector("[data-lcx-action='toggle-pinned-product']");
    if (toggle instanceof HTMLElement) {
      toggle.setAttribute("aria-expanded", isExpanded ? "true" : "false");
      toggle.setAttribute("aria-label", isExpanded ? "Hide pinned product" : "Show pinned product");
      toggle.setAttribute("title", isExpanded ? "Hide pinned product" : "Show pinned product");
    }

    const toggleInner = slot.querySelector(".lcx-pinned-product-curtain__toggle-inner");
    if (toggleInner instanceof HTMLElement) {
      toggleInner.classList.remove("is-pulling", "is-releasing");
      void toggleInner.offsetWidth;
      toggleInner.classList.add(isExpanded ? "is-releasing" : "is-pulling");
      const onAnimationEnd = () => {
        toggleInner.classList.remove("is-pulling", "is-releasing");
        toggleInner.removeEventListener("animationend", onAnimationEnd);
      };
      toggleInner.addEventListener("animationend", onAnimationEnd);
    }
  }

  function liveChatSyncChatPrefToggles(conversation) {
    if (!conversation) {
      return;
    }
    const prefs = liveChatPrefsFor(conversation.id);
    const mount = elements.liveChatMount;
    if (!(mount instanceof HTMLElement)) {
      return;
    }

    const muteToggle = mount.querySelector("[data-lcx-action='mute-chat']");
    if (muteToggle instanceof HTMLElement) {
      muteToggle.classList.toggle("is-on", prefs.muted);
      muteToggle.setAttribute("aria-checked", prefs.muted ? "true" : "false");
    }

    const snoozeToggle = mount.querySelector("[data-lcx-action='snooze-chat']");
    if (snoozeToggle instanceof HTMLElement) {
      snoozeToggle.classList.toggle("is-on", prefs.snoozed);
      snoozeToggle.setAttribute("aria-checked", prefs.snoozed ? "true" : "false");
    }
  }

  function liveChatSyncThreadPrefState(conversation) {
    const threadId = normalizeText(conversation?.id);
    if (!threadId) {
      return;
    }
    const threadEl = elements.liveChatMount?.querySelector(`[data-lcx-thread="${CSS.escape(threadId)}"]`);
    if (!(threadEl instanceof HTMLElement)) {
      return;
    }

    const prefs = liveChatPrefsFor(conversation.id);
    const unread = Math.max(0, Number(conversation.unread) || 0);

    threadEl.classList.toggle("is-muted", prefs.muted);
    threadEl.classList.toggle("is-unread", unread > 0 && !prefs.muted);
    threadEl.classList.toggle("is-priority", liveChatIsPriorityConversation(conversation));

    liveChatApplyThreadSubtitle(threadEl.querySelector(".lcx-thread__preview"), conversation);
    liveChatApplyThreadMeta(threadEl, conversation);

    const meta = threadEl.querySelector(".lcx-thread__meta");
    if (meta instanceof HTMLElement) {
      let mutedBadge = meta.querySelector(".lcx-thread__muted");
      if (prefs.muted) {
        if (!(mutedBadge instanceof HTMLElement)) {
          mutedBadge = document.createElement("span");
          mutedBadge.className = "lcx-thread__muted";
          mutedBadge.setAttribute("aria-label", "Muted");
          mutedBadge.innerHTML = liveChatIcon("mute", 12);
          const statusEl = meta.querySelector(".lcx-thread__status");
          meta.insertBefore(mutedBadge, statusEl || null);
        }
      } else {
        mutedBadge?.remove();
      }

      let priorityBadge = meta.querySelector(".lcx-thread__folder.is-priority");
      const isPriority = liveChatIsPriorityConversation(conversation);
      if (isPriority) {
        if (!(priorityBadge instanceof HTMLElement)) {
          priorityBadge = document.createElement("span");
          priorityBadge.className = "lcx-thread__folder is-priority";
          priorityBadge.setAttribute("aria-label", "Priority");
          priorityBadge.innerHTML = liveChatIcon("list-sort-descending", 12);
          meta.insertBefore(priorityBadge, meta.firstChild);
        }
      } else {
        priorityBadge?.remove();
      }
    }
  }

  function liveChatTogglePinnedProduct() {
    const active = liveChatGetActive();
    if (!active || !liveChatHasPinnedProductContext(active)) {
      return;
    }

    const previousScroll = liveChatCaptureMessageScroll(active.id);
    const stateKey = liveChatPinnedProductStateKey(active);
    const nextExpanded = !liveChatIsPinnedProductExpanded(active);
    if (stateKey) {
      liveChatRedesignState.pinnedProductExpandedByThread[stateKey] = nextExpanded;
    }

    if (elements.liveChatMount?.querySelector("[data-lcx-action='toggle-pinned-product']")) {
      liveChatSyncPinnedProductCurtain(active, nextExpanded);
    } else {
      liveChatRenderBoard({ preserveComposer: liveChatCaptureComposerState() });
    }

    const messageArea = elements.liveChatMount?.querySelector("[data-lcx-message-area]");
    if (messageArea instanceof HTMLElement && previousScroll) {
      const maxScrollTop = Math.max(0, messageArea.scrollHeight - messageArea.clientHeight);
      messageArea.scrollTop = Math.min(previousScroll.scrollTop, maxScrollTop);
    }
  }

  function liveChatFeedbackRatingStarSvg() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/></svg>`;
  }

  function liveChatPinnedProductStarsMarkup(rating) {
    const numericRating = Number(rating);
    const score = Number.isFinite(numericRating)
      ? Math.max(0, Math.min(5, numericRating))
      : 0;
    const stars = Array.from({ length: 5 }, (_, starIndex) => {
      const fillPercent = Math.round(
        Math.max(0, Math.min(100, (score - starIndex) * 100)),
      );
      const starIcon = liveChatFeedbackRatingStarSvg();
      return `
        <span class="lcx-pinned-product-card__star" style="--star-fill: ${fillPercent}%" aria-hidden="true">
          <span class="lcx-pinned-product-card__star-base">${starIcon}</span>
          <span class="lcx-pinned-product-card__star-fill">${starIcon}</span>
        </span>
      `;
    }).join("");
    return `<span class="lcx-pinned-product-card__stars" aria-hidden="true">${stars}</span>`;
  }

  function liveChatPinnedProductMarkup(conversation) {
    if (!conversation || !liveChatHasPinnedProductContext(conversation)) {
      return "";
    }
    const product = liveChatProductFor(conversation);
    const displayPrice = Number.isFinite(product.salesPrice) ? product.salesPrice : product.price;
    const hasDiscount = Number.isFinite(product.originalPrice)
      && Number.isFinite(displayPrice)
      && product.originalPrice > displayPrice;
    const numericRating = Number(product.rating);
    const ratingScore = Number.isFinite(numericRating)
      ? Math.max(0, Math.min(5, numericRating))
      : 0;
    const ratingLabel = ratingScore.toFixed(1);
    const categoryLabel = product.category || "Uncategorized";
    const stockLabel = product.inStock === true
      ? "In Stock"
      : product.inStock === false
        ? "Out of Stock"
        : "Linked to chat";
    const stockClass = product.inStock === true
      ? "is-in-stock"
      : product.inStock === false
        ? "is-out-of-stock"
        : "is-neutral";
    const isExpanded = liveChatIsPinnedProductExpanded(conversation);

    return `
      <div class="lcx-pinned-product-curtain${isExpanded ? " is-expanded" : " is-collapsed"}">
        <div class="lcx-pinned-product-curtain__panel">
          <article class="lcx-pinned-product-card" aria-label="Pinned product" aria-hidden="${isExpanded ? "false" : "true"}">
            <div class="lcx-pinned-product-card__media">
              ${
                product.image
                  ? `<img src="${liveChatEscape(product.image)}" alt="${liveChatEscape(product.name)}" loading="lazy" onerror="this.remove()" />`
                  : `<span class="lcx-pinned-product-card__fallback">${liveChatIcon("package", 32)}</span>`
              }
            </div>
            <div class="lcx-pinned-product-card__content">
              <div class="lcx-pinned-product-card__title-row">
                <h3 class="lcx-pinned-product-card__title">${liveChatEscape(product.name)}</h3>
                <span class="lcx-pinned-product-card__stock ${stockClass}"><span aria-hidden="true"></span>${liveChatEscape(stockLabel)}</span>
              </div>
              <div class="lcx-pinned-product-card__category-rating">
                <span class="product-variant-addon-chip lcx-pinned-product-card__category">
                  <span class="product-variant-addon-chip__label">${liveChatEscape(categoryLabel)}</span>
                </span>
                <span class="lcx-pinned-product-card__rating-row" aria-label="${liveChatEscape(`${ratingLabel} out of 5 stars`)}">
                  ${liveChatPinnedProductStarsMarkup(ratingScore)}
                  <span class="lcx-pinned-product-card__rating-label">${liveChatEscape(ratingLabel)}</span>
                </span>
              </div>
              <div class="lcx-pinned-product-card__pricing">
                <strong class="lcx-pinned-product-card__price">${liveChatFormatMoney(displayPrice)}</strong>
                ${hasDiscount ? `<span class="lcx-pinned-product-card__original">${liveChatFormatMoney(product.originalPrice)}</span>` : ""}
              </div>
            </div>
          </article>
        </div>
      </div>
      <div class="lcx-pinned-product-curtain__toggle-wrap">
      <button
        type="button"
        class="lcx-pinned-product-curtain__toggle"
        data-lcx-action="toggle-pinned-product"
        aria-expanded="${isExpanded ? "true" : "false"}"
        aria-label="${isExpanded ? "Hide pinned product" : "Show pinned product"}"
        title="${isExpanded ? "Hide pinned product" : "Show pinned product"}"
      ><span class="lcx-pinned-product-curtain__toggle-inner" aria-hidden="true">${liveChatIcon("pin", 14)}</span></button>
      </div>`;
  }

  function liveChatTagMarkup(tag) {
    const normalizedTag = normalizeText(tag);
    const tagClass = /vip/i.test(normalizedTag)
      ? "is-blue"
      : /return|priority|urgent|fragile/i.test(normalizedTag)
        ? "is-red"
        : /cod|payment/i.test(normalizedTag)
          ? "is-amber"
          : "is-violet";
    return `<span class="lcx-tag ${tagClass}">${liveChatEscape(normalizedTag)}</span>`;
  }

  function liveChatTimelineMarkup(active) {
    const order = liveChatOrderFor(active);
    const entries = Array.isArray(active?.timeline) && active.timeline.length
      ? active.timeline
      : [
          { label: "Order placed", time: order.placedAt || "—", icon: "package", tone: "blue" },
          { label: order.shippingStatus || "Order processing", time: order.expectedDelivery || "In progress", icon: "truck", tone: "green" },
          { label: "Message from customer", time: active?.time || "Recently", icon: "message", tone: "violet" },
        ];
    return entries.map((entry) => `
      <li class="lcx-timeline__item is-${liveChatEscape(entry.tone || "blue")}">
        <span class="lcx-timeline__dot">${liveChatIcon(entry.icon === "message" ? "user" : entry.icon || "clock", 13)}</span>
        <span class="lcx-timeline__copy"><strong>${liveChatEscape(entry.label)}</strong>${entry.note ? `<small>${liveChatEscape(entry.note)}</small>` : ""}</span>
        <time>${liveChatEscape(entry.time || "")}</time>
      </li>`).join("");
  }

  function liveChatThreadUnreadCopy(unreadCount) {
    const count = Math.max(0, Number(unreadCount) || 0);
    if (count <= 0) {
      return "";
    }
    if (count > 9) {
      return "9+ messages unread";
    }
    return count === 1 ? "1 message unread" : `${count} messages unread`;
  }

  function liveChatThreadSubtitleContent(conversation) {
    const unread = Math.max(0, Number(conversation?.unread) || 0);
    const prefs = liveChatPrefsFor(conversation?.id);
    if (liveChatIsCustomerTyping(conversation)) {
      return { text: "typing...", mode: "typing" };
    }
    if (unread > 0 && !prefs.muted) {
      return { text: liveChatThreadUnreadCopy(unread), mode: "unread" };
    }
    return { text: conversation?.preview || "No messages yet", mode: "preview" };
  }

  function liveChatConversationLastMessage(conversation) {
    const messages = Array.isArray(conversation?.messages) ? conversation.messages : [];
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      if (normalizeText(message?.deletedAt)) {
        continue;
      }
      return message;
    }
    return null;
  }

  function liveChatThreadReceiptMarkup(conversation) {
    if (!liveChatThreadTimeContent(conversation)) {
      return "";
    }
    const lastMessage = liveChatConversationLastMessage(conversation);
    if (!lastMessage || lastMessage.side !== "support") {
      return "";
    }
    return liveChatReceiptMarkup(liveChatSupportMessageReceiptStatus(lastMessage, conversation));
  }

  function liveChatThreadTimeContent(conversation) {
    const unread = Math.max(0, Number(conversation?.unread) || 0);
    const prefs = liveChatPrefsFor(conversation?.id);
    if (unread > 0 && !prefs.muted) {
      return "";
    }
    return normalizeText(conversation?.time);
  }

  function liveChatApplyThreadSubtitle(preview, conversation) {
    if (!(preview instanceof HTMLElement)) {
      return;
    }
    const subtitle = liveChatThreadSubtitleContent(conversation);
    preview.textContent = subtitle.text;
    preview.classList.toggle("is-typing", subtitle.mode === "typing");
    preview.classList.toggle("is-unread-subtitle", subtitle.mode === "unread");
  }

  function liveChatApplyThreadMeta(threadEl, conversation) {
    if (!(threadEl instanceof HTMLElement)) {
      return;
    }
    const meta = threadEl.querySelector(".lcx-thread__meta");
    if (!(meta instanceof HTMLElement)) {
      return;
    }
    const threadTime = liveChatThreadTimeContent(conversation);
    const receiptMarkup = liveChatThreadReceiptMarkup(conversation);
    let statusEl = meta.querySelector(".lcx-thread__status");
    if (!threadTime && !receiptMarkup) {
      statusEl?.remove();
      return;
    }
    if (!(statusEl instanceof HTMLElement)) {
      statusEl = document.createElement("span");
      statusEl.className = "lcx-thread__status";
      meta.append(statusEl);
    }
    statusEl.innerHTML = `${receiptMarkup}${threadTime ? `<time>${liveChatEscape(threadTime)}</time>` : ""}`;
  }

  function liveChatThreadMarkup(conversation) {
    const unread = Math.max(0, Number(conversation.unread) || 0);
    const prefs = liveChatPrefsFor(conversation.id);
    const handoff = liveChatNormalizeAgentHandoff(conversation.agentHandoff);
    const subtitle = liveChatThreadSubtitleContent(conversation);
    const threadTime = liveChatThreadTimeContent(conversation);
    const threadReceipt = liveChatThreadReceiptMarkup(conversation);
    const requestBadge = handoff.status === "pending"
      ? `<span class="lcx-thread__agent-request" aria-label="Buyer requests agent"><span class="lcx-thread__agent-request-dot" aria-hidden="true"></span><span>Request Agent</span></span>`
      : "";
    const folderBadges = [
      liveChatIsPriorityConversation(conversation)
        ? `<span class="lcx-thread__folder is-priority" aria-label="Priority">${liveChatIcon("list-sort-descending", 12)}</span>`
        : "",
      liveChatIsPendingConversation(conversation)
        ? `<span class="lcx-thread__folder is-pending" aria-label="Pending">${liveChatIcon("clock", 12)}</span>`
        : "",
    ].join("");
    return `
      <button type="button" class="lcx-thread${conversation.id === liveChatRedesignState.activeId ? " is-active" : ""}${unread && !prefs.muted ? " is-unread" : ""}${prefs.muted ? " is-muted" : ""}${handoff.status === "pending" ? " has-agent-request" : ""}${liveChatIsPriorityConversation(conversation) ? " is-priority" : ""}${liveChatIsPendingConversation(conversation) ? " is-pending" : ""}" data-lcx-thread="${liveChatEscape(conversation.id)}" aria-current="${conversation.id === liveChatRedesignState.activeId ? "true" : "false"}">
        ${liveChatAvatar(conversation, "lcx-avatar--thread", { showStatus: true })}
        <span class="lcx-thread__body">
          <span class="lcx-thread__topline">
            <strong>${liveChatEscape(conversation.name)}</strong>
            <span class="lcx-thread__meta">
              ${folderBadges}
              ${prefs.muted ? `<span class="lcx-thread__muted" aria-label="Muted">${liveChatIcon("mute", 12)}</span>` : ""}
              ${threadTime || threadReceipt ? `<span class="lcx-thread__status">${threadReceipt}${threadTime ? `<time>${liveChatEscape(threadTime)}</time>` : ""}</span>` : ""}
            </span>
          </span>
          <span class="lcx-thread__bottomline">
            <span class="lcx-thread__preview${subtitle.mode === "typing" ? " is-typing" : ""}${subtitle.mode === "unread" ? " is-unread-subtitle" : ""}">${liveChatEscape(subtitle.text)}</span>
            ${requestBadge}
          </span>
        </span>
      </button>`;
  }

  function liveChatFilterLabel(value = liveChatRedesignState.filter) {
    switch (value) {
      case "unread":
        return "Unread";
      case "orders":
        return "Orders";
      case "returns":
        return "Returns";
      case "priority":
        return "Priority";
      case "pending":
        return "Pending";
      default:
        return "All";
    }
  }

  function liveChatEmptyThreadsLabel() {
    if (normalizeText(liveChatRedesignState.search)) {
      return "Not Found";
    }
    if (liveChatRedesignState.filter !== "all") {
      return `No conversations in ${liveChatFilterLabel()} yet.`;
    }
    return "No conversations yet.";
  }

  function liveChatEmptyThreadsCopy() {
    if (normalizeText(liveChatRedesignState.search)) {
      return "No conversations match your search.";
    }
    if (liveChatRedesignState.filter !== "all") {
      return "Try another conversation filter.";
    }
    if (authState?.role === "employee") {
      return "Only buyers assigned to you by the store admin will appear here.";
    }
    return "All your conversations will appear here.";
  }

  function liveChatEmptyThreadsMarkup() {
    const label = liveChatEmptyThreadsLabel();
    const copy = liveChatEmptyThreadsCopy();
    if (normalizeText(liveChatRedesignState.search) && window.GMS_ADMIN_SEARCH_NOT_FOUND?.markup) {
      return window.GMS_ADMIN_SEARCH_NOT_FOUND.markup({
        compact: true,
        className: "lcx-empty-list",
        label,
        copy,
      });
    }
    return `
      <div class="lcx-empty-list lcx-inbox-empty">
        <span class="lcx-inbox-empty__badge" aria-hidden="true">${liveChatIcon("chat", 22)}</span>
        <strong>${liveChatEscape(label)}</strong>
        ${copy ? `<p>${liveChatEscape(copy)}</p>` : ""}
      </div>`;
  }

  function liveChatEmptyHeroIllustration() {
    return `
      <svg class="lcx-empty-hero__art" viewBox="0 0 280 214" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path class="lcx-empty-hero__ground" d="M46 188h188" />
        <path class="lcx-empty-hero__deco" d="M44 122c24-8 40 10 32 30-24 6-42-10-32-30Z" />
        <ellipse class="lcx-empty-hero__deco" cx="56" cy="78" rx="22" ry="12" />
        <path class="lcx-empty-hero__deco" d="M218 72c22 12 18 34-6 40-8-22 6-42 6-40Z" />
        <ellipse class="lcx-empty-hero__deco" cx="226" cy="152" rx="20" ry="11" />
        <path class="lcx-empty-hero__star" d="M214 38 219.8 50.4 233.6 52.4 223.6 62.1 226 76 214 69.6 202 76 204.4 62.1 194.4 52.4 208.2 50.4Z" />
        <rect class="lcx-empty-hero__bubble-soft" x="86" y="46" width="118" height="104" rx="34" />
        <rect class="lcx-empty-hero__bubble" x="80" y="38" width="118" height="104" rx="34" />
        <circle class="lcx-empty-hero__dot" cx="118" cy="90" r="8" />
        <circle class="lcx-empty-hero__dot" cx="139" cy="90" r="8" />
        <circle class="lcx-empty-hero__dot" cx="160" cy="90" r="8" />
      </svg>`;
  }

  function liveChatEmptyConversationMarkup() {
    return `
      <div class="lcx-empty-inbox">
        <div class="lcx-empty-hero">
          ${liveChatEmptyHeroIllustration()}
          <strong>Your conversations will appear here</strong>
          <p>Customer chats from the app will show up here once a buyer messages your store.</p>
        </div>
        <div class="lcx-empty-composer" aria-hidden="true">
          <div class="lcx-empty-composer__field">
            <span class="lcx-empty-composer__tool">${liveChatIcon("plus", 18)}</span>
            <input type="text" placeholder="Type a message..." disabled readonly tabindex="-1" />
            <span class="lcx-empty-composer__tool">${liveChatIcon("face-slightly-smiling", 18)}</span>
            <span class="lcx-empty-composer__tool">${liveChatIcon("mic", 18)}</span>
          </div>
          <span class="lcx-empty-composer__send">${liveChatIcon("send", 18)}</span>
        </div>
      </div>`;
  }

  function liveChatEmptyDetailsMarkup() {
    const hasConversations = liveChatRedesignConversations.length > 0;
    const title = hasConversations ? "No chat selected" : "No chat info yet";
    const copy = hasConversations
      ? "Select a conversation to view customer details, shared media, files, and order history."
      : "Customer information will appear here once a buyer starts a conversation.";
    return `
      <div class="lcx-details-empty">
        ${liveChatDetailsHeadMarkup("Chat info", { centered: true })}
        <div class="lcx-details-empty__body">
          <strong>${liveChatEscape(title)}</strong>
          <p>${liveChatEscape(copy)}</p>
        </div>
      </div>`;
  }

  function liveChatSyncLocalSearchClearButton() {
    const input = elements.liveChatMount?.querySelector("[data-lcx-local-search]");
    const clearButton = elements.liveChatMount?.querySelector("[data-lcx-action='clear-local-search']");
    if (!(clearButton instanceof HTMLElement)) {
      return;
    }
    clearButton.hidden = !(input instanceof HTMLInputElement && normalizeText(input.value));
  }

  function liveChatClearLocalSearch(options = {}) {
    liveChatRedesignState.search = "";
    const input = elements.liveChatMount?.querySelector("[data-lcx-local-search]");
    if (input instanceof HTMLInputElement) {
      input.value = "";
      if (options.focus !== false) {
        input.focus();
      }
    }
    elements.liveChatMount?.querySelectorAll("[data-lcx-thread]").forEach((thread) => {
      thread.hidden = false;
    });
    liveChatSyncLocalSearchClearButton();
  }

  function liveChatPromptCompose() {
    const search = elements.liveChatMount?.querySelector("[data-lcx-local-search]");
    if (search instanceof HTMLInputElement) {
      search.focus();
    }
    liveChatShowToast(
      liveChatRedesignConversations.length
        ? "Select an existing customer thread to start a conversation."
        : "Search for a customer, or wait for a new conversation to appear.",
    );
  }

  function liveChatSupportMessageReceiptStatus(message, active) {
    if (message?.side !== "support" || normalizeText(message?.deletedAt)) {
      return null;
    }
    const messageMs = new Date(normalizeText(message?.timestamp)).getTime();
    if (Number.isNaN(messageMs)) {
      return "sent";
    }
    const lastReadAt = normalizeText(active?.lastReadAt || active?.rawThread?.lastReadAt);
    const readMs = lastReadAt ? new Date(lastReadAt).getTime() : NaN;
    if (Number.isFinite(readMs) && messageMs <= readMs) {
      return "seen";
    }
    if (Number.isFinite(readMs)) {
      return "delivered";
    }
    return "sent";
  }

  function liveChatReceiptMarkup(status) {
    if (!status) {
      return "";
    }
    const checkIcon = `<span class="lcx-receipt__check" aria-hidden="true">${mainLiveChatReceiptCheckIconMarkup}</span>`;
    if (status === "sent") {
      return `<span class="lcx-receipt lcx-receipt--sent" aria-label="Sent">${checkIcon}</span>`;
    }
    const receiptClass = status === "seen" ? "lcx-receipt--seen" : "lcx-receipt--delivered";
    const receiptLabel = status === "seen" ? "Seen" : "Delivered";
    return `<span class="lcx-receipt ${receiptClass}" aria-label="${receiptLabel}">${checkIcon}<span class="lcx-receipt__check lcx-receipt__check--second" aria-hidden="true">${mainLiveChatReceiptCheckIconMarkup}</span></span>`;
  }

  function liveChatVideoPlayerMarkup(source, label, inlineMeta = "") {
    return `
      <div class="lcx-message-video" data-lcx-message-video>
        <video
          class="lcx-message-video__media is-lazy-pending"
          data-lcx-lazy-src="${liveChatEscape(source)}"
          data-lcx-lazy-kind="video"
          data-lcx-lazy-policy="tap"
          muted
          playsinline
          preload="none"
          tabindex="-1"
          aria-label="${label}"
        ></video>
        <div class="lcx-message-video__scrim" aria-hidden="true"></div>
        <button
          type="button"
          class="lcx-message-video__play"
          data-lcx-action="toggle-message-video"
          aria-label="Play video"
          title="Play video"
        >${liveChatIcon("play", 22)}</button>
        <button
          type="button"
          class="lcx-message-video__expand"
          data-lcx-action="open-media-viewer"
          data-lcx-media-kind="video"
          data-lcx-media-src="${liveChatEscape(source)}"
          data-lcx-media-label="${label}"
          aria-label="View video"
          title="View video"
        ><span class="lcx-message-video__expand-icon" aria-hidden="true">${liveChatIcon("scan", 22)}</span></button>
        <div class="lcx-message-video__controls">
          <button
            type="button"
            class="lcx-message-video__control"
            data-lcx-action="toggle-message-video"
            aria-label="Pause video"
            title="Pause video"
          >${liveChatIcon("pause", 14)}</button>
          <div class="lcx-message-video__track" aria-hidden="true">
            <span class="lcx-message-video__track-fill"></span>
          </div>
        </div>
        ${inlineMeta}
      </div>`;
  }

  function liveChatSyncInlineVideoProgress(shell, video) {
    if (!(shell instanceof HTMLElement) || !(video instanceof HTMLVideoElement)) {
      return;
    }
    const fill = shell.querySelector(".lcx-message-video__track-fill");
    if (!(fill instanceof HTMLElement) || !Number.isFinite(video.duration) || video.duration <= 0) {
      return;
    }
    fill.style.width = `${Math.min(100, (video.currentTime / video.duration) * 100)}%`;
  }

  function liveChatCollectMediaViewerGallery(kind = "all") {
    const active = liveChatGetActive();
    if (active) {
      return liveChatConversationMedia(active)
        .filter((item) => {
          if (kind === "image") {
            return item.kind === "image";
          }
          if (kind === "video") {
            return item.kind === "video";
          }
          return true;
        })
        .map((item) => ({
          kind: normalizeText(item.kind) || "image",
          src: normalizeText(item.src || item.url),
          label: normalizeText(item.alt || item.name) || (item.kind === "video" ? "Video" : "Photo"),
          side: normalizeText(item.messageSide) || "support",
        }))
        .filter((item) => item.src);
    }
    const mount = elements.liveChatMount;
    if (!mount) {
      return [];
    }
    const items = [];
    const seen = new Set();
    [...mount.querySelectorAll('[data-lcx-action="open-media-viewer"]')].reverse().forEach((button) => {
      if (!(button instanceof HTMLElement)) {
        return;
      }
      const itemKind = normalizeText(button.dataset.lcxMediaKind) || "image";
      if (kind === "image" && itemKind !== "image") {
        return;
      }
      if (kind === "video" && itemKind !== "video") {
        return;
      }
      const src = normalizeText(button.dataset.lcxMediaSrc);
      if (!src || seen.has(src)) {
        return;
      }
      seen.add(src);
      items.push({
        kind: itemKind,
        src,
        label: normalizeText(button.dataset.lcxMediaLabel) || (itemKind === "video" ? "Video" : "Photo"),
        side: normalizeText(button.dataset.lcxMediaSide) || "support",
      });
    });
    return items;
  }

  function liveChatFindMessageVideoForSrc(src = "") {
    const normalized = normalizeText(src);
    if (!normalized) {
      return null;
    }
    const shells = elements.liveChatMount?.querySelectorAll("[data-lcx-message-video]") || [];
    for (const shell of shells) {
      const inlineVideo = shell.querySelector("video.lcx-message-video__media");
      if (!(inlineVideo instanceof HTMLVideoElement)) {
        continue;
      }
      const inlineSrc = normalizeText(
        inlineVideo.currentSrc || inlineVideo.src || inlineVideo.getAttribute("src"),
      );
      if (inlineSrc === normalized) {
        return inlineVideo;
      }
    }
    return null;
  }

  function liveChatGetMediaViewerViewportMaxHeight() {
    return Math.min(window.innerHeight * 0.86 - 68, 752);
  }

  function liveChatLockPageForMediaViewer() {
    if (document.body.dataset.lcxMediaViewerScrollLock === "true") {
      return;
    }
    document.body.dataset.lcxMediaViewerScrollLock = "true";
    const messageArea = elements.liveChatMount?.querySelector("[data-lcx-message-area]");
    const threadList = elements.liveChatMount?.querySelector(".lcx-thread-list");
    if (messageArea instanceof HTMLElement) {
      document.body.dataset.lcxSavedMessageScroll = String(messageArea.scrollTop);
    }
    if (threadList instanceof HTMLElement) {
      document.body.dataset.lcxSavedThreadScroll = String(threadList.scrollTop);
    }
    document.documentElement.classList.add("lcx-media-viewer-open");
    document.body.classList.add("lcx-media-viewer-open");
  }

  function liveChatUnlockPageForMediaViewer() {
    if (document.body.dataset.lcxMediaViewerScrollLock !== "true") {
      return;
    }
    delete document.body.dataset.lcxMediaViewerScrollLock;
    document.documentElement.classList.remove("lcx-media-viewer-open");
    document.body.classList.remove("lcx-media-viewer-open");
    const messageScroll = Number(document.body.dataset.lcxSavedMessageScroll);
    const threadScroll = Number(document.body.dataset.lcxSavedThreadScroll);
    delete document.body.dataset.lcxSavedMessageScroll;
    delete document.body.dataset.lcxSavedThreadScroll;
    const messageArea = elements.liveChatMount?.querySelector("[data-lcx-message-area]");
    const threadList = elements.liveChatMount?.querySelector(".lcx-thread-list");
    if (messageArea instanceof HTMLElement && Number.isFinite(messageScroll)) {
      messageArea.scrollTop = messageScroll;
    }
    if (threadList instanceof HTMLElement && Number.isFinite(threadScroll)) {
      threadList.scrollTop = threadScroll;
    }
  }

  function liveChatApplyMediaViewerShellLock(viewer, fit) {
    if (!(viewer instanceof HTMLElement) || !fit) {
      return;
    }
    const shell = viewer.querySelector(".lcx-media-viewer__shell");
    const viewport = viewer.querySelector("[data-lcx-media-viewer-viewport]");
    if (!(shell instanceof HTMLElement) || !(viewport instanceof HTMLElement)) {
      return;
    }
    const shellWidth = Math.min(window.innerWidth * 0.9, 980, fit.fitWidth);
    const viewportHeight = Math.min(fit.fitHeight, liveChatGetMediaViewerViewportMaxHeight());
    shell.style.width = `${Math.round(shellWidth)}px`;
    viewport.style.height = `${Math.round(viewportHeight)}px`;
    viewer.classList.add("is-shell-locked");
    viewer.dataset.lcxShellLocked = "true";
  }

  function liveChatClearMediaViewerShellLock(viewer) {
    if (!(viewer instanceof HTMLElement)) {
      return;
    }
    const shell = viewer.querySelector(".lcx-media-viewer__shell");
    const viewport = viewer.querySelector("[data-lcx-media-viewer-viewport]");
    if (shell instanceof HTMLElement) {
      shell.style.width = "";
    }
    if (viewport instanceof HTMLElement) {
      viewport.style.height = "";
    }
    viewer.classList.remove("is-shell-locked");
    delete viewer.dataset.lcxShellLocked;
  }

  function liveChatMediaViewerScrollGuard(event) {
    const viewer = document.querySelector("[data-lcx-media-viewer]:not([hidden])");
    if (!(viewer instanceof HTMLElement)) {
      return;
    }
    const target = event.target instanceof Node ? event.target : null;
    if (target && viewer.contains(target)) {
      return;
    }
    event.preventDefault();
  }

  function liveChatMediaDownloadFilename(src, label = "") {
    const fromLabel = normalizeText(label).replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "");
    if (fromLabel) {
      return fromLabel.includes(".") ? fromLabel : `${fromLabel}.jpg`;
    }
    try {
      const url = new URL(src, window.location.origin);
      const basename = url.pathname.split("/").filter(Boolean).pop() || "";
      if (basename.includes(".")) {
        return basename;
      }
    } catch (_) {
    }
    return "buyer-image.jpg";
  }

  function liveChatSyncMediaViewerDownload(viewer) {
    if (!(viewer instanceof HTMLElement)) {
      return;
    }
    const downloadButton = viewer.querySelector("[data-lcx-action='download-media-image']");
    const canDownload = viewer.classList.contains("is-image")
      && normalizeText(viewer.dataset.lcxMediaSide) === "customer";
    if (downloadButton instanceof HTMLElement) {
      downloadButton.hidden = !canDownload;
    }
  }

  async function liveChatDownloadMediaViewerImage() {
    const viewer = document.querySelector("[data-lcx-media-viewer]:not([hidden])");
    if (!(viewer instanceof HTMLElement)) {
      return;
    }
    if (!viewer.classList.contains("is-image") || normalizeText(viewer.dataset.lcxMediaSide) !== "customer") {
      return;
    }
    const src = normalizeText(viewer.dataset.lcxCurrentSrc);
    if (!src) {
      return;
    }
    const filename = liveChatMediaDownloadFilename(src, viewer.dataset.lcxCurrentLabel || "");
    try {
      const response = await fetch(src, { credentials: "same-origin" });
      if (!response.ok) {
        throw new Error("Unable to download image.");
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
      liveChatShowToast("Image downloaded.");
    } catch (_) {
      const link = document.createElement("a");
      link.href = src;
      link.download = filename;
      link.target = "_blank";
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  }

  function liveChatCloseMediaViewer() {
    const viewer = document.querySelector("[data-lcx-media-viewer]");
    if (!(viewer instanceof HTMLElement)) {
      return;
    }
    viewer.dataset.lcxMediaRequestId = String((Number(viewer.dataset.lcxMediaRequestId) || 0) + 1);
    const video = viewer.querySelector("[data-lcx-media-viewer-video]");
    const sourceSrc = normalizeText(viewer.dataset.lcxSourceVideoSrc);
    const modalTime = video instanceof HTMLVideoElement && Number.isFinite(video.currentTime)
      ? video.currentTime
      : Number(viewer.dataset.lcxSourceVideoTime) || 0;

    if (sourceSrc) {
      const shells = elements.liveChatMount?.querySelectorAll("[data-lcx-message-video]") || [];
      shells.forEach((shell) => {
        const inlineVideo = shell.querySelector("video.lcx-message-video__media");
        if (!(inlineVideo instanceof HTMLVideoElement)) {
          return;
        }
        if (normalizeText(inlineVideo.currentSrc || inlineVideo.src) !== sourceSrc
          && normalizeText(inlineVideo.getAttribute("src")) !== sourceSrc) {
          return;
        }
        if (Number.isFinite(modalTime) && modalTime > 0) {
          try {
            inlineVideo.currentTime = modalTime;
          } catch (_) {
          }
        }
        liveChatSyncInlineVideoProgress(shell, inlineVideo);
        liveChatSetVideoPlayingState(shell, !inlineVideo.paused);
      });
    }

    if (video instanceof HTMLVideoElement) {
      video.pause();
      video.removeAttribute("src");
      video.load();
      liveChatSetMediaSkeletonState(video, false);
    }
    const image = viewer.querySelector("[data-lcx-media-viewer-image]");
    if (image instanceof HTMLImageElement) {
      image.removeAttribute("src");
      liveChatSetMediaSkeletonState(image, false);
      liveChatResetMediaViewerImageLayout(image);
    }
    const viewport = viewer.querySelector("[data-lcx-media-viewer-viewport]");
    if (viewport instanceof HTMLElement) {
      viewport.scrollLeft = 0;
      viewport.scrollTop = 0;
    }
    viewer.hidden = true;
    viewer.classList.remove("is-open", "is-image", "is-video", "is-zoomed");
    liveChatClearMediaViewerShellLock(viewer);
    liveChatUnlockPageForMediaViewer();
    viewer.dataset.lcxZoom = "1";
    delete viewer.dataset.lcxSourceVideoSrc;
    delete viewer.dataset.lcxSourceVideoTime;
    delete viewer.dataset.lcxGalleryIndex;
    delete viewer.dataset.lcxGalleryKind;
    delete viewer.dataset.lcxCurrentSrc;
    delete viewer.dataset.lcxCurrentLabel;
    delete viewer.dataset.lcxMediaSide;
  }

  function liveChatSyncMediaViewerNav(viewer, gallery = [], index = 0) {
    if (!(viewer instanceof HTMLElement)) {
      return;
    }
    const prev = viewer.querySelector("[data-lcx-action='media-prev']");
    const next = viewer.querySelector("[data-lcx-action='media-next']");
    const hasGallery = Array.isArray(gallery) && gallery.length > 1;
    viewer.classList.toggle("has-gallery", hasGallery);
    if (prev instanceof HTMLElement) {
      prev.hidden = !hasGallery;
      prev.disabled = !hasGallery;
    }
    if (next instanceof HTMLElement) {
      next.hidden = !hasGallery;
      next.disabled = !hasGallery;
    }
    viewer.dataset.lcxGalleryIndex = String(Math.max(0, Number(index) || 0));
  }

  function liveChatShowMediaViewerGalleryItem(delta = 0) {
    const viewer = document.querySelector("[data-lcx-media-viewer]");
    if (!(viewer instanceof HTMLElement) || viewer.hidden) {
      return;
    }
    if (viewer.classList.contains("is-zoomed")) {
      return;
    }
    const gallery = liveChatCollectMediaViewerGallery("all");
    if (gallery.length <= 1) {
      liveChatSyncMediaViewerNav(viewer, gallery, 0);
      return;
    }
    const currentIndex = Number(viewer.dataset.lcxGalleryIndex);
    const safeIndex = Number.isInteger(currentIndex) ? currentIndex : 0;
    const nextIndex = (safeIndex + Number(delta || 0) + gallery.length) % gallery.length;
    const item = gallery[nextIndex];
    if (!item) {
      return;
    }
    const sourceVideo = item.kind === "video" ? liveChatFindMessageVideoForSrc(item.src) : null;
    const currentTime = sourceVideo instanceof HTMLVideoElement
      ? Number(sourceVideo.currentTime) || 0
      : 0;
    liveChatOpenMediaViewer({
      kind: item.kind,
      src: item.src,
      label: item.label,
      mediaSide: item.side,
      galleryIndex: nextIndex,
      gallery,
      currentTime,
      sourceVideo,
      autoPlayVideo: false,
    });
  }

  function liveChatEnsureMediaViewer() {
    let viewer = document.querySelector("[data-lcx-media-viewer]");
    if (viewer instanceof HTMLElement && (
      !viewer.querySelector("[data-lcx-media-viewer-viewport]")
      || !viewer.querySelector("[data-lcx-action='media-pan-next']")
      || !viewer.querySelector("[data-lcx-action='download-media-image']")
    )) {
      viewer.remove();
      viewer = null;
    }
    if (viewer instanceof HTMLElement) {
      liveChatObserveMediaSkeletons(viewer);
      return viewer;
    }
    viewer = document.createElement("div");
    viewer.className = "lcx-media-viewer";
    viewer.dataset.lcxMediaViewer = "";
    viewer.hidden = true;
    viewer.innerHTML = `
      <div class="lcx-media-viewer__backdrop" data-lcx-action="close-media-viewer"></div>
      <div class="lcx-media-viewer__dialog" role="dialog" aria-modal="true" aria-label="Media viewer">
        <button type="button" class="lcx-media-viewer__nav lcx-media-viewer__nav--prev" data-lcx-action="media-prev" aria-label="Previous photo" hidden>${liveChatIcon("back", 22)}</button>
        <button type="button" class="lcx-media-viewer__nav lcx-media-viewer__nav--next" data-lcx-action="media-next" aria-label="Next photo" hidden>${liveChatIcon("chevron", 22)}</button>
        <div class="lcx-media-viewer__shell">
          <div class="lcx-media-viewer__viewport" data-lcx-media-viewer-viewport>
            <button type="button" class="lcx-media-viewer__pan lcx-media-viewer__pan--prev" data-lcx-action="media-pan-prev" aria-label="Pan left" hidden>${liveChatIcon("back", 20)}</button>
            <button type="button" class="lcx-media-viewer__pan lcx-media-viewer__pan--next" data-lcx-action="media-pan-next" aria-label="Pan right" hidden>${liveChatIcon("chevron", 20)}</button>
            <div class="lcx-media-viewer__media-frame">
              <button type="button" class="lcx-media-viewer__close" data-lcx-action="close-media-viewer" aria-label="Close media viewer">${liveChatIcon("close", 18)}</button>
              <img class="lcx-media-viewer__image" data-lcx-media-viewer-image alt="" hidden />
              <video class="lcx-media-viewer__video" data-lcx-media-viewer-video controls playsinline preload="metadata" hidden></video>
            </div>
          </div>
          <footer class="lcx-media-viewer__footer">
            <div class="lcx-media-viewer__footer-actions">
              <div class="lcx-media-viewer__toolbar" data-lcx-media-viewer-toolbar hidden>
                <button type="button" class="lcx-media-viewer__zoom-out" data-lcx-action="media-zoom-out" aria-label="Zoom out">−</button>
                <button type="button" class="lcx-media-viewer__zoom-reset" data-lcx-action="media-zoom-reset" aria-label="Reset zoom">100%</button>
                <button type="button" class="lcx-media-viewer__zoom-in" data-lcx-action="media-zoom-in" aria-label="Zoom in">+</button>
                <button
                  type="button"
                  class="lcx-media-viewer__download"
                  data-lcx-action="download-media-image"
                  aria-label="Download image"
                  title="Download image"
                  hidden
                >${liveChatIcon("download", 16)}<span>Download</span></button>
              </div>
            </div>
          </footer>
        </div>
      </div>`;
    document.body.appendChild(viewer);
    liveChatObserveMediaSkeletons(viewer);

    viewer.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const actionButton = target?.closest("[data-lcx-action]");
      if (!(actionButton instanceof HTMLElement)) {
        return;
      }
      const action = actionButton.dataset.lcxAction || "";
      if (action === "close-media-viewer") {
        liveChatCloseMediaViewer();
        return;
      }
      if (action === "media-prev") {
        liveChatShowMediaViewerGalleryItem(-1);
        return;
      }
      if (action === "media-next") {
        liveChatShowMediaViewerGalleryItem(1);
        return;
      }
      if (action === "media-zoom-in") {
        liveChatAdjustMediaViewerZoom(0.25);
        return;
      }
      if (action === "media-zoom-out") {
        liveChatAdjustMediaViewerZoom(-0.25);
        return;
      }
      if (action === "media-zoom-reset") {
        liveChatSetMediaViewerZoom(1);
        return;
      }
      if (action === "media-pan-prev") {
        liveChatPanMediaViewer("prev");
        return;
      }
      if (action === "media-pan-next") {
        liveChatPanMediaViewer("next");
        return;
      }
      if (action === "download-media-image") {
        void liveChatDownloadMediaViewerImage();
      }
    });

    const viewport = viewer.querySelector("[data-lcx-media-viewer-viewport]");
    if (viewport instanceof HTMLElement && viewport.dataset.lcxViewportBound !== "true") {
      viewport.dataset.lcxViewportBound = "true";
      viewport.addEventListener("scroll", () => {
        liveChatSyncMediaViewerPanNav(viewer);
      }, { passive: true });
    }

    const viewerImage = viewer.querySelector("[data-lcx-media-viewer-image]");
    if (viewerImage instanceof HTMLImageElement && viewerImage.dataset.lcxViewerImageBound !== "true") {
      viewerImage.dataset.lcxViewerImageBound = "true";
      viewerImage.addEventListener("load", () => {
        liveChatStoreMediaViewerFitDimensions(viewerImage);
        const openViewer = document.querySelector("[data-lcx-media-viewer]:not([hidden])");
        if (openViewer instanceof HTMLElement) {
          const zoom = Number(openViewer.dataset.lcxZoom) || 1;
          if (zoom > 1.01) {
            liveChatSetMediaViewerZoom(zoom);
          } else {
            liveChatSyncMediaViewerPanNav(openViewer);
          }
        }
      });
    }

    viewer.addEventListener("wheel", (event) => {
      if (viewer.hidden || !viewer.classList.contains("is-image")) {
        return;
      }
      event.preventDefault();
      liveChatAdjustMediaViewerZoom(event.deltaY < 0 ? 0.12 : -0.12);
    }, { passive: false });

    if (document.body.dataset.lcxMediaViewerKeyBound !== "true") {
      document.body.dataset.lcxMediaViewerKeyBound = "true";
      document.addEventListener("keydown", (event) => {
        const openViewer = document.querySelector("[data-lcx-media-viewer]:not([hidden])");
        if (!openViewer) {
          return;
        }
        if (event.key === "Escape") {
          liveChatCloseMediaViewer();
          return;
        }
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          if (openViewer.classList.contains("is-zoomed")) {
            liveChatPanMediaViewer("prev");
          } else {
            liveChatShowMediaViewerGalleryItem(-1);
          }
          return;
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          if (openViewer.classList.contains("is-zoomed")) {
            liveChatPanMediaViewer("next");
          } else {
            liveChatShowMediaViewerGalleryItem(1);
          }
        }
      });
    }

    if (document.body.dataset.lcxMediaViewerScrollGuardBound !== "true") {
      document.body.dataset.lcxMediaViewerScrollGuardBound = "true";
      document.addEventListener("wheel", liveChatMediaViewerScrollGuard, { passive: false, capture: true });
      document.addEventListener("touchmove", liveChatMediaViewerScrollGuard, { passive: false, capture: true });
    }

    return viewer;
  }

  function liveChatResetMediaViewerImageLayout(image) {
    if (!(image instanceof HTMLImageElement)) {
      return;
    }
    image.style.transform = "";
    image.style.width = "";
    image.style.height = "";
    image.style.maxWidth = "";
    image.style.maxHeight = "";
    delete image.dataset.lcxFitWidth;
    delete image.dataset.lcxFitHeight;
  }

  function liveChatStoreMediaViewerFitDimensions(image) {
    if (!(image instanceof HTMLImageElement)) {
      return null;
    }
    const naturalWidth = Number(image.naturalWidth) || 0;
    const naturalHeight = Number(image.naturalHeight) || 0;
    if (naturalWidth <= 0 || naturalHeight <= 0) {
      return null;
    }
    const viewer = image.closest("[data-lcx-media-viewer]");
    const shell = viewer?.querySelector(".lcx-media-viewer__shell");
    const maxHeight = Math.min(window.innerHeight * 0.86 - 68, 752);
    const shellWidth = shell instanceof HTMLElement && shell.clientWidth > 0
      ? shell.clientWidth
      : Math.min(window.innerWidth * 0.9, 980);
    const scale = Math.min(1, shellWidth / naturalWidth, maxHeight / naturalHeight);
    const fit = {
      fitWidth: Math.max(1, Math.round(naturalWidth * scale)),
      fitHeight: Math.max(1, Math.round(naturalHeight * scale)),
    };
    image.dataset.lcxFitWidth = String(fit.fitWidth);
    image.dataset.lcxFitHeight = String(fit.fitHeight);
    return fit;
  }

  function liveChatGetMediaViewerFitDimensions(image) {
    if (!(image instanceof HTMLImageElement)) {
      return null;
    }
    const fitWidth = Number(image.dataset.lcxFitWidth) || 0;
    const fitHeight = Number(image.dataset.lcxFitHeight) || 0;
    if (fitWidth > 0 && fitHeight > 0) {
      return { fitWidth, fitHeight };
    }
    return liveChatStoreMediaViewerFitDimensions(image);
  }

  function liveChatSyncMediaViewerPanNav(viewer) {
    if (!(viewer instanceof HTMLElement)) {
      return;
    }
    const viewport = viewer.querySelector("[data-lcx-media-viewer-viewport]");
    const panPrev = viewer.querySelector("[data-lcx-action='media-pan-prev']");
    const panNext = viewer.querySelector("[data-lcx-action='media-pan-next']");
    const isZoomed = viewer.classList.contains("is-zoomed");
    if (!(viewport instanceof HTMLElement) || !isZoomed) {
      if (panPrev instanceof HTMLElement) {
        panPrev.hidden = true;
      }
      if (panNext instanceof HTMLElement) {
        panNext.hidden = true;
      }
      return;
    }
    const maxScrollLeft = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
    const canPanHorizontal = maxScrollLeft > 2;
    if (panPrev instanceof HTMLElement) {
      panPrev.hidden = !canPanHorizontal;
      panPrev.disabled = viewport.scrollLeft <= 2;
    }
    if (panNext instanceof HTMLElement) {
      panNext.hidden = !canPanHorizontal;
      panNext.disabled = viewport.scrollLeft >= maxScrollLeft - 2;
    }
  }

  function liveChatPanMediaViewer(direction = "") {
    const viewer = document.querySelector("[data-lcx-media-viewer]");
    const viewport = viewer?.querySelector("[data-lcx-media-viewer-viewport]");
    if (!(viewer instanceof HTMLElement) || !(viewport instanceof HTMLElement)) {
      return;
    }
    const stepX = Math.max(120, Math.round(viewport.clientWidth * 0.38));
    const maxScrollLeft = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
    if (direction === "prev") {
      viewport.scrollLeft = Math.max(0, viewport.scrollLeft - stepX);
    } else if (direction === "next") {
      viewport.scrollLeft = Math.min(maxScrollLeft, viewport.scrollLeft + stepX);
    }
    liveChatSyncMediaViewerPanNav(viewer);
  }

  function liveChatSetMediaViewerZoom(nextZoom) {
    const viewer = document.querySelector("[data-lcx-media-viewer]");
    const image = viewer?.querySelector("[data-lcx-media-viewer-image]");
    const reset = viewer?.querySelector(".lcx-media-viewer__zoom-reset");
    const viewport = viewer?.querySelector("[data-lcx-media-viewer-viewport]");
    if (!(viewer instanceof HTMLElement) || !(image instanceof HTMLImageElement)) {
      return;
    }
    const zoom = Math.min(3, Math.max(1, Number(nextZoom) || 1));
    viewer.dataset.lcxZoom = String(zoom);
    viewer.classList.toggle("is-zoomed", zoom > 1.01);
    const fit = liveChatGetMediaViewerFitDimensions(image);
    const resolvedFit = fit || (image.complete ? liveChatStoreMediaViewerFitDimensions(image) : null);
    if (zoom > 1.01 && resolvedFit) {
      image.style.transform = "";
      image.style.maxWidth = "none";
      image.style.maxHeight = "none";
      image.style.width = `${Math.round(resolvedFit.fitWidth * zoom)}px`;
      image.style.height = `${Math.round(resolvedFit.fitHeight * zoom)}px`;
    } else {
      liveChatResetMediaViewerImageLayout(image);
      if (image.complete) {
        liveChatStoreMediaViewerFitDimensions(image);
      }
    }
    if (reset instanceof HTMLElement) {
      reset.textContent = `${Math.round(zoom * 100)}%`;
    }
    if (viewport instanceof HTMLElement && zoom <= 1.01) {
      viewport.scrollLeft = 0;
      viewport.scrollTop = 0;
    }
    window.requestAnimationFrame(() => {
      liveChatSyncMediaViewerPanNav(viewer);
    });
  }

  function liveChatAdjustMediaViewerZoom(delta) {
    const viewer = document.querySelector("[data-lcx-media-viewer]");
    if (!(viewer instanceof HTMLElement)) {
      return;
    }
    const current = Number(viewer.dataset.lcxZoom) || 1;
    liveChatSetMediaViewerZoom(current + Number(delta || 0));
  }

  function liveChatOpenMediaViewer({
    kind = "image",
    src = "",
    label = "",
    mediaSide = "",
    currentTime = 0,
    sourceVideo = null,
    gallery = null,
    galleryIndex = null,
    autoPlayVideo = true,
  } = {}) {
    const source = normalizeText(src);
    if (!source) {
      return;
    }
    const viewer = liveChatEnsureMediaViewer();
    const mediaRequestId = String((Number(viewer.dataset.lcxMediaRequestId) || 0) + 1);
    viewer.dataset.lcxMediaRequestId = mediaRequestId;
    const isCurrentMediaRequest = () => (
      viewer.dataset.lcxMediaRequestId === mediaRequestId
      && viewer.dataset.lcxCurrentSrc === source
    );
    liveChatClearMediaViewerShellLock(viewer);
    const image = viewer.querySelector("[data-lcx-media-viewer-image]");
    const video = viewer.querySelector("[data-lcx-media-viewer-video]");
    const toolbar = viewer.querySelector("[data-lcx-media-viewer-toolbar]");
    const isVideo = kind === "video";
    const resumeAt = Math.max(0, Number(currentTime) || 0);
    const mediaGallery = Array.isArray(gallery)
      ? gallery
      : liveChatCollectMediaViewerGallery("all");
    let activeGalleryIndex = Number.isInteger(galleryIndex)
      ? galleryIndex
      : mediaGallery.findIndex((item) => normalizeText(item?.src) === source);
    if (activeGalleryIndex < 0) {
      activeGalleryIndex = 0;
    }
    const activeItem = mediaGallery[activeGalleryIndex];
    const resolvedSide = normalizeText(mediaSide) || normalizeText(activeItem?.side) || "support";
    viewer.dataset.lcxCurrentSrc = source;
    viewer.dataset.lcxCurrentLabel = normalizeText(label) || (isVideo ? "Video" : "Photo");
    viewer.dataset.lcxMediaSide = resolvedSide === "customer" ? "customer" : "support";

    if (sourceVideo instanceof HTMLVideoElement) {
      sourceVideo.pause();
      const shell = sourceVideo.closest("[data-lcx-message-video]");
      if (shell instanceof HTMLElement) {
        liveChatSetVideoPlayingState(shell, false);
        liveChatSyncInlineVideoProgress(shell, sourceVideo);
      }
      viewer.dataset.lcxSourceVideoSrc = normalizeText(sourceVideo.currentSrc || sourceVideo.src || source);
      viewer.dataset.lcxSourceVideoTime = String(resumeAt);
    } else {
      delete viewer.dataset.lcxSourceVideoSrc;
      delete viewer.dataset.lcxSourceVideoTime;
      liveChatPauseOtherMessageVideos(null);
    }

    viewer.classList.toggle("is-image", !isVideo);
    viewer.classList.toggle("is-video", isVideo);
    viewer.dataset.lcxGalleryKind = kind;
    liveChatSyncMediaViewerNav(viewer, mediaGallery, activeGalleryIndex);
    viewer.hidden = false;
    liveChatLockPageForMediaViewer();

    if (video instanceof HTMLVideoElement) {
      video.pause();
      video.removeAttribute("src");
      video.load();
      video.hidden = true;
    }
    if (image instanceof HTMLImageElement) {
      image.removeAttribute("src");
      liveChatResetMediaViewerImageLayout(image);
      image.hidden = true;
    }

    if (isVideo && video instanceof HTMLVideoElement) {
      if (toolbar instanceof HTMLElement) {
        toolbar.hidden = true;
      }
      video.hidden = false;
      liveChatSetMediaSkeletonState(video, true);
      video.src = source;
      video.setAttribute("aria-label", label || "Video");

      const seekVideo = () => {
        const applySeek = () => {
          if (!isCurrentMediaRequest()) {
            return;
          }
          if (resumeAt > 0 && Number.isFinite(video.duration) && video.duration > 0) {
            try {
              video.currentTime = Math.min(resumeAt, Math.max(0, video.duration - 0.05));
            } catch (_) {
            }
          }
          viewer.dataset.lcxSourceVideoTime = String(video.currentTime || resumeAt);
          if (autoPlayVideo) {
            const playPromise = video.play();
            if (playPromise && typeof playPromise.catch === "function") {
              playPromise.catch(() => {});
            }
          } else {
            video.pause();
          }
        };
        if (video.readyState >= 1) {
          applySeek();
          return;
        }
        video.addEventListener("loadedmetadata", applySeek, { once: true });
      };
      seekVideo();
    } else if (image instanceof HTMLImageElement) {
      if (toolbar instanceof HTMLElement) {
        toolbar.hidden = false;
      }
      image.hidden = false;
      image.alt = label || "Photo";
      liveChatSetMediaSkeletonState(image, true);
      image.src = source;
      const finalizeImageLayout = () => {
        if (!isCurrentMediaRequest() || image.naturalWidth <= 0) {
          return;
        }
        const fit = liveChatStoreMediaViewerFitDimensions(image);
        liveChatApplyMediaViewerShellLock(viewer, fit);
        liveChatSetMediaViewerZoom(Number(viewer.dataset.lcxZoom) || 1);
      };
      if (image.complete && image.naturalWidth > 0) {
        finalizeImageLayout();
      } else {
        image.addEventListener("load", finalizeImageLayout, { once: true });
      }
    }

    window.requestAnimationFrame(() => {
      viewer.classList.add("is-open");
      liveChatSyncMediaViewerDownload(viewer);
    });
  }

  function liveChatSetVideoPlayingState(shell, isPlaying) {
    if (!(shell instanceof HTMLElement)) {
      return;
    }
    shell.classList.toggle("is-playing", Boolean(isPlaying));
    if (!isPlaying) {
      shell.classList.remove("is-pointer-hover");
      return;
    }
    if (shell.matches(":hover")) {
      shell.classList.add("is-pointer-hover");
    }
  }

  function liveChatPauseOtherMessageVideos(activeVideo) {
    elements.liveChatMount?.querySelectorAll("[data-lcx-message-video]").forEach((shell) => {
      const video = shell.querySelector("video");
      if (!(video instanceof HTMLVideoElement) || video === activeVideo || video.paused) {
        return;
      }
      video.pause();
      liveChatSetVideoPlayingState(shell, false);
      liveChatSyncInlineVideoProgress(shell, video);
    });
  }

  function liveChatToggleMessageVideo(actionButton) {
    const shell = actionButton?.closest("[data-lcx-message-video]");
    const video = shell?.querySelector("video");
    if (!(shell instanceof HTMLElement) || !(video instanceof HTMLVideoElement)) {
      return;
    }
    if (video.paused) {
      const messageArea = shell.closest("[data-lcx-message-area]");
      liveChatActivateLazyMediaElement(video, messageArea instanceof HTMLElement ? messageArea : null);
      liveChatPauseOtherMessageVideos(video);
      video.muted = false;
      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {
          liveChatSetVideoPlayingState(shell, false);
        });
      }
      liveChatSetVideoPlayingState(shell, true);
      return;
    }
    video.pause();
    liveChatSetVideoPlayingState(shell, false);
  }

  function liveChatInitMessageVideos() {
    const mount = elements.liveChatMount;
    if (!mount) {
      return;
    }
    mount.querySelectorAll("[data-lcx-message-video]").forEach((shell) => {
      const video = shell.querySelector("video");
      const fill = shell.querySelector(".lcx-message-video__track-fill");
      if (!(video instanceof HTMLVideoElement)) {
        return;
      }
      if (video.dataset.lcxVideoBound === "true") {
        return;
      }
      video.dataset.lcxVideoBound = "true";

      const syncProgress = () => {
        if (!(fill instanceof HTMLElement) || !Number.isFinite(video.duration) || video.duration <= 0) {
          return;
        }
        fill.style.width = `${Math.min(100, (video.currentTime / video.duration) * 100)}%`;
      };

      const setPointerHover = (isHovering) => {
        if (!shell.classList.contains("is-playing")) {
          shell.classList.remove("is-pointer-hover");
          return;
        }
        shell.classList.toggle("is-pointer-hover", Boolean(isHovering));
      };

      shell.addEventListener("pointerenter", () => setPointerHover(true));
      shell.addEventListener("pointerleave", () => setPointerHover(false));
      shell.addEventListener("pointermove", () => {
        if (shell.classList.contains("is-playing")) {
          setPointerHover(true);
        }
      });

      video.addEventListener("timeupdate", syncProgress);
      video.addEventListener("loadedmetadata", syncProgress);
      video.addEventListener("ended", () => {
        liveChatSetVideoPlayingState(shell, false);
        if (fill instanceof HTMLElement) {
          fill.style.width = "0%";
        }
      });
      video.addEventListener("pause", () => {
        if (video.ended || video.currentTime === 0) {
          liveChatSetVideoPlayingState(shell, false);
        }
      });
      video.addEventListener("play", () => {
        liveChatSetVideoPlayingState(shell, true);
      });
    });
  }

  function liveChatFitPhotoBubble(bubble) {
    if (!(bubble instanceof HTMLElement)) {
      return;
    }
    const image = bubble.querySelector("img.lcx-message-media__item");
    if (!(image instanceof HTMLImageElement)) {
      return;
    }
    const naturalWidth = Number(image.naturalWidth) || 0;
    const naturalHeight = Number(image.naturalHeight) || 0;
    if (naturalWidth <= 0 || naturalHeight <= 0) {
      return;
    }
    const maxWidth = Math.min(300, Math.max(120, bubble.parentElement?.clientWidth || 300));
    const maxHeight = 240;
    const scale = Math.min(1, maxWidth / naturalWidth, maxHeight / naturalHeight);
    const fittedWidth = Math.max(1, Math.round(naturalWidth * scale));
    const fittedHeight = Math.max(1, Math.round(naturalHeight * scale));
    bubble.style.width = `${fittedWidth}px`;
    bubble.style.height = `${fittedHeight}px`;
    image.style.width = `${fittedWidth}px`;
    image.style.height = `${fittedHeight}px`;
    bubble.classList.add("is-fitted");
  }

  function liveChatInitPhotoBubbles() {
    const mount = elements.liveChatMount;
    if (!mount) {
      return;
    }
    mount.querySelectorAll("[data-lcx-photo-bubble]").forEach((bubble) => {
      if (!(bubble instanceof HTMLElement)) {
        return;
      }
      const image = bubble.querySelector("img.lcx-message-media__item");
      if (!(image instanceof HTMLImageElement)) {
        return;
      }
      if (image.dataset.lcxPhotoBound === "true") {
        liveChatFitPhotoBubble(bubble);
        return;
      }
      image.dataset.lcxPhotoBound = "true";
      const fit = () => liveChatFitPhotoBubble(bubble);
      if (image.complete && image.naturalWidth > 0) {
        fit();
        return;
      }
      image.addEventListener("load", fit, { once: true });
    });
  }

  function liveChatIsPhotoGridExpanded(messageId) {
    return liveChatRedesignState.expandedPhotoGrids.has(normalizeText(messageId));
  }

  function liveChatExpandPhotoGrid(messageId) {
    const normalizedId = normalizeText(messageId);
    if (!normalizedId || liveChatIsPhotoGridExpanded(normalizedId)) {
      return;
    }
    liveChatRedesignState.expandedPhotoGrids.add(normalizedId);
    const active = liveChatGetActive();
    const message = (Array.isArray(active?.messages) ? active.messages : [])
      .find((item) => normalizeText(item?.id) === normalizedId);
    if (!message) {
      return;
    }
    const article = elements.liveChatMount?.querySelector(`[data-lcx-message-id="${CSS.escape(normalizedId)}"]`);
    const bubble = article?.querySelector("[data-lcx-photo-grid-bubble]");
    if (!(bubble instanceof HTMLElement)) {
      return;
    }
    const support = message.side === "support";
    const mediaSide = support ? "support" : "customer";
    const imageMedia = (Array.isArray(message.media) ? message.media : [])
      .filter((item) => item?.kind === "image" && normalizeText(item?.url || item?.src));
    const metaEl = bubble.querySelector(".lcx-message__meta");
    const metaMarkup = metaEl instanceof HTMLElement ? metaEl.outerHTML : "";
    bubble.outerHTML = liveChatPhotoGridBubbleMarkup(imageMedia, metaMarkup, mediaSide, normalizedId, { expanded: true });
    const messageArea = article?.closest("[data-lcx-message-area]");
    if (messageArea instanceof HTMLElement) {
      liveChatLoadVisibleScrollLazyMedia(messageArea);
    }
  }

  function liveChatPhotoGridBubbleMarkup(images, metaMarkup, mediaSide, messageId = "", options = {}) {
    const normalizedImages = (Array.isArray(images) ? images : [])
      .map((item) => ({
        source: normalizeText(item?.url || item?.src),
        label: liveChatEscape(item?.alt || item?.name || "Photo"),
      }))
      .filter((item) => item.source);
    if (!normalizedImages.length) {
      return "";
    }
    const totalCount = normalizedImages.length;
    const expanded = options.expanded === true || liveChatIsPhotoGridExpanded(messageId);
    const hasOverflow = totalCount > 4 && !expanded;
    const visibleImages = hasOverflow ? normalizedImages.slice(0, 4) : normalizedImages;
    const overflowCount = hasOverflow ? totalCount - visibleImages.length : 0;
    const visibleCount = visibleImages.length;
    const cells = visibleImages.map((item, index) => {
      const showOverflow = hasOverflow && index === visibleCount - 1;
      const imageMarkup = `<img ${liveChatLazyMediaAttrs(item.source, "image", "lcx-message-media__item", "scroll")} alt="${item.label}" />`;
      if (showOverflow) {
        return `<button
        type="button"
        class="lcx-message-media__hit lcx-message-media__hit--expand"
        data-lcx-action="expand-photo-grid"
        data-lcx-message-id="${liveChatEscape(messageId)}"
        aria-label="Show all ${totalCount} photos"
        title="Show all photos"
      >${imageMarkup}<span class="lcx-message__photo-grid-more">+${liveChatEscape(String(overflowCount))}</span></button>`;
      }
      return `<button
        type="button"
        class="lcx-message-media__hit"
        data-lcx-action="open-media-viewer"
        data-lcx-media-kind="image"
        data-lcx-media-src="${liveChatEscape(item.source)}"
        data-lcx-media-label="${item.label}"
        data-lcx-media-side="${liveChatEscape(mediaSide)}"
        data-lcx-media-message-id="${liveChatEscape(messageId)}"
        aria-label="View photo ${index + 1}"
        title="View photo"
      >${imageMarkup}</button>`;
    }).join("");
    return `<div class="lcx-message__photo-grid-bubble${expanded && totalCount > 4 ? " is-expanded" : ""}" data-lcx-photo-grid-bubble data-count="${visibleCount}" data-total-count="${totalCount}">${cells}${metaMarkup}</div>`;
  }

  function liveChatMessageMarkup(message, active, index = 0, options = {}) {
    const laneBreak = options.laneBreak === true;
    const isAi = liveChatIsAiMessage(message);
    const support = message.side === "support";
    const lane = liveChatMessageLane(message, active);
    const isAssigned = lane === "assigned";
    const isStoreSupport = lane === "support";
    const layoutAsCustomer = !isStoreSupport;
    const messageSideClass = isAssigned ? "is-assigned" : (isStoreSupport ? "is-support" : "is-customer");
    const messageId = normalizeText(message?.id) || `local-${Math.max(0, Number(index) || 0)}`;
    const messageTimestamp = normalizeText(message?.timestamp || message?.createdAt || message?.sentAt);
    const exactTime = normalizeText(message?.time) || liveChatTimeValue(messageTimestamp, "Time unavailable");
    const canEdit = liveChatCanEditMessage(message);
    const replyMeta = liveChatNormalizeReplyReference(message?.replyTo);
    const replyLabel = liveChatReplyLineLabel(replyMeta, support, active);
    const fileNames = Array.isArray(message.files) ? message.files : [];
    const filesMarkup = fileNames.map((file) => {
      const fileMeta = liveChatFileMeta(file);
      return `<span class="lcx-message-file">${liveChatIcon("file", 16)}<span>${liveChatEscape(fileMeta.name)}</span></span>`;
    }).join("");
    const rawMedia = Array.isArray(message.media) ? message.media : [];
    const rawAudio = Array.isArray(message.audio) ? message.audio : [];
    const messageAudio = liveChatUniqueAttachments([
      ...rawAudio,
      ...rawMedia.filter((item) => item?.kind === "audio" || liveChatIsVoiceAttachment(item)),
    ]);
    const messageMedia = rawMedia.filter((item) => item?.kind !== "audio" && !liveChatIsVoiceAttachment(item));
    const imageMedia = messageMedia.filter((item) => item?.kind === "image" && normalizeText(item?.url || item?.src));
    const videoMedia = messageMedia.filter((item) => item?.kind === "video" && normalizeText(item?.url || item?.src));
    const isDeleted = Boolean(normalizeText(message.deletedAt));
    const messageText = liveChatDisplayMessageText(message);
    const hasVisualMedia = messageMedia.some((item) => normalizeText(item?.url || item?.src));
    const hasAudio = messageAudio.some((item) => normalizeText(item?.url || item?.src));
    const isAudioOnly = hasAudio && !messageText && !filesMarkup && !hasVisualMedia && !isDeleted;
    const isPhotoGrid = imageMedia.length >= 2 && !videoMedia.length && !filesMarkup && !hasAudio && !isDeleted;
    const isMediaOnly = hasVisualMedia && !messageText && !filesMarkup && !hasAudio && !isDeleted;
    const isVideoOnly = isMediaOnly && messageMedia.length === 1 && messageMedia[0]?.kind === "video";
    const isEmojiOnly = !hasVisualMedia && !filesMarkup && liveChatIsEmojiOnlyText(messageText);
    const mediaSide = isStoreSupport || isAssigned ? "support" : "customer";
    const receiptStatus = isStoreSupport || isAssigned ? liveChatSupportMessageReceiptStatus(message, active) : null;
    const metaMarkup = `
        <span class="lcx-message__meta${isEmojiOnly ? " is-emoji-meta" : ""}${isMediaOnly ? " is-media-meta" : ""}${isVideoOnly ? " is-video-meta" : ""}">
          ${message?.editedAt ? '<span class="lcx-message__edited">Edited</span>' : ""}
          <time class="lcx-message__time" data-lcx-message-time${messageTimestamp ? ` datetime="${liveChatEscape(messageTimestamp)}"` : ""}>${liveChatEscape(exactTime)}</time>
          ${receiptStatus ? liveChatReceiptMarkup(receiptStatus) : ""}
        </span>`;
    const lastVisualMediaIndex = messageMedia.reduce((lastIndex, item, itemIndex) => (
      normalizeText(item?.url || item?.src) ? itemIndex : lastIndex
    ), -1);
    const photoGridMarkup = isPhotoGrid
      ? liveChatPhotoGridBubbleMarkup(imageMedia, metaMarkup, mediaSide, messageId)
      : "";
    const mediaMarkup = messageMedia.map((item, mediaIndex) => {
      const source = normalizeText(item?.url || item?.src);
      if (!source) {
        return "";
      }
      if (item?.kind === "audio" || liveChatIsVoiceAttachment(item)) {
        return "";
      }
      const label = liveChatEscape(item?.alt || item?.name || "Media attachment");
      if (item?.kind === "video") {
        return liveChatVideoPlayerMarkup(source, label, isVideoOnly ? metaMarkup : "");
      }
      if (isPhotoGrid) {
        return "";
      }
      const inlineImageMeta = isMediaOnly && !isVideoOnly && mediaIndex === lastVisualMediaIndex
        ? metaMarkup
        : "";
      const imageButton = `<button
        type="button"
        class="lcx-message-media__hit"
        data-lcx-action="open-media-viewer"
        data-lcx-media-kind="image"
        data-lcx-media-src="${liveChatEscape(source)}"
        data-lcx-media-label="${label}"
        data-lcx-media-side="${liveChatEscape(mediaSide)}"
        aria-label="View photo"
        title="View photo"
      ><img ${liveChatLazyMediaAttrs(source, "image", "lcx-message-media__item", "scroll")} alt="${label}" /></button>`;
      if (isMediaOnly && !isVideoOnly) {
        return `<div class="lcx-message__photo-bubble" data-lcx-photo-bubble>${imageButton}${inlineImageMeta}</div>`;
      }
      return imageButton;
    }).join("");
    const combinedMediaMarkup = `${photoGridMarkup}${mediaMarkup}`;
    const audioMarkup = messageAudio.map((item) => {
      const source = normalizeText(item?.url || item?.src);
      if (!source) {
        return "";
      }
      const label = liveChatEscape(item?.alt || item?.name || "Voice message");
      const inlineMeta = isAudioOnly ? metaMarkup : "";
      return liveChatMessageAudioBubbleMarkup(source, label, isStoreSupport || isAssigned, inlineMeta);
    }).join("");
    const hasMedia = Boolean(combinedMediaMarkup || filesMarkup || audioMarkup);
    const reactionEmoji = normalizeText(message.reactionEmoji);
    const reactAction = !isDeleted
      ? liveChatReactActionMarkup(index, reactionEmoji, messageId)
      : "";
    const translateAction = liveChatMessageHasVisibleText(message)
      ? liveChatTranslateActionMarkup(index)
      : "";
    const textMarkup = messageText
      ? (isEmojiOnly
        ? liveChatEmojiOnlyContentMarkup(messageText, messageId, { variant: "message" })
        : `<p class="lcx-message__text">${liveChatEscape(messageText)}</p>`)
      : "";
    const mediaBlock = combinedMediaMarkup
      ? `<div class="lcx-message-media${isMediaOnly ? " is-media-only" : ""}${isPhotoGrid ? " is-photo-grid" : ""}${isVideoOnly ? " is-video-only" : ""}">${combinedMediaMarkup}</div>`
      : "";
    const bubbleMarkup = `
      <div class="lcx-message__bubble${isEmojiOnly ? " is-emoji" : ""}${isMediaOnly ? " is-media-only" : ""}${isAudioOnly ? " is-audio-only" : ""}${isStoreSupport || isAssigned ? " is-support-bubble" : ""}" role="button" tabindex="0" data-lcx-action="toggle-message-time" aria-expanded="true" aria-label="${isEmojiOnly ? "Emoji message" : isMediaOnly ? "Media message" : isAudioOnly ? "Voice message" : "Message"}">
        <div class="lcx-message__content">
          ${textMarkup}
          ${mediaBlock}
          ${audioMarkup}
          ${filesMarkup ? `<div class="lcx-message-files">${filesMarkup}</div>` : ""}
          ${isMediaOnly || isEmojiOnly || isAudioOnly ? "" : metaMarkup}
        </div>
      </div>`;
    const avatarMarkup = liveChatMessageAvatarMarkup(message, active);
    const shouldAnimate = liveChatShouldAnimateMessage(messageId);
    const replyPreviewPhotos = replyMeta ? liveChatResolveReplyPreviewPhotos(replyMeta, active) : [];
    const hasReplyPhotos = replyPreviewPhotos.length > 0;
    return `
      <article class="lcx-message ${messageSideClass}${isAi ? " is-ai" : ""} is-lane-${lane}${laneBreak ? " is-lane-break" : ""} lcx-message--tone-${liveChatBuyerToneIndex(active)}${replyMeta ? " has-reply" : ""}${hasReplyPhotos ? " has-reply-photo" : ""}${isEmojiOnly ? " is-emoji" : ""}${isMediaOnly ? " is-media-only" : ""}${isPhotoGrid ? " is-photo-grid" : ""}${isAudioOnly ? " is-audio-only" : ""}${canEdit ? " is-admin-editable" : ""}${shouldAnimate ? " is-entering" : ""}" data-lcx-message-id="${liveChatEscape(messageId)}" data-lcx-message-index="${liveChatEscape(index)}" data-lcx-message-lane="${lane}">
        ${layoutAsCustomer ? avatarMarkup : ""}
        <div class="lcx-message__stack">
          ${replyMeta ? `
            <button type="button" class="lcx-message__reply-preview" data-lcx-action="jump-reply" data-lcx-reply-message-id="${liveChatEscape(replyMeta.messageId)}" aria-label="Jump to replied message">
              <span class="lcx-message__reply-label">${liveChatIcon("reply", 12)} ${liveChatEscape(replyLabel)}</span>
              ${liveChatReplyPreviewContentMarkup({
                previewText: replyMeta.previewText,
                previewPhotos: replyPreviewPhotos,
                keyPrefix: replyMeta.messageId,
                variant: "quote",
              })}
            </button>` : ""}
          <div class="lcx-message__bubble-row">
            ${layoutAsCustomer
              ? `<div class="lcx-message__bubble-wrap">${bubbleMarkup}</div>${reactAction}${translateAction}`
              : `${translateAction}${reactAction}<div class="lcx-message__bubble-wrap">${bubbleMarkup}</div>`}
          </div>
          ${isEmojiOnly ? metaMarkup : ""}
        </div>
        ${layoutAsCustomer ? "" : avatarMarkup}
      </article>`;
  }

  function liveChatMessageEpochMs(message) {
    const candidates = [
      message?.timestamp,
      message?.createdAt,
      message?.sentAt,
      message?.timestampMs,
    ];
    for (const candidate of candidates) {
      if (candidate === null || candidate === undefined || candidate === "") {
        continue;
      }
      const numericValue = Number(candidate);
      if (Number.isFinite(numericValue) && numericValue > 0) {
        const epochMs = numericValue < 1e12 ? numericValue * 1000 : numericValue;
        if (!Number.isNaN(new Date(epochMs).getTime())) {
          return epochMs;
        }
      }
      const parsedValue = new Date(candidate).getTime();
      if (!Number.isNaN(parsedValue)) {
        return parsedValue;
      }
    }

    const displayTime = normalizeText(message?.time);
    const clockMatch = displayTime.match(/^(\d{1,2}):(\d{2})\s*([ap])\.?m\.?$/i);
    if (clockMatch) {
      const date = new Date();
      let hour = Number(clockMatch[1]) % 12;
      if (clockMatch[3].toLowerCase() === "p") {
        hour += 12;
      }
      date.setHours(hour, Number(clockMatch[2]), 0, 0);
      return date.getTime();
    }
    if (/^yesterday$/i.test(displayTime)) {
      const date = new Date();
      date.setDate(date.getDate() - 1);
      date.setHours(12, 0, 0, 0);
      return date.getTime();
    }
    if (/^now$/i.test(displayTime)) {
      return Date.now();
    }
    return Number.NaN;
  }

  function liveChatMessageDayKey(epochMs) {
    if (!Number.isFinite(epochMs)) {
      return "";
    }
    const date = new Date(epochMs);
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  }

  function liveChatHourlyMarkerLabel(message, epochMs) {
    const exactTime = normalizeText(message?.time)
      || (Number.isFinite(epochMs) ? liveChatTimeValue(epochMs, "") : "");
    if (!Number.isFinite(epochMs)) {
      return exactTime || "Time unavailable";
    }

    const messageDate = new Date(epochMs);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const messageDay = liveChatMessageDayKey(epochMs);
    if (messageDay === liveChatMessageDayKey(today.getTime())) {
      return exactTime || liveChatTimeValue(epochMs, "Now");
    }
    if (messageDay === liveChatMessageDayKey(yesterday.getTime())) {
      return /^yesterday$/i.test(exactTime)
        ? "Yesterday"
        : `Yesterday${exactTime ? ` \u00b7 ${exactTime}` : ""}`;
    }
    const dateLabel = liveChatDateValue(messageDate, "");
    return `${dateLabel}${dateLabel && exactTime ? " \u00b7 " : ""}${exactTime}` || "Time unavailable";
  }

  function liveChatMessagesMarkup(messages, active, orderSummaryIndex = -1, indexOffset = 0) {
    const hourlyIntervalMs = 60 * 60 * 1000;
    let lastMarkerEpochMs = Number.NaN;
    let lastMarkerDay = "";
    let lastMarkerLabel = "";
    let lastLane = "";

    return messages.map((message, index) => {
      const epochMs = liveChatMessageEpochMs(message);
      const dayKey = liveChatMessageDayKey(epochMs);
      const markerLabel = liveChatHourlyMarkerLabel(message, epochMs);
      const isFirstMarker = !lastMarkerLabel;
      const crossedDay = Boolean(dayKey && lastMarkerDay && dayKey !== lastMarkerDay);
      const reachedHourlyInterval = Number.isFinite(epochMs)
        && (!Number.isFinite(lastMarkerEpochMs) || epochMs - lastMarkerEpochMs >= hourlyIntervalMs);
      const changedUnparsedLabel = !Number.isFinite(epochMs)
        && Boolean(markerLabel)
        && markerLabel !== lastMarkerLabel;
      const shouldShowMarker = isFirstMarker || crossedDay || reachedHourlyInterval || changedUnparsedLabel;
      let markerMarkup = "";

      if (shouldShowMarker) {
        const datetime = Number.isFinite(epochMs) ? new Date(epochMs).toISOString() : "";
        markerMarkup = `
          <div class="lcx-time-separator" role="separator" aria-label="${liveChatEscape(markerLabel)}">
            <time${datetime ? ` datetime="${liveChatEscape(datetime)}"` : ""}>${liveChatEscape(markerLabel)}</time>
          </div>`;
        lastMarkerEpochMs = epochMs;
        lastMarkerDay = dayKey;
        lastMarkerLabel = markerLabel;
      }

      const lane = liveChatMessageLane(message, active);
      const laneBreak = Boolean(lastLane && lastLane !== lane);
      lastLane = lane;

      return `${markerMarkup}${liveChatMessageMarkup(message, active, index + indexOffset, { laneBreak })}${index === orderSummaryIndex ? liveChatOrderSummaryMarkup(active) : ""}`;
    }).join("");
  }

  function liveChatOrderSummaryMarkup(active) {
    const order = liveChatOrderFor(active);
    const orderId = normalizeText(order.id);
    if (!orderId) {
      return "";
    }
    const product = liveChatProductFor(active);
    const totalAmount = [order.total, product.price]
      .map((value) => Number(value))
      .find((value) => Number.isFinite(value));
    return `
      <article class="lcx-order-summary" aria-label="Order summary">
        <header>
          <span>${liveChatIcon("file", 14)} Order Summary</span>
          <button type="button" data-lcx-action="view-order">View Order ${liveChatIcon("external", 12)}</button>
        </header>
        <div class="lcx-order-summary__grid">
          <span><small>Order ID</small><strong>${liveChatEscape(orderId)}</strong></span>
          <span><small>Payment Status</small><strong><mark class="lcx-status ${liveChatStatusClass(order.paymentStatus)}">${liveChatEscape(order.paymentStatus || "Pending")}</mark></strong></span>
          <span><small>Courier</small><strong>${liveChatEscape(order.courier || "Not assigned")}</strong></span>
          <span><small>Order Date</small><strong>${liveChatEscape(order.placedAt || "Recently")}</strong></span>
          <span><small>Shipping Status</small><strong><mark class="lcx-status ${liveChatStatusClass(order.shippingStatus)}">${liveChatEscape(order.shippingStatus || "Processing")}</mark></strong></span>
          <span><small>Tracking No.</small><strong>${liveChatEscape(order.trackingNumber || "Not assigned")}</strong></span>
          <span><small>Total Amount</small><strong>${liveChatFormatMoney(totalAmount)}</strong></span>
          <span><small>Expected Delivery</small><strong>${liveChatEscape(order.expectedDelivery || "In progress")}</strong></span>
          <span class="lcx-order-summary__action"><button type="button" data-lcx-action="tracking">Track Order</button></span>
        </div>
      </article>`;
  }

  function liveChatMediaCarouselMarkup(active) {
    const media = liveChatConversationMedia(active);
    const visibleMedia = liveChatRedesignState.mediaExpanded ? media : media.slice(0, 4);
    const hiddenCount = Math.max(0, media.length - visibleMedia.length);
    return `
      <section class="lcx-side-card lcx-media-card" aria-label="Shared media">
        <header>
          <h3>Media Carousel</h3>
          ${media.length > 4 ? `<button type="button" data-lcx-action="view-media">${liveChatRedesignState.mediaExpanded ? "Collapse" : `View all ${media.length}`}</button>` : ""}
        </header>
        ${media.length ? `
          <div class="lcx-media-carousel">
            ${visibleMedia.map((item, index) => `
              <button type="button" class="lcx-media-slide" data-lcx-action="view-media" aria-label="Open shared media ${index + 1}">
                <span class="lcx-media-slide__fallback">${liveChatIcon(item.kind === "video" ? "video" : "image", 17)}<small>${item.kind === "video" ? "Video" : "Media"}</small></span>
                ${item.kind === "video"
                  ? `<video src="${liveChatEscape(item.src)}" muted playsinline preload="metadata" onerror="this.closest('button').classList.add('is-broken'); this.remove()"></video>`
                  : `<img src="${liveChatEscape(item.src)}" alt="${liveChatEscape(item.alt || "Shared media")}" onerror="this.closest('button').classList.add('is-broken'); this.remove()" />`}
                ${hiddenCount && index === visibleMedia.length - 1 ? `<span class="lcx-media-slide__count">+${hiddenCount}</span>` : ""}
              </button>`).join("")}
          </div>` : '<div class="lcx-side-empty">No shared media yet</div>'}
      </section>`;
  }

  function liveChatFilesPanelMarkup(active) {
    const files = liveChatConversationFiles(active);
    if (!files.length) {
      return "";
    }
    return `
      <section class="lcx-side-card lcx-files-card" aria-label="Shared files">
        <header>
          <h3>Files</h3>
          <span>${files.length}</span>
        </header>
        <div class="lcx-file-list">${files.map(liveChatFileMarkup).join("")}</div>
      </section>`;
  }

  function liveChatFileMeta(file) {
    if (typeof file === "string") {
      return liveChatNormalizeAttachment({ name: file, type: liveChatFileExtension(file) || "FILE" }, "");
    }
    const normalized = liveChatNormalizeAttachment(file, "");
    return {
      ...normalized,
      name: normalizeText(normalized.name) || "Attachment",
      type: normalizeText(normalized.type) || "FILE",
    };
  }

  function liveChatFileMarkup(file) {
    const fileMeta = liveChatFileMeta(file);
    const typeLabel = normalizeText(fileMeta.type).toUpperCase();
    const iconClass = /drive|google/i.test(typeLabel)
      ? "is-drive"
      : /doc|word/i.test(typeLabel)
        ? "is-doc"
        : /pdf/i.test(typeLabel)
          ? "is-pdf"
          : "is-file";
    const details = [typeLabel, fileMeta.size].map(normalizeText).filter(Boolean).join(" · ");
    return `
      <button type="button" class="lcx-file" data-lcx-action="file" data-lcx-file-name="${liveChatEscape(fileMeta.name)}" data-lcx-file-url="${liveChatEscape(fileMeta.url || "")}">
        <span class="lcx-file__icon ${iconClass}">${liveChatIcon("file", 19)}</span>
        <span class="lcx-file__copy"><strong>${liveChatEscape(fileMeta.name)}</strong>${details ? `<small>${liveChatEscape(details)}</small>` : ""}</span>
        <time>${liveChatEscape(fileMeta.time)}</time>
      </button>`;
  }

  function liveChatEstimateMediaBytes(url, kind = "image") {
    const normalizedKind = kind === "video" || kind === "audio" ? kind : "image";
    void url;
    return LIVE_CHAT_LAZY_MEDIA_ESTIMATE_BYTES[normalizedKind] || LIVE_CHAT_LAZY_MEDIA_ESTIMATE_BYTES.image;
  }

  function liveChatEstimateMessageBytes(message) {
    let bytes = 512 + (normalizeText(message?.text).length * 2);
    (Array.isArray(message?.media) ? message.media : []).forEach((item) => {
      const url = normalizeText(item?.url || item?.src);
      if (url) {
        bytes += liveChatEstimateMediaBytes(url, item?.kind || "image");
      }
    });
    (Array.isArray(message?.audio) ? message.audio : []).forEach((item) => {
      const url = normalizeText(item?.url || item?.src);
      if (url) {
        bytes += liveChatEstimateMediaBytes(url, "audio");
      }
    });
    return bytes;
  }

  function liveChatLazyStateFor(conversationId) {
    const id = normalizeText(conversationId);
    if (!id) {
      return {
        windowStart: 0,
        loadedBytes: 0,
        loadedMedia: new Map(),
        isLoadingOlder: false,
        messageCount: 0,
      };
    }
    return liveChatRedesignState.messageLazyByThread[id] || {
      windowStart: 0,
      loadedBytes: 0,
      loadedMedia: new Map(),
      isLoadingOlder: false,
      messageCount: 0,
    };
  }

  function liveChatComputeLazyWindowStart(messages) {
    const list = Array.isArray(messages) ? messages : [];
    if (!list.length) {
      return 0;
    }
    let bytes = 0;
    let start = list.length;
    for (let index = list.length - 1; index >= 0; index -= 1) {
      bytes += liveChatEstimateMessageBytes(list[index]);
      start = index;
      const visibleCount = list.length - start;
      if (visibleCount >= LIVE_CHAT_LAZY_MIN_MESSAGES && bytes >= LIVE_CHAT_LAZY_BUDGET_BYTES) {
        break;
      }
    }
    return Math.max(0, start);
  }

  function liveChatInitMessageLazyWindow(conversationId, messages, options = {}) {
    const id = normalizeText(conversationId);
    const list = Array.isArray(messages) ? messages : [];
    const forceReset = options.forceReset === true;
    const existing = liveChatRedesignState.messageLazyByThread[id];
    if (!forceReset && existing && existing.messageCount === list.length) {
      return existing;
    }
    const previousStart = existing?.windowStart;
    const windowStart = forceReset || !Number.isInteger(previousStart)
      ? liveChatComputeLazyWindowStart(list)
      : Math.min(previousStart, Math.max(0, list.length - LIVE_CHAT_LAZY_MIN_MESSAGES));
    liveChatRedesignState.messageLazyByThread[id] = {
      windowStart: Math.max(0, windowStart),
      loadedBytes: forceReset ? 0 : (existing?.loadedBytes || 0),
      loadedMedia: forceReset ? new Map() : (existing?.loadedMedia || new Map()),
      isLoadingOlder: false,
      messageCount: list.length,
    };
    return liveChatRedesignState.messageLazyByThread[id];
  }

  function liveChatResetMessageLazyWindow(conversationId) {
    const id = normalizeText(conversationId);
    if (id) {
      delete liveChatRedesignState.messageLazyByThread[id];
    }
  }

  function liveChatGetWindowedMessages(active) {
    const messages = Array.isArray(active?.messages) ? active.messages : [];
    if (!messages.length) {
      return { messages: [], windowStart: 0, hasOlder: false, lazy: liveChatLazyStateFor(active?.id) };
    }
    const lazy = liveChatInitMessageLazyWindow(active.id, messages);
    const windowStart = Math.max(0, Math.min(lazy.windowStart, messages.length - 1));
    lazy.windowStart = windowStart;
    lazy.messageCount = messages.length;
    return {
      messages: messages.slice(windowStart),
      windowStart,
      hasOlder: windowStart > 0,
      lazy,
    };
  }

  const LIVE_CHAT_MEDIA_SKELETON_HOST_SELECTOR = [
    ".lcx-message-media__hit",
    ".lcx-message-video",
    ".lcx-reply-preview-photo",
    ".lcx-attachment-composer__thumb-preview",
    ".lcx-pinned-product-card__media",
    ".lcx-media-tile",
    ".lcx-media-slide",
    ".lcx-order-history__thumb",
    ".lcx-wallpaper-card__preview",
    ".lcx-avatar",
    ".lcx-media-viewer__media-frame",
    ".lcx-camera-modal__stage",
  ].join(",");

  function liveChatMediaElementSource(element) {
    if (!(element instanceof HTMLImageElement) && !(element instanceof HTMLVideoElement)) {
      return "";
    }
    if (element instanceof HTMLVideoElement && element.srcObject) {
      return "camera-stream";
    }
    return normalizeText(
      element.dataset.lcxLazySrc
      || element.currentSrc
      || element.getAttribute("src")
      || element.querySelector?.("source[src], source[data-src]")?.getAttribute("src")
      || element.querySelector?.("source[data-src]")?.dataset?.src,
    );
  }

  function liveChatMediaSkeletonHost(element) {
    if (!(element instanceof HTMLElement)) {
      return null;
    }
    const cachedHost = liveChatMediaSkeletonHostByElement.get(element);
    if (cachedHost instanceof HTMLElement) {
      return cachedHost;
    }
    const host = element.matches(LIVE_CHAT_MEDIA_SKELETON_HOST_SELECTOR)
      ? element
      : element.closest(LIVE_CHAT_MEDIA_SKELETON_HOST_SELECTOR);
    if (host instanceof HTMLElement) {
      liveChatMediaSkeletonHostByElement.set(element, host);
    }
    return host instanceof HTMLElement ? host : null;
  }

  function liveChatSetMediaSkeletonState(element, loading, failed = false) {
    if (!(element instanceof HTMLImageElement) && !(element instanceof HTMLVideoElement)) {
      return;
    }
    const isLoading = Boolean(loading);
    element.classList.add("lcx-media-skeleton-target");
    element.classList.toggle("is-media-skeleton-loading", isLoading);
    element.classList.toggle("is-media-skeleton-error", !isLoading && Boolean(failed));
    if (isLoading) {
      element.setAttribute("aria-busy", "true");
    } else {
      element.removeAttribute("aria-busy");
    }

    const host = liveChatMediaSkeletonHost(element);
    if (!(host instanceof HTMLElement) || host === element) {
      return;
    }
    host.classList.add("lcx-media-skeleton-host");
    const hasPendingMedia = Boolean(host.querySelector(".is-media-skeleton-loading"));
    host.classList.toggle("is-media-loading", hasPendingMedia);
    if (hasPendingMedia) {
      host.setAttribute("aria-busy", "true");
    } else {
      host.removeAttribute("aria-busy");
    }
  }

  function liveChatSyncMediaSkeletonState(element) {
    if (!(element instanceof HTMLImageElement) && !(element instanceof HTMLVideoElement)) {
      return;
    }
    const source = liveChatMediaElementSource(element);
    if (!source) {
      liveChatSetMediaSkeletonState(element, false);
      return;
    }
    if (element instanceof HTMLImageElement) {
      if (element.complete && element.naturalWidth > 0) {
        liveChatSetMediaSkeletonState(element, false);
        return;
      }
      if (element.complete && element.getAttribute("src") && element.naturalWidth <= 0) {
        liveChatSetMediaSkeletonState(element, false, true);
        return;
      }
      liveChatSetMediaSkeletonState(element, true);
      return;
    }
    if (element.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      liveChatSetMediaSkeletonState(element, false);
      return;
    }
    liveChatSetMediaSkeletonState(element, true);
  }

  function liveChatBindMediaSkeleton(element) {
    if (!(element instanceof HTMLImageElement) && !(element instanceof HTMLVideoElement)) {
      return;
    }
    if (element.dataset.lcxMediaSkeletonBound !== "true") {
      element.dataset.lcxMediaSkeletonBound = "true";
      if (element instanceof HTMLImageElement) {
        element.addEventListener("load", () => liveChatSetMediaSkeletonState(element, false));
        element.addEventListener("error", () => liveChatSetMediaSkeletonState(element, false, true));
      } else {
        const finishVideoLoad = () => liveChatSetMediaSkeletonState(element, false);
        element.addEventListener("loadeddata", finishVideoLoad);
        element.addEventListener("canplay", finishVideoLoad);
        element.addEventListener("playing", finishVideoLoad);
        element.addEventListener("loadedmetadata", () => {
          if (!element.closest(".lcx-message-video, .lcx-media-viewer, .lcx-camera-modal")) {
            finishVideoLoad();
          } else if (element.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            finishVideoLoad();
          }
        });
        element.addEventListener("error", () => liveChatSetMediaSkeletonState(element, false, true));
        element.addEventListener("emptied", () => window.queueMicrotask(() => liveChatSyncMediaSkeletonState(element)));
      }
    }
    liveChatSyncMediaSkeletonState(element);
  }

  function liveChatScanMediaSkeletons(root) {
    if (!(root instanceof Element) && root !== document) {
      return;
    }
    if (root instanceof HTMLImageElement || root instanceof HTMLVideoElement) {
      liveChatBindMediaSkeleton(root);
    }
    root.querySelectorAll?.("img, video").forEach(liveChatBindMediaSkeleton);
  }

  function liveChatObserveMediaSkeletons(root) {
    if (!(root instanceof Element)) {
      return;
    }
    liveChatScanMediaSkeletons(root);
    if (liveChatMediaSkeletonRoots.has(root) || typeof MutationObserver !== "function") {
      return;
    }
    if (!liveChatMediaSkeletonObserver) {
      liveChatMediaSkeletonObserver = new MutationObserver((records) => {
        records.forEach((record) => {
          if (record.type === "attributes") {
            liveChatSyncMediaSkeletonState(record.target);
            return;
          }
          record.addedNodes.forEach((node) => {
            if (node instanceof Element) {
              liveChatScanMediaSkeletons(node);
            }
          });
        });
      });
    }
    liveChatMediaSkeletonObserver.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src"],
    });
    liveChatMediaSkeletonRoots.add(root);
  }

  function liveChatLazyMediaAttrs(source, kind = "image", className = "lcx-message-media__item", policy = "scroll") {
    const normalizedSource = normalizeText(source);
    const normalizedPolicy = policy === "tap" ? "tap" : "scroll";
    return `class="${className} is-lazy-pending" data-lcx-lazy-src="${liveChatEscape(normalizedSource)}" data-lcx-lazy-kind="${liveChatEscape(kind)}" data-lcx-lazy-policy="${normalizedPolicy}" decoding="async"`;
  }

  function liveChatMediaPlaceholderMarkup(className = "lcx-message-media__placeholder") {
    return `<span class="${className}" aria-hidden="true"></span>`;
  }

  function liveChatSetPhotoLoadingState(element, loading) {
    liveChatSetMediaSkeletonState(element, loading);
  }

  function liveChatFinishPhotoLoad(element, src, estimatedBytes, conversationId) {
    if (!(element instanceof HTMLImageElement)) {
      return;
    }
    element.classList.remove("is-lazy-pending");
    liveChatSetPhotoLoadingState(element, false);
    liveChatTrackLazyMediaLoaded(
      conversationId,
      src,
      element.naturalWidth > 0 && element.naturalHeight > 0
        ? Math.max(estimatedBytes, Math.round((element.naturalWidth * element.naturalHeight) / 4))
        : estimatedBytes,
    );
    const bubble = element.closest("[data-lcx-photo-bubble]");
    if (bubble instanceof HTMLElement) {
      liveChatFitPhotoBubble(bubble);
    }
  }

  function liveChatMessageHistoryLoaderMarkup(state) {
    if (!state || !(state.windowStart > 0 || state.isLoadingOlder)) {
      return "";
    }
    return `
      <div class="lcx-message-history-loader${state.isLoadingOlder ? " is-loading" : ""}" data-lcx-load-older${state.isLoadingOlder ? ' aria-busy="true"' : ""}>
        ${state.isLoadingOlder
          ? '<span class="lcx-message-history-loader__spinner" aria-hidden="true"></span><span>Loading older messages...</span>'
          : "<span>Scroll up for older messages</span>"}
      </div>`;
  }

  function liveChatBuildMessageAreaInnerHtml(active, orderSummaryIndex = -1) {
    const messages = Array.isArray(active?.messages) ? active.messages : [];
    if (!messages.length) {
      return "";
    }
    const windowed = liveChatGetWindowedMessages(active);
    const adjustedOrderIndex = orderSummaryIndex >= windowed.windowStart && orderSummaryIndex < messages.length
      ? orderSummaryIndex - windowed.windowStart
      : -1;
    const historyLoader = liveChatMessageHistoryLoaderMarkup({
      windowStart: windowed.windowStart,
      isLoadingOlder: windowed.lazy.isLoadingOlder,
    });
    return `${historyLoader}${liveChatMessagesMarkup(windowed.messages, active, adjustedOrderIndex, windowed.windowStart)}`;
  }

  function liveChatTrackLazyMediaLoaded(conversationId, src, bytes) {
    const lazy = liveChatLazyStateFor(conversationId);
    const normalizedSrc = normalizeText(src);
    if (!normalizedSrc || lazy.loadedMedia.has(normalizedSrc)) {
      return;
    }
    const size = Number(bytes) > 0 ? Number(bytes) : liveChatEstimateMediaBytes(normalizedSrc);
    lazy.loadedMedia.set(normalizedSrc, size);
    lazy.loadedBytes = [...lazy.loadedMedia.values()].reduce((total, value) => total + value, 0);
  }

  function liveChatUntrackLazyMedia(conversationId, src) {
    const lazy = liveChatLazyStateFor(conversationId);
    const normalizedSrc = normalizeText(src);
    if (!normalizedSrc || !lazy.loadedMedia.has(normalizedSrc)) {
      return;
    }
    lazy.loadedMedia.delete(normalizedSrc);
    lazy.loadedBytes = [...lazy.loadedMedia.values()].reduce((total, value) => total + value, 0);
  }

  function liveChatDeactivateLazyMediaElement(element) {
    if (!(element instanceof HTMLElement) || element.dataset.lcxLazyLoaded !== "true") {
      return;
    }
    const src = normalizeText(element.dataset.lcxLazySrc || element.getAttribute("src") || "");
    const active = liveChatGetActive();
    if (element instanceof HTMLImageElement) {
      element.removeAttribute("src");
    } else if (element instanceof HTMLVideoElement || element instanceof HTMLAudioElement) {
      element.pause?.();
      element.removeAttribute("src");
      element.load?.();
    }
    element.dataset.lcxLazyLoaded = "false";
    element.classList.add("is-lazy-pending");
    liveChatSetPhotoLoadingState(element, false);
    if (active?.id && src) {
      liveChatUntrackLazyMedia(active.id, src);
    }
  }

  function liveChatEvictLazyMediaIfOverBudget(messageArea, incomingBytes = 0) {
    const active = liveChatGetActive();
    if (!(messageArea instanceof HTMLElement) || !active) {
      return false;
    }
    const lazy = liveChatLazyStateFor(active.id);
    if (lazy.loadedBytes + incomingBytes <= LIVE_CHAT_LAZY_BUDGET_BYTES) {
      return true;
    }
    const loadedElements = [...messageArea.querySelectorAll("[data-lcx-lazy-loaded='true']")];
    if (!loadedElements.length) {
      return incomingBytes <= LIVE_CHAT_LAZY_BUDGET_BYTES;
    }
    const areaRect = messageArea.getBoundingClientRect();
    const preferEvictBottom = !liveChatIsMessageAreaNearBottom(messageArea);
    const ranked = loadedElements
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const centerY = rect.top + (rect.height / 2);
        const distance = preferEvictBottom
          ? Math.max(0, centerY - areaRect.bottom)
          : Math.max(0, areaRect.top - centerY);
        return { element, distance };
      })
      .sort((left, right) => right.distance - left.distance);

    for (const entry of ranked) {
      liveChatDeactivateLazyMediaElement(entry.element);
      if (lazy.loadedBytes + incomingBytes <= LIVE_CHAT_LAZY_BUDGET_BYTES) {
        return true;
      }
    }
    return lazy.loadedBytes + incomingBytes <= LIVE_CHAT_LAZY_BUDGET_BYTES;
  }

  function liveChatActivateLazyMediaElement(element, messageArea, options = {}) {
    if (!(element instanceof HTMLElement)) {
      return;
    }
    const src = normalizeText(element.dataset.lcxLazySrc);
    if (!src || element.dataset.lcxLazyLoaded === "true") {
      return;
    }
    const policy = normalizeText(element.dataset.lcxLazyPolicy) || "scroll";
    const force = options.force === true;
    if (!force && policy === "tap") {
      return;
    }
    const kind = normalizeText(element.dataset.lcxLazyKind) || "image";
    const active = liveChatGetActive();
    if (!active) {
      return;
    }
    const estimatedBytes = liveChatEstimateMediaBytes(src, kind);
    if (!liveChatEvictLazyMediaIfOverBudget(messageArea, estimatedBytes)) {
      return;
    }

    element.dataset.lcxLazyLoaded = "true";

    if (element instanceof HTMLImageElement) {
      liveChatSetPhotoLoadingState(element, true);
      element.src = src;
      const finishLoad = () => {
        liveChatFinishPhotoLoad(element, src, estimatedBytes, active.id);
      };
      if (element.complete && element.naturalWidth > 0) {
        finishLoad();
      } else {
        element.addEventListener("load", finishLoad, { once: true });
        element.addEventListener("error", () => {
          element.classList.remove("is-lazy-pending");
          liveChatSetPhotoLoadingState(element, false);
          liveChatTrackLazyMediaLoaded(active.id, src, estimatedBytes);
        }, { once: true });
      }
      liveChatTrackLazyMediaLoaded(active.id, src, estimatedBytes);
      return;
    }

    if (element instanceof HTMLVideoElement) {
      liveChatSetMediaSkeletonState(element, true);
      element.preload = "metadata";
      element.src = src;
      const finishVideoLoad = () => {
        element.classList.remove("is-lazy-pending");
        liveChatSetMediaSkeletonState(element, false);
        liveChatTrackLazyMediaLoaded(active.id, src, estimatedBytes);
      };
      element.addEventListener("loadedmetadata", () => {
        liveChatTrackLazyMediaLoaded(active.id, src, estimatedBytes);
      }, { once: true });
      if (element.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        finishVideoLoad();
      } else {
        element.addEventListener("loadeddata", finishVideoLoad, { once: true });
      }
      element.addEventListener("error", () => {
        element.classList.remove("is-lazy-pending");
        liveChatSetMediaSkeletonState(element, false, true);
        liveChatTrackLazyMediaLoaded(active.id, src, estimatedBytes);
      }, { once: true });
      liveChatTrackLazyMediaLoaded(active.id, src, estimatedBytes);
      return;
    }

    element.classList.remove("is-lazy-pending");
    if (element instanceof HTMLAudioElement) {
      element.preload = "metadata";
      element.src = src;
      element.addEventListener("loadedmetadata", () => {
        liveChatTrackLazyMediaLoaded(active.id, src, estimatedBytes);
      }, { once: true });
      element.addEventListener("error", () => {
        liveChatTrackLazyMediaLoaded(active.id, src, estimatedBytes);
      }, { once: true });
      liveChatTrackLazyMediaLoaded(active.id, src, estimatedBytes);
    }
  }

  function liveChatActivateLazyMediaFromControl(control) {
    if (!(control instanceof HTMLElement)) {
      return;
    }
    const messageArea = control.closest("[data-lcx-message-area]");
    const lazyTarget = control.querySelector("[data-lcx-lazy-src]")
      || control.closest("[data-lcx-message-video]")?.querySelector("[data-lcx-lazy-src]")
      || (control.matches("[data-lcx-lazy-src]") ? control : null);
    if (lazyTarget instanceof HTMLElement) {
      liveChatActivateLazyMediaElement(lazyTarget, messageArea instanceof HTMLElement ? messageArea : null, { force: true });
    }
  }

  function liveChatLoadVisibleScrollLazyMedia(messageArea) {
    if (!(messageArea instanceof HTMLElement)) {
      return;
    }
    const areaRect = messageArea.getBoundingClientRect();
    const pending = [...messageArea.querySelectorAll("[data-lcx-lazy-src][data-lcx-lazy-policy='scroll']:not([data-lcx-lazy-loaded='true'])")];
    pending.forEach((element) => {
      const rect = element.getBoundingClientRect();
      const isVisible = rect.bottom >= (areaRect.top - 48) && rect.top <= (areaRect.bottom + 48);
      if (isVisible) {
        liveChatActivateLazyMediaElement(element, messageArea);
      }
    });
  }

  function liveChatResetLazyMediaScrollTracking(messageArea) {
    if (messageArea instanceof HTMLElement) {
      liveChatMessageAreaLastScrollTop = messageArea.scrollTop;
    } else {
      liveChatMessageAreaLastScrollTop = 0;
    }
  }

  async function liveChatExpandOlderMessages(conversationId, messageArea) {
    const id = normalizeText(conversationId);
    const active = liveChatGetActive();
    if (!active || active.id !== id || !(messageArea instanceof HTMLElement)) {
      return;
    }
    const lazy = liveChatLazyStateFor(id);
    if (lazy.isLoadingOlder || lazy.windowStart <= 0) {
      return;
    }

    lazy.isLoadingOlder = true;
    const loader = messageArea.querySelector("[data-lcx-load-older]");
    if (loader instanceof HTMLElement) {
      loader.classList.add("is-loading");
      loader.setAttribute("aria-busy", "true");
      loader.innerHTML = '<span class="lcx-message-history-loader__spinner" aria-hidden="true"></span><span>Loading older messages...</span>';
    }

    await new Promise((resolve) => window.requestAnimationFrame(resolve));

    const previousScrollHeight = messageArea.scrollHeight;
    const previousScrollTop = messageArea.scrollTop;
    lazy.windowStart = Math.max(0, lazy.windowStart - LIVE_CHAT_LAZY_LOAD_BATCH);
    lazy.isLoadingOlder = false;

    const order = liveChatOrderFor(active);
    const orderSummaryIndex = order.id
      ? Math.max(0, (Array.isArray(active.messages) ? active.messages : []).findIndex((message) => message?.side === "support"))
      : -1;
    const typingMarkup = liveChatTypingIndicatorMarkup(active);
    messageArea.innerHTML = `${liveChatBuildMessageAreaInnerHtml(active, orderSummaryIndex)}${typingMarkup}`;

    const scrollDelta = messageArea.scrollHeight - previousScrollHeight;
    messageArea.scrollTop = previousScrollTop + scrollDelta;

    liveChatInitPhotoBubbles();
    liveChatInitMessageAudioPlayers();
    liveChatInitMessageVideos();
    liveChatScanMediaSkeletons(messageArea);
    void liveChatMountMessageEmojiLotties();
    liveChatResetLazyMediaScrollTracking(messageArea);
    liveChatLoadVisibleScrollLazyMedia(messageArea);
    liveChatEvictLazyMediaIfOverBudget(messageArea);
  }

  function liveChatHandleLazyHistoryScroll(messageArea) {
    if (!(messageArea instanceof HTMLElement)) {
      return;
    }
    const active = liveChatGetActive();
    if (!active) {
      return;
    }
    const scrollTop = messageArea.scrollTop;
    const nearBottom = liveChatIsMessageAreaNearBottom(messageArea);
    const scrollingDown = nearBottom
      || scrollTop > liveChatMessageAreaLastScrollTop + LIVE_CHAT_LAZY_SCROLL_DIRECTION_THRESHOLD;
    liveChatMessageAreaLastScrollTop = scrollTop;

    if (scrollingDown) {
      liveChatLoadVisibleScrollLazyMedia(messageArea);
    }

    const lazy = liveChatLazyStateFor(active.id);
    if (lazy.isLoadingOlder || lazy.windowStart <= 0) {
      return;
    }
    if (nearBottom || scrollTop > LIVE_CHAT_LAZY_SCROLL_TOP_THRESHOLD) {
      return;
    }
    void liveChatExpandOlderMessages(active.id, messageArea);
  }

  function liveChatEnsureMessageInLazyWindow(messageIndex) {
    const active = liveChatGetActive();
    if (!active || !Number.isInteger(messageIndex) || messageIndex < 0) {
      return;
    }
    const lazy = liveChatInitMessageLazyWindow(active.id, active.messages);
    if (messageIndex >= lazy.windowStart) {
      return;
    }
    lazy.windowStart = Math.max(0, messageIndex - 5);
    liveChatSyncActiveMessageArea(active);
  }

  function liveChatIsMessageAreaNearBottom(messageArea, threshold = LIVE_CHAT_SCROLL_BOTTOM_THRESHOLD) {
    if (!(messageArea instanceof HTMLElement)) {
      return false;
    }
    const maxScrollTop = Math.max(0, messageArea.scrollHeight - messageArea.clientHeight);
    return maxScrollTop - messageArea.scrollTop <= threshold;
  }

  function liveChatHandleMessageAreaScroll(messageArea) {
    if (!(messageArea instanceof HTMLElement)) {
      return;
    }
    const nearBottom = liveChatIsMessageAreaNearBottom(messageArea);
    if (nearBottom) {
      liveChatRedesignState.messageScrollPinned = true;
      liveChatHandleLazyHistoryScroll(messageArea);
      return;
    }
    liveChatRedesignState.messageScrollPinned = false;
    liveChatRedesignState.forceMessageScrollBottom = false;
    liveChatMessageScrollBottomStickToken += 1;
    liveChatHandleLazyHistoryScroll(messageArea);
  }

  function liveChatStickMessageAreaToBottom(messageArea) {
    if (!(messageArea instanceof HTMLElement)) {
      return;
    }
    if (!liveChatRedesignState.forceMessageScrollBottom && !liveChatRedesignState.messageScrollPinned) {
      return;
    }
    messageArea.scrollTop = Math.max(0, messageArea.scrollHeight - messageArea.clientHeight);
  }

  let liveChatMessageScrollBottomStickToken = 0;

  function liveChatScheduleMessageScrollBottomStick(activeId) {
    const normalizedActiveId = normalizeText(activeId);
    if (!normalizedActiveId) {
      return;
    }
    const token = ++liveChatMessageScrollBottomStickToken;
    const getMessageArea = () => {
      const messageArea = elements.liveChatMount?.querySelector("[data-lcx-message-area]");
      if (!(messageArea instanceof HTMLElement) || messageArea.dataset.lcxConversationId !== normalizedActiveId) {
        return null;
      }
      return messageArea;
    };
    const stick = () => {
      if (token !== liveChatMessageScrollBottomStickToken) {
        return;
      }
      if (!liveChatRedesignState.forceMessageScrollBottom && !liveChatRedesignState.messageScrollPinned) {
        return;
      }
      const messageArea = getMessageArea();
      if (!messageArea) {
        return;
      }
      liveChatStickMessageAreaToBottom(messageArea);
    };

    stick();
    window.requestAnimationFrame(() => {
      stick();
      window.requestAnimationFrame(stick);
    });

    const messageArea = getMessageArea();
    if (messageArea instanceof HTMLElement) {
      messageArea.querySelectorAll("img").forEach((img) => {
        if (img instanceof HTMLImageElement && !img.complete) {
          img.addEventListener("load", stick, { once: true });
          img.addEventListener("error", stick, { once: true });
        }
      });

      if (typeof ResizeObserver !== "undefined") {
        let lastHeight = messageArea.scrollHeight;
        let stableTimer = 0;
        const observer = new ResizeObserver(() => {
          stick();
          const current = getMessageArea();
          if (!current) {
            observer.disconnect();
            return;
          }
          const nextHeight = current.scrollHeight;
          if (nextHeight === lastHeight) {
            return;
          }
          lastHeight = nextHeight;
          window.clearTimeout(stableTimer);
          stableTimer = window.setTimeout(() => observer.disconnect(), 320);
        });
        observer.observe(messageArea);
        window.setTimeout(() => observer.disconnect(), 2600);
      }
    }

    window.setTimeout(stick, 60);
    window.setTimeout(stick, 180);
    window.setTimeout(stick, 420);
    window.setTimeout(stick, 900);
  }

  function liveChatCaptureThreadListScroll() {
    const list = elements.liveChatMount?.querySelector("[data-lcx-thread-list]");
    if (!(list instanceof HTMLElement) || list.clientHeight <= 0) {
      return null;
    }
    const scrollTop = list.scrollTop;
    const listTop = list.getBoundingClientRect().top;
    let anchorThreadId = "";
    let anchorOffset = 0;
    list.querySelectorAll("[data-lcx-thread]").forEach((threadEl) => {
      if (!(threadEl instanceof HTMLElement) || threadEl.hidden || threadEl.offsetHeight <= 0 || anchorThreadId) {
        return;
      }
      const threadTop = threadEl.getBoundingClientRect().top - listTop + scrollTop;
      const threadBottom = threadTop + threadEl.offsetHeight;
      if (threadBottom > scrollTop) {
        anchorThreadId = normalizeText(threadEl.dataset.lcxThread);
        anchorOffset = scrollTop - threadTop;
      }
    });
    const activeThreadId = normalizeText(liveChatRedesignState.activeId);
    const activeThread = Array.from(list.querySelectorAll("[data-lcx-thread]")).find((threadEl) => (
      threadEl instanceof HTMLElement
      && !threadEl.hidden
      && normalizeText(threadEl.dataset.lcxThread) === activeThreadId
    ));
    const activeOffset = activeThread instanceof HTMLElement
      ? activeThread.getBoundingClientRect().top - listTop
      : 0;
    return { scrollTop, anchorThreadId, anchorOffset, activeThreadId, activeOffset };
  }

  function liveChatPersistThreadListPosition() {
    const position = liveChatCaptureThreadListScroll();
    if (position) {
      liveChatWriteStoredThreadListPosition(position);
    }
  }

  function liveChatScheduleThreadListPositionPersist() {
    if (liveChatThreadListPositionPersistFrame) {
      return;
    }
    liveChatThreadListPositionPersistFrame = window.requestAnimationFrame(() => {
      liveChatThreadListPositionPersistFrame = 0;
      liveChatPersistThreadListPosition();
    });
  }

  function liveChatRestoreThreadListScroll(previousScroll) {
    if (!previousScroll) {
      return;
    }
    const applyScroll = () => {
      const list = elements.liveChatMount?.querySelector("[data-lcx-thread-list]");
      if (!(list instanceof HTMLElement)) {
        return false;
      }
      if (list.clientHeight <= 0) {
        return false;
      }
      if (previousScroll.anchorThreadId) {
        const anchor = Array.from(list.querySelectorAll("[data-lcx-thread]")).find((threadEl) => (
          threadEl instanceof HTMLElement
          && normalizeText(threadEl.dataset.lcxThread) === previousScroll.anchorThreadId
        ));
        if (anchor instanceof HTMLElement) {
          const listTop = list.getBoundingClientRect().top;
          const threadTop = anchor.getBoundingClientRect().top - listTop + list.scrollTop;
          const maxScrollTop = Math.max(0, list.scrollHeight - list.clientHeight);
          list.scrollTop = Math.min(Math.max(0, threadTop + (Number(previousScroll.anchorOffset) || 0)), maxScrollTop);
          return true;
        }
      }
      const activeThreadId = normalizeText(
        previousScroll.activeThreadId || liveChatRedesignState.activeId,
      );
      if (activeThreadId) {
        const activeThread = Array.from(list.querySelectorAll("[data-lcx-thread]")).find((threadEl) => (
          threadEl instanceof HTMLElement
          && !threadEl.hidden
          && normalizeText(threadEl.dataset.lcxThread) === activeThreadId
        ));
        if (activeThread instanceof HTMLElement) {
          const listTop = list.getBoundingClientRect().top;
          const threadTop = activeThread.getBoundingClientRect().top - listTop + list.scrollTop;
          const activeOffset = Number(previousScroll.activeOffset) || 0;
          const maxScrollTop = Math.max(0, list.scrollHeight - list.clientHeight);
          list.scrollTop = Math.min(Math.max(0, threadTop - activeOffset), maxScrollTop);
          return true;
        }
      }
      if (Number.isFinite(previousScroll.scrollTop)) {
        const maxScrollTop = Math.max(0, list.scrollHeight - list.clientHeight);
        list.scrollTop = Math.min(previousScroll.scrollTop, maxScrollTop);
        return true;
      }
      return false;
    };

    applyScroll();
    window.requestAnimationFrame(() => {
      applyScroll();
      window.requestAnimationFrame(() => {
        applyScroll();
        liveChatPersistThreadListPosition();
      });
    });
  }

  function liveChatCaptureMessageScroll(activeId) {
    const messageArea = elements.liveChatMount?.querySelector("[data-lcx-message-area]");
    if (!(messageArea instanceof HTMLElement) || messageArea.dataset.lcxConversationId !== normalizeText(activeId)) {
      return null;
    }
    const maxScrollTop = Math.max(0, messageArea.scrollHeight - messageArea.clientHeight);
    return {
      scrollTop: messageArea.scrollTop,
      wasNearBottom: liveChatIsMessageAreaNearBottom(messageArea),
    };
  }

  function liveChatRestoreMessageScroll(activeId, previousScroll, options = {}) {
    const normalizedActiveId = normalizeText(activeId);
    const shouldScrollBottom = !options.preserveExact && (
      liveChatRedesignState.forceMessageScrollBottom
      || liveChatRedesignState.messageScrollPinned
    );

    const applyScroll = () => {
      const messageArea = elements.liveChatMount?.querySelector("[data-lcx-message-area]");
      if (!(messageArea instanceof HTMLElement) || messageArea.dataset.lcxConversationId !== normalizedActiveId) {
        return false;
      }
      if (options.preserveExact && previousScroll) {
        const maxScrollTop = Math.max(0, messageArea.scrollHeight - messageArea.clientHeight);
        messageArea.scrollTop = Math.min(previousScroll.scrollTop, maxScrollTop);
      } else if (shouldScrollBottom) {
        liveChatStickMessageAreaToBottom(messageArea);
      } else if (previousScroll) {
        const maxScrollTop = Math.max(0, messageArea.scrollHeight - messageArea.clientHeight);
        messageArea.scrollTop = Math.min(previousScroll.scrollTop, maxScrollTop);
      }
      return true;
    };

    window.requestAnimationFrame(() => {
      applyScroll();
      window.requestAnimationFrame(() => {
        applyScroll();
        liveChatRedesignState.forceMessageScrollBottom = false;
        liveChatSyncChatFindWidget();
        if (liveChatRedesignState.chatFindOpen && normalizeText(liveChatRedesignState.chatFindQuery)) {
          liveChatSyncChatFindHighlights({ goToIndex: liveChatRedesignState.chatFindMatchIndex });
        }
        if (shouldScrollBottom && !options.preserveExact) {
          liveChatScheduleMessageScrollBottomStick(normalizedActiveId);
        }
      });
    });
  }

  function liveChatRenderBoard(options = {}) {
    if (!elements.liveChatMount) {
      return;
    }
    const preserveComposer = options?.preserveComposer === true
      ? liveChatCaptureComposerState()
      : (options?.preserveComposer || null);
    if (options?.preserveReactionPicker !== true) {
      liveChatRedesignState.reactionPicker = null;
    }
    const active = liveChatGetActive();
    const previousMessageScroll = liveChatCaptureMessageScroll(active?.id);
    const previousThreadListScroll = liveChatCaptureThreadListScroll()
      || liveChatReadStoredThreadListPosition();
    const shouldStickMessageBottom = liveChatRedesignState.forceMessageScrollBottom
      || liveChatRedesignState.messageScrollPinned;
    const threads = liveChatFilteredConversations();
    const messages = Array.isArray(active?.messages) ? active.messages : [];
    const canCurrentActorReply = Boolean(active && liveChatCanCurrentActorReply(active));
    const activeHandoff = liveChatNormalizeAgentHandoff(active?.agentHandoff);
    const composerPlaceholder = canCurrentActorReply
      ? "Type a message..."
      : activeHandoff.status === "pending"
        ? (authState?.role === "employee"
          ? "Start assisting to reply..."
          : "Accept the buyer's request to reply...")
        : activeHandoff.status === "accepted"
          ? `Handled by ${activeHandoff.activeAgent?.senderName || "another participant"}`
          : (authState?.role === "employee" && liveChatIsCurrentEmployeeAssigned(active)
            ? "Start assisting to reply as a human agent..."
            : "AI is handling this conversation...");
    const order = liveChatOrderFor(active);
    const product = liveChatProductFor(active);
    const orderProductAmount = [order.total, product.price]
      .map((value) => Number(value))
      .find((value) => Number.isFinite(value));
    const placedAt = normalizeText(order.placedAt || active?.customerSince) || "Recently";
    const orderSummaryIndex = order.id
      ? Math.max(0, messages.findIndex((message) => message?.side === "support"))
      : -1;
    const messageMarkup = messages.length
      ? liveChatBuildMessageAreaInnerHtml(active, orderSummaryIndex)
      : "";
    const pendingReplyMarkup = liveChatReplyStateMarkup(active);
    const pendingEditMarkup = liveChatEditStateMarkup(active);
    const pendingAttachmentMarkup = liveChatAttachmentComposerMarkup(active);
    const composeContextMarkup = pendingEditMarkup || pendingReplyMarkup;
    const emptyThreadsMarkup = liveChatEmptyThreadsMarkup();
    const storyRowMarkup = liveChatStoryRowMarkup(liveChatRedesignConversations);
    const storeName = liveChatStoreName();
    const chatPrefs = active ? liveChatPrefsFor(active.id) : { muted: false, snoozed: false, starred: false, wallpaper: "doodle" };
    const sharedStats = liveChatSharedStats(active);
    const wallpaperClass = liveChatWallpaperClassName(chatPrefs.wallpaper);
    const pendingReplyActive = Boolean(
      liveChatPendingReplyFor(active)
      || liveChatPendingEditFor(active)
      || liveChatPendingAttachmentsFor(active).length,
    );
    const wallpaperStyle = liveChatCustomWallpaperStyle(chatPrefs.wallpaper);
    liveChatUnreadCount = liveChatCountUnreadChats();
    syncLiveChatNavBadge();

    elements.liveChatMount.innerHTML = `
      <div class="live-chat-board lcx-board${active ? "" : " is-inbox-empty"}${liveChatRedesignState.detailsOpen ? " is-details-open" : ""}" data-lcx-board>
        <aside class="lcx-threads" aria-label="Conversations">
          <header class="lcx-threads__header">
            <div class="lcx-search-row">
              <button
                type="button"
                class="lcx-navigation-toggle"
                data-lcx-action="toggle-navigation"
                data-lcx-navigation-toggle
                aria-label="${isSidebarOpen() ? "Close navigation" : "Open navigation"}"
                aria-expanded="${isSidebarOpen() ? "true" : "false"}"
                aria-controls="main-sidebar"
                title="${isSidebarOpen() ? "Close navigation" : "Open navigation"}"
              >${liveChatIcon("menu", 20)}</button>
              <label class="lcx-thread-search">
                <span class="lcx-thread-search__icon" aria-hidden="true">${liveChatIcon("search", 16)}</span>
                <input type="text" role="search" enterkeyhint="search" value="${liveChatEscape(liveChatRedesignState.search)}" placeholder="Find customers" data-lcx-local-search aria-label="Find customers" />
                <button type="button" class="lcx-thread-search__clear lcx-chat-find__close" data-lcx-action="clear-local-search" aria-label="Clear search"${normalizeText(liveChatRedesignState.search) ? "" : " hidden"}>${liveChatIcon("close", 14)}</button>
              </label>
            </div>
          </header>
          <section class="lcx-threads__stories" aria-label="Recent conversations"${storyRowMarkup ? "" : " hidden"}>
            ${storyRowMarkup}
          </section>
          <nav class="lcx-threads__filters" aria-label="Conversation filters">
            <div class="lcx-tabs-carousel" data-lcx-tabs-carousel>
              <button type="button" class="lcx-tabs-carousel__nav lcx-tabs-carousel__nav--prev" data-lcx-action="tabs-prev" aria-label="Previous filters" hidden>${liveChatIcon("chevron", 16)}</button>
              <div class="lcx-tabs" role="tablist" aria-label="Conversation filters">
                ${liveChatConversationFilterTabsMarkup()}
              </div>
              <button type="button" class="lcx-tabs-carousel__nav lcx-tabs-carousel__nav--next" data-lcx-action="tabs-next" aria-label="Next filters" hidden>${liveChatIcon("chevron", 16)}</button>
            </div>
          </nav>
          <div class="lcx-thread-list" data-lcx-thread-list>
            ${threads.length ? threads.map(liveChatThreadMarkup).join("") : emptyThreadsMarkup}
          </div>
        </aside>

        <section class="lcx-conversation${active ? "" : " is-empty"}${pendingReplyActive ? " is-replying" : ""}" aria-label="${active ? "Active conversation" : "No conversation selected"}">
          ${active ? `
            <header class="lcx-conversation__header">
              <button type="button" class="lcx-mobile-back" data-lcx-action="show-threads" aria-label="Show conversations">${liveChatIcon("back", 20)}</button>
              <div class="lcx-conversation__identity">
                ${liveChatAvatar(active, "lcx-avatar--header")}
                <div>
                  <h2>${liveChatConversationNameMarkup(active)}</h2>
                  <p data-lcx-conversation-status>${liveChatEscape(liveChatConversationStatusLabel(active))}</p>
                </div>
              </div>
              <div class="lcx-header-actions">
                <button
                  type="button"
                  class="lcx-header-action lcx-chat-find__trigger${liveChatRedesignState.chatFindOpen ? " is-active" : ""}"
                  data-lcx-action="toggle-chat-find"
                  aria-label="Find in conversation"
                  aria-expanded="${liveChatRedesignState.chatFindOpen ? "true" : "false"}"
                  title="Find in conversation (Ctrl+F)"
                >${liveChatIcon("search", 20)}</button>
                <button type="button" class="lcx-header-action${liveChatRedesignState.detailsOpen ? " is-active" : ""}" data-lcx-action="toggle-details" aria-label="Chat info" aria-expanded="${liveChatRedesignState.detailsOpen ? "true" : "false"}" title="Chat info">${liveChatIcon("info", 20)}</button>
              </div>
            </header>
            ${liveChatAgentHandoffMarkup(active)}
            <div class="lcx-pinned-product-slot${active && liveChatHasPinnedProductContext(active) ? (liveChatIsPinnedProductExpanded(active) ? " is-expanded" : " is-collapsed") : ""}">
              ${liveChatPinnedProductMarkup(active)}
              <div
                class="lcx-chat-find${liveChatRedesignState.chatFindOpen ? " is-open" : ""}"
                data-lcx-chat-find
                aria-hidden="${liveChatRedesignState.chatFindOpen ? "false" : "true"}"
              >
                <div class="lcx-chat-find__drawer">
                  <label class="lcx-chat-find__field">
                    <span class="visually-hidden">Find in conversation</span>
                    <input
                      type="search"
                      value="${liveChatEscape(liveChatRedesignState.chatFindQuery)}"
                      placeholder="Find in chat"
                      data-lcx-chat-find-input
                      autocomplete="off"
                      spellcheck="false"
                      aria-label="Find in conversation"
                    />
                  </label>
                  <span class="lcx-chat-find__status" data-lcx-chat-find-status aria-live="polite"></span>
                  <button type="button" class="lcx-chat-find__nav" data-lcx-action="chat-find-prev" aria-label="Previous match" disabled>${liveChatIcon("down", 16)}</button>
                  <button type="button" class="lcx-chat-find__nav" data-lcx-action="chat-find-next" aria-label="Next match" disabled>${liveChatIcon("down", 16)}</button>
                  <button type="button" class="lcx-chat-find__close" data-lcx-action="close-chat-find" aria-label="Close search">${liveChatIcon("close", 14)}</button>
                </div>
              </div>
            </div>
            <div class="lcx-message-area${wallpaperClass}" data-lcx-message-area data-lcx-conversation-id="${liveChatEscape(active.id)}"${wallpaperStyle}>
              ${messages.length ? messageMarkup : '<div class="lcx-empty-messages"><strong>Start the conversation</strong><p>Send a message to this customer.</p></div>'}
              ${liveChatTypingIndicatorMarkup(active)}
            </div>
            <div class="lcx-compose-zone">
              ${composeContextMarkup}
              ${pendingAttachmentMarkup}
              ${liveChatEmojiPickerMarkup()}
              <form class="lcx-composer${canCurrentActorReply ? "" : " is-locked"}" data-lcx-composer aria-disabled="${canCurrentActorReply ? "false" : "true"}">
                <input type="file" accept="image/*,video/*,.pdf,.doc,.docx" data-lcx-file-input multiple hidden />
                <button type="button" class="lcx-composer__tool" data-lcx-action="attach" aria-label="Attach files" ${canCurrentActorReply ? "" : "disabled"}><span class="lcx-composer__btn-icon">${liveChatIcon("plus", 20)}</span></button>
                <button
                  type="button"
                  class="lcx-composer__emoji${liveChatRedesignState.emojiPickerOpen ? " is-active" : ""}"
                  data-lcx-action="emoji"
                  aria-label="Choose emoji"
                  aria-expanded="${liveChatRedesignState.emojiPickerOpen ? "true" : "false"}"
                  title="Emoji"
                  ${canCurrentActorReply ? "" : "disabled"}
                ><span class="lcx-composer__btn-icon">${liveChatIcon("face-slightly-smiling", 20)}</span></button>
                <button
                  type="button"
                  class="lcx-composer__emoji lcx-composer__camera"
                  data-lcx-action="open-camera"
                  aria-label="Take photo"
                  title="Camera"
                  ${canCurrentActorReply ? "" : "disabled"}
                ><span class="lcx-composer__btn-icon">${liveChatIcon("camera", 20)}</span></button>
                <button
                  type="button"
                  class="lcx-composer__emoji lcx-composer__audio"
                  data-lcx-action="audio-record"
                  aria-label="Record voice message"
                  aria-pressed="false"
                  title="Voice message"
                  ${canCurrentActorReply ? "" : "disabled"}
                ><span class="lcx-composer__btn-icon">${liveChatIcon("mic", 20)}</span></button>
                <div class="lcx-composer__field" data-lcx-composer-field>
                  <textarea rows="1" maxlength="1000" placeholder="${liveChatEscape(composerPlaceholder)}" data-lcx-message-input aria-label="Message" ${canCurrentActorReply ? "" : "disabled"}></textarea>
                  ${liveChatAudioComposerMarkup()}
                </div>
                <button type="submit" class="lcx-send-button" data-lcx-send aria-label="Send message" ${liveChatRedesignState.isSending || !canCurrentActorReply ? "disabled" : ""}>
                  <span class="lcx-composer__send-icon">${liveChatIcon("send", 20)}</span>
                </button>
              </form>
            </div>` : liveChatEmptyConversationMarkup()}
        </section>

        <aside class="lcx-details${liveChatRedesignState.detailsOpen ? " is-open" : ""}" aria-label="${active ? "Customer information" : "Chat information"}" aria-hidden="${liveChatRedesignState.detailsOpen ? "false" : "true"}">
          <div class="lcx-details-stage${active && liveChatRedesignState.detailsPane ? " is-subview" : ""}" data-lcx-details-stage>
            <div class="lcx-details-home">
              <button type="button" class="lcx-details__close" data-lcx-action="hide-details" aria-label="Close customer information">${liveChatIcon("close", 20)}</button>
              ${active ? liveChatDetailsHeadMarkup("Chat info", { centered: true }) : ""}
              ${active ? liveChatDetailsHomeMarkup(active, chatPrefs, sharedStats, storeName) : liveChatEmptyDetailsMarkup()}
            </div>
            <div class="lcx-details-sub" data-lcx-details-sub>
              ${liveChatDetailsSubviewMarkup(active, liveChatRedesignState.detailsPane)}
            </div>
          </div>
          ${liveChatAssignPickerMarkup(active)}
        </aside>
        <div class="lcx-details-backdrop${liveChatRedesignState.detailsOpen ? " is-open" : ""}" data-lcx-action="hide-details"></div>
        ${liveChatReactionPickerMarkup()}
        <div
          class="lcx-message-context-menu"
          data-lcx-thread-context-menu
          role="menu"
          hidden
          aria-hidden="true"
        ></div>
        <div
          class="lcx-message-context-menu"
          data-lcx-message-context-menu
          role="menu"
          hidden
          aria-hidden="true"
        ></div>
        <div class="lcx-toast" role="status" aria-live="polite" data-lcx-toast hidden></div>
      </div>`;

    window.GMS_ADMIN_SEARCH_NOT_FOUND?.mount(elements.liveChatMount);
    liveChatRestoreMessageScroll(active?.id, previousMessageScroll, {
      preserveExact: options.preserveMessageScrollExact === true,
    });
    liveChatRestoreThreadListScroll(previousThreadListScroll);
    liveChatRestoreComposerState(preserveComposer);
    liveChatSyncAudioComposerUi();
    liveChatSyncComposerTextareaHeight();
    liveChatSyncEditComposerDraft();
    liveChatSyncReplyStateAnimation();
    liveChatSyncEditStateAnimation();
    liveChatSyncReplyFocusHighlight();
    liveChatSyncTypingUi();
    liveChatObserveMediaSkeletons(elements.liveChatMount);
    liveChatInitMessageVideos();
    liveChatInitPhotoBubbles();
    liveChatInitMessageAudioPlayers();
    const messageAreaAfterRender = elements.liveChatMount?.querySelector("[data-lcx-message-area]");
    if (messageAreaAfterRender instanceof HTMLElement) {
      liveChatResetLazyMediaScrollTracking(messageAreaAfterRender);
      liveChatLoadVisibleScrollLazyMedia(messageAreaAfterRender);
    }
    if (shouldStickMessageBottom && !options.preserveMessageScrollExact) {
      liveChatScheduleMessageScrollBottomStick(active?.id);
    }
    void liveChatMountMessageEmojiLotties().then(() => {
      if (shouldStickMessageBottom && !options.preserveMessageScrollExact) {
        liveChatScheduleMessageScrollBottomStick(active?.id);
      }
      liveChatConsumeMessageEnterAnimations();
    });
    liveChatConsumeMessageEnterAnimations();
    if (liveChatRedesignState.emojiPickerOpen) {
      void liveChatMountPickerEmojiLotties();
    } else {
      liveChatDestroyPickerEmojiLotties();
    }
    liveChatInitFilterTabsCarousel();
  }

  function liveChatSyncDetailsPanelOpen() {
    const board = elements.liveChatMount?.querySelector("[data-lcx-board]");
    const details = elements.liveChatMount?.querySelector(".lcx-details");
    const backdrop = elements.liveChatMount?.querySelector(".lcx-details-backdrop");
    const stage = elements.liveChatMount?.querySelector("[data-lcx-details-stage]");
    const toggle = elements.liveChatMount?.querySelector("[data-lcx-action='toggle-details']");
    const open = Boolean(liveChatRedesignState.detailsOpen);
    const canShowDetails = open && !(board instanceof HTMLElement && board.classList.contains("is-inbox-empty"));

    if (board instanceof HTMLElement) {
      board.classList.toggle("is-details-open", canShowDetails);
    }
    if (details instanceof HTMLElement) {
      details.classList.toggle("is-open", open);
      details.setAttribute("aria-hidden", open ? "false" : "true");
    }
    if (backdrop instanceof HTMLElement) {
      backdrop.classList.toggle("is-open", open);
    }
    if (toggle instanceof HTMLElement) {
      toggle.classList.toggle("is-active", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    }
    if (!open && stage instanceof HTMLElement) {
      stage.classList.remove("is-subview");
    }
    if (!open) {
      elements.liveChatMount?.querySelector(".lcx-assign-picker")?.remove();
    }
  }

  function liveChatSetDetailsOpen(open, options = {}) {
    const nextOpen = Boolean(open);
    const needsFullRender = !nextOpen && (
      Boolean(liveChatRedesignState.detailsPane)
      || Boolean(liveChatRedesignState.assignPickerOpen)
    );
    liveChatRedesignState.detailsOpen = nextOpen;
    if (!nextOpen) {
      liveChatRedesignState.detailsPane = "";
      liveChatRedesignState.assignPickerOpen = false;
      liveChatRedesignState.assignPickerQuery = "";
    }
    if (needsFullRender || options.forceRender) {
      liveChatRenderBoard();
      return;
    }
    liveChatSyncDetailsPanelOpen();
  }

  function liveChatShowToast(message) {
    const toast = elements.liveChatMount?.querySelector("[data-lcx-toast]");
    if (!(toast instanceof HTMLElement)) {
      return;
    }
    window.clearTimeout(Number(toast.dataset.timer) || 0);
    toast.textContent = message;
    toast.hidden = false;
    toast.classList.add("is-visible");
    const timer = window.setTimeout(() => {
      toast.classList.remove("is-visible");
      window.setTimeout(() => { toast.hidden = true; }, 180);
    }, 2200);
    toast.dataset.timer = String(timer);
  }

  function liveChatAgentHandoffMarkup(active) {
    const handoff = liveChatNormalizeAgentHandoff(active?.agentHandoff);
    const isEmployee = authState?.role === "employee";
    const isAssignedEmployee = liveChatIsCurrentEmployeeAssigned(active);
    const canAccept = liveChatCanAcceptAgentHandoff(active);
    if (handoff.status === "pending") {
      const acceptLabel = isEmployee ? "Start assisting" : "Accept request";
      const helpCopy = isEmployee
        ? "This buyer requested a human agent. You can reply after you accept."
        : canAccept
          ? "Accept this request yourself, or assign an employee first."
          : "Assign an employee to this chat before they can assist the buyer.";
      return `
        <div class="lcx-agent-handoff is-pending" role="status">
          <span class="lcx-agent-handoff__icon lcx-agent-handoff__icon--agent-request">${liveChatAgentRequestIconSvg()}</span>
          <span class="lcx-agent-handoff__copy">
            <strong>Buyer requested a human agent</strong>
            <small>${helpCopy}</small>
          </span>
          ${canAccept ? `<button type="button" class="lcx-agent-handoff__primary" data-lcx-action="accept-agent" ${liveChatRedesignState.isSending ? "disabled" : ""}>${acceptLabel}</button>` : ""}
        </div>`;
    }
    if (handoff.status === "accepted") {
      const isCurrentActor = liveChatCurrentActorMatchesHandoff(active);
      return `
        <div class="lcx-agent-handoff is-active${isCurrentActor ? " is-yours" : ""}" role="status">
          <span class="lcx-agent-handoff__icon lcx-agent-handoff__icon--agent">${liveChatAgentIconSvg()}</span>
          <span class="lcx-agent-handoff__copy">
            <strong>${liveChatEscape(isCurrentActor ? "You are assisting this buyer" : `${handoff.activeAgent?.senderName || "A support participant"} is assisting`)}</strong>
            <small>AI replies are paused. The chat returns to AI after 5 minutes without activity.</small>
          </span>
          ${isCurrentActor ? `<button type="button" class="lcx-agent-handoff__secondary" data-lcx-action="release-agent">Leave</button>` : ""}
        </div>`;
    }
    if (isEmployee && isAssignedEmployee && canAccept) {
      return `
        <div class="lcx-agent-handoff is-ai" role="status">
          <span class="lcx-agent-handoff__icon lcx-agent-handoff__icon--agent">${liveChatAgentIconSvg()}</span>
          <span class="lcx-agent-handoff__copy">
            <strong>You are assigned to this buyer</strong>
            <small>Start assisting to reply as a human agent. AI auto-replies will pause while you are active.</small>
          </span>
          <button type="button" class="lcx-agent-handoff__primary" data-lcx-action="accept-agent" ${liveChatRedesignState.isSending ? "disabled" : ""}>Start assisting</button>
        </div>`;
    }
    const aiReady = liveChatRedesignState.aiAssistant?.autoReplyEnabled === true;
    return `
      <div class="lcx-agent-handoff is-ai" role="status">
        <span class="lcx-agent-handoff__icon lcx-agent-handoff__icon--bot">${liveChatBotIconSvg()}</span>
        <span class="lcx-agent-handoff__copy">
          <strong>${aiReady ? "AI is assisting automatically" : "AI support is not available"}</strong>
          ${isEmployee
            ? "<small>Wait for the store admin to assign you, or for the buyer to request an agent.</small>"
            : (aiReady ? "<small>Assign an employee or wait for the buyer to request a human agent.</small>" : "")}
        </span>
      </div>`;
  }

  function liveChatFormatCurrentTime() {
    try {
      return new Intl.DateTimeFormat("en-PH", { hour: "numeric", minute: "2-digit" }).format(new Date());
    } catch (error) {
      return "Now";
    }
  }

  async function liveChatPostReply(conversation, text, attachment = null, replyTo = null) {
    const threadId = normalizeText(conversation?.sourceThreadId);
    if (!threadId) {
      return null;
    }
    const actor = liveChatCurrentActor();
    const response = await fetch(`/api/chat-support/${encodeURIComponent(threadId)}/reply`, {
      method: "POST",
      headers: liveChatApiHeaders({
        Accept: "application/json",
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        text,
        ...(attachment || {}),
        ...(replyTo ? { replyTo } : {}),
        ...actor,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.message || "Unable to send reply.");
    }
    return data;
  }

  async function liveChatUpdateAgentHandoff(action) {
    const active = liveChatGetActive();
    const threadId = normalizeText(active?.sourceThreadId);
    if (!active || !threadId || liveChatRedesignState.isSending) {
      return false;
    }
    const endpoint = action === "release" ? "release-agent" : "accept-agent";
    const composerState = liveChatCaptureComposerState();
    liveChatRedesignState.isSending = true;
    liveChatRenderBoard({ preserveComposer: composerState });
    let feedback = action === "release"
      ? "Conversation returned to AI support."
      : "You are now assisting this buyer.";
    let updated = false;
    try {
      const response = await fetch(`/api/chat-support/${encodeURIComponent(threadId)}/${endpoint}`, {
        method: "POST",
        headers: liveChatApiHeaders({
          Accept: "application/json",
          "Content-Type": "application/json",
        }),
        body: "{}",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message || "Unable to update the support handoff.");
      }
      feedback = data?.message || feedback;
      await liveChatLoadRemoteData();
      updated = true;
    } catch (error) {
      console.warn("Live Chat agent handoff failed.", error);
      feedback = error?.message || "Unable to update the support handoff.";
      await liveChatLoadRemoteData().catch(() => {});
    } finally {
      liveChatRedesignState.isSending = false;
      liveChatRenderBoard({ preserveComposer: composerState });
      liveChatShowToast(feedback);
    }
    return updated;
  }

  async function liveChatEditMessage(conversation, messageId, text) {
    const threadId = normalizeText(conversation?.sourceThreadId);
    if (!threadId) {
      return null;
    }
    const actor = liveChatCurrentActor();
    const response = await fetch(`/api/chat-support/${encodeURIComponent(threadId)}/edit-message`, {
      method: "PUT",
      headers: liveChatApiHeaders({
        Accept: "application/json",
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        messageId,
        text,
        actorRole: actor.senderRole,
        actorId: actor.senderId,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.message || "Unable to edit this message.");
    }
    return data;
  }

  function liveChatGetMessageFromArticle(article) {
    const active = liveChatGetActive();
    const messageIndex = Number.parseInt(article?.dataset?.lcxMessageIndex || "", 10);
    const messages = Array.isArray(active?.messages) ? active.messages : [];
    if (!Number.isInteger(messageIndex) || !messages[messageIndex]) {
      return { active, messageIndex: -1, message: null };
    }
    return { active, messageIndex, message: messages[messageIndex] };
  }

  function liveChatMessageHasVisibleText(message) {
    return Boolean(normalizeText(message?.text) && !normalizeText(message?.deletedAt));
  }

  function liveChatMessageCanReply(message) {
    if (!message || normalizeText(message?.deletedAt)) {
      return false;
    }
    const messageId = normalizeText(message?.id);
    if (!messageId) {
      return false;
    }
    if (liveChatMessageHasVisibleText(message)) {
      return true;
    }
    const messageMedia = Array.isArray(message?.media) ? message.media : [];
    if (messageMedia.some((item) => normalizeText(item?.url || item?.src))) {
      return true;
    }
    const audioItems = Array.isArray(message?.audio) ? message.audio : [];
    if (audioItems.some((item) => normalizeText(item?.url || item?.src))) {
      return true;
    }
    const files = Array.isArray(message?.files) ? message.files : [];
    return files.length > 0;
  }

  function liveChatGetConversationById(conversationId) {
    const id = normalizeText(conversationId);
    if (!id) {
      return null;
    }
    return liveChatRedesignConversations.find((item) => item.id === id) || null;
  }

  function liveChatMarkConversationUnread(conversation) {
    if (!conversation) {
      return;
    }
    if (conversation.rawThread && typeof conversation.rawThread === "object") {
      conversation.rawThread.supportReadAt = null;
      conversation.unread = countUnreadCustomerChatMessages(conversation.rawThread);
    }
    if (!(Number(conversation.unread) > 0)) {
      conversation.unread = 1;
    }
    liveChatSyncThreadListMarkup();
    syncLiveChatNavBadge();
    liveChatShowToast("Marked as unread.");
  }

  function liveChatMarkConversationPriority(conversation) {
    if (!conversation) {
      return;
    }
    const prefs = liveChatPrefsFor(conversation.id);
    conversation.starred = true;
    prefs.starred = true;
    const tags = Array.isArray(conversation.tags) ? conversation.tags.slice() : [];
    if (!tags.some((tag) => /priority|vip|urgent/i.test(normalizeText(tag)))) {
      tags.unshift("Priority");
    }
    conversation.tags = tags.slice(0, 4);
    prefs.incomplete = false;
    liveChatPersistPrefs();
    liveChatRedesignState.filter = "priority";
    liveChatSyncConversationFilterTabs();
    liveChatSyncThreadListMarkup();
    liveChatShowToast("Marked as priority.");
  }

  function liveChatMarkConversationIncomplete(conversation) {
    if (!conversation) {
      return;
    }
    const prefs = liveChatPrefsFor(conversation.id);
    conversation.resolved = false;
    prefs.incomplete = true;
    liveChatPersistPrefs();
    liveChatRedesignState.filter = "pending";
    liveChatSyncConversationFilterTabs();
    liveChatSyncThreadListMarkup();
    liveChatShowToast("Marked as pending.");
  }

  function liveChatRemoveConversationPriority(conversation) {
    if (!conversation) {
      return;
    }
    const prefs = liveChatPrefsFor(conversation.id);
    conversation.starred = false;
    prefs.starred = false;
    conversation.tags = (Array.isArray(conversation.tags) ? conversation.tags : [])
      .filter((tag) => !/priority|vip|urgent/i.test(normalizeText(tag)));
    liveChatPersistPrefs();
    if (liveChatRedesignState.filter === "priority") {
      liveChatRedesignState.filter = "all";
    }
    liveChatSyncConversationFilterTabs();
    liveChatSyncThreadListMarkup();
    liveChatShowToast("Removed from priority.");
  }

  function liveChatRemoveConversationPending(conversation) {
    if (!conversation) {
      return;
    }
    const prefs = liveChatPrefsFor(conversation.id);
    prefs.incomplete = false;
    liveChatPersistPrefs();
    if (liveChatRedesignState.filter === "pending") {
      liveChatRedesignState.filter = "all";
    }
    liveChatSyncConversationFilterTabs();
    liveChatSyncThreadListMarkup();
    liveChatShowToast("Removed from pending.");
  }

  function liveChatMarkConversationMuted(conversation) {
    if (!conversation) {
      return;
    }
    const prefs = liveChatPrefsFor(conversation.id);
    prefs.muted = true;
    liveChatPersistPrefs();
    liveChatSyncThreadListMarkup();
    liveChatShowToast("Chat muted.");
  }

  function liveChatCloseThreadContextMenu() {
    const menu = elements.liveChatMount?.querySelector("[data-lcx-thread-context-menu]");
    if (!(menu instanceof HTMLElement)) {
      return;
    }
    menu.hidden = true;
    menu.setAttribute("aria-hidden", "true");
    menu.innerHTML = "";
    menu.style.removeProperty("left");
    menu.style.removeProperty("top");
    menu.removeAttribute("data-lcx-context-thread-id");
  }

  function liveChatCloseAllContextMenus() {
    liveChatCloseMessageContextMenu();
    liveChatCloseThreadContextMenu();
  }

  function liveChatContextMenuItemMarkup(action, label, iconName, options = {}) {
    const dangerClass = options.danger ? " is-danger" : "";
    const dividerClass = options.divider ? " is-divider" : "";
    return `<button
      type="button"
      class="lcx-message-context-menu__item${dangerClass}${dividerClass}"
      data-lcx-action="${liveChatEscape(action)}"
      role="menuitem"
    >${liveChatIcon(iconName, 16)}<span class="lcx-message-context-menu__label">${liveChatEscape(label)}</span></button>`;
  }

  function liveChatBuildThreadContextMenuItems(conversation) {
    const prefs = liveChatPrefsFor(conversation.id);
    const isPriority = liveChatIsPriorityConversation(conversation);
    const isPending = liveChatIsPendingConversation(conversation);
    const items = [
      liveChatContextMenuItemMarkup("context-thread-unread", "Mark as unread", "mail"),
      liveChatContextMenuItemMarkup(
        isPriority ? "context-thread-remove-priority" : "context-thread-priority",
        isPriority ? "Remove as priority" : "Mark as priority",
        "list-sort-descending",
        isPriority ? { danger: true } : {},
      ),
      liveChatContextMenuItemMarkup(
        isPending ? "context-thread-remove-pending" : "context-thread-pending",
        isPending ? "Remove as pending" : "Mark as pending",
        "clock",
        isPending ? { danger: true } : {},
      ),
      liveChatContextMenuItemMarkup(
        "context-thread-mute",
        prefs.muted ? "Unmute chat" : "Mark as mute",
        "mute",
      ),
      liveChatContextMenuItemMarkup("context-thread-delete", "Delete chat", "trash-2", { danger: true, divider: true }),
    ];
    return items.join("");
  }

  function liveChatOpenThreadContextMenu(event, threadEl) {
    const menu = elements.liveChatMount?.querySelector("[data-lcx-thread-context-menu]");
    if (!(menu instanceof HTMLElement) || !(threadEl instanceof HTMLElement)) {
      return;
    }
    const conversation = liveChatGetConversationById(threadEl.dataset.lcxThread || "");
    if (!conversation) {
      liveChatCloseThreadContextMenu();
      return;
    }
    liveChatCloseAllContextMenus();
    menu.innerHTML = liveChatBuildThreadContextMenuItems(conversation);
    menu.dataset.lcxContextThreadId = conversation.id;
    liveChatPositionMessageContextMenu(menu, event.clientX, event.clientY);
    const firstItem = menu.querySelector("[role='menuitem']");
    if (firstItem instanceof HTMLElement) {
      window.requestAnimationFrame(() => {
        firstItem.focus({ preventScroll: true });
      });
    }
  }

  function liveChatHandleThreadContextAction(action, conversationId) {
    liveChatCloseThreadContextMenu();
    const conversation = liveChatGetConversationById(conversationId);
    if (!conversation) {
      return;
    }
    switch (action) {
      case "context-thread-unread":
        liveChatMarkConversationUnread(conversation);
        break;
      case "context-thread-priority":
        liveChatMarkConversationPriority(conversation);
        break;
      case "context-thread-remove-priority":
        liveChatRemoveConversationPriority(conversation);
        break;
      case "context-thread-pending":
        liveChatMarkConversationIncomplete(conversation);
        break;
      case "context-thread-remove-pending":
        liveChatRemoveConversationPending(conversation);
        break;
      case "context-thread-mute": {
        const prefs = liveChatPrefsFor(conversation.id);
        prefs.muted = !prefs.muted;
        liveChatPersistPrefs();
        liveChatSyncThreadListMarkup();
        liveChatShowToast(prefs.muted ? "Chat muted." : "Chat unmuted.");
        break;
      }
      case "context-thread-delete":
        void liveChatDeleteConversation(conversation);
        break;
      default:
        break;
    }
  }

  function liveChatCanDeleteMessageForMe(message) {
    return Boolean(
      message
        && message.side === "support"
        && !normalizeText(message?.deletedAt)
        && normalizeText(message?.source).toLowerCase() !== "ai",
    );
  }

  function liveChatMessageBubbleContainerSelector() {
    return ".lcx-message__bubble-wrap";
  }

  function liveChatResolveMessageBubbleContainer(target) {
    if (!(target instanceof Element)) {
      return null;
    }
    const container = target.closest(liveChatMessageBubbleContainerSelector());
    return container instanceof HTMLElement ? container : null;
  }

  function liveChatCloseMessageContextMenu() {
    const menu = elements.liveChatMount?.querySelector("[data-lcx-message-context-menu]");
    if (!(menu instanceof HTMLElement)) {
      return;
    }
    menu.hidden = true;
    menu.setAttribute("aria-hidden", "true");
    menu.innerHTML = "";
    menu.style.removeProperty("left");
    menu.style.removeProperty("top");
    menu.removeAttribute("data-lcx-context-message-index");
  }

  function liveChatPositionMessageContextMenu(menu, clientX, clientY, anchorEl = null) {
    menu.hidden = false;
    menu.setAttribute("aria-hidden", "false");
    menu.style.visibility = "hidden";
    menu.style.left = "0px";
    menu.style.top = "0px";
    const margin = 8;
    const rect = menu.getBoundingClientRect();
    let x = clientX;
    let y = clientY;

    if (anchorEl instanceof HTMLElement) {
      const anchorRect = anchorEl.getBoundingClientRect();
      x = Math.min(Math.max(clientX, anchorRect.left + 2), Math.max(anchorRect.left + 2, anchorRect.right - 2));
      y = Math.min(Math.max(clientY, anchorRect.top + 2), Math.max(anchorRect.top + 2, anchorRect.bottom - 2));
    }

    const maxLeft = Math.max(margin, window.innerWidth - rect.width - margin);
    const maxTop = Math.max(margin, window.innerHeight - rect.height - margin);
    menu.style.left = `${Math.min(Math.max(x, margin), maxLeft)}px`;
    menu.style.top = `${Math.min(Math.max(y, margin), maxTop)}px`;
    menu.style.visibility = "";
  }

  function liveChatMessageContextMenuItemMarkup(action, label, iconName, options = {}) {
    return liveChatContextMenuItemMarkup(action, label, iconName, options);
  }

  function liveChatBuildMessageContextMenuItems(message) {
    const hasText = liveChatMessageHasVisibleText(message);
    const canReply = liveChatMessageCanReply(message);
    const canEdit = liveChatCanEditMessage(message);
    const canDelete = liveChatCanDeleteMessageForMe(message);
    const isDeleted = Boolean(normalizeText(message?.deletedAt));
    const items = [];

    if (canReply) {
      items.push(liveChatMessageContextMenuItemMarkup("context-reply", "Reply", "reply"));
    }
    if (canEdit) {
      items.push(liveChatMessageContextMenuItemMarkup("context-edit", "Edit message", "pen-line"));
    }
    if (hasText) {
      items.push(liveChatMessageContextMenuItemMarkup("context-copy", "Copy message", "copy"));
      items.push(liveChatMessageContextMenuItemMarkup("context-translate", "Translate", "translate"));
    }
    if (!isDeleted) {
      items.push(liveChatMessageContextMenuItemMarkup("context-pin", "Pin", "pin"));
      items.push(liveChatMessageContextMenuItemMarkup("context-forward", "Forward", "forward"));
    }
    if (canDelete) {
      items.push(liveChatMessageContextMenuItemMarkup("context-delete", "Delete message", "trash-2", { danger: true, divider: items.length > 0 }));
    }
    return items.join("");
  }

  function liveChatOpenMessageContextMenu(event, article, bubbleContainer = null) {
    const menu = elements.liveChatMount?.querySelector("[data-lcx-message-context-menu]");
    if (!(menu instanceof HTMLElement) || !(article instanceof HTMLElement)) {
      return;
    }
    const anchor = bubbleContainer instanceof HTMLElement
      ? bubbleContainer
      : liveChatResolveMessageBubbleContainer(event.target instanceof Element ? event.target : null);
    if (!(anchor instanceof HTMLElement)) {
      return;
    }
    const { messageIndex, message } = liveChatGetMessageFromArticle(article);
    if (!message || messageIndex < 0) {
      return;
    }
    const markup = liveChatBuildMessageContextMenuItems(message);
    if (!markup) {
      liveChatCloseMessageContextMenu();
      return;
    }
    liveChatCloseReactionPicker();
    liveChatCloseThreadContextMenu();
    liveChatCloseMessageContextMenu();
    menu.innerHTML = markup;
    menu.dataset.lcxContextMessageIndex = String(messageIndex);
    liveChatPositionMessageContextMenu(menu, event.clientX, event.clientY, anchor);
    const firstItem = menu.querySelector("[role='menuitem']");
    if (firstItem instanceof HTMLElement) {
      window.requestAnimationFrame(() => {
        firstItem.focus({ preventScroll: true });
      });
    }
  }

  async function liveChatCopyMessageText(text) {
    const normalized = normalizeText(text);
    if (!normalized) {
      liveChatShowToast("Nothing to copy.");
      return;
    }
    try {
      await navigator.clipboard.writeText(normalized);
      liveChatShowToast("Message copied.");
    } catch (_) {
      liveChatShowToast("Unable to copy message.");
    }
  }

  function liveChatTranslateMessageText(text) {
    const normalized = normalizeText(text);
    if (!normalized) {
      liveChatShowToast("Nothing to translate.");
      return;
    }
    const translateUrl = `https://translate.google.com/?sl=auto&tl=en&text=${encodeURIComponent(normalized)}&op=translate`;
    window.open(translateUrl, "_blank", "noopener,noreferrer");
  }

  async function liveChatDeleteMessage(conversation, messageId) {
    const threadId = normalizeText(conversation?.sourceThreadId);
    if (!threadId || !messageId) {
      return null;
    }
    const response = await fetch(`/api/chat-support/${encodeURIComponent(threadId)}/delete-message`, {
      method: "POST",
      headers: liveChatApiHeaders({
        Accept: "application/json",
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({ messageId }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.message || "Unable to delete message.");
    }
    return data;
  }

  async function liveChatHandleMessageContextAction(action, messageIndex) {
    const active = liveChatGetActive();
    const messages = Array.isArray(active?.messages) ? active.messages : [];
    const message = Number.isInteger(messageIndex) ? messages[messageIndex] : null;
    if (!active || !message) {
      return;
    }
    liveChatCloseMessageContextMenu();

    if (action === "context-reply") {
      if (!liveChatMessageCanReply(message)) {
        return;
      }
      liveChatSetPendingReply(active, message, messageIndex);
      return;
    }
    if (action === "context-copy") {
      await liveChatCopyMessageText(message.text);
      return;
    }
    if (action === "context-translate") {
      liveChatTranslateMessageText(message.text);
      return;
    }
    if (action === "context-pin") {
      liveChatShowToast("Pin message is coming soon.");
      return;
    }
    if (action === "context-forward") {
      liveChatShowToast("Forward message is coming soon.");
      return;
    }
    if (action === "context-delete") {
      if (!liveChatCanDeleteMessageForMe(message)) {
        liveChatShowToast("This message cannot be deleted.");
        return;
      }
      const confirmed = window.confirm("Delete this message for you?");
      if (!confirmed) {
        return;
      }
      try {
        if (active.sourceThreadId) {
          await liveChatDeleteMessage(active, normalizeText(message.id));
          await liveChatLoadRemoteData();
        } else {
          message.text = "";
          message.deletedAt = new Date().toISOString();
        }
        liveChatRenderBoard();
        liveChatShowToast("Message deleted.");
      } catch (error) {
        liveChatShowToast(error?.message || "Unable to delete message.");
      }
      return;
    }
    if (action === "context-edit") {
      liveChatSetPendingEdit(active, message, messageIndex);
    }
  }

  function liveChatCloseAdminMessageMenus() {
    liveChatCloseMessageContextMenu();
  }

  async function liveChatSubmitPendingEdit(nextText, options = {}) {
    const active = liveChatGetActive();
    const pendingEdit = liveChatPendingEditFor(active);
    const messages = Array.isArray(active?.messages) ? active.messages : [];
    const message = pendingEdit && Number.isInteger(pendingEdit.messageIndex)
      ? messages[pendingEdit.messageIndex]
      : null;

    if (!active || !pendingEdit || !message || !liveChatCanEditMessage(message)) {
      liveChatClearPendingEdit();
      liveChatShowToast("This message is read-only.");
      return false;
    }
    if (!nextText) {
      liveChatShowToast("Message cannot be empty.");
      return false;
    }
    if (nextText === normalizeText(message.text)) {
      liveChatClearPendingEdit();
      liveChatShowToast("No changes to save.");
      return false;
    }
    if (liveChatRedesignState.isEditing || liveChatRedesignState.isSending) {
      return false;
    }

    liveChatRedesignState.isEditing = true;
    liveChatRedesignState.isSending = true;
    liveChatRenderBoard({ preserveMessageScrollExact: true });
    try {
      if (active.sourceThreadId) {
        await liveChatEditMessage(active, normalizeText(message.id), nextText);
        await liveChatLoadRemoteData();
      } else {
        const editedAt = new Date().toISOString();
        const previousText = normalizeText(message.text);
        message.text = nextText;
        message.editedAt = editedAt;
        messages.forEach((candidate) => {
          const replyTo = liveChatNormalizeReplyReference(candidate?.replyTo);
          if (replyTo?.messageId === normalizeText(message.id)) {
            candidate.replyTo = {
              ...replyTo,
              previewText: nextText,
            };
          }
        });
        if (normalizeText(active.preview) === previousText) {
          active.preview = nextText;
        }
      }
      liveChatRedesignState.pendingEdit = null;
      liveChatRedesignState.editStateEnter = false;
      liveChatRenderBoard({ preserveMessageScrollExact: true });
      liveChatShowToast(options.successMessage || "Message updated.");
      return true;
    } catch (error) {
      console.warn("Live Chat edit failed.", error);
      liveChatShowToast(error?.message || "Unable to edit this message.");
      window.requestAnimationFrame(() => {
        const input = elements.liveChatMount?.querySelector("[data-lcx-message-input]");
        if (input instanceof HTMLTextAreaElement) {
          input.focus({ preventScroll: true });
        }
      });
      return false;
    } finally {
      liveChatRedesignState.isEditing = false;
      liveChatRedesignState.isSending = false;
      liveChatRenderBoard({ preserveMessageScrollExact: true });
    }
  }

  async function liveChatUploadAttachment(file) {
    const fileName = normalizeText(file?.name) || "chat-attachment";
    const response = await fetch("/api/chat-uploads", {
      method: "POST",
      headers: liveChatApiHeaders({
        Accept: "application/json",
        "Content-Type": normalizeText(file?.type) || "application/octet-stream",
        "x-file-name": fileName,
      }),
      body: file,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.message || `Unable to upload ${fileName}.`);
    }
    return {
      imageUrl: normalizeText(data?.imageUrl || data?.documentUrl || data?.mediaUrl),
      imageName: fileName,
      contentType: normalizeText(data?.contentType || file?.type),
    };
  }

  function liveChatMarkConversationRead(conversation) {
    const threadId = normalizeText(conversation?.sourceThreadId);
    if (!threadId) {
      return;
    }
    void fetch(`/api/chat-support/${encodeURIComponent(threadId)}/read-support`, {
      method: "POST",
      headers: liveChatApiHeaders({ Accept: "application/json" }),
    }).catch(() => {});
  }

  function liveChatSelectConversation(id) {
    const selected = liveChatRedesignConversations.find((item) => item.id === id);
    if (!selected) {
      return;
    }
    liveChatStopSupportTyping({ force: true });
    liveChatResetAudioSession({ silent: true });
    liveChatCloseCameraModal();
    liveChatRedesignState.emojiPickerOpen = false;
    liveChatRedesignState.reactionPicker = null;
    selected.unread = 0;
    liveChatSetActiveId(id);
    liveChatPersistThreadListPosition();
    liveChatRedesignState.mediaExpanded = false;
    liveChatRedesignState.detailsPane = "";
    liveChatRedesignState.forceMessageScrollBottom = true;
    liveChatRedesignState.messageScrollPinned = true;
    liveChatResetMessageLazyWindow(id);
    liveChatMessageAreaLastScrollTop = 0;
    liveChatResetMessageAnimationsForThread(id, selected.messages);
    liveChatRedesignState.pendingReply = null;
    liveChatRedesignState.pendingEdit = null;
    liveChatRedesignState.chatFindMatchIndex = 0;
    liveChatRenderBoard();
    liveChatMarkConversationRead(selected);
  }

  function liveChatBindRedesignEvents() {
    if (!elements.liveChatMount || elements.liveChatMount.dataset.lcxBound === "true") {
      return;
    }
    elements.liveChatMount.dataset.lcxBound = "true";

    let liveChatReactionLongPressTimer = 0;
    let liveChatReactionLongPressStartX = 0;
    let liveChatReactionLongPressStartY = 0;

    elements.liveChatMount.addEventListener("contextmenu", (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const thread = target?.closest("[data-lcx-thread]");
      if (thread instanceof HTMLElement) {
        event.preventDefault();
        liveChatOpenThreadContextMenu(event, thread);
        return;
      }
      const bubbleContainer = liveChatResolveMessageBubbleContainer(target);
      if (!(bubbleContainer instanceof HTMLElement)) {
        return;
      }
      const article = bubbleContainer.closest(".lcx-message");
      if (!(article instanceof HTMLElement) || article.classList.contains("is-typing")) {
        return;
      }
      event.preventDefault();
      liveChatOpenMessageContextMenu(event, article, bubbleContainer);
    });

    elements.liveChatMount.addEventListener("scroll", (event) => {
      const target = event.target;
      const messageArea = target instanceof HTMLElement && target.matches("[data-lcx-message-area]")
        ? target
        : (target instanceof Element ? target.closest("[data-lcx-message-area]") : null);
      if (messageArea instanceof HTMLElement) {
        liveChatHandleMessageAreaScroll(messageArea);
      }
      if (target instanceof HTMLElement && target.matches("[data-lcx-thread-list]")) {
        liveChatScheduleThreadListPositionPersist();
      }
      if (target instanceof Element && target.closest("[data-lcx-message-area], [data-lcx-thread-list]")) {
        liveChatCloseAllContextMenus();
      }
    }, true);

    window.addEventListener("pagehide", () => {
      if (liveChatThreadListPositionPersistFrame) {
        window.cancelAnimationFrame(liveChatThreadListPositionPersistFrame);
        liveChatThreadListPositionPersistFrame = 0;
      }
      liveChatPersistThreadListPosition();
    });

    elements.liveChatMount.addEventListener("pointerdown", (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const messageEl = target?.closest(".lcx-message[data-lcx-message-index]");
      if (!(messageEl instanceof HTMLElement) || target?.closest("[data-lcx-action]")) {
        return;
      }
      const messageIndex = Number.parseInt(messageEl.dataset.lcxMessageIndex || "", 10);
      if (!Number.isInteger(messageIndex)) {
        return;
      }
      liveChatReactionLongPressStartX = event.clientX;
      liveChatReactionLongPressStartY = event.clientY;
      window.clearTimeout(liveChatReactionLongPressTimer);
      liveChatReactionLongPressTimer = window.setTimeout(() => {
        liveChatOpenReactionPicker(messageIndex);
      }, 480);
    });

    elements.liveChatMount.addEventListener("pointermove", (event) => {
      if (!liveChatReactionLongPressTimer) {
        return;
      }
      const deltaX = Math.abs(event.clientX - liveChatReactionLongPressStartX);
      const deltaY = Math.abs(event.clientY - liveChatReactionLongPressStartY);
      if (deltaX > 8 || deltaY > 8) {
        window.clearTimeout(liveChatReactionLongPressTimer);
        liveChatReactionLongPressTimer = 0;
      }
    });

    const clearLiveChatReactionLongPress = () => {
      window.clearTimeout(liveChatReactionLongPressTimer);
      liveChatReactionLongPressTimer = 0;
    };
    elements.liveChatMount.addEventListener("pointerup", clearLiveChatReactionLongPress);
    elements.liveChatMount.addEventListener("pointercancel", clearLiveChatReactionLongPress);

    elements.liveChatMount.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target?.closest("[data-lcx-message-context-menu], [data-lcx-thread-context-menu]")) {
        liveChatCloseAllContextMenus();
      }
      const thread = target?.closest("[data-lcx-thread]");
      if (thread instanceof HTMLElement) {
        liveChatSelectConversation(thread.dataset.lcxThread || "");
        return;
      }

      const filter = target?.closest("[data-lcx-filter]");
      if (filter instanceof HTMLElement) {
        liveChatRedesignState.filter = filter.dataset.lcxFilter || "all";
        liveChatRenderBoard();
        return;
      }

      const quickReply = target?.closest("[data-lcx-quick-reply]");
      if (quickReply instanceof HTMLElement) {
        const input = elements.liveChatMount?.querySelector("[data-lcx-message-input]");
        if (input instanceof HTMLTextAreaElement) {
          input.value = quickReply.dataset.lcxQuickReply || "";
          input.focus();
          input.setSelectionRange(input.value.length, input.value.length);
        }
        return;
      }

      const actionButton = target?.closest("[data-lcx-action]");
      if (!(actionButton instanceof HTMLElement)) {
        return;
      }
      const action = actionButton.dataset.lcxAction || "";
      if (action.startsWith("context-thread-")) {
        const menu = actionButton.closest("[data-lcx-thread-context-menu]");
        const conversationId = normalizeText(menu?.dataset?.lcxContextThreadId);
        if (conversationId) {
          liveChatHandleThreadContextAction(action, conversationId);
        }
        return;
      }
      if (action.startsWith("context-")) {
        const menu = actionButton.closest("[data-lcx-message-context-menu]");
        const messageIndex = Number.parseInt(menu?.dataset?.lcxContextMessageIndex || "", 10);
        if (Number.isInteger(messageIndex)) {
          void liveChatHandleMessageContextAction(action, messageIndex);
        }
        return;
      }
      if (action === "toggle-navigation") {
        setSidebarOpen(!isSidebarOpen(), {
          preserveExpanded: true,
          allowClosedOpen: true,
        });
        return;
      }
      if (action === "tabs-prev") {
        liveChatScrollFilterTabs("prev");
        return;
      }
      if (action === "tabs-next") {
        liveChatScrollFilterTabs("next");
        return;
      }
      if (action === "clear-edit") {
        liveChatClearPendingEdit();
        return;
      }
      if (action === "toggle-message-time") {
        return;
      }
      if (action === "toggle-message-video") {
        event.stopPropagation();
        liveChatToggleMessageVideo(actionButton);
        return;
      }
      if (action === "expand-photo-grid") {
        event.stopPropagation();
        liveChatExpandPhotoGrid(actionButton.dataset.lcxMessageId || "");
        return;
      }
      if (action === "open-media-viewer") {
        event.stopPropagation();
        liveChatActivateLazyMediaFromControl(actionButton);
        const mediaKind = actionButton.dataset.lcxMediaKind || "image";
        const shell = actionButton.closest("[data-lcx-message-video]");
        const sourceVideo = shell?.querySelector("video.lcx-message-video__media");
        const currentTime = sourceVideo instanceof HTMLVideoElement
          ? Number(sourceVideo.currentTime) || 0
          : 0;
        liveChatOpenMediaViewer({
          kind: mediaKind,
          src: actionButton.dataset.lcxMediaSrc || "",
          label: actionButton.dataset.lcxMediaLabel || "",
          mediaSide: actionButton.dataset.lcxMediaSide || "support",
          currentTime,
          sourceVideo: mediaKind === "video" ? sourceVideo : null,
        });
        return;
      }
      if (action === "close-media-viewer") {
        liveChatCloseMediaViewer();
        return;
      }
      if (action === "clear-reply") {
        liveChatClearPendingReply();
        return;
      }
      if (action === "jump-reply") {
        liveChatJumpToMessage(actionButton.dataset.lcxReplyMessageId || "", actionButton);
        return;
      }
      if (action === "attach") {
        const fileInput = elements.liveChatMount?.querySelector("[data-lcx-file-input]");
        if (fileInput instanceof HTMLInputElement) {
          fileInput.click();
        }
        return;
      }
      if (action === "remove-pending-attachment") {
        liveChatRemovePendingAttachment(actionButton.dataset.lcxPendingAttachmentId || "", liveChatGetActive());
        return;
      }
      if (action === "emoji") {
        liveChatSetEmojiPickerOpen(!liveChatRedesignState.emojiPickerOpen);
        return;
      }
      if (action === "open-camera") {
        void liveChatOpenCameraModal();
        return;
      }
      if (action === "close-emoji-picker") {
        liveChatSetEmojiPickerOpen(false);
        return;
      }
      if (action === "pick-emoji") {
        liveChatHandleEmojiSelected(actionButton.dataset.lcxEmoji || "");
        return;
      }
      if (action === "audio-record") {
        void liveChatStartAudioRecording();
        return;
      }
      if (action === "audio-stop") {
        liveChatStopAudioRecording();
        return;
      }
      if (action === "audio-play-toggle") {
        liveChatToggleAudioPreviewPlayback();
        return;
      }
      if (action === "audio-discard") {
        liveChatDiscardAudioRecording();
        return;
      }
      if (action === "toggle-message-audio") {
        event.stopPropagation();
        const shell = actionButton.closest("[data-lcx-message-audio]");
        liveChatToggleMessageAudio(shell);
        return;
      }
      if (action === "react-message") {
        const messageIndex = Number.parseInt(actionButton.dataset.lcxMessageIndex || "", 10);
        if (Number.isInteger(messageIndex)) {
          liveChatOpenReactionPicker(messageIndex);
        }
        return;
      }
      if (action === "translate-message") {
        event.stopPropagation();
        const messageIndex = Number.parseInt(actionButton.dataset.lcxMessageIndex || "", 10);
        if (Number.isInteger(messageIndex)) {
          const active = liveChatGetActive();
          const messages = Array.isArray(active?.messages) ? active.messages : [];
          const message = messages[messageIndex];
          if (message) {
            liveChatTranslateMessageText(message.text);
          }
        }
        return;
      }
      if (action === "pick-reaction") {
        const pickerState = liveChatRedesignState.reactionPicker;
        const reactionEmoji = normalizeText(actionButton.dataset.lcxReactionEmoji);
        if (pickerState && reactionEmoji) {
          void liveChatApplyReaction(pickerState.messageIndex, reactionEmoji);
        }
        return;
      }
      if (action === "close-reaction-picker") {
        liveChatCloseReactionPicker();
        return;
      }
      if (action === "accept-agent") {
        void liveChatUpdateAgentHandoff("accept");
        return;
      }
      if (action === "release-agent") {
        void liveChatUpdateAgentHandoff("release");
        return;
      }
      if (action === "open-assign-picker") {
        void liveChatOpenAssignPicker();
        return;
      }
      if (action === "close-assign-picker") {
        liveChatRedesignState.assignPickerOpen = false;
        liveChatRedesignState.assignPickerQuery = "";
        liveChatRenderBoard();
        return;
      }
      if (action === "pick-employee") {
        void liveChatAssignEmployee(actionButton.dataset.lcxEmployeeId || "");
        return;
      }
      if (action === "remove-participant") {
        void liveChatAssignEmployee(actionButton.dataset.lcxEmployeeId || "", true);
        return;
      }
      if (action === "resolve") {
        const active = liveChatGetActive();
        if (active) {
          active.resolved = !active.resolved;
          liveChatRenderBoard();
          liveChatShowToast(active.resolved ? "Conversation marked as resolved." : "Conversation reopened.");
        }
        return;
      }
      if (["tracking", "discount", "return", "refund"].includes(action)) {
        const actionReplies = {
          tracking: `Here is your tracking update${liveChatOrderFor(liveChatGetActive()).trackingNumber ? `: ${liveChatOrderFor(liveChatGetActive()).trackingNumber}` : "."}`,
          discount: "I can offer a discount for your next order. Let me share the available options.",
          return: "I can help process your return. Please confirm the item and reason for return.",
          refund: "I can help review your refund request. Please allow me a moment to verify the order.",
        };
        const input = elements.liveChatMount?.querySelector("[data-lcx-message-input]");
        if (input instanceof HTMLTextAreaElement) {
          input.value = actionReplies[action];
          input.focus();
        }
        return;
      }
      if (action === "view-order") {
        setMainView("orders", { updateHistory: true });
        return;
      }
      if (action === "toggle-details") {
        liveChatSetDetailsOpen(!liveChatRedesignState.detailsOpen);
        return;
      }
      if (action === "toggle-chat-find") {
        if (liveChatRedesignState.chatFindOpen) {
          liveChatCloseChatFind();
        } else {
          liveChatOpenChatFind();
        }
        return;
      }
      if (action === "close-chat-find") {
        liveChatCloseChatFind();
        return;
      }
      if (action === "clear-local-search") {
        liveChatClearLocalSearch();
        return;
      }
      if (action === "chat-find-prev") {
        liveChatChatFindStep(-1);
        return;
      }
      if (action === "chat-find-next") {
        liveChatChatFindStep(1);
        return;
      }
      if (action === "mute-chat" || action === "snooze-chat" || action === "star-chat") {
        const current = liveChatGetActive();
        if (!current) {
          return;
        }
        const prefs = liveChatPrefsFor(current.id);
        if (action === "mute-chat") {
          prefs.muted = !prefs.muted;
        } else if (action === "snooze-chat") {
          prefs.snoozed = !prefs.snoozed;
        } else {
          prefs.starred = !prefs.starred;
          current.starred = prefs.starred;
        }
        liveChatSyncChatPrefToggles(current);
        if (action === "snooze-chat") {
          liveChatSyncThreadListMarkup();
        } else {
          liveChatSyncThreadPrefState(current);
        }
        liveChatSyncConversationFilterTabs();
        syncLiveChatNavBadge();
        liveChatPersistPrefs();
        if (action === "mute-chat") {
          liveChatShowToast(prefs.muted ? "Chat muted. Notifications are off." : "Chat unmuted.");
        } else if (action === "snooze-chat") {
          liveChatShowToast(prefs.snoozed ? "Chat snoozed for 30 days." : "Snooze turned off.");
        } else {
          liveChatShowToast(prefs.starred ? "Chat starred." : "Star removed.");
        }
        return;
      }
      if (action === "set-background") {
        liveChatOpenDetailsPane("wallpaper");
        return;
      }
      if (action === "choose-wallpaper") {
        const current = liveChatGetActive();
        if (!current) {
          return;
        }
        const wallpaper = liveChatNormalizeWallpaper(actionButton.dataset.lcxWallpaper);
        const prefs = liveChatPrefsFor(current.id);
        prefs.wallpaper = wallpaper;
        liveChatPersistPrefs();
        liveChatApplyWallpaper(wallpaper);
        return;
      }
      if (action === "view-media" || action === "reminders" || action === "gifs" || action === "links" || action === "files-panel" || action === "participants" || action === "orders") {
        const paneByAction = {
          "view-media": "media",
          reminders: "reminders",
          gifs: "gifs",
          links: "links",
          "files-panel": "files",
          participants: "participants",
          orders: "orders",
        };
        liveChatOpenDetailsPane(paneByAction[action]);
        return;
      }
      if (action === "close-details-pane") {
        liveChatCloseDetailsPane();
        return;
      }
      if (action === "delete-chat") {
        void liveChatDeleteActiveChat();
        return;
      }
      if (action === "delete-reminder") {
        const current = liveChatGetActive();
        if (!current) {
          return;
        }
        const prefs = liveChatPrefsFor(current.id);
        const reminderId = normalizeText(actionButton.dataset.lcxReminderId);
        prefs.reminders = prefs.reminders.filter((item) => item.id !== reminderId);
        liveChatPersistPrefs();
        liveChatRenderBoard();
        return;
      }
      if (action === "open-attachment") {
        const fileUrl = normalizeText(actionButton.dataset.lcxFileUrl);
        if (fileUrl) {
          window.open(fileUrl, "_blank", "noopener,noreferrer");
        }
        return;
      }
      if (action === "show-details") {
        liveChatSetDetailsOpen(true);
        return;
      }
      if (action === "hide-details") {
        liveChatSetDetailsOpen(false);
        return;
      }
      if (action === "show-threads") {
        elements.liveChatMount?.querySelector(".lcx-threads")?.classList.toggle("is-mobile-open");
        return;
      }
      if (action === "file") {
        const fileUrl = normalizeText(actionButton.dataset.lcxFileUrl);
        if (fileUrl) {
          window.open(fileUrl, "_blank", "noopener,noreferrer");
        } else {
          liveChatShowToast(`${actionButton.dataset.lcxFileName || "File"} selected`);
        }
        return;
      }
      if (action === "toggle-pinned-product") {
        liveChatTogglePinnedProduct();
        return;
      }
      if (action === "compose") {
        liveChatPromptCompose();
        return;
      }
      const messages = {
        filters: "Choose a conversation filter below.",
        "message-menu": "Conversation filters are shown below.",
        "load-more": "All recent conversations are already loaded.",
        more: "More conversation options selected.",
        "view-product": "Linked product selected.",
        "profile-more": "Customer profile options selected.",
        "edit-tags": "Tag editing selected.",
        "add-tag": "Tag management selected.",
        canned: "Timer and canned replies can be typed in the message field.",
      };
      liveChatShowToast(messages[action] || "Action selected.");
    });

    elements.liveChatMount.addEventListener("input", (event) => {
      const field = event.target instanceof HTMLElement ? event.target : null;
      if (field?.matches("[data-lcx-message-input]")) {
        liveChatSyncComposerTextareaHeight(field);
        liveChatSyncSendButtonState();
        const pendingEdit = liveChatPendingEditFor(liveChatGetActive());
        if (pendingEdit) {
          pendingEdit.draftText = String(field.value || "");
        }
        liveChatSyncSupportTypingFromComposer(field);
        return;
      }
      const input = event.target instanceof HTMLInputElement ? event.target : null;
      if (input?.matches("[data-lcx-participant-search]")) {
        liveChatRedesignState.participantQuery = input.value;
        const query = normalizeText(input.value).toLowerCase();
        elements.liveChatMount?.querySelectorAll("[data-lcx-participant-row]").forEach((row) => {
          row.hidden = Boolean(query) && !normalizeText(row.dataset.lcxParticipantRow).includes(query);
        });
        return;
      }
      if (input?.matches("[data-lcx-assign-search]")) {
        liveChatRedesignState.assignPickerQuery = input.value;
        const query = normalizeText(input.value).toLowerCase();
        elements.liveChatMount?.querySelectorAll("[data-lcx-assign-candidate]").forEach((row) => {
          row.hidden = Boolean(query) && !normalizeText(row.dataset.lcxAssignCandidate).includes(query);
        });
        return;
      }
      if (!input?.matches("[data-lcx-local-search]")) {
        return;
      }
      liveChatRedesignState.search = input.value;
      const query = normalizeText(input.value).toLowerCase();
      elements.liveChatMount?.querySelectorAll("[data-lcx-thread]").forEach((thread) => {
        const conversation = liveChatRedesignConversations.find((item) => item.id === thread.dataset.lcxThread);
        thread.hidden = !conversation || !normalizeText(`${conversation.name} ${conversation.preview} ${conversation.about} ${conversation?.order?.id || ""} ${conversation?.category || ""}`).toLowerCase().includes(query);
      });
      liveChatSyncLocalSearchClearButton();
    });

    elements.liveChatMount.addEventListener("submit", async (event) => {
      const form = event.target instanceof HTMLFormElement ? event.target : null;
      if (form?.matches("[data-lcx-reminder-form]")) {
        event.preventDefault();
        const active = liveChatGetActive();
        if (!active) {
          return;
        }
        const text = normalizeText(form.querySelector('[name="text"]')?.value);
        const whenValue = normalizeText(form.querySelector('[name="when"]')?.value);
        if (!text) {
          liveChatShowToast("Add a reminder note first.");
          return;
        }
        const prefs = liveChatPrefsFor(active.id);
        let whenLabel = "Saved reminder";
        if (whenValue) {
          const whenDate = new Date(whenValue);
          if (!Number.isNaN(whenDate.getTime())) {
            try {
              whenLabel = new Intl.DateTimeFormat("en-PH", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              }).format(whenDate);
            } catch (_) {
              whenLabel = whenValue;
            }
          }
        }
        prefs.reminders = [
          {
            id: `reminder-${Date.now()}`,
            text,
            when: whenValue,
            whenLabel,
          },
          ...prefs.reminders,
        ];
        liveChatPersistPrefs();
        liveChatRenderBoard();
        liveChatShowToast("Reminder added.");
        return;
      }
      if (!form?.matches("[data-lcx-composer]")) {
        return;
      }
      event.preventDefault();
      if (liveChatAudioSession.mode === "preview" && liveChatAudioSession.blob) {
        await liveChatSendAudioMessage();
        return;
      }
      const input = form.querySelector("[data-lcx-message-input]");
      const text = input instanceof HTMLTextAreaElement ? input.value : "";
      await liveChatSendComposerText(text);
    });

    elements.liveChatMount.addEventListener("input", (event) => {
      const findInput = event.target instanceof HTMLInputElement ? event.target : null;
      if (!findInput?.matches("[data-lcx-chat-find-input]")) {
        return;
      }
      window.clearTimeout(liveChatChatFindTimer);
      liveChatRedesignState.chatFindQuery = findInput.value;
      liveChatRedesignState.chatFindMatchIndex = 0;
      liveChatChatFindTimer = window.setTimeout(() => {
        liveChatSyncChatFindHighlights({ goToIndex: 0 });
      }, 120);
    });

    elements.liveChatMount.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        if (liveChatAudioSession.mode === "starting" || liveChatAudioSession.mode === "recording" || liveChatAudioSession.mode === "preview") {
          event.preventDefault();
          liveChatDiscardAudioRecording();
          return;
        }
        if (liveChatRedesignState.emojiPickerOpen) {
          event.preventDefault();
          liveChatSetEmojiPickerOpen(false);
          return;
        }
        if (liveChatRedesignState.chatFindOpen) {
          event.preventDefault();
          liveChatCloseChatFind();
          return;
        }
        const contextMenu = elements.liveChatMount?.querySelector("[data-lcx-message-context-menu]");
        if (contextMenu instanceof HTMLElement && !contextMenu.hidden) {
          event.preventDefault();
          liveChatCloseMessageContextMenu();
          return;
        }
        if (liveChatPendingEditFor(liveChatGetActive())) {
          event.preventDefault();
          liveChatClearPendingEdit();
          return;
        }
        if (liveChatPendingReplyFor(liveChatGetActive())) {
          event.preventDefault();
          liveChatClearPendingReply();
          return;
        }
        liveChatCloseAdminMessageMenus();
      }
      if (
        event.key === "Enter"
        && !event.shiftKey
        && liveChatAudioSession.mode === "preview"
        && liveChatAudioSession.blob
        && !liveChatRedesignState.emojiPickerOpen
        && !liveChatRedesignState.chatFindOpen
      ) {
        event.preventDefault();
        void liveChatSendAudioMessage();
        return;
      }
      const findInput = event.target instanceof HTMLInputElement
        ? event.target
        : null;
      if (findInput?.matches("[data-lcx-chat-find-input]")) {
        if (event.key === "Enter") {
          event.preventDefault();
          liveChatChatFindStep(event.shiftKey ? -1 : 1);
          return;
        }
      }
      const timeBubble = event.target instanceof HTMLElement
        ? event.target.closest("[data-lcx-action='toggle-message-time']")
        : null;
      if (
        timeBubble instanceof HTMLElement
        && event.target === timeBubble
        && (event.key === "Enter" || event.key === " ")
      ) {
        event.preventDefault();
        timeBubble.click();
        return;
      }
      const input = event.target instanceof HTMLTextAreaElement ? event.target : null;
      if (!input?.matches("[data-lcx-message-input]")) {
        return;
      }
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        input.closest("form")?.requestSubmit();
      }
    });

    elements.liveChatMount.addEventListener("focusout", (event) => {
      const input = event.target instanceof HTMLTextAreaElement ? event.target : null;
      if (!input?.matches("[data-lcx-message-input]")) {
        return;
      }
      const next = event.relatedTarget instanceof Node ? event.relatedTarget : null;
      if (next && elements.liveChatMount.contains(next) && next.closest?.("[data-lcx-composer]")) {
        return;
      }
      liveChatStopSupportTyping({ force: true });
    });

    elements.liveChatMount.addEventListener("change", async (event) => {
      const input = event.target instanceof HTMLInputElement ? event.target : null;
      if (!input?.matches("[data-lcx-file-input]") || !input.files?.length) {
        return;
      }
      const active = liveChatGetActive();
      if (!active) {
        return;
      }
      const files = Array.from(input.files);
      input.value = "";
      liveChatStageComposerAttachments(files, active);
    });

    elements.liveChatMount.addEventListener("dragenter", (event) => {
      const dropzone = event.target instanceof Element
        ? event.target.closest("[data-lcx-attachment-dropzone]")
        : null;
      if (!(dropzone instanceof HTMLElement) || dropzone.disabled) {
        return;
      }
      event.preventDefault();
      dropzone.classList.add("is-drag-over");
    });

    elements.liveChatMount.addEventListener("dragover", (event) => {
      const dropzone = event.target instanceof Element
        ? event.target.closest("[data-lcx-attachment-dropzone]")
        : null;
      if (!(dropzone instanceof HTMLElement) || dropzone.disabled) {
        return;
      }
      event.preventDefault();
      dropzone.classList.add("is-drag-over");
    });

    elements.liveChatMount.addEventListener("dragleave", (event) => {
      const dropzone = event.target instanceof Element
        ? event.target.closest("[data-lcx-attachment-dropzone]")
        : null;
      if (!(dropzone instanceof HTMLElement)) {
        return;
      }
      const related = event.relatedTarget instanceof Node ? event.relatedTarget : null;
      if (related && dropzone.contains(related)) {
        return;
      }
      dropzone.classList.remove("is-drag-over");
    });

    elements.liveChatMount.addEventListener("drop", (event) => {
      const dropzone = event.target instanceof Element
        ? event.target.closest("[data-lcx-attachment-dropzone]")
        : null;
      if (!(dropzone instanceof HTMLElement) || dropzone.disabled) {
        return;
      }
      event.preventDefault();
      dropzone.classList.remove("is-drag-over");
      const active = liveChatGetActive();
      if (!active) {
        return;
      }
      const files = Array.from(event.dataTransfer?.files || []);
      if (!files.length) {
        return;
      }
      liveChatStageComposerAttachments(files, active);
    });

    if (document.body.dataset.lcxChatFindBound !== "true") {
      document.body.dataset.lcxChatFindBound = "true";
      document.addEventListener("keydown", (event) => {
        if (activeMainView !== "live-chat") {
          return;
        }
        if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "f") {
          return;
        }
        if (!elements.liveChatMount?.querySelector("[data-lcx-board]")) {
          return;
        }
        event.preventDefault();
        if (liveChatRedesignState.chatFindOpen) {
          const input = elements.liveChatMount?.querySelector("[data-lcx-chat-find-input]");
          if (input instanceof HTMLInputElement) {
            input.focus({ preventScroll: true });
            input.select();
          }
          return;
        }
        liveChatOpenChatFind({ select: true });
      });
    }
  }

  function liveChatBindSearchBridge() {
    if (!(elements.liveChatSearchBridge instanceof HTMLInputElement) || elements.liveChatSearchBridge.dataset.lcxBound === "true") {
      return;
    }
    elements.liveChatSearchBridge.dataset.lcxBound = "true";
    elements.liveChatSearchBridge.addEventListener("input", () => {
      liveChatRedesignState.search = elements.liveChatSearchBridge.value;
      liveChatRenderBoard();
    });
  }

  async function loadLiveChatWorkspace() {
    if (!elements.liveChatMount || elements.liveChatMount.dataset.mainLiveChatReady === "true") {
      return;
    }

    elements.liveChatMount.setAttribute("aria-busy", "true");
    try {
      liveChatRedesignConversations = liveChatCloneSeed();
      if (!Array.isArray(window.GMS_LIVE_CHAT_DATA) || !window.GMS_LIVE_CHAT_DATA.length) {
        try {
          await liveChatLoadRemoteData();
        } catch (error) {
          console.warn("Live Chat is using local preview data because the API could not be loaded.", error);
        }
      }
      if (!liveChatCustomWallpapers.length) {
        await liveChatLoadWallpapers();
      }
      window.GMS_LIVE_CHAT_REFRESH = (nextConversations) => {
        if (!Array.isArray(nextConversations)) {
          return;
        }
        try {
          liveChatRedesignConversations = JSON.parse(JSON.stringify(nextConversations));
        } catch (error) {
          liveChatRedesignConversations = nextConversations.slice();
        }
        if (!liveChatRedesignConversations.some((item) => item.id === liveChatRedesignState.activeId)) {
          liveChatSetActiveId(liveChatRedesignConversations[0]?.id || "");
        }
        liveChatRenderBoard();
      };
      if (!liveChatRedesignConversations.some((item) => item.id === liveChatRedesignState.activeId)) {
        liveChatSetActiveId(liveChatRedesignConversations[0]?.id || "");
      }
      liveChatBindRedesignEvents();
      liveChatBindSearchBridge();
      liveChatRedesignState.search = liveChatSearchQuery;
      liveChatRedesignState.forceMessageScrollBottom = true;
      liveChatRedesignState.messageScrollPinned = true;
      liveChatRenderBoard();
      elements.liveChatMount.dataset.mainLiveChatReady = "true";
    } catch (error) {
      elements.liveChatMount.dataset.mainLiveChatReady = "false";
      elements.liveChatMount.innerHTML = `
        <div class="main-live-chat-error" role="alert">
          <strong>Unable to load conversations</strong>
          <p>Please refresh or try again.</p>
          <button type="button" data-main-live-chat-retry>Try again</button>
        </div>`;
      throw error;
    } finally {
      elements.liveChatMount.removeAttribute("aria-busy");
    }
  }


  function ensureLiveChatWorkspace() {
    if (!liveChatLoadPromise) {
      liveChatLoadPromise = loadLiveChatWorkspace().catch((error) => {
        liveChatLoadPromise = null;
        throw error;
      });
    }
    return liveChatLoadPromise;
  }

  function getListingInsightFrameSrc(forceReload = false) {
    const url = new URL(listingInsightDocumentSrc, window.location.origin);
    url.searchParams.set("main_listing_insight_mode", listingInsightRankingMode);
    const requestedProductId = String(
      new URL(window.location.href).searchParams.get("listingInsightProduct") || "",
    ).trim();
    if (requestedProductId) {
      url.searchParams.set("main_listing_insight_product", requestedProductId);
    }
    if (forceReload) {
      url.searchParams.set("_", String(Date.now()));
    }
    return `${url.pathname}${url.search}${url.hash}`;
  }

  function getOrdersFrameSrc(forceReload = false) {
    const url = new URL(ordersDocumentSrc, window.location.origin);
    url.searchParams.set("main_orders_status", ordersStatusFilter);
    if (forceReload) {
      url.searchParams.set("_", String(Date.now()));
    }
    return `${url.pathname}${url.search}${url.hash}`;
  }

  function setMainOrdersDetailModalOpen(isOpen) {
    const shouldOpen = Boolean(isOpen);
    mainOrdersDetailModalOpen = shouldOpen;
    document.documentElement.classList.toggle("main-orders-detail-modal-open", shouldOpen);
    elements.body?.classList.toggle("main-orders-detail-modal-open", shouldOpen);
    elements.ordersFrameShell?.classList.toggle("is-order-detail-modal-open", shouldOpen);

    if (elements.ordersFrame instanceof HTMLIFrameElement) {
      elements.ordersFrame.title = shouldOpen
        ? "Live order details"
        : "Live orders workspace";
    }

    if (!shouldOpen) {
      queueMainEmbeddedFrameHeightSync("orders", 80);
    }
  }

  function requestMainOrdersDetailModalClose() {
    if (!mainOrdersDetailModalOpen) {
      return;
    }

    const frameWindow = elements.ordersFrame instanceof HTMLIFrameElement
      ? elements.ordersFrame.contentWindow
      : null;
    if (!frameWindow) {
      setMainOrdersDetailModalOpen(false);
      return;
    }

    frameWindow.postMessage(
      { type: "gms-main-orders-detail-modal-close" },
      window.location.origin,
    );
  }

  function syncMainOrdersWaybillPrintButtonState(payload = {}) {
    const button = elements.ordersWaybillPrintButton;
    const countEl = elements.ordersWaybillPrintCount;
    if (!(button instanceof HTMLButtonElement)) {
      return;
    }

    if (Object.prototype.hasOwnProperty.call(payload, "selectedCount")) {
      mainOrdersWaybillSelectedCount = Math.max(
        0,
        Math.trunc(Number(payload?.selectedCount) || 0),
      );
    }
    if (Object.prototype.hasOwnProperty.call(payload, "inFlight")) {
      mainOrdersWaybillSelectionInFlight = payload?.inFlight === true;
    }
    button.disabled = mainOrdersWaybillSelectionInFlight
      || mainOrdersWaybillAwaitingPrintConfirmation
      || mainOrdersWaybillSelectedCount === 0;
    if (countEl instanceof HTMLElement) {
      countEl.hidden = mainOrdersWaybillSelectedCount === 0;
      countEl.textContent = `(${mainOrdersWaybillSelectedCount})`;
    }
  }

  function ensureMainOrdersWaybillPrintConfirmationModal() {
    if (mainOrdersWaybillPrintConfirmationModalEl instanceof HTMLElement) {
      return mainOrdersWaybillPrintConfirmationModalEl;
    }

    const modal = document.createElement("div");
    modal.className = "main-orders-print-confirmation";
    modal.dataset.mainOrdersPrintConfirmation = "true";
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    modal.innerHTML = `
      <button type="button" class="main-orders-print-confirmation__backdrop" data-main-orders-print-not-confirmed aria-label="Keep order awaiting waybill"></button>
      <section class="main-orders-print-confirmation__dialog" role="dialog" aria-modal="true" aria-labelledby="main-orders-print-confirmation-title" aria-describedby="main-orders-print-confirmation-description">
        <span class="main-orders-print-confirmation__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 9V2h12v7"/><rect x="6" y="14" width="12" height="8"/></svg>
        </span>
        <div class="main-orders-print-confirmation__copy">
          <h2 id="main-orders-print-confirmation-title">Confirm successful print</h2>
          <p id="main-orders-print-confirmation-description">Did the selected waybill finish printing successfully?</p>
          <small>The order moves to To Prepare only after you confirm the successful print.</small>
        </div>
        <div class="main-orders-print-confirmation__actions">
          <button type="button" class="main-orders-print-confirmation__cancel" data-main-orders-print-not-confirmed>Not Printed</button>
          <button type="button" class="main-orders-print-confirmation__confirm" data-main-orders-print-confirmed>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>
            <span>Printed Successfully</span>
          </button>
        </div>
      </section>`;
    document.body.appendChild(modal);
    modal.querySelectorAll("[data-main-orders-print-not-confirmed]").forEach((button) => {
      button.addEventListener("click", () => {
        setMainOrdersWaybillPrintConfirmationOpen(false);
        resetMainOrdersWaybillPrintState();
        showMainOrdersWaybillSnackbar(
          "Print Waybill",
          "Print was not confirmed. The order remains Awaiting Waybill.",
          "default",
        );
      });
    });
    modal.querySelector("[data-main-orders-print-confirmed]")?.addEventListener("click", () => {
      const confirmButton = modal.querySelector("[data-main-orders-print-confirmed]");
      if (confirmButton instanceof HTMLButtonElement) {
        confirmButton.disabled = true;
      }
      requestMainOrdersWaybillPrintConfirm();
    });
    mainOrdersWaybillPrintConfirmationModalEl = modal;
    return modal;
  }

  function setMainOrdersWaybillPrintConfirmationOpen(isOpen) {
    const modal = ensureMainOrdersWaybillPrintConfirmationModal();
    const shouldOpen = Boolean(isOpen);
    mainOrdersWaybillAwaitingPrintConfirmation = shouldOpen;
    modal.hidden = !shouldOpen;
    modal.setAttribute("aria-hidden", shouldOpen ? "false" : "true");
    document.body.classList.toggle("main-orders-print-confirmation-open", shouldOpen);
    const confirmButton = modal.querySelector("[data-main-orders-print-confirmed]");
    if (confirmButton instanceof HTMLButtonElement) {
      confirmButton.disabled = false;
    }
    syncMainOrdersWaybillPrintButtonState();
    if (shouldOpen) {
      window.requestAnimationFrame(() => {
        modal.querySelector("[data-main-orders-print-confirmed]")?.focus();
      });
    }
  }

  function requestMainOrdersWaybillPrint() {
    const frameWindow = elements.ordersFrame instanceof HTMLIFrameElement
      ? elements.ordersFrame.contentWindow
      : null;
    if (!frameWindow) {
      showMainOrdersWaybillSnackbar("Print Waybill", "Live orders workspace is not ready yet.", "error");
      return;
    }

    frameWindow.postMessage(
      { type: "gms-main-orders-waybill-preview-request" },
      window.location.origin,
    );
  }

  function hideMainOrdersWaybillSnackbar() {
    const snackbar = elements.ordersWaybillSnackbar;
    const timerBar = elements.ordersWaybillSnackbarTimer;
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

  function showMainOrdersWaybillSnackbar(title, message, mode = "error") {
    const snackbar = elements.ordersWaybillSnackbar;
    const timerBar = elements.ordersWaybillSnackbarTimer;
    if (!(snackbar instanceof HTMLElement)) {
      return;
    }

    const normalizedTitle = String(title || "Print Waybill").trim() || "Print Waybill";
    const normalizedMessage = String(message || "").replace(/\s+/g, " ").trim();
    if (elements.ordersWaybillSnackbarTitle instanceof HTMLElement) {
      elements.ordersWaybillSnackbarTitle.textContent = normalizedTitle;
    }
    if (elements.ordersWaybillSnackbarMessage instanceof HTMLElement) {
      elements.ordersWaybillSnackbarMessage.textContent = normalizedMessage;
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

  function resolveWaybillBarcodeFormat(barcodeValue) {
    const normalized = String(barcodeValue || "").trim();
    if (/^\d{13}$/.test(normalized) || /^\d{12}$/.test(normalized)) {
      return "EAN13";
    }
    if (/^\d{8}$/.test(normalized)) {
      return "EAN8";
    }
    return "CODE128";
  }

  function renderMainOrdersWaybillBarcodes(root) {
    if (!(root instanceof HTMLElement) || typeof window.JsBarcode !== "function") {
      return;
    }
    root.querySelectorAll(".waybill-barcode").forEach((node) => {
      const value = String(node.getAttribute("data-barcode") || "").trim();
      if (!value) {
        return;
      }
      const format = String(node.getAttribute("data-barcode-format") || "").trim()
        || resolveWaybillBarcodeFormat(value);
      const isListingBarcode = Boolean(node.closest(".waybill-table__barcode--listing"));
      try {
        window.JsBarcode(node, value, {
          format,
          displayValue: false,
          margin: 0,
          width: isListingBarcode ? 2 : 1.6,
          height: isListingBarcode ? 58 : 52,
        });
      } catch (_) {
        /* keep text fallback */
      }
    });
  }

  function buildMainOrdersWaybillPreviewMarkup(waybills = []) {
    return (Array.isArray(waybills) ? waybills : [])
      .map((entry) => {
        const html = String(entry?.html ?? "").trim();
        if (!html) {
          return "";
        }
        const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        const sectionBody = bodyMatch?.[1]?.trim() || html;
        return '<section class="main-orders-waybill-print-page">' + sectionBody + "</section>";
      })
      .filter(Boolean)
      .join("");
  }

  function continueMainOrdersWaybillPrint(payload = {}) {
    const waybills = Array.isArray(payload?.waybills) ? payload.waybills : [];
    const createdAtEpochMsList = Array.isArray(payload?.createdAtEpochMsList)
      ? payload.createdAtEpochMsList
      : waybills.map((entry) => entry?.createdAtEpochMs).filter(Boolean);

    if (!waybills.length || !createdAtEpochMsList.length) {
      showMainOrdersWaybillSnackbar(
        "Print Waybill",
        "Unable to prepare the selected waybill for printing.",
        "error",
      );
      return;
    }

    mainOrdersWaybillPreviewState = {
      waybills,
      createdAtEpochMsList,
    };
    mainOrdersWaybillAwaitingPrintConfirmation = true;
    syncMainOrdersWaybillPrintButtonState();
    const didOpenPrintDialog = printMainOrdersWaybillPreviewContent(waybills, () => {
      setMainOrdersWaybillPrintConfirmationOpen(true);
    });
    if (!didOpenPrintDialog) {
      resetMainOrdersWaybillPrintState();
    }
  }

  function resetMainOrdersWaybillPrintState() {
    if (mainOrdersWaybillPrintConfirmationModalEl instanceof HTMLElement) {
      mainOrdersWaybillPrintConfirmationModalEl.hidden = true;
      mainOrdersWaybillPrintConfirmationModalEl.setAttribute("aria-hidden", "true");
    }
    document.body.classList.remove("main-orders-print-confirmation-open");
    mainOrdersWaybillAwaitingPrintConfirmation = false;
    mainOrdersWaybillPreviewState = {
      waybills: [],
      createdAtEpochMsList: [],
    };
    syncMainOrdersWaybillPrintButtonState();
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

  function printMainOrdersWaybillPreviewContent(
    waybills = mainOrdersWaybillPreviewState.waybills,
    onPrintDialogClosed = null,
  ) {
    const sections = buildMainOrdersWaybillPreviewMarkup(waybills);
    if (!sections) {
      showMainOrdersWaybillSnackbar("Print Waybill", "Nothing is ready to print.", "error");
      return false;
    }

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
    if (!printDocument) {
      printFrame.remove();
      showMainOrdersWaybillSnackbar("Print Waybill", "Unable to start the print dialog.", "error");
      return false;
    }

    const printWindow = printFrame.contentWindow;
    if (!printWindow) {
      printFrame.remove();
      showMainOrdersWaybillSnackbar("Print Waybill", "Unable to start the print dialog.", "error");
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

    printFrame.addEventListener("load", () => {
      window.setTimeout(() => {
        printFrame.remove();
      }, 3000);
    }, { once: true });
    return true;
  }

  function requestMainOrdersWaybillPrintConfirm() {
    const frameWindow = elements.ordersFrame instanceof HTMLIFrameElement
      ? elements.ordersFrame.contentWindow
      : null;
    const createdAtEpochMsList = [...mainOrdersWaybillPreviewState.createdAtEpochMsList];
    if (!frameWindow || !createdAtEpochMsList.length) {
      resetMainOrdersWaybillPrintState();
      showMainOrdersWaybillSnackbar("Print Waybill", "Select at least one order to print.", "error");
      return false;
    }

    frameWindow.postMessage(
      {
        type: "gms-main-orders-waybill-print-confirm",
        createdAtEpochMsList,
      },
      window.location.origin,
    );
    return true;
  }

  function showOrdersFrameError() {
    window.clearTimeout(ordersLoadFailureTimer);
    setMainOrdersDetailModalOpen(false);
    disconnectMainEmbeddedFrameHeightSync("orders");
    if (elements.ordersLoading) {
      elements.ordersLoading.hidden = true;
    }
    if (elements.ordersError) {
      elements.ordersError.hidden = false;
    }
    elements.ordersFrame?.classList.remove("is-ready");
    finishMainInitialLoading("orders");
  }

  async function handleOrdersFrameLoad() {
    const frame = elements.ordersFrame;
    if (!(frame instanceof HTMLIFrameElement)) {
      return;
    }

    setMainOrdersDetailModalOpen(false);
    try {
      const frameDocument = frame.contentDocument;
      const frameWindow = frame.contentWindow;
      if (!frameDocument || !frameWindow || frameWindow.location.href === "about:blank") {
        return;
      }

      await installMainOwnedStylesheet(frameDocument);
      installMainSectionCountSync("orders", frameDocument);
      window.clearTimeout(ordersLoadFailureTimer);
      if (elements.ordersLoading) {
        elements.ordersLoading.hidden = true;
      }
      if (elements.ordersError) {
        elements.ordersError.hidden = true;
      }
      frame.classList.add("is-ready");
      installMainEmbeddedFrameHeightSync("orders", frameDocument);
      syncOrdersSearch(ordersSearchQuery);
      syncOrdersStatusFilter(ordersStatusFilter);
      syncOrdersAdvancedFilters();
      const filterOptions = frameWindow.GMS_MAIN_ORDERS_GET_FILTER_OPTIONS?.();
      if (filterOptions && typeof filterOptions === "object") {
        updateOrdersHeaderFilterOptions(filterOptions);
      }
      queueMainEmbeddedFrameHeightSync("orders");
      finishMainInitialLoading("orders");
    } catch (error) {
      showOrdersFrameError();
    }
  }

  function ensureOrdersWorkspace(options = {}) {
    const frame = elements.ordersFrame;
    if (!(frame instanceof HTMLIFrameElement)) {
      return;
    }

    const forceReload = options.force === true;
    if (ordersLoadStarted && !forceReload) {
      syncOrdersSearch(ordersSearchQuery);
      syncOrdersStatusFilter(ordersStatusFilter);
      queueMainEmbeddedFrameHeightSync("orders");
      return;
    }

    ordersLoadStarted = true;
    resetMainEmbeddedFrameHeight("orders");
    frame.classList.remove("is-ready");
    if (elements.ordersLoading) {
      elements.ordersLoading.hidden = false;
    }
    if (elements.ordersError) {
      elements.ordersError.hidden = true;
    }

    window.clearTimeout(ordersLoadFailureTimer);
    ordersLoadFailureTimer = window.setTimeout(showOrdersFrameError, 15000);
    frame.src = getOrdersFrameSrc(forceReload);
  }

  function setMainListingInsightDetailModalOpen(isOpen) {
    const shouldOpen = Boolean(isOpen);
    mainListingInsightDetailModalOpen = shouldOpen;
    document.documentElement.classList.toggle(
      "main-listing-insight-detail-modal-open",
      shouldOpen,
    );
    elements.body?.classList.toggle(
      "main-listing-insight-detail-modal-open",
      shouldOpen,
    );
    elements.listingInsightFrameShell?.classList.toggle(
      "is-listing-insight-detail-modal-open",
      shouldOpen,
    );

    if (elements.listingInsightFrame instanceof HTMLIFrameElement) {
      elements.listingInsightFrame.title = shouldOpen
        ? "Listing insight product details"
        : "Listing insight workspace";
    }

    if (!shouldOpen) {
      queueMainEmbeddedFrameHeightSync("listing-insight", 80);
    }
  }

  window.GMS_MAIN_LISTING_INSIGHT_MODAL = Object.freeze({
    setOpen: setMainListingInsightDetailModalOpen,
  });

  function requestMainListingInsightDetailModalClose() {
    if (!mainListingInsightDetailModalOpen) {
      return;
    }

    const frameWindow = elements.listingInsightFrame instanceof HTMLIFrameElement
      ? elements.listingInsightFrame.contentWindow
      : null;
    if (!frameWindow) {
      setMainListingInsightDetailModalOpen(false);
      return;
    }

    frameWindow.postMessage(
      { type: "gms-main-listing-insight-detail-modal-close" },
      window.location.origin,
    );
  }

  function showListingInsightFrameError() {
    window.clearTimeout(listingInsightLoadFailureTimer);
    setMainListingInsightDetailModalOpen(false);
    disconnectMainEmbeddedFrameHeightSync("listing-insight");
    if (elements.listingInsightLoading) {
      elements.listingInsightLoading.hidden = true;
    }
    if (elements.listingInsightError) {
      elements.listingInsightError.hidden = false;
    }
    elements.listingInsightFrame?.classList.remove("is-ready");
    finishMainInitialLoading("listing-insight");
  }

  async function handleListingInsightFrameLoad() {
    const frame = elements.listingInsightFrame;
    if (!(frame instanceof HTMLIFrameElement)) {
      return;
    }

    setMainListingInsightDetailModalOpen(false);
    try {
      const frameDocument = frame.contentDocument;
      const frameWindow = frame.contentWindow;
      if (!frameDocument || !frameWindow || frameWindow.location.href === "about:blank") {
        return;
      }

      await installMainOwnedStylesheet(frameDocument);
      installMainSectionCountSync("listing-insight", frameDocument);
      window.clearTimeout(listingInsightLoadFailureTimer);
      if (elements.listingInsightLoading) {
        elements.listingInsightLoading.hidden = true;
      }
      if (elements.listingInsightError) {
        elements.listingInsightError.hidden = true;
      }
      frame.classList.add("is-ready");
      installMainEmbeddedFrameHeightSync("listing-insight", frameDocument);
      syncListingInsightRankingMode(listingInsightRankingMode);
      syncListingInsightHeaderFilters();
      syncListingInsightSearch(listingInsightSearchQuery);
      queueMainEmbeddedFrameHeightSync("listing-insight");
      finishMainInitialLoading("listing-insight");
    } catch (error) {
      showListingInsightFrameError();
    }
  }

  function ensureListingInsightWorkspace(options = {}) {
    const frame = elements.listingInsightFrame;
    if (!(frame instanceof HTMLIFrameElement)) {
      return;
    }

    const forceReload = options.force === true;
    if (listingInsightLoadStarted && !forceReload) {
      syncListingInsightRankingMode(listingInsightRankingMode);
      syncListingInsightHeaderFilters();
      syncListingInsightSearch(listingInsightSearchQuery);
      queueMainEmbeddedFrameHeightSync("listing-insight");
      return;
    }

    listingInsightLoadStarted = true;
    resetMainEmbeddedFrameHeight("listing-insight");
    frame.classList.remove("is-ready");
    if (elements.listingInsightLoading) {
      elements.listingInsightLoading.hidden = false;
    }
    if (elements.listingInsightError) {
      elements.listingInsightError.hidden = true;
    }

    window.clearTimeout(listingInsightLoadFailureTimer);
    listingInsightLoadFailureTimer = window.setTimeout(showListingInsightFrameError, 15000);
    frame.src = getListingInsightFrameSrc(forceReload);
  }

  function getProductListingFrameSrc(forceReload = false) {
    const url = new URL(productListingDocumentSrc, window.location.origin);
    if (forceReload) {
      url.searchParams.set("_", String(Date.now()));
    }
    return `${url.pathname}${url.search}${url.hash}`;
  }

  function syncProductListingFrameViewportMode() {
    const frame = elements.listingFrame;
    if (!(frame instanceof HTMLIFrameElement)) {
      return;
    }

    try {
      frame.contentDocument?.documentElement.classList.toggle(
        "admin-spa-frame-mobile",
        window.matchMedia("(max-width: 860px)").matches,
      );
    } catch (error) {
      // The iframe may still be navigating.
    }
  }

  function disconnectProductListingFrameHeightSync() {
    window.clearTimeout(productListingFrameResizeTimer);
    productListingFrameResizeTimer = 0;
    productListingFrameResizeObserver?.disconnect();
    productListingFrameResizeObserver = null;
    productListingFrameMutationObserver?.disconnect();
    productListingFrameMutationObserver = null;
    productListingFrameAbortController?.abort();
    productListingFrameAbortController = null;
    productListingFrameLastHeight = 0;
  }

  function getProductListingFrameContentHeight(frameDocument) {
    const frameWindow = frameDocument.defaultView;
    const dashboardContent = frameDocument.querySelector(".dashboard-content");
    const contentRoot = dashboardContent instanceof frameWindow.HTMLElement
      ? dashboardContent
      : frameDocument.body;
    const candidates = [
      frameDocument.querySelector(".product-panel-grid"),
      frameDocument.querySelector(".product-panel-grid__inventory"),
      frameDocument.querySelector(".product-list"),
      ...frameDocument.querySelectorAll(
        ".dashboard-content > *, .product-panel-grid__inventory > *, .product-list > *",
      ),
    ].filter((element) => {
      return element instanceof frameWindow.HTMLElement
        && element !== frameDocument.documentElement
        && element !== frameDocument.body;
    });

    const contentHeight = candidates.reduce((height, element) => {
      const style = frameWindow.getComputedStyle(element);
      if (
        style.display === "none"
        || style.visibility === "hidden"
        || style.position === "fixed"
        || isInsideFixedAncestor(element, frameDocument)
      ) {
        return height;
      }

      const rect = element.getBoundingClientRect();
      const bottom = rect.bottom + frameWindow.scrollY;
      return Math.max(
        height,
        Math.ceil(bottom),
        element.scrollHeight,
        element.offsetHeight,
      );
    }, 0);

    const rootRect = contentRoot?.getBoundingClientRect?.();
    const rootOffset = rootRect ? Math.max(0, Math.ceil(rootRect.top + frameWindow.scrollY)) : 0;
    return Math.max(720, rootOffset + contentHeight + 24);
  }

  function syncProductListingFrameHeight() {
    const frame = elements.listingFrame;
    if (
      !(frame instanceof HTMLIFrameElement)
      || activeMainView !== "listing"
      || elements.body.classList.contains("main-product-composer-open")
    ) {
      return;
    }

    try {
      const frameDocument = frame.contentDocument;
      const frameWindow = frame.contentWindow;
      if (!frameDocument || !frameWindow || frameWindow.location.href === "about:blank") {
        return;
      }

      const contentHeight = getProductListingFrameContentHeight(frameDocument);
      if (Math.abs(contentHeight - productListingFrameLastHeight) < 4) {
        return;
      }

      productListingFrameLastHeight = contentHeight;
      const nextHeight = `${contentHeight}px`;
      frame.style.setProperty("--main-listing-frame-height", nextHeight);
      frame.style.height = nextHeight;
      frame.setAttribute("scrolling", "no");
    } catch (error) {
      // The iframe can be between navigations during a reload.
    }
  }

  function queueProductListingFrameHeightSync(delay = 0) {
    window.clearTimeout(productListingFrameResizeTimer);
    productListingFrameResizeTimer = window.setTimeout(() => {
      productListingFrameResizeTimer = 0;
      window.requestAnimationFrame(syncProductListingFrameHeight);
    }, delay);
  }

  function installProductListingFrameHeightSync(frameDocument) {
    const frameWindow = frameDocument.defaultView;
    if (!frameWindow) {
      return;
    }

    disconnectProductListingFrameHeightSync();
    productListingFrameAbortController = new AbortController();
    const { signal } = productListingFrameAbortController;
    const observedElements = [
      frameDocument.querySelector(".dashboard-content"),
      frameDocument.querySelector(".product-panel-grid"),
      frameDocument.querySelector(".product-panel-grid__inventory"),
      frameDocument.querySelector(".product-list"),
      ...frameDocument.querySelectorAll(".product-list > *"),
    ].filter((element) => element instanceof frameWindow.HTMLElement);

    if (typeof frameWindow.ResizeObserver === "function") {
      productListingFrameResizeObserver = new frameWindow.ResizeObserver(() => {
        queueProductListingFrameHeightSync();
      });
      observedElements.forEach((element) => productListingFrameResizeObserver.observe(element));
    }

    if (typeof frameWindow.MutationObserver === "function" && frameDocument.body) {
      productListingFrameMutationObserver = new frameWindow.MutationObserver(() => {
        queueProductListingFrameHeightSync(40);
      });
      productListingFrameMutationObserver.observe(frameDocument.body, {
        attributes: true,
        childList: true,
        subtree: true,
      });
    }

    frameWindow.addEventListener("resize", () => queueProductListingFrameHeightSync(), { signal });
    frameDocument.addEventListener("load", () => queueProductListingFrameHeightSync(), {
      capture: true,
      signal,
    });
    frameDocument.addEventListener("transitionend", () => queueProductListingFrameHeightSync(), {
      capture: true,
      signal,
    });

    if (frameDocument.fonts?.ready) {
      void frameDocument.fonts.ready
        .then(() => queueProductListingFrameHeightSync())
        .catch(() => {});
    }
    queueProductListingFrameHeightSync();
    window.setTimeout(() => queueProductListingFrameHeightSync(), 180);
    window.setTimeout(() => queueProductListingFrameHeightSync(), 700);
  }

  function installProductListingFrameStyles(frameDocument) {
    frameDocument.documentElement.classList.add("admin-spa-frame-document");
    frameDocument.documentElement.classList.add("main-listing-frame-document");
    frameDocument.documentElement.classList.toggle(
      "admin-spa-frame-mobile",
      window.matchMedia("(max-width: 860px)").matches,
    );
    frameDocument.body?.classList.add("admin-spa-frame-document");
    frameDocument.body?.classList.add("main-listing-embedded");

    const mainStyles = installMainOwnedStylesheet(frameDocument);
    let stylesheet = frameDocument.querySelector("link[data-main-listing-frame-styles]");
    if (String(stylesheet?.tagName || "").toLowerCase() === "link") {
      return Promise.all([mainStyles, waitForMainStylesheet(stylesheet)]).then(() => undefined);
    }

    stylesheet = frameDocument.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = productListingFrameStylesheetHref;
    stylesheet.dataset.mainListingFrameStyles = "true";

    const productPanelStyles = new Promise((resolve) => {
      let resolved = false;
      const finish = () => {
        if (resolved) {
          return;
        }
        resolved = true;
        resolve();
      };
      stylesheet.addEventListener("load", finish, { once: true });
      stylesheet.addEventListener("error", finish, { once: true });
      frameDocument.head?.appendChild(stylesheet);
      window.setTimeout(finish, 500);
    });

    return Promise.all([mainStyles, productPanelStyles]).then(() => undefined);
  }

  function showProductListingFrameError() {
    window.clearTimeout(productListingLoadFailureTimer);
    if (elements.listingLoading) {
      elements.listingLoading.hidden = true;
    }
    if (elements.listingError) {
      elements.listingError.hidden = false;
    }
    elements.listingFrame?.classList.remove("is-ready");
    finishMainInitialLoading("listing");
  }

  function setProductListingComposerPortalOpen(isOpen, { force = false } = {}) {
    const frame = elements.listingFrame;
    if (!(frame instanceof HTMLIFrameElement)) {
      const shouldOpenInlineComposer = Boolean(isOpen);
      productListingComposerLastOpenedAt = shouldOpenInlineComposer ? Date.now() : 0;
      elements.body?.classList.toggle("main-product-composer-open", shouldOpenInlineComposer);
      return;
    }

    let shouldOpen = Boolean(isOpen);
    const openGraceMs = 900;
    const openElapsedMs = Date.now() - productListingComposerLastOpenedAt;
    if (!shouldOpen && !force && isProductListingComposerOpenInFrame()) {
      shouldOpen = true;
    }
    if (
      !shouldOpen &&
      !force &&
      productListingComposerLastOpenedAt > 0 &&
      openElapsedMs >= 0 &&
      openElapsedMs < openGraceMs
    ) {
      shouldOpen = true;
      window.setTimeout(syncProductListingComposerPortalFromFrame, openGraceMs - openElapsedMs + 20);
    }
    if (shouldOpen) {
      productListingComposerLastOpenedAt = Date.now();
    } else {
      productListingComposerLastOpenedAt = 0;
    }
    elements.body?.classList.toggle("main-product-composer-open", shouldOpen);

    try {
      const frameDocument = frame.contentDocument;
      if (shouldOpen && frameDocument) {
        frameDocument.documentElement.classList.add("main-listing-frame-document");
        frameDocument.body?.classList.add("main-listing-embedded");
        void installMainOwnedStylesheet(frameDocument);
      }
      frameDocument?.documentElement?.classList.toggle(
        "main-listing-composer-portal",
        shouldOpen,
      );
      frameDocument?.body?.classList.toggle("main-listing-composer-portal", shouldOpen);
    } catch (error) {
      // If the frame is reloading, the next load/message will restore the correct state.
    }
  }

  function isProductListingComposerOpenInFrame() {
    const frame = elements.listingFrame;
    if (!(frame instanceof HTMLIFrameElement)) {
      return false;
    }

    try {
      const modal = frame.contentDocument?.getElementById("product-composer-modal");
      return modal instanceof HTMLElement && !modal.hidden;
    } catch (error) {
      return false;
    }
  }

  function syncProductListingComposerPortalFromFrame() {
    setProductListingComposerPortalOpen(isProductListingComposerOpenInFrame());
  }

  window.__gmsSetProductListingComposerPortalOpen = setProductListingComposerPortalOpen;

  async function handleProductListingFrameLoad() {
    const frame = elements.listingFrame;
    if (!(frame instanceof HTMLIFrameElement)) {
      return;
    }

    try {
      const frameDocument = frame.contentDocument;
      const frameWindow = frame.contentWindow;
      if (!frameDocument || !frameWindow || frameWindow.location.href === "about:blank") {
        return;
      }

      await installProductListingFrameStyles(frameDocument);
      installProductListingFrameHeightSync(frameDocument);
      window.clearTimeout(productListingLoadFailureTimer);
      if (elements.listingLoading) {
        elements.listingLoading.hidden = true;
      }
      if (elements.listingError) {
        elements.listingError.hidden = true;
      }
      frame.classList.add("is-ready");
      syncProductListingComposerPortalFromFrame();
      syncProductListingSearch(productListingSearchQuery);
      queueProductListingFrameHeightSync();
      finishMainInitialLoading("listing");
    } catch (error) {
      showProductListingFrameError();
    }
  }

  function ensureProductListingWorkspace(options = {}) {
    if (document.getElementById("product-list")) {
      productListingLoadStarted = true;
      syncProductListingSearch(productListingSearchQuery);
      return;
    }

    const frame = elements.listingFrame;
    if (!(frame instanceof HTMLIFrameElement)) {
      return;
    }

    const forceReload = options.force === true;
    if (productListingLoadStarted && !forceReload) {
      syncProductListingSearch(productListingSearchQuery);
      queueProductListingFrameHeightSync();
      return;
    }

    productListingLoadStarted = true;
    disconnectProductListingFrameHeightSync();
    frame.style.removeProperty("--main-listing-frame-height");
    frame.style.removeProperty("height");
    frame.classList.remove("is-ready");
    if (elements.listingLoading) {
      elements.listingLoading.hidden = false;
    }
    if (elements.listingError) {
      elements.listingError.hidden = true;
    }

    window.clearTimeout(productListingLoadFailureTimer);
    productListingLoadFailureTimer = window.setTimeout(showProductListingFrameError, 15000);
    frame.src = getProductListingFrameSrc(forceReload);
  }

  function getInventoryFrameSrc(forceReload = false) {
    const url = new URL(inventoryDocumentSrc, window.location.origin);
    const parentParams = new URLSearchParams(window.location.search);
    inventoryFrameQueryKeys.forEach((key) => {
      if (parentParams.has(key)) {
        url.searchParams.set(key, parentParams.get(key));
      }
    });
    if (forceReload) {
      url.searchParams.set("_", String(Date.now()));
    }
    return `${url.pathname}${url.search}${url.hash}`;
  }

  function finishMainInventoryStockRecordModalClose() {
    window.clearTimeout(mainInventoryStockRecordModalCloseTimer);
    mainInventoryStockRecordModalCloseTimer = 0;
    mainInventoryStockRecordModalOpen = false;
    document.documentElement.classList.remove(
      "main-inventory-stock-record-modal-open",
    );
    elements.body?.classList.remove("main-inventory-stock-record-modal-open");
    elements.inventoryFrameShell?.classList.remove(
      "is-stock-record-modal-open",
      "is-stock-record-modal-closing",
    );

    if (elements.inventoryFrame instanceof HTMLIFrameElement) {
      elements.inventoryFrame.title = "Inventory workspace";
    }

    queueMainEmbeddedFrameHeightSync("inventory", 80);
  }

  function setMainInventoryStockRecordModalOpen(isOpen, options = {}) {
    const shouldOpen = Boolean(isOpen);
    const immediate = options?.immediate === true;
    const shell = elements.inventoryFrameShell;

    if (shouldOpen) {
      window.clearTimeout(mainInventoryStockRecordModalCloseTimer);
      mainInventoryStockRecordModalCloseTimer = 0;
      shell?.classList.remove("is-stock-record-modal-closing");
      mainInventoryStockRecordModalOpen = true;
      document.documentElement.classList.add(
        "main-inventory-stock-record-modal-open",
      );
      elements.body?.classList.add("main-inventory-stock-record-modal-open");
      shell?.classList.add("is-stock-record-modal-open");

      if (elements.inventoryFrame instanceof HTMLIFrameElement) {
        elements.inventoryFrame.title = "Inventory stock records";
      }
      return;
    }

    const isVisiblyOpen = Boolean(
      mainInventoryStockRecordModalOpen
      || shell?.classList.contains("is-stock-record-modal-open"),
    );
    if (!isVisiblyOpen) {
      finishMainInventoryStockRecordModalClose();
      return;
    }

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (immediate || prefersReducedMotion || !(shell instanceof HTMLElement)) {
      finishMainInventoryStockRecordModalClose();
      return;
    }

    if (shell.classList.contains("is-stock-record-modal-closing")) {
      return;
    }

    mainInventoryStockRecordModalOpen = false;
    // Force a style flush so opacity/transform transitions actually animate
    // from the open state instead of snapping.
    void shell.offsetWidth;
    shell.classList.add("is-stock-record-modal-closing");
    window.clearTimeout(mainInventoryStockRecordModalCloseTimer);
    mainInventoryStockRecordModalCloseTimer = window.setTimeout(() => {
      finishMainInventoryStockRecordModalClose();
    }, MAIN_INVENTORY_STOCK_RECORD_MODAL_CLOSE_MS);
  }

  function setMainInventoryStockEditModalOpen(isOpen) {
    const shouldOpen = Boolean(isOpen);
    mainInventoryStockEditModalOpen = shouldOpen;
    document.documentElement.classList.toggle(
      "main-inventory-stock-edit-modal-open",
      shouldOpen,
    );
    elements.body?.classList.toggle(
      "main-inventory-stock-edit-modal-open",
      shouldOpen,
    );
    elements.inventoryFrameShell?.classList.toggle(
      "is-stock-edit-modal-open",
      shouldOpen,
    );

    if (!shouldOpen) {
      queueMainEmbeddedFrameHeightSync("inventory", 80);
    }
  }

  function requestMainInventoryStockEditModalClose() {
    if (!mainInventoryStockEditModalOpen) {
      return;
    }

    const frameWindow = elements.inventoryFrame instanceof HTMLIFrameElement
      ? elements.inventoryFrame.contentWindow
      : null;
    if (!frameWindow) {
      setMainInventoryStockEditModalOpen(false);
      return;
    }

    frameWindow.postMessage(
      { type: "gms-main-inventory-stock-edit-modal-close" },
      window.location.origin,
    );
  }

  function requestMainInventoryStockRecordModalClose() {
    if (!mainInventoryStockRecordModalOpen) {
      return;
    }

    const frameWindow = elements.inventoryFrame instanceof HTMLIFrameElement
      ? elements.inventoryFrame.contentWindow
      : null;
    if (!frameWindow) {
      setMainInventoryStockRecordModalOpen(false, { immediate: true });
      return;
    }

    frameWindow.postMessage(
      { type: "gms-main-inventory-stock-record-modal-close" },
      window.location.origin,
    );
  }

  function syncInventoryFrameViewportMode() {
    const frame = elements.inventoryFrame;
    if (!(frame instanceof HTMLIFrameElement)) {
      return;
    }

    try {
      frame.contentDocument?.documentElement.classList.toggle(
        "admin-spa-frame-mobile",
        window.matchMedia("(max-width: 860px)").matches,
      );
    } catch (error) {
      // The iframe may still be navigating.
    }
  }

  function installInventoryFrameStyles(frameDocument) {
    frameDocument.documentElement.classList.add("admin-spa-frame-document");
    frameDocument.documentElement.classList.add("main-inventory-frame-document");
    frameDocument.documentElement.classList.toggle(
      "admin-spa-frame-mobile",
      window.matchMedia("(max-width: 860px)").matches,
    );
    frameDocument.body?.classList.add("admin-spa-frame-document");
    frameDocument.body?.classList.add("main-inventory-embedded");
    frameDocument.body?.classList.add("stock-main-inventory-embedded");

    const mainStyles = installMainOwnedStylesheet(frameDocument);
    let stylesheet = frameDocument.querySelector("link[data-main-inventory-frame-styles]");
    if (String(stylesheet?.tagName || "").toLowerCase() === "link") {
      return Promise.all([mainStyles, waitForMainStylesheet(stylesheet)]).then(() => undefined);
    }

    stylesheet = frameDocument.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = productListingFrameStylesheetHref;
    stylesheet.dataset.mainInventoryFrameStyles = "true";

    const inventoryPanelStyles = new Promise((resolve) => {
      let resolved = false;
      const finish = () => {
        if (resolved) {
          return;
        }
        resolved = true;
        resolve();
      };
      stylesheet.addEventListener("load", finish, { once: true });
      stylesheet.addEventListener("error", finish, { once: true });
      frameDocument.head?.appendChild(stylesheet);
      window.setTimeout(finish, 500);
    });

    return Promise.all([mainStyles, inventoryPanelStyles]).then(() => undefined);
  }

  function pushInventoryFrameAuth(frameWindow) {
    if (!frameWindow || authState.role !== "seller") {
      return;
    }

    const adminId = [
      authState.session?.adminId,
      authState.session?.ownerAdminId,
      authState.session?.tenantId,
      authState.session?.workspaceId,
      authState.session?.storeAdminId,
      authState.session?.sellerId,
      authState.session?.shopId,
      authState.session?.id,
      authState.session?.accountCode,
    ]
      .map((value) => String(value ?? "").trim())
      .find((value) => value && value.toLowerCase() !== "admin")
      || getSessionAdminId(authState.session);

    if (!adminId) {
      return;
    }

    frameWindow.postMessage(
      {
        type: "gms-main-inventory-auth",
        adminId,
        sessionToken: normalizeText(authState.session?.sessionToken),
      },
      window.location.origin,
    );
  }

  function showInventoryFrameError() {
    window.clearTimeout(inventoryLoadFailureTimer);
    setMainInventoryStockRecordModalOpen(false, { immediate: true });
    disconnectMainEmbeddedFrameHeightSync("inventory");
    if (elements.inventoryLoading) {
      elements.inventoryLoading.hidden = true;
    }
    if (elements.inventoryError) {
      elements.inventoryError.hidden = false;
    }
    elements.inventoryFrame?.classList.remove("is-ready");
    finishMainInitialLoading("inventory");
  }

  async function handleInventoryFrameLoad() {
    const frame = elements.inventoryFrame;
    if (!(frame instanceof HTMLIFrameElement)) {
      return;
    }

    setMainInventoryStockRecordModalOpen(false, { immediate: true });
    try {
      const frameDocument = frame.contentDocument;
      const frameWindow = frame.contentWindow;
      if (!frameDocument || !frameWindow || frameWindow.location.href === "about:blank") {
        return;
      }

      await installInventoryFrameStyles(frameDocument);
      installMainSectionCountSync("inventory", frameDocument);
      installMainEmbeddedFrameHeightSync("inventory", frameDocument);
      window.clearTimeout(inventoryLoadFailureTimer);
      if (elements.inventoryLoading) {
        elements.inventoryLoading.hidden = true;
      }
      if (elements.inventoryError) {
        elements.inventoryError.hidden = true;
      }
      frame.classList.add("is-ready");
      pushInventoryFrameAuth(frameWindow);
      syncInventorySearch(inventorySearchQuery);
      syncInventoryPriorityFilter(inventoryPriorityFilter);
      queueMainEmbeddedFrameHeightSync("inventory");
      finishMainInitialLoading("inventory");
    } catch (error) {
      showInventoryFrameError();
    }
  }

  function ensureInventoryWorkspace(options = {}) {
    const frame = elements.inventoryFrame;
    if (!(frame instanceof HTMLIFrameElement)) {
      return;
    }

    const forceReload = options.force === true;
    if (inventoryLoadStarted && !forceReload) {
      pushInventoryFrameAuth(frame.contentWindow);
      syncInventorySearch(inventorySearchQuery);
      syncInventoryPriorityFilter(inventoryPriorityFilter);
      queueMainEmbeddedFrameHeightSync("inventory");
      return;
    }

    inventoryLoadStarted = true;
    resetMainEmbeddedFrameHeight("inventory");
    frame.classList.remove("is-ready");
    if (elements.inventoryLoading) {
      elements.inventoryLoading.hidden = false;
    }
    if (elements.inventoryError) {
      elements.inventoryError.hidden = true;
    }

    window.clearTimeout(inventoryLoadFailureTimer);
    inventoryLoadFailureTimer = window.setTimeout(showInventoryFrameError, 15000);
    frame.src = getInventoryFrameSrc(forceReload);
  }

  function getEmployeesFrameSrc(forceReload = false) {
    const url = new URL(employeesDocumentSrc, window.location.origin);
    if (forceReload) {
      url.searchParams.set("_", String(Date.now()));
    }
    return `${url.pathname}${url.search}${url.hash}`;
  }

  function clearMainEmployeesDrawerMetrics() {
    const shell = elements.employeesFrameShell;
    if (!(shell instanceof HTMLElement)) {
      return;
    }
    shell.style.removeProperty("--employee-drawer-right");
    shell.style.removeProperty("--employee-drawer-width");
  }

  function syncMainEmployeesDrawerMetrics() {
    const shell = elements.employeesFrameShell;
    if (!(shell instanceof HTMLElement) || !mainEmployeesDrawerOpen) {
      return;
    }

    const width = Math.min(350, Math.max(0, Math.round(window.innerWidth)));
    shell.style.setProperty("--employee-drawer-right", "0px");
    shell.style.setProperty("--employee-drawer-width", `${width}px`);
  }

  function getMainEmployeesDrawerPortalSrc(accountId) {
    const url = new URL(employeesDocumentSrc, window.location.origin);
    url.searchParams.set("main_employees_drawer", "1");
    url.searchParams.set("employee_id", String(accountId || "").trim());
    return `${url.pathname}${url.search}${url.hash}`;
  }

  function refreshMainEmployeesWorkspace() {
    const frameWindow = elements.employeesFrame instanceof HTMLIFrameElement
      ? elements.employeesFrame.contentWindow
      : null;
    frameWindow?.postMessage(
      { type: "gms-main-employees-refresh" },
      window.location.origin,
    );
  }

  function setMainEmployeesDrawerPortalMode(mode) {
    const portal = elements.employeesDrawerPortal;
    if (!(portal instanceof HTMLElement) || portal.hidden) {
      return;
    }
    const registerMode = mode === "register";
    mainEmployeesRegisterModalOpen = registerMode;
    mainEmployeesDrawerOpen = !registerMode;
    portal.classList.add("is-drawer-ready");
    portal.classList.toggle("is-register-mode", registerMode);
    if (!registerMode) {
      refreshMainEmployeesWorkspace();
    }
    const frame = elements.employeesDrawerPortalFrame;
    if (frame instanceof HTMLIFrameElement) {
      frame.title = registerMode ? "Edit employee" : "Employee details";
    }
  }

  function openMainEmployeesDrawerPortal(accountId) {
    const id = String(accountId || "").trim();
    const portal = elements.employeesDrawerPortal;
    const frame = elements.employeesDrawerPortalFrame;
    if (!id || !(portal instanceof HTMLElement) || !(frame instanceof HTMLIFrameElement)) {
      return;
    }

    window.clearTimeout(mainEmployeesDrawerPortalCloseTimer);
    mainEmployeesDrawerPortalCloseTimer = 0;
    mainEmployeesRegisterModalOpen = false;
    mainEmployeesDrawerOpen = true;
    portal.classList.remove("is-register-mode", "is-drawer-ready", "is-open");
    portal.hidden = false;
    document.documentElement.classList.add("main-employees-drawer-portal-open");
    elements.body?.classList.add("main-employees-drawer-portal-open");
    const nextSrc = getMainEmployeesDrawerPortalSrc(id);
    if (frame.getAttribute("src") !== nextSrc) {
      frame.src = nextSrc;
    }
    window.requestAnimationFrame(() => portal.classList.add("is-open"));
  }

  function closeMainEmployeesDrawerPortal(options = {}) {
    const portal = elements.employeesDrawerPortal;
    const frame = elements.employeesDrawerPortalFrame;
    if (!(portal instanceof HTMLElement)) {
      return;
    }
    window.clearTimeout(mainEmployeesDrawerPortalCloseTimer);
    mainEmployeesDrawerPortalCloseTimer = 0;
    mainEmployeesRegisterModalOpen = false;
    mainEmployeesDrawerOpen = false;
    refreshMainEmployeesWorkspace();
    portal.classList.remove("is-open", "is-register-mode", "is-drawer-ready");
    document.documentElement.classList.remove("main-employees-drawer-portal-open");
    elements.body?.classList.remove("main-employees-drawer-portal-open");

    const finish = () => {
      portal.hidden = true;
      if (frame instanceof HTMLIFrameElement) {
        frame.removeAttribute("src");
        frame.title = "Employee details";
      }
    };
    if (options.immediate === true) {
      finish();
      return;
    }
    mainEmployeesDrawerPortalCloseTimer = window.setTimeout(() => {
      mainEmployeesDrawerPortalCloseTimer = 0;
      finish();
    }, 190);
  }

  function setMainEmployeesLayer(kind) {
    const registerOpen = kind === "register";
    const drawerOpen = kind === "drawer";
    mainEmployeesRegisterModalOpen = registerOpen;
    mainEmployeesDrawerOpen = drawerOpen;

    document.documentElement.classList.toggle(
      "main-employees-register-modal-open",
      registerOpen,
    );
    elements.body?.classList.toggle("main-employees-register-modal-open", registerOpen);
    document.documentElement.classList.toggle("main-employees-drawer-open", drawerOpen);
    elements.body?.classList.toggle("main-employees-drawer-open", drawerOpen);
    elements.employeesFrameShell?.classList.toggle(
      "is-employee-register-modal-open",
      registerOpen,
    );
    elements.employeesFrameShell?.classList.toggle("is-employee-drawer-open", drawerOpen);

    if (elements.employeesFrame instanceof HTMLIFrameElement) {
      if (registerOpen) {
        elements.employeesFrame.title = "Employee register";
      } else if (drawerOpen) {
        elements.employeesFrame.title = "Employee details";
      } else {
        elements.employeesFrame.title = "Employee management workspace";
      }
    }

    if (drawerOpen) {
      syncMainEmployeesDrawerMetrics();
      window.requestAnimationFrame(syncMainEmployeesDrawerMetrics);
    } else {
      clearMainEmployeesDrawerMetrics();
    }

    if (!registerOpen && !drawerOpen) {
      queueMainEmbeddedFrameHeightSync("employees", 80);
    }
  }

  function requestMainEmployeesRegisterModalClose() {
    if (!mainEmployeesRegisterModalOpen) {
      return;
    }

    const portalFrame = elements.employeesDrawerPortalFrame;
    const portalIsRegister = elements.employeesDrawerPortal instanceof HTMLElement
      && !elements.employeesDrawerPortal.hidden
      && elements.employeesDrawerPortal.classList.contains("is-register-mode");
    const frameWindow = portalIsRegister && portalFrame instanceof HTMLIFrameElement
      ? portalFrame.contentWindow
      : elements.employeesFrame instanceof HTMLIFrameElement
        ? elements.employeesFrame.contentWindow
        : null;
    if (!frameWindow) {
      setMainEmployeesLayer(null);
      return;
    }

    frameWindow.postMessage(
      { type: "gms-main-employees-modal-close" },
      window.location.origin,
    );
  }

  function requestMainEmployeesDrawerClose() {
    if (!mainEmployeesDrawerOpen) {
      return;
    }

    const portalFrame = elements.employeesDrawerPortalFrame;
    const portalOpen = elements.employeesDrawerPortal instanceof HTMLElement
      && !elements.employeesDrawerPortal.hidden;
    const frameWindow = portalOpen && portalFrame instanceof HTMLIFrameElement
      ? portalFrame.contentWindow
      : elements.employeesFrame instanceof HTMLIFrameElement
        ? elements.employeesFrame.contentWindow
        : null;
    if (!frameWindow) {
      if (portalOpen) {
        closeMainEmployeesDrawerPortal();
      } else {
        setMainEmployeesLayer(null);
      }
      return;
    }

    frameWindow.postMessage(
      { type: "gms-main-employees-drawer-close" },
      window.location.origin,
    );
  }

  function showEmployeesFrameError() {
    window.clearTimeout(employeesLoadFailureTimer);
    setMainEmployeesLayer(null);
    disconnectMainEmbeddedFrameHeightSync("employees");
    disconnectMainSectionCountSync("employees");
    if (elements.employeesLoading) {
      elements.employeesLoading.hidden = true;
    }
    if (elements.employeesError) {
      elements.employeesError.hidden = false;
    }
    if (elements.employeesAdd instanceof HTMLButtonElement) {
      elements.employeesAdd.disabled = true;
    }
    elements.employeesFrame?.classList.remove("is-ready");
    finishMainInitialLoading("employees");
  }

  async function handleEmployeesFrameLoad() {
    const frame = elements.employeesFrame;
    if (!(frame instanceof HTMLIFrameElement)) {
      return;
    }

    setMainEmployeesLayer(null);
    try {
      const frameDocument = frame.contentDocument;
      const frameWindow = frame.contentWindow;
      if (!frameDocument || !frameWindow || frameWindow.location.href === "about:blank") {
        return;
      }
      frameDocument.documentElement.classList.add("main-employees-embedded");
      frameDocument.body?.classList.add("main-employees-embedded");
      await installMainOwnedStylesheet(frameDocument);
      installMainSectionCountSync("employees", frameDocument);
      installMainEmbeddedFrameHeightSync("employees", frameDocument);
      window.clearTimeout(employeesLoadFailureTimer);
      if (elements.employeesLoading) {
        elements.employeesLoading.hidden = true;
      }
      if (elements.employeesError) {
        elements.employeesError.hidden = true;
      }
      if (elements.employeesAdd instanceof HTMLButtonElement) {
        elements.employeesAdd.disabled = false;
      }
      frame.classList.add("is-ready");
      syncEmployeesSearch(employeesSearchQuery);
      queueMainEmbeddedFrameHeightSync("employees");
      finishMainInitialLoading("employees");
    } catch (error) {
      showEmployeesFrameError();
    }
  }

  function ensureEmployeesWorkspace(options = {}) {
    const frame = elements.employeesFrame;
    if (!(frame instanceof HTMLIFrameElement)) {
      return;
    }

    const forceReload = options.force === true;
    if (employeesLoadStarted && !forceReload) {
      syncEmployeesSearch(employeesSearchQuery);
      queueMainEmbeddedFrameHeightSync("employees");
      return;
    }

    employeesLoadStarted = true;
    resetMainEmbeddedFrameHeight("employees");
    frame.classList.remove("is-ready");
    if (elements.employeesAdd instanceof HTMLButtonElement) {
      elements.employeesAdd.disabled = true;
    }
    if (elements.employeesLoading) {
      elements.employeesLoading.hidden = false;
    }
    if (elements.employeesError) {
      elements.employeesError.hidden = true;
    }

    window.clearTimeout(employeesLoadFailureTimer);
    employeesLoadFailureTimer = window.setTimeout(showEmployeesFrameError, 15000);
    frame.src = getEmployeesFrameSrc(forceReload);
  }

  function getPackingFrameSrc(forceReload = false) {
    const url = new URL(packingDocumentSrc, window.location.origin);
    if (forceReload) {
      url.searchParams.set("_", String(Date.now()));
    }
    return `${url.pathname}${url.search}${url.hash}`;
  }

  function showPackingFrameError() {
    window.clearTimeout(packingLoadFailureTimer);
    disconnectMainEmbeddedFrameHeightSync("packing");
    if (elements.packingLoading) {
      elements.packingLoading.hidden = true;
    }
    if (elements.packingError) {
      elements.packingError.hidden = false;
    }
    elements.packingFrame?.classList.remove("is-ready");
    finishMainInitialLoading("packing");
  }

  async function handlePackingFrameLoad() {
    const frame = elements.packingFrame;
    if (!(frame instanceof HTMLIFrameElement)) {
      return;
    }

    try {
      const frameDocument = frame.contentDocument;
      const frameWindow = frame.contentWindow;
      if (!frameDocument || !frameWindow || frameWindow.location.href === "about:blank") {
        return;
      }
      frameDocument.body?.classList.add("main-packing-embedded");
      await installMainOwnedStylesheet(frameDocument);
      installMainSectionCountSync("packing", frameDocument);
      installMainEmbeddedFrameHeightSync("packing", frameDocument);
      window.clearTimeout(packingLoadFailureTimer);
      if (elements.packingLoading) {
        elements.packingLoading.hidden = true;
      }
      if (elements.packingError) {
        elements.packingError.hidden = true;
      }
      frame.classList.add("is-ready");
      syncPackingSearch(packingSearchQuery);
      syncPackingStationFilter(packingStationFilter);
      queueMainEmbeddedFrameHeightSync("packing");
      finishMainInitialLoading("packing");
    } catch (error) {
      showPackingFrameError();
    }
  }

  function ensurePackingWorkspace(options = {}) {
    const frame = elements.packingFrame;
    if (!(frame instanceof HTMLIFrameElement)) {
      return;
    }

    const forceReload = options.force === true;
    if (packingLoadStarted && !forceReload) {
      syncPackingSearch(packingSearchQuery);
      syncPackingStationFilter(packingStationFilter);
      queueMainEmbeddedFrameHeightSync("packing");
      return;
    }

    packingLoadStarted = true;
    resetMainEmbeddedFrameHeight("packing");
    frame.classList.remove("is-ready");
    if (elements.packingLoading) {
      elements.packingLoading.hidden = false;
    }
    if (elements.packingError) {
      elements.packingError.hidden = true;
    }

    window.clearTimeout(packingLoadFailureTimer);
    packingLoadFailureTimer = window.setTimeout(showPackingFrameError, 15000);
    frame.src = getPackingFrameSrc(forceReload);
  }

  function setMainView(requestedView, options = {}) {
    const requested = normalizeText(requestedView).toLowerCase();
    if (Object.prototype.hasOwnProperty.call(options, "ordersFilter")) {
      ordersStatusFilter = normalizeOrdersStatusFilter(options.ordersFilter);
    }
    if (Object.prototype.hasOwnProperty.call(options, "inventoryFilter")) {
      inventoryPriorityFilter = normalizeInventoryPriorityFilter(options.inventoryFilter);
    }
    if (Object.prototype.hasOwnProperty.call(options, "listingFilter")) {
      listingStatusFilter = normalizeListingStatusFilter(options.listingFilter);
    }
    if (Object.prototype.hasOwnProperty.call(options, "listingInsightRanking")) {
      listingInsightRankingMode = normalizeListingInsightRankingMode(options.listingInsightRanking);
    }
    if (Object.prototype.hasOwnProperty.call(options, "packingStation")) {
      packingStationFilter = normalizePackingStationFilter(options.packingStation);
    }
    let nextView = "dashboard";
    if (requested === "live-chat" && canAccessLiveChat()) {
      nextView = "live-chat";
    } else if (requested === "orders" && canAccessOrders()) {
      nextView = "orders";
    } else if (requested === "listing-insight" && canAccessListingInsight()) {
      nextView = "listing-insight";
    } else if (requested === "listing" && canAccessProductListing()) {
      nextView = "listing";
    } else if (requested === "inventory" && canAccessInventory()) {
      nextView = "inventory";
    } else if (requested === "employees" && canAccessEmployees()) {
      nextView = "employees";
    } else if (requested === "packing" && canAccessPacking()) {
      nextView = "packing";
    } else if (requested === "vouchers" && canAccessVouchers()) {
      nextView = "vouchers";
    }
    syncMainFilterBreadcrumbs();
    const viewExpandedNavKey = getMainNavExpandedViewKey(nextView);
    const dashboardSubNavKey = nextView === "dashboard" && expandedMainNavKey === "dashboard" ? "dashboard" : "";
    const expandableNavKey = (
      (viewExpandedNavKey && expandedMainNavKey === viewExpandedNavKey)
      || dashboardSubNavKey
    )
      ? dashboardSubNavKey || viewExpandedNavKey
      : "";
    if (!expandableNavKey && expandedMainNavKey && options.preserveSidebarOpen !== true) {
      setExpandedMainNavKey("", { persist: false });
    }
    activeMainView = nextView;

    elements.body.dataset.mainView = nextView;
    elements.body.classList.toggle("main-dashboard-active", nextView === "dashboard");
    elements.body.classList.toggle("main-live-chat-active", nextView === "live-chat");
    elements.body.classList.toggle("main-orders-active", nextView === "orders");
    elements.body.classList.toggle("main-listing-insight-active", nextView === "listing-insight");
    elements.body.classList.toggle("main-listing-active", nextView === "listing");
    elements.body.classList.toggle("main-inventory-active", nextView === "inventory");
    elements.body.classList.toggle("main-employees-active", nextView === "employees");
    elements.body.classList.toggle("main-packing-active", nextView === "packing");
    elements.body.classList.toggle("main-vouchers-active", nextView === "vouchers");
    if (expandableNavKey && window.matchMedia("(min-width: 861px)").matches) {
      setSidebarOpen(true);
    }
    if (nextView !== "listing") {
      setProductListingComposerPortalOpen(false, { force: true });
    }
    if (nextView !== "orders" && mainOrdersDetailModalOpen) {
      requestMainOrdersDetailModalClose();
      setMainOrdersDetailModalOpen(false);
    }
    if (nextView !== "listing-insight" && mainListingInsightDetailModalOpen) {
      requestMainListingInsightDetailModalClose();
      setMainListingInsightDetailModalOpen(false);
    }
    if (nextView !== "inventory" && (
      mainInventoryStockRecordModalOpen
      || elements.inventoryFrameShell?.classList.contains("is-stock-record-modal-open")
    )) {
      requestMainInventoryStockRecordModalClose();
      setMainInventoryStockRecordModalOpen(false, { immediate: true });
    }
    if (nextView !== "inventory" && mainInventoryStockEditModalOpen) {
      requestMainInventoryStockEditModalClose();
      setMainInventoryStockEditModalOpen(false);
    }
    if (nextView !== "employees") {
      if (mainEmployeesRegisterModalOpen) {
        requestMainEmployeesRegisterModalClose();
      }
      if (mainEmployeesDrawerOpen) {
        requestMainEmployeesDrawerClose();
      }
      setMainEmployeesLayer(null);
      closeMainEmployeesDrawerPortal({ immediate: true });
    }
    if (elements.dashboardView) {
      elements.dashboardView.hidden = nextView !== "dashboard";
    }
    if (elements.liveChatView) {
      elements.liveChatView.hidden = nextView !== "live-chat";
    }
    if (elements.ordersView) {
      elements.ordersView.hidden = nextView !== "orders";
    }
    if (elements.listingInsightView) {
      elements.listingInsightView.hidden = nextView !== "listing-insight";
    }
    if (elements.listingView) {
      elements.listingView.hidden = nextView !== "listing";
    }
    if (elements.inventoryView) {
      elements.inventoryView.hidden = nextView !== "inventory";
    }
    if (elements.employeesView) {
      elements.employeesView.hidden = nextView !== "employees";
    }
    if (elements.packingView) {
      elements.packingView.hidden = nextView !== "packing";
    }
    if (elements.vouchersView) {
      elements.vouchersView.hidden = nextView !== "vouchers";
    }
    elements.content?.classList.toggle("main-content--live-chat", nextView === "live-chat");
    elements.content?.classList.toggle("main-content--orders", nextView === "orders");
    elements.content?.classList.toggle("main-content--listing-insight", nextView === "listing-insight");
    elements.content?.classList.toggle("main-content--listing", nextView === "listing");
    elements.content?.classList.toggle("main-content--inventory", nextView === "inventory");
    elements.content?.classList.toggle("main-content--employees", nextView === "employees");
    elements.content?.classList.toggle("main-content--packing", nextView === "packing");
    elements.content?.classList.toggle("main-content--vouchers", nextView === "vouchers");
    if (elements.filter) {
      elements.filter.hidden = nextView !== "dashboard";
    }
    if (elements.ordersHeaderFilter) {
      elements.ordersHeaderFilter.hidden = nextView !== "orders";
    }
    if (nextView === "orders") {
      syncOrdersHeaderFilterUi();
    } else {
      setOrdersHeaderFilterOpen(false);
    }
    if (elements.listingInsightHeaderFilter) {
      elements.listingInsightHeaderFilter.hidden = nextView !== "listing-insight";
    }
    if (nextView === "listing-insight") {
      syncListingInsightHeaderFilterUi();
    } else {
      setListingInsightHeaderFilterOpen(false);
    }

    if (elements.search instanceof HTMLInputElement) {
      elements.search.value = nextView === "live-chat"
        ? liveChatSearchQuery
        : nextView === "orders"
          ? ordersSearchQuery
        : nextView === "listing-insight"
          ? listingInsightSearchQuery
        : nextView === "listing"
          ? productListingSearchQuery
          : nextView === "inventory"
            ? inventorySearchQuery
            : nextView === "employees"
              ? employeesSearchQuery
              : nextView === "packing"
                ? packingSearchQuery
                : nextView === "vouchers"
                  ? dashboardSearchQuery
                : dashboardSearchQuery;
      elements.search.placeholder = nextView === "live-chat"
        ? "Search conversations..."
        : nextView === "orders"
          ? "Search orders, customers, products..."
        : nextView === "listing-insight"
          ? "Search listing insight..."
        : nextView === "listing"
          ? "Search product listing..."
          : nextView === "inventory"
            ? "Search inventory..."
            : nextView === "employees"
              ? "Search employees..."
              : nextView === "packing"
                ? "Search dispatching orders..."
                : authState.role === "seller"
                  ? "Search Seller Workspace"
                  : "Search Employee Workspace";
    }

    const identity = getIdentity();
    document.title = `${identity.name} - ${getMainViewTitle(nextView)}`;
    if (options.preserveNavDom === true) {
      syncMainNavSelection();
    } else {
      renderNav();
    }
    if (options.focusNavKey) {
      focusMainNavButton(options.focusNavKey);
    }

    if (nextView === "live-chat") {
      void ensureLiveChatWorkspace().then(() => {
        liveChatStartTypingPoll();
        finishMainInitialLoading("live-chat");
      }).catch(() => {
        finishMainInitialLoading("live-chat");
      });
    } else {
      liveChatStopTypingPoll();
      liveChatStopSupportTyping({ force: true });
      if (nextView === "orders") {
        ensureOrdersWorkspace();
      } else if (nextView === "listing-insight") {
        ensureListingInsightWorkspace();
        syncListingInsightRankingMode(listingInsightRankingMode);
      } else if (nextView === "listing") {
        ensureProductListingWorkspace();
        syncListingStatusFilter(listingStatusFilter);
        if (document.getElementById("product-list")) {
          finishMainInitialLoading("listing");
        }
      } else if (nextView === "inventory") {
        ensureInventoryWorkspace();
      } else if (nextView === "employees") {
        ensureEmployeesWorkspace();
      } else if (nextView === "packing") {
        ensurePackingWorkspace();
        syncPackingStationFilter(packingStationFilter);
      } else if (nextView === "vouchers") {
        if (window.SellerAdminVouchers?.load) {
          void window.SellerAdminVouchers.load();
        }
        finishMainInitialLoading("vouchers");
      } else {
        filterWorkspace(dashboardSearchQuery);
        finishMainInitialLoading("dashboard");
      }
    }

    if (options.updateHistory) {
      const url = new URL(window.location.href);
      url.hash = nextView === "dashboard"
        ? ""
        : nextView === "orders" && ordersStatusFilter !== "all"
          ? `orders/${ordersStatusFilter}`
          : nextView === "listing-insight"
          ? `listing-insight/${listingInsightRankingMode}`
          : nextView === "packing" && packingStationFilter !== "packing-station"
            ? `dispatching/${packingStationFilter}`
            : nextView === "packing"
              ? "dispatching"
              : nextView;
      window.history.pushState({ mainView: nextView }, "", `${url.pathname}${url.search}${url.hash}`);
    }

    if (
      window.matchMedia("(max-width: 860px)").matches
      && options.preserveSidebarOpen !== true
      && !(expandableNavKey && expandedMainNavKey === expandableNavKey)
    ) {
      setSidebarOpen(false);
    }
  }

  function clearSessions() {
    try {
      window.sessionStorage.removeItem(adminSessionKey);
      window.sessionStorage.removeItem(employeeSessionKey);
      window.sessionStorage.removeItem(superAdminSessionKey);
      window.sessionStorage.removeItem("gms-face-verification-context");
      window.sessionStorage.removeItem("gms-face-verification-result");
      window.sessionStorage.removeItem("gms-switch-pin-unlock");
      window.localStorage.removeItem(adminScopeStorageKey);
    } catch (error) {
      console.warn("Unable to clear sessions.", error);
    }
  }

  function updateSellerPresence(isOnline, options = {}) {
    if (authState.role !== "seller") {
      return;
    }

    const session = authState.session || {};
    const payload = JSON.stringify({
      adminId: getSessionAdminId(session),
      id: session.id,
      accountCode: session.accountCode,
      email: session.email,
      isOnline: isOnline === true,
      presenceEvent: options.presenceEvent || (isOnline === true ? "heartbeat" : "logout"),
    });

    try {
      if (options.preferBeacon !== false && navigator.sendBeacon) {
        const body = new Blob([payload], { type: "application/json" });
        if (navigator.sendBeacon("/api/admin-presence", body)) {
          return;
        }
      }
    } catch (error) {
      console.warn("Unable to send seller presence beacon.", error);
    }

    try {
      void fetch("/api/admin-presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    } catch (error) {
      console.warn("Unable to update seller presence.", error);
    }
  }

  function stopSellerPresenceHeartbeat() {
    window.clearInterval(sellerPresenceHeartbeatTimer);
    sellerPresenceHeartbeatTimer = 0;
    window.clearInterval(window.__sellerDeviceSessionTimer);
    window.__sellerDeviceSessionTimer = 0;
  }

  function sendSellerPresenceHeartbeat() {
    if (authState.role !== "seller" || navigator.onLine === false) {
      return;
    }
    updateSellerPresence(true, {
      preferBeacon: false,
      presenceEvent: "heartbeat",
    });
  }

  function startSellerPresenceHeartbeat() {
    stopSellerPresenceHeartbeat();
    if (authState.role !== "seller" || navigator.onLine === false) {
      return;
    }
    sendSellerPresenceHeartbeat();
    sellerPresenceHeartbeatTimer = window.setInterval(
      sendSellerPresenceHeartbeat,
      sellerPresenceHeartbeatIntervalMs,
    );
    startSellerDeviceSessionWatch();
  }

  function getSellerDeviceKey() {
    const storageKey = "gms_account_device_key";
    try {
      const existing = String(window.localStorage.getItem(storageKey) || "").trim();
      if (existing) return existing;
      const generated = `web_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      window.localStorage.setItem(storageKey, generated);
      return generated;
    } catch (error) {
      return "";
    }
  }

  function forgetRememberedSellerOnThisDevice(session = {}) {
    try {
      const rememberedKey = "gms-remembered-seller-accounts";
      const email = String(session.email || session.adminEmail || "").trim().toLowerCase();
      const adminId = String(
        session.adminId || session.id || session.accountCode || "",
      ).trim().toLowerCase();
      const raw = window.localStorage.getItem(rememberedKey);
      const parsed = raw ? JSON.parse(raw) : [];
      const existing = Array.isArray(parsed) ? parsed : [];
      const next = existing.filter((entry) => {
        if (!entry || typeof entry !== "object") return false;
        const entryId = String(entry.adminId || entry.id || "").trim().toLowerCase();
        const entryEmail = String(entry.email || "").trim().toLowerCase();
        if (adminId && entryId && entryId === adminId) return false;
        if (email && entryEmail && entryEmail === email) return false;
        return true;
      });
      window.localStorage.setItem(rememberedKey, JSON.stringify(next));
    } catch (error) {
      console.warn("Unable to forget remembered seller account.", error);
    }
  }

  function signOutForgottenDevice() {
    const session = authState.session || {};
    forgetRememberedSellerOnThisDevice(session);
    markSellerOffline();
    clearSessions();
    const loginPath = authState.role === "employee" ? "/login.html?role=employee" : "/login.html?role=admin";
    window.location.replace(loginPath);
  }

  async function enforceSellerDeviceSignOut() {
    if (authState.role !== "seller" || !authState.session) return;
    const session = authState.session || {};
    const accountId = String(
      getSessionAdminId(session) || session.id || session.accountId || "",
    ).trim();
    const email = String(session.email || session.adminEmail || "").trim();
    const deviceKey = getSellerDeviceKey();
    if (!deviceKey || (!accountId && !email)) return;
    const checks = [{ accountId, email }];
    try {
      const buyerRaw = window.localStorage.getItem("gms-buyer-session");
      const buyerSession = buyerRaw ? JSON.parse(buyerRaw) : null;
      const buyerId = String(buyerSession?.accountId || buyerSession?.id || "").trim();
      if (buyerId && buyerId !== accountId) {
        checks.push({
          accountId: buyerId,
          email: String(buyerSession.email || email).trim(),
        });
      }
    } catch (error) {}
    try {
      let sellerKnown = false;
      for (const check of checks) {
        const params = new URLSearchParams({ deviceKey });
        if (check.accountId) params.set("accountId", check.accountId);
        if (check.email) params.set("email", check.email);
        const response = await fetch(`/api/account/devices/status?${params.toString()}`, {
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) continue;
        if (payload.known && payload.active === false) {
          signOutForgottenDevice();
          return;
        }
        if (check.accountId === accountId && payload.known) {
          sellerKnown = true;
        }
      }
      if (sellerKnown) return;
      const registerResponse = await fetch("/api/account/devices/register", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          accountId,
          email,
          deviceKey,
          userAgent: navigator.userAgent || "",
          clientKind: "browser",
          locationLabel: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
        }),
      });
      const registerPayload = await registerResponse.json().catch(() => ({}));
      if (registerResponse.status === 401 && registerPayload.code === "device_revoked") {
        signOutForgottenDevice();
      }
    } catch (error) {
      console.warn("Unable to check seller device session.", error);
    }
  }

  function startSellerDeviceSessionWatch() {
    window.clearInterval(window.__sellerDeviceSessionTimer);
    void enforceSellerDeviceSignOut();
    window.__sellerDeviceSessionTimer = window.setInterval(() => {
      void enforceSellerDeviceSignOut();
    }, 5000);
  }

  function markSellerOffline() {
    stopSellerPresenceHeartbeat();
    updateSellerPresence(false, {
      preferBeacon: true,
      presenceEvent: "logout",
    });
  }

  function signOut() {
    const loginPath = authState.role === "employee" ? "/login.html?role=employee" : "/login.html?role=admin";
    if (authState.role === "seller" && authState.session) {
      try {
        const rememberedKey = "gms-remembered-seller-accounts";
        const session = authState.session || {};
        const email = String(session.email || session.adminEmail || "").trim().toLowerCase();
        const adminId = String(
          session.adminId || session.id || session.accountCode || "",
        ).trim();
        if (email || adminId) {
          const displayName = [
            session.companyName,
            session.storeName,
            session.businessName,
            session.sellerName,
            session.displayName,
            session.name,
            [session.firstName, session.lastName].filter(Boolean).join(" "),
            email,
          ]
            .map((value) => String(value ?? "").replace(/\s+/g, " ").trim())
            .find(Boolean) || "Seller";
          const profileImageUrl = session.businessLogoSkipped === true
            ? ""
            : [
                session.companyPictureUrl,
                session.companyProfileImageUrl,
                session.businessLogoUrl,
                session.profileImageUrl,
                session.avatarUrl,
                session.photoUrl,
                session.logoUrl,
              ]
                .map((value) => String(value ?? "").trim())
                .find(Boolean) || "";
          const nextEntry = {
            adminId,
            email,
            displayName,
            companyName: displayName,
            businessLogoSkipped: session.businessLogoSkipped === true,
            companyPictureUrl: profileImageUrl,
            profileImageUrl,
            lastUsedAt: new Date().toISOString(),
          };
          const raw = window.localStorage.getItem(rememberedKey);
          const parsed = raw ? JSON.parse(raw) : [];
          const existing = Array.isArray(parsed) ? parsed : [];
          const filtered = existing.filter((entry) => {
            if (!entry || typeof entry !== "object") {
              return false;
            }
            const entryAdminId = String(entry.adminId || "").trim();
            const entryEmail = String(entry.email || "").trim().toLowerCase();
            if (adminId && entryAdminId && entryAdminId === adminId) {
              return false;
            }
            if (email && entryEmail && entryEmail === email) {
              return false;
            }
            return Boolean(entryAdminId || entryEmail);
          });
          window.localStorage.setItem(
            rememberedKey,
            JSON.stringify([nextEntry, ...filtered].slice(0, 8)),
          );
        }
      } catch (error) {
        console.warn("Unable to remember seller account on sign out.", error);
      }
    }
    markSellerOffline();
    clearSessions();
    window.location.replace(loginPath);
  }

  async function refreshSellerProfile() {
    if (authState.role !== "seller") {
      return;
    }

    const adminId = getSessionAdminId(authState.session);
    try {
      const response = await fetch("/api/admin-account", {
        cache: "no-store",
        headers: {
          Accept: "application/json",
          ...(adminId ? { "X-GMS-Admin-ID": adminId } : {}),
        },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.admin || typeof data.admin !== "object") {
        return;
      }
      authState = {
        ...authState,
        session: {
          ...authState.session,
          ...data.admin,
          role: "admin",
          dashboardPath: getDashboardPath(),
        },
      };
      writeJsonSession(adminSessionKey, authState.session);
      renderIdentity();
      renderSummary();
    } catch (error) {
      console.warn("Unable to refresh seller profile.", error);
    }
  }

  function isMainLiveChatInteractionBusy() {
    return Boolean(
      liveChatRedesignState.isLoading
      || liveChatRedesignState.isSending
      || liveChatRedesignState.isEditing
      || liveChatRedesignState.isAiReplying,
    );
  }

  async function refreshMainLiveChatWorkspaceFromRealtime() {
    const mount = elements.liveChatMount;
    if (!(mount instanceof HTMLElement) || mount.dataset.mainLiveChatReady !== "true") {
      return true;
    }
    if (isMainLiveChatInteractionBusy()) {
      return false;
    }
    if (liveChatTypingPollInFlight) {
      mainRealtimeChatPending = true;
      return false;
    }

    const activeBefore = liveChatGetActive();
    const previousScroll = liveChatCaptureMessageScroll(activeBefore?.id);
    const previousMessageCount = Array.isArray(activeBefore?.messages) ? activeBefore.messages.length : 0;
    const previousConversations = liveChatRedesignConversations.slice();
    const previousSignature = liveChatBoardSyncSignature(previousConversations);
    const previousAiStatusSignature = liveChatAiAssistantStatusSignature();
    const composerState = liveChatCaptureComposerState();

    try {
      await liveChatLoadRemoteData();
    } catch (error) {
      console.warn("Unable to refresh Live Chat in the background.", error);
      return true;
    }

    if (isMainLiveChatInteractionBusy()) {
      return false;
    }
    if (!liveChatRedesignConversations.some((item) => item.id === liveChatRedesignState.activeId)) {
      liveChatSetActiveId(liveChatRedesignConversations[0]?.id || "");
    }
    const nextConversations = liveChatRedesignConversations.slice();
    const aiStatusChanged = previousAiStatusSignature !== liveChatAiAssistantStatusSignature();
    if (
      previousSignature === liveChatBoardSyncSignature(nextConversations)
      && !aiStatusChanged
    ) {
      return true;
    }
    if (!aiStatusChanged && liveChatTryApplySoftPollUpdate(previousConversations, nextConversations)) {
      return true;
    }
    const activeAfter = liveChatGetActive();
    const nextMessageCount = Array.isArray(activeAfter?.messages) ? activeAfter.messages.length : 0;
    if (
      activeBefore
      && activeAfter
      && activeBefore.id === activeAfter.id
      && nextMessageCount > previousMessageCount
      && liveChatRedesignState.messageScrollPinned
      && (!previousScroll || previousScroll.wasNearBottom)
    ) {
      liveChatRedesignState.forceMessageScrollBottom = true;
    }
    liveChatRenderBoard({
      preserveComposer: composerState,
      preserveReactionPicker: Boolean(liveChatRedesignState.reactionPicker),
    });
    return true;
  }

  function scheduleMainRealtimeRefresh(delay = 180) {
    const effectiveDelay = mainRealtimeChatPending ? Math.min(delay, 80) : delay;
    window.clearTimeout(mainRealtimeRefreshTimer);
    mainRealtimeRefreshTimer = window.setTimeout(async () => {
      mainRealtimeRefreshTimer = 0;
      if (mainRealtimeRefreshInFlight) {
        scheduleMainRealtimeRefresh(120);
        return;
      }

      const refreshChat = mainRealtimeChatPending;
      const refreshProfile = mainRealtimeProfilePending;
      const refreshTheme = mainRealtimeThemePending;
      mainRealtimeChatPending = false;
      mainRealtimeProfilePending = false;
      mainRealtimeThemePending = false;
      if (!refreshChat && !refreshProfile && !refreshTheme) {
        return;
      }

      mainRealtimeRefreshInFlight = true;
      try {
        const refreshTasks = [];
        if (refreshChat) {
          refreshTasks.push(refreshLiveChatNavBadge());
        }
        if (refreshProfile) {
          refreshTasks.push(refreshSellerProfile());
        }
        if (refreshTheme && typeof window.WebTheme?.syncWorkspaceColor === "function") {
          refreshTasks.push(window.WebTheme.syncWorkspaceColor({ force: true }));
        }
        await Promise.allSettled(refreshTasks);
        if (refreshChat && !(await refreshMainLiveChatWorkspaceFromRealtime())) {
          mainRealtimeChatPending = true;
        }
      } finally {
        mainRealtimeRefreshInFlight = false;
        if (mainRealtimeChatPending || mainRealtimeProfilePending || mainRealtimeThemePending) {
          scheduleMainRealtimeRefresh(mainRealtimeChatPending ? 120 : 120);
        }
      }
    }, effectiveDelay);
  }

  const mainNotificationSeenStorageKey = "gms-main-notification-seen";
  const mainNotificationPreviewLimit = 4;
  let mainNotifications = [];
  let mainNotificationFilter = "all";
  let mainNotificationExpanded = false;
  let mainNotificationReadIds = new Set();
  let mainNotificationBadgeSeenAt = "";

  function readMainNotificationSeenState() {
    try {
      const stored = JSON.parse(window.localStorage.getItem(mainNotificationSeenStorageKey) || "{}");
      return stored && typeof stored === "object" ? stored : {};
    } catch (error) {
      return {};
    }
  }

  function writeMainNotificationSeenState(state) {
    try {
      window.localStorage.setItem(mainNotificationSeenStorageKey, JSON.stringify(state));
    } catch (error) {
      // Notification read state remains in memory when storage is blocked.
    }
  }

  function getMainNotificationActivityId(activity) {
    return String(activity?.id ?? activity?.createdAt ?? "").trim();
  }

  function isMainNotificationChatActivity(activity) {
    const haystack = [
      activity?.type,
      activity?.title,
      activity?.description,
      activity?.action,
      activity?.targetPermission,
      activity?.targetUrl,
      activity?.source,
    ]
      .map((value) => String(value ?? "").toLowerCase())
      .join(" ");
    return /\b(?:live[-\s]?chat|chat-support|chat)\b/.test(haystack);
  }

  function isMainNotificationUnread(activity) {
    const activityId = getMainNotificationActivityId(activity);
    return !(activityId && mainNotificationReadIds.has(activityId));
  }

  function isMainNotificationBadgeUnread(activity) {
    if (!isMainNotificationUnread(activity)) {
      return false;
    }
    const createdAt = Date.parse(activity?.createdAt);
    const seenAt = Date.parse(mainNotificationBadgeSeenAt);
    if (Number.isFinite(createdAt) && Number.isFinite(seenAt)) {
      return createdAt > seenAt;
    }
    return true;
  }

  function formatMainNotificationTime(value) {
    const timestamp = new Date(value).getTime();
    if (!Number.isFinite(timestamp)) {
      return "Just now";
    }
    const diffSeconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
    if (diffSeconds < 10) {
      return "Just now";
    }
    if (diffSeconds < 60) {
      return `${diffSeconds} seconds ago`;
    }
    const diffMinutes = Math.round(diffSeconds / 60);
    if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
    }
    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) {
      return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
    }
    const diffDays = Math.round(diffHours / 24);
    return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  }

  function getMainNotificationInitials(activity) {
    const source = firstText([
      activity?.actor?.displayName,
      activity?.actorName,
      activity?.description,
    ], "NT");
    return getInitials(source, "NT");
  }

  function getMainNotificationTargetUrl(activity) {
    return String(activity?.targetUrl ?? activity?.actionUrl ?? activity?.href ?? "").trim();
  }

  function resolveMainNotificationNavigation(targetUrl, activity) {
    if (!targetUrl && !activity) {
      return null;
    }
    const type = String(activity?.type ?? "").trim().toLowerCase();
    const action = String(activity?.action ?? "").trim().toLowerCase();
    const title = String(activity?.title ?? "").trim().toLowerCase();
    const isRevisionNotification =
      type === "product-revision"
      || action === "revision-requested"
      || title.includes("revision");
    const isListingNotification = [
      "product-approved",
      "product-rejected",
      "product-unrejected",
      "listing-restriction",
      "product-revision",
    ].includes(type) || ["approved", "rejected", "unrejected"].includes(action);
    const isAccountNotification = [
      "seller-ban",
      "seller-unban",
      "seller-deactivate",
      "seller-unrestrict",
      "seller-restriction",
      "restriction",
      "warning",
      "notice",
      "seller-notification",
      "seller-account-deletion",
      "seller-account-deletion-canceled",
    ].includes(type);
    try {
      const url = targetUrl ? new URL(targetUrl, window.location.origin) : null;
      if (url && url.origin !== window.location.origin) {
        return { href: targetUrl };
      }
      const path = String(url?.pathname ?? "").toLowerCase();
      const hash = String(url?.hash ?? "").replace(/^#/, "").toLowerCase();
      const isAccountDeletionNotification =
        type === "seller-account-deletion"
        || type === "seller-account-deletion-canceled"
        || hash === "account-settings";
      const productId = firstText([
        activity?.productId,
        url?.searchParams.get("product"),
        url?.searchParams.get("edit"),
        url?.searchParams.get("focusProduct"),
      ]);
      if (path.includes("stock")) {
        return { view: "inventory" };
      }
      if (path.includes("listing_insight") || path.includes("product_insight")) {
        return { view: "listing-insight" };
      }
      if (
        isRevisionNotification
        || isListingNotification
        || path.includes("product_panel")
        || path.includes("edit_products")
        || path.includes("add_products")
      ) {
        return {
          view: "listing",
          listingFilter: isRevisionNotification
            ? "revision"
            : type === "product-unrejected"
              ? "review"
              : listingStatusFilter,
          productId,
        };
      }
      if (isAccountDeletionNotification) {
        return { accountSettings: true };
      }
      if (isAccountNotification || path.includes("admin_dashboard") || path.includes("/main.html")) {
        return { view: "dashboard" };
      }
      if (path.includes("insight") || path.includes("order")) {
        return { view: "orders" };
      }
      if (path.includes("employee")) {
        return { view: "employees" };
      }
      if (path.includes("packing") || path.includes("traking")) {
        return { view: "packing" };
      }
      if (path.includes("live_chat") || path.includes("chat")) {
        return { view: "live-chat" };
      }
      return url ? { href: `${url.pathname}${url.search}${url.hash}` } : null;
    } catch (error) {
      return targetUrl ? { href: targetUrl } : null;
    }
  }

  function syncMainNotificationBadge() {
    if (!(elements.notificationBadge instanceof HTMLElement)) {
      return;
    }
    const unreadCount = mainNotifications.filter((activity) => isMainNotificationBadgeUnread(activity)).length;
    elements.notificationBadge.hidden = unreadCount <= 0;
    elements.notificationBadge.textContent = unreadCount > 99 ? "99+" : String(unreadCount);
  }

  function markMainNotificationBadgeSeen() {
    mainNotificationBadgeSeenAt = new Date().toISOString();
    const stored = readMainNotificationSeenState();
    writeMainNotificationSeenState({
      ...stored,
      badgeSeenAt: mainNotificationBadgeSeenAt,
      readIds: Array.from(mainNotificationReadIds),
    });
    syncMainNotificationBadge();
  }

  function markMainNotificationRead(activity) {
    const activityId = getMainNotificationActivityId(activity);
    if (!activityId) {
      return;
    }
    mainNotificationReadIds.add(activityId);
    const stored = readMainNotificationSeenState();
    writeMainNotificationSeenState({
      ...stored,
      badgeSeenAt: mainNotificationBadgeSeenAt,
      readIds: Array.from(mainNotificationReadIds).slice(-2000),
    });
  }

  function positionMainNotificationPanel() {
    if (!(elements.notificationToggle instanceof HTMLElement) || !(elements.notificationPanel instanceof HTMLElement)) {
      return;
    }
    const buttonRect = elements.notificationToggle.getBoundingClientRect();
    const preferredTop = Math.max(12, Math.ceil(buttonRect.bottom + 8));
    const panelTop = window.innerHeight - preferredTop >= 320 ? preferredTop : 12;
    const panelRight = Math.max(12, Math.ceil(window.innerWidth - buttonRect.right));
    elements.notificationPanel.style.setProperty("--main-notification-panel-top", `${panelTop}px`);
    elements.notificationPanel.style.setProperty("--main-notification-panel-right", `${panelRight}px`);
    const availableHeight = Math.max(240, Math.floor(window.innerHeight - panelTop - 20));
    elements.notificationPanel.style.setProperty("--main-notification-expanded-height", `${availableHeight}px`);
  }

  function renderMainNotifications() {
    if (!(elements.notificationList instanceof HTMLElement)) {
      return;
    }

    const filtered = mainNotificationFilter === "unread"
      ? mainNotifications.filter((activity) => isMainNotificationUnread(activity))
      : mainNotifications.slice();
    const canExpand = filtered.length > mainNotificationPreviewLimit;
    if (!canExpand) {
      mainNotificationExpanded = false;
    }
    const visible = mainNotificationExpanded
      ? filtered
      : filtered.slice(0, mainNotificationPreviewLimit);

    elements.notificationPanel?.classList.toggle("is-expanded", mainNotificationExpanded && canExpand);
    elements.notificationPanel?.classList.toggle(
      "is-scrollable",
      mainNotificationExpanded && filtered.length > mainNotificationPreviewLimit,
    );
    if (elements.notificationFooter instanceof HTMLElement) {
      elements.notificationFooter.hidden = !canExpand;
    }
    if (elements.notificationShowAll instanceof HTMLButtonElement) {
      elements.notificationShowAll.textContent = mainNotificationExpanded
        ? "Show fewer notifications"
        : "Show all notifications";
      elements.notificationShowAll.setAttribute("aria-expanded", String(mainNotificationExpanded));
    }

    elements.notificationList.replaceChildren();
    if (!filtered.length) {
      const empty = document.createElement("div");
      empty.className = "main-notification-empty";
      empty.textContent = mainNotificationFilter === "unread"
        ? "No unread notification."
        : "No notification yet.";
      elements.notificationList.appendChild(empty);
      return;
    }

    visible.forEach((activity) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "main-notification-item";
      const isLinkedSuperAdminNotification =
        String(activity?.type ?? "").trim().toLowerCase() === "product-revision"
        || String(activity?.action ?? "").trim().toLowerCase() === "revision-requested"
        || String(activity?.title ?? "").toLowerCase().includes("revision")
        || [
          "product-approved",
          "product-rejected",
          "product-unrejected",
          "listing-restriction",
          "seller-ban",
          "seller-unban",
          "seller-deactivate",
          "seller-unrestrict",
          "seller-restriction",
          "restriction",
          "warning",
          "notice",
          "seller-account-deletion",
          "seller-account-deletion-canceled",
        ].includes(String(activity?.type ?? "").trim().toLowerCase());
      const targetUrl = getMainNotificationTargetUrl(activity);
      const navigation = resolveMainNotificationNavigation(targetUrl, activity);
      const unread = isMainNotificationUnread(activity);
      item.classList.toggle("is-unread", unread);
      item.classList.toggle("is-clickable", Boolean(targetUrl) || Boolean(navigation?.view));

      const avatar = document.createElement("span");
      avatar.className = "main-notification-item__avatar";
      const imageUrl = firstUrl([
        activity?.actor?.profileImageUrl,
        activity?.actor?.avatarUrl,
        activity?.actorImageUrl,
      ]);
      if (imageUrl) {
        const image = document.createElement("img");
        image.alt = "";
        image.src = imageUrl;
        avatar.appendChild(image);
      } else {
        avatar.textContent = getMainNotificationInitials(activity);
      }

      const copy = document.createElement("div");
      copy.className = "main-notification-item__copy";
      const text = document.createElement("p");
      text.textContent = isLinkedSuperAdminNotification
        ? firstText([
            activity?.title,
            activity?.description,
            activity?.message,
          ], "Super Admin update")
        : firstText([
            activity?.description,
            activity?.message,
            activity?.title,
          ], "A workspace update was recorded.");
      const time = document.createElement("span");
      time.className = "main-notification-item__time";
      time.textContent = formatMainNotificationTime(activity?.createdAt);
      copy.append(text, time);

      const dot = document.createElement("span");
      dot.className = "main-notification-item__dot";
      dot.setAttribute("aria-hidden", "true");

      item.append(avatar, copy, dot);
      item.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        markMainNotificationRead(activity);
        renderMainNotifications();
        syncMainNotificationBadge();
        const navigation = resolveMainNotificationNavigation(targetUrl, activity);
        if (navigation?.accountSettings) {
          setMainNotificationPanelOpen(false);
          window.gmsOpenAdminAccountSettings?.({ tab: "security" });
          return;
        }
        if (navigation?.view) {
          setMainNotificationPanelOpen(false);
          setMainView(navigation.view, {
            updateHistory: true,
            ...(navigation.listingFilter ? { listingFilter: navigation.listingFilter } : {}),
          });
          if (navigation.productId && typeof window.gmsFocusProductListing === "function") {
            window.gmsFocusProductListing({
              productId: navigation.productId,
              statusFilter: navigation.listingFilter,
            });
          }
          return;
        }
        if (navigation?.href) {
          window.location.href = navigation.href;
        }
      });
      elements.notificationList.appendChild(item);
    });
  }

  window.addEventListener("gms:close-notification-dropdowns", () => {
    setMainNotificationPanelOpen(false);
  });

  function setMainNotificationPanelOpen(isOpen) {
    if (!(elements.notificationToggle instanceof HTMLElement) || !(elements.notificationPanel instanceof HTMLElement)) {
      return;
    }
    if (!isOpen) {
      mainNotificationExpanded = false;
      elements.notificationPanel.classList.remove("is-expanded", "is-scrollable");
    }
    elements.notificationToggle.setAttribute("aria-expanded", String(Boolean(isOpen)));
    elements.notificationPanel.hidden = !isOpen;
    if (isOpen) {
      markMainNotificationBadgeSeen();
      renderMainNotifications();
      positionMainNotificationPanel();
      void loadMainNotifications();
    }
  }

  function setMainHeaderProfileMenuOpen(isOpen) {
    const canOpen = authState?.role === "seller"
      && elements.headerProfileToggle instanceof HTMLElement
      && elements.headerProfileDropdown instanceof HTMLElement;
    const shouldOpen = canOpen && isOpen === true;
    elements.headerProfileToggle?.setAttribute("aria-expanded", String(shouldOpen));
    elements.headerProfileToggle?.classList.toggle("is-open", shouldOpen);
    if (elements.headerProfileDropdown instanceof HTMLElement) {
      elements.headerProfileDropdown.hidden = !shouldOpen;
    }
    if (shouldOpen) {
      setMainNotificationPanelOpen(false);
    }
  }

  function setupMainHeaderProfileMenu() {
    elements.headerProfileToggle?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setMainHeaderProfileMenuOpen(Boolean(elements.headerProfileDropdown?.hidden));
    });
    elements.headerProfileDropdown?.addEventListener("click", (event) => {
      event.stopPropagation();
      const actionButton = event.target instanceof Element
        ? event.target.closest("[data-main-header-profile-action]")
        : null;
      const action = normalizeText(actionButton?.dataset.mainHeaderProfileAction).toLowerCase();
      if (!action) {
        return;
      }
      setMainHeaderProfileMenuOpen(false);
      if (action === "account-settings") {
        window.gmsOpenAdminAccountSettings?.();
      } else if (action === "sign-out") {
        signOut();
      }
    });
    document.addEventListener("click", (event) => {
      if (elements.headerProfileMenu?.contains(event.target)) {
        return;
      }
      setMainHeaderProfileMenuOpen(false);
    });
  }

  async function loadMainNotifications() {
    const session = authState?.session;
    const params = new URLSearchParams({
      limit: "200",
      viewerRole: authState?.role === "employee" ? "employee" : "admin",
      viewerAccountId: firstText([
        session?.email,
        session?.adminId,
        session?.employeeId,
        session?.accountCode,
        session?.id,
      ], "admin"),
    });
    const adminId = getSessionAdminId(session);
    if (adminId) {
      params.set("adminId", adminId);
    }
    if (authState?.role === "employee" && Array.isArray(session?.accessPermissions) && session.accessPermissions.length) {
      params.set("accessPermissions", session.accessPermissions.join(","));
    }

    try {
      const response = await fetch(`/api/activity?${params.toString()}`, {
        cache: "no-store",
        headers: {
          Accept: "application/json",
          ...(adminId ? { "x-gms-admin-id": adminId } : {}),
        },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "Unable to load notifications.");
      }
      mainNotifications = Array.isArray(data.activities)
        ? data.activities.filter((activity) => !isMainNotificationChatActivity(activity))
        : [];
    } catch (error) {
      console.warn("Unable to load main notifications.", error);
      mainNotifications = [];
    }

    if (!elements.notificationPanel?.hidden) {
      renderMainNotifications();
    }
    syncMainNotificationBadge();
  }

  function setupMainNotifications() {
    const stored = readMainNotificationSeenState();
    mainNotificationBadgeSeenAt = String(stored.badgeSeenAt || "");
    mainNotificationReadIds = new Set(
      Array.isArray(stored.readIds) ? stored.readIds.map((value) => String(value || "").trim()).filter(Boolean) : [],
    );

    if (elements.notificationPanel instanceof HTMLElement && elements.notificationPanel.parentElement !== document.body) {
      document.body.appendChild(elements.notificationPanel);
    }

    elements.notificationToggle?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setMainHeaderProfileMenuOpen(false);
      setMainNotificationPanelOpen(Boolean(elements.notificationPanel?.hidden));
    });
    elements.notificationClose?.addEventListener("click", (event) => {
      event.stopPropagation();
      setMainNotificationPanelOpen(false);
      elements.notificationToggle?.focus({ preventScroll: true });
    });
    elements.notificationPanel?.addEventListener("click", (event) => {
      event.stopPropagation();
    });
    elements.notificationShowAll?.addEventListener("click", (event) => {
      event.stopPropagation();
      mainNotificationExpanded = !mainNotificationExpanded;
      renderMainNotifications();
      positionMainNotificationPanel();
    });
    elements.notificationFilterButtons.forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        mainNotificationFilter = button.dataset.mainNotificationFilter === "unread" ? "unread" : "all";
        mainNotificationExpanded = false;
        elements.notificationFilterButtons.forEach((item) => {
          const isActive = item === button;
          item.classList.toggle("is-active", isActive);
          item.setAttribute("aria-selected", String(isActive));
        });
        renderMainNotifications();
      });
    });
    document.addEventListener("click", (event) => {
      if (
        !elements.notificationToggle ||
        !elements.notificationPanel ||
        elements.notificationToggle.contains(event.target) ||
        elements.notificationPanel.contains(event.target)
      ) {
        return;
      }
      setMainNotificationPanelOpen(false);
    });
    window.addEventListener("resize", () => {
      if (!elements.notificationPanel?.hidden) {
        positionMainNotificationPanel();
      }
    }, { passive: true });

    void loadMainNotifications();
  }

  function handleMainRealtimeChange(event) {
    const detail = event?.detail && typeof event.detail === "object" ? event.detail : {};
    if (detail.type === "ready") {
      if (detail.reconnected !== true) {
        return;
      }
      mainRealtimeChatPending = true;
      mainRealtimeProfilePending = true;
      mainRealtimeThemePending = true;
    } else if (detail.type === "data-change") {
      const topics = Array.isArray(detail.topics)
        ? detail.topics.map((topic) => String(topic || "").trim().toLowerCase())
        : [];
      const refreshAll = topics.includes("all");
      const refreshChat = refreshAll
        || topics.includes("chat")
        || topics.includes("orders")
        || topics.includes("ai-integrations");
      const refreshProfile = refreshAll
        || topics.includes("accounts")
        || topics.includes("employees")
        || (topics.includes("admins") && !topics.includes("presence"));
      const refreshTheme = refreshAll || topics.includes("settings");
      const refreshNotifications = refreshAll
        || topics.includes("products")
        || topics.includes("product-requests")
        || topics.includes("orders")
        || topics.includes("accounts")
        || topics.includes("chat");
      if (!refreshChat && !refreshProfile && !refreshTheme && !refreshNotifications) {
        return;
      }
      mainRealtimeChatPending ||= refreshChat;
      mainRealtimeProfilePending ||= refreshProfile;
      mainRealtimeThemePending ||= refreshTheme;
      if (refreshNotifications) {
        void loadMainNotifications();
      }
      if (refreshChat && activeMainView === "live-chat") {
        void liveChatPollLiveChatState();
      }
    } else {
      return;
    }

    scheduleMainRealtimeRefresh(refreshChat ? 80 : 180);
  }

  elements.sidebarToggle?.addEventListener("click", () => {
    setSidebarOpen(!isSidebarOpen(), {
      preserveExpanded: true,
      allowClosedOpen: true,
    });
  });

  elements.backdrop?.addEventListener("click", () => setSidebarOpen(false, { preserveExpanded: true }));

  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const employeesAddButton = target?.closest("[data-main-employees-add]");
    if (employeesAddButton) {
      try {
        elements.employeesFrame?.contentDocument
          ?.querySelector("[data-employee-add]")
          ?.click();
      } catch (error) {
        // The employee iframe can briefly be unavailable while it is reloading.
      }
      return;
    }

    const retryButton = target?.closest("[data-main-live-chat-retry]");
    if (retryButton) {
      liveChatLoadPromise = null;
      if (elements.liveChatMount) {
        elements.liveChatMount.innerHTML = `
          <div class="main-live-chat-loading" role="status">
            <span class="main-live-chat-loading__spinner" aria-hidden="true"></span>
            <strong>Loading conversations...</strong>
          </div>`;
      }
      void ensureLiveChatWorkspace().catch(() => {});
      return;
    }

    const listingRetryButton = target?.closest("[data-main-listing-retry]");
    if (listingRetryButton) {
      ensureProductListingWorkspace({ force: true });
      return;
    }

    const ordersRetryButton = target?.closest("[data-main-orders-retry]");
    if (ordersRetryButton) {
      ensureOrdersWorkspace({ force: true });
      return;
    }

    const listingInsightRetryButton = target?.closest("[data-main-listing-insight-retry]");
    if (listingInsightRetryButton) {
      ensureListingInsightWorkspace({ force: true });
      return;
    }

    const inventoryRetryButton = target?.closest("[data-main-inventory-retry]");
    if (inventoryRetryButton) {
      ensureInventoryWorkspace({ force: true });
      return;
    }

    const employeesRetryButton = target?.closest("[data-main-employees-retry]");
    if (employeesRetryButton) {
      ensureEmployeesWorkspace({ force: true });
      return;
    }

    const packingRetryButton = target?.closest("[data-main-packing-retry]");
    if (packingRetryButton) {
      ensurePackingWorkspace({ force: true });
      return;
    }

    const viewButton = target?.closest("button[data-main-view], a[data-main-view]");
    if (!viewButton) {
      return;
    }

    event.preventDefault();
    const isNavViewButton = Boolean(elements.nav?.contains(viewButton));
    const focusNavButton = isNavViewButton && viewButton.matches("[data-main-nav-key]")
      ? viewButton
      : null;
    setMainView(viewButton.dataset.mainView, {
      updateHistory: true,
      preserveNavDom: isNavViewButton,
      ...(focusNavButton
        ? { focusNavKey: focusNavButton.dataset.mainNavKey }
        : {}),
      ...(viewButton.dataset.mainOrdersFilter
        ? { ordersFilter: viewButton.dataset.mainOrdersFilter }
        : {}),
      ...(viewButton.dataset.mainListingInsightRanking
        ? { listingInsightRanking: viewButton.dataset.mainListingInsightRanking }
        : {}),
      ...(viewButton.dataset.mainListingFilter
        ? { listingFilter: viewButton.dataset.mainListingFilter }
        : {}),
      ...(viewButton.dataset.mainInventoryFilter
        ? { inventoryFilter: viewButton.dataset.mainInventoryFilter }
        : {}),
      ...(viewButton.dataset.mainPackingStation
        ? { packingStation: viewButton.dataset.mainPackingStation }
        : {}),
    });
  });

  elements.nav?.addEventListener("pointerdown", () => {
    mainNavPointerFocus = true;
    window.setTimeout(() => {
      mainNavPointerFocus = false;
    }, 500);
  });

  elements.nav?.addEventListener("pointerover", (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }
    const item = event.target.closest(
      ".main-nav__item, .main-nav__sublist:is(.is-open, .has-active-child) .main-nav__subitem",
    );
    if (item instanceof HTMLElement) {
      showCollapsedMainSubNavTooltip(item);
    }
  });

  elements.nav?.addEventListener("pointerout", (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }
    const item = event.target.closest(".main-nav__item, .main-nav__subitem");
    if (item instanceof HTMLElement && !item.contains(event.relatedTarget)) {
      hideCollapsedMainSubNavTooltip();
    }
  });

  elements.nav?.addEventListener("focusin", (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }
    const item = event.target.closest(
      ".main-nav__item, .main-nav__sublist:is(.is-open, .has-active-child) .main-nav__subitem",
    );
    if (item instanceof HTMLElement) {
      showCollapsedMainSubNavTooltip(item);
    }
  });

  elements.nav?.addEventListener("focusout", (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }
    const item = event.target.closest(".main-nav__item, .main-nav__subitem");
    if (item instanceof HTMLElement && !item.contains(event.relatedTarget)) {
      hideCollapsedMainSubNavTooltip();
    }
  });

  elements.sidebarFooter?.addEventListener("pointerover", (event) => {
    const item = event.target instanceof Element
      ? event.target.closest(".main-nav__item")
      : null;
    if (item instanceof HTMLElement) {
      showCollapsedMainSubNavTooltip(item);
    }
  });

  elements.sidebarFooter?.addEventListener("pointerout", (event) => {
    const item = event.target instanceof Element
      ? event.target.closest(".main-nav__item")
      : null;
    if (item instanceof HTMLElement && !item.contains(event.relatedTarget)) {
      hideCollapsedMainSubNavTooltip();
    }
  });

  elements.sidebarFooter?.addEventListener("focusin", (event) => {
    const item = event.target instanceof Element
      ? event.target.closest(".main-nav__item")
      : null;
    if (item instanceof HTMLElement) {
      showCollapsedMainSubNavTooltip(item);
    }
  });

  elements.sidebarFooter?.addEventListener("focusout", (event) => {
    const item = event.target instanceof Element
      ? event.target.closest(".main-nav__item")
      : null;
    if (item instanceof HTMLElement && !item.contains(event.relatedTarget)) {
      hideCollapsedMainSubNavTooltip();
    }
  });

  window.addEventListener("resize", hideCollapsedMainSubNavTooltip);
  document.addEventListener("scroll", hideCollapsedMainSubNavTooltip, true);

  elements.nav?.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const ordersFilterButton = target?.closest("[data-main-orders-filter]");
    const listingInsightRankingButton = target?.closest("[data-main-listing-insight-ranking]");
    const listingFilterButton = target?.closest("[data-main-listing-filter]");
    const inventoryFilterButton = target?.closest("[data-main-inventory-filter]");
    const packingStationButton = target?.closest("[data-main-packing-station]");
    const mainViewNavButton = target?.closest("[data-main-nav-key][data-main-view]");
    if (mainViewNavButton) {
      event.preventDefault();
      event.stopPropagation();

      const navGroup = mainViewNavButton.closest("[data-main-nav-group]");
      const groupKey = navGroup?.querySelector("[data-main-nav-sublist]")
        ? normalizeText(navGroup.dataset.mainNavGroupKey).toLowerCase()
        : "";
      const applyView = () => {
        setMainView(mainViewNavButton.dataset.mainView, {
          updateHistory: true,
          focusNavKey: mainViewNavButton.dataset.mainNavKey,
          preserveNavDom: true,
        });
      };
      if (groupKey) {
        expandMainNavGroup(groupKey, {
          forceOpen: true,
          allowToggle: false,
          forceFromCollapsed: !isSidebarOpen(),
          onExpanded: applyView,
        });
      } else {
        setExpandedMainNavKey("", { persist: true, allowClose: true });
        applyView();
      }
      mainNavPointerFocus = false;
      return;
    }

    if (ordersFilterButton) {
      expandMainNavGroup("orders", { forceOpen: true, allowToggle: false });
    } else if (listingInsightRankingButton) {
      expandMainNavGroup("listing-insight", { forceOpen: true, allowToggle: false });
    } else if (listingFilterButton) {
      expandMainNavGroup("listing", { forceOpen: true, allowToggle: false });
    } else if (inventoryFilterButton) {
      expandMainNavGroup("inventory", { forceOpen: true, allowToggle: false });
    } else if (packingStationButton) {
      expandMainNavGroup("packing", { forceOpen: true, allowToggle: false });
    } else {
      const subitemButton = target?.closest(".main-nav__subitem");
      const subitemGroup = subitemButton?.closest("[data-main-nav-group]");
      const navButton = target?.closest("[data-main-nav-key]");
      const navGroup = navButton?.closest("[data-main-nav-group]");
      const expandableGroup = subitemGroup?.querySelector("[data-main-nav-sublist]")
        ? subitemGroup
        : navGroup?.querySelector("[data-main-nav-sublist]")
          ? navGroup
          : null;
      const groupKey = normalizeText(expandableGroup?.dataset.mainNavGroupKey).toLowerCase();
      const shouldExpandGroup = Boolean(groupKey);
      const shouldCloseForMainButton = Boolean(navButton && !subitemButton && !shouldExpandGroup);
      if (shouldExpandGroup) {
        // Parent with children: toggle accordion open/close with max-height motion.
        if (subitemButton) {
          expandMainNavGroup(groupKey, { forceOpen: true, allowToggle: false });
        } else {
          expandMainNavGroup(groupKey, { allowToggle: true });
        }
      } else {
        setExpandedMainNavKey("", {
          persist: true,
          ...(shouldCloseForMainButton ? { allowClose: true } : {}),
        });
      }
    }

    const actionButton = target?.closest("[data-main-action]");
    if (actionButton?.dataset.mainAction === "account-settings") {
      event.preventDefault();
      window.gmsOpenAdminAccountSettings?.();
      mainNavPointerFocus = false;
      return;
    }
    if (actionButton?.dataset.mainAction === "feedback") {
      event.preventDefault();
      window.gmsOpenSellerFeedbackModal?.();
      mainNavPointerFocus = false;
      return;
    }
    if (actionButton?.dataset.mainAction === "sign-out") {
      signOut();
      return;
    }

    const routeButton = target?.closest("[data-main-route]");
    const route = normalizeText(routeButton?.dataset.mainRoute);
    if (route) {
      window.location.href = route;
    }
    mainNavPointerFocus = false;
  });

  elements.sidebarFooter?.addEventListener("click", (event) => {
    const actionButton = event.target instanceof Element
      ? event.target.closest("[data-main-action='sign-out']")
      : null;
    if (!actionButton) {
      return;
    }
    event.preventDefault();
    hideCollapsedMainSubNavTooltip();
    signOut();
  });

  elements.nav?.addEventListener("focusin", (event) => {
    if (collapseMainNavTimer) {
      window.clearTimeout(collapseMainNavTimer);
      collapseMainNavTimer = 0;
    }

    const target = event.target instanceof Element ? event.target : null;
    const navGroup = target?.closest("[data-main-nav-group]");
    const groupKey = normalizeText(navGroup?.dataset.mainNavGroupKey).toLowerCase();
    if (
      groupKey
      && navGroup?.querySelector("[data-main-nav-sublist]")
    ) {
      if (mainNavPointerFocus) {
        return;
      }
      expandMainNavGroup(groupKey, { forceOpen: true, allowToggle: false });
    }
  });

  elements.nav?.addEventListener("focusout", () => {
    if (collapseMainNavTimer) {
      window.clearTimeout(collapseMainNavTimer);
      collapseMainNavTimer = 0;
    }
  });

  elements.search?.addEventListener("input", () => {
    if (!(elements.search instanceof HTMLInputElement)) {
      return;
    }
    if (activeMainView === "live-chat") {
      syncLiveChatSearch(elements.search.value);
      return;
    }
    if (activeMainView === "orders") {
      syncOrdersSearch(elements.search.value);
      return;
    }
    if (activeMainView === "listing-insight") {
      syncListingInsightSearch(elements.search.value);
      return;
    }
    if (activeMainView === "listing") {
      syncProductListingSearch(elements.search.value);
      return;
    }
    if (activeMainView === "inventory") {
      syncInventorySearch(elements.search.value);
      return;
    }
    if (activeMainView === "employees") {
      syncEmployeesSearch(elements.search.value);
      return;
    }
    if (activeMainView === "packing") {
      syncPackingSearch(elements.search.value);
      return;
    }
    dashboardSearchQuery = elements.search.value;
    filterWorkspace(dashboardSearchQuery);
  });

  elements.searchClear?.addEventListener("click", () => {
    if (!(elements.search instanceof HTMLInputElement)) {
      return;
    }
    elements.search.value = "";
    elements.search.dispatchEvent(new Event("input", { bubbles: true }));
    elements.search.focus();
  });

  elements.listingInsightHeaderFilterToggle?.addEventListener("click", (event) => {
    event.preventDefault();
    const isOpen = elements.listingInsightHeaderFilterToggle?.getAttribute("aria-expanded") === "true";
    setOrdersHeaderFilterOpen(false);
    setListingInsightHeaderFilterOpen(!isOpen);
  });

  elements.listingInsightHeaderFilterPanel?.addEventListener("change", (event) => {
    const target = event.target instanceof HTMLInputElement ? event.target : null;
    if (!(target instanceof HTMLInputElement) || !target.checked) {
      return;
    }

    if (target.matches("[data-main-listing-insight-ranking-filter]")) {
      listingInsightRankingMode = normalizeListingInsightRankingMode(target.value);
      syncListingInsightHeaderFilterUi();
      syncListingInsightRankingMode(listingInsightRankingMode);
      syncListingInsightHeaderFilters();
      syncMainNavSelection();
      replaceListingInsightRankingHistory();
      return;
    }

    const field = target.dataset.mainListingInsightHeaderFilterControl;
    if (!field || !Object.prototype.hasOwnProperty.call(listingInsightHeaderFilters, field)) {
      return;
    }
    listingInsightHeaderFilters = normalizeListingInsightHeaderFilters({
      ...listingInsightHeaderFilters,
      [field]: target.value,
    });
    syncListingInsightHeaderFilterUi();
    syncListingInsightHeaderFilters();
  });

  elements.listingInsightHeaderFilterReset?.addEventListener("click", () => {
    listingInsightRankingMode = "sold";
    listingInsightHeaderFilters = normalizeListingInsightHeaderFilters({});
    syncListingInsightHeaderFilterUi();
    syncListingInsightRankingMode(listingInsightRankingMode);
    syncListingInsightHeaderFilters();
    syncMainNavSelection();
    replaceListingInsightRankingHistory();
    setListingInsightHeaderFilterOpen(false);
    elements.listingInsightHeaderFilterToggle?.focus();
  });

  elements.ordersHeaderFilterToggle?.addEventListener("click", (event) => {
    event.preventDefault();
    const isOpen = elements.ordersHeaderFilterToggle?.getAttribute("aria-expanded") === "true";
    setListingInsightHeaderFilterOpen(false);
    setOrdersHeaderFilterOpen(!isOpen);
  });

  elements.ordersHeaderStatusFilters.forEach((control) => {
    control.addEventListener("change", () => {
      if (control instanceof HTMLInputElement && control.checked) {
        applyOrdersHeaderStatusFilter(control.value);
      }
    });
  });

  elements.ordersHeaderFilterPanel?.addEventListener("change", (event) => {
    const control = event.target instanceof HTMLInputElement
      ? event.target.closest("[data-main-orders-header-advanced-filter]")
      : null;
    if (!(control instanceof HTMLInputElement) || !control.checked) {
      return;
    }
    const field = control.dataset.mainOrdersHeaderAdvancedFilter;
    if (!field || !Object.prototype.hasOwnProperty.call(ordersAdvancedFilters, field)) {
      return;
    }
    ordersAdvancedFilters = normalizeOrdersAdvancedFilters({
      ...ordersAdvancedFilters,
      [field]: control.value,
    });
    syncOrdersHeaderFilterUi();
    syncOrdersAdvancedFilters();
  });

  elements.ordersHeaderCustomDates.forEach((control) => {
    control.addEventListener("change", () => {
      if (!(control instanceof HTMLInputElement)) {
        return;
      }
      const field = control.dataset.mainOrdersHeaderCustomDate;
      if (!field) {
        return;
      }
      ordersAdvancedFilters = normalizeOrdersAdvancedFilters({
        ...ordersAdvancedFilters,
        date: "custom",
        [field]: control.value,
      });
      syncOrdersHeaderFilterUi();
      syncOrdersAdvancedFilters();
    });
  });

  elements.ordersHeaderFilterReset?.addEventListener("click", () => {
    ordersAdvancedFilters = normalizeOrdersAdvancedFilters({});
    applyOrdersHeaderStatusFilter("all");
    setOrdersHeaderFilterOpen(false);
    elements.ordersHeaderFilterToggle?.focus();
  });

  document.addEventListener("click", (event) => {
    if (
      elements.listingInsightHeaderFilterToggle?.getAttribute("aria-expanded") === "true"
      && event.target instanceof Node
      && elements.listingInsightHeaderFilter instanceof HTMLElement
      && !elements.listingInsightHeaderFilter.contains(event.target)
    ) {
      setListingInsightHeaderFilterOpen(false);
    }
    if (
      elements.ordersHeaderFilterToggle?.getAttribute("aria-expanded") === "true"
      && event.target instanceof Node
      && elements.ordersHeaderFilter instanceof HTMLElement
      && !elements.ordersHeaderFilter.contains(event.target)
    ) {
      setOrdersHeaderFilterOpen(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape"
      && elements.listingInsightHeaderFilterToggle?.getAttribute("aria-expanded") === "true"
    ) {
      event.preventDefault();
      setListingInsightHeaderFilterOpen(false);
      elements.listingInsightHeaderFilterToggle?.focus();
      return;
    }
    if (
      event.key === "Escape"
      && elements.ordersHeaderFilterToggle?.getAttribute("aria-expanded") === "true"
    ) {
      event.preventDefault();
      setOrdersHeaderFilterOpen(false);
      elements.ordersHeaderFilterToggle?.focus();
    }
  });

  window.addEventListener("hashchange", () => {
    setMainView(getMainViewFromHash(), {
      ordersFilter: getOrdersStatusFilterFromHash(),
      listingInsightRanking: getListingInsightRankingModeFromHash(),
      packingStation: getPackingStationFilterFromHash(),
    });
  });

  elements.listingFrame?.addEventListener("load", () => {
    void handleProductListingFrameLoad();
  });

  elements.listingInsightFrame?.addEventListener("load", handleListingInsightFrameLoad);
  elements.listingInsightFrameShell?.addEventListener("click", (event) => {
    if (
      mainListingInsightDetailModalOpen
      && event.target === elements.listingInsightFrameShell
    ) {
      requestMainListingInsightDetailModalClose();
    }
  });

  elements.ordersFrame?.addEventListener("load", handleOrdersFrameLoad);
  elements.ordersWaybillPrintButton?.addEventListener("click", (event) => {
    event.preventDefault();
    requestMainOrdersWaybillPrint();
  });
  elements.ordersWaybillSnackbarClose?.addEventListener("click", () => {
    hideMainOrdersWaybillSnackbar();
  });
  elements.ordersFrameShell?.addEventListener("click", (event) => {
    if (
      mainOrdersDetailModalOpen
      && event.target === elements.ordersFrameShell
    ) {
      requestMainOrdersDetailModalClose();
    }
  });

  elements.inventoryFrame?.addEventListener("load", () => {
    void handleInventoryFrameLoad();
  });
  elements.inventoryFrameShell?.addEventListener("click", (event) => {
    if (
      mainInventoryStockRecordModalOpen
      && event.target === elements.inventoryFrameShell
    ) {
      requestMainInventoryStockRecordModalClose();
    }
  });

  elements.employeesFrame?.addEventListener("load", handleEmployeesFrameLoad);
  elements.employeesFrameShell?.addEventListener("click", (event) => {
    if (event.target !== elements.employeesFrameShell) {
      return;
    }
    if (mainEmployeesRegisterModalOpen) {
      requestMainEmployeesRegisterModalClose();
      return;
    }
    if (mainEmployeesDrawerOpen) {
      requestMainEmployeesDrawerClose();
    }
  });
  elements.employeesDrawerPortalClose?.addEventListener("click", () => {
    if (mainEmployeesRegisterModalOpen) {
      requestMainEmployeesRegisterModalClose();
      return;
    }
    requestMainEmployeesDrawerClose();
  });

  elements.packingFrame?.addEventListener("load", handlePackingFrameLoad);

  window.addEventListener("resize", () => {
    queueBrandMarqueeSync();
    syncProductListingFrameViewportMode();
    queueProductListingFrameHeightSync();
    syncInventoryFrameViewportMode();
    queueActiveMainEmbeddedFrameHeightSync();
    syncMainEmployeesDrawerMetrics();
  });

  window.addEventListener("message", (event) => {
    if (event.origin !== window.location.origin) {
      return;
    }

    if (event.data?.type === "gms-main-orders-detail-modal-state") {
      if (event.source !== elements.ordersFrame?.contentWindow) {
        return;
      }
      setMainOrdersDetailModalOpen(event.data.isOpen === true);
      return;
    }

    if (event.data?.type === "gms-main-orders-waybill-selection-state") {
      if (event.source !== elements.ordersFrame?.contentWindow) {
        return;
      }
      syncMainOrdersWaybillPrintButtonState(event.data);
      return;
    }

    if (event.data?.type === "gms-main-orders-filter-options") {
      if (event.source !== elements.ordersFrame?.contentWindow) {
        return;
      }
      updateOrdersHeaderFilterOptions(event.data);
      return;
    }

    if (event.data?.type === "gms-main-orders-waybill-preview-ready") {
      if (event.source !== elements.ordersFrame?.contentWindow) {
        return;
      }
      continueMainOrdersWaybillPrint(event.data);
      return;
    }

    if (event.data?.type === "gms-main-orders-waybill-preview-error") {
      if (event.source !== elements.ordersFrame?.contentWindow) {
        return;
      }
      showMainOrdersWaybillSnackbar(
        "Print Waybill Failed",
        event.data?.message || "Unable to prepare the waybill preview.",
        "error",
      );
      return;
    }

    if (event.data?.type === "gms-main-orders-waybill-print-complete") {
      if (event.source !== elements.ordersFrame?.contentWindow) {
        return;
      }
      resetMainOrdersWaybillPrintState();
      showMainOrdersWaybillSnackbar(
        "Print Waybill",
        event.data?.message || "Waybill sent to print.",
        "success",
      );
      return;
    }

    if (event.data?.type === "gms-main-orders-waybill-print-error") {
      if (event.source !== elements.ordersFrame?.contentWindow) {
        return;
      }
      resetMainOrdersWaybillPrintState();
      showMainOrdersWaybillSnackbar(
        "Print Waybill Failed",
        event.data?.message || "Unable to print the selected waybills.",
        "error",
      );
      return;
    }

    if (event.data?.type === "gms-main-listing-insight-filter-options") {
      if (event.source !== elements.listingInsightFrame?.contentWindow) {
        return;
      }
      renderListingInsightHeaderCategoryOptions(event.data.categories);
      syncListingInsightHeaderFilters();
      return;
    }

    if (event.data?.type === "gms-main-listing-insight-detail-modal-state") {
      if (event.source !== elements.listingInsightFrame?.contentWindow) {
        return;
      }
      setMainListingInsightDetailModalOpen(event.data.isOpen === true);
      return;
    }

    if (event.data?.type === "gms-main-listing-insight-ranking-mode-state") {
      if (event.source !== elements.listingInsightFrame?.contentWindow) {
        return;
      }
      listingInsightRankingMode = normalizeListingInsightRankingMode(event.data.mode);
      syncListingInsightHeaderFilterUi();
      syncMainFilterBreadcrumbs();
      syncMainNavSelection();
      if (activeMainView === "listing-insight") {
        const url = new URL(window.location.href);
        url.hash = `listing-insight/${listingInsightRankingMode}`;
        window.history.replaceState(
          { mainView: "listing-insight", listingInsightRankingMode },
          "",
          `${url.pathname}${url.search}${url.hash}`,
        );
      }
      return;
    }

    if (event.data?.type === "gms-main-inventory-stock-record-modal-state") {
      if (event.source !== elements.inventoryFrame?.contentWindow) {
        return;
      }
      setMainInventoryStockRecordModalOpen(event.data.isOpen === true);
      return;
    }

    if (event.data?.type === "gms-main-inventory-stock-edit-modal-state") {
      if (event.source !== elements.inventoryFrame?.contentWindow) {
        return;
      }
      setMainInventoryStockEditModalOpen(event.data.isOpen === true);
      return;
    }

    if (event.data?.type === "gms-main-employees-drawer-request") {
      if (event.source !== elements.employeesFrame?.contentWindow) {
        return;
      }
      openMainEmployeesDrawerPortal(event.data.accountId);
      return;
    }

    if (event.data?.type === "gms-main-employees-layer-state") {
      if (event.source === elements.employeesDrawerPortalFrame?.contentWindow) {
        if (event.data.modalOpen === true) {
          setMainEmployeesDrawerPortalMode("register");
        } else if (event.data.drawerOpen === true) {
          setMainEmployeesDrawerPortalMode("drawer");
        } else {
          closeMainEmployeesDrawerPortal();
        }
        return;
      }
      if (event.source !== elements.employeesFrame?.contentWindow) {
        return;
      }
      if (event.data.modalOpen === true) {
        setMainEmployeesLayer("register");
      } else if (event.data.drawerOpen === true) {
        openMainEmployeesDrawerPortal(event.data.accountId);
      } else {
        setMainEmployeesLayer(null);
      }
      return;
    }

    if (event.data?.type === "gms-product-composer-state") {
      const isOpen = event.data.isOpen === true;
      setProductListingComposerPortalOpen(isOpen);
      if (!isOpen) {
        window.requestAnimationFrame(() => {
          queueProductListingFrameHeightSync(280);
        });
      }
    }
  });

  window.addEventListener("gms-product-listing-status-filter", (event) => {
    const nextFilter = normalizeListingStatusFilter(event.detail?.filter);
    if (nextFilter === listingStatusFilter) {
      syncMainFilterBreadcrumbs();
      return;
    }
    listingStatusFilter = nextFilter;
    syncMainFilterBreadcrumbs();
    if (activeMainView === "listing") {
      renderNav();
    }
  });

  if (document.fonts?.ready) {
    void document.fonts.ready.then(queueBrandMarqueeSync).catch(() => {});
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (mainOrdersDetailModalOpen) {
        event.preventDefault();
        requestMainOrdersDetailModalClose();
        return;
      }
      if (mainListingInsightDetailModalOpen) {
        event.preventDefault();
        requestMainListingInsightDetailModalClose();
        return;
      }
      if (mainInventoryStockEditModalOpen) {
        event.preventDefault();
        requestMainInventoryStockEditModalClose();
        return;
      }
      if (mainInventoryStockRecordModalOpen) {
        event.preventDefault();
        requestMainInventoryStockRecordModalClose();
        return;
      }
      if (mainEmployeesRegisterModalOpen) {
        event.preventDefault();
        requestMainEmployeesRegisterModalClose();
        return;
      }
      if (mainEmployeesDrawerOpen) {
        event.preventDefault();
        requestMainEmployeesDrawerClose();
        return;
      }
      if (elements.notificationPanel && !elements.notificationPanel.hidden) {
        event.preventDefault();
        setMainNotificationPanelOpen(false);
        return;
      }
      if (elements.headerProfileDropdown && !elements.headerProfileDropdown.hidden) {
        event.preventDefault();
        setMainHeaderProfileMenuOpen(false);
        elements.headerProfileToggle?.focus({ preventScroll: true });
        return;
      }
      setSidebarOpen(false);
    }
  });

  window.addEventListener("storage", (event) => {
    if (event.key !== adminSessionKey && event.key !== employeeSessionKey) {
      return;
    }
    const nextAuthState = getAuthState();
    if (!nextAuthState) {
      window.location.replace("/login.html");
      return;
    }
    authState = nextAuthState;
    renderIdentity();
    renderSummary();
    setMainView(activeMainView);
    startLiveChatNavBadgeMonitoring();
    startSellerPresenceHeartbeat();
  });

  window.addEventListener("gms-admin-session-updated", (event) => {
    const nextSession = event?.detail?.session;
    if (!nextSession || typeof nextSession !== "object") {
      return;
    }
    authState = { ...authState, session: nextSession, role: authState?.role || "seller" };
    renderIdentity();
  });

  window.addEventListener("gms:realtime-change", handleMainRealtimeChange);

  window.addEventListener("focus", () => {
    void refreshLiveChatNavBadge();
    sendSellerPresenceHeartbeat();
  });

  window.addEventListener("online", () => {
    startSellerPresenceHeartbeat();
  });

  window.addEventListener("offline", () => {
    stopSellerPresenceHeartbeat();
  });

  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      startSellerPresenceHeartbeat();
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      void refreshLiveChatNavBadge();
      sendSellerPresenceHeartbeat();
    }
  });

  function leaveSellerSwitchPinGate() {
    try {
      if (window.history.length > 1) {
        window.history.back();
        return;
      }
    } catch (_) {}
    window.location.replace("/main_dart.html");
  }

  function readSwitchPinUnlock() {
    try {
      const raw = window.sessionStorage.getItem("gms-switch-pin-unlock");
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function writeSwitchPinUnlock(token, companyId) {
    const unlockToken = String(token || "").trim();
    if (!unlockToken) return;
    const session = authState.session || {};
    try {
      window.sessionStorage.setItem("gms-switch-pin-unlock", JSON.stringify({
        token: unlockToken,
        companyId: String(companyId || "").trim(),
        accountId: getSessionAdminId(session),
      }));
    } catch (_) {}
  }

  function consumeSwitchPinTicket() {
    try {
      const url = new URL(window.location.href);
      const ticket = String(url.searchParams.get("switchPinTicket") || "").trim();
      if (!ticket) return "";
      url.searchParams.delete("switchPinTicket");
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
      return ticket;
    } catch (_) {
      return "";
    }
  }

  function ensureSellerSwitchPinStyles() {
    if (document.getElementById("seller-switch-pin-style")) return;
    const style = document.createElement("style");
    style.id = "seller-switch-pin-style";
    style.textContent = `
      .seller-switch-pin {
        position: fixed;
        inset: 0;
        z-index: 100000;
        display: grid;
        place-items: center;
        padding: 24px;
        background: rgba(15, 23, 42, 0.55);
      }
      .seller-switch-pin__card {
        width: min(420px, 100%);
        background: #fff;
        color: #0f172a;
        border-radius: 18px;
        padding: 22px 22px 18px;
        box-shadow: 0 24px 60px rgba(15, 23, 42, 0.28);
        font-family: Poppins, sans-serif;
      }
      .seller-switch-pin__kicker {
        margin: 0 0 6px;
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: #0f766e;
      }
      .seller-switch-pin__card h2 { margin: 0; font-size: 22px; }
      .seller-switch-pin__lead {
        margin: 8px 0 16px;
        color: #475569;
        font-size: 14px;
        line-height: 1.5;
      }
      .seller-switch-pin label {
        display: grid;
        gap: 6px;
        margin-bottom: 12px;
        font-size: 13px;
        font-weight: 600;
      }
      .seller-switch-pin input {
        height: 46px;
        border: 1px solid #cbd5e1;
        border-radius: 12px;
        padding: 0 14px;
        font-size: 18px;
        letter-spacing: 0.28em;
        font-weight: 600;
      }
      .seller-switch-pin__feedback {
        min-height: 18px;
        margin: 0 0 12px;
        font-size: 13px;
        color: #b91c1c;
      }
      .seller-switch-pin__actions { display: flex; justify-content: flex-end; gap: 8px; }
      .seller-switch-pin button {
        height: 40px;
        border: 0;
        border-radius: 12px;
        padding: 0 14px;
        font-weight: 600;
        cursor: pointer;
      }
      .seller-switch-pin__cancel { background: #f1f5f9; color: #0f172a; }
      .seller-switch-pin__submit { background: #0f766e; color: #fff; }
      .seller-switch-pin button:disabled { opacity: 0.7; cursor: wait; }
    `;
    document.head.appendChild(style);
  }

  async function postSellerSwitchPin(path, payload) {
    const response = await fetch(path, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || "Unable to check Switch PIN.");
    }
    return data;
  }

  async function ensureSellerSwitchPinGate() {
    if (authState.role !== "seller") return;
    const session = authState.session || {};
    const accountId = getSessionAdminId(session);
    const email = String(session.email || session.adminEmail || "").trim().toLowerCase();
    if (!accountId && !email) return;

    const ticket = consumeSwitchPinTicket();
    const stored = readSwitchPinUnlock();
    const unlockToken = ticket || String(stored?.token || "").trim();
    if (unlockToken) {
      try {
        const unlock = await postSellerSwitchPin("/api/account/seller-switch-pin/check-unlock", {
          accountId,
          email,
          companyId: String(stored?.companyId || "").trim(),
          unlockToken,
        });
        if (unlock.unlocked) {
          writeSwitchPinUnlock(unlockToken, unlock.companyId);
          return;
        }
      } catch (_) {}
    }

    ensureSellerSwitchPinStyles();
    const companyName = String(session.companyName || session.storeName || "Seller admin").trim() || "Seller admin";
    const overlay = document.createElement("div");
    overlay.className = "seller-switch-pin";
    overlay.innerHTML = `
      <form class="seller-switch-pin__card">
        <p class="seller-switch-pin__kicker">Switch PIN</p>
        <h2>Open seller admin</h2>
        <p class="seller-switch-pin__lead" data-seller-pin-lead>Checking Switch PIN...</p>
        <div data-seller-pin-fields></div>
        <p class="seller-switch-pin__feedback" data-seller-pin-feedback></p>
        <div class="seller-switch-pin__actions">
          <button type="button" class="seller-switch-pin__cancel" data-seller-pin-cancel>Back</button>
          <button type="submit" class="seller-switch-pin__submit" data-seller-pin-submit disabled>Continue</button>
        </div>
      </form>
    `;
    document.body.appendChild(overlay);
    const lead = overlay.querySelector("[data-seller-pin-lead]");
    const fields = overlay.querySelector("[data-seller-pin-fields]");
    const feedback = overlay.querySelector("[data-seller-pin-feedback]");
    const submit = overlay.querySelector("[data-seller-pin-submit]");
    const cancel = overlay.querySelector("[data-seller-pin-cancel]");
    let mode = "enter";
    let companyId = "";

    const renderFields = (nextMode) => {
      mode = nextMode;
      lead.textContent = nextMode === "create"
        ? "Create a Switch PIN for this seller admin. This is not your login password. Subscribers must enter this PIN before opening seller admin."
        : `Enter the Switch PIN for ${companyName}. This is not your login password.`;
      fields.innerHTML = nextMode === "create"
        ? `
          <label>Create Switch PIN
            <input type="password" inputmode="numeric" maxlength="6" autocomplete="off" data-seller-pin required />
          </label>
          <label>Confirm Switch PIN
            <input type="password" inputmode="numeric" maxlength="6" autocomplete="off" data-seller-pin-confirm required />
          </label>
        `
        : `
          <label>Switch PIN
            <input type="password" inputmode="numeric" maxlength="6" autocomplete="off" data-seller-pin required />
          </label>
        `;
      fields.querySelectorAll("input").forEach((input) => {
        input.addEventListener("input", () => {
          input.value = String(input.value || "").replace(/\D/g, "").slice(0, 6);
          feedback.textContent = "";
        });
      });
      submit.disabled = false;
      fields.querySelector("input")?.focus();
    };

    cancel.addEventListener("click", leaveSellerSwitchPinGate);
    overlay.querySelector("form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const pin = String(overlay.querySelector("[data-seller-pin]")?.value || "").replace(/\D/g, "");
      const confirmPin = String(overlay.querySelector("[data-seller-pin-confirm]")?.value || "").replace(/\D/g, "");
      if (!/^\d{6}$/.test(pin)) {
        feedback.textContent = "Switch PIN must be exactly 6 digits.";
        return;
      }
      if (mode === "create" && pin !== confirmPin) {
        feedback.textContent = "Switch PIN confirmation does not match.";
        return;
      }
      submit.disabled = true;
      cancel.disabled = true;
      feedback.textContent = "";
      try {
        const result = await postSellerSwitchPin(
          mode === "create" ? "/api/account/seller-switch-pin/set" : "/api/account/seller-switch-pin/verify",
          { accountId, email, companyId, pin, confirmPin },
        );
        writeSwitchPinUnlock(result.unlockToken, result.companyId || companyId);
        overlay.remove();
      } catch (error) {
        submit.disabled = false;
        cancel.disabled = false;
        feedback.textContent = error instanceof Error ? error.message : "Unable to check Switch PIN.";
      }
    });

    try {
      const status = await postSellerSwitchPin("/api/account/seller-switch-pin/status", {
        accountId,
        email,
      });
      companyId = String(status.companyId || "").trim();
      renderFields(status.hasPin ? "enter" : "create");
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (/not found|unavailable/i.test(message)) {
        overlay.remove();
        return;
      }
      lead.textContent = "Switch PIN is required before seller admin can open.";
      feedback.textContent = message || "Unable to check Switch PIN.";
    }
  }

  elements.body.dataset.mainRole = authState.role;
  const shouldRestoreMainSidebarOpen = readStoredMainSidebarOpen();
  elements.body.classList.toggle("main-sidebar-open", shouldRestoreMainSidebarOpen);
  if (shouldRestoreMainSidebarOpen) {
    const storedExpandedMainNavKey = readStoredExpandedMainNavKey();
    if (isMainNavExpandableKey(storedExpandedMainNavKey)) {
      expandedMainNavKey = storedExpandedMainNavKey;
    }
  }
  installMainSectionCountSync("listing", document);
  renderIdentity();
  renderSummary();
  setMainView(activeMainView, { preserveSidebarOpen: shouldRestoreMainSidebarOpen });
  window.setTimeout(() => finishMainInitialLoading(activeMainView), 15500);
  startLiveChatNavBadgeMonitoring();
  startSellerPresenceHeartbeat();
  setupMainNotifications();
  setupMainHeaderProfileMenu();
  syncSidebarToggleState();
  queueBrandMarqueeSync();
  void refreshSellerProfile();
  void ensureSellerSwitchPinGate();
}());
