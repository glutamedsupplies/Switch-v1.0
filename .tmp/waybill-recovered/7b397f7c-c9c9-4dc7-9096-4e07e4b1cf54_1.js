function normalizeDeliveryPartnerRecord(input, existingPartner = null) {
  const record = normalizePartnerRecord(input, existingPartner, {
    createId: createDeliveryPartnerId,
  });
  const apiKey = normalizePartnerApiKey(
    input?.apiKey,
    existingPartner?.apiKey,
  );
  const hasApiKey = Boolean(String(apiKey ?? "").trim());
  const needsWaybill = Object.prototype.hasOwnProperty.call(input ?? {}, "needsWaybill")
    ? parsePartnerQueryBoolean(input?.needsWaybill, false)
    : existingPartner?.needsWaybill === true || hasApiKey;
  return {
    ...record,
    apiKey,
    needsWaybill,
  };
}