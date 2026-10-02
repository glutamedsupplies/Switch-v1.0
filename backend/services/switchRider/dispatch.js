"use strict";

const {
  ASSIGNED_PRE_PICKUP_STATUSES,
  AVAILABILITY,
  DELIVERY_PROVIDER,
  OPERATIONAL_RIDER_STATUSES,
  RIDER_ACTIVE_STATUSES,
  RIDER_RELEASE_REASONS,
  VEHICLE_TYPES,
} = require("./constants");
const { srError, JOB_STATUS_LABELS } = require("./core");
const { evaluateRiderEligibility, ELIGIBILITY_REASON_LABELS } = require("./eligibility");
const { haversineKm, normalizeCoordinates, roundTo } = require("./geo");
const { calculateDeliveryPricing, checkServiceability, settleCustomerFee } = require("./pricing");
const { deriveArea, serializeOfferForRider, serializeRiderForAdmin } = require("./serializers");
const { newId, newPinNonce, signQuote, verifyQuote } = require("./tokens");

const QUOTE_DROPOFF_TOLERANCE_KM = 0.25;

function cleanText(value, max = 200) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function money(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function createDispatch(ctx) {
  const { db } = ctx;

  // ------------------------------------------------------------ pickup points

  function serializePickupLocation(row) {
    if (!row) return null;
    return {
      adminId: row.admin_id,
      contactName: row.contact_name,
      contactPhone: row.contact_phone,
      address: row.address,
      area: row.area,
      lat: Number(row.latitude),
      lng: Number(row.longitude),
      notes: row.notes,
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
    };
  }

  /** Store address the seller registered at "Become a Seller" (companies.profile_data.storeLocation). */
  async function getCompanyStoreLocation(adminId) {
    let row = null;
    try {
      row = (
        await db.query(
          `SELECT name, country_code, mobile_number, profile_data->'storeLocation' AS store, updated_at
           FROM companies
           WHERE type = 'seller'
             AND status IN ('active', 'pending_review')
             AND (source_account_id = $1 OR id = $1 OR id = 'comp_' || $1)
             AND profile_data ? 'storeLocation'
           ORDER BY (status = 'active') DESC, updated_at DESC
           LIMIT 1`,
          [adminId],
        )
      ).rows[0];
    } catch (error) {
      ctx.logger.warn?.("[switch-rider] company store lookup failed:", error?.message || error);
      return null;
    }
    const store = row?.store && typeof row.store === "object" ? row.store : null;
    const coords = normalizeCoordinates(store?.lat, store?.lng);
    const address = cleanText(store?.address, 300);
    if (!coords || !address) return null;
    const phone = `${cleanText(row.country_code, 6)}${cleanText(row.mobile_number, 20)}`.replace(/[^\d+]/g, "");
    return {
      adminId,
      contactName: cleanText(row.name, 80),
      contactPhone: phone,
      address,
      area: cleanText(store.area, 80) || deriveArea(address),
      lat: coords.lat,
      lng: coords.lng,
      notes: "",
      source: "company_store",
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
    };
  }

  /** Pinned pickup location first; falls back to the registered store address. */
  async function getPickupLocation(adminId) {
    const row = (await db.query("SELECT * FROM seller_pickup_locations WHERE admin_id = $1", [adminId])).rows[0];
    if (row) return { ...serializePickupLocation(row), source: "pickup_location" };
    return getCompanyStoreLocation(adminId);
  }

  async function upsertPickupLocation(adminId, input = {}) {
    const coords = normalizeCoordinates(input.lat ?? input.latitude, input.lng ?? input.longitude);
    if (!coords) throw srError(422, "INVALID_LOCATION", "Pin your pickup location on the map.");
    const address = cleanText(input.address, 300);
    if (address.length < 8) throw srError(422, "INVALID_ADDRESS", "Enter the full pickup address.");
    const contactName = cleanText(input.contactName, 80);
    const contactPhone = cleanText(input.contactPhone, 20).replace(/[^\d+]/g, "");
    if (!contactName || contactPhone.replace(/\D/g, "").length < 10) {
      throw srError(422, "INVALID_CONTACT", "Enter a pickup contact name and mobile number.");
    }
    const row = (
      await db.query(
        `INSERT INTO seller_pickup_locations (admin_id, contact_name, contact_phone, address, area, latitude, longitude, notes, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (admin_id) DO UPDATE SET
           contact_name = EXCLUDED.contact_name, contact_phone = EXCLUDED.contact_phone, address = EXCLUDED.address,
           area = EXCLUDED.area, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
           notes = EXCLUDED.notes, updated_at = EXCLUDED.updated_at
         RETURNING *`,
        [
          adminId, contactName, contactPhone, address, cleanText(input.area, 80) || deriveArea(address),
          coords.lat, coords.lng, cleanText(input.notes, 300), ctx.nowDate(),
        ],
      )
    ).rows[0];
    await ctx.audit(db, { actor: { type: "seller", id: adminId }, action: "PICKUP_LOCATION_UPDATED", metadata: { lat: coords.lat, lng: coords.lng } });
    return serializePickupLocation(row);
  }

  // ------------------------------------------------------------------- quotes

  async function quoteForCheckout({ sellerAdminId, buyerAccountId, dropoff, packageCount = 1 } = {}) {
    const settings = await ctx.getSettings();
    const adminId = cleanText(sellerAdminId, 120);
    if (!adminId) throw srError(422, "SELLER_REQUIRED", "Seller is required.");
    const pickup = await getPickupLocation(adminId);
    const check = checkServiceability(settings, pickup, dropoff);
    if (!check.serviceable) {
      return { available: false, code: check.code, message: check.message };
    }
    const pricing = calculateDeliveryPricing(settings, {
      distanceKm: check.distanceKm,
      vehicleType: settings.defaultVehicleType,
      packageCount,
    });
    const expSeconds = Math.floor(ctx.now() / 1000) + settings.quoteTtlSeconds;
    const token = signQuote(ctx.secret, {
      v: 1,
      a: adminId,
      b: cleanText(buyerAccountId, 120),
      lat: check.dropoff.lat,
      lng: check.dropoff.lng,
      fee: pricing.deliveryFee,
      re: pricing.riderEarning,
      rb: pricing.riderBaseFee,
      rd: pricing.riderDistanceFee,
      km: pricing.distanceKm,
      veh: pricing.vehicleType,
      min: pricing.estimatedMinutes,
      snap: pricing.snapshot,
      exp: expSeconds,
    });
    const low = pricing.estimatedMinutes;
    return {
      available: true,
      code: "OK",
      provider: DELIVERY_PROVIDER.SWITCH_RIDER,
      deliveryFee: pricing.deliveryFee,
      distanceKm: pricing.distanceKm,
      vehicleType: pricing.vehicleType,
      estimatedMinutes: low,
      estimateLabel: `About ${low}–${low + 20} min after pickup (estimate, not guaranteed)`,
      quoteToken: token,
      expiresAt: new Date(expSeconds * 1000).toISOString(),
    };
  }

  /**
   * Validates a checkout quote against the order the buyer actually submitted.
   * Returns the pricing to lock in, or throws a 409 the buyer app can act on.
   */
  function validateCheckoutQuote(token, { sellerAdminId, buyerAccountId, dropoff, customerFee, freeShippingClaimed }) {
    const payload = verifyQuote(ctx.secret, token, ctx.now());
    if (!payload || payload.v !== 1) {
      throw srError(409, "SWITCH_RIDER_QUOTE_INVALID", "Your Switch Rider delivery quote expired. Review the delivery fee and place the order again.");
    }
    if (payload.a !== sellerAdminId || (payload.b && buyerAccountId && payload.b !== buyerAccountId)) {
      throw srError(409, "SWITCH_RIDER_QUOTE_MISMATCH", "The delivery quote does not match this order.");
    }
    const drop = normalizeCoordinates(dropoff?.lat, dropoff?.lng);
    if (!drop || haversineKm(drop, { lat: payload.lat, lng: payload.lng }) > QUOTE_DROPOFF_TOLERANCE_KM) {
      throw srError(409, "SWITCH_RIDER_QUOTE_MISMATCH", "Your delivery address changed. Refresh the Switch Rider fee and try again.");
    }
    const fee = money(customerFee);
    const quotedFee = money(payload.fee);
    const feeAccepted = freeShippingClaimed ? fee >= 0 && fee <= quotedFee : fee === quotedFee;
    if (!feeAccepted) {
      throw srError(409, "SWITCH_RIDER_FEE_MISMATCH", "The delivery fee changed. Review your order and place it again.", {
        expectedFee: payload.fee,
      });
    }
    return {
      vehicleType: VEHICLE_TYPES.includes(payload.veh) ? payload.veh : "MOTORCYCLE",
      distanceKm: Number(payload.km) || 0,
      estimatedMinutes: Number(payload.min) || 0,
      deliveryFee: money(payload.fee),
      riderBaseFee: money(payload.rb),
      riderDistanceFee: money(payload.rd),
      riderEarning: money(payload.re),
      snapshot: { ...(payload.snap || {}), source: "checkout_quote" },
    };
  }

  // --------------------------------------------------------------------- jobs

  /**
   * Creates the delivery job for an order group (idempotent per live group).
   * `order` is the normalized order summary supplied by the server bridge.
   */
  async function createJobForOrder(order, { lockedPricing = null, actor = { type: "system" } } = {}) {
    const settings = await ctx.getSettings();
    const pickup = await getPickupLocation(order.sellerAdminId);
    if (!pickup) throw srError(409, "PICKUP_LOCATION_MISSING", "Set your store or pickup location before using Switch Rider.");
    const dropoff = normalizeCoordinates(order.dropoff?.lat, order.dropoff?.lng);
    if (!dropoff) throw srError(409, "DROPOFF_LOCATION_MISSING", "The buyer's address has no map pin, so Switch Rider cannot deliver it.");

    let pricing = lockedPricing;
    if (!pricing) {
      const check = checkServiceability(settings, pickup, dropoff);
      if (!check.serviceable) throw srError(409, check.code, check.message);
      pricing = calculateDeliveryPricing(settings, {
        distanceKm: check.distanceKm,
        vehicleType: settings.defaultVehicleType,
        packageCount: 1,
      });
      pricing.snapshot = { ...pricing.snapshot, source: "server_recalculated" };
    }
    const settlement = settleCustomerFee(pricing, order.customerDeliveryFee);
    const id = newId("dlv");

    return ctx.runInTx(async (client) => {
      const inserted = await client.query(
        `INSERT INTO delivery_jobs (
           id, delivery_code, order_group_id, order_created_at_epoch_ms, delivery_provider, seller_admin_id, buyer_account_id,
           status, vehicle_type_required,
           pickup_name, pickup_contact_phone, pickup_address, pickup_area, pickup_latitude, pickup_longitude,
           dropoff_name, dropoff_contact_phone, dropoff_address, dropoff_area, dropoff_latitude, dropoff_longitude,
           package_count, package_notes, distance_km, estimated_minutes,
           quoted_delivery_fee, customer_delivery_fee, platform_subsidy, rider_earning, platform_delivery_margin, pricing_snapshot,
           payment_method, cod_amount, pin_nonce, created_at, updated_at
         ) VALUES (
           $1, 'SRD-' || nextval('delivery_code_seq'), $2, $3, 'SWITCH_RIDER', $4, $5,
           'PREPARING', $6,
           $7, $8, $9, $10, $11, $12,
           $13, $14, $15, $16, $17, $18,
           $19, $20, $21, $22,
           $23, $24, $25, $26, $27, $28::jsonb,
           $29, $30, $31, $32, $32
         )
         ON CONFLICT (order_group_id) WHERE status <> 'CANCELLED' DO NOTHING
         RETURNING *`,
        [
          id, order.orderGroupId, Number(order.createdAtEpochMs) || 0, order.sellerAdminId, order.buyerAccountId,
          pricing.vehicleType,
          order.sellerName || pickup.contactName, pickup.contactPhone, pickup.address, pickup.area || deriveArea(pickup.address), pickup.lat, pickup.lng,
          cleanText(order.customerName, 80), cleanText(order.customerPhone, 20), cleanText(order.dropoffAddress, 300),
          deriveArea(order.dropoffAddress), dropoff.lat, dropoff.lng,
          Math.max(1, Math.trunc(Number(order.packageCount) || 1)), cleanText(order.packageNotes, 300),
          roundTo(pricing.distanceKm, 2), Math.max(0, Math.trunc(pricing.estimatedMinutes || 0)),
          pricing.deliveryFee, settlement.customerDeliveryFee, settlement.platformSubsidy, pricing.riderEarning,
          settlement.platformMargin,
          JSON.stringify({ ...pricing.snapshot, riderBaseFee: pricing.riderBaseFee, riderDistanceFee: pricing.riderDistanceFee }),
          order.isCod ? "COD" : "PREPAID", order.isCod ? money(order.codAmount) : 0, newPinNonce(), ctx.nowDate(),
        ],
      );
      if (!inserted.rows[0]) {
        const existing = (
          await client.query(`SELECT * FROM delivery_jobs WHERE order_group_id = $1 AND status <> 'CANCELLED'`, [order.orderGroupId])
        ).rows[0];
        return { job: existing, created: false };
      }
      const job = inserted.rows[0];
      await ctx.recordHistory(client, { deliveryId: job.id, toStatus: "PREPARING", actor, note: "Delivery created" });
      await ctx.audit(client, { actor, action: "DELIVERY_CREATED", deliveryId: job.id, metadata: { orderGroupId: order.orderGroupId } });
      return { job, created: true };
    });
  }

  async function getActiveJobForOrderGroup(orderGroupId) {
    return (
      await db.query(`SELECT * FROM delivery_jobs WHERE order_group_id = $1 AND status <> 'CANCELLED'`, [orderGroupId])
    ).rows[0] || null;
  }

  /**
   * With `dispatchOnCheckout`, the nearest rider to the store is offered the job
   * right after checkout (they still have to accept). The seller prepares the
   * parcel while the rider heads to the store.
   */
  async function startDispatchAfterCheckout(jobId, { actor = { type: "system" } } = {}) {
    const settings = await ctx.getSettings();
    if (!settings.dispatchOnCheckout) return { started: false, reason: "DISABLED" };
    const updated = await ctx.runInTx(async (client, effects) => {
      const locked = await ctx.lockJob(client, jobId);
      if (!locked || locked.status !== "PREPARING") return null;
      const next = await ctx.transition(client, locked, "WAITING_FOR_RIDER", {
        actor,
        note: "Finding the nearest rider to the store after checkout",
      });
      await ctx.notifyBuyer(client, next, {
        type: "FINDING_RIDER",
        title: "Finding your rider",
        body: `Switch is finding the nearest rider to the store for delivery ${next.delivery_code}.`,
      });
      ctx.queueSellerNotice(effects, next, {
        type: "switch-rider-finding",
        title: "New Switch Rider order",
        message: `Switch is finding the nearest rider for ${next.delivery_code}. Prepare the parcel and keep the pickup PIN ready — the rider will come to ${next.pickup_address || "your store"}.`,
        priority: "high",
      });
      effects.push(() => dispatchJob(next.id));
      return next;
    });
    return { started: Boolean(updated), job: updated };
  }

  /**
   * Seller confirms the parcel is packed. When dispatch did not already start at
   * checkout, this is what sends the job to riders.
   */
  async function markReadyForRider(order, actor) {
    if (!order.isPacked) {
      throw srError(409, "ORDER_NOT_PACKED", "Mark the order as packed (To Ship) before calling a rider.");
    }
    let job = await getActiveJobForOrderGroup(order.orderGroupId);
    if (!job) {
      job = (await createJobForOrder(order, { actor })).job;
    }
    if (job.seller_admin_id !== order.sellerAdminId) throw srError(404, "DELIVERY_NOT_FOUND", "Delivery not found.");
    if (job.status !== "PREPARING") {
      if (!job.ready_at && !["DELIVERED", "CANCELLED", "RETURNED_TO_SELLER"].includes(job.status)) {
        job = (await db.query(`UPDATE delivery_jobs SET ready_at = $2, updated_at = NOW() WHERE id = $1 RETURNING *`, [job.id, ctx.nowDate()])).rows[0] || job;
      }
      return { job, alreadyReady: true };
    }

    const settings = await ctx.getSettings();
    const pickup = await getPickupLocation(order.sellerAdminId);
    if (!pickup) throw srError(409, "PICKUP_LOCATION_MISSING", "Set your pickup location before calling a rider.");
    const check = checkServiceability(settings, pickup, { lat: job.dropoff_latitude, lng: job.dropoff_longitude });
    if (!check.serviceable && check.code !== "DISTANCE_TOO_FAR") throw srError(409, check.code, check.message);

    const updated = await ctx.runInTx(async (client, effects) => {
      const locked = await ctx.lockJob(client, job.id);
      if (locked.status !== "PREPARING") return locked;
      const next = await ctx.transition(client, locked, "WAITING_FOR_RIDER", {
        actor,
        note: "Seller marked parcel ready for rider",
        fields: {
          ready_at: ctx.nowDate(),
          pickup_name: order.sellerName || pickup.contactName,
          pickup_contact_phone: pickup.contactPhone,
          pickup_address: pickup.address,
          pickup_area: pickup.area || deriveArea(pickup.address),
          pickup_latitude: pickup.lat,
          pickup_longitude: pickup.lng,
          cod_amount: locked.payment_method === "COD" ? money(order.codAmount) : 0,
        },
      });
      await ctx.notifyBuyer(client, next, {
        type: "FINDING_RIDER",
        title: "Your order is ready",
        body: `Switch is finding a rider for delivery ${next.delivery_code}.`,
      });
      effects.push(() => dispatchJob(next.id));
      return next;
    });
    return { job: updated, alreadyReady: false };
  }

  // ----------------------------------------------------------------- dispatch

  async function findCandidates(job, settings, excludeRiderIds = []) {
    const staleCutoff = new Date(ctx.now() - settings.locationStaleSeconds * 1000);
    const result = await db.query(
      `SELECT r.*,
         (SELECT COUNT(*)::int FROM delivery_jobs j WHERE j.rider_id = r.id AND j.status = ANY($3::text[])) AS active_jobs,
         EXISTS (SELECT 1 FROM delivery_offers o WHERE o.rider_id = r.id AND o.status = 'PENDING') AS has_pending_offer
       FROM riders r
       WHERE r.status = ANY($1::text[])
         AND r.availability_status <> 'OFFLINE'
         AND r.last_location_at >= $2
         AND NOT EXISTS (SELECT 1 FROM delivery_offers o2 WHERE o2.delivery_id = $4 AND o2.rider_id = r.id)
         AND NOT EXISTS (
           SELECT 1 FROM switch_rider_audit_log a
           WHERE a.delivery_id = $4 AND a.rider_id = r.id AND a.action = 'RIDER_RELEASED'
         )
         AND NOT (r.id = ANY($5::text[]))`,
      [[...OPERATIONAL_RIDER_STATUSES], staleCutoff, [...RIDER_ACTIVE_STATUSES], job.id, excludeRiderIds],
    );
    const pickup = { lat: Number(job.pickup_latitude), lng: Number(job.pickup_longitude) };
    return result.rows
      .map((rider) => {
        const distanceToPickupKm = roundTo(haversineKm(pickup, { lat: rider.last_latitude, lng: rider.last_longitude }), 2);
        const eligibility = evaluateRiderEligibility(rider, job, settings, {
          activeJobs: rider.active_jobs,
          hasPendingOffer: rider.has_pending_offer,
          distanceToPickupKm,
          nowMs: ctx.now(),
          mode: "auto",
        });
        return { rider, distanceToPickupKm, eligibility };
      })
      .filter((candidate) => candidate.eligibility.eligible)
      .sort(
        (a, b) =>
          a.distanceToPickupKm - b.distanceToPickupKm ||
          Number(a.rider.active_jobs) - Number(b.rider.active_jobs) ||
          Number(b.rider.rating_average) - Number(a.rider.rating_average),
      )
      .slice(0, 10);
  }

  /**
   * Offers the job to the single best eligible rider. Exactly one pending offer
   * exists per job; the rider row is locked with SKIP LOCKED so two dispatchers
   * can never hand the same rider two offers.
   */
  async function dispatchJob(jobId) {
    const settings = await ctx.getSettings();
    const job = await ctx.getJob(db, jobId);
    if (!job || job.status !== "WAITING_FOR_RIDER") return { offered: false, reason: "NOT_DISPATCHABLE" };
    if (!settings.autoDispatch || job.dispatch_mode !== "AUTO") return { offered: false, reason: "MANUAL_DISPATCH" };
    if (job.dispatch_attempts >= settings.maxDispatchAttempts) return { offered: false, reason: "MAX_ATTEMPTS" };

    const candidates = await findCandidates(job, settings);
    for (const candidate of candidates) {
      const outcome = await ctx.runInTx(async (client) => {
        const locked = await ctx.lockJob(client, jobId);
        if (!locked || locked.status !== "WAITING_FOR_RIDER" || locked.dispatch_mode !== "AUTO") {
          return { done: true, offered: false, reason: "NOT_DISPATCHABLE" };
        }
        const rider = (
          await client.query("SELECT * FROM riders WHERE id = $1 FOR UPDATE SKIP LOCKED", [candidate.rider.id])
        ).rows[0];
        if (!rider) return { done: false };
        const activeJobs = await ctx.countActiveJobs(client, rider.id);
        const pending = (
          await client.query("SELECT 1 FROM delivery_offers WHERE rider_id = $1 AND status = 'PENDING'", [rider.id])
        ).rowCount > 0;
        const recheck = evaluateRiderEligibility(rider, locked, settings, {
          activeJobs,
          hasPendingOffer: pending,
          distanceToPickupKm: candidate.distanceToPickupKm,
          nowMs: ctx.now(),
          mode: "auto",
        });
        if (!recheck.eligible) return { done: false };

        const offerId = newId("ofr");
        const expiresAt = new Date(ctx.now() + settings.offerTimeoutSeconds * 1000);
        await client.query(
          `INSERT INTO delivery_offers (id, delivery_id, rider_id, status, distance_to_pickup_km, offered_at, expires_at)
           VALUES ($1, $2, $3, 'PENDING', $4, $5, $6)`,
          [offerId, jobId, rider.id, candidate.distanceToPickupKm, ctx.nowDate(), expiresAt],
        );
        await ctx.transition(client, locked, "OFFERED", {
          actor: { type: "system" },
          note: "Offered to rider",
          metadata: { riderId: rider.id, offerId },
          fields: {
            current_offer_id: offerId,
            offered_at: ctx.nowDate(),
            dispatch_attempts: Number(locked.dispatch_attempts) + 1,
          },
        });
        await ctx.notifyRider(client, rider.id, {
          type: "NEW_OFFER",
          title: "New delivery offer",
          body: `${locked.pickup_area || "Pickup"} → ${locked.dropoff_area || "Drop-off"} · ₱${Number(locked.rider_earning).toFixed(2)}`,
          deliveryId: jobId,
        });
        return { done: true, offered: true, offerId, riderId: rider.id };
      });
      if (outcome.done) return outcome;
    }
    return { offered: false, reason: "NO_ELIGIBLE_RIDER" };
  }

  async function getCurrentOffer(riderId) {
    const [offers, rider] = await Promise.all([
      db.query(
        `SELECT o.*, row_to_json(j.*) AS job FROM delivery_offers o
         JOIN delivery_jobs j ON j.id = o.delivery_id
         WHERE o.rider_id = $1 AND o.status = 'PENDING' AND o.expires_at > $2
         LIMIT 100`,
        [riderId, ctx.nowDate()],
      ),
      ctx.getRider(db, riderId),
    ]);
    const riderPoint = normalizeCoordinates(rider?.last_latitude, rider?.last_longitude);
    const ranked = offers.rows.map((offer) => {
      const pickup = normalizeCoordinates(offer.job?.pickup_latitude, offer.job?.pickup_longitude);
      const liveDistance = riderPoint && pickup ? roundTo(haversineKm(riderPoint, pickup), 2) : null;
      return {
        ...offer,
        // Refresh the card's distance from the rider's latest GPS instead of
        // retaining the value captured when the offer was first created.
        distance_to_pickup_km: liveDistance ?? offer.distance_to_pickup_km,
      };
    });
    ranked.sort((a, b) => {
      const aDistance = Number(a.distance_to_pickup_km);
      const bDistance = Number(b.distance_to_pickup_km);
      const distanceOrder = (Number.isFinite(aDistance) ? aDistance : Number.MAX_VALUE)
        - (Number.isFinite(bDistance) ? bDistance : Number.MAX_VALUE);
      if (distanceOrder !== 0) return distanceOrder;
      return new Date(a.offered_at).getTime() - new Date(b.offered_at).getTime();
    });
    const row = ranked[0];
    if (!row) return null;
    return serializeOfferForRider(row, row.job, ctx.now());
  }

  async function respondToOffer(riderId, offerId, { decision, reason = "" } = {}) {
    const accept = String(decision ?? "").toUpperCase() === "ACCEPT";
    const decline = String(decision ?? "").toUpperCase() === "DECLINE";
    if (!accept && !decline) throw srError(422, "INVALID_DECISION", "Choose accept or decline.");
    const actor = { type: "rider", id: riderId };

    const outcome = await ctx.runInTx(async (client, effects) => {
      const offer = (
        await client.query("SELECT * FROM delivery_offers WHERE id = $1 AND rider_id = $2 FOR UPDATE", [offerId, riderId])
      ).rows[0];
      if (!offer) throw srError(404, "OFFER_NOT_FOUND", "Offer not found.");
      if (offer.status !== "PENDING") {
        throw srError(409, "OFFER_NO_LONGER_AVAILABLE", "This offer is no longer available.");
      }
      const job = await ctx.lockJob(client, offer.delivery_id);
      const isCurrent = job && job.status === "OFFERED" && job.current_offer_id === offer.id;

      if (new Date(offer.expires_at).getTime() <= ctx.now() || !isCurrent) {
        await client.query(`UPDATE delivery_offers SET status = 'EXPIRED', responded_at = $2 WHERE id = $1`, [offer.id, ctx.nowDate()]);
        if (isCurrent) {
          await ctx.transition(client, job, "WAITING_FOR_RIDER", { actor: { type: "system" }, note: "Offer expired", fields: { current_offer_id: null } });
          effects.push(() => dispatchJob(job.id));
        }
        return { error: srError(410, "OFFER_EXPIRED", "This offer has expired.") };
      }

      if (decline) {
        await client.query(
          `UPDATE delivery_offers SET status = 'DECLINED', responded_at = $2, decline_reason = $3 WHERE id = $1`,
          [offer.id, ctx.nowDate(), cleanText(reason, 200)],
        );
        await ctx.transition(client, job, "WAITING_FOR_RIDER", { actor, note: "Rider declined offer", fields: { current_offer_id: null } });
        effects.push(() => dispatchJob(job.id));
        return { accepted: false };
      }

      const settings = await ctx.getSettings();
      const rider = await ctx.lockRider(client, riderId);
      const activeJobs = await ctx.countActiveJobs(client, riderId);
      const eligibility = evaluateRiderEligibility(rider, job, settings, { activeJobs, mode: "manual" });
      if (!eligibility.eligible) {
        await client.query(`UPDATE delivery_offers SET status = 'WITHDRAWN', responded_at = $2 WHERE id = $1`, [offer.id, ctx.nowDate()]);
        await ctx.transition(client, job, "WAITING_FOR_RIDER", { actor: { type: "system" }, note: "Rider no longer eligible", fields: { current_offer_id: null } });
        effects.push(() => dispatchJob(job.id));
        return {
          error: srError(409, "RIDER_NOT_ELIGIBLE", ELIGIBILITY_REASON_LABELS[eligibility.reasons[0]] || "You can't accept this job right now.", {
            reasons: eligibility.reasons,
          }),
        };
      }

      // Conditional update is the final guard: only one rider can ever flip rider_id from NULL.
      const claimed = await client.query(
        `UPDATE delivery_jobs SET rider_id = $2, status = 'RIDER_ASSIGNED', accepted_at = $3, current_offer_id = NULL, updated_at = NOW()
         WHERE id = $1 AND rider_id IS NULL AND status = 'OFFERED' AND current_offer_id = $4
         RETURNING *`,
        [job.id, riderId, ctx.nowDate(), offer.id],
      );
      if (claimed.rowCount !== 1) throw srError(409, "ALREADY_ASSIGNED", "Another rider already took this delivery.");
      const assigned = claimed.rows[0];
      await ctx.recordHistory(client, { deliveryId: job.id, fromStatus: "OFFERED", toStatus: "RIDER_ASSIGNED", actor, note: "Rider accepted offer" });
      await client.query(`UPDATE delivery_offers SET status = 'ACCEPTED', responded_at = $2 WHERE id = $1`, [offer.id, ctx.nowDate()]);
      await ctx.updateRider(client, riderId, { availability_status: AVAILABILITY.ON_DELIVERY, current_delivery_id: job.id });
      await ctx.audit(client, { actor, action: "OFFER_ACCEPTED", deliveryId: job.id, riderId, metadata: { offerId } });
      await ctx.notifyBuyer(client, assigned, {
        type: "RIDER_ASSIGNED",
        title: "Rider assigned",
        body: `${rider.first_name} is picking up your order (${assigned.delivery_code}).`,
      });
      ctx.queueSellerNotice(effects, assigned, {
        type: "switch-rider-assigned",
        title: "Rider assigned",
        message: `${rider.first_name} (${rider.vehicle_type.toLowerCase()}${rider.plate_number ? ` · ${rider.plate_number}` : ""}) accepted delivery ${assigned.delivery_code}. Have the parcel and pickup PIN ready.`,
      });
      ctx.queueOrderSync(effects, assigned, "RIDER_ASSIGNED", { riderId });
      return { accepted: true, deliveryId: job.id };
    });
    if (outcome.error) throw outcome.error;
    return outcome;
  }

  async function expireDueOffers() {
    const due = (
      await db.query(`SELECT id FROM delivery_offers WHERE status = 'PENDING' AND expires_at <= $1 ORDER BY expires_at LIMIT 200`, [ctx.nowDate()])
    ).rows;
    let expired = 0;
    for (const { id } of due) {
      const changed = await ctx.runInTx(async (client, effects) => {
        const offer = (
          await client.query("SELECT * FROM delivery_offers WHERE id = $1 FOR UPDATE SKIP LOCKED", [id])
        ).rows[0];
        if (!offer || offer.status !== "PENDING" || new Date(offer.expires_at).getTime() > ctx.now()) return false;
        await client.query(`UPDATE delivery_offers SET status = 'EXPIRED', responded_at = $2 WHERE id = $1`, [id, ctx.nowDate()]);
        const job = await ctx.lockJob(client, offer.delivery_id);
        if (job && job.status === "OFFERED" && job.current_offer_id === id) {
          await ctx.transition(client, job, "WAITING_FOR_RIDER", { actor: { type: "system" }, note: "Offer expired", fields: { current_offer_id: null } });
          effects.push(() => dispatchJob(job.id));
        }
        await ctx.notifyRider(client, offer.rider_id, {
          type: "OFFER_EXPIRED",
          title: "Offer expired",
          body: "You missed a delivery offer. Stay on the app to catch the next one.",
          deliveryId: offer.delivery_id,
        });
        return true;
      });
      if (changed) expired += 1;
    }
    return expired;
  }

  /** Re-dispatch waiting jobs and escalate ones nobody is taking to Super Admin. */
  async function redispatchWaitingJobs() {
    const settings = await ctx.getSettings();
    const waiting = (
      await db.query(
        `SELECT * FROM delivery_jobs WHERE status = 'WAITING_FOR_RIDER' ORDER BY ready_at ASC NULLS LAST LIMIT 100`,
      )
    ).rows;
    let offered = 0;
    for (const job of waiting) {
      if (settings.autoDispatch && job.dispatch_mode === "AUTO" && job.dispatch_attempts < settings.maxDispatchAttempts) {
        const result = await dispatchJob(job.id);
        if (result.offered) {
          offered += 1;
          continue;
        }
      }
      const waitingMs = ctx.now() - new Date(job.ready_at || job.created_at).getTime();
      const stuck = job.dispatch_attempts >= settings.maxDispatchAttempts || waitingMs >= settings.dispatchStuckMinutes * 60 * 1000;
      if (stuck && !job.dispatch_stuck_notified) {
        const flagged = await db.query(
          `UPDATE delivery_jobs SET dispatch_stuck_notified = TRUE, updated_at = NOW()
           WHERE id = $1 AND dispatch_stuck_notified = FALSE RETURNING id`,
          [job.id],
        );
        if (flagged.rowCount === 1 && typeof ctx.notifier.notifySuperAdmin === "function") {
          await ctx.notifier.notifySuperAdmin({
            type: "switch-rider-dispatch-stuck",
            title: "Delivery needs a rider",
            message: `${job.delivery_code} (${job.pickup_area || "pickup"} → ${job.dropoff_area || "drop-off"}) has waited ${Math.round(waitingMs / 60000)} min with no rider. Assign one manually.`,
            deliveryId: job.id,
            priority: "high",
          }).catch((error) => ctx.logger.error?.("[switch-rider] stuck notice failed:", error?.message || error));
        }
      }
    }
    return offered;
  }

  // -------------------------------------------------- manual assign / release

  async function listEligibleRidersForJob(jobId) {
    const settings = await ctx.getSettings();
    const job = await ctx.getJob(db, jobId);
    if (!job) throw srError(404, "DELIVERY_NOT_FOUND", "Delivery not found.");
    const rows = (
      await db.query(
        `SELECT r.*,
           (SELECT COUNT(*)::int FROM delivery_jobs j WHERE j.rider_id = r.id AND j.status = ANY($2::text[])) AS active_jobs
         FROM riders r WHERE r.status = ANY($1::text[])
         ORDER BY r.availability_status <> 'OFFLINE' DESC, r.last_location_at DESC NULLS LAST LIMIT 200`,
        [[...OPERATIONAL_RIDER_STATUSES], [...RIDER_ACTIVE_STATUSES]],
      )
    ).rows;
    const pickup = { lat: Number(job.pickup_latitude), lng: Number(job.pickup_longitude) };
    return rows
      .filter((rider) => rider.id !== job.rider_id)
      .map((rider) => {
        const hasLocation = rider.last_latitude !== null && rider.last_latitude !== undefined;
        const distanceToPickupKm = hasLocation
          ? roundTo(haversineKm(pickup, { lat: rider.last_latitude, lng: rider.last_longitude }), 2)
          : null;
        const eligibility = evaluateRiderEligibility(rider, job, settings, {
          activeJobs: rider.active_jobs,
          nowMs: ctx.now(),
          mode: "manual",
        });
        const locationAgeSeconds = rider.last_location_at
          ? Math.round((ctx.now() - new Date(rider.last_location_at).getTime()) / 1000)
          : null;
        return {
          ...serializeRiderForAdmin(rider),
          activeJobs: rider.active_jobs,
          distanceToPickupKm,
          locationAgeSeconds,
          eligible: eligibility.eligible,
          blockedReasons: eligibility.reasons.map((code) => ({ code, label: ELIGIBILITY_REASON_LABELS[code] || code })),
        };
      })
      .sort(
        (a, b) =>
          Number(b.eligible) - Number(a.eligible) ||
          (a.distanceToPickupKm ?? 9999) - (b.distanceToPickupKm ?? 9999),
      );
  }

  async function manualAssign(jobId, riderId, { note = "" } = {}, actor) {
    const settings = await ctx.getSettings();
    return ctx.runInTx(async (client, effects) => {
      let job = await ctx.lockJob(client, jobId);
      if (!job) throw srError(404, "DELIVERY_NOT_FOUND", "Delivery not found.");
      const reassign = ASSIGNED_PRE_PICKUP_STATUSES.has(job.status);
      if (!reassign && !["WAITING_FOR_RIDER", "OFFERED"].includes(job.status)) {
        throw srError(409, "CANNOT_ASSIGN", `A ${JOB_STATUS_LABELS[job.status].toLowerCase()} delivery can't be assigned. ${job.status === "PREPARING" ? "Wait until the seller marks it ready." : ""}`.trim());
      }
      if (job.rider_id === riderId) throw srError(409, "ALREADY_ASSIGNED", "This rider is already assigned.");

      const rider = await ctx.lockRider(client, riderId);
      if (!rider) throw srError(404, "RIDER_NOT_FOUND", "Rider not found.");
      const eligibility = evaluateRiderEligibility(rider, job, settings, {
        activeJobs: await ctx.countActiveJobs(client, riderId),
        mode: "manual",
      });
      if (!eligibility.eligible) {
        throw srError(409, "RIDER_NOT_ELIGIBLE", eligibility.reasons.map((code) => ELIGIBILITY_REASON_LABELS[code] || code).join(", "), {
          reasons: eligibility.reasons,
        });
      }

      if (job.current_offer_id) {
        await client.query(`UPDATE delivery_offers SET status = 'WITHDRAWN', responded_at = $2 WHERE id = $1 AND status = 'PENDING'`, [
          job.current_offer_id,
          ctx.nowDate(),
        ]);
      }
      const previousRiderId = job.rider_id;
      if (reassign) {
        job = await ctx.transition(client, job, "WAITING_FOR_RIDER", {
          actor,
          note: "Reassigned by Super Admin",
          fields: { rider_id: null },
        });
        await ctx.audit(client, { actor, action: "RIDER_RELEASED", deliveryId: jobId, riderId: previousRiderId, metadata: { reason: "ADMIN_REASSIGN" } });
        await ctx.freeRiderIfIdle(client, previousRiderId);
        await ctx.notifyRider(client, previousRiderId, {
          type: "DELIVERY_REASSIGNED",
          title: "Delivery reassigned",
          body: `${job.delivery_code} was reassigned by Switch support. You don't need to pick it up.`,
          deliveryId: jobId,
        });
      }
      const assigned = await ctx.transition(client, job, "RIDER_ASSIGNED", {
        actor,
        note: cleanText(note, 300) || "Assigned by Super Admin",
        metadata: { riderId },
        fields: { rider_id: riderId, accepted_at: ctx.nowDate(), current_offer_id: null, dispatch_mode: "MANUAL" },
      });
      await ctx.updateRider(client, riderId, { availability_status: AVAILABILITY.ON_DELIVERY, current_delivery_id: jobId });
      await ctx.audit(client, {
        actor,
        action: reassign ? "DELIVERY_REASSIGNED" : "DELIVERY_ASSIGNED",
        deliveryId: jobId,
        riderId,
        metadata: { previousRiderId, note: cleanText(note, 300) },
      });
      await ctx.notifyRider(client, riderId, {
        type: "NEW_ASSIGNMENT",
        title: "Delivery assigned to you",
        body: `Switch support assigned ${assigned.delivery_code}: ${assigned.pickup_area || "pickup"} → ${assigned.dropoff_area || "drop-off"}.`,
        deliveryId: jobId,
      });
      await ctx.notifyBuyer(client, assigned, {
        type: "RIDER_ASSIGNED",
        title: reassign ? "New rider assigned" : "Rider assigned",
        body: `${rider.first_name} is handling your delivery (${assigned.delivery_code}).`,
      });
      ctx.queueSellerNotice(effects, assigned, {
        type: reassign ? "switch-rider-reassigned" : "switch-rider-assigned",
        title: reassign ? "Switch reassigned your delivery" : "Switch assigned a rider",
        message: `Super Admin ${reassign ? "reassigned" : "assigned"} delivery ${assigned.delivery_code} to ${rider.first_name} (${rider.vehicle_type.toLowerCase()}${rider.plate_number ? ` · ${rider.plate_number}` : ""}).`,
      });
      ctx.queueOrderSync(effects, assigned, "RIDER_ASSIGNED", { riderId });
      return assigned;
    });
  }

  /** Rider hands back an accepted job before pickup (vehicle problem, emergency…). */
  async function riderReleaseJob(riderId, jobId, { reason, note = "" } = {}) {
    const code = String(reason ?? "").toUpperCase();
    if (!RIDER_RELEASE_REASONS[code]) throw srError(422, "INVALID_REASON", "Choose a reason.");
    const cleanNote = cleanText(note, 300);
    if (code === "OTHER" && !cleanNote) throw srError(422, "REASON_REQUIRED", "Tell us what happened.");
    const actor = { type: "rider", id: riderId };
    return ctx.runInTx(async (client, effects) => {
      const job = await ctx.requireRiderJob(client, riderId, jobId);
      if (!ASSIGNED_PRE_PICKUP_STATUSES.has(job.status)) {
        throw srError(409, "CANNOT_RELEASE", "You can only hand back a delivery before pickup. Contact support.");
      }
      const released = await ctx.transition(client, job, "WAITING_FOR_RIDER", {
        actor,
        note: `Rider released job: ${RIDER_RELEASE_REASONS[code]}`,
        fields: { rider_id: null, accepted_at: null, dispatch_mode: "AUTO" },
      });
      await ctx.audit(client, { actor, action: "RIDER_RELEASED", deliveryId: jobId, riderId, metadata: { reason: code, note: cleanNote } });
      await ctx.freeRiderIfIdle(client, riderId);
      await ctx.notifyBuyer(client, released, {
        type: "FINDING_RIDER",
        title: "Finding a new rider",
        body: `Your rider couldn't continue. Switch is assigning a new rider for ${released.delivery_code}.`,
      });
      ctx.queueSellerNotice(effects, released, {
        type: "switch-rider-reassigning",
        title: "Finding a new rider",
        message: `The rider for ${released.delivery_code} handed the job back (${RIDER_RELEASE_REASONS[code]}). Switch is finding a new rider.`,
      });
      ctx.queueOrderSync(effects, released, "RIDER_RELEASED");
      effects.push(() => dispatchJob(jobId));
      return { released: true };
    });
  }

  return {
    getPickupLocation,
    upsertPickupLocation,
    quoteForCheckout,
    validateCheckoutQuote,
    createJobForOrder,
    getActiveJobForOrderGroup,
    startDispatchAfterCheckout,
    markReadyForRider,
    dispatchJob,
    getCurrentOffer,
    respondToOffer,
    expireDueOffers,
    redispatchWaitingJobs,
    listEligibleRidersForJob,
    manualAssign,
    riderReleaseJob,
  };
}

module.exports = { createDispatch };
