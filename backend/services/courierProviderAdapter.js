"use strict";

/**
 * Courier provider adapter.
 *
 * COURIER_PROVIDER=manual|lalamove (default: manual)
 * Lalamove credentials optional — without them the Lalamove path returns a
 * deterministic stub tracking number so packing/ship flows stay testable.
 */

function getCourierProviderConfig(env = process.env) {
  const provider = String(env.COURIER_PROVIDER ?? "manual")
    .trim()
    .toLowerCase() || "manual";
  const apiKey = String(env.LALAMOVE_API_KEY ?? "").trim();
  const apiSecret = String(env.LALAMOVE_API_SECRET ?? "").trim();
  const webhookSecret = String(env.LALAMOVE_WEBHOOK_SECRET ?? "").trim();
  const live = provider === "lalamove" && Boolean(apiKey && apiSecret);
  return {
    provider: provider === "lalamove" ? "lalamove" : "manual",
    apiKey,
    apiSecret,
    webhookSecret,
    live,
  };
}

function buildStubTrackingNumber(orderGroupId, provider = "lalamove") {
  const safeGroup = String(orderGroupId || "order")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(-10)
    .toUpperCase() || "ORDER";
  const stamp = Date.now().toString(36).toUpperCase();
  const prefix = provider === "lalamove" ? "LALA" : "MAN";
  return `${prefix}-${safeGroup}-${stamp}`;
}

async function createLalamoveShipment({
  orderGroupId,
  trackingHint = "",
  recipientName = "",
  recipientPhone = "",
  recipientAddress = "",
  env = process.env,
}) {
  const config = getCourierProviderConfig(env);
  const existing = String(trackingHint || "").trim();
  if (existing) {
    return {
      provider: "lalamove",
      mode: "passthrough",
      trackingNumber: existing,
      providerShipmentId: "",
      labelUrl: "",
      status: "created",
    };
  }

  // Live Lalamove Quotation + Order APIs require market-specific signing.
  // Until credentials + market config are production-ready, return a durable stub.
  if (!config.live) {
    const trackingNumber = buildStubTrackingNumber(orderGroupId, "lalamove");
    return {
      provider: "lalamove",
      mode: "stub",
      trackingNumber,
      providerShipmentId: `stub_${trackingNumber}`,
      labelUrl: "",
      status: "created",
      recipientName,
      recipientPhone,
      recipientAddress,
    };
  }

  // Placeholder for live booking — keep stub shape until market signing lands.
  const trackingNumber = buildStubTrackingNumber(orderGroupId, "lalamove");
  return {
    provider: "lalamove",
    mode: "live-pending",
    trackingNumber,
    providerShipmentId: `pending_${trackingNumber}`,
    labelUrl: "",
    status: "created",
  };
}

async function createShipment(options = {}) {
  const config = getCourierProviderConfig(options.env);
  if (config.provider === "lalamove") {
    return createLalamoveShipment(options);
  }

  const trackingNumber =
    String(options.trackingHint || "").trim()
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
  const number = String(trackingNumber || "").trim();
  if (!number) {
    return { trackingNumber: "", status: "unknown", events: [] };
  }
  const config = getCourierProviderConfig(options.env);
  return {
    provider: config.provider,
    trackingNumber: number,
    status: "in_transit",
    events: [
      {
        status: "created",
        at: new Date().toISOString(),
        note: config.live
          ? "Awaiting courier webhook updates."
          : "Local courier adapter (stub/manual).",
      },
    ],
  };
}

module.exports = {
  getCourierProviderConfig,
  createShipment,
  getTracking,
  buildStubTrackingNumber,
};
