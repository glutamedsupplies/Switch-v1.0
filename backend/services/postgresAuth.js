"use strict";

const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const { query, withTransaction } = require("../db/pool");
const { normalizeEmail, normalizePhone } = require("../db/accountHelpers");
const {
  isValidPhMobile,
  normalizePhMobileE164,
  isSmsEnabled,
  sendVerificationSms,
} = require("./smsService");
const { isEmailEnabled, sendVerificationEmail } = require("./emailService");

const VERIFICATION_CODE_TTL_MS = 10 * 60 * 1000;
const VERIFICATION_TOKEN_TTL_MS = 15 * 60 * 1000;
const VERIFICATION_RESEND_COOLDOWN_MS = 60 * 1000;

function getGoogleClientIds() {
  const raw = String(process.env.GOOGLE_CLIENT_ID ?? "").trim();
  if (!raw) {
    return [];
  }
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function hashVerificationCode(code) {
  return crypto.createHash("sha256").update(String(code ?? "").trim()).digest("hex");
}

function createSixDigitCode() {
  return String(crypto.randomInt(100000, 1000000));
}

function normalizeVerificationTarget(channel, value) {
  const normalizedChannel = String(channel ?? "email").trim().toLowerCase();
  if (normalizedChannel === "mobile") {
    return normalizePhMobileE164(value) || normalizePhone(value);
  }
  return normalizeEmail(value);
}

async function invalidateActiveVerificationCodes({ purpose, channel, target }) {
  await query(
    `
      UPDATE registration_verification_codes
      SET consumed_at = NOW()
      WHERE purpose = $1
        AND channel = $2
        AND target = $3
        AND consumed_at IS NULL
    `,
    [purpose, channel, target],
  );
}

async function sendVerificationCode({
  purpose = "registration",
  channel = "email",
  target,
}) {
  const normalizedChannel = channel === "mobile" ? "mobile" : "email";

  if (normalizedChannel === "mobile") {
    if (!isValidPhMobile(target)) {
      throw new Error(
        "Enter a valid Philippine mobile number (e.g. 09171234567).",
      );
    }
    if (!isSmsEnabled()) {
      throw new Error(
        "SMS OTP is not configured. Add SEMAPHORE_API_KEY in backend/.env to send real mobile codes.",
      );
    }
  } else if (!isEmailEnabled()) {
    throw new Error(
      "Email OTP is not configured. Set BREVO_API_KEY (or RESEND_API_KEY) in backend/.env.",
    );
  }

  const normalizedTarget = normalizeVerificationTarget(normalizedChannel, target);
  if (!normalizedTarget) {
    throw new Error(
      normalizedChannel === "mobile"
        ? "Enter a valid Philippine mobile number (e.g. 09171234567)."
        : "Verification email is required.",
    );
  }

  if (normalizedChannel === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedTarget)) {
    throw new Error("Please enter a valid email address.");
  }

  const recent = await query(
    `
      SELECT created_at
      FROM registration_verification_codes
      WHERE purpose = $1
        AND channel = $2
        AND target = $3
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [purpose, normalizedChannel, normalizedTarget],
  );

  const lastCreatedAt = recent.rows[0]?.created_at
    ? new Date(recent.rows[0].created_at)
    : null;
  if (
    lastCreatedAt
    && Date.now() - lastCreatedAt.getTime() < VERIFICATION_RESEND_COOLDOWN_MS
  ) {
    const waitSeconds = Math.ceil(
      (VERIFICATION_RESEND_COOLDOWN_MS - (Date.now() - lastCreatedAt.getTime())) / 1000,
    );
    throw new Error(`Please wait ${waitSeconds}s before requesting another code.`);
  }

  await invalidateActiveVerificationCodes({
    purpose,
    channel: normalizedChannel,
    target: normalizedTarget,
  });

  const code = createSixDigitCode();
  const expiresAt = new Date(Date.now() + VERIFICATION_CODE_TTL_MS);

  await query(
    `
      INSERT INTO registration_verification_codes (
        purpose, channel, target, code_hash, expires_at, created_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
    `,
    [
      purpose,
      normalizedChannel,
      normalizedTarget,
      hashVerificationCode(code),
      expiresAt.toISOString(),
    ],
  );

  let delivery = "stored";
  if (normalizedChannel === "mobile") {
    await sendVerificationSms({
      number: normalizedTarget,
      code,
      purpose,
    });
    delivery = "sms";
    console.log(
      `[verification] ${purpose}/mobile SMS sent → ${normalizedTarget}`,
    );
  } else {
    const emailResult = await sendVerificationEmail({
      email: normalizedTarget,
      code,
      purpose,
    });
    delivery = "email";
    console.log(
      `[verification] ${purpose}/email sent → ${normalizedTarget}` +
        ` via ${emailResult?.provider || "email"}` +
        (emailResult?.messageId ? ` id=${emailResult.messageId}` : ""),
    );
  }

  return {
    channel: normalizedChannel,
    target: normalizedTarget,
    expiresAt: expiresAt.toISOString(),
    createdAt: new Date().toISOString(),
    resendAvailableAt: new Date(
      Date.now() + VERIFICATION_RESEND_COOLDOWN_MS,
    ).toISOString(),
    resendCooldownSeconds: Math.ceil(VERIFICATION_RESEND_COOLDOWN_MS / 1000),
    delivery,
  };
}

async function verifyVerificationCode({
  purpose = "registration",
  channel = "email",
  target,
  code,
}) {
  const normalizedChannel = channel === "mobile" ? "mobile" : "email";
  const normalizedTarget = normalizeVerificationTarget(normalizedChannel, target);
  const normalizedCode = String(code ?? "").trim();

  if (!/^\d{6}$/.test(normalizedCode)) {
    throw new Error("Enter the 6-digit verification code.");
  }

  const result = await query(
    `
      SELECT id, code_hash, expires_at, consumed_at
      FROM registration_verification_codes
      WHERE purpose = $1
        AND channel = $2
        AND target = $3
        AND consumed_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [purpose, normalizedChannel, normalizedTarget],
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error("Verification code expired or not found. Request a new code.");
  }

  if (row.consumed_at) {
    throw new Error("Verification code already used. Request a new code.");
  }

  const expiresAt = new Date(row.expires_at);
  if (!Number.isFinite(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) {
    throw new Error("Verification code expired. Request a new code.");
  }

  if (hashVerificationCode(normalizedCode) !== row.code_hash) {
    throw new Error("Incorrect verification code.");
  }

  const tokenId = crypto.randomBytes(16).toString("hex");
  const tokenExpiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);

  await withTransaction(async (client) => {
    await client.query(
      `
        UPDATE registration_verification_codes
        SET consumed_at = NOW()
        WHERE id = $1
      `,
      [row.id],
    );

    await client.query(
      `
        UPDATE registration_verification_tokens
        SET consumed_at = NOW()
        WHERE purpose = $1
          AND channel = $2
          AND target = $3
          AND consumed_at IS NULL
      `,
      [purpose, normalizedChannel, normalizedTarget],
    );

    await client.query(
      `
        INSERT INTO registration_verification_tokens (
          id, purpose, channel, target, expires_at, created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())
      `,
      [
        tokenId,
        purpose,
        normalizedChannel,
        normalizedTarget,
        tokenExpiresAt.toISOString(),
      ],
    );
  });

  return {
    verificationToken: tokenId,
    channel: normalizedChannel,
    target: normalizedTarget,
    expiresAt: tokenExpiresAt.toISOString(),
  };
}

async function consumeVerificationToken({
  purpose = "registration",
  channel = "email",
  target,
  verificationToken,
}) {
  const normalizedChannel = channel === "mobile" ? "mobile" : "email";
  const normalizedTarget = normalizeVerificationTarget(normalizedChannel, target);
  const token = String(verificationToken ?? "").trim();
  if (!token) {
    throw new Error(
      purpose === "password_reset"
        ? "Verify the code sent to your email before resetting your password."
        : "Email verification is required before creating an account.",
    );
  }

  const result = await query(
    `
      SELECT id, expires_at, consumed_at
      FROM registration_verification_tokens
      WHERE id = $1
        AND purpose = $2
        AND channel = $3
        AND target = $4
      LIMIT 1
    `,
    [token, purpose, normalizedChannel, normalizedTarget],
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error("Verification expired. Complete email verification again.");
  }
  if (row.consumed_at) {
    throw new Error("Verification token already used.");
  }

  const expiresAt = new Date(row.expires_at);
  if (!Number.isFinite(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) {
    throw new Error("Verification expired. Complete email verification again.");
  }

  await query(
    `
      UPDATE registration_verification_tokens
      SET consumed_at = NOW()
      WHERE id = $1
    `,
    [row.id],
  );

  return {
    channel: normalizedChannel,
    target: normalizedTarget,
  };
}

async function verifyGoogleIdToken(idToken) {
  const token = String(idToken ?? "").trim();
  if (!token) {
    throw new Error("Google sign-in token is missing.");
  }

  const clientIds = getGoogleClientIds();
  if (clientIds.length === 0) {
    throw new Error("Google sign-in is not configured on the server.");
  }

  const client = new OAuth2Client(clientIds[0]);
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: clientIds,
  });
  const payload = ticket.getPayload();
  if (!payload?.sub) {
    throw new Error("Unable to verify Google account.");
  }

  const email = normalizeEmail(payload.email);
  if (!email) {
    throw new Error("Google account must include a verified email address.");
  }
  if (payload.email_verified === false) {
    throw new Error("Google email address is not verified.");
  }

  return {
    provider: "google",
    subject: String(payload.sub),
    email,
    firstName: String(payload.given_name ?? "").trim(),
    lastName: String(payload.family_name ?? "").trim(),
    displayName: String(payload.name ?? "").trim(),
    picture: String(payload.picture ?? "").trim(),
  };
}

async function verifyGoogleAccessToken(accessToken) {
  const token = String(accessToken ?? "").trim();
  if (!token) {
    throw new Error("Google sign-in token is missing.");
  }

  const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.sub) {
    throw new Error(
      payload.error_description ||
        payload.error ||
        "Unable to verify Google account.",
    );
  }

  const email = normalizeEmail(payload.email);
  if (!email) {
    throw new Error("Google account must include a verified email address.");
  }
  if (payload.email_verified === false || payload.verified_email === false) {
    throw new Error("Google email address is not verified.");
  }

  return {
    provider: "google",
    subject: String(payload.sub),
    email,
    firstName: String(payload.given_name ?? "").trim(),
    lastName: String(payload.family_name ?? "").trim(),
    displayName: String(payload.name ?? "").trim(),
    picture: String(payload.picture ?? "").trim(),
  };
}

async function verifyGoogleCredential({ idToken, accessToken } = {}) {
  if (String(idToken ?? "").trim()) {
    return verifyGoogleIdToken(idToken);
  }
  if (String(accessToken ?? "").trim()) {
    return verifyGoogleAccessToken(accessToken);
  }
  throw new Error("Google sign-in token is missing.");
}

async function findAccountIdByGoogleSubject(subject) {
  const result = await query(
    `
      SELECT account_id
      FROM auth_identities
      WHERE provider = 'google' AND provider_subject = $1
      LIMIT 1
    `,
    [String(subject ?? "").trim()],
  );
  return result.rows[0]?.account_id ?? null;
}

async function upsertGoogleIdentity(accountId, profile) {
  const id = crypto.randomBytes(12).toString("hex");
  await query(
    `
      INSERT INTO auth_identities (
        id, account_id, provider, provider_subject, email, profile_data, created_at, updated_at
      ) VALUES (
        $1, $2, 'google', $3, $4, $5::jsonb, NOW(), NOW()
      )
      ON CONFLICT (provider, provider_subject) DO UPDATE SET
        account_id = EXCLUDED.account_id,
        email = EXCLUDED.email,
        profile_data = EXCLUDED.profile_data,
        updated_at = NOW()
    `,
    [
      id,
      accountId,
      profile.subject,
      profile.email,
      JSON.stringify({
        firstName: profile.firstName,
        lastName: profile.lastName,
        displayName: profile.displayName,
        picture: profile.picture,
      }),
    ],
  );
}

module.exports = {
  sendVerificationCode,
  verifyVerificationCode,
  consumeVerificationToken,
  verifyGoogleIdToken,
  verifyGoogleAccessToken,
  verifyGoogleCredential,
  findAccountIdByGoogleSubject,
  upsertGoogleIdentity,
  normalizeVerificationTarget,
  getGoogleClientIds,
};
