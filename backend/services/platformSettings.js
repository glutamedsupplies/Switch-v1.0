"use strict";

const path = require("path");
const fsPromises = require("fs/promises");

const WORKSPACE_SETTINGS_FILE = path.join(__dirname, "..", "data", "workspace_settings.json");

/** Boolean flags: true = feature on (except maintenance* where true = locked down). */
const PLATFORM_BOOLEAN_DEFAULTS = Object.freeze({
  appMaintenance: false,
  sellerMaintenance: false,
  buyerMaintenance: false,
  performanceMode: true,
  sellerSignups: true,
  sellerLoginAccess: true,
  sellerProductSubmissions: true,
  sellerProductEditing: true,
  sellerPayoutRequests: true,
  buyerRegistration: true,
  buyerLoginAccess: true,
  buyerCheckout: true,
  buyerBookings: true,
  buyerReviews: true,
  onlinePayments: true,
  cashOnDelivery: true,
  deliveryAssignment: true,
  refundCenter: true,
  promosAndDiscounts: true,
  requireSellerVerification: true,
  requireBuyerVerification: false,
  fraudMonitoring: true,
  auditLogging: true,
  loginRateLimit: true,
  liveChat: true,
  pushNotifications: true,
  emailNotifications: true,
  smsNotifications: false,
  yoloAutoInspection: true,
  betaFeatures: false,
  realtimeDataSync: true,
  notificationSounds: true,
  reducedMotion: false,
  compactDataView: false,
  buyerAi: true,
  sellerAi: true,
  riderAi: true,
  aiCheckout: true,
  aiSellerActions: true,
});

const PLATFORM_SCALAR_DEFAULTS = Object.freeze({
  defaultLanguage: "en",
  sessionTimeoutMinutes: 1440,
});

const ALLOWED_LANGUAGES = new Set(["en", "fil"]);

/** Flags that are inverted: true means the surface is locked. */
const MAINTENANCE_FLAGS = new Set([
  "appMaintenance",
  "sellerMaintenance",
  "buyerMaintenance",
]);

/**
 * Server enforcement coverage for SA Settings badges.
 * - active: backend (or shared client apply) honors the flag
 * - saved: persisted only / no meaningful server consumer yet
 */
const PLATFORM_SETTING_ENFORCEMENT = Object.freeze({
  appMaintenance: "active",
  sellerMaintenance: "active",
  buyerMaintenance: "active",
  performanceMode: "active",
  sellerSignups: "active",
  sellerLoginAccess: "active",
  sellerProductSubmissions: "active",
  sellerProductEditing: "active",
  sellerPayoutRequests: "active",
  buyerRegistration: "active",
  buyerLoginAccess: "active",
  buyerCheckout: "active",
  buyerBookings: "active",
  buyerReviews: "active",
  onlinePayments: "active",
  cashOnDelivery: "active",
  deliveryAssignment: "active",
  refundCenter: "active",
  promosAndDiscounts: "active",
  requireSellerVerification: "active",
  requireBuyerVerification: "active",
  fraudMonitoring: "active",
  auditLogging: "active",
  loginRateLimit: "active",
  liveChat: "active",
  pushNotifications: "saved",
  emailNotifications: "active",
  smsNotifications: "active",
  yoloAutoInspection: "active",
  betaFeatures: "saved",
  realtimeDataSync: "active",
  notificationSounds: "active",
  reducedMotion: "active",
  compactDataView: "active",
  buyerAi: "active",
  sellerAi: "active",
  riderAi: "active",
  aiCheckout: "active",
  aiSellerActions: "active",
  defaultLanguage: "active",
  sessionTimeoutMinutes: "active",
});

const DANGEROUS_PLATFORM_SETTINGS = Object.freeze({
  appMaintenance: {
    enable: "Turn on App Maintenance Mode? Buyers and sellers will be blocked from the API until you turn this off.",
    disable: "",
  },
  sellerMaintenance: {
    enable: "Turn on Seller Side Maintenance? Seller login and seller tools will be blocked.",
    disable: "",
  },
  buyerMaintenance: {
    enable: "Turn on Buyer Side Maintenance? Buyer login and checkout will be blocked.",
    disable: "",
  },
  sellerLoginAccess: {
    enable: "",
    disable: "Disable Seller Login Access? Existing sellers will not be able to sign in.",
  },
  buyerLoginAccess: {
    enable: "",
    disable: "Disable Buyer Login Access? Buyers will not be able to sign in.",
  },
  buyerCheckout: {
    enable: "",
    disable: "Disable Checkout? Buyers will not be able to place or pay for orders.",
  },
  onlinePayments: {
    enable: "",
    disable: "Disable Online Payments? Hosted PayMongo checkout will be blocked.",
  },
  sellerSignups: {
    enable: "",
    disable: "Disable Seller Signups? New become-seller onboarding will stop.",
  },
  buyerRegistration: {
    enable: "",
    disable: "Disable Buyer Registration? New buyer accounts cannot be created.",
  },
  liveChat: {
    enable: "",
    disable: "Disable Live Chat? Buyers and sellers will not be able to send chat messages.",
  },
});

let cache = { at: 0, settings: null };
const CACHE_MS = 1500;

function getPlatformSettingDefaults() {
  return {
    ...PLATFORM_BOOLEAN_DEFAULTS,
    ...PLATFORM_SCALAR_DEFAULTS,
  };
}

function normalizeDefaultLanguage(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "fil" || normalized === "tl" || normalized === "tagalog") {
    return "fil";
  }
  if (normalized === "en" || normalized === "english") {
    return "en";
  }
  return PLATFORM_SCALAR_DEFAULTS.defaultLanguage;
}

function normalizeSessionTimeoutMinutes(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return PLATFORM_SCALAR_DEFAULTS.sessionTimeoutMinutes;
  }
  return Math.min(43200, Math.max(15, Math.trunc(parsed)));
}

function normalizePlatformSettings(source) {
  const input = source && typeof source === "object" && !Array.isArray(source) ? source : {};
  const next = { ...getPlatformSettingDefaults() };

  for (const key of Object.keys(PLATFORM_BOOLEAN_DEFAULTS)) {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      next[key] = Boolean(input[key]);
    }
  }

  if (Object.prototype.hasOwnProperty.call(input, "defaultLanguage")) {
    next.defaultLanguage = normalizeDefaultLanguage(input.defaultLanguage);
  }
  if (Object.prototype.hasOwnProperty.call(input, "sessionTimeoutMinutes")) {
    next.sessionTimeoutMinutes = normalizeSessionTimeoutMinutes(input.sessionTimeoutMinutes);
  }

  return next;
}

/** Allowlist-only merge for API writes (drops unknown keys). */
function normalizePlatformSettingsPayload(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const next = {};
  for (const key of Object.keys(PLATFORM_BOOLEAN_DEFAULTS)) {
    if (Object.prototype.hasOwnProperty.call(value, key) && typeof value[key] === "boolean") {
      next[key] = value[key];
    }
  }
  if (Object.prototype.hasOwnProperty.call(value, "defaultLanguage")) {
    next.defaultLanguage = normalizeDefaultLanguage(value.defaultLanguage);
  }
  if (Object.prototype.hasOwnProperty.call(value, "sessionTimeoutMinutes")) {
    next.sessionTimeoutMinutes = normalizeSessionTimeoutMinutes(value.sessionTimeoutMinutes);
  }
  return next;
}

function getEnforcementMap() {
  return { ...PLATFORM_SETTING_ENFORCEMENT };
}

function getDangerousSettingPrompt(key, nextEnabled) {
  const entry = DANGEROUS_PLATFORM_SETTINGS[key];
  if (!entry) {
    return "";
  }
  return nextEnabled ? String(entry.enable || "") : String(entry.disable || "");
}

function isMaintenanceFlag(flag) {
  return MAINTENANCE_FLAGS.has(String(flag || ""));
}

/** Returns true when the setting currently blocks the action. */
function isPlatformSettingBlocking(settings, flag) {
  const key = String(flag || "").trim();
  const normalized = normalizePlatformSettings(settings);
  if (isMaintenanceFlag(key)) {
    return normalized[key] === true;
  }
  if (Object.prototype.hasOwnProperty.call(PLATFORM_BOOLEAN_DEFAULTS, key)) {
    return normalized[key] === false;
  }
  return false;
}

function isPlatformSettingEnabled(settings, flag) {
  return !isPlatformSettingBlocking(settings, flag);
}

async function readWorkspacePlatformSettingsRaw() {
  try {
    const raw = await fsPromises.readFile(WORKSPACE_SETTINGS_FILE, "utf8");
    const decoded = JSON.parse(raw);
    if (!decoded || typeof decoded !== "object") {
      return {};
    }
    return decoded.platformSettings && typeof decoded.platformSettings === "object"
      ? decoded.platformSettings
      : {};
  } catch (_error) {
    return {};
  }
}

async function getPlatformSettings({ force = false } = {}) {
  const now = Date.now();
  if (!force && cache.settings && now - cache.at < CACHE_MS) {
    return cache.settings;
  }
  const settings = normalizePlatformSettings(await readWorkspacePlatformSettingsRaw());
  cache = { at: now, settings };
  return settings;
}

function getPlatformSettingsSync() {
  return cache.settings ? { ...cache.settings } : getPlatformSettingDefaults();
}

function invalidatePlatformSettingsCache(nextSettings = null) {
  if (nextSettings && typeof nextSettings === "object") {
    cache = {
      at: Date.now(),
      settings: normalizePlatformSettings(nextSettings),
    };
    return cache.settings;
  }
  cache = { at: 0, settings: null };
  return null;
}

function getSessionTtlSecondsFromSettings(settings = getPlatformSettingsSync()) {
  const minutes = normalizeSessionTimeoutMinutes(settings?.sessionTimeoutMinutes);
  return minutes * 60;
}

function buildPlatformBlockedPayload(flag, message) {
  return {
    message:
      String(message || "").trim() ||
      `This action is disabled by Super Admin platform settings (${flag}).`,
    code: "PLATFORM_SETTING_DISABLED",
    setting: String(flag || "").trim(),
  };
}

module.exports = {
  PLATFORM_BOOLEAN_DEFAULTS,
  PLATFORM_SCALAR_DEFAULTS,
  PLATFORM_SETTING_ENFORCEMENT,
  DANGEROUS_PLATFORM_SETTINGS,
  ALLOWED_LANGUAGES,
  MAINTENANCE_FLAGS,
  WORKSPACE_SETTINGS_FILE,
  getPlatformSettingDefaults,
  normalizePlatformSettings,
  normalizePlatformSettingsPayload,
  normalizeDefaultLanguage,
  normalizeSessionTimeoutMinutes,
  getEnforcementMap,
  getDangerousSettingPrompt,
  isMaintenanceFlag,
  isPlatformSettingBlocking,
  isPlatformSettingEnabled,
  getPlatformSettings,
  getPlatformSettingsSync,
  invalidatePlatformSettingsCache,
  getSessionTtlSecondsFromSettings,
  buildPlatformBlockedPayload,
};
