(() => {
  const KIND_OPTIONS = [
    { value: "percent", label: "Percent off" },
    { value: "gift", label: "Fixed amount" },
    { value: "shipping", label: "Free shipping" },
    { value: "shopping", label: "Buy 1 Get 1" },
    { value: "loyalty", label: "Loyalty" },
    { value: "ticket", label: "General ticket" },
  ];

  const BUILT_IN_PLATFORM_ART = Object.freeze({
    shop: "/assets/platform-shop-art.png",
    food: "/assets/platform-food-art.png",
  });
  const FALLBACK_PLATFORMS = [
    { id: "shop", name: "Shop", status: "active", primaryColor: "#0891b2", iconImageUrl: BUILT_IN_PLATFORM_ART.shop, iconName: "store" },
    { id: "food", name: "Food", status: "active", primaryColor: "#ea580c", iconImageUrl: BUILT_IN_PLATFORM_ART.food, iconName: "utensils" },
    { id: "hotels", name: "Hotel", status: "active", primaryColor: "#7c3aed", iconImageUrl: "", iconName: "hotel" },
    { id: "resort", name: "Resort", status: "active", primaryColor: "#0891b2", iconImageUrl: "", iconName: "hotel" },
    { id: "groceries", name: "Groceries", status: "active", primaryColor: "#16a34a", iconImageUrl: "", iconName: "shopping-basket" },
  ];

  const DEFAULT_PLATFORM_COLORS = Object.freeze({
    shop: "#0891b2",
    food: "#ea580c",
    hotels: "#7c3aed",
    resort: "#0891b2",
    groceries: "#16a34a",
  });
  const DEFAULT_VOUCHER_CARD_COLOR = "#e50914";
  const VOUCHER_CARD_PALETTE = Object.freeze([
    "#e50914",
    "#2563eb",
    "#7c3aed",
    "#db2777",
    "#dc2626",
    "#ea580c",
    "#65a30d",
    "#16a34a",
    "#0891b2",
    "#0f172a",
  ]);

  const els = {
    list: document.querySelector("[data-seller-admin-vouchers-list]"),
    total: document.querySelector("[data-seller-admin-vouchers-total]"),
    addButton: document.querySelector("[data-seller-admin-voucher-add]"),
    modalOverlay: document.getElementById("seller-voucher-modal-overlay"),
    modal: document.getElementById("seller-voucher-modal"),
    form: document.getElementById("seller-voucher-modal-form"),
    closeButton: document.getElementById("seller-voucher-modal-close-button"),
    cancelButton: document.getElementById("seller-voucher-modal-cancel-button"),
    submitButton: document.getElementById("seller-voucher-modal-submit-button"),
    feedback: document.querySelector("[data-seller-voucher-modal-feedback]"),
    preview: document.querySelector("[data-seller-voucher-modal-preview]"),
    inventoryTotal: document.querySelector("[data-seller-voucher-modal-inventory-total]"),
    inventoryList: document.querySelector("[data-seller-voucher-modal-inventory-list]"),
    titleInput: document.getElementById("seller-voucher-title-input"),
    codeInput: document.getElementById("seller-voucher-code-input"),
    discountTypeInput: document.getElementById("seller-voucher-discount-type-input"),
    discountTypeToggle: document.getElementById("seller-voucher-discount-type-toggle"),
    discountTypeToggleLabel: document.getElementById(
      "seller-voucher-discount-type-toggle-label",
    ),
    discountValueInput: document.getElementById("seller-voucher-discount-value-input"),
    discountValueLabel: document.getElementById("seller-voucher-discount-value-label"),
    discountValueHelper: document.getElementById("seller-voucher-discount-value-helper"),
    freeShippingInput: document.getElementById("seller-voucher-free-shipping-input"),
    freeShippingToggle: document.getElementById("seller-voucher-free-shipping-toggle"),
    freeShippingToggleLabel: document.getElementById(
      "seller-voucher-free-shipping-toggle-label",
    ),
    minSpendInput: document.getElementById("seller-voucher-min-spend-input"),
    usesPerAccountInput: document.getElementById("seller-voucher-uses-per-account-input"),
    colorInput: document.getElementById("seller-voucher-card-color-input"),
    colorHex: document.querySelector("[data-seller-voucher-card-color-hex]"),
    colorSwatches: document.querySelector("[data-seller-voucher-color-swatches]"),
    promoPreview: document.querySelector("[data-seller-voucher-modal-promo]"),
    passiveInput: document.getElementById("seller-voucher-passive-input"),
    passiveToggle: document.getElementById("seller-voucher-passive-toggle"),
    passiveToggleLabel: document.getElementById("seller-voucher-passive-toggle-label"),
    datePicker: document.getElementById("seller-voucher-date-picker"),
    dateInput: document.getElementById("seller-voucher-date-input"),
    dateTrigger: document.getElementById("seller-voucher-date-trigger"),
    dateValue: document.querySelector("[data-seller-voucher-date-value]"),
    repeatInput: document.getElementById("seller-voucher-repeat-input"),
    repeatToggle: document.getElementById("seller-voucher-repeat-toggle"),
    repeatToggleLabel: document.getElementById("seller-voucher-repeat-toggle-label"),
    repeatPanel: document.getElementById("seller-voucher-repeat-panel"),
    repeatDaysToggle: document.getElementById("seller-voucher-repeat-days-toggle"),
    repeatDaysLabel: document.querySelector("[data-seller-voucher-repeat-days-label]"),
    repeatDaysMenu: document.getElementById("seller-voucher-repeat-days-menu"),
    repeatStartTimeInput: document.getElementById("seller-voucher-repeat-start-time-input"),
    repeatEndTimeInput: document.getElementById("seller-voucher-repeat-end-time-input"),
  };

  const state = {
    items: [],
    platforms: FALLBACK_PLATFORMS.slice(),
    loading: false,
    bound: false,
    saving: false,
    voucherModalTrigger: null,
    closeTimer: 0,
    dateCalendar: null,
    dateViewMonth: null,
    dateDraft: null,
    datePositionFrame: 0,
    datePickerBound: false,
    countdownTimer: 0,
    cardColor: DEFAULT_VOUCHER_CARD_COLOR,
  };

  function refreshElements() {
    els.list = document.querySelector("[data-seller-admin-vouchers-list]");
    els.total = document.querySelector("[data-seller-admin-vouchers-total]");
    els.addButton = document.querySelector("[data-seller-admin-voucher-add]");
    els.modalOverlay = document.getElementById("seller-voucher-modal-overlay");
    els.modal = document.getElementById("seller-voucher-modal");
    els.form = document.getElementById("seller-voucher-modal-form");
    els.closeButton = document.getElementById("seller-voucher-modal-close-button");
    els.cancelButton = document.getElementById("seller-voucher-modal-cancel-button");
    els.submitButton = document.getElementById("seller-voucher-modal-submit-button");
    els.feedback = document.querySelector("[data-seller-voucher-modal-feedback]");
    els.preview = document.querySelector("[data-seller-voucher-modal-preview]");
    els.inventoryTotal = document.querySelector("[data-seller-voucher-modal-inventory-total]");
    els.inventoryList = document.querySelector("[data-seller-voucher-modal-inventory-list]");
    els.titleInput = document.getElementById("seller-voucher-title-input");
    els.codeInput = document.getElementById("seller-voucher-code-input");
    els.discountTypeInput = document.getElementById("seller-voucher-discount-type-input");
    els.discountTypeToggle = document.getElementById("seller-voucher-discount-type-toggle");
    els.discountTypeToggleLabel = document.getElementById(
      "seller-voucher-discount-type-toggle-label",
    );
    els.discountValueInput = document.getElementById("seller-voucher-discount-value-input");
    els.discountValueLabel = document.getElementById("seller-voucher-discount-value-label");
    els.discountValueHelper = document.getElementById(
      "seller-voucher-discount-value-helper",
    );
    els.freeShippingInput = document.getElementById("seller-voucher-free-shipping-input");
    els.freeShippingToggle = document.getElementById("seller-voucher-free-shipping-toggle");
    els.freeShippingToggleLabel = document.getElementById(
      "seller-voucher-free-shipping-toggle-label",
    );
    els.minSpendInput = document.getElementById("seller-voucher-min-spend-input");
    els.usesPerAccountInput = document.getElementById(
      "seller-voucher-uses-per-account-input",
    );
    els.colorInput = document.getElementById("seller-voucher-card-color-input");
    els.colorHex = document.querySelector("[data-seller-voucher-card-color-hex]");
    els.colorSwatches = document.querySelector("[data-seller-voucher-color-swatches]");
    els.promoPreview = document.querySelector("[data-seller-voucher-modal-promo]");
    els.passiveInput = document.getElementById("seller-voucher-passive-input");
    els.passiveToggle = document.getElementById("seller-voucher-passive-toggle");
    els.passiveToggleLabel = document.getElementById("seller-voucher-passive-toggle-label");
    els.datePicker = document.getElementById("seller-voucher-date-picker");
    els.dateInput = document.getElementById("seller-voucher-date-input");
    els.dateTrigger = document.getElementById("seller-voucher-date-trigger");
    els.dateValue = document.querySelector("[data-seller-voucher-date-value]");
    els.repeatInput = document.getElementById("seller-voucher-repeat-input");
    els.repeatToggle = document.getElementById("seller-voucher-repeat-toggle");
    els.repeatToggleLabel = document.getElementById("seller-voucher-repeat-toggle-label");
    els.repeatPanel = document.getElementById("seller-voucher-repeat-panel");
    els.repeatDaysToggle = document.getElementById("seller-voucher-repeat-days-toggle");
    els.repeatDaysLabel = document.querySelector("[data-seller-voucher-repeat-days-label]");
    els.repeatDaysMenu = document.getElementById("seller-voucher-repeat-days-menu");
    els.repeatStartTimeInput = document.getElementById("seller-voucher-repeat-start-time-input");
    els.repeatEndTimeInput = document.getElementById("seller-voucher-repeat-end-time-input");
  }

  function readAdminSession() {
    try {
      const raw = sessionStorage.getItem("gms-admin-session");
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function isGenericVoucherBrand(value) {
    return /^(store|store promo|store voucher|sitewide|seller store|seller company|company)$/i.test(
      String(value || "").replace(/\s+/g, " ").trim(),
    );
  }

  function resolveStoreBadge() {
    const session = readAdminSession() || {};
    const company = session.company && typeof session.company === "object" ? session.company : {};
    const candidates = [
      company.name,
      company.publicName,
      company.companyName,
      session.companyOfficialName,
      session.companyPublicName,
      session.companyName,
      session.storeName,
      session.businessName,
    ];
    for (const raw of candidates) {
      const text = String(raw || "").replace(/\s+/g, " ").trim();
      if (!text || isGenericVoucherBrand(text)) continue;
      const username = String(session.username || session.displayName || "").trim();
      if (username && text.toLowerCase() === username.toLowerCase()) continue;
      return text;
    }
    return "";
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
      if (normalized && normalized.toLowerCase() !== "admin") {
        return normalized;
      }
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
      .replace(/"/g, "&quot;");
  }

  function voucherRef(voucher) {
    return String(voucher?.id || voucher?.scheduleId || "").trim();
  }

  function setPageFeedback(message, tone = "notice") {
    const feedback = document.querySelector(
      ".feedback-note, #feedback-note, [data-super-admin-feedback]",
    );
    if (feedback instanceof HTMLElement) {
      feedback.textContent = message;
      feedback.classList.remove("error", "notice", "success");
      if (tone) feedback.classList.add(tone);
    }
  }

  function setModalFeedback(message, tone = "") {
    if (!(els.feedback instanceof HTMLElement)) return;
    if (!message) {
      els.feedback.hidden = true;
      els.feedback.textContent = "";
      els.feedback.classList.remove("error", "notice", "success");
      return;
    }
    els.feedback.hidden = false;
    els.feedback.textContent = message;
    els.feedback.classList.remove("error", "notice", "success");
    if (tone) els.feedback.classList.add(tone);
  }

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

  function resolveCardColor(voucher) {
    const explicit = normalizeHexColor(voucher?.cardColor);
    if (explicit) return explicit;
    const platformId = resolveShopPlatformId(voucher);
    if (platformId && platformId !== "all") {
      return resolvePlatformPrimaryColor(platformId);
    }
    return DEFAULT_VOUCHER_CARD_COLOR;
  }

  function resolveShopPlatformId(voucher) {
    const session = readAdminSession() || {};
    const candidates = [
      voucher?.sellerPlatformId,
      voucher?.shopPlatformId,
      voucher?.businessType,
      voucher?.platformId,
      session.platformId,
      session.businessType,
      session.storeType,
      session.storeTypeName,
      session.businessCategory,
      session.company?.businessType,
      session.store?.businessType,
      session.company?.platformId,
    ];
    const platforms = state.platforms.length ? state.platforms : FALLBACK_PLATFORMS;
    for (const value of candidates) {
      const raw = String(value ?? "").trim().toLowerCase();
      if (!raw || raw === "all") continue;
      let id = normalizePlatformId(raw);
      if (id === "hotel") id = "hotels";
      if (id === "grocery") id = "groceries";
      if (id && id !== "all" && (DEFAULT_PLATFORM_COLORS[id] || platforms.some((entry) => entry.id === id))) {
        return id;
      }
      const byName = platforms.find((entry) => String(entry.name || "").trim().toLowerCase() === raw);
      if (byName?.id) return byName.id;
      const byPartial = platforms.find((entry) => {
        const name = String(entry.name || "").trim().toLowerCase();
        return name && (raw.includes(name) || name.includes(raw));
      });
      if (byPartial?.id) return byPartial.id;
    }
    const hay = candidates.map((value) => String(value || "").toLowerCase()).join(" ");
    if (hay.includes("resort")) {
      const resort = platforms.find((entry) => entry.id === "resort" || String(entry.name || "").toLowerCase().includes("resort"));
      if (resort?.id) return resort.id;
    }
    if (hay.includes("hotel") || hay.includes("restaurant") || hay.includes("resto")) {
      const hotels = platforms.find(
        (entry) => entry.id === "hotels" || String(entry.name || "").toLowerCase().includes("hotel"),
      );
      return hotels?.id || "hotels";
    }
    return "shop";
  }

  function resolveShopColor(voucher) {
    return resolvePlatformPrimaryColor(resolveShopPlatformId(voucher));
  }

  function resolvePlatformIconUrl(platformId) {
    const id = normalizePlatformId(platformId);
    const match = state.platforms.find((entry) => entry.id === id);
    return String(
      match?.iconImageUrl || match?.iconUrl || BUILT_IN_PLATFORM_ART[id] || "",
    ).trim();
  }

  function platformIconSvg(iconName) {
    const name = String(iconName || "")
      .trim()
      .toLowerCase()
      .replace(/^(lucide:|tabler:)/, "");
    const paths = {
      store:
        '<path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7"/>',
      utensils:
        '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
      hotel:
        '<path d="M10 22v-6.57"/><path d="M12 11h.01"/><path d="M12 7h.01"/><path d="M14 15.43V22"/><path d="M15 16a5 5 0 0 0-6 0"/><path d="M16 11h.01"/><path d="M16 7h.01"/><path d="M8 11h.01"/><path d="M8 7h.01"/><rect x="4" y="2" width="16" height="20" rx="2"/>',
      "shopping-basket":
        '<path d="m5 11 4-7"/><path d="m19 11-4-7"/><path d="M2 11h20"/><path d="m3.5 11 1.6 7.4a2 2 0 0 0 2 1.6h9.8c.9 0 1.8-.7 2-1.6l1.7-7.4"/><path d="m9 11 1 9"/><path d="M4.5 15.5h15"/><path d="m15 11-1 9"/>',
    };
    const d = paths[name];
    if (!d) return "";
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  }

  function platformMarkHtml(platformId) {
    const id = normalizePlatformId(platformId);
    const match = state.platforms.find((entry) => entry.id === id);
    const url = resolvePlatformIconUrl(id);
    const mark =
      (url ? `<img src="${escapeHtml(url)}" alt="" />` : "") ||
      platformIconSvg(match?.iconName);
    if (!mark) return "";
    return `<span class="sa-voucher-promo__platform-mark" aria-hidden="true">${mark}</span>`;
  }

  function cardInkColor(hex) {
    const color = normalizeHexColor(hex, DEFAULT_VOUCHER_CARD_COLOR);
    const match = color.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
    if (!match) return "#ffffff";
    const r = Number.parseInt(match[1], 16);
    const g = Number.parseInt(match[2], 16);
    const b = Number.parseInt(match[3], 16);
    return (r * 299 + g * 587 + b * 114) / 1000 >= 180 ? "#111827" : "#ffffff";
  }

  function padClock(value) {
    return String(Math.max(0, Math.floor(Number(value) || 0))).padStart(2, "0");
  }

  function clockUnitHtml(key, value, label) {
    const next = padClock(value);
    return `<div class="sa-voucher-promo__unit"><strong class="sa-voucher-promo__digits" data-voucher-cd="${key}"><span class="sa-voucher-promo__digit-keep">${next.slice(0, -1)}</span><span class="sa-voucher-promo__digit-slot"><b data-cd-ones>${next.slice(-1)}</b></span></strong><span>${label}</span></div>`;
  }

  function countdownPartsFromMs(endMs) {
    const remain = Math.max(0, Number(endMs) - Date.now());
    const totalSec = Math.floor(remain / 1000);
    return {
      days: Math.floor(totalSec / 86400),
      hours: Math.floor((totalSec % 86400) / 3600),
      minutes: Math.floor((totalSec % 3600) / 60),
      seconds: totalSec % 60,
      expired: !endMs || remain <= 0,
    };
  }

  function parseVoucherDisplayDate(value) {
    const raw = String(value ?? "").trim();
    const match = raw.match(
      /^([A-Za-z]{3})\s+(\d{1,2}),\s+(\d{4})(?:\s+(\d{1,2}):(\d{2})\s*([AP]M))?$/i,
    );
    if (!match) return null;
    const months = {
      Jan: 0,
      Feb: 1,
      Mar: 2,
      Apr: 3,
      May: 4,
      Jun: 5,
      Jul: 6,
      Aug: 7,
      Sep: 8,
      Oct: 9,
      Nov: 10,
      Dec: 11,
    };
    const monthKey = `${match[1].charAt(0).toUpperCase()}${match[1].slice(1).toLowerCase()}`;
    const monthIndex = months[monthKey];
    if (monthIndex == null) return null;
    const year = Number(match[3]);
    const day = Number(match[2]);
    const date = new Date(year, monthIndex, day);
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== monthIndex ||
      date.getDate() !== day
    ) {
      return null;
    }
    if (match[4] && match[6]) {
      const hours =
        (Number(match[4]) % 12) + (match[6].toUpperCase() === "PM" ? 12 : 0);
      date.setHours(hours, Number(match[5]), 0, 0);
    } else {
      date.setHours(23, 59, 0, 0);
    }
    return date;
  }

  function voucherExpiryMs(voucher) {
    const fromDisplay = parseVoucherDisplayDate(voucher?.date);
    if (fromDisplay instanceof Date && !Number.isNaN(fromDisplay.getTime())) {
      return fromDisplay.getTime();
    }
    const parsed = parseVoucherDateInputValue(voucher?.date);
    if (parsed instanceof Date) {
      parsed.setHours(23, 59, 0, 0);
      return parsed.getTime();
    }
    return 0;
  }

  function voucherOfferHeadline(voucher) {
    const discountType = normalizeDiscountType(
      voucher?.discountType ||
        (voucher?.kind === "gift" || voucher?.kind === "fixed" ? "fixed" : "percent"),
    );
    const discountValue = formatDiscountValue(voucher?.discountValue);
    const freeShipping = isFreeShippingVoucher(voucher);
    if (discountValue && discountType === "fixed") {
      return { amount: `₱${discountValue}`, unit: "OFF" };
    }
    if (discountValue) {
      return { amount: `${discountValue}%`, unit: "OFF" };
    }
    if (freeShipping) {
      return { amount: "FREE", unit: "SHIP" };
    }
    return { amount: "DEAL", unit: "OFF" };
  }

  function resolveSellerLogoUrl() {
    const session = readAdminSession();
    if (session?.businessLogoSkipped === true) return "";
    const blocked = new Set(
      [
        session?.googleProfile?.picture,
        session?.googlePicture,
        session?.avatarUrl,
        session?.photoUrl,
        session?.profilePhotoUrl,
      ]
        .map((value) => String(value ?? "").trim())
        .filter(Boolean),
    );
    return (
      [
        session?.profileData?.companyPictureUrl,
        session?.profileData?.companyProfileImageUrl,
        session?.profileData?.businessLogoUrl,
        session?.company?.logoUrl,
        session?.company?.companyPictureUrl,
        session?.company?.companyProfileImageUrl,
        session?.companyPictureUrl,
        session?.companyProfileImageUrl,
        session?.businessLogoUrl,
        session?.store?.companyPictureUrl,
        session?.store?.companyProfileImageUrl,
      ]
        .map((value) => String(value ?? "").trim())
        .find((value) => value && !blocked.has(value)) || ""
    );
  }

  function voucherPromoHtml(voucher, { compact = false } = {}) {
    const color = resolveCardColor(voucher);
    const ink = cardInkColor(color);
    const shopColor = resolveShopColor(voucher);
    const shopInk = cardInkColor(shopColor);
    const offer = voucherOfferHeadline(voucher);
    const logoUrl = String(voucher?.companyLogoUrl || "").trim() || resolveSellerLogoUrl();
    const endMs = voucherExpiryMs(voucher);
    const noExpiry = !endMs;
    const parts = countdownPartsFromMs(endMs);
    const expired = !noExpiry && parts.expired;
    const code = String(voucher?.code || "").trim().toUpperCase();
    const initials = String(resolveStoreBadge() || "CO")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    const fallbackInitials =
      initials.length > 1
        ? `${initials[0][0] || ""}${initials[1][0] || ""}`.toUpperCase()
        : String(initials[0] || "CO").slice(0, 2).toUpperCase();
    const logoMarkup = logoUrl
      ? `<img src="${escapeHtml(logoUrl)}" alt="" />`
      : `<span class="sa-voucher-promo__initials">${escapeHtml(fallbackInitials)}</span>`;
    return `
      <div class="sa-voucher-promo${compact ? " is-compact" : ""}${expired ? " is-expired" : ""}${noExpiry ? " is-no-expiry" : ""}" style="--voucher-shop-color:${shopColor};--voucher-shop-ink:${shopInk};--voucher-card-color:${color};--voucher-card-ink:${ink};" data-voucher-card-preview data-voucher-countdown="${endMs || ""}">
        <div class="sa-voucher-promo__face">
          ${platformMarkHtml(resolveShopPlatformId(voucher))}
          <div class="sa-voucher-promo__brand-logo">${logoMarkup}</div>
          <p class="sa-voucher-promo__offer">
            ${
              resolveStoreBadge()
                ? `<span class="sa-voucher-promo__brand">${escapeHtml(resolveStoreBadge())}</span>`
                : ""
            }
            <span class="sa-voucher-promo__deal">
              <strong>${escapeHtml(offer.amount)}</strong>
              <span class="sa-voucher-promo__off">${escapeHtml(offer.unit)}</span>
            </span>
          </p>
          <div class="sa-voucher-promo__logo">${logoMarkup}</div>
          <span class="sa-voucher-promo__perforation" aria-hidden="true"></span>
          ${
            code
              ? `<span class="sa-voucher-promo__redeem is-code">${escapeHtml(code)}</span>`
              : ""
          }
        </div>
        <div class="sa-voucher-promo__clock" aria-label="${noExpiry ? "No expiry" : "Time until expiry"}">
          <div class="sa-voucher-promo__cal-head">
            <span class="sa-voucher-promo__cal-rings" aria-hidden="true"><i></i><i></i></span>
            <strong>${expired ? "Ended" : noExpiry ? "No expiry" : "Limited time"}</strong>
          </div>
          <p class="sa-voucher-promo__cal-kicker"><span>${noExpiry ? "Does not expire" : "Ends in"}</span></p>
          <div class="sa-voucher-promo__cal-units">
            ${clockUnitHtml("days", parts.days, "Days")}
            ${clockUnitHtml("hours", parts.hours, "Hours")}
            ${clockUnitHtml("minutes", parts.minutes, "Mins")}
            ${clockUnitHtml("seconds", parts.seconds, "Secs")}
          </div>
        </div>
      </div>
    `;
  }

  function setCountdownDigit(node, value) {
    const next = padClock(value);
    const keepEl = node.querySelector(".sa-voucher-promo__digit-keep");
    const onesEl = node.querySelector("[data-cd-ones]");
    if (keepEl && keepEl.textContent !== next.slice(0, -1)) {
      keepEl.textContent = next.slice(0, -1);
    }
    const ones = next.slice(-1);
    if (!onesEl || onesEl.textContent === ones) return;
    const slot = onesEl.parentElement;
    if (slot?.classList.contains("sa-voucher-promo__digit-slot")) {
      const leaving = onesEl.cloneNode(true);
      leaving.removeAttribute("data-cd-ones");
      leaving.classList.remove("is-lift");
      leaving.classList.add("is-lift-out");
      slot.appendChild(leaving);
      leaving.addEventListener("animationend", () => leaving.remove(), { once: true });
    }
    onesEl.textContent = ones;
    onesEl.classList.remove("is-lift");
    void onesEl.offsetWidth;
    onesEl.classList.add("is-lift");
  }

  function tickVoucherCountdowns(root = document) {
    if (!(root instanceof Element) && root !== document) return;
    root.querySelectorAll("[data-voucher-countdown]").forEach((el) => {
      const endMs = Number(el.getAttribute("data-voucher-countdown") || 0);
      const noExpiry = !endMs;
      const parts = countdownPartsFromMs(endMs);
      el.classList.toggle("is-expired", !noExpiry && parts.expired);
      el.classList.toggle("is-no-expiry", noExpiry);
      const kicker = el.querySelector(".sa-voucher-promo__cal-kicker span");
      if (kicker) kicker.textContent = noExpiry ? "Does not expire" : "Ends in";
      const head = el.querySelector(".sa-voucher-promo__cal-head strong");
      if (head) {
        head.textContent = noExpiry
          ? "No expiry"
          : parts.expired
            ? "Ended"
            : "Limited time";
      }
      const map = {
        days: parts.days,
        hours: parts.hours,
        minutes: parts.minutes,
        seconds: parts.seconds,
      };
      el.querySelectorAll("[data-voucher-cd]").forEach((node) => {
        const key = node.getAttribute("data-voucher-cd");
        if (key && Object.prototype.hasOwnProperty.call(map, key)) {
          setCountdownDigit(node, map[key]);
        }
      });
    });
  }

  function syncVoucherBrandWrap(root = document) {
    root.querySelectorAll(".sa-voucher-promo").forEach((el) => {
      const brand = el.querySelector(".sa-voucher-promo__brand");
      let twoLine = false;
      if (brand instanceof HTMLElement) {
        const styles = window.getComputedStyle(brand);
        const fontSize = Number.parseFloat(styles.fontSize) || 10;
        const parsedLine = Number.parseFloat(styles.lineHeight);
        const oneLine = Number.isFinite(parsedLine) && parsedLine > 0 ? parsedLine : fontSize * 1.2;
        const padY =
          (Number.parseFloat(styles.paddingTop) || 0) +
          (Number.parseFloat(styles.paddingBottom) || 0);
        twoLine = brand.scrollHeight - padY > oneLine + 2;
      }
      el.classList.toggle("is-brand-2line", twoLine);
    });
  }

  function startVoucherCountdowns() {
    tickVoucherCountdowns();
    window.requestAnimationFrame(() => syncVoucherBrandWrap());
    if (state.countdownTimer) return;
    state.countdownTimer = window.setInterval(() => tickVoucherCountdowns(), 1000);
  }

  function setCardColor(value) {
    refreshElements();
    const next = resolveCardColor({ cardColor: value });
    state.cardColor = next;
    if (els.colorInput instanceof HTMLInputElement) {
      els.colorInput.value = next;
    }
    if (els.colorHex) {
      els.colorHex.textContent = next.toUpperCase();
    }
    const ink = cardInkColor(next);
    document
      .querySelectorAll("#seller-voucher-modal [data-voucher-card-preview]")
      .forEach((preview) => {
        if (!(preview instanceof HTMLElement)) return;
        preview.style.setProperty("--voucher-card-color", next);
        preview.style.setProperty("--voucher-card-ink", ink);
      });
    document
      .querySelectorAll("#seller-voucher-modal .sa-voucher-promo__face")
      .forEach((face) => {
        if (!(face instanceof HTMLElement)) return;
        face.style.setProperty("--voucher-card-color", next);
        face.style.setProperty("--voucher-card-ink", ink);
        face.style.backgroundColor = next;
      });
    if (els.colorSwatches instanceof HTMLElement) {
      els.colorSwatches.querySelectorAll("[data-voucher-color-swatch]").forEach((button) => {
        const isSelected =
          String(button.dataset.voucherColorSwatch || "").toLowerCase() === next;
        button.classList.toggle("is-selected", isSelected);
        button.setAttribute("aria-pressed", String(isSelected));
      });
    }
    return next;
  }

  function renderCardColorSwatches() {
    refreshElements();
    if (!(els.colorSwatches instanceof HTMLElement)) return;
    const selected = resolveCardColor({ cardColor: els.colorInput?.value });
    els.colorSwatches.replaceChildren();
    for (const color of VOUCHER_CARD_PALETTE) {
      const button = document.createElement("button");
      button.type = "button";
      button.className =
        "super-admin-platform-palette__swatch" + (color === selected ? " is-selected" : "");
      button.style.backgroundColor = color;
      button.dataset.voucherColorSwatch = color;
      button.setAttribute("aria-label", `Select ${color}`);
      button.setAttribute("aria-pressed", String(color === selected));
      button.title = color;
      els.colorSwatches.append(button);
    }
  }

  function resolvePlatformPrimaryColor(platformId) {
    const id = normalizePlatformId(platformId);
    const match = state.platforms.find((entry) => entry.id === id);
    const fromPlatform = normalizeHexColor(
      match?.primaryColor || match?.color || match?.accentColor,
    );
    if (fromPlatform) return fromPlatform;
    return DEFAULT_PLATFORM_COLORS[id] || "#0891b2";
  }

  function accentVarsFromHex(hex) {
    const color = normalizeHexColor(hex, "#0891b2");
    const match = color.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
    if (!match) return null;
    const r = Number.parseInt(match[1], 16);
    const g = Number.parseInt(match[2], 16);
    const b = Number.parseInt(match[3], 16);
    const hr = Math.round(r * 0.82);
    const hg = Math.round(g * 0.82);
    const hb = Math.round(b * 0.82);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return {
      accent: `rgb(${r}, ${g}, ${b})`,
      accentRgb: `${r}, ${g}, ${b}`,
      accentText: `rgb(${hr}, ${hg}, ${hb})`,
      accentButtonBg: `rgb(${r}, ${g}, ${b})`,
      accentContrast: yiq >= 160 ? "#111827" : "#ffffff",
      mdAccent: `rgb(${r}, ${g}, ${b})`,
    };
  }

  function applyAccentVars(element, hex) {
    if (!(element instanceof HTMLElement)) return;
    const vars = accentVarsFromHex(hex);
    if (!vars) return;
    element.style.setProperty("--accent", vars.accent);
    element.style.setProperty("--accent-rgb", vars.accentRgb);
    element.style.setProperty("--accent-text", vars.accentText);
    element.style.setProperty("--accent-button-bg", vars.accentButtonBg);
    element.style.setProperty("--accent-contrast", vars.accentContrast);
    element.style.setProperty("--md-accent", vars.mdAccent);
  }

  function accentStyleAttr(hex) {
    const vars = accentVarsFromHex(hex);
    if (!vars) return "";
    return ` style="--accent:${vars.accent};--accent-rgb:${vars.accentRgb};--accent-text:${vars.accentText};--accent-button-bg:${vars.accentButtonBg};--accent-contrast:${vars.accentContrast};--md-accent:${vars.mdAccent};"`;
  }

  function applyModalPlatformTheme(platformId = "") {
    refreshElements();
    // Store vouchers are not platform-gated; keep modal on workspace accent.
    const rootStyle = getComputedStyle(document.documentElement);
    const workspaceAccent = normalizeHexColor(rootStyle.getPropertyValue("--accent"));
    const id = normalizePlatformId(platformId);
    const hex =
      workspaceAccent ||
      (id && id !== "all" ? resolvePlatformPrimaryColor(id) : "") ||
      "#0891b2";
    applyAccentVars(els.modal, hex);
    applyAccentVars(els.preview, hex);
  }

  function platformLabel(platformId) {
    const id = normalizePlatformId(platformId);
    if (!id || id === "all") return "Your store";
    const match = state.platforms.find((entry) => entry.id === id);
    if (match?.name) return match.name;
    return id.charAt(0).toUpperCase() + id.slice(1);
  }

  function syncPlatformSelect(selectedPlatformId = "") {
    refreshElements();
    const select = els.platformSelect;
    if (!(select instanceof HTMLSelectElement)) return;
    const preferred = normalizePlatformId(selectedPlatformId);
    const platforms = state.platforms.length ? state.platforms : FALLBACK_PLATFORMS;
    select.replaceChildren();
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select platform";
    select.append(placeholder);
    for (const platform of platforms) {
      const option = document.createElement("option");
      option.value = platform.id;
      option.textContent =
        platform.status === "inactive"
          ? `${platform.name} (Inactive)`
          : platform.name;
      select.append(option);
    }
    if (preferred && ![...select.options].some((option) => option.value === preferred)) {
      const fallback = document.createElement("option");
      fallback.value = preferred;
      fallback.textContent = platformLabel(preferred);
      select.append(fallback);
    }
    select.value = preferred && [...select.options].some((option) => option.value === preferred)
      ? preferred
      : "";
  }

  async function loadPlatforms() {
    try {
      const response = await fetch("/api/platforms", {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message || "Unable to load platforms.");
      }
      const next = (Array.isArray(payload.platforms) ? payload.platforms : [])
        .map((entry) => {
          const id = normalizePlatformId(entry?.id || entry?.platformId);
          const name = String(entry?.name || "").trim() || platformLabel(id);
          if (!id) return null;
          return {
            id,
            name,
            status: String(entry?.status || "active").trim().toLowerCase() || "active",
            sortOrder: Number(entry?.sortOrder) || 0,
            iconImageUrl: String(entry?.iconImageUrl || entry?.iconUrl || BUILT_IN_PLATFORM_ART[id] || "").trim(),
            iconName: String(entry?.iconName || entry?.lucideIconName || "").trim(),
            primaryColor: normalizeHexColor(
              entry?.primaryColor || entry?.color || entry?.accentColor,
              DEFAULT_PLATFORM_COLORS[id] || "#0891b2",
            ),
          };
        })
        .filter(Boolean)
        .sort((left, right) => {
          if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder;
          return left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
        });
      if (next.length) state.platforms = next;
    } catch (_) {
      if (!state.platforms.length) state.platforms = FALLBACK_PLATFORMS.slice();
    }
    syncPlatformSelect(els.platformSelect?.value || "");
  }

  function voucherIconSvg(kind = "ticket") {
    const icons = {
      percent:
        '<path d="M19 5 5 19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
      gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/><path d="M7.5 8A2.5 2.5 0 1 1 12 6.5V8M16.5 8A2.5 2.5 0 1 0 12 6.5V8"/>',
      shipping:
        '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
      shopping:
        '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
      loyalty:
        '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
      ticket:
        '<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2M13 11v2M13 17v2"/>',
    };
    const lucideName =
      kind === "shipping"
        ? "truck"
        : kind === "percent"
          ? "percent"
          : kind === "gift"
            ? "gift"
            : kind === "shopping"
              ? "shopping-bag"
              : kind === "loyalty"
                ? "heart"
                : "ticket";
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-${lucideName}" aria-hidden="true">${icons[kind] || icons.ticket}</svg>`;
  }

  function noteHtml(note) {
    return escapeHtml(note).replace(/\n/g, "<br>");
  }

  function formatMinSpend(value) {
    const digits = String(value ?? "").replace(/[^\d]/g, "");
    return digits || "0";
  }

  function formatUsesPerAccount(value) {
    const amount = Math.trunc(Number(value));
    if (!Number.isFinite(amount) || amount < 1) return "1";
    return String(Math.min(amount, 99));
  }

  function formatDiscountValue(value) {
    const digits = String(value ?? "").replace(/[^\d.]/g, "");
    if (!digits) return "";
    const amount = Number(digits);
    if (!Number.isFinite(amount) || amount <= 0) return "";
    return String(Math.round(amount));
  }

  function normalizeDiscountType(value) {
    return String(value || "").trim().toLowerCase() === "fixed"
      ? "fixed"
      : "percent";
  }

  function discountSubtitle(discountType, discountValue, freeShipping = false) {
    const value = formatDiscountValue(discountValue);
    if (!value && freeShipping) return "Free shipping on total purchase";
    if (discountType === "fixed") {
      const base = value
        ? `₱${value} off total purchase`
        : "Fixed amount off total purchase";
      return freeShipping ? `${base} · Free shipping` : base;
    }
    const base = value
      ? `${value}% of total purchase`
      : "Percent of total purchase";
    return freeShipping ? `${base} · Free shipping` : base;
  }

  function discountTitle(discountType, discountValue, freeShipping = false) {
    const value = formatDiscountValue(discountValue);
    if (value) {
      return discountType === "fixed" ? `₱${value} OFF` : `${value}% OFF`;
    }
    if (freeShipping) return "Free Shipping";
    return "";
  }

  function actionLabel(action) {
    if (action === "apply") return "Apply";
    if (action === "used") return "Used";
    if (action === "expired") return "Expired";
    return "Use Now";
  }

  function statusLabel(status) {
    if (status === "used") return "Used";
    if (status === "expired") return "Expired";
    if (status === "inactive") return "Inactive";
    return "Active";
  }

  function resolveVoucherStatus(voucher) {
    const status = String(voucher?.status || "").trim().toLowerCase();
    return ["active", "used", "expired", "inactive"].includes(status)
      ? status
      : "active";
  }

  function voucherInactiveReasons(voucher) {
    const listed = Array.isArray(voucher?.inactiveReasons)
      ? voucher.inactiveReasons.filter((entry) => entry && (entry.title || entry.detail))
      : [];
    if (listed.length) return listed;
    const reason = String(voucher?.inactiveReason || "").trim().toLowerCase();
    const detail = String(voucher?.companyEnforcementReason || "").trim();
    if (reason === "company-restricted" || voucher?.companyIsRestricted) {
      return [{
        title: "Company is restricted",
        detail: detail || "Super Admin restricted this company. Store vouchers stay inactive until the restriction ends.",
      }];
    }
    if (reason === "company-banned" || voucher?.companyIsBanned) {
      return [{
        title: "Company is banned",
        detail: detail || "Super Admin banned this company. Store vouchers cannot be used until the company is unbanned.",
      }];
    }
    return [{
      title: "Voucher is inactive",
      detail: "This store voucher is not available to users.",
    }];
  }

  function voucherStatusControlHtml(voucher) {
    const status = resolveVoucherStatus(voucher);
    if (status !== "inactive") {
      return `<span class="sa-voucher-card__status is-${escapeHtml(status)}">${escapeHtml(statusLabel(status))}</span>`;
    }
    const reasons = voucherInactiveReasons(voucher)
      .map((reason) => `
        <div class="sa-voucher-card__activity-reason">
          <span class="sa-voucher-card__activity-reason-title">${escapeHtml(reason.title || "Inactive")}</span>
          <span class="sa-voucher-card__activity-reason-detail">${escapeHtml(reason.detail || "")}</span>
        </div>
      `)
      .join("");
    return `
      <span class="sa-voucher-card__activity is-inactive">
        <button type="button" class="sa-voucher-card__status is-inactive sa-voucher-card__activity-trigger" data-voucher-inactive-toggle aria-expanded="false" aria-haspopup="true" aria-label="Inactive reasons">
          <span>Inactive</span>
          <span class="sa-voucher-card__activity-chevron" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"></path></svg>
          </span>
        </button>
        <div class="sa-voucher-card__activity-menu" hidden>
          <strong class="sa-voucher-card__activity-menu-title">Why inactive?</strong>
          ${reasons}
        </div>
      </span>
    `;
  }

  function closeVoucherInactiveMenus(except = null) {
    document.querySelectorAll(".sa-voucher-card__activity.is-open").forEach((node) => {
      if (except && node === except) return;
      node.classList.remove("is-open");
      const trigger = node.querySelector("[data-voucher-inactive-toggle]");
      const menu = node.querySelector(".sa-voucher-card__activity-menu");
      if (trigger) trigger.setAttribute("aria-expanded", "false");
      if (menu) menu.hidden = true;
    });
  }

  function setVoucherInactiveMenuOpen(wrap, open) {
    if (!(wrap instanceof HTMLElement)) return;
    if (open) closeVoucherInactiveMenus(wrap);
    wrap.classList.toggle("is-open", open);
    const trigger = wrap.querySelector("[data-voucher-inactive-toggle]");
    const menu = wrap.querySelector(".sa-voucher-card__activity-menu");
    if (trigger) trigger.setAttribute("aria-expanded", open ? "true" : "false");
    if (menu) menu.hidden = !open;
  }

  function isPassiveVoucher(voucher) {
    return Boolean(voucher?.passive ?? voucher?.isPassive);
  }

  function setPassiveToggle(enabled) {
    refreshElements();
    const next = Boolean(enabled);
    if (els.passiveInput instanceof HTMLInputElement) {
      els.passiveInput.checked = next;
    }
    if (els.passiveToggle instanceof HTMLElement) {
      els.passiveToggle.classList.toggle("is-active", next);
      els.passiveToggle.setAttribute("aria-pressed", next ? "true" : "false");
    }
    if (els.passiveToggleLabel) {
      els.passiveToggleLabel.textContent = next ? "On" : "Off";
    }
  }

  function setFreeShippingToggle(enabled) {
    refreshElements();
    const next = Boolean(enabled);
    if (els.freeShippingInput instanceof HTMLInputElement) {
      els.freeShippingInput.checked = next;
    }
    if (els.freeShippingToggle instanceof HTMLElement) {
      els.freeShippingToggle.classList.toggle("is-active", next);
      els.freeShippingToggle.setAttribute("aria-pressed", next ? "true" : "false");
    }
    if (els.freeShippingToggleLabel) {
      els.freeShippingToggleLabel.textContent = next ? "On" : "Off";
    }
    if (els.discountValueInput instanceof HTMLInputElement) {
      els.discountValueInput.required = !next;
    }
  }

  const REPEAT_DAY_KEYS = Object.freeze(["sun", "mon", "tue", "wed", "thu", "fri", "sat"]);
  const REPEAT_DAY_SHORT = Object.freeze({
    sun: "Sun",
    mon: "Mon",
    tue: "Tue",
    wed: "Wed",
    thu: "Thu",
    fri: "Fri",
    sat: "Sat",
  });

  function normalizeRepeatDays(value) {
    const list = Array.isArray(value)
      ? value
      : String(value || "").split(/[,\s]+/).filter(Boolean);
    const picked = new Set(
      list
        .map((entry) => String(entry || "").trim().toLowerCase().slice(0, 3))
        .filter((key) => REPEAT_DAY_KEYS.includes(key)),
    );
    return REPEAT_DAY_KEYS.filter((day) => picked.has(day));
  }

  function formatRepeatTime(value) {
    const match = String(value ?? "").trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return "";
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours > 23 || minutes > 59) {
      return "";
    }
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }

  function readRepeatDays() {
    refreshElements();
    if (!(els.repeatDaysMenu instanceof HTMLElement)) return [];
    return Array.from(els.repeatDaysMenu.querySelectorAll("[data-repeat-day]"))
      .filter((button) => button.getAttribute("aria-pressed") === "true")
      .map((button) => String(button.getAttribute("data-repeat-day") || "").trim().toLowerCase())
      .filter((day) => REPEAT_DAY_KEYS.includes(day));
  }

  function syncRepeatDaysUi(days = readRepeatDays()) {
    refreshElements();
    const selected = normalizeRepeatDays(days);
    if (els.repeatDaysMenu instanceof HTMLElement) {
      els.repeatDaysMenu.querySelectorAll("[data-repeat-day]").forEach((button) => {
        const day = String(button.getAttribute("data-repeat-day") || "").trim().toLowerCase();
        const on = selected.includes(day);
        button.classList.toggle("is-selected", on);
        button.classList.toggle("is-active", on);
        button.setAttribute("aria-pressed", on ? "true" : "false");
        button.setAttribute("aria-selected", on ? "true" : "false");
      });
    }
    if (els.repeatDaysLabel) {
      els.repeatDaysLabel.textContent = selected.length
        ? selected.map((day) => REPEAT_DAY_SHORT[day] || day).join(", ")
        : "Select days";
    }
  }

  function toggleRepeatDay(day) {
    const key = String(day || "").trim().toLowerCase();
    if (!REPEAT_DAY_KEYS.includes(key)) return;
    const current = new Set(readRepeatDays());
    if (current.has(key)) current.delete(key);
    else current.add(key);
    syncRepeatDaysUi([...current]);
  }

  function setRepeatDaysMenuOpen(open) {
    refreshElements();
    const shouldOpen = Boolean(open);
    const dropdown = els.repeatDaysToggle?.closest(".sa-choice-dropdown");
    dropdown?.classList.toggle("is-open", shouldOpen);
    if (els.repeatDaysToggle instanceof HTMLButtonElement) {
      els.repeatDaysToggle.setAttribute("aria-expanded", String(shouldOpen));
    }
    if (els.repeatDaysMenu instanceof HTMLElement) {
      els.repeatDaysMenu.hidden = !shouldOpen;
    }
  }

  function setRepeatWeeklyToggle(enabled) {
    refreshElements();
    const next = Boolean(enabled);
    if (els.repeatInput instanceof HTMLInputElement) els.repeatInput.checked = next;
    if (els.repeatToggle instanceof HTMLElement) {
      els.repeatToggle.classList.toggle("is-active", next);
      els.repeatToggle.setAttribute("aria-pressed", next ? "true" : "false");
    }
    if (els.repeatToggleLabel) els.repeatToggleLabel.textContent = next ? "On" : "Off";
    if (els.repeatPanel instanceof HTMLElement) els.repeatPanel.hidden = !next;
    if (!next) {
      syncRepeatDaysUi([]);
      if (els.repeatStartTimeInput instanceof HTMLInputElement) els.repeatStartTimeInput.value = "";
      if (els.repeatEndTimeInput instanceof HTMLInputElement) els.repeatEndTimeInput.value = "";
      setRepeatDaysMenuOpen(false);
    }
  }

  function isFreeShippingVoucher(voucher) {
    return Boolean(voucher?.freeShipping ?? voucher?.isFreeShipping);
  }

  function syncDiscountValueUi(discountType) {
    refreshElements();
    const isPercent = discountType !== "fixed";
    if (els.discountValueLabel) {
      els.discountValueLabel.textContent = isPercent
        ? "Percent of total purchase (%)"
        : "Fixed price off total purchase (₱)";
    }
    if (els.discountValueHelper) {
      els.discountValueHelper.textContent = isPercent
        ? "How many percent off the buyer's total purchase."
        : "Fixed peso amount off the buyer's total purchase.";
    }
    if (els.discountValueInput instanceof HTMLInputElement) {
      els.discountValueInput.placeholder = isPercent ? "20" : "100";
      els.discountValueInput.min = "1";
      els.discountValueInput.max = isPercent ? "100" : "";
      if (isPercent) {
        els.discountValueInput.setAttribute("max", "100");
      } else {
        els.discountValueInput.removeAttribute("max");
      }
    }
  }

  function setDiscountTypeToggle(discountType) {
    refreshElements();
    const next = normalizeDiscountType(discountType);
    const isPercent = next === "percent";
    if (els.discountTypeInput instanceof HTMLInputElement) {
      els.discountTypeInput.value = next;
    }
    if (els.discountTypeToggle instanceof HTMLElement) {
      els.discountTypeToggle.classList.toggle("is-active", isPercent);
      els.discountTypeToggle.setAttribute(
        "aria-pressed",
        isPercent ? "true" : "false",
      );
    }
    if (els.discountTypeToggleLabel) {
      els.discountTypeToggleLabel.textContent = isPercent
        ? "Percent"
        : "Fixed price";
    }
    syncDiscountValueUi(next);
  }

  function voucherCardHtml(voucher, { preview = false } = {}) {
    const status = resolveVoucherStatus(voucher);
    const isActive = status === "active";
    const discountType = normalizeDiscountType(
      voucher.discountType ||
        (voucher.kind === "gift" || voucher.kind === "fixed" ? "fixed" : "percent"),
    );
    const kind =
      discountType === "fixed"
        ? "gift"
        : KIND_OPTIONS.some((option) => option.value === voucher.kind)
          ? voucher.kind
          : "percent";
    const discountValue = formatDiscountValue(voucher.discountValue);
    const freeShipping = isFreeShippingVoucher(voucher);
    const title =
      String(voucher.title || "").trim() ||
      discountTitle(discountType, discountValue, freeShipping) ||
      "Voucher";
    const badge = String(voucher.badge || "Sitewide").trim() || "Sitewide";
    const code = String(voucher.code || "CODE").trim().toUpperCase() || "CODE";
    const date = String(voucher.date || "—").trim() || "—";
    const minSpend = formatMinSpend(voucher.minimumSpend);
    const platform = platformLabel(voucher.platformId);
    const platformColor = resolveShopColor(voucher);
    const accentAttr = isActive ? accentStyleAttr(platformColor) : "";
    const passive = isPassiveVoucher(voucher);
    const kindForIcon = freeShipping && !discountValue ? "shipping" : kind;
    const discountLine = [
      discountValue
        ? discountType === "fixed"
          ? `₱${discountValue} off total`
          : `${discountValue}% of total`
        : freeShipping
          ? null
          : discountType === "fixed"
            ? "Fixed price off total"
            : "Percent of total",
      freeShipping ? "Free shipping" : null,
      passive ? "Passive" : null,
    ]
      .filter(Boolean)
      .join(" · ");

    const platformId = normalizePlatformId(voucher.platformId);
    const showEyebrow =
      badge && badge.toLowerCase() !== "sitewide" ? badge.toUpperCase() : "";
    const artMarkup =
      !platformId || platformId === "all"
        ? `<img class="md-account-voucher__logo" src="/switch-logo.svg" alt="" width="28" height="28" />`
        : `<span class="md-account-voucher__icon">${voucherIconSvg(kindForIcon)}</span>`;
    const freeShippingMarkup = freeShipping
      ? `<small class="md-account-voucher__shipping" aria-label="Free shipping">
            ${voucherIconSvg("shipping")}
            <span>Free shipping</span>
          </small>`
      : "";

    const promo = voucherPromoHtml(
      { ...voucher, companyLogoUrl: voucher.companyLogoUrl || resolveSellerLogoUrl() },
      { compact: !preview },
    );
    return `
      <article class="sa-voucher-card sa-voucher-card--with-promo${!isActive ? " is-muted" : ""}${preview ? " is-preview" : ""}${passive ? " is-passive" : ""}${freeShipping ? " is-free-shipping" : ""}" data-voucher-id="${escapeHtml(voucherRef(voucher))}" data-platform-id="${escapeHtml(platformId)}"${accentAttr}>
        <div class="md-account-voucher${!isActive ? " is-muted" : ""}">
          <div class="md-account-voucher__art">${artMarkup}</div>
          <div class="md-account-voucher__details">
            ${showEyebrow ? `<span class="md-account-voucher__eyebrow">${escapeHtml(showEyebrow)}</span>` : ""}
            <h3 class="md-account-voucher__title">${escapeHtml(title)}</h3>
            <span class="md-account-voucher__divider" aria-hidden="true"></span>
            <div class="md-account-voucher__perks">
              <small class="md-account-voucher__minimum">Min. spend ₱${escapeHtml(minSpend)}</small>
              ${freeShippingMarkup}
            </div>
            <div class="md-account-voucher__footer">
              <span class="md-account-voucher__code"><strong>${escapeHtml(code)}</strong></span>
              <small class="md-account-voucher__date">${
                isActive
                  ? date
                    ? `Expires ${escapeHtml(date)}`
                    : "No expiry"
                  : `${statusLabel(status)} ${escapeHtml(date)}`
              }</small>
            </div>
          </div>
        </div>
        ${preview ? "" : promo}
        ${
          preview
            ? `<div class="sa-voucher-card__meta"><span class="sa-voucher-card__platform">${escapeHtml(platform)}</span>${passive ? '<span class="sa-voucher-card__status is-passive">Passive</span>' : ""}${discountLine ? `<span class="sa-voucher-card__platform">${escapeHtml(discountLine)}</span>` : ""}</div>`
            : `<div class="sa-voucher-card__meta">
                <span class="sa-voucher-card__platform">${escapeHtml(platform)}</span>
                ${passive ? '<span class="sa-voucher-card__status is-passive">Passive</span>' : ""}
                ${voucherStatusControlHtml(voucher)}
                <button type="button" class="sa-voucher-card__delete" data-voucher-delete="${escapeHtml(voucherRef(voucher))}" aria-label="Delete ${escapeHtml(code)}">Delete</button>
              </div>`
        }
      </article>
    `;
  }

  function inventoryRowHtml(voucher) {
    const code = String(voucher.code || "").trim().toUpperCase() || "—";
    const title = String(voucher.title || "Voucher").trim() || "Voucher";
    return `
      <div class="sa-voucher-modal__inventory-row">
        <div>
          <strong>${escapeHtml(code)}</strong>
          <span>${escapeHtml(title)}</span>
        </div>
        <span class="sa-voucher-modal__inventory-platform">${escapeHtml(platformLabel(voucher.platformId))}</span>
        ${voucherStatusControlHtml(voucher)}
      </div>
    `;
  }

  function parseVoucherDateInputValue(value) {
    const match = String(value ?? "").trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    const year = Number(match[1]);
    const monthIndex = Number(match[2]) - 1;
    const day = Number(match[3]);
    const date = new Date(year, monthIndex, day);
    return date.getFullYear() === year &&
      date.getMonth() === monthIndex &&
      date.getDate() === day
      ? date
      : null;
  }

  function formatVoucherDateInputValue(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function formatVoucherDateDisplay(value) {
    const date = value instanceof Date ? value : parseVoucherDateInputValue(value);
    if (!(date instanceof Date)) return "--.--";
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  }

  function isSameVoucherCalendarDay(left, right) {
    return (
      left instanceof Date &&
      right instanceof Date &&
      left.getFullYear() === right.getFullYear() &&
      left.getMonth() === right.getMonth() &&
      left.getDate() === right.getDate()
    );
  }

  function isVoucherDateInPast(value) {
    const parsedDate =
      value instanceof Date ? value : parseVoucherDateInputValue(value);
    if (!(parsedDate instanceof Date)) return false;
    const today = new Date();
    const expiryDay = Date.UTC(
      parsedDate.getFullYear(),
      parsedDate.getMonth(),
      parsedDate.getDate(),
    );
    const todayStart = Date.UTC(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
    return expiryDay < todayStart;
  }

  function getVoucherDateCalendarElements() {
    if (!(state.dateCalendar instanceof HTMLElement)) return null;
    return {
      month: state.dateCalendar.querySelector("[data-voucher-date-calendar-month]"),
      days: state.dateCalendar.querySelector("[data-voucher-date-calendar-days]"),
      previous: state.dateCalendar.querySelector(
        "[data-voucher-date-calendar-previous]",
      ),
      next: state.dateCalendar.querySelector("[data-voucher-date-calendar-next]"),
      today: state.dateCalendar.querySelector("[data-voucher-date-calendar-today]"),
      clear: state.dateCalendar.querySelector("[data-voucher-date-calendar-clear]"),
      apply: state.dateCalendar.querySelector("[data-voucher-date-calendar-apply]"),
    };
  }

  function syncVoucherDateTrigger() {
    refreshElements();
    const value = String(els.dateInput?.value ?? "").trim();
    const hasValue = Boolean(parseVoucherDateInputValue(value));
    if (els.dateValue) {
      els.dateValue.textContent = formatVoucherDateDisplay(value);
    }
    if (els.dateTrigger instanceof HTMLButtonElement) {
      els.dateTrigger.classList.toggle("is-empty", !hasValue);
      els.dateTrigger.setAttribute(
        "aria-label",
        hasValue
          ? `End date ${formatVoucherDateDisplay(value)}. Open calendar.`
          : "Select end date",
      );
    }
    els.datePicker?.classList.toggle("has-expiry-date", hasValue);
    const calendarClear = state.dateCalendar?.querySelector?.(
      "[data-voucher-date-calendar-clear]",
    );
    if (calendarClear instanceof HTMLButtonElement) {
      calendarClear.hidden = !hasValue;
    }
  }

  function clearVoucherDate({ restoreFocus = true } = {}) {
    refreshElements();
    if (!(els.dateInput instanceof HTMLInputElement)) return;
    els.dateInput.value = "";
    syncVoucherDateTrigger();
    els.dateInput.dispatchEvent(new Event("input", { bubbles: true }));
    els.dateInput.dispatchEvent(new Event("change", { bubbles: true }));
    setVoucherDateCalendarOpen(false, { restoreFocus: false });
    if (restoreFocus && els.dateTrigger instanceof HTMLButtonElement) {
      els.dateTrigger.focus();
    }
  }

  function renderVoucherDateCalendar() {
    const elements = getVoucherDateCalendarElements();
    if (
      !elements ||
      !(elements.month instanceof HTMLElement) ||
      !(elements.days instanceof HTMLElement)
    ) {
      return;
    }
    refreshElements();
    const committedDate = parseVoucherDateInputValue(els.dateInput?.value);
    const selectedDate =
      state.dateDraft instanceof Date ? state.dateDraft : committedDate;
    const today = new Date();
    const viewMonth =
      state.dateViewMonth instanceof Date
        ? state.dateViewMonth
        : new Date(
            (selectedDate ?? today).getFullYear(),
            (selectedDate ?? today).getMonth(),
            1,
          );
    state.dateViewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
    elements.month.textContent = new Intl.DateTimeFormat("en-US", {
      month: "long",
      year: "numeric",
    }).format(state.dateViewMonth);
    elements.days.replaceChildren();

    const firstVisibleDay = new Date(
      state.dateViewMonth.getFullYear(),
      state.dateViewMonth.getMonth(),
      1 - state.dateViewMonth.getDay(),
    );
    const daysInViewMonth = new Date(
      state.dateViewMonth.getFullYear(),
      state.dateViewMonth.getMonth() + 1,
      0,
    ).getDate();
    const visibleDayCount = Math.max(
      35,
      Math.ceil((state.dateViewMonth.getDay() + daysInViewMonth) / 7) * 7,
    );

    for (let index = 0; index < visibleDayCount; index += 1) {
      const dayDate = new Date(
        firstVisibleDay.getFullYear(),
        firstVisibleDay.getMonth(),
        firstVisibleDay.getDate() + index,
      );
      const dayButton = document.createElement("button");
      dayButton.type = "button";
      dayButton.className = "product-expiry-calendar__day";
      dayButton.textContent = String(dayDate.getDate());
      dayButton.dataset.date = formatVoucherDateInputValue(dayDate);
      dayButton.setAttribute(
        "aria-label",
        new Intl.DateTimeFormat("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        }).format(dayDate),
      );
      if (dayDate.getMonth() !== state.dateViewMonth.getMonth()) {
        dayButton.classList.add("is-outside-month");
      }
      if (isSameVoucherCalendarDay(dayDate, today)) {
        dayButton.classList.add("is-today");
      }
      if (isSameVoucherCalendarDay(dayDate, selectedDate)) {
        dayButton.classList.add("is-selected");
        dayButton.setAttribute("aria-selected", "true");
      }
      if (isVoucherDateInPast(dayDate)) {
        dayButton.classList.add("is-expired");
      }
      dayButton.addEventListener("click", () => {
        state.dateDraft = dayDate;
        renderVoucherDateCalendar();
      });
      elements.days.appendChild(dayButton);
    }

    if (elements.clear instanceof HTMLButtonElement) {
      elements.clear.hidden = !committedDate;
    }
    if (elements.apply instanceof HTMLButtonElement) {
      elements.apply.disabled = !(state.dateDraft instanceof Date);
    }
  }

  function positionVoucherDateCalendar() {
    if (
      !(state.dateCalendar instanceof HTMLElement) ||
      state.dateCalendar.hidden ||
      !(els.dateTrigger instanceof HTMLElement)
    ) {
      return;
    }
    const triggerRect = els.dateTrigger.getBoundingClientRect();
    const panelRect = state.dateCalendar.getBoundingClientRect();
    const viewportPadding = 12;
    const panelGap = 13;
    const panelWidth = panelRect.width;
    const panelHeight = panelRect.height;
    const preferredLeft = triggerRect.right - panelWidth;
    const maxLeft = Math.max(
      viewportPadding,
      window.innerWidth - panelWidth - viewportPadding,
    );
    const left = Math.min(Math.max(viewportPadding, preferredLeft), maxLeft);
    let top = triggerRect.bottom + panelGap;
    let opensUp = false;
    if (top + panelHeight > window.innerHeight - viewportPadding) {
      const upwardTop = triggerRect.top - panelHeight - panelGap;
      if (upwardTop >= viewportPadding) {
        top = upwardTop;
        opensUp = true;
      } else {
        top = Math.max(
          viewportPadding,
          window.innerHeight - panelHeight - viewportPadding,
        );
      }
    }
    const triggerCenter = triggerRect.left + triggerRect.width / 2;
    const arrowLeft = Math.min(
      Math.max(22, triggerCenter - left),
      panelWidth - 22,
    );
    state.dateCalendar.classList.toggle("is-open-up", opensUp);
    state.dateCalendar.style.left = `${Math.round(left)}px`;
    state.dateCalendar.style.top = `${Math.round(top)}px`;
    state.dateCalendar.style.setProperty(
      "--product-expiry-calendar-arrow-left",
      `${Math.round(arrowLeft)}px`,
    );
  }

  function requestVoucherDateCalendarPosition() {
    if (state.datePositionFrame) return;
    state.datePositionFrame = window.requestAnimationFrame(() => {
      state.datePositionFrame = 0;
      positionVoucherDateCalendar();
    });
  }

  function ensureVoucherDateCalendar() {
    if (state.dateCalendar instanceof HTMLElement) return state.dateCalendar;
    refreshElements();
    if (!(els.datePicker instanceof HTMLElement)) return null;

    const panel = document.createElement("div");
    panel.id = "voucher-date-calendar";
    panel.className = "product-expiry-calendar sa-voucher-date-calendar has-apply";
    panel.hidden = true;
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Choose expiry date");
    panel.innerHTML = `
      <div class="product-expiry-calendar__header">
        <button type="button" class="product-expiry-calendar__nav" data-voucher-date-calendar-previous aria-label="Previous month">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>
        </button>
        <strong class="product-expiry-calendar__month" data-voucher-date-calendar-month></strong>
        <button type="button" class="product-expiry-calendar__nav" data-voucher-date-calendar-next aria-label="Next month">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"></path></svg>
        </button>
      </div>
      <div class="product-expiry-calendar__weekdays" aria-hidden="true">
        ${["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]
          .map(
            (weekday) =>
              `<span class="product-expiry-calendar__weekday">${weekday}</span>`,
          )
          .join("")}
      </div>
      <div class="product-expiry-calendar__days" role="grid" data-voucher-date-calendar-days></div>
      <div class="product-expiry-calendar__footer">
        <button type="button" class="product-expiry-calendar__clear" data-voucher-date-calendar-clear hidden aria-label="Remove expiry date" title="Remove date">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M18 6 6 18"/>
            <path d="m6 6 12 12"/>
          </svg>
          <span>Remove date</span>
        </button>
        <button type="button" class="product-expiry-calendar__today" data-voucher-date-calendar-today>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M8 2v4"></path><path d="M16 2v4"></path><rect width="18" height="18" x="3" y="4" rx="2"></rect><path d="M3 10h18"></path><path d="M8 14h.01"></path><path d="M12 14h.01"></path><path d="M16 14h.01"></path><path d="M8 18h.01"></path><path d="M12 18h.01"></path>
          </svg>
          <span>Today</span>
        </button>
        <button type="button" class="product-expiry-calendar__apply" data-voucher-date-calendar-apply>
          Apply
        </button>
      </div>
    `;
    document.body.appendChild(panel);
    state.dateCalendar = panel;

    const elements = getVoucherDateCalendarElements();
    elements?.previous?.addEventListener("click", () => {
      const viewMonth = state.dateViewMonth ?? new Date();
      state.dateViewMonth = new Date(
        viewMonth.getFullYear(),
        viewMonth.getMonth() - 1,
        1,
      );
      renderVoucherDateCalendar();
      requestVoucherDateCalendarPosition();
    });
    elements?.next?.addEventListener("click", () => {
      const viewMonth = state.dateViewMonth ?? new Date();
      state.dateViewMonth = new Date(
        viewMonth.getFullYear(),
        viewMonth.getMonth() + 1,
        1,
      );
      renderVoucherDateCalendar();
      requestVoucherDateCalendarPosition();
    });
    elements?.today?.addEventListener("click", () => {
      state.dateDraft = new Date();
      renderVoucherDateCalendar();
    });
    elements?.apply?.addEventListener("click", () => {
      applyVoucherDate();
    });
    elements?.clear?.addEventListener("click", () => {
      clearVoucherDate({ restoreFocus: true });
    });

    return panel;
  }

  function setVoucherDateCalendarOpen(isOpen, { restoreFocus = false } = {}) {
    refreshElements();
    if (
      !(els.datePicker instanceof HTMLElement) ||
      !(els.dateTrigger instanceof HTMLButtonElement)
    ) {
      return;
    }
    const panel = ensureVoucherDateCalendar();
    if (!(panel instanceof HTMLElement)) return;

    const nextIsOpen = Boolean(isOpen);
    panel.hidden = !nextIsOpen;
    els.datePicker.classList.toggle("is-open", nextIsOpen);
    els.dateTrigger.setAttribute("aria-expanded", nextIsOpen ? "true" : "false");

    if (nextIsOpen) {
      state.dateDraft = parseVoucherDateInputValue(els.dateInput?.value);
      const selectedDate = state.dateDraft ?? new Date();
      state.dateViewMonth = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        1,
      );
      renderVoucherDateCalendar();
      requestVoucherDateCalendarPosition();
      window.requestAnimationFrame(() => {
        const preferredDay = panel.querySelector(
          ".product-expiry-calendar__day.is-selected, .product-expiry-calendar__day.is-today",
        );
        preferredDay?.focus?.({ preventScroll: true });
      });
      return;
    }

    if (restoreFocus && els.dateTrigger instanceof HTMLButtonElement) {
      els.dateTrigger.focus({ preventScroll: true });
    }
  }

  function setVoucherDate(date) {
    refreshElements();
    if (!(els.dateInput instanceof HTMLInputElement) || !(date instanceof Date)) {
      return false;
    }
    els.dateInput.value = formatVoucherDateInputValue(date);
    syncVoucherDateTrigger();
    els.dateInput.dispatchEvent(new Event("input", { bubbles: true }));
    els.dateInput.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  function applyVoucherDate() {
    const date = state.dateDraft instanceof Date ? state.dateDraft : null;
    if (!date || !setVoucherDate(date)) return;
    setVoucherDateCalendarOpen(false, { restoreFocus: true });
  }

  function initializeVoucherDatePicker() {
    refreshElements();
    if (
      !(els.datePicker instanceof HTMLElement) ||
      !(els.dateInput instanceof HTMLInputElement) ||
      !(els.dateTrigger instanceof HTMLButtonElement)
    ) {
      syncVoucherDateTrigger();
      return;
    }
    if (state.datePickerBound) {
      syncVoucherDateTrigger();
      return;
    }
    state.datePickerBound = true;
    syncVoucherDateTrigger();

    els.dateTrigger.addEventListener("click", () => {
      refreshElements();
      setVoucherDateCalendarOpen(
        els.dateTrigger?.getAttribute("aria-expanded") !== "true",
      );
    });
    els.dateTrigger.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setVoucherDateCalendarOpen(true);
      }
    });
    els.dateInput.addEventListener("change", () => {
      syncVoucherDateTrigger();
      if (state.dateCalendar && !state.dateCalendar.hidden) {
        renderVoucherDateCalendar();
      }
    });
    document.addEventListener("click", (event) => {
      if (
        state.dateCalendar?.hidden !== false ||
        !(event.target instanceof Node) ||
        els.datePicker?.contains(event.target) ||
        state.dateCalendar.contains(event.target)
      ) {
        return;
      }
      setVoucherDateCalendarOpen(false);
    });
    document.addEventListener(
      "scroll",
      (event) => {
        if (state.dateCalendar?.hidden !== false) return;
        const target = event.target;
        if (target instanceof Node && state.dateCalendar.contains(target)) return;
        setVoucherDateCalendarOpen(false);
      },
      true,
    );
    window.addEventListener("resize", requestVoucherDateCalendarPosition);
  }

  function readFormValues() {
    const discountType = normalizeDiscountType(els.discountTypeInput?.value);
    const discountValue = formatDiscountValue(els.discountValueInput?.value);
    const freeShipping = Boolean(els.freeShippingInput?.checked);
    const rawDate = String(els.dateInput?.value || "").trim();
    const parsedDate = parseVoucherDateInputValue(rawDate);
    const kind =
      freeShipping && !discountValue
        ? "shipping"
        : discountType === "fixed"
          ? "gift"
          : "percent";
    return {
      title: String(els.titleInput?.value || "").trim(),
      subtitle: discountSubtitle(discountType, discountValue, freeShipping),
      code: String(els.codeInput?.value || "").trim().toUpperCase(),
      badge: resolveStoreBadge(),
      minimumSpend: formatMinSpend(els.minSpendInput?.value),
      usesPerAccount: Number(formatUsesPerAccount(els.usesPerAccountInput?.value)),
      date: parsedDate ? formatVoucherDateDisplay(parsedDate) : "",
      note: "A deal\nfor you!",
      kind,
      action: "useNow",
      discountType,
      discountValue,
      freeShipping,
      // Store vouchers are seller-scoped; platform is not seller-controlled.
      platformId: "all",
      passive: Boolean(els.passiveInput?.checked),
      repeatWeekly: Boolean(els.repeatInput?.checked),
      repeatDays: Boolean(els.repeatInput?.checked) ? readRepeatDays() : [],
      repeatStartTime: Boolean(els.repeatInput?.checked)
        ? formatRepeatTime(els.repeatStartTimeInput?.value)
        : "",
      repeatEndTime: Boolean(els.repeatInput?.checked)
        ? formatRepeatTime(els.repeatEndTimeInput?.value)
        : "",
      status: "active",
      cardColor: setCardColor(state.cardColor || els.colorInput?.value),
      companyLogoUrl: resolveSellerLogoUrl(),
    };
  }

  function updatePreview() {
    refreshElements();
    if (!(els.preview instanceof HTMLElement)) return;
    const values = readFormValues();
    applyModalPlatformTheme(resolveShopPlatformId(values));
    if (els.promoPreview instanceof HTMLElement) {
      els.promoPreview.innerHTML = "";
    }
    els.preview.innerHTML = voucherCardHtml(values, { preview: true });
    tickVoucherCountdowns();
    window.requestAnimationFrame(() => syncVoucherBrandWrap(els.preview));
  }

  function renderInventory() {
    refreshElements();
    if (els.inventoryTotal) {
      els.inventoryTotal.textContent = `(${state.items.length})`;
    }
    if (!(els.inventoryList instanceof HTMLElement)) return;
    if (!state.items.length) {
      els.inventoryList.innerHTML = '<div class="empty-state">No vouchers yet.</div>';
      return;
    }
    els.inventoryList.innerHTML = state.items.map(inventoryRowHtml).join("");
  }

  function renderList() {
    refreshElements();
    if (!(els.list instanceof HTMLElement)) return;
    if (els.total) {
      els.total.textContent = `(${state.items.length})`;
    }
    renderInventory();
    if (!state.items.length) {
      els.list.innerHTML =
        '<div class="empty-state">No store vouchers yet. Create one for buyers checking out from your listings.</div>';
      return;
    }
    els.list.innerHTML = state.items.map((voucher) => voucherCardHtml(voucher)).join("");
    startVoucherCountdowns();
  }

  function openModal() {
    refreshElements();
    state.voucherModalTrigger =
      document.activeElement instanceof HTMLElement ? document.activeElement : els.addButton;
    if (state.closeTimer) {
      window.clearTimeout(state.closeTimer);
      state.closeTimer = 0;
    }
    if (els.form instanceof HTMLFormElement) els.form.reset();
    setPassiveToggle(false);
    setRepeatWeeklyToggle(false);
    setFreeShippingToggle(false);
    setDiscountTypeToggle("percent");
    if (els.discountValueInput) els.discountValueInput.value = "20";
    if (els.usesPerAccountInput) els.usesPerAccountInput.value = "1";
    setCardColor(DEFAULT_VOUCHER_CARD_COLOR);
    if (els.dateInput) {
      els.dateInput.value = "";
    }
    syncVoucherDateTrigger();
    setVoucherDateCalendarOpen(false);
    setModalFeedback("");
    renderInventory();
    updatePreview();
    if (!(els.modalOverlay instanceof HTMLElement)) {
      setPageFeedback("Voucher create dialog is missing. Refresh the page.", "error");
      return;
    }
    els.modalOverlay.hidden = false;
    els.modalOverlay.setAttribute("aria-hidden", "false");
    els.addButton?.setAttribute("aria-expanded", "true");
    document.body.classList.add("modal-open", "seller-voucher-modal-open");
    window.requestAnimationFrame(() => {
      els.modalOverlay?.classList.add("is-open");
      els.codeInput?.focus();
    });
    applyModalPlatformTheme(resolveShopPlatformId());
  }

  function closeModal() {
    refreshElements();
    if (!(els.modalOverlay instanceof HTMLElement)) return;
    setVoucherDateCalendarOpen(false);
    els.modalOverlay.classList.remove("is-open");
    els.modalOverlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open", "seller-voucher-modal-open");
    els.addButton?.setAttribute("aria-expanded", "false");
    setModalFeedback("");
    const trigger = state.voucherModalTrigger || els.addButton;
    state.voucherModalTrigger = null;
    if (state.closeTimer) {
      window.clearTimeout(state.closeTimer);
    }
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

  async function createVoucher(event) {
    event.preventDefault();
    refreshElements();
    if (state.saving) return;
    const payload = readFormValues();
    if (!payload.title || !payload.code) {
      setModalFeedback("Title and code are required.", "error");
      return;
    }
    if (payload.repeatWeekly) {
      if (!payload.repeatDays.length) {
        setModalFeedback("Select at least one weekday.", "error");
        els.repeatDaysToggle?.focus();
        return;
      }
      if (!payload.repeatStartTime) {
        setModalFeedback("Set the weekly start time.", "error");
        els.repeatStartTimeInput?.focus();
        return;
      }
      if (payload.repeatEndTime && payload.repeatStartTime === payload.repeatEndTime) {
        setModalFeedback("Weekly end time must be different from the start time.", "error");
        els.repeatEndTimeInput?.focus();
        return;
      }
    }
    if (!payload.discountValue && !payload.freeShipping) {
      setModalFeedback(
        payload.discountType === "fixed"
          ? "Enter the fixed price amount, or turn on Free shipping."
          : "Enter the percent of total purchase, or turn on Free shipping.",
        "error",
      );
      els.discountValueInput?.focus();
      return;
    }
    if (
      payload.discountValue &&
      payload.discountType === "percent" &&
      Number(payload.discountValue) > 100
    ) {
      setModalFeedback("Percent of total purchase cannot exceed 100.", "error");
      els.discountValueInput?.focus();
      return;
    }
    state.saving = true;
    if (els.submitButton) els.submitButton.disabled = true;
    setModalFeedback("Creating voucher…", "notice");
    try {
      const response = await fetch("/api/admin/vouchers", {
        method: "POST",
        headers: headers({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.message || "Unable to create voucher.");
      }
      state.items = Array.isArray(body.vouchers) ? body.vouchers : state.items;
      renderList();
      closeModal();
      setPageFeedback(body.message || "Voucher created.", "success");
    } catch (error) {
      setModalFeedback(
        error instanceof Error ? error.message : "Unable to create voucher.",
        "error",
      );
    } finally {
      state.saving = false;
      if (els.submitButton) els.submitButton.disabled = false;
    }
  }

  async function deleteVoucher(voucherId) {
    const voucher = state.items.find((entry) => voucherRef(entry) === String(voucherId || "").trim());
    if (!voucher) return;
    if (!window.confirm(`Delete voucher “${voucher.code}”?`)) return;
    try {
      const response = await fetch(
        `/api/admin/vouchers/${encodeURIComponent(voucherRef(voucher) || voucherId)}`,
        {
          method: "DELETE",
          headers: headers(),
        },
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.message || "Unable to delete voucher.");
      }
      state.items = Array.isArray(body.vouchers)
        ? body.vouchers
        : state.items.filter((entry) => voucherRef(entry) !== String(voucherId || "").trim());
      renderList();
      setPageFeedback(body.message || "Voucher deleted.", "success");
    } catch (error) {
      setPageFeedback(
        error instanceof Error ? error.message : "Unable to delete voucher.",
        "error",
      );
    }
  }

  async function load({ quiet = false } = {}) {
    refreshElements();
    if (state.loading) return;
    state.loading = true;
    if (els.list instanceof HTMLElement && !quiet) {
      els.list.innerHTML = '<div class="empty-state">Loading vouchers…</div>';
    }
    try {
      await loadPlatforms();
      const response = await fetch("/api/admin/vouchers", {
        headers: headers(),
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message || "Unable to load vouchers.");
      }
      state.items = Array.isArray(payload.vouchers) ? payload.vouchers : [];
      renderList();
    } catch (error) {
      if (els.list instanceof HTMLElement) {
        els.list.innerHTML = `<div class="empty-state">${escapeHtml(
          error instanceof Error ? error.message : "Unable to load vouchers.",
        )}</div>`;
      }
      if (!quiet) {
        setPageFeedback(
          error instanceof Error ? error.message : "Unable to load vouchers.",
          "error",
        );
      }
    } finally {
      state.loading = false;
    }
  }

  function bind() {
    refreshElements();
    if (state.bound) return;
    state.bound = true;
    initializeVoucherDatePicker();
    renderCardColorSwatches();
    setCardColor(els.colorInput?.value || DEFAULT_VOUCHER_CARD_COLOR);
    startVoucherCountdowns();

    document.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;
      const colorSwatch = target.closest("#seller-voucher-modal [data-voucher-color-swatch]");
      if (colorSwatch) {
        event.preventDefault();
        setCardColor(colorSwatch.getAttribute("data-voucher-color-swatch"));
        updatePreview();
        return;
      }
      if (target.closest("[data-seller-admin-voucher-add]")) {
        event.preventDefault();
        openModal();
        return;
      }
      if (
        target.closest(
          "#seller-voucher-modal-close-button, #seller-voucher-modal-cancel-button",
        )
      ) {
        event.preventDefault();
        closeModal();
        return;
      }
      if (target.closest("#seller-voucher-repeat-toggle")) {
        event.preventDefault();
        refreshElements();
        const next = !(els.repeatInput instanceof HTMLInputElement
          ? els.repeatInput.checked
          : false);
        setRepeatWeeklyToggle(next);
        return;
      }
      if (target.closest("#seller-voucher-repeat-days-toggle")) {
        event.preventDefault();
        refreshElements();
        const isOpen = els.repeatDaysMenu instanceof HTMLElement && !els.repeatDaysMenu.hidden;
        setRepeatDaysMenuOpen(!isOpen);
        return;
      }
      const repeatDayButton = target.closest("#seller-voucher-repeat-days-menu [data-repeat-day]");
      if (repeatDayButton) {
        event.preventDefault();
        toggleRepeatDay(repeatDayButton.getAttribute("data-repeat-day"));
        return;
      }
      if (!target.closest("#seller-voucher-modal [data-seller-voucher-choice='repeat-days']")) {
        setRepeatDaysMenuOpen(false);
      }
      if (target.closest("#seller-voucher-passive-toggle")) {
        event.preventDefault();
        refreshElements();
        const next = !(els.passiveInput instanceof HTMLInputElement
          ? els.passiveInput.checked
          : false);
        setPassiveToggle(next);
        updatePreview();
        return;
      }
      if (target.closest("#seller-voucher-free-shipping-toggle")) {
        event.preventDefault();
        refreshElements();
        const next = !(els.freeShippingInput instanceof HTMLInputElement
          ? els.freeShippingInput.checked
          : false);
        setFreeShippingToggle(next);
        updatePreview();
        return;
      }
      if (target.closest("#seller-voucher-discount-type-toggle")) {
        event.preventDefault();
        refreshElements();
        const current = normalizeDiscountType(els.discountTypeInput?.value);
        setDiscountTypeToggle(current === "percent" ? "fixed" : "percent");
        updatePreview();
        return;
      }
      if (target.id === "seller-voucher-modal-overlay") {
        closeModal();
        return;
      }
      const inactiveToggle = target.closest("[data-voucher-inactive-toggle]");
      if (inactiveToggle) {
        event.preventDefault();
        event.stopPropagation();
        const wrap = inactiveToggle.closest(".sa-voucher-card__activity");
        const isOpen = wrap?.classList.contains("is-open");
        setVoucherInactiveMenuOpen(wrap, !isOpen);
        return;
      }
      if (!target.closest(".sa-voucher-card__activity")) {
        closeVoucherInactiveMenus();
      }
      const deleteButton = target.closest("[data-voucher-delete]");
      if (deleteButton) {
        const voucherId = deleteButton.getAttribute("data-voucher-delete") || "";
        if (voucherId) void deleteVoucher(voucherId);
      }
    });

    document.addEventListener("submit", (event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || form.id !== "seller-voucher-modal-form") {
        return;
      }
      void createVoucher(event);
    });

    document.addEventListener("input", (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const form = target?.closest("#seller-voucher-modal-form");
      if (!form) return;
      if (target.id === "seller-voucher-card-color-input") {
        setCardColor(target instanceof HTMLInputElement ? target.value : "");
      }
      updatePreview();
    });
    document.addEventListener("change", (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const form = target?.closest("#seller-voucher-modal-form");
      if (!form) return;
      if (target.id === "seller-voucher-card-color-input") {
        setCardColor(target instanceof HTMLInputElement ? target.value : "");
      }
      updatePreview();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      if (state.dateCalendar?.hidden === false) {
        event.preventDefault();
        setVoucherDateCalendarOpen(false, { restoreFocus: true });
        return;
      }
      refreshElements();
      if (els.modalOverlay && !els.modalOverlay.hidden) {
        event.preventDefault();
        closeModal();
      }
    });
  }

  window.SellerAdminVouchers = {
    load,
    bind,
    openModal,
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
