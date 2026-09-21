  const partnerName = String(
    entry?.deliveryPartnerName ?? entry?.courier ?? entry?.deliveryProvider ?? "",
  ).trim().toLowerCase();
  if (!partnerName) {
    return false;
  }
  const partner = partnersByBranch.get(partnerName);
  return partner ? deliveryPartnerNeedsWaybill(partner) : true;
}