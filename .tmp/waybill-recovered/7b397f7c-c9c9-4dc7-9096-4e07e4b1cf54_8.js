  if (requestUrl.pathname === "/api/orders/waybills/print") {
    await handlePrintWaybillsApi(request, response);
    return;
  }

  if (requestUrl.pathname.startsWith("/api/orders/")) {
    const orderPathParts = requestUrl.pathname.split("/").filter(Boolean);
    const createdAtEpochMs = orderPathParts[2] ?? "";
    const action = orderPathParts[3] ?? "";
    const actionDetail = orderPathParts[4] ?? "";

    if (action === "waybill" && actionDetail === "print") {
      const payload = await parseRequestBody(request).catch(() => ({}));
      await handlePrintWaybillsApi(
        {
          ...request,
          method: "POST",
          json: () => Promise.resolve({
            ...(payload && typeof payload === "object" ? payload : {}),
            createdAtEpochMs,
          }),
        },
        response,
      );
      return;
    }

    if (action === "pack") {