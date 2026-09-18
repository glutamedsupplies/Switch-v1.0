"use strict";

/**
 * Philippines address search + reverse geocode.
 *
 * Prefer Google Places/Geocoding when GOOGLE_MAPS_API_KEY is set.
 * Otherwise fall back to OpenStreetMap Nominatim (countrycodes=ph).
 *
 * Read the key lazily so backend/.env is already loaded by server.js.
 */

const NOMINATIM_USER_AGENT =
  "SwitchShopping/1.0 (philippines-address-search; contact=support@switch.local)";
const PH_COUNTRY = "ph";
const MAX_RESULTS = 10;
const REQUEST_TIMEOUT_MS = 10_000;

function getGoogleMapsApiKey() {
  return String(process.env.GOOGLE_MAPS_API_KEY || "").trim();
}

/** Browser-facing key for Maps JS / Embed (optional separate restricted key). */
function getGoogleMapsBrowserKey() {
  return String(
    process.env.GOOGLE_MAPS_BROWSER_KEY || process.env.GOOGLE_MAPS_API_KEY || "",
  ).trim();
}

function createMapsPlacesApi({ sendJson }) {
  function normalizeText(value) {
    return String(value ?? "")
      .trim()
      .replace(/\s+/g, " ");
  }

  function toNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  async function fetchJson(url, { headers = {}, method = "GET", body } = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        method,
        headers,
        body,
        signal: controller.signal,
      });
      if (!response.ok) {
        let detail = "";
        try {
          const errJson = await response.json();
          detail =
            errJson?.error?.message ||
            errJson?.error_message ||
            errJson?.message ||
            "";
        } catch (_) {
          // ignore parse errors
        }
        const err = new Error(
          detail || `Upstream maps request failed (${response.status}).`,
        );
        err.statusCode = response.status;
        throw err;
      }
      return await response.json();
    } finally {
      clearTimeout(timer);
    }
  }

  function pickFirst(...values) {
    for (const value of values) {
      const text = normalizeText(value);
      if (text) return text;
    }
    return "";
  }

  function normalizeGoogleAddressComponents(components = []) {
    const byType = new Map();
    for (const component of components) {
      const types = Array.isArray(component?.types) ? component.types : [];
      const name = normalizeText(
        component.longText ||
          component.long_name ||
          component.shortText ||
          component.short_name,
      );
      for (const type of types) {
        if (!byType.has(type) && name) {
          byType.set(type, name);
        }
      }
    }
    const streetNumber = byType.get("street_number") || "";
    const route = byType.get("route") || "";
    const routeStreet = normalizeText([streetNumber, route].filter(Boolean).join(" "));
    // PH: barangay is usually sublocality / neighborhood.
    const barangay = pickFirst(
      byType.get("sublocality_level_1"),
      byType.get("sublocality_level_2"),
      byType.get("neighborhood"),
      byType.get("sublocality"),
    );
    const admin1 = byType.get("administrative_area_level_1") || "";
    const admin2 = byType.get("administrative_area_level_2") || "";
    // PH quirk: Google often stores region in admin1 (e.g. Calabarzon)
    // and province in admin2 (e.g. Laguna).
    const province = pickFirst(admin2, admin1);
    const city = pickFirst(
      byType.get("locality"),
      byType.get("postal_town"),
      byType.get("administrative_area_level_3"),
      admin2 && admin2 !== province ? admin2 : "",
    );
    const postal = byType.get("postal_code") || "";
    return {
      street: routeStreet,
      barangay,
      city,
      province,
      postal,
    };
  }

  function normalizeNominatimAddress(address = {}, displayName = "") {
    const routeStreet = normalizeText(
      [address.house_number, address.road || address.pedestrian || address.path]
        .filter(Boolean)
        .join(" "),
    );
    const barangay = pickFirst(
      address.suburb,
      address.neighbourhood,
      address.quarter,
      address.village,
    );
    const city = pickFirst(
      address.city,
      address.town,
      address.municipality,
      address.city_district,
      address.county,
    );
    const province = pickFirst(
      address.state,
      address.province,
      address.region,
    );
    const postal = normalizeText(address.postcode);
    return {
      street: routeStreet || (barangay ? "" : displayName.split(",")[0]),
      barangay,
      city,
      province,
      postal,
    };
  }

  function buildPlacePayload({
    id,
    label,
    description = "",
    lat,
    lng,
    street = "",
    barangay = "",
    city = "",
    province = "",
    postal = "",
    provider = "nominatim",
  }) {
    return {
      id: normalizeText(id),
      label: normalizeText(label),
      description: normalizeText(description),
      lat: toNumber(lat),
      lng: toNumber(lng),
      street: normalizeText(street),
      barangay: normalizeText(barangay),
      city: normalizeText(city),
      province: normalizeText(province),
      postal: normalizeText(postal),
      country: "Philippines",
      provider,
    };
  }

  // Seed queries only — results always come from Google Places Autocomplete.
  // Google does not expose a "list all PH provinces" endpoint.
  const PH_PROVINCE_SEED_QUERIES = [
    "Abra",
    "Agusan del Norte",
    "Agusan del Sur",
    "Aklan",
    "Albay",
    "Antique",
    "Apayao",
    "Aurora",
    "Basilan",
    "Bataan",
    "Batanes",
    "Batangas",
    "Benguet",
    "Biliran",
    "Bohol",
    "Bukidnon",
    "Bulacan",
    "Cagayan",
    "Camarines Norte",
    "Camarines Sur",
    "Camiguin",
    "Capiz",
    "Catanduanes",
    "Cavite",
    "Cebu",
    "Cotabato",
    "Davao de Oro",
    "Davao del Norte",
    "Davao del Sur",
    "Davao Occidental",
    "Davao Oriental",
    "Dinagat Islands",
    "Eastern Samar",
    "Guimaras",
    "Ifugao",
    "Ilocos Norte",
    "Ilocos Sur",
    "Iloilo",
    "Isabela",
    "Kalinga",
    "La Union",
    "Laguna",
    "Lanao del Norte",
    "Lanao del Sur",
    "Leyte",
    "Maguindanao del Norte",
    "Maguindanao del Sur",
    "Marinduque",
    "Masbate",
    "Metro Manila",
    "Misamis Occidental",
    "Misamis Oriental",
    "Mountain Province",
    "Negros Occidental",
    "Negros Oriental",
    "Northern Samar",
    "Nueva Ecija",
    "Nueva Vizcaya",
    "Occidental Mindoro",
    "Oriental Mindoro",
    "Palawan",
    "Pampanga",
    "Pangasinan",
    "Quezon",
    "Quirino",
    "Rizal",
    "Romblon",
    "Samar",
    "Sarangani",
    "Siquijor",
    "Sorsogon",
    "South Cotabato",
    "Southern Leyte",
    "Sultan Kudarat",
    "Sulu",
    "Surigao del Norte",
    "Surigao del Sur",
    "Tarlac",
    "Tawi-Tawi",
    "Zambales",
    "Zamboanga del Norte",
    "Zamboanga del Sur",
    "Zamboanga Sibugay",
  ];

  let googleProvincesCache = null;
  let googleProvincesCachePromise = null;
  const googleCitiesCache = new Map();
  const googleCitiesCachePromises = new Map();

  function primaryTypesForLegacyType(types) {
    const value = normalizeText(types);
    if (!value) return undefined;
    if (value === "(cities)") return ["(cities)"];
    if (value === "(regions)") return ["(regions)"];
    return [value];
  }

  async function searchGooglePlaces(query, { types, location, radius } = {}) {
    const apiKey = getGoogleMapsApiKey();
    const body = {
      input: normalizeText(query),
      includedRegionCodes: [PH_COUNTRY],
      languageCode: "en",
      regionCode: PH_COUNTRY.toUpperCase(),
    };
    const primaryTypes = primaryTypesForLegacyType(types);
    if (primaryTypes) {
      body.includedPrimaryTypes = primaryTypes;
    }
    if (
      location &&
      Number.isFinite(location.lat) &&
      Number.isFinite(location.lng)
    ) {
      body.locationBias = {
        circle: {
          center: {
            latitude: location.lat,
            longitude: location.lng,
          },
          radius: Number(Math.min(radius || 50_000, 50_000)),
        },
      };
    }

    const payload = await fetchJson(
      "https://places.googleapis.com/v1/places:autocomplete",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
        },
        body: JSON.stringify(body),
      },
    );

    const suggestions = Array.isArray(payload.suggestions)
      ? payload.suggestions.slice(0, MAX_RESULTS)
      : [];

    return suggestions
      .map((suggestion) => {
        const prediction = suggestion?.placePrediction;
        if (!prediction) return null;
        const placeId = normalizeText(
          prediction.placeId ||
            String(prediction.place || "").replace(/^places\//, ""),
        );
        if (!placeId) return null;
        const main = normalizeText(
          prediction.structuredFormat?.mainText?.text ||
            prediction.text?.text,
        );
        const secondary = normalizeText(
          prediction.structuredFormat?.secondaryText?.text,
        );
        const description = normalizeText(
          prediction.text?.text ||
            [main, secondary].filter(Boolean).join(", "),
        );
        return buildPlacePayload({
          id: placeId,
          label: main || description,
          description,
          provider: "google",
        });
      })
      .filter(Boolean);
  }

  function regionKey(name) {
    return normalizeText(name).toLowerCase();
  }

  async function resolvePlaceCenter(placeId) {
    const details = await detailsGooglePlace(placeId);
    if (!details || details.lat == null || details.lng == null) return null;
    return { lat: details.lat, lng: details.lng, place: details };
  }

  async function fetchGoogleProvinces() {
    if (googleProvincesCache) return googleProvincesCache;
    if (googleProvincesCachePromise) return googleProvincesCachePromise;

    // Instant browse list (official PH province names). Real Google place_ids
    // are resolved in the background and on select / typed search.
    const instant = PH_PROVINCE_SEED_QUERIES.map((name) =>
      buildPlacePayload({
        id: `seed:${name}`,
        label: name,
        description: `${name}, Philippines`,
        provider: "google",
      }),
    ).sort((a, b) =>
      a.label.localeCompare(b.label, "en", { sensitivity: "base" }),
    );

    googleProvincesCachePromise = (async () => {
      const byKey = new Map();
      const batchSize = 12;
      for (let i = 0; i < PH_PROVINCE_SEED_QUERIES.length; i += batchSize) {
        const batch = PH_PROVINCE_SEED_QUERIES.slice(i, i + batchSize);
        const settled = await Promise.allSettled(
          batch.map((seed) =>
            searchGooglePlaces(seed, { types: "(regions)" }),
          ),
        );
        for (let bi = 0; bi < settled.length; bi += 1) {
          const seed = batch[bi];
          const outcome = settled[bi];
          if (outcome.status !== "fulfilled") continue;
          const seedKey = regionKey(seed);
          const match =
            outcome.value.find((item) => regionKey(item.label) === seedKey) ||
            outcome.value.find((item) =>
              regionKey(item.label).includes(seedKey),
            ) ||
            outcome.value.find((item) =>
              regionKey(item.description).includes(seedKey),
            ) ||
            outcome.value[0];
          if (!match) {
            byKey.set(
              seedKey,
              buildPlacePayload({
                id: `seed:${seed}`,
                label: seed,
                description: `${seed}, Philippines`,
                provider: "google",
              }),
            );
            continue;
          }
          const key = regionKey(match.label);
          if (!byKey.has(key)) {
            byKey.set(key, match);
          }
        }
      }
      const list = [...byKey.values()].sort((a, b) =>
        a.label.localeCompare(b.label, "en", { sensitivity: "base" }),
      );
      googleProvincesCache = list;
      return list;
    })()
      .catch((error) => {
        console.warn(
          "[mapsPlacesApi] Province Google enrich failed:",
          error?.message || error,
        );
        googleProvincesCache = instant;
        return instant;
      })
      .finally(() => {
        googleProvincesCachePromise = null;
      });

    // Don't block the first request on 80+ Google calls.
    return instant;
  }

  let psgcProvincesCache = null;
  const psgcCitiesCache = new Map();
  const psgcBarangaysCache = new Map();

  function stripPsgcPrefix(name) {
    return normalizeText(name)
      .replace(/^city of\s+/i, "")
      .replace(/^municipality of\s+/i, "")
      .replace(/\s+city$/i, "")
      .trim();
  }

  function cityPlaceKey(name) {
    return regionKey(stripPsgcPrefix(name) || name);
  }

  /** Display "Calamba City" when PSGC marks the LGU as a city. */
  function formatMunicipalityLabel(rawName, isCity) {
    const base = stripPsgcPrefix(rawName) || normalizeText(rawName);
    if (!base) return "";
    if (isCity && !/\bcity$/i.test(base)) {
      return `${base} City`;
    }
    return base;
  }

  async function fetchPsgcJsonList(path) {
    const rows = await fetchJson(`https://psgc.gitlab.io/api${path}`);
    return Array.isArray(rows) ? rows : [];
  }

  async function fetchPsgcProvinces() {
    if (psgcProvincesCache) return psgcProvincesCache;
    const rows = await fetchPsgcJsonList("/provinces.json");
    const list = rows
      .map((row) => ({
        code: normalizeText(row?.code),
        name: normalizeText(row?.name),
      }))
      .filter((row) => row.code && row.name);
    list.push({ code: "NCR", name: "Metro Manila" });
    psgcProvincesCache = list;
    return list;
  }

  async function matchPsgcProvince(provinceName) {
    const needle = regionKey(provinceName);
    if (!needle) return null;
    const provinces = await fetchPsgcProvinces();
    return (
      provinces.find((item) => regionKey(item.name) === needle) ||
      provinces.find((item) => regionKey(item.name).includes(needle)) ||
      provinces.find((item) => needle.includes(regionKey(item.name))) ||
      (needle.includes("manila") || needle === "ncr"
        ? { code: "NCR", name: "Metro Manila" }
        : null)
    );
  }

  async function fetchPsgcCitySeeds(provinceName) {
    const matched = await matchPsgcProvince(provinceName);
    if (!matched) return [];
    const cacheKey = matched.code;
    if (psgcCitiesCache.has(cacheKey)) return psgcCitiesCache.get(cacheKey);

    const path =
      matched.code === "NCR"
        ? "/regions/130000000/cities-municipalities.json"
        : `/provinces/${matched.code}/cities-municipalities.json`;
    const rows = await fetchPsgcJsonList(path);
    const list = rows
      .map((row) => {
        const rawName = normalizeText(row?.name);
        const isCity = Boolean(row?.isCity);
        const label = formatMunicipalityLabel(rawName, isCity);
        if (!label) return null;
        return buildPlacePayload({
          id: `seed:${label}`,
          label,
          description: `${label}, ${provinceName}, Philippines`,
          provider: "google",
        });
      })
      .filter(Boolean)
      .sort((a, b) =>
        a.label.localeCompare(b.label, "en", { sensitivity: "base" }),
      );
    psgcCitiesCache.set(cacheKey, list);
    return list;
  }

  async function fetchPsgcBarangaySeeds(cityName, provinceName) {
    const matchedProvince = await matchPsgcProvince(provinceName);
    if (!matchedProvince) return [];
    const path =
      matchedProvince.code === "NCR"
        ? "/regions/130000000/cities-municipalities.json"
        : `/provinces/${matchedProvince.code}/cities-municipalities.json`;
    const rows = await fetchPsgcJsonList(path);
    const cityNeedle = regionKey(stripPsgcPrefix(cityName) || cityName);
    const cityRow = rows.find((row) => {
      const name = regionKey(stripPsgcPrefix(row?.name) || row?.name);
      return (
        name === cityNeedle ||
        name.includes(cityNeedle) ||
        cityNeedle.includes(name)
      );
    });
    if (!cityRow?.code) return [];
    const cacheKey = String(cityRow.code);
    if (psgcBarangaysCache.has(cacheKey)) {
      return psgcBarangaysCache.get(cacheKey);
    }
    const barangayRows = await fetchPsgcJsonList(
      `/cities-municipalities/${cityRow.code}/barangays.json`,
    );
    const list = barangayRows
      .map((row) => {
        const label = normalizeText(row?.name);
        if (!label) return null;
        return buildPlacePayload({
          id: `seed:${label}`,
          label,
          description: `${label}, ${cityName}, ${provinceName}, Philippines`,
          provider: "google",
        });
      })
      .filter(Boolean)
      .sort((a, b) =>
        a.label.localeCompare(b.label, "en", { sensitivity: "base" }),
      );
    psgcBarangaysCache.set(cacheKey, list);
    return list;
  }

  async function fetchGoogleCitiesForProvince(provinceName, provincePlaceId) {
    const cacheKey = regionKey(provinceName || provincePlaceId);
    if (!cacheKey) return [];
    if (googleCitiesCache.has(cacheKey)) {
      return googleCitiesCache.get(cacheKey);
    }
    if (googleCitiesCachePromises.has(cacheKey)) {
      return googleCitiesCachePromises.get(cacheKey);
    }

    const promise = (async () => {
      let location = null;
      if (provincePlaceId && !String(provincePlaceId).startsWith("seed:")) {
        try {
          location = await resolvePlaceCenter(provincePlaceId);
        } catch (_) {
          location = null;
        }
      }

      // Google Autocomplete only returns a handful for empty city lists.
      // Merge Google hits with PSGC municipality names (resolved via Google on select).
      const byKey = new Map();
      try {
        const googleHits = await searchGooglePlaces(provinceName, {
          types: "(cities)",
          location: location
            ? { lat: location.lat, lng: location.lng }
            : undefined,
          radius: 50_000,
        });
        const provinceNeedle = regionKey(provinceName);
        for (const item of googleHits) {
          const hay = `${regionKey(item.label)} ${regionKey(item.description)}`;
          if (provinceNeedle && !hay.includes(provinceNeedle)) continue;
          const key = cityPlaceKey(item.label);
          if (key && key !== provinceNeedle && !byKey.has(key)) {
            byKey.set(key, item);
          }
        }
      } catch (error) {
        console.warn(
          "[mapsPlacesApi] Google city bootstrap failed:",
          error?.message || error,
        );
      }

      try {
        const seeds = await fetchPsgcCitySeeds(provinceName);
        for (const item of seeds) {
          const key = cityPlaceKey(item.label);
          if (!key) continue;
          const existing = byKey.get(key);
          // Prefer "X City" labels over bare Google locality names.
          if (
            !existing ||
            (/\bcity$/i.test(item.label) && !/\bcity$/i.test(existing.label))
          ) {
            byKey.set(key, item);
          }
        }
      } catch (error) {
        console.warn(
          "[mapsPlacesApi] PSGC city seed failed:",
          error?.message || error,
        );
      }

      const list = [...byKey.values()].sort((a, b) =>
        a.label.localeCompare(b.label, "en", { sensitivity: "base" }),
      );
      googleCitiesCache.set(cacheKey, list);
      return list;
    })();

    googleCitiesCachePromises.set(cacheKey, promise);
    try {
      return await promise;
    } finally {
      googleCitiesCachePromises.delete(cacheKey);
    }
  }

  async function searchGoogleRegions({
    query,
    level,
    province = "",
    provincePlaceId = "",
    city = "",
    cityPlaceId = "",
    lat = null,
    lng = null,
  }) {
    const q = normalizeText(query);
    const normalizedLevel = normalizeText(level).toLowerCase();

    if (normalizedLevel === "province") {
      if (!q) {
        return fetchGoogleProvinces();
      }
      // Typed search hits Google directly (avoids waiting on full seed cache).
      const direct = await searchGooglePlaces(q, { types: "(regions)" });
      if (direct.length > 0) return direct;
      const provinces = await fetchGoogleProvinces();
      const needle = regionKey(q);
      return provinces.filter(
        (item) =>
          regionKey(item.label).includes(needle) ||
          regionKey(item.description).includes(needle),
      );
    }

    if (normalizedLevel === "city") {
      if (!province) {
        const err = new Error("province is required for city search.");
        err.statusCode = 400;
        throw err;
      }
      if (!q) {
        return fetchGoogleCitiesForProvince(province, provincePlaceId);
      }
      let location = null;
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        location = { lat, lng };
      } else if (provincePlaceId) {
        const center = await resolvePlaceCenter(provincePlaceId);
        if (center) location = { lat: center.lat, lng: center.lng };
      }
      const attempts = [
        q,
        `${q}, ${province}`,
        `${q}, ${province}, Philippines`,
      ];
      const provinceNeedle = regionKey(province);
      for (const input of attempts) {
        const places = await searchGooglePlaces(input, {
          types: "(cities)",
          location,
          radius: 50_000,
        });
        if (places.length === 0) continue;
        const filtered = places.filter((item) => {
          const hay = `${regionKey(item.label)} ${regionKey(item.description)}`;
          return hay.includes(provinceNeedle);
        });
        if (filtered.length > 0) return filtered;
        // Keep unfiltered only when query already includes province context.
        if (input.toLowerCase().includes(provinceNeedle)) return places;
      }
      return [];
    }

    if (normalizedLevel === "barangay") {
      if (!city) {
        const err = new Error("city is required for barangay search.");
        err.statusCode = 400;
        throw err;
      }
      let location = null;
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        location = { lat, lng };
      } else if (cityPlaceId) {
        const center = await resolvePlaceCenter(cityPlaceId);
        if (center) location = { lat: center.lat, lng: center.lng };
      }
      const input = q
        ? `${q}, ${city}${province ? `, ${province}` : ""}, Philippines`
        : `Barangay, ${city}${province ? `, ${province}` : ""}, Philippines`;
      // No strict type — PH barangays are often sublocality / neighborhood.
      let places = [];
      try {
        places = await searchGooglePlaces(input, {
          location,
          radius: 25_000,
        });
      } catch (error) {
        console.warn(
          "[mapsPlacesApi] Google barangay search failed:",
          error?.message || error,
        );
      }
      if (!q || places.length === 0) {
        try {
          const seeds = await fetchPsgcBarangaySeeds(city, province);
          if (!q) return seeds.length > 0 ? seeds : places;
          const needle = regionKey(q);
          const filtered = seeds.filter(
            (item) =>
              regionKey(item.label).includes(needle) ||
              regionKey(item.description).includes(needle),
          );
          if (filtered.length > 0) return filtered;
        } catch (error) {
          console.warn(
            "[mapsPlacesApi] PSGC barangay seed failed:",
            error?.message || error,
          );
        }
      }
      return places;
    }

    const err = new Error('level must be "province", "city", or "barangay".');
    err.statusCode = 400;
    throw err;
  }

  async function detailsGooglePlace(placeId) {
    const apiKey = getGoogleMapsApiKey();
    const id = normalizeText(placeId).replace(/^places\//, "");
    if (!id) return null;
    const detailsUrl = new URL(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(id)}`,
    );
    detailsUrl.searchParams.set("languageCode", "en");
    detailsUrl.searchParams.set("regionCode", PH_COUNTRY.toUpperCase());

    const result = await fetchJson(detailsUrl, {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "id,displayName,formattedAddress,location,addressComponents",
      },
    });
    if (!result) return null;
    const parts = normalizeGoogleAddressComponents(result.addressComponents || []);
    const resolvedId = normalizeText(result.id || id).replace(/^places\//, "");
    return buildPlacePayload({
      id: resolvedId || id,
      label:
        normalizeText(result.displayName?.text) ||
        normalizeText(result.formattedAddress),
      description: normalizeText(result.formattedAddress),
      lat: result.location?.latitude,
      lng: result.location?.longitude,
      street: parts.street,
      barangay: parts.barangay,
      city: parts.city,
      province: parts.province,
      postal: parts.postal,
      provider: "google",
    });
  }

  async function searchNominatimPlaces(query) {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", query);
    url.searchParams.set("countrycodes", PH_COUNTRY);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("limit", String(MAX_RESULTS));
    url.searchParams.set("dedupe", "1");

    const rows = await fetchJson(url, {
      headers: {
        "User-Agent": NOMINATIM_USER_AGENT,
        Accept: "application/json",
      },
    });

    return (Array.isArray(rows) ? rows : []).map((row) => {
      const parts = normalizeNominatimAddress(row.address || {}, row.display_name || "");
      return buildPlacePayload({
        id: `osm:${row.osm_type || "n"}:${row.osm_id || row.place_id}`,
        label: row.name || parts.street || parts.barangay || row.display_name,
        description: row.display_name,
        lat: row.lat,
        lng: row.lon,
        street: parts.street,
        barangay: parts.barangay,
        city: parts.city,
        province: parts.province,
        postal: parts.postal,
        provider: "nominatim",
      });
    });
  }

  async function reverseGoogle(lat, lng) {
    const apiKey = getGoogleMapsApiKey();
    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.searchParams.set("latlng", `${lat},${lng}`);
    url.searchParams.set(
      "result_type",
      "street_address|route|neighborhood|sublocality|locality|administrative_area_level_2|administrative_area_level_3",
    );
    url.searchParams.set("language", "en");
    url.searchParams.set("key", apiKey);

    const payload = await fetchJson(url);
    const result = Array.isArray(payload.results) ? payload.results[0] : null;
    if (!result) return null;
    const parts = normalizeGoogleAddressComponents(result.address_components);
    const country = (result.address_components || []).find((c) =>
      (c.types || []).includes("country"),
    );
    const countryCode = normalizeText(country?.short_name).toLowerCase();
    if (countryCode && countryCode !== PH_COUNTRY) {
      return null;
    }
    return buildPlacePayload({
      id: result.place_id || `google:${lat},${lng}`,
      label: result.formatted_address,
      description: result.formatted_address,
      lat,
      lng,
      street: parts.street,
      barangay: parts.barangay,
      city: parts.city,
      province: parts.province,
      postal: parts.postal,
      provider: "google",
    });
  }

  async function reverseNominatim(lat, lng) {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lng));
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("zoom", "18");

    const row = await fetchJson(url, {
      headers: {
        "User-Agent": NOMINATIM_USER_AGENT,
        Accept: "application/json",
      },
    });
    const countryCode = normalizeText(row?.address?.country_code).toLowerCase();
    if (countryCode && countryCode !== PH_COUNTRY) {
      return null;
    }
    const parts = normalizeNominatimAddress(row?.address || {}, row?.display_name || "");
    return buildPlacePayload({
      id: `osm:${row?.osm_type || "n"}:${row?.osm_id || row?.place_id || `${lat},${lng}`}`,
      label: row?.display_name || parts.street || parts.barangay,
      description: row?.display_name || "",
      lat,
      lng,
      street: parts.street,
      barangay: parts.barangay,
      city: parts.city,
      province: parts.province,
      postal: parts.postal,
      provider: "nominatim",
    });
  }

  async function searchPlaces(query) {
    const q = normalizeText(query);
    if (q.length < 2) return [];
    if (getGoogleMapsApiKey()) {
      try {
        return await searchGooglePlaces(q);
      } catch (error) {
        console.warn("[mapsPlacesApi] Google search failed, falling back to Nominatim:", error?.message || error);
      }
    }
    return searchNominatimPlaces(q);
  }

  async function reverseGeocode(lat, lng) {
    if (getGoogleMapsApiKey()) {
      try {
        const googlePlace = await reverseGoogle(lat, lng);
        if (googlePlace) return googlePlace;
      } catch (error) {
        console.warn("[mapsPlacesApi] Google reverse failed, falling back to Nominatim:", error?.message || error);
      }
    }
    return reverseNominatim(lat, lng);
  }

  async function tryHandleMapsPlacesRoutes(request, response, requestUrl) {
    const pathname = requestUrl.pathname;
    const hasGoogleMapsKey = Boolean(getGoogleMapsApiKey());

    if (pathname === "/api/maps/config") {
      if (request.method !== "GET") {
        sendJson(response, 405, { message: "Method not allowed." });
        return true;
      }
      const browserKey = getGoogleMapsBrowserKey();
      sendJson(response, 200, {
        enabled: Boolean(browserKey),
        browserKey,
        provider: browserKey ? "google" : "none",
      });
      return true;
    }

    if (pathname === "/api/maps/places/autocomplete") {
      if (request.method !== "GET") {
        sendJson(response, 405, { message: "Method not allowed." });
        return true;
      }
      try {
        const query = normalizeText(requestUrl.searchParams.get("q"));
        const places = await searchPlaces(query);
        sendJson(response, 200, {
          places,
          provider: hasGoogleMapsKey ? "google" : "nominatim",
          country: "PH",
        });
      } catch (error) {
        sendJson(response, error?.statusCode || 500, {
          message: error?.message || "Unable to search places.",
        });
      }
      return true;
    }

    if (pathname === "/api/maps/regions/autocomplete") {
      if (request.method !== "GET") {
        sendJson(response, 405, { message: "Method not allowed." });
        return true;
      }
      if (!hasGoogleMapsKey) {
        sendJson(response, 503, {
          message: "Google Maps API key is not configured.",
        });
        return true;
      }
      try {
        const places = await searchGoogleRegions({
          query: normalizeText(requestUrl.searchParams.get("q")),
          level: normalizeText(requestUrl.searchParams.get("level")),
          province: normalizeText(requestUrl.searchParams.get("province")),
          provincePlaceId: normalizeText(
            requestUrl.searchParams.get("provincePlaceId"),
          ),
          city: normalizeText(requestUrl.searchParams.get("city")),
          cityPlaceId: normalizeText(requestUrl.searchParams.get("cityPlaceId")),
          lat: toNumber(requestUrl.searchParams.get("lat")),
          lng: toNumber(requestUrl.searchParams.get("lng")),
        });
        sendJson(response, 200, {
          places,
          provider: "google",
          country: "PH",
        });
      } catch (error) {
        sendJson(response, error?.statusCode || 500, {
          message: error?.message || "Unable to search regions.",
        });
      }
      return true;
    }

    if (pathname === "/api/maps/places/details") {
      if (request.method !== "GET") {
        sendJson(response, 405, { message: "Method not allowed." });
        return true;
      }
      try {
        const placeId = normalizeText(requestUrl.searchParams.get("placeId"));
        if (!placeId) {
          sendJson(response, 400, { message: "placeId is required." });
          return true;
        }
        if (placeId.startsWith("osm:")) {
          sendJson(response, 400, {
            message: "OSM suggestions already include full place details.",
          });
          return true;
        }
        if (!hasGoogleMapsKey) {
          sendJson(response, 503, {
            message: "Google Maps API key is not configured.",
          });
          return true;
        }
        const place = await detailsGooglePlace(placeId);
        if (!place) {
          sendJson(response, 404, { message: "Place not found." });
          return true;
        }
        sendJson(response, 200, { place, provider: "google", country: "PH" });
      } catch (error) {
        sendJson(response, error?.statusCode || 500, {
          message: error?.message || "Unable to load place details.",
        });
      }
      return true;
    }

    if (pathname === "/api/maps/geocode/reverse") {
      if (request.method !== "GET") {
        sendJson(response, 405, { message: "Method not allowed." });
        return true;
      }
      try {
        const lat = toNumber(requestUrl.searchParams.get("lat"));
        const lng = toNumber(requestUrl.searchParams.get("lng"));
        if (lat == null || lng == null) {
          sendJson(response, 400, { message: "lat and lng are required." });
          return true;
        }
        if (lat < 4.2 || lat > 21.5 || lng < 116 || lng > 127.5) {
          sendJson(response, 400, {
            message: "Location must be inside the Philippines.",
          });
          return true;
        }
        const place = await reverseGeocode(lat, lng);
        if (!place) {
          sendJson(response, 404, {
            message: "No Philippine address found for that location.",
          });
          return true;
        }
        sendJson(response, 200, {
          place,
          provider: place.provider,
          country: "PH",
        });
      } catch (error) {
        sendJson(response, error?.statusCode || 500, {
          message: error?.message || "Unable to reverse geocode.",
        });
      }
      return true;
    }

    return false;
  }

  return {
    tryHandleMapsPlacesRoutes,
    get hasGoogleMapsKey() {
      return Boolean(getGoogleMapsApiKey());
    },
  };
}

module.exports = {
  createMapsPlacesApi,
};
