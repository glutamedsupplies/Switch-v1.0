"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  getPaymongoActivationBlocker,
  matchPaymongoMethodByName,
  reconcilePaymongoPartners,
} = require("../services/paymongoPartnerSync");
const {
  PAYMONGO_CHECKOUT_METHOD_TYPES,
  fetchPaymongoAvailableMethods,
} = require("../services/sellerCheckoutGateway");

function createPartner({ method, label }) {
  return {
    id: `pm-${method}`,
    branch: label,
    paymongoMethod: method,
    isActive: false,
    enabled: false,
    status: "inactive",
  };
}

test("legacy partner names map to the PayMongo method they mean", () => {
  assert.equal(matchPaymongoMethodByName("Gcash"), "gcash");
  assert.equal(matchPaymongoMethodByName("Maya"), "paymaya");
  assert.equal(matchPaymongoMethodByName("BDO"), "brankas_bdo");
  assert.equal(matchPaymongoMethodByName("QR Ph"), "qrph");
  assert.equal(matchPaymongoMethodByName("SeaBank"), "");
});

test("sync links, switches off, and adds partners to match PayMongo", () => {
  const partners = [
    { id: "gcash", branch: "Gcash", isActive: true, status: "active" },
    { id: "maya", branch: "Maya", isActive: true, status: "active" },
    { id: "bdo", branch: "BDO", isActive: true, status: "active" },
    { id: "sea", branch: "SeaBank", isActive: false, status: "inactive" },
    { id: "old", branch: "GrabPay", paymongoMethod: "grab_pay", archivedAt: "2026-01-01", status: "archived" },
    { id: "seller", branch: "Seller Wallet", adminId: "seller-1", isActive: true, status: "active" },
  ];

  const result = reconcilePaymongoPartners({
    partners,
    availableMethods: ["gcash", "card", "qrph", "grab_pay"],
    createPartner,
  });
  const byId = new Map(result.partners.map((partner) => [partner.id, partner]));

  assert.equal(byId.get("gcash").paymongoMethod, "gcash");
  assert.equal(byId.get("gcash").isActive, true);
  assert.equal(byId.get("gcash").imageUrl, "/assets/payment-methods/gcash.png");
  assert.deepEqual(result.logosAdded.map((entry) => entry.id), ["gcash"]);
  assert.equal(byId.get("maya").isActive, false);
  assert.equal(byId.get("bdo").isActive, false);
  assert.equal(byId.get("sea").isActive, false);
  assert.equal(byId.get("old").status, "archived");
  assert.equal(byId.get("seller").isActive, true);

  assert.deepEqual(result.linked.map((entry) => entry.id), ["gcash"]);
  assert.deepEqual(
    result.deactivated.map((entry) => [entry.id, entry.reason]),
    [["maya", "not-enabled-on-paymongo"], ["bdo", "not-enabled-on-paymongo"]],
  );
  assert.deepEqual(
    result.created.map((entry) => entry.method).sort(),
    ["card", "grab_pay", "qrph"],
  );
  assert.ok(result.created.every((entry) => byId.get(entry.id).isActive === false));
});

test("sync is a no-op once partners already match PayMongo", () => {
  const partners = [
    {
      id: "gcash",
      branch: "GCash",
      paymongoMethod: "gcash",
      imageUrl: "/uploads/custom-gcash.png",
      isActive: true,
      status: "active",
    },
  ];
  const result = reconcilePaymongoPartners({
    partners,
    availableMethods: ["gcash"],
    createPartner,
  });
  assert.equal(result.partners[0], partners[0]);
  assert.equal(
    result.created.length + result.linked.length + result.deactivated.length + result.logosAdded.length,
    0,
  );
});

test("activation is blocked only for methods PayMongo does not offer", () => {
  const syncState = { availableMethods: ["gcash"], syncedAt: "2026-09-29T00:00:00.000Z" };
  assert.equal(
    getPaymongoActivationBlocker({ branch: "GCash", paymongoMethod: "gcash" }, syncState),
    "",
  );
  assert.match(
    getPaymongoActivationBlocker({ branch: "Maya", paymongoMethod: "paymaya" }, syncState),
    /not enabled on your PayMongo account/,
  );
  assert.match(
    getPaymongoActivationBlocker({ branch: "SeaBank" }, syncState),
    /not linked to a PayMongo method/,
  );
  assert.equal(
    getPaymongoActivationBlocker({ branch: "Maya" }, { availableMethods: null, syncedAt: "" }),
    "",
  );
});

test("PayMongo capabilities response is reduced to checkout methods", async () => {
  let requestedUrl = "";
  const methods = await fetchPaymongoAvailableMethods({
    env: { PAYMONGO_SECRET_KEY: "sk_live_x" },
    fetchImpl: async (url) => {
      requestedUrl = url;
      return { ok: true, json: async () => ["card", "gcash", "gcash", "google_pay", "qrph"] };
    },
  });
  assert.equal(requestedUrl, "https://api.paymongo.com/v1/merchants/capabilities/payment_methods");
  assert.deepEqual(methods, ["card", "gcash", "qrph"]);

  const testModeMethods = await fetchPaymongoAvailableMethods({
    env: { PAYMONGO_SECRET_KEY: "sk_test_x" },
    fetchImpl: async () => ({ ok: true, json: async () => ["qrph"] }),
  });
  assert.deepEqual(testModeMethods, [...PAYMONGO_CHECKOUT_METHOD_TYPES]);

  await assert.rejects(
    fetchPaymongoAvailableMethods({ env: {}, fetchImpl: async () => ({}) }),
    (error) => error.code === "PAYMONGO_NOT_CONFIGURED",
  );
});
