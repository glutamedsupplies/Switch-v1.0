"use strict";

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
        value.length >= 2
        && ((value.startsWith('"') && value.endsWith('"'))
          || (value.startsWith("'") && value.endsWith("'")))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  } catch (error) {
    console.error(`Unable to load env file: ${filePath}`, error);
  }
}

const TARGET_EMAIL = "shawnkyle143@gmail.com";
const ORDER_COUNT = 16;
const CHAT_COUNT = 10;
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

async function main() {
  loadEnvFile(path.join(__dirname, "..", ".env"));
  loadEnvFile(path.join(__dirname, "..", "..", ".env"));

  const { query, closePool } = require("../db/pool");
  const { syncProductsToPostgres } = require("../services/postgresProductsStore");
  const { syncOrdersToPostgres } = require("../services/postgresOrdersStore");
  const { syncChatThreadsToPostgres } = require("../services/postgresChatStore");
  const { evaluateSellerPerformanceBadge } = require("../services/sellerPerformanceBadge");

  const accountResult = await query(
    `
      SELECT a.id, a.email, s.admin_id, s.store_name, s.first_name, s.last_name
      FROM accounts a
      LEFT JOIN seller_profiles s ON s.account_id = a.id
      WHERE lower(a.email) = lower($1)
      LIMIT 1
    `,
    [TARGET_EMAIL],
  );
  const account = accountResult.rows[0];
  if (!account) {
    throw new Error(`No account found for ${TARGET_EMAIL}.`);
  }

  const companyResult = await query(
    `
      SELECT c.id, c.name, c.status::text AS status, c.business_type
      FROM companies c
      LEFT JOIN company_memberships m ON m.company_id = c.id
      WHERE c.source_account_id = $1 OR m.account_id = $1
      GROUP BY c.id
      ORDER BY CASE WHEN c.status = 'active' THEN 0 WHEN c.status = 'pending_review' THEN 1 ELSE 2 END, c.updated_at DESC
    `,
    [account.id],
  );
  const company = companyResult.rows[0];
  if (!company) {
    throw new Error(`${TARGET_EMAIL} has no seller company yet.`);
  }

  const adminId = String(account.admin_id || account.id).trim();
  const companyId = String(company.id).trim();
  const companyName = String(company.name || account.store_name || "Shawn Kyle Shop").trim();

  const productResult = await query(
    `
      SELECT id, name, approval_status, is_active, image_url, original_price, sales_price, category
      FROM products
      WHERE admin_id = $1 OR company_id = $2
      ORDER BY
        CASE WHEN approval_status = 'approved' THEN 0 ELSE 1 END,
        updated_at DESC
      LIMIT 8
    `,
    [adminId, companyId],
  );

  let product = productResult.rows[0] || null;
  if (!product) {
    const now = new Date();
    const mockProduct = {
      id: `mock-badge-product-${companyId.slice(0, 12)}`,
      adminId,
      companyId,
      name: `${companyName} Performance Demo`,
      description: "Mock listing used to preview the performance badge.",
      approvalStatus: "approved",
      isActive: true,
      originalPrice: 499,
      salesPrice: 399,
      stock: 80,
      sold: ORDER_COUNT,
      category: company.business_type || "Retail",
      categories: [company.business_type || "Retail"],
      rating: 4.9,
      commentCount: REVIEW_COMMENTS.length,
      imageUrl: "",
      submittedAt: now.toISOString(),
      approvedAt: now.toISOString(),
      approvedBy: "super-admin",
      listedAt: now.toISOString(),
    };
    await syncProductsToPostgres([mockProduct], {
      deleteMissing: false,
      adminId,
      companyId,
    });
    product = {
      id: mockProduct.id,
      name: mockProduct.name,
      approval_status: "approved",
      original_price: mockProduct.originalPrice,
      sales_price: mockProduct.salesPrice,
    };
  }

  const nowMs = Date.now();
  const orders = Array.from({ length: ORDER_COUNT }, (_, index) => {
    const createdAt = nowMs - ((ORDER_COUNT - index) * 36 * 60 * 60 * 1000);
    const receivedAt = createdAt + (2 * 24 * 60 * 60 * 1000);
    const rating = index % 5 === 0 ? 4.8 : 5;
    const comment = REVIEW_COMMENTS[index] || REVIEW_COMMENTS[index % REVIEW_COMMENTS.length];
    return {
      id: `mock-badge-order-${companyId.slice(0, 10)}-${String(index + 1).padStart(2, "0")}`,
      orderGroupId: `mock-badge-og-${companyId.slice(0, 10)}-${String(index + 1).padStart(2, "0")}`,
      adminId,
      accountId: `mock-badge-buyer-${String(index + 1).padStart(2, "0")}`,
      productId: product.id,
      productName: product.name,
      companyId,
      companyName,
      quantity: 1,
      unitPrice: Number(product.sales_price || product.original_price || 399),
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
      paymentReference: `MOCK-BADGE-${index + 1}`,
      productRating: rating,
      productReviewRating: rating,
      productReviewComment: comment,
      productRatedAtEpochMs: receivedAt + 90 * 60 * 1000,
      buyerName: `Mock Buyer ${index + 1}`,
    };
  });

  await syncOrdersToPostgres(orders, {
    deleteMissing: false,
    adminId,
    mode: "stable",
  });

  const threads = Array.from({ length: CHAT_COUNT }, (_, index) => {
    const createdAt = new Date(nowMs - ((CHAT_COUNT - index) * 18 * 60 * 60 * 1000));
    const buyerAt = new Date(createdAt.getTime() + 2 * 60 * 1000);
    const sellerAt = new Date(createdAt.getTime() + 25 * 60 * 1000);
    const threadId = `mock-badge-chat-${companyId.slice(0, 10)}-${String(index + 1).padStart(2, "0")}`;
    return {
      threadId,
      adminId,
      customerId: `mock-badge-buyer-${String(index + 1).padStart(2, "0")}`,
      userId: `mock-badge-buyer-${String(index + 1).padStart(2, "0")}`,
      customerLabel: `Mock Buyer ${index + 1}`,
      productId: product.id,
      productName: product.name,
      companyName,
      createdAt: createdAt.toISOString(),
      updatedAt: sellerAt.toISOString(),
      messages: [
        {
          id: `${threadId}-m1`,
          text: "Hi, I have a question about my order.",
          isFromSupport: false,
          senderName: `Mock Buyer ${index + 1}`,
          senderRole: "buyer",
          senderId: `mock-badge-buyer-${String(index + 1).padStart(2, "0")}`,
          createdAt: buyerAt.toISOString(),
        },
        {
          id: `${threadId}-m2`,
          text: "Thanks for messaging. We can fix this now — please send the details.",
          isFromSupport: true,
          senderName: companyName,
          senderRole: "seller",
          senderId: adminId,
          createdAt: sellerAt.toISOString(),
        },
      ],
    };
  });

  await syncChatThreadsToPostgres(threads, {
    deleteMissing: false,
    adminId,
  });

  await query(
    `
      UPDATE products
      SET rating = 4.9, comment_count = $3, sold = GREATEST(sold, $4), updated_at = NOW()
      WHERE id = $1 AND admin_id = $2
    `,
    [product.id, adminId, REVIEW_COMMENTS.length, ORDER_COUNT],
  );

  const badge = evaluateSellerPerformanceBadge({
    rating: 4.9,
    reviews: REVIEW_COMMENTS.length,
    completedOrders: ORDER_COUNT,
    chats: CHAT_COUNT,
    timedReplies: CHAT_COUNT,
    avgFirstResponseHours: 23 / 60,
  });

  console.log(JSON.stringify({
    email: account.email,
    accountId: account.id,
    adminId,
    companyId,
    companyName,
    companyStatus: company.status,
    productId: product.id,
    productName: product.name,
    seeded: {
      orders: ORDER_COUNT,
      reviews: REVIEW_COMMENTS.length,
      chats: CHAT_COUNT,
      rating: 4.9,
    },
    badge,
  }, null, 2));

  await closePool();
}

main().catch(async (error) => {
  console.error(error);
  try {
    const { closePool } = require("../db/pool");
    await closePool();
  } catch (_) {}
  process.exit(1);
});
