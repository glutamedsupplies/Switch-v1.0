(() => {
  "use strict";

  if (window.SwitchCompanyReportGateway) {
    return;
  }

  const CATEGORIES = [
    { id: "scam", label: "Scam or fraud by this store" },
    { id: "non_delivery", label: "Paid but the store did not deliver" },
    { id: "impersonation", label: "Fake store or impersonation" },
    { id: "harassment", label: "Harassment or abuse from the store" },
    { id: "off_platform", label: "Pressed to pay or chat off Switch" },
    { id: "other", label: "Other store policy issue" },
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

  function isOwnCompanyTarget(target = {}) {
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
    document.getElementById("switch-company-report-overlay")?.remove();
    document.body.classList.remove("switch-company-report-open");
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
    for (const key of ["companyId", "adminId", "productId"]) {
      const value = String(target[key] || "").trim();
      if (value) {
        params.set(key, value);
      }
    }
    try {
      const response = await fetch(`/api/account/company-reports/eligibility?${params}`, {
        credentials: "same-origin",
        headers: authHeaders(),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return { eligible: false, message: data.message || "Unable to check if you can report this store." };
      }
      return { eligible: data.eligible === true, message: data.message || "" };
    } catch (_) {
      return { eligible: false, message: "Unable to check if you can report this store. Try again." };
    }
  }

  async function openReportSellerModal(target = {}) {
    const companyName = String(target.companyName || "this company").trim() || "this company";
    const session = readBuyerSession();
    if (!session || !(session.accountId || session.id || session.email)) {
      const loginUrl = `/login.html?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
      window.location.assign(loginUrl);
      return;
    }
    if (isOwnCompanyTarget(target)) {
      window.alert("You cannot report your own company.");
      return;
    }
    const eligibility = await checkReportEligibility(target);
    if (!eligibility.eligible) {
      window.alert(eligibility.message || "You can only report a store you have ordered from.");
      return;
    }

    closeModal();
    const overlay = document.createElement("div");
    overlay.id = "switch-company-report-overlay";
    overlay.className = "switch-company-report-overlay";
    overlay.innerHTML = `
      <section class="switch-company-report" role="dialog" aria-modal="true" aria-labelledby="switch-company-report-title">
        <button type="button" class="switch-company-report__close" data-report-close aria-label="Close">×</button>
        <h2 id="switch-company-report-title">Report ${escapeHtml(companyName)}</h2>
        <p class="switch-company-report__lede">
          This report is about the store, not a product. Super Admin will review ${escapeHtml(companyName)}.
          One company report never warns or restricts a store. Use Report this listing for photos, prohibited items, or counterfeit products.
        </p>
        <form data-company-report-form>
          <label class="switch-company-report__label" for="switch-company-report-category">What did this store do?</label>
          <select id="switch-company-report-category" name="reasonCategory" required>
            <option value="">Select a reason</option>
            ${CATEGORIES.map((item) => `<option value="${item.id}">${escapeHtml(item.label)}</option>`).join("")}
          </select>
          <label class="switch-company-report__label" for="switch-company-report-details">Tell Super Admin what happened</label>
          <textarea id="switch-company-report-details" name="reasonText" minlength="20" maxlength="2000" rows="5" required placeholder="Describe the store scam, missing delivery, harassment, or impersonation. Include dates or order details when you can."></textarea>
          <p class="switch-company-report__hint">Minimum 20 characters. Do not include passwords or card numbers. Product photos and fake items belong in Report this listing.</p>
          <p class="switch-company-report__status" data-report-status hidden></p>
          <div class="switch-company-report__actions">
            <button type="button" class="switch-company-report__ghost" data-report-close>Cancel</button>
            <button type="submit" class="switch-company-report__submit">Submit report</button>
          </div>
        </form>
      </section>
    `;
    document.body.append(overlay);
    document.body.classList.add("switch-company-report-open");

    const form = overlay.querySelector("[data-company-report-form]");
    const status = overlay.querySelector("[data-report-status]");
    overlay.querySelectorAll("[data-report-close]").forEach((button) => {
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
        showMessage(status, "Choose a reason and explain what happened in at least 20 characters.", "error");
        return;
      }
      if (submit) {
        submit.disabled = true;
      }
      showMessage(status, "Sending report…", "info");
      try {
        const response = await fetch("/api/account/company-reports", {
          method: "POST",
          credentials: "same-origin",
          headers: authHeaders(),
          body: JSON.stringify({
            companyId: String(target.companyId || "").trim(),
            adminId: String(target.adminId || "").trim(),
            productId: String(target.productId || "").trim(),
            productName: String(target.productName || "").trim(),
            orderId: String(target.orderId || "").trim(),
            reasonCategory,
            reasonText,
          }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.message || "Unable to submit report.");
        }
        const reportId = String(data.reportId || data.report?.reportId || "").trim();
        showMessage(
          status,
          reportId
            ? `${data.message || "Report submitted."} Save this Report ID: ${reportId}.`
            : (data.message || "Report submitted for Super Admin review."),
          "ok",
        );
        window.setTimeout(() => closeModal(), 4200);
      } catch (error) {
        showMessage(status, error instanceof Error ? error.message : "Unable to submit report.", "error");
        if (submit) {
          submit.disabled = false;
        }
      }
    });
  }

  function bindReportButtons(root = document) {
    root.querySelectorAll("[data-report-seller]").forEach((button) => {
      if (!(button instanceof HTMLElement) || button.dataset.reportBound === "1") {
        return;
      }
      button.dataset.reportBound = "1";
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        openReportSellerModal({
          companyId: button.dataset.companyId || "",
          adminId: button.dataset.adminId || "",
          productId: button.dataset.productId || "",
          productName: button.dataset.productName || "",
          companyName: button.dataset.companyName || "",
          orderId: button.dataset.orderId || "",
        });
      });
    });
  }

  window.SwitchCompanyReportGateway = {
    openReportSellerModal,
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
