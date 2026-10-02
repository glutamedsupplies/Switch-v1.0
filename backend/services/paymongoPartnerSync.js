"use strict";

const {
  PAYMONGO_METHOD_LABELS,
  normalizePaymongoMethodType,
  inferPaymongoMethodType,
} = require("./sellerCheckoutGateway");

// Partner names (letters/digits only) that clearly mean one PayMongo method.
const PAYMONGO_METHOD_NAME_ALIASES = Object.freeze({
  gcash: ["gcash"],
  paymaya: ["maya", "paymaya"],
  grab_pay: ["grabpay", "grab"],
  shopee_pay: ["shopeepay", "shopee"],
  qrph: ["qrph"],
  card: ["card", "cards", "creditcard", "debitcard", "creditdebitcard"],
  billease: ["billease"],
  atome: ["atome"],
  dob: ["bpi", "bpionlinebanking"],
  dob_ubp: ["unionbank", "ubp", "unionbankonlinebanking"],
  brankas_bdo: ["bdo", "bdoonlinebanking"],
  brankas_landbank: ["landbank", "landbankonlinebanking"],
  brankas_metrobank: ["metrobank", "metrobankonlinebanking"],
  brankas_rcbc: ["rcbc", "rcbconlinebanking"],
});

function getPartnerName(partner) {
  return String(partner?.branch ?? partner?.name ?? "").replace(/\s+/g, " ").trim();
}

function getNameKey(value) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isArchived(partner) {
  const status = String(partner?.status ?? "").trim().toLowerCase();
  return Boolean(String(partner?.archivedAt ?? "").trim())
    || status === "archived"
    || status === "deleted";
}

function isActive(partner) {
  if (isArchived(partner)) {
    return false;
  }
  if (partner?.isActive === false || partner?.enabled === false || partner?.disabled === true) {
    return false;
  }
  return String(partner?.status ?? "active").trim().toLowerCase() !== "inactive";
}

function getPaymongoMethodLabel(method) {
  return PAYMONGO_METHOD_LABELS[method] || method;
}

// Rendered by scripts/fetch-payment-method-logos.js.
function getPaymongoMethodLogoUrl(method) {
  const key = normalizePaymongoMethodType(method);
  return key ? `/assets/payment-methods/${key}.png` : "";
}

function matchPaymongoMethodByName(partnerName) {
  const key = getNameKey(partnerName);
  if (!key) {
    return "";
  }
  for (const [method, aliases] of Object.entries(PAYMONGO_METHOD_NAME_ALIASES)) {
    if (aliases.includes(key) || getNameKey(PAYMONGO_METHOD_LABELS[method]) === key) {
      return method;
    }
  }
  return "";
}

function resolvePartnerPaymongoMethod(partner) {
  return normalizePaymongoMethodType(partner?.paymongoMethod)
    || inferPaymongoMethodType(getPartnerName(partner));
}

/**
 * Explains why a payment partner cannot be switched on, based on the last
 * PayMongo sync. Returns "" when activation is allowed or no sync exists yet.
 */
function getPaymongoActivationBlocker(partner, { availableMethods, syncedAt } = {}) {
  if (!String(syncedAt ?? "").trim() || !Array.isArray(availableMethods)) {
    return "";
  }
  const name = getPartnerName(partner) || "This payment partner";
  const method = resolvePartnerPaymongoMethod(partner);
  if (!method) {
    return `${name} is not linked to a PayMongo method. Edit it and choose one first.`;
  }
  if (!availableMethods.includes(method)) {
    return `${getPaymongoMethodLabel(method)} is not enabled on your PayMongo account. Enable it in the PayMongo dashboard, then sync again.`;
  }
  return "";
}

/**
 * Aligns global payment partners with the methods active on PayMongo:
 * links legacy partners by name, switches off partners PayMongo cannot charge,
 * and adds a switched-off partner for every available method not listed yet.
 * Seller-scoped and archived partners are left untouched.
 */
function reconcilePaymongoPartners({
  partners = [],
  availableMethods = [],
  createPartner,
  updatePartner = (partner) => partner,
}) {
  const available = new Set(
    (Array.isArray(availableMethods) ? availableMethods : [])
      .map(normalizePaymongoMethodType)
      .filter(Boolean),
  );
  const covered = new Set();
  const linked = [];
  const deactivated = [];
  const created = [];
  const logosAdded = [];

  const nextPartners = (Array.isArray(partners) ? partners : []).map((partner) => {
    if (!partner || typeof partner !== "object" || isArchived(partner)) {
      return partner;
    }
    if (String(partner.adminId ?? "").trim()) {
      return partner;
    }

    let next = partner;
    let method = normalizePaymongoMethodType(partner.paymongoMethod);
    let unavailableMethod = method;
    if (!method) {
      const matched = matchPaymongoMethodByName(getPartnerName(partner));
      unavailableMethod = matched;
      if (matched && available.has(matched)) {
        method = matched;
        next = { ...next, paymongoMethod: matched };
        linked.push({ id: partner.id, branch: getPartnerName(partner), method: matched });
      }
    }

    if (method && available.has(method)) {
      covered.add(method);
      if (!String(next.imageUrl ?? "").trim()) {
        next = { ...next, imageUrl: getPaymongoMethodLogoUrl(method) };
        logosAdded.push({ id: partner.id, branch: getPartnerName(partner), method });
      }
      return next === partner ? partner : updatePartner(next, partner);
    }

    if (isActive(next)) {
      next = {
        ...next,
        isActive: false,
        enabled: false,
        isEnabled: false,
        disabled: true,
        status: "inactive",
      };
      deactivated.push({
        id: partner.id,
        branch: getPartnerName(partner),
        method: unavailableMethod,
        reason: unavailableMethod ? "not-enabled-on-paymongo" : "not-linked",
      });
    }
    return next === partner ? partner : updatePartner(next, partner);
  });

  for (const method of available) {
    if (covered.has(method)) {
      continue;
    }
    const record = createPartner({ method, label: getPaymongoMethodLabel(method) });
    if (record) {
      nextPartners.push(record);
      created.push({ id: record.id, branch: getPartnerName(record), method });
    }
  }

  return { partners: nextPartners, linked, deactivated, created, logosAdded };
}

module.exports = {
  getPaymongoMethodLabel,
  getPaymongoMethodLogoUrl,
  getPaymongoActivationBlocker,
  matchPaymongoMethodByName,
  reconcilePaymongoPartners,
  resolvePartnerPaymongoMethod,
};
