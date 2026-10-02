"use strict";

const DELIVERY_PROVIDER = Object.freeze({
  SWITCH_RIDER: "SWITCH_RIDER",
  LALAMOVE: "LALAMOVE",
  JNT: "JNT",
  OTHER: "OTHER",
});

const SWITCH_RIDER_PARTNER_ID = "switch-rider";
const SWITCH_RIDER_PARTNER_NAME = "Switch Rider";

const RIDER_STATUS = Object.freeze({
  PENDING_VERIFICATION: "PENDING_VERIFICATION",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  ACTIVE: "ACTIVE",
  SUSPENDED: "SUSPENDED",
  DEACTIVATED: "DEACTIVATED",
});

// APPROVED = verified by Super Admin, never gone online yet.
// ACTIVE   = approved and has operated at least once.
const OPERATIONAL_RIDER_STATUSES = new Set([RIDER_STATUS.APPROVED, RIDER_STATUS.ACTIVE]);

const AVAILABILITY = Object.freeze({
  OFFLINE: "OFFLINE",
  ONLINE: "ONLINE",
  ON_DELIVERY: "ON_DELIVERY",
});

const VEHICLE_TYPES = Object.freeze(["BICYCLE", "MOTORCYCLE", "CAR", "VAN"]);
const VEHICLE_RANK = Object.freeze({ BICYCLE: 0, MOTORCYCLE: 1, CAR: 2, VAN: 3 });

const DOCUMENT_TYPES = Object.freeze([
  "DRIVERS_LICENSE",
  "VEHICLE_REGISTRATION",
  "GOVERNMENT_ID",
  "SELFIE",
  "PROFILE_PHOTO",
]);

const DELIVERY_STATUS = Object.freeze({
  PREPARING: "PREPARING",
  WAITING_FOR_RIDER: "WAITING_FOR_RIDER",
  OFFERED: "OFFERED",
  RIDER_ASSIGNED: "RIDER_ASSIGNED",
  RIDER_TO_PICKUP: "RIDER_TO_PICKUP",
  ARRIVED_AT_PICKUP: "ARRIVED_AT_PICKUP",
  PICKED_UP: "PICKED_UP",
  IN_TRANSIT: "IN_TRANSIT",
  ARRIVED_AT_DROPOFF: "ARRIVED_AT_DROPOFF",
  DELIVERED: "DELIVERED",
  FAILED_DELIVERY: "FAILED_DELIVERY",
  RETURN_REQUIRED: "RETURN_REQUIRED",
  RETURNING_TO_SELLER: "RETURNING_TO_SELLER",
  RETURNED_TO_SELLER: "RETURNED_TO_SELLER",
  CANCELLED: "CANCELLED",
});

const S = DELIVERY_STATUS;

// Allowed transitions. Anything not listed is rejected by the workflow.
const DELIVERY_TRANSITIONS = Object.freeze({
  [S.PREPARING]: [S.WAITING_FOR_RIDER, S.CANCELLED],
  [S.WAITING_FOR_RIDER]: [S.OFFERED, S.RIDER_ASSIGNED, S.CANCELLED],
  [S.OFFERED]: [S.RIDER_ASSIGNED, S.WAITING_FOR_RIDER, S.CANCELLED],
  [S.RIDER_ASSIGNED]: [S.RIDER_TO_PICKUP, S.ARRIVED_AT_PICKUP, S.WAITING_FOR_RIDER, S.CANCELLED],
  [S.RIDER_TO_PICKUP]: [S.ARRIVED_AT_PICKUP, S.WAITING_FOR_RIDER, S.CANCELLED],
  [S.ARRIVED_AT_PICKUP]: [S.PICKED_UP, S.WAITING_FOR_RIDER, S.CANCELLED],
  [S.PICKED_UP]: [S.IN_TRANSIT, S.FAILED_DELIVERY, S.RETURN_REQUIRED],
  [S.IN_TRANSIT]: [S.ARRIVED_AT_DROPOFF, S.FAILED_DELIVERY, S.RETURN_REQUIRED],
  [S.ARRIVED_AT_DROPOFF]: [S.DELIVERED, S.FAILED_DELIVERY, S.RETURN_REQUIRED],
  [S.FAILED_DELIVERY]: [S.RETURN_REQUIRED],
  [S.RETURN_REQUIRED]: [S.RETURNING_TO_SELLER],
  [S.RETURNING_TO_SELLER]: [S.RETURNED_TO_SELLER],
  [S.DELIVERED]: [],
  [S.RETURNED_TO_SELLER]: [],
  [S.CANCELLED]: [],
});

const PRE_ASSIGNMENT_STATUSES = new Set([S.PREPARING, S.WAITING_FOR_RIDER, S.OFFERED]);
const ASSIGNED_PRE_PICKUP_STATUSES = new Set([S.RIDER_ASSIGNED, S.RIDER_TO_PICKUP, S.ARRIVED_AT_PICKUP]);
// Rider physically holds the parcel in these states.
const PARCEL_IN_RIDER_CUSTODY_STATUSES = new Set([
  S.PICKED_UP,
  S.IN_TRANSIT,
  S.ARRIVED_AT_DROPOFF,
  S.FAILED_DELIVERY,
  S.RETURN_REQUIRED,
  S.RETURNING_TO_SELLER,
]);
const RIDER_ACTIVE_STATUSES = new Set([
  ...ASSIGNED_PRE_PICKUP_STATUSES,
  ...PARCEL_IN_RIDER_CUSTODY_STATUSES,
]);
const TERMINAL_STATUSES = new Set([S.DELIVERED, S.RETURNED_TO_SELLER, S.CANCELLED]);
// Customer contact details are only revealed while the rider is actually delivering.
const CUSTOMER_CONTACT_VISIBLE_STATUSES = new Set([
  S.RIDER_ASSIGNED,
  S.RIDER_TO_PICKUP,
  S.ARRIVED_AT_PICKUP,
  S.PICKED_UP,
  S.IN_TRANSIT,
  S.ARRIVED_AT_DROPOFF,
]);
// Buyer sees the rider live from acceptance: heading to the store, then to the buyer.
const BUYER_LIVE_LOCATION_STATUSES = new Set([
  S.RIDER_ASSIGNED,
  S.RIDER_TO_PICKUP,
  S.ARRIVED_AT_PICKUP,
  S.PICKED_UP,
  S.IN_TRANSIT,
  S.ARRIVED_AT_DROPOFF,
]);
const BUYER_DELIVERY_PIN_STATUSES = new Set([
  S.RIDER_ASSIGNED,
  S.RIDER_TO_PICKUP,
  S.ARRIVED_AT_PICKUP,
  S.PICKED_UP,
  S.IN_TRANSIT,
  S.ARRIVED_AT_DROPOFF,
]);

const FAILURE_REASONS = Object.freeze({
  CUSTOMER_UNREACHABLE: { label: "Customer unreachable", evidenceRequired: true },
  WRONG_ADDRESS: { label: "Wrong address", evidenceRequired: true },
  CUSTOMER_REFUSED: { label: "Customer refused", evidenceRequired: false },
  PAYMENT_PROBLEM: { label: "Payment problem", evidenceRequired: false },
  UNSAFE_LOCATION: { label: "Unsafe location", evidenceRequired: false },
  PACKAGE_ISSUE: { label: "Package issue", evidenceRequired: true },
  OTHER: { label: "Other", evidenceRequired: true },
});

const INCIDENT_CATEGORIES = Object.freeze({
  CANNOT_FIND_SELLER: { label: "Cannot find seller", safety: false },
  SELLER_NOT_READY: { label: "Seller not ready", safety: false },
  CUSTOMER_UNREACHABLE: { label: "Customer unreachable", safety: false },
  WRONG_LOCATION: { label: "Wrong location", safety: false },
  PACKAGE_DAMAGED: { label: "Package damaged", safety: false },
  VEHICLE_PROBLEM: { label: "Vehicle problem", safety: false },
  ACCIDENT_EMERGENCY: { label: "Accident / emergency", safety: true },
  SAFETY_CONCERN: { label: "Safety concern", safety: true },
  PAYMENT_ISSUE: { label: "Payment issue", safety: false },
  ACCOUNT_HELP: { label: "Account help", safety: false },
  OTHER: { label: "Other", safety: false },
});

// Reasons a rider may release an assigned job before pickup (support flow).
const RIDER_RELEASE_REASONS = Object.freeze({
  VEHICLE_PROBLEM: "Vehicle problem",
  SELLER_NOT_READY: "Seller not ready for a long time",
  CANNOT_FIND_SELLER: "Cannot find seller",
  PERSONAL_EMERGENCY: "Personal emergency",
  OTHER: "Other",
});

const MAX_PIN_ATTEMPTS = 5;

function canTransition(fromStatus, toStatus) {
  const allowed = DELIVERY_TRANSITIONS[fromStatus];
  return Array.isArray(allowed) && allowed.includes(toStatus);
}

function isVehicleCompatible(riderVehicle, requiredVehicle, distanceKm = 0, bicycleMaxKm = 5) {
  const riderRank = VEHICLE_RANK[riderVehicle];
  const requiredRank = VEHICLE_RANK[requiredVehicle];
  if (riderRank === undefined || requiredRank === undefined) return false;
  if (riderVehicle === "BICYCLE" && Number(distanceKm) > bicycleMaxKm) return false;
  return riderRank >= requiredRank;
}

module.exports = {
  DELIVERY_PROVIDER,
  SWITCH_RIDER_PARTNER_ID,
  SWITCH_RIDER_PARTNER_NAME,
  RIDER_STATUS,
  OPERATIONAL_RIDER_STATUSES,
  AVAILABILITY,
  VEHICLE_TYPES,
  VEHICLE_RANK,
  DOCUMENT_TYPES,
  DELIVERY_STATUS,
  DELIVERY_TRANSITIONS,
  PRE_ASSIGNMENT_STATUSES,
  ASSIGNED_PRE_PICKUP_STATUSES,
  PARCEL_IN_RIDER_CUSTODY_STATUSES,
  RIDER_ACTIVE_STATUSES,
  TERMINAL_STATUSES,
  CUSTOMER_CONTACT_VISIBLE_STATUSES,
  BUYER_LIVE_LOCATION_STATUSES,
  BUYER_DELIVERY_PIN_STATUSES,
  FAILURE_REASONS,
  INCIDENT_CATEGORIES,
  RIDER_RELEASE_REASONS,
  MAX_PIN_ATTEMPTS,
  canTransition,
  isVehicleCompatible,
};
