"use strict";

const path = require("path");
const crypto = require("crypto");
const fsPromises = require("fs/promises");

const DEAL_STATUSES = new Set(["draft", "upcoming", "live", "ended", "cancelled"]);
const APPROVAL_STATUSES = new Set(["draft", "pending", "approved", "rejected", "revision"]);
const MAX_DEAL_DURATION_MS = 72 * 60 * 60 * 1000;
const RESERVATION_HOLD_TTL_MS = 15 * 60 * 1000;
const RESERVATION_STATUSES = new Set([
  "held",
  "converted",
  "released",
  "expired",
]);

function createFlashDealsApi(deps = {}) {
  const {
    DATA_DIR,
    ensureStoragePaths,
    writeJsonFileAtomically,
    getExplicitRequestAdminId,
    normalizeAdminTenantId,
    isUsableProductAdminScope,
    requireSuperAdmin,
    getRequestAdminId,
    getRequestAccountIdentifier,
    enqueueSerializedMutation,
    readAccounts,
    findAdminAccountByScopeId,
    requireAdminRestrictionAllowed,
    persistSuperAdminNotification,
    createPersistentLinkedNotification,
    logActivitySafely,
    assignSellerAdminNotification,
    writeAccounts,
    notifySellerAdminInboxByAdminId,
    readProducts,
    isRecordInAdminScope,
    sendJson,
    parseRequestBody,
  } = deps;

  const FLASH_DEALS_FILE = path.join(DATA_DIR, "flash_deals.json");
  const FLASH_RESERVATIONS_FILE = path.join(DATA_DIR, "flash_reservations.json");
  const FLASH_MUTATION_QUEUE = "flash-deals";

  function nowIso() {
    return new Date().toISOString();
  }

  function normalizeTenantId(value, fallback = "") {
    if (typeof normalizeAdminTenantId === "function") {
      return normalizeAdminTenantId(value, fallback);
    }
    const normalized = String(value ?? "")
      .trim()
      .toLowerCase();
    return normalized || fallback;
  }

  function newDealId() {
    return `flash-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
  }

  function decodeJsonArray(raw) {
    let decoded = JSON.parse(raw);
    // Older writes accidentally double-stringified via writeJsonFileAtomically.
    if (typeof decoded === "string") {
      try {
        decoded = JSON.parse(decoded);
      } catch (_) {
        return [];
      }
    }
    return Array.isArray(decoded) ? decoded : [];
  }

  async function readFlashDeals() {
    if (typeof ensureStoragePaths === "function") {
      await ensureStoragePaths();
    }
    try {
      const raw = await fsPromises.readFile(FLASH_DEALS_FILE, "utf8");
      return decodeJsonArray(raw);
    } catch (error) {
      if (error && error.code === "ENOENT") {
        return [];
      }
      return [];
    }
  }

  async function writeFlashDeals(deals) {
    if (typeof ensureStoragePaths === "function") {
      await ensureStoragePaths();
    }
    const payload = Array.isArray(deals) ? deals : [];
    // writeJsonFileAtomically already JSON.stringifies — pass the array, not a string.
    if (typeof writeJsonFileAtomically === "function") {
      await writeJsonFileAtomically(FLASH_DEALS_FILE, payload);
      return;
    }
    await fsPromises.writeFile(
      FLASH_DEALS_FILE,
      `${JSON.stringify(payload, null, 2)}\n`,
      "utf8",
    );
  }

  async function readFlashReservations() {
    if (typeof ensureStoragePaths === "function") {
      await ensureStoragePaths();
    }
    try {
      const raw = await fsPromises.readFile(FLASH_RESERVATIONS_FILE, "utf8");
      return decodeJsonArray(raw);
    } catch (error) {
      if (error && error.code === "ENOENT") {
        return [];
      }
      return [];
    }
  }

  async function writeFlashReservations(reservations) {
    if (typeof ensureStoragePaths === "function") {
      await ensureStoragePaths();
    }
    const payload = Array.isArray(reservations) ? reservations : [];
    if (typeof writeJsonFileAtomically === "function") {
      await writeJsonFileAtomically(FLASH_RESERVATIONS_FILE, payload);
      return;
    }
    await fsPromises.writeFile(
      FLASH_RESERVATIONS_FILE,
      `${JSON.stringify(payload, null, 2)}\n`,
      "utf8",
    );
  }

  function runFlashMutation(task) {
    if (typeof enqueueSerializedMutation === "function") {
      return enqueueSerializedMutation(FLASH_MUTATION_QUEUE, task);
    }
    return task();
  }

  function newReservationId() {
    return `fres-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
  }

  function toPublicReservation(reservation) {
    return {
      id: reservation.id || "",
      dealId: reservation.dealId || "",
      productId: reservation.productId || "",
      variantId: reservation.variantId || "",
      accountId: reservation.accountId || "",
      quantity: Number(reservation.quantity) || 0,
      lockedUnitPrice: Number(reservation.lockedUnitPrice) || 0,
      status: reservation.status || "held",
      createdAt: reservation.createdAt || "",
      expiresAt: reservation.expiresAt || "",
      updatedAt: reservation.updatedAt || "",
      convertedAt: reservation.convertedAt || "",
    };
  }

  function resolveRequestAccountId(request, requestUrl) {
    if (typeof getRequestAccountIdentifier !== "function") {
      return "";
    }
    const identifier = getRequestAccountIdentifier(request, requestUrl);
    return String(identifier?.id || "").trim();
  }

  function accountHeldOrConvertedQty(reservations, dealId, accountId, excludeId = "") {
    const normalizedDealId = String(dealId || "").trim();
    const normalizedAccountId = String(accountId || "").trim().toLowerCase();
    const normalizedExclude = String(excludeId || "").trim();
    let total = 0;
    for (const entry of reservations) {
      if (!entry) continue;
      if (normalizedExclude && String(entry.id || "").trim() === normalizedExclude) {
        continue;
      }
      if (String(entry.dealId || "").trim() !== normalizedDealId) continue;
      if (
        String(entry.accountId || "")
          .trim()
          .toLowerCase() !== normalizedAccountId
      ) {
        continue;
      }
      const status = String(entry.status || "").trim().toLowerCase();
      if (status !== "held" && status !== "converted") continue;
      total += Math.max(0, Number(entry.quantity) || 0);
    }
    return total;
  }

  /**
   * Expire stale holds and keep dealStockReserved in sync.
   * Mutates deals/reservations arrays in place; caller persists.
   */
  function applyExpiredReservations(deals, reservations, nowMs = Date.now()) {
    let changed = false;
    const dealsById = new Map(
      deals.map((deal) => [String(deal?.id || "").trim(), deal]),
    );
    for (const reservation of reservations) {
      if (!reservation) continue;
      const status = String(reservation.status || "").trim().toLowerCase();
      if (status !== "held") continue;
      const expiresMs = Date.parse(String(reservation.expiresAt || ""));
      if (!Number.isFinite(expiresMs) || nowMs < expiresMs) continue;
      const qty = Math.max(0, Number(reservation.quantity) || 0);
      reservation.status = "expired";
      reservation.updatedAt = nowIso();
      changed = true;
      const deal = dealsById.get(String(reservation.dealId || "").trim());
      if (deal && qty > 0) {
        deal.dealStockReserved = Math.max(
          0,
          (Number(deal.dealStockReserved) || 0) - qty,
        );
        deal.updatedAt = nowIso();
      }
    }
    return changed;
  }

  function releaseHeldReservationsForDeal(deals, reservations, dealId) {
    const normalizedDealId = String(dealId || "").trim();
    if (!normalizedDealId) return false;
    let changed = false;
    for (const reservation of reservations) {
      if (!reservation) continue;
      if (String(reservation.dealId || "").trim() !== normalizedDealId) continue;
      if (String(reservation.status || "").trim().toLowerCase() !== "held") {
        continue;
      }
      reservation.status = "released";
      reservation.updatedAt = nowIso();
      changed = true;
    }
    const deal = deals.find(
      (entry) => String(entry?.id || "").trim() === normalizedDealId,
    );
    if (deal) {
      deal.dealStockReserved = 0;
      deal.updatedAt = nowIso();
      changed = true;
    }
    return changed;
  }

  function parseMoney(value) {
    const raw = String(value ?? "").trim();
    if (!raw) return null;
    const num = Number(raw);
    return Number.isFinite(num) ? num : null;
  }

  function parseNonNegInt(value) {
    const num = Number(String(value ?? "").trim());
    if (!Number.isFinite(num) || num < 0) return null;
    return Math.trunc(num);
  }

  function getProductOriginalPrice(product) {
    const original = parseMoney(product?.originalPrice);
    if (original !== null) return original;
    const fallback = parseMoney(product?.price);
    return fallback !== null ? fallback : 0;
  }

  function getProductSellableStock(product) {
    const stock = parseNonNegInt(
      product?.inventoryStock ?? product?.stock ?? 0,
    );
    return stock === null ? 0 : stock;
  }

  function dealRemaining(deal) {
    const limit = Number(deal?.dealStockLimit ?? 0) || 0;
    const sold = Number(deal?.dealStockSold ?? 0) || 0;
    const reserved = Number(deal?.dealStockReserved ?? 0) || 0;
    return Math.max(0, limit - sold - reserved);
  }

  function deriveDealStatus(deal, nowMs = Date.now()) {
    const stored = String(deal?.status || "").trim().toLowerCase();
    if (stored === "cancelled" || stored === "draft") {
      return stored;
    }
    const approval = String(deal?.approvalStatus || "").trim().toLowerCase();
    if (approval === "rejected") {
      return "cancelled";
    }
    if (approval === "pending" || approval === "revision") {
      const endMs = Date.parse(String(deal?.endsAt || ""));
      if (Number.isFinite(endMs) && nowMs >= endMs) {
        return "ended";
      }
      return "upcoming";
    }
    const startMs = Date.parse(String(deal?.startsAt || ""));
    const endMs = Date.parse(String(deal?.endsAt || ""));
    if (Number.isFinite(endMs) && nowMs >= endMs) {
      return "ended";
    }
    if (dealRemaining(deal) <= 0) {
      return "ended";
    }
    if (Number.isFinite(startMs) && nowMs < startMs) {
      return "upcoming";
    }
    if (approval === "approved") {
      return "live";
    }
    return stored && DEAL_STATUSES.has(stored) ? stored : "upcoming";
  }

  /** Card/modal label: pending | upcoming | live | ended | cancelled | rejected */
  function deriveDisplayStatus(deal, nowMs = Date.now()) {
    const stored = String(deal?.status || "").trim().toLowerCase();
    const approval = String(deal?.approvalStatus || "").trim().toLowerCase();
    if (stored === "cancelled") return "cancelled";
    if (approval === "rejected") return "rejected";
    if (approval === "pending" || approval === "revision") {
      const endMs = Date.parse(String(deal?.endsAt || ""));
      if (Number.isFinite(endMs) && nowMs >= endMs) return "ended";
      return "pending";
    }
    return deriveDealStatus(deal, nowMs);
  }

  function toPublicDeal(deal) {
    const status = deriveDealStatus(deal);
    const displayStatus = deriveDisplayStatus(deal);
    return {
      id: deal.id,
      productId: deal.productId || "",
      variantId: deal.variantId || "",
      sellerAdminId: deal.sellerAdminId || "",
      platformId: deal.platformId || "",
      flashPrice: Number(deal.flashPrice) || 0,
      originalPriceSnapshot: Number(deal.originalPriceSnapshot) || 0,
      dealStockLimit: Number(deal.dealStockLimit) || 0,
      dealStockSold: Number(deal.dealStockSold) || 0,
      dealStockReserved: Number(deal.dealStockReserved) || 0,
      dealStockRemaining: dealRemaining(deal),
      perBuyerLimit: Number(deal.perBuyerLimit) || 1,
      startsAt: deal.startsAt || "",
      endsAt: deal.endsAt || "",
      status,
      displayStatus,
      approvalStatus: deal.approvalStatus || "pending",
      notes: deal.notes || "",
      productName: deal.productName || "",
      createdAt: deal.createdAt || "",
      updatedAt: deal.updatedAt || "",
      createdBy: deal.createdBy || "",
      approvedBy: deal.approvedBy || "",
    };
  }

  function requireSellerAdminScope(request, response, requestUrl = null) {
    if (typeof getExplicitRequestAdminId !== "function") {
      sendJson(response, 503, {
        message: "Seller flash deal routes are unavailable.",
      });
      return "";
    }
    const adminId = normalizeTenantId(
      getExplicitRequestAdminId(request, requestUrl),
      "",
    );
    if (!adminId || !isUsableProductAdminScope(adminId)) {
      sendJson(response, 403, {
        message: "Logged-in seller scope is required to manage flash deals.",
      });
      return "";
    }
    return adminId;
  }

  function dealOwnedBySeller(deal, sellerAdminId) {
    const scopedSeller = normalizeTenantId(deal?.sellerAdminId || "", "");
    const wanted = normalizeTenantId(sellerAdminId || "", "");
    return Boolean(scopedSeller && wanted && scopedSeller === wanted);
  }

  function resolveSellerAccountLabel(account) {
    return (
      String(
        account?.storeName ||
          account?.companyName ||
          account?.businessName ||
          account?.displayName ||
          account?.name ||
          "",
      )
        .trim() || "Seller store"
    );
  }

  function isBlockingDeal(deal) {
    const status = deriveDealStatus(deal);
    const approval = String(deal?.approvalStatus || "").trim().toLowerCase();
    if (status === "cancelled" || status === "ended") return false;
    if (approval === "rejected") return false;
    return true;
  }

  async function notifyFlashDealSubmitted({ deal, sellerAdminId, request }) {
    const accounts =
      typeof readAccounts === "function" ? await readAccounts() : [];
    const account =
      typeof findAdminAccountByScopeId === "function"
        ? findAdminAccountByScopeId(accounts, sellerAdminId)
        : null;
    const storeName = resolveSellerAccountLabel(account);
    const productLabel =
      String(deal?.productName || deal?.productId || "listing").trim() ||
      "listing";

    if (
      typeof persistSuperAdminNotification === "function" &&
      typeof createPersistentLinkedNotification === "function"
    ) {
      await persistSuperAdminNotification(
        createPersistentLinkedNotification({
          type: "seller-flash-deal-submitted",
          audience: "super_admin",
          title: "Seller submitted a Flash Deal",
          reason: "Flash Deal pending review",
          message: `${storeName} submitted a Flash Deal for ${productLabel}.`,
          adminId: sellerAdminId,
          companyName: storeName,
          storeName,
          businessName: storeName,
          createdBy: storeName,
          productId: deal.productId || "",
          targetUrl: "/super_admin.html#flash-deals",
        }),
      );
    }

    if (
      typeof notifySellerAdminInboxByAdminId === "function" &&
      typeof createPersistentLinkedNotification === "function"
    ) {
      await notifySellerAdminInboxByAdminId(
        sellerAdminId,
        createPersistentLinkedNotification({
          type: "flash-deal-submitted",
          audience: "seller",
          title: "Flash Deal submitted",
          reason: "Awaiting Super Admin review",
          message: `Your Flash Deal for ${productLabel} was submitted and is pending review.`,
          adminId: sellerAdminId,
          productId: deal.productId || "",
          targetUrl: "/main.html#listing",
        }),
      );
    } else if (
      account &&
      typeof assignSellerAdminNotification === "function" &&
      typeof createPersistentLinkedNotification === "function" &&
      typeof writeAccounts === "function"
    ) {
      assignSellerAdminNotification(
        account,
        createPersistentLinkedNotification({
          type: "flash-deal-submitted",
          audience: "seller",
          title: "Flash Deal submitted",
          reason: "Awaiting Super Admin review",
          message: `Your Flash Deal for ${productLabel} was submitted and is pending review.`,
          adminId: sellerAdminId,
          productId: deal.productId || "",
          targetUrl: "/main.html#listing",
        }),
      );
      await writeAccounts(accounts);
    }

    if (typeof logActivitySafely === "function") {
      await logActivitySafely(
        {
          id: `activity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          type: "seller-admin-action",
          source: "seller_admin",
          adminId: sellerAdminId,
          action: "flash-deal-submitted",
          title: "Flash Deal submitted",
          description: `${storeName} submitted a Flash Deal for ${productLabel}.`,
          actor: {
            role: "seller-admin",
            accountId: sellerAdminId,
            displayName: storeName,
          },
          createdAt: nowIso(),
          skipLinkedNotification: true,
        },
        request,
      );
    }
  }

  function validateDealPayload(payload, { product, existing = null } = {}) {
    const flashPrice = parseMoney(payload?.flashPrice);
    const originalPrice = getProductOriginalPrice(product);
    const stockLimit = parseNonNegInt(payload?.dealStockLimit);
    const perBuyerLimit = parseNonNegInt(payload?.perBuyerLimit ?? 1) || 1;
    const sellable = getProductSellableStock(product);
    const startsAtRaw = String(payload?.startsAt || "").trim();
    const endsAtRaw = String(payload?.endsAt || "").trim();
    const startsAtMs = Date.parse(startsAtRaw);
    const endsAtMs = Date.parse(endsAtRaw);
    const notes = String(payload?.notes || "").trim().slice(0, 500);
    const variantId = String(payload?.variantId || "").trim();

    if (flashPrice === null || flashPrice < 0) {
      throw new Error("Flash price is required and must be 0 or greater.");
    }
    if (!(originalPrice > 0)) {
      throw new Error("Product original price is missing.");
    }
    if (!(flashPrice < originalPrice)) {
      throw new Error("Flash price must be lower than the original price.");
    }
    if (stockLimit === null || stockLimit < 1) {
      throw new Error("Deal stock limit must be at least 1.");
    }
    if (stockLimit > sellable) {
      throw new Error(
        `Deal stock limit cannot exceed current sellable stock (${sellable}).`,
      );
    }
    if (!Number.isFinite(startsAtMs) || !Number.isFinite(endsAtMs)) {
      throw new Error("Start and end date/time are required.");
    }
    if (endsAtMs <= startsAtMs) {
      throw new Error("End time must be after start time.");
    }
    if (endsAtMs - startsAtMs > MAX_DEAL_DURATION_MS) {
      throw new Error("Flash Deal duration cannot exceed 72 hours.");
    }
    if (!existing && startsAtMs < Date.now() - 60_000) {
      throw new Error("Start time cannot be in the past.");
    }
    if (perBuyerLimit < 1) {
      throw new Error("Per-buyer limit must be at least 1.");
    }

    return {
      flashPrice,
      originalPriceSnapshot: originalPrice,
      dealStockLimit: stockLimit,
      perBuyerLimit,
      startsAt: new Date(startsAtMs).toISOString(),
      endsAt: new Date(endsAtMs).toISOString(),
      notes,
      variantId,
      productName: String(product?.name || "").trim(),
      platformId: String(product?.platformId || product?.platform || "").trim(),
    };
  }

  async function findOwnedProduct(sellerAdminId, productId) {
    if (typeof readProducts !== "function") {
      throw new Error("Product catalog is unavailable.");
    }
    const products = await readProducts();
    const product = products.find(
      (entry) => String(entry?.id ?? "").trim() === String(productId || "").trim(),
    );
    if (!product) {
      throw new Error("Product not found.");
    }
    if (
      typeof isRecordInAdminScope === "function" &&
      !isRecordInAdminScope(product, sellerAdminId)
    ) {
      throw new Error("You can only create Flash Deals for your own listings.");
    }
    return product;
  }

  async function handleSellerList(request, response, requestUrl) {
    const sellerAdminId = requireSellerAdminScope(request, response, requestUrl);
    if (!sellerAdminId) return;
    try {
      const productId = String(requestUrl.searchParams.get("productId") || "").trim();
      const deals = await readFlashDeals();
      let scoped = deals.filter((entry) => dealOwnedBySeller(entry, sellerAdminId));
      if (productId) {
        scoped = scoped.filter(
          (entry) => String(entry.productId || "").trim() === productId,
        );
      }
      scoped.sort((a, b) =>
        String(b.updatedAt || b.createdAt || "").localeCompare(
          String(a.updatedAt || a.createdAt || ""),
        ),
      );
      sendJson(response, 200, {
        deals: scoped.map(toPublicDeal),
        total: scoped.length,
        sellerAdminId,
      });
    } catch (error) {
      sendJson(response, 500, {
        message:
          error instanceof Error ? error.message : "Unable to load flash deals.",
      });
    }
  }

  async function handleSellerGetForProduct(request, response, requestUrl, productId) {
    const sellerAdminId = requireSellerAdminScope(request, response, requestUrl);
    if (!sellerAdminId) return;
    try {
      const product = await findOwnedProduct(sellerAdminId, productId);
      const deals = await readFlashDeals();
      const forProduct = deals
        .filter(
          (entry) =>
            dealOwnedBySeller(entry, sellerAdminId) &&
            String(entry.productId || "").trim() === productId,
        )
        .sort((a, b) =>
          String(b.updatedAt || b.createdAt || "").localeCompare(
            String(a.updatedAt || a.createdAt || ""),
          ),
        );
      const active = forProduct.find(isBlockingDeal) || null;
      sendJson(response, 200, {
        product: {
          id: product.id,
          name: product.name || "",
          originalPrice: getProductOriginalPrice(product),
          sellableStock: getProductSellableStock(product),
          imageUrl:
            product.imageUrl ||
            product.thumbnailUrl ||
            (Array.isArray(product.images) ? product.images[0] : "") ||
            "",
        },
        deal: active ? toPublicDeal(active) : null,
        deals: forProduct.map(toPublicDeal),
      });
    } catch (error) {
      sendJson(response, 400, {
        message:
          error instanceof Error
            ? error.message
            : "Unable to load Flash Deal for product.",
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
      const productId = String(payload?.productId || "").trim();
      if (!productId) {
        throw new Error("Product id is required.");
      }
      const product = await findOwnedProduct(sellerAdminId, productId);
      const validated = validateDealPayload(payload, { product });
      const deals = await readFlashDeals();
      const conflict = deals.find(
        (entry) =>
          dealOwnedBySeller(entry, sellerAdminId) &&
          String(entry.productId || "").trim() === productId &&
          isBlockingDeal(entry),
      );
      if (conflict) {
        throw new Error(
          "This listing already has an active or pending Flash Deal. Edit or end it first.",
        );
      }
      const stamp = nowIso();
      const next = {
        id: newDealId(),
        productId,
        sellerAdminId,
        ...validated,
        dealStockSold: 0,
        dealStockReserved: 0,
        status: "upcoming",
        approvalStatus: "pending",
        createdAt: stamp,
        updatedAt: stamp,
        createdBy: sellerAdminId,
        approvedBy: "",
      };
      const persisted = [next, ...deals];
      await writeFlashDeals(persisted);
      await notifyFlashDealSubmitted({
        deal: next,
        sellerAdminId,
        request,
      });
      sendJson(response, 201, {
        deal: toPublicDeal(next),
        message: "Flash Deal submitted for review.",
      });
    } catch (error) {
      sendJson(response, 400, {
        message:
          error instanceof Error ? error.message : "Unable to create Flash Deal.",
      });
    }
  }

  async function handleSellerUpdate(request, response, requestUrl, dealId) {
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
      const deals = await readFlashDeals();
      const index = deals.findIndex(
        (entry) =>
          String(entry.id || "").trim() === dealId &&
          dealOwnedBySeller(entry, sellerAdminId),
      );
      if (index < 0) {
        sendJson(response, 404, { message: "Flash Deal not found." });
        return;
      }
      const existing = deals[index];
      const status = deriveDealStatus(existing);
      if (status === "live" || status === "ended" || status === "cancelled") {
        throw new Error("Only upcoming or pending Flash Deals can be edited.");
      }
      const product = await findOwnedProduct(sellerAdminId, existing.productId);
      const validated = validateDealPayload(payload, { product, existing });
      const stamp = nowIso();
      const next = {
        ...existing,
        ...validated,
        status: "upcoming",
        approvalStatus: "pending",
        updatedAt: stamp,
        approvedBy: "",
      };
      deals[index] = next;
      await writeFlashDeals(deals);
      await notifyFlashDealSubmitted({
        deal: next,
        sellerAdminId,
        request,
      });
      sendJson(response, 200, {
        deal: toPublicDeal(next),
        message: "Flash Deal updated and re-submitted for review.",
      });
    } catch (error) {
      sendJson(response, 400, {
        message:
          error instanceof Error ? error.message : "Unable to update Flash Deal.",
      });
    }
  }

  async function handleSellerCancel(request, response, requestUrl, dealId) {
    const sellerAdminId = requireSellerAdminScope(request, response, requestUrl);
    if (!sellerAdminId) return;
    try {
      const deals = await readFlashDeals();
      const index = deals.findIndex(
        (entry) =>
          String(entry.id || "").trim() === dealId &&
          dealOwnedBySeller(entry, sellerAdminId),
      );
      if (index < 0) {
        sendJson(response, 404, { message: "Flash Deal not found." });
        return;
      }
      const existing = deals[index];
      const status = deriveDealStatus(existing);
      if (status === "ended" || status === "cancelled") {
        sendJson(response, 200, {
          deal: toPublicDeal(existing),
          message: "Flash Deal already ended.",
        });
        return;
      }
      const next = {
        ...existing,
        status: "cancelled",
        approvalStatus:
          existing.approvalStatus === "pending"
            ? "rejected"
            : existing.approvalStatus,
        updatedAt: nowIso(),
        dealStockReserved: 0,
      };
      deals[index] = next;
      await writeFlashDeals(deals);

      if (
        typeof persistSuperAdminNotification === "function" &&
        typeof createPersistentLinkedNotification === "function"
      ) {
        const accounts =
          typeof readAccounts === "function" ? await readAccounts() : [];
        const account =
          typeof findAdminAccountByScopeId === "function"
            ? findAdminAccountByScopeId(accounts, sellerAdminId)
            : null;
        const storeName = resolveSellerAccountLabel(account);
        await persistSuperAdminNotification(
          createPersistentLinkedNotification({
            type: "seller-flash-deal-cancelled",
            audience: "super_admin",
            title: "Seller cancelled a Flash Deal",
            reason: "Flash Deal cancelled",
            message: `${storeName} cancelled a Flash Deal for ${
              existing.productName || existing.productId
            }.`,
            adminId: sellerAdminId,
            companyName: storeName,
            storeName,
            productId: existing.productId || "",
            targetUrl: "/super_admin.html#flash-deals",
          }),
        );
        if (typeof logActivitySafely === "function") {
          await logActivitySafely(
            {
              id: `activity-${Date.now()}-${Math.random()
                .toString(36)
                .slice(2, 8)}`,
              type: "seller-admin-action",
              source: "seller_admin",
              adminId: sellerAdminId,
              action: "flash-deal-cancelled",
              title: "Flash Deal cancelled",
              description: `${storeName} cancelled Flash Deal ${existing.id}.`,
              actor: {
                role: "seller-admin",
                accountId: sellerAdminId,
                displayName: storeName,
              },
              createdAt: nowIso(),
              skipLinkedNotification: true,
            },
            request,
          );
        }
      }

      sendJson(response, 200, {
        deal: toPublicDeal(next),
        message: "Flash Deal cancelled.",
      });
    } catch (error) {
      sendJson(response, 400, {
        message:
          error instanceof Error ? error.message : "Unable to cancel Flash Deal.",
      });
    }
  }

  async function handleSellerEndNow(request, response, requestUrl, dealId) {
    const sellerAdminId = requireSellerAdminScope(request, response, requestUrl);
    if (!sellerAdminId) return;
    try {
      const result = await runFlashMutation(async () => {
        const [deals, reservations] = await Promise.all([
          readFlashDeals(),
          readFlashReservations(),
        ]);
        const index = deals.findIndex(
          (entry) =>
            String(entry.id || "").trim() === dealId &&
            dealOwnedBySeller(entry, sellerAdminId),
        );
        if (index < 0) {
          const error = new Error("Flash Deal not found.");
          error.statusCode = 404;
          throw error;
        }
        const existing = deals[index];
        const status = deriveDealStatus(existing);
        if (status === "ended" || status === "cancelled") {
          return { deal: existing, alreadyEnded: true };
        }
        if (status !== "live" && status !== "upcoming") {
          const error = new Error("Only upcoming or live Flash Deals can be ended now.");
          error.statusCode = 400;
          throw error;
        }
        const next = {
          ...existing,
          status: "ended",
          endsAt: nowIso(),
          updatedAt: nowIso(),
          dealStockReserved: 0,
        };
        releaseHeldReservationsForDeal(deals, reservations, next.id);
        deals[index] = next;
        await Promise.all([
          writeFlashDeals(deals),
          writeFlashReservations(reservations),
        ]);
        return { deal: next, alreadyEnded: false };
      });

      const deal = result.deal;
      if (!result.alreadyEnded) {
        try {
          await notifySellerDealLifecycle({
            deal,
            nextStatus: "ended",
            sellerAdminId,
          });
        } catch (_) {
          // Keep end durable even if inbox notify fails.
        }
        if (
          typeof persistSuperAdminNotification === "function" &&
          typeof createPersistentLinkedNotification === "function"
        ) {
          const accounts =
            typeof readAccounts === "function" ? await readAccounts() : [];
          const account =
            typeof findAdminAccountByScopeId === "function"
              ? findAdminAccountByScopeId(accounts, sellerAdminId)
              : null;
          const storeName = resolveSellerAccountLabel(account);
          await persistSuperAdminNotification(
            createPersistentLinkedNotification({
              type: "seller-flash-deal-ended",
              audience: "super_admin",
              title: "Seller ended a Flash Deal",
              reason: "Flash Deal ended early",
              message: `${storeName} ended Flash Deal for ${
                deal.productName || deal.productId
              }.`,
              adminId: sellerAdminId,
              companyName: storeName,
              storeName,
              productId: deal.productId || "",
              targetUrl: "/super_admin.html#flash-deals",
            }),
          );
        }
      }

      sendJson(response, 200, {
        deal: toPublicDeal(deal),
        message: result.alreadyEnded
          ? "Flash Deal already ended."
          : "Flash Deal ended.",
      });
    } catch (error) {
      sendJson(response, error?.statusCode || 400, {
        message:
          error instanceof Error ? error.message : "Unable to end Flash Deal.",
      });
    }
  }

  async function notifySellerDealDecision({
    deal,
    decision,
    sellerAdminId,
  }) {
    if (
      typeof notifySellerAdminInboxByAdminId !== "function" ||
      typeof createPersistentLinkedNotification !== "function"
    ) {
      return;
    }
    const productLabel =
      String(deal?.productName || deal?.productId || "listing").trim() ||
      "listing";
    const approved = decision === "approved";
    await notifySellerAdminInboxByAdminId(
      sellerAdminId,
      createPersistentLinkedNotification({
        type: approved ? "flash-deal-approved" : "flash-deal-rejected",
        audience: "seller",
        title: approved ? "Flash Deal approved" : "Flash Deal rejected",
        reason: approved ? "Ready to go live on schedule" : "Flash Deal rejected",
        message: approved
          ? `Your Flash Deal for ${productLabel} was approved.`
          : `Your Flash Deal for ${productLabel} was rejected by Super Admin.`,
        adminId: sellerAdminId,
        productId: deal.productId || "",
        targetUrl: "/main.html#listing",
      }),
    );
  }

  async function notifySellerDealLifecycle({ deal, nextStatus, sellerAdminId }) {
    if (
      typeof notifySellerAdminInboxByAdminId !== "function" ||
      typeof createPersistentLinkedNotification !== "function"
    ) {
      return;
    }
    if (nextStatus !== "live" && nextStatus !== "ended") {
      return;
    }
    const productLabel =
      String(deal?.productName || deal?.productId || "listing").trim() ||
      "listing";
    const isLive = nextStatus === "live";
    await notifySellerAdminInboxByAdminId(
      sellerAdminId,
      createPersistentLinkedNotification({
        type: isLive ? "flash-deal-live" : "flash-deal-ended",
        audience: "seller",
        title: isLive ? "Flash Deal is live" : "Flash Deal ended",
        reason: isLive ? "Deal window started" : "Deal window ended",
        message: isLive
          ? `Flash Deal for ${productLabel} is now live.`
          : `Flash Deal for ${productLabel} has ended. Listing is back to normal price.`,
        adminId: sellerAdminId,
        productId: deal.productId || "",
        targetUrl: "/main.html#listing",
      }),
    );
  }

  /**
   * Persist upcoming → live → ended transitions. Idempotent.
   * Releases reservations when a deal ends. Expires stale holds.
   */
  async function tickFlashDealLifecycle() {
    return runFlashMutation(async () => {
      const [deals, reservations] = await Promise.all([
        readFlashDeals(),
        readFlashReservations(),
      ]);
      if (!deals.length && !reservations.length) {
        return { checked: 0, changed: 0, activated: 0, ended: 0, expiredHolds: 0 };
      }
      const nowMs = Date.now();
      let changed = 0;
      let activated = 0;
      let ended = 0;
      let expiredHolds = 0;
      const transitions = [];
      const reservationsBefore = JSON.stringify(reservations);
      applyExpiredReservations(deals, reservations, nowMs);
      if (JSON.stringify(reservations) !== reservationsBefore) {
        expiredHolds = 1;
        changed += 1;
      }

      const nextDeals = deals.map((deal) => {
        const previous = String(deal?.status || "").trim().toLowerCase();
        if (previous === "cancelled") {
          return deal;
        }
        const desired = deriveDealStatus(deal, nowMs);
        if (desired === previous) {
          return deal;
        }
        changed += 1;
        if (desired === "live") activated += 1;
        if (desired === "ended") ended += 1;
        const updated = {
          ...deal,
          status: desired,
          updatedAt: nowIso(),
        };
        if (desired === "ended" || desired === "cancelled") {
          releaseHeldReservationsForDeal(
            [updated],
            reservations,
            updated.id,
          );
          updated.dealStockReserved = 0;
        }
        transitions.push({
          previous,
          nextStatus: desired,
          deal: updated,
        });
        return updated;
      });

      if (changed > 0 || expiredHolds > 0) {
        await Promise.all([
          writeFlashDeals(nextDeals),
          writeFlashReservations(reservations),
        ]);
        for (const transition of transitions) {
          try {
            await notifySellerDealLifecycle({
              deal: transition.deal,
              nextStatus: transition.nextStatus,
              sellerAdminId: transition.deal.sellerAdminId,
            });
          } catch (_) {
            // Keep lifecycle durable even if inbox notify fails.
          }
        }
      }
      return {
        checked: deals.length,
        changed,
        activated,
        ended,
        expiredHolds,
      };
    });
  }

  async function createReservationForDeal({
    dealId,
    accountId,
    quantity,
    variantId = "",
    replaceReservationId = "",
  }) {
    const normalizedDealId = String(dealId || "").trim();
    const normalizedAccountId = String(accountId || "").trim();
    const qty = parseNonNegInt(quantity);
    const normalizedVariantId = String(variantId || "").trim();
    const normalizedReplaceId = String(replaceReservationId || "").trim();

    if (!normalizedDealId) {
      const error = new Error("Flash Deal id is required.");
      error.statusCode = 400;
      throw error;
    }
    if (!normalizedAccountId) {
      const error = new Error("Sign in to lock a Flash Deal price.");
      error.statusCode = 401;
      throw error;
    }
    if (qty === null || qty < 1) {
      const error = new Error("Quantity must be at least 1.");
      error.statusCode = 400;
      throw error;
    }

    return runFlashMutation(async () => {
      const [deals, reservations] = await Promise.all([
        readFlashDeals(),
        readFlashReservations(),
      ]);
      const nowMs = Date.now();
      applyExpiredReservations(deals, reservations, nowMs);

      const index = deals.findIndex(
        (entry) => String(entry.id || "").trim() === normalizedDealId,
      );
      if (index < 0) {
        const error = new Error("Flash Deal not found.");
        error.statusCode = 404;
        throw error;
      }

      let deal = deals[index];
      let releasedQty = 0;

      if (normalizedReplaceId) {
        const existing = reservations.find(
          (entry) => String(entry?.id || "").trim() === normalizedReplaceId,
        );
        if (
          existing &&
          String(existing.status || "").trim().toLowerCase() === "held" &&
          String(existing.accountId || "").trim() === normalizedAccountId &&
          String(existing.dealId || "").trim() === normalizedDealId
        ) {
          releasedQty = Math.max(0, Number(existing.quantity) || 0);
          existing.status = "released";
          existing.updatedAt = nowIso();
          deal = {
            ...deal,
            dealStockReserved: Math.max(
              0,
              (Number(deal.dealStockReserved) || 0) - releasedQty,
            ),
          };
          deals[index] = deal;
        }
      }

      const publicDeal = toPublicDeal(deal);
      if (publicDeal.status !== "live") {
        const error = new Error("Flash Deal is not live.");
        error.statusCode = 409;
        throw error;
      }
      if (dealRemaining(deal) < qty) {
        const error = new Error("Flash Deal sold out.");
        error.statusCode = 409;
        throw error;
      }

      const dealVariantId = String(deal.variantId || "").trim();
      if (dealVariantId && normalizedVariantId && dealVariantId !== normalizedVariantId) {
        const error = new Error("Selected variant is not on this Flash Deal.");
        error.statusCode = 400;
        throw error;
      }

      const perBuyerLimit = Math.max(1, Number(deal.perBuyerLimit) || 1);
      const alreadyUsed = accountHeldOrConvertedQty(
        reservations,
        normalizedDealId,
        normalizedAccountId,
      );
      if (alreadyUsed + qty > perBuyerLimit) {
        const error = new Error(
          `Limit is ${perBuyerLimit} per buyer for this Flash Deal.`,
        );
        error.statusCode = 409;
        throw error;
      }

      const products =
        typeof readProducts === "function" ? await readProducts() : [];
      const product = Array.isArray(products)
        ? products.find(
            (entry) =>
              String(entry?.id || "").trim() === String(deal.productId || "").trim(),
          )
        : null;
      if (product) {
        const sellable = getProductSellableStock(product);
        if (sellable < qty) {
          const error = new Error("Not enough inventory for this Flash Deal.");
          error.statusCode = 409;
          throw error;
        }
      }

      const stamp = nowIso();
      const expiresAt = new Date(nowMs + RESERVATION_HOLD_TTL_MS).toISOString();
      const reservation = {
        id: newReservationId(),
        dealId: normalizedDealId,
        productId: String(deal.productId || "").trim(),
        variantId: normalizedVariantId || dealVariantId,
        accountId: normalizedAccountId,
        quantity: qty,
        lockedUnitPrice: Number(deal.flashPrice) || 0,
        status: "held",
        createdAt: stamp,
        expiresAt,
        updatedAt: stamp,
        convertedAt: "",
      };

      deal = {
        ...deal,
        dealStockReserved: (Number(deal.dealStockReserved) || 0) + qty,
        updatedAt: stamp,
      };
      deals[index] = deal;
      reservations.push(reservation);

      await Promise.all([
        writeFlashDeals(deals),
        writeFlashReservations(reservations),
      ]);

      return {
        reservation: toPublicReservation(reservation),
        deal: toPublicDeal(deal),
      };
    });
  }

  async function mutateReservationStatus({
    reservationId,
    accountId,
    action,
  }) {
    const normalizedId = String(reservationId || "").trim();
    const normalizedAccountId = String(accountId || "").trim();
    if (!normalizedId) {
      const error = new Error("Reservation id is required.");
      error.statusCode = 400;
      throw error;
    }
    if (!normalizedAccountId) {
      const error = new Error("Sign in required.");
      error.statusCode = 401;
      throw error;
    }

    return runFlashMutation(async () => {
      const [deals, reservations] = await Promise.all([
        readFlashDeals(),
        readFlashReservations(),
      ]);
      applyExpiredReservations(deals, reservations, Date.now());

      const reservation = reservations.find(
        (entry) => String(entry?.id || "").trim() === normalizedId,
      );
      if (!reservation) {
        const error = new Error("Reservation not found.");
        error.statusCode = 404;
        throw error;
      }
      if (String(reservation.accountId || "").trim() !== normalizedAccountId) {
        const error = new Error("Reservation does not belong to this account.");
        error.statusCode = 403;
        throw error;
      }

      const status = String(reservation.status || "").trim().toLowerCase();
      const dealIndex = deals.findIndex(
        (entry) =>
          String(entry?.id || "").trim() === String(reservation.dealId || "").trim(),
      );
      const deal = dealIndex >= 0 ? deals[dealIndex] : null;
      const stamp = nowIso();

      if (action === "release") {
        if (status === "held") {
          const qty = Math.max(0, Number(reservation.quantity) || 0);
          reservation.status = "released";
          reservation.updatedAt = stamp;
          if (deal && qty > 0) {
            deals[dealIndex] = {
              ...deal,
              dealStockReserved: Math.max(
                0,
                (Number(deal.dealStockReserved) || 0) - qty,
              ),
              updatedAt: stamp,
            };
          }
          await Promise.all([
            writeFlashDeals(deals),
            writeFlashReservations(reservations),
          ]);
        }
        return {
          reservation: toPublicReservation(reservation),
          deal: deal ? toPublicDeal(deals[dealIndex] || deal) : null,
        };
      }

      if (action === "extend") {
        if (status !== "held") {
          const error = new Error("Only held reservations can be extended.");
          error.statusCode = 409;
          throw error;
        }
        if (!deal || deriveDealStatus(deal) !== "live") {
          const error = new Error("Flash Deal is no longer live.");
          error.statusCode = 409;
          throw error;
        }
        reservation.expiresAt = new Date(
          Date.now() + RESERVATION_HOLD_TTL_MS,
        ).toISOString();
        reservation.updatedAt = stamp;
        await writeFlashReservations(reservations);
        return {
          reservation: toPublicReservation(reservation),
          deal: toPublicDeal(deal),
        };
      }

      const error = new Error("Unsupported reservation action.");
      error.statusCode = 400;
      throw error;
    });
  }

  async function convertReservationsForAccount({
    reservationIds,
    accountId,
  }) {
    const normalizedAccountId = String(accountId || "").trim();
    const ids = (Array.isArray(reservationIds) ? reservationIds : [])
      .map((value) => String(value || "").trim())
      .filter(Boolean);
    if (!normalizedAccountId) {
      const error = new Error("Sign in required.");
      error.statusCode = 401;
      throw error;
    }
    if (!ids.length) {
      return { converted: [], deals: [] };
    }

    return runFlashMutation(async () => {
      const [deals, reservations] = await Promise.all([
        readFlashDeals(),
        readFlashReservations(),
      ]);
      applyExpiredReservations(deals, reservations, Date.now());

      const converted = [];
      const touchedDealIds = new Set();
      const stamp = nowIso();

      for (const reservationId of ids) {
        const reservation = reservations.find(
          (entry) => String(entry?.id || "").trim() === reservationId,
        );
        if (!reservation) {
          const error = new Error(`Reservation ${reservationId} not found.`);
          error.statusCode = 404;
          throw error;
        }
        if (String(reservation.accountId || "").trim() !== normalizedAccountId) {
          const error = new Error("Reservation does not belong to this account.");
          error.statusCode = 403;
          throw error;
        }
        const status = String(reservation.status || "").trim().toLowerCase();
        if (status === "converted") {
          converted.push(toPublicReservation(reservation));
          continue;
        }
        if (status !== "held") {
          const error = new Error(
            "Flash Deal hold expired. Refresh cart and try again.",
          );
          error.statusCode = 409;
          throw error;
        }

        const dealIndex = deals.findIndex(
          (entry) =>
            String(entry?.id || "").trim() ===
            String(reservation.dealId || "").trim(),
        );
        if (dealIndex < 0) {
          const error = new Error("Flash Deal not found for reservation.");
          error.statusCode = 404;
          throw error;
        }
        const deal = deals[dealIndex];
        const qty = Math.max(0, Number(reservation.quantity) || 0);
        const locked = Number(reservation.lockedUnitPrice) || 0;
        const flashPrice = Number(deal.flashPrice) || 0;
        if (Math.abs(locked - flashPrice) > 0.009) {
          // Allow checkout at locked price even if seller cannot change live price;
          // still convert against reserved pool.
        }

        deals[dealIndex] = {
          ...deal,
          dealStockReserved: Math.max(
            0,
            (Number(deal.dealStockReserved) || 0) - qty,
          ),
          dealStockSold: (Number(deal.dealStockSold) || 0) + qty,
          updatedAt: stamp,
          status: deriveDealStatus({
            ...deal,
            dealStockReserved: Math.max(
              0,
              (Number(deal.dealStockReserved) || 0) - qty,
            ),
            dealStockSold: (Number(deal.dealStockSold) || 0) + qty,
          }),
        };
        reservation.status = "converted";
        reservation.convertedAt = stamp;
        reservation.updatedAt = stamp;
        touchedDealIds.add(String(deal.id || "").trim());
        converted.push(toPublicReservation(reservation));
      }

      await Promise.all([
        writeFlashDeals(deals),
        writeFlashReservations(reservations),
      ]);

      return {
        converted,
        deals: [...touchedDealIds]
          .map((id) => deals.find((entry) => String(entry?.id || "").trim() === id))
          .filter(Boolean)
          .map(toPublicDeal),
      };
    });
  }

  /**
   * Convert flash holds referenced on newly placed order lines.
   * Idempotent for already-converted reservation ids.
   */
  async function convertReservationsFromOrders(orders) {
    const entries = Array.isArray(orders) ? orders : [];
    const byAccount = new Map();
    for (const order of entries) {
      const reservationId = String(
        order?.flashReservationId || order?.reservationId || "",
      ).trim();
      if (!reservationId) continue;
      const accountId = String(order?.accountId || "").trim();
      if (!accountId) continue;
      if (!byAccount.has(accountId)) {
        byAccount.set(accountId, new Set());
      }
      byAccount.get(accountId).add(reservationId);
    }
    const results = [];
    for (const [accountId, idSet] of byAccount.entries()) {
      const converted = await convertReservationsForAccount({
        accountId,
        reservationIds: [...idSet],
      });
      results.push(converted);
    }
    return results;
  }

  async function handleReserveRequest(request, response, requestUrl, dealId) {
    try {
      const accountId = resolveRequestAccountId(request, requestUrl);
      const payload = await parseRequestBody(request);
      const result = await createReservationForDeal({
        dealId,
        accountId,
        quantity: payload?.quantity ?? 1,
        variantId: payload?.variantId || "",
        replaceReservationId:
          payload?.replaceReservationId || payload?.previousReservationId || "",
      });
      sendJson(response, 200, {
        ...result,
        message: "Flash Deal price locked.",
        holdTtlMs: RESERVATION_HOLD_TTL_MS,
      });
    } catch (error) {
      sendJson(response, error?.statusCode || 400, {
        message:
          error instanceof Error
            ? error.message
            : "Unable to reserve Flash Deal stock.",
      });
    }
  }

  async function handleReservationActionRequest(
    request,
    response,
    requestUrl,
    reservationId,
    action,
  ) {
    try {
      const accountId = resolveRequestAccountId(request, requestUrl);
      const result = await mutateReservationStatus({
        reservationId,
        accountId,
        action,
      });
      sendJson(response, 200, {
        ...result,
        message:
          action === "extend"
            ? "Flash Deal hold extended."
            : "Flash Deal hold released.",
      });
    } catch (error) {
      sendJson(response, error?.statusCode || 400, {
        message:
          error instanceof Error
            ? error.message
            : "Unable to update Flash Deal reservation.",
      });
    }
  }

  async function handleConvertRequest(request, response, requestUrl) {
    try {
      const accountId = resolveRequestAccountId(request, requestUrl);
      const payload = await parseRequestBody(request);
      const reservationIds = Array.isArray(payload?.reservationIds)
        ? payload.reservationIds
        : payload?.reservationId
          ? [payload.reservationId]
          : [];
      const result = await convertReservationsForAccount({
        accountId,
        reservationIds,
      });
      sendJson(response, 200, {
        ...result,
        message: "Flash Deal reservations converted.",
      });
    } catch (error) {
      sendJson(response, error?.statusCode || 400, {
        message:
          error instanceof Error
            ? error.message
            : "Unable to convert Flash Deal reservations.",
      });
    }
  }

  async function handleSuperAdminList(request, response) {
    if (typeof requireSuperAdmin === "function" && !requireSuperAdmin(request, response)) {
      return;
    }
    try {
      await tickFlashDealLifecycle();
      const deals = await readFlashDeals();
      const sorted = [...deals].sort((a, b) =>
        String(b.updatedAt || b.createdAt || "").localeCompare(
          String(a.updatedAt || a.createdAt || ""),
        ),
      );
      sendJson(response, 200, {
        deals: sorted.map(toPublicDeal),
        total: sorted.length,
      });
    } catch (error) {
      sendJson(response, 500, {
        message:
          error instanceof Error ? error.message : "Unable to load flash deals.",
      });
    }
  }

  async function handleSuperAdminDecision(
    request,
    response,
    dealId,
    decision,
  ) {
    if (typeof requireSuperAdmin === "function" && !requireSuperAdmin(request, response)) {
      return;
    }
    try {
      const deals = await readFlashDeals();
      const index = deals.findIndex(
        (entry) => String(entry.id || "").trim() === dealId,
      );
      if (index < 0) {
        sendJson(response, 404, { message: "Flash Deal not found." });
        return;
      }
      const existing = deals[index];
      const approval = String(existing.approvalStatus || "").trim().toLowerCase();
      if (approval !== "pending" && approval !== "revision") {
        sendJson(response, 400, {
          message: "Only pending Flash Deals can be approved or rejected.",
        });
        return;
      }
      const reviewerId =
        typeof getRequestAdminId === "function"
          ? String(getRequestAdminId(request, null, "") || "").trim()
          : "";
      const stamp = nowIso();
      let next;
      if (decision === "approved") {
        next = {
          ...existing,
          approvalStatus: "approved",
          approvedBy: reviewerId,
          updatedAt: stamp,
        };
        next.status = deriveDealStatus(next);
      } else {
        next = {
          ...existing,
          approvalStatus: "rejected",
          status: "cancelled",
          approvedBy: reviewerId,
          updatedAt: stamp,
          dealStockReserved: 0,
        };
      }
      deals[index] = next;
      await writeFlashDeals(deals);
      await notifySellerDealDecision({
        deal: next,
        decision,
        sellerAdminId: next.sellerAdminId,
      });
      if (typeof logActivitySafely === "function") {
        await logActivitySafely(
          {
            id: `activity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            type: "super-admin-action",
            source: "super_admin",
            adminId: next.sellerAdminId,
            action:
              decision === "approved"
                ? "flash-deal-approved"
                : "flash-deal-rejected",
            title:
              decision === "approved"
                ? "Flash Deal approved"
                : "Flash Deal rejected",
            description: `Super Admin ${decision} Flash Deal ${next.id}.`,
            actor: {
              role: "super-admin",
              accountId: reviewerId,
              displayName: "Super Admin",
            },
            createdAt: stamp,
            skipLinkedNotification: true,
          },
          request,
        );
      }
      sendJson(response, 200, {
        deal: toPublicDeal(next),
        message:
          decision === "approved"
            ? "Flash Deal approved."
            : "Flash Deal rejected.",
      });
    } catch (error) {
      sendJson(response, 400, {
        message:
          error instanceof Error
            ? error.message
            : "Unable to update Flash Deal approval.",
      });
    }
  }

  async function tryHandleFlashDealRoutes(request, response, requestUrl) {
    const pathname = requestUrl.pathname;

    if (pathname === "/api/flash-deals") {
      if (request.method === "GET") {
        try {
          await tickFlashDealLifecycle();
          const statusFilter = String(
            requestUrl.searchParams.get("status") || "live",
          )
            .trim()
            .toLowerCase();
          const platformFilter = String(
            requestUrl.searchParams.get("platformId") || "",
          )
            .trim()
            .toLowerCase();
          const deals = await readFlashDeals();
          const nowMs = Date.now();
          const live = deals
            .map((deal) => {
              const publicDeal = toPublicDeal(deal);
              return { deal, publicDeal };
            })
            .filter(({ deal, publicDeal }) => {
              if (String(deal.approvalStatus || "").toLowerCase() !== "approved") {
                return false;
              }
              if (statusFilter && statusFilter !== "all") {
                if (publicDeal.status !== statusFilter) {
                  return false;
                }
              }
              if (platformFilter) {
                const dealPlatform = String(deal.platformId || "")
                  .trim()
                  .toLowerCase();
                if (dealPlatform && dealPlatform !== platformFilter) {
                  return false;
                }
              }
              if (publicDeal.status === "live" && publicDeal.dealStockRemaining <= 0) {
                return false;
              }
              return true;
            })
            .sort((a, b) => {
              const aPct =
                a.publicDeal.originalPriceSnapshot > 0
                  ? (a.publicDeal.originalPriceSnapshot - a.publicDeal.flashPrice) /
                    a.publicDeal.originalPriceSnapshot
                  : 0;
              const bPct =
                b.publicDeal.originalPriceSnapshot > 0
                  ? (b.publicDeal.originalPriceSnapshot - b.publicDeal.flashPrice) /
                    b.publicDeal.originalPriceSnapshot
                  : 0;
              if (bPct !== aPct) return bPct - aPct;
              return String(a.publicDeal.endsAt).localeCompare(
                String(b.publicDeal.endsAt),
              );
            })
            .map(({ publicDeal }) => ({
              ...publicDeal,
              serverNow: new Date(nowMs).toISOString(),
            }));
          sendJson(response, 200, {
            deals: live,
            total: live.length,
            serverNow: new Date(nowMs).toISOString(),
          });
        } catch (error) {
          sendJson(response, 500, {
            message:
              error instanceof Error
                ? error.message
                : "Unable to load flash deals.",
          });
        }
        return true;
      }
      sendJson(response, 405, { message: "Method not allowed." });
      return true;
    }

    if (pathname === "/api/flash-deals/reservations/convert") {
      if (request.method === "POST") {
        await handleConvertRequest(request, response, requestUrl);
        return true;
      }
      sendJson(response, 405, { message: "Method not allowed." });
      return true;
    }

    const reservationActionMatch = pathname.match(
      /^\/api\/flash-deals\/reservations\/([^/]+)\/(release|extend)$/,
    );
    if (reservationActionMatch) {
      const reservationId = decodeURIComponent(
        reservationActionMatch[1] || "",
      ).trim();
      const action = reservationActionMatch[2];
      if (!reservationId) {
        sendJson(response, 400, { message: "Reservation id is required." });
        return true;
      }
      if (request.method === "POST") {
        await handleReservationActionRequest(
          request,
          response,
          requestUrl,
          reservationId,
          action,
        );
        return true;
      }
      sendJson(response, 405, { message: "Method not allowed." });
      return true;
    }

    const reserveMatch = pathname.match(
      /^\/api\/flash-deals\/([^/]+)\/reserve$/,
    );
    if (reserveMatch) {
      const dealId = decodeURIComponent(reserveMatch[1] || "").trim();
      if (!dealId) {
        sendJson(response, 400, { message: "Flash Deal id is required." });
        return true;
      }
      if (request.method === "POST") {
        await handleReserveRequest(request, response, requestUrl, dealId);
        return true;
      }
      sendJson(response, 405, { message: "Method not allowed." });
      return true;
    }

    if (pathname === "/api/super-admin/flash-deals") {
      if (request.method === "GET") {
        await handleSuperAdminList(request, response);
        return true;
      }
      sendJson(response, 405, { message: "Method not allowed." });
      return true;
    }

    const saDecisionMatch = pathname.match(
      /^\/api\/super-admin\/flash-deals\/([^/]+)\/(approve|reject)$/,
    );
    if (saDecisionMatch) {
      const dealId = decodeURIComponent(saDecisionMatch[1] || "").trim();
      const decision =
        saDecisionMatch[2] === "approve" ? "approved" : "rejected";
      if (!dealId) {
        sendJson(response, 400, { message: "Flash Deal id is required." });
        return true;
      }
      if (request.method === "POST") {
        await handleSuperAdminDecision(request, response, dealId, decision);
        return true;
      }
      sendJson(response, 405, { message: "Method not allowed." });
      return true;
    }

    if (pathname === "/api/admin/flash-deals") {
      if (request.method === "GET") {
        await tickFlashDealLifecycle();
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

    const forProductMatch = pathname.match(
      /^\/api\/admin\/flash-deals\/for-product\/([^/]+)$/,
    );
    if (forProductMatch) {
      const productId = decodeURIComponent(forProductMatch[1] || "").trim();
      if (!productId) {
        sendJson(response, 400, { message: "Product id is required." });
        return true;
      }
      if (request.method === "GET") {
        await tickFlashDealLifecycle();
        await handleSellerGetForProduct(
          request,
          response,
          requestUrl,
          productId,
        );
        return true;
      }
      sendJson(response, 405, { message: "Method not allowed." });
      return true;
    }

    const endNowMatch = pathname.match(
      /^\/api\/admin\/flash-deals\/([^/]+)\/end$/,
    );
    if (endNowMatch) {
      const dealId = decodeURIComponent(endNowMatch[1] || "").trim();
      if (!dealId) {
        sendJson(response, 400, { message: "Flash Deal id is required." });
        return true;
      }
      if (request.method === "POST") {
        await handleSellerEndNow(request, response, requestUrl, dealId);
        return true;
      }
      sendJson(response, 405, { message: "Method not allowed." });
      return true;
    }

    const itemMatch = pathname.match(/^\/api\/admin\/flash-deals\/([^/]+)$/);
    if (itemMatch) {
      const dealId = decodeURIComponent(itemMatch[1] || "").trim();
      if (!dealId) {
        sendJson(response, 400, { message: "Flash Deal id is required." });
        return true;
      }
      if (request.method === "PUT") {
        await handleSellerUpdate(request, response, requestUrl, dealId);
        return true;
      }
      if (request.method === "DELETE") {
        await handleSellerCancel(request, response, requestUrl, dealId);
        return true;
      }
      sendJson(response, 405, { message: "Method not allowed." });
      return true;
    }

    return false;
  }

  return {
    tryHandleFlashDealRoutes,
    readFlashDeals,
    toPublicDeal,
    deriveDealStatus,
    deriveDisplayStatus,
    tickFlashDealLifecycle,
    convertReservationsFromOrders,
    convertReservationsForAccount,
    createReservationForDeal,
  };
}

module.exports = {
  createFlashDealsApi,
};
