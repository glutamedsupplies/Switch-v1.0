"use strict";

/**
 * Seed mock sellers + products + orders + chats so Super Admin
 * Business Type ranking shows:
 * - companies that already finished the 3-month evaluation (podium + list)
 * - companies still inside the evaluation window (In evaluation board)
 *
 * Targets:
 * - Hotels & Restaurant
 * - Restaurants
 *
 * Usage: node backend/scripts/seed-store-type-ranking-mock.js
 */

const fs = require("fs");
const path = require("path");

function loadEnvFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return;
    for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const i = trimmed.indexOf("=");
      if (i <= 0) continue;
      const key = trimmed.slice(0, i).trim();
      if (!key || process.env[key] != null) continue;
      let value = trimmed.slice(i + 1).trim();
      if (
        value.length >= 2
        && ((value.startsWith('"') && value.endsWith('"'))
          || (value.startsWith("'") && value.endsWith("'")))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  } catch (_) {
    // ignore
  }
}

const SAMPLE_PREFIX = "rank-mock-";
const DAY_MS = 24 * 60 * 60 * 1000;
const REVIEW_COMMENTS = [
  "Fast reply and the item is exactly as pictured.",
  "Resolved my concern in a few hours. Highly recommend.",
  "Great shop performance. Packaging was clean and complete.",
  "Seller answered immediately and followed up until delivered.",
  "Quality is excellent. Will order again.",
  "Very professional and polite in chat.",
  "Problem with the first size was fixed the same day.",
  "Accurate listing, honest seller, quick updates.",
  "Arrived earlier than expected. Thank you!",
  "Five stars for service and product quality.",
];

const TARGET_STORE_TYPES = [
  {
    name: "Hotels & Restaurant",
    categories: ["Rooms", "Dining", "Drinks", "Amenities"],
    ranked: [
      { name: "Aurora Grand Hotel", daysAgo: 220 },
      { name: "Bayview Suites", daysAgo: 205 },
      { name: "Coral Reef Inn", daysAgo: 188 },
      { name: "Diamond Plaza Hotel", daysAgo: 172 },
      { name: "Emerald Stay", daysAgo: 158 },
      { name: "Harbor Lights Hotel", daysAgo: 141 },
      { name: "Island Breeze Resort", daysAgo: 126 },
      { name: "Jade Garden Hotel", daysAgo: 114 },
      { name: "Lagoon Palace", daysAgo: 102 },
      { name: "Maple Court Hotel", daysAgo: 94 },
      { name: "Northwind Hotel", daysAgo: 160 },
      { name: "Oakridge Inn", daysAgo: 148 },
      { name: "Pearl Harbor Lodge", daysAgo: 136 },
      { name: "Quay Side Hotel", daysAgo: 121 },
      { name: "Redwood Stay", daysAgo: 108 },
    ],
    evaluating: [
      { name: "Nova Stay Inn", daysAgo: 18 },
      { name: "Palm Court Rooms", daysAgo: 34 },
      { name: "Quartz Hostel", daysAgo: 51 },
      { name: "Riverbend Suites", daysAgo: 67 },
      { name: "Sunset Loft Hotel", daysAgo: 81 },
    ],
  },
  {
    name: "Restaurants",
    categories: ["Meals", "Drinks", "Desserts", "Soup"],
    ranked: [
      { name: "Adobo House Kitchen", daysAgo: 218 },
      { name: "Bistro Luna", daysAgo: 201 },
      { name: "Crispy Crust Grill", daysAgo: 184 },
      { name: "Dragon Bowl Cafe", daysAgo: 169 },
      { name: "Firewood Pizza Co", daysAgo: 154 },
      { name: "Green Sprout Eatery", daysAgo: 139 },
      { name: "Honey Pot Kitchen", daysAgo: 123 },
      { name: "Iron Wok Express", daysAgo: 111 },
      { name: "Jasmine Table", daysAgo: 99 },
      { name: "Kettle & Spoon", daysAgo: 92 },
      { name: "Lantern Noodle Bar", daysAgo: 157 },
      { name: "Mint Garden Cafe", daysAgo: 145 },
      { name: "Night Market Grill", daysAgo: 133 },
      { name: "Orchid Rice House", daysAgo: 118 },
      { name: "Pandan Leaf Kitchen", daysAgo: 106 },
    ],
    evaluating: [
      { name: "Lime Leaf Kitchen", daysAgo: 14 },
      { name: "Mango Street Grill", daysAgo: 29 },
      { name: "Noodle House 88", daysAgo: 46 },
      { name: "Olive Branch Cafe", daysAgo: 63 },
      { name: "Peppercorn Kitchen", daysAgo: 78 },
    ],
  },
];

const ITEM_NAMES = {
  "Hotels & Restaurant": [
    "Deluxe Room Night",
    "Ocean View Suite",
    "Breakfast Buffet Pass",
    "Spa Day Package",
    "Airport Transfer",
    "Late Checkout Pass",
    "Pool Cabana Rental",
    "Weekend Staycation",
    "Executive Lounge Access",
    "Romantic Dinner Set",
    "Family Room Bundle",
    "City Tour Add-on",
  ],
  Restaurants: [
    "Signature Adobo Plate",
    "Crispy Pork Belly",
    "Garlic Butter Shrimp",
    "Truffle Pasta Bowl",
    "Mango Cheesecake",
    "Iced Calamansi Tea",
    "Seafood Sinigang",
    "Grilled Salmon Steak",
    "Chicken Inasal Set",
    "Halo-Halo Supreme",
    "Beef Short Ribs",
    "Vegetable Tempura",
  ],
};

function sampleId(storeType, index, kind) {
  const slug = String(storeType)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 18);
  return `${SAMPLE_PREFIX}${slug}-${kind}-${String(index + 1).padStart(2, "0")}`;
}

function avatarUrl(seed) {
  return `https://i.pravatar.cc/150?u=${encodeURIComponent(seed)}`;
}

function productImageUrl(index) {
  const ids = [292, 312, 365, 429, 488, 564, 628, 751, 823, 870, 996, 1080];
  return `https://picsum.photos/id/${ids[index % ids.length]}/640/640.jpg`;
}

function expandCompanies(target) {
  const ranked = (target.ranked || []).map((entry, index) => ({
    ...entry,
    evaluating: false,
    index,
  }));
  const evaluating = (target.evaluating || []).map((entry, index) => ({
    ...entry,
    evaluating: true,
    index: ranked.length + index,
  }));
  return [...ranked, ...evaluating];
}

async function ensureStoreTypesActive(query) {
  const targetNames = TARGET_STORE_TYPES.map((target) => target.name);

  // The public catalog reads store types from PostgreSQL; an inactive row hides every mock listing.
  const activated = await query(
    `
      UPDATE store_types
      SET status = 'active', updated_at = NOW()
      WHERE name = ANY($1::text[])
        AND status <> 'active'
      RETURNING name
    `,
    [targetNames],
  );
  if (activated.rows.length) {
    console.log(
      `Activated ${activated.rows.map((row) => row.name).join(" + ")} in PostgreSQL store_types`,
    );
  }

  const file = path.join(__dirname, "..", "data", "store_types.json");
  if (!fs.existsSync(file)) {
    return;
  }
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  const list = Array.isArray(raw) ? raw : [];
  let changed = false;
  for (const storeType of list) {
    if (targetNames.includes(storeType.name) && storeType.status !== "active") {
      storeType.status = "active";
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(file, `${JSON.stringify(list, null, 2)}\n`, "utf8");
    console.log("Activated Hotels & Restaurant + Restaurants in store_types.json");
  }
}

async function clearRankingMockRows(query) {
  await query(`DELETE FROM chat_messages WHERE id LIKE $1 OR thread_id LIKE $1`, [
    `${SAMPLE_PREFIX}%`,
  ]);
  await query(`DELETE FROM chat_threads WHERE id LIKE $1`, [`${SAMPLE_PREFIX}%`]);
  await query(
    `DELETE FROM order_items WHERE id LIKE $1 OR order_group_id LIKE $1`,
    [`${SAMPLE_PREFIX}%`],
  );
  await query(
    `DELETE FROM orders WHERE id LIKE $1 OR order_group_id LIKE $1`,
    [`${SAMPLE_PREFIX}%`],
  );
  await query(`DELETE FROM products WHERE id LIKE $1`, [`${SAMPLE_PREFIX}%`]);
  await query(
    `
      DELETE FROM company_memberships
      WHERE company_id LIKE $1
         OR account_id LIKE $1
         OR account_id IN (
           SELECT id FROM accounts WHERE email LIKE $2
         )
    `,
    [`${SAMPLE_PREFIX}%`, `${SAMPLE_PREFIX}%`],
  );
  await query(
    `
      DELETE FROM companies
      WHERE id LIKE $1
         OR source_account_id LIKE $1
         OR source_account_id IN (
           SELECT id FROM accounts WHERE email LIKE $2
         )
    `,
    [`${SAMPLE_PREFIX}%`, `${SAMPLE_PREFIX}%`],
  );
  await query(`DELETE FROM seller_profiles WHERE account_id LIKE $1 OR admin_id LIKE $1`, [
    `${SAMPLE_PREFIX}%`,
  ]);
  await query(
    `
      DELETE FROM seller_profiles
      WHERE account_id IN (SELECT id FROM accounts WHERE email LIKE $1)
    `,
    [`${SAMPLE_PREFIX}%`],
  );
  await query(`DELETE FROM accounts WHERE id LIKE $1 OR email LIKE $2`, [
    `${SAMPLE_PREFIX}%`,
    `${SAMPLE_PREFIX}%`,
  ]);
}

async function ensureCompanyForSeller(query, {
  accountId,
  companyId,
  companyName,
  storeType,
  createdAt,
}) {
  const existing = await query(
    `
      SELECT c.id
      FROM companies c
      LEFT JOIN company_memberships m ON m.company_id = c.id
      WHERE c.id = $1
         OR c.source_account_id = $2
         OR m.account_id = $2
      ORDER BY CASE WHEN c.id = $1 THEN 0 ELSE 1 END
      LIMIT 1
    `,
    [companyId, accountId],
  );
  if (existing.rows[0]?.id) {
    const resolvedId = String(existing.rows[0].id);
    await query(
      `
        UPDATE companies
        SET name = $2,
            public_name = $2,
            status = 'active',
            business_type = $3,
            created_at = $4::timestamptz,
            updated_at = NOW()
        WHERE id = $1
      `,
      [resolvedId, companyName, storeType, createdAt],
    );
    return resolvedId;
  }

  await query(
    `
      INSERT INTO companies (
        id, name, public_name, type, status, business_type,
        source_account_id, logo_url, created_at, updated_at
      ) VALUES (
        $1, $2, $2, 'seller', 'active', $3,
        $4, $5, $6::timestamptz, $6::timestamptz
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        public_name = EXCLUDED.public_name,
        status = 'active',
        business_type = EXCLUDED.business_type,
        created_at = EXCLUDED.created_at,
        updated_at = EXCLUDED.updated_at
    `,
    [companyId, companyName, storeType, accountId, avatarUrl(companyId), createdAt],
  );

  await query(
    `
      INSERT INTO company_memberships (
        id, company_id, account_id, membership_role, membership_status, is_primary, created_at, updated_at
      ) VALUES (
        $1, $2, $3, 'owner', 'active', TRUE, $4::timestamptz, $4::timestamptz
      )
      ON CONFLICT (id) DO UPDATE SET
        membership_role = EXCLUDED.membership_role,
        membership_status = 'active',
        is_primary = TRUE,
        updated_at = EXCLUDED.updated_at
    `,
    [`${companyId}-mem`, companyId, accountId, createdAt],
  );

  return companyId;
}

function buildCompanyOrders({
  adminId,
  companyId,
  companyName,
  product,
  orderCount,
  ratingBase,
  createdAtMs,
}) {
  const nowMs = Date.now();
  const startMs = Math.max(createdAtMs + DAY_MS, nowMs - (orderCount + 2) * 36 * 60 * 60 * 1000);
  return Array.from({ length: orderCount }, (_, index) => {
    const createdAt = startMs + index * 36 * 60 * 60 * 1000;
    const receivedAt = createdAt + 2 * DAY_MS;
    const rating = Number((ratingBase - (index % 4 === 0 ? 0.2 : 0)).toFixed(1));
    return {
      id: `${product.id}-ord-${String(index + 1).padStart(2, "0")}`,
      orderGroupId: `${product.id}-og-${String(index + 1).padStart(2, "0")}`,
      adminId,
      accountId: `${SAMPLE_PREFIX}buyer-${String((index % 12) + 1).padStart(2, "0")}`,
      productId: product.id,
      productName: product.name,
      companyId,
      companyName,
      quantity: 1,
      unitPrice: product.salesPrice,
      stage: "received",
      status: "received",
      createdAt: new Date(createdAt).toISOString(),
      createdAtEpochMs: createdAt,
      paidAt: new Date(createdAt + 20 * 60 * 1000).toISOString(),
      packedAt: new Date(createdAt + 6 * 60 * 60 * 1000).toISOString(),
      shippedAt: new Date(createdAt + 12 * 60 * 60 * 1000).toISOString(),
      receivedAt: new Date(receivedAt).toISOString(),
      customerReceivedAtEpochMs: receivedAt,
      paymentStatus: "paid",
      paymentProvider: "mock",
      paymentReference: `RANK-MOCK-${product.id}-${index + 1}`,
      productRating: rating,
      productReviewRating: rating,
      productReviewComment: REVIEW_COMMENTS[index % REVIEW_COMMENTS.length],
      productRatedAtEpochMs: receivedAt + 90 * 60 * 1000,
      buyerName: `Mock Buyer ${index + 1}`,
    };
  });
}

function buildCompanyChats({
  adminId,
  companyName,
  product,
  chatCount,
  replyMinutes,
  createdAtMs,
}) {
  const nowMs = Date.now();
  const startMs = Math.max(createdAtMs + DAY_MS, nowMs - (chatCount + 1) * 18 * 60 * 60 * 1000);
  return Array.from({ length: chatCount }, (_, index) => {
    const createdAt = startMs + index * 18 * 60 * 60 * 1000;
    const buyerAt = createdAt + 2 * 60 * 1000;
    const sellerAt = buyerAt + replyMinutes * 60 * 1000;
    const threadId = `${product.id}-chat-${String(index + 1).padStart(2, "0")}`;
    const buyerId = `${SAMPLE_PREFIX}buyer-${String((index % 12) + 1).padStart(2, "0")}`;
    return {
      threadId,
      adminId,
      customerId: buyerId,
      userId: buyerId,
      customerLabel: `Mock Buyer ${index + 1}`,
      productId: product.id,
      productName: product.name,
      companyName,
      createdAt: new Date(createdAt).toISOString(),
      updatedAt: new Date(sellerAt).toISOString(),
      messages: [
        {
          id: `${threadId}-m1`,
          text: "Hi, I have a question about my order.",
          isFromSupport: false,
          senderName: `Mock Buyer ${index + 1}`,
          senderRole: "buyer",
          senderId: buyerId,
          createdAt: new Date(buyerAt).toISOString(),
        },
        {
          id: `${threadId}-m2`,
          text: "Thanks for messaging. We can help with that now.",
          isFromSupport: true,
          senderName: companyName,
          senderRole: "seller",
          senderId: adminId,
          createdAt: new Date(sellerAt).toISOString(),
        },
      ],
    };
  });
}

async function main() {
  loadEnvFile(path.join(__dirname, "..", ".env"));
  loadEnvFile(path.join(__dirname, "..", "..", ".env"));

  const { query, closePool } = require("../db/pool");
  const { upsertSellerFromLegacyRecord } = require("../services/postgresSellerAccounts");
  const { syncProductsToPostgres } = require("../services/postgresProductsStore");
  const { syncOrdersToPostgres } = require("../services/postgresOrdersStore");
  const { syncChatThreadsToPostgres } = require("../services/postgresChatStore");

  await ensureStoreTypesActive(query);
  await clearRankingMockRows(query);

  const allProducts = [];
  const allOrders = [];
  const allChats = [];
  let rankedCount = 0;
  let evaluatingCount = 0;
  let typeOffset = 0;

  for (const target of TARGET_STORE_TYPES) {
    const itemPool = ITEM_NAMES[target.name] || ITEM_NAMES.Restaurants;
    const typeTag = target.name === "Restaurants" ? "R" : "H";
    const companies = expandCompanies(target);

    for (const company of companies) {
      const { name: companyName, index, evaluating, daysAgo } = company;
      const accountId = sampleId(target.name, index, "acct");
      const adminId = accountId;
      const companyId = sampleId(target.name, index, "co");
      const phaseTag = evaluating ? "e" : "r";
      const email = `${SAMPLE_PREFIX}${typeTag.toLowerCase()}${phaseTag}${String(index + 1).padStart(2, "0")}@${
        target.name === "Restaurants" ? "resto" : "hotel"
      }.local`;
      const accountCode = `RM${typeTag}${evaluating ? "E" : "R"}${String(index + 1).padStart(3, "0")}`;
      const mobileNumber = String(9000000000 + typeOffset + index);
      const createdAt = new Date(Date.now() - daysAgo * DAY_MS).toISOString();
      const createdAtMs = Date.parse(createdAt);
      const rankIndex = evaluating ? index - (target.ranked || []).length : index;
      const orderCount = evaluating
        ? Math.max(4, 8 - rankIndex)
        : Math.max(12, 28 - index * 2);
      const chatCount = evaluating
        ? Math.max(3, 7 - rankIndex)
        : Math.max(6, 16 - index);
      const ratingBase = evaluating
        ? Number((4.3 + ((4 - rankIndex) * 0.08)).toFixed(1))
        : Number((4.95 - index * 0.06).toFixed(1));
      const replyMinutes = evaluating
        ? 40 + rankIndex * 18
        : 12 + index * 7;

      const seller = await upsertSellerFromLegacyRecord({
        id: accountId,
        adminId,
        accountCode,
        role: "admin",
        email,
        password: "RankMock123!",
        status: "active",
        countryCode: "+63",
        mobileNumber,
        storeName: companyName,
        companyName,
        storeType: target.name,
        storeTypeName: target.name,
        businessType: target.name,
        planName: "Free Plan",
        planStatus: "active",
        firstName: companyName.split(" ")[0],
        lastName: "Mock",
        profileImageUrl: avatarUrl(email),
        companyPictureUrl: avatarUrl(companyId),
        emailVerified: true,
        createdAt,
        updatedAt: new Date().toISOString(),
      });

      const resolvedAccountId = String(seller?.id || accountId).trim();
      const resolvedAdminId = String(seller?.adminId || adminId).trim() || resolvedAccountId;
      if (resolvedAccountId !== accountId) {
        throw new Error(
          `Seller upsert remapped id for ${email}: expected ${accountId}, got ${resolvedAccountId}`,
        );
      }
      const accountCheck = await query(`SELECT id FROM accounts WHERE id = $1 LIMIT 1`, [resolvedAccountId]);
      if (!accountCheck.rows[0]) {
        throw new Error(`Seller upsert failed for ${email} (${resolvedAccountId})`);
      }

      await query(
        `UPDATE accounts SET created_at = $2::timestamptz, updated_at = NOW() WHERE id = $1`,
        [resolvedAccountId, createdAt],
      );
      await query(
        `UPDATE seller_profiles SET created_at = $2::timestamptz, updated_at = NOW() WHERE account_id = $1`,
        [resolvedAccountId, createdAt],
      );

      const resolvedCompanyId = await ensureCompanyForSeller(query, {
        accountId: resolvedAccountId,
        companyId,
        companyName,
        storeType: target.name,
        createdAt,
      });
      if (resolvedCompanyId !== companyId) {
        throw new Error(
          `Company remap for ${email}: expected ${companyId}, got ${resolvedCompanyId}`,
        );
      }

      if (evaluating) {
        evaluatingCount += 1;
      } else {
        rankedCount += 1;
      }
      const daysLeft = Math.max(0, 90 - daysAgo);
      console.log(
        `  ✓ ${target.name} ${evaluating ? "eval" : "rank"} #${index + 1}: ${companyName}`
        + ` (${daysAgo}d old${evaluating ? `, ${daysLeft}d left` : ", eligible"})`,
      );

      const companyProducts = [];
      for (let productIndex = 0; productIndex < 2; productIndex += 1) {
        const globalItemIndex = index * 2 + productIndex;
        const name = itemPool[globalItemIndex % itemPool.length];
        const sold = Math.max(3, orderCount + (evaluating ? 2 : 18) - productIndex * 3);
        const rating = Number((ratingBase - productIndex * 0.1).toFixed(1));
        const category = target.categories[productIndex % target.categories.length];
        const nowIso = new Date().toISOString();
        const product = {
          id: sampleId(target.name, globalItemIndex, "item"),
          adminId: resolvedAdminId,
          companyId: resolvedCompanyId,
          name: `${name} ${index + 1}`,
          description: `Mock ranking item for ${companyName}.`,
          approvalStatus: "approved",
          isActive: true,
          originalPrice: 350 + globalItemIndex * 25,
          salesPrice: 299 + globalItemIndex * 20,
          stock: 40 + globalItemIndex,
          sold,
          category,
          categories: [category],
          rating,
          ratingCount: Math.max(4, orderCount - productIndex),
          commentCount: Math.max(3, orderCount - 2 - productIndex),
          imageUrl: productImageUrl(globalItemIndex),
          submittedAt: createdAt,
          approvedAt: createdAt,
          approvedBy: "super-admin",
          listedAt: createdAt,
          createdAt,
          updatedAt: nowIso,
        };
        companyProducts.push(product);
        allProducts.push(product);
      }

      const primaryProduct = companyProducts[0];
      allOrders.push(
        ...buildCompanyOrders({
          adminId: resolvedAdminId,
          companyId: resolvedCompanyId,
          companyName,
          product: primaryProduct,
          orderCount,
          ratingBase,
          createdAtMs,
        }),
      );
      allChats.push(
        ...buildCompanyChats({
          adminId: resolvedAdminId,
          companyName,
          product: primaryProduct,
          chatCount,
          replyMinutes,
          createdAtMs,
        }),
      );
    }
    typeOffset += companies.length;
  }

  await syncProductsToPostgres(allProducts, { deleteMissing: false });
  await syncOrdersToPostgres(allOrders, { deleteMissing: false, mode: "stable" });
  await syncChatThreadsToPostgres(allChats, { deleteMissing: false });

  console.log(`Seeded ${rankedCount} ranked companies (past 3-month evaluation).`);
  console.log(`Seeded ${evaluatingCount} companies still in evaluation.`);
  console.log(`Seeded ${allProducts.length} products, ${allOrders.length} orders, ${allChats.length} chats.`);
  console.log("Open Super Admin → Companies to see each finished company's rank on the card.");
  console.log("Business Types ranking modal still shows the top 10 only.");

  await closePool();
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : error);
  try {
    await require("../db/pool").closePool();
  } catch (_) {
    // ignore
  }
  process.exit(1);
});
