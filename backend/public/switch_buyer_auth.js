(() => {
  const BUYER_SESSION_KEY = "gms-buyer-session";
  const BUYER_GUEST_KEY = "gms-buyer-guest";
  const LOGIN_LANGUAGE_STORAGE_KEY = "gms-login-language";
  const ACCOUNT_LANGUAGE_KEY_PREFIX = "gms-account-language_";
  const BUYER_NOTIF_READ_KEY = "gms-buyer-notif-read";
  const BUYER_WELCOME_NOTIF_ID = "buyer-welcome";
  const BUYER_INVITE_STATS_KEY = "gms-buyer-invite-stats";
  const BUYER_INVITE_INDEX_KEY = "gms-buyer-invite-index";
  const BUYER_INVITE_PENDING_KEY = "gms-buyer-pending-ref";
  const BUYER_INVITE_REWARD_PHP = 50;
  const SWITCH_LOGO_PATH = "/switch-logo.svg";
  const BUYER_CART_KEY = "gms-buyer-cart";
  const LOGIN_PATH = "/login.html";
  const HOME_PATH = "/main_dart.html";
  const CART_PATH = "/switch_cart.html";
  let BUYER_VOUCHERS = [
    Object.freeze({ status: "active", kind: "percent", title: "20% OFF", subtitle: "on Fashion & Accessories", minimumSpend: "500", code: "FASHION20", badge: "Online Only", date: "Dec 31, 2026", action: "useNow", note: "Look good.<br>Spend less!" }),
    Object.freeze({ status: "active", kind: "gift", title: "&#8369;100 OFF", subtitle: "on any purchase", minimumSpend: "300", code: "WELCOME100", badge: "New Users Only", date: "Nov 30, 2026", action: "apply", note: "A little happiness<br>for you!" }),
    Object.freeze({ status: "active", kind: "shipping", title: "Free Shipping", subtitle: "on all items", minimumSpend: "249", code: "FREESHIP", badge: "Sitewide", date: "Dec 15, 2026", action: "useNow", note: "Shop more.<br>Worry less!" }),
    Object.freeze({ status: "active", kind: "shopping", title: "Buy 1 Get 1", subtitle: "on selected items", minimumSpend: "299", code: "B1G1SPECIAL", badge: "Limited Time", date: "Nov 25, 2026", action: "useNow", note: "More to love<br>for less!" }),
    Object.freeze({ status: "used", kind: "loyalty", title: "10% OFF", subtitle: "on your last order", minimumSpend: "200", code: "THANKYOU10", badge: "Order Reward", date: "Sep 02, 2026", action: "used", note: "Thanks for<br>shopping!" }),
    Object.freeze({ status: "expired", kind: "ticket", title: "&#8369;50 OFF", subtitle: "on any purchase", minimumSpend: "250", code: "SAVE50", badge: "Storewide", date: "Aug 31, 2026", action: "expired", note: "A deal for<br>every cart!" }),
  ];
  const BUYER_VOUCHERS_FALLBACK = BUYER_VOUCHERS.slice();
  let buyerVouchersLoading = null;
  const USED_EXPIRED_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

  function voucherRetentionAnchor(voucher) {
    if (!voucher || voucher.status === "active") return null;
    const statusAt = Date.parse(voucher.statusAt || "");
    if (!Number.isNaN(statusAt)) return statusAt;
    const displayDate = Date.parse(voucher.date || "");
    if (!Number.isNaN(displayDate)) return displayDate;
    const updatedAt = Date.parse(voucher.updatedAt || "");
    if (!Number.isNaN(updatedAt)) return updatedAt;
    const createdAt = Date.parse(voucher.createdAt || "");
    return Number.isNaN(createdAt) ? null : createdAt;
  }

  function keepBuyerVoucher(voucher) {
    if (!voucher) return false;
    if (voucher.status === "active") return true;
    const anchor = voucherRetentionAnchor(voucher);
    if (anchor == null) return true;
    return Date.now() - anchor < USED_EXPIRED_RETENTION_MS;
  }

  const LANGUAGE_OPTIONS = [
    { code: "en", label: "English" },
    { code: "zh", label: "中文" },
    { code: "es", label: "Español" },
    { code: "hi", label: "हिन्दी" },
    { code: "ar", label: "العربية" },
    { code: "fr", label: "Français" },
    { code: "pt", label: "Português" },
    { code: "ru", label: "Русский" },
    { code: "ja", label: "日本語" },
    { code: "de", label: "Deutsch" },
    { code: "ko", label: "한국어" },
    { code: "vi", label: "Tiếng Việt" },
    { code: "id", label: "Bahasa Indonesia" },
    { code: "tl", label: "Tagalog" },
    { code: "th", label: "ไทย" },
  ];

  const LANGUAGE_ALIASES = {
    fil: "tl",
    "tl-ph": "tl",
    "en-us": "en",
    "en-gb": "en",
    "zh-cn": "zh",
    "zh-tw": "zh",
  };

  const LANGUAGE_HTML_LANG = {
    en: "en",
    zh: "zh-CN",
    es: "es",
    hi: "hi",
    ar: "ar",
    fr: "fr",
    pt: "pt",
    ru: "ru",
    ja: "ja",
    de: "de",
    ko: "ko",
    vi: "vi",
    id: "id",
    tl: "tl",
    th: "th",
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function readStorage(key) {
    try {
      return window.localStorage.getItem(key) || window.sessionStorage.getItem(key) || "";
    } catch (_) {
      return "";
    }
  }

  function writeStorage(key, value) {
    try {
      window.localStorage.setItem(key, value);
      window.sessionStorage.setItem(key, value);
    } catch (_) {}
  }

  function removeStorage(key) {
    try {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    } catch (_) {}
  }

  function isGuestMode() {
    try {
      if (window.localStorage.getItem(BUYER_GUEST_KEY) === "1") return true;
    } catch (_) {}
    try {
      return new URLSearchParams(window.location.search).get("guest") === "1";
    } catch (_) {
      return false;
    }
  }

  function readBuyerSession() {
    if (isGuestMode()) return null;
    try {
      const raw = readStorage(BUYER_SESSION_KEY);
      if (!raw) return null;
      const session = JSON.parse(raw);
      if (!session || typeof session !== "object") return null;
      const accountId = String(session.accountId || session.id || "").trim();
      const email = String(session.email || "").trim();
      if (!accountId && !email) return null;
      return session;
    } catch (_) {
      return null;
    }
  }

  function saveBuyerSession(session, options = {}) {
    if (!session || typeof session !== "object") return;
    writeStorage(BUYER_SESSION_KEY, JSON.stringify(session));
    try {
      window.localStorage.setItem(BUYER_GUEST_KEY, "0");
    } catch (_) {}
    try {
      const accountId = String(session.accountId || session.id || "").trim();
      const code = buildInviteCode(accountId);
      if (code) registerInviteCode(accountId, code);
      applyPendingInviteCredit(session);
    } catch (_) {}
    if (options.applyLanguage !== false) {
      applyAccountLanguagePreference(session, {
        forceSync: Boolean(options.seedLanguage),
      });
    }
    if (options.emitSessionEvent === false) return;
    window.dispatchEvent(
      new CustomEvent("gms-buyer-session-updated", { detail: { session } }),
    );
  }

  function clearBuyerSession() {
    removeStorage(BUYER_SESSION_KEY);
    try {
      window.localStorage.setItem(BUYER_GUEST_KEY, "0");
    } catch (_) {}
    window.dispatchEvent(
      new CustomEvent("gms-buyer-session-updated", { detail: { session: null } }),
    );
  }

  function getDisplayName(session) {
    if (!session) return "Account";
    const firstName = String(session.firstName || "").trim();
    const lastName = String(session.lastName || "").trim();
    const combined = [firstName, lastName].filter(Boolean).join(" ");
    return (
      combined
      || String(session.displayName || session.username || session.name || "").trim()
      || String(session.email || "").split("@")[0]
      || "Account"
    );
  }

  function getInitials(session) {
    const name = getDisplayName(session);
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase() || "A";
  }

  function getAvatarUrl(session) {
    const googlePicture = session?.googleProfile && typeof session.googleProfile === "object"
      ? session.googleProfile.picture
      : "";
    return String(
      session?.profileImageUrl
        || session?.avatarUrl
        || session?.photoUrl
        || session?.pictureUrl
        || session?.imageUrl
        || googlePicture
        || "",
    ).trim();
  }

  const COMPANY_DEFAULT_LOGO_SVG = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
      <path d="M10 12h4"></path>
      <path d="M10 8h4"></path>
      <path d="M14 21v-3a2 2 0 0 0-4 0v3"></path>
      <path d="M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2"></path>
      <path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"></path>
    </svg>
  `.trim();

  function hasSellerAdminAccess(session) {
    const modes = Array.isArray(session?.availableModes) ? session.availableModes : [];
    return modes.some((mode) => String(mode || "").trim().toLowerCase() === "seller_admin");
  }

  function getSellerCompanyMemberships(session) {
    const companies = Array.isArray(session?.companies) ? session.companies : [];
    return companies.filter((membership) => {
      const company = membership?.company && typeof membership.company === "object"
        ? membership.company
        : {};
      const type = String(company.type || "").trim().toLowerCase();
      const role = String(membership?.membershipRole || "").trim().toLowerCase();
      if (type && type !== "seller") return false;
      if (role && role !== "owner" && role !== "seller_admin") return false;
      return Boolean(String(membership?.companyId || company.id || "").trim());
    });
  }

  function getCompanyDisplayName(membership) {
    const company = membership?.company && typeof membership.company === "object"
      ? membership.company
      : {};
    return String(
      company.publicName
        || company.name
        || company.legalName
        || company.maskedPublicName
        || membership?.title
        || "Company",
    ).trim() || "Company";
  }

  /** Company face only — never personal / Google buyer avatar. */
  function getCompanyProfileImageUrl(company = {}) {
    if (!company || typeof company !== "object") return "";
    if (company.businessLogoSkipped === true) return "";
    const profileData = company.profileData && typeof company.profileData === "object"
      ? company.profileData
      : {};
    if (profileData.businessLogoSkipped === true) return "";
    return String(
      company.logoUrl
        || profileData.logoUrl
        || profileData.companyPictureUrl
        || profileData.businessLogoUrl
        || "",
    ).trim();
  }

  function getCompanyLogoToneIndex(seed = "") {
    const source = String(seed || "Company");
    let hash = 0;
    for (const char of source) {
      hash = (hash + char.charCodeAt(0)) % 6;
    }
    return hash + 1;
  }

  function persistSellerAdminSession(admin, redirectPath) {
    const adminSession = {
      ...(admin && typeof admin === "object" ? admin : {}),
      role: "admin",
      adminId: String(admin?.adminId || admin?.id || "").trim(),
      email: String(admin?.email || "").trim().toLowerCase(),
      dashboardPath: redirectPath || "/main.html#dashboard",
      signedInAt: new Date().toISOString(),
    };
    try {
      window.sessionStorage.setItem("gms-admin-session", JSON.stringify(adminSession));
      window.sessionStorage.removeItem("gms-employee-session");
      window.sessionStorage.removeItem("gms-super-admin-session");
      window.localStorage.setItem("gms-admin-id", adminSession.adminId);
    } catch (_) {}
    return adminSession;
  }

  const SWITCH_PIN_UNLOCK_KEY = "gms-switch-pin-unlock";

  function persistSwitchPinUnlock(token, companyId, accountId) {
    const unlockToken = String(token || "").trim();
    if (!unlockToken) return "";
    const payload = {
      token: unlockToken,
      companyId: String(companyId || "").trim(),
      accountId: String(accountId || "").trim(),
    };
    try {
      window.sessionStorage.setItem(SWITCH_PIN_UNLOCK_KEY, JSON.stringify(payload));
    } catch (_) {}
    return unlockToken;
  }

  function sellerAdminUrlWithPinTicket(redirectPath, token) {
    const unlockToken = String(token || "").trim();
    const path = String(redirectPath || "/main.html#dashboard").trim() || "/main.html#dashboard";
    if (!unlockToken) return path;
    try {
      const url = new URL(path, window.location.origin);
      url.searchParams.set("switchPinTicket", unlockToken);
      return `${url.pathname}${url.search}${url.hash}`;
    } catch (_) {
      const joiner = path.includes("?") ? "&" : "?";
      return `${path}${joiner}switchPinTicket=${encodeURIComponent(unlockToken)}`;
    }
  }

  function ensureSwitchPinStyles() {
    if (document.getElementById("switch-pin-gate-style")) return;
    const style = document.createElement("style");
    style.id = "switch-pin-gate-style";
    style.textContent = `
      .switch-pin-gate {
        position: fixed;
        inset: 0;
        z-index: 100000;
        display: grid;
        place-items: center;
        padding: 24px;
        background: rgba(15, 23, 42, 0.46);
      }
      .switch-pin-gate[hidden] { display: none; }
      .switch-pin-gate__card {
        width: min(420px, 100%);
        background: #fff;
        color: #0f172a;
        border-radius: 18px;
        padding: 22px 22px 18px;
        box-shadow: 0 24px 60px rgba(15, 23, 42, 0.22);
      }
      .switch-pin-gate__kicker {
        margin: 0 0 6px;
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: #0f766e;
      }
      .switch-pin-gate__card h2 {
        margin: 0;
        font-size: 22px;
        line-height: 1.2;
      }
      .switch-pin-gate__lead {
        margin: 8px 0 16px;
        color: #475569;
        font-size: 14px;
        line-height: 1.5;
      }
      .switch-pin-gate label {
        display: grid;
        gap: 6px;
        margin-bottom: 12px;
        font-size: 13px;
        font-weight: 600;
      }
      .switch-pin-gate input {
        height: 46px;
        border: 1px solid #cbd5e1;
        border-radius: 12px;
        padding: 0 14px;
        font-size: 18px;
        letter-spacing: 0.28em;
        font-weight: 600;
      }
      .switch-pin-gate__feedback {
        min-height: 18px;
        margin: 0 0 12px;
        font-size: 13px;
        color: #b91c1c;
      }
      .switch-pin-gate__actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
      }
      .switch-pin-gate button {
        height: 40px;
        border-radius: 12px;
        border: 0;
        padding: 0 14px;
        font-weight: 600;
        cursor: pointer;
      }
      .switch-pin-gate__cancel {
        background: #f1f5f9;
        color: #0f172a;
      }
      .switch-pin-gate__submit {
        background: #0f766e;
        color: #fff;
      }
      .switch-pin-gate__submit:disabled,
      .switch-pin-gate__cancel:disabled {
        opacity: 0.7;
        cursor: wait;
      }
    `;
    document.head.appendChild(style);
  }

  function promptSwitchPin({ accountId, email, companyId, companyName }) {
    ensureSwitchPinStyles();
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "switch-pin-gate";
      overlay.innerHTML = `
        <form class="switch-pin-gate__card" data-switch-pin-form>
          <p class="switch-pin-gate__kicker">Be Part of Switch</p>
          <h2>${escapeHtml(t("account.pin.title"))}</h2>
          <p class="switch-pin-gate__lead" data-switch-pin-lead>${escapeHtml(t("account.pin.checking"))}</p>
          <div data-switch-pin-fields></div>
          <p class="switch-pin-gate__feedback" data-switch-pin-feedback></p>
          <div class="switch-pin-gate__actions">
            <button type="button" class="switch-pin-gate__cancel" data-switch-pin-cancel>${escapeHtml(t("account.pin.cancel"))}</button>
            <button type="submit" class="switch-pin-gate__submit" data-switch-pin-submit disabled>${escapeHtml(t("account.pin.continue"))}</button>
          </div>
        </form>
      `;
      document.body.appendChild(overlay);
      const form = overlay.querySelector("[data-switch-pin-form]");
      const lead = overlay.querySelector("[data-switch-pin-lead]");
      const fields = overlay.querySelector("[data-switch-pin-fields]");
      const feedback = overlay.querySelector("[data-switch-pin-feedback]");
      const submit = overlay.querySelector("[data-switch-pin-submit]");
      const cancel = overlay.querySelector("[data-switch-pin-cancel]");
      let mode = "enter";
      let settled = false;

      const close = (result) => {
        if (settled) return;
        settled = true;
        overlay.remove();
        resolve(result);
      };

      const setBusy = (busy, message) => {
        submit.disabled = busy;
        cancel.disabled = busy;
        if (message) feedback.textContent = message;
      };

      const renderFields = (nextMode) => {
        mode = nextMode;
        lead.textContent = nextMode === "create"
          ? t("account.pin.createLead")
          : t("account.pin.enterLead");
        fields.innerHTML = nextMode === "create"
          ? `
            <label>${escapeHtml(t("account.pin.create"))}
              <input type="password" inputmode="numeric" maxlength="6" autocomplete="off" data-switch-pin required />
            </label>
            <label>${escapeHtml(t("account.pin.confirm"))}
              <input type="password" inputmode="numeric" maxlength="6" autocomplete="off" data-switch-pin-confirm required />
            </label>
          `
          : `
            <label>${escapeHtml(companyName || t("account.pin.enter"))}
              <input type="password" inputmode="numeric" maxlength="6" autocomplete="off" data-switch-pin required />
            </label>
          `;
        fields.querySelectorAll("input").forEach((input) => {
          input.addEventListener("input", () => {
            input.value = String(input.value || "").replace(/\D/g, "").slice(0, 6);
            feedback.textContent = "";
          });
        });
        submit.disabled = false;
        fields.querySelector("input")?.focus();
      };

      cancel.addEventListener("click", () => close(null));
      overlay.addEventListener("click", (event) => {
        if (event.target === overlay) close(null);
      });
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const pin = String(overlay.querySelector("[data-switch-pin]")?.value || "").replace(/\D/g, "");
        const confirmPin = String(overlay.querySelector("[data-switch-pin-confirm]")?.value || "").replace(/\D/g, "");
        if (!/^\d{6}$/.test(pin)) {
          feedback.textContent = t("account.pin.createLead");
          return;
        }
        if (mode === "create" && pin !== confirmPin) {
          feedback.textContent = "Switch PIN confirmation does not match.";
          return;
        }
        setBusy(true, mode === "create" ? t("account.pin.saving") : t("account.pin.checking"));
        try {
          const response = await fetch(
            mode === "create" ? "/api/account/seller-switch-pin/set" : "/api/account/seller-switch-pin/verify",
            {
              method: "POST",
              headers: { Accept: "application/json", "Content-Type": "application/json" },
              body: JSON.stringify({
                accountId,
                email,
                companyId,
                pin,
                confirmPin,
              }),
            },
          );
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(payload.message || t("account.companies.error"));
          }
          const unlockToken = persistSwitchPinUnlock(
            payload.unlockToken,
            payload.companyId || companyId,
            accountId,
          );
          close({
            unlockToken,
            companyId: String(payload.companyId || companyId || "").trim(),
          });
        } catch (error) {
          setBusy(false, "");
          feedback.textContent = error instanceof Error && error.message
            ? error.message
            : t("account.companies.error");
        }
      });

      void fetch("/api/account/seller-switch-pin/status", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, email, companyId }),
      })
        .then((response) => response.json().then((payload) => ({ ok: response.ok, payload })))
        .then(({ ok, payload }) => {
          if (!ok) throw new Error(payload.message || t("account.companies.error"));
          renderFields(payload.hasPin ? "enter" : "create");
        })
        .catch((error) => {
          feedback.textContent = error instanceof Error && error.message
            ? error.message
            : t("account.companies.error");
          submit.disabled = true;
        });
    });
  }

  function isGoogleHostedAvatarUrl(url) {
    const value = String(url || "").trim().toLowerCase();
    return Boolean(
      value
      && (
        value.includes("googleusercontent.com")
        || value.includes("ggpht.com")
        || value.includes("google.com/a/")
      ),
    );
  }

  function renderAvatarMarkup(imageUrl, initials) {
    const url = String(imageUrl || "").trim();
    const label = String(initials || "A").trim() || "A";
    if (!url) {
      return `<span>${escapeHtml(label)}</span>`;
    }
    const referrerPolicy = isGoogleHostedAvatarUrl(url)
      ? ' referrerpolicy="no-referrer"'
      : "";
    return `<img src="${escapeHtml(url)}" alt="" loading="lazy" decoding="async"${referrerPolicy} data-md-avatar-image />`;
  }

  function bindAvatarImageFallbacks(root) {
    const scope = root instanceof Element ? root : document;
    scope.querySelectorAll("[data-md-avatar-image]").forEach((image) => {
      if (!(image instanceof HTMLImageElement) || image.dataset.fallbackBound === "1") {
        return;
      }
      image.dataset.fallbackBound = "1";
      image.addEventListener("error", () => {
        const host = image.closest(
          ".md-account-panel__avatar, .md-account-menu__avatar, .md-account-profile-photo__avatar",
        );
        const initials = String(
          host?.dataset?.mdAvatarInitials
            || host?.getAttribute("data-initials")
            || image.alt
            || "A",
        ).trim().slice(0, 2).toUpperCase() || "A";
        if (host) {
          host.classList.remove("has-image");
          host.innerHTML = `<span>${escapeHtml(initials)}</span>`;
          return;
        }
        image.replaceWith(Object.assign(document.createElement("span"), {
          textContent: initials,
        }));
      }, { once: true });
    });
  }

  async function refreshBuyerProfile(options = {}) {
    const current = readBuyerSession();
    if (!current) return null;

    const accountId = String(current.accountId || current.id || "").trim();
    const email = String(current.email || "").trim().toLowerCase();
    if (!accountId && !email) return current;

    try {
      const query = accountId
        ? `accountId=${encodeURIComponent(accountId)}`
        : `email=${encodeURIComponent(email)}`;
      const response = await fetch(`/api/auth/session?${query}`, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const payload = await response.json().catch(() => ({}));
      const account = payload?.session?.account;
      if (!response.ok || !account || typeof account !== "object") return current;

      const unified = payload?.session && typeof payload.session === "object"
        ? payload.session
        : {};
      const next = {
        ...current,
        ...account,
        role: current.role || "user",
        accountId: String(account.id || account.accountId || accountId).trim(),
        email: String(account.email || email).trim().toLowerCase(),
        availableModes: Array.isArray(unified.availableModes)
          ? unified.availableModes
          : (Array.isArray(current.availableModes) ? current.availableModes : ["buyer"]),
        activeMode: String(unified.activeMode || current.activeMode || "buyer").trim() || "buyer",
        activeCompanyId: unified.activeCompanyId || current.activeCompanyId || null,
        activeCompany: unified.activeCompany || current.activeCompany || null,
        companies: Array.isArray(unified.companies)
          ? unified.companies
          : (Array.isArray(current.companies) ? current.companies : []),
        capabilities: Array.isArray(unified.capabilities)
          ? unified.capabilities
          : (Array.isArray(current.capabilities) ? current.capabilities : []),
      };
      const languageChanged =
        preferredLanguageFromAccount(next) !== preferredLanguageFromAccount(current);
      // Keep open account/companies sidebar intact — remounting closes it.
      // Still apply language when server preference changed (app ↔ web sync).
      saveBuyerSession(next, {
        emitSessionEvent: options.emitSessionEvent !== false && !options.silent,
        applyLanguage: languageChanged || options.applyLanguage === true,
      });
      return next;
    } catch (_) {
      return current;
    }
  }

  function shouldSkipHeader(inner) {
    if (!(inner instanceof HTMLElement)) return true;
    if (inner.closest("body.login-page, .login-shell, #login-panel")) return true;
    if (document.body.classList.contains("login-page")) return true;
    if (/\/login\.html$/i.test(window.location.pathname)) return true;
    return false;
  }

  function normalizeLanguage(language) {
    const raw = String(language || "").trim().toLowerCase();
    if (!raw) return "en";
    const aliased = LANGUAGE_ALIASES[raw] || raw;
    return LANGUAGE_OPTIONS.some((entry) => entry.code === aliased) ? aliased : "en";
  }

  function accountLanguageStorageKey(accountId) {
    const id = String(accountId || "").trim();
    return id ? `${ACCOUNT_LANGUAGE_KEY_PREFIX}${id}` : "";
  }

  function readAccountLanguage(accountId) {
    const key = accountLanguageStorageKey(accountId);
    if (!key) return "";
    try {
      return normalizeLanguage(window.localStorage.getItem(key) || "");
    } catch (_) {
      return "en";
    }
  }

  function writeAccountLanguage(accountId, language) {
    const key = accountLanguageStorageKey(accountId);
    if (!key) return;
    try {
      window.localStorage.setItem(key, normalizeLanguage(language));
    } catch (_) {}
  }

  function preferredLanguageFromAccount(account) {
    if (!account || typeof account !== "object") return "";
    for (const key of ["preferredLanguage", "preferred_language", "language", "languageCode"]) {
      const value = String(account[key] || "").trim();
      if (value) return normalizeLanguage(value);
    }
    return "";
  }

  function syncPreferredLanguageToServer(accountId, language) {
    const id = String(accountId || "").trim();
    const next = normalizeLanguage(language);
    if (!id) return;
    void fetch("/api/accounts/preferred-language", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        accountId: id,
        preferredLanguage: next,
      }),
    }).catch(() => {});
  }

  function applyAccountLanguagePreference(session, options = {}) {
    if (!session || typeof session !== "object") return getSavedLanguage();
    const accountId = String(session.accountId || session.id || "").trim();
    const fromAccount = preferredLanguageFromAccount(session);
    const fromLocalAccount = accountId ? readAccountLanguage(accountId) : "";
    const guest = getSavedLanguage();
    const next = fromAccount || fromLocalAccount || guest;
    const shouldSeedRemote = Boolean(accountId) && !fromAccount;
    if (accountId) {
      writeAccountLanguage(accountId, next);
    }
    return applyBuyerLanguage(next, {
      persist: true,
      syncRemote: shouldSeedRemote || Boolean(options.forceSync),
    });
  }

  function getSavedLanguage() {
    try {
      return normalizeLanguage(window.localStorage.getItem(LOGIN_LANGUAGE_STORAGE_KEY));
    } catch (_) {
      return "en";
    }
  }

  function saveLanguage(language, options = {}) {
    const next = normalizeLanguage(language);
    try {
      window.localStorage.setItem(LOGIN_LANGUAGE_STORAGE_KEY, next);
    } catch (_) {}
    const session = readBuyerSession();
    const accountId = String(session?.accountId || session?.id || "").trim();
    if (accountId) {
      writeAccountLanguage(accountId, next);
      // Keep cached session aligned so boot / remount don't revert to stale lang.
      if (session && preferredLanguageFromAccount(session) !== next) {
        saveBuyerSession(
          { ...session, preferredLanguage: next },
          { applyLanguage: false, emitSessionEvent: false },
        );
      }
      if (options.syncRemote !== false) {
        syncPreferredLanguageToServer(accountId, next);
      }
    }
    return next;
  }

  function t(key, replacements = {}) {
    const lang = getSavedLanguage();
    const table = BUYER_I18N[lang] || BUYER_I18N.en;
    let output = table[key] || BUYER_I18N.en[key] || key;
    Object.entries(replacements).forEach(([name, value]) => {
      output = output.replaceAll(`{${name}}`, String(value ?? ""));
    });
    return output;
  }

  function applyBuyerLanguage(language, options = {}) {
    const next = options.persist === false
      ? normalizeLanguage(language)
      : saveLanguage(language, { syncRemote: options.syncRemote !== false });
    document.documentElement.lang = LANGUAGE_HTML_LANG[next] || "en";
    document.documentElement.dir = next === "ar" ? "rtl" : "ltr";
    document.body?.classList.toggle("md-app--rtl", next === "ar");

    document.querySelectorAll("[data-i18n]").forEach((node) => {
      const key = node.getAttribute("data-i18n");
      if (!key) return;
      node.textContent = t(key);
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
      const key = node.getAttribute("data-i18n-placeholder");
      if (!key || !("placeholder" in node)) return;
      node.placeholder = t(key);
    });
    document.querySelectorAll("[data-i18n-aria-label]").forEach((node) => {
      const key = node.getAttribute("data-i18n-aria-label");
      if (!key) return;
      node.setAttribute("aria-label", t(key));
    });
    document.querySelectorAll("[data-i18n-title]").forEach((node) => {
      const key = node.getAttribute("data-i18n-title");
      if (!key) return;
      node.setAttribute("title", t(key));
    });

    window.dispatchEvent(
      new CustomEvent("gms-login-language-updated", { detail: { language: next } }),
    );
    return next;
  }

  const BUYER_I18N = {
    en: {
      "platform.name.shop": "Shop",
      "platform.name.food": "Food",
      "platform.name.hotels": "Hotels",
      "platform.name.resort": "Resort",
      "platform.title": "What are you looking for?",
      "platform.choose": "Choose a platform",
      "platform.search.placeholder": "Search food, hotels, items...",
      "platform.search.aria": "Search food, hotels, items",
      "platform.search.clear": "Clear search",
      "platform.search.everything": "Search everything",
      "platform.search.prefix": "Search ",
      "platform.search.everythingWord": "everything",
      "platform.soon": "Coming Soon",
      "platform.empty": "No platforms yet.",
      "platform.comingSoon": "{name} is coming soon.",
      "platform.unavailable": "Unavailable",
      "platform.unavailableMsg": "{name} is currently unavailable.",
      "account.settings": "Account settings",
      "account.signout": "Sign out",
      "account.menu": "Account menu",
      "account.page.copy": "Your signed-in Switch account details.",
      "account.page.back": "Back to Switch",
      "account.name": "Name",
      "account.email": "Email",
      "account.id": "Account ID",
      "account.profile": "Profile",
      "account.profileHub": "Account profile",
      "account.personalInfo": "Personal information",
      "account.invite": "Invite Friends",
      "account.vouchers": "Vouchers",
      "account.vouchers.title": "My Vouchers",
      "account.vouchers.subtitle": "Save more. Shop happier.",
      "account.vouchers.active": "Active",
      "account.vouchers.used": "Used",
      "account.vouchers.expired": "Expired",
      "account.vouchers.search": "Search vouchers",
      "account.vouchers.searchPlaceholder": "Search by offer or code",
      "account.vouchers.reverse": "Reverse voucher order",
      "account.vouchers.minSpend": "Min. spend",
      "account.vouchers.code": "Code",
      "account.vouchers.expires": "Expires",
      "account.vouchers.usedOn": "Used",
      "account.vouchers.expiredOn": "Expired",
      "account.vouchers.useNow": "Use Now",
      "account.vouchers.apply": "Apply",
      "account.vouchers.copied": "Voucher code copied. Paste it at checkout.",
      "account.vouchers.platformAll": "All platforms",
      "account.vouchers.platformOnly": "Usable only on {platform}.",
      "account.vouchers.empty": "No vouchers found",
      "account.vouchers.emptyCopy": "Try another tab or search term.",
      "account.favorites": "Favorites",
      "account.activity": "Recent activity",
      "account.address": "Address",
      "account.address.addTitle": "Add Address",
      "account.invite.copy": "Share your unique QR or link. Friends who join with it count toward your referrals.",
      "account.invite.earned": "Earned",
      "account.invite.referred": "Referred",
      "account.invite.code": "Your invite code",
      "account.invite.send": "Send link",
      "account.invite.copied": "Invite link copied",
      "account.invite.shareTitle": "Join me on Switch",
      "account.invite.shareText": "Use my invite link to join Switch:",
      "account.invite.qrAlt": "Your unique invite QR code",
      "account.invite.friendsJoined": "Friends joined",
      "account.invite.bannerTitle": "Get Reward Vouchers",
      "account.invite.bannerCopy": "Earn a voucher for every successful referral.",
      "account.invite.qrCopy": "Scan this QR code or share your referral code",
      "account.invite.codeCopied": "Invite code copied",
      "account.invite.howTitle": "How it works",
      "account.invite.step1Title": "Share your code",
      "account.invite.step1Copy": "Invite friends via QR code or link",
      "account.invite.step2Title": "Friend signs up",
      "account.invite.step2Copy": "They create an account and order",
      "account.invite.step3Title": "Both earn rewards",
      "account.invite.step3Copy": "Rewards are added after the first order",
      "account.vouchers.copy": "Your vouchers and promo codes will appear here.",
      "account.favorites.copy": "Saved products will appear here.",
      "account.activity.copy": "Your recent account activity will appear here.",
      "account.address.copy": "Manage your delivery addresses here.",
      "account.security": "Login & security",
      "account.security.copy": "Manage sign-in and verification for this account.",
      "account.password": "Password",
      "account.password.copy": "Change the password you use to sign in to Switch.",
      "account.password.action": "Update password",
      "account.password.current": "Current password",
      "account.password.new": "New password",
      "account.password.confirm": "Confirm password",
      "account.password.updating": "Updating password...",
      "account.password.success": "Password updated successfully.",
      "account.twoFactor": "Two-factor authenticator",
      "account.twoFactor.copy": "Set up an authenticator app for two-factor verification. Controls will appear here.",
      "account.loginActivity": "Login activity",
      "account.loginActivity.copy": "Recent sign-ins and login attempts for this account will appear here.",
      "account.devices": "Devices",
      "account.devices.copy": "Review the phones and computers signed in to this account, together with their latest login activity.",
      "account.payment": "Payment method",
      "account.payment.copy": "Add and manage your payment methods here.",
      "account.links": "Account Connections",
      "account.links.copy": "Connect your accounts for faster login and a better experience.",
      "account.preferences": "Preferences",
      "account.account": "Delete account",
      "account.profileHub.copy": "Choose what you want to manage for this account.",
      "account.settings.copy": "Manage your personal information, security, preferences, and account.",
      "account.back": "Back",
      "account.phone": "Phone",
      "account.seller": "Be Part of Switch",
      "account.seller.copy": "Pick a plan, create a Switch PIN, then set up your company. Opening seller admin always asks for that PIN first.",
      "account.seller.start": "Start upgrade",
      "account.companies": "Companies",
      "account.companies.copy": "Choose a company, then enter your Switch PIN to open its seller admin.",
      "account.companies.empty": "No seller companies linked to this account yet.",
      "account.companies.open": "Opening company workspace...",
      "account.companies.error": "Unable to open this company workspace.",
      "account.companies.active": "Current",
      "account.companies.role": "Seller admin",
      "account.companies.add": "Add company",
      "account.pin.title": "Switch PIN",
      "account.pin.enterLead": "Enter your Switch PIN to open seller admin. This is not your login password.",
      "account.pin.createLead": "Create a Switch PIN for this seller admin. Subscribers must enter this PIN before opening seller admin.",
      "account.pin.create": "Create Switch PIN",
      "account.pin.confirm": "Confirm Switch PIN",
      "account.pin.enter": "Switch PIN",
      "account.pin.continue": "Continue",
      "account.pin.cancel": "Cancel",
      "account.pin.checking": "Checking Switch PIN...",
      "account.pin.saving": "Saving Switch PIN...",
      "notifications.title": "Notifications",
      "notifications.empty": "No notifications yet.",
      "notifications.emptyUnread": "No unread notifications.",
      "notifications.aria": "Notifications",
      "notifications.close": "Close notifications",
      "notifications.filter": "Notification filter",
      "notifications.filter.all": "All",
      "notifications.filter.unread": "Unread",
      "notifications.welcome.title": "Welcome to Switch",
      "notifications.welcome.message": "Welcome to Switch! We're so glad you're here. Enjoy exploring.",
      "language.aria": "Language",
      "sidebar.close": "Close sidebar",
      "cart.aria": "Cart",
      "shop.back.home": "Home",
      "shop.back.types": "Business types",
    },
    tl: {
      "platform.name.shop": "Tindahan",
      "platform.name.food": "Pagkain",
      "platform.name.hotels": "Mga Hotel",
      "platform.name.resort": "Resort",
      "platform.title": "Ano ang hinahanap mo?",
      "platform.choose": "Pumili ng platform",
      "platform.search.placeholder": "Maghanap ng food, hotels, items...",
      "platform.search.aria": "Maghanap ng food, hotels, items",
      "platform.search.clear": "I-clear ang search",
      "platform.search.everything": "Hanapin ang lahat",
      "platform.search.prefix": "Maghanap ng ",
      "platform.search.everythingWord": "lahat",
      "platform.soon": "Malapit na",
      "platform.empty": "Wala pang platform.",
      "platform.comingSoon": "Malapit na ang {name}.",
      "platform.unavailable": "Hindi available",
      "platform.unavailableMsg": "Hindi available ang {name} sa ngayon.",
      "account.settings": "Mga setting ng account",
      "account.signout": "Mag-sign out",
      "account.menu": "Menu ng account",
      "account.page.copy": "Detalye ng naka-sign in mong Switch account.",
      "account.page.back": "Bumalik sa Switch",
      "account.name": "Pangalan",
      "account.email": "Email",
      "account.id": "Account ID",
      "account.profile": "Profile",
      "account.profileHub": "Account profile",
      "account.personalInfo": "Personal na impormasyon",
      "account.invite": "Mag-imbita ng kaibigan",
      "account.vouchers": "Mga voucher",
      "account.vouchers.title": "Mga Voucher Ko",
      "account.vouchers.subtitle": "Mas makatipid. Mas masayang mamili.",
      "account.vouchers.active": "Aktibo",
      "account.vouchers.used": "Nagamit",
      "account.vouchers.expired": "Nag-expire",
      "account.vouchers.search": "Maghanap ng voucher",
      "account.vouchers.searchPlaceholder": "Maghanap gamit ang offer o code",
      "account.vouchers.reverse": "Baligtarin ang ayos ng voucher",
      "account.vouchers.minSpend": "Minimum na gastos",
      "account.vouchers.code": "Code",
      "account.vouchers.expires": "Mag-e-expire",
      "account.vouchers.usedOn": "Nagamit",
      "account.vouchers.expiredOn": "Nag-expire",
      "account.vouchers.useNow": "Gamitin",
      "account.vouchers.apply": "I-apply",
      "account.vouchers.copied": "Nakopya ang voucher code. I-paste ito sa checkout.",
      "account.vouchers.platformAll": "Lahat ng platform",
      "account.vouchers.platformOnly": "Pwede lang gamitin sa {platform}.",
      "account.vouchers.empty": "Walang nakitang voucher",
      "account.vouchers.emptyCopy": "Sumubok ng ibang tab o search term.",
      "account.favorites": "Mga paborito",
      "account.activity": "Kamakailang aktibidad",
      "account.address": "Address",
      "account.address.addTitle": "Magdagdag ng Address",
      "account.invite.copy": "Ibahagi ang unique QR o link mo. Kapag sumali ang kaibigan gamit ito, tumataas ang referral mo.",
      "account.invite.earned": "Nakuha",
      "account.invite.referred": "Na-refer",
      "account.invite.code": "Invite code mo",
      "account.invite.send": "Ipadala ang link",
      "account.invite.copied": "Nakopya ang invite link",
      "account.invite.shareTitle": "Sumali sa Switch",
      "account.invite.shareText": "Gamitin ang invite link ko para sumali sa Switch:",
      "account.invite.qrAlt": "Unique invite QR code mo",
      "account.invite.friendsJoined": "Mga kaibigang sumali",
      "account.invite.bannerTitle": "Kumuha ng Reward Vouchers",
      "account.invite.bannerCopy": "Makakuha ng voucher sa bawat matagumpay na referral.",
      "account.invite.qrCopy": "I-scan ang QR code o ibahagi ang referral code mo",
      "account.invite.codeCopied": "Nakopya ang invite code",
      "account.invite.howTitle": "Paano ito gumagana",
      "account.invite.step1Title": "Ibahagi ang code",
      "account.invite.step1Copy": "Mag-imbita gamit ang QR code o link",
      "account.invite.step2Title": "Mag-sign up ang kaibigan",
      "account.invite.step2Copy": "Gagawa sila ng account at o-order",
      "account.invite.step3Title": "Parehong may reward",
      "account.invite.step3Copy": "Idaragdag ang rewards pagkatapos ng unang order",
      "account.vouchers.copy": "Lalabas dito ang mga voucher at promo code mo.",
      "account.favorites.copy": "Lalabas dito ang mga naka-save na produkto.",
      "account.activity.copy": "Lalabas dito ang kamakailang aktibidad ng account mo.",
      "account.address.copy": "Pamahalaan ang mga delivery address mo dito.",
      "account.security": "Login at seguridad",
      "account.security.copy": "Pamahalaan ang sign-in at verification ng account na ito.",
      "account.password": "Password",
      "account.password.copy": "Palitan ang password na ginagamit mo para mag-sign in sa Switch.",
      "account.password.action": "I-update ang password",
      "account.password.current": "Kasalukuyang password",
      "account.password.new": "Bagong password",
      "account.password.confirm": "Kumpirmahin ang password",
      "account.password.updating": "Ina-update ang password...",
      "account.password.success": "Matagumpay na na-update ang password.",
      "account.twoFactor": "Two-factor authenticator",
      "account.twoFactor.copy": "Mag-set up ng authenticator app para sa two-factor verification. Lalabas dito ang controls.",
      "account.loginActivity": "Login activity",
      "account.loginActivity.copy": "Lalabas dito ang mga recent na sign-in at login attempt ng account na ito.",
      "account.devices": "Mga device",
      "account.devices.copy": "Tingnan ang mga phone at computer na naka-sign in, kasama ang pinakahuling login activity ng bawat device.",
      "account.payment": "Paraan ng bayad",
      "account.payment.copy": "Magdagdag at pamahalaan ang payment methods dito.",
      "account.links": "Account Connections",
      "account.links.copy": "Ikonekta ang iyong mga account para sa mas mabilis na login at mas magandang experience.",
      "account.preferences": "Mga preference",
      "account.account": "I-delete ang account",
      "account.profileHub.copy": "Piliin kung ano ang gusto mong i-manage sa account na ito.",
      "account.settings.copy": "Pamahalaan ang personal na impormasyon, seguridad, preferences, at account mo.",
      "account.back": "Bumalik",
      "account.phone": "Telepono",
      "account.seller": "Maging Bahagi ng Switch",
      "account.seller.copy": "Pumili ng plan, gumawa ng Switch PIN, tapos i-set up ang company. Kailangang dumaan sa PIN bago mabuksan ang seller admin.",
      "account.seller.start": "Simulan ang upgrade",
      "account.companies": "Mga Company",
      "account.companies.copy": "Pumili ng company, tapos ilagay ang Switch PIN para buksan ang seller admin.",
      "account.companies.empty": "Wala pang seller company na naka-link sa account na ito.",
      "account.companies.open": "Binubuksan ang company workspace...",
      "account.companies.error": "Hindi mabuksan ang company workspace na ito.",
      "account.companies.active": "Kasalukuyan",
      "account.companies.role": "Seller admin",
      "account.companies.add": "Magdagdag ng company",
      "account.pin.title": "Switch PIN",
      "account.pin.enterLead": "Ilagay ang Switch PIN para buksan ang seller admin. Hindi ito ang login password mo.",
      "account.pin.createLead": "Gumawa ng Switch PIN para sa seller admin na ito. Kailangang dumaan sa PIN ang subscriber bago makapasok.",
      "account.pin.create": "Gumawa ng Switch PIN",
      "account.pin.confirm": "Kumpirmahin ang Switch PIN",
      "account.pin.enter": "Switch PIN",
      "account.pin.continue": "Magpatuloy",
      "account.pin.cancel": "Kanselahin",
      "account.pin.checking": "Tinitingnan ang Switch PIN...",
      "account.pin.saving": "Sine-save ang Switch PIN...",
      "notifications.title": "Mga notification",
      "notifications.empty": "Wala pang notification.",
      "notifications.emptyUnread": "Walang unread na notification.",
      "notifications.aria": "Mga notification",
      "notifications.close": "Isara ang mga notification",
      "notifications.filter": "Filter ng notification",
      "notifications.filter.all": "Lahat",
      "notifications.filter.unread": "Unread",
      "notifications.welcome.title": "Maligayang pagdating sa Switch",
      "notifications.welcome.message": "Maligayang pagdating sa Switch! Masaya kaming nandito ka. Mag-enjoy ka sa pag-browse.",
      "language.aria": "Wika",
      "sidebar.close": "Isara ang sidebar",
      "cart.aria": "Cart",
      "shop.back.home": "Home",
      "shop.back.types": "Mga uri ng negosyo",
    },
    zh: {
      "platform.name.shop": "商店",
      "platform.name.food": "美食",
      "platform.name.hotels": "酒店",
      "platform.name.resort": "度假村",
      "platform.title": "你在找什么？",
      "platform.choose": "选择平台",
      "platform.search.placeholder": "搜索美食、酒店、商品...",
      "platform.search.aria": "搜索美食、酒店、商品",
      "platform.search.clear": "清除搜索",
      "platform.search.everything": "搜索全部",
      "platform.search.prefix": "搜索",
      "platform.search.everythingWord": "全部",
      "platform.soon": "即将推出",
      "platform.empty": "暂无平台。",
      "platform.comingSoon": "{name}即将推出。",
      "platform.unavailable": "暂不可用",
      "platform.unavailableMsg": "{name}目前不可用。",
      "account.settings": "账户设置",
      "account.signout": "退出登录",
      "account.menu": "账户菜单",
      "account.page.copy": "你的 Switch 账户详情。",
      "account.page.back": "返回 Switch",
      "account.name": "姓名",
      "account.email": "邮箱",
      "account.id": "账户 ID",
      "notifications.title": "通知",
      "notifications.empty": "暂无通知。",
      "notifications.aria": "通知",
      "language.aria": "语言",
      "shop.back.home": "首页",
      "shop.back.types": "业务类型",
    },
    es: {
      "platform.name.shop": "Tienda",
      "platform.name.food": "Comida",
      "platform.name.hotels": "Hoteles",
      "platform.name.resort": "Resort",
      "platform.title": "¿Qué estás buscando?",
      "platform.choose": "Elige una plataforma",
      "platform.search.placeholder": "Buscar comida, hoteles, artículos...",
      "platform.search.aria": "Buscar comida, hoteles, artículos",
      "platform.search.clear": "Borrar búsqueda",
      "platform.search.everything": "Buscar todo",
      "platform.search.prefix": "Buscar ",
      "platform.search.everythingWord": "todo",
      "platform.soon": "Pronto",
      "platform.empty": "Aún no hay plataformas.",
      "platform.comingSoon": "{name} estará disponible pronto.",
      "platform.unavailable": "No disponible",
      "platform.unavailableMsg": "{name} no está disponible por ahora.",
      "account.settings": "Configuración de la cuenta",
      "account.signout": "Cerrar sesión",
      "account.menu": "Menú de la cuenta",
      "account.page.copy": "Detalles de tu cuenta Switch.",
      "account.page.back": "Volver a Switch",
      "account.name": "Nombre",
      "account.email": "Correo",
      "account.id": "ID de cuenta",
      "notifications.title": "Notificaciones",
      "notifications.empty": "Aún no hay notificaciones.",
      "notifications.aria": "Notificaciones",
      "language.aria": "Idioma",
      "shop.back.home": "Inicio",
      "shop.back.types": "Tipos de negocio",
    },
    ja: {
      "platform.name.shop": "ショップ",
      "platform.name.food": "フード",
      "platform.name.hotels": "ホテル",
      "platform.name.resort": "リゾート",
      "platform.title": "何をお探しですか？",
      "platform.choose": "プラットフォームを選択",
      "platform.search.placeholder": "フード、ホテル、商品を検索...",
      "platform.search.aria": "フード、ホテル、商品を検索",
      "platform.search.clear": "検索をクリア",
      "platform.search.everything": "すべてを検索",
      "platform.soon": "近日公開",
      "platform.empty": "プラットフォームがありません。",
      "platform.comingSoon": "{name}は近日公開です。",
      "platform.unavailable": "利用不可",
      "platform.unavailableMsg": "{name}は現在利用できません。",
      "account.settings": "アカウント設定",
      "account.signout": "サインアウト",
      "account.menu": "アカウントメニュー",
      "account.page.copy": "サインイン中の Switch アカウント情報。",
      "account.page.back": "Switch に戻る",
      "account.name": "名前",
      "account.email": "メール",
      "account.id": "アカウント ID",
      "notifications.title": "通知",
      "notifications.empty": "通知はまだありません。",
      "notifications.aria": "通知",
      "language.aria": "言語",
      "shop.back.home": "ホーム",
      "shop.back.types": "ビジネスタイプ",
    },
    ko: {
      "platform.name.shop": "쇼핑",
      "platform.name.food": "음식",
      "platform.name.hotels": "호텔",
      "platform.name.resort": "리조트",
      "platform.title": "무엇을 찾고 계신가요?",
      "platform.choose": "플랫폼 선택",
      "platform.search.placeholder": "음식, 호텔, 상품 검색...",
      "platform.search.aria": "음식, 호텔, 상품 검색",
      "platform.search.clear": "검색 지우기",
      "platform.search.everything": "모든 항목 검색",
      "platform.soon": "곧 제공",
      "platform.empty": "플랫폼이 없습니다.",
      "platform.comingSoon": "{name}이(가) 곧 제공됩니다.",
      "platform.unavailable": "이용 불가",
      "platform.unavailableMsg": "{name}은(는) 현재 이용할 수 없습니다.",
      "account.settings": "계정 설정",
      "account.signout": "로그아웃",
      "account.menu": "계정 메뉴",
      "account.page.copy": "로그인한 Switch 계정 정보입니다.",
      "account.page.back": "Switch로 돌아가기",
      "account.name": "이름",
      "account.email": "이메일",
      "account.id": "계정 ID",
      "notifications.title": "알림",
      "notifications.empty": "알림이 없습니다.",
      "notifications.aria": "알림",
      "language.aria": "언어",
      "shop.back.home": "홈",
      "shop.back.types": "비즈니스 유형",
    },
    vi: {
      "platform.name.shop": "Cửa hàng",
      "platform.name.food": "Ẩm thực",
      "platform.name.hotels": "Khách sạn",
      "platform.name.resort": "Khu nghỉ dưỡng",
      "platform.title": "Bạn đang tìm gì?",
      "platform.choose": "Chọn nền tảng",
      "platform.search.placeholder": "Tìm đồ ăn, khách sạn, sản phẩm...",
      "platform.search.aria": "Tìm đồ ăn, khách sạn, sản phẩm",
      "platform.search.clear": "Xóa tìm kiếm",
      "platform.soon": "Sắp ra mắt",
      "platform.empty": "Chưa có nền tảng.",
      "platform.comingSoon": "{name} sắp ra mắt.",
      "platform.unavailable": "Không khả dụng",
      "platform.unavailableMsg": "{name} hiện không khả dụng.",
      "account.settings": "Cài đặt tài khoản",
      "account.signout": "Đăng xuất",
      "account.menu": "Menu tài khoản",
      "account.page.copy": "Chi tiết tài khoản Switch đã đăng nhập.",
      "account.page.back": "Quay lại Switch",
      "account.name": "Tên",
      "account.email": "Email",
      "account.id": "ID tài khoản",
      "notifications.title": "Thông báo",
      "notifications.empty": "Chưa có thông báo.",
      "notifications.aria": "Thông báo",
      "language.aria": "Ngôn ngữ",
      "shop.back.home": "Trang chủ",
      "shop.back.types": "Loại hình kinh doanh",
    },
    th: {
      "platform.name.shop": "ร้านค้า",
      "platform.name.food": "อาหาร",
      "platform.name.hotels": "โรงแรม",
      "platform.name.resort": "รีสอร์ต",
      "platform.title": "คุณกำลังมองหาอะไร?",
      "platform.choose": "เลือกแพลตฟอร์ม",
      "platform.search.placeholder": "ค้นหาอาหาร โรงแรม สินค้า...",
      "platform.search.aria": "ค้นหาอาหาร โรงแรม สินค้า",
      "platform.search.clear": "ล้างการค้นหา",
      "platform.soon": "เร็วๆ นี้",
      "platform.empty": "ยังไม่มีแพลตฟอร์ม",
      "platform.comingSoon": "{name} กำลังจะมาเร็วๆ นี้",
      "platform.unavailable": "ไม่พร้อมใช้งาน",
      "platform.unavailableMsg": "{name} ไม่พร้อมใช้งานในขณะนี้",
      "account.settings": "การตั้งค่าบัญชี",
      "account.signout": "ออกจากระบบ",
      "account.menu": "เมนูบัญชี",
      "account.page.copy": "รายละเอียดบัญชี Switch ที่ลงชื่อเข้าใช้",
      "account.page.back": "กลับไปที่ Switch",
      "account.name": "ชื่อ",
      "account.email": "อีเมล",
      "account.id": "รหัสบัญชี",
      "notifications.title": "การแจ้งเตือน",
      "notifications.empty": "ยังไม่มีการแจ้งเตือน",
      "notifications.aria": "การแจ้งเตือน",
      "language.aria": "ภาษา",
      "shop.back.home": "หน้าแรก",
      "shop.back.types": "ประเภทธุรกิจ",
    },
    id: {
      "platform.name.shop": "Toko",
      "platform.name.food": "Makanan",
      "platform.name.hotels": "Hotel",
      "platform.name.resort": "Resor",
      "platform.title": "Apa yang kamu cari?",
      "platform.choose": "Pilih platform",
      "platform.search.placeholder": "Cari makanan, hotel, item...",
      "platform.search.aria": "Cari makanan, hotel, item",
      "platform.search.clear": "Hapus pencarian",
      "platform.soon": "Segera",
      "platform.empty": "Belum ada platform.",
      "platform.comingSoon": "{name} segera hadir.",
      "platform.unavailable": "Tidak tersedia",
      "platform.unavailableMsg": "{name} saat ini tidak tersedia.",
      "account.settings": "Pengaturan akun",
      "account.signout": "Keluar",
      "account.menu": "Menu akun",
      "account.page.copy": "Detail akun Switch yang masuk.",
      "account.page.back": "Kembali ke Switch",
      "account.name": "Nama",
      "account.email": "Email",
      "account.id": "ID akun",
      "notifications.title": "Notifikasi",
      "notifications.empty": "Belum ada notifikasi.",
      "notifications.aria": "Notifikasi",
      "language.aria": "Bahasa",
      "shop.back.home": "Beranda",
      "shop.back.types": "Jenis bisnis",
    },
    fr: {
      "platform.name.shop": "Boutique",
      "platform.name.food": "Restauration",
      "platform.name.hotels": "Hôtels",
      "platform.name.resort": "Complexe hôtelier",
      "platform.title": "Que recherchez-vous ?",
      "platform.choose": "Choisir une plateforme",
      "platform.search.placeholder": "Rechercher nourriture, hôtels, articles...",
      "platform.search.aria": "Rechercher nourriture, hôtels, articles",
      "platform.search.clear": "Effacer la recherche",
      "platform.soon": "Bientôt",
      "platform.empty": "Aucune plateforme pour le moment.",
      "platform.comingSoon": "{name} arrive bientôt.",
      "platform.unavailable": "Indisponible",
      "platform.unavailableMsg": "{name} est actuellement indisponible.",
      "account.settings": "Paramètres du compte",
      "account.signout": "Se déconnecter",
      "account.menu": "Menu du compte",
      "account.page.copy": "Détails de votre compte Switch connecté.",
      "account.page.back": "Retour à Switch",
      "account.name": "Nom",
      "account.email": "E-mail",
      "account.id": "ID du compte",
      "notifications.title": "Notifications",
      "notifications.empty": "Aucune notification pour le moment.",
      "notifications.aria": "Notifications",
      "language.aria": "Langue",
      "shop.back.home": "Accueil",
      "shop.back.types": "Types d’activité",
    },
    de: {
      "platform.name.shop": "Shop",
      "platform.name.food": "Essen",
      "platform.name.hotels": "Hotels",
      "platform.name.resort": "Resort",
      "platform.title": "Wonach suchst du?",
      "platform.choose": "Plattform wählen",
      "platform.search.placeholder": "Essen, Hotels, Artikel suchen...",
      "platform.search.aria": "Essen, Hotels, Artikel suchen",
      "platform.search.clear": "Suche löschen",
      "platform.soon": "Demnächst",
      "platform.empty": "Noch keine Plattformen.",
      "platform.comingSoon": "{name} kommt bald.",
      "platform.unavailable": "Nicht verfügbar",
      "platform.unavailableMsg": "{name} ist derzeit nicht verfügbar.",
      "account.settings": "Kontoeinstellungen",
      "account.signout": "Abmelden",
      "account.menu": "Kontomenü",
      "account.page.copy": "Details deines angemeldeten Switch-Kontos.",
      "account.page.back": "Zurück zu Switch",
      "account.name": "Name",
      "account.email": "E-Mail",
      "account.id": "Konto-ID",
      "notifications.title": "Benachrichtigungen",
      "notifications.empty": "Noch keine Benachrichtigungen.",
      "notifications.aria": "Benachrichtigungen",
      "language.aria": "Sprache",
      "shop.back.home": "Start",
      "shop.back.types": "Geschäftstypen",
    },
    pt: {
      "platform.name.shop": "Loja",
      "platform.name.food": "Comida",
      "platform.name.hotels": "Hotéis",
      "platform.name.resort": "Resort",
      "platform.title": "O que você está procurando?",
      "platform.choose": "Escolha uma plataforma",
      "platform.search.placeholder": "Buscar comida, hotéis, itens...",
      "platform.search.aria": "Buscar comida, hotéis, itens",
      "platform.search.clear": "Limpar busca",
      "platform.soon": "Em breve",
      "platform.empty": "Ainda não há plataformas.",
      "platform.comingSoon": "{name} estará disponível em breve.",
      "platform.unavailable": "Indisponível",
      "platform.unavailableMsg": "{name} está indisponível no momento.",
      "account.settings": "Configurações da conta",
      "account.signout": "Sair",
      "account.menu": "Menu da conta",
      "account.page.copy": "Detalhes da sua conta Switch.",
      "account.page.back": "Voltar ao Switch",
      "account.name": "Nome",
      "account.email": "E-mail",
      "account.id": "ID da conta",
      "notifications.title": "Notificações",
      "notifications.empty": "Ainda não há notificações.",
      "notifications.aria": "Notificações",
      "language.aria": "Idioma",
      "shop.back.home": "Início",
      "shop.back.types": "Tipos de negócio",
    },
    ru: {
      "platform.name.shop": "Магазин",
      "platform.name.food": "Еда",
      "platform.name.hotels": "Отели",
      "platform.name.resort": "Курорт",
      "platform.title": "Что вы ищете?",
      "platform.choose": "Выберите платформу",
      "platform.search.placeholder": "Искать еду, отели, товары...",
      "platform.search.aria": "Искать еду, отели, товары",
      "platform.search.clear": "Очистить поиск",
      "platform.soon": "Скоро",
      "platform.empty": "Платформ пока нет.",
      "platform.comingSoon": "{name} скоро появится.",
      "platform.unavailable": "Недоступно",
      "platform.unavailableMsg": "{name} сейчас недоступен.",
      "account.settings": "Настройки аккаунта",
      "account.signout": "Выйти",
      "account.menu": "Меню аккаунта",
      "account.page.copy": "Данные вашего аккаунта Switch.",
      "account.page.back": "Назад в Switch",
      "account.name": "Имя",
      "account.email": "Эл. почта",
      "account.id": "ID аккаунта",
      "notifications.title": "Уведомления",
      "notifications.empty": "Уведомлений пока нет.",
      "notifications.aria": "Уведомления",
      "language.aria": "Язык",
      "shop.back.home": "Главная",
      "shop.back.types": "Типы бизнеса",
    },
    hi: {
      "platform.name.shop": "दुकान",
      "platform.name.food": "भोजन",
      "platform.name.hotels": "होटल",
      "platform.name.resort": "रिज़ॉर्ट",
      "platform.title": "आप क्या खोज रहे हैं?",
      "platform.choose": "प्लेटफ़ॉर्म चुनें",
      "platform.search.placeholder": "खाना, होटल, आइटम खोजें...",
      "platform.search.aria": "खाना, होटल, आइटम खोजें",
      "platform.search.clear": "खोज साफ़ करें",
      "platform.soon": "जल्द आ रहा है",
      "platform.empty": "अभी कोई प्लेटफ़ॉर्म नहीं।",
      "platform.comingSoon": "{name} जल्द आ रहा है।",
      "platform.unavailable": "अनुपलब्ध",
      "platform.unavailableMsg": "{name} अभी उपलब्ध नहीं है।",
      "account.settings": "खाता सेटिंग्स",
      "account.signout": "साइन आउट",
      "account.menu": "खाता मेनू",
      "account.page.copy": "आपके साइन-इन Switch खाते का विवरण।",
      "account.page.back": "Switch पर वापस जाएँ",
      "account.name": "नाम",
      "account.email": "ईमेल",
      "account.id": "खाता ID",
      "notifications.title": "सूचनाएँ",
      "notifications.empty": "अभी कोई सूचना नहीं।",
      "notifications.aria": "सूचनाएँ",
      "language.aria": "भाषा",
      "shop.back.home": "होम",
      "shop.back.types": "व्यवसाय प्रकार",
    },
    ar: {
      "platform.name.shop": "متجر",
      "platform.name.food": "طعام",
      "platform.name.hotels": "فنادق",
      "platform.name.resort": "منتجع",
      "platform.title": "عمّا تبحث؟",
      "platform.choose": "اختر منصة",
      "platform.search.placeholder": "ابحث عن طعام أو فنادق أو منتجات...",
      "platform.search.aria": "ابحث عن طعام أو فنادق أو منتجات",
      "platform.search.clear": "مسح البحث",
      "platform.soon": "قريبًا",
      "platform.empty": "لا توجد منصات بعد.",
      "platform.comingSoon": "{name} قادم قريبًا.",
      "platform.unavailable": "غير متاح",
      "platform.unavailableMsg": "{name} غير متاح حاليًا.",
      "account.settings": "إعدادات الحساب",
      "account.signout": "تسجيل الخروج",
      "account.menu": "قائمة الحساب",
      "account.page.copy": "تفاصيل حساب Switch المسجّل دخولك.",
      "account.page.back": "العودة إلى Switch",
      "account.name": "الاسم",
      "account.email": "البريد",
      "account.id": "معرّف الحساب",
      "notifications.title": "الإشعارات",
      "notifications.empty": "لا توجد إشعارات بعد.",
      "notifications.aria": "الإشعارات",
      "language.aria": "اللغة",
      "shop.back.home": "الرئيسية",
      "shop.back.types": "أنواع الأعمال",
    },
  };

  function languageLabel(code) {
    const match = LANGUAGE_OPTIONS.find((entry) => entry.code === normalizeLanguage(code));
    return match?.label || "English";
  }

  function getNotificationInitials(value) {
    const parts = String(value || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
    }
    return String(value || "N").trim().slice(0, 2).toUpperCase() || "N";
  }

  function isSwitchBuyerNotification(raw = {}, entry = {}) {
    const type = String(raw.type || entry.type || "").trim().toLowerCase();
    if (type === "welcome") return true;
    const audience = String(raw.audience || "").trim().toLowerCase();
    const sentBy = String(raw.sentBy || raw.createdBy || "").trim().toLowerCase();
    if (audience === "buyer" && (!sentBy || sentBy === "root" || sentBy.includes("super admin") || sentBy === "switch")) {
      return true;
    }
    return sentBy === "root" || sentBy.includes("super admin") || sentBy === "switch";
  }

  function resolveBuyerNotificationPresentation(entry) {
    const raw = entry?.raw && typeof entry.raw === "object" ? entry.raw : {};
    const isSwitch = isSwitchBuyerNotification(raw, entry);
    if (isSwitch) {
      const body = entry.welcome
        ? t("notifications.welcome.message")
        : String(entry.message || entry.title || raw.message || raw.reason || "").trim();
      return {
        isSwitch: true,
        actorName: "",
        avatarUrl: "",
        body,
      };
    }

    const actorName = String(
      raw.companyName
        || raw.storeName
        || raw.businessName
        || raw.sellerName
        || raw.actorName
        || raw.actor?.displayName
        || raw.sentBy
        || raw.createdBy
        || "",
    ).trim();
    const avatarUrl = String(
      raw.companyLogoUrl
        || raw.companyPictureUrl
        || raw.companyProfileImageUrl
        || raw.profileImageUrl
        || raw.avatarUrl
        || raw.actor?.profileImageUrl
        || raw.actor?.avatarUrl
        || "",
    ).trim();
    const body = String(entry.message || raw.message || entry.title || raw.reason || raw.body || "").trim();

    return {
      isSwitch: false,
      actorName,
      avatarUrl,
      body,
    };
  }

  function buildNotificationAvatarMarkup(presentation) {
    if (presentation.isSwitch) {
      return `<img src="${SWITCH_LOGO_PATH}" alt="" loading="lazy" decoding="async" />`;
    }
    if (presentation.avatarUrl) {
      return `<img src="${escapeHtml(presentation.avatarUrl)}" alt="" loading="lazy" decoding="async" />`;
    }
    return escapeHtml(getNotificationInitials(presentation.actorName || "N"));
  }

  function buildNotificationCopyMarkup(presentation) {
    const body = escapeHtml(presentation.body || "");
    if (presentation.isSwitch) {
      return `<p>${body}</p>`;
    }
    if (presentation.actorName) {
      return `<p><strong class="md-notification-panel__actor">${escapeHtml(presentation.actorName)}</strong> ${body}</p>`;
    }
    return `<p>${body}</p>`;
  }

  function buildWelcomeNotification(session) {
    // Parity with Flutter welcomeNotifiedAt — bucket by when welcome was issued,
    // not by account registration age (that made web "Today" while app said "Earlier").
    const existingWelcome = Array.isArray(session?.buyerNotifications)
      ? session.buyerNotifications.find((entry) => {
          const id = String(entry?.id || "").trim();
          const type = String(entry?.type || "").trim().toLowerCase();
          return id === BUYER_WELCOME_NOTIF_ID || type === "welcome" || entry?.welcome === true;
        })
      : null;
    const createdAt = String(
      session?.welcomeNotifiedAt
        || existingWelcome?.createdAt
        || existingWelcome?.sentAt
        || new Date().toISOString(),
    ).trim();
    return {
      id: BUYER_WELCOME_NOTIF_ID,
      type: "welcome",
      title: t("notifications.welcome.title"),
      message: t("notifications.welcome.message"),
      createdAt,
      welcome: true,
    };
  }

  function ensureWelcomeNotification(session) {
    if (!session || typeof session !== "object") return session;
    const list = Array.isArray(session.buyerNotifications)
      ? session.buyerNotifications.slice()
      : [];
    const hasWelcome = list.some((entry) => {
      const id = String(entry?.id || "").trim();
      const type = String(entry?.type || "").trim().toLowerCase();
      return id === BUYER_WELCOME_NOTIF_ID || type === "welcome";
    });
    if (hasWelcome) return session;

    const welcome = {
      id: BUYER_WELCOME_NOTIF_ID,
      type: "welcome",
      title: "Welcome to Switch",
      message: "Welcome to Switch! We're so glad you're here. Enjoy exploring.",
      createdAt: new Date().toISOString(),
      status: "unread",
    };
    const next = {
      ...session,
      buyerNotifications: [welcome, ...list],
      welcomeNotifiedAt: welcome.createdAt,
    };
    // Persist quietly — avoid remount loops from session-updated listeners.
    writeStorage(BUYER_SESSION_KEY, JSON.stringify(next));
    return next;
  }

  function readNotifications(session) {
    const ensured = ensureWelcomeNotification(session) || session;
    const list = Array.isArray(ensured?.buyerNotifications) ? ensured.buyerNotifications : [];
    const mapped = list
      .map((entry, index) => {
        if (!entry || typeof entry !== "object") return null;
        const id = String(entry.id || `buyer-notif-${index}`).trim();
        const type = String(entry.type || "").trim().toLowerCase();
        const isWelcome = id === BUYER_WELCOME_NOTIF_ID || type === "welcome" || entry.welcome === true;
        const title = isWelcome
          ? t("notifications.welcome.title")
          : (String(entry.title || entry.type || "Notification").trim() || "Notification");
        const message = isWelcome
          ? t("notifications.welcome.message")
          : String(entry.message || entry.reason || entry.body || "").trim();
        const createdAt = isWelcome
          ? String(
              ensured?.welcomeNotifiedAt
                || entry.createdAt
                || entry.sentAt
                || "",
            ).trim()
          : String(entry.createdAt || entry.sentAt || "").trim();
        return { id, title, message, createdAt, welcome: isWelcome, raw: entry };
      })
      .filter(Boolean);

    if (!mapped.some((entry) => entry.welcome)) {
      mapped.unshift(buildWelcomeNotification(ensured));
    }

    mapped.sort((left, right) => {
      if (left.welcome && !right.welcome) return -1;
      if (!left.welcome && right.welcome) return 1;
      return String(right.createdAt || "").localeCompare(String(left.createdAt || ""));
    });
    return mapped;
  }

  function readReadNotificationIds(accountId) {
    try {
      const raw = window.localStorage.getItem(`${BUYER_NOTIF_READ_KEY}:${accountId}`) || "[]";
      const parsed = JSON.parse(raw);
      return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
    } catch (_) {
      return new Set();
    }
  }

  function writeReadNotificationIds(accountId, ids) {
    try {
      window.localStorage.setItem(
        `${BUYER_NOTIF_READ_KEY}:${accountId}`,
        JSON.stringify([...ids]),
      );
    } catch (_) {}
  }

  function mountRightPanel(panel) {
    const siteHeader = document.querySelector("body > .login-site-header");
    if (siteHeader) siteHeader.insertAdjacentElement("afterend", panel);
    else document.body.appendChild(panel);
  }

  function controlledRightPanel(menu) {
    const trigger = menu?.querySelector(
      "[data-md-account-trigger], [data-md-language-trigger], [data-md-notification-trigger]",
    );
    const panelId = trigger?.getAttribute("aria-controls") || "";
    return panelId ? document.getElementById(panelId) : null;
  }

  function closeHeaderMenus(except = null, options = {}) {
    document.querySelectorAll(
      ".md-account-menu.is-open, .md-header-language.is-open, .md-notification-menu.is-open",
    ).forEach((menu) => {
      if (except && menu === except) return;
      menu.classList.remove("is-open");
      const trigger = menu.querySelector(
        "[data-md-account-trigger], [data-md-language-trigger], [data-md-notification-trigger]",
      );
      trigger?.setAttribute("aria-expanded", "false");
      const panel = controlledRightPanel(menu);
      if (panel) panel.hidden = true;
    });
    if (!options.keepRightPanelSpace) {
      document.body.classList.remove("md-right-panel-open");
    }
  }

  function openRightPanel(menu, panel, trigger, onOpen) {
    const sidebarWasOpen = document.body.classList.contains("md-right-panel-open");
    closeHeaderMenus(menu, { keepRightPanelSpace: sidebarWasOpen });

    menu.classList.add("is-open");
    trigger?.setAttribute("aria-expanded", "true");
    panel.hidden = false;
    panel.classList.remove("is-entering", "is-switching");
    void panel.offsetWidth;
    panel.classList.add(sidebarWasOpen ? "is-switching" : "is-entering");
    document.body.classList.add("md-right-panel-open");
    if (typeof onOpen === "function") onOpen();
  }

  function toggleRightPanel(menu, panel, trigger, onOpen) {
    if (menu.classList.contains("is-open")) {
      closeHeaderMenus();
      return;
    }
    openRightPanel(menu, panel, trigger, onOpen);
  }

  function syncSiteHeaderHeight() {
    const header = document.querySelector("body > .login-site-header");
    if (!(header instanceof HTMLElement)) return;
    const height = Math.round(header.getBoundingClientRect().height);
    if (height > 0) {
      document.documentElement.style.setProperty("--md-site-header-height", `${height}px`);
    }
  }

  function buildInviteCode(accountId) {
    const raw = String(accountId || "").trim();
    if (!raw || raw === "—") return "";
    let hash = 2166136261;
    for (let i = 0; i < raw.length; i += 1) {
      hash ^= raw.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    const digest = (hash >>> 0).toString(36).toUpperCase().padStart(7, "0").slice(-7);
    return `SW${digest}`;
  }

  function buildInviteLink(code) {
    const inviteCode = String(code || "").trim().toUpperCase();
    if (!inviteCode) return "";
    const origin = String(window.location.origin || "").replace(/\/$/, "") || "";
    return `${origin}${LOGIN_PATH}?ref=${encodeURIComponent(inviteCode)}`;
  }

  function inviteQrImageUrl(link) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=12&data=${encodeURIComponent(link)}`;
  }

  function readJsonStorage(key, fallback) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : fallback;
    } catch {
      return fallback;
    }
  }

  function writeJsonStorage(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore quota */
    }
  }

  function getInviteStats(accountId) {
    const id = String(accountId || "").trim();
    const all = readJsonStorage(BUYER_INVITE_STATS_KEY, {});
    const row = id && all[id] ? all[id] : {};
    return {
      referred: Math.max(0, Number(row.referred) || 0),
      earned: Math.max(0, Number(row.earned) || 0),
    };
  }

  function setInviteStats(accountId, stats) {
    const id = String(accountId || "").trim();
    if (!id) return;
    const all = readJsonStorage(BUYER_INVITE_STATS_KEY, {});
    all[id] = {
      referred: Math.max(0, Number(stats.referred) || 0),
      earned: Math.max(0, Number(stats.earned) || 0),
    };
    writeJsonStorage(BUYER_INVITE_STATS_KEY, all);
  }

  function registerInviteCode(accountId, code) {
    const id = String(accountId || "").trim();
    const inviteCode = String(code || "").trim().toUpperCase();
    if (!id || !inviteCode) return;
    const index = readJsonStorage(BUYER_INVITE_INDEX_KEY, {});
    index[inviteCode] = id;
    writeJsonStorage(BUYER_INVITE_INDEX_KEY, index);
  }

  function formatInviteEarned(amount) {
    const value = Math.max(0, Number(amount) || 0);
    return `₱${value.toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
  }

  function capturePendingInviteRef() {
    try {
      const params = new URLSearchParams(window.location.search || "");
      const ref = String(params.get("ref") || "").trim().toUpperCase();
      if (!ref) return;
      window.localStorage.setItem(BUYER_INVITE_PENDING_KEY, ref);
    } catch {
      /* ignore */
    }
  }

  function applyPendingInviteCredit(session) {
    const accountId = String(session?.accountId || session?.id || "").trim();
    if (!accountId) return;
    let pending = "";
    try {
      pending = String(window.localStorage.getItem(BUYER_INVITE_PENDING_KEY) || "").trim().toUpperCase();
    } catch {
      return;
    }
    if (!pending) return;

    const myCode = buildInviteCode(accountId);
    if (!myCode || pending === myCode) {
      try {
        window.localStorage.removeItem(BUYER_INVITE_PENDING_KEY);
      } catch {
        /* ignore */
      }
      return;
    }

    const creditedKey = `gms-buyer-invite-credited:${accountId}`;
    try {
      if (window.localStorage.getItem(creditedKey)) {
        window.localStorage.removeItem(BUYER_INVITE_PENDING_KEY);
        return;
      }
    } catch {
      return;
    }

    const index = readJsonStorage(BUYER_INVITE_INDEX_KEY, {});
    const referrerId = String(index[pending] || "").trim();
    if (!referrerId || referrerId === accountId) return;

    const stats = getInviteStats(referrerId);
    stats.referred += 1;
    stats.earned += BUYER_INVITE_REWARD_PHP;
    setInviteStats(referrerId, stats);
    try {
      window.localStorage.setItem(creditedKey, pending);
      window.localStorage.removeItem(BUYER_INVITE_PENDING_KEY);
    } catch {
      /* ignore */
    }
  }

  function voucherIconSvg(kind = "ticket") {
    const icons = {
      percent: '<path d="M19 5 5 19"/><circle cx="7" cy="7" r="2"/><circle cx="17" cy="17" r="2"/><path d="M4 4h16v16H4z"/>',
      gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/><path d="M7.5 8A2.5 2.5 0 1 1 12 6.5V8M16.5 8A2.5 2.5 0 1 0 12 6.5V8"/>',
      shipping: '<path d="M10 17h4V5H2v12h3"/><path d="M14 9h4l4 4v4h-3"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="17.5" r="2.5"/>',
      shopping: '<path d="M6 8h12l1 13H5L6 8Z"/><path d="M9 10V6a3 3 0 0 1 6 0v4"/>',
      loyalty: '<path d="M20.59 13.41 11 3.83V3H4v7h.83l9.58 9.59a2 2 0 0 0 2.82 0l3.36-3.36a2 2 0 0 0 0-2.82Z"/><circle cx="7.5" cy="6.5" r="1"/>',
      ticket: '<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2M13 11v2M13 17v2"/>',
    };
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[kind] || icons.ticket}</svg>`;
  }

  function normalizeBuyerVoucher(entry = {}) {
    const status = ["active", "used", "expired"].includes(entry.status)
      ? entry.status
      : "active";
    const kind = ["percent", "gift", "shipping", "shopping", "loyalty", "ticket"].includes(entry.kind)
      ? entry.kind
      : "ticket";
    const action = ["useNow", "apply", "used", "expired"].includes(entry.action)
      ? entry.action
      : status === "active"
        ? "useNow"
        : status;
    const note = String(entry.note || "")
      .replace(/\r\n/g, "\n")
      .replace(/\n/g, "<br>");
    const discountType =
      String(entry.discountType || "").trim().toLowerCase() === "fixed" ||
      kind === "gift"
        ? "fixed"
        : "percent";
    const discountValue = String(entry.discountValue || "").replace(/[^\d]/g, "");
    const freeShipping = Boolean(
      entry.freeShipping ?? entry.isFreeShipping ?? kind === "shipping",
    );
    const storedTitle = String(entry.title || "").trim();
    const derivedTitle = discountValue
      ? discountType === "fixed"
        ? `₱${discountValue} OFF`
        : `${discountValue}% OFF`
      : freeShipping
        ? "Free Shipping"
        : "";
    const title = String(storedTitle || derivedTitle || "")
      .replace(/₱/g, "&#8369;")
      .replace(/\u20B1/g, "&#8369;");
    return {
      id: String(entry.id || entry.code || ""),
      status,
      kind,
      title,
      subtitle: String(entry.subtitle || ""),
      minimumSpend: String(entry.minimumSpend || "0").replace(/[^\d]/g, "") || "0",
      code: String(entry.code || "").trim().toUpperCase(),
      badge: String(entry.badge || "Sitewide"),
      date: String(entry.date || ""),
      action,
      note: note || "A deal<br>for you!",
      platformId: String(entry.platformId || entry.platform || "all")
        .trim()
        .toLowerCase() || "all",
      statusAt: String(entry.statusAt || ""),
      updatedAt: String(entry.updatedAt || ""),
      createdAt: String(entry.createdAt || ""),
    };
  }

  function voucherPlatformLabel(platformId) {
    const id = String(platformId || "").trim().toLowerCase();
    if (!id || id === "all") return t("account.vouchers.platformAll") || "All platforms";
    if (id === "shop") return t("platform.name.shop");
    if (id === "food") return t("platform.name.food");
    if (id === "hotels") return t("platform.name.hotels");
    if (id === "resort") return t("platform.name.resort");
    return id.charAt(0).toUpperCase() + id.slice(1);
  }

  async function loadBuyerVouchers({ force = false } = {}) {
    if (buyerVouchersLoading && !force) return buyerVouchersLoading;
    buyerVouchersLoading = (async () => {
      try {
        const response = await fetch("/api/vouchers", {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload.message || "Unable to load vouchers.");
        }
        const next = Array.isArray(payload.vouchers)
          ? payload.vouchers
              .map(normalizeBuyerVoucher)
              .filter((entry) => entry.code && keepBuyerVoucher(entry))
          : [];
        if (next.length) {
          BUYER_VOUCHERS = next;
        }
      } catch (_) {
        if (!BUYER_VOUCHERS.length) {
          BUYER_VOUCHERS = BUYER_VOUCHERS_FALLBACK.filter(keepBuyerVoucher);
        }
      } finally {
        buyerVouchersLoading = null;
      }
      return BUYER_VOUCHERS;
    })();
    return buyerVouchersLoading;
  }

  function accountVoucherCardHtml(voucher) {
    const status = ["active", "used", "expired"].includes(voucher.status)
      ? voucher.status
      : "active";
    const isActive = status === "active";
    const dateKey = status === "active"
      ? "account.vouchers.expires"
      : status === "used"
        ? "account.vouchers.usedOn"
        : "account.vouchers.expiredOn";
    const badge = String(voucher.badge || "").trim();
    const showEyebrow =
      badge && badge.toLowerCase() !== "sitewide" ? badge.toUpperCase() : "";
    const platformId = String(voucher.platformId || "all").trim().toLowerCase() || "all";
    const artMarkup =
      !platformId || platformId === "all"
        ? `<img class="md-account-voucher__logo" src="${SWITCH_LOGO_PATH}" alt="" width="28" height="28" loading="lazy" decoding="async" />`
        : `<span class="md-account-voucher__icon">${voucherIconSvg(voucher.kind)}</span>`;
    const searchText = [
      voucher.title,
      voucher.subtitle,
      voucher.code,
      voucher.badge,
      voucherPlatformLabel(voucher.platformId),
    ]
      .join(" ")
      .replace(/&#8369;/g, "peso");

    return `
      <article
        class="md-account-voucher${isActive ? "" : " is-muted"}"
        data-md-voucher-card
        data-voucher-status="${escapeHtml(status)}"
        data-voucher-platform="${escapeHtml(voucher.platformId || "all")}"
        data-voucher-search="${escapeHtml(searchText)}"
        ${isActive ? `data-md-voucher-copy="${escapeHtml(voucher.code)}"` : ""}
        ${isActive ? "" : "hidden"}
        ${isActive ? `role="button" tabindex="0" aria-label="${escapeHtml(`${t("account.vouchers.code")} ${voucher.code}`)}"` : ""}
      >
        <div class="md-account-voucher__art">${artMarkup}</div>
        <div class="md-account-voucher__details">
          ${showEyebrow ? `<span class="md-account-voucher__eyebrow">${escapeHtml(showEyebrow)}</span>` : ""}
          <h3 class="md-account-voucher__title">${voucher.title}</h3>
          <span class="md-account-voucher__divider" aria-hidden="true"></span>
          <small class="md-account-voucher__minimum">${escapeHtml(t("account.vouchers.minSpend"))} &#8369;${escapeHtml(voucher.minimumSpend)}</small>
          <div class="md-account-voucher__footer">
            <strong class="md-account-voucher__code">${escapeHtml(voucher.code)}</strong>
            <small class="md-account-voucher__date">${escapeHtml(t(dateKey))} ${escapeHtml(voucher.date)}</small>
          </div>
        </div>
      </article>
    `;
  }

  function accountVouchersHtml() {
    return `
      <div class="md-account-vouchers">
        <div class="md-account-vouchers__search" data-md-voucher-search-wrap hidden>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input type="search" data-md-voucher-search placeholder="${escapeHtml(t("account.vouchers.searchPlaceholder"))}" autocomplete="off" />
        </div>
        <div class="md-account-vouchers__toolbar">
          <div class="md-account-vouchers__tabs" role="tablist" aria-label="${escapeHtml(t("account.vouchers"))}">
            <button type="button" class="is-active" data-md-voucher-status="active" role="tab" aria-selected="true">${escapeHtml(t("account.vouchers.active"))}</button>
            <button type="button" data-md-voucher-status="used" role="tab" aria-selected="false">${escapeHtml(t("account.vouchers.used"))}</button>
            <button type="button" data-md-voucher-status="expired" role="tab" aria-selected="false">${escapeHtml(t("account.vouchers.expired"))}</button>
          </div>
          <button type="button" class="md-account-vouchers__icon-button" data-md-voucher-reverse aria-label="${escapeHtml(t("account.vouchers.reverse"))}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4"/></svg>
          </button>
        </div>
        <div class="md-account-vouchers__list" data-md-voucher-list>
          ${BUYER_VOUCHERS.map(accountVoucherCardHtml).join("")}
        </div>
        <div class="md-account-vouchers__empty" data-md-voucher-empty hidden>
          ${voucherIconSvg("ticket")}
          <strong>${escapeHtml(t("account.vouchers.empty"))}</strong>
          <span>${escapeHtml(t("account.vouchers.emptyCopy"))}</span>
        </div>
        <p class="md-account-vouchers__feedback" data-md-voucher-feedback role="status" aria-live="polite" hidden></p>
      </div>
    `;
  }

  function bindVoucherPanel(panel) {
    const voucherView = panel.querySelector('[data-md-account-view="vouchers"]');
    if (!voucherView || voucherView.dataset.mdVoucherBound === "1") return;
    voucherView.dataset.mdVoucherBound = "1";

    const tabs = Array.from(voucherView.querySelectorAll("[data-md-voucher-status]"));
    const list = voucherView.querySelector("[data-md-voucher-list]");
    const empty = voucherView.querySelector("[data-md-voucher-empty]");
    const searchToggle = panel.querySelector("[data-md-voucher-search-toggle]");
    const searchWrap = voucherView.querySelector("[data-md-voucher-search-wrap]");
    const searchInput = voucherView.querySelector("[data-md-voucher-search]");
    const reverseButton = voucherView.querySelector("[data-md-voucher-reverse]");
    const feedback = voucherView.querySelector("[data-md-voucher-feedback]");
    let activeStatus = "active";
    let newestFirst = true;

    const getCards = () => Array.from(voucherView.querySelectorAll("[data-md-voucher-card]"));

    const refreshCards = () => {
      if (!list) return;
      list.innerHTML = BUYER_VOUCHERS.map(accountVoucherCardHtml).join("");
      list.querySelectorAll("[data-md-voucher-copy], [data-md-voucher-use]").forEach((button) => {
        const copy = () => {
          const card = button.closest("[data-md-voucher-card]") || button;
          copyVoucherCode(
            button.getAttribute("data-md-voucher-copy") ||
              button.getAttribute("data-md-voucher-use"),
            card?.dataset?.voucherPlatform || "all",
          );
        };
        button.addEventListener("click", copy);
        button.addEventListener("keydown", (event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          copy();
        });
      });
    };

    const render = () => {
      const query = String(searchInput?.value || "").trim().toLowerCase();
      let visibleCount = 0;
      getCards().forEach((card) => {
        const statusMatch = card.dataset.voucherStatus === activeStatus;
        const queryMatch =
          !query ||
          String(card.dataset.voucherSearch || "").toLowerCase().includes(query);
        const visible = statusMatch && queryMatch;
        card.hidden = !visible;
        if (visible) visibleCount += 1;
      });
      if (empty) empty.hidden = visibleCount > 0;
    };

    const copyVoucherCode = async (code, platformId = "all") => {
      const value = String(code || "").trim();
      if (!value) return;
      const scoped = String(platformId || "all").trim().toLowerCase() || "all";
      const current = currentPlatformId();
      const mismatch =
        current &&
        current !== "all" &&
        scoped &&
        scoped !== "all" &&
        scoped !== current;
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(value);
        } else {
          const input = document.createElement("textarea");
          input.value = value;
          input.setAttribute("readonly", "");
          input.style.position = "fixed";
          input.style.left = "-9999px";
          document.body.appendChild(input);
          input.select();
          document.execCommand("copy");
          input.remove();
        }
        if (feedback) {
          feedback.textContent = mismatch
            ? `${value} — ${t("account.vouchers.platformOnly").replace("{platform}", voucherPlatformLabel(scoped))}`
            : `${value} — ${t("account.vouchers.copied")} (${voucherPlatformLabel(scoped)})`;
          feedback.hidden = false;
        }
      } catch {
        if (feedback) {
          feedback.textContent = value;
          feedback.hidden = false;
        }
      }
    };

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        activeStatus = tab.dataset.mdVoucherStatus || "active";
        tabs.forEach((item) => {
          const selected = item === tab;
          item.classList.toggle("is-active", selected);
          item.setAttribute("aria-selected", selected ? "true" : "false");
        });
        if (feedback) feedback.hidden = true;
        render();
      });
    });

    searchToggle?.addEventListener("click", () => {
      const open = Boolean(searchWrap?.hidden);
      if (searchWrap) searchWrap.hidden = !open;
      searchToggle.setAttribute("aria-expanded", open ? "true" : "false");
      searchToggle.classList.toggle("is-open", open);
      if (open) {
        window.setTimeout(() => searchInput?.focus(), 0);
      } else if (searchInput) {
        searchInput.value = "";
        render();
      }
    });
    searchInput?.addEventListener("input", render);

    reverseButton?.addEventListener("click", () => {
      if (!list) return;
      newestFirst = !newestFirst;
      const cards = getCards();
      cards.reverse().forEach((card) => list.appendChild(card));
      reverseButton.classList.toggle("is-reversed", !newestFirst);
      render();
    });

    voucherView.refreshBuyerVouchers = async () => {
      await loadBuyerVouchers({ force: true });
      refreshCards();
      render();
    };

    refreshCards();
    render();
    void loadBuyerVouchers().then(() => {
      refreshCards();
      render();
    });
  }

  function bindInvitePanel(panel, session) {
    const accountId = String(session?.accountId || session?.id || "").trim();
    const code = buildInviteCode(accountId);
    const link = buildInviteLink(code);
    if (!code || !link) return;

    registerInviteCode(accountId, code);
    const stats = getInviteStats(accountId);

    const earnedEl = panel.querySelector("[data-md-invite-earned]");
    const referredEl = panel.querySelector("[data-md-invite-referred]");
    const codeEl = panel.querySelector("[data-md-invite-code]");
    const copyBtn = panel.querySelector("[data-md-invite-copy]");
    const qrEl = panel.querySelector("[data-md-invite-qr]");
    const sendBtn = panel.querySelector("[data-md-invite-send]");
    const feedbackEl = panel.querySelector("[data-md-invite-feedback]");

    if (earnedEl) earnedEl.textContent = formatInviteEarned(stats.earned);
    if (referredEl) referredEl.textContent = String(stats.referred);
    if (codeEl) codeEl.textContent = code;
    if (qrEl) {
      qrEl.src = inviteQrImageUrl(link);
      qrEl.alt = t("account.invite.qrAlt");
    }

    const setFeedback = (message) => {
      if (!feedbackEl) return;
      feedbackEl.textContent = message;
      feedbackEl.hidden = !message;
    };

    copyBtn?.addEventListener("click", async () => {
      setFeedback("");
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(code);
        } else {
          const input = document.createElement("textarea");
          input.value = code;
          input.setAttribute("readonly", "");
          input.style.position = "fixed";
          input.style.left = "-9999px";
          document.body.appendChild(input);
          input.select();
          document.execCommand("copy");
          input.remove();
        }
        setFeedback(t("account.invite.codeCopied"));
      } catch {
        setFeedback(code);
      }
    });

    sendBtn?.addEventListener("click", async () => {
      setFeedback("");
      sendBtn.disabled = true;
      try {
        if (typeof navigator.share === "function") {
          try {
            await navigator.share({
              title: t("account.invite.shareTitle"),
              text: `${t("account.invite.shareText")} ${link}`,
              url: link,
            });
            return;
          } catch (error) {
            if (error?.name === "AbortError") return;
          }
        }
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(link);
        } else {
          const input = document.createElement("textarea");
          input.value = link;
          input.setAttribute("readonly", "");
          input.style.position = "fixed";
          input.style.left = "-9999px";
          document.body.appendChild(input);
          input.select();
          document.execCommand("copy");
          input.remove();
        }
        setFeedback(t("account.invite.copied"));
      } catch {
        setFeedback(link);
      } finally {
        sendBtn.disabled = false;
      }
    });
  }

  function getMdAccountDeviceKey() {
    const storageKey = "gms_account_device_key";
    try {
      const existing = String(window.localStorage.getItem(storageKey) || "").trim();
      if (existing) return existing;
      const generated = `web_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      window.localStorage.setItem(storageKey, generated);
      return generated;
    } catch (_) {
      return `web_${Date.now().toString(36)}`;
    }
  }

  function mdDeviceKind(device) {
    const haystack = [
      device?.deviceType,
      device?.deviceName,
      device?.osName,
      device?.clientName,
    ]
      .map((value) => String(value || "").toLowerCase())
      .join(" ");
    if (haystack.includes("ipad") || haystack.includes("tablet")) return "tablet";
    if (haystack.includes("iphone") || haystack.includes("ios")) return "ios";
    if (haystack.includes("android") || haystack.includes("phone")) return "android";
    if (haystack.includes("windows")) return "windows";
    if (haystack.includes("mac")) return "mac";
    return "computer";
  }

  function mdDeviceArtSvg(device) {
    const kind = mdDeviceKind(device);
    if (kind === "android") {
      return `<img src="/assets/device-android-art.png" alt="" draggable="false" />`;
    }
    if (kind === "ios" || kind === "tablet") {
      return `<img src="/assets/device-ios-art.png" alt="" draggable="false" />`;
    }
    return `<img src="/assets/device-monitor-art.png" alt="" draggable="false" />`;
  }

  function mdDeviceSubtitle(device) {
    const parts = [];
    const clientName = String(device?.clientName || "").trim();
    const osName = String(device?.osName || "").trim();
    const deviceName = String(device?.deviceName || "").trim();
    if (clientName) parts.push(clientName);
    if (osName && osName.toLowerCase() !== deviceName.toLowerCase()) parts.push(osName);
    return parts.join(" / ");
  }

  function mdFormatDeviceActive(device) {
    if (device?.isCurrent) return "Active now";
    const raw = String(device?.lastActiveAt || device?.createdAt || "").trim();
    const parsed = raw ? new Date(raw) : null;
    if (!parsed || Number.isNaN(parsed.getTime())) return "Recently active";
    const mins = Math.floor((Date.now() - parsed.getTime()) / 60000);
    if (mins < 1) return "Active just now";
    if (mins < 60) return `Active ${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Active ${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `Active ${days}d ago`;
    return `Active ${parsed.toLocaleDateString()}`;
  }

  function mdFormatDeviceDate(device) {
    const raw = String(device?.lastActiveAt || device?.createdAt || "").trim();
    const parsed = raw ? new Date(raw) : null;
    if (!parsed || Number.isNaN(parsed.getTime())) return "Not available";
    try {
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(parsed);
    } catch (_) {
      return parsed.toLocaleString();
    }
  }

  function mdDeviceStatus(device) {
    if (device?.isCurrent) return { key: "current", label: "Current Device" };
    const raw = String(device?.lastActiveAt || device?.createdAt || "").trim();
    const timestamp = raw ? Date.parse(raw) : Number.NaN;
    const isActive = Number.isFinite(timestamp) && Date.now() - timestamp <= 24 * 60 * 60 * 1000;
    return isActive
      ? { key: "active", label: "Active" }
      : { key: "inactive", label: "Inactive" };
  }

  function mdDeviceMetaIcon(kind) {
    if (kind === "location") {
      return `<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M15 8.2c0 3.6-5 8.2-5 8.2S5 11.8 5 8.2a5 5 0 1 1 10 0Z" stroke="currentColor" stroke-width="1.5"/><circle cx="10" cy="8" r="1.7" stroke="currentColor" stroke-width="1.5"/></svg>`;
    }
    return `<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="6.5" stroke="currentColor" stroke-width="1.5"/><path d="M10 6.5V10l2.5 1.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;
  }

  function renderMdAccountDevices(panel, devices = []) {
    const root = panel.querySelector("[data-md-account-devices]");
    if (!root) return;
    const list = root.querySelector("[data-md-devices-list]");
    const empty = root.querySelector("[data-md-devices-empty]");
    const revokeOthers = root.querySelector("[data-md-devices-revoke-others]");
    if (!list || !empty) return;
    list.innerHTML = "";
    if (!devices.length) {
      empty.hidden = false;
      empty.textContent = "No signed-in devices yet.";
      list.hidden = true;
      if (revokeOthers) revokeOthers.hidden = true;
      return;
    }
    empty.hidden = true;
    list.hidden = false;
    devices.forEach((device, index) => {
      const status = mdDeviceStatus(device);
      const location = String(device?.locationLabel || "Location unavailable").trim();
      const subtitle = mdDeviceSubtitle(device) || "Switch session";
      const detailsId = `md-device-details-${index}`;
      const item = document.createElement("li");
      item.className = `md-account-devices__item is-${status.key}`;
      item.innerHTML = `
        <div class="md-account-devices__main">
          <span class="md-account-devices__art md-account-devices__art--${escapeHtml(mdDeviceKind(device))}" aria-hidden="true">${mdDeviceArtSvg(device)}</span>
          <span class="md-account-devices__copy">
            <strong>${escapeHtml(device.deviceName || "Device")}</strong>
            <span class="md-account-devices__platform">${escapeHtml(subtitle)}</span>
            <span class="md-account-devices__meta">${mdDeviceMetaIcon("location")}${escapeHtml(location)}</span>
            <em class="md-account-devices__meta">${mdDeviceMetaIcon("time")}${escapeHtml(mdFormatDeviceActive(device))}</em>
          </span>
          <span class="md-account-devices__status md-account-devices__status--${status.key}"><i aria-hidden="true"></i>${escapeHtml(status.label)}</span>
        </div>
        <div class="md-account-devices__actions">
          <button type="button" class="md-account-devices__details-button" data-md-device-details aria-expanded="false" aria-controls="${detailsId}">
            <span>View Details</span>
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m7.5 5 5 5-5 5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </div>
        <div class="md-account-devices__details" id="${detailsId}" hidden>
          <div><span>Device</span><strong>${escapeHtml(device.deviceName || "Device")}</strong></div>
          <div><span>Platform</span><strong>${escapeHtml(subtitle)}</strong></div>
          <div><span>Location</span><strong>${escapeHtml(location)}</strong></div>
          <div><span>Last login activity</span><strong>${escapeHtml(mdFormatDeviceDate(device))}</strong></div>
        </div>
        ${
          device.isCurrent
            ? ""
            : `<button type="button" class="md-account-devices__signout" data-md-device-revoke="${escapeHtml(device.id || "")}" data-md-device-key="${escapeHtml(device.deviceKey || "")}" data-md-device-name="${escapeHtml(device.deviceName || "Device")}">Sign Out</button>`
        }
      `;
      list.appendChild(item);
    });
    if (revokeOthers) {
      revokeOthers.hidden = !devices.some((device) => !device.isCurrent);
    }
  }

  async function loadMdAccountDevices(panel) {
    const session = readBuyerSession();
    const accountId = String(session?.accountId || session?.id || "").trim();
    const root = panel.querySelector("[data-md-account-devices]");
    const empty = root?.querySelector("[data-md-devices-empty]");
    const list = root?.querySelector("[data-md-devices-list]");
    const feedback = root?.querySelector("[data-md-devices-feedback]");
    if (!accountId) {
      if (empty) {
        empty.hidden = false;
        empty.textContent = "Sign in again to manage devices.";
      }
      if (list) list.hidden = true;
      return;
    }
    if (empty) {
      empty.hidden = false;
      empty.textContent = "Loading signed-in devices…";
    }
    if (list) list.hidden = true;
    if (feedback) feedback.textContent = "";
    try {
      const deviceKey = getMdAccountDeviceKey();
      const response = await fetch("/api/account/devices/register", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          accountId,
          email: String(session?.email || "").trim(),
          deviceKey,
          userAgent: navigator.userAgent || "",
          clientKind: "browser",
          locationLabel: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 401 && payload.code === "device_revoked") {
          forgetRememberedLogin(session);
          signOut();
          return;
        }
        throw new Error(payload.message || "Unable to load devices.");
      }
      renderMdAccountDevices(panel, Array.isArray(payload.devices) ? payload.devices : []);
    } catch (error) {
      if (empty) {
        empty.hidden = false;
        empty.textContent =
          error instanceof Error ? error.message : "Unable to load devices.";
      }
      if (list) {
        list.hidden = true;
        list.innerHTML = "";
      }
    }
  }

  function bindMdAccountDevices(panel) {
    const root = panel.querySelector("[data-md-account-devices]");
    if (!root || root.dataset.bound === "1") return;
    root.dataset.bound = "1";
    root.addEventListener("click", async (event) => {
      const session = readBuyerSession();
      const accountId = String(session?.accountId || session?.id || "").trim();
      const feedback = root.querySelector("[data-md-devices-feedback]");
      const detailsBtn = event.target.closest("[data-md-device-details]");
      const revokeBtn = event.target.closest("[data-md-device-revoke]");
      const revokeOthersBtn = event.target.closest("[data-md-devices-revoke-others]");

      if (detailsBtn) {
        const detailsId = String(detailsBtn.getAttribute("aria-controls") || "").trim();
        const details = detailsId ? document.getElementById(detailsId) : null;
        if (!details || !root.contains(details)) return;
        const shouldOpen = detailsBtn.getAttribute("aria-expanded") !== "true";
        detailsBtn.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
        const label = detailsBtn.querySelector("span");
        if (label) label.textContent = shouldOpen ? "Hide Details" : "View Details";
        details.hidden = !shouldOpen;
        return;
      }

      if (!accountId) return;

      if (revokeBtn) {
        const deviceId = String(revokeBtn.getAttribute("data-md-device-revoke") || "").trim();
        const deviceKey = String(revokeBtn.getAttribute("data-md-device-key") || "").trim();
        const deviceName = String(revokeBtn.getAttribute("data-md-device-name") || "Device");
        if (!deviceId) return;
        if (deviceKey && deviceKey === getMdAccountDeviceKey()) return;
        if (!window.confirm(`${deviceName} will be signed out right away. The saved sign-in on that phone, computer, or Apple device will be removed.`)) {
          return;
        }
        revokeBtn.disabled = true;
        try {
          const response = await fetch("/api/account/devices/revoke", {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({
              accountId,
              deviceId,
              deviceKey,
              keepDeviceKey: getMdAccountDeviceKey(),
            }),
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(payload.message || "Unable to sign out device.");
          }
          renderMdAccountDevices(panel, Array.isArray(payload.devices) ? payload.devices : []);
          if (feedback) feedback.textContent = payload.message || "Device signed out.";
        } catch (error) {
          if (feedback) {
            feedback.textContent =
              error instanceof Error ? error.message : "Unable to sign out device.";
          }
        } finally {
          revokeBtn.disabled = false;
        }
        return;
      }

      if (revokeOthersBtn) {
        if (!window.confirm("Sign out all other devices? You stay signed in here.")) {
          return;
        }
        revokeOthersBtn.disabled = true;
        try {
          const deviceKey = getMdAccountDeviceKey();
          const response = await fetch("/api/account/devices/revoke", {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({
              accountId,
              revokeOthers: true,
              keepDeviceKey: deviceKey,
              currentDeviceKey: deviceKey,
            }),
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(payload.message || "Unable to sign out other devices.");
          }
          renderMdAccountDevices(panel, Array.isArray(payload.devices) ? payload.devices : []);
          if (feedback) feedback.textContent = payload.message || "Other devices signed out.";
        } catch (error) {
          if (feedback) {
            feedback.textContent =
              error instanceof Error ? error.message : "Unable to sign out other devices.";
          }
        } finally {
          revokeOthersBtn.disabled = false;
        }
      }
    });
  }

  function accountAddressStorageKey(session = {}) {
    const accountKey = String(
      session.accountId || session.id || session.email || "buyer",
    ).trim().toLowerCase();
    return `gms-buyer-address:${accountKey || "buyer"}`;
  }

  const CURRENT_LOCATION_ADDRESS_ID = "current-location";
  const PH_MAP_CENTER = { lat: 12.8797, lng: 121.774 };
  let mapsBrowserConfigPromise = null;
  let mapsJsLoadPromise = null;
  let addressSyncPromise = null;

  function addressAccountIdentity(session = {}) {
    const accountId = String(session.accountId || session.id || "").trim();
    const email = String(session.email || "").trim().toLowerCase();
    return { accountId, email };
  }

  function canSyncAddressBook(session = {}) {
    const { accountId, email } = addressAccountIdentity(session);
    return Boolean(accountId || email);
  }

  async function fetchRemoteAddressBook(session = {}) {
    const { accountId, email } = addressAccountIdentity(session);
    if (!accountId && !email) return null;
    const params = new URLSearchParams();
    if (accountId) params.set("accountId", accountId);
    if (email) params.set("email", email);
    const response = await fetch(`/api/account/delivery-addresses?${params}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.message || "Unable to load delivery addresses.");
    }
    const book = payload.book && typeof payload.book === "object" ? payload.book : {};
    return {
      selectedId: String(book.selectedId || ""),
      useCurrentLocation: book.useCurrentLocation === true,
      entries: Array.isArray(book.entries)
        ? book.entries.map(normalizeAddressEntry).filter((entry) => entry.street || entry.city || entry.search)
        : [],
      updatedAt: String(book.updatedAt || "").trim(),
    };
  }

  async function pushRemoteAddressBook(session = {}, book = {}) {
    const { accountId, email } = addressAccountIdentity(session);
    if (!accountId && !email) return null;
    const response = await fetch("/api/account/delivery-addresses", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        accountId,
        email,
        book: {
          version: 2,
          selectedId: String(book.selectedId || ""),
          useCurrentLocation: Boolean(book.useCurrentLocation),
          entries: Array.isArray(book.entries) ? book.entries : [],
          updatedAt: String(book.updatedAt || new Date().toISOString()),
        },
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.message || "Unable to save delivery addresses.");
    }
    return payload.book && typeof payload.book === "object" ? payload.book : null;
  }

  function regularAddressCount(book = {}) {
    return (Array.isArray(book.entries) ? book.entries : []).filter(
      (entry) => entry.id !== CURRENT_LOCATION_ADDRESS_ID,
    ).length;
  }

  function writeSavedAccountAddressBookLocal(session = {}, book = {}) {
    window.localStorage.setItem(
      accountAddressStorageKey(session),
      JSON.stringify({
        version: 2,
        selectedId: String(book.selectedId || ""),
        useCurrentLocation: Boolean(book.useCurrentLocation),
        entries: Array.isArray(book.entries) ? book.entries : [],
        updatedAt: String(book.updatedAt || new Date().toISOString()),
      }),
    );
    try {
      window.dispatchEvent(
        new CustomEvent("gms-buyer-address-updated", {
          detail: { key: accountAddressStorageKey(session) },
        }),
      );
    } catch (_) {
      // Ignore environments without CustomEvent.
    }
  }

  function readSavedAccountAddressBook(session = {}) {
    try {
      const raw = window.localStorage.getItem(accountAddressStorageKey(session));
      const parsed = raw ? JSON.parse(raw) : {};
      if (!parsed || typeof parsed !== "object") {
        return { selectedId: "", useCurrentLocation: false, entries: [], updatedAt: "" };
      }
      let entries = [];
      if (Array.isArray(parsed.entries)) {
        entries = parsed.entries.map(normalizeAddressEntry).filter((entry) => entry.street || entry.city || entry.search);
      } else if (parsed.street || parsed.city) {
        entries = [normalizeAddressEntry(parsed)];
      }
      let selectedId = String(parsed.selectedId || "").trim();
      if (!selectedId && entries.length) selectedId = entries[0].id;
      if (selectedId && !entries.some((entry) => entry.id === selectedId)) {
        selectedId = entries[0]?.id || "";
      }
      return {
        selectedId,
        useCurrentLocation: parsed.useCurrentLocation === true,
        entries,
        updatedAt: String(parsed.updatedAt || "").trim(),
      };
    } catch (_) {
      return { selectedId: "", useCurrentLocation: false, entries: [], updatedAt: "" };
    }
  }

  function writeSavedAccountAddressBook(session = {}, book = {}, options = {}) {
    const nextBook = {
      selectedId: String(book.selectedId || ""),
      useCurrentLocation: Boolean(book.useCurrentLocation),
      entries: Array.isArray(book.entries) ? book.entries : [],
      updatedAt: String(book.updatedAt || new Date().toISOString()),
    };
    writeSavedAccountAddressBookLocal(session, nextBook);
    if (options.skipRemote) return;
    if (!canSyncAddressBook(session)) return;
    void pushRemoteAddressBook(session, nextBook).catch(() => {
      // Keep local book if cloud sync is temporarily unavailable.
    });
  }

  async function syncSavedAccountAddressBook(session = {}) {
    const activeSession = session && (session.accountId || session.id || session.email)
      ? session
      : readBuyerSession() || {};
    if (!canSyncAddressBook(activeSession)) {
      return readSavedAccountAddressBook(activeSession);
    }
    if (addressSyncPromise) return addressSyncPromise;

    addressSyncPromise = (async () => {
      const local = readSavedAccountAddressBook(activeSession);
      try {
        const remote = await fetchRemoteAddressBook(activeSession);
        if (!remote) return local;

        const localRegular = regularAddressCount(local);
        const remoteRegular = regularAddressCount(remote);
        const remoteIsNewer =
          Boolean(remote.updatedAt) &&
          (!local.updatedAt || remote.updatedAt >= local.updatedAt);

        if ((remoteRegular > 0 || remote.entries.length) && (remoteIsNewer || localRegular === 0)) {
          writeSavedAccountAddressBookLocal(activeSession, remote);
          return remote;
        }

        if (localRegular > 0 || local.entries.length) {
          const saved = await pushRemoteAddressBook(activeSession, local);
          if (saved?.updatedAt) {
            local.updatedAt = String(saved.updatedAt);
            writeSavedAccountAddressBookLocal(activeSession, local);
          }
        }
        return local;
      } catch (_) {
        return local;
      }
    })();

    try {
      return await addressSyncPromise;
    } finally {
      addressSyncPromise = null;
    }
  }

  function fetchMapsBrowserConfig() {
    if (!mapsBrowserConfigPromise) {
      mapsBrowserConfigPromise = fetch("/api/maps/config")
        .then((response) => response.json().catch(() => ({})))
        .then((data) => {
          const browserKey = String(data?.browserKey || "").trim();
          return {
            enabled: Boolean(data?.enabled && browserKey),
            browserKey,
          };
        })
        .catch(() => ({ enabled: false, browserKey: "" }));
    }
    return mapsBrowserConfigPromise;
  }

  function loadGoogleMapsJs(apiKey) {
    if (window.google?.maps) return Promise.resolve(window.google.maps);
    if (mapsJsLoadPromise) return mapsJsLoadPromise;
    mapsJsLoadPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector("script[data-switch-google-maps-js]");
      if (existing) {
        existing.addEventListener("load", () => resolve(window.google.maps), { once: true });
        existing.addEventListener("error", () => reject(new Error("Maps JS failed to load.")), {
          once: true,
        });
        return;
      }
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`;
      script.async = true;
      script.defer = true;
      script.dataset.switchGoogleMapsJs = "1";
      script.onload = () => resolve(window.google.maps);
      script.onerror = () => reject(new Error("Maps JS failed to load."));
      document.head.appendChild(script);
    });
    return mapsJsLoadPromise;
  }

  function buildGoogleMapsEmbedUrl({ query, lat, lng, zoom, browserKey }) {
    const hasCoords = Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));
    const z = String(zoom || (hasCoords ? 17 : 6));
    if (browserKey) {
      if (hasCoords) {
        return `https://www.google.com/maps/embed/v1/view?key=${encodeURIComponent(browserKey)}&center=${Number(lat).toFixed(6)},${Number(lng).toFixed(6)}&zoom=${encodeURIComponent(z)}&maptype=roadmap`;
      }
      const q = String(query || "Philippines").trim() || "Philippines";
      return `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(browserKey)}&q=${encodeURIComponent(q)}&zoom=${encodeURIComponent(z)}`;
    }
    const q = hasCoords
      ? `${Number(lat).toFixed(6)},${Number(lng).toFixed(6)}`
      : String(query || "Philippines").trim() || "Philippines";
    return `https://www.google.com/maps?q=${encodeURIComponent(q)}&z=${encodeURIComponent(z)}&output=embed`;
  }

  function normalizeAddressEntry(raw = {}) {
    const label = String(raw.label || "").trim();
    const normalizedLabel =
      label === "Current" ? "Current" : "Saved location";
    return {
      id: String(raw.id || "").trim() || `addr_${Date.now()}`,
      search: String(raw.search || "").trim(),
      unit: String(raw.unit || "").trim(),
      street: String(raw.street || "").trim(),
      city: String(raw.city || "").trim(),
      province: String(raw.province || "").trim(),
      postal: String(raw.postal || "").trim(),
      label: normalizedLabel,
      lat: Number.isFinite(Number(raw.lat)) ? Number(raw.lat) : null,
      lng: Number.isFinite(Number(raw.lng)) ? Number(raw.lng) : null,
    };
  }

  function addressDisplayLabel(label) {
    return String(label || "").trim() === "Current"
      ? "Current Location"
      : "Saved location";
  }

  function addressSummaryLine(entry = {}) {
    const parts = [entry.unit, entry.street, entry.city, entry.province, entry.postal]
      .map((part) => String(part || "").trim())
      .filter(Boolean);
    if (parts.length) return parts.join(", ");
    return String(entry.search || "Saved address").trim();
  }

  function accountAddressHtml(session = {}) {
    return `
      <div class="md-account-address" data-md-account-address-root>
        <div class="md-account-address__list" data-md-address-list></div>
        <form class="md-account-address__form" data-md-account-address-form hidden>
          <input type="hidden" name="editingId" value="" data-md-address-editing-id />
          <div class="md-account-address__search-wrap">
            <label class="md-account-address__search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              <input type="search" name="search" value="" placeholder="Search any place in the Philippines" autocomplete="street-address" data-md-address-search />
            </label>
            <div class="md-account-address__suggestions" data-md-address-suggestions hidden></div>
          </div>

          <section class="md-account-address__map" aria-label="Selected location map">
            <div
              class="md-account-address__map-canvas"
              data-md-address-map-canvas
              role="img"
              aria-label="Google Maps"
              hidden
            ></div>
            <iframe
              class="md-account-address__map-frame"
              data-md-address-map
              title="Google Maps"
              loading="lazy"
              referrerpolicy="no-referrer-when-downgrade"
              src="https://www.google.com/maps?q=Philippines&z=6&output=embed"
            ></iframe>
            <button type="button" class="md-account-address__locate" data-md-address-locate>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="8"/></svg>
              <span>Use Current Location</span>
            </button>
          </section>

          <label class="md-account-address__field">
            <span>House / Building / Unit (Optional)</span>
            <input type="text" name="unit" value="" placeholder="e.g. Unit 12B, Tower 1" autocomplete="address-line2" />
          </label>
          <label class="md-account-address__field">
            <span>Street</span>
            <input type="text" name="street" value="" placeholder="e.g. Rizal Avenue" autocomplete="address-line1" required />
          </label>
          <div class="md-account-address__row">
            <label class="md-account-address__field">
              <span>City / Municipality</span>
              <input type="text" name="city" value="" placeholder="e.g. Quezon City" autocomplete="address-level2" required />
            </label>
            <label class="md-account-address__field">
              <span>Province</span>
              <input type="text" name="province" value="" placeholder="e.g. Metro Manila" autocomplete="address-level1" required />
            </label>
          </div>
          <label class="md-account-address__field">
            <span>ZIP / Postal Code (Optional)</span>
            <input type="text" name="postal" value="" placeholder="e.g. 1000" inputmode="numeric" autocomplete="postal-code" />
          </label>
          <input type="hidden" name="lat" value="" data-md-address-lat />
          <input type="hidden" name="lng" value="" data-md-address-lng />

          <button type="submit" class="md-account-address__save" data-md-address-save>
            <span data-md-address-save-label>Save Address</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16V3"/><path d="m7 8 5-5 5 5"/><path d="M5 13v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7"/></svg>
          </button>
          <p class="md-account-address__feedback" data-md-address-feedback hidden aria-live="polite"></p>
        </form>
      </div>
    `;
  }

  function bindAccountAddress(panel, session = {}, options = {}) {
    const root = panel.querySelector("[data-md-account-address-root]");
    const form = panel.querySelector("[data-md-account-address-form]");
    const list = panel.querySelector("[data-md-address-list]");
    if (!(root instanceof HTMLElement) || !(form instanceof HTMLFormElement) || !(list instanceof HTMLElement)) return;
    if (root.dataset.mdAddressBound === "1") return;
    root.dataset.mdAddressBound = "1";

    const searchInput = form.querySelector("[data-md-address-search]");
    const suggestionsBox = form.querySelector("[data-md-address-suggestions]");
    const mapFrame = form.querySelector("[data-md-address-map]");
    const mapCanvas = form.querySelector("[data-md-address-map-canvas]");
    const latInput = form.querySelector("[data-md-address-lat]");
    const lngInput = form.querySelector("[data-md-address-lng]");
    const editingIdInput = form.querySelector("[data-md-address-editing-id]");
    const saveLabel = form.querySelector("[data-md-address-save-label]");
    const feedback = form.querySelector("[data-md-address-feedback]");
    const locateButton = form.querySelector("[data-md-address-locate]");
    let selectedLabel = "Saved location";
    let searchTimer = 0;
    let searchRequestId = 0;
    let book = readSavedAccountAddressBook(session);
    let jsMap = null;
    let jsMarker = null;
    let mapsBrowserKey = "";
    let mapsJsReady = false;

    const setFeedback = (message, isError = false) => {
      if (!(feedback instanceof HTMLElement)) return;
      feedback.textContent = message;
      feedback.hidden = !message;
      feedback.classList.toggle("is-error", isError);
    };

    const showJsMap = (enabled) => {
      if (mapCanvas instanceof HTMLElement) mapCanvas.hidden = !enabled;
      if (mapFrame instanceof HTMLIFrameElement) mapFrame.hidden = enabled;
    };

    const ensureJsMap = async () => {
      if (mapsJsReady && jsMap) return true;
      const config = await fetchMapsBrowserConfig();
      mapsBrowserKey = config.browserKey || "";
      if (!config.enabled || !mapsBrowserKey) {
        showJsMap(false);
        return false;
      }
      try {
        const maps = await loadGoogleMapsJs(mapsBrowserKey);
        if (!(mapCanvas instanceof HTMLElement) || !maps) {
          showJsMap(false);
          return false;
        }
        if (!jsMap) {
          jsMap = new maps.Map(mapCanvas, {
            center: PH_MAP_CENTER,
            zoom: 5.5,
            disableDefaultUI: true,
            zoomControl: false,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            clickableIcons: false,
          });
        }
        mapsJsReady = true;
        showJsMap(true);
        return true;
      } catch (_) {
        showJsMap(false);
        return false;
      }
    };

    const setMapQuery = (query, lat, lng) => {
      const hasCoords = Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));
      const q = hasCoords
        ? `${Number(lat).toFixed(6)},${Number(lng).toFixed(6)}`
        : String(query || "Philippines").trim() || "Philippines";
      const zoom = q === "Philippines" && !hasCoords ? 6 : 17;
      const center = hasCoords
        ? { lat: Number(lat), lng: Number(lng) }
        : PH_MAP_CENTER;

      void (async () => {
        const ok = await ensureJsMap();
        if (ok && jsMap && window.google?.maps) {
          jsMap.setCenter(center);
          jsMap.setZoom(zoom);
          if (hasCoords) {
            if (!jsMarker) {
              jsMarker = new window.google.maps.Marker({
                map: jsMap,
                position: center,
              });
            } else {
              jsMarker.setPosition(center);
              jsMarker.setMap(jsMap);
            }
          } else if (jsMarker) {
            jsMarker.setMap(null);
          }
          return;
        }
        if (!(mapFrame instanceof HTMLIFrameElement)) return;
        if (!mapsBrowserKey) {
          const config = await fetchMapsBrowserConfig();
          mapsBrowserKey = config.browserKey || "";
        }
        mapFrame.src = buildGoogleMapsEmbedUrl({
          query: q,
          lat,
          lng,
          zoom,
          browserKey: mapsBrowserKey,
        });
      })();
    };

    const setLabelButtons = (label) => {
      selectedLabel = "Saved location";
    };

    const clearForm = () => {
      form.reset();
      if (editingIdInput instanceof HTMLInputElement) editingIdInput.value = "";
      if (latInput instanceof HTMLInputElement) latInput.value = "";
      if (lngInput instanceof HTMLInputElement) lngInput.value = "";
      if (saveLabel) saveLabel.textContent = "Save Address";
      setLabelButtons("Saved location");
      setMapQuery("Philippines");
      setFeedback("");
    };

    const fillForm = (entry = {}) => {
      const search = form.elements.namedItem("search");
      const unit = form.elements.namedItem("unit");
      const street = form.elements.namedItem("street");
      const city = form.elements.namedItem("city");
      const province = form.elements.namedItem("province");
      const postal = form.elements.namedItem("postal");
      if (search instanceof HTMLInputElement) search.value = entry.search || "";
      if (unit instanceof HTMLInputElement) unit.value = entry.unit || "";
      if (street instanceof HTMLInputElement) street.value = entry.street || "";
      if (city instanceof HTMLInputElement) city.value = entry.city || "";
      if (province instanceof HTMLInputElement) province.value = entry.province || "";
      if (postal instanceof HTMLInputElement) postal.value = entry.postal || "";
      if (latInput instanceof HTMLInputElement) latInput.value = entry.lat == null ? "" : String(entry.lat);
      if (lngInput instanceof HTMLInputElement) lngInput.value = entry.lng == null ? "" : String(entry.lng);
      if (editingIdInput instanceof HTMLInputElement) editingIdInput.value = entry.id || "";
      if (saveLabel) saveLabel.textContent = entry.id ? "Update Address" : "Save Address";
      setLabelButtons("Saved location");
      setMapQuery(entry.search || addressSummaryLine(entry), entry.lat, entry.lng);
    };

    const showList = () => {
      list.hidden = false;
      form.hidden = true;
      renderList();
      if (typeof options.onViewChange === "function") {
        options.onViewChange("list", null);
      }
    };

    const showEditor = (entry = null) => {
      const openMapEditor = window.SwitchSelectAddress?.openSelectAddressPage;
      if (typeof openMapEditor === "function") {
        void openMapEditor({
          session,
          initialEditId: entry?.id || "",
          onSaved: () => {
            book = readSavedAccountAddressBook(session);
            if (options.editorOnly) {
              if (typeof options.onSaved === "function") {
                options.onSaved(entry, book);
              }
              return;
            }
            showList();
          },
        });
        if (typeof options.onViewChange === "function") {
          options.onViewChange(entry ? "edit" : "add", entry);
        }
        return;
      }
      list.hidden = true;
      form.hidden = false;
      if (entry) fillForm(entry);
      else clearForm();
      if (typeof options.onViewChange === "function") {
        options.onViewChange(entry ? "edit" : "add", entry);
      }
    };

    const persistBook = () => writeSavedAccountAddressBook(session, book);

    const renderList = () => {
      const current = book.entries.find((entry) => entry.id === CURRENT_LOCATION_ADDRESS_ID);
      const regular = book.entries.filter((entry) => entry.id !== CURRENT_LOCATION_ADDRESS_ID);
      const selected = book.entries.find((entry) => entry.id === book.selectedId);
      const currentSelected = book.useCurrentLocation || book.selectedId === CURRENT_LOCATION_ADDRESS_ID;
      list.innerHTML = `
        <div class="md-account-address__list-head">
          <strong>Saved addresses</strong>
          <span>Choose where you want deliveries sent.</span>
        </div>
        <button type="button" class="md-account-address__choice${currentSelected ? " is-selected" : ""}" data-md-address-use-current>
          <span class="md-account-address__radio" aria-hidden="true"></span>
          <span class="md-account-address__choice-copy">
            <strong>Use current location</strong>
            <span>${escapeHtml(current ? addressSummaryLine(current) : "Pin your GPS location in the Philippines")}</span>
          </span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="8"/></svg>
        </button>
        ${regular.map((entry) => `
          <div class="md-account-address__choice${(!currentSelected && book.selectedId === entry.id) ? " is-selected" : ""}" data-md-address-select="${escapeHtml(entry.id)}">
            <span class="md-account-address__radio" aria-hidden="true"></span>
            <span class="md-account-address__choice-copy">
              <strong>${escapeHtml(addressDisplayLabel(entry.label))}</strong>
              <span>${escapeHtml(addressSummaryLine(entry))}</span>
            </span>
            <span class="md-account-address__choice-actions">
              <button type="button" data-md-address-edit="${escapeHtml(entry.id)}" aria-label="Edit">✎</button>
              <button type="button" data-md-address-delete="${escapeHtml(entry.id)}" aria-label="Delete">🗑</button>
            </span>
          </div>
        `).join("")}
        <button type="button" class="md-account-address__add" data-md-address-add>+ Add address</button>
        ${selected ? `
          <div class="md-account-address__selected-map">
            <strong>Selected on map</strong>
            <iframe
              class="md-account-address__map-frame"
              data-md-selected-map
              title="Selected Google Maps"
              loading="lazy"
              referrerpolicy="no-referrer-when-downgrade"
              src="${buildGoogleMapsEmbedUrl({
                query: selected.search || addressSummaryLine(selected) || "Philippines",
                lat: selected.lat,
                lng: selected.lng,
                zoom: 17,
                browserKey: mapsBrowserKey,
              })}"
            ></iframe>
          </div>
        ` : ""}
      `;

      void fetchMapsBrowserConfig().then((config) => {
        mapsBrowserKey = config.browserKey || mapsBrowserKey;
        const selectedFrame = list.querySelector("[data-md-selected-map]");
        if (!(selectedFrame instanceof HTMLIFrameElement) || !selected) return;
        selectedFrame.src = buildGoogleMapsEmbedUrl({
          query: selected.search || addressSummaryLine(selected) || "Philippines",
          lat: selected.lat,
          lng: selected.lng,
          zoom: 17,
          browserKey: mapsBrowserKey,
        });
      });

      list.querySelector("[data-md-address-use-current]")?.addEventListener("click", () => {
        if (!navigator.geolocation) return;
        const button = list.querySelector("[data-md-address-use-current]");
        if (button instanceof HTMLButtonElement) button.disabled = true;
        navigator.geolocation.getCurrentPosition(async (position) => {
          try {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const response = await fetch(`/api/maps/geocode/reverse?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`);
            const data = await response.json().catch(() => ({}));
            if (!response.ok || !data.place) return;
            const place = data.place;
            const entry = normalizeAddressEntry({
              id: CURRENT_LOCATION_ADDRESS_ID,
              search: place.description || place.label || "",
              street: place.street || place.label || "",
              city: place.city || "",
              province: place.province || "",
              postal: place.postal || "",
              label: "Current",
              lat: place.lat ?? lat,
              lng: place.lng ?? lng,
            });
            const index = book.entries.findIndex((item) => item.id === CURRENT_LOCATION_ADDRESS_ID);
            if (index >= 0) book.entries[index] = entry;
            else book.entries.unshift(entry);
            book.selectedId = entry.id;
            book.useCurrentLocation = true;
            persistBook();
            renderList();
          } finally {
            if (button instanceof HTMLButtonElement) button.disabled = false;
          }
        }, () => {
          if (button instanceof HTMLButtonElement) button.disabled = false;
        }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
      });

      list.querySelectorAll("[data-md-address-select]").forEach((node) => {
        node.addEventListener("click", (event) => {
          if (event.target.closest("[data-md-address-edit], [data-md-address-delete]")) return;
          const id = node.getAttribute("data-md-address-select");
          const entry = book.entries.find((item) => item.id === id);
          if (!entry) return;
          book.selectedId = entry.id;
          book.useCurrentLocation = false;
          persistBook();
          renderList();
        });
      });

      list.querySelectorAll("[data-md-address-edit]").forEach((button) => {
        button.addEventListener("click", () => {
          const id = button.getAttribute("data-md-address-edit");
          const entry = book.entries.find((item) => item.id === id);
          if (entry) showEditor(entry);
        });
      });

      list.querySelectorAll("[data-md-address-delete]").forEach((button) => {
        button.addEventListener("click", () => {
          const id = button.getAttribute("data-md-address-delete");
          book.entries = book.entries.filter((item) => item.id !== id);
          if (book.selectedId === id) {
            book.selectedId = book.entries[0]?.id || "";
            book.useCurrentLocation = book.selectedId === CURRENT_LOCATION_ADDRESS_ID;
          }
          persistBook();
          if (!book.entries.length) showEditor(null);
          else renderList();
        });
      });

      list.querySelector("[data-md-address-add]")?.addEventListener("click", () => showEditor(null));
    };

    const fillPlace = (place = {}) => {
      const searchValue = String(place.description || place.label || "").trim();
      if (searchInput instanceof HTMLInputElement && searchValue) searchInput.value = searchValue;
      const street = form.elements.namedItem("street");
      const city = form.elements.namedItem("city");
      const province = form.elements.namedItem("province");
      const postal = form.elements.namedItem("postal");
      if (street instanceof HTMLInputElement && place.street) street.value = place.street;
      if (city instanceof HTMLInputElement && place.city) city.value = place.city;
      if (province instanceof HTMLInputElement && place.province) province.value = place.province;
      if (postal instanceof HTMLInputElement && place.postal) postal.value = place.postal;
      if (latInput instanceof HTMLInputElement) latInput.value = place.lat == null ? "" : String(place.lat);
      if (lngInput instanceof HTMLInputElement) lngInput.value = place.lng == null ? "" : String(place.lng);
      setMapQuery(searchValue || place.label, place.lat, place.lng);
    };

    const hideSuggestions = () => {
      if (!(suggestionsBox instanceof HTMLElement)) return;
      suggestionsBox.hidden = true;
      suggestionsBox.innerHTML = "";
    };

    const renderSuggestions = (places = []) => {
      if (!(suggestionsBox instanceof HTMLElement)) return;
      if (!places.length) {
        hideSuggestions();
        return;
      }
      suggestionsBox.hidden = false;
      suggestionsBox.innerHTML = places.map((place, index) => `
        <button type="button" class="md-account-address__suggestion" data-md-address-suggestion="${index}">
          <strong>${escapeHtml(place.label || "")}</strong>
          <span>${escapeHtml(place.description || "")}</span>
        </button>
      `).join("");
      suggestionsBox.querySelectorAll("[data-md-address-suggestion]").forEach((button) => {
        button.addEventListener("click", async () => {
          const index = Number(button.getAttribute("data-md-address-suggestion"));
          const place = places[index];
          if (!place) return;
          hideSuggestions();
          setFeedback("Loading place details...");
          try {
            let resolved = place;
            if ((!place.lat || !place.lng) && place.id && !String(place.id).startsWith("osm:")) {
              const detailsResponse = await fetch(`/api/maps/places/details?placeId=${encodeURIComponent(place.id)}`);
              const detailsData = await detailsResponse.json().catch(() => ({}));
              if (detailsResponse.ok && detailsData.place) resolved = detailsData.place;
            }
            fillPlace(resolved);
            setFeedback("Location selected. Review the address details below.");
          } catch (_) {
            fillPlace(place);
            setFeedback("Location selected. Review the address details below.");
          }
        });
      });
    };

    const searchPlaces = async (query) => {
      const requestId = ++searchRequestId;
      const trimmed = String(query || "").trim();
      if (trimmed.length < 2) {
        hideSuggestions();
        return;
      }
      try {
        const response = await fetch(`/api/maps/places/autocomplete?q=${encodeURIComponent(trimmed)}`);
        const data = await response.json().catch(() => ({}));
        if (requestId !== searchRequestId) return;
        if (!response.ok) {
          hideSuggestions();
          return;
        }
        renderSuggestions(Array.isArray(data.places) ? data.places : []);
      } catch (_) {
        if (requestId !== searchRequestId) return;
        hideSuggestions();
      }
    };

    form.querySelectorAll("[data-md-address-label]").forEach((button) => {
      button.addEventListener("click", () => {
        setLabelButtons("Saved location");
      });
    });

    if (searchInput instanceof HTMLInputElement) {
      searchInput.addEventListener("input", () => {
        window.clearTimeout(searchTimer);
        searchTimer = window.setTimeout(() => {
          void searchPlaces(searchInput.value);
        }, 380);
      });
    }

    locateButton?.addEventListener("click", () => {
      if (!navigator.geolocation) {
        setFeedback("Location is not available in this browser.", true);
        return;
      }
      locateButton.disabled = true;
      setFeedback("Finding your current location...");
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
              setFeedback(data.message || "Unable to resolve your current location.", true);
              return;
            }
            fillPlace(data.place);
            setFeedback("Current location pinned. Review the address details below.");
          } catch (_) {
            setFeedback("Unable to resolve your current location.", true);
          } finally {
            locateButton.disabled = false;
          }
        },
        () => {
          locateButton.disabled = false;
          setFeedback("Allow location access, then try again.", true);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
      );
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const entry = normalizeAddressEntry({
        id: String(editingIdInput?.value || "").trim() || `addr_${Date.now()}`,
        search: String(form.elements.namedItem("search")?.value || "").trim(),
        unit: String(form.elements.namedItem("unit")?.value || "").trim(),
        street: String(form.elements.namedItem("street")?.value || "").trim(),
        city: String(form.elements.namedItem("city")?.value || "").trim(),
        province: String(form.elements.namedItem("province")?.value || "").trim(),
        postal: String(form.elements.namedItem("postal")?.value || "").trim(),
        label: "Saved location",
        lat: latInput?.value,
        lng: lngInput?.value,
      });
      if (!entry.street || !entry.city || !entry.province) {
        setFeedback("Add your street, city, and province before saving.", true);
        return;
      }
      const index = book.entries.findIndex((item) => item.id === entry.id);
      if (index >= 0) book.entries[index] = entry;
      else book.entries.push(entry);
      book.selectedId = entry.id;
      book.useCurrentLocation = entry.id === CURRENT_LOCATION_ADDRESS_ID;
      try {
        persistBook();
        setFeedback("Address saved.");
        if (typeof options.onSaved === "function") {
          options.onSaved(entry, book);
        }
        if (!options.editorOnly) showList();
      } catch (_) {
        setFeedback("Unable to save address.", true);
      }
    });

    const requestedEditId = String(
      options.initialEditId ?? new URLSearchParams(window.location.search).get("edit") ?? "",
    ).trim();
    const applyInitialView = () => {
      const requestedEntry = requestedEditId && requestedEditId !== CURRENT_LOCATION_ADDRESS_ID
        ? (book.entries || []).find((item) => item.id === requestedEditId)
        : null;
      if (options.editorOnly) {
        showEditor(requestedEntry || null);
        return;
      }
      if (!book.entries.length) showEditor(null);
      else showList();
      if (requestedEntry) showEditor(requestedEntry);
    };

    applyInitialView();

    void syncSavedAccountAddressBook(session).then((synced) => {
      if (!synced || typeof synced !== "object") return;
      book = synced;
      applyInitialView();
    });
  }

  function mountAccountAddressManager(container, session = {}, options = {}) {
    if (!(container instanceof HTMLElement)) return null;
    container.innerHTML = accountAddressHtml(session);
    bindAccountAddress(container, session, options);
    return container.querySelector("[data-md-account-address-root]");
  }

  function accountSectionTitle(tab = "menu") {
    const key = String(tab || "menu").trim().toLowerCase();
    if (key === "profile-hub") return t("account.profileHub");
    if (key === "profile") return t("account.personalInfo");
    if (key === "invite") return t("account.invite");
    if (key === "vouchers") return t("account.vouchers");
    if (key === "favorites") return t("account.favorites");
    if (key === "activity") return t("account.activity");
    if (key === "address") return t("account.address");
    if (key === "security") return t("account.security");
    if (key === "password") return t("account.password");
    if (key === "two-factor") return t("account.twoFactor");
    if (key === "login-activity") return t("account.loginActivity");
    if (key === "devices") return t("account.devices");
    if (key === "payment") return t("account.payment");
    if (key === "account-links") return t("account.links");
    if (key === "preferences") return t("language.aria");
    if (key === "account") return t("account.account");
    if (key === "seller") return t("account.seller");
    if (key === "companies") return t("account.companies");
    return t("account.settings");
  }

  function accountSellerLabelHtml() {
    const label = t("account.seller");
    const match = label.match(/^(.*?)(Switch)$/i);
    if (!match) return escapeHtml(label);
    return `${escapeHtml(match[1])}<span class="md-account-panel__palette-word">${escapeHtml(match[2])}</span>`;
  }

  function accountCompaniesRowHtml(session) {
    const hasSeller = hasSellerAdminAccess(session);
    if (!hasSeller) {
      return `
              <button type="button" class="md-account-panel__identity-seller" data-md-account-tab="seller">
                <span class="md-account-panel__link-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-handshake"><path d="m11 17 2 2a1 1 0 1 0 3-3"/><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4"/><path d="m21 3 1 11h-2"/><path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3"/><path d="M3 4h8"/></svg></span>
                <span>${accountSellerLabelHtml()}</span>
                <svg class="md-account-panel__link-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
              </button>`;
    }
    return `
              <button type="button" class="md-account-panel__identity-seller md-account-panel__identity-companies" data-md-account-tab="companies">
                <span class="md-account-panel__link-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-building-2"><path d="M10 12h4"/><path d="M10 8h4"/><path d="M14 21v-3a2 2 0 0 0-4 0v3"/><path d="M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2"/><path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"/></svg></span>
                <span>${escapeHtml(t("account.companies"))}</span>
                <svg class="md-account-panel__link-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
              </button>`;
  }

  function renderCompaniesSelectionMarkup(session) {
    const memberships = getSellerCompanyMemberships(session);
    const activeCompanyId = String(session?.activeCompanyId || "").trim();
    if (!memberships.length) {
      return `
            <div class="md-account-detail">
              <p class="md-account-panel__intro" style="margin:0 0 14px">
                ${escapeHtml(t("account.companies.empty"))}
              </p>
              <a class="md-account-detail__action md-account-detail__action--accent" href="/switch_account.html?tab=seller&amp;becomeSeller=1">
                ${escapeHtml(t("account.seller.start"))}
              </a>
            </div>`;
    }
    const rows = memberships.map((membership, index) => {
      const company = membership?.company && typeof membership.company === "object"
        ? membership.company
        : {};
      const companyId = String(membership.companyId || company.id || "").trim();
      const name = getCompanyDisplayName(membership);
      const role = String(membership.membershipRole || "").trim() || t("account.companies.role");
      const detail = [
        role.replace(/_/g, " "),
        String(company.businessType || "").trim(),
        String(company.status || company.subscriptionStatus || "").trim(),
      ].filter(Boolean).join(" · ");
      const imageUrl = getCompanyProfileImageUrl(company);
      const toneIndex = getCompanyLogoToneIndex(companyId || name);
      const isActive = Boolean(activeCompanyId && companyId && activeCompanyId === companyId);
      return `
        <button
          type="button"
          class="md-account-companies__item${isActive ? " is-active" : ""}"
          data-md-company-select="${escapeHtml(companyId)}"
          aria-label="${escapeHtml(name)}"
          title="${escapeHtml(name)}"
          style="z-index:${index + 1}"
        >
          <span class="md-account-companies__avatar seller-company-logo--tone-${toneIndex}${imageUrl ? " has-image" : ""}" aria-hidden="true">
            <span class="md-account-companies__avatar-media">
              ${imageUrl
                ? `<img src="${escapeHtml(imageUrl)}" alt="" loading="lazy" decoding="async" data-md-company-avatar-image />`
                : ""}
              <span class="md-account-companies__avatar-fallback"${imageUrl ? " hidden" : ""}>
                ${COMPANY_DEFAULT_LOGO_SVG}
              </span>
            </span>
          </span>
          <span class="md-account-companies__copy">
            <span class="md-account-companies__name">${escapeHtml(name)}</span>
            <span class="md-account-companies__detail">${escapeHtml(detail || t("account.companies.role"))}</span>
          </span>
          ${isActive
            ? `<span class="md-account-companies__badge">${escapeHtml(t("account.companies.active"))}</span>`
            : `<svg class="md-account-panel__link-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>`}
        </button>`;
    }).join("");
    return `
            <div class="md-account-detail md-account-companies">
              <p class="md-account-panel__intro" style="margin:0 0 14px">
                ${escapeHtml(t("account.companies.copy"))}
              </p>
              <div class="md-account-companies__list" role="list" data-md-companies-list>
                ${rows}
              </div>
              <a
                class="md-account-detail__action md-account-detail__action--accent md-account-companies__add"
                href="/switch_account.html?tab=seller&amp;becomeSeller=1"
                data-md-add-company
              >
                ${escapeHtml(t("account.companies.add"))}
              </a>
              <p class="md-account-companies__status" data-md-companies-status hidden></p>
            </div>`;
  }

  async function openSelectedCompanyWorkspace(panel, companyId) {
    const session = readBuyerSession();
    if (!session) return;
    const accountId = String(session.accountId || session.id || "").trim();
    const email = String(session.email || "").trim().toLowerCase();
    const status = panel.querySelector("[data-md-companies-status]");
    const buttons = panel.querySelectorAll("[data-md-company-select]");
    const setStatus = (message, kind = "") => {
      if (!(status instanceof HTMLElement)) return;
      status.hidden = !message;
      status.textContent = message || "";
      status.classList.toggle("is-error", kind === "error");
      status.classList.toggle("is-busy", kind === "busy");
    };
    buttons.forEach((button) => {
      button.disabled = true;
    });
    setStatus(t("account.pin.checking"), "busy");
    try {
      const pinGate = await promptSwitchPin({
        accountId,
        email,
        companyId,
        companyName: String(
          session?.companies?.find((item) => String(item?.companyId || item?.company?.id || "") === companyId)?.company?.name
            || "Seller admin",
        ).trim() || "Seller admin",
      });
      if (!pinGate) {
        setStatus("", "");
        buttons.forEach((button) => {
          button.disabled = false;
        });
        return;
      }

      setStatus(t("account.companies.open"), "busy");
      const switchResponse = await fetch("/api/auth/switch-role", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accountId,
          email,
          activeMode: "seller_admin",
          companyId,
        }),
      });
      const switchPayload = await switchResponse.json().catch(() => ({}));
      if (!switchResponse.ok) {
        throw new Error(switchPayload.message || t("account.companies.error"));
      }
      const unified = switchPayload.session && typeof switchPayload.session === "object"
        ? switchPayload.session
        : {};
      const account = unified.account && typeof unified.account === "object"
        ? unified.account
        : {};
      const nextSession = {
        ...session,
        ...account,
        accountId: String(account.id || account.accountId || accountId).trim(),
        email: String(account.email || email).trim().toLowerCase(),
        availableModes: Array.isArray(unified.availableModes)
          ? unified.availableModes
          : session.availableModes,
        activeMode: String(unified.activeMode || "seller_admin").trim() || "seller_admin",
        activeCompanyId: unified.activeCompanyId || companyId,
        activeCompany: unified.activeCompany || null,
        companies: Array.isArray(unified.companies) ? unified.companies : session.companies,
        capabilities: Array.isArray(unified.capabilities)
          ? unified.capabilities
          : session.capabilities,
      };
      saveBuyerSession(nextSession);

      const workspaceResponse = await fetch("/api/account/become-seller/open-workspace", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accountId: nextSession.accountId,
          email: nextSession.email,
          companyId,
        }),
      });
      const workspacePayload = await workspaceResponse.json().catch(() => ({}));
      if (!workspaceResponse.ok) {
        throw new Error(workspacePayload.message || t("account.companies.error"));
      }
      const redirectPath = String(
        workspacePayload.redirectPath
          || workspacePayload.dashboardPath
          || "/main.html#dashboard",
      ).trim() || "/main.html#dashboard";
      persistSellerAdminSession(workspacePayload.admin || {}, redirectPath);
      persistSwitchPinUnlock(pinGate.unlockToken, pinGate.companyId || companyId, nextSession.accountId);
      window.location.href = sellerAdminUrlWithPinTicket(redirectPath, pinGate.unlockToken);
    } catch (error) {
      setStatus(
        error instanceof Error && error.message
          ? error.message
          : t("account.companies.error"),
        "error",
      );
      buttons.forEach((button) => {
        button.disabled = false;
      });
    }
  }

  function bindCompanySelection(panel) {
    panel.querySelectorAll("[data-md-company-select]").forEach((button) => {
      if (button.dataset.mdCompanyBound === "1") return;
      button.dataset.mdCompanyBound = "1";
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const companyId = String(button.getAttribute("data-md-company-select") || "").trim();
        if (!companyId || button.disabled) return;
        void openSelectedCompanyWorkspace(panel, companyId);
      });
    });
    panel.querySelectorAll("[data-md-company-avatar-image]").forEach((image) => {
      if (image.dataset.mdCompanyFallbackBound === "1") return;
      image.dataset.mdCompanyFallbackBound = "1";
      image.addEventListener("error", () => {
        image.hidden = true;
        const avatar = image.closest(".md-account-companies__avatar");
        avatar?.classList.remove("has-image");
        const fallback = image.parentElement?.querySelector(".md-account-companies__avatar-fallback");
        if (fallback) fallback.hidden = false;
      }, { once: true });
    });
  }

  async function refreshCompaniesView(panel) {
    const host = panel.querySelector('[data-md-account-view="companies"]');
    if (!(host instanceof HTMLElement)) return;
    // Silent refresh: saveBuyerSession emit remounts header actions and would
    // destroy this open sidebar mid-navigation to Companies.
    const session = await refreshBuyerProfile({ silent: true }) || readBuyerSession();
    if (!session || !hasSellerAdminAccess(session)) {
      showAccountPanelView(panel, "seller");
      return;
    }
    host.innerHTML = renderCompaniesSelectionMarkup(session);
    bindCompanySelection(panel);
  }

  function getPhoneDisplay(session) {
    const mobile = String(session?.mobileNumber || session?.phone || "").trim();
    if (!mobile) return "—";
    const countryCode = String(session?.countryCode || "+63").trim() || "+63";
    return `${countryCode} ${mobile}`.trim();
  }

  function resolveGoogleConnection(account = {}) {
    const binding = account?.gmailBinding ?? account?.googleBinding ?? null;
    const bindingEmail = typeof binding === "string"
      ? binding.trim()
      : String(binding?.email || "").trim();
    const googleProfile = account?.googleProfile && typeof account.googleProfile === "object"
      ? account.googleProfile
      : null;
    const profileEmail = String(googleProfile?.email || "").trim();
    const provider = String(
      account?.authProvider
        || account?.signInProvider
        || account?.identityProvider
        || "",
    ).trim().toLowerCase();
    const connected = Boolean(
      bindingEmail
      || googleProfile?.subject
      || profileEmail
      || account?.googleSubject
      || provider === "google"
      || provider === "google.com",
    );
    return {
      connected,
      email: bindingEmail || profileEmail || (connected ? String(account?.email || "").trim() : ""),
    };
  }

  function resolveFacebookConnection(account = {}) {
    const binding = account?.facebookBinding ?? null;
    const bindingEmail = typeof binding === "string"
      ? binding.trim()
      : String(binding?.email || "").trim();
    const facebookProfile = account?.facebookProfile && typeof account.facebookProfile === "object"
      ? account.facebookProfile
      : null;
    const profileEmail = String(facebookProfile?.email || "").trim();
    const provider = String(
      account?.authProvider
        || account?.signInProvider
        || account?.identityProvider
        || "",
    ).trim().toLowerCase();
    const connected = Boolean(
      bindingEmail
      || facebookProfile?.subject
      || facebookProfile?.id
      || profileEmail
      || provider === "facebook"
      || provider === "facebook.com",
    );
    return {
      connected,
      email: bindingEmail || profileEmail || (connected ? String(account?.email || "").trim() : ""),
    };
  }

  function bindRightPanelClose(panel, trigger) {
    panel.querySelector("[data-md-right-panel-close]")?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      closeHeaderMenus();
      trigger?.focus();
    });
  }

  function signOut() {
    clearBuyerSession();
    window.location.replace(LOGIN_PATH);
  }

  function forgetRememberedLogin(session) {
    const accountId = String(session?.accountId || session?.id || "").trim().toLowerCase();
    const email = String(session?.email || "").trim().toLowerCase();
    try {
      const key = "gms-remembered-seller-accounts";
      const parsed = JSON.parse(window.localStorage.getItem(key) || "[]");
      const existing = Array.isArray(parsed) ? parsed : [];
      const next = existing.filter((entry) => {
        if (!entry || typeof entry !== "object") return false;
        const entryId = String(entry.adminId || entry.id || "").trim().toLowerCase();
        const entryEmail = String(entry.email || "").trim().toLowerCase();
        if (accountId && entryId && entryId === accountId) return false;
        if (email && entryEmail && entryEmail === email) return false;
        return true;
      });
      window.localStorage.setItem(key, JSON.stringify(next));
    } catch (_) {}
  }

  async function enforceRemoteDeviceSignOut() {
    const session = readBuyerSession();
    const accountId = String(session?.accountId || session?.id || "").trim();
    if (!accountId) return;
    const deviceKey = getMdAccountDeviceKey();
    const params = new URLSearchParams({ accountId, deviceKey });
    const email = String(session?.email || "").trim();
    if (email) params.set("email", email);
    try {
      const response = await fetch(`/api/account/devices/status?${params.toString()}`, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.known || payload.active !== false) return;
      forgetRememberedLogin(session);
      signOut();
    } catch (_) {}
  }

  function startDeviceSessionWatch() {
    window.clearInterval(window.__switchDeviceSessionTimer);
    if (!readBuyerSession()) return;
    void enforceRemoteDeviceSignOut();
    window.__switchDeviceSessionTimer = window.setInterval(() => {
      void enforceRemoteDeviceSignOut();
    }, 5000);
  }

  function showAccountPanelView(panel, view = "menu", options = {}) {
    const requestedView = view === "login-activity" ? "devices" : view;
    const next = [
      "menu",
      "profile-hub",
      "profile",
      "invite",
      "vouchers",
      "favorites",
      "activity",
      "address",
      "security",
      "password",
      "two-factor",
      "devices",
      "payment",
      "account-links",
      "preferences",
      "account",
      "seller",
      "companies",
    ].includes(requestedView)
      ? requestedView
      : "menu";
    const current = String(panel.dataset.mdAccountView || "menu");
    const title = panel.querySelector("[data-md-account-title]");
    const partnerTitle = panel.querySelector("[data-md-account-partner-title]");
    const headerAction = panel.querySelector("[data-md-account-header-action]");
    const back = panel.querySelector("[data-md-account-back]");
    const body = panel.querySelector(".md-account-panel__body");
    const views = Array.from(panel.querySelectorAll("[data-md-account-view]"));
    const fromView = views.find((node) => node.getAttribute("data-md-account-view") === current);
    const toView = views.find((node) => node.getAttribute("data-md-account-view") === next);
    const history = Array.isArray(panel._mdAccountHistory) ? panel._mdAccountHistory : [];
    panel._mdAccountHistory = history;

    if (!options.back && !options.restore && current !== next) {
      history.push(current);
    }
    if (options.back) {
      // Caller already popped the target off history; keep remaining stack.
    } else if (next === "menu" && !options.restore) {
      panel._mdAccountHistory = [];
    }

    if (title) {
      title.textContent = accountSectionTitle(next);
      title.hidden = false;
    }
    if (partnerTitle) partnerTitle.hidden = true;
    if (headerAction) headerAction.hidden = next !== "vouchers";
    if (back) {
      back.hidden = next === "menu";
      back.setAttribute("aria-hidden", next === "menu" ? "true" : "false");
    }
    const header = panel.querySelector(".md-right-panel__header");
    if (header) {
      header.hidden = next === "menu";
    }
    panel.classList.toggle("md-account-panel--menu", next === "menu");
    panel.classList.toggle("md-account-panel--invite", next === "invite");
    panel.classList.toggle("md-account-panel--vouchers", next === "vouchers");
    panel.dataset.mdAccountView = next;

    if (next === "vouchers") {
      const voucherView = panel.querySelector('[data-md-account-view="vouchers"]');
      if (typeof voucherView?.refreshBuyerVouchers === "function") {
        void voucherView.refreshBuyerVouchers();
      } else {
        void loadBuyerVouchers();
      }
    }

    if (next === "companies") {
      void refreshCompaniesView(panel);
    }

    if (next === "devices") {
      void loadMdAccountDevices(panel);
    }

    if (!toView || current === next) {
      views.forEach((node) => {
        node.hidden = node.getAttribute("data-md-account-view") !== next;
        node.classList.remove(
          "is-enter-forward",
          "is-enter-back",
          "is-leave-forward",
          "is-leave-back",
        );
      });
      if (body) body.scrollTop = 0;
      return;
    }

    const direction = options.back || next === "menu" ? "back" : "forward";
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const animToken = Number(panel.dataset.mdAccountAnimToken || "0") + 1;
    panel.dataset.mdAccountAnimToken = String(animToken);

    views.forEach((node) => {
      node.classList.remove(
        "is-enter-forward",
        "is-enter-back",
        "is-leave-forward",
        "is-leave-back",
      );
      if (node !== fromView && node !== toView) node.hidden = true;
    });

    toView.hidden = false;
    if (body) body.scrollTop = 0;

    if (reduceMotion || !fromView) {
      if (fromView) fromView.hidden = true;
      return;
    }

    const enterClass = direction === "forward" ? "is-enter-forward" : "is-enter-back";
    const leaveClass = direction === "forward" ? "is-leave-forward" : "is-leave-back";
    void toView.offsetWidth;
    fromView.classList.add(leaveClass);
    toView.classList.add(enterClass);

    const finish = () => {
      if (String(panel.dataset.mdAccountAnimToken) !== String(animToken)) return;
      fromView.hidden = true;
      fromView.classList.remove(leaveClass);
      toView.classList.remove(enterClass);
    };

    const onAnimEnd = (event) => {
      if (event.target !== toView) return;
      toView.removeEventListener("animationend", onAnimEnd);
      finish();
    };
    toView.addEventListener("animationend", onAnimEnd);
    window.setTimeout(finish, 280);
  }

  function buildAccountMenu(session) {
    const name = getDisplayName(session);
    const email = String(session.email || "").trim();
    const avatarUrl = getAvatarUrl(session);
    const initials = getInitials(session);
    const accountId = String(session.accountId || session.id || "").trim() || "—";
    const phone = getPhoneDisplay(session);
    const emailVerified = Boolean(session.emailVerified);
    const mobileVerified = Boolean(session.mobileVerified);
    const google = resolveGoogleConnection(session);
    const facebook = resolveFacebookConnection(session);

    const root = document.createElement("div");
    root.className = "md-account-menu";
    root.dataset.mdAccountMenu = "true";
    const panelId = "md-buyer-account-panel";

    root.innerHTML = `
      <button
        type="button"
        class="md-account-menu__trigger"
        data-md-account-trigger
        aria-expanded="false"
        aria-controls="${panelId}"
        aria-label="${escapeHtml(t("account.menu"))} · ${escapeHtml(name)}"
        title="${escapeHtml(name)}${email ? ` · ${escapeHtml(email)}` : ""}"
      >
        <span class="md-account-menu__avatar" aria-hidden="true" data-md-avatar-initials="${escapeHtml(initials)}">
          ${
            avatarUrl
              ? renderAvatarMarkup(avatarUrl, initials)
              : `<span class="md-account-menu__initials">${escapeHtml(initials)}</span>`
          }
        </span>
      </button>
    `;

    const panel = document.createElement("aside");
    panel.id = panelId;
    panel.className = "md-right-panel md-account-panel md-account-panel--menu";
    panel.dataset.mdRightPanel = "account";
    panel.dataset.mdAccountView = "menu";
    panel.setAttribute("aria-label", t("account.settings"));
    panel.hidden = true;
    panel.innerHTML = `
      <div class="md-right-panel__content">
        <div class="md-right-panel__header" hidden>
          <div class="md-right-panel__title">
            <button
              type="button"
              class="md-right-panel__back"
              data-md-account-back
              hidden
              aria-hidden="true"
              aria-label="${escapeHtml(t("account.back") || "Back")}"
              title="${escapeHtml(t("account.back") || "Back")}"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-left" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <strong data-md-account-title>${escapeHtml(t("account.settings"))}</strong>
            <span class="md-account-panel__partner-title" data-md-account-partner-title hidden>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="m11 17 2 2a1 1 0 1 0 3-3" />
                <path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4" />
                <path d="m21 3 1 11h-2" />
                <path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3" />
                <path d="M3 4h8" />
              </svg>
              <span>Partners</span>
            </span>
            <span class="md-right-panel__header-action" data-md-account-header-action hidden>
              <button type="button" class="md-account-vouchers__icon-button" data-md-voucher-search-toggle aria-expanded="false" aria-label="${escapeHtml(t("account.vouchers.search"))}">
                <svg class="md-account-vouchers__search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                <svg class="md-account-vouchers__close-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </span>
          </div>
        </div>
        <div class="md-account-panel__body">
          <div class="md-account-panel__view" data-md-account-view="menu">
            <div class="md-account-panel__identity">
              <button type="button" class="md-account-panel__identity-main" data-md-account-tab="profile-hub">
                <span class="md-account-panel__avatar" aria-hidden="true" data-md-avatar-initials="${escapeHtml(initials)}">
                  ${renderAvatarMarkup(avatarUrl, initials)}
                </span>
                <span class="md-account-panel__identity-copy">
                  <strong>${escapeHtml(name)}</strong>
                  ${email ? `<span>${escapeHtml(email)}</span>` : ""}
                </span>
                <svg class="md-account-panel__link-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
              </button>
              ${accountCompaniesRowHtml(session)}
            </div>
            <p class="md-account-panel__intro">${escapeHtml(t("account.settings.copy"))}</p>
            <nav class="md-account-panel__nav" aria-label="${escapeHtml(t("account.settings"))}">
              <button type="button" class="md-account-panel__link" data-md-account-tab="invite">
                <span class="md-account-panel__link-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg></span>
                <span>${escapeHtml(t("account.invite"))}</span>
                <svg class="md-account-panel__link-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
              </button>
              <button type="button" class="md-account-panel__link" data-md-account-tab="vouchers">
                <span class="md-account-panel__link-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/></svg></span>
                <span>${escapeHtml(t("account.vouchers"))}</span>
                <svg class="md-account-panel__link-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
              </button>
              <button type="button" class="md-account-panel__link" data-md-account-tab="favorites">
                <span class="md-account-panel__link-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg></span>
                <span>${escapeHtml(t("account.favorites"))}</span>
                <svg class="md-account-panel__link-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
              </button>
              <button type="button" class="md-account-panel__link" data-md-account-tab="activity">
                <span class="md-account-panel__link-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg></span>
                <span>${escapeHtml(t("account.activity"))}</span>
                <svg class="md-account-panel__link-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
              </button>
              <button type="button" class="md-account-panel__link" data-md-account-tab="preferences">
                <span class="md-account-panel__link-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg></span>
                <span class="md-account-panel__link-copy">
                  <span>${escapeHtml(t("language.aria"))}</span>
                  <span class="md-account-panel__link-meta" data-md-account-language-label>${escapeHtml(languageLabel(getSavedLanguage()))}</span>
                </span>
                <svg class="md-account-panel__link-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
              </button>
              <button type="button" class="md-account-panel__link" data-md-account-tab="account">
                <span class="md-account-panel__link-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-settings"><path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/><circle cx="12" cy="12" r="3"/></svg></span>
                <span>${escapeHtml(t("account.account"))}</span>
                <svg class="md-account-panel__link-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
              </button>
            </nav>
            <div class="md-account-panel__foot">
              <button type="button" class="md-account-panel__signout" data-md-account-signout>
                <span class="md-account-panel__link-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-log-out"><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/></svg></span>
                <span>${escapeHtml(t("account.signout"))}</span>
              </button>
            </div>
          </div>

          
          <div class="md-account-panel__view" data-md-account-view="profile-hub" hidden>
            <p class="md-account-panel__intro">${escapeHtml(t("account.profileHub.copy"))}</p>
            <nav class="md-account-panel__nav" aria-label="${escapeHtml(t("account.profileHub"))}">
              <button type="button" class="md-account-panel__link" data-md-account-tab="profile">
                <span class="md-account-panel__link-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></svg></span>
                <span>${escapeHtml(t("account.personalInfo"))}</span>
                <svg class="md-account-panel__link-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
              </button>
              <button type="button" class="md-account-panel__link" data-md-account-tab="security">
                <span class="md-account-panel__link-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="16" r="1"/><rect x="3" y="10" width="18" height="12" rx="2"/><path d="M7 10V7a5 5 0 0 1 10 0v3"/></svg></span>
                <span>${escapeHtml(t("account.security"))}</span>
                <svg class="md-account-panel__link-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
              </button>
              <button type="button" class="md-account-panel__link" data-md-account-tab="payment">
                <span class="md-account-panel__link-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg></span>
                <span>${escapeHtml(t("account.payment"))}</span>
                <svg class="md-account-panel__link-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
              </button>
              <button type="button" class="md-account-panel__link" data-md-account-tab="address">
                <span class="md-account-panel__link-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg></span>
                <span>${escapeHtml(t("account.address"))}</span>
                <svg class="md-account-panel__link-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
              </button>
              <button type="button" class="md-account-panel__link md-account-panel__link--danger" data-md-account-tab="account">
                <span class="md-account-panel__link-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg></span>
                <span>${escapeHtml(t("account.account"))}</span>
                <svg class="md-account-panel__link-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
              </button>
            </nav>
          </div>

          <div class="md-account-panel__view" data-md-account-view="profile" hidden>
            <div class="md-account-profile-photo">
              <button type="button" class="md-account-profile-photo__button" data-md-account-profile-photo-button aria-label="Change profile picture">
                <span class="md-account-panel__avatar md-account-profile-photo__avatar" data-md-account-profile-photo-preview data-md-avatar-initials="${escapeHtml(initials)}">
                  ${renderAvatarMarkup(avatarUrl, initials)}
                </span>
                <span class="md-account-profile-photo__camera" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z"/><circle cx="12" cy="13" r="3"/></svg>
                </span>
              </button>
              <input type="file" accept="image/*" data-md-account-profile-photo-input hidden />
              <button type="button" class="md-account-profile-photo__change" data-md-account-profile-photo-change>Change profile picture</button>
              <small class="md-account-profile-photo__feedback" data-md-account-profile-photo-feedback aria-live="polite"></small>
            </div>
            <div class="md-account-profile-card">
              <div class="md-account-profile-card__field" data-md-account-profile-field>
                <button type="button" class="md-account-profile-card__toggle" data-md-account-profile-field-toggle aria-expanded="false">
                  <span>${escapeHtml(t("account.name"))}</span>
                  <svg class="md-account-profile-card__arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
                </button>
                <strong data-md-account-profile-field-value hidden>${escapeHtml(name)}</strong>
              </div>
              <div class="md-account-profile-card__field" data-md-account-profile-field>
                <button type="button" class="md-account-profile-card__toggle" data-md-account-profile-field-toggle aria-expanded="false">
                  <span>${escapeHtml(t("account.email"))}</span>
                  <svg class="md-account-profile-card__arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
                </button>
                <strong data-md-account-profile-field-value hidden>${escapeHtml(email || "—")}</strong>
              </div>
              <div class="md-account-profile-card__field" data-md-account-profile-field>
                <button type="button" class="md-account-profile-card__toggle" data-md-account-profile-field-toggle aria-expanded="false">
                  <span>${escapeHtml(t("account.phone") || "Phone")}</span>
                  <svg class="md-account-profile-card__arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
                </button>
                <strong data-md-account-profile-field-value hidden>${escapeHtml(phone)}</strong>
              </div>
              <div class="md-account-profile-card__field" data-md-account-profile-field>
                <button type="button" class="md-account-profile-card__toggle" data-md-account-profile-field-toggle aria-expanded="false">
                  <span>${escapeHtml(t("account.id"))}</span>
                  <svg class="md-account-profile-card__arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
                </button>
                <strong data-md-account-profile-field-value hidden>${escapeHtml(accountId)}</strong>
              </div>
            </div>
          </div>

          <div class="md-account-panel__view" data-md-account-view="invite" hidden>
            <div class="md-account-invite">
              <section class="md-account-invite__banner" aria-label="${escapeHtml(t("account.invite.bannerTitle"))}">
                <span class="md-account-invite__banner-copy">
                  <strong>${escapeHtml(t("account.invite.bannerTitle"))}</strong>
                  <small>${escapeHtml(t("account.invite.bannerCopy"))}</small>
                </span>
                <img src="/assets/invite-reward-art.png" alt="" aria-hidden="true" />
              </section>
              <div class="md-account-invite__stats" role="group" aria-label="${escapeHtml(t("account.invite"))}">
                <div class="md-account-invite__stat">
                  <span class="md-account-invite__stat-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg></span>
                  <span class="md-account-invite__stat-label">${escapeHtml(t("account.invite.earned"))}</span>
                  <strong data-md-invite-earned>₱0</strong>
                </div>
                <div class="md-account-invite__stat">
                  <span class="md-account-invite__stat-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></span>
                  <span class="md-account-invite__stat-label">${escapeHtml(t("account.invite.friendsJoined"))}</span>
                  <strong data-md-invite-referred>0</strong>
                </div>
              </div>
              <section class="md-account-invite__qr-card">
              <div class="md-account-invite__qr-wrap">
                <img
                  class="md-account-invite__qr"
                  data-md-invite-qr
                  src=""
                  alt="${escapeHtml(t("account.invite.qrAlt"))}"
                  width="180"
                  height="180"
                />
              </div>
              <p class="md-account-invite__qr-copy">${escapeHtml(t("account.invite.qrCopy"))}</p>
              <button type="button" class="md-account-invite__code-block" data-md-invite-copy aria-label="${escapeHtml(t("account.invite.code"))}">
                <strong data-md-invite-code>—</strong>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
              </button>
              <button type="button" class="md-account-invite__send" data-md-invite-send>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="m16 6-4-4-4 4"/><path d="M12 2v13"/></svg>
                ${escapeHtml(t("account.invite.send"))}
              </button>
              <small class="md-account-invite__feedback" data-md-invite-feedback hidden aria-live="polite"></small>
              </section>
              <section class="md-account-invite__how">
                <h3>${escapeHtml(t("account.invite.howTitle"))}</h3>
                <div class="md-account-invite__steps">
                  <div class="md-account-invite__step"><span class="md-account-invite__step-number">1</span><span class="md-account-invite__step-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98M15.41 6.51 8.59 10.49"/></svg></span><strong>${escapeHtml(t("account.invite.step1Title"))}</strong><small>${escapeHtml(t("account.invite.step1Copy"))}</small></div>
                  <span class="md-account-invite__step-arrow" aria-hidden="true">›</span>
                  <div class="md-account-invite__step"><span class="md-account-invite__step-number">2</span><span class="md-account-invite__step-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/></svg></span><strong>${escapeHtml(t("account.invite.step2Title"))}</strong><small>${escapeHtml(t("account.invite.step2Copy"))}</small></div>
                  <span class="md-account-invite__step-arrow" aria-hidden="true">›</span>
                  <div class="md-account-invite__step"><span class="md-account-invite__step-number">3</span><span class="md-account-invite__step-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/><path d="M7.5 8a2.5 2.5 0 1 1 4.5-1.5V8M16.5 8A2.5 2.5 0 1 0 12 6.5V8"/></svg></span><strong>${escapeHtml(t("account.invite.step3Title"))}</strong><small>${escapeHtml(t("account.invite.step3Copy"))}</small></div>
                </div>
              </section>
            </div>
          </div>

          <div class="md-account-panel__view" data-md-account-view="vouchers" hidden>
            ${accountVouchersHtml()}
          </div>

          <div class="md-account-panel__view" data-md-account-view="favorites" hidden>
            <div class="md-account-detail">
              <p class="md-account-panel__intro" style="margin:0">
                ${escapeHtml(t("account.favorites.copy"))}
              </p>
            </div>
          </div>

          <div class="md-account-panel__view" data-md-account-view="activity" hidden>
            <div class="md-account-detail">
              <p class="md-account-panel__intro" style="margin:0">
                ${escapeHtml(t("account.activity.copy"))}
              </p>
            </div>
          </div>

          <div class="md-account-panel__view" data-md-account-view="address" hidden>
            ${accountAddressHtml(session)}
          </div>

          <div class="md-account-panel__view" data-md-account-view="security" hidden>
            <p class="md-account-panel__intro">${escapeHtml(t("account.security.copy"))}</p>
            <div class="md-account-detail__pills" style="margin:0 17px 14px">
              <span class="md-account-detail__pill${emailVerified ? " is-ok" : ""}">
                Email: ${emailVerified ? "verified" : "not verified"}
              </span>
              <span class="md-account-detail__pill${mobileVerified ? " is-ok" : ""}">
                Phone: ${mobileVerified ? "verified" : "not verified"}
              </span>
            </div>
            <nav class="md-account-panel__nav" aria-label="${escapeHtml(t("account.security"))}">
              <button type="button" class="md-account-panel__link" data-md-account-tab="password">
                <span class="md-account-panel__link-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z"/><circle cx="16.5" cy="7.5" r=".5" fill="currentColor"/></svg></span>
                <span>${escapeHtml(t("account.password"))}</span>
                <svg class="md-account-panel__link-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
              </button>
              <button type="button" class="md-account-panel__link" data-md-account-tab="two-factor">
                <span class="md-account-panel__link-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg></span>
                <span>${escapeHtml(t("account.twoFactor"))}</span>
                <svg class="md-account-panel__link-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
              </button>
              <button type="button" class="md-account-panel__link" data-md-account-tab="account-links">
                <span class="md-account-panel__link-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></span>
                <span>${escapeHtml(t("account.links"))}</span>
                <svg class="md-account-panel__link-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
              </button>
              <button type="button" class="md-account-panel__link" data-md-account-tab="devices">
                <span class="md-account-panel__link-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg></span>
                <span>${escapeHtml(t("account.devices"))}</span>
                <svg class="md-account-panel__link-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
              </button>
            </nav>
          </div>

          <div class="md-account-panel__view" data-md-account-view="password" hidden>
            <div class="md-account-detail">
              <p class="md-account-panel__intro" style="margin:0 0 14px">${escapeHtml(t("account.password.copy"))}</p>
              <form class="md-account-password-form" data-md-change-password-form autocomplete="off">
                <label class="md-account-password-form__field">
                  <span>${escapeHtml(t("account.password.current"))}</span>
                  <input type="password" name="currentPassword" autocomplete="current-password" required />
                </label>
                <label class="md-account-password-form__field">
                  <span>${escapeHtml(t("account.password.new"))}</span>
                  <input type="password" name="newPassword" autocomplete="new-password" required />
                </label>
                <label class="md-account-password-form__field">
                  <span>${escapeHtml(t("account.password.confirm"))}</span>
                  <input type="password" name="confirmPassword" autocomplete="new-password" required />
                </label>
                <p class="md-account-password-form__feedback" data-md-change-password-feedback aria-live="polite"></p>
                <button type="submit" class="md-account-detail__action md-account-detail__action--accent" data-md-change-password-submit>
                  ${escapeHtml(t("account.password.action"))}
                </button>
              </form>
            </div>
          </div>

          <div class="md-account-panel__view" data-md-account-view="two-factor" hidden>
            <div class="md-account-detail">
              <p class="md-account-panel__intro" style="margin:0">${escapeHtml(t("account.twoFactor.copy"))}</p>
            </div>
          </div>

          <div class="md-account-panel__view" data-md-account-view="devices" hidden>
            <div class="md-account-detail md-account-devices" data-md-account-devices>
              <p class="md-account-panel__intro" style="margin:0 0 12px">${escapeHtml(t("account.devices.copy"))}</p>
              <p class="md-account-devices__empty" data-md-devices-empty>Loading signed-in devices…</p>
              <ul class="md-account-devices__list" data-md-devices-list hidden></ul>
              <p class="md-account-devices__feedback" data-md-devices-feedback aria-live="polite"></p>
              <button type="button" class="md-account-detail__action" data-md-devices-revoke-others hidden>
                Sign out other devices
              </button>
            </div>
          </div>

          <div class="md-account-panel__view" data-md-account-view="payment" hidden>
            <div class="md-account-detail">
              <p class="md-account-panel__intro" style="margin:0">
                ${escapeHtml(t("account.payment.copy"))}
              </p>
            </div>
          </div>

          <div class="md-account-panel__view" data-md-account-view="account-links" hidden>
            <div class="md-account-detail md-account-connections">
              <p class="md-account-panel__intro md-account-connections__intro">${escapeHtml(t("account.links.copy"))}</p>
              <div class="md-account-connections__list">
                <div class="md-account-connection">
                  <span class="md-account-connection__icon md-account-connection__icon--email" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="3" stroke="currentColor" stroke-width="1.8"/><path d="m5 8 7 5 7-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  </span>
                  <span class="md-account-connection__copy">
                    <strong>Email</strong>
                    <span>${email ? escapeHtml(email) : "Not linked to this account"}</span>
                  </span>
                  <span class="md-account-connection__status${email ? " is-connected" : ""}">${email ? "Connected" : "Not connected"}</span>
                  <svg class="md-account-connection__chevron" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m7.5 5 5 5-5 5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </div>
                <div class="md-account-connection">
                  <span class="md-account-connection__icon md-account-connection__icon--google" aria-hidden="true">G</span>
                  <span class="md-account-connection__copy">
                    <strong>Google</strong>
                    <span>${google.email ? escapeHtml(google.email) : "Not linked to this account"}</span>
                  </span>
                  <span class="md-account-connection__status${google.connected ? " is-connected" : ""}">${google.connected ? "Connected" : "Not connected"}</span>
                  <svg class="md-account-connection__chevron" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m7.5 5 5 5-5 5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  ${google.connected ? `<button type="button" class="md-account-connection__disconnect" data-provider="google" disabled>Disconnect</button>` : ""}
                </div>
                <div class="md-account-connection">
                  <span class="md-account-connection__icon md-account-connection__icon--facebook" aria-hidden="true">f</span>
                  <span class="md-account-connection__copy">
                    <strong>Facebook</strong>
                    <span>${facebook.email ? escapeHtml(facebook.email) : "Not linked to this account"}</span>
                  </span>
                  <span class="md-account-connection__status${facebook.connected ? " is-connected" : ""}">${facebook.connected ? "Connected" : "Not connected"}</span>
                  <svg class="md-account-connection__chevron" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m7.5 5 5 5-5 5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  ${facebook.connected ? `<button type="button" class="md-account-connection__disconnect" data-provider="facebook" disabled>Disconnect</button>` : ""}
                </div>
              </div>
            </div>
          </div>

          <div class="md-account-panel__view" data-md-account-view="preferences" hidden>
            <div class="md-account-detail md-account-detail--language">
              <div class="md-language-panel__body" role="radiogroup" aria-label="${escapeHtml(t("language.aria"))}" data-md-account-language-options>
                ${LANGUAGE_OPTIONS.map((entry) => `
                  <button
                    type="button"
                    class="md-language-panel__option${entry.code === getSavedLanguage() ? " is-selected" : ""}"
                    role="radio"
                    aria-checked="${entry.code === getSavedLanguage() ? "true" : "false"}"
                    data-md-language-option="${escapeHtml(entry.code)}"
                  >
                    <span class="md-language-panel__option-code">${escapeHtml(entry.code.toUpperCase())}</span>
                    <span class="md-language-panel__option-label">${escapeHtml(entry.label)}</span>
                    <span class="md-language-panel__option-check" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 4 4L19 6"/></svg>
                    </span>
                  </button>
                `).join("")}
              </div>
            </div>
          </div>

          <div class="md-account-panel__view" data-md-account-view="account" hidden>
            <div class="md-account-detail md-account-detail--danger">
              <strong>Delete account</strong>
              <p class="md-account-panel__intro" style="margin:8px 0 14px">
                Permanently delete your Switch buyer account. This cannot be undone.
              </p>
              <a class="md-account-detail__action" href="/switch_account.html?tab=account">
                Continue on account page
              </a>
            </div>
          </div>

          <div class="md-account-panel__view" data-md-account-view="seller" hidden>
            <div class="md-account-detail">
              <strong class="md-account-detail__heading">${escapeHtml(t("account.seller"))}</strong>
              <p class="md-account-panel__intro" style="margin:8px 0 14px">
                ${escapeHtml(t("account.seller.copy"))}
              </p>
              <ol class="md-account-detail__steps">
                <li>Choose Free or a paid plan (paid plans unlock the Legit badge)</li>
                <li>Register Visa / Mastercard (paid plans only)</li>
                <li>Create a Switch PIN</li>
                <li>Verify email or phone if needed</li>
                <li>Company name, business type &amp; photo</li>
                <li>Enter Switch PIN to open seller admin</li>
              </ol>
              <a class="md-account-detail__action md-account-detail__action--accent" href="/switch_account.html?tab=seller&amp;becomeSeller=1">
                ${escapeHtml(t("account.seller.start"))}
              </a>
            </div>
          </div>

          <div class="md-account-panel__view" data-md-account-view="companies" hidden>
            ${renderCompaniesSelectionMarkup(session)}
          </div>
        </div>
      </div>
    `;
    mountRightPanel(panel);

    const trigger = root.querySelector("[data-md-account-trigger]");
    bindMdAccountDevices(panel);

    trigger?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!root.classList.contains("is-open")) {
        showAccountPanelView(panel, "menu");
      }
      toggleRightPanel(root, panel, trigger);
    });
    bindRightPanelClose(panel, trigger);
    bindCompanySelection(panel);

    panel.querySelectorAll("[data-md-account-back], [data-md-account-invite-back], [data-md-account-voucher-back]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const history = Array.isArray(panel._mdAccountHistory)
          ? panel._mdAccountHistory
          : [];
        const previous = history.length ? history.pop() : "menu";
        panel._mdAccountHistory = history;
        showAccountPanelView(panel, previous || "menu", { back: true });
      });
    });

    panel.querySelectorAll("[data-md-account-tab]").forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        showAccountPanelView(panel, btn.getAttribute("data-md-account-tab") || "profile");
      });
    });

    const syncAccountLanguageOptions = (code) => {
      const next = normalizeLanguage(code);
      panel.querySelectorAll("[data-md-account-language-options] [data-md-language-option]").forEach((option) => {
        const selected = option.getAttribute("data-md-language-option") === next;
        option.classList.toggle("is-selected", selected);
        option.setAttribute("aria-checked", String(selected));
      });
      panel.querySelectorAll("[data-md-account-language-label]").forEach((labelEl) => {
        labelEl.textContent = languageLabel(next);
      });
    };

    panel.querySelectorAll("[data-md-account-language-options] [data-md-language-option]").forEach((option) => {
      option.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const next = applyBuyerLanguage(option.getAttribute("data-md-language-option"));
        syncAccountLanguageOptions(next);
        // Rebuild chrome so account/notif copy matches the new language.
        mountHeaderActions({ skipLanguageApply: true });
      });
    });

    panel.querySelector("[data-md-change-password-form]")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const form = event.currentTarget;
      const feedback = form.querySelector("[data-md-change-password-feedback]");
      const submitBtn = form.querySelector("[data-md-change-password-submit]");
      const currentPassword = String(form.currentPassword?.value || "");
      const newPassword = String(form.newPassword?.value || "");
      const confirmPassword = String(form.confirmPassword?.value || "");
      const accountId = String(session?.accountId || session?.id || "").trim();
      const email = String(session?.email || "").trim();

      const setPwFeedback = (message, type = "") => {
        if (!feedback) return;
        feedback.textContent = String(message || "").trim();
        feedback.classList.toggle("is-error", type === "error");
        feedback.classList.toggle("is-success", type === "success");
      };

      if (!currentPassword) {
        setPwFeedback("Enter your current password.", "error");
        return;
      }
      if (newPassword !== confirmPassword) {
        setPwFeedback("Passwords do not match.", "error");
        return;
      }
      if (!accountId && !email) {
        setPwFeedback("Sign in again, then try changing your password.", "error");
        return;
      }

      if (submitBtn) submitBtn.disabled = true;
      setPwFeedback(t("account.password.updating"));
      try {
        const response = await fetch("/api/account/change-password", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            accountId,
            email,
            currentPassword,
            newPassword,
            confirmPassword,
          }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.message || "Unable to change password.");
        }
        form.reset();
        setPwFeedback(data.message || t("account.password.success"), "success");
      } catch (error) {
        setPwFeedback(
          error instanceof Error ? error.message : "Unable to change password.",
          "error",
        );
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });

    bindInvitePanel(panel, session);
    bindVoucherPanel(panel);
    bindAccountAddress(panel, session);

    panel.querySelectorAll("[data-md-account-profile-field-toggle]").forEach((toggle) => {
      toggle.addEventListener("click", () => {
        const field = toggle.closest("[data-md-account-profile-field]");
        const value = field?.querySelector("[data-md-account-profile-field-value]");
        if (!field || !value) return;
        const expanded = toggle.getAttribute("aria-expanded") === "true";
        const card = field.closest(".md-account-profile-card") || panel;

        // Accordion: only one dropdown open (name OR email OR phone OR id).
        card.querySelectorAll("[data-md-account-profile-field]").forEach((other) => {
          if (other === field) return;
          const otherToggle = other.querySelector("[data-md-account-profile-field-toggle]");
          const otherValue = other.querySelector("[data-md-account-profile-field-value]");
          other.classList.remove("is-expanded");
          otherToggle?.setAttribute("aria-expanded", "false");
          if (otherValue) otherValue.hidden = true;
        });

        toggle.setAttribute("aria-expanded", expanded ? "false" : "true");
        field.classList.toggle("is-expanded", !expanded);
        value.hidden = expanded;
      });
    });

    const profilePhotoInput = panel.querySelector("[data-md-account-profile-photo-input]");
    const profilePhotoButton = panel.querySelector("[data-md-account-profile-photo-button]");
    const profilePhotoChange = panel.querySelector("[data-md-account-profile-photo-change]");
    const profilePhotoFeedback = panel.querySelector("[data-md-account-profile-photo-feedback]");

    const openProfilePhotoPicker = () => profilePhotoInput?.click();
    profilePhotoButton?.addEventListener("click", openProfilePhotoPicker);
    profilePhotoChange?.addEventListener("click", openProfilePhotoPicker);
    profilePhotoInput?.addEventListener("change", async () => {
      const file = profilePhotoInput.files?.[0];
      if (!file) return;

      profilePhotoButton.disabled = true;
      profilePhotoChange.disabled = true;
      profilePhotoChange.textContent = "Uploading…";
      profilePhotoFeedback.textContent = "";
      profilePhotoFeedback.classList.remove("is-error");

      try {
        const uploadResponse = await fetch("/api/uploads", {
          method: "POST",
          headers: {
            "Content-Type": file.type || "image/jpeg",
            "x-file-name": file.name || "profile-photo.jpg",
          },
          body: file,
        });
        const uploadPayload = await uploadResponse.json().catch(() => ({}));
        if (!uploadResponse.ok || !uploadPayload.imageUrl) {
          throw new Error(uploadPayload.message || "Unable to upload profile picture.");
        }

        const updateResponse = await fetch("/api/account/profile-image", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            accountId,
            email,
            profileImageUrl: uploadPayload.imageUrl,
          }),
        });
        const updatePayload = await updateResponse.json().catch(() => ({}));
        if (!updateResponse.ok) {
          throw new Error(updatePayload.message || "Unable to update profile picture.");
        }

        const updatedAccount = updatePayload.session?.account || {};
        const nextSession = {
          ...session,
          ...updatedAccount,
          accountId: String(updatedAccount.id || accountId).trim(),
          email: String(updatedAccount.email || email).trim().toLowerCase(),
          profileImageUrl: String(
            updatedAccount.profileImageUrl || uploadPayload.imageUrl,
          ).trim(),
        };
        writeStorage(BUYER_SESSION_KEY, JSON.stringify(nextSession));

        panel.querySelectorAll(".md-account-panel__avatar").forEach((avatar) => {
          avatar.dataset.mdAvatarInitials = initials;
          avatar.innerHTML = renderAvatarMarkup(nextSession.profileImageUrl, initials);
        });
        const headerAvatar = root.querySelector(".md-account-menu__avatar");
        if (headerAvatar) {
          headerAvatar.dataset.mdAvatarInitials = initials;
          headerAvatar.innerHTML = renderAvatarMarkup(nextSession.profileImageUrl, initials);
        }
        bindAvatarImageFallbacks(root);
        bindAvatarImageFallbacks(panel);
        profilePhotoFeedback.textContent = "Profile picture updated.";
      } catch (error) {
        profilePhotoFeedback.textContent = error?.message || "Unable to update profile picture.";
        profilePhotoFeedback.classList.add("is-error");
      } finally {
        profilePhotoInput.value = "";
        profilePhotoButton.disabled = false;
        profilePhotoChange.disabled = false;
        profilePhotoChange.textContent = "Change profile picture";
      }
    });

    panel.querySelector("[data-md-account-signout]")?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      signOut();
    });

    bindAvatarImageFallbacks(root);
    bindAvatarImageFallbacks(panel);
    return root;
  }

  function buildLanguageMenu({ iconOnly = false } = {}) {
    const current = getSavedLanguage();
    const root = document.createElement("div");
    root.className = `login-language-dropdown md-header-language${iconOnly ? " md-header-language--icon-only" : ""}`;
    root.dataset.mdHeaderLanguage = "true";
    const panelId = "md-buyer-language-panel";

    root.innerHTML = `
      <button
        type="button"
        class="login-language-dropdown__trigger"
        data-md-language-trigger
        aria-label="${escapeHtml(t("language.aria"))}"
        title="${escapeHtml(languageLabel(current))}"
        aria-expanded="false"
        aria-controls="${panelId}"
      >
        <span class="login-language-dropdown__globe" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
            <path d="M2 12h20"/>
          </svg>
        </span>
        <span data-md-language-label>${escapeHtml(languageLabel(current))}</span>
        <svg class="login-language-dropdown__arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6"></path>
        </svg>
      </button>
    `;

    const panel = document.createElement("aside");
    panel.id = panelId;
    panel.className = "md-right-panel md-language-panel";
    panel.dataset.mdRightPanel = "language";
    panel.setAttribute("aria-label", t("language.aria"));
    panel.hidden = true;
    panel.innerHTML = `
      <div class="md-right-panel__content">
        <div class="md-right-panel__header">
          <div class="md-right-panel__title">
            <button type="button" class="md-right-panel__back" data-md-right-panel-close aria-label="${escapeHtml(t("account.back") || "Back")}" title="${escapeHtml(t("account.back") || "Back")}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <strong>${escapeHtml(t("language.aria"))}</strong>
            <span class="md-right-panel__header-action" aria-hidden="true"></span>
          </div>
        </div>
        <div class="md-language-panel__body" role="radiogroup" aria-label="${escapeHtml(t("language.aria"))}">
          ${LANGUAGE_OPTIONS.map((entry) => `
            <button
              type="button"
              class="md-language-panel__option${entry.code === current ? " is-selected" : ""}"
              role="radio"
              aria-checked="${entry.code === current ? "true" : "false"}"
              data-md-language-option="${escapeHtml(entry.code)}"
            >
              <span class="md-language-panel__option-code">${escapeHtml(entry.code.toUpperCase())}</span>
              <span class="md-language-panel__option-label">${escapeHtml(entry.label)}</span>
              <span class="md-language-panel__option-check" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 4 4L19 6"/></svg>
              </span>
            </button>
          `).join("")}
        </div>
      </div>
    `;
    mountRightPanel(panel);

    const trigger = root.querySelector("[data-md-language-trigger]");
    const label = root.querySelector("[data-md-language-label]");

    const syncSelected = (code) => {
      const next = normalizeLanguage(code);
      panel.querySelectorAll("[data-md-language-option]").forEach((option) => {
        const selected = option.getAttribute("data-md-language-option") === next;
        option.classList.toggle("is-selected", selected);
        option.setAttribute("aria-checked", String(selected));
      });
      if (label) label.textContent = languageLabel(next);
      if (trigger) {
        trigger.setAttribute("aria-label", t("language.aria"));
        trigger.setAttribute("title", languageLabel(next));
      }
    };

    trigger?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggleRightPanel(root, panel, trigger);
    });

    panel.querySelectorAll("[data-md-language-option]").forEach((option) => {
      option.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const next = applyBuyerLanguage(option.getAttribute("data-md-language-option"));
        syncSelected(next);
        closeHeaderMenus();
        // Rebuild header menus so account/notif copy matches the new language.
        mountHeaderActions({ skipLanguageApply: true });
      });
    });
    bindRightPanelClose(panel, trigger);

    return root;
  }

  function formatNotifTime(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    try {
      return date.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch (_) {
      return date.toISOString();
    }
  }

  /**
   * Parity with Flutter `lib/utils/buyer_notification_time_sections.dart`
   * (wired from main.dart → BuyerNotificationsPanel).
   * Earlier ≤1h; Today ≤24h (exclusive of Earlier); Yesterday = calendar kahapon.
   */
  function notifSectionFor(createdAt, now = new Date()) {
    if (!createdAt) return "older";
    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) return "older";
    const ageMs = now.getTime() - date.getTime();
    const hour = 60 * 60 * 1000;
    if (ageMs >= 0 && ageMs <= hour) return "earlier";
    if (ageMs >= 0 && ageMs <= 24 * hour) return "today";
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 24 * hour);
    if (date >= yesterdayStart && date < todayStart) return "yesterday";
    return "older";
  }

  function notifSectionLabel(section) {
    if (section === "earlier") return "Earlier";
    if (section === "today") return "Today";
    if (section === "yesterday") return "Yesterday";
    return "Older";
  }

  function groupNotificationsBySection(entries) {
    const order = ["earlier", "today", "yesterday", "older"];
    const buckets = {
      earlier: [],
      today: [],
      yesterday: [],
      older: [],
    };
    const now = new Date();
    entries.forEach((entry) => {
      buckets[notifSectionFor(entry.createdAt, now)].push(entry);
    });
    return order
      .filter((key) => buckets[key].length)
      .map((key) => ({ section: key, items: buckets[key] }));
  }

  function buildNotificationMenu(session) {
    const accountId = String(session.accountId || session.id || session.email || "buyer").trim();
    const notifications = readNotifications(session);
    const readIds = readReadNotificationIds(accountId);
    let activeFilter = "all";
    const unreadCount = notifications.filter((entry) => !readIds.has(entry.id)).length;

    const root = document.createElement("div");
    root.className = "md-notification-menu";
    root.dataset.mdNotificationMenu = "true";

    const panelId = "md-buyer-notification-panel";

    function renderNotificationItems(listEl) {
      if (!(listEl instanceof HTMLElement)) return;
      const filtered = activeFilter === "unread"
        ? notifications.filter((entry) => !readIds.has(entry.id))
        : notifications.slice();
      const countEl = panel.querySelector("[data-md-notification-count]");
      if (countEl) countEl.textContent = String(filtered.length);

      if (!filtered.length) {
        listEl.innerHTML = `<div class="md-notification-panel__empty">${escapeHtml(
          activeFilter === "unread" ? t("notifications.emptyUnread") : t("notifications.empty"),
        )}</div>`;
        return;
      }

      const groups = groupNotificationsBySection(filtered);
      listEl.innerHTML = groups.map((group) => {
        const itemsHtml = group.items.map((entry) => {
          const presentation = resolveBuyerNotificationPresentation(entry);
          const unread = !readIds.has(entry.id);
          return `
          <article class="md-notification-panel__item${unread ? " is-unread" : ""}" data-md-notification-id="${escapeHtml(entry.id)}">
            <span class="md-notification-panel__avatar${presentation.isSwitch ? " is-switch" : ""}${presentation.avatarUrl ? " has-image" : ""}">
              ${buildNotificationAvatarMarkup(presentation)}
            </span>
            <div class="md-notification-panel__copy">
              ${buildNotificationCopyMarkup(presentation)}
              ${entry.createdAt ? `<time>${escapeHtml(formatNotifTime(entry.createdAt))}</time>` : ""}
            </div>
            <span class="md-notification-panel__dot" aria-hidden="true"></span>
          </article>`;
        }).join("");
        return `
          <section class="md-notification-panel__group">
            <h3 class="md-notification-panel__section">${escapeHtml(notifSectionLabel(group.section))}</h3>
            ${itemsHtml}
          </section>`;
      }).join("");
    }

    root.innerHTML = `
      <button
        type="button"
        class="md-notification-menu__trigger"
        data-md-notification-trigger
        aria-label="${escapeHtml(t("notifications.aria"))}"
        aria-expanded="false"
        aria-controls="${panelId}"
        title="${escapeHtml(t("notifications.aria"))}"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bell" aria-hidden="true"><path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/></svg>
        <span class="md-notification-menu__badge" data-md-notification-badge ${unreadCount ? "" : "hidden"}>${unreadCount > 99 ? "99+" : unreadCount}</span>
      </button>
    `;

    const panel = document.createElement("aside");
    panel.id = panelId;
    panel.className = "md-right-panel md-notification-panel";
    panel.dataset.mdNotificationPanel = "true";
    panel.dataset.mdRightPanel = "notifications";
    panel.setAttribute("aria-label", t("notifications.aria"));
    panel.hidden = true;
    panel.innerHTML = `
      <div class="md-right-panel__content">
        <div class="md-right-panel__header">
          <div class="md-right-panel__title">
            <button type="button" class="md-right-panel__back" data-md-right-panel-close aria-label="${escapeHtml(t("account.back") || "Back")}" title="${escapeHtml(t("account.back") || "Back")}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <strong>${escapeHtml(t("notifications.aria"))}</strong>
            <span class="md-right-panel__header-action" aria-hidden="true"></span>
          </div>
        </div>
        <div class="md-notification-panel__body">
          <div class="md-notification-panel__filters" role="tablist" aria-label="${escapeHtml(t("notifications.filter"))}">
            <button
              type="button"
              class="md-notification-panel__filter is-active"
              data-md-notification-filter="all"
              role="tab"
              aria-selected="true"
            >${escapeHtml(t("notifications.filter.all"))}</button>
            <button
              type="button"
              class="md-notification-panel__filter"
              data-md-notification-filter="unread"
              role="tab"
              aria-selected="false"
            >${escapeHtml(t("notifications.filter.unread"))}</button>
            <span class="md-notification-panel__count-inline" data-md-notification-count>${notifications.length}</span>
          </div>
          <div class="md-notification-panel__list" data-md-notification-list></div>
        </div>
      </div>
    `;
    mountRightPanel(panel);

    const trigger = root.querySelector("[data-md-notification-trigger]");
    const badge = root.querySelector("[data-md-notification-badge]");
    const listEl = panel.querySelector("[data-md-notification-list]");
    renderNotificationItems(listEl);

    const syncFilterButtons = () => {
      panel.querySelectorAll("[data-md-notification-filter]").forEach((button) => {
        const selected = button.getAttribute("data-md-notification-filter") === activeFilter;
        button.classList.toggle("is-active", selected);
        button.setAttribute("aria-selected", String(selected));
      });
    };

    panel.querySelectorAll("[data-md-notification-filter]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const next = button.getAttribute("data-md-notification-filter") === "unread" ? "unread" : "all";
        if (next === activeFilter) return;
        activeFilter = next;
        syncFilterButtons();
        renderNotificationItems(listEl);
      });
    });

    const markAllRead = () => {
      notifications.forEach((entry) => readIds.add(entry.id));
      writeReadNotificationIds(accountId, readIds);
      renderNotificationItems(listEl);
      if (badge) {
        badge.hidden = true;
        badge.textContent = "0";
      }
    };

    trigger?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggleRightPanel(root, panel, trigger, markAllRead);
    });
    bindRightPanelClose(panel, trigger);

    return root;
  }

  function normalizePlatformId(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function isPlatformStorefrontPage() {
    return /\/switch_shop\.html$/i.test(window.location.pathname)
      || document.body.classList.contains("ss-app");
  }

  function currentPlatformId() {
    const params = new URLSearchParams(window.location.search);
    return normalizePlatformId(params.get("platform")) || "shop";
  }

  function shouldShowHeaderCart() {
    // Cart chrome is for Shop + Food storefronts.
    if (!isPlatformStorefrontPage()) return false;
    const platform = currentPlatformId();
    return platform === "shop" || platform === "food";
  }

  function readCartItems() {
    try {
      const raw = JSON.parse(window.localStorage.getItem(BUYER_CART_KEY) || "[]");
      return Array.isArray(raw) ? raw : [];
    } catch (_) {
      return [];
    }
  }

  function getCartBadgeCount() {
    return readCartItems().reduce((sum, item) => {
      const qty = Number(item?.quantity);
      return sum + (Number.isFinite(qty) && qty > 0 ? qty : 1);
    }, 0);
  }

  function buildCartButton() {
    const count = getCartBadgeCount();
    const root = document.createElement("a");
    root.className = "md-cart-link";
    root.href = CART_PATH;
    root.dataset.mdCartLink = "true";
    root.setAttribute("aria-label", t("cart.aria"));
    root.title = t("cart.aria");
    const isFood = currentPlatformId() === "food";
    const icon = isFood
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-soup" aria-hidden="true">
        <path d="M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z"/>
        <path d="M7 21h10"/>
        <path d="M19.5 12 22 6"/>
        <path d="M16.25 3c.27.1.8.53.75 1.36-.06.83-.93 1.2-1 2.02-.05.78.34 1.24.73 1.62"/>
        <path d="M11.25 3c.27.1.8.53.74 1.36-.05.83-.93 1.2-.98 2.02-.06.78.33 1.24.72 1.62"/>
        <path d="M6.25 3c.27.1.8.53.75 1.36-.06.83-.93 1.2-1 2.02-.05.78.34 1.24.74 1.62"/>
      </svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shopping-cart" aria-hidden="true">
        <path d="m2.05 2.05 1.099-.028a1 1 0 0 1 1.008.815l2.69 14.347A1 1 0 0 0 7.83 18H18" />
        <path d="M4.563 5h16.435a1 1 0 0 1 .981 1.204l-1.026 6.226A2 2 0 0 1 18.962 14H6.25" />
        <circle cx="18" cy="20" r="2" />
        <circle cx="8" cy="20" r="2" />
      </svg>`;
    root.innerHTML = `
      ${icon}
      <span class="md-cart-link__badge" data-md-cart-badge ${count ? "" : "hidden"}>${count > 99 ? "99+" : count}</span>
    `;
    return root;
  }

  function refreshCartBadges() {
    const count = getCartBadgeCount();
    document.querySelectorAll("[data-md-cart-badge]").forEach((badge) => {
      if (!(badge instanceof HTMLElement)) return;
      badge.hidden = !count;
      badge.textContent = count > 99 ? "99+" : String(count);
    });
  }

  function ensureHeaderActions(inner) {
    let actions = inner.querySelector("[data-md-header-actions]");
    if (actions instanceof HTMLElement) return actions;
    actions = document.createElement("div");
    actions.className = "login-site-header__actions";
    actions.dataset.mdHeaderActions = "true";
    inner.appendChild(actions);
    return actions;
  }

  function captureOpenRightPanelState() {
    const openAccountMenu = document.querySelector(".md-account-menu.is-open");
    if (openAccountMenu) {
      const panel = controlledRightPanel(openAccountMenu);
      if (panel instanceof HTMLElement && !panel.hidden) {
        return {
          kind: "account",
          view: String(panel.dataset.mdAccountView || "menu").trim() || "menu",
          history: Array.isArray(panel._mdAccountHistory)
            ? panel._mdAccountHistory.slice()
            : [],
        };
      }
    }
    const openLanguageMenu = document.querySelector(".md-header-language.is-open");
    if (openLanguageMenu) {
      const panel = controlledRightPanel(openLanguageMenu);
      if (panel instanceof HTMLElement && !panel.hidden) {
        return { kind: "language" };
      }
    }
    const openNotificationMenu = document.querySelector(".md-notification-menu.is-open");
    if (openNotificationMenu) {
      const panel = controlledRightPanel(openNotificationMenu);
      if (panel instanceof HTMLElement && !panel.hidden) {
        return { kind: "notification" };
      }
    }
    return null;
  }

  function restoreOpenRightPanelState(state) {
    if (!state || typeof state !== "object") return;
    if (state.kind === "account") {
      const menu = document.querySelector(".md-account-menu");
      const trigger = menu?.querySelector("[data-md-account-trigger]");
      const panel = controlledRightPanel(menu);
      if (!(menu instanceof HTMLElement) || !(panel instanceof HTMLElement) || !trigger) {
        return;
      }
      panel._mdAccountHistory = Array.isArray(state.history) ? state.history.slice() : [];
      menu.classList.add("is-open");
      trigger.setAttribute("aria-expanded", "true");
      panel.hidden = false;
      document.body.classList.add("md-right-panel-open");
      showAccountPanelView(panel, state.view || "menu", { restore: true });
      return;
    }
    if (state.kind === "language") {
      const menu = document.querySelector(".md-header-language");
      const trigger = menu?.querySelector("[data-md-language-trigger]");
      const panel = controlledRightPanel(menu);
      if (menu && panel && trigger) openRightPanel(menu, panel, trigger);
      return;
    }
    if (state.kind === "notification") {
      const menu = document.querySelector(".md-notification-menu");
      const trigger = menu?.querySelector("[data-md-notification-trigger]");
      const panel = controlledRightPanel(menu);
      if (menu && panel && trigger) openRightPanel(menu, panel, trigger);
    }
  }

  function mountHeaderActions(options = {}) {
    if (new URLSearchParams(window.location.search).get("embed") === "1") {
      document.body.classList.add("is-embed");
      return;
    }

    const session = readBuyerSession();
    const showCart = shouldShowHeaderCart();
    const restoreState = options.preserveOpenPanel === false
      ? null
      : captureOpenRightPanelState();

    document.body.classList.remove("md-right-panel-open");
    document.querySelectorAll("[data-md-right-panel]").forEach((panel) => panel.remove());

    document.querySelectorAll(".login-site-header__inner").forEach((inner) => {
      if (shouldSkipHeader(inner)) return;

      // Keep platform/home chrome consistent for any future storefront header.
      inner.closest(".login-site-header")?.setAttribute("data-md-buyer-chrome", "true");

      const actions = ensureHeaderActions(inner);
      actions.replaceChildren();

      // Logged-in: notifications and account settings stay available everywhere.
      // Language moves into the account right sidebar when signed in.
      if (session) {
        actions.appendChild(buildNotificationMenu(session));
      } else {
        actions.appendChild(buildLanguageMenu({ iconOnly: true }));
      }
      // Shop only: cart sits beside notifications / language.
      if (showCart) {
        actions.appendChild(buildCartButton());
      }
      if (session) {
        actions.appendChild(buildAccountMenu(session));
      }
    });

    if (!options.skipLanguageApply) {
      if (session) {
        applyAccountLanguagePreference(session);
      } else {
        applyBuyerLanguage(getSavedLanguage(), { persist: false });
      }
    }
    syncSiteHeaderHeight();
    restoreOpenRightPanelState(restoreState);
  }

  function mountAccountMenus() {
    mountHeaderActions();
  }

  function bindGlobalUi() {
    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-md-account-menu], [data-md-header-language], [data-md-notification-menu], [data-md-right-panel]")) {
        return;
      }
      closeHeaderMenus();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      const openAccountMenu = document.querySelector(".md-account-menu.is-open");
      const panelId = openAccountMenu
        ?.querySelector("[data-md-account-trigger]")
        ?.getAttribute("aria-controls");
      const openAccountPanel = panelId ? document.getElementById(panelId) : null;
      if (
        openAccountPanel instanceof HTMLElement
        && !openAccountPanel.hidden
        && openAccountPanel.dataset.mdAccountView
        && openAccountPanel.dataset.mdAccountView !== "menu"
      ) {
        showAccountPanelView(openAccountPanel, "menu");
        return;
      }
      closeHeaderMenus();
    });

    window.addEventListener("resize", () => {
      syncSiteHeaderHeight();
    });

    window.addEventListener("gms-buyer-session-updated", () => {
      mountHeaderActions();
    });

    window.addEventListener("gms-buyer-cart-updated", () => {
      refreshCartBadges();
      if (shouldShowHeaderCart() && !document.querySelector("[data-md-cart-link]")) {
        mountHeaderActions({ skipLanguageApply: true });
      }
    });

    window.addEventListener("storage", (event) => {
      if (event.key === BUYER_CART_KEY) refreshCartBadges();
    });
  }

  function redirectLoginIfSignedIn() {
    if (!/\/login\.html$/i.test(window.location.pathname)) return;
    const session = readBuyerSession();
    if (!session) return;
    window.location.replace(HOME_PATH);
  }

  function boot() {
    capturePendingInviteRef();
    redirectLoginIfSignedIn();
    const session = readBuyerSession();
    if (session) {
      const accountId = String(session.accountId || session.id || "").trim();
      const code = buildInviteCode(accountId);
      if (code) registerInviteCode(accountId, code);
      applyPendingInviteCredit(session);
      applyAccountLanguagePreference(session);
      void syncSavedAccountAddressBook(session);
    } else {
      applyBuyerLanguage(getSavedLanguage(), { persist: false });
    }
    bindGlobalUi();
    mountHeaderActions();
    void refreshBuyerProfile();
    startDeviceSessionWatch();
  }

  window.SwitchBuyerAuth = {
    readBuyerSession,
    saveBuyerSession,
    clearBuyerSession,
    signOut,
    getDisplayName,
    refreshBuyerProfile,
    mountAccountMenus,
    mountHeaderActions,
    applyBuyerLanguage,
    applyAccountLanguagePreference,
    getSavedLanguage,
    getCartBadgeCount,
    refreshCartBadges,
    t,
    readSavedAccountAddressBook,
    writeSavedAccountAddressBook,
    syncSavedAccountAddressBook,
    addressSummaryLine,
    normalizeAddressEntry,
    mountAccountAddressManager,
    CURRENT_LOCATION_ADDRESS_ID,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
