(() => {
  const els = {
    form: document.getElementById("md-platform-search"),
    input: document.getElementById("md-platform-search-input"),
    clear: document.getElementById("md-platform-search-clear"),
    grid: document.getElementById("md-platform-grid"),
    liveResults: document.getElementById("md-platform-live-results"),
  };

  const state = {
    platforms: [],
    storeTypes: [],
    sellers: [],
    products: [],
    placeholderAnim: {
      timer: 0,
      phraseIndex: 0,
      charIndex: 0,
      mode: "typing", // typing | holding | deleting
      phrases: [],
      running: false,
    },
    suggestions: null,
  };

  const DEFAULT_PLATFORMS = [
    { id: "shop", name: "Shop", status: "active", comingSoon: false, sortOrder: 1, iconName: "store", iconImageUrl: "/assets/platform-shop-art.png" },
    { id: "food", name: "Food", status: "active", comingSoon: false, sortOrder: 2, iconName: "utensils", iconImageUrl: "/assets/platform-food-art.png" },
    { id: "hotels", name: "Hotels", status: "active", comingSoon: false, sortOrder: 3, iconName: "hotel" },
    { id: "resort", name: "Resort", status: "active", comingSoon: false, sortOrder: 4, iconName: "tree-palm" },
  ];
  const DEFAULT_PLATFORM_ART_URLS = Object.freeze({
    shop: "/assets/platform-shop-art.png",
    food: "/assets/platform-food-art.png",
  });

  const PLATFORM_NAME_I18N_KEYS = {
    shop: "platform.name.shop",
    food: "platform.name.food",
    hotel: "platform.name.hotels",
    hotels: "platform.name.hotels",
    resort: "platform.name.resort",
  };

  const PLATFORM_ICON_SVGS = {
    store: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 21v-5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5"/><path d="M17.774 10.31a1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.451 0 1.12 1.12 0 0 0-1.548 0 2.5 2.5 0 0 1-3.452 0 1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.77-3.248l2.889-4.184A2 2 0 0 1 7 2h10a2 2 0 0 1 1.653.873l2.895 4.192a2.5 2.5 0 0 1-3.774 3.244"/><path d="M4 10.95V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8.05"/></svg>`,
    utensils: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>`,
    hotel: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 22v-6.57"/><path d="M12 11h.01"/><path d="M12 7h.01"/><path d="M14 15.43V22"/><path d="M15 16a5 5 0 0 0-6 0"/><path d="M16 11h.01"/><path d="M16 7h.01"/><path d="M8 11h.01"/><path d="M8 7h.01"/><rect x="4" y="2" width="16" height="20" rx="2"/></svg>`,
    "tree-palm": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 8c0-2.76-2.46-5-5.5-5S2 5.24 2 8h2l1-1 1 1h4"/><path d="M13 7.14A7.76 7.76 0 0 1 15.5 6c3.04 0 5.5 2.24 5.5 5h-3l-1-1-1 1h-3"/><path d="M5.89 9.71c-2.15 2.15-2.3 5.47-.35 7.43l4.24-4.25.7-.7.71-.71 2.12-2.12c-1.95-1.96-5.27-1.8-7.42.35"/><path d="M11 15.5c.5 2.5-.17 4.5-1 6.5h4c2-2 2-4 2-6"/></svg>`,
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
      .normalize("NFKD")
      .replace(/\p{M}+/gu, "")
      .replace(/&/g, " and ")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim();
  }

  function normalizePlatformId(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
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

  function platformHref(platformId) {
    const id = normalizePlatformId(platformId) || "shop";
    return `/switch_shop.html?platform=${encodeURIComponent(id)}`;
  }

  function syncClearButton() {
    if (!(els.clear instanceof HTMLElement) || !(els.input instanceof HTMLInputElement)) {
      return;
    }
    els.clear.hidden = !els.input.value.trim();
  }

  function resetSearchInput() {
    if (els.input instanceof HTMLInputElement) {
      els.input.value = "";
      els.input.blur();
    }
    state.suggestions?.close?.();
    hideLiveResults();
    syncClearButton();
    startPlaceholderAnimation();
  }

  function editDistance(left, right) {
    if (left === right) return 0;
    if (!left) return right.length;
    if (!right) return left.length;
    const prev = Array.from({ length: right.length + 1 }, (_, index) => index);
    const curr = Array(right.length + 1).fill(0);
    for (let i = 1; i <= left.length; i += 1) {
      curr[0] = i;
      const leftChar = left.charCodeAt(i - 1);
      for (let j = 1; j <= right.length; j += 1) {
        const cost = leftChar === right.charCodeAt(j - 1) ? 0 : 1;
        curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      }
      for (let j = 0; j <= right.length; j += 1) prev[j] = curr[j];
    }
    return prev[right.length];
  }

  function maxEditsForQuery(query) {
    const length = query.length;
    if (length <= 2) return 0;
    if (length <= 4) return 1;
    if (length <= 8) return 2;
    return 3;
  }

  function matchScore(haystack, normalizedQuery) {
    const key = normalizeKey(haystack);
    const query = normalizeKey(normalizedQuery);
    if (!key || !query) return -1;
    if (key === query) return 300;
    if (key.startsWith(query)) return 200;
    if (key.includes(query)) return 100;

    const compactKey = key.replace(/\s+/g, "");
    const compactQuery = query.replace(/\s+/g, "");
    if (compactKey.includes(compactQuery)) return 95;
    if (compactKey.startsWith(compactQuery)) return 90;

    const keyTokens = key.split(" ").filter(Boolean);
    const queryTokens = query.split(" ").filter(Boolean);

    if (
      queryTokens.length &&
      queryTokens.every((queryToken) =>
        keyTokens.some(
          (keyToken) =>
            keyToken === queryToken ||
            keyToken.startsWith(queryToken) ||
            keyToken.includes(queryToken) ||
            queryToken.includes(keyToken),
        ),
      )
    ) {
      return 85;
    }

    if (
      queryTokens.some((queryToken) =>
        keyTokens.some(
          (keyToken) => keyToken.startsWith(queryToken) || queryToken.startsWith(keyToken),
        ),
      )
    ) {
      return 75;
    }

    const maxEdits = maxEditsForQuery(compactQuery);
    if (maxEdits > 0) {
      if (editDistance(compactKey, compactQuery) <= maxEdits) return 65;
      for (const token of keyTokens) {
        if (Math.abs(token.length - compactQuery.length) > maxEdits) continue;
        if (editDistance(token, compactQuery) <= maxEdits) return 60;
      }
      if (compactQuery.length >= 3 && compactKey.length >= compactQuery.length) {
        const prefix = compactKey.slice(0, compactQuery.length);
        if (editDistance(prefix, compactQuery) <= 1) return 50;
      }
      for (const token of keyTokens) {
        if (token.length < compactQuery.length) continue;
        for (let start = 0; start <= token.length - compactQuery.length; start += 1) {
          const slice = token.slice(start, start + compactQuery.length);
          if (editDistance(slice, compactQuery) <= 1) return 45;
        }
      }
    }

    return -1;
  }

  function platformLabel(platformId) {
    const wanted = normalizePlatformId(platformId);
    const platforms = state.platforms.length ? state.platforms : DEFAULT_PLATFORMS;
    const match = platforms.find((platform) => normalizePlatformId(platform.id) === wanted);
    if (!match) return wanted ? wanted[0].toUpperCase() + wanted.slice(1) : "";
    return translatedPlatformName(match.name).name || String(match.name || wanted);
  }

  function disabledReasonForPlatform(platformId) {
    const wanted = normalizePlatformId(platformId);
    const platforms = state.platforms.length ? state.platforms : DEFAULT_PLATFORMS;
    const platform = platforms.find((item) => normalizePlatformId(item.id) === wanted);
    if (!platform) return "";
    if (isPlatformInactive(platform)) {
      return t("platform.unavailableMsg", { name: platform.name || "This platform" });
    }
    if (isPlatformComingSoon(platform)) {
      return t("platform.comingSoon", { name: platform.name || "This platform" });
    }
    return "";
  }

  function storeTypeCategories(storeType) {
    const names = [];
    const seen = new Set();
    const push = (value) => {
      const name = String(value || "").trim();
      const key = name.toLowerCase();
      if (!name || seen.has(key)) return;
      seen.add(key);
      names.push(name);
    };
    if (Array.isArray(storeType?.categories)) {
      for (const entry of storeType.categories) push(entry);
    }
    if (Array.isArray(storeType?.categoryDetails)) {
      for (const entry of storeType.categoryDetails) {
        if (entry && typeof entry === "object") {
          const status = String(entry.status || "active").toLowerCase();
          if (status === "inactive") continue;
          push(entry.name || entry.category);
        } else {
          push(entry);
        }
      }
    }
    return names;
  }

  function findLinkedStoreType(seller) {
    const key = normalizeKey(seller?.storeType);
    if (!key) return null;
    return state.storeTypes.find((storeType) => normalizeKey(storeType.name) === key) || null;
  }

  function isProductActiveListing(product) {
    const status = String(product?.approvalStatus || product?.status || "approved")
      .trim()
      .toLowerCase();
    if (status && status !== "approved" && status !== "active") return false;
    if (product?.isActive === false || product?.isActive === "false") return false;
    const stock = Number(product?.availableStock ?? product?.stock ?? product?.quantity ?? 1);
    if (Number.isFinite(stock) && stock <= 0) return false;
    return true;
  }

  function sellerDisplayName(seller) {
    const company = String(seller?.companyName || seller?.storeName || seller?.businessName || "").trim();
    if (company) return company;
    const name = String(seller?.name || seller?.displayName || "").trim();
    if (name) return name;
    const adminId = String(seller?.adminId || seller?.id || "").trim();
    return adminId || "Company";
  }

  function sellerDisplayImageUrl(seller) {
    return String(
      seller?.companyPictureUrl ||
        seller?.companyProfileImageUrl ||
        seller?.logoUrl ||
        seller?.profileImageUrl ||
        seller?.avatarUrl ||
        seller?.photoUrl ||
        "",
    ).trim();
  }

  function sellerAdminId(seller) {
    return String(seller?.adminId || seller?.id || seller?.accountCode || seller?.sellerId || "")
      .trim();
  }

  function productDisplayName(product) {
    return String(product?.name || product?.title || "Listing").trim() || "Listing";
  }

  function productCompanyName(product) {
    return String(product?.companyName || product?.storeName || product?.sellerName || "").trim();
  }

  function productPreviewUrl(product) {
    const urls = Array.isArray(product?.imageUrls) ? product.imageUrls : [];
    const first = urls.map((entry) => String(entry || "").trim()).find(Boolean) || "";
    return String(
      product?.cardImageUrl || product?.imageUrl || product?.thumbnailUrl || first || "",
    ).trim();
  }

  function productIdOf(product) {
    return String(product?.id || product?.productId || "").trim();
  }

  function sellerForProduct(product) {
    const adminId = String(product?.adminId || "").trim().toLowerCase();
    if (!adminId) return null;
    return (
      state.sellers.find(
        (seller) => sellerAdminId(seller).toLowerCase() === adminId,
      ) || null
    );
  }

  function companyHref({ platformId, typeName, adminId, title }) {
    const platform = normalizePlatformId(platformId) || "shop";
    const params = new URLSearchParams();
    params.set("platform", platform);
    if (typeName) params.set("type", typeName);
    if (adminId) params.set("adminId", adminId);
    if (title) params.set("q", title);
    return `/switch_shop.html?${params.toString()}`;
  }

  function listingHref({ platformId, typeName, productId, title }) {
    const platform = normalizePlatformId(platformId) || "shop";
    const params = new URLSearchParams();
    params.set("platform", platform);
    if (typeName) params.set("type", typeName);
    if (productId) params.set("productId", productId);
    else if (title) params.set("q", title);
    return `/switch_shop.html?${params.toString()}`;
  }

  function buildLiveHits(rawQuery) {
    const query = String(rawQuery || "").trim();
    const normalized = normalizeKey(query);
    if (!normalized) return [];

    const limit = 12;
    const hits = [];

    const companyHits = state.sellers
      .map((seller) => {
        const title = sellerDisplayName(seller);
        const score = Math.max(
          matchScore(seller.companyName, normalized),
          matchScore(seller.name, normalized),
          matchScore(title, normalized),
        );
        if (score < 0) return null;
        const linked = findLinkedStoreType(seller);
        const platformId = linked ? storeTypePlatformId(linked) : "";
        // Coming soon / inactive platforms are not searchable.
        if (platformId && !isPlatformSearchable(platformId)) return null;
        const typeName = linked
          ? String(linked.name || "").trim()
          : String(seller.storeType || "").trim();
        const label = platformId ? platformLabel(platformId) : "";
        const path = [label, typeName].filter(Boolean).join(" · ");
        const adminId = sellerAdminId(seller);
        return {
          kind: "company",
          score,
          title,
          subtitle: path || "Company",
          detail: typeName || "View business profile",
          platformId,
          typeName,
          adminId,
          imageUrl: sellerDisplayImageUrl(seller),
          disabledReason: "",
          href: companyHref({ platformId, typeName, adminId, title }),
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    hits.push(...companyHits);

    const listingHits = state.products
      .filter(isProductActiveListing)
      .map((product) => {
        const title = productDisplayName(product);
        const company = productCompanyName(product);
        const score = Math.max(
          matchScore(title, normalized),
          matchScore(company, normalized),
        );
        if (score < 0) return null;
        const linkedSeller = sellerForProduct(product);
        const linked = linkedSeller ? findLinkedStoreType(linkedSeller) : null;
        const platformId = linked ? storeTypePlatformId(linked) : "shop";
        // Coming soon / inactive platforms are not searchable.
        if (platformId && !isPlatformSearchable(platformId)) return null;
        const typeName = linked
          ? String(linked.name || "").trim()
          : String(linkedSeller?.storeType || product?.storeType || "").trim();
        const productId = productIdOf(product);
        return {
          kind: "listing",
          score,
          title,
          subtitle: company || "Listing",
          detail: company || "View listing details",
          platformId,
          typeName,
          adminId: linkedSeller ? sellerAdminId(linkedSeller) : String(product?.adminId || "").trim(),
          productId,
          imageUrl: productPreviewUrl(product),
          disabledReason: "",
          href: listingHref({ platformId, typeName, productId, title }),
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    hits.push(...listingHits);

    return hits;
  }

  function liveIconSvg(kind) {
    if (kind === "company") {
      return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 21v-6h6v6"/></svg>';
    }
    if (kind === "listing") {
      return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>';
    }
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>';
  }

  function hideLiveResults() {
    if (els.liveResults instanceof HTMLElement) {
      els.liveResults.hidden = true;
      els.liveResults.innerHTML = "";
    }
  }

  function buildLiveResultsHtml(rawQuery) {
    const query = String(rawQuery || "").trim();
    if (!query) return "";

    const hits = buildLiveHits(query);
    const companyHits = hits.filter((hit) => hit.kind === "company");
    const listingHits = hits.filter((hit) => hit.kind === "listing");
    const resultCount = companyHits.length + listingHits.length;

    if (!resultCount) {
      return `
        <div class="md-platform-live-empty-wrap">
          <p class="md-platform-live-empty">No matches for "${escapeHtml(query)}"</p>
          <p class="md-platform-live-empty-hint">Try another keyword across companies or listings.</p>
        </div>
      `;
    }

    const sections = [
      { kind: "company", title: "Companies", rows: companyHits },
      { kind: "listing", title: "Listings", rows: listingHits },
    ];

    let html = `
      <div class="md-platform-live-meta">
        <p class="md-platform-live-meta__query">Showing results for <strong>"${escapeHtml(query)}"</strong></p>
        <span class="md-platform-live-meta__count">${resultCount} ${resultCount === 1 ? "result" : "results"}</span>
      </div>
    `;

    for (const section of sections) {
      if (!section.rows.length) continue;
      html += `<section class="md-platform-live-section">
        <span class="md-platform-live-section__title">${escapeHtml(section.title)}</span>`;
      html += section.rows
        .map((hit) => {
          const disabled = Boolean(hit.disabledReason);
          const subtitle = disabled ? hit.disabledReason : hit.subtitle;
          const kindLabel = hit.kind === "company" ? "COMPANY" : "LISTING";
          const media = hit.imageUrl
            ? `<img src="${escapeHtml(hit.imageUrl)}" alt="" loading="lazy" />`
            : `<span class="md-platform-live-row__fallback" aria-hidden="true">${liveIconSvg(hit.kind)}</span>`;
          const attrs = disabled
            ? `type="button" class="md-platform-live-row is-disabled" data-live-disabled="${escapeHtml(hit.disabledReason)}"`
            : `href="${escapeHtml(hit.href)}" class="md-platform-live-row"`;
          const tag = disabled ? "button" : "a";
          return `
            <${tag} ${attrs}>
              <span class="md-platform-live-row__thumb">${media}</span>
              <span class="md-platform-live-row__copy">
                <span class="md-platform-live-row__kind">${kindLabel}</span>
                <span class="md-platform-live-row__title">${escapeHtml(hit.title)}</span>
                <span class="md-platform-live-row__subtitle">${escapeHtml(subtitle)}</span>
                <span class="md-platform-live-row__detail">${escapeHtml(hit.detail || "")}</span>
              </span>
            </${tag}>
          `;
        })
        .join("");
      html += "</section>";
    }

    return html;
  }

  function renderLiveResults(rawQuery) {
    const query = String(rawQuery || "").trim();
    if (!query) {
      hideLiveResults();
      if (document.activeElement === els.input) {
        state.suggestions?.showSuggestions?.();
        state.suggestions?.open?.();
      }
      return;
    }

    const html = buildLiveResultsHtml(query);
    // App pattern: swap content inside the same search dropdown.
    // Keep platform cards visible underneath — results live in the dropdown.
    state.suggestions?.showLive?.(html);
    if (els.liveResults instanceof HTMLElement) {
      els.liveResults.hidden = true;
      els.liveResults.innerHTML = "";
    }
  }

  function syncLiveSearchUi() {
    const query = els.input instanceof HTMLInputElement ? els.input.value.trim() : "";
    if (query) {
      renderLiveResults(query);
    } else {
      hideLiveResults();
      if (document.activeElement === els.input) {
        state.suggestions?.showSuggestions?.();
        state.suggestions?.open?.();
      }
    }
  }

  function t(key, replacements = {}) {
    return window.SwitchBuyerAuth?.t?.(key, replacements) || key;
  }

  function shouldPausePlaceholderAnimation() {
    if (!(els.input instanceof HTMLInputElement)) return true;
    if (document.activeElement === els.input) return true;
    if (els.input.value.trim()) return true;
    return false;
  }

  function getSearchPlaceholderPrefix() {
    const prefix = t("platform.search.prefix");
    if (prefix === "platform.search.prefix") return "Search ";
    return prefix.endsWith(" ") ? prefix : `${prefix} `;
  }

  function buildPlaceholderPhrases() {
    const platforms = (state.platforms.length ? state.platforms : DEFAULT_PLATFORMS)
      .filter((item) => {
        if (isPlatformInactive(item)) return false;
        if (isPlatformComingSoon(item)) return false;
        return true;
      })
      .sort((left, right) => {
        const leftOrder = Number(left.sortOrder) || 0;
        const rightOrder = Number(right.sortOrder) || 0;
        if (leftOrder !== rightOrder) return leftOrder - rightOrder;
        return String(left.name || "").localeCompare(String(right.name || ""), undefined, {
          sensitivity: "base",
        });
      });

    const names = platforms
      .map((platform) => translatedPlatformName(platform.name).name)
      .filter(Boolean);

    const everything = t("platform.search.everythingWord");
    const fallbackEverything = everything === "platform.search.everythingWord"
      ? "everything"
      : everything;

    return [...names, fallbackEverything];
  }

  function stopPlaceholderAnimation() {
    const anim = state.placeholderAnim;
    if (anim.timer) {
      window.clearTimeout(anim.timer);
      anim.timer = 0;
    }
    anim.running = false;
    els.input?.classList.remove("is-placeholder-typing");
  }

  function schedulePlaceholderStep(delay) {
    const anim = state.placeholderAnim;
    if (anim.timer) window.clearTimeout(anim.timer);
    anim.timer = window.setTimeout(runPlaceholderStep, delay);
  }

  function paintPlaceholder(animatedText) {
    if (!(els.input instanceof HTMLInputElement)) return;
    if (shouldPausePlaceholderAnimation()) return;
    els.input.placeholder = `${getSearchPlaceholderPrefix()}${animatedText}`;
  }

  function runPlaceholderStep() {
    const anim = state.placeholderAnim;
    if (!(els.input instanceof HTMLInputElement) || !anim.running) return;

    if (shouldPausePlaceholderAnimation()) {
      els.input.classList.remove("is-placeholder-typing");
      schedulePlaceholderStep(400);
      return;
    }

    if (!anim.phrases.length) {
      anim.phrases = buildPlaceholderPhrases();
    }
    if (!anim.phrases.length) return;

    const phrase = anim.phrases[anim.phraseIndex % anim.phrases.length] || "";
    els.input.classList.add("is-placeholder-typing");

    if (anim.mode === "typing") {
      anim.charIndex = Math.min(anim.charIndex + 1, phrase.length);
      paintPlaceholder(phrase.slice(0, anim.charIndex));
      if (anim.charIndex >= phrase.length) {
        anim.mode = "holding";
        schedulePlaceholderStep(1400);
        return;
      }
      schedulePlaceholderStep(72);
      return;
    }

    if (anim.mode === "holding") {
      anim.mode = "deleting";
      schedulePlaceholderStep(40);
      return;
    }

    // deleting — keep "Search " visible; animate only Shop / Hotels / everything
    anim.charIndex = Math.max(anim.charIndex - 1, 0);
    paintPlaceholder(phrase.slice(0, anim.charIndex));
    if (anim.charIndex <= 0) {
      anim.mode = "typing";
      anim.phraseIndex = (anim.phraseIndex + 1) % anim.phrases.length;
      schedulePlaceholderStep(320);
      return;
    }
    schedulePlaceholderStep(36);
  }

  function startPlaceholderAnimation({ reset = false } = {}) {
    if (!(els.input instanceof HTMLInputElement)) return;
    const anim = state.placeholderAnim;
    stopPlaceholderAnimation();
    anim.phrases = buildPlaceholderPhrases();
    if (reset) {
      anim.phraseIndex = 0;
      anim.charIndex = 0;
      anim.mode = "typing";
    }
    anim.running = true;
    if (!shouldPausePlaceholderAnimation()) {
      els.input.placeholder = getSearchPlaceholderPrefix();
    }
    schedulePlaceholderStep(280);
  }

  function isPlatformInactive(platform) {
    return String(platform?.status || "active").toLowerCase() === "inactive";
  }

  function isPlatformComingSoon(platform) {
    if (!platform) return false;
    if (platform.comingSoon === true || platform.comingSoon === "true" || platform.comingSoon === 1) {
      return true;
    }
    const status = String(platform.status || "").trim().toLowerCase();
    return status === "coming_soon" || status === "coming-soon" || status === "soon";
  }

  function isPlatformSearchable(platformId) {
    const wanted = normalizePlatformId(platformId);
    if (!wanted) return true;
    const platforms = state.platforms.length ? state.platforms : DEFAULT_PLATFORMS;
    const platform = platforms.find((item) => normalizePlatformId(item.id) === wanted);
    if (!platform) return true;
    if (isPlatformInactive(platform)) return false;
    if (isPlatformComingSoon(platform)) return false;
    return true;
  }

  function platformAssetUrl(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    if (/^(https?:|data:|blob:)/i.test(raw) || raw.startsWith("/")) return raw;
    return `/${raw.replace(/^\/+/, "")}`;
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

  function renderPlatformCardMedia(platform) {
    const heroUrl = platformAssetUrl(platform.heroImageUrl || platform.imageUrl);
    if (!heroUrl) return "";
    return `
      <span class="md-platform-card__hero" aria-hidden="true">
        <img src="${escapeHtml(heroUrl)}" alt="" loading="lazy" decoding="async" />
      </span>
    `;
  }

  function platformCardClasses(platform, baseClass) {
    const classes = ["md-platform-card", baseClass];
    if (platformAssetUrl(platform.heroImageUrl || platform.imageUrl)) {
      classes.push("has-hero");
    }
    return classes.join(" ");
  }

  function translatedPlatformName(name) {
    const rawName = String(name || "").trim();
    const translationKey = PLATFORM_NAME_I18N_KEYS[normalizePlatformId(rawName)] || "";
    return {
      name: translationKey ? t(translationKey) : rawName,
      translationKey,
    };
  }

  function renderPlatformName(platform, name) {
    return `
      <span class="md-platform-card__title">
        <span class="md-platform-card__name-icon" aria-hidden="true">${platformIconMarkup(platform)}</span>
        <strong>${escapeHtml(name)}</strong>
      </span>
    `;
  }

  function renderPlatforms() {
    if (!(els.grid instanceof HTMLElement)) {
      return;
    }

    // Keep inactive platforms visible as "Unavailable"; only deleted platforms disappear.
    const platforms = (state.platforms.length ? state.platforms : DEFAULT_PLATFORMS)
      .slice()
      .sort((left, right) => {
        const leftOrder = Number(left.sortOrder) || 0;
        const rightOrder = Number(right.sortOrder) || 0;
        if (leftOrder !== rightOrder) return leftOrder - rightOrder;
        return String(left.name || "").localeCompare(String(right.name || ""), undefined, {
          sensitivity: "base",
        });
      });

    if (!platforms.length) {
      els.grid.innerHTML = `<div class="md-empty"><p>${escapeHtml(t("platform.empty"))}</p></div>`;
      return;
    }

    els.grid.innerHTML = platforms
      .map((platform) => {
        const id = normalizePlatformId(platform.id) || "shop";
        const name = String(platform.name || id).trim();
        const media = renderPlatformCardMedia(platform);
        const title = renderPlatformName(platform, name);
        if (isPlatformInactive(platform)) {
          return `
            <div class="${platformCardClasses(platform, "is-unavailable")}" aria-disabled="true" data-platform-id="${escapeHtml(id)}">
              ${media}
              <span class="md-platform-card__copy">
                ${title}
                <span data-i18n="platform.unavailable">${escapeHtml(t("platform.unavailable"))}</span>
              </span>
            </div>
          `;
        }
        if (isPlatformComingSoon(platform)) {
          return `
            <div class="${platformCardClasses(platform, "is-soon")}" aria-disabled="true" data-platform-id="${escapeHtml(id)}">
              ${media}
              <span class="md-platform-card__copy">
                ${title}
                <span data-i18n="platform.soon">${escapeHtml(t("platform.soon"))}</span>
              </span>
            </div>
          `;
        }
        return `
          <a class="${platformCardClasses(platform, "is-ready")}" href="${escapeHtml(platformHref(id))}" data-platform-id="${escapeHtml(id)}">
            ${media}
            <span class="md-platform-card__copy">
              ${title}
            </span>
          </a>
        `;
      })
      .join("");

    // Keep responsive column count sensible for 1–3 platforms per row.
    // On phone, let CSS own the stacked single-column layout.
    if (window.matchMedia("(max-width: 700px)").matches) {
      els.grid.style.removeProperty("grid-template-columns");
    } else {
      const count = Math.min(Math.max(platforms.length, 1), 3);
      els.grid.style.gridTemplateColumns = `repeat(${count}, minmax(0, 1fr))`;
    }
  }

  function findPlatformMatch(query) {
    const normalized = normalizeKey(query);
    const raw = String(query || "").trim().toLowerCase();
    const platforms = (state.platforms.length ? state.platforms : DEFAULT_PLATFORMS).filter(
      (platform) =>
        !isPlatformInactive(platform) &&
        !isPlatformComingSoon(platform) &&
        isPlatformSearchable(platform.id),
    );

    const exact = platforms.find((platform) => {
      const id = normalizePlatformId(platform.id);
      const name = normalizeKey(platform.name);
      const translatedName = normalizeKey(translatedPlatformName(platform.name).name);
      return id === normalized
        || name === normalized
        || translatedName === normalized
        || id === raw
        || String(platform.name || "").trim().toLowerCase() === raw;
    });
    if (exact) return exact;

    return platforms.find((platform) => {
      const id = normalizePlatformId(platform.id);
      const name = normalizeKey(platform.name);
      const translatedName = normalizeKey(translatedPlatformName(platform.name).name);
      return id.startsWith(normalized)
        || name.startsWith(normalized)
        || translatedName.startsWith(normalized)
        || id.includes(normalized)
        || name.includes(normalized)
        || translatedName.includes(normalized);
    }) || null;
  }

  function findStoreTypeMatch(query) {
    const normalized = normalizeKey(query);
    const raw = String(query || "").trim().toLowerCase();

    const exact = state.storeTypes.find((storeType) => {
      const name = normalizeKey(storeType.name);
      return name === normalized || String(storeType.name || "").trim().toLowerCase() === raw;
    });
    if (exact) return exact;

    return state.storeTypes.find((storeType) => {
      const name = normalizeKey(storeType.name);
      if (name.startsWith(normalized) || name.includes(normalized)) return true;
      const categories = Array.isArray(storeType.categories) ? storeType.categories : [];
      return categories.some((category) => {
        const key = normalizeKey(category);
        return key === normalized || key.startsWith(normalized) || key.includes(normalized);
      });
    }) || null;
  }

  function storeTypePlatformId(storeType) {
    const explicit = normalizePlatformId(
      storeType?.platformId || storeType?.platform || storeType?.buyerPlatform,
    );
    if (explicit) return explicit;
    return inferPlatformIdFromName(storeType?.name);
  }

  function handleSearchSubmit(rawQuery) {
    const query = String(rawQuery || "").trim();
    if (!query) return;

    const hits = buildLiveHits(query);
    const preferredKinds = ["company", "listing"];
    for (const kind of preferredKinds) {
      const hit = hits.find((entry) => entry.kind === kind && !entry.disabledReason);
      if (hit?.href) {
        window.location.href = hit.href;
        return;
      }
    }

    window.location.href = `/switch_shop.html?platform=shop&q=${encodeURIComponent(query)}`;
  }

  async function loadData() {
    try {
      const [platformsRes, storeTypesRes, sellersRes, productsRes] = await Promise.all([
        fetch("/api/platforms", { headers: { Accept: "application/json" } }),
        fetch("/api/store-types", { headers: { Accept: "application/json" } }),
        fetch("/api/sellers", { headers: { Accept: "application/json" } }),
        fetch("/api/products?approvalStatus=approved", { headers: { Accept: "application/json" } }),
      ]);
      const platformsData = await platformsRes.json().catch(() => ({}));
      const storeTypesData = await storeTypesRes.json().catch(() => ({}));
      const sellersData = await sellersRes.json().catch(() => ({}));
      const productsData = await productsRes.json().catch(() => ({}));

      if (platformsRes.ok && Array.isArray(platformsData.platformDetails)) {
        state.platforms = platformsData.platformDetails;
      } else {
        state.platforms = DEFAULT_PLATFORMS;
      }

      state.storeTypes = Array.isArray(storeTypesData.storeTypeDetails)
        ? storeTypesData.storeTypeDetails
        : [];
      state.sellers = Array.isArray(sellersData.sellers) ? sellersData.sellers : [];
      state.products = Array.isArray(productsData.products) ? productsData.products : [];
    } catch (_) {
      state.platforms = DEFAULT_PLATFORMS;
      state.storeTypes = [];
      state.sellers = [];
      state.products = [];
    }
    renderPlatforms();
    startPlaceholderAnimation({ reset: true });
    syncLiveSearchUi();
  }

  function bindEvents() {
    els.form?.addEventListener("submit", (event) => {
      event.preventDefault();
      handleSearchSubmit(els.input?.value);
    });

    els.input?.addEventListener("input", () => {
      syncClearButton();
      if (els.input.value.trim()) {
        els.input.classList.remove("is-placeholder-typing");
      }
      syncLiveSearchUi();
    });
    els.input?.addEventListener("focus", () => {
      stopPlaceholderAnimation();
      els.input.placeholder = "";
      syncLiveSearchUi();
    });
    els.input?.addEventListener("blur", () => {
      if (!els.input.value.trim()) {
        startPlaceholderAnimation();
      }
    });
    els.input?.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        resetSearchInput();
      }
    });

    els.clear?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!(els.input instanceof HTMLInputElement)) return;
      els.input.value = "";
      syncClearButton();
      hideLiveResults();
      els.input.focus();
      // Stay in search: show Top/Recent again instead of treating X as "back".
      state.suggestions?.showSuggestions?.();
      state.suggestions?.open?.();
      state.suggestions?.refreshRecent?.();
    });

    els.form?.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const disabledBtn = target?.closest?.("[data-live-disabled]");
      if (!(disabledBtn instanceof HTMLElement)) return;
      event.preventDefault();
      const message = disabledBtn.getAttribute("data-live-disabled") || "";
      if (message) window.alert(message);
    });

    if (window.SearchSuggestions?.attach) {
      state.suggestions = window.SearchSuggestions.attach({
        form: els.form,
        input: els.input,
        livePanel: true,
        getContext: () => ({
          platformId: "",
          category: "",
          storeType: "",
        }),
        onQueryChange: (query) => {
          if (query) renderLiveResults(query);
          else {
            hideLiveResults();
            state.suggestions?.showSuggestions?.();
          }
        },
        onSelect: () => {
          if (els.input instanceof HTMLInputElement) {
            els.input.focus();
          }
          syncClearButton();
          syncLiveSearchUi();
        },
      });
    }
  }

  function bindHeaderScroll() {
    const header = document.querySelector("body.md-platform-home > .login-site-header");
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
      form: els.form,
      home: document.getElementById("md-platform-search-home"),
      headerSlot: document.getElementById("md-header-search-slot"),
      header: document.querySelector("body.md-platform-home > .login-site-header"),
      input: els.input,
      onAfterMove: ({ hadFocus }) => {
        if (!hadFocus || !(els.input instanceof HTMLInputElement)) return;
        if (!els.input.value.trim()) {
          state.suggestions?.showSuggestions?.();
          state.suggestions?.open?.();
        } else {
          syncLiveSearchUi();
        }
      },
    });
  }

  bindEvents();
  bindHeaderScroll();
  bindHeaderSearchDock();
  syncClearButton();
  startPlaceholderAnimation({ reset: true });
  window.addEventListener("gms-login-language-updated", () => {
    renderPlatforms();
    startPlaceholderAnimation({ reset: true });
  });
  void loadData();
})();
