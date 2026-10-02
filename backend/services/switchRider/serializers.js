"use strict";

const {
  CUSTOMER_CONTACT_VISIBLE_STATUSES,
  DELIVERY_STATUS: S,
  PRE_ASSIGNMENT_STATUSES,
  TERMINAL_STATUSES,
} = require("./constants");

function num(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function iso(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

// node-postgres parses DATE columns as local midnight, so read local parts (not UTC).
function dateOnly(value) {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

/**
 * Coarse, privacy-safe area label from a free-text address: drops the street
 * line and postal code and keeps the last two locality segments.
 */
function deriveArea(address) {
  const parts = String(address ?? "")
    .split(",")
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .filter((part) => !/^\d{3,6}$/.test(part))
    .filter((part) => !/^philippines$/i.test(part));
  if (!parts.length) return "";
  if (parts.length === 1) return parts[0].slice(0, 80);
  const locality = parts.slice(1).slice(-2);
  return locality.join(", ").slice(0, 80);
}

function firstNameOnly(fullName) {
  return String(fullName ?? "").trim().split(/\s+/)[0] || "";
}

function maskPhone(phone) {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (digits.length < 4) return "";
  return `•••• ${digits.slice(-4)}`;
}

function riderPublicProfile(rider, { includePlate = true } = {}) {
  if (!rider) return null;
  return {
    firstName: String(rider.first_name ?? "").trim(),
    photoUrl: rider.profile_photo_key ? `/api/switch-rider/riders/${encodeURIComponent(rider.id)}/photo` : "",
    vehicleType: rider.vehicle_type,
    vehicleModel: rider.vehicle_model || "",
    vehicleColor: rider.vehicle_color || "",
    plateNumber: includePlate ? rider.plate_number || "" : "",
    ratingAverage: num(rider.rating_average),
    ratingCount: Number(rider.rating_count) || 0,
  };
}

function serializeRiderSelf(rider, extras = {}) {
  return {
    id: rider.id,
    riderCode: rider.rider_code,
    firstName: rider.first_name,
    lastName: rider.last_name,
    fullName: `${rider.first_name} ${rider.last_name}`.trim(),
    countryCode: rider.country_code,
    mobileNumber: rider.mobile_number,
    email: rider.email || "",
    birthday: dateOnly(rider.birthday),
    hasProfilePhoto: Boolean(rider.profile_photo_key),
    status: rider.status,
    statusReason: rider.status_reason || "",
    availabilityStatus: rider.availability_status,
    vehicle: {
      type: rider.vehicle_type,
      plateNumber: rider.plate_number,
      model: rider.vehicle_model,
      color: rider.vehicle_color,
    },
    emergencyContact: {
      name: rider.emergency_contact_name,
      phone: rider.emergency_contact_phone,
      relationship: rider.emergency_contact_relation,
    },
    currentDeliveryId: rider.current_delivery_id || "",
    ratingAverage: num(rider.rating_average),
    ratingCount: Number(rider.rating_count) || 0,
    lastOnlineAt: iso(rider.last_online_at),
    lastLocationAt: iso(rider.last_location_at),
    createdAt: iso(rider.created_at),
    ...extras,
  };
}

function serializeRiderForAdmin(rider, extras = {}) {
  return {
    ...serializeRiderSelf(rider),
    approvedAt: iso(rider.approved_at),
    approvedBy: rider.approved_by || "",
    lastLoginAt: iso(rider.last_login_at),
    lastLocation:
      rider.last_latitude !== null && rider.last_latitude !== undefined
        ? {
            lat: num(rider.last_latitude),
            lng: num(rider.last_longitude),
            accuracy: num(rider.last_location_accuracy),
            at: iso(rider.last_location_at),
          }
        : null,
    ...extras,
  };
}

function jobMoney(job) {
  return {
    quotedDeliveryFee: num(job.quoted_delivery_fee),
    customerDeliveryFee: num(job.customer_delivery_fee),
    platformSubsidy: num(job.platform_subsidy),
    riderEarning: num(job.rider_earning),
    platformDeliveryMargin: num(job.platform_delivery_margin),
  };
}

function jobTimestamps(job) {
  return {
    createdAt: iso(job.created_at),
    readyAt: iso(job.ready_at),
    offeredAt: iso(job.offered_at),
    acceptedAt: iso(job.accepted_at),
    toPickupAt: iso(job.to_pickup_at),
    arrivedPickupAt: iso(job.arrived_pickup_at),
    pickedUpAt: iso(job.picked_up_at),
    inTransitAt: iso(job.in_transit_at),
    arrivedDropoffAt: iso(job.arrived_dropoff_at),
    deliveredAt: iso(job.delivered_at),
    failedAt: iso(job.failed_at),
    returnStartedAt: iso(job.return_started_at),
    returnedAt: iso(job.returned_at),
    cancelledAt: iso(job.cancelled_at),
  };
}

/** Pre-acceptance view: enough to decide, nothing that identifies the customer. */
function serializeOfferForRider(offer, job, nowMs = Date.now()) {
  const expiresAtMs = new Date(offer.expires_at).getTime();
  return {
    offerId: offer.id,
    deliveryId: job.id,
    deliveryCode: job.delivery_code,
    status: offer.status,
    expiresAt: iso(offer.expires_at),
    secondsRemaining: Math.max(0, Math.round((expiresAtMs - nowMs) / 1000)),
    pickupArea: job.pickup_area || deriveArea(job.pickup_address),
    dropoffArea: job.dropoff_area || deriveArea(job.dropoff_address),
    distanceKm: num(job.distance_km),
    distanceToPickupKm: num(offer.distance_to_pickup_km),
    estimatedMinutes: Number(job.estimated_minutes) || 0,
    riderEarning: num(job.rider_earning),
    paymentMethod: job.payment_method,
    isCod: job.payment_method === "COD" && num(job.cod_amount) > 0,
    codAmount: job.payment_method === "COD" ? num(job.cod_amount) : 0,
    vehicleTypeRequired: job.vehicle_type_required,
    packageCount: Number(job.package_count) || 1,
    stops: 2,
    packageNotes: job.package_notes || "",
  };
}

/** Assigned-rider view; customer contact is visible only while delivering. */
function serializeJobForRider(job, { proofs = [] } = {}) {
  const status = job.status;
  const assigned = !PRE_ASSIGNMENT_STATUSES.has(status);
  const finished = TERMINAL_STATUSES.has(status);
  const contactVisible = CUSTOMER_CONTACT_VISIBLE_STATUSES.has(status);
  const returning = status === S.RETURN_REQUIRED || status === S.RETURNING_TO_SELLER;
  return {
    id: job.id,
    deliveryCode: job.delivery_code,
    orderReference: String(job.order_group_id || "").slice(-8).toUpperCase(),
    status,
    pickup: {
      name: assigned ? job.pickup_name : "",
      address: assigned && (!finished || returning) ? job.pickup_address : "",
      area: job.pickup_area || deriveArea(job.pickup_address),
      phone: assigned && !finished ? job.pickup_contact_phone : "",
      lat: assigned && !finished ? num(job.pickup_latitude) : null,
      lng: assigned && !finished ? num(job.pickup_longitude) : null,
    },
    dropoff: {
      name: contactVisible ? firstNameOnly(job.dropoff_name) : "",
      address: contactVisible ? job.dropoff_address : "",
      area: job.dropoff_area || deriveArea(job.dropoff_address),
      phone: contactVisible ? job.dropoff_contact_phone : "",
      lat: contactVisible ? num(job.dropoff_latitude) : null,
      lng: contactVisible ? num(job.dropoff_longitude) : null,
    },
    packageCount: Number(job.package_count) || 1,
    packageNotes: job.package_notes || "",
    vehicleTypeRequired: job.vehicle_type_required,
    distanceKm: num(job.distance_km),
    estimatedMinutes: Number(job.estimated_minutes) || 0,
    riderEarning: num(job.rider_earning),
    paymentMethod: job.payment_method,
    codAmount: job.payment_method === "COD" ? num(job.cod_amount) : 0,
    codCollected: Boolean(job.cod_collected_at),
    codCollectedAt: iso(job.cod_collected_at),
    deliveryConfirmationType: job.delivery_confirmation_type || "",
    hasDeliveryProof: proofs.some((proof) => proof.proof_type === "DELIVERY"),
    hasFailedAttemptProof: proofs.some((proof) => proof.proof_type === "FAILED_ATTEMPT"),
    failureReason: job.failure_reason || "",
    timestamps: jobTimestamps(job),
  };
}

function serializeJobForAdmin(job, extras = {}) {
  return {
    id: job.id,
    deliveryCode: job.delivery_code,
    orderGroupId: job.order_group_id,
    orderCreatedAtEpochMs: Number(job.order_created_at_epoch_ms) || 0,
    deliveryProvider: job.delivery_provider,
    sellerAdminId: job.seller_admin_id,
    buyerAccountId: job.buyer_account_id,
    riderId: job.rider_id || "",
    status: job.status,
    dispatchMode: job.dispatch_mode,
    dispatchAttempts: Number(job.dispatch_attempts) || 0,
    vehicleTypeRequired: job.vehicle_type_required,
    pickup: {
      name: job.pickup_name,
      phone: job.pickup_contact_phone,
      address: job.pickup_address,
      area: job.pickup_area,
      lat: num(job.pickup_latitude),
      lng: num(job.pickup_longitude),
    },
    dropoff: {
      name: job.dropoff_name,
      phoneMasked: maskPhone(job.dropoff_contact_phone),
      address: job.dropoff_address,
      area: job.dropoff_area,
      lat: num(job.dropoff_latitude),
      lng: num(job.dropoff_longitude),
    },
    packageCount: Number(job.package_count) || 1,
    packageNotes: job.package_notes || "",
    distanceKm: num(job.distance_km),
    estimatedMinutes: Number(job.estimated_minutes) || 0,
    ...jobMoney(job),
    pricingSnapshot: job.pricing_snapshot || {},
    paymentMethod: job.payment_method,
    codAmount: num(job.cod_amount),
    codCollectedAmount: job.cod_collected_amount === null ? null : num(job.cod_collected_amount),
    codCollectedAt: iso(job.cod_collected_at),
    deliveryConfirmationType: job.delivery_confirmation_type || "",
    deliveryPinVerified: job.delivery_pin_verified === true,
    proofOfDeliveryId: job.proof_of_delivery_id || "",
    failureReason: job.failure_reason || "",
    failureNote: job.failure_note || "",
    cancellation: {
      by: job.cancelled_by || "",
      role: job.cancelled_by_role || "",
      reason: job.cancellation_reason || "",
      stage: job.cancellation_stage || "",
    },
    timestamps: jobTimestamps(job),
    ...extras,
  };
}

function serializeHistory(rows) {
  return (rows || []).map((row) => ({
    fromStatus: row.from_status,
    toStatus: row.to_status,
    actorType: row.actor_type,
    note: row.note || "",
    at: iso(row.created_at),
  }));
}

module.exports = {
  num,
  iso,
  deriveArea,
  firstNameOnly,
  maskPhone,
  riderPublicProfile,
  serializeRiderSelf,
  serializeRiderForAdmin,
  serializeOfferForRider,
  serializeJobForRider,
  serializeJobForAdmin,
  serializeHistory,
  jobTimestamps,
};
