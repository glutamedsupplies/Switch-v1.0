"use strict";

const { VEHICLE_TYPES } = require("./constants");
const { normalizeCoordinates, toFiniteNumber } = require("./geo");

const DEFAULT_VEHICLE_PRICING = Object.freeze({
  BICYCLE: { baseFee: 45, perKm: 8, includedKm: 2, minFee: 45 },
  MOTORCYCLE: { baseFee: 49, perKm: 10, includedKm: 3, minFee: 59 },
  CAR: { baseFee: 115, perKm: 18, includedKm: 3, minFee: 150 },
  VAN: { baseFee: 250, perKm: 25, includedKm: 3, minFee: 300 },
});

const DEFAULT_SETTINGS = Object.freeze({
  enabled: false,
  autoDispatch: true,
  dispatchOnCheckout: true,
  offerTimeoutSeconds: 30,
  offerRadiusKm: 8,
  maxActiveJobsPerRider: 1,
  maxDispatchAttempts: 15,
  dispatchStuckMinutes: 10,
  locationStaleSeconds: 300,
  locationMinIntervalSeconds: 10,
  locationRetentionDays: 7,
  maxDeliveryDistanceKm: 30,
  bicycleMaxKm: 5,
  roadFactor: 1.3,
  averageSpeedKph: 25,
  surgeMultiplier: 1,
  riderSharePercent: 75,
  failedAttemptRiderPercent: 50,
  earningsHoldHours: 24,
  quoteTtlSeconds: 900,
  defaultVehicleType: "MOTORCYCLE",
  vehiclePricing: DEFAULT_VEHICLE_PRICING,
  serviceZones: [],
});

function clampNumber(value, fallback, min, max) {
  const parsed = toFiniteNumber(value);
  if (parsed === null) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function normalizeVehiclePricing(raw = {}) {
  const source = raw && typeof raw === "object" ? raw : {};
  const result = {};
  for (const vehicle of VEHICLE_TYPES) {
    const defaults = DEFAULT_VEHICLE_PRICING[vehicle];
    const entry = source[vehicle] && typeof source[vehicle] === "object" ? source[vehicle] : {};
    result[vehicle] = {
      baseFee: clampNumber(entry.baseFee, defaults.baseFee, 0, 100000),
      perKm: clampNumber(entry.perKm, defaults.perKm, 0, 10000),
      includedKm: clampNumber(entry.includedKm, defaults.includedKm, 0, 100),
      minFee: clampNumber(entry.minFee, defaults.minFee, 0, 100000),
    };
  }
  return result;
}

function normalizeServiceZone(raw = {}, index = 0) {
  const center = normalizeCoordinates(raw.centerLat ?? raw.lat, raw.centerLng ?? raw.lng);
  if (!center) return null;
  const name = String(raw.name ?? "").replace(/\s+/g, " ").trim().slice(0, 80) || `Zone ${index + 1}`;
  const idSource = String(raw.id ?? "").trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return {
    id: idSource.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 60) || `zone-${index + 1}`,
    name,
    centerLat: center.lat,
    centerLng: center.lng,
    radiusKm: clampNumber(raw.radiusKm, 10, 0.5, 200),
    active: raw.active !== false,
  };
}

function normalizeSettings(raw = {}) {
  const source = raw && typeof raw === "object" ? raw : {};
  const d = DEFAULT_SETTINGS;
  const defaultVehicleType = VEHICLE_TYPES.includes(source.defaultVehicleType)
    ? source.defaultVehicleType
    : d.defaultVehicleType;
  const zones = Array.isArray(source.serviceZones)
    ? source.serviceZones.map(normalizeServiceZone).filter(Boolean).slice(0, 100)
    : [];
  return {
    enabled: source.enabled === true,
    autoDispatch: source.autoDispatch !== false,
    dispatchOnCheckout: source.dispatchOnCheckout !== false,
    offerTimeoutSeconds: Math.round(clampNumber(source.offerTimeoutSeconds, d.offerTimeoutSeconds, 10, 300)),
    offerRadiusKm: clampNumber(source.offerRadiusKm, d.offerRadiusKm, 0.5, 100),
    maxActiveJobsPerRider: Math.round(clampNumber(source.maxActiveJobsPerRider, d.maxActiveJobsPerRider, 1, 5)),
    maxDispatchAttempts: Math.round(clampNumber(source.maxDispatchAttempts, d.maxDispatchAttempts, 1, 100)),
    dispatchStuckMinutes: Math.round(clampNumber(source.dispatchStuckMinutes, d.dispatchStuckMinutes, 1, 240)),
    locationStaleSeconds: Math.round(clampNumber(source.locationStaleSeconds, d.locationStaleSeconds, 30, 3600)),
    locationMinIntervalSeconds: Math.round(
      clampNumber(source.locationMinIntervalSeconds, d.locationMinIntervalSeconds, 3, 120),
    ),
    locationRetentionDays: Math.round(clampNumber(source.locationRetentionDays, d.locationRetentionDays, 1, 90)),
    maxDeliveryDistanceKm: clampNumber(source.maxDeliveryDistanceKm, d.maxDeliveryDistanceKm, 1, 300),
    bicycleMaxKm: clampNumber(source.bicycleMaxKm, d.bicycleMaxKm, 0.5, 50),
    roadFactor: clampNumber(source.roadFactor, d.roadFactor, 1, 3),
    averageSpeedKph: clampNumber(source.averageSpeedKph, d.averageSpeedKph, 5, 120),
    surgeMultiplier: clampNumber(source.surgeMultiplier, d.surgeMultiplier, 1, 5),
    riderSharePercent: clampNumber(source.riderSharePercent, d.riderSharePercent, 10, 100),
    failedAttemptRiderPercent: clampNumber(
      source.failedAttemptRiderPercent,
      d.failedAttemptRiderPercent,
      0,
      100,
    ),
    earningsHoldHours: clampNumber(source.earningsHoldHours, d.earningsHoldHours, 0, 24 * 30),
    quoteTtlSeconds: Math.round(clampNumber(source.quoteTtlSeconds, d.quoteTtlSeconds, 60, 3600)),
    defaultVehicleType,
    vehiclePricing: normalizeVehiclePricing(source.vehiclePricing),
    serviceZones: zones,
  };
}

module.exports = {
  DEFAULT_SETTINGS,
  DEFAULT_VEHICLE_PRICING,
  normalizeSettings,
  normalizeServiceZone,
};
