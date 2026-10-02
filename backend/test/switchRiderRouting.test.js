"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { createRouteProvider, encodePolyline, parseDurationSeconds } = require("../services/switchRider/routing");

const STORE = { lat: 15.0286, lng: 120.6898 }; // San Fernando, Pampanga
const BUYER = { lat: 15.0453, lng: 120.6997 };

test("encodePolyline matches Google's reference example", () => {
  const encoded = encodePolyline([
    { lat: 38.5, lng: -120.2 },
    { lat: 40.7, lng: -120.95 },
    { lat: 43.252, lng: -126.453 },
  ]);
  assert.equal(encoded, "_p~iF~ps|U_ulLnnqC_mqNvxq`@");
});

test("parseDurationSeconds reads Routes API durations", () => {
  assert.equal(parseDurationSeconds("754s"), 754);
  assert.equal(parseDurationSeconds("12.6s"), 13);
  assert.equal(parseDurationSeconds(""), 0);
});

test("without an API key the provider returns a straight-line estimate", async () => {
  const provider = createRouteProvider({ getApiKey: () => "", fetchImpl: null });
  const route = await provider.computeRoute(STORE, BUYER);
  assert.equal(route.source, "estimate");
  assert.ok(route.distanceMeters > 0);
  assert.ok(route.durationSeconds > 0);
  assert.equal(await provider.computeRoute(STORE, { lat: 0, lng: 0 }), null, "invalid coordinates give no route");
});

test("Google routes are cached and only refreshed after the rider moves and the TTL passes", async () => {
  let clock = 1_000_000;
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body), headers: init.headers });
    return {
      ok: true,
      json: async () => ({ routes: [{ distanceMeters: 2100, duration: "420s", polyline: { encodedPolyline: "abc" } }] }),
    };
  };
  const provider = createRouteProvider({ getApiKey: () => "test-key", fetchImpl, now: () => clock, logger: { warn() {} } });

  const first = await provider.computeRoute(STORE, BUYER, { cacheKey: "job:to_dropoff", ttlMs: 30_000 });
  assert.deepEqual(first, { encodedPolyline: "abc", distanceMeters: 2100, durationSeconds: 420, source: "google" });
  assert.equal(calls[0].headers["X-Goog-Api-Key"], "test-key");
  assert.equal(calls[0].body.origin.location.latLng.latitude, STORE.lat);

  clock += 10_000;
  await provider.computeRoute({ lat: STORE.lat + 0.002, lng: STORE.lng }, BUYER, { cacheKey: "job:to_dropoff", ttlMs: 30_000 });
  assert.equal(calls.length, 1, "within the TTL the cached route is reused");

  clock += 60_000;
  await provider.computeRoute(STORE, BUYER, { cacheKey: "job:to_dropoff", ttlMs: 30_000 });
  assert.equal(calls.length, 1, "a rider who has not moved keeps the cached route");

  await provider.computeRoute({ lat: STORE.lat + 0.01, lng: STORE.lng }, BUYER, { cacheKey: "job:to_dropoff", ttlMs: 30_000 });
  assert.equal(calls.length, 2, "a rider who moved past the TTL triggers a fresh route");
});

test("Routes API failures fall back to an estimate and back off", async () => {
  let clock = 1_000_000;
  let calls = 0;
  const provider = createRouteProvider({
    getApiKey: () => "test-key",
    fetchImpl: async () => {
      calls += 1;
      if (calls === 1) return { ok: false, status: 403, text: async () => "PERMISSION_DENIED" };
      return {
        ok: true,
        json: async () => ({ routes: [{ distanceMeters: 1850, duration: "360s", polyline: { encodedPolyline: "road" } }] }),
      };
    },
    now: () => clock,
    logger: { warn() {} },
  });
  const route = await provider.computeRoute(STORE, BUYER, { cacheKey: "a", ttlMs: 6 * 60 * 60 * 1000 });
  assert.equal(route.source, "estimate");
  await provider.computeRoute(STORE, BUYER, { cacheKey: "b" });
  assert.equal(calls, 1, "no retry storm while backing off");

  clock += 30_000;
  await provider.computeRoute(STORE, BUYER, { cacheKey: "a", ttlMs: 6 * 60 * 60 * 1000 });
  assert.equal(calls, 1, "an estimated route is reused only during the short backoff");

  clock += 31_000;
  const recovered = await provider.computeRoute(STORE, BUYER, { cacheKey: "a", ttlMs: 6 * 60 * 60 * 1000 });
  assert.equal(calls, 2, "the provider retries even when the offer route has a long TTL");
  assert.equal(recovered.source, "google");
  assert.equal(recovered.encodedPolyline, "road");
});
