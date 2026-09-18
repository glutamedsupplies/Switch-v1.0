"use strict";

const { query, isPostgresConfigured, getPool } = require("../db/pool");
const { listCustomers, stripInternalFields: stripCustomer } = require("./postgresCustomerAccounts");
const { listSellers, stripInternalFields: stripSeller } = require("./postgresSellerAccounts");
const { listEmployees, stripInternalFields: stripEmployee } = require("./postgresEmployeeAccounts");
const { asObject } = require("../db/accountHelpers");

async function isUnifiedAccountsReady() {
  if (!isPostgresConfigured()) {
    return false;
  }
  try {
    await getPool();
    await query("SELECT 1 FROM account_capabilities LIMIT 1");
    await query("SELECT 1 FROM companies LIMIT 1");
    await query("SELECT 1 FROM company_memberships LIMIT 1");
    return true;
  } catch (_) {
    return false;
  }
}

async function listAccountCapabilities() {
  const result = await query(
    `
      SELECT
        account_id,
        capability::text AS capability,
        granted_reason,
        metadata,
        granted_at,
        updated_at
      FROM account_capabilities
      ORDER BY granted_at ASC
    `,
  );
  return result.rows.map((row) => ({
    accountId: row.account_id,
    capability: row.capability,
    grantedReason: row.granted_reason || "",
    metadata: asObject(row.metadata),
    grantedAt: row.granted_at ? new Date(row.granted_at).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
  }));
}

async function listCompanyMemberships() {
  const result = await query(
    `
      SELECT
        m.id,
        m.company_id,
        m.account_id,
        m.membership_role::text AS membership_role,
        m.membership_status::text AS membership_status,
        m.title,
        m.is_primary,
        m.metadata,
        m.created_at,
        m.updated_at,
        c.company_code,
        c.type::text AS company_type,
        c.status::text AS company_status,
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
        c.profile_data
      FROM company_memberships m
      INNER JOIN companies c ON c.id = m.company_id
      ORDER BY c.created_at ASC, m.created_at ASC
    `,
  );

  return result.rows.map((row) => ({
    id: row.id,
    companyId: row.company_id,
    accountId: row.account_id,
    membershipRole: row.membership_role,
    membershipStatus: row.membership_status,
    title: row.title || "",
    isPrimary: Boolean(row.is_primary),
    metadata: asObject(row.metadata),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
    company: {
      id: row.company_id,
      companyCode: row.company_code || "",
      type: row.company_type,
      status: row.company_status,
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
    },
  }));
}

function preferBaseAccount(a, b) {
  if (!a) {
    return b;
  }
  if (!b) {
    return a;
  }

  const rank = { user: 3, admin: 2, employee: 1 };
  const aRank = rank[String(a.role || "").toLowerCase()] || 0;
  const bRank = rank[String(b.role || "").toLowerCase()] || 0;
  return bRank > aRank ? b : a;
}

function buildAvailableModes(account, capabilities, memberships) {
  const available = new Set();
  const role = String(account?.role || "").trim().toLowerCase();

  if (role === "user" || role === "admin" || role === "super_admin") {
    available.add("buyer");
  }
  if (role === "employee") {
    available.add("employee");
  }

  for (const capability of capabilities) {
    available.add(capability.capability);
  }

  for (const membership of memberships) {
    if (membership.membershipRole === "owner" || membership.membershipRole === "seller_admin") {
      if (membership.company.type === "seller") {
        available.add("seller_admin");
      }
      if (membership.company.type === "supplier") {
        available.add("supplier_admin");
      }
    }
    if (membership.membershipRole === "supplier_admin") {
      available.add("supplier_admin");
    }
    if (membership.membershipRole === "employee") {
      available.add("employee");
    }
  }

  return Array.from(available);
}

function chooseDefaultActiveMode(availableModes) {
  if (availableModes.includes("buyer")) {
    return "buyer";
  }
  if (availableModes.includes("seller_admin")) {
    return "seller_admin";
  }
  if (availableModes.includes("supplier_admin")) {
    return "supplier_admin";
  }
  if (availableModes.includes("employee")) {
    return "employee";
  }
  if (availableModes.includes("super_admin")) {
    return "super_admin";
  }
  return "buyer";
}

async function listUnifiedAccounts() {
  const [customers, sellers, employees, capabilities, memberships] = await Promise.all([
    listCustomers(),
    listSellers(),
    listEmployees(),
    listAccountCapabilities(),
    listCompanyMemberships(),
  ]);

  const baseAccounts = new Map();
  for (const account of customers.map(stripCustomer)) {
    baseAccounts.set(account.id, preferBaseAccount(baseAccounts.get(account.id), account));
  }
  for (const account of sellers.map(stripSeller)) {
    baseAccounts.set(account.id, preferBaseAccount(baseAccounts.get(account.id), account));
  }
  for (const account of employees.map(stripEmployee)) {
    baseAccounts.set(account.id, preferBaseAccount(baseAccounts.get(account.id), account));
  }

  const capabilityMap = new Map();
  for (const item of capabilities) {
    const list = capabilityMap.get(item.accountId) || [];
    list.push(item);
    capabilityMap.set(item.accountId, list);
  }

  const membershipMap = new Map();
  for (const item of memberships) {
    const list = membershipMap.get(item.accountId) || [];
    list.push(item);
    membershipMap.set(item.accountId, list);
  }

  return Array.from(baseAccounts.values())
    .map((account) => {
      const accountCapabilities = capabilityMap.get(account.id) || [];
      const accountMemberships = membershipMap.get(account.id) || [];
      const availableModes = buildAvailableModes(
        account,
        accountCapabilities,
        accountMemberships,
      );

      return {
        account,
        availableModes,
        activeMode: chooseDefaultActiveMode(availableModes),
        capabilities: accountCapabilities,
        companies: accountMemberships,
      };
    })
    .sort((a, b) => {
      const aTime = Date.parse(a.account?.createdAt || "") || 0;
      const bTime = Date.parse(b.account?.createdAt || "") || 0;
      return bTime - aTime;
    });
}

async function findUnifiedAccountById(accountId) {
  const id = String(accountId ?? "").trim();
  if (!id) {
    return null;
  }
  const accounts = await listUnifiedAccounts();
  return accounts.find((entry) => entry.account?.id === id) || null;
}

async function findUnifiedAccountByEmail(email) {
  const normalized = String(email ?? "").trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  const accounts = await listUnifiedAccounts();
  return (
    accounts.find((entry) =>
      String(entry.account?.email ?? "").trim().toLowerCase() === normalized,
    ) || null
  );
}

function modeMatchesMembership(mode, membership) {
  if (!membership || !membership.company) {
    return false;
  }
  if (mode === "seller_admin") {
    return membership.company.type === "seller" &&
      (membership.membershipRole === "owner" || membership.membershipRole === "seller_admin");
  }
  if (mode === "supplier_admin") {
    return membership.company.type === "supplier" &&
      (membership.membershipRole === "owner" || membership.membershipRole === "supplier_admin");
  }
  if (mode === "employee") {
    return membership.membershipRole === "employee";
  }
  return false;
}

function buildSessionView(entry, options = {}) {
  if (!entry) {
    return null;
  }

  const requestedMode = String(options.activeMode ?? "").trim().toLowerCase();
  const requestedCompanyId = String(options.companyId ?? "").trim();
  const availableModes = Array.isArray(entry.availableModes) ? entry.availableModes : [];
  const activeMode = availableModes.includes(requestedMode)
    ? requestedMode
    : chooseDefaultActiveMode(availableModes);

  let activeMembership = null;
  if (requestedCompanyId) {
    activeMembership = (entry.companies || []).find((membership) =>
      membership.companyId === requestedCompanyId && modeMatchesMembership(activeMode, membership),
    ) || null;
  }
  if (!activeMembership) {
    activeMembership = (entry.companies || []).find((membership) =>
      membership.isPrimary && modeMatchesMembership(activeMode, membership),
    ) || null;
  }
  if (!activeMembership) {
    activeMembership = (entry.companies || []).find((membership) =>
      modeMatchesMembership(activeMode, membership),
    ) || null;
  }

  return {
    account: entry.account,
    availableModes,
    activeMode,
    activeCompanyId: activeMembership?.companyId || null,
    activeCompany: activeMembership?.company || null,
    capabilities: entry.capabilities || [],
    companies: entry.companies || [],
  };
}

async function resolveUnifiedSession({ accountId, email, activeMode, companyId } = {}) {
  const entry = accountId
    ? await findUnifiedAccountById(accountId)
    : await findUnifiedAccountByEmail(email);
  if (!entry) {
    return null;
  }
  return buildSessionView(entry, { activeMode, companyId });
}

module.exports = {
  isUnifiedAccountsReady,
  listAccountCapabilities,
  listCompanyMemberships,
  listUnifiedAccounts,
  findUnifiedAccountById,
  findUnifiedAccountByEmail,
  resolveUnifiedSession,
};
