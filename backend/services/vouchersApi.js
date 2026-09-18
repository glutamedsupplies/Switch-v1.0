"use strict";

const path = require("path");
const crypto = require("crypto");
const fsPromises = require("fs/promises");

const VOUCHER_KINDS = new Set([
  "percent",
  "gift",
  "shipping",
  "shopping",
  "loyalty",
  "ticket",
]);
const VOUCHER_STATUSES = new Set(["active", "used", "expired"]);
const VOUCHER_ACTIONS = new Set(["useNow", "apply", "used", "expired"]);
const VOUCHER_DISCOUNT_TYPES = new Set(["percent", "fixed"]);
const USED_EXPIRED_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const PLATFORM_ID_ALL = "all";

const DEFAULT_VOUCHERS = [
  {
    id: "voucher-fashion20",
    status: "active",
    kind: "percent",
    discountType: "percent",
    discountValue: "20",
    title: "20% OFF",
    subtitle: "20% of total purchase",
    minimumSpend: "500",
    code: "FASHION20",
    badge: "Online Only",
    date: "Dec 31, 2026",
    action: "useNow",
    note: "Look good.\nSpend less!",
    platformId: "shop",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "voucher-welcome100",
    status: "active",
    kind: "gift",
    discountType: "fixed",
    discountValue: "100",
    title: "₱100 OFF",
    subtitle: "₱100 off total purchase",
    minimumSpend: "300",
    code: "WELCOME100",
    badge: "New Users Only",
    date: "Nov 30, 2026",
    action: "apply",
    note: "A little happiness\nfor you!",
    platformId: "shop",
    createdAt: "2026-01-02T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
  },
  {
    id: "voucher-freeship",
    status: "active",
    kind: "shipping",
    discountType: "percent",
    discountValue: "",
    freeShipping: true,
    title: "Free Shipping",
    subtitle: "Free shipping on total purchase",
    minimumSpend: "249",
    code: "FREESHIP",
    badge: "Sitewide",
    date: "Dec 15, 2026",
    action: "useNow",
    note: "Shop more.\nWorry less!",
    platformId: "shop",
    createdAt: "2026-01-03T00:00:00.000Z",
    updatedAt: "2026-01-03T00:00:00.000Z",
  },
  {
    id: "voucher-b1g1",
    status: "active",
    kind: "shopping",
    discountType: "percent",
    discountValue: "",
    title: "Buy 1 Get 1",
    subtitle: "on selected items",
    minimumSpend: "299",
    code: "B1G1SPECIAL",
    badge: "Limited Time",
    date: "Nov 25, 2026",
    action: "useNow",
    note: "More to love\nfor less!",
    platformId: "food",
    createdAt: "2026-01-04T00:00:00.000Z",
    updatedAt: "2026-01-04T00:00:00.000Z",
  },
  {
    id: "voucher-thankyou10",
    status: "used",
    kind: "loyalty",
    discountType: "percent",
    discountValue: "10",
    title: "10% OFF",
    subtitle: "10% of total purchase",
    minimumSpend: "200",
    code: "THANKYOU10",
    badge: "Order Reward",
    date: "Sep 02, 2026",
    action: "used",
    note: "Thanks for\nshopping!",
    platformId: "shop",
    createdAt: "2025-12-01T00:00:00.000Z",
    updatedAt: "2026-09-02T00:00:00.000Z",
    statusAt: "2026-09-02T00:00:00.000Z",
  },
  {
    id: "voucher-save50",
    status: "expired",
    kind: "ticket",
    discountType: "fixed",
    discountValue: "50",
    title: "₱50 OFF",
    subtitle: "₱50 off total purchase",
    minimumSpend: "250",
    code: "SAVE50",
    badge: "Storewide",
    date: "Aug 31, 2026",
    action: "expired",
    note: "A deal for\nevery cart!",
    platformId: "shop",
    createdAt: "2025-11-01T00:00:00.000Z",
    updatedAt: "2026-08-31T00:00:00.000Z",
    statusAt: "2026-08-31T00:00:00.000Z",
  },
];

function createVouchersApi(deps) {
  const {
    DATA_DIR,
    ensureStoragePaths,
    writeJsonFileAtomically,
    requireSuperAdmin,
    getRequestAdminId,
    getExplicitRequestAdminId,
    normalizeAdminTenantId,
    isUsableProductAdminScope,
    readAccounts,
    findAdminAccountByScopeId,
    requireAdminRestrictionAllowed,
    persistSuperAdminNotification,
    createPersistentLinkedNotification,
    logActivitySafely,
    sendJson,
    parseRequestBody,
  } = deps;

  const VOUCHERS_FILE = path.join(DATA_DIR, "vouchers.json");
  const normalizeTenantId =
    typeof normalizeAdminTenantId === "function"
      ? normalizeAdminTenantId
      : (value, fallback = "") => {
          const normalized = String(value ?? "")
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9._-]+/g, "-")
            .replace(/^-+|-+$/g, "");
          return normalized || fallback;
        };

  function nowIso() {
    return new Date().toISOString();
  }

  function newId() {
    return `voucher-${crypto.randomBytes(8).toString("hex")}`;
  }

  function formatDisplayDate(value) {
    const raw = String(value ?? "").trim();
    if (!raw) return "";
    if (/^[A-Za-z]{3}\s+\d{1,2},\s+\d{4}$/.test(raw)) return raw;
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return raw.slice(0, 40);
    return parsed.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      timeZone: "Asia/Manila",
    });
  }

  function normalizeCode(value) {
    return String(value ?? "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "")
      .slice(0, 32);
  }

  function normalizeNote(value) {
    return String(value ?? "")
      .replace(/\r\n/g, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .trim()
      .slice(0, 80);
  }

  function normalizeMinimumSpend(value) {
    const digits = String(value ?? "")
      .replace(/[^\d.]/g, "")
      .replace(/(\..*)\./g, "$1");
    if (!digits) return "0";
    const amount = Number(digits);
    if (!Number.isFinite(amount) || amount < 0) return "0";
    return String(Math.round(amount));
  }

  function normalizeDiscountType(value, kindHint = "") {
    const raw = String(value ?? "")
      .trim()
      .toLowerCase();
    if (VOUCHER_DISCOUNT_TYPES.has(raw)) return raw;
    const kind = String(kindHint || "")
      .trim()
      .toLowerCase();
    if (kind === "gift" || kind === "fixed") return "fixed";
    return "percent";
  }

  function normalizeDiscountValue(value, discountType) {
    const digits = String(value ?? "")
      .replace(/[^\d.]/g, "")
      .replace(/(\..*)\./g, "$1");
    if (!digits) return "";
    const amount = Number(digits);
    if (!Number.isFinite(amount) || amount <= 0) return "";
    const rounded = Math.round(amount);
    if (discountType === "percent" && rounded > 100) {
      throw new Error("Percent of total purchase cannot exceed 100.");
    }
    return String(rounded);
  }

  function defaultDiscountSubtitle(discountType, discountValue) {
    if (discountType === "fixed") {
      return discountValue
        ? `₱${discountValue} off total purchase`
        : "Fixed amount off total purchase";
    }
    return discountValue
      ? `${discountValue}% of total purchase`
      : "Percent of total purchase";
  }

  function defaultDiscountTitle(discountType, discountValue, freeShipping = false) {
    if (discountValue) {
      return discountType === "fixed"
        ? `₱${discountValue} OFF`
        : `${discountValue}% OFF`;
    }
    if (freeShipping) return "Free Shipping";
    return "";
  }

  function normalizePlatformId(value, { required = false } = {}) {
    const raw = String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "")
      .slice(0, 40);
    if (!raw) {
      if (required) {
        throw new Error("Select a buyer platform for this voucher.");
      }
      return PLATFORM_ID_ALL;
    }
    if (raw === PLATFORM_ID_ALL) {
      return PLATFORM_ID_ALL;
    }
    return raw;
  }

  function voucherAppliesToPlatform(voucher, platformId) {
    const wanted = normalizePlatformId(platformId);
    if (!wanted || wanted === PLATFORM_ID_ALL) return true;
    const scoped = normalizePlatformId(voucher?.platformId);
    return !scoped || scoped === PLATFORM_ID_ALL || scoped === wanted;
  }

  function normalizeVoucher(input = {}, existing = null) {
    const statusRaw = String(input.status ?? existing?.status ?? "active")
      .trim()
      .toLowerCase();
    const status = VOUCHER_STATUSES.has(statusRaw) ? statusRaw : "active";
    const discountType = normalizeDiscountType(
      input.discountType ?? existing?.discountType,
      input.kind ?? existing?.kind,
    );
    const kindRaw = String(
      input.kind ??
        existing?.kind ??
        (discountType === "fixed" ? "gift" : "percent"),
    )
      .trim()
      .toLowerCase();
    const kind = VOUCHER_KINDS.has(kindRaw)
      ? kindRaw
      : discountType === "fixed"
        ? "gift"
        : "percent";
    let action = String(input.action ?? existing?.action ?? "").trim();
    if (!VOUCHER_ACTIONS.has(action)) {
      action =
        status === "active"
          ? "useNow"
          : status === "used"
            ? "used"
            : "expired";
    }

    const discountValue = normalizeDiscountValue(
      input.discountValue ?? existing?.discountValue ?? "",
      discountType,
    );
    const freeShipping = Boolean(
      input.freeShipping ??
        input.isFreeShipping ??
        existing?.freeShipping ??
        existing?.isFreeShipping ??
        kind === "shipping",
    );
    const derivedTitle = defaultDiscountTitle(
      discountType,
      discountValue,
      freeShipping,
    );
    const title = (
      String(input.title ?? existing?.title ?? "").trim() || derivedTitle
    ).slice(0, 48);
    const subtitleRaw = String(input.subtitle ?? existing?.subtitle ?? "").trim();
    const subtitle = (
      subtitleRaw || defaultDiscountSubtitle(discountType, discountValue)
    ).slice(0, 80);
    const code = normalizeCode(input.code ?? existing?.code);
    const badge = String(input.badge ?? existing?.badge ?? "Sitewide")
      .trim()
      .slice(0, 40);
    const note = normalizeNote(input.note ?? existing?.note ?? "A deal\nfor you!");
    const date = formatDisplayDate(
      input.date ?? input.expiresAt ?? existing?.date ?? "",
    );
    const minimumSpend = normalizeMinimumSpend(
      input.minimumSpend ?? existing?.minimumSpend ?? "0",
    );
    const creating = !existing;
    const sellerAdminId = normalizeTenantId(
      input.sellerAdminId ?? existing?.sellerAdminId ?? "",
      "",
    );
    const platformSource =
      input.platformId != null && String(input.platformId).trim() !== ""
        ? input.platformId
        : input.platform != null && String(input.platform).trim() !== ""
          ? input.platform
          : existing?.platformId;
    // Seller store vouchers default to all platforms; scope is sellerAdminId.
    const platformId = normalizePlatformId(
      creating && sellerAdminId && (platformSource == null || String(platformSource).trim() === "")
        ? PLATFORM_ID_ALL
        : platformSource,
      {
        required: creating && !sellerAdminId,
      },
    );

    if (!title) throw new Error("Voucher title is required.");
    if (!code || code.length < 3) {
      throw new Error("Voucher code must be at least 3 characters.");
    }
    if (!date) throw new Error("Voucher expiry date is required.");
    if (creating && !discountValue) {
      if (!freeShipping) {
        throw new Error(
          discountType === "fixed"
            ? "Enter the fixed price amount off total purchase."
            : "Enter the percent of total purchase.",
        );
      }
    }
    if (creating && !sellerAdminId && !platformId) {
      throw new Error("Select a buyer platform for this voucher.");
    }

    const id = String(input.id ?? existing?.id ?? newId()).trim() || newId();
    const createdAt = String(existing?.createdAt || input.createdAt || nowIso());
    const updatedAt = String(
      input.updatedAt || existing?.updatedAt || createdAt || nowIso(),
    );
    const previousStatus = String(existing?.status || "").trim().toLowerCase();
    let statusAt = String(input.statusAt || existing?.statusAt || "").trim();
    if (status === "active") {
      statusAt = "";
    } else if (!statusAt || previousStatus !== status) {
      if (previousStatus !== status) {
        statusAt = nowIso();
      } else {
        const fromDate = Date.parse(date);
        statusAt = Number.isNaN(fromDate)
          ? updatedAt || createdAt || nowIso()
          : new Date(fromDate).toISOString();
      }
    }

    return {
      id,
      status,
      kind,
      title,
      subtitle,
      minimumSpend,
      code,
      badge,
      date,
      action,
      note,
      platformId,
      discountType,
      discountValue: discountValue || existing?.discountValue || "",
      freeShipping,
      passive: Boolean(
        input.passive ??
          input.isPassive ??
          existing?.passive ??
          existing?.isPassive ??
          false,
      ),
      createdAt,
      updatedAt,
      ...(sellerAdminId ? { sellerAdminId } : {}),
      ...(statusAt ? { statusAt } : {}),
    };
  }

  function resolveSellerAccountLabel(account) {
    if (!account || typeof account !== "object") {
      return "Seller store";
    }
    return (
      String(
        account.storeName ||
          account.companyName ||
          account.businessName ||
          account.displayName ||
          "",
      )
        .replace(/\s+/g, " ")
        .trim() || "Seller store"
    );
  }

  function requireSellerAdminScope(request, response, requestUrl = null) {
    if (typeof getExplicitRequestAdminId !== "function") {
      sendJson(response, 503, {
        message: "Seller admin voucher routes are unavailable.",
      });
      return "";
    }
    const adminId = normalizeTenantId(
      getExplicitRequestAdminId(request, requestUrl),
      "",
    );
    if (!adminId || !isUsableProductAdminScope(adminId)) {
      sendJson(response, 403, {
        message: "Logged-in seller scope is required to manage store vouchers.",
      });
      return "";
    }
    return adminId;
  }

  function voucherOwnedBySeller(voucher, sellerAdminId) {
    const scopedSeller = normalizeTenantId(voucher?.sellerAdminId || "", "");
    const wanted = normalizeTenantId(sellerAdminId || "", "");
    return Boolean(scopedSeller && wanted && scopedSeller === wanted);
  }

  async function notifySuperAdminSellerVoucherAction({
    action,
    voucher,
    sellerAdminId,
    request,
  }) {
    if (
      typeof persistSuperAdminNotification !== "function" ||
      typeof createPersistentLinkedNotification !== "function"
    ) {
      return;
    }
    const accounts =
      typeof readAccounts === "function" ? await readAccounts() : [];
    const account =
      typeof findAdminAccountByScopeId === "function"
        ? findAdminAccountByScopeId(accounts, sellerAdminId)
        : null;
    const storeName = resolveSellerAccountLabel(account);
    const code = String(voucher?.code || "").trim().toUpperCase() || "VOUCHER";
    const isDelete = action === "deleted";
    await persistSuperAdminNotification(
      createPersistentLinkedNotification({
        type: isDelete ? "seller-voucher-deleted" : "seller-voucher-created",
        audience: "super_admin",
        title: isDelete ? "Seller deleted a voucher" : "Seller created a voucher",
        reason: isDelete ? "Store promo removed" : "New store promo",
        message: isDelete
          ? `${storeName} removed store voucher ${code}.`
          : `${storeName} published store voucher ${code}.`,
        adminId: sellerAdminId,
        companyName: storeName,
        storeName,
        businessName: storeName,
        createdBy: storeName,
        targetUrl: "/super_admin.html#vouchers",
      }),
    );
    if (typeof logActivitySafely === "function") {
      await logActivitySafely(
        {
          id: `activity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          type: "seller-admin-action",
          source: "seller_admin",
          adminId: sellerAdminId,
          action: isDelete ? "voucher-deleted" : "voucher-created",
          title: isDelete ? "Store voucher deleted" : "Store voucher created",
          description: isDelete
            ? `${storeName} deleted voucher ${code}.`
            : `${storeName} created store voucher ${code}.`,
          actor: {
            role: "seller-admin",
            accountId: sellerAdminId,
            displayName: storeName,
          },
          createdAt: new Date().toISOString(),
          skipLinkedNotification: true,
        },
        request,
      );
    }
  }

  function platformLabelFromId(platformId) {
    const id = normalizePlatformId(platformId);
    if (!id || id === PLATFORM_ID_ALL) return "store checkout";
    return id.charAt(0).toUpperCase() + id.slice(1);
  }

  function filterVouchersForPublicList(vouchers, requestUrl) {
    const platformFilter = normalizePlatformId(
      requestUrl?.searchParams?.get("platform") ||
        requestUrl?.searchParams?.get("platformId") ||
        "",
    );
    const sellerAdminFilter = normalizeTenantId(
      requestUrl?.searchParams?.get("sellerAdminId") ||
        requestUrl?.searchParams?.get("seller") ||
        "",
      "",
    );
    return vouchers.filter((entry) => {
      if (
        platformFilter &&
        platformFilter !== PLATFORM_ID_ALL &&
        !voucherAppliesToPlatform(entry, platformFilter)
      ) {
        return false;
      }
      // Seller-store vouchers stay in the public catalog so search/wallet can
      // show them. Callers scope by sellerAdminId at display/checkout time.
      const scopedSeller = normalizeTenantId(entry?.sellerAdminId || "", "");
      if (scopedSeller && sellerAdminFilter) {
        return scopedSeller === sellerAdminFilter;
      }
      return true;
    });
  }

  function retentionAnchorMs(voucher) {
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

  function isPastUsedExpiredRetention(voucher) {
    if (!voucher || voucher.status === "active") return false;
    const anchor = retentionAnchorMs(voucher);
    if (anchor == null) return false;
    return Date.now() - anchor >= USED_EXPIRED_RETENTION_MS;
  }

  function sortVouchers(vouchers) {
    return [...vouchers].sort((a, b) => {
      const aTime = Date.parse(a.createdAt || "") || 0;
      const bTime = Date.parse(b.createdAt || "") || 0;
      return bTime - aTime;
    });
  }

  async function ensureVouchersFile() {
    await ensureStoragePaths();
    try {
      await fsPromises.access(VOUCHERS_FILE);
    } catch (_) {
      await writeJsonFileAtomically(VOUCHERS_FILE, DEFAULT_VOUCHERS);
    }
  }

  async function readVouchers({ persistPurge = true } = {}) {
    await ensureVouchersFile();
    try {
      const raw = await fsPromises.readFile(VOUCHERS_FILE, "utf8");
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        throw new Error("Voucher storage must contain a JSON array.");
      }
      const normalized = parsed
        .map((entry) => {
          try {
            return normalizeVoucher(entry, entry);
          } catch (_) {
            return null;
          }
        })
        .filter(Boolean);
      const kept = normalized.filter((entry) => !isPastUsedExpiredRetention(entry));
      if (persistPurge && kept.length !== normalized.length) {
        await writeVouchers(kept);
      }
      return sortVouchers(kept);
    } catch (error) {
      if (error?.code === "ENOENT") {
        await writeJsonFileAtomically(VOUCHERS_FILE, DEFAULT_VOUCHERS);
        return sortVouchers(
          DEFAULT_VOUCHERS.map((entry) => normalizeVoucher(entry, entry)).filter(
            (entry) => !isPastUsedExpiredRetention(entry),
          ),
        );
      }
      throw error;
    }
  }

  async function writeVouchers(vouchers) {
    await writeJsonFileAtomically(
      VOUCHERS_FILE,
      sortVouchers(Array.isArray(vouchers) ? vouchers : []),
    );
  }

  function toPublicVoucher(voucher) {
    return {
      id: voucher.id,
      status: voucher.status,
      kind: voucher.kind,
      title: voucher.title,
      subtitle: voucher.subtitle,
      minimumSpend: voucher.minimumSpend,
      code: voucher.code,
      badge: voucher.badge,
      date: voucher.date,
      action: voucher.action,
      note: voucher.note,
      platformId: voucher.platformId || PLATFORM_ID_ALL,
      discountType: voucher.discountType || "percent",
      discountValue: voucher.discountValue || "",
      freeShipping: Boolean(voucher.freeShipping),
      passive: Boolean(voucher.passive),
      sellerAdminId: voucher.sellerAdminId || "",
      createdAt: voucher.createdAt,
      updatedAt: voucher.updatedAt,
      statusAt: voucher.statusAt || null,
    };
  }

  async function handleList(request, response, requestUrl) {
    try {
      const vouchers = await readVouchers();
      const platformFilter = normalizePlatformId(
        requestUrl?.searchParams?.get("platform") ||
          requestUrl?.searchParams?.get("platformId") ||
          "",
      );
      const filtered = filterVouchersForPublicList(vouchers, requestUrl);
      sendJson(response, 200, {
        vouchers: filtered.map(toPublicVoucher),
        total: filtered.length,
        platformId: platformFilter || PLATFORM_ID_ALL,
      });
    } catch (error) {
      sendJson(response, 500, {
        message: error instanceof Error ? error.message : "Unable to load vouchers.",
      });
    }
  }

  async function handleCreate(request, response) {
    if (!requireSuperAdmin(request, response)) return;
    try {
      const payload = await parseRequestBody(request);
      const vouchers = await readVouchers();
      const stamp = nowIso();
      const next = {
        ...normalizeVoucher(payload),
        createdAt: stamp,
        updatedAt: stamp,
      };
      const duplicate = vouchers.some(
        (entry) => entry.code.toLowerCase() === next.code.toLowerCase(),
      );
      if (duplicate) {
        throw new Error("A voucher with this code already exists.");
      }
      const persisted = [next, ...vouchers];
      await writeVouchers(persisted);
      sendJson(response, 201, {
        voucher: toPublicVoucher(next),
        vouchers: persisted.map(toPublicVoucher),
        message: "Voucher created.",
      });
    } catch (error) {
      sendJson(response, 400, {
        message: error instanceof Error ? error.message : "Unable to create voucher.",
      });
    }
  }

  async function handleUpdate(request, response, voucherId) {
    if (!requireSuperAdmin(request, response)) return;
    try {
      const payload = await parseRequestBody(request);
      const vouchers = await readVouchers();
      const index = vouchers.findIndex((entry) => entry.id === voucherId);
      if (index < 0) {
        sendJson(response, 404, { message: "Voucher not found." });
        return;
      }
      const next = {
        ...normalizeVoucher(payload, vouchers[index]),
        createdAt: vouchers[index].createdAt || nowIso(),
        updatedAt: nowIso(),
      };
      const duplicate = vouchers.some(
        (entry, entryIndex) =>
          entryIndex !== index &&
          entry.code.toLowerCase() === next.code.toLowerCase(),
      );
      if (duplicate) {
        throw new Error("A voucher with this code already exists.");
      }
      const persisted = [...vouchers];
      persisted[index] = next;
      await writeVouchers(persisted);
      sendJson(response, 200, {
        voucher: toPublicVoucher(next),
        vouchers: sortVouchers(persisted).map(toPublicVoucher),
        message: "Voucher updated.",
      });
    } catch (error) {
      sendJson(response, 400, {
        message: error instanceof Error ? error.message : "Unable to update voucher.",
      });
    }
  }

  async function handleSellerList(request, response, requestUrl) {
    const sellerAdminId = requireSellerAdminScope(request, response, requestUrl);
    if (!sellerAdminId) return;
    try {
      const vouchers = await readVouchers();
      const scoped = vouchers.filter((entry) =>
        voucherOwnedBySeller(entry, sellerAdminId),
      );
      sendJson(response, 200, {
        vouchers: scoped.map(toPublicVoucher),
        total: scoped.length,
        sellerAdminId,
      });
    } catch (error) {
      sendJson(response, 500, {
        message:
          error instanceof Error ? error.message : "Unable to load store vouchers.",
      });
    }
  }

  async function handleSellerCreate(request, response, requestUrl) {
    const sellerAdminId = requireSellerAdminScope(request, response, requestUrl);
    if (!sellerAdminId) return;
    if (
      typeof requireAdminRestrictionAllowed === "function" &&
      !(await requireAdminRestrictionAllowed(
        request,
        response,
        requestUrl,
        "create_promos",
        sellerAdminId,
      ))
    ) {
      return;
    }
    try {
      const payload = await parseRequestBody(request);
      const accounts =
        typeof readAccounts === "function" ? await readAccounts() : [];
      const account =
        typeof findAdminAccountByScopeId === "function"
          ? findAdminAccountByScopeId(accounts, sellerAdminId)
          : null;
      const storeName = resolveSellerAccountLabel(account);
      const vouchers = await readVouchers();
      const stamp = nowIso();
      const next = {
        ...normalizeVoucher({
          ...payload,
          // Seller cannot choose platform — voucher is store-scoped only.
          platformId: PLATFORM_ID_ALL,
          sellerAdminId,
          badge: String(payload?.badge || storeName).trim() || storeName,
        }),
        sellerAdminId,
        platformId: PLATFORM_ID_ALL,
        createdAt: stamp,
        updatedAt: stamp,
      };
      const duplicate = vouchers.some(
        (entry) => entry.code.toLowerCase() === next.code.toLowerCase(),
      );
      if (duplicate) {
        throw new Error("A voucher with this code already exists.");
      }
      const persisted = [next, ...vouchers];
      await writeVouchers(persisted);
      await notifySuperAdminSellerVoucherAction({
        action: "created",
        voucher: next,
        sellerAdminId,
        request,
      });
      const scoped = persisted.filter((entry) =>
        voucherOwnedBySeller(entry, sellerAdminId),
      );
      sendJson(response, 201, {
        voucher: toPublicVoucher(next),
        vouchers: scoped.map(toPublicVoucher),
        message: "Store voucher created.",
      });
    } catch (error) {
      sendJson(response, 400, {
        message:
          error instanceof Error ? error.message : "Unable to create store voucher.",
      });
    }
  }

  async function handleSellerDelete(request, response, requestUrl, voucherId) {
    const sellerAdminId = requireSellerAdminScope(request, response, requestUrl);
    if (!sellerAdminId) return;
    if (
      typeof requireAdminRestrictionAllowed === "function" &&
      !(await requireAdminRestrictionAllowed(
        request,
        response,
        requestUrl,
        "create_promos",
        sellerAdminId,
      ))
    ) {
      return;
    }
    try {
      const vouchers = await readVouchers();
      const target = vouchers.find((entry) => entry.id === voucherId);
      if (!target || !voucherOwnedBySeller(target, sellerAdminId)) {
        sendJson(response, 404, { message: "Store voucher not found." });
        return;
      }
      const next = vouchers.filter((entry) => entry.id !== voucherId);
      await writeVouchers(next);
      await notifySuperAdminSellerVoucherAction({
        action: "deleted",
        voucher: target,
        sellerAdminId,
        request,
      });
      const scoped = next.filter((entry) =>
        voucherOwnedBySeller(entry, sellerAdminId),
      );
      sendJson(response, 200, {
        vouchers: scoped.map(toPublicVoucher),
        message: "Store voucher deleted.",
      });
    } catch (error) {
      sendJson(response, 500, {
        message:
          error instanceof Error ? error.message : "Unable to delete store voucher.",
      });
    }
  }

  async function handleDelete(request, response, voucherId) {
    if (!requireSuperAdmin(request, response)) return;
    try {
      const vouchers = await readVouchers();
      const next = vouchers.filter((entry) => entry.id !== voucherId);
      if (next.length === vouchers.length) {
        sendJson(response, 404, { message: "Voucher not found." });
        return;
      }
      await writeVouchers(next);
      sendJson(response, 200, {
        vouchers: next.map(toPublicVoucher),
        message: "Voucher deleted.",
      });
    } catch (error) {
      sendJson(response, 500, {
        message: error instanceof Error ? error.message : "Unable to delete voucher.",
      });
    }
  }

  async function tryHandleVoucherRoutes(request, response, requestUrl) {
    const pathname = requestUrl.pathname;

    if (pathname === "/api/vouchers") {
      if (request.method === "GET") {
        await handleList(request, response, requestUrl);
        return true;
      }
      if (request.method === "POST") {
        await handleCreate(request, response);
        return true;
      }
      sendJson(response, 405, { message: "Method not allowed." });
      return true;
    }

    if (pathname === "/api/admin/vouchers") {
      if (request.method === "GET") {
        await handleSellerList(request, response, requestUrl);
        return true;
      }
      if (request.method === "POST") {
        await handleSellerCreate(request, response, requestUrl);
        return true;
      }
      sendJson(response, 405, { message: "Method not allowed." });
      return true;
    }

    if (pathname === "/api/super-admin/vouchers") {
      if (request.method === "GET") {
        if (!requireSuperAdmin(request, response)) return true;
        try {
          const vouchers = await readVouchers();
          sendJson(response, 200, {
            vouchers: vouchers.map(toPublicVoucher),
            total: vouchers.length,
            platformId: PLATFORM_ID_ALL,
          });
        } catch (error) {
          sendJson(response, 500, {
            message:
              error instanceof Error ? error.message : "Unable to load vouchers.",
          });
        }
        return true;
      }
      if (request.method === "POST") {
        await handleCreate(request, response);
        return true;
      }
      sendJson(response, 405, { message: "Method not allowed." });
      return true;
    }

    const adminItemMatch = pathname.match(/^\/api\/admin\/vouchers\/([^/]+)$/);
    if (adminItemMatch) {
      const voucherId = decodeURIComponent(adminItemMatch[1] || "").trim();
      if (!voucherId) {
        sendJson(response, 400, { message: "Voucher id is required." });
        return true;
      }
      if (request.method === "DELETE") {
        await handleSellerDelete(request, response, requestUrl, voucherId);
        return true;
      }
      sendJson(response, 405, { message: "Method not allowed." });
      return true;
    }

    const itemMatch = pathname.match(/^\/api\/(?:super-admin\/)?vouchers\/([^/]+)$/);
    if (itemMatch) {
      const voucherId = decodeURIComponent(itemMatch[1] || "").trim();
      if (!voucherId) {
        sendJson(response, 400, { message: "Voucher id is required." });
        return true;
      }
      if (request.method === "PUT" || request.method === "PATCH") {
        await handleUpdate(request, response, voucherId);
        return true;
      }
      if (request.method === "DELETE") {
        await handleDelete(request, response, voucherId);
        return true;
      }
      if (request.method === "GET") {
        try {
          const vouchers = await readVouchers();
          const voucher = vouchers.find((entry) => entry.id === voucherId);
          if (!voucher) {
            sendJson(response, 404, { message: "Voucher not found." });
            return true;
          }
          sendJson(response, 200, { voucher: toPublicVoucher(voucher) });
        } catch (error) {
          sendJson(response, 500, {
            message:
              error instanceof Error ? error.message : "Unable to load voucher.",
          });
        }
        return true;
      }
      sendJson(response, 405, { message: "Method not allowed." });
      return true;
    }

    return false;
  }

  return {
    tryHandleVoucherRoutes,
    readVouchers,
  };
}

module.exports = {
  createVouchersApi,
};
