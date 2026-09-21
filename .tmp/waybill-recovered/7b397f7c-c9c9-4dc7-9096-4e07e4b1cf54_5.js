  const hasApiKey = Boolean(String(storedApiKey ?? "").trim());
  const archived = isPartnerArchived(record);
  const isActive = !archived && normalizePartnerEnabledState(record);
  const createdAt = String(record.createdAt ?? "").trim();
  const updatedAt = String(record.updatedAt ?? "").trim() || createdAt;
  const needsWaybill = record.needsWaybill === false
    ? false
    : record.needsWaybill === true || hasApiKey;
  return {
    ...publicRecord,
    hasApiKey,
    needsWaybill,
    apiKeyMasked: hasApiKey ? "*******" : "",