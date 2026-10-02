"use strict";

const {
  getPlatformSettings,
  getPlatformSettingsSync,
  isPlatformSettingEnabled,
  WORKSPACE_SETTINGS_FILE,
} = require("./platformSettings");
const fsPromises = require("fs/promises");

const TEST_MODE_FLAG = "testMode";
const PROFILE_TEST_MODE_KEY = "testMode";
const PROFILE_PURGED_KEY = "purgedByTestModeOff";

/** SQL predicate: company/account profile_data marked as Test Mode. */
const SQL_PROFILE_IS_TEST_MODE = `COALESCE(profile_data->>'testMode', 'false') IN ('true', '1', 'yes')`;

/** SQL predicate: Test Mode company soft-removed after Test Mode was turned off. */
const SQL_PROFILE_IS_PURGED_TEST = `COALESCE(profile_data->>'purgedByTestModeOff', 'false') IN ('true', '1', 'yes')`;

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function isTruthyFlag(value) {
  if (value === true || value === 1) {
    return true;
  }
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

function normalizeClientIp(value) {
  let ip = String(value ?? "").trim();
  if (!ip) {
    return "";
  }
  // Strip IPv6 zone / brackets and IPv4-mapped IPv6.
  ip = ip.replace(/^\[|\]$/g, "");
  if (ip.includes("%")) {
    ip = ip.split("%")[0];
  }
  ip = ip.replace(/^::ffff:/i, "");
  if (ip === "::1") {
    return "127.0.0.1";
  }
  return ip;
}

function getRequestClientIp(request) {
  if (!request || typeof request !== "object") {
    return "";
  }
  const forwardedFor = String(request.headers?.["x-forwarded-for"] ?? "")
    .split(",")[0]
    .trim();
  const raw =
    forwardedFor
    || String(request.headers?.["x-real-ip"] ?? "").trim()
    || String(request.socket?.remoteAddress ?? request.connection?.remoteAddress ?? "").trim();
  return normalizeClientIp(raw);
}

function ipsMatch(left, right) {
  const a = normalizeClientIp(left);
  const b = normalizeClientIp(right);
  if (!a || !b) {
    return false;
  }
  return a === b;
}

function normalizeTestModeAccess(raw) {
  const source = asObject(raw);
  const allowedIps = [...new Set(
    (Array.isArray(source.allowedIps) ? source.allowedIps : [])
      .map((ip) => normalizeClientIp(ip))
      .filter(Boolean),
  )];
  return {
    allowedIps,
    lockedAt: String(source.lockedAt || "").trim() || null,
    lockedBy: String(source.lockedBy || "").trim() || null,
  };
}

async function readWorkspaceSettingsDocument() {
  try {
    const raw = await fsPromises.readFile(WORKSPACE_SETTINGS_FILE, "utf8");
    const decoded = JSON.parse(raw);
    return decoded && typeof decoded === "object" ? decoded : {};
  } catch (_error) {
    return {};
  }
}

async function getTestModeAccess() {
  const doc = await readWorkspaceSettingsDocument();
  return normalizeTestModeAccess(doc.testModeAccess);
}

function buildTestModeAccessLock(ip, { lockedBy = "super-admin" } = {}) {
  const normalizedIp = normalizeClientIp(ip);
  return {
    allowedIps: normalizedIp ? [normalizedIp] : [],
    lockedAt: new Date().toISOString(),
    lockedBy: String(lockedBy || "super-admin").trim() || "super-admin",
  };
}

function isIpAllowedForTestModeCreation(clientIp, accessInput = null) {
  const access = normalizeTestModeAccess(accessInput);
  const ip = normalizeClientIp(clientIp);
  if (!ip || !access.allowedIps.length) {
    return false;
  }
  return access.allowedIps.some((allowed) => ipsMatch(ip, allowed));
}

function buildTestModeRegistrationBlockedPayload(access = null) {
  const normalized = normalizeTestModeAccess(access);
  return {
    message:
      "Account creation is paused while Test Mode is on (maintenance). Only the Super Admin IP that enabled Test Mode can create accounts for testing.",
    code: "TEST_MODE_REGISTRATION_LOCKED",
    setting: TEST_MODE_FLAG,
    maintenance: true,
    allowedIpCount: normalized.allowedIps.length,
  };
}

function buildTestModeExplorerBlockedPayload() {
  return {
    message:
      "Switch is in Test Mode maintenance. Only the Super Admin sandbox IP can explore right now. Please try again later.",
    code: "TEST_MODE_MAINTENANCE",
    setting: TEST_MODE_FLAG,
    maintenance: true,
  };
}

/**
 * While Test Mode is on, only the locked Super Admin IP may explore / create.
 * Everyone else gets a maintenance-style break (UI + APIs).
 */
async function isTestModeExplorerAllowed(requestOrIp) {
  if (!(await isTestModeEnabled())) {
    return true;
  }
  const clientIp =
    typeof requestOrIp === "string"
      ? normalizeClientIp(requestOrIp)
      : getRequestClientIp(requestOrIp);
  const access = await getTestModeAccess();
  // If lock is empty (legacy toggle), treat as locked-down for everyone until SA re-toggles.
  if (!access.allowedIps.length) {
    return false;
  }
  return isIpAllowedForTestModeCreation(clientIp, access);
}

/**
 * While Test Mode is on, only the Super Admin IP that locked the sandbox
 * may create accounts (Google Instant Sign-In, email signup, seller upgrade start).
 * Existing account login remains available for everyone.
 */
async function assertTestModeAccountCreationAllowed(requestOrIp) {
  if (!(await isTestModeEnabled())) {
    return { allowed: true, access: null, clientIp: "" };
  }
  const clientIp =
    typeof requestOrIp === "string"
      ? normalizeClientIp(requestOrIp)
      : getRequestClientIp(requestOrIp);
  const access = await getTestModeAccess();
  if (isIpAllowedForTestModeCreation(clientIp, access)) {
    return { allowed: true, access, clientIp };
  }
  const error = new Error(buildTestModeRegistrationBlockedPayload(access).message);
  error.statusCode = 403;
  error.code = "TEST_MODE_REGISTRATION_LOCKED";
  error.payload = buildTestModeRegistrationBlockedPayload(access);
  throw error;
}

async function assertTestModeExplorerAllowed(requestOrIp) {
  if (await isTestModeExplorerAllowed(requestOrIp)) {
    return { allowed: true };
  }
  const error = new Error(buildTestModeExplorerBlockedPayload().message);
  error.statusCode = 503;
  error.code = "TEST_MODE_MAINTENANCE";
  error.payload = buildTestModeExplorerBlockedPayload();
  throw error;
}

async function isTestModeEnabled(_settings = null) {
  return false;
}

function isTestModeEnabledSync(_settings = null) {
  return false;
}

function buildTestModeProfilePatch(extra = {}) {
  return {
    [PROFILE_TEST_MODE_KEY]: true,
    testModeMarkedAt: new Date().toISOString(),
    ...asObject(extra),
  };
}

function readCompanyProfileData(companyOrProfile) {
  if (!companyOrProfile) {
    return {};
  }
  if (companyOrProfile.profileData || companyOrProfile.profile_data) {
    return asObject(companyOrProfile.profileData || companyOrProfile.profile_data);
  }
  if (
    Object.prototype.hasOwnProperty.call(companyOrProfile, PROFILE_TEST_MODE_KEY)
    || Object.prototype.hasOwnProperty.call(companyOrProfile, "testMode")
  ) {
    return asObject(companyOrProfile);
  }
  return asObject(companyOrProfile);
}

function isTestModeCompany(companyOrProfile) {
  const profile = readCompanyProfileData(companyOrProfile);
  return (
    isTruthyFlag(profile[PROFILE_TEST_MODE_KEY])
    || isTruthyFlag(companyOrProfile?.testMode)
  );
}

function isPurgedTestModeCompany(companyOrProfile) {
  const profile = readCompanyProfileData(companyOrProfile);
  return isTestModeCompany(profile) && isTruthyFlag(profile[PROFILE_PURGED_KEY]);
}

function shouldHideCompanyAfterTestModeOff(companyOrProfile) {
  return isPurgedTestModeCompany(companyOrProfile);
}

/**
 * Super Admin company browser worlds must not mix:
 * - Test Mode ON  → only Test Mode companies (sandbox)
 * - Test Mode OFF → only live companies (exclude test + purged)
 */
function companyVisibleInSuperAdminWorkspace(companyOrProfile, _options = {}) {
  return !isPurgedTestModeCompany(companyOrProfile);
}

/**
 * Seller's own workspace: live companies always usable; test companies only
 * while Test Mode is on. Purged test companies stay hidden.
 */
function companyVisibleToSellerSession(companyOrProfile, _options = {}) {
  return !isPurgedTestModeCompany(companyOrProfile);
}

/**
 * Public marketplace / buyer catalog: Test Mode companies are never public.
 * Only Super Admin (and test-seller sessions while Test Mode is on) see them.
 */
function companyVisibleInPublicMarketplace(companyOrProfile) {
  return !isTestModeCompany(companyOrProfile) && !isPurgedTestModeCompany(companyOrProfile);
}

function filterCompaniesForSuperAdmin(companies, { testModeOn } = {}) {
  return (Array.isArray(companies) ? companies : []).filter((entry) =>
    companyVisibleInSuperAdminWorkspace(entry, { testModeOn }),
  );
}

function filterCompaniesForSellerSession(companies, { testModeOn } = {}) {
  return (Array.isArray(companies) ? companies : []).filter((entry) =>
    companyVisibleToSellerSession(entry, { testModeOn }),
  );
}

/** Same profile_data.testMode flag used on buyer/user accounts. */
const isTestModeAccount = isTestModeCompany;
const isPurgedTestModeAccount = isPurgedTestModeCompany;
const accountVisibleInSuperAdminWorkspace = companyVisibleInSuperAdminWorkspace;

function isBuyerLikeAccount(account) {
  const role = String(account?.role ?? "").trim().toLowerCase();
  const source = String(account?.source ?? "").trim().toLowerCase();
  if (role === "admin" || role === "employee" || role === "seller") {
    return false;
  }
  return (
    role === "user"
    || role === "buyer"
    || role === "customer"
    || source === "app"
  );
}

/**
 * Super Admin User Data:
 * - Live buyers (created while Test Mode was OFF) always stay visible.
 * - Test Mode buyers only appear while Test Mode is ON.
 * - Purged test buyers stay hidden.
 * Companies stay on the exclusive dual-world filter; User Data must not hide live users.
 * Employees / seller admins are left alone (separate pages).
 */
function accountVisibleInUserData(accountOrProfile, _options = {}) {
  return !isPurgedTestModeAccount(accountOrProfile);
}

function filterAccountsForSuperAdmin(accounts, { testModeOn } = {}) {
  return (Array.isArray(accounts) ? accounts : []).filter((entry) => {
    if (!isBuyerLikeAccount(entry)) {
      return true;
    }
    return accountVisibleInUserData(entry, { testModeOn });
  });
}

function buildLiveDataProtectedError(action = "modify") {
  const error = new Error(
    `Live user/company data cannot be ${action}. Turn on Test Mode and delete only Test Mode sandbox data.`,
  );
  error.statusCode = 403;
  error.code = "LIVE_DATA_PROTECTED";
  return error;
}

function buildTestModeRequiredForDeleteError(action = "delete") {
  const error = new Error(
    `Company/user data can only be ${action} while Test Mode is on, and only for Test Mode sandbox accounts. Live accounts created by users are protected.`,
  );
  error.statusCode = 403;
  error.code = "TEST_MODE_REQUIRED_FOR_DELETE";
  return error;
}

function buildTestDataRequiredError(action = "delete") {
  const error = new Error(
    `Only Test Mode sandbox data can be ${action}. Live accounts created by users are protected.`,
  );
  error.statusCode = 403;
  error.code = "TEST_DATA_REQUIRED";
  return error;
}

/**
 * Super Admin may clear/delete company or user workspace data only while
 * Test Mode is on, and only for entities marked as Test Mode.
 * Live accounts created when Test Mode was off are never deletable this way.
 */
function assertCanDeleteOrClearInTestMode(companyOrProfile, { testModeOn, action = "delete" } = {}) {
  if (!testModeOn) {
    throw buildTestModeRequiredForDeleteError(action);
  }
  if (!isTestModeCompany(companyOrProfile) || isPurgedTestModeCompany(companyOrProfile)) {
    throw buildLiveDataProtectedError(action);
  }
}

function buildTestModeApiBlockedPayload(action = "API credentials") {
  return {
    message: `${action} are unavailable while Test Mode is on. Turn off Test Mode in Super Admin Settings to restore live APIs and restrictions.`,
    code: "TEST_MODE_NO_API",
    setting: TEST_MODE_FLAG,
  };
}

function buildTextCheckoutSession({ checkoutIntent, requestOrigin = "" } = {}) {
  const intentId = String(checkoutIntent?.id || "").trim();
  const companyId = String(checkoutIntent?.companyId || "").trim();
  const origin = String(requestOrigin || "").replace(/\/$/, "");
  const path = `/unified_account.html?checkout=test-mode&companyId=${encodeURIComponent(companyId)}&intentId=${encodeURIComponent(intentId)}`;
  return {
    provider: "test_mode_text",
    checkoutUrl: origin ? `${origin}${path}` : path,
    externalId: intentId ? `testmode_${intentId}` : `testmode_${Date.now()}`,
    paymentMethodTypes: ["text"],
    livemode: false,
    testMode: true,
    message: "Test Mode: payment is text-only. No live payment API is used.",
  };
}

async function loadCompanyTestModeByIds(companyIds, { query } = {}) {
  const ids = [...new Set(
    (Array.isArray(companyIds) ? companyIds : [])
      .map((id) => String(id || "").trim())
      .filter(Boolean),
  )];
  const map = new Map();
  if (!ids.length || typeof query !== "function") {
    return map;
  }
  const result = await query(
    `
      SELECT id, profile_data
      FROM companies
      WHERE id = ANY($1::text[])
        AND type = 'seller'
    `,
    [ids],
  );
  for (const row of result.rows || []) {
    const id = String(row.id || "").trim();
    if (!id) {
      continue;
    }
    map.set(id, {
      testMode: isTestModeCompany(asObject(row.profile_data)),
      purged: isPurgedTestModeCompany(asObject(row.profile_data)),
      profileData: asObject(row.profile_data),
    });
  }
  return map;
}

/**
 * Soft-remove every buyer account created under Test Mode so User Data
 * (live world) never shows them after Test Mode is turned off.
 */
async function purgeTestModeUserAccounts({ query, withTransaction } = {}) {
  if (typeof query !== "function" || typeof withTransaction !== "function") {
    return {
      purgedAccounts: 0,
      accountIds: [],
      purgedAt: new Date().toISOString(),
    };
  }

  const purgedAt = new Date().toISOString();
  const listed = await query(
    `
      SELECT a.id
      FROM accounts a
      INNER JOIN user_profiles up ON up.account_id = a.id
      WHERE a.role = 'user'
        AND ${SQL_PROFILE_IS_TEST_MODE.replace(/profile_data/g, "up.profile_data")}
        AND NOT (${SQL_PROFILE_IS_PURGED_TEST.replace(/profile_data/g, "up.profile_data")})
    `,
  );
  const accountIds = (listed.rows || [])
    .map((row) => String(row.id || "").trim())
    .filter(Boolean);

  if (!accountIds.length) {
    return { purgedAccounts: 0, accountIds: [], purgedAt };
  }

  await withTransaction(async (client) => {
    await client.query(
      `
        UPDATE accounts
        SET
          status = 'deactivated'::account_status,
          updated_at = NOW()
        WHERE id = ANY($1::text[])
          AND role = 'user'
      `,
      [accountIds],
    );

    await client.query(
      `
        UPDATE user_profiles
        SET
          profile_data = COALESCE(profile_data, '{}'::jsonb) || $2::jsonb,
          updated_at = NOW()
        WHERE account_id = ANY($1::text[])
      `,
      [
        accountIds,
        JSON.stringify({
          [PROFILE_PURGED_KEY]: true,
          purgedByTestModeOffAt: purgedAt,
          testModeNote: "Removed when Super Admin turned Test Mode off.",
        }),
      ],
    );
  });

  return {
    purgedAccounts: accountIds.length,
    accountIds,
    purgedAt,
  };
}

/**
 * Soft-remove every company created under Test Mode so they no longer exist
 * as usable seller workspaces once Test Mode is turned off.
 */
async function purgeTestModeCompanies({ query, withTransaction } = {}) {
  if (typeof query !== "function" || typeof withTransaction !== "function") {
    return {
      purgedCompanies: 0,
      companyIds: [],
      purgedAt: new Date().toISOString(),
    };
  }

  const purgedAt = new Date().toISOString();
  const listed = await query(
    `
      SELECT id
      FROM companies
      WHERE ${SQL_PROFILE_IS_TEST_MODE}
        AND NOT (${SQL_PROFILE_IS_PURGED_TEST})
    `,
  );
  const companyIds = (listed.rows || [])
    .map((row) => String(row.id || "").trim())
    .filter(Boolean);

  if (!companyIds.length) {
    return { purgedCompanies: 0, companyIds: [], purgedAt };
  }

  await withTransaction(async (client) => {
    await client.query(
      `
        UPDATE companies
        SET
          status = 'deactivated'::company_status,
          subscription_status = 'cancelled'::subscription_status,
          profile_data = COALESCE(profile_data, '{}'::jsonb) || $2::jsonb,
          updated_at = NOW()
        WHERE id = ANY($1::text[])
      `,
      [
        companyIds,
        JSON.stringify({
          [PROFILE_PURGED_KEY]: true,
          purgedByTestModeOffAt: purgedAt,
          testModeNote: "Removed when Super Admin turned Test Mode off.",
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
        WHERE company_id = ANY($1::text[])
      `,
      [
        companyIds,
        JSON.stringify({
          onboardingStage: "purged_test_mode",
          purgedByTestModeOffAt: purgedAt,
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
        WHERE company_id = ANY($1::text[])
      `,
      [
        companyIds,
        JSON.stringify({
          purgedByTestModeOffAt: purgedAt,
        }),
      ],
    );

    await client.query(
      `
        UPDATE seller_checkout_intents
        SET
          status = 'cancelled'::subscription_status,
          metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb,
          updated_at = NOW()
        WHERE company_id = ANY($1::text[])
          AND status IN ('pending_payment'::subscription_status, 'draft'::subscription_status)
      `,
      [
        companyIds,
        JSON.stringify({
          purgedByTestModeOffAt: purgedAt,
        }),
      ],
    );
  });

  return {
    purgedCompanies: companyIds.length,
    companyIds,
    purgedAt,
  };
}

/**
 * Undo a previous Test Mode-off purge. Turning Test Mode off now only hides
 * sandbox companies; this restores any that were already soft-deactivated.
 */
async function restorePurgedTestModeCompanies({ query, withTransaction } = {}) {
  if (typeof query !== "function" || typeof withTransaction !== "function") {
    return {
      restoredCompanies: 0,
      companyIds: [],
      restoredAt: new Date().toISOString(),
    };
  }

  const restoredAt = new Date().toISOString();
  const listed = await query(
    `
      SELECT id, profile_data
      FROM companies
      WHERE ${SQL_PROFILE_IS_TEST_MODE}
        AND ${SQL_PROFILE_IS_PURGED_TEST}
    `,
  );
  const rows = listed.rows || [];
  const companyIds = rows
    .map((row) => String(row.id || "").trim())
    .filter(Boolean);

  if (!companyIds.length) {
    return { restoredCompanies: 0, companyIds: [], restoredAt };
  }

  await withTransaction(async (client) => {
    await client.query(
      `
        UPDATE companies
        SET
          status = CASE
            WHEN COALESCE(profile_data->>'onboardingStage', '') = 'active'
              THEN 'active'::company_status
            WHEN COALESCE(profile_data->>'onboardingStage', '') = 'draft'
              THEN 'draft'::company_status
            ELSE 'pending_review'::company_status
          END,
          subscription_status = CASE
            WHEN COALESCE(profile_data->>'onboardingStage', '') = 'active'
              THEN 'active'::subscription_status
            WHEN COALESCE(profile_data->>'onboardingStage', '') = 'draft'
              THEN 'pending_payment'::subscription_status
            ELSE 'pending_review'::subscription_status
          END,
          verification_status = CASE
            WHEN COALESCE(profile_data->>'onboardingStage', '') = 'active'
              THEN 'verified'
            ELSE 'pending_review'
          END,
          profile_data = (
            (COALESCE(profile_data, '{}'::jsonb)
              - 'purgedByTestModeOff'
              - 'purgedByTestModeOffAt'
              - 'testModeNote')
            || jsonb_build_object('restoredAfterTestModeToggleAt', $2::text)
          ),
          updated_at = NOW()
        WHERE id = ANY($1::text[])
      `,
      [companyIds, restoredAt],
    );

    await client.query(
      `
        UPDATE company_memberships m
        SET
          membership_status = CASE
            WHEN COALESCE(c.profile_data->>'onboardingStage', '') = 'active'
              THEN 'active'::account_status
            ELSE 'pending'::account_status
          END,
          metadata = (
            (COALESCE(m.metadata, '{}'::jsonb) - 'purgedByTestModeOffAt')
            || jsonb_build_object(
              'onboardingStage',
              COALESCE(NULLIF(c.profile_data->>'onboardingStage', ''), 'pending_review')
            )
          ),
          updated_at = NOW()
        FROM companies c
        WHERE m.company_id = c.id
          AND m.company_id = ANY($1::text[])
      `,
      [companyIds],
    );

    await client.query(
      `
        UPDATE seller_subscriptions s
        SET
          status = CASE
            WHEN COALESCE(c.profile_data->>'onboardingStage', '') = 'active'
              THEN 'active'::subscription_status
            WHEN COALESCE(c.profile_data->>'onboardingStage', '') = 'draft'
              THEN 'pending_payment'::subscription_status
            ELSE 'pending_review'::subscription_status
          END,
          metadata = (
            (COALESCE(s.metadata, '{}'::jsonb) - 'purgedByTestModeOffAt')
            || jsonb_build_object('restoredAfterTestModeToggleAt', $2::text)
          ),
          updated_at = NOW()
        FROM companies c
        WHERE s.company_id = c.id
          AND s.company_id = ANY($1::text[])
      `,
      [companyIds, restoredAt],
    );
  });

  return {
    restoredCompanies: companyIds.length,
    companyIds,
    restoredAt,
  };
}

/**
 * Hard-delete a Test Mode buyer account. Refuses live accounts.
 */
async function hardDeleteTestModeAccount(accountId, { query, withTransaction } = {}) {
  const normalizedId = String(accountId || "").trim();
  if (!normalizedId) {
    const error = new Error("Account ID is required.");
    error.statusCode = 400;
    throw error;
  }
  if (typeof query !== "function" || typeof withTransaction !== "function") {
    const error = new Error("Database is unavailable.");
    error.statusCode = 503;
    throw error;
  }

  const found = await query(
    `
      SELECT a.id, a.email, a.role, a.status, up.profile_data
      FROM accounts a
      LEFT JOIN user_profiles up ON up.account_id = a.id
      WHERE a.id = $1
      LIMIT 1
    `,
    [normalizedId],
  );
  const row = found.rows?.[0];
  if (!row) {
    const error = new Error("Account not found.");
    error.statusCode = 404;
    throw error;
  }
  if (String(row.role || "").trim().toLowerCase() !== "user") {
    const error = new Error("Only buyer accounts can be deleted from User Data.");
    error.statusCode = 400;
    throw error;
  }
  if (!isTestModeAccount(asObject(row.profile_data))) {
    throw buildLiveDataProtectedError("deleted");
  }

  await withTransaction(async (client) => {
    // Cascades cover profiles / identities; delete account row last.
    await client.query(`DELETE FROM accounts WHERE id = $1 AND role = 'user'`, [normalizedId]);
  });

  return {
    accountId: normalizedId,
    email: String(row.email || "").trim(),
    deletedAt: new Date().toISOString(),
  };
}

/**
 * Hard-delete a Test Mode company and related seller workspace rows.
 * Refuses live companies.
 */
async function hardDeleteTestModeCompany(companyId, { query, withTransaction } = {}) {
  const normalizedId = String(companyId || "").trim();
  if (!normalizedId) {
    const error = new Error("Company ID is required.");
    error.statusCode = 400;
    throw error;
  }
  if (typeof query !== "function" || typeof withTransaction !== "function") {
    const error = new Error("Database is unavailable.");
    error.statusCode = 503;
    throw error;
  }

  const found = await query(
    `
      SELECT id, source_account_id, profile_data, name
      FROM companies
      WHERE id = $1 AND type = 'seller'
      LIMIT 1
    `,
    [normalizedId],
  );
  const row = found.rows?.[0];
  if (!row) {
    const error = new Error("Company not found.");
    error.statusCode = 404;
    throw error;
  }
  if (!isTestModeCompany(asObject(row.profile_data))) {
    throw buildLiveDataProtectedError("deleted");
  }

  const sourceAccountId = String(row.source_account_id || "").trim();

  await withTransaction(async (client) => {
    await client.query(`DELETE FROM seller_checkout_intents WHERE company_id = $1`, [normalizedId]);
    await client.query(`DELETE FROM seller_subscriptions WHERE company_id = $1`, [normalizedId]);
    await client.query(`DELETE FROM company_memberships WHERE company_id = $1`, [normalizedId]);
    await client.query(`DELETE FROM companies WHERE id = $1`, [normalizedId]);
  });

  return {
    companyId: normalizedId,
    sourceAccountId,
    companyName: String(row.name || "").trim(),
    deletedAt: new Date().toISOString(),
  };
}

/** SQL fragment: hide Test Mode companies from public product catalog. */
function sqlExcludeTestModeCompaniesFromProducts(alias = "products") {
  const table = String(alias || "products").replace(/[^\w.]/g, "") || "products";
  return `
    NOT EXISTS (
      SELECT 1
      FROM companies c_tm
      WHERE c_tm.type = 'seller'
        AND (
          c_tm.id = ${table}.company_id
          OR (
            ( ${table}.company_id IS NULL OR BTRIM(COALESCE(${table}.company_id, '')) = '' )
            AND c_tm.source_account_id = ${table}.admin_id
          )
        )
        AND COALESCE(c_tm.profile_data->>'testMode', 'false') IN ('true', '1', 'yes')
    )
  `;
}

module.exports = {
  TEST_MODE_FLAG,
  PROFILE_TEST_MODE_KEY,
  PROFILE_PURGED_KEY,
  SQL_PROFILE_IS_TEST_MODE,
  SQL_PROFILE_IS_PURGED_TEST,
  isTestModeEnabled,
  isTestModeEnabledSync,
  buildTestModeProfilePatch,
  isTestModeCompany,
  isTestModeAccount,
  isPurgedTestModeCompany,
  isPurgedTestModeAccount,
  shouldHideCompanyAfterTestModeOff,
  companyVisibleInSuperAdminWorkspace,
  accountVisibleInSuperAdminWorkspace,
  accountVisibleInUserData,
  companyVisibleToSellerSession,
  companyVisibleInPublicMarketplace,
  isBuyerLikeAccount,
  filterCompaniesForSuperAdmin,
  filterCompaniesForSellerSession,
  filterAccountsForSuperAdmin,
  assertCanDeleteOrClearInTestMode,
  buildLiveDataProtectedError,
  buildTestModeRequiredForDeleteError,
  buildTestDataRequiredError,
  buildTestModeApiBlockedPayload,
  buildTextCheckoutSession,
  loadCompanyTestModeByIds,
  purgeTestModeCompanies,
  restorePurgedTestModeCompanies,
  purgeTestModeUserAccounts,
  hardDeleteTestModeCompany,
  hardDeleteTestModeAccount,
  sqlExcludeTestModeCompaniesFromProducts,
  normalizeClientIp,
  getRequestClientIp,
  ipsMatch,
  normalizeTestModeAccess,
  getTestModeAccess,
  buildTestModeAccessLock,
  isIpAllowedForTestModeCreation,
  buildTestModeRegistrationBlockedPayload,
  buildTestModeExplorerBlockedPayload,
  assertTestModeAccountCreationAllowed,
  assertTestModeExplorerAllowed,
  isTestModeExplorerAllowed,
};
