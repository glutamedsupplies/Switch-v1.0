(() => {
  "use strict";

  const DISMISS_KEY = "switch-seller-flash-campaign-dismissed";
  const REFRESH_MS = 5 * 60 * 1000;
  const ZAP_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15.914 4a1.5 1.5 0 0 0-2.474-1.561l-9 9A1.5 1.5 0 0 0 5.5 14h4.002a.5.5 0 0 1 .471.666L8.086 20a1.5 1.5 0 0 0 2.475 1.56l9-9A1.5 1.5 0 0 0 18.5 10h-3.997a.5.5 0 0 1-.472-.667z"/></svg>';
  const CLOSE_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>';

  const state = {
    campaigns: [],
    activeId: "",
    listings: [],
    rows: {},
    query: "",
    loadingListings: false,
    saving: false,
    refreshTimer: 0,
    bound: false,
  };

  const els = {
    strip: null,
    overlay: null,
    modal: null,
    title: null,
    subtitle: null,
    tabs: null,
    search: null,
    list: null,
    feedback: null,
    footerNote: null,
    saveButton: null,
  };

  function readAdminSession() {
    try {
      const raw = window.localStorage?.getItem("gms-admin-session");
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (_) {
      return null;
    }
  }

  function resolveAdminId() {
    const session = readAdminSession() || {};
    const candidates = [
      session.adminId,
      session.ownerAdminId,
      session.tenantId,
      session.workspaceId,
      session.storeAdminId,
      session.sellerId,
      session.shopId,
      session.id,
      session.accountCode,
    ];
    for (const value of candidates) {
      const normalized = String(value ?? "").trim();
      if (normalized && normalized.toLowerCase() !== "admin") return normalized;
    }
    return "";
  }

  function headers(extra = {}) {
    const session = readAdminSession() || {};
    const adminId = resolveAdminId();
    const sessionToken = String(session.sessionToken || "").trim();
    return {
      Accept: "application/json",
      ...extra,
      ...(adminId ? { "X-GMS-Admin-ID": adminId } : {}),
      ...(sessionToken ? { "X-GMS-Admin-Session": sessionToken } : {}),
    };
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function peso(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return "—";
    return `₱${amount.toLocaleString("en-PH", { maximumFractionDigits: 2 })}`;
  }

  function formatWhen(iso) {
    const date = new Date(String(iso || ""));
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("en-PH", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function discountText(campaign) {
    const value = Number(campaign?.discountValue) || 0;
    const cap = Number(campaign?.maxDiscountAmount) || 0;
    const parts = [];
    if (value > 0) parts.push(`${value}% off${cap > 0 ? ` (up to ${peso(cap)})` : ""}`);
    if (campaign?.freeShipping) parts.push("free shipping");
    return parts.join(" + ");
  }

  function whenText(campaign) {
    if (String(campaign?.status || "") === "active") {
      return `live now until ${formatWhen(campaign.endsAt)}`;
    }
    return `starts ${formatWhen(campaign?.startsAt)}`;
  }

  function readDismissed() {
    try {
      const parsed = JSON.parse(window.localStorage?.getItem(DISMISS_KEY) || "[]");
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch (_) {
      return [];
    }
  }

  function dismissCampaign(id) {
    const next = [...new Set([...readDismissed(), String(id)])].slice(-50);
    try {
      window.localStorage?.setItem(DISMISS_KEY, JSON.stringify(next));
    } catch (_) {
      /* storage full or blocked */
    }
  }

  function ensureStrip() {
    if (els.strip instanceof HTMLElement && els.strip.isConnected) return els.strip;
    const header = document.querySelector(".main-header-container > header.main-header");
    if (!(header instanceof HTMLElement)) return null;
    const strip = document.createElement("div");
    strip.className = "seller-flash-campaign-strip";
    strip.setAttribute("role", "status");
    strip.hidden = true;
    header.insertAdjacentElement("afterend", strip);
    els.strip = strip;
    return strip;
  }

  function renderStrip() {
    const strip = ensureStrip();
    if (!strip) return;
    const dismissed = readDismissed();
    const visible = state.campaigns.filter((campaign) => !dismissed.includes(String(campaign.id)));
    const campaign = visible[0];
    if (!campaign) {
      strip.hidden = true;
      strip.innerHTML = "";
      document.body.classList.remove("has-seller-flash-campaign-strip");
      return;
    }
    const more = visible.length - 1;
    const registered = Number(campaign.registeredCount) || 0;
    const offer = discountText(campaign);
    strip.classList.toggle("is-live", String(campaign.status) === "active");
    strip.innerHTML = `
      <span class="seller-flash-campaign-strip__icon">${ZAP_ICON}</span>
      <p class="seller-flash-campaign-strip__text">
        <strong>${escapeHtml(campaign.name)}</strong>
        <span>${escapeHtml(whenText(campaign))}${offer ? ` · ${escapeHtml(offer)}` : ""}</span>
        ${
          registered
            ? `<span class="seller-flash-campaign-strip__count">${registered} listing${registered === 1 ? "" : "s"} registered</span>`
            : `<span class="seller-flash-campaign-strip__hint">Register your products to join.</span>`
        }
      </p>
      ${
        more > 0
          ? `<button type="button" class="seller-flash-campaign-strip__more" data-seller-flash-campaign-open="${escapeHtml(campaign.id)}">+${more} more</button>`
          : ""
      }
      <button type="button" class="seller-flash-campaign-strip__action" data-seller-flash-campaign-open="${escapeHtml(campaign.id)}">
        ${registered ? "Manage products" : "Register products"}
      </button>
      <button type="button" class="seller-flash-campaign-strip__close" data-seller-flash-campaign-dismiss="${escapeHtml(campaign.id)}" aria-label="Hide this Flash Sale notice" title="Hide">
        ${CLOSE_ICON}
      </button>`;
    strip.hidden = false;
    document.body.classList.add("has-seller-flash-campaign-strip");
  }

  async function loadCampaigns() {
    if (!readAdminSession()) return;
    try {
      const response = await fetch("/api/admin/flash-deal-campaigns", {
        headers: headers(),
        cache: "no-store",
      });
      if (!response.ok) {
        state.campaigns = [];
        renderStrip();
        return;
      }
      const payload = await response.json().catch(() => ({}));
      state.campaigns = Array.isArray(payload?.campaigns)
        ? payload.campaigns.filter((campaign) => campaign && campaign.registrationOpen !== false)
        : [];
      renderStrip();
      if (isModalOpen()) renderTabs();
    } catch (_) {
      /* offline: keep the last strip */
    }
  }

  function ensureModal() {
    if (els.overlay instanceof HTMLElement && els.overlay.isConnected) return;
    const overlay = document.createElement("div");
    overlay.className =
      "validation-modal-overlay super-admin-store-type-modal-overlay seller-flash-campaign-overlay";
    overlay.id = "seller-flash-campaign-modal-overlay";
    overlay.setAttribute("aria-hidden", "true");
    overlay.hidden = true;
    overlay.innerHTML = `
      <section class="validation-modal super-admin-store-type-modal sa-voucher-modal seller-flash-campaign-modal" id="seller-flash-campaign-modal" role="dialog" aria-modal="true" aria-labelledby="seller-flash-campaign-modal-title" tabindex="-1">
        <button type="button" class="product-gallery-modal__close validation-modal__close" data-seller-flash-campaign-close aria-label="Close" title="Close">${CLOSE_ICON}</button>
        <form class="super-admin-store-type-modal__body" id="seller-flash-campaign-modal-form" novalidate>
          <div class="super-admin-store-type-modal__header sa-voucher-modal__topbar">
            <div class="sa-voucher-modal__identity">
              <span class="super-admin-store-type-modal__header-icon" aria-hidden="true">${ZAP_ICON}</span>
              <div>
                <h2 class="validation-modal__title" id="seller-flash-campaign-modal-title">Flash Sale registration</h2>
                <p class="super-admin-store-type-modal__subtitle" data-seller-flash-campaign-subtitle></p>
              </div>
            </div>
          </div>
          <div class="super-admin-store-type-modal__content seller-flash-campaign-modal__content">
            <div class="seller-flash-campaign-modal__tabs" data-seller-flash-campaign-tabs hidden></div>
            <label class="category-add-field seller-flash-campaign-modal__search">
              <span>Your listings</span>
              <input type="search" data-seller-flash-campaign-search placeholder="Search your listings" autocomplete="off" />
            </label>
            <div class="seller-flash-campaign-modal__list" data-seller-flash-campaign-list></div>
            <p class="sa-voucher-modal__feedback" data-seller-flash-campaign-feedback hidden></p>
          </div>
          <footer class="super-admin-store-type-modal__actions sa-voucher-modal__footer">
            <p class="sa-voucher-modal__footer-note" data-seller-flash-campaign-footer-note></p>
            <div class="sa-voucher-modal__footer-actions">
              <button type="button" class="ghost-button" data-seller-flash-campaign-close>Close</button>
              <button type="submit" class="category-add-button" data-seller-flash-campaign-save>
                ${ZAP_ICON}
                <span>Save registration</span>
              </button>
            </div>
          </footer>
        </form>
      </section>`;
    document.body.appendChild(overlay);
    els.overlay = overlay;
    els.modal = overlay.querySelector("#seller-flash-campaign-modal");
    els.title = overlay.querySelector("#seller-flash-campaign-modal-title");
    els.subtitle = overlay.querySelector("[data-seller-flash-campaign-subtitle]");
    els.tabs = overlay.querySelector("[data-seller-flash-campaign-tabs]");
    els.search = overlay.querySelector("[data-seller-flash-campaign-search]");
    els.list = overlay.querySelector("[data-seller-flash-campaign-list]");
    els.feedback = overlay.querySelector("[data-seller-flash-campaign-feedback]");
    els.footerNote = overlay.querySelector("[data-seller-flash-campaign-footer-note]");
    els.saveButton = overlay.querySelector("[data-seller-flash-campaign-save]");
  }

  function isModalOpen() {
    return els.overlay instanceof HTMLElement && !els.overlay.hidden;
  }

  function setFeedback(message, tone = "") {
    if (!(els.feedback instanceof HTMLElement)) return;
    els.feedback.hidden = !message;
    els.feedback.textContent = message || "";
    els.feedback.classList.remove("error", "notice", "success");
    if (message && tone) els.feedback.classList.add(tone);
  }

  function activeCampaign() {
    return state.campaigns.find((campaign) => String(campaign.id) === state.activeId) || null;
  }

  function renderHeader(campaign) {
    if (els.title) els.title.textContent = campaign ? campaign.name : "Flash Sale registration";
    if (els.subtitle) {
      els.subtitle.textContent = campaign
        ? [campaign.schedule || whenText(campaign), discountText(campaign), campaign.fundingText]
            .filter(Boolean)
            .join(" · ")
        : "";
    }
  }

  function renderTabs() {
    if (!(els.tabs instanceof HTMLElement)) return;
    if (state.campaigns.length < 2) {
      els.tabs.hidden = true;
      els.tabs.innerHTML = "";
      return;
    }
    els.tabs.hidden = false;
    els.tabs.innerHTML = state.campaigns
      .map((campaign) => {
        const active = String(campaign.id) === state.activeId;
        return `<button type="button" class="seller-flash-campaign-modal__tab${active ? " is-active" : ""}" data-seller-flash-campaign-tab="${escapeHtml(campaign.id)}" aria-pressed="${active}">
          <strong>${escapeHtml(campaign.name)}</strong>
          <span>${escapeHtml(whenText(campaign))}</span>
        </button>`;
      })
      .join("");
  }

  function selectedRows() {
    return Object.entries(state.rows).filter(([, row]) => row.checked);
  }

  function updateFooter() {
    const count = selectedRows().length;
    if (els.footerNote) {
      els.footerNote.textContent = count
        ? `${count} listing${count === 1 ? "" : "s"} selected. Uncheck a listing to withdraw it.`
        : "Nothing selected. Saving now withdraws all your listings from this sale.";
    }
    if (els.saveButton instanceof HTMLButtonElement) {
      els.saveButton.disabled = state.saving || state.loadingListings || !activeCampaign();
    }
  }

  function listingRowHtml(listing) {
    const row = state.rows[listing.id] || {};
    const blocked = !listing.eligible && !listing.registered;
    const stock = Number(listing.sellableStock) || 0;
    const price =
      listing.campaignPrice != null
        ? `${peso(listing.sellingPrice)} → <strong>${peso(listing.campaignPrice)}</strong>`
        : peso(listing.sellingPrice);
    const thumb = listing.imageUrl
      ? `<img src="${escapeHtml(listing.imageUrl)}" alt="" loading="lazy" />`
      : "";
    const notes = [
      listing.issue ? `<span class="is-issue">${escapeHtml(listing.issue)}</span>` : "",
      listing.sellerDealOverlap && !listing.issue
        ? "<span>Your own Flash Deal pauses while this sale runs.</span>"
        : "",
    ]
      .filter(Boolean)
      .join("");
    return `
      <div class="seller-flash-campaign-row${row.checked ? " is-checked" : ""}${blocked ? " is-blocked" : ""}" data-seller-flash-campaign-row="${escapeHtml(listing.id)}">
        <label class="seller-flash-campaign-row__pick">
          <input type="checkbox" data-seller-flash-campaign-check="${escapeHtml(listing.id)}" ${row.checked ? "checked" : ""} ${blocked ? "disabled" : ""} />
          <span class="seller-flash-campaign-row__thumb">${thumb}</span>
          <span class="seller-flash-campaign-row__copy">
            <strong>${escapeHtml(listing.name)}</strong>
            <span>${price} · ${stock} in stock</span>
            ${notes ? `<span class="seller-flash-campaign-row__notes">${notes}</span>` : ""}
          </span>
        </label>
        <div class="seller-flash-campaign-row__fields">
          <label>
            <span>Deal stock</span>
            <input type="number" min="1" max="${stock || ""}" step="1" inputmode="numeric" placeholder="${stock || "All"}" value="${escapeHtml(row.dealStock || "")}" data-seller-flash-campaign-stock="${escapeHtml(listing.id)}" ${row.checked ? "" : "disabled"} />
          </label>
          <label>
            <span>Limit / buyer</span>
            <input type="number" min="1" step="1" inputmode="numeric" value="${escapeHtml(row.perBuyerLimit || "1")}" data-seller-flash-campaign-limit="${escapeHtml(listing.id)}" ${row.checked ? "" : "disabled"} />
          </label>
        </div>
      </div>`;
  }

  function renderList() {
    if (!(els.list instanceof HTMLElement)) return;
    if (state.loadingListings) {
      els.list.innerHTML = '<p class="seller-flash-campaign-modal__empty">Loading your listings…</p>';
      updateFooter();
      return;
    }
    const query = state.query.trim().toLowerCase();
    const shown = state.listings.filter(
      (listing) =>
        !query ||
        String(listing.name || "").toLowerCase().includes(query) ||
        String(listing.id || "").toLowerCase().includes(query) ||
        String(listing.category || "").toLowerCase().includes(query),
    );
    els.list.innerHTML = shown.length
      ? shown.map(listingRowHtml).join("")
      : `<p class="seller-flash-campaign-modal__empty">${
          state.listings.length ? "No listings match your search." : "You have no listings yet."
        }</p>`;
    updateFooter();
  }

  async function loadListings() {
    const campaign = activeCampaign();
    renderHeader(campaign);
    renderTabs();
    if (!campaign) return;
    state.loadingListings = true;
    state.listings = [];
    state.rows = {};
    setFeedback("");
    renderList();
    const requestedId = state.activeId;
    try {
      const response = await fetch(
        `/api/admin/flash-deal-campaigns/${encodeURIComponent(requestedId)}/products`,
        { headers: headers(), cache: "no-store" },
      );
      const payload = await response.json().catch(() => ({}));
      if (requestedId !== state.activeId) return;
      if (!response.ok) {
        setFeedback(payload?.message || "Unable to load your listings.", "error");
        if (response.status === 404) void loadCampaigns();
        return;
      }
      state.listings = Array.isArray(payload?.listings) ? payload.listings : [];
      for (const listing of state.listings) {
        const settings = listing.settings || {};
        state.rows[listing.id] = {
          checked: Boolean(listing.registered),
          dealStock: settings.dealStock ? String(settings.dealStock) : "",
          perBuyerLimit: String(settings.perBuyerLimit || 1),
        };
      }
      if (payload?.campaign) {
        state.campaigns = state.campaigns.map((entry) =>
          String(entry.id) === String(payload.campaign.id) ? payload.campaign : entry,
        );
        renderHeader(payload.campaign);
      }
    } catch (_) {
      if (requestedId === state.activeId) {
        setFeedback("Unable to load your listings. Check your connection.", "error");
      }
    } finally {
      if (requestedId === state.activeId) {
        state.loadingListings = false;
        renderList();
      }
    }
  }

  function openModal(campaignId) {
    ensureModal();
    state.activeId = String(campaignId || state.campaigns[0]?.id || "");
    state.query = "";
    if (els.search instanceof HTMLInputElement) els.search.value = "";
    els.overlay.hidden = false;
    els.overlay.setAttribute("aria-hidden", "false");
    requestAnimationFrame(() => els.overlay?.classList.add("is-open"));
    els.modal?.focus?.();
    void loadListings();
  }

  function closeModal() {
    if (!isModalOpen()) return;
    els.overlay.classList.remove("is-open");
    els.overlay.setAttribute("aria-hidden", "true");
    window.setTimeout(() => {
      if (els.overlay && !els.overlay.classList.contains("is-open")) els.overlay.hidden = true;
    }, 160);
  }

  async function saveRegistration() {
    const campaign = activeCampaign();
    if (!campaign || state.saving) return;
    const products = [];
    for (const [productId, row] of selectedRows()) {
      const listing = state.listings.find((entry) => entry.id === productId);
      const stock = Number(listing?.sellableStock) || 0;
      const dealStock = row.dealStock === "" ? 0 : Math.floor(Number(row.dealStock));
      const limit = Math.floor(Number(row.perBuyerLimit) || 1);
      if (row.dealStock !== "" && !(dealStock >= 1)) {
        setFeedback(`Deal stock for “${listing?.name || productId}” must be at least 1.`, "error");
        return;
      }
      if (stock && dealStock > stock) {
        setFeedback(`Deal stock for “${listing?.name || productId}” cannot exceed ${stock}.`, "error");
        return;
      }
      if (!(limit >= 1)) {
        setFeedback(`Purchase limit for “${listing?.name || productId}” must be at least 1.`, "error");
        return;
      }
      products.push({ productId, ...(dealStock ? { dealStock } : {}), perBuyerLimit: limit });
    }
    state.saving = true;
    updateFooter();
    setFeedback("");
    try {
      const response = await fetch(
        `/api/admin/flash-deal-campaigns/${encodeURIComponent(campaign.id)}/registration`,
        {
          method: "PUT",
          headers: headers({ "Content-Type": "application/json" }),
          body: JSON.stringify({ products }),
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setFeedback(payload?.message || "Unable to save your registration.", "error");
        return;
      }
      await loadCampaigns();
      await loadListings();
      setFeedback(
        payload?.message ||
          (products.length
            ? `${products.length} listing(s) registered.`
            : "All your listings were withdrawn."),
        "success",
      );
    } catch (_) {
      setFeedback("Unable to save your registration. Check your connection.", "error");
    } finally {
      state.saving = false;
      updateFooter();
    }
  }

  function bind() {
    if (state.bound) return;
    state.bound = true;

    document.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;
      const openButton = target.closest("[data-seller-flash-campaign-open]");
      if (openButton) {
        event.preventDefault();
        openModal(openButton.getAttribute("data-seller-flash-campaign-open"));
        return;
      }
      const dismissButton = target.closest("[data-seller-flash-campaign-dismiss]");
      if (dismissButton) {
        event.preventDefault();
        dismissCampaign(dismissButton.getAttribute("data-seller-flash-campaign-dismiss"));
        renderStrip();
        return;
      }
      if (!isModalOpen()) return;
      if (target.closest("[data-seller-flash-campaign-close]") || target === els.overlay) {
        event.preventDefault();
        closeModal();
        return;
      }
      const tab = target.closest("[data-seller-flash-campaign-tab]");
      if (tab) {
        event.preventDefault();
        const id = tab.getAttribute("data-seller-flash-campaign-tab") || "";
        if (id && id !== state.activeId) {
          state.activeId = id;
          void loadListings();
        }
      }
    });

    document.addEventListener("change", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement) || !isModalOpen()) return;
      const checkId = target.getAttribute("data-seller-flash-campaign-check");
      if (checkId && state.rows[checkId]) {
        state.rows[checkId].checked = target.checked;
        renderList();
      }
    });

    document.addEventListener("input", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement) || !isModalOpen()) return;
      if (target.matches("[data-seller-flash-campaign-search]")) {
        state.query = target.value || "";
        renderList();
        return;
      }
      const stockId = target.getAttribute("data-seller-flash-campaign-stock");
      if (stockId && state.rows[stockId]) {
        state.rows[stockId].dealStock = target.value.trim();
        return;
      }
      const limitId = target.getAttribute("data-seller-flash-campaign-limit");
      if (limitId && state.rows[limitId]) {
        state.rows[limitId].perBuyerLimit = target.value.trim();
      }
    });

    document.addEventListener("submit", (event) => {
      if (event.target instanceof HTMLFormElement && event.target.id === "seller-flash-campaign-modal-form") {
        event.preventDefault();
        void saveRegistration();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && isModalOpen()) {
        event.preventDefault();
        closeModal();
      }
    });

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") void loadCampaigns();
    });
  }

  function init() {
    bind();
    void loadCampaigns();
    window.clearInterval(state.refreshTimer);
    state.refreshTimer = window.setInterval(() => void loadCampaigns(), REFRESH_MS);
  }

  window.SwitchSellerFlashCampaigns = { refresh: loadCampaigns, open: openModal };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
