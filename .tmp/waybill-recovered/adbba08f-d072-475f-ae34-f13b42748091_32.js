    const response = await fetch("/api/orders/waybills/print", {
      method: "POST",
      cache: "no-store",
      headers: withInsightAdminTenantHeaders({
        Accept: "application/json",
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        preview: true,
        createdAtEpochMsList,
      }),
    });
    const { data, message: rawMessage } = await readWaybillApiResponse(response);
    if (!response.ok) {
      throw new Error(data?.message || rawMessage || "Unable to preview waybills.");
    }