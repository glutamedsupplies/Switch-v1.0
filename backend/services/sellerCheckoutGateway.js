"use strict";

const crypto = require("crypto");

// Kept below the app's 30s response timeout so the buyer sees the real error.
const PAYMONGO_REQUEST_TIMEOUT_MS = 20000;

function getHostedGatewayConfig(env = process.env) {
  const secretKey = String(env.PAYMONGO_SECRET_KEY ?? "").trim();
  const webhookSecret = String(env.PAYMONGO_WEBHOOK_SECRET ?? "").trim();
  const provider = secretKey ? "paymongo" : "manual";
  return {
    provider,
    secretKey,
    webhookSecret,
    enabled: Boolean(secretKey),
    testMode: secretKey.startsWith("sk_test_"),
  };
}

// Values accepted by PayMongo's checkout_sessions `payment_method_types`.
const PAYMONGO_CHECKOUT_METHOD_TYPES = Object.freeze([
  "gcash",
  "paymaya",
  "grab_pay",
  "shopee_pay",
  "qrph",
  "card",
  "billease",
  "atome",
  "dob",
  "dob_ubp",
  "brankas_bdo",
  "brankas_landbank",
  "brankas_metrobank",
  "brankas_rcbc",
]);

const PAYMONGO_METHOD_LABELS = Object.freeze({
  gcash: "GCash",
  paymaya: "Maya",
  grab_pay: "GrabPay",
  shopee_pay: "ShopeePay",
  qrph: "QR Ph",
  card: "Credit / Debit Card",
  billease: "BillEase",
  atome: "Atome",
  dob: "BPI Online Banking",
  dob_ubp: "UnionBank Online Banking",
  brankas_bdo: "BDO Online Banking",
  brankas_landbank: "Landbank Online Banking",
  brankas_metrobank: "Metrobank Online Banking",
  brankas_rcbc: "RCBC Online Banking",
});

function normalizePaymongoMethodType(value) {
  const key = String(value ?? "").trim().toLowerCase();
  return PAYMONGO_CHECKOUT_METHOD_TYPES.includes(key) ? key : "";
}

function inferPaymongoMethodType(partnerName) {
  const key = String(partnerName ?? "").trim().toLowerCase();
  if (!key) {
    return "";
  }
  if (key.includes("gcash")) {
    return "gcash";
  }
  if (key.includes("maya") || key.includes("paymaya")) {
    return "paymaya";
  }
  if (key.includes("grab")) {
    return "grab_pay";
  }
  if (key.includes("shopee")) {
    return "shopee_pay";
  }
  if (
    key.includes("card")
    || key.includes("visa")
    || key.includes("mastercard")
  ) {
    return "card";
  }
  if (key.includes("bpi")) {
    return "dob";
  }
  if (key.includes("unionbank")) {
    return "dob_ubp";
  }
  if (key.includes("bdo")) {
    return "brankas_bdo";
  }
  if (key.includes("landbank")) {
    return "brankas_landbank";
  }
  if (key.includes("metrobank")) {
    return "brankas_metrobank";
  }
  if (key.includes("rcbc")) {
    return "brankas_rcbc";
  }
  return "";
}

function normalizeHostedPaymentMethodTypes(paymentGateway) {
  const inferred = inferPaymongoMethodType(paymentGateway);
  return inferred ? [inferred] : ["gcash", "paymaya", "card", "qrph"];
}

function resolveCheckoutPaymentMethodTypes(checkoutIntent) {
  const explicit = (Array.isArray(checkoutIntent?.paymentMethodTypes)
    ? checkoutIntent.paymentMethodTypes
    : [])
    .map(normalizePaymongoMethodType)
    .filter(Boolean);
  return explicit.length
    ? [...new Set(explicit)]
    : normalizeHostedPaymentMethodTypes(checkoutIntent?.paymentGateway);
}

function centsFromAmount(amount) {
  return Math.max(0, Math.round((Number(amount) || 0) * 100));
}

async function createHostedCheckoutSession({
  checkoutIntent,
  successUrl,
  cancelUrl,
  customerEmail = "",
  customerName = "",
  env = process.env,
  fetchImpl = fetch,
}) {
  const config = getHostedGatewayConfig(env);
  if (!config.enabled) {
    return {
      provider: "manual",
      checkoutUrl: checkoutIntent?.checkoutUrl || "",
      externalId: "",
      paymentMethodTypes: resolveCheckoutPaymentMethodTypes(checkoutIntent),
      livemode: false,
    };
  }

  const body = {
    data: {
      attributes: {
        line_items: [
          {
            name: `${checkoutIntent?.planName || "Seller"} monthly company slot`,
            amount: centsFromAmount(checkoutIntent?.amount),
            currency: String(checkoutIntent?.currencyCode || "PHP").trim() || "PHP",
            quantity: 1,
          },
        ],
        payment_method_types: resolveCheckoutPaymentMethodTypes(checkoutIntent),
        success_url: successUrl,
        cancel_url: cancelUrl,
        reference_number:
          String(checkoutIntent?.paymentReference || checkoutIntent?.id || "").trim(),
        send_email_receipt: Boolean(customerEmail),
        metadata: {
          checkoutIntentId: checkoutIntent?.id || "",
          companyId: checkoutIntent?.companyId || "",
          accountId: checkoutIntent?.accountId || "",
        },
      },
    },
  };

  if (customerEmail || customerName) {
    body.data.attributes.customer_email = customerEmail || undefined;
    body.data.attributes.description =
      customerName || "Seller plan activation";
  }

  let response;
  try {
    response = await fetchImpl("https://api.paymongo.com/v2/checkout_sessions", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${config.secretKey}:`).toString("base64")}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(PAYMONGO_REQUEST_TIMEOUT_MS),
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
    error.code = "PAYMONGO_CHECKOUT_UNREACHABLE";
    throw error;
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      payload?.errors?.[0]?.detail ||
      payload?.errors?.[0]?.title ||
      payload?.message ||
      "Unable to create PayMongo checkout session.";
    const error = new Error(message);
    error.statusCode = 502;
    error.code = "PAYMONGO_CHECKOUT_FAILED";
    throw error;
  }

  const data = payload?.data || {};
  const attributes = data?.attributes || {};
  const externalId = String(data.id || "").trim();
  const checkoutUrl = String(attributes.checkout_url || "").trim();
  if (!externalId || !checkoutUrl) {
    const error = new Error("PayMongo returned an incomplete checkout session.");
    error.statusCode = 502;
    error.code = "PAYMONGO_CHECKOUT_INVALID_RESPONSE";
    throw error;
  }
  return {
    provider: "paymongo",
    externalId,
    checkoutUrl,
    paymentMethodTypes: Array.isArray(attributes.payment_method_types)
      ? attributes.payment_method_types
      : resolveCheckoutPaymentMethodTypes(checkoutIntent),
    livemode: Boolean(attributes.livemode),
    raw: payload,
  };
}

/**
 * Lists the checkout methods currently active on the merchant's PayMongo
 * account. Methods PayMongo returns that hosted checkout cannot use are dropped.
 * The capabilities endpoint reflects live activation only, while test-mode
 * checkout simulates every method, so test keys report the full list.
 */
async function fetchPaymongoAvailableMethods({ env = process.env, fetchImpl = fetch } = {}) {
  const config = getHostedGatewayConfig(env);
  if (!config.enabled) {
    const error = new Error("PayMongo is not configured. Set PAYMONGO_SECRET_KEY first.");
    error.statusCode = 503;
    error.code = "PAYMONGO_NOT_CONFIGURED";
    throw error;
  }

  const response = await fetchImpl(
    "https://api.paymongo.com/v1/merchants/capabilities/payment_methods",
    {
      method: "GET",
      headers: {
        Authorization: `Basic ${Buffer.from(`${config.secretKey}:`).toString("base64")}`,
        Accept: "application/json",
      },
    },
  );
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      payload?.errors?.[0]?.detail ||
      payload?.errors?.[0]?.title ||
      "Unable to load PayMongo payment methods.";
    const error = new Error(message);
    error.statusCode = 502;
    error.code = "PAYMONGO_METHODS_FAILED";
    throw error;
  }

  const entries = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : [];
  const methods = entries
    .map((entry) => (typeof entry === "string"
      ? entry
      : entry?.attributes?.type ?? entry?.type ?? entry?.id))
    .map(normalizePaymongoMethodType)
    .filter(Boolean);
  if (config.testMode) {
    return [...PAYMONGO_CHECKOUT_METHOD_TYPES];
  }
  return [...new Set(methods)];
}

function parsePaymongoSignatureHeader(value) {
  const parts = String(value ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const parsed = { t: "", te: "", li: "" };
  for (const part of parts) {
    const [key, rawValue] = part.split("=");
    const normalizedKey = String(key || "").trim();
    if (!normalizedKey) {
      continue;
    }
    parsed[normalizedKey] = String(rawValue || "").trim();
  }
  return parsed;
}

function signaturesMatch(expectedHex, receivedHex) {
  const expected = String(expectedHex || "");
  const received = String(receivedHex || "");
  if (!expected || !received || expected.length !== received.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}

function verifyPaymongoWebhook({
  rawBody,
  signatureHeader,
  webhookSecret,
  livemode,
  toleranceSeconds = 300,
  nowSeconds = Math.floor(Date.now() / 1000),
}) {
  // PayMongo issues one secret per webhook; the buyer and seller endpoints are
  // separate webhooks, so PAYMONGO_WEBHOOK_SECRET may hold a comma-separated list.
  const secrets = String(webhookSecret ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (!secrets.length || !signatureHeader) {
    return false;
  }
  const parsed = parsePaymongoSignatureHeader(signatureHeader);
  const timestamp = Number(parsed.t);
  if (!parsed.t || !Number.isFinite(timestamp) || timestamp <= 0) {
    return false;
  }
  const tolerance = Math.max(0, Number(toleranceSeconds) || 0);
  if (tolerance > 0 && Math.abs(Number(nowSeconds) - timestamp) > tolerance) {
    return false;
  }

  return secrets.some((secret) => {
    const expected = crypto
      .createHmac("sha256", secret)
      .update(`${parsed.t}.${rawBody}`)
      .digest("hex");

    if (livemode === true) {
      return signaturesMatch(expected, parsed.li);
    }
    if (livemode === false) {
      return signaturesMatch(expected, parsed.te);
    }
    return signaturesMatch(expected, parsed.te) || signaturesMatch(expected, parsed.li);
  });
}

/**
 * PayMongo wraps every webhook as { data: { id: "evt_…", type: "event",
 * attributes: { type, livemode, data: <resource> } } }. The flat
 * { data: { type, data } } shape is still accepted for older fixtures.
 */
function readPaymongoWebhookEvent(payload) {
  const root = payload && typeof payload === "object" && payload.data && typeof payload.data === "object"
    ? payload.data
    : {};
  const attributes = root.attributes && typeof root.attributes === "object" ? root.attributes : null;
  if (attributes && typeof attributes.type === "string") {
    return {
      eventId: String(root.id || "").trim(),
      eventType: attributes.type.trim(),
      livemode: Boolean(attributes.livemode),
      resource: attributes.data && typeof attributes.data === "object" ? attributes.data : {},
    };
  }
  return {
    eventId: String(root.id || "").trim(),
    eventType: String(root.type || "").trim(),
    livemode: Boolean(root.livemode),
    resource: root.data && typeof root.data === "object" ? root.data : {},
  };
}

module.exports = {
  PAYMONGO_CHECKOUT_METHOD_TYPES,
  readPaymongoWebhookEvent,
  PAYMONGO_METHOD_LABELS,
  fetchPaymongoAvailableMethods,
  getHostedGatewayConfig,
  createHostedCheckoutSession,
  normalizeHostedPaymentMethodTypes,
  normalizePaymongoMethodType,
  inferPaymongoMethodType,
  verifyPaymongoWebhook,
};
