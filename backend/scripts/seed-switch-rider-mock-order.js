"use strict";

const fs = require("fs");
const path = require("path");
const { estimateRoadDistanceKm, haversineKm, roundTo } = require("../services/switchRider/geo");
const { calculateDeliveryPricing } = require("../services/switchRider/pricing");
const { normalizeSettings } = require("../services/switchRider/settings");

const MOCK_ORDER_ID = "og_mock_switch_rider_delivery";
const MOCK_ITEM_ID = "oi_mock_switch_rider_delivery";
const MOCK_DELIVERY_ID = "dlv_mock_switch_rider_delivery";
const MOCK_OFFER_ID = "ofr_mock_switch_rider_delivery";
const MOCK_NOTIFICATION_ID = "ntf_mock_switch_rider_delivery";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const text = line.trim();
    if (!text || text.startsWith("#")) continue;
    const separator = text.indexOf("=");
    if (separator <= 0) continue;
    const key = text.slice(0, separator).trim();
    if (!key || process.env[key] != null) continue;
    let value = text.slice(separator + 1).trim();
    if (
      value.length >= 2
      && ((value.startsWith('"') && value.endsWith('"'))
        || (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function option(name) {
  const prefix = `--${name}=`;
  const entry = process.argv.slice(2).find((value) => value.startsWith(prefix));
  return entry ? entry.slice(prefix.length).trim() : "";
}

function displayRider(rider) {
  return {
    id: rider.id,
    riderCode: rider.rider_code,
    name: `${rider.first_name} ${rider.last_name}`.trim(),
    email: rider.email || "",
    status: rider.status,
    availability: rider.availability_status,
    vehicle: rider.vehicle_type,
    lastLoginAt: rider.last_login_at,
  };
}

async function listRiders(query) {
  const result = await query(
    `SELECT id, rider_code, first_name, last_name, email, status,
            availability_status, vehicle_type, last_login_at, created_at
       FROM riders
      ORDER BY last_login_at DESC NULLS LAST, created_at DESC
      LIMIT 30`,
  );
  return result.rows;
}

async function selectRider(query) {
  const riderId = option("rider-id");
  const riderEmail = option("rider-email").toLowerCase();
  if (riderId) {
    return (
      await query(
        `SELECT * FROM riders WHERE id = $1 LIMIT 1`,
        [riderId],
      )
    ).rows[0] || null;
  }
  if (riderEmail) {
    return (
      await query(
        `SELECT * FROM riders WHERE lower(email) = $1 LIMIT 1`,
        [riderEmail],
      )
    ).rows[0] || null;
  }
  return (
    await query(
      `SELECT * FROM riders
        ORDER BY last_login_at DESC NULLS LAST, created_at DESC
        LIMIT 1`,
    )
  ).rows[0] || null;
}

async function removePreviousMock(client) {
  await client.query(`DELETE FROM rider_notifications WHERE delivery_id = $1 OR id = $2`, [
    MOCK_DELIVERY_ID,
    MOCK_NOTIFICATION_ID,
  ]);
  await client.query(`DELETE FROM rider_wallet_transactions WHERE delivery_id = $1`, [MOCK_DELIVERY_ID]);
  await client.query(`DELETE FROM cod_transactions WHERE delivery_id = $1`, [MOCK_DELIVERY_ID]);
  await client.query(`DELETE FROM rider_earnings WHERE delivery_id = $1`, [MOCK_DELIVERY_ID]);
  await client.query(`DELETE FROM rider_ratings WHERE delivery_id = $1`, [MOCK_DELIVERY_ID]);
  await client.query(`DELETE FROM delivery_incidents WHERE delivery_id = $1`, [MOCK_DELIVERY_ID]);
  await client.query(`DELETE FROM delivery_jobs WHERE id = $1 OR order_group_id = $2`, [
    MOCK_DELIVERY_ID,
    MOCK_ORDER_ID,
  ]);
  await client.query(`DELETE FROM orders WHERE id = $1 OR order_group_id = $1`, [MOCK_ORDER_ID]);
}

async function seedMockOrder(query, withTransaction) {
  const rider = await selectRider(query);
  if (!rider) {
    throw new Error(
      "No rider account exists yet. Register in Switch Rider first, then rerun this seed.",
    );
  }

  const pendingOffer = (
    await query(
      `SELECT o.id, j.delivery_code
         FROM delivery_offers o
         JOIN delivery_jobs j ON j.id = o.delivery_id
        WHERE o.rider_id = $1 AND o.status = 'PENDING' AND o.delivery_id <> $2
        LIMIT 1`,
      [rider.id, MOCK_DELIVERY_ID],
    )
  ).rows[0];
  if (pendingOffer) {
    throw new Error(
      `Rider already has pending offer ${pendingOffer.delivery_code}. Respond to it before creating the mock offer.`,
    );
  }

  const activeJob = (
    await query(
      `SELECT delivery_code, status
         FROM delivery_jobs
        WHERE rider_id = $1
          AND status = ANY($2::text[])
          AND id <> $3
        LIMIT 1`,
      [
        rider.id,
        [
          "RIDER_ASSIGNED",
          "RIDER_TO_PICKUP",
          "ARRIVED_AT_PICKUP",
          "PICKED_UP",
          "IN_TRANSIT",
          "ARRIVED_AT_DROPOFF",
          "FAILED_DELIVERY",
          "RETURN_REQUIRED",
          "RETURNING_TO_SELLER",
        ],
        MOCK_DELIVERY_ID,
      ],
    )
  ).rows[0];
  if (activeJob) {
    throw new Error(
      `Rider already has active delivery ${activeJob.delivery_code} (${activeJob.status}). Finish it before creating the mock offer.`,
    );
  }

  const now = new Date();
  const epochMs = now.getTime();
  const mockLocationAt = new Date(epochMs - 2 * 60 * 60 * 1000);
  const expiresAt = new Date(epochMs + 24 * 60 * 60 * 1000);
  const pickup = {
    name: "Switch Demo Store",
    phone: "+639171234567",
    address: "Escolta Street, Binondo, Manila",
    area: "Binondo, Manila",
    lat: 14.5995,
    lng: 120.9842,
  };
  const riderStart = {
    area: "Ermita, Manila",
    lat: 14.5829,
    lng: 120.9827,
  };
  const dropoff = {
    name: "Demo Customer",
    phone: "+639189876543",
    address: "Mendiola Street, San Miguel, Manila",
    area: "San Miguel, Manila",
    lat: 14.5998,
    lng: 121.0008,
  };
  const sellerAdminId = "admin_mock_switch_rider";
  const buyerAccountId = "acct_mock_switch_rider_buyer";
  const companyId = `comp_${sellerAdminId}`;
  const pricingSettings = normalizeSettings({});
  const deliveryPricing = calculateDeliveryPricing(pricingSettings, {
    distanceKm: estimateRoadDistanceKm(pickup, dropoff, pricingSettings.roadFactor),
    vehicleType: rider.vehicle_type,
  });
  const riderPickupDistanceKm = roundTo(haversineKm(riderStart, pickup), 2);
  const orderExtra = {
    mock: true,
    clientName: dropoff.name,
    clientContactNumber: dropoff.phone,
    clientAddress: dropoff.address,
    clientLatitude: dropoff.lat,
    clientLongitude: dropoff.lng,
    deliveryPartnerName: "Switch Rider",
    deliveryProvider: "Switch Rider",
    courierProvider: "switch_rider",
    paymentMethod: "Cashless payment",
    shippingFeeAmount: deliveryPricing.deliveryFee,
    trackingNumber: "",
  };
  const itemExtra = {
    mock: true,
    productName: "Switch Rider Test Package",
    variantName: "Demo order",
    imageUrl: "",
    deliveryPartnerName: "Switch Rider",
    clientName: dropoff.name,
    clientAddress: dropoff.address,
  };

  const result = await withTransaction(async (client) => {
    await removePreviousMock(client);

    // Give the mock seller the same registered store-location shape used by
    // real companies. New Switch Rider jobs resolve this as their pickup point.
    await client.query(
      `INSERT INTO companies (
         id, type, status, name, public_name, country_code, mobile_number,
         business_type, verification_status, profile_data, created_at, updated_at
       ) VALUES ($1, 'seller', 'active', $2, $2, '+63', '9171234567',
                 'Retail', 'verified', $3::jsonb, $4, $4)
       ON CONFLICT (id) DO UPDATE SET
         status = 'active', name = EXCLUDED.name, public_name = EXCLUDED.public_name,
         country_code = EXCLUDED.country_code, mobile_number = EXCLUDED.mobile_number,
         profile_data = COALESCE(companies.profile_data, '{}'::jsonb) || EXCLUDED.profile_data,
         updated_at = EXCLUDED.updated_at`,
      [
        companyId,
        pickup.name,
        JSON.stringify({
          mock: true,
          storeLocation: {
            address: pickup.address,
            area: pickup.area,
            lat: pickup.lat,
            lng: pickup.lng,
            updatedAt: now.toISOString(),
          },
        }),
        now,
      ],
    );

    const updatedRider = (
      await client.query(
        `UPDATE riders
            SET status = 'ACTIVE', status_reason = '', availability_status = 'ONLINE',
                last_latitude = $2, last_longitude = $3, last_location_accuracy = 5,
                last_location_at = $4, last_online_at = $4, updated_at = $4
          WHERE id = $1
          RETURNING *`,
        [rider.id, riderStart.lat, riderStart.lng, mockLocationAt],
      )
    ).rows[0];

    await client.query(
      `INSERT INTO orders (
         id, order_group_id, admin_id, account_id, created_at_epoch_ms,
         stage, extra_data, created_at, updated_at
       ) VALUES ($1, $1, $2, $3, $4, 'toShip', $5::jsonb, $6, $6)`,
      [MOCK_ORDER_ID, sellerAdminId, buyerAccountId, epochMs, JSON.stringify(orderExtra), now],
    );
    await client.query(
      `INSERT INTO order_items (
         id, order_group_id, admin_id, account_id, product_id, variant_id,
         quantity, unit_price, stage, created_at_epoch_ms, extra_data, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, '', 1, 349.00, 'toShip', $6, $7::jsonb, $8, $8)`,
      [
        MOCK_ITEM_ID,
        MOCK_ORDER_ID,
        sellerAdminId,
        buyerAccountId,
        "prd_mock_switch_rider_package",
        epochMs,
        JSON.stringify(itemExtra),
        now,
      ],
    );

    const job = (
      await client.query(
        `INSERT INTO delivery_jobs (
           id, delivery_code, order_group_id, order_created_at_epoch_ms,
           delivery_provider, seller_admin_id, buyer_account_id, status,
           dispatch_mode, dispatch_attempts, current_offer_id, vehicle_type_required,
           pickup_name, pickup_contact_phone, pickup_address, pickup_area,
           pickup_latitude, pickup_longitude,
           dropoff_name, dropoff_contact_phone, dropoff_address, dropoff_area,
           dropoff_latitude, dropoff_longitude,
           package_count, package_notes, distance_km, estimated_minutes,
           quoted_delivery_fee, customer_delivery_fee, platform_subsidy,
           rider_earning, platform_delivery_margin, pricing_snapshot,
           payment_method, cod_amount, pin_nonce,
           created_at, ready_at, offered_at, updated_at
         ) VALUES (
           $1, 'SRD-' || nextval('delivery_code_seq'), $2, $3,
           'SWITCH_RIDER', $4, $5, 'OFFERED',
           'AUTO', 1, $6, $7,
           $8, $9, $10, $11, $12, $13,
           $14, $15, $16, $17, $18, $19,
           1, '1 item · Switch Rider test package', $20, $21,
           $22, $22, 0.00, $23, ($22::numeric - $23::numeric),
           $24::jsonb, 'PREPAID', 0.00, $25,
           $26, $26, $26, $26
         ) RETURNING *`,
        [
          MOCK_DELIVERY_ID,
          MOCK_ORDER_ID,
          epochMs,
          sellerAdminId,
          buyerAccountId,
          MOCK_OFFER_ID,
          updatedRider.vehicle_type,
          pickup.name,
          pickup.phone,
          pickup.address,
          pickup.area,
          pickup.lat,
          pickup.lng,
          dropoff.name,
          dropoff.phone,
          dropoff.address,
          dropoff.area,
          dropoff.lat,
          dropoff.lng,
          deliveryPricing.distanceKm,
          deliveryPricing.estimatedMinutes,
          deliveryPricing.deliveryFee,
          deliveryPricing.riderEarning,
          JSON.stringify({ ...deliveryPricing.snapshot, source: "mock_seed" }),
          `mock-${epochMs}`,
          now,
        ],
      )
    ).rows[0];

    await client.query(
       `INSERT INTO delivery_offers (
          id, delivery_id, rider_id, status, distance_to_pickup_km, offered_at, expires_at
        ) VALUES ($1, $2, $3, 'PENDING', $4, $5, $6)`,
      [MOCK_OFFER_ID, MOCK_DELIVERY_ID, rider.id, riderPickupDistanceKm, now, expiresAt],
    );
    await client.query(
      `INSERT INTO delivery_status_history (
         delivery_id, from_status, to_status, actor_type, actor_id, note, metadata, created_at
       ) VALUES
         ($1, '', 'PREPARING', 'buyer', $2, 'Mock order placed with Switch Rider', $3::jsonb, $4),
         ($1, 'PREPARING', 'WAITING_FOR_RIDER', 'system', '', 'Finding a Switch Rider', $3::jsonb, $4),
         ($1, 'WAITING_FOR_RIDER', 'OFFERED', 'system', '', 'Mock order offered to rider', $3::jsonb, $4)`,
      [MOCK_DELIVERY_ID, buyerAccountId, JSON.stringify({ mock: true }), now],
    );
    await client.query(
      `INSERT INTO rider_notifications (
         id, rider_id, type, title, body, delivery_id, created_at
       ) VALUES ($1, $2, 'NEW_OFFER', 'New delivery offer', $3, $4, $5)`,
      [
        MOCK_NOTIFICATION_ID,
        rider.id,
        `${pickup.area} → ${dropoff.area} · ₱${deliveryPricing.riderEarning.toFixed(2)}`,
        MOCK_DELIVERY_ID,
        now,
      ],
    );
    await client.query(
      `INSERT INTO switch_rider_audit_log (
         actor_type, actor_id, action, delivery_id, rider_id, metadata, created_at
       ) VALUES ('system', 'mock-seed', 'MOCK_DELIVERY_OFFERED', $1, $2, $3::jsonb, $4)`,
      [MOCK_DELIVERY_ID, rider.id, JSON.stringify({ orderGroupId: MOCK_ORDER_ID }), now],
    );

    return { rider: updatedRider, job };
  });

  return {
    rider: displayRider(result.rider),
    orderGroupId: MOCK_ORDER_ID,
    deliveryId: result.job.id,
    deliveryCode: result.job.delivery_code,
    status: result.job.status,
    pickup: pickup.area,
    dropoff: dropoff.area,
    riderStart: riderStart.area,
    distanceKm: deliveryPricing.distanceKm,
    deliveryFee: deliveryPricing.deliveryFee,
    riderEarning: Number(result.job.rider_earning),
    offerExpiresAt: expiresAt.toISOString(),
  };
}

async function showMockPins(query) {
  const job = (
    await query(
      `SELECT id, delivery_code, pin_nonce, status
         FROM delivery_jobs
        WHERE id = $1
        LIMIT 1`,
      [MOCK_DELIVERY_ID],
    )
  ).rows[0];
  if (!job) throw new Error("The Switch Rider mock delivery does not exist. Run the seed first.");

  const { derivePin, resolveSwitchRiderSecret } = require("../services/switchRider/tokens");
  const secret = resolveSwitchRiderSecret(process.env);
  return {
    deliveryCode: job.delivery_code,
    status: job.status,
    pickupPin: derivePin(secret, {
      deliveryId: job.id,
      pinNonce: job.pin_nonce,
      purpose: "pickup",
    }),
    deliveryPin: derivePin(secret, {
      deliveryId: job.id,
      pinNonce: job.pin_nonce,
      purpose: "delivery",
    }),
    returnPin: derivePin(secret, {
      deliveryId: job.id,
      pinNonce: job.pin_nonce,
      purpose: "return",
    }),
  };
}

async function main() {
  loadEnvFile(path.join(__dirname, "..", ".env"));
  loadEnvFile(path.join(__dirname, "..", "..", ".env"));
  const { query, withTransaction, closePool } = require("../db/pool");
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not configured.");
    }
    if (process.argv.includes("--list")) {
      const riders = await listRiders(query);
      console.log(JSON.stringify(riders.map(displayRider), null, 2));
      return;
    }
    if (process.argv.includes("--show-pins")) {
      console.log(JSON.stringify(await showMockPins(query), null, 2));
      return;
    }
    const seeded = await seedMockOrder(query, withTransaction);
    console.log("Switch Rider mock order is ready:");
    console.log(JSON.stringify(seeded, null, 2));
  } finally {
    await closePool();
  }
}

main().catch((error) => {
  console.error(`Unable to seed Switch Rider mock order: ${error.message}`);
  process.exitCode = 1;
});
