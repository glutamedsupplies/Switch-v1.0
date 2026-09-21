"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  parsePagination,
  paginateArray,
  assignOrderGroupIds,
  groupOrderEntries,
  orderEntryMatchesGroupKey,
  productToRow,
  rowToProduct,
  variantToRow,
  rowToVariant,
  storeTypeToRow,
  rowToStoreType,
  storeTypeCategoryRecords,
  orderItemToRow,
  orderGroupToRow,
  rowToOrderEntry,
  movementsFromOrderEntry,
  movementsFromProductStockHistory,
  stableStoreTypeId,
  stableOrderGroupId,
  stableVariantId,
  stableOrderItemId,
  resolveOrderLifecycleTimestamps,
  resolveOrderPaymentAndTracking,
  isCatalogJsonBackupEnabled,
} = require("../db/catalogHelpers");

test("parsePagination stays disabled without limit/offset/cursor", () => {
  const params = new URLSearchParams();
  const pagination = parsePagination(params);
  assert.equal(pagination.enabled, false);
  assert.equal(pagination.limit, null);
});

test("parsePagination clamps limit and offset", () => {
  const params = new URLSearchParams("limit=9999&offset=-4");
  const pagination = parsePagination(params, { maxLimit: 100 });
  assert.equal(pagination.enabled, true);
  assert.equal(pagination.limit, 100);
  assert.equal(pagination.offset, 0);
});

test("paginateArray slices and reports hasMore", () => {
  const page = paginateArray(["a", "b", "c", "d"], { enabled: true, limit: 2, offset: 2 });
  assert.deepEqual(page.items, ["c", "d"]);
  assert.equal(page.total, 4);
  assert.equal(page.hasMore, false);
});

test("assignOrderGroupIds preserves existing group ids on client resync", () => {
  const existing = assignOrderGroupIds([
    { id: "line-1", adminId: "seller-1", accountId: "buyer-1", createdAtEpochMs: 100 },
  ]);
  const resynced = assignOrderGroupIds(
    [{ id: "line-1", adminId: "seller-1", accountId: "buyer-1", createdAtEpochMs: 100 }],
    { existingEntries: existing },
  );
  assert.equal(resynced[0].orderGroupId, existing[0].orderGroupId);

  const extraLine = assignOrderGroupIds(
    [{ id: "line-2", adminId: "seller-1", accountId: "buyer-1", createdAtEpochMs: 100 }],
    { existingEntries: existing },
  );
  assert.equal(extraLine[0].orderGroupId, existing[0].orderGroupId);
});

test("assignOrderGroupIds stable mode is deterministic", () => {
  const first = assignOrderGroupIds(
    [{ id: "line-1", adminId: "seller-1", accountId: "buyer-1", createdAtEpochMs: 42 }],
    { mode: "stable" },
  );
  const second = assignOrderGroupIds(
    [{ id: "line-1", adminId: "seller-1", accountId: "buyer-1", createdAtEpochMs: 42 }],
    { mode: "stable" },
  );
  assert.equal(first[0].orderGroupId, second[0].orderGroupId);
  assert.equal(
    first[0].orderGroupId,
    stableOrderGroupId({ adminId: "seller-1", accountId: "buyer-1", createdAtEpochMs: 42 }),
  );
});

test("orderEntryMatchesGroupKey accepts orderGroupId or createdAtEpochMs", () => {
  const entry = {
    orderGroupId: "og_abc",
    createdAtEpochMs: 1710000000000,
  };
  assert.equal(orderEntryMatchesGroupKey(entry, "og_abc"), true);
  assert.equal(orderEntryMatchesGroupKey(entry, "1710000000000"), true);
  assert.equal(orderEntryMatchesGroupKey(entry, "og_other"), false);
});

test("product row mapping round-trips core fields and extra_data", () => {
  const product = {
    id: "prd-1",
    adminId: "seller-1",
    name: "Niacinamide serum",
    description: "Brighten",
    approvalStatus: "approved",
    isActive: true,
    originalPrice: 499,
    salesPrice: 399,
    stock: 12,
    sold: 3,
    barcode: "123456",
    category: "Skincare",
    categories: ["Skincare", "Face"],
    rating: 4.5,
    commentCount: 2,
    imageUrl: "/uploads/a.jpg",
    visualSearchFingerprint: { hash: "abc" },
    variants: [
      {
        id: "var-1",
        name: "30ml",
        quantity: "30ml",
        imageUrl: "/uploads/a.jpg",
        originalPrice: 499,
        salesPrice: 399,
        stock: 8,
        addOns: [{ id: "prd-add", name: "Pump", quantity: 1 }],
      },
    ],
  };

  const row = productToRow(product);
  assert.equal(row.admin_id, "seller-1");
  assert.equal(row.category, "Skincare");
  assert.equal(row.extra_data.visualSearchFingerprint.hash, "abc");
  assert.equal(row.extra_data.variants, undefined);

  const variantRow = variantToRow(product.variants[0], product.id, 0);
  const restored = rowToProduct(row, [rowToVariant(variantRow)], ["Skincare", "Face"], ["cat_1"]);
  assert.equal(restored.name, "Niacinamide serum");
  assert.equal(restored.salesPrice, 399);
  assert.deepEqual(restored.categories, ["Skincare", "Face"]);
  assert.equal(restored.variants[0].addOns[0].name, "Pump");
  assert.equal(restored.visualSearchFingerprint.hash, "abc");
});

test("store type mapping keeps nested category details and stable ids", () => {
  const storeType = {
    name: "Beauty Retail",
    status: "active",
    commissionRate: 8,
    serviceFee: 15,
    categories: ["Skincare", "Makeup"],
    categoryDetails: [
      { name: "Skincare", productCount: 4, status: "active", imageUrl: "/uploads/skin.jpg" },
    ],
  };
  const row = storeTypeToRow(storeType);
  assert.equal(row.id, stableStoreTypeId("Beauty Retail"));
  const categories = storeTypeCategoryRecords(storeType, row.id);
  assert.equal(categories.length, 2);
  assert.equal(categories[0].store_type_id, row.id);
  const restored = rowToStoreType(row, categories.map((category) => ({
    id: category.id,
    name: category.name,
    productCount: category.product_count,
    imageUrl: category.image_url,
    iconImageUrl: category.icon_image_url,
    iconName: category.icon_name,
    status: category.status,
  })));
  assert.deepEqual(restored.categories, ["Skincare", "Makeup"]);
  assert.equal(restored.categoryDetails[0].imageUrl, "/uploads/skin.jpg");
});

test("order group mapping reconstructs line items with orderGroupId", () => {
  const entries = assignOrderGroupIds(
    [
      {
        id: "ord-1",
        adminId: "seller-1",
        accountId: "buyer-1",
        productId: "prd-1",
        productName: "Serum",
        quantity: 2,
        unitPrice: 100,
        stage: "toPrepare",
        createdAtEpochMs: 1710000000000,
        clientName: "Ada",
      },
    ],
    { mode: "stable" },
  );
  const groups = groupOrderEntries(entries);
  assert.equal(groups.length, 1);
  const groupRow = orderGroupToRow(groups[0]);
  const itemRow = orderItemToRow(groups[0].items[0], groups[0].orderGroupId);
  const restored = rowToOrderEntry(itemRow, groupRow);
  assert.equal(restored.orderGroupId, groups[0].orderGroupId);
  assert.equal(restored.productId, "prd-1");
  assert.equal(restored.clientName, "Ada");
  assert.equal(restored.createdAtEpochMs, 1710000000000);
  assert.ok(itemRow.paid_at, "toPrepare implies paid_at");
  assert.equal(itemRow.packed_at, null);
  assert.equal(itemRow.id, "ord-1");
});

test("variant ids stay stable when JSON omits them", () => {
  const first = variantToRow({ name: "30ml", originalPrice: 10 }, "prd-1", 0);
  const second = variantToRow({ name: "30ml", originalPrice: 10 }, "prd-1", 0);
  assert.equal(first.id, second.id);
  assert.equal(first.id, stableVariantId({ productId: "prd-1", name: "30ml", sortOrder: 0 }));
});

test("order line ids keep JSON values and hash only when missing", () => {
  const kept = orderItemToRow({
    id: "ord-json-1",
    productId: "prd-1",
    variantId: "var-1",
    stage: "toPay",
  }, "og_abc", 0);
  assert.equal(kept.id, "ord-json-1");

  const minted = orderItemToRow({
    productId: "prd-1",
    variantId: "var-1",
    stage: "toPay",
  }, "og_abc", 0);
  const again = orderItemToRow({
    productId: "prd-1",
    variantId: "var-1",
    stage: "toPay",
  }, "og_abc", 0);
  assert.equal(minted.id, again.id);
  assert.equal(
    minted.id,
    stableOrderItemId({ orderGroupId: "og_abc", productId: "prd-1", variantId: "var-1", index: 0 }),
  );
});

test("order lifecycle timestamps follow real stages", () => {
  const unpaid = resolveOrderLifecycleTimestamps({
    stage: "toPay",
    createdAtEpochMs: 1710000000000,
  });
  assert.equal(unpaid.paidAt, null);
  assert.equal(unpaid.packedAt, null);

  const paid = resolveOrderLifecycleTimestamps({
    stage: "toPrepare",
    createdAtEpochMs: 1710000000000,
  });
  assert.ok(paid.paidAt);
  assert.equal(paid.packedAt, null);

  const packed = resolveOrderLifecycleTimestamps({
    stage: "toShip",
    packedAtEpochMs: 1710000005000,
    createdAtEpochMs: 1710000000000,
  });
  assert.equal(packed.packedAt.getTime(), 1710000005000);
  assert.ok(packed.paidAt);

  const shipped = resolveOrderLifecycleTimestamps({
    stage: "toReceive",
    shippedAt: "2026-01-02T00:00:00.000Z",
    createdAtEpochMs: 1710000000000,
  });
  assert.equal(shipped.shippedAt.toISOString(), "2026-01-02T00:00:00.000Z");

  const cancelled = resolveOrderLifecycleTimestamps({
    stage: "cancelled",
    createdAtEpochMs: 1710000000000,
    cancelRequestResolvedAtEpochMs: 1710000008000,
  });
  assert.equal(cancelled.cancelledAt.getTime(), 1710000008000);
  assert.equal(cancelled.paidAt, null);

  const zeroEpoch = resolveOrderLifecycleTimestamps({
    stage: "toPay",
    createdAtEpochMs: 1710000000000,
    paidAtEpochMs: 0,
    packedAtEpochMs: 0,
  });
  assert.equal(zeroEpoch.paidAt, null);
  assert.equal(zeroEpoch.packedAt, null);
});

test("order payment intent and tracking map to first-class columns", () => {
  const payment = resolveOrderPaymentAndTracking({
    paymentIntentId: "pi_abc",
    checkoutSessionId: "cs_abc",
    paymentIdempotencyKey: "idem-1",
    paymentClientKey: "pi_abc_client",
    paymentReference: "ref-9",
    paymentProvider: "paymongo",
    paymentStatus: "awaiting_payment",
    trackingNumber: "GMS123",
  });
  assert.equal(payment.payment_intent_id, "pi_abc");
  assert.equal(payment.payment_checkout_session_id, "cs_abc");
  assert.equal(payment.payment_idempotency_key, "idem-1");
  assert.equal(payment.tracking_number, "GMS123");

  const itemRow = orderItemToRow({
    id: "ord-pay-1",
    productId: "prd-1",
    stage: "toPay",
    paymentIntentId: "pi_abc",
    trackingNo: "TRACK-9",
  }, "og_pay", 0);
  assert.equal(itemRow.id, "ord-pay-1");
  assert.equal(itemRow.payment_intent_id, "pi_abc");
  assert.equal(itemRow.tracking_number, "TRACK-9");
});

test("inventory movements are derived from order deductions and stock history", () => {
  const orderMovements = movementsFromOrderEntry({
    id: "ord-1",
    orderGroupId: "og_1",
    adminId: "seller-1",
    accountId: "buyer-1",
    productId: "prd-1",
    quantity: 2,
    inventoryDeducted: true,
    inventoryDeductedAtEpochMs: 1710000000000,
    inventoryMovements: [
      { productId: "prd-1", quantity: 2, role: "main", variantId: "var-1" },
    ],
  });
  assert.equal(orderMovements.length, 1);
  assert.equal(orderMovements[0].direction, "deduct");
  assert.equal(orderMovements[0].order_group_id, "og_1");

  const stockMovements = movementsFromProductStockHistory({
    id: "prd-1",
    adminId: "seller-1",
    stockHistory: [
      { id: "sh-1", addedQuantity: 10, modifiedAt: "2026-01-01T00:00:00.000Z", reason: "restock" },
    ],
  });
  assert.equal(stockMovements[0].direction, "restock");
  assert.equal(stockMovements[0].quantity, 10);
});

test("JSON catalog backup defaults on and can be disabled", () => {
  assert.equal(isCatalogJsonBackupEnabled({}), true);
  assert.equal(isCatalogJsonBackupEnabled({ CATALOG_JSON_BACKUP: "0" }), false);
});
