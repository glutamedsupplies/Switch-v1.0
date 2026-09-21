async function handlePreviewWaybillsApi(request, response) {
  await handlePrintWaybillsApi(request, response, { previewOnly: true });
}

async function handlePrintWaybillsApi(request, response, options = {}) {