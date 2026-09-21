function getInsightOrderGroupId(order) {
  return Math.trunc(Number(order?.createdAtEpochMs) || 0);
}

function resolveInsightDeliveryPartnerForOrder(order, partners = currentInsightDeliveryPartners) {
  const partnerName = String(
    order?.deliveryPartnerName ?? order?.courier ?? order?.deliveryProvider ?? "",
  ).trim().toLowerCase();
  if (!partnerName) {
    return null;
  }
  return (Array.isArray(partners) ? partners : []).find((partner) =>
    String(partner?.branch ?? partner?.name ?? "").trim().toLowerCase() === partnerName,
  ) || null;
}

function orderNeedsWaybill(order, partners = currentInsightDeliveryPartners) {
  if (order?.needsWaybill === true || order?.canPrintWaybill === true) {
    return true;
  }
  if (order?.needsWaybill === false) {
    return false;
  }
  const partner = resolveInsightDeliveryPartnerForOrder(order, partners);
  return Boolean(partner?.needsWaybill || partner?.hasApiKey);
}

function canSelectOrderForWaybill(order) {
  if (!mainOrdersEmbeddedMode || !orderNeedsWaybill(order)) {
    return false;
  }
  if (Math.trunc(Number(order?.waybillPrintedAtEpochMs) || 0) > 0) {
    return false;
  }
  const normalizedStatus = normalizeStatus(order?.stage || order?.status);
  return order?.canPrintWaybill === true
    || normalizedStatus === "awaitingwaybill"
    || normalizedStatus === "awaiting-waybill"
    || normalizedStatus === "toprepare"
    || normalizedStatus === "to-prepare";
}

function syncMainOrdersWaybillPrintButton() {
  if (!mainOrdersWaybillPrintButtonEl) {
    return;
  }

  const selectedCount = mainOrdersWaybillSelection.size;
  const shouldShow = selectedCount > 0;
  mainOrdersWaybillPrintButtonEl.hidden = !shouldShow;
  mainOrdersWaybillPrintButtonEl.disabled = mainOrdersWaybillPrintInFlight || !shouldShow;
  if (mainOrdersWaybillPrintCountEl) {
    mainOrdersWaybillPrintCountEl.hidden = !shouldShow;
    mainOrdersWaybillPrintCountEl.textContent = String(selectedCount);
  }
}

function pruneMainOrdersWaybillSelection(orders = currentInsightOrders) {
  const eligibleGroupIds = new Set(
    (Array.isArray(orders) ? orders : [])
      .filter((order) => canSelectOrderForWaybill(order))
      .map((order) => String(getInsightOrderGroupId(order)))
      .filter((groupId) => groupId !== "0"),
  );
  for (const groupId of [...mainOrdersWaybillSelection]) {
    if (!eligibleGroupIds.has(groupId)) {
      mainOrdersWaybillSelection.delete(groupId);
    }
  }
  syncMainOrdersWaybillPrintButton();
}

function openMainOrdersWaybillPrintWindow(waybills = []) {
  const documents = Array.isArray(waybills) ? waybills : [];
  if (!documents.length) {
    return;
  }

  const printWindow = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
  if (!printWindow) {
    window.alert("Allow pop-ups to print waybills.");
    return;
  }

  const combinedHtml = documents
    .map((entry, index) => {
      const html = String(entry?.html ?? "");
      if (!html) {
        return "";
      }
      if (documents.length === 1) {
        return html;
      }
      const pageBreak = index < documents.length - 1 ? ' style="page-break-after: always;"' : "";
      return `<div${pageBreak}>${html.replace(/^<!doctype html>/i, "").replace(/<\/html>\s*$/i, "")}</div>`;
    })
    .join("");

  printWindow.document.open();
  printWindow.document.write(combinedHtml || "<p>No waybill content available.</p>");
  printWindow.document.close();
  printWindow.focus();
}

async function printSelectedMainOrdersWaybills() {
  if (mainOrdersWaybillPrintInFlight || !mainOrdersWaybillSelection.size) {
    return;
  }

  const createdAtEpochMsList = [...mainOrdersWaybillSelection]
    .map((value) => Math.trunc(Number(value)))
    .filter((value) => Number.isFinite(value) && value > 0);
  if (!createdAtEpochMsList.length) {
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
      body: JSON.stringify({ createdAtEpochMsList }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.message || "Unable to print waybills.");
    }

    openMainOrdersWaybillPrintWindow(data?.waybills);
    mainOrdersWaybillSelection.clear();
    const refreshedOrders = await loadOrders({ preserveOnError: true });
    if (Array.isArray(refreshedOrders)) {
      currentInsightOrders = refreshedOrders;
      mainOrdersDataSignature = getMainOrdersDataSignature(refreshedOrders);
      pruneMainOrdersWaybillSelection(refreshedOrders);
      renderCourierTabs();
      renderInsightContent();
    }
  } catch (error) {
    window.alert(error instanceof Error ? error.message : "Unable to print waybills.");
  } finally {
    mainOrdersWaybillPrintInFlight = false;
    syncMainOrdersWaybillPrintButton();
  }
}

function createMainOrdersTableRow(order, options = {}) {