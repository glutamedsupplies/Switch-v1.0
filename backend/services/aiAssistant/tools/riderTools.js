"use strict";

const {
  RISK,
  money,
  peso,
  cleanText,
  toInt,
  toolError,
  ok,
  promptAction,
  notice,
  callApi,
  formatDateTime,
} = require("./common");

const STATUS_LABELS = Object.freeze({
  RIDER_ASSIGNED: "Assigned to you",
  RIDER_TO_PICKUP: "Heading to pickup",
  ARRIVED_AT_PICKUP: "At pickup",
  PICKED_UP: "Picked up",
  IN_TRANSIT: "On the way to customer",
  ARRIVED_AT_DROPOFF: "At drop-off",
  DELIVERED: "Delivered",
  FAILED_DELIVERY: "Delivery failed",
  RETURN_REQUIRED: "Return to seller",
  RETURNING_TO_SELLER: "Returning to seller",
  RETURNED_TO_SELLER: "Returned to seller",
  CANCELLED: "Cancelled",
});
const PICKUP_STAGE = new Set(["RIDER_ASSIGNED", "RIDER_TO_PICKUP", "ARRIVED_AT_PICKUP"]);
const DROPOFF_STAGE = new Set(["PICKED_UP", "IN_TRANSIT", "ARRIVED_AT_DROPOFF"]);
const RETURN_STAGE = new Set(["RETURN_REQUIRED", "RETURNING_TO_SELLER"]);

const STEP_DEFS = Object.freeze({
  "start-pickup": { label: "Head to pickup", from: ["RIDER_ASSIGNED"], done: "You're on the way to the seller." },
  "arrived-pickup": { label: "Arrived at pickup", from: ["RIDER_ASSIGNED", "RIDER_TO_PICKUP"], done: "Marked as arrived at pickup." },
  "confirm-pickup": {
    label: "Confirm pickup",
    from: ["ARRIVED_AT_PICKUP"],
    pin: { name: "pin", label: "Pickup PIN from the seller" },
    done: "Pickup confirmed. The parcel is with you.",
  },
  "start-delivery": { label: "Start delivery", from: ["PICKED_UP"], done: "Delivery started. Head to the customer." },
  "arrived-dropoff": { label: "Arrived at drop-off", from: ["PICKED_UP", "IN_TRANSIT"], done: "Marked as arrived. The customer was notified." },
  "collect-cod": { label: "Cash collected", from: ["ARRIVED_AT_DROPOFF"], done: "Cash collection recorded." },
  complete: {
    label: "Confirm delivery",
    from: ["ARRIVED_AT_DROPOFF"],
    pin: { name: "pin", label: "Delivery PIN from the customer" },
    done: "Delivery completed. Great job!",
  },
});

const ISSUE_CATEGORIES = Object.freeze({
  CANNOT_FIND_SELLER: "Cannot find seller",
  SELLER_NOT_READY: "Seller not ready",
  CUSTOMER_UNREACHABLE: "Customer unreachable",
  WRONG_LOCATION: "Wrong location",
  PACKAGE_DAMAGED: "Package damaged",
  VEHICLE_PROBLEM: "Vehicle problem",
  ACCIDENT_EMERGENCY: "Accident / emergency",
  SAFETY_CONCERN: "Safety concern",
  PAYMENT_ISSUE: "Payment issue",
  ACCOUNT_HELP: "Account help",
  OTHER: "Other",
});
const SAFETY_CATEGORIES = new Set(["ACCIDENT_EMERGENCY", "SAFETY_CONCERN"]);

function isCod(job) {
  return String(job?.paymentMethod || "").toUpperCase() === "COD" && money(job?.codAmount) > 0;
}

function statusLabel(status) {
  return STATUS_LABELS[status] || cleanText(status, 40) || "Unknown";
}

function mapsUrl(point) {
  if (!Number.isFinite(Number(point?.lat)) || !Number.isFinite(Number(point?.lng)) || point.lat === null) return "";
  return `https://www.google.com/maps/dir/?api=1&destination=${Number(point.lat)},${Number(point.lng)}`;
}

function sanitizePin(value) {
  const pin = String(value ?? "").replace(/\D/g, "");
  return pin.length >= 4 && pin.length <= 8 ? pin : "";
}

/** The steps the backend state machine allows next; the AI never picks a status itself. */
function nextSteps(job) {
  const status = job?.status;
  switch (status) {
    case "RIDER_ASSIGNED":
      return ["start-pickup", "arrived-pickup"];
    case "RIDER_TO_PICKUP":
      return ["arrived-pickup"];
    case "ARRIVED_AT_PICKUP":
      return ["confirm-pickup"];
    case "PICKED_UP":
      return ["start-delivery", "arrived-dropoff"];
    case "IN_TRANSIT":
      return ["arrived-dropoff"];
    case "ARRIVED_AT_DROPOFF":
      return isCod(job) && !job.codCollected ? ["collect-cod"] : ["complete"];
    default:
      return [];
  }
}

function nextStepText(job) {
  const status = job?.status;
  if (status === "RIDER_ASSIGNED") return `Go to ${job.pickup?.name || "the seller"} to pick up the parcel.`;
  if (status === "RIDER_TO_PICKUP") return `Head to ${job.pickup?.name || "the seller"}. Tap "Arrived at pickup" when you're there.`;
  if (status === "ARRIVED_AT_PICKUP") return "Ask the seller for the pickup PIN, then confirm pickup.";
  if (status === "PICKED_UP") return "Start the delivery and head to the customer.";
  if (status === "IN_TRANSIT") return `Deliver to ${job.dropoff?.name || "the customer"}. Tap "Arrived at drop-off" when you're there.`;
  if (status === "ARRIVED_AT_DROPOFF") {
    if (isCod(job) && !job.codCollected) return `Collect exactly ${peso(job.codAmount)} cash, then confirm delivery with the customer's PIN.`;
    return "Ask the customer for the delivery PIN to complete the delivery.";
  }
  if (RETURN_STAGE.has(status)) return "This parcel must go back to the seller. Open the job to follow the return steps.";
  return "";
}

function compactJob(job) {
  return {
    deliveryId: job.id,
    code: job.deliveryCode,
    status: job.status,
    statusLabel: statusLabel(job.status),
    pickupName: job.pickup?.name || "",
    pickupArea: job.pickup?.area || "",
    pickupAddress: job.pickup?.address || "",
    dropoffName: job.dropoff?.name || "",
    dropoffArea: job.dropoff?.area || "",
    dropoffAddress: job.dropoff?.address || "",
    payment: isCod(job) ? "COD" : "Prepaid",
    codAmount: isCod(job) ? money(job.codAmount) : 0,
    codCollected: Boolean(job.codCollected),
    earning: money(job.riderEarning),
    distanceKm: job.distanceKm,
    nextStep: nextStepText(job),
  };
}

function createRiderTools() {
  async function loadJobs(ctx) {
    const body = await callApi(ctx, "GET", "/api/rider/jobs");
    return Array.isArray(body.jobs) ? body.jobs : [];
  }

  async function loadJob(ctx, deliveryId) {
    const body = await callApi(ctx, "GET", `/api/rider/jobs/${encodeURIComponent(deliveryId)}`);
    return body.job || null;
  }

  async function resolveJob(ctx, args = {}) {
    const requested = cleanText(args.deliveryId, 80);
    if (requested) {
      const job = await loadJob(ctx, requested);
      if (job) ctx.state.currentDeliveryId = job.id;
      return job;
    }
    const jobs = await loadJobs(ctx);
    const remembered = jobs.find((job) => job.id === ctx.state.currentDeliveryId);
    const job = remembered || jobs[0] || null;
    ctx.state.currentDeliveryId = job ? job.id : "";
    return job;
  }

  async function loadOffer(ctx) {
    const body = await callApi(ctx, "GET", "/api/rider/offers/current");
    return body.offer || null;
  }

  async function loadSupport(ctx) {
    try {
      const body = await callApi(ctx, "GET", "/api/rider/meta");
      return body.support || {};
    } catch {
      return {};
    }
  }

  function stepAction(ctx, job, step, style = "primary") {
    const def = STEP_DEFS[step];
    const args = { deliveryId: job.id, step, expectedStatus: job.status };
    let label = def.label;
    if (step === "collect-cod") label = `I collected ${peso(job.codAmount)}`;
    const summary = `${label} · ${job.deliveryCode}`;
    const { token, expiresAt } = ctx.confirm({ tool: "rider_step", args, summary });
    return {
      label,
      kind: "confirm",
      token,
      expiresAt,
      style,
      inputs: def.pin ? [{ name: def.pin.name, label: def.pin.label, type: "pin", required: true }] : undefined,
    };
  }

  function deliveryCard(ctx, job, { withActions = true, focus = "" } = {}) {
    const actions = [];
    if (withActions) {
      for (const [index, step] of nextSteps(job).entries()) actions.push(stepAction(ctx, job, step, index === 0 ? "primary" : "secondary"));
      if (job.status === "ARRIVED_AT_DROPOFF" && (!isCod(job) || job.codCollected)) {
        actions.push({ label: "Use photo proof", kind: "navigate", target: "rider_job", deliveryId: job.id, style: "secondary" });
      }
      const focusPoint = PICKUP_STAGE.has(job.status) || RETURN_STAGE.has(job.status) ? "pickup" : "dropoff";
      const point = focus === "dropoff" ? job.dropoff : focus === "pickup" ? job.pickup : job[focusPoint];
      const url = mapsUrl(point);
      if (url) actions.push({ label: "Navigate", kind: "open_url", url, style: "secondary" });
      if (job.pickup?.phone && (focus === "pickup" || PICKUP_STAGE.has(job.status))) {
        actions.push({ label: "Call seller", kind: "call", phone: job.pickup.phone, style: "secondary" });
      }
      if (job.dropoff?.phone && (focus === "dropoff" || DROPOFF_STAGE.has(job.status))) {
        actions.push({ label: "Call customer", kind: "call", phone: job.dropoff.phone, style: "secondary" });
      }
      actions.push(promptAction("Report issue", "May problema sa delivery"));
      actions.push({ label: "Open job", kind: "navigate", target: "rider_job", deliveryId: job.id, style: "ghost" });
    }
    return {
      type: "delivery_card",
      deliveryId: job.id,
      code: job.deliveryCode,
      orderReference: job.orderReference || "",
      status: job.status,
      statusLabel: statusLabel(job.status),
      nextStep: nextStepText(job),
      focus: focus || (DROPOFF_STAGE.has(job.status) ? "dropoff" : "pickup"),
      pickup: {
        name: job.pickup?.name || "",
        address: job.pickup?.address || "",
        area: job.pickup?.area || "",
        phone: job.pickup?.phone || "",
      },
      dropoff: {
        name: job.dropoff?.name || "",
        address: job.dropoff?.address || "",
        area: job.dropoff?.area || "",
        phone: job.dropoff?.phone || "",
      },
      payment: {
        method: isCod(job) ? "COD" : "Prepaid",
        codAmount: isCod(job) ? money(job.codAmount) : 0,
        codCollected: Boolean(job.codCollected),
      },
      earning: money(job.riderEarning),
      distanceKm: job.distanceKm,
      estimatedMinutes: job.estimatedMinutes,
      packageCount: job.packageCount,
      packageNotes: cleanText(job.packageNotes, 200),
      actions,
    };
  }

  function offerCard(ctx, offer) {
    const accept = ctx.confirm({
      tool: "accept_delivery",
      args: { offerId: offer.offerId, deliveryId: offer.deliveryId },
      summary: `Accept delivery ${offer.deliveryCode}`,
    });
    const decline = ctx.confirm({
      tool: "decline_delivery",
      args: { offerId: offer.offerId, deliveryId: offer.deliveryId },
      summary: `Decline delivery ${offer.deliveryCode}`,
    });
    return {
      type: "delivery_card",
      variant: "offer",
      deliveryId: offer.deliveryId,
      code: offer.deliveryCode,
      status: "OFFERED",
      statusLabel: "New delivery offer",
      expiresAt: offer.expiresAt,
      secondsRemaining: offer.secondsRemaining,
      pickup: { area: offer.pickupArea || "" },
      dropoff: { area: offer.dropoffArea || "" },
      payment: { method: offer.isCod ? "COD" : "Prepaid", codAmount: offer.isCod ? money(offer.codAmount) : 0, codCollected: false },
      earning: money(offer.riderEarning),
      distanceKm: offer.distanceKm,
      distanceToPickupKm: offer.distanceToPickupKm,
      estimatedMinutes: offer.estimatedMinutes,
      packageCount: offer.packageCount,
      packageNotes: cleanText(offer.packageNotes, 200),
      actions: [
        { label: `Accept · ${peso(offer.riderEarning)}`, kind: "confirm", token: accept.token, expiresAt: accept.expiresAt, style: "primary" },
        { label: "Decline", kind: "confirm", token: decline.token, expiresAt: decline.expiresAt, style: "secondary" },
      ],
    };
  }

  function compactOffer(offer) {
    return {
      code: offer.deliveryCode,
      pickupArea: offer.pickupArea,
      dropoffArea: offer.dropoffArea,
      distanceKm: offer.distanceKm,
      distanceToPickupKm: offer.distanceToPickupKm,
      earning: money(offer.riderEarning),
      payment: offer.isCod ? "COD" : "Prepaid",
      codAmount: offer.isCod ? money(offer.codAmount) : 0,
      secondsRemaining: offer.secondsRemaining,
    };
  }

  async function noActiveJobResult(ctx) {
    const offer = await loadOffer(ctx);
    if (offer) {
      return ok({
        message: `You have no active delivery, but there's a new offer: ${offer.pickupArea || "Pickup"} → ${offer.dropoffArea || "Drop-off"}, ${peso(offer.riderEarning)} earning. It expires in about ${Math.max(1, Math.round(offer.secondsRemaining / 60))} min.`,
        blocks: [offerCard(ctx, offer)],
        data: { activeDelivery: null, offer: compactOffer(offer) },
      });
    }
    return ok({
      message: "You don't have an active delivery right now. Stay online to receive new offers.",
      blocks: [],
      data: { activeDelivery: null, offer: null },
      suggestions: ["Show my earnings", "Go online", "Delivery history"],
    });
  }

  /** Suggests the real next step when the rider asks for a transition the job can't take yet. */
  async function stepForIntent(ctx, args, allowed, intentLabel) {
    const job = await resolveJob(ctx, args);
    if (!job) return noActiveJobResult(ctx);
    const steps = nextSteps(job).filter((step) => allowed.includes(step));
    if (!steps.length) {
      const next = nextStepText(job);
      return ok({
        message: `This delivery is "${statusLabel(job.status)}", so I can't ${intentLabel} yet.${next ? ` Next: ${next}` : ""}`,
        blocks: [deliveryCard(ctx, job)],
        data: { delivery: compactJob(job), allowed: false },
      });
    }
    const card = deliveryCard(ctx, job);
    const primary = steps.map((step, index) => stepAction(ctx, job, step, index === 0 ? "primary" : "secondary"));
    card.actions = [...primary, ...card.actions.filter((action) => action.kind !== "confirm")];
    const def = STEP_DEFS[steps[0]];
    const codLine = steps[0] === "collect-cod" ? ` Collect exactly ${peso(job.codAmount)} first.` : "";
    return ok({
      message: `${nextStepText(job) || def.label}${codLine} Tap "${primary[0].label}" to confirm${def.pin ? " and enter the PIN" : ""}.`,
      blocks: [card],
      data: { delivery: compactJob(job), awaitingConfirmation: true, step: steps[0] },
    });
  }

  function issueBlock(ctx, job, category, description, support) {
    const categoryCode = ISSUE_CATEGORIES[category] ? category : "OTHER";
    const text = cleanText(description, 500);
    const ticket = ctx.confirm({
      tool: "report_delivery_issue",
      args: { category: categoryCode, description: text, deliveryId: job?.id || "" },
      summary: `Report: ${ISSUE_CATEGORIES[categoryCode]}`,
    });
    const actions = [];
    if (SAFETY_CATEGORIES.has(categoryCode)) actions.push({ label: "Call 911", kind: "call", phone: "911", style: "danger" });
    if (categoryCode === "CUSTOMER_UNREACHABLE" && job?.dropoff?.phone) {
      actions.push({ label: "Call customer", kind: "call", phone: job.dropoff.phone, style: "primary" });
    }
    if (["CANNOT_FIND_SELLER", "SELLER_NOT_READY"].includes(categoryCode) && job?.pickup?.phone) {
      actions.push({ label: "Call seller", kind: "call", phone: job.pickup.phone, style: "primary" });
    }
    actions.push({
      label: categoryCode === "CUSTOMER_UNREACHABLE" ? "Report unreachable" : "Send report to support",
      kind: "confirm",
      token: ticket.token,
      expiresAt: ticket.expiresAt,
      style: SAFETY_CATEGORIES.has(categoryCode) ? "danger" : "secondary",
    });
    if (support.hotline) actions.push({ label: "Contact support", kind: "call", phone: support.hotline, style: "secondary" });
    if (job) actions.push({ label: "Open job", kind: "navigate", target: "rider_job", deliveryId: job.id, style: "ghost" });
    return {
      type: "confirmation",
      variant: "issue",
      token: ticket.token,
      expiresAt: ticket.expiresAt,
      risk: "high",
      title: ISSUE_CATEGORIES[categoryCode],
      lines: [
        ...(job ? [{ label: "Delivery", value: `${job.deliveryCode} · ${statusLabel(job.status)}` }] : []),
        ...(text ? [{ label: "Details", value: text }] : []),
      ],
      warning: SAFETY_CATEGORIES.has(categoryCode) ? "If anyone is hurt or in danger, call 911 first. Switch is not an emergency service." : "",
      actions,
      confirmLabel: "Send report to support",
      cancelLabel: "Not now",
    };
  }

  const tools = [
    {
      name: "get_current_delivery",
      risk: RISK.LOW,
      description: "The rider's current active delivery, its status and the next step. Shows a pending offer if there is no active delivery.",
      parameters: { type: "object", properties: { deliveryId: { type: "string" } } },
      async run(ctx, args = {}) {
        const job = await resolveJob(ctx, args);
        if (!job) return noActiveJobResult(ctx);
        const jobs = await loadJobs(ctx).catch(() => [job]);
        const others = jobs.filter((entry) => entry.id !== job.id);
        return ok({
          message: `${job.deliveryCode}: ${statusLabel(job.status)}. ${nextStepText(job)}`.trim(),
          blocks: [
            deliveryCard(ctx, job),
            others.length ? notice(`You have ${others.length} more active deliver${others.length === 1 ? "y" : "ies"}: ${others.map((entry) => entry.deliveryCode).join(", ")}.`) : null,
          ],
          data: { delivery: compactJob(job), otherActive: others.map((entry) => entry.deliveryCode) },
          entity: { type: "delivery", id: job.id },
        });
      },
    },
    {
      name: "get_available_delivery_offer",
      risk: RISK.LOW,
      description: "The delivery offer currently waiting for this rider, with Accept/Decline buttons.",
      parameters: { type: "object", properties: {} },
      async run(ctx) {
        const offer = await loadOffer(ctx);
        if (!offer) {
          return ok({ message: "No delivery offers for you right now. Stay online and I'll show new offers here.", data: { offer: null }, suggestions: ["Go online", "Show my earnings"] });
        }
        return ok({
          message: `New offer: ${offer.pickupArea || "Pickup"} → ${offer.dropoffArea || "Drop-off"} · ${offer.distanceKm ?? "?"} km · ${peso(offer.riderEarning)} earning${offer.isCod ? ` · COD ${peso(offer.codAmount)}` : ""}.`,
          blocks: [offerCard(ctx, offer)],
          data: { offer: compactOffer(offer) },
        });
      },
    },
    {
      name: "get_pickup_details",
      risk: RISK.LOW,
      description: "Pickup (seller) details for the current delivery.",
      parameters: { type: "object", properties: { deliveryId: { type: "string" } } },
      async run(ctx, args = {}) {
        const job = await resolveJob(ctx, args);
        if (!job) return noActiveJobResult(ctx);
        const pickup = job.pickup || {};
        const visible = Boolean(pickup.address || pickup.name);
        return ok({
          message: visible
            ? `Pickup: ${pickup.name || "Seller"}${pickup.address ? `, ${pickup.address}` : ""}.${job.packageNotes ? ` Note: ${cleanText(job.packageNotes, 160)}` : ""}`
            : "Pickup details are no longer shown for this delivery.",
          blocks: [deliveryCard(ctx, job, { focus: "pickup" })],
          data: { pickup: { name: pickup.name || "", address: pickup.address || "", area: pickup.area || "" }, status: job.status },
        });
      },
    },
    {
      name: "get_dropoff_details",
      risk: RISK.LOW,
      description: "Drop-off (customer) details. Customer contact is only visible after pickup.",
      parameters: { type: "object", properties: { deliveryId: { type: "string" } } },
      async run(ctx, args = {}) {
        const job = await resolveJob(ctx, args);
        if (!job) return noActiveJobResult(ctx);
        const dropoff = job.dropoff || {};
        const message = dropoff.address
          ? `Drop-off: ${dropoff.name || "Customer"}, ${dropoff.address}.`
          : `Drop-off area: ${dropoff.area || "not set"}. The full address and contact appear after you pick up the parcel.`;
        return ok({
          message,
          blocks: [deliveryCard(ctx, job, { focus: "dropoff" })],
          data: { dropoff: { name: dropoff.name || "", address: dropoff.address || "", area: dropoff.area || "" }, status: job.status },
        });
      },
    },
    {
      name: "get_delivery_status",
      risk: RISK.LOW,
      description: "Status of the current delivery.",
      parameters: { type: "object", properties: { deliveryId: { type: "string" } } },
      async run(ctx, args = {}) {
        const job = await resolveJob(ctx, args);
        if (!job) return noActiveJobResult(ctx);
        return ok({
          message: `${job.deliveryCode} is "${statusLabel(job.status)}". ${nextStepText(job)}`.trim(),
          blocks: [deliveryCard(ctx, job)],
          data: { delivery: compactJob(job) },
        });
      },
    },
    {
      name: "get_cod_amount",
      risk: RISK.LOW,
      description: "Cash-on-delivery amount to collect, from the backend. The rider cannot change this amount.",
      parameters: {
        type: "object",
        properties: {
          deliveryId: { type: "string" },
          requestedChange: { type: "number", description: "Set when the rider asks to change the amount; it is always refused." },
        },
      },
      async run(ctx, args = {}) {
        const job = await resolveJob(ctx, args);
        if (!job) return noActiveJobResult(ctx);
        const cod = isCod(job);
        const refusal = Number(args.requestedChange) > 0
          ? "I can't change the COD amount. It comes from the order and only the system can adjust it. If the customer disputes it, report a payment issue. "
          : "";
        const message = cod
          ? `${refusal}Collect exactly ${peso(job.codAmount)} cash for ${job.deliveryCode}.${job.codCollected ? " You've already recorded this collection." : ""}`
          : `${refusal}${job.deliveryCode} is prepaid. Do not collect any cash.`;
        const blocks = [deliveryCard(ctx, job)];
        if (refusal) blocks.unshift(notice("The COD amount can't be changed through the assistant.", "warning"));
        if (refusal) blocks.push({ type: "choice_list", title: "Need help?", options: [promptAction("Report payment issue", "Payment issue with the customer")] });
        return ok({
          message,
          blocks,
          data: { code: job.deliveryCode, cod, codAmount: cod ? money(job.codAmount) : 0, codCollected: Boolean(job.codCollected), changeRefused: Boolean(refusal) },
          events: refusal ? ["rider_cod_change_refused"] : [],
        });
      },
    },
    {
      name: "get_rider_earnings",
      risk: RISK.LOW,
      description: "Rider earnings (today/week/month, balances) shown separately from COD cash held.",
      parameters: { type: "object", properties: {} },
      async run(ctx) {
        const [earningsBody, cashBody] = await Promise.all([
          callApi(ctx, "GET", "/api/rider/earnings"),
          callApi(ctx, "GET", "/api/rider/cash"),
        ]);
        const earnings = earningsBody.earnings || {};
        const cash = cashBody.cash || {};
        const balances = earnings.balances || {};
        const balanceRows = Object.entries(balances)
          .filter(([, value]) => Number.isFinite(Number(value)))
          .map(([key, value]) => ({ label: key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()), value: peso(value) }));
        return ok({
          message: `Today you earned ${peso(earnings.today)} from ${toInt(earnings.todayDeliveries, 0)} deliver${toInt(earnings.todayDeliveries, 0) === 1 ? "y" : "ies"}. COD cash to remit: ${peso(cash.outstanding)} (this is the customer's money, not your earnings).`,
          blocks: [
            {
              type: "earnings_summary",
              earnings: [
                { label: "Today", value: peso(earnings.today) },
                { label: "This week", value: peso(earnings.week) },
                { label: "This month", value: peso(earnings.month) },
                ...balanceRows,
              ],
              cash: [
                { label: "COD collected", value: peso(cash.collected) },
                { label: "Remitted (awaiting check)", value: peso(cash.remittedAwaitingVerification) },
                { label: "Verified", value: peso(cash.verified) },
                { label: "Cash to remit", value: peso(cash.outstanding), emphasis: true },
              ],
              footnote: "Earnings are your pay. COD cash belongs to customers' orders and must be remitted.",
              actions: [{ label: "Open wallet", kind: "navigate", target: "rider_wallet", style: "secondary" }],
            },
          ],
          data: {
            earnings: { today: money(earnings.today), week: money(earnings.week), month: money(earnings.month), todayDeliveries: toInt(earnings.todayDeliveries, 0) },
            codCash: { collected: money(cash.collected), outstanding: money(cash.outstanding) },
          },
        });
      },
    },
    {
      name: "get_delivery_history",
      risk: RISK.LOW,
      description: "The rider's recent finished deliveries.",
      parameters: { type: "object", properties: { limit: { type: "number" } } },
      async run(ctx, args = {}) {
        const limit = Math.min(10, Math.max(1, toInt(args.limit, 5)));
        const body = await callApi(ctx, "GET", "/api/rider/history", { query: { limit } });
        const history = Array.isArray(body.history) ? body.history : [];
        if (!history.length) return ok({ message: "You don't have finished deliveries yet.", data: { history: [] } });
        return ok({
          message: `Your last ${history.length} deliver${history.length === 1 ? "y" : "ies"}:`,
          blocks: [
            {
              type: "inventory_table",
              title: "Recent deliveries",
              columns: ["Code", "Route", "Status", "Earning", "Finished"],
              rows: history.map((entry) => [
                entry.deliveryCode,
                cleanText(entry.route, 60),
                cleanText(entry.statusLabel, 30),
                peso(entry.earning),
                entry.finishedAt ? formatDateTime(Date.parse(entry.finishedAt)) : "",
              ]),
            },
          ],
          data: { history: history.map((entry) => ({ code: entry.deliveryCode, status: entry.statusLabel, earning: money(entry.earning), route: entry.route })) },
        });
      },
    },
    {
      name: "accept_delivery",
      risk: RISK.HIGH,
      description: "Accept the pending delivery offer. Shows the offer with an Accept button the rider must tap.",
      parameters: { type: "object", properties: {} },
      async prepare(ctx) {
        const offer = await loadOffer(ctx);
        if (!offer) return ok({ message: "There's no offer to accept right now.", data: { offer: null } });
        return ok({
          message: `Tap "Accept" to take ${offer.deliveryCode} (${peso(offer.riderEarning)} earning).`,
          blocks: [offerCard(ctx, offer)],
          data: { awaitingConfirmation: true, offer: compactOffer(offer) },
        });
      },
      async execute(ctx, args) {
        const body = await callApi(ctx, "POST", `/api/rider/offers/${encodeURIComponent(args.offerId)}/accept`, { body: {} });
        if (!body.accepted || !body.job) {
          return ok({ message: "The offer is no longer available.", blocks: [notice("This offer was taken or expired.", "warning")], data: { accepted: false } });
        }
        ctx.state.currentDeliveryId = body.job.id;
        return ok({
          message: `Accepted ${body.job.deliveryCode}. ${nextStepText(body.job)}`,
          blocks: [deliveryCard(ctx, body.job)],
          data: { accepted: true, delivery: compactJob(body.job) },
          entity: { type: "delivery", id: body.job.id },
          events: ["rider_offer_accepted"],
          clientEffects: { riderRefresh: true },
        });
      },
    },
    {
      name: "decline_delivery",
      risk: RISK.HIGH,
      description: "Decline the pending delivery offer. Shows the offer with a Decline button the rider must tap.",
      parameters: { type: "object", properties: {} },
      async prepare(ctx) {
        const offer = await loadOffer(ctx);
        if (!offer) return ok({ message: "There's no offer to decline right now.", data: { offer: null } });
        return ok({
          message: `Tap "Decline" to pass on ${offer.deliveryCode}.`,
          blocks: [offerCard(ctx, offer)],
          data: { awaitingConfirmation: true, offer: compactOffer(offer) },
        });
      },
      async execute(ctx, args) {
        await callApi(ctx, "POST", `/api/rider/offers/${encodeURIComponent(args.offerId)}/decline`, { body: { reason: "Declined in Switch Rider AI" } });
        return ok({ message: "Offer declined. You'll keep receiving new offers while online.", blocks: [notice("Offer declined.", "info")], data: { declined: true }, clientEffects: { riderRefresh: true } });
      },
    },
    {
      name: "mark_arrived",
      risk: RISK.HIGH,
      description: "Mark arrival at pickup or drop-off, depending on the delivery's current stage. The rider must tap to confirm.",
      parameters: { type: "object", properties: { deliveryId: { type: "string" } } },
      prepare: (ctx, args) => stepForIntent(ctx, args, ["arrived-pickup", "arrived-dropoff"], "mark you as arrived"),
    },
    {
      name: "advance_delivery",
      risk: RISK.HIGH,
      description: "Start heading to pickup or start the delivery trip, whichever is next. The rider must tap to confirm.",
      parameters: { type: "object", properties: { deliveryId: { type: "string" } } },
      prepare: (ctx, args) => stepForIntent(ctx, args, ["start-pickup", "start-delivery", "arrived-pickup", "arrived-dropoff"], "move this delivery forward"),
    },
    {
      name: "confirm_pickup",
      risk: RISK.HIGH,
      description: "Confirm pickup with the seller's pickup PIN. The rider enters the PIN on the confirmation card.",
      parameters: { type: "object", properties: { deliveryId: { type: "string" } } },
      prepare: (ctx, args) => stepForIntent(ctx, args, ["confirm-pickup"], "confirm pickup"),
    },
    {
      name: "confirm_delivery",
      risk: RISK.HIGH,
      description: "Record COD collection (if needed) and complete the delivery with the customer's PIN. The rider enters the PIN on the card.",
      parameters: { type: "object", properties: { deliveryId: { type: "string" } } },
      prepare: (ctx, args) => stepForIntent(ctx, args, ["collect-cod", "complete"], "complete the delivery"),
    },
    {
      name: "rider_step",
      risk: RISK.HIGH,
      internal: true,
      description: "Executes one confirmed delivery step. Only reachable through a confirmation token.",
      parameters: { type: "object", properties: {} },
      async prepare(ctx, args) {
        return stepForIntent(ctx, args, Object.keys(STEP_DEFS), "do that");
      },
      async execute(ctx, args, inputs = {}) {
        const def = STEP_DEFS[args.step];
        if (!def) throw toolError("Unknown delivery step.", { status: 422 });
        const job = await loadJob(ctx, args.deliveryId);
        if (!job) throw toolError("Delivery not found.", { status: 404 });
        if (job.status !== args.expectedStatus && !def.from.includes(job.status)) {
          return ok({
            message: `This delivery is now "${statusLabel(job.status)}", so that step no longer applies. Here's the latest.`,
            blocks: [deliveryCard(ctx, job)],
            data: { delivery: compactJob(job), stale: true },
          });
        }
        const body = {};
        if (def.pin) {
          const pin = sanitizePin(inputs[def.pin.name]);
          if (!pin) throw toolError("Enter the PIN (4–8 digits) to continue.", { status: 422, code: "AI_NEEDS_CLARIFICATION" });
          body.pin = pin;
        }
        if (args.step === "complete") body.method = "PIN";
        if (args.step === "collect-cod") body.amount = money(job.codAmount);
        let result;
        try {
          result = await callApi(ctx, "POST", `/api/rider/jobs/${encodeURIComponent(job.id)}/${args.step}`, { body });
        } catch (error) {
          if (def.pin && error.code === "PIN_INCORRECT") {
            const retry = stepAction(ctx, job, args.step);
            const card = deliveryCard(ctx, job);
            card.actions = [retry, ...card.actions.filter((action) => action.kind !== "confirm")];
            return ok({ message: cleanText(error.message, 200), blocks: [notice(error.message, "error"), card], data: { pinIncorrect: true } });
          }
          throw error;
        }
        const updated = result.job || (await loadJob(ctx, job.id));
        const finished = updated && ["DELIVERED"].includes(updated.status);
        return ok({
          message: `${def.done}${updated && !finished ? ` ${nextStepText(updated)}` : ""}`.trim(),
          blocks: [notice(def.done, "success"), updated && !finished ? deliveryCard(ctx, updated) : null],
          data: { step: args.step, delivery: updated ? compactJob(updated) : null },
          entity: { type: "delivery", id: job.id },
          events: [`rider_step_${args.step.replace(/-/g, "_")}`],
          clientEffects: { riderRefresh: true },
        });
      },
    },
    {
      name: "report_delivery_issue",
      risk: RISK.HIGH,
      description:
        "Help with a delivery problem: shows Call Customer / Call Seller / Contact Support options and a support ticket the rider must tap to send. Categories: " +
        Object.keys(ISSUE_CATEGORIES).join(", "),
      parameters: {
        type: "object",
        properties: {
          category: { type: "string", enum: Object.keys(ISSUE_CATEGORIES) },
          description: { type: "string" },
        },
      },
      async prepare(ctx, args = {}) {
        const category = ISSUE_CATEGORIES[String(args.category || "").toUpperCase()] ? String(args.category).toUpperCase() : "OTHER";
        const [job, support] = await Promise.all([resolveJob(ctx, {}).catch(() => null), loadSupport(ctx)]);
        const tips = {
          CUSTOMER_UNREACHABLE: "Try calling the customer first. If they still don't answer, report it so support can guide you.",
          CANNOT_FIND_SELLER: "Try calling the seller. If you still can't find them, send a report.",
          SELLER_NOT_READY: "Let the seller know you're waiting. If it takes too long, send a report.",
          WRONG_LOCATION: "Check the pin on the map and call the customer. If the address is wrong, send a report.",
          ACCIDENT_EMERGENCY: "If anyone is hurt, call 911 now. Then send a report so Switch support is alerted.",
          SAFETY_CONCERN: "Get to a safe place first. Call 911 if you are in danger, then alert Switch support.",
        };
        return ok({
          message: tips[category] || "Tell support what happened. Tap the button to send your report.",
          blocks: [issueBlock(ctx, job, category, args.description, support)],
          data: { awaitingConfirmation: true, category, delivery: job ? job.deliveryCode : "" },
        });
      },
      async execute(ctx, args) {
        const body = await callApi(ctx, "POST", "/api/rider/support/tickets", {
          body: {
            category: args.category,
            description: args.description || ISSUE_CATEGORIES[args.category] || "Reported from Switch Rider AI",
            deliveryId: args.deliveryId || "",
          },
        });
        const safety = SAFETY_CATEGORIES.has(args.category);
        return ok({
          message: safety ? "Switch support has been alerted. If you are in danger, call 911 first." : "Report sent. Switch support will get back to you.",
          blocks: [notice(safety ? "Safety alert sent to Switch support." : "Support ticket created.", safety ? "warning" : "success")],
          data: { ticketId: body.ticket?.id || "" },
          entity: { type: "rider_incident", id: String(body.ticket?.id || "") },
          events: ["rider_issue_reported"],
        });
      },
    },
    {
      name: "set_availability",
      risk: RISK.MEDIUM,
      description: "Go online (receive offers) or offline.",
      parameters: { type: "object", properties: { online: { type: "boolean" } }, required: ["online"] },
      async run(ctx, args = {}) {
        const online = args.online === true;
        const body = await callApi(ctx, "POST", "/api/rider/availability", { body: { online } });
        const status = cleanText(body.rider?.availabilityStatus, 30);
        return ok({
          message: online ? `You're online${status === "ON_DELIVERY" ? " (on a delivery)" : ""}. New offers will appear here.` : "You're offline. You won't receive new offers.",
          blocks: [notice(online ? "Online" : "Offline", online ? "success" : "info")],
          data: { availability: status },
          clientEffects: { riderRefresh: true, availability: status },
          suggestions: online ? ["Any delivery offers?", "Show my earnings"] : ["Show my earnings", "Delivery history"],
        });
      },
    },
  ];

  return tools;
}

module.exports = {
  createRiderTools,
  nextSteps,
  STEP_DEFS,
  ISSUE_CATEGORIES,
};
