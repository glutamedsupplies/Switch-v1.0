async function handlePrintWaybillsApi(request, response, options = {}) {","old_string":"async function handlePreviewWaybillsApi(request, response) {
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
