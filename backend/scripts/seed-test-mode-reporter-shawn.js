"use strict";

/**
 * Seed a Test Mode buyer user, then file sample company reports against
 * shawnkyle143@gmail.com so Report Center / User Data can be demoed.
 *
 *   node scripts/seed-test-mode-reporter-shawn.js
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

const TARGET_SELLER_EMAIL = "shawnkyle143@gmail.com";
const REPORTER = Object.freeze({
  id: "tm-buyer-mira-cruz",
  accountCode: "USR-TM001",
  email: "mira.testmode@switch.local",
  firstName: "Mira",
  lastName: "Cruz",
  countryCode: "+63",
  mobileNumber: "9170001001",
  profileImageUrl: "https://i.pravatar.cc/150?u=mira.testmode@switch.local",
});
const REPORT_PREFIX = "cr_tm_shawn_";
const NOTIF_PREFIX = "sa-notif-tm-shawn-";

const SAMPLE_CASES = [
  {
    reasonCategory: "scam",
    reasonText:
      "Test Mode buyer: I paid in full and the seller kept asking for another payment before shipping. Looks like an advance-fee scam.",
    productName: "Wireless earbuds",
    evidenceUrls: [
      "https://picsum.photos/id/1015/960/720.jpg",
      "https://picsum.photos/id/1016/960/720.jpg",
    ],
  },
  {
    reasonCategory: "non_delivery",
    reasonText:
      "Test Mode buyer: Order was marked paid two weeks ago. Tracking never moved and the seller stopped answering after I asked for a refund.",
    productName: "Phone case bundle",
    evidenceUrls: ["https://picsum.photos/id/1025/960/720.jpg"],
  },
  {
    reasonCategory: "harassment",
    reasonText:
      "Test Mode buyer: After I asked about a delayed parcel the seller sent threatening messages in order chat. Screenshots attached.",
    productName: "Canvas tote bag",
    evidenceUrls: ["https://picsum.photos/id/1060/960/720.jpg"],
  },
];

function hoursAgo(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function sampleReportId(index, createdAt) {
  const date = new Date(createdAt);
  const stamp = Number.isFinite(date.getTime())
    ? `${String(date.getUTCFullYear()).slice(-2)}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}`
    : "000000";
  const suffixes = ["T7K3", "T2M9", "T4P8"];
  return `RPT-${stamp}-${suffixes[index] || "T8R2"}`;
}

function buyerDisplayName() {
  return `${REPORTER.firstName} ${REPORTER.lastName}`.trim();
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

async function upsertTestModeBuyer(query) {
  const now = new Date().toISOString();
  const profileData = {
    testMode: true,
    testModeMarkedAt: now,
    seedSource: "seed-test-mode-reporter-shawn",
  };

  // Clear any prior row that holds the same email / account_code under another id.
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
    [REPORTER.email, REPORTER.accountCode, REPORTER.id],
  );
  await query(
    `
      DELETE FROM accounts
      WHERE (lower(email) = lower($1) OR account_code = $2)
        AND id <> $3
        AND role = 'user'
    `,
    [REPORTER.email, REPORTER.accountCode, REPORTER.id],
  );

  await query(
    `
      INSERT INTO accounts (
        id, account_code, role, email, password_hash,
        country_code, mobile_number, status, profile_image_url,
        email_verified, mobile_verified, created_at, updated_at
      ) VALUES (
        $1, $2, 'user', $3, NULL,
        $4, $5, 'active', $6,
        TRUE, FALSE, NOW(), NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        account_code = EXCLUDED.account_code,
        email = EXCLUDED.email,
        country_code = EXCLUDED.country_code,
        mobile_number = EXCLUDED.mobile_number,
        status = 'active'::account_status,
        profile_image_url = EXCLUDED.profile_image_url,
        email_verified = TRUE,
        updated_at = NOW()
    `,
    [
      REPORTER.id,
      REPORTER.accountCode,
      REPORTER.email,
      REPORTER.countryCode,
      REPORTER.mobileNumber,
      REPORTER.profileImageUrl,
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
      REPORTER.id,
      REPORTER.firstName,
      REPORTER.lastName,
      REPORTER.email,
      JSON.stringify(profileData),
    ],
  );

  return {
    id: REPORTER.id,
    email: REPORTER.email,
    first_name: REPORTER.firstName,
    last_name: REPORTER.lastName,
    account_code: REPORTER.accountCode,
  };
}

async function findShawnCompany(query) {
  const accountResult = await query(
    `
      SELECT a.id, a.email, a.profile_image_url, s.admin_id, s.store_name
      FROM accounts a
      LEFT JOIN seller_profiles s ON s.account_id = a.id
      WHERE lower(a.email) = lower($1)
      LIMIT 1
    `,
    [TARGET_SELLER_EMAIL],
  );
  const account = accountResult.rows[0];
  if (!account) {
    throw new Error(`No account found for ${TARGET_SELLER_EMAIL}.`);
  }

  const companyResult = await query(
    `
      SELECT
        c.id AS company_id,
        c.name AS company_name,
        NULLIF(BTRIM(c.logo_url), '') AS logo_url,
        COALESCE(NULLIF(BTRIM(s.admin_id), ''), a.id) AS admin_id,
        a.id AS account_id
      FROM companies c
      LEFT JOIN company_memberships m ON m.company_id = c.id
      LEFT JOIN accounts a ON a.id = COALESCE(c.source_account_id, m.account_id)
      LEFT JOIN seller_profiles s ON s.account_id = a.id
      WHERE c.source_account_id = $1 OR m.account_id = $1
      GROUP BY c.id, c.name, c.logo_url, s.admin_id, a.id
      ORDER BY
        CASE WHEN c.status = 'active' THEN 0 WHEN c.status = 'pending_review' THEN 1 ELSE 2 END,
        c.updated_at DESC
      LIMIT 1
    `,
    [account.id],
  );
  const company = companyResult.rows[0];
  if (!company) {
    throw new Error(`${TARGET_SELLER_EMAIL} has no seller company yet.`);
  }

  let logoUrl = String(company.logo_url || "").trim();
  const ownerPhoto = String(account.profile_image_url || "").trim();
  // Seed must never invent a company logo. Clear mistaken personal/fake logos.
  if (
    logoUrl
    && (
      (ownerPhoto && logoUrl === ownerPhoto)
      || /picsum\.photos\/id\/292\b/i.test(logoUrl)
    )
  ) {
    await query(
      `
        UPDATE companies
        SET logo_url = '', updated_at = NOW()
        WHERE id = $1
      `,
      [company.company_id],
    );
    logoUrl = "";
  }

  return {
    account,
    company: {
      company_id: company.company_id,
      company_name: company.company_name || account.store_name || "Shawn Kyle Shop",
      // Real seller-settings company profile only — empty means default building icon in SA.
      logo_url: logoUrl,
      admin_id: company.admin_id || account.admin_id || account.id,
      account_id: company.account_id || account.id,
    },
  };
}

function buildReport({ id, reportId, company, buyer, sample, createdAt }) {
  return {
    id,
    reportId,
    companyId: company.company_id,
    adminId: company.admin_id,
    companyName: company.company_name,
    companyPictureUrl: String(company.logo_url || "").trim(),
    reporterAccountId: buyer.id,
    reporterEmail: buyer.email || "",
    reporterName: buyerDisplayName(),
    reporterAvatarUrl: REPORTER.profileImageUrl,
    reasonCategory: sample.reasonCategory,
    reasonText: sample.reasonText,
    evidenceUrls: Array.isArray(sample.evidenceUrls) ? sample.evidenceUrls : [],
    productId: "",
    productName: sample.productName,
    orderId: "",
    status: "pending",
    reviewNote: "",
    reviewedBy: "",
    reviewedAt: "",
    source: "test-mode-seed",
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
    actorType: "user",
    userId: input.userId || "",
    username: input.username || "",
    userDisplayName: input.userDisplayName || "",
    profileImageUrl: REPORTER.profileImageUrl,
    createdBy: input.createdBy || buyerDisplayName(),
    targetUrl: input.targetUrl,
    createdAt: input.createdAt,
  };
}

async function main() {
  loadEnvFile(path.join(__dirname, "..", ".env"));
  loadEnvFile(path.join(__dirname, "..", "..", ".env"));

  const { query, closePool } = require("../db/pool");
  const { hashPassword } = require("../db/password");
  const dataDir = path.join(__dirname, "..", "data");
  const reportsFile = path.join(dataDir, "company_reports.json");
  const notificationsFile = path.join(dataDir, "super_admin_notifications.json");

  const buyer = await upsertTestModeBuyer(query);
  const passwordHash = await hashPassword("TestMode123!");
  await query(
    `
      UPDATE accounts
      SET password_hash = $2, password_updated_at = NOW(), updated_at = NOW()
      WHERE id = $1
    `,
    [buyer.id, passwordHash],
  );

  const { company } = await findShawnCompany(query);

  const reports = SAMPLE_CASES.map((sample, index) => {
    const createdAt = hoursAgo(5 - index);
    return buildReport({
      id: `${REPORT_PREFIX}${index + 1}`,
      reportId: sampleReportId(index, createdAt),
      company,
      buyer,
      sample,
      createdAt,
    });
  });

  const reasonLabels = {
    scam: "Scam or fraud",
    non_delivery: "Paid but not delivered",
    harassment: "Harassment or abuse",
  };

  const notifications = reports.map((report, index) => {
    const sample = SAMPLE_CASES[index];
    return buildSaNotification({
      id: `${NOTIF_PREFIX}${index + 1}`,
      type: "company-buyer-report",
      title: "Buyer reported a company",
      reason: reasonLabels[sample.reasonCategory] || sample.reasonCategory,
      message: `${buyerDisplayName()} (Test Mode) reported ${company.company_name} (${report.reportId}). Review why before taking action — one report is not enough to warn the seller.`,
      adminId: report.adminId,
      companyId: report.companyId,
      companyName: report.companyName,
      companyPictureUrl: company.logo_url || "",
      productName: sample.productName,
      userId: buyer.id,
      username: buyerDisplayName(),
      userDisplayName: buyerDisplayName(),
      createdBy: buyerDisplayName(),
      createdAt: report.createdAt,
      targetUrl: `/super_admin.html#companies?reports=1&adminId=${encodeURIComponent(report.adminId)}&reportId=${encodeURIComponent(report.reportId)}`,
    });
  });

  const existingReports = (await readJsonArray(reportsFile))
    .filter((report) => !String(report?.id || "").startsWith(REPORT_PREFIX));
  await writeJsonArray(reportsFile, [...reports, ...existingReports]);

  const existingNotifications = (await readJsonArray(notificationsFile))
    .filter((item) => !String(item?.id || "").startsWith(NOTIF_PREFIX));
  notifications.sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)));
  await writeJsonArray(notificationsFile, [...notifications, ...existingNotifications]);

  console.log(`Test Mode buyer ready: ${buyer.email} (${buyer.id} / ${buyer.account_code})`);
  console.log(`Password: TestMode123!`);
  console.log(`Reported company: ${company.company_name} (${company.company_id})`);
  console.log(`Seller: ${TARGET_SELLER_EMAIL}`);
  console.log(`Seeded ${reports.length} company reports from Test Mode buyer.`);
  console.log(`Super Admin notifications: ${notifications.length}`);
  console.log("Turn ON Test Mode in Super Admin to see this buyer in User Data.");

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
