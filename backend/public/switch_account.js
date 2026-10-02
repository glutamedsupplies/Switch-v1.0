(() => {
  const auth = window.SwitchBuyerAuth;
  const session = auth?.readBuyerSession?.();
  if (!session) {
    window.location.replace("/login.html");
    return;
  }

  const initialGoogleConnection = resolveGoogleConnection(session);
  const state = {
    billingCycle: "monthly",
    plans: [],
    selectedPlan: null,
    paymentCard: null,
    sellerPin: "",
    companyPassword: "",
    storeTypes: [],
    selectedStoreType: "",
    businessTypeSearchTerm: "",
    companyLogoFile: null,
    companyLogoPreviewUrl: "",
    companyLogoUploadedUrl: "",
    companyLogoSkipped: false,
    sellerKind: "",
    payoutBank: {
      bankName: "",
      accountName: "",
      accountNumber: "",
    },
    kycDocuments: {},
    activeKycSlot: "",
    verifyChannel: "email",
    verificationToken: "",
    emailVerified: Boolean(session.emailVerified),
    mobileVerified: Boolean(session.mobileVerified),
    accountId: String(session.accountId || session.id || "").trim(),
    email: String(session.email || "").trim(),
    countryCode: String(session.countryCode || "+63").trim() || "+63",
    mobileNumber: String(session.mobileNumber || session.phone || "").trim(),
    googleConnected: initialGoogleConnection.connected,
    googleEmail: initialGoogleConnection.email,
    companyId: "",
    firstCompanyFree: true,
    requiresPaidPlan: false,
    existingCompanyCount: 0,
    canSubmitFreeFirst: true,
    paidExtraSlot: null,
    busy: false,
    deleteBusy: false,
    step: "pin",
  };

  const els = {
    name: document.querySelector("[data-buyer-account-name]"),
    email: document.querySelector("[data-buyer-account-email]"),
    phone: document.querySelector("[data-buyer-account-phone]"),
    id: document.querySelector("[data-buyer-account-id]"),
    avatar: document.querySelector("[data-ba-avatar]"),
    emailVerified: document.querySelector("[data-ba-email-verified]"),
    mobileVerified: document.querySelector("[data-ba-mobile-verified]"),
    googleMethod: document.querySelector("[data-ba-google-method]"),
    googleCopy: document.querySelector("[data-ba-google-copy]"),
    googleStatus: document.querySelector("[data-ba-google-status]"),
    googleStatusLabel: document.querySelector("[data-ba-google-status-label]"),
    sellerStatus: document.querySelector("[data-ba-seller-status]"),
    startSeller: document.querySelector("[data-ba-start-seller]"),
    wizard: document.querySelector("[data-ba-wizard]"),
    wizardFeedback: document.querySelector("[data-ba-wizard-feedback]"),
    wizardTitle: document.getElementById("ba-wizard-title"),
    finishSeller: document.querySelector("[data-ba-finish-seller]"),
    progress: document.querySelector("[data-ba-wizard-progress]"),
    verifyTarget: document.querySelector("[data-ba-verify-target]"),
    businessType: document.querySelector("[data-ba-business-type]"),
    businessTypes: document.querySelector("[data-ba-business-types]"),
    businessTypeSearch: document.querySelector("[data-ba-business-type-search]"),
    companyLogoInput: document.querySelector("[data-ba-company-logo-input]"),
    companyLogoPreview: document.querySelector("[data-ba-company-logo-preview]"),
    companyLogoDefault: document.querySelector("[data-ba-company-logo-default]"),
    companyLogoName: document.querySelector("[data-ba-company-logo-name]"),
    companyLogoStatus: document.querySelector("[data-ba-company-logo-status]"),
    companyLogoRemove: document.querySelector("[data-ba-company-logo-remove]"),
    documentInput: document.querySelector("[data-ba-document-input]"),
    sellerKindCopy: document.querySelector("[data-ba-seller-kind-copy]"),
    payoutBank: document.querySelector("[data-ba-payout-bank]"),
    kycSlots: document.querySelector("[data-ba-kyc-slots]"),
    companyDocuments: document.querySelector("[data-ba-company-documents]"),
    bankName: document.querySelector("[data-ba-bank-name]"),
    bankAccountName: document.querySelector("[data-ba-bank-account-name]"),
    bankAccountNumber: document.querySelector("[data-ba-bank-account-number]"),
    bankAccountNameLabel: document.querySelector("[data-ba-bank-account-name-label]"),
    doneCopy: document.querySelector("[data-ba-done-copy]"),
    openDashboard: document.querySelector("[data-ba-open-dashboard]"),
    deleteModal: document.querySelector("[data-ba-delete-modal]"),
    deleteConfirmation: document.querySelector("[data-ba-delete-confirmation]"),
    deleteEmail: document.querySelector("[data-ba-delete-email]"),
    deleteFeedback: document.querySelector("[data-ba-delete-feedback]"),
    deleteSubmit: document.querySelector("[data-ba-delete-submit]"),
  };

  function setActionBusy(button, busy, busyLabel = "") {
    if (!(button instanceof HTMLButtonElement) && !(button instanceof HTMLElement)) {
      return;
    }
    if (busy) {
      if (!button.dataset.baIdleLabel) {
        button.dataset.baIdleLabel = String(button.textContent || "").trim();
      }
      button.disabled = true;
      button.setAttribute("aria-busy", "true");
      button.classList.add("is-busy");
      if (busyLabel) {
        button.textContent = busyLabel;
      }
      return;
    }
    button.disabled = false;
    button.removeAttribute("aria-busy");
    button.classList.remove("is-busy");
    if (button.dataset.baIdleLabel) {
      button.textContent = button.dataset.baIdleLabel;
    }
  }

  const FIRST_COMPANY_STEPS = ["pin", "company"];
  const EXTRA_COMPANY_STEPS = ["pin", "company"];
  const STEP_TITLES = {
    pin: "Create Switch PIN",
    verify: "Verify your contact",
    company: "Company profile",
    done: "You're ready",
  };
  const FIRST_COMPANY_FREE_PLAN = {
    id: "seller-free",
    name: "Free",
    billingCycle: "monthly",
    amount: 0,
    yearlyAmount: 0,
    currencyCode: "PHP",
    free: true,
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function displayName() {
    return auth.getDisplayName?.(session) || state.email.split("@")[0] || "Shopper";
  }

  function phoneDisplay() {
    const mobile = String(state.mobileNumber || "").trim();
    if (!mobile) return "—";
    return `${state.countryCode} ${mobile}`.trim();
  }

  function isVerified() {
    return Boolean(state.emailVerified || state.mobileVerified);
  }

  function setFeedback(node, message, type) {
    if (!node) return;
    node.textContent = String(message || "").trim();
    node.classList.remove("is-error", "is-success");
    if (type === "error") node.classList.add("is-error");
    if (type === "success") node.classList.add("is-success");
  }

  async function fetchJson(url, options = {}) {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
      },
      ...options,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.message || "Request failed.");
      error.code = payload.code || "";
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  function persistBuyerSessionPatch(patch) {
    try {
      const next = { ...session, ...patch };
      Object.assign(session, next);
      window.localStorage.setItem("gms-buyer-session", JSON.stringify(next));
      window.sessionStorage.setItem("gms-buyer-session", JSON.stringify(next));
    } catch (_) {}
  }

  function resolveGoogleConnection(account = {}) {
    const binding = account?.gmailBinding ?? account?.googleBinding ?? null;
    const bindingEmail = typeof binding === "string"
      ? binding.trim()
      : String(binding?.email || "").trim();
    const googleProfile = account?.googleProfile && typeof account.googleProfile === "object"
      ? account.googleProfile
      : null;
    const profileEmail = String(googleProfile?.email || "").trim();
    const provider = String(
      account?.authProvider
        || account?.signInProvider
        || account?.identityProvider
        || "",
    ).trim().toLowerCase();
    const connected = Boolean(
      bindingEmail
        || googleProfile?.subject
        || profileEmail
        || account?.googleSubject
        || provider === "google"
        || provider === "google.com",
    );

    return {
      connected,
      email: bindingEmail || profileEmail || (connected ? String(account?.email || "").trim() : ""),
    };
  }

  function setGoogleConnection(account = {}) {
    const connection = resolveGoogleConnection(account);
    state.googleConnected = connection.connected;
    state.googleEmail = connection.email;
  }

  function renderGoogleConnection() {
    if (!els.googleMethod) return;
    const connected = Boolean(state.googleConnected);
    els.googleMethod.classList.toggle("is-connected", connected);
    els.googleMethod.classList.toggle("is-not-connected", !connected);
    els.googleMethod.setAttribute(
      "aria-label",
      connected ? "Google sign-in connected" : "Google sign-in not connected",
    );
    if (els.googleStatusLabel) {
      els.googleStatusLabel.textContent = connected ? "Connected" : "Not connected";
    }
    if (els.googleCopy) {
      els.googleCopy.textContent = connected
        ? `Google sign-in is connected${state.googleEmail ? ` as ${state.googleEmail}` : ""}.`
        : "No Google account is linked to this profile.";
      els.googleCopy.title = els.googleCopy.textContent;
    }
  }

  function fillProfile() {
    const name = displayName();
    const avatarUrl = String(
      session.profileImageUrl
        || session.avatarUrl
        || session.photoUrl
        || session.pictureUrl
        || session.imageUrl
        || (
          session.googleProfile && typeof session.googleProfile === "object"
            ? session.googleProfile.picture
            : ""
        )
        || "",
    ).trim();
    if (els.name) els.name.value = name;
    if (els.email) els.email.value = state.email || "—";
    if (els.phone) els.phone.value = phoneDisplay();
    if (els.id) els.id.value = state.accountId || "—";
    if (els.avatar) {
      els.avatar.replaceChildren();
      if (avatarUrl) {
        const image = document.createElement("img");
        image.src = avatarUrl;
        image.alt = "";
        image.loading = "lazy";
        image.decoding = "async";
        if (
          /googleusercontent\.com|ggpht\.com|google\.com\/a\//i.test(avatarUrl)
        ) {
          image.referrerPolicy = "no-referrer";
        }
        image.addEventListener(
          "error",
          () => {
            els.avatar.replaceChildren();
            els.avatar.textContent = (name || "S").slice(0, 1).toUpperCase();
          },
          { once: true },
        );
        els.avatar.appendChild(image);
      } else {
        els.avatar.textContent = (name || "S").slice(0, 1).toUpperCase();
      }
    }
    if (els.emailVerified) {
      els.emailVerified.textContent = state.emailVerified ? "Email: verified" : "Email: not verified";
      els.emailVerified.classList.toggle("is-ok", state.emailVerified);
    }
    if (els.mobileVerified) {
      els.mobileVerified.textContent = state.mobileVerified ? "Phone: verified" : "Phone: not verified";
      els.mobileVerified.classList.toggle("is-ok", state.mobileVerified);
    }
    renderGoogleConnection();
  }

  function switchSecuritySection(section = "hub") {
    const allowed = [
      "hub",
      "password",
      "two-factor",
      "login-activity",
      "account-links",
      "devices",
    ];
    const next = allowed.includes(section) ? section : "hub";
    document.querySelectorAll("[data-ba-security-section]").forEach((node) => {
      const active = node.getAttribute("data-ba-security-section") === next;
      node.hidden = !active;
    });
    if (next === "devices") {
      void loadAccountDevices();
    }
  }

  function getAccountDeviceKey() {
    const storageKey = "gms_account_device_key";
    try {
      const existing = String(window.localStorage.getItem(storageKey) || "").trim();
      if (existing) return existing;
      const generated = `web_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      window.localStorage.setItem(storageKey, generated);
      return generated;
    } catch (_) {
      return `web_${Date.now().toString(36)}`;
    }
  }

  function deviceIconSvg(device) {
    const type = String(device?.deviceType || "").toLowerCase();
    const client = String(device?.clientName || "").toLowerCase();
    if (type === "phone") {
      return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="5" y="2" width="14" height="20" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M12 18h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
    }
    if (type === "tablet") {
      return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="4" y="2" width="16" height="20" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M12 18h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
    }
    if (client.includes("chrome")) {
      return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.8"/><path d="M21.17 8H12M3.95 6.06 8.54 14M10.88 21.94 15.46 14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
    }
    return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M8 21h8M12 17v4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
  }

  function formatDeviceActiveLabel(device) {
    if (device?.isCurrent) return "Active now";
    const raw = String(device?.lastActiveAt || device?.createdAt || "").trim();
    if (!raw) return "Recently active";
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return "Recently active";
    const diffMs = Date.now() - parsed.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "Active just now";
    if (mins < 60) return `Active ${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Active ${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `Active ${days}d ago`;
    return `Active ${parsed.toLocaleDateString()}`;
  }

  function deviceSubtitle(device) {
    const parts = [];
    const clientName = String(device?.clientName || "").trim();
    const osName = String(device?.osName || "").trim();
    const deviceName = String(device?.deviceName || "").trim();
    if (clientName) parts.push(clientName);
    if (osName && osName.toLowerCase() !== deviceName.toLowerCase()) parts.push(osName);
    return parts.join(" · ");
  }

  function renderAccountDevices(devices = []) {
    const list = document.querySelector("[data-ba-devices-list]");
    const empty = document.querySelector("[data-ba-devices-empty]");
    const revokeOthers = document.querySelector("[data-ba-devices-revoke-others]");
    if (!list || !empty) return;

    list.innerHTML = "";
    if (!devices.length) {
      empty.hidden = false;
      empty.textContent = "No signed-in devices yet.";
      list.hidden = true;
      if (revokeOthers) revokeOthers.hidden = true;
      return;
    }

    empty.hidden = true;
    list.hidden = false;
    devices.forEach((device) => {
      const item = document.createElement("li");
      item.className = `ba-devices__item${device.isCurrent ? " is-current" : ""}`;
      item.innerHTML = `
        <span class="ba-devices__icon" aria-hidden="true">${deviceIconSvg(device)}</span>
        <span class="ba-devices__copy">
          <strong>${escapeHtml(device.deviceName || "Device")}</strong>
          <span>${escapeHtml(deviceSubtitle(device))}</span>
          <em>${escapeHtml(formatDeviceActiveLabel(device))}</em>
        </span>
        ${
          device.isCurrent
            ? `<span class="ba-devices__current">Current device</span>`
            : `<button type="button" class="ba-devices__action" data-ba-device-revoke="${escapeHtml(device.id || "")}" data-ba-device-key="${escapeHtml(device.deviceKey || "")}" data-ba-device-name="${escapeHtml(device.deviceName || "Device")}">Remove</button>`
        }
      `;
      list.appendChild(item);
    });

    if (revokeOthers) {
      revokeOthers.hidden = !devices.some((device) => !device.isCurrent);
    }
  }

  async function loadAccountDevices() {
    const empty = document.querySelector("[data-ba-devices-empty]");
    const feedback = document.querySelector("[data-ba-devices-feedback]");
    const list = document.querySelector("[data-ba-devices-list]");
    if (!state.accountId) {
      if (empty) {
        empty.hidden = false;
        empty.textContent = "Sign in again to manage devices.";
      }
      if (list) list.hidden = true;
      return;
    }
    if (empty) {
      empty.hidden = false;
      empty.textContent = "Loading signed-in devices…";
    }
    if (list) list.hidden = true;
    setFeedback(feedback, "", null);
    try {
      const deviceKey = getAccountDeviceKey();
      const payload = await fetchJson("/api/account/devices/register", {
        method: "POST",
        body: JSON.stringify({
          accountId: state.accountId,
          email: state.email,
          deviceKey,
          userAgent: navigator.userAgent || "",
          clientKind: "browser",
        }),
      });
      renderAccountDevices(Array.isArray(payload.devices) ? payload.devices : []);
    } catch (error) {
      if (error?.code === "device_revoked") {
        auth?.signOut?.();
        return;
      }
      if (empty) {
        empty.hidden = false;
        empty.textContent =
          error instanceof Error ? error.message : "Unable to load devices.";
      }
      if (list) {
        list.hidden = true;
        list.innerHTML = "";
      }
    }
  }

  async function revokeAccountDevice(button) {
    const deviceId = String(button.getAttribute("data-ba-device-revoke") || "").trim();
    const deviceKey = String(button.getAttribute("data-ba-device-key") || "").trim();
    const deviceName = String(button.getAttribute("data-ba-device-name") || "Device");
    const feedback = document.querySelector("[data-ba-devices-feedback]");
    if (!deviceId || !state.accountId) return;
    if (deviceKey && deviceKey === getAccountDeviceKey()) return;
    const confirmed = window.confirm(`${deviceName} will be signed out right away. The saved sign-in on that device will be removed.`);
    if (!confirmed) return;
    button.disabled = true;
    try {
      const payload = await fetchJson("/api/account/devices/revoke", {
        method: "POST",
        body: JSON.stringify({
          accountId: state.accountId,
          deviceId,
          deviceKey,
          keepDeviceKey: getAccountDeviceKey(),
        }),
      });
      renderAccountDevices(Array.isArray(payload.devices) ? payload.devices : []);
      setFeedback(feedback, payload.message || "Device signed out.", "success");
    } catch (error) {
      setFeedback(
        feedback,
        error instanceof Error ? error.message : "Unable to sign out device.",
        "error",
      );
    } finally {
      button.disabled = false;
    }
  }

  async function revokeOtherAccountDevices() {
    const feedback = document.querySelector("[data-ba-devices-feedback]");
    const button = document.querySelector("[data-ba-devices-revoke-others]");
    if (!state.accountId) return;
    if (!window.confirm("Sign out all other devices? You stay signed in here.")) {
      return;
    }
    if (button) button.disabled = true;
    try {
      const deviceKey = getAccountDeviceKey();
      const payload = await fetchJson("/api/account/devices/revoke", {
        method: "POST",
        body: JSON.stringify({
          accountId: state.accountId,
          revokeOthers: true,
          keepDeviceKey: deviceKey,
          currentDeviceKey: deviceKey,
        }),
      });
      renderAccountDevices(Array.isArray(payload.devices) ? payload.devices : []);
      setFeedback(feedback, payload.message || "Other devices signed out.", "success");
    } catch (error) {
      setFeedback(
        feedback,
        error instanceof Error ? error.message : "Unable to sign out other devices.",
        "error",
      );
    } finally {
      if (button) button.disabled = false;
    }
  }

  function switchTab(tab) {
    let next = String(tab || "").trim().toLowerCase();
    let securitySection = "hub";
    if (next === "account-links" || next === "password" || next === "two-factor" || next === "login-activity" || next === "devices") {
      securitySection = next;
      next = "security";
    }
    document.querySelectorAll("[data-ba-tab]").forEach((btn) => {
      const active = btn.getAttribute("data-ba-tab") === next;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
    });
    document.querySelectorAll("[data-ba-panel]").forEach((panel) => {
      const active = panel.getAttribute("data-ba-panel") === next;
      panel.classList.toggle("is-active", active);
      panel.hidden = !active;
    });
    if (next === "security") {
      switchSecuritySection(securitySection);
    } else {
      switchSecuritySection("hub");
    }
  }

  function planAmount(plan) {
    if (state.billingCycle === "yearly") {
      return Number(plan.yearlyAmount || Math.round(Number(plan.amount || 0) * 12 * 0.8)) || 0;
    }
    return Number(plan.amount || 0) || 0;
  }

  function isFreePlan(plan = state.selectedPlan) {
    if (!plan) return false;
    if (plan.free === true) return true;
    const id = String(plan.id || "").trim().toLowerCase();
    const name = String(plan.name || "").trim().toLowerCase();
    return (
      planAmount(plan) <= 0 ||
      id === "seller-free" ||
      id === "free" ||
      name === "free" ||
      name === "free plan"
    );
  }

  function isPlatformTestModeOn() {
    const settings =
      window.GMSPlatformSettings
      || (typeof window.GMSTheme?.getPlatformSettings === "function"
        ? window.GMSTheme.getPlatformSettings()
        : null);
    return Boolean(settings?.testMode);
  }

  async function ensurePlatformSettingsFresh() {
    if (typeof window.GMSTheme?.syncPlatformSettings === "function") {
      try {
        await window.GMSTheme.syncPlatformSettings({ force: true });
      } catch (_) {}
    }
  }

  function isFirstCompanyFlow() {
    return Number(state.existingCompanyCount || 0) === 0 || Boolean(state.canSubmitFreeFirst);
  }

  function isExtraSlotPaid() {
    return Boolean(state.paidExtraSlot?.paidAt || state.paidExtraSlot?.intentId);
  }

  function wizardStepOrder() {
    return isFirstCompanyFlow() ? FIRST_COMPANY_STEPS : EXTRA_COMPANY_STEPS;
  }

  function syncSellerCta() {
    if (!els.startSeller) return;
    if (Number(state.existingCompanyCount || 0) > 0 && !state.canSubmitFreeFirst) {
      els.startSeller.dataset.baLocked = "one-company";
      setActionBusy(els.startSeller, true, "Company already added");
      return;
    }
    delete els.startSeller.dataset.baLocked;
    setActionBusy(els.startSeller, false, "Start free company");
    els.startSeller.dataset.baIdleLabel = "Start free company";
    els.startSeller.textContent = "Start free company";
  }

  function progressStepKey(step) {
    if (step === "verify") return "pin";
    if (step === "done") return "company";
    return step;
  }

  function renderPlans() {
    state.selectedPlan = { ...FIRST_COMPANY_FREE_PLAN };
  }

  function renderProgress() {
    if (!els.progress) return;
    const steps = wizardStepOrder();
    const activeIndex = steps.indexOf(progressStepKey(state.step));
    els.progress.innerHTML = steps.map((step, index) => {
      const cls = index < activeIndex ? "is-done" : index === activeIndex ? "is-active" : "";
      return `<span class="${cls}" data-step="${step}"></span>`;
    }).join("");
  }

  function showStep(step) {
    let next = step;
    if (next === "verify" && isVerified()) {
      next = "company";
    }
    state.step = next;
    if (els.wizardTitle) els.wizardTitle.textContent = STEP_TITLES[next] || "Be Part of Switch";
    document.querySelectorAll("[data-ba-step]").forEach((node) => {
      const match = node.getAttribute("data-ba-step") === next;
      node.hidden = !match;
      node.classList.toggle("is-active", match);
    });
    renderProgress();
    if (next === "verify") {
      updateVerifyTarget();
    }
    if (next === "company") {
      renderBusinessTypes();
      syncCompanyLogoPreview();
      const mobileInput = document.querySelector("[data-ba-company-mobile]");
      if (mobileInput && !String(mobileInput.value || "").trim()) {
        mobileInput.value = String(state.mobileNumber || "").trim();
      }
    }
    if (els.finishSeller) {
      els.finishSeller.textContent = isFirstCompanyFlow()
        ? "Submit free company"
        : "Submit for review";
      els.finishSeller.dataset.baIdleLabel = els.finishSeller.textContent;
    }
  }

  function openWizard(startStep = "") {
    if (!els.wizard || !els.wizard.hidden) return;
    els.wizard.hidden = false;
    document.body.classList.add("modal-open");
    setFeedback(els.wizardFeedback, "", null);
    let firstStep = startStep || wizardStepOrder()[0] || "pin";
    if (["plan", "card", "paymongo"].includes(firstStep)) {
      firstStep = "pin";
    }
    showStep(firstStep);
  }

  function closeWizard() {
    if (!els.wizard || els.wizard.hidden) return;
    // Do not allow closing mid-submit (finishSellerUpgrade in flight).
    if (state.busy && els.finishSeller?.getAttribute("aria-busy") === "true") {
      return;
    }
    els.wizard.hidden = true;
    document.body.classList.remove("modal-open");
    state.busy = false;
    setActionBusy(els.finishSeller, false);
    if (els.startSeller?.dataset.baLocked) {
      const lockedLabel =
        els.startSeller.dataset.baLocked === "seller-active"
          ? "Already upgraded"
          : "Upgrade in progress…";
      setActionBusy(els.startSeller, true, lockedLabel);
    } else {
      setActionBusy(els.startSeller, false);
    }
  }

  function deleteConfirmationMatches() {
    return Boolean(state.email)
      && String(els.deleteConfirmation?.value || "").trim().toLowerCase() === state.email.toLowerCase();
  }

  function syncDeleteSubmit() {
    if (!els.deleteSubmit) return;
    els.deleteSubmit.disabled = state.deleteBusy || !deleteConfirmationMatches();
  }

  function openDeleteModal() {
    if (!els.deleteModal) return;
    els.deleteModal.hidden = false;
    document.body.classList.add("modal-open");
    if (els.deleteEmail) els.deleteEmail.textContent = state.email || "your account email";
    if (els.deleteConfirmation) els.deleteConfirmation.value = "";
    setFeedback(els.deleteFeedback, "", null);
    syncDeleteSubmit();
    window.setTimeout(() => els.deleteConfirmation?.focus(), 0);
  }

  function closeDeleteModal() {
    if (!els.deleteModal || state.deleteBusy) return;
    els.deleteModal.hidden = true;
    document.body.classList.remove("modal-open");
  }

  function clearDeletedAccountBrowserData() {
    auth.clearBuyerSession?.();
    [
      "gms-buyer-cart",
      "gms-admin-session",
      "gms-employee-session",
      "gms-super-admin-session",
    ].forEach((key) => {
      try {
        window.localStorage.removeItem(key);
        window.sessionStorage.removeItem(key);
      } catch (_) {}
    });
  }

  async function deleteBuyerAccount() {
    if (state.deleteBusy) return;
    if (!state.accountId || !state.email) {
      setFeedback(els.deleteFeedback, "Unable to identify this account. Refresh and try again.", "error");
      return;
    }
    if (!deleteConfirmationMatches()) {
      setFeedback(els.deleteFeedback, "Enter your account email exactly to continue.", "error");
      syncDeleteSubmit();
      return;
    }

    state.deleteBusy = true;
    if (els.deleteSubmit) els.deleteSubmit.textContent = "Deleting account...";
    syncDeleteSubmit();
    setFeedback(els.deleteFeedback, "Permanently deleting your account...", null);

    try {
      const payload = await fetchJson("/api/account/delete", {
        method: "DELETE",
        body: JSON.stringify({
          accountId: state.accountId,
          email: state.email,
          confirmationEmail: String(els.deleteConfirmation?.value || "").trim(),
        }),
      });
      setFeedback(els.deleteFeedback, payload.message || "Your account has been deleted.", "success");
      clearDeletedAccountBrowserData();
      window.setTimeout(() => {
        window.location.replace("/login.html?accountDeleted=1");
      }, 650);
    } catch (error) {
      state.deleteBusy = false;
      if (els.deleteSubmit) els.deleteSubmit.textContent = "Permanently Delete Account";
      syncDeleteSubmit();
      setFeedback(els.deleteFeedback, error.message || "Unable to delete account.", "error");
    }
  }

  function updateVerifyTarget() {
    if (!els.verifyTarget) return;
    if (state.verifyChannel === "mobile") {
      els.verifyTarget.textContent = `Code will be sent to ${phoneDisplay()}`;
    } else {
      els.verifyTarget.textContent = `Code will be sent to ${state.email || "your email"}`;
    }
  }

  function formatCardNumber(value) {
    return String(value || "")
      .replace(/\D/g, "")
      .slice(0, 16)
      .replace(/(\d{4})(?=\d)/g, "$1 ")
      .trim();
  }

  function formatExpiry(value) {
    const digits = String(value || "").replace(/\D/g, "").slice(0, 4);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)} / ${digits.slice(2)}`;
  }

  function readCardForm() {
    const holderName = String(document.querySelector("[data-ba-card-name]")?.value || "").trim();
    const number = String(document.querySelector("[data-ba-card-number]")?.value || "").replace(/\D/g, "");
    const expiryRaw = String(document.querySelector("[data-ba-card-expiry]")?.value || "").replace(/\s+/g, "");
    const cvc = String(document.querySelector("[data-ba-card-cvc]")?.value || "").trim();
    const [expMonth = "", expYear = ""] = expiryRaw.split("/");
    if (holderName.length < 2) throw new Error("Enter the cardholder name.");
    if (number.length < 13) throw new Error("Enter a valid card number.");
    if (!/^\d{2}$/.test(expMonth) || !/^\d{2}$/.test(expYear)) {
      throw new Error("Enter expiry as MM / YY.");
    }
    if (cvc.length < 3) throw new Error("Enter the CVV.");
    const brand = number.startsWith("4")
      ? "visa"
      : /^(5[1-5]|2[2-7])/.test(number)
        ? "mastercard"
        : "card";
    return {
      brand,
      last4: number.slice(-4),
      expMonth,
      expYear,
      holderName,
      prototype: true,
    };
  }

  function readCompanyAccessForm() {
    const mobile = String(document.querySelector("[data-ba-company-mobile]")?.value || "").replace(/\D/g, "");
    const password = String(document.querySelector("[data-ba-company-password]")?.value || "");
    const confirm = String(document.querySelector("[data-ba-company-password-confirm]")?.value || "");
    if (mobile && mobile.length < 10) {
      throw new Error("Enter a valid mobile number.");
    }
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      throw new Error("Company password must be at least 8 characters and include a letter and a number.");
    }
    if (password !== confirm) {
      throw new Error("Company password confirmation does not match.");
    }
    return { mobileNumber: mobile || state.mobileNumber, companyPassword: password };
  }

  function readStoreLocationForm() {
    const address = String(document.querySelector("[data-ba-store-address]")?.value || "").replace(/\s+/g, " ").trim();
    if (address.length < 8) {
      throw new Error("Enter your store address (street, barangay, city, province) so nearby Switch Riders can pick up your orders.");
    }
    const lat = Number(document.querySelector("[data-ba-store-lat]")?.value);
    const lng = Number(document.querySelector("[data-ba-store-lng]")?.value);
    const hasPin = Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0)
      && String(document.querySelector("[data-ba-store-lat]")?.value || "").trim() !== "";
    return {
      storeAddress: address,
      ...(hasPin ? { storeLatitude: lat, storeLongitude: lng } : {}),
    };
  }

  function bindStoreLocationControls() {
    const button = document.querySelector("[data-ba-store-locate]");
    const status = document.querySelector("[data-ba-store-location-status]");
    const latInput = document.querySelector("[data-ba-store-lat]");
    const lngInput = document.querySelector("[data-ba-store-lng]");
    const addressInput = document.querySelector("[data-ba-store-address]");
    if (!button || !latInput || !lngInput) return;
    addressInput?.addEventListener("input", () => {
      if (button.dataset.pinned === "true") return;
      latInput.value = "";
      lngInput.value = "";
    });
    button.addEventListener("click", () => {
      if (!navigator.geolocation) {
        if (status) status.textContent = "This browser can't share your location. We'll pin the store from the address instead.";
        return;
      }
      button.disabled = true;
      if (status) status.textContent = "Getting your location...";
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          latInput.value = String(lat);
          lngInput.value = String(lng);
          button.dataset.pinned = "true";
          button.disabled = false;
          if (status) status.textContent = `Store pinned at your current location (±${Math.round(position.coords.accuracy || 0)} m).`;
          if (addressInput && addressInput.value.trim().length < 8) {
            try {
              const payload = await fetchJson(`/api/maps/geocode/reverse?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`);
              const line = String(payload?.place?.description || payload?.place?.label || "").trim();
              if (line) addressInput.value = line;
            } catch (_) {
              // Seller can still type the address manually.
            }
          }
        },
        () => {
          button.disabled = false;
          if (status) status.textContent = "Location permission was denied. We'll pin the store from the address instead.";
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
      );
    });
  }

  function readPinForm() {
    const pin = String(document.querySelector("[data-ba-pin]")?.value || "").replace(/\D/g, "");
    const confirm = String(document.querySelector("[data-ba-pin-confirm]")?.value || "").replace(/\D/g, "");
    if (!/^\d{6}$/.test(pin)) {
      throw new Error("Create a 6-digit Switch PIN.");
    }
    if (pin !== confirm) {
      throw new Error("Switch PIN confirmation does not match.");
    }
    return pin;
  }

  function normalizeStoreTypeName(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function getBusinessTypeSearchText(storeType) {
    return [
      storeType?.name,
      ...(Array.isArray(storeType?.categories) ? storeType.categories : []),
    ]
      .join(" ")
      .toLowerCase();
  }

  function getBusinessTypeCategorySummary(categories) {
    if (!categories.length) return "No categories configured yet";
    if (categories.length <= 2) return categories.join(", ");
    return `${categories.slice(0, 2).join(", ")} +${categories.length - 2} more`;
  }

  function renderBusinessTypes() {
    if (!(els.businessTypes instanceof HTMLElement)) return;
    els.businessTypes.innerHTML = "";
    const source = Array.isArray(state.storeTypes) ? state.storeTypes : [];
    const searchTerm = String(state.businessTypeSearchTerm || "").trim().toLowerCase();
    const visible = searchTerm
      ? source.filter((item) => getBusinessTypeSearchText(item).includes(searchTerm))
      : source;

    if (!source.length) {
      const empty = document.createElement("p");
      empty.className = "admin-signup-business-types__empty";
      empty.textContent = "No active Business Types are available.";
      els.businessTypes.append(empty);
      return;
    }
    if (!visible.length) {
      const empty = document.createElement("p");
      empty.className = "admin-signup-business-types__empty";
      empty.textContent = "No Business Types match your search.";
      els.businessTypes.append(empty);
      return;
    }

    visible.forEach((storeType) => {
      const label = document.createElement("label");
      label.className = "admin-signup-business-type";
      const input = document.createElement("input");
      input.type = "radio";
      input.name = "baBusinessType";
      input.value = storeType.name;
      input.checked = normalizeStoreTypeName(state.selectedStoreType) === storeType.name;
      input.addEventListener("change", () => {
        state.selectedStoreType = storeType.name;
        if (els.businessType) els.businessType.value = storeType.name;
        setFeedback(els.wizardFeedback, "", null);
      });
      const media = document.createElement("span");
      media.className = "admin-signup-business-type__media";
      media.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;
      const copy = document.createElement("span");
      copy.className = "admin-signup-business-type__copy";
      const name = document.createElement("span");
      name.className = "admin-signup-business-type__name";
      name.textContent = storeType.name;
      const categories = document.createElement("span");
      categories.className = "admin-signup-business-type__categories";
      categories.textContent = getBusinessTypeCategorySummary(
        Array.isArray(storeType.categories) ? storeType.categories : [],
      );
      copy.append(name, categories);
      const check = document.createElement("span");
      check.className = "admin-signup-business-type__check";
      check.setAttribute("aria-hidden", "true");
      check.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>`;
      label.append(input, media, copy, check);
      els.businessTypes.append(label);
    });
  }

  function syncCompanyLogoPreview() {
    const hasSelected = Boolean(state.companyLogoPreviewUrl);
    if (els.companyLogoPreview instanceof HTMLImageElement) {
      if (hasSelected) {
        els.companyLogoPreview.src = state.companyLogoPreviewUrl;
        els.companyLogoPreview.hidden = false;
      } else {
        els.companyLogoPreview.removeAttribute("src");
        els.companyLogoPreview.hidden = true;
      }
    }
    if (els.companyLogoDefault) els.companyLogoDefault.hidden = hasSelected;
    if (els.companyLogoName) {
      els.companyLogoName.textContent = hasSelected
        ? String(state.companyLogoFile?.name || "Selected photo")
        : "Company photo";
    }
    if (els.companyLogoStatus) {
      els.companyLogoStatus.textContent = hasSelected
        ? "Photo ready to upload."
        : state.companyLogoSkipped
          ? "Photo skipped for now."
          : "Upload a square logo or storefront photo.";
    }
    if (els.companyLogoRemove) els.companyLogoRemove.hidden = !hasSelected;
  }

  function clearCompanyLogo(options = {}) {
    if (state.companyLogoPreviewUrl) {
      try { URL.revokeObjectURL(state.companyLogoPreviewUrl); } catch (_) {}
    }
    state.companyLogoFile = null;
    state.companyLogoPreviewUrl = "";
    state.companyLogoUploadedUrl = "";
    state.companyLogoSkipped = options.skipped === true;
    if (els.companyLogoInput) els.companyLogoInput.value = "";
    syncCompanyLogoPreview();
  }

  async function uploadCompanyLogoIfNeeded() {
    if (state.companyLogoUploadedUrl) return state.companyLogoUploadedUrl;
    const file = state.companyLogoFile instanceof File ? state.companyLogoFile : null;
    if (!file) return "";
    setFeedback(els.wizardFeedback, "Uploading company photo...", null);
    const response = await fetch("/api/uploads", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": file.type || "application/octet-stream",
        "X-File-Name": String(file.name || "company-photo").replace(/[^\x20-\x7e]/g, "_"),
      },
      body: file,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || "Unable to upload the company photo.");
    }
    const uploadedUrl = String(data.imageUrl || data.mediaUrl || "").trim();
    if (!uploadedUrl) throw new Error("Company photo upload did not return a URL.");
    state.companyLogoUploadedUrl = uploadedUrl;
    return uploadedUrl;
  }

  function getKycSlotsForKind(kind) {
    if (kind === "individual") {
      return [
        {
          key: "valid_id",
          type: "valid_id",
          label: "Government-Issued ID",
          hint: "National ID (PhilSys), Passport, Driver's License, SSS ID, or TIN ID.",
        },
      ];
    }
    if (kind === "business") {
      return [
        {
          key: "registration",
          types: ["dti", "sec"],
          label: "DTI or SEC Certificate",
          hint: "DTI for sole proprietorship, or SEC Certificate & Articles for corporation / OPC.",
        },
        {
          key: "bir",
          type: "bir",
          label: "BIR Certificate of Registration",
          hint: "COR / Form 2303.",
        },
        {
          key: "valid_id",
          type: "valid_id",
          label: "Valid ID of owner or representative",
          hint: "Government-issued ID of the owner or authorized representative.",
        },
      ];
    }
    return [];
  }

  function readPayoutBank() {
    state.payoutBank = {
      bankName: String(els.bankName?.value || "").replace(/\s+/g, " ").trim(),
      accountName: String(els.bankAccountName?.value || "").replace(/\s+/g, " ").trim(),
      accountNumber: String(els.bankAccountNumber?.value || "").replace(/\D/g, ""),
    };
    return state.payoutBank;
  }

  function getKycSlotRecord(slot) {
    return state.kycDocuments[slot.key] || null;
  }

  function getMissingKycSlots() {
    return getKycSlotsForKind(state.sellerKind)
      .filter((slot) => !(getKycSlotRecord(slot)?.file instanceof File) && !getKycSlotRecord(slot)?.url)
      .map((slot) => slot.label);
  }

  async function uploadDocumentFile(file) {
    const response = await fetch("/api/document-uploads", {
      method: "POST",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        "X-File-Name": file.name || "seller-document",
      },
      body: file,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || "Unable to upload document.");
    }
    const uploadedUrl = String(data.documentUrl || data.imageUrl || "").trim();
    if (!uploadedUrl) {
      throw new Error("Document upload did not return a file URL.");
    }
    return uploadedUrl;
  }

  async function uploadRequiredKycDocuments(companyId) {
    const slots = getKycSlotsForKind(state.sellerKind);
    for (const slot of slots) {
      const record = getKycSlotRecord(slot);
      let url = String(record?.url || "").trim();
      if (!url && record?.file instanceof File) {
        setFeedback(els.wizardFeedback, `Uploading ${slot.label}...`, null);
        url = await uploadDocumentFile(record.file);
        state.kycDocuments[slot.key] = { ...record, url };
      }
      if (!url) {
        throw new Error(`Upload ${slot.label} before continuing.`);
      }
      const type = record?.type || slot.type || (slot.types && slot.types[0]) || "other";
      await fetchJson("/api/account/become-seller/documents", {
        method: "POST",
        body: JSON.stringify({
          accountId: state.accountId,
          companyId,
          type,
          fileName: record?.file?.name || "",
          label: slot.label,
          url,
        }),
      });
    }
  }

  function setSellerKind(kind) {
    state.sellerKind = kind === "business" ? "business" : kind === "individual" ? "individual" : "";
    document.querySelectorAll("[data-ba-seller-kind-option]").forEach((button) => {
      button.classList.toggle("is-active", button.getAttribute("data-ba-seller-kind-option") === state.sellerKind);
    });
    if (els.sellerKindCopy) {
      els.sellerKindCopy.textContent = state.sellerKind === "individual"
        ? "Individual Seller: government ID plus a bank account in your name. No DTI or SEC."
        : state.sellerKind === "business"
          ? "Business / Corporate Seller: DTI or SEC, BIR COR, owner ID, and a business bank account."
          : "Select a seller type to see the documents Super Admin will review.";
    }
    if (els.payoutBank) {
      els.payoutBank.hidden = !state.sellerKind;
    }
    if (els.companyDocuments) {
      els.companyDocuments.hidden = !state.sellerKind;
    }
    if (els.bankAccountNameLabel) {
      els.bankAccountNameLabel.textContent = state.sellerKind === "business"
        ? "Account name (must match registered business)"
        : "Account name (must be in your name)";
    }
    renderKycSlots();
  }

  function renderKycSlots() {
    if (!els.kycSlots) {
      return;
    }
    els.kycSlots.innerHTML = "";
    const slots = getKycSlotsForKind(state.sellerKind);
    for (const slot of slots) {
      const record = getKycSlotRecord(slot);
      const row = document.createElement("div");
      row.className = "ba-kyc-slot";
      const title = document.createElement("strong");
      title.textContent = slot.label;
      const hint = document.createElement("p");
      hint.className = "ba-muted";
      hint.textContent = record?.file?.name
        ? `Selected: ${record.file.name}`
        : slot.hint;
      const actions = document.createElement("div");
      actions.className = "admin-signup-logo-card__actions";
      if (Array.isArray(slot.types)) {
        const select = document.createElement("select");
        select.className = "ba-kyc-slot__type";
        select.innerHTML = `
          <option value="dti">DTI Certificate</option>
          <option value="sec">SEC Certificate</option>
        `;
        select.value = record?.type || "dti";
        select.addEventListener("change", () => {
          state.kycDocuments[slot.key] = {
            ...(state.kycDocuments[slot.key] || {}),
            type: select.value,
          };
        });
        actions.append(select);
      }
      const uploadBtn = document.createElement("button");
      uploadBtn.type = "button";
      uploadBtn.className = "admin-signup-logo-action";
      uploadBtn.textContent = record?.file ? "Replace file" : "Upload";
      uploadBtn.addEventListener("click", () => {
        state.activeKycSlot = slot.key;
        if (!state.kycDocuments[slot.key]) {
          state.kycDocuments[slot.key] = { type: slot.type || slot.types?.[0] || "other" };
        }
        els.documentInput?.click();
      });
      actions.append(uploadBtn);
      if (record?.file) {
        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "admin-signup-logo-action admin-signup-logo-action--remove";
        removeBtn.textContent = "Remove";
        removeBtn.addEventListener("click", () => {
          delete state.kycDocuments[slot.key];
          renderKycSlots();
        });
        actions.append(removeBtn);
      }
      row.append(title, hint, actions);
      els.kycSlots.append(row);
    }
  }

  function applyPlanEntitlement(payload = {}) {
    const catalog = payload?.catalog || {};
    state.plans = Array.isArray(catalog.plans) ? catalog.plans : [];
    state.firstCompanyFree = payload.firstCompanyFree !== false && catalog.firstCompanyFree !== false;
    state.requiresPaidPlan = Boolean(payload.requiresPaidPlan || catalog.requiresPaidPlan);
    state.existingCompanyCount = Number(payload.existingCompanyCount ?? catalog.existingCompanyCount) || 0;
    state.canSubmitFreeFirst = Boolean(
      payload.canSubmitFreeFirst ?? catalog.canSubmitFreeFirst ?? !state.requiresPaidPlan,
    );
    state.paidExtraSlot = null;
    state.selectedPlan = { ...FIRST_COMPANY_FREE_PLAN };
  }

  async function loadPlans() {
    try {
      const payload = await fetchJson("/api/account/seller-plans");
      applyPlanEntitlement(payload);
    } catch (_) {
      state.plans = [];
    }
    renderPlans();
    syncSellerCta();
  }

  async function loadStoreTypes() {
    try {
      const payload = await fetchJson("/api/store-types");
      const types = Array.isArray(payload?.storeTypes)
        ? payload.storeTypes
        : Array.isArray(payload?.storeTypeDetails)
          ? payload.storeTypeDetails
          : Array.isArray(payload?.types)
            ? payload.types
            : Array.isArray(payload)
              ? payload
              : [];
      state.storeTypes = types
        .map((item) => {
          const name = normalizeStoreTypeName(
            typeof item === "string" ? item : item?.name || item?.label || "",
          );
          if (!name) return null;
          return {
            name,
            categories: Array.isArray(item?.categories)
              ? item.categories.map((entry) => String(entry || "").trim()).filter(Boolean)
              : [],
          };
        })
        .filter(Boolean);
      if (!state.storeTypes.length) {
        state.storeTypes = [
          { name: "Retail", categories: [] },
          { name: "Wholesale", categories: [] },
          { name: "Food & Beverage", categories: [] },
          { name: "Services", categories: [] },
        ];
      }
    } catch (_) {
      state.storeTypes = [
        { name: "Retail", categories: [] },
        { name: "Wholesale", categories: [] },
        { name: "Food & Beverage", categories: [] },
        { name: "Services", categories: [] },
      ];
    }
    renderBusinessTypes();
  }

  async function refreshUnifiedSession() {
    if (!state.accountId && !state.email) return;
    try {
      const query = state.accountId
        ? `accountId=${encodeURIComponent(state.accountId)}`
        : `email=${encodeURIComponent(state.email)}`;
      const payload = await fetchJson(`/api/auth/session?${query}`);
      const account = payload?.session?.account || {};
      state.accountId = String(account.id || state.accountId).trim();
      state.email = String(account.email || state.email).trim();
      state.countryCode = String(account.countryCode || state.countryCode || "+63").trim() || "+63";
      state.mobileNumber = String(account.mobileNumber || state.mobileNumber).trim();
      state.emailVerified = Boolean(account.emailVerified);
      state.mobileVerified = Boolean(account.mobileVerified);
      setGoogleConnection(account);
      persistBuyerSessionPatch({
        ...account,
        accountId: state.accountId,
        email: state.email,
        countryCode: state.countryCode,
        mobileNumber: state.mobileNumber,
        emailVerified: state.emailVerified,
        mobileVerified: state.mobileVerified,
        gmailBinding: account.gmailBinding ?? account.googleBinding ?? null,
      });
      fillProfile();

      const modes = Array.isArray(payload?.session?.availableModes)
        ? payload.session.availableModes
        : [];
      if (modes.includes("seller_admin") || state.existingCompanyCount > 0) {
        setFeedback(
          els.sellerStatus,
          isFirstCompanyFlow()
            ? "Finish your free company, then Super Admin will review it."
            : "This account already has its one free company. The legitimate badge is earned from shop performance.",
          "success",
        );
      }
      syncSellerCta();
    } catch (_) {}
  }

  async function sendVerificationCode() {
    const channel = state.verifyChannel;
    const body =
      channel === "mobile"
        ? {
            purpose: "registration",
            channel: "mobile",
            mobileNumber: `${state.countryCode}${state.mobileNumber}`,
          }
        : {
            purpose: "registration",
            channel: "email",
            email: state.email,
          };

    if (channel === "mobile" && !state.mobileNumber) {
      throw new Error("Add a phone number to your account before verifying by SMS.");
    }
    if (channel === "email" && !state.email) {
      throw new Error("Email is required for verification.");
    }

    const payload = await fetchJson("/api/auth/verification/send", {
      method: "POST",
      body: JSON.stringify(body),
    });
    setFeedback(
      els.wizardFeedback,
      payload.message || "Verification code sent.",
      "success",
    );
  }

  async function verifyCode({ prototype = false } = {}) {
    const channel = state.verifyChannel;
    if (prototype) {
      await fetchJson("/api/account/become-seller/mark-verified", {
        method: "POST",
        body: JSON.stringify({
          accountId: state.accountId,
          email: state.email,
          channel,
          prototype: true,
        }),
      });
      if (channel === "mobile") state.mobileVerified = true;
      else state.emailVerified = true;
      persistBuyerSessionPatch({
        emailVerified: state.emailVerified,
        mobileVerified: state.mobileVerified,
      });
      fillProfile();
      showStep("company");
      setFeedback(els.wizardFeedback, "Prototype verification applied.", "success");
      return;
    }

    const code = String(document.querySelector("[data-ba-verify-code]")?.value || "").trim();
    if (!/^\d{6}$/.test(code)) {
      throw new Error("Enter the 6-digit verification code.");
    }

    const verifyBody =
      channel === "mobile"
        ? {
            purpose: "registration",
            channel: "mobile",
            mobileNumber: `${state.countryCode}${state.mobileNumber}`,
            code,
          }
        : {
            purpose: "registration",
            channel: "email",
            email: state.email,
            code,
          };

    const verified = await fetchJson("/api/auth/verification/verify", {
      method: "POST",
      body: JSON.stringify(verifyBody),
    });
    state.verificationToken = String(verified.verificationToken || "").trim();

    await fetchJson("/api/account/become-seller/mark-verified", {
      method: "POST",
      body: JSON.stringify({
        accountId: state.accountId,
        email: state.email,
        channel,
        purpose: "registration",
        verificationToken: state.verificationToken,
      }),
    });

    if (channel === "mobile") state.mobileVerified = true;
    else state.emailVerified = true;
    persistBuyerSessionPatch({
      emailVerified: state.emailVerified,
      mobileVerified: state.mobileVerified,
    });
    fillProfile();
    showStep("company");
    setFeedback(els.wizardFeedback, "Verification successful.", "success");
  }

  function persistAdminSession(admin, redirectPath) {
    const adminSession = {
      ...admin,
      role: "admin",
      adminId: String(admin.adminId || admin.id || "").trim(),
      email: String(admin.email || state.email || "").trim().toLowerCase(),
      dashboardPath: redirectPath || "/main.html#dashboard",
      signedInAt: new Date().toISOString(),
    };
    window.sessionStorage.setItem("gms-admin-session", JSON.stringify(adminSession));
    window.sessionStorage.removeItem("gms-employee-session");
    window.sessionStorage.removeItem("gms-super-admin-session");
    try {
      window.localStorage.setItem("gms-admin-id", adminSession.adminId);
    } catch (_) {}
    return adminSession;
  }

  function persistSwitchPinUnlock(token, companyId) {
    const unlockToken = String(token || "").trim();
    if (!unlockToken) return;
    try {
      window.sessionStorage.setItem("gms-switch-pin-unlock", JSON.stringify({
        token: unlockToken,
        companyId: String(companyId || state.companyId || "").trim(),
        accountId: String(state.accountId || "").trim(),
      }));
    } catch (_) {}
  }

  async function finishSellerUpgrade() {
    const companyName = String(document.querySelector("[data-ba-company-name]")?.value || "").trim();
    const businessType = normalizeStoreTypeName(
      state.selectedStoreType || document.querySelector("[data-ba-business-type]")?.value || "",
    );
    state.selectedPlan = { ...FIRST_COMPANY_FREE_PLAN };
    const firstCompany = isFirstCompanyFlow();
    const plan = state.selectedPlan;

    if (!state.sellerKind) {
      throw new Error("Choose Individual Seller or Business / Corporate Seller.");
    }
    if (companyName.length < 2) {
      throw new Error("Company name must be at least 2 characters.");
    }
    const companyAccess = readCompanyAccessForm();
    state.mobileNumber = companyAccess.mobileNumber || state.mobileNumber;
    state.companyPassword = companyAccess.companyPassword;
    const storeLocation = readStoreLocationForm();
    if (!businessType) {
      throw new Error("Choose a business type.");
    }
    const payoutBank = readPayoutBank();
    if (!payoutBank.bankName || !payoutBank.accountName || payoutBank.accountNumber.length < 6) {
      throw new Error(
        state.sellerKind === "business"
          ? "Enter the business bank account that matches the registered company name."
          : "Enter a bank account in your name for payouts.",
      );
    }
    const missingDocs = getMissingKycSlots();
    if (missingDocs.length) {
      throw new Error(`Upload required documents: ${missingDocs.join(", ")}.`);
    }
    if (!plan) {
      state.selectedPlan = { ...FIRST_COMPANY_FREE_PLAN };
    }
    if (!firstCompany) {
      throw new Error("This account already has a company. Switch allows one company per account.");
    }
    await ensurePlatformSettingsFresh();
    if (!/^\d{6}$/.test(state.sellerPin)) {
      showStep("pin");
      throw new Error("Create a Switch PIN before opening seller admin.");
    }
    if (!isVerified()) {
      showStep("verify");
      throw new Error("Verify your email or phone before activating seller access.");
    }

    const logoUrl = await uploadCompanyLogoIfNeeded();

    setFeedback(
      els.wizardFeedback,
      firstCompany
        ? "Creating your free company..."
        : "Creating seller company...",
      null,
    );

    const startPayload = await fetchJson("/api/account/become-seller/start", {
      method: "POST",
      body: JSON.stringify({
        accountId: state.accountId,
        email: state.email,
        companyName,
        businessType,
        logoUrl,
        planName: "Free",
        billingCycle: "monthly",
        amount: 0,
        currencyCode: "PHP",
        paymentGateway: "free",
        paymentCard: null,
        sellerPin: state.sellerPin,
        password: state.companyPassword,
        companyPassword: state.companyPassword,
        sellerKind: state.sellerKind,
        payoutBank,
        countryCode: state.countryCode,
        mobileNumber: state.mobileNumber,
        businessLogoSkipped: state.companyLogoSkipped && !logoUrl,
        ...storeLocation,
      }),
    });

    const companies = Array.isArray(startPayload?.session?.companies)
      ? startPayload.session.companies
      : [];
    let companyId = String(startPayload?.onboarding?.company?.id || "").trim();
    if (!companyId) {
      for (const item of companies) {
        if (String(item?.company?.type || "").toLowerCase() === "seller") {
          companyId = String(item.companyId || item.company?.id || "").trim();
          if (companyId) break;
        }
      }
    }
    if (!companyId) {
      throw new Error("Seller company was not created.");
    }
    state.companyId = companyId;

    await uploadRequiredKycDocuments(companyId);
    await fetchJson("/api/account/become-seller/confirm-payment", {
      method: "POST",
      body: JSON.stringify({
        accountId: state.accountId,
        companyId,
        planName: "Free",
        billingCycle: "monthly",
        paymentGateway: "free",
        paymentReference: "",
        amount: 0,
        currencyCode: "PHP",
      }),
    });
    if (els.doneCopy) {
      els.doneCopy.textContent = `${companyName} was submitted for Super Admin review. Your company is free — no payment is required. Please wait up to 24 hours.`;
    }
    showStep("done");
    setFeedback(
      els.wizardFeedback,
      firstCompany
        ? "Your first company is in review. Thank you — Super Admin will respond within 24 hours."
        : "This account already has a company. Switch allows one company per account.",
      "success",
    );
    await loadPlans();
  }

  function previousStep() {
    const steps = wizardStepOrder();
    const current = steps.indexOf(progressStepKey(state.step));
    if (state.step === "verify") {
      showStep("pin");
      return;
    }
    if (current > 0) {
      showStep(steps[current - 1]);
    }
  }

  document.querySelectorAll("[data-ba-tab]").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.getAttribute("data-ba-tab")));
  });

  document.querySelectorAll("[data-ba-security-open]").forEach((btn) => {
    btn.addEventListener("click", () => {
      switchSecuritySection(btn.getAttribute("data-ba-security-open") || "hub");
    });
  });

  document.querySelectorAll("[data-ba-security-back]").forEach((btn) => {
    btn.addEventListener("click", () => switchSecuritySection("hub"));
  });

  document.querySelector("[data-ba-devices]")?.addEventListener("click", (event) => {
    const revokeBtn = event.target.closest("[data-ba-device-revoke]");
    if (revokeBtn) {
      void revokeAccountDevice(revokeBtn);
      return;
    }
    const revokeOthersBtn = event.target.closest("[data-ba-devices-revoke-others]");
    if (revokeOthersBtn) {
      void revokeOtherAccountDevices();
    }
  });

  document.querySelector("[data-ba-change-password-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const feedback = document.querySelector("[data-ba-change-password-feedback]");
    const submitBtn = document.querySelector("[data-ba-change-password-submit]");
    const currentPassword = String(form.currentPassword?.value || "");
    const newPassword = String(form.newPassword?.value || "");
    const confirmPassword = String(form.confirmPassword?.value || "");

    if (!currentPassword) {
      setFeedback(feedback, "Enter your current password.", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      setFeedback(feedback, "Passwords do not match.", "error");
      return;
    }
    if (!state.accountId && !state.email) {
      setFeedback(feedback, "Sign in again, then try changing your password.", "error");
      return;
    }

    if (submitBtn) submitBtn.disabled = true;
    setFeedback(feedback, "Updating password...", null);
    try {
      const data = await fetchJson("/api/account/change-password", {
        method: "POST",
        body: JSON.stringify({
          accountId: state.accountId,
          email: state.email,
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });
      form.reset();
      setFeedback(feedback, data.message || "Password updated successfully.", "success");
    } catch (error) {
      setFeedback(
        feedback,
        error instanceof Error ? error.message : "Unable to change password.",
        "error",
      );
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  document.querySelector("[data-buyer-account-signout]")?.addEventListener("click", () => {
    auth.signOut?.();
  });

  document.querySelector("[data-ba-start-seller]")?.addEventListener("click", () => {
    if (els.startSeller?.disabled || (els.wizard && !els.wizard.hidden)) return;
    setActionBusy(els.startSeller, true, "Upgrade in progress…");
    openWizard();
  });

  document.querySelector("[data-ba-delete-open]")?.addEventListener("click", openDeleteModal);

  document.querySelectorAll("[data-ba-delete-close]").forEach((node) => {
    node.addEventListener("click", closeDeleteModal);
  });

  els.deleteConfirmation?.addEventListener("input", () => {
    setFeedback(els.deleteFeedback, "", null);
    syncDeleteSubmit();
  });

  document.querySelector("[data-ba-delete-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    await deleteBuyerAccount();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || els.deleteModal?.hidden) return;
    closeDeleteModal();
  });

  document.querySelectorAll("[data-ba-wizard-close]").forEach((node) => {
    node.addEventListener("click", closeWizard);
  });

  document.querySelectorAll("[data-ba-back]").forEach((btn) => {
    btn.addEventListener("click", previousStep);
  });

  document.querySelector("[data-ba-next-pin]")?.addEventListener("click", () => {
    try {
      state.sellerPin = readPinForm();
      setFeedback(els.wizardFeedback, "Switch PIN saved. You'll enter this PIN before opening seller admin.", "success");
      showStep(isVerified() ? "company" : "verify");
    } catch (error) {
      setFeedback(els.wizardFeedback, error.message || "Check your Switch PIN.", "error");
    }
  });

  ["data-ba-pin", "data-ba-pin-confirm"].forEach((selector) => {
    document.querySelector(`[${selector}]`)?.addEventListener("input", (event) => {
      event.target.value = String(event.target.value || "").replace(/\D/g, "").slice(0, 6);
    });
  });

  els.businessTypeSearch?.addEventListener("input", (event) => {
    state.businessTypeSearchTerm = String(event.target.value || "");
    renderBusinessTypes();
  });

  document.querySelectorAll("[data-ba-company-logo-select]").forEach((button) => {
    button.addEventListener("click", () => els.companyLogoInput?.click());
  });

  els.companyLogoInput?.addEventListener("change", async () => {
    const file = els.companyLogoInput.files?.[0] || null;
    els.companyLogoInput.value = "";
    if (!file) return;
    if (!String(file.type || "").startsWith("image/")) {
      setFeedback(els.wizardFeedback, "Please choose an image file for the company photo.", "error");
      return;
    }
    if (state.companyLogoPreviewUrl) {
      try { URL.revokeObjectURL(state.companyLogoPreviewUrl); } catch (_) {}
    }
    state.companyLogoFile = file;
    state.companyLogoPreviewUrl = URL.createObjectURL(file);
    state.companyLogoUploadedUrl = "";
    state.companyLogoSkipped = false;
    syncCompanyLogoPreview();
  });

  els.companyLogoRemove?.addEventListener("click", () => {
    clearCompanyLogo();
  });

  document.querySelectorAll("[data-ba-seller-kind-option]").forEach((button) => {
    button.addEventListener("click", () => {
      setSellerKind(button.getAttribute("data-ba-seller-kind-option"));
    });
  });
  els.documentInput?.addEventListener("change", () => {
    const file = els.documentInput.files?.[0] || null;
    els.documentInput.value = "";
    const slotKey = state.activeKycSlot;
    if (!file || !slotKey) return;
    const slot = getKycSlotsForKind(state.sellerKind).find((item) => item.key === slotKey);
    state.kycDocuments[slotKey] = {
      ...(state.kycDocuments[slotKey] || {}),
      type: state.kycDocuments[slotKey]?.type || slot?.type || slot?.types?.[0] || "other",
      file,
      url: "",
    };
    renderKycSlots();
  });
  els.bankAccountNumber?.addEventListener("input", (event) => {
    event.target.value = String(event.target.value || "").replace(/\D/g, "").slice(0, 20);
  });

  document.querySelector("[data-ba-company-logo-skip]")?.addEventListener("click", () => {
    clearCompanyLogo({ skipped: true });
    setFeedback(els.wizardFeedback, "Company photo skipped for now.", "success");
  });

  document.querySelectorAll("[data-ba-verify-channel]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.verifyChannel = btn.getAttribute("data-ba-verify-channel") === "mobile" ? "mobile" : "email";
      document.querySelectorAll("[data-ba-verify-channel]").forEach((item) => {
        item.classList.toggle("is-active", item === btn);
      });
      updateVerifyTarget();
    });
  });

  document.querySelector("[data-ba-send-code]")?.addEventListener("click", async () => {
    const btn = document.querySelector("[data-ba-send-code]");
    if (state.busy) return;
    state.busy = true;
    setActionBusy(btn, true, "Sending…");
    try {
      await sendVerificationCode();
    } catch (error) {
      setFeedback(els.wizardFeedback, error.message || "Unable to send code.", "error");
    } finally {
      state.busy = false;
      setActionBusy(btn, false);
    }
  });

  document.querySelector("[data-ba-next-verify]")?.addEventListener("click", async () => {
    const btn = document.querySelector("[data-ba-next-verify]");
    if (state.busy) return;
    state.busy = true;
    setActionBusy(btn, true, "Verifying…");
    try {
      await verifyCode({ prototype: false });
    } catch (error) {
      setFeedback(els.wizardFeedback, error.message || "Unable to verify.", "error");
    } finally {
      state.busy = false;
      setActionBusy(btn, false);
    }
  });

  document.querySelector("[data-ba-prototype-verify]")?.addEventListener("click", async () => {
    const btn = document.querySelector("[data-ba-prototype-verify]");
    if (state.busy) return;
    state.busy = true;
    setActionBusy(btn, true, "Applying…");
    try {
      await verifyCode({ prototype: true });
    } catch (error) {
      setFeedback(els.wizardFeedback, error.message || "Unable to apply prototype verification.", "error");
    } finally {
      state.busy = false;
      setActionBusy(btn, false);
    }
  });

  document.querySelector("[data-ba-finish-seller]")?.addEventListener("click", async () => {
    if (state.busy) return;
    state.busy = true;
    setActionBusy(els.finishSeller, true, "Saving…");
    try {
      await finishSellerUpgrade();
      setActionBusy(els.finishSeller, false);
      state.busy = false;
    } catch (error) {
      setFeedback(els.wizardFeedback, error.message || "Unable to finish seller upgrade.", "error");
      state.busy = false;
      setActionBusy(els.finishSeller, false);
    }
  });

  function bindHeaderScroll() {
    const header = document.querySelector("body.md-account-settings-app > .login-site-header");
    if (!(header instanceof HTMLElement)) return;

    const update = () => {
      header.classList.toggle("is-scrolled", window.scrollY > 12);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
  }

  function isEmbedMode() {
    return document.body.classList.contains("is-embed")
      || new URLSearchParams(window.location.search).get("embed") === "1";
  }

  function setupEmbedMode() {
    if (!isEmbedMode()) return;
    document.body.classList.add("is-embed");
  }

  function applyExternalTab(tab) {
    const next = String(tab || "").trim().toLowerCase();
    if (
      ![
        "profile",
        "security",
        "preferences",
        "account",
        "seller",
        "payment",
        "address",
        "account-links",
        "password",
        "two-factor",
        "login-activity",
        "devices",
      ].includes(next)
    ) {
      return;
    }
    switchTab(next);
  }

  fillProfile();
  loadStoreTypes();
  refreshUnifiedSession();
  bindHeaderScroll();
  bindStoreLocationControls();
  setupEmbedMode();

  const params = new URLSearchParams(window.location.search);
  const requestedTab = String(params.get("tab") || "").trim().toLowerCase();
  const requestedSection = String(params.get("section") || "").trim().toLowerCase();
  if (
    [
      "profile",
      "security",
      "preferences",
      "account",
      "seller",
      "payment",
      "address",
      "account-links",
      "password",
      "two-factor",
      "login-activity",
      "devices",
    ].includes(requestedTab)
  ) {
    switchTab(requestedTab);
    if (requestedTab === "security" && requestedSection) {
      switchSecuritySection(requestedSection);
    }
  }

  void (async () => {
    await loadPlans();
    const openSeller = params.get("becomeSeller") === "1";
    if (!openSeller) {
      return;
    }
    switchTab("seller");
    openWizard("pin");
  })();

  window.addEventListener("message", (event) => {
    if (event.origin !== window.location.origin) return;
    const data = event.data;
    if (!data || typeof data !== "object") return;
    if (data.type === "ba-account-switch-tab") {
      applyExternalTab(data.tab);
    }
    if (data.type === "ba-account-open-seller") {
      switchTab("seller");
      openWizard("pin");
    }
  });

  window.SwitchAccountPage = {
    switchTab: applyExternalTab,
    openSellerWizard: () => {
      switchTab("seller");
      openWizard("pin");
    },
  };
})();
