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
    storeTypes: [],
    selectedStoreType: "",
    businessTypeSearchTerm: "",
    companyLogoFile: null,
    companyLogoPreviewUrl: "",
    companyLogoUploadedUrl: "",
    companyLogoSkipped: false,
    businessDocumentFile: null,
    businessDocumentType: "business_permit",
    businessDocumentUploadedUrl: "",
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
    busy: false,
    deleteBusy: false,
    step: "plan",
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
    wizard: document.querySelector("[data-ba-wizard]"),
    wizardFeedback: document.querySelector("[data-ba-wizard-feedback]"),
    wizardTitle: document.getElementById("ba-wizard-title"),
    progress: document.querySelector("[data-ba-wizard-progress]"),
    planGrid: document.querySelector("[data-ba-plan-grid]"),
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
    documentType: document.querySelector("[data-ba-document-type]"),
    documentStatus: document.querySelector("[data-ba-document-status]"),
    documentSelect: document.querySelector("[data-ba-document-select]"),
    documentRemove: document.querySelector("[data-ba-document-remove]"),
    doneCopy: document.querySelector("[data-ba-done-copy]"),
    openDashboard: document.querySelector("[data-ba-open-dashboard]"),
    deleteModal: document.querySelector("[data-ba-delete-modal]"),
    deleteConfirmation: document.querySelector("[data-ba-delete-confirmation]"),
    deleteEmail: document.querySelector("[data-ba-delete-email]"),
    deleteFeedback: document.querySelector("[data-ba-delete-feedback]"),
    deleteSubmit: document.querySelector("[data-ba-delete-submit]"),
  };

  const STEP_ORDER = ["plan", "card", "pin", "verify", "company", "done"];
  const STEP_TITLES = {
    plan: "Choose Your Plan",
    card: "Register your card",
    pin: "Create Switch PIN",
    verify: "Verify your contact",
    company: "Company profile",
    done: "You're ready",
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

  function wizardStepOrder() {
    return isFreePlan()
      ? ["plan", "pin", "verify", "company", "done"]
      : ["plan", "card", "pin", "verify", "company", "done"];
  }

  function planCycleLabel() {
    return state.billingCycle === "yearly" ? "year" : "month";
  }

  function renderPlans() {
    if (!els.planGrid) return;
    const plans = Array.isArray(state.plans) ? state.plans : [];
    if (!plans.length) {
      els.planGrid.innerHTML = `<p class="ba-muted">Unable to load seller plans. You can still continue with a prototype Pro plan.</p>`;
      state.plans = [
        {
          id: "seller-free",
          name: "Free",
          amount: 0,
          yearlyAmount: 0,
          currencyCode: "PHP",
          free: true,
          description: "Start selling on Switch at no cost.",
          features: ["Seller admin dashboard", "Up to 10 active listings"],
        },
        {
          id: "seller-pro-monthly",
          name: "Pro",
          amount: 499,
          yearlyAmount: 4790,
          currencyCode: "PHP",
          popular: true,
          description: "Prototype seller plan for Switch.",
          features: ["Seller admin dashboard", "Unified account", "Legit badge for original products"],
        },
      ];
    }

    const icons = { Free: "○", Basic: "🌿", Pro: "👑", Premium: "◆" };
    els.planGrid.innerHTML = state.plans
      .map((plan) => {
        const amount = planAmount(plan);
        const popular = Boolean(plan.popular);
        const free = isFreePlan(plan);
        const features = Array.isArray(plan.features) ? plan.features : [];
        return `
          <article class="ba-plan-card ${popular ? "is-popular" : ""}${free ? " is-free" : ""}" data-ba-select-plan="${escapeHtml(plan.id)}">
            ${popular ? `<span class="ba-plan-card__badge">Most Popular</span>` : ""}
            ${free && !popular ? `<span class="ba-plan-card__badge">Free</span>` : ""}
            <div class="ba-plan-card__icon" aria-hidden="true">${icons[plan.name] || "◆"}</div>
            <h3>${escapeHtml(plan.name || "Plan")}</h3>
            <p class="ba-plan-card__copy">${escapeHtml(plan.description || "")}</p>
            <div class="ba-plan-card__price">
              <strong>${free ? "Free" : `${escapeHtml(plan.currencyCode || "PHP")} ${amount}`}</strong>
              <span>${free ? "to start" : `/ ${planCycleLabel()}`}</span>
            </div>
            <ul>
              ${features.map((feature) => `<li>${escapeHtml(feature)}</li>`).join("")}
            </ul>
            <button type="button" class="ba-plan-card__cta" data-ba-select-plan="${escapeHtml(plan.id)}">
              ${free ? "Start Free →" : popular ? "Start Free Trial →" : "Get Started →"}
            </button>
          </article>
        `;
      })
      .join("");
  }

  function renderProgress() {
    if (!els.progress) return;
    const steps = wizardStepOrder();
    const activeIndex = steps.indexOf(state.step);
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
    }
  }

  function openWizard(startStep = "plan") {
    if (!els.wizard) return;
    els.wizard.hidden = false;
    document.body.classList.add("modal-open");
    setFeedback(els.wizardFeedback, "", null);
    showStep(startStep);
  }

  function closeWizard() {
    if (!els.wizard) return;
    els.wizard.hidden = true;
    document.body.classList.remove("modal-open");
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

  async function uploadSelectedBusinessDocument() {
    if (state.businessDocumentUploadedUrl) return state.businessDocumentUploadedUrl;
    const file = state.businessDocumentFile instanceof File ? state.businessDocumentFile : null;
    if (!file) return "";
    const response = await fetch("/api/document-uploads", {
      method: "POST",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        "X-File-Name": file.name || "business-document",
      },
      body: file,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || "Unable to upload business document.");
    }
    const uploadedUrl = String(data.documentUrl || "").trim();
    if (!uploadedUrl) {
      throw new Error("Document upload did not return a file URL.");
    }
    state.businessDocumentUploadedUrl = uploadedUrl;
    return uploadedUrl;
  }

  function syncBusinessDocumentUi() {
    const hasFile = state.businessDocumentFile instanceof File;
    if (els.documentStatus) {
      els.documentStatus.textContent = hasFile
        ? `Selected: ${state.businessDocumentFile.name}`
        : "PDF or image of your business permit / DTI / SEC helps Super Admin review faster.";
    }
    if (els.documentRemove) els.documentRemove.hidden = !hasFile;
  }

  function clearBusinessDocument() {
    state.businessDocumentFile = null;
    state.businessDocumentUploadedUrl = "";
    if (els.documentInput) els.documentInput.value = "";
    syncBusinessDocumentUi();
  }

  async function loadPlans() {
    try {
      const payload = await fetchJson("/api/account/seller-plans");
      state.plans = Array.isArray(payload?.catalog?.plans) ? payload.catalog.plans : [];
    } catch (_) {
      state.plans = [];
    }
    renderPlans();
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
      if (modes.includes("seller_admin")) {
        setFeedback(
          els.sellerStatus,
          "Seller access is already active on this account.",
          "success",
        );
      }
    } catch (_) {}
  }

  function selectPlan(planId) {
    const plan = state.plans.find((item) => String(item.id) === String(planId));
    if (!plan) {
      setFeedback(els.wizardFeedback, "Select a plan to continue.", "error");
      return;
    }
    state.selectedPlan = {
      ...plan,
      billingCycle: state.billingCycle,
      amount: planAmount(plan),
    };
    showStep(isFreePlan(state.selectedPlan) ? "pin" : "card");
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
    const plan = state.selectedPlan;

    if (companyName.length < 2) {
      throw new Error("Company name must be at least 2 characters.");
    }
    if (!businessType) {
      throw new Error("Choose a business type.");
    }
    if (!plan) {
      throw new Error("Select a plan first.");
    }
    const freePlan = isFreePlan(plan);
    if (!freePlan && !state.paymentCard) {
      throw new Error("Register a card before continuing.");
    }
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
      freePlan ? "Creating free seller company..." : "Creating seller company...",
      null,
    );

    const paymentGateway = freePlan
      ? "free"
      : state.paymentCard.brand === "mastercard"
        ? "prototype-mastercard"
        : "prototype-visa";

    const startPayload = await fetchJson("/api/account/become-seller/start", {
      method: "POST",
      body: JSON.stringify({
        accountId: state.accountId,
        email: state.email,
        companyName,
        businessType,
        logoUrl,
        planName: plan.name,
        billingCycle: plan.billingCycle || state.billingCycle,
        amount: Number(plan.amount || 0),
        currencyCode: plan.currencyCode || "PHP",
        paymentGateway,
        paymentCard: freePlan ? null : state.paymentCard,
        sellerPin: state.sellerPin,
        countryCode: state.countryCode,
        mobileNumber: state.mobileNumber,
        businessLogoSkipped: state.companyLogoSkipped && !logoUrl,
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

    const documentUrl = await uploadSelectedBusinessDocument();
    if (documentUrl) {
      setFeedback(els.wizardFeedback, "Saving business document for review...", null);
      await fetchJson("/api/account/become-seller/documents", {
        method: "POST",
        body: JSON.stringify({
          accountId: state.accountId,
          companyId,
          type: state.businessDocumentType || els.documentType?.value || "business_permit",
          fileName: state.businessDocumentFile?.name || "",
          label: state.businessDocumentFile?.name || "",
          url: documentUrl,
        }),
      });
    }

    setFeedback(
      els.wizardFeedback,
      freePlan ? "Activating free seller plan..." : "Confirming prototype subscription...",
      null,
    );
    const checkoutPayload = await fetchJson("/api/account/become-seller/checkout-intent", {
      method: "POST",
      body: JSON.stringify({
        accountId: state.accountId,
        companyId,
        planName: plan.name,
        billingCycle: plan.billingCycle || state.billingCycle,
        paymentGateway: freePlan ? "free" : "prototype-visa",
        amount: Number(plan.amount || 0),
        currencyCode: plan.currencyCode || "PHP",
      }),
    });

    const paymentReference =
      checkoutPayload?.checkoutIntent?.paymentReference ||
      (freePlan ? `FREE-${Date.now()}` : `PROTO-${Date.now()}`);

    const confirmPayload = await fetchJson("/api/account/become-seller/confirm-payment", {
      method: "POST",
      body: JSON.stringify({
        accountId: state.accountId,
        companyId,
        planName: plan.name,
        billingCycle: plan.billingCycle || state.billingCycle,
        paymentGateway: freePlan ? "free" : "prototype-visa",
        paymentReference,
        amount: Number(plan.amount || 0),
        currencyCode: plan.currencyCode || "PHP",
      }),
    });

    if (!confirmPayload?.onboarding?.active) {
      throw new Error(
        confirmPayload.message ||
          "Payment saved, but seller activation still needs verification review.",
      );
    }

    const workspace = await fetchJson("/api/account/become-seller/open-workspace", {
      method: "POST",
      body: JSON.stringify({
        accountId: state.accountId,
        email: state.email,
      }),
    });

    const redirectPath = String(
      workspace.redirectPath || confirmPayload.redirectPath || "/main.html#dashboard",
    ).trim();
    persistAdminSession(workspace.admin || {}, redirectPath);
    persistSwitchPinUnlock(startPayload?.pinUnlockToken, startPayload?.onboarding?.company?.id || companyId);
    if (els.openDashboard) els.openDashboard.href = redirectPath;
    if (els.doneCopy) {
      els.doneCopy.textContent = `${companyName} is active on the ${plan.name} plan. Opening seller admin dashboard…`;
    }
    showStep("done");
    setFeedback(els.sellerStatus, "Seller workspace activated.", "success");
    setFeedback(els.wizardFeedback, workspace.message || "Seller workspace ready.", "success");

    window.setTimeout(() => {
      window.location.href = redirectPath;
    }, 900);
  }

  function previousStep() {
    if (state.step === "card") showStep("plan");
    else if (state.step === "pin") showStep(isFreePlan() ? "plan" : "card");
    else if (state.step === "verify") showStep("pin");
    else if (state.step === "company") showStep(isVerified() ? "pin" : "verify");
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
    openWizard("plan");
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

  document.querySelectorAll("[data-ba-billing]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.billingCycle = btn.getAttribute("data-ba-billing") === "yearly" ? "yearly" : "monthly";
      document.querySelectorAll("[data-ba-billing]").forEach((item) => {
        item.classList.toggle("is-active", item === btn);
      });
      renderPlans();
    });
  });

  els.planGrid?.addEventListener("click", (event) => {
    const target = event.target.closest("[data-ba-select-plan]");
    if (!target) return;
    selectPlan(target.getAttribute("data-ba-select-plan"));
  });

  document.querySelector("[data-ba-card-number]")?.addEventListener("input", (event) => {
    event.target.value = formatCardNumber(event.target.value);
  });

  document.querySelector("[data-ba-card-expiry]")?.addEventListener("input", (event) => {
    event.target.value = formatExpiry(event.target.value);
  });

  document.querySelectorAll("[data-ba-back]").forEach((btn) => {
    btn.addEventListener("click", previousStep);
  });

  document.querySelector("[data-ba-next-card]")?.addEventListener("click", () => {
    try {
      state.paymentCard = readCardForm();
      setFeedback(els.wizardFeedback, "Card saved for this prototype.", "success");
      showStep("pin");
    } catch (error) {
      setFeedback(els.wizardFeedback, error.message || "Check your card details.", "error");
    }
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

  els.documentSelect?.addEventListener("click", () => els.documentInput?.click());
  els.documentType?.addEventListener("change", () => {
    state.businessDocumentType = String(els.documentType.value || "business_permit");
  });
  els.documentInput?.addEventListener("change", () => {
    const file = els.documentInput.files?.[0] || null;
    els.documentInput.value = "";
    if (!file) return;
    state.businessDocumentFile = file;
    state.businessDocumentUploadedUrl = "";
    state.businessDocumentType = String(els.documentType?.value || "business_permit");
    syncBusinessDocumentUi();
  });
  els.documentRemove?.addEventListener("click", () => {
    clearBusinessDocument();
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
    if (state.busy) return;
    state.busy = true;
    try {
      await sendVerificationCode();
    } catch (error) {
      setFeedback(els.wizardFeedback, error.message || "Unable to send code.", "error");
    } finally {
      state.busy = false;
    }
  });

  document.querySelector("[data-ba-next-verify]")?.addEventListener("click", async () => {
    if (state.busy) return;
    state.busy = true;
    try {
      await verifyCode({ prototype: false });
    } catch (error) {
      setFeedback(els.wizardFeedback, error.message || "Unable to verify.", "error");
    } finally {
      state.busy = false;
    }
  });

  document.querySelector("[data-ba-prototype-verify]")?.addEventListener("click", async () => {
    if (state.busy) return;
    state.busy = true;
    try {
      await verifyCode({ prototype: true });
    } catch (error) {
      setFeedback(els.wizardFeedback, error.message || "Unable to apply prototype verification.", "error");
    } finally {
      state.busy = false;
    }
  });

  document.querySelector("[data-ba-finish-seller]")?.addEventListener("click", async () => {
    if (state.busy) return;
    state.busy = true;
    try {
      await finishSellerUpgrade();
    } catch (error) {
      setFeedback(els.wizardFeedback, error.message || "Unable to finish seller upgrade.", "error");
    } finally {
      state.busy = false;
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
  loadPlans();
  loadStoreTypes();
  refreshUnifiedSession();
  bindHeaderScroll();
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
  if (params.get("becomeSeller") === "1") {
    switchTab("seller");
    openWizard("plan");
  }

  window.addEventListener("message", (event) => {
    if (event.origin !== window.location.origin) return;
    const data = event.data;
    if (!data || typeof data !== "object") return;
    if (data.type === "ba-account-switch-tab") {
      applyExternalTab(data.tab);
    }
    if (data.type === "ba-account-open-seller") {
      switchTab("seller");
      openWizard("plan");
    }
  });

  window.SwitchAccountPage = {
    switchTab: applyExternalTab,
    openSellerWizard: () => {
      switchTab("seller");
      openWizard("plan");
    },
  };
})();
