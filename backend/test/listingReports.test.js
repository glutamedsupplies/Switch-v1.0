"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  normalizeListingReasonCategory,
  listingReasonCategoryLabel,
  canBuyerFileListingReport,
  hasOpenListingReportFromBuyer,
  computeListingReportRisk,
  allocateListingReportId,
  assignPublicListingReportIds,
  deriveStableListingReportId,
  getPublicListingReportId,
  looksLikePublicListingReportId,
  listingReportMatchesPublicId,
  publicListingReportForBuyer,
  sanitizeReasonText,
} = require("../services/listingReports");
const { normalizeReasonCategory } = require("../services/companyReports");

test("listing report categories stay product-scoped and do not overlap seller categories", () => {
  assert.equal(normalizeListingReasonCategory("misleading-listing"), "misleading_listing");
  assert.equal(normalizeListingReasonCategory("prohibited_item"), "prohibited_item");
  assert.equal(normalizeListingReasonCategory("counterfeit"), "counterfeit");
  assert.equal(normalizeListingReasonCategory("scam"), "");
  assert.equal(normalizeListingReasonCategory("non_delivery"), "");
  assert.equal(normalizeListingReasonCategory("harassment"), "");
  assert.equal(normalizeListingReasonCategory("impersonation"), "");
  assert.equal(normalizeListingReasonCategory("off_platform"), "");
  assert.equal(listingReasonCategoryLabel("unsafe_product"), "Unsafe or hazardous product");
  assert.equal(normalizeReasonCategory("misleading_listing"), "");
  assert.equal(normalizeReasonCategory("counterfeit"), "");
});

test("requires a written listing reason before a report is accepted", () => {
  assert.equal(sanitizeReasonText("too short").ok, false);
  assert.equal(
    sanitizeReasonText("The photos show a branded charger but the description hides that this is a replica.").ok,
    true,
  );
});

test("buyers cannot report their own listing", () => {
  const blocked = canBuyerFileListingReport({
    reporterAccountId: "acc-1",
    sellerAccountIds: ["acc-1"],
    productId: "p-1",
  });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.code, "OWN_COMPANY");
  assert.match(blocked.message, /own listing/i);

  const missingProduct = canBuyerFileListingReport({
    reporterAccountId: "buyer-2",
    sellerAccountIds: ["acc-1"],
  });
  assert.equal(missingProduct.ok, false);
  assert.equal(missingProduct.code, "PRODUCT_REQUIRED");

  const allowed = canBuyerFileListingReport({
    reporterAccountId: "buyer-2",
    sellerAccountIds: ["acc-1"],
    productId: "p-9",
  });
  assert.equal(allowed.ok, true);
});

test("one open listing report per buyer and product stays in review", () => {
  const reports = [
    { reporterAccountId: "buyer-1", productId: "p-1", status: "pending" },
  ];
  assert.equal(hasOpenListingReportFromBuyer(reports, "buyer-1", "p-1"), true);
  assert.equal(hasOpenListingReportFromBuyer(reports, "buyer-1", "p-2"), false);
  assert.equal(hasOpenListingReportFromBuyer(reports, "buyer-2", "p-1"), false);
});

test("one listing report never flags a product for restriction", () => {
  const risk = computeListingReportRisk({
    reports: [{ reporterAccountId: "buyer-1", status: "pending" }],
    uniqueBuyerCount: 20,
    restrictionThreshold: 3,
  });
  assert.equal(risk.uniqueReporterCount, 1);
  assert.equal(risk.needsRestriction, false);
  assert.equal(risk.needsWarning, false);
  assert.equal(risk.reason, "review_only");
});

test("many distinct buyers trigger a listing restriction review without auto-hide", () => {
  const risk = computeListingReportRisk({
    reports: [
      { reporterAccountId: "a", status: "pending" },
      { reporterAccountId: "b", status: "pending" },
      { reporterAccountId: "c", status: "upheld" },
    ],
    uniqueBuyerCount: 40,
    restrictionThreshold: 3,
  });
  assert.equal(risk.needsRestriction, true);
  assert.equal(risk.volumeTrigger, true);
});

test("allocates unique listing Report IDs that stay distinct from company RPT IDs", () => {
  const createdAt = "2026-09-24T02:00:00.000Z";
  const first = allocateListingReportId([], createdAt);
  const second = allocateListingReportId([{ reportId: first }], createdAt);
  assert.equal(looksLikePublicListingReportId(first), true);
  assert.equal(looksLikePublicListingReportId(second), true);
  assert.match(first, /^LST-260924-[A-Z2-9]{4}$/);
  assert.notEqual(first, second);
  assert.equal(/^RPT-/.test(first), false);
});

test("backfills a stable listing Report ID for older records", () => {
  const legacy = {
    id: "lr_sample_1",
    createdAt: "2026-09-23T08:00:00.000Z",
    reporterAccountId: "buyer-1",
    productId: "p-1",
    productName: "Wireless earbuds",
    reasonCategory: "misleading_listing",
    status: "pending",
  };
  const assigned = assignPublicListingReportIds([legacy]);
  assert.equal(assigned.changed, true);
  assert.equal(looksLikePublicListingReportId(assigned.reports[0].reportId), true);
  assert.equal(assigned.reports[0].reportId, deriveStableListingReportId(legacy));
  assert.equal(getPublicListingReportId(assigned.reports[0]), assigned.reports[0].reportId);
  assert.equal(listingReportMatchesPublicId(assigned.reports[0], assigned.reports[0].reportId), true);
  assert.equal(listingReportMatchesPublicId(assigned.reports[0], "lr_sample_1"), true);

  const buyerView = publicListingReportForBuyer(assigned.reports[0]);
  assert.equal(buyerView.reportId, assigned.reports[0].reportId);
  assert.equal(buyerView.productId, "p-1");
});
