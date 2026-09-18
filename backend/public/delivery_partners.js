(function () {
  const form = document.querySelector("[data-delivery-partner-form]");
  const feedback = document.querySelector("[data-delivery-feedback]");
  const imageInput = document.querySelector("[data-delivery-image-input]");
  const imageTrigger = document.querySelector("[data-delivery-image-trigger]");
  const imagePreview = document.querySelector("[data-delivery-image-preview]");
  const partnersList = document.querySelector("[data-delivery-partners-list]");
  const partnerSearchInput = document.querySelector("[data-delivery-partner-search]");
  const submitButton = document.querySelector("[data-delivery-submit]");
  const template = document.querySelector("[data-delivery-partner-template]");
  const branchInput = document.getElementById("delivery-branch");
  const validationModalOverlay = document.getElementById(
    "delivery-validation-modal-overlay",
  );
  const validationModalCloseButton = document.getElementById(
    "delivery-validation-modal-close",
  );
  const validationModalIcon = document.getElementById(
    "delivery-validation-modal-icon",
  );
  const validationModalTitle = document.getElementById(
    "delivery-validation-modal-title",
  );
  const validationModalCopy = document.getElementById(
    "delivery-validation-modal-copy",
  );
  const validationModalIssues = document.getElementById(
    "delivery-validation-modal-issues",
  );
  const validationModalActionButton = document.getElementById(
    "delivery-validation-modal-action",
  );
  const validationModalSecondaryActionButton = document.getElementById(
    "delivery-validation-modal-secondary-action",
  );

  if (
    !form ||
    !feedback ||
    !imageInput ||
    !imageTrigger ||
    !imagePreview ||
    !partnersList ||
    !partnerSearchInput ||
    !submitButton ||
    !template ||
    !branchInput ||
    !validationModalOverlay ||
    !validationModalCloseButton ||
    !validationModalIcon ||
    !validationModalTitle ||
    !validationModalCopy ||
    !validationModalIssues ||
    !validationModalActionButton ||
    !validationModalSecondaryActionButton
  ) {
    return;
  }

  let pendingImageFile = null;
  let previewObjectUrl = "";
  let isSubmitting = false;
  let isDragActive = false;
  let currentPartners = [];
  let partnerSearchTerm = "";
  let partnerSearchTimer = 0;
  let pendingValidationIssue = null;
  let validationModalOnAction = null;
  let validationModalOnSecondaryAction = null;
  let validationModalAllowOverlayClose = true;
  let validationModalAutoCloseTimer = 0;
  let deliveryPartnerRealtimeRefreshTimer = 0;

  function readSuperAdminSession() {
    try {
      const rawSession = window.sessionStorage.getItem("gms-super-admin-session");
      return rawSession ? JSON.parse(rawSession) : null;
    } catch (error) {
      return null;
    }
  }

  function withSuperAdminHeaders(headers = {}) {
    const token = String(readSuperAdminSession()?.token || "").trim();
    if (!token) {
      return headers;
    }

    return {
      ...headers,
      "X-GMS-Super-Admin-Token": token,
    };
  }
  let validationSuccessAnimation = null;
  let validationLottieLoadPromise = null;
  let deleteSuccessAudio = null;
  const branchField = branchInput.closest(".delivery-field--branch");
  const branchTooltipAnchor = branchInput.closest("label") || branchField;
  const validationLottiePlayerUrl = "/vendor/lottie.min.js";
  const validationSuccessAnimationPath = "/animations/employee-account-check.json";
  const deleteSuccessAudioUrl = "/audio/delete-success.m4a";

  form.noValidate = true;

  const validationModalIcons = Object.freeze({
    success: `<div class="product-validation-lottie-check" data-partner-validation-lottie-check></div>`,
    notice: `<i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>`,
    error: `<i class="fa-solid fa-circle-xmark" aria-hidden="true"></i>`,
    delete: `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash2-icon lucide-trash-2" aria-hidden="true"><path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
  });

  function setFeedback(message, state) {
    const normalizedMessage = String(message ?? "").trim();
    if (!normalizedMessage) {
      feedback.hidden = true;
      feedback.textContent = "";
      feedback.dataset.state = "info";
      return;
    }

    feedback.hidden = false;
    feedback.textContent = normalizedMessage;
    feedback.dataset.state = state || "info";
  }

  function syncModalOpenClass() {
    document.body.classList.toggle("modal-open", !validationModalOverlay.hidden);
  }

  function clearValidationModalAutoCloseTimer() {
    if (validationModalAutoCloseTimer) {
      window.clearTimeout(validationModalAutoCloseTimer);
      validationModalAutoCloseTimer = 0;
    }
  }

  function ensureValidationLottiePlayer() {
    if (window.lottie?.loadAnimation) {
      return Promise.resolve(true);
    }

    if (validationLottieLoadPromise) {
      return validationLottieLoadPromise;
    }

    validationLottieLoadPromise = new Promise(function (resolve) {
      const existingScript = document.querySelector(
        `script[src$="${validationLottiePlayerUrl}"], script[src*="${validationLottiePlayerUrl}?"]`,
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
      scriptElement.src = validationLottiePlayerUrl;
      scriptElement.async = true;
      scriptElement.addEventListener("load", function () {
        resolve(Boolean(window.lottie?.loadAnimation));
      }, { once: true });
      scriptElement.addEventListener("error", function () {
        resolve(false);
      }, { once: true });
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

  function getDeleteSuccessAudio() {
    if (typeof Audio !== "function") {
      return null;
    }

    if (!deleteSuccessAudio) {
      deleteSuccessAudio = new Audio(deleteSuccessAudioUrl);
      deleteSuccessAudio.preload = "auto";
    }

    return deleteSuccessAudio;
  }

  function prepareDeleteSuccessAudio() {
    const audio = getDeleteSuccessAudio();
    if (audio?.load) {
      audio.load();
    }
  }

  function playDeleteSuccessAudio() {
    const audio = getDeleteSuccessAudio();
    if (!audio) {
      return;
    }

    try {
      audio.pause();
      audio.currentTime = 0;
      const playResult = audio.play();
      if (playResult?.catch) {
        playResult.catch(function (error) {
          console.warn("Unable to play delete success audio.", error);
        });
      }
    } catch (error) {
      console.warn("Unable to play delete success audio.", error);
    }
  }

  async function playValidationSuccessAnimation() {
    const container = validationModalIcon.querySelector("[data-partner-validation-lottie-check]");
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
      validationModalOverlay.hidden
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

  function focusValidationIssue(issue) {
    if (!issue || typeof issue !== "object") {
      return;
    }

    if (issue.focusTarget === "image") {
      window.requestAnimationFrame(function () {
        imageTrigger.focus();
      });
      return;
    }

    if (
      issue.focusControl instanceof HTMLElement &&
      typeof issue.focusControl.focus === "function"
    ) {
      window.requestAnimationFrame(function () {
        issue.focusControl.focus();
      });
    }
  }

  function normalizeBranchDuplicateKey(value) {
    return String(value ?? "").trim().replace(/\s+/g, "").toLowerCase();
  }

  function isDuplicateBranchValue(value) {
    const normalizedValue = normalizeBranchDuplicateKey(value);
    if (!normalizedValue) {
      return false;
    }

    return currentPartners.some(function (partner) {
      return normalizeBranchDuplicateKey(partner?.branch) === normalizedValue;
    });
  }

  function getDuplicateBranchValidationMessage(value) {
    return isDuplicateBranchValue(value)
      ? "Delivery partner branch is already registered."
      : "";
  }

  function getBranchValidationMessage(value) {
    const normalizedValue = String(value ?? "").trim();
    if (!normalizedValue) {
      return "Please fill up branch.";
    }

    if (normalizedValue.length < 2) {
      return "Branch must be at least 2 characters long.";
    }

    return getDuplicateBranchValidationMessage(normalizedValue);
  }

  function setBranchValidationBubble(message) {
    const normalizedMessage = String(message ?? "").trim();
    if (branchField) {
      branchField.classList.toggle("is-invalid", Boolean(normalizedMessage));
    }

    if (normalizedMessage) {
      branchInput.setAttribute("aria-invalid", "true");
      if (branchTooltipAnchor instanceof HTMLElement) {
        branchTooltipAnchor.dataset.branchTooltip = normalizedMessage;
      }
      return;
    }

    branchInput.removeAttribute("aria-invalid");
    if (branchTooltipAnchor instanceof HTMLElement) {
      delete branchTooltipAnchor.dataset.branchTooltip;
    }
  }

  function hideValidationModalOverlay(callback) {
    if (!(validationModalOverlay instanceof HTMLElement)) {
      if (typeof callback === "function") {
        callback();
      }
      return;
    }

    validationModalOverlay.classList.remove("is-open");

    let cleanedUp = false;
    const cleanup = () => {
      if (cleanedUp) {
        return;
      }

      cleanedUp = true;
      validationModalOverlay.hidden = true;
      validationModalOverlay.removeEventListener("transitionend", handleTransitionEnd);
      window.clearTimeout(exitTimer);

      if (typeof callback === "function") {
        callback();
      }
    };

    const handleTransitionEnd = (event) => {
      if (event.target !== validationModalOverlay) {
        return;
      }
      cleanup();
    };

    validationModalOverlay.addEventListener("transitionend", handleTransitionEnd);
    const exitTimer = window.setTimeout(cleanup, 300);
  }

  function closeValidationModal(options) {
    const shouldFocusIssue = Boolean(options?.focusIssue);
    const onClosed = typeof options?.onClosed === "function" ? options.onClosed : null;
    clearValidationModalAutoCloseTimer();
    destroyValidationSuccessAnimation();
    hideValidationModalOverlay(() => {
      syncModalOpenClass();

      if (shouldFocusIssue) {
        focusValidationIssue(pendingValidationIssue);
      }

      pendingValidationIssue = null;
      validationModalOnAction = null;
      validationModalOnSecondaryAction = null;
      validationModalAllowOverlayClose = true;
      validationModalActionButton.disabled = false;
      validationModalSecondaryActionButton.disabled = false;

      if (onClosed) {
        onClosed();
      }
    });
  }

  function openValidationModal(config) {
    clearValidationModalAutoCloseTimer();
    destroyValidationSuccessAnimation();

    const mode = String(config?.mode ?? "error").trim().toLowerCase();
    const iconVariant = String(config?.iconVariant ?? mode).trim().toLowerCase();
    const issues = Array.isArray(config?.issues)
      ? config.issues.filter(function (issue) {
        return issue && String(issue.label ?? "").trim();
      })
      : [];

    validationModalTitle.textContent =
      String(config?.title ?? "").trim() || "Important notice";

    const copy = String(config?.copy ?? "").trim();
    validationModalCopy.textContent = copy;
    validationModalCopy.hidden = !copy;

    validationModalIssues.innerHTML = "";
    validationModalIssues.hidden = issues.length === 0;
    issues.forEach(function (issue) {
      const listItem = document.createElement("li");
      listItem.textContent = issue.label;
      validationModalIssues.appendChild(listItem);
    });

    const hideAction = config?.hideAction === true;
    validationModalActionButton.textContent =
      String(config?.actionLabel ?? "").trim() || "Okay";
    validationModalActionButton.hidden = hideAction;

    const secondaryActionLabel = String(
      config?.secondaryActionLabel ?? "",
    ).trim();
    validationModalSecondaryActionButton.textContent =
      secondaryActionLabel || "Cancel";
    validationModalSecondaryActionButton.hidden = hideAction || !secondaryActionLabel;

    validationModalOnAction =
      typeof config?.onAction === "function" ? config.onAction : null;
    validationModalOnSecondaryAction =
      typeof config?.onSecondaryAction === "function"
        ? config.onSecondaryAction
        : null;
    validationModalAllowOverlayClose = config?.allowOverlayClose !== false;
    pendingValidationIssue = issues[0] ?? null;

    validationModalCloseButton.hidden =
      config?.hideClose === true || config?.showCloseButton === false;
    validationModalActionButton.disabled = false;
    validationModalSecondaryActionButton.disabled = false;

    validationModalIcon.className = "validation-modal__icon";
    delete validationModalIcon.dataset.faIconClass;
    if (iconVariant === "success") {
      validationModalIcon.classList.add("validation-modal__icon--success");
    } else if (iconVariant === "notice") {
      validationModalIcon.classList.add("validation-modal__icon--notice");
    } else {
      validationModalIcon.classList.add("validation-modal__icon--error");
      if (iconVariant === "delete") {
        validationModalIcon.classList.add("validation-modal__icon--delete");
      }
    }
    validationModalIcon.innerHTML =
      validationModalIcons[iconVariant] || validationModalIcons.error;

    validationModalOverlay.hidden = false;
    if (iconVariant === "success") {
      void playValidationSuccessAnimation();
    }
    window.requestAnimationFrame(function () {
      validationModalOverlay.classList.add("is-open");
    });
    syncModalOpenClass();

    const normalizedAutoCloseMs = Number(config?.autoCloseMs);
    if (Number.isFinite(normalizedAutoCloseMs) && normalizedAutoCloseMs > 0) {
      validationModalAutoCloseTimer = window.setTimeout(function () {
        validationModalAutoCloseTimer = 0;
        closeValidationModal({ focusIssue: false });
      }, normalizedAutoCloseMs);
    }

    window.requestAnimationFrame(function () {
      if (!validationModalActionButton.hidden) {
        validationModalActionButton.focus();
      } else if (!validationModalCloseButton.hidden) {
        validationModalCloseButton.focus();
      } else {
        validationModalOverlay.focus?.();
      }
    });
  }

  function openSuccessFeedbackModal(copy, options = {}) {
    openValidationModal({
      mode: "success",
      title: "Success",
      copy,
      hideAction: true,
      hideClose: true,
      allowOverlayClose: false,
      autoCloseMs: 2000,
    });
    if (options?.playDeleteSound === true) {
      playDeleteSuccessAudio();
    }
  }

  function revokePreviewObjectUrl() {
    if (!previewObjectUrl) {
      return;
    }

    URL.revokeObjectURL(previewObjectUrl);
    previewObjectUrl = "";
  }

  function setDragActive(value) {
    isDragActive = Boolean(value);
    imagePreview.classList.toggle("is-drag-active", isDragActive);
  }

  function isAcceptedImageFile(file) {
    if (!file) {
      return false;
    }

    const type = String(file.type || "").toLowerCase();
    if (type.startsWith("image/")) {
      return true;
    }

    return /\.(png|jpe?g)$/i.test(String(file.name || ""));
  }

  function clearSelectedImage() {
    pendingImageFile = null;
    imageInput.value = "";
    setFeedback("", "info");
    renderImagePreview(null);
  }

  function renderImagePreview(file) {
    revokePreviewObjectUrl();
    setDragActive(false);

    if (!file) {
      imagePreview.innerHTML = `
        <div class="delivery-upload__placeholder">
          <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true">
            <path d="M22 46H19c-6.1 0-11-4.9-11-11 0-5.6 4.2-10.3 9.7-10.9A15.4 15.4 0 0 1 32.6 12C39.4 12 45 16.4 46.8 22.6A11 11 0 0 1 48 44H42" stroke-linecap="round" stroke-linejoin="round"></path>
            <path d="M32 51V27" stroke-linecap="round"></path>
            <path d="m23 36 9-9 9 9" stroke-linecap="round" stroke-linejoin="round"></path>
          </svg>
          <p class="delivery-upload__title">select your file or drag and drop</p>
          <span class="delivery-upload__browse" aria-hidden="true">browse</span>
        </div>
      `;
      return;
    }

    previewObjectUrl = URL.createObjectURL(file);
    imagePreview.innerHTML = `
      <button
        type="button"
        class="product-gallery-modal__close validation-modal__close delivery-upload__clear"
        data-delivery-image-clear
        aria-label="Remove selected delivery partner image"
        title="Remove selected delivery partner image"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
          <path d="M6 6l12 12" stroke-linecap="round"></path>
          <path d="M18 6 6 18" stroke-linecap="round"></path>
        </svg>
      </button>
      <img alt="Selected delivery partner preview" src="${previewObjectUrl}" />
    `;
  }

  function setSubmitting(value) {
    isSubmitting = Boolean(value);
    submitButton.disabled = isSubmitting;
    submitButton.textContent = isSubmitting
      ? "Saving..."
      : "Save";
  }

  async function readApiPayload(response) {
    const raw = await response.text();
    const trimmed = raw.trim();

    if (!trimmed) {
      return {};
    }

    try {
      return JSON.parse(trimmed);
    } catch (error) {
      return {
        message: trimmed,
      };
    }
  }

  function getApiErrorMessage(response, data, fallbackMessage) {
    const serverMessage = String(data?.message ?? "").trim();
    if (serverMessage) {
      if (
        response.status === 404 &&
        serverMessage.toLowerCase() === "not found"
      ) {
        return "Delivery partners API was not found. Restart backend/server.js, then refresh this page.";
      }

      return serverMessage;
    }

    if (response.status === 404) {
      return "Delivery partners API was not found. Restart backend/server.js, then refresh this page.";
    }

    return fallbackMessage;
  }

  async function uploadImageFile(file) {
    const response = await fetch("/api/uploads", {
      method: "POST",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        "X-File-Name": file.name,
      },
      body: file,
    });

    const data = await readApiPayload(response);
    if (!response.ok) {
      throw new Error(
        getApiErrorMessage(response, data, "Unable to upload image."),
      );
    }

    return data.imageUrl;
  }

  function renderPartnerImage(container, partner) {
    const imageUrl = String(partner?.imageUrl ?? "").trim();

    if (!imageUrl) {
      container.innerHTML = `
        <div class="delivery-card__fallback" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M4 10.5 12 4l8 6.5"></path>
            <path d="M6.5 9.75V18a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V9.75"></path>
            <path d="M9 14h6"></path>
          </svg>
        </div>
      `;
      return;
    }

    container.innerHTML = `<img alt="${partner.branch} image" src="${imageUrl}" />`;
  }

  function readPartnerEnabledFlag(partner) {
    const readBoolean = (value, fallback) => {
      if (typeof value === "boolean") {
        return value;
      }
      if (typeof value === "number" && Number.isFinite(value)) {
        return value !== 0;
      }
      const normalizedValue = String(value ?? "").trim().toLowerCase();
      if (["true", "active", "enabled", "1"].includes(normalizedValue)) {
        return true;
      }
      if (["false", "inactive", "disabled", "0"].includes(normalizedValue)) {
        return false;
      }
      return fallback;
    };

    if (readBoolean(partner?.disabled, false)) {
      return false;
    }
    if (Object.prototype.hasOwnProperty.call(partner ?? {}, "enabled")) {
      return readBoolean(partner.enabled, true);
    }
    if (Object.prototype.hasOwnProperty.call(partner ?? {}, "isEnabled")) {
      return readBoolean(partner.isEnabled, true);
    }
    if (Object.prototype.hasOwnProperty.call(partner ?? {}, "isActive")) {
      return readBoolean(partner.isActive, true);
    }

    const status = String(partner?.status ?? "").trim().toLowerCase();
    return !["inactive", "disabled", "archived", "deleted"].includes(status);
  }

  function getPartnerActiveToggleLabel(partnerName, isActive) {
    return `${isActive ? "Deactivate" : "Activate"} ${partnerName}`;
  }

  function syncPartnerActiveToggleState(toggleButton, partnerName, isActive) {
    if (!(toggleButton instanceof HTMLButtonElement)) {
      return;
    }

    const normalizedIsActive = Boolean(isActive);
    const label = getPartnerActiveToggleLabel(partnerName, normalizedIsActive);
    toggleButton.classList.toggle("is-active", normalizedIsActive);
    toggleButton.setAttribute("aria-pressed", normalizedIsActive ? "true" : "false");
    toggleButton.setAttribute("aria-label", label);
    toggleButton.title = label;
  }

  function normalizePartnerSearchTerm(value) {
    return String(value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
  }

  function getFilteredPartners() {
    const normalizedSearchTerm = normalizePartnerSearchTerm(partnerSearchTerm);
    if (!normalizedSearchTerm) {
      return currentPartners;
    }

    return currentPartners.filter(function (partner) {
      return normalizePartnerSearchTerm(partner?.branch).includes(normalizedSearchTerm);
    });
  }

  function renderPartners(partners) {
    const normalizedPartners = Array.isArray(partners) ? partners : [];
    currentPartners = normalizedPartners;
    renderPartnerSearchResults();
  }

  function renderPartnerSearchResults() {
    const visiblePartners = getFilteredPartners();
    partnersList.innerHTML = "";

    if (currentPartners.length === 0) {
      partnersList.innerHTML = `
        <div class="delivery-empty">
          No delivery partners yet. Add your first partner using the form.
        </div>
      `;
      return;
    }

    if (visiblePartners.length === 0) {
      partnersList.innerHTML = `
        <div class="delivery-empty">
          No delivery partners match your search.
        </div>
      `;
      return;
    }

    for (const partner of visiblePartners) {
      const fragment = template.content.cloneNode(true);
      const cardImage = fragment.querySelector("[data-partner-image]");
      const branch = fragment.querySelector("[data-partner-branch]");
      const removeButton = fragment.querySelector("[data-partner-remove]");
      const activeToggleButton = fragment.querySelector("[data-partner-active-toggle]");

      renderPartnerImage(cardImage, partner);
      branch.textContent = partner.branch || "Unnamed Branch";
      const partnerName = branch.textContent;
      const isActive = readPartnerEnabledFlag(partner);
      removeButton.setAttribute("aria-label", `Remove ${branch.textContent}`);
      removeButton.title = `Remove ${branch.textContent}`;
      removeButton.addEventListener("click", function () {
        deletePartner(partner);
      });
      syncPartnerActiveToggleState(activeToggleButton, partnerName, isActive);
      activeToggleButton?.addEventListener("click", function () {
        void updatePartnerActiveState(partner, !isActive, activeToggleButton);
      });

      partnersList.appendChild(fragment);
    }
  }

  async function updatePartnerActiveState(partner, nextActive, toggleButton) {
    const partnerId = String(partner?.id ?? "").trim();
    if (!partnerId) {
      return;
    }

    const partnerName =
      String(partner?.branch ?? "").trim() || "This delivery partner";
    const previousActive = readPartnerEnabledFlag(partner);
    const nextIsActive = Boolean(nextActive);

    try {
      if (toggleButton instanceof HTMLButtonElement) {
        toggleButton.disabled = true;
        syncPartnerActiveToggleState(toggleButton, partnerName, nextIsActive);
      }

      const response = await fetch(
        `/api/delivery-partners/${encodeURIComponent(partnerId)}`,
        {
          method: "PATCH",
          headers: withSuperAdminHeaders({
            "Content-Type": "application/json",
            Accept: "application/json",
          }),
          body: JSON.stringify({ isActive: nextIsActive }),
        },
      );
      const data = await readApiPayload(response);

      if (!response.ok) {
        throw new Error(
          getApiErrorMessage(
            response,
            data,
            "Unable to update delivery partner status.",
          ),
        );
      }

      const updatedPartner = data.partner || {
        ...partner,
        isActive: nextIsActive,
        enabled: nextIsActive,
        isEnabled: nextIsActive,
        disabled: false,
        status: nextIsActive ? "active" : "inactive",
      };
      currentPartners = currentPartners.map((currentPartner) =>
        String(currentPartner?.id ?? "").trim() === partnerId
          ? updatedPartner
          : currentPartner,
      );
      setFeedback(data.message || `${partnerName} ${nextIsActive ? "activated" : "deactivated"}.`, "success");
      renderPartnerSearchResults();
    } catch (error) {
      syncPartnerActiveToggleState(toggleButton, partnerName, previousActive);
      setFeedback("", "info");
      openValidationModal({
        mode: "error",
        title: "Opps!",
        copy:
          error instanceof Error
            ? error.message
            : "Unable to update delivery partner status.",
        actionLabel: "Okay",
      });
    } finally {
      if (toggleButton instanceof HTMLButtonElement) {
        toggleButton.disabled = false;
      }
    }
  }

  async function fetchPartners() {
    const response = await fetch("/api/delivery-partners", {
      headers: withSuperAdminHeaders({ Accept: "application/json" }),
    });
    const data = await readApiPayload(response);

    if (!response.ok) {
      throw new Error(
        getApiErrorMessage(
          response,
          data,
          "Unable to load delivery partners.",
        ),
      );
    }

    return Array.isArray(data.partners) ? data.partners : [];
  }

  async function loadPartners(options = {}) {
    try {
      const partners = await fetchPartners();
      renderPartners(partners);
    } catch (error) {
      if (options?.preserveOnError === true) {
        console.warn("Unable to refresh delivery partners in the background.", error);
        return;
      }
      console.error(error);
      setFeedback(
        error instanceof Error
          ? error.message
          : "Unable to load delivery partners.",
        "error",
      );
      renderPartners([]);
    }
  }

  async function removePartnerById(partnerId, branch) {
    try {
      const response = await fetch(
        `/api/delivery-partners/${encodeURIComponent(partnerId)}`,
        {
          method: "DELETE",
          headers: withSuperAdminHeaders({ Accept: "application/json" }),
        },
      );
      const data = await readApiPayload(response);

      if (!response.ok) {
        throw new Error(
          getApiErrorMessage(
            response,
            data,
            "Unable to delete delivery partner.",
          ),
        );
      }

      setFeedback("", "info");
      await loadPartners();
      openSuccessFeedbackModal(`${branch} has been removed from the delivery partners list.`, {
        playDeleteSound: true,
      });
    } catch (error) {
      setFeedback("", "info");
      openValidationModal({
        mode: "error",
        title: "Opps!",
        copy:
          error instanceof Error
            ? error.message
            : "Unable to delete delivery partner.",
        actionLabel: "Okay",
      });
    }
  }

  function deletePartner(partner) {
    const partnerId = String(partner?.id ?? "").trim();
    if (!partnerId) {
      return;
    }

    const branch =
      String(partner?.branch ?? "").trim() || "This delivery partner";
    setFeedback("", "info");
    openValidationModal({
      mode: "error",
      iconVariant: "delete",
      title: "Opps!",
      copy: `Are you sure you want to remove ${branch} from the delivery partners list?`,
      actionLabel: "Continue",
      secondaryActionLabel: "Cancel",
      allowOverlayClose: false,
      onAction: function () {
        prepareDeleteSuccessAudio();
        closeValidationModal({
          focusIssue: false,
          onClosed: function () {
            void removePartnerById(partnerId, branch);
          },
        });
        return true;
      },
      onSecondaryAction: function () {
        closeValidationModal({ focusIssue: false });
        return true;
      },
    });
  }

  function resetForm() {
    form.reset();
    setBranchValidationBubble("");
    clearSelectedImage();
  }

  validationModalCloseButton.addEventListener("click", function () {
    closeValidationModal({ focusIssue: Boolean(pendingValidationIssue) });
  });

  validationModalActionButton.addEventListener("click", function () {
    if (typeof validationModalOnAction === "function") {
      const handled = validationModalOnAction();
      if (handled === true) {
        return;
      }
    }

    closeValidationModal({ focusIssue: Boolean(pendingValidationIssue) });
  });

  validationModalSecondaryActionButton.addEventListener("click", function () {
    if (typeof validationModalOnSecondaryAction === "function") {
      const handled = validationModalOnSecondaryAction();
      if (handled === true) {
        return;
      }
    }

    closeValidationModal({ focusIssue: false });
  });

  validationModalOverlay.addEventListener("click", function (event) {
    if (
      event.target === validationModalOverlay &&
      validationModalAllowOverlayClose
    ) {
      closeValidationModal({ focusIssue: false });
    }
  });

  document.addEventListener("keydown", function (event) {
    if (
      event.key === "Escape" &&
      !validationModalOverlay.hidden &&
      validationModalAllowOverlayClose
    ) {
      closeValidationModal({ focusIssue: false });
    }
  });

  imageTrigger.addEventListener("click", function (event) {
    if (event.target.closest("[data-delivery-image-clear]")) {
      clearSelectedImage();
      return;
    }

    imageInput.click();
  });

  imageTrigger.addEventListener("keydown", function (event) {
    if (event.target.closest("[data-delivery-image-clear]")) {
      return;
    }

    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    imageInput.click();
  });

  imageTrigger.addEventListener("dragenter", function (event) {
    event.preventDefault();
    setDragActive(true);
  });

  imageTrigger.addEventListener("dragover", function (event) {
    event.preventDefault();
    setDragActive(true);
  });

  imageTrigger.addEventListener("dragleave", function (event) {
    event.preventDefault();
    if (imageTrigger.contains(event.relatedTarget)) {
      return;
    }

    setDragActive(false);
  });

  imageTrigger.addEventListener("drop", function (event) {
    event.preventDefault();
    setDragActive(false);

    const file = event.dataTransfer?.files?.[0] || null;
    if (!file) {
      return;
    }

    if (!isAcceptedImageFile(file)) {
      pendingImageFile = null;
      renderImagePreview(null);
      setFeedback("", "info");
      openValidationModal({
        mode: "error",
        title: "Opps!",
        copy: "Please upload a PNG, JPG, or JPEG image file only.",
        issues: [
          {
            label: "Only image files in PNG, JPG, or JPEG format are supported.",
            focusTarget: "image",
          },
        ],
        actionLabel: "Choose Again",
      });
      return;
    }

    pendingImageFile = file;
    setFeedback("", "info");
    renderImagePreview(pendingImageFile);
  });

  imageInput.addEventListener("change", function () {
    const file = imageInput.files && imageInput.files[0];
    if (file && !isAcceptedImageFile(file)) {
      pendingImageFile = null;
      imageInput.value = "";
      renderImagePreview(null);
      setFeedback("", "info");
      openValidationModal({
        mode: "error",
        title: "Opps!",
        copy: "Please upload a PNG, JPG, or JPEG image file only.",
        issues: [
          {
            label: "Only image files in PNG, JPG, or JPEG format are supported.",
            focusTarget: "image",
          },
        ],
        actionLabel: "Choose Again",
      });
      return;
    }

    pendingImageFile = file || null;
    setFeedback("", "info");
    renderImagePreview(pendingImageFile);
  });

  partnerSearchInput.addEventListener("input", function () {
    window.clearTimeout(partnerSearchTimer);
    partnerSearchTimer = window.setTimeout(() => {
      partnerSearchTerm = partnerSearchInput.value;
      renderPartnerSearchResults();
    }, 500);
  });

  branchInput.addEventListener("input", function () {
    const duplicateMessage = getDuplicateBranchValidationMessage(branchInput.value);
    if (!duplicateMessage && !branchField?.classList.contains("is-invalid")) {
      return;
    }

    setBranchValidationBubble(duplicateMessage || getBranchValidationMessage(branchInput.value));
  });

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    const branch = String(form.elements.branch?.value ?? "").trim();
    const branchValidationMessage = getBranchValidationMessage(branch);

    const issues = [];
    if (!pendingImageFile) {
      issues.push({
        label: "Please choose a delivery partner image.",
        focusTarget: "image",
      });
    }

    if (branchValidationMessage) {
      setBranchValidationBubble(branchValidationMessage);
      issues.push({
        label: branchValidationMessage,
        focusControl: branchInput,
      });
    } else {
      setBranchValidationBubble("");
    }

    if (issues.length > 0) {
      setFeedback("", "info");
      openValidationModal({
        mode: "error",
        title: "Opps!",
        copy: "Please complete the required delivery partner details before saving.",
        issues,
        actionLabel: "Review Fields",
      });
      return;
    }

    setSubmitting(true);
    setFeedback("Uploading image and saving delivery partner...", "info");

    try {
      const imageUrl = await uploadImageFile(pendingImageFile);
      const response = await fetch("/api/delivery-partners", {
        method: "POST",
        headers: withSuperAdminHeaders({
          Accept: "application/json",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          branch,
          imageUrl,
        }),
      });
      const data = await readApiPayload(response);

      if (!response.ok) {
        throw new Error(
          getApiErrorMessage(
            response,
            data,
            "Unable to save delivery partner.",
          ),
        );
      }

      setFeedback("", "info");
      resetForm();
      await loadPartners();
      openSuccessFeedbackModal("Delivery partner saved and connected to the app.");
    } catch (error) {
      setFeedback("", "info");
      openValidationModal({
        mode: "error",
        title: "Opps!",
        copy:
          error instanceof Error
            ? error.message
            : "Unable to save delivery partner.",
        actionLabel: "Okay",
      });
    } finally {
      setSubmitting(false);
    }
  });

  function handleDeliveryPartnerRealtimeChange(event) {
    const detail = event?.detail && typeof event.detail === "object" ? event.detail : {};
    if (detail.type === "ready") {
      if (detail.reconnected !== true) {
        return;
      }
    } else if (detail.type === "data-change") {
      const topics = Array.isArray(detail.topics)
        ? detail.topics.map((topic) => String(topic || "").trim().toLowerCase())
        : [];
      if (!topics.includes("all") && !topics.includes("delivery-partners")) {
        return;
      }
    } else {
      return;
    }

    window.clearTimeout(deliveryPartnerRealtimeRefreshTimer);
    deliveryPartnerRealtimeRefreshTimer = window.setTimeout(() => {
      deliveryPartnerRealtimeRefreshTimer = 0;
      void loadPartners({ preserveOnError: true });
    }, 180);
  }

  renderImagePreview(null);
  window.addEventListener("gms:realtime-change", handleDeliveryPartnerRealtimeChange);
  void loadPartners();
})();
