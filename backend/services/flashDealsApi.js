"use strict";

const path = require("path");
const crypto = require("crypto");
const fsPromises = require("fs/promises");
const flashDealPricing = require("./flashDealPricing");

const DEAL_STATUSES = new Set(["draft", "upcoming", "live", "ended", "cancelled"]);
const APPROVAL_STATUSES = new Set(["draft", "pending", "approved", "rejected", "revision"]);
const MAX_DEAL_DURATION_MS = 72 * 60 * 60 * 1000;
const CAMPAIGN_NOT_TARGETED_MESSAGE =
  "This Flash Sale is only open to other platforms or business types.";
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
    readApprovedProductTrainingRecords,
    isRecordInAdminScope,
    readStoreTypeDetails,
    sendJson,
    parseRequestBody,
  } = deps;

  const FLASH_DEALS_FILE = path.join(DATA_DIR, "flash_deals.json");
  const FLASH_RESERVATIONS_FILE = path.join(DATA_DIR, "flash_reservations.json");
  const FLASH_CAMPAIGNS_FILE = path.join(DATA_DIR, "flash_deal_campaigns.json");
  const FLASH_MUTATION_QUEUE = "flash-deals";
  const OVERLAP_WARNING = flashDealPricing.OVERLAP_WARNING;

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

  function campaignUsageFromReservations(reservations) {
    const usage = new Map();
    for (const reservation of Array.isArray(reservations) ? reservations : []) {
      const snapshot = reservation?.priceSnapshot;
      const campaignId = String(snapshot?.campaignId || "").trim();
      if (!campaignId) continue;
      const status = String(reservation.status || "").trim().toLowerCase();
      if (status !== "held" && status !== "converted") continue;
      const qty = Math.max(0, Number(reservation.quantity) || 0);
      const subsidy = Math.max(0, Number(snapshot.platformSubsidy) || 0) * qty;
      const entry = usage.get(campaignId) || {
        committed: 0,
        subsidyUsed: 0,
        soldQty: 0,
        heldQty: 0,
        revenue: 0,
      };
      entry.committed += subsidy;
      if (status === "converted") {
        entry.subsidyUsed += subsidy;
        entry.soldQty += qty;
        entry.revenue += Math.max(0, Number(snapshot.finalCustomerPrice) || 0) * qty;
      } else {
        entry.heldQty += qty;
      }
      usage.set(campaignId, entry);
    }
    for (const entry of usage.values()) {
      entry.committed = Math.round(entry.committed * 100) / 100;
      entry.subsidyUsed = Math.round(entry.subsidyUsed * 100) / 100;
      entry.revenue = Math.round(entry.revenue * 100) / 100;
    }
    return usage;
  }

  function productCampaignPlatformId(product) {
    return String(product?.platformId || product?.platform || "").trim().toLowerCase() || "shop";
  }

  /**
   * Registered listings, sellers, and usage for one campaign, grouped by the seller
   * company's platform (falling back to the listing's platform), so a company only
   * shows under the platform it belongs to.
   */
  function campaignPlatformBreakdown(campaign, reservations, productsById, sellerPlatforms = new Map()) {
    const platformFor = (product) =>
      sellerPlatforms.get(resolveProductSellerAdminId(product)) || productCampaignPlatformId(product);
    const byPlatform = new Map();
    const statFor = (platformId) => {
      if (!byPlatform.has(platformId)) {
        byPlatform.set(platformId, {
          productCount: 0,
          sellerListingCounts: new Map(),
          soldQty: 0,
          heldQty: 0,
          revenue: 0,
          subsidyUsed: 0,
        });
      }
      return byPlatform.get(platformId);
    };
    for (const productId of campaign?.eligibility?.productIds || []) {
      const product = productsById.get(productId);
      if (!product) continue;
      const entry = statFor(platformFor(product));
      entry.productCount += 1;
      const sellerId = resolveProductSellerAdminId(product);
      if (sellerId) {
        entry.sellerListingCounts.set(sellerId, (entry.sellerListingCounts.get(sellerId) || 0) + 1);
      }
    }
    for (const reservation of Array.isArray(reservations) ? reservations : []) {
      const snapshot = reservation?.priceSnapshot;
      if (String(snapshot?.campaignId || "").trim() !== campaign.id) continue;
      const status = String(reservation.status || "").trim().toLowerCase();
      if (status !== "held" && status !== "converted") continue;
      const product = productsById.get(String(reservation.productId || "").trim());
      const entry = statFor(platformFor(product));
      const qty = Math.max(0, Number(reservation.quantity) || 0);
      if (status === "converted") {
        entry.soldQty += qty;
        entry.revenue += Math.max(0, Number(snapshot.finalCustomerPrice) || 0) * qty;
        entry.subsidyUsed += Math.max(0, Number(snapshot.platformSubsidy) || 0) * qty;
      } else {
        entry.heldQty += qty;
      }
    }
    const result = {};
    for (const [platformId, entry] of byPlatform) {
      result[platformId] = {
        productCount: entry.productCount,
        sellerCount: entry.sellerListingCounts.size,
        sellers: [...entry.sellerListingCounts]
          .sort((left, right) => right[1] - left[1])
          .map(([id, listingCount]) => ({ id, listingCount })),
        soldQty: entry.soldQty,
        heldQty: entry.heldQty,
        revenue: Math.round(entry.revenue * 100) / 100,
        subsidyUsed: Math.round(entry.subsidyUsed * 100) / 100,
      };
    }
    return result;
  }

  async function readFlashCampaigns({ reservations = null } = {}) {
    if (typeof ensureStoragePaths === "function") {
      await ensureStoragePaths();
    }
    let rows = [];
    try {
      const raw = await fsPromises.readFile(FLASH_CAMPAIGNS_FILE, "utf8");
      rows = decodeJsonArray(raw);
    } catch (_error) {
      return [];
    }
    const usage = campaignUsageFromReservations(
      Array.isArray(reservations) ? reservations : await readFlashReservations(),
    );
    return rows.map((entry) =>
      flashDealPricing.normalizeCampaign({
        ...entry,
        budgetCommitted: usage.get(String(entry?.id || "").trim())?.committed || 0,
      }),
    );
  }

  async function writeFlashCampaigns(campaigns) {
    if (typeof ensureStoragePaths === "function") {
      await ensureStoragePaths();
    }
    const payload = (Array.isArray(campaigns) ? campaigns : []).map((entry) => {
      const { budgetCommitted: _derived, ...rest } = entry || {};
      return rest;
    });
    if (typeof writeJsonFileAtomically === "function") {
      await writeJsonFileAtomically(FLASH_CAMPAIGNS_FILE, payload);
      return;
    }
    await fsPromises.writeFile(
      FLASH_CAMPAIGNS_FILE,
      `${JSON.stringify(payload, null, 2)}\n`,
      "utf8",
    );
  }

  function newCampaignId() {
    return `fdcamp-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
  }

  async function loadProductsById() {
    const products = typeof readProducts === "function" ? await readProducts() : [];
    const map = new Map();
    for (const entry of Array.isArray(products) ? products : []) {
      const id = String(entry?.id || "").trim();
      if (id) map.set(id, entry);
    }
    return { products: Array.isArray(products) ? products : [], map };
  }

  async function resolveForProduct(productId, variantId = "", nowMs = Date.now()) {
    const id = String(productId || "").trim();
    const [{ products, map }, deals, campaigns] = await Promise.all([
      loadProductsById(),
      readFlashDeals(),
      readFlashCampaigns(),
    ]);
    const product =
      map.get(id) ||
      products.find((entry) => String(entry?.id || "").trim() === id) ||
      null;
    if (!product) {
      return flashDealPricing.resolveProductPrice({
        product: { id, originalPrice: 0 },
        variantId,
        deals,
        campaigns,
        nowMs,
      });
    }
    return flashDealPricing.resolveProductPrice({
      product,
      variantId,
      deals,
      campaigns,
      nowMs,
    });
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
      priceSnapshot: reservation.priceSnapshot || null,
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

  /** Flash Deals are schedule-gated, not SA-review-gated. Legacy pending/revision → approved. */
  function effectiveApprovalStatus(deal) {
    const approval = String(deal?.approvalStatus || "").trim().toLowerCase();
    if (approval === "rejected") return "rejected";
    if (approval === "approved") return "approved";
    // pending | revision | draft | empty → approved (no review queue)
    return "approved";
  }

  function deriveDealStatus(deal, nowMs = Date.now()) {
    const stored = String(deal?.status || "").trim().toLowerCase();
    if (stored === "cancelled" || stored === "draft" || stored === "paused") {
      return stored;
    }
    const approval = effectiveApprovalStatus(deal);
    if (approval === "rejected") {
      return "cancelled";
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

  /** Card/modal label: upcoming | live | ended | cancelled | rejected */
  function deriveDisplayStatus(deal, nowMs = Date.now()) {
    const stored = String(deal?.status || "").trim().toLowerCase();
    const approval = effectiveApprovalStatus(deal);
    if (stored === "cancelled") return "cancelled";
    if (approval === "rejected") return "rejected";
    return deriveDealStatus(deal, nowMs);
  }

  function toPublicDeal(deal, extras = {}) {
    const status = deriveDealStatus(deal);
    const displayStatus = deriveDisplayStatus(deal);
    const hydrated = flashDealPricing.hydrateDeal(deal);
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
      approvalStatus: effectiveApprovalStatus(deal),
      notes: deal.notes || "",
      productName: deal.productName || "",
      createdAt: deal.createdAt || "",
      updatedAt: deal.updatedAt || "",
      createdBy: deal.createdBy || "",
      approvedBy: deal.approvedBy || "",
      dealType: hydrated.dealType,
      campaignId: String(deal.campaignId || "").trim(),
      campaignName: String(deal.campaignName || "").trim(),
      campaignLabel: String(deal.campaignLabel || "").trim(),
      freeShipping: hydrated.dealType === flashDealPricing.DEAL_TYPE_PLATFORM && deal.freeShipping === true,
      variantIds: Array.isArray(deal.variantIds) ? deal.variantIds : [],
      regularPriceSnapshot: Number(deal.regularPriceSnapshot) || 0,
      fundingSource: hydrated.fundingSource,
      priority: hydrated.priority,
      createdByRole: String(deal.createdByRole || "").trim(),
      ...extras,
    };
  }

  function listingImageUrl(candidate) {
    if (candidate && typeof candidate === "object") {
      return String(
        candidate.url ?? candidate.imageUrl ?? candidate.src ?? "",
      ).trim();
    }
    return String(candidate ?? "").trim();
  }

  function collectProductListingImages(product, variantId = "", limit = 10) {
    if (!product || typeof product !== "object") return [];

    const imageUrls = Array.isArray(product.imageUrls) ? product.imageUrls : [];
    const requestedMainIndex = Number(product.mainImageIndex ?? 0);
    const mainIndex =
      Number.isInteger(requestedMainIndex) &&
      requestedMainIndex >= 0 &&
      requestedMainIndex < imageUrls.length
        ? requestedMainIndex
        : 0;
    const orderedGallery = imageUrls.length
      ? [
          imageUrls[mainIndex],
          ...imageUrls.filter((_, index) => index !== mainIndex),
        ]
      : [];
    const variants = Array.isArray(product.variants) ? product.variants : [];
    const selectedVariant = variants.find(
      (variant) =>
        String(variant?.id ?? variant?.variantId ?? "").trim() ===
        String(variantId || "").trim(),
    );
    const candidates = [
      selectedVariant?.imageUrl,
      ...orderedGallery,
      ...(Array.isArray(product.images) ? product.images : []),
      product.mainImageUrl,
      product.imageUrl,
      product.thumbnailUrl,
      product.photoUrl,
      product.coverImageUrl,
      ...variants.map((variant) => variant?.imageUrl),
    ];
    const seen = new Set();
    const images = [];
    const maxItems = Math.max(1, Number(limit) || 10);

    for (const candidate of candidates) {
      const imageUrl = listingImageUrl(candidate);
      const key = imageUrl.toLowerCase();
      if (!imageUrl || seen.has(key)) continue;
      seen.add(key);
      images.push(imageUrl);
      if (images.length >= maxItems) break;
    }
    return images;
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

  function resolveSellerCompanyPicture(account) {
    if (!account || account?.businessLogoSkipped === true) return "";
    return [
      account?.companyPictureUrl,
      account?.companyProfileImageUrl,
      account?.businessLogoUrl,
      account?.logoUrl,
      account?.company?.companyPictureUrl,
      account?.company?.companyProfileImageUrl,
      account?.company?.businessLogoUrl,
      account?.company?.logoUrl,
      account?.store?.companyPictureUrl,
      account?.store?.companyProfileImageUrl,
      account?.store?.businessLogoUrl,
      account?.store?.logoUrl,
      account?.profile?.companyPictureUrl,
      account?.profile?.companyProfileImageUrl,
      account?.profile?.businessLogoUrl,
      account?.profile?.logoUrl,
      account?.profileData?.companyPictureUrl,
      account?.profileData?.companyProfileImageUrl,
      account?.profileData?.businessLogoUrl,
      account?.profileData?.logoUrl,
    ]
      .map((value) => String(value || "").trim())
      .find(Boolean) || "";
  }

  function isBlockingDeal(deal) {
    return flashDealPricing.isSellerBlockingDeal(deal);
  }

  async function notifyFlashDealScheduled({ deal, sellerAdminId, request }) {
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
    const status = deriveDealStatus(deal);
    const scheduleHint =
      status === "live"
        ? "It is live now."
        : "It goes live automatically at the start time.";

    if (
      typeof persistSuperAdminNotification === "function" &&
      typeof createPersistentLinkedNotification === "function"
    ) {
      await persistSuperAdminNotification(
        createPersistentLinkedNotification({
          type: "seller-flash-deal-submitted",
          audience: "super_admin",
          title: "Seller scheduled a Flash Deal",
          reason: "Flash Deal scheduled",
          message: `${storeName} scheduled a Flash Deal for ${productLabel}. ${scheduleHint}`,
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
          title: "Flash Deal scheduled",
          reason: status === "live" ? "Live now" : "Scheduled",
          message: `Your Flash Deal for ${productLabel} is scheduled. ${scheduleHint}`,
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
          title: "Flash Deal scheduled",
          reason: status === "live" ? "Live now" : "Scheduled",
          message: `Your Flash Deal for ${productLabel} is scheduled. ${scheduleHint}`,
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
          action: "flash-deal-scheduled",
          title: "Flash Deal scheduled",
          description: `${storeName} scheduled a Flash Deal for ${productLabel}.`,
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

  function resolveProductSellerAdminId(product) {
    return normalizeTenantId(
      product?.adminId ??
        product?.tenantId ??
        product?.ownerAdminId ??
        product?.workspaceId ??
        product?.storeAdminId ??
        product?.sellerId ??
        product?.seller_id ??
        product?.shopId ??
        product?.shop_id,
      "",
    );
  }

  async function findCatalogProduct(productId) {
    if (typeof readProducts !== "function") {
      throw new Error("Product catalog is unavailable.");
    }
    const products = await readProducts();
    const product = (Array.isArray(products) ? products : []).find(
      (entry) => String(entry?.id ?? "").trim() === String(productId || "").trim(),
    );
    if (!product) {
      throw new Error("Product not found.");
    }
    return product;
  }

  function isCampaignEligibleProduct(product) {
    const approval = String(product?.approvalStatus || "").trim().toLowerCase();
    if (approval === "pending" || approval === "rejected") return false;
    return product?.isActive !== false;
  }

  function productCategoryLabel(product) {
    const raw = product?.category;
    if (raw && typeof raw === "object") {
      return String(raw.name || raw.id || "").trim();
    }
    return String(raw || product?.categoryName || "").trim();
  }

  function toListingChoice(product) {
    const images = collectProductListingImages(product, "", 1);
    const { sellingPrice } = flashDealPricing.getRegularSellingPrice(product);
    const variants = (Array.isArray(product?.variants) ? product.variants : [])
      .map((variant) => {
        const id = String(variant?.id ?? variant?.variantId ?? "").trim();
        if (!id) return null;
        const prices = flashDealPricing.getRegularSellingPrice(product, id);
        return {
          id,
          name: String(variant?.name || "").trim() || id,
          originalPrice: prices.originalPrice,
          sellingPrice: prices.sellingPrice,
        };
      })
      .filter(Boolean);
    return {
      id: String(product?.id || "").trim(),
      name: String(product?.name || "").trim() || "Listing",
      sellerAdminId: resolveProductSellerAdminId(product),
      platformId: String(product?.platformId || product?.platform || "").trim(),
      category: productCategoryLabel(product),
      originalPrice: getProductOriginalPrice(product),
      sellingPrice,
      sellableStock: getProductSellableStock(product),
      imageUrl: images[0] || "",
      variants,
    };
  }

  async function sellerLabelsById(sellerIds) {
    const labels = new Map();
    const ids = [...new Set((sellerIds || []).filter(Boolean))];
    if (!ids.length) return labels;
    const accounts =
      typeof readAccounts === "function" ? await readAccounts() : [];
    for (const id of ids) {
      const account =
        typeof findAdminAccountByScopeId === "function"
          ? findAdminAccountByScopeId(accounts, id)
          : null;
      labels.set(id, account ? resolveSellerAccountLabel(account) : id);
    }
    return labels;
  }

  async function sellerProfilesById(sellerIds) {
    const profiles = new Map();
    const ids = [...new Set((sellerIds || []).filter(Boolean))];
    if (!ids.length) return profiles;
    const [accounts, storeTypes] = await Promise.all([
      typeof readAccounts === "function" ? readAccounts() : [],
      loadStoreTypeDetailsSafe(),
    ]);
    for (const id of ids) {
      const account =
        typeof findAdminAccountByScopeId === "function"
          ? findAdminAccountByScopeId(accounts || [], id)
          : null;
      profiles.set(id, {
        id,
        name: account ? resolveSellerAccountLabel(account) : id,
        pictureUrl: resolveSellerCompanyPicture(account),
        platformId: account ? accountPlatformId(account, storeTypes) : "",
      });
    }
    return profiles;
  }

  async function notifySuperAdminCreatedFlashDeal({
    deal,
    sellerAdminId,
    request,
  }) {
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
    const status = deriveDealStatus(deal);
    const scheduleHint =
      status === "live"
        ? "It is live now."
        : "It goes live automatically at the start time.";

    if (
      typeof persistSuperAdminNotification === "function" &&
      typeof createPersistentLinkedNotification === "function"
    ) {
      await persistSuperAdminNotification(
        createPersistentLinkedNotification({
          type: "sa-flash-deal-created",
          audience: "super_admin",
          title: "Flash Deal created",
          reason: "Super Admin scheduled a Flash Deal",
          message: `You scheduled a Flash Deal for ${productLabel} (${storeName}). ${scheduleHint}`,
          adminId: sellerAdminId,
          companyName: storeName,
          storeName,
          businessName: storeName,
          createdBy: "Super Admin",
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
          type: "flash-deal-created-by-sa",
          audience: "seller",
          title: "Super Admin scheduled a Flash Deal",
          reason: status === "live" ? "Live now" : "Scheduled",
          message: `Super Admin scheduled a Flash Deal on ${productLabel}. ${scheduleHint}`,
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
          type: "flash-deal-created-by-sa",
          audience: "seller",
          title: "Super Admin scheduled a Flash Deal",
          reason: status === "live" ? "Live now" : "Scheduled",
          message: `Super Admin scheduled a Flash Deal on ${productLabel}. ${scheduleHint}`,
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
          type: "super-admin-action",
          source: "super_admin",
          adminId: sellerAdminId,
          action: "flash-deal-created",
          title: "Flash Deal created",
          description: `Super Admin scheduled a Flash Deal for ${productLabel} (${storeName}).`,
          actor: {
            role: "super-admin",
            displayName: "Super Admin",
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
    const dealType = flashDealPricing.normalizeDealType({
      dealType: payload?.dealType,
      createdByRole: payload?.createdByRole,
    });
    if (dealType !== flashDealPricing.DEAL_TYPE_PLATFORM) {
      if (endsAtMs - startsAtMs > MAX_DEAL_DURATION_MS) {
        throw new Error("Flash Deal duration cannot exceed 72 hours.");
      }
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
      listingImagesSnapshot: collectProductListingImages(product, variantId),
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
      const campaigns = await readFlashCampaigns();
      const resolved = flashDealPricing.resolveProductPrice({
        product,
        deals,
        campaigns,
      });
      const overridden =
        Boolean(active) &&
        resolved.dealType === flashDealPricing.DEAL_TYPE_PLATFORM &&
        resolved.overridden;
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
        deal: active
          ? toPublicDeal(active, {
              overriddenByPlatform: overridden,
              overrideMessage: overridden
                ? "Temporarily overridden by Platform Flash Deal"
                : "",
              currentCustomerPrice: resolved.finalPrice,
              currentDealType: resolved.dealType,
            })
          : null,
        resolvedPrice: flashDealPricing.buildPriceSnapshot(resolved),
        deals: forProduct.map((entry) =>
          toPublicDeal(entry, {
            overriddenByPlatform:
              overridden && String(entry.id) === String(active?.id),
          }),
        ),
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
    try {
      const {
        getPlatformSettings,
        isPlatformSettingBlocking,
        buildPlatformBlockedPayload,
      } = require("./platformSettings");
      const platformSettings = await getPlatformSettings();
      if (isPlatformSettingBlocking(platformSettings, "promosAndDiscounts")) {
        sendJson(
          response,
          403,
          buildPlatformBlockedPayload(
            "promosAndDiscounts",
            "Promos and discounts are currently disabled by Super Admin.",
          ),
        );
        return;
      }
    } catch (settingsError) {
      if (settingsError?.code === "PLATFORM_SETTING_DISABLED") {
        return;
      }
    }
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
          "This listing already has an active Flash Deal. Edit or end it first.",
        );
      }
      const stamp = nowIso();
      const next = {
        id: newDealId(),
        productId,
        sellerAdminId,
        ...validated,
        dealType: flashDealPricing.DEAL_TYPE_SELLER,
        fundingSource: flashDealPricing.FUNDING_SELLER,
        priority: 10,
        dealStockSold: 0,
        dealStockReserved: 0,
        status: "upcoming",
        approvalStatus: "approved",
        createdAt: stamp,
        updatedAt: stamp,
        createdBy: sellerAdminId,
        approvedBy: "auto",
      };
      next.status = deriveDealStatus(next);
      const persisted = [next, ...deals];
      await writeFlashDeals(persisted);
      await notifyFlashDealScheduled({
        deal: next,
        sellerAdminId,
        request,
      });
      sendJson(response, 201, {
        deal: toPublicDeal(next),
        message:
          next.status === "live"
            ? "Flash Deal is live."
            : "Flash Deal scheduled.",
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
      const mutate = flashDealPricing.canSellerMutateDeal(
        existing,
        sellerAdminId,
      );
      if (!mutate.ok) {
        sendJson(response, 403, { message: mutate.message });
        return;
      }
      const status = deriveDealStatus(existing);
      if (status === "live" || status === "ended" || status === "cancelled") {
        throw new Error("Only upcoming Flash Deals can be edited.");
      }
      const product = await findOwnedProduct(sellerAdminId, existing.productId);
      const validated = validateDealPayload(payload, { product, existing });
      const stamp = nowIso();
      const next = {
        ...existing,
        ...validated,
        approvalStatus: "approved",
        updatedAt: stamp,
        approvedBy: existing.approvedBy || "auto",
      };
      next.status = deriveDealStatus(next);
      deals[index] = next;
      await writeFlashDeals(deals);
      await notifyFlashDealScheduled({
        deal: next,
        sellerAdminId,
        request,
      });
      sendJson(response, 200, {
        deal: toPublicDeal(next),
        message:
          next.status === "live"
            ? "Flash Deal updated and is live."
            : "Flash Deal updated.",
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
      const mutate = flashDealPricing.canSellerMutateDeal(
        existing,
        sellerAdminId,
      );
      if (!mutate.ok) {
        sendJson(response, 403, { message: mutate.message });
        return;
      }
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
        approvalStatus: effectiveApprovalStatus(existing),
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
        const mutate = flashDealPricing.canSellerMutateDeal(
          existing,
          sellerAdminId,
        );
        if (!mutate.ok) {
          const error = new Error(mutate.message);
          error.statusCode = 403;
          throw error;
        }
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

      let index = deals.findIndex(
        (entry) => String(entry.id || "").trim() === normalizedDealId,
      );
      if (index < 0) {
        const parsed = flashDealPricing.parseVirtualPlatformDealId(normalizedDealId);
        if (parsed) {
          const campaigns = await readFlashCampaigns({ reservations });
          const campaign = campaigns.find(
            (entry) => String(entry?.id || "").trim() === parsed.campaignId,
          );
          const { map } = await loadProductsById();
          const product = map.get(parsed.productId);
          if (
            campaign &&
            product &&
            flashDealPricing.isCampaignActive(campaign, nowMs)
          ) {
            const virtual = flashDealPricing.campaignToVirtualDeal(
              campaign,
              product,
              normalizedVariantId,
            );
            if (virtual && flashDealPricing.isUsableDeal(virtual, nowMs)) {
              const materialized = {
                ...virtual,
                virtual: false,
                createdAt: nowIso(),
                updatedAt: nowIso(),
              };
              deals.unshift(materialized);
              index = 0;
            }
          }
        }
      }
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
      const products =
        typeof readProducts === "function" ? await readProducts() : [];
      const product = Array.isArray(products)
        ? products.find(
            (entry) =>
              String(entry?.id || "").trim() === String(deal.productId || "").trim(),
          )
        : null;
      const campaigns = await readFlashCampaigns({ reservations });
      const resolved = flashDealPricing.resolveProductPrice({
        product: product || { id: deal.productId, originalPrice: deal.originalPriceSnapshot },
        variantId: normalizedVariantId,
        deals,
        campaigns,
        nowMs,
      });
      if (
        resolved.dealId &&
        resolved.dealId !== normalizedDealId &&
        resolved.dealType === flashDealPricing.DEAL_TYPE_PLATFORM
      ) {
        const error = new Error(
          "A Platform Flash Deal is currently active for this listing.",
        );
        error.statusCode = 409;
        throw error;
      }
      const dealCampaignId = String(deal.campaignId || "").trim();
      if (dealCampaignId && resolved.dealId !== normalizedDealId) {
        const error = new Error("This Flash Deal campaign is no longer active.");
        error.statusCode = 409;
        throw error;
      }
      if (dealCampaignId) {
        const campaign = campaigns.find(
          (entry) => String(entry?.id || "").trim() === dealCampaignId,
        );
        const remainingBudget = flashDealPricing.campaignBudgetRemaining(campaign);
        const cost = Math.max(0, Number(resolved.platformSubsidy) || 0) * qty;
        if (cost > remainingBudget + 0.009) {
          const error = new Error("This Flash Deal campaign has used up its budget.");
          error.statusCode = 409;
          throw error;
        }
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
        lockedUnitPrice:
          resolved.dealId === normalizedDealId
            ? Number(resolved.finalPrice) || 0
            : Number(deal.flashPrice) || 0,
        status: "held",
        createdAt: stamp,
        expiresAt,
        updatedAt: stamp,
        convertedAt: "",
        priceSnapshot: flashDealPricing.buildPriceSnapshot(resolved),
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
    const reservations = await readFlashReservations();
    const byReservationId = new Map(
      reservations.map((entry) => [String(entry?.id || "").trim(), entry]),
    );
    for (const order of entries) {
      const reservationId = String(
        order?.flashReservationId || order?.reservationId || "",
      ).trim();
      const reservation = byReservationId.get(reservationId);
      const snapshot = reservation?.priceSnapshot;
      if (!snapshot) continue;
      order.originalPrice = snapshot.originalPrice;
      order.sellerDealPrice = snapshot.sellerDealPrice;
      order.platformDealPrice = snapshot.platformDealPrice;
      order.finalCustomerPrice = snapshot.finalCustomerPrice;
      order.sellerReceivablePrice = snapshot.sellerReceivablePrice;
      order.platformSubsidy = snapshot.platformSubsidy;
      order.appliedFlashDealId = snapshot.appliedFlashDealId;
      order.appliedFlashDealType = snapshot.appliedFlashDealType;
      if (snapshot.finalCustomerPrice != null) {
        order.unitPrice = snapshot.finalCustomerPrice;
      }
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

  async function handleSuperAdminListings(request, response, requestUrl) {
    if (typeof requireSuperAdmin === "function" && !requireSuperAdmin(request, response)) {
      return;
    }
    try {
      const params = requestUrl?.searchParams;
      const query = String(params?.get("q") || "").trim().toLowerCase();
      const windowStart = Date.parse(String(params?.get("startsAt") || "").trim());
      const windowEnd = Date.parse(String(params?.get("endsAt") || "").trim());
      const excludeCampaignId = String(params?.get("excludeCampaignId") || "").trim();
      const categoryFilter = String(params?.get("category") || "").trim().toLowerCase();
      const sellerFilter = normalizeTenantId(params?.get("sellerAdminId") || "", "");
      const minPrice = parseMoney(params?.get("minPrice"));
      const maxPrice = parseMoney(params?.get("maxPrice"));
      const minStock = parseNonNegInt(params?.get("minStock")) || 0;
      const limit = Math.max(1, Math.min(200, parseNonNegInt(params?.get("limit")) || 60));
      const products = typeof readProducts === "function" ? await readProducts() : [];
      const [deals, campaigns] = await Promise.all([
        readFlashDeals(),
        readFlashCampaigns(),
      ]);
      const window = { startMs: windowStart, endMs: windowEnd };
      const eligible = (Array.isArray(products) ? products : [])
        .filter(isCampaignEligibleProduct)
        .map((product) => toListingChoice(product))
        .filter(
          (listing) =>
            listing.id &&
            listing.sellerAdminId &&
            listing.sellingPrice > 0 &&
            listing.sellableStock >= 1,
        );
      const sellerLabels = await sellerLabelsById(
        eligible.map((listing) => listing.sellerAdminId),
      );
      const facets = {
        categories: [...new Set(eligible.map((listing) => listing.category).filter(Boolean))]
          .sort((a, b) => a.localeCompare(b)),
        sellers: [...sellerLabels.entries()]
          .map(([id, label]) => ({ id, label }))
          .sort((a, b) => a.label.localeCompare(b.label)),
      };
      const matched = eligible
        .filter((listing) => {
          if (categoryFilter && listing.category.toLowerCase() !== categoryFilter) return false;
          if (sellerFilter && listing.sellerAdminId !== sellerFilter) return false;
          if (minPrice !== null && listing.sellingPrice < minPrice) return false;
          if (maxPrice !== null && listing.sellingPrice > maxPrice) return false;
          if (listing.sellableStock < minStock) return false;
          if (!query) return true;
          const haystack = [
            listing.id,
            listing.name,
            listing.sellerAdminId,
            sellerLabels.get(listing.sellerAdminId) || "",
            listing.platformId,
            listing.category,
          ]
            .join(" ")
            .toLowerCase();
          return haystack.includes(query);
        });
      const listings = matched.slice(0, limit).map((listing) => {
        const overlapping = findSellerDealOverlap(deals, listing.id, window);
        const platformOverlap = findPlatformCampaignOverlap(campaigns, listing.id, window, {
          excludeCampaignId,
        });
        return {
          ...listing,
          sellerLabel: sellerLabels.get(listing.sellerAdminId) || listing.sellerAdminId,
          sellerDealOverlap: Boolean(overlapping),
          sellerDealPrice: overlapping
            ? flashDealPricing.parseMoney(overlapping.flashPrice)
            : null,
          platformCampaignOverlap: platformOverlap
            ? { id: platformOverlap.id, name: platformOverlap.name }
            : null,
        };
      });
      sendJson(response, 200, { listings, total: matched.length, facets });
    } catch (error) {
      sendJson(response, 500, {
        message:
          error instanceof Error
            ? error.message
            : "Unable to load listings for Flash Deals.",
      });
    }
  }

  function windowsOverlap(aStart, aEnd, bStart, bEnd) {
    if (![aStart, aEnd, bStart, bEnd].every(Number.isFinite)) return true;
    return aStart < bEnd && bStart < aEnd;
  }

  function findSellerDealOverlap(deals, productId, window = {}) {
    return (
      (Array.isArray(deals) ? deals : []).find((deal) => {
        if (String(deal?.productId || "").trim() !== productId) return false;
        if (!flashDealPricing.isSellerBlockingDeal(deal)) return false;
        return windowsOverlap(
          window.startMs,
          window.endMs,
          Date.parse(String(deal?.startsAt || "")),
          Date.parse(String(deal?.endsAt || "")),
        );
      }) || null
    );
  }

  function findPlatformCampaignOverlap(
    campaigns,
    productId,
    window = {},
    { excludeCampaignId = "" } = {},
  ) {
    return (
      (Array.isArray(campaigns) ? campaigns : []).find((campaign) => {
        if (!campaign?.id || campaign.id === excludeCampaignId) return false;
        const status = flashDealPricing.deriveCampaignStatus(campaign);
        if (status === "ended" || status === "cancelled" || status === "draft") {
          return false;
        }
        if (!campaign.eligibility?.productIds?.includes(productId)) return false;
        return windowsOverlap(
          window.startMs,
          window.endMs,
          Date.parse(String(campaign.startsAt || "")),
          Date.parse(String(campaign.endsAt || "")),
        );
      }) || null
    );
  }

  const MIN_CAMPAIGN_DURATION_MS = 15 * 60 * 1000;
  const MAX_CAMPAIGN_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
  const MAX_CAMPAIGN_LISTINGS = 500;

  /** Returns why a listing cannot join the campaign, or "" when it can. */
  function campaignListingIssue(campaign, product, settings = {}) {
    const label = String(product?.name || product?.id || "This listing").trim();
    if (!product) return "This listing no longer exists.";
    if (!isCampaignEligibleProduct(product)) return `“${label}” is not approved or not active.`;
    const platformIds = campaign?.platformIds || [];
    const productPlatform = String(product.platformId || product.platform || "").trim().toLowerCase();
    if (platformIds.length && productPlatform && !platformIds.includes(productPlatform)) {
      return `“${label}” is on a platform this campaign doesn't cover.`;
    }
    const stock = getProductSellableStock(product);
    if (stock < 1) return `“${label}” is out of stock.`;
    const { sellingPrice } = flashDealPricing.getRegularSellingPrice(product);
    if (flashDealPricing.computeCampaignDealPrice(campaign, sellingPrice) === null) {
      return `“${label}” cannot take this discount.`;
    }
    if (settings.dealStock && settings.dealStock > stock) {
      return `Deal stock for “${label}” is higher than its ${stock} in stock.`;
    }
    if (settings.perBuyerLimit && settings.dealStock && settings.perBuyerLimit > settings.dealStock) {
      return `Purchase limit for “${label}” is higher than its deal stock.`;
    }
    const variantIds = new Set(
      (Array.isArray(product.variants) ? product.variants : []).map((variant) =>
        String(variant?.id ?? variant?.variantId ?? "").trim(),
      ),
    );
    if ((settings.variantIds || []).some((variantId) => !variantIds.has(variantId))) {
      return `A selected variant of “${label}” no longer exists.`;
    }
    return "";
  }

  function validateCampaignPayload(
    payload,
    { existing = null, registrationsFrom = existing } = {},
  ) {
    const name = String(payload?.name || "").trim();
    if (!name) throw new Error("Campaign name is required.");
    if (name.length > 80) throw new Error("Campaign name must be 80 characters or fewer.");
    const startsAtRaw = String(payload?.startsAt || existing?.startsAt || "").trim();
    const endsAtRaw = String(payload?.endsAt || existing?.endsAt || "").trim();
    const startsAtMs = Date.parse(startsAtRaw);
    const endsAtMs = Date.parse(endsAtRaw);
    if (!Number.isFinite(startsAtMs) || !Number.isFinite(endsAtMs)) {
      throw new Error("Start and end date/time are required.");
    }
    if (endsAtMs <= startsAtMs) {
      throw new Error("End time must be after start time.");
    }
    if (endsAtMs - startsAtMs < MIN_CAMPAIGN_DURATION_MS) {
      throw new Error("Campaigns must run for at least 15 minutes.");
    }
    if (endsAtMs - startsAtMs > MAX_CAMPAIGN_DURATION_MS) {
      throw new Error("Campaigns can run for at most 30 days.");
    }
    const startChanged =
      !existing || Date.parse(String(existing.startsAt || "")) !== startsAtMs;
    if (startChanged && startsAtMs < Date.now() - 60_000) {
      throw new Error("Start time cannot be in the past.");
    }
    if (existing && endsAtMs <= Date.now()) {
      throw new Error("End time must be in the future.");
    }
    const requestedType = String(payload?.discountType || "").trim().toLowerCase();
    if (requestedType && requestedType !== flashDealPricing.DISCOUNT_PERCENT) {
      throw new Error("Flash Deal campaigns only support percentage discounts.");
    }
    const discountType = flashDealPricing.DISCOUNT_PERCENT;
    const discountValue = flashDealPricing.parseMoney(payload?.discountValue);
    if (discountValue === null || discountValue <= 0) {
      throw new Error("Discount value must be greater than 0.");
    }
    if (discountValue >= 100) {
      throw new Error("Percentage discount must be below 100.");
    }
    const maxDiscountAmount = parseMoney(payload?.maxDiscountAmount);
    if (maxDiscountAmount !== null && maxDiscountAmount < 0) {
      throw new Error("Max discount cannot be negative.");
    }
    const budgetAmount = parseMoney(payload?.budgetAmount);
    if (budgetAmount !== null && budgetAmount < 0) {
      throw new Error("Campaign budget cannot be negative.");
    }
    const fundingSource = String(payload?.fundingSource || "platform").trim().toLowerCase();
    if (
      ![
        flashDealPricing.FUNDING_PLATFORM,
        flashDealPricing.FUNDING_SHARED,
        flashDealPricing.FUNDING_SELLER,
      ].includes(fundingSource)
    ) {
      throw new Error("Choose who funds this campaign.");
    }
    const platformSharePct = parseMoney(payload?.platformSharePct);
    if (
      fundingSource === flashDealPricing.FUNDING_SHARED &&
      (platformSharePct === null || platformSharePct <= 0 || platformSharePct >= 100)
    ) {
      throw new Error("Platform share must be between 1 and 99 percent.");
    }
    const priority = payload?.priority === undefined || payload?.priority === ""
      ? 100
      : parseNonNegInt(payload?.priority);
    if (priority === null || priority < 1 || priority > 1000) {
      throw new Error("Priority must be a whole number from 1 to 1000.");
    }
    const displayLabel = String(payload?.displayLabel || "").trim();
    if (displayLabel.length > 60) {
      throw new Error("Buyer-facing label must be 60 characters or fewer.");
    }
    const notes = String(payload?.notes || "").trim();
    if (notes.length > 500) throw new Error("Notes must be 500 characters or fewer.");
    if (payload?.platformIds !== undefined && !Array.isArray(payload.platformIds)) {
      throw new Error("Platforms must be a list.");
    }
    if (payload?.businessTypeIds !== undefined && !Array.isArray(payload.businessTypeIds)) {
      throw new Error("Business types must be a list.");
    }
    const platformIds =
      payload?.platformIds !== undefined ? payload.platformIds : existing?.platformIds;
    const businessTypeIds =
      payload?.businessTypeIds !== undefined ? payload.businessTypeIds : existing?.businessTypeIds;
    const perBuyerLimit =
      parseNonNegInt(payload?.perBuyerLimit ?? registrationsFrom?.perBuyerLimit ?? 1) || 1;

    // Sellers register their own listings, so edits never replace the registered set.
    const eligibility = flashDealPricing.normalizeEligibility({
      ...(registrationsFrom?.eligibility || {}),
      scope: "products",
    });
    const productSettings = flashDealPricing.normalizeProductSettings(
      registrationsFrom?.productSettings,
    );

    return flashDealPricing.normalizeCampaign({
      ...(existing || {}),
      name,
      displayLabel,
      platformIds,
      businessTypeIds,
      startsAt: new Date(startsAtMs).toISOString(),
      endsAt: new Date(endsAtMs).toISOString(),
      discountType,
      discountValue,
      maxDiscountAmount,
      freeShipping: payload?.freeShipping === true || payload?.freeShipping === "true",
      budgetAmount,
      fundingSource,
      platformSharePct,
      priority,
      eligibility,
      productSettings,
      dealStockPerProduct: payload?.dealStockPerProduct ?? registrationsFrom?.dealStockPerProduct,
      perBuyerLimit,
      notes,
    });
  }

  function toPublicCampaign(campaign, extras = {}) {
    const normalized = flashDealPricing.normalizeCampaign(campaign);
    const remaining = flashDealPricing.campaignBudgetRemaining(normalized);
    return {
      ...normalized,
      status: flashDealPricing.deriveCampaignStatus(normalized),
      dealType: flashDealPricing.DEAL_TYPE_PLATFORM,
      budgetRemaining: Number.isFinite(remaining) ? remaining : null,
      productCount: normalized.eligibility.productIds.length,
      ...extras,
    };
  }

  /** Sellers touched by a campaign, with the listings that overlap their own Flash Deals. */
  function campaignImpact(campaign, productsById, deals) {
    const window = {
      startMs: Date.parse(String(campaign?.startsAt || "")),
      endMs: Date.parse(String(campaign?.endsAt || "")),
    };
    const sellers = new Map();
    let overlapCount = 0;
    const sample = [];
    for (const productId of campaign?.eligibility?.productIds || []) {
      const product = productsById.get(productId);
      const sellerId = resolveProductSellerAdminId(product);
      if (!sellerId) continue;
      const entry = sellers.get(sellerId) || { productIds: [], overlapProductIds: [] };
      entry.productIds.push(productId);
      if (findSellerDealOverlap(deals, productId, window)) {
        entry.overlapProductIds.push(productId);
        overlapCount += 1;
        if (sample.length < 8) {
          sample.push({ productId, productName: String(product?.name || "") });
        }
      }
      sellers.set(sellerId, entry);
    }
    return { sellers, overlapCount, sample };
  }

  const CAMPAIGN_EVENT_COPY = {
    created: {
      saTitle: "Platform Flash Deal campaign created",
      sellerTitle: "Upcoming Platform Flash Sale: register your products",
    },
    published: {
      saTitle: "Platform Flash Deal campaign published",
      sellerTitle: "Upcoming Platform Flash Sale: register your products",
    },
    updated: {
      saTitle: "Platform Flash Deal campaign updated",
      sellerTitle: "A Platform Flash Deal on your listings was updated",
    },
    paused: {
      saTitle: "Platform Flash Deal campaign paused",
      sellerTitle: "A Platform Flash Deal on your listings was paused",
    },
    resumed: {
      saTitle: "Platform Flash Deal campaign resumed",
      sellerTitle: "A Platform Flash Deal on your listings resumed",
    },
    ended: {
      saTitle: "Platform Flash Deal campaign ended",
      sellerTitle: "A Platform Flash Deal on your listings ended",
    },
    removed: {
      saTitle: "Listings removed from a Platform Flash Deal",
      sellerTitle: "Your listing was removed from a Platform Flash Deal",
    },
    draft: {
      saTitle: "Platform Flash Deal draft saved",
      sellerTitle: "",
    },
    cancelled: {
      saTitle: "Platform Flash Deal draft discarded",
      sellerTitle: "",
    },
  };

  function describeCampaignSchedule(campaign) {
    const fmt = (value) => {
      const date = new Date(String(value || ""));
      return Number.isNaN(date.getTime())
        ? "—"
        : date.toLocaleString("en-PH", {
            timeZone: "Asia/Manila",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          });
    };
    return `${fmt(campaign.startsAt)} – ${fmt(campaign.endsAt)}`;
  }

  function campaignPublicName(campaign) {
    return String(campaign?.displayLabel || campaign?.name || "Platform Flash Sale").trim();
  }

  function sellerAccountScopeId(account) {
    return resolveProductSellerAdminId(account) || normalizeTenantId(account?.id, "");
  }

  function isInvitableSellerAccount(account) {
    if (String(account?.role ?? "").trim().toLowerCase() !== "admin") return false;
    if (account?.isBanned === true || account?.banned === true) return false;
    const status = [account?.status, account?.accountStatus, account?.accountState]
      .map((value) => String(value || "").trim().toLowerCase())
      .join(" ");
    return !/\b(deleted|banned|deactivated)\b/.test(status);
  }

  function accountBusinessTypeName(account) {
    const profile =
      account?.profileData && typeof account.profileData === "object" ? account.profileData : {};
    return (
      [
        account?.storeType,
        account?.storeTypeName,
        account?.businessType,
        account?.company?.storeType,
        account?.company?.storeTypeName,
        account?.company?.businessType,
        profile.storeType,
        profile.storeTypeName,
        profile.businessType,
      ]
        .map((value) => String(value || "").trim())
        .find(Boolean) || ""
    );
  }

  function accountStoreType(account, storeTypes = []) {
    const typeKey = accountBusinessTypeName(account).toLowerCase();
    return typeKey
      ? storeTypes.find((entry) => String(entry?.name || "").trim().toLowerCase() === typeKey) || null
      : null;
  }

  /** The platform a seller company belongs to (account → company → business type → shop). */
  function accountPlatformId(account, storeTypes = []) {
    return String(
      account?.platformId ||
        account?.company?.platformId ||
        accountStoreType(account, storeTypes)?.platformId ||
        "shop",
    )
      .trim()
      .toLowerCase();
  }

  function campaignHasTargeting(campaign) {
    return Boolean(campaign?.platformIds?.length || campaign?.businessTypeIds?.length);
  }

  async function loadStoreTypeDetailsSafe() {
    if (typeof readStoreTypeDetails !== "function") return [];
    try {
      const list = await readStoreTypeDetails();
      return Array.isArray(list) ? list : [];
    } catch (_error) {
      return [];
    }
  }

  /** Empty platform/business type lists mean the campaign is open to every seller. */
  function sellerMatchesCampaignTarget(campaign, account, storeTypes = []) {
    const platformIds = (campaign?.platformIds || []).map((id) => String(id).trim().toLowerCase());
    const businessTypeIds = (campaign?.businessTypeIds || []).map((id) =>
      String(id).trim().toLowerCase(),
    );
    if (!platformIds.length && !businessTypeIds.length) return true;
    if (!account) return false;
    const typeName = accountBusinessTypeName(account);
    const type = accountStoreType(account, storeTypes);
    if (businessTypeIds.length) {
      const keys = [type?.id, type?.name, typeName]
        .map((value) => String(value || "").trim().toLowerCase())
        .filter(Boolean);
      if (!keys.some((key) => businessTypeIds.includes(key))) return false;
    }
    if (platformIds.length && !platformIds.includes(accountPlatformId(account, storeTypes))) {
      return false;
    }
    return true;
  }

  async function loadSellerTargetContext(sellerAdminId) {
    const [accounts, storeTypes] = await Promise.all([
      typeof readAccounts === "function" ? readAccounts() : [],
      loadStoreTypeDetailsSafe(),
    ]);
    const account =
      typeof findAdminAccountByScopeId === "function"
        ? findAdminAccountByScopeId(accounts || [], sellerAdminId)
        : null;
    return { account, storeTypes };
  }

  function describeCampaignFunding(campaign) {
    if (campaign.fundingSource === flashDealPricing.FUNDING_SELLER) {
      return "The discount is seller-funded, so you receive the flash price.";
    }
    if (campaign.fundingSource === flashDealPricing.FUNDING_SHARED) {
      return `The platform covers ${campaign.platformSharePct}% of the discount; you cover the rest.`;
    }
    return "The platform covers the discount, so you still receive your regular price.";
  }

  async function notifyCampaignEvent({
    event,
    campaign,
    impact,
    request,
    sellerIdsOverride = null,
    extraSaMessage = "",
  }) {
    const copy = CAMPAIGN_EVENT_COPY[event] || CAMPAIGN_EVENT_COPY.updated;
    const stamp = nowIso();
    const discountText = `${campaign.discountValue}% off${
      campaign.maxDiscountAmount ? ` (max ₱${campaign.maxDiscountAmount})` : ""
    }${campaign.freeShipping ? " + free shipping" : ""}`;
    const schedule = describeCampaignSchedule(campaign);
    const publicName = campaignPublicName(campaign);
    const sellers = impact?.sellers || new Map();
    const announce = (event === "created" || event === "published") && !sellerIdsOverride;
    const canBatchInbox =
      typeof readAccounts === "function" &&
      typeof findAdminAccountByScopeId === "function" &&
      typeof assignSellerAdminNotification === "function" &&
      typeof writeAccounts === "function";
    const accounts =
      announce || canBatchInbox || typeof notifySellerAdminInboxByAdminId !== "function"
        ? typeof readAccounts === "function"
          ? await readAccounts()
          : []
        : null;
    const targetStoreTypes =
      announce && campaignHasTargeting(campaign) ? await loadStoreTypeDetailsSafe() : [];
    const sellerIds = announce
      ? [
          ...new Set(
            (accounts || [])
              .filter(
                (account) =>
                  isInvitableSellerAccount(account) &&
                  sellerMatchesCampaignTarget(campaign, account, targetStoreTypes),
              )
              .map(sellerAccountScopeId),
          ),
        ].filter(Boolean)
      : sellerIdsOverride
        ? [...new Set(sellerIdsOverride.filter(Boolean))]
        : [...sellers.keys()];

    if (
      typeof persistSuperAdminNotification === "function" &&
      typeof createPersistentLinkedNotification === "function"
    ) {
      await persistSuperAdminNotification(
        createPersistentLinkedNotification({
          type: `sa-flash-deal-campaign-${event}`,
          audience: "super_admin",
          title: copy.saTitle,
          reason: "Platform campaign",
          message: `“${campaign.name}” · ${discountText} · ${schedule}. ${sellerIds.length} seller(s) ${
            announce ? "invited to register their products" : "notified"
          }.${
            impact?.overlapCount
              ? ` ${impact.overlapCount} seller deal(s) are temporarily overridden during overlap.`
              : ""
          }${extraSaMessage ? ` ${extraSaMessage}` : ""}`,
          createdBy: "Super Admin",
          targetUrl: "/super_admin.html#flash-deals",
        }),
      );
    }

    if (typeof createPersistentLinkedNotification === "function" && sellerIds.length) {
      let accountsChanged = false;
      for (const sellerId of sellerIds) {
        const entry = sellers.get(sellerId) || { productIds: [], overlapProductIds: [] };
        const count = entry.productIds.length;
        const parts = [];
        if (announce) {
          parts.push(`“${publicName}” is coming: ${discountText}, ${schedule}.`);
          parts.push(describeCampaignFunding(campaign));
          parts.push("Register your products from the Flash Sale banner at the top of your workspace.");
        } else if (event === "removed") {
          parts.push(`Your listing was removed from “${publicName}”. Regular pricing applies again.`);
        } else if (event === "ended") {
          parts.push(`“${publicName}” has ended. Regular pricing and any Seller Flash Deals apply again.`);
        } else if (event === "paused") {
          parts.push(`“${publicName}” is paused. Regular pricing applies until it resumes.`);
        } else {
          parts.push(
            `${count || "Some"} of your listing(s) are in “${publicName}” at ${discountText}, ${schedule}.`,
          );
          parts.push(describeCampaignFunding(campaign));
          if (entry.overlapProductIds.length) parts.push(OVERLAP_WARNING);
        }
        const notification = createPersistentLinkedNotification({
          type: `flash-deal-campaign-${event}`,
          audience: "seller",
          title: copy.sellerTitle,
          reason: "Platform campaign",
          message: parts.join(" "),
          adminId: sellerId,
          campaignId: campaign.id,
          productId: entry.productIds[0] || "",
          targetUrl: "/main.html#listing",
        });
        if (canBatchInbox && accounts) {
          const account = findAdminAccountByScopeId(accounts, sellerId);
          if (account) {
            assignSellerAdminNotification(account, { ...notification, adminId: sellerId });
            accountsChanged = true;
          }
        } else if (typeof notifySellerAdminInboxByAdminId === "function") {
          await notifySellerAdminInboxByAdminId(sellerId, notification);
        }
      }
      if (accountsChanged) {
        await writeAccounts(accounts);
      }
    }

    if (typeof logActivitySafely === "function") {
      await logActivitySafely(
        {
          id: `activity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          type: "super-admin-action",
          source: "super_admin",
          action: `flash-deal-campaign-${event}`,
          title: copy.saTitle,
          description: `Super Admin ${event} campaign “${campaign.name}” (${campaign.id}).`,
          actor: { role: "super-admin", displayName: "Super Admin" },
          createdAt: stamp,
          skipLinkedNotification: true,
        },
        request,
      );
    }
  }

  /**
   * Keep materialized campaign deals (created on first reservation) aligned with
   * the campaign: schedule/limits/stock follow edits, and pause/end stop sales.
   */
  function syncCampaignDeals(deals, reservations, campaign, productsById) {
    const stamp = nowIso();
    const status = flashDealPricing.deriveCampaignStatus(campaign);
    const removedProductIds = [];
    let changed = false;
    for (let index = 0; index < deals.length; index += 1) {
      const deal = deals[index];
      if (String(deal?.campaignId || "").trim() !== campaign.id) continue;
      const productId = String(deal.productId || "").trim();
      const stored = String(deal.status || "").trim().toLowerCase();
      if (stored === "cancelled") continue;
      const stillIncluded = campaign.eligibility.productIds.includes(productId);
      let next = { ...deal, updatedAt: stamp };
      if (!stillIncluded || status === "ended" || status === "cancelled") {
        releaseHeldReservationsForDeal(deals, reservations, deal.id);
        next = {
          ...deals[index],
          status: stillIncluded ? "ended" : "cancelled",
          endsAt: stillIncluded ? stamp : deal.endsAt,
          dealStockReserved: 0,
          updatedAt: stamp,
        };
        if (!stillIncluded) removedProductIds.push(productId);
      } else if (status === "paused" || status === "draft") {
        releaseHeldReservationsForDeal(deals, reservations, deal.id);
        next = { ...deals[index], status: "paused", dealStockReserved: 0, updatedAt: stamp };
      } else {
        const product = productsById.get(productId);
        const committed =
          (Number(deal.dealStockSold) || 0) + (Number(deal.dealStockReserved) || 0);
        const stockLimit = product
          ? Math.max(committed, flashDealPricing.campaignDealStockLimit(campaign, product))
          : Number(deal.dealStockLimit) || 0;
        next = {
          ...deal,
          campaignName: campaign.name,
          campaignLabel: campaign.displayLabel || "",
          freeShipping: Boolean(campaign.freeShipping),
          startsAt: campaign.startsAt,
          endsAt: campaign.endsAt,
          perBuyerLimit:
            campaign.productSettings?.[productId]?.perBuyerLimit ||
            campaign.perBuyerLimit ||
            1,
          dealStockLimit: stockLimit,
          fundingSource: campaign.fundingSource,
          platformSharePct: campaign.platformSharePct,
          priority: campaign.priority,
          status: "upcoming",
          updatedAt: stamp,
        };
        next.status = deriveDealStatus(next);
      }
      deals[index] = next;
      changed = true;
    }
    return { changed, removedProductIds };
  }

  async function handleSuperAdminCampaignsList(request, response) {
    if (typeof requireSuperAdmin === "function" && !requireSuperAdmin(request, response)) {
      return;
    }
    try {
      const reservations = await readFlashReservations();
      const [campaigns, { map: productsById }] = await Promise.all([
        readFlashCampaigns({ reservations }),
        loadProductsById(),
      ]);
      const usage = campaignUsageFromReservations(reservations);
      campaigns.sort((a, b) =>
        String(b.updatedAt || b.createdAt || "").localeCompare(
          String(a.updatedAt || a.createdAt || ""),
        ),
      );
      const profiles = await sellerProfilesById(
        campaigns.flatMap((entry) =>
          entry.eligibility.productIds.map((productId) =>
            resolveProductSellerAdminId(productsById.get(productId)),
          ),
        ),
      );
      const sellerPlatforms = new Map(
        [...profiles].filter(([, profile]) => profile.platformId).map(([id, profile]) => [id, profile.platformId]),
      );
      const breakdowns = new Map(
        campaigns.map((entry) => [
          entry.id,
          campaignPlatformBreakdown(entry, reservations, productsById, sellerPlatforms),
        ]),
      );
      for (const byPlatform of breakdowns.values()) {
        for (const stat of Object.values(byPlatform)) {
          stat.sellers = stat.sellers.map((seller) => ({
            ...seller,
            name: profiles.get(seller.id)?.name || seller.id,
            pictureUrl: profiles.get(seller.id)?.pictureUrl || "",
          }));
        }
      }
      sendJson(response, 200, {
        campaigns: campaigns.map((entry) => {
          const sellerIds = new Set(
            entry.eligibility.productIds
              .map((productId) => resolveProductSellerAdminId(productsById.get(productId)))
              .filter(Boolean),
          );
          const stats = usage.get(entry.id) || {};
          return toPublicCampaign(entry, {
            sellerCount: sellerIds.size,
            stats: {
              soldQty: stats.soldQty || 0,
              heldQty: stats.heldQty || 0,
              revenue: stats.revenue || 0,
              subsidyUsed: stats.subsidyUsed || 0,
            },
            platformStats: breakdowns.get(entry.id) || {},
          });
        }),
        total: campaigns.length,
      });
    } catch (error) {
      sendJson(response, 500, {
        message:
          error instanceof Error
            ? error.message
            : "Unable to load Flash Deal campaigns.",
      });
    }
  }

  async function handleSuperAdminCampaignCreate(request, response) {
    if (typeof requireSuperAdmin === "function" && !requireSuperAdmin(request, response)) {
      return;
    }
    try {
      const body = await parseRequestBody(request);
      const batch = Array.isArray(body?.campaigns) ? body.campaigns : null;
      if (batch && (!batch.length || batch.length > 50)) {
        throw new Error("Send between 1 and 50 campaigns at a time.");
      }
      const payloads = (batch || [body]).map((entry) =>
        entry && typeof entry === "object" ? entry : {},
      );
      const { map: productsById } = await loadProductsById();
      const reviewerId =
        typeof getRequestAdminId === "function"
          ? String(getRequestAdminId(request, null, "") || "").trim()
          : "";
      const stamp = nowIso();
      // Validate every payload before writing, so a platform batch is saved all-or-nothing.
      const drafts = payloads.map((payload) => {
        const validated = validateCampaignPayload(payload);
        const saveAsDraft = payload?.saveAsDraft === true;
        const next = {
          ...validated,
          id: newCampaignId(),
          status: saveAsDraft ? "draft" : "scheduled",
          createdBy: reviewerId || "super-admin",
          createdAt: stamp,
          updatedAt: stamp,
        };
        if (!saveAsDraft) next.status = flashDealPricing.deriveCampaignStatus(next);
        return { next, saveAsDraft };
      });
      const campaigns = await runFlashMutation(async () => {
        const current = await readFlashCampaigns();
        await writeFlashCampaigns([...drafts.map((draft) => draft.next), ...current]);
        return current;
      });
      const deals = await readFlashDeals();
      const created = [];
      for (const { next, saveAsDraft } of drafts) {
        const impact = campaignImpact(next, productsById, deals);
        const window = {
          startMs: Date.parse(next.startsAt),
          endMs: Date.parse(next.endsAt),
        };
        const platformOverlapCount = next.eligibility.productIds.filter((productId) =>
          findPlatformCampaignOverlap(campaigns, productId, window),
        ).length;
        await notifyCampaignEvent({
          event: saveAsDraft ? "draft" : "created",
          campaign: next,
          impact,
          request,
          sellerIdsOverride: saveAsDraft ? [] : null,
        });
        created.push(
          toPublicCampaign(next, {
            overlapCount: impact.overlapCount,
            overlapSample: impact.sample,
            overlapWarning: impact.overlapCount ? OVERLAP_WARNING : "",
            platformOverlapCount,
            sellerCount: impact.sellers.size,
          }),
        );
      }
      const first = drafts[0];
      const count = drafts.length;
      const noun = count === 1 ? "Platform campaign" : `${count} platform campaigns`;
      sendJson(response, 201, {
        campaign: created[0],
        createdCampaigns: created,
        message: first.saveAsDraft
          ? count === 1
            ? "Campaign saved as draft."
            : `${count} campaigns saved as drafts.`
          : drafts.every((draft) => draft.next.status === "active")
            ? `${noun} ${count === 1 ? "is" : "are"} live.`
            : `${noun} scheduled.`,
      });
    } catch (error) {
      sendJson(response, 400, {
        message:
          error instanceof Error
            ? error.message
            : "Unable to create Platform Flash Deal campaign.",
      });
    }
  }

  async function handleSuperAdminCampaignUpdate(request, response, campaignId, action) {
    if (typeof requireSuperAdmin === "function" && !requireSuperAdmin(request, response)) {
      return;
    }
    const fail = (message, statusCode = 400) => {
      const error = new Error(message);
      error.statusCode = statusCode;
      return error;
    };
    try {
      const payload = action === "edit" ? await parseRequestBody(request) : null;
      const { map: productsById } = await loadProductsById();
      const result = await runFlashMutation(async () => {
        const reservations = await readFlashReservations();
        const [campaigns, deals] = await Promise.all([
          readFlashCampaigns({ reservations }),
          readFlashDeals(),
        ]);
        const index = campaigns.findIndex(
          (entry) => String(entry.id || "").trim() === campaignId,
        );
        if (index < 0) throw fail("Campaign not found.", 404);
        const existing = campaigns[index];
        const current = flashDealPricing.deriveCampaignStatus(existing);
        const stamp = nowIso();
        let next = existing;
        let event = "updated";
        if (action === "pause") {
          if (!["active", "scheduled", "budget_exhausted"].includes(current)) {
            throw fail(`A ${current.replace(/_/g, " ")} campaign cannot be paused.`, 409);
          }
          next = { ...existing, status: "paused", updatedAt: stamp };
          event = "paused";
        } else if (action === "resume") {
          if (current !== "paused") throw fail("Only paused campaigns can be resumed.", 409);
          next = { ...existing, status: "scheduled", updatedAt: stamp };
          next.status = flashDealPricing.deriveCampaignStatus(next);
          if (next.status === "ended") {
            throw fail("This campaign is past its end time. Duplicate it instead.", 409);
          }
          event = "resumed";
        } else if (action === "publish") {
          if (current !== "draft") throw fail("Only drafts can be published.", 409);
          const validated = validateCampaignPayload(existing, { registrationsFrom: existing });
          next = {
            ...existing,
            ...validated,
            id: existing.id,
            createdAt: existing.createdAt,
            createdBy: existing.createdBy,
            status: "scheduled",
            updatedAt: stamp,
          };
          next.status = flashDealPricing.deriveCampaignStatus(next);
          event = "published";
        } else if (action === "end") {
          if (current === "ended" || current === "cancelled") {
            throw fail("This campaign has already ended.", 409);
          }
          next = {
            ...existing,
            status: current === "draft" ? "cancelled" : "ended",
            endedAt: stamp,
            updatedAt: stamp,
          };
          event = current === "draft" ? "cancelled" : "ended";
        } else {
          if (current === "ended" || current === "cancelled") {
            throw fail("Ended campaigns cannot be edited. Duplicate it instead.", 409);
          }
          const validated = validateCampaignPayload(payload, { existing });
          next = {
            ...existing,
            ...validated,
            id: existing.id,
            createdAt: existing.createdAt,
            createdBy: existing.createdBy,
            updatedAt: stamp,
          };
          if (existing.status === "paused" || existing.status === "draft") {
            next.status = existing.status;
          } else {
            next.status = flashDealPricing.deriveCampaignStatus({
              ...next,
              status: "scheduled",
            });
          }
        }
        campaigns[index] = next;
        const sync = syncCampaignDeals(deals, reservations, next, productsById);
        await writeFlashCampaigns(campaigns);
        if (sync.changed) {
          await Promise.all([writeFlashDeals(deals), writeFlashReservations(reservations)]);
        }
        return { existing, next, event, deals, current };
      });

      const { existing, next, event, deals, current } = result;
      const wasDraft = current === "draft" && event !== "published";
      const impact = campaignImpact(next, productsById, deals);
      await notifyCampaignEvent({
        event,
        campaign: next,
        impact,
        request,
        sellerIdsOverride: wasDraft ? [] : null,
      });
      if (event === "updated" && !wasDraft) {
        const removed = existing.eligibility.productIds.filter(
          (productId) => !next.eligibility.productIds.includes(productId),
        );
        if (removed.length) {
          const removedSellers = new Map();
          for (const productId of removed) {
            const sellerId = resolveProductSellerAdminId(productsById.get(productId));
            if (!sellerId) continue;
            const entry = removedSellers.get(sellerId) || {
              productIds: [],
              overlapProductIds: [],
            };
            entry.productIds.push(productId);
            removedSellers.set(sellerId, entry);
          }
          await notifyCampaignEvent({
            event: "removed",
            campaign: next,
            impact: { sellers: removedSellers, overlapCount: 0 },
            request,
          });
        }
      }
      const messages = {
        paused: "Campaign paused. Listings are back to regular pricing.",
        resumed: "Campaign resumed.",
        published:
          next.status === "active" ? "Campaign published and live." : "Campaign published and scheduled.",
        ended: "Campaign ended.",
        cancelled: "Draft discarded.",
        updated: "Campaign updated.",
      };
      sendJson(response, 200, {
        campaign: toPublicCampaign(next, { sellerCount: impact.sellers.size }),
        message: messages[event] || "Campaign updated.",
      });
    } catch (error) {
      sendJson(response, error?.statusCode || 400, {
        message:
          error instanceof Error ? error.message : "Unable to update campaign.",
      });
    }
  }

  async function handleSuperAdminCampaignProducts(request, response, requestUrl, campaignId) {
    if (typeof requireSuperAdmin === "function" && !requireSuperAdmin(request, response)) {
      return;
    }
    try {
      const reservations = await readFlashReservations();
      const [campaigns, deals, { map: productsById }] = await Promise.all([
        readFlashCampaigns({ reservations }),
        readFlashDeals(),
        loadProductsById(),
      ]);
      const campaign = campaigns.find(
        (entry) => String(entry.id || "").trim() === campaignId,
      );
      if (!campaign) {
        sendJson(response, 404, { message: "Campaign not found." });
        return;
      }
      const q = String(requestUrl.searchParams.get("q") || "").trim().toLowerCase();
      const window = {
        startMs: Date.parse(campaign.startsAt),
        endMs: Date.parse(campaign.endsAt),
      };
      const productIds = campaign.eligibility.productIds;
      const sellerProfiles = await sellerProfilesById(
        productIds.map((productId) => resolveProductSellerAdminId(productsById.get(productId))),
      );
      const sellerLabels = new Map(
        [...sellerProfiles].map(([id, profile]) => [id, profile.name]),
      );
      const listings = productIds
        .map((productId) => {
          const product = productsById.get(productId);
          const settings = campaign.productSettings?.[productId] || {};
          if (!product) {
            return { id: productId, name: "Listing no longer available", missing: true, settings };
          }
          const choice = toListingChoice(product);
          const deal = deals.find(
            (entry) =>
              String(entry?.campaignId || "").trim() === campaign.id &&
              String(entry?.productId || "").trim() === productId,
          );
          const stockLimit = deal
            ? Number(deal.dealStockLimit) || 0
            : flashDealPricing.campaignDealStockLimit(campaign, product);
          return {
            ...choice,
            sellerLabel: sellerLabels.get(choice.sellerAdminId) || choice.sellerAdminId,
            sellerPictureUrl: sellerProfiles.get(choice.sellerAdminId)?.pictureUrl || "",
            sellerPlatformId:
              sellerProfiles.get(choice.sellerAdminId)?.platformId || productCampaignPlatformId(product),
            settings,
            campaignPrice: flashDealPricing.computeCampaignDealPrice(campaign, choice.sellingPrice),
            dealStockLimit: stockLimit,
            dealStockSold: Number(deal?.dealStockSold) || 0,
            dealStockReserved: Number(deal?.dealStockReserved) || 0,
            dealStockRemaining: deal ? dealRemaining(deal) : stockLimit,
            sellerDealOverlap: Boolean(findSellerDealOverlap(deals, productId, window)),
          };
        })
        .filter((listing) => {
          if (!q) return true;
          return [listing.id, listing.name, listing.sellerLabel]
            .join(" ")
            .toLowerCase()
            .includes(q);
        });
      const usage = campaignUsageFromReservations(reservations).get(campaign.id) || {
        committed: 0,
        subsidyUsed: 0,
        soldQty: 0,
        heldQty: 0,
        revenue: 0,
      };
      sendJson(response, 200, {
        campaign: toPublicCampaign(campaign, { sellerCount: sellerLabels.size }),
        listings,
        stats: usage,
        total: listings.length,
      });
    } catch (error) {
      sendJson(response, 500, {
        message:
          error instanceof Error
            ? error.message
            : "Unable to load eligible products.",
      });
    }
  }

  function isCampaignOpenForRegistration(campaign, nowMs = Date.now()) {
    const status = flashDealPricing.deriveCampaignStatus(campaign, nowMs);
    return status === "scheduled" || status === "active";
  }

  function productOwnedBySeller(product, sellerAdminId) {
    if (!product) return false;
    if (typeof isRecordInAdminScope === "function") {
      return Boolean(isRecordInAdminScope(product, sellerAdminId));
    }
    return resolveProductSellerAdminId(product) === sellerAdminId;
  }

  function sellerCampaignSummary(campaign, sellerAdminId, productsById) {
    const normalized = flashDealPricing.normalizeCampaign(campaign);
    const registeredProductIds = normalized.eligibility.productIds.filter((productId) =>
      productOwnedBySeller(productsById.get(productId), sellerAdminId),
    );
    return {
      id: normalized.id,
      name: campaignPublicName(normalized),
      startsAt: normalized.startsAt,
      endsAt: normalized.endsAt,
      status: flashDealPricing.deriveCampaignStatus(normalized),
      discountValue: normalized.discountValue,
      maxDiscountAmount: normalized.maxDiscountAmount,
      freeShipping: normalized.freeShipping,
      fundingSource: normalized.fundingSource,
      platformSharePct: normalized.platformSharePct,
      fundingText: describeCampaignFunding(normalized),
      schedule: describeCampaignSchedule(normalized),
      registeredProductIds,
      registeredCount: registeredProductIds.length,
      registrationOpen: isCampaignOpenForRegistration(normalized),
    };
  }

  async function sellerPromosAllowed(request, response, requestUrl, sellerAdminId) {
    try {
      const {
        getPlatformSettings,
        isPlatformSettingBlocking,
        buildPlatformBlockedPayload,
      } = require("./platformSettings");
      const platformSettings = await getPlatformSettings();
      if (isPlatformSettingBlocking(platformSettings, "promosAndDiscounts")) {
        sendJson(
          response,
          403,
          buildPlatformBlockedPayload(
            "promosAndDiscounts",
            "Promos and discounts are currently disabled by Super Admin.",
          ),
        );
        return false;
      }
    } catch (settingsError) {
      if (settingsError?.code === "PLATFORM_SETTING_DISABLED") return false;
    }
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
      return false;
    }
    return true;
  }

  async function handleSellerCampaignsList(request, response, requestUrl) {
    const sellerAdminId = requireSellerAdminScope(request, response, requestUrl);
    if (!sellerAdminId) return;
    try {
      const [campaigns, { map: productsById }] = await Promise.all([
        readFlashCampaigns(),
        loadProductsById(),
      ]);
      const openCampaigns = campaigns
        .map((campaign) => flashDealPricing.normalizeCampaign(campaign))
        .filter((campaign) => isCampaignOpenForRegistration(campaign));
      const target = openCampaigns.some(campaignHasTargeting)
        ? await loadSellerTargetContext(sellerAdminId)
        : null;
      const open = openCampaigns
        .filter(
          (campaign) =>
            !target || sellerMatchesCampaignTarget(campaign, target.account, target.storeTypes),
        )
        .sort((a, b) => String(a.startsAt || "").localeCompare(String(b.startsAt || "")))
        .map((campaign) => sellerCampaignSummary(campaign, sellerAdminId, productsById));
      sendJson(response, 200, { campaigns: open, total: open.length, serverNow: nowIso() });
    } catch (error) {
      sendJson(response, 500, {
        message: error instanceof Error ? error.message : "Unable to load Flash Sale campaigns.",
      });
    }
  }

  async function handleSellerCampaignProducts(request, response, requestUrl, campaignId) {
    const sellerAdminId = requireSellerAdminScope(request, response, requestUrl);
    if (!sellerAdminId) return;
    try {
      const [campaigns, deals, { products, map: productsById }] = await Promise.all([
        readFlashCampaigns(),
        readFlashDeals(),
        loadProductsById(),
      ]);
      const campaign = campaigns.find((entry) => String(entry?.id || "").trim() === campaignId);
      if (!campaign || !isCampaignOpenForRegistration(campaign)) {
        sendJson(response, 404, { message: "This Flash Sale is no longer open for registration." });
        return;
      }
      const normalized = flashDealPricing.normalizeCampaign(campaign);
      if (campaignHasTargeting(normalized)) {
        const target = await loadSellerTargetContext(sellerAdminId);
        if (!sellerMatchesCampaignTarget(normalized, target.account, target.storeTypes)) {
          sendJson(response, 403, { message: CAMPAIGN_NOT_TARGETED_MESSAGE });
          return;
        }
      }
      const window = {
        startMs: Date.parse(normalized.startsAt),
        endMs: Date.parse(normalized.endsAt),
      };
      const owned = (products || []).filter((product) => productOwnedBySeller(product, sellerAdminId));
      const listings = owned.map((product) => {
        const choice = toListingChoice(product);
        const registered = normalized.eligibility.productIds.includes(choice.id);
        const otherCampaign = findPlatformCampaignOverlap(campaigns, choice.id, window, {
          excludeCampaignId: normalized.id,
        });
        const issue =
          campaignListingIssue(normalized, product) ||
          (otherCampaign
            ? `Already in “${campaignPublicName(otherCampaign)}” at the same time.`
            : "");
        return {
          ...choice,
          registered,
          eligible: !issue,
          issue,
          settings: normalized.productSettings[choice.id] || {},
          campaignPrice: flashDealPricing.computeCampaignDealPrice(normalized, choice.sellingPrice),
          sellerDealOverlap: Boolean(findSellerDealOverlap(deals, choice.id, window)),
        };
      });
      listings.sort(
        (a, b) =>
          Number(b.registered) - Number(a.registered) ||
          Number(b.eligible) - Number(a.eligible) ||
          a.name.localeCompare(b.name),
      );
      sendJson(response, 200, {
        campaign: sellerCampaignSummary(normalized, sellerAdminId, productsById),
        listings,
        total: listings.length,
      });
    } catch (error) {
      sendJson(response, 500, {
        message: error instanceof Error ? error.message : "Unable to load your listings.",
      });
    }
  }

  async function notifyCampaignRegistration({
    campaign,
    sellerAdminId,
    added,
    removed,
    totalMine,
    request,
  }) {
    const accounts = typeof readAccounts === "function" ? await readAccounts() : [];
    const account =
      typeof findAdminAccountByScopeId === "function"
        ? findAdminAccountByScopeId(accounts, sellerAdminId)
        : null;
    const storeName = resolveSellerAccountLabel(account);
    const publicName = campaignPublicName(campaign);
    const changes = [
      added.length ? `registered ${added.length} listing(s)` : "",
      removed.length ? `withdrew ${removed.length} listing(s)` : "",
    ]
      .filter(Boolean)
      .join(" and ");
    const saMessage = `${storeName} ${changes} in “${campaign.name}”. ${totalMine} of their listing(s) are now in this campaign.`;
    const sellerMessage = totalMine
      ? `${totalMine} of your listing(s) are registered in “${publicName}”, ${describeCampaignSchedule(campaign)}. ${describeCampaignFunding(campaign)}`
      : `You withdrew all your listings from “${publicName}”. Regular pricing applies.`;

    if (
      typeof persistSuperAdminNotification === "function" &&
      typeof createPersistentLinkedNotification === "function"
    ) {
      await persistSuperAdminNotification(
        createPersistentLinkedNotification({
          type: "seller-flash-campaign-registration",
          audience: "super_admin",
          title: added.length ? "Seller registered products in a campaign" : "Seller withdrew products from a campaign",
          reason: "Platform campaign",
          message: saMessage,
          adminId: sellerAdminId,
          companyName: storeName,
          storeName,
          businessName: storeName,
          createdBy: storeName,
          campaignId: campaign.id,
          productId: added[0] || removed[0] || "",
          targetUrl: "/super_admin.html#flash-deals",
        }),
      );
    }

    if (typeof createPersistentLinkedNotification === "function") {
      const notification = createPersistentLinkedNotification({
        type: "flash-deal-campaign-registration",
        audience: "seller",
        title: totalMine ? "Flash Sale registration saved" : "Flash Sale registration withdrawn",
        reason: "Platform campaign",
        message: sellerMessage,
        adminId: sellerAdminId,
        campaignId: campaign.id,
        productId: added[0] || "",
        targetUrl: "/main.html#listing",
      });
      if (account && typeof assignSellerAdminNotification === "function" && typeof writeAccounts === "function") {
        assignSellerAdminNotification(account, notification);
        await writeAccounts(accounts);
      } else if (typeof notifySellerAdminInboxByAdminId === "function") {
        await notifySellerAdminInboxByAdminId(sellerAdminId, notification);
      }
    }

    if (typeof logActivitySafely === "function") {
      await logActivitySafely(
        {
          id: `activity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          type: "seller-admin-action",
          source: "seller_admin",
          adminId: sellerAdminId,
          action: "flash-campaign-registration",
          title: "Flash Sale registration updated",
          description: `${storeName} ${changes} in “${campaign.name}” (${campaign.id}).`,
          actor: { role: "seller-admin", accountId: sellerAdminId, displayName: storeName },
          createdAt: nowIso(),
          skipLinkedNotification: true,
        },
        request,
      );
    }
  }

  async function handleSellerCampaignRegister(request, response, requestUrl, campaignId) {
    const sellerAdminId = requireSellerAdminScope(request, response, requestUrl);
    if (!sellerAdminId) return;
    if (!(await sellerPromosAllowed(request, response, requestUrl, sellerAdminId))) return;
    const fail = (message, statusCode = 400) => {
      const error = new Error(message);
      error.statusCode = statusCode;
      return error;
    };
    try {
      const payload = await parseRequestBody(request);
      const rows = Array.isArray(payload?.products) ? payload.products : [];
      const requestedSettings = {};
      for (const row of rows) {
        const productId = String(row?.productId || "").trim();
        if (productId) {
          requestedSettings[productId] = {
            dealStock: row?.dealStock,
            perBuyerLimit: row?.perBuyerLimit,
          };
        }
      }
      const requested = flashDealPricing.normalizeProductSettings(requestedSettings);
      const requestedIds = Object.keys(requested);
      const [{ map: productsById }, target] = await Promise.all([
        loadProductsById(),
        loadSellerTargetContext(sellerAdminId),
      ]);

      const result = await runFlashMutation(async () => {
        const reservations = await readFlashReservations();
        const [campaigns, deals] = await Promise.all([
          readFlashCampaigns({ reservations }),
          readFlashDeals(),
        ]);
        const index = campaigns.findIndex((entry) => String(entry?.id || "").trim() === campaignId);
        if (index < 0) throw fail("Campaign not found.", 404);
        const campaign = flashDealPricing.normalizeCampaign(campaigns[index]);
        if (!isCampaignOpenForRegistration(campaign)) {
          throw fail("This Flash Sale is no longer open for registration.", 409);
        }
        if (!sellerMatchesCampaignTarget(campaign, target.account, target.storeTypes)) {
          throw fail(CAMPAIGN_NOT_TARGETED_MESSAGE, 403);
        }
        const window = {
          startMs: Date.parse(campaign.startsAt),
          endMs: Date.parse(campaign.endsAt),
        };
        const currentIds = campaign.eligibility.productIds;
        const mine = currentIds.filter((productId) =>
          productOwnedBySeller(productsById.get(productId), sellerAdminId),
        );
        for (const productId of requestedIds) {
          const product = productsById.get(productId);
          if (!productOwnedBySeller(product, sellerAdminId)) {
            throw fail("You can only register your own listings.", 403);
          }
          const issue = campaignListingIssue(campaign, product, requested[productId]);
          if (issue) throw fail(issue);
          const otherCampaign = findPlatformCampaignOverlap(campaigns, productId, window, {
            excludeCampaignId: campaign.id,
          });
          if (otherCampaign) {
            throw fail(
              `“${product.name || productId}” is already in “${campaignPublicName(otherCampaign)}” at the same time.`,
            );
          }
        }
        const others = currentIds.filter((productId) => !mine.includes(productId));
        const productIds = [...others, ...requestedIds];
        if (productIds.length > MAX_CAMPAIGN_LISTINGS) {
          throw fail(`This campaign is full (${MAX_CAMPAIGN_LISTINGS} listings max).`);
        }
        const productSettings = { ...campaign.productSettings };
        for (const productId of mine) delete productSettings[productId];
        Object.assign(productSettings, requested);
        const next = {
          ...campaigns[index],
          eligibility: { ...campaign.eligibility, scope: "products", productIds },
          productSettings,
          updatedAt: nowIso(),
        };
        campaigns[index] = next;
        const sync = syncCampaignDeals(deals, reservations, flashDealPricing.normalizeCampaign(next), productsById);
        await writeFlashCampaigns(campaigns);
        if (sync.changed) {
          await Promise.all([writeFlashDeals(deals), writeFlashReservations(reservations)]);
        }
        return {
          campaign: flashDealPricing.normalizeCampaign(next),
          added: requestedIds.filter((productId) => !mine.includes(productId)),
          removed: mine.filter((productId) => !requestedIds.includes(productId)),
        };
      });

      const { campaign, added, removed } = result;
      if (added.length || removed.length) {
        await notifyCampaignRegistration({
          campaign,
          sellerAdminId,
          added,
          removed,
          totalMine: requestedIds.length,
          request,
        });
      }
      sendJson(response, 200, {
        campaign: sellerCampaignSummary(campaign, sellerAdminId, productsById),
        added,
        removed,
        message: requestedIds.length
          ? `${requestedIds.length} listing(s) registered in “${campaignPublicName(campaign)}”.`
          : `You withdrew from “${campaignPublicName(campaign)}”.`,
      });
    } catch (error) {
      sendJson(response, error?.statusCode || 400, {
        message: error instanceof Error ? error.message : "Unable to save your registration.",
      });
    }
  }

  async function handleSuperAdminCreate(request, response) {
    if (typeof requireSuperAdmin === "function" && !requireSuperAdmin(request, response)) {
      return;
    }
    try {
      const payload = await parseRequestBody(request);
      const productId = String(payload?.productId || "").trim();
      if (!productId) {
        throw new Error("Listing is required.");
      }
      const product = await findCatalogProduct(productId);
      const sellerAdminId = resolveProductSellerAdminId(product);
      if (!sellerAdminId) {
        throw new Error("This listing has no seller admin, so it cannot get a Flash Deal.");
      }
      const validated = validateDealPayload(
        { ...payload, dealType: flashDealPricing.DEAL_TYPE_PLATFORM },
        { product },
      );
      const deals = await readFlashDeals();
      const conflict = deals.find(
        (entry) =>
          String(entry.productId || "").trim() === productId &&
          flashDealPricing.isPlatformBlockingDeal(entry),
      );
      if (conflict) {
        throw new Error(
          "This listing already has an active Platform Flash Deal. End it first or raise campaign priority.",
        );
      }
      const sellerOverlap = deals.find(
        (entry) =>
          String(entry.productId || "").trim() === productId &&
          flashDealPricing.isSellerBlockingDeal(entry),
      );
      const reviewerId =
        typeof getRequestAdminId === "function"
          ? String(getRequestAdminId(request, null, "") || "").trim()
          : "";
      const stamp = nowIso();
      const next = {
        id: newDealId(),
        productId,
        sellerAdminId,
        ...validated,
        dealType: flashDealPricing.DEAL_TYPE_PLATFORM,
        fundingSource: flashDealPricing.normalizeFundingSource(
          payload?.fundingSource,
          flashDealPricing.DEAL_TYPE_PLATFORM,
        ),
        priority: Number(payload?.priority) || 100,
        campaignId: String(payload?.campaignId || "").trim(),
        dealStockSold: 0,
        dealStockReserved: 0,
        status: "upcoming",
        approvalStatus: "approved",
        createdAt: stamp,
        updatedAt: stamp,
        createdBy: reviewerId || "super-admin",
        createdByRole: "super_admin",
        approvedBy: reviewerId || "super-admin",
      };
      next.status = deriveDealStatus(next);
      await writeFlashDeals([next, ...deals]);
      await notifySuperAdminCreatedFlashDeal({
        deal: next,
        sellerAdminId,
        request,
      });
      sendJson(response, 201, {
        deal: toPublicDeal(next, {
          sellerDealActive: Boolean(sellerOverlap),
          overlapWarning: sellerOverlap ? OVERLAP_WARNING : "",
        }),
        message:
          next.status === "live"
            ? "Platform Flash Deal is live."
            : "Platform Flash Deal scheduled.",
      });
    } catch (error) {
      sendJson(response, 400, {
        message:
          error instanceof Error ? error.message : "Unable to create Flash Deal.",
      });
    }
  }

  async function handleSuperAdminList(request, response, requestUrl) {
    if (typeof requireSuperAdmin === "function" && !requireSuperAdmin(request, response)) {
      return;
    }
    try {
      await tickFlashDealLifecycle();
      const deals = await readFlashDeals();
      const [products, archivedProducts, accounts] = await Promise.all([
        typeof readProducts === "function" ? readProducts() : [],
        typeof readApprovedProductTrainingRecords === "function"
          ? readApprovedProductTrainingRecords()
          : [],
        typeof readAccounts === "function" ? readAccounts() : [],
      ]);
      const productsById = new Map();
      for (const product of Array.isArray(archivedProducts) ? archivedProducts : []) {
        productsById.set(String(product?.id || "").trim(), product);
      }
      for (const product of Array.isArray(products) ? products : []) {
        productsById.set(String(product?.id || "").trim(), product);
      }
      const sourceFilter = String(requestUrl?.searchParams?.get("source") || "")
        .trim()
        .toLowerCase();
      const sorted = [...deals]
        .filter((deal) => {
          if (!sourceFilter || sourceFilter === "all") return true;
          const type = flashDealPricing.normalizeDealType(deal);
          return type === sourceFilter;
        })
        .sort((a, b) =>
          String(b.updatedAt || b.createdAt || "").localeCompare(
            String(a.updatedAt || a.createdAt || ""),
          ),
        );
      sendJson(response, 200, {
        deals: sorted.map((deal) => {
          const product = productsById.get(String(deal.productId || "").trim());
          const sellerAccount =
            typeof findAdminAccountByScopeId === "function"
              ? findAdminAccountByScopeId(accounts, deal.sellerAdminId)
              : null;
          const catalogImages = collectProductListingImages(
            product,
            deal.variantId,
          );
          const snapshotImages = Array.isArray(deal.listingImagesSnapshot)
            ? deal.listingImagesSnapshot
                .map((imageUrl) => String(imageUrl || "").trim())
                .filter(Boolean)
            : [];
          return {
            ...toPublicDeal(deal),
            productName:
              String(product?.name || "").trim() ||
              String(deal.productName || "").trim(),
            companyName:
              (sellerAccount
                ? resolveSellerAccountLabel(sellerAccount)
                : String(product?.companyName || product?.storeName || "").trim()) ||
              "Seller store",
            companyProfileImageUrl:
              resolveSellerCompanyPicture(sellerAccount) ||
              resolveSellerCompanyPicture(product),
            listingImages: catalogImages.length ? catalogImages : snapshotImages,
          };
        }),
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

    if (pathname === "/api/flash-deals/resolve") {
      if (request.method === "GET") {
        try {
          const productId = String(requestUrl.searchParams.get("productId") || "").trim();
          const variantId = String(requestUrl.searchParams.get("variantId") || "").trim();
          if (!productId) {
            sendJson(response, 400, { message: "productId is required." });
            return true;
          }
          await tickFlashDealLifecycle();
          const resolved = await resolveForProduct(productId, variantId);
          sendJson(response, 200, {
            ...flashDealPricing.buildPriceSnapshot(resolved),
            ...resolved,
            deal: resolved.deal ? toPublicDeal(resolved.deal) : null,
            sellerDeal: resolved.sellerDeal
              ? toPublicDeal(resolved.sellerDeal)
              : null,
            serverNow: new Date().toISOString(),
            priceUpdatedMessage:
              resolved.dealType
                ? ""
                : "The Flash Deal for this item has ended. The price has been updated.",
          });
        } catch (error) {
          sendJson(response, 500, {
            message:
              error instanceof Error
                ? error.message
                : "Unable to resolve Flash Deal price.",
          });
        }
        return true;
      }
      sendJson(response, 405, { message: "Method not allowed." });
      return true;
    }

    if (pathname === "/api/super-admin/flash-deal-campaigns") {
      if (request.method === "GET") {
        await handleSuperAdminCampaignsList(request, response);
        return true;
      }
      if (request.method === "POST") {
        await handleSuperAdminCampaignCreate(request, response);
        return true;
      }
      sendJson(response, 405, { message: "Method not allowed." });
      return true;
    }

    const campaignProductsMatch = pathname.match(
      /^\/api\/super-admin\/flash-deal-campaigns\/([^/]+)\/products$/,
    );
    if (campaignProductsMatch) {
      const campaignId = decodeURIComponent(campaignProductsMatch[1] || "").trim();
      if (request.method === "GET") {
        await handleSuperAdminCampaignProducts(
          request,
          response,
          requestUrl,
          campaignId,
        );
        return true;
      }
      sendJson(response, 405, { message: "Method not allowed." });
      return true;
    }

    const campaignActionMatch = pathname.match(
      /^\/api\/super-admin\/flash-deal-campaigns\/([^/]+)\/(pause|resume|end|publish)$/,
    );
    if (campaignActionMatch) {
      const campaignId = decodeURIComponent(campaignActionMatch[1] || "").trim();
      const action = campaignActionMatch[2];
      if (request.method === "POST") {
        await handleSuperAdminCampaignUpdate(
          request,
          response,
          campaignId,
          action,
        );
        return true;
      }
      sendJson(response, 405, { message: "Method not allowed." });
      return true;
    }

    const campaignItemMatch = pathname.match(
      /^\/api\/super-admin\/flash-deal-campaigns\/([^/]+)$/,
    );
    if (campaignItemMatch) {
      const campaignId = decodeURIComponent(campaignItemMatch[1] || "").trim();
      if (request.method === "PUT") {
        await handleSuperAdminCampaignUpdate(
          request,
          response,
          campaignId,
          "edit",
        );
        return true;
      }
      sendJson(response, 405, { message: "Method not allowed." });
      return true;
    }

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
          const campaigns = await readFlashCampaigns();
          const nowMs = Date.now();
          const { map: productsById } = await loadProductsById();
          const winners =
            statusFilter === "live" || !statusFilter
              ? flashDealPricing.winningLiveDealsByProduct({
                  deals,
                  campaigns,
                  productsById,
                  nowMs,
                })
              : [];
          const live = (
            statusFilter === "live" || !statusFilter
              ? winners.map((resolved) => {
                  const publicDeal = toPublicDeal(resolved.deal, {
                    dealType: resolved.dealType,
                    campaignId: resolved.campaignId,
                    overriddenByPlatform: resolved.overridden,
                  });
                  return { deal: resolved.deal, publicDeal };
                })
              : deals.map((deal) => {
                  const publicDeal = toPublicDeal(deal);
                  return { deal, publicDeal };
                })
          )
            .filter(({ deal, publicDeal }) => {
              if (effectiveApprovalStatus(deal) !== "approved") {
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

    if (pathname === "/api/super-admin/flash-deals/listings") {
      if (request.method === "GET") {
        await handleSuperAdminListings(request, response, requestUrl);
        return true;
      }
      sendJson(response, 405, { message: "Method not allowed." });
      return true;
    }

    if (pathname === "/api/super-admin/flash-deals") {
      if (request.method === "GET") {
        await handleSuperAdminList(request, response, requestUrl);
        return true;
      }
      if (request.method === "POST") {
        await handleSuperAdminCreate(request, response);
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

    if (pathname === "/api/admin/flash-deal-campaigns") {
      if (request.method === "GET") {
        await handleSellerCampaignsList(request, response, requestUrl);
        return true;
      }
      sendJson(response, 405, { message: "Method not allowed." });
      return true;
    }

    const sellerCampaignMatch = pathname.match(
      /^\/api\/admin\/flash-deal-campaigns\/([^/]+)\/(products|registration)$/,
    );
    if (sellerCampaignMatch) {
      const campaignId = decodeURIComponent(sellerCampaignMatch[1] || "").trim();
      if (sellerCampaignMatch[2] === "products" && request.method === "GET") {
        await handleSellerCampaignProducts(request, response, requestUrl, campaignId);
        return true;
      }
      if (sellerCampaignMatch[2] === "registration" && request.method === "PUT") {
        await handleSellerCampaignRegister(request, response, requestUrl, campaignId);
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
    resolveProductPrice: resolveForProduct,
    readFlashCampaigns,
  };
}

module.exports = {
  createFlashDealsApi,
};
