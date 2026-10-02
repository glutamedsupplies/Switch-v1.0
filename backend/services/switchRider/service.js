"use strict";

const { createCore } = require("./core");
const { createRiderAccounts } = require("./riders");
const { createDispatch } = require("./dispatch");
const { createMoney } = require("./money");
const { createWorkflow } = require("./workflow");
const { createViews } = require("./views");

const AUTO_OFFLINE_AFTER_MINUTES = 30;

/**
 * Switch Rider domain service. Pure data + rules; HTTP lives in api.js.
 *
 * deps:
 *   db           { query, withTransaction }
 *   secret       signing secret for PINs and checkout quotes
 *   now          () => epoch ms (injectable for tests)
 *   notifier     { notifySeller(adminId, n), notifySuperAdmin(n) }
 *   orderBridge  { applyCourierUpdate(job, event, extra) }
 *   privateFiles private object store for documents / proofs
 *   routeProvider { computeRoute(origin, destination, options) } for live tracking routes
 */
function createSwitchRiderService(deps) {
  const ctx = createCore(deps);
  const money = createMoney(ctx);
  const riders = createRiderAccounts(ctx);
  const dispatch = createDispatch(ctx);
  ctx.dispatch = dispatch;
  const workflow = createWorkflow(ctx, { money });
  const views = createViews(ctx, { money });

  async function autoOfflineStaleRiders() {
    const cutoff = new Date(ctx.now() - AUTO_OFFLINE_AFTER_MINUTES * 60 * 1000);
    const rows = (
      await ctx.db.query(
        `UPDATE riders SET availability_status = 'OFFLINE', last_offline_at = $2, updated_at = NOW()
         WHERE availability_status = 'ONLINE'
           AND COALESCE(last_location_at, last_online_at, created_at) < $1
           AND NOT EXISTS (SELECT 1 FROM delivery_offers o WHERE o.rider_id = riders.id AND o.status = 'PENDING')
         RETURNING id`,
        [cutoff, ctx.nowDate()],
      )
    ).rows;
    for (const { id } of rows) {
      await ctx.notifyRider(ctx.db, id, {
        type: "ACCOUNT",
        title: "You were set offline",
        body: "We stopped receiving your location. Open Switch Rider and go online again to receive jobs.",
      });
      await ctx.audit(ctx.db, { actor: { type: "system" }, action: "AUTO_OFFLINE", riderId: id });
    }
    return rows.length;
  }

  async function pruneLocations() {
    const settings = await ctx.getSettings();
    const cutoff = new Date(ctx.now() - settings.locationRetentionDays * 24 * 60 * 60 * 1000);
    const result = await ctx.db.query(
      `DELETE FROM rider_locations WHERE id IN (SELECT id FROM rider_locations WHERE recorded_at < $1 LIMIT 5000)`,
      [cutoff],
    );
    return result.rowCount || 0;
  }

  let sweeping = false;
  let lastPruneAt = 0;

  /** Periodic maintenance; safe to call concurrently (re-entrancy guarded, row locks inside). */
  async function runSweep() {
    if (sweeping) return { skipped: true };
    sweeping = true;
    const summary = {};
    try {
      summary.expiredOffers = await dispatch.expireDueOffers();
      summary.offered = await dispatch.redispatchWaitingJobs();
      summary.releasedEarnings = await money.releaseDueEarnings();
      summary.autoOffline = await autoOfflineStaleRiders();
      if (ctx.now() - lastPruneAt > 60 * 60 * 1000) {
        summary.prunedLocations = await pruneLocations();
        lastPruneAt = ctx.now();
      }
    } finally {
      sweeping = false;
    }
    return summary;
  }

  return {
    getSettings: ctx.getSettings,
    updateSettings: ctx.updateSettings,
    ...riders,
    ...dispatch,
    ...workflow,
    ...money,
    ...views,
    runSweep,
    autoOfflineStaleRiders,
    pruneLocations,
    pinFor: (job, purpose) => ctx.pin(job, purpose),
  };
}

module.exports = { createSwitchRiderService };
