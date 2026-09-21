function getSelectedMainOrdersWaybillGroupIds() {
  return [...mainOrdersWaybillSelection]
    .map((value) => Math.trunc(Number(value)))
    .filter((value) => Number.isFinite(value) && value > 0);
}

async function readWaybillApiResponse(response) {
  const rawText = await response.text();
  const trimmedText = rawText.trim();
  if (!trimmedText) {
    return {
      data: {},
      message: `Request failed (${response.status}).`,
    };
  }

  try {
    return {
      data: JSON.parse(trimmedText),
      message: "",
    };
  } catch (_) {
    return {
      data: {},
      message: trimmedText,
    };
  }
}

function buildWaybillPrintDocumentHtml(sectionsHtml) {