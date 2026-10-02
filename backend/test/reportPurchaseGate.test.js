"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createCompanyReportsApi } = require("../services/companyReportsApi");
const { createListingReportsApi } = require("../services/listingReportsApi");

const SELLER = {
  id: "acct-seller",
  adminId: "admin-seller",
  companyId: "company-seller",
  email: "seller@example.com",
  companyName: "Seller Co",
};
const OTHER_SELLER = {
  id: "acct-other",
  adminId: "admin-other",
  companyId: "company-other",
  email: "other@example.com",
  companyName: "Other Co",
};
const PRODUCTS = [
  { id: "prod-bought", name: "Bought Item", adminId: SELLER.adminId, companyId: SELLER.companyId },
  { id: "prod-not-bought", name: "Not Bought", adminId: SELLER.adminId, companyId: SELLER.companyId },
  { id: "prod-other", name: "Other Item", adminId: OTHER_SELLER.adminId, companyId: OTHER_SELLER.companyId },
];
const ORDERS = [
  {
    id: "item-1",
    orderGroupId: "order-1",
    accountId: "buyer-1",
    adminId: SELLER.adminId,
    productId: "prod-bought",
    stage: "toShip",
  },
];

async function createDeps() {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "switch-report-gate-"));
  const accounts = [SELLER, OTHER_SELLER, { id: "buyer-1", email: "buyer1@example.com" }, { id: "buyer-2", email: "buyer2@example.com" }];
  return {
    DATA_DIR: dataDir,
    ensureStoragePaths: async () => {},
    writeJsonFileAtomically: async (file, value) => {
      await fs.writeFile(file, JSON.stringify(value));
    },
    enqueueSerializedMutation: async (_key, fn) => fn(),
    requireSuperAdmin: () => false,
    sendJson: (response, statusCode, body) => {
      response.statusCode = statusCode;
      response.body = body;
    },
    parseRequestBody: async (request) => request.body || {},
    findCompanyById: async (id) => {
      const seller = [SELLER, OTHER_SELLER].find(
        (entry) => entry.companyId === id || entry.adminId === id,
      );
      return seller ? { id: seller.companyId, name: seller.companyName, email: seller.email } : null;
    },
    readAccounts: async () => accounts,
    writeAccounts: async () => {},
    readProducts: async () => PRODUCTS,
    writeProducts: async () => {},
    readOrders: async ({ accountId = "" } = {}) =>
      ORDERS.filter((order) => !accountId || order.accountId === accountId),
    findAdminAccountByScopeId: (list, id) => list.find((entry) => entry.adminId === id) || null,
    getRecordAdminId: (record, fallback) => record?.adminId || fallback,
  };
}

async function call(api, handler, { method, url, accountId, body }) {
  const request = {
    method,
    body,
    authSession: accountId ? { accountId, email: `${accountId}@example.com` } : null,
    socket: { remoteAddress: "127.0.0.1" },
  };
  const response = {};
  const handled = await api[handler](request, response, new URL(url, "http://localhost"));
  assert.equal(handled, true);
  return response;
}

const LISTING_BODY = {
  reasonCategory: "misleading_listing",
  reasonText: "The photos do not match the item that was delivered to me.",
};
const COMPANY_BODY = {
  reasonCategory: "scam",
  reasonText: "The store asked me to pay outside Switch and never shipped.",
};

test("listing report requires the buyer to have ordered that product", async () => {
  const api = createListingReportsApi(await createDeps());
  const route = "tryHandleListingReportRoutes";

  const blocked = await call(api, route, {
    method: "POST",
    url: "/api/account/listing-reports",
    accountId: "buyer-1",
    body: { ...LISTING_BODY, productId: "prod-not-bought" },
  });
  assert.equal(blocked.statusCode, 403);
  assert.equal(blocked.body.code, "REPORT_REQUIRES_ORDER");

  const stranger = await call(api, route, {
    method: "POST",
    url: "/api/account/listing-reports",
    accountId: "buyer-2",
    body: { ...LISTING_BODY, productId: "prod-bought" },
  });
  assert.equal(stranger.statusCode, 403);

  const eligibility = await call(api, route, {
    method: "GET",
    url: "/api/account/listing-reports/eligibility?productId=prod-not-bought",
    accountId: "buyer-1",
  });
  assert.equal(eligibility.statusCode, 200);
  assert.equal(eligibility.body.eligible, false);

  const created = await call(api, route, {
    method: "POST",
    url: "/api/account/listing-reports",
    accountId: "buyer-1",
    body: { ...LISTING_BODY, productId: "prod-bought" },
  });
  assert.equal(created.statusCode, 201);
  assert.equal(created.body.ok, true);

  const afterReport = await call(api, route, {
    method: "GET",
    url: "/api/account/listing-reports/eligibility?productId=prod-bought",
    accountId: "buyer-1",
  });
  assert.equal(afterReport.body.eligible, false);
  assert.equal(afterReport.body.code, "REPORT_ALREADY_OPEN");
});

test("company report requires the buyer to have ordered from that store", async () => {
  const api = createCompanyReportsApi(await createDeps());
  const route = "tryHandleCompanyReportRoutes";

  const blocked = await call(api, route, {
    method: "POST",
    url: "/api/account/company-reports",
    accountId: "buyer-1",
    body: { ...COMPANY_BODY, adminId: OTHER_SELLER.adminId, companyId: OTHER_SELLER.companyId },
  });
  assert.equal(blocked.statusCode, 403);
  assert.equal(blocked.body.code, "REPORT_REQUIRES_ORDER");

  const stranger = await call(api, route, {
    method: "GET",
    url: `/api/account/company-reports/eligibility?adminId=${SELLER.adminId}`,
    accountId: "buyer-2",
  });
  assert.equal(stranger.body.eligible, false);
  assert.equal(stranger.body.code, "REPORT_REQUIRES_ORDER");

  const eligible = await call(api, route, {
    method: "GET",
    url: `/api/account/company-reports/eligibility?adminId=${SELLER.adminId}&companyId=${SELLER.companyId}`,
    accountId: "buyer-1",
  });
  assert.equal(eligible.body.eligible, true);

  const created = await call(api, route, {
    method: "POST",
    url: "/api/account/company-reports",
    accountId: "buyer-1",
    body: { ...COMPANY_BODY, adminId: SELLER.adminId, companyId: SELLER.companyId },
  });
  assert.equal(created.statusCode, 201);
  assert.equal(created.body.ok, true);
});
