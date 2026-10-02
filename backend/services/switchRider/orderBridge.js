"use strict";

const { SWITCH_RIDER_PARTNER_NAME } = require("./constants");
const { srError } = require("./core");

const SWITCH_RIDER_NAME_KEY = SWITCH_RIDER_PARTNER_NAME.toLowerCase();

function isSwitchRiderPartnerName(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim().toLowerCase() === SWITCH_RIDER_NAME_KEY;
}

function isSwitchRiderOrderEntry(entry) {
  return isSwitchRiderPartnerName(entry?.deliveryPartnerName ?? entry?.deliveryProvider ?? entry?.courier);
}

/**
 * Glue between Switch Rider jobs and the existing order records. Orders stay
 * the source of truth for the purchase; delivery jobs never duplicate them —
 * they only mirror courier status back onto the order (like the Lalamove webhook).
 */
function createSwitchRiderOrderBridge(deps) {
  const {
    readOrders,
    writeOrders,
    catalogWriteScope,
    normalizeStoredOrderEntry,
    isScopedOrderGroupEntry,
    isCodPaymentOption,
    readProducts,
    writeProducts,
    isRecordInAdminScope,
    readAccounts,
    findAdminAccountByScopeId,
    logger = console,
  } = deps;
  let service = null;

  function attachService(nextService) {
    service = nextService;
  }

  function groupKeyForEntry(entry) {
    return [String(entry?.adminId ?? ""), String(entry?.accountId ?? ""), String(Math.trunc(Number(entry?.createdAtEpochMs) || 0))].join("|");
  }

  async function resolveSellerName(adminId) {
    try {
      const account = findAdminAccountByScopeId(await readAccounts(), adminId);
      return String(account?.companyName || account?.storeName || account?.businessName || "").trim();
    } catch (_) {
      return "";
    }
  }

  function summarizeOrderGroup(entries, { sellerName = "" } = {}) {
    const primary = entries[0];
    const isCod = isCodPaymentOption(primary?.paymentOptionLabel ?? primary?.paymentOption ?? primary?.paymentMethod);
    const quantity = entries.reduce((sum, entry) => sum + Math.max(1, Math.trunc(Number(entry?.quantity) || 1)), 0);
    return {
      orderGroupId: String(primary?.orderGroupId || "").trim() || groupKeyForEntry(primary),
      createdAtEpochMs: Math.trunc(Number(primary?.createdAtEpochMs) || 0),
      sellerAdminId: String(primary?.adminId || "").trim(),
      buyerAccountId: String(primary?.accountId || "").trim(),
      sellerName,
      customerName: String(primary?.clientName || primary?.customerName || "").trim(),
      customerPhone: String(primary?.clientContactNumber || primary?.contactNumber || "").trim(),
      dropoffAddress: String(primary?.clientAddress || primary?.address || "").trim(),
      dropoff: { lat: primary?.clientLatitude ?? primary?.deliveryLatitude, lng: primary?.clientLongitude ?? primary?.deliveryLongitude },
      customerDeliveryFee: Math.max(0, Number(primary?.shippingFeeAmount) || 0),
      isCod,
      codAmount: isCod ? Math.max(0, Number(primary?.remainingBalanceAmount) || 0) : 0,
      packageCount: 1,
      packageNotes: `${quantity} item${quantity === 1 ? "" : "s"}`,
      isPacked: entries.every((entry) => String(entry?.stage || "") === "toShip"),
      isSwitchRider: entries.every(isSwitchRiderOrderEntry),
      stage: String(primary?.stage || ""),
    };
  }

  async function loadSellerOrderGroup({ adminId, orderGroupId }) {
    const orders = await readOrders({ adminId });
    const entries = orders.filter((entry) => isScopedOrderGroupEntry(entry, adminId, orderGroupId));
    if (!entries.length) return null;
    return summarizeOrderGroup(entries, { sellerName: await resolveSellerName(adminId) });
  }

  /**
   * Validates Switch Rider quotes for *new* order groups in a checkout payload.
   * Must run on the raw payload because order normalization drops unknown fields.
   * Returns the pending job creations to run after the orders are written.
   */
  function prepareCheckout({ rawPayload, incomingOrders, existingOrders, buyerAccountId }) {
    const rawEntries = Array.isArray(rawPayload?.orders) ? rawPayload.orders : Array.isArray(rawPayload) ? rawPayload : [];
    const tokenByEntryId = new Map();
    for (const raw of rawEntries) {
      const token = String(raw?.switchRiderQuoteToken ?? "").trim();
      if (token) tokenByEntryId.set(String(raw?.id ?? "").trim(), token);
    }
    const existingGroupKeys = new Set((existingOrders || []).map(groupKeyForEntry));
    const groups = new Map();
    for (const entry of incomingOrders || []) {
      if (!isSwitchRiderOrderEntry(entry)) continue;
      const key = groupKeyForEntry(entry);
      if (existingGroupKeys.has(key)) continue;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(entry);
    }
    if (!groups.size) return [];
    if (!service) throw srError(503, "SWITCH_RIDER_UNAVAILABLE", "Switch Rider is not available right now. Choose another delivery option.");

    const pending = [];
    for (const [key, entries] of groups) {
      const summary = summarizeOrderGroup(entries);
      if (buyerAccountId && summary.buyerAccountId !== buyerAccountId) continue;
      const token = entries.map((entry) => tokenByEntryId.get(String(entry.id))).find(Boolean);
      if (!token) {
        throw srError(409, "SWITCH_RIDER_QUOTE_REQUIRED", "Switch Rider needs a fresh delivery quote. Review the delivery fee and place the order again.");
      }
      const freeShippingClaimed = entries.some(
        (entry) => String(entry?.shippingVoucherId || entry?.shippingVoucherCode || "").trim() || String(entry?.flashDealId || "").trim(),
      );
      const lockedPricing = service.validateCheckoutQuote(token, {
        sellerAdminId: summary.sellerAdminId,
        buyerAccountId: summary.buyerAccountId,
        dropoff: summary.dropoff,
        customerFee: summary.customerDeliveryFee,
        freeShippingClaimed,
      });
      pending.push({ key, lockedPricing, adminId: summary.sellerAdminId, accountId: summary.buyerAccountId, createdAtEpochMs: summary.createdAtEpochMs });
    }
    return pending;
  }

  /** After the orders are written (and have orderGroupIds), create the delivery jobs. */
  async function createJobsAfterCheckout(pending) {
    if (!pending?.length || !service) return [];
    const created = [];
    for (const item of pending) {
      try {
        const orders = await readOrders({ accountId: item.accountId });
        const entries = orders.filter((entry) => groupKeyForEntry(entry) === item.key);
        if (!entries.length) continue;
        const summary = summarizeOrderGroup(entries, { sellerName: await resolveSellerName(item.adminId) });
        const actor = { type: "buyer", id: item.accountId };
        const result = await service.createJobForOrder(summary, { lockedPricing: item.lockedPricing, actor });
        created.push(result.job?.delivery_code);
        if (result.created && result.job?.id) {
          await service.startDispatchAfterCheckout(result.job.id, { actor });
        }
      } catch (error) {
        // The seller can still create the job via "Ready for Rider" (server-recalculated pricing).
        logger.error?.("[switch-rider] job creation after checkout failed:", error?.message || error);
      }
    }
    return created;
  }

  function courierFieldsFor(job, event) {
    return {
      courierProvider: "switch_rider",
      courierShipmentId: job.delivery_code,
      courierShipmentMode: "switch_rider",
      courierShipmentStatus: String(event).toLowerCase(),
      courierProviderStatus: job.status,
      courierDriverId: job.rider_id || "",
      courierUpdatedAt: new Date().toISOString(),
      trackingNumber: job.delivery_code,
    };
  }

  async function incrementProductSales(adminId, entries) {
    const salesByProductId = new Map();
    for (const entry of entries) {
      const productId = String(entry?.productId || "").trim();
      const quantity = Math.max(0, Math.trunc(Number(entry?.quantity) || 0));
      if (productId && quantity > 0) salesByProductId.set(productId, (salesByProductId.get(productId) || 0) + quantity);
    }
    if (!salesByProductId.size) return;
    const products = await readProducts();
    let changed = false;
    const nextProducts = products.map((product) => {
      if (!isRecordInAdminScope(product, adminId)) return product;
      const quantity = salesByProductId.get(String(product?.id || "").trim()) || 0;
      if (quantity <= 0) return product;
      changed = true;
      const currentSold = Math.max(0, Math.trunc(Number(product?.sold) || 0));
      return { ...product, sold: currentSold + quantity, updatedAt: new Date().toISOString() };
    });
    if (changed) await writeProducts(nextProducts, catalogWriteScope({ adminId }));
  }

  /**
   * Mirrors a delivery event onto the order rows:
   *   PICKED_UP → order moves to To Receive (same as the seller "Ship" action)
   *   everything else → courier status only; the buyer still confirms receipt as with other couriers
   */
  async function applyCourierUpdate(job, event) {
    const adminId = job.seller_admin_id;
    const orders = await readOrders();
    const groupKey = job.order_group_id;
    const matches = (entry) =>
      isScopedOrderGroupEntry(entry, adminId, groupKey) ||
      (Number(job.order_created_at_epoch_ms) > 0 &&
        isScopedOrderGroupEntry(entry, adminId, String(job.order_created_at_epoch_ms)) &&
        String(entry?.accountId || "") === job.buyer_account_id);
    const groupEntries = orders.filter(matches);
    if (!groupEntries.length) return 0;

    const nowMs = Date.now();
    const movingToReceive = event === "PICKED_UP" && groupEntries.some((entry) => String(entry?.stage) !== "toReceive");
    const nextOrders = orders.map((entry) => {
      if (!matches(entry)) return entry;
      const next = { ...entry, ...courierFieldsFor(job, event) };
      if (event === "PICKED_UP" && !["toReceive", "toReview", "cancelled"].includes(String(entry?.stage))) {
        next.stage = "toReceive";
        next.shippedAt = new Date(nowMs).toISOString();
        next.shippedAtEpochMs = nowMs;
      }
      return normalizeStoredOrderEntry(next);
    });
    if (movingToReceive) await incrementProductSales(adminId, groupEntries.filter((entry) => String(entry?.stage) !== "toReceive"));
    await writeOrders(nextOrders, catalogWriteScope({ adminId }));
    return groupEntries.length;
  }

  /** Safety net: cancel pre-pickup jobs whose order group was cancelled through any path. */
  async function reconcileCancelledOrders() {
    if (!service) return 0;
    const jobs = await service.listPrePickupJobsForReconcile();
    if (!jobs.length) return 0;
    const orders = await readOrders();
    let cancelled = 0;
    for (const job of jobs) {
      const entries = orders.filter(
        (entry) =>
          isScopedOrderGroupEntry(entry, job.seller_admin_id, job.order_group_id) ||
          (isScopedOrderGroupEntry(entry, job.seller_admin_id, String(job.order_created_at_epoch_ms)) &&
            String(entry?.accountId || "") === job.buyer_account_id),
      );
      const orderCancelled = entries.length > 0 && entries.every((entry) => String(entry?.stage) === "cancelled");
      if (!orderCancelled) continue;
      try {
        await service.cancelJob(job.id, { reason: "Order was cancelled", fromOrderCancellation: true }, { type: "system", id: "order-sync" });
        cancelled += 1;
      } catch (error) {
        logger.warn?.("[switch-rider] reconcile cancel failed:", error?.message || error);
      }
    }
    return cancelled;
  }

  return {
    attachService,
    loadSellerOrderGroup,
    prepareCheckout,
    createJobsAfterCheckout,
    applyCourierUpdate,
    reconcileCancelledOrders,
    summarizeOrderGroup,
  };
}

module.exports = {
  createSwitchRiderOrderBridge,
  isSwitchRiderOrderEntry,
  isSwitchRiderPartnerName,
};
