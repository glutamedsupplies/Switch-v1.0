"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { isPostgresConfigured, closePool, query } = require("../db/pool");

function loadEnvFile(filePath) {
  const fs = require("fs");
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
  } catch (_) {
    // ignore
  }
}

loadEnvFile(require("path").join(__dirname, "..", ".env"));

const skip = !isPostgresConfigured();

test("Postgres catalog stores products, orders, and inventory", { skip }, async (t) => {
  const { runMigrations } = require("../db/migrate");
  const {
    isCatalogPostgresReady,
    syncStoreTypesToPostgres,
    listStoreTypesFromPostgres,
  } = require("../services/postgresCatalogStore");
  const {
    syncProductsToPostgres,
    listProductsFromPostgres,
    listProductsPageFromPostgres,
  } = require("../services/postgresProductsStore");
  const {
    syncOrdersToPostgres,
    listOrdersFromPostgres,
    listOrdersPageFromPostgres,
  } = require("../services/postgresOrdersStore");

  await runMigrations();
  assert.equal(await isCatalogPostgresReady(), true);

  const suffix = `t${Date.now()}`;
  const adminId = `admin_${suffix}`;
  const accountId = `acct_${suffix}`;
  const productId = `prd_${suffix}`;
  const storeTypeName = `Retail ${suffix}`;

  t.after(async () => {
    try {
      await query(`DELETE FROM inventory_movements WHERE admin_id = $1`, [adminId]);
      await query(`DELETE FROM order_items WHERE admin_id = $1`, [adminId]);
      await query(`DELETE FROM orders WHERE admin_id = $1`, [adminId]);
      await query(`DELETE FROM products WHERE admin_id = $1`, [adminId]);
      await query(`DELETE FROM categories WHERE admin_id = $1`, [adminId]);
      await query(
        `DELETE FROM store_types WHERE name_normalized = $1`,
        [storeTypeName.toLowerCase()],
      );
    } finally {
      await closePool();
    }
  });

  await syncStoreTypesToPostgres(
    [
      {
        name: storeTypeName,
        status: "active",
        commissionRate: 5,
        categories: ["Skincare"],
        categoryDetails: [{ name: "Skincare", status: "active" }],
      },
    ],
    { deleteMissing: false },
  );
  const storeTypes = (await listStoreTypesFromPostgres()).filter(
    (storeType) => storeType.name === storeTypeName,
  );
  assert.equal(storeTypes.length, 1);
  assert.ok(storeTypes[0].id);
  assert.equal(storeTypes[0].categories[0], "Skincare");
  assert.ok(storeTypes[0].categoryDetails[0].id);

  await syncProductsToPostgres(
    [
    {
      id: productId,
      adminId,
      name: "Test serum",
      description: "PG catalog test",
      approvalStatus: "approved",
      isActive: true,
      originalPrice: 200,
      salesPrice: 150,
      stock: 9,
      sold: 1,
      barcode: `bc-${suffix}`,
      category: "Skincare",
      categories: ["Skincare"],
      rating: 5,
      commentCount: 1,
      imageUrl: "/uploads/test.jpg",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      variants: [
        {
          id: `var_${suffix}`,
          name: "Default",
          originalPrice: 200,
          salesPrice: 150,
          stock: 9,
        },
      ],
      stockHistory: [
        { id: `sh_${suffix}`, addedQuantity: 9, reason: "opening", modifiedAt: new Date().toISOString() },
      ],
    },
    ],
    { deleteMissing: false },
  );

  const products = (await listProductsFromPostgres()).filter((product) => product.id === productId);
  assert.equal(products.length, 1);
  assert.equal(products[0].adminId, adminId);
  assert.equal(Number(products[0].salesPrice), 150);
  assert.equal(products[0].variants[0].name, "Default");
  assert.ok(Array.isArray(products[0].categoryIds) && products[0].categoryIds.length >= 1);

  const page = await listProductsPageFromPostgres({
    adminId,
    approvalStatus: "approved",
    limit: 10,
    offset: 0,
  });
  assert.equal(page.total >= 1, true);
  assert.equal(page.items.some((product) => product.id === productId), true);

  const createdAtEpochMs = Date.now();
  const syncedOrders = await syncOrdersToPostgres(
    [
      {
        id: `ord_${suffix}`,
        adminId,
        accountId,
        productId,
        productName: "Test serum",
        variantId: `var_${suffix}`,
        variantName: "Default",
        quantity: 1,
        unitPrice: 150,
        stage: "toPrepare",
        createdAtEpochMs,
        inventoryDeducted: true,
        inventoryDeductedAtEpochMs: createdAtEpochMs,
        inventoryMovements: [
          { productId, quantity: 1, role: "main", variantId: `var_${suffix}` },
        ],
      },
    ],
    { deleteMissing: false },
  );

  assert.match(syncedOrders[0].orderGroupId, /^og_/);

  const orders = (await listOrdersFromPostgres()).filter((entry) => entry.id === `ord_${suffix}`);
  assert.equal(orders.length, 1);
  assert.equal(orders[0].orderGroupId, syncedOrders[0].orderGroupId);
  assert.equal(orders[0].accountId, accountId);

  const orderPage = await listOrdersPageFromPostgres({ adminId, accountId, limit: 5, offset: 0 });
  assert.equal(orderPage.items.some((entry) => entry.id === `ord_${suffix}`), true);

  const movementResult = await query(
    `SELECT * FROM inventory_movements WHERE product_id = $1`,
    [productId],
  );
  assert.ok(movementResult.rowCount >= 1);
  assert.ok(movementResult.rows.some((row) => row.direction === "deduct" || row.direction === "restock"));
});
