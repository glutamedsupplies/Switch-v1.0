function deliveryPartnerNeedsWaybill(partner) {
  if (!partner || typeof partner !== "object") {
    return true;
  }
  return partner.needsWaybill !== false;
}

function buildDeliveryPartnersByBranchMap(partners) {