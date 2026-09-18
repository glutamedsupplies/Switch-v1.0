(function () {
  if (window.gmsEmployeeAccountSettingsLoaded) {
    return;
  }
  window.gmsEmployeeAccountSettingsLoaded = true;

  const employeeSessionKey = "gms-employee-session";
  const employeeAccountUpdatedStorageKey = "gms-employee-account-updated-at";
  const employeeAccountUpdatedEventName = "gms-employee-account-updated";
  let modalRefs = null;
  let modalAccount = null;
  let modalProfileImageUrl = "";
  let modalBusy = false;
  let validationFocusTarget = null;
  let validationAutoCloseTimer = 0;
  let validationModalAllowManualClose = true;
  let validationSuccessAnimation = null;
  let validationLottieLoadPromise = null;
  let passwordMismatchTimer = 0;
  let lastPasswordMismatchKey = "";
  let emailDuplicateTimer = 0;
  let phoneDuplicateTimer = 0;
  let duplicateValidationRequestId = 0;
  const lottiePlayerUrl = "/vendor/lottie.min.js";
  const successCheckAnimationPath = "/animations/employee-account-check.json";
  const successCheckAnimationMs = 1500;
  const successCheckHoldMs = 500;
  const employeeAccountSquarePenIconMarkup = '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-square-pen-icon lucide-square-pen"><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"/></svg>';
  const validationModalIconMarkup = {
    success: `
      <div class="employee-account-settings-lottie-check" data-employee-account-settings-lottie-check></div>
    `,
    notice: `
      <svg viewBox="0 0 24 24" width="140" height="140" fill="none">
        <circle cx="12" cy="12" r="8.8" stroke="currentColor" stroke-width="1.8" />
        <path d="M12 10.4v5.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
        <circle cx="12" cy="7.6" r="1.1" fill="currentColor" />
      </svg>
    `,
    error: `
      <svg viewBox="0 0 24 24" width="140" height="140" fill="none">
        <circle cx="12" cy="12" r="8.8" stroke="currentColor" stroke-width="1.8" />
        <path d="m8.6 8.6 6.8 6.8" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" />
        <path d="m15.4 8.6-6.8 6.8" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" />
      </svg>
    `,
  };

  function readEmployeeSession() {
    try {
      const rawValue = window.sessionStorage.getItem(employeeSessionKey);
      return rawValue ? JSON.parse(rawValue) : null;
    } catch (error) {
      console.warn("Unable to read employee session.", error);
      return null;
    }
  }

  function writeEmployeeSession(session) {
    try {
      window.sessionStorage.setItem(employeeSessionKey, JSON.stringify(session));
    } catch (error) {
      console.warn("Unable to update employee session.", error);
    }
  }

  function publishEmployeeAccountUpdate(account) {
    const accountUpdate = {
      accountId: String(account?.id ?? account?.accountCode ?? account?.employeeId ?? "").trim(),
      employeeId: String(account?.employeeId ?? "").trim(),
      accountCode: String(account?.accountCode ?? "").trim(),
      email: String(account?.email ?? "").trim(),
      updatedAt: Date.now(),
    };

    try {
      window.localStorage?.setItem(employeeAccountUpdatedStorageKey, JSON.stringify(accountUpdate));
    } catch (error) {
      // Ignore cross-page sync failures; the account save already persisted.
    }

    window.dispatchEvent(
      new CustomEvent(employeeAccountUpdatedEventName, {
        detail: { account, update: accountUpdate },
      }),
    );
  }

  function getSessionMatchValues(session) {
    return [
      session?.id,
      session?.accountCode,
      session?.employeeId,
      session?.email,
    ]
      .map((value) => String(value ?? "").trim().toLowerCase())
      .filter(Boolean);
  }

  function isMatchingEmployeeAccount(account, sessionMatchValues) {
    if (!account || typeof account !== "object" || !sessionMatchValues.length) {
      return false;
    }

    return [
      account.id,
      account.accountCode,
      account.employeeId,
      account.email,
    ]
      .map((value) => String(value ?? "").trim().toLowerCase())
      .some((value) => value && sessionMatchValues.includes(value));
  }

  function getEmployeeDisplayName(account) {
    const fullName = [
      account?.firstName,
      account?.middleName,
      account?.lastName,
    ]
      .map((value) => String(value ?? "").trim())
      .filter(Boolean)
      .join(" ");
    return fullName || String(account?.employeeId ?? account?.accountCode ?? "Employee").trim();
  }

  function getEmployeeInitials(account) {
    const first = String(account?.firstName ?? "").trim().charAt(0);
    const last = String(account?.lastName ?? "").trim().charAt(0);
    return `${first}${last}`.trim().toUpperCase() || "EM";
  }

  function getEmployeePosition(account) {
    return String(account?.position || "Employee").trim() || "Employee";
  }

  function getEmployeeProfileImageUrl(account) {
    return [
      account?.profileImageUrl,
      account?.avatarUrl,
      account?.photoUrl,
      account?.profilePhotoUrl,
      account?.employeePhotoUrl,
      account?.pictureUrl,
      account?.imageUrl,
    ]
      .map((value) => String(value ?? "").trim())
      .find(Boolean) || "";
  }

  function setFeedback(message = "", mode = "") {
    if (!modalRefs?.feedback) {
      return;
    }

    modalRefs.feedback.textContent = message;
    modalRefs.feedback.classList.toggle("is-error", mode === "error");
    modalRefs.feedback.classList.toggle("is-success", mode === "success");
  }

  function syncBusyState(isBusy) {
    modalBusy = isBusy;
    if (!modalRefs) {
      return;
    }

    modalRefs.saveButton.disabled = isBusy;
    modalRefs.cancelButton.disabled = isBusy;
    modalRefs.closeButton.disabled = isBusy;
    modalRefs.avatarButton.disabled = isBusy;
    modalRefs.fileButton.disabled = isBusy;
    modalRefs.seePhotoButton.disabled = isBusy || !modalProfileImageUrl;
    modalRefs.removePhotoButton.hidden = !modalProfileImageUrl;
    modalRefs.removePhotoButton.disabled = isBusy || !modalProfileImageUrl;
    if (isBusy) {
      setAvatarMenuOpen(false);
    }
    syncAccountSettingsEditButtons();
    modalRefs.saveButton.textContent = isBusy ? "Saving..." : "Save Changes";
  }

  function syncProfilePreview() {
    if (!modalRefs) {
      return;
    }

    const displayName = getEmployeeDisplayName(modalAccount);
    modalRefs.profileName.textContent = displayName;
    modalRefs.profilePosition.textContent = getEmployeePosition(modalAccount);
    const hasProfileImage = Boolean(modalProfileImageUrl);
    modalRefs.removePhotoButton.hidden = !hasProfileImage;
    modalRefs.seePhotoButton.disabled = modalBusy || !hasProfileImage;
    modalRefs.changePhotoLabel.textContent = hasProfileImage
      ? "Change Profile Picture"
      : "Upload Profile";
    if (hasProfileImage) {
      modalRefs.avatarImage.src = modalProfileImageUrl;
      modalRefs.avatarImage.alt = `${displayName} profile picture`;
      modalRefs.avatarImage.hidden = false;
      modalRefs.avatarFallback.hidden = true;
    } else {
      modalRefs.avatarImage.removeAttribute("src");
      modalRefs.avatarImage.alt = "";
      modalRefs.avatarImage.hidden = true;
      modalRefs.avatarFallback.textContent = getEmployeeInitials(modalAccount);
      modalRefs.avatarFallback.hidden = false;
    }

    modalRefs.removePhotoButton.disabled = modalBusy || !hasProfileImage;
  }

  function closeWorkspaceMenus() {
    document.querySelectorAll("[data-dashboard-workspace-menu]").forEach((menu) => {
      const toggle = menu.querySelector("[data-dashboard-workspace-toggle]");
      const dropdown = menu.querySelector("[data-dashboard-workspace-dropdown]");
      menu.classList.remove("is-open");
      toggle?.setAttribute("aria-expanded", "false");
      if (dropdown) {
        dropdown.hidden = true;
      }
    });
  }

  function openFilePicker() {
    if (modalBusy) {
      return;
    }
    setAvatarMenuOpen(false);
    modalRefs?.fileInput?.click();
  }

  function setAvatarMenuOpen(isOpen) {
    if (!modalRefs?.avatarMenu || !modalRefs?.avatarButton || !modalRefs?.avatarWrap) {
      return;
    }

    modalRefs.avatarMenu.hidden = !isOpen;
    modalRefs.avatarButton.setAttribute("aria-expanded", String(isOpen));
    modalRefs.avatarWrap.classList.toggle("is-open", isOpen);
  }

  function toggleAvatarMenu() {
    if (modalBusy || !modalRefs?.avatarMenu) {
      return;
    }

    setAvatarMenuOpen(modalRefs.avatarMenu.hidden);
  }

  function openProfilePictureViewer() {
    setAvatarMenuOpen(false);
    if (!modalRefs || !modalProfileImageUrl) {
      setFeedback("Add a profile picture first.", "error");
      return;
    }

    const displayName = getEmployeeDisplayName(modalAccount);
    modalRefs.photoViewerImage.src = modalProfileImageUrl;
    modalRefs.photoViewerImage.alt = `${displayName} profile picture`;
    modalRefs.photoViewer.hidden = false;
    modalRefs.photoViewer.setAttribute("aria-hidden", "false");
    modalRefs.photoViewer.classList.add("is-open");
  }

  function closeProfilePictureViewer() {
    if (!modalRefs?.photoViewer) {
      return;
    }

    modalRefs.photoViewer.classList.remove("is-open");
    modalRefs.photoViewer.hidden = true;
    modalRefs.photoViewer.setAttribute("aria-hidden", "true");
    modalRefs.photoViewerImage.removeAttribute("src");
    modalRefs.photoViewerImage.alt = "";
  }

  function getAccountLabel(account) {
    const accountId = String(
      account?.employeeId
        ?? account?.accountCode
        ?? account?.id
        ?? "Unknown ID",
    ).trim();
    const fullName = [
      account?.firstName,
      account?.lastName,
    ]
      .map((value) => String(value ?? "").trim())
      .filter(Boolean)
      .join(" ");
    return fullName ? `${accountId} - ${fullName}` : accountId;
  }

  function getAccountIdentityValues(account) {
    return [
      account?.id,
      account?.accountCode,
      account?.employeeId,
    ]
      .map((value) => String(value ?? "").trim().toLowerCase())
      .filter(Boolean);
  }

  function isSameAccount(account, targetAccount) {
    const values = getAccountIdentityValues(account);
    const targetValues = getAccountIdentityValues(targetAccount);
    return values.some((value) => targetValues.includes(value));
  }

  function normalizePhoneNumber(value) {
    let digits = String(value ?? "").replace(/\D/g, "");
    if (digits.startsWith("63") && digits.length > 10) {
      digits = digits.slice(2);
    }
    if (digits.startsWith("0") && digits.length > 10) {
      digits = digits.slice(1);
    }
    return digits.slice(0, 10);
  }

  async function findDuplicateAccount(values) {
    const response = await fetch("/api/accounts", { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || "Unable to check existing accounts.");
    }

    const accounts = Array.isArray(data.accounts) ? data.accounts : [];
    const normalizedEmail = String(values.email || "").trim().toLowerCase();
    const normalizedPhone = normalizePhoneNumber(values.mobileNumber);
    const emailAccount = accounts.find((account) =>
      !isSameAccount(account, modalAccount)
      && String(account?.email ?? "").trim().toLowerCase() === normalizedEmail,
    );
    if (emailAccount) {
      return { type: "email", account: emailAccount };
    }

    const phoneAccount = accounts.find((account) =>
      !isSameAccount(account, modalAccount)
      && normalizePhoneNumber(account?.mobileNumber || account?.phoneNumber || "") === normalizedPhone,
    );
    return phoneAccount ? { type: "phone", account: phoneAccount } : null;
  }

  function ensureLottiePlayer() {
    if (window.lottie?.loadAnimation) {
      return Promise.resolve(true);
    }

    if (validationLottieLoadPromise) {
      return validationLottieLoadPromise;
    }

    validationLottieLoadPromise = new Promise((resolve) => {
      const existingScript = document.querySelector(`script[src$="${lottiePlayerUrl}"], script[src*="${lottiePlayerUrl}?"]`);
      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(Boolean(window.lottie?.loadAnimation)), { once: true });
        existingScript.addEventListener("error", () => resolve(false), { once: true });
        if (window.lottie?.loadAnimation) {
          resolve(true);
        }
        return;
      }

      const scriptElement = document.createElement("script");
      scriptElement.src = lottiePlayerUrl;
      scriptElement.async = true;
      scriptElement.addEventListener("load", () => resolve(Boolean(window.lottie?.loadAnimation)), { once: true });
      scriptElement.addEventListener("error", () => resolve(false), { once: true });
      document.head.appendChild(scriptElement);
    });

    return validationLottieLoadPromise;
  }

  function destroyValidationSuccessAnimation() {
    if (validationSuccessAnimation?.destroy) {
      validationSuccessAnimation.destroy();
    }
    validationSuccessAnimation = null;
  }

  async function playValidationSuccessAnimation() {
    const container = modalRefs?.validationIcon?.querySelector("[data-employee-account-settings-lottie-check]");
    if (!(container instanceof HTMLElement)) {
      return;
    }

    destroyValidationSuccessAnimation();
    container.innerHTML = "";

    const canUseLottie = await ensureLottiePlayer();
    if (!canUseLottie || !window.lottie?.loadAnimation || !container.isConnected) {
      return;
    }

    validationSuccessAnimation = window.lottie.loadAnimation({
      container,
      renderer: "svg",
      loop: false,
      autoplay: true,
      path: successCheckAnimationPath,
    });
  }

  function openValidationModal(message, options = {}) {
    if (!modalRefs?.validationOverlay) {
      return;
    }

    const {
      title = "Important Notice",
      actionLabel = "Go Back",
      mode = "notice",
      focusTarget = null,
      autoCloseMs = 0,
      hideAction = false,
      hideClose = false,
      allowManualClose = true,
      onAutoClose = null,
    } = options;
    if (validationAutoCloseTimer) {
      window.clearTimeout(validationAutoCloseTimer);
      validationAutoCloseTimer = 0;
    }
    const modalMode = mode === "success" ? "success" : mode === "error" ? "error" : "notice";
    validationModalAllowManualClose = allowManualClose !== false;
    modalRefs.validationIcon.className = `validation-modal__icon validation-modal__icon--${modalMode}`;
    modalRefs.validationIcon.innerHTML =
      validationModalIconMarkup[modalMode] || validationModalIconMarkup.notice;
    if (modalMode === "success") {
      void playValidationSuccessAnimation();
    } else {
      destroyValidationSuccessAnimation();
    }
    modalRefs.validationTitle.textContent = title;
    modalRefs.validationCopy.textContent = message;
    modalRefs.validationAction.textContent = actionLabel;
    modalRefs.validationAction.hidden = Boolean(hideAction);
    modalRefs.validationClose.hidden = Boolean(hideClose);
    validationFocusTarget = focusTarget instanceof HTMLElement ? focusTarget : null;
    modalRefs.validationOverlay.hidden = false;
    modalRefs.validationOverlay.setAttribute("aria-hidden", "false");
    window.requestAnimationFrame(() => {
      modalRefs.validationOverlay.classList.add("is-open");
    });
    if (!hideAction) {
      window.setTimeout(() => modalRefs.validationAction.focus(), 0);
    }
    if (Number.isFinite(autoCloseMs) && autoCloseMs > 0) {
      validationAutoCloseTimer = window.setTimeout(() => {
        validationAutoCloseTimer = 0;
        closeValidationModal({ restoreFocus: false });
        if (typeof onAutoClose === "function") {
          onAutoClose();
        }
      }, autoCloseMs);
    }
  }

  function closeValidationModal(options = {}) {
    if (!modalRefs?.validationOverlay) {
      return;
    }

    const { restoreFocus = true } = options;
    if (validationAutoCloseTimer) {
      window.clearTimeout(validationAutoCloseTimer);
      validationAutoCloseTimer = 0;
    }
    modalRefs.validationOverlay.classList.remove("is-open");
    modalRefs.validationOverlay.hidden = true;
    modalRefs.validationOverlay.setAttribute("aria-hidden", "true");
    destroyValidationSuccessAnimation();
    modalRefs.validationAction.hidden = false;
    modalRefs.validationClose.hidden = false;
    validationModalAllowManualClose = true;
    if (restoreFocus && validationFocusTarget instanceof HTMLElement) {
      window.setTimeout(() => validationFocusTarget.focus(), 0);
    }
    validationFocusTarget = null;
  }

  function getAccountField(input) {
    return input?.closest?.(".employee-account-settings-field") || null;
  }

  function setAccountFieldTooltip(input, message = "") {
    const field = getAccountField(input);
    if (!field) {
      return;
    }

    if (message) {
      field.dataset.accountTooltip = message;
      field.classList.add("is-invalid");
      input?.setAttribute?.("aria-invalid", "true");
      return;
    }

    delete field.dataset.accountTooltip;
    field.classList.remove("is-invalid");
    input?.removeAttribute?.("aria-invalid");
  }

  function clearAccountFieldTooltips() {
    [
      modalRefs?.emailInput,
      modalRefs?.phoneInput,
      modalRefs?.passwordInput,
      modalRefs?.confirmPasswordInput,
    ].forEach((input) => setAccountFieldTooltip(input, ""));
  }

  function getAccountSettingsEditConfig(type) {
    if (!modalRefs) {
      return null;
    }

    if (type === "email") {
      return {
        button: modalRefs.emailEditButton,
        fields: [getAccountField(modalRefs.emailInput)].filter(Boolean),
        inputs: [modalRefs.emailInput].filter(Boolean),
        label: "email",
      };
    }

    if (type === "phone") {
      return {
        button: modalRefs.phoneEditButton,
        fields: [getAccountField(modalRefs.phoneInput)].filter(Boolean),
        inputs: [modalRefs.phoneInput].filter(Boolean),
        label: "phone number",
      };
    }

    if (type === "password") {
      return {
        button: modalRefs.passwordEditButton,
        fields: [
          getAccountField(modalRefs.passwordInput),
          getAccountField(modalRefs.confirmPasswordInput),
        ].filter(Boolean),
        inputs: [
          modalRefs.passwordInput,
          modalRefs.confirmPasswordInput,
        ].filter(Boolean),
        label: "new password",
      };
    }

    return null;
  }

  function syncAccountSettingsEditButtons() {
    ["email", "phone", "password"].forEach((type) => {
      const config = getAccountSettingsEditConfig(type);
      if (!config?.button || !config.inputs.length) {
        return;
      }

      const isEditable = config.inputs.some((input) => !input.disabled);
      config.button.disabled = modalBusy;
      config.button.classList.toggle("is-active", isEditable);
      config.button.setAttribute("aria-pressed", isEditable ? "true" : "false");
      config.button.setAttribute(
        "aria-label",
        isEditable ? `${config.label} is editable` : `Edit ${config.label}`,
      );
      config.button.setAttribute(
        "title",
        isEditable ? `${config.label} is editable` : `Edit ${config.label}`,
      );
    });
  }

  function setAccountSettingsFieldEditable(type, isEditable, options = {}) {
    const config = getAccountSettingsEditConfig(type);
    if (!config) {
      return;
    }

    const editable = Boolean(isEditable);
    config.inputs.forEach((input) => {
      input.disabled = !editable;
      input.setAttribute("aria-disabled", editable ? "false" : "true");
    });
    config.fields.forEach((field) => {
      field.classList.toggle("is-editable", editable);
      field.classList.toggle("is-locked", !editable);
    });
    syncAccountSettingsEditButtons();

    if (editable && options.focus !== false) {
      const targetInput = config.inputs[0];
      targetInput?.focus?.({ preventScroll: true });
      if (typeof targetInput?.setSelectionRange === "function") {
        const valueLength = String(targetInput.value || "").length;
        targetInput.setSelectionRange(valueLength, valueLength);
      }
    }
  }

  function lockAccountSettingsEditableFields() {
    ["email", "phone", "password"].forEach((type) => {
      setAccountSettingsFieldEditable(type, false, { focus: false });
    });
  }

  async function findDuplicateContactField(type, rawValue) {
    const response = await fetch("/api/accounts", { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || "Unable to check existing accounts.");
    }

    const accounts = Array.isArray(data.accounts) ? data.accounts : [];
    if (type === "email") {
      const normalizedEmail = String(rawValue || "").trim().toLowerCase();
      return accounts.find((account) =>
        !isSameAccount(account, modalAccount)
        && String(account?.email ?? "").trim().toLowerCase() === normalizedEmail,
      ) || null;
    }

    const normalizedPhone = normalizePhoneNumber(rawValue);
    return accounts.find((account) =>
      !isSameAccount(account, modalAccount)
      && normalizePhoneNumber(account?.mobileNumber || account?.phoneNumber || "") === normalizedPhone,
    ) || null;
  }

  function clearDuplicateTimers() {
    if (emailDuplicateTimer) {
      window.clearTimeout(emailDuplicateTimer);
      emailDuplicateTimer = 0;
    }
    if (phoneDuplicateTimer) {
      window.clearTimeout(phoneDuplicateTimer);
      phoneDuplicateTimer = 0;
    }
  }

  async function validateDuplicateContactField(type) {
    if (!modalRefs || modalBusy) {
      return;
    }

    const requestId = ++duplicateValidationRequestId;
    const input = type === "email" ? modalRefs.emailInput : modalRefs.phoneInput;
    const value = type === "email"
      ? String(input.value || "").trim().toLowerCase()
      : normalizePhoneNumber(input.value);

    if (type === "email" && (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))) {
      setAccountFieldTooltip(input, "");
      return;
    }

    if (type === "phone" && (!value || !/^9\d{9}$/.test(value))) {
      setAccountFieldTooltip(input, "");
      return;
    }

    try {
      const duplicate = await findDuplicateContactField(type, value);
      if (requestId !== duplicateValidationRequestId) {
        return;
      }

      setAccountFieldTooltip(
        input,
        duplicate
          ? type === "email"
            ? "Email address is already registered."
            : "Phone number is already registered."
          : "",
      );
    } catch (error) {
      console.warn("Unable to check duplicate account contact.", error);
    }
  }

  function scheduleDuplicateContactValidation(type) {
    const input = type === "email" ? modalRefs?.emailInput : modalRefs?.phoneInput;
    setAccountFieldTooltip(input, "");
    if (type === "email") {
      window.clearTimeout(emailDuplicateTimer);
      emailDuplicateTimer = window.setTimeout(() => {
        emailDuplicateTimer = 0;
        void validateDuplicateContactField("email");
      }, 450);
      return;
    }

    window.clearTimeout(phoneDuplicateTimer);
    phoneDuplicateTimer = window.setTimeout(() => {
      phoneDuplicateTimer = 0;
      void validateDuplicateContactField("phone");
    }, 450);
  }

  function clearPasswordMismatchTimer() {
    if (passwordMismatchTimer) {
      window.clearTimeout(passwordMismatchTimer);
      passwordMismatchTimer = 0;
    }
  }

  function openPasswordMismatchModal() {
    setAccountFieldTooltip(modalRefs?.confirmPasswordInput, "Confirm password not match");
  }

  function validatePasswordMatchNow(options = {}) {
    if (!modalRefs || modalBusy || !modalRefs.validationOverlay.hidden) {
      return;
    }

    const { force = false } = options;
    const password = String(modalRefs.passwordInput.value || "").trim();
    const confirmPassword = String(modalRefs.confirmPasswordInput.value || "").trim();
    if (!password || !confirmPassword) {
      lastPasswordMismatchKey = "";
      setAccountFieldTooltip(modalRefs.confirmPasswordInput, "");
      return;
    }

    if (password === confirmPassword) {
      lastPasswordMismatchKey = "";
      setAccountFieldTooltip(modalRefs.confirmPasswordInput, "");
      return;
    }

    if (!force && confirmPassword.length < password.length) {
      return;
    }

    const mismatchKey = `${password}\n${confirmPassword}`;
    if (mismatchKey === lastPasswordMismatchKey) {
      return;
    }

    lastPasswordMismatchKey = mismatchKey;
    openPasswordMismatchModal();
  }

  function schedulePasswordMatchValidation(options = {}) {
    clearPasswordMismatchTimer();
    const delay = options.force ? 0 : 520;
    passwordMismatchTimer = window.setTimeout(() => {
      passwordMismatchTimer = 0;
      validatePasswordMatchNow(options);
    }, delay);
  }

  function prepareProfileImageDataUrl(file) {
    return new Promise((resolve, reject) => {
      if (!file || !String(file.type || "").startsWith("image/")) {
        reject(new Error("Please choose an image file."));
        return;
      }

      const reader = new FileReader();
      reader.addEventListener("error", () => reject(new Error("Unable to read selected image.")));
      reader.addEventListener("load", () => {
        const image = new Image();
        image.addEventListener("error", () => reject(new Error("Unable to prepare selected image.")));
        image.addEventListener("load", () => {
          const size = 320;
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          if (!context) {
            reject(new Error("Unable to prepare selected image."));
            return;
          }

          const sourceSize = Math.min(image.naturalWidth || image.width, image.naturalHeight || image.height);
          const sourceX = Math.max(0, ((image.naturalWidth || image.width) - sourceSize) / 2);
          const sourceY = Math.max(0, ((image.naturalHeight || image.height) - sourceSize) / 2);
          canvas.width = size;
          canvas.height = size;
          context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size);
          resolve(canvas.toDataURL("image/jpeg", 0.86));
        });
        image.src = String(reader.result || "");
      });
      reader.readAsDataURL(file);
    });
  }

  async function fetchEmployeeAccount(session) {
    const sessionMatchValues = getSessionMatchValues(session);
    if (!sessionMatchValues.length) {
      throw new Error("Employee session was not found.");
    }

    const response = await fetch("/api/accounts", { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || "Unable to load employee account.");
    }

    const accounts = Array.isArray(data.accounts) ? data.accounts : [];
    const account = accounts.find((candidate) =>
      isMatchingEmployeeAccount(candidate, sessionMatchValues),
    );
    if (!account) {
      throw new Error("Employee account was not found.");
    }

    return account;
  }

  function createEmployeeAccountSettingsModal() {
    if (modalRefs) {
      return modalRefs;
    }

    const overlay = document.createElement("div");
    overlay.className = "employee-account-settings-overlay";
    overlay.hidden = true;
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML = `
      <section class="employee-account-settings-modal" role="dialog" aria-modal="true" aria-labelledby="employee-account-settings-title">
        <div class="employee-account-settings-modal__header">
          <div>
            <h2 id="employee-account-settings-title">Account Settings</h2>
          </div>
          <button type="button" class="employee-account-settings-modal__close" data-employee-account-settings-close aria-label="Close account settings">
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
        </div>

        <form class="employee-account-settings-modal__form" data-employee-account-settings-form novalidate>
          <div class="employee-account-settings-layout">
            <section class="employee-account-settings-profile" aria-label="Profile picture">
              <h3>Profile Picture</h3>
              <span class="employee-account-settings-profile__avatar-wrap" data-employee-account-settings-avatar-wrap>
                <button type="button" class="employee-account-settings-profile__avatar-button" data-employee-account-settings-avatar-button aria-haspopup="menu" aria-expanded="false" aria-label="Profile picture options">
                  <span class="employee-account-settings-profile__avatar">
                    <img data-employee-account-settings-avatar-image alt="" hidden />
                    <span data-employee-account-settings-avatar-fallback>EM</span>
                  </span>
                </button>
                <button type="button" class="employee-account-settings-avatar-remove" data-employee-account-settings-remove-photo aria-label="Remove profile photo">
                  <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                </button>
                <span class="employee-account-settings-profile__menu" data-employee-account-settings-avatar-menu role="menu" hidden>
                  <button type="button" role="menuitem" data-employee-account-settings-see-photo>
                    <i class="fa-solid fa-eye" aria-hidden="true"></i>
                    <span>See Profile Picture</span>
                  </button>
                  <button type="button" role="menuitem" data-employee-account-settings-file-button>
                    <i class="fa-solid fa-image" aria-hidden="true"></i>
                    <span data-employee-account-settings-change-photo-label>Upload Profile</span>
                  </button>
                </span>
              </span>
              <span class="employee-account-settings-profile__identity">
                <span class="employee-account-settings-profile__name" data-employee-account-settings-profile-name>Employee</span>
                <span class="employee-account-settings-profile__position" data-employee-account-settings-profile-position>Employee</span>
              </span>
              <input type="file" accept="image/*" hidden data-employee-account-settings-file />
            </section>

            <section class="employee-account-settings-basic" aria-label="Account security">
              <h3>Account Security</h3>
              <div class="employee-account-settings-contact-grid">
                <label class="employee-account-settings-field">
                  <span>E-mail</span>
                  <span class="employee-account-settings-editable-field">
                    <input type="email" inputmode="email" autocomplete="email" data-employee-account-settings-email />
                    <button type="button" class="employee-account-settings-field-edit" data-employee-account-settings-email-edit aria-label="Edit email" title="Edit email" aria-pressed="false">
                      ${employeeAccountSquarePenIconMarkup}
                    </button>
                  </span>
                </label>

                <label class="employee-account-settings-field">
                  <span>Phone number</span>
                  <span class="employee-account-settings-phone-field">
                    <span class="employee-account-settings-phone-field__prefix">+63</span>
                    <input type="tel" inputmode="numeric" autocomplete="tel-national" maxlength="10" data-employee-account-settings-phone />
                    <button type="button" class="employee-account-settings-field-edit employee-account-settings-field-edit--phone" data-employee-account-settings-phone-edit aria-label="Edit phone number" title="Edit phone number" aria-pressed="false">
                      ${employeeAccountSquarePenIconMarkup}
                    </button>
                  </span>
                </label>
              </div>

              <div class="employee-account-settings-grid">
                <label class="employee-account-settings-field">
                  <span>New Password</span>
                  <span class="employee-account-settings-editable-field">
                    <input type="password" autocomplete="new-password" data-employee-account-settings-password />
                    <button type="button" class="employee-account-settings-field-edit" data-employee-account-settings-password-edit aria-label="Edit new password" title="Edit new password" aria-pressed="false">
                      ${employeeAccountSquarePenIconMarkup}
                    </button>
                  </span>
                </label>
                <label class="employee-account-settings-field">
                  <span>Confirm Password</span>
                  <input type="password" autocomplete="new-password" data-employee-account-settings-confirm-password />
                </label>
              </div>

            </section>
          </div>

          <p class="employee-account-settings-feedback" data-employee-account-settings-feedback aria-live="polite"></p>

          <div class="employee-account-settings-modal__actions">
            <button type="button" class="employee-account-settings-secondary" data-employee-account-settings-cancel>Cancel</button>
            <button type="submit" class="employee-account-settings-primary" data-employee-account-settings-save>Save Changes</button>
          </div>
        </form>
      </section>

      <div class="employee-account-settings-photo-viewer" data-employee-account-settings-photo-viewer aria-hidden="true" hidden>
        <section class="employee-account-settings-photo-viewer__dialog" role="dialog" aria-modal="true" aria-label="Profile picture preview">
          <button type="button" class="employee-account-settings-photo-viewer__close" data-employee-account-settings-photo-viewer-close aria-label="Close profile picture preview">
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
          <img data-employee-account-settings-photo-viewer-image alt="" />
        </section>
      </div>

      <div class="validation-modal-overlay employee-account-settings-validation-overlay" data-employee-account-settings-validation-overlay hidden aria-hidden="true">
        <section class="validation-modal" role="dialog" aria-modal="true" aria-labelledby="employee-account-settings-validation-title">
          <button type="button" class="product-gallery-modal__close validation-modal__close" data-employee-account-settings-validation-close aria-label="Close validation modal">
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
          <div class="validation-modal__top">
            <div class="validation-modal__icon validation-modal__icon--notice" data-employee-account-settings-validation-icon aria-hidden="true" role="presentation" tabindex="-1">
              ${validationModalIconMarkup.notice}
            </div>
          </div>
          <div class="validation-modal__body">
            <h2 class="validation-modal__title" id="employee-account-settings-validation-title" data-employee-account-settings-validation-title>Important Notice</h2>
            <p class="validation-modal__copy" data-employee-account-settings-validation-copy>Please review the highlighted fields and try again.</p>
            <div class="validation-modal__actions">
              <button type="button" class="ghost-button validation-modal__action-button validation-modal__action-button--secondary" data-employee-account-settings-validation-action>Go Back</button>
            </div>
          </div>
        </section>
      </div>
    `;

    document.body.appendChild(overlay);
    modalRefs = {
      overlay,
      modal: overlay.querySelector(".employee-account-settings-modal"),
      closeButton: overlay.querySelector("[data-employee-account-settings-close]"),
      cancelButton: overlay.querySelector("[data-employee-account-settings-cancel]"),
      form: overlay.querySelector("[data-employee-account-settings-form]"),
      profileName: overlay.querySelector("[data-employee-account-settings-profile-name]"),
      profilePosition: overlay.querySelector("[data-employee-account-settings-profile-position]"),
      avatarWrap: overlay.querySelector("[data-employee-account-settings-avatar-wrap]"),
      avatarButton: overlay.querySelector("[data-employee-account-settings-avatar-button]"),
      avatarMenu: overlay.querySelector("[data-employee-account-settings-avatar-menu]"),
      avatarImage: overlay.querySelector("[data-employee-account-settings-avatar-image]"),
      avatarFallback: overlay.querySelector("[data-employee-account-settings-avatar-fallback]"),
      fileInput: overlay.querySelector("[data-employee-account-settings-file]"),
      fileButton: overlay.querySelector("[data-employee-account-settings-file-button]"),
      changePhotoLabel: overlay.querySelector("[data-employee-account-settings-change-photo-label]"),
      seePhotoButton: overlay.querySelector("[data-employee-account-settings-see-photo]"),
      removePhotoButton: overlay.querySelector("[data-employee-account-settings-remove-photo]"),
      photoViewer: overlay.querySelector("[data-employee-account-settings-photo-viewer]"),
      photoViewerClose: overlay.querySelector("[data-employee-account-settings-photo-viewer-close]"),
      photoViewerImage: overlay.querySelector("[data-employee-account-settings-photo-viewer-image]"),
      validationOverlay: overlay.querySelector("[data-employee-account-settings-validation-overlay]"),
      validationClose: overlay.querySelector("[data-employee-account-settings-validation-close]"),
      validationAction: overlay.querySelector("[data-employee-account-settings-validation-action]"),
      validationIcon: overlay.querySelector("[data-employee-account-settings-validation-icon]"),
      validationTitle: overlay.querySelector("[data-employee-account-settings-validation-title]"),
      validationCopy: overlay.querySelector("[data-employee-account-settings-validation-copy]"),
      emailInput: overlay.querySelector("[data-employee-account-settings-email]"),
      emailEditButton: overlay.querySelector("[data-employee-account-settings-email-edit]"),
      phoneInput: overlay.querySelector("[data-employee-account-settings-phone]"),
      phoneEditButton: overlay.querySelector("[data-employee-account-settings-phone-edit]"),
      passwordInput: overlay.querySelector("[data-employee-account-settings-password]"),
      passwordEditButton: overlay.querySelector("[data-employee-account-settings-password-edit]"),
      confirmPasswordInput: overlay.querySelector("[data-employee-account-settings-confirm-password]"),
      feedback: overlay.querySelector("[data-employee-account-settings-feedback]"),
      saveButton: overlay.querySelector("[data-employee-account-settings-save]"),
    };

    lockAccountSettingsEditableFields();

    modalRefs.closeButton.addEventListener("click", closeEmployeeAccountSettings);
    modalRefs.cancelButton.addEventListener("click", closeEmployeeAccountSettings);
    modalRefs.avatarButton.addEventListener("click", toggleAvatarMenu);
    modalRefs.seePhotoButton.addEventListener("click", openProfilePictureViewer);
    modalRefs.fileButton.addEventListener("click", openFilePicker);
    modalRefs.removePhotoButton.addEventListener("click", () => {
      setAvatarMenuOpen(false);
      modalProfileImageUrl = "";
      syncProfilePreview();
      setFeedback("");
    });
    modalRefs.photoViewerClose.addEventListener("click", closeProfilePictureViewer);
    modalRefs.validationClose.addEventListener("click", () => {
      if (validationModalAllowManualClose) {
        closeValidationModal();
      }
    });
    modalRefs.validationAction.addEventListener("click", () => {
      if (validationModalAllowManualClose) {
        closeValidationModal();
      }
    });
    modalRefs.emailEditButton.addEventListener("click", () => {
      setAccountSettingsFieldEditable("email", true);
    });
    modalRefs.phoneEditButton.addEventListener("click", () => {
      setAccountSettingsFieldEditable("phone", true);
    });
    modalRefs.passwordEditButton.addEventListener("click", () => {
      setAccountSettingsFieldEditable("password", true);
      setAccountFieldTooltip(modalRefs.passwordInput, "");
      setAccountFieldTooltip(modalRefs.confirmPasswordInput, "");
    });
    modalRefs.passwordInput.addEventListener("input", () => schedulePasswordMatchValidation());
    modalRefs.confirmPasswordInput.addEventListener("input", () => schedulePasswordMatchValidation());
    modalRefs.passwordInput.addEventListener("blur", () => schedulePasswordMatchValidation({ force: true }));
    modalRefs.confirmPasswordInput.addEventListener("blur", () => schedulePasswordMatchValidation({ force: true }));
    modalRefs.emailInput.addEventListener("input", () => scheduleDuplicateContactValidation("email"));
    modalRefs.emailInput.addEventListener("blur", () => {
      void validateDuplicateContactField("email");
    });
    modalRefs.phoneInput.addEventListener("input", () => {
      modalRefs.phoneInput.value = normalizePhoneNumber(modalRefs.phoneInput.value);
      scheduleDuplicateContactValidation("phone");
    });
    modalRefs.phoneInput.addEventListener("blur", () => {
      void validateDuplicateContactField("phone");
    });
    modalRefs.fileInput.addEventListener("change", async () => {
      const file = modalRefs.fileInput.files?.[0] || null;
      modalRefs.fileInput.value = "";
      if (!file) {
        return;
      }

      try {
        setFeedback("Preparing photo...");
        modalProfileImageUrl = await prepareProfileImageDataUrl(file);
        syncProfilePreview();
        setFeedback("");
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Unable to use selected photo.", "error");
      }
    });
    modalRefs.overlay.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (target && !modalRefs.avatarWrap.contains(target)) {
        setAvatarMenuOpen(false);
      }
      if (event.target === modalRefs.photoViewer) {
        closeProfilePictureViewer();
        return;
      }
      if (event.target === modalRefs.validationOverlay) {
        if (validationModalAllowManualClose) {
          closeValidationModal();
        }
        return;
      }
      if (event.target === modalRefs.overlay) {
        closeEmployeeAccountSettings();
      }
    });
    modalRefs.form.addEventListener("submit", saveEmployeeAccountSettings);

    return modalRefs;
  }

  async function openEmployeeAccountSettings() {
    const session = readEmployeeSession();
    if (!session || typeof session !== "object") {
      window.location.href = "/login.html?role=employee";
      return;
    }

    const refs = createEmployeeAccountSettingsModal();
    closeWorkspaceMenus();
    refs.overlay.hidden = false;
    refs.overlay.setAttribute("aria-hidden", "false");
    refs.overlay.classList.add("is-open");
    document.body.classList.add("modal-open");
    setFeedback("Loading account...");
    syncBusyState(true);

    try {
      modalAccount = await fetchEmployeeAccount(session);
      modalProfileImageUrl = getEmployeeProfileImageUrl(modalAccount);
      refs.emailInput.value = String(modalAccount.email || "").trim();
      refs.phoneInput.value = String(modalAccount.mobileNumber || "").trim();
      refs.passwordInput.value = "";
      refs.confirmPasswordInput.value = "";
      lastPasswordMismatchKey = "";
      clearPasswordMismatchTimer();
      clearDuplicateTimers();
      clearAccountFieldTooltips();
      lockAccountSettingsEditableFields();
      syncProfilePreview();
      setFeedback("");
      syncBusyState(false);
      window.requestAnimationFrame(() => refs.emailEditButton.focus());
    } catch (error) {
      syncBusyState(false);
      setFeedback(error instanceof Error ? error.message : "Unable to open account settings.", "error");
    }
  }

  function closeEmployeeAccountSettings() {
    if (!modalRefs || modalBusy) {
      return;
    }

    setAvatarMenuOpen(false);
    closeProfilePictureViewer();
    closeValidationModal();
    lastPasswordMismatchKey = "";
    clearPasswordMismatchTimer();
    clearDuplicateTimers();
    clearAccountFieldTooltips();
    modalRefs.overlay.classList.remove("is-open");
    modalRefs.overlay.hidden = true;
    modalRefs.overlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
  }

  function validateSettingsForm() {
    const email = String(modalRefs.emailInput.value || "").trim().toLowerCase();
    const mobileNumber = normalizePhoneNumber(modalRefs.phoneInput.value);
    const countryCode = String(modalAccount?.countryCode || "+63").trim() || "+63";
    const password = String(modalRefs.passwordInput.value || "").trim();
    const confirmPassword = String(modalRefs.confirmPasswordInput.value || "").trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      const error = new Error('Please enter a valid "email address".');
      error.validationTarget = "email";
      throw error;
    }

    if (!/^9\d{9}$/.test(mobileNumber)) {
      const error = new Error("Phone number must start with 9 and be 10 digits long.");
      error.validationTarget = "phone";
      throw error;
    }

    if (password || confirmPassword) {
      if (password.length < 6) {
        const error = new Error('"password" must be at least 6 characters long.');
        error.validationTarget = "password";
        throw error;
      }

      if (password !== confirmPassword) {
        const error = new Error('"password" and "confirm password" must match.');
        error.validationTarget = "confirmPassword";
        throw error;
      }
    }

    return { email, mobileNumber, countryCode, password };
  }

  async function saveEmployeeAccountSettings(event) {
    event.preventDefault();
    if (modalBusy || !modalAccount) {
      return;
    }

    let values;
    try {
      values = validateSettingsForm();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Please check account settings.";
      const validationTarget = error instanceof Error ? error.validationTarget : "";
      if (validationTarget === "email") {
        setAccountFieldTooltip(modalRefs.emailInput, message);
        modalRefs.emailInput.focus();
        setFeedback("");
        return;
      }

      if (validationTarget === "phone") {
        setAccountFieldTooltip(modalRefs.phoneInput, message);
        modalRefs.phoneInput.focus();
        setFeedback("");
        return;
      }

      if (validationTarget === "password") {
        setAccountFieldTooltip(modalRefs.passwordInput, message);
        modalRefs.passwordInput.focus();
        setFeedback("");
        return;
      }

      if (validationTarget === "confirmPassword" || /password.*confirm password.*match/i.test(message)) {
        openPasswordMismatchModal();
        modalRefs.confirmPasswordInput.focus();
        setFeedback("");
        return;
      }

      setFeedback(message, "error");
      return;
    }

    syncBusyState(true);
    setFeedback("Saving changes...");

    try {
      const duplicateAccount = await findDuplicateAccount(values);
      if (duplicateAccount?.type === "email") {
        setAccountFieldTooltip(modalRefs.emailInput, "Email address is already registered.");
        modalRefs.emailInput.focus();
        setFeedback("");
        return;
      }

      if (duplicateAccount?.type === "phone") {
        setAccountFieldTooltip(modalRefs.phoneInput, "Phone number is already registered.");
        modalRefs.phoneInput.focus();
        setFeedback("");
        return;
      }

      const payload = {
        ...modalAccount,
        id: modalAccount.id || modalAccount.accountCode || modalAccount.employeeId,
        source: "web",
        email: values.email,
        mobileNumber: values.mobileNumber,
        countryCode: values.countryCode,
        profileImageUrl: modalProfileImageUrl,
        __activityActor: {
          role: "employee",
          accountId:
            modalAccount.employeeId ||
            modalAccount.accountCode ||
            modalAccount.id ||
            modalAccount.email ||
            "",
          displayName: getEmployeeDisplayName(modalAccount),
          profileImageUrl: modalProfileImageUrl,
        },
        gmailBindingEmail: "",
        gmailBinding: null,
      };

      if (values.password) {
        payload.password = values.password;
      }
      delete payload.accessPermissions;
      delete payload.employeeAccessPermissions;
      delete payload.accessPermissionsConfigured;

      const response = await fetch("/api/accounts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const errorMessage = data.message || "Unable to update account settings.";
        if (/email address is already registered/i.test(errorMessage)) {
          setAccountFieldTooltip(modalRefs.emailInput, "Email address is already registered.");
          modalRefs.emailInput.focus();
          setFeedback("");
          return;
        }

        if (/phone number is already registered/i.test(errorMessage)) {
          setAccountFieldTooltip(modalRefs.phoneInput, "Phone number is already registered.");
          modalRefs.phoneInput.focus();
          setFeedback("");
          return;
        }

        throw new Error(errorMessage);
      }

      const updatedAccount = data.account || payload;
      const currentSession = readEmployeeSession() || {};
      const nextSession = {
        ...currentSession,
        ...updatedAccount,
        dashboardPath: currentSession.dashboardPath || updatedAccount.dashboardPath,
        signedInAt: currentSession.signedInAt || new Date().toISOString(),
      };
      writeEmployeeSession(nextSession);
      modalAccount = updatedAccount;
      modalRefs.emailInput.value = String(updatedAccount.email || values.email).trim();
      modalRefs.phoneInput.value = String(updatedAccount.mobileNumber || values.mobileNumber).trim();
      syncProfilePreview();
      modalRefs.passwordInput.value = "";
      modalRefs.confirmPasswordInput.value = "";
      lastPasswordMismatchKey = "";
      clearPasswordMismatchTimer();
      clearDuplicateTimers();
      clearAccountFieldTooltips();
      lockAccountSettingsEditableFields();
      window.dispatchEvent(
        new CustomEvent("gms-employee-session-updated", {
          detail: { session: nextSession },
        }),
      );
      publishEmployeeAccountUpdate(updatedAccount);
      window.gmsApplyEmployeeWorkspaceProfile?.(nextSession);
      setFeedback("");
      openValidationModal("Account settings saved successfully.", {
        title: "Saved",
        mode: "success",
        hideAction: true,
        hideClose: true,
        allowManualClose: false,
        autoCloseMs: successCheckAnimationMs + successCheckHoldMs,
        onAutoClose: () => {
          closeEmployeeAccountSettings();
        },
      });
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to update account settings.", "error");
    } finally {
      syncBusyState(false);
    }
  }

  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const settingsLink = target?.closest("[data-employee-account-settings]");
    if (!settingsLink) {
      return;
    }

    event.preventDefault();
    void openEmployeeAccountSettings();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modalRefs && !modalRefs.overlay.hidden) {
      if (!modalRefs.validationOverlay.hidden) {
        if (validationModalAllowManualClose) {
          closeValidationModal();
        }
        return;
      }
      if (!modalRefs.photoViewer.hidden) {
        closeProfilePictureViewer();
        return;
      }
      if (!modalRefs.avatarMenu.hidden) {
        setAvatarMenuOpen(false);
        return;
      }
      closeEmployeeAccountSettings();
    }
  });

  window.gmsOpenEmployeeAccountSettings = openEmployeeAccountSettings;
})();
