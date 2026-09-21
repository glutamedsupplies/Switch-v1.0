"use strict";

const { query, withTransaction } = require("../db/pool");
const {
  asArray,
  productToRow,
  variantToRow,
  rowToVariant,
  rowToProduct,
  productCategoryNames,
  movementsFromProductStockHistory,
} = require("../db/catalogHelpers");
const { ensureWorkspaceCategory } = require("./postgresCatalogStore");

async function loadProductChildren(productIds) {
  if (!productIds.length) {
    return { variantsByProduct: new Map(), categoriesByProduct: new Map() };
  }

  const [variantResult, categoryResult] = await Promise.all([
    query(
      `
      SELECT *
      FROM product_variants
      WHERE product_id = ANY($1::text[])
      ORDER BY sort_order, id
      `,
      [productIds],
    ),
    query(
      `
      SELECT
        pc.product_id,
        pc.category_id,
        pc.is_primary,
        c.name
      FROM product_categories pc
      INNER JOIN categories c ON c.id = pc.category_id
      WHERE pc.product_id = ANY($1::text[])
      ORDER BY pc.is_primary DESC, c.name
      `,
      [productIds],
    ),
  ]);

  const variantsByProduct = new Map();
  for (const row of variantResult.rows) {
    if (!variantsByProduct.has(row.product_id)) {
      variantsByProduct.set(row.product_id, []);
    }
    variantsByProduct.get(row.product_id).push(rowToVariant(row));
  }

  const categoriesByProduct = new Map();
  for (const row of categoryResult.rows) {
    if (!categoriesByProduct.has(row.product_id)) {
      categoriesByProduct.set(row.product_id, { names: [], ids: [] });
    }
    const bucket = categoriesByProduct.get(row.product_id);
    if (row.name) {
      bucket.names.push(row.name);
    }
    if (row.category_id) {
      bucket.ids.push(row.category_id);
    }
  }

  return { variantsByProduct, categoriesByProduct };
}

function assembleProducts(rows, children) {
  return rows.map((row) => {
    const categories = children.categoriesByProduct.get(row.id) || { names: [], ids: [] };
    return rowToProduct(
      row,
      children.variantsByProduct.get(row.id) || [],
      categories.names,
      categories.ids,
    );
  });
}

async function listProductsFromPostgres() {
  const result = await query(
    `SELECT * FROM products ORDER BY created_at DESC, id`,
  );
  const productIds = result.rows.map((row) => row.id);
  const children = await loadProductChildren(productIds);
  return assembleProducts(result.rows, children);
}

async function listProductsPageFromPostgres({
  adminId = "",
  approvalStatus = "",
  limit = 50,
  offset = 0,
} = {}) {
  const filters = [];
  const params = [];

  if (adminId) {
    params.push(adminId);
    filters.push(`admin_id = $${params.length}`);
  }
  if (approvalStatus) {
    params.push(approvalStatus);
    filters.push(`approval_status = $${params.length}`);
  }

  const whereSql = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const countResult = await query(
    `SELECT COUNT(*)::int AS total FROM products ${whereSql}`,
    params,
  );
  const total = countResult.rows[0]?.total || 0;

  params.push(Math.max(1, Number(limit) || 50));
  params.push(Math.max(0, Number(offset) || 0));
  const result = await query(
    `
    SELECT *
    FROM products
    ${whereSql}
    ORDER BY created_at DESC, id
    LIMIT $${params.length - 1} OFFSET $${params.length}
    `,
    params,
  );
  const productIds = result.rows.map((row) => row.id);
  const children = await loadProductChildren(productIds);
  const items = assembleProducts(result.rows, children);
  return {
    items,
    total,
    limit: Math.max(1, Number(limit) || 50),
    offset: Math.max(0, Number(offset) || 0),
    hasMore: Math.max(0, Number(offset) || 0) + items.length < total,
  };
}

async function upsertInventoryMovements(client, movements) {
  for (const movement of asArray(movements)) {
    if (!movement?.id || !movement.product_id) {
      continue;
    }
    await client.query(
      `
      INSERT INTO inventory_movements (
        id, admin_id, account_id, product_id, variant_id,
        order_group_id, order_item_id, quantity, direction, reason,
        role, occurred_at, extra_data, created_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13::jsonb, NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        admin_id = EXCLUDED.admin_id,
        account_id = EXCLUDED.account_id,
        product_id = EXCLUDED.product_id,
        variant_id = EXCLUDED.variant_id,
        order_group_id = EXCLUDED.order_group_id,
        order_item_id = EXCLUDED.order_item_id,
        quantity = EXCLUDED.quantity,
        direction = EXCLUDED.direction,
        reason = EXCLUDED.reason,
        role = EXCLUDED.role,
        occurred_at = EXCLUDED.occurred_at,
        extra_data = EXCLUDED.extra_data
      `,
      [
        movement.id,
        movement.admin_id || "",
        movement.account_id || "",
        movement.product_id,
        movement.variant_id || "",
        movement.order_group_id || null,
        movement.order_item_id || null,
        movement.quantity,
        movement.direction,
        movement.reason || "",
        movement.role || "main",
        movement.occurred_at,
        JSON.stringify(movement.extra_data || {}),
      ],
    );
  }
}

async function upsertProductRecord(client, product) {
  const row = productToRow(product);
  if (!row.id || !row.admin_id || !row.name) {
    return null;
  }

  await client.query(
    `
    INSERT INTO products (
      id, admin_id, name, description, approval_status, is_active,
      original_price, sales_price, stock, sold, barcode, category,
      rating, comment_count, image_url, submitted_at, approved_at,
      approved_by, rejected_at, rejected_by, rejection_reason,
      approval_updated_at, listed_at, extra_data, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10, $11, $12,
      $13, $14, $15, $16, $17,
      $18, $19, $20, $21,
      $22, $23, $24::jsonb, $25, NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      admin_id = EXCLUDED.admin_id,
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      approval_status = EXCLUDED.approval_status,
      is_active = EXCLUDED.is_active,
      original_price = EXCLUDED.original_price,
      sales_price = EXCLUDED.sales_price,
      stock = EXCLUDED.stock,
      sold = EXCLUDED.sold,
      barcode = EXCLUDED.barcode,
      category = EXCLUDED.category,
      rating = EXCLUDED.rating,
      comment_count = EXCLUDED.comment_count,
      image_url = EXCLUDED.image_url,
      submitted_at = COALESCE(products.submitted_at, EXCLUDED.submitted_at),
      approved_at = EXCLUDED.approved_at,
      approved_by = EXCLUDED.approved_by,
      rejected_at = EXCLUDED.rejected_at,
      rejected_by = EXCLUDED.rejected_by,
      rejection_reason = EXCLUDED.rejection_reason,
      approval_updated_at = EXCLUDED.approval_updated_at,
      listed_at = COALESCE(products.listed_at, EXCLUDED.listed_at),
      extra_data = EXCLUDED.extra_data,
      updated_at = NOW()
    `,
    [
      row.id,
      row.admin_id,
      row.name,
      row.description,
      row.approval_status,
      row.is_active,
      row.original_price,
      row.sales_price,
      row.stock,
      row.sold,
      row.barcode,
      row.category,
      row.rating,
      row.comment_count,
      row.image_url,
      row.submitted_at,
      row.approved_at,
      row.approved_by,
      row.rejected_at,
      row.rejected_by,
      row.rejection_reason,
      row.approval_updated_at,
      row.listed_at,
      JSON.stringify(row.extra_data || {}),
      row.created_at,
    ],
  );

  const variants = asArray(product?.variants);
  const variantIds = [];
  for (const [index, variant] of variants.entries()) {
    const variantRow = variantToRow(variant, row.id, index);
    variantIds.push(variantRow.id);
    await client.query(
      `
      INSERT INTO product_variants (
        id, product_id, name, quantity, image_url, original_price,
        sales_price, stock, sort_order, add_ons, extra_data,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10::jsonb, $11::jsonb,
        NOW(), NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        product_id = EXCLUDED.product_id,
        name = EXCLUDED.name,
        quantity = EXCLUDED.quantity,
        image_url = EXCLUDED.image_url,
        original_price = EXCLUDED.original_price,
        sales_price = EXCLUDED.sales_price,
        stock = EXCLUDED.stock,
        sort_order = EXCLUDED.sort_order,
        add_ons = EXCLUDED.add_ons,
        extra_data = EXCLUDED.extra_data,
        updated_at = NOW()
      `,
      [
        variantRow.id,
        variantRow.product_id,
        variantRow.name,
        variantRow.quantity,
        variantRow.image_url,
        variantRow.original_price,
        variantRow.sales_price,
        variantRow.stock,
        variantRow.sort_order,
        JSON.stringify(variantRow.add_ons || []),
        JSON.stringify(variantRow.extra_data || {}),
      ],
    );
  }

  if (variantIds.length) {
    await client.query(
      `
      DELETE FROM product_variants
      WHERE product_id = $1
        AND id <> ALL($2::text[])
      `,
      [row.id, variantIds],
    );
  } else {
    await client.query(
      `DELETE FROM product_variants WHERE product_id = $1`,
      [row.id],
    );
  }

  const categoryNames = productCategoryNames(product);
  const categoryIds = [];
  for (const [index, name] of categoryNames.entries()) {
    const category = await ensureWorkspaceCategory(client, row.admin_id, name);
    if (!category) {
      continue;
    }
    categoryIds.push(category.id);
    await client.query(
      `
      INSERT INTO product_categories (product_id, category_id, is_primary)
      VALUES ($1, $2, $3)
      ON CONFLICT (product_id, category_id) DO UPDATE SET
        is_primary = EXCLUDED.is_primary
      `,
      [row.id, category.id, index === 0],
    );
  }

  if (categoryIds.length) {
    await client.query(
      `
      DELETE FROM product_categories
      WHERE product_id = $1
        AND category_id <> ALL($2::text[])
      `,
      [row.id, categoryIds],
    );
  } else {
    await client.query(
      `DELETE FROM product_categories WHERE product_id = $1`,
      [row.id],
    );
  }

  await upsertInventoryMovements(client, movementsFromProductStockHistory(product));
  return row.id;
}

async function syncProductsToPostgres(products, options = {}) {
  const deleteMissing = options.deleteMissing !== false;
  const incoming = asArray(products);
  const incomingIds = incoming
    .map((product) => String(product?.id ?? "").trim())
    .filter(Boolean);

  await withTransaction(async (client) => {
    for (const product of incoming) {
      await upsertProductRecord(client, product);
    }

    if (deleteMissing) {
      if (incomingIds.length) {
        await client.query(
          `DELETE FROM products WHERE id <> ALL($1::text[])`,
          [incomingIds],
        );
      } else {
        await client.query(`DELETE FROM products`);
      }
    }
  });
}

module.exports = {
  listProductsFromPostgres,
  listProductsPageFromPostgres,
  syncProductsToPostgres,
  upsertInventoryMovements,
};
