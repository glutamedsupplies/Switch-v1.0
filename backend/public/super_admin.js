(function () {
  const sessionKey = "gms-super-admin-session";
  const loginPath = "/root_login.html";
  const state = {
    admins: [],
    categories: [],
    storeTypes: [],
    productRequests: [],
    paymentPartners: [],
    deliveryPartners: [],
    userAccounts: [],
    storeTypeSearchTerm: "",
    storeTypeView: "grid",
    productRequestSearchTerm: "",
    productRequestFilter: "all",
    paymentPartnerSearchTerm: "",
    deliveryPartnerSearchTerm: "",
    userDataSearchTerm: "",
    editingCategoryName: "",
    editingStoreTypeName: "",
    loading: false,
    categoriesLoading: false,
    storeTypesLoading: false,
    productRequestsLoading: false,
    paymentPartnersLoading: false,
    deliveryPartnersLoading: false,
    userAccountsLoading: false,
    activeSection: "companies",
    companySearchTerm: "",
    companyFilters: {
      workspace: "all",
      team: "all",
      activity: "all",
    },
    companySort: "created-desc",
    companyView: "grid",
    companyPage: 1,
    companyPageSize: 10,
    selectedCompanyId: "",
    selectedCompanyIds: new Set(),
    selectedPaymentPartnerId: "",
    selectedDeliveryPartnerId: "",
    selectedUserAccountId: "",
  };
  const categoryDrawerScrollLockKeys = new Set([
    " ",
    "ArrowDown",
    "ArrowUp",
    "PageDown",
    "PageUp",
    "Home",
    "End",
  ]);
  let categoryDrawerCloseTimer = 0;
  let categoryDrawerFocusTimer = 0;
  let storeTypeDrawerCloseTimer = 0;
  let storeTypeDrawerFocusTimer = 0;
  let companySearchTimer = 0;
  let storeTypeSearchTimer = 0;
  let productRequestSearchTimer = 0;
  let paymentPartnerSearchTimer = 0;
  let deliveryPartnerSearchTimer = 0;
  let userDataSearchTimer = 0;
  let validationModalResolve = null;
  let validationModalAutoCloseTimer = 0;
  let validationSuccessAnimation = null;
  let validationLottieLoadPromise = null;
  const validationLottiePlayerUrl = "/vendor/lottie.min.js";
  const validationSuccessAnimationPath = "/animations/employee-account-check.json";
  const validationModalIcons = Object.freeze({
    success: `<div class="product-validation-lottie-check" data-super-admin-validation-lottie-check></div>`,
    notice: `<i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>`,
    error: `<i class="fa-solid fa-circle-xmark" aria-hidden="true"></i>`,
    delete: `<i class="fa-solid fa-trash-can" aria-hidden="true"></i>`,
  });
  const companyBuildingIconPaths = '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" stroke-linejoin="round"></path><path d="M6 12H4a2 2 0 0 0-2 2v8h20v-8a2 2 0 0 0-2-2h-2" stroke-linejoin="round"></path><path d="M10 6h4M10 10h4M10 14h4M10 18h4" stroke-linecap="round"></path>';
  const companyCardIconPaths = Object.freeze({
    followers: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>',
    email: '<rect width="20" height="16" x="2" y="4" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>',
    contact: '<path d="M18 20a6 6 0 0 0-12 0"></path><circle cx="12" cy="10" r="4"></circle><circle cx="12" cy="12" r="10"></circle>',
    listings: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path>',
    employees: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>',
    orders: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path><path d="M3 6h18"></path><path d="M16 10a4 4 0 0 1-8 0"></path>',
    reviews: '<path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"></path>',
    rating: '<path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" stroke-linejoin="round"></path>',
  });

  const elements = {
    navToggle: document.querySelector("[data-super-admin-nav-toggle]"),
    navBackdrop: document.querySelector("[data-super-admin-nav-backdrop]"),
    sidebar: document.getElementById("super-admin-sidebar"),
    feedback: document.getElementById("super-admin-feedback"),
    list: document.querySelector("[data-super-admin-list]"),
    empty: document.querySelector("[data-super-admin-empty]"),
    emptyDescription: document.querySelector("[data-super-admin-empty-description]"),
    signOutButtons: Array.from(document.querySelectorAll("[data-root-sign-out]")),
    companySearch: document.querySelector("[data-super-admin-search]"),
    companyFilters: Array.from(document.querySelectorAll("[data-super-admin-filter]")),
    applyCompanyFilters: document.querySelector("[data-super-admin-filter-apply]"),
    filterClearBtn: document.querySelector("[data-super-admin-filter-clear]"),
    companySort: document.querySelectorAll("[data-super-admin-sort]"),
    companyViewButtons: Array.from(document.querySelectorAll("[data-super-admin-view]")),
    companyTotalLabel: document.querySelector("[data-super-admin-total-label]"),
    companyPageMeta: document.querySelector("[data-super-admin-page-meta]"),
    companyPagination: document.querySelector("[data-super-admin-pagination]"),
    companyDrawer: document.querySelector("[data-super-admin-company-drawer]"),
    companyDrawerBackdrop: document.querySelector("[data-super-admin-company-drawer-backdrop]"),
    companyDrawerContent: document.querySelector("[data-super-admin-company-drawer-content]"),
    companyDrawerClose: document.querySelector("[data-super-admin-company-drawer-close]"),
    filterDropdownToggle: document.querySelector("[data-super-admin-filter-dropdown-toggle]"),
    filterDropdownPanel: document.querySelector("[data-super-admin-filter-dropdown-panel]"),
    filterSummary: document.querySelector("[data-super-admin-filter-summary]"),
    notificationBtn: document.getElementById("super-admin-notification-btn"),
    notificationBadge: document.getElementById("super-admin-notification-badge"),
    notificationPanel: document.getElementById("super-admin-notification-panel"),
    notificationList: document.getElementById("super-admin-notification-list"),
    colorOptions: document.getElementById("super-admin-color-options"),
    colorBtn: document.getElementById("super-admin-color-btn"),
    colorPanel: document.getElementById("super-admin-color-panel"),
    categoryPanel: document.getElementById("category-manager-panel"),
    categoryCloseButton: document.getElementById("category-manager-close-button"),
    categoryList: document.getElementById("saved-category-list"),
    categoryNameInput: document.getElementById("category-name-input"),
    categoryInputLabel: document.getElementById("category-input-label"),
    addCategoryButton: document.getElementById("add-category-button"),
    cancelCategoryEditButton: document.getElementById("cancel-category-edit-button"),
    categoryNavTriggers: Array.from(document.querySelectorAll("[data-root-category-trigger]")),
    storeTypePanel: document.getElementById("store-type-manager-panel"),
    storeTypeCloseButton: document.getElementById("store-type-manager-close-button"),
    storeTypeList: document.getElementById("saved-store-type-list"),
    storeTypeNameInput: document.getElementById("store-type-name-input"),
    storeTypeSearch: document.querySelector("[data-super-admin-store-type-search]"),
    storeTypeViewButtons: Array.from(document.querySelectorAll("[data-super-admin-store-type-view]")),
    storeTypeInputLabel: document.getElementById("store-type-input-label"),
    addStoreTypeButton: document.getElementById("add-store-type-button"),
    cancelStoreTypeEditButton: document.getElementById("cancel-store-type-edit-button"),
    storeTypeTotalLabel: document.querySelector("[data-super-admin-store-type-total]"),
    storeTypeNavTriggers: Array.from(document.querySelectorAll("[data-root-store-type-trigger]")),
    sectionNavItems: Array.from(document.querySelectorAll("[data-super-admin-section-target]")),
    sections: Array.from(document.querySelectorAll("[data-super-admin-section]")),
    productRequestCount: document.querySelector("[data-super-admin-product-request-count]"),
    productRequestTotal: document.querySelector("[data-super-admin-product-request-total]"),
    productRequestList: document.querySelector("[data-super-admin-product-request-list]"),
    productRequestEmpty: document.querySelector("[data-super-admin-product-request-empty]"),
    productRequestSearch: document.querySelector("[data-super-admin-product-request-search]"),
    productRequestFilterToggle: document.querySelector("[data-super-admin-product-request-filter-toggle]"),
    productRequestFilterPanel: document.querySelector("[data-super-admin-product-request-filter-panel]"),
    productRequestFilterSummary: document.querySelector("[data-super-admin-product-request-filter-summary]"),
    productRequestFilters: Array.from(document.querySelectorAll("[data-super-admin-product-request-filter]")),
    paymentPartnerSearch: document.querySelector("[data-super-admin-payment-partner-search]"),
    paymentPartnerTotal: document.querySelector("[data-super-admin-payment-partner-total]"),
    paymentPartnerList: document.querySelector("[data-super-admin-payment-partners-list]"),
    paymentPartnerDrawer: document.querySelector("[data-super-admin-payment-partner-drawer]"),
    paymentPartnerDrawerBackdrop: document.querySelector("[data-super-admin-payment-partner-drawer-backdrop]"),
    paymentPartnerDrawerContent: document.querySelector("[data-super-admin-payment-partner-drawer-content]"),
    paymentPartnerDrawerClose: document.querySelector("[data-super-admin-payment-partner-drawer-close]"),
    deliveryPartnerSearch: document.querySelector("[data-super-admin-delivery-partner-search]"),
    deliveryPartnerTotal: document.querySelector("[data-super-admin-delivery-partner-total]"),
    deliveryPartnerList: document.querySelector("[data-super-admin-delivery-partners-list]"),
    deliveryPartnerDrawer: document.querySelector("[data-super-admin-delivery-partner-drawer]"),
    deliveryPartnerDrawerBackdrop: document.querySelector("[data-super-admin-delivery-partner-drawer-backdrop]"),
    deliveryPartnerDrawerContent: document.querySelector("[data-super-admin-delivery-partner-drawer-content]"),
    deliveryPartnerDrawerClose: document.querySelector("[data-super-admin-delivery-partner-drawer-close]"),
    userDataSearch: document.querySelector("[data-super-admin-user-data-search]"),
    userDataTotal: document.querySelector("[data-super-admin-user-data-total]"),
    userDataList: document.querySelector("[data-super-admin-user-data-list]"),
    userDataDrawer: document.querySelector("[data-super-admin-user-data-drawer]"),
    userDataDrawerBackdrop: document.querySelector("[data-super-admin-user-data-drawer-backdrop]"),
    userDataDrawerContent: document.querySelector("[data-super-admin-user-data-drawer-content]"),
    userDataDrawerClose: document.querySelector("[data-super-admin-user-data-drawer-close]"),
    statusDot: document.querySelector(".super-admin-status-dot"),
    validationModalOverlay: document.getElementById("super-admin-validation-modal-overlay"),
    validationModalDialog: document.querySelector(".super-admin-validation-modal"),
    validationModalCloseButton: document.getElementById("super-admin-validation-modal-close"),
    validationModalIcon: document.getElementById("super-admin-validation-modal-icon"),
    validationModalTitle: document.getElementById("super-admin-validation-modal-title"),
    validationModalCopy: document.getElementById("super-admin-validation-modal-copy"),
    validationModalActions: document.getElementById("super-admin-validation-modal-actions"),
    validationModalActionButton: document.getElementById("super-admin-validation-modal-action"),
    validationModalSecondaryActionButton: document.getElementById("super-admin-validation-modal-secondary-action"),
  };
  const sectionNames = new Set([
    "companies",
    "store-types",
    "product-requests",
    "payment-partners",
    "delivery-partners",
    "user-data",
  ]);

  function syncSuperAdminNavToggleLabel() {
    if (!elements.navToggle) {
      return;
    }
    const isOpen = document.body.classList.contains("super-admin-nav-open");
    const label = isOpen ? "Close navigation" : "Open navigation";
    elements.navToggle.setAttribute("aria-expanded", String(isOpen));
    elements.navToggle.setAttribute("aria-label", label);
    elements.navToggle.title = label;
  }

  function setSuperAdminNavCollapsed(isCollapsed) {
    if (!isCollapsed) {
      document.body.classList.remove("super-admin-nav-collapsed");
    }
    syncSuperAdminNavToggleLabel();
  }

  function setSuperAdminNavOpen(isOpen, options = {}) {
    const shouldOpen = Boolean(isOpen);
    document.body.classList.toggle("super-admin-nav-open", shouldOpen);
    if (!shouldOpen) {
      document.body.classList.remove("super-admin-nav-collapsed");
    } else if (Object.prototype.hasOwnProperty.call(options, "collapsed")) {
      setSuperAdminNavCollapsed(Boolean(options.collapsed));
    }
    if (elements.navToggle) {
      syncSuperAdminNavToggleLabel();
    }
    if (elements.navBackdrop) {
      elements.navBackdrop.hidden = !shouldOpen;
    }
  }

  function toggleSuperAdminNav() {
    const isOpen = document.body.classList.contains("super-admin-nav-open");
    if (!isOpen) {
      setSuperAdminNavOpen(true, { collapsed: false });
      return;
    }
    setSuperAdminNavOpen(false);
  }

  function readRootSession() {
    try {
      const rawSession = window.sessionStorage.getItem(sessionKey);
      return rawSession ? JSON.parse(rawSession) : null;
    } catch (error) {
      return null;
    }
  }

  function requireRootSession() {
    const session = readRootSession();
    if (!session || !session.token) {
      window.location.replace(loginPath);
      return null;
    }
    return session;
  }

  const rootSession = requireRootSession();
  if (!rootSession) {
    return;
  }

  function setSuperAdminStatusOnline() {
    if (elements.statusDot) {
      elements.statusDot.classList.add("is-online");
    }
  }

  function setSuperAdminStatusOffline() {
    if (elements.statusDot) {
      elements.statusDot.classList.remove("is-online");
    }
  }

  setSuperAdminStatusOnline();

  function setFeedback(message, mode = "") {
    if (!elements.feedback) {
      return;
    }
    elements.feedback.textContent = message;
    elements.feedback.className = "feedback-note";
    if (mode) {
      elements.feedback.classList.add(mode);
    }
  }

  function rootHeaders(extraHeaders = {}) {
    const session = requireRootSession();
    if (!session) {
      return extraHeaders;
    }
    return {
      ...extraHeaders,
      "X-GMS-Super-Admin-Token": session.token,
    };
  }

  function clearValidationModalAutoCloseTimer() {
    if (validationModalAutoCloseTimer) {
      window.clearTimeout(validationModalAutoCloseTimer);
      validationModalAutoCloseTimer = 0;
    }
  }

  function destroyValidationSuccessAnimation() {
    if (validationSuccessAnimation?.destroy) {
      validationSuccessAnimation.destroy();
    }
    validationSuccessAnimation = null;
  }

  function ensureValidationLottiePlayer() {
    if (window.lottie?.loadAnimation) {
      return Promise.resolve(true);
    }

    if (validationLottieLoadPromise) {
      return validationLottieLoadPromise;
    }

    validationLottieLoadPromise = new Promise((resolve) => {
      const existingScript = document.querySelector(
        `script[src$="${validationLottiePlayerUrl}"], script[src*="${validationLottiePlayerUrl}?"]`,
      );

      if (existingScript) {
        existingScript.addEventListener(
          "load",
          () => resolve(Boolean(window.lottie?.loadAnimation)),
          { once: true },
        );
        existingScript.addEventListener("error", () => resolve(false), { once: true });
        if (window.lottie?.loadAnimation) {
          resolve(true);
        }
        return;
      }

      const scriptElement = document.createElement("script");
      scriptElement.src = validationLottiePlayerUrl;
      scriptElement.async = true;
      scriptElement.addEventListener(
        "load",
        () => resolve(Boolean(window.lottie?.loadAnimation)),
        { once: true },
      );
      scriptElement.addEventListener("error", () => resolve(false), { once: true });
      document.head.appendChild(scriptElement);
    });

    return validationLottieLoadPromise;
  }

  async function playValidationSuccessAnimation() {
    const container = elements.validationModalIcon?.querySelector(
      "[data-super-admin-validation-lottie-check]",
    );
    if (!(container instanceof HTMLElement)) {
      return;
    }

    destroyValidationSuccessAnimation();
    container.innerHTML = "";

    const canUseLottie = await ensureValidationLottiePlayer();
    if (
      !canUseLottie ||
      !window.lottie?.loadAnimation ||
      !container.isConnected ||
      elements.validationModalOverlay?.hidden
    ) {
      return;
    }

    validationSuccessAnimation = window.lottie.loadAnimation({
      container,
      renderer: "svg",
      loop: false,
      autoplay: true,
      path: validationSuccessAnimationPath,
    });
  }

  function hideValidationModalOverlay(callback) {
    const overlay = elements.validationModalOverlay;
    if (!(overlay instanceof HTMLElement)) {
      if (typeof callback === "function") {
        callback();
      }
      return;
    }

    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");

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
      if (event.target === overlay) {
        cleanup();
      }
    };

    overlay.addEventListener("transitionend", handleTransitionEnd);
    const exitTimer = window.setTimeout(cleanup, 300);
  }

  function closeValidationModal(result = false) {
    const resolver = validationModalResolve;
    validationModalResolve = null;
    clearValidationModalAutoCloseTimer();
    destroyValidationSuccessAnimation();

    hideValidationModalOverlay(() => {
      if (typeof resolver === "function") {
        resolver(Boolean(result));
      }
    });
  }

  function setValidationModalIcon(iconVariant) {
    if (!(elements.validationModalIcon instanceof HTMLElement)) {
      return;
    }

    elements.validationModalIcon.className = "validation-modal__icon";
    if (iconVariant === "success") {
      elements.validationModalIcon.classList.add("validation-modal__icon--success");
    } else if (iconVariant === "notice") {
      elements.validationModalIcon.classList.add("validation-modal__icon--notice");
    } else {
      elements.validationModalIcon.classList.add("validation-modal__icon--error");
      if (iconVariant === "delete") {
        elements.validationModalIcon.classList.add("validation-modal__icon--delete");
      }
    }

    elements.validationModalIcon.innerHTML =
      validationModalIcons[iconVariant] || validationModalIcons.error;
  }

  function showValidationModal(config = {}) {
    const overlay = elements.validationModalOverlay;
    const title = String(config.title || "").trim() || "Important Notice";
    const copy = String(config.copy || "").trim();
    const mode = String(config.mode || "notice").trim().toLowerCase();
    const iconVariant = String(config.iconVariant || mode).trim().toLowerCase();

    if (
      !(overlay instanceof HTMLElement) ||
      !(elements.validationModalTitle instanceof HTMLElement) ||
      !(elements.validationModalCopy instanceof HTMLElement) ||
      !(elements.validationModalActionButton instanceof HTMLButtonElement) ||
      !(elements.validationModalSecondaryActionButton instanceof HTMLButtonElement)
    ) {
      if (mode === "delete") {
        return Promise.resolve(window.confirm(copy || title));
      }
      return Promise.resolve(true);
    }

    if (typeof validationModalResolve === "function") {
      validationModalResolve(false);
      validationModalResolve = null;
    }

    clearValidationModalAutoCloseTimer();
    destroyValidationSuccessAnimation();

    elements.validationModalTitle.textContent = title;
    elements.validationModalCopy.textContent = copy;
    elements.validationModalCopy.hidden = !copy;

    setValidationModalIcon(iconVariant);

    const hideActions = config.hideActions === true;
    if (elements.validationModalActions instanceof HTMLElement) {
      elements.validationModalActions.hidden = hideActions;
    }

    elements.validationModalActionButton.textContent =
      String(config.actionLabel || "").trim() || "Continue";
    elements.validationModalSecondaryActionButton.textContent =
      String(config.secondaryActionLabel || "").trim() || "Cancel";
    elements.validationModalActionButton.classList.toggle(
      "validation-modal__action-button--danger",
      iconVariant === "delete",
    );
    elements.validationModalSecondaryActionButton.hidden =
      hideActions || config.hideSecondaryAction === true;
    elements.validationModalActionButton.hidden = hideActions;
    elements.validationModalActionButton.disabled = false;
    elements.validationModalSecondaryActionButton.disabled = false;

    if (elements.validationModalCloseButton instanceof HTMLButtonElement) {
      elements.validationModalCloseButton.hidden = config.hideClose === true;
    }

    overlay.hidden = false;
    overlay.setAttribute("aria-hidden", "false");
    window.requestAnimationFrame(() => {
      overlay.classList.add("is-open");
    });

    if (iconVariant === "success") {
      void playValidationSuccessAnimation();
    }

    const normalizedAutoCloseMs = Number(config.autoCloseMs);
    if (Number.isFinite(normalizedAutoCloseMs) && normalizedAutoCloseMs > 0) {
      validationModalAutoCloseTimer = window.setTimeout(() => {
        validationModalAutoCloseTimer = 0;
        closeValidationModal(true);
      }, normalizedAutoCloseMs);
    }

    window.requestAnimationFrame(() => {
      if (!elements.validationModalActionButton.hidden) {
        elements.validationModalActionButton.focus();
        return;
      }

      if (
        elements.validationModalCloseButton instanceof HTMLButtonElement &&
        !elements.validationModalCloseButton.hidden
      ) {
        elements.validationModalCloseButton.focus();
        return;
      }

      elements.validationModalDialog?.focus?.();
    });

    return new Promise((resolve) => {
      validationModalResolve = resolve;
    });
  }

  function showSuccessValidationModal(title, copy) {
    void showValidationModal({
      mode: "success",
      title,
      copy,
      hideActions: true,
      hideClose: true,
      autoCloseMs: 1800,
    });
  }

  function confirmDeleteValidationModal(title, copy) {
    return showValidationModal({
      mode: "delete",
      title,
      copy,
      actionLabel: "Delete",
      secondaryActionLabel: "Cancel",
      hideClose: false,
    });
  }

  function getCategoryTriggerButtons() {
    return elements.categoryNavTriggers.filter((button) => button instanceof HTMLElement);
  }

  function getStoreTypeTriggerButtons() {
    return elements.storeTypeNavTriggers.filter((button) => button instanceof HTMLElement);
  }

  function isEventWithinElement(event, element) {
    if (!(element instanceof HTMLElement) || !event) {
      return false;
    }

    if (typeof event.composedPath === "function") {
      const eventPath = event.composedPath();
      if (Array.isArray(eventPath) && eventPath.includes(element)) {
        return true;
      }
    }

    return event.target instanceof Node && element.contains(event.target);
  }

  function normalizeCategoryName(value, { preserveTrailingSpace = false } = {}) {
    const compactedValue = String(value ?? "")
      .replace(/\s+/g, " ")
      .replace(/^\s+/, "");

    if (!compactedValue) {
      return "";
    }

    const hasTrailingSpace = preserveTrailingSpace && /\s$/.test(compactedValue);
    const formattedCoreValue = hasTrailingSpace
      ? compactedValue.slice(0, -1)
      : compactedValue.trimEnd();

    return hasTrailingSpace ? `${formattedCoreValue} ` : formattedCoreValue;
  }

  function normalizeCategoryValues(values) {
    const rawValues = Array.isArray(values)
      ? values
      : values === null || values === undefined
        ? []
        : [values];
    const seen = new Set();
    const normalizedValues = [];

    for (const value of rawValues) {
      const normalizedCategory = normalizeCategoryName(value);
      const normalizedKey = normalizedCategory.toLowerCase();
      if (!normalizedCategory || seen.has(normalizedKey)) {
        continue;
      }

      seen.add(normalizedKey);
      normalizedValues.push(normalizedCategory);
    }

    return normalizedValues.sort((left, right) =>
      left.localeCompare(right, undefined, { sensitivity: "base" }),
    );
  }

  function normalizeStoreTypeValues(values) {
    const rawValues = Array.isArray(values)
      ? values
      : values === null || values === undefined
        ? []
        : [values];
    const seen = new Set();
    const normalizedValues = [];

    for (const value of rawValues) {
      const normalizedStoreType = normalizeCategoryName(value);
      const normalizedKey = normalizedStoreType.toLowerCase();
      if (!normalizedStoreType || seen.has(normalizedKey)) {
        continue;
      }

      seen.add(normalizedKey);
      normalizedValues.push(normalizedStoreType);
    }

    return normalizedValues.sort((left, right) =>
      left.localeCompare(right, undefined, { sensitivity: "base" }),
    );
  }

  function isSameCategoryName(left, right) {
    return normalizeCategoryName(left).toLowerCase() === normalizeCategoryName(right).toLowerCase();
  }

  function isSameStoreTypeName(left, right) {
    return normalizeCategoryName(left).toLowerCase() === normalizeCategoryName(right).toLowerCase();
  }

  function syncCategoryInputCasing(inputElement = elements.categoryNameInput) {
    if (!(inputElement instanceof HTMLInputElement)) {
      return;
    }

    const nextValue = normalizeCategoryName(inputElement.value, {
      preserveTrailingSpace: document.activeElement === inputElement,
    });
    if (inputElement.value !== nextValue) {
      inputElement.value = nextValue;
    }
  }

  function syncStoreTypeInputCasing(inputElement = elements.storeTypeNameInput) {
    if (!(inputElement instanceof HTMLInputElement)) {
      return;
    }

    const nextValue = normalizeCategoryName(inputElement.value, {
      preserveTrailingSpace: document.activeElement === inputElement,
    });
    if (inputElement.value !== nextValue) {
      inputElement.value = nextValue;
    }
  }

  function resetCategoryEditor({ clearInput = true } = {}) {
    state.editingCategoryName = "";
    if (elements.categoryInputLabel) {
      elements.categoryInputLabel.textContent = "Add Category";
    }
    if (elements.addCategoryButton) {
      elements.addCategoryButton.textContent = "Add";
    }
    if (elements.cancelCategoryEditButton) {
      elements.cancelCategoryEditButton.hidden = true;
    }
    if (clearInput && elements.categoryNameInput) {
      elements.categoryNameInput.value = "";
    }
    renderCategories(state.categories);
  }

  function resetStoreTypeEditor({ clearInput = true } = {}) {
    state.editingStoreTypeName = "";
    if (elements.storeTypeInputLabel) {
      elements.storeTypeInputLabel.textContent = "Add Store Type";
    }
    if (elements.addStoreTypeButton) {
      elements.addStoreTypeButton.textContent = "Add";
    }
    if (elements.cancelStoreTypeEditButton) {
      elements.cancelStoreTypeEditButton.hidden = true;
    }
    if (clearInput && elements.storeTypeNameInput) {
      elements.storeTypeNameInput.value = "";
    }
    renderStoreTypes(state.storeTypes);
  }

  function focusCategoryPanel(focusTarget = "panel") {
    if (!elements.categoryPanel) {
      return;
    }

    if (categoryDrawerFocusTimer) {
      window.clearTimeout(categoryDrawerFocusTimer);
    }

    categoryDrawerFocusTimer = window.setTimeout(() => {
      if (focusTarget === "add" && elements.categoryNameInput) {
        elements.categoryNameInput.focus();
        elements.categoryNameInput.select();
        return;
      }

      if (focusTarget === "view") {
        const firstCategoryAction = elements.categoryList?.querySelector(
          ".category-chip__main, .category-chip__edit, .category-chip__delete",
        );
        if (firstCategoryAction instanceof HTMLElement) {
          firstCategoryAction.focus();
          return;
        }
      }

      elements.categoryPanel.focus();
    }, focusTarget === "add" ? 220 : 180);
  }

  function focusStoreTypePanel(focusTarget = "panel") {
    if (!elements.storeTypePanel) {
      return;
    }

    if (storeTypeDrawerFocusTimer) {
      window.clearTimeout(storeTypeDrawerFocusTimer);
    }

    storeTypeDrawerFocusTimer = window.setTimeout(() => {
      if (focusTarget === "add" && elements.storeTypeNameInput) {
        elements.storeTypeNameInput.focus();
        elements.storeTypeNameInput.select();
        return;
      }

      if (focusTarget === "view") {
        const firstStoreTypeAction = elements.storeTypeList?.querySelector(
          ".category-chip__main, .category-chip__edit, .category-chip__delete",
        );
        if (firstStoreTypeAction instanceof HTMLElement) {
          firstStoreTypeAction.focus();
          return;
        }
      }

      elements.storeTypePanel.focus();
    }, focusTarget === "add" ? 220 : 180);
  }

  function setCategoryDrawerOpen(isOpen, options = {}) {
    if (!elements.categoryPanel) {
      return;
    }

    const { focusTarget = "panel", restoreFocus = false } = options;
    const nextIsOpen = Boolean(isOpen);

    if (nextIsOpen) {
      setStoreTypeDrawerOpen(false);
    }

    if (categoryDrawerCloseTimer) {
      window.clearTimeout(categoryDrawerCloseTimer);
      categoryDrawerCloseTimer = 0;
    }

    for (const button of getCategoryTriggerButtons()) {
      button.setAttribute("aria-expanded", nextIsOpen ? "true" : "false");
    }

    if (nextIsOpen) {
      elements.categoryPanel.hidden = false;
      elements.categoryPanel.setAttribute("aria-hidden", "false");
      elements.categoryPanel.classList.remove("is-closing");
      window.requestAnimationFrame(() => {
        elements.categoryPanel.classList.add("is-open");
      });
      focusCategoryPanel(focusTarget);
      if (!state.categories.length && !state.categoriesLoading) {
        void loadCategories({ quiet: true });
      }
      return;
    }

    elements.categoryPanel.classList.remove("is-open");
    elements.categoryPanel.classList.add("is-closing");
    elements.categoryPanel.setAttribute("aria-hidden", "true");

    if (categoryDrawerFocusTimer) {
      window.clearTimeout(categoryDrawerFocusTimer);
      categoryDrawerFocusTimer = 0;
    }

    categoryDrawerCloseTimer = window.setTimeout(() => {
      elements.categoryPanel.hidden = true;
      elements.categoryPanel.classList.remove("is-closing");
      categoryDrawerCloseTimer = 0;
      if (restoreFocus) {
        getCategoryTriggerButtons()[0]?.focus();
      }
    }, 240);
  }

  function setStoreTypeDrawerOpen(isOpen, options = {}) {
    if (!elements.storeTypePanel) {
      return;
    }

    const { focusTarget = "panel", restoreFocus = false } = options;
    const nextIsOpen = Boolean(isOpen);

    if (nextIsOpen) {
      setCategoryDrawerOpen(false);
    }

    if (storeTypeDrawerCloseTimer) {
      window.clearTimeout(storeTypeDrawerCloseTimer);
      storeTypeDrawerCloseTimer = 0;
    }

    for (const button of getStoreTypeTriggerButtons()) {
      button.setAttribute("aria-expanded", nextIsOpen ? "true" : "false");
    }

    if (nextIsOpen) {
      elements.storeTypePanel.hidden = false;
      elements.storeTypePanel.setAttribute("aria-hidden", "false");
      elements.storeTypePanel.classList.remove("is-closing");
      window.requestAnimationFrame(() => {
        elements.storeTypePanel.classList.add("is-open");
      });
      focusStoreTypePanel(focusTarget);
      if (!state.storeTypes.length && !state.storeTypesLoading) {
        void loadStoreTypes({ quiet: true });
      }
      return;
    }

    elements.storeTypePanel.classList.remove("is-open");
    elements.storeTypePanel.classList.add("is-closing");
    elements.storeTypePanel.setAttribute("aria-hidden", "true");

    if (storeTypeDrawerFocusTimer) {
      window.clearTimeout(storeTypeDrawerFocusTimer);
      storeTypeDrawerFocusTimer = 0;
    }

    storeTypeDrawerCloseTimer = window.setTimeout(() => {
      elements.storeTypePanel.hidden = true;
      elements.storeTypePanel.classList.remove("is-closing");
      storeTypeDrawerCloseTimer = 0;
      if (restoreFocus) {
        getStoreTypeTriggerButtons()[0]?.focus();
      }
    }, 240);
  }

  function isCategoryDrawerVisible() {
    return elements.categoryPanel instanceof HTMLElement && !elements.categoryPanel.hidden;
  }

  function isStoreTypeDrawerVisible() {
    return elements.storeTypePanel instanceof HTMLElement && !elements.storeTypePanel.hidden;
  }

  function getVisibleDrawerList() {
    if (isCategoryDrawerVisible()) {
      return elements.categoryList;
    }
    if (isStoreTypeDrawerVisible()) {
      return elements.storeTypeList;
    }
    return null;
  }

  function canScrollCategoryList(event) {
    const drawerList = getVisibleDrawerList();
    if (!(drawerList instanceof HTMLElement) || !(event instanceof WheelEvent)) {
      return false;
    }

    const deltaY = event.deltaY;
    if (!deltaY) {
      return false;
    }

    const maxScrollTop = drawerList.scrollHeight - drawerList.clientHeight;
    if (maxScrollTop <= 0) {
      return false;
    }

    return deltaY > 0
      ? drawerList.scrollTop < maxScrollTop
      : drawerList.scrollTop > 0;
  }

  function blockCategoryDrawerBackgroundScroll(event) {
    if (!isCategoryDrawerVisible() && !isStoreTypeDrawerVisible()) {
      return;
    }

    if (isEventWithinElement(event, getVisibleDrawerList()) && canScrollCategoryList(event)) {
      return;
    }

    event.preventDefault();
  }

  function blockCategoryDrawerBackgroundKeyScroll(event) {
    if (
      !isCategoryDrawerVisible()
      && !isStoreTypeDrawerVisible()
      || isEventWithinElement(event, elements.categoryPanel)
      || isEventWithinElement(event, elements.storeTypePanel)
      || !categoryDrawerScrollLockKeys.has(event.key)
    ) {
      return;
    }

    event.preventDefault();
  }

  function numberText(value) {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue.toLocaleString() : "0";
  }

  function moneyText(value) {
    const numberValue = Number(value);
    return Number.isFinite(numberValue)
      ? `\u20B1 ${numberValue.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
      : "\u20B1 0.00";
  }

  function formatDateTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "No date";
    }

    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function getProductImageUrl(product) {
    return [
      product?.cardImageUrl,
      product?.imageUrl,
      Array.isArray(product?.imageUrls) ? product.imageUrls[0] : "",
    ]
      .map((value) => String(value || "").trim())
      .find(Boolean) || "";
  }

  function getProductCompanyLabel(product) {
    return String(
      product?.companyName ||
        product?.storeName ||
        product?.businessName ||
        product?.adminId ||
        "Company",
    ).trim();
  }

  function getProductCompanyImageUrl(product) {
    return [
      product?.companyPictureUrl,
      product?.companyProfileImageUrl,
      product?.companyImageUrl,
      product?.companyLogoUrl,
      product?.storeLogoUrl,
      product?.profileImageUrl,
      product?.logoUrl,
    ]
      .map((value) => String(value || "").trim())
      .find(Boolean) || "";
  }

  function getProductCompanyInitials(product) {
    const companyName = getProductCompanyLabel(product);
    return companyName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "CO";
  }

  function getProductCategoryLabel(product) {
    const categories = Array.isArray(product?.categories)
      ? product.categories.map((category) => String(category || "").trim()).filter(Boolean)
      : [];
    const visibleCategories = categories.filter(
      (category) => category.toLowerCase() !== "food",
    );
    const fallbackCategory = String(product?.category || "").trim();
    if (
      fallbackCategory &&
      fallbackCategory.toLowerCase() !== "food" &&
      !visibleCategories.some(
        (category) => category.toLowerCase() === fallbackCategory.toLowerCase(),
      )
    ) {
      visibleCategories.push(fallbackCategory);
    }

    return visibleCategories.join(", ");
  }

  function getProductStock(product) {
    const stock = Number(product?.inventoryStock ?? product?.stock ?? 0);
    return Number.isFinite(stock) && stock >= 0 ? Math.trunc(stock) : 0;
  }

  function getProductRatingLabel(product) {
    const rating = Number(product?.rating ?? product?.productRating ?? 0);
    if (!Number.isFinite(rating) || rating <= 0) {
      return "New";
    }

    return rating.toFixed(1);
  }

  function setActiveSection(sectionName) {
    const nextSection = sectionNames.has(sectionName) ? sectionName : "companies";
    state.activeSection = nextSection;
    document.body.classList.toggle("super-admin-companies-active", nextSection === "companies");
    document.body.classList.toggle("super-admin-store-types-active", nextSection === "store-types");
    document.body.classList.toggle("super-admin-product-requests-active", nextSection === "product-requests");
    document.body.classList.toggle("super-admin-payment-partners-active", nextSection === "payment-partners");
    document.body.classList.toggle("super-admin-delivery-partners-active", nextSection === "delivery-partners");
    document.body.classList.toggle("super-admin-user-data-active", nextSection === "user-data");
    const nextHash = `#${nextSection}`;
    if (window.location.hash !== nextHash && window.history?.replaceState) {
      window.history.replaceState(null, "", nextHash);
    }

    for (const section of elements.sections) {
      section.hidden = section.dataset.superAdminSection !== nextSection;
    }

    for (const navItem of elements.sectionNavItems) {
      const isActive = navItem.dataset.superAdminSectionTarget === nextSection;
      navItem.classList.toggle("is-active", isActive);
      if (isActive) {
        navItem.setAttribute("aria-current", "page");
      } else {
        navItem.removeAttribute("aria-current");
      }
    }

    if (nextSection !== "companies") {
      closeCompanyDrawer();
    }
    if (!["payment-partners", "delivery-partners", "user-data"].includes(nextSection)) {
      closeIntegratedDrawers();
    }

    if (nextSection === "product-requests" && !state.productRequestsLoading) {
      void loadProductRequests({ quiet: true });
    }
    if (nextSection === "store-types" && !state.storeTypesLoading) {
      void loadStoreTypes({ quiet: true });
    }
    if (nextSection === "payment-partners" && !state.paymentPartnersLoading) {
      closeIntegratedDrawers();
      void loadIntegratedPartners("payment", { quiet: true });
    }
    if (nextSection === "delivery-partners" && !state.deliveryPartnersLoading) {
      closeIntegratedDrawers();
      void loadIntegratedPartners("delivery", { quiet: true });
    }
    if (nextSection === "user-data" && !state.userAccountsLoading) {
      closeIntegratedDrawers();
      void loadUserAccounts({ quiet: true });
    }
  }

  function getAdminCounts(admin) {
    const counts = admin?.counts || {};
    const rating = Number(counts.rating ?? admin?.rating ?? 0);
    const commentCount = Number(
      counts.commentCount ??
      counts.reviewCount ??
      admin?.commentCount ??
      admin?.reviewCount ??
      0,
    );
    return {
      products: Number(counts.products || 0),
      employees: Number(counts.employees || 0),
      orders: Number(counts.orders || 0),
      chats: Number(counts.chatThreads || 0),
      categories: Number(counts.categories || 0),
      followers: Number(admin?.followersCount || 0),
      rating: Number.isFinite(rating) && rating > 0 ? rating : 0,
      commentCount: Number.isFinite(commentCount) && commentCount > 0 ? Math.trunc(commentCount) : 0,
    };
  }

  async function fetchFollowersCountForAdmin(adminId) {
    try {
      const response = await fetch(`/api/super-admin/${encodeURIComponent(adminId)}/followers-count`);
      if (response.ok) {
        const data = await response.json();
        return data.followersCount || 0;
      }
    } catch (error) {
      console.error("Error fetching followers count:", error);
    }
    return 0;
  }

  async function loadFollowersCountForAdmins() {
    const adminIds = state.admins.map((admin) => String(admin?.adminId || admin?.id || "").trim()).filter(Boolean);
    const uniqueAdminIds = [...new Set(adminIds)];
    
    const followersPromises = uniqueAdminIds.map(async (adminId) => {
      const count = await fetchFollowersCountForAdmin(adminId);
      return { adminId, count };
    });
    
    const results = await Promise.all(followersPromises);
    const followersMap = {};
    results.forEach(({ adminId, count }) => {
      followersMap[adminId] = count;
    });
    
    // Update admins with followers count
    state.admins = state.admins.map((admin) => {
      const adminId = String(admin?.adminId || admin?.id || "").trim();
      return {
        ...admin,
        followersCount: followersMap[adminId] || 0,
      };
    });
  }

  function getCompanyName(admin) {
    return String(
      admin?.companyName || admin?.storeName || admin?.businessName || admin?.displayName || "Company",
    ).trim();
  }

  function getCompanyId(admin) {
    return String(admin?.adminId || admin?.id || "").trim();
  }

  function getAdminName(admin) {
    return String(admin?.displayName || [admin?.firstName, admin?.lastName].filter(Boolean).join(" ")).trim();
  }

  function getCompanyContactName(admin) {
    return [admin?.firstName, admin?.lastName]
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .join(" ") || getAdminName(admin) || "No name";
  }

  function getCompanyCreatedAt(admin) {
    return admin?.createdAt || admin?.created_at || admin?.registeredAt || admin?.dateCreated || "";
  }

  function findCompanyById(adminId) {
    const normalizedAdminId = String(adminId || "").trim();
    if (!normalizedAdminId) {
      return null;
    }
    return state.admins.find((admin) => getCompanyId(admin) === normalizedAdminId) || null;
  }

  function getCompanyImageUrl(admin) {
    return [
      admin?.profileImageUrl,
      admin?.avatarUrl,
      admin?.photoUrl,
      admin?.profilePhotoUrl,
      admin?.pictureUrl,
      admin?.imageUrl,
      admin?.logoUrl,
    ]
      .map((value) => String(value || "").trim())
      .find(Boolean) || "";
  }

  function getCompanyInitials(admin) {
    const companyName = getCompanyName(admin);
    return companyName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "CO";
  }

  function getCompanyToneIndex(admin) {
    const source = String(admin?.adminId || admin?.id || admin?.email || getCompanyName(admin));
    let hash = 0;
    for (const char of source) {
      hash = (hash + char.charCodeAt(0)) % 6;
    }
    return hash + 1;
  }

  function isCompanyAdminOnline(admin) {
    const statusToken = String(
      admin?.presenceStatus ??
        admin?.onlineStatus ??
        admin?.sessionStatus ??
        admin?.loginStatus ??
        admin?.status ??
        "",
    )
      .trim()
      .toLowerCase();

    return Boolean(
      admin?.isOnline === true ||
        admin?.online === true ||
        admin?.loggedIn === true ||
        admin?.isLoggedIn === true ||
        admin?.sessionActive === true ||
        statusToken === "online" ||
        statusToken === "logged-in" ||
        statusToken === "logged in" ||
        statusToken.includes("online"),
    );
  }

  function getCompanySearchText(admin) {
    const counts = getAdminCounts(admin);
    return [
      getCompanyName(admin),
      getAdminName(admin),
      admin?.email,
      admin?.adminId,
      admin?.id,
      admin?.mobileNumber,
      `${counts.followers} followers`,
      `${counts.rating.toFixed(1)} rating`,
      `${counts.commentCount} reviews`,
      `${counts.employees} employees`,
      `${counts.orders} orders`,
      `${counts.chats} chats`,
    ].map((value) => String(value || "").toLowerCase()).join(" ");
  }

  function matchesCompanyFilters(admin) {
    const counts = getAdminCounts(admin);
    const filters = state.companyFilters;

    if (filters.workspace === "with-products" && counts.products <= 0) {
      return false;
    }
    if (filters.workspace === "no-products" && counts.products > 0) {
      return false;
    }
    if (filters.workspace === "with-orders" && counts.orders <= 0) {
      return false;
    }
    if (filters.workspace === "with-chats" && counts.chats <= 0) {
      return false;
    }
    if (filters.team === "no-staff" && counts.employees > 0) {
      return false;
    }
    if (filters.team === "small" && (counts.employees < 1 || counts.employees > 10)) {
      return false;
    }
    if (filters.team === "growing" && counts.employees < 11) {
      return false;
    }
    if (filters.activity === "active" && counts.products + counts.orders + counts.chats <= 0) {
      return false;
    }
    if (filters.activity === "quiet" && counts.products + counts.orders + counts.chats > 0) {
      return false;
    }

    return true;
  }

  function getFilteredAdmins(admins = state.admins) {
    const searchTerm = state.companySearchTerm.trim().toLowerCase();
    return admins.filter((admin) => {
      if (searchTerm && !getCompanySearchText(admin).includes(searchTerm)) {
        return false;
      }
      return matchesCompanyFilters(admin);
    });
  }

  function sortAdmins(admins) {
    const sortedAdmins = [...admins];
    sortedAdmins.sort((left, right) => {
      const leftCounts = getAdminCounts(left);
      const rightCounts = getAdminCounts(right);
      if (state.companySort === "company-asc") {
        return getCompanyName(left).localeCompare(getCompanyName(right), undefined, {
          sensitivity: "base",
        });
      }
      if (state.companySort === "products-desc") {
        return rightCounts.products - leftCounts.products || getCompanyName(left).localeCompare(getCompanyName(right));
      }
      if (state.companySort === "employees-desc") {
        return rightCounts.employees - leftCounts.employees || getCompanyName(left).localeCompare(getCompanyName(right));
      }
      if (state.companySort === "orders-desc") {
        return rightCounts.orders - leftCounts.orders || getCompanyName(left).localeCompare(getCompanyName(right));
      }

      return String(right?.createdAt || "").localeCompare(String(left?.createdAt || ""));
    });
    return sortedAdmins;
  }

  function createCompanyMetaItem(iconPath, text) {
    const item = document.createElement("span");
    item.className = "super-admin-company-card__meta-item";
    item.innerHTML = `${createIconSvg(iconPath)}<span></span>`;
    item.querySelector("span").textContent = text;
    return item;
  }

  function createCompanyMetaLink(iconPath, text, href, label) {
    const item = document.createElement("a");
    item.className = "super-admin-company-card__meta-item super-admin-company-card__meta-item--link";
    item.href = href;
    item.setAttribute("aria-label", label || text);
    item.title = label || text;
    item.innerHTML = `${createIconSvg(iconPath)}<span></span>`;
    item.querySelector("span").textContent = text;
    return item;
  }

  function setCompanyLogoPlaceholder(logo) {
    logo.textContent = "";
    logo.innerHTML = createIconSvg(companyBuildingIconPaths);
  }

  function createCompanyTableHeader() {
    const header = document.createElement("div");
    header.className = "super-admin-company-table-header";
    header.setAttribute("role", "row");
    ["Company Info", "Details", "Day Created", "Rating / Reviews", "Actions"].forEach((label) => {
      const cell = document.createElement("span");
      cell.textContent = label;
      header.append(cell);
    });
    return header;
  }

  function getCompanyActionDefinitions(adminId) {
    const viewHref = `/superadmin_product.html?companyId=${encodeURIComponent(adminId)}`;
    return [
      {
        id: "view",
        label: "View",
        icon: '<path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"></path><circle cx="12" cy="12" r="2.6"></circle>',
        href: viewHref,
        adminId,
      },
      {
        id: "reports",
        label: "Reports",
        icon: '<path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"></path><path d="M14 2v5a1 1 0 0 0 1 1h5"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path>',
        adminId,
      },
      {
        id: "activity-logs",
        label: "Activity Logs",
        icon: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path><path d="M12 7v5l4 2"></path>',
        adminId,
      },
      {
        id: "notify",
        label: "Notify",
        icon: '<path d="M11 6a13 13 0 0 0 8.4-2.8A1 1 0 0 1 21 4v12a1 1 0 0 1-1.6.8A13 13 0 0 0 11 14H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"></path><path d="M6 14a12 12 0 0 0 2.4 7.2 2 2 0 0 0 3.2-2.4A8 8 0 0 1 10 14"></path><path d="M8 6v8"></path>',
        adminId,
        control: true,
      },
      {
        id: "deactivate",
        label: "Deactivate",
        icon: '<path d="M18.36 6.64A9 9 0 0 1 20.77 15"></path><path d="M6.16 6.16a9 9 0 1 0 12.68 12.68"></path><path d="M12 2v4"></path><path d="m2 2 20 20"></path>',
        adminId,
        control: true,
      },
      {
        id: "ban",
        label: "Banned",
        icon: '<circle cx="12" cy="12" r="10"></circle><path d="M4.929 4.929 19.07 19.071"></path>',
        adminId,
        control: true,
      },
      {
        id: "delete",
        label: "Delete",
        icon: '<path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path><path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>',
        danger: true,
        clearAdminId: adminId,
        adminId,
        control: true,
      },
    ];
  }

  function getCompanyControlActionDefinitions(adminId) {
    return getCompanyActionDefinitions(adminId).filter((action) => action.control === true);
  }

  function isCompanyControlAction(actionId) {
    return ["notify", "deactivate", "ban", "banned", "delete"].includes(
      String(actionId || "").trim().toLowerCase(),
    );
  }

  function createCompanyActionElement(action, options = {}) {
    const compact = options.compact === true;
    const actionElement = action.href ? document.createElement("a") : document.createElement("button");
    actionElement.className = compact
      ? `super-admin-company-card__quick-action${action.danger ? " super-admin-company-card__quick-action--danger" : ""}`
      : `super-admin-company-card__action-item${action.danger ? " super-admin-company-card__action-item--danger" : ""}`;
    if (action.href) {
      actionElement.href = action.href;
    } else {
      actionElement.type = "button";
    }
    actionElement.dataset.companyAction = action.id || action.label.toLowerCase().replace(/\s+/g, "-");
    if (action.adminId) {
      actionElement.dataset.companyId = action.adminId;
    }
    if (action.clearAdminId) {
      actionElement.dataset.clearAdminId = action.clearAdminId;
    }
    actionElement.setAttribute("aria-label", action.label);
    actionElement.title = action.label;
    if (!compact) {
      actionElement.setAttribute("role", "menuitem");
    }
    actionElement.innerHTML = compact
      ? createIconSvg(action.icon)
      : `${createIconSvg(action.icon)}<span></span>`;
    if (!compact) {
      actionElement.querySelector("span").textContent = action.label;
    }
    return actionElement;
  }

  function createCompanyQuickActions(adminId, companyName) {
    const quickActions = document.createElement("div");
    quickActions.className = "super-admin-company-card__quick-actions";
    quickActions.setAttribute("aria-label", `Quick actions for ${companyName}`);

    for (const action of getCompanyActionDefinitions(adminId)) {
      quickActions.append(createCompanyActionElement(action, { compact: true }));
    }

    return quickActions;
  }

  function createCompanyActionMenu(adminId, companyName, options = {}) {
    const dropdown = document.createElement("div");
    dropdown.className = "universal-dropdown super-admin-company-card__action-dropdown";
    if (options.contextMenu === true) {
      dropdown.classList.add("super-admin-company-card__context-actions");
    }

    const menuButton = document.createElement("button");
    menuButton.type = "button";
    menuButton.className = "super-admin-company-card__menu";
    menuButton.dataset.companyActionMenuToggle = "";
    menuButton.setAttribute("aria-haspopup", "menu");
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", `Company actions for ${companyName}`);
    menuButton.title = "Company actions";
    menuButton.innerHTML = createIconSvg(
      '<path d="M12 6.2h.01M12 12h.01M12 17.8h.01" stroke-linecap="round" stroke-width="3"></path>',
    );

    const actionMenu = document.createElement("div");
    actionMenu.className = "universal-dropdown__panel super-admin-company-card__action-menu";
    actionMenu.dataset.companyActionMenu = "";
    actionMenu.setAttribute("role", "menu");
    actionMenu.hidden = true;

    const actions = options.actions || getCompanyActionDefinitions(adminId);
    for (const action of actions) {
      actionMenu.append(createCompanyActionElement(action));
    }

    dropdown.append(menuButton, actionMenu);
    return dropdown;
  }

  function createCompanyDrawerDetailItem(iconPath, label, value, href = "") {
    const item = href ? document.createElement("a") : document.createElement("div");
    item.className = "super-admin-company-drawer__detail-item";
    if (href) {
      item.href = href;
    }
    item.innerHTML = `
      <span class="super-admin-company-drawer__detail-icon">${createIconSvg(iconPath)}</span>
      <span class="super-admin-company-drawer__detail-copy">
        <span class="super-admin-company-drawer__detail-label"></span>
        <span class="super-admin-company-drawer__detail-value"></span>
      </span>
    `;
    item.querySelector(".super-admin-company-drawer__detail-label").textContent = label;
    item.querySelector(".super-admin-company-drawer__detail-value").textContent = value;
    return item;
  }

  function renderCompanyDrawer(admin) {
    if (!elements.companyDrawer || !elements.companyDrawerContent) {
      return;
    }

    if (!admin) {
      elements.companyDrawerContent.innerHTML = "";
      return;
    }

    const adminId = getCompanyId(admin);
    const companyName = getCompanyName(admin);
    const counts = getAdminCounts(admin);
    const email = String(admin?.email || "No email").trim();
    const contactName = getCompanyContactName(admin);
    const companyImageUrl = getCompanyImageUrl(admin);
    const adminIsOnline = isCompanyAdminOnline(admin);
    const statusLabel = adminIsOnline ? "Online" : "Offline";
    const listingsHref = `/superadmin_product.html?companyId=${encodeURIComponent(adminId)}`;
    const createdAt = getCompanyCreatedAt(admin);

    elements.companyDrawerContent.innerHTML = "";

    const summary = document.createElement("div");
    summary.className = "super-admin-company-drawer__summary";

    const logo = document.createElement("span");
    logo.className = `super-admin-company-card__logo super-admin-company-drawer__logo super-admin-company-card__logo--tone-${getCompanyToneIndex(admin)}`;
    const statusDot = document.createElement("span");
    statusDot.className = "super-admin-company-card__avatar-status-dot super-admin-company-card__status-dot";
    statusDot.setAttribute("aria-label", statusLabel);
    statusDot.title = statusLabel;
    statusDot.classList.toggle("is-online", adminIsOnline);
    if (companyImageUrl) {
      const logoImage = document.createElement("img");
      logo.classList.add("has-image");
      logoImage.src = companyImageUrl;
      logoImage.alt = `${companyName} picture`;
      logoImage.loading = "lazy";
      logoImage.addEventListener("error", () => {
        logoImage.remove();
        logo.classList.remove("has-image");
        setCompanyLogoPlaceholder(logo);
        logo.append(statusDot);
      }, { once: true });
      logo.append(logoImage);
    } else {
      setCompanyLogoPlaceholder(logo);
    }
    logo.append(statusDot);

    const summaryCopy = document.createElement("div");
    summaryCopy.className = "super-admin-company-drawer__summary-copy";
    const summaryName = document.createElement("strong");
    summaryName.textContent = companyName;
    const summaryStatus = document.createElement("span");
    summaryStatus.textContent = statusLabel;
    summaryStatus.classList.toggle("is-online", adminIsOnline);
    summaryCopy.append(summaryName, summaryStatus);
    summary.append(logo, summaryCopy);

    const details = document.createElement("div");
    details.className = "super-admin-company-drawer__details";
    details.append(
      createCompanyDrawerDetailItem(companyCardIconPaths.email, "Email", email),
      createCompanyDrawerDetailItem(companyCardIconPaths.contact, "Admin", contactName),
      createCompanyDrawerDetailItem(
        companyCardIconPaths.listings,
        "Listings",
        `${numberText(counts.products)} listing${counts.products === 1 ? "" : "s"}`,
        listingsHref,
      ),
      createCompanyDrawerDetailItem(companyCardIconPaths.employees, "Employees", `${numberText(counts.employees)} employees`),
      createCompanyDrawerDetailItem(companyCardIconPaths.orders, "Orders", `${numberText(counts.orders)} orders`),
      createCompanyDrawerDetailItem(companyCardIconPaths.reviews, "Reviews", `${numberText(counts.commentCount)} reviews`),
      createCompanyDrawerDetailItem(
        companyCardIconPaths.rating,
        "Rating",
        `${counts.rating > 0 ? counts.rating.toFixed(1) : "0.0"} rating`,
      ),
      createCompanyDrawerDetailItem(companyCardIconPaths.listings, "Created", formatDateDay(createdAt)),
    );

    const actionsTitle = document.createElement("h4");
    actionsTitle.className = "super-admin-company-drawer__section-title";
    actionsTitle.textContent = "Actions";

    const actions = document.createElement("div");
    actions.className = "super-admin-company-drawer__actions";
    actions.setAttribute("role", "menu");
    for (const action of getCompanyActionDefinitions(adminId)) {
      actions.append(createCompanyActionElement(action));
    }

    elements.companyDrawerContent.append(summary, details, actionsTitle, actions);
  }

  function getSelectedCompanyIdSet() {
    if (state.selectedCompanyIds instanceof Set) {
      return state.selectedCompanyIds;
    }
    state.selectedCompanyIds = new Set();
    return state.selectedCompanyIds;
  }

  function getSelectedCompanyIds() {
    return Array.from(getSelectedCompanyIdSet()).filter((adminId) => Boolean(findCompanyById(adminId)));
  }

  function isCompanySelected(adminId) {
    const normalizedAdminId = String(adminId || "").trim();
    return Boolean(normalizedAdminId && getSelectedCompanyIdSet().has(normalizedAdminId));
  }

  function setSelectedCompanies(adminIds = [], options = {}) {
    const nextSelectedIds = new Set(
      (Array.isArray(adminIds) ? adminIds : [adminIds])
        .map((adminId) => String(adminId || "").trim())
        .filter(Boolean),
    );
    state.selectedCompanyIds = nextSelectedIds;

    if (options.activeCompanyId !== undefined) {
      state.selectedCompanyId = String(options.activeCompanyId || "").trim();
    } else if (nextSelectedIds.size === 1) {
      state.selectedCompanyId = Array.from(nextSelectedIds)[0] || "";
    } else {
      state.selectedCompanyId = "";
    }

    syncCompanyCardSelection();
  }

  function toggleCompanySelection(adminId) {
    const normalizedAdminId = String(adminId || "").trim();
    if (!normalizedAdminId) {
      return;
    }

    const selectedIds = new Set(getSelectedCompanyIdSet());
    if (selectedIds.has(normalizedAdminId)) {
      selectedIds.delete(normalizedAdminId);
    } else {
      selectedIds.add(normalizedAdminId);
    }

    if (elements.companyDrawer && !elements.companyDrawer.hidden) {
      closeCompanyDrawer({ clearSelection: false });
    }

    setSelectedCompanies(Array.from(selectedIds), {
      activeCompanyId: selectedIds.size === 1 ? Array.from(selectedIds)[0] : "",
    });
  }

  function isCompanySelectionClickTarget(target) {
    if (!(target instanceof Element)) {
      return false;
    }

    return Boolean(
      target.closest(".super-admin-company-card") ||
        target.closest(".super-admin-company-drawer") ||
        target.closest(".super-admin-company-drawer-backdrop") ||
        target.closest(".super-admin-company-card__action-menu") ||
        target.closest(".super-admin-company-card__action-dropdown"),
    );
  }

  function clearCompanySelectionFromOutsideClick(event) {
    if (!getSelectedCompanyIdSet().size || isCompanySelectionClickTarget(event?.target)) {
      return;
    }

    setSelectedCompanies([]);
    closeCompanyActionMenus();
  }

  function syncCompanyActionItemsForSelection(container, adminId) {
    if (!(container instanceof HTMLElement)) {
      return;
    }

    const shouldShowControlsOnly = getCompanyActionTargetIds(adminId).length > 1;
    const actionItems = Array.from(container.querySelectorAll("[data-company-action]"));
    for (const item of actionItems) {
      if (!(item instanceof HTMLElement)) {
        continue;
      }
      item.hidden = shouldShowControlsOnly && !isCompanyControlAction(item.dataset.companyAction);
    }
  }

  function syncCompanyCardSelection() {
    const selectedIds = getSelectedCompanyIdSet();
    const cards = Array.from(elements.list?.querySelectorAll(".super-admin-company-card") || []);
    for (const card of cards) {
      const isSelected = selectedIds.has(String(card.dataset.companyId || "").trim());
      card.classList.toggle("is-selected", isSelected);
      card.setAttribute("aria-pressed", isSelected ? "true" : "false");
      card.setAttribute("aria-selected", isSelected ? "true" : "false");
      syncCompanyActionItemsForSelection(card, card.dataset.companyId);
    }
  }

  function openCompanyDrawer(adminId) {
    const admin = findCompanyById(adminId);
    if (!admin || !elements.companyDrawer) {
      return;
    }

    setSelectedCompanies([getCompanyId(admin)], { activeCompanyId: getCompanyId(admin) });
    renderCompanyDrawer(admin);
    elements.companyDrawer.hidden = false;
    if (elements.companyDrawerBackdrop) {
      elements.companyDrawerBackdrop.hidden = false;
    }
    document.body.classList.add("super-admin-company-drawer-open");
    syncCompanyCardSelection();
  }

  function closeCompanyDrawer(options = {}) {
    if (options.clearSelection !== false) {
      setSelectedCompanies([]);
    } else {
      state.selectedCompanyId = "";
    }
    renderCompanyDrawer(null);
    if (elements.companyDrawer) {
      elements.companyDrawer.hidden = true;
    }
    if (elements.companyDrawerBackdrop) {
      elements.companyDrawerBackdrop.hidden = true;
    }
    document.body.classList.remove("super-admin-company-drawer-open");
    syncCompanyCardSelection();
  }

  function createCompanyCard(admin) {
    const card = document.createElement("article");
    card.className = "super-admin-company-card";
    const companyName = getCompanyName(admin);
    const adminId = getCompanyId(admin);
    const counts = getAdminCounts(admin);
    const email = String(admin?.email || "No email").trim();
    const contactName = getCompanyContactName(admin);
    const companyImageUrl = getCompanyImageUrl(admin);
    const adminIsOnline = isCompanyAdminOnline(admin);
    const statusLabel = adminIsOnline ? "Online" : "Offline";
    const isGridCard = state.companyView !== "list";
    const isSelected = isCompanySelected(adminId);
    card.dataset.companyId = adminId;
    if (isGridCard) {
      card.tabIndex = 0;
      card.setAttribute("role", "button");
      card.setAttribute("aria-label", `Open details for ${companyName}`);
      card.setAttribute("aria-haspopup", "menu");
      card.setAttribute("aria-keyshortcuts", "Enter Space Shift+F10");
      card.setAttribute("aria-pressed", isSelected ? "true" : "false");
      card.classList.toggle("is-selected", isSelected);
    }

    const header = document.createElement("div");
    header.className = "super-admin-company-card__header";

    const logo = document.createElement("span");
    logo.className = `super-admin-company-card__logo super-admin-company-card__logo--tone-${getCompanyToneIndex(admin)}`;
    const listStatusDot = document.createElement("span");
    listStatusDot.className = "super-admin-company-card__avatar-status-dot super-admin-company-card__status-dot";
    listStatusDot.setAttribute("aria-label", statusLabel);
    listStatusDot.title = statusLabel;
    listStatusDot.classList.toggle("is-online", adminIsOnline);
    if (companyImageUrl) {
      const logoImage = document.createElement("img");
      logo.classList.add("has-image");
      logoImage.src = companyImageUrl;
      logoImage.alt = `${companyName} picture`;
      logoImage.loading = "lazy";
      logoImage.addEventListener("error", () => {
        logoImage.remove();
        logo.classList.remove("has-image");
        setCompanyLogoPlaceholder(logo);
        logo.append(listStatusDot);
      }, { once: true });
      logo.append(logoImage);
    } else {
      setCompanyLogoPlaceholder(logo);
    }

    logo.append(listStatusDot);

    const titleWrap = document.createElement("div");
    titleWrap.className = "super-admin-company-card__title";

    const gridStatusDot = document.createElement("span");
    gridStatusDot.className = "super-admin-company-card__grid-status-dot super-admin-company-card__status-dot";
    gridStatusDot.setAttribute("aria-label", statusLabel);
    gridStatusDot.title = statusLabel;
    gridStatusDot.classList.toggle("is-online", adminIsOnline);

    const titleElement = document.createElement("h3");
    titleElement.className = "super-admin-company-card__title-text";
    titleElement.textContent = companyName;

    const titleContainer = document.createElement("span");
    titleContainer.className = "super-admin-company-card__title-container";
    titleContainer.append(gridStatusDot, titleElement);

    if (isGridCard) {
      const statusText = document.createElement("span");
      statusText.className = "super-admin-company-card__grid-status-text";
      statusText.textContent = statusLabel;
      statusText.classList.toggle("is-online", adminIsOnline);
      titleWrap.append(titleContainer, statusText);
    } else {
      const followers = document.createElement("p");
      followers.innerHTML = `
        <span class="super-admin-company-card__title-metric">
          ${createIconSvg(companyCardIconPaths.followers)}
          <span data-company-followers></span>
        </span>
        <span class="super-admin-company-card__title-metric super-admin-company-card__title-metric--rating">
          ${createIconSvg(companyCardIconPaths.rating)}
          <span data-company-rating></span>
        </span>
      `;
      followers.querySelector("[data-company-followers]").textContent = `${numberText(counts.followers)} followers`;
      followers.querySelector("[data-company-rating]").textContent =
        `${counts.rating > 0 ? counts.rating.toFixed(1) : "0.0"} rating`;
      titleWrap.append(titleContainer, followers);
    }

    header.append(logo, titleWrap);

    if (isGridCard) {
      const contextActions = createCompanyActionMenu(adminId, companyName, {
        contextMenu: true,
      });
      card.append(header, contextActions);
      return card;
    }

    const actionDropdown = createCompanyActionMenu(adminId, companyName);
    const actionCell = document.createElement("div");
    actionCell.className = "super-admin-company-card__actions-cell";
    actionCell.append(createCompanyQuickActions(adminId, companyName), actionDropdown);

    const meta = document.createElement("div");
    meta.className = "super-admin-company-card__meta";
    const reviewsMetaItem = createCompanyMetaItem(companyCardIconPaths.reviews, `${numberText(counts.commentCount)} reviews`);
    reviewsMetaItem.classList.add("super-admin-company-card__meta-item--reviews");
    meta.append(
      createCompanyMetaItem(companyCardIconPaths.email, email),
      createCompanyMetaItem(companyCardIconPaths.contact, contactName),
      createCompanyMetaLink(companyCardIconPaths.listings, `${numberText(counts.products)} listing${counts.products === 1 ? "" : "s"}`, `/superadmin_product.html?companyId=${encodeURIComponent(adminId)}`, `View listings for ${companyName}`),
      createCompanyMetaItem(companyCardIconPaths.employees, `${numberText(counts.employees)} employees`),
      createCompanyMetaItem(companyCardIconPaths.orders, `${numberText(counts.orders)} orders`),
      reviewsMetaItem,
    );

    const createdCell = document.createElement("div");
    createdCell.className = "super-admin-company-card__table-created";
    const createdAt = getCompanyCreatedAt(admin);
    createdCell.textContent = formatDateDay(createdAt);
    createdCell.title = formatDateTime(createdAt);

    const ratingCell = document.createElement("div");
    ratingCell.className = "super-admin-company-card__table-rating";
    ratingCell.innerHTML = `
      <span class="super-admin-company-card__table-rating-item super-admin-company-card__table-rating-item--rating">
        ${createIconSvg(companyCardIconPaths.rating)}
        <span data-table-rating></span>
      </span>
      <span class="super-admin-company-card__table-rating-item">
        ${createIconSvg(companyCardIconPaths.reviews)}
        <span data-table-reviews></span>
      </span>
    `;
    ratingCell.querySelector("[data-table-rating]").textContent =
      `${counts.rating > 0 ? counts.rating.toFixed(1) : "0.0"} rating`;
    ratingCell.querySelector("[data-table-reviews]").textContent = `${numberText(counts.commentCount)} reviews`;

    card.append(header, meta, createdCell, ratingCell, actionCell);
    return card;
  }

  function syncProductRequestCount(totalCount = state.productRequests.length, visibleCount = totalCount) {
    const count = Number(totalCount) || 0;
    const visible = Number(visibleCount) || 0;
    if (elements.productRequestTotal) {
      elements.productRequestTotal.textContent = `(${numberText(visible)})`;
    }
    if (elements.productRequestCount) {
      elements.productRequestCount.textContent = numberText(count);
      elements.productRequestCount.hidden = count <= 0;
    }
    updateNotificationCount(count);
    renderNotificationPanel();
  }

  function getProductRequestSearchText(product) {
    return [
      product?.name,
      product?.category,
      Array.isArray(product?.categories) ? product.categories.join(" ") : "",
      getProductCompanyLabel(product),
      product?.description,
      product?.sku,
      product?.id,
      moneyText(product?.salesPrice ?? product?.originalPrice ?? product?.price),
      getProductReviewCount(product),
      getProductRatingDetailLabel(product),
      getProductCreatedDayLabel(product),
    ]
      .map((value) => String(value || "").trim().toLowerCase())
      .filter(Boolean)
      .join(" ");
  }

  function getProductRequestFilterLabel(value) {
    const filterLabels = {
      all: "All",
      "with-category": "With category",
      "no-category": "No category",
      discounted: "Discounted",
    };
    return filterLabels[value] || filterLabels.all;
  }

  function syncProductRequestFilterSummary() {
    if (elements.productRequestFilterSummary) {
      elements.productRequestFilterSummary.textContent = getProductRequestFilterLabel(state.productRequestFilter);
    }
  }

  function getProductRequestFilterValue(product) {
    const categoryLabel = getProductCategoryLabel(product);
    const salesPrice = Number(product?.salesPrice);
    const originalPrice = Number(product?.originalPrice ?? product?.price);
    const hasDiscount =
      Number.isFinite(salesPrice) &&
      salesPrice >= 0 &&
      Number.isFinite(originalPrice) &&
      originalPrice > 0 &&
      salesPrice < originalPrice;

    return {
      hasCategory: Boolean(categoryLabel),
      hasDiscount,
    };
  }

  function matchesProductRequestFilter(product) {
    const filter = state.productRequestFilter || "all";
    if (filter === "all") {
      return true;
    }

    const productFilter = getProductRequestFilterValue(product);
    if (filter === "with-category") {
      return productFilter.hasCategory;
    }
    if (filter === "no-category") {
      return !productFilter.hasCategory;
    }
    if (filter === "discounted") {
      return productFilter.hasDiscount;
    }
    return true;
  }

  function getFilteredProductRequests(requests = state.productRequests) {
    const searchTerm = state.productRequestSearchTerm.trim().toLowerCase();
    return requests.filter((product) => {
      if (!matchesProductRequestFilter(product)) {
        return false;
      }
      if (!searchTerm) {
        return true;
      }
      return getProductRequestSearchText(product).includes(searchTerm);
    });
  }

  function setProductRequestMenuOpen(actions, isOpen) {
    if (!(actions instanceof HTMLElement)) {
      return;
    }

    const menu = actions.querySelector("[data-product-request-menu]");
    const toggle = actions.querySelector("[data-product-request-menu-toggle]");
    actions.classList.toggle("is-open", Boolean(isOpen));
    if (menu instanceof HTMLElement) {
      menu.hidden = !isOpen;
    }
    if (toggle instanceof HTMLButtonElement) {
      toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    }
  }

  function closeProductRequestMenus(exceptActions = null) {
    const actionGroups = Array.from(
      elements.productRequestList?.querySelectorAll(".super-admin-product-request-card__actions") || [],
    );
    for (const actions of actionGroups) {
      if (actions === exceptActions) {
        continue;
      }
      setProductRequestMenuOpen(actions, false);
    }
  }

  let activeCompanyPopoverCard = null;
  let companyPopoverCloseTimer = 0;

  function clearCompanyPopoverCloseTimer() {
    if (!companyPopoverCloseTimer) {
      return;
    }
    window.clearTimeout(companyPopoverCloseTimer);
    companyPopoverCloseTimer = 0;
  }

  function setCompanyPopoverCardOpen(card, isOpen) {
    if (!(card instanceof HTMLElement)) {
      return;
    }
    card.classList.toggle("is-company-popover-open", Boolean(isOpen));
  }

  function openCompanyPopoverForCard(card) {
    if (!(card instanceof HTMLElement)) {
      return;
    }
    clearCompanyPopoverCloseTimer();
    if (activeCompanyPopoverCard && activeCompanyPopoverCard !== card) {
      setCompanyPopoverCardOpen(activeCompanyPopoverCard, false);
    }
    activeCompanyPopoverCard = card;
    setCompanyPopoverCardOpen(card, true);
  }

  function scheduleCompanyPopoverClose(card) {
    if (!(card instanceof HTMLElement)) {
      return;
    }
    clearCompanyPopoverCloseTimer();
    companyPopoverCloseTimer = window.setTimeout(() => {
      if (activeCompanyPopoverCard === card) {
        setCompanyPopoverCardOpen(card, false);
        activeCompanyPopoverCard = null;
      }
      companyPopoverCloseTimer = 0;
    }, 500);
  }

  function getProductCompanyAdmin(product) {
    const productAdminId = String(product?.adminId || product?.ownerAdminId || product?.companyId || "").trim();
    if (!productAdminId) {
      return null;
    }
    return state.admins.find((admin) => {
      const adminIds = [
        admin?.adminId,
        admin?.id,
        admin?.tenantId,
        admin?.workspaceId,
      ].map((value) => String(value || "").trim()).filter(Boolean);
      return adminIds.includes(productAdminId);
    }) || null;
  }

  function getProductCompanyPreviewCounts(product, companyAdmin = getProductCompanyAdmin(product)) {
    if (companyAdmin) {
      return getAdminCounts(companyAdmin);
    }
    const rating = Number(product?.companyRating ?? product?.sellerRating ?? product?.storeRating ?? 0);
    const followers = Number(
      product?.followersCount ??
        product?.companyFollowersCount ??
        product?.sellerFollowersCount ??
        0,
    );
    return {
      followers: Number.isFinite(followers) && followers > 0 ? Math.trunc(followers) : 0,
      rating: Number.isFinite(rating) && rating > 0 ? rating : 0,
    };
  }

  function getProductCompanyToneIndex(product, companyAdmin = getProductCompanyAdmin(product)) {
    if (companyAdmin) {
      return getCompanyToneIndex(companyAdmin);
    }
    const source = String(product?.adminId || product?.companyName || product?.storeName || product?.businessName || "Company");
    let hash = 0;
    for (const char of source) {
      hash = (hash + char.charCodeAt(0)) % 6;
    }
    return hash + 1;
  }

  function getProductReviewCount(product) {
    const reviewCount = Number(
      product?.commentCount ??
        product?.reviewCount ??
        product?.reviewsCount ??
        product?.ratingCount ??
        product?.ratingsCount ??
        (Array.isArray(product?.reviews) ? product.reviews.length : 0),
    );
    return Number.isFinite(reviewCount) && reviewCount > 0 ? Math.trunc(reviewCount) : 0;
  }

  function getProductRatingDetailLabel(product) {
    const rating = Number(product?.rating ?? product?.productRating ?? 0);
    return `${Number.isFinite(rating) && rating > 0 ? rating.toFixed(1) : "0.0"} rating`;
  }

  function formatDateDay(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "No date";
    }

    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function getProductCreatedDayLabel(product) {
    return formatDateDay(product?.createdAt || product?.submittedAt || product?.updatedAt);
  }

  function normalizeProductActorRole(value) {
    const text = String(value || "").trim().toLowerCase();
    if (!text) {
      return "";
    }
    if (text.includes("employee")) {
      return "Employee";
    }
    if (text.includes("admin") || text.includes("root") || text.includes("super")) {
      return "Admin";
    }
    return "";
  }

  function getProductModifiedLabel(product) {
    const updatedDate = new Date(product?.updatedAt || product?.approvalUpdatedAt || "");
    const createdDate = new Date(product?.createdAt || product?.submittedAt || "");
    const hasUpdatedDate = !Number.isNaN(updatedDate.getTime());
    const hasCreatedDate = !Number.isNaN(createdDate.getTime());
    const isModified = hasUpdatedDate && (!hasCreatedDate || updatedDate.getTime() - createdDate.getTime() > 1000);
    const role =
      normalizeProductActorRole(
        product?.modifiedByRole ??
          product?.updatedByRole ??
          product?.lastModifiedByRole ??
          product?.submittedByRole ??
          product?.createdByRole,
      ) ||
      normalizeProductActorRole(
        product?.modifiedBy ??
          product?.updatedBy ??
          product?.lastModifiedBy ??
          product?.submittedBy ??
          product?.createdBy,
      );
    const actionLabel = isModified ? "Modified" : "Submitted";
    return `${actionLabel} by ${role || "Admin"}`;
  }

  function createProductRequestCard(product) {
    const card = document.createElement("article");
    card.className = "super-admin-product-request-card";
    card.dataset.productId = String(product?.id || "").trim();

    const imageUrl = getProductImageUrl(product);
    const companyName = getProductCompanyLabel(product);
    const productName = String(product?.name || "Unnamed product").trim();
    const categoryLabel = getProductCategoryLabel(product);
    const rawSalesPrice = product?.salesPrice;
    const salesPrice =
      rawSalesPrice === null || rawSalesPrice === undefined || rawSalesPrice === ""
        ? NaN
        : Number(rawSalesPrice);
    const originalPrice = Number(product?.originalPrice ?? product?.price);
    const hasOriginalPrice =
      Number.isFinite(salesPrice) &&
      salesPrice >= 0 &&
      Number.isFinite(originalPrice) &&
      originalPrice > 0 &&
      salesPrice < originalPrice;
    const displayPrice =
      Number.isFinite(salesPrice) && salesPrice >= 0
        ? salesPrice
        : product?.originalPrice ?? product?.price;
    const priceLabel = moneyText(hasOriginalPrice ? salesPrice : displayPrice);
    const originalPriceLabel = hasOriginalPrice ? moneyText(originalPrice) : "";
    const ratingLabel = getProductRatingDetailLabel(product);
    const reviewCount = getProductReviewCount(product);
    const reviewsLabel = `${numberText(reviewCount)} review${reviewCount === 1 ? "" : "s"}`;
    const submittedAt = product?.submittedAt || product?.createdAt || "";
    const createdAt = product?.createdAt || submittedAt || product?.updatedAt || "";
    const updatedAt = product?.updatedAt || product?.approvalUpdatedAt || submittedAt || "";
    const createdDayLabel = getProductCreatedDayLabel(product);
    const modifiedLabel = getProductModifiedLabel(product);
    const companyAdmin = getProductCompanyAdmin(product);
    const companyCounts = getProductCompanyPreviewCounts(product, companyAdmin);
    const companyIsOnline = companyAdmin ? isCompanyAdminOnline(companyAdmin) : false;
    const companyStatusLabel = companyIsOnline ? "Online" : "Offline";
    const companyImageUrl = getProductCompanyImageUrl(product);

    const topbar = document.createElement("div");
    topbar.className = "super-admin-product-request-card__topbar super-admin-product-request-card__topbar--menu-only";

    const actionGroup = document.createElement("div");
    actionGroup.className = "super-admin-product-request-card__actions";

    const menuButton = document.createElement("button");
    menuButton.type = "button";
    menuButton.className = "super-admin-product-request-card__menu-button";
    menuButton.dataset.productRequestMenuToggle = "";
    menuButton.setAttribute("aria-haspopup", "menu");
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", `Review actions for ${productName}`);
    menuButton.title = "Review actions";
    menuButton.innerHTML = `
      <span aria-hidden="true">&#8942;</span>
      <span class="visually-hidden">Review actions</span>
    `;

    const actionMenu = document.createElement("div");
    actionMenu.className = "super-admin-product-request-card__menu";
    actionMenu.dataset.productRequestMenu = "";
    actionMenu.setAttribute("role", "menu");
    actionMenu.hidden = true;
    actionMenu.innerHTML = `
      <button
        type="button"
        class="super-admin-product-request-card__menu-item super-admin-product-request-card__menu-item--danger"
        data-product-request-action="cancel"
        data-product-id=""
        role="menuitem"
      >
        Cancel
      </button>
      <button
        type="button"
        class="super-admin-product-request-card__menu-item"
        data-product-request-action="approve"
        data-product-id=""
        role="menuitem"
      >
        Approve
      </button>
    `;
    for (const actionButton of actionMenu.querySelectorAll("[data-product-id]")) {
      actionButton.dataset.productId = String(product?.id || "").trim();
    }
    actionGroup.append(menuButton, actionMenu);
    topbar.append(actionGroup);

    const media = document.createElement("div");
    media.className = "super-admin-product-request-card__media";
    if (imageUrl) {
      const image = document.createElement("img");
      image.src = imageUrl;
      image.alt = productName;
      image.loading = "lazy";
      media.append(image);
    } else {
      media.innerHTML = createIconSvg(
        '<path d="M5 7.5h14v9H5z" stroke-linejoin="round"></path><path d="m7.5 15 3.5-3.6 2.2 2.2 1.4-1.5 2 2.9" stroke-linecap="round" stroke-linejoin="round"></path><path d="M8.5 9.2h.01" stroke-linecap="round" stroke-width="3"></path>',
      );
    }

    const body = document.createElement("div");
    body.className = "super-admin-product-request-card__body";
    body.innerHTML = `
      <div class="super-admin-product-request-card__main">
        <h3></h3>
        <div class="super-admin-product-request-card__details">
          <span class="super-admin-company-card__meta-item">
            ${createIconSvg(companyCardIconPaths.listings)}
            <span data-request-detail-category></span>
          </span>
          <span class="universal-dropdown super-admin-company-card__meta-item super-admin-product-request-card__company-detail">
            ${createIconSvg(companyBuildingIconPaths)}
            <span class="super-admin-product-request-card__company-name-trigger" data-request-detail-company tabindex="0"></span>
            <span class="universal-dropdown__panel super-admin-product-request-card__company-popover" role="tooltip">
              <span class="super-admin-product-request-card__company-preview">
                <span class="super-admin-product-request-card__company-preview-logo super-admin-company-card__logo" data-request-company-preview-logo></span>
                <span class="super-admin-product-request-card__company-preview-name-row">
                  <span class="super-admin-company-card__grid-status-dot super-admin-company-card__status-dot" data-request-company-preview-status></span>
                  <span class="super-admin-product-request-card__company-preview-name" data-request-company-preview-name></span>
                </span>
                <span class="super-admin-product-request-card__company-preview-metrics">
                  <span class="super-admin-company-card__title-metric">
                    ${createIconSvg(companyCardIconPaths.followers)}
                    <span data-request-company-preview-followers></span>
                  </span>
                  <span class="super-admin-company-card__title-metric super-admin-company-card__title-metric--rating">
                    ${createIconSvg(companyCardIconPaths.rating)}
                    <span data-request-company-preview-rating></span>
                  </span>
                </span>
              </span>
            </span>
          </span>
          <span class="super-admin-company-card__meta-item super-admin-product-request-card__price-detail">
            ${createIconSvg('<path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82Z"></path><path d="M7 7h.01" stroke-linecap="round" stroke-width="3"></path>')}
            <span class="super-admin-product-request-card__price-row">
              <span class="super-admin-product-request-card__price" data-request-price></span>
              <span class="super-admin-product-request-card__original-price" data-request-original-price hidden></span>
            </span>
          </span>
          <span class="super-admin-company-card__meta-item">
            ${createIconSvg(companyCardIconPaths.rating)}
            <span data-request-rating></span>
          </span>
          <span class="super-admin-company-card__meta-item">
            ${createIconSvg(companyCardIconPaths.reviews)}
            <span data-request-reviews></span>
          </span>
          <span class="super-admin-company-card__meta-item" data-request-created-at>
            ${createIconSvg('<path d="M8 2v4"></path><path d="M16 2v4"></path><rect width="18" height="18" x="3" y="4" rx="2"></rect><path d="M3 10h18"></path>')}
            <span data-request-created-day></span>
          </span>
          <span class="super-admin-company-card__meta-item" data-request-updated-at>
            ${createIconSvg('<path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path>')}
            <span data-request-modified></span>
          </span>
        </div>
      </div>
    `;
    body.querySelector("h3").textContent = productName;
    body.querySelector("[data-request-detail-category]").textContent = categoryLabel || "No category";
    body.querySelector("[data-request-detail-company]").textContent = companyName || "Company";
    body.querySelector("[data-request-price]").textContent = priceLabel;
    const originalPriceElement = body.querySelector("[data-request-original-price]");
    if (originalPriceElement) {
      originalPriceElement.textContent = originalPriceLabel;
      originalPriceElement.hidden = !originalPriceLabel;
    }
    body.querySelector("[data-request-rating]").textContent = ratingLabel;
    body.querySelector("[data-request-reviews]").textContent = reviewsLabel;
    body.querySelector("[data-request-created-day]").textContent = `Created ${createdDayLabel}`;
    body.querySelector("[data-request-modified]").textContent = modifiedLabel;
    body.querySelector("[data-request-created-at]").title = formatDateTime(createdAt);
    body.querySelector("[data-request-updated-at]").title = formatDateTime(updatedAt);
    const companyPreviewStatus = body.querySelector("[data-request-company-preview-status]");
    if (companyPreviewStatus) {
      companyPreviewStatus.setAttribute("aria-label", companyStatusLabel);
      companyPreviewStatus.title = companyStatusLabel;
      companyPreviewStatus.classList.toggle("is-online", companyIsOnline);
    }
    body.querySelector("[data-request-company-preview-name]").textContent = companyName || "Company";
    body.querySelector("[data-request-company-preview-followers]").textContent =
      `${numberText(companyCounts.followers)} followers`;
    body.querySelector("[data-request-company-preview-rating]").textContent =
      `${companyCounts.rating > 0 ? companyCounts.rating.toFixed(1) : "0.0"} rating`;
    const companyPreviewLogo = body.querySelector("[data-request-company-preview-logo]");
    if (companyPreviewLogo) {
      companyPreviewLogo.classList.add(`super-admin-company-card__logo--tone-${getProductCompanyToneIndex(product, companyAdmin)}`);
      if (companyImageUrl) {
        const companyImage = document.createElement("img");
        companyImage.src = companyImageUrl;
        companyImage.alt = `${companyName} company logo`;
        companyImage.loading = "lazy";
        companyImage.addEventListener("error", () => {
          companyImage.remove();
          companyPreviewLogo.classList.remove("has-image");
          setCompanyLogoPlaceholder(companyPreviewLogo);
        });
        companyPreviewLogo.classList.add("has-image");
        companyPreviewLogo.append(companyImage);
      } else {
        setCompanyLogoPlaceholder(companyPreviewLogo);
      }
    }

    card.append(topbar, media, body);
    return card;
  }

  function renderProductRequests(products = state.productRequests) {
    const requests = Array.isArray(products) ? products : [];
    state.productRequests = requests;
    const filteredRequests = getFilteredProductRequests(requests);
    syncProductRequestCount(requests.length, filteredRequests.length);

    if (!elements.productRequestList || !elements.productRequestEmpty) {
      return;
    }

    elements.productRequestList.innerHTML = "";
    elements.productRequestEmpty.hidden = filteredRequests.length > 0;
    if (state.productRequestSearchTerm.trim()) {
      elements.productRequestEmpty.textContent = "No products match your search.";
    } else if (state.productRequestFilter !== "all") {
      elements.productRequestEmpty.textContent = "No products match this filter.";
    } else {
      elements.productRequestEmpty.textContent = "No products in review.";
    }

    for (const product of filteredRequests) {
      elements.productRequestList.append(createProductRequestCard(product));
    }
  }

  function renderCompanyPagination(totalItems) {
    if (!elements.companyPagination || !elements.companyPageMeta) {
      return;
    }

    elements.companyPageMeta.textContent =
      totalItems
        ? `Showing 1 to ${numberText(totalItems)} of ${numberText(totalItems)} entries`
        : "Showing 0 to 0 of 0 entries";
    elements.companyPagination.innerHTML = "";
  }

  function renderAdmins(admins = state.admins) {
    if (!elements.list || !elements.empty) {
      return;
    }

    const totalAdmins = Array.isArray(admins) ? admins.length : 0;
    const filteredAdmins = sortAdmins(getFilteredAdmins(admins));
    const totalFilteredAdmins = filteredAdmins.length;
    const hasCompanySearch = state.companySearchTerm.trim().length > 0;
    const shouldShowSearchEmpty = hasCompanySearch && totalFilteredAdmins === 0;
    const companiesPanel = elements.list.closest(".super-admin-companies-panel");

    elements.list.innerHTML = "";
    elements.list.classList.toggle("is-list-view", state.companyView === "list");
    elements.list.hidden = shouldShowSearchEmpty;
    companiesPanel?.classList.toggle("is-empty-search", shouldShowSearchEmpty);
    elements.empty.hidden = !shouldShowSearchEmpty;
    if (elements.emptyDescription) {
      elements.emptyDescription.textContent = "No companies match your search.";
    }

    if (elements.companyTotalLabel) {
      const visibleCompanyCount = hasCompanySearch ? totalFilteredAdmins : totalAdmins;
      elements.companyTotalLabel.textContent = `(${numberText(visibleCompanyCount)})`;
    }
    for (const admin of filteredAdmins) {
      if (state.companyView === "list" && elements.list.children.length === 0) {
        elements.list.append(createCompanyTableHeader());
      }
      elements.list.append(createCompanyCard(admin));
    }
    if (state.companyView !== "list" && state.selectedCompanyId) {
      const selectedAdmin = findCompanyById(state.selectedCompanyId);
      if (selectedAdmin) {
        renderCompanyDrawer(selectedAdmin);
        syncCompanyCardSelection();
      } else {
        closeCompanyDrawer();
      }
    }
    renderCompanyPagination(totalFilteredAdmins);
    syncCompanyCardSelection();
  }

  function createIconSvg(paths) {
    return `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true" focusable="false">
        ${paths}
      </svg>
    `;
  }

  const integratedIconPaths = Object.freeze({
    payment: '<rect width="20" height="14" x="2" y="5" rx="2"></rect><path d="M2 10h20"></path>',
    delivery: '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"></path><path d="M15 18H9"></path><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 9H14"></path><circle cx="7" cy="18" r="2"></circle><circle cx="17" cy="18" r="2"></circle>',
    user: '<circle cx="12" cy="8" r="4"></circle><path d="M4 21a8 8 0 0 1 16 0"></path>',
    power: '<path d="M12 2v10"></path><path d="M18.4 6.6a9 9 0 1 1-12.8 0"></path>',
    trash: '<path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path><path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>',
  });

  function getIntegratedPartnerConfig(type) {
    if (type === "delivery") {
      return {
        type,
        label: "Delivery partner",
        pluralLabel: "Delivery Partners",
        endpoint: "/api/delivery-partners",
        stateKey: "deliveryPartners",
        loadingKey: "deliveryPartnersLoading",
        searchKey: "deliveryPartnerSearchTerm",
        selectedKey: "selectedDeliveryPartnerId",
        list: elements.deliveryPartnerList,
        total: elements.deliveryPartnerTotal,
        drawer: elements.deliveryPartnerDrawer,
        backdrop: elements.deliveryPartnerDrawerBackdrop,
        drawerContent: elements.deliveryPartnerDrawerContent,
        icon: integratedIconPaths.delivery,
      };
    }

    return {
      type: "payment",
      label: "Payment partner",
      pluralLabel: "Payment Partners",
      endpoint: "/api/payment-partners",
      stateKey: "paymentPartners",
      loadingKey: "paymentPartnersLoading",
      searchKey: "paymentPartnerSearchTerm",
      selectedKey: "selectedPaymentPartnerId",
      list: elements.paymentPartnerList,
      total: elements.paymentPartnerTotal,
      drawer: elements.paymentPartnerDrawer,
      backdrop: elements.paymentPartnerDrawerBackdrop,
      drawerContent: elements.paymentPartnerDrawerContent,
      icon: integratedIconPaths.payment,
    };
  }

  function readIntegratedEnabledFlag(record) {
    if (Object.prototype.hasOwnProperty.call(record ?? {}, "isActive")) {
      return record.isActive !== false;
    }
    const status = String(record?.status ?? "").trim().toLowerCase();
    return !["inactive", "disabled", "archived", "deleted"].includes(status);
  }

  function getIntegratedPartnerId(partner) {
    return String(partner?.id || "").trim();
  }

  function getIntegratedPartnerName(partner) {
    return String(partner?.branch || partner?.name || "Partner").trim();
  }

  function getIntegratedPartnerImage(partner) {
    return String(partner?.imageUrl || partner?.logoUrl || partner?.photoUrl || "").trim();
  }

  function getIntegratedPartnerSearchText(partner) {
    return [
      partner?.id,
      partner?.branch,
      partner?.name,
      partner?.description,
      partner?.adminId,
      partner?.status,
      readIntegratedEnabledFlag(partner) ? "active" : "inactive",
    ].join(" ").toLowerCase();
  }

  function getVisibleIntegratedPartners(type) {
    const config = getIntegratedPartnerConfig(type);
    const searchTerm = String(state[config.searchKey] || "").trim().toLowerCase();
    const partners = Array.isArray(state[config.stateKey]) ? state[config.stateKey] : [];
    return searchTerm
      ? partners.filter((partner) => getIntegratedPartnerSearchText(partner).includes(searchTerm))
      : partners;
  }

  function createIntegratedAvatar({ imageUrl = "", label = "", iconPath = "" } = {}) {
    const avatar = document.createElement("span");
    avatar.className = "super-admin-integrated-card__avatar";
    const normalizedImageUrl = String(imageUrl || "").trim();
    if (normalizedImageUrl) {
      const image = document.createElement("img");
      image.src = normalizedImageUrl;
      image.alt = `${label || "Item"} logo`;
      image.loading = "lazy";
      image.addEventListener("error", () => {
        image.remove();
        avatar.innerHTML = createIconSvg(iconPath || integratedIconPaths.user);
      }, { once: true });
      avatar.append(image);
      return avatar;
    }
    avatar.innerHTML = createIconSvg(iconPath || integratedIconPaths.user);
    return avatar;
  }

  function createIntegratedCard({ id, title, subtitle, meta, statusLabel, statusActive, imageUrl, iconPath, onOpen }) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "super-admin-integrated-card";
    card.dataset.integratedId = id;
    card.setAttribute("aria-label", `Open details for ${title}`);
    card.addEventListener("click", () => onOpen?.(id));

    const identity = document.createElement("span");
    identity.className = "super-admin-integrated-card__identity";
    identity.append(createIntegratedAvatar({ imageUrl, label: title, iconPath }));

    const copy = document.createElement("span");
    copy.className = "super-admin-integrated-card__copy";
    const titleElement = document.createElement("span");
    titleElement.className = "super-admin-integrated-card__title";
    titleElement.textContent = title;
    const subElement = document.createElement("span");
    subElement.className = "super-admin-integrated-card__sub";
    subElement.textContent = subtitle;
    copy.append(titleElement, subElement);
    identity.append(copy);

    const metaElement = document.createElement("span");
    metaElement.className = "super-admin-integrated-card__meta";
    const metaValue = document.createElement("span");
    metaValue.className = "super-admin-integrated-card__value";
    metaValue.textContent = meta.value;
    const metaLabel = document.createElement("span");
    metaLabel.className = "super-admin-integrated-card__label";
    metaLabel.textContent = meta.label;
    metaElement.append(metaValue, metaLabel);

    const status = document.createElement("span");
    status.className = "super-admin-integrated-status";
    status.classList.toggle("is-active", Boolean(statusActive));
    status.classList.toggle("is-verified", Boolean(statusActive));
    status.textContent = statusLabel;

    card.append(identity, metaElement, status);
    return card;
  }

  function renderIntegratedPartners(type) {
    const config = getIntegratedPartnerConfig(type);
    if (!config.list) {
      return;
    }

    const visiblePartners = getVisibleIntegratedPartners(type);
    config.list.innerHTML = "";
    if (config.total) {
      config.total.textContent = `(${numberText(visiblePartners.length)})`;
    }

    if (!visiblePartners.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = `No ${config.pluralLabel.toLowerCase()} found.`;
      config.list.append(empty);
      return;
    }

    for (const partner of visiblePartners) {
      const isActive = readIntegratedEnabledFlag(partner);
      config.list.append(createIntegratedCard({
        id: getIntegratedPartnerId(partner),
        title: getIntegratedPartnerName(partner),
        subtitle: String(partner?.description || partner?.id || "Global partner").trim(),
        meta: {
          value: formatDateDay(partner?.updatedAt || partner?.createdAt),
          label: partner?.updatedAt ? "Updated" : "Created",
        },
        statusLabel: isActive ? "Active" : "Inactive",
        statusActive: isActive,
        imageUrl: getIntegratedPartnerImage(partner),
        iconPath: config.icon,
        onOpen: (id) => openIntegratedPartnerDrawer(type, id),
      }));
    }

    syncIntegratedSelection(type);
  }

  function findIntegratedPartner(type, id) {
    const config = getIntegratedPartnerConfig(type);
    return (Array.isArray(state[config.stateKey]) ? state[config.stateKey] : [])
      .find((partner) => getIntegratedPartnerId(partner) === String(id || "").trim()) || null;
  }

  function createIntegratedDrawerDetail(label, value) {
    const item = document.createElement("div");
    item.className = "super-admin-integrated-drawer__detail";
    const labelElement = document.createElement("span");
    labelElement.textContent = label;
    const valueElement = document.createElement("strong");
    valueElement.textContent = String(value ?? "").trim() || "-";
    item.append(labelElement, valueElement);
    return item;
  }

  function closeIntegratedDrawers() {
    for (const config of [getIntegratedPartnerConfig("payment"), getIntegratedPartnerConfig("delivery")]) {
      state[config.selectedKey] = "";
      if (config.drawer) config.drawer.hidden = true;
      if (config.backdrop) config.backdrop.hidden = true;
      syncIntegratedSelection(config.type);
    }
    state.selectedUserAccountId = "";
    if (elements.userDataDrawer) elements.userDataDrawer.hidden = true;
    if (elements.userDataDrawerBackdrop) elements.userDataDrawerBackdrop.hidden = true;
    syncUserDataSelection();
  }

  function syncIntegratedSelection(type) {
    const config = getIntegratedPartnerConfig(type);
    const selectedId = String(state[config.selectedKey] || "").trim();
    for (const card of Array.from(config.list?.querySelectorAll(".super-admin-integrated-card") || [])) {
      card.classList.toggle("is-selected", Boolean(selectedId) && card.dataset.integratedId === selectedId);
    }
  }

  function openIntegratedPartnerDrawer(type, id) {
    const config = getIntegratedPartnerConfig(type);
    const partner = findIntegratedPartner(type, id);
    if (!partner || !config.drawer || !config.drawerContent) {
      return;
    }

    closeIntegratedDrawers();
    state[config.selectedKey] = getIntegratedPartnerId(partner);
    config.drawerContent.innerHTML = "";

    const partnerName = getIntegratedPartnerName(partner);
    const isActive = readIntegratedEnabledFlag(partner);
    const summary = document.createElement("div");
    summary.className = "super-admin-integrated-drawer__summary";
    const avatar = createIntegratedAvatar({
      imageUrl: getIntegratedPartnerImage(partner),
      label: partnerName,
      iconPath: config.icon,
    });
    avatar.classList.add("super-admin-integrated-drawer__avatar");
    const summaryCopy = document.createElement("div");
    summaryCopy.className = "super-admin-integrated-drawer__summary-copy";
    const summaryName = document.createElement("strong");
    summaryName.textContent = partnerName;
    const status = document.createElement("span");
    status.className = "super-admin-integrated-status";
    status.classList.toggle("is-active", isActive);
    status.textContent = isActive ? "Active" : "Inactive";
    summaryCopy.append(summaryName, status);
    summary.append(avatar, summaryCopy);

    const details = document.createElement("div");
    details.className = "super-admin-integrated-drawer__details";
    details.append(
      createIntegratedDrawerDetail("ID", partner.id),
      createIntegratedDrawerDetail("Admin scope", partner.adminId || "Global"),
      createIntegratedDrawerDetail("Created", formatDateTime(partner.createdAt)),
      createIntegratedDrawerDetail("Updated", formatDateTime(partner.updatedAt)),
    );
    if (type === "delivery") {
      details.append(createIntegratedDrawerDetail("Description", partner.description || "-"));
    }

    const actions = document.createElement("div");
    actions.className = "super-admin-integrated-drawer__actions";
    const toggleButton = document.createElement("button");
    toggleButton.type = "button";
    toggleButton.className = "super-admin-company-card__action-item";
    toggleButton.dataset.integratedPartnerAction = "toggle";
    toggleButton.dataset.integratedPartnerType = type;
    toggleButton.dataset.integratedPartnerId = getIntegratedPartnerId(partner);
    toggleButton.innerHTML = `${createIconSvg(integratedIconPaths.power)}<span>${isActive ? "Deactivate" : "Activate"}</span>`;
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "super-admin-company-card__action-item super-admin-company-card__action-item--danger";
    deleteButton.dataset.integratedPartnerAction = "delete";
    deleteButton.dataset.integratedPartnerType = type;
    deleteButton.dataset.integratedPartnerId = getIntegratedPartnerId(partner);
    deleteButton.innerHTML = `${createIconSvg(integratedIconPaths.trash)}<span>Delete</span>`;
    actions.append(toggleButton, deleteButton);

    config.drawerContent.append(summary, details, actions);
    config.drawer.hidden = false;
    if (config.backdrop) config.backdrop.hidden = false;
    syncIntegratedSelection(type);
  }

  async function loadIntegratedPartners(type, { quiet = false } = {}) {
    const config = getIntegratedPartnerConfig(type);
    state[config.loadingKey] = true;
    if (!quiet) {
      setFeedback(`Loading ${config.pluralLabel.toLowerCase()}...`);
    }
    try {
      const response = await fetch(config.endpoint, {
        cache: "no-store",
        headers: rootHeaders({ Accept: "application/json" }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || `Unable to load ${config.pluralLabel.toLowerCase()}.`);
      }
      state[config.stateKey] = Array.isArray(data.partners) ? data.partners : [];
      renderIntegratedPartners(type);
      if (!quiet) setFeedback("");
    } catch (error) {
      renderIntegratedPartners(type);
      setFeedback(error instanceof Error ? error.message : `Unable to load ${config.pluralLabel.toLowerCase()}.`, "error");
    } finally {
      state[config.loadingKey] = false;
    }
  }

  async function updateIntegratedPartnerActiveState(type, partnerId, nextIsActive) {
    const config = getIntegratedPartnerConfig(type);
    try {
      const response = await fetch(`${config.endpoint}/${encodeURIComponent(partnerId)}`, {
        method: "PATCH",
        headers: rootHeaders({
          Accept: "application/json",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({ isActive: nextIsActive }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || `Unable to update ${config.label.toLowerCase()}.`);
      }
      state[config.stateKey] = state[config.stateKey].map((partner) =>
        getIntegratedPartnerId(partner) === partnerId ? { ...partner, ...data.partner } : partner,
      );
      renderIntegratedPartners(type);
      openIntegratedPartnerDrawer(type, partnerId);
      setFeedback(data.message || `${config.label} updated.`, "success");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : `Unable to update ${config.label.toLowerCase()}.`, "error");
    }
  }

  async function deleteIntegratedPartner(type, partnerId) {
    const config = getIntegratedPartnerConfig(type);
    const partner = findIntegratedPartner(type, partnerId);
    const partnerName = partner ? getIntegratedPartnerName(partner) : config.label;
    const confirmed = await confirmDeleteValidationModal(
      `Delete ${config.label.toLowerCase()}?`,
      `Delete ${partnerName}?`,
    );
    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`${config.endpoint}/${encodeURIComponent(partnerId)}`, {
        method: "DELETE",
        headers: rootHeaders({ Accept: "application/json" }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || `Unable to delete ${config.label.toLowerCase()}.`);
      }
      state[config.stateKey] = state[config.stateKey].filter((item) => getIntegratedPartnerId(item) !== partnerId);
      closeIntegratedDrawers();
      renderIntegratedPartners(type);
      setFeedback(data.message || `${config.label} deleted.`, "success");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : `Unable to delete ${config.label.toLowerCase()}.`, "error");
    }
  }

  function hasRegisteredFaceProfile(account) {
    if (account?.faceVerified || account?.faceProfileRegistered || account?.verifiedAt) {
      return true;
    }
    const registeredFaceProfile = account?.registeredFaceProfile;
    if (registeredFaceProfile && typeof registeredFaceProfile === "object") {
      return true;
    }
    const faceAttendanceProfile = account?.face_attendance_lh || account?.faceAttendanceLh;
    if (faceAttendanceProfile && typeof faceAttendanceProfile === "object") {
      const sampleCount = Number(faceAttendanceProfile.sampleCount ?? faceAttendanceProfile.sample_count ?? 0);
      return Boolean(faceAttendanceProfile.registeredAt || faceAttendanceProfile.registered_at || sampleCount > 0);
    }
    return Boolean(faceAttendanceProfile);
  }

  function getUserAccountId(account) {
    return String(account?.accountCode || account?.employeeId || account?.id || "").trim();
  }

  function getUserAccountName(account) {
    return [account?.firstName, account?.lastName].filter(Boolean).join(" ").trim() || account?.email || "User";
  }

  function getUserSearchText(account) {
    return [
      getUserAccountId(account),
      account?.firstName,
      account?.lastName,
      account?.email,
      account?.mobileNumber,
      account?.countryCode,
      hasRegisteredFaceProfile(account) ? "verified" : "pending",
    ].join(" ").toLowerCase();
  }

  function formatUserPhone(account) {
    const mobileNumber = String(account?.mobileNumber || "").trim();
    if (!mobileNumber) return "-";
    return `${String(account?.countryCode || "+63").trim() || "+63"} ${mobileNumber}`;
  }

  function getVisibleUserAccounts() {
    const searchTerm = String(state.userDataSearchTerm || "").trim().toLowerCase();
    const accounts = Array.isArray(state.userAccounts) ? state.userAccounts : [];
    const visibleAccounts = searchTerm
      ? accounts.filter((account) => getUserSearchText(account).includes(searchTerm))
      : accounts;
    return visibleAccounts.sort((left, right) => String(right.createdAt || "").localeCompare(String(left.createdAt || "")));
  }

  function renderUserAccounts() {
    if (!elements.userDataList) {
      return;
    }

    const visibleAccounts = getVisibleUserAccounts();
    elements.userDataList.innerHTML = "";
    if (elements.userDataTotal) {
      elements.userDataTotal.textContent = `(${numberText(visibleAccounts.length)})`;
    }

    if (!visibleAccounts.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "No registered app users found.";
      elements.userDataList.append(empty);
      return;
    }

    for (const account of visibleAccounts) {
      const verified = hasRegisteredFaceProfile(account);
      elements.userDataList.append(createIntegratedCard({
        id: getUserAccountId(account),
        title: getUserAccountName(account),
        subtitle: account.email || getUserAccountId(account),
        meta: {
          value: formatUserPhone(account),
          label: "Phone Number",
        },
        statusLabel: verified ? "Verified" : "Pending",
        statusActive: verified,
        imageUrl: account.profileImageUrl || account.avatarUrl || "",
        iconPath: integratedIconPaths.user,
        onOpen: openUserDataDrawer,
      }));
    }
    syncUserDataSelection();
  }

  function findUserAccount(id) {
    return state.userAccounts.find((account) => getUserAccountId(account) === String(id || "").trim()) || null;
  }

  function syncUserDataSelection() {
    const selectedId = String(state.selectedUserAccountId || "").trim();
    for (const card of Array.from(elements.userDataList?.querySelectorAll(".super-admin-integrated-card") || [])) {
      card.classList.toggle("is-selected", Boolean(selectedId) && card.dataset.integratedId === selectedId);
    }
  }

  function openUserDataDrawer(id) {
    const account = findUserAccount(id);
    if (!account || !elements.userDataDrawer || !elements.userDataDrawerContent) {
      return;
    }

    closeIntegratedDrawers();
    state.selectedUserAccountId = getUserAccountId(account);
    elements.userDataDrawerContent.innerHTML = "";

    const accountName = getUserAccountName(account);
    const summary = document.createElement("div");
    summary.className = "super-admin-integrated-drawer__summary";
    const avatar = createIntegratedAvatar({
      imageUrl: account.profileImageUrl || account.avatarUrl || "",
      label: accountName,
      iconPath: integratedIconPaths.user,
    });
    avatar.classList.add("super-admin-integrated-drawer__avatar");
    const copy = document.createElement("div");
    copy.className = "super-admin-integrated-drawer__summary-copy";
    const name = document.createElement("strong");
    name.textContent = accountName;
    const status = document.createElement("span");
    status.className = "super-admin-integrated-status";
    status.classList.toggle("is-verified", hasRegisteredFaceProfile(account));
    status.textContent = hasRegisteredFaceProfile(account) ? "Verified" : "Pending";
    copy.append(name, status);
    summary.append(avatar, copy);

    const details = document.createElement("div");
    details.className = "super-admin-integrated-drawer__details";
    details.append(
      createIntegratedDrawerDetail("User ID", getUserAccountId(account)),
      createIntegratedDrawerDetail("Email", account.email),
      createIntegratedDrawerDetail("Phone Number", formatUserPhone(account)),
      createIntegratedDrawerDetail("Created", formatDateTime(account.createdAt)),
      createIntegratedDrawerDetail("Admin scope", account.adminId || "-"),
      createIntegratedDrawerDetail("Source", account.source || "-"),
    );

    elements.userDataDrawerContent.append(summary, details);
    elements.userDataDrawer.hidden = false;
    if (elements.userDataDrawerBackdrop) elements.userDataDrawerBackdrop.hidden = false;
    syncUserDataSelection();
  }

  async function loadUserAccounts({ quiet = false } = {}) {
    state.userAccountsLoading = true;
    if (!quiet) {
      setFeedback("Loading user data...");
    }
    try {
      const response = await fetch("/api/accounts", {
        cache: "no-store",
        headers: rootHeaders({ Accept: "application/json" }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "Unable to load user data.");
      }
      const accounts = Array.isArray(data.accounts) ? data.accounts : [];
      state.userAccounts = accounts.filter((account) => String(account?.source || "").trim().toLowerCase() === "app");
      renderUserAccounts();
      if (!quiet) setFeedback("");
    } catch (error) {
      renderUserAccounts();
      setFeedback(error instanceof Error ? error.message : "Unable to load user data.", "error");
    } finally {
      state.userAccountsLoading = false;
    }
  }

  function startCategoryEdit(category) {
    const categoryName = normalizeCategoryName(category);
    if (!categoryName) {
      return;
    }

    state.editingCategoryName = categoryName;
    if (elements.categoryInputLabel) {
      elements.categoryInputLabel.textContent = "Edit Category";
    }
    if (elements.addCategoryButton) {
      elements.addCategoryButton.textContent = "Save";
    }
    if (elements.cancelCategoryEditButton) {
      elements.cancelCategoryEditButton.hidden = false;
    }
    if (elements.categoryNameInput) {
      elements.categoryNameInput.value = categoryName;
    }

    renderCategories(state.categories);
    window.requestAnimationFrame(() => {
      const editInput = elements.categoryList?.querySelector(
        ".category-chip.is-editing .category-chip__input",
      );
      if (editInput instanceof HTMLInputElement) {
        editInput.focus();
        editInput.select();
      }
    });
  }

  function createCategoryChip(category) {
    const categoryName = normalizeCategoryName(category);
    const categoryChip = document.createElement("div");
    categoryChip.className = "category-chip";
    categoryChip.dataset.categoryName = categoryName.toLowerCase();

    const isEditingCategory = isSameCategoryName(state.editingCategoryName, categoryName);
    if (isEditingCategory) {
      categoryChip.classList.add("is-editing");

      const editInput = document.createElement("input");
      editInput.type = "text";
      editInput.className = "category-chip__input";
      editInput.value = categoryName;
      editInput.autocomplete = "off";
      editInput.placeholder = "Category name";
      editInput.setAttribute("aria-label", `Edit ${categoryName}`);
      editInput.addEventListener("input", () => syncCategoryInputCasing(editInput));
      editInput.addEventListener("blur", () => syncCategoryInputCasing(editInput));

      const actionGroup = document.createElement("div");
      actionGroup.className = "category-chip__actions category-chip__actions--editing";

      const saveButton = document.createElement("button");
      saveButton.type = "button";
      saveButton.className = "category-chip__save";
      saveButton.setAttribute("aria-label", `Save ${categoryName}`);
      saveButton.title = `Save ${categoryName}`;
      saveButton.innerHTML = createIconSvg('<path d="m5 12 4.2 4.2L19 6.5" stroke-linecap="round" stroke-linejoin="round"></path>');

      const cancelButton = document.createElement("button");
      cancelButton.type = "button";
      cancelButton.className = "ghost-button category-chip__cancel";
      cancelButton.setAttribute("aria-label", `Cancel editing ${categoryName}`);
      cancelButton.title = `Cancel editing ${categoryName}`;
      cancelButton.innerHTML = createIconSvg('<path d="M7 7 17 17" stroke-linecap="round"></path><path d="M17 7 7 17" stroke-linecap="round"></path>');

      saveButton.addEventListener("click", () => {
        void handleUpdateCategory(categoryName, editInput.value, {
          focusTarget: editInput,
          primaryButton: saveButton,
          secondaryButton: cancelButton,
        });
      });
      cancelButton.addEventListener("click", () => resetCategoryEditor());
      editInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          void handleUpdateCategory(categoryName, editInput.value, {
            focusTarget: editInput,
            primaryButton: saveButton,
            secondaryButton: cancelButton,
          });
          return;
        }

        if (event.key === "Escape") {
          event.preventDefault();
          resetCategoryEditor();
        }
      });

      actionGroup.append(saveButton, cancelButton);
      categoryChip.append(editInput, actionGroup);
      return categoryChip;
    }

    const mainButton = document.createElement("button");
    mainButton.type = "button";
    mainButton.className = "category-chip__main";
    mainButton.addEventListener("click", () => startCategoryEdit(categoryName));

    const categoryNameLabel = document.createElement("span");
    categoryNameLabel.className = "category-chip__name";
    categoryNameLabel.textContent = categoryName;
    mainButton.append(categoryNameLabel);

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "ghost-button icon-action-button category-chip__edit";
    editButton.setAttribute("aria-label", `Edit ${categoryName}`);
    editButton.title = `Edit ${categoryName}`;
    editButton.innerHTML = createIconSvg(
      '<path d="m4 20 4.2-1 9-9a2.1 2.1 0 0 0-3-3l-9 9L4 20Z" stroke-linejoin="round"></path><path d="m12.8 6.2 3 3" stroke-linecap="round"></path>',
    );
    editButton.addEventListener("click", () => startCategoryEdit(categoryName));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className =
      "ghost-button icon-action-button icon-action-button--danger category-chip__delete";
    deleteButton.setAttribute("aria-label", `Delete ${categoryName}`);
    deleteButton.title = `Delete ${categoryName}`;
    deleteButton.innerHTML = createIconSvg(
      '<path d="M5.5 7.5h13" stroke-linecap="round"></path><path d="M9.5 4.5h5" stroke-linecap="round"></path><path d="m8.5 7.5.6 10a1 1 0 0 0 1 .9h3.8a1 1 0 0 0 1-.9l.6-10" stroke-linejoin="round"></path><path d="M10 10.5v4.5" stroke-linecap="round"></path><path d="M14 10.5v4.5" stroke-linecap="round"></path>',
    );
    deleteButton.addEventListener("click", () => {
      void handleDeleteCategory(categoryName);
    });

    const actionGroup = document.createElement("div");
    actionGroup.className = "category-chip__actions";
    actionGroup.append(editButton, deleteButton);

    categoryChip.append(mainButton, actionGroup);
    return categoryChip;
  }

  function renderCategories(categories = state.categories) {
    const nextCategories = normalizeCategoryValues(categories);
    state.categories = nextCategories;

    if (!elements.categoryList) {
      return;
    }

    elements.categoryList.innerHTML = "";

    if (!nextCategories.length) {
      const emptyState = document.createElement("div");
      emptyState.className = "empty-state";
      emptyState.textContent = "No saved categories yet.";
      elements.categoryList.append(emptyState);
      return;
    }

    for (const category of nextCategories) {
      elements.categoryList.append(createCategoryChip(category));
    }
  }

  async function loadCategories({ quiet = false } = {}) {
    state.categoriesLoading = true;
    if (!quiet) {
      setFeedback("Loading categories...");
    }

    try {
      const response = await fetch("/api/super-admin/categories", {
        cache: "no-store",
        headers: rootHeaders({
          Accept: "application/json",
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "Unable to load categories.");
      }

      renderCategories(Array.isArray(data.categories) ? data.categories : []);
      if (!quiet) {
        setFeedback(
          `${numberText(state.categories.length)} ${state.categories.length === 1 ? "category" : "categories"} loaded.`,
          "success",
        );
      }
    } catch (error) {
      if (!quiet || isCategoryDrawerVisible()) {
        setFeedback(error instanceof Error ? error.message : "Unable to load categories.", "error");
      }
    } finally {
      state.categoriesLoading = false;
    }
  }

  async function handleAddCategory() {
    const categoryName = normalizeCategoryName(elements.categoryNameInput?.value);

    if (!categoryName) {
      setFeedback("Enter a category name first.", "error");
      elements.categoryNameInput?.focus();
      return;
    }

    try {
      if (elements.addCategoryButton) {
        elements.addCategoryButton.disabled = true;
      }
      setFeedback("Adding category...");

      const response = await fetch("/api/super-admin/categories", {
        method: "POST",
        headers: rootHeaders({
          "Content-Type": "application/json",
          Accept: "application/json",
        }),
        body: JSON.stringify({ name: categoryName }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "Unable to add category.");
      }

      renderCategories(
        Array.isArray(data.categories)
          ? data.categories
          : [...state.categories, data.category || categoryName],
      );
      resetCategoryEditor();
      const successMessage = data.message || `Category "${categoryName}" added.`;
      setFeedback(successMessage, "success");
      showSuccessValidationModal("Category Added", successMessage);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to add category.", "error");
      elements.categoryNameInput?.focus();
    } finally {
      if (elements.addCategoryButton) {
        elements.addCategoryButton.disabled = false;
      }
    }
  }

  async function handleUpdateCategory(previousCategoryValue, nextCategoryValue, options = {}) {
    const previousCategoryName = normalizeCategoryName(previousCategoryValue || state.editingCategoryName);
    const nextCategoryName = normalizeCategoryName(nextCategoryValue);
    const focusTarget =
      options.focusTarget instanceof HTMLInputElement
        ? options.focusTarget
        : elements.categoryNameInput;
    const primaryButton =
      options.primaryButton instanceof HTMLButtonElement
        ? options.primaryButton
        : elements.addCategoryButton;
    const secondaryButton =
      options.secondaryButton instanceof HTMLButtonElement
        ? options.secondaryButton
        : elements.cancelCategoryEditButton;

    if (!previousCategoryName) {
      resetCategoryEditor();
      return;
    }

    if (!nextCategoryName) {
      setFeedback("Enter a category name first.", "error");
      focusTarget?.focus();
      return;
    }

    if (previousCategoryName === nextCategoryName) {
      resetCategoryEditor();
      setFeedback(`Category "${previousCategoryName}" unchanged.`, "success");
      return;
    }

    try {
      if (primaryButton) {
        primaryButton.disabled = true;
      }
      if (secondaryButton) {
        secondaryButton.disabled = true;
      }
      if (focusTarget) {
        focusTarget.disabled = true;
      }
      setFeedback("Updating category...");

      const response = await fetch("/api/super-admin/categories", {
        method: "PUT",
        headers: rootHeaders({
          "Content-Type": "application/json",
          Accept: "application/json",
        }),
        body: JSON.stringify({
          oldName: previousCategoryName,
          name: nextCategoryName,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "Unable to update category.");
      }

      renderCategories(
        Array.isArray(data.categories)
          ? data.categories
          : state.categories.map((category) =>
              isSameCategoryName(category, previousCategoryName)
                ? nextCategoryName
                : category,
            ),
      );
      resetCategoryEditor();

      const updatedProducts = Number(data.updatedProducts || 0);
      const successMessage =
        updatedProducts > 0
          ? `Category updated. ${numberText(updatedProducts)} product${updatedProducts === 1 ? "" : "s"} moved.`
          : data.message || "Category updated.";
      setFeedback(successMessage, "success");
      showSuccessValidationModal("Category Updated", successMessage);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to update category.", "error");
      if (focusTarget) {
        focusTarget.disabled = false;
        syncCategoryInputCasing(focusTarget);
        focusTarget.focus();
        focusTarget.select();
      }
    } finally {
      if (primaryButton) {
        primaryButton.disabled = false;
      }
      if (secondaryButton) {
        secondaryButton.disabled = false;
      }
      if (focusTarget) {
        focusTarget.disabled = false;
      }
    }
  }

  async function handleCategorySubmit() {
    if (state.editingCategoryName) {
      return handleUpdateCategory(state.editingCategoryName, elements.categoryNameInput?.value);
    }

    return handleAddCategory();
  }

  async function handleDeleteCategory(categoryValue) {
    const categoryName = normalizeCategoryName(categoryValue);
    if (!categoryName) {
      return;
    }

    const confirmed = await confirmDeleteValidationModal(
      "Delete Category?",
      `Delete category "${categoryName}"? This action cannot be undone.`,
    );
    if (!confirmed) {
      return;
    }

    try {
      setFeedback("Deleting category...");
      const response = await fetch(
        `/api/super-admin/categories?name=${encodeURIComponent(categoryName)}`,
        {
          method: "DELETE",
          headers: rootHeaders({
            Accept: "application/json",
          }),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "Unable to delete category.");
      }

      renderCategories(
        Array.isArray(data.categories)
          ? data.categories
          : state.categories.filter((category) => !isSameCategoryName(category, categoryName)),
      );
      if (isSameCategoryName(state.editingCategoryName, categoryName)) {
        resetCategoryEditor();
      }

      const reassignedProducts = Number(data.reassignedProducts || 0);
      const successMessage =
        reassignedProducts > 0
          ? `Category deleted. ${numberText(reassignedProducts)} product${reassignedProducts === 1 ? "" : "s"} moved to ${data.reassignedCategory || "General"}.`
          : data.message || "Category deleted.";
      setFeedback(successMessage, "success");
      showSuccessValidationModal("Category Deleted", successMessage);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to delete category.", "error");
    }
  }

  function startStoreTypeEdit(storeType) {
    const storeTypeName = normalizeCategoryName(storeType);
    if (!storeTypeName) {
      return;
    }

    state.editingStoreTypeName = storeTypeName;
    if (elements.storeTypeInputLabel) {
      elements.storeTypeInputLabel.textContent = "Edit Store Type";
    }
    if (elements.addStoreTypeButton) {
      elements.addStoreTypeButton.textContent = "Save";
    }
    if (elements.cancelStoreTypeEditButton) {
      elements.cancelStoreTypeEditButton.hidden = false;
    }
    if (elements.storeTypeNameInput) {
      elements.storeTypeNameInput.value = storeTypeName;
    }

    renderStoreTypes(state.storeTypes);
    window.requestAnimationFrame(() => {
      const editInput = elements.storeTypeList?.querySelector(
        ".category-chip.is-editing .category-chip__input",
      );
      if (editInput instanceof HTMLInputElement) {
        editInput.focus();
        editInput.select();
      }
    });
  }

  function createStoreTypeChip(storeType) {
    const storeTypeName = normalizeCategoryName(storeType);
    const storeTypeChip = document.createElement("div");
    storeTypeChip.className = "category-chip";
    storeTypeChip.dataset.storeTypeName = storeTypeName.toLowerCase();

    const isEditingStoreType = isSameStoreTypeName(state.editingStoreTypeName, storeTypeName);
    if (isEditingStoreType) {
      storeTypeChip.classList.add("is-editing");

      const editInput = document.createElement("input");
      editInput.type = "text";
      editInput.className = "category-chip__input";
      editInput.value = storeTypeName;
      editInput.autocomplete = "off";
      editInput.placeholder = "Store type name";
      editInput.setAttribute("aria-label", `Edit ${storeTypeName}`);
      editInput.addEventListener("input", () => syncStoreTypeInputCasing(editInput));
      editInput.addEventListener("blur", () => syncStoreTypeInputCasing(editInput));

      const actionGroup = document.createElement("div");
      actionGroup.className = "category-chip__actions category-chip__actions--editing";

      const saveButton = document.createElement("button");
      saveButton.type = "button";
      saveButton.className = "category-chip__save";
      saveButton.setAttribute("aria-label", `Save ${storeTypeName}`);
      saveButton.title = `Save ${storeTypeName}`;
      saveButton.innerHTML = createIconSvg('<path d="m5 12 4.2 4.2L19 6.5" stroke-linecap="round" stroke-linejoin="round"></path>');

      const cancelButton = document.createElement("button");
      cancelButton.type = "button";
      cancelButton.className = "ghost-button category-chip__cancel";
      cancelButton.setAttribute("aria-label", `Cancel editing ${storeTypeName}`);
      cancelButton.title = `Cancel editing ${storeTypeName}`;
      cancelButton.innerHTML = createIconSvg('<path d="M7 7 17 17" stroke-linecap="round"></path><path d="M17 7 7 17" stroke-linecap="round"></path>');

      saveButton.addEventListener("click", () => {
        void handleUpdateStoreType(storeTypeName, editInput.value, {
          focusTarget: editInput,
          primaryButton: saveButton,
          secondaryButton: cancelButton,
        });
      });
      cancelButton.addEventListener("click", () => resetStoreTypeEditor());
      editInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          void handleUpdateStoreType(storeTypeName, editInput.value, {
            focusTarget: editInput,
            primaryButton: saveButton,
            secondaryButton: cancelButton,
          });
          return;
        }

        if (event.key === "Escape") {
          event.preventDefault();
          resetStoreTypeEditor();
        }
      });

      actionGroup.append(saveButton, cancelButton);
      storeTypeChip.append(editInput, actionGroup);
      return storeTypeChip;
    }

    const mainButton = document.createElement("button");
    mainButton.type = "button";
    mainButton.className = "category-chip__main";
    mainButton.addEventListener("click", () => startStoreTypeEdit(storeTypeName));

    const storeTypeNameLabel = document.createElement("span");
    storeTypeNameLabel.className = "category-chip__name";
    storeTypeNameLabel.textContent = storeTypeName;
    mainButton.append(storeTypeNameLabel);

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "ghost-button icon-action-button category-chip__edit";
    editButton.setAttribute("aria-label", `Edit ${storeTypeName}`);
    editButton.title = `Edit ${storeTypeName}`;
    editButton.innerHTML = createIconSvg(
      '<path d="m4 20 4.2-1 9-9a2.1 2.1 0 0 0-3-3l-9 9L4 20Z" stroke-linejoin="round"></path><path d="m12.8 6.2 3 3" stroke-linecap="round"></path>',
    );
    editButton.addEventListener("click", () => startStoreTypeEdit(storeTypeName));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className =
      "ghost-button icon-action-button icon-action-button--danger category-chip__delete";
    deleteButton.setAttribute("aria-label", `Delete ${storeTypeName}`);
    deleteButton.title = `Delete ${storeTypeName}`;
    deleteButton.innerHTML = createIconSvg(
      '<path d="M5.5 7.5h13" stroke-linecap="round"></path><path d="M9.5 4.5h5" stroke-linecap="round"></path><path d="m8.5 7.5.6 10a1 1 0 0 0 1 .9h3.8a1 1 0 0 0 1-.9l.6-10" stroke-linejoin="round"></path><path d="M10 10.5v4.5" stroke-linecap="round"></path><path d="M14 10.5v4.5" stroke-linecap="round"></path>',
    );
    deleteButton.addEventListener("click", () => {
      void handleDeleteStoreType(storeTypeName);
    });

    const actionGroup = document.createElement("div");
    actionGroup.className = "category-chip__actions";
    actionGroup.append(editButton, deleteButton);

    storeTypeChip.append(mainButton, actionGroup);
    return storeTypeChip;
  }

  function renderStoreTypes(storeTypes = state.storeTypes) {
    const nextStoreTypes = normalizeStoreTypeValues(storeTypes);
    state.storeTypes = nextStoreTypes;
    const searchTerm = state.storeTypeSearchTerm.trim().toLowerCase();
    const visibleStoreTypes = searchTerm
      ? nextStoreTypes.filter((storeType) => String(storeType || "").toLowerCase().includes(searchTerm))
      : nextStoreTypes;
    if (elements.storeTypeTotalLabel) {
      elements.storeTypeTotalLabel.textContent = `(${numberText(visibleStoreTypes.length)})`;
    }

    if (!elements.storeTypeList) {
      return;
    }

    elements.storeTypeList.innerHTML = "";
    elements.storeTypeList.classList.toggle("is-list-view", state.storeTypeView === "list");

    if (!visibleStoreTypes.length) {
      const emptyState = document.createElement("div");
      emptyState.className = "empty-state";
      emptyState.textContent = searchTerm ? "No store types match your search." : "No saved store types yet.";
      elements.storeTypeList.append(emptyState);
      return;
    }

    for (const storeType of visibleStoreTypes) {
      elements.storeTypeList.append(createStoreTypeChip(storeType));
    }
  }

  async function loadStoreTypes({ quiet = false } = {}) {
    state.storeTypesLoading = true;
    if (!quiet) {
      setFeedback("Loading store types...");
    }

    try {
      const response = await fetch("/api/super-admin/store-types", {
        cache: "no-store",
        headers: rootHeaders({
          Accept: "application/json",
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "Unable to load store types.");
      }

      renderStoreTypes(Array.isArray(data.storeTypes) ? data.storeTypes : []);
      if (!quiet) {
        setFeedback(
          `${numberText(state.storeTypes.length)} ${state.storeTypes.length === 1 ? "store type" : "store types"} loaded.`,
          "success",
        );
      }
    } catch (error) {
      if (!quiet || isStoreTypeDrawerVisible()) {
        setFeedback(error instanceof Error ? error.message : "Unable to load store types.", "error");
      }
    } finally {
      state.storeTypesLoading = false;
    }
  }

  async function handleAddStoreType() {
    const storeTypeName = normalizeCategoryName(elements.storeTypeNameInput?.value);

    if (!storeTypeName) {
      setFeedback("Enter a store type first.", "error");
      elements.storeTypeNameInput?.focus();
      return;
    }

    try {
      if (elements.addStoreTypeButton) {
        elements.addStoreTypeButton.disabled = true;
      }
      setFeedback("Adding store type...");

      const response = await fetch("/api/super-admin/store-types", {
        method: "POST",
        headers: rootHeaders({
          "Content-Type": "application/json",
          Accept: "application/json",
        }),
        body: JSON.stringify({ name: storeTypeName }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "Unable to add store type.");
      }

      renderStoreTypes(
        Array.isArray(data.storeTypes)
          ? data.storeTypes
          : [...state.storeTypes, data.storeType || storeTypeName],
      );
      resetStoreTypeEditor();
      const successMessage = data.message || `Store type "${storeTypeName}" added.`;
      setFeedback(successMessage, "success");
      showSuccessValidationModal("Store Type Added", successMessage);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to add store type.", "error");
      elements.storeTypeNameInput?.focus();
    } finally {
      if (elements.addStoreTypeButton) {
        elements.addStoreTypeButton.disabled = false;
      }
    }
  }

  async function handleUpdateStoreType(previousStoreTypeValue, nextStoreTypeValue, options = {}) {
    const previousStoreTypeName = normalizeCategoryName(previousStoreTypeValue || state.editingStoreTypeName);
    const nextStoreTypeName = normalizeCategoryName(nextStoreTypeValue);
    const focusTarget =
      options.focusTarget instanceof HTMLInputElement
        ? options.focusTarget
        : elements.storeTypeNameInput;
    const primaryButton =
      options.primaryButton instanceof HTMLButtonElement
        ? options.primaryButton
        : elements.addStoreTypeButton;
    const secondaryButton =
      options.secondaryButton instanceof HTMLButtonElement
        ? options.secondaryButton
        : elements.cancelStoreTypeEditButton;

    if (!previousStoreTypeName) {
      resetStoreTypeEditor();
      return;
    }

    if (!nextStoreTypeName) {
      setFeedback("Enter a store type first.", "error");
      focusTarget?.focus();
      return;
    }

    if (previousStoreTypeName === nextStoreTypeName) {
      resetStoreTypeEditor();
      setFeedback(`Store type "${previousStoreTypeName}" unchanged.`, "success");
      return;
    }

    try {
      if (primaryButton) {
        primaryButton.disabled = true;
      }
      if (secondaryButton) {
        secondaryButton.disabled = true;
      }
      if (focusTarget) {
        focusTarget.disabled = true;
      }
      setFeedback("Updating store type...");

      const response = await fetch("/api/super-admin/store-types", {
        method: "PUT",
        headers: rootHeaders({
          "Content-Type": "application/json",
          Accept: "application/json",
        }),
        body: JSON.stringify({
          oldName: previousStoreTypeName,
          name: nextStoreTypeName,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "Unable to update store type.");
      }

      renderStoreTypes(
        Array.isArray(data.storeTypes)
          ? data.storeTypes
          : state.storeTypes.map((storeType) =>
              isSameStoreTypeName(storeType, previousStoreTypeName)
                ? nextStoreTypeName
                : storeType,
            ),
      );
      resetStoreTypeEditor();

      const updatedAdmins = Number(data.updatedAdmins || 0);
      const successMessage =
        updatedAdmins > 0
          ? `Store type updated. ${numberText(updatedAdmins)} admin${updatedAdmins === 1 ? "" : "s"} updated.`
          : data.message || "Store type updated.";
      setFeedback(successMessage, "success");
      showSuccessValidationModal("Store Type Updated", successMessage);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to update store type.", "error");
      if (focusTarget) {
        focusTarget.disabled = false;
        syncStoreTypeInputCasing(focusTarget);
        focusTarget.focus();
        focusTarget.select();
      }
    } finally {
      if (primaryButton) {
        primaryButton.disabled = false;
      }
      if (secondaryButton) {
        secondaryButton.disabled = false;
      }
      if (focusTarget) {
        focusTarget.disabled = false;
      }
    }
  }

  async function handleStoreTypeSubmit() {
    if (state.editingStoreTypeName) {
      return handleUpdateStoreType(state.editingStoreTypeName, elements.storeTypeNameInput?.value);
    }

    return handleAddStoreType();
  }

  async function handleDeleteStoreType(storeTypeValue) {
    const storeTypeName = normalizeCategoryName(storeTypeValue);
    if (!storeTypeName) {
      return;
    }

    const confirmed = await confirmDeleteValidationModal(
      "Delete Store Type?",
      `Delete store type "${storeTypeName}"? This action cannot be undone.`,
    );
    if (!confirmed) {
      return;
    }

    try {
      setFeedback("Deleting store type...");
      const response = await fetch(
        `/api/super-admin/store-types?name=${encodeURIComponent(storeTypeName)}`,
        {
          method: "DELETE",
          headers: rootHeaders({
            Accept: "application/json",
          }),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "Unable to delete store type.");
      }

      renderStoreTypes(
        Array.isArray(data.storeTypes)
          ? data.storeTypes
          : state.storeTypes.filter((storeType) => !isSameStoreTypeName(storeType, storeTypeName)),
      );
      if (isSameStoreTypeName(state.editingStoreTypeName, storeTypeName)) {
        resetStoreTypeEditor();
      }

      const clearedAdmins = Number(data.clearedAdmins || 0);
      const successMessage =
        clearedAdmins > 0
          ? `Store type deleted. ${numberText(clearedAdmins)} admin${clearedAdmins === 1 ? "" : "s"} cleared.`
          : data.message || "Store type deleted.";
      setFeedback(successMessage, "success");
      showSuccessValidationModal("Store Type Deleted", successMessage);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to delete store type.", "error");
    }
  }

  async function loadProductRequests({ quiet = false } = {}) {
    state.productRequestsLoading = true;
    if (!quiet) {
      setFeedback("Loading products in review...");
    }

    try {
      const response = await fetch("/api/super-admin/product-requests", {
        cache: "no-store",
        headers: rootHeaders({
          Accept: "application/json",
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "Unable to load products in review.");
      }

      renderProductRequests(Array.isArray(data.products) ? data.products : []);
      if (!quiet) {
        setFeedback("");
      }
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to load products in review.", "error");
    } finally {
      state.productRequestsLoading = false;
    }
  }

  async function approveProductRequest(productId, button = null) {
    const normalizedProductId = String(productId || "").trim();
    if (!normalizedProductId) {
      return;
    }

    const targetProduct = state.productRequests.find((product) =>
      String(product?.id || "").trim() === normalizedProductId
    );
    const productName = String(targetProduct?.name || "product").trim();

    try {
      if (button instanceof HTMLButtonElement) {
        button.disabled = true;
        button.textContent = "Approving...";
      }
      setFeedback(`Approving ${productName}...`);

      const response = await fetch(
        `/api/super-admin/products/${encodeURIComponent(normalizedProductId)}/approve`,
        {
          method: "PATCH",
          headers: rootHeaders({
            Accept: "application/json",
          }),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "Unable to approve product in review.");
      }

      state.productRequests = state.productRequests.filter((product) =>
        String(product?.id || "").trim() !== normalizedProductId
      );
      renderProductRequests(state.productRequests);
      setFeedback(data.message || `${productName} approved.`, "success");
      void loadAdmins();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to approve product in review.", "error");
      if (button instanceof HTMLButtonElement) {
        button.disabled = false;
        button.textContent = "Approve";
      }
    }
  }

  async function cancelProductRequest(productId, button = null) {
    const normalizedProductId = String(productId || "").trim();
    if (!normalizedProductId) {
      return;
    }

    const targetProduct = state.productRequests.find((product) =>
      String(product?.id || "").trim() === normalizedProductId
    );
    const productName = String(targetProduct?.name || "product").trim();
    const confirmed = window.confirm(`Cancel product request for ${productName}?`);
    if (!confirmed) {
      return;
    }

    try {
      if (button instanceof HTMLButtonElement) {
        button.disabled = true;
        button.textContent = "Cancelling...";
      }
      setFeedback(`Cancelling ${productName}...`);

      const response = await fetch(
        `/api/super-admin/products/${encodeURIComponent(normalizedProductId)}/cancel`,
        {
          method: "PATCH",
          headers: rootHeaders({
            Accept: "application/json",
          }),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "Unable to cancel product in review.");
      }

      state.productRequests = state.productRequests.filter((product) =>
        String(product?.id || "").trim() !== normalizedProductId
      );
      renderProductRequests(state.productRequests);
      setFeedback(data.message || `${productName} cancelled.`, "success");
      void loadAdmins();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to cancel product in review.", "error");
      if (button instanceof HTMLButtonElement) {
        button.disabled = false;
        button.textContent = "Cancel";
      }
    }
  }

  async function loadAdmins() {
    state.loading = true;
    setFeedback("Loading companies...");
    try {
      const response = await fetch("/api/super-admin/admins", {
        cache: "no-store",
        headers: rootHeaders({
          Accept: "application/json",
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "Unable to load companies.");
      }

      state.admins = Array.isArray(data.admins) ? data.admins : [];
      
      // Load followers count for each admin
      await loadFollowersCountForAdmins();
      
      renderAdmins(state.admins);
      if (state.productRequests.length > 0) {
        renderProductRequests(state.productRequests);
      }
      setFeedback("");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to load companies.", "error");
    } finally {
      state.loading = false;
    }
  }

  async function refreshAdminFollowersCounts() {
    if (document.hidden || state.loading || state.activeSection !== "companies" || !state.admins.length) {
      return;
    }

    await loadFollowersCountForAdmins();
    renderAdmins(state.admins);
  }

  function normalizeCompanyActionTargetIds(adminIds) {
    return Array.from(
      new Set(
        (Array.isArray(adminIds) ? adminIds : [adminIds])
          .map((adminId) => String(adminId || "").trim())
          .filter(Boolean),
      ),
    );
  }

  function getCompanyActionTargetIds(primaryAdminId) {
    const normalizedPrimaryId = String(primaryAdminId || "").trim();
    const selectedIds = getSelectedCompanyIds();
    if (normalizedPrimaryId && selectedIds.length > 1 && selectedIds.includes(normalizedPrimaryId)) {
      return selectedIds;
    }
    return normalizeCompanyActionTargetIds(normalizedPrimaryId || selectedIds[0] || "");
  }

  function getCompanyActionTargetLabel(adminIds) {
    const normalizedAdminIds = normalizeCompanyActionTargetIds(adminIds);
    if (normalizedAdminIds.length !== 1) {
      return `${numberText(normalizedAdminIds.length)} companies`;
    }

    const admin = findCompanyById(normalizedAdminIds[0]);
    return admin ? getCompanyName(admin) : normalizedAdminIds[0];
  }

  async function clearAdminData(adminIds) {
    const normalizedAdminIds = normalizeCompanyActionTargetIds(adminIds);
    if (!normalizedAdminIds.length) {
      return;
    }

    const label = getCompanyActionTargetLabel(normalizedAdminIds);
    const confirmed = await confirmDeleteValidationModal(
      normalizedAdminIds.length > 1 ? "Delete selected companies?" : "Delete company data?",
      `Delete all workspace data for ${label}?`,
    );
    if (!confirmed) {
      return;
    }

    setFeedback(`Clearing ${label}...`);
    try {
      for (const normalizedAdminId of normalizedAdminIds) {
        const response = await fetch(
          `/api/super-admin/admins/${encodeURIComponent(normalizedAdminId)}/data`,
          {
            method: "DELETE",
            headers: rootHeaders({
              Accept: "application/json",
            }),
          },
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.message || "Unable to clear admin data.");
        }
      }

      setSelectedCompanies([]);
      setFeedback(
        normalizedAdminIds.length > 1
          ? `${numberText(normalizedAdminIds.length)} company workspaces cleared.`
          : "Admin workspace data cleared.",
        "success",
      );
      await loadAdmins();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to clear admin data.", "error");
    }
  }

  function updateCompanyInState(updatedAdmin) {
    const updatedAdminId = getCompanyId(updatedAdmin);
    if (!updatedAdminId) {
      return;
    }

    state.admins = state.admins.map((admin) =>
      getCompanyId(admin) === updatedAdminId ? { ...admin, ...updatedAdmin } : admin,
    );

    renderAdmins(state.admins);
    if (state.productRequests.length > 0) {
      renderProductRequests(state.productRequests);
    }
  }

  async function performCompanyControlAction(action, adminIds) {
    const normalizedAction = String(action || "").trim().toLowerCase();
    const normalizedAdminIds = normalizeCompanyActionTargetIds(adminIds);
    const label = getCompanyActionTargetLabel(normalizedAdminIds);

    if (!normalizedAdminIds.length) {
      return;
    }

    const confirmations = {
      deactivate: {
        title: normalizedAdminIds.length > 1 ? "Deactivate selected companies?" : "Deactivate company?",
        copy: `${label} will no longer be able to sign in as admin.`,
        actionLabel: "Deactivate",
      },
      ban: {
        title: normalizedAdminIds.length > 1 ? "Ban selected companies?" : "Ban company?",
        copy: `${label} will be banned and blocked from admin sign in.`,
        actionLabel: "Ban",
      },
    };

    const confirmation = confirmations[normalizedAction];
    if (confirmation) {
      const confirmed = await showValidationModal({
        mode: "notice",
        iconVariant: normalizedAction === "ban" ? "delete" : "notice",
        title: confirmation.title,
        copy: confirmation.copy,
        actionLabel: confirmation.actionLabel,
        secondaryActionLabel: "Cancel",
      });
      if (!confirmed) {
        return;
      }
    }

    const progressLabels = {
      notify: `Notifying ${label}...`,
      deactivate: `Deactivating ${label}...`,
      ban: `Banning ${label}...`,
    };
    setFeedback(progressLabels[normalizedAction] || `Updating ${label}...`);

    try {
      const updatedAdmins = [];
      for (const normalizedAdminId of normalizedAdminIds) {
        const response = await fetch(
          `/api/super-admin/admins/${encodeURIComponent(normalizedAdminId)}/action`,
          {
            method: "PATCH",
            headers: rootHeaders({
              Accept: "application/json",
              "Content-Type": "application/json",
            }),
            body: JSON.stringify({ action: normalizedAction }),
          },
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.message || "Unable to update company.");
        }
        if (data.admin) {
          updatedAdmins.push(data.admin);
        }
      }

      if (updatedAdmins.length) {
        for (const updatedAdmin of updatedAdmins) {
          const updatedAdminId = getCompanyId(updatedAdmin);
          state.admins = state.admins.map((admin) =>
            getCompanyId(admin) === updatedAdminId ? { ...admin, ...updatedAdmin } : admin,
          );
        }
        renderAdmins(state.admins);
        if (state.productRequests.length > 0) {
          renderProductRequests(state.productRequests);
        }
      }
      setFeedback(
        normalizedAdminIds.length > 1
          ? `${numberText(normalizedAdminIds.length)} companies updated.`
          : `${label} updated.`,
        "success",
      );
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to update company.", "error");
    }
  }

  async function handleCompanyAction(action, adminId) {
    const normalizedAction = String(action || "").trim().toLowerCase();
    const targetAdminIds = getCompanyActionTargetIds(adminId);

    if (!targetAdminIds.length) {
      return;
    }

    if (normalizedAction === "delete") {
      await clearAdminData(targetAdminIds);
      return;
    }

    if (["notify", "deactivate", "ban", "banned"].includes(normalizedAction)) {
      await performCompanyControlAction(normalizedAction === "banned" ? "ban" : normalizedAction, targetAdminIds);
      return;
    }

    const admin = findCompanyById(targetAdminIds[0]);
    const label = admin ? getCompanyName(admin) : "company";
    setFeedback(`${label} ${normalizedAction.replace(/-/g, " ")} is not available yet.`, "error");
  }

  function applyCompanyFiltersFromControls() {
    const activityFilters = Array.from(document.querySelectorAll("[data-super-admin-filter='activity']:checked"))
      .map((checkbox) => checkbox.value);
    state.companyFilters.activity = activityFilters.length > 0 ? activityFilters.join(",") : "all";

    const sortRadio = document.querySelector("[data-super-admin-sort]:checked");
    if (sortRadio) {
      state.companySort = sortRadio.value;
    }

    state.companyPage = 1;
    syncCompanyFilterSummary();
    renderAdmins();
    toggleFilterDropdown(false);
  }

  function getCompanyActivityFilterLabel(value) {
    if (value === "active") return "Active";
    if (value === "quiet") return "Quiet";
    return "All";
  }

  function getCompanySortLabel(value) {
    const sortLabels = {
      "created-desc": "Newest",
      "company-asc": "Company A-Z",
      "products-desc": "Most products",
      "employees-desc": "Most employees",
      "orders-desc": "Most orders",
    };
    return sortLabels[value] || "Newest";
  }

  function getSelectedCompanyActivityFilters() {
    const selectedControls = Array.from(document.querySelectorAll("[data-super-admin-filter='activity']:checked"))
      .map((checkbox) => checkbox.value)
      .filter(Boolean);
    if (selectedControls.length > 0) {
      return selectedControls;
    }
    return String(state.companyFilters.activity || "all")
      .split(",")
      .map((value) => value.trim())
      .filter((value) => value && value !== "all");
  }

  function syncCompanyFilterSummary() {
    if (!elements.filterSummary) {
      return;
    }

    const activityFilters = getSelectedCompanyActivityFilters();
    const activityLabel = activityFilters.length > 0
      ? activityFilters.map(getCompanyActivityFilterLabel).join(", ")
      : "All";
    const sortControl = document.querySelector("[data-super-admin-sort]:checked");
    const sortLabel = getCompanySortLabel(sortControl?.value || state.companySort);
    elements.filterSummary.textContent = `${activityLabel}, ${sortLabel}`;
  }

  function setCompanyActionMenuOpen(dropdown, isOpen) {
    if (!(dropdown instanceof HTMLElement)) {
      return;
    }

    const menu = dropdown.querySelector("[data-company-action-menu]");
    const toggle = dropdown.querySelector("[data-company-action-menu-toggle]");
    dropdown.classList.toggle("is-open", Boolean(isOpen));
    if (menu instanceof HTMLElement) {
      menu.hidden = !isOpen;
    }
    if (toggle instanceof HTMLButtonElement) {
      toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    }
  }

  function closeCompanyActionMenus(exceptDropdown = null) {
    const dropdowns = Array.from(elements.list?.querySelectorAll(".super-admin-company-card__action-dropdown") || []);
    for (const dropdown of dropdowns) {
      if (dropdown === exceptDropdown) {
        continue;
      }
      setCompanyActionMenuOpen(dropdown, false);
    }
  }

  function getCompanyActionMenuItems(menu) {
    return Array.from(menu?.querySelectorAll("[data-company-action]") || []).filter((item) =>
      item instanceof HTMLElement && !item.hidden,
    );
  }

  function focusCompanyActionMenuItem(menu, nextIndex = 0) {
    const items = getCompanyActionMenuItems(menu);
    if (!items.length) {
      return;
    }
    const normalizedIndex = ((nextIndex % items.length) + items.length) % items.length;
    items[normalizedIndex].focus();
  }

  function openCompanyCardActionMenu(card, options = {}) {
    if (!(card instanceof HTMLElement)) {
      return;
    }

    const dropdown = card.querySelector(".super-admin-company-card__action-dropdown");
    if (!(dropdown instanceof HTMLElement)) {
      return;
    }

    const adminId = String(card.dataset.companyId || "").trim();
    if (adminId) {
      if (!isCompanySelected(adminId)) {
        setSelectedCompanies([adminId], { activeCompanyId: adminId });
      } else {
        state.selectedCompanyId = getSelectedCompanyIds().length > 1 ? "" : adminId;
        syncCompanyCardSelection();
      }
    }

    closeCompanyActionMenus(dropdown);
    syncCompanyActionItemsForSelection(card, adminId);
    setCompanyActionMenuOpen(dropdown, true);

    if (options.focusFirst === true) {
      const menu = dropdown.querySelector("[data-company-action-menu]");
      window.requestAnimationFrame(() => focusCompanyActionMenuItem(menu, 0));
    }
  }

  function handleCompanyActionMenuKeydown(event) {
    if (!(event.target instanceof Element)) {
      return false;
    }

    const menu = event.target.closest("[data-company-action-menu]");
    if (!(menu instanceof HTMLElement)) {
      return false;
    }

    const items = getCompanyActionMenuItems(menu);
    const currentIndex = items.findIndex((item) => item === event.target);
    if (!items.length) {
      return false;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      event.stopPropagation();
      focusCompanyActionMenuItem(menu, currentIndex + 1);
      return true;
    }

    if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      event.stopPropagation();
      focusCompanyActionMenuItem(menu, currentIndex - 1);
      return true;
    }

    if (event.key === "Home") {
      event.preventDefault();
      event.stopPropagation();
      focusCompanyActionMenuItem(menu, 0);
      return true;
    }

    if (event.key === "End") {
      event.preventDefault();
      event.stopPropagation();
      focusCompanyActionMenuItem(menu, items.length - 1);
      return true;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      const dropdown = menu.closest(".super-admin-company-card__action-dropdown");
      const card = menu.closest(".super-admin-company-card");
      setCompanyActionMenuOpen(dropdown, false);
      if (card instanceof HTMLElement) {
        card.focus();
      }
      return true;
    }

    return false;
  }

  function getCompanyGridColumnCount() {
    if (!(elements.list instanceof HTMLElement)) {
      return 1;
    }

    const columns = window.getComputedStyle(elements.list).gridTemplateColumns;
    const count = String(columns || "")
      .split(" ")
      .filter(Boolean).length;
    return Math.max(1, count || 1);
  }

  function focusAdjacentCompanyCard(card, direction) {
    const cards = Array.from(elements.list?.querySelectorAll(".super-admin-company-card") || []).filter(
      (candidate) => candidate instanceof HTMLElement,
    );
    const currentIndex = cards.indexOf(card);
    if (currentIndex < 0) {
      return;
    }

    const columnCount = getCompanyGridColumnCount();
    const offsets = {
      ArrowRight: 1,
      ArrowLeft: -1,
      ArrowDown: columnCount,
      ArrowUp: -columnCount,
    };
    const nextIndex = currentIndex + (offsets[direction] || 0);
    const nextCard = cards[nextIndex];
    if (nextCard instanceof HTMLElement) {
      nextCard.focus();
    }
  }

  function setCompanyView(viewMode) {
    const nextViewMode = viewMode === "list" ? "list" : "grid";
    state.companyView = nextViewMode;
    if (nextViewMode === "list") {
      closeCompanyDrawer();
    }
    for (const button of elements.companyViewButtons) {
      const isActive = button.dataset.superAdminView === nextViewMode;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    }
    renderAdmins();
  }

  function setStoreTypeView(viewMode) {
    const nextViewMode = viewMode === "list" ? "list" : "grid";
    state.storeTypeView = nextViewMode;
    for (const button of elements.storeTypeViewButtons) {
      const isActive = button.dataset.superAdminStoreTypeView === nextViewMode;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    }
    renderStoreTypes();
  }

  function signOutRoot() {
    setSuperAdminStatusOffline();
    window.sessionStorage.removeItem(sessionKey);
    window.location.replace(loginPath);
  }

  for (const navItem of elements.sectionNavItems) {
    navItem.addEventListener("click", (event) => {
      event.preventDefault();
      setActiveSection(navItem.dataset.superAdminSectionTarget);
      setSuperAdminNavOpen(false);
    });
  }

  elements.navToggle?.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSuperAdminNav();
  });

  elements.navBackdrop?.addEventListener("click", () => {
    setSuperAdminNavOpen(false);
  });

  elements.sidebar?.addEventListener("click", (event) => {
    const navLink = event.target instanceof Element
      ? event.target.closest(".dashboard-nav__item")
      : null;
    if (navLink && !navLink.hasAttribute("data-root-sign-out")) {
      setSuperAdminNavOpen(false);
    }
  });

  for (const button of elements.signOutButtons) {
    button.addEventListener("click", signOutRoot);
  }

  window.addEventListener("storage", (event) => {
    if (event.key === "gms-admin-account-updated-at" && !state.loading) {
      void loadAdmins();
    }
  });

  if (elements.list) {
    elements.list.addEventListener("click", (event) => {
      if (!(event.target instanceof Element)) {
        return;
      }

      const menuToggle = event.target.closest("[data-company-action-menu-toggle]");
      if (menuToggle instanceof HTMLButtonElement) {
        const dropdown = menuToggle.closest(".super-admin-company-card__action-dropdown");
        const card = menuToggle.closest(".super-admin-company-card");
        const shouldOpen = menuToggle.getAttribute("aria-expanded") !== "true";
        closeCompanyActionMenus(dropdown);
        syncCompanyActionItemsForSelection(card, card?.dataset.companyId);
        setCompanyActionMenuOpen(dropdown, shouldOpen);
        event.stopPropagation();
        return;
      }

      const actionItem = event.target.closest("[data-company-action]");
      if (actionItem instanceof HTMLElement) {
        closeCompanyActionMenus();
        if (actionItem instanceof HTMLAnchorElement && actionItem.href) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        const actionAdminId =
          actionItem.dataset.companyId ||
          actionItem.dataset.clearAdminId ||
          actionItem.closest(".super-admin-company-card")?.dataset.companyId ||
          "";
        void handleCompanyAction(actionItem.dataset.companyAction, actionAdminId);
        return;
      }

      const card = event.target.closest(".super-admin-company-card");
      if (
        card instanceof HTMLElement &&
        (event.ctrlKey || event.metaKey) &&
        !event.target.closest("a, button, input, select, textarea, [role='menuitem']")
      ) {
        event.preventDefault();
        event.stopPropagation();
        toggleCompanySelection(card.dataset.companyId);
        return;
      }

      if (state.companyView !== "list") {
        if (card instanceof HTMLElement) {
          setSelectedCompanies([card.dataset.companyId], { activeCompanyId: card.dataset.companyId });
          openCompanyDrawer(card.dataset.companyId);
        }
      }
    });

    elements.list.addEventListener("contextmenu", (event) => {
      if (!(event.target instanceof Element)) {
        return;
      }

      if (event.target.closest("[data-company-action-menu]")) {
        return;
      }

      const card = event.target.closest(".super-admin-company-card");
      if (!(card instanceof HTMLElement)) {
        return;
      }

      event.preventDefault();
      if (!isCompanySelected(card.dataset.companyId)) {
        setSelectedCompanies([card.dataset.companyId], { activeCompanyId: card.dataset.companyId });
      }
      openCompanyCardActionMenu(card, { focusFirst: true });
    });

    elements.list.addEventListener("keydown", (event) => {
      if (handleCompanyActionMenuKeydown(event)) {
        return;
      }

      if (!(event.target instanceof Element)) {
        return;
      }

      if (event.target.closest("[data-company-action], [data-company-action-menu-toggle]")) {
        return;
      }

      const card = event.target.closest(".super-admin-company-card");
      if (!(card instanceof HTMLElement)) {
        return;
      }

      if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
        event.preventDefault();
        if (!isCompanySelected(card.dataset.companyId)) {
          setSelectedCompanies([card.dataset.companyId], { activeCompanyId: card.dataset.companyId });
        }
        openCompanyCardActionMenu(card, { focusFirst: true });
        return;
      }

      if ((event.ctrlKey || event.metaKey) && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        toggleCompanySelection(card.dataset.companyId);
        return;
      }

      if (state.companyView === "list") {
        return;
      }

      if (["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].includes(event.key)) {
        event.preventDefault();
        focusAdjacentCompanyCard(card, event.key);
        return;
      }

      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        setSelectedCompanies([card.dataset.companyId], { activeCompanyId: card.dataset.companyId });
        openCompanyDrawer(card.dataset.companyId);
      }
    });
  }

  elements.companyDrawerClose?.addEventListener("click", closeCompanyDrawer);
  elements.companyDrawerBackdrop?.addEventListener("click", closeCompanyDrawer);
  elements.companyDrawer?.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }

    const actionItem = event.target.closest("[data-company-action]");
    if (actionItem instanceof HTMLElement) {
      if (actionItem instanceof HTMLAnchorElement && actionItem.href) {
        return;
      }
      event.preventDefault();
      const actionAdminId =
        actionItem.dataset.companyId ||
        actionItem.dataset.clearAdminId ||
        state.selectedCompanyId ||
        "";
      void handleCompanyAction(actionItem.dataset.companyAction, actionAdminId);
    }
  });

  elements.paymentPartnerDrawerClose?.addEventListener("click", closeIntegratedDrawers);
  elements.paymentPartnerDrawerBackdrop?.addEventListener("click", closeIntegratedDrawers);
  elements.deliveryPartnerDrawerClose?.addEventListener("click", closeIntegratedDrawers);
  elements.deliveryPartnerDrawerBackdrop?.addEventListener("click", closeIntegratedDrawers);
  elements.userDataDrawerClose?.addEventListener("click", closeIntegratedDrawers);
  elements.userDataDrawerBackdrop?.addEventListener("click", closeIntegratedDrawers);

  for (const drawer of [elements.paymentPartnerDrawer, elements.deliveryPartnerDrawer]) {
    drawer?.addEventListener("click", (event) => {
      if (!(event.target instanceof Element)) {
        return;
      }
      const actionButton = event.target.closest("[data-integrated-partner-action]");
      if (!(actionButton instanceof HTMLButtonElement)) {
        return;
      }
      const type = actionButton.dataset.integratedPartnerType;
      const partnerId = actionButton.dataset.integratedPartnerId;
      const action = actionButton.dataset.integratedPartnerAction;
      const partner = findIntegratedPartner(type, partnerId);
      if (!partner) {
        return;
      }
      if (action === "toggle") {
        void updateIntegratedPartnerActiveState(type, partnerId, !readIntegratedEnabledFlag(partner));
        return;
      }
      if (action === "delete") {
        void deleteIntegratedPartner(type, partnerId);
      }
    });
  }

  elements.productRequestList?.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }

    const menuToggle = event.target.closest("[data-product-request-menu-toggle]");
    if (menuToggle instanceof HTMLButtonElement) {
      const actions = menuToggle.closest(".super-admin-product-request-card__actions");
      const shouldOpen = menuToggle.getAttribute("aria-expanded") !== "true";
      closeProductRequestMenus(actions);
      setProductRequestMenuOpen(actions, shouldOpen);
      event.stopPropagation();
      return;
    }

    const actionButton = event.target.closest("[data-product-request-action]");
    if (!(actionButton instanceof HTMLButtonElement)) {
      return;
    }

    const action = actionButton.dataset.productRequestAction;
    const productId = actionButton.dataset.productId;
    closeProductRequestMenus();
    event.stopPropagation();
    if (action === "cancel") {
      void cancelProductRequest(productId, actionButton);
      return;
    }
    if (action === "approve") {
      void approveProductRequest(productId, actionButton);
    }
  });

  elements.productRequestList?.addEventListener("pointerover", (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }

    const companyNameTrigger = event.target.closest(".super-admin-product-request-card__company-name-trigger");
    if (!(companyNameTrigger instanceof HTMLElement)) {
      return;
    }

    const card = companyNameTrigger.closest(".super-admin-product-request-card");
    openCompanyPopoverForCard(card);
  });

  elements.productRequestList?.addEventListener("pointerout", (event) => {
    if (!(event.target instanceof Element) || !(activeCompanyPopoverCard instanceof HTMLElement)) {
      return;
    }

    const relatedTarget = event.relatedTarget;
    if (relatedTarget instanceof Node && activeCompanyPopoverCard.contains(relatedTarget)) {
      clearCompanyPopoverCloseTimer();
      return;
    }

    if (activeCompanyPopoverCard.contains(event.target)) {
      scheduleCompanyPopoverClose(activeCompanyPopoverCard);
    }
  });

  elements.productRequestList?.addEventListener("focusin", (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }

    const companyNameTrigger = event.target.closest(".super-admin-product-request-card__company-name-trigger");
    const card = companyNameTrigger?.closest(".super-admin-product-request-card");
    openCompanyPopoverForCard(card);
  });

  elements.productRequestList?.addEventListener("focusout", (event) => {
    if (!(activeCompanyPopoverCard instanceof HTMLElement)) {
      return;
    }

    const relatedTarget = event.relatedTarget;
    if (relatedTarget instanceof Node && activeCompanyPopoverCard.contains(relatedTarget)) {
      return;
    }

    scheduleCompanyPopoverClose(activeCompanyPopoverCard);
  });

  document.addEventListener("click", (event) => {
    if (
      event.target instanceof Element &&
      !event.target.closest(".super-admin-product-request-card__actions")
    ) {
      closeProductRequestMenus();
    }
  });

  document.addEventListener("click", clearCompanySelectionFromOutsideClick);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeProductRequestMenus();
      closeCompanyActionMenus();
      toggleFilterDropdown(false);
      toggleProductRequestFilterDropdown(false);
      toggleColorPicker(false);
      toggleNotificationPanel(false);
      closeCompanyDrawer();
      closeIntegratedDrawers();
      setSuperAdminNavOpen(false);
    }
  });

  elements.companySearch?.addEventListener("input", () => {
    window.clearTimeout(companySearchTimer);
    companySearchTimer = window.setTimeout(() => {
      state.companySearchTerm = String(elements.companySearch?.value || "");
      state.companyPage = 1;
      renderAdmins();
    }, 500);
  });

  elements.storeTypeSearch?.addEventListener("input", () => {
    window.clearTimeout(storeTypeSearchTimer);
    storeTypeSearchTimer = window.setTimeout(() => {
      state.storeTypeSearchTerm = String(elements.storeTypeSearch?.value || "");
      renderStoreTypes();
    }, 300);
  });

  elements.paymentPartnerSearch?.addEventListener("input", () => {
    window.clearTimeout(paymentPartnerSearchTimer);
    paymentPartnerSearchTimer = window.setTimeout(() => {
      state.paymentPartnerSearchTerm = String(elements.paymentPartnerSearch?.value || "");
      renderIntegratedPartners("payment");
    }, 300);
  });

  elements.deliveryPartnerSearch?.addEventListener("input", () => {
    window.clearTimeout(deliveryPartnerSearchTimer);
    deliveryPartnerSearchTimer = window.setTimeout(() => {
      state.deliveryPartnerSearchTerm = String(elements.deliveryPartnerSearch?.value || "");
      renderIntegratedPartners("delivery");
    }, 300);
  });

  elements.userDataSearch?.addEventListener("input", () => {
    window.clearTimeout(userDataSearchTimer);
    userDataSearchTimer = window.setTimeout(() => {
      state.userDataSearchTerm = String(elements.userDataSearch?.value || "");
      renderUserAccounts();
    }, 300);
  });

  elements.productRequestSearch?.addEventListener("input", () => {
    window.clearTimeout(productRequestSearchTimer);
    productRequestSearchTimer = window.setTimeout(() => {
      state.productRequestSearchTerm = String(elements.productRequestSearch?.value || "");
      renderProductRequests();
    }, 300);
  });

  for (const filter of elements.productRequestFilters) {
    filter.addEventListener("change", () => {
      if (!filter.checked) {
        return;
      }
      state.productRequestFilter = String(filter.value || "all");
      syncProductRequestFilterSummary();
      renderProductRequests();
      toggleProductRequestFilterDropdown(false);
    });
  }

  elements.applyCompanyFilters?.addEventListener("click", applyCompanyFiltersFromControls);

  for (const select of elements.companyFilters) {
    select.addEventListener("change", syncCompanyFilterSummary);
    select.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        applyCompanyFiltersFromControls();
      }
    });
  }

  function toggleFilterDropdown(show) {
    const dropdown = elements.filterDropdownToggle;
    const panel = elements.filterDropdownPanel;
    if (!dropdown || !panel) return;

    const shouldShow = show === undefined ? dropdown.getAttribute("aria-expanded") !== "true" : show;
    dropdown.setAttribute("aria-expanded", String(shouldShow));
    panel.hidden = !shouldShow;
    if (shouldShow) {
      toggleProductRequestFilterDropdown(false);
      toggleColorPicker(false);
      toggleNotificationPanel(false);
    }
  }

  elements.filterDropdownToggle?.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleFilterDropdown();
  });

  function toggleProductRequestFilterDropdown(show) {
    const dropdown = elements.productRequestFilterToggle;
    const panel = elements.productRequestFilterPanel;
    if (!dropdown || !panel) return;

    const shouldShow = show === undefined ? dropdown.getAttribute("aria-expanded") !== "true" : show;
    dropdown.setAttribute("aria-expanded", String(shouldShow));
    panel.hidden = !shouldShow;
    if (shouldShow) {
      toggleFilterDropdown(false);
      toggleColorPicker(false);
      toggleNotificationPanel(false);
    }
  }

  elements.productRequestFilterToggle?.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleProductRequestFilterDropdown();
  });

  document.addEventListener("click", (event) => {
    const dropdown = elements.filterDropdownToggle;
    const panel = elements.filterDropdownPanel;
    if (!dropdown || !panel || dropdown.contains(event.target) || panel.contains(event.target)) return;
    toggleFilterDropdown(false);
    closeCompanyActionMenus();
  });

  document.addEventListener("click", (event) => {
    const dropdown = elements.productRequestFilterToggle;
    const panel = elements.productRequestFilterPanel;
    if (!dropdown || !panel || dropdown.contains(event.target) || panel.contains(event.target)) return;
    toggleProductRequestFilterDropdown(false);
  });

  elements.filterClearBtn?.addEventListener("click", () => {
    document.querySelectorAll("[data-super-admin-filter='activity']").forEach((checkbox) => {
      checkbox.checked = false;
    });
    const defaultSort = document.querySelector("[data-super-admin-sort][value='created-desc']");
    if (defaultSort) defaultSort.checked = true;

    state.companyFilters.activity = "all";
    state.companySort = "created-desc";
    state.companyPage = 1;
    syncCompanyFilterSummary();
    renderAdmins();
  });

  const workspaceColors = [
    "#2563eb",
    "#7c3aed",
    "#db2777",
    "#dc2626",
    "#ea580c",
    "#65a30d",
    "#16a34a",
    "#0891b2",
    "#0f172a",
    "#475569",
  ];

  function getActiveWorkspaceColor() {
    try {
      const theme = window.WebTheme?.loadThemeConfig?.()?.theme || window.WebTheme?.loadTheme?.();
      if (theme && window.WebTheme?.rgbToHex) {
        return window.WebTheme.rgbToHex(theme).toLowerCase();
      }
    } catch (error) {
      // Fall back to the legacy key below.
    }

    try {
      return String(window.localStorage.getItem("gms-workspace-color") || "#2563eb").toLowerCase();
    } catch (error) {
      return "#2563eb";
    }
  }

  function applyWorkspaceColor(color) {
    const normalizedColor = String(color || "").trim().toLowerCase();
    if (!/^#[0-9a-f]{6}$/i.test(normalizedColor)) {
      return;
    }

    try {
      window.localStorage.setItem("gms-workspace-color", normalizedColor);
    } catch (error) {
      // The theme API below still applies the color for this session.
    }

    if (window.WebTheme?.saveThemeConfig && window.WebTheme?.hexToTheme) {
      window.WebTheme.saveThemeConfig({
        mode: "solid",
        theme: window.WebTheme.hexToTheme(normalizedColor),
      });
    } else {
      document.documentElement.style.setProperty("--accent", normalizedColor);
    }

    renderColorOptions();
    setColorPickerOpen(false);
  }

  function renderColorOptions() {
    if (!elements.colorOptions) return;
    elements.colorOptions.innerHTML = "";
    const savedColor = getActiveWorkspaceColor();

    workspaceColors.forEach((color) => {
      const optionButton = document.createElement("button");
      optionButton.type = "button";
      optionButton.className = "super-admin-color-option" + (color.toLowerCase() === savedColor ? " is-selected" : "");
      optionButton.style.backgroundColor = color;
      optionButton.setAttribute("aria-label", `Select ${color} color`);
      optionButton.setAttribute("aria-pressed", color.toLowerCase() === savedColor ? "true" : "false");
      optionButton.setAttribute("title", color);
      optionButton.addEventListener("click", () => applyWorkspaceColor(color));
      elements.colorOptions.appendChild(optionButton);
    });
  }

  function setColorPickerOpen(isOpen) {
    if (!elements.colorBtn || !elements.colorPanel) return;
    elements.colorBtn.setAttribute("aria-expanded", String(Boolean(isOpen)));
    elements.colorPanel.hidden = !isOpen;
    if (isOpen) {
      renderColorOptions();
    }
  }

  function toggleColorPicker(show) {
    const shouldShow = show === undefined ? Boolean(elements.colorPanel?.hidden) : Boolean(show);
    setColorPickerOpen(shouldShow);
    if (shouldShow) {
      toggleFilterDropdown(false);
      toggleProductRequestFilterDropdown(false);
      toggleNotificationPanel(false);
    }
  }

  elements.colorBtn?.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleColorPicker();
  });

  document.addEventListener("click", (event) => {
    const colorBtn = elements.colorBtn;
    const colorPanel = elements.colorPanel;
    if (!colorBtn || !colorPanel || colorBtn.contains(event.target) || colorPanel.contains(event.target)) return;
    toggleColorPicker(false);
  });

  renderColorOptions();

  function updateNotificationCount(count) {
    if (elements.notificationBadge) {
      const normalizedCount = Math.max(0, Number(count) || 0);
      elements.notificationBadge.textContent = numberText(normalizedCount);
      elements.notificationBadge.hidden = normalizedCount <= 0;
    }
  }

  function renderNotificationPanel() {
    if (!elements.notificationList) {
      return;
    }

    elements.notificationList.innerHTML = "";
    const pendingCount = state.productRequests.length;
    if (pendingCount <= 0) {
      const emptyState = document.createElement("div");
      emptyState.className = "empty-state";
      emptyState.textContent = "No notification yet.";
      elements.notificationList.append(emptyState);
      return;
    }

    const item = document.createElement("button");
    item.type = "button";
    item.className = "super-admin-notification-item";
    item.innerHTML = `
      <strong>${numberText(pendingCount)} product${pendingCount === 1 ? "" : "s"} in review</strong>
      <span>Open pending product requests for workspace approval.</span>
    `;
    item.addEventListener("click", () => {
      setNotificationPanelOpen(false);
      setActiveSection("product-requests");
      window.location.hash = "product-requests";
    });
    elements.notificationList.append(item);
  }

  function setNotificationPanelOpen(isOpen) {
    if (!elements.notificationBtn || !elements.notificationPanel) return;
    elements.notificationBtn.setAttribute("aria-expanded", String(Boolean(isOpen)));
    elements.notificationPanel.hidden = !isOpen;
    if (isOpen) {
      renderNotificationPanel();
    }
  }

  function toggleNotificationPanel(show) {
    const shouldShow = show === undefined ? Boolean(elements.notificationPanel?.hidden) : Boolean(show);
    setNotificationPanelOpen(shouldShow);
    if (shouldShow) {
      toggleFilterDropdown(false);
      toggleProductRequestFilterDropdown(false);
      toggleColorPicker(false);
    }
  }

  elements.notificationBtn?.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleNotificationPanel();
  });

  document.addEventListener("click", (event) => {
    const notificationBtn = elements.notificationBtn;
    const notificationPanel = elements.notificationPanel;
    if (
      !notificationBtn ||
      !notificationPanel ||
      notificationBtn.contains(event.target) ||
      notificationPanel.contains(event.target)
    ) {
      return;
    }
    toggleNotificationPanel(false);
  });

  updateNotificationCount(state.productRequests.length);
  renderNotificationPanel();

  // Sort radio buttons (multiple)
  for (const sortRadio of elements.companySort) {
    sortRadio.addEventListener("change", () => {
      state.companySort = String(sortRadio.value || "created-desc");
      state.companyPage = 1;
      syncCompanyFilterSummary();
      renderAdmins();
    });
  }

  for (const button of elements.companyViewButtons) {
    button.addEventListener("click", () => {
      setCompanyView(button.dataset.superAdminView);
    });
  }

  for (const button of elements.storeTypeViewButtons) {
    button.addEventListener("click", () => {
      setStoreTypeView(button.dataset.superAdminStoreTypeView);
    });
  }

  for (const button of getCategoryTriggerButtons()) {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      setCategoryDrawerOpen(elements.categoryPanel?.hidden ?? true, {
        focusTarget: "add",
      });
    });
  }

  for (const button of getStoreTypeTriggerButtons()) {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      setStoreTypeDrawerOpen(elements.storeTypePanel?.hidden ?? true, {
        focusTarget: "add",
      });
    });
  }

  elements.categoryCloseButton?.addEventListener("click", () => {
    setCategoryDrawerOpen(false, { restoreFocus: true });
  });

  elements.storeTypeCloseButton?.addEventListener("click", () => {
    setStoreTypeDrawerOpen(false, { restoreFocus: true });
  });

  elements.addCategoryButton?.addEventListener("click", () => {
    void handleCategorySubmit();
  });

  elements.addStoreTypeButton?.addEventListener("click", () => {
    void handleStoreTypeSubmit();
  });

  elements.cancelCategoryEditButton?.addEventListener("click", () => {
    resetCategoryEditor();
    elements.categoryNameInput?.focus();
  });

  elements.cancelStoreTypeEditButton?.addEventListener("click", () => {
    resetStoreTypeEditor();
    elements.storeTypeNameInput?.focus();
  });

  elements.categoryNameInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void handleCategorySubmit();
    }

    if (event.key === "Escape") {
      event.preventDefault();
      resetCategoryEditor();
    }
  });

  elements.categoryNameInput?.addEventListener("input", () => {
    syncCategoryInputCasing();
  });

  elements.storeTypeNameInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void handleStoreTypeSubmit();
    }

    if (event.key === "Escape") {
      event.preventDefault();
      resetStoreTypeEditor();
    }
  });

  elements.storeTypeNameInput?.addEventListener("input", () => {
    syncStoreTypeInputCasing();
  });

  elements.storeTypeNameInput?.addEventListener("blur", () => {
    syncStoreTypeInputCasing();
  });

  elements.categoryNameInput?.addEventListener("blur", () => {
    syncCategoryInputCasing();
  });

  elements.validationModalActionButton?.addEventListener("click", () => {
    closeValidationModal(true);
  });

  elements.validationModalSecondaryActionButton?.addEventListener("click", () => {
    closeValidationModal(false);
  });

  elements.validationModalCloseButton?.addEventListener("click", () => {
    closeValidationModal(false);
  });

  elements.validationModalOverlay?.addEventListener("click", (event) => {
    if (event.target === elements.validationModalOverlay) {
      closeValidationModal(false);
    }
  });

  document.addEventListener("wheel", blockCategoryDrawerBackgroundScroll, {
    capture: true,
    passive: false,
  });
  document.addEventListener("touchmove", blockCategoryDrawerBackgroundScroll, {
    capture: true,
    passive: false,
  });
  document.addEventListener("keydown", blockCategoryDrawerBackgroundKeyScroll, true);

  document.addEventListener("click", (event) => {
    const isWithinCategoryTrigger = getCategoryTriggerButtons().some((button) =>
      isEventWithinElement(event, button)
    );
    const isWithinStoreTypeTrigger = getStoreTypeTriggerButtons().some((button) =>
      isEventWithinElement(event, button)
    );
    if (
      isCategoryDrawerVisible()
      && !isEventWithinElement(event, elements.categoryPanel)
      && !isWithinCategoryTrigger
    ) {
      setCategoryDrawerOpen(false);
    }
    if (
      isStoreTypeDrawerVisible()
      && !isEventWithinElement(event, elements.storeTypePanel)
      && !isWithinStoreTypeTrigger
    ) {
      setStoreTypeDrawerOpen(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      elements.validationModalOverlay instanceof HTMLElement &&
      !elements.validationModalOverlay.hidden
    ) {
      event.preventDefault();
      closeValidationModal(false);
      return;
    }

    if (event.key === "Escape" && isCategoryDrawerVisible()) {
      setCategoryDrawerOpen(false, { restoreFocus: true });
    }
    if (event.key === "Escape" && isStoreTypeDrawerVisible()) {
      setStoreTypeDrawerOpen(false, { restoreFocus: true });
    }
  });

  const initialHashSection = String(window.location.hash || "").replace(/^#/, "");
  if (sectionNames.has(initialHashSection)) {
    state.activeSection = initialHashSection;
  }
  setActiveSection(state.activeSection);
  syncCompanyFilterSummary();
  syncProductRequestFilterSummary();
  void loadAdmins();
  void loadProductRequests({ quiet: true });
  void loadCategories({ quiet: true });
  void loadStoreTypes({ quiet: true });
  window.setInterval(() => {
    void refreshAdminFollowersCounts();
  }, 15000);
})();
