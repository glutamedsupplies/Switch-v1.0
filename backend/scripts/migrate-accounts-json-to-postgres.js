"use strict";

/**
 * Migrate accounts.json → Postgres for user, admin (seller), and employee roles.
 *
 * Usage:
 *   node scripts/migrate-accounts-json-to-postgres.js
 *
 * Copies existing account rows (bcrypt hashes only). Does not seed or print
 * plaintext passwords, API keys, or session secrets.
 */

const fs = require("fs");
const path = require("path");

function loadEnvFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return;
    }
    const raw = fs.readFileSync(filePath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith("#")) {
        continue;
      }
      const separatorIndex = trimmedLine.indexOf("=");
      if (separatorIndex <= 0) {
        continue;
      }
      const key = trimmedLine.slice(0, separatorIndex).trim();
      if (!key || process.env[key] != null) {
        continue;
      }
      let value = trimmedLine.slice(separatorIndex + 1).trim();
      if (
        value.length >= 2 &&
        ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'")))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  } catch (error) {
    console.error(`Unable to load env file: ${filePath}`, error);
  }
}

function roleOf(account) {
  const role = String(account?.role ?? "").trim().toLowerCase();
  const source = String(account?.source ?? "").trim().toLowerCase();
  if (role === "admin") {
    return "admin";
  }
  if (role === "employee") {
    return "employee";
  }
  if (role === "user" || source === "app") {
    return "user";
  }
  return role || "unknown";
}

async function main() {
  loadEnvFile(path.join(__dirname, "..", ".env"));
  loadEnvFile(path.join(__dirname, "..", "..", ".env"));

  const { runMigrations } = require("../db/migrate");
  const { closePool } = require("../db/pool");
  const {
    upsertCustomerFromLegacyRecord,
    isCustomerPostgresReady,
  } = require("../services/postgresCustomerAccounts");
  const {
    upsertSellerFromLegacyRecord,
    isSellerPostgresReady,
  } = require("../services/postgresSellerAccounts");
  const {
    upsertEmployeeFromLegacyRecord,
    isEmployeePostgresReady,
  } = require("../services/postgresEmployeeAccounts");

  await runMigrations();

  if (
    !(await isCustomerPostgresReady()) ||
    !(await isSellerPostgresReady()) ||
    !(await isEmployeePostgresReady())
  ) {
    throw new Error("PostgreSQL is not ready. Check DATABASE_URL.");
  }

  const accountsPath = path.join(__dirname, "..", "data", "accounts.json");
  const raw = fs.readFileSync(accountsPath, "utf8");
  const accounts = JSON.parse(raw);
  if (!Array.isArray(accounts)) {
    throw new Error("accounts.json is not an array.");
  }

  const sellers = accounts.filter((account) => roleOf(account) === "admin");
  const employees = accounts.filter((account) => roleOf(account) === "employee");
  const users = accounts.filter((account) => roleOf(account) === "user");

  let migrated = 0;
  let failed = 0;

  console.log(`Migrating ${sellers.length} sellers...`);
  for (const account of sellers) {
    try {
      await upsertSellerFromLegacyRecord(account);
      migrated += 1;
      console.log(`seller   ${account.email}`);
    } catch (error) {
      failed += 1;
      console.error(`failed   seller ${account.email}: ${error.message}`);
    }
  }

  console.log(`Migrating ${employees.length} employees...`);
  for (const account of employees) {
    try {
      await upsertEmployeeFromLegacyRecord(account);
      migrated += 1;
      console.log(`employee ${account.employeeId} <${account.email}>`);
    } catch (error) {
      failed += 1;
      console.error(
        `failed   employee ${account.employeeId}: ${error.message}`,
      );
    }
  }

  console.log(`Migrating ${users.length} users...`);
  for (const account of users) {
    try {
      await upsertCustomerFromLegacyRecord(account);
      migrated += 1;
      console.log(`user     ${account.email}`);
    } catch (error) {
      failed += 1;
      console.error(`failed   user ${account.email}: ${error.message}`);
    }
  }

  const total = sellers.length + employees.length + users.length;
  console.log(`\nDone. total=${total} migrated=${migrated} failed=${failed}`);
  await closePool();
}

main().catch(async (error) => {
  console.error("Migration failed:", error.message || error);
  try {
    const { closePool } = require("../db/pool");
    await closePool();
  } catch (_) {
    // ignore
  }
  process.exit(1);
});
