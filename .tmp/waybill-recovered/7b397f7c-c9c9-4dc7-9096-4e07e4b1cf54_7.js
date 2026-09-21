async function handlePrintWaybillsApi(request, response) {
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

    const [orders, deliveryPartners] = await Promise.all([
      readOrders(),
      readDeliveryPartners(),
    ]);
    const partnersByBranch = buildDeliveryPartnersByBranchMap(deliveryPartners);
    const printedAtEpochMs = Date.now();
    const waybills = [];
    const updatedGroupIds = new Set();

    const nextOrders = orders.map((entry) => {
      if (!isRecordInAdminScope(entry, requestAdminId)) {
        return entry;
      }

      const groupId = Math.trunc(parseFiniteNumber(entry?.createdAtEpochMs, NaN));
      if (!normalizedGroupIds.includes(groupId)) {
        return entry;
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
        return entry;
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
          html: buildWaybillPrintHtml(groupEntries, partnerName),
        });
        updatedGroupIds.add(groupId);
      }

      return normalizeStoredOrderEntry({
        ...entry,
        needsWaybill: true,
        waybillPrintedAtEpochMs: printedAtEpochMs,
        stage: "toPrepare",
      });
    });

    if (!waybills.length) {
      sendJson(response, 400, {
        message: "No eligible API waybill orders were found for printing.",
      });
      return;
    }

    await writeOrders(nextOrders);
    sendJson(response, 200, {
      waybills,
      printedCount: waybills.length,
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

async function handlePackOrderGroupApi(request, response, createdAtEpochMs) {