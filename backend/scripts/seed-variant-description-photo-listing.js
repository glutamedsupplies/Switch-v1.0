"use strict";

/**
 * Seed one approved mock listing that has variants (each with its own photo)
 * and a product description made of photos, for QA of the variant picker and
 * the description image gallery.
 *
 * Usage:
 *   node backend/scripts/seed-variant-description-photo-listing.js
 *   node backend/scripts/seed-variant-description-photo-listing.js --remove
 */

const fs = require("fs");
const path = require("path");

function loadEnvFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return;
    for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex <= 0) continue;
      const key = trimmed.slice(0, separatorIndex).trim();
      if (!key || process.env[key] != null) continue;
      let value = trimmed.slice(separatorIndex + 1).trim();
      if (
        value.length >= 2 &&
        ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'")))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  } catch (_error) {
    // ignore
  }
}

const PRODUCT_ID = "prd-qa-variant-desc-photos";
const FALLBACK_SELLER_ADMIN_ID = "acct-1788607583538";

const LISTING_PHOTO_IDS = [21, 26, 96, 119];
const DESCRIPTION_PHOTO_IDS = [180, 201, 250, 367];

const VARIANTS = [
  { key: "black-s", name: "Black / Small", photoId: 21, originalPrice: 899, salesPrice: 699 },
  { key: "black-m", name: "Black / Medium", photoId: 21, originalPrice: 899, salesPrice: 699 },
  { key: "white-m", name: "White / Medium", photoId: 26, originalPrice: 949, salesPrice: 749 },
  { key: "navy-l", name: "Navy / Large", photoId: 96, originalPrice: 999, salesPrice: null },
];

function photoUrl(id, width = 960, height = 720) {
  return `https://picsum.photos/id/${id}/${width}/${height}.jpg`;
}

async function resolveSeller(query) {
  const sellerSql = (whereSql) => `
    SELECT
      s.admin_id,
      a.id AS account_id,
      company.company_id,
      COALESCE(NULLIF(BTRIM(company.company_name), ''), NULLIF(BTRIM(s.store_name), ''), s.admin_id) AS label
    FROM accounts a
    INNER JOIN seller_profiles s ON s.account_id = a.id
    LEFT JOIN LATERAL (
      SELECT c.id AS company_id, c.name AS company_name
      FROM companies c
      WHERE c.type = 'seller'
        AND (
          c.source_account_id = a.id
          OR EXISTS (
            SELECT 1 FROM company_memberships m
            WHERE m.company_id = c.id AND m.account_id = a.id
          )
        )
      ORDER BY CASE WHEN c.source_account_id = a.id THEN 0 ELSE 1 END, c.created_at
      LIMIT 1
    ) company ON TRUE
    ${whereSql}
    LIMIT 1
  `;

  const requestedAdminId = String(
    process.env.SEED_SELLER_ADMIN_ID || FALLBACK_SELLER_ADMIN_ID,
  ).trim();
  const preferred = await query(sellerSql("WHERE s.admin_id = $1"), [requestedAdminId]);
  if (preferred.rows[0]) return preferred.rows[0];

  const anySeller = await query(
    sellerSql(`
      WHERE COALESCE(a.status::text, 'active') NOT IN ('banned', 'deleted')
      ORDER BY a.updated_at DESC NULLS LAST
    `),
  );
  return anySeller.rows[0] || null;
}

function buildProduct({ adminId, companyId }) {
  const nowIso = new Date().toISOString();
  const imageUrls = LISTING_PHOTO_IDS.map((id) => photoUrl(id));
  const descriptionImageUrls = DESCRIPTION_PHOTO_IDS.map((id) => photoUrl(id, 900, 1200));

  const variants = VARIANTS.map((variant) => {
    const imageUrl = photoUrl(variant.photoId);
    return {
      id: `${PRODUCT_ID}-var-${variant.key}`,
      name: variant.name,
      imageUrl,
      imageSourceUrl: imageUrl,
      imagePositionX: 50,
      imagePositionY: 50,
      addOns: [],
      originalPrice: variant.originalPrice,
      ...(variant.salesPrice == null ? {} : { salesPrice: variant.salesPrice }),
      quantity: "",
      stock: 0,
    };
  });

  return {
    id: PRODUCT_ID,
    adminId,
    companyId,
    name: "QA Variant Tee — Description Photos",
    description:
      "Mock listing for QA. Has 4 variants (color / size) with their own photos, " +
      "and a product description made of 4 photos below this text.",
    descriptionImageUrls,
    approvalStatus: "approved",
    isActive: true,
    originalPrice: 899,
    salesPrice: 699,
    stock: 60,
    sold: 0,
    category: "Variant QA",
    categories: ["Variant QA"],
    rating: 4.7,
    commentCount: 0,
    imageUrl: imageUrls[0],
    mainImageUrl: imageUrls[0],
    imageUrls,
    listingImageUrls: imageUrls,
    mainImageIndex: 0,
    variants,
    submittedAt: nowIso,
    approvedAt: nowIso,
    approvedBy: "super-admin",
    listedAt: nowIso,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

async function main() {
  loadEnvFile(path.join(__dirname, "..", ".env"));
  loadEnvFile(path.join(__dirname, "..", "..", ".env"));

  const { query, closePool } = require("../db/pool");

  if (process.argv.includes("--remove")) {
    const result = await query(`DELETE FROM products WHERE id = $1`, [PRODUCT_ID]);
    console.log(
      result.rowCount
        ? `Removed mock listing ${PRODUCT_ID} (variants cascade).`
        : `Mock listing ${PRODUCT_ID} was not found.`,
    );
    await closePool();
    return;
  }

  const { syncProductsToPostgres } = require("../services/postgresProductsStore");

  const seller = await resolveSeller(query);
  if (!seller?.admin_id) {
    throw new Error("No seller account found to attach the mock listing.");
  }

  const adminId = String(seller.admin_id).trim();
  const companyId = String(seller.company_id || "").trim();
  const product = buildProduct({ adminId, companyId });

  await syncProductsToPostgres([product], { deleteMissing: false });

  const check = await query(
    `
      SELECT
        p.id,
        p.name,
        jsonb_array_length(COALESCE(p.extra_data->'descriptionImageUrls', '[]'::jsonb)) AS description_photos,
        (SELECT COUNT(*)::int FROM product_variants v WHERE v.product_id = p.id) AS variants
      FROM products p
      WHERE p.id = $1
    `,
    [PRODUCT_ID],
  );
  const row = check.rows[0];

  console.log(`Seller: ${seller.label || adminId} (${adminId})`);
  console.log(`Listing: ${row?.name} (${row?.id})`);
  console.log(`  Variants: ${row?.variants}`);
  for (const variant of product.variants) {
    const price = variant.salesPrice ?? variant.originalPrice;
    console.log(`    - ${variant.name}  ₱${price}`);
  }
  console.log(`  Description photos: ${row?.description_photos}`);
  console.log("Remove with: node backend/scripts/seed-variant-description-photo-listing.js --remove");

  await closePool();
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : error);
  try {
    await require("../db/pool").closePool();
  } catch (_error) {
    // ignore
  }
  process.exitCode = 1;
});
