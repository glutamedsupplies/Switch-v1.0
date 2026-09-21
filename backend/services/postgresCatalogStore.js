"use strict";

const { query, withTransaction, isPostgresConfigured, getPool } = require("../db/pool");
const {
  asArray,
  storeTypeToRow,
  rowToStoreType,
  storeTypeCategoryRecords,
  workspaceCategoryRow,
  normalizeDisplayName,
} = require("../db/catalogHelpers");

let catalogReadyCache = null;
let catalogReadyCheckedAt = 0;
const READY_TTL_MS = 15_000;

async function isCatalogPostgresReady() {
  if (!isPostgresConfigured()) {
    return false;
  }

  const now = Date.now();
  if (catalogReadyCache != null && now - catalogReadyCheckedAt < READY_TTL_MS) {
    return catalogReadyCache;
  }

  try {
    await getPool();
    const result = await query(`
      SELECT
        to_regclass('public.store_types') AS store_types,
        to_regclass('public.categories') AS categories,
        to_regclass('public.products') AS products,
        to_regclass('public.product_variants') AS product_variants,
        to_regclass('public.orders') AS orders,
        to_regclass('public.order_items') AS order_items,
        to_regclass('public.inventory_movements') AS inventory_movements
    `);
    const row = result.rows[0] || {};
    catalogReadyCache = Boolean(
      row.store_types
      && row.categories
      && row.products
      && row.product_variants
      && row.orders
      && row.order_items
      && row.inventory_movements,
    );
  } catch (_) {
    catalogReadyCache = false;
  }
  catalogReadyCheckedAt = now;
  return catalogReadyCache;
}

function invalidateCatalogReadyCache() {
  catalogReadyCache = null;
  catalogReadyCheckedAt = 0;
}

async function upsertCategoryRow(client, categoryRow) {
  await client.query(
    `
    INSERT INTO categories (
      id, name, name_normalized, admin_id, store_type_id, status,
      image_url, icon_image_url, icon_name, product_count, extra_data,
      created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10, $11::jsonb,
      NOW(), NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      name_normalized = EXCLUDED.name_normalized,
      admin_id = EXCLUDED.admin_id,
      store_type_id = EXCLUDED.store_type_id,
      status = EXCLUDED.status,
      image_url = EXCLUDED.image_url,
      icon_image_url = EXCLUDED.icon_image_url,
      icon_name = EXCLUDED.icon_name,
      product_count = EXCLUDED.product_count,
      extra_data = EXCLUDED.extra_data,
      updated_at = NOW()
    `,
    [
      categoryRow.id,
      categoryRow.name,
      categoryRow.name_normalized,
      categoryRow.admin_id,
      categoryRow.store_type_id,
      categoryRow.status,
      categoryRow.image_url,
      categoryRow.icon_image_url,
      categoryRow.icon_name,
      categoryRow.product_count,
      JSON.stringify(categoryRow.extra_data || {}),
    ],
  );
  return categoryRow.id;
}

async function ensureWorkspaceCategory(client, adminId, name) {
  const displayName = normalizeDisplayName(name);
  if (!displayName) {
    return null;
  }
  const row = workspaceCategoryRow(adminId, displayName);
  await upsertCategoryRow(client, row);
  return row;
}

async function listStoreTypesFromPostgres() {
  const [storeTypeResult, categoryResult] = await Promise.all([
    query(`SELECT * FROM store_types ORDER BY name`),
    query(`SELECT * FROM categories WHERE store_type_id IS NOT NULL ORDER BY name`),
  ]);

  const categoriesByStoreType = new Map();
  for (const row of categoryResult.rows) {
    const storeTypeId = String(row.store_type_id ?? "").trim();
    if (!categoriesByStoreType.has(storeTypeId)) {
      categoriesByStoreType.set(storeTypeId, []);
    }
    categoriesByStoreType.get(storeTypeId).push({
      id: row.id,
      name: row.name,
      productCount: row.product_count,
      imageUrl: row.image_url,
      iconImageUrl: row.icon_image_url,
      iconName: row.icon_name,
      status: row.status,
    });
  }

  return storeTypeResult.rows.map((row) =>
    rowToStoreType(row, categoriesByStoreType.get(row.id) || []),
  );
}

async function syncStoreTypesToPostgres(storeTypes, options = {}) {
  const deleteMissing = options.deleteMissing !== false;
  const incoming = asArray(storeTypes)
    .map(storeTypeToRow)
    .filter((row) => row.id && row.name);
  const incomingIds = incoming.map((row) => row.id);

  await withTransaction(async (client) => {
    for (const storeType of asArray(storeTypes)) {
      const row = storeTypeToRow(storeType);
      if (!row.id || !row.name) {
        continue;
      }

      await client.query(
        `
        INSERT INTO store_types (
          id, name, name_normalized, platform_id, status,
          commission_rate, service_fee, hero_image_url, icon_image_url,
          icon_name, extra_data, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9,
          $10, $11::jsonb, $12, NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          name_normalized = EXCLUDED.name_normalized,
          platform_id = EXCLUDED.platform_id,
          status = EXCLUDED.status,
          commission_rate = EXCLUDED.commission_rate,
          service_fee = EXCLUDED.service_fee,
          hero_image_url = EXCLUDED.hero_image_url,
          icon_image_url = EXCLUDED.icon_image_url,
          icon_name = EXCLUDED.icon_name,
          extra_data = EXCLUDED.extra_data,
          updated_at = NOW()
        `,
        [
          row.id,
          row.name,
          row.name_normalized,
          row.platform_id,
          row.status,
          row.commission_rate,
          row.service_fee,
          row.hero_image_url,
          row.icon_image_url,
          row.icon_name,
          JSON.stringify(row.extra_data || {}),
          row.created_at,
        ],
      );

      const categoryRows = storeTypeCategoryRecords(storeType, row.id);
      const categoryIds = categoryRows.map((category) => category.id);
      for (const categoryRow of categoryRows) {
        await upsertCategoryRow(client, categoryRow);
      }

      if (categoryIds.length) {
        await client.query(
          `
          DELETE FROM categories
          WHERE store_type_id = $1
            AND id <> ALL($2::text[])
          `,
          [row.id, categoryIds],
        );
      } else {
        await client.query(
          `DELETE FROM categories WHERE store_type_id = $1`,
          [row.id],
        );
      }
    }

    if (deleteMissing) {
      if (incomingIds.length) {
        await client.query(
          `DELETE FROM store_types WHERE id <> ALL($1::text[])`,
          [incomingIds],
        );
      } else {
        await client.query(`DELETE FROM store_types`);
      }
    }
  });
}

module.exports = {
  isCatalogPostgresReady,
  invalidateCatalogReadyCache,
  listStoreTypesFromPostgres,
  syncStoreTypesToPostgres,
  ensureWorkspaceCategory,
  upsertCategoryRow,
};
