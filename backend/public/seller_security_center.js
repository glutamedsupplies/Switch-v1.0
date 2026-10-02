(() => {
  const adminSessionKey = "gms-admin-session";

  function readAdminSession() {
    try {
      const raw = window.sessionStorage.getItem(adminSessionKey);
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (_) {
      return null;
    }
  }

  function authHeaders() {
    const session = readAdminSession() || {};
    const token = String(session.sessionToken || "").trim();
    const headers = { Accept: "application/json", "Content-Type": "application/json" };
    if (token) {
      headers["X-Switch-Session"] = token;
      headers["X-GMS-Admin-Session"] = token;
    }
    return headers;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function showStatus(el, message, tone) {
    if (!(el instanceof HTMLElement)) return;
    el.hidden = !message;
    el.textContent = message || "";
    el.dataset.tone = tone || "info";
  }

  function renderList(host, items, emptyCopy, renderItem) {
    if (!(host instanceof HTMLElement)) return;
    host.innerHTML = items.length
      ? items.map(renderItem).join("")
      : `<p class="seller-security__card">${escapeHtml(emptyCopy)}</p>`;
  }

  async function loadCenter() {
    const response = await fetch("/api/seller/buyer-protection/security-center", {
      headers: authHeaders(),
      credentials: "same-origin",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || "Unable to load Security Center.");
    }
    return data;
  }

  function paint(data) {
    const flags = document.querySelector("[data-security-flags]");
    const tickets = document.querySelector("[data-security-tickets]");
    const blocks = document.querySelector("[data-security-blocks]");
    const reviews = document.querySelector("[data-security-reviews]");
    const flagged = Array.isArray(data.flaggedBuyers) ? data.flaggedBuyers : [];
    if (flags) {
      flags.innerHTML = `
        <article class="seller-security__card">
          <strong>${escapeHtml(data.companyName || "This store")}</strong>
          <p>${flagged.length ? "Suspicious buyers were flagged from tickets, repeat returns, or your store block list." : "No automatic buyer flags yet. File a ticket or add a store block if a customer is abusive."}</p>
        </article>
        ${flagged.map((item) => `
          <article class="seller-security__card ${item.risk?.flagged ? "is-flagged" : ""}">
            <strong>${escapeHtml(item.buyerUsername || item.buyerAccountId)}</strong>
            <p>${escapeHtml(item.risk?.reason || "review")} · ${Number(item.risk?.openTicketCount || 0)} tickets · ${Number(item.risk?.returnCount || 0)} returns</p>
          </article>
        `).join("")}
      `;
    }
    renderList(tickets, data.tickets || [], "No Super Admin tickets yet.", (item) => `
      <article class="seller-security__card">
        <strong>${escapeHtml(item.categoryLabel || item.category)}</strong>
        <p>${escapeHtml(item.details || "")}</p>
        <small>${escapeHtml(item.buyerUsername || "Buyer")} · ${escapeHtml(item.status)} · ${escapeHtml(item.orderId || "No order ID")}</small>
      </article>
    `);
    renderList(blocks, data.blocks || [], "No buyers are blocked from this store.", (item) => `
      <article class="seller-security__card">
        <strong>${escapeHtml(item.buyerUsername || item.buyerAccountId)}</strong>
        <p>${escapeHtml(item.reason || "")}</p>
        <button type="button" data-unblock="${escapeHtml(item.buyerAccountId)}">Remove from this store</button>
      </article>
    `);
    renderList(reviews, data.reviewReports || [], "No review reports yet. Report a policy-breaking review from listing insight.", (item) => `
      <article class="seller-security__card">
        <strong>${escapeHtml(item.categoryLabel || item.category)}</strong>
        <p>${escapeHtml(item.reviewExcerpt || item.details || "")}</p>
        <small>${escapeHtml(item.productName || "Listing")} · ${escapeHtml(item.status)}</small>
      </article>
    `);
    blocks?.querySelectorAll("[data-unblock]").forEach((button) => {
      button.addEventListener("click", async () => {
        await fetch(`/api/seller/buyer-protection/blocks/${encodeURIComponent(button.dataset.unblock)}`, {
          method: "DELETE",
          headers: authHeaders(),
          credentials: "same-origin",
        });
        paint(await loadCenter());
      });
    });
  }

  function bindTabs() {
    document.querySelectorAll("[data-security-tab]").forEach((tab) => {
      tab.addEventListener("click", () => {
        const id = tab.dataset.securityTab;
        document.querySelectorAll("[data-security-tab]").forEach((item) => {
          item.classList.toggle("is-active", item === tab);
        });
        document.querySelectorAll("[data-security-panel]").forEach((panel) => {
          const active = panel.dataset.securityPanel === id;
          panel.hidden = !active;
          panel.classList.toggle("is-active", active);
        });
      });
    });
  }

  function bindForms() {
    const ticketForm = document.querySelector("[data-security-ticket-form]");
    const blockForm = document.querySelector("[data-security-block-form]");
    ticketForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const status = document.querySelector("[data-ticket-status]");
      const body = Object.fromEntries(new FormData(ticketForm).entries());
      body.evidenceUrls = String(body.evidenceUrls || "").split(",").map((item) => item.trim()).filter(Boolean);
      try {
        const response = await fetch("/api/seller/buyer-protection/tickets", {
          method: "POST",
          headers: authHeaders(),
          credentials: "same-origin",
          body: JSON.stringify(body),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || "Unable to submit ticket.");
        showStatus(status, data.message, "ok");
        ticketForm.reset();
        paint(await loadCenter());
      } catch (error) {
        showStatus(status, error instanceof Error ? error.message : "Unable to submit ticket.", "error");
      }
    });
    blockForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const status = document.querySelector("[data-block-status]");
      const body = Object.fromEntries(new FormData(blockForm).entries());
      try {
        const response = await fetch("/api/seller/buyer-protection/blocks", {
          method: "POST",
          headers: authHeaders(),
          credentials: "same-origin",
          body: JSON.stringify(body),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || "Unable to block buyer.");
        showStatus(status, data.message, "ok");
        blockForm.reset();
        paint(await loadCenter());
      } catch (error) {
        showStatus(status, error instanceof Error ? error.message : "Unable to block buyer.", "error");
      }
    });
  }

  async function boot() {
    bindTabs();
    bindForms();
    try {
      paint(await loadCenter());
    } catch (error) {
      const flags = document.querySelector("[data-security-flags]");
      if (flags) {
        flags.innerHTML = `<article class="seller-security__card">${escapeHtml(error.message)}</article>`;
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => void boot());
  } else {
    void boot();
  }
})();
