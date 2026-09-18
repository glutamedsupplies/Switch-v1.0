(function () {
  const accountForm = document.getElementById("unified-account-form");
  const identityInput = document.getElementById("unified-identity-input");
  const feedback = document.getElementById("unified-feedback");
  const sellerFeedback = document.getElementById("seller-upgrade-feedback");
  const sessionCard = document.getElementById("unified-session-card");
  const sellerCard = document.getElementById("seller-upgrade-card");
  const sessionDisplayName = document.getElementById("session-display-name");
  const sessionEmail = document.getElementById("session-email");
  const sessionAccountId = document.getElementById("session-account-id");
  const sessionCompanyName = document.getElementById("session-company-name");
  const sessionActiveMode = document.getElementById("session-active-mode");
  const sessionModes = document.getElementById("session-modes");
  const sessionCompanies = document.getElementById("session-companies");
  const sellerForm = document.getElementById("seller-upgrade-form");
  const sellerCompanyNameInput = document.getElementById("seller-company-name");
  const sellerBusinessTypeInput = document.getElementById("seller-business-type");
  const sellerPaymentReferenceInput = document.getElementById("seller-payment-reference");
  const sellerPlanSelect = document.getElementById("seller-plan-select");
  const sellerPaymentPartnerSelect = document.getElementById("seller-payment-partner-select");
  const sellerPlanSummary = document.getElementById("seller-plan-summary");
  const sellerPlanCopy = document.getElementById("seller-plan-copy");
  const sellerPlanFeatures = document.getElementById("seller-plan-features");

  let currentSession = null;
  let accountRequestBusy = false;
  let sellerRequestBusy = false;
  let sellerCatalog = { plans: [], paymentPartners: [] };
  const rememberedIdentityKey = "switch-unified-account-identity";

  function setFeedback(target, message, type) {
    if (!target) {
      return;
    }
    target.textContent = String(message || "").trim();
    target.classList.remove("is-error", "is-success");
    if (type === "error") {
      target.classList.add("is-error");
    } else if (type === "success") {
      target.classList.add("is-success");
    }
  }

  function formatModeLabel(mode) {
    switch (String(mode || "").trim().toLowerCase()) {
      case "seller_admin":
        return "Seller Mode";
      case "supplier_admin":
        return "Supplier Mode";
      case "employee":
        return "Employee Mode";
      case "super_admin":
        return "Super Admin";
      case "buyer":
      default:
        return "Buyer Mode";
    }
  }

  function isEmailLike(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
  }

  async function fetchJson(url, options) {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        ...(options && options.body ? { "Content-Type": "application/json" } : {}),
      },
      ...options,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.message || "Request failed.");
    }
    return payload;
  }

  function selectedPlan() {
    const selectedId = String(sellerPlanSelect?.value || "").trim();
    return sellerCatalog.plans.find((plan) => String(plan.id || "").trim() === selectedId) || null;
  }

  function selectedPaymentPartner() {
    const selectedId = String(sellerPaymentPartnerSelect?.value || "").trim();
    return sellerCatalog.paymentPartners.find(
      (partner) => String(partner.id || "").trim() === selectedId,
    ) || null;
  }

  function renderSellerCatalog() {
    if (!sellerPlanSelect || !sellerPaymentPartnerSelect || !sellerPlanSummary || !sellerPlanCopy || !sellerPlanFeatures) {
      return;
    }

    const plans = Array.isArray(sellerCatalog.plans) ? sellerCatalog.plans : [];
    const paymentPartners = Array.isArray(sellerCatalog.paymentPartners)
      ? sellerCatalog.paymentPartners
      : [];

    sellerPlanSelect.innerHTML = "";
    for (const plan of plans) {
      const option = document.createElement("option");
      option.value = String(plan.id || "").trim();
      option.textContent = `${plan.name} - ${plan.currencyCode || "PHP"} ${plan.amount || 0}/${plan.billingCycle || "month"}`;
      sellerPlanSelect.appendChild(option);
    }
    if (!plans.length) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "No seller plans available";
      sellerPlanSelect.appendChild(option);
    }

    sellerPaymentPartnerSelect.innerHTML = "";
    for (const partner of paymentPartners) {
      const option = document.createElement("option");
      option.value = String(partner.id || "").trim();
      option.textContent = partner.name;
      sellerPaymentPartnerSelect.appendChild(option);
    }
    if (!paymentPartners.length) {
      const option = document.createElement("option");
      option.value = "manual";
      option.textContent = "Manual verification";
      sellerPaymentPartnerSelect.appendChild(option);
    }

    const plan = selectedPlan() || plans[0] || null;
    if (!plan) {
      sellerPlanSummary.textContent = "Seller plan unavailable";
      sellerPlanCopy.textContent = "No seller plan catalog is available right now.";
      sellerPlanFeatures.innerHTML = "";
      return;
    }

    sellerPlanSummary.textContent = plan.name || "Seller plan";
    sellerPlanCopy.textContent =
      `${plan.currencyCode || "PHP"} ${plan.amount || 0} ${plan.billingCycle || "monthly"} through the unified seller subscription flow.`;
    sellerPlanFeatures.innerHTML = "";
    for (const feature of Array.isArray(plan.features) ? plan.features : []) {
      const item = document.createElement("li");
      item.textContent = feature;
      sellerPlanFeatures.appendChild(item);
    }
  }

  async function loadSellerCatalog() {
    try {
      const payload = await fetchJson("/api/account/seller-plans", {
        cache: "no-store",
      });
      sellerCatalog = payload.catalog || { plans: [], paymentPartners: [] };
      renderSellerCatalog();
    } catch (error) {
      sellerCatalog = { plans: [], paymentPartners: [] };
      renderSellerCatalog();
      setFeedback(sellerFeedback, error.message || "Unable to load seller plans.", "error");
    }
  }

  function findSellerCompanyId(session) {
    const companies = Array.isArray(session?.companies) ? session.companies : [];
    for (const membership of companies) {
      const company = membership?.company;
      const type = String(company?.type || "").trim().toLowerCase();
      if (type === "seller") {
        return String(membership.companyId || company.id || "").trim();
      }
    }
    return "";
  }

  function renderSession(session) {
    currentSession = session || null;
    if (!sessionCard || !sellerCard || !sessionModes || !sessionCompanies) {
      return;
    }
    if (!session) {
      sessionCard.hidden = true;
      sellerCard.hidden = true;
      sessionModes.innerHTML = "";
      sessionCompanies.innerHTML = "";
      return;
    }

    sessionCard.hidden = false;
    const account = session.account || {};
    const displayName = [
      account.displayName,
      [account.firstName, account.lastName].filter(Boolean).join(" "),
      account.email,
      "Unified account",
    ].find((value) => String(value || "").trim()) || "Unified account";

    sessionDisplayName.textContent = displayName;
    sessionEmail.textContent = String(account.email || "-").trim() || "-";
    sessionAccountId.textContent = String(account.id || account.accountId || "-").trim() || "-";
    sessionActiveMode.textContent = formatModeLabel(session.activeMode);
    sessionCompanyName.textContent =
      String(session.activeCompany?.name || "").trim() || "Buyer only";

    const modes = Array.isArray(session.availableModes) ? session.availableModes : [];
    sessionModes.innerHTML = "";
    for (const mode of modes) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "portal-mode-button";
      if (String(mode) === String(session.activeMode)) {
        button.classList.add("is-active");
      }
      button.innerHTML = `
        <span>${formatModeLabel(mode)}</span>
        <small>${String(mode) === String(session.activeMode) ? "Current" : "Switch"}</small>
      `;
      button.addEventListener("click", () => switchRole(mode));
      sessionModes.appendChild(button);
    }

    const companies = Array.isArray(session.companies) ? session.companies : [];
    sessionCompanies.innerHTML = "";
    if (!companies.length) {
      sessionCompanies.innerHTML = `<p class="portal-empty">No linked companies yet.</p>`;
    } else {
      for (const membership of companies) {
        const company = membership?.company || {};
        const card = document.createElement("article");
        card.className = "portal-company-card";
        card.innerHTML = `
          <strong>${String(company.name || "Company").trim()}</strong>
          <div class="portal-company-card__meta">
            <span>${String(company.type || "company").trim()}</span>
            <span>${String(membership.membershipRole || "member").trim()}</span>
            <span>${String(company.subscriptionStatus || company.status || "draft").trim()}</span>
          </div>
          <p>${String(company.businessType || "Business type pending").trim()}</p>
        `;
        sessionCompanies.appendChild(card);
      }
    }

    const canBecomeSeller = !modes.includes("seller_admin");
    sellerCard.hidden = !canBecomeSeller;
    if (canBecomeSeller && sellerCompanyNameInput && !sellerCompanyNameInput.value.trim()) {
      sellerCompanyNameInput.value = String(account.companyName || account.storeName || "").trim();
    }
  }

  async function loadSession(options = {}) {
    if (!identityInput || accountRequestBusy) {
      return;
    }
    const rawIdentity = String(identityInput.value || "").trim();
    const preferredMode = String(options.activeMode || "").trim();
    const preferredCompanyId = String(options.companyId || "").trim();
    if (!rawIdentity) {
      setFeedback(feedback, "Enter an email or account ID first.", "error");
      renderSession(null);
      return;
    }

    accountRequestBusy = true;
    setFeedback(feedback, "Loading unified account...", null);

    try {
      let query = isEmailLike(rawIdentity)
        ? `email=${encodeURIComponent(rawIdentity)}`
        : `accountId=${encodeURIComponent(rawIdentity)}`;
      if (preferredMode) {
        query += `&activeMode=${encodeURIComponent(preferredMode)}`;
      }
      if (preferredCompanyId) {
        query += `&companyId=${encodeURIComponent(preferredCompanyId)}`;
      }
      const payload = await fetchJson(`/api/auth/session?${query}`, {
        cache: "no-store",
      });
      try {
        window.localStorage.setItem(rememberedIdentityKey, rawIdentity);
      } catch (_) {}
      renderSession(payload.session || null);
      setFeedback(feedback, payload.message || "Unified account loaded.", "success");
    } catch (error) {
      renderSession(null);
      setFeedback(feedback, error.message || "Unable to load unified account.", "error");
    } finally {
      accountRequestBusy = false;
    }
  }

  async function switchRole(mode) {
    if (!currentSession?.account?.id || accountRequestBusy) {
      return;
    }

    accountRequestBusy = true;
    setFeedback(feedback, `Switching to ${formatModeLabel(mode)}...`, null);

    try {
      const payload = await fetchJson("/api/auth/switch-role", {
        method: "POST",
        body: JSON.stringify({
          accountId: currentSession.account.id,
          activeMode: mode,
          companyId: currentSession.activeCompanyId || findSellerCompanyId(currentSession),
        }),
      });
      renderSession(payload.session || null);
      setFeedback(feedback, payload.message || "Role switched.", "success");
    } catch (error) {
      setFeedback(feedback, error.message || "Unable to switch role.", "error");
    } finally {
      accountRequestBusy = false;
    }
  }

  async function activateSellerFlow() {
    if (!currentSession?.account?.id || sellerRequestBusy) {
      return;
    }
    const companyName = String(sellerCompanyNameInput?.value || "").trim();
    const businessType = String(sellerBusinessTypeInput?.value || "").trim();
    const paymentReference = String(sellerPaymentReferenceInput?.value || "").trim();
    const plan = selectedPlan();
    const paymentPartner = selectedPaymentPartner();
    if (companyName.length < 2) {
      setFeedback(sellerFeedback, "Enter a company name with at least 2 characters.", "error");
      return;
    }

    sellerRequestBusy = true;
    setFeedback(sellerFeedback, "Creating seller company...", null);

    try {
      const startPayload = await fetchJson("/api/account/become-seller/start", {
        method: "POST",
        body: JSON.stringify({
          accountId: currentSession.account.id,
          companyName,
          businessType,
          planName: plan?.name || "Starter Seller Plan",
          billingCycle: plan?.billingCycle || "monthly",
          amount: Number(plan?.amount || 0),
          currencyCode: plan?.currencyCode || "PHP",
          paymentGateway: paymentPartner?.name || "manual",
        }),
      });

      const startSession = startPayload.session || currentSession;
      const companyId = findSellerCompanyId(startSession);
      if (!companyId) {
        throw new Error("Seller onboarding was created, but no seller company was returned.");
      }

      setFeedback(sellerFeedback, "Preparing checkout intent...", null);
      const checkoutPayload = await fetchJson("/api/account/become-seller/checkout-intent", {
        method: "POST",
        body: JSON.stringify({
          accountId: currentSession.account.id,
          companyId,
          planName: plan?.name || "Starter Seller Plan",
          billingCycle: plan?.billingCycle || "monthly",
          paymentGateway: paymentPartner?.name || "manual",
          paymentReference: paymentReference || "",
          amount: Number(plan?.amount || 0),
          currencyCode: plan?.currencyCode || "PHP",
        }),
      });
      const checkoutIntent = checkoutPayload.checkoutIntent || {};
      const checkoutUrl = String(checkoutIntent.checkoutUrl || "").trim();
      const shouldRedirectToHostedCheckout =
        /^https?:\/\//i.test(checkoutUrl) &&
        !checkoutUrl.includes("/unified_account.html");

      setFeedback(
        sellerFeedback,
        shouldRedirectToHostedCheckout
          ? `Checkout intent ${checkoutIntent.id || "created"} is ready. Redirecting to hosted checkout...`
          : `Checkout intent ${checkoutIntent.id || "created"} is ready. Confirming seller activation...`,
        null,
      );
      if (shouldRedirectToHostedCheckout) {
        window.location.href = checkoutUrl;
        return;
      }

      const confirmPayload = await fetchJson("/api/account/become-seller/confirm-payment", {
        method: "POST",
        body: JSON.stringify({
          accountId: currentSession.account.id,
          companyId,
          planName: plan?.name || "Starter Seller Plan",
          billingCycle: plan?.billingCycle || "monthly",
          paymentGateway: paymentPartner?.name || "manual",
          paymentReference:
            paymentReference ||
            checkoutIntent.paymentReference ||
            `MANUAL-${Date.now()}`,
          amount: Number(plan?.amount || 0),
          currencyCode: plan?.currencyCode || "PHP",
        }),
      });

      renderSession(confirmPayload.session || null);
      setFeedback(
        sellerFeedback,
        confirmPayload.message || "Seller flow completed.",
        "success",
      );
      setFeedback(feedback, "Unified account updated.", "success");
    } catch (error) {
      setFeedback(
        sellerFeedback,
        error.message || "Unable to activate seller flow.",
        "error",
      );
    } finally {
      sellerRequestBusy = false;
    }
  }

  accountForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    loadSession();
  });

  sellerForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    activateSellerFlow();
  });

  sellerPlanSelect?.addEventListener("change", renderSellerCatalog);

  try {
    const params = new URLSearchParams(window.location.search || "");
    const rememberedIdentity = String(
      window.localStorage.getItem(rememberedIdentityKey) || "",
    ).trim();
    const queryAccountId = String(params.get("accountId") || "").trim();
    const queryEmail = String(params.get("email") || "").trim();
    const checkoutState = String(params.get("checkout") || "").trim().toLowerCase();
    const preloadIdentity = queryAccountId || queryEmail || rememberedIdentity;
    if (identityInput && preloadIdentity) {
      identityInput.value = preloadIdentity;
      const preferredCompanyId = String(params.get("companyId") || "").trim();
      const preferredMode = checkoutState === "success" ? "seller_admin" : "";
      queueMicrotask(() => {
        loadSession({
          activeMode: preferredMode,
          companyId: preferredCompanyId,
        });
      });
    }
    if (checkoutState === "success") {
      setFeedback(
        sellerFeedback,
        "Payment return detected. Refreshing unified session to unlock Seller Mode...",
        "success",
      );
    } else if (checkoutState === "cancel") {
      setFeedback(
        sellerFeedback,
        "Hosted checkout was canceled. You can retry seller activation anytime.",
        "error",
      );
    }
  } catch (_) {}

  loadSellerCatalog();
})();
