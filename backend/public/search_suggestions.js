(() => {
  /**
   * Shared Top Searches + Recent Searches dropdown for buyer search bars.
   * Attach with: SearchSuggestions.attach({ form, input, clear, onSubmit })
   */
  const RECENT_KEY = "switch_recent_searches";
  const CLIENT_KEY = "switch_search_client_key";
  const MAX_RECENT = 20;

  function normalizeTerm(value) {
    return String(value || "").trim().replace(/\s+/g, " ").slice(0, 80);
  }

  function recentStorageKey(platformId) {
    const scoped = String(platformId || "").trim().toLowerCase();
    return scoped ? `${RECENT_KEY}_p_${scoped}` : RECENT_KEY;
  }

  function getClientKey() {
    try {
      let key = localStorage.getItem(CLIENT_KEY) || "";
      if (!key) {
        key = `web_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        localStorage.setItem(CLIENT_KEY, key);
      }
      return key;
    } catch (_) {
      return `web_${Date.now()}`;
    }
  }

  function readRecentLocal(platformId = "") {
    try {
      const raw = JSON.parse(
        localStorage.getItem(recentStorageKey(platformId)) || "[]",
      );
      return Array.isArray(raw)
        ? raw.map(normalizeTerm).filter(Boolean).slice(0, MAX_RECENT)
        : [];
    } catch (_) {
      return [];
    }
  }

  function writeRecentLocal(terms, platformId = "") {
    try {
      localStorage.setItem(
        recentStorageKey(platformId),
        JSON.stringify((Array.isArray(terms) ? terms : []).slice(0, MAX_RECENT)),
      );
    } catch (_) {
      // ignore
    }
  }

  function pushRecentLocal(term, platformId = "") {
    const next = normalizeTerm(term);
    if (!next) return readRecentLocal(platformId);
    const list = readRecentLocal(platformId).filter(
      (entry) => entry.toLowerCase() !== next.toLowerCase(),
    );
    list.unshift(next);
    writeRecentLocal(list, platformId);
    return list;
  }

  function removeRecentLocal(term, platformId = "") {
    const key = normalizeTerm(term).toLowerCase();
    const list = readRecentLocal(platformId).filter(
      (entry) => entry.toLowerCase() !== key,
    );
    writeRecentLocal(list, platformId);
    return list;
  }

  function clearRecentLocal(platformId = "") {
    writeRecentLocal([], platformId);
    return [];
  }

  async function fetchTrending(limit = 12, platformId = "") {
    try {
      const params = new URLSearchParams({ limit: String(limit) });
      const scoped = String(platformId || "").trim().toLowerCase();
      if (scoped) params.set("platformId", scoped);
      const response = await fetch(`/api/trending-searches?${params}`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !Array.isArray(data.trending)) return [];
      return data.trending
        .map((item) => ({
          id: String(item?.id || ""),
          term: normalizeTerm(item?.term),
          hitCount: Number(item?.hitCount) || 0,
        }))
        .filter((item) => item.term);
    } catch (_) {
      return [];
    }
  }

  async function recordSearch(term, context = {}) {
    const next = normalizeTerm(term);
    if (!next) return;
    const extra =
      typeof context === "function" ? context() || {} : context || {};
    const platformId = String(extra.platformId || extra.platform || "").trim();
    pushRecentLocal(next, platformId);
    try {
      const session = window.SwitchBuyerAuth?.readBuyerSession?.() || null;
      const accountId = String(session?.accountId || session?.id || "").trim();
      await fetch("/api/search-events", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          term: next,
          accountId,
          clientKey: getClientKey(),
          client: "web",
          platformId,
          category: String(extra.category || extra.categoryFilter || "").trim(),
          storeType: String(
            extra.storeType || extra.businessType || extra.type || "",
          ).trim(),
        }),
      });
    } catch (_) {
      // local recent already saved
    }
  }

  function svg(pathMarkup, className = "") {
    return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${pathMarkup}</svg>`;
  }

  const clockFadingPaths =
    '<path d="M12 2a10 10 0 0 1 7.38 16.75"/>' +
    '<path d="M12 6v6l4 2"/>' +
    '<path d="M2.5 8.875a10 10 0 0 0-.5 3"/>' +
    '<path d="M2.83 16a10 10 0 0 0 2.43 3.4"/>' +
    '<path d="M4.636 5.235a10 10 0 0 1 .891-.857"/>' +
    '<path d="M8.644 21.42a10 10 0 0 0 7.631-.38"/>';

  function renderDropdown(panel, { trending, recent, showAllTrending }) {
    const collapsedLimit = 6;
    const visibleTrending = showAllTrending
      ? trending
      : trending.slice(0, collapsedLimit);
    const hasHiddenTrending =
      !showAllTrending && trending.length > collapsedLimit;
    const showTrendingToggle = hasHiddenTrending || showAllTrending;

    const trendingChips = visibleTrending
      .map(
        (item) => `
        <button type="button" class="ss-suggest-chip" data-ss-suggest-term="${escapeAttr(item.term)}">
          ${svg('<path d="M16 7h6v6"/><path d="m22 7-8.5 8.5-5-5L2 17"/>', "ss-suggest-chip__icon")}
          <span>${escapeHtml(item.term)}</span>
        </button>`,
      )
      .join("");

    const recentRows = recent.length
      ? recent
          .map(
            (term) => `
          <div class="ss-suggest-recent__row">
            <button type="button" class="ss-suggest-recent__term" data-ss-suggest-term="${escapeAttr(term)}">
              ${svg(clockFadingPaths, "ss-suggest-recent__clock")}
              <span>${escapeHtml(term)}</span>
            </button>
            <button type="button" class="ss-suggest-recent__remove" data-ss-suggest-remove="${escapeAttr(term)}" aria-label="Remove search">
              ${svg('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>')}
            </button>
          </div>`,
          )
          .join("")
      : `<p class="ss-suggest-empty">No recent searches yet</p>`;

    panel.innerHTML = `
      <div class="ss-suggest-section">
        <div class="ss-suggest-section__head">
          <span class="ss-suggest-section__title">
            <img class="ss-suggest-section__top-art" src="/assets/top-search-fire-art.png" alt="" aria-hidden="true" />
            Top Searches
          </span>
          ${
            showTrendingToggle
              ? `<button type="button" class="ss-suggest-link" data-ss-suggest-toggle-trending>
                   ${showAllTrending ? "See less" : "See All"}
                 </button>`
              : ""
          }
        </div>
        <div class="ss-suggest-chips">${trendingChips || `<p class="ss-suggest-empty">No top searches yet</p>`}</div>
      </div>
      <div class="ss-suggest-section">
        <div class="ss-suggest-section__head">
          <span class="ss-suggest-section__title">
            <img class="ss-suggest-section__recent-art" src="/assets/recent-search-heading-art.png" alt="" aria-hidden="true" />
            Recent Searches
          </span>
          ${
            recent.length
              ? `<button type="button" class="ss-suggest-link" data-ss-suggest-clear-recent>Clear All</button>`
              : ""
          }
        </div>
        <div class="ss-suggest-recent">${recentRows}</div>
      </div>
    `;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/'/g, "&#39;");
  }

  function attach(options = {}) {
    const form = options.form;
    const input = options.input;
    const wrap =
      options.wrap ||
      input?.closest?.(".md-sa-search") ||
      input?.closest?.(".ss-hero-search") ||
      form;
    if (!(input instanceof HTMLInputElement) || !(wrap instanceof HTMLElement)) {
      return null;
    }

    function resolveContext() {
      if (typeof options.getContext === "function") {
        try {
          return options.getContext() || {};
        } catch (_) {
          return {};
        }
      }
      return options.context || {};
    }

    function resolvePlatformId() {
      const ctx = resolveContext();
      return String(ctx.platformId || ctx.platform || "").trim().toLowerCase();
    }

    let panel = wrap.querySelector(".ss-suggest-dropdown");
    if (!panel) {
      panel = document.createElement("div");
      panel.className = "ss-suggest-dropdown";
      panel.hidden = true;
      panel.setAttribute("role", "listbox");
      panel.setAttribute("aria-label", "Search suggestions");
      wrap.classList.add("ss-suggest-anchor");
      wrap.append(panel);
    }

    const state = {
      trending: [],
      recent: readRecentLocal(resolvePlatformId()),
      showAllTrending: false,
      open: false,
      loaded: false,
      mode: "suggestions", // suggestions | live
      liveHtml: "",
    };

    const livePanel = Boolean(options.livePanel);

    function paint() {
      if (state.mode === "live") {
        panel.innerHTML = state.liveHtml || "";
        panel.setAttribute("aria-label", "Search results");
        return;
      }
      panel.setAttribute("aria-label", "Search suggestions");
      renderDropdown(panel, state);
    }

    function open() {
      state.open = true;
      panel.hidden = false;
      wrap.classList.add("is-suggest-open");
      const query = normalizeTerm(input.value);
      if (livePanel && query && typeof options.onQueryChange === "function") {
        options.onQueryChange(query);
        return;
      }
      if (!query) state.mode = "suggestions";
      paint();
    }

    function close() {
      state.open = false;
      panel.hidden = true;
      wrap.classList.remove("is-suggest-open");
    }

    function showSuggestions() {
      state.mode = "suggestions";
      if (state.open) paint();
    }

    function showLive(html) {
      state.mode = "live";
      state.liveHtml = String(html || "");
      state.open = true;
      panel.hidden = false;
      wrap.classList.add("is-suggest-open");
      paint();
    }

    async function ensureLoaded() {
      if (state.loaded) return;
      const platformId = resolvePlatformId();
      state.trending = await fetchTrending(18, platformId);
      state.recent = readRecentLocal(platformId);
      state.loaded = true;
      if (state.open && state.mode === "suggestions") paint();
    }

    function chooseTerm(term) {
      const next = normalizeTerm(term);
      if (!next) return;
      input.value = next;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      // Prefer fill-only handlers (platform home). Submit only when explicitly requested.
      if (typeof options.onSelect === "function") {
        // App pattern: keep the panel open and swap to live results in-place.
        if (!livePanel) close();
        options.onSelect(next);
        return;
      }
      close();
      void recordSearch(next, resolveContext);
      if (typeof options.onSubmit === "function") {
        options.onSubmit(next);
      } else if (form instanceof HTMLFormElement) {
        form.requestSubmit?.();
      }
    }

    panel.addEventListener("mousedown", (event) => {
      // Keep focus on input while interacting with dropdown.
      event.preventDefault();
    });

    panel.addEventListener("click", (event) => {
      // Keep dropdown open after paint() replaces nodes (See All / See less /
      // Clear / remove). Detached click targets fail wrap.contains().
      event.stopPropagation();
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;
      const platformId = resolvePlatformId();

      const termBtn = target.closest("[data-ss-suggest-term]");
      if (termBtn) {
        chooseTerm(termBtn.getAttribute("data-ss-suggest-term"));
        return;
      }

      const removeBtn = target.closest("[data-ss-suggest-remove]");
      if (removeBtn) {
        state.recent = removeRecentLocal(
          removeBtn.getAttribute("data-ss-suggest-remove"),
          platformId,
        );
        paint();
        return;
      }

      if (target.closest("[data-ss-suggest-clear-recent]")) {
        state.recent = clearRecentLocal(platformId);
        paint();
        return;
      }

      if (target.closest("[data-ss-suggest-toggle-trending]")) {
        state.showAllTrending = !state.showAllTrending;
        paint();
      }
    });

    input.addEventListener("focus", () => {
      void ensureLoaded().then(open);
    });

    input.addEventListener("input", () => {
      const hasQuery = Boolean(input.value.trim());
      if (livePanel) {
        // App pattern: panel stays open; parent swaps Top/Recent ↔ live hits.
        if (!hasQuery && document.activeElement === input) {
          state.mode = "suggestions";
          if (state.open) paint();
          else open();
        }
        return;
      }
      if (hasQuery) {
        close();
      } else if (document.activeElement === input) {
        open();
      }
    });

    document.addEventListener("click", (event) => {
      const path =
        typeof event.composedPath === "function" ? event.composedPath() : [];
      if (path.includes(wrap)) return;
      if (event.target instanceof Node && wrap.contains(event.target)) return;
      close();
    });

    form?.addEventListener("submit", () => {
      const term = normalizeTerm(input.value);
      if (term) {
        state.recent = pushRecentLocal(term, resolvePlatformId());
        void recordSearch(term, resolveContext);
      }
      if (!livePanel) close();
    });

    void ensureLoaded();

    return {
      open,
      close,
      showSuggestions,
      showLive,
      refreshRecent() {
        state.recent = readRecentLocal(resolvePlatformId());
        if (state.open && state.mode === "suggestions") paint();
      },
      recordSearch,
    };
  }

  window.SearchSuggestions = {
    attach,
    recordSearch,
    readRecentLocal,
    fetchTrending,
  };
})();
