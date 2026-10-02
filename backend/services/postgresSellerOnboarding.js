"use strict";

const { query, withTransaction, isPostgresConfigured, getPool } = require("../db/pool");
const { normalizeEmail, normalizePhone, asObject } = require("../db/accountHelpers");
const { resolveUnifiedSession } = require("./postgresUnifiedAccounts");
const crypto = require("crypto");
const { hashPassword, verifyPassword } = require("../db/password");
const {
  isTestModeEnabled,
  isTestModeCompany,
  companyVisibleToSellerSession,
} = require("./testModeService");
const {
  resolveSellerPlanSelection,
  resolveFirstCompanyFreePlan,
  nextMonthlySlotExpiry,
} = require("./sellerPlanCatalog");
const {
  ALLOWED_DOCUMENT_TYPES,
  normalizeSellerKind,
  sellerKindLabel,
  normalizeDocumentType,
  documentTypeLabel,
  normalizePayoutBank,
  hasPayoutBank,
  sanitizePayoutBankForAdmin,
  evaluateSellerKyc,
  resolveSellerKind,
  assertSellerKindAllowedDocument,
} = require("./sellerClassification");

const MIN_STORE_ADDRESS_LENGTH = 8;

function toStoreCoordinate(value, limit) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && Math.abs(parsed) <= limit ? parsed : null;
}

/**
 * Store (pickup) address captured at "Become a Seller". Switch Rider uses it as
 * the pickup point until the seller pins a dedicated pickup location.
 */
function normalizeStoreLocation(input = {}) {
  const source = input.storeLocation && typeof input.storeLocation === "object" ? input.storeLocation : input;
  const address = String(source.storeAddress ?? source.address ?? "").replace(/\s+/g, " ").trim().slice(0, 300);
  if (address.length < MIN_STORE_ADDRESS_LENGTH) return null;
  let lat = toStoreCoordinate(source.storeLatitude ?? source.lat ?? source.latitude, 90);
  let lng = toStoreCoordinate(source.storeLongitude ?? source.lng ?? source.longitude, 180);
  if (lat === null || lng === null || (lat === 0 && lng === 0)) {
    lat = null;
    lng = null;
  }
  return {
    address,
    area: String(source.storeArea ?? source.area ?? "").replace(/\s+/g, " ").trim().slice(0, 80),
    lat,
    lng,
    updatedAt: new Date().toISOString(),
  };
}

async function isSellerOnboardingReady() {
  if (!isPostgresConfigured()) {
    return false;
  }
  try {
    await getPool();
    await query("SELECT 1 FROM companies LIMIT 1");
    await query("SELECT 1 FROM seller_subscriptions LIMIT 1");
    return true;
  } catch (_) {
    return false;
  }
}

async function findAccountForOnboarding({ accountId, email }) {
  const session = await resolveUnifiedSession({ accountId, email });
  if (!session?.account?.id) {
    throw new Error("Unified account not found.");
  }

  const result = await query(
    `
      SELECT
        a.id,
        a.email,
        a.country_code,
        a.mobile_number,
        a.email_verified,
        a.mobile_verified,
        a.profile_image_url,
        COALESCE(u.first_name, '') AS first_name,
        COALESCE(u.last_name, '') AS last_name,
        COALESCE(NULLIF(u.username, ''), a.email, '') AS username,
        a.created_at
      FROM accounts a
      LEFT JOIN user_profiles u ON u.account_id = a.id
      WHERE a.id = $1
      LIMIT 1
    `,
    [session.account.id],
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error("Account not found.");
  }

  return {
    session,
    account: {
      id: row.id,
      email: row.email || "",
      countryCode: row.country_code || "+63",
      mobileNumber: row.mobile_number || "",
      emailVerified: Boolean(row.email_verified),
      mobileVerified: Boolean(row.mobile_verified),
      firstName: row.first_name || "",
      lastName: row.last_name || "",
      username: row.username || row.email || "",
      profileImageUrl: String(row.profile_image_url || "").trim(),
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    },
  };
}

async function findSellerCompanyByAccount(accountId, options = {}) {
  const normalizedAccountId = String(accountId || "").trim();
  if (!normalizedAccountId) {
    return null;
  }

  const preferredCompanyId = String(options.companyId || "").trim();
  const preferStatuses = Array.isArray(options.preferStatuses) ? options.preferStatuses : null;

  const result = await query(
    `
      SELECT
        c.id,
        c.type::text AS type,
        c.status::text AS status,
        c.name,
        c.legal_name,
        c.public_name,
        c.masked_public_name,
        c.email,
        c.country_code,
        c.mobile_number,
        c.logo_url,
        c.business_type,
        c.subscription_status::text AS subscription_status,
        c.verification_status,
        c.profile_data,
        c.source_account_id,
        c.created_at,
        c.updated_at
      FROM companies c
      WHERE c.source_account_id = $1
        AND c.type = 'seller'
      ORDER BY
        CASE
          WHEN c.id = $2 THEN 0
          WHEN c.status = 'active' THEN 1
          WHEN c.status = 'pending_review' THEN 2
          WHEN c.subscription_status = 'pending_payment' THEN 3
          WHEN c.status = 'draft' THEN 4
          ELSE 5
        END ASC,
        c.updated_at DESC,
        c.created_at DESC
      LIMIT 50
    `,
    [normalizedAccountId, preferredCompanyId || null],
  );

  const testModeOn = await isTestModeEnabled();
  const rows = (result.rows || []).filter((row) =>
    companyVisibleToSellerSession(asObject(row.profile_data), { testModeOn }),
  );
  if (!rows.length) {
    return null;
  }

  let selected = rows[0];
  if (preferredCompanyId) {
    selected = rows.find((row) => String(row.id) === preferredCompanyId) || selected;
  } else if (preferStatuses?.length) {
    selected =
      rows.find((row) => preferStatuses.includes(String(row.status || "").toLowerCase())) ||
      selected;
  }

  return mapSellerCompanyRow(selected);
}

function hasOperatingSellerIdentity(status) {
  const token = String(status || "").trim().toLowerCase();
  return token !== "" && !["draft", "pending_review", "rejected"].includes(token);
}

function mapSellerCompanyRow(row) {
  if (!row) {
    return null;
  }
  const profileData = asObject(row.profile_data);
  return {
    id: row.id,
    companyCode: "",
    type: row.type,
    status: row.status,
    name: row.name || "",
    legalName: row.legal_name || "",
    publicName: row.public_name || "",
    maskedPublicName: row.masked_public_name || "",
    email: row.email || "",
    countryCode: row.country_code || "+63",
    mobileNumber: row.mobile_number || "",
    logoUrl: row.logo_url || "",
    businessType: row.business_type || "",
    subscriptionStatus: row.subscription_status || "draft",
    verificationStatus: row.verification_status || "unverified",
    profileData,
    testMode: isTestModeCompany(profileData),
    sourceAccountId: row.source_account_id || "",
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
    planName: String(profileData.planName || "").trim(),
    slotPlaceholder: profileData.slotPlaceholder === true,
    slotPaidAt: String(profileData.slotPaidAt || "").trim(),
  };
}

const OCCUPIED_SELLER_STATUSES = new Set([
  "draft",
  "pending_payment",
  "pending_review",
  "active",
]);

function isOccupiedSellerCompany(company) {
  const status = String(company?.status || "").trim().toLowerCase();
  return OCCUPIED_SELLER_STATUSES.has(status);
}

function isFreeCompanyPlan(company) {
  const plan = String(
    company?.planName
    || company?.profileData?.planName
    || "",
  ).trim().toLowerCase();
  return !plan || plan === "free" || plan === "free plan";
}

function isIncompleteFreeCompany(company) {
  const status = String(company?.status || "").trim().toLowerCase();
  return isFreeCompanyPlan(company)
    && ["draft", "pending_payment"].includes(status);
}

function buildSellerCompanyEntitlement(companies = []) {
  const occupied = (Array.isArray(companies) ? companies : []).filter(isOccupiedSellerCompany);
  const incompleteFree = occupied.find(isIncompleteFreeCompany);
  const firstCompany = occupied.length === 0;
  const canSubmitFreeFirst = firstCompany || (occupied.length === 1 && Boolean(incompleteFree));
  return {
    existingCompanyCount: occupied.length,
    firstCompanyFree: true,
    requiresPaidPlan: false,
    canSubmitFreeFirst,
    oneCompanyPerAccount: true,
    subscriptionsRetired: true,
    incompleteFreeCompanyId: incompleteFree?.id || "",
  };
}

async function findPaidExtraCompanySlot(accountId) {
  const normalizedAccountId = String(accountId || "").trim();
  if (!normalizedAccountId) {
    return null;
  }
  const result = await query(
    `
      SELECT
        i.id,
        i.company_id,
        i.account_id,
        i.plan_name,
        i.billing_cycle,
        i.amount,
        i.currency_code,
        i.payment_reference,
        i.status::text AS status,
        i.metadata,
        i.updated_at,
        c.profile_data,
        c.status::text AS company_status,
        c.name AS company_name
      FROM seller_checkout_intents i
      JOIN companies c ON c.id = i.company_id
      WHERE i.account_id = $1
        AND c.type = 'seller'
        AND (
          COALESCE(i.metadata->>'slotPurchase', '') = 'true'
          OR COALESCE(c.profile_data->>'slotPlaceholder', '') = 'true'
        )
      ORDER BY i.updated_at DESC
      LIMIT 8
    `,
    [normalizedAccountId],
  );
  for (const row of result.rows || []) {
    const metadata = asObject(row.metadata);
    const profile = asObject(row.profile_data);
    const paid = String(row.status || "").toLowerCase() === "active"
      || Boolean(String(metadata.paymentPaidAt || profile.slotPaidAt || "").trim());
    const companyStatus = String(row.company_status || "").toLowerCase();
    if (!paid || !["draft", "pending_payment"].includes(companyStatus)) {
      continue;
    }
    return {
      intentId: row.id,
      companyId: row.company_id,
      accountId: row.account_id,
      planName: row.plan_name || profile.planName || "",
      billingCycle: row.billing_cycle || "monthly",
      amount: Number(row.amount) || 0,
      currencyCode: row.currency_code || "PHP",
      paymentReference: row.payment_reference || "",
      paidAt: String(metadata.paymentPaidAt || profile.slotPaidAt || "").trim(),
      placeholder: profile.slotPlaceholder === true,
    };
  }
  return null;
}

async function getSellerCompanyEntitlement(accountId) {
  const companies = await listSellerCompaniesByAccount(accountId);
  return {
    ...buildSellerCompanyEntitlement(companies),
    companies,
    paidExtraSlot: null,
  };
}

async function createPlaceholderExtraCompany(client, {
  account,
  selectedPlan,
}) {
  const companyName = "New company slot";
  const insert = await client.query(
    `
      INSERT INTO companies (
        type,
        status,
        name,
        legal_name,
        public_name,
        masked_public_name,
        email,
        country_code,
        mobile_number,
        logo_url,
        business_type,
        subscription_status,
        verification_status,
        source_account_id,
        profile_data,
        created_at,
        updated_at
      ) VALUES (
        'seller',
        'draft',
        $1,
        $1,
        $1,
        $2,
        $3,
        $4,
        $5,
        '',
        '',
        'pending_payment',
        'unverified',
        $6,
        $7::jsonb,
        NOW(),
        NOW()
      )
      RETURNING id
    `,
    [
      companyName,
      `Seller ${String(account.id).slice(-4)}`,
      account.email || "",
      account.countryCode || "+63",
      account.mobileNumber || "",
      account.id,
      JSON.stringify({
        onboardingSource: "extra_company_slot",
        slotPlaceholder: true,
        extraCompanySlot: true,
        slotBilling: "monthly",
        planName: selectedPlan.planName,
        billingCycle: "monthly",
        requestedAt: new Date().toISOString(),
      }),
    ],
  );
  const companyId = insert.rows[0]?.id;
  await client.query(
    `
      INSERT INTO company_memberships (
        company_id, account_id, membership_role, membership_status,
        title, is_primary, metadata, created_at, updated_at
      ) VALUES (
        $1, $2, 'owner', 'pending', 'Owner', FALSE, $3::jsonb, NOW(), NOW()
      )
      ON CONFLICT (company_id, account_id, membership_role) DO UPDATE SET
        membership_status = EXCLUDED.membership_status,
        updated_at = NOW()
    `,
    [
      companyId,
      account.id,
      JSON.stringify({ onboardingStage: "slot_checkout" }),
    ],
  );
  await client.query(
    `
      INSERT INTO seller_subscriptions (
        company_id, plan_name, status, billing_cycle, payment_gateway,
        payment_reference, amount, currency_code, metadata, created_at, updated_at
      ) VALUES (
        $1, $2, 'pending_payment', 'monthly', 'paymongo',
        '', $3, $4, $5::jsonb, NOW(), NOW()
      )
    `,
    [
      companyId,
      selectedPlan.planName,
      selectedPlan.amount,
      selectedPlan.currencyCode || "PHP",
      JSON.stringify({
        slotPurchase: true,
        slotBilling: "monthly",
        extraCompanySlot: true,
      }),
    ],
  );
  return companyId;
}

async function listSellerCompaniesByAccount(accountId) {
  const normalizedAccountId = String(accountId || "").trim();
  if (!normalizedAccountId) {
    return [];
  }
  const result = await query(
    `
      SELECT
        c.id,
        c.type::text AS type,
        c.status::text AS status,
        c.name,
        c.legal_name,
        c.public_name,
        c.masked_public_name,
        c.email,
        c.country_code,
        c.mobile_number,
        c.logo_url,
        c.business_type,
        c.subscription_status::text AS subscription_status,
        c.verification_status,
        c.profile_data,
        c.source_account_id,
        c.created_at,
        c.updated_at
      FROM companies c
      WHERE c.source_account_id = $1
        AND c.type = 'seller'
      ORDER BY c.updated_at DESC, c.created_at DESC
    `,
    [normalizedAccountId],
  );
  const testModeOn = await isTestModeEnabled();
  return (result.rows || [])
    .filter((row) =>
      companyVisibleToSellerSession(asObject(row.profile_data), { testModeOn }),
    )
    .map(mapSellerCompanyRow);
}

function normalizeCompanyNameKey(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

async function setPrimaryCompanyMembership(client, { companyId, accountId }) {
  const queryFn = client?.query ? client.query.bind(client) : query;
  await queryFn(
    `
      UPDATE company_memberships
      SET
        is_primary = FALSE,
        updated_at = NOW()
      WHERE account_id = $1
        AND company_id <> $2
        AND is_primary = TRUE
    `,
    [accountId, companyId],
  );
  await queryFn(
    `
      UPDATE company_memberships
      SET
        is_primary = TRUE,
        updated_at = NOW()
      WHERE account_id = $1
        AND company_id = $2
    `,
    [accountId, companyId],
  );
}

async function findSellerSubscriptionByCompany(companyId) {
  const result = await query(
    `
      SELECT
        id,
        company_id,
        plan_name,
        status::text AS status,
        billing_cycle,
        payment_gateway,
        payment_reference,
        amount,
        currency_code,
        started_at,
        expires_at,
        approved_at,
        metadata,
        created_at,
        updated_at
      FROM seller_subscriptions
      WHERE company_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [companyId],
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    companyId: row.company_id,
    planName: row.plan_name || "Starter Seller Plan",
    status: row.status || "draft",
    billingCycle: row.billing_cycle || "monthly",
    paymentGateway: row.payment_gateway || "",
    paymentReference: row.payment_reference || "",
    amount: Number(row.amount) || 0,
    currencyCode: row.currency_code || "PHP",
    startedAt: row.started_at ? new Date(row.started_at).toISOString() : null,
    expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null,
    approvedAt: row.approved_at ? new Date(row.approved_at).toISOString() : null,
    metadata: asObject(row.metadata),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
  };
}

async function startSellerOnboarding(input = {}) {
  const { session, account } = await findAccountForOnboarding(input);
  const companyName = String(
    input.companyName ?? input.storeName ?? input.businessName ?? "",
  ).trim();
  const businessType = String(input.businessType ?? input.storeType ?? "").trim();
  const countryCode = String(input.countryCode ?? account.countryCode ?? "+63").trim() || "+63";
  const mobileNumber = normalizePhone(input.mobileNumber ?? account.mobileNumber);
  const email = normalizeEmail(input.email ?? account.email);

  if (!companyName || companyName.length < 2) {
    throw new Error("Company name must be at least 2 characters long.");
  }

  const allCompanies = await listSellerCompaniesByAccount(account.id);
  const entitlement = buildSellerCompanyEntitlement(allCompanies);
  const selectedPlan = resolveFirstCompanyFreePlan();
  const planName = selectedPlan.planName;
  const billingCycle = selectedPlan.billingCycle;
  const amount = selectedPlan.amount;
  const gateway = selectedPlan.free
    ? "free"
    : (String(input.paymentGateway ?? "").trim() || "paymongo");
  const gatewayReference = String(input.paymentReference ?? "").trim();
  const companyNameKey = normalizeCompanyNameKey(companyName);
  const matchingNamedCompany = allCompanies.find(
    (entry) => normalizeCompanyNameKey(entry.name) === companyNameKey,
  );
  const resumableDraft = allCompanies.find((entry) =>
    ["draft", "pending_payment"].includes(String(entry.status || "").toLowerCase())
    && (
      normalizeCompanyNameKey(entry.name) === companyNameKey
      || entry.slotPlaceholder === true
    ),
  );
  const existingSameLiveCompany = matchingNamedCompany
    && ["active", "pending_review"].includes(String(matchingNamedCompany.status || "").toLowerCase())
    ? matchingNamedCompany
    : null;

  const liveCompany = allCompanies.find((entry) => (
    ["active", "pending_review"].includes(String(entry.status || "").toLowerCase())
  ));
  if (liveCompany && !existingSameLiveCompany) {
    const error = new Error(
      "This account already has a company. Switch allows one company per account.",
    );
    error.statusCode = 409;
    error.code = "SELLER_ONE_COMPANY_LIMIT";
    throw error;
  }

  // Resume the same live company only when the user re-enters the same company name.
  if (existingSameLiveCompany) {
    const pinUnlock = await saveSellerSwitchPinIfProvided({
      accountId: account.id,
      companyId: existingSameLiveCompany.id,
      pin: input.sellerPin ?? input.pin,
    });
    await setPrimaryCompanyMembership(null, {
      companyId: existingSameLiveCompany.id,
      accountId: account.id,
    });
    return {
      account: session.account,
      company: existingSameLiveCompany,
      onboardingStatus: existingSameLiveCompany.subscriptionStatus || existingSameLiveCompany.status,
      alreadyExists: true,
      pinUnlockToken: pinUnlock.unlockToken || "",
    };
  }

  const logoUrl = String(input.logoUrl ?? input.profileImageUrl ?? "").trim();
  const paymentCard =
    input.paymentCard && typeof input.paymentCard === "object" ? input.paymentCard : null;
  const profileAbout = String(input.profileAbout ?? input.about ?? "").trim();
  const rawSellerPin = String(input.sellerPin ?? input.pin ?? "").replace(/\D/g, "");
  let sellerPinHash = "";
  if (rawSellerPin) {
    if (!/^\d{6}$/.test(rawSellerPin)) {
      throw new Error("Switch PIN must be exactly 6 digits.");
    }
    sellerPinHash = await hashPassword(rawSellerPin);
  }

  const sellerKind = normalizeSellerKind(input.sellerKind ?? input.sellerType ?? input.classification);
  if (!sellerKind) {
    const error = new Error("Choose Individual Seller or Business / Corporate Seller.");
    error.statusCode = 400;
    throw error;
  }
  const payoutBank = normalizePayoutBank(input.payoutBank ?? input.bankAccount);
  if (!hasPayoutBank(payoutBank)) {
    const error = new Error(
      sellerKind === "business"
        ? "Enter the business bank account that matches the registered company name."
        : "Enter a bank account in your name for seller payouts.",
    );
    error.statusCode = 400;
    throw error;
  }

  const storeLocation = normalizeStoreLocation(input);
  if (!storeLocation) {
    const error = new Error("Enter your full store address (street, barangay, city/municipality, province).");
    error.statusCode = 400;
    error.code = "STORE_ADDRESS_REQUIRED";
    throw error;
  }

  const companyPasswordHash = await resolveCompanyPasswordHash({
    accountId: account.id,
    rawPassword: input.companyPassword ?? input.password,
  });
  const onboardingProfileData = {
    onboardingSource: "buyer_upgrade",
    planName,
    billingCycle,
    sellerKind,
    payoutBank,
    storeLocation,
    slotPlaceholder: false,
    extraCompanySlot: false,
    slotBilling: "none",
    requestedAt: new Date().toISOString(),
    ...(profileAbout ? { about: profileAbout } : {}),
    ...(sellerPinHash ? { sellerPinHash } : {}),
    ...(companyPasswordHash ? { companyPasswordHash } : {}),
    ...(input.businessLogoSkipped === true ? { businessLogoSkipped: true } : {}),
    ...(paymentCard
      ? {
          paymentCard: {
            brand: String(paymentCard.brand || "visa").trim() || "visa",
            last4: String(paymentCard.last4 || "").replace(/\D/g, "").slice(-4),
            expMonth: String(paymentCard.expMonth || "").trim(),
            expYear: String(paymentCard.expYear || "").trim(),
            holderName: String(paymentCard.holderName || "").trim(),
            prototype: true,
          },
        }
      : {}),
  };

  if (resumableDraft) {
    await query(
      `
        UPDATE companies
        SET
          name = $2,
          legal_name = $2,
          public_name = $2,
          business_type = $3,
          email = $4,
          country_code = $5,
          mobile_number = $6,
          logo_url = CASE WHEN $7 = '' THEN logo_url ELSE $7 END,
          profile_data = profile_data || $8::jsonb,
          updated_at = NOW()
        WHERE id = $1
      `,
      [
        resumableDraft.id,
        companyName,
        businessType,
        email,
        countryCode,
        mobileNumber,
        logoUrl,
        JSON.stringify(onboardingProfileData),
      ],
    );

    await setPrimaryCompanyMembership(null, {
      companyId: resumableDraft.id,
      accountId: account.id,
    });

    return {
      account: session.account,
      company: await findCompanyById(resumableDraft.id),
      onboardingStatus: resumableDraft.subscriptionStatus || resumableDraft.status,
      alreadyExists: true,
      pinUnlockToken: sellerPinHash
        ? issueSwitchPinUnlock({ accountId: account.id, companyId: resumableDraft.id })
        : "",
    };
  }

  let createdCompany = null;
  await withTransaction(async (client) => {
    const companyInsert = await client.query(
      `
        INSERT INTO companies (
          type,
          status,
          name,
          legal_name,
          public_name,
          masked_public_name,
          email,
          country_code,
          mobile_number,
          logo_url,
          business_type,
          subscription_status,
          verification_status,
          source_account_id,
          profile_data,
          created_at,
          updated_at
        ) VALUES (
          'seller',
          'draft',
          $1,
          $1,
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          'pending_payment',
          $8,
          $9,
          $10::jsonb,
          NOW(),
          NOW()
        )
        RETURNING id
      `,
      [
        companyName,
        `Seller ${String(account.id).slice(-4)}`,
        email,
        countryCode,
        mobileNumber,
        logoUrl,
        businessType,
        account.emailVerified || account.mobileVerified ? "verified" : "unverified",
        account.id,
        JSON.stringify(onboardingProfileData),
      ],
    );

    const companyId = companyInsert.rows[0]?.id;
    await client.query(
      `
        INSERT INTO company_memberships (
          company_id,
          account_id,
          membership_role,
          membership_status,
          title,
          is_primary,
          metadata,
          created_at,
          updated_at
        ) VALUES (
          $1,
          $2,
          'owner',
          'pending',
          'Owner',
          TRUE,
          $3::jsonb,
          NOW(),
          NOW()
        )
        ON CONFLICT (company_id, account_id, membership_role) DO UPDATE SET
          membership_status = EXCLUDED.membership_status,
          title = EXCLUDED.title,
          is_primary = EXCLUDED.is_primary,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()
      `,
      [
        companyId,
        account.id,
        JSON.stringify({
          onboardingStage: "started",
        }),
      ],
    );

    await setPrimaryCompanyMembership(client, {
      companyId,
      accountId: account.id,
    });

    await client.query(
      `
        INSERT INTO seller_subscriptions (
          company_id,
          plan_name,
          status,
          billing_cycle,
          payment_gateway,
          payment_reference,
          amount,
          currency_code,
          metadata,
          created_at,
          updated_at
        ) VALUES (
          $1,
          $2,
          'pending_payment',
          $3,
          $4,
          $5,
          $6,
          $7,
          $8::jsonb,
          NOW(),
          NOW()
        )
      `,
      [
        companyId,
        planName,
        billingCycle,
        gateway,
        gatewayReference,
        amount,
        selectedPlan.currencyCode || "PHP",
        JSON.stringify({
          onboardingStage: "started",
          initiatedByAccountId: account.id,
          slotBilling: selectedPlan.free ? "none" : "monthly",
          extraCompanySlot: !selectedPlan.free,
        }),
      ],
    );

    createdCompany = {
      id: companyId,
      companyCode: "",
      type: "seller",
      sellerKind,
      status: "draft",
      name: companyName,
      legalName: companyName,
      publicName: companyName,
      maskedPublicName: `Seller ${String(account.id).slice(-4)}`,
      email,
      countryCode,
      mobileNumber,
      logoUrl,
      businessType,
      subscriptionStatus: "pending_payment",
      verificationStatus: account.emailVerified || account.mobileVerified ? "verified" : "unverified",
      profileData: onboardingProfileData,
      sourceAccountId: account.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  if (createdCompany?.id) {
    createdCompany = (await findCompanyById(createdCompany.id)) || createdCompany;
  }

  return {
    account: session.account,
    company: createdCompany,
    onboardingStatus: "pending_payment",
    alreadyExists: false,
    pinUnlockToken: sellerPinHash
      ? issueSwitchPinUnlock({ accountId: account.id, companyId: createdCompany?.id || "" })
      : "",
  };
}

async function createSellerCheckoutIntent(input = {}) {
  await findAccountForOnboarding(input);
  const error = new Error(
    "Seller subscriptions were removed. Each account gets one free company — PayMongo is not used for company creation.",
  );
  error.statusCode = 400;
  error.code = "SELLER_PLANS_RETIRED";
  throw error;
  const selectedCheckoutPlan = resolveSellerPlanSelection(input, { requirePaid: true });
  Object.assign(input, {
    planName: selectedCheckoutPlan.planName,
    billingCycle: selectedCheckoutPlan.billingCycle,
    amount: selectedCheckoutPlan.amount,
    currencyCode: selectedCheckoutPlan.currencyCode,
    paymentGateway: "paymongo",
  });
  const slotPurchase = input.slotPurchase === true || input.extraCompanySlot === true
    || !String(input.companyId || "").trim();
  let companyId = String(input.companyId || "").trim();
  if (slotPurchase) {
    const existingPaid = entitlement.paidExtraSlot;
    if (existingPaid?.paidAt && existingPaid.placeholder) {
      const error = new Error(
        "This monthly slot is already paid. Continue by creating the company profile.",
      );
      error.statusCode = 409;
      error.code = "SELLER_SLOT_ALREADY_PAID";
      error.paidExtraSlot = existingPaid;
      throw error;
    }
    const placeholder = (entitlement.companies || []).find((company) => (
      company.slotPlaceholder
      && ["draft", "pending_payment"].includes(String(company.status || "").toLowerCase())
    ));
    if (placeholder?.id) {
      companyId = placeholder.id;
    } else {
      await withTransaction(async (client) => {
        companyId = await createPlaceholderExtraCompany(client, {
          account,
          selectedPlan: selectedCheckoutPlan,
        });
      });
    }
  }
  if (!companyId) {
    const existingCompany = await findSellerCompanyByAccount(account.id);
    companyId = String(existingCompany?.id || "").trim();
  }
  if (!companyId) {
    throw new Error("Pay the monthly extra-company slot first.");
  }
  const checkoutCompany = await findCompanyById(companyId);
  const checkoutProfile = asObject(checkoutCompany?.profileData);
  const isSlotPlaceholder = slotPurchase || checkoutProfile.slotPlaceholder === true;
  if (checkoutCompany && !isSlotPlaceholder) {
    const kyc = evaluateSellerKyc({
      sellerKind: checkoutProfile.sellerKind || checkoutCompany.sellerKind,
      documents: checkoutProfile.businessDocuments,
      payoutBank: checkoutProfile.payoutBank,
    });
    if (!kyc.complete) {
      const error = new Error(
        `Finish seller requirements before checkout: ${kyc.missing.join(", ")}.`,
      );
      error.statusCode = 400;
      error.code = "SELLER_KYC_INCOMPLETE";
      error.missing = kyc.missing;
      throw error;
    }
  }

  const subscription = await findSellerSubscriptionByCompany(companyId);
  const planName = String(
    input.planName ?? subscription?.planName ?? "Starter Seller Plan",
  ).trim() || "Starter Seller Plan";
  const billingCycle = String(
    input.billingCycle ?? subscription?.billingCycle ?? "monthly",
  ).trim() || "monthly";
  const paymentGateway = String(
    input.paymentGateway ?? subscription?.paymentGateway ?? "manual",
  ).trim() || "manual";
  const amount = Number(input.amount ?? subscription?.amount ?? 0) || 0;
  const currencyCode = String(
    input.currencyCode ?? subscription?.currencyCode ?? "PHP",
  ).trim() || "PHP";
  const paymentReference =
    String(input.paymentReference ?? "").trim() || `CHK-${Date.now()}`;
  const checkoutIntentId = `sellchk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const checkoutUrl =
    `/unified_account.html?checkoutIntent=${encodeURIComponent(checkoutIntentId)}&companyId=${encodeURIComponent(companyId)}`;

  let intent = null;
  await withTransaction(async (client) => {
    if (subscription?.id) {
      await client.query(
        `
          UPDATE seller_subscriptions
          SET
            plan_name = $2,
            status = 'pending_payment',
            billing_cycle = $3,
            payment_gateway = $4,
            payment_reference = $5,
            amount = $6,
            currency_code = $7,
            metadata = metadata || $8::jsonb,
            updated_at = NOW()
          WHERE id = $1
        `,
        [
          subscription.id,
          planName,
          billingCycle,
          paymentGateway,
          paymentReference,
          amount,
          currencyCode,
          JSON.stringify({
            checkoutIntentId,
            checkoutPreparedAt: new Date().toISOString(),
          }),
        ],
      );
    }

    const insert = await client.query(
      `
        INSERT INTO seller_checkout_intents (
          id,
          company_id,
          account_id,
          subscription_id,
          plan_name,
          billing_cycle,
          amount,
          currency_code,
          payment_gateway,
          payment_reference,
          status,
          checkout_url,
          expires_at,
          metadata,
          created_at,
          updated_at
        ) VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          'pending_payment',
          $11,
          $12,
          $13::jsonb,
          NOW(),
          NOW()
        )
        RETURNING
          id,
          company_id,
          account_id,
          subscription_id,
          plan_name,
          billing_cycle,
          amount,
          currency_code,
          payment_gateway,
          payment_reference,
          status::text AS status,
          checkout_url,
          expires_at,
          metadata,
          created_at,
          updated_at
      `,
      [
        checkoutIntentId,
        companyId,
        account.id,
        subscription?.id || null,
        planName,
        billingCycle,
        amount,
        currencyCode,
        paymentGateway,
        paymentReference,
        checkoutUrl,
        expiresAt,
        JSON.stringify({
          companyId,
          accountId: account.id,
          checkoutPreparedAt: new Date().toISOString(),
          slotPurchase: Boolean(isSlotPlaceholder),
          extraCompanySlot: Boolean(isSlotPlaceholder),
          slotBilling: "monthly",
        }),
      ],
    );

    const row = insert.rows[0];
    intent = row && {
      id: row.id,
      companyId: row.company_id,
      accountId: row.account_id,
      subscriptionId: row.subscription_id || null,
      planName: row.plan_name || planName,
      billingCycle: row.billing_cycle || billingCycle,
      amount: Number(row.amount) || amount,
      currencyCode: row.currency_code || currencyCode,
      paymentGateway: row.payment_gateway || paymentGateway,
      paymentReference: row.payment_reference || paymentReference,
      status: row.status || "pending_payment",
      checkoutUrl: row.checkout_url || checkoutUrl,
      expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : expiresAt,
      metadata: asObject(row.metadata),
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
    };
  });

  return {
    accountId: account.id,
    companyId,
    checkoutIntent: intent,
  };
}

async function updateSellerCheckoutIntentGatewayState(intentId, patch = {}) {
  const normalizedId = String(intentId ?? "").trim();
  if (!normalizedId) {
    throw new Error("Checkout intent ID is required.");
  }

  const metadata = asObject(patch.metadata);
  const result = await query(
    `
      UPDATE seller_checkout_intents
      SET
        payment_gateway = COALESCE(NULLIF($2, ''), payment_gateway),
        payment_reference = COALESCE(NULLIF($3, ''), payment_reference),
        checkout_url = COALESCE(NULLIF($4, ''), checkout_url),
        status = COALESCE($5::subscription_status, status),
        metadata = metadata || $6::jsonb,
        updated_at = NOW()
      WHERE id = $1
      RETURNING
        id,
        company_id,
        account_id,
        subscription_id,
        plan_name,
        billing_cycle,
        amount,
        currency_code,
        payment_gateway,
        payment_reference,
        status::text AS status,
        checkout_url,
        expires_at,
        metadata,
        created_at,
        updated_at
    `,
    [
      normalizedId,
      String(patch.paymentGateway ?? "").trim(),
      String(patch.paymentReference ?? "").trim(),
      String(patch.checkoutUrl ?? "").trim(),
      patch.status ? String(patch.status).trim().toLowerCase() : null,
      JSON.stringify(metadata),
    ],
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    companyId: row.company_id,
    accountId: row.account_id,
    subscriptionId: row.subscription_id || null,
    planName: row.plan_name,
    billingCycle: row.billing_cycle,
    amount: Number(row.amount) || 0,
    currencyCode: row.currency_code || "PHP",
    paymentGateway: row.payment_gateway || "",
    paymentReference: row.payment_reference || "",
    status: row.status || "pending_payment",
    checkoutUrl: row.checkout_url || "",
    expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null,
    metadata: asObject(row.metadata),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
  };
}

async function markExtraCompanySlotPaid(intent, extras = {}) {
  const companyId = String(intent?.companyId || "").trim();
  const paidAt = new Date().toISOString();
  if (companyId) {
    await query(
      `
        UPDATE companies
        SET
          profile_data = profile_data || $2::jsonb,
          updated_at = NOW()
        WHERE id = $1
      `,
      [
        companyId,
        JSON.stringify({
          slotPaidAt: paidAt,
          slotBilling: "monthly",
          extraCompanySlot: true,
          slotPaidIntentId: String(intent.id || "").trim(),
        }),
      ],
    );
    await query(
      `
        UPDATE seller_subscriptions
        SET
          status = 'pending_payment',
          payment_gateway = 'paymongo',
          payment_reference = COALESCE(NULLIF($2, ''), payment_reference),
          expires_at = COALESCE(expires_at, $3::timestamptz),
          metadata = metadata || $4::jsonb,
          updated_at = NOW()
        WHERE company_id = $1
      `,
      [
        companyId,
        String(intent.paymentReference || "").trim(),
        nextMonthlySlotExpiry(),
        JSON.stringify({
          slotPaidAt: paidAt,
          slotPurchase: true,
          paymongoEventId: extras.paymongoEventId || "",
        }),
      ],
    );
  }
  return { paidAt, companyId };
}

async function findSellerCheckoutIntentByPaymentReference(paymentReference) {
  const normalized = String(paymentReference ?? "").trim();
  if (!normalized) {
    return null;
  }

  const result = await query(
    `
      SELECT
        id,
        company_id,
        account_id,
        subscription_id,
        plan_name,
        billing_cycle,
        amount,
        currency_code,
        payment_gateway,
        payment_reference,
        status::text AS status,
        checkout_url,
        expires_at,
        metadata,
        created_at,
        updated_at
      FROM seller_checkout_intents
      WHERE payment_reference = $1
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [normalized],
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    companyId: row.company_id,
    accountId: row.account_id,
    subscriptionId: row.subscription_id || null,
    planName: row.plan_name,
    billingCycle: row.billing_cycle,
    amount: Number(row.amount) || 0,
    currencyCode: row.currency_code || "PHP",
    paymentGateway: row.payment_gateway || "",
    paymentReference: row.payment_reference || "",
    status: row.status || "pending_payment",
    checkoutUrl: row.checkout_url || "",
    expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null,
    metadata: asObject(row.metadata),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
  };
}

async function claimPaymentWebhookEvent({
  provider,
  eventId,
  eventType = "",
  livemode = false,
  payloadHash = "",
}) {
  const normalizedProvider = String(provider ?? "").trim().toLowerCase();
  const normalizedEventId = String(eventId ?? "").trim();
  if (!normalizedProvider || !normalizedEventId) {
    return { claimed: true, tracked: false };
  }

  const result = await query(
    `
      INSERT INTO payment_webhook_events (
        provider,
        event_id,
        event_type,
        livemode,
        payload_hash,
        status,
        attempts,
        received_at,
        processed_at,
        last_error
      ) VALUES ($1, $2, $3, $4, $5, 'processing', 1, NOW(), NULL, '')
      ON CONFLICT (provider, event_id) DO UPDATE SET
        event_type = EXCLUDED.event_type,
        livemode = EXCLUDED.livemode,
        payload_hash = EXCLUDED.payload_hash,
        status = 'processing',
        attempts = payment_webhook_events.attempts + 1,
        received_at = NOW(),
        processed_at = NULL,
        last_error = ''
      WHERE payment_webhook_events.status = 'failed'
         OR (
           payment_webhook_events.status = 'processing'
           AND payment_webhook_events.received_at < NOW() - INTERVAL '10 minutes'
         )
      RETURNING provider, event_id, attempts
    `,
    [
      normalizedProvider,
      normalizedEventId,
      String(eventType ?? "").trim().slice(0, 180),
      livemode === true,
      String(payloadHash ?? "").trim().slice(0, 128),
    ],
  );

  return {
    claimed: result.rowCount > 0,
    tracked: true,
    attempts: Number(result.rows[0]?.attempts) || 0,
  };
}

async function finishPaymentWebhookEvent({ provider, eventId, error = "" }) {
  const normalizedProvider = String(provider ?? "").trim().toLowerCase();
  const normalizedEventId = String(eventId ?? "").trim();
  if (!normalizedProvider || !normalizedEventId) {
    return;
  }
  const lastError = String(error ?? "").trim().slice(0, 1000);
  await query(
    `
      UPDATE payment_webhook_events
      SET
        status = $3,
        processed_at = CASE WHEN $3 = 'processed' THEN NOW() ELSE NULL END,
        last_error = $4
      WHERE provider = $1 AND event_id = $2
    `,
    [
      normalizedProvider,
      normalizedEventId,
      lastError ? "failed" : "processed",
      lastError,
    ],
  );
}

async function confirmSellerOnboarding(input = {}) {
  const { session, account } = await findAccountForOnboarding(input);
  const companyId = String(input.companyId ?? "").trim();
  const entitlement = await getSellerCompanyEntitlement(account.id);
  if (!entitlement.canSubmitFreeFirst) {
    const error = new Error(
      "This account already has a company. Switch allows one company per account.",
    );
    error.statusCode = 409;
    error.code = "SELLER_ONE_COMPANY_LIMIT";
    throw error;
  }
  const selectedPlan = resolveFirstCompanyFreePlan();
  const paymentGateway = selectedPlan.free
    ? "free"
    : String(input.paymentGateway ?? "").trim();
  const paymentReference = selectedPlan.free
    ? (String(input.paymentReference ?? "").trim() || `FREE-FIRST-${Date.now()}`)
    : String(input.paymentReference ?? "").trim();
  const planName = selectedPlan.planName;
  const billingCycle = selectedPlan.billingCycle;
  const amount = selectedPlan.amount;
  const currencyCode = selectedPlan.currencyCode;
  const gatewayKey = paymentGateway.toLowerCase();

  if (!selectedPlan.free) {
  const liveGatewayOk = gatewayKey === "paymongo";
  const refUpper = paymentReference.toUpperCase();
  const blockedRef =
    refUpper.startsWith("PROTO-")
    || refUpper.startsWith("MANUAL-")
    || refUpper.startsWith("TESTMODE-")
    || refUpper.startsWith("FREE-");
  if (!liveGatewayOk || blockedRef) {
    const error = new Error(
      "Seller activation requires a completed PayMongo checkout. Finish payment before Super Admin review.",
    );
    error.statusCode = 409;
    error.code = "PAYMONGO_REQUIRED";
    throw error;
  }
  if (input.paymentVerified !== true) {
    const intent = paymentReference
      ? await findSellerCheckoutIntentByPaymentReference(paymentReference)
      : null;
    const metadata = asObject(intent?.metadata);
    const webhookVerified =
      intent
      && String(intent.accountId || "").trim() === String(account.id).trim()
      && (
        String(intent.status || "").trim().toLowerCase() === "active"
        || Boolean(String(metadata.paymentPaidAt || "").trim())
        || String(metadata.paymongoEventType || "").trim() === "checkout_session.payment.paid"
      );
    if (!webhookVerified) {
      const error = new Error(
        "Seller activation requires a verified PayMongo webhook before pending review.",
      );
      error.statusCode = 409;
      error.code = "PAYMONGO_WEBHOOK_REQUIRED";
      throw error;
    }
  }
  }

  const company = companyId
    ? await query(
        `
          SELECT id FROM companies
          WHERE id = $1
            AND type = 'seller'
            AND source_account_id = $2
          LIMIT 1
        `,
        [companyId, account.id],
      ).then((result) => result.rows[0]?.id || null)
    : await findSellerCompanyByAccount(account.id).then((row) => row?.id || null);

  if (!company) {
    throw new Error("Seller onboarding record not found. Start onboarding first.");
  }

  if (selectedPlan.free) {
    const reviewCompany = await findCompanyById(company);
    const reviewProfile = asObject(reviewCompany?.profileData);
    const kyc = evaluateSellerKyc({
      sellerKind: reviewProfile.sellerKind || reviewCompany?.sellerKind,
      documents: reviewProfile.businessDocuments,
      payoutBank: reviewProfile.payoutBank,
    });
    if (!kyc.complete) {
      const error = new Error(
        `Finish seller requirements before review: ${kyc.missing.join(", ")}.`,
      );
      error.statusCode = 400;
      error.code = "SELLER_KYC_INCOMPLETE";
      error.missing = kyc.missing;
      throw error;
    }
  }

  // Always submit to Super Admin In Review after confirm.
  // Never auto-activate from email/mobile verification (Google Instant Sign-In
  // buyers are email-verified and were skipping In Review).
  const shouldActivate = false;
  const companyStatus = "pending_review";
  const subscriptionStatus = "pending_review";
  const verificationStatus = "pending_review";
  const confirmProfilePatch = {
    paymentConfirmedAt: new Date().toISOString(),
    paymentGateway: selectedPlan.free ? "free" : "paymongo",
    paymentReference,
    planName,
    onboardingStage: "pending_review",
    submittedForReviewAt: new Date().toISOString(),
  };

  await withTransaction(async (client) => {
    await client.query(
      `
        UPDATE companies
        SET
          status = $2::company_status,
          subscription_status = $3::subscription_status,
          verification_status = $4,
          profile_data = profile_data || $5::jsonb,
          updated_at = NOW()
        WHERE id = $1
      `,
      [
        company,
        companyStatus,
        subscriptionStatus,
        verificationStatus,
        JSON.stringify(confirmProfilePatch),
      ],
    );

    await client.query(
      `
        UPDATE company_memberships
        SET
          membership_status = $2::account_status,
          metadata = metadata || $3::jsonb,
          updated_at = NOW()
        WHERE company_id = $1
          AND account_id = $4
          AND membership_role = 'owner'
      `,
      [
        company,
        shouldActivate ? "active" : "pending",
        JSON.stringify({
          onboardingStage: shouldActivate ? "active" : "pending_review",
        }),
        account.id,
      ],
    );

    const subscriptionUpdate = await client.query(
      `
        UPDATE seller_subscriptions
        SET
          plan_name = $2,
          status = $3::subscription_status,
          billing_cycle = $4,
          payment_gateway = $5,
          payment_reference = $6,
          amount = $7,
          currency_code = $8,
          started_at = COALESCE(started_at, NOW()),
          expires_at = CASE
            WHEN $10::boolean THEN COALESCE(expires_at, $11::timestamptz)
            ELSE expires_at
          END,
          approved_at = CASE WHEN $3::text = 'active' THEN COALESCE(approved_at, NOW()) ELSE approved_at END,
          metadata = metadata || $9::jsonb,
          updated_at = NOW()
        WHERE company_id = $1
        RETURNING id
      `,
      [
        company,
        planName,
        subscriptionStatus,
        billingCycle,
        paymentGateway,
        paymentReference,
        amount,
        currencyCode,
        JSON.stringify({
          paymentConfirmedAt: new Date().toISOString(),
          slotBilling: selectedPlan.free ? "none" : "monthly",
          extraCompanySlot: !selectedPlan.free,
        }),
        !selectedPlan.free,
        selectedPlan.free ? null : nextMonthlySlotExpiry(),
      ],
    );

    if (!subscriptionUpdate.rows[0]?.id) {
      await client.query(
        `
          INSERT INTO seller_subscriptions (
            company_id,
            plan_name,
            status,
            billing_cycle,
            payment_gateway,
            payment_reference,
            amount,
            currency_code,
            started_at,
            expires_at,
            approved_at,
            metadata,
            created_at,
            updated_at
          ) VALUES (
            $1,
            $2,
            $3::subscription_status,
            $4,
            $5,
            $6,
            $7,
            $8,
            NOW(),
            $10::timestamptz,
            CASE WHEN $3::text = 'active' THEN NOW() ELSE NULL END,
            $9::jsonb,
            NOW(),
            NOW()
          )
        `,
        [
          company,
          planName,
          subscriptionStatus,
          billingCycle,
          paymentGateway,
          paymentReference,
          amount,
          currencyCode,
          JSON.stringify({
            paymentConfirmedAt: new Date().toISOString(),
            slotBilling: selectedPlan.free ? "none" : "monthly",
            extraCompanySlot: !selectedPlan.free,
          }),
          selectedPlan.free ? null : nextMonthlySlotExpiry(),
        ],
      );
    }

    if (shouldActivate) {
      await grantSellerAdminAccess(client, {
        account,
        companyId: company,
        planName,
        grantedReason: "seller_subscription_activated",
      });
    }
  });

  return {
    account: session.account,
    company: await findCompanyById(company),
    onboardingStatus: subscriptionStatus,
    active: shouldActivate,
    session: await resolveUnifiedSession({
      accountId: account.id,
      activeMode: shouldActivate ? "seller_admin" : "buyer",
      companyId: company,
    }),
  };
}

async function grantSellerAdminAccess(client, {
  account,
  companyId,
  planName = "Starter Seller Plan",
  grantedReason = "seller_subscription_activated",
  promoteToAdmin = false,
}) {
  // Never flip a buyer to role=admin. User Data is the buyer store — shoppers
  // who never open a company stay there, and shoppers who do must stay there
  // too. Seller access is seller_admin capability + company membership.
  if (promoteToAdmin) {
    await client.query(
      `
        UPDATE accounts
        SET
          role = CASE WHEN role = 'user' THEN 'admin'::account_role ELSE role END,
          updated_at = NOW()
        WHERE id = $1
      `,
      [account.id],
    );
  } else {
    await client.query(
      `
        UPDATE accounts
        SET updated_at = NOW()
        WHERE id = $1
      `,
      [account.id],
    );
  }

  await setPrimaryCompanyMembership(client, {
    companyId,
    accountId: account.id,
  });

  await client.query(
    `
      INSERT INTO account_capabilities (
        account_id,
        capability,
        granted_reason,
        metadata,
        granted_at,
        updated_at
      ) VALUES (
        $1,
        'seller_admin',
        $2,
        $3::jsonb,
        NOW(),
        NOW()
      )
      ON CONFLICT (account_id, capability) DO UPDATE SET
        metadata = EXCLUDED.metadata,
        granted_reason = EXCLUDED.granted_reason,
        updated_at = NOW()
    `,
    [
      account.id,
      grantedReason,
      JSON.stringify({
        companyId,
        activatedAt: new Date().toISOString(),
      }),
    ],
  );

  const companyRow = await client.query(
    `
      SELECT name, business_type, logo_url, profile_data
      FROM companies
      WHERE id = $1
      LIMIT 1
    `,
    [companyId],
  );
  const companyMeta = companyRow.rows[0] || {};
  const profileExtra = asObject(companyMeta.profile_data);

  await client.query(
    `
      INSERT INTO seller_profiles (
        account_id, admin_id, store_name, store_type,
        plan_name, plan_status, first_name, middle_name, last_name, suffix,
        profile_data, created_at, updated_at
      ) VALUES (
        $1, $1, $2, $3,
        $4, 'active', $5, '', $6, '',
        $7::jsonb, NOW(), NOW()
      )
      ON CONFLICT (account_id) DO UPDATE SET
        store_name = EXCLUDED.store_name,
        store_type = EXCLUDED.store_type,
        plan_name = EXCLUDED.plan_name,
        plan_status = 'active',
        profile_data = seller_profiles.profile_data || EXCLUDED.profile_data,
        updated_at = NOW()
    `,
    [
      account.id,
      String(companyMeta.name || "Seller company").trim() || "Seller company",
      String(companyMeta.business_type || "").trim(),
      planName,
      account.firstName || account.first_name || "",
      account.lastName || account.last_name || "",
      JSON.stringify({
        companyName: companyMeta.name || "",
        storeName: companyMeta.name || "",
        businessType: companyMeta.business_type || "",
        logoUrl: companyMeta.logo_url || "",
        onboardingSource: "buyer_upgrade",
        sellerKind: profileExtra.sellerKind || "",
        paymentCard: profileExtra.paymentCard || null,
        ...(profileExtra.sellerPinHash
          ? { sellerPinHash: profileExtra.sellerPinHash }
          : {}),
        ...(profileExtra.businessLogoSkipped === true
          ? { businessLogoSkipped: true }
          : {}),
        ...(Array.isArray(profileExtra.businessDocuments)
          ? { businessDocuments: profileExtra.businessDocuments }
          : {}),
      }),
    ],
  );
}

async function listPendingReviewCompanies() {
  if (!(await isSellerOnboardingReady())) {
    return [];
  }

  const result = await query(
    `
      SELECT
        c.id,
        c.status::text AS status,
        c.name,
        c.legal_name,
        c.public_name,
        c.email,
        c.country_code,
        c.mobile_number,
        c.logo_url,
        c.business_type,
        c.subscription_status::text AS subscription_status,
        c.verification_status,
        c.profile_data,
        c.source_account_id,
        c.created_at,
        c.updated_at,
        a.email AS account_email,
        a.profile_image_url,
        COALESCE(up.first_name, '') AS first_name,
        COALESCE(up.last_name, '') AS last_name,
        a.email_verified,
        a.mobile_verified,
        gi.google_picture,
        ss.plan_name,
        ss.amount,
        ss.currency_code,
        ss.payment_reference,
        ss.payment_gateway
      FROM companies c
      LEFT JOIN accounts a ON a.id = c.source_account_id
      LEFT JOIN user_profiles up ON up.account_id = a.id
      LEFT JOIN LATERAL (
        SELECT NULLIF(BTRIM(COALESCE(profile_data->>'picture', '')), '') AS google_picture
        FROM auth_identities
        WHERE account_id = a.id AND provider = 'google'
        ORDER BY updated_at DESC NULLS LAST
        LIMIT 1
      ) gi ON TRUE
      LEFT JOIN LATERAL (
        SELECT plan_name, amount, currency_code, payment_reference, payment_gateway
        FROM seller_subscriptions
        WHERE company_id = c.id
        ORDER BY created_at DESC
        LIMIT 1
      ) ss ON TRUE
      WHERE c.type = 'seller'
        AND c.status = 'pending_review'
        AND COALESCE(NULLIF(c.profile_data->>'paymentConfirmedAt', ''), '') <> ''
        AND (
          lower(COALESCE(c.profile_data->>'paymentGateway', ss.payment_gateway::text, '')) IN ('free', 'paymongo')
          OR COALESCE(ss.amount, 0) <= 0
        )
      ORDER BY c.updated_at DESC, c.created_at DESC
    `,
  );

  return result.rows.map((row) => {
    const profileData = asObject(row.profile_data);
    const companyName = String(row.name || row.public_name || "Seller company").trim();
    return {
      id: row.source_account_id || row.id,
      adminId: row.source_account_id || row.id,
      companyId: row.id,
      companyCode: "",
      companyName,
      storeName: companyName,
      businessName: companyName,
      email: row.account_email || row.email || "",
      countryCode: row.country_code || "+63",
      mobileNumber: row.mobile_number || "",
      logoUrl: row.logo_url || profileData.logoUrl || profileData.businessLogoUrl || "",
      companyPictureUrl:
        profileData.companyPictureUrl
        || profileData.companyProfileImageUrl
        || row.logo_url
        || "",
      companyProfileImageUrl: profileData.companyProfileImageUrl || profileData.companyPictureUrl || "",
      companyBackgroundUrl:
        profileData.companyBackgroundUrl
        || profileData.backgroundUrl
        || profileData.coverImageUrl
        || profileData.companyPictureUrl
        || row.logo_url
        || "",
      profileImageUrl: String(row.profile_image_url || row.google_picture || "").trim(),
      avatarUrl: String(row.profile_image_url || row.google_picture || "").trim(),
      storeType: row.business_type || "",
      businessType: row.business_type || "",
      status: "pending_review",
      accountStatus: "pending_review",
      accountState: "pending-review",
      planName: row.plan_name || profileData.planName || "Starter Seller Plan",
      planStatus: row.subscription_status || "pending_review",
      verificationStatus: row.verification_status || "pending_review",
      emailVerified: Boolean(row.email_verified),
      mobileVerified: Boolean(row.mobile_verified),
      displayName: [row.first_name, row.last_name].filter(Boolean).join(" ").trim() || companyName,
      firstName: row.first_name || "",
      lastName: row.last_name || "",
      testMode: isTestModeCompany(profileData),
      profileData,
      paymentReference: row.payment_reference || "",
      planAmount: Number(row.amount) || 0,
      currencyCode: row.currency_code || "PHP",
      sellerKind: resolveSellerKind(profileData.sellerKind, profileData.businessDocuments),
      sellerKindLabel: sellerKindLabel(resolveSellerKind(profileData.sellerKind, profileData.businessDocuments)),
      payoutBank: sanitizePayoutBankForAdmin(profileData.payoutBank),
      kyc: evaluateSellerKyc({
        sellerKind: resolveSellerKind(profileData.sellerKind, profileData.businessDocuments),
        documents: profileData.businessDocuments,
        payoutBank: profileData.payoutBank,
      }),
      businessDocuments: normalizeBusinessDocuments(profileData.businessDocuments),
      submittedForReviewAt: profileData.submittedForReviewAt || profileData.paymentConfirmedAt || null,
      paymentConfirmedAt: profileData.paymentConfirmedAt || null,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
      isPendingReviewCompany: true,
      counts: {
        products: 0,
        employees: 0,
        orders: 0,
        chatThreads: 0,
        rating: 0,
        reviewCount: 0,
      },
    };
  });
}

async function findCompanyById(companyId) {
  const normalizedId = String(companyId || "").trim();
  if (!normalizedId) {
    return null;
  }
  const result = await query(
    `
      SELECT
        c.id,
        c.type::text AS type,
        c.status::text AS status,
        c.name,
        c.legal_name,
        c.public_name,
        c.email,
        c.country_code,
        c.mobile_number,
        c.logo_url,
        c.business_type,
        c.subscription_status::text AS subscription_status,
        c.verification_status,
        c.profile_data,
        c.source_account_id,
        c.created_at,
        c.updated_at
      FROM companies c
      WHERE c.id = $1
        AND c.type = 'seller'
      LIMIT 1
    `,
    [normalizedId],
  );
  const row = result.rows[0];
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    companyCode: "",
    type: row.type,
    status: row.status,
    name: row.name || "",
    legalName: row.legal_name || "",
    publicName: row.public_name || "",
    email: row.email || "",
    countryCode: row.country_code || "+63",
    mobileNumber: row.mobile_number || "",
    logoUrl: row.logo_url || "",
    businessType: row.business_type || "",
    subscriptionStatus: row.subscription_status || "draft",
    verificationStatus: row.verification_status || "unverified",
    profileData: asObject(row.profile_data),
    testMode: isTestModeCompany(asObject(row.profile_data)),
    sourceAccountId: row.source_account_id,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
  };
}

async function accountOwnsSellerCompany(accountId, companyId) {
  const normalizedAccountId = String(accountId || "").trim();
  const normalizedCompanyId = String(companyId || "").trim();
  if (!normalizedAccountId || !normalizedCompanyId) {
    return false;
  }
  const result = await query(
    `
      SELECT 1
      FROM company_memberships m
      INNER JOIN companies c ON c.id = m.company_id
      WHERE m.account_id = $1
        AND m.company_id = $2
        AND c.type = 'seller'
        AND m.membership_role IN ('owner', 'seller_admin')
      LIMIT 1
    `,
    [normalizedAccountId, normalizedCompanyId],
  );
  return Boolean(result.rows[0]);
}

async function updateCompanyWorkspaceProfile(companyId, patch = {}) {
  const company = await findCompanyById(companyId);
  if (!company) {
    return null;
  }

  const nextName = String(
    patch.companyName ?? patch.storeName ?? patch.name ?? company.name ?? "",
  ).replace(/\s+/g, " ").trim() || company.name;
  const nextLogoUrl = Object.prototype.hasOwnProperty.call(patch, "companyPictureUrl")
    || Object.prototype.hasOwnProperty.call(patch, "logoUrl")
    || Object.prototype.hasOwnProperty.call(patch, "profileImageUrl")
    ? String(
        patch.companyPictureUrl
          ?? patch.logoUrl
          ?? patch.profileImageUrl
          ?? "",
      ).trim()
    : String(company.logoUrl || "").trim();
  const nextBusinessType = String(
    patch.storeType ?? patch.businessType ?? company.businessType ?? "",
  ).trim();
  const nextProfileData = {
    ...(company.profileData || {}),
    companyId: company.id,
    companyName: nextName,
    storeName: nextName,
    businessName: nextName,
    companyPictureUrl: nextLogoUrl,
    businessLogoUrl: nextLogoUrl,
    logoUrl: nextLogoUrl,
    profileImageUrl: nextLogoUrl,
    companyBackgroundUrl: Object.prototype.hasOwnProperty.call(patch, "companyBackgroundUrl")
      ? String(patch.companyBackgroundUrl ?? "").trim()
      : String(
          company.profileData?.companyBackgroundUrl
            ?? company.profileData?.backgroundUrl
            ?? "",
        ).trim(),
    storeType: nextBusinessType,
    businessType: nextBusinessType,
  };

  await query(
    `
      UPDATE companies
      SET
        name = $2,
        public_name = CASE
          WHEN BTRIM(COALESCE(public_name, '')) = '' THEN $2
          ELSE public_name
        END,
        logo_url = $3,
        business_type = CASE
          WHEN $4 <> '' THEN $4
          ELSE business_type
        END,
        profile_data = COALESCE(profile_data, '{}'::jsonb) || $5::jsonb,
        updated_at = NOW()
      WHERE id = $1
    `,
    [
      company.id,
      nextName,
      nextLogoUrl,
      nextBusinessType,
      JSON.stringify(nextProfileData),
    ],
  );

  return findCompanyById(company.id);
}

function normalizeBusinessDocuments(rawDocuments) {
  const list = Array.isArray(rawDocuments) ? rawDocuments : [];
  return list
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }
      const id = String(entry.id || "").trim();
      const url = String(entry.url || entry.documentUrl || "").trim();
      if (!id || !url) {
        return null;
      }
      return {
        id,
        type: normalizeDocumentType(entry.type) || "other",
        label: String(entry.label || entry.fileName || documentTypeLabel(entry.type)).replace(/\s+/g, " ").trim().slice(0, 160),
        fileName: String(entry.fileName || "").trim().slice(0, 200),
        url,
        uploadedAt: String(entry.uploadedAt || "").trim() || new Date().toISOString(),
        uploadedBy: String(entry.uploadedBy || "").trim(),
        reviewStatus: ["pending", "approved", "rejected"].includes(String(entry.reviewStatus || "").trim().toLowerCase())
          ? String(entry.reviewStatus).trim().toLowerCase()
          : "pending",
        reviewedAt: String(entry.reviewedAt || "").trim(),
        reviewedBy: String(entry.reviewedBy || "").trim(),
        reviewReason: String(entry.reviewReason || "").replace(/\s+/g, " ").trim().slice(0, 500),
      };
    })
    .filter(Boolean);
}

const BUSINESS_DOCUMENT_TYPES = ALLOWED_DOCUMENT_TYPES;

async function addCompanyBusinessDocument({
  companyId,
  accountId,
  type = "business_permit",
  label = "",
  fileName = "",
  url = "",
  uploadedBy = "",
}) {
  if (!(await isSellerOnboardingReady())) {
    const error = new Error("Seller onboarding storage is unavailable.");
    error.statusCode = 503;
    throw error;
  }

  const company = await findCompanyById(companyId);
  if (!company) {
    const error = new Error("Company not found.");
    error.statusCode = 404;
    throw error;
  }

  const ownerId = String(company.sourceAccountId || "").trim();
  const requesterId = String(accountId || "").trim();
  if (ownerId && requesterId && ownerId !== requesterId) {
    const error = new Error("You can only upload documents for your own company.");
    error.statusCode = 403;
    throw error;
  }

  const documentUrl = String(url || "").trim();
  if (!documentUrl) {
    const error = new Error("Document URL is required.");
    error.statusCode = 400;
    throw error;
  }

  const companyKind = resolveSellerKind(
    asObject(company.profileData).sellerKind,
    asObject(company.profileData).businessDocuments,
  );
  const normalizedType = assertSellerKindAllowedDocument(companyKind, type);
  if (!BUSINESS_DOCUMENT_TYPES.has(normalizedType)) {
    const error = new Error("Unsupported business document type.");
    error.statusCode = 400;
    throw error;
  }

  const now = new Date().toISOString();
  const document = {
    id: `bizdoc-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
    type: normalizedType,
    label: String(label || fileName || normalizedType.replace(/_/g, " ")).replace(/\s+/g, " ").trim().slice(0, 160),
    fileName: String(fileName || "").trim().slice(0, 200),
    url: documentUrl,
    uploadedAt: now,
    uploadedBy: String(uploadedBy || requesterId || ownerId || "").trim(),
    reviewStatus: "pending",
    reviewedAt: "",
    reviewedBy: "",
    reviewReason: "",
  };

  const nextDocuments = [
    document,
    ...normalizeBusinessDocuments(company.profileData.businessDocuments).filter(
      (entry) => entry.type !== document.type || entry.reviewStatus === "approved",
    ),
  ].slice(0, 20);

  await query(
    `
      UPDATE companies
      SET
        profile_data = COALESCE(profile_data, '{}'::jsonb) || $2::jsonb,
        verification_status = CASE
          WHEN verification_status IN ('verified', 'approved') THEN verification_status
          ELSE 'pending_review'
        END,
        updated_at = NOW()
      WHERE id = $1
    `,
    [
      company.id,
      JSON.stringify({
        businessDocuments: nextDocuments,
        lastBusinessDocumentUploadedAt: now,
      }),
    ],
  );

  return {
    companyId: company.id,
    document,
    documents: nextDocuments,
  };
}

async function reviewCompanyBusinessDocument({
  companyId,
  documentId,
  reviewStatus,
  reviewReason = "",
  reviewedBy = "",
}) {
  if (!(await isSellerOnboardingReady())) {
    const error = new Error("Seller onboarding storage is unavailable.");
    error.statusCode = 503;
    throw error;
  }

  const company = await findCompanyById(companyId);
  if (!company) {
    const error = new Error("Company not found.");
    error.statusCode = 404;
    throw error;
  }

  const normalizedStatus = String(reviewStatus || "").trim().toLowerCase();
  if (!["approved", "rejected"].includes(normalizedStatus)) {
    const error = new Error("Document review status must be approved or rejected.");
    error.statusCode = 400;
    throw error;
  }

  const documents = normalizeBusinessDocuments(company.profileData.businessDocuments);
  const targetId = String(documentId || "").trim();
  const index = documents.findIndex((entry) => entry.id === targetId);
  if (index < 0) {
    const error = new Error("Business document not found.");
    error.statusCode = 404;
    throw error;
  }

  const now = new Date().toISOString();
  documents[index] = {
    ...documents[index],
    reviewStatus: normalizedStatus,
    reviewedAt: now,
    reviewedBy: String(reviewedBy || "").trim(),
    reviewReason: String(reviewReason || "").replace(/\s+/g, " ").trim().slice(0, 500),
  };

  const hasApproved = documents.some((entry) => entry.reviewStatus === "approved");
  const allRejected = documents.length > 0 && documents.every((entry) => entry.reviewStatus === "rejected");

  await query(
    `
      UPDATE companies
      SET
        profile_data = COALESCE(profile_data, '{}'::jsonb) || $2::jsonb,
        verification_status = CASE
          WHEN $3::boolean THEN 'verified'
          WHEN $4::boolean THEN 'rejected'
          ELSE COALESCE(NULLIF(verification_status, ''), 'pending_review')
        END,
        updated_at = NOW()
      WHERE id = $1
    `,
    [
      company.id,
      JSON.stringify({
        businessDocuments: documents,
        lastBusinessDocumentReviewedAt: now,
      }),
      hasApproved,
      allRejected,
    ],
  );

  return {
    companyId: company.id,
    document: documents[index],
    documents,
    sourceAccountId: company.sourceAccountId,
    companyName: company.name || "Seller company",
  };
}

async function activatePendingReviewCompany({
  companyId,
  approvedBy = "super-admin",
  reason = "",
} = {}) {
  if (!(await isSellerOnboardingReady())) {
    const error = new Error("Seller onboarding storage is unavailable.");
    error.statusCode = 503;
    throw error;
  }

  const company = await findCompanyById(companyId);
  if (!company) {
    const error = new Error("Company not found.");
    error.statusCode = 404;
    throw error;
  }
  if (company.status !== "pending_review") {
    const error = new Error("Only pending review companies can be approved from this queue.");
    error.statusCode = 400;
    throw error;
  }

  const accountId = String(company.sourceAccountId || "").trim();
  if (!accountId) {
    const error = new Error("Company has no source account to activate.");
    error.statusCode = 400;
    throw error;
  }

  const accountResult = await query(
    `
      SELECT
        a.id,
        a.email,
        a.country_code,
        a.mobile_number,
        a.email_verified,
        a.mobile_verified,
        COALESCE(up.first_name, '') AS first_name,
        COALESCE(up.last_name, '') AS last_name
      FROM accounts a
      LEFT JOIN user_profiles up ON up.account_id = a.id
      WHERE a.id = $1
      LIMIT 1
    `,
    [accountId],
  );
  const accountRow = accountResult.rows[0];
  if (!accountRow) {
    const error = new Error("Source account for this company was not found.");
    error.statusCode = 404;
    throw error;
  }

  const subscription = await findSellerSubscriptionByCompany(company.id);
  const planName = subscription?.planName || company.profileData.planName || "Starter Seller Plan";
  const approvalReason = String(reason || "Approved by Super Admin").replace(/\s+/g, " ").trim().slice(0, 500);

  await withTransaction(async (client) => {
    await client.query(
      `
        UPDATE companies
        SET
          status = 'active'::company_status,
          subscription_status = 'active'::subscription_status,
          verification_status = 'verified',
          profile_data = COALESCE(profile_data, '{}'::jsonb) || $2::jsonb,
          updated_at = NOW()
        WHERE id = $1
      `,
      [
        company.id,
        JSON.stringify({
          activatedBySuperAdminAt: new Date().toISOString(),
          activatedBySuperAdmin: approvedBy,
          activationReason: approvalReason,
        }),
      ],
    );

    await client.query(
      `
        UPDATE company_memberships
        SET
          membership_status = 'active'::account_status,
          metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb,
          updated_at = NOW()
        WHERE company_id = $1
          AND account_id = $3
      `,
      [
        company.id,
        JSON.stringify({
          onboardingStage: "active",
          activatedBySuperAdmin: approvedBy,
        }),
        accountId,
      ],
    );

    await client.query(
      `
        UPDATE seller_subscriptions
        SET
          status = 'active'::subscription_status,
          approved_at = COALESCE(approved_at, NOW()),
          expires_at = CASE
            WHEN lower(COALESCE(plan_name, '')) IN ('free', 'free plan') THEN expires_at
            ELSE COALESCE(expires_at, NOW() + INTERVAL '1 month')
          END,
          metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb,
          updated_at = NOW()
        WHERE company_id = $1
      `,
      [
        company.id,
        JSON.stringify({
          activatedBySuperAdmin: approvedBy,
          activationReason: approvalReason,
          slotBilling: /^(free)(\s+plan)?$/i.test(String(planName || "").trim())
            ? "none"
            : "monthly",
        }),
      ],
    );

    await grantSellerAdminAccess(client, {
      account: {
        id: accountRow.id,
        firstName: accountRow.first_name || "",
        lastName: accountRow.last_name || "",
      },
      companyId: company.id,
      planName,
      grantedReason: "super_admin_pending_review_activation",
      // Keep role=user so Super Admin User Data still lists this person as a
      // buyer. Companies already includes seller_admin capability.
      promoteToAdmin: false,
    });
  });

  return {
    active: true,
    company: await findCompanyById(company.id),
    accountId,
    companyName: company.name || "Seller company",
    reason: approvalReason,
  };
}

async function rejectPendingReviewCompany({
  companyId,
  rejectedBy = "super-admin",
  reason = "",
} = {}) {
  if (!(await isSellerOnboardingReady())) {
    const error = new Error("Seller onboarding storage is unavailable.");
    error.statusCode = 503;
    throw error;
  }

  const company = await findCompanyById(companyId);
  if (!company) {
    const error = new Error("Company not found.");
    error.statusCode = 404;
    throw error;
  }
  if (company.status !== "pending_review") {
    const error = new Error("Only pending review companies can be rejected from this queue.");
    error.statusCode = 400;
    throw error;
  }

  const rejectionReason = String(reason || "Rejected by Super Admin").replace(/\s+/g, " ").trim().slice(0, 500);
  if (!rejectionReason) {
    const error = new Error("Rejection reason is required.");
    error.statusCode = 400;
    throw error;
  }

  await withTransaction(async (client) => {
    await client.query(
      `
        UPDATE companies
        SET
          status = 'deactivated'::company_status,
          subscription_status = 'cancelled'::subscription_status,
          verification_status = 'rejected',
          profile_data = COALESCE(profile_data, '{}'::jsonb) || $2::jsonb,
          updated_at = NOW()
        WHERE id = $1
      `,
      [
        company.id,
        JSON.stringify({
          rejectedBySuperAdminAt: new Date().toISOString(),
          rejectedBySuperAdmin: rejectedBy,
          rejectionReason,
        }),
      ],
    );

    await client.query(
      `
        UPDATE company_memberships
        SET
          membership_status = 'deactivated'::account_status,
          metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb,
          updated_at = NOW()
        WHERE company_id = $1
      `,
      [
        company.id,
        JSON.stringify({
          onboardingStage: "rejected",
          rejectionReason,
        }),
      ],
    );

    await client.query(
      `
        UPDATE seller_subscriptions
        SET
          status = 'cancelled'::subscription_status,
          metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb,
          updated_at = NOW()
        WHERE company_id = $1
      `,
      [
        company.id,
        JSON.stringify({
          rejectedBySuperAdmin: rejectedBy,
          rejectionReason,
        }),
      ],
    );
  });

  return {
    active: false,
    company: await findCompanyById(company.id),
    accountId: company.sourceAccountId,
    companyName: company.name || "Seller company",
    reason: rejectionReason,
  };
}

async function getCompanyDocumentsForAdmin(companyIdOrAccountId) {
  const normalized = String(companyIdOrAccountId || "").trim();
  if (!normalized) {
    return null;
  }
  let company = await findCompanyById(normalized);
  if (!company) {
    company = await findSellerCompanyByAccount(normalized);
  }
  if (!company) {
    return null;
  }
  return {
    companyId: company.id,
    companyName: company.name || "Seller company",
    sourceAccountId: company.sourceAccountId || company.source_account_id || "",
    status: company.status,
    verificationStatus: company.verificationStatus,
    documents: normalizeBusinessDocuments(company.profileData?.businessDocuments),
  };
}

async function markAccountVerifiedForSellerOnboarding(input = {}) {
  const { session, account } = await findAccountForOnboarding(input);
  const channel = String(input.channel || "email").trim().toLowerCase() === "mobile"
    ? "mobile"
    : "email";
  const prototype = input.prototype === true || String(input.prototype || "").trim() === "1";

  if (!prototype) {
    const { consumeVerificationToken, normalizeVerificationTarget } = require("./postgresAuth");
    const target = channel === "mobile"
      ? normalizeVerificationTarget(
        "mobile",
        `${account.countryCode || "+63"}${account.mobileNumber || ""}`,
      )
      : normalizeVerificationTarget("email", account.email);
    await consumeVerificationToken({
      purpose: String(input.purpose || "registration").trim().toLowerCase() || "registration",
      channel,
      target,
      verificationToken: input.verificationToken,
    });
  }

  if (channel === "mobile") {
    await query(
      `
        UPDATE accounts
        SET mobile_verified = TRUE, updated_at = NOW()
        WHERE id = $1
      `,
      [account.id],
    );
  } else {
    await query(
      `
        UPDATE accounts
        SET email_verified = TRUE, updated_at = NOW()
        WHERE id = $1
      `,
      [account.id],
    );
  }

  return {
    account: {
      ...account,
      emailVerified: channel === "email" ? true : account.emailVerified,
      mobileVerified: channel === "mobile" ? true : account.mobileVerified,
    },
    session: await resolveUnifiedSession({ accountId: account.id }),
    channel,
    prototype,
  };
}

const SWITCH_PIN_MAX_ATTEMPTS = 5;
const SWITCH_PIN_LOCK_MS = 5 * 60 * 1000;
const SWITCH_PIN_UNLOCK_MS = 12 * 60 * 60 * 1000;
const switchPinAttempts = new Map();
const switchPinUnlocks = new Map();

function normalizeSwitchPin(value) {
  return String(value ?? "").replace(/\D/g, "");
}

function switchPinAttemptKey(accountId, companyId) {
  return `${String(accountId || "").trim()}:${String(companyId || "").trim()}`;
}

function assertSwitchPinNotLocked(accountId, companyId) {
  const key = switchPinAttemptKey(accountId, companyId);
  const entry = switchPinAttempts.get(key);
  if (!entry?.lockedUntil) return;
  if (entry.lockedUntil <= Date.now()) {
    switchPinAttempts.delete(key);
    return;
  }
  const minutes = Math.max(1, Math.ceil((entry.lockedUntil - Date.now()) / 60000));
  const error = new Error(`Too many Switch PIN attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`);
  error.statusCode = 429;
  throw error;
}

function recordSwitchPinFailure(accountId, companyId) {
  const key = switchPinAttemptKey(accountId, companyId);
  const current = switchPinAttempts.get(key) || { count: 0, lockedUntil: 0 };
  const count = Number(current.count || 0) + 1;
  if (count >= SWITCH_PIN_MAX_ATTEMPTS) {
    switchPinAttempts.set(key, { count, lockedUntil: Date.now() + SWITCH_PIN_LOCK_MS });
    const error = new Error("Too many Switch PIN attempts. Try again in 5 minutes.");
    error.statusCode = 429;
    throw error;
  }
  switchPinAttempts.set(key, { count, lockedUntil: 0 });
  const remaining = SWITCH_PIN_MAX_ATTEMPTS - count;
  const error = new Error(
    remaining === 1
      ? "Incorrect Switch PIN. 1 attempt left."
      : `Incorrect Switch PIN. ${remaining} attempts left.`,
  );
  error.statusCode = 401;
  throw error;
}

function clearSwitchPinFailures(accountId, companyId) {
  switchPinAttempts.delete(switchPinAttemptKey(accountId, companyId));
}

function issueSwitchPinUnlock({ accountId, companyId }) {
  const token = crypto.randomBytes(24).toString("hex");
  switchPinUnlocks.set(token, {
    accountId: String(accountId || "").trim(),
    companyId: String(companyId || "").trim(),
    expiresAt: Date.now() + SWITCH_PIN_UNLOCK_MS,
  });
  return token;
}

function readSwitchPinUnlock(token, { accountId = "", companyId = "" } = {}) {
  const key = String(token || "").trim();
  if (!key) return null;
  const entry = switchPinUnlocks.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    switchPinUnlocks.delete(key);
    return null;
  }
  const expectedAccount = String(accountId || "").trim();
  const expectedCompany = String(companyId || "").trim();
  if (expectedAccount && entry.accountId !== expectedAccount) return null;
  if (expectedCompany && entry.companyId && entry.companyId !== expectedCompany) return null;
  return entry;
}

function revokeSwitchPinUnlocksForCompany(companyId) {
  const normalizedCompanyId = String(companyId || "").trim();
  if (!normalizedCompanyId) return;
  for (const [token, entry] of switchPinUnlocks.entries()) {
    if (String(entry?.companyId || "").trim() === normalizedCompanyId) {
      switchPinUnlocks.delete(token);
    }
  }
}

function clearSwitchPinFailuresForCompany(companyId) {
  const normalizedCompanyId = String(companyId || "").trim();
  if (!normalizedCompanyId) return;
  for (const key of switchPinAttempts.keys()) {
    if (String(key).endsWith(`:${normalizedCompanyId}`)) {
      switchPinAttempts.delete(key);
    }
  }
}

function isPinResetRequired(profileData) {
  return asObject(profileData).pinResetRequired === true;
}

async function findSellerCompanyForSwitchPin({ accountId, companyId }) {
  const normalizedAccountId = String(accountId || "").trim();
  const normalizedCompanyId = String(companyId || "").trim();
  if (!normalizedAccountId && !normalizedCompanyId) {
    const error = new Error("Account ID is required.");
    error.statusCode = 400;
    throw error;
  }

  const result = await query(
    `
      SELECT
        c.id,
        c.name,
        c.profile_data,
        c.source_account_id
      FROM companies c
      WHERE c.type = 'seller'
        AND (
          ($1 <> '' AND c.id::text = $1)
          OR (
            $2 <> ''
            AND (
              c.source_account_id::text = $2
              OR EXISTS (
                SELECT 1
                FROM company_memberships m
                WHERE m.company_id = c.id
                  AND m.account_id::text = $2
              )
            )
          )
        )
        AND (
          $2 = ''
          OR c.source_account_id::text = $2
          OR EXISTS (
            SELECT 1
            FROM company_memberships m
            WHERE m.company_id = c.id
              AND m.account_id::text = $2
          )
        )
      ORDER BY
        CASE WHEN $1 <> '' AND c.id::text = $1 THEN 0 ELSE 1 END,
        c.updated_at DESC,
        c.created_at DESC
      LIMIT 1
    `,
    [normalizedCompanyId, normalizedAccountId],
  );

  const row = result.rows[0];
  if (!row) {
    const error = new Error("Seller company was not found for this account.");
    error.statusCode = 404;
    throw error;
  }

  const profileData = asObject(row.profile_data);
  let sellerPinHash = String(profileData.sellerPinHash || "").trim();
  let pinResetRequired = isPinResetRequired(profileData);
  let pinResetReason = String(profileData.pinResetReason || "").trim();
  let pinResetRequestedAt = String(profileData.pinResetRequestedAt || "").trim();
  if (!sellerPinHash || !pinResetRequired) {
    const profileResult = await query(
      `
        SELECT profile_data
        FROM seller_profiles
        WHERE account_id = $1
        LIMIT 1
      `,
      [normalizedAccountId || row.source_account_id],
    );
    const sellerProfileData = asObject(profileResult.rows[0]?.profile_data);
    if (!sellerPinHash) {
      sellerPinHash = String(sellerProfileData.sellerPinHash || "").trim();
    }
    if (!pinResetRequired && isPinResetRequired(sellerProfileData)) {
      pinResetRequired = true;
      pinResetReason = String(sellerProfileData.pinResetReason || pinResetReason).trim();
      pinResetRequestedAt = String(sellerProfileData.pinResetRequestedAt || pinResetRequestedAt).trim();
    }
  }

  return {
    id: row.id,
    name: row.name || "",
    sourceAccountId: row.source_account_id,
    profileData,
    sellerPinHash,
    pinResetRequired,
    pinResetReason,
    pinResetRequestedAt,
  };
}

async function persistSellerSwitchPinProfile({ companyId, accountId, patch }) {
  const payload = JSON.stringify(asObject(patch));
  await query(
    `
      UPDATE companies
      SET
        profile_data = COALESCE(profile_data, '{}'::jsonb) || $2::jsonb,
        updated_at = NOW()
      WHERE id = $1
    `,
    [companyId, payload],
  );

  if (accountId) {
    await query(
      `
        UPDATE seller_profiles
        SET
          profile_data = COALESCE(profile_data, '{}'::jsonb) || $2::jsonb,
          updated_at = NOW()
        WHERE account_id = $1
      `,
      [accountId, payload],
    );
  }
}

async function persistSellerSwitchPinHash({ companyId, accountId, sellerPinHash }) {
  await persistSellerSwitchPinProfile({
    companyId,
    accountId,
    patch: {
      sellerPinHash,
      pinResetRequired: false,
      pinResetRequestedAt: null,
      pinResetRequestedBy: "",
      pinResetReason: "",
      pinUpdatedAt: new Date().toISOString(),
    },
  });
}

async function saveSellerSwitchPinIfProvided({ accountId, companyId, pin }) {
  const rawPin = normalizeSwitchPin(pin);
  if (!rawPin) {
    return { unlockToken: "" };
  }
  if (!/^\d{6}$/.test(rawPin)) {
    const error = new Error("Switch PIN must be exactly 6 digits.");
    error.statusCode = 400;
    throw error;
  }
  const sellerPinHash = await hashPassword(rawPin);
  await persistSellerSwitchPinHash({ companyId, accountId, sellerPinHash });
  clearSwitchPinFailures(accountId, companyId);
  revokeSwitchPinUnlocksForCompany(companyId);
  return {
    unlockToken: issueSwitchPinUnlock({ accountId, companyId }),
  };
}

async function getSellerSwitchPinStatus({ accountId, companyId }) {
  const company = await findSellerCompanyForSwitchPin({ accountId, companyId });
  const pinResetRequired = company.pinResetRequired === true;
  return {
    hasPin: Boolean(company.sellerPinHash) && !pinResetRequired,
    pinResetRequired,
    pinResetReason: company.pinResetReason || "",
    pinResetRequestedAt: company.pinResetRequestedAt || "",
    companyId: company.id,
    companyName: company.name || "Seller admin",
  };
}

async function setSellerSwitchPin({ accountId, companyId, pin, confirmPin }) {
  const company = await findSellerCompanyForSwitchPin({ accountId, companyId });
  const rawPin = normalizeSwitchPin(pin);
  const rawConfirm = normalizeSwitchPin(confirmPin ?? pin);
  if (!/^\d{6}$/.test(rawPin)) {
    const error = new Error("Switch PIN must be exactly 6 digits.");
    error.statusCode = 400;
    throw error;
  }
  if (rawPin !== rawConfirm) {
    const error = new Error("Switch PIN confirmation does not match.");
    error.statusCode = 400;
    throw error;
  }
  const saved = await saveSellerSwitchPinIfProvided({
    accountId,
    companyId: company.id,
    pin: rawPin,
  });
  return {
    hasPin: true,
    pinResetRequired: false,
    companyId: company.id,
    companyName: company.name || "Seller admin",
    unlockToken: saved.unlockToken,
  };
}

async function verifySellerSwitchPin({ accountId, companyId, pin }) {
  const company = await findSellerCompanyForSwitchPin({ accountId, companyId });
  if (company.pinResetRequired) {
    const error = new Error(
      company.pinResetReason
        ? `Switch PIN reset required: ${company.pinResetReason}`
        : "Switch PIN reset is required. Create a new Switch PIN to continue.",
    );
    error.statusCode = 409;
    throw error;
  }
  if (!company.sellerPinHash) {
    const error = new Error("Create a Switch PIN before opening seller admin.");
    error.statusCode = 409;
    throw error;
  }
  assertSwitchPinNotLocked(accountId, company.id);
  const rawPin = normalizeSwitchPin(pin);
  const valid = /^\d{6}$/.test(rawPin) && await verifyPassword(rawPin, company.sellerPinHash);
  if (!valid) {
    recordSwitchPinFailure(accountId, company.id);
  }
  clearSwitchPinFailures(accountId, company.id);
  return {
    hasPin: true,
    pinResetRequired: false,
    companyId: company.id,
    companyName: company.name || "Seller admin",
    unlockToken: issueSwitchPinUnlock({ accountId, companyId: company.id }),
  };
}

function checkSellerSwitchPinUnlock({ token, accountId, companyId }) {
  const entry = readSwitchPinUnlock(token, { accountId, companyId });
  return {
    unlocked: Boolean(entry),
    companyId: entry?.companyId || "",
  };
}

async function requireSellerSwitchPinReset({
  accountId = "",
  companyId = "",
  reason = "",
  requestedBy = "super-admin",
} = {}) {
  const company = await findSellerCompanyForSwitchPin({ accountId, companyId });
  const now = new Date().toISOString();
  const normalizedReason = String(reason || "Security Switch PIN reset required by Super Admin.")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500) || "Security Switch PIN reset required by Super Admin.";
  const ownerAccountId = String(accountId || company.sourceAccountId || "").trim();

  await persistSellerSwitchPinProfile({
    companyId: company.id,
    accountId: ownerAccountId,
    patch: {
      sellerPinHash: "",
      pinResetRequired: true,
      pinResetRequestedAt: now,
      pinResetRequestedBy: String(requestedBy || "super-admin").trim() || "super-admin",
      pinResetReason: normalizedReason,
      pinUpdatedAt: now,
    },
  });

  revokeSwitchPinUnlocksForCompany(company.id);
  clearSwitchPinFailuresForCompany(company.id);
  if (ownerAccountId) {
    clearSwitchPinFailures(ownerAccountId, company.id);
  }

  return {
    hasPin: false,
    pinResetRequired: true,
    pinResetReason: normalizedReason,
    pinResetRequestedAt: now,
    companyId: company.id,
    companyName: company.name || "Seller admin",
    sourceAccountId: ownerAccountId,
  };
}

function hashSwitchPinForgotToken(token) {
  return crypto.createHash("sha256").update(String(token || "").trim()).digest("hex");
}

function maskEmailAddress(email) {
  const value = String(email || "").trim();
  const at = value.indexOf("@");
  if (at <= 0) {
    return "your Gmail";
  }
  const name = value.slice(0, at);
  const domain = value.slice(at);
  const visible = name.slice(0, Math.min(3, name.length));
  return `${visible}${"•".repeat(Math.max(2, Math.min(4, name.length - visible.length)))}${domain}`;
}

function assertCompanyAccessPassword(plainPassword) {
  const password = String(plainPassword ?? "");
  if (password.length < 8) {
    throw Object.assign(new Error("Company password must be at least 8 characters."), { statusCode: 400 });
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw Object.assign(new Error("Company password must include a letter and a number."), { statusCode: 400 });
  }
  return password;
}

async function resolveCompanyPasswordHash({ accountId, rawPassword }) {
  const raw = String(rawPassword || "");
  if (raw) {
    const password = assertCompanyAccessPassword(raw);
    return hashPassword(password);
  }
  const id = String(accountId || "").trim();
  if (!id) {
    return "";
  }
  const result = await query(
    `SELECT password_hash FROM accounts WHERE id = $1 LIMIT 1`,
    [id],
  );
  return String(result.rows[0]?.password_hash || "").trim();
}

async function getAccountPasswordRecord(accountId) {
  const id = String(accountId || "").trim();
  if (!id) {
    return null;
  }
  const result = await query(
    `
      SELECT id, email, password_hash
      FROM accounts
      WHERE id = $1
      LIMIT 1
    `,
    [id],
  );
  return result.rows[0] || null;
}

async function verifyCompanyAccessPassword({ company, accountId, password }) {
  const raw = String(password || "");
  if (!raw) {
    throw Object.assign(new Error("Enter your company password first."), { statusCode: 400 });
  }
  const companyHash = String(company?.profileData?.companyPasswordHash || "").trim();
  if (companyHash && await verifyPassword(raw, companyHash)) {
    return { source: "company" };
  }
  const account = await getAccountPasswordRecord(accountId || company?.sourceAccountId);
  const accountHash = String(account?.password_hash || "").trim();
  if (accountHash && await verifyPassword(raw, accountHash)) {
    return { source: "account", account };
  }
  throw Object.assign(new Error("Incorrect password. Use the password saved with this company."), {
    statusCode: 401,
  });
}

async function persistCompanyAccessPassword({ companyId, accountId, password }) {
  const raw = String(password || "").trim();
  if (!raw) {
    return "";
  }
  const companyPasswordHash = await resolveCompanyPasswordHash({ accountId, rawPassword: raw });
  if (!companyPasswordHash) {
    return "";
  }
  await persistSellerSwitchPinProfile({
    companyId,
    accountId,
    patch: {
      companyPasswordHash,
      companyPasswordUpdatedAt: new Date().toISOString(),
    },
  });
  return companyPasswordHash;
}

async function requestSellerSwitchPinForgotLink({
  accountId,
  companyId,
  resetBaseUrl,
}) {
  const company = await findSellerCompanyForSwitchPin({ accountId, companyId });
  const account = await getAccountPasswordRecord(accountId || company.sourceAccountId);
  const email = normalizeEmail(account?.email || company.profileData?.email || "");
  if (!email) {
    throw Object.assign(new Error("This company has no Gmail on file for a Switch PIN reset."), {
      statusCode: 409,
    });
  }
  const hasPassword = Boolean(
    String(company.profileData?.companyPasswordHash || "").trim()
    || String(account?.password_hash || "").trim(),
  );
  if (!hasPassword) {
    throw Object.assign(
      new Error("This company has no password yet. Add a company password when you create or update the company."),
      { statusCode: 409 },
    );
  }

  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  await persistSellerSwitchPinProfile({
    companyId: company.id,
    accountId: accountId || company.sourceAccountId,
    patch: {
      pinForgotTokenHash: hashSwitchPinForgotToken(token),
      pinForgotExpiresAt: expiresAt,
    },
  });

  const base = String(resetBaseUrl || "").replace(/\/$/, "") || "http://127.0.0.1:8080";
  const resetUrl = `${base}/switch_pin_reset.html?token=${encodeURIComponent(token)}`;
  const { sendSwitchPinResetEmail } = require("./emailService");
  await sendSwitchPinResetEmail({
    email,
    resetUrl,
    companyName: company.name || "your company",
  });

  return {
    companyId: company.id,
    companyName: company.name || "Seller admin",
    emailMasked: maskEmailAddress(email),
    expiresAt,
  };
}

async function findCompanyByPinForgotToken(token) {
  const hash = hashSwitchPinForgotToken(token);
  if (!hash || hash.length < 32) {
    const error = new Error("This Switch PIN reset link is invalid.");
    error.statusCode = 400;
    throw error;
  }
  const result = await query(
    `
      SELECT
        c.id,
        c.name,
        c.email,
        c.profile_data,
        c.source_account_id
      FROM companies c
      WHERE c.profile_data->>'pinForgotTokenHash' = $1
      LIMIT 1
    `,
    [hash],
  );
  const row = result.rows[0];
  if (!row) {
    throw Object.assign(new Error("This Switch PIN reset link is invalid or already used."), {
      statusCode: 404,
    });
  }
  const profileData = asObject(row.profile_data);
  const expiresAt = new Date(profileData.pinForgotExpiresAt || "");
  if (!Number.isFinite(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) {
    throw Object.assign(new Error("This Switch PIN reset link expired. Request a new one."), {
      statusCode: 410,
    });
  }
  return {
    id: row.id,
    name: row.name || "",
    email: row.email || "",
    sourceAccountId: row.source_account_id,
    profileData,
  };
}

async function previewSellerSwitchPinForgotToken(token) {
  const company = await findCompanyByPinForgotToken(token);
  const account = await getAccountPasswordRecord(company.sourceAccountId);
  return {
    valid: true,
    companyId: company.id,
    companyName: company.name || "Seller admin",
    emailMasked: maskEmailAddress(account?.email || company.email),
  };
}

async function verifySellerSwitchPinForgotPassword({ token, password }) {
  const company = await findCompanyByPinForgotToken(token);
  await verifyCompanyAccessPassword({
    company,
    accountId: company.sourceAccountId,
    password,
  });
  const unlockToken = crypto.randomBytes(16).toString("hex");
  await persistSellerSwitchPinProfile({
    companyId: company.id,
    accountId: company.sourceAccountId,
    patch: {
      pinForgotUnlockHash: hashSwitchPinForgotToken(unlockToken),
      pinForgotUnlockExpiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    },
  });
  return {
    unlockToken,
    companyId: company.id,
    companyName: company.name || "Seller admin",
  };
}

async function completeSellerSwitchPinForgotReset({
  token,
  unlockToken,
  password,
  pin,
  confirmPin,
}) {
  const company = await findCompanyByPinForgotToken(token);
  const unlockHash = hashSwitchPinForgotToken(unlockToken);
  const savedUnlock = String(company.profileData?.pinForgotUnlockHash || "").trim();
  const unlockExpires = new Date(company.profileData?.pinForgotUnlockExpiresAt || "");
  if (
    !unlockHash
    || unlockHash !== savedUnlock
    || !Number.isFinite(unlockExpires.getTime())
    || unlockExpires.getTime() < Date.now()
  ) {
    throw Object.assign(new Error("Enter your company password again before resetting the Switch PIN."), {
      statusCode: 401,
    });
  }

  await verifyCompanyAccessPassword({
    company,
    accountId: company.sourceAccountId,
    password,
  });

  const saved = await setSellerSwitchPin({
    accountId: company.sourceAccountId,
    companyId: company.id,
    pin,
    confirmPin,
  });
  if (password) {
    await persistSellerSwitchPinProfile({
      companyId: company.id,
      accountId: company.sourceAccountId,
      patch: {
        companyPasswordHash: await hashPassword(String(password)),
        companyPasswordUpdatedAt: new Date().toISOString(),
      },
    });
  }
  await persistSellerSwitchPinProfile({
    companyId: company.id,
    accountId: company.sourceAccountId,
    patch: {
      pinForgotTokenHash: null,
      pinForgotExpiresAt: null,
      pinForgotUnlockHash: null,
      pinForgotUnlockExpiresAt: null,
    },
  });

  return {
    ...saved,
    companyId: company.id,
    companyName: company.name || "Seller admin",
  };
}

const ENFORCEMENT_COMPANY_STATUSES = new Set([
  "active",
  "restricted",
  "banned",
  "deactivated",
  "pending_review",
]);

function resolveEnforcementMembershipStatus(companyStatus) {
  switch (companyStatus) {
    case "active":
      return "active";
    case "pending_review":
      return "pending";
    case "restricted":
      return "restricted";
    case "banned":
      return "banned";
    case "deactivated":
      return "deactivated";
    default:
      return "suspended";
  }
}

async function syncSellerCompanyEnforcementStatus(accountId, options = {}) {
  if (!(await isSellerOnboardingReady())) {
    return null;
  }

  const normalizedAccountId = String(accountId || "").trim();
  const companyStatus = String(options.companyStatus || "").trim().toLowerCase();
  if (!normalizedAccountId || !ENFORCEMENT_COMPANY_STATUSES.has(companyStatus)) {
    return null;
  }

  const preferredCompanyId = String(options.companyId || "").trim();
  const listedByAccount = await listSellerCompaniesByAccount(normalizedAccountId);
  const accountCompanies = Array.isArray(listedByAccount)
    ? listedByAccount.filter((entry) => entry?.id)
    : [];
  let preferredCompany = null;
  if (preferredCompanyId) {
    preferredCompany = await findCompanyById(preferredCompanyId);
    if (!preferredCompany?.id) {
      preferredCompany = null;
    }
  }

  let targetCompanies = [];
  if (companyStatus === "active") {
    // Unban/unrestrict/activate: clear every stuck banned/restricted company on
    // this account. Do not retarget a preferred draft/pending sibling id that SA
    // may resolve while the real banned company stays blocked.
    const stuck = accountCompanies.filter((entry) => {
      const status = String(entry.status || "").trim().toLowerCase();
      return status === "banned" || status === "restricted";
    });
    if (stuck.length) {
      targetCompanies = stuck;
    } else if (preferredCompany) {
      targetCompanies = [preferredCompany];
    } else {
      targetCompanies = accountCompanies;
    }
  } else if (preferredCompany) {
    targetCompanies = [preferredCompany];
  } else {
    targetCompanies = accountCompanies;
  }

  if (!targetCompanies.length) {
    const fallback = await findSellerCompanyByAccount(normalizedAccountId);
    if (fallback?.id) {
      targetCompanies = [fallback];
    }
  }
  if (!targetCompanies.length) {
    return null;
  }

  const membershipStatus = String(options.membershipStatus || "")
    .trim()
    .toLowerCase() || resolveEnforcementMembershipStatus(companyStatus);
  const shouldUpdateSubscription = Object.prototype.hasOwnProperty.call(options, "subscriptionStatus");
  const subscriptionStatus = String(options.subscriptionStatus || "").trim().toLowerCase();
  const verificationStatus = String(options.verificationStatus || "").trim();
  const reason = String(options.reason || "").replace(/\s+/g, " ").trim().slice(0, 500);
  const description = String(options.description || "").replace(/\s+/g, " ").trim().slice(0, 900);
  // On unban/unrestrict/activate, explicitly null ban keys. jsonb `||` merge
  // otherwise leaves stale banReason behind and the user Companies UI / workspace
  // gate keep treating the company as banned (and a heal path can re-ban it).
  const profilePatch = JSON.stringify({
    lastEnforcementStatus: companyStatus,
    lastEnforcementReason: reason,
    lastEnforcementDescription: description,
    lastEnforcementAt: new Date().toISOString(),
    ...(companyStatus === "banned"
      ? {
          banReason: reason,
          banDescription: description,
          bannedAt: new Date().toISOString(),
        }
      : {
          banReason: null,
          banDescription: null,
          bannedAt: null,
        }),
  });
  const membershipPatch = JSON.stringify({
    lastEnforcementStatus: companyStatus,
    lastEnforcementReason: reason,
    lastEnforcementDescription: description,
  });

  await withTransaction(async (client) => {
    for (const company of targetCompanies) {
      await client.query(
        `
          UPDATE companies
          SET
            status = $2::company_status,
            subscription_status = CASE
              WHEN $3::boolean AND $4::text IN (
                'active', 'pending_review', 'pending_payment', 'expired', 'cancelled', 'past_due', 'draft'
              )
                THEN $4::subscription_status
              ELSE subscription_status
            END,
            verification_status = CASE
              WHEN NULLIF($5, '') IS NOT NULL THEN $5
              ELSE verification_status
            END,
            profile_data = COALESCE(profile_data, '{}'::jsonb) || $6::jsonb,
            updated_at = NOW()
          WHERE id = $1
        `,
        [
          company.id,
          companyStatus,
          shouldUpdateSubscription,
          subscriptionStatus || null,
          verificationStatus,
          profilePatch,
        ],
      );

      // Update every membership on this company — SA admin id can differ from
      // membership.account_id for unified buyer/seller accounts.
      await client.query(
        `
          UPDATE company_memberships
          SET
            membership_status = $2::account_status,
            metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb,
            updated_at = NOW()
          WHERE company_id = $1
        `,
        [
          company.id,
          membershipStatus,
          membershipPatch,
        ],
      );

      if (
        shouldUpdateSubscription &&
        ["active", "pending_review", "expired", "cancelled", "past_due", "pending_payment", "draft"].includes(
          subscriptionStatus,
        )
      ) {
        await client.query(
          `
            UPDATE seller_subscriptions
            SET
              status = $2::subscription_status,
              approved_at = CASE
                WHEN $2::text = 'active' THEN COALESCE(approved_at, NOW())
                ELSE approved_at
              END,
              metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb,
              updated_at = NOW()
            WHERE company_id = $1
          `,
          [
            company.id,
            subscriptionStatus,
            JSON.stringify({
              lastEnforcementStatus: companyStatus,
              lastEnforcementReason: reason,
            }),
          ],
        );
      }
    }
  });

  const primary = targetCompanies[0];
  return {
    ...primary,
    status: companyStatus,
    subscriptionStatus: shouldUpdateSubscription ? subscriptionStatus : primary.subscriptionStatus,
    verificationStatus: verificationStatus || primary.verificationStatus,
    syncedCompanyIds: targetCompanies.map((entry) => entry.id),
  };
}

async function withdrawPendingSellerCompany({
  accountId = "",
  companyId = "",
  reason = "",
} = {}) {
  if (!(await isSellerOnboardingReady())) {
    const error = new Error("Seller onboarding storage is unavailable.");
    error.statusCode = 503;
    throw error;
  }

  const normalizedAccountId = String(accountId || "").trim();
  const normalizedCompanyId = String(companyId || "").trim();
  if (!normalizedAccountId || !normalizedCompanyId) {
    const error = new Error("Account ID and company ID are required.");
    error.statusCode = 400;
    throw error;
  }

  const ownsCompany = await accountOwnsSellerCompany(normalizedAccountId, normalizedCompanyId);
  if (!ownsCompany) {
    const error = new Error("You do not have access to that company.");
    error.statusCode = 403;
    throw error;
  }

  const company = await findCompanyById(normalizedCompanyId);
  if (!company) {
    const error = new Error("Company not found.");
    error.statusCode = 404;
    throw error;
  }

  const status = String(company.status || "").trim().toLowerCase();
  if (!["pending_review", "pending_payment", "draft"].includes(status)) {
    const error = new Error("Only in-review or unfinished companies can be withdrawn.");
    error.statusCode = 400;
    throw error;
  }

  const withdrawReason = String(reason || "Withdrawn by seller")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);

  await withTransaction(async (client) => {
    await client.query(
      `
        UPDATE companies
        SET
          status = 'deactivated'::company_status,
          subscription_status = 'cancelled'::subscription_status,
          verification_status = CASE
            WHEN verification_status = 'pending_review' THEN 'withdrawn'
            ELSE verification_status
          END,
          profile_data = COALESCE(profile_data, '{}'::jsonb) || $2::jsonb,
          updated_at = NOW()
        WHERE id = $1
      `,
      [
        company.id,
        JSON.stringify({
          withdrawnBySellerAt: new Date().toISOString(),
          withdrawnBySeller: true,
          withdrawReason,
        }),
      ],
    );

    await client.query(
      `
        UPDATE company_memberships
        SET
          membership_status = 'deactivated'::account_status,
          is_primary = FALSE,
          metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb,
          updated_at = NOW()
        WHERE company_id = $1
          AND account_id = $3
      `,
      [
        company.id,
        JSON.stringify({
          onboardingStage: "withdrawn",
          withdrawReason,
        }),
        normalizedAccountId,
      ],
    );

    await client.query(
      `
        UPDATE seller_subscriptions
        SET
          status = 'cancelled'::subscription_status,
          metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb,
          updated_at = NOW()
        WHERE company_id = $1
      `,
      [
        company.id,
        JSON.stringify({
          withdrawnBySeller: true,
          withdrawReason,
        }),
      ],
    );
  });

  return {
    companyId: company.id,
    companyName: company.name || "Seller company",
    withdrawn: true,
    reason: withdrawReason,
  };
}

module.exports = {
  isSellerOnboardingReady,
  startSellerOnboarding,
  createSellerCheckoutIntent,
  updateSellerCheckoutIntentGatewayState,
  markExtraCompanySlotPaid,
  findSellerCheckoutIntentByPaymentReference,
  claimPaymentWebhookEvent,
  finishPaymentWebhookEvent,
  confirmSellerOnboarding,
  findSellerCompanyByAccount,
  findCompanyById,
  accountOwnsSellerCompany,
  updateCompanyWorkspaceProfile,
  listSellerCompaniesByAccount,
  getSellerCompanyEntitlement,
  findPaidExtraCompanySlot, 
  listPendingReviewCompanies,
  activatePendingReviewCompany,
  rejectPendingReviewCompany,
  addCompanyBusinessDocument,
  reviewCompanyBusinessDocument,
  getCompanyDocumentsForAdmin,
  normalizeBusinessDocuments,
  markAccountVerifiedForSellerOnboarding,
  syncSellerCompanyEnforcementStatus,
  withdrawPendingSellerCompany,
  getSellerSwitchPinStatus,
  setSellerSwitchPin,
  verifySellerSwitchPin,
  checkSellerSwitchPinUnlock,
  requireSellerSwitchPinReset,
  requestSellerSwitchPinForgotLink,
  previewSellerSwitchPinForgotToken,
  verifySellerSwitchPinForgotPassword,
  completeSellerSwitchPinForgotReset,
  normalizeStoreLocation,
};
