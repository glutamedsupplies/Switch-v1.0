(() => {
  "use strict";

  const QUICK_VIEW_STORAGE_KEY = "switch.superAdmin.flashDeals.quickView";
  const QUICK_VIEW_STATUSES = Object.freeze({
    all: "",
    platform: "platform",
    seller: "seller",
    upcoming: "upcoming",
    live: "live",
    ended: "ended",
    cancelled: "cancelled",
    rejected: "rejected",
  });
  const PANEL_FILTER_KEYS = Object.freeze(["schedule", "stock", "funding", "sort"]);

  function normalizeQuickView(value) {
    const key = String(value || "").trim().toLowerCase();
    return Object.prototype.hasOwnProperty.call(QUICK_VIEW_STATUSES, key)
      ? key
      : "all";
  }

  function getSavedQuickView() {
    try {
      return normalizeQuickView(window.sessionStorage.getItem(QUICK_VIEW_STORAGE_KEY));
    } catch (_error) {
      return "all";
    }
  }

  function saveQuickView(value) {
    try {
      window.sessionStorage.setItem(
        QUICK_VIEW_STORAGE_KEY,
        normalizeQuickView(value),
      );
    } catch (_error) {
      // Storage can be unavailable in private or restricted browser contexts.
    }
  }

  const els = {
    list: null,
    total: null,
    pendingBadge: null,
    feedback: null,
    searchInput: null,
    filterToggle: null,
    filterPanel: null,
    filterSummary: null,
    filterApply: null,
    filterClear: null,
    addButton: null,
    modalOverlay: null,
    modal: null,
    form: null,
    closeButton: null,
    cancelButton: null,
    nextButton: null,
    backButton: null,
    submitButton: null,
    modalFeedback: null,
    footerNote: null,
    campaignNameInput: null,
    displayLabelInput: null,
    maxDiscountInput: null,
    fundingInput: null,
    fundingHelper: null,
    shareField: null,
    shareInput: null,
    budgetField: null,
    budgetInput: null,
    priorityInput: null,
    notesInput: null,
    review: null,
    draftButton: null,
    modalTitle: null,
    submitLabel: null,
    priceInput: null,
    startDatePicker: null,
    startDateInput: null,
    startTimePicker: null,
    startTimeInput: null,
    endDatePicker: null,
    endDateInput: null,
    endTimePicker: null,
    endTimeInput: null,
  };

  const state = {
    items: [],
    campaigns: [],
    freeShipping: false,
    filters: {
      search: "",
      status: statusForQuickView(getSavedQuickView()),
      schedule: "",
      stock: "",
      funding: "",
      sort: "",
    },
    quickView: getSavedQuickView(),
    loading: false,
    requestSeq: 0,
    bound: false,
    searchTimer: 0,
    page: 1,
    pageSize: 10,
    modalStep: 1,
    clockTimer: 0,
    saving: false,
    pickersBound: false,
    closeTimer: 0,
    modalTrigger: null,
    editMode: "create",
    editingId: "",
    editingStatus: "",
    editingPlatformCount: 0,
    campaignDetails: {},
    registeredDrawerCampaignId: "",
    registeredDrawerPlatformId: "",
    registeredExpanded: new Set(),
    registeredSearch: "",
    platforms: [],
    storeTypes: [],
    targetingPromise: null,
    campaignPlatforms: { all: false, ids: new Set() },
    businessTypes: new Set(),
    businessTypeKnown: new Set(),
    businessTypeHydrate: null,
    businessTypeSearch: "",
  };

  function refreshElements() {
    els.list = document.querySelector("[data-super-admin-flash-deals-list]");
    els.total = document.querySelector("[data-super-admin-flash-deals-total]");
    els.pendingBadge = document.querySelector(
      "[data-super-admin-flash-deal-pending-count]",
    );
    els.feedback = document.querySelector(
      "[data-super-admin-flash-deals-feedback]",
    );
    els.searchInput = document.querySelector(
      "[data-super-admin-flash-deals-search]",
    );
    els.filterToggle = document.querySelector(
      "[data-super-admin-flash-deals-filter-toggle]",
    );
    els.filterPanel = document.querySelector(
      "[data-super-admin-flash-deals-filter-panel]",
    );
    els.filterSummary = document.querySelector(
      "[data-super-admin-flash-deals-filter-summary]",
    );
    els.filterApply = document.querySelector(
      "[data-super-admin-flash-deals-filter-apply]",
    );
    els.filterClear = document.querySelector(
      "[data-super-admin-flash-deals-filter-clear]",
    );
    els.pager = document.querySelector("[data-super-admin-flash-deals-gmail-pager]");
    els.pageMeta = document.querySelector("[data-super-admin-flash-deals-page-meta]");
    els.pagination = document.querySelector("[data-super-admin-flash-deals-pagination]");
    els.addButton = document.querySelector("[data-super-admin-flash-deal-add]");
    els.modalOverlay = document.getElementById("flash-deal-modal-overlay");
    els.modal = document.getElementById("flash-deal-modal");
    els.form = document.getElementById("flash-deal-modal-form");
    els.closeButton = document.getElementById("flash-deal-modal-close-button");
    els.cancelButton = document.getElementById("flash-deal-modal-cancel-button");
    els.nextButton = document.getElementById("flash-deal-modal-next-button");
    els.backButton = document.getElementById("flash-deal-modal-back-button");
    els.submitButton = document.getElementById("flash-deal-modal-submit-button");
    els.modalFeedback = document.querySelector("[data-flash-deal-modal-feedback]");
    els.footerNote = document.querySelector("[data-flash-deal-footer-note]");
    els.campaignNameInput = document.getElementById("flash-deal-campaign-name");
    els.displayLabelInput = document.getElementById("flash-deal-display-label");
    els.maxDiscountInput = document.getElementById("flash-deal-max-discount-input");
    els.fundingInput = document.getElementById("flash-deal-funding-input");
    els.fundingHelper = document.querySelector("[data-flash-deal-funding-helper]");
    els.shareField = document.querySelector("[data-flash-deal-share-field]");
    els.shareInput = document.getElementById("flash-deal-share-input");
    els.budgetField = document.querySelector("[data-flash-deal-budget-field]");
    els.budgetInput = document.getElementById("flash-deal-budget-input");
    els.priorityInput = document.getElementById("flash-deal-priority-input");
    els.notesInput = document.getElementById("flash-deal-notes-input");
    els.review = document.querySelector("[data-flash-deal-review]");
    els.draftButton = document.getElementById("flash-deal-modal-draft-button");
    els.modalTitle = document.getElementById("flash-deal-modal-title");
    els.submitLabel = document.querySelector("[data-flash-deal-submit-label]");
    els.priceInput = document.getElementById("flash-deal-price-input");
    els.startDatePicker = document.getElementById("flash-deal-start-date-picker");
    els.startDateInput = document.getElementById("flash-deal-start-date-input");
    els.startTimePicker = document.getElementById("flash-deal-start-time-picker");
    els.startTimeInput = document.getElementById("flash-deal-start-time-input");
    els.endDatePicker = document.getElementById("flash-deal-end-date-picker");
    els.endDateInput = document.getElementById("flash-deal-end-date-input");
    els.endTimePicker = document.getElementById("flash-deal-end-time-picker");
    els.endTimeInput = document.getElementById("flash-deal-end-time-input");
    els.platformToggle = document.getElementById("flash-deal-platform-toggle");
    els.platformMenu = document.getElementById("flash-deal-platform-menu");
    els.platformLabel = document.querySelector("[data-flash-deal-platform-label]");
    els.btPicker = document.querySelector("[data-flash-deal-bt-picker]");
    els.btSelected = document.querySelector("[data-flash-deal-business-types]");
    els.btSearch = document.getElementById("flash-deal-bt-search");
    els.btCount = document.querySelector("[data-flash-deal-bt-count]");
    els.btList = document.querySelector("[data-flash-deal-bt-list]");
    els.btAll = document.querySelector("[data-flash-deal-bt-all]");
    els.btHelper = document.querySelector("[data-flash-deal-bt-helper]");
  }

  function headers(extra = {}) {
    let token = "";
    try {
      const raw =
        sessionStorage.getItem("gms-super-admin-session") ||
        localStorage.getItem("gms-super-admin-session");
      const session = raw ? JSON.parse(raw) : null;
      token = String(session?.token || "").trim();
    } catch (_) {
      token = "";
    }
    return {
      Accept: "application/json",
      ...extra,
      ...(token ? { "X-GMS-Super-Admin-Token": token } : {}),
    };
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  const COPY_ICON_MARKUP = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect>
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
    </svg>
  `;

  function uniqueIdSettingHtml(value, label) {
    const normalized = String(value || "").trim();
    if (!normalized) {
      return `
        <span class="business-type-showcase__setting sa-flash-showcase__setting sa-flash-showcase__setting--id">
          <span class="business-type-showcase__setting-label">${escapeHtml(label)}</span>
          <span class="business-type-showcase__setting-value">
            <span class="platform-feedback-list-row__feedback-id-copy super-admin-company-copy-field">
              <span class="super-admin-company-copy-field__text">—</span>
            </span>
          </span>
        </span>
      `;
    }
    return `
      <span class="business-type-showcase__setting sa-flash-showcase__setting sa-flash-showcase__setting--id">
        <span class="business-type-showcase__setting-label">${escapeHtml(label)}</span>
        <span class="business-type-showcase__setting-value">
          <span class="platform-feedback-list-row__feedback-id-copy super-admin-company-copy-field">
            <span class="super-admin-company-copy-field__text">${escapeHtml(normalized)}</span>
            <button
              type="button"
              class="super-admin-company-copy-button"
              data-company-contact-copy="${escapeHtml(normalized)}"
              data-company-contact-label="${escapeHtml(label)}"
              aria-label="Copy ${escapeHtml(label.toLowerCase())}"
              title="Copy ${escapeHtml(label.toLowerCase())}"
            >${COPY_ICON_MARKUP}</button>
          </span>
        </span>
      </span>
    `;
  }

  function formatMoney(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return "—";
    return `\u20b1${num.toLocaleString("en-PH", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  }

  function formatWhen(value) {
    const date = new Date(String(value || ""));
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }

  function padClock(value) {
    return String(Math.max(0, Math.floor(Number(value) || 0))).padStart(2, "0");
  }

  function countdownParts(targetMs) {
    const totalSec = Math.floor(Math.max(0, Number(targetMs) - Date.now()) / 1000);
    return {
      days: Math.floor(totalSec / 86400),
      hours: Math.floor((totalSec % 86400) / 3600),
      minutes: Math.floor((totalSec % 3600) / 60),
      seconds: totalSec % 60,
    };
  }

  function flashClockPhase(status, startMs, endMs) {
    if (status === "cancelled" || status === "rejected") return status;
    if (status === "ended" || status === "budget_exhausted") return "ended";
    if (!endMs) return "unlimited";
    const now = Date.now();
    if (startMs && now < startMs) return "upcoming";
    if (endMs && now < endMs) return "live";
    return "ended";
  }

  const FLASH_CLOCK_COPY = {
    unlimited: { title: "Unlimited", kicker: "Does not expire" },
    upcoming: { title: "Coming soon", kicker: "Starts in" },
    live: { title: "Live now", kicker: "Ends in" },
    ended: { title: "Ended", kicker: "Deal ended" },
    cancelled: { title: "Cancelled", kicker: "Deal cancelled" },
    rejected: { title: "Rejected", kicker: "Deal rejected" },
  };

  function flashClockUnitHtml(key, value, label) {
    const digits = padClock(value);
    return `
      <div class="sa-voucher-promo__unit">
        <strong class="sa-voucher-promo__digits sa-flip-tile" data-flash-cd="${key}" data-cd-current="${digits}"><span class="sa-flip-tile__flap is-top" data-cd-top><span>${digits}</span></span><span class="sa-flip-tile__flap is-bottom" data-cd-bottom aria-hidden="true"><span>${digits}</span></span></strong>
        <span>${label}</span>
      </div>`;
  }

  function flashClockHtml(deal, status, subject = "Flash Deal") {
    const startMs = Date.parse(deal?.startsAt) || 0;
    const endMs = Date.parse(deal?.endsAt) || 0;
    const phase = flashClockPhase(status, startMs, endMs);
    const copy = FLASH_CLOCK_COPY[phase];
    const parts = countdownParts(phase === "upcoming" ? startMs : phase === "live" ? endMs : 0);
    const startLabel = formatWhen(deal?.startsAt);
    const endLabel = endMs ? formatWhen(deal?.endsAt) : "Unlimited";
    return `
      <div class="sa-voucher-promo__clock sa-flash-clock is-${phase}" data-flash-clock data-sa-motion data-flash-status="${escapeHtml(status)}" data-flash-start="${startMs}" data-flash-end="${endMs}" aria-label="${escapeHtml(phase === "unlimited" ? `Unlimited ${subject}` : `${subject} schedule`)}">
        <div class="sa-voucher-promo__cal-head">
          <span class="sa-voucher-promo__cal-rings" aria-hidden="true"><i></i><i></i></span>
          <strong data-flash-clock-title>${copy.title}</strong>
        </div>
        <p class="sa-voucher-promo__cal-kicker"><span data-flash-clock-kicker>${copy.kicker}</span></p>
        <div class="sa-voucher-promo__cal-units">
          ${flashClockUnitHtml("days", parts.days, "Days")}
          ${flashClockUnitHtml("hours", parts.hours, "Hrs")}
          ${flashClockUnitHtml("minutes", parts.minutes, "Min")}
          ${flashClockUnitHtml("seconds", parts.seconds, "Sec")}
        </div>
        <div class="sa-voucher-promo__cal-schedule">
          <span class="sa-voucher-promo__cal-date">
            <span class="sa-voucher-promo__cal-date-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
            </span>
            <span class="sa-voucher-promo__cal-date-copy"><strong title="${escapeHtml(startLabel)}">${escapeHtml(startLabel)}</strong><span>Starts</span></span>
          </span>
          <span class="sa-voucher-promo__cal-date">
            <span class="sa-voucher-promo__cal-date-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4M16 2v4M3 10h18"/><rect x="3" y="4" width="18" height="18" rx="2"/></svg>
            </span>
            <span class="sa-voucher-promo__cal-date-copy"><strong title="${escapeHtml(endLabel)}">${escapeHtml(endLabel)}</strong><span>Ends</span></span>
          </span>
        </div>
      </div>`;
  }

  function createClockFlap(position, text) {
    const flap = document.createElement("span");
    flap.className = `sa-flip-tile__flap ${position} is-flipping`;
    flap.setAttribute("aria-hidden", "true");
    const face = document.createElement("span");
    face.textContent = text;
    flap.appendChild(face);
    return flap;
  }

  function setClockDigit(node, value, animate = true) {
    const next = padClock(value);
    const topFace = node.querySelector("[data-cd-top] > span");
    const bottomFace = node.querySelector("[data-cd-bottom] > span");
    if (!(topFace instanceof HTMLElement) || !(bottomFace instanceof HTMLElement)) return;
    const prev = node.getAttribute("data-cd-current") || topFace.textContent || next;
    if (prev === next) return;
    node.setAttribute("data-cd-current", next);
    node.querySelectorAll(".sa-flip-tile__flap.is-flipping").forEach((flap) => flap.remove());
    node.classList.remove("is-flipping");
    topFace.textContent = next;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
    if (!animate || reduceMotion) {
      bottomFace.textContent = next;
      return;
    }
    bottomFace.textContent = prev;
    const fallingTop = createClockFlap("is-top", prev);
    const landingBottom = createClockFlap("is-bottom", next);
    node.append(fallingTop, landingBottom);
    void node.offsetWidth;
    node.classList.add("is-flipping");
    let finished = false;
    const finishFlip = () => {
      if (finished) return;
      finished = true;
      fallingTop.remove();
      landingBottom.remove();
      if (node.getAttribute("data-cd-current") !== next) return;
      bottomFace.textContent = next;
      node.classList.remove("is-flipping");
    };
    landingBottom.addEventListener("animationend", finishFlip, { once: true });
    window.setTimeout(finishFlip, 900);
  }

  function updateFlashClock(clock, animate = true) {
    const status = clock.getAttribute("data-flash-status") || "";
    const startMs = Number(clock.getAttribute("data-flash-start")) || 0;
    const endMs = Number(clock.getAttribute("data-flash-end")) || 0;
    const phase = flashClockPhase(status, startMs, endMs);
    const copy = FLASH_CLOCK_COPY[phase];
    Object.keys(FLASH_CLOCK_COPY).forEach((key) => {
      clock.classList.toggle(`is-${key}`, key === phase);
    });
    const title = clock.querySelector("[data-flash-clock-title]");
    if (title && title.textContent !== copy.title) title.textContent = copy.title;
    const kicker = clock.querySelector("[data-flash-clock-kicker]");
    if (kicker && kicker.textContent !== copy.kicker) kicker.textContent = copy.kicker;
    const parts = countdownParts(phase === "upcoming" ? startMs : phase === "live" ? endMs : 0);
    clock.querySelectorAll("[data-flash-cd]").forEach((node) => {
      const key = node.getAttribute("data-flash-cd");
      if (key in parts) setClockDigit(node, parts[key], animate);
    });
  }

  const flashClockVisibility = new WeakMap();
  const observedFlashClocks = new Set();
  let flashClockObserver = null;

  function isFlashClockVisible(clock) {
    if (typeof IntersectionObserver === "undefined") return true;
    if (!flashClockObserver) {
      flashClockObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          const wasVisible = flashClockVisibility.get(entry.target) === true;
          flashClockVisibility.set(entry.target, entry.isIntersecting);
          if (entry.isIntersecting && !wasVisible) updateFlashClock(entry.target, false);
        });
      }, { rootMargin: "200px 0px" });
    }
    if (!observedFlashClocks.has(clock)) {
      observedFlashClocks.add(clock);
      flashClockVisibility.set(clock, false);
      flashClockObserver.observe(clock);
    }
    return flashClockVisibility.get(clock) === true;
  }

  const FLASH_COVERING_OVERLAY_SELECTOR = [
    "[data-flash-registered-drawer]:not([hidden])",
    ".super-admin-integrated-drawer:not([hidden])",
    ".super-admin-company-drawer.is-open",
    ".super-admin-product-detail-modal-overlay.is-open",
  ].join(",");

  /** Decorative motion pauses while a drawer or modal covers the page. */
  function isFlashPageCovered() {
    return (
      Boolean(state.registeredDrawerCampaignId) ||
      document.documentElement.classList.contains("sa-page-scroll-locked") ||
      Boolean(document.querySelector(FLASH_COVERING_OVERLAY_SELECTOR))
    );
  }

  function tickFlashClocks() {
    observedFlashClocks.forEach((clock) => {
      if (clock.isConnected) return;
      flashClockObserver?.unobserve(clock);
      observedFlashClocks.delete(clock);
    });
    if (document.hidden || isFlashPageCovered()) return;
    const clocks = document.querySelectorAll("[data-flash-clock]");
    if (!clocks.length) return;
    clocks.forEach((clock) => {
      if (isFlashClockVisible(clock)) updateFlashClock(clock);
    });
  }

  function startFlashClocks() {
    if (state.clockTimer) return;
    state.clockTimer = window.setInterval(tickFlashClocks, 1000);
  }

  function lucideIconSvg(name, inner) {
    const iconName = String(name || "").trim();
    return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-${iconName}-icon lucide-${iconName}" aria-hidden="true">${inner}</svg>`;
  }

  function lucideZapSvg() {
    return (
      window.SwitchDefaultIcons?.svg?.("zap", {
        size: 24,
        className: "lucide lucide-zap-icon lucide-zap",
      }) ||
      lucideIconSvg(
        "zap",
        '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
      )
    );
  }

  function defaultCompanyProfileSvg() {
    return lucideIconSvg(
      "building-2",
      '<path d="M10 12h4"></path><path d="M10 8h4"></path><path d="M14 21v-3a2 2 0 0 0-4 0v3"></path><path d="M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2"></path><path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"></path>',
    );
  }

  function lucideDollarSignSvg() {
    return lucideIconSvg(
      "zap",
      '<path d="M15.914 4a1.5 1.5 0 00-2.474-1.561l-9 9A1.5 1.5 0 005.5 14h4.002a.5.5 0 01.471.666L8.086 20a1.5 1.5 0 002.475 1.56l9-9A1.5 1.5 0 0018.5 10h-3.997a.5.5 0 01-.472-.667z"/>',
    );
  }

  function lucidePackageSvg() {
    return lucideIconSvg(
      "box",
      '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
    );
  }

  const CAMPAIGN_STAT_ICONS = Object.freeze({
    discount: lucideIconSvg(
      "badge-percent",
      '<path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="m15 9-6 6"/><path d="M9 9h.01"/><path d="M15 15h.01"/>',
    ),
    registered: lucideIconSvg(
      "clipboard-list",
      '<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>',
    ),
    sellers: lucideIconSvg(
      "store",
      '<path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7"/>',
    ),
    sold: lucideIconSvg(
      "shopping-bag",
      '<path d="M16 10a4 4 0 0 1-8 0"/><path d="M3.103 6.034h17.794"/><path d="M3.4 5.467a2 2 0 0 0-.4 1.2V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.667a2 2 0 0 0-.4-1.2l-2-2.667A2 2 0 0 0 17 2H7a2 2 0 0 0-1.6.8z"/>',
    ),
    revenue: lucideIconSvg(
      "banknote",
      '<rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>',
    ),
    subsidy: lucideIconSvg(
      "hand-coins",
      '<path d="M11 15h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 17"/><path d="m7 21 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9"/><path d="m2 16 6 6"/><circle cx="16" cy="9" r="2.9"/><circle cx="6" cy="5" r="3"/>',
    ),
  });

  function lucideShoppingCartSvg() {
    return lucideIconSvg(
      "shopping-cart",
      '<path d="m2.05 2.05 1.099-.028a1 1 0 0 1 1.008.815l2.69 14.347A1 1 0 0 0 7.83 18H18"/><path d="M4.563 5h16.435a1 1 0 0 1 .981 1.204l-1.026 6.226A2 2 0 0 1 18.962 14H6.25"/><circle cx="18" cy="20" r="2"/><circle cx="8" cy="20" r="2"/>',
    );
  }

  function platformLabel(platformId) {
    const id = String(platformId || "").trim();
    if (!id) return "—";
    return id.toUpperCase();
  }

  const FALLBACK_PLATFORMS = [
    { id: "shop", name: "Shop", status: "active", primaryColor: "#0891b2" },
    { id: "food", name: "Food", status: "active", primaryColor: "#ea580c" },
    { id: "hotels", name: "Hotel", status: "active", primaryColor: "#7c3aed" },
    { id: "resort", name: "Resort", status: "active", primaryColor: "#0891b2" },
    { id: "groceries", name: "Groceries", status: "active", primaryColor: "#16a34a" },
  ];
  const DEFAULT_PLATFORM_COLORS = Object.freeze({
    shop: "#0891b2",
    food: "#ea580c",
    hotels: "#7c3aed",
    resort: "#0891b2",
    groceries: "#16a34a",
  });

  function normalizePlatformId(value) {
    return String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "")
      .slice(0, 40);
  }

  function normalizeHexColor(value, fallback = "") {
    const raw = String(value || "").trim().toLowerCase();
    if (/^#[0-9a-f]{6}$/.test(raw)) return raw;
    if (/^[0-9a-f]{6}$/.test(raw)) return `#${raw}`;
    return fallback;
  }

  function platformList() {
    return state.platforms.length ? state.platforms : FALLBACK_PLATFORMS;
  }

  function campaignPlatformName(platformId) {
    const id = normalizePlatformId(platformId);
    const match = platformList().find((entry) => entry.id === id);
    if (match?.name) return match.name;
    return id ? id.charAt(0).toUpperCase() + id.slice(1) : "";
  }

  function platformPrimaryColor(platformId) {
    const id = normalizePlatformId(platformId);
    const match = platformList().find((entry) => entry.id === id);
    return normalizeHexColor(match?.primaryColor) || DEFAULT_PLATFORM_COLORS[id] || "";
  }

  function campaignPlatformIds(campaign) {
    return (Array.isArray(campaign?.platformIds) ? campaign.platformIds : [])
      .map(normalizePlatformId)
      .filter((id) => id && id !== "all");
  }

  /** One card per targeted platform; "All platforms" fans out to every active platform. */
  function campaignCardPlatformIds(campaign) {
    const ids = campaignPlatformIds(campaign);
    if (ids.length) return ids;
    const active = platformList()
      .filter((entry) => String(entry.status || "active").toLowerCase() === "active")
      .map((entry) => entry.id);
    return active.length ? active : ["shop"];
  }

  function listingPlatformId(listing) {
    return normalizePlatformId(listing?.sellerPlatformId || listing?.platformId) || "shop";
  }

  function namesSummary(names) {
    return names.length > 2
      ? `${names.slice(0, 2).join(", ")} +${names.length - 2}`
      : names.join(", ");
  }

  function campaignPlatformsLabel(campaign) {
    const ids = campaignPlatformIds(campaign);
    return ids.length ? namesSummary(ids.map(campaignPlatformName)) : "All platforms";
  }

  function campaignBusinessTypesLabel(campaign) {
    const ids = Array.isArray(campaign?.businessTypeIds) ? campaign.businessTypeIds : [];
    if (!ids.length) return "All business types";
    const names = ids.map((id) => {
      const key = String(id || "").trim().toLowerCase();
      const match = state.storeTypes.find(
        (type) => String(type.id || type.name || "").trim().toLowerCase() === key,
      );
      return String(match?.name || id || "").trim();
    });
    return namesSummary(names.filter(Boolean));
  }

  function platformAccentStyle(platformId) {
    const color = platformId ? platformPrimaryColor(platformId) : "";
    const match = normalizeHexColor(color).match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/);
    if (!match) return "";
    const [r, g, b] = match.slice(1).map((part) => Number.parseInt(part, 16));
    const shade = (factor) =>
      `rgb(${Math.round(r * factor)}, ${Math.round(g * factor)}, ${Math.round(b * factor)})`;
    const tint = (weight) =>
      `rgb(${Math.round(r + (255 - r) * weight)}, ${Math.round(g + (255 - g) * weight)}, ${Math.round(b + (255 - b) * weight)})`;
    const accent = `rgb(${r}, ${g}, ${b})`;
    const strong = shade(0.82);
    const contrast = (r * 299 + g * 587 + b * 114) / 1000 >= 160 ? "#111827" : "#ffffff";
    return [
      `--accent:${accent}`,
      `--accent-rgb:${r}, ${g}, ${b}`,
      `--accent-strong:${strong}`,
      `--accent-text:${strong}`,
      `--accent-muted:${tint(0.92)}`,
      `--accent-soft:${tint(0.82)}`,
      `--accent-contrast:${contrast}`,
      `--accent-button-bg:${accent}`,
      `--accent-button-gradient-bg:linear-gradient(145deg, ${accent}, ${strong})`,
      `--md-accent:${accent}`,
    ].join(";");
  }

  function applyPlatforms(list) {
    const next = (Array.isArray(list) ? list : [])
      .map((entry) => {
        const id = normalizePlatformId(entry?.id || entry?.platformId);
        if (!id || id === "all") return null;
        return {
          id,
          name: String(entry?.name || "").trim() || campaignPlatformName(id),
          status: String(entry?.status || "active").trim().toLowerCase() || "active",
          sortOrder: Number(entry?.sortOrder) || 0,
          primaryColor: normalizeHexColor(
            entry?.primaryColor || entry?.color || entry?.accentColor,
            DEFAULT_PLATFORM_COLORS[id] || "#0891b2",
          ),
        };
      })
      .filter(Boolean)
      .sort(
        (left, right) =>
          left.sortOrder - right.sortOrder ||
          left.name.localeCompare(right.name, undefined, { sensitivity: "base" }),
      );
    if (next.length) state.platforms = next;
    return next.length > 0;
  }

  function loadCampaignTargeting({ force = false } = {}) {
    if (state.targetingPromise && !force) return state.targetingPromise;
    const getJson = (url, init) =>
      fetch(url, { cache: "no-store", ...init }).then((response) =>
        response.ok ? response.json().catch(() => ({})) : {},
      );
    state.targetingPromise = Promise.allSettled([
      getJson("/api/platforms", { headers: { Accept: "application/json" } }),
      getJson("/api/super-admin/store-types", { headers: headers() }),
    ]).then(([platformsResult, typesResult]) => {
      if (platformsResult.status === "fulfilled") {
        applyPlatforms(platformsResult.value?.platforms);
      }
      const types =
        typesResult.status === "fulfilled" ? typesResult.value?.storeTypeDetails : null;
      if (Array.isArray(types)) {
        state.storeTypes = types.filter((entry) => entry && typeof entry === "object");
      } else {
        state.targetingPromise = null;
      }
    });
    return state.targetingPromise;
  }

  function displayStatus(deal) {
    const approval = String(deal?.approvalStatus || "").trim().toLowerCase();
    const status = String(deal?.displayStatus || deal?.status || "")
      .trim()
      .toLowerCase();
    if (approval === "rejected" || status === "rejected") return "rejected";
    if (status === "cancelled") return "cancelled";
    if (status === "live") return "live";
    if (status === "ended") return "ended";
    if (status === "upcoming") return "upcoming";
    if (status === "pending") return "upcoming";
    return status || "upcoming";
  }

  function statusLabel(status) {
    switch (status) {
      case "upcoming":
        return "Upcoming";
      case "live":
        return "Live";
      case "ended":
        return "Ended";
      case "rejected":
        return "Rejected";
      case "cancelled":
        return "Cancelled";
      default:
        return status || "—";
    }
  }

  function setFeedback(message, tone = "") {
    refreshElements();
    if (!(els.feedback instanceof HTMLElement)) return;
    const text = String(message || "").trim();
    if (!text) {
      els.feedback.hidden = true;
      els.feedback.textContent = "";
      els.feedback.removeAttribute("data-tone");
      return;
    }
    els.feedback.hidden = false;
    els.feedback.textContent = text;
    if (tone) {
      els.feedback.setAttribute("data-tone", tone);
    } else {
      els.feedback.removeAttribute("data-tone");
    }
  }

  function renderHeaderFilterSummary() {
    refreshElements();
    if (!(els.filterSummary instanceof HTMLElement)) return;
    const activeCount = PANEL_FILTER_KEYS.filter((key) => state.filters[key]).length;
    els.filterSummary.textContent = activeCount > 0 ? `${activeCount} active` : "All";
  }

  function statusForQuickView(quickView) {
    const normalized = normalizeQuickView(quickView);
    return normalized === "platform" || normalized === "seller" || normalized === "all"
      ? ""
      : QUICK_VIEW_STATUSES[normalized];
  }

  function syncQuickViewNav({ persist = false } = {}) {
    const activeQuickView = normalizeQuickView(state.quickView);
    state.quickView = activeQuickView;
    document
      .querySelectorAll("[data-super-admin-flash-deal-quick-view]")
      .forEach((button) => {
        const isActive =
          normalizeQuickView(
            button.getAttribute("data-super-admin-flash-deal-quick-view"),
          ) === activeQuickView;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
      });
    if (persist) saveQuickView(activeQuickView);
  }

  function syncPanelFilterControls() {
    for (const key of PANEL_FILTER_KEYS) {
      const activeValue = String(state.filters[key] || "").trim().toLowerCase();
      document
        .querySelectorAll(`input[data-super-admin-flash-deals-filter="${key}"]`)
        .forEach((input) => {
          if (input instanceof HTMLInputElement) {
            input.checked = String(input.value || "").trim().toLowerCase() === activeValue;
          }
        });
    }
  }

  function applyQuickView(value, { persist = true, reload = true } = {}) {
    const nextQuickView = normalizeQuickView(value);
    state.quickView = nextQuickView;
    state.filters.status = statusForQuickView(nextQuickView);
    state.page = 1;
    syncQuickViewNav({ persist });
    if (reload) void load({ quiet: true, showSkeleton: true });
    else renderList();
  }

  function setFilterOpen(show) {
    refreshElements();
    if (
      !(els.filterToggle instanceof HTMLButtonElement) ||
      !(els.filterPanel instanceof HTMLElement)
    ) {
      return;
    }
    const shouldOpen = Boolean(show);
    els.filterToggle.setAttribute("aria-expanded", String(shouldOpen));
    els.filterPanel.hidden = !shouldOpen;
  }

  function closeFilter() {
    setFilterOpen(false);
  }

  function clearFilters() {
    for (const key of PANEL_FILTER_KEYS) {
      state.filters[key] = "";
    }
    state.page = 1;
    syncPanelFilterControls();
    renderHeaderFilterSummary();
    renderList();
  }

  function parseDealTime(value) {
    const time = value ? new Date(value).getTime() : NaN;
    return Number.isFinite(time) ? time : null;
  }

  function matchesScheduleFilter(record) {
    const schedule = state.filters.schedule;
    if (!schedule) return true;
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const startsAt = parseDealTime(record.startsAt);
    const endsAt = parseDealTime(record.endsAt);
    if (schedule === "starts-24h") return startsAt !== null && startsAt >= now && startsAt - now <= dayMs;
    if (schedule === "ends-24h") return endsAt !== null && endsAt >= now && endsAt - now <= dayMs;
    if (schedule === "no-end") return !record.endsAt;
    return true;
  }

  function matchesStockFilter(deal) {
    const stock = state.filters.stock;
    if (!stock) return true;
    const sold = Number(deal.dealStockSold) || 0;
    const limit = Number(deal.dealStockLimit) || 0;
    const remaining = Number(deal.dealStockRemaining);
    const hasRemaining = Number.isFinite(remaining);
    if (stock === "selling-fast") return limit > 0 && sold / limit >= 0.5;
    if (stock === "low-stock") return hasRemaining && remaining > 0 && remaining <= 10;
    if (stock === "sold-out") return limit > 0 && hasRemaining && remaining <= 0;
    if (stock === "no-sales") return sold <= 0;
    return true;
  }

  function sortRecords(records, { soldOf, priceOf } = {}) {
    const sort = state.filters.sort;
    if (!sort) return records;
    const farFuture = Number.MAX_SAFE_INTEGER;
    const byTime = (key) => (left, right) =>
      (parseDealTime(left[key]) ?? farFuture) - (parseDealTime(right[key]) ?? farFuture);
    const sorted = [...records];
    if (sort === "starts-soon") sorted.sort(byTime("startsAt"));
    if (sort === "ends-soon") sorted.sort(byTime("endsAt"));
    if (sort === "most-sold" && soldOf) sorted.sort((left, right) => soldOf(right) - soldOf(left));
    if (sort === "price-asc" && priceOf) sorted.sort((left, right) => priceOf(left) - priceOf(right));
    return sorted;
  }

  function filteredCampaignCards() {
    const search = String(state.filters.search || "").trim().toLowerCase();
    const funding = state.filters.funding;
    const campaigns = state.campaigns.filter((campaign) => {
      if (funding && String(campaign.fundingSource || "platform").toLowerCase() !== funding) return false;
      return matchesScheduleFilter(campaign);
    });
    return sortRecords(campaigns)
      .flatMap((campaign) =>
        campaignCardPlatformIds(campaign).map((platformId) => ({ campaign, platformId })),
      )
      .filter(({ campaign, platformId }) => {
        if (!search) return true;
        return [campaign.id, campaign.name, campaign.fundingSource, campaignPlatformName(platformId)]
          .join(" ")
          .toLowerCase()
          .includes(search);
      });
  }

  function filteredItems() {
    const search = String(state.filters.search || "")
      .trim()
      .toLowerCase();
    const statusFilter = String(state.filters.status || "")
      .trim()
      .toLowerCase();
    const items = state.items.filter((deal) => {
      const status = displayStatus(deal);
      const dealType = String(deal.dealType || deal.createdByRole || "").toLowerCase();
      if (state.quickView === "seller" && dealType === "platform") return false;
      if (state.quickView === "seller" && dealType === "super_admin") return false;
      if (state.quickView === "platform" && dealType !== "platform" && dealType !== "super_admin") {
        return false;
      }
      if (statusFilter && status !== statusFilter) return false;
      if (!matchesScheduleFilter(deal) || !matchesStockFilter(deal)) return false;
      if (!search) return true;
      const haystack = [
        deal.id,
        deal.productName,
        deal.productId,
        deal.sellerAdminId,
        deal.platformId,
        platformLabel(deal.platformId),
        statusLabel(status),
        deal.notes,
      ]
        .map((value) => String(value || "").toLowerCase())
        .join(" ");
      return haystack.includes(search);
    });
    return sortRecords(items, {
      soldOf: (deal) => Number(deal.dealStockSold) || 0,
      priceOf: (deal) => Number(deal.flashPrice) || 0,
    });
  }

  function pagedItems(items) {
    const list = Array.isArray(items) ? items : [];
    const pageSize = Math.max(1, Number(state.pageSize) || 10);
    const pageCount = Math.max(1, Math.ceil(list.length / pageSize) || 1);
    state.page = Math.min(Math.max(1, Number(state.page) || 1), pageCount);
    if (list.length <= pageSize) return list;
    const start = (state.page - 1) * pageSize;
    return list.slice(start, start + pageSize);
  }

  function renderPagination(totalItems) {
    refreshElements();
    const total = Math.max(0, Number(totalItems) || 0);
    const pageSize = Math.max(1, Number(state.pageSize) || 10);
    const pageCount = Math.max(1, Math.ceil(total / pageSize) || 1);
    state.page = Math.min(Math.max(1, Number(state.page) || 1), pageCount);
    const shouldPaginate = total > pageSize;
    const start = total > 0 ? (state.page - 1) * pageSize + 1 : 0;
    const end = total > 0 ? Math.min(total, start + pageSize - 1) : 0;
    if (els.pageMeta) {
      els.pageMeta.textContent = `${start} – ${end} of ${total}`;
    }
    if (els.pager instanceof HTMLElement) {
      els.pager.hidden = !shouldPaginate;
    }
    if (els.pagination instanceof HTMLElement) {
      els.pagination.hidden = !shouldPaginate;
      const newer = els.pagination.querySelector('[data-flash-deal-pager-dir="newer"]');
      const older = els.pagination.querySelector('[data-flash-deal-pager-dir="older"]');
      if (newer instanceof HTMLButtonElement) {
        newer.dataset.superAdminFlashDealsPage = String(Math.max(1, state.page - 1));
        newer.disabled = !shouldPaginate || state.loading || state.page <= 1;
      }
      if (older instanceof HTMLButtonElement) {
        older.dataset.superAdminFlashDealsPage = String(Math.min(pageCount, state.page + 1));
        older.disabled = !shouldPaginate || state.loading || state.page >= pageCount;
      }
    }
    document.body.classList.toggle("super-admin-flash-deals-pagination-active", shouldPaginate);
    els.list?.classList.toggle("has-flash-deal-pagination", shouldPaginate);
  }

  function goToFlashDealPage(nextPage) {
    const page = Math.max(1, Number(nextPage) || 1);
    if (page === state.page) return;
    state.page = page;
    void load({ quiet: true, showSkeleton: true });
    document
      .querySelector("[data-super-admin-section='flash-deals'] .sa-flash-deals-heading")
      ?.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  function syncPendingBadge() {
    refreshElements();
    if (els.pendingBadge instanceof HTMLElement) {
      els.pendingBadge.hidden = true;
      els.pendingBadge.textContent = "0";
    }
  }

  function flashDealShowcaseHtml(deal) {
    const status = displayStatus(deal);
    const productName =
      String(deal.productName || "").trim() ||
      String(deal.productId || "Listing").trim() ||
      "Listing";
    const seller = String(deal.sellerAdminId || "").trim() || "Seller";
    const platform = platformLabel(deal.platformId);
    const remaining = Number(deal.dealStockRemaining);
    const sold = Number(deal.dealStockSold) || 0;
    const limit = Number(deal.dealStockLimit) || 0;
    const remainingLabel = Number.isFinite(remaining) ? remaining : "—";
    const stockProgress = limit > 0 ? Math.min(100, Math.max(0, (sold / limit) * 100)) : 0;
    const flashPrice = Number(deal.flashPrice) || 0;
    const originalPrice =
      [
        deal.originalPriceSnapshot,
        deal.regularPriceSnapshot,
        deal.originalPrice,
        deal.regularPrice,
      ]
        .map((value) => Number(value))
        .find((value) => Number.isFinite(value) && value > 0) || 0;
    const originalPriceHtml =
      originalPrice > 0 && originalPrice !== flashPrice
        ? `<del class="sa-flash-showcase__original-price" title="Original price ${escapeHtml(formatMoney(originalPrice))}">${escapeHtml(formatMoney(originalPrice))}</del>`
        : "";
    const listingImageUrls = [
      ...new Set(
        (Array.isArray(deal.listingImages) ? deal.listingImages : [])
          .map((imageUrl) => String(imageUrl || "").trim())
          .filter(Boolean),
      ),
    ];
    const companyProfileImageUrl = String(
      deal.companyProfileImageUrl || deal.companyPictureUrl || "",
    ).trim();
    const companyProfileHtml = companyProfileImageUrl
      ? `<img class="sa-flash-showcase__company-profile-image" src="${escapeHtml(companyProfileImageUrl)}" alt="${escapeHtml(deal.companyName || seller)}" loading="lazy" decoding="async" data-flash-deal-company-profile />`
      : defaultCompanyProfileSvg();
    const source = String(deal.dealType || deal.createdByRole || "").toLowerCase();
    const sourceLabel = source === "platform" || source === "super_admin" ? "Platform" : "Seller";
    const photoFanHtml = sourceLabel === "Seller"
      ? flashPhotoFanHtml(listingImageUrls, String(deal.productId || "").trim(), productName)
      : "";
    const overrideNote = deal.overriddenByPlatform
      ? "Temporarily overridden by Platform Flash Deal"
      : "";
    const startsAt = formatWhen(deal.startsAt);
    const endsAt = deal.endsAt ? formatWhen(deal.endsAt) : "Unlimited";
    const muted = status === "ended" || status === "cancelled" || status === "rejected";

    return `
      <article
        class="sa-flash-deal-showcase sa-showcase-card super-admin-company-showcase business-type-showcase${muted ? " is-muted" : ""}"
        data-flash-deal-id="${escapeHtml(deal.id || "")}"
        role="listitem"
        tabindex="0"
        aria-label="${escapeHtml(`${productName}, ${statusLabel(status)} Flash Deal`)}"
      >
        <div class="business-type-showcase__hero">
          <div class="business-type-showcase__content">
            <div class="business-type-showcase__identity">
              <span class="business-type-showcase__icon-wrap">
                <span class="business-type-showcase__icon sa-flash-showcase__icon${companyProfileImageUrl ? " has-company-profile" : ""}" aria-hidden="true">
                  <span class="business-type-showcase__icon-surface">
                    ${companyProfileHtml}
                  </span>
                </span>
              </span>
              <div class="business-type-showcase__heading">
                <div class="business-type-showcase__title-row">
                  <h3 class="business-type-showcase__title">${escapeHtml(productName)}</h3>
                  <span class="sa-flash-deals-row__status is-${escapeHtml(status)}">${escapeHtml(statusLabel(status))}</span>
                </div>
                <p class="business-type-showcase__tagline sa-flash-showcase__tagline">${escapeHtml(sourceLabel)} · ${escapeHtml(seller)}</p>
              </div>
            </div>

            <p class="business-type-showcase__description sa-flash-showcase__description">
              ${escapeHtml(overrideNote || `${statusLabel(status)} ${sourceLabel.toLowerCase()} deal on ${platform} with scheduled pricing and limited stock.`)}
            </p>

            <div class="business-type-showcase__stats sa-flash-showcase__stats">
              <div class="business-type-showcase__stat">
                <span class="business-type-showcase__stat-icon" aria-hidden="true">
                  ${lucideDollarSignSvg()}
                </span>
                <span class="business-type-showcase__stat-copy">
                  <span class="sa-flash-showcase__price-line">
                    <strong>${escapeHtml(formatMoney(flashPrice))}</strong>
                    ${originalPriceHtml}
                  </span>
                  <span>Flash price</span>
                </span>
              </div>
              <div class="business-type-showcase__stat">
                <span class="business-type-showcase__stat-icon" aria-hidden="true">
                  ${lucidePackageSvg()}
                </span>
                <span class="business-type-showcase__stat-copy"><strong>${escapeHtml(remainingLabel)}</strong><span>Stock left</span></span>
              </div>
              <div class="business-type-showcase__stat">
                <span class="business-type-showcase__stat-icon" aria-hidden="true">
                  ${lucideShoppingCartSvg()}
                </span>
                <span class="business-type-showcase__stat-copy"><strong>${escapeHtml(sold)}</strong><span>Units sold</span></span>
              </div>
            </div>

            <div class="business-type-showcase__settings sa-flash-showcase__settings">
              ${uniqueIdSettingHtml(deal.id, "Deal ID")}
              <span class="business-type-showcase__setting sa-flash-showcase__setting">
                <span class="business-type-showcase__setting-label">Platform</span>
                <span class="business-type-showcase__setting-value"><strong>${escapeHtml(platform)}</strong></span>
              </span>
              <span class="business-type-showcase__setting sa-flash-showcase__setting">
                <span class="business-type-showcase__setting-label">Starts</span>
                <span class="business-type-showcase__setting-value"><strong>${escapeHtml(startsAt)}</strong></span>
              </span>
              <span class="business-type-showcase__setting sa-flash-showcase__setting">
                <span class="business-type-showcase__setting-label">Ends</span>
                <span class="business-type-showcase__setting-value"><strong>${escapeHtml(endsAt)}</strong></span>
              </span>
            </div>

            <div
              class="super-admin-company-showcase__progress sa-flash-showcase__sales-progress"
              role="progressbar"
              aria-label="${escapeHtml(`${Math.round(stockProgress)}% of Flash Deal stock sold`)}"
              aria-valuemin="0"
              aria-valuemax="100"
              aria-valuenow="${Math.round(stockProgress)}"
            >
              <div class="super-admin-company-showcase__progress-meta">
                <span class="super-admin-company-showcase__progress-label">Sold progress</span>
                <strong class="super-admin-company-showcase__progress-value">${Math.round(stockProgress)}%</strong>
              </div>
              <div class="super-admin-company-showcase__progress-track">
                <span class="super-admin-company-showcase__progress-fill" style="width: ${stockProgress.toFixed(2)}%"></span>
              </div>
            </div>
          </div>

          <div class="business-type-showcase__media sa-flash-showcase__media sa-flash-showcase__media--clock${photoFanHtml ? " has-photo-fan" : ""}" aria-label="${escapeHtml(`${productName} deal schedule`)}">
            ${photoFanHtml}
            ${flashClockHtml(deal, status)}
          </div>
        </div>
      </article>
    `;
  }

  const FLASH_PHOTO_FAN_MAX = 5;

  const FLASH_FAN_SHUFFLE_MS = 10000;
  const FLASH_FAN_THUMB_PEAK_MS = 420;
  const FLASH_FAN_SHUFFLE_SELECTOR = ".sa-flash-photo-fan[data-flash-fan-shuffle]";

  /** Fan slot for a stack depth: 0 = center, then right 1, left 1, right 2, left 2. */
  function flashFanSlot(depth) {
    const level = Math.ceil(depth / 2);
    return { level, side: depth === 0 ? 0 : depth % 2 === 1 ? 1 : -1 };
  }

  function applyFlashFanDepth(card, depth, { deferZ = false } = {}) {
    const { level, side } = flashFanSlot(depth);
    card.dataset.fanDepth = String(depth);
    card.style.setProperty("--fan-level", String(level));
    card.style.setProperty("--fan-side", String(side));
    if (!deferZ) card.style.zIndex = String(FLASH_PHOTO_FAN_MAX - depth);
  }

  /** Fan of listing photos: photo 1 in the center, the next photo on its right, then its left, and so on. */
  function flashPhotoFanHtml(imageUrls, productId, productName) {
    const urls = imageUrls.slice(0, FLASH_PHOTO_FAN_MAX);
    if (!urls.length) return "";
    const cards = urls.map((url, depth) => {
      const { level, side } = flashFanSlot(depth);
      return `<span class="sa-flash-photo-fan__card" data-fan-depth="${depth}" style="--fan-level:${level};--fan-side:${side};z-index:${FLASH_PHOTO_FAN_MAX - depth}"><img src="${escapeHtml(url)}" alt="" loading="lazy" decoding="async" data-flash-fan-image /></span>`;
    });
    const fanStyle = `--fan-levels:${Math.max(1, flashFanSlot(urls.length - 1).level)}`;
    if (!productId) {
      return `<div class="sa-flash-photo-fan" style="${fanStyle}" data-flash-fan-shuffle data-sa-motion aria-hidden="true">${cards.join("")}</div>`;
    }
    return `<button type="button" class="sa-flash-photo-fan is-viewable" style="${fanStyle}" data-flash-fan-shuffle data-sa-motion data-flash-view-listing="${escapeHtml(productId)}" aria-label="${escapeHtml(`View ${productName} listing`)}" title="View listing">${cards.join("")}</button>`;
  }

  /**
   * Thumbs the center photo up and tucks it at the back of the stack; every other
   * photo moves one step forward, so the photo on its right becomes the center.
   */
  function shuffleFlashPhotoFan(fan, reduceMotion) {
    const cards = [...fan.querySelectorAll(".sa-flash-photo-fan__card")];
    if (cards.length < 2) return;
    cards.sort((left, right) => Number(left.dataset.fanDepth || 0) - Number(right.dataset.fanDepth || 0));
    const [front, next, ...rest] = cards;
    const backDepth = cards.length - 1;
    if (reduceMotion) {
      [next, ...rest].forEach((card, index) => applyFlashFanDepth(card, index));
      applyFlashFanDepth(front, backDepth);
      refillFlashFanCard(fan, front);
      return;
    }
    fan.classList.add("is-shuffling");
    window.clearTimeout(Number(fan.dataset.shuffleTimer) || 0);
    fan.dataset.shuffleTimer = String(
      window.setTimeout(() => {
        fan.classList.remove("is-shuffling");
        cards.forEach((card) => card.style.removeProperty("transition-delay"));
      }, 1600),
    );
    [next, ...rest].forEach((card, index) => {
      card.style.transitionDelay = `${120 + index * 60}ms`;
    });
    rest.forEach((card, index) => applyFlashFanDepth(card, index + 1));
    applyFlashFanDepth(next, 0);
    front.style.setProperty("--thumb-dir", String(flashFanSlot(backDepth).side || 1));
    front.style.zIndex = String(FLASH_PHOTO_FAN_MAX + 1);
    front.classList.remove("is-thumbed");
    void front.offsetWidth;
    front.classList.add("is-thumbed");
    window.setTimeout(() => {
      applyFlashFanDepth(front, backDepth, { deferZ: true });
      front.style.zIndex = "0";
    }, FLASH_FAN_THUMB_PEAK_MS);
    let settled = false;
    const settleFront = () => {
      if (settled) return;
      settled = true;
      front.classList.remove("is-thumbed");
      front.style.zIndex = String(FLASH_PHOTO_FAN_MAX - (Number(front.dataset.fanDepth) || 0));
      refillFlashFanCard(fan, front);
    };
    front.addEventListener("animationend", settleFront, { once: true });
    window.setTimeout(settleFront, 1200);
  }

  /**
   * Fans with more entries than slots (data-fan-queue) cycle through all of them:
   * the card just tucked at the back is refilled with the next entry in line.
   */
  function refillFlashFanCard(fan, card) {
    if (!fan.dataset.fanQueue) return;
    if (!Array.isArray(fan.flashFanQueue)) {
      try {
        fan.flashFanQueue = JSON.parse(fan.dataset.fanQueue);
      } catch (_error) {
        fan.flashFanQueue = [];
      }
    }
    const queue = fan.flashFanQueue;
    if (!Array.isArray(queue) || !queue.length) return;
    const index = (Number(fan.dataset.fanNext) || 0) % queue.length;
    const entry = queue[index] || {};
    fan.dataset.fanNext = String((index + 1) % queue.length);
    card.innerHTML = companyFanFaceHtml(entry);
    const name = String(entry.name || "");
    if (card.hasAttribute("data-sa-tooltip")) card.setAttribute("data-sa-tooltip", name);
    else card.title = name;
    const image = card.querySelector("img[data-flash-company-fan-image]");
    if (image instanceof HTMLImageElement) bindCompanyFanImageFallback(image);
    card.classList.remove("is-refilled");
    void card.offsetWidth;
    card.classList.add("is-refilled");
  }

  function shuffleVisibleFlashPhotoFans() {
    if (document.hidden || !(els.list instanceof HTMLElement) || !els.list.isConnected) return;
    if (!els.list.offsetParent || isFlashPageCovered()) return;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
    els.list.querySelectorAll(FLASH_FAN_SHUFFLE_SELECTOR).forEach((fan) => {
      if (fan.matches(":hover, :focus-visible")) return;
      shuffleFlashPhotoFan(fan, reduceMotion);
    });
  }

  function companyMonogram(name) {
    const words = String(name || "").trim().split(/\s+/).filter(Boolean);
    const letters = words.length > 1 ? words[0][0] + words[1][0] : (words[0] || "?").slice(0, 2);
    return letters.toUpperCase();
  }

  function companyFanFaceHtml(seller) {
    const monogram = companyMonogram(seller?.name);
    const picture = String(seller?.pictureUrl || "").trim();
    return picture
      ? `<img src="${escapeHtml(picture)}" alt="" loading="lazy" decoding="async" data-flash-company-fan-image data-monogram="${escapeHtml(monogram)}" />`
      : `<span class="sa-flash-photo-fan__monogram">${escapeHtml(monogram)}</span>`;
  }

  /** Photo fan of the companies that registered listings on this platform card. */
  function campaignCompanyFanHtml(campaign, platformId, usage, campaignName, registeredLabel) {
    const sellers = Array.isArray(usage?.sellers) ? usage.sellers : [];
    const count = Math.max(Number(usage?.sellerCount) || 0, sellers.length);
    const shown = sellers.slice(0, FLASH_PHOTO_FAN_MAX);
    const levels = Math.max(1, flashFanSlot(Math.max(0, shown.length - 1)).level);
    const cards = shown.length
      ? shown.map((seller, depth) => {
          const { level, side } = flashFanSlot(depth);
          return `<span class="sa-flash-photo-fan__card" data-fan-depth="${depth}" style="--fan-level:${level};--fan-side:${side};z-index:${FLASH_PHOTO_FAN_MAX - depth}" title="${escapeHtml(seller.name || "")}">${companyFanFaceHtml(seller)}</span>`;
        })
      : [
          `<span class="sa-flash-photo-fan__card is-empty" style="--fan-level:0;--fan-side:0"><span class="sa-flash-photo-fan__monogram">${CAMPAIGN_STAT_ICONS.sellers}</span></span>`,
        ];
    const queueAttrs =
      sellers.length > shown.length
        ? ` data-fan-queue="${escapeHtml(
            JSON.stringify(sellers.map((seller) => ({ name: seller.name || "", pictureUrl: seller.pictureUrl || "" }))),
          )}" data-fan-next="${shown.length}"`
        : "";
    return `
      <div class="sa-flash-company-fan">
        <button type="button" class="sa-flash-photo-fan sa-flash-photo-fan--companies is-viewable" style="--fan-levels:${levels}"${shown.length > 1 ? " data-flash-fan-shuffle data-sa-motion" : ""}${queueAttrs} data-flash-campaign-companies="${escapeHtml(campaign.id || "")}" data-flash-campaign-platform="${escapeHtml(platformId)}" aria-label="${escapeHtml(`View companies and listings that joined ${campaignName} on ${campaignPlatformName(platformId)}`)}">${cards.join("")}</button>
        <button type="button" class="sa-flash-company-fan__caption" data-flash-campaign-companies="${escapeHtml(campaign.id || "")}" data-flash-campaign-platform="${escapeHtml(platformId)}" tabindex="-1">
          <span><strong>${escapeHtml(String(count))}</strong> ${count === 1 ? "company" : "companies"}</span>
          <span class="sa-flash-company-fan__dot" aria-hidden="true"></span>
          <span><strong>${escapeHtml(String(registeredLabel))}</strong> registered</span>
        </button>
      </div>
    `;
  }

  function bindCompanyFanImageFallback(image) {
    const showMonogram = () => {
      if (!image.isConnected) return;
      const monogram = document.createElement("span");
      monogram.className = "sa-flash-photo-fan__monogram";
      monogram.textContent = image.dataset.monogram || "?";
      image.replaceWith(monogram);
    };
    if (image.complete && image.naturalWidth === 0 && image.getAttribute("src")) {
      showMonogram();
      return;
    }
    image.addEventListener("error", showMonogram, { once: true });
  }

  function hydrateCampaignCompanyFans() {
    if (!(els.list instanceof HTMLElement)) return;
    els.list.querySelectorAll("img[data-flash-company-fan-image]").forEach((image) => {
      if (image instanceof HTMLImageElement) bindCompanyFanImageFallback(image);
    });
  }

  const CAMPAIGN_STATUS_LABELS = {
    active: "live",
    scheduled: "scheduled",
    paused: "paused",
    draft: "draft",
    ended: "ended",
    cancelled: "discarded",
    budget_exhausted: "budget used up",
  };

  function campaignDiscountLabel(campaign) {
    if (String(campaign.discountType || "") === "fixed_price") {
      return formatMoney(campaign.discountValue);
    }
    const cap = Number(campaign.maxDiscountAmount) || 0;
    return `${Number(campaign.discountValue) || 0}% off${cap > 0 ? ` · max ${formatMoney(cap)}` : ""}${
      campaign.freeShipping === true ? " · Free shipping" : ""
    }`;
  }

  function campaignFundingLabel(campaign) {
    const funding = String(campaign.fundingSource || "platform");
    if (funding === "shared") {
      return `Shared · platform ${Number(campaign.platformSharePct) || 50}%`;
    }
    return funding === "seller" ? "Seller funded" : "Platform funded";
  }

  function hydrateFlashDealCompanyProfiles() {
    if (!(els.list instanceof HTMLElement)) return;
    els.list.querySelectorAll("img[data-flash-deal-company-profile]").forEach((image) => {
      if (!(image instanceof HTMLImageElement)) return;
      const showFallback = () => {
        if (!image.isConnected) return;
        const icon = image.closest(".sa-flash-showcase__icon");
        const surface = image.closest(".business-type-showcase__icon-surface");
        icon?.classList.remove("has-company-profile");
        if (surface instanceof HTMLElement) surface.innerHTML = defaultCompanyProfileSvg();
      };
      if (image.complete && image.naturalWidth === 0) {
        showFallback();
        return;
      }
      image.addEventListener("error", showFallback, { once: true });
    });
    els.list.querySelectorAll("img[data-flash-fan-image]").forEach((image) => {
      if (!(image instanceof HTMLImageElement)) return;
      const removeCard = () => {
        const fan = image.closest(".sa-flash-photo-fan");
        image.closest(".sa-flash-photo-fan__card")?.remove();
        if (fan && !fan.querySelector(".sa-flash-photo-fan__card")) {
          fan.closest(".sa-flash-showcase__media")?.classList.remove("has-photo-fan");
          fan.remove();
        }
      };
      if (image.complete && image.naturalWidth === 0) {
        removeCard();
        return;
      }
      image.addEventListener("error", removeCard, { once: true });
    });
  }

  const CAMPAIGN_ACTION_ICONS = Object.freeze({
    details: [
      "eye",
      '<path d="M2.062 12.348a1 1 0 0 1 0-.696C3.46 8.1 7 5 12 5c4.998 0 8.54 3.1 9.938 6.652a1 1 0 0 1 0 .696C20.54 15.9 17 19 12 19c-4.998 0-8.54-3.1-9.938-6.652"/><circle cx="12" cy="12" r="3"/>',
    ],
    publish: [
      "upload",
      '<path d="M12 3v12"/><path d="m17 8-5-5-5 5"/><path d="M5 21h14"/>',
    ],
    edit: [
      "pencil",
      '<path d="M13 21h8"/><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>',
    ],
    pause: ["pause", '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>'],
    resume: ["play", '<path d="m6 3 14 9-14 9z"/>'],
    end: ["circle-stop", '<circle cx="12" cy="12" r="10"/><rect x="9" y="9" width="6" height="6" rx="1"/>'],
    duplicate: ["copy", '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>'],
  });

  function campaignActionIcon(action) {
    const icon = CAMPAIGN_ACTION_ICONS[action] || CAMPAIGN_ACTION_ICONS.details;
    return lucideIconSvg(icon[0], icon[1]);
  }

  function campaignActionButtons(campaign, platformId = "") {
    const status = String(campaign.status || "").toLowerCase();
    const id = escapeHtml(campaign.id || "");
    const platform = escapeHtml(platformId);
    const button = (action, label, tone = "") => {
      const toneClass = tone ? ` super-admin-company-card__quick-action--${tone}` : "";
      return `<button type="button" class="super-admin-company-card__quick-action sa-flash-campaign-action${toneClass}" data-flash-campaign-action="${action}" data-flash-campaign-id="${id}" data-flash-campaign-platform="${platform}" data-tooltip="${escapeHtml(label)}" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}">${campaignActionIcon(action)}</button>`;
    };
    const actions = [button("details", "Companies & listings")];
    if (status === "draft") {
      actions.push(button("publish", "Publish", "positive"), button("edit", "Edit"), button("end", "Discard", "danger"));
    } else if (status === "scheduled" || status === "active" || status === "budget_exhausted") {
      actions.push(button("edit", "Edit"), button("pause", "Pause"), button("end", "End now", "danger"));
    } else if (status === "paused") {
      actions.push(button("resume", "Resume", "positive"), button("edit", "Edit"), button("end", "End now", "danger"));
    }
    actions.push(button("duplicate", "Duplicate"));
    return actions.join("");
  }

  const REGISTERED_THUMB_FALLBACK = lucideIconSvg(
    "image",
    '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
  );

  function registeredIdCopyHtml(value, label = "Listing ID") {
    const id = String(value || "").trim();
    if (!id) return "";
    return `
      <span class="sa-flash-registered-row__id super-admin-company-copy-field">
        <span class="super-admin-company-copy-field__text">${escapeHtml(id)}</span>
        <button
          type="button"
          class="super-admin-company-copy-button"
          data-company-contact-copy="${escapeHtml(id)}"
          data-company-contact-label="${escapeHtml(label)}"
          aria-label="Copy ${escapeHtml(label.toLowerCase())}"
          title="Copy ${escapeHtml(label.toLowerCase())}"
        >${COPY_ICON_MARKUP}</button>
      </span>
    `;
  }

  /** Groups registered listings by the company that registered them. */
  function joinedCompaniesFromListings(listings) {
    const companies = new Map();
    for (const listing of listings) {
      const id = String(listing.sellerAdminId || "").trim();
      if (!id) continue;
      if (!companies.has(id)) {
        companies.set(id, {
          id,
          name: String(listing.sellerLabel || id).trim(),
          pictureUrl: String(listing.sellerPictureUrl || "").trim(),
          listings: [],
        });
      }
      companies.get(id).listings.push(listing);
    }
    return [...companies.values()].sort(
      (left, right) =>
        right.listings.length - left.listings.length ||
        left.name.localeCompare(right.name, undefined, { sensitivity: "base" }),
    );
  }

  function joinedCompanyGroupHtml(company, visibleListings, expanded) {
    const monogram = companyMonogram(company.name);
    const face = company.pictureUrl
      ? `<img src="${escapeHtml(company.pictureUrl)}" alt="" loading="lazy" decoding="async" data-flash-company-row-img data-monogram="${escapeHtml(monogram)}" />`
      : `<span class="sa-flash-photo-fan__monogram">${escapeHtml(monogram)}</span>`;
    const count = company.listings.length;
    const names = company.listings.map((listing) => String(listing.name || "Listing").trim());
    const branchId = `sa-flash-company-branch-${company.id.replace(/[^a-z0-9_-]/gi, "-")}`;
    return `
      <div class="sa-flash-company-group${expanded ? " is-expanded" : ""}" role="listitem">
        <div class="sa-flash-registered-row sa-flash-company-row" data-flash-company-toggle="${escapeHtml(company.id)}">
          <span class="sa-flash-registered-row__thumb is-company" aria-hidden="true">${face}</span>
          <div class="sa-flash-registered-row__main">
            <span class="sa-flash-registered-row__name" title="${escapeHtml(company.name)}">${escapeHtml(company.name)}</span>
            ${registeredIdCopyHtml(company.id, "Seller ID")}
            <span class="sa-flash-registered-row__meta" title="${escapeHtml(names.join(", "))}">${escapeHtml(namesSummary(names))}</span>
          </div>
          <div class="sa-flash-registered-row__side sa-flash-company-row__side">
            <span class="sa-flash-company-row__count"><strong>${escapeHtml(String(count))}</strong><span>${count === 1 ? "listing" : "listings"}</span></span>
            <button type="button" class="sa-flash-company-row__toggle" aria-expanded="${expanded ? "true" : "false"}" aria-controls="${escapeHtml(branchId)}" aria-label="${escapeHtml(`${expanded ? "Hide" : "Show"} ${company.name} listings`)}">
              ${lucideIconSvg("chevron-down", '<path d="m6 9 6 6 6-6"/>')}
            </button>
          </div>
        </div>
        <div class="sa-flash-company-branch" id="${escapeHtml(branchId)}" role="list" aria-label="${escapeHtml(`${company.name} listings`)}"${expanded ? "" : " hidden"}>
          ${visibleListings
            .map((listing) => registeredListingRowHtml(listing, { showSeller: false }))
            .join("")}
        </div>
      </div>
    `;
  }

  function registeredListingRowHtml(listing, { showSeller = true } = {}) {
    const id = String(listing?.id || "").trim();
    const imageUrl = String(listing?.imageUrl || "").trim();
    const thumb = imageUrl
      ? `<img src="${escapeHtml(imageUrl)}" alt="" loading="lazy" decoding="async" data-flash-registered-img />`
      : REGISTERED_THUMB_FALLBACK;
    if (listing?.missing) {
      return `
        <div class="sa-flash-registered-row is-missing" role="listitem">
          <span class="sa-flash-registered-row__thumb is-empty" aria-hidden="true">${REGISTERED_THUMB_FALLBACK}</span>
          <div class="sa-flash-registered-row__main">
            <span class="sa-flash-registered-row__name">Listing no longer available</span>
            ${registeredIdCopyHtml(id)}
          </div>
        </div>
      `;
    }
    const name = String(listing.name || "Listing").trim();
    const variantCount = Array.isArray(listing.settings?.variantIds) ? listing.settings.variantIds.length : 0;
    const meta = [
      showSeller ? String(listing.sellerLabel || "").trim() : "",
      variantCount ? `${variantCount} variant${variantCount === 1 ? "" : "s"}` : "",
    ].filter(Boolean).join(" · ");
    const sold = Number(listing.dealStockSold) || 0;
    const limit = Number(listing.dealStockLimit) || 0;
    const campaignPrice = Number(listing.campaignPrice);
    const sellingPrice = Number(listing.sellingPrice);
    const discounted = Number.isFinite(campaignPrice) && Number.isFinite(sellingPrice) && campaignPrice < sellingPrice;
    return `
      <div class="sa-flash-registered-row" role="listitem">
        <button type="button" class="sa-flash-registered-row__thumb${imageUrl ? "" : " is-empty"}" data-flash-view-listing="${escapeHtml(id)}" aria-label="View listing ${escapeHtml(name)}">${thumb}</button>
        <div class="sa-flash-registered-row__main">
          <button type="button" class="sa-flash-registered-row__name" data-flash-view-listing="${escapeHtml(id)}" title="${escapeHtml(name)}">${escapeHtml(name)}</button>
          ${registeredIdCopyHtml(id)}
          ${meta ? `<span class="sa-flash-registered-row__meta">${escapeHtml(meta)}</span>` : ""}
        </div>
        <div class="sa-flash-registered-row__side">
          <strong>${escapeHtml(formatMoney(discounted ? campaignPrice : sellingPrice))}</strong>
          ${discounted ? `<s>${escapeHtml(formatMoney(sellingPrice))}</s>` : ""}
          <span>${escapeHtml(`${sold} / ${limit} sold`)}</span>
          ${listing.sellerDealOverlap ? '<span class="sa-flash-deal-overlap-pill">Seller deal overlap</span>' : ""}
        </div>
      </div>
    `;
  }

  function ensureRegisteredDrawer() {
    let drawer = document.querySelector("[data-flash-registered-drawer]");
    if (drawer) return drawer;
    const backdrop = document.createElement("div");
    backdrop.className = "super-admin-integrated-drawer-backdrop sa-flash-registered-drawer-backdrop";
    backdrop.setAttribute("data-flash-registered-backdrop", "");
    backdrop.hidden = true;
    drawer = document.createElement("aside");
    drawer.className = "super-admin-integrated-drawer sa-flash-registered-drawer";
    drawer.setAttribute("data-flash-registered-drawer", "");
    drawer.setAttribute("role", "dialog");
    drawer.setAttribute("aria-labelledby", "sa-flash-registered-title");
    drawer.hidden = true;
    drawer.innerHTML = `
      <div class="super-admin-company-drawer__header sa-flash-registered-drawer__header">
        <h2 id="sa-flash-registered-title">Companies &amp; listings</h2>
        <button type="button" class="super-admin-company-drawer__close" data-flash-registered-close aria-label="Close" title="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
        </button>
      </div>
      <div class="super-admin-company-drawer__body sa-flash-registered-drawer__body">
        <div class="sa-flash-registered-drawer__summary" data-flash-registered-summary></div>
        <div class="sa-flash-registered-drawer__search-bar" data-flash-registered-search-bar>
          <label class="sa-flash-registered-drawer__search">
            ${lucideIconSvg("search", '<path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/>')}
            <input type="search" data-flash-registered-search placeholder="Search company, product, or ID" aria-label="Search companies and registered products" autocomplete="off" />
          </label>
        </div>
        <div class="sa-flash-registered-drawer__list" data-flash-registered-list role="list"></div>
      </div>
      <button type="button" class="sa-flash-registered-drawer__top" data-flash-registered-top aria-label="Back to top" title="Back to top" tabindex="-1">
        ${lucideIconSvg("arrow-up", '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>')}
      </button>
    `;
    document.body.append(backdrop, drawer);
    const body = drawer.querySelector(".sa-flash-registered-drawer__body");
    const topButton = drawer.querySelector("[data-flash-registered-top]");
    if (body instanceof HTMLElement && topButton instanceof HTMLButtonElement) {
      let scrollFrame = 0;
      body.addEventListener(
        "scroll",
        () => {
          if (scrollFrame) return;
          scrollFrame = window.requestAnimationFrame(() => {
            scrollFrame = 0;
            syncRegisteredDrawerTop(drawer);
          });
        },
        { passive: true },
      );
      topButton.addEventListener("click", () => {
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        body.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
        drawer.querySelector("[data-flash-registered-search]")?.focus({ preventScroll: true });
      });
    }
    return drawer;
  }

  function syncRegisteredDrawerTop(drawer) {
    const body = drawer.querySelector(".sa-flash-registered-drawer__body");
    const topButton = drawer.querySelector("[data-flash-registered-top]");
    if (!(body instanceof HTMLElement) || !(topButton instanceof HTMLButtonElement)) return;
    const scrollTop = body.scrollTop;
    const visible = scrollTop > 160;
    if (topButton.classList.contains("is-visible") !== visible) {
      topButton.classList.toggle("is-visible", visible);
      topButton.tabIndex = visible ? 0 : -1;
    }
    const scrolled = scrollTop > 8;
    if (body.classList.contains("is-scrolled") !== scrolled) body.classList.toggle("is-scrolled", scrolled);
  }

  function renderRegisteredDrawer() {
    const id = state.registeredDrawerCampaignId;
    const drawer = document.querySelector("[data-flash-registered-drawer]");
    if (!id || !drawer) return;
    const summaryEl = drawer.querySelector("[data-flash-registered-summary]");
    const listEl = drawer.querySelector("[data-flash-registered-list]");
    const searchLabel = drawer.querySelector("[data-flash-registered-search-bar]");
    const detail = state.campaignDetails[id];
    const fallbackCampaign =
      state.campaigns.find((entry) => String(entry?.id || "").trim() === id) || {};
    const campaign = detail?.campaign || fallbackCampaign;
    const platformId = state.registeredDrawerPlatformId;
    const platformName = platformId ? campaignPlatformName(platformId) : "";
    const listings = (Array.isArray(detail?.listings) ? detail.listings : []).filter(
      (listing) => !platformId || (!listing.missing && listingPlatformId(listing) === platformId),
    );
    const companies = joinedCompaniesFromListings(listings);
    const sellerCount = companies.length;
    if (summaryEl) {
      const counts = `${sellerCount} ${sellerCount === 1 ? "company" : "companies"} · ${listings.length} registered`;
      summaryEl.innerHTML = `
        <strong>${escapeHtml(String(campaign.name || "Platform campaign").trim())}</strong>
        <span>${escapeHtml(
          detail && !detail.error
            ? [platformName, counts].filter(Boolean).join(" · ")
            : platformName || "Companies & listings",
        )}</span>
        ${campaign.displayLabel ? `<small>Buyer label: ${escapeHtml(campaign.displayLabel)}</small>` : ""}
        ${campaign.notes ? `<small>Notes: ${escapeHtml(campaign.notes)}</small>` : ""}
      `;
    }
    if (searchLabel) searchLabel.hidden = !detail || Boolean(detail.error) || companies.length === 0;
    if (!listEl) return;
    if (!detail) {
      listEl.innerHTML = '<p class="sa-flash-registered-drawer__empty">Loading companies…</p>';
      return;
    }
    if (detail.error) {
      listEl.innerHTML = `<p class="sa-flash-registered-drawer__empty">${escapeHtml(detail.error)}</p>`;
      return;
    }
    const query = state.registeredSearch.trim().toLowerCase();
    const matches = (values) => values.join(" ").toLowerCase().includes(query);
    const matchedCompanies = query
      ? companies.filter((company) => matches([company.id, company.name]))
      : companies;
    const matchedListings = query
      ? companies.flatMap((company) => company.listings.filter((listing) => matches([listing.id, listing.name])))
      : [];
    if (!matchedCompanies.length && !matchedListings.length) {
      listEl.innerHTML = `<p class="sa-flash-registered-drawer__empty">${escapeHtml(
        companies.length
          ? "No companies or listings match your search."
          : `No companies have joined${platformName ? ` on ${platformName}` : ""} yet.`,
      )}</p>`;
      return;
    }
    const rows = [
      ...matchedCompanies.map((company) => ({
        name: company.name,
        html: joinedCompanyGroupHtml(company, company.listings, state.registeredExpanded.has(company.id)),
      })),
      ...matchedListings.map((listing) => ({
        name: String(listing.name || ""),
        html: registeredListingRowHtml(listing),
      })),
    ];
    if (query) {
      const startsWithQuery = (name) => name.toLowerCase().startsWith(query);
      rows.sort(
        (left, right) =>
          Number(startsWithQuery(right.name)) - Number(startsWithQuery(left.name)) ||
          left.name.localeCompare(right.name, undefined, { sensitivity: "base" }),
      );
    }
    listEl.innerHTML = rows.map((row) => row.html).join("");
    listEl.querySelectorAll("img[data-flash-company-row-img]").forEach((image) => {
      const showMonogram = () => {
        const monogram = document.createElement("span");
        monogram.className = "sa-flash-photo-fan__monogram";
        monogram.textContent = image.dataset.monogram || "?";
        image.replaceWith(monogram);
      };
      if (image.complete && image.naturalWidth === 0) {
        showMonogram();
        return;
      }
      image.addEventListener("error", showMonogram, { once: true });
    });
    listEl.querySelectorAll("img[data-flash-registered-img]").forEach((image) => {
      const showFallback = () => {
        const thumb = image.closest(".sa-flash-registered-row__thumb");
        if (!thumb) return;
        thumb.classList.add("is-empty");
        thumb.innerHTML = REGISTERED_THUMB_FALLBACK;
      };
      if (image.complete && image.naturalWidth === 0) {
        showFallback();
        return;
      }
      image.addEventListener("error", showFallback, { once: true });
    });
  }

  function toggleRegisteredCompany(companyId) {
    const id = String(companyId || "").trim();
    if (!id) return;
    const group = document
      .querySelector(`[data-flash-registered-drawer] [data-flash-company-toggle="${CSS.escape(id)}"]`)
      ?.closest(".sa-flash-company-group");
    const expanded = !group?.classList.contains("is-expanded");
    if (expanded) state.registeredExpanded.add(id);
    else state.registeredExpanded.delete(id);
    if (!group) return;
    group.classList.toggle("is-expanded", expanded);
    const branch = group.querySelector(".sa-flash-company-branch");
    if (branch instanceof HTMLElement) branch.hidden = !expanded;
    const toggle = group.querySelector(".sa-flash-company-row__toggle");
    if (toggle instanceof HTMLElement) {
      toggle.setAttribute("aria-expanded", expanded ? "true" : "false");
      const name = group.querySelector(".sa-flash-company-row .sa-flash-registered-row__name")?.textContent || "";
      toggle.setAttribute("aria-label", `${expanded ? "Hide" : "Show"} ${name} listings`);
    }
  }

  function closeRegisteredDrawer() {
    const drawer = document.querySelector("[data-flash-registered-drawer]");
    const backdrop = document.querySelector("[data-flash-registered-backdrop]");
    if (!drawer || drawer.hidden) return;
    const campaignId = state.registeredDrawerCampaignId;
    const platformId = state.registeredDrawerPlatformId;
    drawer.hidden = true;
    if (backdrop) backdrop.hidden = true;
    state.registeredDrawerCampaignId = "";
    state.registeredDrawerPlatformId = "";
    const trigger = campaignId
      ? document.querySelector(
          `.sa-flash-photo-fan[data-flash-campaign-companies="${CSS.escape(campaignId)}"][data-flash-campaign-platform="${CSS.escape(platformId)}"]`,
        )
      : null;
    if (trigger instanceof HTMLElement) trigger.focus({ preventScroll: true });
  }

  async function openRegisteredDrawer(campaignId, platformId = "") {
    const id = String(campaignId || "").trim();
    if (!id) return;
    const drawer = ensureRegisteredDrawer();
    const backdrop = document.querySelector("[data-flash-registered-backdrop]");
    state.registeredDrawerCampaignId = id;
    state.registeredDrawerPlatformId = normalizePlatformId(platformId);
    state.registeredExpanded = new Set();
    state.registeredSearch = "";
    const search = drawer.querySelector("[data-flash-registered-search]");
    if (search instanceof HTMLInputElement) search.value = "";
    delete state.campaignDetails[id];
    drawer.hidden = false;
    if (backdrop) backdrop.hidden = false;
    const body = drawer.querySelector(".sa-flash-registered-drawer__body");
    if (body instanceof HTMLElement) body.scrollTop = 0;
    syncRegisteredDrawerTop(drawer);
    renderRegisteredDrawer();
    window.requestAnimationFrame(() => {
      drawer.querySelector("[data-flash-registered-close]")?.focus({ preventScroll: true });
    });
    await loadCampaignDetail(id, { force: true });
    if (state.registeredDrawerCampaignId === id) renderRegisteredDrawer();
  }

  async function loadCampaignDetail(campaignId, { force = false } = {}) {
    const id = String(campaignId || "").trim();
    if (!id) return null;
    if (!force && state.campaignDetails[id] && !state.campaignDetails[id].error) {
      return state.campaignDetails[id];
    }
    try {
      const response = await fetch(
        `/api/super-admin/flash-deal-campaigns/${encodeURIComponent(id)}/products`,
        { headers: headers(), cache: "no-store" },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Unable to load campaign details.");
      state.campaignDetails[id] = data;
    } catch (error) {
      state.campaignDetails[id] = {
        error: error instanceof Error ? error.message : "Unable to load campaign details.",
      };
    }
    return state.campaignDetails[id];
  }

  function campaignShowcaseHtml(campaign, platformId) {
    const status = String(campaign.status || "scheduled").toLowerCase();
    const name = String(campaign.name || "Platform campaign").trim();
    const discount = campaignDiscountLabel(campaign);
    const sharedAcrossPlatforms = campaignCardPlatformIds(campaign).length > 1;
    const productIds = Array.isArray(campaign.eligibility?.productIds)
      ? campaign.eligibility.productIds
      : [];
    const hasPlatformStats = campaign.platformStats && typeof campaign.platformStats === "object";
    const platformUsage = hasPlatformStats
      ? campaign.platformStats[platformId] || {}
      : sharedAcrossPlatforms
        ? {}
        : {
            ...(campaign.stats || {}),
            productCount: productIds.length,
            sellerCount: campaign.sellerCount,
          };
    const productCount =
      String(campaign.eligibility?.scope || "all") === "products" || productIds.length > 0
        ? String(Number(platformUsage.productCount) || 0)
        : "All";
    const budget = Math.max(0, Number(campaign.budgetAmount) || 0);
    const budgetCommitted = Math.max(0, Number(campaign.budgetCommitted) || 0);
    const rawBudgetRemaining = campaign.budgetRemaining == null
      ? Number.NaN
      : Number(campaign.budgetRemaining);
    const budgetRemaining = budget > 0
      ? Math.min(
          budget,
          Math.max(
            0,
            Number.isFinite(rawBudgetRemaining)
              ? rawBudgetRemaining
              : budget - budgetCommitted,
          ),
        )
      : 0;
    const budgetUsed = budget > 0 ? Math.max(0, budget - budgetRemaining) : 0;
    const budgetProgress = budget > 0
      ? Math.min(100, Math.max(0, (budgetUsed / budget) * 100))
      : 0;
    const budgetProgressPercent = Math.round(budgetProgress);
    const budgetProgressHtml = budget > 0
      ? `
        <div
          class="super-admin-company-showcase__progress sa-flash-showcase__budget-progress"
          role="progressbar"
          aria-label="Campaign budget used: ${escapeHtml(formatMoney(budgetUsed))} of ${escapeHtml(formatMoney(budget))}"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow="${budgetProgressPercent}"
        >
          <div class="super-admin-company-showcase__progress-meta">
            <span class="super-admin-company-showcase__progress-label">${sharedAcrossPlatforms ? "Shared budget used" : "Budget used"}</span>
            <strong class="super-admin-company-showcase__progress-value">${escapeHtml(formatMoney(budgetUsed))} of ${escapeHtml(formatMoney(budget))} · ${budgetProgressPercent}%</strong>
          </div>
          <div class="super-admin-company-showcase__progress-track" aria-hidden="true">
            <span class="super-admin-company-showcase__progress-fill${budgetProgress >= 100 ? " is-complete" : ""}" style="width: ${budgetProgress.toFixed(2)}%"></span>
          </div>
        </div>
      `
      : `
        <div class="super-admin-company-showcase__progress sa-flash-showcase__budget-progress is-unlimited">
          <div class="super-admin-company-showcase__progress-meta">
            <span class="super-admin-company-showcase__progress-label">Budget limit</span>
            <strong class="super-admin-company-showcase__progress-value">No limit</strong>
          </div>
        </div>
      `;
    const statusClass = status === "active" ? "live" : status === "budget_exhausted" ? "ended" : status;
    const statusLabel = CAMPAIGN_STATUS_LABELS[status] || status;
    const usage = platformUsage;
    // Budget left and capped subsidy already show in the budget bar below.
    const campaignUsageStats = [
      [String(Number(usage.soldQty) || 0), "Sold", CAMPAIGN_STAT_ICONS.sold],
      [String(Number(usage.heldQty) || 0), "In carts", lucideShoppingCartSvg()],
      [formatMoney(usage.revenue || 0), "Revenue", CAMPAIGN_STAT_ICONS.revenue],
      ...(budget > 0 ? [] : [[formatMoney(usage.subsidyUsed || 0), "Subsidy used", CAMPAIGN_STAT_ICONS.subsidy]]),
    ];
    const accentStyle = platformAccentStyle(platformId);
    const platformName = campaignPlatformName(platformId);
    return `
      <article class="sa-flash-deal-showcase sa-showcase-card super-admin-company-showcase business-type-showcase${accentStyle ? " has-platform-accent" : ""}" data-flash-campaign-id="${escapeHtml(campaign.id || "")}" data-flash-campaign-platform="${escapeHtml(platformId)}"${accentStyle ? ` style="${escapeHtml(accentStyle)}"` : ""} role="listitem">
        <div class="business-type-showcase__hero">
          <div class="business-type-showcase__content">
            <div class="business-type-showcase__identity">
              <span class="business-type-showcase__icon-wrap">
                <span class="business-type-showcase__icon sa-flash-showcase__icon" aria-hidden="true">
                  <span class="business-type-showcase__icon-surface">${lucideZapSvg()}</span>
                </span>
              </span>
              <div class="business-type-showcase__copy">
                <div class="business-type-showcase__title-row">
                  <h3 class="business-type-showcase__name">${escapeHtml(name)}</h3>
                  <span class="sa-flash-deals-row__status is-${escapeHtml(statusClass)}">${escapeHtml(statusLabel)}</span>
                  <div class="super-admin-company-showcase__title-actions">
                    <div class="sa-flash-campaign-actions" aria-label="Quick actions for ${escapeHtml(name)}">
                      ${campaignActionButtons(campaign, platformId)}
                    </div>
                  </div>
                </div>
                <p class="business-type-showcase__tagline sa-flash-showcase__tagline sa-flash-showcase__code">${escapeHtml(platformName)} · ${escapeHtml(campaignFundingLabel(campaign))} · priority ${escapeHtml(String(campaign.priority ?? 100))}</p>
              </div>
            </div>
            <p class="business-type-showcase__description sa-flash-showcase__description sa-flash-showcase__description--campaign" title="If a listing already has a Seller Flash Deal, this campaign temporarily takes priority during overlap. The seller deal resumes after.">
              ${escapeHtml("Seller Flash Deals pause during overlap, then resume.")}
            </p>
            <div class="business-type-showcase__stats sa-flash-showcase__stats sa-flash-showcase__stats--campaign">
              <div class="business-type-showcase__stat sa-flash-showcase__stat--discount">
                <span class="business-type-showcase__stat-icon" aria-hidden="true">${CAMPAIGN_STAT_ICONS.discount}</span>
                <span class="business-type-showcase__stat-copy"><strong>${escapeHtml(discount)}</strong><span>Campaign discount</span></span>
              </div>
              ${campaignUsageStats
                .map(
                  ([value, label, icon]) => `
              <div class="business-type-showcase__stat">
                <span class="business-type-showcase__stat-icon" aria-hidden="true">${icon}</span>
                <span class="business-type-showcase__stat-copy"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></span>
              </div>`,
                )
                .join("")}
            </div>
            <div class="business-type-showcase__settings sa-flash-showcase__settings">
              ${uniqueIdSettingHtml(campaign.id, "Campaign ID")}
              <span class="business-type-showcase__setting sa-flash-showcase__setting">
                <span class="business-type-showcase__setting-label">Business types</span>
                <span class="business-type-showcase__setting-value"><strong>${escapeHtml(campaignBusinessTypesLabel(campaign))}</strong></span>
              </span>
            </div>
            ${budgetProgressHtml}
          </div>

          <div class="business-type-showcase__media sa-flash-showcase__media sa-flash-showcase__media--clock has-photo-fan" aria-label="${escapeHtml(`${name} campaign schedule`)}">
            ${campaignCompanyFanHtml(campaign, platformId, usage, name, productCount)}
            ${flashClockHtml(campaign, status, "Campaign")}
          </div>
        </div>
      </article>
    `;
  }

  function renderList() {
    refreshElements();
    syncPendingBadge();
    renderHeaderFilterSummary();
    const items = filteredItems();
    if (state.quickView === "platform") {
      const cards = filteredCampaignCards();
      if (els.total) els.total.textContent = `(${cards.length})`;
      if (!(els.list instanceof HTMLElement)) return;
      if (!cards.length) {
        els.list.innerHTML = state.campaigns.length
          ? '<div class="sa-flash-deals-empty-cell">No Platform campaigns match these filters.</div>'
          : '<div class="sa-flash-deals-empty-cell">No Platform campaigns yet.</div>';
        return;
      }
      els.list.innerHTML = cards
        .map(({ campaign, platformId }) => campaignShowcaseHtml(campaign, platformId))
        .join("");
      hydrateCampaignCompanyFans();
      startFlashClocks();
      return;
    }
    if (els.total) {
      els.total.textContent = `(${items.length}${
        items.length !== state.items.length ? ` / ${state.items.length}` : ""
      })`;
    }
    if (!(els.list instanceof HTMLElement)) return;
    if (!state.items.length) {
      renderPagination(0);
      els.list.innerHTML =
        '<div class="sa-flash-deals-empty-cell">No Flash Deals or campaigns yet.</div>';
      return;
    }
    if (!items.length) {
      renderPagination(0);
      els.list.innerHTML =
        '<div class="sa-flash-deals-empty-cell">No Flash Deals or campaigns match these filters.</div>';
      return;
    }
    renderPagination(items.length);
    els.list.innerHTML = pagedItems(items).map((deal) => flashDealShowcaseHtml(deal)).join("");
    hydrateFlashDealCompanyProfiles();
    startFlashClocks();
  }

  function scheduleSearchRender() {
    window.clearTimeout(state.searchTimer);
    state.searchTimer = window.setTimeout(() => {
      void load({ quiet: true, showSkeleton: true });
    }, 180);
  }

  function paintFlashDealSkeleton() {
    refreshElements();
    if (!(els.list instanceof HTMLElement)) return;
    const paint = window.SuperAdminShowcaseSkeleton?.paintList;
    if (typeof paint === "function") {
      paint(els.list, state.pageSize);
      return;
    }
    els.list.classList.add("is-skeleton-loading");
    els.list.innerHTML = Array.from({ length: 3 }, () =>
      '<article class="sa-showcase-skeleton" aria-hidden="true"></article>',
    ).join("");
  }

  function waitFlashDealSkeletonMs(ms) {
    const wait = window.SuperAdminShowcaseSkeleton?.wait;
    if (typeof wait === "function") return wait(ms);
    return new Promise((resolve) => window.setTimeout(resolve, Math.max(0, Number(ms) || 0)));
  }

  async function load({ quiet = false, showSkeleton } = {}) {
    refreshElements();
    const requestId = ++state.requestSeq;
    const startedAt = Date.now();
    const shouldShowSkeleton =
      showSkeleton === true || (!state.items.length && showSkeleton !== false);
    state.loading = true;
    if (shouldShowSkeleton) {
      paintFlashDealSkeleton();
    } else if (els.list instanceof HTMLElement && !quiet) {
      els.list.innerHTML =
        '<div class="sa-flash-deals-empty-cell">Loading Flash Deal &amp; Campaign…</div>';
    }
    try {
      const [dealsRes, campaignsRes] = await Promise.all([
        fetch("/api/super-admin/flash-deals", {
          headers: headers(),
          cache: "no-store",
        }),
        fetch("/api/super-admin/flash-deal-campaigns", {
          headers: headers(),
          cache: "no-store",
        }),
        loadCampaignTargeting(),
      ]);
      const payload = await dealsRes.json().catch(() => ({}));
      const campaignsPayload = await campaignsRes.json().catch(() => ({}));
      if (!dealsRes.ok) {
        throw new Error(payload.message || "Unable to load Flash Deal & Campaign.");
      }
      if (shouldShowSkeleton) {
        const remain = Math.max(
          0,
          (Number(window.SuperAdminShowcaseSkeleton?.minMs) || 1000) - (Date.now() - startedAt),
        );
        if (remain > 0) await waitFlashDealSkeletonMs(remain);
      }
      if (requestId !== state.requestSeq) return;
      state.items = Array.isArray(payload.deals) ? payload.deals : [];
      state.campaigns = Array.isArray(campaignsPayload.campaigns)
        ? campaignsPayload.campaigns
        : [];
      els.list?.classList.remove("is-skeleton-loading");
      renderList();
    } catch (error) {
      if (requestId !== state.requestSeq) return;
      if (els.list instanceof HTMLElement) {
        els.list.classList.remove("is-skeleton-loading");
        els.list.innerHTML = `<div class="sa-flash-deals-empty-cell">${escapeHtml(
          error instanceof Error ? error.message : "Unable to load Flash Deal & Campaign.",
        )}</div>`;
      }
      if (!quiet) {
        setFeedback(
          error instanceof Error ? error.message : "Unable to load Flash Deal & Campaign.",
          "error",
        );
      }
    } finally {
      if (requestId === state.requestSeq) state.loading = false;
    }
  }

  function setModalFeedback(message, tone = "") {
    refreshElements();
    if (!(els.modalFeedback instanceof HTMLElement)) return;
    const text = String(message || "").replace(/\s+/g, " ").trim();
    if (!text || typeof window.showSuperAdminSnackbar === "function") {
      els.modalFeedback.hidden = true;
      els.modalFeedback.textContent = "";
      els.modalFeedback.classList.remove("error", "notice");
    }
    if (!text) return;
    if (typeof window.showSuperAdminSnackbar === "function") {
      const mode = tone === "error" ? "error" : tone === "success" ? "success" : "warning";
      window.showSuperAdminSnackbar(tone === "error" ? "Check campaign" : "Campaign", text, mode);
      return;
    }
    els.modalFeedback.hidden = false;
    els.modalFeedback.textContent = text;
    els.modalFeedback.classList.toggle("error", tone === "error");
    els.modalFeedback.classList.toggle("notice", tone === "success" || tone === "notice");
  }

  function isSwitchCalendarOpen() {
    const timeCal = document.getElementById("switch-time-calendar");
    const dateCal = document.getElementById("switch-date-calendar");
    return (
      (timeCal instanceof HTMLElement && !timeCal.hidden) ||
      (dateCal instanceof HTMLElement && !dateCal.hidden)
    );
  }

  function isModalOpen() {
    return els.modalOverlay instanceof HTMLElement && !els.modalOverlay.hidden;
  }

  function currentFunding() {
    const value = String(els.fundingInput?.value || "platform").trim();
    return ["platform", "shared", "seller"].includes(value) ? value : "platform";
  }

  const FUNDING_LABELS = {
    platform: "Platform funded",
    seller: "Seller funded",
    shared: "Shared funding",
  };

  function setFunding(value) {
    refreshElements();
    const next = ["platform", "shared", "seller"].includes(value) ? value : "platform";
    if (els.fundingInput) els.fundingInput.value = next;
    document.querySelectorAll("[data-flash-deal-funding]").forEach((node) => {
      const active = node.getAttribute("data-flash-deal-funding") === next;
      node.classList.toggle("is-active", active);
      node.setAttribute("aria-selected", active ? "true" : "false");
    });
    const label = document.querySelector("[data-flash-deal-funding-label]");
    if (label) label.textContent = FUNDING_LABELS[next];
    if (els.shareField instanceof HTMLElement) els.shareField.hidden = next !== "shared";
    if (els.budgetField instanceof HTMLElement) els.budgetField.hidden = next === "seller";
    if (els.fundingHelper) {
      els.fundingHelper.textContent =
        next === "shared"
          ? "Platform and seller split the discount. Sellers are notified of their share."
          : next === "seller"
            ? "Sellers absorb the discount and receive the flash price. They are notified before it starts."
            : "Platform pays the full discount. Sellers still receive their regular price.";
    }
  }

  function setFreeShipping(enabled) {
    state.freeShipping = Boolean(enabled);
    const toggle = document.getElementById("flash-deal-free-shipping-toggle");
    if (toggle instanceof HTMLElement) {
      toggle.classList.toggle("is-active", state.freeShipping);
      toggle.setAttribute("aria-pressed", state.freeShipping ? "true" : "false");
    }
    const label = document.querySelector("[data-flash-deal-free-shipping-label]");
    if (label) label.textContent = state.freeShipping ? "On" : "Off";
  }

  function setFundingMenuOpen(open) {
    if (open) setChoiceMenuOpen("platform", false);
    setChoiceMenuOpen("funding", open);
  }

  function setPlatformMenuOpen(open) {
    if (open) setChoiceMenuOpen("funding", false);
    setChoiceMenuOpen("platform", open);
  }

  function platformChoices() {
    return platformList().map((platform) => ({
      id: platform.id,
      label: platform.status === "inactive" ? `${platform.name} (Inactive)` : platform.name,
    }));
  }

  /** Empty `ids` selects every platform when `emptyMeansAll`, otherwise clears the pick. */
  function setCampaignPlatformSelection(ids, { emptyMeansAll = false } = {}) {
    const list = (Array.isArray(ids) ? ids : [])
      .map(normalizePlatformId)
      .filter((id) => id && id !== "all");
    state.campaignPlatforms = list.length
      ? { all: false, ids: new Set(list) }
      : { all: emptyMeansAll, ids: new Set() };
  }

  function selectedCampaignPlatformIds() {
    const choices = platformChoices().map((choice) => choice.id);
    if (state.campaignPlatforms.all) return choices;
    return choices.filter((id) => state.campaignPlatforms.ids.has(id));
  }

  function campaignPlatformSummary() {
    if (state.campaignPlatforms.all) return "All platforms";
    return namesSummary(selectedCampaignPlatformIds().map(campaignPlatformName));
  }

  function toggleCampaignPlatform(platformId, checked) {
    const choices = platformChoices().map((choice) => choice.id);
    const ids = new Set(state.campaignPlatforms.all ? choices : state.campaignPlatforms.ids);
    if (checked) ids.add(platformId);
    else ids.delete(platformId);
    const all = choices.length > 0 && choices.every((id) => ids.has(id));
    state.campaignPlatforms = { all, ids: all ? new Set() : ids };
  }

  function renderPlatformMenu() {
    refreshElements();
    const menu = els.platformMenu;
    if (!(menu instanceof HTMLElement)) return;
    const choices = platformChoices();
    const checkedIds = new Set(selectedCampaignPlatformIds());
    const allChecked = state.campaignPlatforms.all;
    const row = (attr, label, checked, extraClass = "") => `
      <label class="sa-choice-option sa-voucher-platform-option${extraClass}${checked ? " is-checked" : ""}" role="option" aria-selected="${checked ? "true" : "false"}">
        <input type="checkbox" ${attr}${checked ? " checked" : ""} />
        <span>${escapeHtml(label)}</span>
      </label>`;
    menu.innerHTML = [
      row("data-flash-deal-platform-all", "Select all", allChecked, " is-select-all"),
      ...choices.map((choice) =>
        row(
          `data-flash-deal-platform-option="${escapeHtml(choice.id)}"`,
          choice.label,
          checkedIds.has(choice.id),
        ),
      ),
    ].join("");
    const allBox = menu.querySelector("[data-flash-deal-platform-all]");
    if (allBox instanceof HTMLInputElement) {
      allBox.indeterminate = !allChecked && checkedIds.size > 0;
    }
    if (els.platformLabel) {
      els.platformLabel.textContent = campaignPlatformSummary() || "Select platform";
    }
  }

  /** "all", a single platform id, "multi", or "" when nothing is checked. */
  function campaignPlatformValue() {
    if (state.campaignPlatforms.all) return "all";
    const ids = selectedCampaignPlatformIds();
    if (!ids.length) return "";
    return ids.length === 1 ? ids[0] : "multi";
  }

  function isActiveStatus(value) {
    return !["inactive", "deactivated", "disabled", "off"].includes(
      String(value || "active").trim().toLowerCase(),
    );
  }

  function campaignBusinessTypes() {
    const value = campaignPlatformValue();
    if (!value) return [];
    const showPlatformName = value === "all" || value === "multi";
    const allowed = new Set(value === "multi" ? selectedCampaignPlatformIds() : []);
    const types = [];
    const seen = new Set();
    for (const type of state.storeTypes) {
      if (!isActiveStatus(type.status)) continue;
      const typePlatform = normalizePlatformId(type.platformId) || "shop";
      if (value === "multi" && !allowed.has(typePlatform)) continue;
      if (!showPlatformName && typePlatform !== value) continue;
      const id = String(type.id || type.name || "").trim();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const baseName = String(type.name || "Business type");
      types.push({
        id,
        platformId: typePlatform,
        key: id.toLowerCase(),
        nameKey: baseName.trim().toLowerCase(),
        baseName,
        name: showPlatformName ? `${baseName} · ${campaignPlatformName(typePlatform)}` : baseName,
        iconImageUrl: String(type.iconImageUrl || type.iconUrl || type.businessTypeIconUrl || "").trim(),
      });
    }
    return types.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  }

  /** @param {string[] | null} savedIds ids to restore on edit, or null to select every type. */
  function resetBusinessTypeSelection(savedIds = null) {
    state.businessTypes = new Set();
    state.businessTypeKnown = new Set();
    state.businessTypeSearch = "";
    state.businessTypeHydrate =
      Array.isArray(savedIds) && savedIds.length
        ? new Set(savedIds.map((id) => String(id || "").trim().toLowerCase()).filter(Boolean))
        : null;
  }

  /** Newly visible types start selected; an edit restores its saved picks once types load. */
  function syncBusinessTypeAutoSelect(types) {
    if (!types.length) return;
    const saved = state.businessTypeHydrate;
    for (const type of types) {
      if (state.businessTypeKnown.has(type.id)) continue;
      state.businessTypeKnown.add(type.id);
      if (saved && !saved.has(type.key) && !saved.has(type.nameKey)) continue;
      state.businessTypes.add(type.id);
    }
    state.businessTypeHydrate = null;
  }

  function businessTypeChipHtml(type, selected) {
    const icon = type.iconImageUrl
      ? `<img src="${escapeHtml(type.iconImageUrl)}" alt="" />`
      : window.SwitchDefaultIcons?.svg?.("store", { size: 17 }) ||
        lucideIconSvg(
          "store",
          '<path d="M15 21v-5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5"/><path d="M17.774 10.31a1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.451 0 1.12 1.12 0 0 0-1.548 0 2.5 2.5 0 0 1-3.452 0 1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.77-3.248l2.889-4.184A2 2 0 0 1 7 2h10a2 2 0 0 1 1.653.873l2.895 4.192a2.5 2.5 0 0 1-3.774 3.244"/><path d="M4 10.95V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8.05"/>',
        );
    const actionIcon = selected
      ? '<svg class="sa-voucher-bt-chip__action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>'
      : '<svg class="sa-voucher-bt-chip__action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
    const attr = selected ? "data-flash-deal-bt-remove" : "data-flash-deal-bt-add";
    const label = selected ? `Remove ${type.name}` : `Add ${type.name}`;
    return `<button type="button" class="sa-voucher-bt-chip${selected ? " is-selected" : " is-available"}" ${attr}="${escapeHtml(type.id)}" aria-label="${escapeHtml(label)}"><span class="sa-voucher-bt-chip__type-icon" aria-hidden="true">${icon}</span><span class="sa-voucher-bt-chip__name">${escapeHtml(type.name)}</span>${actionIcon}</button>`;
  }

  function renderBusinessTypePicker() {
    refreshElements();
    const value = campaignPlatformValue();
    const types = campaignBusinessTypes();
    syncBusinessTypeAutoSelect(types);
    const platformName = campaignPlatformSummary();
    const selected = types.filter((type) => state.businessTypes.has(type.id));
    const query = state.businessTypeSearch.trim().toLowerCase();
    const available = types.filter(
      (type) =>
        !state.businessTypes.has(type.id) && (!query || type.name.toLowerCase().includes(query)),
    );
    const remaining = types.length - selected.length;
    if (els.btHelper instanceof HTMLElement) {
      let helper = "";
      if (!value) helper = "Select a platform to see its business types.";
      else if (!types.length) helper = `${platformName} has no business types yet, so every seller on it is invited.`;
      else if (!selected.length) helper = "";
      else if (selected.length === types.length) helper = `Open to every business type in ${platformName}, including ones added later.`;
      else helper = "Only sellers with these business types are invited and can register listings.";
      els.btHelper.textContent = helper;
      els.btHelper.hidden = !helper;
    }
    const showPicker = Boolean(value) && types.length > 0;
    if (els.btPicker instanceof HTMLElement) els.btPicker.hidden = !showPicker;
    if (!showPicker) return;
    if (els.btSelected instanceof HTMLElement) {
      els.btSelected.innerHTML = selected.length
        ? selected.map((type) => businessTypeChipHtml(type, true)).join("")
        : '<p class="sa-voucher-bt-picker__empty">Nothing selected yet. Add at least one below.</p>';
    }
    if (els.btCount) {
      els.btCount.textContent = remaining
        ? `${remaining} ${remaining === 1 ? "business type" : "business types"} in ${platformName}`
        : `All ${types.length} business types in ${platformName} are selected`;
    }
    if (els.btList instanceof HTMLElement) {
      els.btList.innerHTML = available.length
        ? available.map((type) => businessTypeChipHtml(type, false)).join("")
        : `<p class="sa-voucher-bt-picker__empty">${
            query && remaining ? "No business types match your search." : "Everything is already added."
          }</p>`;
    }
    if (els.btAll instanceof HTMLElement) {
      els.btAll.textContent = remaining ? "Add all" : "Remove all";
      els.btAll.dataset.flashDealBtAll = remaining ? "add" : "remove";
    }
  }

  function applyCampaignPlatformChange() {
    renderPlatformMenu();
    renderBusinessTypePicker();
  }

  /** Empty list means every current and future business type on the chosen platforms. */
  function selectedBusinessTypeIdsForPayload() {
    const types = campaignBusinessTypes();
    const selected = types.filter((type) => state.businessTypes.has(type.id));
    if (!types.length || selected.length === types.length) return [];
    return selected.map((type) => type.id);
  }

  function setChoiceMenuOpen(choice, open) {
    const dropdown = document.querySelector(`[data-flash-deal-choice="${choice}"]`);
    if (!(dropdown instanceof HTMLElement)) return;
    dropdown.classList.toggle("is-open", open);
    dropdown.querySelector("[aria-expanded]")?.setAttribute("aria-expanded", String(open));
    const menu = dropdown.querySelector(".sa-choice-menu");
    if (menu instanceof HTMLElement) menu.hidden = !open;
    dropdown.classList.remove("is-drop-up");
    if (!open || !(menu instanceof HTMLElement)) return;
    menu.style.maxHeight = "";
    const trigger = dropdown.querySelector("[aria-expanded]");
    const scroller = dropdown.closest(".super-admin-store-type-modal__content");
    const bounds = scroller instanceof HTMLElement
      ? scroller.getBoundingClientRect()
      : { top: 0, bottom: window.innerHeight };
    const rect = trigger.getBoundingClientRect();
    const spacing = 14;
    const below = Math.min(bounds.bottom, window.innerHeight) - rect.bottom - spacing;
    const above = rect.top - Math.max(bounds.top, 0) - spacing;
    const needed = menu.scrollHeight;
    const dropUp = needed > below && above > below;
    dropdown.classList.toggle("is-drop-up", dropUp);
    const room = dropUp ? above : below;
    if (needed > room) menu.style.maxHeight = `${Math.max(96, Math.floor(room))}px`;
  }

  function setPickerDate(picker, input, value) {
    if (!(picker instanceof HTMLElement) || !(input instanceof HTMLInputElement)) return;
    // SwitchDatePicker.setValue rejects past dates; edits of live campaigns need them.
    input.value = String(value || "");
    window.SwitchDatePicker?.sync?.(picker);
  }

  function setPickerTime(picker, value) {
    if (!(picker instanceof HTMLElement)) return;
    window.SwitchTimePicker?.setValue?.(picker, String(value || ""), { emit: false });
  }

  function setModalStep(step) {
    refreshElements();
    state.modalStep = step === 2 ? 2 : 1;
    document.querySelectorAll("[data-flash-deal-step-panel]").forEach((panel) => {
      if (!(panel instanceof HTMLElement)) return;
      panel.hidden = Number(panel.getAttribute("data-flash-deal-step-panel")) !== state.modalStep;
    });
    document.querySelectorAll("[data-flash-deal-step-indicator]").forEach((node) => {
      const value = Number(node.getAttribute("data-flash-deal-step-indicator"));
      node.classList.toggle("is-active", value === state.modalStep);
      node.classList.toggle("is-done", value < state.modalStep);
      node.classList.toggle("is-complete", value < state.modalStep);
      if (value === state.modalStep) node.setAttribute("aria-current", "step");
      else node.removeAttribute("aria-current");
    });
    document.querySelectorAll("[data-flash-deal-step-line]").forEach((line) => {
      line.classList.toggle(
        "is-complete",
        Number(line.getAttribute("data-flash-deal-step-line")) < state.modalStep,
      );
    });
    const onReview = state.modalStep === 2;
    if (els.nextButton instanceof HTMLButtonElement) els.nextButton.hidden = onReview;
    if (els.backButton instanceof HTMLButtonElement) els.backButton.hidden = state.modalStep === 1;
    if (els.submitButton instanceof HTMLButtonElement) els.submitButton.hidden = !onReview;
    if (els.draftButton instanceof HTMLButtonElement) {
      const canDraft =
        state.editMode !== "edit" || state.editingStatus === "draft";
      els.draftButton.hidden = !onReview || !canDraft;
    }
    if (els.footerNote) {
      els.footerNote.textContent =
        state.modalStep === 1
          ? "Sellers register their own listings after you publish."
          : "All sellers are invited when you publish. Registered sellers hear about changes, pauses, and the end.";
    }
  }

  function bindPickers() {
    refreshElements();
    if (els.startDatePicker instanceof HTMLElement) {
      window.SwitchDatePicker?.bind(els.startDatePicker, {
        minDate: "today",
        allowClear: true,
        requireApply: true,
      });
    }
    if (els.endDatePicker instanceof HTMLElement) {
      window.SwitchDatePicker?.bind(els.endDatePicker, {
        minDate: "today",
        allowClear: true,
        requireApply: true,
      });
    }
    if (els.startTimePicker instanceof HTMLElement) {
      window.SwitchTimePicker?.bind(els.startTimePicker);
    }
    if (els.endTimePicker instanceof HTMLElement) {
      window.SwitchTimePicker?.bind(els.endTimePicker);
    }
    if (state.pickersBound) return;
    state.pickersBound = true;
    els.startDateInput?.addEventListener("change", () => {
      if (!String(els.startDateInput?.value || "").trim()) return;
      window.setTimeout(() => {
        window.SwitchTimePicker?.open(els.startTimePicker);
      }, 0);
    });
    els.endDateInput?.addEventListener("change", () => {
      if (!String(els.endDateInput?.value || "").trim()) return;
      window.setTimeout(() => {
        window.SwitchTimePicker?.open(els.endTimePicker);
      }, 0);
    });
  }

  function resetCreateForm() {
    refreshElements();
    state.saving = false;
    state.editingRegisteredCount = 0;
    state.editingPlatformCount = 0;
    if (els.form instanceof HTMLFormElement) els.form.reset();
    if (els.startDatePicker instanceof HTMLElement) {
      window.SwitchDatePicker?.setValue?.(els.startDatePicker, "", { emit: false });
    }
    if (els.endDatePicker instanceof HTMLElement) {
      window.SwitchDatePicker?.setValue?.(els.endDatePicker, "", { emit: false });
    }
    if (els.startTimePicker instanceof HTMLElement) {
      window.SwitchTimePicker?.setValue?.(els.startTimePicker, "", { emit: false });
    }
    if (els.endTimePicker instanceof HTMLElement) {
      window.SwitchTimePicker?.setValue?.(els.endTimePicker, "", { emit: false });
    }
    if (els.submitButton instanceof HTMLButtonElement) {
      els.submitButton.disabled = false;
    }
    if (els.draftButton instanceof HTMLButtonElement) {
      els.draftButton.disabled = false;
    }
    if (els.priorityInput) els.priorityInput.value = "100";
    if (els.shareInput) els.shareInput.value = "50";
    [
      els.displayLabelInput,
      els.maxDiscountInput,
      els.budgetInput,
      els.notesInput,
    ].forEach((field) => {
      if (field) field.value = "";
    });
    setFundingMenuOpen(false);
    setPlatformMenuOpen(false);
    setFunding("platform");
    setFreeShipping(false);
    setCampaignPlatformSelection([]);
    resetBusinessTypeSelection();
    if (els.btSearch instanceof HTMLInputElement) els.btSearch.value = "";
    applyCampaignPlatformChange();
    if (els.review instanceof HTMLElement) els.review.innerHTML = "";
    setModalStep(1);
    setModalFeedback("");
  }

  function isoToLocalParts(iso) {
    const date = new Date(String(iso || ""));
    if (Number.isNaN(date.getTime())) return { date: "", time: "" };
    const pad = (value) => String(value).padStart(2, "0");
    return {
      date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
      time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
    };
  }

  function applyModalMode() {
    refreshElements();
    const titles = {
      create: "Create Platform Campaign",
      edit: "Edit Platform Campaign",
      duplicate: "Duplicate Platform Campaign",
    };
    if (els.modalTitle) els.modalTitle.textContent = titles[state.editMode] || titles.create;
    if (els.submitLabel) {
      els.submitLabel.textContent =
        state.editMode === "edit"
          ? state.editingStatus === "draft"
            ? "Publish"
            : "Save changes"
          : "Create Campaign";
    }
  }

  async function prefillFromCampaign(campaign, mode) {
    refreshElements();
    const pick = (field, value) => {
      if (field) field.value = value === undefined || value === null ? "" : String(value);
    };
    pick(els.campaignNameInput, mode === "duplicate" ? `Copy of ${campaign.name || ""}`.slice(0, 80) : campaign.name);
    pick(els.displayLabelInput, campaign.displayLabel);
    pick(els.priceInput, campaign.discountValue);
    pick(els.maxDiscountInput, Number(campaign.maxDiscountAmount) > 0 ? campaign.maxDiscountAmount : "");
    setFreeShipping(campaign.freeShipping === true);
    pick(els.budgetInput, Number(campaign.budgetAmount) > 0 ? campaign.budgetAmount : "");
    pick(els.priorityInput, campaign.priority || 100);
    pick(els.notesInput, campaign.notes);
    setFunding(campaign.fundingSource || "platform");
    if (campaign.fundingSource === "shared") pick(els.shareInput, campaign.platformSharePct || 50);
    setCampaignPlatformSelection(campaignPlatformIds(campaign), { emptyMeansAll: true });
    resetBusinessTypeSelection(
      Array.isArray(campaign.businessTypeIds) ? campaign.businessTypeIds : null,
    );
    applyCampaignPlatformChange();
    if (mode === "edit") {
      const start = isoToLocalParts(campaign.startsAt);
      const end = isoToLocalParts(campaign.endsAt);
      setPickerDate(els.startDatePicker, els.startDateInput, start.date);
      setPickerTime(els.startTimePicker, start.time);
      setPickerDate(els.endDatePicker, els.endDateInput, end.date);
      setPickerTime(els.endTimePicker, end.time);
    }
    state.editingRegisteredCount =
      mode === "edit" ? Number(campaign.productCount) || 0 : 0;
    state.editingPlatformCount = mode === "edit" ? campaignPlatformIds(campaign).length : 0;
  }

  async function openCreateModal(mode = "create", campaign = null) {
    refreshElements();
    if (!(els.modalOverlay instanceof HTMLElement)) {
      setFeedback("Flash Deal create dialog is missing. Refresh the page.", "error");
      return;
    }
    state.modalTrigger =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : els.addButton;
    if (state.closeTimer) {
      window.clearTimeout(state.closeTimer);
      state.closeTimer = 0;
    }
    bindPickers();
    state.editMode = campaign && (mode === "edit" || mode === "duplicate") ? mode : "create";
    state.editingId = state.editMode === "edit" ? String(campaign.id || "") : "";
    state.editingStatus = state.editMode === "edit" ? String(campaign.status || "") : "";
    resetCreateForm();
    applyModalMode();
    if (campaign && state.editMode !== "create") {
      void prefillFromCampaign(campaign, state.editMode);
    }
    void loadCampaignTargeting({ force: !state.storeTypes.length }).then(() => {
      if (isModalOpen()) applyCampaignPlatformChange();
    });
    els.modalOverlay.hidden = false;
    els.modalOverlay.setAttribute("aria-hidden", "false");
    els.addButton?.setAttribute("aria-expanded", "true");
    document.body.classList.add("super-admin-voucher-modal-open");
    window.requestAnimationFrame(() => {
      els.modalOverlay?.classList.add("is-open");
      els.campaignNameInput?.focus();
    });
  }

  function closeCreateModal() {
    refreshElements();
    if (!(els.modalOverlay instanceof HTMLElement)) return;
    window.SwitchDatePicker?.close();
    window.SwitchTimePicker?.close();
    els.modalOverlay.classList.remove("is-open");
    els.modalOverlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("super-admin-voucher-modal-open");
    els.addButton?.setAttribute("aria-expanded", "false");
    setModalFeedback("");
    state.saving = false;
    const trigger = state.modalTrigger || els.addButton;
    state.modalTrigger = null;
    if (state.closeTimer) window.clearTimeout(state.closeTimer);
    state.closeTimer = window.setTimeout(() => {
      state.closeTimer = 0;
      if (els.modalOverlay) els.modalOverlay.hidden = true;
      if (trigger instanceof HTMLElement) {
        try {
          trigger.focus({ preventScroll: true });
        } catch (_) {
          trigger.focus();
        }
      }
    }, 180);
  }

  function combineLocalIso(dateValue, timeValue) {
    const date = String(dateValue || "").trim();
    const time = String(timeValue || "").trim();
    if (!date || !time) return "";
    const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const timeMatch = time.match(/^(\d{1,2}):(\d{2})/);
    if (!match || !timeMatch) return "";
    const year = Number(match[1]);
    const monthIndex = Number(match[2]) - 1;
    const day = Number(match[3]);
    const hours = Number(timeMatch[1]);
    const minutes = Number(timeMatch[2]);
    const dt = new Date(year, monthIndex, day, hours, minutes, 0, 0);
    if (
      dt.getFullYear() !== year ||
      dt.getMonth() !== monthIndex ||
      dt.getDate() !== day ||
      Number.isNaN(dt.getTime())
    ) {
      return "";
    }
    return dt.toISOString();
  }

  async function runCampaignAction(campaignId, action, platformId = "") {
    const id = String(campaignId || "").trim();
    const nextAction = String(action || "").trim();
    if (!id || !nextAction) return;
    if (nextAction === "details") {
      await openRegisteredDrawer(id, platformId);
      return;
    }
    const campaign =
      state.campaigns.find((entry) => String(entry?.id || "").trim() === id) || null;
    if (nextAction === "edit" || nextAction === "duplicate") {
      if (!campaign) {
        setFeedback("Campaign not found. Refresh and try again.", "error");
        return;
      }
      await openCreateModal(nextAction, campaign);
      return;
    }
    if (!["pause", "resume", "end", "publish"].includes(nextAction)) return;
    const name = campaign?.name ? `“${campaign.name}”` : "this campaign";
    const isDraft = String(campaign?.status || "").toLowerCase() === "draft";
    const prompts = {
      end: isDraft
        ? `Discard ${name}? The draft will not go live.`
        : `End ${name} now? Flash prices stop immediately, carts holding campaign items are released, and affected sellers are notified.`,
      pause: `Pause ${name}? Flash prices stop until you resume it, and affected sellers are notified.`,
      publish: `Publish ${name}? Every active seller is invited to register listings, and the campaign goes live at its start time.`,
    };
    const cardCount = campaign ? campaignCardPlatformIds(campaign).length : 1;
    const sharedNote =
      cardCount > 1 ? `\n\nThis applies to all ${cardCount} platform cards of this campaign.` : "";
    if (prompts[nextAction] && !window.confirm(`${prompts[nextAction]}${sharedNote}`)) return;
    try {
      const response = await fetch(
        `/api/super-admin/flash-deal-campaigns/${encodeURIComponent(id)}/${encodeURIComponent(nextAction)}`,
        { method: "POST", headers: headers() },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "Unable to update campaign.");
      }
      delete state.campaignDetails[id];
      setFeedback(data.message || "Campaign updated.", "success");
      await load({ quiet: true, showSkeleton: true });
      if (state.registeredDrawerCampaignId === id) {
        await loadCampaignDetail(id, { force: true });
        renderRegisteredDrawer();
      }
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "Unable to update campaign.",
        "error",
      );
    }
  }

  function collectCreatePayload() {
    refreshElements();
    const fundingSource = currentFunding();
    return {
      name: String(els.campaignNameInput?.value || "").trim(),
      displayLabel: String(els.displayLabelInput?.value || "").trim(),
      platformIds: state.campaignPlatforms.all ? [] : selectedCampaignPlatformIds(),
      businessTypeIds: selectedBusinessTypeIdsForPayload(),
      discountType: "percentage",
      discountValue: String(els.priceInput?.value || "").trim(),
      maxDiscountAmount: String(els.maxDiscountInput?.value || "").trim(),
      freeShipping: state.freeShipping === true,
      budgetAmount: fundingSource === "seller" ? "" : String(els.budgetInput?.value || "").trim(),
      fundingSource,
      platformSharePct:
        fundingSource === "shared" ? String(els.shareInput?.value || "").trim() : "",
      priority: String(els.priorityInput?.value || "100").trim() || "100",
      startsAt: combineLocalIso(els.startDateInput?.value, els.startTimeInput?.value),
      endsAt: combineLocalIso(els.endDateInput?.value, els.endTimeInput?.value),
      notes: String(els.notesInput?.value || "").trim(),
    };
  }

  function campaignTargetPlatformIds() {
    return state.campaignPlatforms.all
      ? campaignCardPlatformIds({ platformIds: [] })
      : selectedCampaignPlatformIds();
  }

  /** New campaigns get one payload per platform, so each platform has its own campaign ID and card. */
  function splitCampaignPayloads(payload) {
    if (state.editMode === "edit") return { payloads: [payload], issue: "" };
    const targets = campaignTargetPlatformIds();
    if (targets.length < 2) {
      return { payloads: [{ ...payload, platformIds: targets }], issue: "" };
    }
    const allTypes = campaignBusinessTypes();
    const payloads = [];
    for (const platformId of targets) {
      const types = allTypes.filter((type) => type.platformId === platformId);
      const selected = types.filter((type) => state.businessTypes.has(type.id));
      if (types.length && !selected.length) {
        const label = campaignPlatformName(platformId);
        return { payloads: [], issue: `Add at least one ${label} business type, or uncheck ${label}.` };
      }
      payloads.push({
        ...payload,
        platformIds: [platformId],
        businessTypeIds:
          !types.length || selected.length === types.length ? [] : selected.map((type) => type.id),
      });
    }
    return { payloads, issue: "" };
  }

  function failDetails(message, field) {
    setModalFeedback(message, "error");
    field?.focus?.();
    return null;
  }

  function validateDetailsStep() {
    const payload = collectCreatePayload();
    if (!payload.name) return failDetails("Campaign name is required.", els.campaignNameInput);
    if (payload.name.length > 80) {
      return failDetails("Campaign name must be 80 characters or fewer.", els.campaignNameInput);
    }
    if (payload.displayLabel.length > 60) {
      return failDetails("Buyer-facing label must be 60 characters or fewer.", els.displayLabelInput);
    }
    const platformValue = campaignPlatformValue();
    if (!platformValue) {
      return failDetails("Select at least one platform.", els.platformToggle);
    }
    if (
      state.editMode === "edit" &&
      state.editingPlatformCount === 1 &&
      (platformValue === "all" || platformValue === "multi")
    ) {
      return failDetails(
        "This campaign runs on one platform. Duplicate it to run it on other platforms.",
        els.platformToggle,
      );
    }
    const businessTypes = campaignBusinessTypes();
    if (businessTypes.length && !businessTypes.some((type) => state.businessTypes.has(type.id))) {
      return failDetails("Add at least one business type.", els.btSearch);
    }
    const split = splitCampaignPayloads(payload);
    if (split.issue) return failDetails(split.issue, els.btSearch);
    if (!payload.startsAt || !payload.endsAt) {
      return failDetails("Start and end date/time are required.");
    }
    const startMs = Date.parse(payload.startsAt);
    const endMs = Date.parse(payload.endsAt);
    if (endMs <= startMs) return failDetails("End time must be after start time.");
    if (endMs - startMs < 15 * 60 * 1000) {
      return failDetails("Campaigns must run for at least 15 minutes.");
    }
    if (endMs - startMs > 30 * 24 * 60 * 60 * 1000) {
      return failDetails("Campaigns can run for at most 30 days.");
    }
    if (endMs <= Date.now()) return failDetails("End time must be in the future.");
    const value = Number(payload.discountValue);
    if (!payload.discountValue) return failDetails("Discount value is required.", els.priceInput);
    if (!Number.isFinite(value) || value <= 0) {
      return failDetails("Discount value must be greater than 0.", els.priceInput);
    }
    if (value >= 100) return failDetails("Percentage discount must be below 100.", els.priceInput);
    if (payload.maxDiscountAmount && !(Number(payload.maxDiscountAmount) > 0)) {
      return failDetails("Max discount must be greater than 0, or leave it blank.", els.maxDiscountInput);
    }
    if (payload.budgetAmount && !(Number(payload.budgetAmount) > 0)) {
      return failDetails("Budget must be greater than 0, or leave it blank.", els.budgetInput);
    }
    if (payload.fundingSource === "shared") {
      const share = Number(payload.platformSharePct);
      if (!Number.isFinite(share) || share < 1 || share > 99) {
        return failDetails("Platform share must be between 1 and 99 percent.", els.shareInput);
      }
    }
    const priority = Number(payload.priority);
    if (!Number.isInteger(priority) || priority < 1 || priority > 1000) {
      return failDetails("Priority must be a whole number from 1 to 1000.", els.priorityInput);
    }
    if (payload.notes.length > 500) {
      return failDetails("Notes must be 500 characters or fewer.", els.notesInput);
    }
    setModalFeedback("");
    return payload;
  }

  function renderReview() {
    refreshElements();
    if (!(els.review instanceof HTMLElement)) return;
    const payload = collectCreatePayload();
    const start = payload.startsAt ? new Date(payload.startsAt) : null;
    const end = payload.endsAt ? new Date(payload.endsAt) : null;
    const when = (date) =>
      date && !Number.isNaN(date.getTime())
        ? date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
        : "—";
    const fundingText =
      payload.fundingSource === "shared"
        ? `Shared — platform ${payload.platformSharePct}%, seller ${100 - Number(payload.platformSharePct)}%`
        : payload.fundingSource === "seller"
          ? "Seller funded"
          : "Platform funded";
    const budget = Number(payload.budgetAmount) || 0;
    const registered = state.editMode === "edit" ? state.editingRegisteredCount : 0;
    const splitCount = splitCampaignPayloads(payload).payloads.length;
    const targetNames = campaignTargetPlatformIds().map(campaignPlatformName);
    const fundingRows = [
      ["Funding", fundingText],
      [
        "Budget",
        budget > 0
          ? `${formatMoney(budget)}${splitCount > 1 ? " per platform campaign" : ""}`
          : payload.fundingSource === "seller"
            ? "Not needed"
            : "No cap",
      ],
      ["Priority", payload.priority],
    ];
    if (state.editMode === "edit") fundingRows.push(["Registered listings", String(registered)]);
    const sections = [
      [
        "Details",
        "flash-deal-campaign-name",
        [
          ["Campaign", payload.name],
          ["Buyer label", payload.displayLabel || "Flash Deal"],
          [
            "Platform",
            splitCount > 1
              ? `${targetNames.join(", ")} (${splitCount} separate campaigns)`
              : campaignPlatformsLabel(payload),
          ],
          ["Business types", campaignBusinessTypesLabel(payload)],
          ["Starts", when(start)],
          ["Ends", when(end)],
        ],
      ],
      [
        "Offer",
        "flash-deal-price-input",
        [
          [
            "Discount",
            `${payload.discountValue}% off${Number(payload.maxDiscountAmount) > 0 ? ` · max ${formatMoney(payload.maxDiscountAmount)} per unit` : ""}`,
          ],
          ["Free shipping", payload.freeShipping ? "Yes, on top of the discount" : "No"],
        ],
      ],
      ["Funding & priority", "flash-deal-funding-toggle", fundingRows],
    ];
    const note =
      state.editMode === "edit"
        ? "Registered listings stay in the campaign. Sellers with registered listings are notified about your changes."
        : `${
            splitCount > 1
              ? `Each platform gets its own campaign ID and card, and only sellers on that platform are invited. `
              : ""
          }Every seller gets an inbox notice and a Flash Sale banner in their workspace. Sellers register their own listings until the campaign ends.`;
    els.review.innerHTML = `
      <div class="sa-voucher-review__sections">
        ${sections
          .map(
            ([title, focusId, rows]) => `
              <section class="sa-voucher-review__section">
                <header class="sa-voucher-review__section-head">
                  <strong>${escapeHtml(title)}</strong>
                  <button type="button" class="sa-voucher-review__edit" data-flash-deal-review-edit="${escapeHtml(focusId)}">Edit</button>
                </header>
                <dl>${rows
                  .map(
                    ([label, value]) =>
                      `<div class="sa-voucher-review__row"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(String(value ?? "").trim() || "—")}</dd></div>`,
                  )
                  .join("")}</dl>
              </section>`,
          )
          .join("")}
      </div>
      ${
        payload.fundingSource !== "platform"
          ? '<ul class="sa-flash-deal-review__warnings"><li>Sellers carry part of the discount. They see the funding split before they register.</li></ul>'
          : ""
      }
      <p class="sa-flash-deal-review__note">${escapeHtml(note)}</p>
    `;
  }

  function goToReviewStep() {
    if (!validateDetailsStep()) {
      setModalStep(1);
      return;
    }
    renderReview();
    setModalStep(2);
  }

  function goToNextStep() {
    if (state.modalStep === 1) goToReviewStep();
  }

  function goToPreviousStep() {
    if (state.modalStep === 2) {
      setModalStep(1);
      els.campaignNameInput?.focus();
    }
    setModalFeedback("");
  }

  function setSavingState(saving) {
    state.saving = saving;
    [els.submitButton, els.draftButton].forEach((button) => {
      if (button instanceof HTMLButtonElement) button.disabled = saving;
    });
  }

  async function submitCreate({ saveAsDraft = false } = {}) {
    if (state.saving) return;
    if (state.modalStep !== 2) {
      goToNextStep();
      return;
    }
    const payload = validateDetailsStep();
    if (!payload) {
      setModalStep(1);
      return;
    }
    const editing = state.editMode === "edit" && state.editingId;
    const publishDraft = editing && state.editingStatus === "draft" && !saveAsDraft;
    setSavingState(true);
    setModalFeedback("");
    try {
      const url = editing
        ? `/api/super-admin/flash-deal-campaigns/${encodeURIComponent(state.editingId)}`
        : "/api/super-admin/flash-deal-campaigns";
      const { payloads } = splitCampaignPayloads(payload);
      const body = editing
        ? payload
        : payloads.length > 1
          ? { campaigns: payloads.map((entry) => ({ ...entry, saveAsDraft })) }
          : { ...payloads[0], saveAsDraft };
      const response = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: headers({ "Content-Type": "application/json" }),
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "Unable to save campaign.");
      }
      let message = data.message || (editing ? "Campaign updated." : "Platform campaign scheduled.");
      if (publishDraft) {
        const publishResponse = await fetch(
          `/api/super-admin/flash-deal-campaigns/${encodeURIComponent(state.editingId)}/publish`,
          { method: "POST", headers: headers() },
        );
        const publishData = await publishResponse.json().catch(() => ({}));
        if (!publishResponse.ok) {
          throw new Error(publishData.message || "Draft saved, but it could not be published.");
        }
        message = publishData.message || "Campaign published.";
      }
      if (editing) delete state.campaignDetails[state.editingId];
      closeCreateModal();
      const overlap = (Array.isArray(data.createdCampaigns) ? data.createdCampaigns : [data.campaign])
        .reduce((sum, entry) => sum + (Number(entry?.overlapCount) || 0), 0);
      setFeedback(
        overlap && !saveAsDraft
          ? `${message} ${overlap} listing(s) already have a Seller Flash Deal and will be temporarily overridden.`
          : message,
        "success",
      );
      applyQuickView("platform", { reload: false });
      await load({ quiet: true, showSkeleton: true });
    } catch (error) {
      setModalFeedback(
        error instanceof Error ? error.message : "Unable to save campaign.",
        "error",
      );
    } finally {
      setSavingState(false);
    }
  }

  function bind() {
    refreshElements();
    if (state.bound) return;
    state.bound = true;
    syncPanelFilterControls();
    syncQuickViewNav();
    renderHeaderFilterSummary();
    bindPickers();

    els.filterToggle?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setFilterOpen(els.filterToggle.getAttribute("aria-expanded") !== "true");
    });
    els.filterApply?.addEventListener("click", (event) => {
      event.preventDefault();
      setFilterOpen(false);
      els.filterToggle?.focus();
    });
    els.filterClear?.addEventListener("click", (event) => {
      event.preventDefault();
      clearFilters();
    });

    document.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;
      const viewListingButton = target.closest("[data-flash-view-listing]");
      if (viewListingButton instanceof HTMLButtonElement) {
        event.preventDefault();
        event.stopPropagation();
        const productId = viewListingButton.getAttribute("data-flash-view-listing") || "";
        if (typeof window.SuperAdminShowListingDrawer === "function") {
          void window.SuperAdminShowListingDrawer(productId, viewListingButton);
        } else {
          window.SuperAdminOpenListingDetails?.(productId);
        }
        return;
      }
      const pageButton = target.closest("[data-super-admin-flash-deals-page]");
      if (pageButton instanceof HTMLButtonElement) {
        event.preventDefault();
        event.stopPropagation();
        if (pageButton.disabled) return;
        const nextPage = Number(pageButton.dataset.superAdminFlashDealsPage);
        if (!Number.isInteger(nextPage) || nextPage < 1) return;
        goToFlashDealPage(nextPage);
        return;
      }
      const quickViewButton = target.closest(
        "[data-super-admin-flash-deal-quick-view]",
      );
      if (quickViewButton) {
        event.preventDefault();
        applyQuickView(
          quickViewButton.getAttribute("data-super-admin-flash-deal-quick-view"),
        );
        return;
      }
      if (target.closest("[data-super-admin-flash-deal-add]")) {
        event.preventDefault();
        openCreateModal();
        return;
      }
      if (
        target.closest("#flash-deal-modal-close-button, #flash-deal-modal-cancel-button")
      ) {
        event.preventDefault();
        closeCreateModal();
        return;
      }
      if (target.closest("#flash-deal-modal-next-button")) {
        event.preventDefault();
        goToNextStep();
        return;
      }
      if (target.closest("#flash-deal-modal-back-button")) {
        event.preventDefault();
        goToPreviousStep();
        return;
      }
      const reviewEdit = target.closest("[data-flash-deal-review-edit]");
      if (reviewEdit) {
        event.preventDefault();
        setModalStep(1);
        setModalFeedback("");
        const field = document.getElementById(reviewEdit.getAttribute("data-flash-deal-review-edit") || "");
        if (field instanceof HTMLElement) {
          field.scrollIntoView({ block: "center", behavior: "smooth" });
          field.focus({ preventScroll: true });
        }
        return;
      }
      if (target.closest("#flash-deal-modal-draft-button")) {
        event.preventDefault();
        void submitCreate({ saveAsDraft: true });
        return;
      }
      if (target.closest("#flash-deal-free-shipping-toggle")) {
        event.preventDefault();
        setFreeShipping(!state.freeShipping);
        return;
      }
      if (target.closest("#flash-deal-platform-toggle")) {
        event.preventDefault();
        const dropdown = target.closest('[data-flash-deal-choice="platform"]');
        setPlatformMenuOpen(!dropdown?.classList.contains("is-open"));
        return;
      }
      if (!target.closest('[data-flash-deal-choice="platform"]')) {
        setPlatformMenuOpen(false);
      }
      const addType = target.closest("[data-flash-deal-bt-add]");
      if (addType) {
        event.preventDefault();
        state.businessTypes.add(addType.getAttribute("data-flash-deal-bt-add") || "");
        renderBusinessTypePicker();
        return;
      }
      const removeType = target.closest("[data-flash-deal-bt-remove]");
      if (removeType) {
        event.preventDefault();
        state.businessTypes.delete(removeType.getAttribute("data-flash-deal-bt-remove") || "");
        renderBusinessTypePicker();
        return;
      }
      const allTypes = target.closest("[data-flash-deal-bt-all]");
      if (allTypes) {
        event.preventDefault();
        state.businessTypes =
          allTypes.getAttribute("data-flash-deal-bt-all") === "remove"
            ? new Set()
            : new Set(campaignBusinessTypes().map((type) => type.id));
        renderBusinessTypePicker();
        return;
      }
      const fundingOption = target.closest("[data-flash-deal-funding]");
      if (fundingOption) {
        event.preventDefault();
        setFunding(fundingOption.getAttribute("data-flash-deal-funding"));
        setFundingMenuOpen(false);
        return;
      }
      if (target.closest("#flash-deal-funding-toggle")) {
        event.preventDefault();
        const dropdown = target.closest('[data-flash-deal-choice="funding"]');
        setFundingMenuOpen(!dropdown?.classList.contains("is-open"));
        return;
      }
      if (!target.closest('[data-flash-deal-choice="funding"]')) {
        setFundingMenuOpen(false);
      }
      if (target.id === "flash-deal-modal-overlay") {
        closeCreateModal();
        return;
      }
      const companiesTrigger = target.closest("[data-flash-campaign-companies]");
      if (companiesTrigger) {
        event.preventDefault();
        void openRegisteredDrawer(
          companiesTrigger.getAttribute("data-flash-campaign-companies"),
          companiesTrigger.getAttribute("data-flash-campaign-platform") || "",
        );
        return;
      }
      const companyToggle = target.closest("[data-flash-company-toggle]");
      if (companyToggle && !target.closest("[data-company-contact-copy]")) {
        event.preventDefault();
        toggleRegisteredCompany(companyToggle.getAttribute("data-flash-company-toggle"));
        return;
      }
      if (target.closest("[data-flash-registered-close], [data-flash-registered-backdrop]")) {
        event.preventDefault();
        closeRegisteredDrawer();
        return;
      }
      const campaignAction = target.closest("[data-flash-campaign-action]");
      if (campaignAction) {
        event.preventDefault();
        const action = campaignAction.getAttribute("data-flash-campaign-action");
        const campaignId = campaignAction.getAttribute("data-flash-campaign-id");
        const platformId = campaignAction.getAttribute("data-flash-campaign-platform") || "";
        void runCampaignAction(campaignId, action, platformId);
        return;
      }
      if (
        els.filterPanel &&
        !els.filterPanel.hidden &&
        !target.closest(".super-admin-flash-deals-filter-dropdown")
      ) {
        setFilterOpen(false);
      }
    });

    document.addEventListener("submit", (event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || form.id !== "flash-deal-modal-form") {
        return;
      }
      event.preventDefault();
      void submitCreate();
    });

    document.addEventListener("input", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (target.matches("[data-super-admin-flash-deals-search]")) {
        state.filters.search = target.value || "";
        state.page = 1;
        scheduleSearchRender();
      }
      if (target.id === "flash-deal-bt-search") {
        state.businessTypeSearch = target.value || "";
        renderBusinessTypePicker();
      }
      if (target.matches("[data-flash-registered-search]")) {
        state.registeredSearch = target.value || "";
        renderRegisteredDrawer();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || !state.registeredDrawerCampaignId) return;
      if (isModalOpen() || document.body.classList.contains("super-admin-product-detail-open")) return;
      event.preventDefault();
      closeRegisteredDrawer();
    });

    document.addEventListener("change", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (target.matches("[data-flash-deal-platform-all]")) {
        state.campaignPlatforms = { all: target.checked, ids: new Set() };
        applyCampaignPlatformChange();
        return;
      }
      if (target.matches("[data-flash-deal-platform-option]")) {
        toggleCampaignPlatform(
          target.getAttribute("data-flash-deal-platform-option") || "",
          target.checked,
        );
        applyCampaignPlatformChange();
        return;
      }
      if (target.matches("[data-super-admin-flash-deals-filter]")) {
        const key = target.getAttribute("data-super-admin-flash-deals-filter") || "";
        if (PANEL_FILTER_KEYS.includes(key)) {
          state.filters[key] = String(target.value || "").trim().toLowerCase();
          state.page = 1;
          renderList();
        }
      }
    });

    document.addEventListener("keydown", (event) => {
      if (!isModalOpen()) return;
      if (
        event.key === "Enter" &&
        event.target instanceof HTMLInputElement &&
        event.target.closest("#flash-deal-modal-form")
      ) {
        if (state.modalStep === 1) {
          event.preventDefault();
          goToNextStep();
          return;
        }
        if (state.modalStep === 2) {
          event.preventDefault();
          return;
        }
      }
      if (event.key !== "Escape") return;
      if (isSwitchCalendarOpen()) return;
      const platformDropdown = document.querySelector('[data-flash-deal-choice="platform"]');
      if (platformDropdown?.classList.contains("is-open")) {
        event.preventDefault();
        setPlatformMenuOpen(false);
        document.getElementById("flash-deal-platform-toggle")?.focus();
        return;
      }
      const fundingDropdown = document.querySelector('[data-flash-deal-choice="funding"]');
      if (fundingDropdown?.classList.contains("is-open")) {
        event.preventDefault();
        setFundingMenuOpen(false);
        document.getElementById("flash-deal-funding-toggle")?.focus();
        return;
      }
      event.preventDefault();
      closeCreateModal();
    });
  }

  window.addEventListener("gms:platforms-updated", (event) => {
    if (!applyPlatforms(event?.detail?.platforms)) return;
    if (isModalOpen()) applyCampaignPlatformChange();
    if (state.quickView === "platform") renderList();
  });

  window.SuperAdminFlashDeals = {
    load,
    bind,
    openCreate: () => openCreateModal(),
    setQuickView(value) {
      applyQuickView(value);
    },
    closeFilter,
    get loading() {
      return state.loading;
    },
    get pendingCount() {
      return 0;
    },
  };

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      () => {
        bind();
        void load({ quiet: true });
      },
      { once: true },
    );
  } else {
    bind();
    void load({ quiet: true });
  }
  window.setInterval(shuffleVisibleFlashPhotoFans, FLASH_FAN_SHUFFLE_MS);
})();
