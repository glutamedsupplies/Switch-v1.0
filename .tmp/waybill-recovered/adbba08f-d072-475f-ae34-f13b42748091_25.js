  const printFrame = document.createElement("iframe");
  printFrame.setAttribute("aria-hidden", "true");
  printFrame.style.position = "fixed";
  printFrame.style.right = "0";
  printFrame.style.bottom = "0";
  printFrame.style.width = "0";
  printFrame.style.height = "0";
  printFrame.style.border = "0";
  document.body.appendChild(printFrame);

  const printDocument = printFrame.contentDocument;
  if (!printDocument) {
    printFrame.remove();
    notifyMainOrdersWaybillPrintError("Unable to start the print dialog.");
    return;
  }

  printDocument.open();
  printDocument.write(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Waybills</title>
    <link rel="stylesheet" href="/waybill-print.css?v=waybill-preview-modal-1" />
    <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
  </head>
  <body>${sections}</body>
  <script>
    function runWaybillPrint() {
      try {
        document.querySelectorAll(".waybill-barcode").forEach(function (node) {
          var value = String(node.getAttribute("data-barcode") || "").trim();
          if (!value || typeof JsBarcode !== "function") {
            return;
          }
          JsBarcode(node, value, {
            format: "CODE128",
            displayValue: false,
            margin: 0,
            width: 1.6,
            height: 72
          });
        });
      } catch (error) {
        console.error(error);
      }
      window.setTimeout(function () {
        window.focus();
        window.print();
      }, 180);
    }
    window.addEventListener("load", runWaybillPrint);
  <\/script>
</html>`);
  printDocument.close();
  window.setTimeout(() => {
    printFrame.remove();
  }, 3000);
}

async function previewSelectedMainOrdersWaybills() {
  if (mainOrdersWaybillPrintInFlight || !mainOrdersWaybillSelection.size) {
    return;
  }

  const createdAtEpochMsList = getSelectedMainOrdersWaybillGroupIds();
  if (!createdAtEpochMsList.length) {
    notifyMainOrdersWaybillError("Select at least one order to print.");
    return;
  }

  mainOrdersWaybillPrintInFlight = true;
  syncMainOrdersWaybillPrintButton();
  try {
    const response = await fetch("/api/orders/waybills/preview", {
      method: "POST",
      cache: "no-store",
      headers: withInsightAdminTenantHeaders({
        Accept: "application/json",
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({ createdAtEpochMsList }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.message || "Unable to preview waybills.");
    }

    if (mainOrdersEmbeddedMode && window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: "gms-main-orders-waybill-preview-ready",
        waybills: data?.waybills || [],
        createdAtEpochMsList: data?.createdAtEpochMsList || createdAtEpochMsList,
      }, window.location.origin);
      return;
    }

    openMainOrdersWaybillPreviewModalLocal({
      waybills: data?.waybills || [],
      createdAtEpochMsList: data?.createdAtEpochMsList || createdAtEpochMsList,
    });
  } catch (error) {
    notifyMainOrdersWaybillError(
      error instanceof Error ? error.message : "Unable to preview waybills.",
    );
  } finally {
    mainOrdersWaybillPrintInFlight = false;
    syncMainOrdersWaybillPrintButton();
  }
}

async function confirmSelectedMainOrdersWaybillPrint(createdAtEpochMsList = []) {
  const normalizedGroupIds = [...new Set(
    (Array.isArray(createdAtEpochMsList) ? createdAtEpochMsList : getSelectedMainOrdersWaybillGroupIds())
      .map((value) => Math.trunc(Number(value)))
      .filter((value) => Number.isFinite(value) && value > 0),
  )];
  if (!normalizedGroupIds.length || mainOrdersWaybillPrintInFlight) {
    notifyMainOrdersWaybillPrintError("Select at least one order to print.");
    return;
  }

  mainOrdersWaybillPrintInFlight = true;
  syncMainOrdersWaybillPrintButton();
  try {
    const response = await fetch("/api/orders/waybills/print", {
      method: "POST",
      cache: "no-store",
      headers: withInsightAdminTenantHeaders({
        Accept: "application/json",
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({ createdAtEpochMsList: normalizedGroupIds }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.message || "Unable to print waybills.");
    }

    mainOrdersWaybillSelection.clear();
    const refreshedOrders = await loadOrders({ preserveOnError: true });
    if (Array.isArray(refreshedOrders)) {
      currentInsightOrders = refreshedOrders;
      mainOrdersDataSignature = getMainOrdersDataSignature(refreshedOrders);
      pruneMainOrdersWaybillSelection(refreshedOrders);
      renderCourierTabs();
      renderInsightContent();
    }

    if (mainOrdersEmbeddedMode && window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: "gms-main-orders-waybill-print-complete",
        waybills: data?.waybills || [],
        message: data?.message || "Waybill sent to print.",
      }, window.location.origin);
      return;
    }

    openMainOrdersWaybillPrintWindow(data?.waybills);
    showMainOrdersWaybillSnackbar(
      "Print Waybill",
      data?.message || "Waybill sent to print.",
      "success",
    );
  } catch (error) {
    notifyMainOrdersWaybillPrintError(
      error instanceof Error ? error.message : "Unable to print waybills.",
    );
  } finally {
    mainOrdersWaybillPrintInFlight = false;
    syncMainOrdersWaybillPrintButton();
  }
}

let mainOrdersWaybillPreviewModalState = {
  waybills: [],
  createdAtEpochMsList: [],
};

function openMainOrdersWaybillPreviewModalLocal(payload = {}) {
  /* standalone fallback when not embedded in main dashboard */
  const waybills = Array.isArray(payload?.waybills) ? payload.waybills : [];
  mainOrdersWaybillPreviewModalState = {
    waybills,
    createdAtEpochMsList: Array.isArray(payload?.createdAtEpochMsList)
      ? payload.createdAtEpochMsList
      : waybills.map((entry) => entry?.createdAtEpochMs).filter(Boolean),
  };
  if (!waybills.length) {
    notifyMainOrdersWaybillError("Unable to open the waybill preview.");
    return;
  }
  void confirmSelectedMainOrdersWaybillPrint(mainOrdersWaybillPreviewModalState.createdAtEpochMsList);
}

async function printSelectedMainOrdersWaybills() {
  await previewSelectedMainOrdersWaybills();
}