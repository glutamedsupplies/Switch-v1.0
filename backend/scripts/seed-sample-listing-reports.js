"use strict";

const fs = require("fs");
const fsPromises = require("fs/promises");
const path = require("path");

function loadEnvFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return;
    }
    for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }
      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex <= 0) {
        continue;
      }
      const key = trimmed.slice(0, separatorIndex).trim();
      if (!key || process.env[key] != null) {
        continue;
      }
      let value = trimmed.slice(separatorIndex + 1).trim();
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

const SAMPLE_PREFIX = "lr_sample_";
const NOTIF_PREFIX = "sa-notif-listing-sample-";

function sampleEvidenceUrls(...ids) {
  return ids.map((id) => `https://picsum.photos/id/${id}/960/720.jpg`);
}

const SAMPLE_CASES = [
  {
    reasonCategory: "misleading_listing",
    reasonText:
      "The listing photos are studio shots of a different model. The description hides the actual size and material that arrived.",
    evidenceUrls: sampleEvidenceUrls(1080, 1084),
  },
  {
    reasonCategory: "counterfeit",
    reasonText:
      "The product is sold as an official branded charger but the marks and packaging are replica. This is about the listing, not the store chat.",
    evidenceUrls: sampleEvidenceUrls(237, 238),
  },
  {
    reasonCategory: "prohibited_item",
    reasonText:
      "The listing appears to sell a restricted item that should not be on the marketplace. Photos and title make the prohibited use obvious.",
    evidenceUrls: sampleEvidenceUrls(239, 240),
  },
  {
    reasonCategory: "unsafe_product",
    reasonText:
      "The product page claims this is a children's toy but the description shows small detachable parts and no safety warning.",
    evidenceUrls: sampleEvidenceUrls(241, 242),
  },
];

function hoursAgo(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function buyerName(row, index) {
  const name = [row?.first_name, row?.last_name].filter(Boolean).join(" ").trim();
  if (name) {
    return name;
  }
  const email = String(row?.email || "").trim();
  if (email.includes("@")) {
    return email.split("@")[0];
  }
  return `Sample buyer ${index + 1}`;
}

function fallbackBuyers() {
  return [
    { id: "sample-buyer-ana", email: "ana.reyes@example.com", first_name: "Ana", last_name: "Reyes" },
    { id: "sample-buyer-luis", email: "luis.santos@example.com", first_name: "Luis", last_name: "Santos" },
    { id: "sample-buyer-mira", email: "mira.cruz@example.com", first_name: "Mira", last_name: "Cruz" },
    { id: "sample-buyer-ben", email: "ben.garcia@example.com", first_name: "Ben", last_name: "Garcia" },
  ];
}

function sampleReportId(index, createdAt) {
  const date = new Date(createdAt);
  const stamp = Number.isFinite(date.getTime())
    ? `${String(date.getUTCFullYear()).slice(-2)}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}`
    : "000000";
  const suffixes = ["K3P8", "M2Q7", "N4R1", "P6S9"];
  return `LST-${stamp}-${suffixes[index] || "Q8T2"}`;
}

function buildReport({ id, product, company, buyer, sample, createdAt, reportId }) {
  const reporterUserId = String(buyer.account_code || buyer.accountCode || "").trim();
  const reporterAvatarUrl = String(
    buyer.profile_image_url
    || buyer.profileImageUrl
    || "",
  ).trim();
  return {
    id,
    reportId: reportId || sampleReportId(0, createdAt),
    scope: "listing",
    productId: product.id,
    productName: product.name,
    productImageUrl: product.imageUrl || "",
    companyId: company.company_id,
    adminId: company.admin_id || company.account_id,
    companyName: company.company_name,
    companyPictureUrl: String(company.logo_url || "").trim(),
    reporterAccountId: buyer.id,
    reporterUserId: reporterUserId || buyer.id,
    reporterEmail: buyer.email || "",
    reporterName: buyerName(buyer, 0),
    reporterAvatarUrl,
    reasonCategory: sample.reasonCategory,
    reasonText: sample.reasonText,
    evidenceUrls: Array.isArray(sample.evidenceUrls) ? sample.evidenceUrls : [],
    orderId: "",
    status: "pending",
    reviewNote: "",
    reviewedBy: "",
    reviewedAt: "",
    source: "sample-listing-seed",
    createdAt,
    updatedAt: createdAt,
  };
}

function buildSaNotification(input) {
  return {
    id: input.id,
    type: input.type,
    category: "listings",
    priority: "high",
    audience: "super_admin",
    title: input.title,
    reason: input.reason,
    message: input.message,
    status: "unread",
    read: false,
    productId: input.productId || "",
    productName: input.productName || "",
    feedbackId: "",
    adminId: input.adminId,
    companyId: input.companyId,
    companyName: input.companyName,
    storeName: input.companyName,
    businessName: input.companyName,
    companyPictureUrl: input.companyPictureUrl || "",
    actorType: input.actorType || "user",
    userId: input.userId || "",
    username: input.username || "",
    userDisplayName: input.userDisplayName || "",
    profileImageUrl: "",
    createdBy: input.createdBy || "Buyer",
    targetUrl: input.targetUrl,
    createdAt: input.createdAt,
  };
}

async function readJsonArray(filePath) {
  try {
    const decoded = JSON.parse(await fsPromises.readFile(filePath, "utf8"));
    return Array.isArray(decoded) ? decoded : [];
  } catch (_) {
    return [];
  }
}

async function writeJsonArray(filePath, value) {
  await fsPromises.mkdir(path.dirname(filePath), { recursive: true });
  await fsPromises.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function pickProductImage(product) {
  const images = Array.isArray(product?.images) ? product.images : [];
  return String(
    product?.imageUrl
    || product?.image
    || images[0]?.url
    || images[0]?.imageUrl
    || images[0]
    || "",
  ).trim();
}

async function main() {
  loadEnvFile(path.join(__dirname, "..", ".env"));
  loadEnvFile(path.join(__dirname, "..", "..", ".env"));

  const { query, closePool } = require("../db/pool");
  const dataDir = path.join(__dirname, "..", "data");
  const reportsFile = path.join(dataDir, "listing_reports.json");
  const productsFile = path.join(dataDir, "products.json");
  const notificationsFile = path.join(dataDir, "super_admin_notifications.json");

  const isShowcaseProduct = (product) =>
    Boolean(pickProductImage(product) && String(product?.companyId || product?.company_id || "").trim());
  const storedProducts = (await readJsonArray(productsFile))
    .filter((product) => String(product?.id || "").trim() && String(product?.name || "").trim())
    .filter((product) => !product?.listingRestriction?.active)
    .sort((left, right) => Number(isShowcaseProduct(right)) - Number(isShowcaseProduct(left)))
    .slice(0, 12);

  const companyResult = await query(
    `
      SELECT
        a.id AS account_id,
        COALESCE(NULLIF(BTRIM(s.admin_id), ''), a.id) AS admin_id,
        c.id AS company_id,
        COALESCE(
          NULLIF(BTRIM(c.public_name), ''),
          NULLIF(BTRIM(c.name), ''),
          NULLIF(BTRIM(s.store_name), ''),
          a.email
        ) AS company_name,
        COALESCE(NULLIF(BTRIM(c.logo_url), ''), NULLIF(BTRIM(a.profile_image_url), '')) AS logo_url
      FROM companies c
      INNER JOIN company_memberships m
        ON m.company_id = c.id
       AND COALESCE(m.is_primary, TRUE) = TRUE
      INNER JOIN accounts a ON a.id = m.account_id
      LEFT JOIN seller_profiles s ON s.account_id = a.id
      WHERE COALESCE(c.type::text, 'seller') IN ('seller', 'store')
        AND COALESCE(c.status::text, '') NOT IN ('deleted', 'rejected')
      ORDER BY c.created_at DESC NULLS LAST
      LIMIT 8
    `,
  ).catch(() => ({ rows: [] }));

  const companies = companyResult.rows || [];
  const productCompanyIds = storedProducts
    .map((product) => String(product?.companyId || product?.company_id || "").trim())
    .filter((companyId) => companyId && !companies.some((company) => company.company_id === companyId));
  if (productCompanyIds.length) {
    const productCompanyResult = await query(
      `
        SELECT
          a.id AS account_id,
          COALESCE(NULLIF(BTRIM(s.admin_id), ''), a.id) AS admin_id,
          c.id AS company_id,
          COALESCE(
            NULLIF(BTRIM(c.public_name), ''),
            NULLIF(BTRIM(c.name), ''),
            NULLIF(BTRIM(s.store_name), ''),
            a.email
          ) AS company_name,
          COALESCE(NULLIF(BTRIM(c.logo_url), ''), NULLIF(BTRIM(a.profile_image_url), '')) AS logo_url
        FROM companies c
        LEFT JOIN company_memberships m
          ON m.company_id = c.id
         AND COALESCE(m.is_primary, TRUE) = TRUE
        LEFT JOIN accounts a ON a.id = m.account_id
        LEFT JOIN seller_profiles s ON s.account_id = a.id
        WHERE c.id = ANY($1::text[])
      `,
      [productCompanyIds],
    ).catch(() => ({ rows: [] }));
    companies.push(...(productCompanyResult.rows || []));
  }
  const warningProduct = storedProducts[0] || {
    id: "sample-listing-earbuds",
    name: "Wireless earbuds",
    imageUrl: "",
    adminId: companies[0]?.admin_id || "sample-admin",
    companyId: companies[0]?.company_id || "sample-company",
    companyName: companies[0]?.company_name || "Sample Store",
  };
  const reviewProduct = storedProducts[1] || {
    id: "sample-listing-charger",
    name: "Official brand charger",
    imageUrl: "",
    adminId: companies[1]?.admin_id || companies[0]?.admin_id || "sample-admin",
    companyId: companies[1]?.company_id || companies[0]?.company_id || "sample-company",
    companyName: companies[1]?.company_name || companies[0]?.company_name || "Sample Store",
  };

  function companyForProduct(product) {
    const adminId = String(product.adminId || "").trim();
    const companyId = String(product.companyId || product.company_id || "").trim();
    const match = companies.find((company) =>
      company.admin_id === adminId
      || company.account_id === adminId
      || company.company_id === companyId,
    );
    return match || {
      account_id: adminId || "sample-admin",
      admin_id: adminId || "sample-admin",
      company_id: companyId || "sample-company",
      company_name: product.companyName || "Sample Store",
      logo_url: "",
    };
  }

  const buyerResult = await query(
    `
      SELECT
        a.id,
        a.email,
        a.account_code,
        u.first_name,
        u.last_name,
        NULLIF(BTRIM(a.profile_image_url), '') AS profile_image_url
      FROM accounts a
      INNER JOIN user_profiles u ON u.account_id = a.id
      WHERE a.role IN ('user', 'admin')
        AND NULLIF(BTRIM(a.account_code), '') IS NOT NULL
      ORDER BY a.created_at DESC NULLS LAST
      LIMIT 16
    `,
  ).catch(() => ({ rows: [] }));

  const sellerIds = new Set(
    companies.flatMap((company) => [company.account_id, company.admin_id]).filter(Boolean),
  );
  const buyers = (buyerResult.rows || [])
    .filter((row) => !sellerIds.has(row.id) && String(row.account_code || "").trim())
    .filter((row, index, list) => list.findIndex((item) => item.id === row.id) === index)
    .slice(0, 6);

  if (buyers.length < 3) {
    throw new Error(
      `Need at least 3 existing buyer accounts with account_code for Submitted by. Found ${buyers.length}. Create buyer users first, then rerun this seed.`,
    );
  }

  const warningCompany = companyForProduct(warningProduct);
  const reviewCompany = companyForProduct(reviewProduct);
  const reports = [];
  const notifications = [];

  SAMPLE_CASES.slice(0, 3).forEach((sample, index) => {
    const buyer = buyers[index % buyers.length];
    const createdAt = hoursAgo(5 - index);
    const report = buildReport({
      id: `${SAMPLE_PREFIX}restrict_${index + 1}`,
      reportId: sampleReportId(index, createdAt),
      product: {
        id: warningProduct.id,
        name: warningProduct.name,
        imageUrl: pickProductImage(warningProduct),
      },
      company: warningCompany,
      buyer,
      sample,
      createdAt,
    });
    reports.push(report);
    notifications.push(buildSaNotification({
      id: `${NOTIF_PREFIX}report-${index + 1}`,
      type: "listing-buyer-report",
      title: "Buyer reported a listing",
      reason: sample.reasonCategory === "counterfeit"
        ? "Counterfeit or replica product"
        : sample.reasonCategory === "prohibited_item"
          ? "Prohibited or banned item"
          : "Misleading photos or description",
      message: `${buyerName(buyer, index)} reported ${warningProduct.name} (${report.reportId}). This case is about the product, not the seller company.`,
      adminId: report.adminId,
      companyId: report.companyId,
      companyName: report.companyName,
      companyPictureUrl: warningCompany.logo_url || "",
      productId: report.productId,
      productName: report.productName,
      userId: buyer.id,
      username: buyerName(buyer, index),
      userDisplayName: buyerName(buyer, index),
      createdBy: buyerName(buyer, index),
      createdAt,
      targetUrl: `/super_admin.html#product-requests?reports=1&productId=${encodeURIComponent(report.productId)}&reportId=${encodeURIComponent(report.reportId)}`,
    }));
  });

  notifications.push(buildSaNotification({
    id: `${NOTIF_PREFIX}needs-restriction`,
    type: "listing-needs-restriction",
    title: "This listing needs restriction review",
    reason: "3 buyers reported this listing",
    message: `${warningProduct.name} has enough distinct buyer reports to need a Super Admin listing restriction review. One report is not enough — review the product cases first.`,
    adminId: warningCompany.admin_id || warningCompany.account_id,
    companyId: warningCompany.company_id,
    companyName: warningCompany.company_name,
    companyPictureUrl: warningCompany.logo_url || "",
    productId: warningProduct.id,
    productName: warningProduct.name,
    actorType: "listing",
    createdBy: "system",
    createdAt: hoursAgo(1),
    targetUrl: `/super_admin.html#product-requests?reports=1&productId=${encodeURIComponent(warningProduct.id)}`,
  }));

  const buyer = buyers[Math.min(3, buyers.length - 1)];
  const sample = SAMPLE_CASES[3];
  const createdAt = hoursAgo(2);
  const reviewReport = buildReport({
    id: `${SAMPLE_PREFIX}review_1`,
    reportId: sampleReportId(3, createdAt),
    product: {
      id: reviewProduct.id,
      name: reviewProduct.name,
      imageUrl: pickProductImage(reviewProduct),
    },
    company: reviewCompany,
    buyer,
    sample,
    createdAt,
  });
  reports.push(reviewReport);
  notifications.push(buildSaNotification({
    id: `${NOTIF_PREFIX}report-review-1`,
    type: "listing-buyer-report",
    title: "Buyer reported a listing",
    reason: "Unsafe or hazardous product",
    message: `${buyerName(buyer, 3)} reported ${reviewProduct.name} (${reviewReport.reportId}). This case is about the product itself.`,
    adminId: reviewReport.adminId,
    companyId: reviewReport.companyId,
    companyName: reviewReport.companyName,
    companyPictureUrl: reviewCompany.logo_url || "",
    productId: reviewReport.productId,
    productName: reviewReport.productName,
    userId: buyer.id,
    username: buyerName(buyer, 3),
    userDisplayName: buyerName(buyer, 3),
    createdBy: buyerName(buyer, 3),
    createdAt,
    targetUrl: `/super_admin.html#product-requests?reports=1&productId=${encodeURIComponent(reviewReport.productId)}&reportId=${encodeURIComponent(reviewReport.reportId)}`,
  }));

  const existingReports = (await readJsonArray(reportsFile))
    .filter((report) => !String(report?.id || "").startsWith(SAMPLE_PREFIX));
  await writeJsonArray(reportsFile, [...reports, ...existingReports]);

  const existingNotifications = (await readJsonArray(notificationsFile))
    .filter((item) => !String(item?.id || "").startsWith(NOTIF_PREFIX));
  notifications.sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)));
  await writeJsonArray(notificationsFile, [...notifications, ...existingNotifications]);

  console.log(`Seeded ${reports.length} sample listing reports.`);
  console.log(`Needs restriction review: ${warningProduct.name}`);
  console.log(`Single review report: ${reviewProduct.name}`);
  console.log(`Super Admin notifications: ${notifications.length} unread listing-report items.`);

  await closePool().catch(() => {});
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : error);
  try {
    const { closePool } = require("../db/pool");
    await closePool();
  } catch (_) {
    // Pool may not have opened.
  }
  process.exit(1);
});
