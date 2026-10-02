(() => {
  const STORAGE_PREFIX = "gms-sa-recent-search:";
  const MAX_ITEMS = 8;
  const MIN_QUERY_LENGTH = 1;
  const PANEL_ID = "sa-recent-search-panel";

  const CLOCK_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path></svg>';
  const CLOSE_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>';

  let activeInput = null;
  let activeShell = null;
  let panelEl = null;
  let suppressBlurClose = false;
  let positionRaf = 0;
  let positionLocked = false;
  const rememberTimers = new WeakMap();

  function scheduleRemember(input) {
    if (!(input instanceof HTMLInputElement)) {
      return;
    }
    const previous = rememberTimers.get(input);
    if (previous) {
      window.clearTimeout(previous);
    }
    const timer = window.setTimeout(() => {
      rememberTimers.delete(input);
      const query = normalizeQuery(input.value);
      if (query.length >= 2) {
        rememberQuery(input, query);
      }
    }, 900);
    rememberTimers.set(input, timer);
  }

  function getSearchShell(input) {
    if (!(input instanceof HTMLElement)) {
      return null;
    }
    return (
      input.closest(".product-panel-toolbar__search, .super-admin-company-search") ||
      input.closest(".super-admin-store-type-category-modal__icon-picker, .super-admin-store-type-modal__icon-picker") ||
      input
    );
  }

  function stopPositionSync() {
    if (positionRaf) {
      window.cancelAnimationFrame(positionRaf);
      positionRaf = 0;
    }
  }

  function startPositionSync(input) {
    stopPositionSync();
    const startedAt = performance.now();
    const tick = (now) => {
      if (!(activeInput instanceof HTMLInputElement) || activeInput !== input) {
        positionRaf = 0;
        return;
      }
      positionPanel(input);
      // Keep locked to the expanding search bar through its width transition.
      if (now - startedAt < 320) {
        positionRaf = window.requestAnimationFrame(tick);
      } else {
        positionRaf = 0;
      }
    };
    positionRaf = window.requestAnimationFrame(tick);
  }

  function normalizeQuery(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function getSearchScope(input) {
    if (!(input instanceof HTMLInputElement)) {
      return "default";
    }
    if (input.dataset.saRecentSearch) {
      return String(input.dataset.saRecentSearch).trim() || "default";
    }
    const keys = [
      "superAdminSearch",
      "superAdminProductRequestSearch",
      "superAdminStoreTypeSearch",
      "superAdminTrendingQ",
      "superAdminVouchersSearch",
      "superAdminFlashDealsSearch",
      "superAdminPaymentPartnerSearch",
      "superAdminDeliveryPartnerSearch",
      "superAdminAiPartnerSearch",
      "userDataSearch",
      "platformFeedbackSearch",
      "platformSettingSearch",
    ];
    for (const key of keys) {
      if (input.dataset[key] !== undefined) {
        return key.replace(/([A-Z])/g, "-$1").toLowerCase().replace(/^-/, "");
      }
    }
    const placeholder = normalizeQuery(input.getAttribute("placeholder") || "").toLowerCase();
    if (placeholder) {
      return placeholder.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "default";
    }
    return "default";
  }

  function storageKey(scope) {
    return `${STORAGE_PREFIX}${scope}`;
  }

  function readHistory(scope) {
    try {
      const raw = window.localStorage.getItem(storageKey(scope));
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed
        .map((item) => normalizeQuery(typeof item === "string" ? item : item?.query))
        .filter((query) => query.length >= MIN_QUERY_LENGTH)
        .slice(0, MAX_ITEMS);
    } catch (_error) {
      return [];
    }
  }

  function writeHistory(scope, items) {
    try {
      window.localStorage.setItem(storageKey(scope), JSON.stringify(items.slice(0, MAX_ITEMS)));
    } catch (_error) {
      // Ignore quota / private-mode write failures.
    }
  }

  function rememberQuery(input, rawQuery) {
    const query = normalizeQuery(rawQuery);
    if (query.length < MIN_QUERY_LENGTH) {
      return;
    }
    const scope = getSearchScope(input);
    const next = [query, ...readHistory(scope).filter((item) => item.toLowerCase() !== query.toLowerCase())];
    writeHistory(scope, next);
  }

  function removeQuery(input, rawQuery) {
    const query = normalizeQuery(rawQuery).toLowerCase();
    const scope = getSearchScope(input);
    writeHistory(
      scope,
      readHistory(scope).filter((item) => item.toLowerCase() !== query),
    );
  }

  function getPanel() {
    if (panelEl instanceof HTMLElement) {
      return panelEl;
    }
    const panel = document.createElement("div");
    panel.id = PANEL_ID;
    panel.className = "sa-recent-search-panel";
    panel.hidden = true;
    panel.setAttribute("role", "listbox");
    panel.setAttribute("aria-label", "Recent searches");
    document.body.append(panel);
    panelEl = panel;
    return panel;
  }

  function clearShellOpenState() {
    document.querySelectorAll(".is-sa-recent-open").forEach((node) => {
      node.classList.remove("is-sa-recent-open");
    });
    activeShell = null;
  }

  function hidePanel() {
    stopPositionSync();
    positionLocked = false;
    const panel = getPanel();
    panel.classList.remove("is-open");
    panel.hidden = true;
    panel.innerHTML = "";
    panel.style.removeProperty("top");
    panel.style.removeProperty("left");
    panel.style.removeProperty("width");
    clearShellOpenState();
    if (activeInput instanceof HTMLInputElement) {
      activeInput.removeAttribute("aria-expanded");
      activeInput.removeAttribute("aria-controls");
    }
    activeInput = null;
  }

  function positionPanel(input) {
    if (positionLocked) {
      return;
    }
    const panel = getPanel();
    const shell = getSearchShell(input) || input;
    const rect = shell.getBoundingClientRect();
    const width = Math.max(rect.width, 220);
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
    // Flush to the search bar — no gap.
    const top = Math.min(rect.bottom, window.innerHeight - 8);
    panel.style.top = `${Math.round(top)}px`;
    panel.style.left = `${Math.round(left)}px`;
    panel.style.width = `${Math.round(width)}px`;
  }

  function applyQuery(input, query) {
    const next = normalizeQuery(query);
    input.value = next;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    input.dispatchEvent(new Event("search", { bubbles: true }));
    rememberQuery(input, next);
    hidePanel();
    input.focus();
  }

  function renderPanel(input) {
    if (!(input instanceof HTMLInputElement) || input.disabled || input.readOnly) {
      hidePanel();
      return;
    }

    const typed = normalizeQuery(input.value).toLowerCase();
    const history = readHistory(getSearchScope(input)).filter((item) =>
      !typed || item.toLowerCase().includes(typed),
    );

    if (!history.length) {
      hidePanel();
      return;
    }

    activeInput = input;
    const shell = getSearchShell(input);
    clearShellOpenState();
    if (shell instanceof HTMLElement) {
      shell.classList.add("is-sa-recent-open");
      activeShell = shell;
    }

    const panel = getPanel();
    panel.classList.remove("is-open");
    positionLocked = false;
    positionPanel(input);
    input.setAttribute("aria-expanded", "true");
    input.setAttribute("aria-controls", PANEL_ID);
    panel.hidden = false;
    panel.replaceChildren();

    history.forEach((query, index) => {
      const row = document.createElement("div");
      row.className = "sa-recent-search-panel__row";
      row.setAttribute("role", "option");
      row.dataset.saRecentQuery = query;
      row.id = `${PANEL_ID}-option-${index}`;

      const selectBtn = document.createElement("button");
      selectBtn.type = "button";
      selectBtn.className = "sa-recent-search-panel__select";
      selectBtn.setAttribute("aria-label", `Search for ${query}`);
      selectBtn.innerHTML = `
        <span class="sa-recent-search-panel__icon">${CLOCK_ICON}</span>
        <span class="sa-recent-search-panel__text">${escapeHtml(query)}</span>
      `;
      selectBtn.addEventListener("mousedown", (event) => {
        event.preventDefault();
        suppressBlurClose = true;
      });
      selectBtn.addEventListener("click", (event) => {
        event.preventDefault();
        applyQuery(input, query);
      });

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "sa-recent-search-panel__remove";
      removeBtn.setAttribute("aria-label", `Remove ${query} from recent searches`);
      removeBtn.title = "Remove";
      removeBtn.innerHTML = CLOSE_ICON;
      removeBtn.addEventListener("mousedown", (event) => {
        event.preventDefault();
        suppressBlurClose = true;
      });
      removeBtn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        removeQuery(input, query);
        renderPanel(input);
        input.focus();
        suppressBlurClose = false;
      });

      row.append(selectBtn, removeBtn);
      panel.append(row);
    });

    // Drop straight down only. Freeze geometry during the open animation so the
    // expanding search width does not make the panel feel like it slides right.
    window.requestAnimationFrame(() => {
      if (activeInput !== input) {
        return;
      }
      positionLocked = false;
      positionPanel(input);
      positionLocked = true;
      panel.classList.add("is-open");
      window.setTimeout(() => {
        if (activeInput !== input) {
          return;
        }
        positionLocked = false;
        startPositionSync(input);
      }, 200);
    });
  }

  function isToolbarSearchInput(input) {
    if (!(input instanceof HTMLInputElement) || input.type !== "search") {
      return false;
    }
    if (!document.body.classList.contains("super-admin-page")) {
      return false;
    }
    return Boolean(
      input.closest(
        ".super-admin-main-header-container .product-panel-toolbar__search, .super-admin-companies-main-header .product-panel-toolbar__search, label.product-panel-toolbar__search.super-admin-company-search",
      ),
    );
  }

  function collectSearchInputs() {
    return Array.from(
      document.querySelectorAll(
        [
          'body.super-admin-page .super-admin-main-header-container .product-panel-toolbar__search input[type="search"]',
          'body.super-admin-page label.product-panel-toolbar__search.super-admin-company-search input[type="search"]',
          'body.super-admin-page .super-admin-store-type-category-modal__icon-search',
          'body.super-admin-page .super-admin-store-type-modal__icon-search',
          'body.super-admin-page input.super-admin-store-type-category-modal__icon-search[type="search"]',
        ].join(", "),
      ),
    ).filter((input, index, list) => list.indexOf(input) === index);
  }

  function bindInput(input) {
    if (!(input instanceof HTMLInputElement) || input.dataset.saRecentSearchBound === "1") {
      return;
    }
    input.dataset.saRecentSearchBound = "1";
    input.setAttribute("autocomplete", "off");
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-haspopup", "listbox");

    input.addEventListener("focus", () => {
      renderPanel(input);
    });

    input.addEventListener("input", () => {
      if (document.activeElement === input) {
        renderPanel(input);
      }
      scheduleRemember(input);
    });

    input.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        if (!getPanel().hidden) {
          event.preventDefault();
          hidePanel();
        }
        return;
      }
      if (event.key === "Enter") {
        rememberQuery(input, input.value);
        hidePanel();
      }
    });

    input.addEventListener("search", () => {
      rememberQuery(input, input.value);
    });

    input.addEventListener("blur", () => {
      window.setTimeout(() => {
        if (suppressBlurClose) {
          suppressBlurClose = false;
          return;
        }
        if (activeInput === input) {
          hidePanel();
        }
      }, 120);
    });
  }

  function initialize() {
    collectSearchInputs().forEach(bindInput);
  }

  document.addEventListener(
    "mousedown",
    (event) => {
      const panel = getPanel();
      if (panel.hidden) {
        return;
      }
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (panel.contains(target) || (activeInput instanceof HTMLElement && activeInput.contains(target))) {
        return;
      }
      if (activeInput?.closest(".product-panel-toolbar__search")?.contains(target)) {
        return;
      }
      hidePanel();
    },
    true,
  );

  window.addEventListener("resize", () => {
    if (activeInput instanceof HTMLInputElement && !getPanel().hidden) {
      positionPanel(activeInput);
    }
  });

  window.addEventListener(
    "scroll",
    () => {
      if (activeInput instanceof HTMLInputElement && !getPanel().hidden) {
        positionPanel(activeInput);
      }
    },
    true,
  );

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }

  window.GMSSuperAdminRecentSearch = Object.freeze({
    init: initialize,
    remember(input, query) {
      if (input instanceof HTMLInputElement) {
        rememberQuery(input, query ?? input.value);
      }
    },
    refresh(input) {
      if (input instanceof HTMLInputElement) {
        renderPanel(input);
      } else {
        initialize();
      }
    },
  });
})();
