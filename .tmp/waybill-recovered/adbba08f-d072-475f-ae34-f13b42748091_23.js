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
    const printedAtEpochMs = Date.now();
    const updatedGroupIds = new Set(waybills.map((entry) => entry.createdAtEpochMs));

    const nextOrders = orders.map((entry) => {
      if (!isRecordInAdminScope(entry, requestAdminId)) {
        return entry;
      }

      const groupId = Math.trunc(parseFiniteNumber(entry?.createdAtEpochMs, NaN));
      if (!updatedGroupIds.has(groupId)) {
        return entry;
      }

      return normalizeStoredOrderEntry({
        ...entry,
        needsWaybill: true,
        waybillPrintedAtEpochMs: printedAtEpochMs,
        stage: "toPrepare",
      });
    });