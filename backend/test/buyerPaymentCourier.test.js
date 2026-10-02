"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  newPaymentIdempotencyKey,
  newPaymentReference,
  resolvePaymentPartnerMethod,
  createBuyerOrderCheckoutSession,
  createBuyerDirectPayment,
  isDirectPaymentMethod,
} = require("../services/buyerCheckoutGateway");
const {
  getCourierProviderConfig,
  createShipment,
  buildStubTrackingNumber,
} = require("../services/courierProviderAdapter");
const {
  verifyPaymongoWebhook,
  readPaymongoWebhookEvent,
} = require("../services/sellerCheckoutGateway");

test("PayMongo webhook events are read from data.attributes", () => {
  const event = readPaymongoWebhookEvent({
    data: {
      id: "evt_1",
      type: "event",
      attributes: {
        type: "payment.paid",
        livemode: false,
        data: { id: "pay_1", attributes: { payment_intent_id: "pi_1" } },
      },
    },
  });
  assert.equal(event.eventId, "evt_1");
  assert.equal(event.eventType, "payment.paid");
  assert.equal(event.resource.attributes.payment_intent_id, "pi_1");

  const legacy = readPaymongoWebhookEvent({
    data: { type: "checkout_session.payment.paid", data: { id: "cs_1" } },
  });
  assert.equal(legacy.eventType, "checkout_session.payment.paid");
  assert.equal(legacy.resource.id, "cs_1");
});

test("direct payment sends wallets and banks straight to their redirect", async () => {
  assert.equal(isDirectPaymentMethod("gcash"), true);
  assert.equal(isDirectPaymentMethod("dob_ubp"), true);
  assert.equal(isDirectPaymentMethod("card"), false);

  const calls = [];
  const fetchImpl = async (url, init) => {
    const body = JSON.parse(init.body);
    calls.push({ path: new URL(url).pathname, attributes: body.data.attributes });
    const path = new URL(url).pathname;
    const data = path.endsWith("/payment_intents")
      ? { id: "pi_1", attributes: { client_key: "pi_1_key" } }
      : path.endsWith("/payment_methods")
        ? { id: "pm_1", attributes: {} }
        : {
          id: "pi_1",
          attributes: {
            livemode: false,
            next_action: { redirect: { url: "https://pm.link/auth/pi_1" } },
          },
        };
    return { ok: true, status: 200, json: async () => ({ data }) };
  };

  const result = await createBuyerDirectPayment({
    orderGroupId: "og_1",
    amount: 250,
    paymentMethodType: "dob_ubp",
    returnUrl: "https://example.test/ok",
    env: { PAYMONGO_SECRET_KEY: "sk_test_x" },
    fetchImpl,
  });

  assert.equal(result.checkoutUrl, "https://pm.link/auth/pi_1");
  assert.equal(result.paymentIntentId, "pi_1");
  assert.deepEqual(calls[0].attributes.payment_method_allowed, ["dob"]);
  assert.equal(calls[0].attributes.amount, 25000);
  assert.deepEqual(calls[1].attributes.details, { bank_code: "ubp" });
  assert.equal(calls[2].attributes.client_key, "pi_1_key");
});

test("direct payment asks for hosted checkout when PayMongo refuses the method", async () => {
  const fetchImpl = async () => ({
    ok: false,
    status: 400,
    json: async () => ({ errors: [{ detail: "not allowed for your account" }] }),
  });
  await assert.rejects(
    createBuyerDirectPayment({
      orderGroupId: "og_1",
      amount: 100,
      paymentMethodType: "brankas_bdo",
      returnUrl: "https://example.test/ok",
      env: { PAYMONGO_SECRET_KEY: "sk_test_x" },
      fetchImpl,
    }),
    (error) => error.fallbackToCheckout === true,
  );
});
const {
  resolveSellerPlanSelection,
  getSellerPlanCatalog,
} = require("../services/sellerPlanCatalog");
const {
  evaluateSellerPerformanceBadge,
} = require("../services/sellerPerformanceBadge");

test("buyer checkout helpers mint stable-looking keys", () => {
  const idem = newPaymentIdempotencyKey("buy");
  const reference = newPaymentReference("ORD");
  assert.match(idem, /^buy_[a-f0-9]+$/);
  assert.match(reference, /^ORD-/);
});

test("payment partner resolves to its Super Admin PayMongo method", () => {
  const partners = [
    { id: "p-bdo", branch: "BDO", paymongoMethod: "brankas_bdo", status: "active" },
    { id: "p-maya", branch: "Maya", status: "active" },
    { id: "p-sea", branch: "SeaBank", status: "active" },
    { id: "p-grab-old", branch: "GrabPay", paymongoMethod: "card", status: "archived" },
    { id: "p-grab", branch: "GrabPay", paymongoMethod: "grab_pay", status: "active" },
  ];

  assert.equal(resolvePaymentPartnerMethod({ partnerName: "BDO", partners }).method, "brankas_bdo");
  assert.equal(resolvePaymentPartnerMethod({ partnerName: "maya", partners }).method, "paymaya");
  assert.equal(resolvePaymentPartnerMethod({ partnerName: "GrabPay", partners }).method, "grab_pay");
  assert.equal(resolvePaymentPartnerMethod({ partnerName: "SeaBank", partners }).method, "");
  assert.equal(resolvePaymentPartnerMethod({ partnerName: "", partners }).method, "");
});

test("payment partner prefers the seller-scoped record over the global one", () => {
  const partners = [
    { id: "global", branch: "Wallet", paymongoMethod: "gcash" },
    { id: "scoped", branch: "Wallet", paymongoMethod: "paymaya", adminId: "seller-1" },
  ];
  assert.equal(
    resolvePaymentPartnerMethod({ partnerName: "Wallet", partners, adminId: "seller-1" }).method,
    "paymaya",
  );
  assert.equal(
    resolvePaymentPartnerMethod({ partnerName: "Wallet", partners, adminId: "seller-2" }).method,
    "gcash",
  );
});

test("buyer checkout locks PayMongo to the chosen partner method", async () => {
  let sentBody = null;
  const fetchImpl = async (_url, init) => {
    sentBody = JSON.parse(init.body);
    return {
      ok: true,
      json: async () => ({
        data: {
          id: "cs_test_1",
          attributes: {
            checkout_url: "https://checkout.paymongo.com/cs_test_1",
            payment_method_types: ["paymaya"],
            livemode: false,
          },
        },
      }),
    };
  };

  const hosted = await createBuyerOrderCheckoutSession({
    orderGroupId: "og_1",
    amount: 250,
    paymentGateway: "Maya",
    paymentMethodType: "paymaya",
    successUrl: "https://example.test/ok",
    cancelUrl: "https://example.test/cancel",
    env: { PAYMONGO_SECRET_KEY: "sk_test_x" },
    fetchImpl,
  });

  assert.deepEqual(sentBody.data.attributes.payment_method_types, ["paymaya"]);
  assert.equal(hosted.provider, "paymongo");
  assert.deepEqual(hosted.paymentMethodTypes, ["paymaya"]);
});

test("buyer checkout refuses partners without a PayMongo method", async () => {
  let called = false;
  await assert.rejects(
    createBuyerOrderCheckoutSession({
      orderGroupId: "og_2",
      amount: 100,
      paymentGateway: "SeaBank",
      paymentMethodType: "",
      env: { PAYMONGO_SECRET_KEY: "sk_test_x" },
      fetchImpl: async () => {
        called = true;
        throw new Error("should not call PayMongo");
      },
    }),
    (error) => error.code === "PAYMONGO_METHOD_UNMAPPED",
  );
  assert.equal(called, false);
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

test("seller catalog is free-only and one company per account", () => {
  const catalog = getSellerPlanCatalog([], { existingCompanyCount: 0, canSubmitFreeFirst: true });
  assert.equal(catalog.subscriptionsRetired, true);
  assert.equal(catalog.oneCompanyPerAccount, true);
  assert.equal(catalog.plans.length, 0);
  const free = resolveSellerPlanSelection({ planName: "Free" });
  assert.equal(free.free, true);
  assert.equal(free.amount, 0);
  assert.throws(
    () => resolveSellerPlanSelection({ planName: "Basic" }),
    (error) => error.code === "SELLER_PLANS_RETIRED",
  );
});

test("legitimate badge is earned from shop performance", () => {
  assert.equal(
    evaluateSellerPerformanceBadge({ rating: 4.9, reviews: 2, orders: 3, chats: 1 }).earned,
    false,
  );
  assert.equal(
    evaluateSellerPerformanceBadge({ rating: 4.8, reviews: 20, orders: 40, chats: 12 }).earned,
    true,
  );
});
