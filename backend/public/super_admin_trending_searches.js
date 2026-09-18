(() => {
  const els = {
    list: document.getElementById("saved-trending-search-list"),
    total: document.querySelector("[data-super-admin-trending-total]"),
    monthSelect: document.querySelector("[data-super-admin-trending-month]"),
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
    filterToggle: document.querySelector("[data-super-admin-trending-filter-toggle]"),
    filterPanel: document.querySelector("[data-super-admin-trending-filter-panel]"),
    filterSummary: document.querySelector("[data-super-admin-trending-filter-summary]"),
    filterApply: document.querySelector("[data-super-admin-trending-filter-apply]"),
    filterRadioGroups: Array.from(
      document.querySelectorAll("[data-super-admin-trending-radio-group]"),
    ),
  };

  const state = {
    items: [],
    months: [],
    filterOptions: {
      platforms: [],
      categories: [],
      storeTypes: [],
      clients: [],
    },
    monthKey: "",
    sort: "hits-desc",
    platform: "all",
    category: "all",
    storeType: "all",
    client: "all",
    source: "all",
    visibility: "all",
    q: "",
    loading: false,
    bound: false,
    searchTimer: 0,
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

  function buildQuery() {
    const params = new URLSearchParams({
      month: state.monthKey || currentMonthKey(),
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
      state.monthKey && state.monthKey !== currentMonthKey(),
      state.sort && state.sort !== "hits-desc",
      state.platform && state.platform !== "all",
      state.category && state.category !== "all",
      state.storeType && state.storeType !== "all",
      state.client && state.client !== "all",
      state.source && state.source !== "all",
      state.visibility && state.visibility !== "all",
    ].filter(Boolean).length;
    els.filterSummary.textContent = activeCount > 0 ? `${activeCount} active` : "All";
  }

  function render() {
    if (!(els.list instanceof HTMLElement)) return;
    if (els.total) {
      els.total.textContent = `(${state.items.length})`;
    }
    if (els.monthLabel) {
      const isCurrent = state.monthKey === currentMonthKey();
      const filters = activeFilterSummary();
      const base = isCurrent
        ? `Showing ${formatMonthLabel(state.monthKey)} (current month)`
        : `Showing past month: ${formatMonthLabel(state.monthKey)}`;
      els.monthLabel.textContent = filters.length
        ? `${base} · filtered by ${filters.join(", ")}`
        : base;
    }
    renderHeaderFilterSummary();
    renderMonthOptions();
    renderFilterControls();
    renderFilterRadioGroups();

    els.list.replaceChildren();
    if (!state.items.length) {
      const emptyRow = document.createElement("tr");
      const empty = document.createElement("td");
      empty.className = "super-admin-trending-empty-cell";
      empty.colSpan = 6;
      const filters = activeFilterSummary();
      empty.textContent = filters.length
        ? `No trending searches match your filters for ${formatMonthLabel(state.monthKey)}.`
        : `No trending searches for ${formatMonthLabel(state.monthKey)}.`;
      emptyRow.append(empty);
      els.list.append(emptyRow);
      return;
    }

    for (const item of state.items) {
      const card = document.createElement("tr");
      card.className = "super-admin-trending-card super-admin-trending-row";
      card.dataset.trendingId = item.id;
      card.tabIndex = 0;
      card.innerHTML = `
        <td class="super-admin-trending-card__rank-cell">${renderRank(item.rank)}</td>
        <td>
          <div class="super-admin-trending-card__term">
            <span class="super-admin-trending-card__term-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-4-4" />
              </svg>
            </span>
            <span class="super-admin-trending-card__term-copy">
              <strong>${escapeHtml(item.term)}</strong>
              <small>Buyer search keyword</small>
            </span>
          </div>
        </td>
        <td>
          <span class="super-admin-trending-card__searches">
            <strong>${formatSearchCount(item.hitCount)}</strong>
            <small>this month</small>
          </span>
        </td>
        <td>
          <span class="super-admin-trending-card__badge ${item.isManual ? "is-manual" : "is-organic"}">
            ${item.isManual ? "Pinned" : "Organic"}
          </span>
        </td>
        <td>
          <span class="super-admin-trending-card__badge ${item.isActive ? "is-active" : "is-hidden"}">
            <span class="super-admin-trending-card__status-dot" aria-hidden="true"></span>
            ${item.isActive ? "Visible" : "Hidden"}
          </span>
        </td>
        <td class="super-admin-trending-card__actions-cell">
          <div class="super-admin-trending-card__quick-actions" aria-label="Search term quick actions">
            <button type="button" class="super-admin-trending-card__quick-action" data-trending-toggle aria-label="${item.isActive ? "Hide" : "Show"} search term" title="${item.isActive ? "Hide" : "Show"}">
              ${item.isActive ? `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="m3 3 18 18" />
                  <path d="M10.6 10.7a2 2 0 0 0 2.7 2.7" />
                  <path d="M9.9 4.2A10.7 10.7 0 0 1 12 4c6.4 0 9.9 8 9.9 8a17.8 17.8 0 0 1-2.2 3.2" />
                  <path d="M6.6 6.7A18.2 18.2 0 0 0 2.1 12S5.6 20 12 20a10.8 10.8 0 0 0 3.1-.5" />
                </svg>
              ` : `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M2.1 12S5.6 4 12 4s9.9 8 9.9 8-3.5 8-9.9 8-9.9-8-9.9-8Z" />
                  <circle cx="12" cy="12" r="2.6" />
                </svg>
              `}
            </button>
            <button type="button" class="super-admin-trending-card__quick-action${item.isManual ? " is-active" : ""}" data-trending-pin aria-label="${item.isManual ? "Unpin" : "Pin"} search term" title="${item.isManual ? "Unpin" : "Pin"}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M12 17v5" />
                <path d="M5 17h14" />
                <path d="m7 3 1 7-2 3h12l-2-3 1-7Z" />
              </svg>
            </button>
            <button type="button" class="super-admin-trending-card__quick-action is-danger" data-trending-delete aria-label="Delete search term" title="Delete">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M3 6h18" />
                <path d="M8 6V4h8v2" />
                <path d="m19 6-1 14H6L5 6" />
                <path d="M10 11v5M14 11v5" />
              </svg>
            </button>
          </div>
        </td>
      `;
      els.list.append(card);
    }
  }

  function applyListPayload(data) {
    state.monthKey = String(data.monthKey || state.monthKey || currentMonthKey());
    state.sort = String(data.sort || state.sort || "hits-desc");
    state.months = Array.isArray(data.months) ? data.months : [];
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
  }

  async function load({ quiet = false } = {}) {
    if (state.loading) return;
    state.loading = true;
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
      applyListPayload(data);
      render();
      if (!quiet) {
        const filters = activeFilterSummary();
        setFeedback(
          `${state.items.length} trending ${state.items.length === 1 ? "term" : "terms"} for ${formatMonthLabel(state.monthKey)}${filters.length ? ` (${filters.join(", ")})` : ""}.`,
          "notice",
        );
      }
    } catch (error) {
      state.items = [];
      render();
      setFeedback(
        error instanceof Error ? error.message : "Unable to load trending searches.",
        "error",
      );
    } finally {
      state.loading = false;
    }
  }

  async function updateTerm(id, patch) {
    const response = await fetch("/api/super-admin/trending-searches", {
      method: "PUT",
      headers: headers({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        id,
        month: state.monthKey,
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

  async function deleteTerm(id) {
    const response = await fetch("/api/super-admin/trending-searches", {
      method: "DELETE",
      headers: headers({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        id,
        month: state.monthKey,
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
    state.sort = "hits-desc";

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

    els.monthSelect?.addEventListener("change", () => {
      state.monthKey = String(els.monthSelect.value || currentMonthKey());
      void load({ quiet: true });
    });

    els.sortSelect?.addEventListener("change", () => {
      state.sort = String(els.sortSelect.value || "hits-desc");
      void load({ quiet: true });
    });

    els.platformSelect?.addEventListener("change", () => {
      state.platform = String(els.platformSelect.value || "all");
      void load({ quiet: true });
    });

    els.categorySelect?.addEventListener("change", () => {
      state.category = String(els.categorySelect.value || "all");
      void load({ quiet: true });
    });

    els.storeTypeSelect?.addEventListener("change", () => {
      state.storeType = String(els.storeTypeSelect.value || "all");
      void load({ quiet: true });
    });

    els.clientSelect?.addEventListener("change", () => {
      state.client = String(els.clientSelect.value || "all");
      void load({ quiet: true });
    });

    els.sourceSelect?.addEventListener("change", () => {
      state.source = String(els.sourceSelect.value || "all");
      void load({ quiet: true });
    });

    els.visibilitySelect?.addEventListener("change", () => {
      state.visibility = String(els.visibilitySelect.value || "all");
      void load({ quiet: true });
    });

    els.qInput?.addEventListener("input", () => {
      state.q = String(els.qInput.value || "").trim();
      scheduleSearchLoad();
    });

    els.resetButton?.addEventListener("click", () => {
      state.platform = "all";
      state.category = "all";
      state.storeType = "all";
      state.client = "all";
      state.source = "all";
      state.visibility = "all";
      state.q = "";
      state.sort = "hits-desc";
      if (els.qInput instanceof HTMLInputElement) els.qInput.value = "";
      void load({ quiet: true });
    });

    els.list?.addEventListener("click", async (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;
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
          if (!window.confirm(`Delete “${item.term}” from trending searches?`)) return;
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
