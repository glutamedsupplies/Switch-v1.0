"use strict";

const { VEHICLE_TYPES } = require("./constants");
const { estimateRoadDistanceKm, haversineKm, normalizeCoordinates, roundTo } = require("./geo");

function findServiceZone(settings, point) {
  const zones = Array.isArray(settings?.serviceZones) ? settings.serviceZones : [];
  let best = null;
  for (const zone of zones) {
    if (!zone.active) continue;
    const distance = haversineKm({ lat: zone.centerLat, lng: zone.centerLng }, point);
    if (distance <= zone.radiusKm && (!best || distance < best.distance)) {
      best = { zone, distance };
    }
  }
  return best ? best.zone : null;
}

/**
 * Verifies both ends are inside an active Switch Rider zone. Fails closed: no
 * configured zones means Switch Rider is not offered anywhere.
 */
function checkServiceability(settings, pickupInput, dropoffInput) {
  if (!settings?.enabled) {
    return { serviceable: false, code: "SWITCH_RIDER_DISABLED", message: "Switch Rider is not available right now." };
  }
  const pickup = normalizeCoordinates(pickupInput?.lat, pickupInput?.lng);
  const dropoff = normalizeCoordinates(dropoffInput?.lat, dropoffInput?.lng);
  if (!pickup) {
    return { serviceable: false, code: "PICKUP_LOCATION_MISSING", message: "The seller has not set a pickup location." };
  }
  if (!dropoff) {
    return { serviceable: false, code: "DROPOFF_LOCATION_MISSING", message: "Pin your delivery address on the map to use Switch Rider." };
  }
  const pickupZone = findServiceZone(settings, pickup);
  if (!pickupZone) {
    return { serviceable: false, code: "PICKUP_NOT_SERVICEABLE", message: "Switch Rider does not serve this seller's area yet." };
  }
  const dropoffZone = findServiceZone(settings, dropoff);
  if (!dropoffZone) {
    return { serviceable: false, code: "DROPOFF_NOT_SERVICEABLE", message: "Switch Rider does not deliver to this address yet." };
  }
  const distanceKm = roundTo(estimateRoadDistanceKm(pickup, dropoff, settings.roadFactor), 2);
  if (distanceKm > settings.maxDeliveryDistanceKm) {
    return { serviceable: false, code: "DISTANCE_TOO_FAR", message: "This address is too far for Switch Rider." };
  }
  return { serviceable: true, code: "OK", message: "", pickup, dropoff, pickupZone, dropoffZone, distanceKm };
}

function roundPeso(value) {
  return Math.max(0, Math.round(Number(value) || 0));
}

/**
 * Single source of truth for Switch Rider pricing. The rider app and buyer app
 * only ever display values produced here.
 */
function calculateDeliveryPricing(settings, { distanceKm, vehicleType, packageCount = 1 } = {}) {
  const vehicle = VEHICLE_TYPES.includes(vehicleType) ? vehicleType : settings.defaultVehicleType;
  const table = settings.vehiclePricing[vehicle];
  const km = Math.max(0, Number(distanceKm) || 0);
  const extraKm = Math.max(0, km - table.includedKm);
  const surge = Math.max(1, Number(settings.surgeMultiplier) || 1);
  const extraStops = Math.max(0, Math.trunc(Number(packageCount) || 1) - 1);

  const rawBase = table.baseFee * surge;
  const rawDistance = table.perKm * extraKm * surge;
  const deliveryFee = roundPeso(Math.max(table.minFee * surge, rawBase + rawDistance));
  // Split the rounded fee so base + distance always add up exactly to the fee.
  const baseShare = rawBase + rawDistance > 0 ? rawBase / (rawBase + rawDistance) : 1;
  const quotedBaseFee = roundPeso(deliveryFee * baseShare);
  const quotedDistanceFee = deliveryFee - quotedBaseFee;

  const share = Math.min(100, Math.max(0, Number(settings.riderSharePercent) || 0)) / 100;
  const riderBaseFee = roundTo(quotedBaseFee * share, 2);
  const riderDistanceFee = roundTo(quotedDistanceFee * share, 2);
  const riderEarning = roundTo(riderBaseFee + riderDistanceFee, 2);
  const platformMargin = roundTo(deliveryFee - riderEarning, 2);
  const estimatedMinutes = Math.max(5, Math.round((km / settings.averageSpeedKph) * 60) + 10);

  return {
    vehicleType: vehicle,
    distanceKm: roundTo(km, 2),
    estimatedMinutes,
    deliveryFee,
    riderBaseFee,
    riderDistanceFee,
    riderEarning,
    platformMargin,
    snapshot: {
      version: 1,
      vehicleType: vehicle,
      distanceKm: roundTo(km, 2),
      baseFee: table.baseFee,
      perKm: table.perKm,
      includedKm: table.includedKm,
      minFee: table.minFee,
      surgeMultiplier: surge,
      riderSharePercent: settings.riderSharePercent,
      extraStops,
      quotedBaseFee,
      quotedDistanceFee,
    },
  };
}

/**
 * Settles who pays for the delivery. The buyer may have free shipping, in which
 * case the platform subsidizes the gap; the rider earning never changes.
 */
function settleCustomerFee(pricing, customerFee) {
  const paid = Math.max(0, roundTo(customerFee, 2));
  const subsidy = roundTo(Math.max(0, pricing.deliveryFee - paid), 2);
  return {
    customerDeliveryFee: paid,
    platformSubsidy: subsidy,
    platformMargin: roundTo(paid + subsidy - pricing.riderEarning, 2),
  };
}

module.exports = {
  findServiceZone,
  checkServiceability,
  calculateDeliveryPricing,
  settleCustomerFee,
};
