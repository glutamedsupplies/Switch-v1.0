"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  normalizeReasonCategory,
  sanitizeReasonText,
  canBuyerFileReport,
  hasOpenReportFromBuyer,
  computeCompanyReportRisk,
  maskReporterLabel,
  allocateReportId,
  assignPublicReportIds,
  deriveStableReportId,
  getPublicReportId,
  looksLikePublicReportId,
  publicReportForBuyer,
  reportMatchesPublicId,
} = require("../services/companyReports");

test("rejects empty or unknown report categories", () => {
  assert.equal(normalizeReasonCategory("scam"), "scam");
  assert.equal(normalizeReasonCategory("non-delivery"), "non_delivery");
  assert.equal(normalizeReasonCategory("impersonation"), "impersonation");
  assert.equal(normalizeReasonCategory("off_platform"), "off_platform");
  assert.equal(normalizeReasonCategory("not-a-reason"), "");
});

test("company live reasons stay store-only and do not accept listing reasons", () => {
  const { reasonCategoryLabel } = require("../services/companyReports");
  assert.equal(normalizeReasonCategory("fake_listing"), "");
  assert.equal(normalizeReasonCategory("wrong_item"), "");
  assert.equal(normalizeReasonCategory("misleading_listing"), "");
  assert.equal(normalizeReasonCategory("counterfeit"), "");
  assert.equal(reasonCategoryLabel("fake_listing").includes("listing report"), true);
});

test("requires a real written reason before a report is accepted", () => {
  assert.equal(sanitizeReasonText("too short").ok, false);
  assert.equal(sanitizeReasonText("The seller took payment and never shipped the item I ordered.").ok, true);
});

test("buyers cannot report their own company", () => {
  const blocked = canBuyerFileReport({
    reporterAccountId: "acc-1",
    sellerAccountIds: ["acc-1", "company-9"],
  });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.code, "OWN_COMPANY");

  const allowed = canBuyerFileReport({
    reporterAccountId: "buyer-2",
    sellerAccountIds: ["acc-1"],
  });
  assert.equal(allowed.ok, true);

  const sameEmail = canBuyerFileReport({
    reporterAccountId: "buyer-9",
    reporterEmail: "owner@example.com",
    sellerEmails: ["owner@example.com"],
    sellerCompanyIds: ["co-1"],
  });
  assert.equal(sameEmail.ok, false);
  assert.equal(sameEmail.code, "OWN_COMPANY");

  const sameCompany = canBuyerFileReport({
    reporterAccountId: "buyer-9",
    reporterCompanyIds: ["co-1"],
    sellerCompanyIds: ["co-1"],
  });
  assert.equal(sameCompany.ok, false);
});

test("one open report per buyer and company stays in review", () => {
  const reports = [
    { reporterAccountId: "buyer-1", companyId: "co-1", adminId: "adm-1", status: "pending" },
  ];
  assert.equal(hasOpenReportFromBuyer(reports, "buyer-1", ["co-1"]), true);
  assert.equal(hasOpenReportFromBuyer(reports, "buyer-2", ["co-1"]), false);
});

test("one report never flags a company for warning", () => {
  const risk = computeCompanyReportRisk({
    reports: [
      { reporterAccountId: "buyer-1", status: "pending" },
    ],
    uniqueBuyerCount: 20,
    warningThreshold: 3,
  });
  assert.equal(risk.uniqueReporterCount, 1);
  assert.equal(risk.needsWarning, false);
  assert.equal(risk.reason, "review_only");
});

test("many distinct buyers trigger a needs-warning flag without auto-punish", () => {
  const risk = computeCompanyReportRisk({
    reports: [
      { reporterAccountId: "a", status: "pending" },
      { reporterAccountId: "b", status: "pending" },
      { reporterAccountId: "c", status: "upheld" },
    ],
    uniqueBuyerCount: 40,
    warningThreshold: 3,
  });
  assert.equal(risk.needsWarning, true);
  assert.equal(risk.volumeTrigger, true);
});

test("majority of buyers reporting also flags needs warning", () => {
  const risk = computeCompanyReportRisk({
    reports: [
      { reporterAccountId: "a", status: "pending" },
      { reporterAccountId: "b", status: "reviewing" },
    ],
    uniqueBuyerCount: 3,
    warningThreshold: 5,
    majorityRatio: 0.5,
    majorityMinReporters: 2,
  });
  assert.equal(risk.majorityTrigger, true);
  assert.equal(risk.needsWarning, true);
  assert.equal(risk.reason, "majority_buyers_reported");
});

test("masks buyer identity for Super Admin lists", () => {
  const label = maskReporterLabel("Maria Santos", "maria@example.com");
  assert.equal(label.startsWith("Ma"), true);
  assert.equal(label.includes("ria"), false);
});

test("allocates unique public report IDs buyers can quote", () => {
  const createdAt = "2026-09-24T02:00:00.000Z";
  const first = allocateReportId([], createdAt);
  const second = allocateReportId([{ reportId: first }], createdAt);
  assert.equal(looksLikePublicReportId(first), true);
  assert.equal(looksLikePublicReportId(second), true);
  assert.match(first, /^RPT-260924-[A-Z2-9]{4}$/);
  assert.notEqual(first, second);
});

test("backfills a stable Report ID for older company reports", () => {
  const legacy = {
    id: "cr_sample_warning_1",
    createdAt: "2026-09-23T08:00:00.000Z",
    reporterAccountId: "buyer-1",
    companyName: "Shawn Store",
    reasonCategory: "scam",
    status: "pending",
  };
  const assigned = assignPublicReportIds([legacy]);
  assert.equal(assigned.changed, true);
  assert.equal(looksLikePublicReportId(assigned.reports[0].reportId), true);
  assert.equal(assigned.reports[0].reportId, deriveStableReportId(legacy));
  assert.equal(getPublicReportId(assigned.reports[0]), assigned.reports[0].reportId);
  assert.equal(reportMatchesPublicId(assigned.reports[0], assigned.reports[0].reportId), true);
  assert.equal(reportMatchesPublicId(assigned.reports[0], "cr_sample_warning_1"), true);

  const buyerView = publicReportForBuyer(assigned.reports[0]);
  assert.equal(buyerView.reportId, assigned.reports[0].reportId);
});
