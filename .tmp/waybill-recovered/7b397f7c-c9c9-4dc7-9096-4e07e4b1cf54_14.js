function applyWaybillStageGate(entry) {
  const needsWaybill = entry?.needsWaybill !== false;
  if (!needsWaybill) {