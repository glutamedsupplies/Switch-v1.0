  const needsWaybill = Object.prototype.hasOwnProperty.call(input ?? {}, "needsWaybill")
    ? parsePartnerQueryBoolean(input?.needsWaybill, true)
    : typeof existingPartner?.needsWaybill === "boolean"
      ? existingPartner.needsWaybill
      : true;