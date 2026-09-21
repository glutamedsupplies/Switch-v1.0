function applyWaybillStageGate(entry) {
  const needsWaybill = entry?.needsWaybill === true;
  if (!needsWaybill) {