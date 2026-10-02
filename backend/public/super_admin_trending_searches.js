(() => {
  const quickViewStorageKey = "gms-super-admin-trending-quick-view";
  const quickViewDefinitions = Object.freeze({
    all: Object.freeze({ source: "all", visibility: "all" }),
    organic: Object.freeze({ source: "organic", visibility: "all" }),
    pinned: Object.freeze({ source: "pinned", visibility: "all" }),
    hidden: Object.freeze({ source: "all", visibility: "hidden" }),
  });

  const els = {
    list: document.getElementById("saved-trending-search-list"),
    total: document.querySelector("[data-super-admin-trending-total]"),
    monthSelect: document.querySelector("[data-super-admin-trending-month]"),
    periodButtons: Array.from(
      document.querySelectorAll("[data-super-admin-trending-period]"),
    ),
    sortSelect: document.querySelector("[data-super-admin-trending-sort]"),
    platformSelect: document.querySelector("[data-super-admin-trending-platform]"),
    categorySelect: document.querySelector("[data-super-admin-trending-category]"),
    storeTypeSelect: document.querySelector("[data-super-admin-trending-store-type]"),
    clientSelect: document.querySelector("[data-super-admin-trending-client]"),
    sourceSelect: document.querySelector("[data-super-admin-trending-source]"),
    visibilitySelect: document.querySelector(
      "[data-super-admin-trending-visibility]",
    ),
    qInput: document.querySelector("[data-super-admin-trending-q]"),
    resetButton: document.querySelector("[data-super-admin-trending-reset]"),
    monthLabel: document.querySelector("[data-super-admin-trending-month-label]"),
    momLabel: document.querySelector("[data-super-admin-trending-mom]"),
    filterToggle: document.querySelector("[data-super-admin-trending-filter-toggle]"),
    filterPanel: document.querySelector("[data-super-admin-trending-filter-panel]"),
    filterSummary: document.querySelector("[data-super-admin-trending-filter-summary]"),
    filterApply: document.querySelector("[data-super-admin-trending-filter-apply]"),
    filterRadioGroups: Array.from(
      document.querySelectorAll("[data-super-admin-trending-radio-group]"),
    ),
    quickViewButtons: Array.from(
      document.querySelectorAll("[data-super-admin-trending-quick-view]"),
    ),
    pager: document.querySelector("[data-super-admin-trending-gmail-pager]"),
    pageMeta: document.querySelector("[data-super-admin-trending-page-meta]"),
    pagination: document.querySelector("[data-super-admin-trending-pagination]"),
  };

  function normalizeQuickView(value) {
    const normalized = String(value || "").trim().toLowerCase();
    return Object.prototype.hasOwnProperty.call(quickViewDefinitions, normalized)
      ? normalized
      : "all";
  }

  function getSavedQuickView() {
    try {
      return normalizeQuickView(window.localStorage.getItem(quickViewStorageKey));
    } catch (_) {
      return "all";
    }
  }

  function saveQuickView(value) {
    try {
      const normalized = String(value || "").trim().toLowerCase();
      if (Object.prototype.hasOwnProperty.call(quickViewDefinitions, normalized)) {
        window.localStorage.setItem(quickViewStorageKey, normalized);
      } else {
        window.localStorage.removeItem(quickViewStorageKey);
      }
    } catch (_) {
      // The selected quick view remains active for the current session.
    }
  }

  const state = {
    items: [],
    months: [],
    summary: null,
    filterOptions: {
      platforms: [],
      categories: [],
      storeTypes: [],
      clients: [],
    },
    monthKey: "",
    period: "monthly",
    sort: "hits-desc",
    platform: "all",
    category: "all",
    storeType: "all",
    client: "all",
    source: "all",
    visibility: "all",
    q: "",
    quickView: getSavedQuickView(),
    loading: false,
    reloadQueued: null,
    bound: false,
    searchTimer: 0,
    page: 1,
    pageSize: 10,
  };

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

  // Match Companies showcase hover-action icons (Lucide stroke-width 2).
  const TRENDING_ACTION_ICON = Object.freeze({
    eye: '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"></path><circle cx="12" cy="12" r="3"></circle>',
    eyeOff: '<path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"></path><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"></path><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-4.86"></path><path d="m2 2 20 20"></path>',
    pin: '<path d="M12 17v5"></path><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"></path>',
    trash:
      window.SwitchDefaultIcons?.paths?.trash
      || '<path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path><path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>',
  });

  function trendingActionIconSvg(paths) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths}</svg>`;
  }

  function normalizeListingImages(item) {
    const raw = Array.isArray(item?.listingImages) ? item.listingImages : [];
    const seen = new Set();
    const images = [];
    for (const entry of raw) {
      const url = String(
        entry && typeof entry === "object" ? entry.url ?? entry.imageUrl ?? "" : entry ?? "",
      ).trim();
      if (!url) continue;
      const key = url.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      images.push({
        url,
        productName: String(entry?.productName || entry?.name || item?.term || "").trim(),
      });
      if (images.length >= 3) break;
    }
    return images;
  }

  function renderListingMediaHtml(item, term) {
    const images = normalizeListingImages(item);
    if (!images.length) {
      return `
        <div class="business-type-showcase__media sa-trending-showcase__media is-empty" aria-label="No matching listing photos yet">
          <div class="sa-trending-showcase__media-empty">
            <span aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2"></rect>
                <circle cx="9" cy="9" r="2"></circle>
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path>
              </svg>
            </span>
            <strong>No listing photo</strong>
            <p>Photos appear when sellers list items matching this search.</p>
          </div>
        </div>
      `;
    }

    const slides = images
      .map(
        (image, index) => `
          <figure class="sa-trending-showcase__slide${index === 0 ? " is-active" : ""}" data-sa-trending-slide>
            <img
              src="${escapeHtml(image.url)}"
              alt="${escapeHtml(image.productName || term)}"
              loading="lazy"
              decoding="async"
            />
          </figure>
        `,
      )
      .join("");
    const dots =
      images.length > 1
        ? `<div class="sa-trending-showcase__dots" aria-hidden="true">${images
            .map(
              (_, index) =>
                `<i class="sa-trending-showcase__dot${index === 0 ? " is-active" : ""}" data-sa-trending-dot></i>`,
            )
            .join("")}</div>`
        : "";

    return `
      <div
        class="business-type-showcase__media sa-trending-showcase__media has-listing-slides"
        data-sa-trending-media
        data-sa-trending-slide-count="${images.length}"
        aria-label="Listing photos for ${escapeHtml(term)}"
      >
        <div class="sa-trending-showcase__slides">
          ${slides}
        </div>
        ${dots}
      </div>
    `;
  }

  function mountTrendingListingSliders(root = els.list) {
    if (!(root instanceof HTMLElement)) return;
    root.querySelectorAll("[data-sa-trending-media]").forEach((media) => {
      if (!(media instanceof HTMLElement)) return;
      if (media.dataset.sliderBound === "1") return;
      const slides = Array.from(media.querySelectorAll("[data-sa-trending-slide]"));
      const dots = Array.from(media.querySelectorAll("[data-sa-trending-dot]"));
      if (slides.length <= 1) return;
      media.dataset.sliderBound = "1";
      let index = 0;
      const show = (nextIndex) => {
        index = ((nextIndex % slides.length) + slides.length) % slides.length;
        slides.forEach((slide, slideIndex) => {
          slide.classList.toggle("is-active", slideIndex === index);
        });
        dots.forEach((dot, dotIndex) => {
          dot.classList.toggle("is-active", dotIndex === index);
        });
      };
      media.addEventListener(
        "mouseenter",
        () => {
          media.dataset.paused = "1";
        },
        { passive: true },
      );
      media.addEventListener(
        "mouseleave",
        () => {
          delete media.dataset.paused;
        },
        { passive: true },
      );
      media._saTrendingSlideTimer = window.setInterval(() => {
        if (!media.isConnected) {
          window.clearInterval(media._saTrendingSlideTimer);
          return;
        }
        if (document.hidden || media.dataset.paused === "1") return;
        show(index + 1);
      }, 3200);
    });
  }

  // Lucide icons for trending card stats (stroke-width 2).
  const TRENDING_STAT_ICON = Object.freeze({
    // chart-column — Monthly searches
    monthly:
      '<path d="M3 3v16a2 2 0 0 0 2 2h16"></path><path d="M8 17V9"></path><path d="M13 17V5"></path><path d="M18 17v-3"></path>',
    // trophy — Current rank
    rank:
      '<path d="M10 14.66v1.626a2 2 0 0 1-.976 1.696A5 5 0 0 0 7 21.978"></path><path d="M14 14.66v1.626a2 2 0 0 0 .976 1.696A5 5 0 0 1 17 21.978"></path><path d="M18 9h1.5a1 1 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z"></path><path d="M6 9H4.5a1 1 0 0 1 0-5H6"></path>',
    // eye — Visible
    visible:
      '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"></path><circle cx="12" cy="12" r="3"></circle>',
    // eye-off — Hidden
    hidden:
      '<path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"></path><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"></path><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-4.86"></path><path d="m2 2 20 20"></path>',
  });

  function trendingStatIconSvg(paths) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide" aria-hidden="true" focusable="false">${paths}</svg>`;
  }

  const TRENDING_RANK_FLOW_ICON = Object.freeze({
    up: '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
    down: '<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>',
    flat: '<path d="M5 12h14"/>',
  });

  function trendingRankFlow(item, rank) {
    const direction =
      item.rankDirection === "down" ? "down" : item.rankDirection === "flat" ? "flat" : "up";
    const previousRank = Math.trunc(Number(item.previousRank) || 0);
    const currentRank = Math.max(1, Math.trunc(Number(rank) || 1));
    let label = "New trending search";
    if (previousRank > 0) {
      if (direction === "up") label = `Rising from #${previousRank} to #${currentRank}`;
      else if (direction === "down") label = `Falling from #${previousRank} to #${currentRank}`;
      else label = `Unchanged at #${currentRank}`;
    } else if (direction === "down") {
      label = "Falling in trending";
    } else if (direction === "up") {
      label = "Rising in trending";
    } else {
      label = "No rank change";
    }
    const icon =
      direction === "down"
        ? TRENDING_RANK_FLOW_ICON.down
        : direction === "flat"
          ? TRENDING_RANK_FLOW_ICON.flat
          : TRENDING_RANK_FLOW_ICON.up;
    const lucideName =
      direction === "down" ? "arrow-down" : direction === "flat" ? "minus" : "arrow-up";
    return `
      <span class="sa-trending-rank-flow is-${direction}" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-${lucideName}" aria-hidden="true">
          ${icon}
        </svg>
      </span>
    `;
  }

  function formatSearchSharePct(value) {
    const pct = Number(value);
    if (!Number.isFinite(pct) || pct <= 0) return "0%";
    if (pct >= 100) return "100%";
    if (Number.isInteger(pct)) return `${pct}%`;
    return `${pct.toFixed(1).replace(/\.0$/, "")}%`;
  }

  function uniqueIdSettingHtml(value, label) {
    const normalized = String(value || "").trim();
    if (!normalized) {
      return `
        <span class="business-type-showcase__setting sa-trending-showcase__setting sa-trending-showcase__setting--id">
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
      <span class="business-type-showcase__setting sa-trending-showcase__setting sa-trending-showcase__setting--id">
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

  function setFeedback(message, tone = "notice") {
    const feedback = document.querySelector(
      ".feedback-note, #feedback-note, [data-super-admin-feedback]",
    );
    if (feedback instanceof HTMLElement) {
      feedback.textContent = message;
      feedback.classList.remove("error", "notice", "success");
      if (tone) feedback.classList.add(tone);
    }
  }

  function formatMonthLabel(monthKey) {
    const key = String(monthKey || "").trim();
    if (!/^\d{4}-\d{2}$/.test(key)) return key || "—";
    const [year, month] = key.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, 1));
    return date.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
  }

  function normalizePeriod(value) {
    const raw = String(value || "").trim().toLowerCase();
    if (raw === "all") return "overall";
    if (raw === "daily" || raw === "weekly" || raw === "monthly" || raw === "yearly" || raw === "overall") {
      return raw;
    }
    return "monthly";
  }

  function periodLabel(value) {
    switch (normalizePeriod(value)) {
      case "daily":
        return "Daily";
      case "weekly":
        return "Weekly";
      case "yearly":
        return "Yearly";
      case "overall":
        return "Overall";
      default:
        return "Monthly";
    }
  }

  function periodScopeLabel(value, monthKey) {
    const period = normalizePeriod(value);
    if (period === "monthly") return formatMonthLabel(monthKey);
    return periodLabel(period);
  }

  function syncPeriodButtons() {
    const active = normalizePeriod(state.period);
    for (const button of els.periodButtons) {
      if (!(button instanceof HTMLButtonElement)) continue;
      const value = normalizePeriod(button.dataset.superAdminTrendingPeriod);
      const isActive = value === active;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    }
  }

  function formatSearchCount(value) {
    return new Intl.NumberFormat("en-US").format(Math.max(0, Number(value) || 0));
  }

  function renderRank(rankValue) {
    const rank = Math.max(1, Math.trunc(Number(rankValue) || 1));
    if (rank > 3) return `<span class="super-admin-trending-card__rank">${rank}</span>`;
    const tone = rank === 1 ? "is-gold" : rank === 2 ? "is-silver" : "is-bronze";
    return `
      <span class="super-admin-trending-card__rank ${tone}" aria-label="Rank ${rank}" title="Rank ${rank}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M8 21h8" />
          <path d="M12 17v4" />
          <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
          <path d="M5 9H4a2 2 0 0 1-2-2V6a1 1 0 0 1 1-1h4" />
          <path d="M19 9h1a2 2 0 0 0 2-2V6a1 1 0 0 0-1-1h-4" />
        </svg>
      </span>
    `;
  }

  function currentMonthKey() {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
    })
      .format(new Date())
      .slice(0, 7);
  }

  function applyPeriod(value, { loadItems = true } = {}) {
    state.period = normalizePeriod(value);
    state.page = 1;
    if (state.period === "monthly" && !state.monthKey) {
      state.monthKey = currentMonthKey();
    }
    syncPeriodButtons();
    renderHeaderFilterSummary();
    if (loadItems) {
      void load({ quiet: true });
    }
  }

  function buildQuery() {
    const params = new URLSearchParams({
      month: state.monthKey || currentMonthKey(),
      period: normalizePeriod(state.period),
      sort: state.sort || "hits-desc",
      platform: state.platform || "all",
      category: state.category || "all",
      storeType: state.storeType || "all",
      client: state.client || "all",
      source: state.source || "all",
      visibility: state.visibility || "all",
    });
    if (state.q) params.set("q", state.q);
    return params.toString();
  }

  function filterPayload() {
    return {
      platform: state.platform || "all",
      category: state.category || "all",
      storeType: state.storeType || "all",
      client: state.client || "all",
      source: state.source || "all",
      visibility: state.visibility || "all",
      q: state.q || "",
    };
  }

  function fillSelect(select, options, { allValue = "all", allLabel = "All", selected = "all" } = {}) {
    if (!(select instanceof HTMLSelectElement)) return;
    const previous = selected || select.value || allValue;
    select.replaceChildren();
    const allOption = document.createElement("option");
    allOption.value = allValue;
    allOption.textContent = allLabel;
    select.append(allOption);
    for (const item of options) {
      const option = document.createElement("option");
      option.value = item.id;
      const hits = Number(item.totalHits) || 0;
      option.textContent = hits
        ? `${item.label || item.id} · ${hits}`
        : item.label || item.id;
      select.append(option);
    }
    const hasSelected = [...select.options].some((opt) => opt.value === previous);
    select.value = hasSelected ? previous : allValue;
  }

  function renderMonthOptions() {
    if (!(els.monthSelect instanceof HTMLSelectElement)) return;
    const months = Array.isArray(state.months) ? [...state.months] : [];
    if (!months.some((item) => item.monthKey === state.monthKey) && state.monthKey) {
      months.unshift({ monthKey: state.monthKey, totalHits: 0, termCount: 0 });
    }
    els.monthSelect.replaceChildren();
    for (const item of months) {
      const option = document.createElement("option");
      option.value = item.monthKey;
      const hits = Number(item.totalHits) || 0;
      option.textContent = `${formatMonthLabel(item.monthKey)}${hits ? ` · ${hits} hits` : ""}`;
      if (item.monthKey === state.monthKey) option.selected = true;
      els.monthSelect.append(option);
    }
  }

  function renderFilterControls() {
    const options = state.filterOptions || {};
    fillSelect(els.platformSelect, options.platforms || [], {
      allLabel: "All platforms",
      selected: state.platform,
    });
    fillSelect(els.categorySelect, options.categories || [], {
      allLabel: "All categories",
      selected: state.category,
    });
    fillSelect(els.storeTypeSelect, options.storeTypes || [], {
      allLabel: "All types",
      selected: state.storeType,
    });
    const clientOptions = Array.isArray(options.clients) ? [...options.clients] : [];
    const knownClients = [
      { id: "web", label: "Web" },
      { id: "android", label: "Android" },
      { id: "ios", label: "iOS" },
      { id: "app", label: "App" },
    ];
    for (const known of knownClients) {
      if (!clientOptions.some((item) => item.id === known.id)) {
        clientOptions.push({ ...known, totalHits: 0 });
      }
    }
    fillSelect(els.clientSelect, clientOptions, {
      allLabel: "All clients",
      selected: state.client,
    });
    if (els.sourceSelect instanceof HTMLSelectElement) {
      els.sourceSelect.value = state.source || "all";
    }
    if (els.visibilitySelect instanceof HTMLSelectElement) {
      els.visibilitySelect.value = state.visibility || "all";
    }
    if (els.sortSelect instanceof HTMLSelectElement) {
      els.sortSelect.value = state.sort || "hits-desc";
    }
    if (els.qInput instanceof HTMLInputElement && document.activeElement !== els.qInput) {
      els.qInput.value = state.q || "";
    }
  }

  function getFilterSelect(key) {
    const filterSelects = {
      month: els.monthSelect,
      platform: els.platformSelect,
      category: els.categorySelect,
      storeType: els.storeTypeSelect,
      client: els.clientSelect,
      source: els.sourceSelect,
      visibility: els.visibilitySelect,
      sort: els.sortSelect,
    };
    return filterSelects[String(key || "")] || null;
  }

  function renderFilterRadioGroups() {
    for (const group of els.filterRadioGroups) {
      const key = String(group.dataset.superAdminTrendingRadioGroup || "");
      const select = getFilterSelect(key);
      if (!(select instanceof HTMLSelectElement)) continue;

      const options = Array.from(select.options);
      const fragment = document.createDocumentFragment();
      for (const option of options) {
        const label = document.createElement("label");
        label.className = "super-admin-filter-radio super-admin-trending-filter-radio";

        const radio = document.createElement("input");
        radio.type = "radio";
        radio.name = `super-admin-trending-${key}-filter`;
        radio.value = option.value;
        radio.checked = option.value === select.value;
        radio.disabled = option.disabled;
        radio.dataset.superAdminTrendingRadioFilter = key;

        const mark = document.createElement("span");
        mark.className = "super-admin-filter-radio__mark";
        mark.setAttribute("aria-hidden", "true");

        const text = document.createElement("span");
        text.textContent = option.textContent || option.value;

        label.append(radio, mark, text);
        fragment.append(label);
      }
      group.replaceChildren(fragment);
    }
  }

  function activeFilterSummary() {
    const parts = [];
    if (state.platform && state.platform !== "all") parts.push(`platform ${state.platform}`);
    if (state.category && state.category !== "all") parts.push(`category ${state.category}`);
    if (state.storeType && state.storeType !== "all") parts.push(`type ${state.storeType}`);
    if (state.client && state.client !== "all") parts.push(state.client);
    if (state.source && state.source !== "all") parts.push(state.source);
    if (state.visibility && state.visibility !== "all") parts.push(state.visibility);
    if (state.q) parts.push(`“${state.q}”`);
    return parts;
  }

  function renderHeaderFilterSummary() {
    if (!(els.filterSummary instanceof HTMLElement)) return;
    const activeCount = [
      state.period && state.period !== "monthly",
      normalizePeriod(state.period) === "monthly" && state.monthKey && state.monthKey !== currentMonthKey(),
      state.sort && state.sort !== "hits-desc",
      state.platform && state.platform !== "all",
      state.category && state.category !== "all",
      state.storeType && state.storeType !== "all",
      state.client && state.client !== "all",
    ].filter(Boolean).length;
    els.filterSummary.textContent = activeCount > 0 ? `${activeCount} active` : "All";
  }

  function captureQueryState() {
    return {
      monthKey: state.monthKey,
      period: state.period,
      sort: state.sort,
      platform: state.platform,
      category: state.category,
      storeType: state.storeType,
      client: state.client,
      source: state.source,
      visibility: state.visibility,
      q: state.q,
      quickView: state.quickView,
    };
  }

  function restoreQueryState(snapshot) {
    if (!snapshot || typeof snapshot !== "object") return;
    for (const key of [
      "monthKey",
      "period",
      "sort",
      "platform",
      "category",
      "storeType",
      "client",
      "source",
      "visibility",
      "q",
      "quickView",
    ]) {
      if (Object.prototype.hasOwnProperty.call(snapshot, key)) {
        state[key] = snapshot[key];
      }
    }
  }

  function resolveQuickViewFromFilters() {
    const source = String(state.source || "all");
    const visibility = String(state.visibility || "all");
    return Object.entries(quickViewDefinitions).find(
      ([, definition]) => definition.source === source && definition.visibility === visibility,
    )?.[0] || "";
  }

  function renderQuickViewNav({ persist = false } = {}) {
    const activeQuickView = resolveQuickViewFromFilters();
    state.quickView = activeQuickView;
    for (const button of els.quickViewButtons) {
      if (!(button instanceof HTMLButtonElement)) continue;
      const value = normalizeQuickView(button.dataset.superAdminTrendingQuickView);
      const isActive = Boolean(activeQuickView) && value === activeQuickView;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    }
    if (persist) {
      saveQuickView(activeQuickView);
    }
  }

  function applyQuickView(value, { loadItems = true, persist = true } = {}) {
    const quickView = normalizeQuickView(value);
    const definition = quickViewDefinitions[quickView];
    state.quickView = quickView;
    state.source = definition.source;
    state.visibility = definition.visibility;
    state.page = 1;
    if (persist) saveQuickView(quickView);
    renderFilterControls();
    renderFilterRadioGroups();
    renderHeaderFilterSummary();
    renderQuickViewNav();
    if (loadItems) {
      void load({ quiet: true });
    }
  }

  function renderMonthOverMonth() {
    if (!(els.momLabel instanceof HTMLElement)) return;
    const summary = state.summary;
    if (!summary || typeof summary !== "object") {
      els.momLabel.textContent = "Month-over-month summary unavailable.";
      els.momLabel.classList.remove("is-up", "is-down", "is-flat");
      return;
    }
    const changePct = Number(summary.changePct);
    const direction =
      summary.direction === "up" || summary.direction === "down" || summary.direction === "flat"
        ? summary.direction
        : changePct > 0
          ? "up"
          : changePct < 0
            ? "down"
            : "flat";
    const sign = changePct > 0 ? "+" : "";
    const previousLabel = summary.previousPeriodLabel
      || formatMonthLabel(summary.previousMonthKey);
    const changeLabel = Number.isFinite(changePct)
      ? `${sign}${changePct}% vs ${previousLabel}`
      : `vs ${previousLabel}`;
    const scope = summary.periodLabel || periodScopeLabel(state.period, summary.monthKey || state.monthKey);
    els.momLabel.textContent = `${formatSearchCount(summary.totalHits)} unique searches in ${scope} · ${changeLabel}`;
    els.momLabel.classList.remove("is-up", "is-down", "is-flat");
    els.momLabel.classList.add(`is-${direction}`);
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
      const newer = els.pagination.querySelector('[data-trending-pager-dir="newer"]');
      const older = els.pagination.querySelector('[data-trending-pager-dir="older"]');
      if (newer instanceof HTMLButtonElement) {
        newer.dataset.superAdminTrendingPage = String(Math.max(1, state.page - 1));
        newer.disabled = !shouldPaginate || state.loading || state.page <= 1;
      }
      if (older instanceof HTMLButtonElement) {
        older.dataset.superAdminTrendingPage = String(Math.min(pageCount, state.page + 1));
        older.disabled = !shouldPaginate || state.loading || state.page >= pageCount;
      }
    }
    document.body.classList.toggle("super-admin-trending-pagination-active", shouldPaginate);
    els.list?.classList.toggle("has-trending-pagination", shouldPaginate);
  }

  function goToTrendingPage(nextPage) {
    const page = Math.max(1, Number(nextPage) || 1);
    if (page === state.page) return;
    state.page = page;
    render();
    document
      .querySelector("[data-super-admin-section='trending-searches'] .sa-section-heading")
      ?.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  function render() {
    if (!(els.list instanceof HTMLElement)) return;
    if (els.total) {
      els.total.textContent = `(${state.items.length})`;
    }
    if (els.monthLabel) {
      const filters = activeFilterSummary();
      const base = `Showing ${periodScopeLabel(state.period, state.monthKey)} rankings`;
      els.monthLabel.textContent = filters.length
        ? `${base} · filtered by ${filters.join(", ")}`
        : base;
    }
    renderMonthOverMonth();
    renderHeaderFilterSummary();
    renderMonthOptions();
    renderFilterControls();
    renderFilterRadioGroups();
    renderQuickViewNav();
    syncPeriodButtons();

    if (state.loading) {
      paintTrendingSkeletonList(state.pageSize);
      renderPagination(state.items.length);
      return;
    }

    els.list.classList.remove("is-skeleton-loading");
    els.list.replaceChildren();
    renderPagination(state.items.length);
    if (!state.items.length) {
      const empty = document.createElement("div");
      empty.className = "super-admin-trending-empty-cell";
      const filters = activeFilterSummary();
      const scope = periodScopeLabel(state.period, state.monthKey);
      empty.textContent = filters.length
        ? `No trending searches match your filters for ${scope}.`
        : `No trending searches for ${scope}.`;
      els.list.append(empty);
      return;
    }

    for (const item of pagedItems(state.items)) {
      const rank = Math.max(1, Math.trunc(Number(item.rank) || 1));
      const monthLabel = periodScopeLabel(state.period, item.monthKey || state.monthKey);
      const sourceLabel = item.isManual ? "Pinned" : "Organic";
      const visibilityLabel = item.isActive ? "Visible" : "Hidden";
      const sharePctLabel = formatSearchSharePct(item.searchSharePct);
      const card = document.createElement("article");
      card.className = "super-admin-trending-card sa-showcase-card super-admin-company-showcase business-type-showcase";
      card.dataset.trendingId = item.id;
      card.tabIndex = 0;
      card.setAttribute("role", "listitem");
      const flowWord =
        item.rankDirection === "down" ? "falling" : item.rankDirection === "flat" ? "unchanged" : "rising";
      card.setAttribute("aria-label", `Rank ${rank}, ${flowWord}: ${item.term}`);
      card.innerHTML = `
        <div class="business-type-showcase__hero">
          <div class="business-type-showcase__content">
            <div class="business-type-showcase__identity">
              ${trendingRankFlow(item, rank)}
              <div class="business-type-showcase__heading">
                <div class="business-type-showcase__title-row">
                  <h3 class="business-type-showcase__title">${escapeHtml(item.term)}</h3>
                  <span
                    class="super-admin-trending-card__badge is-share"
                    title="${escapeHtml(
                      Number(item.uniqueSearchers || 0)
                        ? `${Number(item.uniqueSearchers)} of ${Number(state.summary?.totalUsers || 0) || "all"} users searched this`
                        : "Share of users who searched this term",
                    )}"
                  >${escapeHtml(sharePctLabel)}</span>
                  <div class="super-admin-trending-card__quick-actions super-admin-company-card__quick-actions" aria-label="Search term quick actions">
                    <button type="button" class="super-admin-trending-card__quick-action super-admin-company-card__quick-action" data-trending-toggle aria-label="${item.isActive ? "Hide" : "Show"} search term" title="${item.isActive ? "Hide" : "Show"}">
                      ${trendingActionIconSvg(item.isActive ? TRENDING_ACTION_ICON.eyeOff : TRENDING_ACTION_ICON.eye)}
                    </button>
                    <button type="button" class="super-admin-trending-card__quick-action super-admin-company-card__quick-action${item.isManual ? " is-active" : ""}" data-trending-pin aria-label="${item.isManual ? "Unpin" : "Pin"} search term" title="${item.isManual ? "Unpin" : "Pin"}">
                      ${trendingActionIconSvg(TRENDING_ACTION_ICON.pin)}
                    </button>
                    <button type="button" class="super-admin-trending-card__quick-action super-admin-company-card__quick-action super-admin-company-card__quick-action--danger is-danger" data-trending-delete aria-label="Delete search term" title="Delete">
                      ${trendingActionIconSvg(TRENDING_ACTION_ICON.trash)}
                    </button>
                  </div>
                </div>
                <p class="business-type-showcase__tagline sa-trending-showcase__tagline">Buyer search keyword</p>
              </div>
            </div>

            <p class="business-type-showcase__description sa-trending-showcase__description">
              ${item.rankDirection === "down" ? "Falling" : item.rankDirection === "flat" ? "Holding" : "Rising"} at #${rank} from real buyer searches for ${escapeHtml(monthLabel)}.
            </p>

            <div class="business-type-showcase__stats sa-trending-showcase__stats">
              <div class="business-type-showcase__stat">
                <span class="business-type-showcase__stat-icon" aria-hidden="true">
                  ${trendingStatIconSvg(TRENDING_STAT_ICON.monthly)}
                </span>
                <span class="business-type-showcase__stat-copy"><strong>${formatSearchCount(item.hitCount)}</strong><span>Monthly searches</span></span>
              </div>
              <div class="business-type-showcase__stat">
                <span class="business-type-showcase__stat-icon" aria-hidden="true">
                  ${trendingStatIconSvg(TRENDING_STAT_ICON.rank)}
                </span>
                <span class="business-type-showcase__stat-copy"><strong>#${rank}</strong><span>Current rank</span></span>
              </div>
              <div class="business-type-showcase__stat">
                <span class="business-type-showcase__stat-icon" aria-hidden="true">
                  ${trendingStatIconSvg(item.isActive ? TRENDING_STAT_ICON.visible : TRENDING_STAT_ICON.hidden)}
                </span>
                <span class="business-type-showcase__stat-copy"><strong>${visibilityLabel}</strong><span>Visibility</span></span>
              </div>
            </div>

            <div class="business-type-showcase__settings sa-trending-showcase__settings">
              ${uniqueIdSettingHtml(item.id, "Search ID")}
              <span class="business-type-showcase__setting sa-trending-showcase__setting">
                <span class="business-type-showcase__setting-label">Source</span>
                <span class="business-type-showcase__setting-value"><strong>${sourceLabel}</strong></span>
              </span>
              <span class="business-type-showcase__setting sa-trending-showcase__setting">
                <span class="business-type-showcase__setting-label">Period</span>
                <span class="business-type-showcase__setting-value"><strong>${escapeHtml(periodScopeLabel(state.period, item.monthKey || state.monthKey))}</strong></span>
              </span>
            </div>
          </div>

          ${renderListingMediaHtml(item, item.term)}
        </div>
      `;
      els.list.append(card);
    }
    mountTrendingListingSliders(els.list);
  }

  function applyListPayload(data) {
    state.monthKey = String(data.monthKey || state.monthKey || currentMonthKey());
    state.period = normalizePeriod(data.period || state.period);
    state.sort = String(data.sort || state.sort || "hits-desc");
    state.months = Array.isArray(data.months) ? data.months : [];
    state.summary = data.summary && typeof data.summary === "object" ? data.summary : null;
    state.items = Array.isArray(data.trending) ? data.trending : [];
    state.filterOptions = data.filterOptions || state.filterOptions;
    if (data.filters && typeof data.filters === "object") {
      state.platform = String(data.filters.platform || state.platform || "all");
      state.category = String(data.filters.category || state.category || "all");
      state.storeType = String(data.filters.storeType || state.storeType || "all");
      state.client = String(data.filters.client || state.client || "all");
      state.source = String(data.filters.source || state.source || "all");
      state.visibility = String(data.filters.visibility || state.visibility || "all");
      state.q = String(data.filters.q || state.q || "");
    }
    syncPeriodButtons();
  }

  function paintTrendingSkeletonList(count = 3) {
    const shared = window.SuperAdminShowcaseSkeleton;
    if (shared && typeof shared.paintList === "function") {
      shared.paintList(els.list, count);
      return;
    }
    // Fallback — same .sa-showcase-skeleton CSS classes.
    if (!(els.list instanceof HTMLElement)) return;
    const safeCount = Math.max(2, Math.min(4, Number(count) || 3));
    els.list.innerHTML = "";
    els.list.classList.add("is-skeleton-loading");
    for (let index = 0; index < safeCount; index += 1) {
      const card = document.createElement("article");
      card.className = "sa-showcase-skeleton";
      card.setAttribute("aria-hidden", "true");
      card.innerHTML = `
        <div class="sa-showcase-skeleton__hero">
          <div class="sa-showcase-skeleton__content">
            <div class="sa-showcase-skeleton__identity">
              <span class="sa-showcase-skeleton__icon"></span>
              <span class="sa-showcase-skeleton__line is-title"></span>
            </div>
            <span class="sa-showcase-skeleton__line is-tag"></span>
            <span class="sa-showcase-skeleton__line is-desc"></span>
            <span class="sa-showcase-skeleton__line is-desc is-short"></span>
            <div class="sa-showcase-skeleton__stats">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
          <div class="sa-showcase-skeleton__media"></div>
        </div>
      `;
      els.list.append(card);
    }
  }

  function waitShowcaseSkeletonMs(ms) {
    const shared = window.SuperAdminShowcaseSkeleton;
    if (shared && typeof shared.wait === "function") {
      return shared.wait(ms);
    }
    return new Promise((resolve) => {
      window.setTimeout(resolve, Math.max(0, Number(ms) || 0));
    });
  }

  function showcaseSkeletonMinMs() {
    const shared = window.SuperAdminShowcaseSkeleton;
    const value = Number(shared?.minMs);
    return Number.isFinite(value) && value > 0 ? value : 1000;
  }

  async function load({ quiet = false } = {}) {
    if (state.loading) {
      state.reloadQueued = captureQueryState();
      return;
    }
    const startedAt = Date.now();
    state.loading = true;
    render();
    if (!quiet) setFeedback("Loading trending searches...");
    try {
      const response = await fetch(
        `/api/super-admin/trending-searches?${buildQuery()}`,
        {
          cache: "no-store",
          headers: headers(),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "Unable to load trending searches.");
      }
      if (state.reloadQueued) return;
      const remain = showcaseSkeletonMinMs() - (Date.now() - startedAt);
      if (remain > 0) {
        await waitShowcaseSkeletonMs(remain);
      }
      if (state.reloadQueued) return;
      applyListPayload(data);
      state.loading = false;
      render();
      if (!quiet) {
        const filters = activeFilterSummary();
        setFeedback(
          `${state.items.length} trending ${state.items.length === 1 ? "term" : "terms"} for ${periodScopeLabel(state.period, state.monthKey)}${filters.length ? ` (${filters.join(", ")})` : ""}.`,
          "notice",
        );
      }
    } catch (error) {
      const remain = showcaseSkeletonMinMs() - (Date.now() - startedAt);
      if (remain > 0) {
        await waitShowcaseSkeletonMs(remain);
      }
      if (!state.reloadQueued) {
        state.items = [];
        state.loading = false;
        render();
        setFeedback(
          error instanceof Error ? error.message : "Unable to load trending searches.",
          "error",
        );
      }
    } finally {
      if (state.loading) {
        state.loading = false;
      }
      if (state.reloadQueued) {
        const queuedState = state.reloadQueued;
        state.reloadQueued = null;
        restoreQueryState(queuedState);
        renderFilterControls();
        renderFilterRadioGroups();
        renderHeaderFilterSummary();
        renderQuickViewNav();
        syncPeriodButtons();
        void load({ quiet: true });
      }
    }
  }

  async function updateTerm(id, patch) {
    const response = await fetch("/api/super-admin/trending-searches", {
      method: "PUT",
      headers: headers({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        id,
        month: state.monthKey,
        period: normalizePeriod(state.period),
        sort: state.sort,
        ...filterPayload(),
        ...patch,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || "Unable to update top search.");
    }
    applyListPayload(data);
    render();
    setFeedback(data.message || "Top search updated.", "notice");
  }

  async function confirmTrendingSearchDelete(term) {
    const api = window.SuperAdminDeleteModal;
    if (typeof api?.trendingSearch === "function") {
      return api.trendingSearch(term);
    }
    if (typeof api?.open === "function") {
      const normalizedTerm = String(term || "").trim();
      return api.open({
        title: "Delete Trending Search?",
        message: `Delete ${normalizedTerm || "this search term"}? This action cannot be undone and will be permanent.`,
        titlePrefix: "super-admin-trending-search-delete-title",
      });
    }
    return false;
  }

  async function deleteTerm(id) {
    const response = await fetch("/api/super-admin/trending-searches", {
      method: "DELETE",
      headers: headers({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        id,
        month: state.monthKey,
        period: normalizePeriod(state.period),
        sort: state.sort,
        ...filterPayload(),
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || "Unable to delete top search.");
    }
    applyListPayload(data);
    render();
    setFeedback(data.message || "Top search removed.", "notice");
  }

  function scheduleSearchLoad() {
    window.clearTimeout(state.searchTimer);
    state.searchTimer = window.setTimeout(() => {
      void load({ quiet: true });
    }, 280);
  }

  function setFilterOpen(show) {
    if (!(els.filterToggle instanceof HTMLButtonElement) || !(els.filterPanel instanceof HTMLElement)) {
      return;
    }
    const shouldOpen = Boolean(show);
    els.filterToggle.setAttribute("aria-expanded", String(shouldOpen));
    els.filterPanel.hidden = !shouldOpen;
  }

  function bind() {
    if (state.bound) return;
    state.bound = true;
    state.monthKey = currentMonthKey();
    state.period = "monthly";
    state.sort = "hits-desc";
    syncPeriodButtons();
    applyQuickView(state.quickView, { loadItems: false, persist: false });

    for (const button of els.quickViewButtons) {
      button.addEventListener("click", () => {
        applyQuickView(button.dataset.superAdminTrendingQuickView);
      });
    }

    els.filterToggle?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setFilterOpen(els.filterToggle.getAttribute("aria-expanded") !== "true");
    });

    els.filterApply?.addEventListener("click", () => {
      setFilterOpen(false);
      els.filterToggle?.focus();
    });

    for (const group of els.filterRadioGroups) {
      group.addEventListener("change", (event) => {
        const radio = event.target instanceof HTMLInputElement
          ? event.target
          : null;
        if (!radio?.matches("[data-super-admin-trending-radio-filter]")) return;
        const select = getFilterSelect(radio.dataset.superAdminTrendingRadioFilter);
        if (!(select instanceof HTMLSelectElement) || select.value === radio.value) return;
        select.value = radio.value;
        select.dispatchEvent(new Event("change", { bubbles: true }));
      });
    }

    document.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const pageButton = target?.closest("[data-super-admin-trending-page]");
      if (pageButton instanceof HTMLButtonElement) {
        event.preventDefault();
        event.stopPropagation();
        if (pageButton.disabled) return;
        const nextPage = Number(pageButton.dataset.superAdminTrendingPage);
        if (!Number.isInteger(nextPage) || nextPage < 1) return;
        goToTrendingPage(nextPage);
        return;
      }
      if (
        els.filterToggle?.contains(event.target)
        || els.filterPanel?.contains(event.target)
      ) {
        return;
      }
      setFilterOpen(false);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || els.filterToggle?.getAttribute("aria-expanded") !== "true") {
        return;
      }
      event.preventDefault();
      setFilterOpen(false);
      els.filterToggle?.focus();
    });

    for (const button of els.periodButtons) {
      button.addEventListener("click", () => {
        applyPeriod(button.dataset.superAdminTrendingPeriod);
      });
    }

    els.sortSelect?.addEventListener("change", () => {
      state.sort = String(els.sortSelect.value || "hits-desc");
      state.page = 1;
      void load({ quiet: true });
    });

    els.platformSelect?.addEventListener("change", () => {
      state.platform = String(els.platformSelect.value || "all");
      state.page = 1;
      void load({ quiet: true });
    });

    els.categorySelect?.addEventListener("change", () => {
      state.category = String(els.categorySelect.value || "all");
      state.page = 1;
      void load({ quiet: true });
    });

    els.storeTypeSelect?.addEventListener("change", () => {
      state.storeType = String(els.storeTypeSelect.value || "all");
      state.page = 1;
      void load({ quiet: true });
    });

    els.clientSelect?.addEventListener("change", () => {
      state.client = String(els.clientSelect.value || "all");
      state.page = 1;
      void load({ quiet: true });
    });

    els.monthSelect?.addEventListener("change", () => {
      const monthKey = String(els.monthSelect.value || "").trim();
      if (!monthKey) return;
      state.monthKey = monthKey;
      if (normalizePeriod(state.period) !== "monthly") {
        applyPeriod("monthly", { loadItems: false });
      }
      state.page = 1;
      void load({ quiet: true });
    });

    els.sourceSelect?.addEventListener("change", () => {
      state.source = String(els.sourceSelect.value || "all");
      state.page = 1;
      renderQuickViewNav({ persist: true });
      void load({ quiet: true });
    });

    els.visibilitySelect?.addEventListener("change", () => {
      state.visibility = String(els.visibilitySelect.value || "all");
      state.page = 1;
      renderQuickViewNav({ persist: true });
      void load({ quiet: true });
    });

    els.qInput?.addEventListener("input", () => {
      state.q = String(els.qInput.value || "").trim();
      state.page = 1;
      scheduleSearchLoad();
    });

    els.resetButton?.addEventListener("click", () => {
      state.platform = "all";
      state.category = "all";
      state.storeType = "all";
      state.client = "all";
      state.q = "";
      state.sort = "hits-desc";
      state.monthKey = currentMonthKey();
      state.page = 1;
      if (els.qInput instanceof HTMLInputElement) els.qInput.value = "";
      applyPeriod("monthly", { loadItems: false });
      void load({ quiet: true });
    });

    els.list?.addEventListener("click", async (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;
      if (target.closest("[data-company-contact-copy]")) return;
      const card = target.closest(".super-admin-trending-card");
      if (!card) return;
      const id = card.dataset.trendingId || "";
      const item = state.items.find((entry) => String(entry.id || "") === id);
      if (!item) return;

      try {
        if (target.closest("[data-trending-toggle]")) {
          await updateTerm(id, { isActive: !item.isActive, isManual: item.isManual });
          return;
        }
        if (target.closest("[data-trending-pin]")) {
          await updateTerm(id, {
            isManual: !item.isManual,
            isActive: item.isActive,
          });
          return;
        }
        if (target.closest("[data-trending-delete]")) {
          const confirmed = await confirmTrendingSearchDelete(item.term);
          if (!confirmed) return;
          await deleteTerm(id);
        }
      } catch (error) {
        setFeedback(
          error instanceof Error ? error.message : "Unable to update top search.",
          "error",
        );
      }
    });
  }

  window.SuperAdminTrendingSearches = {
    load,
    bind,
    setQuickView(value) {
      applyQuickView(value);
    },
    closeFilter() {
      setFilterOpen(false);
    },
    get loading() {
      return state.loading;
    },
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind, { once: true });
  } else {
    bind();
  }
})();
