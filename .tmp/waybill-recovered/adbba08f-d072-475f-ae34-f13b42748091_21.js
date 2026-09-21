async function resolveWaybillPrintJobs(
  orders,
  normalizedGroupIds,
  requestAdminId,
  partnersByBranch,
  productsById,
) {
  const waybills = [];
  const updatedGroupIds = new Set();

  for (const entry of orders) {
    if (!isRecordInAdminScope(entry, requestAdminId)) {
      continue;
    }

    const groupId = Math.trunc(parseFiniteNumber(entry?.createdAtEpochMs, NaN));
    if (!normalizedGroupIds.includes(groupId)) {
      continue;
    }

    const needsWaybill = resolveOrderNeedsWaybill(entry, partnersByBranch);
    const waybillPrintedAtEpochMs = Math.trunc(
      parseFiniteNumber(entry?.waybillPrintedAtEpochMs, 0),
    );
    const stage = String(entry?.stage ?? entry?.status ?? "").trim();
    if (
      !needsWaybill
      || waybillPrintedAtEpochMs > 0
      || !["awaitingWaybill", "toPrepare"].includes(stage)
    ) {
      continue;
    }

    if (!updatedGroupIds.has(groupId)) {
      const groupEntries = orders.filter(
        (candidate) =>
          isRecordInAdminScope(candidate, requestAdminId)
          && Math.trunc(parseFiniteNumber(candidate?.createdAtEpochMs, NaN)) === groupId,
      );
      const partnerName = String(
        entry?.deliveryPartnerName ?? entry?.courier ?? "",
      ).trim();
      waybills.push({
        createdAtEpochMs: groupId,
        html: buildWaybillPrintHtml(groupEntries, {
          partnerName,
          productsById,
          pageNumber: updatedGroupIds.size + 1,
          pageTotal: 0,
        }),
      });
      updatedGroupIds.add(groupId);
    }
  }

  if (waybills.length > 1) {
    waybills.forEach((waybill, index) => {
      waybill.html = buildWaybillPrintHtml(
        orders.filter(
          (candidate) =>
            isRecordInAdminScope(candidate, requestAdminId)
            && Math.trunc(parseFiniteNumber(candidate?.createdAtEpochMs, NaN))
              === Math.trunc(parseFiniteNumber(waybill?.createdAtEpochMs, 0)),
        ),
        {
          partnerName: String(
            orders.find(
              (candidate) =>
                isRecordInAdminScope(candidate, requestAdminId)
                && Math.trunc(parseFiniteNumber(candidate?.createdAtEpochMs, NaN))
                  === Math.trunc(parseFiniteNumber(waybill?.createdAtEpochMs, 0)),
            )?.deliveryPartnerName
            ?? orders.find(
              (candidate) =>
                isRecordInAdminScope(candidate, requestAdminId)
                && Math.trunc(parseFiniteNumber(candidate?.createdAtEpochMs, NaN))
                  === Math.trunc(parseFiniteNumber(waybill?.createdAtEpochMs, 0)),
            )?.courier
            ?? "",
          ).trim(),
          productsById,
          pageNumber: index + 1,
          pageTotal: waybills.length,
        },
      );
    });
  } else if (waybills.length === 1) {
    waybills[0].html = waybills[0].html.replace("Page: 1 of 0", "Page: 1 of 1");
  }

  return waybills;
}

async function handlePreviewWaybillsApi(request, response) {
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
    const waybills = await resolveWaybillPrintJobs(
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

    sendJson(response, 200, {
      waybills,
      previewCount: waybills.length,
      createdAtEpochMsList: waybills.map((entry) => entry.createdAtEpochMs),
    });
  } catch (error) {
    sendJson(response, 500, {
      message: error instanceof Error ? error.message : "Unable to preview waybills.",
    });
  }
}

async function handlePrintWaybillsApi(request, response) {