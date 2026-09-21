function enrichOrdersWithListingAndBuyerData(orders, products, accounts, deliveryPartners = []) {
  const productsById = new Map(
    (Array.isArray(products) ? products : [])
      .map((product) => [String(product?.id ?? product?.productId ?? "").trim(), product])
      .filter(([productId]) => productId),
  );
  const accountsById = new Map();
  (Array.isArray(accounts) ? accounts : []).forEach((account) => {
    [account?.id, account?.accountId, account?.userId, account?.uid, account?.email]
      .map((value) => String(value ?? "").trim())
      .filter(Boolean)
      .forEach((accountId) => accountsById.set(accountId, account));
  });
  const partnersByBranch = buildDeliveryPartnersByBranchMap(deliveryPartners);

  return (Array.isArray(orders) ? orders : []).map((order) => {
    const product = productsById.get(String(order?.productId ?? "").trim());
    const account = accountsById.get(String(order?.accountId ?? order?.customerId ?? "").trim());
    const productImageUrl = getOrderListingImageUrl(order, product);
    const customerProfileImageUrl = getOrderBuyerProfileImageUrl(order, account);
    const customerName = getOrderBuyerDisplayName(order, account);
    const resolvedNeedsWaybill = resolveOrderNeedsWaybill(order, partnersByBranch);
    const waybillPrintedAtEpochMs = Math.trunc(
      parseFiniteNumber(order?.waybillPrintedAtEpochMs, 0),
    );
    const gatedOrder = applyWaybillStageGate({
      ...order,
      needsWaybill: resolvedNeedsWaybill,
      waybillPrintedAtEpochMs,
    });
    const stage = String(gatedOrder?.stage ?? gatedOrder?.status ?? "").trim();
    return {
      ...gatedOrder,
      productImageUrl,
      customerProfileImageUrl,
      customerName: customerName || String(order?.customerName ?? "").trim(),
      needsWaybill: resolvedNeedsWaybill,
      waybillPrintedAtEpochMs,
      canPrintWaybill: resolvedNeedsWaybill
        && waybillPrintedAtEpochMs <= 0
        && (stage === "awaitingWaybill" || stage === "toPrepare"),
    };
  });
}