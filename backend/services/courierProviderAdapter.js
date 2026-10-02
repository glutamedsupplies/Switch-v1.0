"use strict";

const crypto = require("crypto");

const LALAMOVE_SANDBOX_BASE_URL = "https://rest.sandbox.lalamove.com";
const LALAMOVE_PRODUCTION_BASE_URL = "https://rest.lalamove.com";
const DEFAULT_WEBHOOK_PATH = "/api/couriers/lalamove/webhook";

function createCourierError(message, code, statusCode = 500) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  return error;
}

function normalizeText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function optionalNumber(value) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeCoordinatePair(value, fallbackLat, fallbackLng) {
  const source = value && typeof value === "object" ? value : {};
  const lat = optionalNumber(source.lat ?? source.latitude ?? fallbackLat);
  const lng = optionalNumber(source.lng ?? source.lon ?? source.longitude ?? fallbackLng);
  if (
    lat === null
    || lng === null
    || lat < -90
    || lat > 90
    || lng < -180
    || lng > 180
  ) {
    return null;
  }
  return { lat: String(lat), lng: String(lng) };
}

function normalizePhilippinesPhone(value) {
  let phone = String(value ?? "").replace(/[^\d+]/g, "").trim();
  if (phone.startsWith("00")) {
    phone = `+${phone.slice(2)}`;
  } else if (phone.startsWith("09")) {
    phone = `+63${phone.slice(1)}`;
  } else if (/^9\d{9}$/.test(phone)) {
    phone = `+63${phone}`;
  } else if (phone.startsWith("63")) {
    phone = `+${phone}`;
  }
  return /^\+\d{7,15}$/.test(phone) ? phone : "";
}

function getCourierProviderConfig(env = process.env) {
  const requestedProvider = normalizeText(env.COURIER_PROVIDER).toLowerCase();
  const provider = requestedProvider === "lalamove" ? "lalamove" : "manual";
  let apiKey = normalizeText(env.LALAMOVE_API_KEY);
  let apiSecret = normalizeText(env.LALAMOVE_API_SECRET);
  const webhookSecret = normalizeText(env.LALAMOVE_WEBHOOK_SECRET) || apiSecret;
  let environment = normalizeText(env.LALAMOVE_ENVIRONMENT).toLowerCase() === "production"
    ? "production"
    : "sandbox";

  let testMode = false;
  try {
    testMode = require("./testModeService").isTestModeEnabledSync();
  } catch (_error) {
    testMode = false;
  }
  if (testMode) {
    // Test Mode: never call live courier APIs — text/manual assignment only.
    environment = "sandbox";
    apiKey = "";
    apiSecret = "";
  }

  const baseUrl = environment === "production"
    ? LALAMOVE_PRODUCTION_BASE_URL
    : LALAMOVE_SANDBOX_BASE_URL;
  return {
    provider: testMode ? "manual" : provider,
    apiKey,
    apiSecret,
    webhookSecret: testMode ? "" : webhookSecret,
    environment,
    baseUrl,
    market: normalizeText(env.LALAMOVE_MARKET).toUpperCase() || "PH",
    language: normalizeText(env.LALAMOVE_LANGUAGE) || "en_PH",
    serviceType: normalizeText(env.LALAMOVE_SERVICE_TYPE).toUpperCase() || "MOTORCYCLE",
    webhookPath: normalizeText(env.LALAMOVE_WEBHOOK_PATH) || DEFAULT_WEBHOOK_PATH,
    pickup: {
      name: normalizeText(env.LALAMOVE_PICKUP_NAME),
      phone: normalizePhilippinesPhone(env.LALAMOVE_PICKUP_PHONE),
      address: normalizeText(env.LALAMOVE_PICKUP_ADDRESS),
      coordinates: normalizeCoordinatePair(
        null,
        env.LALAMOVE_PICKUP_LAT,
        env.LALAMOVE_PICKUP_LNG,
      ),
    },
    live: !testMode && provider === "lalamove" && Boolean(apiKey && apiSecret),
    testMode,
  };
}

function requireLiveLalamoveConfig(config) {
  if (!config.apiKey || !config.apiSecret) {
    throw createCourierError(
      "Lalamove credentials are not configured.",
      "LALAMOVE_NOT_CONFIGURED",
      503,
    );
  }
  return config;
}

function createLalamoveSignature({
  timestamp,
  method,
  path,
  body = "",
  secret,
}) {
  const normalizedMethod = normalizeText(method).toUpperCase();
  const normalizedPath = String(path || "").trim();
  const bodyText = typeof body === "string" ? body : JSON.stringify(body ?? {});
  const rawSignature = `${timestamp}\r\n${normalizedMethod}\r\n${normalizedPath}\r\n\r\n${bodyText}`;
  return crypto
    .createHmac("sha256", String(secret || ""))
    .update(rawSignature)
    .digest("hex");
}

function signaturesMatch(expectedHex, receivedHex) {
  const expected = String(expectedHex || "").trim().toLowerCase();
  const received = String(receivedHex || "").trim().toLowerCase();
  if (!expected || !received || expected.length !== received.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}

function getLalamoveErrorMessage(payload, fallback) {
  const errors = Array.isArray(payload?.errors)
    ? payload.errors
    : payload?.errors && typeof payload.errors === "object"
      ? [payload.errors]
      : [];
  return normalizeText(
    errors[0]?.detail
      || errors[0]?.message
      || payload?.message
      || fallback,
  );
}

async function requestLalamove({
  config,
  method,
  path,
  body,
  fetchImpl = fetch,
  nowMs = Date.now(),
  requestId = crypto.randomUUID(),
}) {
  requireLiveLalamoveConfig(config);
  const timestamp = String(Math.trunc(Number(nowMs) || Date.now()));
  const bodyText = body === undefined || body === null ? "" : JSON.stringify(body);
  const signature = createLalamoveSignature({
    timestamp,
    method,
    path,
    body: bodyText,
    secret: config.apiSecret,
  });
  const response = await fetchImpl(`${config.baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `hmac ${config.apiKey}:${timestamp}:${signature}`,
      Market: config.market,
      "Request-ID": requestId,
      Accept: "application/json",
      ...(bodyText ? { "Content-Type": "application/json" } : {}),
    },
    ...(bodyText ? { body: bodyText } : {}),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw createCourierError(
      getLalamoveErrorMessage(payload, "Lalamove request failed."),
      "LALAMOVE_REQUEST_FAILED",
      response.status >= 500 ? 502 : response.status || 502,
    );
  }
  return payload;
}

function buildStubTrackingNumber(orderGroupId, provider = "manual") {
  const safeGroup = String(orderGroupId || "order")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(-10)
    .toUpperCase() || "ORDER";
  const stamp = Date.now().toString(36).toUpperCase();
  const prefix = provider === "lalamove" ? "LALA" : "MAN";
  return `${prefix}-${safeGroup}-${stamp}`;
}

function requireDeliveryStop({ label, address, coordinates }) {
  const normalizedAddress = normalizeText(address);
  if (!normalizedAddress) {
    throw createCourierError(
      `${label} address is required for Lalamove.`,
      "LALAMOVE_ADDRESS_REQUIRED",
      422,
    );
  }
  if (!coordinates) {
    throw createCourierError(
      `${label} latitude and longitude are required for Lalamove.`,
      "LALAMOVE_COORDINATES_REQUIRED",
      422,
    );
  }
  return { coordinates, address: normalizedAddress };
}

function normalizeLalamoveStatus(value) {
  const status = normalizeText(value).toUpperCase();
  const mapped = {
    ASSIGNING_DRIVER: "assigning_driver",
    ON_GOING: "in_transit",
    PICKED_UP: "in_transit",
    COMPLETED: "delivered",
    CANCELED: "canceled",
    CANCELLED: "canceled",
    REJECTED: "rejected",
    EXPIRED: "expired",
  };
  return mapped[status] || status.toLowerCase() || "unknown";
}

async function createLalamoveShipment({
  orderGroupId,
  trackingHint = "",
  pickupName = "",
  pickupPhone = "",
  pickupAddress = "",
  pickupCoordinates = null,
  pickupLat,
  pickupLng,
  recipientName = "",
  recipientPhone = "",
  recipientAddress = "",
  recipientCoordinates = null,
  recipientLat,
  recipientLng,
  scheduleAt = "",
  metadata = {},
  env = process.env,
  fetchImpl = fetch,
  nowMs,
  requestIdFactory = crypto.randomUUID,
}) {
  const existing = normalizeText(trackingHint);
  if (existing) {
    throw createCourierError(
      "Manual tracking numbers are not accepted while live Lalamove booking is enabled.",
      "LALAMOVE_TRACKING_HINT_NOT_ALLOWED",
      400,
    );
  }

  const config = requireLiveLalamoveConfig(getCourierProviderConfig(env));
  const resolvedPickupCoordinates = normalizeCoordinatePair(
    pickupCoordinates,
    pickupLat ?? config.pickup.coordinates?.lat,
    pickupLng ?? config.pickup.coordinates?.lng,
  );
  const resolvedRecipientCoordinates = normalizeCoordinatePair(
    recipientCoordinates,
    recipientLat,
    recipientLng,
  );
  const pickup = requireDeliveryStop({
    label: "Pickup",
    address: pickupAddress || config.pickup.address,
    coordinates: resolvedPickupCoordinates,
  });
  const recipient = requireDeliveryStop({
    label: "Recipient",
    address: recipientAddress,
    coordinates: resolvedRecipientCoordinates,
  });
  const senderName = normalizeText(pickupName || config.pickup.name);
  const senderPhone = normalizePhilippinesPhone(pickupPhone || config.pickup.phone);
  const receiverName = normalizeText(recipientName);
  const receiverPhone = normalizePhilippinesPhone(recipientPhone);
  if (!senderName || !senderPhone || !receiverName || !receiverPhone) {
    throw createCourierError(
      "Valid pickup and recipient names and E.164 phone numbers are required for Lalamove.",
      "LALAMOVE_CONTACT_REQUIRED",
      422,
    );
  }

  const quotationBody = {
    data: {
      serviceType: config.serviceType,
      language: config.language,
      stops: [pickup, recipient],
      ...(normalizeText(scheduleAt) ? { scheduleAt: normalizeText(scheduleAt) } : {}),
    },
  };
  const quotationPayload = await requestLalamove({
    config,
    method: "POST",
    path: "/v3/quotations",
    body: quotationBody,
    fetchImpl,
    nowMs,
    requestId: requestIdFactory(),
  });
  const quotation = quotationPayload?.data || {};
  const quotationId = normalizeText(quotation.quotationId);
  const stops = Array.isArray(quotation.stops) ? quotation.stops : [];
  const pickupStopId = normalizeText(stops[0]?.stopId);
  const recipientStopId = normalizeText(stops[1]?.stopId);
  if (!quotationId || !pickupStopId || !recipientStopId) {
    throw createCourierError(
      "Lalamove returned an incomplete quotation.",
      "LALAMOVE_QUOTATION_INVALID",
      502,
    );
  }

  const orderBody = {
    data: {
      quotationId,
      sender: {
        stopId: pickupStopId,
        name: senderName,
        phone: senderPhone,
      },
      recipients: [
        {
          stopId: recipientStopId,
          name: receiverName,
          phone: receiverPhone,
        },
      ],
      isPODEnabled: true,
      metadata: {
        ...Object.fromEntries(
          Object.entries(metadata || {}).map(([key, value]) => [key, String(value ?? "")]),
        ),
        orderGroupId: normalizeText(orderGroupId),
      },
    },
  };
  const orderPayload = await requestLalamove({
    config,
    method: "POST",
    path: "/v3/orders",
    body: orderBody,
    fetchImpl,
    nowMs,
    requestId: requestIdFactory(),
  });
  const order = orderPayload?.data || {};
  const orderId = normalizeText(order.orderId);
  if (!orderId) {
    throw createCourierError(
      "Lalamove did not return an order ID.",
      "LALAMOVE_ORDER_INVALID",
      502,
    );
  }

  return {
    provider: "lalamove",
    mode: "live",
    trackingNumber: orderId,
    providerShipmentId: orderId,
    quotationId,
    labelUrl: normalizeText(order.shareLink),
    status: normalizeLalamoveStatus(order.status || "ASSIGNING_DRIVER"),
    providerStatus: normalizeText(order.status),
    priceBreakdown: order.priceBreakdown || quotation.priceBreakdown || null,
    environment: config.environment,
  };
}

async function createShipment(options = {}) {
  const config = getCourierProviderConfig(options.env);
  if (config.provider === "lalamove") {
    return createLalamoveShipment(options);
  }

  const trackingNumber = normalizeText(options.trackingHint)
    || buildStubTrackingNumber(options.orderGroupId, "manual");
  return {
    provider: "manual",
    mode: "manual",
    trackingNumber,
    providerShipmentId: "",
    labelUrl: "",
    status: "created",
  };
}

async function getTracking(trackingNumber, options = {}) {
  const number = normalizeText(trackingNumber);
  if (!number) {
    return { trackingNumber: "", status: "unknown", events: [] };
  }
  const config = getCourierProviderConfig(options.env);
  if (config.provider !== "lalamove") {
    return {
      provider: "manual",
      trackingNumber: number,
      status: "manual",
      events: [],
    };
  }
  const payload = await requestLalamove({
    config,
    method: "GET",
    path: `/v3/orders/${encodeURIComponent(number)}`,
    fetchImpl: options.fetchImpl,
    nowMs: options.nowMs,
    requestId: options.requestId || crypto.randomUUID(),
  });
  const order = payload?.data || {};
  return {
    provider: "lalamove",
    trackingNumber: normalizeText(order.orderId) || number,
    providerShipmentId: normalizeText(order.orderId) || number,
    status: normalizeLalamoveStatus(order.status),
    providerStatus: normalizeText(order.status),
    driverId: normalizeText(order.driverId),
    shareLink: normalizeText(order.shareLink),
    stops: Array.isArray(order.stops) ? order.stops : [],
    events: [],
  };
}

function verifyLalamoveWebhook({
  payload,
  path = DEFAULT_WEBHOOK_PATH,
  apiKey,
  secret,
  toleranceSeconds = 300,
  nowSeconds = Math.floor(Date.now() / 1000),
}) {
  if (!payload || typeof payload !== "object" || !apiKey || !secret) {
    return false;
  }
  if (normalizeText(payload.apiKey) !== normalizeText(apiKey)) {
    return false;
  }
  const timestampText = String(payload.timestamp ?? "").trim();
  const timestamp = Number(timestampText);
  if (!timestampText || !Number.isFinite(timestamp) || timestamp <= 0) {
    return false;
  }
  const timestampSeconds = timestamp > 10_000_000_000 ? timestamp / 1000 : timestamp;
  const tolerance = Math.max(0, Number(toleranceSeconds) || 0);
  if (tolerance && Math.abs(Number(nowSeconds) - timestampSeconds) > tolerance) {
    return false;
  }
  const expected = createLalamoveSignature({
    timestamp: timestampText,
    method: "POST",
    path,
    body: JSON.stringify(payload.data ?? {}),
    secret,
  });
  return signaturesMatch(expected, payload.signature);
}

module.exports = {
  DEFAULT_WEBHOOK_PATH,
  getCourierProviderConfig,
  createShipment,
  getTracking,
  buildStubTrackingNumber,
  createLalamoveSignature,
  normalizeLalamoveStatus,
  verifyLalamoveWebhook,
};
