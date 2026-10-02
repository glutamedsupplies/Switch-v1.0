"use strict";

const { RIDER_ACTIVE_STATUSES, canTransition } = require("./constants");
const { normalizeSettings } = require("./settings");
const { derivePin, newId } = require("./tokens");
const { createRouteProvider } = require("./routing");

function srError(statusCode, code, message, extra = {}) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  Object.assign(error, extra);
  return error;
}

const JOB_STATUS_LABELS = Object.freeze({
  PREPARING: "Preparing",
  WAITING_FOR_RIDER: "Finding rider",
  OFFERED: "Finding rider",
  RIDER_ASSIGNED: "Rider assigned",
  RIDER_TO_PICKUP: "Rider heading to pickup",
  ARRIVED_AT_PICKUP: "Rider at pickup",
  PICKED_UP: "Picked up",
  IN_TRANSIT: "On the way",
  ARRIVED_AT_DROPOFF: "Rider arrived",
  DELIVERED: "Delivered",
  FAILED_DELIVERY: "Delivery failed",
  RETURN_REQUIRED: "Returning to seller",
  RETURNING_TO_SELLER: "Returning to seller",
  RETURNED_TO_SELLER: "Returned to seller",
  CANCELLED: "Cancelled",
});

// Transitions that also get an audit-log row (the history table records every transition).
const AUDITED_TRANSITIONS = Object.freeze({
  PICKED_UP: "PICKUP_VERIFIED",
  DELIVERED: "DELIVERY_COMPLETED",
  FAILED_DELIVERY: "DELIVERY_FAILED",
  RETURNED_TO_SELLER: "RETURN_CONFIRMED",
});

// Column whitelist for dynamic UPDATEs; keys always come from code, never from input.
const JOB_UPDATABLE_COLUMNS = new Set([
  "rider_id", "status", "dispatch_mode", "dispatch_attempts", "dispatch_stuck_notified", "current_offer_id",
  "pickup_name", "pickup_contact_phone", "pickup_address", "pickup_area", "pickup_latitude", "pickup_longitude",
  "cod_amount", "cod_collected_amount", "cod_collected_at", "pin_nonce",
  "pickup_pin_attempts", "delivery_pin_attempts", "return_pin_attempts",
  "delivery_confirmation_type", "delivery_pin_verified", "proof_of_delivery_id",
  "failure_reason", "failure_note", "cancelled_by", "cancelled_by_role", "cancellation_reason", "cancellation_stage",
  "ready_at", "offered_at", "accepted_at", "to_pickup_at", "arrived_pickup_at", "picked_up_at", "in_transit_at",
  "arrived_dropoff_at", "delivered_at", "failed_at", "return_started_at", "returned_at", "cancelled_at",
]);

const RIDER_UPDATABLE_COLUMNS = new Set([
  "status", "status_reason", "availability_status", "current_delivery_id", "last_online_at", "last_offline_at",
  "last_latitude", "last_longitude", "last_location_accuracy", "last_location_at", "approved_at", "approved_by",
  "last_login_at", "email", "emergency_contact_name", "emergency_contact_phone", "emergency_contact_relation",
  "password_hash", "profile_photo_key", "rating_average", "rating_count",
]);

function buildUpdate(table, whitelist, id, fields) {
  const keys = Object.keys(fields).filter((key) => fields[key] !== undefined);
  for (const key of keys) {
    if (!whitelist.has(key)) throw new Error(`Column ${key} is not updatable on ${table}.`);
  }
  const assignments = keys.map((key, index) => `${key} = $${index + 2}`);
  assignments.push("updated_at = NOW()");
  return {
    text: `UPDATE ${table} SET ${assignments.join(", ")} WHERE id = $1 RETURNING *`,
    values: [id, ...keys.map((key) => fields[key])],
  };
}

function createCore({
  db,
  secret,
  now = () => Date.now(),
  notifier = {},
  orderBridge = {},
  privateFiles = null,
  logger = console,
  routeProvider = null,
  verifyRegistrationEmail = null,
  verifyRiderSocialCredential = null,
}) {
  if (!db || typeof db.query !== "function" || typeof db.withTransaction !== "function") {
    throw new Error("Switch Rider requires a db with query() and withTransaction().");
  }

  const ctx = {
    db,
    secret,
    now,
    nowDate: () => new Date(now()),
    notifier,
    orderBridge,
    privateFiles,
    logger,
    verifyRegistrationEmail,
    verifyRiderSocialCredential,
    routeProvider: routeProvider || createRouteProvider({ getApiKey: () => "", now, logger }),
  };

  let settingsCache = null;
  let settingsCachedAt = 0;

  ctx.getSettings = async function getSettings({ fresh = false } = {}) {
    if (!fresh && settingsCache && now() - settingsCachedAt < 5000) return settingsCache;
    const result = await db.query("SELECT settings FROM switch_rider_settings WHERE id = 1");
    settingsCache = normalizeSettings(result.rows[0]?.settings || {});
    settingsCachedAt = now();
    return settingsCache;
  };

  ctx.updateSettings = async function updateSettings(patch, actor) {
    const current = await ctx.getSettings({ fresh: true });
    const next = normalizeSettings({ ...current, ...(patch && typeof patch === "object" ? patch : {}) });
    await db.query(
      `INSERT INTO switch_rider_settings (id, settings, updated_by, updated_at)
       VALUES (1, $1::jsonb, $2, NOW())
       ON CONFLICT (id) DO UPDATE SET settings = EXCLUDED.settings, updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
      [JSON.stringify(next), String(actor?.id || "")],
    );
    await ctx.audit(db, { actor, action: "SETTINGS_UPDATED", metadata: { settings: next } });
    settingsCache = next;
    settingsCachedAt = now();
    if (Boolean(current.enabled) !== Boolean(next.enabled)) {
      await notifySellersOfAvailabilityChange(next.enabled);
    }
    return next;
  };

  // Sellers with a pickup location are the ones whose checkout offers Switch Rider.
  async function notifySellersOfAvailabilityChange(enabled) {
    if (typeof notifier.notifySeller !== "function") return;
    let adminIds = [];
    try {
      const result = await db.query("SELECT admin_id FROM seller_pickup_locations");
      adminIds = result.rows.map((row) => String(row.admin_id || "").trim()).filter(Boolean);
    } catch (error) {
      logger.error?.("[switch-rider] could not list sellers for availability notice:", error?.message || error);
      return;
    }
    const notice = enabled
      ? {
          type: "switch_rider_enabled",
          title: "Switch Rider is available again",
          message: "Buyers can choose Switch Rider at checkout for your shop again.",
          priority: "normal",
        }
      : {
          type: "switch_rider_disabled",
          title: "Switch Rider is paused",
          message:
            "Super Admin paused Switch Rider. Buyers can't choose it at checkout for now. Deliveries already in progress continue as usual.",
          priority: "high",
        };
    for (const adminId of adminIds) {
      try {
        await notifier.notifySeller(adminId, notice);
      } catch (error) {
        logger.error?.("[switch-rider] availability notice failed:", error?.message || error);
      }
    }
  }

  /**
   * Runs work inside a transaction. Side effects (notifications to other
   * systems, order sync, follow-up dispatch) are queued and executed only after
   * COMMIT, so a rollback never leaves a notification for a change that didn't happen.
   */
  ctx.runInTx = async function runInTx(work) {
    const effects = [];
    const result = await db.withTransaction((client) => work(client, effects));
    for (const effect of effects) {
      try {
        await effect();
      } catch (error) {
        logger.error?.("[switch-rider] post-commit effect failed:", error?.message || error);
      }
    }
    return result;
  };

  ctx.getJob = async (client, id) => (await client.query("SELECT * FROM delivery_jobs WHERE id = $1", [id])).rows[0] || null;
  ctx.lockJob = async (client, id) =>
    (await client.query("SELECT * FROM delivery_jobs WHERE id = $1 FOR UPDATE", [id])).rows[0] || null;
  ctx.getRider = async (client, id) => (await client.query("SELECT * FROM riders WHERE id = $1", [id])).rows[0] || null;
  ctx.lockRider = async (client, id) =>
    (await client.query("SELECT * FROM riders WHERE id = $1 FOR UPDATE", [id])).rows[0] || null;

  ctx.updateJob = async (client, id, fields) => {
    const { text, values } = buildUpdate("delivery_jobs", JOB_UPDATABLE_COLUMNS, id, fields);
    return (await client.query(text, values)).rows[0];
  };

  ctx.updateRider = async (client, id, fields) => {
    const { text, values } = buildUpdate("riders", RIDER_UPDATABLE_COLUMNS, id, fields);
    return (await client.query(text, values)).rows[0];
  };

  ctx.recordHistory = async (client, { deliveryId, fromStatus = "", toStatus, actor, note = "", metadata = {} }) => {
    await client.query(
      `INSERT INTO delivery_status_history (delivery_id, from_status, to_status, actor_type, actor_id, note, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)`,
      [
        deliveryId,
        fromStatus || "",
        toStatus,
        String(actor?.type || "system"),
        String(actor?.id || ""),
        String(note || "").slice(0, 500),
        JSON.stringify(metadata || {}),
        ctx.nowDate(),
      ],
    );
  };

  /** Validated status change + history row. Throws 409 on an illegal transition. */
  ctx.transition = async (client, job, toStatus, { actor, note = "", metadata = {}, fields = {} } = {}) => {
    if (!canTransition(job.status, toStatus)) {
      throw srError(409, "INVALID_STATUS_TRANSITION", `This delivery is ${JOB_STATUS_LABELS[job.status] || job.status} and cannot move to ${JOB_STATUS_LABELS[toStatus] || toStatus}.`, {
        currentStatus: job.status,
      });
    }
    const updated = await ctx.updateJob(client, job.id, { ...fields, status: toStatus });
    await ctx.recordHistory(client, { deliveryId: job.id, fromStatus: job.status, toStatus, actor, note, metadata });
    if (AUDITED_TRANSITIONS[toStatus]) {
      await ctx.audit(client, {
        actor,
        action: AUDITED_TRANSITIONS[toStatus],
        deliveryId: job.id,
        riderId: updated.rider_id || null,
        metadata: { from: job.status, note, ...metadata },
      });
    }
    return updated;
  };

  ctx.audit = async (client, { actor, action, deliveryId = null, riderId = null, metadata = {} }) => {
    await client.query(
      `INSERT INTO switch_rider_audit_log (actor_type, actor_id, action, delivery_id, rider_id, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)`,
      [
        String(actor?.type || "system"),
        String(actor?.id || ""),
        action,
        deliveryId,
        riderId,
        JSON.stringify(metadata || {}),
        ctx.nowDate(),
      ],
    );
  };

  ctx.notifyRider = async (client, riderId, { type, title, body = "", deliveryId = null }) => {
    if (!riderId) return;
    await client.query(
      `INSERT INTO rider_notifications (id, rider_id, type, title, body, delivery_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [newId("rnt"), riderId, type, String(title).slice(0, 160), String(body).slice(0, 1000), deliveryId, ctx.nowDate()],
    );
  };

  ctx.notifyBuyer = async (client, job, { type, title, body = "" }) => {
    if (!job?.buyer_account_id) return;
    await client.query(
      `INSERT INTO buyer_delivery_notifications (id, buyer_account_id, delivery_id, order_group_id, type, title, body, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        newId("bdn"),
        job.buyer_account_id,
        job.id,
        job.order_group_id,
        type,
        String(title).slice(0, 160),
        String(body).slice(0, 1000),
        ctx.nowDate(),
      ],
    );
  };

  /** Queue a seller-admin inbox notification (post-commit). */
  ctx.queueSellerNotice = (effects, job, { type, title, message, priority = "normal" }) => {
    if (!job?.seller_admin_id || typeof notifier.notifySeller !== "function") return;
    effects.push(() =>
      notifier.notifySeller(job.seller_admin_id, {
        type,
        title,
        message,
        priority,
        deliveryId: job.id,
        deliveryCode: job.delivery_code,
        orderGroupId: job.order_group_id,
      }),
    );
  };

  /** Queue a Super Admin inbox notification (post-commit). */
  ctx.queueSuperAdminNotice = (effects, notice) => {
    if (typeof notifier.notifySuperAdmin !== "function") return;
    effects.push(() => notifier.notifySuperAdmin(notice));
  };

  // Registration must not wait for an external inbox notification to finish.
  // The effect is still started after COMMIT, but the HTTP response can return immediately.
  ctx.queueDetachedSuperAdminNotice = (effects, notice) => {
    if (typeof notifier.notifySuperAdmin !== "function") return;
    effects.push(() => {
      Promise.resolve()
        .then(() => notifier.notifySuperAdmin(notice))
        .catch((error) => logger.error?.("[switch-rider] post-commit notice failed:", error?.message || error));
    });
  };

  /** Queue an order-record sync (post-commit). Delivery job remains source of truth on failure. */
  ctx.queueOrderSync = (effects, job, event, extra = {}) => {
    if (typeof orderBridge.applyCourierUpdate !== "function") return;
    effects.push(() => orderBridge.applyCourierUpdate(job, event, extra));
  };

  ctx.countActiveJobs = async (client, riderId) => {
    const result = await client.query(
      "SELECT COUNT(*)::int AS count FROM delivery_jobs WHERE rider_id = $1 AND status = ANY($2::text[])",
      [riderId, [...RIDER_ACTIVE_STATUSES]],
    );
    return result.rows[0]?.count || 0;
  };

  /** After a rider's job ends/leaves them: back to ONLINE if nothing else is active. */
  ctx.freeRiderIfIdle = async (client, riderId) => {
    if (!riderId) return null;
    const rider = await ctx.lockRider(client, riderId);
    if (!rider) return null;
    const active = await client.query(
      `SELECT id FROM delivery_jobs WHERE rider_id = $1 AND status = ANY($2::text[])
       ORDER BY accepted_at ASC NULLS LAST LIMIT 1`,
      [riderId, [...RIDER_ACTIVE_STATUSES]],
    );
    const nextActive = active.rows[0]?.id || null;
    return ctx.updateRider(client, riderId, {
      current_delivery_id: nextActive,
      availability_status:
        nextActive ? "ON_DELIVERY" : rider.availability_status === "OFFLINE" ? "OFFLINE" : "ONLINE",
    });
  };

  /** Withdraw a rider's pending offer(s) and put those jobs back into dispatch. */
  ctx.withdrawRiderOffers = async (client, riderId, effects, { actor, note }) => {
    const withdrawn = (
      await client.query(
        `UPDATE delivery_offers SET status = 'WITHDRAWN', responded_at = $2
         WHERE rider_id = $1 AND status = 'PENDING' RETURNING id, delivery_id`,
        [riderId, ctx.nowDate()],
      )
    ).rows;
    for (const offer of withdrawn) {
      const job = await ctx.lockJob(client, offer.delivery_id);
      if (job && job.status === "OFFERED" && job.current_offer_id === offer.id) {
        await ctx.transition(client, job, "WAITING_FOR_RIDER", { actor, note, fields: { current_offer_id: null } });
        effects.push(() => ctx.dispatch?.dispatchJob(job.id));
      }
    }
    return withdrawn.length;
  };

  ctx.pin = (job, purpose) => derivePin(secret, { deliveryId: job.id, pinNonce: job.pin_nonce, purpose });

  ctx.requireRiderJob = async (client, riderId, jobId, { lock = true } = {}) => {
    const job = lock ? await ctx.lockJob(client, jobId) : await ctx.getJob(client, jobId);
    if (!job || job.rider_id !== riderId) {
      throw srError(404, "DELIVERY_NOT_FOUND", "Delivery not found.");
    }
    return job;
  };

  return ctx;
}

module.exports = {
  createCore,
  srError,
  JOB_STATUS_LABELS,
};
