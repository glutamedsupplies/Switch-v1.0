"use strict";

const path = require("path");
const fsPromises = require("fs/promises");

const CURRENT_LOCATION_ADDRESS_ID = "current-location";
const ALLOWED_LABELS = new Set(["Home", "Work", "Other", "Current"]);

function createBuyerDeliveryAddressesApi(deps) {
  const {
    DATA_DIR,
    ensureStoragePaths,
    writeJsonFileAtomically,
    sendJson,
    parseRequestBody,
    getRequestAccountIdentifier,
    assertSessionPayloadIdentity,
  } = deps;

  const ADDRESSES_FILE = path.join(DATA_DIR, "buyer_delivery_addresses.json");

  function nowIso() {
    return new Date().toISOString();
  }

  function normalizeAccountKey(accountId, email) {
    const id = String(accountId || "").trim().toLowerCase();
    if (id) return id;
    const mail = String(email || "").trim().toLowerCase();
    return mail || "";
  }

  function normalizeCoord(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  function normalizeEntry(raw = {}) {
    const label = String(raw.label || "").trim();
    const id = String(raw.id || "").trim() || `addr_${Date.now()}`;
    return {
      id,
      search: String(raw.search || "").trim().slice(0, 240),
      unit: String(raw.unit || "").trim().slice(0, 120),
      street: String(raw.street || "").trim().slice(0, 180),
      city: String(raw.city || "").trim().slice(0, 120),
      province: String(raw.province || "").trim().slice(0, 120),
      postal: String(raw.postal || "").trim().slice(0, 32),
      label: ALLOWED_LABELS.has(label) ? label : "Home",
      lat: normalizeCoord(raw.lat),
      lng: normalizeCoord(raw.lng),
    };
  }

  function normalizeBook(raw = {}) {
    let entries = [];
    if (Array.isArray(raw.entries)) {
      entries = raw.entries
        .map((entry) => normalizeEntry(entry))
        .filter((entry) => entry.street || entry.city || entry.search);
    } else if (raw.street || raw.city || raw.search) {
      entries = [normalizeEntry(raw)];
    }

    // Cap saved addresses to keep payloads small.
    entries = entries.slice(0, 40);

    let selectedId = String(raw.selectedId || "").trim();
    const useCurrentLocation = raw.useCurrentLocation === true;
    if (!selectedId && entries.length) {
      selectedId = entries[0].id;
    }
    if (selectedId && !entries.some((entry) => entry.id === selectedId)) {
      selectedId = entries[0]?.id || "";
    }

    return {
      version: 2,
      selectedId,
      useCurrentLocation:
        useCurrentLocation || selectedId === CURRENT_LOCATION_ADDRESS_ID,
      entries,
      updatedAt: String(raw.updatedAt || "").trim() || nowIso(),
    };
  }

  function emptyBook() {
    return {
      version: 2,
      selectedId: "",
      useCurrentLocation: false,
      entries: [],
      updatedAt: "",
    };
  }

  async function readStore() {
    await ensureStoragePaths();
    try {
      const raw = await fsPromises.readFile(ADDRESSES_FILE, "utf8");
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return {};
      }
      return parsed;
    } catch (error) {
      if (error && error.code === "ENOENT") return {};
      console.warn("Unable to read buyer delivery addresses.", error);
      return {};
    }
  }

  async function writeStore(store) {
    await ensureStoragePaths();
    await writeJsonFileAtomically(ADDRESSES_FILE, store);
  }

  function resolveIdentity(request) {
    const identity = getRequestAccountIdentifier(request);
    const accountId = String(identity.id || "").trim();
    const email = String(identity.email || "").trim().toLowerCase();
    const accountKey = normalizeAccountKey(accountId, email);
    return { accountId, email, accountKey };
  }

  async function handleGet(request, response, requestUrl) {
    const { accountKey } = resolveIdentity(request);
    if (!accountKey) {
      sendJson(response, 400, {
        message: "Account ID or email is required.",
      });
      return;
    }

    const store = await readStore();
    const book = store[accountKey]
      ? normalizeBook(store[accountKey])
      : emptyBook();
    sendJson(response, 200, {
      accountKey,
      book,
      message: "Delivery addresses loaded.",
    });
  }

  async function handlePut(request, response) {
    const payload = await parseRequestBody(request);
    assertSessionPayloadIdentity(request, payload, { account: true });
    const { accountKey } = resolveIdentity(request);
    if (!accountKey) {
      sendJson(response, 400, {
        message: "Account ID or email is required.",
      });
      return;
    }

    const book = normalizeBook({
      ...(payload.book && typeof payload.book === "object" ? payload.book : payload),
      updatedAt: nowIso(),
    });

    const store = await readStore();
    store[accountKey] = book;
    await writeStore(store);

    sendJson(response, 200, {
      accountKey,
      book,
      message: "Delivery addresses saved.",
    });
  }

  async function tryHandleBuyerDeliveryAddressRoutes(
    request,
    response,
    requestUrl,
  ) {
    const pathname = String(requestUrl?.pathname || "");
    if (pathname !== "/api/account/delivery-addresses") {
      return false;
    }

    if (request.method === "GET") {
      await handleGet(request, response, requestUrl);
      return true;
    }
    if (request.method === "PUT" || request.method === "POST") {
      await handlePut(request, response);
      return true;
    }

    sendJson(response, 405, { message: "Method not allowed." });
    return true;
  }

  return {
    tryHandleBuyerDeliveryAddressRoutes,
    CURRENT_LOCATION_ADDRESS_ID,
  };
}

module.exports = {
  createBuyerDeliveryAddressesApi,
};
