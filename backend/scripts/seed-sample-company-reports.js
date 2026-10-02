"use strict";

/**
 * Mock / test company-report DB for Super Admin Report Center.
 * Reports are attached only to companies that already exist in Postgres.
 *
 *   npm run seed:company-reports
 *   node scripts/seed-sample-company-reports.js
 */

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

const SAMPLE_PREFIX = "cr_sample_";
const NOTIF_PREFIX = "sa-notif-sample-";

function sampleEvidenceUrls(...ids) {
  return ids.map((id) => `https://picsum.photos/id/${id}/960/720.jpg`);
}

const SAMPLE_CASES = [
  {
    reasonCategory: "scam",
    reasonText:
      "I paid in full and the seller kept asking for another payment before they would ship. Chat messages look like a classic advance-fee scam.",
    productName: "Wireless earbuds",
    evidenceUrls: sampleEvidenceUrls(1015, 1016),
  },
  {
    reasonCategory: "non_delivery",
    reasonText:
      "Order was marked paid three weeks ago. Tracking never moved and the seller stopped answering after I asked for a refund.",
    productName: "Phone case bundle",
    evidenceUrls: sampleEvidenceUrls(1025, 1035),
  },
  {
    reasonCategory: "impersonation",
    reasonText:
      "This store is using another brand's name, logo, and chat replies as if they are the official shop. Buyers are being told to pay outside Switch.",
    productName: "",
    evidenceUrls: sampleEvidenceUrls(1040, 1050),
  },
  {
    reasonCategory: "harassment",
    reasonText:
      "After I asked about a delayed parcel the seller sent threatening messages and insulted me in order chat. I attached the screenshots.",
    productName: "Canvas tote bag",
    evidenceUrls: sampleEvidenceUrls(1060, 1074),
  },
];

/** Extra rows so Super Admin Report Center list UI has enough items to scroll/review. */
const LIST_UI_CASES = [
  {
    reasonCategory: "off_platform",
    reasonText:
      "Seller kept pushing me to move the conversation to Facebook Messenger and pay via GCash outside Switch checkout.",
    productName: "USB-C hub",
    evidenceUrls: sampleEvidenceUrls(1080, 1084),
    status: "pending",
  },
  {
    reasonCategory: "scam",
    reasonText:
      "Store posted a flash deal, took payment, then said the item was out of stock and offered store credit only. Looks like bait pricing.",
    productName: "Smartwatch band",
    evidenceUrls: sampleEvidenceUrls(200, 201),
    status: "pending",
  },
  {
    reasonCategory: "non_delivery",
    reasonText:
      "Courier status stayed at warehouse for twelve days. Seller ignored two refund requests and closed the chat thread.",
    productName: "Desk lamp",
    evidenceUrls: sampleEvidenceUrls(292, 293),
    status: "reviewing",
  },
  {
    reasonCategory: "other",
    reasonText:
      "Seller changed the refund policy after payment and refused the return window that was shown on the listing page.",
    productName: "Running shorts",
    evidenceUrls: sampleEvidenceUrls(312),
    status: "pending",
  },
  {
    reasonCategory: "impersonation",
    reasonText:
      "Product packaging and chat responses copy a known brand store name almost exactly. Buyers are being misled about who owns the shop.",
    productName: "Brand sneakers",
    evidenceUrls: sampleEvidenceUrls(338, 349),
    status: "upheld",
  },
  {
    reasonCategory: "harassment",
    reasonText:
      "After I left a one-star review the seller messaged insults and threatened to post my address in their group chat.",
    productName: "Kitchen knife set",
    evidenceUrls: sampleEvidenceUrls(367, 370),
    status: "pending",
  },
  {
    reasonCategory: "scam",
    reasonText:
      "I was told to pay a customs fee to a personal account before release. Tracking number was fake when I checked the courier site.",
    productName: "Bluetooth speaker",
    evidenceUrls: sampleEvidenceUrls(433, 452),
    status: "reviewing",
  },
  {
    reasonCategory: "non_delivery",
    reasonText:
      "Order confirmed last month. Seller marked shipped with no tracking, then blocked my account-linked chat requests.",
    productName: "Laptop sleeve",
    evidenceUrls: sampleEvidenceUrls(480),
    status: "pending",
  },
  {
    reasonCategory: "off_platform",
    reasonText:
      "Checkout was cancelled by the seller so they could quote a lower price if I paid through a personal bank transfer instead.",
    productName: "Mechanical keyboard",
    evidenceUrls: sampleEvidenceUrls(532, 548),
    status: "dismissed",
  },
  {
    reasonCategory: "other",
    reasonText:
      "Store keeps canceling orders after payment clears, then relists the same item at a higher price the next day.",
    productName: "Ceramic mug set",
    evidenceUrls: sampleEvidenceUrls(564, 575),
    status: "pending",
  },
];

const LIST_UI_REPORT_SUFFIXES = [
  "F3H7", "G5J2", "H8K4", "J1L9", "K6M3",
  "L2N8", "M9P5", "N4Q7", "P7R1", "Q3S6",
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

const TEST_MODE_BUYERS = [
  {
    id: "tm-buyer-mira-cruz",
    accountCode: "USR-TM001",
    email: "mira.testmode@switch.local",
    firstName: "Mira",
    lastName: "Cruz",
    countryCode: "+63",
    mobileNumber: "9170001001",
    profileImageUrl: "https://i.pravatar.cc/150?u=mira.testmode@switch.local",
  },
  {
    id: "tm-buyer-ana-reyes",
    accountCode: "USR-TM002",
    email: "ana.testmode@switch.local",
    firstName: "Ana",
    lastName: "Reyes",
    countryCode: "+63",
    mobileNumber: "9170001002",
    profileImageUrl: "https://i.pravatar.cc/150?u=ana.testmode@switch.local",
  },
  {
    id: "tm-buyer-luis-santos",
    accountCode: "USR-TM003",
    email: "luis.testmode@switch.local",
    firstName: "Luis",
    lastName: "Santos",
    countryCode: "+63",
    mobileNumber: "9170001003",
    profileImageUrl: "https://i.pravatar.cc/150?u=luis.testmode@switch.local",
  },
];

// Account sync rejects non-Google accounts without a password, which blocks every accounts write.
const TEST_MODE_BUYER_PASSWORD = "TestMode123!";

async function upsertTestModeBuyer(query, buyer) {
  const { hashPassword } = require("../db/password");
  const passwordHash = await hashPassword(TEST_MODE_BUYER_PASSWORD);
  const profileData = {
    testMode: true,
    testModeMarkedAt: new Date().toISOString(),
    seedSource: "seed-sample-company-reports",
  };
  await query(
    `
      DELETE FROM user_profiles
      WHERE account_id IN (
        SELECT id FROM accounts
        WHERE (lower(email) = lower($1) OR account_code = $2)
          AND id <> $3
          AND role = 'user'
      )
    `,
    [buyer.email, buyer.accountCode, buyer.id],
  );
  await query(
    `
      DELETE FROM accounts
      WHERE (lower(email) = lower($1) OR account_code = $2)
        AND id <> $3
        AND role = 'user'
    `,
    [buyer.email, buyer.accountCode, buyer.id],
  );
  await query(
    `
      INSERT INTO accounts (
        id, account_code, role, email, password_hash,
        country_code, mobile_number, status, profile_image_url,
        email_verified, mobile_verified, created_at, updated_at
      ) VALUES (
        $1, $2, 'user', $3, $7,
        $4, $5, 'active', $6,
        TRUE, FALSE, NOW(), NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        account_code = EXCLUDED.account_code,
        email = EXCLUDED.email,
        password_hash = COALESCE(accounts.password_hash, EXCLUDED.password_hash),
        country_code = EXCLUDED.country_code,
        mobile_number = EXCLUDED.mobile_number,
        status = 'active'::account_status,
        profile_image_url = EXCLUDED.profile_image_url,
        email_verified = TRUE,
        updated_at = NOW()
    `,
    [
      buyer.id,
      buyer.accountCode,
      buyer.email,
      buyer.countryCode,
      buyer.mobileNumber,
      buyer.profileImageUrl,
      passwordHash,
    ],
  );
  await query(
    `
      INSERT INTO user_profiles (
        account_id, first_name, middle_name, last_name, suffix,
        address, date_of_birth, gender, username, gmail_binding,
        face_verified, verified_at, admin_id, profile_data, created_at, updated_at
      ) VALUES (
        $1, $2, '', $3, '',
        'Test Mode sandbox address', '', '', $4, NULL,
        FALSE, NOW(), 'admin', $5::jsonb, NOW(), NOW()
      )
      ON CONFLICT (account_id) DO UPDATE SET
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        username = EXCLUDED.username,
        profile_data = COALESCE(user_profiles.profile_data, '{}'::jsonb) || EXCLUDED.profile_data,
        updated_at = NOW()
    `,
    [
      buyer.id,
      buyer.firstName,
      buyer.lastName,
      buyer.email,
      JSON.stringify(profileData),
    ],
  );
  return {
    id: buyer.id,
    email: buyer.email,
    first_name: buyer.firstName,
    last_name: buyer.lastName,
    account_code: buyer.accountCode,
    profile_image_url: buyer.profileImageUrl,
  };
}

function sampleReportId(index, createdAt) {
  const date = new Date(createdAt);
  const stamp = Number.isFinite(date.getTime())
    ? `${String(date.getUTCFullYear()).slice(-2)}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}`
    : "000000";
  const suffixes = ["A7K3", "B2M9", "C4P8", "D6Q1", ...LIST_UI_REPORT_SUFFIXES];
  return `RPT-${stamp}-${suffixes[index] || "E8R2"}`;
}

function reasonLabelForCategory(category) {
  switch (category) {
    case "scam":
      return "Scam or fraud";
    case "non_delivery":
      return "Paid but not delivered";
    case "impersonation":
      return "Fake store or impersonation";
    case "harassment":
      return "Harassment or abuse";
    case "off_platform":
      return "Off-platform payment or chat";
    default:
      return "Other store policy issue";
  }
}

function buildReport({ id, company, buyer, sample, createdAt, reportId, status }) {
  const reporterAvatarUrl = String(
    buyer.profile_image_url
    || buyer.profileImageUrl
    || buyer.avatarUrl
    || "",
  ).trim();
  const reporterUserId = String(
    buyer.account_code
    || buyer.accountCode
    || "",
  ).trim();
  const resolvedStatus = String(status || sample.status || "pending").trim() || "pending";
  return {
    id,
    reportId: reportId || sampleReportId(0, createdAt),
    companyId: company.company_id,
    adminId: company.admin_id || company.account_id,
    companyName: company.company_name,
    companyPictureUrl: String(company.logo_url || "").trim(),
    reporterAccountId: buyer.id,
    reporterUserId: reporterUserId || buyer.id,
    reporterEmail: buyer.email || "",
    reporterName: buyerName(buyer, 0),
    reporterAvatarUrl,
    reporterProfileImageUrl: reporterAvatarUrl,
    reporterPhotoUrl: reporterAvatarUrl,
    reasonCategory: sample.reasonCategory,
    reasonText: sample.reasonText,
    evidenceUrls: Array.isArray(sample.evidenceUrls) ? sample.evidenceUrls : [],
    productId: "",
    productName: sample.productName,
    orderId: "",
    status: resolvedStatus,
    reviewNote: "",
    reviewedBy: "",
    reviewedAt: "",
    source: "sample-seed",
    createdAt,
    updatedAt: createdAt,
  };
}

function buildSaNotification(input) {
  return {
    id: input.id,
    type: input.type,
    category: "sellers",
    priority: "high",
    audience: "super_admin",
    title: input.title,
    reason: input.reason,
    message: input.message,
    status: "unread",
    read: false,
    productId: "",
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

async function main() {
  loadEnvFile(path.join(__dirname, "..", ".env"));
  loadEnvFile(path.join(__dirname, "..", "..", ".env"));

  const { query, closePool } = require("../db/pool");
  const dataDir = path.join(__dirname, "..", "data");
  const reportsFile = path.join(dataDir, "company_reports.json");
  const notificationsFile = path.join(dataDir, "super_admin_notifications.json");

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
  );

  let companies = companyResult.rows || [];
  if (!companies.length) {
    const fallback = await query(
      `
        SELECT
          a.id AS account_id,
          COALESCE(NULLIF(BTRIM(s.admin_id), ''), a.id) AS admin_id,
          COALESCE(s.company_id, a.id) AS company_id,
          COALESCE(NULLIF(BTRIM(s.store_name), ''), a.email) AS company_name,
          NULLIF(BTRIM(a.profile_image_url), '') AS logo_url
        FROM accounts a
        LEFT JOIN seller_profiles s ON s.account_id = a.id
        WHERE a.role = 'admin'
           OR EXISTS (
             SELECT 1
             FROM account_capabilities ac
             WHERE ac.account_id = a.id
               AND ac.capability::text = 'seller_admin'
           )
        ORDER BY a.created_at DESC NULLS LAST
        LIMIT 8
      `,
    );
    companies = fallback.rows || [];
  }

  if (!companies.length) {
    throw new Error("No existing companies found. Seed or approve a seller first, then rerun this seed.");
  }

  const buyers = [];
  for (const buyer of TEST_MODE_BUYERS) {
    buyers.push(await upsertTestModeBuyer(query, buyer));
  }

  const warningCompany = companies[0];
  const reviewCompany = companies[1] || null;

  const reports = [];
  const notifications = [];

  SAMPLE_CASES.slice(0, 3).forEach((sample, index) => {
    const buyer = buyers[index % buyers.length];
    const createdAt = hoursAgo(6 - index);
    const report = buildReport({
      id: `${SAMPLE_PREFIX}warning_${index + 1}`,
      reportId: sampleReportId(index, createdAt),
      company: warningCompany,
      buyer,
      sample,
      createdAt,
    });
    reports.push(report);
    notifications.push(buildSaNotification({
      id: `${NOTIF_PREFIX}report-warning-${index + 1}`,
      type: "company-buyer-report",
      title: "Buyer reported a company",
      reason: reasonLabelForCategory(sample.reasonCategory),
      message: `${buyerName(buyer, index)} reported ${warningCompany.company_name} (${report.reportId}). Review why before taking action — one report is not enough to warn the seller.`,
      adminId: report.adminId,
      companyId: report.companyId,
      companyName: report.companyName,
      companyPictureUrl: warningCompany.logo_url || "",
      productName: sample.productName,
      userId: String(buyer.account_code || buyer.accountCode || buyer.id || "").trim(),
      username: buyerName(buyer, index),
      userDisplayName: buyerName(buyer, index),
      createdBy: buyerName(buyer, index),
      createdAt,
      targetUrl: `/super_admin.html#companies?reports=1&adminId=${encodeURIComponent(report.adminId)}&reportId=${encodeURIComponent(report.reportId)}`,
    }));
  });

  LIST_UI_CASES.forEach((sample, index) => {
    const buyer = buyers[index % buyers.length];
    const company = companies[index % companies.length] || warningCompany;
    const createdAt = hoursAgo(18 - index);
    const reportIndex = 4 + index;
    const report = buildReport({
      id: `${SAMPLE_PREFIX}list_${index + 1}`,
      reportId: sampleReportId(reportIndex, createdAt),
      company,
      buyer,
      sample,
      createdAt,
      status: sample.status,
    });
    reports.push(report);
    notifications.push(buildSaNotification({
      id: `${NOTIF_PREFIX}report-list-${index + 1}`,
      type: "company-buyer-report",
      title: "Buyer reported a company",
      reason: reasonLabelForCategory(sample.reasonCategory),
      message: `${buyerName(buyer, index)} reported ${company.company_name} (${report.reportId}). Review why before taking action — one report is not enough to warn the seller.`,
      adminId: report.adminId,
      companyId: report.companyId,
      companyName: report.companyName,
      companyPictureUrl: company.logo_url || "",
      productName: sample.productName,
      userId: String(buyer.account_code || buyer.accountCode || buyer.id || "").trim(),
      username: buyerName(buyer, index),
      userDisplayName: buyerName(buyer, index),
      createdBy: buyerName(buyer, index),
      createdAt,
      targetUrl: `/super_admin.html#companies?reports=1&adminId=${encodeURIComponent(report.adminId)}&reportId=${encodeURIComponent(report.reportId)}`,
    }));
  });

  notifications.push(buildSaNotification({
    id: `${NOTIF_PREFIX}needs-warning`,
    type: "company-needs-warning",
    title: "This company needs warning",
    reason: "3 buyers reported this company",
    message: `${warningCompany.company_name} has enough distinct buyer reports to need a Super Admin warning review. One report is not enough — review the cases first.`,
    adminId: warningCompany.admin_id || warningCompany.account_id,
    companyId: warningCompany.company_id,
    companyName: warningCompany.company_name,
    companyPictureUrl: warningCompany.logo_url || "",
    actorType: "company",
    createdBy: "system",
    createdAt: hoursAgo(1),
    targetUrl: `/super_admin.html#companies?reports=1&adminId=${encodeURIComponent(warningCompany.admin_id || warningCompany.account_id)}`,
  }));

  if (reviewCompany) {
    const buyer = buyers[Math.min(3, buyers.length - 1)];
    const sample = SAMPLE_CASES[3];
    const createdAt = hoursAgo(2);
    const report = buildReport({
      id: `${SAMPLE_PREFIX}review_1`,
      reportId: sampleReportId(3, createdAt),
      company: reviewCompany,
      buyer,
      sample,
      createdAt,
    });
    reports.push(report);
    notifications.push(buildSaNotification({
      id: `${NOTIF_PREFIX}report-review-1`,
      type: "company-buyer-report",
      title: "Buyer reported a company",
      reason: reasonLabelForCategory(sample.reasonCategory),
      message: `${buyerName(buyer, 3)} reported ${reviewCompany.company_name} (${report.reportId}). Review why before taking action — one report is not enough to warn the seller.`,
      adminId: report.adminId,
      companyId: report.companyId,
      companyName: report.companyName,
      companyPictureUrl: reviewCompany.logo_url || "",
      productName: sample.productName,
      userId: buyer.id,
      username: buyerName(buyer, 3),
      userDisplayName: buyerName(buyer, 3),
      createdBy: buyerName(buyer, 3),
      createdAt,
      targetUrl: `/super_admin.html#companies?reports=1&adminId=${encodeURIComponent(report.adminId)}&reportId=${encodeURIComponent(report.reportId)}`,
    }));
  }

  const existingCompanyKeys = new Set(
    companies.flatMap((company) => [company.company_id, company.admin_id, company.account_id])
      .filter(Boolean)
      .map((value) => String(value)),
  );
  const existingReports = (await readJsonArray(reportsFile))
    .filter((report) => !String(report?.id || "").startsWith(SAMPLE_PREFIX))
    .filter((report) => {
      const keys = [report?.companyId, report?.adminId]
        .map((value) => String(value || "").trim())
        .filter(Boolean);
      return keys.some((key) => existingCompanyKeys.has(key));
    });
  await writeJsonArray(reportsFile, [...reports, ...existingReports]);

  const existingNotifications = (await readJsonArray(notificationsFile))
    .filter((item) => !String(item?.id || "").startsWith(NOTIF_PREFIX));
  notifications.sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)));
  await writeJsonArray(notificationsFile, [...notifications, ...existingNotifications]);

  console.log(`Seeded ${reports.length} company reports against existing companies.`);
  console.log(`Needs warning: ${warningCompany.company_name} (${warningCompany.company_id})`);
  if (reviewCompany) {
    console.log(`Single review report: ${reviewCompany.company_name} (${reviewCompany.company_id})`);
  }
  console.log(`Companies used: ${companies.length}`);
  console.log(`Test buyers: ${buyers.map((buyer) => buyer.email).join(", ")}`);
  console.log(`List UI extras: ${LIST_UI_CASES.length}`);
  console.log(`Super Admin notifications: ${notifications.length} unread sample items.`);

  await closePool();
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : error);
  try {
    const { closePool } = require("../db/pool");
    await closePool();
  } catch (_) {
    // ignore
  }
  process.exit(1);
});
