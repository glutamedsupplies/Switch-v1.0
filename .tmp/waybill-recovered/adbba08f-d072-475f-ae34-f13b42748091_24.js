  if (requestUrl.pathname === "/api/orders/waybills/preview") {
    await handlePreviewWaybillsApi(request, response);
    return;
  }

  if (requestUrl.pathname === "/api/orders/waybills/print") {