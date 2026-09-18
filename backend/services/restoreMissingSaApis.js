"use strict";

const path = require("path");
const crypto = require("crypto");
const fs = require("fs");
const fsPromises = require("fs/promises");

/**
 * Restores Super Admin APIs wiped when server.js was rolled back to the Aug 15 backup:
 * chat wallpapers, platform settings, AI integration, biometric settings/firmware,
 * and SA notification read + inbox fan-out for product-requests?view=notifications.
 */
function createRestoreMissingSaApis(deps) {
  const {
    DATA_DIR,
    UPLOADS_DIR,
    ensureStoragePaths,
    writeJsonFileAtomically,
    enqueueSerializedMutation,
    requireSuperAdmin,
    sendJson,
    parseRequestBody,
    createHttpError,
    normalizeAdminTenantId,
    readWorkspaceSettings,
    writeWorkspaceSettings,
    setCorsHeaders,
    biometricFirmwareCompile = null,
  } = deps;

  const CHAT_WALLPAPERS_FILE = path.join(DATA_DIR, "chat_wallpapers.json");
  const BIOMETRIC_SETTINGS_FILE = path.join(DATA_DIR, "biometric_settings.json");
  const SUPER_ADMIN_NOTIFICATIONS_FILE = path.join(
    DATA_DIR,
    "super_admin_notifications.json",
  );
  const MAX_CHAT_WALLPAPERS = 24;
  const MAX_SUPER_ADMIN_NOTIFICATIONS = 5_000;

  const PROVIDER_LABELS = {
    openai: "OpenAI",
    anthropic: "Claude (Anthropic)",
    gemini: "Google Gemini",
  };

  // Fallback catalog when live provider listing is unavailable.
  // Prefer live /v1/models results so the picker matches the connected API key.
  const DEFAULT_MODELS = {
    openai: {
      chat: [
        { id: "gpt-6-astra", label: "gpt-6-astra" },
        { id: "gpt-5.6-sol", label: "gpt-5.6-sol" },
        { id: "gpt-5.6", label: "gpt-5.6" },
        { id: "gpt-5.6-terra", label: "gpt-5.6-terra" },
        { id: "gpt-5.6-luna", label: "gpt-5.6-luna" },
        { id: "gpt-5.5-pro", label: "gpt-5.5-pro" },
        { id: "gpt-5.5", label: "gpt-5.5" },
        { id: "gpt-5.4-pro", label: "gpt-5.4-pro" },
        { id: "gpt-5.4", label: "gpt-5.4" },
        { id: "gpt-5.4-mini", label: "gpt-5.4-mini" },
        { id: "gpt-5.4-nano", label: "gpt-5.4-nano" },
        { id: "gpt-5.3-chat-latest", label: "gpt-5.3-chat-latest" },
        { id: "gpt-5.2-pro", label: "gpt-5.2-pro" },
        { id: "gpt-5.2-chat-latest", label: "gpt-5.2-chat-latest" },
        { id: "gpt-5.2", label: "gpt-5.2" },
        { id: "gpt-5.1-chat-latest", label: "gpt-5.1-chat-latest" },
        { id: "gpt-5.1", label: "gpt-5.1" },
        { id: "gpt-5-pro", label: "gpt-5-pro" },
        { id: "gpt-5-chat-latest", label: "gpt-5-chat-latest" },
        { id: "gpt-5", label: "gpt-5" },
        { id: "gpt-5-mini", label: "gpt-5-mini" },
        { id: "gpt-5-nano", label: "gpt-5-nano" },
        { id: "gpt-4.1", label: "gpt-4.1" },
        { id: "gpt-4.1-mini", label: "gpt-4.1-mini" },
        { id: "gpt-4.1-nano", label: "gpt-4.1-nano" },
        { id: "gpt-4o", label: "gpt-4o" },
        { id: "gpt-4o-mini", label: "gpt-4o-mini" },
        { id: "o4-mini", label: "o4-mini" },
        { id: "o3", label: "o3" },
        { id: "o3-mini", label: "o3-mini" },
        { id: "o1", label: "o1" },
      ],
      image: [
        { id: "gpt-image-2", label: "gpt-image-2" },
        { id: "chatgpt-image-latest", label: "chatgpt-image-latest" },
        { id: "gpt-image-1.5", label: "gpt-image-1.5" },
        { id: "gpt-image-1", label: "gpt-image-1" },
        { id: "gpt-image-1-mini", label: "gpt-image-1-mini" },
        { id: "dall-e-3", label: "dall-e-3" },
      ],
    },
    anthropic: {
      chat: [
        { id: "claude-opus-4-8", label: "Claude Opus 4.8" },
        { id: "claude-sonnet-5", label: "Claude Sonnet 5" },
        { id: "claude-sonnet-4-5", label: "Claude Sonnet 4.5" },
        { id: "claude-haiku-4-5", label: "Claude Haiku 4.5" },
        { id: "claude-3-5-sonnet-latest", label: "Claude 3.5 Sonnet" },
      ],
      image: [],
    },
    gemini: {
      chat: [
        { id: "gemini-3.7-flash", label: "Gemini 3.7 Flash" },
        { id: "gemini-3.5-flash", label: "Gemini 3.5 Flash" },
        { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
        { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
        { id: "gemini-flash-latest", label: "Gemini Flash Latest" },
      ],
      image: [
        { id: "gemini-3.1-flash-image", label: "Gemini 3.1 Flash Image" },
        { id: "gemini-3.1-flash-lite-image", label: "Gemini 3.1 Flash Lite Image" },
        { id: "gemini-3-pro-image", label: "Gemini 3 Pro Image" },
        { id: "gemini-2.0-flash-preview-image-generation", label: "Gemini 2.0 Flash Image" },
      ],
    },
  };

  const providerModelCache = new Map();
  const PROVIDER_MODEL_CACHE_MS = 5 * 60 * 1000;

  async function ensureRestoreStorageFiles() {
    await ensureStoragePaths();
    for (const [filePath, fallback] of [
      [CHAT_WALLPAPERS_FILE, "[]\n"],
      [BIOMETRIC_SETTINGS_FILE, "{}\n"],
      [SUPER_ADMIN_NOTIFICATIONS_FILE, "[]\n"],
    ]) {
      try {
        await fsPromises.access(filePath);
      } catch (_) {
        await fsPromises.writeFile(filePath, fallback, "utf8");
      }
    }
  }

  function normalizeChatWallpaperSrc(value) {
    const src = String(value || "").trim();
    if (
      !src.startsWith("/uploads/")
      || src.includes("..")
      || src.includes("\\")
      || src.includes("://")
    ) {
      return "";
    }
    const fileName = path.posix.basename(src);
    if (!fileName || fileName === "uploads") {
      return "";
    }
    return `/uploads/${fileName}`;
  }

  function normalizeChatWallpaperLabel(value, fallback = "Background") {
    const label = String(value || "").replace(/\s+/g, " ").trim().slice(0, 48);
    return label || fallback;
  }

  function normalizeChatWallpaperRecord(value) {
    if (!value || typeof value !== "object") {
      return null;
    }
    const src = normalizeChatWallpaperSrc(value.src);
    const id = String(value.id || "").trim();
    if (!src || !/^wp_[a-z0-9]+$/i.test(id)) {
      return null;
    }
    return {
      id,
      label: normalizeChatWallpaperLabel(value.label),
      src,
      createdAt: String(value.createdAt || "").trim() || new Date().toISOString(),
    };
  }

  function normalizeChatWallpaperCollection(value) {
    const source = Array.isArray(value) ? value : [];
    const seen = new Set();
    const wallpapers = [];
    for (const item of source) {
      const wallpaper = normalizeChatWallpaperRecord(item);
      if (!wallpaper || seen.has(wallpaper.id)) {
        continue;
      }
      seen.add(wallpaper.id);
      wallpapers.push(wallpaper);
      if (wallpapers.length >= MAX_CHAT_WALLPAPERS) {
        break;
      }
    }
    return wallpapers;
  }

  async function readChatWallpapers() {
    await ensureRestoreStorageFiles();
    try {
      const raw = await fsPromises.readFile(CHAT_WALLPAPERS_FILE, "utf8");
      return normalizeChatWallpaperCollection(JSON.parse(raw));
    } catch (_) {
      return [];
    }
  }

  async function writeChatWallpapers(wallpapers) {
    await ensureRestoreStorageFiles();
    const normalized = normalizeChatWallpaperCollection(wallpapers);
    await writeJsonFileAtomically(CHAT_WALLPAPERS_FILE, normalized);
    return normalized;
  }

  function updateChatWallpapers(mutator) {
    return enqueueSerializedMutation("chat-wallpapers", async () => {
      const current = await readChatWallpapers();
      const next = typeof mutator === "function" ? await mutator(current) : current;
      return writeChatWallpapers(next);
    });
  }

  async function deleteChatWallpaperUpload(src) {
    const normalizedSrc = normalizeChatWallpaperSrc(src);
    if (!normalizedSrc) {
      return;
    }
    const filePath = path.join(UPLOADS_DIR, path.posix.basename(normalizedSrc));
    if (!filePath.startsWith(UPLOADS_DIR)) {
      return;
    }
    await fsPromises.unlink(filePath).catch(() => {});
  }

  async function handleChatWallpapersApi(request, response) {
    if (request.method === "GET") {
      try {
        sendJson(response, 200, { wallpapers: await readChatWallpapers() });
      } catch (error) {
        sendJson(response, 500, {
          message: error instanceof Error ? error.message : "Unable to load chat backgrounds.",
        });
      }
      return;
    }

    if (request.method !== "POST") {
      sendJson(response, 405, { message: "Method not allowed." });
      return;
    }

    if (!requireSuperAdmin(request, response)) {
      return;
    }

    try {
      const payload = await parseRequestBody(request);
      const src = normalizeChatWallpaperSrc(payload?.src);
      if (!src) {
        sendJson(response, 400, { message: "Upload a wallpaper image first." });
        return;
      }
      const label = normalizeChatWallpaperLabel(
        payload?.label,
        path.posix.basename(src, path.extname(src)).replace(/-\d+$/, "") || "Background",
      );
      let created = null;
      const wallpapers = await updateChatWallpapers((current) => {
        if (current.length >= MAX_CHAT_WALLPAPERS) {
          throw createHttpError(`You can add up to ${MAX_CHAT_WALLPAPERS} chat backgrounds.`, 400);
        }
        created = {
          id: `wp_${crypto.randomBytes(6).toString("hex")}`,
          label,
          src,
          createdAt: new Date().toISOString(),
        };
        return [...current, created];
      });
      sendJson(response, 201, {
        wallpaper: created,
        wallpapers,
        message: "Chat background added.",
      });
    } catch (error) {
      const statusCode = Number.isInteger(error?.statusCode) && error.statusCode >= 400
        ? error.statusCode
        : 400;
      sendJson(response, statusCode, {
        message: error instanceof Error ? error.message : "Unable to save chat background.",
      });
    }
  }

  async function handleSingleChatWallpaperApi(request, response, wallpaperId) {
    if (request.method !== "DELETE") {
      sendJson(response, 405, { message: "Method not allowed." });
      return;
    }
    if (!requireSuperAdmin(request, response)) {
      return;
    }
    const id = String(wallpaperId || "").trim();
    if (!/^wp_[a-z0-9]+$/i.test(id)) {
      sendJson(response, 400, { message: "Invalid chat background." });
      return;
    }
    try {
      let removed = null;
      const wallpapers = await updateChatWallpapers((current) => {
        removed = current.find((item) => item.id === id) || null;
        return current.filter((item) => item.id !== id);
      });
      if (!removed) {
        sendJson(response, 404, { message: "Chat background not found." });
        return;
      }
      const stillUsed = wallpapers.some((item) => item.src === removed.src);
      if (!stillUsed) {
        await deleteChatWallpaperUpload(removed.src);
      }
      sendJson(response, 200, {
        wallpapers,
        message: "Chat background removed.",
      });
    } catch (error) {
      sendJson(response, 400, {
        message: error instanceof Error ? error.message : "Unable to remove chat background.",
      });
    }
  }

  async function readBiometricSettings() {
    await ensureRestoreStorageFiles();
    try {
      const raw = await fsPromises.readFile(BIOMETRIC_SETTINGS_FILE, "utf8");
      const decoded = JSON.parse(raw);
      return decoded && typeof decoded === "object" ? decoded : {};
    } catch (_) {
      return {};
    }
  }

  async function writeBiometricSettings(settings) {
    await ensureRestoreStorageFiles();
    const next = settings && typeof settings === "object" ? settings : {};
    await writeJsonFileAtomically(BIOMETRIC_SETTINGS_FILE, next);
    return next;
  }

  async function handleSuperAdminBiometricSettingsApi(request, response) {
    if (!requireSuperAdmin(request, response)) {
      return;
    }
    if (!["GET", "PUT", "PATCH"].includes(request.method)) {
      sendJson(response, 405, { message: "Method not allowed." });
      return;
    }
    try {
      if (request.method === "GET") {
        sendJson(response, 200, { settings: await readBiometricSettings() });
        return;
      }
      const payload = await parseRequestBody(request);
      const nextSettings = await enqueueSerializedMutation("biometric-settings", async () => {
        const existingSettings = await readBiometricSettings();
        const incoming = payload?.settings && typeof payload.settings === "object"
          ? payload.settings
          : payload;
        return writeBiometricSettings({
          ...existingSettings,
          ...(incoming && typeof incoming === "object" ? incoming : {}),
          updatedAt: new Date().toISOString(),
        });
      });
      sendJson(response, 200, {
        settings: nextSettings,
        message: "Super Admin biometric device settings saved.",
      });
    } catch (error) {
      sendJson(response, 400, {
        message: error instanceof Error
          ? error.message
          : "Unable to update biometric device settings.",
      });
    }
  }

  async function handleSuperAdminBiometricFirmwareApi(request, response, requestUrl) {
    if (!requireSuperAdmin(request, response)) {
      return;
    }
    if (!biometricFirmwareCompile) {
      sendJson(response, 503, {
        message: "Firmware compile service is unavailable on this server.",
      });
      return;
    }

    try {
      if (request.method === "GET") {
        const flashId = String(requestUrl?.searchParams?.get("flashId") || "").trim();
        const fileName = String(requestUrl?.searchParams?.get("name") || "").trim();
        if (flashId && fileName) {
          const filePath = biometricFirmwareCompile.getFlashArtifactPath(flashId, fileName);
          if (!filePath) {
            sendJson(response, 404, { message: "Firmware artifact not found. Build again." });
            return;
          }
          const stat = await fsPromises.stat(filePath);
          if (typeof setCorsHeaders === "function") {
            setCorsHeaders(response);
          }
          response.writeHead(200, {
            "Content-Type": "application/octet-stream",
            "Content-Length": stat.size,
            "Content-Disposition": `attachment; filename="${path.basename(filePath)}"`,
            "Cache-Control": "no-store",
          });
          fs.createReadStream(filePath).pipe(response);
          return;
        }
        sendJson(response, 200, {
          ok: true,
          status: await biometricFirmwareCompile.getBiometricFirmwareToolingStatus(),
        });
        return;
      }

      if (request.method !== "POST") {
        sendJson(response, 405, { message: "Method not allowed." });
        return;
      }

      const payload = await parseRequestBody(request);
      const source = String(payload?.source ?? "repo").trim().toLowerCase();
      let compiled = null;
      if (source === "upload") {
        compiled = await biometricFirmwareCompile.compileBiometricFirmwareFromSketchText(
          payload?.sketch,
        );
      } else {
        compiled = await biometricFirmwareCompile.compileBiometricFirmwareFromRepo();
      }

      sendJson(response, 200, {
        ok: true,
        message: "Firmware compiled. Select the ESP32 COM port to flash it from this browser.",
        fqbn: compiled.fqbn,
        source: compiled.source,
        protocolVersion: compiled.protocolVersion,
        flashId: compiled.flashId,
        files: compiled.files,
      });
    } catch (error) {
      sendJson(response, 400, {
        ok: false,
        message: error instanceof Error
          ? error.message
          : "Unable to compile biometric firmware.",
      });
    }
  }

  async function readSuperAdminNotifications() {
    await ensureRestoreStorageFiles();
    try {
      const raw = await fsPromises.readFile(SUPER_ADMIN_NOTIFICATIONS_FILE, "utf8");
      const decoded = JSON.parse(raw);
      return Array.isArray(decoded) ? decoded : [];
    } catch (_) {
      return [];
    }
  }

  async function writeSuperAdminNotifications(notifications) {
    await writeJsonFileAtomically(
      SUPER_ADMIN_NOTIFICATIONS_FILE,
      Array.isArray(notifications)
        ? notifications.slice(0, MAX_SUPER_ADMIN_NOTIFICATIONS)
        : [],
    );
  }

  function isLinkedNotificationUnread(item) {
    if (!item || typeof item !== "object") {
      return false;
    }
    if (item.read === true) {
      return false;
    }
    const status = String(item.status || "").trim().toLowerCase();
    return status !== "read";
  }

  function markSuperAdminNotificationRecordRead(item, readAt) {
    return {
      ...item,
      status: "read",
      read: true,
      readAt: String(readAt || new Date().toISOString()),
    };
  }

  async function markSuperAdminNotificationsAsRead(criteria = {}) {
    const {
      ids = [],
      productId = "",
      feedbackId = "",
      adminId = "",
      types = [],
    } = criteria;
    const normalizedIds = new Set(
      (Array.isArray(ids) ? ids : [ids])
        .map((value) => String(value || "").trim())
        .filter(Boolean),
    );
    const normalizedProductId = String(productId || "").trim();
    const normalizedFeedbackId = String(feedbackId || "").trim();
    const normalizedAdminId = typeof normalizeAdminTenantId === "function"
      ? normalizeAdminTenantId(adminId, "")
      : String(adminId || "").trim();
    const normalizedTypes = new Set(
      (Array.isArray(types) ? types : [types])
        .map((value) => String(value || "").trim().toLowerCase())
        .filter(Boolean),
    );

    const notifications = await readSuperAdminNotifications();
    const readAt = new Date().toISOString();
    let didChange = false;
    const next = notifications.map((item) => {
      if (!isLinkedNotificationUnread(item)) {
        return item;
      }
      const itemType = String(item?.type || "").trim().toLowerCase();
      let shouldMark = false;
      const itemId = String(item?.id || "").trim();
      if (itemId && normalizedIds.has(itemId)) {
        shouldMark = true;
      }
      if (
        normalizedProductId
        && String(item?.productId || "").trim() === normalizedProductId
        && (normalizedTypes.size === 0 || normalizedTypes.has(itemType))
      ) {
        shouldMark = true;
      }
      if (
        normalizedFeedbackId
        && String(item?.feedbackId || "").trim() === normalizedFeedbackId
      ) {
        shouldMark = true;
      }
      if (
        normalizedAdminId
        && (
          typeof normalizeAdminTenantId === "function"
            ? normalizeAdminTenantId(item?.adminId, "")
            : String(item?.adminId || "").trim()
        ) === normalizedAdminId
        && (normalizedTypes.size === 0 || normalizedTypes.has(itemType))
      ) {
        shouldMark = true;
      }
      if (!shouldMark) {
        return item;
      }
      didChange = true;
      return markSuperAdminNotificationRecordRead(item, readAt);
    });
    if (didChange) {
      await writeSuperAdminNotifications(next);
    }
    return { didChange, notifications: next };
  }

  async function handleSuperAdminNotificationsReadApi(request, response) {
    if (!requireSuperAdmin(request, response)) {
      return;
    }
    if (request.method !== "PATCH" && request.method !== "POST") {
      sendJson(response, 405, { message: "Method not allowed." });
      return;
    }
    try {
      const payload = await parseRequestBody(request).catch(() => ({}));
      const result = await markSuperAdminNotificationsAsRead({
        ids: payload?.ids,
        productId: payload?.productId,
        feedbackId: payload?.feedbackId,
        adminId: payload?.adminId,
        types: payload?.types,
      });
      sendJson(response, 200, {
        didChange: result.didChange,
        notifications: result.notifications,
        message: result.didChange
          ? "Notifications marked as read."
          : "No unread notifications matched.",
      });
    } catch (error) {
      sendJson(response, 500, {
        message: error instanceof Error
          ? error.message
          : "Unable to update notification read state.",
      });
    }
  }

  function normalizePlatformSettingsPayload(value) {
    if (!value || typeof value !== "object") {
      return {};
    }
    const next = {};
    for (const [key, raw] of Object.entries(value)) {
      if (typeof raw === "boolean") {
        next[key] = raw;
      }
    }
    return next;
  }

  async function handlePlatformSettingsApi(request, response) {
    if (request.method === "GET") {
      try {
        const settings = await readWorkspaceSettings();
        sendJson(response, 200, {
          settings: normalizePlatformSettingsPayload(settings?.platformSettings),
        });
      } catch (error) {
        sendJson(response, 500, {
          message: error instanceof Error ? error.message : "Unable to load platform settings.",
        });
      }
      return;
    }

    if (request.method !== "PUT" && request.method !== "PATCH") {
      sendJson(response, 405, { message: "Method not allowed." });
      return;
    }

    if (!requireSuperAdmin(request, response)) {
      return;
    }

    try {
      const payload = await parseRequestBody(request);
      const incoming = normalizePlatformSettingsPayload(
        payload?.settings && typeof payload.settings === "object"
          ? payload.settings
          : payload,
      );
      const saved = await enqueueSerializedMutation("platform-settings", async () => {
        const current = await readWorkspaceSettings();
        return writeWorkspaceSettings({
          ...current,
          platformSettings: {
            ...(current.platformSettings && typeof current.platformSettings === "object"
              ? current.platformSettings
              : {}),
            ...incoming,
          },
          updatedAt: new Date().toISOString(),
        });
      });
      sendJson(response, 200, {
        settings: normalizePlatformSettingsPayload(saved.platformSettings),
        message: "Platform settings saved.",
      });
    } catch (error) {
      sendJson(response, 400, {
        message: error instanceof Error ? error.message : "Unable to save platform settings.",
      });
    }
  }

  function maskApiKey(apiKey) {
    const key = String(apiKey || "").trim();
    if (!key) {
      return "";
    }
    if (key.length <= 8) {
      return "*".repeat(key.length);
    }
    return `${key.slice(0, 4)}${"*".repeat(Math.min(12, key.length - 8))}${key.slice(-4)}`;
  }

  function normalizeModelOptions(value) {
    if (!Array.isArray(value)) {
      return [];
    }
    return value
      .map((item) => {
        if (typeof item === "string") {
          const id = item.trim();
          return id ? { id, label: id } : null;
        }
        if (!item || typeof item !== "object") {
          return null;
        }
        const id = String(item.id || item.value || "").trim();
        if (!id) {
          return null;
        }
        return {
          id,
          label: String(item.label || item.name || id).trim() || id,
        };
      })
      .filter(Boolean);
  }

  function detectProviderFromApiKey(apiKey) {
    const key = String(apiKey || "").trim();
    if (!key) {
      return "";
    }
    if (/^sk-ant-/i.test(key) || /^sk-ant/i.test(key)) {
      return "anthropic";
    }
    if (/^sk-/i.test(key)) {
      return "openai";
    }
    if (/^AIza/i.test(key) || /^AQ\./i.test(key) || /^ya29\./i.test(key)) {
      return "gemini";
    }
    if (/claude|anthropic/i.test(key)) {
      return "anthropic";
    }
    return "openai";
  }

  function toModelOption(id) {
    const value = String(id || "").trim();
    return value ? { id: value, label: value } : null;
  }

  function isDatedModelSnapshot(id) {
    return /-\d{4}-\d{2}-\d{2}$/.test(String(id || ""));
  }

  function openAiModelRank(id) {
    const value = String(id || "").toLowerCase();
    const tiers = [
      [/^gpt-6/, 100],
      [/^gpt-5\.6/, 96],
      [/^gpt-5\.5/, 92],
      [/^gpt-5\.4/, 88],
      [/^gpt-5\.3/, 84],
      [/^gpt-5\.2/, 80],
      [/^gpt-5\.1/, 76],
      [/^gpt-5/, 72],
      [/^gpt-4\.1/, 60],
      [/^gpt-4o/, 56],
      [/^o4/, 50],
      [/^o3/, 48],
      [/^o1/, 46],
      [/^gpt-3\.5/, 20],
      [/^gpt-image-2/, 100],
      [/^chatgpt-image/, 96],
      [/^gpt-image-1\.5/, 92],
      [/^gpt-image-1/, 88],
      [/^dall-e-3/, 70],
      [/^dall-e/, 60],
    ];
    for (const [pattern, rank] of tiers) {
      if (pattern.test(value)) {
        return rank;
      }
    }
    return 30;
  }

  function preferStableModelAliases(ids) {
    const source = Array.from(new Set((Array.isArray(ids) ? ids : []).map((id) => String(id || "").trim()).filter(Boolean)));
    const undated = new Set(source.filter((id) => !isDatedModelSnapshot(id)));
    return source
      .filter((id) => {
        if (!isDatedModelSnapshot(id)) {
          return true;
        }
        const base = id.replace(/-\d{4}-\d{2}-\d{2}$/, "");
        return !undated.has(base);
      })
      .sort((left, right) => {
        const rankDiff = openAiModelRank(right) - openAiModelRank(left);
        if (rankDiff !== 0) {
          return rankDiff;
        }
        return left.localeCompare(right);
      });
  }

  function classifyOpenAiModelId(id) {
    const value = String(id || "").trim();
    const lower = value.toLowerCase();
    if (!value) {
      return "";
    }
    if (
      /embedding|moderation|whisper|tts|transcribe|realtime|audio|search|davinci|babbage|curie|ada|^ft:|computer-use|sora|codex|oss|instruct/i
        .test(lower)
    ) {
      return "";
    }
    if (/image|dall-e/i.test(lower)) {
      return "image";
    }
    if (/^(gpt-|o[1-9]|chatgpt-)/i.test(lower)) {
      return "chat";
    }
    return "";
  }

  function classifyGeminiModelId(id) {
    const value = String(id || "").replace(/^models\//i, "").trim();
    const lower = value.toLowerCase();
    if (!value || /embedding|aqa|tts|robotics|gemma/i.test(lower)) {
      return { id: "", kind: "" };
    }
    if (/image|imagen/i.test(lower)) {
      return { id: value, kind: "image" };
    }
    if (/gemini/i.test(lower)) {
      return { id: value, kind: "chat" };
    }
    return { id: "", kind: "" };
  }

  async function fetchJsonWithTimeout(url, options = {}, timeoutMs = 12000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = String(payload?.error?.message || payload?.message || `HTTP ${response.status}`);
        throw new Error(message);
      }
      return payload;
    } finally {
      clearTimeout(timer);
    }
  }

  async function fetchOpenAiProviderModels(apiKey) {
    const payload = await fetchJsonWithTimeout("https://api.openai.com/v1/models", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
    const ids = (Array.isArray(payload?.data) ? payload.data : [])
      .map((entry) => String(entry?.id || "").trim())
      .filter(Boolean);
    const chat = [];
    const image = [];
    for (const id of preferStableModelAliases(ids)) {
      const kind = classifyOpenAiModelId(id);
      if (kind === "chat") {
        chat.push(toModelOption(id));
      } else if (kind === "image") {
        image.push(toModelOption(id));
      }
    }
    return {
      chat: chat.filter(Boolean),
      image: image.filter(Boolean),
    };
  }

  async function fetchAnthropicProviderModels(apiKey) {
    const payload = await fetchJsonWithTimeout("https://api.anthropic.com/v1/models?limit=100", {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
    });
    const chat = (Array.isArray(payload?.data) ? payload.data : [])
      .map((entry) => toModelOption(entry?.id || entry?.display_name))
      .filter(Boolean);
    return { chat, image: [] };
  }

  async function fetchGeminiProviderModels(apiKey) {
    const payload = await fetchJsonWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}&pageSize=100`,
      { method: "GET" },
    );
    const chat = [];
    const image = [];
    for (const entry of Array.isArray(payload?.models) ? payload.models : []) {
      const classified = classifyGeminiModelId(entry?.name || entry?.displayName || "");
      if (!classified.id) {
        continue;
      }
      const option = toModelOption(classified.id);
      if (!option) {
        continue;
      }
      if (classified.kind === "image") {
        image.push(option);
      } else if (classified.kind === "chat") {
        chat.push(option);
      }
    }
    return { chat, image };
  }

  async function resolveProviderModels(provider, apiKey, { allowCache = true } = {}) {
    const normalizedProvider = String(provider || "").trim().toLowerCase();
    const key = String(apiKey || "").trim();
    const fallback = DEFAULT_MODELS[normalizedProvider] || { chat: [], image: [] };
    if (!key || !normalizedProvider) {
      return {
        chat: normalizeModelOptions(fallback.chat),
        image: normalizeModelOptions(fallback.image),
      };
    }

    const cacheKey = `${normalizedProvider}:${crypto.createHash("sha256").update(key).digest("hex").slice(0, 24)}`;
    if (allowCache) {
      const cached = providerModelCache.get(cacheKey);
      if (cached && Date.now() - cached.at < PROVIDER_MODEL_CACHE_MS) {
        return cached.models;
      }
    }

    try {
      let live = { chat: [], image: [] };
      if (normalizedProvider === "openai") {
        live = await fetchOpenAiProviderModels(key);
      } else if (normalizedProvider === "anthropic") {
        live = await fetchAnthropicProviderModels(key);
      } else if (normalizedProvider === "gemini") {
        live = await fetchGeminiProviderModels(key);
      }
      const models = {
        chat: normalizeModelOptions(live.chat?.length ? live.chat : fallback.chat),
        image: normalizeModelOptions(live.image?.length ? live.image : fallback.image),
      };
      providerModelCache.set(cacheKey, { at: Date.now(), models });
      return models;
    } catch (_) {
      return {
        chat: normalizeModelOptions(fallback.chat),
        image: normalizeModelOptions(fallback.image),
      };
    }
  }

  function pickPreferredModel(selected, options, fallbackId = "") {
    const list = normalizeModelOptions(options);
    const current = String(selected || "").trim();
    if (current && list.some((model) => model.id === current)) {
      return current;
    }
    const fallback = String(fallbackId || "").trim();
    if (fallback && list.some((model) => model.id === fallback)) {
      return fallback;
    }
    return list[0]?.id || current || "";
  }

  function providerCapabilitySupport(provider) {
    const models = DEFAULT_MODELS[provider] || { chat: [], image: [] };
    const hasChat = Array.isArray(models.chat) && models.chat.length > 0;
    const hasImage = Array.isArray(models.image) && models.image.length > 0;
    return {
      chatbot: hasChat,
      autoReply: hasChat,
      imageEnhancement: hasImage,
    };
  }

  function isStoredCapabilityEnabled(value) {
    if (value && typeof value === "object") {
      return Boolean(value.enabled ?? value.available);
    }
    return Boolean(value);
  }

  function toPublicCapability(supported, enabled, launched) {
    const isSupported = Boolean(supported);
    const isEnabled = Boolean(isSupported && enabled);
    return {
      supported: isSupported,
      enabled: isEnabled,
      available: Boolean(isEnabled && launched),
    };
  }

  function buildClaimedByOthers(integrations, currentId) {
    const claimed = {
      chatbot: null,
      autoReply: null,
      imageEnhancement: null,
    };
    for (const item of integrations) {
      if (!item || item.id === currentId || !item.launched) {
        continue;
      }
      const caps = item.capabilities || {};
      for (const key of Object.keys(claimed)) {
        if (isStoredCapabilityEnabled(caps[key]) && !claimed[key]) {
          claimed[key] = {
            id: item.id,
            provider: item.provider,
            providerLabel: PROVIDER_LABELS[item.provider] || item.provider,
          };
        }
      }
    }
    return claimed;
  }

  function toPublicIntegration(record, allRecords = []) {
    const source = record && typeof record === "object" ? record : {};
    const provider = String(source.provider || "").trim().toLowerCase();
    const apiKey = String(source.apiKey || "").trim();
    const configured = Boolean(apiKey || source.configured);
    const launched = Boolean(configured && source.launched);
    const availableChat = normalizeModelOptions(
      source.availableChatModels?.length
        ? source.availableChatModels
        : source.availableModels?.chat?.length
          ? source.availableModels.chat
          : DEFAULT_MODELS[provider]?.chat,
    );
    const availableImage = normalizeModelOptions(
      source.availableImageModels?.length
        ? source.availableImageModels
        : source.availableModels?.image?.length
          ? source.availableModels.image
          : DEFAULT_MODELS[provider]?.image,
    );
    const capabilities = source.capabilities && typeof source.capabilities === "object"
      ? source.capabilities
      : {};
    const support = providerCapabilitySupport(provider);
    return {
      id: String(source.id || "").trim(),
      configured,
      preview: Boolean(source.preview),
      launched,
      provider,
      providerLabel: PROVIDER_LABELS[provider] || String(source.providerLabel || "").trim(),
      apiKeyMasked: maskApiKey(apiKey),
      chatModel: String(source.chatModel || "").trim(),
      imageModel: String(source.imageModel || "").trim(),
      availableModels: {
        chat: availableChat,
        image: availableImage,
      },
      capabilities: {
        chatbot: toPublicCapability(
          support.chatbot,
          isStoredCapabilityEnabled(capabilities.chatbot),
          launched,
        ),
        autoReply: toPublicCapability(
          support.autoReply,
          isStoredCapabilityEnabled(capabilities.autoReply),
          launched,
        ),
        imageEnhancement: toPublicCapability(
          support.imageEnhancement,
          isStoredCapabilityEnabled(capabilities.imageEnhancement),
          launched,
        ),
      },
      claimedByOthers: buildClaimedByOthers(
        allRecords.map((item) => ({
          id: String(item?.id || "").trim(),
          provider: String(item?.provider || "").trim().toLowerCase(),
          launched: Boolean(item?.launched),
          capabilities: item?.capabilities || {},
        })),
        String(source.id || "").trim(),
      ),
      updatedAt: String(source.updatedAt || "").trim(),
      verifiedAt: String(source.verifiedAt || "").trim(),
      launchedAt: String(source.launchedAt || "").trim(),
    };
  }

  function extractProviderResponseText(payload) {
    const directOutputText = String(payload?.output_text ?? "").trim();
    if (directOutputText) {
      return directOutputText;
    }

    const outputItems = Array.isArray(payload?.output) ? payload.output : [];
    const outputTexts = [];
    for (const item of outputItems) {
      const contentItems = Array.isArray(item?.content) ? item.content : [];
      for (const contentItem of contentItems) {
        const contentText = String(
          contentItem?.text ?? contentItem?.output_text ?? "",
        ).trim();
        if (contentText) {
          outputTexts.push(contentText);
        }
      }
    }
    if (outputTexts.length) {
      return outputTexts.join("\n").trim();
    }

    const choiceContent = payload?.choices?.[0]?.message?.content;
    if (typeof choiceContent === "string" && choiceContent.trim()) {
      return choiceContent.trim();
    }
    if (Array.isArray(choiceContent)) {
      const joinedText = choiceContent
        .map((item) => String(item?.text ?? "").trim())
        .filter(Boolean)
        .join("\n")
        .trim();
      if (joinedText) {
        return joinedText;
      }
    }

    const anthropicText = Array.isArray(payload?.content)
      ? payload.content
        .map((item) => String(item?.text ?? "").trim())
        .filter(Boolean)
        .join("\n")
        .trim()
      : "";
    if (anthropicText) {
      return anthropicText;
    }

    const geminiText = String(
      payload?.candidates?.[0]?.content?.parts
        ?.map((part) => String(part?.text ?? "").trim())
        .filter(Boolean)
        .join("\n")
      ?? "",
    ).trim();
    if (geminiText) {
      return geminiText;
    }

    const incompleteReason = String(payload?.incomplete_details?.reason || "").trim();
    if (incompleteReason) {
      throw new Error(
        incompleteReason === "max_output_tokens"
          ? "The AI provider ran out of output tokens before finishing the reply."
          : `The AI provider stopped early (${incompleteReason}).`,
      );
    }

    throw new Error("The AI provider returned an empty description.");
  }

  function usesOpenAiResponsesApi(model) {
    return /^(gpt-5|gpt-6|o[1-9]|chatgpt-|gpt-live)/i.test(String(model || "").trim());
  }

  async function postProviderJson(url, headers, body, signal) {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal,
    });
    const responseText = await response.text();
    let payload = {};
    if (responseText.trim()) {
      try {
        payload = JSON.parse(responseText);
      } catch {
        payload = { message: responseText.trim() };
      }
    }
    return { response, payload };
  }

  function providerErrorMessage(payload, status) {
    return String(
      payload?.error?.message
        || payload?.message
        || `AI request failed (${status}).`,
    ).trim() || `AI request failed (${status}).`;
  }

  async function callOpenAiChatCompletion({
    apiKey,
    model,
    systemPrompt,
    normalizedMessages,
    maxOutputTokens,
    temperature,
    signal,
  }) {
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    };
    const tokenBudget = Math.max(Number(maxOutputTokens) || 0, 2048);
    const prefersResponses = usesOpenAiResponsesApi(model);

    const completionBodies = [];
    if (prefersResponses) {
      completionBodies.push({
        url: "https://api.openai.com/v1/responses",
        body: {
          model,
          instructions: systemPrompt,
          input: normalizedMessages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
          max_output_tokens: tokenBudget,
        },
      });
    }

    const chatMessages = [
      { role: "system", content: systemPrompt },
      ...normalizedMessages,
    ];
    completionBodies.push({
      url: "https://api.openai.com/v1/chat/completions",
      body: prefersResponses
        ? {
            model,
            messages: chatMessages,
            max_completion_tokens: tokenBudget,
          }
        : {
            model,
            messages: chatMessages,
            max_completion_tokens: tokenBudget,
            temperature,
          },
    });
    if (!prefersResponses) {
      completionBodies.push({
        url: "https://api.openai.com/v1/chat/completions",
        body: {
          model,
          messages: chatMessages,
          max_completion_tokens: tokenBudget,
        },
      });
    }

    let lastError = null;
    for (const attempt of completionBodies) {
      const { response, payload } = await postProviderJson(
        attempt.url,
        headers,
        attempt.body,
        signal,
      );
      if (!response.ok) {
        lastError = createHttpError(
          providerErrorMessage(payload, response.status),
          response.status >= 400 ? response.status : 502,
        );
        const errorText = String(lastError.message || "").toLowerCase();
        const canRetry =
          /temperature|unsupported|unknown parameter|max_tokens|max_completion_tokens|not found|does not exist|v1\/chat\/completions/i
            .test(errorText);
        if (canRetry) {
          continue;
        }
        throw lastError;
      }
      try {
        return extractProviderResponseText(payload);
      } catch (error) {
        lastError = error;
      }
    }

    const fallbackModel = "gpt-4o-mini";
    const errorText = String(lastError?.message || "").toLowerCase();
    if (
      model !== fallbackModel
      && /model|not found|does not exist|invalid/i.test(errorText)
    ) {
      return callOpenAiChatCompletion({
        apiKey,
        model: fallbackModel,
        systemPrompt,
        normalizedMessages,
        maxOutputTokens,
        temperature,
        signal,
      });
    }

    throw lastError || new Error("The AI provider returned an empty description.");
  }

  async function callProviderChatCompletion({
    provider,
    apiKey,
    model,
    systemPrompt,
    userPrompt,
    messages,
    maxOutputTokens = 2048,
    temperature = 0.4,
  }) {
    const timeoutMs = 60_000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const normalizedMessages = (Array.isArray(messages) ? messages : [
        { role: "user", content: userPrompt },
      ])
        .map((message) => ({
          role: message?.role === "assistant" ? "assistant" : "user",
          content: String(message?.content || "").trim(),
        }))
        .filter((message) => message.content);

      if (!normalizedMessages.length) {
        throw createHttpError("A message is required before requesting an AI reply.", 400);
      }

      if (provider === "openai" || !provider) {
        return await callOpenAiChatCompletion({
          apiKey,
          model,
          systemPrompt,
          normalizedMessages,
          maxOutputTokens,
          temperature,
          signal: controller.signal,
        });
      }

      let url = "";
      let headers = { "Content-Type": "application/json" };
      let body = null;

      if (provider === "anthropic") {
        url = "https://api.anthropic.com/v1/messages";
        headers = {
          ...headers,
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        };
        body = {
          model,
          max_tokens: Math.max(maxOutputTokens, 2048),
          system: systemPrompt,
          messages: normalizedMessages,
        };
      } else if (provider === "gemini") {
        url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
        body = {
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
          contents: normalizedMessages.map((message) => ({
            role: message.role === "assistant" ? "model" : "user",
            parts: [{ text: message.content }],
          })),
          generationConfig: {
            temperature,
            maxOutputTokens: Math.max(maxOutputTokens, 2048),
          },
        };
      } else {
        return await callOpenAiChatCompletion({
          apiKey,
          model,
          systemPrompt,
          normalizedMessages,
          maxOutputTokens,
          temperature,
          signal: controller.signal,
        });
      }

      const { response, payload } = await postProviderJson(
        url,
        headers,
        body,
        controller.signal,
      );
      if (!response.ok) {
        throw createHttpError(
          providerErrorMessage(payload, response.status),
          response.status >= 400 ? response.status : 502,
        );
      }
      return extractProviderResponseText(payload);
    } catch (error) {
      if (error?.name === "AbortError") {
        throw createHttpError("AI request timed out. Please try again.", 504);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  function pickLaunchedChatIntegration(integrations) {
    const list = Array.isArray(integrations) ? integrations : [];
    const launched = list.filter((item) => {
      if (!item || !item.launched || !String(item.apiKey || "").trim()) {
        return false;
      }
      const caps = item.capabilities || {};
      return isStoredCapabilityEnabled(caps.chatbot)
        || isStoredCapabilityEnabled(caps.autoReply)
        || Boolean(String(item.chatModel || "").trim());
    });
    return launched.find((item) => {
      const caps = item.capabilities || {};
      return isStoredCapabilityEnabled(caps.chatbot)
        || isStoredCapabilityEnabled(caps.autoReply);
    }) || launched[0] || null;
  }

  function toAssistantCapabilityStatus(integration, capability, enabled) {
    const provider = String(integration?.provider || "").trim().toLowerCase();
    const model = String(integration?.chatModel || "").trim();
    const launched = Boolean(
      integration?.launched && String(integration?.apiKey || "").trim(),
    );
    const available = Boolean(launched && enabled);
    return {
      capability,
      supported: true,
      enabled: Boolean(enabled),
      available,
      launched,
      configured: launched,
      provider,
      providerLabel: PROVIDER_LABELS[provider] || provider,
      model,
      source: "super-admin",
      message: available
        ? ""
        : launched
          ? `${capability === "autoReply" ? "Automatic Customer Replies" : "Chatbot & Manual AI Reply"} is turned off on the launched integration.`
          : "Launch an AI integration in Super Admin > Services > AI Integration.",
    };
  }

  async function getLaunchedChatAssistantStatus() {
    const integrations = await readAiIntegrations();
    const chatbotIntegration = integrations.find((item) => {
      return Boolean(item?.launched && String(item.apiKey || "").trim())
        && isStoredCapabilityEnabled(item?.capabilities?.chatbot);
    });
    const autoReplyIntegration = integrations.find((item) => {
      return Boolean(item?.launched && String(item.apiKey || "").trim())
        && isStoredCapabilityEnabled(item?.capabilities?.autoReply);
    });
    const primary = autoReplyIntegration
      || chatbotIntegration
      || pickLaunchedChatIntegration(integrations);
    const chatbot = toAssistantCapabilityStatus(
      chatbotIntegration || primary,
      "chatbot",
      Boolean(chatbotIntegration),
    );
    const autoReply = toAssistantCapabilityStatus(
      autoReplyIntegration || primary,
      "autoReply",
      Boolean(autoReplyIntegration),
    );
    const provider = String(primary?.provider || autoReply.provider || chatbot.provider || "").trim().toLowerCase();
    return {
      available: chatbot.available || autoReply.available,
      launched: Boolean(primary?.launched && String(primary?.apiKey || "").trim()),
      configured: Boolean(primary && String(primary.apiKey || "").trim()),
      manualReplyEnabled: chatbot.available,
      autoReplyEnabled: autoReply.available,
      provider,
      providerLabel: PROVIDER_LABELS[provider] || provider,
      model: String(primary?.chatModel || autoReply.model || chatbot.model || "").trim(),
      source: "super-admin",
      chatbot,
      autoReply,
    };
  }

  async function requestLaunchedChatCompletion({
    systemPrompt,
    messages,
    capability = "chatbot",
  } = {}) {
    const integrations = await readAiIntegrations();
    if (!integrations.length) {
      return null;
    }

    const normalizedCapability = capability === "autoReply" ? "autoReply" : "chatbot";
    const integration = integrations.find((item) => {
      if (!item?.launched || !String(item.apiKey || "").trim()) {
        return false;
      }
      return isStoredCapabilityEnabled(item?.capabilities?.[normalizedCapability]);
    });

    if (!integration) {
      const capabilityLabel = normalizedCapability === "autoReply"
        ? "Automatic Customer Replies"
        : "Chatbot & Manual AI Reply";
      throw createHttpError(
        `${capabilityLabel} is not enabled on a launched AI integration. Enable it in Super Admin > Services > AI Integration.`,
        503,
      );
    }

    const provider = String(integration.provider || "openai").trim().toLowerCase() || "openai";
    const model = String(integration.chatModel || "").trim()
      || DEFAULT_MODELS[provider]?.chat?.[0]?.id
      || "gpt-4o-mini";
    const text = await callProviderChatCompletion({
      provider,
      apiKey: String(integration.apiKey || "").trim(),
      model,
      systemPrompt: String(systemPrompt || "").trim(),
      messages,
      maxOutputTokens: 2048,
      temperature: 0.6,
    });

    return { text, provider, model };
  }

  function buildModerationSummaryPrompts(payload = {}) {
    const action = String(payload.action || "").trim().toLowerCase() || "restrict";
    const audience = String(payload.audience || "seller").trim().toLowerCase() === "user"
      ? "user"
      : "seller";
    const subjectName = String(payload.subjectName || payload.companyName || "Account")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120) || "Account";
    const reason = String(payload.reason || "").replace(/\s+/g, " ").trim().slice(0, 200);
    const description = String(payload.description || "").replace(/\s+/g, " ").trim().slice(0, 500);
    const duration = String(payload.duration || "").replace(/\s+/g, " ").trim().slice(0, 80);
    const impacts = Array.isArray(payload.impacts)
      ? payload.impacts.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 8)
      : [];
    const restrictionLimits = Array.isArray(payload.restrictionLimits)
      ? payload.restrictionLimits.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 8)
      : [];

    const systemPrompt = [
      "You write short moderation notices for a marketplace super admin.",
      `Write one polished description for the ${audience}.`,
      "Keep it under 450 characters, plain text only, no markdown, no bullet points, no quotes.",
      "Be firm, clear, and professional. Do not invent policy details beyond the provided reason and impacts.",
    ].join(" ");

    const userPrompt = [
      `Action: ${action}`,
      `Audience: ${audience}`,
      `Subject: ${subjectName}`,
      `Reason: ${reason || "(not provided)"}`,
      duration ? `Duration: ${duration}` : null,
      impacts.length ? `Impacts: ${impacts.join("; ")}` : null,
      restrictionLimits.length ? `Restricted access: ${restrictionLimits.join("; ")}` : null,
      description ? `Draft notes to refine: ${description}` : null,
      "Return only the final description text.",
    ].filter(Boolean).join("\n");

    return { systemPrompt, userPrompt, reason };
  }

  async function handleAiModerationSummaryApi(request, response) {
    if (!requireSuperAdmin(request, response)) {
      return;
    }
    if (request.method !== "POST") {
      sendJson(response, 405, { message: "Method not allowed." });
      return;
    }

    try {
      const payload = await parseRequestBody(request);
      const { systemPrompt, userPrompt, reason } = buildModerationSummaryPrompts(payload);
      if (!reason) {
        sendJson(response, 400, {
          message: "Select a moderation reason before using AI.",
          code: "AI_MODERATION_REASON_REQUIRED",
        });
        return;
      }

      const integrations = await readAiIntegrations();
      const integration = pickLaunchedChatIntegration(integrations);
      if (!integration) {
        sendJson(response, 428, {
          message: "Connect and launch an AI integration with chat enabled before using Summarize with AI.",
          code: "CHAT_AI_UNAVAILABLE",
        });
        return;
      }

      const provider = String(integration.provider || "openai").trim().toLowerCase() || "openai";
      const apiKey = String(integration.apiKey || "").trim();
      const model = String(integration.chatModel || "").trim()
        || DEFAULT_MODELS[provider]?.chat?.[0]?.id
        || "gpt-4o-mini";
      const rawSummary = await callProviderChatCompletion({
        provider,
        apiKey,
        model,
        systemPrompt,
        userPrompt,
      });
      const summary = String(rawSummary || "").replace(/\s+/g, " ").trim().slice(0, 500);
      if (!summary) {
        throw createHttpError("The AI provider returned an empty description.", 502);
      }

      sendJson(response, 200, {
        summary,
        provider,
        providerLabel: PROVIDER_LABELS[provider] || provider,
        model,
      });
    } catch (error) {
      const statusCode = Number.isInteger(error?.statusCode) && error.statusCode >= 400
        ? error.statusCode
        : 502;
      sendJson(response, statusCode, {
        message: error instanceof Error ? error.message : "Unable to summarize the description with AI.",
        code: "AI_MODERATION_SUMMARY_FAILED",
      });
    }
  }

  async function handleAiIntegrationApiKeyReveal(request, response, integrationId) {
    if (!requireSuperAdmin(request, response)) {
      return;
    }
    if (request.method !== "GET") {
      sendJson(response, 405, { message: "Method not allowed." });
      return;
    }
    try {
      const id = String(integrationId || "").trim();
      const integrations = await readAiIntegrations();
      const match = integrations.find((item) => String(item?.id || "").trim() === id);
      if (!match) {
        sendJson(response, 404, { message: "AI integration not found." });
        return;
      }
      const apiKey = String(match.apiKey || "").trim();
      if (!apiKey) {
        sendJson(response, 404, { message: "No API key is configured." });
        return;
      }
      sendJson(response, 200, { apiKey });
    } catch (error) {
      sendJson(response, 500, {
        message: error instanceof Error ? error.message : "Unable to reveal the API key.",
      });
    }
  }

  async function readAiIntegrations() {
    const settings = await readWorkspaceSettings();
    const list = Array.isArray(settings.aiIntegrations) ? settings.aiIntegrations : [];
    if (list.length) {
      return list.filter((item) => item && typeof item === "object");
    }
    if (settings.aiIntegration && typeof settings.aiIntegration === "object") {
      return [settings.aiIntegration];
    }
    return [];
  }

  async function writeAiIntegrations(integrations) {
    const current = await readWorkspaceSettings();
    const list = Array.isArray(integrations) ? integrations : [];
    return writeWorkspaceSettings({
      ...current,
      aiIntegrations: list,
      aiIntegration: list[0] || null,
      updatedAt: new Date().toISOString(),
    });
  }

  function buildAiResponse(integrations, preferredId = "") {
    const publicIntegrations = integrations.map((item) =>
      toPublicIntegration(item, integrations),
    );
    const selected = publicIntegrations.find((item) => item.id && item.id === preferredId)
      || publicIntegrations.find((item) => item.launched)
      || publicIntegrations[0]
      || toPublicIntegration({}, []);
    return {
      integrations: publicIntegrations,
      integration: selected,
      launched: Boolean(selected.launched),
    };
  }

  async function handleAiIntegrationDetectApi(request, response) {
    if (!requireSuperAdmin(request, response)) {
      return;
    }
    if (request.method !== "POST") {
      sendJson(response, 405, { message: "Method not allowed." });
      return;
    }
    try {
      const payload = await parseRequestBody(request);
      const apiKey = String(payload?.apiKey || "").trim();
      if (!apiKey) {
        sendJson(response, 400, { message: "Enter an API key to detect its provider." });
        return;
      }
      const provider = detectProviderFromApiKey(apiKey);
      const models = await resolveProviderModels(provider, apiKey, { allowCache: false });
      const existing = await readAiIntegrations();
      const draft = {
        id: String(payload?.id || "").trim() || `ai_${crypto.randomBytes(6).toString("hex")}`,
        provider,
        apiKey,
        configured: true,
        launched: false,
        chatModel: models.chat[0]?.id || "",
        imageModel: models.image[0]?.id || "",
        availableChatModels: models.chat,
        availableImageModels: models.image,
        // Detect only marks provider support via toPublicIntegration; enable features on save.
        capabilities: {
          chatbot: false,
          autoReply: false,
          imageEnhancement: false,
        },
        verifiedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      sendJson(response, 200, toPublicIntegration(draft, [...existing, draft]));
    } catch (error) {
      sendJson(response, 400, {
        message: error instanceof Error ? error.message : "Unable to detect the AI provider.",
      });
    }
  }

  async function handleAiIntegrationLaunchApi(request, response) {
    response.setHeader("Cache-Control", "no-store, max-age=0");
    if (!requireSuperAdmin(request, response)) {
      return;
    }
    if (request.method !== "POST") {
      sendJson(response, 405, { message: "Method not allowed." });
      return;
    }
    try {
      const payload = await parseRequestBody(request);
      const id = String(payload?.id || "").trim();
      const launched = Boolean(payload?.launched);
      const next = await enqueueSerializedMutation("ai-integration", async () => {
        const current = await readAiIntegrations();
        const index = current.findIndex((item) => String(item?.id || "").trim() === id);
        if (index < 0) {
          throw createHttpError("AI integration not found.", 404);
        }
        const target = current[index];
        if (launched) {
          const caps = target?.capabilities || {};
          const hasEnabledFeature = ["chatbot", "autoReply", "imageEnhancement"]
            .some((key) => isStoredCapabilityEnabled(caps[key]));
          if (!hasEnabledFeature) {
            throw createHttpError(
              "Enable at least one AI feature before launching this integration.",
              400,
            );
          }
        }
        const updated = current.map((item, itemIndex) => {
          if (itemIndex !== index) {
            return {
              ...item,
              // Only one shared launch profile is live at a time.
              launched: launched ? false : item.launched,
              updatedAt: launched ? new Date().toISOString() : item.updatedAt,
            };
          }
          return {
            ...item,
            launched,
            launchedAt: launched ? new Date().toISOString() : String(item.launchedAt || ""),
            updatedAt: new Date().toISOString(),
          };
        });
        await writeAiIntegrations(updated);
        return updated;
      });
      const body = buildAiResponse(next, id);
      sendJson(response, 200, {
        ...body,
        launched: Boolean(body.integration?.launched),
        message: launched
          ? "The enabled AI services are now available."
          : "The shared AI integration has been stopped.",
      });
    } catch (error) {
      const statusCode = Number.isInteger(error?.statusCode) && error.statusCode >= 400
        ? error.statusCode
        : 400;
      sendJson(response, statusCode, {
        message: error instanceof Error ? error.message : "Unable to change the AI API status.",
      });
    }
  }

  async function handleAiIntegrationApi(request, response) {
    response.setHeader("Cache-Control", "no-store, max-age=0");
    if (!requireSuperAdmin(request, response)) {
      return;
    }

    if (request.method === "GET") {
      try {
        const integrations = await readAiIntegrations();
        const enriched = await Promise.all(
          integrations.map(async (item) => {
            const provider = String(item?.provider || "").trim().toLowerCase();
            const key = String(item?.apiKey || "").trim();
            if (!provider || !key) {
              return item;
            }
            const models = await resolveProviderModels(provider, key);
            return {
              ...item,
              availableChatModels: models.chat,
              availableImageModels: models.image,
              chatModel: pickPreferredModel(item.chatModel, models.chat, models.chat[0]?.id),
              imageModel: pickPreferredModel(item.imageModel, models.image, models.image[0]?.id),
            };
          }),
        );
        sendJson(response, 200, buildAiResponse(enriched));
      } catch (error) {
        sendJson(response, 500, {
          message: error instanceof Error ? error.message : "Unable to load the AI integration.",
        });
      }
      return;
    }

    if (request.method !== "PATCH" && request.method !== "PUT" && request.method !== "POST") {
      sendJson(response, 405, { message: "Method not allowed." });
      return;
    }

    try {
      const payload = await parseRequestBody(request);
      const remove = payload?.remove === true;
      const id = String(payload?.id || "").trim();
      const apiKey = String(payload?.apiKey || "").trim();

      const next = await enqueueSerializedMutation("ai-integration", async () => {
        let current = await readAiIntegrations();

        if (remove) {
          if (!id) {
            throw createHttpError("AI integration id is required.", 400);
          }
          current = current.filter((item) => String(item?.id || "").trim() !== id);
          await writeAiIntegrations(current);
          return { list: current, selectedId: "" };
        }

        let targetIndex = id
          ? current.findIndex((item) => String(item?.id || "").trim() === id)
          : -1;

        if (targetIndex < 0 && apiKey) {
          const provider = detectProviderFromApiKey(apiKey);
          const models = await resolveProviderModels(provider, apiKey, { allowCache: false });
          const created = {
            id: `ai_${crypto.randomBytes(6).toString("hex")}`,
            schemaVersion: 3,
            managed: true,
            provider,
            apiKey,
            chatModel: models.chat[0]?.id || "",
            imageModel: models.image[0]?.id || "",
            availableChatModels: models.chat,
            availableImageModels: models.image,
            capabilities: { chatbot: false, autoReply: false, imageEnhancement: false },
            launched: false,
            verifiedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            launchedAt: "",
          };
          current = [...current, created];
          await writeAiIntegrations(current);
          return { list: current, selectedId: created.id };
        }

        if (targetIndex < 0) {
          throw createHttpError("AI integration not found.", 404);
        }

        const existing = current[targetIndex];
        const provider = apiKey
          ? detectProviderFromApiKey(apiKey)
          : String(existing.provider || "").trim().toLowerCase();
        const resolvedKey = apiKey || String(existing.apiKey || "").trim();
        const models = await resolveProviderModels(provider, resolvedKey, {
          allowCache: !apiKey,
        });
        const nextRecord = {
          ...existing,
          provider,
          apiKey: resolvedKey,
          chatModel: pickPreferredModel(
            payload?.chatModel ?? existing.chatModel,
            models.chat,
            models.chat[0]?.id,
          ),
          imageModel: pickPreferredModel(
            payload?.imageModel ?? existing.imageModel,
            models.image,
            models.image[0]?.id,
          ),
          availableChatModels: models.chat,
          availableImageModels: models.image,
          capabilities: {
            chatbot: Boolean(payload?.capabilities?.chatbot ?? existing.capabilities?.chatbot),
            autoReply: Boolean(payload?.capabilities?.autoReply ?? existing.capabilities?.autoReply),
            imageEnhancement: Boolean(
              payload?.capabilities?.imageEnhancement ?? existing.capabilities?.imageEnhancement,
            ),
          },
          updatedAt: new Date().toISOString(),
          verifiedAt: apiKey ? new Date().toISOString() : existing.verifiedAt,
        };
        current = current.map((item, index) => (index === targetIndex ? nextRecord : item));
        await writeAiIntegrations(current);
        return { list: current, selectedId: nextRecord.id };
      });

      const body = buildAiResponse(next.list, next.selectedId);
      sendJson(response, 200, {
        ...body,
        message: remove
          ? "AI integration deleted."
          : "The shared AI integration has been saved.",
      });
    } catch (error) {
      const statusCode = Number.isInteger(error?.statusCode) && error.statusCode >= 400
        ? error.statusCode
        : 400;
      sendJson(response, statusCode, {
        message: error instanceof Error ? error.message : "Unable to save the AI integration.",
      });
    }
  }

  async function tryHandleRestoredRoutes(request, response, requestUrl) {
    const pathname = requestUrl.pathname;

    if (pathname === "/api/chat-wallpapers") {
      await handleChatWallpapersApi(request, response);
      return true;
    }

    const wallpaperMatch = pathname.match(/^\/api\/chat-wallpapers\/([^/]+)$/);
    if (wallpaperMatch) {
      await handleSingleChatWallpaperApi(
        request,
        response,
        decodeURIComponent(wallpaperMatch[1] || ""),
      );
      return true;
    }

    if (pathname === "/api/platform-settings") {
      await handlePlatformSettingsApi(request, response);
      return true;
    }

    if (pathname === "/api/super-admin/biometric-settings") {
      await handleSuperAdminBiometricSettingsApi(request, response);
      return true;
    }

    if (pathname === "/api/super-admin/biometric-firmware/compile") {
      await handleSuperAdminBiometricFirmwareApi(request, response, requestUrl);
      return true;
    }

    if (pathname === "/api/super-admin/notifications/read") {
      await handleSuperAdminNotificationsReadApi(request, response);
      return true;
    }

    if (pathname === "/api/super-admin/ai-integration/detect") {
      await handleAiIntegrationDetectApi(request, response);
      return true;
    }

    if (pathname === "/api/super-admin/ai-integration/launch") {
      await handleAiIntegrationLaunchApi(request, response);
      return true;
    }

    if (pathname === "/api/super-admin/ai-integration") {
      await handleAiIntegrationApi(request, response);
      return true;
    }

    if (pathname === "/api/super-admin/ai-moderation-summary") {
      await handleAiModerationSummaryApi(request, response);
      return true;
    }

    const aiKeyMatch = pathname.match(
      /^\/api\/super-admin\/ai-image-enhancement\/([^/]+)\/api-key$/,
    );
    if (aiKeyMatch) {
      await handleAiIntegrationApiKeyReveal(
        request,
        response,
        decodeURIComponent(aiKeyMatch[1] || ""),
      );
      return true;
    }

    return false;
  }

  return {
    tryHandleRestoredRoutes,
    readSuperAdminNotifications,
    ensureRestoreStorageFiles,
    requestLaunchedChatCompletion,
    getLaunchedChatAssistantStatus,
  };
}

module.exports = {
  createRestoreMissingSaApis,
};
