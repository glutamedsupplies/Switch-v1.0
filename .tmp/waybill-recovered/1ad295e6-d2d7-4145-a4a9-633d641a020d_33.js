function resolveWaybillListingBarcode(entry, product) {
  return String(
    entry?.barcode
    ?? entry?.productBarcode
    ?? product?.barcode
    ?? "",
  ).trim();
}

function resolveWaybillBarcodeFormat(barcodeValue) {
  const normalized = String(barcodeValue ?? "").trim();
  if (/^\d{13}$/.test(normalized) || /^\d{12}$/.test(normalized)) {
    return "EAN13";
  }
  if (/^\d{8}$/.test(normalized)) {
    return "EAN8";
  }
  return "CODE128";
}

function resolveWaybillLineBarcode(entry, lineIndex, groupId, product) {
  const listingBarcode = resolveWaybillListingBarcode(entry, product);
  if (listingBarcode) {
    return listingBarcode;
  }
  const suffix = String(lineIndex + 1).padStart(2, "0");
  const base = String(groupId || entry?.id || "0").replace(/\D/g, "").slice(-10).padStart(10, "0");
  return `WB${base}${suffix}`;
}