"use strict";

const crypto = require("crypto");

const REASON_CATEGORIES = Object.freeze({
  scam: "Scam or fraud by this store",
  non_delivery: "Paid but the store did not deliver",
  impersonation: "Fake store or impersonation",
  harassment: "Harassment or abuse from the store",
  off_platform: "Pressed to pay or chat off Switch",
  other: "Other store policy issue",
});

const LEGACY_REASON_CATEGORIES = Object.freeze({
  fake_listing: "Fake or misleading listing (now a listing report)",
  wrong_item: "Wrong or counterfeit item (now a listing report)",
});

const OPEN_STATUSES = new Set(["pending", "reviewing", "upheld"]);
const COUNTED_STATUSES = new Set(["pending", "reviewing", "upheld", "warned"]);
const REVIEW_DECISIONS = Object.freeze({
  dismiss: "dismissed",
  uphold: "upheld",
  warn: "warned",
});

const DEFAULT_WARNING_THRESHOLD = 3;
const DEFAULT_MAJORITY_RATIO = 0.5;
const DEFAULT_MAJORITY_MIN_REPORTERS = 2;
const MIN_REASON_LENGTH = 20;
const MAX_REASON_LENGTH = 2000;
const MAX_EVIDENCE_URLS = 4;
const REPORT_ID_PREFIX = "RPT";
const REPORT_ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const PUBLIC_REPORT_ID_PATTERN = /^RPT-\d{6}-[A-Z2-9]{4}$/i;

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

function looksLikePublicReportId(value) {
  return PUBLIC_REPORT_ID_PATTERN.test(normalizeToken(value));
}

function normalizePublicReportId(value) {
  const token = normalizeToken(value).toUpperCase();
  return looksLikePublicReportId(token) ? token : "";
}

function collectExistingReportIds(reports) {
  const used = new Set();
  for (const report of Array.isArray(reports) ? reports : []) {
    const publicId = normalizePublicReportId(report?.reportId);
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

function allocateReportId(existingReports = [], createdAt = new Date()) {
  const used = existingReports instanceof Set
    ? existingReports
    : collectExistingReportIds(existingReports);
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

function deriveStableReportId(report) {
  const existing = normalizePublicReportId(report?.reportId) || normalizePublicReportId(report?.id);
  if (existing) {
    return existing;
  }
  const stamp = formatReportDateStamp(report?.createdAt);
  const digest = crypto
    .createHash("sha256")
    .update(String(report?.id || report?.createdAt || report?.reporterAccountId || "report"))
    .digest();
  return `${REPORT_ID_PREFIX}-${stamp}-${mapBytesToReportSuffix(digest)}`;
}

function withPublicReportId(report, usedIds = null) {
  if (!report || typeof report !== "object") {
    return report;
  }
  const current = normalizePublicReportId(report.reportId);
  if (current) {
    usedIds?.add(current);
    return report.reportId === current ? report : { ...report, reportId: current };
  }
  let nextId = deriveStableReportId(report);
  if (usedIds?.has(nextId)) {
    nextId = allocateReportId(usedIds, report.createdAt);
  } else {
    usedIds?.add(nextId);
  }
  return { ...report, reportId: nextId };
}

function assignPublicReportIds(reports) {
  const list = Array.isArray(reports) ? reports : [];
  const used = collectExistingReportIds(list);
  let changed = false;
  const next = list.map((report) => {
    const assigned = withPublicReportId(report, used);
    if (assigned !== report || assigned?.reportId !== report?.reportId) {
      changed = true;
    }
    return assigned;
  });
  return { reports: next, changed };
}

function getPublicReportId(report) {
  return normalizePublicReportId(report?.reportId)
    || normalizePublicReportId(report?.id)
    || normalizeToken(report?.reportId || report?.id);
}

function reportMatchesPublicId(report, reportId) {
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

function normalizeReasonCategory(value, { allowLegacy = false } = {}) {
  const key = normalizeToken(value).toLowerCase().replace(/[\s-]+/g, "_");
  if (REASON_CATEGORIES[key]) {
    return key;
  }
  if (allowLegacy && LEGACY_REASON_CATEGORIES[key]) {
    return key;
  }
  return "";
}

function reasonCategoryLabel(value) {
  const key = normalizeToken(value).toLowerCase().replace(/[\s-]+/g, "_");
  return REASON_CATEGORIES[key]
    || LEGACY_REASON_CATEGORIES[key]
    || REASON_CATEGORIES.other;
}

function sanitizeReasonText(value) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length < MIN_REASON_LENGTH) {
    return {
      ok: false,
      message: `Explain what happened in at least ${MIN_REASON_LENGTH} characters so Super Admin can review the case.`,
    };
  }
  if (text.length > MAX_REASON_LENGTH) {
    return {
      ok: false,
      message: `Report details must be ${MAX_REASON_LENGTH} characters or less.`,
    };
  }
  return { ok: true, value: text };
}

function isSafeEvidenceUrl(url) {
  const raw = normalizeToken(url);
  if (!raw || raw.length > 800) {
    return false;
  }
  if (raw.startsWith("/uploads/")) {
    return !raw.includes("..");
  }
  try {
    const parsed = new URL(raw);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch (_) {
    return false;
  }
}

function sanitizeEvidenceUrls(values) {
  const list = Array.isArray(values) ? values : [values];
  const next = [];
  const seen = new Set();
  for (const item of list) {
    const url = normalizeToken(item);
    if (!isSafeEvidenceUrl(url) || seen.has(url)) {
      continue;
    }
    seen.add(url);
    next.push(url);
    if (next.length >= MAX_EVIDENCE_URLS) {
      break;
    }
  }
  return next;
}

function getActiveReporterIds(reports, { includeWarned = true } = {}) {
  const allowed = includeWarned ? COUNTED_STATUSES : OPEN_STATUSES;
  const ids = new Set();
  for (const report of Array.isArray(reports) ? reports : []) {
    if (!allowed.has(normalizeToken(report?.status).toLowerCase())) {
      continue;
    }
    const id = normalizeToken(report?.reporterAccountId).toLowerCase();
    if (id) {
      ids.add(id);
    }
  }
  return [...ids];
}

function countReportsByStatus(reports) {
  const counts = {
    pending: 0,
    reviewing: 0,
    dismissed: 0,
    upheld: 0,
    warned: 0,
    total: 0,
  };
  for (const report of Array.isArray(reports) ? reports : []) {
    const status = normalizeToken(report?.status).toLowerCase();
    if (Object.prototype.hasOwnProperty.call(counts, status)) {
      counts[status] += 1;
    }
    counts.total += 1;
  }
  return counts;
}

function computeCompanyReportRisk({
  reports = [],
  uniqueBuyerCount = 0,
  warningThreshold = DEFAULT_WARNING_THRESHOLD,
  majorityRatio = DEFAULT_MAJORITY_RATIO,
  majorityMinReporters = DEFAULT_MAJORITY_MIN_REPORTERS,
} = {}) {
  const uniqueReporters = getActiveReporterIds(reports);
  const uniqueReporterCount = uniqueReporters.length;
  const counts = countReportsByStatus(reports);
  const openCount = counts.pending + counts.reviewing + counts.upheld;
  const buyers = Math.max(0, Number(uniqueBuyerCount) || 0);
  const threshold = Math.max(2, Number(warningThreshold) || DEFAULT_WARNING_THRESHOLD);
  const ratio = Math.min(1, Math.max(0.2, Number(majorityRatio) || DEFAULT_MAJORITY_RATIO));
  const majorityFloor = Math.max(2, Number(majorityMinReporters) || DEFAULT_MAJORITY_MIN_REPORTERS);
  const volumeTrigger = uniqueReporterCount >= threshold;
  const majorityTrigger =
    buyers > 0
    && uniqueReporterCount >= majorityFloor
    && uniqueReporterCount / buyers >= ratio;

  return {
    uniqueReporterCount,
    uniqueBuyerCount: buyers,
    pendingCount: counts.pending + counts.reviewing,
    upheldCount: counts.upheld,
    warnedCount: counts.warned,
    openCount,
    totalCount: counts.total,
    volumeTrigger,
    majorityTrigger,
    needsWarning: volumeTrigger || majorityTrigger,
    reason: majorityTrigger && !volumeTrigger
      ? "majority_buyers_reported"
      : volumeTrigger
        ? "many_unique_reporters"
        : "review_only",
  };
}

function collectIdentityKeys(values) {
  const list = Array.isArray(values) ? values : [values];
  const keys = new Set();
  for (const value of list) {
    if (Array.isArray(value)) {
      for (const nested of collectIdentityKeys(value)) {
        keys.add(nested);
      }
      continue;
    }
    const key = normalizeToken(value).toLowerCase();
    if (key) {
      keys.add(key);
    }
  }
  return keys;
}

function canBuyerFileReport({
  reporterAccountId,
  reporterEmail,
  reporterCompanyIds = [],
  sellerAccountIds = [],
  sellerEmails = [],
  sellerCompanyIds = [],
} = {}) {
  const reporter = normalizeToken(reporterAccountId);
  if (!reporter) {
    return { ok: false, code: "AUTH_REQUIRED", message: "Sign in to report this company." };
  }
  const reporterKeys = collectIdentityKeys([
    reporterAccountId,
    reporterEmail,
    reporterCompanyIds,
  ]);
  const sellerKeys = collectIdentityKeys([
    sellerAccountIds,
    sellerEmails,
    sellerCompanyIds,
  ]);
  for (const key of reporterKeys) {
    if (sellerKeys.has(key)) {
      return { ok: false, code: "OWN_COMPANY", message: "You cannot report your own company." };
    }
  }
  return { ok: true };
}

function pickCompanyLogoUrl(source = {}, userPhotoUrl = "") {
  const record = source && typeof source === "object" ? source : {};
  const profileData = record.profileData && typeof record.profileData === "object"
    ? record.profileData
    : {};
  if (record.businessLogoSkipped === true || profileData.businessLogoSkipped === true) {
    return "";
  }
  const userPhoto = normalizeToken(userPhotoUrl);
  return [
    record.logoUrl,
    record.companyPictureUrl,
    record.companyProfileImageUrl,
    record.businessLogoUrl,
    profileData.logoUrl,
    profileData.companyPictureUrl,
    profileData.businessLogoUrl,
  ]
    .map((value) => normalizeToken(value))
    .find((value) => value && value !== userPhoto) || "";
}

function hasOpenReportFromBuyer(reports, reporterAccountId, companyKeys = []) {
  const reporter = normalizeToken(reporterAccountId).toLowerCase();
  const keys = new Set(
    (Array.isArray(companyKeys) ? companyKeys : [companyKeys])
      .map((value) => normalizeToken(value).toLowerCase())
      .filter(Boolean),
  );
  if (!reporter || !keys.size) {
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
    return keys.has(normalizeToken(report?.companyId).toLowerCase())
      || keys.has(normalizeToken(report?.adminId).toLowerCase());
  });
}

function maskReporterLabel(name, email) {
  const display = normalizeToken(name) || (String(email || "").includes("@")
    ? String(email).split("@")[0]
    : "");
  if (!display) {
    return "Buyer";
  }
  if (display.length <= 2) {
    return `${display[0] || "B"}*`;
  }
  return `${display.slice(0, 2)}${"•".repeat(Math.min(4, display.length - 2))}`;
}

function reporterUserIdLabel(report) {
  const publicUserId = String(
    report?.reporterUserId
    || report?.reporterAccountCode
    || report?.accountCode
    || "",
  ).trim();
  if (publicUserId && !/^sample-buyer-/i.test(publicUserId)) {
    return publicUserId;
  }
  const id = String(
    report?.reporterAccountId
    || report?.userId
    || report?.accountId
    || "",
  ).trim();
  if (id && !/^sample-buyer-/i.test(id)) {
    return id;
  }
  return publicUserId || id || "Unknown user";
}

function publicReportForBuyer(report) {
  if (!report || typeof report !== "object") {
    return null;
  }
  return {
    id: report.id,
    reportId: getPublicReportId(report),
    scope: "company",
    companyId: report.companyId,
    companyName: report.companyName,
    reasonCategory: report.reasonCategory,
    reasonLabel: reasonCategoryLabel(report.reasonCategory),
    status: report.status,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
  };
}

function adminReportView(report) {
  if (!report || typeof report !== "object") {
    return null;
  }
  return {
    ...report,
    scope: "company",
    reportId: getPublicReportId(report),
    reasonLabel: reasonCategoryLabel(report.reasonCategory),
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
    companyPictureUrl: pickCompanyLogoUrl({
      logoUrl: report.companyPictureUrl,
      companyPictureUrl: report.companyPictureUrl,
    }),
  };
}

module.exports = {
  REASON_CATEGORIES,
  LEGACY_REASON_CATEGORIES,
  OPEN_STATUSES,
  COUNTED_STATUSES,
  REVIEW_DECISIONS,
  DEFAULT_WARNING_THRESHOLD,
  DEFAULT_MAJORITY_RATIO,
  DEFAULT_MAJORITY_MIN_REPORTERS,
  MIN_REASON_LENGTH,
  MAX_REASON_LENGTH,
  MAX_EVIDENCE_URLS,
  REPORT_ID_PREFIX,
  looksLikePublicReportId,
  normalizePublicReportId,
  allocateReportId,
  deriveStableReportId,
  withPublicReportId,
  assignPublicReportIds,
  getPublicReportId,
  reportMatchesPublicId,
  normalizeReasonCategory,
  reasonCategoryLabel,
  sanitizeReasonText,
  isSafeEvidenceUrl,
  sanitizeEvidenceUrls,
  getActiveReporterIds,
  countReportsByStatus,
  computeCompanyReportRisk,
  canBuyerFileReport,
  collectIdentityKeys,
  pickCompanyLogoUrl,
  hasOpenReportFromBuyer,
  maskReporterLabel,
  reporterUserIdLabel,
  publicReportForBuyer,
  adminReportView,
};
