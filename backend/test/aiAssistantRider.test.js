"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { createHarness, findBlock, confirmTokenFrom, baseRiderJob } = require("./helpers/aiAssistantHarness");
const { nextSteps } = require("../services/aiAssistant/tools/riderTools");

function readPersisted(dir) {
  return fs
    .readdirSync(dir, { recursive: true })
    .map((name) => path.join(dir, String(name)))
    .filter((file) => fs.statSync(file).isFile())
    .map((file) => fs.readFileSync(file, "utf8"))
    .join("\n");
}

const jobCalls = (h) => h.calls.filter((c) => c.method === "POST" && c.path.startsWith("/api/rider/jobs/"));

function atDropoff() {
  return {
    ...baseRiderJob(),
    status: "ARRIVED_AT_DROPOFF",
    dropoff: { name: "Maria", address: "8 Bonifacio Ave, Taguig", area: "Taguig", phone: "+639180000002", lat: 14.52, lng: 121.05 },
  };
}

test("next step card offers real actions but changes nothing until tapped", async (t) => {
  const h = createHarness();
  t.after(h.cleanup);
  const res = await h.chat("tok-rider", "what's my next step?");
  const card = findBlock(res, "delivery_card");
  assert.ok(card);
  assert.ok(card.actions.some((action) => action.kind === "confirm"), "step buttons are confirmations");
  assert.ok(card.actions.some((action) => action.kind === "call" && /seller/i.test(action.label)));
  assert.ok(!card.actions.some((action) => /call customer/i.test(action.label)), "customer phone is hidden before pickup");
  assert.equal(jobCalls(h).length, 0);
  assert.equal(h.riderJobs["rider-1"][0].status, "RIDER_TO_PICKUP");
});

test("the rider cannot change the COD amount through the assistant", async (t) => {
  const h = createHarness();
  t.after(h.cleanup);
  const res = await h.chat("tok-rider", "Make it 1000");
  assert.match(res.body.message, /₱1,300/);
  assert.match(res.body.message, /can't|cannot/i);
  assert.equal(h.riderJobs["rider-1"][0].codAmount, 1300);
  assert.equal(jobCalls(h).length, 0);
});

test("an intent that isn't the real next step explains the actual step instead", async (t) => {
  const h = createHarness();
  t.after(h.cleanup);
  const res = await h.chat("tok-rider", "nakuha ko na");
  assert.match(res.body.message, /arriv/i);
  const confirmLabels = (findBlock(res, "delivery_card")?.actions || []).filter((a) => a.kind === "confirm").map((a) => a.label);
  assert.ok(!confirmLabels.some((label) => /picked up|confirm pickup/i.test(label)));
  assert.equal(h.riderJobs["rider-1"][0].status, "RIDER_TO_PICKUP");
});

test("status transitions follow the backend state machine", () => {
  assert.deepEqual(nextSteps({ status: "RIDER_TO_PICKUP" }), ["arrived-pickup"]);
  assert.deepEqual(nextSteps({ status: "ARRIVED_AT_PICKUP" }), ["confirm-pickup"]);
  assert.deepEqual(nextSteps({ status: "ARRIVED_AT_DROPOFF", paymentMethod: "COD", codAmount: 1300, codCollected: false }), ["collect-cod"]);
  assert.deepEqual(nextSteps({ status: "ARRIVED_AT_DROPOFF", paymentMethod: "COD", codAmount: 1300, codCollected: true }), ["complete"]);
  assert.deepEqual(nextSteps({ status: "DELIVERED" }), []);
});

test("pickup PIN: a wrong PIN gives a retry, the right PIN confirms pickup", async (t) => {
  const h = createHarness();
  t.after(h.cleanup);
  const arrived = await h.chat("tok-rider", "nandito na ako");
  await h.confirm("tok-rider", confirmTokenFrom(arrived));
  assert.equal(h.riderJobs["rider-1"][0].status, "ARRIVED_AT_PICKUP");

  const pickup = await h.chat("tok-rider", "picked up");
  const pinAction = findBlock(pickup, "delivery_card").actions.find((a) => a.kind === "confirm");
  assert.equal(pinAction.inputs[0].name, "pin");

  const wrong = await h.confirm("tok-rider", pinAction.token, { inputs: { pin: "5972" } });
  assert.match(wrong.body.message, /incorrect/i);
  assert.equal(h.riderJobs["rider-1"][0].status, "ARRIVED_AT_PICKUP");
  const retry = confirmTokenFrom(wrong);
  assert.ok(retry, "a fresh confirmation lets the rider try again");

  const right = await h.confirm("tok-rider", retry, { inputs: { pin: "4321" } });
  assert.equal(right.status, 200);
  assert.equal(h.riderJobs["rider-1"][0].status, "PICKED_UP");
  const persisted = readPersisted(h.dataDir);
  assert.ok(persisted.length > 0, "the session and audit log were written");
  assert.ok(!persisted.includes("4321"), "PINs are never persisted");
  assert.ok(!persisted.includes("5972"), "wrong PINs are never persisted");
});

test("COD collection always uses the backend amount", async (t) => {
  const h = createHarness({ riderJobs: { "rider-1": [atDropoff()], "rider-2": [] } });
  t.after(h.cleanup);
  const res = await h.chat("tok-rider", "what's next?");
  const collect = findBlock(res, "delivery_card").actions.find((a) => a.kind === "confirm");
  assert.match(collect.label, /1,300/);

  await h.confirm("tok-rider", collect.token, { inputs: { amount: 1 } });
  const call = jobCalls(h).find((c) => c.path.endsWith("/collect-cod"));
  assert.equal(call.body.amount, 1300);
  assert.equal(h.riderJobs["rider-1"][0].codCollected, true);

  const delivered = await h.chat("tok-rider", "delivered");
  const complete = findBlock(delivered, "delivery_card").actions.find((a) => a.kind === "confirm");
  const done = await h.confirm("tok-rider", complete.token, { inputs: { pin: "8765" } });
  assert.equal(done.status, 200);
  assert.equal(h.riderJobs["rider-1"][0].status, "DELIVERED");
  assert.deepEqual(done.body.clientEffects, { riderRefresh: true });
});

test("a stale confirmation is refused once the job has moved on", async (t) => {
  const h = createHarness();
  t.after(h.cleanup);
  const arrived = await h.chat("tok-rider", "nandito na ako");
  const token = confirmTokenFrom(arrived);
  h.riderJobs["rider-1"][0].status = "ARRIVED_AT_PICKUP";
  await h.confirm("tok-rider", token);
  assert.equal(jobCalls(h).length, 0);
});

test("earnings and COD cash are reported separately", async (t) => {
  const h = createHarness();
  t.after(h.cleanup);
  const res = await h.chat("tok-rider", "show my earnings");
  const summary = findBlock(res, "earnings_summary");
  assert.ok(summary);
  assert.ok(summary.earnings.some((row) => row.label === "Today" && row.value === "₱255"));
  assert.ok(summary.cash.some((row) => row.label === "Cash to remit" && row.value === "₱1,200"));
  assert.ok(!summary.earnings.some((row) => /cod|cash/i.test(row.label)));
});

test("issue reports prepare a ticket and only file it after a tap", async (t) => {
  const h = createHarness();
  t.after(h.cleanup);
  const res = await h.chat("tok-rider", "hindi sumasagot ang customer");
  const issue = findBlock(res, "confirmation");
  assert.ok(issue);
  assert.equal(h.tickets.length, 0);
  const token = confirmTokenFrom(res);
  await h.confirm("tok-rider", token);
  assert.equal(h.tickets.length, 1);
  assert.equal(h.tickets[0].category, "CUSTOMER_UNREACHABLE");
  assert.equal(h.tickets[0].deliveryId, "job-1");
});
