"use strict";

const EARTH_RADIUS_KM = 6371.0088;

function toFiniteNumber(value) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeCoordinates(latValue, lngValue) {
  const lat = toFiniteNumber(latValue);
  const lng = toFiniteNumber(lngValue);
  if (lat === null || lng === null) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  // (0,0) is in the Gulf of Guinea and almost always a client default, not a real fix.
  if (lat === 0 && lng === 0) return null;
  return { lat, lng };
}

function haversineKm(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Street distance estimate without a routing API: straight line times a road factor.
function estimateRoadDistanceKm(a, b, roadFactor = 1.3) {
  return haversineKm(a, b) * Math.max(1, Number(roadFactor) || 1);
}

function roundTo(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round((Number(value) || 0) * factor) / factor;
}

module.exports = {
  toFiniteNumber,
  normalizeCoordinates,
  haversineKm,
  estimateRoadDistanceKm,
  roundTo,
};
