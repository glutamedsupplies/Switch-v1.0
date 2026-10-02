"use strict";

const { haversineKm, normalizeCoordinates } = require("./geo");

const ROUTES_ENDPOINT = "https://routes.googleapis.com/directions/v2:computeRoutes";
const ROUTES_FIELD_MASK = "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline";
const REQUEST_TIMEOUT_MS = 6000;
const FAILURE_BACKOFF_MS = 60 * 1000;
const MAX_CACHE_ENTRIES = 1000;
const STATIONARY_REUSE_MS = 5 * 60 * 1000;

/** Google encoded polyline algorithm (precision 5). */
function encodePolyline(points) {
  let lastLat = 0;
  let lastLng = 0;
  let output = "";
  const encodeValue = (value) => {
    let v = value < 0 ? ~(value << 1) : value << 1;
    let chunk = "";
    while (v >= 0x20) {
      chunk += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
      v >>= 5;
    }
    return chunk + String.fromCharCode(v + 63);
  };
  for (const point of points) {
    const lat = Math.round(point.lat * 1e5);
    const lng = Math.round(point.lng * 1e5);
    output += encodeValue(lat - lastLat) + encodeValue(lng - lastLng);
    lastLat = lat;
    lastLng = lng;
  }
  return output;
}

function parseDurationSeconds(value) {
  const match = /^(\d+(?:\.\d+)?)s$/.exec(String(value ?? "").trim());
  return match ? Math.round(Number(match[1])) : 0;
}

/**
 * Road routes for live tracking. Uses the Google Routes API when
 * GOOGLE_MAPS_API_KEY is set; otherwise (or on failure) returns a straight-line
 * estimate so the map still shows something sensible.
 *
 * Calls are cached per cache key: a rider leg is only recomputed when the rider
 * has moved meaningfully or the entry is older than `ttlMs`, which keeps Routes
 * API usage to roughly one call per active delivery every 30 seconds.
 */
function createRouteProvider({
  getApiKey = () => String(process.env.GOOGLE_MAPS_API_KEY || "").trim(),
  fetchImpl = typeof fetch === "function" ? fetch : null,
  now = () => Date.now(),
  logger = console,
} = {}) {
  const cache = new Map();
  let backoffUntil = 0;

  function estimateRoute(origin, destination, { roadFactor = 1.3, averageSpeedKph = 25 } = {}) {
    const km = haversineKm(origin, destination) * Math.max(1, Number(roadFactor) || 1);
    return {
      encodedPolyline: encodePolyline([origin, destination]),
      distanceMeters: Math.round(km * 1000),
      durationSeconds: Math.round((km / Math.max(5, Number(averageSpeedKph) || 25)) * 3600),
      source: "estimate",
    };
  }

  async function fetchGoogleRoute(origin, destination, apiKey) {
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS) : null;
    try {
      const response = await fetchImpl(ROUTES_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": ROUTES_FIELD_MASK,
        },
        body: JSON.stringify({
          origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
          destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
          travelMode: "DRIVE",
          routingPreference: "TRAFFIC_AWARE",
          languageCode: "en",
          regionCode: "PH",
          units: "METRIC",
        }),
        signal: controller?.signal,
      });
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`Routes API ${response.status}: ${text.slice(0, 200)}`);
      }
      const payload = await response.json();
      const route = Array.isArray(payload?.routes) ? payload.routes[0] : null;
      const encoded = String(route?.polyline?.encodedPolyline || "");
      if (!route || !encoded) return null;
      return {
        encodedPolyline: encoded,
        distanceMeters: Math.max(0, Math.round(Number(route.distanceMeters) || 0)),
        durationSeconds: parseDurationSeconds(route.duration),
        source: "google",
      };
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  function pruneCache() {
    if (cache.size <= MAX_CACHE_ENTRIES) return;
    for (const key of cache.keys()) {
      cache.delete(key);
      if (cache.size <= MAX_CACHE_ENTRIES * 0.8) break;
    }
  }

  /**
   * @param origin/destination {lat,lng}
   * @param options.cacheKey     stable key (e.g. `${jobId}:to_pickup`)
   * @param options.ttlMs        always reuse entries younger than this
   * @param options.reuseWithinKm past ttl, keep reusing (up to 5 min) while both ends moved less than this
   */
  async function computeRoute(originInput, destinationInput, {
    cacheKey = "",
    ttlMs = 30 * 1000,
    reuseWithinKm = 0.04,
    roadFactor,
    averageSpeedKph,
  } = {}) {
    const origin = normalizeCoordinates(originInput?.lat, originInput?.lng);
    const destination = normalizeCoordinates(destinationInput?.lat, destinationInput?.lng);
    if (!origin || !destination) return null;
    const key = cacheKey || `${origin.lat.toFixed(4)},${origin.lng.toFixed(4)}>${destination.lat.toFixed(4)},${destination.lng.toFixed(4)}`;
    const nowMs = now();
    const cached = cache.get(key);
    if (cached) {
      const age = nowMs - cached.createdAt;
      const moved =
        haversineKm(cached.origin, origin) > reuseWithinKm || haversineKm(cached.destination, destination) > reuseWithinKm;
      const estimated = cached.route?.source === "estimate";
      // Never keep a straight-line fallback for the normal route TTL. Once the
      // short API backoff expires, the next refresh must try for a road route
      // again (offer previews otherwise kept estimates for up to six hours).
      if (estimated) {
        if (nowMs < backoffUntil) return cached.route;
      } else {
        if (age < ttlMs) return cached.route;
        if (!moved && age < STATIONARY_REUSE_MS) return cached.route;
      }
    }

    let route = null;
    const apiKey = getApiKey();
    if (apiKey && fetchImpl && nowMs >= backoffUntil) {
      try {
        route = await fetchGoogleRoute(origin, destination, apiKey);
      } catch (error) {
        backoffUntil = nowMs + FAILURE_BACKOFF_MS;
        logger.warn?.("[switch-rider] Routes API failed, using estimate:", error?.message || error);
      }
    }
    if (!route) route = estimateRoute(origin, destination, { roadFactor, averageSpeedKph });
    cache.delete(key);
    cache.set(key, { route, origin, destination, createdAt: nowMs });
    pruneCache();
    return route;
  }

  return { computeRoute, estimateRoute };
}

module.exports = { createRouteProvider, encodePolyline, parseDurationSeconds };
