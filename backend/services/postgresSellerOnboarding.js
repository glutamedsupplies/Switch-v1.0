"use strict";

const { query, withTransaction, isPostgresConfigured, getPool } = require("../db/pool");
const { normalizeEmail, normalizePhone, asObject } = require("../db/accountHelpers");
const { resolveUnifiedSession } = require("./postgresUnifiedAccounts");
const crypto = require("crypto");
const { hashPassword, verifyPassword } = require("../db/password");

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
        id,
        email,
        country_code,
        mobile_number,
        email_verified,
        mobile_verified,
        first_name,
        last_name,
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
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    },
  };
}

async function findSellerCompanyByAccount(accountId) {
  const result = await query(
    `
      SELECT
        c.id,
        c.company_code,
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
        c.created_at,
        c.updated_at
      FROM companies c
      WHERE c.source_account_id = $1
        AND c.type = 'seller'
      ORDER BY c.created_at ASC
      LIMIT 1
    `,
    [accountId],
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    companyCode: row.company_code || "",
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
    profileData: asObject(row.profile_data),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
  };
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
  const planName = String(input.planName ?? "Starter Seller Plan").trim() || "Starter Seller Plan";
  const billingCycle = String(input.billingCycle ?? "monthly").trim() || "monthly";
  const gateway = String(input.paymentGateway ?? "").trim();
  const gatewayReference = String(input.paymentReference ?? "").trim();
  const countryCode = String(input.countryCode ?? account.countryCode ?? "+63").trim() || "+63";
  const mobileNumber = normalizePhone(input.mobileNumber ?? account.mobileNumber);
  const email = normalizeEmail(input.email ?? account.email);
  const amount = Number(input.amount ?? 0) || 0;

  if (!companyName || companyName.length < 2) {
    throw new Error("Company name must be at least 2 characters long.");
  }

  const existingCompany = await findSellerCompanyByAccount(account.id);
  if (existingCompany && ["active", "pending_review"].includes(existingCompany.status)) {
    const pinUnlock = await saveSellerSwitchPinIfProvided({
      accountId: account.id,
      companyId: existingCompany.id,
      pin: input.sellerPin ?? input.pin,
    });
    return {
      account: session.account,
      company: existingCompany,
      onboardingStatus: existingCompany.subscriptionStatus || existingCompany.status,
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

  const onboardingProfileData = {
    onboardingSource: "buyer_upgrade",
    planName,
    billingCycle,
    requestedAt: new Date().toISOString(),
    ...(profileAbout ? { about: profileAbout } : {}),
    ...(sellerPinHash ? { sellerPinHash } : {}),
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

  if (
    existingCompany
    && ["draft", "pending_payment"].includes(existingCompany.status)
  ) {
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
        existingCompany.id,
        companyName,
        businessType,
        email,
        countryCode,
        mobileNumber,
        logoUrl,
        JSON.stringify(onboardingProfileData),
      ],
    );

    return {
      account: session.account,
      company: await findSellerCompanyByAccount(account.id),
      onboardingStatus: existingCompany.subscriptionStatus || existingCompany.status,
      alreadyExists: true,
      pinUnlockToken: sellerPinHash
        ? issueSwitchPinUnlock({ accountId: account.id, companyId: existingCompany.id })
        : "",
    };
  }

  let createdCompany = null;
  await withTransaction(async (client) => {
    const companyInsert = await client.query(
      `
        INSERT INTO companies (
          company_code,
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
          $1,
          'seller',
          'draft',
          $2,
          $2,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          'pending_payment',
          $9,
          $10,
          $11::jsonb,
          NOW(),
          NOW()
        )
        RETURNING id
      `,
      [
        `SELLER-${Date.now()}`,
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
        String(input.currencyCode ?? "PHP").trim() || "PHP",
        JSON.stringify({
          onboardingStage: "started",
          initiatedByAccountId: account.id,
        }),
      ],
    );

    createdCompany = await findSellerCompanyByAccount(account.id);
  });

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
  const { account } = await findAccountForOnboarding(input);
  const existingCompany = await findSellerCompanyByAccount(account.id);
  const companyId = String(input.companyId ?? existingCompany?.id ?? "").trim();
  if (!companyId) {
    throw new Error("Seller onboarding record not found. Start onboarding first.");
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

async function confirmSellerOnboarding(input = {}) {
  const { session, account } = await findAccountForOnboarding(input);
  const companyId = String(input.companyId ?? "").trim();
  const paymentGateway = String(input.paymentGateway ?? "").trim();
  const paymentReference = String(input.paymentReference ?? "").trim();
  const planName = String(input.planName ?? "Starter Seller Plan").trim() || "Starter Seller Plan";
  const billingCycle = String(input.billingCycle ?? "monthly").trim() || "monthly";
  const amount = Number(input.amount ?? 0) || 0;
  const currencyCode = String(input.currencyCode ?? "PHP").trim() || "PHP";

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

  const shouldActivate = account.emailVerified || account.mobileVerified;
  const companyStatus = shouldActivate ? "active" : "pending_review";
  const subscriptionStatus = shouldActivate ? "active" : "pending_review";
  const verificationStatus = shouldActivate ? "verified" : "pending_review";

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
        JSON.stringify({
          paymentConfirmedAt: new Date().toISOString(),
          paymentGateway,
          paymentReference,
        }),
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
        }),
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
          }),
        ],
      );
    }

    if (shouldActivate) {
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
            'seller_subscription_activated',
            $2::jsonb,
            NOW(),
            NOW()
          )
          ON CONFLICT (account_id, capability) DO UPDATE SET
            metadata = EXCLUDED.metadata,
            updated_at = NOW()
        `,
        [
          account.id,
          JSON.stringify({
            companyId: company,
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
        [company],
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
          account.firstName || "",
          account.lastName || "",
          JSON.stringify({
            companyName: companyMeta.name || "",
            storeName: companyMeta.name || "",
            businessType: companyMeta.business_type || "",
            logoUrl: companyMeta.logo_url || "",
            onboardingSource: "buyer_upgrade",
            paymentCard: profileExtra.paymentCard || null,
            ...(profileExtra.sellerPinHash
              ? { sellerPinHash: profileExtra.sellerPinHash }
              : {}),
            ...(profileExtra.businessLogoSkipped === true
              ? { businessLogoSkipped: true }
              : {}),
          }),
        ],
      );
    }
  });

  return {
    account: session.account,
    company: await findSellerCompanyByAccount(account.id),
    onboardingStatus: subscriptionStatus,
    active: shouldActivate,
    session: await resolveUnifiedSession({
      accountId: account.id,
      activeMode: shouldActivate ? "seller_admin" : "buyer",
      companyId: company,
    }),
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
        c.created_at ASC
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
  if (!sellerPinHash) {
    const profileResult = await query(
      `
        SELECT profile_data
        FROM seller_profiles
        WHERE account_id = $1
        LIMIT 1
      `,
      [normalizedAccountId || row.source_account_id],
    );
    sellerPinHash = String(asObject(profileResult.rows[0]?.profile_data).sellerPinHash || "").trim();
  }

  return {
    id: row.id,
    name: row.name || "",
    sourceAccountId: row.source_account_id,
    profileData,
    sellerPinHash,
  };
}

async function persistSellerSwitchPinHash({ companyId, accountId, sellerPinHash }) {
  await query(
    `
      UPDATE companies
      SET
        profile_data = COALESCE(profile_data, '{}'::jsonb) || $2::jsonb,
        updated_at = NOW()
      WHERE id = $1
    `,
    [companyId, JSON.stringify({ sellerPinHash })],
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
      [accountId, JSON.stringify({ sellerPinHash })],
    );
  }
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
  return {
    unlockToken: issueSwitchPinUnlock({ accountId, companyId }),
  };
}

async function getSellerSwitchPinStatus({ accountId, companyId }) {
  const company = await findSellerCompanyForSwitchPin({ accountId, companyId });
  return {
    hasPin: Boolean(company.sellerPinHash),
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
    companyId: company.id,
    companyName: company.name || "Seller admin",
    unlockToken: saved.unlockToken,
  };
}

async function verifySellerSwitchPin({ accountId, companyId, pin }) {
  const company = await findSellerCompanyForSwitchPin({ accountId, companyId });
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

module.exports = {
  isSellerOnboardingReady,
  startSellerOnboarding,
  createSellerCheckoutIntent,
  updateSellerCheckoutIntentGatewayState,
  findSellerCheckoutIntentByPaymentReference,
  confirmSellerOnboarding,
  findSellerCompanyByAccount,
  markAccountVerifiedForSellerOnboarding,
  getSellerSwitchPinStatus,
  setSellerSwitchPin,
  verifySellerSwitchPin,
  checkSellerSwitchPinUnlock,
};
