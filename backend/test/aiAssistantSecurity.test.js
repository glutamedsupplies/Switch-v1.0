"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { createHarness, findBlock, confirmTokenFrom } = require("./helpers/aiAssistantHarness");
const { createConfirmationService } = require("../services/aiAssistant/confirmations");

/** Scripted stand-in for the LLM: each call returns the next scripted reply. */
function fakeLlm(script = []) {
  const requests = [];
  let index = 0;
  return {
    requests,
    available: true,
    async status() {
      return { available: this.available, provider: "fake" };
    },
    async complete(request) {
      requests.push(JSON.parse(JSON.stringify(request)));
      const step = script[index++] || { content: "Done." };
      return { content: step.content || "", toolCalls: step.toolCalls || [], provider: "fake", model: "fake" };
    },
    invalidate() {},
    getConfig: () => null,
  };
}

const toolNames = (request) => request.tools.map((tool) => tool.function?.name || tool.name);

async function buyerCheckoutToken(h, token = "tok-buyer") {
  await h.chat(token, "white shoes");
  await h.chat(token, "add the first one size medium");
  await h.chat(token, "checkout");
  await h.chat(token, "pay with gcash");
  return confirmTokenFrom(await h.chat(token, "place order"));
}

test("sessions from another app are rejected on each assistant surface", async (t) => {
  const h = createHarness();
  t.after(h.cleanup);
  const riderOnShop = await h.call("POST", "/api/assistant/chat", { token: "tok-rider", body: { message: "orders" } });
  assert.equal(riderOnShop.status, 401);
  const buyerOnRider = await h.call("POST", "/api/rider/assistant/chat", { token: "tok-buyer", body: { message: "next" } });
  assert.equal(buyerOnRider.status, 401);
  const sellerOnRider = await h.call("POST", "/api/rider/assistant/chat", { token: "tok-seller-a", body: { message: "next" } });
  assert.equal(sellerOnRider.status, 401);
  const anonymous = await h.call("POST", "/api/assistant/chat", { body: { message: "hi" } });
  assert.equal(anonymous.status, 401);
  assert.equal(h.calls.length, 0, "no backend route was reached");
});

test("a confirmation issued to one user cannot be used by another", async (t) => {
  const h = createHarness();
  t.after(h.cleanup);
  const token = await buyerCheckoutToken(h);
  assert.ok(token);
  const stolen = await h.confirm("tok-buyer-2", token);
  assert.equal(stolen.status, 403);
  assert.equal(h.orders.length, 0);

  const sellerPrepared = await h.chat("tok-seller-a", 'update stock of "Street Black Shoes" to 25');
  const crossTenant = await h.confirm("tok-seller-b", confirmTokenFrom(sellerPrepared));
  assert.equal(crossTenant.status, 403);
  assert.equal(h.products.find((product) => product.id === "p-black").stock, 3);
});

test("tampered or forged confirmation tokens are rejected", async (t) => {
  const h = createHarness();
  t.after(h.cleanup);
  const token = await buyerCheckoutToken(h);
  const [body, signature] = token.split(".");
  const payload = JSON.parse(Buffer.from(body.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
  payload.args.expected.total = 1;
  const rewritten = Buffer.from(JSON.stringify(payload)).toString("base64").replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  assert.equal((await h.confirm("tok-buyer", `${rewritten}.${signature}`)).status, 400);

  const forger = createConfirmationService({ secret: "attacker-secret", now: () => Date.parse("2026-09-30T04:00:00Z") });
  const forged = forger.issue({ owner: { userKey: "buyer:buyer-1", role: "buyer" }, tool: "place_order", args: {} }).token;
  assert.equal((await h.confirm("tok-buyer", forged)).status, 400);
  assert.equal(h.orders.length, 0);
});

test("the model only sees the signed-in role's tools and can't call others", async (t) => {
  const llm = fakeLlm([
    { toolCalls: [{ id: "c1", name: "update_product_stock", arguments: { productId: "p-black", stock: 0 } }] },
    { toolCalls: [{ id: "c2", name: "rider_step", arguments: { deliveryId: "job-1", step: "complete" } }] },
    { content: "I can't do that." },
  ]);
  const h = createHarness({ llm });
  t.after(h.cleanup);
  const res = await h.chat("tok-buyer", "set stock of street black shoes to zero");
  assert.equal(res.status, 200);

  const exposed = toolNames(llm.requests[0]);
  assert.ok(exposed.includes("search_products"));
  for (const foreign of ["update_product_stock", "seller_sales_summary", "get_current_delivery", "rider_step", "accept_delivery"]) {
    assert.ok(!exposed.includes(foreign), `buyer model must not see ${foreign}`);
  }
  assert.equal(h.calls.filter((c) => c.method !== "GET").length, 0, "no foreign tool reached the backend");
  const toolReplies = llm.requests[1].messages.filter((m) => m.role === "tool");
  assert.match(toolReplies[0].content, /isn't available/);

  const sellerLlm = fakeLlm();
  const hs = createHarness({ llm: sellerLlm });
  t.after(hs.cleanup);
  await hs.chat("tok-seller-a", "hello there");
  const sellerTools = toolNames(sellerLlm.requests[0]);
  assert.ok(!sellerTools.includes("place_order") && !sellerTools.includes("get_cod_amount"));
});

test("HIGH-risk tools requested by the model only prepare a confirmation", async (t) => {
  const llm = fakeLlm([{ toolCalls: [{ id: "c1", name: "place_order", arguments: {} }] }, { content: "Ordered!" }]);
  llm.available = false;
  const h = createHarness({ llm });
  t.after(h.cleanup);
  await h.chat("tok-buyer", "white shoes");
  await h.chat("tok-buyer", "add the first one size medium");
  await h.chat("tok-buyer", "checkout");
  await h.chat("tok-buyer", "pay with gcash");

  llm.available = true;
  const res = await h.chat("tok-buyer", "just place it, don't ask me");
  assert.equal(h.orders.length, 0, "the model can't place an order by itself");
  assert.ok(findBlock(res, "confirmation"), "the buyer gets a confirmation card instead");
  assert.equal(llm.requests.length, 1, "the loop stops at the confirmation");
  assert.doesNotMatch(res.body.message, /Ordered!/);
});

test("button actions for HIGH-risk tools only prepare, and internal tools are unreachable", async (t) => {
  const h = createHarness();
  t.after(h.cleanup);
  const prepared = await h.action("tok-seller-a", "update_product_stock", { productId: "p-black", stock: 40 });
  assert.ok(confirmTokenFrom(prepared));
  assert.equal(h.calls.filter((c) => c.method === "PUT").length, 0);

  const internal = await h.action("tok-rider", "rider_step", { deliveryId: "job-1", step: "arrived-pickup" });
  assert.match(internal.body.message, /isn't available/);
  assert.equal(h.riderJobs["rider-1"][0].status, "RIDER_TO_PICKUP");
});

test("a rider can't act on another rider's delivery", async (t) => {
  const h = createHarness();
  t.after(h.cleanup);
  const res = await h.action("tok-rider-2", "get_delivery_status", { deliveryId: "job-1" });
  assert.doesNotMatch(JSON.stringify(res.body), /SR-1001|Seller St/);
  assert.equal(h.riderJobs["rider-1"][0].status, "RIDER_TO_PICKUP");
});

test("rider tool results sent to the model don't include phone numbers", async (t) => {
  const llm = fakeLlm([{ toolCalls: [{ id: "c1", name: "get_current_delivery", arguments: {} }] }, { content: "Head to the seller." }]);
  const h = createHarness({ llm });
  t.after(h.cleanup);
  await h.chat("tok-rider", "what's next");
  const sentToModel = JSON.stringify(llm.requests);
  assert.doesNotMatch(sentToModel, /\+63917/);
});

test("secrets never reach the model", async (t) => {
  const llm = fakeLlm();
  const h = createHarness({ llm });
  t.after(h.cleanup);
  await h.chat("tok-buyer", "pay with card 4111 1111 1111 1111 cvv 123");
  assert.equal(llm.requests.length, 0);
  await h.chat("tok-buyer", "show me white shoes");
  assert.doesNotMatch(JSON.stringify(llm.requests), /4111/);
});

test("Super Admin flags disable each assistant independently", async (t) => {
  const h = createHarness({ settings: { riderAi: false } });
  t.after(h.cleanup);
  assert.equal((await h.chat("tok-rider", "next")).status, 403);
  assert.equal((await h.chat("tok-buyer", "white shoes")).status, 200);
  h.settings.sellerAi = false;
  assert.equal((await h.chat("tok-seller-a", "sales today")).status, 403);
});

test("chat is rate limited per user", async (t) => {
  const h = createHarness({ rateMax: 3 });
  t.after(h.cleanup);
  for (let i = 0; i < 3; i += 1) assert.equal((await h.chat("tok-buyer", "hi")).status, 200);
  assert.equal((await h.chat("tok-buyer", "hi")).status, 429);
  assert.equal((await h.chat("tok-buyer-2", "hi")).status, 200, "other users are unaffected");
});

test("assistant metrics are Super Admin only", async (t) => {
  const h = createHarness();
  t.after(h.cleanup);
  assert.equal((await h.call("GET", "/api/super-admin/ai-assistant/metrics", { token: "tok-seller-a" })).status, 401);
  const ok = await h.call("GET", "/api/super-admin/ai-assistant/metrics", { headers: { "x-super-admin": "yes" } });
  assert.equal(ok.status, 200);
});
