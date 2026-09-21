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

async function grantSellerAdminAccess(client, {
  account,
  companyId,
  planName = "Starter Seller Plan",
  grantedReason = "seller_subscription_activated",
}) {
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
        c.company_code,
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
        a.first_name,
        a.last_name,
        a.email_verified,
        a.mobile_verified,
        ss.plan_name,
        ss.amount,
        ss.currency_code,
        ss.payment_reference
      FROM companies c
      LEFT JOIN accounts a ON a.id = c.source_account_id
      LEFT JOIN LATERAL (
        SELECT plan_name, amount, currency_code, payment_reference
        FROM seller_subscriptions
        WHERE company_id = c.id
        ORDER BY created_at DESC
        LIMIT 1
      ) ss ON TRUE
      WHERE c.type = 'seller'
        AND c.status = 'pending_review'
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
      companyCode: row.company_code || "",
      companyName,
      storeName: companyName,
      businessName: companyName,
      email: row.account_email || row.email || "",
      countryCode: row.country_code || "+63",
      mobileNumber: row.mobile_number || "",
      logoUrl: row.logo_url || "",
      companyPictureUrl: row.logo_url || "",
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
      paymentReference: row.payment_reference || "",
      planAmount: Number(row.amount) || 0,
      currencyCode: row.currency_code || "PHP",
      businessDocuments: normalizeBusinessDocuments(profileData.businessDocuments),
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
        c.company_code,
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
    companyCode: row.company_code || "",
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
    sourceAccountId: row.source_account_id,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
  };
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
        type: String(entry.type || "business_permit").trim().toLowerCase() || "business_permit",
        label: String(entry.label || entry.fileName || "Business document").replace(/\s+/g, " ").trim().slice(0, 160),
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

const BUSINESS_DOCUMENT_TYPES = new Set([
  "business_permit",
  "dti",
  "sec",
  "bir",
  "valid_id",
  "other",
]);

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

  const normalizedType = String(type || "business_permit").trim().toLowerCase();
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
    const error = new Error("Only pending review companies can be activated from this queue.");
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
        id,
        email,
        country_code,
        mobile_number,
        email_verified,
        mobile_verified,
        first_name,
        last_name
      FROM accounts
      WHERE id = $1
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
          metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb,
          updated_at = NOW()
        WHERE company_id = $1
      `,
      [
        company.id,
        JSON.stringify({
          activatedBySuperAdmin: approvedBy,
          activationReason: approvalReason,
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

  const company = await findSellerCompanyByAccount(normalizedAccountId);
  if (!company?.id) {
    return null;
  }

  const membershipStatus = String(options.membershipStatus || "")
    .trim()
    .toLowerCase() || resolveEnforcementMembershipStatus(companyStatus);
  const shouldUpdateSubscription = Object.prototype.hasOwnProperty.call(options, "subscriptionStatus");
  const subscriptionStatus = String(options.subscriptionStatus || "").trim().toLowerCase();
  const verificationStatus = String(options.verificationStatus || "").trim();
  const reason = String(options.reason || "").replace(/\s+/g, " ").trim().slice(0, 500);

  await withTransaction(async (client) => {
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
        JSON.stringify({
          lastEnforcementStatus: companyStatus,
          lastEnforcementReason: reason,
          lastEnforcementAt: new Date().toISOString(),
        }),
      ],
    );

    await client.query(
      `
        UPDATE company_memberships
        SET
          membership_status = $2::account_status,
          metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb,
          updated_at = NOW()
        WHERE company_id = $1
          AND account_id = $4
      `,
      [
        company.id,
        membershipStatus,
        JSON.stringify({
          lastEnforcementStatus: companyStatus,
          lastEnforcementReason: reason,
        }),
        normalizedAccountId,
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
  });

  return {
    ...company,
    status: companyStatus,
    subscriptionStatus: shouldUpdateSubscription ? subscriptionStatus : company.subscriptionStatus,
    verificationStatus: verificationStatus || company.verificationStatus,
  };
}

module.exports = {
  isSellerOnboardingReady,
  startSellerOnboarding,
  createSellerCheckoutIntent,
  updateSellerCheckoutIntentGatewayState,
  findSellerCheckoutIntentByPaymentReference,
  claimPaymentWebhookEvent,
  finishPaymentWebhookEvent,
  confirmSellerOnboarding,
  findSellerCompanyByAccount,
  findCompanyById,
  listPendingReviewCompanies,
  activatePendingReviewCompany,
  rejectPendingReviewCompany,
  addCompanyBusinessDocument,
  reviewCompanyBusinessDocument,
  getCompanyDocumentsForAdmin,
  normalizeBusinessDocuments,
  markAccountVerifiedForSellerOnboarding,
  syncSellerCompanyEnforcementStatus,
  getSellerSwitchPinStatus,
  setSellerSwitchPin,
  verifySellerSwitchPin,
  checkSellerSwitchPinUnlock,
};
