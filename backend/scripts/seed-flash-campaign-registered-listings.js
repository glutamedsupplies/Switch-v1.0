"use strict";

/**
 * Seed mock listings and register them into the existing Super Admin
 * Flash Sale campaigns so the "Companies & listings" drawer has rows to show:
 * 10 companies on Payday, variant registrations, a no-photo listing, a long name,
 * and one "Listing no longer available" row.
 *
 * Usage:
 *   node backend/scripts/seed-flash-campaign-registered-listings.js
 *   node backend/scripts/seed-flash-campaign-registered-listings.js --remove
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

const PRODUCT_PREFIX = "prd-sa-campaign-mock-";
const MISSING_PRODUCT_ID = `${PRODUCT_PREFIX}missing`;
const CAMPAIGNS_PATH = path.join(__dirname, "..", "data", "flash_deal_campaigns.json");

const LISTING_SPECS = [
  { key: "earbuds", name: "Wireless Earbuds Pro ANC", price: 2499, photoId: 1, category: "Electronics" },
  { key: "tumbler", name: "Stainless Insulated Tumbler 30oz", price: 699, photoId: 30, category: "Home & Living" },
  {
    key: "hoodie",
    name: "Oversized Cotton Hoodie",
    price: 1199,
    photoId: 64,
    category: "Fashion",
    variants: [
      { id: "hoodie-s", name: "Small" },
      { id: "hoodie-m", name: "Medium" },
      { id: "hoodie-l", name: "Large" },
    ],
  },
  { key: "lamp", name: "Minimalist LED Desk Lamp", price: 899, photoId: 96, category: "Home & Living" },
  {
    key: "sneakers",
    name: "Everyday Running Sneakers — Breathable Knit Upper with Extra Cushion Sole (Limited Colorway)",
    price: 3299,
    photoId: 21,
    category: "Fashion",
    variants: [
      { id: "sneakers-40", name: "EU 40" },
      { id: "sneakers-42", name: "EU 42" },
    ],
  },
  { key: "coffee", name: "Arabica Coffee Beans 1kg", price: 850, photoId: 225, category: "Groceries" },
  { key: "backpack", name: "Laptop Backpack 15.6\"", price: 1599, photoId: 26, category: "Bags" },
  { key: "no-photo", name: "Ceramic Plant Pot Set (no photo)", price: 450, photoId: null, category: "Garden" },
  { key: "watch", name: "Smart Fitness Watch", price: 2899, photoId: 175, category: "Electronics" },
  { key: "skincare", name: "Hydrating Facial Serum 30ml", price: 599, photoId: 360, category: "Beauty" },
  { key: "cookware", name: "Non-stick Frying Pan 28cm", price: 1099, photoId: 292, category: "Kitchen" },
  { key: "speaker", name: "Portable Bluetooth Speaker", price: 1899, photoId: 145, category: "Electronics" },
  { key: "notebook", name: "Dotted Grid Notebook A5", price: 249, photoId: 367, category: "Stationery" },
  { key: "yoga-mat", name: "Non-slip Yoga Mat 6mm", price: 799, photoId: 416, category: "Sports" },
];

const FOOD_SPECS = [
  { key: "food-peppercorn-steak", name: "Peppercorn Ribeye Steak", price: 689, photoId: 292 },
  { key: "food-olive-pasta", name: "Olive Oil Garlic Pasta", price: 329, photoId: 312 },
  { key: "food-noodle-beef", name: "Braised Beef Noodle Soup", price: 259, photoId: 425 },
  { key: "food-mango-bbq", name: "Mango Glazed BBQ Platter", price: 549, photoId: 429 },
  { key: "food-lime-salad", name: "Lime Leaf Chicken Salad", price: 239, photoId: 488 },
  { key: "food-pandan-cake", name: "Pandan Chiffon Cake (Whole)", price: 459, photoId: 493 },
  { key: "food-orchid-rice", name: "Orchid Garlic Fried Rice Bowl", price: 189, photoId: 1080 },
  { key: "food-night-skewers", name: "Night Market Pork Skewers (10 pcs)", price: 299, photoId: 674 },
  { key: "food-mint-latte", name: "Iced Mint Matcha Latte", price: 159, photoId: 431 },
  { key: "food-lantern-ramen", name: "Lantern Tonkotsu Ramen", price: 349, photoId: 1060 },
  { key: "food-peppercorn-wings", name: "Black Pepper Chicken Wings", price: 279, photoId: 102 },
  { key: "food-olive-bruschetta", name: "Tomato Basil Bruschetta Platter", price: 269, photoId: 139 },
].map((spec, index) => ({ ...spec, category: "Food", platformId: "food", sellerIndex: index }));

LISTING_SPECS.push(...FOOD_SPECS);

const TARGET_COMPANY_COUNT = 10;

const CAMPAIGN_PLAN = [
  { match: /payday/i, keys: LISTING_SPECS.map((spec) => spec.key), includeMissing: true },
  {
    match: /10\.10|mega/i,
    keys: ["earbuds", "hoodie", "coffee", "backpack", ...FOOD_SPECS.map((spec) => spec.key)],
    includeMissing: false,
  },
];

function productId(key) {
  return `${PRODUCT_PREFIX}${key}`;
}

function isMockId(id) {
  return String(id || "").startsWith(PRODUCT_PREFIX);
}

async function resolveSellers(query) {
  const result = await query(
    `
      SELECT
        s.admin_id,
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
        AND NULLIF(BTRIM(s.admin_id), '') IS NOT NULL
      ORDER BY a.updated_at DESC NULLS LAST
      LIMIT $1
    `,
    [TARGET_COMPANY_COUNT],
  );
  return result.rows;
}

async function readCampaigns() {
  const raw = await fsPromises.readFile(CAMPAIGNS_PATH, "utf8");
  const decoded = JSON.parse(raw);
  return Array.isArray(decoded) ? decoded : [];
}

async function writeCampaigns(campaigns) {
  await fsPromises.writeFile(CAMPAIGNS_PATH, `${JSON.stringify(campaigns, null, 2)}\n`, "utf8");
}

function stripMock(campaign) {
  const eligibility = { ...(campaign.eligibility || {}) };
  eligibility.productIds = (Array.isArray(eligibility.productIds) ? eligibility.productIds : []).filter(
    (id) => !isMockId(id),
  );
  const productSettings = {};
  for (const [id, value] of Object.entries(campaign.productSettings || {})) {
    if (!isMockId(id)) productSettings[id] = value;
  }
  return { ...campaign, eligibility, productSettings };
}

async function removeMock() {
  const campaigns = (await readCampaigns()).map(stripMock);
  await writeCampaigns(campaigns);
  console.log("Removed mock registered listings from all campaigns.");
}

async function main() {
  loadEnvFile(path.join(__dirname, "..", ".env"));
  loadEnvFile(path.join(__dirname, "..", "..", ".env"));

  if (process.argv.includes("--remove")) {
    await removeMock();
    return;
  }

  const { query, closePool } = require("../db/pool");
  const { syncProductsToPostgres } = require("../services/postgresProductsStore");

  try {
    const sellers = await resolveSellers(query);
    if (!sellers.length) {
      throw new Error("No seller account found to attach mock campaign listings.");
    }
    if (sellers.length < TARGET_COMPANY_COUNT) {
      console.warn(`Only ${sellers.length} seller account(s) available; wanted ${TARGET_COMPANY_COUNT}.`);
    }

    const nowIso = new Date().toISOString();
    const products = LISTING_SPECS.map((spec, index) => {
      const seller = sellers[(spec.sellerIndex ?? index) % sellers.length];
      const imageUrl = spec.photoId == null ? "" : `https://picsum.photos/id/${spec.photoId}/640/640.jpg`;
      const imageUrls = imageUrl ? [imageUrl] : [];
      return {
        id: productId(spec.key),
        adminId: String(seller.admin_id).trim(),
        companyId: String(seller.company_id || "").trim(),
        platformId: spec.platformId || "shop",
        name: spec.name,
        description: "Mock listing for Super Admin campaign Registered listings drawer QA.",
        approvalStatus: "approved",
        isActive: true,
        originalPrice: spec.price,
        stock: 60,
        sold: 0,
        category: spec.category,
        categories: [spec.category],
        rating: 4.7,
        commentCount: 0,
        imageUrl,
        imageUrls,
        listingImageUrls: imageUrls,
        mainImageIndex: 0,
        variants: (spec.variants || []).map((variant) => ({
          ...variant,
          originalPrice: spec.price,
          stock: 20,
        })),
        submittedAt: nowIso,
        approvedAt: nowIso,
        approvedBy: "super-admin",
        listedAt: nowIso,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
    });

    await syncProductsToPostgres(products, { deleteMissing: false });

    const specsByKey = new Map(LISTING_SPECS.map((spec) => [spec.key, spec]));
    const campaigns = (await readCampaigns()).map(stripMock);
    const touched = [];
    for (const plan of CAMPAIGN_PLAN) {
      const campaign = campaigns.find((entry) => plan.match.test(String(entry?.name || "")));
      if (!campaign) continue;
      const ids = plan.keys.map(productId);
      if (plan.includeMissing) ids.push(MISSING_PRODUCT_ID);
      campaign.eligibility = {
        ...campaign.eligibility,
        scope: "products",
        productIds: [...campaign.eligibility.productIds, ...ids],
      };
      for (const key of plan.keys) {
        const variants = specsByKey.get(key)?.variants || [];
        campaign.productSettings[productId(key)] = {
          dealStock: null,
          perBuyerLimit: null,
          variantIds: variants.map((variant) => variant.id),
        };
      }
      campaign.updatedAt = nowIso;
      touched.push(`${campaign.name} → ${ids.length} registered`);
    }
    await writeCampaigns(campaigns);

    console.log(`Sellers: ${sellers.map((seller) => `${seller.label} (${seller.admin_id})`).join(", ")}`);
    for (const line of touched) console.log(`  ${line}`);
    if (!touched.length) console.log("  No matching campaigns found in flash_deal_campaigns.json.");
    console.log("Open Super Admin → Flash Deals → campaign → Registered listings.");
  } finally {
    await closePool();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
