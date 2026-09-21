  const createdAtEpochMs = Math.trunc(
    parseFiniteNumber(
      input.createdAtEpochMs,
      Date.parse(String(input.createdAt ?? "").trim()) || Date.now(),
    ),
  );
  const needsWaybill = input.needsWaybill === true || input.deliveryNeedsWaybill === true
    ? true
    : input.needsWaybill === false
      ? false
      : undefined;
  const waybillPrintedAtEpochMs = Math.trunc(
    parseFiniteNumber(input.waybillPrintedAtEpochMs, 0),
  );
  const grandTotalAmount = parseFiniteNumber(