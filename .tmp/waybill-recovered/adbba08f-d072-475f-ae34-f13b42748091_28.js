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
    const previewOnly = options.previewOnly === true || payload?.preview === true;