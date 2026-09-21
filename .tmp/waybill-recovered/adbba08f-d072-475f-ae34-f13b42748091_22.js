async function resolveWaybillPrintJobs(
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
    if (
      !needsWaybill
      || waybillPrintedAtEpochMs > 0
      || !["awaitingWaybill", "toPrepare"].includes(stage)
    ) {
      return;
    }

    eligibleGroups.push({
      createdAtEpochMs: groupId,
      groupEntries,
      partnerName: String(primary?.deliveryPartnerName ?? primary?.courier ?? "").trim(),
    });
  });

  const pageTotal = eligibleGroups.length;
  return eligibleGroups.map((group, index) => ({
    createdAtEpochMs: group.createdAtEpochMs,
    html: buildWaybillPrintHtml(group.groupEntries, {
      partnerName: group.partnerName,
      productsById,
      pageNumber: index + 1,
      pageTotal,
    }),
  }));
}