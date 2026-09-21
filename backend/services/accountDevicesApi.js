"use strict";

const path = require("path");
const crypto = require("crypto");
const fsPromises = require("fs/promises");

const MAX_DEVICES_PER_ACCOUNT = 40;

function createAccountDevicesApi(deps) {
  const {
    DATA_DIR,
    ensureStoragePaths,
    writeJsonFileAtomically,
    sendJson,
    parseRequestBody,
    getRequestAccountIdentifier,
    assertSessionPayloadIdentity,
  } = deps;

  const DEVICES_FILE = path.join(DATA_DIR, "account_device_sessions.json");

  function nowIso() {
    return new Date().toISOString();
  }

  function newId() {
    return crypto.randomBytes(12).toString("hex");
  }

  function normalizeText(value, max = 120) {
    return String(value ?? "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, max);
  }

  function normalizeDeviceType(value) {
    const raw = normalizeText(value, 32).toLowerCase();
    if (raw === "phone" || raw === "mobile") return "phone";
    if (raw === "tablet") return "tablet";
    if (raw === "computer" || raw === "desktop" || raw === "laptop") {
      return "computer";
    }
    return "";
  }

  function normalizeClientKind(value) {
    const raw = normalizeText(value, 32).toLowerCase();
    if (raw === "app" || raw === "application" || raw === "native") return "app";
    if (raw === "browser" || raw === "web") return "browser";
    return "";
  }

  async function readStore() {
    await ensureStoragePaths();
    try {
      const raw = await fsPromises.readFile(DEVICES_FILE, "utf8");
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return {};
      }
      return parsed;
    } catch (error) {
      if (error && error.code === "ENOENT") return {};
      console.warn("Unable to read account device sessions.", error);
      return {};
    }
  }

  async function writeStore(store) {
    await ensureStoragePaths();
    await writeJsonFileAtomically(DEVICES_FILE, store);
  }

  function detectBrowser(userAgent) {
    const ua = String(userAgent || "");
    if (/Edg\//i.test(ua)) return "Edge";
    if (/OPR\/|Opera/i.test(ua)) return "Opera";
    if (/Firefox\//i.test(ua)) return "Firefox";
    if (/CriOS\//i.test(ua) || (/Chrome\//i.test(ua) && !/Edg\//i.test(ua))) {
      return "Chrome";
    }
    if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua) && !/CriOS\//i.test(ua)) {
      return "Safari";
    }
    if (/SamsungBrowser\//i.test(ua)) return "Samsung Internet";
    return "";
  }

  function detectOs(userAgent) {
    const ua = String(userAgent || "");
    if (/Android/i.test(ua)) return "Android";
    if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
    if (/Windows NT/i.test(ua)) return "Windows";
    if (/Mac OS X|Macintosh/i.test(ua)) return "macOS";
    if (/CrOS/i.test(ua)) return "ChromeOS";
    if (/Linux/i.test(ua)) return "Linux";
    return "";
  }

  function detectDeviceTypeFromUa(userAgent) {
    const ua = String(userAgent || "");
    if (/iPad|Tablet|Android(?!.*Mobile)/i.test(ua)) return "tablet";
    if (/Mobile|iPhone|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
      return "phone";
    }
    return "computer";
  }

  function detectAndroidModel(userAgent) {
    const ua = String(userAgent || "");
    const match = ua.match(/Android[^;]*;\s*([^;)]+)\)/i);
    if (!match) return "";
    let model = normalizeText(match[1], 80);
    model = model
      .replace(/^wv$/i, "")
      .replace(/\s+Build\/.*$/i, "")
      .replace(/\s+AppleWebKit.*$/i, "")
      .trim();
    if (!model || /^(Linux|U|en-[-a-z]+)$/i.test(model)) return "";
    return model;
  }

  function titleCaseBrand(value) {
    const raw = normalizeText(value, 80);
    if (!raw) return "";
    if (/^[A-Z0-9][A-Z0-9\s\-_.]+$/.test(raw) && raw.length <= 24) {
      return raw;
    }
    return raw
      .split(/[\s_-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(" ");
  }

  function defaultComputerName(osName) {
    if (osName === "Windows") return "Windows PC";
    if (osName === "macOS") return "Mac";
    if (osName === "ChromeOS") return "Chromebook";
    if (osName === "Linux") return "Linux PC";
    return "Computer";
  }

  function resolveFromUserAgent(userAgent = "") {
    const osName = detectOs(userAgent);
    const browser = detectBrowser(userAgent);
    const deviceType = detectDeviceTypeFromUa(userAgent);
    const androidModel = detectAndroidModel(userAgent);
    let deviceName = "";
    if (deviceType === "phone" || deviceType === "tablet") {
      if (androidModel) {
        deviceName = titleCaseBrand(androidModel);
      } else if (osName === "iOS") {
        deviceName = /iPad/i.test(userAgent) ? "iPad" : "iPhone";
      } else if (osName === "Android") {
        deviceName = deviceType === "tablet" ? "Android tablet" : "Android phone";
      }
    } else {
      deviceName = defaultComputerName(osName);
    }
    return {
      deviceType,
      deviceName,
      osName,
      clientName: browser || "Browser",
      clientKind: "browser",
    };
  }

  function buildDeviceRecord(input = {}, request) {
    const userAgent = normalizeText(
      input.userAgent || request?.headers?.["user-agent"] || "",
      400,
    );
    const inferred = resolveFromUserAgent(userAgent);
    const deviceKey =
      normalizeText(input.deviceKey || input.clientKey || "", 120) ||
      `anon_${newId()}`;
    const deviceType =
      normalizeDeviceType(input.deviceType) || inferred.deviceType || "computer";
    const osName =
      normalizeText(input.osName || input.os || "", 60) || inferred.osName || "";
    const clientKind =
      normalizeClientKind(input.clientKind) ||
      (normalizeText(input.clientName || "", 60).toLowerCase().includes("switch")
        ? "app"
        : inferred.clientKind) ||
      "browser";
    const clientName =
      normalizeText(input.clientName || input.browser || "", 60) ||
      (clientKind === "app" ? "Switch App" : inferred.clientName) ||
      "Unknown";
    let deviceName =
      normalizeText(input.deviceName || input.model || input.brand || "", 80) ||
      inferred.deviceName;
    if (!deviceName) {
      deviceName =
        deviceType === "phone"
          ? "Phone"
          : deviceType === "tablet"
            ? "Tablet"
            : defaultComputerName(osName);
    } else {
      deviceName = titleCaseBrand(deviceName);
    }

    const email = normalizeText(input.email || input.accountEmail || "", 160).toLowerCase();
    const locationLabel = normalizeText(input.locationLabel || input.location || "", 80);
    const ipHint = normalizeText(
      input.ipHint ||
        request?.headers?.["x-forwarded-for"]?.split(",")[0] ||
        request?.socket?.remoteAddress ||
        "",
      80,
    );

    return {
      deviceKey,
      deviceType,
      deviceName,
      osName,
      clientName,
      clientKind,
      email,
      locationLabel,
      ipHint,
      userAgent,
    };
  }

  function toPublicDevice(entry, currentDeviceKey = "") {
    const deviceKey = normalizeText(entry?.deviceKey, 120);
    const isCurrent =
      Boolean(currentDeviceKey) &&
      Boolean(deviceKey) &&
      deviceKey === currentDeviceKey;
    return {
      id: String(entry?.id || ""),
      deviceKey,
      deviceType: normalizeDeviceType(entry?.deviceType) || "computer",
      deviceName: normalizeText(entry?.deviceName, 80) || "Device",
      osName: normalizeText(entry?.osName, 60),
      clientName: normalizeText(entry?.clientName, 60) || "Unknown",
      clientKind: normalizeClientKind(entry?.clientKind) || "browser",
      locationLabel: normalizeText(entry?.locationLabel, 80),
      lastActiveAt: entry?.lastActiveAt || entry?.createdAt || null,
      createdAt: entry?.createdAt || null,
      isCurrent,
    };
  }

  function sortDevices(devices) {
    return [...devices].sort((a, b) => {
      if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1;
      const aTime = Date.parse(a.lastActiveAt || a.createdAt || 0) || 0;
      const bTime = Date.parse(b.lastActiveAt || b.createdAt || 0) || 0;
      return bTime - aTime;
    });
  }

  async function listDevicesForAccount(accountId, currentDeviceKey = "") {
    const store = await readStore();
    const rows = Array.isArray(store[accountId]) ? store[accountId] : [];
    return sortDevices(
      rows
        .filter((row) => row && !row.revokedAt)
        .map((row) => toPublicDevice(row, currentDeviceKey)),
    );
  }

  async function registerDevice({ accountId, payload = {}, request } = {}) {
    const account = normalizeText(accountId, 120);
    if (!account) {
      throw Object.assign(new Error("Account ID is required."), { statusCode: 400 });
    }
    const built = buildDeviceRecord(payload, request);
    const store = await readStore();
    const existing = Array.isArray(store[account]) ? store[account] : [];
    const now = nowIso();
    const index = existing.findIndex(
      (row) => row && normalizeText(row.deviceKey, 120) === built.deviceKey,
    );

    let record;
    if (index >= 0 && existing[index].revokedAt && payload.reactivate !== true) {
      throw Object.assign(new Error("This device was signed out."), {
        statusCode: 401,
        code: "device_revoked",
        forgetRemember: existing[index].forgetRemember !== false,
      });
    }
    if (index >= 0) {
      record = {
        ...existing[index],
        ...built,
        lastActiveAt: now,
        updatedAt: now,
        revokedAt: null,
        forgetRemember: false,
      };
      existing[index] = record;
    } else {
      record = {
        id: newId(),
        accountId: account,
        ...built,
        createdAt: now,
        lastActiveAt: now,
        updatedAt: now,
        revokedAt: null,
        forgetRemember: false,
      };
      existing.unshift(record);
    }

    const active = existing.filter((row) => row && !row.revokedAt);
    const revoked = existing.filter((row) => row && row.revokedAt);
    store[account] = [...active.slice(0, MAX_DEVICES_PER_ACCOUNT), ...revoked].slice(
      0,
      MAX_DEVICES_PER_ACCOUNT * 2,
    );
    await writeStore(store);
    return toPublicDevice(record, built.deviceKey);
  }

  async function revokeDevice({
    accountId,
    deviceId = "",
    deviceKey = "",
    revokeOthers = false,
    keepDeviceKey = "",
  } = {}) {
    const account = normalizeText(accountId, 120);
    if (!account) {
      throw Object.assign(new Error("Account ID is required."), { statusCode: 400 });
    }
    const store = await readStore();
    const rows = Array.isArray(store[account]) ? store[account] : [];
    if (!rows.length) {
      return { revokedCount: 0, devices: [] };
    }
    const now = nowIso();
    const targetId = normalizeText(deviceId, 80);
    const targetKey = normalizeText(deviceKey, 120);
    const keepKey = normalizeText(keepDeviceKey, 120);
    let revokedCount = 0;

    for (const row of rows) {
      if (!row || row.revokedAt) continue;
      const rowKey = normalizeText(row.deviceKey, 120);
      const rowId = normalizeText(row.id, 80);
      let shouldRevoke = false;
      if (revokeOthers) {
        shouldRevoke = !keepKey || rowKey !== keepKey;
      } else if (keepKey && rowKey === keepKey) {
        // The device you are using cannot be signed out from this list.
        shouldRevoke = false;
      } else if (targetId) {
        shouldRevoke = rowId === targetId;
      } else if (targetKey) {
        shouldRevoke = rowKey === targetKey;
      }
      if (!shouldRevoke) continue;
      row.revokedAt = now;
      row.updatedAt = now;
      row.forgetRemember = true;
      revokedCount += 1;
    }

    store[account] = rows;
    await writeStore(store);
    return {
      revokedCount,
      devices: await listDevicesForAccount(account, keepKey || targetKey),
    };
  }

  async function revokeAllForAccount(accountId) {
    return revokeDevice({ accountId, revokeOthers: true, keepDeviceKey: "__none__" });
  }

  function sessionStatusFromRow(row) {
    if (!row) {
      return { active: true, known: false, revoked: false, forgetRemember: false };
    }
    const revoked = Boolean(row.revokedAt);
    return {
      active: !revoked,
      known: true,
      revoked,
      forgetRemember: revoked && row.forgetRemember !== false,
    };
  }

  async function getDeviceSessionStatus({
    accountId = "",
    deviceKey = "",
    email = "",
  } = {}) {
    const key = normalizeText(deviceKey, 120);
    if (!key) {
      return { active: true, known: false, revoked: false, forgetRemember: false };
    }
    const store = await readStore();
    const account = normalizeText(accountId, 120);
    const mail = normalizeText(email, 160).toLowerCase();
    if (account && Array.isArray(store[account])) {
      const row = store[account].find(
        (entry) => entry && normalizeText(entry.deviceKey, 120) === key,
      );
      if (row) return sessionStatusFromRow(row);
    }
    if (mail) {
      for (const rows of Object.values(store)) {
        if (!Array.isArray(rows)) continue;
        const row = rows.find((entry) => {
          if (!entry || normalizeText(entry.deviceKey, 120) !== key) return false;
          return normalizeText(entry.email, 160).toLowerCase() === mail;
        });
        if (row) return sessionStatusFromRow(row);
      }
    }
    return { active: true, known: false, revoked: false, forgetRemember: false };
  }

  async function handleStatus(request, response, requestUrl) {
    try {
      const status = await getDeviceSessionStatus({
        accountId: getAccountIdFrom(request),
        deviceKey: getCurrentDeviceKeyFrom({}, requestUrl),
        email: getRequestAccountIdentifier(request).email,
      });
      sendJson(response, 200, {
        ...status,
        message: status.revoked
          ? "This device was signed out."
          : "Device session is active.",
      });
    } catch (error) {
      sendJson(response, error?.statusCode || 500, {
        message: error instanceof Error ? error.message : "Unable to check device session.",
      });
    }
  }

  function getAccountIdFrom(request) {
    return normalizeText(getRequestAccountIdentifier(request).id, 120);
  }

  function getCurrentDeviceKeyFrom(payload = {}, requestUrl) {
    return normalizeText(
      payload.deviceKey ||
        payload.clientKey ||
        payload.currentDeviceKey ||
        requestUrl?.searchParams?.get("deviceKey") ||
        requestUrl?.searchParams?.get("currentDeviceKey") ||
        "",
      120,
    );
  }

  async function handleList(request, response, requestUrl) {
    try {
      const accountId = getAccountIdFrom(request);
      if (!accountId) {
        sendJson(response, 400, { message: "Account ID is required." });
        return;
      }
      const currentDeviceKey = getCurrentDeviceKeyFrom({}, requestUrl);
      const devices = await listDevicesForAccount(accountId, currentDeviceKey);
      sendJson(response, 200, {
        devices,
        message: "Devices loaded.",
      });
    } catch (error) {
      sendJson(response, error?.statusCode || 500, {
        message: error instanceof Error ? error.message : "Unable to load devices.",
      });
    }
  }

  async function handleRegister(request, response) {
    try {
      const payload = await parseRequestBody(request);
      assertSessionPayloadIdentity(request, payload, { account: true });
      const accountId = getAccountIdFrom(request);
      const device = await registerDevice({ accountId, payload, request });
      const devices = await listDevicesForAccount(accountId, device.deviceKey);
      sendJson(response, 200, {
        device,
        devices,
        message: "Device registered.",
      });
    } catch (error) {
      sendJson(response, error?.statusCode || 500, {
        message:
          error instanceof Error ? error.message : "Unable to register device.",
        code: error?.code || "",
        forgetRemember: error?.forgetRemember === true,
      });
    }
  }

  async function handleRevoke(request, response) {
    try {
      const payload = await parseRequestBody(request);
      assertSessionPayloadIdentity(request, payload, { account: true });
      const accountId = getAccountIdFrom(request);
      const revokeOthers = Boolean(payload.revokeOthers || payload.allOthers);
      const result = await revokeDevice({
        accountId,
        deviceId: payload.deviceId || payload.id || "",
        deviceKey: payload.deviceKey || "",
        revokeOthers,
        keepDeviceKey: payload.keepDeviceKey || payload.currentDeviceKey || "",
      });
      sendJson(response, 200, {
        ...result,
        message: revokeOthers
          ? "Other devices signed out."
          : result.revokedCount > 0
            ? "Device signed out."
            : "Device was not found.",
      });
    } catch (error) {
      sendJson(response, error?.statusCode || 500, {
        message: error instanceof Error ? error.message : "Unable to sign out device.",
      });
    }
  }

  async function tryHandleAccountDeviceRoutes(request, response, requestUrl) {
    const pathname = requestUrl.pathname;

    if (pathname === "/api/account/devices/status") {
      if (request.method === "GET") {
        await handleStatus(request, response, requestUrl);
        return true;
      }
      sendJson(response, 405, { message: "Method not allowed." });
      return true;
    }

    if (pathname === "/api/account/devices") {
      if (request.method === "GET") {
        await handleList(request, response, requestUrl);
        return true;
      }
      if (request.method === "POST") {
        await handleRegister(request, response);
        return true;
      }
      sendJson(response, 405, { message: "Method not allowed." });
      return true;
    }

    if (pathname === "/api/account/devices/register") {
      if (request.method === "POST") {
        await handleRegister(request, response);
        return true;
      }
      sendJson(response, 405, { message: "Method not allowed." });
      return true;
    }

    if (
      pathname === "/api/account/devices/revoke" ||
      pathname === "/api/account/devices/logout"
    ) {
      if (request.method === "POST" || request.method === "DELETE") {
        await handleRevoke(request, response);
        return true;
      }
      sendJson(response, 405, { message: "Method not allowed." });
      return true;
    }

    return false;
  }

  return {
    tryHandleAccountDeviceRoutes,
    registerDevice,
    listDevicesForAccount,
    revokeDevice,
    revokeAllForAccount,
    getDeviceSessionStatus,
    resolveFromUserAgent,
  };
}

module.exports = {
  createAccountDevicesApi,
};
