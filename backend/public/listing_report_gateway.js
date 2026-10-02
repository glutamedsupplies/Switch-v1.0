(() => {
  "use strict";

  if (window.SwitchListingReportGateway) {
    return;
  }

  const CATEGORIES = [
    { id: "misleading_listing", label: "Misleading photos or description" },
    { id: "prohibited_item", label: "Prohibited or banned item" },
    { id: "counterfeit", label: "Counterfeit or replica product" },
    { id: "unsafe_product", label: "Unsafe or hazardous product" },
    { id: "intellectual_property", label: "Intellectual property violation" },
    { id: "price_bait", label: "Fake price or bait-and-switch listing" },
    { id: "adult_or_illegal", label: "Adult, illegal, or harmful content" },
    { id: "other_listing", label: "Other listing policy issue" },
  ];

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function readBuyerSession() {
    if (window.SwitchBuyerAuth && typeof window.SwitchBuyerAuth.readBuyerSession === "function") {
      return window.SwitchBuyerAuth.readBuyerSession();
    }
    try {
      const raw = window.localStorage.getItem("gms-buyer-session");
      const session = raw ? JSON.parse(raw) : null;
      return session && typeof session === "object" ? session : null;
    } catch (_) {
      return null;
    }
  }

  function authHeaders() {
    const session = readBuyerSession() || {};
    const token = String(session.sessionToken || session.token || "").trim();
    const headers = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };
    if (token) {
      headers["X-Switch-Session"] = token;
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  }

  function normalizeKey(value) {
    return String(value || "").trim().toLowerCase();
  }

  function collectOwnCompanyKeys(session) {
    const keys = new Set();
    const add = (value) => {
      const key = normalizeKey(value);
      if (key) {
        keys.add(key);
      }
    };
    add(session?.accountId);
    add(session?.id);
    add(session?.email);
    add(session?.activeCompanyId);
    add(session?.companyId);
    const memberships = Array.isArray(session?.companies) ? session.companies : [];
    for (const membership of memberships) {
      const company = membership?.company && typeof membership.company === "object"
        ? membership.company
        : {};
      add(membership?.companyId);
      add(company.id);
      add(company.email);
      add(company.sourceAccountId);
    }
    return keys;
  }

  function isOwnListingTarget(target = {}) {
    const session = readBuyerSession();
    if (!session) {
      return false;
    }
    const own = collectOwnCompanyKeys(session);
    return [
      target.companyId,
      target.adminId,
    ].some((value) => own.has(normalizeKey(value)));
  }

  function closeModal() {
    document.getElementById("switch-listing-report-overlay")?.remove();
    document.body.classList.remove("switch-listing-report-open");
  }

  function showMessage(host, text, tone) {
    if (!(host instanceof HTMLElement)) {
      return;
    }
    host.hidden = !text;
    host.textContent = text || "";
    host.dataset.tone = tone || "info";
  }

  async function checkReportEligibility(target) {
    const params = new URLSearchParams();
    for (const key of ["productId", "companyId", "adminId"]) {
      const value = String(target[key] || "").trim();
      if (value) {
        params.set(key, value);
      }
    }
    try {
      const response = await fetch(`/api/account/listing-reports/eligibility?${params}`, {
        credentials: "same-origin",
        headers: authHeaders(),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return { eligible: false, message: data.message || "Unable to check if you can report this listing." };
      }
      return { eligible: data.eligible === true, message: data.message || "" };
    } catch (_) {
      return { eligible: false, message: "Unable to check if you can report this listing. Try again." };
    }
  }

  async function openReportListingModal(target = {}) {
    const productName = String(target.productName || "this listing").trim() || "this listing";
    const session = readBuyerSession();
    if (!session || !(session.accountId || session.id || session.email)) {
      const loginUrl = `/login.html?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
      window.location.assign(loginUrl);
      return;
    }
    if (!String(target.productId || "").trim()) {
      window.alert("This listing cannot be reported right now.");
      return;
    }
    if (isOwnListingTarget(target)) {
      window.alert("You cannot report your own listing.");
      return;
    }
    const eligibility = await checkReportEligibility(target);
    if (!eligibility.eligible) {
      window.alert(eligibility.message || "You can only report a listing you have ordered.");
      return;
    }

    closeModal();
    const overlay = document.createElement("div");
    overlay.id = "switch-listing-report-overlay";
    overlay.className = "switch-company-report-overlay switch-listing-report-overlay";
    overlay.innerHTML = `
      <section class="switch-company-report" role="dialog" aria-modal="true" aria-labelledby="switch-listing-report-title">
        <button type="button" class="switch-company-report__close" data-listing-report-close aria-label="Close">×</button>
        <h2 id="switch-listing-report-title">Report listing</h2>
        <p class="switch-company-report__lede">
          This report is about <strong>${escapeHtml(productName)}</strong>, not the seller company.
          Super Admin will review the product. One listing report never hides a product by itself.
        </p>
        <form data-listing-report-form>
          <label class="switch-company-report__label" for="switch-listing-report-category">What is wrong with this listing?</label>
          <select id="switch-listing-report-category" name="reasonCategory" required>
            <option value="">Select a listing reason</option>
            ${CATEGORIES.map((item) => `<option value="${item.id}">${escapeHtml(item.label)}</option>`).join("")}
          </select>
          <label class="switch-company-report__label" for="switch-listing-report-details">Tell Super Admin what is wrong with the product</label>
          <textarea id="switch-listing-report-details" name="reasonText" minlength="20" maxlength="2000" rows="5" required placeholder="Describe the misleading photos, prohibited item, counterfeit product, or other listing issue."></textarea>
          <p class="switch-company-report__hint">Minimum 20 characters. Do not include passwords or card numbers. Use Report seller for store behavior such as scams or harassment.</p>
          <p class="switch-company-report__status" data-listing-report-status hidden></p>
          <div class="switch-company-report__actions">
            <button type="button" class="switch-company-report__ghost" data-listing-report-close>Cancel</button>
            <button type="submit" class="switch-company-report__submit">Submit listing report</button>
          </div>
        </form>
      </section>
    `;
    document.body.append(overlay);
    document.body.classList.add("switch-listing-report-open");

    const form = overlay.querySelector("[data-listing-report-form]");
    const status = overlay.querySelector("[data-listing-report-status]");
    overlay.querySelectorAll("[data-listing-report-close]").forEach((button) => {
      button.addEventListener("click", () => closeModal());
    });
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        closeModal();
      }
    });

    form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const submit = form.querySelector(".switch-company-report__submit");
      const reasonCategory = String(form.reasonCategory.value || "").trim();
      const reasonText = String(form.reasonText.value || "").trim();
      if (!reasonCategory || reasonText.length < 20) {
        showMessage(status, "Choose a listing reason and explain what is wrong in at least 20 characters.", "error");
        return;
      }
      if (submit) {
        submit.disabled = true;
      }
      showMessage(status, "Sending listing report…", "info");
      try {
        const response = await fetch("/api/account/listing-reports", {
          method: "POST",
          credentials: "same-origin",
          headers: authHeaders(),
          body: JSON.stringify({
            productId: String(target.productId || "").trim(),
            productName: String(target.productName || "").trim(),
            companyId: String(target.companyId || "").trim(),
            adminId: String(target.adminId || "").trim(),
            orderId: String(target.orderId || "").trim(),
            reasonCategory,
            reasonText,
          }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.message || "Unable to submit listing report.");
        }
        const reportId = String(data.reportId || data.report?.reportId || "").trim();
        showMessage(
          status,
          reportId
            ? `${data.message || "Listing report submitted."} Save this Report ID: ${reportId}.`
            : (data.message || "Listing report submitted for Super Admin review."),
          "ok",
        );
        window.setTimeout(() => closeModal(), 4200);
      } catch (error) {
        showMessage(status, error instanceof Error ? error.message : "Unable to submit listing report.", "error");
        if (submit) {
          submit.disabled = false;
        }
      }
    });
  }

  function bindReportButtons(root = document) {
    root.querySelectorAll("[data-report-listing]").forEach((button) => {
      if (!(button instanceof HTMLElement) || button.dataset.listingReportBound === "1") {
        return;
      }
      button.dataset.listingReportBound = "1";
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        openReportListingModal({
          productId: button.dataset.productId || "",
          productName: button.dataset.productName || "",
          companyId: button.dataset.companyId || "",
          adminId: button.dataset.adminId || "",
          companyName: button.dataset.companyName || "",
          orderId: button.dataset.orderId || "",
        });
      });
    });
  }

  window.SwitchListingReportGateway = {
    openReportListingModal,
    checkReportEligibility,
    bindReportButtons,
    categories: CATEGORIES,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => bindReportButtons());
  } else {
    bindReportButtons();
  }
})();
