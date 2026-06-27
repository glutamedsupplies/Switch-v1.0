(function () {
  const employeeSessionKey = "gms-employee-session";
  const faceVerificationContextKey = "gms-face-verification-context";
  const faceVerificationResultKey = "gms-face-verification-result";
  const logoutReportStorageKey = "gms-employee-logout-reports";

  let pendingSignOutUrl = "";
  let pendingSignOutTrigger = null;
  let reportModal = null;

  function clearEmployeeSession() {
    try {
      window.sessionStorage.removeItem(employeeSessionKey);
      window.sessionStorage.removeItem(faceVerificationContextKey);
      window.sessionStorage.removeItem(faceVerificationResultKey);
      window.localStorage.removeItem("gms-admin-id");
    } catch (error) {
      console.warn("Unable to clear employee session.", error);
    }
  }

  function getCurrentEmployeeSession() {
    try {
      const rawValue = window.sessionStorage.getItem(employeeSessionKey);
      return rawValue ? JSON.parse(rawValue) : null;
    } catch (error) {
      console.warn("Unable to read employee session.", error);
      return null;
    }
  }

  function getPageLabel() {
    return (
      document.querySelector(".hero h1")?.textContent ||
      document.title ||
      "Employee workspace"
    ).trim();
  }

  function saveLogoutReport(reportText) {
    const session = getCurrentEmployeeSession();
    const report = {
      report: reportText,
      page: getPageLabel(),
      path: window.location.pathname,
      employeeId: session?.employeeId || session?.id || "",
      employeeName: [session?.firstName, session?.lastName].filter(Boolean).join(" "),
      createdAt: new Date().toISOString(),
    };

    try {
      const currentReports = JSON.parse(
        window.localStorage.getItem(logoutReportStorageKey) || "[]",
      );
      const reports = Array.isArray(currentReports) ? currentReports : [];
      reports.unshift(report);
      window.localStorage.setItem(
        logoutReportStorageKey,
        JSON.stringify(reports.slice(0, 50)),
      );
    } catch (error) {
      console.warn("Unable to save logout report.", error);
    }
  }

  function closeLogoutReportModal() {
    if (!reportModal?.overlay) {
      return;
    }

    reportModal.overlay.classList.remove("is-open");
    window.setTimeout(() => {
      reportModal.overlay.hidden = true;
    }, 180);
    document.body.classList.remove("modal-open");
    pendingSignOutUrl = "";

    if (pendingSignOutTrigger instanceof HTMLElement) {
      pendingSignOutTrigger.focus();
    }
    pendingSignOutTrigger = null;
  }

  function continueSignOut(reportText) {
    const targetUrl = pendingSignOutUrl || "/login.html?role=employee";
    saveLogoutReport(reportText);
    clearEmployeeSession();
    window.location.replace(targetUrl);
  }

  function syncReportActionState() {
    if (!reportModal?.textarea || !reportModal?.submitButton) {
      return;
    }

    const hasReport = reportModal.textarea.value.trim().length > 0;
    reportModal.submitButton.disabled = !hasReport;
    if (reportModal.feedback) {
      reportModal.feedback.textContent = "";
    }
  }

  function createLogoutReportModal() {
    const overlay = document.createElement("div");
    overlay.className = "validation-modal-overlay employee-report-modal-overlay";
    overlay.hidden = true;
    overlay.innerHTML = `
      <section
        class="validation-modal employee-report-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="employee-report-modal-title"
      >
        <button
          type="button"
          class="product-gallery-modal__close validation-modal__close"
          aria-label="Close report"
          title="Close report"
          data-employee-report-close
        >
          <i class="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>
        <div class="validation-modal__top employee-report-modal__top">
          <div class="validation-modal__icon validation-modal__icon--notice employee-report-modal__icon" aria-hidden="true">
            <i class="fa-regular fa-clipboard"></i>
          </div>
        </div>
        <form class="validation-modal__body employee-report-modal__body" data-employee-report-form>
          <h2 class="validation-modal__title" id="employee-report-modal-title">Report Before Logout</h2>
          <label class="employee-report-modal__field">
            <textarea
              data-employee-report-text
              rows="5"
              placeholder="Write your report before logging out..."
              required
            ></textarea>
          </label>
          <p class="employee-report-modal__feedback" data-employee-report-feedback aria-live="polite"></p>
          <div class="validation-modal__actions">
            <button
              type="button"
              class="validation-modal__action-button validation-modal__action-button--secondary"
              data-employee-report-cancel
            >
              Cancel
            </button>
            <button
              type="submit"
              class="validation-modal__action-button"
              data-employee-report-submit
              disabled
            >
              OK
            </button>
          </div>
        </form>
      </section>
    `;

    document.body.appendChild(overlay);

    const form = overlay.querySelector("[data-employee-report-form]");
    const textarea = overlay.querySelector("[data-employee-report-text]");
    const submitButton = overlay.querySelector("[data-employee-report-submit]");
    const feedback = overlay.querySelector("[data-employee-report-feedback]");
    const closeButtons = overlay.querySelectorAll(
      "[data-employee-report-close], [data-employee-report-cancel]",
    );

    reportModal = {
      overlay,
      form,
      textarea,
      submitButton,
      feedback,
    };

    textarea.addEventListener("input", syncReportActionState);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const reportText = textarea.value.trim();
      if (!reportText) {
        syncReportActionState();
        textarea.focus();
        return;
      }

      continueSignOut(reportText);
    });

    closeButtons.forEach((button) => {
      button.addEventListener("click", closeLogoutReportModal);
    });

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        closeLogoutReportModal();
      }
    });

    return reportModal;
  }

  function openLogoutReportModal(targetUrl, trigger) {
    const modal = reportModal || createLogoutReportModal();
    pendingSignOutUrl = targetUrl;
    pendingSignOutTrigger = trigger;
    modal.textarea.value = "";
    syncReportActionState();
    modal.overlay.hidden = false;
    document.body.classList.add("modal-open");
    window.requestAnimationFrame(() => {
      modal.overlay.classList.add("is-open");
      modal.textarea.focus();
    });
  }

  function setWorkspaceMenuOpen(menu, isOpen) {
    const toggle = menu?.querySelector("[data-dashboard-workspace-toggle]");
    const dropdown = menu?.querySelector("[data-dashboard-workspace-dropdown]");
    if (!menu || !toggle || !dropdown) {
      return;
    }

    menu.classList.toggle("is-open", isOpen);
    toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    dropdown.hidden = !isOpen;
  }

  function closeWorkspaceMenus(exceptMenu = null) {
    document.querySelectorAll("[data-dashboard-workspace-menu]").forEach((menu) => {
      if (menu !== exceptMenu) {
        setWorkspaceMenuOpen(menu, false);
      }
    });
  }

  function setupDashboardWorkspaceMenus() {
    if (window.__gmsDashboardWorkspaceMenuSetup) {
      return;
    }
    window.__gmsDashboardWorkspaceMenuSetup = true;

    document.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) {
        return;
      }

      const toggle = target.closest("[data-dashboard-workspace-toggle]");
      if (toggle) {
        event.preventDefault();
        const menu = toggle.closest("[data-dashboard-workspace-menu]");
        if (menu) {
          const isOpen = !menu.classList.contains("is-open");
          closeWorkspaceMenus(menu);
          setWorkspaceMenuOpen(menu, isOpen);
        }
        return;
      }

      if (!target.closest("[data-dashboard-workspace-menu]")) {
        closeWorkspaceMenus();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeWorkspaceMenus();
      }
    });
  }

  setupDashboardWorkspaceMenus();

  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const link = target?.closest("[data-employee-sign-out]");
    if (!link) {
      return;
    }

    event.preventDefault();
    closeWorkspaceMenus();
    openLogoutReportModal(link.href || "/login.html?role=employee", link);
  });
})();
