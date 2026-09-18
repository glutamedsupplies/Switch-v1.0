(function () {
  const CONCERN_REFRESH_INTERVAL_MS = 2500;
  const cancelList = document.querySelector("[data-concern-cancel-list]");
  const returnList = document.querySelector("[data-concern-return-list]");

  if (!cancelList && !returnList) {
    return;
  }

  const state = {
    cancelGroups: [],
    returnGroups: [],
    processingIds: new Set(),
  };
  let concernRealtimeRefreshTimer = 0;

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function normalizeStage(value) {
    const rawStage = String(value ?? "").trim();
    const compactStage = rawStage.toLowerCase().replace(/[^a-z0-9]+/g, "");

    if (compactStage === "topay" || compactStage === "pendingpayment") {
      return "toPay";
    }
    if (compactStage === "toprepare" || compactStage === "processing" || compactStage === "preparing") {
      return "toPrepare";
    }
    if (compactStage === "toship" || compactStage === "ready" || compactStage === "packed") {
      return "toShip";
    }
    if (
      compactStage === "toreceive" ||
      compactStage === "intransit" ||
      compactStage === "shipped" ||
      compactStage === "outfordelivery" ||
      compactStage === "onroute"
    ) {
      return "toReceive";
    }
    if (
      compactStage === "toreview" ||
      compactStage === "delivered" ||
      compactStage === "completed" ||
      compactStage === "received"
    ) {
      return "toReview";
    }
    if (
      compactStage === "returnrequest" ||
      compactStage === "return" ||
      compactStage === "returned" ||
      compactStage === "refund" ||
      compactStage === "refundrequest"
    ) {
      return "returnRequest";
    }
    if (compactStage === "cancelled" || compactStage === "canceled" || compactStage === "cancel") {
      return "cancelled";
    }

    return rawStage || "toPrepare";
  }

  function formatTimestamp(value) {
    const numericValue = Number(value || 0);
    const date = new Date(numericValue || value);
    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function formatCurrency(value) {
    const amount = Number(value || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      return "";
    }

    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      maximumFractionDigits: 2,
    }).format(amount);
  }

  function normalizeEntry(entry) {
    return {
      id: String(entry?.id || "").trim(),
      createdAtEpochMs: Number(entry?.createdAtEpochMs || 0) || 0,
      productName: String(entry?.productName || "").trim(),
      quantity: Number(entry?.quantity || 0) || 0,
      stage: normalizeStage(entry?.stage || entry?.status),
      paymentOptionLabel: String(
        entry?.paymentOptionLabel || entry?.payment || entry?.paymentMethod || "",
      ).trim(),
      deliveryPartnerName: String(
        entry?.deliveryPartnerName || entry?.deliveryPartner || entry?.courier || "",
      ).trim(),
      clientName: String(
        entry?.clientName || entry?.customerName || entry?.customer || "",
      ).trim(),
      clientContactNumber: String(
        entry?.clientContactNumber || entry?.contactNumber || "",
      ).trim(),
      clientAddress: String(entry?.clientAddress || entry?.address || "").trim(),
      cancelRequestStatus: String(entry?.cancelRequestStatus || "").trim().toLowerCase(),
      cancelRequestReason: String(entry?.cancelRequestReason || "").trim(),
      cancelRequestSubmittedAtEpochMs:
        Number(entry?.cancelRequestSubmittedAtEpochMs || 0) || 0,
      refundRequestStatus: String(
        entry?.refundRequestStatus || entry?.returnRequestStatus || "",
      ).trim().toLowerCase(),
      refundRequestReason: String(
        entry?.refundRequestReason ||
          entry?.returnRequestReason ||
          entry?.refundReason ||
          entry?.returnReason ||
          entry?.cancelRequestReason ||
          "",
      ).trim(),
      refundRequestSubmittedAtEpochMs:
        Number(
          entry?.refundRequestSubmittedAtEpochMs ||
            entry?.returnRequestSubmittedAtEpochMs ||
            entry?.cancelRequestSubmittedAtEpochMs ||
            0,
        ) || 0,
      grandTotalAmount: Number(entry?.grandTotalAmount || entry?.amount || entry?.total || 0) || 0,
    };
  }

  function createGroup(entry, type) {
    return {
      createdAtEpochMs: entry.createdAtEpochMs,
      clientName: entry.clientName,
      clientContactNumber: entry.clientContactNumber,
      clientAddress: entry.clientAddress,
      paymentOptionLabel: entry.paymentOptionLabel,
      deliveryPartnerName: entry.deliveryPartnerName,
      reason:
        type === "cancel"
          ? entry.cancelRequestReason
          : entry.refundRequestReason,
      submittedAtEpochMs:
        type === "cancel"
          ? entry.cancelRequestSubmittedAtEpochMs
          : entry.refundRequestSubmittedAtEpochMs,
      stage: entry.stage,
      entries: [],
    };
  }

  function groupEntries(entries, type) {
    const groupsByCreatedAt = new Map();
    const normalizedEntries = (Array.isArray(entries) ? entries : []).map(normalizeEntry);

    normalizedEntries.forEach((entry) => {
      const isCancelRequest =
        type === "cancel" &&
        entry.createdAtEpochMs &&
        entry.stage === "toPrepare" &&
        entry.cancelRequestStatus === "pending";
      const isReturnRequest =
        type === "return" &&
        entry.createdAtEpochMs &&
        (
          entry.stage === "returnRequest" ||
          entry.refundRequestStatus === "pending"
        );

      if (!isCancelRequest && !isReturnRequest) {
        return;
      }

      const groupKey = String(entry.createdAtEpochMs);
      if (!groupsByCreatedAt.has(groupKey)) {
        groupsByCreatedAt.set(groupKey, createGroup(entry, type));
      }

      const group = groupsByCreatedAt.get(groupKey);
      group.entries.push(entry);
      if (!group.reason) {
        group.reason = type === "cancel" ? entry.cancelRequestReason : entry.refundRequestReason;
      }
      if (!group.submittedAtEpochMs) {
        group.submittedAtEpochMs =
          type === "cancel"
            ? entry.cancelRequestSubmittedAtEpochMs
            : entry.refundRequestSubmittedAtEpochMs;
      }
    });

    return [...groupsByCreatedAt.values()].sort(
      (left, right) => right.createdAtEpochMs - left.createdAtEpochMs,
    );
  }

  function formatItemSummary(entries) {
    const totalQuantity = entries.reduce(
      (sum, entry) => sum + Math.max(Number(entry.quantity || 0), 0),
      0,
    );
    const baseLabel =
      totalQuantity === 1 ? "1 item" : `${totalQuantity.toLocaleString("en-US")} items`;
    if (!entries.length) {
      return baseLabel;
    }
    if (entries.length === 1) {
      return `${entries[0].productName || "Unnamed Product"} - ${baseLabel}`;
    }
    return `${entries[0].productName || "Unnamed Product"} +${entries.length - 1} more - ${baseLabel}`;
  }

  function getGroupAmountLabel(group) {
    const amounts = group.entries
      .map((entry) => Math.max(Number(entry.grandTotalAmount || 0), 0))
      .filter((amount) => amount > 0);
    const amount = amounts.length ? Math.max(...amounts) : 0;
    return formatCurrency(amount);
  }

  function getInitial(group) {
    return (
      (group.clientName || group.entries[0]?.productName || "?")
        .trim()
        .charAt(0)
        .toUpperCase() || "?"
    );
  }

  function getCustomerLine(group) {
    return [group.clientName, group.clientContactNumber].filter(Boolean).join(" | ");
  }

  function renderPlaceholder(title, copy) {
    return `
      <div class="employee-chat-placeholder concern-placeholder">
        <strong>${escapeHtml(title)}</strong>
        <p>${escapeHtml(copy)}</p>
      </div>
    `;
  }

  function renderGroupCard(group, type) {
    const groupKey = String(group.createdAtEpochMs);
    const isProcessing = state.processingIds.has(groupKey);
    const submittedAt = formatTimestamp(group.submittedAtEpochMs || group.createdAtEpochMs);
    const customerLine = getCustomerLine(group);
    const amountLabel = getGroupAmountLabel(group);
    const reasonLabel = type === "cancel" ? "Cancel Reason" : "Return Request";
    const statusLabel = type === "cancel"
      ? group.paymentOptionLabel || "Payment pending"
      : "Return request";

    return `
      <article class="employee-cancel-card concern-card concern-card--${escapeHtml(type)}">
        <div class="employee-cancel-card__header">
          <div class="employee-chat-thread-item__avatar employee-cancel-card__avatar">${escapeHtml(getInitial(group))}</div>
          <div class="employee-cancel-card__copy">
            <div class="employee-cancel-card__title-row">
              <strong>${escapeHtml(customerLine || "App User")}</strong>
              <span>${escapeHtml(submittedAt || "")}</span>
            </div>
            <p>${escapeHtml(group.clientAddress || "No address provided")}</p>
          </div>
        </div>

        <div class="employee-cancel-card__meta">
          <span class="count-pill">${escapeHtml(statusLabel)}</span>
          ${amountLabel ? `<span class="count-pill concern-card__amount">${escapeHtml(amountLabel)}</span>` : ""}
          <span class="employee-cancel-card__items">${escapeHtml(formatItemSummary(group.entries))}</span>
        </div>

        <div class="employee-cancel-card__reason">
          <p class="section-label">${escapeHtml(reasonLabel)}</p>
          <strong>${escapeHtml(group.reason || "No reason provided")}</strong>
        </div>

        ${type === "cancel" ? `
          <div class="employee-cancel-card__actions">
            <button
              type="button"
              class="dashboard-link-button dashboard-link-button--ghost employee-cancel-action"
              data-created-at="${escapeHtml(groupKey)}"
              data-cancel-action="reject"
              ${isProcessing ? "disabled" : ""}
            >
              ${isProcessing ? "Processing..." : "Keep Order"}
            </button>
            <button
              type="button"
              class="dashboard-link-button employee-cancel-action"
              data-created-at="${escapeHtml(groupKey)}"
              data-cancel-action="accept"
              ${isProcessing ? "disabled" : ""}
            >
              ${isProcessing ? "Processing..." : "Accept Cancel"}
            </button>
          </div>
        ` : ""}
      </article>
    `;
  }

  function renderCancelRequests() {
    if (!cancelList) {
      return;
    }

    if (!state.cancelGroups.length) {
      cancelList.innerHTML = renderPlaceholder(
        "No pending requests",
        "Cancellation requests from the app will appear here.",
      );
      return;
    }

    cancelList.innerHTML = state.cancelGroups
      .map((group) => renderGroupCard(group, "cancel"))
      .join("");
  }

  function renderReturnRequests() {
    if (!returnList) {
      return;
    }

    if (!state.returnGroups.length) {
      returnList.innerHTML = renderPlaceholder(
        "No return requests",
        "Return requests from the app will appear here.",
      );
      return;
    }

    returnList.innerHTML = state.returnGroups
      .map((group) => renderGroupCard(group, "return"))
      .join("");
  }

  function render() {
    renderCancelRequests();
    renderReturnRequests();
  }

  async function loadConcernRequests() {
    try {
      const response = await fetch("/api/orders", {
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message || "Unable to load concerns.");
      }

      const orders = Array.isArray(data?.orders)
        ? data.orders
        : Array.isArray(data)
          ? data
          : [];
      state.cancelGroups = groupEntries(orders, "cancel");
      state.returnGroups = groupEntries(orders, "return");
      render();
    } catch (error) {
      if (cancelList && !state.cancelGroups.length) {
        cancelList.innerHTML = renderPlaceholder(
          "Unable to load cancel requests",
          "Check if the backend is running, then refresh this page.",
        );
      }
      if (returnList && !state.returnGroups.length) {
        returnList.innerHTML = renderPlaceholder(
          "Unable to load return requests",
          "Check if the backend is running, then refresh this page.",
        );
      }
    }
  }

  function scheduleConcernRealtimeRefresh(delay = 180) {
    window.clearTimeout(concernRealtimeRefreshTimer);
    concernRealtimeRefreshTimer = window.setTimeout(() => {
      concernRealtimeRefreshTimer = 0;
      if (state.processingIds.size > 0) {
        scheduleConcernRealtimeRefresh(240);
        return;
      }
      void loadConcernRequests();
    }, delay);
  }

  function handleConcernRealtimeChange(event) {
    const detail = event?.detail && typeof event.detail === "object" ? event.detail : {};
    if (detail.type === "ready") {
      if (detail.reconnected !== true) {
        return;
      }
    } else if (detail.type === "data-change") {
      const topics = Array.isArray(detail.topics)
        ? detail.topics.map((topic) => String(topic || "").trim().toLowerCase())
        : [];
      if (!topics.includes("all") && !topics.includes("orders")) {
        return;
      }
    } else {
      return;
    }
    scheduleConcernRealtimeRefresh();
  }

  async function handleCancelDecision(createdAtEpochMs, action) {
    const normalizedId = String(createdAtEpochMs || "").trim();
    const normalizedAction = String(action || "").trim().toLowerCase();
    if (
      !normalizedId ||
      (normalizedAction !== "accept" && normalizedAction !== "reject") ||
      state.processingIds.has(normalizedId)
    ) {
      return;
    }

    state.processingIds.add(normalizedId);
    renderCancelRequests();

    try {
      const response = await fetch(
        `/api/orders/${encodeURIComponent(normalizedId)}/cancel-request/${encodeURIComponent(normalizedAction)}`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
          },
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message || "Unable to process cancel request.");
      }

      await loadConcernRequests();
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to process cancel request.",
      );
    } finally {
      state.processingIds.delete(normalizedId);
      renderCancelRequests();
    }
  }

  cancelList?.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }

    const button = event.target.closest("[data-cancel-action]");
    if (!button) {
      return;
    }

    void handleCancelDecision(
      button.getAttribute("data-created-at"),
      button.getAttribute("data-cancel-action"),
    );
  });

  render();
  window.addEventListener("gms:realtime-change", handleConcernRealtimeChange);
  void loadConcernRequests();
  window.setInterval(loadConcernRequests, CONCERN_REFRESH_INTERVAL_MS);
})();
