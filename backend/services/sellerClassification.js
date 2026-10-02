"use strict";

const SELLER_KIND_INDIVIDUAL = "individual";
const SELLER_KIND_BUSINESS = "business";

const DOCUMENT_TYPE_LABELS = {
  valid_id: "Government-Issued ID",
  bank_proof: "Bank Account Proof",
  dti: "DTI Certificate",
  sec: "SEC Certificate",
  articles: "Articles of Incorporation",
  bir: "BIR Certificate of Registration",
  business_permit: "Business Permit",
  other: "Other document",
};

const ALLOWED_DOCUMENT_TYPES = new Set(Object.keys(DOCUMENT_TYPE_LABELS));

function normalizeSellerKind(value) {
  const token = String(value || "").trim().toLowerCase();
  if (["individual", "personal", "individual_seller", "sole"].includes(token)) {
    return SELLER_KIND_INDIVIDUAL;
  }
  if (
    [
      "business",
      "corporate",
      "business_corporate",
      "registered",
      "company",
    ].includes(token)
  ) {
    return SELLER_KIND_BUSINESS;
  }
  return "";
}

function sellerKindLabel(kind) {
  const normalized = normalizeSellerKind(kind);
  if (normalized === SELLER_KIND_INDIVIDUAL) {
    return "Individual Seller";
  }
  if (normalized === SELLER_KIND_BUSINESS) {
    return "Business / Corporate Seller";
  }
  return "";
}

function sellerKindShortCopy(kind) {
  const normalized = normalizeSellerKind(kind);
  if (normalized === SELLER_KIND_INDIVIDUAL) {
    return "Personal / walang rehistradong negosyo";
  }
  if (normalized === SELLER_KIND_BUSINESS) {
    return "May DTI / SEC";
  }
  return "";
}

function normalizeDocumentType(type) {
  const token = String(type || "").trim().toLowerCase();
  if (token === "government_id" || token === "gov_id" || token === "philsys") {
    return "valid_id";
  }
  if (token === "bank" || token === "bank_account") {
    return "bank_proof";
  }
  if (token === "sec_articles") {
    return "articles";
  }
  if (token === "cor" || token === "form_2303") {
    return "bir";
  }
  return ALLOWED_DOCUMENT_TYPES.has(token) ? token : "";
}

function documentTypeLabel(type) {
  const normalized = normalizeDocumentType(type) || String(type || "").trim().toLowerCase();
  return DOCUMENT_TYPE_LABELS[normalized] || "Document";
}

function normalizePayoutBank(input) {
  const raw = input && typeof input === "object" ? input : {};
  return {
    bankName: String(raw.bankName || raw.bank || "").replace(/\s+/g, " ").trim().slice(0, 80),
    accountName: String(raw.accountName || raw.holderName || "").replace(/\s+/g, " ").trim().slice(0, 120),
    accountNumber: String(raw.accountNumber || raw.number || "").replace(/\D/g, "").slice(0, 20),
  };
}

function hasPayoutBank(input) {
  const bank = normalizePayoutBank(input);
  return bank.bankName.length >= 2
    && bank.accountName.length >= 2
    && bank.accountNumber.length >= 6;
}

function maskAccountNumber(number) {
  const digits = String(number || "").replace(/\D/g, "");
  if (digits.length < 4) {
    return "";
  }
  return `•••• ${digits.slice(-4)}`;
}

function sanitizePayoutBankForAdmin(input) {
  const bank = normalizePayoutBank(input);
  if (!hasPayoutBank(bank)) {
    return null;
  }
  return {
    bankName: bank.bankName,
    accountName: bank.accountName,
    accountNumberMasked: maskAccountNumber(bank.accountNumber),
  };
}

function requiredDocumentGroups(kind) {
  const normalized = normalizeSellerKind(kind);
  if (normalized === SELLER_KIND_INDIVIDUAL) {
    return [
      { key: "valid_id", types: ["valid_id"], label: "Government-Issued ID" },
    ];
  }
  if (normalized === SELLER_KIND_BUSINESS) {
    return [
      { key: "registration", types: ["dti", "sec"], label: "DTI or SEC Certificate" },
      { key: "bir", types: ["bir"], label: "BIR Certificate of Registration" },
      { key: "valid_id", types: ["valid_id"], label: "Valid ID of owner or representative" },
    ];
  }
  return [];
}

function documentHasUsableFile(entry) {
  if (!entry || typeof entry !== "object") {
    return false;
  }
  const url = String(entry.url || entry.documentUrl || "").trim();
  const status = String(entry.reviewStatus || "pending").trim().toLowerCase();
  return Boolean(url) && status !== "rejected";
}

function evaluateSellerKyc({ sellerKind, documents, payoutBank } = {}) {
  const kind = normalizeSellerKind(sellerKind);
  const docs = Array.isArray(documents) ? documents : [];
  const missing = [];
  if (!kind) {
    missing.push("Seller type (Individual or Business / Corporate)");
  }
  if (!hasPayoutBank(payoutBank)) {
    missing.push(
      kind === SELLER_KIND_BUSINESS
        ? "Business bank account matching the registered name"
        : "Bank account in your name",
    );
  }
  for (const group of requiredDocumentGroups(kind)) {
    const present = docs.some((entry) => {
      const type = normalizeDocumentType(entry?.type);
      return group.types.includes(type) && documentHasUsableFile(entry);
    });
    if (!present) {
      missing.push(group.label);
    }
  }
  return {
    sellerKind: kind,
    sellerKindLabel: sellerKindLabel(kind),
    complete: missing.length === 0,
    missing,
    requiredGroups: requiredDocumentGroups(kind),
  };
}

function inferSellerKindFromDocuments(documents) {
  const docs = Array.isArray(documents) ? documents : [];
  const types = new Set(
    docs.map((entry) => normalizeDocumentType(entry?.type)).filter(Boolean),
  );
  if (types.has("dti") || types.has("sec") || types.has("bir") || types.has("business_permit")) {
    return SELLER_KIND_BUSINESS;
  }
  if (types.has("valid_id")) {
    return SELLER_KIND_INDIVIDUAL;
  }
  return "";
}

function resolveSellerKind(value, documents) {
  return normalizeSellerKind(value) || inferSellerKindFromDocuments(documents);
}

function assertSellerKindAllowedDocument(kind, type) {
  const normalizedKind = normalizeSellerKind(kind);
  const normalizedType = normalizeDocumentType(type);
  if (!normalizedType) {
    const error = new Error("Unsupported document type.");
    error.statusCode = 400;
    throw error;
  }
  if (!normalizedKind) {
    return normalizedType;
  }
  if (normalizedKind === SELLER_KIND_INDIVIDUAL && ["dti", "sec", "articles", "bir", "business_permit"].includes(normalizedType)) {
    const error = new Error("Individual sellers do not upload DTI, SEC, or BIR documents.");
    error.statusCode = 400;
    throw error;
  }
  return normalizedType;
}

module.exports = {
  SELLER_KIND_INDIVIDUAL,
  SELLER_KIND_BUSINESS,
  ALLOWED_DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABELS,
  normalizeSellerKind,
  sellerKindLabel,
  sellerKindShortCopy,
  normalizeDocumentType,
  documentTypeLabel,
  normalizePayoutBank,
  hasPayoutBank,
  maskAccountNumber,
  sanitizePayoutBankForAdmin,
  requiredDocumentGroups,
  evaluateSellerKyc,
  inferSellerKindFromDocuments,
  resolveSellerKind,
  assertSellerKindAllowedDocument,
};
