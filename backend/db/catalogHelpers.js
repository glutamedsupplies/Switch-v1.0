"use strict";

const crypto = require("crypto");

const MAX_PAGE_LIMIT = 200;
const DEFAULT_PAGE_LIMIT = 50;
const ORDER_GROUP_PREFIX = "og_";

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function sha16(value) {
  return crypto.createHash("sha1").update(String(value ?? "")).digest("hex").slice(0, 16);
}

function newId(prefix) {
  const safePrefix = String(prefix || "id").replace(/[^a-z0-9_]/gi, "") || "id";
  return `${safePrefix}_${crypto.randomBytes(12).toString("hex")}`;
}

function newOrderGroupId() {
  return `${ORDER_GROUP_PREFIX}${crypto.randomBytes(12).toString("hex")}`;
}

function normalizeNameKey(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizeDisplayName(value) {
  if (value && typeof value === "object") {
    return normalizeDisplayName(
      value.name ?? value.category ?? value.label ?? value.title ?? "",
    );
  }
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function toIso(value) {
  if (value == null || value === "") {
    return "";
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function toTimestamp(value) {
  if (value == null || value === "") {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toNumber(value, fallback = 0) {
  if (value == null || value === "") {
    return fallback;
  }
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toInteger(value, fallback = 0) {
  return Math.trunc(toNumber(value, fallback));
}

function stableStoreTypeId(name) {
  return `st_${sha16(normalizeNameKey(name))}`;
}

function stableCategoryId({ adminId = "", storeTypeId = "", name } = {}) {
  return `cat_${sha16(`${adminId}|${storeTypeId || ""}|${normalizeNameKey(name)}`)}`;
}

function stableOrderGroupId({ adminId = "", accountId = "", createdAtEpochMs = 0 } = {}) {
  return `${ORDER_GROUP_PREFIX}${sha16(`${adminId}|${accountId}|${createdAtEpochMs}`)}`;
}

function stableMovementId(parts) {
  return `im_${sha16(asArray(parts).join("|"))}`;
}

function isCatalogJsonBackupEnabled(env = process.env) {
  const raw = String(env?.CATALOG_JSON_BACKUP ?? "1").trim().toLowerCase();
  return raw !== "0" && raw !== "false" && raw !== "off" && raw !== "no";
}

function parsePagination(searchParams, options = {}) {
  const params = searchParams || { has() { return false; }, get() { return null; } };
  const maxLimit = Math.max(1, toInteger(options.maxLimit, MAX_PAGE_LIMIT));
  const defaultLimit = Math.max(1, toInteger(options.defaultLimit, DEFAULT_PAGE_LIMIT));
  const hasLimit = typeof params.has === "function" && params.has("limit");
  const hasOffset = typeof params.has === "function" && params.has("offset");
  const hasCursor = typeof params.has === "function" && params.has("cursor");

  if (!hasLimit && !hasOffset && !hasCursor) {
    return {
      enabled: false,
      limit: null,
      offset: 0,
      cursor: "",
    };
  }

  let limit = toInteger(params.get?.("limit"), defaultLimit);
  if (limit < 1) {
    limit = defaultLimit;
  }
  if (limit > maxLimit) {
    limit = maxLimit;
  }

  let offset = toInteger(params.get?.("offset"), 0);
  if (offset < 0) {
    offset = 0;
  }

  return {
    enabled: true,
    limit,
    offset,
    cursor: String(params.get?.("cursor") ?? "").trim(),
  };
}

function paginateArray(items, pagination) {
  const list = asArray(items);
  if (!pagination?.enabled) {
    return {
      items: list,
      total: list.length,
      limit: list.length,
      offset: 0,
      hasMore: false,
    };
  }

  const limit = Math.max(1, toInteger(pagination.limit, DEFAULT_PAGE_LIMIT));
  const offset = Math.max(0, toInteger(pagination.offset, 0));
  const sliced = list.slice(offset, offset + limit);
  return {
    items: sliced,
    total: list.length,
    limit,
    offset,
    hasMore: offset + sliced.length < list.length,
  };
}

function buildPaginationMeta(page) {
  return {
    limit: page.limit,
    offset: page.offset,
    total: page.total,
    hasMore: Boolean(page.hasMore),
  };
}

function orderEntryMatchesGroupKey(entry, groupKey) {
  const key = String(groupKey ?? "").trim();
  if (!key) {
    return false;
  }

  const orderGroupId = String(entry?.orderGroupId ?? entry?.groupId ?? "").trim();
  if (orderGroupId && orderGroupId === key) {
    return true;
  }

  const epochFromKey = Math.trunc(Number(key));
  if (Number.isFinite(epochFromKey) && String(epochFromKey) === key) {
    return Math.trunc(toNumber(entry?.createdAtEpochMs, NaN)) === epochFromKey;
  }

  return false;
}

function fallbackOrderGroupKey(entry) {
  return [
    String(entry?.adminId ?? "").trim(),
    String(entry?.accountId ?? "").trim(),
    String(Math.trunc(toNumber(entry?.createdAtEpochMs, 0))),
  ].join("|");
}

function assignOrderGroupIds(entries, options = {}) {
  const list = asArray(entries);
  const generatedByFallbackKey = new Map();
  const mode = options.mode === "stable" ? "stable" : "random";
  const knownById = new Map();
  const knownByFallback = new Map();

  for (const entry of asArray(options.existingEntries)) {
    const groupId = String(entry?.orderGroupId ?? entry?.groupId ?? "").trim();
    if (!groupId) {
      continue;
    }
    const id = String(entry?.id ?? "").trim();
    if (id) {
      knownById.set(id, groupId);
    }
    knownByFallback.set(fallbackOrderGroupKey(entry), groupId);
  }

  return list.map((entry) => {
    const existing = String(entry?.orderGroupId ?? entry?.groupId ?? "").trim()
      || knownById.get(String(entry?.id ?? "").trim())
      || knownByFallback.get(fallbackOrderGroupKey(entry))
      || "";
    if (existing) {
      return { ...entry, orderGroupId: existing };
    }

    const fallbackKey = fallbackOrderGroupKey(entry);
    if (!generatedByFallbackKey.has(fallbackKey)) {
      if (mode === "stable") {
        generatedByFallbackKey.set(
          fallbackKey,
          stableOrderGroupId({
            adminId: String(entry?.adminId ?? "").trim(),
            accountId: String(entry?.accountId ?? "").trim(),
            createdAtEpochMs: Math.trunc(toNumber(entry?.createdAtEpochMs, 0)),
          }),
        );
      } else {
        generatedByFallbackKey.set(fallbackKey, newOrderGroupId());
      }
    }

    return {
      ...entry,
      orderGroupId: generatedByFallbackKey.get(fallbackKey),
    };
  });
}

function groupOrderEntries(entries) {
  const groups = new Map();
  for (const entry of asArray(entries)) {
    const orderGroupId = String(entry?.orderGroupId ?? "").trim();
    const key = orderGroupId || fallbackOrderGroupKey(entry);
    if (!groups.has(key)) {
      groups.set(key, {
        orderGroupId: orderGroupId || "",
        adminId: String(entry?.adminId ?? "").trim(),
        accountId: String(entry?.accountId ?? "").trim(),
        createdAtEpochMs: Math.trunc(toNumber(entry?.createdAtEpochMs, 0)),
        items: [],
      });
    }
    const group = groups.get(key);
    if (!group.orderGroupId && orderGroupId) {
      group.orderGroupId = orderGroupId;
    }
    if (!group.adminId) {
      group.adminId = String(entry?.adminId ?? "").trim();
    }
    if (!group.accountId) {
      group.accountId = String(entry?.accountId ?? "").trim();
    }
    group.items.push(entry);
  }
  return [...groups.values()].map((group) => ({
    ...group,
    orderGroupId: group.orderGroupId || newOrderGroupId(),
  }));
}

const PRODUCT_COLUMN_KEYS = new Set([
  "id",
  "adminId",
  "name",
  "description",
  "approvalStatus",
  "isActive",
  "originalPrice",
  "salesPrice",
  "stock",
  "sold",
  "barcode",
  "category",
  "categories",
  "categoryIds",
  "rating",
  "commentCount",
  "imageUrl",
  "submittedAt",
  "approvedAt",
  "approvedBy",
  "rejectedAt",
  "rejectedBy",
  "rejectionReason",
  "approvalUpdatedAt",
  "createdAt",
  "updatedAt",
  "variants",
]);

const VARIANT_COLUMN_KEYS = new Set([
  "id",
  "name",
  "quantity",
  "imageUrl",
  "originalPrice",
  "salesPrice",
  "stock",
  "addOns",
]);

function omitKeys(source, keys) {
  const extra = {};
  for (const [key, value] of Object.entries(asObject(source))) {
    if (!keys.has(key)) {
      extra[key] = value;
    }
  }
  return extra;
}

function productCategoryNames(product) {
  const names = [];
  const seen = new Set();
  const push = (value) => {
    const name = normalizeDisplayName(value);
    const key = normalizeNameKey(name);
    if (!name || seen.has(key)) {
      return;
    }
    seen.add(key);
    names.push(name);
  };

  for (const value of asArray(product?.categories)) {
    push(value);
  }
  push(product?.category);
  return names;
}

function productToRow(product) {
  const source = asObject(product);
  const id = String(source.id ?? "").trim();
  const adminId = String(source.adminId ?? "").trim();
  const name = String(source.name ?? "").trim();
  const categoryNames = productCategoryNames(source);
  const salesPriceRaw = source.salesPrice;
  const salesPrice =
    salesPriceRaw == null || salesPriceRaw === ""
      ? null
      : toNumber(salesPriceRaw, null);

  return {
    id,
    admin_id: adminId,
    name,
    description: String(source.description ?? ""),
    approval_status: String(source.approvalStatus ?? "pending").trim() || "pending",
    is_active: source.isActive !== false,
    original_price: toNumber(source.originalPrice, 0),
    sales_price: salesPrice,
    stock: Math.max(0, toInteger(source.stock, 0)),
    sold: Math.max(0, toInteger(source.sold, 0)),
    barcode: String(source.barcode ?? "").trim(),
    category: categoryNames[0] || String(source.category ?? "").trim(),
    rating: toNumber(source.rating, 0),
    comment_count: Math.max(0, toInteger(source.commentCount, 0)),
    image_url: String(source.imageUrl ?? source.mainImageUrl ?? "").trim(),
    submitted_at: toTimestamp(source.submittedAt),
    approved_at: toTimestamp(source.approvedAt),
    approved_by: String(source.approvedBy ?? "").trim(),
    rejected_at: toTimestamp(source.rejectedAt),
    rejected_by: String(source.rejectedBy ?? "").trim(),
    rejection_reason: String(source.rejectionReason ?? "").trim(),
    approval_updated_at: toTimestamp(source.approvalUpdatedAt),
    extra_data: omitKeys(source, PRODUCT_COLUMN_KEYS),
    created_at: toTimestamp(source.createdAt) || new Date(),
    updated_at: toTimestamp(source.updatedAt) || new Date(),
  };
}

function variantToRow(variant, productId, sortOrder) {
  const source = asObject(variant);
  const id = String(source.id ?? "").trim() || newId("var");
  const salesPriceRaw = source.salesPrice;
  const salesPrice =
    salesPriceRaw == null || salesPriceRaw === ""
      ? null
      : toNumber(salesPriceRaw, null);

  return {
    id,
    product_id: productId,
    name: String(source.name ?? "").trim(),
    quantity: String(source.quantity ?? "").trim(),
    image_url: String(source.imageUrl ?? "").trim(),
    original_price: toNumber(source.originalPrice ?? source.price, 0),
    sales_price: salesPrice,
    stock: Math.max(0, toInteger(source.stock, 0)),
    sort_order: sortOrder,
    add_ons: asArray(source.addOns),
    extra_data: omitKeys(source, VARIANT_COLUMN_KEYS),
  };
}

function rowToVariant(row) {
  const extra = asObject(row?.extra_data);
  const salesPrice =
    row?.sales_price == null || row?.sales_price === ""
      ? extra.salesPrice
      : toNumber(row.sales_price, null);

  return {
    ...extra,
    id: row.id,
    name: row.name || extra.name || "",
    quantity: row.quantity || extra.quantity || "",
    imageUrl: row.image_url || extra.imageUrl || "",
    originalPrice: toNumber(row.original_price, extra.originalPrice || 0),
    ...(salesPrice == null ? {} : { salesPrice }),
    stock: toInteger(row.stock, extra.stock || 0),
    addOns: asArray(row.add_ons?.length ? row.add_ons : extra.addOns),
  };
}

function rowToProduct(row, variants = [], categoryNames = [], categoryIds = []) {
  const extra = asObject(row?.extra_data);
  const names = categoryNames.length
    ? categoryNames
    : productCategoryNames({ ...extra, category: row?.category, categories: extra.categories });
  const salesPrice =
    row?.sales_price == null || row?.sales_price === ""
      ? extra.salesPrice
      : toNumber(row.sales_price, null);

  return {
    ...extra,
    id: row.id,
    adminId: row.admin_id || extra.adminId || "",
    name: row.name || extra.name || "",
    description: row.description ?? extra.description ?? "",
    approvalStatus: row.approval_status || extra.approvalStatus || "pending",
    isActive: row.is_active !== false,
    originalPrice: toNumber(row.original_price, extra.originalPrice || 0),
    ...(salesPrice == null ? {} : { salesPrice }),
    stock: toInteger(row.stock, extra.stock || 0),
    sold: toInteger(row.sold, extra.sold || 0),
    barcode: row.barcode || extra.barcode || "",
    category: row.category || names[0] || extra.category || "",
    categories: names,
    categoryIds,
    rating: toNumber(row.rating, extra.rating || 0),
    commentCount: toInteger(row.comment_count, extra.commentCount || 0),
    imageUrl: row.image_url || extra.imageUrl || extra.mainImageUrl || "",
    submittedAt: toIso(row.submitted_at) || extra.submittedAt || "",
    approvedAt: toIso(row.approved_at) || extra.approvedAt || "",
    approvedBy: row.approved_by || extra.approvedBy || "",
    rejectedAt: toIso(row.rejected_at) || extra.rejectedAt || "",
    rejectedBy: row.rejected_by || extra.rejectedBy || "",
    rejectionReason: row.rejection_reason || extra.rejectionReason || "",
    approvalUpdatedAt: toIso(row.approval_updated_at) || extra.approvalUpdatedAt || "",
    createdAt: toIso(row.created_at) || extra.createdAt || "",
    updatedAt: toIso(row.updated_at) || extra.updatedAt || "",
    variants,
  };
}

function storeTypeToRow(storeType) {
  const source = asObject(storeType);
  const name = normalizeDisplayName(source);
  const id = String(source.id ?? "").trim() || stableStoreTypeId(name);
  const extra = omitKeys(source, new Set([
    "id",
    "name",
    "platformId",
    "status",
    "commissionRate",
    "serviceFee",
    "heroImageUrl",
    "iconImageUrl",
    "iconName",
    "categories",
    "categoryDetails",
  ]));

  return {
    id,
    name,
    name_normalized: normalizeNameKey(name),
    platform_id: String(source.platformId ?? "").trim(),
    status: String(source.status ?? "active").trim().toLowerCase() === "inactive"
      ? "inactive"
      : "active",
    commission_rate: toNumber(source.commissionRate ?? source.commission, 0),
    service_fee: toNumber(source.serviceFee ?? source.serviceFeeAmount, 0),
    hero_image_url: String(
      source.heroImageUrl ?? source.imageUrl ?? source.coverImageUrl ?? "",
    ).trim(),
    icon_image_url: String(
      source.iconImageUrl ?? source.iconUrl ?? source.businessTypeIconUrl ?? "",
    ).trim(),
    icon_name: String(source.iconName ?? source.lucideIconName ?? "").trim(),
    extra_data: extra,
    created_at: toTimestamp(source.createdAt) || new Date(),
    updated_at: toTimestamp(source.updatedAt) || new Date(),
  };
}

function rowToStoreType(row, categories = []) {
  const extra = asObject(row?.extra_data);
  const categoryNames = categories.map((category) => category.name).filter(Boolean);
  const categoryDetails = categories.map((category) => ({
    name: category.name,
    productCount: toInteger(category.productCount, 0),
    imageUrl: category.imageUrl || "",
    iconImageUrl: category.iconImageUrl || "",
    iconName: category.iconName || "",
    status: category.status || "active",
    id: category.id || "",
  }));

  return {
    ...extra,
    id: row.id,
    name: row.name,
    platformId: row.platform_id || extra.platformId || "",
    status: row.status || extra.status || "active",
    commissionRate: toNumber(row.commission_rate, extra.commissionRate || 0),
    serviceFee: toNumber(row.service_fee, extra.serviceFee || 0),
    heroImageUrl: row.hero_image_url || extra.heroImageUrl || "",
    iconImageUrl: row.icon_image_url || extra.iconImageUrl || "",
    iconName: row.icon_name || extra.iconName || "",
    categories: categoryNames,
    categoryDetails,
  };
}

function storeTypeCategoryRecords(storeType, storeTypeId) {
  const source = asObject(storeType);
  const details = asArray(source.categoryDetails);
  const names = asArray(source.categories).map(normalizeDisplayName).filter(Boolean);
  const detailByKey = new Map(
    details.map((detail) => [normalizeNameKey(detail?.name), asObject(detail)]),
  );
  const orderedNames = names.length
    ? names
    : details.map((detail) => normalizeDisplayName(detail?.name)).filter(Boolean);

  return orderedNames.map((name) => {
    const detail = detailByKey.get(normalizeNameKey(name)) || { name };
    return {
      id: String(detail.id ?? "").trim() || stableCategoryId({
        adminId: "",
        storeTypeId,
        name,
      }),
      name,
      name_normalized: normalizeNameKey(name),
      admin_id: "",
      store_type_id: storeTypeId,
      status: String(detail.status ?? "active").trim().toLowerCase() === "inactive"
        ? "inactive"
        : "active",
      image_url: String(detail.imageUrl ?? detail.mainImageUrl ?? "").trim(),
      icon_image_url: String(detail.iconImageUrl ?? detail.iconUrl ?? "").trim(),
      icon_name: String(detail.iconName ?? "").trim(),
      product_count: Math.max(0, toInteger(detail.productCount, 0)),
      extra_data: omitKeys(detail, new Set([
        "id",
        "name",
        "status",
        "imageUrl",
        "iconImageUrl",
        "iconName",
        "productCount",
      ])),
    };
  });
}

function workspaceCategoryRow(adminId, name) {
  const displayName = normalizeDisplayName(name);
  return {
    id: stableCategoryId({ adminId, storeTypeId: "", name: displayName }),
    name: displayName,
    name_normalized: normalizeNameKey(displayName),
    admin_id: String(adminId ?? "").trim(),
    store_type_id: null,
    status: "active",
    image_url: "",
    icon_image_url: "",
    icon_name: "",
    product_count: 0,
    extra_data: {},
  };
}

const ORDER_ITEM_COLUMN_KEYS = new Set([
  "id",
  "orderGroupId",
  "groupId",
  "adminId",
  "accountId",
  "productId",
  "variantId",
  "quantity",
  "unitPrice",
  "stage",
  "createdAtEpochMs",
  "createdAt",
  "updatedAt",
]);

function orderItemToRow(entry, orderGroupId) {
  const source = asObject(entry);
  return {
    id: String(source.id ?? "").trim(),
    order_group_id: orderGroupId,
    admin_id: String(source.adminId ?? "").trim(),
    account_id: String(source.accountId ?? "").trim(),
    product_id: String(source.productId ?? "").trim(),
    variant_id: String(source.variantId ?? "").trim(),
    quantity: Math.max(1, toInteger(source.quantity, 1)),
    unit_price: toNumber(source.unitPrice, 0),
    stage: String(source.stage ?? source.status ?? "toPay").trim() || "toPay",
    created_at_epoch_ms: Math.trunc(toNumber(source.createdAtEpochMs, 0)),
    extra_data: omitKeys({ ...source, orderGroupId }, ORDER_ITEM_COLUMN_KEYS),
    created_at: toTimestamp(source.createdAt) || new Date(
      Math.trunc(toNumber(source.createdAtEpochMs, Date.now())),
    ),
    updated_at: toTimestamp(source.updatedAt) || new Date(),
  };
}

function orderGroupToRow(group) {
  const items = asArray(group.items);
  const primary = items[0] || {};
  const stages = items.map((item) => String(item?.stage ?? "").trim()).filter(Boolean);
  return {
    id: group.orderGroupId,
    order_group_id: group.orderGroupId,
    admin_id: String(group.adminId || primary.adminId || "").trim(),
    account_id: String(group.accountId || primary.accountId || "").trim(),
    created_at_epoch_ms: Math.trunc(
      toNumber(group.createdAtEpochMs ?? primary.createdAtEpochMs, 0),
    ),
    stage: stages[0] || "toPay",
    extra_data: {
      itemIds: items.map((item) => String(item?.id ?? "").trim()).filter(Boolean),
    },
    created_at: toTimestamp(primary.createdAt) || new Date(
      Math.trunc(toNumber(primary.createdAtEpochMs, Date.now())),
    ),
    updated_at: new Date(),
  };
}

function rowToOrderEntry(itemRow, groupRow) {
  const extra = asObject(itemRow?.extra_data);
  const orderGroupId = itemRow.order_group_id || groupRow?.order_group_id || extra.orderGroupId || "";
  const createdAtEpochMs = toInteger(
    itemRow.created_at_epoch_ms,
    extra.createdAtEpochMs || 0,
  );

  return {
    ...extra,
    id: itemRow.id,
    orderGroupId,
    adminId: itemRow.admin_id || extra.adminId || groupRow?.admin_id || "",
    accountId: itemRow.account_id || extra.accountId || groupRow?.account_id || "",
    productId: itemRow.product_id || extra.productId || "",
    variantId: itemRow.variant_id || extra.variantId || "",
    quantity: toInteger(itemRow.quantity, extra.quantity || 1),
    unitPrice: toNumber(itemRow.unit_price, extra.unitPrice || 0),
    stage: itemRow.stage || extra.stage || extra.status || "toPay",
    createdAtEpochMs,
    createdAt: toIso(itemRow.created_at) || extra.createdAt || (
      createdAtEpochMs > 0 ? new Date(createdAtEpochMs).toISOString() : ""
    ),
    updatedAt: toIso(itemRow.updated_at) || extra.updatedAt || "",
  };
}

function movementsFromOrderEntry(entry) {
  const movements = [];
  const orderItemId = String(entry?.id ?? "").trim();
  const orderGroupId = String(entry?.orderGroupId ?? "").trim();
  const adminId = String(entry?.adminId ?? "").trim();
  const accountId = String(entry?.accountId ?? "").trim();
  const embedded = asArray(entry?.inventoryMovements);
  const direction = entry?.inventoryRestoredAtEpochMs > 0
    ? "restore"
    : entry?.inventoryDeducted === true || entry?.inventoryDeductedAtEpochMs > 0
      ? "deduct"
      : "";

  const occurredAt = toTimestamp(
    entry?.inventoryRestoredAtEpochMs
    || entry?.inventoryDeductedAtEpochMs
    || entry?.createdAtEpochMs
    || entry?.createdAt,
  ) || new Date();

  const sources = embedded.length
    ? embedded
    : direction
      ? [{
          orderEntryId: orderItemId,
          productId: entry?.productId,
          productName: entry?.productName,
          variantId: entry?.variantId,
          variantName: entry?.variantName,
          quantity: entry?.quantity,
          role: "main",
        }]
      : [];

  for (const item of sources) {
    const productId = String(item?.productId ?? "").trim();
    const quantity = Math.max(0, toInteger(item?.quantity, 0));
    if (!productId || !quantity || !direction) {
      continue;
    }
    const role = String(item?.role ?? "main").trim() || "main";
    movements.push({
      id: stableMovementId([
        orderItemId,
        productId,
        direction,
        role,
        quantity,
        occurredAt.toISOString(),
      ]),
      admin_id: adminId,
      account_id: accountId,
      product_id: productId,
      variant_id: String(item?.variantId ?? "").trim(),
      order_group_id: orderGroupId || null,
      order_item_id: orderItemId || null,
      quantity,
      direction,
      reason: direction === "restore" ? "order_restore" : "order_deduct",
      role,
      occurred_at: occurredAt,
      extra_data: asObject(item),
    });
  }

  return movements;
}

function movementsFromProductStockHistory(product) {
  const adminId = String(product?.adminId ?? "").trim();
  const productId = String(product?.id ?? "").trim();
  const history = asArray(product?.stockHistory);
  return history.map((entry, index) => {
    const added = Math.max(0, toInteger(entry?.addedQuantity, 0));
    const deducted = Math.max(0, toInteger(entry?.deductedQuantity, 0));
    const direction = deducted > 0 && added === 0
      ? "deduct"
      : added > 0
        ? "restock"
        : "adjust";
    const quantity = deducted > 0 && added === 0 ? deducted : added || toInteger(entry?.stock, 0);
    const occurredAt = toTimestamp(entry?.modifiedAt) || new Date();
    return {
      id: String(entry?.id ?? "").trim() || stableMovementId([
        productId,
        "stockHistory",
        index,
        occurredAt.toISOString(),
        direction,
        quantity,
      ]),
      admin_id: adminId,
      account_id: "",
      product_id: productId,
      variant_id: String(entry?.variantId ?? "").trim(),
      order_group_id: null,
      order_item_id: null,
      quantity,
      direction,
      reason: String(entry?.reason ?? entry?.label ?? "stock_history").trim() || "stock_history",
      role: "main",
      occurred_at: occurredAt,
      extra_data: asObject(entry),
    };
  }).filter((movement) => movement.product_id && movement.quantity >= 0);
}

module.exports = {
  MAX_PAGE_LIMIT,
  DEFAULT_PAGE_LIMIT,
  asObject,
  asArray,
  newId,
  newOrderGroupId,
  sha16,
  normalizeNameKey,
  normalizeDisplayName,
  toIso,
  toTimestamp,
  toNumber,
  toInteger,
  stableStoreTypeId,
  stableCategoryId,
  stableOrderGroupId,
  stableMovementId,
  isCatalogJsonBackupEnabled,
  parsePagination,
  paginateArray,
  buildPaginationMeta,
  orderEntryMatchesGroupKey,
  assignOrderGroupIds,
  groupOrderEntries,
  productCategoryNames,
  productToRow,
  variantToRow,
  rowToVariant,
  rowToProduct,
  storeTypeToRow,
  rowToStoreType,
  storeTypeCategoryRecords,
  workspaceCategoryRow,
  orderItemToRow,
  orderGroupToRow,
  rowToOrderEntry,
  movementsFromOrderEntry,
  movementsFromProductStockHistory,
};
