(() => {
  /**
   * Platform storefront (Shop / Food / Hotels / future).
   * Uses Super Admin platform hero image + approved product listings.
   * Filters: business type + category; search targets products only.
   */
  const pageParams = new URLSearchParams(window.location.search);

  const state = {
    platforms: [],
    storeTypes: [],
    products: [],
    selectedTypeName: "all",
    categoryFilter: "all",
    query: String(pageParams.get("q") || "").trim(),
    adminIdFilter: String(pageParams.get("adminId") || "").trim().toLowerCase(),
    openProductId: String(pageParams.get("productId") || "").trim(),
    platformMeta: null,
    suggestions: null,
  };

  const els = {
    hero: document.getElementById("ss-hero"),
    heroMedia: document.getElementById("ss-hero-media"),
    heroTitle: document.getElementById("ss-hero-title"),
    heroSubtitle: document.getElementById("ss-hero-subtitle"),
    heroPlatformLabel: document.getElementById("ss-hero-platform-label"),
    brandPlatform: document.querySelector(".ss-brand__platform"),
    brandPlatformIcon: document.getElementById("ss-brand-platform-icon"),
    brandPlatformLabel: document.getElementById("ss-brand-platform-label"),
    searchForm: document.getElementById("ss-hero-search-form"),
    search: document.getElementById("ss-search-input"),
    searchClear: document.getElementById("ss-search-clear"),
    typeChips: document.getElementById("ss-type-chips"),
    categoryChips: document.getElementById("ss-category-chips"),
    products: document.getElementById("ss-products"),
    listingsCount: document.getElementById("ss-listings-count"),
    state: document.getElementById("ss-state"),
    stateText: document.getElementById("ss-state-text"),
    stateRetry: document.getElementById("ss-state-retry"),
    dialog: document.getElementById("ss-product-dialog"),
    dialogMedia: document.getElementById("ss-dialog-media"),
    dialogStore: document.getElementById("ss-dialog-store"),
    dialogTitle: document.getElementById("ss-dialog-title"),
    dialogPrice: document.getElementById("ss-dialog-price"),
    dialogDesc: document.getElementById("ss-dialog-desc"),
    menuBtn: document.getElementById("ss-menu-btn"),
    sidebar: document.getElementById("ss-sidebar"),
    sidebarBackdrop: document.getElementById("ss-sidebar-backdrop"),
    sidebarClose: document.getElementById("ss-sidebar-close"),
    sidebarPlatforms: document.getElementById("ss-sidebar-platforms"),
    activityPlatformLabel: document.getElementById("ss-activity-platform-label"),
    activityList: document.getElementById("ss-activity-list"),
  };

  const DEFAULT_PLATFORMS = [
    { id: "shop", name: "Shop", status: "active", iconName: "store", iconImageUrl: "/assets/platform-shop-art.png" },
    { id: "food", name: "Food", status: "active", iconName: "utensils", iconImageUrl: "/assets/platform-food-art.png" },
    { id: "hotels", name: "Hotels", status: "active", iconName: "hotel" },
    { id: "resort", name: "Resort", status: "active", iconName: "tree-palm" },
  ];
  const DEFAULT_PLATFORM_ART_URLS = Object.freeze({
    shop: "/assets/platform-shop-art.png",
    food: "/assets/platform-food-art.png",
  });

  const PLATFORM_ICON_SVGS = {
    store: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 21v-5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5"/><path d="M17.774 10.31a1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.451 0 1.12 1.12 0 0 0-1.548 0 2.5 2.5 0 0 1-3.452 0 1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.77-3.248l2.889-4.184A2 2 0 0 1 7 2h10a2 2 0 0 1 1.653.873l2.895 4.192a2.5 2.5 0 0 1-3.774 3.244"/><path d="M4 10.95V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8.05"/></svg>`,
    utensils: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>`,
    hotel: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 22v-6.57"/><path d="M12 11h.01"/><path d="M12 7h.01"/><path d="M14 15.43V22"/><path d="M15 16a5 5 0 0 0-6 0"/><path d="M16 11h.01"/><path d="M16 7h.01"/><path d="M8 11h.01"/><path d="M8 7h.01"/><rect x="4" y="2" width="16" height="20" rx="2"/></svg>`,
    "tree-palm": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 8c0-2.76-2.46-5-5.5-5S2 5.24 2 8h2l1-1 1 1h4"/><path d="M13 7.14A7.76 7.76 0 0 1 15.5 6c3.04 0 5.5 2.24 5.5 5h-3l-1-1-1 1h-3"/><path d="M5.89 9.71c-2.15 2.15-2.3 5.47-.35 7.43l4.24-4.25.7-.7.71-.71 2.12-2.12c-1.95-1.96-5.27-1.8-7.42.35"/><path d="M11 15.5c.5 2.5-.17 4.5-1 6.5h4c2-2 2-4 2-6"/></svg>`,
    shopping: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`,
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function normalizeKey(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function normalizePlatformId(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  const PLATFORM = normalizePlatformId(pageParams.get("platform")) || "shop";

  function platformAssetUrl(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    if (/^(https?:|data:|blob:)/i.test(raw) || raw.startsWith("/")) return raw;
    return `/${raw.replace(/^\/+/, "")}`;
  }

  function platformLabel(platformId, fallbackName) {
    if (fallbackName) return String(fallbackName).trim();
    const id = normalizePlatformId(platformId) || "shop";
    if (id === "shop") return "Shop";
    if (id === "food") return "Food";
    if (id === "hotels") return "Hotels";
    if (id === "resort") return "Resort";
    return id.charAt(0).toUpperCase() + id.slice(1);
  }

  function resolvePlatformIconKey(platform) {
    const named = String(platform?.iconName || "").trim().toLowerCase();
    if (named && PLATFORM_ICON_SVGS[named]) return named;
    const id = normalizePlatformId(platform?.id || platform?.name);
    if (id === "shop") return "store";
    if (id === "food") return "utensils";
    if (id === "hotels" || id === "hotel") return "hotel";
    if (id === "resort" || id.includes("resort") || id.includes("palm")) return "tree-palm";
    return named || "store";
  }

  function platformIconMarkup(platform) {
    const platformId = normalizePlatformId(platform?.id || platform?.name);
    const iconImageUrl = platformAssetUrl(
      platform?.iconImageUrl
        || platform?.iconUrl
        || DEFAULT_PLATFORM_ART_URLS[platformId],
    );
    if (iconImageUrl) {
      return `<img src="${escapeHtml(iconImageUrl)}" alt="" loading="lazy" decoding="async" />`;
    }
    const key = resolvePlatformIconKey(platform);
    return PLATFORM_ICON_SVGS[key] || PLATFORM_ICON_SVGS.store;
  }

  function sidebarPlatformIconMarkup(platform) {
    const platformId = normalizePlatformId(platform?.id || platform?.name);
    const iconImageUrl = platformAssetUrl(
      platform?.iconImageUrl
        || platform?.iconUrl
        || DEFAULT_PLATFORM_ART_URLS[platformId],
    );
    if (iconImageUrl) {
      return `<img src="${escapeHtml(iconImageUrl)}" alt="" loading="lazy" decoding="async" />`;
    }
    const key = resolvePlatformIconKey(platform);
    return PLATFORM_ICON_SVGS[key] || PLATFORM_ICON_SVGS.store;
  }

  function inferPlatformIdFromName(name) {
    const key = normalizeKey(name);
    if (!key) return "shop";
    if (
      key.includes("hotel")
      || key.includes("hote ")
      || (/\bhotes?\b/.test(key) && key.includes("restaurant"))
    ) {
      return "hotels";
    }
    if (
      key === "food"
      || key === "foods"
      || key.includes("restaurant")
      || key.includes("dining")
      || key.includes("cafe")
    ) {
      return "food";
    }
    return "shop";
  }

  function platformForStoreType(item) {
    const explicit = normalizePlatformId(item?.platformId || item?.platform || item?.buyerPlatform);
    if (explicit) return explicit;
    return inferPlatformIdFromName(item?.name);
  }

  function shopStoreTypes() {
    return state.storeTypes.filter((item) => platformForStoreType(item) === PLATFORM);
  }

  function selectedStoreType() {
    if (state.selectedTypeName === "all") return null;
    return shopStoreTypes().find(
      (item) => normalizeKey(item.name) === normalizeKey(state.selectedTypeName),
    ) || null;
  }

  function categoriesForType(storeType) {
    if (!storeType) return [];
    const details = Array.isArray(storeType.categoryDetails)
      ? storeType.categoryDetails
      : [];
    const fromDetails = details
      .filter((d) => String(d?.status || "active").toLowerCase() !== "inactive")
      .map((d) => String(d?.name || "").trim())
      .filter(Boolean);
    if (fromDetails.length) return fromDetails;
    return (Array.isArray(storeType.categories) ? storeType.categories : [])
      .map((c) => String(c || "").trim())
      .filter(Boolean);
  }

  function availableCategories() {
    const selected = selectedStoreType();
    if (selected) return categoriesForType(selected);
    const names = [];
    const seen = new Set();
    shopStoreTypes().forEach((type) => {
      categoriesForType(type).forEach((name) => {
        const key = normalizeKey(name);
        if (!key || seen.has(key)) return;
        seen.add(key);
        names.push(name);
      });
    });
    return names;
  }

  function formatMoney(amount) {
    const n = Number(amount);
    if (!Number.isFinite(n)) return "₱0.00";
    return `₱${n.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  function productImage(product) {
    const urls = Array.isArray(product?.imageUrls) ? product.imageUrls : [];
    const first = urls.find((u) => String(u || "").trim());
    return String(product?.imageUrl || first || "").trim();
  }

  function productPrice(product) {
    const original = Number(product?.originalPrice ?? product?.price ?? 0);
    const sales = Number(product?.salesPrice);
    const hasSale = Number.isFinite(sales) && sales >= 0 && sales < original;
    return {
      original,
      current: hasSale ? sales : original,
      hasSale,
    };
  }

  function productStoreType(product) {
    return String(
      product?.storeType || product?.storeTypeName || product?.businessType || "",
    ).trim();
  }

  function sellerLabel(product) {
    return String(
      product?.companyName || product?.storeName || product?.businessName || "Seller",
    ).trim();
  }

  function productCategories(product) {
    const multi = Array.isArray(product?.categories)
      ? product.categories.map((c) => String(c || "").trim()).filter(Boolean)
      : [];
    const single = String(product?.category || "").trim();
    if (multi.length) return multi;
    return single ? [single] : [];
  }

  function showState(message, { retry = false } = {}) {
    if (!els.state) return;
    els.state.hidden = false;
    if (els.stateText) els.stateText.textContent = message;
    if (els.stateRetry) els.stateRetry.hidden = !retry;
  }

  function hideState() {
    if (els.state) els.state.hidden = true;
  }

  async function fetchJson(url) {
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || `Request failed (${response.status})`);
    }
    return data;
  }

  function syncUrl() {
    const url = new URL(window.location.href);
    url.searchParams.set("platform", PLATFORM);
    if (state.selectedTypeName && state.selectedTypeName !== "all") {
      url.searchParams.set("type", state.selectedTypeName);
    } else {
      url.searchParams.delete("type");
    }
    if (state.categoryFilter && state.categoryFilter !== "all") {
      url.searchParams.set("category", state.categoryFilter);
    } else {
      url.searchParams.delete("category");
    }
    if (state.query.trim()) {
      url.searchParams.set("q", state.query.trim());
    } else {
      url.searchParams.delete("q");
    }
    window.history.replaceState({}, "", url);
  }

  function syncSearchClear() {
    if (!els.searchClear) return;
    els.searchClear.hidden = !String(els.search?.value || "").trim();
  }

  function renderHero() {
    const label = platformLabel(PLATFORM, state.platformMeta?.name);
    document.title = `Switch ${label}`;
    if (els.brandPlatformLabel) {
      els.brandPlatformLabel.textContent = label;
    } else if (els.brandPlatform) {
      els.brandPlatform.textContent = label;
    }
    if (els.brandPlatformIcon) {
      els.brandPlatformIcon.innerHTML = platformIconMarkup(
        state.platformMeta || { id: PLATFORM, name: label },
      );
    }
    if (els.heroPlatformLabel) els.heroPlatformLabel.textContent = label;
    if (els.heroTitle) els.heroTitle.textContent = label;
    if (els.heroSubtitle) {
      els.heroSubtitle.textContent = `Search ${label.toLowerCase()} listings from Super Admin`;
    }
    if (els.search) {
      els.search.placeholder = `Search ${label.toLowerCase()} products`;
      els.search.value = state.query;
    }
    syncSearchClear();

    if (!els.heroMedia) return;
    const heroUrl = platformAssetUrl(
      state.platformMeta?.heroImageUrl || state.platformMeta?.imageUrl,
    );
    if (heroUrl) {
      els.heroMedia.classList.add("has-image");
      els.heroMedia.innerHTML = `<img src="${escapeHtml(heroUrl)}" alt="" decoding="async" />`;
    } else {
      els.heroMedia.classList.remove("has-image");
      els.heroMedia.innerHTML = "";
    }
  }

  function renderTypeChips() {
    if (!els.typeChips) return;
    const types = shopStoreTypes();
    const chips = [
      { id: "all", label: "All" },
      ...types.map((item) => ({
        id: String(item.name || "").trim(),
        label: String(item.name || "").trim(),
      })),
    ].filter((chip) => chip.id);

    els.typeChips.innerHTML = chips
      .map((chip) => {
        const active = normalizeKey(state.selectedTypeName) === normalizeKey(chip.id)
          ? " is-active"
          : "";
        return `
          <button type="button" class="md-chip${active}" data-ss-type="${escapeHtml(chip.id)}" role="tab">
            ${escapeHtml(chip.label)}
          </button>
        `;
      })
      .join("");
  }

  function renderCategoryChips() {
    if (!els.categoryChips) return;
    const categories = availableCategories();
    const chips = [
      { id: "all", label: "All" },
      ...categories.map((name) => ({ id: name, label: name })),
    ];

    if (
      state.categoryFilter !== "all"
      && !categories.some((name) => normalizeKey(name) === normalizeKey(state.categoryFilter))
    ) {
      state.categoryFilter = "all";
    }

    els.categoryChips.innerHTML = chips
      .map((chip) => {
        const active = normalizeKey(state.categoryFilter) === normalizeKey(chip.id)
          ? " is-active"
          : "";
        return `
          <button type="button" class="md-chip${active}" data-ss-category="${escapeHtml(chip.id)}" role="tab">
            ${escapeHtml(chip.label)}
          </button>
        `;
      })
      .join("");
  }

  function filteredProducts() {
    const typeKeys = new Set(
      shopStoreTypes().map((item) => normalizeKey(item.name)).filter(Boolean),
    );
    let list = state.products.filter((product) =>
      typeKeys.has(normalizeKey(productStoreType(product))),
    );

    const selected = selectedStoreType();
    if (selected) {
      const typeKey = normalizeKey(selected.name);
      list = list.filter(
        (product) => normalizeKey(productStoreType(product)) === typeKey,
      );
    }

    if (state.categoryFilter !== "all") {
      const wanted = normalizeKey(state.categoryFilter);
      list = list.filter((product) =>
        productCategories(product).some((cat) => normalizeKey(cat) === wanted),
      );
    }

    const query = state.query.trim().toLowerCase();
    if (query) {
      list = list.filter((product) => {
        const haystack = [
          product?.name,
          product?.description,
          ...productCategories(product),
          sellerLabel(product),
          productStoreType(product),
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      });
    }

    if (state.adminIdFilter) {
      list = list.filter(
        (product) =>
          String(product?.adminId || "").trim().toLowerCase() === state.adminIdFilter,
      );
    }
    return list;
  }

  function renderProductCard(product) {
    const price = productPrice(product);
    const image = productImage(product);
    const name = String(product?.name || "Product").trim();
    const initial = name.slice(0, 1).toUpperCase() || "P";
    const media = image
      ? `<img src="${escapeHtml(image)}" alt="" loading="lazy" />`
      : `<span>${escapeHtml(initial)}</span>`;
    const sale = price.hasSale
      ? `<span class="md-sale-tag">Sale</span><s>${escapeHtml(formatMoney(price.original))}</s>`
      : "";
    const cats = productCategories(product);
    const catLine = cats.length
      ? `<p class="ss-product-cat">${escapeHtml(cats.join(" · "))}</p>`
      : "";

    return `
      <button type="button" class="md-product-card" data-ss-product="${escapeHtml(product.id)}">
        <div class="md-product-card__media">${media}</div>
        <div class="md-product-card__body">
          <p class="md-product-card__store">${escapeHtml(sellerLabel(product))}</p>
          <p class="md-product-card__name">${escapeHtml(name)}</p>
          ${catLine}
          <div class="md-product-card__price">
            <strong>${escapeHtml(formatMoney(price.current))}</strong>
            ${sale}
          </div>
        </div>
      </button>
    `;
  }

  function renderProducts() {
    if (!els.products) return;
    const list = filteredProducts();
    if (els.listingsCount) {
      els.listingsCount.textContent = list.length === 1
        ? "1 listing"
        : `${list.length} listings`;
    }
    els.products.innerHTML = list.length
      ? list.map(renderProductCard).join("")
      : `<div class="md-empty"><p>No products match these filters.</p></div>`;
  }

  function refreshCatalogUi() {
    renderTypeChips();
    renderCategoryChips();
    renderProducts();
    syncUrl();
  }

  function openProduct(productId) {
    const product = state.products.find((item) => String(item.id) === String(productId));
    if (!product || !els.dialog) return;
    const price = productPrice(product);
    const image = productImage(product);
    const name = String(product.name || "Product").trim();
    if (els.dialogMedia) {
      els.dialogMedia.innerHTML = image
        ? `<img src="${escapeHtml(image)}" alt="" />`
        : `<span style="font-size:2rem;font-weight:700;color:#0a7a6e">${escapeHtml(name.slice(0, 1))}</span>`;
    }
    if (els.dialogStore) els.dialogStore.textContent = sellerLabel(product);
    if (els.dialogTitle) els.dialogTitle.textContent = name;
    if (els.dialogPrice) {
      els.dialogPrice.textContent = price.hasSale
        ? `${formatMoney(price.current)} · was ${formatMoney(price.original)}`
        : formatMoney(price.current);
    }
    if (els.dialogDesc) {
      els.dialogDesc.textContent = String(product.description || "").trim() || "—";
    }
    if (typeof els.dialog.showModal === "function") els.dialog.showModal();
  }

  async function loadCatalog() {
    showState("Loading…");
    try {
      const [platformsData, storeTypesData, productsData] = await Promise.all([
        fetchJson("/api/platforms").catch(() => ({ platforms: [] })),
        fetchJson("/api/store-types"),
        fetchJson("/api/products?approvalStatus=approved").catch(() => ({ products: [] })),
      ]);

      state.platforms = Array.isArray(platformsData.platformDetails)
        ? platformsData.platformDetails
        : Array.isArray(platformsData.platforms) && platformsData.platforms[0]?.id
          ? platformsData.platforms
          : [];
      state.storeTypes = Array.isArray(storeTypesData.storeTypeDetails)
        ? storeTypesData.storeTypeDetails
        : [];
      state.products = Array.isArray(productsData.products) ? productsData.products : [];
      state.platformMeta = state.platforms.find(
        (item) => normalizePlatformId(item.id) === PLATFORM,
      ) || {
        id: PLATFORM,
        name: platformLabel(PLATFORM),
      };
      if (window.BuyerPlatformTheme?.applyPlatformTheme) {
        window.BuyerPlatformTheme.applyPlatformTheme(PLATFORM, state.platformMeta);
      }

      const wantedType = String(pageParams.get("type") || "").trim();
      const wantedCategory = String(pageParams.get("category") || "").trim();
      if (
        wantedType
        && wantedType.toLowerCase() !== "all"
        && shopStoreTypes().some((item) => normalizeKey(item.name) === normalizeKey(wantedType))
      ) {
        state.selectedTypeName = wantedType;
      } else {
        state.selectedTypeName = "all";
      }
      state.categoryFilter = wantedCategory || "all";
      state.query = String(pageParams.get("q") || "").trim();
      state.adminIdFilter = String(pageParams.get("adminId") || "").trim().toLowerCase();
      state.openProductId = String(pageParams.get("productId") || "").trim();

      hideState();
      renderHero();
      renderSidebarPlatforms();
      refreshCatalogUi();
      if (state.openProductId) {
        openProduct(state.openProductId);
      }
    } catch (error) {
      showState(error instanceof Error ? error.message : "Unable to load.", { retry: true });
      renderSidebarPlatforms();
    }
  }

  function bindHeaderScroll() {
    const header = document.querySelector("body.ss-app > .login-site-header");
    if (!(header instanceof HTMLElement)) return;

    const update = () => {
      header.classList.toggle("is-scrolled", window.scrollY > 12);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
  }

  function bindHeaderSearchDock() {
    if (!window.PlatformSearchDock?.attach) return;
    window.PlatformSearchDock.attach({
      form: els.searchForm,
      home: document.getElementById("ss-hero-search-home"),
      headerSlot: document.getElementById("ss-header-search-slot"),
      header: document.querySelector("body.ss-app > .login-site-header"),
      input: els.search,
      onAfterMove: ({ hadFocus }) => {
        if (!hadFocus || !(els.search instanceof HTMLInputElement)) return;
        // Same as home: keep Top/Recent (or typing focus) after dock/undock.
        if (!String(els.search.value || "").trim()) {
          state.suggestions?.showSuggestions?.();
          state.suggestions?.open?.();
        }
      },
    });
  }

  function setSidebarOpen(open) {
    const next = Boolean(open);
    document.body.classList.toggle("ss-sidebar-open", next);
    els.sidebar?.classList.toggle("is-open", next);
    els.sidebarBackdrop?.classList.toggle("is-open", next);
    if (els.sidebarBackdrop) els.sidebarBackdrop.hidden = !next;
    if (els.sidebar) els.sidebar.setAttribute("aria-hidden", next ? "false" : "true");
    if (els.menuBtn) {
      els.menuBtn.setAttribute("aria-expanded", next ? "true" : "false");
      els.menuBtn.setAttribute("aria-label", next ? "Close menu" : "Open menu");
    }
    if (next) {
      els.sidebarClose?.focus();
    } else {
      els.menuBtn?.focus();
    }
  }

  function renderSidebarPlatforms() {
    if (!els.sidebarPlatforms) return;
    const platforms = (state.platforms.length ? state.platforms : DEFAULT_PLATFORMS)
      .slice()
      .sort((a, b) => Number(a?.sortOrder || 0) - Number(b?.sortOrder || 0));

    els.sidebarPlatforms.innerHTML = platforms
      .map((item) => {
        const id = normalizePlatformId(item.id) || normalizePlatformId(item.name);
        if (!id) return "";
        const label = platformLabel(id, item.name);
        const inactive = String(item.status || "active").toLowerCase() === "inactive"
          || Boolean(item.comingSoon);
        const active = id === PLATFORM ? " is-active" : "";
        const disabled = inactive && id !== PLATFORM ? " is-disabled" : "";
        const href = `/switch_shop.html?platform=${encodeURIComponent(id)}`;
        const soon = inactive && id !== PLATFORM ? " · Soon" : "";
        return `
          <a
            class="ss-sidebar__link${active}${disabled}"
            href="${escapeHtml(href)}"
            ${inactive && id !== PLATFORM ? 'aria-disabled="true" tabindex="-1"' : ""}
          >
            <span class="ss-sidebar__link-icon" aria-hidden="true">${sidebarPlatformIconMarkup(item)}</span>
            <span class="ss-sidebar__link-label">${escapeHtml(label)}${soon}</span>
          </a>
        `;
      })
      .filter(Boolean)
      .join("");

  }

  function bindSidebar() {
    const open = () => setSidebarOpen(true);
    const close = () => setSidebarOpen(false);

    els.menuBtn?.addEventListener("click", () => {
      const isOpen = els.sidebar?.classList.contains("is-open");
      setSidebarOpen(!isOpen);
    });
    els.sidebarClose?.addEventListener("click", close);
    els.sidebarBackdrop?.addEventListener("click", close);

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      if (!els.sidebar?.classList.contains("is-open")) return;
      close();
    });

    renderSidebarPlatforms();
  }

  function bindEvents() {
    els.searchForm?.addEventListener("submit", (event) => {
      event.preventDefault();
      state.query = String(els.search?.value || "").trim();
      syncSearchClear();
      renderProducts();
      syncUrl();
    });

    els.search?.addEventListener("input", () => {
      state.query = String(els.search.value || "");
      syncSearchClear();
      renderProducts();
      syncUrl();
    });

    els.searchClear?.addEventListener("click", () => {
      if (els.search) els.search.value = "";
      state.query = "";
      syncSearchClear();
      renderProducts();
      syncUrl();
      els.search?.focus();
    });

    if (window.SearchSuggestions?.attach) {
      state.suggestions = window.SearchSuggestions.attach({
        form: els.searchForm,
        input: els.search,
        getContext: () => ({
          platformId: PLATFORM,
          category:
            state.categoryFilter && state.categoryFilter !== "all"
              ? state.categoryFilter
              : "",
          storeType:
            state.selectedTypeName && state.selectedTypeName !== "all"
              ? state.selectedTypeName
              : "",
        }),
        onSubmit: (term) => {
          state.query = String(term || "").trim();
          if (els.search) els.search.value = state.query;
          syncSearchClear();
          renderProducts();
          syncUrl();
        },
      });
    }

    els.typeChips?.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-ss-type]");
      if (!btn) return;
      state.selectedTypeName = btn.getAttribute("data-ss-type") || "all";
      state.categoryFilter = "all";
      refreshCatalogUi();
    });

    els.categoryChips?.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-ss-category]");
      if (!btn) return;
      state.categoryFilter = btn.getAttribute("data-ss-category") || "all";
      renderCategoryChips();
      renderProducts();
      syncUrl();
    });

    els.stateRetry?.addEventListener("click", () => {
      void loadCatalog();
    });

    document.addEventListener("click", (event) => {
      const productBtn = event.target.closest("[data-ss-product]");
      if (productBtn) openProduct(productBtn.getAttribute("data-ss-product"));
    });
  }

  async function loadActivityRail() {
    const list = els.activityList;
    if (!list) return;
    const platformLabel =
      document.getElementById("ss-brand-platform-label")?.textContent?.trim() ||
      "Shop";
    if (els.activityPlatformLabel) {
      els.activityPlatformLabel.textContent = platformLabel;
    }

    const session =
      window.GMSBuyerAuth?.getSession?.() ||
      window.SwitchBuyerAuth?.getSession?.() ||
      null;
    const accountId = String(
      session?.accountId || session?.id || session?.userId || "",
    ).trim();
    if (!accountId) {
      list.innerHTML =
        `<p class="ss-activity-rail__empty">Sign in to see orders and history for ${escapeHtml(platformLabel)}.</p>`;
      return;
    }

    try {
      const data = await fetchJson(`/api/orders?accountId=${encodeURIComponent(accountId)}`);
      const orders = Array.isArray(data?.orders)
        ? data.orders
        : Array.isArray(data)
          ? data
          : [];
      renderActivityRail(orders, platformLabel);
    } catch (_) {
      list.innerHTML =
        `<p class="ss-activity-rail__empty">No recent activity in ${escapeHtml(platformLabel)} yet.</p>`;
    }
  }

  function stageLabel(stage) {
    const key = String(stage || "").trim().toLowerCase();
    if (key.includes("pay")) return "To Pay";
    if (key.includes("prepare")) return "To Prepare";
    if (key.includes("ship")) return "To Ship";
    if (key.includes("receive")) return "To Receive";
    if (key.includes("review")) return "To Review";
    if (key.includes("return")) return "Return";
    if (key.includes("cancel")) return "Cancelled";
    return stage || "Order";
  }

  function renderActivityRail(orders, platformLabel) {
    const list = els.activityList;
    if (!list) return;
    const grouped = new Map();
    for (const order of orders) {
      const id = String(order?.id || order?.orderId || "").trim() ||
        `${order?.createdAtEpochMs || ""}-${order?.productId || ""}`;
      if (!grouped.has(id)) grouped.set(id, []);
      grouped.get(id).push(order);
    }

    const items = [];
    for (const entries of grouped.values()) {
      entries.sort(
        (a, b) => Number(b?.createdAtEpochMs || 0) - Number(a?.createdAtEpochMs || 0),
      );
      const first = entries[0];
      const total = entries.reduce(
        (sum, entry) => sum + Number(entry?.unitPrice || 0) * Number(entry?.quantity || 1),
        0,
      );
      const amount = Number(first?.grandTotalAmount || total || 0);
      const stage = first?.stage || first?.status || "";
      items.push({
        title: String(first?.productName || "Order").trim() || "Order",
        stage: stageLabel(stage),
        history: String(stage).toLowerCase().includes("cancel"),
        imageUrl: String(first?.productImageUrl || "").trim(),
        amount: `₱${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
        qty: entries.reduce((sum, entry) => sum + Number(entry?.quantity || 1), 0),
      });
    }

    if (!items.length) {
      list.innerHTML =
        `<p class="ss-activity-rail__empty">No recent activity in ${escapeHtml(platformLabel)} yet. Orders and history will appear here.</p>`;
      return;
    }

    const active = items.filter((item) => !item.history);
    const history = items.filter((item) => item.history);
    const row = (item) => `
      <article class="ss-activity-rail__item">
        <span class="ss-activity-rail__thumb">${
          item.imageUrl
            ? `<img src="${escapeHtml(item.imageUrl)}" alt="" loading="lazy" />`
            : ""
        }</span>
        <span class="ss-activity-rail__copy">
          <strong>${escapeHtml(item.title)}</strong>
          <span>${escapeHtml(item.stage)} · ${item.qty} item${item.qty === 1 ? "" : "s"}</span>
        </span>
        <span class="ss-activity-rail__amount">${escapeHtml(item.amount)}</span>
      </article>`;

    list.innerHTML = [
      active.length
        ? `<div class="ss-activity-rail__section">In progress (${active.length})</div>${active.map(row).join("")}`
        : "",
      history.length
        ? `<div class="ss-activity-rail__section">History (${history.length})</div>${history.map(row).join("")}`
        : "",
    ].join("");
  }

  function bindDeliveryLocation() {
    const fab = document.getElementById("ss-deliver-fab");
    const fabTitle = document.getElementById("ss-deliver-fab-title");
    const fabLocation = document.getElementById("ss-deliver-fab-location");
    const dialog = document.getElementById("ss-deliver-dialog");
    const dialogTitle = document.getElementById("ss-deliver-dialog-title");
    const dialogSubtitle = document.getElementById("ss-deliver-dialog-subtitle");
    const list = document.getElementById("ss-deliver-dialog-list");
    const auth = window.SwitchBuyerAuth;
    if (!(fab instanceof HTMLElement) || !(dialog instanceof HTMLDialogElement) || !auth) {
      return;
    }

    const isShop = PLATFORM === "shop";
    const copy = {
      title: isShop ? "What is your address?" : "Where to deliver?",
      emptySubtitle: "Set your delivery address",
      filledSubtitle: isShop
        ? "Choose the address for this order."
        : "Choose where you want your order delivered.",
    };

    fab.hidden = false;
    fab.setAttribute("aria-label", copy.title);
    if (fabTitle) fabTitle.textContent = copy.title;
    if (dialogTitle) dialogTitle.textContent = copy.title;

    const currentId = auth.CURRENT_LOCATION_ADDRESS_ID || "current-location";
    const fallbackAddressHref = "/switch_account.html?tab=address";
    const artSrc = "/assets/delivery-address-empty-art.png";
    let pendingId = "";

    const syncPendingFromBook = (book = readBook()) => {
      if (book.useCurrentLocation || book.selectedId === currentId) {
        pendingId = currentId;
        return;
      }
      pendingId = String(book.selectedId || "").trim();
    };

    const readBook = () => {
      const session = auth.readBuyerSession?.() || {};
      return auth.readSavedAccountAddressBook?.(session) || {
        selectedId: "",
        useCurrentLocation: false,
        entries: [],
      };
    };

    const writeBook = (book) => {
      const session = auth.readBuyerSession?.() || {};
      auth.writeSavedAccountAddressBook?.(session, book);
      refreshFab();
    };

    const addressFirstLine = (entry = {}) => {
      const parts = [];
      if (String(entry.unit || "").trim()) parts.push(String(entry.unit).trim());
      if (String(entry.street || "").trim()) parts.push(String(entry.street).trim());
      if (parts.length) return parts.join(", ");
      if (String(entry.search || "").trim()) return String(entry.search).trim();
      return "Saved address";
    };

    const addressSecondLine = (entry = {}) =>
      [entry.city, entry.province, entry.postal]
        .map((part) => String(part || "").trim())
        .filter(Boolean)
        .join(", ");

    const addressFullLine = (entry = {}) => {
      const search = String(entry.search || "").trim();
      const summary = auth.addressSummaryLine?.(entry) || "";
      if (!search) return summary || "Saved address";
      if (!summary || summary === "Saved address") return search;
      if (entry.id === currentId || entry.label === "Current") return search;
      if (search.length > summary.length) return search;
      return summary;
    };

    const selectedSummary = (book) => {
      if (book.useCurrentLocation || book.selectedId === currentId) {
        const current = (book.entries || []).find((entry) => entry.id === currentId);
        if (current) return addressFullLine(current);
      }
      const selected = (book.entries || []).find((entry) => entry.id === book.selectedId);
      if (selected) return addressFullLine(selected);
      return "Set your delivery address";
    };

    const refreshFab = () => {
      if (fabLocation) fabLocation.textContent = selectedSummary(readBook());
    };

    const labelKey = (label) => String(label || "").trim().toLowerCase();

    const displayLabel = (label) => {
      const key = labelKey(label);
      if (key === "current" || key === "current location") return "Current Location";
      return "Saved location";
    };

    const labelIconSvg = (label) => {
      const key = labelKey(label);
      if (key === "current") {
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="8"/></svg>';
      }
      return '<span class="material-symbols-rounded" aria-hidden="true">distance</span>';
    };

    const mapArtHtml = (mode = "empty") => `
      <div class="ss-deliver-dialog__art ss-deliver-dialog__art--${mode}" data-ss-deliver-art>
        <img
          src="${artSrc}"
          alt=""
          aria-hidden="true"
          onerror="this.parentElement.classList.add('is-fallback')"
        />
        <span class="ss-deliver-dialog__art-fallback" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
            <line x1="9" x2="9" y1="3" y2="18"/>
            <line x1="15" x2="15" y1="6" y2="21"/>
          </svg>
        </span>
      </div>`;

    const choiceHtml = ({
      selected,
      attrs,
      label,
      title,
      lines,
      actions = "",
    }) => {
      const line0 = escapeHtml(lines[0] || "");
      const line1 = lines[1] ? escapeHtml(lines[1]) : "";
      const hasSecond = Boolean(line1);
      const currentBadge =
        '<span class="ss-deliver-dialog__current-badge" aria-hidden="' +
        (selected ? "false" : "true") +
        '"' +
        (selected ? "" : ' style="visibility:hidden"') +
        ">Current</span>";
      return `
        <div class="ss-deliver-dialog__choice${selected ? " is-selected" : ""}" ${attrs} role="button" tabindex="0">
          <span class="ss-deliver-dialog__choice-icon" data-label="${escapeHtml(labelKey(label) === "current" ? "current" : "saved-location")}" aria-hidden="true">${labelIconSvg(label)}</span>
          <span class="ss-deliver-dialog__choice-copy">
            <span class="ss-deliver-dialog__choice-title">
              <strong>${escapeHtml(displayLabel(label))}</strong>
              ${actions}
            </span>
            <span class="ss-deliver-dialog__choice-line">
              <span>${line0}</span>
              ${!hasSecond ? currentBadge : ""}
            </span>
            ${
              hasSecond
                ? `<span class="ss-deliver-dialog__choice-line"><span>${line1}</span>${currentBadge}</span>`
                : ""
            }
          </span>
        </div>`;
    };

    const addressMatchKey = (entry = {}) =>
      addressFullLine(entry).trim().toLowerCase().replace(/\s+/g, " ");

    const sameCoordinates = (a = {}, b = {}) => {
      const aLat = Number(a.lat);
      const aLng = Number(a.lng);
      const bLat = Number(b.lat);
      const bLng = Number(b.lng);
      if (![aLat, aLng, bLat, bLng].every(Number.isFinite)) return false;
      return Math.abs(aLat - bLat) < 0.00015 && Math.abs(aLng - bLng) < 0.00015;
    };

    const isCurrentAlreadySaved = (book, current) => {
      if (!current) return false;
      const key = addressMatchKey(current);
      if (!key || key === "saved address" || key === "use your device location") {
        return false;
      }
      return (book.entries || []).some((entry) => {
        if (!entry || entry.id === currentId) return false;
        return addressMatchKey(entry) === key || sameCoordinates(current, entry);
      });
    };

    const saveLocationActionHtml = () => `
      <button type="button" class="ss-deliver-dialog__action" data-ss-deliver-save-current aria-label="Save location" title="Save location">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/></svg>
      </button>`;

    const savedActionsHtml = (entryId) => `
      <span class="ss-deliver-dialog__actions">
        <button type="button" class="ss-deliver-dialog__action" data-ss-deliver-edit="${escapeHtml(entryId)}" aria-label="Edit" title="Edit">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg>
        </button>
        <button type="button" class="ss-deliver-dialog__action ss-deliver-dialog__action--delete" data-ss-deliver-delete="${escapeHtml(entryId)}" aria-label="Delete" title="Delete">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </span>`;

    const pinCurrentLocation = (button, { closeOnSuccess = false, select = false, skipRender = false } = {}) => {
      if (!navigator.geolocation) return Promise.resolve(null);
      if (button instanceof HTMLElement) button.setAttribute("aria-busy", "true");
      const trailing = button?.querySelector(".ss-deliver-dialog__radio, .ss-deliver-dialog__spinner");
      if (trailing) {
        trailing.outerHTML = '<span class="ss-deliver-dialog__spinner" aria-hidden="true"></span>';
      }
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              const lat = position.coords.latitude;
              const lng = position.coords.longitude;
              const response = await fetch(
                `/api/maps/geocode/reverse?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`,
              );
              const data = await response.json().catch(() => ({}));
              if (!response.ok || !data.place) {
                resolve(null);
                return;
              }
              const place = data.place;
              const entry = auth.normalizeAddressEntry?.({
                id: currentId,
                search: place.description || place.label || "",
                street: place.street || place.label || "",
                city: place.city || "",
                province: place.province || "",
                postal: place.postal || "",
                label: "Current",
                lat: place.lat ?? lat,
                lng: place.lng ?? lng,
              }) || {
                id: currentId,
                search: place.description || place.label || "",
                street: place.street || place.label || "",
                city: place.city || "",
                province: place.province || "",
                postal: place.postal || "",
                label: "Current",
                lat: place.lat ?? lat,
                lng: place.lng ?? lng,
              };
              const next = readBook();
              const index = next.entries.findIndex((item) => item.id === currentId);
              if (index >= 0) next.entries[index] = entry;
              else next.entries.unshift(entry);
              if (select) {
                next.selectedId = entry.id;
                next.useCurrentLocation = true;
              }
              writeBook(next);
              pendingId = select ? currentId : pendingId;
              if (closeOnSuccess) dialog.close();
              resolve(entry);
            } catch (_) {
              resolve(null);
            } finally {
              if (button instanceof HTMLElement) button.removeAttribute("aria-busy");
              if (!skipRender) renderList();
            }
          },
          () => {
            if (button instanceof HTMLElement) button.removeAttribute("aria-busy");
            if (!skipRender) renderList();
            resolve(null);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
        );
      });
    };

    const isApplied = (book, entryId) => {
      if (entryId === currentId) {
        return book.useCurrentLocation || book.selectedId === currentId;
      }
      return !book.useCurrentLocation && book.selectedId === entryId;
    };

    const applyAndClose = async (entryId) => {
      const book = readBook();
      if (isApplied(book, entryId)) {
        dialog.close();
        return;
      }
      if (entryId === currentId) {
        let current = (book.entries || []).find((entry) => entry.id === currentId);
        if (!current) {
          current = await pinCurrentLocation(null, { select: true, skipRender: true });
          if (!current) return;
        } else {
          book.selectedId = currentId;
          book.useCurrentLocation = true;
          writeBook(book);
        }
      } else {
        const entry = (book.entries || []).find((item) => item.id === entryId);
        if (!entry) return;
        book.selectedId = entry.id;
        book.useCurrentLocation = false;
        writeBook(book);
      }
      pendingId = entryId;
      dialog.close();
    };

    const restorePickerCopy = () => {
      dialog.classList.remove("is-address-editor");
      if (dialogTitle) dialogTitle.textContent = copy.title;
      if (dialogSubtitle) dialogSubtitle.textContent = copy.emptySubtitle;
    };

    const showAddressEditor = (entryId = "") => {
      const normalizedId = String(entryId || "").trim();
      const session = auth.readBuyerSession?.() || {};
      const openMapEditor = window.SwitchSelectAddress?.openSelectAddressPage;
      if (typeof openMapEditor !== "function") {
        const suffix = normalizedId ? `&edit=${encodeURIComponent(normalizedId)}` : "";
        window.location.href = `${fallbackAddressHref}${suffix}`;
        return;
      }

      void openMapEditor({
        session,
        initialEditId: normalizedId,
        onSaved: () => {
          restorePickerCopy();
          refreshFab();
          renderList();
        },
        onClose: () => {
          restorePickerCopy();
        },
      });
    };

    const renderList = () => {
      if (!(list instanceof HTMLElement)) return;
      const book = readBook();
      if (!pendingId) syncPendingFromBook(book);
      const current = (book.entries || []).find((entry) => entry.id === currentId);
      const regular = (book.entries || []).filter((entry) => entry.id !== currentId);
      const currentApplied = isApplied(book, currentId);

      if (dialogSubtitle) {
        const selected = selectedSummary(book);
        dialogSubtitle.textContent =
          selected === "Set your delivery address"
            ? regular.length
              ? copy.filledSubtitle
              : copy.emptySubtitle
            : selected;
      }

      if (!regular.length) {
        const hasPinnedCurrent = !!(current && addressFullLine(current));
        list.innerHTML = `
          <div class="ss-deliver-dialog__empty">
            <div class="ss-deliver-dialog__empty-top">
              ${mapArtHtml("empty")}
              <button type="button" class="ss-deliver-dialog__ghost" data-ss-deliver-current data-ss-deliver-use-current>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="8"/></svg>
                <span data-ss-deliver-current-label>Use current location</span>
              </button>
              <p class="ss-deliver-dialog__finding" data-ss-deliver-finding hidden>Finding your location...</p>
              <div class="ss-deliver-dialog__progress" data-ss-deliver-progress hidden><span></span></div>
              <p class="ss-deliver-dialog__empty-title">No saved address yet</p>
              <p class="ss-deliver-dialog__empty-copy">Add a delivery address so you can quickly choose where your order should arrive.</p>
              ${
                hasPinnedCurrent
                  ? choiceHtml({
                      selected: currentApplied,
                      attrs: 'data-ss-deliver-current-card data-ss-deliver-select="' + currentId + '"',
                      label: "Current",
                      title: "Current Location",
                      lines: [addressFullLine(current)],
                      actions: saveLocationActionHtml(),
                    })
                  : ""
              }
            </div>
            <button type="button" class="ss-deliver-dialog__primary" data-ss-deliver-add>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><path d="M12 7v6"/><path d="M9 10h6"/></svg>
              Add Address
            </button>
          </div>`;
      } else {
        list.innerHTML = `
          ${mapArtHtml("filled")}
          <button type="button" class="ss-deliver-dialog__ghost ss-deliver-dialog__ghost--under-art" data-ss-deliver-current data-ss-deliver-use-current>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="8"/></svg>
            <span data-ss-deliver-current-label>Use current location</span>
          </button>
          <p class="ss-deliver-dialog__finding" data-ss-deliver-finding hidden>Finding your location...</p>
          <div class="ss-deliver-dialog__progress" data-ss-deliver-progress hidden><span></span></div>
          <div class="ss-deliver-dialog__list">
            ${regular
              .map((entry) =>
                choiceHtml({
                  selected: isApplied(book, entry.id),
                  attrs: `data-ss-deliver-select="${escapeHtml(entry.id)}"`,
                  label: "Saved location",
                  title: "Saved location",
                  lines: [addressFullLine(entry)],
                  actions: savedActionsHtml(entry.id),
                }),
              )
              .join("")}
            ${choiceHtml({
              selected: currentApplied,
              attrs: "data-ss-deliver-current",
              label: "Current",
              title: "Current Location",
              lines: [
                current
                  ? addressFullLine(current)
                  : "Use your device location",
                "",
              ].filter(Boolean),
              actions: saveLocationActionHtml(),
            })}
          </div>
          <button type="button" class="ss-deliver-dialog__primary" data-ss-deliver-add>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><path d="M12 7v6"/><path d="M9 10h6"/></svg>
            Add another address
          </button>`;
      }

      list.querySelectorAll("[data-ss-deliver-add]").forEach((button) => {
        button.addEventListener("click", (event) => {
          event.preventDefault();
          showAddressEditor();
        });
      });

      list.querySelectorAll("[data-ss-deliver-edit]").forEach((button) => {
        button.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          showAddressEditor(button.getAttribute("data-ss-deliver-edit") || "");
        });
      });

      const setProgress = (active) => {
        list.querySelectorAll("[data-ss-deliver-progress]").forEach((node) => {
          node.hidden = !active;
        });
        list.querySelectorAll("[data-ss-deliver-finding]").forEach((node) => {
          node.hidden = !active;
        });
        const useBtn = list.querySelector("[data-ss-deliver-use-current]");
        if (useBtn) useBtn.disabled = !!active;
      };

      list.querySelectorAll("[data-ss-deliver-use-current]").forEach((node) => {
        node.addEventListener("click", (event) => {
          event.preventDefault();
          setProgress(true);
          void pinCurrentLocation(node, { select: true, skipRender: true }).then((entry) => {
            if (entry) pendingId = currentId;
            setProgress(false);
            renderList();
          });
        });
      });

      list.querySelectorAll("[data-ss-deliver-current]").forEach((node) => {
        if (node.hasAttribute("data-ss-deliver-use-current")) return;
        if (node.hasAttribute("data-ss-deliver-current-card")) return;
        node.addEventListener("click", (event) => {
          if (
            event.target.closest(
              "[data-ss-deliver-save-current], [data-ss-deliver-set]",
            )
          ) {
            return;
          }
          event.preventDefault();
          void applyAndClose(currentId);
        });
      });

      list.querySelectorAll("[data-ss-deliver-select]").forEach((node) => {
        node.addEventListener("click", (event) => {
          if (
            event.target.closest(
              "[data-ss-deliver-edit], [data-ss-deliver-delete], [data-ss-deliver-save-current]",
            )
          ) {
            return;
          }
          const id = node.getAttribute("data-ss-deliver-select");
          if (!id) return;
          void applyAndClose(id);
        });
      });

      list.querySelectorAll("[data-ss-deliver-delete]").forEach((button) => {
        button.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          const id = button.getAttribute("data-ss-deliver-delete");
          if (!id || !window.confirm("Delete this saved address?")) return;
          const next = readBook();
          next.entries = (next.entries || []).filter((entry) => entry.id !== id);
          if (next.selectedId === id) {
            next.selectedId = next.entries[0]?.id || "";
            next.useCurrentLocation = next.selectedId === currentId;
          }
          if (pendingId === id) {
            pendingId = next.useCurrentLocation
              ? currentId
              : String(next.selectedId || "").trim();
          }
          writeBook(next);
          renderList();
        });
      });

      list.querySelectorAll("[data-ss-deliver-save-current]").forEach((button) => {
        button.addEventListener("click", async (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (button.disabled) return;
          button.disabled = true;
          let keepDisabled = false;
          try {
            let book = readBook();
            let current = (book.entries || []).find((entry) => entry.id === currentId);
            if (!current) {
              const row = button.closest("[data-ss-deliver-current]");
              current = await pinCurrentLocation(row, { select: false });
              book = readBook();
              current =
                current ||
                (book.entries || []).find((entry) => entry.id === currentId);
            }
            if (!current) return;
            if (isCurrentAlreadySaved(book, current)) {
              window.alert("Location is already saved");
              return;
            }
            const saved =
              auth.normalizeAddressEntry?.({
                id: `addr_${Date.now()}`,
                search: current.search || "",
                unit: current.unit || "",
                street: current.street || "",
                city: current.city || "",
                province: current.province || "",
                postal: current.postal || "",
                label: "Saved location",
                lat: current.lat,
                lng: current.lng,
              }) || {
                id: `addr_${Date.now()}`,
                search: current.search || "",
                unit: current.unit || "",
                street: current.street || "",
                city: current.city || "",
                province: current.province || "",
                postal: current.postal || "",
                label: "Saved location",
                lat: current.lat,
                lng: current.lng,
              };
            book.entries = [...(book.entries || []), saved];
            book.selectedId = saved.id;
            book.useCurrentLocation = false;
            pendingId = saved.id;
            writeBook(book);
            renderList();
            keepDisabled = true;
          } finally {
            if (!keepDisabled && button.isConnected) button.disabled = false;
          }
        });
      });
    };

    fab.addEventListener("click", () => {
      const openDialog = () => {
        restorePickerCopy();
        syncPendingFromBook();
        renderList();
        if (typeof dialog.showModal === "function") dialog.showModal();
      };
      if (typeof auth.syncSavedAccountAddressBook === "function") {
        void auth.syncSavedAccountAddressBook(auth.readBuyerSession?.() || {}).then(() => {
          openDialog();
        }).catch(() => openDialog());
        return;
      }
      openDialog();
    });

    dialog.addEventListener("close", restorePickerCopy);

    refreshFab();
    window.addEventListener("gms-buyer-session-updated", () => {
      void auth.syncSavedAccountAddressBook?.(auth.readBuyerSession?.() || {}).finally(() => {
        refreshFab();
      });
    });
    window.addEventListener("gms-buyer-address-updated", refreshFab);
    window.addEventListener("storage", (event) => {
      if (String(event.key || "").startsWith("gms-buyer-address:")) refreshFab();
    });
  }

  bindEvents();
  bindHeaderScroll();
  bindHeaderSearchDock();
  bindSidebar();
  bindDeliveryLocation();
  void loadCatalog();
  void loadActivityRail();
})();
