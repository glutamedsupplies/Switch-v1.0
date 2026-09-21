async function handlePrintWaybillsApi(request, response, options = {}) {
  const requestUrl = new URL(request.url, `http://127.0.0.1:${PORT}`);
  const requestAdminId = getRequestAdminId(request, requestUrl);

  if (request.method !== "POST") {
    sendJson(response, 405, { message: "Method not allowed." });
    return;
  }

  if (
    !(await requireAdminRestrictionAllowed(
      request,
      response,
      requestUrl,
      "process_orders",
      requestAdminId,
    ))
  ) {
    return;
  }

  try {
    const payload = await parseRequestBody(request);
    const previewOnly = options.previewOnly === true || payload?.preview === true;","old_string":"async function handlePrintWaybillsApi(request, response) {
  const requestUrl = new URL(request.url, `http://127.0.0.1:${PORT}`);
  const requestAdminId = getRequestAdminId(request, requestUrl);

  if (request.method !== "POST") {
    sendJson(response, 405, { message: "Method not allowed." });
    return;
  }

  if (
    !(await requireAdminRestrictionAllowed(
      request,
      response,
      requestUrl,
      "process_orders",
      requestAdminId,
    ))
  ) {
    return;
  }

  try {
    const payload = await parseRequestBody(request);","path":"c:\Users\pc\Documents\gms-shopping-app-v1.0\gms_shopping\backend\server.js"}},{"type":"tool_use","name":"StrReplace","input":{"new_string":"    if (!waybills.length) {
      sendJson(response, 400, {
        message: "No eligible waybill orders were found for printing.",
      });
      return;
    }

    if (previewOnly) {
      sendJson(response, 200, {
        waybills,
        preview: true,
        previewCount: waybills.length,
        createdAtEpochMsList: waybills.map((entry) => entry.createdAtEpochMs),
      });
      return;
    }

    await writeOrders(nextOrders);","old_string":"    if (!waybills.length) {
      sendJson(response, 400, {
        message: "No eligible waybill orders were found for printing.",
      });
      return;
    }

    await writeOrders(nextOrders);","path":"c:\Users\pc\Documents\gms-shopping-app-v1.0\gms_shopping\backend\server.js"}},{"type":"tool_use","name":"StrReplace","input":{"new_string":"async function handlePreviewWaybillsApi(request, response) {
  await handlePrintWaybillsApi(request, response, { previewOnly: true });
}
