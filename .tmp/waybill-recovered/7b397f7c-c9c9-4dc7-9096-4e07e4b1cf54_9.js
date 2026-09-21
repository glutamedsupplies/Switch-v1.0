  const needsWaybill = Object.prototype.hasOwnProperty.call(input ?? {}, "needsWaybill")
    ? parsePartnerQueryBoolean(input?.needsWaybill, false)
    : typeof existingPartner?.needsWaybill === "boolean"
      ? existingPartner.needsWaybill
      : hasApiKey;