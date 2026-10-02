"use strict";

const { srError } = require("./core");
const { roundTo } = require("./geo");
const { iso, num } = require("./serializers");
const { newId } = require("./tokens");

const PAYOUT_METHODS = new Set(["GCASH", "BANK_TRANSFER", "MANUAL"]);
const REMITTANCE_METHODS = new Set(["GCASH", "BANK_TRANSFER", "CASH_AT_HUB"]);
const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function cleanText(value, max = 200) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function parseAmount(value) {
  const amount = roundTo(Number(value), 2);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) {
    throw srError(422, "INVALID_AMOUNT", "Enter a valid amount.");
  }
  return amount;
}

/** Period starts in Asia/Manila (UTC+8, no DST). */
function manilaPeriodStarts(nowMs) {
  const local = nowMs + MANILA_OFFSET_MS;
  const dayStartLocal = Math.floor(local / DAY_MS) * DAY_MS;
  const weekday = (new Date(dayStartLocal).getUTCDay() + 6) % 7; // Monday = 0
  const weekStartLocal = dayStartLocal - weekday * DAY_MS;
  const d = new Date(dayStartLocal);
  const monthStartLocal = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
  return {
    today: new Date(dayStartLocal - MANILA_OFFSET_MS),
    week: new Date(weekStartLocal - MANILA_OFFSET_MS),
    month: new Date(monthStartLocal - MANILA_OFFSET_MS),
  };
}

function createMoney(ctx) {
  const { db } = ctx;

  /**
   * Books the rider's earning for a finished job (idempotent: one per delivery).
   * DELIVERY pays the full rider share; FAILED_ATTEMPT pays a share of the base
   * fee for the wasted trip once the parcel is safely back with the seller.
   */
  async function awardEarning(client, job, earningType) {
    if (!job.rider_id) return null;
    const settings = await ctx.getSettings();
    const snapshot = job.pricing_snapshot || {};
    let baseFee = num(snapshot.riderBaseFee);
    let distanceFee = num(snapshot.riderDistanceFee);
    if (baseFee + distanceFee <= 0) {
      baseFee = num(job.rider_earning);
      distanceFee = 0;
    }
    if (earningType === "FAILED_ATTEMPT") {
      baseFee = roundTo((baseFee * settings.failedAttemptRiderPercent) / 100, 2);
      distanceFee = 0;
    }
    const total = roundTo(baseFee + distanceFee, 2);
    if (total <= 0) return null;
    const availableAt = new Date(ctx.now() + settings.earningsHoldHours * 60 * 60 * 1000);
    const earning = (
      await client.query(
        `INSERT INTO rider_earnings (id, rider_id, delivery_id, base_fee, distance_fee, total, earning_type, status, available_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING', $8, $9)
         ON CONFLICT (delivery_id) DO NOTHING RETURNING *`,
        [newId("ern"), job.rider_id, job.id, baseFee, distanceFee, total, earningType, availableAt, ctx.nowDate()],
      )
    ).rows[0];
    if (!earning) return null;
    await client.query(
      `INSERT INTO rider_wallet_transactions (rider_id, bucket, amount, txn_type, delivery_id, earning_id, note, created_at)
       VALUES ($1, 'PENDING', $2, 'EARNING', $3, $4, $5, $6)`,
      [job.rider_id, total, job.id, earning.id, earningType === "DELIVERY" ? "Delivery earning" : "Failed attempt compensation", ctx.nowDate()],
    );
    await ctx.notifyRider(client, job.rider_id, {
      type: "EARNINGS",
      title: `You earned ₱${total.toFixed(2)}`,
      body: `${job.delivery_code} · available after ${settings.earningsHoldHours}h review period.`,
      deliveryId: job.id,
    });
    return earning;
  }

  async function releaseDueEarnings() {
    return ctx.runInTx(async (client) => {
      const due = (
        await client.query(
          `SELECT * FROM rider_earnings WHERE status = 'PENDING' AND available_at <= $1
           ORDER BY available_at LIMIT 200 FOR UPDATE SKIP LOCKED`,
          [ctx.nowDate()],
        )
      ).rows;
      for (const earning of due) {
        await client.query(`UPDATE rider_earnings SET status = 'AVAILABLE', released_at = $2 WHERE id = $1`, [earning.id, ctx.nowDate()]);
        await client.query(
          `INSERT INTO rider_wallet_transactions (rider_id, bucket, amount, txn_type, delivery_id, earning_id, note, created_at)
           VALUES ($1, 'PENDING', $2, 'RELEASE', $3, $4, 'Released after review period', $6),
                  ($1, 'AVAILABLE', $5, 'RELEASE', $3, $4, 'Released after review period', $6)`,
          [earning.rider_id, -num(earning.total), earning.delivery_id, earning.id, num(earning.total), ctx.nowDate()],
        );
      }
      return due.length;
    });
  }

  async function getBalances(client, riderId) {
    const rows = (
      await client.query(
        `SELECT bucket, COALESCE(SUM(amount), 0) AS total FROM rider_wallet_transactions WHERE rider_id = $1 GROUP BY bucket`,
        [riderId],
      )
    ).rows;
    const balances = { pending: 0, available: 0, paid: 0 };
    for (const row of rows) balances[row.bucket.toLowerCase()] = roundTo(num(row.total), 2);
    return balances;
  }

  async function getEarningsSummary(riderId) {
    const periods = manilaPeriodStarts(ctx.now());
    const [totals, balances, recent, payouts] = await Promise.all([
      db.query(
        `SELECT
           COALESCE(SUM(total) FILTER (WHERE created_at >= $2), 0) AS today,
           COALESCE(SUM(total) FILTER (WHERE created_at >= $3), 0) AS week,
           COALESCE(SUM(total) FILTER (WHERE created_at >= $4), 0) AS month,
           COUNT(*) FILTER (WHERE created_at >= $2 AND earning_type = 'DELIVERY')::int AS today_count
         FROM rider_earnings WHERE rider_id = $1 AND status <> 'VOID'`,
        [riderId, periods.today, periods.week, periods.month],
      ),
      getBalances(db, riderId),
      db.query(
        `SELECT e.*, j.delivery_code, j.pickup_area, j.dropoff_area FROM rider_earnings e
         JOIN delivery_jobs j ON j.id = e.delivery_id
         WHERE e.rider_id = $1 ORDER BY e.created_at DESC LIMIT 50`,
        [riderId],
      ),
      db.query(`SELECT * FROM rider_payouts WHERE rider_id = $1 ORDER BY created_at DESC LIMIT 20`, [riderId]),
    ]);
    const row = totals.rows[0];
    return {
      today: roundTo(num(row.today), 2),
      week: roundTo(num(row.week), 2),
      month: roundTo(num(row.month), 2),
      todayDeliveries: row.today_count,
      balances,
      earnings: recent.rows.map((earning) => ({
        id: earning.id,
        deliveryId: earning.delivery_id,
        deliveryCode: earning.delivery_code,
        route: `${earning.pickup_area || "Pickup"} → ${earning.dropoff_area || "Drop-off"}`,
        type: earning.earning_type,
        baseFee: num(earning.base_fee),
        distanceFee: num(earning.distance_fee),
        bonus: num(earning.bonus),
        tip: num(earning.tip),
        adjustment: num(earning.adjustment),
        total: num(earning.total),
        status: earning.status,
        availableAt: iso(earning.available_at),
        createdAt: iso(earning.created_at),
      })),
      payouts: payouts.rows.map(serializePayout),
    };
  }

  function serializePayout(row) {
    return {
      id: row.id,
      amount: num(row.amount),
      method: row.method,
      reference: row.reference,
      note: row.note,
      createdAt: iso(row.created_at),
    };
  }

  async function createPayout(riderId, input = {}, actor) {
    const amount = parseAmount(input.amount);
    const method = String(input.method ?? "").toUpperCase();
    if (!PAYOUT_METHODS.has(method)) throw srError(422, "INVALID_METHOD", "Choose GCash, bank transfer, or manual.");
    const reference = cleanText(input.reference, 80);
    if (method !== "MANUAL" && !reference) throw srError(422, "REFERENCE_REQUIRED", "Enter the transfer reference number.");
    return ctx.runInTx(async (client) => {
      const rider = await ctx.lockRider(client, riderId);
      if (!rider) throw srError(404, "RIDER_NOT_FOUND", "Rider not found.");
      const balances = await getBalances(client, riderId);
      if (amount > balances.available + 0.001) {
        throw srError(409, "INSUFFICIENT_AVAILABLE_BALANCE", `Only ₱${balances.available.toFixed(2)} is available for payout.`);
      }
      const payout = (
        await client.query(
          `INSERT INTO rider_payouts (id, rider_id, amount, method, reference, note, created_by, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
          [newId("pay"), riderId, amount, method, reference, cleanText(input.note, 300), String(actor?.id || "super-admin"), ctx.nowDate()],
        )
      ).rows[0];
      await client.query(
        `INSERT INTO rider_wallet_transactions (rider_id, bucket, amount, txn_type, payout_id, note, created_by, created_at)
         VALUES ($1, 'AVAILABLE', $2, 'PAYOUT', $3, $4, $5, $6), ($1, 'PAID', $7, 'PAYOUT', $3, $4, $5, $6)`,
        [riderId, -amount, payout.id, `${method} payout`, String(actor?.id || ""), ctx.nowDate(), amount],
      );
      // Mark whole earnings as PAID oldest-first while they fit inside the payout.
      const available = (
        await client.query(`SELECT id, total FROM rider_earnings WHERE rider_id = $1 AND status = 'AVAILABLE' ORDER BY available_at, created_at`, [riderId])
      ).rows;
      let remaining = amount;
      for (const earning of available) {
        const total = num(earning.total);
        if (total > remaining + 0.001) break;
        remaining = roundTo(remaining - total, 2);
        await client.query(`UPDATE rider_earnings SET status = 'PAID', paid_at = $2, payout_id = $3 WHERE id = $1`, [earning.id, ctx.nowDate(), payout.id]);
      }
      await ctx.audit(client, { actor, action: "PAYOUT_CREATED", riderId, metadata: { payoutId: payout.id, amount, method } });
      await ctx.notifyRider(client, riderId, {
        type: "PAYOUT",
        title: `Payout sent: ₱${amount.toFixed(2)}`,
        body: `${method.replace("_", " ")}${reference ? ` · Ref ${reference}` : ""}`,
      });
      return serializePayout(payout);
    });
  }

  async function adjustEarnings(riderId, input = {}, actor) {
    const amount = roundTo(Number(input.amount), 2);
    if (!Number.isFinite(amount) || amount === 0 || Math.abs(amount) > 100000) {
      throw srError(422, "INVALID_AMOUNT", "Enter a non-zero adjustment amount.");
    }
    const note = cleanText(input.note, 300);
    if (!note) throw srError(422, "REASON_REQUIRED", "Explain the adjustment.");
    return ctx.runInTx(async (client) => {
      const rider = await ctx.lockRider(client, riderId);
      if (!rider) throw srError(404, "RIDER_NOT_FOUND", "Rider not found.");
      await client.query(
        `INSERT INTO rider_wallet_transactions (rider_id, bucket, amount, txn_type, note, created_by, created_at)
         VALUES ($1, 'AVAILABLE', $2, 'ADJUSTMENT', $3, $4, $5)`,
        [riderId, amount, note, String(actor?.id || ""), ctx.nowDate()],
      );
      await ctx.audit(client, { actor, action: "EARNINGS_ADJUSTED", riderId, metadata: { amount, note } });
      await ctx.notifyRider(client, riderId, {
        type: "EARNINGS",
        title: `Earnings adjustment: ${amount > 0 ? "+" : "−"}₱${Math.abs(amount).toFixed(2)}`,
        body: note,
      });
      return getBalances(client, riderId);
    });
  }

  // ---------------------------------------------------------------- COD cash

  async function getCashWallet(riderId, client = db) {
    const cod = await client.query(`SELECT COALESCE(SUM(amount), 0) AS collected FROM cod_transactions WHERE rider_id = $1`, [riderId]);
    const remittances = await client.query(
      `SELECT status, COALESCE(SUM(amount), 0) AS total FROM rider_remittances WHERE rider_id = $1 GROUP BY status`,
      [riderId],
    );
    const pending = await client.query(
      `SELECT c.*, j.delivery_code FROM cod_transactions c JOIN delivery_jobs j ON j.id = c.delivery_id
       WHERE c.rider_id = $1 ORDER BY c.collected_at DESC LIMIT 50`,
      [riderId],
    );
    const collected = roundTo(num(cod.rows[0].collected), 2);
    let remitted = 0;
    let verified = 0;
    for (const row of remittances.rows) {
      if (row.status === "REMITTED") remitted = roundTo(num(row.total), 2);
      if (row.status === "VERIFIED") verified = roundTo(num(row.total), 2);
    }
    const history = (
      await client.query(`SELECT * FROM rider_remittances WHERE rider_id = $1 ORDER BY created_at DESC LIMIT 20`, [riderId])
    ).rows;
    return {
      collected,
      remittedAwaitingVerification: remitted,
      verified,
      outstanding: roundTo(Math.max(0, collected - remitted - verified), 2),
      transactions: pending.rows.map((row) => ({
        id: row.id,
        deliveryId: row.delivery_id,
        deliveryCode: row.delivery_code,
        amount: num(row.amount),
        status: row.status,
        collectedAt: iso(row.collected_at),
      })),
      remittances: history.map(serializeRemittance),
    };
  }

  function serializeRemittance(row) {
    return {
      id: row.id,
      riderId: row.rider_id,
      amount: num(row.amount),
      method: row.method,
      reference: row.reference,
      status: row.status,
      note: row.note,
      verifiedAt: iso(row.verified_at),
      createdAt: iso(row.created_at),
    };
  }

  async function submitRemittance(riderId, input = {}) {
    const amount = parseAmount(input.amount);
    const method = String(input.method ?? "").toUpperCase();
    if (!REMITTANCE_METHODS.has(method)) throw srError(422, "INVALID_METHOD", "Choose GCash, bank transfer, or cash at hub.");
    const reference = cleanText(input.reference, 80);
    if (method !== "CASH_AT_HUB" && !reference) throw srError(422, "REFERENCE_REQUIRED", "Enter the transfer reference number.");
    return ctx.runInTx(async (client, effects) => {
      const rider = await ctx.lockRider(client, riderId);
      if (!rider) throw srError(404, "RIDER_NOT_FOUND", "Rider not found.");
      const wallet = await getCashWallet(riderId, client);
      if (amount > wallet.outstanding + 0.001) {
        throw srError(409, "REMITTANCE_EXCEEDS_OUTSTANDING", `You only have ₱${wallet.outstanding.toFixed(2)} outstanding.`);
      }
      const remittance = (
        await client.query(
          `INSERT INTO rider_remittances (id, rider_id, amount, method, reference, status, submitted_by, note, created_at)
           VALUES ($1, $2, $3, $4, $5, 'REMITTED', $2, $6, $7) RETURNING *`,
          [newId("rem"), riderId, amount, method, reference, cleanText(input.note, 300), ctx.nowDate()],
        )
      ).rows[0];
      // Allocate fully covered COD collections oldest-first.
      const open = (
        await client.query(
          `SELECT id, amount FROM cod_transactions WHERE rider_id = $1 AND status = 'PENDING_REMITTANCE' ORDER BY collected_at`,
          [riderId],
        )
      ).rows;
      let remaining = amount;
      for (const cod of open) {
        const value = num(cod.amount);
        if (value > remaining + 0.001) break;
        remaining = roundTo(remaining - value, 2);
        await client.query(`UPDATE cod_transactions SET status = 'REMITTED', remittance_id = $2 WHERE id = $1`, [cod.id, remittance.id]);
      }
      await ctx.audit(client, { actor: { type: "rider", id: riderId }, action: "REMITTANCE_SUBMITTED", riderId, metadata: { remittanceId: remittance.id, amount, method } });
      ctx.queueSuperAdminNotice(effects, {
        type: "switch-rider-remittance-submitted",
        title: "COD remittance to verify",
        message: `${rider.first_name} ${rider.last_name} (${rider.rider_code}) remitted ₱${amount.toFixed(2)} via ${method.replace(/_/g, " ")}${reference ? ` · Ref ${reference}` : ""}.`,
        riderId,
      });
      return serializeRemittance(remittance);
    });
  }

  async function reviewRemittance(remittanceId, { decision, note = "" } = {}, actor) {
    const status = String(decision ?? "").toUpperCase();
    if (!["VERIFIED", "REJECTED"].includes(status)) throw srError(422, "INVALID_DECISION", "Choose verify or reject.");
    const cleanNote = cleanText(note, 300);
    if (status === "REJECTED" && !cleanNote) throw srError(422, "REASON_REQUIRED", "Explain why the remittance was rejected.");
    return ctx.runInTx(async (client) => {
      const remittance = (await client.query("SELECT * FROM rider_remittances WHERE id = $1 FOR UPDATE", [remittanceId])).rows[0];
      if (!remittance) throw srError(404, "REMITTANCE_NOT_FOUND", "Remittance not found.");
      if (remittance.status !== "REMITTED") throw srError(409, "ALREADY_REVIEWED", "This remittance was already reviewed.");
      const updated = (
        await client.query(
          `UPDATE rider_remittances SET status = $2, verified_by = $3, verified_at = $4, note = CASE WHEN $5 = '' THEN note ELSE $5 END
           WHERE id = $1 RETURNING *`,
          [remittanceId, status, String(actor?.id || ""), ctx.nowDate(), cleanNote],
        )
      ).rows[0];
      if (status === "VERIFIED") {
        await client.query(`UPDATE cod_transactions SET status = 'VERIFIED' WHERE remittance_id = $1`, [remittanceId]);
      } else {
        await client.query(
          `UPDATE cod_transactions SET status = 'PENDING_REMITTANCE', remittance_id = NULL WHERE remittance_id = $1`,
          [remittanceId],
        );
      }
      await ctx.audit(client, { actor, action: `REMITTANCE_${status}`, riderId: remittance.rider_id, metadata: { remittanceId, note: cleanNote } });
      await ctx.notifyRider(client, remittance.rider_id, {
        type: "COD_REMITTANCE",
        title: status === "VERIFIED" ? `Remittance verified: ₱${num(remittance.amount).toFixed(2)}` : "Remittance rejected",
        body: status === "VERIFIED" ? "Thank you. Your cash balance was updated." : cleanNote,
      });
      return serializeRemittance(updated);
    });
  }

  async function listRemittancesForAdmin({ status = "REMITTED", limit = 100 } = {}) {
    const normalized = String(status || "").toUpperCase();
    const values = [];
    let where = "";
    if (["REMITTED", "VERIFIED", "REJECTED"].includes(normalized)) {
      values.push(normalized);
      where = "WHERE m.status = $1";
    }
    const rows = (
      await db.query(
        `SELECT m.*, r.first_name, r.last_name, r.rider_code FROM rider_remittances m
         JOIN riders r ON r.id = m.rider_id ${where}
         ORDER BY m.created_at DESC LIMIT ${Math.min(500, Math.max(1, Number(limit) || 100))}`,
        values,
      )
    ).rows;
    const outstanding = (
      await db.query(
        `SELECT COALESCE((SELECT SUM(amount) FROM cod_transactions), 0)
              - COALESCE((SELECT SUM(amount) FROM rider_remittances WHERE status IN ('REMITTED','VERIFIED')), 0) AS outstanding`,
      )
    ).rows[0];
    return {
      remittances: rows.map((row) => ({
        ...serializeRemittance(row),
        riderName: `${row.first_name} ${row.last_name}`.trim(),
        riderCode: row.rider_code,
      })),
      platformOutstandingCod: roundTo(num(outstanding.outstanding), 2),
    };
  }

  return {
    awardEarning,
    releaseDueEarnings,
    getBalances,
    getEarningsSummary,
    createPayout,
    adjustEarnings,
    getCashWallet,
    submitRemittance,
    reviewRemittance,
    listRemittancesForAdmin,
    manilaPeriodStarts,
  };
}

module.exports = { createMoney, manilaPeriodStarts };
