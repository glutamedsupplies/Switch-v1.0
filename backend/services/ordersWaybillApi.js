"use strict";

function parseFiniteNumberLocal(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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
  )
    .trim()
    .toLowerCase();
  if (!partnerName) {
    return false;
  }
  const partner = partnersByBranch.get(partnerName);
  if (!partner) {
    return true;
  }
  return deliveryPartnerNeedsWaybill(partner);
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
    parseFiniteNumberLocal(entry?.waybillPrintedAtEpochMs, 0),
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

/**
 * Restores /api/orders/waybills/print after the Aug 15 server rollback.
 */
function createOrdersWaybillApi(deps) {
  const {
    PORT,
    getRequestAdminId,
    requireAdminRestrictionAllowed,
    parseRequestBody,
    sendJson,
    readOrders,
    writeOrders,
    readDeliveryPartners,
    readProducts,
    isRecordInAdminScope,
    parseFiniteNumber = parseFiniteNumberLocal,
    normalizeStoredOrderEntry,
  } = deps;

  function escapeWaybillHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatWaybillOrderId(createdAtEpochMs) {
    const epoch = Math.trunc(parseFiniteNumber(createdAtEpochMs, 0));
    if (!epoch) {
      return "ORD-000000-0000";
    }
    const date = new Date(epoch);
    const yy = String(date.getFullYear()).slice(-2);
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const seq = String(epoch).slice(-4).padStart(4, "0");
    return `ORD-${yy}${mm}${dd}-${seq}`;
  }

  function formatWaybillDateTime(value) {
    const epoch = Math.trunc(parseFiniteNumber(value, NaN));
    const date = Number.isFinite(epoch) && epoch > 0
      ? new Date(epoch)
      : new Date(String(value ?? "").trim() || Date.now());
    if (Number.isNaN(date.getTime())) {
      return "—";
    }
    const datePart = date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).toUpperCase().replace(/,/g, "");
    const timePart = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).toUpperCase();
    return `${datePart} | ${timePart}`;
  }

  function stripWaybillPlainText(value, maxLength = 120) {
    const plain = String(value ?? "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!plain) {
      return "";
    }
    if (plain.length <= maxLength) {
      return plain;
    }
    return `${plain.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
  }

  function resolveWaybillLineBarcode(entry, lineIndex, groupId, product) {
    const productBarcode = String(product?.barcode ?? "").trim();
    if (productBarcode) {
      return productBarcode;
    }
    const suffix = String(lineIndex + 1).padStart(2, "0");
    const base = String(groupId || entry?.id || "0").replace(/\D/g, "").slice(-10).padStart(10, "0");
    return `WB${base}${suffix}`;
  }

  function resolveWaybillVariantLines(entry) {
    const variantName = String(entry?.variantName ?? "").trim();
    if (!variantName) {
      return ["—"];
    }
    if (variantName.includes("/")) {
      return variantName.split("/").map((part) => part.trim()).filter(Boolean);
    }
    return [variantName];
  }

  function resolveWaybillRouteCode(primary, partnerName) {
    const city = String(primary?.clientAddress ?? primary?.address ?? "")
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .pop() || "LOCAL";
    const partnerCode = String(partnerName || primary?.deliveryPartnerName || primary?.courier || "ROUTE")
      .replace(/[^a-z0-9]+/gi, "")
      .slice(0, 6)
      .toUpperCase();
    const cityCode = city.replace(/[^a-z0-9]+/gi, "").slice(0, 6).toUpperCase();
    return `${partnerCode || "RT"}-${cityCode || "01"}`;
  }

  function buildWaybillPrintHtml(orderEntries = [], options = {}) {
    const entries = Array.isArray(orderEntries) ? orderEntries : [];
    const primary = entries[0] || {};
    const groupId = Math.trunc(parseFiniteNumber(primary?.createdAtEpochMs, 0));
    const partnerName = String(
      options?.partnerName || primary?.deliveryPartnerName || primary?.courier || "Courier",
    ).trim();
    const productsById = options?.productsById instanceof Map ? options.productsById : new Map();
    const pageNumber = Math.max(1, Math.trunc(parseFiniteNumber(options?.pageNumber, 1)));
    const pageTotal = Math.max(pageNumber, Math.trunc(parseFiniteNumber(options?.pageTotal, 1)));
    const customerName = String(
      primary?.clientName ?? primary?.customerName ?? "Customer",
    ).trim();
    const contactNumber = String(
      primary?.clientContactNumber ?? primary?.contactNumber ?? "",
    ).trim();
    const address = String(
      primary?.clientAddress ?? primary?.address ?? "",
    ).trim();
    const orderIdLabel = formatWaybillOrderId(groupId);
    const orderDateLabel = formatWaybillDateTime(
      groupId || primary?.createdAt || primary?.receivedAt,
    );
    const serviceLevel = `${partnerName.toUpperCase()} DISPATCH`;
    const routeCode = resolveWaybillRouteCode(primary, partnerName);
    const deliveryWindow = "ASAP DISPATCH";
    const routeNote = contactNumber
      ? `NOTE: CONTACT ${contactNumber} UPON DELIVERY`
      : "NOTE: LEAVE IN RECEIVING AREA IF UNATTENDED";
    const totalQuantity = entries.reduce(
      (sum, entry) => sum + Math.max(1, Math.trunc(parseFiniteNumber(entry?.quantity, 1))),
      0,
    );
    const pickingPriority = totalQuantity >= 4 ? "HIGH PRIORITY" : "STANDARD";

    const itemRows = entries.map((entry, index) => {
      const product = productsById.get(String(entry?.productId ?? "").trim()) || null;
      const quantity = Math.max(1, Math.trunc(parseFiniteNumber(entry?.quantity, 1)));
      const productName = String(entry?.productName ?? product?.name ?? "Product").trim();
      const productSubtitle = stripWaybillPlainText(
        product?.description || product?.shortDescription || product?.subtitle || "",
        72,
      );
      const variantLines = resolveWaybillVariantLines(entry);
      const barcodeValue = resolveWaybillLineBarcode(entry, index, groupId, product);
      const variantMarkup = variantLines
        .map((line) => `<span>${escapeWaybillHtml(line)}</span>`)
        .join("");
      return `
      <tr>
        <td class="waybill-table__index">${index + 1}</td>
        <td class="waybill-table__product">
          <strong>${escapeWaybillHtml(productName)}</strong>
          ${productSubtitle ? `<small>${escapeWaybillHtml(productSubtitle)}</small>` : ""}
        </td>
        <td class="waybill-table__variant">${variantMarkup}</td>
        <td class="waybill-table__qty">
          <strong>${quantity}</strong>
          <small>PCS</small>
        </td>
        <td class="waybill-table__barcode">
          <svg class="waybill-barcode" data-barcode="${escapeWaybillHtml(barcodeValue)}" aria-label="Barcode ${escapeWaybillHtml(barcodeValue)}"></svg>
          <small>${escapeWaybillHtml(barcodeValue)}</small>
        </td>
      </tr>`;
    }).join("");

    return `
    <article class="waybill-sheet" data-waybill-group="${escapeWaybillHtml(String(groupId))}">
      <header class="waybill-header">
        <div class="waybill-header__block">
          <span class="waybill-label">Order ID</span>
          <strong class="waybill-order-id">${escapeWaybillHtml(orderIdLabel)}</strong>
          <span class="waybill-meta">Order Date: ${escapeWaybillHtml(orderDateLabel)}</span>
        </div>
        <div class="waybill-header__block">
          <span class="waybill-label">Picking Priority</span>
          <span class="waybill-priority">${escapeWaybillHtml(pickingPriority)}</span>
          <span class="waybill-meta">Service Level: ${escapeWaybillHtml(serviceLevel)}</span>
        </div>
        <div class="waybill-header__block waybill-header__block--right">
          <span class="waybill-label">Order Type</span>
          <strong class="waybill-order-type">SALES ORDER</strong>
          <span class="waybill-meta">Page: ${pageNumber} of ${pageTotal}</span>
        </div>
      </header>

      <section class="waybill-info">
        <div class="waybill-info__block">
          <div class="waybill-info__title">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a4.5 4.5 0 1 0-4.5-4.5A4.5 4.5 0 0 0 12 12Z"/><path d="M4 20.5a8 8 0 0 1 16 0"/></svg>
            <span>Customer</span>
          </div>
          <strong class="waybill-customer-name">${escapeWaybillHtml(customerName)}</strong>
          <p>${escapeWaybillHtml(address || "No address on file")}</p>
        </div>
        <div class="waybill-info__block">
          <div class="waybill-info__title">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z"/><circle cx="12" cy="11" r="2.4"/></svg>
            <span>Route / Note</span>
          </div>
          <p><strong>Route:</strong> ${escapeWaybillHtml(routeCode)}</p>
          <p><strong>Delivery Window:</strong> ${escapeWaybillHtml(deliveryWindow)}</p>
          <p class="waybill-route-note">${escapeWaybillHtml(routeNote)}</p>
        </div>
      </section>

      <table class="waybill-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Product Name</th>
            <th>Variant</th>
            <th>Qty</th>
            <th>Barcode</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows || `
          <tr>
            <td class="waybill-table__index">1</td>
            <td class="waybill-table__product" colspan="4">No items listed</td>
          </tr>`}
        </tbody>
      </table>
    </article>`;
  }

  function resolveWaybillPrintJobs(
    orders,
    normalizedGroupIds,
    requestAdminId,
    partnersByBranch,
    productsById,
  ) {
    const eligibleGroups = [];

    normalizedGroupIds.forEach((groupId) => {
      const groupEntries = orders.filter(
        (candidate) =>
          isRecordInAdminScope(candidate, requestAdminId)
          && Math.trunc(parseFiniteNumber(candidate?.createdAtEpochMs, NaN)) === groupId,
      );
      if (!groupEntries.length) {
        return;
      }

      const primary = groupEntries[0];
      const needsWaybill = resolveOrderNeedsWaybill(primary, partnersByBranch);
      const waybillPrintedAtEpochMs = Math.trunc(
        parseFiniteNumber(primary?.waybillPrintedAtEpochMs, 0),
      );
      const stage = String(primary?.stage ?? primary?.status ?? "").trim();
      const alreadyPrinted = waybillPrintedAtEpochMs > 0;
      if (!needsWaybill) {
        return;
      }
      if (
        !alreadyPrinted
        && !["awaitingWaybill", "toPrepare"].includes(stage)
      ) {
        return;
      }

      eligibleGroups.push({
        createdAtEpochMs: groupId,
        groupEntries,
        partnerName: String(primary?.deliveryPartnerName ?? primary?.courier ?? "").trim(),
        alreadyPrinted,
      });
    });

    const pageTotal = eligibleGroups.length;
    return eligibleGroups.map((group, index) => ({
      createdAtEpochMs: group.createdAtEpochMs,
      alreadyPrinted: group.alreadyPrinted === true,
      html: buildWaybillPrintHtml(group.groupEntries, {
        partnerName: group.partnerName,
        productsById,
        pageNumber: index + 1,
        pageTotal,
      }),
    }));
  }

  async function handlePrintWaybillsApi(request, response, options = {}) {
    const requestUrl = new URL(request.url, `http://127.0.0.1:${PORT}`);
    const requestAdminId = getRequestAdminId(request, requestUrl);

    if (request.method !== "POST") {
      sendJson(response, 405, { message: "Method not allowed." });
      return;
    }

    if (
      !(await requireAdminRestrictionAllowed(
        request,
        response,
        requestUrl,
        "process_orders",
        requestAdminId,
      ))
    ) {
      return;
    }

    try {
      const payload = await parseRequestBody(request);
      const previewOnly = options.previewOnly === true || payload?.preview === true;
      const createdAtEpochMsList = Array.isArray(payload?.createdAtEpochMsList)
        ? payload.createdAtEpochMsList
        : payload?.createdAtEpochMs
          ? [payload.createdAtEpochMs]
          : [];
      const normalizedGroupIds = [...new Set(
        createdAtEpochMsList
          .map((value) => Math.trunc(parseFiniteNumber(value, NaN)))
          .filter((value) => Number.isFinite(value) && value > 0),
      )];

      if (!normalizedGroupIds.length) {
        sendJson(response, 400, { message: "Select at least one order group to print." });
        return;
      }

      const [orders, deliveryPartners, products] = await Promise.all([
        readOrders(),
        readDeliveryPartners(),
        readProducts(),
      ]);
      const partnersByBranch = buildDeliveryPartnersByBranchMap(deliveryPartners);
      const productsById = new Map(
        (Array.isArray(products) ? products : [])
          .filter((product) => isRecordInAdminScope(product, requestAdminId))
          .map((product) => [String(product?.id ?? "").trim(), product])
          .filter(([productId]) => productId),
      );
      const waybills = resolveWaybillPrintJobs(
        orders,
        normalizedGroupIds,
        requestAdminId,
        partnersByBranch,
        productsById,
      );

      if (!waybills.length) {
        sendJson(response, 400, {
          message: "No eligible waybill orders were found for printing.",
        });
        return;
      }

      if (previewOnly) {
        sendJson(response, 200, {
          waybills,
          preview: true,
          previewCount: waybills.length,
          createdAtEpochMsList: waybills.map((entry) => entry.createdAtEpochMs),
        });
        return;
      }

      const printedAtEpochMs = Date.now();
      const groupsToMark = new Set(
        waybills
          .filter((entry) => entry.alreadyPrinted !== true)
          .map((entry) => entry.createdAtEpochMs),
      );

      const nextOrders = orders.map((entry) => {
        if (!isRecordInAdminScope(entry, requestAdminId)) {
          return entry;
        }
        const groupId = Math.trunc(parseFiniteNumber(entry?.createdAtEpochMs, NaN));
        if (!groupsToMark.has(groupId)) {
          return entry;
        }
        return normalizeStoredOrderEntry({
          ...entry,
          needsWaybill: true,
          waybillPrintedAtEpochMs: printedAtEpochMs,
          stage: "toPrepare",
          status: "toPrepare",
        });
      });

      if (groupsToMark.size) {
        await writeOrders(nextOrders);
      }

      sendJson(response, 200, {
        waybills,
        printedCount: waybills.length,
        createdAtEpochMsList: waybills.map((entry) => entry.createdAtEpochMs),
        message:
          waybills.length === 1
            ? "Waybill printed. Order moved to packing station."
            : `${waybills.length} waybills printed. Orders moved to packing station.`,
      });
    } catch (error) {
      sendJson(response, 500, {
        message: error instanceof Error ? error.message : "Unable to print waybills.",
      });
    }
  }

  return {
    handlePrintWaybillsApi,
    buildDeliveryPartnersByBranchMap,
    resolveOrderNeedsWaybill,
    applyWaybillStageGate,
    deliveryPartnerNeedsWaybill,
  };
}

module.exports = {
  createOrdersWaybillApi,
  buildDeliveryPartnersByBranchMap,
  resolveOrderNeedsWaybill,
  applyWaybillStageGate,
  deliveryPartnerNeedsWaybill,
};
