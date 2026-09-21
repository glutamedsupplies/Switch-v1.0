    const listingBarcode = resolveWaybillListingBarcode(entry, product);
    const barcodeValue = listingBarcode || resolveWaybillLineBarcode(entry, index, groupId, product);
    const barcodeFormat = resolveWaybillBarcodeFormat(barcodeValue);
    const variantMarkup = variantLines
      .map((line) => `<span>${escapeWaybillHtml(line)}</span>`)
      .join("");
    return `
      <tr>
        <td class="waybill-table__index">${index + 1}</td>
        <td class="waybill-table__product">
          <strong>${escapeWaybillHtml(productName)}</strong>
          ${productSubtitle ? `<small>${escapeWaybillHtml(productSubtitle)}</small>` : ""}
        </td>
        <td class="waybill-table__variant">${variantMarkup}</td>
        <td class="waybill-table__qty">
          <strong>${quantity}</strong>
          <small>PCS</small>
        </td>
        <td class="waybill-table__barcode${listingBarcode ? " waybill-table__barcode--listing" : ""}">
          <svg class="waybill-barcode" data-barcode="${escapeWaybillHtml(barcodeValue)}" data-barcode-format="${escapeWaybillHtml(barcodeFormat)}" aria-label="Barcode ${escapeWaybillHtml(barcodeValue)}"></svg>
          <small>${escapeWaybillHtml(barcodeValue)}</small>
        </td>
      </tr>`;