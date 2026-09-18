"use strict";

const fs = require("fs");
const path = require("path");
const { query, closePool } = require("../db/pool");
const { hashPassword } = require("../db/password");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const idx = trimmed.indexOf("=");
    if (idx <= 0) {
      continue;
    }
    const key = trimmed.slice(0, idx).trim();
    if (!key || process.env[key] != null) {
      continue;
    }
    let value = trimmed.slice(idx + 1).trim();
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
    ...options,
  });
  const payload = await response.json().catch(() => ({}));
  return {
    status: response.status,
    ok: response.ok,
    payload,
  };
}

async function main() {
  loadEnvFile(path.join(__dirname, "..", ".env"));
  loadEnvFile(path.join(__dirname, "..", "..", ".env"));

  const baseUrl = process.env.E2E_BASE_URL || "http://127.0.0.1:8081";
  const stamp = Date.now();
  const accountId = `acct-e2e-${stamp}`;
  const email = `e2e+${stamp}@switch.test`;
  const mobileNumber = `917${String(stamp).slice(-7)}`;
  let companyId = "";

  try {
    const passwordHash = await hashPassword("Pass1234");
    await query(
      `
        INSERT INTO accounts (
          id, account_code, role, email, password_hash,
          country_code, mobile_number, status, profile_image_url,
          email_verified, mobile_verified, password_updated_at,
          created_at, updated_at
        ) VALUES (
          $1, $2, 'user', $3, $4,
          '+63', $5, 'active', '',
          TRUE, FALSE, NOW(),
          NOW(), NOW()
        )
      `,
      [accountId, `USR-E2E-${String(stamp).slice(-6)}`, email, passwordHash, mobileNumber],
    );

    await query(
      `
        INSERT INTO user_profiles (
          account_id, first_name, middle_name, last_name, suffix,
          address, date_of_birth, gender, username, gmail_binding,
          face_verified, verified_at, admin_id, profile_data, created_at, updated_at
        ) VALUES (
          $1, 'E2E', '', 'Buyer', '',
          '', '', '', $2, NULL,
          FALSE, NOW(), 'admin', '{}'::jsonb, NOW(), NOW()
        )
      `,
      [accountId, email],
    );

    const sessionBefore = await fetchJson(
      `${baseUrl}/api/auth/session?accountId=${encodeURIComponent(accountId)}`,
    );
    const start = await fetchJson(`${baseUrl}/api/account/become-seller/start`, {
      method: "POST",
      body: JSON.stringify({
        accountId,
        companyName: `E2E Seller ${stamp}`,
        businessType: "Retail",
        planName: "Starter Seller Plan",
        paymentGateway: "manual",
        amount: 499,
        currencyCode: "PHP",
      }),
    });

    const companies = Array.isArray(start.payload?.session?.companies)
      ? start.payload.session.companies
      : [];
    for (const item of companies) {
      const type = String(item?.company?.type || "").trim().toLowerCase();
      if (type === "seller") {
        companyId = String(item.companyId || item.company?.id || "").trim();
        if (companyId) {
          break;
        }
      }
    }
    if (!companyId) {
      throw new Error("Seller company ID was not returned.");
    }

    const checkoutIntent = await fetchJson(
      `${baseUrl}/api/account/become-seller/checkout-intent`,
      {
        method: "POST",
        body: JSON.stringify({
          accountId,
          companyId,
          planName: "Starter Seller Plan",
          billingCycle: "monthly",
          paymentGateway: "manual",
          amount: 499,
          currencyCode: "PHP",
        }),
      },
    );

    const confirm = await fetchJson(
      `${baseUrl}/api/account/become-seller/confirm-payment`,
      {
        method: "POST",
        body: JSON.stringify({
          accountId,
          companyId,
          planName: "Starter Seller Plan",
          billingCycle: "monthly",
          paymentGateway: "manual",
          paymentReference:
            checkoutIntent.payload?.checkoutIntent?.paymentReference ||
            `MANUAL-${stamp}`,
          amount: 499,
          currencyCode: "PHP",
        }),
      },
    );

    const sessionAfter = await fetchJson(
      `${baseUrl}/api/auth/session?accountId=${encodeURIComponent(accountId)}`,
    );
    const sessionAfterPreferred = await fetchJson(
      `${baseUrl}/api/auth/session?accountId=${encodeURIComponent(accountId)}&activeMode=seller_admin&companyId=${encodeURIComponent(companyId)}`,
    );

    console.log(
      JSON.stringify(
        {
          accountId,
          email,
          sessionBefore: {
            status: sessionBefore.status,
            activeMode: sessionBefore.payload?.session?.activeMode || null,
            availableModes: sessionBefore.payload?.session?.availableModes || [],
          },
          start: {
            status: start.status,
            message: start.payload?.message || "",
            companyId,
          },
          checkoutIntent: {
            status: checkoutIntent.status,
            id: checkoutIntent.payload?.checkoutIntent?.id || null,
            paymentGateway: checkoutIntent.payload?.checkoutIntent?.paymentGateway || null,
            checkoutUrl: checkoutIntent.payload?.checkoutIntent?.checkoutUrl || null,
          },
          confirm: {
            status: confirm.status,
            message: confirm.payload?.message || "",
            activeMode: confirm.payload?.session?.activeMode || null,
          },
          sessionAfter: {
            status: sessionAfter.status,
            activeMode: sessionAfter.payload?.session?.activeMode || null,
            availableModes: sessionAfter.payload?.session?.availableModes || [],
          },
          sessionAfterPreferred: {
            status: sessionAfterPreferred.status,
            activeMode: sessionAfterPreferred.payload?.session?.activeMode || null,
            activeCompanyId: sessionAfterPreferred.payload?.session?.activeCompanyId || null,
            availableModes: sessionAfterPreferred.payload?.session?.availableModes || [],
          },
        },
        null,
        2,
      ),
    );
  } finally {
    if (companyId) {
      await query(`DELETE FROM companies WHERE id = $1`, [companyId]).catch(() => {});
    }
    await query(`DELETE FROM accounts WHERE id = $1`, [accountId]).catch(() => {});
    await closePool().catch(() => {});
  }
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : error);
  try {
    await closePool();
  } catch (_) {
    // ignore
  }
  process.exit(1);
});
