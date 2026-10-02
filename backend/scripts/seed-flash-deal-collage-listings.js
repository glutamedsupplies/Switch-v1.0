"use strict";

/**
 * Seed mock listings with 2, 3, 4, 5, and 7 photos plus live Flash Deals
 * so Super Admin Flash Deals can show collage vs single-hero media,
 * including the View more photos control when there are more than 5 photos.
 *
 * Usage: node backend/scripts/seed-flash-deal-collage-listings.js
 */

const fs = require("fs");
const fsPromises = require("fs/promises");
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

const PRODUCT_PREFIX = "prd-flash-collage-";
const DEAL_PREFIX = "flash-collage-";
const FALLBACK_SELLER_ADMIN_ID = "acct-1788607583538";

const LISTING_SPECS = [
  {
    photoCount: 2,
    photoIds: [237, 238],
    name: "Collage QA — 2 photos",
    price: 420,
    flashPrice: 210,
  },
  {
    photoCount: 3,
    photoIds: [239, 240, 241],
    name: "Collage QA — 3 photos",
    price: 560,
    flashPrice: 280,
  },
  {
    photoCount: 4,
    photoIds: [242, 243, 244, 249],
    name: "Collage QA — 4 photos",
    price: 740,
    flashPrice: 370,
  },
  {
    photoCount: 5,
    photoIds: [250, 251, 252, 256, 257],
    name: "Collage QA — 5 photos",
    price: 980,
    flashPrice: 490,
  },
  {
    photoCount: 7,
    photoIds: [258, 259, 274, 275, 276, 277, 278],
    name: "Collage QA — 7 photos",
    price: 1280,
    flashPrice: 640,
  },
];

function photoUrl(id) {
  return `https://picsum.photos/id/${id}/960/720.jpg`;
}

async function resolveSeller(query) {
  const preferred = await query(
    `
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
      WHERE s.admin_id = $1
      LIMIT 1
    `,
    [FALLBACK_SELLER_ADMIN_ID],
  );
  if (preferred.rows[0]) return preferred.rows[0];

  const anySeller = await query(
    `
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
      WHERE COALESCE(a.status::text, 'active') NOT IN ('banned', 'deleted')
      ORDER BY a.updated_at DESC NULLS LAST
      LIMIT 1
    `,
  );
  return anySeller.rows[0] || null;
}

async function main() {
  loadEnvFile(path.join(__dirname, "..", ".env"));
  loadEnvFile(path.join(__dirname, "..", "..", ".env"));

  const { query, closePool } = require("../db/pool");
  const { syncProductsToPostgres } = require("../services/postgresProductsStore");

  const seller = await resolveSeller(query);
  if (!seller?.admin_id) {
    throw new Error("No seller account found to attach collage QA listings.");
  }

  const adminId = String(seller.admin_id).trim();
  const companyId = String(seller.company_id || "").trim();
  const now = new Date();
  const nowIso = now.toISOString();
  const startsAt = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const endsAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

  const products = LISTING_SPECS.map((spec) => {
    const imageUrls = spec.photoIds.map(photoUrl);
    return {
      id: `${PRODUCT_PREFIX}${spec.photoCount}`,
      adminId,
      companyId,
      name: spec.name,
      description: `Mock listing with ${spec.photoCount} photos for Flash Deal collage QA.`,
      approvalStatus: "approved",
      isActive: true,
      originalPrice: spec.price,
      salesPrice: spec.flashPrice,
      stock: 40 + spec.photoCount,
      sold: 0,
      category: "Collage QA",
      categories: ["Collage QA"],
      rating: 4.8,
      commentCount: spec.photoCount,
      imageUrl: imageUrls[0],
      imageUrls,
      listingImageUrls: imageUrls,
      mainImageIndex: 0,
      submittedAt: nowIso,
      approvedAt: nowIso,
      approvedBy: "super-admin",
      listedAt: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
  });

  await syncProductsToPostgres(products, { deleteMissing: false });

  const dealsPath = path.join(__dirname, "..", "data", "flash_deals.json");
  let existing = [];
  try {
    const raw = await fsPromises.readFile(dealsPath, "utf8");
    const decoded = JSON.parse(raw);
    existing = Array.isArray(decoded) ? decoded : [];
  } catch (_error) {
    existing = [];
  }

  const kept = existing.filter(
    (deal) => !String(deal?.id || "").startsWith(DEAL_PREFIX),
  );
  const mockDeals = LISTING_SPECS.map((spec) => {
    const imageUrls = spec.photoIds.map(photoUrl);
    return {
      id: `${DEAL_PREFIX}${spec.photoCount}`,
      productId: `${PRODUCT_PREFIX}${spec.photoCount}`,
      sellerAdminId: adminId,
      flashPrice: spec.flashPrice,
      originalPriceSnapshot: spec.price,
      dealStockLimit: 20,
      perBuyerLimit: 2,
      startsAt,
      endsAt,
      notes: `Mock Flash Deal for ${spec.photoCount}-photo collage QA.`,
      variantId: "",
      productName: spec.name,
      platformId: "",
      dealStockSold: 0,
      dealStockReserved: 0,
      status: "live",
      approvalStatus: "approved",
      listingImagesSnapshot: imageUrls,
      createdAt: nowIso,
      updatedAt: nowIso,
      createdBy: adminId,
      approvedBy: "super-admin",
    };
  });

  await fsPromises.writeFile(
    dealsPath,
    `${JSON.stringify([...mockDeals, ...kept], null, 2)}\n`,
    "utf8",
  );

  console.log(`Seller: ${seller.label || adminId} (${adminId})`);
  for (const spec of LISTING_SPECS) {
    console.log(`  ${spec.name} → ${spec.photoCount} photos`);
  }
  console.log("Open Super Admin → Flash Deals to check collage vs single photo.");

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
