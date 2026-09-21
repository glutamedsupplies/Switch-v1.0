function normalizePendingOrderStage(entry) {
  const currentStage = String(entry?.stage ?? "").trim();
  if (currentStage !== "toPay" && currentStage !== "toPrepare" && currentStage !== "awaitingWaybill") {
    return entry;
  }

  const remainingBalanceAmount = Math.max(
    parseFiniteNumber(entry.remainingBalanceAmount, 0),
    0,
  );
  const isCodOrder = isCodPaymentOption(entry.paymentOptionLabel);
  const explicitAmountToPay = Math.max(
    parseFiniteNumber(entry.amountToPayAmount, 0),
    0,
  );
  const nextAmountToPay = isCodOrder
    ? codAmountStillNeededToProceed(entry, remainingBalanceAmount)
    : explicitAmountToPay > 0.009
      ? explicitAmountToPay
      : remainingBalanceAmount;

  return applyWaybillStageGate({
    ...entry,
    stage: nextAmountToPay > 0.009 ? "toPay" : "toPrepare",
    amountToPayAmount: nextAmountToPay,
    remainingBalanceAmount,
  });
}

function deliveryPartnerNeedsWaybill(partner) {
  if (!partner || typeof partner !== "object") {
    return false;
  }
  if (partner.needsWaybill === false) {
    return false;
  }
  return partner.needsWaybill === true || Boolean(String(partner.apiKey ?? "").trim());
}

function buildDeliveryPartnersByBranchMap(partners) {
  return (Array.isArray(partners) ? partners : []).reduce((map, partner) => {
    const branch = String(partner?.branch ?? partner?.name ?? "").trim().toLowerCase();
    if (branch) {
      map.set(branch, partner);
    }
    return map;
  }, new Map());
}

function resolveOrderNeedsWaybill(entry, partnersByBranch = new Map()) {
  if (entry?.needsWaybill === true) {
    return true;
  }
  if (entry?.needsWaybill === false) {
    return false;
  }
  const partnerName = String(
    entry?.deliveryPartnerName ?? entry?.courier ?? entry?.deliveryProvider ?? "",
  ).trim().toLowerCase();
  if (!partnerName) {
    return false;
  }
  return deliveryPartnerNeedsWaybill(partnersByBranch.get(partnerName));
}

function applyWaybillStageGate(entry) {
  const needsWaybill = entry?.needsWaybill === true;
  if (!needsWaybill) {
    if (String(entry?.stage ?? "").trim() === "awaitingWaybill") {
      return {
        ...entry,
        stage: "toPrepare",
        status: "toPrepare",
      };
    }
    return entry;
  }

  const waybillPrintedAtEpochMs = Math.trunc(
    parseFiniteNumber(entry?.waybillPrintedAtEpochMs, 0),
  );
  const stage = String(entry?.stage ?? "").trim();
  if (waybillPrintedAtEpochMs > 0) {
    if (stage === "awaitingWaybill") {
      return {
        ...entry,
        stage: "toPrepare",
        status: "toPrepare",
        waybillPrintedAtEpochMs,
      };
    }
    return {
      ...entry,
      waybillPrintedAtEpochMs,
    };
  }

  if (stage === "toPrepare" || stage === "awaitingWaybill") {
    return {
      ...entry,
      stage: "awaitingWaybill",
      status: "awaitingWaybill",
      waybillPrintedAtEpochMs: 0,
    };
  }

  return entry;
}

function escapeWaybillHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildWaybillPrintHtml(orderEntries = [], partnerName = "") {
  const entries = Array.isArray(orderEntries) ? orderEntries : [];
  const primary = entries[0] || {};
  const groupId = Math.trunc(parseFiniteNumber(primary?.createdAtEpochMs, 0));
  const customerName = String(
    primary?.clientName ?? primary?.customerName ?? "Customer",
  ).trim();
  const contactNumber = String(
    primary?.clientContactNumber ?? primary?.contactNumber ?? "",
  ).trim();
  const address = String(
    primary?.clientAddress ?? primary?.address ?? "",
  ).trim();
  const courier = String(
    partnerName || primary?.deliveryPartnerName || primary?.courier || "Courier",
  ).trim();
  const itemLines = entries.map((entry) => {
    const quantity = Math.max(1, Math.trunc(parseFiniteNumber(entry?.quantity, 1)));
    const productName = String(entry?.productName ?? "Product").trim();
    const variantName = String(entry?.variantName ?? "").trim();
    const label = variantName ? `${productName} (${variantName})` : productName;
    return `<li>${escapeWaybillHtml(label)} &times; ${quantity}</li>`;
  }).join("");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Waybill ${escapeWaybillHtml(groupId)}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
      .waybill { max-width: 420px; border: 1px solid #d0d5dd; border-radius: 8px; padding: 18px; }
      h1 { margin: 0 0 8px; font-size: 20px; }
      .meta { margin: 0 0 14px; color: #475467; font-size: 12px; }
      .section { margin-top: 14px; }
      .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #667085; }
      .value { margin-top: 4px; font-size: 14px; line-height: 1.45; }
      ul { margin: 8px 0 0; padding-left: 18px; }
      li { margin-bottom: 4px; }
    </style>
  </head>
  <body>
    <section class="waybill">
      <h1>Shipping Waybill</h1>
      <p class="meta">Order Group #${escapeWaybillHtml(groupId)}</p>
      <div class="section">
        <div class="label">Courier</div>
        <div class="value">${escapeWaybillHtml(courier)}</div>
      </div>
      <div class="section">
        <div class="label">Recipient</div>
        <div class="value">${escapeWaybillHtml(customerName)}${contactNumber ? `<br>${escapeWaybillHtml(contactNumber)}` : ""}</div>
      </div>
      <div class="section">
        <div class="label">Delivery Address</div>
        <div class="value">${escapeWaybillHtml(address || "No address on file")}</div>
      </div>
      <div class="section">
        <div class="label">Items</div>
        <ul>${itemLines || "<li>No items listed</li>"}</ul>
      </div>
    </section>
    <script>window.addEventListener("load", () => window.print());</script>
  </body>
</html>`;
}