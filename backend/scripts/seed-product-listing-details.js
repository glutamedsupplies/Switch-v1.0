"use strict";

/**
 * Fill every product listing with mock details for QA of the product details
 * page: specifications, variants (each with its own photo), an "About this
 * product" description, and buyer reviews with photos and videos.
 *
 * Existing data is kept: a listing only gets what it is missing. Generated
 * variants are tagged `seedGenerated`, replaced descriptions keep the original
 * in `seedOriginalDescription`, and reviews go to `seedReviewComments` (merged
 * with real, order-based reviews by server.js), so `--remove` can undo it all.
 *
 * Usage:
 *   node backend/scripts/seed-product-listing-details.js
 *   node backend/scripts/seed-product-listing-details.js --dry-run
 *   node backend/scripts/seed-product-listing-details.js --remove
 *   node backend/scripts/seed-product-listing-details.js --review-media   (only refresh photos/videos on existing mock reviews)
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

const MIN_DESCRIPTION_LENGTH = 40;
const SYNC_BATCH_SIZE = 50;
const DAY_MS = 24 * 60 * 60 * 1000;

// Stable per-listing randomness so re-runs produce the same mock values.
function hashString(value) {
  let hash = 2166136261;
  for (const char of String(value)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pick(list, seed, offset = 0) {
  return list[(seed + offset * 7919) % list.length];
}

function slug(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

function roundPrice(value) {
  return Math.max(1, Math.round(value / 5) * 5);
}

const SPEC_VALUE_POOLS = {
  size: ["Regular", "Medium", "Large", "16 oz", "6 inches"],
  temperature: ["Iced", "Hot", "Iced or hot"],
  sugar_level: ["50%", "75%", "100%", "25%"],
  flavor: ["Classic", "Chocolate", "Mango", "Caramel", "Matcha"],
  volume: ["350 ml", "500 ml", "700 ml"],
  caffeine: ["With caffeine", "Decaf", "Caffeine-free"],
  serving_size: ["Good for 1", "Good for 2", "Good for 3–4"],
  main_ingredient: ["Chicken", "Pork", "Beef", "Vegetables", "Seafood"],
  spice_level: ["Mild", "Medium", "Spicy", "Not spicy"],
  rice: ["With plain rice", "With garlic rice", "No rice"],
  preparation_time: ["10 minutes", "15 minutes", "20 minutes"],
  allergens: ["Contains dairy", "Contains soy", "Contains nuts", "None listed"],
  sweetness: ["Less sweet", "Regular", "Extra sweet"],
  color: ["Black", "White", "Navy", "Midnight black", "Beige"],
  material: ["100% cotton", "Stainless steel", "Polyester blend", "ABS plastic"],
  fit: ["Regular fit", "Relaxed fit", "Slim fit"],
  brand: ["Switch Select", "Generic", "Local brand"],
  gender: ["Unisex", "Men", "Women"],
  model: ["2026 Edition", "Standard", "Pro"],
  storage: ["128 GB", "256 GB", "512 GB"],
  warranty: ["7-day replacement", "6 months local warranty", "1 year local warranty"],
  weight: ["250 g", "500 g", "1 kg"],
  dimensions: ["15 x 7 x 3 cm", "20 x 15 x 5 cm", "30 x 20 x 10 cm"],
  country_of_origin: ["Philippines", "Japan", "South Korea"],
};

// Categories on the default specification list, where generic values
// (e.g. "Stainless steel") would read oddly.
const CATEGORY_SPEC_VALUE_POOLS = {
  rooms: {
    brand: ["Switch Hotels", "Bayview Suites"],
    model: ["Deluxe", "Premier", "Suite"],
    warranty: ["Free cancellation up to 24 hours before check-in"],
    material: ["Queen bed, air-conditioned", "King bed, city view"],
    color: ["Neutral tones", "Ocean blue accents"],
    size: ["28 sqm", "36 sqm", "48 sqm"],
    weight: ["Good for 2 guests", "Good for 4 guests"],
    dimensions: ["28 sqm", "36 sqm"],
  },
  dining: {
    brand: ["House specialty"],
    model: ["Chef's recommendation", "Best seller"],
    warranty: ["Served fresh, best consumed immediately"],
    material: ["Locally sourced ingredients"],
    color: ["—"],
    size: ["Good for 1", "Good for 2", "Sharing platter"],
    weight: ["350 g", "500 g"],
    dimensions: ["Standard plate"],
  },
};
CATEGORY_SPEC_VALUE_POOLS.food = CATEGORY_SPEC_VALUE_POOLS.dining;

function specValueFor(option, product, seed, index) {
  if (option.key === "sku") {
    return `SW-${slug(product.id).toUpperCase().slice(-8) || "ITEM"}`;
  }
  const categoryPools =
    CATEGORY_SPEC_VALUE_POOLS[String(product.category ?? "").trim().toLowerCase()] || {};
  const pool = categoryPools[option.key] || SPEC_VALUE_POOLS[option.key];
  if (pool) {
    return pick(pool, seed, index);
  }
  const example = String(option.placeholder ?? "").replace(/^e\.g\.\s*/i, "").trim();
  return example || "Standard";
}

function buildProductSpecifications(product, settings, seed, normalize) {
  const existing = Array.isArray(product.specifications) ? product.specifications : [];
  const existingKeys = new Set(existing.map((entry) => String(entry?.key ?? "").toLowerCase()));
  const filled = [...existing];
  settings.options.forEach((option, index) => {
    if (!existingKeys.has(option.key)) {
      filled.push({ key: option.key, value: specValueFor(option, product, seed, index) });
    }
  });
  return normalize(filled, product.category);
}

const VARIANT_PRESETS = {
  drinks: ["Regular (12 oz)", "Large (16 oz)", "Venti (20 oz)"],
  meals: ["Solo", "Good for 2", "Family (good for 4)"],
  desserts: ["Slice", "6-inch", "8-inch"],
  soup: ["Bowl", "Pot (good for 3)"],
  apparel: ["Small", "Medium", "Large"],
  phones: ["128 GB", "256 GB"],
  rooms: ["1 night", "2 nights", "Weekend (3 nights)"],
  dining: ["Solo", "Good for 2", "Sharing platter"],
  food: ["Regular", "Large", "Party tray"],
  "hotels & restaurant": ["1 night", "2 nights"],
  fashion: ["Small", "Medium", "Large"],
  bags: ["Black", "Brown", "Beige"],
  skincare: ["30 ml", "50 ml", "100 ml"],
  beauty: ["Shade 01", "Shade 02", "Shade 03"],
  electronics: ["Black", "White"],
  groceries: ["500 g", "1 kg", "2 kg"],
  "home & living": ["Small", "Medium", "Large"],
  kitchen: ["Small", "Medium", "Large"],
  sports: ["Small", "Medium", "Large"],
  stationery: ["Single", "Pack of 3", "Pack of 10"],
  garden: ["Small pot", "Medium pot", "Large pot"],
};
const DEFAULT_VARIANT_NAMES = ["Standard", "Premium"];
const VARIANT_SPEC_KEYS = ["size", "storage", "serving_size", "volume", "color"];

function buildVariants(product, settings) {
  const names =
    VARIANT_PRESETS[String(product.category ?? "").trim().toLowerCase()] ||
    DEFAULT_VARIANT_NAMES;
  const images = [
    ...new Set(
      [product.imageUrl, ...(Array.isArray(product.imageUrls) ? product.imageUrls : [])]
        .map((url) => String(url ?? "").trim())
        .filter(Boolean),
    ),
  ];
  const specKey =
    VARIANT_SPEC_KEYS.find((key) => settings.options.some((option) => option.key === key)) ||
    settings.options[0]?.key ||
    "";
  const baseOriginal = Number(product.originalPrice) > 0 ? Number(product.originalPrice) : 199;
  const baseSales =
    product.salesPrice != null && Number(product.salesPrice) < baseOriginal
      ? Number(product.salesPrice)
      : null;
  const totalStock = Math.max(0, Math.trunc(Number(product.stock) || 0));
  const perVariantStock = Math.floor(totalStock / names.length);

  return names.map((name, index) => {
    const multiplier = 1 + index * 0.18;
    const imageUrl = images.length ? images[index % images.length] : "";
    const originalPrice = index === 0 ? baseOriginal : roundPrice(baseOriginal * multiplier);
    const salesPrice =
      baseSales == null ? null : index === 0 ? baseSales : roundPrice(baseSales * multiplier);
    return {
      id: `${product.id}-var-${slug(name) || index + 1}`,
      name,
      imageUrl,
      imageSourceUrl: imageUrl,
      imagePositionX: 50,
      imagePositionY: 50,
      addOns: [],
      originalPrice,
      ...(salesPrice == null ? {} : { salesPrice }),
      quantity: "",
      stock: perVariantStock + (index === 0 ? totalStock - perVariantStock * names.length : 0),
      specifications: specKey ? [{ key: specKey, value: name }] : [],
      seedGenerated: true,
    };
  });
}

function ensureVariantSpecifications(product, settings, normalize) {
  const fallbackKey =
    VARIANT_SPEC_KEYS.find((key) => settings.options.some((option) => option.key === key)) ||
    settings.options[0]?.key ||
    "";
  let changed = false;
  const variants = product.variants.map((variant) => {
    const current = normalize(variant?.specifications, product.category);
    if (current.length >= settings.variantMinRequired || !fallbackKey) {
      return variant;
    }
    changed = true;
    return {
      ...variant,
      specifications: normalize(
        [...current, { key: fallbackKey, value: String(variant?.name ?? "Standard") }],
        product.category,
      ),
    };
  });
  return changed ? variants : null;
}

const DESCRIPTION_LINES = {
  drinks: "Freshly prepared per order using quality ingredients, served the way you like it.",
  meals: "Cooked fresh when you order and packed to stay warm until it reaches you.",
  desserts: "Baked in small batches for a soft, rich taste in every bite.",
  soup: "Slow-cooked for a deep, comforting flavor, perfect for rainy days.",
  apparel: "Made from comfortable, breathable fabric that holds its shape after washing.",
  phones: "Brand-new, sealed unit with complete accessories and local warranty support.",
  rooms: "Clean, air-conditioned room with fresh linens, free Wi-Fi, and 24/7 front desk assistance.",
  dining: "Prepared by our kitchen team using fresh, locally sourced ingredients.",
  food: "Cooked fresh when you order and packed to stay warm until it reaches you.",
  skincare: "Gentle, dermatologist-tested formula suitable for daily use.",
  electronics: "Brand-new unit, tested before shipping, with local warranty support.",
  fashion: "Made from comfortable, breathable fabric that holds its shape after washing.",
  groceries: "Fresh stock, packed carefully and delivered straight from the store.",
};

function buildDescription(product) {
  const name = String(product.name ?? "This item").trim() || "This item";
  const category = String(product.category ?? "").trim();
  const seller = String(product.companyName ?? "").trim();
  const categoryLine =
    DESCRIPTION_LINES[category.toLowerCase()] ||
    "Carefully checked before shipping so you receive it in great condition.";
  return [
    `${name}${category ? ` — one of our best-loved ${category.toLowerCase()} picks` : ""}.`,
    categoryLine,
    seller
      ? `Sold and fulfilled by ${seller}. Message the seller anytime for questions about sizes, stock, or delivery.`
      : "Message the seller anytime for questions about sizes, stock, or delivery.",
    "Available in several variants — pick the one that fits you best before adding to cart.",
  ].join("\n\n");
}

const REVIEWERS = [
  "Maria S.", "Juan D.", "Angelica R.", "Paolo M.", "Kristine L.",
  "Mark A.", "Bea T.", "Carlo V.", "Joanna P.", "Miguel F.",
];
const REVIEW_TEMPLATES = [
  { rating: 5, title: "Sulit!", message: "Exactly as described and arrived quickly. Will order again." },
  { rating: 5, title: "Highly recommended", message: "Great quality for the price. Packaging was neat and secure." },
  { rating: 4, title: "Good buy", message: "Nice item overall. Delivery took a bit longer than expected but worth it." },
  { rating: 5, title: "Legit seller", message: "Seller was very responsive and the variant I chose was correct." },
  { rating: 4, title: "Satisfied", message: "Good value. Matches the photos, would be perfect with more color options." },
  { rating: 3, title: "Okay lang", message: "It's fine for the price. Packaging could be better." },
];

function listingPhotoUrls(product) {
  return [
    ...new Set(
      [
        product.imageUrl,
        ...(Array.isArray(product.imageUrls) ? product.imageUrls : []),
        ...(Array.isArray(product.variants) ? product.variants.map((variant) => variant?.imageUrl) : []),
      ]
        .map((url) => String(url ?? "").trim())
        .filter(Boolean),
    ),
  ];
}

const SAMPLE_REVIEW_VIDEOS = [
  "https://flutter.github.io/assets-for-api-docs/assets/videos/butterfly.mp4",
  "https://flutter.github.io/assets-for-api-docs/assets/videos/bee.mp4",
  "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4",
  "https://test-videos.co.uk/vids/jellyfish/mp4/h264/360/Jellyfish_360_10s_1MB.mp4",
  "https://test-videos.co.uk/vids/sintel/mp4/h264/360/Sintel_360_10s_1MB.mp4",
];

function mockLikeCount(seed, index, offset) {
  return 3 + (hashString(`${seed}-${index}-${offset}`) % 240);
}

// Buyer photos reuse the listing's own photos (1–3 per review); every other
// review also gets a sample video.
function buildReviewMedia(photos, seed, index, createdAtEpochMs) {
  const media = [];
  if ((seed + index) % 2 === 0) {
    media.push({
      id: "video-1",
      type: "video",
      url: SAMPLE_REVIEW_VIDEOS[(seed + index) % SAMPLE_REVIEW_VIDEOS.length],
      contentType: "video/mp4",
    });
  }
  if (photos.length) {
    const count = Math.min(photos.length, 1 + ((seed + index) % 3));
    const start = (seed + index * 5) % photos.length;
    for (let offset = 0; offset < count; offset += 1) {
      media.push({
        id: `image-${offset + 1}`,
        type: "image",
        url: photos[(start + offset) % photos.length],
      });
    }
  }
  return media.map((item, offset) => ({
    ...item,
    likeCount: mockLikeCount(seed, index, offset),
    uploadedAtEpochMs: createdAtEpochMs,
  }));
}

function refreshSeedReviewMedia(product, seed) {
  const photos = listingPhotoUrls(product);
  let changed = false;
  const reviews = product.seedReviewComments.map((review, index) => {
    if (!review?.seeded) return review;
    const media = buildReviewMedia(
      photos,
      seed,
      index,
      Number(review.createdAtEpochMs) || Date.now(),
    );
    if (JSON.stringify(media) === JSON.stringify(review.media ?? [])) return review;
    changed = true;
    return { ...review, media };
  });
  return changed ? reviews : null;
}

function buildSeedReviews(product, seed) {
  const count = 3 + (seed % 3);
  const now = Date.now();
  const photos = listingPhotoUrls(product);
  return Array.from({ length: count }, (_, index) => {
    const template = pick(REVIEW_TEMPLATES, seed, index);
    const createdAtEpochMs = now - ((seed + index * 13) % 60 + 1) * DAY_MS;
    const review = {
      id: `seed-review-${product.id}-${index + 1}`,
      reviewer: pick(REVIEWERS, seed, index),
      title: template.title,
      message: template.message,
      rating: template.rating,
      media: buildReviewMedia(photos, seed, index, createdAtEpochMs),
      createdAtEpochMs,
      createdAt: new Date(createdAtEpochMs).toISOString(),
      seeded: true,
    };
    if (index === 0) {
      review.sellerReply = {
        message: "Thank you for your order! We hope to serve you again soon.",
        author: String(product.companyName ?? "").trim() || "Seller",
        createdAtEpochMs: createdAtEpochMs + DAY_MS / 2,
      };
    }
    return review;
  });
}

function seedProduct(product, helpers) {
  const settings = helpers.resolveSettings(product.category);
  const seed = hashString(product.id);
  const next = { ...product };
  const added = [];

  if ((Array.isArray(product.specifications) ? product.specifications.length : 0) < settings.minRequired) {
    next.specifications = buildProductSpecifications(product, settings, seed, helpers.normalize);
    added.push("specifications");
  }

  if (!Array.isArray(product.variants) || product.variants.length === 0) {
    next.variants = buildVariants(product, settings);
    added.push("variants");
  } else {
    const variants = ensureVariantSpecifications(product, settings, helpers.normalize);
    if (variants) {
      next.variants = variants;
      added.push("variant specifications");
    }
  }

  if (String(product.description ?? "").trim().length < MIN_DESCRIPTION_LENGTH) {
    next.seedOriginalDescription = String(product.description ?? "");
    next.description = buildDescription(product);
    added.push("about this product");
  }

  if (!Array.isArray(product.seedReviewComments) || product.seedReviewComments.length === 0) {
    next.seedReviewComments = buildSeedReviews(next, seed);
    added.push("reviews");
  } else {
    const reviews = refreshSeedReviewMedia(next, seed);
    if (reviews) {
      next.seedReviewComments = reviews;
      added.push("review media");
    }
  }

  return added.length ? { product: next, added } : null;
}

function unseedProduct(product) {
  const next = { ...product };
  let changed = false;

  if (Array.isArray(product.seedReviewComments)) {
    delete next.seedReviewComments;
    changed = true;
  }
  if (Array.isArray(product.variants) && product.variants.some((variant) => variant?.seedGenerated)) {
    next.variants = product.variants.filter((variant) => !variant?.seedGenerated);
    changed = true;
  }
  if (typeof product.seedOriginalDescription === "string") {
    next.description = product.seedOriginalDescription;
    delete next.seedOriginalDescription;
    changed = true;
  }
  return changed ? next : null;
}

async function syncInBatches(products, syncProductsToPostgres) {
  for (let index = 0; index < products.length; index += SYNC_BATCH_SIZE) {
    await syncProductsToPostgres(products.slice(index, index + SYNC_BATCH_SIZE), {
      deleteMissing: false,
    });
  }
}

async function main() {
  loadEnvFile(path.join(__dirname, "..", ".env"));
  loadEnvFile(path.join(__dirname, "..", "..", ".env"));

  const dryRun = process.argv.includes("--dry-run");
  const remove = process.argv.includes("--remove");
  const reviewMediaOnly =
    process.argv.includes("--review-media") || process.argv.includes("--review-photos");

  const { closePool } = require("../db/pool");
  const {
    listProductsFromPostgres,
    syncProductsToPostgres,
  } = require("../services/postgresProductsStore");
  const {
    configureProductSpecificationStorage,
    resolveCategorySpecificationSettings,
    normalizeProductSpecifications,
  } = require("../config/productSpecifications");
  configureProductSpecificationStorage(
    path.join(__dirname, "..", "data", "product_specifications.json"),
  );

  const products = await listProductsFromPostgres({});
  console.log(`Listings found: ${products.length}`);

  if (remove) {
    const reverted = products.map(unseedProduct).filter(Boolean);
    if (!dryRun) {
      await syncInBatches(reverted, syncProductsToPostgres);
    }
    console.log(
      `${dryRun ? "[dry run] Would revert" : "Reverted"} mock reviews, generated variants, ` +
        `and replaced descriptions on ${reverted.length} listing(s). Specifications are kept.`,
    );
    await closePool();
    return;
  }

  const helpers = {
    resolveSettings: resolveCategorySpecificationSettings,
    normalize: normalizeProductSpecifications,
  };
  const results = products
    .map((product) => {
      if (!reviewMediaOnly) {
        return { source: product, result: seedProduct(product, helpers) };
      }
      const reviews = Array.isArray(product.seedReviewComments)
        ? refreshSeedReviewMedia(product, hashString(product.id))
        : null;
      return {
        source: product,
        result: reviews
          ? { product: { ...product, seedReviewComments: reviews }, added: ["review media"] }
          : null,
      };
    })
    .filter((entry) => entry.result);

  const totals = {};
  for (const { source, result } of results) {
    for (const item of result.added) {
      totals[item] = (totals[item] || 0) + 1;
    }
    console.log(`  ${source.name} (${source.id}): + ${result.added.join(", ")}`);
  }

  if (!dryRun && results.length) {
    await syncInBatches(
      results.map((entry) => entry.result.product),
      syncProductsToPostgres,
    );
  }

  console.log(
    `${dryRun ? "[dry run] Would update" : "Updated"} ${results.length} of ${products.length} listing(s).`,
  );
  for (const [item, count] of Object.entries(totals)) {
    console.log(`  ${item}: ${count}`);
  }
  if (!dryRun) {
    console.log("Undo with: node backend/scripts/seed-product-listing-details.js --remove");
  }
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
