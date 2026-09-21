"use strict";

const crypto = require("crypto");
const {
  getHostedGatewayConfig,
  createHostedCheckoutSession,
  normalizeHostedPaymentMethodTypes,
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

/**
 * Create a hosted PayMongo checkout for a buyer order group.
 * Falls back to provider "manual" when PAYMONGO_SECRET_KEY is unset.
 */
async function createBuyerOrderCheckoutSession({
  orderGroupId,
  amount,
  currencyCode = "PHP",
  paymentGateway = "",
  paymentReference,
  description = "Order payment",
  customerEmail = "",
  customerName = "",
  successUrl,
  cancelUrl,
  metadata = {},
}) {
  const checkoutIntent = {
    id: String(orderGroupId || "").trim(),
    planName: description,
    amount,
    currencyCode,
    paymentGateway,
    paymentReference:
      String(paymentReference || "").trim() || newPaymentReference(),
  };

  const hosted = await createHostedCheckoutSession({
    checkoutIntent,
    successUrl,
    cancelUrl,
    customerEmail,
    customerName,
  });

  return {
    ...hosted,
    paymentReference: checkoutIntent.paymentReference,
    paymentMethodTypes:
      hosted.paymentMethodTypes
      || normalizeHostedPaymentMethodTypes(paymentGateway),
    metadata: {
      ...metadata,
      orderGroupId: checkoutIntent.id,
      paymentReference: checkoutIntent.paymentReference,
    },
  };
}

module.exports = {
  getHostedGatewayConfig,
  createBuyerOrderCheckoutSession,
  normalizeHostedPaymentMethodTypes,
  verifyPaymongoWebhook,
  newPaymentIdempotencyKey,
  newPaymentReference,
};
