"use strict";

const {
  FAILURE_REASONS,
  MAX_PIN_ATTEMPTS,
  PARCEL_IN_RIDER_CUSTODY_STATUSES,
  RIDER_ACTIVE_STATUSES,
  TERMINAL_STATUSES,
} = require("./constants");
const { srError, JOB_STATUS_LABELS } = require("./core");
const { pinsMatch, newId, newPinNonce } = require("./tokens");

const MAX_PROOFS_PER_TYPE = 5;

function cleanText(value, max = 300) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function cents(value) {
  return Math.round((Number(value) || 0) * 100);
}

function createWorkflow(ctx, { money }) {
  const { db } = ctx;

  function expectStatus(job, allowed, action) {
    const list = Array.isArray(allowed) ? allowed : [allowed];
    if (!list.includes(job.status)) {
      throw srError(409, "INVALID_STATUS_TRANSITION", `Can't ${action} while the delivery is ${JOB_STATUS_LABELS[job.status]?.toLowerCase() || job.status}.`, {
        currentStatus: job.status,
      });
    }
  }

  /**
   * PIN check with a persistent attempt counter. A wrong PIN must still commit
   * the incremented counter, so the error is returned (not thrown) from the tx.
   */
  async function verifyPinInTx(client, job, purpose, suppliedPin, attemptsColumn) {
    const attempts = Number(job[attemptsColumn]) || 0;
    if (attempts >= MAX_PIN_ATTEMPTS) {
      return {
        error: srError(423, "PIN_LOCKED", "Too many wrong PIN attempts. Contact Switch support to continue."),
      };
    }
    if (!pinsMatch(ctx.pin(job, purpose), suppliedPin)) {
      const next = attempts + 1;
      await ctx.updateJob(client, job.id, { [attemptsColumn]: next });
      await ctx.audit(client, {
        actor: { type: "rider", id: job.rider_id },
        action: "PIN_MISMATCH",
        deliveryId: job.id,
        riderId: job.rider_id,
        metadata: { purpose, attempts: next },
      });
      const remaining = MAX_PIN_ATTEMPTS - next;
      return {
        error:
          remaining > 0
            ? srError(422, "PIN_INCORRECT", `Incorrect PIN. ${remaining} attempt${remaining === 1 ? "" : "s"} left.`, { attemptsRemaining: remaining })
            : srError(423, "PIN_LOCKED", "Too many wrong PIN attempts. Contact Switch support to continue."),
      };
    }
    return { ok: true };
  }

  async function runRiderStep(riderId, jobId, work) {
    const outcome = await ctx.runInTx(async (client, effects) => {
      const job = await ctx.requireRiderJob(client, riderId, jobId);
      return work(client, effects, job, { type: "rider", id: riderId });
    });
    if (outcome && outcome.error) throw outcome.error;
    return outcome;
  }

  async function startPickup(riderId, jobId) {
    return runRiderStep(riderId, jobId, async (client, effects, job, actor) => {
      if (job.status === "RIDER_TO_PICKUP") return { job };
      expectStatus(job, "RIDER_ASSIGNED", "start pickup");
      const next = await ctx.transition(client, job, "RIDER_TO_PICKUP", { actor, fields: { to_pickup_at: ctx.nowDate() } });
      await ctx.notifyBuyer(client, next, { type: "RIDER_TO_PICKUP", title: "Rider is on the way to the seller", body: next.delivery_code });
      return { job: next };
    });
  }

  async function arriveAtPickup(riderId, jobId) {
    return runRiderStep(riderId, jobId, async (client, effects, job, actor) => {
      if (job.status === "ARRIVED_AT_PICKUP") return { job };
      expectStatus(job, ["RIDER_ASSIGNED", "RIDER_TO_PICKUP"], "mark arrival at pickup");
      const next = await ctx.transition(client, job, "ARRIVED_AT_PICKUP", {
        actor,
        fields: { arrived_pickup_at: ctx.nowDate(), to_pickup_at: job.to_pickup_at || ctx.nowDate() },
      });
      ctx.queueSellerNotice(effects, next, {
        type: "switch-rider-arrived-pickup",
        title: "Rider has arrived",
        message: `The rider for ${next.delivery_code} is at your pickup point. Hand over the parcel and give them the pickup PIN.`,
        priority: "high",
      });
      return { job: next };
    });
  }

  async function confirmPickup(riderId, jobId, { pin } = {}) {
    return runRiderStep(riderId, jobId, async (client, effects, job, actor) => {
      expectStatus(job, "ARRIVED_AT_PICKUP", "confirm pickup");
      const check = await verifyPinInTx(client, job, "pickup", pin, "pickup_pin_attempts");
      if (check.error) return check;
      const next = await ctx.transition(client, job, "PICKED_UP", { actor, note: "Pickup PIN verified", fields: { picked_up_at: ctx.nowDate() } });
      await ctx.notifyBuyer(client, next, { type: "PICKED_UP", title: "Order picked up", body: `Your rider has your parcel (${next.delivery_code}).` });
      ctx.queueSellerNotice(effects, next, {
        type: "switch-rider-picked-up",
        title: "Parcel picked up",
        message: `Delivery ${next.delivery_code} was picked up and is on its way to the buyer.`,
      });
      ctx.queueOrderSync(effects, next, "PICKED_UP");
      return { job: next };
    });
  }

  async function startDelivery(riderId, jobId) {
    return runRiderStep(riderId, jobId, async (client, effects, job, actor) => {
      if (job.status === "IN_TRANSIT") return { job };
      expectStatus(job, "PICKED_UP", "start delivery");
      const next = await ctx.transition(client, job, "IN_TRANSIT", { actor, fields: { in_transit_at: ctx.nowDate() } });
      await ctx.notifyBuyer(client, next, { type: "IN_TRANSIT", title: "Your order is on the way", body: "Have your delivery PIN ready." });
      ctx.queueOrderSync(effects, next, "IN_TRANSIT");
      return { job: next };
    });
  }

  async function arriveAtDropoff(riderId, jobId) {
    return runRiderStep(riderId, jobId, async (client, effects, job, actor) => {
      if (job.status === "ARRIVED_AT_DROPOFF") return { job };
      expectStatus(job, ["PICKED_UP", "IN_TRANSIT"], "mark arrival");
      const next = await ctx.transition(client, job, "ARRIVED_AT_DROPOFF", {
        actor,
        fields: { arrived_dropoff_at: ctx.nowDate(), in_transit_at: job.in_transit_at || ctx.nowDate() },
      });
      const codLine = next.payment_method === "COD" ? ` Prepare ₱${Number(next.cod_amount).toFixed(2)} cash.` : "";
      await ctx.notifyBuyer(client, next, {
        type: "RIDER_ARRIVED",
        title: "Your rider has arrived",
        body: `Meet your rider and share your delivery PIN.${codLine}`,
      });
      return { job: next };
    });
  }

  async function collectCod(riderId, jobId, { amount } = {}) {
    return runRiderStep(riderId, jobId, async (client, effects, job, actor) => {
      expectStatus(job, "ARRIVED_AT_DROPOFF", "collect cash");
      if (job.payment_method !== "COD" || cents(job.cod_amount) <= 0) {
        throw srError(409, "NOT_COD", "This order is prepaid. Do not collect cash.");
      }
      if (job.cod_collected_at) return { job, alreadyCollected: true };
      if (cents(amount) !== cents(job.cod_amount)) {
        throw srError(422, "COD_AMOUNT_MISMATCH", `Collect exactly ₱${Number(job.cod_amount).toFixed(2)}.`, {
          expectedAmount: Number(job.cod_amount),
        });
      }
      const next = await ctx.updateJob(client, job.id, { cod_collected_amount: job.cod_amount, cod_collected_at: ctx.nowDate() });
      await client.query(
        `INSERT INTO cod_transactions (id, rider_id, delivery_id, order_group_id, amount, status, collected_at)
         VALUES ($1, $2, $3, $4, $5, 'PENDING_REMITTANCE', $6)`,
        [newId("cod"), riderId, job.id, job.order_group_id, job.cod_amount, ctx.nowDate()],
      );
      await ctx.audit(client, { actor, action: "COD_COLLECTED", deliveryId: job.id, riderId, metadata: { amount: Number(job.cod_amount) } });
      return { job: next };
    });
  }

  async function uploadProof(riderId, jobId, proofTypeInput, buffer, declaredType = "") {
    const proofType = String(proofTypeInput ?? "").toUpperCase();
    if (!["DELIVERY", "FAILED_ATTEMPT"].includes(proofType)) throw srError(422, "INVALID_PROOF_TYPE", "Unknown proof type.");
    if (!ctx.privateFiles) throw srError(503, "PRIVATE_STORAGE_UNAVAILABLE", "Photo storage is not configured.");
    const precheck = await ctx.requireRiderJob(db, riderId, jobId, { lock: false });
    const allowed = proofType === "DELIVERY" ? ["ARRIVED_AT_DROPOFF"] : ["PICKED_UP", "IN_TRANSIT", "ARRIVED_AT_DROPOFF"];
    expectStatus(precheck, allowed, "upload this photo");
    const saved = await ctx.privateFiles.saveImage(buffer, { category: `proof${proofType.toLowerCase()}`, declaredType });
    return runRiderStep(riderId, jobId, async (client, effects, job, actor) => {
      expectStatus(job, allowed, "upload this photo");
      const count = (
        await client.query("SELECT COUNT(*)::int AS count FROM delivery_proofs WHERE delivery_id = $1 AND proof_type = $2", [job.id, proofType])
      ).rows[0].count;
      if (count >= MAX_PROOFS_PER_TYPE) throw srError(409, "TOO_MANY_PROOFS", "You've already uploaded the maximum number of photos.");
      const proof = (
        await client.query(
          `INSERT INTO delivery_proofs (id, delivery_id, order_group_id, rider_id, proof_type, storage_key, content_type, byte_size, uploaded_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, proof_type, uploaded_at`,
          [newId("prf"), job.id, job.order_group_id, riderId, proofType, saved.storageKey, saved.contentType, saved.byteSize, ctx.nowDate()],
        )
      ).rows[0];
      await ctx.audit(client, { actor, action: "PROOF_UPLOADED", deliveryId: job.id, riderId, metadata: { proofId: proof.id, proofType } });
      return { proofId: proof.id, proofType, uploadedAt: new Date(proof.uploaded_at).toISOString() };
    });
  }

  async function requireProof(client, job, proofId, proofType) {
    const proof = (
      await client.query("SELECT * FROM delivery_proofs WHERE id = $1 AND delivery_id = $2 AND proof_type = $3", [proofId, job.id, proofType])
    ).rows[0];
    if (!proof) throw srError(422, "PROOF_REQUIRED", "Upload a photo first.");
    return proof;
  }

  async function completeDelivery(riderId, jobId, { method, pin, proofId, leftAtDoor = false } = {}) {
    const confirmation = String(method ?? "").toUpperCase();
    if (!["PIN", "PHOTO"].includes(confirmation)) throw srError(422, "INVALID_CONFIRMATION", "Confirm with the delivery PIN or a photo.");
    if (leftAtDoor && confirmation !== "PHOTO") {
      throw srError(422, "PHOTO_REQUIRED", "Leaving the parcel at the door requires a photo.");
    }
    return runRiderStep(riderId, jobId, async (client, effects, job, actor) => {
      expectStatus(job, "ARRIVED_AT_DROPOFF", "complete the delivery");
      const isCod = job.payment_method === "COD" && cents(job.cod_amount) > 0;
      if (isCod && leftAtDoor) throw srError(409, "COD_REQUIRES_HANDOVER", "Cash-on-delivery parcels must be handed to the customer.");
      if (isCod && !job.cod_collected_at) throw srError(409, "COD_NOT_COLLECTED", "Confirm the cash collection first.");

      let proof = null;
      let pinVerified = false;
      if (confirmation === "PIN") {
        const check = await verifyPinInTx(client, job, "delivery", pin, "delivery_pin_attempts");
        if (check.error) return check;
        pinVerified = true;
        if (proofId) proof = await requireProof(client, job, proofId, "DELIVERY");
      } else {
        proof = await requireProof(client, job, proofId, "DELIVERY");
      }

      const delivered = await ctx.transition(client, job, "DELIVERED", {
        actor,
        note: confirmation === "PIN" ? "Delivery PIN verified" : leftAtDoor ? "Left at door with photo proof" : "Photo proof of delivery",
        metadata: { confirmation, leftAtDoor: Boolean(leftAtDoor), proofId: proof?.id || null },
        fields: {
          delivered_at: ctx.nowDate(),
          delivery_confirmation_type: confirmation,
          delivery_pin_verified: pinVerified,
          proof_of_delivery_id: proof?.id || null,
        },
      });
      await money.awardEarning(client, delivered, "DELIVERY");
      await ctx.freeRiderIfIdle(client, riderId);
      await ctx.notifyBuyer(client, delivered, {
        type: "DELIVERED",
        title: "Order delivered",
        body: `Delivery ${delivered.delivery_code} is complete. Rate your rider to help us improve.`,
      });
      ctx.queueSellerNotice(effects, delivered, {
        type: "switch-rider-delivered",
        title: "Order delivered",
        message: `Delivery ${delivered.delivery_code} was delivered to the buyer.`,
      });
      ctx.queueOrderSync(effects, delivered, "DELIVERED");
      return { job: delivered };
    });
  }

  async function failDelivery(riderId, jobId, { reason, note = "", proofId = "" } = {}) {
    const code = String(reason ?? "").toUpperCase();
    const rule = FAILURE_REASONS[code];
    if (!rule) throw srError(422, "INVALID_REASON", "Choose why the delivery failed.");
    const cleanNote = cleanText(note, 500);
    if (code === "OTHER" && !cleanNote) throw srError(422, "REASON_REQUIRED", "Describe what happened.");
    return runRiderStep(riderId, jobId, async (client, effects, job, actor) => {
      expectStatus(job, ["PICKED_UP", "IN_TRANSIT", "ARRIVED_AT_DROPOFF"], "report a failed delivery");
      if (job.cod_collected_at) {
        throw srError(409, "COD_ALREADY_COLLECTED", "Cash was already collected. Complete the delivery or contact support.");
      }
      if (rule.evidenceRequired) {
        if (!proofId) throw srError(422, "PROOF_REQUIRED", "Take a photo as evidence first.");
        await requireProof(client, job, proofId, "FAILED_ATTEMPT");
      }
      const failed = await ctx.transition(client, job, "FAILED_DELIVERY", {
        actor,
        note: rule.label,
        metadata: { reason: code, proofId: proofId || null },
        fields: { failed_at: ctx.nowDate(), failure_reason: code, failure_note: cleanNote },
      });
      const returning = await ctx.transition(client, failed, "RETURN_REQUIRED", { actor: { type: "system" }, note: "Return to seller required" });
      await ctx.notifyBuyer(client, returning, {
        type: "DELIVERY_FAILED",
        title: "Delivery attempt failed",
        body: `${rule.label}. Your parcel will be returned to the seller. Contact support if this is a mistake.`,
      });
      ctx.queueSellerNotice(effects, returning, {
        type: "switch-rider-delivery-failed",
        title: "Delivery failed — parcel returning",
        message: `Delivery ${returning.delivery_code} failed (${rule.label}). The rider will return the parcel; confirm with your return PIN.`,
        priority: "high",
      });
      ctx.queueSuperAdminNotice(effects, {
        type: "switch-rider-delivery-failed",
        title: "Switch Rider delivery failed",
        message: `${returning.delivery_code}: ${rule.label}${cleanNote ? ` — ${cleanNote}` : ""}.`,
        deliveryId: returning.id,
        priority: "normal",
      });
      ctx.queueOrderSync(effects, returning, "FAILED", { reason: rule.label });
      return { job: returning };
    });
  }

  async function startReturn(riderId, jobId) {
    return runRiderStep(riderId, jobId, async (client, effects, job, actor) => {
      if (job.status === "RETURNING_TO_SELLER") return { job };
      expectStatus(job, "RETURN_REQUIRED", "start the return");
      const next = await ctx.transition(client, job, "RETURNING_TO_SELLER", { actor, fields: { return_started_at: ctx.nowDate() } });
      ctx.queueSellerNotice(effects, next, {
        type: "switch-rider-returning",
        title: "Parcel is being returned",
        message: `The rider is bringing back ${next.delivery_code}. Check the parcel, then give them your return PIN.`,
      });
      return { job: next };
    });
  }

  async function confirmReturn(riderId, jobId, { pin } = {}) {
    return runRiderStep(riderId, jobId, async (client, effects, job, actor) => {
      expectStatus(job, "RETURNING_TO_SELLER", "confirm the return");
      const check = await verifyPinInTx(client, job, "return", pin, "return_pin_attempts");
      if (check.error) return check;
      const returned = await ctx.transition(client, job, "RETURNED_TO_SELLER", {
        actor,
        note: "Return PIN verified by seller",
        fields: { returned_at: ctx.nowDate() },
      });
      await money.awardEarning(client, returned, "FAILED_ATTEMPT");
      await ctx.freeRiderIfIdle(client, riderId);
      await ctx.notifyBuyer(client, returned, {
        type: "RETURNED_TO_SELLER",
        title: "Parcel returned to seller",
        body: `Delivery ${returned.delivery_code} was returned to the seller.`,
      });
      ctx.queueSellerNotice(effects, returned, {
        type: "switch-rider-returned",
        title: "Parcel returned",
        message: `Delivery ${returned.delivery_code} is back with you.`,
      });
      ctx.queueOrderSync(effects, returned, "RETURNED");
      return { job: returned };
    });
  }

  // ------------------------------------------------------------ cancellation

  /**
   * Cancels a delivery. Before pickup this is simple; once the parcel is with a
   * rider only Super Admin intervention (force return) is allowed.
   */
  async function cancelJob(jobId, { reason = "", fromOrderCancellation = false } = {}, actor) {
    const cleanReason = cleanText(reason, 300);
    if (!cleanReason) throw srError(422, "REASON_REQUIRED", "A cancellation reason is required.");
    return ctx.runInTx(async (client, effects) => {
      const job = await ctx.lockJob(client, jobId);
      if (!job) throw srError(404, "DELIVERY_NOT_FOUND", "Delivery not found.");
      if (actor.type === "seller" && job.seller_admin_id !== actor.id) throw srError(404, "DELIVERY_NOT_FOUND", "Delivery not found.");
      if (actor.type === "buyer" && job.buyer_account_id !== actor.id) throw srError(404, "DELIVERY_NOT_FOUND", "Delivery not found.");
      if (TERMINAL_STATUSES.has(job.status)) {
        if (job.status === "CANCELLED") return { job, alreadyCancelled: true };
        throw srError(409, "DELIVERY_FINISHED", "This delivery is already finished.");
      }
      if (PARCEL_IN_RIDER_CUSTODY_STATUSES.has(job.status)) {
        throw srError(409, "CANCEL_REQUIRES_INTERVENTION", "The rider already has the parcel. Switch support must handle this (force return).");
      }
      if (job.current_offer_id) {
        await client.query(`UPDATE delivery_offers SET status = 'WITHDRAWN', responded_at = $2 WHERE id = $1 AND status = 'PENDING'`, [
          job.current_offer_id,
          ctx.nowDate(),
        ]);
      }
      const cancelled = await ctx.transition(client, job, "CANCELLED", {
        actor,
        note: cleanReason,
        fields: {
          cancelled_at: ctx.nowDate(),
          cancelled_by: String(actor.id || ""),
          cancelled_by_role: String(actor.type || "system"),
          cancellation_reason: cleanReason,
          cancellation_stage: job.status,
          current_offer_id: null,
        },
      });
      await ctx.audit(client, { actor, action: "DELIVERY_CANCELLED", deliveryId: jobId, riderId: job.rider_id, metadata: { reason: cleanReason, stage: job.status } });
      if (job.rider_id && RIDER_ACTIVE_STATUSES.has(job.status)) {
        await ctx.freeRiderIfIdle(client, job.rider_id);
        await ctx.notifyRider(client, job.rider_id, {
          type: "DELIVERY_CANCELLED",
          title: "Delivery cancelled",
          body: `${job.delivery_code} was cancelled. You don't need to pick it up.`,
          deliveryId: jobId,
        });
      }
      if (actor.type !== "buyer") {
        await ctx.notifyBuyer(client, cancelled, {
          type: "DELIVERY_CANCELLED",
          title: "Delivery cancelled",
          body: `Switch Rider delivery ${cancelled.delivery_code} was cancelled.`,
        });
      }
      if (actor.type !== "seller") {
        ctx.queueSellerNotice(effects, cancelled, {
          type: "switch-rider-cancelled",
          title: actor.type === "super_admin" ? "Switch cancelled a delivery" : "Delivery cancelled",
          message: `Delivery ${cancelled.delivery_code} was cancelled${actor.type === "super_admin" ? " by Super Admin" : ""}: ${cleanReason}.${actor.type === "super_admin" && !fromOrderCancellation ? " You can call a new rider from the order page." : ""}`,
          priority: "high",
        });
      }
      if (actor.type === "seller") {
        ctx.queueSuperAdminNotice(effects, {
          type: "switch-rider-seller-cancelled",
          title: "Seller cancelled a Switch Rider delivery",
          message: `${cancelled.delivery_code} was cancelled by the seller at stage ${JOB_STATUS_LABELS[job.status]}: ${cleanReason}.`,
          deliveryId: jobId,
          sellerAdminId: cancelled.seller_admin_id,
        });
      }
      if (!fromOrderCancellation) ctx.queueOrderSync(effects, cancelled, "CANCELLED", { reason: cleanReason });
      return { job: cancelled };
    });
  }

  async function cancelJobForOrderGroup(orderGroupId, { reason }, actor) {
    const job = (
      await db.query(`SELECT id FROM delivery_jobs WHERE order_group_id = $1 AND status <> 'CANCELLED'`, [orderGroupId])
    ).rows[0];
    if (!job) return null;
    return cancelJob(job.id, { reason, fromOrderCancellation: true }, actor);
  }

  /** Whether the order itself may be cancelled (false once a rider holds the parcel). */
  async function canCancelOrderGroup(orderGroupId) {
    const job = (
      await db.query(`SELECT status FROM delivery_jobs WHERE order_group_id = $1 AND status <> 'CANCELLED'`, [orderGroupId])
    ).rows[0];
    if (!job) return { allowed: true };
    if (PARCEL_IN_RIDER_CUSTODY_STATUSES.has(job.status) || job.status === "DELIVERED" || job.status === "RETURNED_TO_SELLER") {
      return { allowed: false, message: "The Switch Rider already picked up this parcel. Contact Switch support." };
    }
    return { allowed: true };
  }

  // --------------------------------------------------- Super Admin intervention

  const INTERVENTIONS = new Set(["FORCE_RETURN", "MARK_RETURNED", "RESET_PIN_ATTEMPTS", "ROTATE_PINS"]);

  async function adminIntervene(jobId, { action, note = "" } = {}, actor) {
    const code = String(action ?? "").toUpperCase();
    if (!INTERVENTIONS.has(code)) throw srError(422, "INVALID_ACTION", "Unknown intervention.");
    const cleanNote = cleanText(note, 500);
    if (!cleanNote) throw srError(422, "REASON_REQUIRED", "Add an investigation note.");
    return ctx.runInTx(async (client, effects) => {
      let job = await ctx.lockJob(client, jobId);
      if (!job) throw srError(404, "DELIVERY_NOT_FOUND", "Delivery not found.");

      if (code === "FORCE_RETURN") {
        expectStatus(job, ["PICKED_UP", "IN_TRANSIT", "ARRIVED_AT_DROPOFF"], "force a return");
        if (job.cod_collected_at) throw srError(409, "COD_ALREADY_COLLECTED", "Cash was collected; resolve the payment first.");
        job = await ctx.transition(client, job, "RETURN_REQUIRED", {
          actor,
          note: `Super Admin: ${cleanNote}`,
          fields: { failed_at: ctx.nowDate(), failure_reason: "ADMIN_INTERVENTION", failure_note: cleanNote },
        });
        await ctx.notifyRider(client, job.rider_id, {
          type: "RETURN_REQUIRED",
          title: "Return parcel to seller",
          body: `Switch support asked you to return ${job.delivery_code} to the seller.`,
          deliveryId: jobId,
        });
        await ctx.notifyBuyer(client, job, {
          type: "DELIVERY_FAILED",
          title: "Delivery stopped by support",
          body: `Delivery ${job.delivery_code} is being returned to the seller. Contact support for details.`,
        });
        ctx.queueSellerNotice(effects, job, {
          type: "switch-rider-force-return",
          title: "Switch is returning a parcel",
          message: `Super Admin stopped delivery ${job.delivery_code} and the parcel is coming back: ${cleanNote}`,
          priority: "high",
        });
        ctx.queueOrderSync(effects, job, "FAILED", { reason: "Returned by Switch support" });
      } else if (code === "MARK_RETURNED") {
        expectStatus(job, ["RETURN_REQUIRED", "RETURNING_TO_SELLER"], "mark as returned");
        if (job.status === "RETURN_REQUIRED") {
          job = await ctx.transition(client, job, "RETURNING_TO_SELLER", { actor, note: "Super Admin override", fields: { return_started_at: ctx.nowDate() } });
        }
        job = await ctx.transition(client, job, "RETURNED_TO_SELLER", { actor, note: `Super Admin: ${cleanNote}`, fields: { returned_at: ctx.nowDate() } });
        if (job.failure_reason !== "ADMIN_INTERVENTION") await money.awardEarning(client, job, "FAILED_ATTEMPT");
        await ctx.freeRiderIfIdle(client, job.rider_id);
        ctx.queueSellerNotice(effects, job, {
          type: "switch-rider-returned",
          title: "Return confirmed by Switch",
          message: `Super Admin marked ${job.delivery_code} as returned to you: ${cleanNote}`,
        });
        ctx.queueOrderSync(effects, job, "RETURNED");
      } else if (code === "RESET_PIN_ATTEMPTS") {
        job = await ctx.updateJob(client, jobId, { pickup_pin_attempts: 0, delivery_pin_attempts: 0, return_pin_attempts: 0 });
        if (job.rider_id) {
          await ctx.notifyRider(client, job.rider_id, { type: "SUPPORT", title: "PIN attempts reset", body: `You can enter the PIN for ${job.delivery_code} again.`, deliveryId: jobId });
        }
        ctx.queueSellerNotice(effects, job, {
          type: "switch-rider-pin-reset",
          title: "Delivery PIN attempts reset",
          message: `Super Admin reset PIN attempts for ${job.delivery_code}: ${cleanNote}`,
        });
      } else if (code === "ROTATE_PINS") {
        if (TERMINAL_STATUSES.has(job.status)) throw srError(409, "DELIVERY_FINISHED", "This delivery is already finished.");
        job = await ctx.updateJob(client, jobId, { pin_nonce: newPinNonce(), pickup_pin_attempts: 0, delivery_pin_attempts: 0, return_pin_attempts: 0 });
        await ctx.notifyBuyer(client, job, { type: "PIN_CHANGED", title: "Delivery PIN changed", body: "Your delivery PIN was changed by Switch support. Use the new PIN shown in tracking." });
        ctx.queueSellerNotice(effects, job, {
          type: "switch-rider-pin-rotated",
          title: "Pickup/return PIN changed",
          message: `Super Admin issued new PINs for ${job.delivery_code}. Use the new PIN on your order page: ${cleanNote}`,
          priority: "high",
        });
      }
      await ctx.audit(client, { actor, action: `INTERVENTION_${code}`, deliveryId: jobId, riderId: job.rider_id, metadata: { note: cleanNote } });
      return { job };
    });
  }

  return {
    startPickup,
    arriveAtPickup,
    confirmPickup,
    startDelivery,
    arriveAtDropoff,
    collectCod,
    uploadProof,
    completeDelivery,
    failDelivery,
    startReturn,
    confirmReturn,
    cancelJob,
    cancelJobForOrderGroup,
    canCancelOrderGroup,
    adminIntervene,
  };
}

module.exports = { createWorkflow };
