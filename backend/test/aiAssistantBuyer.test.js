"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { createHarness, findBlock, confirmTokenFrom } = require("./helpers/aiAssistantHarness");
const { parseBuyerMessage } = require("../services/aiAssistant/nlu");

async function readyCheckout(h) {
  await h.chat("tok-buyer", "hanapan mo ako ng white shoes around 1300");
  await h.chat("tok-buyer", "add the first one size medium");
  await h.chat("tok-buyer", "checkout");
  return h.chat("tok-buyer", "pay with gcash");
}

test("Taglish search uses live catalog prices and budget range", async (t) => {
  const h = createHarness();
  t.after(h.cleanup);
  const res = await h.chat("tok-buyer", "hanapan mo ako ng white shoes around 1300");
  assert.equal(res.status, 200);
  const carousel = findBlock(res, "product_carousel");
  assert.ok(carousel, "expected a product carousel");
  const names = carousel.products.map((product) => product.name);
  assert.deepEqual(names, ["Aero White Sneakers"]);
  assert.equal(carousel.products[0].price, 1250, "price must come from the backend sale price");
});

test("budget parsing maps 'around ₱1300' to a sensible range", () => {
  const parsed = parseBuyerMessage("white shoes around ₱1300", {});
  assert.equal(parsed.tool, "search_products");
  const { priceMin, priceMax } = parsed.args.filters;
  assert.ok(priceMin >= 800 && priceMin <= 1000, `priceMin ${priceMin}`);
  assert.ok(priceMax >= 1400 && priceMax <= 1600, `priceMax ${priceMax}`);
});

test("add to cart resolves variants from real inventory and rejects out-of-stock sizes", async (t) => {
  const h = createHarness();
  t.after(h.cleanup);
  await h.chat("tok-buyer", "white shoes");
  const added = await h.chat("tok-buyer", "add the first one size medium");
  assert.match(added.body.message, /Added Aero White Sneakers \(M\)/);
  assert.deepEqual(added.body.clientEffects.cart[0], { op: "add", productId: "p-white", variantId: "v-m", quantity: 1, adminId: "seller-a" });

  const outOfStock = await h.chat("tok-buyer", "add the first one size large");
  assert.doesNotMatch(outOfStock.body.message, /^Added/);
  const cart = await h.api.store.getCart("buyer-1");
  assert.equal(cart.length, 1, "the unavailable size must not be added");
});

test("placing an order requires an explicit confirmation tap", async (t) => {
  const h = createHarness();
  t.after(h.cleanup);
  const preview = await readyCheckout(h);
  assert.ok(findBlock(preview, "checkout_summary"));

  const prepared = await h.chat("tok-buyer", "place order");
  const token = confirmTokenFrom(prepared);
  assert.ok(token, "expected a confirmation token");
  assert.match(findBlock(prepared, "confirmation").confirmLabel, /Place Order ₱1,309/);
  assert.equal(h.orders.length, 0, "nothing is ordered before the tap");

  const typedYes = await h.chat("tok-buyer", "yes");
  assert.match(typedYes.body.message, /tap the button/i);
  assert.equal(h.orders.length, 0, "typing yes must not place the order");

  const placed = await h.confirm("tok-buyer", token);
  assert.equal(placed.status, 200);
  assert.equal(h.orders.length, 1);
  assert.equal(h.orders[0].unitPrice, 1250);
  assert.equal(h.orders[0].grandTotalAmount, 1309);
  const handoff = findBlock(placed, "payment_handoff");
  assert.ok(handoff, "payment goes through the secure checkout page");
  assert.match(JSON.stringify(handoff), /checkout\.paymongo\.test/);
});

test("a price change after review forces reconfirmation", async (t) => {
  const h = createHarness();
  t.after(h.cleanup);
  await readyCheckout(h);
  const prepared = await h.chat("tok-buyer", "place order");
  const token = confirmTokenFrom(prepared);

  h.products.find((product) => product.id === "p-white").salesPrice = 1300;
  h.setNow(Date.parse("2026-09-30T04:05:00Z"));

  const result = await h.confirm("tok-buyer", token);
  assert.equal(h.orders.length, 0, "no order when the price changed");
  assert.match(result.body.message, /changed/i);
  assert.match(result.body.message, /1,250/);
  assert.match(result.body.message, /1,300/);
  assert.ok(confirmTokenFrom(result), "a fresh confirmation is issued");
});

test("confirmation tokens are single-use", async (t) => {
  const h = createHarness();
  t.after(h.cleanup);
  await readyCheckout(h);
  const token = confirmTokenFrom(await h.chat("tok-buyer", "place order"));
  assert.equal((await h.confirm("tok-buyer", token)).status, 200);
  const replay = await h.confirm("tok-buyer", token);
  assert.equal(replay.status, 409);
  assert.equal(h.orders.length, 1);
});

test("card numbers and OTPs are redacted and never stored", async (t) => {
  const h = createHarness();
  t.after(h.cleanup);
  const res = await h.chat("tok-buyer", "my card is 4111 1111 1111 1111 and otp 123456");
  assert.match(res.body.message, /removed sensitive details/i);
  const session = await h.call("GET", "/api/assistant/session", { token: "tok-buyer" });
  const stored = JSON.stringify(session.body.messages);
  assert.doesNotMatch(stored, /4111/);
  assert.doesNotMatch(stored, /123456/);
});

test("AI checkout can be switched off by Super Admin", async (t) => {
  const h = createHarness({ settings: { aiCheckout: false } });
  t.after(h.cleanup);
  await h.chat("tok-buyer", "white shoes");
  await h.chat("tok-buyer", "add the first one size medium");
  const res = await h.chat("tok-buyer", "checkout");
  assert.match(res.body.message, /disabled|turned off/i);
  assert.equal(h.orders.length, 0);
});
