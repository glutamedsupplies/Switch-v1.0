"use strict";

const crypto = require("crypto");
const {
  OPEN_STATUSES,
  COUNTED_STATUSES,
  sanitizeReasonText,
  sanitizeEvidenceUrls,
  isSafeEvidenceUrl,
  computeCompanyReportRisk,
  canBuyerFileReport,
  collectIdentityKeys,
  maskReporterLabel,
  reporterUserIdLabel,
  pickCompanyLogoUrl,
} = require("./companyReports");

const REASON_CATEGORIES = Object.freeze({
  misleading_listing: "Misleading photos or description",
  prohibited_item: "Prohibited or banned item",
  counterfeit: "Counterfeit or replica product",
  unsafe_product: "Unsafe or hazardous product",
  intellectual_property: "Intellectual property violation",
  price_bait: "Fake price or bait-and-switch listing",
  adult_or_illegal: "Adult, illegal, or harmful content",
  other_listing: "Other listing policy issue",
});

const REVIEW_DECISIONS = Object.freeze({
  dismiss: "dismissed",
  uphold: "upheld",
  restrict: "restricted",
});

const DEFAULT_RESTRICTION_THRESHOLD = 3;
const DEFAULT_MAJORITY_RATIO = 0.5;
const DEFAULT_MAJORITY_MIN_REPORTERS = 2;
const DEFAULT_RESTRICT_DAYS = 7;
const REPORT_ID_PREFIX = "LST";
const REPORT_ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const PUBLIC_REPORT_ID_PATTERN = /^LST-\d{6}-[A-Z2-9]{4}$/i;

function normalizeToken(value) {
  return String(value || "").trim();
}

function formatReportDateStamp(value) {
  const date = value instanceof Date ? value : new Date(value || Date.now());
  const safe = Number.isFinite(date.getTime()) ? date : new Date();
  const year = String(safe.getUTCFullYear()).slice(-2);
  const month = String(safe.getUTCMonth() + 1).padStart(2, "0");
  const day = String(safe.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function mapBytesToReportSuffix(bytes, length = 4) {
  const source = Buffer.isBuffer(bytes) ? bytes : Buffer.from(String(bytes || ""), "utf8");
  let suffix = "";
  for (let index = 0; index < length; index += 1) {
    suffix += REPORT_ID_ALPHABET[source[index % source.length] % REPORT_ID_ALPHABET.length];
  }
  return suffix;
}

function looksLikePublicListingReportId(value) {
  return PUBLIC_REPORT_ID_PATTERN.test(normalizeToken(value));
}

function normalizePublicListingReportId(value) {
  const token = normalizeToken(value).toUpperCase();
  return looksLikePublicListingReportId(token) ? token : "";
}

function collectExistingListingReportIds(reports) {
  const used = new Set();
  for (const report of Array.isArray(reports) ? reports : []) {
    const publicId = normalizePublicListingReportId(report?.reportId);
    const rawId = normalizeToken(report?.id).toUpperCase();
    if (publicId) {
      used.add(publicId);
    }
    if (rawId) {
      used.add(rawId);
    }
  }
  return used;
}

function allocateListingReportId(existingReports = [], createdAt = new Date()) {
  const used = existingReports instanceof Set
    ? existingReports
    : collectExistingListingReportIds(existingReports);
  const stamp = formatReportDateStamp(createdAt);
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const candidate = `${REPORT_ID_PREFIX}-${stamp}-${mapBytesToReportSuffix(crypto.randomBytes(8))}`;
    if (!used.has(candidate)) {
      used.add(candidate);
      return candidate;
    }
  }
  const fallback = `${REPORT_ID_PREFIX}-${stamp}-${mapBytesToReportSuffix(crypto.randomBytes(16), 6)}`;
  used.add(fallback);
  return fallback;
}

function deriveStableListingReportId(report) {
  const existing = normalizePublicListingReportId(report?.reportId)
    || normalizePublicListingReportId(report?.id);
  if (existing) {
    return existing;
  }
  const stamp = formatReportDateStamp(report?.createdAt);
  const digest = crypto
    .createHash("sha256")
    .update(String(report?.id || report?.createdAt || report?.productId || report?.reporterAccountId || "listing-report"))
    .digest();
  return `${REPORT_ID_PREFIX}-${stamp}-${mapBytesToReportSuffix(digest)}`;
}

function withPublicListingReportId(report, usedIds = null) {
  if (!report || typeof report !== "object") {
    return report;
  }
  const current = normalizePublicListingReportId(report.reportId);
  if (current) {
    usedIds?.add(current);
    return report.reportId === current ? report : { ...report, reportId: current };
  }
  let nextId = deriveStableListingReportId(report);
  if (usedIds?.has(nextId)) {
    nextId = allocateListingReportId(usedIds, report.createdAt);
  } else {
    usedIds?.add(nextId);
  }
  return { ...report, reportId: nextId };
}

function assignPublicListingReportIds(reports) {
  const list = Array.isArray(reports) ? reports : [];
  const used = collectExistingListingReportIds(list);
  let changed = false;
  const next = list.map((report) => {
    const assigned = withPublicListingReportId(report, used);
    if (assigned !== report || assigned?.reportId !== report?.reportId) {
      changed = true;
    }
    return assigned;
  });
  return { reports: next, changed };
}

function getPublicListingReportId(report) {
  return normalizePublicListingReportId(report?.reportId)
    || normalizePublicListingReportId(report?.id)
    || normalizeToken(report?.reportId || report?.id);
}

function listingReportMatchesPublicId(report, reportId) {
  const wanted = normalizeToken(reportId);
  if (!wanted) {
    return false;
  }
  const upper = wanted.toUpperCase();
  return normalizeToken(report?.id) === wanted
    || normalizeToken(report?.id).toUpperCase() === upper
    || normalizeToken(report?.reportId) === wanted
    || normalizeToken(report?.reportId).toUpperCase() === upper;
}

function normalizeListingReasonCategory(value) {
  const key = normalizeToken(value).toLowerCase().replace(/[\s-]+/g, "_");
  return REASON_CATEGORIES[key] ? key : "";
}

function listingReasonCategoryLabel(value) {
  const key = normalizeListingReasonCategory(value);
  return key ? REASON_CATEGORIES[key] : REASON_CATEGORIES.other_listing;
}

function canBuyerFileListingReport(input = {}) {
  const ownership = canBuyerFileReport(input);
  if (!ownership.ok) {
    return {
      ...ownership,
      message: ownership.code === "OWN_COMPANY"
        ? "You cannot report your own listing."
        : ownership.message === "Sign in to report a seller."
          ? "Sign in to report a listing."
          : ownership.message,
    };
  }
  if (!normalizeToken(input.productId)) {
    return { ok: false, code: "PRODUCT_REQUIRED", message: "Choose a listing to report." };
  }
  return { ok: true };
}

function hasOpenListingReportFromBuyer(reports, reporterAccountId, productId) {
  const reporter = normalizeToken(reporterAccountId).toLowerCase();
  const product = normalizeToken(productId).toLowerCase();
  if (!reporter || !product) {
    return false;
  }
  return (Array.isArray(reports) ? reports : []).some((report) => {
    const status = normalizeToken(report?.status).toLowerCase();
    if (!OPEN_STATUSES.has(status)) {
      return false;
    }
    if (normalizeToken(report?.reporterAccountId).toLowerCase() !== reporter) {
      return false;
    }
    return normalizeToken(report?.productId).toLowerCase() === product;
  });
}

function reportsForProduct(reports, productId) {
  const wanted = normalizeToken(productId).toLowerCase();
  if (!wanted) {
    return [];
  }
  return (Array.isArray(reports) ? reports : []).filter(
    (report) => normalizeToken(report?.productId).toLowerCase() === wanted,
  );
}

function computeListingReportRisk({
  reports = [],
  uniqueBuyerCount = 0,
  restrictionThreshold = DEFAULT_RESTRICTION_THRESHOLD,
  majorityRatio = DEFAULT_MAJORITY_RATIO,
  majorityMinReporters = DEFAULT_MAJORITY_MIN_REPORTERS,
} = {}) {
  const risk = computeCompanyReportRisk({
    reports,
    uniqueBuyerCount,
    warningThreshold: restrictionThreshold,
    majorityRatio,
    majorityMinReporters,
  });
  return {
    ...risk,
    restrictionThreshold: Math.max(2, Number(restrictionThreshold) || DEFAULT_RESTRICTION_THRESHOLD),
    needsRestriction: risk.needsWarning === true,
    needsWarning: false,
    reason: risk.reason === "many_unique_reporters"
      ? "many_unique_reporters"
      : risk.reason === "majority_buyers_reported"
        ? "majority_buyers_reported"
        : "review_only",
  };
}

function pickProductImageUrl(product = {}) {
  const record = product && typeof product === "object" ? product : {};
  const images = Array.isArray(record.images) ? record.images : [];
  const variants = Array.isArray(record.variants) ? record.variants : [];
  return [
    record.imageUrl,
    record.image,
    record.thumbnailUrl,
    record.coverImageUrl,
    images[0]?.url,
    images[0]?.imageUrl,
    images[0],
    variants[0]?.imageUrl,
  ]
    .map((value) => normalizeToken(value))
    .find(Boolean) || "";
}

function publicListingReportForBuyer(report) {
  if (!report || typeof report !== "object") {
    return null;
  }
  return {
    id: report.id,
    reportId: getPublicListingReportId(report),
    productId: report.productId,
    productName: report.productName,
    companyId: report.companyId,
    companyName: report.companyName,
    reasonCategory: report.reasonCategory,
    reasonLabel: listingReasonCategoryLabel(report.reasonCategory),
    status: report.status,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
  };
}

function adminListingReportView(report) {
  if (!report || typeof report !== "object") {
    return null;
  }
  return {
    ...report,
    reportId: getPublicListingReportId(report),
    reasonLabel: listingReasonCategoryLabel(report.reasonCategory),
    reporterLabel: reporterUserIdLabel(report),
    reporterName: String(report.reporterName || "").trim(),
    reporterEmail: String(report.reporterEmail || "").trim(),
    reporterUserId: String(
      report.reporterUserId
      || report.reporterAccountCode
      || report.accountCode
      || "",
    ).trim(),
    reporterAvatarUrl: String(
      report.reporterAvatarUrl
      || report.reporterProfileImageUrl
      || report.reporterPhotoUrl
      || "",
    ).trim(),
    reporterProfileImageUrl: String(report.reporterProfileImageUrl || report.reporterAvatarUrl || "").trim(),
    reporterPhotoUrl: String(report.reporterPhotoUrl || report.reporterAvatarUrl || "").trim(),
    productImageUrl: pickProductImageUrl({
      imageUrl: report.productImageUrl,
      images: report.productImageUrl ? [report.productImageUrl] : [],
    }),
    companyPictureUrl: pickCompanyLogoUrl({
      logoUrl: report.companyPictureUrl,
      companyPictureUrl: report.companyPictureUrl,
    }),
    scope: "listing",
  };
}

module.exports = {
  REASON_CATEGORIES,
  REVIEW_DECISIONS,
  OPEN_STATUSES,
  COUNTED_STATUSES,
  DEFAULT_RESTRICTION_THRESHOLD,
  DEFAULT_MAJORITY_RATIO,
  DEFAULT_MAJORITY_MIN_REPORTERS,
  DEFAULT_RESTRICT_DAYS,
  REPORT_ID_PREFIX,
  looksLikePublicListingReportId,
  normalizePublicListingReportId,
  allocateListingReportId,
  deriveStableListingReportId,
  withPublicListingReportId,
  assignPublicListingReportIds,
  getPublicListingReportId,
  listingReportMatchesPublicId,
  normalizeListingReasonCategory,
  listingReasonCategoryLabel,
  sanitizeReasonText,
  sanitizeEvidenceUrls,
  isSafeEvidenceUrl,
  canBuyerFileListingReport,
  collectIdentityKeys,
  hasOpenListingReportFromBuyer,
  reportsForProduct,
  computeListingReportRisk,
  pickProductImageUrl,
  pickCompanyLogoUrl,
  maskReporterLabel,
  publicListingReportForBuyer,
  adminListingReportView,
};
