(function () {
  const TOTAL_STEPS = 9;
  const VERIFICATION_RESEND_SECONDS = 45;
  const SIGNUP_VALIDATION_DELAY_MS = 500;
  const MAX_BUSINESS_LOGO_BYTES = 4 * 1024 * 1024;
  const form = document.getElementById("admin-signup-form");
  const feedback = document.getElementById("admin-signup-feedback");
  const progress = document.getElementById("admin-signup-progress");
  const progressLabel = document.getElementById("admin-signup-progress-label");
  const progressFill = document.getElementById("admin-signup-progress-fill");
  const socialOptions = document.querySelector("[data-signup-social]");
  const signInPrompt = document.querySelector(".admin-signup-signin");
  const businessTypeList = document.getElementById("admin-signup-business-types");
  const businessTypeSearchInput = document.querySelector("[data-business-type-search]");
  const verificationInputs = Array.from(
    document.querySelectorAll("[data-verification-inputs] input"),
  );
  const verificationInputGroup = document.querySelector("[data-verification-inputs]");
  const verificationCodePanel = document.querySelector("[data-verification-code-panel]");
  const verificationResendButton = document.querySelector("[data-verification-resend]");
  const verificationSubmitButton = document.querySelector("[data-verification-submit]");
  const verificationSubmitLabel = document.querySelector("[data-verification-submit-label]");
  const passwordStrength = document.querySelector("[data-password-strength]");
  const businessLogoInput = document.querySelector("[data-business-logo-input]");
  const businessLogoPreview = document.querySelector("[data-business-logo-preview]");
  const businessLogoDefault = document.querySelector("[data-business-logo-default]");
  const businessLogoName = document.querySelector("[data-business-logo-name]");
  const businessLogoStatus = document.querySelector("[data-business-logo-status]");
  const businessLogoRemoveButton = document.querySelector("[data-business-logo-remove]");
  const businessLogoSkipButton = document.querySelector("[data-business-logo-skip]");

  if (!(form instanceof HTMLFormElement)) {
    return;
  }

  function syncWorkspaceColorFromSuperAdminPicker() {
    let savedColor = "";
    try {
      savedColor = String(window.localStorage.getItem("gms-workspace-color") || "").trim().toLowerCase();
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

    document.documentElement.style.setProperty("--accent", savedColor);
    document.documentElement.style.setProperty("--accent-text", savedColor);
    document.documentElement.style.setProperty("--accent-strong", savedColor);
    document.documentElement.style.setProperty("--accent-button-bg", savedColor);
    document.documentElement.style.setProperty("--accent-button-hover-bg", savedColor);
    document.documentElement.style.setProperty("--accent-rgb", rgb);
  }

  syncWorkspaceColorFromSuperAdminPicker();
  window.addEventListener("storage", (event) => {
    if (event.key === "gms-workspace-color") {
      syncWorkspaceColorFromSuperAdminPicker();
    }
  });

  const state = {
    currentStep: 1,
    storeTypes: [],
    verificationMode: "email",
    verificationCode: "",
    verificationSent: false,
    verificationVerified: false,
    verificationSkipped: false,
    verificationToken: "",
    googleProfile: null,
    resendAvailableAt: 0,
    resendTimer: 0,
    paymentCard: null,
    paymentSkipped: false,
    selectedStoreType: "",
    businessTypeSearchTerm: "",
    businessLogoFile: null,
    businessLogoPreviewUrl: "",
    businessLogoUploadedUrl: "",
    businessLogoSkipped: false,
    businessLogoSelectionId: 0,
    submissionInProgress: false,
    availabilityCheckId: 0,
    availabilityTimers: {
      email: 0,
      mobileNumber: 0,
    },
  };
  const fieldValidationTimers = new WeakMap();

  function refreshIcons(root = document) {
    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons({ root });
    }
  }

  function getLucideBrowserIcons() {
    return typeof window !== "undefined" && window.lucide?.icons
      ? window.lucide.icons
      : {};
  }

  function getTablerBrowserIcons() {
    return typeof window !== "undefined" && window.tablerIcons?.icons
      ? window.tablerIcons.icons
      : {};
  }

  const tablerIconVendorUrl = "/vendor/tabler-icons.js?v=3.44.0";
  const tablerIconPathCache = new Map();
  const tablerIconUnavailableSlugs = new Set();
  const tablerIconRefreshPendingSlugs = new Set();
  let tablerIconSourceTextPromise = null;
  let tablerIconRefreshQueued = false;

  function createIconSvg(paths) {
    return `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
        ${paths}
      </svg>
    `;
  }

  function normalizeBusinessTypeIconKey(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function normalizeTablerIconName(value) {
    const rawValue = String(value || "").trim().toLowerCase();
    if (!rawValue) {
      return "";
    }
    if (rawValue.startsWith("tabler:")) {
      return `tabler:${normalizeBusinessTypeIconKey(rawValue.slice(7))}`;
    }
    if (rawValue.startsWith("tabler-")) {
      return `tabler:${normalizeBusinessTypeIconKey(rawValue.slice(7))}`;
    }
    return "";
  }

  function getTablerIconSlug(iconName) {
    const tablerIconName = normalizeTablerIconName(iconName);
    return tablerIconName ? tablerIconName.slice(7) : "";
  }

  function getTablerIconPathFromCache(iconSlug) {
    const normalizedSlug = normalizeBusinessTypeIconKey(iconSlug);
    const loadedPath = getTablerBrowserIcons()[normalizedSlug] || "";
    if (loadedPath) {
      tablerIconPathCache.set(normalizedSlug, loadedPath);
      return loadedPath;
    }
    return tablerIconPathCache.get(normalizedSlug) || "";
  }

  function getLucideIconExportName(iconName) {
    const normalizedIconName = normalizeBusinessTypeIconKey(iconName);
    if (!normalizedIconName) {
      return "";
    }
    const pascalName = normalizedIconName
      .split("-")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join("");
    return getLucideBrowserIcons()[pascalName] ? pascalName : "";
  }

  function escapeRegExp(value) {
    return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function decodeTablerIconPath(rawPath) {
    try {
      return JSON.parse(`"${rawPath}"`);
    } catch (error) {
      return "";
    }
  }

  function fetchTablerIconSourceText() {
    if (tablerIconSourceTextPromise) {
      return tablerIconSourceTextPromise;
    }
    tablerIconSourceTextPromise = fetch(tablerIconVendorUrl, { cache: "force-cache" })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Unable to load Tabler icon source.");
        }
        return response.text();
      })
      .catch((error) => {
        tablerIconSourceTextPromise = null;
        throw error;
      });
    return tablerIconSourceTextPromise;
  }

  function ensureTablerIconPaths(iconSlugs = []) {
    const missingIconSlugs = Array.from(new Set(
      iconSlugs
        .map(normalizeBusinessTypeIconKey)
        .filter((iconSlug) => (
          iconSlug &&
          !getTablerIconPathFromCache(iconSlug) &&
          !tablerIconUnavailableSlugs.has(iconSlug)
        )),
    ));
    if (!missingIconSlugs.length) {
      return Promise.resolve(false);
    }

    return fetchTablerIconSourceText().then((sourceText) => {
      let didLoadPath = false;
      for (const iconSlug of missingIconSlugs) {
        const iconPattern = new RegExp(`"${escapeRegExp(iconSlug)}":"((?:\\\\.|[^"\\\\])*)"`);
        const match = iconPattern.exec(sourceText);
        if (!match) {
          tablerIconUnavailableSlugs.add(iconSlug);
          continue;
        }

        const iconPath = decodeTablerIconPath(match[1]);
        if (iconPath) {
          tablerIconPathCache.set(iconSlug, iconPath);
          didLoadPath = true;
        } else {
          tablerIconUnavailableSlugs.add(iconSlug);
        }
      }
      return didLoadPath;
    });
  }

  function requestTablerIconRenderRefresh(iconNames = []) {
    for (const iconName of iconNames) {
      const iconSlug = getTablerIconSlug(iconName) || normalizeBusinessTypeIconKey(iconName);
      if (iconSlug && !getTablerIconPathFromCache(iconSlug) && !tablerIconUnavailableSlugs.has(iconSlug)) {
        tablerIconRefreshPendingSlugs.add(iconSlug);
      }
    }
    if (!tablerIconRefreshPendingSlugs.size || tablerIconRefreshQueued) {
      return;
    }

    const iconSlugs = Array.from(tablerIconRefreshPendingSlugs);
    tablerIconRefreshPendingSlugs.clear();
    tablerIconRefreshQueued = true;
    ensureTablerIconPaths(iconSlugs)
      .then((didLoadPath) => {
        if (didLoadPath) {
          renderBusinessTypes(state.storeTypes);
        }
      })
      .catch(() => {
        iconSlugs.forEach((iconSlug) => tablerIconUnavailableSlugs.add(iconSlug));
      })
      .finally(() => {
        tablerIconRefreshQueued = false;
        if (tablerIconRefreshPendingSlugs.size) {
          requestTablerIconRenderRefresh();
        }
      });
  }

  function hydrateRegisteredBusinessTypeIconPaths(storeTypes = []) {
    const tablerIconSlugs = Array.from(new Set(
      (Array.isArray(storeTypes) ? storeTypes : [])
        .map((storeType) => getTablerIconSlug(storeType?.iconName))
        .filter(Boolean),
    ));
    return ensureTablerIconPaths(tablerIconSlugs).catch(() => false);
  }

  function createRegisteredBusinessTypeIconMarkup(iconName, fallbackIconName = "store") {
    const tablerIconSlug = getTablerIconSlug(iconName);
    if (tablerIconSlug) {
      const tablerIconPath = getTablerIconPathFromCache(tablerIconSlug);
      if (tablerIconPath) {
        return createIconSvg(tablerIconPath);
      }
      requestTablerIconRenderRefresh([tablerIconSlug]);
      return `<i data-lucide="${fallbackIconName}"></i>`;
    }

    const lucideIconName = normalizeBusinessTypeIconKey(iconName) || fallbackIconName;
    const lucideExportName = getLucideIconExportName(lucideIconName);
    if (
      lucideExportName &&
      typeof window !== "undefined" &&
      typeof window.lucide?.createElement === "function"
    ) {
      const svgElement = window.lucide.createElement(getLucideBrowserIcons()[lucideExportName], {
        "aria-hidden": "true",
        focusable: "false",
      });
      return svgElement.outerHTML;
    }

    return `<i data-lucide="${normalizeBusinessTypeIconKey(fallbackIconName) || "store"}"></i>`;
  }

  const fieldSuccessLottiePlayerUrl = "/vendor/lottie.min.js";
  const fieldSuccessAnimationPath = "/animations/check-mark.json";
  const fieldSuccessAnimationSelector = "[data-admin-signup-field-success-lottie]";
  const fieldStatusAnimations = new WeakMap();
  let fieldSuccessLottieLoadPromise = null;

  function ensureFieldSuccessLottiePlayer() {
    if (window.lottie?.loadAnimation) {
      return Promise.resolve(true);
    }

    if (fieldSuccessLottieLoadPromise) {
      return fieldSuccessLottieLoadPromise;
    }

    fieldSuccessLottieLoadPromise = new Promise(function (resolve) {
      const existingScript = document.querySelector(
        `script[src$="${fieldSuccessLottiePlayerUrl}"], script[src*="${fieldSuccessLottiePlayerUrl}?"]`,
      );
      if (existingScript) {
        existingScript.addEventListener("load", function () {
          resolve(Boolean(window.lottie?.loadAnimation));
        }, { once: true });
        existingScript.addEventListener("error", function () {
          resolve(false);
        }, { once: true });
        if (window.lottie?.loadAnimation) {
          resolve(true);
        }
        return;
      }

      const scriptElement = document.createElement("script");
      scriptElement.src = fieldSuccessLottiePlayerUrl;
      scriptElement.async = true;
      scriptElement.addEventListener("load", function () {
        resolve(Boolean(window.lottie?.loadAnimation));
      }, { once: true });
      scriptElement.addEventListener("error", function () {
        resolve(false);
      }, { once: true });
      document.head.appendChild(scriptElement);
    });

    return fieldSuccessLottieLoadPromise;
  }

  function destroyFieldStatusAnimation(status) {
    const animation = fieldStatusAnimations.get(status);
    if (animation?.destroy) {
      animation.destroy();
    }
    fieldStatusAnimations.delete(status);
  }

  function renderFieldSuccessFallback(status) {
    if (!(status instanceof HTMLElement) || !status.isConnected) {
      return;
    }

    status.innerHTML = '<i data-lucide="check-circle-2"></i>';
    refreshIcons(status);
  }

  async function playFieldSuccessAnimation(status) {
    const container = status?.querySelector?.(fieldSuccessAnimationSelector);
    if (!(status instanceof HTMLElement) || !(container instanceof HTMLElement)) {
      return;
    }

    const canUseLottie = await ensureFieldSuccessLottiePlayer();
    if (
      !status.isConnected ||
      !container.isConnected ||
      !status.querySelector(fieldSuccessAnimationSelector)
    ) {
      return;
    }

    if (!canUseLottie || !window.lottie?.loadAnimation) {
      renderFieldSuccessFallback(status);
      return;
    }

    destroyFieldStatusAnimation(status);
    container.innerHTML = "";
    const animation = window.lottie.loadAnimation({
      container,
      renderer: "svg",
      loop: false,
      autoplay: true,
      path: fieldSuccessAnimationPath,
    });
    fieldStatusAnimations.set(status, animation);
  }

  function setFeedback(message = "", mode = "") {
    if (!(feedback instanceof HTMLElement)) {
      return;
    }

    const normalizedMessage = String(message || "").trim();
    feedback.hidden = !normalizedMessage;
    feedback.textContent = normalizedMessage;
    feedback.className = "admin-signup-feedback";
    if (mode) {
      feedback.classList.add(mode);
    }
    form.classList.toggle("has-feedback", Boolean(normalizedMessage));
    const feedbackOffset = normalizedMessage
      ? Math.ceil(feedback.getBoundingClientRect().height + 16)
      : 0;
    form.style.setProperty("--admin-signup-feedback-offset", `${feedbackOffset}px`);
  }

  function getField(name) {
    const field = form.elements.namedItem(name);
    return field instanceof HTMLInputElement ? field : null;
  }

  function getFieldValue(name) {
    return String(getField(name)?.value || "").trim();
  }

  const validationStateClassNames = ["is-success", "is-error"];

  function getValidationField(field) {
    const fieldShell = field?.closest?.(".admin-signup-field");
    return fieldShell instanceof HTMLElement ? fieldShell : null;
  }

  function getValidationControl(field) {
    const fieldShell = getValidationField(field);
    const control = fieldShell?.querySelector(
      ".admin-signup-field__control, .admin-signup-phone-control",
    );
    return control instanceof HTMLElement ? control : null;
  }

  function ensureFieldValidationUi(field) {
    const fieldShell = getValidationField(field);
    const control = getValidationControl(field);
    if (!fieldShell || !control) {
      return null;
    }

    let status = control.querySelector(".admin-signup-field-status");
    if (!(status instanceof HTMLElement)) {
      status = document.createElement("span");
      status.className = "admin-signup-field-status";
      status.setAttribute("aria-hidden", "true");
      const passwordToggle = control.querySelector(".admin-signup-password-toggle");
      if (passwordToggle instanceof HTMLElement) {
        control.insertBefore(status, passwordToggle);
      } else {
        control.append(status);
      }
    }

    let message = fieldShell.querySelector(".admin-signup-field-message");
    if (!(message instanceof HTMLElement)) {
      message = document.createElement("span");
      message.className = "admin-signup-field-message";
      message.setAttribute("aria-live", "polite");
      message.id = `${field.name || "signup-field"}-validation-message`;
      fieldShell.append(message);
    }

    return { fieldShell, status, message };
  }

  function setFieldState(field, mode = "", messageText = "", options = {}) {
    const ui = ensureFieldValidationUi(field);
    if (!ui) {
      return;
    }

    const shouldReuseSuccessAnimation =
      mode === "success" &&
      ui.fieldShell.classList.contains("is-success") &&
      ui.status.querySelector(fieldSuccessAnimationSelector);

    ui.fieldShell.classList.remove(...validationStateClassNames);
    if (!shouldReuseSuccessAnimation) {
      destroyFieldStatusAnimation(ui.status);
      ui.status.innerHTML = "";
    }
    ui.message.textContent = "";
    ui.fieldShell.classList.remove("has-field-message");
    field.removeAttribute("aria-describedby");
    field.removeAttribute("aria-invalid");

    if (!mode) {
      return;
    }

    const icons = {
      success: "check-circle-2",
      error: "circle-alert",
    };

    ui.fieldShell.classList.add(`is-${mode}`);
    if (mode === "success") {
      if (!shouldReuseSuccessAnimation) {
        ui.status.innerHTML = '<span class="admin-signup-field-success-lottie" data-admin-signup-field-success-lottie></span>';
        playFieldSuccessAnimation(ui.status);
      }
    } else {
      ui.status.innerHTML = `<i data-lucide="${icons[mode] || "info"}"></i>`;
    }
    const visibleMessage = options.showMessage
      ? String(messageText || "").trim()
      : "";
    ui.message.textContent = visibleMessage;
    ui.fieldShell.classList.toggle("has-field-message", Boolean(visibleMessage));
    if (visibleMessage) {
      field.setAttribute("aria-describedby", ui.message.id);
    }
    field.setAttribute("aria-invalid", mode === "error" ? "true" : "false");
    refreshIcons(ui.status);
  }

  function clearFieldState(field) {
    setFieldState(field, "");
  }

  function normalizeInlineText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function hasNumber(value) {
    return /\d/.test(String(value || ""));
  }

  function validateShortTextField(field, label, options = {}) {
    if (!(field instanceof HTMLInputElement)) {
      return focusInvalidField(field, `${label} is required.`);
    }
    const minLength = Number.isFinite(options.minLength) ? options.minLength : 2;
    const value = normalizeInlineText(field?.value);
    if (value.length < minLength) {
      const message = `${label} must be at least ${minLength} characters long.`;
      const feedbackMessage = options.feedbackMessage || message;
      const fieldMessage = options.fieldMessage || `Min ${minLength} chars.`;
      return focusInvalidField(field, feedbackMessage, fieldMessage);
    }
    if (options.disallowNumbers && hasNumber(value)) {
      return focusInvalidField(field, `${label} cannot contain numbers.`, "No numbers allowed.");
    }
    field.value = value;
    setFieldState(field, "success", `${label} looks good.`);
    return true;
  }

  function normalizeStoreTypeName(value) {
    return String(value ?? "").replace(/\s+/g, " ").trim();
  }

  function normalizeCategoryValues(values) {
    const source = Array.isArray(values) ? values : [];
    const seen = new Set();
    return source
      .map((value) => String(value ?? "").replace(/\s+/g, " ").trim())
      .filter((value) => {
        const key = value.toLowerCase();
        if (!value || seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });
  }

  function getStepElement(stepNumber) {
    return form.querySelector(`[data-signup-step="${stepNumber}"]`);
  }

  function focusStep(stepElement) {
    const target = stepElement?.querySelector(
      "input:not([type='radio']):not([type='hidden']):not([disabled]), button[data-verification-mode]",
    );
    if (!(target instanceof HTMLElement)) {
      return;
    }

    window.requestAnimationFrame(() => {
      target.focus({ preventScroll: true });
    });
  }

  function renderStep(stepNumber, options = {}) {
    const nextStep = Math.max(1, Math.min(TOTAL_STEPS, Number(stepNumber) || 1));
    state.currentStep = nextStep;

    form.querySelectorAll("[data-signup-step]").forEach((stepElement) => {
      const isActive = Number(stepElement.dataset.signupStep) === nextStep;
      stepElement.hidden = !isActive;
      stepElement.classList.toggle("is-active", isActive);
      const heading = stepElement.querySelector("h2");
      if (heading instanceof HTMLElement) {
        if (isActive) {
          heading.id = "admin-signup-step-title";
        } else {
          heading.removeAttribute("id");
        }
      }
    });

    if (progressLabel) {
      progressLabel.textContent = `Step ${nextStep} of ${TOTAL_STEPS}`;
    }
    if (progress) {
      progress.setAttribute("aria-valuenow", String(nextStep));
    }
    if (progressFill) {
      progressFill.style.width = `${(nextStep / TOTAL_STEPS) * 100}%`;
    }
    if (socialOptions instanceof HTMLElement) {
      socialOptions.hidden = nextStep < 1 || nextStep > 3;
    }
    if (signInPrompt instanceof HTMLElement) {
      signInPrompt.hidden = nextStep !== 1;
    }

    setFeedback("");
    if (nextStep === 4) {
      // Google Sign-In registration always verifies via that Gmail.
      if (state.googleProfile?.email) {
        const emailField = getField("email");
        if (emailField && !String(emailField.value || "").trim()) {
          emailField.value = state.googleProfile.email;
        }
        state.verificationMode = "email";
      }
      updateVerificationModeButtons();
      syncVerificationStepUi();
      updateVerificationResendButton();
      if (state.verificationSent) {
        setVerificationPreviewFeedback();
      } else if (state.googleProfile?.email) {
        void startVerificationDelivery("email");
      }
    }
    if (nextStep === 9) {
      syncBusinessLogoUi();
    }

    const activeStep = getStepElement(nextStep);
    refreshIcons(activeStep || document);
    if (options.focus !== false) {
      focusStep(activeStep);
    }

    if (window.innerWidth <= 920) {
      document.querySelector(".admin-signup-pane")?.scrollIntoView({
        block: "start",
        behavior: options.instant ? "auto" : "smooth",
      });
    }
  }

  function focusInvalidField(field, message, fieldMessage = message, options = {}) {
    setFeedback("");
    if (field instanceof HTMLElement) {
      setFieldState(field, "error", fieldMessage, {
        showMessage: Boolean(options.showMessage),
      });
      if (options.focus !== false) {
        field.focus();
      }
    }
    return false;
  }

  function validateIdentityStep() {
    const firstName = getField("firstName");
    const lastName = getField("lastName");

    if (!validateShortTextField(firstName, "First name", {
      disallowNumbers: true,
      feedbackMessage: "Complete your name to continue.",
    })) {
      return false;
    }
    if (!validateShortTextField(lastName, "Last name", {
      disallowNumbers: true,
      feedbackMessage: "Complete your name to continue.",
    })) {
      return false;
    }
    return true;
  }

  function validateCompanyNameStep() {
    const companyName = getField("companyName");
    return validateShortTextField(companyName, "Company name", {
      minLength: 3,
      fieldMessage: "Min 3 chars.",
    });
  }

  function validateEmailStep() {
    const email = getField("email");
    const value = String(email?.value || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return focusInvalidField(email, "Please enter a valid admin email address.");
    }
    if (email) {
      email.value = value;
      setFieldState(email, "success", "Valid email address.");
    }
    return true;
  }

  function validateMobileStep() {
    const mobile = getField("mobileNumber");
    const value = String(mobile?.value || "").replace(/\D/g, "");
    if (!/^9\d{9}$/.test(value)) {
      return focusInvalidField(mobile, "Mobile number must start with 9 and contain 10 digits.");
    }
    if (mobile) {
      mobile.value = value;
      setFieldState(mobile, "success", "Valid Philippine mobile number.");
    }
    return true;
  }

  function clearSignupAvailabilityTimer(fieldName) {
    const timer = state.availabilityTimers?.[fieldName];
    if (timer) {
      window.clearTimeout(timer);
      state.availabilityTimers[fieldName] = 0;
    }
  }

  function clearSignupFieldValidationTimer(field) {
    const timer = fieldValidationTimers.get(field);
    if (timer) {
      window.clearTimeout(timer);
      fieldValidationTimers.delete(field);
    }
  }

  function resetSignupFieldValidationWhileEditing(field) {
    clearSignupFieldValidationTimer(field);
    clearSignupAvailabilityTimer(field?.name);
    if (field?.name === "email" || field?.name === "mobileNumber") {
      state.availabilityCheckId += 1;
    }
    clearFieldState(field);
  }

  async function checkAdminSignupAvailability(params = {}) {
    const query = new URLSearchParams();
    const email = String(params.email || "").trim().toLowerCase();
    const mobileNumber = String(params.mobileNumber || "").replace(/\D/g, "");
    if (email) {
      query.set("email", email);
    }
    if (mobileNumber) {
      query.set("mobileNumber", mobileNumber);
    }

    const response = await fetch(`/api/admin-signup-availability?${query.toString()}`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || "Unable to check account availability.");
    }
    return data;
  }

  async function validateEmailAvailability(options = {}) {
    if (!validateEmailStep()) {
      return false;
    }

    const email = getField("email");
    const value = String(email?.value || "").trim().toLowerCase();
    const checkId = ++state.availabilityCheckId;
    try {
      const availability = await checkAdminSignupAvailability({ email: value });
      if (checkId !== state.availabilityCheckId) {
        return false;
      }
      if (String(email?.value || "").trim().toLowerCase() !== value) {
        return false;
      }
      if (availability.emailTaken) {
        return focusInvalidField(
          email,
          "Admin email is already registered.",
          "Email already registered.",
          { focus: options.focus !== false, showMessage: true },
        );
      }
      setFieldState(email, "success", "Valid email address.");
      return true;
    } catch (error) {
      setFieldState(email, "success", "Valid email address.");
      return true;
    }
  }

  async function validateMobileAvailability(options = {}) {
    if (!validateMobileStep()) {
      return false;
    }

    const mobile = getField("mobileNumber");
    const value = String(mobile?.value || "").replace(/\D/g, "");
    const checkId = ++state.availabilityCheckId;
    try {
      const availability = await checkAdminSignupAvailability({ mobileNumber: value });
      if (checkId !== state.availabilityCheckId) {
        return false;
      }
      if (String(mobile?.value || "").replace(/\D/g, "") !== value) {
        return false;
      }
      if (availability.mobileTaken) {
        return focusInvalidField(
          mobile,
          "Contact number is already registered.",
          "Mobile already registered.",
          { focus: options.focus !== false, showMessage: true },
        );
      }
      setFieldState(mobile, "success", "Mobile number is available.", { showMessage: true });
      return true;
    } catch (error) {
      setFieldState(mobile, "success", "Valid Philippine mobile number.");
      return true;
    }
  }

  function runDelayedSignupFieldValidation(field, options = {}) {
    if (!(field instanceof HTMLInputElement)) {
      return;
    }

    if (field.name === "email") {
      const isValid = validateSignupFieldForUi(field, { force: Boolean(options.force) });
      if (isValid) {
        void validateEmailAvailability({ focus: false });
      }
      if (isValid && feedback?.classList.contains("error")) {
        setFeedback("");
      }
    } else if (field.name === "mobileNumber") {
      const isValid = validateSignupFieldForUi(field, { force: Boolean(options.force) });
      if (isValid) {
        void validateMobileAvailability({ focus: false });
      }
      if (isValid && feedback?.classList.contains("error")) {
        setFeedback("");
      }
    } else {
      const isValid = validateSignupFieldForUi(field, { force: Boolean(options.force) });
      if (isValid && feedback?.classList.contains("error")) {
        setFeedback("");
      }
    }
  }

  function scheduleSignupFieldValidation(field, options = {}) {
    if (!(field instanceof HTMLInputElement)) {
      return;
    }
    clearSignupFieldValidationTimer(field);
    const timer = window.setTimeout(() => {
      fieldValidationTimers.delete(field);
      runDelayedSignupFieldValidation(field, options);
    }, SIGNUP_VALIDATION_DELAY_MS);
    fieldValidationTimers.set(field, timer);
  }

  function getPasswordStrengthScore(value) {
    const password = String(value || "");
    let score = 0;
    if (password.length >= 8) {
      score += 1;
    }
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) {
      score += 1;
    }
    if (/\d/.test(password)) {
      score += 1;
    }
    if (/[^A-Za-z0-9]/.test(password) || password.length >= 12) {
      score += 1;
    }
    return score;
  }

  function renderPasswordStrength() {
    if (!(passwordStrength instanceof HTMLElement)) {
      return;
    }

    const score = getPasswordStrengthScore(getFieldValue("password"));
    const labels = ["Too weak", "Weak", "Fair", "Strong", "Very strong"];
    passwordStrength.dataset.strength = String(score);
    const label = passwordStrength.querySelector("[data-password-strength-label]");
    if (label) {
      label.textContent = labels[score];
    }
  }

  function updatePasswordValidationState(options = {}) {
    const password = getField("password");
    const passwordValue = String(password?.value || "");
    if (!passwordValue && !options.force) {
      clearFieldState(password);
      return true;
    }
    if (passwordValue.length < 8) {
      setFieldState(password, "error", "Minimum 8 characters required.");
      return false;
    }
    if (!/[A-Za-z]/.test(passwordValue) || !/\d/.test(passwordValue)) {
      setFieldState(password, "error", "Use both letters and numbers in your password.");
      return false;
    }
    if (getPasswordStrengthScore(passwordValue) < 3) {
      setFieldState(password, "success", "Password meets requirements.");
      return true;
    }
    setFieldState(password, "success", "Strong password.");
    return true;
  }

  function updateConfirmPasswordValidationState(options = {}) {
    const password = getField("password");
    const confirmPassword = getField("confirmPassword");
    const passwordValue = String(password?.value || "");
    const confirmValue = String(confirmPassword?.value || "");
    if (!confirmValue && !options.force) {
      clearFieldState(confirmPassword);
      return true;
    }
    if (confirmValue !== passwordValue) {
      setFieldState(confirmPassword, "error", "Password confirmation does not match.");
      return false;
    }
    setFieldState(confirmPassword, "success", "Passwords match.");
    return true;
  }

  function validatePasswordStep() {
    const password = getField("password");
    const confirmPassword = getField("confirmPassword");
    const passwordValue = String(password?.value || "");
    const confirmValue = String(confirmPassword?.value || "");

    if (passwordValue.length < 8) {
      return focusInvalidField(password, "Admin password must be at least 8 characters long.");
    }
    if (!/[A-Za-z]/.test(passwordValue) || !/\d/.test(passwordValue)) {
      return focusInvalidField(password, "Use both letters and numbers in your password.");
    }
    updatePasswordValidationState({ force: true });
    if (passwordValue !== confirmValue) {
      return focusInvalidField(confirmPassword, "Password confirmation does not match.");
    }
    setFieldState(confirmPassword, "success", "Passwords match.");
    return true;
  }

  function getSelectedStoreType() {
    const selected = form.querySelector("input[name='storeType']:checked");
    const selectedStoreType = selected instanceof HTMLInputElement
      ? normalizeStoreTypeName(selected.value)
      : "";
    return selectedStoreType || normalizeStoreTypeName(state.selectedStoreType);
  }

  function validateBusinessTypeStep() {
    if (getSelectedStoreType()) {
      return true;
    }
    setFeedback("");
    const firstVisibleBusinessType = businessTypeList?.querySelector("input[name='storeType']");
    if (firstVisibleBusinessType instanceof HTMLElement) {
      firstVisibleBusinessType.focus();
    } else if (businessTypeSearchInput instanceof HTMLElement) {
      businessTypeSearchInput.focus();
    }
    return false;
  }

  function normalizeCardDigits(value) {
    return String(value || "").replace(/\D/g, "").slice(0, 19);
  }

  function isValidLuhnNumber(value) {
    const digits = normalizeCardDigits(value);
    if (digits.length < 12) {
      return false;
    }

    let total = 0;
    let shouldDouble = false;
    for (let index = digits.length - 1; index >= 0; index -= 1) {
      let digit = Number(digits[index]);
      if (shouldDouble) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      total += digit;
      shouldDouble = !shouldDouble;
    }
    return total % 10 === 0;
  }

  function getCardBrand(cardNumber) {
    const digits = normalizeCardDigits(cardNumber);
    if (/^4/.test(digits)) {
      return "Visa";
    }
    if (/^(5[1-5]|2[2-7])/.test(digits)) {
      return "Mastercard";
    }
    return "Card";
  }

  function getPaymentCardMetadata() {
    const cardNumber = getField("cardNumber");
    const nameOnCard = getField("nameOnCard");
    const cardExpiry = getField("cardExpiry");
    const cardCvv = getField("cardCvv");
    const digits = normalizeCardDigits(cardNumber?.value);
    const cardholderName = String(nameOnCard?.value || "").replace(/\s+/g, " ").trim();
    const expiryValue = String(cardExpiry?.value || "").trim();
    const cvv = String(cardCvv?.value || "").replace(/\D/g, "");
    const hasAnyValue = Boolean(digits || cardholderName || expiryValue || cvv);

    if (!hasAnyValue) {
      [cardNumber, nameOnCard, cardExpiry, cardCvv].forEach(clearFieldState);
      return null;
    }
    if (!isValidLuhnNumber(digits)) {
      focusInvalidField(cardNumber, "Please enter a valid payment card number.");
      return false;
    }
    setFieldState(cardNumber, "success", `${getCardBrand(digits)} card number looks valid.`);
    if (cardholderName.length < 2) {
      focusInvalidField(nameOnCard, "Please enter the cardholder name.");
      return false;
    }
    setFieldState(nameOnCard, "success", "Cardholder name looks good.");

    const expiryMatch = expiryValue.match(/^(0[1-9]|1[0-2])\s*\/\s*(\d{2})$/);
    if (!expiryMatch) {
      focusInvalidField(cardExpiry, "Use MM / YY for the card expiry.");
      return false;
    }
    const expiryMonth = Number(expiryMatch[1]);
    const expiryYear = 2000 + Number(expiryMatch[2]);
    const expiryBoundary = new Date(expiryYear, expiryMonth, 1).getTime();
    if (expiryBoundary <= Date.now()) {
      focusInvalidField(cardExpiry, "This payment card has expired.");
      return false;
    }
    setFieldState(cardExpiry, "success", "Expiry date looks good.");
    if (!/^\d{3,4}$/.test(cvv)) {
      focusInvalidField(cardCvv, "CVV must contain 3 or 4 digits.");
      return false;
    }
    setFieldState(cardCvv, "success", "CVV looks good.");

    return {
      brand: getCardBrand(digits),
      last4: digits.slice(-4),
      cardholderName,
      expiryMonth,
      expiryYear,
    };
  }

  function validatePaymentStep() {
    const paymentCard = getPaymentCardMetadata();
    if (paymentCard === false) {
      return false;
    }
    state.paymentCard = paymentCard;
    state.paymentSkipped = paymentCard === null;
    return true;
  }

  function hasAnyPaymentFieldValue() {
    return ["cardNumber", "nameOnCard", "cardExpiry", "cardCvv"].some((name) => {
      const field = getField(name);
      return Boolean(String(field?.value || "").trim());
    });
  }

  function validatePaymentFieldForUi(field, options = {}) {
    if (!hasAnyPaymentFieldValue()) {
      ["cardNumber", "nameOnCard", "cardExpiry", "cardCvv"].forEach((name) => {
        clearFieldState(getField(name));
      });
      return true;
    }

    const mode = "error";
    if (field.name === "cardNumber") {
      const digits = normalizeCardDigits(field.value);
      if (digits.length < 12) {
        setFieldState(field, mode, "Enter the full card number.");
        return false;
      }
      if (!isValidLuhnNumber(digits)) {
        setFieldState(field, "error", "Please enter a valid payment card number.");
        return false;
      }
      setFieldState(field, "success", `${getCardBrand(digits)} card number looks valid.`);
      return true;
    }

    if (field.name === "nameOnCard") {
      const value = normalizeInlineText(field.value);
      if (value.length < 2) {
        setFieldState(field, mode, "Please enter the cardholder name.");
        return false;
      }
      setFieldState(field, "success", "Cardholder name looks good.");
      return true;
    }

    if (field.name === "cardExpiry") {
      const expiryValue = String(field.value || "").trim();
      const expiryMatch = expiryValue.match(/^(0[1-9]|1[0-2])\s*\/\s*(\d{2})$/);
      if (!expiryMatch) {
        setFieldState(field, mode, "Use MM / YY for the card expiry.");
        return false;
      }
      const expiryBoundary = new Date(2000 + Number(expiryMatch[2]), Number(expiryMatch[1]), 1).getTime();
      if (expiryBoundary <= Date.now()) {
        setFieldState(field, "error", "This payment card has expired.");
        return false;
      }
      setFieldState(field, "success", "Expiry date looks good.");
      return true;
    }

    if (field.name === "cardCvv") {
      const cvv = String(field.value || "").replace(/\D/g, "");
      if (!/^\d{3,4}$/.test(cvv)) {
        setFieldState(field, mode, "CVV must contain 3 or 4 digits.");
        return false;
      }
      setFieldState(field, "success", "CVV looks good.");
      return true;
    }

    return true;
  }

  function validateSignupFieldForUi(field, options = {}) {
    if (!(field instanceof HTMLInputElement)) {
      return true;
    }

    const value = String(field.value || "").trim();
    if (!value && !options.force) {
      clearFieldState(field);
      return true;
    }

    if (field.name === "firstName") {
      if (value.length < 2) {
        setFieldState(field, "error", "Min 2 chars.");
        return false;
      }
      if (hasNumber(value)) {
        setFieldState(field, "error", "No numbers allowed.");
        return false;
      }
      setFieldState(field, "success", "First name looks good.");
      return true;
    }
    if (field.name === "lastName") {
      if (value.length < 2) {
        setFieldState(field, "error", "Min 2 chars.");
        return false;
      }
      if (hasNumber(value)) {
        setFieldState(field, "error", "No numbers allowed.");
        return false;
      }
      setFieldState(field, "success", "Last name looks good.");
      return true;
    }
    if (field.name === "companyName") {
      return normalizeInlineText(field.value).length >= 3
        ? (setFieldState(field, "success", "Company name looks good."), true)
        : (setFieldState(field, "error", "Min 3 chars."), false);
    }
    if (field.name === "email") {
      const emailValue = value.toLowerCase();
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)
        ? (setFieldState(field, "success", "Valid email address."), true)
        : (setFieldState(field, "error", "Please enter a valid admin email address."), false);
    }
    if (field.name === "mobileNumber") {
      const mobileValue = value.replace(/\D/g, "");
      return /^9\d{9}$/.test(mobileValue)
        ? (setFieldState(field, "success", "Valid Philippine mobile number."), true)
        : (setFieldState(field, "error", "Mobile number must start with 9 and contain 10 digits."), false);
    }
    if (field.name === "password") {
      const isValid = updatePasswordValidationState({ force: options.force });
      const confirmPassword = getField("confirmPassword");
      if (String(confirmPassword?.value || "")) {
        updateConfirmPasswordValidationState({ force: options.force });
      }
      return isValid;
    }
    if (field.name === "confirmPassword") {
      return updateConfirmPasswordValidationState({ force: options.force });
    }
    if (["cardNumber", "nameOnCard", "cardExpiry", "cardCvv"].includes(field.name)) {
      return validatePaymentFieldForUi(field, options);
    }

    return true;
  }

  function validateSignupFieldAvailabilityForUi(field) {
    if (!(field instanceof HTMLInputElement)) {
      return;
    }
    if (field.name === "email") {
      void validateEmailAvailability({ focus: false });
    } else if (field.name === "mobileNumber") {
      void validateMobileAvailability({ focus: false });
    }
  }

  function setupFieldValidationUi() {
    form.querySelectorAll(".admin-signup-field input").forEach((field) => {
      if (!(field instanceof HTMLInputElement)) {
        return;
      }
      ensureFieldValidationUi(field);
      field.addEventListener("input", () => {
        resetSignupFieldValidationWhileEditing(field);
        if (feedback?.classList.contains("error")) {
          setFeedback("");
        }
        if (!String(field.value || "").trim()) {
          return;
        }
        scheduleSignupFieldValidation(field, { force: false });
      });
      field.addEventListener("blur", () => {
        field.dataset.validationTouched = "true";
        clearSignupFieldValidationTimer(field);
        clearSignupAvailabilityTimer(field.name);
        if (!String(field.value || "").trim()) {
          clearFieldState(field);
          return;
        }
        scheduleSignupFieldValidation(field, { force: true });
      });
    });
  }

  async function validateStep(stepNumber) {
    if (stepNumber === 1) {
      return validateEmailAvailability();
    }
    if (stepNumber === 2) {
      return validateIdentityStep();
    }
    if (stepNumber === 3) {
      return validateMobileAvailability();
    }
    if (stepNumber === 4) {
      if (!state.verificationVerified) {
        setFeedback("Enter and verify the 6-digit code to continue.", "error");
        verificationInputGroup?.classList.add("is-error");
        verificationInputs.find((input) => !input.value)?.focus();
        return false;
      }
      return true;
    }
    if (stepNumber === 5) {
      return validatePaymentStep();
    }
    if (stepNumber === 6) {
      return validatePasswordStep();
    }
    if (stepNumber === 7) {
      return validateBusinessTypeStep();
    }
    if (stepNumber === 8) {
      return validateCompanyNameStep();
    }
    return true;
  }

  function createVerificationCode() {
    if (window.crypto && typeof window.crypto.getRandomValues === "function") {
      const values = new Uint32Array(1);
      window.crypto.getRandomValues(values);
      return String(100000 + (values[0] % 900000));
    }
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  function getVerificationTarget(mode = state.verificationMode) {
    if (mode === "mobile") {
      const mobile = String(getField("mobileNumber")?.value || "").replace(/\D/g, "");
      return mobile ? `+63 ${mobile}` : "your mobile number";
    }
    return getFieldValue("email") || "your email";
  }

  function setVerificationPreviewFeedback() {
    if (state.currentStep !== 4 || !state.verificationSent) {
      return;
    }
    setFeedback(
      `Code sent to ${getVerificationTarget()}. Check your inbox.`,
      "success",
    );
  }

  function clearVerificationInputs() {
    verificationInputs.forEach((input) => {
      input.value = "";
    });
    verificationInputGroup?.classList.remove("is-error");
  }

  function getEnteredVerificationCode() {
    return verificationInputs.map((input) => input.value).join("");
  }

  async function startVerificationDelivery(mode = state.verificationMode) {
    state.verificationMode = mode === "mobile" ? "mobile" : "email";
    state.verificationVerified = false;
    state.verificationSkipped = false;
    state.verificationToken = "";
    state.verificationCode = "";

    const channel = state.verificationMode;
    const email = getFieldValue("email").toLowerCase();
    const mobileNumber = getFieldValue("mobileNumber").replace(/\D/g, "");

    if (channel === "email" && !email) {
      setFeedback("Enter your email before requesting a verification code.", "error");
      return;
    }
    if (channel === "mobile" && !/^9\d{9}$/.test(mobileNumber)) {
      setFeedback(
        "Enter a valid PH mobile number (10 digits starting with 9).",
        "error",
      );
      return;
    }

    try {
      const response = await fetch("/api/auth/verification/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          purpose: "registration",
          channel,
          email,
          mobileNumber: channel === "mobile" ? `+63${mobileNumber}` : undefined,
          target: channel === "mobile" ? `+63${mobileNumber}` : email,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "Unable to send verification code.");
      }

      state.verificationSent = true;
      state.verificationCode = "";
      state.resendAvailableAt = Date.now() + VERIFICATION_RESEND_SECONDS * 1000;
      clearVerificationInputs();
      updateVerificationModeButtons();
      syncVerificationStepUi({ animateCodePanel: true });
      startVerificationTimer();
      if (channel === "mobile") {
        setFeedback(
          `SMS code sent to ${getVerificationTarget()}. Check your phone.`,
          "success",
        );
      } else if (state.googleProfile?.email) {
        setFeedback(
          `Verification code sent to your Google account (${getVerificationTarget()}). Check inbox/Spam.`,
          "success",
        );
      } else {
        setFeedback(
          `Verification code sent to ${getVerificationTarget()}. Check your Gmail inbox (and Spam).`,
          "success",
        );
      }
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "Unable to send verification code.",
        "error",
      );
    }
  }

  function updateVerificationModeButtons() {
    form.querySelectorAll("[data-verification-mode]").forEach((button) => {
      const isActive = button.dataset.verificationMode === state.verificationMode;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  }

  function restartVerificationCodePanelAnimation() {
    if (!(verificationCodePanel instanceof HTMLElement) || verificationCodePanel.hidden) {
      return;
    }

    verificationCodePanel.classList.remove("is-revealing");
    void verificationCodePanel.offsetWidth;
    verificationCodePanel.classList.add("is-revealing");
  }

  function syncVerificationStepUi(options = {}) {
    const hasSentCode = Boolean(state.verificationSent);
    if (verificationCodePanel instanceof HTMLElement) {
      const wasHidden = verificationCodePanel.hidden;
      verificationCodePanel.hidden = !hasSentCode;
      if (hasSentCode && (wasHidden || options.animateCodePanel)) {
        restartVerificationCodePanelAnimation();
      }
    }
    verificationInputs.forEach((input) => {
      input.disabled = !hasSentCode;
    });
    if (verificationSubmitLabel instanceof HTMLElement) {
      verificationSubmitLabel.textContent = hasSentCode ? "Verify" : "Continue";
    }
    if (verificationSubmitButton instanceof HTMLButtonElement) {
      verificationSubmitButton.setAttribute(
        "aria-label",
        hasSentCode ? "Verify code" : `Continue with ${state.verificationMode} verification`,
      );
    }
  }

  function updateVerificationResendButton() {
    if (!(verificationResendButton instanceof HTMLButtonElement)) {
      return;
    }

    const remainingSeconds = Math.max(
      0,
      Math.ceil((state.resendAvailableAt - Date.now()) / 1000),
    );
    verificationResendButton.disabled = remainingSeconds > 0;
    verificationResendButton.textContent = remainingSeconds > 0
      ? `Resend code (00:${String(remainingSeconds).padStart(2, "0")})`
      : "Resend code";

    if (remainingSeconds === 0 && state.resendTimer) {
      window.clearInterval(state.resendTimer);
      state.resendTimer = 0;
    }
  }

  function startVerificationTimer() {
    if (state.resendTimer) {
      window.clearInterval(state.resendTimer);
    }
    updateVerificationResendButton();
    state.resendTimer = window.setInterval(updateVerificationResendButton, 1000);
  }

  async function verifyEnteredCode() {
    const enteredCode = getEnteredVerificationCode();
    if (!/^\d{6}$/.test(enteredCode)) {
      verificationInputGroup?.classList.add("is-error");
      setFeedback("");
      verificationInputs.find((input) => !input.value)?.focus();
      return;
    }

    const channel = state.verificationMode === "mobile" ? "mobile" : "email";
    const email = getFieldValue("email").toLowerCase();
    const mobileNumber = getFieldValue("mobileNumber").replace(/\D/g, "");

    try {
      const response = await fetch("/api/auth/verification/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          purpose: "registration",
          channel,
          email,
          mobileNumber: channel === "mobile" ? `+63${mobileNumber}` : undefined,
          target: channel === "mobile" ? `+63${mobileNumber}` : email,
          code: enteredCode,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "Incorrect verification code.");
      }

      state.verificationVerified = true;
      state.verificationSkipped = false;
      state.verificationToken = String(data.verificationToken || "").trim();
      if (!state.verificationToken) {
        throw new Error("Verification token missing. Request a new code.");
      }
      setFeedback("Verification complete.", "success");
      window.setTimeout(() => renderStep(5), 220);
    } catch (error) {
      verificationInputGroup?.classList.add("is-error");
      setFeedback(
        error instanceof Error ? error.message : "Unable to verify code.",
        "error",
      );
      verificationInputs[0]?.focus();
      verificationInputs[0]?.select();
    }
  }

  async function handleVerificationSubmit() {
    if (!state.verificationSent) {
      await startVerificationDelivery(state.verificationMode);
      window.requestAnimationFrame(() => {
        verificationInputs[0]?.focus();
      });
      return;
    }

    await verifyEnteredCode();
  }

  function clearPaymentFields() {
    ["cardNumber", "nameOnCard", "cardExpiry", "cardCvv"].forEach((name) => {
      const field = getField(name);
      if (field) {
        field.value = "";
        clearFieldState(field);
      }
    });
    state.paymentCard = null;
    state.paymentSkipped = true;
  }

  function formatBusinessLogoFileSize(sizeBytes) {
    const size = Number(sizeBytes);
    if (!Number.isFinite(size) || size <= 0) {
      return "Image selected";
    }
    if (size < 1024 * 1024) {
      return `${Math.max(1, Math.round(size / 1024))} KB`;
    }
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  function revokeBusinessLogoPreviewUrl() {
    if (!state.businessLogoPreviewUrl) {
      return;
    }
    URL.revokeObjectURL(state.businessLogoPreviewUrl);
    state.businessLogoPreviewUrl = "";
  }

  function syncBusinessLogoUi() {
    const file = state.businessLogoFile instanceof File ? state.businessLogoFile : null;
    const hasSelectedLogo = Boolean(file && state.businessLogoPreviewUrl);

    if (businessLogoPreview instanceof HTMLImageElement) {
      if (hasSelectedLogo) {
        businessLogoPreview.src = state.businessLogoPreviewUrl;
        businessLogoPreview.alt = `${file.name || "Selected"} business logo preview`;
        businessLogoPreview.hidden = false;
      } else {
        businessLogoPreview.removeAttribute("src");
        businessLogoPreview.alt = "Business logo preview";
        businessLogoPreview.hidden = true;
      }
    }
    if (businessLogoDefault instanceof HTMLElement) {
      businessLogoDefault.hidden = hasSelectedLogo;
    }
    if (businessLogoName instanceof HTMLElement) {
      businessLogoName.textContent = hasSelectedLogo
        ? file.name || "Selected business logo"
        : "Default company logo";
    }
    if (businessLogoStatus instanceof HTMLElement) {
      businessLogoStatus.textContent = hasSelectedLogo
        ? `${formatBusinessLogoFileSize(file.size)} image ready to upload when you finish setup.`
        : "PNG, JPG, WEBP, or another image format up to 4 MB.";
    }
    if (businessLogoRemoveButton instanceof HTMLButtonElement) {
      businessLogoRemoveButton.hidden = !hasSelectedLogo;
    }
  }

  function clearBusinessLogoSelection(options = {}) {
    state.businessLogoSelectionId += 1;
    revokeBusinessLogoPreviewUrl();
    state.businessLogoFile = null;
    state.businessLogoUploadedUrl = "";
    state.businessLogoSkipped = options.skipped === true;
    if (businessLogoInput instanceof HTMLInputElement) {
      businessLogoInput.value = "";
    }
    syncBusinessLogoUi();
  }

  function waitForBusinessLogoPreview(previewUrl) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener("load", () => resolve(), { once: true });
      image.addEventListener("error", () => reject(new Error("The selected file is not a readable image.")), {
        once: true,
      });
      image.src = previewUrl;
    });
  }

  async function selectBusinessLogoFile(file) {
    if (!(file instanceof File)) {
      return;
    }
    if (!String(file.type || "").toLowerCase().startsWith("image/")) {
      throw new Error("Please choose an image file for your business logo.");
    }
    if (file.size <= 0) {
      throw new Error("The selected business logo is empty.");
    }
    if (file.size > MAX_BUSINESS_LOGO_BYTES) {
      throw new Error("Business logo must be 4 MB or smaller.");
    }

    const preparedFile =
      typeof window.GMS_SQUARE_IMAGE_CROP?.prepareSquareImageFile === "function"
        ? await window.GMS_SQUARE_IMAGE_CROP.prepareSquareImageFile(file, {
            title: "Crop business logo",
            copy: "Square photos are used as-is. Wider or taller photos can be cropped to a square.",
          })
        : file;
    if (!(preparedFile instanceof File)) {
      return;
    }

    const selectionId = state.businessLogoSelectionId + 1;
    state.businessLogoSelectionId = selectionId;
    const previewUrl = URL.createObjectURL(preparedFile);
    try {
      await waitForBusinessLogoPreview(previewUrl);
    } catch (error) {
      URL.revokeObjectURL(previewUrl);
      throw error;
    }
    if (selectionId !== state.businessLogoSelectionId) {
      URL.revokeObjectURL(previewUrl);
      return;
    }

    revokeBusinessLogoPreviewUrl();
    state.businessLogoFile = preparedFile;
    state.businessLogoPreviewUrl = previewUrl;
    state.businessLogoUploadedUrl = "";
    state.businessLogoSkipped = false;
    syncBusinessLogoUi();
  }

  function getBusinessLogoHeaderFileName(file) {
    return String(file?.name || "business-logo")
      .replace(/[\r\n]/g, "")
      .replace(/[^\x20-\x7e]/g, "_") || "business-logo";
  }

  async function uploadSelectedBusinessLogo() {
    if (state.businessLogoUploadedUrl) {
      return state.businessLogoUploadedUrl;
    }
    const file = state.businessLogoFile instanceof File ? state.businessLogoFile : null;
    if (!file) {
      return "";
    }

    setFeedback("Uploading your business logo...");
    let response;
    try {
      response = await fetch("/api/uploads", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": file.type || "application/octet-stream",
          "X-File-Name": getBusinessLogoHeaderFileName(file),
        },
        body: file,
      });
    } catch (error) {
      throw new Error("Unable to upload the business logo. Check your connection and try again.");
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || "Unable to upload the business logo.");
    }
    const uploadedUrl = String(data.imageUrl || data.mediaUrl || "").trim();
    if (!uploadedUrl) {
      throw new Error("The business logo upload did not return an image URL.");
    }

    state.businessLogoUploadedUrl = uploadedUrl;
    return uploadedUrl;
  }

  function setSignupSubmissionBusy(isBusy) {
    state.submissionInProgress = Boolean(isBusy);
    const logoStep = getStepElement(9);
    logoStep?.querySelectorAll("button, input").forEach((control) => {
      if (control instanceof HTMLButtonElement || control instanceof HTMLInputElement) {
        control.disabled = state.submissionInProgress;
      }
    });
  }

  function normalizeStoreTypeDetail(value) {
    const source = value && typeof value === "object" ? value : { name: value };
    const name = normalizeStoreTypeName(
      source.name ?? source.storeType ?? source.storeTypeName ?? source.businessType,
    );
    if (!name) {
      return null;
    }
    return {
      name,
      categories: normalizeCategoryValues(source.categories),
      heroImageUrl: String(source.heroImageUrl ?? source.imageUrl ?? "").trim(),
      iconImageUrl: String(source.iconImageUrl ?? source.iconUrl ?? "").trim(),
      iconName: String(source.iconName ?? "").trim(),
    };
  }

  function getBusinessTypeFallbackIcon(storeType) {
    const searchText = `${storeType.name} ${storeType.iconName}`.toLowerCase();
    if (/hardware|tool|hammer/.test(searchText)) {
      return "hammer";
    }
    if (/restaurant|food|hotel|meal|fork|utensil/.test(searchText)) {
      return "utensils";
    }
    if (/wellness|health|clinic|heart/.test(searchText)) {
      return "heart-pulse";
    }
    if (/wholesale|warehouse|bulk/.test(searchText)) {
      return "package-open";
    }
    return "store";
  }

  function getBusinessTypeCategorySummary(categories) {
    if (!categories.length) {
      return "No categories configured yet";
    }
    if (categories.length <= 2) {
      return categories.join(", ");
    }
    return `${categories.slice(0, 2).join(", ")} +${categories.length - 2} more`;
  }

  function getBusinessTypeSearchText(storeType) {
    return [
      storeType?.name,
      storeType?.iconName,
      ...(Array.isArray(storeType?.categories) ? storeType.categories : []),
    ]
      .join(" ")
      .toLowerCase();
  }

  function renderBusinessTypes(storeTypes) {
    if (!(businessTypeList instanceof HTMLElement)) {
      return;
    }
    businessTypeList.innerHTML = "";

    const sourceStoreTypes = Array.isArray(storeTypes) ? storeTypes : [];
    const searchTerm = String(state.businessTypeSearchTerm || "").trim().toLowerCase();
    const visibleStoreTypes = searchTerm
      ? sourceStoreTypes.filter((storeType) => getBusinessTypeSearchText(storeType).includes(searchTerm))
      : sourceStoreTypes;

    if (!sourceStoreTypes.length) {
      const emptyState = document.createElement("p");
      emptyState.className = "admin-signup-business-types__empty";
      emptyState.textContent = "No active Business Types are available. Add one in Super Admin first.";
      businessTypeList.append(emptyState);
      return;
    }

    if (!visibleStoreTypes.length) {
      const emptyState = document.createElement("p");
      emptyState.className = "admin-signup-business-types__empty";
      emptyState.textContent = "No Business Types match your search.";
      businessTypeList.append(emptyState);
      return;
    }

    visibleStoreTypes.forEach((storeType, index) => {
      const label = document.createElement("label");
      label.className = "admin-signup-business-type";

      const input = document.createElement("input");
      input.type = "radio";
      input.name = "storeType";
      input.value = storeType.name;
      input.checked = normalizeStoreTypeName(state.selectedStoreType) === storeType.name;
      input.required = true;
      input.addEventListener("change", () => {
        state.selectedStoreType = storeType.name;
        setFeedback("");
      });

      const media = document.createElement("span");
      media.className = "admin-signup-business-type__media";
      const fallbackIconName = getBusinessTypeFallbackIcon(storeType);
      const imageUrl = storeType.iconImageUrl;
      if (imageUrl) {
        const image = document.createElement("img");
        image.src = imageUrl;
        image.alt = "";
        image.loading = index < 4 ? "eager" : "lazy";
        image.addEventListener("error", () => {
          media.innerHTML = createRegisteredBusinessTypeIconMarkup(storeType.iconName, fallbackIconName);
          refreshIcons(media);
        });
        media.append(image);
      } else {
        media.innerHTML = createRegisteredBusinessTypeIconMarkup(storeType.iconName, fallbackIconName);
      }

      const copy = document.createElement("span");
      copy.className = "admin-signup-business-type__copy";
      const name = document.createElement("span");
      name.className = "admin-signup-business-type__name";
      name.textContent = storeType.name;
      const categories = document.createElement("span");
      categories.className = "admin-signup-business-type__categories";
      categories.textContent = getBusinessTypeCategorySummary(storeType.categories);
      copy.append(name, categories);

      const check = document.createElement("span");
      check.className = "admin-signup-business-type__check";
      check.setAttribute("aria-hidden", "true");
      check.innerHTML = '<i data-lucide="check"></i>';

      label.append(input, media, copy, check);
      businessTypeList.append(label);
    });

    refreshIcons(businessTypeList);
  }

  async function loadStoreTypes() {
    if (!(businessTypeList instanceof HTMLElement)) {
      return;
    }

    try {
      const response = await fetch("/api/store-types", {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "Unable to load Business Types.");
      }

      const rawStoreTypes = Array.isArray(data.storeTypeDetails) && data.storeTypeDetails.length
        ? data.storeTypeDetails
        : Array.isArray(data.storeTypes)
          ? data.storeTypes
          : [];
      const seen = new Set();
      state.storeTypes = rawStoreTypes
        .map(normalizeStoreTypeDetail)
        .filter((storeType) => {
          const key = storeType?.name.toLowerCase();
          if (!storeType || seen.has(key)) {
            return false;
          }
          seen.add(key);
          return true;
        });
      await hydrateRegisteredBusinessTypeIconPaths(state.storeTypes);
      renderBusinessTypes(state.storeTypes);
    } catch (error) {
      renderBusinessTypes([]);
      setFeedback(
        error instanceof Error ? error.message : "Unable to load Business Types.",
        "error",
      );
    }
  }

  function getPayload() {
    const companyName = getFieldValue("companyName").replace(/\s+/g, " ");
    const storeType = getSelectedStoreType();
    return {
      companyName,
      storeName: companyName,
      firstName: getFieldValue("firstName"),
      lastName: getFieldValue("lastName"),
      email: getFieldValue("email").toLowerCase(),
      countryCode: "+63",
      mobileNumber: getFieldValue("mobileNumber").replace(/\D/g, ""),
      password: String(getField("password")?.value || ""),
      confirmPassword: String(getField("confirmPassword")?.value || ""),
      storeType,
      storeTypeName: storeType,
      businessType: storeType,
      emailVerified: state.verificationVerified && state.verificationMode === "email",
      mobileVerified: state.verificationVerified && state.verificationMode === "mobile",
      verificationSkipped: false,
      verificationChannel: state.verificationVerified ? state.verificationMode : "",
      verificationToken: state.verificationToken,
      googleProfile: state.googleProfile,
      paymentCard: state.paymentCard,
      paymentCardSkipped: state.paymentSkipped,
      profileImageUrl: state.businessLogoUploadedUrl,
      businessLogoSkipped: state.businessLogoSkipped,
    };
  }

  function showSignupDuplicateErrorInField(message) {
    const normalizedMessage = String(message || "").toLowerCase();
    if (normalizedMessage.includes("email") && normalizedMessage.includes("registered")) {
      renderStep(1, { focus: false });
      window.setTimeout(() => {
        focusInvalidField(
          getField("email"),
          message,
          "Email already registered.",
          { showMessage: true },
        );
      }, 0);
      return true;
    }
    if (
      normalizedMessage.includes("registered") &&
      (normalizedMessage.includes("contact") || normalizedMessage.includes("mobile"))
    ) {
      renderStep(3, { focus: false });
      window.setTimeout(() => {
        focusInvalidField(
          getField("mobileNumber"),
          message,
          "Mobile already registered.",
          { showMessage: true },
        );
      }, 0);
      return true;
    }
    return false;
  }

  async function validateAllRequiredSteps() {
    if (!state.verificationVerified || !state.verificationToken) {
      renderStep(4, { focus: false });
      setFeedback("Verify your email or mobile before finishing signup.", "error");
      return false;
    }
    const validators = [
      [1, validateEmailAvailability],
      [2, validateIdentityStep],
      [3, validateMobileAvailability],
      [6, validatePasswordStep],
      [7, validateBusinessTypeStep],
      [8, validateCompanyNameStep],
    ];
    for (const [stepNumber, validator] of validators) {
      if (!(await validator())) {
        if (state.currentStep !== stepNumber) {
          renderStep(stepNumber, { focus: false });
          window.setTimeout(() => {
            void validator();
          }, 0);
        }
        return false;
      }
    }
    return true;
  }

  async function handleNextStep(button) {
    const stepElement = button.closest("[data-signup-step]");
    const stepNumber = Number(stepElement?.dataset.signupStep || state.currentStep);
    const isButton = button instanceof HTMLButtonElement;
    if (isButton) {
      button.disabled = true;
    }
    try {
      if (!(await validateStep(stepNumber))) {
        return;
      }
      renderStep(stepNumber + 1);
    } finally {
      if (isButton) {
        button.disabled = false;
      }
    }
  }

  async function submitAdminSignup(event) {
    event.preventDefault();
    if (state.submissionInProgress) {
      return;
    }
    if (state.currentStep < TOTAL_STEPS) {
      const currentStepElement = getStepElement(state.currentStep);
      const nextButton = currentStepElement?.querySelector("[data-signup-next]");
      if (nextButton instanceof HTMLButtonElement) {
        await handleNextStep(nextButton);
      }
      return;
    }
    if (!(await validateAllRequiredSteps())) {
      return;
    }

    setSignupSubmissionBusy(true);

    try {
      await uploadSelectedBusinessLogo();
      setFeedback("Creating your seller workspace...");
      const response = await fetch("/api/admin-register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(getPayload()),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "Unable to create admin account.");
      }

      setFeedback("Seller account created. Redirecting to sign in...", "success");
      window.setTimeout(() => {
        window.location.href = data.redirectPath || "/login.html?role=admin";
      }, 900);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create admin account.";
      if (!showSignupDuplicateErrorInField(message)) {
        setFeedback(message, "error");
      }
      setSignupSubmissionBusy(false);
    }
  }

  form.querySelectorAll("[data-signup-next]").forEach((button) => {
    button.addEventListener("click", () => {
      void handleNextStep(button);
    });
  });

  form.querySelectorAll("[data-signup-back]").forEach((button) => {
    button.addEventListener("click", () => {
      renderStep(state.currentStep - 1);
    });
  });

  form.querySelectorAll("[data-verification-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      const mode = button.dataset.verificationMode === "mobile" ? "mobile" : "email";
      if (state.verificationSent) {
        void startVerificationDelivery(mode).then(() => {
          verificationInputs[0]?.focus();
        });
        return;
      }

      state.verificationMode = mode;
      updateVerificationModeButtons();
      syncVerificationStepUi();
      setFeedback("");
    });
  });

  verificationInputs.forEach((input, index) => {
    input.addEventListener("input", () => {
      input.value = input.value.replace(/\D/g, "").slice(-1);
      verificationInputGroup?.classList.remove("is-error");
      if (input.value && index < verificationInputs.length - 1) {
        verificationInputs[index + 1].focus();
      }
      if (getEnteredVerificationCode().length === 6) {
        void verifyEnteredCode();
      }
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "Backspace" && !input.value && index > 0) {
        verificationInputs[index - 1].focus();
      }
    });
    input.addEventListener("paste", (event) => {
      const pastedCode = event.clipboardData?.getData("text").replace(/\D/g, "").slice(0, 6) || "";
      if (!pastedCode) {
        return;
      }
      event.preventDefault();
      verificationInputs.forEach((candidate, candidateIndex) => {
        candidate.value = pastedCode[candidateIndex] || "";
      });
      verificationInputs[Math.min(pastedCode.length, 6) - 1]?.focus();
      if (pastedCode.length === 6) {
        void verifyEnteredCode();
      }
    });
  });

  verificationSubmitButton?.addEventListener("click", () => {
    void handleVerificationSubmit();
  });
  verificationResendButton?.addEventListener("click", () => {
    if (Date.now() < state.resendAvailableAt) {
      return;
    }
    void startVerificationDelivery(state.verificationMode).then(() => {
      verificationInputs[0]?.focus();
    });
  });

  document.querySelector("[data-payment-skip]")?.addEventListener("click", () => {
    clearPaymentFields();
    renderStep(6);
  });

  document.querySelectorAll("[data-business-logo-select]").forEach((button) => {
    button.addEventListener("click", () => {
      if (state.submissionInProgress) {
        return;
      }
      businessLogoInput?.click();
    });
  });

  businessLogoInput?.addEventListener("change", async () => {
    const file = businessLogoInput.files?.[0] || null;
    businessLogoInput.value = "";
    if (!file) {
      return;
    }
    try {
      await selectBusinessLogoFile(file);
      setFeedback("");
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "Unable to use the selected business logo.",
        "error",
      );
    }
  });

  businessLogoRemoveButton?.addEventListener("click", () => {
    if (state.submissionInProgress) {
      return;
    }
    clearBusinessLogoSelection();
    setFeedback("");
  });

  businessLogoSkipButton?.addEventListener("click", () => {
    if (state.submissionInProgress) {
      return;
    }
    clearBusinessLogoSelection({ skipped: true });
    const finishButton = getStepElement(9)?.querySelector("button[type='submit']");
    if (finishButton instanceof HTMLButtonElement) {
      form.requestSubmit(finishButton);
    }
  });

  businessTypeSearchInput?.addEventListener("input", (event) => {
    state.businessTypeSearchTerm = String(event.currentTarget?.value || "").trim();
    renderBusinessTypes(state.storeTypes);
  });

  getField("password")?.addEventListener("input", renderPasswordStrength);
  form.querySelectorAll("[data-password-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const field = getField(button.dataset.passwordToggle);
      if (!field) {
        return;
      }
      const shouldShow = field.type === "password";
      field.type = shouldShow ? "text" : "password";
      button.setAttribute("aria-label", shouldShow ? "Hide password" : "Show password");
      button.innerHTML = `<i data-lucide="${shouldShow ? "eye-off" : "eye"}"></i>`;
      refreshIcons(button);
    });
  });

  getField("mobileNumber")?.addEventListener("input", (event) => {
    event.currentTarget.value = String(event.currentTarget.value || "").replace(/\D/g, "").slice(0, 10);
  });
  getField("cardNumber")?.addEventListener("input", (event) => {
    const digits = normalizeCardDigits(event.currentTarget.value);
    event.currentTarget.value = digits.replace(/(\d{4})(?=\d)/g, "$1 ");
  });
  getField("cardExpiry")?.addEventListener("input", (event) => {
    const digits = String(event.currentTarget.value || "").replace(/\D/g, "").slice(0, 4);
    event.currentTarget.value = digits.length > 2
      ? `${digits.slice(0, 2)} / ${digits.slice(2)}`
      : digits;
  });
  getField("cardCvv")?.addEventListener("input", (event) => {
    event.currentTarget.value = String(event.currentTarget.value || "").replace(/\D/g, "").slice(0, 4);
  });

  setupFieldValidationUi();

  async function applyGoogleProfileToSignup(profile) {
    if (!profile) {
      return;
    }

    state.googleProfile = {
      provider: "google",
      subject: profile.subject || "",
      email: profile.email || "",
      firstName: profile.firstName || "",
      lastName: profile.lastName || "",
      displayName: profile.displayName || "",
      picture: profile.picture || "",
    };

    const firstNameField = getField("firstName");
    const lastNameField = getField("lastName");
    const emailField = getField("email");

    if (firstNameField && profile.firstName) {
      firstNameField.value = profile.firstName;
    }
    if (lastNameField && profile.lastName) {
      lastNameField.value = profile.lastName;
    }
    if (emailField && profile.email) {
      emailField.value = profile.email;
    }

    // Google Sign-In is tied to email verification channel.
    state.verificationMode = "email";
    state.verificationSent = false;
    state.verificationVerified = false;
    state.verificationToken = "";
    state.verificationCode = "";
    updateVerificationModeButtons();
    syncVerificationStepUi();

    const hasNames =
      String(firstNameField?.value || "").trim().length >= 2 &&
      String(lastNameField?.value || "").trim().length >= 2;

    if (hasNames) {
      renderStep(3, { focus: true });
      setFeedback(
        `Google account linked (${profile.email}). Enter your mobile, then continue — OTP will be sent to this Gmail.`,
        "success",
      );
      return;
    }

    renderStep(2, { focus: true });
    setFeedback(
      `Google account linked (${profile.email}). Confirm your name — OTP will be sent to this Gmail.`,
      "success",
    );
  }

  form.querySelectorAll("[data-social-provider]").forEach((button) => {
    button.addEventListener("click", async () => {
      const provider = String(button.dataset.socialProvider || "").trim();
      if (provider !== "Google") {
        setFeedback(
          `${provider} signup is not connected for seller accounts yet. Continue with the form above.`,
        );
        return;
      }

      if (!window.SwitchGoogleAuth?.signInWithGoogle) {
        setFeedback("Google sign-in helper is not loaded.", "error");
        return;
      }

      try {
        setFeedback("");
        const profile = await window.SwitchGoogleAuth.signInWithGoogle();
        await applyGoogleProfileToSignup(profile);
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (/cancelled|canceled|popup_closed|closed/i.test(message)) {
          setFeedback("");
          return;
        }
        setFeedback(
          message || "Google sign-in failed.",
          "error",
        );
      }
    });
  });

  form.addEventListener("submit", submitAdminSignup);
  window.addEventListener("beforeunload", revokeBusinessLogoPreviewUrl, { once: true });
  syncVerificationStepUi();
  syncBusinessLogoUi();
  renderStep(1, { focus: false, instant: true });
  renderPasswordStrength();
  refreshIcons();
  void loadStoreTypes();

  const signupParams = new URLSearchParams(window.location.search);
  const prefillEmail = String(signupParams.get("email") || "").trim();
  const prefillFirstName = String(signupParams.get("firstName") || "").trim();
  const prefillLastName = String(signupParams.get("lastName") || "").trim();
  if (prefillEmail || prefillFirstName || prefillLastName) {
    const emailField = getField("email");
    const firstNameField = getField("firstName");
    const lastNameField = getField("lastName");
    if (emailField && prefillEmail) {
      emailField.value = prefillEmail;
    }
    if (firstNameField && prefillFirstName) {
      firstNameField.value = prefillFirstName;
    }
    if (lastNameField && prefillLastName) {
      lastNameField.value = prefillLastName;
    }
    if (prefillFirstName || prefillLastName) {
      renderStep(2, { focus: false, instant: true });
    }
    setFeedback(
      "Details prefilled from Google. Continue signup — verification is required.",
      "success",
    );
  }
})();
