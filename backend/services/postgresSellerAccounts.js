"use strict";

const crypto = require("crypto");
const { query, withTransaction, isPostgresConfigured, getPool } = require("../db/pool");
const { hashPassword, verifyPassword } = require("../db/password");
const {
  normalizeEmail,
  normalizePhone,
  toIso,
  coerceAccountStatus,
  stripInternalFields,
  asObject,
} = require("../db/accountHelpers");
const {
  consumeVerificationToken,
  findAccountIdByGoogleSubject,
  upsertGoogleIdentity,
  verifyGoogleCredential,
  normalizeVerificationTarget,
} = require("./postgresAuth");

const SELLER_SELECT = `
  SELECT
    a.id,
    a.account_code,
    a.role,
    a.email,
    a.password_hash,
    a.country_code,
    a.mobile_number,
    a.status::text AS status,
    a.profile_image_url,
    a.email_verified,
    a.mobile_verified,
    a.last_login_at,
    a.last_active_at,
    a.password_updated_at,
    a.is_online,
    a.presence_status,
    a.presence_updated_at,
    a.created_at,
    a.updated_at,
    s.admin_id,
    s.store_name,
    s.store_type,
    s.plan_name,
    s.plan_status,
    s.first_name,
    s.middle_name,
    s.last_name,
    s.suffix,
    s.ban_type,
    s.ban_expires_at,
    s.restrict_expires_at,
    s.profile_data
  FROM accounts a
  INNER JOIN seller_profiles s ON s.account_id = a.id
  WHERE a.role = 'admin'
     OR EXISTS (
       SELECT 1
       FROM account_capabilities ac
       WHERE ac.account_id = a.id
         AND ac.capability = 'seller_admin'
     )
`;

function buildSellerAccount(row) {
  if (!row) {
    return null;
  }

  const extra = asObject(row.profile_data);
  const storeName = row.store_name || extra.storeName || extra.companyName || "";
  const storeType = row.store_type || extra.storeType || extra.businessType || "";

  return {
    ...extra,
    id: row.id,
    adminId: row.admin_id || row.id,
    accountCode: row.account_code || row.admin_id || row.id,
    role: "admin",
    source: "web",
    storeName,
    companyName: storeName,
    businessName: storeName,
    storeType,
    storeTypeName: storeType,
    businessType: storeType,
    firstName: row.first_name || "",
    middleName: row.middle_name || "",
    lastName: row.last_name || "",
    suffix: row.suffix || "",
    email: row.email || "",
    countryCode: row.country_code || "+63",
    mobileNumber: row.mobile_number || "",
    password: "",
    emailVerified: Boolean(row.email_verified),
    mobileVerified: Boolean(row.mobile_verified),
    planName: row.plan_name || "Free Plan",
    planStatus: row.plan_status || "active",
    profileImageUrl: row.profile_image_url || "",
    accessPermissions: [],
    accessPermissionGrantedAt: {},
    accessPermissionsConfigured: false,
    status: row.status || extra.status || "active",
    accountStatus: row.status || extra.accountStatus || "active",
    accountState: row.status || extra.accountState || "active",
    banType: row.ban_type || extra.banType || null,
    banExpiresAt: toIso(row.ban_expires_at) || extra.banExpiresAt || null,
    restrictExpiresAt: toIso(row.restrict_expires_at) || extra.restrictExpiresAt || null,
    isOnline: Boolean(row.is_online),
    online: Boolean(row.is_online),
    presenceStatus: row.presence_status || "offline",
    onlineStatus: row.presence_status || "offline",
    presenceUpdatedAt: toIso(row.presence_updated_at),
    lastLoginAt: toIso(row.last_login_at),
    lastActiveAt: toIso(row.last_active_at),
    passwordUpdatedAt: toIso(row.password_updated_at),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    _passwordHash: row.password_hash,
  };
}

function extractSellerProfileData(account) {
  const omit = new Set([
    "id",
    "adminId",
    "accountCode",
    "role",
    "source",
    "storeName",
    "companyName",
    "businessName",
    "storeType",
    "storeTypeName",
    "businessType",
    "firstName",
    "middleName",
    "lastName",
    "suffix",
    "email",
    "countryCode",
    "mobileNumber",
    "password",
    "emailVerified",
    "mobileVerified",
    "planName",
    "planStatus",
    "profileImageUrl",
    "accessPermissions",
    "accessPermissionGrantedAt",
    "accessPermissionsConfigured",
    "status",
    "accountStatus",
    "accountState",
    "banType",
    "banExpiresAt",
    "restrictExpiresAt",
    "isOnline",
    "online",
    "presenceStatus",
    "onlineStatus",
    "presenceUpdatedAt",
    "lastLoginAt",
    "lastActiveAt",
    "passwordUpdatedAt",
    "createdAt",
    "updatedAt",
    "_passwordHash",
  ]);

  const data = {};
  for (const [key, value] of Object.entries(account || {})) {
    if (!omit.has(key) && value !== undefined) {
      data[key] = value;
    }
  }
  // Keep moderation mirrors in profile_data for getAdminAccountRestrictionMessage.
  for (const key of [
    "isBanned",
    "banned",
    "isRestricted",
    "restricted",
    "banReason",
    "lastBanReason",
    "banDescription",
    "banDetails",
    "restrictionReason",
    "restrictReason",
    "restrictionDescription",
    "restrictionLimits",
    "isActive",
    "disabled",
    "paymentCard",
    "paymentCardSkipped",
    "verificationSkipped",
    "verificationChannel",
    "verificationToken",
    "googleProfile",
    "planStartedAt",
    "storeTypeUpdatedAt",
    "businessLogoSkipped",
    "lastLogoutAt",
    "lastOnlineAt",
    "superAdminActionUpdatedAt",
    "superAdminActionUpdatedBy",
  ]) {
    if (account?.[key] !== undefined) {
      data[key] = account[key];
    }
  }
  return data;
}

async function isSellerPostgresReady() {
  if (!isPostgresConfigured()) {
    return false;
  }
  try {
    await getPool();
    return true;
  } catch (_) {
    return false;
  }
}

async function findSellerByEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return null;
  }
  const result = await query(`${SELLER_SELECT} AND lower(a.email) = $1 LIMIT 1`, [
    normalizedEmail,
  ]);
  return buildSellerAccount(result.rows[0]);
}

async function findSellerByAdminId(adminId) {
  const id = String(adminId ?? "").trim();
  if (!id) {
    return null;
  }
  const result = await query(
    `${SELLER_SELECT} AND (s.admin_id = $1 OR a.id = $1) LIMIT 1`,
    [id],
  );
  return buildSellerAccount(result.rows[0]);
}

async function assertSellerUnique({ email, countryCode, mobileNumber, excludeId = null }) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedMobile = normalizePhone(mobileNumber);
  const normalizedCountry = String(countryCode ?? "+63").trim() || "+63";

  const emailResult = await query(
    `
      SELECT id FROM accounts
      WHERE role = 'admin' AND lower(email) = $1
        AND ($2::text IS NULL OR id <> $2)
      LIMIT 1
    `,
    [normalizedEmail, excludeId],
  );
  if (emailResult.rowCount > 0) {
    throw new Error("Admin email is already registered.");
  }

  if (normalizedMobile) {
    const mobileResult = await query(
      `
        SELECT id FROM accounts
        WHERE role = 'admin'
          AND country_code = $1
          AND mobile_number = $2
          AND ($3::text IS NULL OR id <> $3)
        LIMIT 1
      `,
      [normalizedCountry, normalizedMobile, excludeId],
    );
    if (mobileResult.rowCount > 0) {
      throw new Error("Contact number is already registered.");
    }
  }
}

async function createSellerAccount(normalizedAdmin) {
  const email = normalizeEmail(normalizedAdmin.email);
  const password = String(normalizedAdmin.password ?? "").trim();
  const storeName = String(
    normalizedAdmin.storeName ?? normalizedAdmin.companyName ?? "",
  ).trim();
  const countryCode = String(normalizedAdmin.countryCode ?? "+63").trim() || "+63";
  const mobileNumber = normalizePhone(normalizedAdmin.mobileNumber);
  const verificationChannel = String(normalizedAdmin.verificationChannel ?? "email")
    .trim()
    .toLowerCase() === "mobile"
    ? "mobile"
    : "email";
  const verificationTarget =
    verificationChannel === "mobile"
      ? normalizeVerificationTarget("mobile", `${countryCode}${mobileNumber}`)
      : normalizeVerificationTarget("email", email);
  const googleProfile =
    normalizedAdmin.googleProfile && typeof normalizedAdmin.googleProfile === "object"
      ? normalizedAdmin.googleProfile
      : null;

  if (storeName.length < 2) {
    throw new Error("Company name must be at least 2 characters long.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Please enter a valid admin email address.");
  }
  if (password.length < 6) {
    throw new Error("Admin password must be at least 6 characters long.");
  }

  await consumeVerificationToken({
    purpose: "registration",
    channel: verificationChannel,
    target: verificationTarget,
    verificationToken: normalizedAdmin.verificationToken,
  });

  await assertSellerUnique({ email, countryCode, mobileNumber });

  const id = String(normalizedAdmin.id ?? "").trim() || `admin-${Date.now()}`;
  const adminId = String(normalizedAdmin.adminId ?? id).trim() || id;
  const now = new Date().toISOString();
  const passwordHash = await hashPassword(password);
  const profileData = extractSellerProfileData(normalizedAdmin);
  const emailVerified =
    verificationChannel === "email" || Boolean(normalizedAdmin.emailVerified);
  const mobileVerified =
    verificationChannel === "mobile" || Boolean(normalizedAdmin.mobileVerified);

  await withTransaction(async (client) => {
    await client.query(
      `
        INSERT INTO accounts (
          id, account_code, role, email, password_hash,
          country_code, mobile_number, status, profile_image_url,
          email_verified, mobile_verified, password_updated_at,
          created_at, updated_at
        ) VALUES (
          $1, $2, 'admin', $3, $4,
          $5, $6, $7::account_status, $8,
          $9, $10, $11,
          $12, $13
        )
      `,
      [
        id,
        String(normalizedAdmin.accountCode ?? adminId),
        email,
        passwordHash,
        countryCode,
        mobileNumber,
        coerceAccountStatus(normalizedAdmin.status),
        String(
          normalizedAdmin.profileImageUrl ?? googleProfile?.picture ?? "",
        ).trim(),
        emailVerified,
        mobileVerified,
        toIso(normalizedAdmin.passwordUpdatedAt) || now,
        toIso(normalizedAdmin.createdAt) || now,
        toIso(normalizedAdmin.updatedAt) || now,
      ],
    );

    await client.query(
      `
        INSERT INTO seller_profiles (
          account_id, admin_id, store_name, store_type,
          plan_name, plan_status, first_name, middle_name, last_name, suffix,
          ban_type, ban_expires_at, restrict_expires_at, profile_data,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14::jsonb,
          $15, $16
        )
      `,
      [
        id,
        adminId,
        storeName,
        String(normalizedAdmin.storeType ?? "").trim(),
        String(normalizedAdmin.planName ?? "Free Plan").trim() || "Free Plan",
        String(normalizedAdmin.planStatus ?? "active").trim() || "active",
        String(normalizedAdmin.firstName ?? "").trim(),
        String(normalizedAdmin.middleName ?? "").trim(),
        String(normalizedAdmin.lastName ?? "").trim(),
        String(normalizedAdmin.suffix ?? "").trim(),
        normalizedAdmin.banType || null,
        toIso(normalizedAdmin.banExpiresAt),
        toIso(normalizedAdmin.restrictExpiresAt),
        JSON.stringify(profileData),
        toIso(normalizedAdmin.createdAt) || now,
        toIso(normalizedAdmin.updatedAt) || now,
      ],
    );

    if (googleProfile?.subject) {
      await client.query(
        `
          INSERT INTO auth_identities (
            id, account_id, provider, provider_subject, email, profile_data, created_at, updated_at
          ) VALUES (
            encode(gen_random_bytes(12), 'hex'), $1, 'google', $2, $3, $4::jsonb, NOW(), NOW()
          )
          ON CONFLICT (provider, provider_subject) DO UPDATE SET
            account_id = EXCLUDED.account_id,
            email = EXCLUDED.email,
            profile_data = EXCLUDED.profile_data,
            updated_at = NOW()
        `,
        [
          id,
          googleProfile.subject,
          googleProfile.email || email,
          JSON.stringify({
            firstName: googleProfile.firstName,
            lastName: googleProfile.lastName,
            displayName: googleProfile.displayName,
            picture: googleProfile.picture,
          }),
        ],
      );
    }
  });

  return findSellerByAdminId(adminId);
}

function namesFromGoogleProfile(profile) {
  let firstName = String(profile?.firstName ?? "").trim();
  let lastName = String(profile?.lastName ?? "").trim();
  const displayName = String(profile?.displayName ?? "").trim();

  if ((firstName.length < 2 || lastName.length < 2) && displayName) {
    const parts = displayName.split(/\s+/).filter(Boolean);
    if (firstName.length < 2 && parts.length > 0) {
      firstName = parts[0];
    }
    if (lastName.length < 2 && parts.length > 1) {
      lastName = parts.slice(1).join(" ");
    }
  }

  if (firstName.length < 2) {
    const local = String(profile?.email ?? "seller").split("@")[0].trim();
    firstName = local.length >= 2 ? local.slice(0, 32) : "Seller";
  }
  if (lastName.length < 2) {
    lastName = "Account";
  }

  return { firstName, lastName };
}

function storeNameFromGoogleProfile(profile, firstName) {
  const displayName = String(profile?.displayName ?? "").trim();
  if (displayName.length >= 2) {
    return `${displayName.slice(0, 48)} Store`;
  }
  const safeFirst = String(firstName ?? "").trim() || "Seller";
  return `${safeFirst.slice(0, 40)} Store`;
}

async function findAnyAccountRoleByEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return null;
  }
  const result = await query(
    `
      SELECT id, role::text AS role
      FROM accounts
      WHERE lower(email) = $1
      LIMIT 1
    `,
    [normalizedEmail],
  );
  return result.rows[0] || null;
}

async function createSellerAccountFromGoogle(profile) {
  const email = normalizeEmail(profile?.email);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Google account did not provide a valid email address.");
  }
  if (!profile?.subject) {
    throw new Error("Google account is missing a subject identifier.");
  }

  const existingBySubject = await findAccountIdByGoogleSubject(profile.subject);
  if (existingBySubject) {
    const linkedSeller = await findSellerByAdminId(existingBySubject);
    if (linkedSeller) {
      return linkedSeller;
    }
    throw new Error(
      "This Google account is already linked to a non-seller Switch account.",
    );
  }

  const existingByEmail = await findSellerByEmail(email);
  if (existingByEmail) {
    await upsertGoogleIdentity(existingByEmail.id, profile);
    return findSellerByAdminId(existingByEmail.id);
  }

  const conflictingAccount = await findAnyAccountRoleByEmail(email);
  if (conflictingAccount) {
    throw new Error(
      "This Google email is already registered on Switch under a different account type.",
    );
  }

  const { firstName, lastName } = namesFromGoogleProfile(profile);
  const storeName = storeNameFromGoogleProfile(profile, firstName);
  const now = new Date().toISOString();
  const id = `admin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const accountCode = `ADM-${String(Date.now()).slice(-6)}`;
  // Random password — Google is the sign-in method; password can be set later.
  const passwordHash = await hashPassword(crypto.randomBytes(32).toString("hex"));
  const profileImageUrl = String(profile.picture ?? "").trim();

  await withTransaction(async (client) => {
    await client.query(
      `
        INSERT INTO accounts (
          id, account_code, role, email, password_hash,
          country_code, mobile_number, status, profile_image_url,
          email_verified, mobile_verified, password_updated_at,
          created_at, updated_at
        ) VALUES (
          $1, $2, 'admin', $3, $4,
          $5, $6, 'active', $7,
          TRUE, FALSE, $8,
          $8, $8
        )
      `,
      [
        id,
        accountCode,
        email,
        passwordHash,
        "+63",
        "",
        profileImageUrl,
        now,
      ],
    );

    await client.query(
      `
        INSERT INTO seller_profiles (
          account_id, admin_id, store_name, store_type,
          plan_name, plan_status, first_name, middle_name, last_name, suffix,
          ban_type, ban_expires_at, restrict_expires_at, profile_data,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, $8, $9, $10,
          NULL, NULL, NULL, $11::jsonb,
          $12, $13
        )
      `,
      [
        id,
        id,
        storeName,
        "",
        "Free Plan",
        "active",
        firstName,
        "",
        lastName,
        "",
        JSON.stringify({
          registeredVia: "google",
          googleEmail: email,
          companyName: storeName,
        }),
        now,
        now,
      ],
    );

    await client.query(
      `
        INSERT INTO auth_identities (
          id, account_id, provider, provider_subject, email, profile_data, created_at, updated_at
        ) VALUES (
          encode(gen_random_bytes(12), 'hex'), $1, 'google', $2, $3, $4::jsonb, NOW(), NOW()
        )
        ON CONFLICT (provider, provider_subject) DO UPDATE SET
          account_id = EXCLUDED.account_id,
          email = EXCLUDED.email,
          profile_data = EXCLUDED.profile_data,
          updated_at = NOW()
      `,
      [
        id,
        profile.subject,
        email,
        JSON.stringify({
          firstName: profile.firstName,
          lastName: profile.lastName,
          displayName: profile.displayName,
          picture: profile.picture,
        }),
      ],
    );
  });

  return findSellerByAdminId(id);
}

async function loginSellerWithGoogle({
  idToken,
  accessToken,
  createIfMissing = true,
}) {
  const profile = await verifyGoogleCredential({ idToken, accessToken });
  let accountId = await findAccountIdByGoogleSubject(profile.subject);
  let created = false;

  if (accountId) {
    const linkedSeller = await findSellerByAdminId(accountId);
    if (!linkedSeller) {
      accountId = null;
    }
  }

  if (!accountId) {
    const byEmail = await findSellerByEmail(profile.email);
    if (byEmail) {
      accountId = byEmail.id;
      await upsertGoogleIdentity(accountId, profile);
    }
  }

  if (!accountId) {
    if (!createIfMissing) {
      return {
        ok: false,
        code: "not_found",
        message:
          "No seller account is linked to this Google account yet. Please sign up first.",
        profile,
      };
    }

    // One-Tap Register: create seller admin from Google.
    // Mobile / store details can be completed later in settings.
    const createdAccount = await createSellerAccountFromGoogle(profile);
    accountId = createdAccount?.id;
    created = true;
  }

  if (!accountId) {
    return {
      ok: false,
      code: "create_failed",
      message: "Unable to create a seller account from Google.",
      profile,
    };
  }

  const updated = await markSellerLoggedIn(accountId);
  return {
    ok: true,
    account: stripInternalFields(updated),
    profile,
    created,
  };
}

async function markSellerLoggedIn(accountId) {
  const now = new Date().toISOString();
  await query(
    `
      UPDATE accounts
      SET
        last_login_at = $2,
        last_active_at = $2,
        is_online = TRUE,
        presence_status = 'online',
        presence_updated_at = $2,
        updated_at = $2
      WHERE id = $1 AND role = 'admin'
    `,
    [accountId, now],
  );

  await query(
    `
      UPDATE seller_profiles
      SET
        profile_data = profile_data || $2::jsonb,
        updated_at = $3
      WHERE account_id = $1
    `,
    [
      accountId,
      JSON.stringify({
        lastOnlineAt: now,
        lastLoginAt: now,
        loggedIn: true,
        isLoggedIn: true,
        sessionActive: true,
      }),
      now,
    ],
  );

  return findSellerByAdminId(accountId);
}

async function updateSellerPresence(accountId, isOnline, options = {}) {
  const now = new Date().toISOString();
  const presenceEvent = String(options.event ?? "").trim().toLowerCase()
    || (isOnline ? "heartbeat" : "logout");
  const presenceStatus = isOnline ? "online" : "offline";

  await query(
    `
      UPDATE accounts
      SET
        is_online = $2,
        presence_status = $3,
        presence_updated_at = $4,
        last_active_at = CASE WHEN $2 THEN $4 ELSE last_active_at END,
        last_login_at = CASE
          WHEN $2 AND ($5 = 'login' OR last_login_at IS NULL) THEN $4
          ELSE last_login_at
        END,
        updated_at = $4
      WHERE id = $1 AND role = 'admin'
    `,
    [accountId, Boolean(isOnline), presenceStatus, now, presenceEvent],
  );

  const patch = {
    presenceStatus,
    onlineStatus: presenceStatus,
    presenceUpdatedAt: now,
    isOnline: Boolean(isOnline),
    online: Boolean(isOnline),
    loggedIn: Boolean(isOnline),
    isLoggedIn: Boolean(isOnline),
    sessionActive: Boolean(isOnline),
  };
  if (isOnline) {
    patch.lastOnlineAt = now;
    if (presenceEvent === "login") {
      patch.lastLoginAt = now;
    }
  } else if (presenceEvent === "logout") {
    patch.lastLogoutAt = now;
  }

  await query(
    `
      UPDATE seller_profiles
      SET profile_data = profile_data || $2::jsonb, updated_at = $3
      WHERE account_id = $1
    `,
    [accountId, JSON.stringify(patch), now],
  );

  return findSellerByAdminId(accountId);
}

async function loginSeller({ email, password }) {
  const account = await findSellerByEmail(email);
  if (!account) {
    return { ok: false, code: "not_found", message: "Admin email or password is incorrect." };
  }

  const valid = await verifyPassword(password, account._passwordHash);
  if (!valid) {
    return { ok: false, code: "bad_password", message: "Admin email or password is incorrect." };
  }

  const updated = await markSellerLoggedIn(account.id);
  return { ok: true, account: stripInternalFields(updated || account) };
}

async function updateSellerPasswordByEmail(email, plainPassword) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    throw new Error("Seller email is required.");
  }

  const password = String(plainPassword ?? "");
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }
  if (!/[A-Z]/.test(password)) {
    throw new Error("Include at least 1 uppercase letter.");
  }
  if (!/\d/.test(password)) {
    throw new Error("Include at least 1 number.");
  }

  const account = await findSellerByEmail(normalizedEmail);
  if (!account) {
    throw new Error("This email is not registered on Switch.");
  }

  const passwordHash = await hashPassword(password);
  const now = new Date().toISOString();

  await query(
    `
      UPDATE accounts
      SET
        password_hash = $2,
        password_updated_at = $3,
        updated_at = $3
      WHERE id = $1
        AND role = 'admin'
    `,
    [account.id, passwordHash, now],
  );

  return stripInternalFields(await findSellerByAdminId(account.id) || account);
}

async function upsertSellerFromLegacyRecord(legacyAccount, plainPassword = null) {
  if (!legacyAccount || typeof legacyAccount !== "object") {
    return null;
  }

  const email = normalizeEmail(legacyAccount.email);
  if (!email) {
    return null;
  }

  const googleProfile =
    legacyAccount.googleProfile && typeof legacyAccount.googleProfile === "object"
      ? legacyAccount.googleProfile
      : null;
  const googleSubject = String(
    googleProfile?.subject ??
      legacyAccount.googleSubject ??
      legacyAccount.google_sub ??
      "",
  ).trim();
  const authProvider = String(
    legacyAccount.authProvider ?? legacyAccount.loginProvider ?? "",
  )
    .trim()
    .toLowerCase();
  const profileDataSource =
    legacyAccount.profileData && typeof legacyAccount.profileData === "object"
      ? legacyAccount.profileData
      : {};
  const registeredVia = String(
    legacyAccount.registeredVia ?? profileDataSource.registeredVia ?? "",
  )
    .trim()
    .toLowerCase();
  const isGoogleAccount =
    Boolean(googleSubject) ||
    authProvider === "google" ||
    registeredVia === "google";

  const existing = await findSellerByEmail(email);
  const passwordSource = plainPassword ?? legacyAccount.password ?? "";
  const passwordHash = passwordSource
    ? await hashPassword(String(passwordSource))
    : existing?._passwordHash || null;

  // Google Instant Sign-In sellers do not require a local password.
  if (!passwordHash && !isGoogleAccount) {
    throw new Error(`Cannot migrate seller ${email}: missing password.`);
  }

  const id = String(existing?.id ?? legacyAccount.id ?? `admin-${Date.now()}`).trim();
  const adminId = String(
    existing?.adminId ?? legacyAccount.adminId ?? id,
  ).trim() || id;
  const now = new Date().toISOString();
  const storeName = String(
    legacyAccount.storeName ?? legacyAccount.companyName ?? legacyAccount.businessName ?? "Store",
  ).trim() || "Store";
  const profileData = {
    ...extractSellerProfileData(legacyAccount),
    ...(isGoogleAccount
      ? {
          registeredVia: "google",
          googleEmail: email,
        }
      : {}),
  };

  await withTransaction(async (client) => {
    await client.query(
      `
        INSERT INTO accounts (
          id, account_code, role, email, password_hash,
          country_code, mobile_number, status, profile_image_url,
          email_verified, mobile_verified, last_login_at, last_active_at,
          password_updated_at, is_online, presence_status, presence_updated_at,
          created_at, updated_at
        ) VALUES (
          $1, $2, 'admin', $3, $4,
          $5, $6, $7::account_status, $8,
          $9, $10, $11, $12,
          $13, $14, $15, $16,
          $17, $18
        )
        ON CONFLICT (id) DO UPDATE SET
          account_code = EXCLUDED.account_code,
          email = EXCLUDED.email,
          password_hash = COALESCE(EXCLUDED.password_hash, accounts.password_hash),
          country_code = EXCLUDED.country_code,
          mobile_number = EXCLUDED.mobile_number,
          status = EXCLUDED.status,
          profile_image_url = EXCLUDED.profile_image_url,
          email_verified = EXCLUDED.email_verified,
          mobile_verified = EXCLUDED.mobile_verified,
          last_login_at = EXCLUDED.last_login_at,
          last_active_at = EXCLUDED.last_active_at,
          password_updated_at = COALESCE(
            EXCLUDED.password_updated_at,
            accounts.password_updated_at
          ),
          is_online = EXCLUDED.is_online,
          presence_status = EXCLUDED.presence_status,
          presence_updated_at = EXCLUDED.presence_updated_at,
          updated_at = EXCLUDED.updated_at
      `,
      [
        id,
        String(legacyAccount.accountCode ?? adminId),
        email,
        passwordHash,
        String(legacyAccount.countryCode ?? "+63").trim() || "+63",
        normalizePhone(legacyAccount.mobileNumber),
        coerceAccountStatus(legacyAccount.status ?? legacyAccount.accountStatus),
        String(
          legacyAccount.profileImageUrl ?? googleProfile?.picture ?? "",
        ).trim(),
        Boolean(legacyAccount.emailVerified) || isGoogleAccount,
        Boolean(legacyAccount.mobileVerified),
        toIso(legacyAccount.lastLoginAt),
        toIso(legacyAccount.lastActiveAt),
        passwordHash ? toIso(legacyAccount.passwordUpdatedAt) || now : null,
        Boolean(legacyAccount.isOnline),
        String(legacyAccount.presenceStatus ?? "offline"),
        toIso(legacyAccount.presenceUpdatedAt),
        toIso(legacyAccount.createdAt) || now,
        toIso(legacyAccount.updatedAt) || now,
      ],
    );

    await client.query(
      `
        INSERT INTO seller_profiles (
          account_id, admin_id, store_name, store_type,
          plan_name, plan_status, first_name, middle_name, last_name, suffix,
          ban_type, ban_expires_at, restrict_expires_at, profile_data,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14::jsonb,
          $15, $16
        )
        ON CONFLICT (account_id) DO UPDATE SET
          admin_id = EXCLUDED.admin_id,
          store_name = EXCLUDED.store_name,
          store_type = EXCLUDED.store_type,
          plan_name = EXCLUDED.plan_name,
          plan_status = EXCLUDED.plan_status,
          first_name = EXCLUDED.first_name,
          middle_name = EXCLUDED.middle_name,
          last_name = EXCLUDED.last_name,
          suffix = EXCLUDED.suffix,
          ban_type = EXCLUDED.ban_type,
          ban_expires_at = EXCLUDED.ban_expires_at,
          restrict_expires_at = EXCLUDED.restrict_expires_at,
          profile_data = EXCLUDED.profile_data,
          updated_at = EXCLUDED.updated_at
      `,
      [
        id,
        adminId,
        storeName,
        String(legacyAccount.storeType ?? "").trim(),
        String(legacyAccount.planName ?? "Free Plan").trim() || "Free Plan",
        String(legacyAccount.planStatus ?? "active").trim() || "active",
        String(legacyAccount.firstName ?? googleProfile?.firstName ?? "").trim(),
        String(legacyAccount.middleName ?? "").trim(),
        String(legacyAccount.lastName ?? googleProfile?.lastName ?? "").trim(),
        String(legacyAccount.suffix ?? "").trim(),
        legacyAccount.banType || null,
        toIso(legacyAccount.banExpiresAt),
        toIso(legacyAccount.restrictExpiresAt),
        JSON.stringify(profileData),
        toIso(legacyAccount.createdAt) || now,
        toIso(legacyAccount.updatedAt) || now,
      ],
    );

    if (googleSubject) {
      await client.query(
        `
          INSERT INTO auth_identities (
            id, account_id, provider, provider_subject, email, profile_data, created_at, updated_at
          ) VALUES (
            encode(gen_random_bytes(12), 'hex'), $1, 'google', $2, $3, $4::jsonb, NOW(), NOW()
          )
          ON CONFLICT (provider, provider_subject) DO NOTHING
        `,
        [
          id,
          googleSubject,
          email,
          JSON.stringify({
            firstName: googleProfile?.firstName,
            lastName: googleProfile?.lastName,
            displayName: googleProfile?.displayName,
            picture: googleProfile?.picture,
            email,
            subject: googleSubject,
          }),
        ],
      );
    }
  });

  return findSellerByAdminId(adminId);
}

async function checkSellerAvailability({ email, mobileNumber }) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedMobile = normalizePhone(mobileNumber);

  let emailTaken = false;
  let mobileTaken = false;

  if (normalizedEmail) {
    const result = await query(
      `SELECT 1 FROM accounts WHERE role = 'admin' AND lower(email) = $1 AND status <> 'deleted' LIMIT 1`,
      [normalizedEmail],
    );
    emailTaken = result.rowCount > 0;
  }

  if (normalizedMobile) {
    const result = await query(
      `
        SELECT 1 FROM accounts
        WHERE role = 'admin' AND mobile_number = $1
        LIMIT 1
      `,
      [normalizedMobile],
    );
    mobileTaken = result.rowCount > 0;
  }

  return {
    emailTaken,
    emailAvailable: !emailTaken,
    mobileTaken,
    mobileAvailable: !mobileTaken,
  };
}

async function listSellers() {
  const result = await query(`${SELLER_SELECT} ORDER BY a.created_at DESC`);
  return result.rows.map(buildSellerAccount).filter(Boolean);
}

async function deleteSellerAuthIdentities(accountId) {
  const id = String(accountId ?? "").trim();
  if (!id) {
    return;
  }
  await query(`DELETE FROM auth_identities WHERE account_id = $1`, [id]);
}

module.exports = {
  isSellerPostgresReady,
  findSellerByEmail,
  findSellerByAdminId,
  createSellerAccount,
  createSellerAccountFromGoogle,
  loginSeller,
  loginSellerWithGoogle,
  markSellerLoggedIn,
  updateSellerPresence,
  updateSellerPasswordByEmail,
  upsertSellerFromLegacyRecord,
  checkSellerAvailability,
  deleteSellerAuthIdentities,
  listSellers,
  stripInternalFields,
};
