"use strict";

const { query, withTransaction, isPostgresConfigured, getPool } = require("../db/pool");
const { hashPassword, verifyPassword, looksLikeBcryptHash } = require("../db/password");
const {
  consumeVerificationToken,
  findAccountIdByGoogleSubject,
  upsertGoogleIdentity,
  verifyGoogleCredential,
  normalizeVerificationTarget,
} = require("./postgresAuth");
const {
  normalizeEmail,
  normalizePhone,
  toIso,
  coerceAccountStatus,
  stripInternalFields,
  asObject,
} = require("../db/accountHelpers");

function extractUserProfileData(account) {
  const omit = new Set([
    "id",
    "accountCode",
    "employeeId",
    "position",
    "timeIn",
    "timeOut",
    "workHours",
    "firstName",
    "middleName",
    "lastName",
    "suffix",
    "email",
    "address",
    "department",
    "employmentType",
    "dateOfBirth",
    "gender",
    "startDate",
    "supervisor",
    "username",
    "employeeRole",
    "status",
    "countryCode",
    "mobileNumber",
    "password",
    "eDocument",
    "profileImageUrl",
    "gmailBinding",
    "accessPermissions",
    "accessPermissionGrantedAt",
    "accessPermissionsConfigured",
    "role",
    "source",
    "faceVerified",
    "verifiedAt",
    "passwordUpdatedAt",
    "createdAt",
    "updatedAt",
    "adminId",
    "lastLoginAt",
    "lastActiveAt",
    "isOnline",
    "online",
    "presenceStatus",
    "onlineStatus",
    "presenceUpdatedAt",
    "emailVerified",
    "mobileVerified",
    "_passwordHash",
    "verificationToken",
    "verificationChannel",
    "googleProfile",
    "gmailBinding",
  ]);
  const data = {};
  for (const [key, value] of Object.entries(account || {})) {
    if (!omit.has(key) && value !== undefined) {
      data[key] = value;
    }
  }
  return data;
}

function mapCustomerRow(row) {
  if (!row) {
    return null;
  }

  const extra = asObject(row.profile_data);

  return {
    ...extra,
    id: row.id,
    accountCode: row.account_code || "",
    employeeId: "",
    position: "",
    timeIn: "",
    timeOut: "",
    workHours: 0,
    firstName: row.first_name || "",
    middleName: row.middle_name || "",
    lastName: row.last_name || "",
    suffix: row.suffix || "",
    email: row.email || "",
    address: row.address || "",
    department: "",
    employmentType: "Regular",
    dateOfBirth: row.date_of_birth || "",
    gender: row.gender || "",
    startDate: "",
    supervisor: "",
    username: row.username || row.email || "",
    employeeRole: "Employee",
    status: row.status || extra.status || "active",
    accountStatus: row.status || extra.accountStatus || "active",
    accountState: row.status || extra.accountState || "active",
    countryCode: row.country_code || "+63",
    mobileNumber: row.mobile_number || "",
    password: "",
    eDocument: {
      type: "",
      label: "",
      fileName: "",
      fileExtension: "",
      url: "",
      uploadedAt: null,
    },
    profileImageUrl:
      String(row.profile_image_url || "").trim()
      || String(row.google_picture || "").trim()
      || String(asObject(row.google_profile_data).picture || "").trim()
      || "",
    googleProfile: (() => {
      const googleData = asObject(row.google_profile_data);
      if (!Object.keys(googleData).length && !row.google_picture) {
        return extra.googleProfile && typeof extra.googleProfile === "object"
          ? extra.googleProfile
          : null;
      }
      return {
        ...googleData,
        picture:
          String(googleData.picture || row.google_picture || "").trim()
          || undefined,
        email: String(row.google_email || googleData.email || "").trim() || undefined,
        subject: String(row.google_subject || googleData.subject || "").trim() || undefined,
      };
    })(),
    gmailBinding: row.gmail_binding
      ? {
          email: row.gmail_binding,
          provider: "gmail",
          boundAt: null,
        }
      : (extra.gmailBinding || null),
    accessPermissions: [],
    accessPermissionGrantedAt: {},
    accessPermissionsConfigured: false,
    role: "user",
    source: "app",
    faceVerified: Boolean(row.face_verified),
    verifiedAt: toIso(row.verified_at),
    passwordUpdatedAt: toIso(row.password_updated_at),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    adminId: row.admin_id || "admin",
    lastLoginAt: toIso(row.last_login_at),
    lastActiveAt: toIso(row.last_active_at),
    isOnline: Boolean(row.is_online),
    online: Boolean(row.is_online),
    presenceStatus: row.presence_status || "offline",
    onlineStatus: row.presence_status || "offline",
    presenceUpdatedAt: toIso(row.presence_updated_at),
    emailVerified: Boolean(row.email_verified),
    mobileVerified: Boolean(row.mobile_verified),
    hasPassword: Boolean(row.password_hash),
    _passwordHash: row.password_hash,
  };
}

const CUSTOMER_SELECT = `
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
    u.first_name,
    u.middle_name,
    u.last_name,
    u.suffix,
    u.address,
    u.date_of_birth,
    u.gender,
    u.username,
    u.gmail_binding,
    u.face_verified,
    u.verified_at,
    u.admin_id,
    u.profile_data,
    gi.provider_subject AS google_subject,
    gi.email AS google_email,
    gi.profile_data AS google_profile_data,
    NULLIF(BTRIM(COALESCE(gi.profile_data->>'picture', '')), '') AS google_picture
  FROM accounts a
  INNER JOIN user_profiles u ON u.account_id = a.id
  LEFT JOIN LATERAL (
    SELECT provider_subject, email, profile_data
    FROM auth_identities
    WHERE account_id = a.id AND provider = 'google'
    ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
    LIMIT 1
  ) gi ON TRUE
  WHERE a.role = 'user'
`;

function isGoogleHostedProfileImage(url) {
  const value = String(url ?? "").trim().toLowerCase();
  if (!value) {
    return false;
  }
  return (
    value.includes("googleusercontent.com")
    || value.includes("ggpht.com")
    || value.includes("google.com/a/")
  );
}

async function syncGoogleProfileImage(accountId, profile) {
  const id = String(accountId ?? "").trim();
  const picture = String(profile?.picture ?? "").trim();
  if (!id || !picture) {
    return null;
  }

  const current = await findCustomerById(id);
  const currentImage = String(current?.profileImageUrl ?? "").trim();
  // Keep custom uploads. Only fill empty avatars or refresh Google-hosted ones.
  if (currentImage && !isGoogleHostedProfileImage(currentImage)) {
    return current;
  }
  if (currentImage === picture) {
    return current;
  }

  await updateAccountProfileImage(id, picture);
  return findCustomerById(id);
}

async function isCustomerPostgresReady() {
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

async function findCustomerByEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return null;
  }

  const result = await query(`${CUSTOMER_SELECT} AND lower(a.email) = $1 LIMIT 1`, [
    normalizedEmail,
  ]);
  return mapCustomerRow(result.rows[0]);
}

async function findCustomerById(accountId) {
  const id = String(accountId ?? "").trim();
  if (!id) {
    return null;
  }

  const result = await query(`${CUSTOMER_SELECT} AND a.id = $1 LIMIT 1`, [id]);
  return mapCustomerRow(result.rows[0]);
}

function normalizePreferredLanguage(value) {
  const raw = String(value ?? "").trim().toLowerCase();
  const allowed = new Set([
    "en",
    "zh",
    "es",
    "hi",
    "ar",
    "fr",
    "pt",
    "ru",
    "ja",
    "de",
    "ko",
    "vi",
    "id",
    "tl",
    "th",
  ]);
  if (allowed.has(raw)) {
    return raw;
  }
  if (raw.startsWith("zh")) {
    return "zh";
  }
  if (raw.startsWith("tl") || raw.startsWith("fil")) {
    return "tl";
  }
  return "en";
}

async function updateCustomerPreferredLanguage(accountId, preferredLanguage) {
  const id = String(accountId ?? "").trim();
  if (!id) {
    throw Object.assign(new Error("Account ID is required."), { statusCode: 400 });
  }
  const language = normalizePreferredLanguage(preferredLanguage);
  const existing = await findCustomerById(id);
  if (!existing) {
    throw Object.assign(new Error("Account was not found."), { statusCode: 404 });
  }

  // Keep only profile_data extras — rebuild from mapped account extras.
  const omitCore = new Set([
    "id",
    "accountCode",
    "employeeId",
    "position",
    "timeIn",
    "timeOut",
    "workHours",
    "firstName",
    "middleName",
    "lastName",
    "suffix",
    "email",
    "address",
    "department",
    "employmentType",
    "dateOfBirth",
    "gender",
    "startDate",
    "supervisor",
    "username",
    "employeeRole",
    "status",
    "accountStatus",
    "accountState",
    "countryCode",
    "mobileNumber",
    "password",
    "eDocument",
    "profileImageUrl",
    "gmailBinding",
    "accessPermissions",
    "accessPermissionGrantedAt",
    "accessPermissionsConfigured",
    "role",
    "source",
    "faceVerified",
    "verifiedAt",
    "passwordUpdatedAt",
    "createdAt",
    "updatedAt",
    "adminId",
    "lastLoginAt",
    "lastActiveAt",
    "isOnline",
    "online",
    "presenceStatus",
    "onlineStatus",
    "presenceUpdatedAt",
    "emailVerified",
    "mobileVerified",
    "_passwordHash",
    "googleProfile",
  ]);
  const profileData = {};
  for (const [key, value] of Object.entries(existing)) {
    if (!omitCore.has(key) && value !== undefined) {
      profileData[key] = value;
    }
  }
  profileData.preferredLanguage = language;

  await query(
    `
      UPDATE user_profiles
      SET profile_data = $2::jsonb, updated_at = NOW()
      WHERE account_id = $1
    `,
    [id, JSON.stringify(profileData)],
  );

  return findCustomerById(id);
}

async function updateAccountProfileImage(accountId, profileImageUrl) {
  const id = String(accountId ?? "").trim();
  if (!id) {
    return null;
  }

  const result = await query(
    `
      UPDATE accounts
      SET profile_image_url = $2, updated_at = NOW()
      WHERE id = $1 AND status <> 'deleted'
      RETURNING id
    `,
    [id, String(profileImageUrl ?? "").trim()],
  );
  return result.rows[0] ?? null;
}

async function assertCustomerUnique({ email, countryCode, mobileNumber, excludeId = null }) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedMobile = normalizePhone(mobileNumber);
  const normalizedCountry = String(countryCode ?? "+63").trim() || "+63";

  const emailResult = await query(
    `
      SELECT id FROM accounts
      WHERE role = 'user' AND lower(email) = $1
        AND ($2::text IS NULL OR id <> $2)
      LIMIT 1
    `,
    [normalizedEmail, excludeId],
  );
  if (emailResult.rowCount > 0) {
    throw new Error("Email address is already registered.");
  }

  if (normalizedMobile) {
    const mobileResult = await query(
      `
        SELECT id FROM accounts
        WHERE role = 'user'
          AND country_code = $1
          AND mobile_number = $2
          AND ($3::text IS NULL OR id <> $3)
        LIMIT 1
      `,
      [normalizedCountry, normalizedMobile, excludeId],
    );
    if (mobileResult.rowCount > 0) {
      throw new Error("Phone number is already registered.");
    }
  }
}

async function createCustomerAccount(input) {
  const email = normalizeEmail(input.email);
  const password = String(input.password ?? "").trim();
  const firstName = String(input.firstName ?? "").trim();
  const lastName = String(input.lastName ?? "").trim();
  const middleName = String(input.middleName ?? "").trim();
  const suffix = String(input.suffix ?? "").trim();
  const countryCode = String(input.countryCode ?? "+63").trim() || "+63";
  const mobileNumber = normalizePhone(input.mobileNumber);
  const address = String(input.address ?? "").trim();
  const adminId = String(input.adminId ?? "admin").trim() || "admin";
  const now = new Date();
  const id = String(input.id ?? "").trim() || `acct-${Date.now()}`;
  const accountCode =
    String(input.accountCode ?? "").trim() || `USR-${String(Date.now()).slice(-6)}`;
  const verificationChannel = String(input.verificationChannel ?? "email")
    .trim()
    .toLowerCase() === "mobile"
    ? "mobile"
    : "email";
  const verificationTarget =
    verificationChannel === "mobile"
      ? normalizeVerificationTarget("mobile", `${countryCode}${mobileNumber}`)
      : normalizeVerificationTarget("email", email);
  const googleProfile = input.googleProfile && typeof input.googleProfile === "object"
    ? input.googleProfile
    : null;
  const gmailEmail = googleProfile?.email
    ? normalizeEmail(googleProfile.email)
    : input.gmailBinding?.email
      ? normalizeEmail(input.gmailBinding.email)
      : "";
  if (input.preferredLanguage != null && String(input.preferredLanguage).trim()) {
    input.preferredLanguage = normalizePreferredLanguage(input.preferredLanguage);
  } else {
    delete input.preferredLanguage;
  }

  if (firstName.length < 2 || lastName.length < 2) {
    throw new Error("First name and last name must be at least 2 characters long.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Please enter a valid email address.");
  }
  const isGoogleSignUp = Boolean(googleProfile?.subject);
  if (!isGoogleSignUp && password.length < 6) {
    throw new Error("Password must be at least 6 characters long.");
  }
  if (!countryCode) {
    throw new Error("Country code is required.");
  }
  if (mobileNumber.length < 7) {
    throw new Error("Mobile number must be at least 7 digits long.");
  }

  await consumeVerificationToken({
    purpose: "registration",
    channel: verificationChannel,
    target: verificationTarget,
    verificationToken: input.verificationToken,
  });

  await assertCustomerUnique({ email, countryCode, mobileNumber });

  const passwordHash = password
    ? await hashPassword(password)
    : null;
  const emailVerified = verificationChannel === "email";
  const mobileVerified = verificationChannel === "mobile";
  const profileImageUrl = String(
    input.profileImageUrl ?? googleProfile?.picture ?? "",
  ).trim();

  await withTransaction(async (client) => {
    await client.query(
      `
        INSERT INTO accounts (
          id, account_code, role, email, password_hash,
          country_code, mobile_number, status, profile_image_url,
          email_verified, mobile_verified, password_updated_at,
          created_at, updated_at
        ) VALUES (
          $1, $2, 'user', $3, $4,
          $5, $6, 'active', $7,
          $8, $9, $10,
          $11, $11
        )
      `,
      [
        id,
        accountCode,
        email,
        passwordHash,
        countryCode,
        mobileNumber,
        profileImageUrl,
        emailVerified,
        mobileVerified,
        passwordHash ? now.toISOString() : null,
        now.toISOString(),
      ],
    );

    await client.query(
      `
        INSERT INTO user_profiles (
          account_id, first_name, middle_name, last_name, suffix,
          address, date_of_birth, gender, username, gmail_binding,
          face_verified, verified_at, admin_id, profile_data, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10,
          $11, $12, $13, $14::jsonb, $15, $15
        )
      `,
      [
        id,
        firstName,
        middleName,
        lastName,
        suffix,
        address,
        String(input.dateOfBirth ?? "").trim(),
        String(input.gender ?? "").trim(),
        email,
        gmailEmail || null,
        Boolean(input.faceVerified),
        input.verifiedAt ? toIso(input.verifiedAt) : now.toISOString(),
        adminId,
        JSON.stringify(extractUserProfileData(input)),
        now.toISOString(),
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
          googleProfile.email,
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

  return findCustomerById(id);
}

async function createCustomerAccountFromGoogle(profile, options = {}) {
  const email = normalizeEmail(profile?.email);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Google account did not provide a valid email address.");
  }
  if (!profile?.subject) {
    throw new Error("Google account is missing a subject identifier.");
  }

  const existingBySubject = await findAccountIdByGoogleSubject(profile.subject);
  if (existingBySubject) {
    await upsertGoogleIdentity(existingBySubject, profile);
    await syncGoogleProfileImage(existingBySubject, profile);
    return findCustomerById(existingBySubject);
  }

  const existingByEmail = await findCustomerByEmail(email);
  if (existingByEmail) {
    await upsertGoogleIdentity(existingByEmail.id, profile);
    await syncGoogleProfileImage(existingByEmail.id, profile);
    if (!existingByEmail.gmailBinding?.email) {
      await query(
        `
          UPDATE user_profiles
          SET gmail_binding = $2, updated_at = NOW()
          WHERE account_id = $1
        `,
        [existingByEmail.id, email],
      );
    }
    return findCustomerById(existingByEmail.id);
  }

  // New Google email must prove inbox access before Instant Sign-In create.
  await consumeVerificationToken({
    purpose: "registration",
    channel: "email",
    target: normalizeVerificationTarget("email", email),
    verificationToken: options.verificationToken,
  });

  const { firstName, lastName } = namesFromGoogleProfile(profile);
  const now = new Date();
  const id = `acct-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const accountCode = `USR-${String(Date.now()).slice(-6)}`;
  // Google is the sign-in method — no local password until the user sets one.
  const passwordHash = null;
  const profileImageUrl = String(profile.picture ?? "").trim();

  const preferredLanguage = options.preferredLanguage
    ? normalizePreferredLanguage(options.preferredLanguage)
    : "";
  const googleProfileData = preferredLanguage
    ? { preferredLanguage }
    : {};

  await withTransaction(async (client) => {
    await client.query(
      `
        INSERT INTO accounts (
          id, account_code, role, email, password_hash,
          country_code, mobile_number, status, profile_image_url,
          email_verified, mobile_verified, password_updated_at,
          created_at, updated_at
        ) VALUES (
          $1, $2, 'user', $3, $4,
          $5, $6, 'active', $7,
          TRUE, FALSE, NULL,
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
        now.toISOString(),
      ],
    );

    await client.query(
      `
        INSERT INTO user_profiles (
          account_id, first_name, middle_name, last_name, suffix,
          address, date_of_birth, gender, username, gmail_binding,
          face_verified, verified_at, admin_id, profile_data, created_at, updated_at
        ) VALUES (
          $1, $2, '', $3, '',
          '', '', '', $4, $5,
          FALSE, $6, 'admin', $7::jsonb, $6, $6
        )
      `,
      [
        id,
        firstName,
        lastName,
        email,
        email,
        now.toISOString(),
        JSON.stringify(googleProfileData),
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

  return findCustomerById(id);
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
    const local = String(profile?.email ?? "user").split("@")[0].trim();
    firstName = local.length >= 2 ? local.slice(0, 32) : "User";
  }
  if (lastName.length < 2) {
    lastName = "Account";
  }

  return { firstName, lastName };
}

async function loginCustomerWithGoogle({
  idToken,
  accessToken,
  createIfMissing = true,
  verificationToken,
  preferredLanguage,
}) {
  const profile = await verifyGoogleCredential({ idToken, accessToken });
  let accountId = await findAccountIdByGoogleSubject(profile.subject);
  let created = false;

  if (!accountId) {
    const byEmail = await findCustomerByEmail(profile.email);
    if (byEmail) {
      accountId = byEmail.id;
      await upsertGoogleIdentity(accountId, profile);
      if (!byEmail.gmailBinding?.email) {
        await query(
          `
            UPDATE user_profiles
            SET gmail_binding = $2, updated_at = NOW()
            WHERE account_id = $1
          `,
          [accountId, profile.email],
        );
      }
    }
  }

  if (!accountId) {
    if (!createIfMissing) {
      return {
        ok: false,
        code: "not_found",
        message:
          "No Switch account is linked to this Google account yet.",
        profile,
      };
    }

    const token = String(verificationToken ?? "").trim();
    if (!token) {
      return {
        ok: false,
        code: "verification_required",
        message:
          "Enter the verification code sent to your Google email to finish creating your Switch account.",
        profile,
      };
    }

    // One-Tap Register: create Switch account from Google after email OTP.
    // Phone / delivery details are collected later (profile or checkout).
    const createdAccount = await createCustomerAccountFromGoogle(profile, {
      verificationToken: token,
      preferredLanguage,
    });
    accountId = createdAccount?.id;
    created = true;
  }

  if (!accountId) {
    return {
      ok: false,
      code: "create_failed",
      message: "Unable to create a Switch account from Google.",
      profile,
    };
  }

  // Keep Google identity + avatar in sync on every Google sign-in so User Data
  // and buyer profile surfaces show the same Google picture.
  await upsertGoogleIdentity(accountId, profile);
  await syncGoogleProfileImage(accountId, profile);

  const updated = await markCustomerLoggedIn(accountId);
  const { _passwordHash, ...safeAccount } = updated || {};
  return { ok: true, account: safeAccount, profile, created };
}


async function markCustomerLoggedIn(accountId) {
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
      WHERE id = $1 AND role = 'user'
    `,
    [accountId, now],
  );
  return findCustomerById(accountId);
}

async function loginCustomer({ email, password }) {
  const account = await findCustomerByEmail(email);
  if (!account) {
    return { ok: false, code: "not_found", message: "Incorrect Email" };
  }

  if (!account._passwordHash) {
    const googleLinked = Boolean(
      account.googleProfile?.subject || account.gmailBinding?.email,
    );
    return {
      ok: false,
      code: googleLinked ? "google_sign_in_required" : "password_not_set",
      message: googleLinked
        ? "This account uses Google sign-in. Continue with Google."
        : "This account has no password yet. Use Forgot password to create one.",
    };
  }

  const valid = await verifyPassword(password, account._passwordHash);
  if (!valid) {
    return { ok: false, code: "bad_password", message: "Incorrect Password" };
  }

  const updated = await markCustomerLoggedIn(account.id);
  const { _passwordHash, ...safeAccount } = updated || account;
  return { ok: true, account: safeAccount };
}

function assertStrongPassword(plainPassword) {
  const password = String(plainPassword ?? "");
  if (password.length < 8) {
    throw Object.assign(new Error("Password must be at least 8 characters."), {
      statusCode: 400,
    });
  }
  if (!/[A-Z]/.test(password)) {
    throw Object.assign(new Error("Include at least 1 uppercase letter."), {
      statusCode: 400,
    });
  }
  if (!/\d/.test(password)) {
    throw Object.assign(new Error("Include at least 1 number."), {
      statusCode: 400,
    });
  }
  if (!/[!@#$%^&*(),.?":{}|<>[\]\\\/_\-+=~`;]/.test(password)) {
    throw Object.assign(new Error("Include at least 1 symbol."), {
      statusCode: 400,
    });
  }
  return password;
}

async function changeCustomerPassword({
  accountId,
  email = "",
  currentPassword,
  newPassword,
}) {
  const id = String(accountId ?? "").trim();
  const normalizedEmail = normalizeEmail(email);
  if (!id && !normalizedEmail) {
    throw Object.assign(new Error("Account ID or email is required."), {
      statusCode: 400,
    });
  }

  const account = id
    ? await findCustomerById(id)
    : await findCustomerByEmail(normalizedEmail);
  if (!account) {
    throw Object.assign(new Error("Buyer account was not found."), {
      statusCode: 404,
    });
  }
  if (
    normalizedEmail &&
    normalizeEmail(account.email) &&
    normalizeEmail(account.email) !== normalizedEmail
  ) {
    throw Object.assign(new Error("Buyer account was not found."), {
      statusCode: 404,
    });
  }

  if (!account._passwordHash) {
    throw Object.assign(
      new Error(
        "This account has no password yet. Use forgot password or link an email sign-in first.",
      ),
      { statusCode: 400 },
    );
  }

  const current = String(currentPassword ?? "");
  if (!current) {
    throw Object.assign(new Error("Enter your current password."), {
      statusCode: 400,
    });
  }

  const currentOk = await verifyPassword(current, account._passwordHash);
  if (!currentOk) {
    throw Object.assign(new Error("Current password is incorrect."), {
      statusCode: 401,
    });
  }

  const nextPassword = assertStrongPassword(newPassword);
  if (await verifyPassword(nextPassword, account._passwordHash)) {
    throw Object.assign(
      new Error("Your new password cannot be the same as your old password."),
      { statusCode: 400 },
    );
  }

  const passwordHash = await hashPassword(nextPassword);
  const now = new Date().toISOString();
  await query(
    `
      UPDATE accounts
      SET
        password_hash = $2,
        password_updated_at = $3,
        updated_at = $3
      WHERE id = $1
        AND role = 'user'
    `,
    [account.id, passwordHash, now],
  );

  const updated = await findCustomerById(account.id);
  return stripInternalFields(updated || { ...account, passwordUpdatedAt: now });
}

async function upsertCustomerFromLegacyRecord(legacyAccount, plainPassword = null) {
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
  const registeredVia = String(
    legacyAccount.registeredVia ??
      legacyAccount.profileData?.registeredVia ??
      "",
  )
    .trim()
    .toLowerCase();
  const gmailBindingEmail = normalizeEmail(
    legacyAccount.gmailBinding?.email ??
      legacyAccount.googleBinding?.email ??
      googleProfile?.email ??
      "",
  );
  const isGoogleAccount =
    Boolean(googleSubject) ||
    authProvider === "google" ||
    registeredVia === "google" ||
    Boolean(gmailBindingEmail);

  const existing = await findCustomerByEmail(email);
  const passwordSource = plainPassword ?? legacyAccount.password ?? "";
  const passwordHash = passwordSource
    ? looksLikeBcryptHash(passwordSource)
      ? String(passwordSource)
      : await hashPassword(String(passwordSource))
    : existing?._passwordHash || null;

  // Google Instant Sign-In accounts do not require a local password.
  if (!passwordHash && !isGoogleAccount) {
    throw new Error(`Cannot migrate ${email}: missing password.`);
  }

  const id = String(
    existing?.id ?? legacyAccount.id ?? `acct-${Date.now()}`,
  ).trim();
  const now = new Date().toISOString();

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
          $1, $2, 'user', $3, $4,
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
        String(legacyAccount.accountCode ?? `USR-${String(Date.now()).slice(-6)}`),
        email,
        passwordHash,
        String(legacyAccount.countryCode ?? "+63").trim() || "+63",
        normalizePhone(legacyAccount.mobileNumber),
        coerceAccountStatus(
          legacyAccount.status ?? legacyAccount.accountStatus ?? legacyAccount.accountState,
        ),
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
        INSERT INTO user_profiles (
          account_id, first_name, middle_name, last_name, suffix,
          address, date_of_birth, gender, username, gmail_binding,
          face_verified, verified_at, admin_id, profile_data, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10,
          $11, $12, $13, $14::jsonb, $15, $16
        )
        ON CONFLICT (account_id) DO UPDATE SET
          first_name = EXCLUDED.first_name,
          middle_name = EXCLUDED.middle_name,
          last_name = EXCLUDED.last_name,
          suffix = EXCLUDED.suffix,
          address = EXCLUDED.address,
          date_of_birth = EXCLUDED.date_of_birth,
          gender = EXCLUDED.gender,
          username = EXCLUDED.username,
          gmail_binding = EXCLUDED.gmail_binding,
          face_verified = EXCLUDED.face_verified,
          verified_at = EXCLUDED.verified_at,
          admin_id = EXCLUDED.admin_id,
          profile_data = EXCLUDED.profile_data,
          updated_at = EXCLUDED.updated_at
      `,
      [
        id,
        String(legacyAccount.firstName ?? googleProfile?.firstName ?? "").trim() ||
          "User",
        String(legacyAccount.middleName ?? "").trim(),
        String(legacyAccount.lastName ?? googleProfile?.lastName ?? "").trim() ||
          "Account",
        String(legacyAccount.suffix ?? "").trim(),
        String(legacyAccount.address ?? "").trim(),
        String(legacyAccount.dateOfBirth ?? "").trim(),
        String(legacyAccount.gender ?? "").trim(),
        String(legacyAccount.username ?? email).trim().toLowerCase(),
        gmailBindingEmail || null,
        Boolean(legacyAccount.faceVerified),
        toIso(legacyAccount.verifiedAt),
        String(legacyAccount.adminId ?? "admin").trim() || "admin",
        JSON.stringify({
          ...extractUserProfileData(legacyAccount),
          ...(isGoogleAccount
            ? {
                registeredVia: "google",
                googleEmail: gmailBindingEmail || email,
              }
            : {}),
        }),
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
          gmailBindingEmail || email,
          JSON.stringify({
            firstName: googleProfile?.firstName,
            lastName: googleProfile?.lastName,
            displayName: googleProfile?.displayName,
            picture: googleProfile?.picture,
            email: gmailBindingEmail || email,
            subject: googleSubject,
          }),
        ],
      );
    }
  });

  return findCustomerById(id);
}

async function listCustomers() {
  const result = await query(`${CUSTOMER_SELECT} ORDER BY a.created_at DESC`);
  return result.rows.map(mapCustomerRow).filter(Boolean);
}

module.exports = {
  isCustomerPostgresReady,
  findCustomerByEmail,
  findCustomerById,
  updateAccountProfileImage,
  updateCustomerPreferredLanguage,
  normalizePreferredLanguage,
  createCustomerAccount,
  createCustomerAccountFromGoogle,
  loginCustomer,
  loginCustomerWithGoogle,
  changeCustomerPassword,
  markCustomerLoggedIn,
  upsertCustomerFromLegacyRecord,
  listCustomers,
  stripInternalFields,
  assertCustomerUnique,
};
