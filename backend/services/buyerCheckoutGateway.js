"use strict";

const crypto = require("crypto");
const {
  getHostedGatewayConfig,
  createHostedCheckoutSession,
  normalizeHostedPaymentMethodTypes,
  normalizePaymongoMethodType,
  inferPaymongoMethodType,
  verifyPaymongoWebhook,
} = require("./sellerCheckoutGateway");

function newPaymentIdempotencyKey(prefix = "buy") {
  return `${prefix}_${crypto.randomBytes(12).toString("hex")}`;
}

function newPaymentReference(prefix = "ORD") {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `${prefix}-${stamp}-${rand}`;
}

function resolveBuyerOrderGroupAmount(entries = []) {
  const amounts = (Array.isArray(entries) ? entries : [])
    .map((entry) => {
      const due = Number(entry?.amountToPayAmount);
      if (Number.isFinite(due) && due > 0.009) {
        return due;
      }
      const total = Number(entry?.grandTotalAmount);
      return Number.isFinite(total) && total > 0.009 ? total : 0;
    })
    .filter((amount) => amount > 0.009);
  if (!amounts.length) {
    return 0;
  }

  // The order model stores the same group total on every line item. Taking the
  // largest group value avoids multiplying the checkout amount by line count.
  return Math.max(...amounts);
}

function getPaymentPartnerName(partner) {
  return String(partner?.branch ?? partner?.name ?? "").replace(/\s+/g, " ").trim();
}

function isArchivedPaymentPartner(partner) {
  const status = String(partner?.status ?? "").trim().toLowerCase();
  return Boolean(String(partner?.archivedAt ?? "").trim())
    || status === "archived"
    || status === "deleted";
}

/**
 * Resolve the single PayMongo method a buyer's chosen payment partner is
 * locked to. The Super Admin's explicit mapping wins; well-known partner names
 * are a fallback so pre-existing partners keep working. Returns "" when the
 * partner cannot be mapped, which callers must treat as "do not charge".
 */
function resolvePaymentPartnerMethod({ partnerName, partners = [], adminId = "" }) {
  const nameKey = String(partnerName ?? "").replace(/\s+/g, " ").trim().toLowerCase();
  if (!nameKey) {
    return { method: "", partner: null };
  }
  const normalizedAdminId = String(adminId ?? "").trim().toLowerCase();
  const candidates = (Array.isArray(partners) ? partners : []).filter((partner) =>
    !isArchivedPaymentPartner(partner)
    && getPaymentPartnerName(partner).toLowerCase() === nameKey
  );
  const scopedMatch = normalizedAdminId
    ? candidates.find((partner) =>
      String(partner?.adminId ?? "").trim().toLowerCase() === normalizedAdminId
    )
    : null;
  const globalMatch = candidates.find((partner) => !String(partner?.adminId ?? "").trim());
  const partner = scopedMatch || globalMatch || null;
  const method = normalizePaymongoMethodType(partner?.paymongoMethod)
    || inferPaymongoMethodType(partner ? getPaymentPartnerName(partner) : partnerName);
  return { method, partner };
}

/**
 * Create a hosted PayMongo checkout for a buyer order group.
 * Buyer online checkout is deliberately fail-closed: an unconfigured payment
 * provider must never turn an unpaid order into a paid order.
 */
async function createBuyerOrderCheckoutSession({
  orderGroupId,
  amount,
  currencyCode = "PHP",
  paymentGateway = "",
  paymentMethodType = "",
  paymentReference,
  description = "Order payment",
  customerEmail = "",
  customerName = "",
  successUrl,
  cancelUrl,
  metadata = {},
  env = process.env,
  fetchImpl = fetch,
}) {
  const config = getHostedGatewayConfig(env);
  if (!config.enabled) {
    const error = new Error("PayMongo checkout is not configured.");
    error.code = "PAYMONGO_NOT_CONFIGURED";
    error.statusCode = 503;
    throw error;
  }

  const lockedMethod = normalizePaymongoMethodType(paymentMethodType);
  if (!lockedMethod) {
    const error = new Error(
      "This payment partner is not linked to a PayMongo payment method yet.",
    );
    error.code = "PAYMONGO_METHOD_UNMAPPED";
    error.statusCode = 400;
    throw error;
  }

  const checkoutIntent = {
    id: String(orderGroupId || "").trim(),
    planName: description,
    amount,
    currencyCode,
    paymentGateway,
    paymentMethodTypes: [lockedMethod],
    paymentReference:
      String(paymentReference || "").trim() || newPaymentReference(),
  };

  const hosted = await createHostedCheckoutSession({
    checkoutIntent,
    successUrl,
    cancelUrl,
    customerEmail,
    customerName,
    env,
    fetchImpl,
  });

  if (hosted.provider !== "paymongo" || !hosted.checkoutUrl || !hosted.externalId) {
    const error = new Error("PayMongo did not return a usable checkout session.");
    error.code = "PAYMONGO_CHECKOUT_INVALID";
    error.statusCode = 502;
    throw error;
  }

  return {
    ...hosted,
    paymentReference: checkoutIntent.paymentReference,
    paymentMethodTypes: hosted.paymentMethodTypes || [lockedMethod],
    metadata: {
      ...metadata,
      orderGroupId: checkoutIntent.id,
      paymentReference: checkoutIntent.paymentReference,
    },
  };
}

// Methods PayMongo can charge through a Payment Intent redirect, which sends
// the buyer straight to the wallet or bank instead of the hosted checkout page.
// Cards stay on hosted checkout because they need PayMongo's card form.
const DIRECT_PAYMENT_METHODS = Object.freeze({
  gcash: { type: "gcash" },
  paymaya: { type: "paymaya" },
  grab_pay: { type: "grab_pay" },
  shopee_pay: { type: "shopee_pay" },
  dob: { type: "dob", details: { bank_code: "bpi" } },
  dob_ubp: { type: "dob", details: { bank_code: "ubp" } },
  brankas_bdo: { type: "brankas", details: { bank_code: "bdo" } },
  brankas_landbank: { type: "brankas", details: { bank_code: "landbank" } },
  brankas_metrobank: { type: "brankas", details: { bank_code: "metrobank" } },
  brankas_rcbc: { type: "brankas", details: { bank_code: "rcbc" } },
});

const PAYMONGO_DIRECT_TIMEOUT_MS = 20000;

function isDirectPaymentMethod(method) {
  return Object.prototype.hasOwnProperty.call(
    DIRECT_PAYMENT_METHODS,
    normalizePaymongoMethodType(method),
  );
}

/**
 * Charge a buyer order group through a PayMongo Payment Intent and return the
 * wallet/bank authorization URL. Errors PayMongo rejects with a 4xx (for
 * example a bank not enabled on the account) are flagged `fallbackToCheckout`
 * so callers can retry with hosted checkout.
 */
async function createBuyerDirectPayment({
  orderGroupId,
  amount,
  currencyCode = "PHP",
  paymentMethodType,
  paymentReference,
  description = "Order payment",
  customerEmail = "",
  customerName = "",
  returnUrl,
  metadata = {},
  env = process.env,
  fetchImpl = fetch,
}) {
  const config = getHostedGatewayConfig(env);
  const method = normalizePaymongoMethodType(paymentMethodType);
  const spec = DIRECT_PAYMENT_METHODS[method];
  if (!config.enabled || !spec) {
    const error = new Error("Direct PayMongo payment is not available for this method.");
    error.statusCode = 400;
    error.fallbackToCheckout = true;
    throw error;
  }

  const reference = String(paymentReference || "").trim() || newPaymentReference();
  const authorization = `Basic ${Buffer.from(`${config.secretKey}:`).toString("base64")}`;

  async function call(apiPath, attributes) {
    let response;
    try {
      response = await fetchImpl(`https://api.paymongo.com/v1${apiPath}`, {
        method: "POST",
        headers: {
          Authorization: authorization,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ data: { attributes } }),
        signal: AbortSignal.timeout(PAYMONGO_DIRECT_TIMEOUT_MS),
      });
    } catch (fetchError) {
      const timedOut =
        fetchError?.name === "TimeoutError" || fetchError?.name === "AbortError";
      const error = new Error(
        timedOut
          ? "PayMongo took too long to respond. Please try again."
          : "Unable to reach PayMongo. Check the server internet connection.",
      );
      error.statusCode = timedOut ? 504 : 502;
      throw error;
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(
        payload?.errors?.[0]?.detail || "PayMongo rejected the payment request.",
      );
      error.statusCode = 502;
      error.code = "PAYMONGO_DIRECT_FAILED";
      error.fallbackToCheckout = response.status >= 400 && response.status < 500;
      throw error;
    }
    return payload?.data || {};
  }

  const stringMetadata = Object.fromEntries(
    Object.entries({ ...metadata, orderGroupId, paymentReference: reference })
      .map(([key, value]) => [key, String(value ?? "")])
      .filter(([, value]) => value),
  );

  const intent = await call("/payment_intents", {
    amount: centsFromAmount(amount),
    currency: String(currencyCode || "PHP").trim() || "PHP",
    payment_method_allowed: [spec.type],
    capture_type: "automatic",
    description: String(description || "Order payment").slice(0, 255),
    metadata: stringMetadata,
  });

  const billing = {};
  if (String(customerName).trim()) billing.name = String(customerName).trim();
  if (String(customerEmail).trim()) billing.email = String(customerEmail).trim();
  const paymentMethod = await call("/payment_methods", {
    type: spec.type,
    ...(spec.details ? { details: spec.details } : {}),
    ...(Object.keys(billing).length ? { billing } : {}),
  });

  const attached = await call(`/payment_intents/${intent.id}/attach`, {
    payment_method: paymentMethod.id,
    client_key: intent?.attributes?.client_key,
    return_url: returnUrl,
  });

  const redirectUrl = String(attached?.attributes?.next_action?.redirect?.url || "").trim();
  if (!redirectUrl) {
    const error = new Error("PayMongo did not return a payment authorization link.");
    error.statusCode = 502;
    error.fallbackToCheckout = true;
    throw error;
  }

  return {
    provider: "paymongo",
    checkoutUrl: redirectUrl,
    externalId: "",
    paymentIntentId: String(intent.id || "").trim(),
    paymentReference: reference,
    paymentMethodTypes: [method],
    livemode: Boolean(attached?.attributes?.livemode),
  };
}

function centsFromAmount(amount) {
  return Math.max(0, Math.round((Number(amount) || 0) * 100));
}

module.exports = {
  getHostedGatewayConfig,
  createBuyerDirectPayment,
  createBuyerOrderCheckoutSession,
  isDirectPaymentMethod,
  normalizeHostedPaymentMethodTypes,
  resolvePaymentPartnerMethod,
  verifyPaymongoWebhook,
  newPaymentIdempotencyKey,
  newPaymentReference,
  resolveBuyerOrderGroupAmount,
};
