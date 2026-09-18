"use strict";

/**
 * Unified accounts store backed by PostgreSQL.
 * Keeps the same array-of-accounts shape that server.js / Super Admin UI expect.
 */

const { query, isPostgresConfigured, getPool } = require("../db/pool");
const {
  listCustomers,
  upsertCustomerFromLegacyRecord,
  stripInternalFields: stripCustomer,
  isCustomerPostgresReady,
} = require("./postgresCustomerAccounts");
const {
  listSellers,
  upsertSellerFromLegacyRecord,
  stripInternalFields: stripSeller,
  isSellerPostgresReady,
} = require("./postgresSellerAccounts");
const {
  listEmployees,
  upsertEmployeeFromLegacyRecord,
  stripInternalFields: stripEmployee,
  isEmployeePostgresReady,
} = require("./postgresEmployeeAccounts");
const {
  isUnifiedAccountsReady,
  listUnifiedAccounts,
  findUnifiedAccountById,
  findUnifiedAccountByEmail,
  resolveUnifiedSession,
} = require("./postgresUnifiedAccounts");

async function isAccountsPostgresReady() {
  if (!isPostgresConfigured()) {
    return false;
  }
  try {
    await getPool();
    return (
      (await isCustomerPostgresReady()) &&
      (await isSellerPostgresReady()) &&
      (await isEmployeePostgresReady())
    );
  } catch (_) {
    return false;
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
  if (role === "user" || role === "buyer" || role === "customer" || source === "app") {
    return "user";
  }
  return role || "unknown";
}

async function listAllAccountsFromPostgres() {
  const [sellers, employees, users] = await Promise.all([
    listSellers(),
    listEmployees(),
    listCustomers(),
  ]);

  return [
    ...sellers.map((account) => stripSeller(account)),
    ...employees.map((account) => stripEmployee(account)),
    ...users.map((account) => stripCustomer(account)),
  ].filter(Boolean);
}

async function deleteAccountById(accountId) {
  const id = String(accountId ?? "").trim();
  if (!id) {
    return false;
  }
  const result = await query(`DELETE FROM accounts WHERE id = $1`, [id]);
  return result.rowCount > 0;
}

async function upsertAccountRecord(account) {
  const role = roleOf(account);
  if (role === "admin") {
    return upsertSellerFromLegacyRecord(account);
  }
  if (role === "employee") {
    return upsertEmployeeFromLegacyRecord(account);
  }
  if (role === "user") {
    return upsertCustomerFromLegacyRecord(account);
  }
  console.warn(`Skipping unsupported account role during Postgres sync: ${role}`);
  return null;
}

async function syncAccountsToPostgres(accounts) {
  const incoming = Array.isArray(accounts) ? accounts : [];
  const existing = await listAllAccountsFromPostgres();
  const incomingIds = new Set(
    incoming.map((account) => String(account?.id ?? "").trim()).filter(Boolean),
  );

  for (const account of incoming) {
    try {
      await upsertAccountRecord(account);
    } catch (error) {
      console.error(
        `Failed to sync account ${account?.email || account?.id}:`,
        error instanceof Error ? error.message : error,
      );
      throw error;
    }
  }

  for (const old of existing) {
    const oldId = String(old?.id ?? "").trim();
    if (oldId && !incomingIds.has(oldId)) {
      await deleteAccountById(oldId);
    }
  }
}

module.exports = {
  isAccountsPostgresReady,
  listAllAccountsFromPostgres,
  isUnifiedAccountsReady,
  listUnifiedAccounts,
  findUnifiedAccountById,
  findUnifiedAccountByEmail,
  resolveUnifiedSession,
  syncAccountsToPostgres,
  deleteAccountById,
};
