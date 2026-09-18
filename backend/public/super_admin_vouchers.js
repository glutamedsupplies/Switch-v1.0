(() => {
  const KIND_OPTIONS = [
    { value: "percent", label: "Percent off" },
    { value: "gift", label: "Fixed amount" },
    { value: "shipping", label: "Free shipping" },
    { value: "shopping", label: "Buy 1 Get 1" },
    { value: "loyalty", label: "Loyalty" },
    { value: "ticket", label: "General ticket" },
  ];

  const FALLBACK_PLATFORMS = [
    { id: "shop", name: "Shop", status: "active", primaryColor: "#0891b2" },
    { id: "food", name: "Food", status: "active", primaryColor: "#ea580c" },
    { id: "hotels", name: "Hotel", status: "active", primaryColor: "#7c3aed" },
    { id: "resort", name: "Resort", status: "active", primaryColor: "#0891b2" },
  ];

  const DEFAULT_PLATFORM_COLORS = Object.freeze({
    shop: "#0891b2",
    food: "#ea580c",
    hotels: "#7c3aed",
    resort: "#0891b2",
  });

  const els = {
    list: document.querySelector("[data-super-admin-vouchers-list]"),
    total: document.querySelector("[data-super-admin-vouchers-total]"),
    addButton: document.querySelector("[data-super-admin-voucher-add]"),
    modalOverlay: document.getElementById("voucher-modal-overlay"),
    modal: document.getElementById("voucher-modal"),
    form: document.getElementById("voucher-modal-form"),
    closeButton: document.getElementById("voucher-modal-close-button"),
    cancelButton: document.getElementById("voucher-modal-cancel-button"),
    submitButton: document.getElementById("voucher-modal-submit-button"),
    feedback: document.querySelector("[data-voucher-modal-feedback]"),
    preview: document.querySelector("[data-voucher-modal-preview]"),
    inventoryTotal: document.querySelector("[data-voucher-modal-inventory-total]"),
    inventoryList: document.querySelector("[data-voucher-modal-inventory-list]"),
    titleInput: document.getElementById("voucher-title-input"),
    codeInput: document.getElementById("voucher-code-input"),
    discountTypeInput: document.getElementById("voucher-discount-type-input"),
    discountTypeToggle: document.getElementById("voucher-discount-type-toggle"),
    discountTypeToggleLabel: document.getElementById(
      "voucher-discount-type-toggle-label",
    ),
    discountValueInput: document.getElementById("voucher-discount-value-input"),
    discountValueLabel: document.getElementById("voucher-discount-value-label"),
    discountValueHelper: document.getElementById("voucher-discount-value-helper"),
    freeShippingInput: document.getElementById("voucher-free-shipping-input"),
    freeShippingToggle: document.getElementById("voucher-free-shipping-toggle"),
    freeShippingToggleLabel: document.getElementById(
      "voucher-free-shipping-toggle-label",
    ),
    minSpendInput: document.getElementById("voucher-min-spend-input"),
    passiveInput: document.getElementById("voucher-passive-input"),
    passiveToggle: document.getElementById("voucher-passive-toggle"),
    passiveToggleLabel: document.getElementById("voucher-passive-toggle-label"),
    datePicker: document.getElementById("voucher-date-picker"),
    dateInput: document.getElementById("voucher-date-input"),
    dateTrigger: document.getElementById("voucher-date-trigger"),
    dateValue: document.querySelector("[data-voucher-date-value]"),
    platformSelect: document.getElementById("voucher-platform-select"),
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
    datePositionFrame: 0,
    datePickerBound: false,
  };

  function refreshElements() {
    els.list = document.querySelector("[data-super-admin-vouchers-list]");
    els.total = document.querySelector("[data-super-admin-vouchers-total]");
    els.addButton = document.querySelector("[data-super-admin-voucher-add]");
    els.modalOverlay = document.getElementById("voucher-modal-overlay");
    els.modal = document.getElementById("voucher-modal");
    els.form = document.getElementById("voucher-modal-form");
    els.closeButton = document.getElementById("voucher-modal-close-button");
    els.cancelButton = document.getElementById("voucher-modal-cancel-button");
    els.submitButton = document.getElementById("voucher-modal-submit-button");
    els.feedback = document.querySelector("[data-voucher-modal-feedback]");
    els.preview = document.querySelector("[data-voucher-modal-preview]");
    els.inventoryTotal = document.querySelector("[data-voucher-modal-inventory-total]");
    els.inventoryList = document.querySelector("[data-voucher-modal-inventory-list]");
    els.titleInput = document.getElementById("voucher-title-input");
    els.codeInput = document.getElementById("voucher-code-input");
    els.discountTypeInput = document.getElementById("voucher-discount-type-input");
    els.discountTypeToggle = document.getElementById("voucher-discount-type-toggle");
    els.discountTypeToggleLabel = document.getElementById(
      "voucher-discount-type-toggle-label",
    );
    els.discountValueInput = document.getElementById("voucher-discount-value-input");
    els.discountValueLabel = document.getElementById("voucher-discount-value-label");
    els.discountValueHelper = document.getElementById(
      "voucher-discount-value-helper",
    );
    els.freeShippingInput = document.getElementById("voucher-free-shipping-input");
    els.freeShippingToggle = document.getElementById("voucher-free-shipping-toggle");
    els.freeShippingToggleLabel = document.getElementById(
      "voucher-free-shipping-toggle-label",
    );
    els.minSpendInput = document.getElementById("voucher-min-spend-input");
    els.passiveInput = document.getElementById("voucher-passive-input");
    els.passiveToggle = document.getElementById("voucher-passive-toggle");
    els.passiveToggleLabel = document.getElementById("voucher-passive-toggle-label");
    els.datePicker = document.getElementById("voucher-date-picker");
    els.dateInput = document.getElementById("voucher-date-input");
    els.dateTrigger = document.getElementById("voucher-date-trigger");
    els.dateValue = document.querySelector("[data-voucher-date-value]");
    els.platformSelect = document.getElementById("voucher-platform-select");
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
    const id =
      normalizePlatformId(platformId) ||
      normalizePlatformId(els.platformSelect?.value) ||
      "shop";
    const hex = resolvePlatformPrimaryColor(id);
    applyAccentVars(els.modal, hex);
    applyAccentVars(els.preview, hex);
  }

  function platformLabel(platformId) {
    const id = normalizePlatformId(platformId);
    if (!id || id === "all") return "All platforms";
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
    const allOption = document.createElement("option");
    allOption.value = "all";
    allOption.textContent = "All platforms";
    select.append(allOption);
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
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[kind] || icons.ticket}</svg>`;
  }

  function noteHtml(note) {
    return escapeHtml(note).replace(/\n/g, "<br>");
  }

  function formatMinSpend(value) {
    const digits = String(value ?? "").replace(/[^\d]/g, "");
    return digits || "0";
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
    return "Active";
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
    const status = ["active", "used", "expired"].includes(voucher.status)
      ? voucher.status
      : "active";
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
    const platformColor = resolvePlatformPrimaryColor(voucher.platformId);
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
      ? `<div class="sa-voucher-card__free-shipping" aria-label="Free shipping">
            ${voucherIconSvg("shipping")}
            <span>Free shipping</span>
          </div>`
      : "";

    return `
      <article class="sa-voucher-card${!isActive ? " is-muted" : ""}${preview ? " is-preview" : ""}${passive ? " is-passive" : ""}${freeShipping ? " is-free-shipping" : ""}" data-voucher-id="${escapeHtml(voucher.id || "")}" data-platform-id="${escapeHtml(platformId)}"${accentAttr}>
        <div class="md-account-voucher${!isActive ? " is-muted" : ""}">
          <div class="md-account-voucher__art">${artMarkup}</div>
          <div class="md-account-voucher__details">
            ${showEyebrow ? `<span class="md-account-voucher__eyebrow">${escapeHtml(showEyebrow)}</span>` : ""}
            <h3 class="md-account-voucher__title">${escapeHtml(title)}</h3>
            <span class="md-account-voucher__divider" aria-hidden="true"></span>
            <small class="md-account-voucher__minimum">Min. spend ₱${escapeHtml(minSpend)}</small>
            <div class="md-account-voucher__footer">
              <span class="md-account-voucher__code"><strong>${escapeHtml(code)}</strong></span>
              <small class="md-account-voucher__date">${isActive ? "Expires" : statusLabel(status)} ${escapeHtml(date)}</small>
            </div>
          </div>
        </div>
        ${freeShippingMarkup}
        ${
          preview
            ? `<div class="sa-voucher-card__meta"><span class="sa-voucher-card__platform">${escapeHtml(platform)}</span>${passive ? '<span class="sa-voucher-card__status is-passive">Passive</span>' : ""}${discountLine ? `<span class="sa-voucher-card__platform">${escapeHtml(discountLine)}</span>` : ""}</div>`
            : `<div class="sa-voucher-card__meta">
                <span class="sa-voucher-card__platform">${escapeHtml(platform)}</span>
                ${voucher.sellerAdminId ? '<span class="sa-voucher-card__status is-store">Store</span>' : ""}
                ${passive ? '<span class="sa-voucher-card__status is-passive">Passive</span>' : ""}
                <span class="sa-voucher-card__status is-${escapeHtml(status)}">${escapeHtml(statusLabel(status))}</span>
                <button type="button" class="sa-voucher-card__delete" data-voucher-delete="${escapeHtml(voucher.id || "")}" aria-label="Delete ${escapeHtml(code)}">Delete</button>
              </div>`
        }
      </article>
    `;
  }

  function inventoryRowHtml(voucher) {
    const status = ["active", "used", "expired"].includes(voucher.status)
      ? voucher.status
      : "active";
    const code = String(voucher.code || "").trim().toUpperCase() || "—";
    const title = String(voucher.title || "Voucher").trim() || "Voucher";
    return `
      <div class="sa-voucher-modal__inventory-row">
        <div>
          <strong>${escapeHtml(code)}</strong>
          <span>${escapeHtml(title)}</span>
        </div>
        <span class="sa-voucher-modal__inventory-platform">${escapeHtml(platformLabel(voucher.platformId))}</span>
        <span class="sa-voucher-card__status is-${escapeHtml(status)}">${escapeHtml(statusLabel(status))}</span>
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
    if (!(date instanceof Date)) return "mm/dd/yyyy";
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
          ? `Expiry date ${formatVoucherDateDisplay(value)}. Open calendar.`
          : "Select expiry date",
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
    const selectedDate = parseVoucherDateInputValue(els.dateInput?.value);
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
        setVoucherDate(dayDate);
      });
      elements.days.appendChild(dayButton);
    }

    if (elements.clear instanceof HTMLButtonElement) {
      elements.clear.hidden = !selectedDate;
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
    panel.className = "product-expiry-calendar sa-voucher-date-calendar";
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
      setVoucherDate(new Date());
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
      const selectedDate =
        parseVoucherDateInputValue(els.dateInput?.value) ?? new Date();
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
      return;
    }
    els.dateInput.value = formatVoucherDateInputValue(date);
    syncVoucherDateTrigger();
    els.dateInput.dispatchEvent(new Event("input", { bubbles: true }));
    els.dateInput.dispatchEvent(new Event("change", { bubbles: true }));
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
      requestVoucherDateCalendarPosition,
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
      badge: "Sitewide",
      minimumSpend: formatMinSpend(els.minSpendInput?.value),
      date: parsedDate ? formatVoucherDateDisplay(parsedDate) : "",
      note: "A deal\nfor you!",
      kind,
      action: "useNow",
      discountType,
      discountValue,
      freeShipping,
      platformId: normalizePlatformId(els.platformSelect?.value),
      passive: Boolean(els.passiveInput?.checked),
      status: "active",
    };
  }

  function updatePreview() {
    refreshElements();
    if (!(els.preview instanceof HTMLElement)) return;
    const values = readFormValues();
    applyModalPlatformTheme(values.platformId || "shop");
    els.preview.innerHTML = voucherCardHtml(values, { preview: true });
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
        '<div class="empty-state">No vouchers yet. Create one to show it in buyer accounts.</div>';
      return;
    }
    els.list.innerHTML = state.items.map((voucher) => voucherCardHtml(voucher)).join("");
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
    syncPlatformSelect("shop");
    setPassiveToggle(false);
    setFreeShippingToggle(false);
    setDiscountTypeToggle("percent");
    if (els.discountValueInput) els.discountValueInput.value = "20";
    if (els.dateInput) {
      const nextYear = new Date();
      nextYear.setMonth(11, 31);
      els.dateInput.value = formatVoucherDateInputValue(nextYear);
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
    window.requestAnimationFrame(() => {
      els.modalOverlay?.classList.add("is-open");
      els.platformSelect?.focus();
    });
    void loadPlatforms().then(() => {
      syncPlatformSelect(els.platformSelect?.value || "shop");
      applyModalPlatformTheme(els.platformSelect?.value || "shop");
      updatePreview();
    });
  }

  function closeModal() {
    refreshElements();
    if (!(els.modalOverlay instanceof HTMLElement)) return;
    setVoucherDateCalendarOpen(false);
    els.modalOverlay.classList.remove("is-open");
    els.modalOverlay.setAttribute("aria-hidden", "true");
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
    if (!payload.platformId) {
      setModalFeedback("Select a buyer platform for this voucher.", "error");
      els.platformSelect?.focus();
      return;
    }
    if (!payload.title || !payload.code || !payload.date) {
      setModalFeedback("Title, code, and expiry date are required.", "error");
      return;
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
      const response = await fetch("/api/super-admin/vouchers", {
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
    const voucher = state.items.find((entry) => entry.id === voucherId);
    if (!voucher) return;
    if (!window.confirm(`Delete voucher “${voucher.code}”?`)) return;
    try {
      const response = await fetch(
        `/api/super-admin/vouchers/${encodeURIComponent(voucherId)}`,
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
        : state.items.filter((entry) => entry.id !== voucherId);
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
      const response = await fetch("/api/super-admin/vouchers", {
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

    document.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;
      if (target.closest("[data-super-admin-voucher-add]")) {
        event.preventDefault();
        openModal();
        return;
      }
      if (target.closest("#voucher-modal-close-button, #voucher-modal-cancel-button")) {
        event.preventDefault();
        closeModal();
        return;
      }
      if (target.closest("#voucher-passive-toggle")) {
        event.preventDefault();
        refreshElements();
        const next = !(els.passiveInput instanceof HTMLInputElement
          ? els.passiveInput.checked
          : false);
        setPassiveToggle(next);
        updatePreview();
        return;
      }
      if (target.closest("#voucher-free-shipping-toggle")) {
        event.preventDefault();
        refreshElements();
        const next = !(els.freeShippingInput instanceof HTMLInputElement
          ? els.freeShippingInput.checked
          : false);
        setFreeShippingToggle(next);
        updatePreview();
        return;
      }
      if (target.closest("#voucher-discount-type-toggle")) {
        event.preventDefault();
        refreshElements();
        const current = normalizeDiscountType(els.discountTypeInput?.value);
        setDiscountTypeToggle(current === "percent" ? "fixed" : "percent");
        updatePreview();
        return;
      }
      if (target.id === "voucher-modal-overlay") {
        closeModal();
        return;
      }
      const deleteButton = target.closest("[data-voucher-delete]");
      if (deleteButton) {
        const voucherId = deleteButton.getAttribute("data-voucher-delete") || "";
        if (voucherId) void deleteVoucher(voucherId);
      }
    });

    document.addEventListener("submit", (event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || form.id !== "voucher-modal-form") return;
      void createVoucher(event);
    });

    document.addEventListener("input", (event) => {
      const form =
        event.target instanceof Element
          ? event.target.closest("#voucher-modal-form")
          : null;
      if (form) updatePreview();
    });
    document.addEventListener("change", (event) => {
      const form =
        event.target instanceof Element
          ? event.target.closest("#voucher-modal-form")
          : null;
      if (form) updatePreview();
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

  window.SuperAdminVouchers = {
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
