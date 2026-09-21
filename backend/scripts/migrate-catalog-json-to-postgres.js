"use strict";

/**
 * One-shot / idempotent import of catalog + orders JSON into Postgres.
 *
 * Usage:
 *   node scripts/migrate-catalog-json-to-postgres.js
 *
 * Reads (when present):
 *   backend/data/store_types.json
 *   backend/data/products.json
 *   backend/data/orders.json
 *
 * Re-running upserts by stable IDs (store type / category / order_group_id)
 * and existing product/order line IDs. Chat is not migrated (Phase B).
 */

const fs = require("fs");
const path = require("path");

function loadEnvFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return;
    }
    const raw = fs.readFileSync(filePath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith("#")) {
        continue;
      }
      const separatorIndex = trimmedLine.indexOf("=");
      if (separatorIndex <= 0) {
        continue;
      }
      const key = trimmedLine.slice(0, separatorIndex).trim();
      if (!key || process.env[key] != null) {
        continue;
      }
      let value = trimmedLine.slice(separatorIndex + 1).trim();
      if (
        value.length >= 2 &&
        ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'")))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  } catch (error) {
    console.error(`Unable to load env file: ${filePath}`, error);
  }
}

function readJsonArray(filePath) {
  if (!fs.existsSync(filePath)) {
    return { missing: true, items: [] };
  }
  const raw = fs.readFileSync(filePath, "utf8");
  try {
    const decoded = JSON.parse(raw);
    if (!Array.isArray(decoded)) {
      throw new Error(`${path.basename(filePath)} is not an array.`);
    }
    return { missing: false, items: decoded };
  } catch (error) {
    throw new Error(
      `Unable to parse ${filePath}: ${error instanceof Error ? error.message : error}`,
    );
  }
}

async function main() {
  loadEnvFile(path.join(__dirname, "..", ".env"));
  loadEnvFile(path.join(__dirname, "..", "..", ".env"));

  const { runMigrations } = require("../db/migrate");
  const { closePool } = require("../db/pool");
  const {
    isCatalogPostgresReady,
    syncStoreTypesToPostgres,
    listStoreTypesFromPostgres,
  } = require("../services/postgresCatalogStore");
  const {
    syncProductsToPostgres,
    listProductsFromPostgres,
  } = require("../services/postgresProductsStore");
  const {
    syncOrdersToPostgres,
    listOrdersFromPostgres,
  } = require("../services/postgresOrdersStore");
  const { assignOrderGroupIds } = require("../db/catalogHelpers");

  await runMigrations();

  if (!(await isCatalogPostgresReady())) {
    throw new Error("PostgreSQL catalog schema is not ready. Check DATABASE_URL and db:migrate.");
  }

  const dataDir = path.join(__dirname, "..", "data");
  const storeTypesFile = path.join(dataDir, "store_types.json");
  const productsFile = path.join(dataDir, "products.json");
  const ordersFile = path.join(dataDir, "orders.json");

  const storeTypes = readJsonArray(storeTypesFile);
  const products = readJsonArray(productsFile);
  const orders = readJsonArray(ordersFile);

  if (storeTypes.missing) {
    console.log(`skip store types (${storeTypesFile} not found)`);
  } else {
    await syncStoreTypesToPostgres(storeTypes.items, { deleteMissing: false });
    const stored = await listStoreTypesFromPostgres();
    console.log(`store types upserted=${storeTypes.items.length} stored=${stored.length}`);
  }

  if (products.missing) {
    console.log(`skip products (${productsFile} not found)`);
  } else {
    await syncProductsToPostgres(products.items, { deleteMissing: false });
    const stored = await listProductsFromPostgres();
    console.log(`products upserted=${products.items.length} stored=${stored.length}`);
  }

  if (orders.missing) {
    console.log(`skip orders (${ordersFile} not found)`);
  } else {
    const withGroups = assignOrderGroupIds(orders.items, { mode: "stable" });
    await syncOrdersToPostgres(withGroups, { mode: "stable", deleteMissing: false });
    const stored = await listOrdersFromPostgres();
    const groupIds = new Set(stored.map((entry) => entry.orderGroupId).filter(Boolean));
    console.log(
      `orders upserted=${orders.items.length} stored=${stored.length} groups=${groupIds.size}`,
    );
  }

  console.log("Catalog/order JSON → Postgres migration complete.");
  await closePool();
}

main().catch(async (error) => {
  console.error("Catalog migration failed:", error.message || error);
  try {
    const { closePool } = require("../db/pool");
    await closePool();
  } catch (_) {
    // ignore
  }
  process.exit(1);
});
