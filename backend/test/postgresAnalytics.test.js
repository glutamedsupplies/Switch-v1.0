"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { isPostgresConfigured, closePool, query } = require("../db/pool");

function loadEnvFile(filePath) {
  const fs = require("fs");
  try {
    if (!fs.existsSync(filePath)) {
      return;
    }
    const raw = fs.readFileSync(filePath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith("#")) {
        continue;
      }
      const separatorIndex = trimmedLine.indexOf("=");
      if (separatorIndex <= 0) {
        continue;
      }
      const key = trimmedLine.slice(0, separatorIndex).trim();
      if (!key || process.env[key] != null) {
        continue;
      }
      let value = trimmedLine.slice(separatorIndex + 1).trim();
      if (
        value.length >= 2
        && ((value.startsWith('"') && value.endsWith('"'))
          || (value.startsWith("'") && value.endsWith("'")))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  } catch (_) {
    // ignore
  }
}

loadEnvFile(require("path").join(__dirname, "..", ".env"));

const skip = !isPostgresConfigured();

test("Postgres analytics ingest, funnel, and summary", { skip }, async (t) => {
  const { runMigrations } = require("../db/migrate");
  const {
    createAnalyticsApi,
    insertAnalyticsEvents,
    getAnalyticsFunnel,
    getAnalyticsSummary,
    isAnalyticsPostgresReady,
    validateEventBatch,
  } = require("../services/analyticsApi");
  const { syncOrdersToPostgres } = require("../services/postgresOrdersStore");

  await runMigrations();
  assert.equal(await isAnalyticsPostgresReady(), true);

  const suffix = `a${Date.now()}`;
  const adminId = `admin_${suffix}`;
  const otherAdminId = `admin_other_${suffix}`;
  const accountId = `acct_${suffix}`;
  const productId = `prd_${suffix}`;
  const now = new Date();
  const from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const to = new Date(now.getTime() + 60 * 1000);

  t.after(async () => {
    try {
      await query(`DELETE FROM analytics_events WHERE admin_id = ANY($1::text[])`, [
        [adminId, otherAdminId],
      ]);
      await query(`DELETE FROM order_items WHERE admin_id = ANY($1::text[])`, [
        [adminId, otherAdminId],
      ]);
      await query(`DELETE FROM orders WHERE admin_id = ANY($1::text[])`, [
        [adminId, otherAdminId],
      ]);
    } finally {
      await closePool();
    }
  });

  const table = await query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'analytics_events'
  `);
  const columns = new Set(table.rows.map((row) => row.column_name));
  for (const column of [
    "id",
    "admin_id",
    "user_id",
    "session_id",
    "event_name",
    "product_id",
    "order_id",
    "properties",
    "created_at",
  ]) {
    assert.ok(columns.has(column), `missing column ${column}`);
  }

  const clientEvents = validateEventBatch(
    {
      events: [
        { eventName: "product_view", productId, properties: { source: "test" } },
        { eventName: "product_view", productId },
        { eventName: "add_to_cart", productId, properties: { quantity: 1 } },
        { eventName: "begin_checkout", productId },
      ],
    },
    { adminId, userId: accountId, sessionId: `sess_${suffix}` },
  );
  const inserted = await insertAnalyticsEvents(clientEvents);
  assert.equal(inserted.length, 4);

  const unknownOrder = await insertAnalyticsEvents([
    {
      adminId,
      userId: accountId,
      eventName: "begin_checkout",
      orderId: `og_missing_${suffix}`,
      properties: { note: "stale client order id" },
    },
  ]);
  assert.equal(unknownOrder[0].orderId, null);

  const createdAtEpochMs = Date.now();
  const synced = await syncOrdersToPostgres(
    [
      {
        id: `ord_paid_${suffix}`,
        adminId,
        accountId,
        productId,
        productName: "Analytics serum",
        quantity: 2,
        unitPrice: 150,
        stage: "toPrepare",
        createdAtEpochMs,
      },
      {
        id: `ord_cancel_${suffix}`,
        adminId,
        accountId,
        productId,
        productName: "Analytics serum",
        quantity: 1,
        unitPrice: 80,
        stage: "cancelled",
        createdAtEpochMs: createdAtEpochMs + 1,
        cancelledAt: now.toISOString(),
      },
    ],
    { deleteMissing: false },
  );
  const paidGroupId = synced[0].orderGroupId;
  const cancelGroupId = synced[1].orderGroupId;
  assert.match(paidGroupId, /^og_/);

  await syncOrdersToPostgres(
    [
      {
        id: `ord_paid_${suffix}`,
        adminId,
        accountId,
        productId,
        quantity: 2,
        unitPrice: 150,
        stage: "toShip",
        createdAtEpochMs,
        packedAt: now.toISOString(),
      },
    ],
    { deleteMissing: false, adminId, mode: "stable" },
  );

  const api = createAnalyticsApi({
    sendJson() {},
    parseRequestBody() {
      return {};
    },
    isSuperAdminAuthorized() {
      return false;
    },
  });

  await api.recordOrderLifecycleEvents(
    [],
    [
      {
        id: `ord_paid_${suffix}`,
        orderGroupId: paidGroupId,
        adminId,
        accountId,
        productId,
        stage: "toPrepare",
        paidAt: now.toISOString(),
      },
    ],
    { source: "test" },
  );
  await api.recordOrderLifecycleEvents(
    [
      {
        id: `ord_paid_${suffix}`,
        orderGroupId: paidGroupId,
        adminId,
        accountId,
        productId,
        stage: "toPrepare",
        paidAt: now.toISOString(),
      },
    ],
    [
      {
        id: `ord_paid_${suffix}`,
        orderGroupId: paidGroupId,
        adminId,
        accountId,
        productId,
        stage: "toShip",
        paidAt: now.toISOString(),
        packedAt: now.toISOString(),
      },
    ],
  );

  const linked = await query(
    `SELECT order_id, event_name FROM analytics_events WHERE order_id = $1`,
    [paidGroupId],
  );
  assert.ok(linked.rowCount >= 1, "lifecycle events should FK to the order group");

  await insertAnalyticsEvents(
    validateEventBatch(
      { eventName: "product_view", productId: `prd_other_${suffix}` },
      { adminId: otherAdminId, userId: `acct_other_${suffix}` },
    ),
  );

  const funnel = await getAnalyticsFunnel({ adminId, from, to });
  const byName = Object.fromEntries(funnel.stages.map((stage) => [stage.eventName, stage]));
  assert.equal(byName.product_view.count, 2);
  assert.equal(byName.add_to_cart.count, 1);
  assert.equal(byName.begin_checkout.count, 2, "includes the stale-order begin_checkout row");
  assert.ok(byName.place_order.count >= 1);
  assert.ok(byName.payment_success.count >= 1);
  assert.ok(byName.pack.count >= 1);
  assert.equal(byName.product_view.conversionFromPrevious, null);
  assert.equal(byName.add_to_cart.conversionFromPrevious, 0.5);
  assert.ok(funnel.cancel.count >= 1);

  const otherFunnel = await getAnalyticsFunnel({ adminId: otherAdminId, from, to });
  assert.equal(otherFunnel.stages[0].count, 1);
  assert.equal(otherFunnel.stages.find((stage) => stage.eventName === "place_order").count, 0);

  const summary = await getAnalyticsSummary({ adminId, from, to });
  assert.equal(summary.gmv, 300);
  assert.ok(summary.paidOrderCount >= 1);
  assert.equal(summary.aov, 300);
  assert.ok(summary.placedOrderCount >= 2);
  assert.ok(summary.cancelledOrderCount >= 1);
  assert.ok(summary.cancelRate > 0);

  const leaked = await query(
    `SELECT DISTINCT admin_id FROM analytics_events WHERE admin_id = $1`,
    [adminId],
  );
  assert.equal(leaked.rows.every((row) => row.admin_id === adminId), true);
  assert.ok(cancelGroupId);
});
