"use strict";

/**
 * Curate Super Admin business types (store_types):
 * - fix "Hotes & Restaurant" typo (preserve stable id)
 * - enrich thin category trees
 * - add missing starter types for Shop / Food / Resort
 *
 * Usage: node scripts/curate-super-admin-business-types.js
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
        (value.startsWith('"') && value.endsWith('"'))
        || (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  } catch (_) {
    // ignore
  }
}

loadEnvFile(path.join(__dirname, "..", ".env"));

const {
  listStoreTypesFromPostgres,
  syncStoreTypesToPostgres,
} = require("../services/postgresCatalogStore");
const { query, isPostgresConfigured } = require("../db/pool");

const DATA_FILE = path.join(__dirname, "..", "data", "store_types.json");
const OLD_HOTEL_NAME = "Hotes & Restaurant";
const NEW_HOTEL_NAME = "Hotels & Restaurant";

function categoryDetail(name, extras = {}) {
  return {
    name,
    productCount: 0,
    imageUrl: extras.imageUrl || "",
    iconImageUrl: extras.iconImageUrl || "",
    iconName: extras.iconName || "",
    status: "active",
  };
}

function businessType({
  id,
  name,
  platformId,
  categories,
  status = "active",
  commissionRate = 0,
  serviceFee = 0,
  heroImageUrl = "",
  iconImageUrl = "",
  iconName = "",
  categoryExtras = {},
}) {
  return {
    ...(id ? { id } : {}),
    name,
    platformId,
    categories,
    status,
    commissionRate,
    serviceFee,
    heroImageUrl,
    iconImageUrl,
    iconName,
    categoryDetails: categories.map((categoryName) =>
      categoryDetail(categoryName, categoryExtras[categoryName] || {}),
    ),
  };
}

function buildCuratedStoreTypes(existingByName) {
  const hardware = existingByName.get("hardware");
  const hotels = existingByName.get(OLD_HOTEL_NAME.toLowerCase())
    || existingByName.get(NEW_HOTEL_NAME.toLowerCase());
  const restaurants = existingByName.get("restaurants");
  const wellness = existingByName.get("wellness center");
  const grocery = existingByName.get("grocery");
  const cafe = existingByName.get("cafe");
  const bakery = existingByName.get("bakery");
  const fashion = existingByName.get("fashion");
  const electronics = existingByName.get("electronics");
  const pharmacy = existingByName.get("pharmacy");
  const resort = existingByName.get("resort");

  return [
    businessType({
      id: wellness?.id,
      name: "Wellness Center",
      platformId: "shop",
      iconName: wellness?.iconName || "tabler-activity-heartbeat",
      heroImageUrl: wellness?.heroImageUrl || "",
      iconImageUrl: wellness?.iconImageUrl || "",
      categories: ["Botox", "Collagen", "Gluta", "Treatments", "Skincare"],
    }),
    businessType({
      id: hardware?.id,
      name: "Hardware",
      platformId: "shop",
      iconName: hardware?.iconName || "hammer",
      heroImageUrl: hardware?.heroImageUrl || "",
      iconImageUrl: hardware?.iconImageUrl || "",
      categories: ["Equipment", "Tools", "Materials"],
      categoryExtras: {
        Equipment: {
          imageUrl: hardware?.categoryDetails?.find((c) => c.name === "Equipment")?.imageUrl || "",
          iconName: "hammer",
        },
        Tools: { iconName: "wrench" },
        Materials: { iconName: "boxes" },
      },
    }),
    businessType({
      id: grocery?.id,
      name: "Grocery",
      platformId: "shop",
      iconName: grocery?.iconName || "shopping-basket",
      heroImageUrl: grocery?.heroImageUrl || "",
      iconImageUrl: grocery?.iconImageUrl || "",
      categories: ["Produce", "Dairy", "Pantry", "Beverages"],
      categoryExtras: {
        Produce: { iconName: "carrot" },
        Dairy: { iconName: "milk" },
        Pantry: { iconName: "package" },
        Beverages: { iconName: "cup-soda" },
      },
    }),
    businessType({
      id: fashion?.id,
      name: "Fashion",
      platformId: "shop",
      iconName: fashion?.iconName || "shirt",
      heroImageUrl: fashion?.heroImageUrl || "",
      iconImageUrl: fashion?.iconImageUrl || "",
      categories: ["Apparel", "Accessories", "Footwear"],
      categoryExtras: {
        Apparel: { iconName: "shirt" },
        Accessories: { iconName: "watch" },
        Footwear: { iconName: "footprints" },
      },
    }),
    businessType({
      id: electronics?.id,
      name: "Electronics",
      platformId: "shop",
      iconName: electronics?.iconName || "laptop",
      heroImageUrl: electronics?.heroImageUrl || "",
      iconImageUrl: electronics?.iconImageUrl || "",
      categories: ["Phones", "Computers", "Accessories"],
      categoryExtras: {
        Phones: { iconName: "smartphone" },
        Computers: { iconName: "laptop" },
        Accessories: { iconName: "headphones" },
      },
    }),
    businessType({
      id: pharmacy?.id,
      name: "Pharmacy",
      platformId: "shop",
      iconName: pharmacy?.iconName || "pill",
      heroImageUrl: pharmacy?.heroImageUrl || "",
      iconImageUrl: pharmacy?.iconImageUrl || "",
      categories: ["Medicines", "Personal Care", "Vitamins"],
      categoryExtras: {
        Medicines: { iconName: "pill" },
        "Personal Care": { iconName: "heart-pulse" },
        Vitamins: { iconName: "leaf" },
      },
    }),
    businessType({
      id: restaurants?.id,
      name: "Restaurants",
      platformId: "food",
      iconName: restaurants?.iconName || "fork-knife",
      heroImageUrl: restaurants?.heroImageUrl || "",
      iconImageUrl: restaurants?.iconImageUrl || "",
      categories: ["Meals", "Drinks", "Soup", "Desserts"],
      categoryExtras: {
        Meals: { iconName: "utensils" },
        Drinks: { iconName: "glass-water" },
        Soup: { iconName: "soup" },
        Desserts: { iconName: "cake-slice" },
      },
    }),
    businessType({
      id: cafe?.id,
      name: "Cafe",
      platformId: "food",
      iconName: cafe?.iconName || "coffee",
      heroImageUrl: cafe?.heroImageUrl || "",
      iconImageUrl: cafe?.iconImageUrl || "",
      categories: ["Coffee", "Pastries", "Drinks", "Light Meals"],
      categoryExtras: {
        Coffee: { iconName: "coffee" },
        Pastries: { iconName: "croissant" },
        Drinks: { iconName: "cup-soda" },
        "Light Meals": { iconName: "sandwich" },
      },
    }),
    businessType({
      id: bakery?.id,
      name: "Bakery",
      platformId: "food",
      iconName: bakery?.iconName || "croissant",
      heroImageUrl: bakery?.heroImageUrl || "",
      iconImageUrl: bakery?.iconImageUrl || "",
      categories: ["Breads", "Cakes", "Pastries"],
      categoryExtras: {
        Breads: { iconName: "wheat" },
        Cakes: { iconName: "cake" },
        Pastries: { iconName: "croissant" },
      },
    }),
    businessType({
      // Preserve the typo row id so rename does not orphan categories/products.
      id: hotels?.id || "st_6addc68231affc68",
      name: NEW_HOTEL_NAME,
      platformId: "hotels",
      iconName: hotels?.iconName || "hotel",
      heroImageUrl: hotels?.heroImageUrl || "",
      iconImageUrl: hotels?.iconImageUrl || "",
      categories: ["Rooms", "Dining", "Drinks", "Amenities"],
      categoryExtras: {
        Rooms: { iconName: "bed-double" },
        Dining: { iconName: "utensils" },
        Drinks: {
          iconName: "glass-water",
          imageUrl: hotels?.categoryDetails?.find((c) => c.name === "Drinks")?.imageUrl || "",
        },
        Amenities: { iconName: "sparkles" },
      },
    }),
    businessType({
      id: resort?.id,
      name: "Resort",
      platformId: "resort",
      iconName: resort?.iconName || "palmtree",
      heroImageUrl: resort?.heroImageUrl || "",
      iconImageUrl: resort?.iconImageUrl || "",
      categories: ["Rooms", "Activities", "Dining", "Spa"],
      categoryExtras: {
        Rooms: { iconName: "bed-double" },
        Activities: { iconName: "waves" },
        Dining: { iconName: "utensils" },
        Spa: { iconName: "flower-2" },
      },
    }),
  ];
}

async function renameHotelAccounts() {
  const attempts = [
    {
      label: "accounts.store_type",
      sql: `
        UPDATE accounts
        SET store_type = $1,
            store_type_name = $1,
            business_type = $1
        WHERE LOWER(TRIM(COALESCE(store_type, ''))) = LOWER($2)
           OR LOWER(TRIM(COALESCE(store_type_name, ''))) = LOWER($2)
           OR LOWER(TRIM(COALESCE(business_type, ''))) = LOWER($2)
      `,
    },
    {
      label: "seller_profiles.store_type",
      sql: `
        UPDATE seller_profiles
        SET store_type = $1
        WHERE LOWER(TRIM(COALESCE(store_type, ''))) = LOWER($2)
      `,
    },
  ];

  for (const attempt of attempts) {
    try {
      const result = await query(attempt.sql, [NEW_HOTEL_NAME, OLD_HOTEL_NAME]);
      console.log(`${attempt.label} updated=${result.rowCount}`);
    } catch (error) {
      console.log(`${attempt.label} skipped: ${error.message}`);
    }
  }
}

function writeJsonBackup(storeTypes) {
  const serializable = storeTypes.map((storeType) => {
    const copy = { ...storeType };
    delete copy.id;
    return copy;
  });
  fs.writeFileSync(DATA_FILE, `${JSON.stringify(serializable, null, 2)}\n`, "utf8");
  console.log(`wrote ${DATA_FILE}`);
}

(async () => {
  if (!isPostgresConfigured()) {
    throw new Error("DATABASE_URL is required.");
  }

  const existing = await listStoreTypesFromPostgres();
  const existingByName = new Map(
    existing.map((storeType) => [String(storeType.name || "").trim().toLowerCase(), storeType]),
  );

  const curated = buildCuratedStoreTypes(existingByName);
  await syncStoreTypesToPostgres(curated, { deleteMissing: true });
  await renameHotelAccounts();
  writeJsonBackup(curated);

  const after = await listStoreTypesFromPostgres();
  console.log(
    "business_types",
    after.map((row) => `${row.name} [${row.platformId}] -> ${row.categories.join(", ")}`),
  );
  process.exit(0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
