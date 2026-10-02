"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { createHarness, findBlock, confirmTokenFrom } = require("./helpers/aiAssistantHarness");

const NOW = Date.parse("2026-09-30T04:00:00Z");

function sampleOrders() {
  return [
    { id: "o1", accountId: "buyer-9", adminId: "seller-a", productId: "p-white", productName: "Aero White Sneakers", quantity: 2, unitPrice: 1250, stage: "toPrepare", createdAtEpochMs: NOW - 3600e3, orderGroupId: "g1", clientName: "Ana" },
    { id: "o2", accountId: "buyer-9", adminId: "seller-b", productId: "p-tote", productName: "Canvas Tote Bag", quantity: 1, unitPrice: 500, stage: "toPrepare", createdAtEpochMs: NOW - 3600e3, orderGroupId: "g2", clientName: "Ben" },
  ];
}

test("sales metrics only include the signed-in seller's orders", async (t) => {
  const h = createHarness({ orders: sampleOrders(), nowMs: NOW });
  t.after(h.cleanup);
  const a = await h.chat("tok-seller-a", "how are sales today?");
  assert.match(a.body.message, /₱2,500/);
  assert.match(a.body.message, /1 order/);
  assert.ok(findBlock(a, "seller_metric"));

  const b = await h.chat("tok-seller-b", "how are sales today?");
  assert.match(b.body.message, /₱500/);
  assert.doesNotMatch(JSON.stringify(b.body), /Aero White|Ana/);
});

test("low stock lists only products at or below the threshold", async (t) => {
  const h = createHarness({ nowMs: NOW });
  t.after(h.cleanup);
  const res = await h.chat("tok-seller-a", "which products are low on stock?");
  const table = findBlock(res, "inventory_table");
  assert.ok(table);
  assert.deepEqual(table.rows.map((row) => row.productId), ["p-black"]);
});

test("stock edits need confirmation and send the full product to the real update route", async (t) => {
  const h = createHarness({ nowMs: NOW });
  t.after(h.cleanup);
  const prepared = await h.chat("tok-seller-a", 'update stock of "Street Black Shoes" to 25');
  assert.match(prepared.body.message, /from 3 to 25/);
  assert.equal(h.products.find((product) => product.id === "p-black").stock, 3, "unchanged before confirming");
  assert.equal(h.calls.filter((c) => c.method === "PUT").length, 0);

  const done = await h.confirm("tok-seller-a", confirmTokenFrom(prepared));
  assert.equal(done.status, 200);
  const put = h.calls.find((c) => c.method === "PUT");
  assert.equal(put.path, "/api/products/p-black");
  assert.equal(put.actor, "acc-a", "the update runs with the seller's own session");
  assert.equal(put.body.name, "Street Black Shoes");
  assert.equal(put.body.category, "Shoes");
  assert.equal(h.products.find((product) => product.id === "p-black").stock, 25);
});

test("a seller cannot act on another seller's product", async (t) => {
  const h = createHarness({ nowMs: NOW });
  t.after(h.cleanup);
  const res = await h.chat("tok-seller-a", 'update stock of "Canvas Tote Bag" to 99');
  assert.equal(confirmTokenFrom(res), "");
  assert.match(res.body.message, /couldn't find/i);

  const direct = await h.action("tok-seller-a", "update_product_stock", { productId: "p-tote", stock: 99 });
  assert.equal(confirmTokenFrom(direct), "", "no confirmation is issued for a foreign product");
  assert.match(direct.body.message, /isn't in your store/i);
  assert.equal(h.products.find((product) => product.id === "p-tote").stock, 2);
  assert.equal(h.calls.filter((c) => c.method === "PUT").length, 0);
});

test("seller actions switched off by Super Admin are refused, even with an older token", async (t) => {
  const h = createHarness({ nowMs: NOW });
  t.after(h.cleanup);
  const prepared = await h.chat("tok-seller-a", 'update stock of "Street Black Shoes" to 25');
  const token = confirmTokenFrom(prepared);
  assert.ok(token);

  h.settings.aiSellerActions = false;
  const blocked = await h.chat("tok-seller-a", 'update stock of "Street Black Shoes" to 30');
  assert.match(blocked.body.message, /turned off/i);
  const late = await h.confirm("tok-seller-a", token);
  assert.match(late.body.message, /turned off/i);
  assert.equal(h.calls.filter((c) => c.method === "PUT").length, 0);
  assert.equal(h.products.find((product) => product.id === "p-black").stock, 3);
});

test("listing drafts are never published without a complete draft and an explicit tap", async (t) => {
  const h = createHarness({ nowMs: NOW });
  t.after(h.cleanup);
  const posts = () => h.calls.filter((c) => c.method === "POST" && c.path === "/api/products").length;

  const started = await h.chat("tok-seller-a", "create listing for Blue Denim Jacket");
  assert.ok(findBlock(started, "listing_draft"));
  await h.chat("tok-seller-a", "price 899");
  await h.chat("tok-seller-a", "10 stocks");
  await h.chat("tok-seller-a", "category Jackets");
  const incomplete = await h.chat("tok-seller-a", "publish");
  assert.match(incomplete.body.message, /isn't complete/);
  assert.equal(confirmTokenFrom(incomplete), "");

  await h.chat("tok-seller-a", "description: Classic blue denim, unisex fit");
  const ready = await h.chat("tok-seller-a", "publish");
  const token = confirmTokenFrom(ready);
  assert.ok(token, "a complete draft produces a confirmation");
  assert.equal(posts(), 0, "nothing is published before the tap");

  const published = await h.confirm("tok-seller-a", token);
  assert.equal(published.status, 200);
  assert.equal(posts(), 1);
  const created = h.products.find((product) => product.name === "Blue Denim Jacket");
  assert.equal(created.adminId, "seller-a");
  assert.equal(created.approvalStatus, "pending", "new listings still go through review");
});

test("flash deal requests resolve the product and keep the schedule separate", async (t) => {
  const h = createHarness({ nowMs: NOW });
  t.after(h.cleanup);
  const res = await h.chat("tok-seller-a", "create a flash deal for Street Black Shoes tomorrow 8pm to 10pm 20% off");
  assert.match(res.body.message, /Flash Deal draft for Street Black Shoes/);
  assert.match(res.body.message, /8PM–10PM/);
  assert.ok(findBlock(res, "promotion_draft"));
  assert.equal(h.calls.filter((c) => c.path === "/api/admin/flash-deals").length, 0);
});
