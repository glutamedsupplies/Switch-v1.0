"use strict";

const crypto = require("crypto");

function getHostedGatewayConfig() {
  const secretKey = String(process.env.PAYMONGO_SECRET_KEY ?? "").trim();
  const webhookSecret = String(process.env.PAYMONGO_WEBHOOK_SECRET ?? "").trim();
  const provider = secretKey ? "paymongo" : "manual";
  return {
    provider,
    secretKey,
    webhookSecret,
    enabled: Boolean(secretKey),
  };
}

function normalizeHostedPaymentMethodTypes(paymentGateway) {
  const key = String(paymentGateway ?? "").trim().toLowerCase();
  if (key.includes("gcash")) {
    return ["gcash"];
  }
  if (key.includes("maya") || key.includes("paymaya")) {
    return ["paymaya"];
  }
  if (key.includes("bdo") || key.includes("card") || key.includes("bank")) {
    return ["card"];
  }
  return ["gcash", "paymaya", "card", "qrph"];
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
}) {
  const config = getHostedGatewayConfig();
  if (!config.enabled) {
    return {
      provider: "manual",
      checkoutUrl: checkoutIntent?.checkoutUrl || "",
      externalId: "",
      paymentMethodTypes: normalizeHostedPaymentMethodTypes(
        checkoutIntent?.paymentGateway,
      ),
      livemode: false,
    };
  }

  const body = {
    data: {
      attributes: {
        line_items: [
          {
            name: checkoutIntent?.planName || "Seller subscription",
            amount: centsFromAmount(checkoutIntent?.amount),
            currency: String(checkoutIntent?.currencyCode || "PHP").trim() || "PHP",
            quantity: 1,
          },
        ],
        payment_method_types: normalizeHostedPaymentMethodTypes(
          checkoutIntent?.paymentGateway,
        ),
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

  const response = await fetch("https://api.paymongo.com/v2/checkout_sessions", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.secretKey}:`).toString("base64")}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      payload?.errors?.[0]?.detail ||
      payload?.errors?.[0]?.title ||
      payload?.message ||
      "Unable to create PayMongo checkout session.";
    throw new Error(message);
  }

  const data = payload?.data || {};
  const attributes = data?.attributes || {};
  return {
    provider: "paymongo",
    externalId: String(data.id || "").trim(),
    checkoutUrl: String(attributes.checkout_url || "").trim(),
    paymentMethodTypes: Array.isArray(attributes.payment_method_types)
      ? attributes.payment_method_types
      : normalizeHostedPaymentMethodTypes(checkoutIntent?.paymentGateway),
    livemode: Boolean(attributes.livemode),
    raw: payload,
  };
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

function verifyPaymongoWebhook({ rawBody, signatureHeader, webhookSecret, livemode }) {
  if (!webhookSecret || !signatureHeader) {
    return false;
  }
  const parsed = parsePaymongoSignatureHeader(signatureHeader);
  if (!parsed.t) {
    return false;
  }
  const expected = crypto
    .createHmac("sha256", webhookSecret)
    .update(`${parsed.t}.${rawBody}`)
    .digest("hex");

  if (livemode === true) {
    return signaturesMatch(expected, parsed.li);
  }
  if (livemode === false) {
    return signaturesMatch(expected, parsed.te);
  }

  return signaturesMatch(expected, parsed.te) || signaturesMatch(expected, parsed.li);
}

module.exports = {
  getHostedGatewayConfig,
  createHostedCheckoutSession,
  normalizeHostedPaymentMethodTypes,
  verifyPaymongoWebhook,
};
