"use strict";

const {
  ASSIGNED_PRE_PICKUP_STATUSES,
  BUYER_DELIVERY_PIN_STATUSES,
  BUYER_LIVE_LOCATION_STATUSES,
  INCIDENT_CATEGORIES,
  RIDER_ACTIVE_STATUSES,
} = require("./constants");
const { srError, JOB_STATUS_LABELS } = require("./core");
const { normalizeCoordinates, roundTo } = require("./geo");
const {
  iso,
  num,
  riderPublicProfile,
  serializeHistory,
  serializeJobForAdmin,
  serializeJobForRider,
  serializeRiderForAdmin,
  jobTimestamps,
} = require("./serializers");
const { newId } = require("./tokens");

const BUYER_TIMELINE = [
  { key: "confirmed", label: "Order confirmed" },
  { key: "preparing", label: "Preparing" },
  { key: "ready", label: "Ready for pickup" },
  { key: "finding", label: "Finding rider" },
  { key: "assigned", label: "Rider assigned" },
  { key: "to_pickup", label: "Rider picking up" },
  { key: "picked_up", label: "Picked up" },
  { key: "on_the_way", label: "On the way" },
  { key: "arriving", label: "Arriving" },
  { key: "delivered", label: "Delivered" },
];

const STATUS_TIMELINE_INDEX = Object.freeze({
  PREPARING: 1,
  WAITING_FOR_RIDER: 3,
  OFFERED: 3,
  RIDER_ASSIGNED: 4,
  RIDER_TO_PICKUP: 5,
  ARRIVED_AT_PICKUP: 5,
  PICKED_UP: 6,
  IN_TRANSIT: 7,
  ARRIVED_AT_DROPOFF: 8,
  DELIVERED: 9,
});

const ADMIN_VIEWS = Object.freeze({
  preparing: ["PREPARING"],
  waiting: ["WAITING_FOR_RIDER", "OFFERED"],
  assigned: ["RIDER_ASSIGNED"],
  pickup: ["RIDER_TO_PICKUP", "ARRIVED_AT_PICKUP"],
  in_transit: ["PICKED_UP", "IN_TRANSIT", "ARRIVED_AT_DROPOFF"],
  delivered: ["DELIVERED"],
  failed: ["FAILED_DELIVERY", "RETURN_REQUIRED", "RETURNING_TO_SELLER", "RETURNED_TO_SELLER"],
  cancelled: ["CANCELLED"],
});

function cleanText(value, max = 500) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function createViews(ctx, { money }) {
  const { db } = ctx;

  async function loadProofs(client, deliveryId) {
    return (
      await client.query(
        `SELECT id, proof_type, content_type, uploaded_at FROM delivery_proofs WHERE delivery_id = $1 ORDER BY uploaded_at`,
        [deliveryId],
      )
    ).rows;
  }

  function routePoint(coordinates, { kind, label }) {
    return coordinates
      ? { kind, label: cleanText(label, 120), lat: coordinates.lat, lng: coordinates.lng }
      : null;
  }

  function routeStopLabel(name, address, area) {
    const stopName = cleanText(name, 80);
    const stopAddress = cleanText(address, 220) || cleanText(area, 80);
    return [stopName, stopAddress].filter(Boolean).join(" · ");
  }

  async function routeSegment(origin, destination, job, cacheSuffix, { ttlMs = 30 * 1000 } = {}) {
    if (!origin || !destination) return null;
    const settings = await ctx.getSettings();
    return ctx.routeProvider.computeRoute(origin, destination, {
      cacheKey: `${job.id}:rider:${cacheSuffix}`,
      ttlMs,
      roadFactor: settings.roadFactor,
      averageSpeedKph: settings.averageSpeedKph,
    });
  }

  function serializeRiderRoute(job, { phase, origin, destination, segment, updatedAt = null }) {
    return {
      deliveryId: job.id,
      deliveryCode: job.delivery_code,
      status: job.status,
      phase,
      origin,
      destination,
      encodedPolyline: segment?.encodedPolyline || "",
      distanceMeters: Number(segment?.distanceMeters) || 0,
      durationSeconds: Number(segment?.durationSeconds) || 0,
      source: segment?.source || "",
      updatedAt: iso(updatedAt),
    };
  }

  /** Route preview shown to only the rider holding the live offer. */
  async function getOfferRouteForRider(riderId, offerId) {
    const row = (
      await db.query(
        `SELECT o.expires_at, row_to_json(j.*) AS job
           FROM delivery_offers o
           JOIN delivery_jobs j ON j.id = o.delivery_id
          WHERE o.id = $1 AND o.rider_id = $2 AND o.status = 'PENDING'
            AND o.expires_at > $3 AND j.status = 'OFFERED' AND j.current_offer_id = o.id
          LIMIT 1`,
        [offerId, riderId, ctx.nowDate()],
      )
    ).rows[0];
    if (!row?.job) throw srError(404, "OFFER_NOT_FOUND", "This delivery offer is no longer available.");

    const job = row.job;
    const pickup = normalizeCoordinates(job.pickup_latitude, job.pickup_longitude);
    const dropoff = normalizeCoordinates(job.dropoff_latitude, job.dropoff_longitude);
    const segment = await routeSegment(pickup, dropoff, job, "offer-overview", { ttlMs: 6 * 60 * 60 * 1000 });
    return serializeRiderRoute(job, {
      phase: "OVERVIEW",
      origin: routePoint(pickup, {
        kind: "PICKUP",
        label: routeStopLabel(job.pickup_name, job.pickup_address, job.pickup_area),
      }),
      destination: routePoint(dropoff, {
        kind: "DROPOFF",
        label: routeStopLabel(job.dropoff_name, job.dropoff_address, job.dropoff_area),
      }),
      segment,
    });
  }

  /** Live rider route changes destination after pickup and while returning. */
  async function getJobRouteForRider(riderId, jobId, liveOriginInput = null) {
    const job = await ctx.requireRiderJob(db, riderId, jobId, { lock: false });
    if (["DELIVERED", "RETURNED_TO_SELLER", "CANCELLED"].includes(job.status)) {
      throw srError(409, "DELIVERY_FINISHED", "This delivery route is already finished.");
    }
    const rider = await ctx.getRider(db, riderId);
    // Prefer the authenticated rider app's fresh device GPS for this route.
    // The regular location endpoint still persists accepted tracking points;
    // this keeps navigation accurate even while that endpoint is rate-limited.
    const liveOrigin = normalizeCoordinates(liveOriginInput?.lat, liveOriginInput?.lng);
    const riderPoint = liveOrigin || normalizeCoordinates(rider?.last_latitude, rider?.last_longitude);
    const pickup = normalizeCoordinates(job.pickup_latitude, job.pickup_longitude);
    const dropoff = normalizeCoordinates(job.dropoff_latitude, job.dropoff_longitude);
    const returning = ["RETURN_REQUIRED", "RETURNING_TO_SELLER", "FAILED_DELIVERY"].includes(job.status);
    const carryingParcel = ["PICKED_UP", "IN_TRANSIT", "ARRIVED_AT_DROPOFF"].includes(job.status);

    const phase = returning ? "TO_RETURN" : carryingParcel ? "TO_DROPOFF" : "TO_PICKUP";
    const destinationPoint = returning || !carryingParcel ? pickup : dropoff;
    const destinationKind = returning || !carryingParcel ? "PICKUP" : "DROPOFF";
    const destinationLabel = destinationKind === "PICKUP"
      ? routeStopLabel(job.pickup_name, job.pickup_address, job.pickup_area)
      : routeStopLabel(job.dropoff_name, job.dropoff_address, job.dropoff_area);
    const segment = await routeSegment(riderPoint, destinationPoint, job, phase.toLowerCase(), {
      ttlMs: liveOrigin ? 0 : 30 * 1000,
    });

    return serializeRiderRoute(job, {
      phase,
      origin: routePoint(riderPoint, { kind: "RIDER", label: "Your current location" }),
      destination: routePoint(destinationPoint, { kind: destinationKind, label: destinationLabel }),
      segment,
      updatedAt: rider?.last_location_at,
    });
  }

  // -------------------------------------------------------------------- rider

  async function getRiderDashboard(riderId) {
    const rider = await ctx.getRider(db, riderId);
    if (!rider) throw srError(404, "RIDER_NOT_FOUND", "Rider not found.");
    const periods = money.manilaPeriodStarts(ctx.now());
    const [today, balances, cash, activeJobs] = await Promise.all([
      db.query(
        `SELECT
           COALESCE((SELECT SUM(total) FROM rider_earnings WHERE rider_id = $1 AND status <> 'VOID' AND created_at >= $2), 0) AS earnings,
           (SELECT COUNT(*)::int FROM delivery_jobs WHERE rider_id = $1 AND status = 'DELIVERED' AND delivered_at >= $2) AS completed`,
        [riderId, periods.today],
      ),
      money.getBalances(db, riderId),
      money.getCashWallet(riderId),
      db.query(
        `SELECT * FROM delivery_jobs WHERE rider_id = $1 AND status = ANY($2::text[]) ORDER BY accepted_at ASC NULLS LAST`,
        [riderId, [...RIDER_ACTIVE_STATUSES]],
      ),
    ]);
    const unread = (
      await db.query(`SELECT COUNT(*)::int AS count FROM rider_notifications WHERE rider_id = $1 AND read_at IS NULL`, [riderId])
    ).rows[0].count;
    const statusLabel =
      rider.availability_status === "ON_DELIVERY" || activeJobs.rows.length
        ? "ON DELIVERY"
        : rider.availability_status === "ONLINE"
          ? "ONLINE"
          : "OFFLINE";
    return {
      riderStatus: rider.status,
      availabilityStatus: rider.availability_status,
      statusLabel,
      todayEarnings: roundTo(num(today.rows[0].earnings), 2),
      completedToday: today.rows[0].completed,
      pendingEarnings: balances.pending,
      availableEarnings: balances.available,
      cashOnHand: cash.outstanding,
      currentDelivery: activeJobs.rows[0] ? serializeJobForRider(activeJobs.rows[0]) : null,
      activeDeliveryCount: activeJobs.rows.length,
      unreadNotifications: unread,
      lastLocationAt: iso(rider.last_location_at),
    };
  }

  async function listActiveJobs(riderId) {
    const rows = (
      await db.query(
        `SELECT * FROM delivery_jobs WHERE rider_id = $1 AND status = ANY($2::text[]) ORDER BY accepted_at ASC NULLS LAST`,
        [riderId, [...RIDER_ACTIVE_STATUSES]],
      )
    ).rows;
    return rows.map((job) => serializeJobForRider(job));
  }

  async function getJobForRider(riderId, jobId) {
    const job = await ctx.requireRiderJob(db, riderId, jobId, { lock: false });
    const [proofs, history] = await Promise.all([
      loadProofs(db, jobId),
      db.query(`SELECT * FROM delivery_status_history WHERE delivery_id = $1 ORDER BY created_at, id`, [jobId]),
    ]);
    return {
      ...serializeJobForRider(job, { proofs }),
      pickupPinAttemptsRemaining: Math.max(0, 5 - (Number(job.pickup_pin_attempts) || 0)),
      deliveryPinAttemptsRemaining: Math.max(0, 5 - (Number(job.delivery_pin_attempts) || 0)),
      returnPinAttemptsRemaining: Math.max(0, 5 - (Number(job.return_pin_attempts) || 0)),
      history: serializeHistory(history.rows),
    };
  }

  async function getRiderHistory(riderId, { limit = 30, offset = 0 } = {}) {
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 30));
    const safeOffset = Math.max(0, Number(offset) || 0);
    const rows = (
      await db.query(
        `SELECT j.id, j.delivery_code, j.status, j.pickup_area, j.dropoff_area, j.distance_km, j.payment_method, j.cod_amount,
                j.delivered_at, j.returned_at, j.cancelled_at, j.created_at, j.accepted_at, j.failure_reason,
                e.total AS earning_total, e.status AS earning_status, rt.stars AS rating,
                'COMPLETED' AS kind, COALESCE(j.delivered_at, j.returned_at, j.cancelled_at, j.updated_at) AS finished_at
         FROM delivery_jobs j
         LEFT JOIN rider_earnings e ON e.delivery_id = j.id
         LEFT JOIN rider_ratings rt ON rt.delivery_id = j.id
         WHERE j.rider_id = $1 AND j.status IN ('DELIVERED','RETURNED_TO_SELLER','CANCELLED')
         UNION ALL
         SELECT j.id, j.delivery_code, 'RELEASED' AS status, j.pickup_area, j.dropoff_area, j.distance_km, j.payment_method, j.cod_amount,
                NULL, NULL, NULL, j.created_at, NULL, a.metadata->>'reason',
                NULL, NULL, NULL,
                'RELEASED' AS kind, a.created_at AS finished_at
         FROM switch_rider_audit_log a JOIN delivery_jobs j ON j.id = a.delivery_id
         WHERE a.rider_id = $1 AND a.action = 'RIDER_RELEASED'
         ORDER BY finished_at DESC
         LIMIT ${safeLimit} OFFSET ${safeOffset}`,
        [riderId],
      )
    ).rows;
    return rows.map((row) => ({
      deliveryId: row.id,
      deliveryCode: row.delivery_code,
      status: row.status,
      statusLabel: row.kind === "RELEASED" ? "Handed back" : JOB_STATUS_LABELS[row.status] || row.status,
      route: `${row.pickup_area || "Pickup"} → ${row.dropoff_area || "Drop-off"}`,
      distanceKm: num(row.distance_km),
      paymentMethod: row.payment_method,
      codAmount: row.payment_method === "COD" ? num(row.cod_amount) : 0,
      earning: row.earning_total === null || row.earning_total === undefined ? 0 : num(row.earning_total),
      earningStatus: row.earning_status || "",
      rating: row.rating ? Number(row.rating) : null,
      finishedAt: iso(row.finished_at),
    }));
  }

  /**
   * Performance over the last 30 days.
   * - Acceptance rate  = accepted offers / (accepted + declined + expired offers)
   * - Completion rate  = delivered / (delivered + returned-to-seller + handed back + cancelled after assignment)
   * - Cancellation rate = handed back (rider released) / same denominator as completion
   * - On-time rate     = delivered within (estimated minutes + 15) of pickup / delivered
   */
  async function getRiderPerformance(riderId) {
    const since = new Date(ctx.now() - 30 * 24 * 60 * 60 * 1000);
    const [offers, jobs, released, ratings] = await Promise.all([
      db.query(
        `SELECT status, COUNT(*)::int AS count FROM delivery_offers WHERE rider_id = $1 AND offered_at >= $2 GROUP BY status`,
        [riderId, since],
      ),
      db.query(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'DELIVERED')::int AS delivered,
           COUNT(*) FILTER (WHERE status = 'RETURNED_TO_SELLER')::int AS returned,
           COUNT(*) FILTER (WHERE status = 'CANCELLED' AND accepted_at IS NOT NULL)::int AS cancelled_assigned,
           COUNT(*) FILTER (
             WHERE status = 'DELIVERED' AND picked_up_at IS NOT NULL
               AND delivered_at <= picked_up_at + make_interval(mins => estimated_minutes + 15)
           )::int AS on_time
         FROM delivery_jobs WHERE rider_id = $1 AND created_at >= $2`,
        [riderId, since],
      ),
      db.query(
        `SELECT COUNT(*)::int AS count FROM switch_rider_audit_log
         WHERE rider_id = $1 AND action = 'RIDER_RELEASED' AND actor_type = 'rider' AND created_at >= $2`,
        [riderId, since],
      ),
      db.query(`SELECT rating_average, rating_count FROM riders WHERE id = $1`, [riderId]),
    ]);
    const offerCounts = Object.fromEntries(offers.rows.map((row) => [row.status, row.count]));
    const accepted = offerCounts.ACCEPTED || 0;
    const offerDenominator = accepted + (offerCounts.DECLINED || 0) + (offerCounts.EXPIRED || 0);
    const j = jobs.rows[0];
    const releasedCount = released.rows[0].count;
    const completionDenominator = j.delivered + j.returned + releasedCount + j.cancelled_assigned;
    const pct = (numerator, denominator) => (denominator > 0 ? roundTo((numerator / denominator) * 100, 1) : null);
    return {
      periodDays: 30,
      acceptanceRate: pct(accepted, offerDenominator),
      completionRate: pct(j.delivered, completionDenominator),
      cancellationRate: pct(releasedCount, completionDenominator),
      onTimeRate: pct(j.on_time, j.delivered),
      deliveredCount: j.delivered,
      offersReceived: offerDenominator,
      ratingAverage: num(ratings.rows[0]?.rating_average),
      ratingCount: Number(ratings.rows[0]?.rating_count) || 0,
      definitions: {
        acceptanceRate: "Accepted offers ÷ (accepted + declined + expired offers), last 30 days.",
        completionRate: "Delivered ÷ (delivered + returned + handed back + cancelled after you accepted), last 30 days.",
        cancellationRate: "Jobs you handed back ÷ the same total as completion rate, last 30 days.",
        onTimeRate: "Deliveries completed within the estimate + 15 minutes after pickup.",
      },
    };
  }

  async function listRiderNotifications(riderId, { limit = 100 } = {}) {
    const safeLimit = Math.min(200, Math.max(1, Number(limit) || 100));
    const [rows, unread] = await Promise.all([
      db.query(`SELECT * FROM rider_notifications WHERE rider_id = $1 ORDER BY created_at DESC LIMIT ${safeLimit}`, [riderId]),
      db.query(`SELECT COUNT(*)::int AS count FROM rider_notifications WHERE rider_id = $1 AND read_at IS NULL`, [riderId]),
    ]);
    return {
      unreadCount: unread.rows[0].count,
      notifications: rows.rows.map((row) => ({
        id: row.id,
        type: row.type,
        title: row.title,
        body: row.body,
        deliveryId: row.delivery_id || "",
        read: Boolean(row.read_at),
        createdAt: iso(row.created_at),
      })),
    };
  }

  async function markRiderNotificationsRead(riderId, { ids = null } = {}) {
    if (Array.isArray(ids) && ids.length) {
      await db.query(
        `UPDATE rider_notifications SET read_at = $3 WHERE rider_id = $1 AND id = ANY($2::text[]) AND read_at IS NULL`,
        [riderId, ids.map(String).slice(0, 500), ctx.nowDate()],
      );
    } else {
      await db.query(`UPDATE rider_notifications SET read_at = $2 WHERE rider_id = $1 AND read_at IS NULL`, [riderId, ctx.nowDate()]);
    }
    return { ok: true };
  }

  // ------------------------------------------------------------------- seller

  function serializeJobForSeller(job, rider) {
    const showPickupPin = ASSIGNED_PRE_PICKUP_STATUSES.has(job.status) || job.status === "WAITING_FOR_RIDER" || job.status === "OFFERED";
    const showReturnPin = job.status === "RETURN_REQUIRED" || job.status === "RETURNING_TO_SELLER";
    return {
      deliveryId: job.id,
      deliveryCode: job.delivery_code,
      orderGroupId: job.order_group_id,
      orderCreatedAtEpochMs: Number(job.order_created_at_epoch_ms) || 0,
      provider: job.delivery_provider,
      status: job.status,
      statusLabel: JOB_STATUS_LABELS[job.status] || job.status,
      pickupPin: showPickupPin ? ctx.pin(job, "pickup") : "",
      returnPin: showReturnPin ? ctx.pin(job, "return") : "",
      rider: job.rider_id && rider ? riderPublicProfile(rider) : null,
      riderPhone:
        rider && (ASSIGNED_PRE_PICKUP_STATUSES.has(job.status) || showReturnPin)
          ? `${rider.country_code}${rider.mobile_number}`
          : "",
      paymentMethod: job.payment_method,
      codAmount: job.payment_method === "COD" ? num(job.cod_amount) : 0,
      customerDeliveryFee: num(job.customer_delivery_fee),
      distanceKm: num(job.distance_km),
      estimatedMinutes: Number(job.estimated_minutes) || 0,
      pickup: { address: job.pickup_address, area: job.pickup_area },
      failureReason: job.failure_reason || "",
      cancellationReason: job.cancellation_reason || "",
      cancelledByRole: job.cancelled_by_role || "",
      canMarkReady: job.status === "PREPARING",
      timestamps: jobTimestamps(job),
    };
  }

  async function listSellerDeliveries(adminId, { orderGroupIds = [], limit = 100 } = {}) {
    const ids = (Array.isArray(orderGroupIds) ? orderGroupIds : []).map(String).filter(Boolean).slice(0, 200);
    const values = [adminId];
    let filter = "";
    if (ids.length) {
      values.push(ids);
      filter = "AND (j.order_group_id = ANY($2::text[]) OR j.order_created_at_epoch_ms::text = ANY($2::text[]))";
    }
    // Latest job per order group (a cancelled job can be followed by a new one).
    const rows = (
      await db.query(
        `SELECT DISTINCT ON (j.order_group_id) j.*, row_to_json(r.*) AS rider
         FROM delivery_jobs j LEFT JOIN riders r ON r.id = j.rider_id
         WHERE j.seller_admin_id = $1 ${filter}
         ORDER BY j.order_group_id, j.created_at DESC
         LIMIT ${Math.min(500, Math.max(1, Number(limit) || 100))}`,
        values,
      )
    ).rows;
    return rows.map((row) => serializeJobForSeller(row, row.rider));
  }

  async function getSellerDelivery(adminId, orderGroupId) {
    const [job] = await listSellerDeliveries(adminId, { orderGroupIds: [orderGroupId], limit: 1 });
    return job || null;
  }

  // -------------------------------------------------------------------- buyer

  function buildBuyerTimeline(job) {
    const index = STATUS_TIMELINE_INDEX[job.status];
    const times = {
      confirmed: job.created_at,
      ready: job.ready_at,
      assigned: job.accepted_at,
      to_pickup: job.to_pickup_at || job.arrived_pickup_at,
      picked_up: job.picked_up_at,
      on_the_way: job.in_transit_at,
      arriving: job.arrived_dropoff_at,
      delivered: job.delivered_at,
    };
    return BUYER_TIMELINE.map((step, position) => ({
      key: step.key,
      label: step.label,
      done: index !== undefined && position < index ? true : index === 9 && position === 9,
      active: index !== undefined && position === index && index !== 9,
      at: iso(times[step.key]),
    }));
  }

  /**
   * Route segments for the buyer map:
   *   before a rider has a fresh fix → PLANNED (store → buyer)
   *   rider heading to the store     → TO_PICKUP (rider → store) + PLANNED
   *   rider has the parcel           → TO_DROPOFF (rider → buyer)
   */
  async function buildBuyerRoute(row, riderPoint, settings) {
    if (["DELIVERED", "CANCELLED", "FAILED_DELIVERY", "RETURN_REQUIRED", "RETURNING_TO_SELLER", "RETURNED_TO_SELLER"].includes(row.status)) {
      return null;
    }
    const pickup = { lat: num(row.pickup_latitude), lng: num(row.pickup_longitude) };
    const dropoff = { lat: num(row.dropoff_latitude), lng: num(row.dropoff_longitude) };
    const routeOptions = { roadFactor: settings.roadFactor, averageSpeedKph: settings.averageSpeedKph };
    const segment = async (kind, origin, destination, options) => {
      const route = await ctx.routeProvider.computeRoute(origin, destination, { ...routeOptions, ...options });
      return route ? { kind, ...route } : null;
    };
    const planned = () => segment("PLANNED", pickup, dropoff, { cacheKey: `${row.id}:planned`, ttlMs: 6 * 60 * 60 * 1000 });
    const inCustody = ["PICKED_UP", "IN_TRANSIT", "ARRIVED_AT_DROPOFF"].includes(row.status);
    let phase = "PLANNED";
    let segments;
    try {
      if (riderPoint && inCustody) {
        phase = "TO_DROPOFF";
        segments = [await segment("TO_DROPOFF", riderPoint, dropoff, { cacheKey: `${row.id}:to_dropoff` })];
      } else if (riderPoint && ASSIGNED_PRE_PICKUP_STATUSES.has(row.status)) {
        phase = "TO_PICKUP";
        segments = await Promise.all([
          segment("TO_PICKUP", riderPoint, pickup, { cacheKey: `${row.id}:to_pickup` }),
          planned(),
        ]);
      } else {
        segments = [await planned()];
      }
    } catch (error) {
      ctx.logger.warn?.("[switch-rider] route build failed:", error?.message || error);
      return null;
    }
    segments = segments.filter(Boolean);
    if (!segments.length) return null;
    const etaSeconds = phase === "PLANNED" ? 0 : segments.reduce((sum, item) => sum + (item.durationSeconds || 0), 0);
    return {
      phase,
      segments,
      etaSeconds,
      etaAt: etaSeconds ? new Date(ctx.now() + etaSeconds * 1000).toISOString() : null,
    };
  }

  async function getBuyerTracking(accountId, orderGroupId) {
    const row = (
      await db.query(
        `SELECT j.*, row_to_json(r.*) AS rider FROM delivery_jobs j LEFT JOIN riders r ON r.id = j.rider_id
         WHERE (j.order_group_id = $1 OR j.order_created_at_epoch_ms::text = $1) AND j.buyer_account_id = $2
         ORDER BY j.created_at DESC LIMIT 1`,
        [orderGroupId, accountId],
      )
    ).rows[0];
    if (!row) return null;
    const settings = await ctx.getSettings();
    const rider = row.rider;
    const rating = (await db.query(`SELECT stars, comment FROM rider_ratings WHERE delivery_id = $1`, [row.id])).rows[0];
    const locationFresh =
      rider?.last_location_at && ctx.now() - new Date(rider.last_location_at).getTime() <= settings.locationStaleSeconds * 1000;
    const showLocation = rider && BUYER_LIVE_LOCATION_STATUSES.has(row.status) && locationFresh;
    const exception = ["FAILED_DELIVERY", "RETURN_REQUIRED", "RETURNING_TO_SELLER", "RETURNED_TO_SELLER", "CANCELLED"].includes(row.status);
    const riderPoint = showLocation ? { lat: num(rider.last_latitude), lng: num(rider.last_longitude) } : null;
    const route = await buildBuyerRoute(row, riderPoint, settings);
    return {
      deliveryId: row.id,
      deliveryCode: row.delivery_code,
      provider: row.delivery_provider,
      status: row.status,
      statusLabel: JOB_STATUS_LABELS[row.status] || row.status,
      exception,
      exceptionMessage:
        row.status === "CANCELLED"
          ? `Delivery cancelled${row.cancellation_reason ? `: ${row.cancellation_reason}` : ""}.`
          : exception
            ? "The delivery could not be completed and the parcel is being returned to the seller."
            : "",
      timeline: buildBuyerTimeline(row),
      rider: rider && row.rider_id ? riderPublicProfile(rider) : null,
      riderPhone:
        rider && ["RIDER_ASSIGNED", "RIDER_TO_PICKUP", "ARRIVED_AT_PICKUP", "PICKED_UP", "IN_TRANSIT", "ARRIVED_AT_DROPOFF"].includes(row.status)
          ? `${rider.country_code}${rider.mobile_number}`
          : "",
      deliveryPin: BUYER_DELIVERY_PIN_STATUSES.has(row.status) ? ctx.pin(row, "delivery") : "",
      riderLocation: showLocation
        ? { lat: num(rider.last_latitude), lng: num(rider.last_longitude), updatedAt: iso(rider.last_location_at) }
        : null,
      pickup: {
        lat: num(row.pickup_latitude),
        lng: num(row.pickup_longitude),
        name: row.pickup_name || "",
        area: row.pickup_area || "",
      },
      dropoff: { lat: num(row.dropoff_latitude), lng: num(row.dropoff_longitude) },
      route,
      estimatedMinutes: Number(row.estimated_minutes) || 0,
      estimateNote: "Estimated time, not guaranteed.",
      paymentMethod: row.payment_method,
      codAmount: row.payment_method === "COD" ? num(row.cod_amount) : 0,
      deliveryFee: num(row.customer_delivery_fee),
      canRate: row.status === "DELIVERED" && Boolean(row.rider_id) && !rating,
      rating: rating ? { stars: Number(rating.stars), comment: rating.comment } : null,
      pollIntervalSeconds: BUYER_LIVE_LOCATION_STATUSES.has(row.status) ? 10 : 20,
    };
  }

  async function rateRider(accountId, orderGroupId, { stars, comment = "" } = {}) {
    const value = Number(stars);
    if (!Number.isInteger(value) || value < 1 || value > 5) throw srError(422, "INVALID_RATING", "Choose 1 to 5 stars.");
    const cleanComment = cleanText(comment, 500);
    return ctx.runInTx(async (client, effects) => {
      const job = (
        await client.query(
          `SELECT * FROM delivery_jobs
           WHERE (order_group_id = $1 OR order_created_at_epoch_ms::text = $1) AND buyer_account_id = $2 AND status = 'DELIVERED'
           ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
          [orderGroupId, accountId],
        )
      ).rows[0];
      if (!job || !job.rider_id) throw srError(404, "DELIVERY_NOT_FOUND", "You can rate your rider after the delivery is completed.");
      const flagged = value <= 2;
      const inserted = await client.query(
        `INSERT INTO rider_ratings (id, delivery_id, rider_id, buyer_account_id, stars, comment, flagged_for_review, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (delivery_id) DO NOTHING RETURNING id`,
        [newId("rat"), job.id, job.rider_id, accountId, value, cleanComment, flagged, ctx.nowDate()],
      );
      if (inserted.rowCount !== 1) throw srError(409, "ALREADY_RATED", "You already rated this delivery.");
      await client.query(
        `UPDATE riders SET
           rating_average = COALESCE((SELECT ROUND(AVG(stars)::numeric, 2) FROM rider_ratings WHERE rider_id = $1), 0),
           rating_count = (SELECT COUNT(*) FROM rider_ratings WHERE rider_id = $1),
           updated_at = NOW()
         WHERE id = $1`,
        [job.rider_id],
      );
      await ctx.notifyRider(client, job.rider_id, {
        type: "RATING",
        title: `New ${value}-star rating`,
        body: cleanComment ? `"${cleanComment.slice(0, 120)}"` : job.delivery_code,
        deliveryId: job.id,
      });
      if (flagged) {
        ctx.queueSuperAdminNotice(effects, {
          type: "switch-rider-rating-flagged",
          title: "Low rider rating",
          message: `${job.delivery_code} received ${value} star${value === 1 ? "" : "s"}${cleanComment ? `: "${cleanComment.slice(0, 200)}"` : "."}`,
          deliveryId: job.id,
          riderId: job.rider_id,
        });
      }
      return { stars: value, comment: cleanComment };
    });
  }

  async function listBuyerNotifications(accountId, { limit = 50 } = {}) {
    const rows = (
      await db.query(
        `SELECT * FROM buyer_delivery_notifications WHERE buyer_account_id = $1 ORDER BY created_at DESC
         LIMIT ${Math.min(200, Math.max(1, Number(limit) || 50))}`,
        [accountId],
      )
    ).rows;
    return rows.map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      body: row.body,
      deliveryId: row.delivery_id || "",
      orderGroupId: row.order_group_id,
      read: Boolean(row.read_at),
      createdAt: iso(row.created_at),
    }));
  }

  // ---------------------------------------------------------------- incidents

  function serializeIncident(row) {
    return {
      id: row.id,
      riderId: row.rider_id,
      riderName: row.first_name ? `${row.first_name} ${row.last_name}`.trim() : undefined,
      riderCode: row.rider_code,
      deliveryId: row.delivery_id || "",
      deliveryCode: row.delivery_code || "",
      category: row.category,
      categoryLabel: INCIDENT_CATEGORIES[row.category]?.label || row.category,
      description: row.description,
      isSafety: row.is_safety,
      status: row.status,
      resolution: row.resolution,
      resolvedAt: iso(row.resolved_at),
      createdAt: iso(row.created_at),
    };
  }

  async function createIncident(riderId, { category, description = "", deliveryId = "" } = {}) {
    const code = String(category ?? "").toUpperCase();
    const rule = INCIDENT_CATEGORIES[code];
    if (!rule) throw srError(422, "INVALID_CATEGORY", "Choose what you need help with.");
    const text = cleanText(description, 1000);
    if (!text && !rule.safety) throw srError(422, "DESCRIPTION_REQUIRED", "Describe the issue.");
    return ctx.runInTx(async (client, effects) => {
      const rider = await ctx.getRider(client, riderId);
      let job = null;
      if (deliveryId) {
        job = await ctx.getJob(client, deliveryId);
        const ownsJob =
          job &&
          (job.rider_id === riderId ||
            (await client.query(`SELECT 1 FROM delivery_offers WHERE delivery_id = $1 AND rider_id = $2`, [deliveryId, riderId])).rowCount > 0);
        if (!ownsJob) throw srError(404, "DELIVERY_NOT_FOUND", "Delivery not found.");
      }
      const incident = (
        await client.query(
          `INSERT INTO delivery_incidents (id, rider_id, delivery_id, category, description, is_safety, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
          [newId("inc"), riderId, job ? job.id : null, code, text, rule.safety, ctx.nowDate()],
        )
      ).rows[0];
      await ctx.audit(client, { actor: { type: "rider", id: riderId }, action: "INCIDENT_REPORTED", deliveryId: job?.id || null, riderId, metadata: { incidentId: incident.id, category: code } });
      await ctx.notifyRider(client, riderId, {
        type: "SUPPORT",
        title: "Support ticket received",
        body: rule.safety ? "Switch support has been alerted. If you are in danger, call 911 first." : "Switch support will get back to you.",
        deliveryId: job?.id || null,
      });
      ctx.queueSuperAdminNotice(effects, {
        type: "switch-rider-incident",
        title: rule.safety ? "Rider safety alert" : "Rider support ticket",
        message: `${rider.first_name} ${rider.last_name} (${rider.rider_code}) · ${rule.label}${job ? ` · ${job.delivery_code}` : ""}${text ? `: ${text.slice(0, 200)}` : ""}`,
        riderId,
        deliveryId: job?.id || null,
        priority: rule.safety ? "high" : "normal",
      });
      return serializeIncident(incident);
    });
  }

  async function listRiderIncidents(riderId) {
    const rows = (
      await db.query(
        `SELECT i.*, j.delivery_code FROM delivery_incidents i LEFT JOIN delivery_jobs j ON j.id = i.delivery_id
         WHERE i.rider_id = $1 ORDER BY i.created_at DESC LIMIT 50`,
        [riderId],
      )
    ).rows;
    return rows.map(serializeIncident);
  }

  async function listIncidentsForAdmin({ status = "OPEN", limit = 100 } = {}) {
    const normalized = String(status || "").toUpperCase();
    const values = [];
    let where = "";
    if (["OPEN", "IN_REVIEW", "RESOLVED"].includes(normalized)) {
      values.push(normalized);
      where = "WHERE i.status = $1";
    } else if (normalized === "ACTIVE") {
      where = "WHERE i.status <> 'RESOLVED'";
    }
    const rows = (
      await db.query(
        `SELECT i.*, j.delivery_code, r.first_name, r.last_name, r.rider_code
         FROM delivery_incidents i JOIN riders r ON r.id = i.rider_id LEFT JOIN delivery_jobs j ON j.id = i.delivery_id
         ${where} ORDER BY i.is_safety DESC, i.created_at DESC LIMIT ${Math.min(500, Math.max(1, Number(limit) || 100))}`,
        values,
      )
    ).rows;
    return rows.map(serializeIncident);
  }

  async function updateIncident(incidentId, { status, resolution = "" } = {}, actor) {
    const next = String(status ?? "").toUpperCase();
    if (!["IN_REVIEW", "RESOLVED"].includes(next)) throw srError(422, "INVALID_STATUS", "Choose in review or resolved.");
    const text = cleanText(resolution, 1000);
    if (next === "RESOLVED" && !text) throw srError(422, "RESOLUTION_REQUIRED", "Describe how the issue was resolved.");
    return ctx.runInTx(async (client) => {
      const incident = (await client.query(`SELECT * FROM delivery_incidents WHERE id = $1 FOR UPDATE`, [incidentId])).rows[0];
      if (!incident) throw srError(404, "INCIDENT_NOT_FOUND", "Ticket not found.");
      const updated = (
        await client.query(
          `UPDATE delivery_incidents SET status = $2, resolution = $3, resolved_by = $4, resolved_at = $5 WHERE id = $1 RETURNING *`,
          [incidentId, next, text || incident.resolution, next === "RESOLVED" ? String(actor?.id || "") : "", next === "RESOLVED" ? ctx.nowDate() : null],
        )
      ).rows[0];
      await ctx.audit(client, { actor, action: `INCIDENT_${next}`, riderId: incident.rider_id, deliveryId: incident.delivery_id, metadata: { incidentId, resolution: text } });
      await ctx.notifyRider(client, incident.rider_id, {
        type: "SUPPORT",
        title: next === "RESOLVED" ? "Support ticket resolved" : "Support is reviewing your ticket",
        body: text || INCIDENT_CATEGORIES[incident.category]?.label || "",
        deliveryId: incident.delivery_id,
      });
      return serializeIncident(updated);
    });
  }

  // -------------------------------------------------------------- Super Admin

  async function getAdminOverview() {
    const periods = money.manilaPeriodStarts(ctx.now());
    const [riders, jobs, incidents, cod] = await Promise.all([
      db.query(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'PENDING_VERIFICATION')::int AS pending,
           COUNT(*) FILTER (WHERE status IN ('APPROVED','ACTIVE') AND availability_status = 'ONLINE')::int AS online,
           COUNT(*) FILTER (WHERE status IN ('APPROVED','ACTIVE') AND availability_status = 'ON_DELIVERY')::int AS on_delivery
         FROM riders`,
      ),
      db.query(
        `SELECT
           COUNT(*) FILTER (WHERE status IN ('WAITING_FOR_RIDER','OFFERED'))::int AS waiting,
           COUNT(*) FILTER (WHERE status = ANY($2::text[]))::int AS active,
           COUNT(*) FILTER (WHERE status = 'DELIVERED' AND delivered_at >= $1)::int AS delivered_today,
           COUNT(*) FILTER (WHERE status IN ('FAILED_DELIVERY','RETURN_REQUIRED','RETURNING_TO_SELLER','RETURNED_TO_SELLER') AND failed_at >= $1)::int AS failed_today,
           COUNT(*) FILTER (WHERE dispatch_stuck_notified AND status = 'WAITING_FOR_RIDER')::int AS stuck
         FROM delivery_jobs`,
        [periods.today, [...RIDER_ACTIVE_STATUSES]],
      ),
      db.query(
        `SELECT COUNT(*) FILTER (WHERE status <> 'RESOLVED')::int AS open,
                COUNT(*) FILTER (WHERE status <> 'RESOLVED' AND is_safety)::int AS safety
         FROM delivery_incidents`,
      ),
      db.query(
        `SELECT COALESCE((SELECT SUM(amount) FROM cod_transactions), 0)
              - COALESCE((SELECT SUM(amount) FROM rider_remittances WHERE status IN ('REMITTED','VERIFIED')), 0) AS outstanding,
                (SELECT COUNT(*)::int FROM rider_remittances WHERE status = 'REMITTED') AS remittances_to_verify`,
      ),
    ]);
    return {
      riders: riders.rows[0],
      deliveries: jobs.rows[0],
      incidents: incidents.rows[0],
      cod: { outstanding: roundTo(num(cod.rows[0].outstanding), 2), remittancesToVerify: cod.rows[0].remittances_to_verify },
    };
  }

  async function listDeliveriesForAdmin({ view = "all", search = "", limit = 50, offset = 0 } = {}) {
    const values = [];
    const conditions = [];
    if (ADMIN_VIEWS[view]) {
      values.push(ADMIN_VIEWS[view]);
      conditions.push(`j.status = ANY($${values.length}::text[])`);
    } else if (view === "active") {
      values.push([...RIDER_ACTIVE_STATUSES]);
      conditions.push(`j.status = ANY($${values.length}::text[])`);
    }
    const term = cleanText(search, 60).toLowerCase();
    if (term) {
      values.push(`%${term}%`);
      const p = `$${values.length}`;
      conditions.push(
        `(lower(j.delivery_code) LIKE ${p} OR lower(j.order_group_id) LIKE ${p} OR lower(j.pickup_name) LIKE ${p} OR lower(j.dropoff_area) LIKE ${p} OR lower(COALESCE(r.first_name || ' ' || r.last_name, '')) LIKE ${p})`,
      );
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const safeLimit = Math.min(200, Math.max(1, Number(limit) || 50));
    const safeOffset = Math.max(0, Number(offset) || 0);
    const [rows, total, counts] = await Promise.all([
      db.query(
        `SELECT j.*, r.first_name AS rider_first_name, r.last_name AS rider_last_name, r.rider_code
         FROM delivery_jobs j LEFT JOIN riders r ON r.id = j.rider_id ${where}
         ORDER BY j.created_at DESC LIMIT ${safeLimit} OFFSET ${safeOffset}`,
        values,
      ),
      db.query(`SELECT COUNT(*)::int AS count FROM delivery_jobs j LEFT JOIN riders r ON r.id = j.rider_id ${where}`, values),
      db.query(`SELECT status, COUNT(*)::int AS count FROM delivery_jobs GROUP BY status`),
    ]);
    const summary = { all: 0 };
    for (const key of Object.keys(ADMIN_VIEWS)) summary[key] = 0;
    for (const row of counts.rows) {
      summary.all += row.count;
      for (const [key, statuses] of Object.entries(ADMIN_VIEWS)) if (statuses.includes(row.status)) summary[key] += row.count;
    }
    return {
      deliveries: rows.rows.map((row) => ({
        id: row.id,
        deliveryCode: row.delivery_code,
        orderGroupId: row.order_group_id,
        orderReference: String(row.order_group_id || "").slice(-8).toUpperCase(),
        sellerName: row.pickup_name,
        sellerAdminId: row.seller_admin_id,
        customerArea: row.dropoff_area,
        riderName: row.rider_first_name ? `${row.rider_first_name} ${row.rider_last_name}`.trim() : "",
        riderCode: row.rider_code || "",
        status: row.status,
        statusLabel: JOB_STATUS_LABELS[row.status] || row.status,
        paymentMethod: row.payment_method,
        codAmount: row.payment_method === "COD" ? num(row.cod_amount) : 0,
        deliveryFee: num(row.quoted_delivery_fee),
        riderEarning: num(row.rider_earning),
        dispatchMode: row.dispatch_mode,
        stuck: row.dispatch_stuck_notified && row.status === "WAITING_FOR_RIDER",
        createdAt: iso(row.created_at),
        updatedAt: iso(row.updated_at),
      })),
      total: total.rows[0].count,
      summary,
    };
  }

  async function getDeliveryDetailForAdmin(jobId) {
    const job = await ctx.getJob(db, jobId);
    if (!job) throw srError(404, "DELIVERY_NOT_FOUND", "Delivery not found.");
    const [history, offers, proofs, incidents, rating, earning, cod, audit, rider] = await Promise.all([
      db.query(`SELECT * FROM delivery_status_history WHERE delivery_id = $1 ORDER BY created_at, id`, [jobId]),
      db.query(
        `SELECT o.*, r.first_name, r.last_name, r.rider_code FROM delivery_offers o JOIN riders r ON r.id = o.rider_id
         WHERE o.delivery_id = $1 ORDER BY o.offered_at`,
        [jobId],
      ),
      loadProofs(db, jobId),
      db.query(`SELECT * FROM delivery_incidents WHERE delivery_id = $1 ORDER BY created_at DESC`, [jobId]),
      db.query(`SELECT stars, comment, flagged_for_review, created_at FROM rider_ratings WHERE delivery_id = $1`, [jobId]),
      db.query(`SELECT * FROM rider_earnings WHERE delivery_id = $1`, [jobId]),
      db.query(`SELECT * FROM cod_transactions WHERE delivery_id = $1`, [jobId]),
      db.query(`SELECT * FROM switch_rider_audit_log WHERE delivery_id = $1 ORDER BY created_at DESC LIMIT 100`, [jobId]),
      job.rider_id ? ctx.getRider(db, job.rider_id) : Promise.resolve(null),
    ]);
    return serializeJobForAdmin(job, {
      statusLabel: JOB_STATUS_LABELS[job.status] || job.status,
      rider: rider ? serializeRiderForAdmin(rider) : null,
      history: serializeHistory(history.rows),
      offers: offers.rows.map((offer) => ({
        id: offer.id,
        riderId: offer.rider_id,
        riderName: `${offer.first_name} ${offer.last_name}`.trim(),
        riderCode: offer.rider_code,
        status: offer.status,
        distanceToPickupKm: num(offer.distance_to_pickup_km),
        offeredAt: iso(offer.offered_at),
        respondedAt: iso(offer.responded_at),
        declineReason: offer.decline_reason,
      })),
      proofs: proofs.map((proof) => ({
        id: proof.id,
        type: proof.proof_type,
        url: `/api/switch-rider/proofs/${encodeURIComponent(proof.id)}`,
        uploadedAt: iso(proof.uploaded_at),
      })),
      incidents: incidents.rows.map(serializeIncident),
      rating: rating.rows[0]
        ? { stars: Number(rating.rows[0].stars), comment: rating.rows[0].comment, flagged: rating.rows[0].flagged_for_review }
        : null,
      earning: earning.rows[0]
        ? { total: num(earning.rows[0].total), type: earning.rows[0].earning_type, status: earning.rows[0].status }
        : null,
      cod: cod.rows[0] ? { amount: num(cod.rows[0].amount), status: cod.rows[0].status, collectedAt: iso(cod.rows[0].collected_at) } : null,
      pinAttempts: {
        pickup: Number(job.pickup_pin_attempts) || 0,
        delivery: Number(job.delivery_pin_attempts) || 0,
        return: Number(job.return_pin_attempts) || 0,
      },
      audit: audit.rows.map((row) => ({
        action: row.action,
        actorType: row.actor_type,
        actorId: row.actor_id,
        metadata: row.metadata,
        at: iso(row.created_at),
      })),
    });
  }

  async function getRiderDetailForAdmin(riderId) {
    const rider = await ctx.getRider(db, riderId);
    if (!rider) throw srError(404, "RIDER_NOT_FOUND", "Rider not found.");
    const [documents, deliveries, ratings, earnings, cash, performance, incidents, payouts] = await Promise.all([
      db.query(`SELECT * FROM rider_documents WHERE rider_id = $1 AND review_status <> 'SUPERSEDED' ORDER BY uploaded_at DESC`, [riderId]),
      db.query(
        `SELECT id, delivery_code, status, pickup_area, dropoff_area, payment_method, cod_amount, rider_earning, created_at, delivered_at
         FROM delivery_jobs WHERE rider_id = $1 ORDER BY created_at DESC LIMIT 25`,
        [riderId],
      ),
      db.query(
        `SELECT rt.stars, rt.comment, rt.flagged_for_review, rt.created_at, j.delivery_code FROM rider_ratings rt
         JOIN delivery_jobs j ON j.id = rt.delivery_id WHERE rt.rider_id = $1 ORDER BY rt.created_at DESC LIMIT 25`,
        [riderId],
      ),
      money.getEarningsSummary(riderId),
      money.getCashWallet(riderId),
      getRiderPerformance(riderId),
      listRiderIncidents(riderId),
      db.query(`SELECT * FROM rider_payouts WHERE rider_id = $1 ORDER BY created_at DESC LIMIT 20`, [riderId]),
    ]);
    return {
      rider: serializeRiderForAdmin(rider),
      documents: documents.rows.map((doc) => ({
        id: doc.id,
        docType: doc.doc_type,
        reviewStatus: doc.review_status,
        reviewNote: doc.review_note,
        uploadedAt: iso(doc.uploaded_at),
        url: `/api/super-admin/switch-rider/documents/${encodeURIComponent(doc.id)}/file`,
      })),
      deliveries: deliveries.rows.map((row) => ({
        id: row.id,
        deliveryCode: row.delivery_code,
        status: row.status,
        statusLabel: JOB_STATUS_LABELS[row.status] || row.status,
        route: `${row.pickup_area || "Pickup"} → ${row.dropoff_area || "Drop-off"}`,
        paymentMethod: row.payment_method,
        codAmount: row.payment_method === "COD" ? num(row.cod_amount) : 0,
        riderEarning: num(row.rider_earning),
        createdAt: iso(row.created_at),
        deliveredAt: iso(row.delivered_at),
      })),
      ratings: ratings.rows.map((row) => ({
        stars: Number(row.stars),
        comment: row.comment,
        flagged: row.flagged_for_review,
        deliveryCode: row.delivery_code,
        createdAt: iso(row.created_at),
      })),
      earnings,
      cash,
      performance,
      incidents,
      payouts: payouts.rows.map((row) => ({
        id: row.id,
        amount: num(row.amount),
        method: row.method,
        reference: row.reference,
        createdAt: iso(row.created_at),
      })),
    };
  }

  // ----------------------------------------------------------- private files

  /** Proof photos: visible to Super Admin and to the rider, seller, and buyer of that delivery. */
  async function readProofFile(proofId, viewer) {
    const row = (
      await db.query(
        `SELECT p.*, j.seller_admin_id, j.buyer_account_id, j.rider_id AS job_rider_id
         FROM delivery_proofs p JOIN delivery_jobs j ON j.id = p.delivery_id WHERE p.id = $1`,
        [proofId],
      )
    ).rows[0];
    const allowed =
      row &&
      (viewer.type === "super_admin" ||
        (viewer.type === "rider" && (row.rider_id === viewer.id || row.job_rider_id === viewer.id)) ||
        (viewer.type === "seller" && row.seller_admin_id === viewer.id) ||
        (viewer.type === "buyer" && row.buyer_account_id === viewer.id));
    if (!allowed) throw srError(404, "PROOF_NOT_FOUND", "Photo not found.");
    const file = await ctx.privateFiles.read(row.storage_key);
    if (!file) throw srError(404, "PROOF_NOT_FOUND", "Photo file is missing.");
    return { buffer: file, contentType: row.content_type || "image/jpeg" };
  }

  /** Rider profile photo: Super Admin, the rider, or a buyer/seller who has a delivery with this rider. */
  async function readRiderPhoto(riderId, viewer) {
    const rider = await ctx.getRider(db, riderId);
    if (!rider || !rider.profile_photo_key) throw srError(404, "PHOTO_NOT_FOUND", "Photo not found.");
    let allowed = viewer.type === "super_admin" || (viewer.type === "rider" && viewer.id === riderId);
    if (!allowed && (viewer.type === "buyer" || viewer.type === "seller")) {
      const column = viewer.type === "buyer" ? "buyer_account_id" : "seller_admin_id";
      allowed = (await db.query(`SELECT 1 FROM delivery_jobs WHERE rider_id = $1 AND ${column} = $2 LIMIT 1`, [riderId, viewer.id])).rowCount > 0;
    }
    if (!allowed) throw srError(404, "PHOTO_NOT_FOUND", "Photo not found.");
    const file = await ctx.privateFiles.read(rider.profile_photo_key);
    if (!file) throw srError(404, "PHOTO_NOT_FOUND", "Photo not found.");
    const doc = (
      await db.query(`SELECT content_type FROM rider_documents WHERE storage_key = $1 LIMIT 1`, [rider.profile_photo_key])
    ).rows[0];
    return { buffer: file, contentType: doc?.content_type || "image/jpeg" };
  }

  async function listPrePickupJobsForReconcile() {
    return (
      await db.query(
        `SELECT id, order_group_id, order_created_at_epoch_ms, seller_admin_id, buyer_account_id FROM delivery_jobs
         WHERE status IN ('PREPARING','WAITING_FOR_RIDER','OFFERED','RIDER_ASSIGNED','RIDER_TO_PICKUP','ARRIVED_AT_PICKUP')
         ORDER BY created_at LIMIT 500`,
      )
    ).rows;
  }

  return {
    listPrePickupJobsForReconcile,
    getOfferRouteForRider,
    getJobRouteForRider,
    getRiderDashboard,
    listActiveJobs,
    getJobForRider,
    getRiderHistory,
    getRiderPerformance,
    listRiderNotifications,
    markRiderNotificationsRead,
    listSellerDeliveries,
    getSellerDelivery,
    getBuyerTracking,
    rateRider,
    listBuyerNotifications,
    createIncident,
    listRiderIncidents,
    listIncidentsForAdmin,
    updateIncident,
    getAdminOverview,
    listDeliveriesForAdmin,
    getDeliveryDetailForAdmin,
    getRiderDetailForAdmin,
    readProofFile,
    readRiderPhoto,
  };
}

module.exports = { createViews, BUYER_TIMELINE, ADMIN_VIEWS };
