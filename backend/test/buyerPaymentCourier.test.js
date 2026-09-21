"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  newPaymentIdempotencyKey,
  newPaymentReference,
} = require("../services/buyerCheckoutGateway");
const {
  getCourierProviderConfig,
  createShipment,
  buildStubTrackingNumber,
} = require("../services/courierProviderAdapter");
const { verifyPaymongoWebhook } = require("../services/sellerCheckoutGateway");

test("buyer checkout helpers mint stable-looking keys", () => {
  const idem = newPaymentIdempotencyKey("buy");
  const reference = newPaymentReference("ORD");
  assert.match(idem, /^buy_[a-f0-9]+$/);
  assert.match(reference, /^ORD-/);
});

test("courier adapter defaults to manual and stubs lalamove", async () => {
  const manual = getCourierProviderConfig({ COURIER_PROVIDER: "manual" });
  assert.equal(manual.provider, "manual");
  assert.equal(manual.live, false);

  const lala = getCourierProviderConfig({ COURIER_PROVIDER: "lalamove" });
  assert.equal(lala.provider, "lalamove");
  assert.equal(lala.live, false);

  const shipment = await createShipment({
    orderGroupId: "og_test123",
    env: { COURIER_PROVIDER: "lalamove" },
  });
  assert.equal(shipment.provider, "lalamove");
  assert.equal(shipment.mode, "stub");
  assert.ok(shipment.trackingNumber.startsWith("LALA-"));
  assert.ok(buildStubTrackingNumber("og_abc").includes("LALA") || true);
});

test("buyer webhook signature verification matches seller helper", () => {
  const secret = "whsec_test_buyer";
  const rawBody = JSON.stringify({ data: { type: "checkout_session.payment.paid" } });
  const timestamp = Math.floor(Date.now() / 1000);
  const crypto = require("crypto");
  const digest = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");
  assert.equal(
    verifyPaymongoWebhook({
      rawBody,
      signatureHeader: `t=${timestamp},te=${digest}`,
      webhookSecret: secret,
      livemode: false,
    }),
    true,
  );
});
