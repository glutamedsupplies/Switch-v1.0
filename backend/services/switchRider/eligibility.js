"use strict";

const {
  AVAILABILITY,
  OPERATIONAL_RIDER_STATUSES,
  RIDER_STATUS,
  isVehicleCompatible,
} = require("./constants");

/**
 * Pure eligibility rules shared by auto-dispatch and Super Admin manual assignment.
 * Manual assignment skips the proximity/location rules (the dispatcher decides),
 * but never the safety rules: offline, suspended, over capacity, wrong vehicle.
 */
function evaluateRiderEligibility(rider, job, settings, context = {}) {
  const {
    activeJobs = 0,
    hasPendingOffer = false,
    distanceToPickupKm = null,
    nowMs = Date.now(),
    mode = "auto",
  } = context;
  const reasons = [];

  if (!OPERATIONAL_RIDER_STATUSES.has(rider.status)) {
    reasons.push(rider.status === RIDER_STATUS.SUSPENDED ? "RIDER_SUSPENDED" : "RIDER_NOT_APPROVED");
  }
  if (rider.availability_status === AVAILABILITY.OFFLINE) {
    reasons.push("RIDER_OFFLINE");
  }
  if (Number(activeJobs) >= settings.maxActiveJobsPerRider) {
    reasons.push("RIDER_AT_CAPACITY");
  }
  if (!isVehicleCompatible(rider.vehicle_type, job.vehicle_type_required, job.distance_km, settings.bicycleMaxKm)) {
    reasons.push("VEHICLE_INCOMPATIBLE");
  }

  if (mode === "auto") {
    if (hasPendingOffer) reasons.push("RIDER_HAS_PENDING_OFFER");
    const locationAt = rider.last_location_at ? new Date(rider.last_location_at).getTime() : 0;
    if (!locationAt || nowMs - locationAt > settings.locationStaleSeconds * 1000) {
      reasons.push("LOCATION_STALE");
    } else if (distanceToPickupKm === null || distanceToPickupKm > settings.offerRadiusKm) {
      reasons.push("TOO_FAR_FROM_PICKUP");
    }
  }

  return { eligible: reasons.length === 0, reasons };
}

const ELIGIBILITY_REASON_LABELS = Object.freeze({
  RIDER_SUSPENDED: "Rider is suspended",
  RIDER_NOT_APPROVED: "Rider is not approved",
  RIDER_OFFLINE: "Rider is offline",
  RIDER_AT_CAPACITY: "Rider is at max workload",
  VEHICLE_INCOMPATIBLE: "Vehicle is not compatible",
  RIDER_HAS_PENDING_OFFER: "Rider is reviewing another offer",
  LOCATION_STALE: "No recent location",
  TOO_FAR_FROM_PICKUP: "Too far from pickup",
});

module.exports = {
  evaluateRiderEligibility,
  ELIGIBILITY_REASON_LABELS,
};
