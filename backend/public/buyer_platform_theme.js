/**
 * Buyer web platform accent theme (parity with Flutter PlatformThemeSync).
 * Overrides workspace --accent* while a platform storefront is open.
 */
(function (global) {
  const WORKSPACE_COLOR_KEY = "gms-workspace-color";
  const PLATFORM_COLOR_CACHE_KEY = "gms-platform-color-cache";
  const ACTIVE_PLATFORM_ID_KEY = "gms-active-buyer-platform-id";

  const DEFAULT_PLATFORM_COLORS = Object.freeze({
    shop: "#2563eb",
    food: "#ea580c",
    hotels: "#7c3aed",
    resort: "#0891b2",
  });

  function normalizeHex(value, fallback = "") {
    const raw = String(value || "").trim().toLowerCase();
    if (/^#[0-9a-f]{6}$/.test(raw)) return raw;
    if (/^[0-9a-f]{6}$/.test(raw)) return `#${raw}`;
    return fallback;
  }

  function normalizePlatformId(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function readColorCache() {
    try {
      const raw = window.sessionStorage.getItem(PLATFORM_COLOR_CACHE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  function writeColorCache(platformId, hex) {
    const id = normalizePlatformId(platformId);
    const color = normalizeHex(hex);
    if (!id || !color) return;
    try {
      const next = { ...readColorCache(), [id]: color };
      window.sessionStorage.setItem(PLATFORM_COLOR_CACHE_KEY, JSON.stringify(next));
      window.sessionStorage.setItem(ACTIVE_PLATFORM_ID_KEY, id);
    } catch (_) {
      // Theme still applies for this page load.
    }
  }

  function readWorkspaceHex() {
    try {
      return normalizeHex(window.localStorage.getItem(WORKSPACE_COLOR_KEY), "#2563eb");
    } catch (_) {
      return "#2563eb";
    }
  }

  function applyAccentHex(hex) {
    const color = normalizeHex(hex);
    if (!color) return false;
    const match = color.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
    if (!match) return false;
    const r = Number.parseInt(match[1], 16);
    const g = Number.parseInt(match[2], 16);
    const b = Number.parseInt(match[3], 16);
    const hr = Math.round(r * 0.82);
    const hg = Math.round(g * 0.82);
    const hb = Math.round(b * 0.82);
    const root = document.documentElement;
    root.style.setProperty("--accent", `rgb(${r}, ${g}, ${b})`);
    root.style.setProperty("--accent-rgb", `${r}, ${g}, ${b}`);
    root.style.setProperty("--accent-strong", `rgb(${hr}, ${hg}, ${hb})`);
    root.style.setProperty("--accent-text", `rgb(${hr}, ${hg}, ${hb})`);
    root.style.setProperty("--accent-button-bg", `rgb(${r}, ${g}, ${b})`);
    root.style.setProperty("--accent-button-hover-bg", `rgb(${hr}, ${hg}, ${hb})`);
    root.style.setProperty("--md-accent", `rgb(${r}, ${g}, ${b})`);
    root.style.setProperty("--md-accent-soft", `rgba(${r}, ${g}, ${b}, 0.12)`);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    root.style.setProperty("--accent-contrast", yiq >= 160 ? "#111827" : "#ffffff");
    return true;
  }

  function resolvePlatformPrimaryColor(platformId, platformMeta) {
    const id = normalizePlatformId(platformId || platformMeta?.id);
    const fromMeta = normalizeHex(
      platformMeta?.primaryColor
        || platformMeta?.color
        || platformMeta?.accentColor,
    );
    if (fromMeta) return fromMeta;

    const cache = readColorCache();
    const fromCache = normalizeHex(cache[id]);
    if (fromCache) return fromCache;

    return DEFAULT_PLATFORM_COLORS[id] || readWorkspaceHex();
  }

  function applyPlatformTheme(platformId, platformMeta) {
    const id = normalizePlatformId(platformId || platformMeta?.id);
    if (!id) return false;
    const hex = resolvePlatformPrimaryColor(id, platformMeta);
    writeColorCache(id, hex);
    return applyAccentHex(hex);
  }

  function restoreWorkspaceTheme() {
    try {
      window.sessionStorage.removeItem(ACTIVE_PLATFORM_ID_KEY);
    } catch (_) {
      // Ignore storage errors.
    }
    return applyAccentHex(readWorkspaceHex());
  }

  function platformIdFromLocation() {
    try {
      const params = new URLSearchParams(window.location.search);
      return normalizePlatformId(params.get("platform"));
    } catch (_) {
      return "";
    }
  }

  function bootstrapFromPage() {
    const path = String(window.location.pathname || "").toLowerCase();
    if (path.endsWith("/main_dart.html") || path.endsWith("/main_dart")) {
      restoreWorkspaceTheme();
      return;
    }

    const platformId = platformIdFromLocation();
    if (platformId) {
      applyPlatformTheme(platformId);
      return;
    }

    // Account/cart without ?platform= keep last active platform accent if any.
    try {
      const lastId = normalizePlatformId(
        window.sessionStorage.getItem(ACTIVE_PLATFORM_ID_KEY),
      );
      if (lastId && (path.includes("switch_account") || path.includes("switch_cart"))) {
        applyPlatformTheme(lastId);
      }
    } catch (_) {
      // Keep page default accent.
    }
  }

  const api = {
    DEFAULT_PLATFORM_COLORS,
    normalizeHex,
    normalizePlatformId,
    applyAccentHex,
    resolvePlatformPrimaryColor,
    applyPlatformTheme,
    restoreWorkspaceTheme,
    bootstrapFromPage,
    platformIdFromLocation,
  };

  global.BuyerPlatformTheme = api;
  bootstrapFromPage();
})(window);
