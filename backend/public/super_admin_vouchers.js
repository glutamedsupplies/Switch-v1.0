(() => {
  const QUICK_VIEW_STORAGE_KEY = "switch.superAdmin.vouchers.quickView";
  const STATIC_QUICK_VIEWS = Object.freeze([
    "all",
    "companies",
    "percent",
    "fixed",
    "companyFunded",
    "platformFunded",
    "sharedFunded",
    "comingSoon",
    "endingSoon",
    "ended",
  ]);
  const EMPTY_SUBNAV = Object.freeze({
    companies: 0,
    percent: 0,
    fixed: 0,
    comingSoon: 0,
    platforms: [],
  });

  function parsePlatformQuickView(value) {
    const raw = String(value || "").trim();
    const lower = raw.toLowerCase();
    if (lower.startsWith("platform:")) {
      return normalizePlatformId(raw.slice("platform:".length));
    }
    return "";
  }

  function normalizeQuickView(value) {
    const raw = String(value || "").trim();
    if (!raw) return "all";
    const lower = raw.toLowerCase().replace(/[-_]/g, "");
    if (lower === "comingsoon") return "comingSoon";
    if (lower === "endingsoon" || lower === "endedsoon") return "endingSoon";
    if (lower === "companyfunded" || lower === "sellerfunded") return "companyFunded";
    if (lower === "platformfunded") return "platformFunded";
    if (lower === "sharedfunded" || lower === "sharefunded") return "sharedFunded";
    if (lower === "expired") return "ended";
    if (STATIC_QUICK_VIEWS.includes(raw) || STATIC_QUICK_VIEWS.includes(lower)) {
      return STATIC_QUICK_VIEWS.includes(raw) ? raw : lower;
    }
    const platformId = parsePlatformQuickView(raw);
    if (platformId && platformId !== "all") return `platform:${platformId}`;
    return "all";
  }

  function getSavedQuickView() {
    try {
      return normalizeQuickView(window.sessionStorage.getItem(QUICK_VIEW_STORAGE_KEY));
    } catch (_error) {
      return "all";
    }
  }

  function saveQuickView(value) {
    try {
      window.sessionStorage.setItem(
        QUICK_VIEW_STORAGE_KEY,
        normalizeQuickView(value),
      );
    } catch (_error) {
      // Storage can be unavailable in private or restricted browser contexts.
    }
  }

  const PANEL_FILTER_KEYS = Object.freeze([
    "voucherStatus",
    "redemption",
    "usage",
    "eligibility",
    "minSpend",
  ]);

  function filtersFromQuickView(quickView, search = "", panelFilters = {}) {
    const view = normalizeQuickView(quickView);
    const filters = {
      search: String(search || ""),
      platformId: "",
      status: "",
      scope: "",
      discountType: "",
      funding: "",
      upcoming: false,
      endingSoon: false,
    };
    for (const key of PANEL_FILTER_KEYS) {
      filters[key] = String(panelFilters?.[key] || "");
    }
    if (view === "companies") filters.scope = "store";
    else if (view === "percent") filters.discountType = "percent";
    else if (view === "fixed") filters.discountType = "fixed";
    else if (view === "companyFunded") filters.funding = "seller";
    else if (view === "platformFunded") filters.funding = "platform";
    else if (view === "sharedFunded") filters.funding = "shared";
    else if (view === "comingSoon") filters.upcoming = true;
    else if (view === "endingSoon") filters.endingSoon = true;
    else if (view === "ended") filters.status = "expired";
    else if (view.startsWith("platform:")) {
      filters.platformId = view.slice("platform:".length);
    }
    return filters;
  }

  const KIND_OPTIONS = [
    { value: "percent", label: "Percent off" },
    { value: "gift", label: "Fixed amount" },
    { value: "shipping", label: "Free shipping" },
    { value: "shopping", label: "Buy 1 Get 1" },
    { value: "loyalty", label: "Loyalty" },
    { value: "ticket", label: "General ticket" },
  ];
  const REDEMPTION_OPTIONS = [
    { value: "enter_code", label: "Enter code", helper: "Buyers type this code at checkout." },
    { value: "claim", label: "Claim voucher", helper: "Buyers claim it first. It then appears in My Vouchers." },
    { value: "auto_apply", label: "Auto apply", helper: "Applies automatically when checkout requirements are met." },
  ];
  const SCOPE_OPTIONS = [
    { value: "entire_platform", label: "All categories", include: "" },
    { value: "selected_sellers", label: "Selected sellers", include: "Seller IDs" },
    { value: "selected_categories", label: "Selected categories", include: "Category IDs" },
    { value: "selected_business_types", label: "Selected business types", include: "Business type IDs" },
    { value: "selected_brands", label: "Selected brands", include: "Brand IDs" },
    { value: "selected_products", label: "Selected products", include: "Product IDs" },
    { value: "selected_variants", label: "Selected variants", include: "Variant IDs" },
  ];
  const ELIGIBILITY_OPTIONS = [
    { value: "all", label: "All User" },
    { value: "first_order", label: "First Time User" },
  ];
  const SHIPPING_TYPE_OPTIONS = [
    { value: "full", label: "Full shipping" },
    { value: "cap", label: "Shipping discount cap" },
  ];
  const FUNDING_OPTIONS = [
    { value: "platform", label: "Platform funded" },
    { value: "seller", label: "Company funded" },
    { value: "shared", label: "Shared funded" },
  ];
  const VOUCHER_STEPS = [
    { title: "Voucher details", copy: "Pick the platform and business types, then name the voucher and set when it runs." },
    { title: "Discount & limits", copy: "Set how much buyers save and how often it can be used." },
    { title: "Eligibility", copy: "Choose which users qualify, and who pays." },
    { title: "Review", copy: "Check everything before publishing. Click Edit to change a section." },
  ];

  const BUILT_IN_PLATFORM_ART = Object.freeze({
    shop: "/assets/platform-shop-art.png",
    food: "/assets/platform-food-art.png",
  });
  const ALL_PLATFORM_MARK_URL = "/assets/switch-all-platform-3d-clear.png";
  const FALLBACK_PLATFORMS = [
    { id: "shop", name: "Shop", status: "active", primaryColor: "#0891b2", iconImageUrl: BUILT_IN_PLATFORM_ART.shop, iconName: "store" },
    { id: "food", name: "Food", status: "active", primaryColor: "#ea580c", iconImageUrl: BUILT_IN_PLATFORM_ART.food, iconName: "utensils" },
    { id: "hotels", name: "Hotel", status: "active", primaryColor: "#7c3aed", iconImageUrl: "", iconName: "hotel" },
    { id: "resort", name: "Resort", status: "active", primaryColor: "#0891b2", iconImageUrl: "", iconName: "hotel" },
    { id: "groceries", name: "Groceries", status: "active", primaryColor: "#16a34a", iconImageUrl: "", iconName: "shopping-basket" },
  ];

  const DEFAULT_PLATFORM_COLORS = Object.freeze({
    shop: "#0891b2",
    food: "#ea580c",
    hotels: "#7c3aed",
    resort: "#0891b2",
    groceries: "#16a34a",
  });
  const DEFAULT_VOUCHER_CARD_COLOR = "#e50914";
  const VOUCHER_CARD_PALETTE = Object.freeze([
    "#e50914",
    "#2563eb",
    "#7c3aed",
    "#db2777",
    "#dc2626",
    "#ea580c",
    "#65a30d",
    "#16a34a",
    "#0891b2",
    "#0f172a",
  ]);

  const els = {
    list: document.querySelector("[data-super-admin-vouchers-list]"),
    total: document.querySelector("[data-super-admin-vouchers-total]"),
    pager: document.querySelector("[data-super-admin-vouchers-gmail-pager]"),
    pageMeta: document.querySelector("[data-super-admin-vouchers-page-meta]"),
    pagination: document.querySelector("[data-super-admin-vouchers-pagination]"),
    addButton: document.querySelector("[data-super-admin-voucher-add]"),
    searchInput: document.querySelector("[data-super-admin-vouchers-search]"),
    filterToggle: document.querySelector(
      "[data-super-admin-vouchers-filter-toggle]",
    ),
    filterPanel: document.querySelector(
      "[data-super-admin-vouchers-filter-panel]",
    ),
    filterSummary: document.querySelector(
      "[data-super-admin-vouchers-filter-summary]",
    ),
    filterApply: document.querySelector(
      "[data-super-admin-vouchers-filter-apply]",
    ),
    filterClear: document.querySelector(
      "[data-super-admin-vouchers-filter-clear]",
    ),
    platformRadios: document.querySelector(
      "[data-super-admin-vouchers-platform-radios]",
    ),
    subnav: document.querySelector("[data-super-admin-vouchers-subnav]"),
    modalOverlay: document.getElementById("voucher-modal-overlay"),
    modal: document.getElementById("voucher-modal"),
    form: document.getElementById("voucher-modal-form"),
    closeButton: document.getElementById("voucher-modal-close-button"),
    cancelButton: document.getElementById("voucher-modal-cancel-button"),
    submitButton: document.getElementById("voucher-modal-submit-button"),
    nextButton: document.getElementById("voucher-modal-next-button"),
    backButton: document.getElementById("voucher-modal-back-button"),
    stepTitle: document.querySelector("[data-voucher-step-title]"),
    stepCopy: document.querySelector("[data-voucher-step-copy]"),
    stepNote: document.querySelector("[data-voucher-step-note]"),
    reviewPreview: document.querySelector("[data-voucher-review-preview]"),
    reviewSections: document.querySelector("[data-voucher-review-sections]"),
    modalTitle: document.querySelector("[data-voucher-modal-title]"),
    modalSubtitle: document.querySelector("[data-voucher-modal-subtitle]"),
    submitLabel: document.querySelector("[data-voucher-modal-submit-label]"),
    submitIcon: document.querySelector("[data-voucher-modal-submit-icon]"),
    settingsButton: document.querySelector("[data-voucher-details-settings]"),
    settingsPopover: document.querySelector("[data-voucher-settings-popover]"),
    preview: document.querySelector("[data-voucher-modal-preview]"),
    inventoryTotal: document.querySelector("[data-voucher-modal-inventory-total]"),
    inventoryList: document.querySelector("[data-voucher-modal-inventory-list]"),
    titleInput: document.getElementById("voucher-title-input"),
    codeInput: document.getElementById("voucher-code-input"),
    discountTypeInput: document.getElementById("voucher-discount-type-input"),
    discountTypeToggle: document.getElementById("voucher-discount-type-toggle"),
    discountTypeToggleLabel: document.getElementById(
      "voucher-discount-type-toggle-label",
    ),
    discountValueInput: document.getElementById("voucher-discount-value-input"),
    discountValueLabel: document.getElementById("voucher-discount-value-label"),
    discountValueHelper: document.getElementById("voucher-discount-value-helper"),
    freeShippingInput: document.getElementById("voucher-free-shipping-input"),
    freeShippingToggle: document.getElementById("voucher-free-shipping-toggle"),
    freeShippingToggleLabel: document.getElementById(
      "voucher-free-shipping-toggle-label",
    ),
    minSpendInput: document.getElementById("voucher-min-spend-input"),
    usesPerAccountInput: document.getElementById("voucher-uses-per-account-input"),
    colorInput: document.getElementById("voucher-card-color-input"),
    colorTrigger: document.querySelector("[data-voucher-color-trigger]"),
    colorHex: document.querySelector("[data-voucher-card-color-hex]"),
    colorSwatches: document.querySelector("[data-voucher-color-swatches]"),
    promoPreview: document.querySelector("[data-voucher-modal-promo]"),
    redemptionInput: document.getElementById("voucher-redemption-method-input"),
    redemptionLabel: document.querySelector("[data-voucher-redemption-label]"),
    redemptionHelper: document.getElementById("voucher-redemption-helper"),
    maxDiscountInput: document.getElementById("voucher-max-discount-input"),
    totalUsageInput: document.getElementById("voucher-total-usage-input"),
    priorityInput: document.getElementById("voucher-priority-input"),
    shippingFields: document.querySelector("[data-voucher-shipping-fields]"),
    shippingTypeInput: document.getElementById("voucher-shipping-discount-type-input"),
    shippingTypeLabel: document.querySelector("[data-voucher-shipping-type-label]"),
    shippingCapWrap: document.querySelector("[data-voucher-shipping-cap]"),
    shippingCapInput: document.getElementById("voucher-shipping-cap-input"),
    shippingLocationInput: document.getElementById("voucher-shipping-location-input"),
    shippingLocationLabel: document.querySelector("[data-voucher-shipping-location-label]"),
    shippingMethodsInput: document.getElementById("voucher-shipping-methods-input"),
    scopeTypeInput: document.getElementById("voucher-scope-type-input"),
    includeField: document.querySelector("[data-voucher-include-field]"),
    includeLabel: document.querySelector("[data-voucher-include-label]"),
    includeIdsInput: document.getElementById("voucher-include-ids-input"),
    excludeField: document.querySelector("[data-voucher-exclude-field]"),
    excludeIdsInput: document.getElementById("voucher-exclude-ids-input"),
    categoryPicker: document.querySelector("[data-voucher-category-picker]"),
    categoryList: document.querySelector("[data-voucher-category-list]"),
    categorySearch: document.getElementById("voucher-category-search"),
    businessTypes: document.querySelector("[data-voucher-business-types]"),
    categoryCount: document.querySelector("[data-voucher-category-count]"),
    categoryHelper: document.querySelector("[data-voucher-category-helper]"),
    eligibilityInput: document.getElementById("voucher-eligibility-input"),
    eligibilityLabel: document.querySelector("[data-voucher-eligibility-label]"),
    segmentField: document.querySelector("[data-voucher-segment-field]"),
    segmentIdsInput: document.getElementById("voucher-segment-ids-input"),
    combineFlashInput: document.getElementById("voucher-combine-flash-input"),
    combineFlashToggle: document.getElementById("voucher-combine-flash-toggle"),
    combinePlatformInput: document.getElementById("voucher-combine-platform-input"),
    combinePlatformToggle: document.getElementById("voucher-combine-platform-toggle"),
    combineShippingInput: document.getElementById("voucher-combine-shipping-input"),
    combineShippingToggle: document.getElementById("voucher-combine-shipping-toggle"),
    combineRewardsInput: document.getElementById("voucher-combine-rewards-input"),
    combineRewardsToggle: document.getElementById("voucher-combine-rewards-toggle"),
    fundingInput: document.getElementById("voucher-funding-input"),
    fundingLabel: document.querySelector("[data-voucher-funding-label]"),
    platformShareInput: document.getElementById("voucher-platform-share-input"),
    sellerShareInput: document.getElementById("voucher-seller-share-input"),
    budgetInput: document.getElementById("voucher-budget-input"),
    schedulePreview: document.querySelector("[data-voucher-schedule-preview]"),
    datePicker: document.getElementById("voucher-date-picker"),
    dateInput: document.getElementById("voucher-date-input"),
    dateTrigger: document.getElementById("voucher-date-trigger"),
    dateValue: document.querySelector("[data-voucher-date-value]"),
    timePicker: document.getElementById("voucher-time-picker"),
    timeInput: document.getElementById("voucher-time-input"),
    timeTrigger: document.getElementById("voucher-time-trigger"),
    startDatePicker: document.getElementById("voucher-start-date-picker"),
    startDateInput: document.getElementById("voucher-start-date-input"),
    startDateTrigger: document.getElementById("voucher-start-date-trigger"),
    startTimePicker: document.getElementById("voucher-start-time-picker"),
    startTimeInput: document.getElementById("voucher-start-time-input"),
    startTimeTrigger: document.getElementById("voucher-start-time-trigger"),
    repeatInput: document.getElementById("voucher-repeat-input"),
    repeatToggle: document.getElementById("voucher-repeat-toggle"),
    repeatToggleLabel: document.getElementById("voucher-repeat-toggle-label"),
    repeatPanel: document.getElementById("voucher-repeat-panel"),
    repeatDaysToggle: document.getElementById("voucher-repeat-days-toggle"),
    repeatDaysLabel: document.querySelector("[data-voucher-repeat-days-label]"),
    repeatDaysMenu: document.getElementById("voucher-repeat-days-menu"),
    repeatStartTimePicker: document.getElementById("voucher-repeat-start-time-picker"),
    repeatStartTimeInput: document.getElementById("voucher-repeat-start-time-input"),
    repeatStartTimeTrigger: document.getElementById("voucher-repeat-start-time-trigger"),
    repeatEndTimePicker: document.getElementById("voucher-repeat-end-time-picker"),
    repeatEndTimeInput: document.getElementById("voucher-repeat-end-time-input"),
    repeatEndTimeTrigger: document.getElementById("voucher-repeat-end-time-trigger"),
    platformSelect: document.getElementById("voucher-platform-select"),
    platformToggle: document.getElementById("voucher-platform-toggle"),
    platformLabel: document.querySelector("[data-voucher-platform-label]"),
    platformMenu: document.getElementById("voucher-platform-menu"),
  };

  const state = {
    items: [],
    platforms: FALLBACK_PLATFORMS.slice(),
    storeTypes: [],
    businessTypes: new Set(),
    businessTypeKnown: new Set(),
    businessTypeHydrate: null,
    categorySearch: "",
    voucherPlatforms: { all: false, ids: new Set() },
    modalStep: 1,
    loading: false,
    bound: false,
    page: 1,
    pageSize: 10,
    total: 0,
    requestSeq: 0,
    searchTimer: 0,
    saving: false,
    editingId: "",
    editingVoucher: null,
    filters: filtersFromQuickView(getSavedQuickView()),
    quickView: getSavedQuickView(),
    subnav: { ...EMPTY_SUBNAV, platforms: [] },
    subnavReady: false,
    voucherModalTrigger: null,
    closeTimer: 0,
    dateCalendar: null,
    dateViewMonth: null,
    dateDraft: null,
    datePositionFrame: 0,
    datePickerBound: false,
    timePickerBound: false,
    startPickerBound: false,
    repeatPickerBound: false,
    countdownTimer: 0,
    cardColor: DEFAULT_VOUCHER_CARD_COLOR,
    reviewPreviewHeightFrame: 0,
    reviewResizeObserver: null,
  };

  function refreshElements() {
    els.list = document.querySelector("[data-super-admin-vouchers-list]");
    els.total = document.querySelector("[data-super-admin-vouchers-total]");
    els.pager = document.querySelector("[data-super-admin-vouchers-gmail-pager]");
    els.pageMeta = document.querySelector("[data-super-admin-vouchers-page-meta]");
    els.pagination = document.querySelector("[data-super-admin-vouchers-pagination]");
    els.addButton = document.querySelector("[data-super-admin-voucher-add]");
    els.searchInput = document.querySelector("[data-super-admin-vouchers-search]");
    els.filterToggle = document.querySelector(
      "[data-super-admin-vouchers-filter-toggle]",
    );
    els.filterPanel = document.querySelector(
      "[data-super-admin-vouchers-filter-panel]",
    );
    els.filterSummary = document.querySelector(
      "[data-super-admin-vouchers-filter-summary]",
    );
    els.filterApply = document.querySelector(
      "[data-super-admin-vouchers-filter-apply]",
    );
    els.filterClear = document.querySelector(
      "[data-super-admin-vouchers-filter-clear]",
    );
    els.platformRadios = document.querySelector(
      "[data-super-admin-vouchers-platform-radios]",
    );
    els.subnav = document.querySelector("[data-super-admin-vouchers-subnav]");
    els.modalOverlay = document.getElementById("voucher-modal-overlay");
    els.modal = document.getElementById("voucher-modal");
    els.form = document.getElementById("voucher-modal-form");
    els.closeButton = document.getElementById("voucher-modal-close-button");
    els.cancelButton = document.getElementById("voucher-modal-cancel-button");
    els.submitButton = document.getElementById("voucher-modal-submit-button");
    els.nextButton = document.getElementById("voucher-modal-next-button");
    els.backButton = document.getElementById("voucher-modal-back-button");
    els.stepTitle = document.querySelector("[data-voucher-step-title]");
    els.stepCopy = document.querySelector("[data-voucher-step-copy]");
    els.stepNote = document.querySelector("[data-voucher-step-note]");
    els.reviewPreview = document.querySelector("[data-voucher-review-preview]");
    els.reviewSections = document.querySelector("[data-voucher-review-sections]");
    els.modalTitle = document.querySelector("[data-voucher-modal-title]");
    els.modalSubtitle = document.querySelector("[data-voucher-modal-subtitle]");
    els.submitLabel = document.querySelector("[data-voucher-modal-submit-label]");
    els.submitIcon = document.querySelector("[data-voucher-modal-submit-icon]");
    els.settingsButton = document.querySelector("[data-voucher-details-settings]");
    els.settingsPopover = document.querySelector("[data-voucher-settings-popover]");
    els.preview = document.querySelector("[data-voucher-modal-preview]");
    els.inventoryTotal = document.querySelector("[data-voucher-modal-inventory-total]");
    els.inventoryList = document.querySelector("[data-voucher-modal-inventory-list]");
    els.titleInput = document.getElementById("voucher-title-input");
    els.codeInput = document.getElementById("voucher-code-input");
    els.discountTypeInput = document.getElementById("voucher-discount-type-input");
    els.discountTypeToggle = document.getElementById("voucher-discount-type-toggle");
    els.discountTypeToggleLabel = document.getElementById(
      "voucher-discount-type-toggle-label",
    );
    els.discountValueInput = document.getElementById("voucher-discount-value-input");
    els.discountValueLabel = document.getElementById("voucher-discount-value-label");
    els.discountValueHelper = document.getElementById(
      "voucher-discount-value-helper",
    );
    els.freeShippingInput = document.getElementById("voucher-free-shipping-input");
    els.freeShippingToggle = document.getElementById("voucher-free-shipping-toggle");
    els.freeShippingToggleLabel = document.getElementById(
      "voucher-free-shipping-toggle-label",
    );
    els.minSpendInput = document.getElementById("voucher-min-spend-input");
    els.usesPerAccountInput = document.getElementById("voucher-uses-per-account-input");
    els.colorInput = document.getElementById("voucher-card-color-input");
    els.colorTrigger = document.querySelector("[data-voucher-color-trigger]");
    els.colorHex = document.querySelector("[data-voucher-card-color-hex]");
    els.colorSwatches = document.querySelector("[data-voucher-color-swatches]");
    els.promoPreview = document.querySelector("[data-voucher-modal-promo]");
    els.redemptionInput = document.getElementById("voucher-redemption-method-input");
    els.redemptionLabel = document.querySelector("[data-voucher-redemption-label]");
    els.redemptionHelper = document.getElementById("voucher-redemption-helper");
    els.maxDiscountInput = document.getElementById("voucher-max-discount-input");
    els.totalUsageInput = document.getElementById("voucher-total-usage-input");
    els.priorityInput = document.getElementById("voucher-priority-input");
    els.shippingFields = document.querySelector("[data-voucher-shipping-fields]");
    els.shippingTypeInput = document.getElementById("voucher-shipping-discount-type-input");
    els.shippingTypeLabel = document.querySelector("[data-voucher-shipping-type-label]");
    els.shippingCapWrap = document.querySelector("[data-voucher-shipping-cap]");
    els.shippingCapInput = document.getElementById("voucher-shipping-cap-input");
    els.shippingLocationInput = document.getElementById("voucher-shipping-location-input");
    els.shippingLocationLabel = document.querySelector("[data-voucher-shipping-location-label]");
    els.shippingMethodsInput = document.getElementById("voucher-shipping-methods-input");
    els.scopeTypeInput = document.getElementById("voucher-scope-type-input");
    els.includeField = document.querySelector("[data-voucher-include-field]");
    els.includeLabel = document.querySelector("[data-voucher-include-label]");
    els.includeIdsInput = document.getElementById("voucher-include-ids-input");
    els.excludeField = document.querySelector("[data-voucher-exclude-field]");
    els.excludeIdsInput = document.getElementById("voucher-exclude-ids-input");
    els.categoryPicker = document.querySelector("[data-voucher-category-picker]");
    els.categoryList = document.querySelector("[data-voucher-category-list]");
    els.categorySearch = document.getElementById("voucher-category-search");
    els.businessTypes = document.querySelector("[data-voucher-business-types]");
    els.categoryCount = document.querySelector("[data-voucher-category-count]");
    els.categoryHelper = document.querySelector("[data-voucher-category-helper]");
    els.eligibilityInput = document.getElementById("voucher-eligibility-input");
    els.eligibilityLabel = document.querySelector("[data-voucher-eligibility-label]");
    els.segmentField = document.querySelector("[data-voucher-segment-field]");
    els.segmentIdsInput = document.getElementById("voucher-segment-ids-input");
    els.combineFlashInput = document.getElementById("voucher-combine-flash-input");
    els.combineFlashToggle = document.getElementById("voucher-combine-flash-toggle");
    els.combinePlatformInput = document.getElementById("voucher-combine-platform-input");
    els.combinePlatformToggle = document.getElementById("voucher-combine-platform-toggle");
    els.combineShippingInput = document.getElementById("voucher-combine-shipping-input");
    els.combineShippingToggle = document.getElementById("voucher-combine-shipping-toggle");
    els.combineRewardsInput = document.getElementById("voucher-combine-rewards-input");
    els.combineRewardsToggle = document.getElementById("voucher-combine-rewards-toggle");
    els.fundingInput = document.getElementById("voucher-funding-input");
    els.fundingLabel = document.querySelector("[data-voucher-funding-label]");
    els.platformShareInput = document.getElementById("voucher-platform-share-input");
    els.sellerShareInput = document.getElementById("voucher-seller-share-input");
    els.budgetInput = document.getElementById("voucher-budget-input");
    els.schedulePreview = document.querySelector("[data-voucher-schedule-preview]");
    els.datePicker = document.getElementById("voucher-date-picker");
    els.dateInput = document.getElementById("voucher-date-input");
    els.dateTrigger = document.getElementById("voucher-date-trigger");
    els.dateValue = document.querySelector("[data-voucher-date-value]");
    els.timePicker = document.getElementById("voucher-time-picker");
    els.timeInput = document.getElementById("voucher-time-input");
    els.timeTrigger = document.getElementById("voucher-time-trigger");
    els.startDatePicker = document.getElementById("voucher-start-date-picker");
    els.startDateInput = document.getElementById("voucher-start-date-input");
    els.startDateTrigger = document.getElementById("voucher-start-date-trigger");
    els.startTimePicker = document.getElementById("voucher-start-time-picker");
    els.startTimeInput = document.getElementById("voucher-start-time-input");
    els.startTimeTrigger = document.getElementById("voucher-start-time-trigger");
    els.repeatInput = document.getElementById("voucher-repeat-input");
    els.repeatToggle = document.getElementById("voucher-repeat-toggle");
    els.repeatToggleLabel = document.getElementById("voucher-repeat-toggle-label");
    els.repeatPanel = document.getElementById("voucher-repeat-panel");
    els.repeatDaysToggle = document.getElementById("voucher-repeat-days-toggle");
    els.repeatDaysLabel = document.querySelector("[data-voucher-repeat-days-label]");
    els.repeatDaysMenu = document.getElementById("voucher-repeat-days-menu");
    els.repeatStartTimePicker = document.getElementById("voucher-repeat-start-time-picker");
    els.repeatStartTimeInput = document.getElementById("voucher-repeat-start-time-input");
    els.repeatStartTimeTrigger = document.getElementById("voucher-repeat-start-time-trigger");
    els.repeatEndTimePicker = document.getElementById("voucher-repeat-end-time-picker");
    els.repeatEndTimeInput = document.getElementById("voucher-repeat-end-time-input");
    els.repeatEndTimeTrigger = document.getElementById("voucher-repeat-end-time-trigger");
    els.platformSelect = document.getElementById("voucher-platform-select");
    els.platformToggle = document.getElementById("voucher-platform-toggle");
    els.platformLabel = document.querySelector("[data-voucher-platform-label]");
    els.platformMenu = document.getElementById("voucher-platform-menu");
  }

  function headers(extra = {}) {
    let token = "";
    try {
      const raw =
        sessionStorage.getItem("gms-super-admin-session") ||
        localStorage.getItem("gms-super-admin-session");
      const session = raw ? JSON.parse(raw) : null;
      token = String(session?.token || "").trim();
    } catch (_) {
      token = "";
    }
    return {
      Accept: "application/json",
      ...extra,
      ...(token ? { "X-GMS-Super-Admin-Token": token } : {}),
    };
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  const COPY_ICON_MARKUP = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect>
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
    </svg>
  `;

  // Same Lucide hover icons as Companies / Business Type showcase.
  const VOUCHER_ACTION_ICON = Object.freeze({
    edit: '<path d="M13 21h8"></path><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"></path>',
    trash:
      window.SwitchDefaultIcons?.paths?.trash
      || '<path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path><path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>',
    pause: '<rect x="14" y="4" width="4" height="16" rx="1"></rect><rect x="6" y="4" width="4" height="16" rx="1"></rect>',
    play: '<polygon points="6 3 20 12 6 21 6 3"></polygon>',
    copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>',
  });

  function voucherActionIconSvg(paths) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths}</svg>`;
  }

  function uniqueIdSettingHtml(value, label) {
    const normalized = String(value || "").trim();
    if (!normalized) {
      return `
        <span class="business-type-showcase__setting sa-voucher-showcase__setting sa-voucher-showcase__setting--id">
          <span class="business-type-showcase__setting-label">${escapeHtml(label)}</span>
          <span class="business-type-showcase__setting-value">
            <span class="platform-feedback-list-row__feedback-id-copy super-admin-company-copy-field">
              <span class="super-admin-company-copy-field__text">—</span>
            </span>
          </span>
        </span>
      `;
    }
    return `
      <span class="business-type-showcase__setting sa-voucher-showcase__setting sa-voucher-showcase__setting--id">
        <span class="business-type-showcase__setting-label">${escapeHtml(label)}</span>
        <span class="business-type-showcase__setting-value">
          <span class="platform-feedback-list-row__feedback-id-copy super-admin-company-copy-field">
            <span class="super-admin-company-copy-field__text">${escapeHtml(normalized)}</span>
            <button
              type="button"
              class="super-admin-company-copy-button"
              data-company-contact-copy="${escapeHtml(normalized)}"
              data-company-contact-label="${escapeHtml(label)}"
              aria-label="Copy ${escapeHtml(label.toLowerCase())}"
              title="Copy ${escapeHtml(label.toLowerCase())}"
            >${COPY_ICON_MARKUP}</button>
          </span>
        </span>
      </span>
    `;
  }

  function setPageFeedback(message, tone = "notice") {
    const feedback = document.querySelector(
      ".feedback-note, #feedback-note, [data-super-admin-feedback]",
    );
    if (feedback instanceof HTMLElement) {
      feedback.textContent = message;
      feedback.classList.remove("error", "notice", "success");
      if (tone) feedback.classList.add(tone);
    }
  }

  function setModalFeedback(message, tone = "") {
    const text = String(message || "").replace(/\s+/g, " ").trim();
    if (!text || /^(Creating voucher|Saving changes)/i.test(text)) return;
    const mode = tone === "error" ? "error" : tone === "success" ? "success" : "warning";
    const title = tone === "error" ? "Check voucher" : "Voucher";
    if (typeof window.showSuperAdminSnackbar === "function") {
      window.showSuperAdminSnackbar(title, text, mode);
    }
  }

  function normalizePlatformId(value) {
    return String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "")
      .slice(0, 40);
  }

  function normalizeHexColor(value, fallback = "") {
    const raw = String(value || "").trim().toLowerCase();
    if (/^#[0-9a-f]{6}$/.test(raw)) return raw;
    if (/^[0-9a-f]{6}$/.test(raw)) return `#${raw}`;
    return fallback;
  }

  function cssColorToHex(value) {
    const raw = String(value || "").trim();
    const hex = normalizeHexColor(raw);
    if (hex) return hex;
    const match = raw.match(/^rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})/i);
    if (!match) return "";
    return `#${match
      .slice(1, 4)
      .map((part) => Math.min(255, Number(part)).toString(16).padStart(2, "0"))
      .join("")}`;
  }

  function activeWorkspaceColor() {
    const shared = normalizeHexColor(window.WebTheme?.getWorkspaceColor?.());
    if (shared) return shared;
    try {
      const saved = normalizeHexColor(window.localStorage.getItem("gms-workspace-color"));
      if (saved) return saved;
    } catch (_error) {
      // Storage can be blocked; the computed accent below still works.
    }
    const accent = cssColorToHex(
      window.getComputedStyle(document.documentElement).getPropertyValue("--accent"),
    );
    return accent || DEFAULT_VOUCHER_CARD_COLOR;
  }

  function isSuperAdminVoucher(voucher) {
    return !String(voucher?.sellerAdminId || "").trim();
  }

  function resolveCardColor(voucher) {
    const explicit = normalizeHexColor(voucher?.cardColor);
    if (explicit) return explicit;
    const platformId = resolveVoucherMarkPlatformId(voucher);
    if (platformId && platformId !== "all") {
      return resolvePlatformPrimaryColor(platformId);
    }
    return isSuperAdminVoucher(voucher)
      ? activeWorkspaceColor()
      : DEFAULT_VOUCHER_CARD_COLOR;
  }

  function resolveShopColor(voucher) {
    const platformId = resolveVoucherMarkPlatformId(voucher);
    if (platformId && platformId !== "all") {
      return resolvePlatformPrimaryColor(platformId);
    }
    return isSuperAdminVoucher(voucher)
      ? activeWorkspaceColor()
      : resolvePlatformPrimaryColor("shop");
  }

  function inferSellerPlatformId(voucher) {
    const sellerId = String(voucher?.sellerAdminId || "").trim();
    const safe = window.CSS?.escape ? window.CSS.escape(sellerId) : sellerId.replace(/["\\]/g, "");
    const card = sellerId
      ? document.querySelector(
          `.super-admin-company-card[data-company-id="${safe}"], [data-company-id="${safe}"]`,
        )
      : null;
    const hay = [
      voucher?.sellerPlatformId,
      voucher?.badge,
      voucher?.title,
      sellerId,
      card?.dataset?.storeType,
      card?.dataset?.businessType,
      card?.dataset?.platformId,
      card?.textContent,
    ]
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const platforms = state.platforms.length ? state.platforms : FALLBACK_PLATFORMS;
    const named = platforms.find((entry) => {
      const id = String(entry.id || "").toLowerCase();
      const name = String(entry.name || "").toLowerCase();
      return (id && hay.includes(id)) || (name && hay.includes(name));
    });
    if (named?.id) return named.id;
    if (hay.includes("resort")) {
      const resort = platforms.find(
        (entry) =>
          entry.id === "resort" || String(entry.name || "").toLowerCase().includes("resort"),
      );
      if (resort?.id) return resort.id;
    }
    if (
      hay.includes("hotel")
      || hay.includes("restaurant")
      || hay.includes("resto")
    ) {
      const hotels = platforms.find(
        (entry) =>
          entry.id === "hotels" || String(entry.name || "").toLowerCase().includes("hotel"),
      );
      return hotels?.id || "hotels";
    }
    return "";
  }

  function resolveVoucherMarkPlatformId(voucher) {
    const sellerPlatform = normalizePlatformId(voucher?.sellerPlatformId);
    if (sellerPlatform && sellerPlatform !== "all") return sellerPlatform;
    const id = normalizePlatformId(voucher?.platformId);
    if (id && id !== "all") return id;
    if (String(voucher?.sellerAdminId || "").trim()) {
      return inferSellerPlatformId(voucher);
    }
    return "";
  }

  function resolvePlatformIconUrl(platformId) {
    const id = normalizePlatformId(platformId);
    const match = state.platforms.find((entry) => entry.id === id);
    return String(
      match?.iconImageUrl || match?.iconUrl || BUILT_IN_PLATFORM_ART[id] || "",
    ).trim();
  }

  function platformIconSvg(iconName) {
    const name = String(iconName || "")
      .trim()
      .toLowerCase()
      .replace(/^(lucide:|tabler:)/, "");
    const paths = {
      store:
        '<path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7"/>',
      utensils:
        '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
      hotel:
        '<path d="M10 22v-6.57"/><path d="M12 11h.01"/><path d="M12 7h.01"/><path d="M14 15.43V22"/><path d="M15 16a5 5 0 0 0-6 0"/><path d="M16 11h.01"/><path d="M16 7h.01"/><path d="M8 11h.01"/><path d="M8 7h.01"/><rect x="4" y="2" width="16" height="20" rx="2"/>',
      "shopping-basket":
        '<path d="m5 11 4-7"/><path d="m19 11-4-7"/><path d="M2 11h20"/><path d="m3.5 11 1.6 7.4a2 2 0 0 0 2 1.6h9.8c.9 0 1.8-.7 2-1.6l1.7-7.4"/><path d="m9 11 1 9"/><path d="M4.5 15.5h15"/><path d="m15 11-1 9"/>',
      croissant:
        '<path d="M4.4 14.9A7 7 0 0 1 12 4.6a7 7 0 0 1 7.6 10.3"/><path d="M12 4.6a7 7 0 0 0 0 14.8"/><path d="M12 19.4a7 7 0 0 0 0-14.8"/><path d="M4.4 14.9c1.5 2.8 4.3 4.5 7.6 4.5s6.1-1.7 7.6-4.5"/>',
      coffee:
        '<path d="M10 2v2"/><path d="M14 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/><path d="M6 2v2"/>',
    };
    const d = paths[name];
    if (!d) return "";
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  }

  function resolvePlatformIconFromPage(platformId) {
    const id = normalizePlatformId(platformId);
    if (!id) return "";
    const safe = window.CSS?.escape ? window.CSS.escape(id) : id.replace(/["\\]/g, "");
    const root = document.querySelector(`[data-platform-id="${safe}"]`);
    if (!root) return "";
    const img = root.querySelector(".business-type-showcase__icon img, .has-platform-art img");
    const src = String(img?.currentSrc || img?.getAttribute("src") || "").trim();
    if (src) return `<img src="${escapeHtml(src)}" alt="" />`;
    const svg = root.querySelector(".business-type-showcase__icon svg");
    return svg ? svg.outerHTML : "";
  }

  function isAllPlatformSaVoucher(voucher) {
    if (String(voucher?.sellerAdminId || "").trim()) return false;
    const id = normalizePlatformId(voucher?.platformId);
    return !id || id === "all";
  }

  function platformMarkHtml(platformId, voucher = null) {
    if (voucher && isAllPlatformSaVoucher(voucher)) {
      return `<span class="sa-voucher-promo__platform-mark is-switch-all" aria-hidden="true"><img src="${escapeHtml(ALL_PLATFORM_MARK_URL)}" alt="" /></span>`;
    }
    const id = normalizePlatformId(platformId);
    const match = state.platforms.find((entry) => entry.id === id);
    const url = resolvePlatformIconUrl(id);
    const iconName =
      match?.iconName ||
      (id === "hotels" || id === "resort" ? "hotel" : "") ||
      (id === "food" ? "utensils" : "") ||
      (id === "groceries" ? "shopping-basket" : "") ||
      (id === "shop" ? "store" : "");
    const mark =
      resolvePlatformIconFromPage(id) ||
      (url ? `<img src="${escapeHtml(url)}" alt="" />` : "") ||
      platformIconSvg(iconName);
    if (!mark) return "";
    return `<span class="sa-voucher-promo__platform-mark" aria-hidden="true">${mark}</span>`;
  }

  const BUSINESS_TYPE_ICON_ALIASES = Object.freeze({
    bakery: "croissant",
    bakeries: "croissant",
    pastry: "croissant",
    pastries: "croissant",
    restaurant: "utensils",
    resto: "utensils",
    food: "utensils",
    cafe: "coffee",
    coffee: "coffee",
    shop: "store",
    store: "store",
    grocery: "shopping-basket",
    groceries: "shopping-basket",
    hotel: "hotel",
    hotels: "hotel",
    resort: "hotel",
  });

  function lucideExportName(iconName) {
    return String(iconName || "")
      .trim()
      .replace(/^(lucide:|tabler:)/i, "")
      .split(/[-_\s]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join("");
  }

  function tablerIconMarkup(iconName) {
    const raw = String(iconName || "").trim().toLowerCase();
    const match = raw.match(/^tabler(?::|-)(.+)$/);
    if (!match) return "";
    const slug = match[1].replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
    const paths = window.tablerIcons?.icons?.[slug];
    if (!slug || !paths) return "";
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths}</svg>`;
  }

  function lucideIconMarkup(iconName) {
    const name = String(iconName || "").trim();
    if (!name) return "";
    const tabler = tablerIconMarkup(name);
    if (tabler) return tabler;
    const exportName = lucideExportName(BUSINESS_TYPE_ICON_ALIASES[name.toLowerCase()] || name);
    const icons = window.lucide?.icons;
    if (!exportName || !icons?.[exportName] || !window.lucide?.createElement) return "";
    const svg = window.lucide.createElement(icons[exportName], { "aria-hidden": "true" });
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "1.6");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    return svg.outerHTML;
  }

  function matchLoadedStoreType(typeName) {
    const key = String(typeName || "").trim().toLowerCase();
    if (!key) return null;
    return (state.storeTypes || []).find((entry) => {
      const names = [entry?.name, entry?.storeType, entry?.storeTypeName, entry?.businessType]
        .map((value) => String(value || "").trim().toLowerCase());
      return names.includes(key);
    }) || null;
  }

  function creatorBusinessTypeIconHtml(voucher) {
    const sellerId = String(voucher?.sellerAdminId || "").trim();
    const typeName = String(voucher?.businessType || "").trim();
    if (!sellerId && !typeName) return "";
    const loaded = matchLoadedStoreType(typeName);
    const iconUrl = String(
      voucher?.businessTypeIconUrl ||
        loaded?.iconImageUrl ||
        loaded?.iconUrl ||
        loaded?.businessTypeIconUrl ||
        "",
    ).trim();
    if (iconUrl) {
      return `<img src="${escapeHtml(iconUrl)}" alt="" />`;
    }
    const iconName = String(
      voucher?.businessTypeIconName || loaded?.iconName || loaded?.lucideIconName || "",
    ).trim();
    const lucide = lucideIconMarkup(iconName) || lucideIconMarkup(typeName);
    if (lucide) return lucide;
    const alias =
      BUSINESS_TYPE_ICON_ALIASES[String(iconName || typeName).trim().toLowerCase()] ||
      iconName ||
      typeName;
    const fromPlatform = platformIconSvg(alias);
    if (fromPlatform) return fromPlatform;
    if (!typeName && !iconName) return "";
    return `<i class="fa-solid fa-store" aria-hidden="true"></i>`;
  }

  function creatorBusinessTypeGlowHtml() {
    return `<div class="sa-voucher-showcase__media-glow" aria-hidden="true"></div>`;
  }

  function cardInkColor(hex) {
    const color = normalizeHexColor(hex, DEFAULT_VOUCHER_CARD_COLOR);
    const match = color.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
    if (!match) return "#ffffff";
    const r = Number.parseInt(match[1], 16);
    const g = Number.parseInt(match[2], 16);
    const b = Number.parseInt(match[3], 16);
    return (r * 299 + g * 587 + b * 114) / 1000 >= 180 ? "#111827" : "#ffffff";
  }

  function padClock(value) {
    return String(Math.max(0, Math.floor(Number(value) || 0))).padStart(2, "0");
  }

  function clockUnitHtml(key, value, label) {
    const next = padClock(value);
    return `<div class="sa-voucher-promo__unit"><strong class="sa-voucher-promo__digits sa-flip-tile" data-voucher-cd="${key}" data-cd-current="${next}"><span class="sa-flip-tile__flap is-top" data-cd-top><span>${next}</span></span><span class="sa-flip-tile__flap is-bottom" data-cd-bottom aria-hidden="true"><span>${next}</span></span></strong><span>${label}</span></div>`;
  }

  function countdownPartsFromMs(endMs) {
    const remain = Math.max(0, Number(endMs) - Date.now());
    const totalSec = Math.floor(remain / 1000);
    return {
      days: Math.floor(totalSec / 86400),
      hours: Math.floor((totalSec % 86400) / 3600),
      minutes: Math.floor((totalSec % 3600) / 60),
      seconds: totalSec % 60,
      expired: !endMs || remain <= 0,
    };
  }

  function voucherExpiryMs(voucher) {
    const fromDisplay = parseVoucherDisplayDate(voucher?.date);
    if (fromDisplay instanceof Date && !Number.isNaN(fromDisplay.getTime())) {
      if (!/:\d{2}\s*[AP]M$/i.test(String(voucher?.date || ""))) {
        fromDisplay.setHours(23, 59, 0, 0);
      }
      return fromDisplay.getTime();
    }
    const parsed = parseVoucherDateInputValue(voucher?.date);
    if (parsed instanceof Date) {
      const time = parseVoucherTimeInputValue(voucher?.time) || {
        hours: 23,
        minutes: 59,
      };
      return new Date(
        parsed.getFullYear(),
        parsed.getMonth(),
        parsed.getDate(),
        time.hours,
        time.minutes,
        0,
        0,
      ).getTime();
    }
    return 0;
  }

  function voucherStartMs(voucher) {
    const fromDisplay = parseVoucherDisplayDate(voucher?.startDate);
    if (fromDisplay instanceof Date && !Number.isNaN(fromDisplay.getTime())) {
      if (!/:\d{2}\s*[AP]M$/i.test(String(voucher?.startDate || ""))) {
        fromDisplay.setHours(0, 0, 0, 0);
      }
      return fromDisplay.getTime();
    }
    const parsed = parseVoucherDateInputValue(voucher?.startDate);
    if (parsed instanceof Date) {
      const time = parseVoucherTimeInputValue(voucher?.startTime) || {
        hours: 0,
        minutes: 0,
      };
      return new Date(
        parsed.getFullYear(),
        parsed.getMonth(),
        parsed.getDate(),
        time.hours,
        time.minutes,
        0,
        0,
      ).getTime();
    }
    return 0;
  }

  function isVoucherUpcoming(voucher) {
    const startMs = voucherStartMs(voucher);
    return Boolean(startMs && startMs > Date.now());
  }

  function isComingSoonVoucher(voucher) {
    const status = String(voucher?.status || "").trim().toLowerCase();
    if (status === "expired" || status === "used") return false;
    return isVoucherUpcoming(voucher);
  }

  function isEndingSoonVoucher(voucher) {
    const status = String(voucher?.status || "").trim().toLowerCase();
    if (status === "expired" || status === "used") return false;
    if (isVoucherUpcoming(voucher)) return false;
    const endMs = voucherExpiryMs(voucher);
    const now = Date.now();
    return Boolean(endMs && endMs > now && endMs - now <= 7 * 24 * 60 * 60 * 1000);
  }

  const REPEAT_DAY_KEYS = Object.freeze(["sun", "mon", "tue", "wed", "thu", "fri", "sat"]);
  const REPEAT_DAY_LABELS = Object.freeze({
    sun: "Sunday",
    mon: "Monday",
    tue: "Tuesday",
    wed: "Wednesday",
    thu: "Thursday",
    fri: "Friday",
    sat: "Saturday",
  });
  const REPEAT_DAY_SHORT = Object.freeze({
    sun: "Sun",
    mon: "Mon",
    tue: "Tue",
    wed: "Wed",
    thu: "Thu",
    fri: "Fri",
    sat: "Sat",
  });

  function normalizeRepeatDays(value) {
    const list = Array.isArray(value)
      ? value
      : String(value || "").split(/[,\s]+/).filter(Boolean);
    const picked = new Set(
      list
        .map((entry) => String(entry || "").trim().toLowerCase().slice(0, 3))
        .filter((key) => REPEAT_DAY_KEYS.includes(key)),
    );
    return REPEAT_DAY_KEYS.filter((day) => picked.has(day));
  }

  function isRepeatWeeklyVoucher(voucher) {
    return Boolean(voucher?.repeatWeekly);
  }

  function addRepeatCalendarDay(parts, amount) {
    const utc = Date.UTC(parts.year, parts.month - 1, parts.day + amount);
    const next = new Date(utc);
    return {
      year: next.getUTCFullYear(),
      month: next.getUTCMonth() + 1,
      day: next.getUTCDate(),
    };
  }

  function manilaClockParts(date = new Date()) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Manila",
      weekday: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);
    const read = (type) => parts.find((part) => part.type === type)?.value || "";
    const weekday = String(read("weekday") || "").trim().toLowerCase().slice(0, 3);
    return {
      weekday: REPEAT_DAY_KEYS.includes(weekday) ? weekday : "",
      year: Number(read("year")),
      month: Number(read("month")),
      day: Number(read("day")),
      hours: Number(read("hour")),
      minutes: Number(read("minute")),
    };
  }

  function manilaLocalMs(year, month, day, hours, minutes) {
    const stamp = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00+08:00`;
    const ms = Date.parse(stamp);
    return Number.isNaN(ms) ? null : ms;
  }

  function resolveRepeatWindow(voucher, now = Date.now()) {
    if (!isRepeatWeeklyVoucher(voucher)) return null;
    const days = normalizeRepeatDays(voucher.repeatDays);
    const startHm = parseVoucherTimeInputValue(voucher.repeatStartTime);
    const endHm = parseVoucherTimeInputValue(voucher.repeatEndTime) || {
      hours: 0,
      minutes: 0,
    };
    if (!days.length || !startHm) return null;
    const clock = manilaClockParts(new Date(now));
    if (!clock.weekday || !clock.year) return null;
    const weekdayIndex = REPEAT_DAY_KEYS.indexOf(clock.weekday);
    const today = { year: clock.year, month: clock.month, day: clock.day };
    let open = null;
    let next = null;
    for (let offset = -1; offset <= 8; offset += 1) {
      const dayKey = REPEAT_DAY_KEYS[(weekdayIndex + offset + 70) % 7];
      if (!days.includes(dayKey)) continue;
      const dayParts = addRepeatCalendarDay(today, offset);
      const startMs = manilaLocalMs(
        dayParts.year,
        dayParts.month,
        dayParts.day,
        startHm.hours,
        startHm.minutes,
      );
      const wraps =
        startHm.hours * 60 + startHm.minutes >= endHm.hours * 60 + endHm.minutes;
      const endParts = wraps ? addRepeatCalendarDay(dayParts, 1) : dayParts;
      const endMs = manilaLocalMs(
        endParts.year,
        endParts.month,
        endParts.day,
        endHm.hours,
        endHm.minutes,
      );
      if (startMs == null || endMs == null) continue;
      if (now >= startMs && now < endMs) {
        open = { startMs, endMs };
        break;
      }
      if (!next && startMs > now) next = { startMs, endMs };
    }
    if (open) return { open: true, startMs: open.startMs, endMs: open.endMs };
    if (next) return { open: false, startMs: next.startMs, endMs: next.endMs };
    return { open: false, startMs: 0, endMs: 0 };
  }

  function voucherLiveSchedule(voucher, now = Date.now()) {
    const startMs = voucherStartMs(voucher) || 0;
    const expireMs = voucherExpiryMs(voucher) || 0;
    const expired = Boolean(expireMs && expireMs <= now);
    const windowInfo = resolveRepeatWindow(voucher, now);
    let liveStart = startMs;
    let liveEnd = expireMs;
    let upcoming = Boolean(startMs && startMs > now);
    if (!expired && windowInfo) {
      if (windowInfo.open) {
        liveEnd = expireMs ? Math.min(expireMs, windowInfo.endMs) : windowInfo.endMs;
        upcoming = false;
      } else {
        liveStart = Math.max(startMs, windowInfo.startMs || 0);
        upcoming = Boolean(liveStart && liveStart > now);
        liveEnd = windowInfo.endMs || expireMs;
      }
    }
    return { upcoming, expired, startMs: liveStart, endMs: liveEnd };
  }

  function voucherRef(voucher) {
    return String(voucher?.id || voucher?.scheduleId || "").trim();
  }

  function findVoucherByRef(voucherId) {
    const wanted = String(voucherId || "").trim();
    if (!wanted) return null;
    return state.items.find((entry) => voucherRef(entry) === wanted) || null;
  }

  function displayVoucherStatus(voucher) {
    const status = resolveVoucherStatus(voucher);
    if (
      (status === "active" || status === "scheduled") &&
      voucherLiveSchedule(voucher).upcoming
    ) {
      return "unavailable";
    }
    return status;
  }

  function voucherOfferHeadline(voucher) {
    const discountType = normalizeDiscountType(
      voucher?.discountType ||
        (voucher?.kind === "gift" || voucher?.kind === "fixed" ? "fixed" : "percent"),
    );
    const discountValue = formatDiscountValue(voucher?.discountValue);
    const freeShipping = isFreeShippingVoucher(voucher);
    if (discountValue && discountType === "fixed") {
      return { amount: `₱${discountValue}`, unit: "OFF" };
    }
    if (discountValue) {
      return { amount: `${discountValue}%`, unit: "OFF" };
    }
    if (freeShipping) {
      return { amount: "FREE", unit: "SHIP" };
    }
    return { amount: "DEAL", unit: "OFF" };
  }

  function voucherInitials(voucher) {
    const name = String(voucher?.badge || voucher?.title || "SW")
      .trim()
      .replace(/\s+/g, " ");
    const words = name.split(" ").filter(Boolean);
    if (words.length > 1) {
      return `${words[0][0] || ""}${words[1][0] || ""}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase() || "SW";
  }

  function isGenericVoucherBrand(value) {
    return /^(store|store promo|store voucher|sitewide|seller store|seller company|company)$/i.test(
      String(value || "").replace(/\s+/g, " ").trim(),
    );
  }

  function resolveVoucherBrandName(voucher) {
    const fromRecord = String(voucher?.companyName || voucher?.storeName || "").trim();
    if (fromRecord && !isGenericVoucherBrand(fromRecord)) return fromRecord;
    const sellerId = String(voucher?.sellerAdminId || "").trim();
    if (sellerId) {
      const safe = window.CSS?.escape
        ? window.CSS.escape(sellerId)
        : sellerId.replace(/["\\]/g, "");
      const card = document.querySelector(
        `.super-admin-company-card[data-company-id="${safe}"]`,
      );
      const fromCard = String(
        card?.querySelector(".super-admin-company-card__title-text")?.textContent ||
          card?.getAttribute("aria-label") ||
          card?.dataset.companyName ||
          "",
      )
        .replace(/\s+/g, " ")
        .trim();
      if (fromCard && !isGenericVoucherBrand(fromCard)) return fromCard;
      const badge = String(voucher?.badge || "").trim();
      if (badge && !isGenericVoucherBrand(badge)) return badge;
      return "";
    }
    return "Switch";
  }

  function resolveVoucherLogoUrl(voucher) {
    const sellerId = String(voucher?.sellerAdminId || "").trim();
    if (!sellerId) return "/switch-logo.svg";
    const stored = String(voucher?.companyLogoUrl || "").trim();
    const safe = window.CSS?.escape
      ? window.CSS.escape(sellerId)
      : sellerId.replace(/["\\]/g, "");
    const img = document.querySelector(
      `.super-admin-company-card[data-company-id="${safe}"] .super-admin-company-card__logo img, ` +
        `.super-admin-company-card[data-company-id="${safe}"] .business-type-showcase__icon.has-company-logo img`,
    );
    const fromCard = String(img?.getAttribute("src") || "").trim();
    return fromCard || stored;
  }

  function voucherPromoHtml(voucher, { compact = false } = {}) {
    const color = resolveCardColor(voucher);
    const ink = cardInkColor(color);
    const shopColor = resolveShopColor(voucher);
    const shopInk = cardInkColor(shopColor);
    const offer = voucherOfferHeadline(voucher);
    const brandName = resolveVoucherBrandName(voucher);
    const logoUrl = resolveVoucherLogoUrl(voucher);
    const isSwitchLogo = !String(voucher?.sellerAdminId || "").trim();
    const endMsRaw = voucherExpiryMs(voucher);
    const startMsRaw = voucherStartMs(voucher);
    const live = voucherLiveSchedule(voucher);
    const upcoming = live.upcoming;
    const noExpiry = !endMsRaw && !isRepeatWeeklyVoucher(voucher);
    const targetMs = upcoming ? live.startMs : live.endMs;
    const parts = countdownPartsFromMs(targetMs);
    const expired = live.expired;
    const code = String(voucher?.code || "").trim().toUpperCase();
    const startLabel = String(voucher?.startDate || "").trim() || "When published";
    const endLabel = String(voucher?.date || "").trim() || "No expiry";
    const logoMarkup = logoUrl
      ? `<img src="${escapeHtml(logoUrl)}" alt="" />`
      : `<span class="sa-voucher-promo__initials">${escapeHtml(voucherInitials(voucher))}</span>`;
    return `
      <div class="sa-voucher-promo${compact ? " is-compact" : ""}${upcoming ? " is-unavailable" : ""}${expired ? " is-expired" : ""}${noExpiry ? " is-no-expiry" : ""}${isFreeShippingVoucher(voucher) ? " is-free-shipping" : ""}" style="--voucher-shop-color:${shopColor};--voucher-shop-ink:${shopInk};--voucher-card-color:${color};--voucher-card-ink:${ink};" data-voucher-card-preview data-voucher-start="${live.startMs || ""}" data-voucher-countdown="${live.endMs || ""}"${isRepeatWeeklyVoucher(voucher) ? " data-voucher-repeat=\"1\"" : ""}">
        <div class="sa-voucher-promo__face">
          ${platformMarkHtml(resolveVoucherMarkPlatformId(voucher), voucher)}
          <div class="sa-voucher-promo__brand-logo">${logoMarkup}</div>
          <p class="sa-voucher-promo__offer">
            ${
              brandName
                ? `<span class="sa-voucher-promo__brand">${escapeHtml(brandName)}</span>`
                : ""
            }
            <span class="sa-voucher-promo__deal">
              <strong>${escapeHtml(offer.amount)}</strong>
              <span class="sa-voucher-promo__off">${escapeHtml(offer.unit)}</span>
            </span>
          </p>
          <div class="sa-voucher-promo__logo${isSwitchLogo ? " is-switch" : ""}">${logoMarkup}</div>
          <span class="sa-voucher-promo__perforation" aria-hidden="true"></span>
          ${
            code
              ? `<span class="sa-voucher-promo__redeem is-code">${escapeHtml(code)}</span>`
              : isFreeShippingVoucher(voucher)
                ? '<span class="sa-voucher-promo__redeem is-code is-shipping">Free shipping</span>'
                : ""
          }
          ${upcoming ? '<span class="sa-voucher-promo__unavailable">Unavailable</span>' : ""}
        </div>
        <div class="sa-voucher-promo__clock" aria-label="${noExpiry ? "Unlimited voucher" : upcoming ? "Time until start" : "Time until expiry"}">
          <div class="sa-voucher-promo__cal-head">
            <span class="sa-voucher-promo__cal-rings" aria-hidden="true"><i></i><i></i></span>
            <strong>${noExpiry ? "Unlimited" : upcoming ? "Coming soon" : expired ? "Ended" : isRepeatWeeklyVoucher(voucher) ? "Weekly hours" : "Limited time"}</strong>
          </div>
          <p class="sa-voucher-promo__cal-kicker"><span>${noExpiry ? "Does not expire" : upcoming ? "Starts in" : "Ends in"}</span></p>
          <div class="sa-voucher-promo__cal-units">
            ${clockUnitHtml("days", parts.days, "Days")}
            ${clockUnitHtml("hours", parts.hours, "Hrs")}
            ${clockUnitHtml("minutes", parts.minutes, "Min")}
            ${clockUnitHtml("seconds", parts.seconds, "Sec")}
          </div>
          <div class="sa-voucher-promo__cal-schedule">
            <span class="sa-voucher-promo__cal-date">
              <span class="sa-voucher-promo__cal-date-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
              </span>
              <span class="sa-voucher-promo__cal-date-copy"><strong title="${escapeHtml(startLabel)}">${escapeHtml(startLabel)}</strong><span>Starts</span></span>
            </span>
            <span class="sa-voucher-promo__cal-date">
              <span class="sa-voucher-promo__cal-date-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4M16 2v4M3 10h18"/><rect x="3" y="4" width="18" height="18" rx="2"/></svg>
              </span>
              <span class="sa-voucher-promo__cal-date-copy"><strong title="${escapeHtml(endLabel)}">${escapeHtml(endLabel)}</strong><span>Expires</span></span>
            </span>
          </div>
        </div>
      </div>
    `;
  }

  function createCountdownFlap(position, text) {
    const flap = document.createElement("span");
    flap.className = `sa-flip-tile__flap ${position} is-flipping`;
    flap.setAttribute("aria-hidden", "true");
    const face = document.createElement("span");
    face.textContent = text;
    flap.appendChild(face);
    return flap;
  }

  function setCountdownDigit(node, value, animate = true) {
    const next = padClock(value);
    const topFace = node.querySelector("[data-cd-top] > span");
    const bottomFace = node.querySelector("[data-cd-bottom] > span");
    if (!(topFace instanceof HTMLElement) || !(bottomFace instanceof HTMLElement)) return;
    const prev = node.getAttribute("data-cd-current") || topFace.textContent || next;
    if (prev === next) return;
    node.setAttribute("data-cd-current", next);
    node.querySelectorAll(".sa-flip-tile__flap.is-flipping").forEach((flap) => flap.remove());
    node.classList.remove("is-flipping");
    topFace.textContent = next;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
    if (!animate || reduceMotion) {
      bottomFace.textContent = next;
      return;
    }
    bottomFace.textContent = prev;
    const fallingTop = createCountdownFlap("is-top", prev);
    const landingBottom = createCountdownFlap("is-bottom", next);
    node.append(fallingTop, landingBottom);
    void node.offsetWidth;
    node.classList.add("is-flipping");
    let finished = false;
    const finishFlip = () => {
      if (finished) return;
      finished = true;
      fallingTop.remove();
      landingBottom.remove();
      if (node.getAttribute("data-cd-current") !== next) return;
      bottomFace.textContent = next;
      node.classList.remove("is-flipping");
    };
    landingBottom.addEventListener("animationend", finishFlip, { once: true });
    window.setTimeout(finishFlip, 900);
  }

  function getVoucherCountdownParts(el) {
    const startMs = Number(el.getAttribute("data-voucher-start") || 0);
    const endMs = Number(el.getAttribute("data-voucher-countdown") || 0);
    const upcoming = Boolean(startMs && startMs > Date.now());
    return countdownPartsFromMs(upcoming ? startMs : endMs);
  }

  function syncVoucherCountdownDigits(el, parts, animate = true) {
    const map = {
      days: parts.days,
      hours: parts.hours,
      minutes: parts.minutes,
      seconds: parts.seconds,
    };
    el.querySelectorAll("[data-voucher-cd]").forEach((node) => {
      const key = node.getAttribute("data-voucher-cd");
      if (key && Object.prototype.hasOwnProperty.call(map, key)) {
        setCountdownDigit(node, map[key], animate);
      }
    });
  }

  const voucherCountdownVisibility = new WeakMap();
  const observedVoucherCountdowns = new Set();
  let voucherCountdownObserver = null;

  function isVoucherCountdownVisible(el) {
    if (typeof IntersectionObserver === "undefined") return true;
    if (!voucherCountdownObserver) {
      voucherCountdownObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          const wasVisible = voucherCountdownVisibility.get(entry.target) === true;
          voucherCountdownVisibility.set(entry.target, entry.isIntersecting);
          if (entry.isIntersecting && !wasVisible) {
            syncVoucherCountdownDigits(entry.target, getVoucherCountdownParts(entry.target), false);
          }
        });
      }, { rootMargin: "200px 0px" });
    }
    if (!observedVoucherCountdowns.has(el)) {
      observedVoucherCountdowns.add(el);
      voucherCountdownVisibility.set(el, false);
      voucherCountdownObserver.observe(el);
    }
    return voucherCountdownVisibility.get(el) === true;
  }

  function tickVoucherCountdowns(root = document) {
    if (!(root instanceof Element) && root !== document) return;
    observedVoucherCountdowns.forEach((el) => {
      if (el.isConnected) return;
      voucherCountdownObserver?.unobserve(el);
      observedVoucherCountdowns.delete(el);
    });
    let becameActive = false;
    root.querySelectorAll("[data-voucher-countdown]").forEach((el) => {
      const startMs = Number(el.getAttribute("data-voucher-start") || 0);
      const endMs = Number(el.getAttribute("data-voucher-countdown") || 0);
      const upcoming = Boolean(startMs && startMs > Date.now());
      const noExpiry = !endMs && !el.hasAttribute("data-voucher-repeat");
      if (!upcoming && el.classList.contains("is-unavailable")) {
        becameActive = true;
      }
      const targetMs = upcoming ? startMs : endMs;
      const parts = countdownPartsFromMs(targetMs);
      const expired = !upcoming && !noExpiry && parts.expired;
      el.classList.toggle("is-unavailable", upcoming);
      el.classList.toggle("is-expired", expired);
      el.classList.toggle("is-no-expiry", noExpiry);
      const kicker = el.querySelector(".sa-voucher-promo__cal-kicker span");
      const kickerText = noExpiry ? "Does not expire" : upcoming ? "Starts in" : "Ends in";
      if (kicker && kicker.textContent !== kickerText) {
        kicker.textContent = kickerText;
      }
      const head = el.querySelector(".sa-voucher-promo__cal-head strong");
      const headText = noExpiry
        ? "Unlimited"
        : upcoming
          ? "Coming soon"
          : expired
            ? "Ended"
            : el.hasAttribute("data-voucher-repeat")
              ? "Weekly hours"
              : "Limited time";
      if (head && head.textContent !== headText) {
        head.textContent = headText;
      }
      const clock = el.querySelector(".sa-voucher-promo__clock");
      const clockLabel = noExpiry ? "Unlimited voucher" : upcoming ? "Time until start" : "Time until expiry";
      if (clock && clock.getAttribute("aria-label") !== clockLabel) {
        clock.setAttribute("aria-label", clockLabel);
      }
      const face = el.querySelector(".sa-voucher-promo__face");
      if (face instanceof HTMLElement) {
        let stamp = face.querySelector(".sa-voucher-promo__unavailable");
        if (upcoming && !stamp) {
          stamp = document.createElement("span");
          stamp.className = "sa-voucher-promo__unavailable";
          stamp.textContent = "Unavailable";
          face.append(stamp);
        } else if (!upcoming && stamp) {
          stamp.remove();
        }
      }
      if (!document.hidden && isVoucherCountdownVisible(el)) {
        syncVoucherCountdownDigits(el, parts);
      }
    });
    if (becameActive) {
      void load({ quiet: true });
    }
  }

  function syncVoucherBrandWrap(root = document) {
    root.querySelectorAll(".sa-voucher-promo").forEach((el) => {
      const brand = el.querySelector(".sa-voucher-promo__brand");
      let twoLine = false;
      if (brand instanceof HTMLElement) {
        const styles = window.getComputedStyle(brand);
        const fontSize = Number.parseFloat(styles.fontSize) || 14;
        const parsedLine = Number.parseFloat(styles.lineHeight);
        const oneLine = Number.isFinite(parsedLine) && parsedLine > 0 ? parsedLine : fontSize * 1.2;
        const padY =
          (Number.parseFloat(styles.paddingTop) || 0) +
          (Number.parseFloat(styles.paddingBottom) || 0);
        twoLine = brand.scrollHeight - padY > oneLine + 2;
      }
      el.classList.toggle("is-brand-2line", twoLine);
    });
  }

  function startVoucherCountdowns() {
    tickVoucherCountdowns();
    window.requestAnimationFrame(() => syncVoucherBrandWrap());
    if (state.countdownTimer) return;
    state.countdownTimer = window.setInterval(() => tickVoucherCountdowns(), 1000);
  }

  function setCardColor(value) {
    refreshElements();
    const next = resolveCardColor({ cardColor: value });
    state.cardColor = next;
    if (els.colorInput instanceof HTMLInputElement) {
      els.colorInput.value = next;
    }
    if (els.colorTrigger instanceof HTMLElement) {
      els.colorTrigger.style.setProperty("--voucher-picker-color", next);
      els.colorTrigger.style.background = next;
    }
    if (els.colorHex) {
      els.colorHex.textContent = next.toUpperCase();
    }
    const ink = cardInkColor(next);
    document.querySelectorAll("#voucher-modal [data-voucher-card-preview]").forEach((preview) => {
      if (!(preview instanceof HTMLElement)) return;
      preview.style.setProperty("--voucher-card-color", next);
      preview.style.setProperty("--voucher-card-ink", ink);
    });
    document.querySelectorAll("#voucher-modal .sa-voucher-promo__face").forEach((face) => {
      if (!(face instanceof HTMLElement)) return;
      face.style.setProperty("--voucher-card-color", next);
      face.style.setProperty("--voucher-card-ink", ink);
      face.style.backgroundColor = next;
    });
    if (els.colorSwatches instanceof HTMLElement) {
      els.colorSwatches.querySelectorAll("[data-voucher-color-swatch]").forEach((button) => {
        const isSelected =
          String(button.dataset.voucherColorSwatch || "").toLowerCase() === next;
        button.classList.toggle("is-selected", isSelected);
        button.setAttribute("aria-pressed", String(isSelected));
      });
    }
    return next;
  }

  function renderCardColorSwatches() {
    refreshElements();
    if (!(els.colorSwatches instanceof HTMLElement)) return;
    const selected = resolveCardColor({ cardColor: els.colorInput?.value });
    els.colorSwatches.replaceChildren();
    for (const color of VOUCHER_CARD_PALETTE) {
      const button = document.createElement("button");
      button.type = "button";
      button.className =
        "super-admin-platform-palette__swatch" + (color === selected ? " is-selected" : "");
      button.style.backgroundColor = color;
      button.dataset.voucherColorSwatch = color;
      button.setAttribute("aria-label", `Select ${color}`);
      button.setAttribute("aria-pressed", String(color === selected));
      button.title = color;
      els.colorSwatches.append(button);
    }
  }

  function resolvePlatformPrimaryColor(platformId) {
    const id = normalizePlatformId(platformId);
    const match = state.platforms.find((entry) => entry.id === id);
    const fromPlatform = normalizeHexColor(
      match?.primaryColor || match?.color || match?.accentColor,
    );
    if (fromPlatform) return fromPlatform;
    return DEFAULT_PLATFORM_COLORS[id] || "#0891b2";
  }

  function accentVarsFromHex(hex) {
    const color = normalizeHexColor(hex, "#0891b2");
    const match = color.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
    if (!match) return null;
    const r = Number.parseInt(match[1], 16);
    const g = Number.parseInt(match[2], 16);
    const b = Number.parseInt(match[3], 16);
    const hr = Math.round(r * 0.82);
    const hg = Math.round(g * 0.82);
    const hb = Math.round(b * 0.82);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return {
      accent: `rgb(${r}, ${g}, ${b})`,
      accentRgb: `${r}, ${g}, ${b}`,
      accentText: `rgb(${hr}, ${hg}, ${hb})`,
      accentButtonBg: `rgb(${r}, ${g}, ${b})`,
      accentContrast: yiq >= 160 ? "#111827" : "#ffffff",
      mdAccent: `rgb(${r}, ${g}, ${b})`,
    };
  }

  function applyAccentVars(element, hex) {
    if (!(element instanceof HTMLElement)) return;
    const vars = accentVarsFromHex(hex);
    if (!vars) return;
    element.style.setProperty("--accent", vars.accent);
    element.style.setProperty("--accent-rgb", vars.accentRgb);
    element.style.setProperty("--accent-text", vars.accentText);
    element.style.setProperty("--accent-button-bg", vars.accentButtonBg);
    element.style.setProperty("--accent-contrast", vars.accentContrast);
    element.style.setProperty("--md-accent", vars.mdAccent);
  }

  function accentStyleAttr(hex) {
    const vars = accentVarsFromHex(hex);
    if (!vars) return "";
    return ` style="--accent:${vars.accent};--accent-rgb:${vars.accentRgb};--accent-text:${vars.accentText};--accent-button-bg:${vars.accentButtonBg};--accent-contrast:${vars.accentContrast};--md-accent:${vars.mdAccent};"`;
  }

  function applyModalTheme() {
    refreshElements();
    const hex = resolvePlatformPrimaryColor("shop");
    applyAccentVars(els.modal, hex);
    if (els.preview instanceof HTMLElement) applyAccentVars(els.preview, hex);
  }

  function platformVoucherSubnavLabel(platform) {
    const name = String(platform?.name || platformLabel(platform?.id) || "").trim();
    if (!name) return "Voucher";
    return /voucher$/i.test(name) ? name : `${name} Voucher`;
  }

  function voucherPlatformsLabel(voucher) {
    const ids = Array.isArray(voucher?.platformIds) ? voucher.platformIds : [];
    return ids.length > 1 ? ids.map(platformLabel).join(", ") : platformLabel(voucher?.platformId);
  }

  function platformLabel(platformId) {
    const id = normalizePlatformId(platformId);
    if (!id || id === "all") return "All platforms";
    const match = state.platforms.find((entry) => entry.id === id);
    if (match?.name) return match.name;
    return id.charAt(0).toUpperCase() + id.slice(1);
  }

  /** Pass `{ value, ids }` to change the selection; omit it to keep the current one. */
  function syncPlatformSelect(selection = null) {
    refreshElements();
    const select = els.platformSelect;
    if (!(select instanceof HTMLSelectElement)) return;
    if (selection) setVoucherPlatformSelection(selection.value, selection.ids);
    const preferred = state.voucherPlatforms.all
      ? "all"
      : [...state.voucherPlatforms.ids][0] || "";
    const platforms = state.platforms.length ? state.platforms : FALLBACK_PLATFORMS;
    select.replaceChildren();
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select platform";
    select.append(placeholder);
    const allOption = document.createElement("option");
    allOption.value = "all";
    allOption.textContent = "All platforms";
    select.append(allOption);
    for (const platform of platforms) {
      const option = document.createElement("option");
      option.value = platform.id;
      option.textContent =
        platform.status === "inactive"
          ? `${platform.name} (Inactive)`
          : platform.name;
      select.append(option);
    }
    for (const id of state.voucherPlatforms.ids) {
      if ([...select.options].some((option) => option.value === id)) continue;
      const fallback = document.createElement("option");
      fallback.value = id;
      fallback.textContent = platformLabel(id);
      select.append(fallback);
    }
    select.value = preferred && [...select.options].some((option) => option.value === preferred)
      ? preferred
      : "";
    syncPlatformChoiceMenu();
  }

  function syncVoucherChoiceOptions(menu, value) {
    if (!(menu instanceof HTMLElement)) return;
    const selected = String(value ?? "");
    menu.querySelectorAll("[data-voucher-choice-value]").forEach((option) => {
      const isActive = option.getAttribute("data-voucher-choice-value") === selected;
      option.classList.toggle("is-active", isActive);
      option.setAttribute("aria-selected", isActive ? "true" : "false");
    });
  }

  function eventComposedPath(event) {
    return typeof event.composedPath === "function" ? event.composedPath() : [];
  }

  function eventPathMatches(event, selector) {
    return eventComposedPath(event).some((node) => {
      if (!(node instanceof Element)) return false;
      return node.matches(selector) || Boolean(node.closest(selector));
    });
  }

  function isSwitchCalendarOpen() {
    const timeCal = document.getElementById("switch-time-calendar");
    const dateCal = document.getElementById("switch-date-calendar");
    return (
      (timeCal instanceof HTMLElement && !timeCal.hidden) ||
      (dateCal instanceof HTMLElement && !dateCal.hidden)
    );
  }

  function closeVoucherChoiceMenus(except) {
    document.querySelectorAll("#voucher-modal .sa-choice-dropdown").forEach((dropdown) => {
      if (except && dropdown === except) return;
      dropdown.classList.remove("is-open");
      const trigger = dropdown.querySelector("[aria-expanded]");
      const menu = dropdown.querySelector(".sa-choice-menu");
      trigger?.setAttribute("aria-expanded", "false");
      if (menu instanceof HTMLElement) menu.hidden = true;
    });
  }

  function setVoucherSettingsOpen(open, { restoreFocus = false } = {}) {
    refreshElements();
    const next = Boolean(open);
    if (!(els.settingsButton instanceof HTMLButtonElement)) return;
    if (!(els.settingsPopover instanceof HTMLElement)) return;
    els.settingsButton.setAttribute("aria-expanded", String(next));
    els.settingsPopover.hidden = !next;
    if (!next) {
      closeVoucherChoiceMenus();
      window.SwitchTimePicker?.close();
      if (restoreFocus) {
        try {
          els.settingsButton.focus({ preventScroll: true });
        } catch (_) {
          els.settingsButton.focus();
        }
      }
    }
  }

  function placeVoucherChoiceMenu(dropdown) {
    const trigger = dropdown.querySelector("[aria-expanded]");
    const menu = dropdown.querySelector(".sa-choice-menu");
    if (!(trigger instanceof HTMLElement) || !(menu instanceof HTMLElement)) return;
    dropdown.classList.remove("is-drop-up");
    menu.style.maxHeight = "";
    const scroller = dropdown.closest(".super-admin-store-type-modal__content");
    const bounds = scroller instanceof HTMLElement
      ? scroller.getBoundingClientRect()
      : { top: 0, bottom: window.innerHeight };
    const rect = trigger.getBoundingClientRect();
    const spacing = 14;
    const below = Math.min(bounds.bottom, window.innerHeight) - rect.bottom - spacing;
    const above = rect.top - Math.max(bounds.top, 0) - spacing;
    const needed = menu.scrollHeight;
    const dropUp = needed > below && above > below;
    dropdown.classList.toggle("is-drop-up", dropUp);
    const room = dropUp ? above : below;
    if (needed > room) menu.style.maxHeight = `${Math.max(96, Math.floor(room))}px`;
  }

  function setVoucherChoiceOpen(dropdown, open) {
    if (!(dropdown instanceof HTMLElement)) return;
    if (open) closeVoucherChoiceMenus(dropdown);
    dropdown.classList.toggle("is-open", open);
    const trigger = dropdown.querySelector("[aria-expanded]");
    const menu = dropdown.querySelector(".sa-choice-menu");
    trigger?.setAttribute("aria-expanded", String(open));
    if (menu instanceof HTMLElement) menu.hidden = !open;
    if (open) placeVoucherChoiceMenu(dropdown);
  }

  function voucherPlatformChoices() {
    refreshElements();
    const select = els.platformSelect;
    if (!(select instanceof HTMLSelectElement)) return [];
    return [...select.options]
      .filter((option) => option.value && option.value !== "all")
      .map((option) => ({ id: option.value, label: option.textContent || option.value }));
  }

  function setVoucherPlatformSelection(value = "", ids = null) {
    const list = Array.isArray(ids)
      ? ids.map(normalizePlatformId).filter((id) => id && id !== "all")
      : [];
    const single = normalizePlatformId(value);
    if (list.length > 1) {
      state.voucherPlatforms = { all: false, ids: new Set(list) };
    } else if (single === "all") {
      state.voucherPlatforms = { all: true, ids: new Set() };
    } else if (single || list.length) {
      state.voucherPlatforms = { all: false, ids: new Set([single || list[0]]) };
    } else {
      state.voucherPlatforms = { all: false, ids: new Set() };
    }
  }

  function selectedVoucherPlatformIds() {
    const choices = voucherPlatformChoices().map((choice) => choice.id);
    if (state.voucherPlatforms.all) return choices;
    return choices.filter((id) => state.voucherPlatforms.ids.has(id));
  }

  /** "all", a single platform id, "multi", or "" when nothing is checked. */
  function voucherPlatformValue() {
    if (state.voucherPlatforms.all) return "all";
    const ids = selectedVoucherPlatformIds();
    if (!ids.length) return "";
    return ids.length === 1 ? ids[0] : "multi";
  }

  function voucherPlatformSummary() {
    const value = voucherPlatformValue();
    if (value === "all") return "All platforms";
    if (!value) return "";
    const labels = selectedVoucherPlatformIds().map(platformLabel);
    return labels.length > 2
      ? `${labels.slice(0, 2).join(", ")} +${labels.length - 2}`
      : labels.join(", ");
  }

  function toggleVoucherPlatform(platformId, checked) {
    const choices = voucherPlatformChoices().map((choice) => choice.id);
    const ids = new Set(state.voucherPlatforms.all ? choices : state.voucherPlatforms.ids);
    if (checked) ids.add(platformId);
    else ids.delete(platformId);
    const all = choices.length > 0 && choices.every((id) => ids.has(id));
    state.voucherPlatforms = { all, ids: all ? new Set() : ids };
  }

  function syncPlatformChoiceMenu() {
    refreshElements();
    const menu = els.platformMenu;
    const select = els.platformSelect;
    if (!(menu instanceof HTMLElement) || !(select instanceof HTMLSelectElement)) return;
    const choices = voucherPlatformChoices();
    const checkedIds = new Set(selectedVoucherPlatformIds());
    const allChecked = state.voucherPlatforms.all;
    const someChecked = !allChecked && checkedIds.size > 0;
    menu.setAttribute("aria-multiselectable", "true");
    const row = (attr, label, checked, extraClass = "") => `
      <label class="sa-choice-option sa-voucher-platform-option${extraClass}${checked ? " is-checked" : ""}" role="option" aria-selected="${checked ? "true" : "false"}">
        <input type="checkbox" ${attr}${checked ? " checked" : ""} />
        <span>${escapeHtml(label)}</span>
      </label>`;
    menu.innerHTML = [
      row("data-voucher-platform-all", "Select all", allChecked, " is-select-all"),
      ...choices.map((choice) =>
        row(
          `data-voucher-platform-option="${escapeHtml(choice.id)}"`,
          choice.label,
          checkedIds.has(choice.id),
        ),
      ),
    ].join("");
    const allBox = menu.querySelector("[data-voucher-platform-all]");
    if (allBox instanceof HTMLInputElement) allBox.indeterminate = someChecked;
    if (els.platformLabel) {
      els.platformLabel.textContent = voucherPlatformSummary() || "Select platform";
    }
    if (els.platformToggle instanceof HTMLButtonElement) {
      els.platformToggle.disabled = Boolean(select.disabled);
    }
  }

  function applyVoucherPlatformChange() {
    syncPlatformChoiceMenu();
    applyModalTheme();
    renderVoucherCategoryPicker();
    updatePreview();
  }

  function syncFilterPlatformRadios() {
    refreshElements();
    if (!(els.platformRadios instanceof HTMLElement)) return;
    const preferred = normalizePlatformId(state.filters.platformId);
    const platforms = state.platforms.length ? state.platforms : FALLBACK_PLATFORMS;
    const options = [
      { value: "", label: "All platforms" },
      { value: "all", label: "All platforms" },
      ...platforms.map((platform) => ({
        value: platform.id,
        label: platform.name,
      })),
    ];
    els.platformRadios.innerHTML = options
      .map(
        (option) => `
      <label class="super-admin-filter-radio">
        <input
          type="radio"
          name="super-admin-vouchers-platform-filter"
          value="${escapeHtml(option.value)}"
          data-super-admin-vouchers-filter="platformId"
          ${option.value === preferred ? "checked" : ""}
        />
        <span class="super-admin-filter-radio__mark"></span>
        <span>${escapeHtml(option.label)}</span>
      </label>
    `,
      )
      .join("");
  }

  function renderHeaderFilterSummary() {
    refreshElements();
    if (!(els.filterSummary instanceof HTMLElement)) return;
    const activeCount = PANEL_FILTER_KEYS.filter((key) => Boolean(state.filters[key])).length;
    els.filterSummary.textContent = activeCount > 0 ? `${activeCount} active` : "All";
  }

  function voucherScopedPlatformId(voucher) {
    const sellerPlatform = normalizePlatformId(voucher?.sellerPlatformId);
    const platform = normalizePlatformId(voucher?.platformId);
    if (sellerPlatform && sellerPlatform !== "all") return sellerPlatform;
    if (platform && platform !== "all") return platform;
    return "";
  }

  function isQuickViewAvailable(value) {
    const view = normalizeQuickView(value);
    if (view === "all") return true;
    if (!state.subnavReady) return true;
    const nav = state.subnav || EMPTY_SUBNAV;
    if (view === "companies") return true;
    if (view === "percent") return true;
    if (view === "fixed") return true;
    if (view === "companyFunded") return true;
    if (view === "platformFunded") return true;
    if (view === "sharedFunded") return true;
    if (view === "comingSoon") return true;
    if (view === "endingSoon") return true;
    if (view === "ended") return true;
    if (view.startsWith("platform:")) {
      const id = view.slice("platform:".length);
      return (Array.isArray(nav.platforms) ? nav.platforms : []).some(
        (entry) => normalizePlatformId(entry?.id) === id && Number(entry?.count) > 0,
      );
    }
    return true;
  }

  function createVoucherSubnavButton(quickView, label, active) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "super-admin-company-status-nav__item super-admin-vouchers-subnav__item";
    button.setAttribute("data-super-admin-voucher-quick-view", quickView);
    button.setAttribute("aria-pressed", active ? "true" : "false");
    button.classList.toggle("is-active", active);
    const dot = document.createElement("span");
    dot.className = "super-admin-company-status-nav__dot";
    dot.setAttribute("aria-hidden", "true");
    const text = document.createElement("span");
    text.textContent = label;
    button.append(dot, text);
    return button;
  }

  function syncVoucherSubnavHeight() {
    refreshElements();
    if (!(els.subnav instanceof HTMLElement)) return;
    const computedStyle = window.getComputedStyle(els.subnav);
    const rowHeight =
      Number.parseFloat(computedStyle.getPropertyValue("--super-admin-subnav-row-height")) || 29;
    const paddingBlock =
      Number.parseFloat(computedStyle.getPropertyValue("--super-admin-subnav-padding-block")) || 0;
    const rowGap = Number.parseFloat(computedStyle.rowGap || computedStyle.gap) || 0;
    const rowCount = Array.from(els.subnav.children).filter(
      (child) => child instanceof HTMLElement && !child.hidden,
    ).length;
    const expandedHeight = rowCount > 0
      ? rowCount * rowHeight + (rowCount - 1) * rowGap + paddingBlock * 2
      : 0;
    els.subnav.style.setProperty("--super-admin-subnav-expanded-height", `${expandedHeight}px`);
  }

  function renderVoucherSubnav() {
    refreshElements();
    if (!(els.subnav instanceof HTMLElement)) return;
    const nav = state.subnav || EMPTY_SUBNAV;
    let activeQuickView = normalizeQuickView(state.quickView);
    const shouldReset = state.subnavReady && !isQuickViewAvailable(activeQuickView);
    if (shouldReset) {
      activeQuickView = "all";
      state.quickView = "all";
      state.filters = filtersFromQuickView("all", state.filters.search, state.filters);
      saveQuickView("all");
    }
    const fragment = document.createDocumentFragment();
    fragment.append(createVoucherSubnavButton("all", "All Vouchers", activeQuickView === "all"));
    fragment.append(
      createVoucherSubnavButton("companies", "Companies Created", activeQuickView === "companies"),
    );
    fragment.append(
      createVoucherSubnavButton("percent", "By Percent", activeQuickView === "percent"),
    );
    fragment.append(
      createVoucherSubnavButton("fixed", "By Fixed Price", activeQuickView === "fixed"),
    );
    fragment.append(
      createVoucherSubnavButton(
        "companyFunded",
        "Company Funded",
        activeQuickView === "companyFunded",
      ),
    );
    fragment.append(
      createVoucherSubnavButton(
        "platformFunded",
        "Platform Funded",
        activeQuickView === "platformFunded",
      ),
    );
    fragment.append(
      createVoucherSubnavButton(
        "sharedFunded",
        "Shared Funded",
        activeQuickView === "sharedFunded",
      ),
    );
    fragment.append(
      createVoucherSubnavButton("comingSoon", "Coming Soon", activeQuickView === "comingSoon"),
    );
    fragment.append(
      createVoucherSubnavButton("endingSoon", "Ended Soon", activeQuickView === "endingSoon"),
    );
    fragment.append(
      createVoucherSubnavButton("ended", "Ended", activeQuickView === "ended"),
    );
    const platformCounts = new Map(
      (Array.isArray(nav.platforms) ? nav.platforms : [])
        .map((entry) => [normalizePlatformId(entry?.id), Number(entry?.count) || 0])
        .filter(([id, count]) => id && count > 0),
    );
    const platforms = (state.platforms.length ? state.platforms : FALLBACK_PLATFORMS)
      .filter((platform) => (platformCounts.get(normalizePlatformId(platform.id)) || 0) > 0);
    const known = new Set(platforms.map((platform) => normalizePlatformId(platform.id)));
    for (const [id] of platformCounts) {
      if (id && !known.has(id)) {
        platforms.push({ id, name: platformLabel(id) });
        known.add(id);
      }
    }
    for (const platform of platforms) {
      const id = normalizePlatformId(platform.id);
      fragment.append(
        createVoucherSubnavButton(
          `platform:${id}`,
          platformVoucherSubnavLabel(platform),
          activeQuickView === `platform:${id}`,
        ),
      );
    }
    els.subnav.replaceChildren(fragment);
    els.subnav.classList.remove("is-skeleton-loading");
    syncVoucherSubnavHeight();
    window.SuperAdminClearBootSubNavSkeleton?.("vouchers");
    if (shouldReset) {
      syncStatusFilterControls();
      renderHeaderFilterSummary();
      state.page = 1;
      void load({ quiet: true, showSkeleton: true });
    }
  }

  function syncQuickViewNav({ persist = false } = {}) {
    const activeQuickView = normalizeQuickView(state.quickView);
    state.quickView = activeQuickView;
    document
      .querySelectorAll("[data-super-admin-voucher-quick-view]")
      .forEach((button) => {
        const isActive =
          normalizeQuickView(
            button.getAttribute("data-super-admin-voucher-quick-view"),
          ) === activeQuickView;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
      });
    if (persist) saveQuickView(activeQuickView);
  }

  function syncNamedFilterRadios(filterKey, value) {
    const wanted = String(value || "").trim().toLowerCase();
    document
      .querySelectorAll(`input[data-super-admin-vouchers-filter="${filterKey}"]`)
      .forEach((input) => {
        if (input instanceof HTMLInputElement) {
          input.checked = String(input.value || "").trim().toLowerCase() === wanted;
        }
      });
  }

  function syncStatusFilterControls() {
    for (const key of PANEL_FILTER_KEYS) {
      syncNamedFilterRadios(key, state.filters[key]);
    }
  }

  function applyQuickView(value, { persist = true, skipLoad = false } = {}) {
    const nextQuickView = normalizeQuickView(value);
    const search = String(state.filters.search || "");
    state.quickView = nextQuickView;
    state.filters = filtersFromQuickView(nextQuickView, search, state.filters);
    syncStatusFilterControls();
    syncQuickViewNav({ persist });
    renderHeaderFilterSummary();
    state.page = 1;
    if (!skipLoad) void load({ quiet: true, showSkeleton: true });
  }

  function setFilterOpen(show) {
    refreshElements();
    if (
      !(els.filterToggle instanceof HTMLButtonElement) ||
      !(els.filterPanel instanceof HTMLElement)
    ) {
      return;
    }
    const shouldOpen = Boolean(show);
    els.filterToggle.setAttribute("aria-expanded", String(shouldOpen));
    els.filterPanel.hidden = !shouldOpen;
  }

  function clearFilters() {
    for (const key of PANEL_FILTER_KEYS) {
      state.filters[key] = "";
    }
    syncStatusFilterControls();
    renderHeaderFilterSummary();
    state.page = 1;
    void load({ quiet: true, showSkeleton: true });
  }

  function voucherMinimumSpendAmount(voucher) {
    const amount = Number(String(voucher?.minimumSpend ?? "").replace(/[^\d.]/g, ""));
    return Number.isFinite(amount) ? amount : 0;
  }

  function matchesVoucherPanelFilters(voucher) {
    const voucherStatus = String(state.filters.voucherStatus || "").toLowerCase();
    if (voucherStatus && String(voucher.status || "").toLowerCase() !== voucherStatus) return false;
    const usage = String(state.filters.usage || "");
    if (usage) {
      const usageLimit = Number(voucher.totalUsageLimit) || 0;
      const usedTimes = Number(voucher.usedTimes) || 0;
      if (usage === "never-used" && usedTimes > 0) return false;
      if (usage === "almost-full" && !(usageLimit > 0 && usedTimes / usageLimit >= 0.8)) return false;
      if (usage === "unlimited" && usageLimit > 0) return false;
    }
    const eligibility = String(state.filters.eligibility || "");
    if (eligibility && String(voucher.customerEligibility || "all") !== eligibility) return false;
    const minSpend = String(state.filters.minSpend || "");
    if (minSpend === "required" && voucherMinimumSpendAmount(voucher) <= 0) return false;
    if (minSpend === "none" && voucherMinimumSpendAmount(voucher) > 0) return false;
    return true;
  }

  function filteredItems() {
    const search = String(state.filters.search || "")
      .trim()
      .toLowerCase();
    const platformFilter = normalizePlatformId(state.filters.platformId);
    const statusFilter = String(state.filters.status || "")
      .trim()
      .toLowerCase();
    const scopeFilter = String(state.filters.scope || "")
      .trim()
      .toLowerCase();
    const discountTypeFilter = String(state.filters.discountType || "")
      .trim()
      .toLowerCase();
    const upcomingFilter = Boolean(state.filters.upcoming);
    const endingSoonFilter = Boolean(state.filters.endingSoon);
    const redemptionFilter = String(state.filters.redemption || "")
      .trim()
      .toLowerCase();
    const fundingFilter = String(state.filters.funding || "")
      .trim()
      .toLowerCase();
    return state.items.filter((voucher) => {
      if (statusFilter && String(voucher.status || "").toLowerCase() !== statusFilter) {
        return false;
      }
      if (scopeFilter === "store" && !voucher.sellerAdminId) return false;
      if (scopeFilter === "platform" && voucher.sellerAdminId) return false;
      if (discountTypeFilter === "percent" || discountTypeFilter === "fixed") {
        const voucherDiscountType = normalizeDiscountType(
          voucher?.discountType ||
            (voucher?.kind === "gift" || voucher?.kind === "fixed" ? "fixed" : "percent"),
        );
        if (voucherDiscountType !== discountTypeFilter) {
          return false;
        }
      }
      if (upcomingFilter && !isComingSoonVoucher(voucher)) return false;
      if (endingSoonFilter && !isEndingSoonVoucher(voucher)) return false;
      if (redemptionFilter && voucherRedemptionMethod(voucher) !== redemptionFilter) {
        return false;
      }
      if (fundingFilter && String(voucher.fundingSource || "platform") !== fundingFilter) {
        return false;
      }
      if (!matchesVoucherPanelFilters(voucher)) return false;
      if (platformFilter) {
        const voucherPlatform = voucherScopedPlatformId(voucher) || "all";
        const multiIds = Array.isArray(voucher?.platformIds) ? voucher.platformIds : [];
        if (platformFilter === "all") {
          if (voucherPlatform !== "all") return false;
        } else if (multiIds.length > 1) {
          if (!multiIds.includes(platformFilter)) return false;
        } else if (voucherPlatform !== "all" && voucherPlatform !== platformFilter) {
          return false;
        }
      }
      if (!search) return true;
      const haystack = [
        voucher.id,
        voucher.scheduleId,
        voucher.code,
        voucher.title,
        voucher.subtitle,
        voucher.badge,
        voucherPlatformsLabel(voucher),
      ]
        .map((value) => String(value || "").trim().toLowerCase())
        .join(" ");
      return haystack.includes(search);
    });
  }

  async function loadPlatforms() {
    try {
      const response = await fetch("/api/platforms", {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message || "Unable to load platforms.");
      }
      const next = (Array.isArray(payload.platforms) ? payload.platforms : [])
        .map((entry) => {
          const id = normalizePlatformId(entry?.id || entry?.platformId);
          const name = String(entry?.name || "").trim() || platformLabel(id);
          if (!id) return null;
          return {
            id,
            name,
            status: String(entry?.status || "active").trim().toLowerCase() || "active",
            sortOrder: Number(entry?.sortOrder) || 0,
            iconImageUrl: String(entry?.iconImageUrl || entry?.iconUrl || BUILT_IN_PLATFORM_ART[id] || "").trim(),
            iconName: String(entry?.iconName || entry?.lucideIconName || "").trim(),
            primaryColor: normalizeHexColor(
              entry?.primaryColor || entry?.color || entry?.accentColor,
              DEFAULT_PLATFORM_COLORS[id] || "#0891b2",
            ),
          };
        })
        .filter(Boolean)
        .sort((left, right) => {
          if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder;
          return left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
        });
      if (next.length) state.platforms = next;
    } catch (_) {
      if (!state.platforms.length) state.platforms = FALLBACK_PLATFORMS.slice();
    }
    syncPlatformSelect();
    syncFilterPlatformRadios();
  }

  async function loadStoreTypes() {
    try {
      const response = await fetch("/api/super-admin/store-types", {
        headers: headers(),
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) return;
      const next = Array.isArray(payload.storeTypeDetails)
        ? payload.storeTypeDetails
        : [];
      state.storeTypes = next.filter((entry) => entry && typeof entry === "object");
    } catch (_error) {
      state.storeTypes = Array.isArray(state.storeTypes) ? state.storeTypes : [];
    }
  }

  function applyPlatformsFromEvent(detailPlatforms) {
    const next = (Array.isArray(detailPlatforms) ? detailPlatforms : [])
      .map((entry) => {
        const id = normalizePlatformId(entry?.id || entry?.platformId);
        const name = String(entry?.name || "").trim() || platformLabel(id);
        if (!id) return null;
        return {
          id,
          name,
          status: String(entry?.status || "active").trim().toLowerCase() || "active",
          sortOrder: Number(entry?.sortOrder) || 0,
          iconImageUrl: String(entry?.iconImageUrl || entry?.iconUrl || BUILT_IN_PLATFORM_ART[id] || "").trim(),
          iconName: String(entry?.iconName || entry?.lucideIconName || "").trim(),
          primaryColor: normalizeHexColor(
            entry?.primaryColor || entry?.color || entry?.accentColor,
            DEFAULT_PLATFORM_COLORS[id] || "#0891b2",
          ),
        };
      })
      .filter(Boolean);
    if (next.length) {
      state.platforms = next;
      syncPlatformSelect();
      syncFilterPlatformRadios();
      if (state.subnavReady) renderVoucherSubnav();
    }
  }

  function voucherIconSvg(kind = "ticket") {
    const icons = {
      percent:
        '<path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="m15 9-6 6"/><path d="M9 9h.01"/><path d="M15 15h.01"/>',
      gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/><path d="M7.5 8A2.5 2.5 0 1 1 12 6.5V8M16.5 8A2.5 2.5 0 1 0 12 6.5V8"/>',
      shipping:
        '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
      shopping:
        '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
      loyalty:
        '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
      ticket:
        '<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2M13 11v2M13 17v2"/>',
    };
    const lucideName =
      kind === "shipping"
        ? "truck"
        : kind === "percent"
          ? "badge-percent"
          : kind === "gift"
            ? "gift"
            : kind === "shopping"
              ? "shopping-bag"
              : kind === "loyalty"
                ? "heart"
                : "ticket";
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-${lucideName}" aria-hidden="true">${icons[kind] || icons.ticket}</svg>`;
  }

  function noteHtml(note) {
    return escapeHtml(note).replace(/\n/g, "<br>");
  }

  function formatMinSpend(value) {
    const digits = String(value ?? "").replace(/[^\d]/g, "");
    return digits || "0";
  }

  function formatUsesPerAccount(value) {
    const amount = Math.trunc(Number(value));
    if (!Number.isFinite(amount) || amount < 1) return "1";
    return String(Math.min(amount, 99));
  }

  function isSellerCreatedVoucher(voucher) {
    return Boolean(String(voucher?.sellerAdminId || "").trim());
  }

  function formatUsedCount(voucher) {
    const raw = Number(voucher?.usedCount);
    if (Number.isFinite(raw) && raw >= 0) return String(Math.trunc(raw));
    const ids = Array.isArray(voucher?.usedByUserIds) ? voucher.usedByUserIds : [];
    return String(ids.length);
  }

  function formatDiscountValue(value) {
    const digits = String(value ?? "").replace(/[^\d.]/g, "");
    if (!digits) return "";
    const amount = Number(digits);
    if (!Number.isFinite(amount) || amount <= 0) return "";
    return String(Math.round(amount));
  }

  function normalizeDiscountType(value) {
    return String(value || "").trim().toLowerCase() === "fixed"
      ? "fixed"
      : "percent";
  }

  function discountSubtitle(discountType, discountValue, freeShipping = false) {
    const value = formatDiscountValue(discountValue);
    if (!value && freeShipping) return "Free shipping on total purchase";
    if (discountType === "fixed") {
      const base = value
        ? `₱${value} off total purchase`
        : "Fixed amount off total purchase";
      return freeShipping ? `${base} · Free shipping` : base;
    }
    const base = value
      ? `${value}% of total purchase`
      : "Percent of total purchase";
    return freeShipping ? `${base} · Free shipping` : base;
  }

  function discountTitle(discountType, discountValue, freeShipping = false) {
    const value = formatDiscountValue(discountValue);
    if (value) {
      return discountType === "fixed" ? `₱${value} OFF` : `${value}% OFF`;
    }
    if (freeShipping) return "Free Shipping";
    return "";
  }

  function actionLabel(action) {
    if (action === "apply") return "Apply";
    if (action === "used") return "Used";
    if (action === "expired") return "Expired";
    return "Use Now";
  }

  function statusLabel(status) {
    if (status === "used") return "Used";
    if (status === "expired") return "Expired";
    if (status === "inactive") return "Inactive";
    if (status === "unavailable") return "Unavailable";
    if (status === "paused") return "Paused";
    if (status === "scheduled") return "Scheduled";
    if (status === "draft") return "Draft";
    if (status === "fully_redeemed") return "Fully redeemed";
    if (status === "budget_exhausted") return "Budget exhausted";
    if (status === "cancelled") return "Cancelled";
    return "Active";
  }

  function resolveVoucherStatus(voucher) {
    const status = String(voucher?.status || "").trim().toLowerCase();
    return [
      "draft",
      "scheduled",
      "active",
      "paused",
      "expired",
      "fully_redeemed",
      "budget_exhausted",
      "cancelled",
      "inactive",
      "used",
    ].includes(status)
      ? status
      : "active";
  }

  function voucherInactiveReasons(voucher) {
    const listed = Array.isArray(voucher?.inactiveReasons)
      ? voucher.inactiveReasons.filter((entry) => entry && (entry.title || entry.detail))
      : [];
    if (listed.length) return listed;
    const reason = String(voucher?.inactiveReason || "").trim().toLowerCase();
    const detail = String(voucher?.companyEnforcementReason || "").trim();
    if (reason === "company-restricted" || voucher?.companyIsRestricted) {
      return [{
        title: "Company is restricted",
        detail: detail || "Super Admin restricted this company. Store vouchers stay inactive until the restriction ends.",
      }];
    }
    if (reason === "company-banned" || voucher?.companyIsBanned) {
      return [{
        title: "Company is banned",
        detail: detail || "Super Admin banned this company. Store vouchers cannot be used until the company is unbanned.",
      }];
    }
    return [{
      title: "Voucher is inactive",
      detail: "This store voucher is not available to users.",
    }];
  }

  function voucherStatusControlHtml(voucher) {
    const status = displayVoucherStatus(voucher);
    if (status !== "inactive") {
      return `<span class="${voucherStatusPillClass(status)}">${escapeHtml(statusLabel(status))}</span>`;
    }
    const reasons = voucherInactiveReasons(voucher)
      .map((reason) => `
        <div class="super-admin-company-showcase__activity-reason">
          <span class="super-admin-company-showcase__activity-reason-title">${escapeHtml(reason.title || "Inactive")}</span>
          <span class="super-admin-company-showcase__activity-reason-detail">${escapeHtml(reason.detail || "")}</span>
        </div>
      `)
      .join("");
    return `
      <span class="super-admin-company-showcase__activity is-inactive sa-voucher-showcase__activity">
        <button type="button" class="business-type-card__status is-inactive super-admin-company-showcase__activity-pill super-admin-company-showcase__activity-trigger" data-voucher-inactive-toggle aria-expanded="false" aria-haspopup="true" aria-label="Inactive reasons">
          <span class="super-admin-company-showcase__activity-label">Inactive</span>
          <span class="super-admin-company-showcase__activity-chevron" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"></path></svg>
          </span>
        </button>
        <div class="super-admin-company-showcase__activity-menu sa-voucher-showcase__activity-menu" hidden>
          <strong class="super-admin-company-showcase__activity-menu-title">Why inactive?</strong>
          ${reasons}
        </div>
      </span>
    `;
  }

  function closeVoucherInactiveMenus(except = null) {
    document.querySelectorAll(".sa-voucher-showcase__activity.is-open, .sa-voucher-card__activity.is-open").forEach((node) => {
      if (except && node === except) return;
      node.classList.remove("is-open");
      const trigger = node.querySelector("[data-voucher-inactive-toggle]");
      const menu = node.querySelector(".super-admin-company-showcase__activity-menu, .sa-voucher-card__activity-menu");
      if (trigger) trigger.setAttribute("aria-expanded", "false");
      if (menu) menu.hidden = true;
    });
  }

  function setVoucherInactiveMenuOpen(wrap, open) {
    if (!(wrap instanceof HTMLElement)) return;
    if (open) closeVoucherInactiveMenus(wrap);
    wrap.classList.toggle("is-open", open);
    const trigger = wrap.querySelector("[data-voucher-inactive-toggle]");
    const menu = wrap.querySelector(".super-admin-company-showcase__activity-menu, .sa-voucher-card__activity-menu");
    if (trigger) trigger.setAttribute("aria-expanded", open ? "true" : "false");
    if (menu) menu.hidden = !open;
  }

  function voucherStatusPillClass(status) {
    if (status === "unavailable" || status === "scheduled") return "business-type-card__status is-unavailable";
    if (status === "expired" || status === "inactive" || status === "cancelled" || status === "paused") {
      return "business-type-card__status is-inactive";
    }
    if (status === "used" || status === "fully_redeemed" || status === "budget_exhausted") {
      return "business-type-card__status is-in-review";
    }
    return "business-type-card__status";
  }

  function isNoExpiryVoucher(voucher) {
    return !String(voucher?.date || "").trim();
  }

  function isPassiveVoucher(voucher) {
    return voucherRedemptionMethod(voucher) === "auto_apply";
  }

  function voucherRedemptionMethod(voucher) {
    const raw = String(voucher?.redemptionMethod || "")
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");
    if (raw === "claim" || raw === "auto_apply" || raw === "enter_code") return raw;
    return Boolean(voucher?.passive ?? voucher?.isPassive) ? "auto_apply" : "enter_code";
  }

  function optionLabel(options, value, fallback) {
    return options.find((entry) => entry.value === value)?.label || fallback || value;
  }

  function normalizeUserEligibility(value) {
    const raw = String(value || "")
      .trim()
      .toLowerCase();
    if (["first_order", "new_customers", "no_previous_order"].includes(raw)) {
      return "first_order";
    }
    return "all";
  }

  function setHiddenChoice(input, labelNode, menuId, value, options) {
    const next = String(value || "").trim();
    if (input instanceof HTMLInputElement) input.value = next;
    if (labelNode) labelNode.textContent = optionLabel(options, next, next);
    syncVoucherChoiceOptions(document.getElementById(menuId), next);
  }

  function setFlagToggle(input, toggle, enabled, yesLabel = "Yes", noLabel = "No") {
    const next = Boolean(enabled);
    if (input instanceof HTMLInputElement) input.checked = next;
    if (toggle instanceof HTMLElement) {
      toggle.classList.toggle("is-active", next);
      toggle.setAttribute("aria-pressed", next ? "true" : "false");
      const label = toggle.querySelector("span:last-child");
      if (label) label.textContent = next ? yesLabel : noLabel;
    }
  }

  function splitIdList(value) {
    return String(value || "")
      .split(/[\n,]+/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  function includeIdsForScope(scopeType, voucher = {}) {
    if (scopeType === "selected_sellers") return voucher.includeSellerIds;
    if (scopeType === "selected_categories") return voucher.includeCategoryIds;
    if (scopeType === "selected_business_types") return voucher.includeBusinessTypeIds;
    if (scopeType === "selected_brands") return voucher.includeBrandIds;
    if (scopeType === "selected_products") return voucher.includeProductIds;
    if (scopeType === "selected_variants") return voucher.includeVariantIds;
    return [];
  }

  function excludeIdsFromVoucher(voucher = {}) {
    return [
      ...(voucher.excludeSellerIds || []),
      ...(voucher.excludeCategoryIds || []),
      ...(voucher.excludeBrandIds || []),
      ...(voucher.excludeProductIds || []),
      ...(voucher.excludeVariantIds || []),
    ];
  }

  function isLegacyIdScope(scopeType) {
    const value = String(scopeType || "");
    return value !== "entire_platform" && value !== "selected_business_types" &&
      SCOPE_OPTIONS.some((entry) => entry.value === value);
  }

  function effectiveScopeType(types = voucherBusinessTypes(voucherPlatformValue())) {
    const saved = String(els.scopeTypeInput?.value || "entire_platform");
    // Keep the saved scope until the business types load and the edit selection is restored.
    if (state.businessTypeHydrate) return saved;
    const ids = selectedBusinessTypeIds(types);
    if (!ids.length && isLegacyIdScope(saved)) return saved;
    if (!types.length || ids.length === types.length) return "entire_platform";
    return "selected_business_types";
  }

  function payloadBusinessTypeIds(types = voucherBusinessTypes(voucherPlatformValue())) {
    return state.businessTypeHydrate
      ? [...state.businessTypeHydrate]
      : selectedBusinessTypeIds(types);
  }

  function scopedExcludeIds(scopeType) {
    if (String(scopeType || "entire_platform") === "entire_platform") return [];
    return splitIdList(els.excludeIdsInput?.value);
  }

  function assignIncludeIds(scopeType, ids) {
    const payload = {
      includeSellerIds: [],
      includeCategoryIds: [],
      includeBusinessTypeIds: [],
      includeBrandIds: [],
      includeProductIds: [],
      includeVariantIds: [],
    };
    if (scopeType === "selected_sellers") payload.includeSellerIds = ids;
    else if (scopeType === "selected_categories") payload.includeCategoryIds = ids;
    else if (scopeType === "selected_business_types") payload.includeBusinessTypeIds = ids;
    else if (scopeType === "selected_brands") payload.includeBrandIds = ids;
    else if (scopeType === "selected_products") payload.includeProductIds = ids;
    else if (scopeType === "selected_variants") payload.includeVariantIds = ids;
    return payload;
  }

  function categoryKey(name) {
    return String(name || "").trim().toLowerCase();
  }

  function isActiveStatus(value) {
    return !["inactive", "deactivated", "disabled", "off"].includes(
      String(value || "active").trim().toLowerCase(),
    );
  }

  function voucherBusinessTypes(platformId) {
    const selectedPlatform = normalizePlatformId(platformId);
    if (!selectedPlatform) return [];
    const multiPlatform = selectedPlatform === "multi";
    const multiIds = new Set(multiPlatform ? selectedVoucherPlatformIds() : []);
    const showAllPlatforms = selectedPlatform === "all" || multiPlatform;
    const types = [];
    const seen = new Set();
    for (const type of Array.isArray(state.storeTypes) ? state.storeTypes : []) {
      if (!type || !isActiveStatus(type.status)) continue;
      const typePlatform = normalizePlatformId(type.platformId) || "shop";
      if (multiPlatform && !multiIds.has(typePlatform)) continue;
      if (!showAllPlatforms && typePlatform !== selectedPlatform) continue;
      const id = String(type.id || type.name || "").trim();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const baseName = String(type.name || "Business type");
      types.push({
        id,
        key: categoryKey(id),
        nameKey: categoryKey(baseName),
        platformId: typePlatform,
        baseName,
        name: showAllPlatforms ? `${baseName} · ${platformLabel(typePlatform)}` : baseName,
        iconImageUrl: String(
          type.iconImageUrl || type.iconUrl || type.businessTypeIconUrl || "",
        ).trim(),
        iconName: String(type.iconName || type.lucideIconName || "").trim(),
      });
    }
    return types.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  }

  /** @param {string[] | null} savedIds business type ids to restore on edit, or null to auto-select all. */
  function resetBusinessTypeSelection(savedIds = null) {
    state.businessTypes = new Set();
    state.businessTypeKnown = new Set();
    state.businessTypeHydrate = Array.isArray(savedIds)
      ? new Set(savedIds.map((id) => String(id || "").trim()).filter(Boolean))
      : null;
  }

  /** New business types start selected; an edit restores its saved picks once types load. */
  function syncBusinessTypeAutoSelect(types) {
    if (!types.length) return;
    const saved = state.businessTypeHydrate;
    const savedKeys = saved ? new Set([...saved].map(categoryKey)) : null;
    for (const type of types) {
      if (state.businessTypeKnown.has(type.id)) continue;
      state.businessTypeKnown.add(type.id);
      if (savedKeys && !savedKeys.has(type.key) && !savedKeys.has(type.nameKey)) continue;
      state.businessTypes.add(type.id);
    }
    state.businessTypeHydrate = null;
  }

  function selectedBusinessTypeIds(types) {
    return types.filter((type) => state.businessTypes.has(type.id)).map((type) => type.id);
  }

  function businessTypeChipHtml(type, selected) {
    const businessIcon = creatorBusinessTypeIconHtml({
      sellerAdminId: "business-type-picker",
      businessType: type.baseName || type.name,
      businessTypeIconUrl: type.iconImageUrl,
      businessTypeIconName: type.iconName,
    });
    const actionIcon = selected
      ? '<svg class="sa-voucher-bt-chip__action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>'
      : '<svg class="sa-voucher-bt-chip__action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
    const attr = selected ? "data-voucher-business-type-remove" : "data-voucher-business-type-add";
    const label = selected ? `Remove ${type.name}` : `Add ${type.name}`;
    return `<button type="button" class="sa-voucher-bt-chip${selected ? " is-selected" : " is-available"}" ${attr}="${escapeHtml(type.id)}" aria-label="${escapeHtml(label)}"><span class="sa-voucher-bt-chip__type-icon" aria-hidden="true">${businessIcon}</span><span class="sa-voucher-bt-chip__name">${escapeHtml(type.name)}</span>${actionIcon}</button>`;
  }

  function renderVoucherCategoryPicker() {
    refreshElements();
    const platformId = voucherPlatformValue();
    const types = voucherBusinessTypes(platformId);
    syncBusinessTypeAutoSelect(types);
    const scopeType = effectiveScopeType(types);
    const platformName = voucherPlatformSummary();
    const selected = types.filter((type) => state.businessTypes.has(type.id));
    const query = categoryKey(state.categorySearch);
    const available = types.filter(
      (type) => !state.businessTypes.has(type.id) && (!query || categoryKey(type.name).includes(query)),
    );
    const remaining = types.length - selected.length;
    if (els.categoryHelper instanceof HTMLElement) {
      let helper = "";
      if (!platformId) {
        helper = "Select a platform to see its business types.";
      } else if (isLegacyIdScope(scopeType)) {
        const legacyLabel = optionLabel(SCOPE_OPTIONS, scopeType, scopeType).toLowerCase();
        helper = `This voucher is limited to ${legacyLabel}. Add business types to switch it to business type targeting.`;
      } else if (!types.length) {
        helper = `${platformName} has no business types yet, so the voucher applies to every listing.`;
      } else if (selected.length === types.length) {
        helper = `Applies to all of ${platformName}, including business types and categories added later.`;
      } else if (selected.length) {
        helper = "New categories added under these business types are included automatically.";
      }
      els.categoryHelper.textContent = helper;
      els.categoryHelper.hidden = !helper;
    }
    const showPicker = Boolean(platformId) && types.length > 0;
    if (els.categoryPicker instanceof HTMLElement) els.categoryPicker.hidden = !showPicker;
    if (!showPicker) return;
    if (els.businessTypes instanceof HTMLElement) {
      els.businessTypes.innerHTML = selected.length
        ? selected.map((type) => businessTypeChipHtml(type, true)).join("")
        : '<p class="sa-voucher-bt-picker__empty">Nothing selected yet. Add at least one below.</p>';
    }
    if (els.categoryCount) {
      els.categoryCount.textContent = remaining
        ? `${remaining} ${remaining === 1 ? "business type" : "business types"} in ${platformName}`
        : `All ${types.length} business types in ${platformName} are selected`;
    }
    if (els.categoryList instanceof HTMLElement) {
      els.categoryList.innerHTML = available.length
        ? available.map((type) => businessTypeChipHtml(type, false)).join("")
        : `<p class="sa-voucher-bt-picker__empty">${
            query && remaining ? "No business types match your search." : "Everything is already added."
          }</p>`;
    }
    const addAll = document.querySelector("#voucher-modal [data-voucher-business-type-all]");
    if (addAll instanceof HTMLElement) {
      addAll.textContent = remaining ? "Add all" : "Remove all";
      addAll.dataset.voucherBusinessTypeAll = remaining ? "add" : "remove";
    }
  }

  function setBusinessTypeSelected(typeId, selected) {
    if (selected) state.businessTypes.add(typeId);
    else state.businessTypes.delete(typeId);
    renderVoucherCategoryPicker();
  }

  function setAllBusinessTypes(selected) {
    state.businessTypes = selected
      ? new Set(voucherBusinessTypes(voucherPlatformValue()).map((type) => type.id))
      : new Set();
    renderVoucherCategoryPicker();
  }

  function syncAdvancedVoucherFields() {
    refreshElements();
    const discountType = normalizeDiscountType(els.discountTypeInput?.value);
    const redemption = String(els.redemptionInput?.value || "enter_code");
    const freeShipping = Boolean(els.freeShippingInput?.checked);
    const shippingType = String(els.shippingTypeInput?.value || "full");
    const funding = String(els.fundingInput?.value || "platform");
    document.querySelectorAll("[data-voucher-percent-only]").forEach((node) => {
      if (node instanceof HTMLElement) node.hidden = discountType !== "percent";
    });
    if (els.shippingFields instanceof HTMLElement) els.shippingFields.hidden = !freeShipping;
    if (els.shippingCapWrap instanceof HTMLElement) {
      els.shippingCapWrap.hidden = !freeShipping || shippingType !== "cap";
    }
    if (els.includeField instanceof HTMLElement) els.includeField.hidden = true;
    if (els.excludeField instanceof HTMLElement) els.excludeField.hidden = true;
    syncShippingOptionalLabels();
    renderVoucherCategoryPicker();
    document.querySelectorAll("[data-voucher-shared-fields]").forEach((node) => {
      if (node instanceof HTMLElement) node.hidden = funding !== "shared";
    });
    if (els.codeInput instanceof HTMLInputElement) {
      els.codeInput.required = redemption === "enter_code";
      els.codeInput.placeholder = redemption === "enter_code" ? "FASHION20" : "Optional internal code";
    }
    if (els.redemptionHelper) {
      els.redemptionHelper.textContent =
        REDEMPTION_OPTIONS.find((entry) => entry.value === redemption)?.helper || "";
    }
    if (els.schedulePreview) {
      const start = String(els.startDateInput?.value || "").trim();
      const end = String(els.dateInput?.value || "").trim();
      els.schedulePreview.textContent = `Active ${start || "on publish"} to ${end || "no end date"}`;
    }
  }

  function syncShippingOptionalLabels() {
    const freeShipping = Boolean(els.freeShippingInput?.checked);
    document.querySelectorAll("#voucher-modal [data-voucher-shipping-optional]").forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      if (!node.dataset.baseLabel) node.dataset.baseLabel = node.textContent.trim();
      node.innerHTML = `${escapeHtml(node.dataset.baseLabel)}${
        freeShipping ? ' <em class="sa-voucher-modal__optional">(optional)</em>' : ""
      }`;
    });
  }

  function setPassiveToggle(enabled) {
    setRedemptionMethod(enabled ? "auto_apply" : "enter_code");
  }

  function setRedemptionMethod(value) {
    refreshElements();
    const next = REDEMPTION_OPTIONS.some((entry) => entry.value === value) ? value : "enter_code";
    setHiddenChoice(els.redemptionInput, els.redemptionLabel, "voucher-redemption-menu", next, REDEMPTION_OPTIONS);
    syncAdvancedVoucherFields();
  }

  function setFreeShippingToggle(enabled) {
    refreshElements();
    const next = Boolean(enabled);
    if (els.freeShippingInput instanceof HTMLInputElement) {
      els.freeShippingInput.checked = next;
    }
    if (els.freeShippingToggle instanceof HTMLElement) {
      els.freeShippingToggle.classList.toggle("is-active", next);
      els.freeShippingToggle.setAttribute("aria-pressed", next ? "true" : "false");
    }
    if (els.freeShippingToggleLabel) {
      els.freeShippingToggleLabel.textContent = next ? "On" : "Off";
    }
    syncVoucherChoiceOptions(
      document.getElementById("voucher-free-shipping-menu"),
      next ? "on" : "off",
    );
    if (els.discountValueInput instanceof HTMLInputElement) {
      els.discountValueInput.required = !next;
    }
    syncAdvancedVoucherFields();
  }

  function isFreeShippingVoucher(voucher) {
    return Boolean(voucher?.freeShipping ?? voucher?.isFreeShipping);
  }

  function readRepeatDays() {
    refreshElements();
    if (!(els.repeatDaysMenu instanceof HTMLElement)) return [];
    return Array.from(els.repeatDaysMenu.querySelectorAll("[data-repeat-day]"))
      .filter((button) => button.getAttribute("aria-pressed") === "true")
      .map((button) => String(button.getAttribute("data-repeat-day") || "").trim().toLowerCase())
      .filter((day) => REPEAT_DAY_KEYS.includes(day));
  }

  function syncRepeatDaysUi(days = readRepeatDays()) {
    refreshElements();
    const selected = normalizeRepeatDays(days);
    if (els.repeatDaysMenu instanceof HTMLElement) {
      els.repeatDaysMenu.querySelectorAll("[data-repeat-day]").forEach((button) => {
        const day = String(button.getAttribute("data-repeat-day") || "").trim().toLowerCase();
        const on = selected.includes(day);
        button.classList.toggle("is-selected", on);
        button.classList.toggle("is-active", on);
        button.setAttribute("aria-pressed", on ? "true" : "false");
        button.setAttribute("aria-selected", on ? "true" : "false");
      });
    }
    if (els.repeatDaysLabel) {
      els.repeatDaysLabel.textContent = selected.length
        ? selected.map((day) => REPEAT_DAY_SHORT[day] || day).join(", ")
        : "Select days";
    }
  }

  function toggleRepeatDay(day) {
    const key = String(day || "").trim().toLowerCase();
    if (!REPEAT_DAY_KEYS.includes(key)) return;
    const current = new Set(readRepeatDays());
    if (current.has(key)) current.delete(key);
    else current.add(key);
    syncRepeatDaysUi([...current]);
  }

  function setRepeatTime(which, value) {
    refreshElements();
    const nextValue = formatVoucherTimeInputValue(value);
    const picker = which === "end" ? els.repeatEndTimePicker : els.repeatStartTimePicker;
    const input = which === "end" ? els.repeatEndTimeInput : els.repeatStartTimeInput;
    if (picker instanceof HTMLElement && window.SwitchTimePicker?.setValue) {
      window.SwitchTimePicker.setValue(picker, nextValue, { emit: false });
      return;
    }
    if (input instanceof HTMLInputElement) input.value = nextValue;
  }

  function setRepeatWeeklyToggle(enabled, { days, startTime, endTime } = {}) {
    refreshElements();
    const next = Boolean(enabled);
    if (els.repeatInput instanceof HTMLInputElement) els.repeatInput.checked = next;
    if (els.repeatToggle instanceof HTMLElement) {
      els.repeatToggle.classList.toggle("is-active", next);
      els.repeatToggle.setAttribute("aria-pressed", next ? "true" : "false");
    }
    if (els.repeatToggleLabel) els.repeatToggleLabel.textContent = next ? "On" : "Off";
    if (els.repeatPanel instanceof HTMLElement) els.repeatPanel.hidden = !next;
    if (days) syncRepeatDaysUi(days);
    else if (!next) syncRepeatDaysUi([]);
    if (startTime !== undefined) setRepeatTime("start", startTime);
    if (endTime !== undefined) setRepeatTime("end", endTime);
    if (!next) {
      setRepeatTime("start", "");
      setRepeatTime("end", "");
      syncRepeatDaysUi([]);
    }
    syncAdvancedVoucherFields();
  }

  function initializeRepeatPickers() {
    refreshElements();
    if (els.repeatStartTimePicker instanceof HTMLElement) {
      window.SwitchTimePicker?.bind(els.repeatStartTimePicker);
    }
    if (els.repeatEndTimePicker instanceof HTMLElement) {
      window.SwitchTimePicker?.bind(els.repeatEndTimePicker);
    }
    if (state.repeatPickerBound) return;
    state.repeatPickerBound = true;
    els.repeatStartTimeInput?.addEventListener("change", () => updatePreview());
    els.repeatEndTimeInput?.addEventListener("change", () => updatePreview());
  }

  function syncDiscountValueUi(discountType) {
    refreshElements();
    const isPercent = discountType !== "fixed";
    if (els.discountValueLabel instanceof HTMLElement) {
      els.discountValueLabel.dataset.baseLabel = isPercent
        ? "Discount price (%)"
        : "Fixed price (₱)";
      syncShippingOptionalLabels();
    }
    if (els.discountValueHelper) {
      els.discountValueHelper.textContent = isPercent
        ? "How many percent off the buyer's total purchase."
        : "Fixed peso amount off the buyer's total purchase.";
    }
    if (els.discountValueInput instanceof HTMLInputElement) {
      els.discountValueInput.placeholder = isPercent ? "20" : "100";
      els.discountValueInput.min = "1";
      els.discountValueInput.max = isPercent ? "100" : "";
      if (isPercent) {
        els.discountValueInput.setAttribute("max", "100");
      } else {
        els.discountValueInput.removeAttribute("max");
      }
    }
  }

  function setDiscountTypeToggle(discountType) {
    refreshElements();
    const next = normalizeDiscountType(discountType);
    const isPercent = next === "percent";
    if (els.discountTypeInput instanceof HTMLInputElement) {
      els.discountTypeInput.value = next;
    }
    if (els.discountTypeToggle instanceof HTMLElement) {
      els.discountTypeToggle.classList.toggle("is-active", isPercent);
      els.discountTypeToggle.setAttribute(
        "aria-pressed",
        isPercent ? "true" : "false",
      );
    }
    if (els.discountTypeToggleLabel) {
      els.discountTypeToggleLabel.textContent = isPercent
        ? "Percent"
        : "Fixed price";
    }
    syncVoucherChoiceOptions(
      document.getElementById("voucher-discount-type-menu"),
      next,
    );
    syncDiscountValueUi(next);
    syncAdvancedVoucherFields();
  }

  function voucherDirectoryCardHtml(voucher) {
    const status = displayVoucherStatus(voucher);
    const isActive = status === "active";
    const discountType = normalizeDiscountType(
      voucher.discountType ||
        (voucher.kind === "gift" || voucher.kind === "fixed" ? "fixed" : "percent"),
    );
    const discountValue = formatDiscountValue(voucher.discountValue);
    const freeShipping = isFreeShippingVoucher(voucher);
    const title =
      String(voucher.title || "").trim() ||
      discountTitle(discountType, discountValue, freeShipping) ||
      "Voucher";
    const code = String(voucher.code || "CODE").trim().toUpperCase() || "CODE";
    const minSpend = formatMinSpend(voucher.minimumSpend);
    const platform = voucherPlatformsLabel(voucher);
    const platformId = normalizePlatformId(voucher.platformId);
    const accentAttr = accentStyleAttr(resolveShopColor(voucher));
    const kindForIcon = freeShipping && !discountValue ? "shipping" : voucher.kind;
    const discountLabel =
      discountValue
        ? discountType === "fixed"
          ? `₱${discountValue} off`
          : `${discountValue}% off`
        : freeShipping
          ? "Free shipping"
          : discountType === "fixed"
            ? "Fixed price"
            : "Percent";
    const usedCount = formatUsedCount(voucher);
    const redemption = voucherRedemptionMethod(voucher);
    const funding = String(voucher.fundingSource || "platform");
    const usageLimit = Number(voucher.totalUsageLimit) || 0;
    const usedTimes = Number(voucher.usedTimes) || 0;
    const usageLabel = usageLimit > 0 ? `${usedTimes} / ${usageLimit}` : `${usedTimes}`;
    const redemptionPercent =
      usageLimit > 0 ? Math.min(100, Math.max(0, (usedTimes / usageLimit) * 100)) : 0;
    const budgetAllocated = Number(voucher.allocatedBudget) || 0;
    const budgetUsed = Number(voucher.usedBudget) || 0;
    const offerSummary = [
      discountLabel,
      freeShipping && discountValue ? "Free shipping" : null,
      optionLabel(REDEMPTION_OPTIONS, redemption, redemption),
    ].filter(Boolean).join(" · ");

    return `
      <article
        class="sa-voucher-directory-card sa-showcase-card super-admin-company-showcase business-type-showcase${!isActive ? " is-muted" : ""}${status === "unavailable" ? " is-unavailable" : ""}"
        data-voucher-id="${escapeHtml(voucherRef(voucher))}"
        data-platform-id="${escapeHtml(platformId)}"
        role="listitem"
        aria-label="${escapeHtml(`${title}, ${code}`)}"
        ${accentAttr}
      >
        <div class="business-type-showcase__hero">
          <div class="business-type-showcase__content">
            <div class="business-type-showcase__identity">
              <span class="business-type-showcase__icon-wrap">
                <span class="business-type-showcase__icon sa-voucher-showcase__icon" aria-hidden="true">
                  <span class="business-type-showcase__icon-surface">${voucherIconSvg(kindForIcon)}</span>
                </span>
              </span>
              <div class="business-type-showcase__heading">
                <div class="business-type-showcase__title-row">
                  <h3 class="business-type-showcase__title">${escapeHtml(title)}</h3>
                  ${voucherStatusControlHtml(voucher)}
                  <div class="sa-voucher-showcase__actions super-admin-company-card__quick-actions" aria-label="Voucher actions">
                    ${
                      isSellerCreatedVoucher(voucher)
                        ? ""
                        : `<button type="button" class="sa-voucher-showcase__action super-admin-company-card__quick-action" data-voucher-edit="${escapeHtml(voucherRef(voucher))}" data-tooltip="Edit voucher" aria-label="Edit ${escapeHtml(code)}" title="Edit voucher">
                      ${voucherActionIconSvg(VOUCHER_ACTION_ICON.edit)}
                    </button>
                    <button type="button" class="sa-voucher-showcase__action super-admin-company-card__quick-action" data-voucher-duplicate="${escapeHtml(voucherRef(voucher))}" data-tooltip="Duplicate voucher" aria-label="Duplicate ${escapeHtml(code)}" title="Duplicate voucher">
                      ${voucherActionIconSvg(VOUCHER_ACTION_ICON.copy)}
                    </button>
                    ${
                      status === "paused"
                        ? `<button type="button" class="sa-voucher-showcase__action super-admin-company-card__quick-action" data-voucher-resume="${escapeHtml(voucherRef(voucher))}" data-tooltip="Resume voucher" aria-label="Resume ${escapeHtml(code)}" title="Resume voucher">
                      ${voucherActionIconSvg(VOUCHER_ACTION_ICON.play)}
                    </button>`
                        : `<button type="button" class="sa-voucher-showcase__action super-admin-company-card__quick-action" data-voucher-pause="${escapeHtml(voucherRef(voucher))}" data-tooltip="Pause voucher" aria-label="Pause ${escapeHtml(code)}" title="Pause voucher">
                      ${voucherActionIconSvg(VOUCHER_ACTION_ICON.pause)}
                    </button>`
                    }
                    `
                    }
                    <button type="button" class="sa-voucher-showcase__action super-admin-company-card__quick-action super-admin-company-card__quick-action--danger is-danger" data-voucher-delete="${escapeHtml(voucherRef(voucher))}" data-tooltip="Delete voucher" aria-label="Delete ${escapeHtml(code)}" title="Delete voucher">
                      ${voucherActionIconSvg(VOUCHER_ACTION_ICON.trash)}
                    </button>
                  </div>
                </div>
                <p class="business-type-showcase__tagline sa-voucher-showcase__code">${escapeHtml(code)}</p>
              </div>
            </div>

            <p class="business-type-showcase__description sa-voucher-showcase__description">
              ${escapeHtml(offerSummary)} for ${escapeHtml(platform)} Switch Users.
            </p>

            <div class="business-type-showcase__stats sa-voucher-showcase__stats">
              <div class="business-type-showcase__stat">
                <span class="business-type-showcase__stat-icon" aria-hidden="true">${voucherIconSvg(kindForIcon)}</span>
                <span class="business-type-showcase__stat-copy"><strong>${escapeHtml(discountLabel)}</strong><span>Offer</span></span>
              </div>
              <div class="business-type-showcase__stat">
                <span class="business-type-showcase__stat-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="m3.173 8.18 11-5a2 2 0 0 1 2.647.993L18.56 8"/><path d="M6 10V8"/><path d="M6 14v1"/><path d="M6 19v2"/><rect x="2" y="8" width="20" height="13" rx="2"/></svg>
                </span>
                <span class="business-type-showcase__stat-copy"><strong>₱${escapeHtml(minSpend)}</strong><span>Min. spend</span></span>
              </div>
              <div class="business-type-showcase__stat">
                <span class="business-type-showcase__stat-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </span>
                <span class="business-type-showcase__stat-copy"><strong>${escapeHtml(usedCount)}</strong><span>${Number(usedCount) === 1 ? "User used" : "Users used"}</span></span>
              </div>
              <div class="business-type-showcase__stat">
                <span class="business-type-showcase__stat-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m7 16 4-5 4 3 4-6"/></svg>
                </span>
                <span class="business-type-showcase__stat-copy"><strong>${escapeHtml(usageLabel)}</strong><span>Usage</span></span>
              </div>
              <div class="business-type-showcase__stat">
                <span class="business-type-showcase__stat-icon" aria-hidden="true">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-ticket-check preview-icon"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="m9 12 2 2 4-4"/></svg>
                </span>
                <span class="business-type-showcase__stat-copy"><strong>${escapeHtml(String(Number(voucher.claimedCount) || 0))}</strong><span>Claims</span></span>
              </div>
            </div>

            <div class="business-type-showcase__settings sa-voucher-showcase__settings">
              ${uniqueIdSettingHtml(
                isVoucherUpcoming(voucher) ? "" : String(voucher.id || "").trim(),
                "Voucher ID",
              )}
              <span class="business-type-showcase__setting sa-voucher-showcase__setting">
                <span class="business-type-showcase__setting-label">Platform</span>
                <span class="business-type-showcase__setting-value"><strong>${escapeHtml(platform)}</strong></span>
              </span>
              <span class="business-type-showcase__setting sa-voucher-showcase__setting">
                <span class="business-type-showcase__setting-label">Funding</span>
                <span class="business-type-showcase__setting-value"><strong>${escapeHtml(optionLabel(FUNDING_OPTIONS, funding, funding))}</strong></span>
              </span>
              ${
                budgetAllocated
                  ? `<span class="business-type-showcase__setting sa-voucher-showcase__setting">
                <span class="business-type-showcase__setting-label">Budget used</span>
                <span class="business-type-showcase__setting-value"><strong>₱${escapeHtml(String(budgetUsed))} / ₱${escapeHtml(String(budgetAllocated))}</strong></span>
              </span>`
                  : ""
              }
              ${
                freeShipping
                  ? `<span class="business-type-showcase__setting sa-voucher-showcase__setting">
                <span class="business-type-showcase__setting-label">Shipping</span>
                <span class="business-type-showcase__setting-value"><strong>Free</strong></span>
              </span>`
                  : ""
              }
            </div>
            ${
              usageLimit > 0
                ? `<div
              class="super-admin-company-showcase__progress sa-voucher-showcase__redemption-progress"
              role="progressbar"
              aria-label="${escapeHtml(`${usedTimes} of ${usageLimit} redemptions used`)}"
              aria-valuemin="0"
              aria-valuemax="${escapeHtml(String(usageLimit))}"
              aria-valuenow="${escapeHtml(String(Math.min(usedTimes, usageLimit)))}"
            >
              <div class="super-admin-company-showcase__progress-meta">
                <span class="super-admin-company-showcase__progress-label">Redeemed</span>
                <strong class="super-admin-company-showcase__progress-value">${escapeHtml(usageLabel)} · ${Math.round(redemptionPercent)}%</strong>
              </div>
              <div class="super-admin-company-showcase__progress-track">
                <span class="super-admin-company-showcase__progress-fill${redemptionPercent >= 100 ? " is-complete" : ""}" style="width: ${redemptionPercent.toFixed(2)}%"></span>
              </div>
            </div>`
                : ""
            }
          </div>

          <div class="business-type-showcase__media sa-voucher-showcase__media" aria-label="Voucher preview">
            ${creatorBusinessTypeGlowHtml()}
            <div class="sa-voucher-showcase__preview">
              ${voucherPromoHtml(voucher)}
            </div>
          </div>
        </div>
      </article>
    `;
  }

  function inventoryRowHtml(voucher) {
    const code = String(voucher.code || "").trim().toUpperCase() || "—";
    const title = String(voucher.title || "Voucher").trim() || "Voucher";
    return `
      <div class="sa-voucher-modal__inventory-row">
        <div>
          <strong>${escapeHtml(code)}</strong>
          <span>${escapeHtml(title)}</span>
        </div>
        <span class="sa-voucher-modal__inventory-platform">${escapeHtml(voucherPlatformsLabel(voucher))}</span>
        ${voucherStatusControlHtml(voucher)}
      </div>
    `;
  }

  function parseVoucherDateInputValue(value) {
    const match = String(value ?? "").trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    const year = Number(match[1]);
    const monthIndex = Number(match[2]) - 1;
    const day = Number(match[3]);
    const date = new Date(year, monthIndex, day);
    return date.getFullYear() === year &&
      date.getMonth() === monthIndex &&
      date.getDate() === day
      ? date
      : null;
  }

  function formatVoucherDateInputValue(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function formatVoucherDateDisplay(value) {
    const date = value instanceof Date ? value : parseVoucherDateInputValue(value);
    if (!(date instanceof Date)) return "--:--";
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  }

  function parseVoucherTimeInputValue(value) {
    const match = String(value ?? "").trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours > 23 || minutes > 59) {
      return null;
    }
    return { hours, minutes };
  }

  function formatVoucherTimeInputValue(value) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;
    }
    const parsed = parseVoucherTimeInputValue(value);
    if (!parsed) return "";
    return `${String(parsed.hours).padStart(2, "0")}:${String(parsed.minutes).padStart(2, "0")}`;
  }

  function formatVoucherTimeDisplay(value) {
    const parsed =
      value instanceof Date && !Number.isNaN(value.getTime())
        ? { hours: value.getHours(), minutes: value.getMinutes() }
        : parseVoucherTimeInputValue(value);
    if (!parsed) return "--:--";
    const hour12 = parsed.hours % 12 || 12;
    const period = parsed.hours >= 12 ? "PM" : "AM";
    return `${hour12}:${String(parsed.minutes).padStart(2, "0")} ${period}`;
  }

  function formatVoucherExpiryDisplay(date, timeValue) {
    const dateLabel = formatVoucherDateDisplay(date);
    if (dateLabel === "--.--" || dateLabel === "--:--" || dateLabel === "mm/dd/yyyy") return "";
    const timeLabel = formatVoucherTimeDisplay(timeValue);
    return timeLabel === "--.--" || timeLabel === "--:--" ? dateLabel : `${dateLabel} ${timeLabel}`;
  }

  function isVoucherExpiryDateTimeInPast(dateValue, timeValue) {
    const parsedDate =
      dateValue instanceof Date ? dateValue : parseVoucherDateInputValue(dateValue);
    if (!(parsedDate instanceof Date)) return false;
    const parsedTime = parseVoucherTimeInputValue(timeValue) || { hours: 23, minutes: 59 };
    const expiry = new Date(
      parsedDate.getFullYear(),
      parsedDate.getMonth(),
      parsedDate.getDate(),
      parsedTime.hours,
      parsedTime.minutes,
      0,
      0,
    );
    return expiry.getTime() <= Date.now();
  }

  const MIN_VOUCHER_DURATION_MS = 60 * 60 * 1000;

  function startOfVoucherDay(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function isSameVoucherDayAsToday(value) {
    const day = startOfVoucherDay(
      value instanceof Date ? value : parseVoucherDateInputValue(value),
    );
    const today = startOfVoucherDay(new Date());
    return Boolean(day && today && day.getTime() === today.getTime());
  }

  function formatPickerHm(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }

  function getMinVoucherStartDateTime() {
    refreshElements();
    const startDate = parseVoucherDateInputValue(els.startDateInput?.value);
    if (!startDate) return null;
    const allowPast = Boolean(state.editingId && isVoucherDateInPast(startDate));
    if (allowPast) return null;
    if (!isSameVoucherDayAsToday(startDate)) return null;
    return new Date();
  }

  function syncStartScheduleBounds({ announce = false } = {}) {
    refreshElements();
    const minStart = getMinVoucherStartDateTime();
    window.SwitchTimePicker?.setMinTime?.(
      els.startTimePicker,
      minStart ? formatPickerHm(minStart) : "",
    );
    const startMs = voucherDateTimeMs(
      els.startDateInput?.value,
      formatVoucherTimeInputValue(els.startTimeInput?.value),
    );
    if (minStart && startMs != null && startMs < minStart.getTime()) {
      setVoucherStartTime("");
      if (announce) {
        setModalFeedback("Start time cannot be earlier than now.", "error");
      }
    }
  }

  function getMinVoucherEndDateTime() {
    refreshElements();
    const startMs = voucherDateTimeMs(
      els.startDateInput?.value,
      formatVoucherTimeInputValue(els.startTimeInput?.value),
    );
    if (startMs == null) return null;
    return new Date(startMs + MIN_VOUCHER_DURATION_MS);
  }

  function getEndPickerMinDate() {
    const allowPast = Boolean(
      state.editingId && isVoucherDateInPast(els.dateInput?.value),
    );
    if (allowPast) return false;
    const today = startOfVoucherDay(new Date());
    const minEnd = getMinVoucherEndDateTime();
    const minDay = minEnd ? startOfVoucherDay(minEnd) : null;
    if (today && minDay && minDay.getTime() > today.getTime()) return minDay;
    return today || "today";
  }

  function syncEndScheduleBounds({ announce = false } = {}) {
    refreshElements();
    const minEnd = getMinVoucherEndDateTime();
    if (els.datePicker instanceof HTMLElement) {
      window.SwitchDatePicker?.bind(els.datePicker, {
        minDate: getEndPickerMinDate(),
        allowClear: true,
        requireApply: true,
      });
    }
    const endDate = parseVoucherDateInputValue(els.dateInput?.value);
    const minDay = minEnd ? startOfVoucherDay(minEnd) : null;
    const endDay = endDate ? startOfVoucherDay(endDate) : null;
    if (endDay && minDay && endDay.getTime() < minDay.getTime()) {
      if (els.datePicker instanceof HTMLElement && window.SwitchDatePicker?.setValue) {
        window.SwitchDatePicker.setValue(els.datePicker, "", { emit: false });
      } else if (els.dateInput instanceof HTMLInputElement) {
        els.dateInput.value = "";
      }
      setVoucherTime("");
      syncVoucherDateTrigger();
      window.SwitchTimePicker?.setMinTime?.(els.timePicker, "");
      if (announce) {
        setModalFeedback("End must be at least 1 hour after start. Pick a later end date.", "error");
      }
      return;
    }
    const sameMinDay = Boolean(endDay && minDay && endDay.getTime() === minDay.getTime());
    const minHm = sameMinDay && minEnd
      ? `${String(minEnd.getHours()).padStart(2, "0")}:${String(minEnd.getMinutes()).padStart(2, "0")}`
      : "";
    window.SwitchTimePicker?.setMinTime?.(els.timePicker, minHm);
    const endMs = voucherDateTimeMs(
      els.dateInput?.value,
      formatVoucherTimeInputValue(els.timeInput?.value),
    );
    if (sameMinDay && endMs != null && minEnd && endMs < minEnd.getTime()) {
      setVoucherTime("");
      if (announce) {
        setModalFeedback("End time must be at least 1 hour after start.", "error");
      }
    }
  }

  function setDatePickerEnabled(picker, enabled) {
    if (!(picker instanceof HTMLElement)) return;
    picker.classList.toggle("is-disabled", !enabled);
    const trigger = picker.querySelector(".product-expiry-date-picker__trigger");
    if (trigger instanceof HTMLButtonElement) {
      trigger.disabled = !enabled;
      trigger.setAttribute("aria-disabled", String(!enabled));
    }
    if (!enabled) window.SwitchDatePicker?.close(picker);
  }

  function setTimePickerEnabled(picker, enabled) {
    if (!(picker instanceof HTMLElement)) return;
    picker.classList.toggle("is-disabled", !enabled);
    const trigger = picker.querySelector(".product-expiry-date-picker__trigger");
    if (trigger instanceof HTMLButtonElement) {
      trigger.disabled = !enabled;
      trigger.setAttribute("aria-disabled", String(!enabled));
    }
    if (!enabled) window.SwitchTimePicker?.close(picker);
  }

  function syncScheduleTimeLocks() {
    refreshElements();
    const hasEndDate = Boolean(parseVoucherDateInputValue(els.dateInput?.value));
    const hasStartDate = Boolean(parseVoucherDateInputValue(els.startDateInput?.value));
    if (!hasStartDate && hasEndDate) {
      if (els.datePicker instanceof HTMLElement && window.SwitchDatePicker?.setValue) {
        window.SwitchDatePicker.setValue(els.datePicker, "", { emit: false });
      } else if (els.dateInput instanceof HTMLInputElement) {
        els.dateInput.value = "";
      }
      setVoucherTime("");
      syncVoucherDateTrigger();
    }
    if (!hasEndDate) setVoucherTime("");
    if (!hasStartDate) setVoucherStartTime("");
    const endEnabled = hasStartDate;
    setDatePickerEnabled(els.datePicker, endEnabled);
    setTimePickerEnabled(els.timePicker, endEnabled && hasEndDate);
    setTimePickerEnabled(els.startTimePicker, hasStartDate);
    syncStartScheduleBounds();
    if (endEnabled) syncEndScheduleBounds();
  }

  function setVoucherTime(value) {
    refreshElements();
    const nextValue = formatVoucherTimeInputValue(value);
    if (els.timePicker instanceof HTMLElement && window.SwitchTimePicker?.setValue) {
      window.SwitchTimePicker.setValue(els.timePicker, nextValue, { emit: false });
      return;
    }
    if (els.timeInput instanceof HTMLInputElement) {
      els.timeInput.value = nextValue;
    }
  }

  function setVoucherStartMin({ allowPast = false } = {}) {
    refreshElements();
    if (!(els.startDatePicker instanceof HTMLElement)) return;
    if (allowPast) {
      delete els.startDatePicker.dataset.switchDateMin;
    } else {
      els.startDatePicker.dataset.switchDateMin = "today";
    }
  }

  function setVoucherStartDate(value) {
    refreshElements();
    const nextDate =
      value instanceof Date ? value : parseVoucherDateInputValue(value);
    if (els.startDatePicker instanceof HTMLElement && window.SwitchDatePicker?.setValue) {
      window.SwitchDatePicker.setValue(els.startDatePicker, nextDate || "", { emit: false });
      return;
    }
    if (els.startDateInput instanceof HTMLInputElement) {
      els.startDateInput.value = nextDate ? formatVoucherDateInputValue(nextDate) : "";
    }
  }

  function setVoucherStartTime(value) {
    refreshElements();
    const nextValue = formatVoucherTimeInputValue(value);
    if (els.startTimePicker instanceof HTMLElement && window.SwitchTimePicker?.setValue) {
      window.SwitchTimePicker.setValue(els.startTimePicker, nextValue, { emit: false });
      return;
    }
    if (els.startTimeInput instanceof HTMLInputElement) {
      els.startTimeInput.value = nextValue;
    }
  }

  function voucherDateTimeMs(dateValue, timeValue, { endOfDay = false } = {}) {
    const parsedDate =
      dateValue instanceof Date ? dateValue : parseVoucherDateInputValue(dateValue);
    if (!(parsedDate instanceof Date)) return null;
    const parsedTime = parseVoucherTimeInputValue(timeValue) ||
      (endOfDay ? { hours: 23, minutes: 59 } : { hours: 0, minutes: 0 });
    return new Date(
      parsedDate.getFullYear(),
      parsedDate.getMonth(),
      parsedDate.getDate(),
      parsedTime.hours,
      parsedTime.minutes,
      0,
      0,
    ).getTime();
  }

  function isSameVoucherCalendarDay(left, right) {
    return (
      left instanceof Date &&
      right instanceof Date &&
      left.getFullYear() === right.getFullYear() &&
      left.getMonth() === right.getMonth() &&
      left.getDate() === right.getDate()
    );
  }

  function isVoucherDateInPast(value) {
    const parsedDate =
      value instanceof Date ? value : parseVoucherDateInputValue(value);
    if (!(parsedDate instanceof Date)) return false;
    const today = new Date();
    const expiryDay = Date.UTC(
      parsedDate.getFullYear(),
      parsedDate.getMonth(),
      parsedDate.getDate(),
    );
    const todayStart = Date.UTC(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
    return expiryDay < todayStart;
  }

  function getVoucherDateCalendarElements() {
    if (!(state.dateCalendar instanceof HTMLElement)) return null;
    return {
      month: state.dateCalendar.querySelector("[data-voucher-date-calendar-month]"),
      days: state.dateCalendar.querySelector("[data-voucher-date-calendar-days]"),
      previous: state.dateCalendar.querySelector(
        "[data-voucher-date-calendar-previous]",
      ),
      next: state.dateCalendar.querySelector("[data-voucher-date-calendar-next]"),
      today: state.dateCalendar.querySelector("[data-voucher-date-calendar-today]"),
      clear: state.dateCalendar.querySelector("[data-voucher-date-calendar-clear]"),
      apply: state.dateCalendar.querySelector("[data-voucher-date-calendar-apply]"),
    };
  }

  function syncVoucherDateTrigger() {
    refreshElements();
    const value = String(els.dateInput?.value ?? "").trim();
    const hasValue = Boolean(parseVoucherDateInputValue(value));
    if (els.dateValue) {
      els.dateValue.textContent = formatVoucherDateDisplay(value);
    }
    if (els.dateTrigger instanceof HTMLButtonElement) {
      els.dateTrigger.classList.toggle("is-empty", !hasValue);
      els.dateTrigger.setAttribute(
        "aria-label",
        hasValue
          ? `Expiry date ${formatVoucherDateDisplay(value)}. Open calendar.`
          : "Select end date",
      );
    }
    els.datePicker?.classList.toggle("has-expiry-date", hasValue);
    const calendarClear = state.dateCalendar?.querySelector?.(
      "[data-voucher-date-calendar-clear]",
    );
    if (calendarClear instanceof HTMLButtonElement) {
      calendarClear.hidden = !hasValue;
    }
  }

  function clearVoucherDate({ restoreFocus = true } = {}) {
    refreshElements();
    if (!(els.dateInput instanceof HTMLInputElement)) return;
    els.dateInput.value = "";
    syncVoucherDateTrigger();
    els.dateInput.dispatchEvent(new Event("input", { bubbles: true }));
    els.dateInput.dispatchEvent(new Event("change", { bubbles: true }));
    setVoucherDateCalendarOpen(false, { restoreFocus: false });
    if (restoreFocus && els.dateTrigger instanceof HTMLButtonElement) {
      els.dateTrigger.focus();
    }
  }

  function renderVoucherDateCalendar() {
    const elements = getVoucherDateCalendarElements();
    if (
      !elements ||
      !(elements.month instanceof HTMLElement) ||
      !(elements.days instanceof HTMLElement)
    ) {
      return;
    }
    refreshElements();
    const committedDate = parseVoucherDateInputValue(els.dateInput?.value);
    const selectedDate =
      state.dateDraft instanceof Date ? state.dateDraft : committedDate;
    const today = new Date();
    const viewMonth =
      state.dateViewMonth instanceof Date
        ? state.dateViewMonth
        : new Date(
            (selectedDate ?? today).getFullYear(),
            (selectedDate ?? today).getMonth(),
            1,
          );
    state.dateViewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
    elements.month.textContent = new Intl.DateTimeFormat("en-US", {
      month: "long",
      year: "numeric",
    }).format(state.dateViewMonth);
    elements.days.replaceChildren();

    const firstVisibleDay = new Date(
      state.dateViewMonth.getFullYear(),
      state.dateViewMonth.getMonth(),
      1 - state.dateViewMonth.getDay(),
    );
    const daysInViewMonth = new Date(
      state.dateViewMonth.getFullYear(),
      state.dateViewMonth.getMonth() + 1,
      0,
    ).getDate();
    const visibleDayCount = Math.max(
      35,
      Math.ceil((state.dateViewMonth.getDay() + daysInViewMonth) / 7) * 7,
    );

    for (let index = 0; index < visibleDayCount; index += 1) {
      const dayDate = new Date(
        firstVisibleDay.getFullYear(),
        firstVisibleDay.getMonth(),
        firstVisibleDay.getDate() + index,
      );
      const dayButton = document.createElement("button");
      dayButton.type = "button";
      dayButton.className = "product-expiry-calendar__day";
      dayButton.textContent = String(dayDate.getDate());
      dayButton.dataset.date = formatVoucherDateInputValue(dayDate);
      dayButton.setAttribute(
        "aria-label",
        new Intl.DateTimeFormat("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        }).format(dayDate),
      );
      if (dayDate.getMonth() !== state.dateViewMonth.getMonth()) {
        dayButton.classList.add("is-outside-month");
      }
      if (isSameVoucherCalendarDay(dayDate, today)) {
        dayButton.classList.add("is-today");
      }
      if (isSameVoucherCalendarDay(dayDate, selectedDate)) {
        dayButton.classList.add("is-selected");
        dayButton.setAttribute("aria-selected", "true");
      }
      if (isVoucherDateInPast(dayDate)) {
        dayButton.classList.add("is-expired");
        if (!state.editingId) {
          dayButton.disabled = true;
          dayButton.setAttribute("aria-disabled", "true");
        }
      }
      dayButton.addEventListener("click", () => {
        if (dayButton.disabled) return;
        state.dateDraft = dayDate;
        renderVoucherDateCalendar();
      });
      elements.days.appendChild(dayButton);
    }

    if (elements.clear instanceof HTMLButtonElement) {
      elements.clear.hidden = !committedDate;
    }
    if (elements.apply instanceof HTMLButtonElement) {
      elements.apply.disabled = !(state.dateDraft instanceof Date);
    }
  }

  function positionVoucherDateCalendar() {
    if (
      !(state.dateCalendar instanceof HTMLElement) ||
      state.dateCalendar.hidden ||
      !(els.dateTrigger instanceof HTMLElement)
    ) {
      return;
    }
    const triggerRect = els.dateTrigger.getBoundingClientRect();
    const panelRect = state.dateCalendar.getBoundingClientRect();
    const viewportPadding = 12;
    const panelGap = 13;
    const panelWidth = panelRect.width;
    const panelHeight = panelRect.height;
    const preferredLeft = triggerRect.right - panelWidth;
    const maxLeft = Math.max(
      viewportPadding,
      window.innerWidth - panelWidth - viewportPadding,
    );
    const left = Math.min(Math.max(viewportPadding, preferredLeft), maxLeft);
    let top = triggerRect.bottom + panelGap;
    let opensUp = false;
    if (top + panelHeight > window.innerHeight - viewportPadding) {
      const upwardTop = triggerRect.top - panelHeight - panelGap;
      if (upwardTop >= viewportPadding) {
        top = upwardTop;
        opensUp = true;
      } else {
        top = Math.max(
          viewportPadding,
          window.innerHeight - panelHeight - viewportPadding,
        );
      }
    }
    const triggerCenter = triggerRect.left + triggerRect.width / 2;
    const arrowLeft = Math.min(
      Math.max(22, triggerCenter - left),
      panelWidth - 22,
    );
    state.dateCalendar.classList.toggle("is-open-up", opensUp);
    state.dateCalendar.style.left = `${Math.round(left)}px`;
    state.dateCalendar.style.top = `${Math.round(top)}px`;
    state.dateCalendar.style.setProperty(
      "--product-expiry-calendar-arrow-left",
      `${Math.round(arrowLeft)}px`,
    );
  }

  function requestVoucherDateCalendarPosition() {
    if (state.datePositionFrame) return;
    state.datePositionFrame = window.requestAnimationFrame(() => {
      state.datePositionFrame = 0;
      positionVoucherDateCalendar();
    });
  }

  function ensureVoucherDateCalendar() {
    if (state.dateCalendar instanceof HTMLElement) return state.dateCalendar;
    refreshElements();
    if (!(els.datePicker instanceof HTMLElement)) return null;

    const panel = document.createElement("div");
    panel.id = "voucher-date-calendar";
    panel.className = "product-expiry-calendar sa-voucher-date-calendar has-apply";
    panel.hidden = true;
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Choose expiry date");
    panel.innerHTML = `
      <div class="product-expiry-calendar__header">
        <button type="button" class="product-expiry-calendar__nav" data-voucher-date-calendar-previous aria-label="Previous month">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>
        </button>
        <strong class="product-expiry-calendar__month" data-voucher-date-calendar-month></strong>
        <button type="button" class="product-expiry-calendar__nav" data-voucher-date-calendar-next aria-label="Next month">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"></path></svg>
        </button>
      </div>
      <div class="product-expiry-calendar__weekdays" aria-hidden="true">
        ${["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]
          .map(
            (weekday) =>
              `<span class="product-expiry-calendar__weekday">${weekday}</span>`,
          )
          .join("")}
      </div>
      <div class="product-expiry-calendar__days" role="grid" data-voucher-date-calendar-days></div>
      <div class="product-expiry-calendar__footer">
        <button type="button" class="product-expiry-calendar__clear" data-voucher-date-calendar-clear hidden aria-label="Remove expiry date" title="Remove date">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M18 6 6 18"/>
            <path d="m6 6 12 12"/>
          </svg>
          <span>Remove date</span>
        </button>
        <button type="button" class="product-expiry-calendar__today" data-voucher-date-calendar-today>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M8 2v4"></path><path d="M16 2v4"></path><rect width="18" height="18" x="3" y="4" rx="2"></rect><path d="M3 10h18"></path><path d="M8 14h.01"></path><path d="M12 14h.01"></path><path d="M16 14h.01"></path><path d="M8 18h.01"></path><path d="M12 18h.01"></path>
          </svg>
          <span>Today</span>
        </button>
        <button type="button" class="product-expiry-calendar__apply" data-voucher-date-calendar-apply>
          Next
        </button>
      </div>
    `;
    document.body.appendChild(panel);
    state.dateCalendar = panel;

    const elements = getVoucherDateCalendarElements();
    elements?.previous?.addEventListener("click", () => {
      const viewMonth = state.dateViewMonth ?? new Date();
      state.dateViewMonth = new Date(
        viewMonth.getFullYear(),
        viewMonth.getMonth() - 1,
        1,
      );
      renderVoucherDateCalendar();
      requestVoucherDateCalendarPosition();
    });
    elements?.next?.addEventListener("click", () => {
      const viewMonth = state.dateViewMonth ?? new Date();
      state.dateViewMonth = new Date(
        viewMonth.getFullYear(),
        viewMonth.getMonth() + 1,
        1,
      );
      renderVoucherDateCalendar();
      requestVoucherDateCalendarPosition();
    });
    elements?.today?.addEventListener("click", () => {
      state.dateDraft = new Date();
      renderVoucherDateCalendar();
    });
    elements?.apply?.addEventListener("click", () => {
      applyVoucherDate();
    });
    elements?.clear?.addEventListener("click", () => {
      clearVoucherDate({ restoreFocus: true });
    });

    return panel;
  }

  function setVoucherDateCalendarOpen(isOpen, { restoreFocus = false } = {}) {
    refreshElements();
    if (isOpen) {
      if (els.datePicker instanceof HTMLElement) {
        window.SwitchDatePicker?.open(els.datePicker);
      }
      return;
    }
    window.SwitchDatePicker?.close();
    if (restoreFocus && els.dateTrigger instanceof HTMLButtonElement) {
      els.dateTrigger.focus({ preventScroll: true });
    }
  }

  function setVoucherDate(date) {
    refreshElements();
    if (!(els.dateInput instanceof HTMLInputElement) || !(date instanceof Date)) {
      return false;
    }
    if (!parseVoucherDateInputValue(els.startDateInput?.value)) {
      setModalFeedback("Set a start date first.", "error");
      return false;
    }
    const minEnd = getMinVoucherEndDateTime();
    const minDay = minEnd ? startOfVoucherDay(minEnd) : null;
    const pickedDay = startOfVoucherDay(date);
    if (pickedDay && minDay && pickedDay.getTime() < minDay.getTime()) {
      setModalFeedback("End date cannot be before the start date.", "error");
      return false;
    }
    if (isVoucherDateInPast(date) && !state.editingId) {
      setModalFeedback("Pick an expiry date today or later.", "error");
      return false;
    }
    if (isVoucherDateInPast(date) && state.editingId) {
      setModalFeedback(
        "This date is in the past — saving will mark the voucher expired.",
        "notice",
      );
    }
    els.dateInput.value = formatVoucherDateInputValue(date);
    syncVoucherDateTrigger();
    els.dateInput.dispatchEvent(new Event("input", { bubbles: true }));
    els.dateInput.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  function applyVoucherDate() {
    const date = state.dateDraft instanceof Date ? state.dateDraft : null;
    if (!date || !setVoucherDate(date)) return;
    setVoucherDateCalendarOpen(false);
    syncEndScheduleBounds();
    window.requestAnimationFrame(() => {
      if (els.timePicker instanceof HTMLElement) {
        window.SwitchTimePicker?.open(els.timePicker);
      }
    });
  }

  function bindExpireDatePicker() {
    refreshElements();
    if (!(els.datePicker instanceof HTMLElement)) {
      syncVoucherDateTrigger();
      return;
    }
    window.SwitchDatePicker?.bind(els.datePicker, {
      minDate: getEndPickerMinDate(),
      allowClear: true,
      requireApply: true,
    });
    window.SwitchDatePicker?.sync(els.datePicker);
    syncVoucherDateTrigger();
  }

  function initializeVoucherDatePicker() {
    bindExpireDatePicker();
    if (state.datePickerBound) return;
    state.datePickerBound = true;
    els.dateInput?.addEventListener("change", () => {
      syncVoucherDateTrigger();
      syncScheduleTimeLocks();
      syncEndScheduleBounds();
      updatePreview();
    });
  }

  function initializeVoucherTimePicker() {
    refreshElements();
    if (!(els.timePicker instanceof HTMLElement)) return;
    window.SwitchTimePicker?.bind(els.timePicker);
    if (state.timePickerBound) return;
    state.timePickerBound = true;
    els.timeTrigger?.addEventListener(
      "click",
      () => {
        syncEndScheduleBounds();
        setVoucherDateCalendarOpen(false);
      },
      true,
    );
    els.timeInput?.addEventListener("change", () => {
      updatePreview();
    });
  }

  function initializeVoucherStartPickers() {
    refreshElements();
    if (els.startDatePicker instanceof HTMLElement) {
      window.SwitchDatePicker?.bind(els.startDatePicker, {
        minDate: "today",
        allowClear: true,
        requireApply: true,
      });
    }
    if (els.startTimePicker instanceof HTMLElement) {
      window.SwitchTimePicker?.bind(els.startTimePicker);
    }
    if (state.startPickerBound) return;
    state.startPickerBound = true;
    els.startTimeTrigger?.addEventListener(
      "click",
      () => {
        syncStartScheduleBounds();
        window.SwitchDatePicker?.close();
      },
      true,
    );
    els.startDateInput?.addEventListener("change", () => {
      const hasStartDate = Boolean(parseVoucherDateInputValue(els.startDateInput?.value));
      syncScheduleTimeLocks();
      syncStartScheduleBounds({ announce: true });
      syncEndScheduleBounds({ announce: true });
      updatePreview();
      if (!hasStartDate || !(els.startTimePicker instanceof HTMLElement)) return;
      window.setTimeout(() => {
        syncStartScheduleBounds();
        setTimePickerEnabled(els.startTimePicker, true);
        window.SwitchTimePicker?.open(els.startTimePicker);
      }, 0);
    });
    els.startTimeInput?.addEventListener("change", () => {
      syncEndScheduleBounds({ announce: true });
      updatePreview();
    });
    syncScheduleTimeLocks();
  }

  function readFormValues() {
    const editing = state.editingVoucher;
    const isStoreEdit = Boolean(editing?.sellerAdminId);
    const discountType = normalizeDiscountType(els.discountTypeInput?.value);
    const discountValue = formatDiscountValue(els.discountValueInput?.value);
    const freeShipping = Boolean(els.freeShippingInput?.checked);
    const rawDate = String(els.dateInput?.value || "").trim();
    const parsedDate = parseVoucherDateInputValue(rawDate);
    const rawTime = formatVoucherTimeInputValue(els.timeInput?.value);
    const rawStartDate = String(els.startDateInput?.value || "").trim();
    const parsedStartDate = parseVoucherDateInputValue(rawStartDate);
    const rawStartTime = formatVoucherTimeInputValue(els.startTimeInput?.value);
    const kind =
      freeShipping && !discountValue
        ? "shipping"
        : discountType === "fixed"
          ? "gift"
          : "percent";
    const existingStatus = String(editing?.status || "active")
      .trim()
      .toLowerCase();
    let status = "active";
    if (parsedDate && isVoucherExpiryDateTimeInPast(parsedDate, rawTime)) {
      status = "expired";
    } else if (existingStatus === "used") {
      status = "used";
    }
    const existing = editing && typeof editing === "object" ? editing : null;
    const scopeType = effectiveScopeType();
    const includeIds =
      scopeType === "selected_business_types"
        ? payloadBusinessTypeIds()
        : splitIdList(els.includeIdsInput?.value);
    const excludeIds = scopedExcludeIds(scopeType);
    const existingRules = existing?.combinationRules && typeof existing.combinationRules === "object"
      ? existing.combinationRules
      : {};
    return {
      title: String(els.titleInput?.value || "").trim(),
      subtitle: discountSubtitle(discountType, discountValue, freeShipping),
      code: String(els.codeInput?.value || "").trim().toUpperCase(),
      badge: isStoreEdit
        ? String(editing?.badge || "Store").trim() || "Store"
        : "Sitewide",
      minimumSpend: formatMinSpend(els.minSpendInput?.value),
      usesPerAccount: Number(formatUsesPerAccount(els.usesPerAccountInput?.value)),
      date: parsedDate ? formatVoucherExpiryDisplay(parsedDate, rawTime) : "",
      time: rawTime,
      startDate: parsedStartDate
        ? formatVoucherExpiryDisplay(parsedStartDate, rawStartTime)
        : "",
      startTime: rawStartTime,
      repeatWeekly: Boolean(existing?.repeatWeekly),
      repeatDays: Boolean(existing?.repeatWeekly) ? existing.repeatDays || [] : [],
      repeatStartTime: Boolean(existing?.repeatWeekly)
        ? String(existing.repeatStartTime || "")
        : "",
      repeatEndTime: Boolean(existing?.repeatWeekly)
        ? String(existing.repeatEndTime || "")
        : "",
      note: editing
        ? String(editing.note || "A deal\nfor you!")
        : "A deal\nfor you!",
      kind,
      action:
        status === "active" ? "useNow" : status === "used" ? "used" : "expired",
      discountType,
      discountValue,
      freeShipping,
      platformId: isStoreEdit
        ? "all"
        : voucherPlatformValue() === "multi"
          ? selectedVoucherPlatformIds()[0]
          : voucherPlatformValue(),
      platformIds:
        !isStoreEdit && voucherPlatformValue() === "multi"
          ? selectedVoucherPlatformIds()
          : [],
      passive: String(els.redemptionInput?.value || "") === "auto_apply",
      redemptionMethod: String(els.redemptionInput?.value || "enter_code"),
      maximumDiscount: String(els.maxDiscountInput?.value || "").trim(),
      totalUsageLimit: String(els.totalUsageInput?.value || "").trim(),
      priority: Number(existing?.priority || 0),
      shippingDiscountType: String(els.shippingTypeInput?.value || "full"),
      shippingDiscountCap: String(els.shippingCapInput?.value || "").trim(),
      shippingLocationType: String(existing?.shippingLocationType || "nationwide"),
      shippingMethods: Array.isArray(existing?.shippingMethods) ? existing.shippingMethods : [],
      scopeType,
      ...assignIncludeIds(scopeType, includeIds),
      excludeProductIds: excludeIds,
      customerEligibility: normalizeUserEligibility(
        els.eligibilityInput?.value || existing?.customerEligibility || "all",
      ),
      customerSegmentIds: Array.isArray(existing?.customerSegmentIds) ? existing.customerSegmentIds : [],
      combinationRules: {
        combineFlashDeal: Boolean(existingRules.combineFlashDeal),
        combineSellerVoucher: existingRules.combineSellerVoucher !== false,
        combinePlatformVoucher: Boolean(existingRules.combinePlatformVoucher),
        combineFreeShipping: existing
          ? existingRules.combineFreeShipping !== false
          : true,
        combineRewards: existing
          ? existingRules.combineRewards !== false
          : true,
      },
      fundingSource: String(els.fundingInput?.value || "platform"),
      platformSharePct: Number(els.platformShareInput?.value || 0),
      sellerSharePct: Number(els.sellerShareInput?.value || 0),
      allocatedBudget: String(els.budgetInput?.value || "").trim(),
      status,
      cardColor: resolveCardColor({
        cardColor: els.colorInput?.value || state.cardColor || existing?.cardColor,
      }),
      ...(isStoreEdit
        ? {
            sellerAdminId: String(editing.sellerAdminId || "").trim(),
            ...(editing.companyLogoUrl
              ? { companyLogoUrl: String(editing.companyLogoUrl || "").trim() }
              : {}),
          }
        : {}),
    };
  }

  function syncModalChrome({ editing = false, isStore = false } = {}) {
    refreshElements();
    if (els.modalTitle) {
      els.modalTitle.textContent = editing ? "Edit Voucher" : "Create Voucher";
    }
    if (els.modalSubtitle) {
      const liveId = String(state.editingVoucher?.id || "").trim();
      if (editing && liveId) {
        els.modalSubtitle.textContent = isStore
          ? `ID · ${liveId} · Update this seller store voucher. The seller will be notified of your changes.`
          : `ID · ${liveId} · Update the offer before saving.`;
      } else if (editing) {
        els.modalSubtitle.textContent = isStore
          ? "This store voucher is scheduled. A Voucher ID is created when it starts."
          : "This voucher is scheduled. A Voucher ID is created when it starts.";
      } else {
        els.modalSubtitle.textContent =
          "Pick one or more platforms, set the offer, then publish. Each platform gets its own voucher card and ID.";
      }
    }
    if (els.submitLabel) {
      els.submitLabel.textContent = editing ? "Save Changes" : "Create Voucher";
    }
    if (els.submitIcon instanceof SVGElement || els.submitIcon instanceof HTMLElement) {
      els.submitIcon.innerHTML = editing
        ? '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><path d="M17 21v-8H7v8"></path><path d="M7 3v5h8"></path>'
        : '<path d="M16 13h6"></path><path d="m16.5 6.5-3.914-3.914A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l1.79-1.79"></path><path d="M19 10v6"></path><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"></circle>';
    }
    if (els.platformSelect instanceof HTMLSelectElement) {
      els.platformSelect.disabled = Boolean(isStore);
    }
    if (els.platformToggle instanceof HTMLButtonElement) {
      els.platformToggle.disabled = Boolean(isStore);
    }
  }

  function fillFormFromVoucher(voucher) {
    refreshElements();
    const discountType = normalizeDiscountType(
      voucher.discountType ||
        (voucher.kind === "gift" || voucher.kind === "fixed" ? "fixed" : "percent"),
    );
    const freeShipping = isFreeShippingVoucher(voucher);
    syncPlatformSelect({
      value: voucher.sellerAdminId
        ? "all"
        : normalizePlatformId(voucher.platformId) || "shop",
      ids: voucher.sellerAdminId ? [] : voucher.platformIds,
    });
    if (els.titleInput) els.titleInput.value = String(voucher.title || "");
    if (els.codeInput) els.codeInput.value = String(voucher.code || "").toUpperCase();
    if (els.discountValueInput) {
      els.discountValueInput.value = formatDiscountValue(voucher.discountValue) || "";
    }
    if (els.minSpendInput) {
      els.minSpendInput.value = formatMinSpend(voucher.minimumSpend);
    }
    if (els.usesPerAccountInput) {
      els.usesPerAccountInput.value = formatUsesPerAccount(voucher.usesPerAccount);
    }
    setDiscountTypeToggle(discountType);
    setFreeShippingToggle(freeShipping);
    setRedemptionMethod(voucherRedemptionMethod(voucher));
    if (els.maxDiscountInput) {
      els.maxDiscountInput.value = voucher.maximumDiscount || "";
    }
    if (els.totalUsageInput) {
      els.totalUsageInput.value = voucher.totalUsageLimit || "";
    }
    setHiddenChoice(
      els.shippingTypeInput,
      els.shippingTypeLabel,
      "voucher-shipping-type-menu",
      voucher.shippingDiscountType || "full",
      SHIPPING_TYPE_OPTIONS,
    );
    if (els.shippingCapInput) els.shippingCapInput.value = voucher.shippingDiscountCap || "";
    const scopeType = String(voucher.scopeType || "entire_platform");
    if (els.scopeTypeInput) els.scopeTypeInput.value = scopeType;
    state.categorySearch = "";
    if (els.categorySearch instanceof HTMLInputElement) els.categorySearch.value = "";
    resetBusinessTypeSelection(
      scopeType === "entire_platform"
        ? null
        : scopeType === "selected_business_types"
          ? voucher.includeBusinessTypeIds || []
          : [],
    );
    if (els.includeIdsInput) {
      els.includeIdsInput.value =
        scopeType === "selected_business_types"
          ? ""
          : (includeIdsForScope(scopeType, voucher) || []).join("\n");
    }
    if (els.excludeIdsInput) {
      els.excludeIdsInput.value = excludeIdsFromVoucher(voucher).join("\n");
    }
    setHiddenChoice(
      els.eligibilityInput,
      els.eligibilityLabel,
      "voucher-eligibility-menu",
      normalizeUserEligibility(voucher.customerEligibility),
      ELIGIBILITY_OPTIONS,
    );
    setHiddenChoice(
      els.fundingInput,
      els.fundingLabel,
      "voucher-funding-menu",
      voucher.fundingSource || "platform",
      FUNDING_OPTIONS,
    );
    if (els.platformShareInput) els.platformShareInput.value = voucher.platformSharePct || "";
    if (els.sellerShareInput) els.sellerShareInput.value = voucher.sellerSharePct || "";
    if (els.budgetInput) els.budgetInput.value = voucher.allocatedBudget || "";
    const fromDisplay = parseVoucherDisplayDate(voucher.date);
    if (fromDisplay) {
      if (els.dateInput) {
        els.dateInput.value = formatVoucherDateInputValue(fromDisplay);
      }
      setVoucherTime(
        /:\d{2}\s*[AP]M$/i.test(String(voucher.date || ""))
          ? fromDisplay
          : "23:59",
      );
    } else {
      if (els.dateInput) els.dateInput.value = "";
      setVoucherTime("");
    }
    const fromStart = parseVoucherDisplayDate(voucher.startDate);
    if (fromStart) {
      const startIsPast = isVoucherDateInPast(fromStart);
      setVoucherStartMin({ allowPast: Boolean(state.editingId && startIsPast) });
      setVoucherStartDate(fromStart);
      setVoucherStartTime(
        /:\d{2}\s*[AP]M$/i.test(String(voucher.startDate || ""))
          ? fromStart
          : "00:00",
      );
    } else {
      setVoucherStartMin({ allowPast: false });
      setVoucherStartDate("");
      setVoucherStartTime("");
    }
    syncVoucherDateTrigger();
    bindExpireDatePicker();
    syncScheduleTimeLocks();
    setCardColor(voucher.cardColor || DEFAULT_VOUCHER_CARD_COLOR);
    syncAdvancedVoucherFields();
  }

  function parseVoucherDisplayDate(value) {
    const raw = String(value ?? "").trim();
    const match = raw.match(
      /^([A-Za-z]{3})\s+(\d{1,2}),\s+(\d{4})(?:\s+(\d{1,2}):(\d{2})\s*([AP]M))?$/i,
    );
    if (!match) return null;
    const months = {
      Jan: 0,
      Feb: 1,
      Mar: 2,
      Apr: 3,
      May: 4,
      Jun: 5,
      Jul: 6,
      Aug: 7,
      Sep: 8,
      Oct: 9,
      Nov: 10,
      Dec: 11,
    };
    const monthKey = `${match[1].charAt(0).toUpperCase()}${match[1].slice(1).toLowerCase()}`;
    const monthIndex = months[monthKey];
    if (monthIndex == null) return null;
    const year = Number(match[3]);
    const day = Number(match[2]);
    const date = new Date(year, monthIndex, day);
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== monthIndex ||
      date.getDate() !== day
    ) {
      return null;
    }
    if (match[4] && match[6]) {
      const hours =
        (Number(match[4]) % 12) + (match[6].toUpperCase() === "PM" ? 12 : 0);
      date.setHours(hours, Number(match[5]), 0, 0);
    }
    return date;
  }

  function updatePreview() {
    refreshElements();
    syncAdvancedVoucherFields();
    const values = readFormValues();
    applyModalTheme();
    if (els.promoPreview instanceof HTMLElement) {
      els.promoPreview.innerHTML = "";
    }
    if (els.preview instanceof HTMLElement) {
      els.preview.innerHTML = "";
    }
  }

  function renderInventory() {
    refreshElements();
    const items = filteredItems();
    if (els.inventoryTotal) {
      els.inventoryTotal.textContent = `(${items.length})`;
    }
    if (!(els.inventoryList instanceof HTMLElement)) return;
    if (!items.length) {
      els.inventoryList.innerHTML = '<div class="empty-state">No vouchers match.</div>';
      return;
    }
    els.inventoryList.innerHTML = items.map(inventoryRowHtml).join("");
  }

  function waitVoucherSkeletonMs(ms) {
    const wait = window.SuperAdminShowcaseSkeleton?.wait;
    if (typeof wait === "function") {
      return wait(ms);
    }
    return new Promise((resolve) => window.setTimeout(resolve, Math.max(0, Number(ms) || 0)));
  }

  function paintVoucherSkeleton() {
    refreshElements();
    if (!(els.list instanceof HTMLElement)) return;
    const paint = window.SuperAdminShowcaseSkeleton?.paintList;
    if (typeof paint === "function") {
      paint(els.list, state.pageSize);
      return;
    }
    els.list.classList.add("is-skeleton-loading");
    els.list.innerHTML = Array.from({ length: state.pageSize }, () =>
      '<article class="sa-showcase-skeleton" aria-hidden="true"></article>',
    ).join("");
  }

  function renderPagination() {
    refreshElements();
    const total = Math.max(0, Number(state.total) || 0);
    const pageSize = Math.max(1, Number(state.pageSize) || 10);
    const pageCount = Math.max(1, Math.ceil(total / pageSize) || 1);
    state.page = Math.min(Math.max(1, Number(state.page) || 1), pageCount);
    const shouldPaginate = total > pageSize;
    const start = total > 0 ? (state.page - 1) * pageSize + 1 : 0;
    const end = total > 0 ? Math.min(total, start + pageSize - 1) : 0;
    if (els.pageMeta) {
      els.pageMeta.textContent = `${start} – ${end} of ${total}`;
    }
    if (els.pager instanceof HTMLElement) {
      els.pager.hidden = !shouldPaginate;
    }
    if (els.pagination instanceof HTMLElement) {
      els.pagination.hidden = !shouldPaginate;
      const newer = els.pagination.querySelector('[data-voucher-pager-dir="newer"]');
      const older = els.pagination.querySelector('[data-voucher-pager-dir="older"]');
      if (newer instanceof HTMLButtonElement) {
        newer.dataset.superAdminVouchersPage = String(Math.max(1, state.page - 1));
        newer.disabled = !shouldPaginate || state.loading || state.page <= 1;
      }
      if (older instanceof HTMLButtonElement) {
        older.dataset.superAdminVouchersPage = String(Math.min(pageCount, state.page + 1));
        older.disabled = !shouldPaginate || state.loading || state.page >= pageCount;
      }
    }
    document.body.classList.toggle("super-admin-vouchers-pagination-active", shouldPaginate);
    els.list?.classList.toggle("has-voucher-pagination", shouldPaginate);
  }

  function renderList() {
    refreshElements();
    if (els.total) {
      const total = Math.max(Number(state.total) || 0, state.items.length);
      els.total.textContent = total ? `(${total})` : "(0)";
    }
    renderHeaderFilterSummary();
    renderInventory();
    renderPagination();
    if (!(els.list instanceof HTMLElement)) return;
    els.list.classList.remove("is-skeleton-loading");
    if (!state.total && !state.items.length) {
      const hasFilters = Boolean(
        String(state.filters.search || "").trim() ||
          state.filters.status ||
          state.filters.scope ||
          state.filters.platformId ||
          state.filters.discountType ||
          state.filters.funding ||
          state.filters.upcoming ||
          state.filters.endingSoon ||
          PANEL_FILTER_KEYS.some((key) => state.filters[key]),
      );
      els.list.innerHTML = hasFilters
        ? '<div class="sa-vouchers-empty-cell">No vouchers match these filters.</div>'
        : '<div class="sa-vouchers-empty-cell">No vouchers yet. Create one to show it in buyer accounts.</div>';
      return;
    }
    els.list.innerHTML = state.items
      .map((voucher) => voucherDirectoryCardHtml(voucher))
      .join("");
    startVoucherCountdowns();
  }

  function openModal() {
    refreshElements();
    state.editingId = "";
    state.editingVoucher = null;
    state.voucherModalTrigger =
      document.activeElement instanceof HTMLElement ? document.activeElement : els.addButton;
    if (state.closeTimer) {
      window.clearTimeout(state.closeTimer);
      state.closeTimer = 0;
    }
    if (els.form instanceof HTMLFormElement) els.form.reset();
    setVoucherSettingsOpen(false);
    syncModalChrome({ editing: false, isStore: false });
    setVoucherStep(1);
    syncPlatformSelect({ value: "shop" });
    setRedemptionMethod("enter_code");
    setFreeShippingToggle(false);
    setDiscountTypeToggle("percent");
    if (els.discountValueInput) els.discountValueInput.value = "20";
    if (els.usesPerAccountInput) els.usesPerAccountInput.value = "1";
    if (els.maxDiscountInput) els.maxDiscountInput.value = "";
    if (els.totalUsageInput) els.totalUsageInput.value = "";
    if (els.includeIdsInput) els.includeIdsInput.value = "";
    if (els.excludeIdsInput) els.excludeIdsInput.value = "";
    resetBusinessTypeSelection();
    state.categorySearch = "";
    if (els.categorySearch instanceof HTMLInputElement) els.categorySearch.value = "";
    if (els.budgetInput) els.budgetInput.value = "";
    if (els.scopeTypeInput) els.scopeTypeInput.value = "entire_platform";
    setHiddenChoice(els.eligibilityInput, els.eligibilityLabel, "voucher-eligibility-menu", "all", ELIGIBILITY_OPTIONS);
    setHiddenChoice(els.fundingInput, els.fundingLabel, "voucher-funding-menu", "platform", FUNDING_OPTIONS);
    setHiddenChoice(
      els.shippingTypeInput,
      els.shippingTypeLabel,
      "voucher-shipping-type-menu",
      "full",
      SHIPPING_TYPE_OPTIONS,
    );
    syncAdvancedVoucherFields();
    if (els.dateInput) {
      els.dateInput.value = "";
      els.dateInput.min = formatVoucherDateInputValue(new Date());
    }
    setVoucherTime("");
    setVoucherStartMin({ allowPast: false });
    setVoucherStartDate("");
    setVoucherStartTime("");
    setCardColor(resolvePlatformPrimaryColor("shop"));
    syncVoucherDateTrigger();
    bindExpireDatePicker();
    syncScheduleTimeLocks();
    setVoucherDateCalendarOpen(false);
    window.SwitchDatePicker?.close();
    window.SwitchTimePicker?.close();
    setModalFeedback("");
    renderInventory();
    updatePreview();
    if (!(els.modalOverlay instanceof HTMLElement)) {
      setPageFeedback("Voucher create dialog is missing. Refresh the page.", "error");
      return;
    }
    els.modalOverlay.hidden = false;
    els.modalOverlay.setAttribute("aria-hidden", "false");
    els.addButton?.setAttribute("aria-expanded", "true");
    document.body.classList.add("super-admin-voucher-modal-open");
    window.requestAnimationFrame(() => {
      els.modalOverlay?.classList.add("is-open");
      els.platformToggle?.focus();
    });
    void Promise.all([loadPlatforms(), loadStoreTypes()]).then(() => {
      syncPlatformSelect();
      applyModalTheme();
      renderVoucherCategoryPicker();
      updatePreview();
    });
  }

  function openEditModal(voucherId) {
    refreshElements();
    const voucher = findVoucherByRef(voucherId);
    if (!voucher) {
      setPageFeedback("Voucher not found.", "error");
      return;
    }
    if (isSellerCreatedVoucher(voucher)) {
      setPageFeedback("Seller-created vouchers cannot be edited by Super Admin.", "error");
      return;
    }
    state.editingId = voucherRef(voucher);
    state.editingVoucher = voucher;
    state.voucherModalTrigger =
      document.activeElement instanceof HTMLElement ? document.activeElement : els.addButton;
    if (state.closeTimer) {
      window.clearTimeout(state.closeTimer);
      state.closeTimer = 0;
    }
    if (els.form instanceof HTMLFormElement) els.form.reset();
    setVoucherSettingsOpen(false);
    const isStore = Boolean(voucher.sellerAdminId);
    syncModalChrome({ editing: true, isStore });
    setVoucherStep(1);
    fillFormFromVoucher(voucher);
    if (els.dateInput) {
      els.dateInput.min = formatVoucherDateInputValue(new Date());
      // Keep existing past expiry visible when editing an expired voucher.
      if (isVoucherDateInPast(els.dateInput.value)) {
        els.dateInput.removeAttribute("min");
      }
    }
    setVoucherDateCalendarOpen(false);
    window.SwitchDatePicker?.close();
    window.SwitchTimePicker?.close();
    setModalFeedback("");
    renderInventory();
    updatePreview();
    if (!(els.modalOverlay instanceof HTMLElement)) {
      setPageFeedback("Voucher edit dialog is missing. Refresh the page.", "error");
      return;
    }
    els.modalOverlay.hidden = false;
    els.modalOverlay.setAttribute("aria-hidden", "false");
    els.addButton?.setAttribute("aria-expanded", "true");
    document.body.classList.add("super-admin-voucher-modal-open");
    window.requestAnimationFrame(() => {
      els.modalOverlay?.classList.add("is-open");
      (isStore ? els.codeInput : els.platformToggle)?.focus();
    });
    void Promise.all([loadPlatforms(), loadStoreTypes()]).then(() => {
      fillFormFromVoucher(voucher);
      syncModalChrome({ editing: true, isStore });
      applyModalTheme();
      updatePreview();
    });
  }

  function closeModal() {
    refreshElements();
    if (!(els.modalOverlay instanceof HTMLElement)) return;
    setVoucherDateCalendarOpen(false);
    setVoucherSettingsOpen(false);
    window.SwitchDatePicker?.close();
    window.SwitchTimePicker?.close();
    els.modalOverlay.classList.remove("is-open");
    els.modalOverlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("super-admin-voucher-modal-open");
    els.addButton?.setAttribute("aria-expanded", "false");
    setModalFeedback("");
    state.editingId = "";
    state.editingVoucher = null;
    if (els.platformSelect instanceof HTMLSelectElement) {
      els.platformSelect.disabled = false;
    }
    if (els.platformToggle instanceof HTMLButtonElement) {
      els.platformToggle.disabled = false;
    }
    closeVoucherChoiceMenus();
    const trigger = state.voucherModalTrigger || els.addButton;
    state.voucherModalTrigger = null;
    if (state.closeTimer) {
      window.clearTimeout(state.closeTimer);
    }
    state.closeTimer = window.setTimeout(() => {
      state.closeTimer = 0;
      if (els.modalOverlay) els.modalOverlay.hidden = true;
      if (trigger instanceof HTMLElement) {
        try {
          trigger.focus({ preventScroll: true });
        } catch (_) {
          trigger.focus();
        }
      }
    }, 180);
  }

  function firstVoucherIssue(payload, isEdit, maxStep = VOUCHER_STEPS.length) {
    const issue = (step, message, focus) => (step <= maxStep ? { step, message, focus } : null);
    const checks = [];
    // Step 1: details and schedule.
    if (!payload.platformId && !payload.sellerAdminId) {
      checks.push(issue(1, "Select a buyer platform for this voucher.", els.platformToggle));
    }
    if (
      payload.scopeType === "selected_business_types" &&
      !payload.includeBusinessTypeIds?.length
    ) {
      checks.push(issue(1, "Add at least one business type.", els.categorySearch));
    }
    if (!payload.title) checks.push(issue(1, "Title is required.", els.titleInput));
    if (payload.redemptionMethod === "enter_code" && !payload.code) {
      checks.push(issue(1, "Voucher code is required for Enter code redemption.", els.codeInput));
    }
    if (payload.repeatWeekly) {
      if (!Array.isArray(payload.repeatDays) || !payload.repeatDays.length) {
        checks.push(issue(1, "Select at least one weekday.", els.repeatDaysToggle));
      } else if (!payload.repeatStartTime) {
        checks.push(issue(1, "Set the weekly start time.", els.repeatStartTimeTrigger));
      } else if (payload.repeatEndTime && payload.repeatStartTime === payload.repeatEndTime) {
        checks.push(issue(1, "Weekly end time must be different from the start time.", els.repeatEndTimeTrigger));
      }
    }
    if (payload.date && !payload.startDate) {
      checks.push(issue(1, "Set a start date first.", els.startDateTrigger));
    }
    if (payload.startDate && !payload.startTime) {
      checks.push(issue(1, "Set a start time.", els.startTimeTrigger));
    }
    if (payload.date && !payload.time) checks.push(issue(1, "Set an end time.", els.timeTrigger));
    const startMs = voucherDateTimeMs(els.startDateInput?.value, payload.startTime);
    const expireMs = voucherDateTimeMs(els.dateInput?.value, payload.time);
    const existingStartMs = voucherStartMs(state.editingVoucher);
    const allowPastStart = Boolean(isEdit && existingStartMs && existingStartMs <= Date.now());
    if (startMs != null && startMs < Date.now() && !allowPastStart) {
      checks.push(issue(1, "Start time cannot be earlier than now.", els.startTimeTrigger));
    }
    if (startMs != null && expireMs != null && expireMs < startMs + MIN_VOUCHER_DURATION_MS) {
      checks.push(issue(1, "End must be at least 1 hour after the start date and time.", els.dateTrigger));
    }
    if (!isEdit && payload.status === "expired") {
      checks.push(issue(1, "Pick an end date and time in the future.", els.dateTrigger));
    }
    // Step 2: discount.
    if (!payload.discountValue && !payload.freeShipping) {
      checks.push(
        issue(
          2,
          payload.discountType === "fixed"
            ? "Enter the fixed price amount, or turn on Free shipping."
            : "Enter the percent of total purchase, or turn on Free shipping.",
          els.discountValueInput,
        ),
      );
    }
    if (
      payload.discountValue &&
      payload.discountType === "percent" &&
      Number(payload.discountValue) > 100
    ) {
      checks.push(issue(2, "Percent of total purchase cannot exceed 100.", els.discountValueInput));
    }
    // Step 3: eligibility and funding.
    if (payload.fundingSource === "shared") {
      const platformPct = Number(payload.platformSharePct) || 0;
      const sellerPct = Number(payload.sellerSharePct) || 0;
      if (platformPct + sellerPct !== 100) {
        checks.push(issue(3, "Shared funding must add up to 100%.", els.platformShareInput));
      }
    }
    if (!payload.sellerAdminId) {
      if (isEdit && selectedVoucherPlatformIds().length > 1) {
        checks.push(
          issue(
            1,
            "Editing changes one voucher card. Pick one platform, or create a new voucher for the other platforms.",
            els.platformToggle,
          ),
        );
      } else if (!isEdit) {
        const split = splitVoucherPayloads(payload);
        if (split.issue) checks.push(issue(split.issue.step, split.issue.message, split.issue.focus));
      }
    }
    return checks.filter(Boolean).sort((a, b) => a.step - b.step)[0] || null;
  }

  function platformCodeSuffix(platformId) {
    return String(platformId || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  }

  function platformVoucherCode(code, platformId) {
    const base = String(code || "").trim().toUpperCase();
    if (!base) return "";
    const suffix = platformCodeSuffix(platformId);
    return `${base.slice(0, Math.max(3, 31 - suffix.length))}-${suffix}`;
  }

  /** One payload per selected platform, so each platform gets its own voucher ID and card. */
  function splitVoucherPayloads(payload) {
    const targets = selectedVoucherPlatformIds();
    if (payload.sellerAdminId || targets.length < 2) return { payloads: [payload], issue: null };
    const payloads = [];
    for (const platformId of targets) {
      const types = voucherBusinessTypes(platformId);
      const typeIds = selectedBusinessTypeIds(types);
      if (types.length && !typeIds.length) {
        const label = platformLabel(platformId);
        return {
          payloads: [],
          issue: {
            step: 1,
            message: `Add at least one ${label} business type, or uncheck ${label}.`,
            focus: els.categorySearch,
          },
        };
      }
      const wholePlatform = !types.length || typeIds.length === types.length;
      const scopeType = wholePlatform ? "entire_platform" : "selected_business_types";
      payloads.push({
        ...payload,
        platformId,
        platformIds: [],
        code: platformVoucherCode(payload.code, platformId),
        scopeType,
        ...assignIncludeIds(scopeType, typeIds),
        excludeProductIds: wholePlatform ? [] : payload.excludeProductIds,
      });
    }
    return { payloads, issue: null };
  }

  function showVoucherIssue(found) {
    if (!found) return;
    setVoucherStep(found.step);
    setModalFeedback(found.message, "error");
    window.requestAnimationFrame(() => found.focus?.focus?.());
  }

  function setVoucherStep(step) {
    refreshElements();
    const total = VOUCHER_STEPS.length;
    const next = Math.min(Math.max(1, Number(step) || 1), total);
    state.modalStep = next;
    closeVoucherChoiceMenus();
    document.querySelectorAll("#voucher-modal [data-voucher-step-panel]").forEach((panel) => {
      panel.hidden = Number(panel.getAttribute("data-voucher-step-panel")) !== next;
    });
    document.querySelectorAll("#voucher-modal [data-voucher-step-indicator]").forEach((node) => {
      const index = Number(node.getAttribute("data-voucher-step-indicator"));
      node.classList.toggle("is-active", index === next);
      node.classList.toggle("is-complete", index < next);
      if (index === next) node.setAttribute("aria-current", "step");
      else node.removeAttribute("aria-current");
    });
    document.querySelectorAll("#voucher-modal [data-voucher-step-line]").forEach((line) => {
      line.classList.toggle(
        "is-complete",
        Number(line.getAttribute("data-voucher-step-line")) < next,
      );
    });
    const meta = VOUCHER_STEPS[next - 1];
    if (els.stepTitle) els.stepTitle.textContent = meta.title;
    if (els.stepCopy) els.stepCopy.textContent = meta.copy;
    if (els.stepNote) els.stepNote.textContent = `Step ${next} of ${total}`;
    if (els.cancelButton instanceof HTMLElement) els.cancelButton.hidden = next !== 1;
    if (els.backButton instanceof HTMLElement) els.backButton.hidden = next === 1;
    if (els.nextButton instanceof HTMLElement) els.nextButton.hidden = next === total;
    if (els.submitButton instanceof HTMLElement) els.submitButton.hidden = next !== total;
    if (next === total) renderVoucherReview();
    const content = document.querySelector("#voucher-modal .sa-voucher-modal__content");
    if (content instanceof HTMLElement) content.scrollTop = 0;
  }

  function goToVoucherStep(target) {
    refreshElements();
    const desired = Math.min(Math.max(1, Number(target) || 1), VOUCHER_STEPS.length);
    if (desired <= state.modalStep) {
      setVoucherStep(desired);
      return;
    }
    const found = firstVoucherIssue(readFormValues(), Boolean(state.editingId), desired - 1);
    if (found) {
      showVoucherIssue(found);
      return;
    }
    setVoucherStep(desired);
  }

  function reviewRowHtml(label, value) {
    const text = String(value ?? "").trim() || "—";
    return `<div class="sa-voucher-review__row"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(text)}</dd></div>`;
  }

  function syncVoucherReviewPreviewHeight() {
    state.reviewPreviewHeightFrame = 0;
    refreshElements();
    const preview = els.reviewPreview;
    const sections = els.reviewSections;
    if (!(preview instanceof HTMLElement) || !(sections instanceof HTMLElement)) return;
    if (window.matchMedia("(max-width: 720px)").matches) {
      preview.style.removeProperty("--sa-voucher-review-height");
      return;
    }
    const sectionsHeight = Math.ceil(sections.getBoundingClientRect().height);
    if (sectionsHeight > 0) {
      preview.style.setProperty("--sa-voucher-review-height", `${sectionsHeight}px`);
    }
  }

  function scheduleVoucherReviewPreviewHeight() {
    if (state.reviewPreviewHeightFrame) {
      window.cancelAnimationFrame(state.reviewPreviewHeightFrame);
    }
    state.reviewPreviewHeightFrame = window.requestAnimationFrame(syncVoucherReviewPreviewHeight);
  }

  function reviewSectionHtml(step, title, rows) {
    return `
      <section class="sa-voucher-review__section">
        <header class="sa-voucher-review__section-head">
          <strong>${escapeHtml(title)}</strong>
          <button type="button" class="sa-voucher-review__edit" data-voucher-review-edit="${step}">Edit</button>
        </header>
        <dl>${rows.join("")}</dl>
      </section>`;
  }

  function optionLabel(options, value, fallback = "") {
    return options.find((entry) => entry.value === value)?.label || fallback || String(value || "");
  }

  function renderVoucherReview() {
    refreshElements();
    const payload = readFormValues();
    const split = state.editingId ? null : splitVoucherPayloads(payload);
    const splitPayloads = split?.payloads?.length ? split.payloads : [payload];
    const peso = (value) => {
      const amount = Number(value);
      return Number.isFinite(amount) && amount > 0 ? `₱${amount.toLocaleString()}` : "";
    };
    if (els.reviewPreview instanceof HTMLElement) {
      els.reviewPreview.innerHTML = splitPayloads
        .map((entry) => voucherPromoHtml({ ...entry, startDate: "", status: "active" }))
        .join("");
    }
    if (!(els.reviewSections instanceof HTMLElement)) return;
    const discountText = payload.discountValue
      ? payload.discountType === "fixed"
        ? `${peso(payload.discountValue)} off`
        : `${payload.discountValue}% off`
      : "No price discount";
    const shippingText = payload.freeShipping
      ? payload.shippingDiscountType === "cap"
        ? `Free shipping up to ${peso(payload.shippingDiscountCap) || "cap"}`
        : "Free shipping (full)"
      : "Off";
    let appliesTo =
      payload.scopeType === "entire_platform"
        ? "All business types"
        : optionLabel(SCOPE_OPTIONS, payload.scopeType, "All business types");
    if (payload.scopeType === "selected_business_types") {
      const ids = new Set(payload.includeBusinessTypeIds || []);
      appliesTo = voucherBusinessTypes(voucherPlatformValue())
        .filter((type) => ids.has(type.id))
        .map((type) => type.name)
        .join(", ") || `${ids.size} business types`;
    } else if (payload.scopeType !== "entire_platform") {
      const ids = splitIdList(els.includeIdsInput?.value);
      appliesTo = `${appliesTo} (${ids.length})`;
    }
    let funding = optionLabel(FUNDING_OPTIONS, payload.fundingSource, "Platform funded");
    if (payload.fundingSource === "shared") {
      funding = `${funding} · Platform ${payload.platformSharePct || 0}% / Seller ${payload.sellerSharePct || 0}%`;
    }
    els.reviewSections.innerHTML = [
      reviewSectionHtml(1, "Details", [
        ...(splitPayloads.length > 1
          ? [
              reviewRowHtml(
                "Cards",
                `${splitPayloads.length} separate vouchers, one per platform`,
              ),
              ...splitPayloads.map((entry) =>
                reviewRowHtml(platformLabel(entry.platformId), entry.code || "Auto code"),
              ),
            ]
          : [
              reviewRowHtml("Platform", platformLabel(payload.platformId)),
              reviewRowHtml("Code", payload.code),
            ]),
        reviewRowHtml("Applies to", appliesTo),
        reviewRowHtml("Title", payload.title),
        reviewRowHtml("Redemption", optionLabel(REDEMPTION_OPTIONS, payload.redemptionMethod)),
        reviewRowHtml("Starts", payload.startDate || "When published"),
        reviewRowHtml("Ends", payload.date || "No end date"),
      ]),
      reviewSectionHtml(2, "Discount & limits", [
        reviewRowHtml("Discount", discountText),
        payload.discountType === "percent" && payload.discountValue
          ? reviewRowHtml("Maximum discount", peso(payload.maximumDiscount) || "No cap")
          : "",
        reviewRowHtml("Min. spend", peso(payload.minimumSpend) || "None"),
        reviewRowHtml("Free shipping", shippingText),
        reviewRowHtml("Uses per account", payload.usesPerAccount || 1),
        reviewRowHtml("Total redemptions", payload.totalUsageLimit || "Unlimited"),
      ]),
      reviewSectionHtml(3, "Eligibility", [
        reviewRowHtml("User", optionLabel(ELIGIBILITY_OPTIONS, payload.customerEligibility, "All User")),
        reviewRowHtml("Funding", funding),
        reviewRowHtml("Campaign budget", peso(payload.allocatedBudget) || "No limit"),
      ]),
    ].join("");
    if (els.reviewPreview instanceof HTMLElement) els.reviewPreview.scrollTop = 0;
    scheduleVoucherReviewPreviewHeight();
  }

  async function saveVoucher(event) {
    event.preventDefault();
    refreshElements();
    if (state.saving) return;
    if (state.modalStep < VOUCHER_STEPS.length) {
      goToVoucherStep(state.modalStep + 1);
      return;
    }
    const payload = readFormValues();
    const editingId = String(state.editingId || "").trim();
    const isEdit = Boolean(editingId);
    if (isEdit && isSellerCreatedVoucher(state.editingVoucher || payload)) {
      setModalFeedback("Seller-created vouchers cannot be edited by Super Admin.", "error");
      return;
    }
    const blocking = firstVoucherIssue(payload, isEdit);
    if (blocking) {
      showVoucherIssue(blocking);
      return;
    }
    const { payloads } = isEdit ? { payloads: [payload] } : splitVoucherPayloads(payload);
    state.saving = true;
    if (els.submitButton) els.submitButton.disabled = true;
    setModalFeedback(isEdit ? "Saving changes…" : "Creating voucher…", "notice");
    try {
      const response = await fetch(
        isEdit
          ? `/api/super-admin/vouchers/${encodeURIComponent(editingId)}`
          : "/api/super-admin/vouchers",
        {
          method: isEdit ? "PUT" : "POST",
          headers: headers({ "Content-Type": "application/json" }),
          body: JSON.stringify(payloads.length > 1 ? { vouchers: payloads } : payloads[0]),
        },
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          body.message ||
            (isEdit ? "Unable to update voucher." : "Unable to create voucher."),
        );
      }
      state.page = isEdit ? state.page : 1;
      await load({ quiet: true, showSkeleton: true });
      closeModal();
      setPageFeedback(
        body.message || (isEdit ? "Voucher updated." : "Voucher created."),
        "success",
      );
    } catch (error) {
      setModalFeedback(
        error instanceof Error
          ? error.message
          : isEdit
            ? "Unable to update voucher."
            : "Unable to create voucher.",
        "error",
      );
    } finally {
      state.saving = false;
      if (els.submitButton) els.submitButton.disabled = false;
    }
  }

  async function confirmVoucherDelete(voucherCode) {
    const api = window.SuperAdminDeleteModal;
    if (typeof api?.voucher === "function") {
      return api.voucher(voucherCode);
    }
    if (typeof api?.open === "function") {
      const normalizedCode = String(voucherCode || "").trim();
      return api.open({
        title: "Delete Voucher?",
        message: `Delete ${normalizedCode || "this voucher"}? This action cannot be undone and will be permanent.`,
        titlePrefix: "super-admin-voucher-delete-title",
      });
    }
    return false;
  }

  async function deleteVoucher(voucherId) {
    const voucher = findVoucherByRef(voucherId);
    if (!voucher) return;
    const confirmed = await confirmVoucherDelete(voucher.code);
    if (!confirmed) return;
    try {
      const response = await fetch(
        `/api/super-admin/vouchers/${encodeURIComponent(voucherRef(voucher) || voucherId)}`,
        {
          method: "DELETE",
          headers: headers(),
        },
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.message || "Unable to delete voucher.");
      }
      if (state.items.length <= 1 && state.page > 1) {
        state.page -= 1;
      }
      await load({ quiet: true, showSkeleton: true });
      setPageFeedback(body.message || "Voucher deleted.", "success");
    } catch (error) {
      setPageFeedback(
        error instanceof Error ? error.message : "Unable to delete voucher.",
        "error",
      );
    }
  }

  async function runVoucherLifecycle(voucherId, action) {
    const voucher = findVoucherByRef(voucherId);
    if (!voucher) {
      setPageFeedback("Voucher not found.", "error");
      return;
    }
    try {
      const response = await fetch(
        `/api/super-admin/vouchers/${encodeURIComponent(voucherRef(voucher) || voucherId)}/${action}`,
        {
          method: "POST",
          headers: headers({ "Content-Type": "application/json" }),
        },
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.message || "Unable to update voucher.");
      }
      await load({ quiet: true, showSkeleton: true });
      const message =
        body.message ||
        (action === "pause"
          ? "Voucher paused."
          : action === "resume"
            ? "Voucher resumed."
            : action === "cancel"
              ? "Voucher cancelled."
              : "Voucher duplicated.");
      setPageFeedback(message, "success");
      window.showSuperAdminSnackbar?.(message);
    } catch (error) {
      setPageFeedback(
        error instanceof Error ? error.message : "Unable to update voucher.",
        "error",
      );
    }
  }

  function buildVoucherDirectoryQuery(page = state.page) {
    const params = new URLSearchParams();
    params.set("page", String(Math.max(1, Number(page) || 1)));
    params.set("limit", String(Math.max(1, Number(state.pageSize) || 10)));
    const search = String(state.filters.search || "").trim();
    if (search) params.set("q", search);
    const status = String(state.filters.status || "").trim();
    if (status) params.set("status", status);
    const scope = String(state.filters.scope || "").trim();
    if (scope) params.set("scope", scope);
    const platformId = normalizePlatformId(state.filters.platformId);
    if (platformId) params.set("platformId", platformId);
    const discountType = String(state.filters.discountType || "").trim().toLowerCase();
    if (discountType === "percent" || discountType === "fixed") {
      params.set("discountType", discountType);
    }
    if (state.filters.upcoming) params.set("upcoming", "1");
    if (state.filters.endingSoon) params.set("endingSoon", "1");
    const redemption = String(state.filters.redemption || "").trim();
    if (redemption) params.set("redemption", redemption);
    const funding = String(state.filters.funding || "").trim();
    if (funding) params.set("funding", funding);
    for (const key of ["voucherStatus", "usage", "eligibility", "minSpend"]) {
      const value = String(state.filters[key] || "").trim();
      if (value) params.set(key, value);
    }
    return params;
  }

  async function load({ quiet = false, page, showSkeleton } = {}) {
    refreshElements();
    const requestPage = Math.max(1, Number(page || state.page) || 1);
    const requestId = ++state.requestSeq;
    const startedAt = Date.now();
    const shouldShowSkeleton =
      showSkeleton === true || (!state.items.length && showSkeleton !== false);
    state.page = requestPage;
    state.loading = true;
    renderPagination();
    if (shouldShowSkeleton) {
      paintVoucherSkeleton();
    } else if (els.list instanceof HTMLElement && !quiet && !state.items.length) {
      els.list.innerHTML =
        '<div class="sa-vouchers-empty-cell">Loading vouchers…</div>';
    }
    try {
      await Promise.all([loadPlatforms(), loadStoreTypes()]);
      const response = await fetch(
        `/api/super-admin/vouchers?${buildVoucherDirectoryQuery(requestPage)}`,
        {
          headers: headers(),
          cache: "no-store",
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message || "Unable to load vouchers.");
      }
      if (shouldShowSkeleton) {
        const remain = Math.max(
          0,
          (Number(window.SuperAdminShowcaseSkeleton?.minMs) || 1000) - (Date.now() - startedAt),
        );
        if (remain > 0) await waitVoucherSkeletonMs(remain);
      }
      if (requestId !== state.requestSeq) return;
      state.items = Array.isArray(payload.vouchers) ? payload.vouchers : [];
      state.total = Math.max(0, Number(payload.total) || state.items.length);
      state.page = Math.max(1, Number(payload.page) || requestPage);
      state.pageSize = Math.max(1, Number(payload.limit) || state.pageSize);
      const rawSubnav = payload.subnav && typeof payload.subnav === "object" ? payload.subnav : {};
      const apiPlatforms = Array.isArray(rawSubnav.platforms)
        ? rawSubnav.platforms
            .map((entry) => ({
              id: normalizePlatformId(entry?.id),
              count: Math.max(0, Number(entry?.count) || 0),
            }))
            .filter((entry) => entry.id && entry.count > 0)
        : [];
      const itemPlatforms = [];
      const itemPlatformCounts = new Map();
      for (const voucher of state.items) {
        const platformId = voucherScopedPlatformId(voucher);
        if (!platformId) continue;
        itemPlatformCounts.set(platformId, (itemPlatformCounts.get(platformId) || 0) + 1);
      }
      for (const [id, count] of itemPlatformCounts) {
        itemPlatforms.push({ id, count });
      }
      state.subnav = {
        companies: Math.max(0, Number(rawSubnav.companies) || 0),
        percent: Math.max(0, Number(rawSubnav.percent) || 0),
        fixed: Math.max(0, Number(rawSubnav.fixed) || 0),
        comingSoon: Math.max(0, Number(rawSubnav.comingSoon) || 0),
        platforms: apiPlatforms.length ? apiPlatforms : itemPlatforms,
      };
      state.subnavReady = true;
      renderVoucherSubnav();
      renderList();
    } catch (error) {
      if (requestId !== state.requestSeq) return;
      state.subnavReady = true;
      renderVoucherSubnav();
      if (els.list instanceof HTMLElement) {
        els.list.classList.remove("is-skeleton-loading");
        els.list.innerHTML = `<div class="sa-vouchers-empty-cell">${escapeHtml(
          error instanceof Error ? error.message : "Unable to load vouchers.",
        )}</div>`;
      }
      if (!quiet) {
        setPageFeedback(
          error instanceof Error ? error.message : "Unable to load vouchers.",
          "error",
        );
      }
    } finally {
      if (requestId === state.requestSeq) {
        state.loading = false;
      }
    }
  }

  function bind() {
    refreshElements();
    if (state.bound) return;
    state.bound = true;
    initializeVoucherDatePicker();
    initializeVoucherTimePicker();
    initializeVoucherStartPickers();
    initializeRepeatPickers();
    renderCardColorSwatches();
    setCardColor(els.colorInput?.value || DEFAULT_VOUCHER_CARD_COLOR);
    startVoucherCountdowns();
    syncFilterPlatformRadios();
    syncStatusFilterControls();
    syncQuickViewNav();
    renderVoucherSubnav();
    renderHeaderFilterSummary();
    window.addEventListener("resize", scheduleVoucherReviewPreviewHeight, { passive: true });
    if ("ResizeObserver" in window && els.reviewSections instanceof HTMLElement) {
      state.reviewResizeObserver = new ResizeObserver(scheduleVoucherReviewPreviewHeight);
      state.reviewResizeObserver.observe(els.reviewSections);
    }

    els.filterToggle?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setFilterOpen(els.filterToggle.getAttribute("aria-expanded") !== "true");
    });
    els.filterApply?.addEventListener("click", (event) => {
      event.preventDefault();
      setFilterOpen(false);
      els.filterToggle?.focus();
    });
    els.filterClear?.addEventListener("click", (event) => {
      event.preventDefault();
      clearFilters();
    });

    document.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;
      const settingsButton = target.closest(
        "#voucher-modal [data-voucher-details-settings]",
      );
      if (settingsButton) {
        event.preventDefault();
        event.stopPropagation();
        refreshElements();
        const isOpen = els.settingsButton?.getAttribute("aria-expanded") === "true";
        setVoucherSettingsOpen(!isOpen);
        return;
      }
      if (
        els.settingsPopover instanceof HTMLElement &&
        !els.settingsPopover.hidden &&
        !eventPathMatches(
          event,
          "[data-voucher-settings-popover], [data-voucher-details-settings], #switch-time-calendar, #switch-date-calendar, .product-expiry-time-calendar, .product-expiry-calendar",
        )
      ) {
        setVoucherSettingsOpen(false);
      }
      const quickViewButton = target.closest(
        "[data-super-admin-voucher-quick-view]",
      );
      if (quickViewButton) {
        event.preventDefault();
        applyQuickView(
          quickViewButton.getAttribute("data-super-admin-voucher-quick-view"),
        );
        return;
      }
      if (
        els.filterPanel &&
        !els.filterPanel.hidden &&
        !target.closest(".super-admin-vouchers-filter-dropdown")
      ) {
        setFilterOpen(false);
      }
      const colorTrigger = target.closest("#voucher-modal [data-voucher-color-trigger]");
      if (colorTrigger) {
        event.preventDefault();
        if (els.colorInput instanceof HTMLInputElement) {
          els.colorInput.click();
        }
        return;
      }
      const colorSwatch = target.closest("#voucher-modal [data-voucher-color-swatch]");
      if (colorSwatch) {
        event.preventDefault();
        setCardColor(colorSwatch.getAttribute("data-voucher-color-swatch"));
        updatePreview();
        return;
      }
      if (target.closest("[data-super-admin-voucher-add]")) {
        event.preventDefault();
        openModal();
        return;
      }
      if (target.closest("#voucher-modal-close-button, #voucher-modal-cancel-button")) {
        event.preventDefault();
        closeModal();
        return;
      }
      if (target.closest("#voucher-modal-next-button")) {
        event.preventDefault();
        goToVoucherStep(state.modalStep + 1);
        return;
      }
      if (target.closest("#voucher-modal-back-button")) {
        event.preventDefault();
        setVoucherStep(state.modalStep - 1);
        return;
      }
      const stepJump = target.closest(
        "#voucher-modal [data-voucher-step-indicator], #voucher-modal [data-voucher-review-edit]",
      );
      if (stepJump) {
        event.preventDefault();
        goToVoucherStep(
          stepJump.getAttribute("data-voucher-step-indicator") ||
            stepJump.getAttribute("data-voucher-review-edit"),
        );
        return;
      }
      const addType = target.closest("#voucher-modal [data-voucher-business-type-add]");
      if (addType) {
        event.preventDefault();
        setBusinessTypeSelected(addType.getAttribute("data-voucher-business-type-add") || "", true);
        return;
      }
      const removeType = target.closest("#voucher-modal [data-voucher-business-type-remove]");
      if (removeType) {
        event.preventDefault();
        setBusinessTypeSelected(removeType.getAttribute("data-voucher-business-type-remove") || "", false);
        return;
      }
      const allTypes = target.closest("#voucher-modal [data-voucher-business-type-all]");
      if (allTypes) {
        event.preventDefault();
        setAllBusinessTypes(allTypes.getAttribute("data-voucher-business-type-all") !== "remove");
        return;
      }
      const choiceOption = target.closest("#voucher-modal [data-voucher-choice-value]");
      if (choiceOption) {
        event.preventDefault();
        const choice = choiceOption.closest("[data-voucher-choice]")?.getAttribute("data-voucher-choice");
        const value = choiceOption.getAttribute("data-voucher-choice-value") || "";
        refreshElements();
        if (choice === "redemption") setRedemptionMethod(value);
        if (choice === "eligibility") {
          setHiddenChoice(els.eligibilityInput, els.eligibilityLabel, "voucher-eligibility-menu", value, ELIGIBILITY_OPTIONS);
          syncAdvancedVoucherFields();
        }
        if (choice === "funding") {
          setHiddenChoice(els.fundingInput, els.fundingLabel, "voucher-funding-menu", value, FUNDING_OPTIONS);
          syncAdvancedVoucherFields();
        }
        if (choice === "shippingType") {
          setHiddenChoice(
            els.shippingTypeInput,
            els.shippingTypeLabel,
            "voucher-shipping-type-menu",
            value,
            [
              { value: "full", label: "Full shipping" },
              { value: "cap", label: "Shipping discount cap" },
            ],
          );
          syncAdvancedVoucherFields();
        }
        if (choice === "shippingLocation") {
          setHiddenChoice(
            els.shippingLocationInput,
            els.shippingLocationLabel,
            "voucher-shipping-location-menu",
            value,
            [
              { value: "nationwide", label: "Nationwide" },
              { value: "regions", label: "Selected regions" },
              { value: "provinces", label: "Selected provinces" },
              { value: "cities", label: "Selected cities" },
            ],
          );
        }
        closeVoucherChoiceMenus();
        updatePreview();
        return;
      }
      const choiceTrigger = target.closest(
        "#voucher-modal .sa-voucher-modal__choice-trigger, #voucher-repeat-days-toggle",
      );
      if (choiceTrigger) {
        event.preventDefault();
        const dropdown = choiceTrigger.closest(".sa-choice-dropdown");
        const isOpen = dropdown?.classList.contains("is-open");
        setVoucherChoiceOpen(dropdown, !isOpen);
        return;
      }
      if (!target.closest("#voucher-modal .sa-choice-dropdown")) {
        closeVoucherChoiceMenus();
      }
      if (target.closest("#voucher-repeat-toggle")) {
        event.preventDefault();
        refreshElements();
        const next = !(els.repeatInput instanceof HTMLInputElement
          ? els.repeatInput.checked
          : false);
        setRepeatWeeklyToggle(next);
        return;
      }
      const repeatDayButton = target.closest("#voucher-repeat-days-menu [data-repeat-day]");
      if (repeatDayButton) {
        event.preventDefault();
        toggleRepeatDay(repeatDayButton.getAttribute("data-repeat-day"));
        return;
      }
      if (target.closest("#voucher-combine-flash-toggle")) {
        event.preventDefault();
        setFlagToggle(els.combineFlashInput, els.combineFlashToggle, !els.combineFlashInput?.checked);
        return;
      }
      if (target.closest("#voucher-combine-platform-toggle")) {
        event.preventDefault();
        setFlagToggle(els.combinePlatformInput, els.combinePlatformToggle, !els.combinePlatformInput?.checked);
        return;
      }
      if (target.closest("#voucher-combine-shipping-toggle")) {
        event.preventDefault();
        setFlagToggle(els.combineShippingInput, els.combineShippingToggle, !els.combineShippingInput?.checked);
        return;
      }
      if (target.closest("#voucher-combine-rewards-toggle")) {
        event.preventDefault();
        setFlagToggle(els.combineRewardsInput, els.combineRewardsToggle, !els.combineRewardsInput?.checked);
        return;
      }
      if (target.closest("#voucher-free-shipping-toggle")) {
        event.preventDefault();
        refreshElements();
        const next = !(els.freeShippingInput instanceof HTMLInputElement
          ? els.freeShippingInput.checked
          : false);
        setFreeShippingToggle(next);
        updatePreview();
        return;
      }
      if (
        target.closest("#voucher-date-trigger, #voucher-time-trigger") &&
        !parseVoucherDateInputValue(els.startDateInput?.value)
      ) {
        event.preventDefault();
        setModalFeedback("Set a start date first.", "error");
        els.startDateTrigger?.focus();
        return;
      }
      if (target.closest("#voucher-discount-type-toggle")) {
        event.preventDefault();
        refreshElements();
        const current = normalizeDiscountType(els.discountTypeInput?.value);
        setDiscountTypeToggle(current === "percent" ? "fixed" : "percent");
        updatePreview();
        return;
      }
      if (target.id === "voucher-modal-overlay") {
        closeModal();
        return;
      }
      const pageButton = target.closest("[data-super-admin-vouchers-page]");
      if (pageButton instanceof HTMLButtonElement) {
        event.preventDefault();
        event.stopPropagation();
        if (pageButton.disabled) return;
        const nextPage = Number(pageButton.dataset.superAdminVouchersPage);
        if (!Number.isInteger(nextPage) || nextPage < 1 || nextPage === state.page) {
          return;
        }
        state.page = nextPage;
        void load({ quiet: true, page: nextPage, showSkeleton: true });
        document
          .querySelector("[data-super-admin-section='vouchers'] .sa-vouchers-heading")
          ?.scrollIntoView({ block: "start", behavior: "smooth" });
        return;
      }
      const inactiveToggle = target.closest("[data-voucher-inactive-toggle]");
      if (inactiveToggle) {
        event.preventDefault();
        event.stopPropagation();
        const wrap = inactiveToggle.closest(".sa-voucher-showcase__activity, .sa-voucher-card__activity, .super-admin-company-showcase__activity");
        const isOpen = wrap?.classList.contains("is-open");
        setVoucherInactiveMenuOpen(wrap, !isOpen);
        return;
      }
      if (!target.closest(".sa-voucher-showcase__activity, .sa-voucher-card__activity")) {
        closeVoucherInactiveMenus();
      }
      const editButton = target.closest("[data-voucher-edit]");
      if (editButton) {
        event.preventDefault();
        event.stopPropagation();
        const voucherId = editButton.getAttribute("data-voucher-edit") || "";
        if (voucherId) openEditModal(voucherId);
        return;
      }
      const duplicateButton = target.closest("[data-voucher-duplicate]");
      if (duplicateButton) {
        event.preventDefault();
        event.stopPropagation();
        void runVoucherLifecycle(duplicateButton.getAttribute("data-voucher-duplicate") || "", "duplicate");
        return;
      }
      const pauseButton = target.closest("[data-voucher-pause]");
      if (pauseButton) {
        event.preventDefault();
        event.stopPropagation();
        void runVoucherLifecycle(pauseButton.getAttribute("data-voucher-pause") || "", "pause");
        return;
      }
      const resumeButton = target.closest("[data-voucher-resume]");
      if (resumeButton) {
        event.preventDefault();
        event.stopPropagation();
        void runVoucherLifecycle(resumeButton.getAttribute("data-voucher-resume") || "", "resume");
        return;
      }
      const deleteButton = target.closest("[data-voucher-delete]");
      if (deleteButton) {
        event.preventDefault();
        event.stopPropagation();
        const voucherId = deleteButton.getAttribute("data-voucher-delete") || "";
        if (voucherId) void deleteVoucher(voucherId);
        return;
      }
      if (target.closest("[data-company-contact-copy]")) {
        return;
      }
    });

    document.addEventListener("submit", (event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || form.id !== "voucher-modal-form") return;
      void saveVoucher(event);
    });

    document.addEventListener("input", (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;
      if (target.matches("[data-super-admin-vouchers-search]")) {
        state.filters.search = String(
          target instanceof HTMLInputElement ? target.value : "",
        );
        if (state.searchTimer) window.clearTimeout(state.searchTimer);
        state.searchTimer = window.setTimeout(() => {
          state.searchTimer = 0;
          state.page = 1;
          void load({ quiet: true, showSkeleton: true });
        }, 500);
        return;
      }
      if (target.id === "voucher-category-search") {
        state.categorySearch = target instanceof HTMLInputElement ? target.value : "";
        renderVoucherCategoryPicker();
        return;
      }
      // The change handler owns these; re-rendering on input would swap the node before it fires.
      if (
        target.matches("[data-voucher-platform-all], [data-voucher-platform-option]")
      ) {
        return;
      }
      const form = target.closest("#voucher-modal-form");
      if (form) {
        if (target.id === "voucher-card-color-input") {
          setCardColor(target instanceof HTMLInputElement ? target.value : "");
        }
        updatePreview();
      }
    });
    document.addEventListener("change", (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;
      if (target.matches("[data-super-admin-vouchers-filter]")) {
        const key = target.getAttribute("data-super-admin-vouchers-filter") || "";
        const value =
          target instanceof HTMLInputElement ? String(target.value || "") : "";
        if (PANEL_FILTER_KEYS.includes(key)) {
          state.filters[key] = value;
          renderHeaderFilterSummary();
          state.page = 1;
          void load({ quiet: true, showSkeleton: true });
        }
        return;
      }
      if (target.matches("[data-voucher-platform-all]")) {
        const checked = target instanceof HTMLInputElement && target.checked;
        state.voucherPlatforms = { all: checked, ids: new Set() };
        applyVoucherPlatformChange();
        return;
      }
      if (target.matches("[data-voucher-platform-option]")) {
        toggleVoucherPlatform(
          target.getAttribute("data-voucher-platform-option") || "",
          target instanceof HTMLInputElement && target.checked,
        );
        applyVoucherPlatformChange();
        return;
      }
      const form = target.closest("#voucher-modal-form");
      if (form) {
        if (target.id === "voucher-card-color-input") {
          setCardColor(target instanceof HTMLInputElement ? target.value : "");
        }
        updatePreview();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (
        event.key === "Enter" &&
        event.target instanceof Element &&
        event.target.id === "voucher-category-search"
      ) {
        event.preventDefault();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      if (state.dateCalendar?.hidden === false) {
        event.preventDefault();
        setVoucherDateCalendarOpen(false, { restoreFocus: true });
        return;
      }
      if (els.filterPanel && !els.filterPanel.hidden) {
        event.preventDefault();
        setFilterOpen(false);
        return;
      }
      refreshElements();
      if (isSwitchCalendarOpen()) {
        return;
      }
      if (els.settingsPopover instanceof HTMLElement && !els.settingsPopover.hidden) {
        event.preventDefault();
        setVoucherSettingsOpen(false, { restoreFocus: true });
        return;
      }
      if (els.modalOverlay && !els.modalOverlay.hidden) {
        event.preventDefault();
        closeModal();
      }
    });
  }

  window.SuperAdminVouchers = {
    load,
    bind,
    setQuickView(value) {
      applyQuickView(value);
    },
    openModal,
    openEditModal,
    closeFilter() {
      setFilterOpen(false);
    },
    get loading() {
      return state.loading;
    },
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind, { once: true });
  } else {
    bind();
  }

  window.addEventListener("gms:platforms-updated", (event) => {
    applyPlatformsFromEvent(event?.detail?.platforms);
  });
})();
