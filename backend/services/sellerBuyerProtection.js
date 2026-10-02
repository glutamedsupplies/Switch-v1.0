"use strict";

const TICKET_CATEGORIES = Object.freeze({
  harassment: "Harassment or abusive chat",
  threats: "Threats or intimidation",
  malicious_messages: "Malicious buyer messages",
  fraud: "Fraud or scam attempt",
  fake_return: "Fake or abusive return",
  other: "Other buyer abuse",
});

const REVIEW_REPORT_CATEGORIES = Object.freeze({
  abusive_language: "Abusive or insulting review",
  unrelated: "Unrelated to the product",
  defamation: "Defamation or false claim",
  fake: "Fake or malicious review",
});

const OPEN_STATUSES = new Set(["pending", "reviewing"]);

function normalizeToken(value) {
  return String(value || "").trim();
}

function normalizeCategory(value, catalog) {
  const key = normalizeToken(value).toLowerCase().replace(/[\s-]+/g, "_");
  return catalog[key] ? key : "";
}

function sanitizeDetails(value, { min = 20, max = 2000 } = {}) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length < min) {
    return { ok: false, message: `Explain what happened in at least ${min} characters.` };
  }
  if (text.length > max) {
    return { ok: false, message: `Details must be ${max} characters or less.` };
  }
  return { ok: true, value: text };
}

function sanitizeEvidenceUrls(values) {
  const list = Array.isArray(values) ? values : [values];
  const next = [];
  const seen = new Set();
  for (const item of list) {
    const url = normalizeToken(item);
    if (!url || url.length > 800 || seen.has(url)) {
      continue;
    }
    const safe = url.startsWith("/uploads/")
      || /^https?:\/\//i.test(url);
    if (!safe || url.includes("..")) {
      continue;
    }
    seen.add(url);
    next.push(url);
    if (next.length >= 6) {
      break;
    }
  }
  return next;
}

function canSellerActOnBuyer({ sellerAccountId, buyerAccountId }) {
  const seller = normalizeToken(sellerAccountId).toLowerCase();
  const buyer = normalizeToken(buyerAccountId).toLowerCase();
  if (!seller) {
    return { ok: false, code: "AUTH_REQUIRED", message: "Sign in to the seller workspace." };
  }
  if (!buyer) {
    return { ok: false, code: "BUYER_REQUIRED", message: "Choose the buyer this case is about." };
  }
  if (seller === buyer) {
    return { ok: false, code: "OWN_ACCOUNT", message: "You cannot file a protection case against your own account." };
  }
  return { ok: true };
}

function hasOpenCase(records, { sellerAdminId, companyId, buyerAccountId, kind }) {
  const seller = normalizeToken(sellerAdminId).toLowerCase();
  const company = normalizeToken(companyId).toLowerCase();
  const buyer = normalizeToken(buyerAccountId).toLowerCase();
  return (Array.isArray(records) ? records : []).some((item) => {
    if (!OPEN_STATUSES.has(normalizeToken(item?.status).toLowerCase())) {
      return false;
    }
    if (kind && normalizeToken(item?.kind) !== kind) {
      return false;
    }
    const sameBuyer = normalizeToken(item?.buyerAccountId).toLowerCase() === buyer;
    const sameStore = normalizeToken(item?.adminId).toLowerCase() === seller
      || normalizeToken(item?.companyId).toLowerCase() === company;
    return sameBuyer && sameStore;
  });
}

function isBuyerBlockedByStore(blocks, { buyerAccountId, companyId, adminId }) {
  const buyer = normalizeToken(buyerAccountId).toLowerCase();
  const company = normalizeToken(companyId).toLowerCase();
  const admin = normalizeToken(adminId).toLowerCase();
  if (!buyer) {
    return false;
  }
  return (Array.isArray(blocks) ? blocks : []).some((block) => {
    if (normalizeToken(block?.buyerAccountId).toLowerCase() !== buyer) {
      return false;
    }
    const storeCompany = normalizeToken(block?.companyId).toLowerCase();
    const storeAdmin = normalizeToken(block?.adminId).toLowerCase();
    return (company && storeCompany === company) || (admin && storeAdmin === admin);
  });
}

function computeBuyerStoreRisk({ tickets = [], returns = 0, blocks = [], warningThreshold = 3 } = {}) {
  const openTickets = (Array.isArray(tickets) ? tickets : []).filter((item) =>
    OPEN_STATUSES.has(normalizeToken(item?.status).toLowerCase())
    || normalizeToken(item?.status).toLowerCase() === "upheld",
  );
  const uniqueReporters = new Set(
    openTickets.map((item) => normalizeToken(item?.adminId).toLowerCase()).filter(Boolean),
  );
  const returnCount = Math.max(0, Number(returns) || 0);
  const blockCount = Array.isArray(blocks) ? blocks.length : 0;
  const flagged = uniqueReporters.size >= 2 || returnCount >= warningThreshold || blockCount >= 1;
  return {
    openTicketCount: openTickets.length,
    uniqueSellerReports: uniqueReporters.size,
    returnCount,
    blockCount,
    flagged,
    reason: uniqueReporters.size >= 2
      ? "multiple_seller_tickets"
      : returnCount >= warningThreshold
        ? "repeat_returns"
        : blockCount
          ? "store_blocked"
          : "clear",
  };
}

function toBuyerReportRecord(ticket) {
  if (!ticket || typeof ticket !== "object") {
    return null;
  }
  return {
    id: ticket.id,
    source: "seller-protection",
    type: ticket.category || ticket.kind || "seller-ticket",
    reason: ticket.categoryLabel || ticket.reason || "Seller protection ticket",
    details: ticket.details,
    relatedOrderId: ticket.orderId || "",
    evidence: Array.isArray(ticket.evidenceUrls) ? ticket.evidenceUrls.join(", ") : "",
    evidenceUrls: ticket.evidenceUrls || [],
    status: ticket.status || "pending",
    adminDecision: ticket.reviewNote || "",
    companyId: ticket.companyId || "",
    companyName: ticket.companyName || "",
    adminId: ticket.adminId || "",
    createdAt: ticket.createdAt,
  };
}

module.exports = {
  TICKET_CATEGORIES,
  REVIEW_REPORT_CATEGORIES,
  OPEN_STATUSES,
  normalizeCategory,
  sanitizeDetails,
  sanitizeEvidenceUrls,
  canSellerActOnBuyer,
  hasOpenCase,
  isBuyerBlockedByStore,
  computeBuyerStoreRisk,
  toBuyerReportRecord,
};
