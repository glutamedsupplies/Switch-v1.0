(() => {
  "use strict";

  const MODE = {
    CREATE: "create",
    SUBMITTED: "submitted",
    EDIT: "edit",
  };

  const els = {
    overlay: null,
    modal: null,
    form: null,
    title: null,
    subtitle: null,
    closeButton: null,
    cancelButton: null,
    endButton: null,
    editButton: null,
    submitButton: null,
    submitLabel: null,
    feedback: null,
    footerNote: null,
    productName: null,
    productMeta: null,
    productThumb: null,
    statusPill: null,
    composePanel: null,
    submittedPanel: null,
    submittedBanner: null,
    summaryPrice: null,
    summaryStock: null,
    summarySchedule: null,
    summaryBuyerLimit: null,
    summaryNotes: null,
    productIdInput: null,
    dealIdInput: null,
    priceInput: null,
    stockInput: null,
    startInput: null,
    endInput: null,
    buyerLimitInput: null,
    notesInput: null,
    stockHelper: null,
  };

  let currentProduct = null;
  let currentDeal = null;
  let modalMode = MODE.CREATE;
  let bound = false;

  function readAdminSession() {
    try {
      const raw = window.localStorage?.getItem("gms-admin-session");
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (_) {
      return null;
    }
  }

  function resolveAdminId() {
    const session = readAdminSession() || {};
    const candidates = [
      session.adminId,
      session.ownerAdminId,
      session.tenantId,
      session.workspaceId,
      session.storeAdminId,
      session.sellerId,
      session.shopId,
      session.id,
      session.accountCode,
    ];
    for (const value of candidates) {
      const normalized = String(value ?? "").trim();
      if (normalized && normalized.toLowerCase() !== "admin") {
        return normalized;
      }
    }
    return "";
  }

  function headers(extra = {}) {
    const session = readAdminSession() || {};
    const adminId = resolveAdminId();
    const sessionToken = String(session.sessionToken || "").trim();
    return {
      Accept: "application/json",
      ...extra,
      ...(adminId ? { "X-GMS-Admin-ID": adminId } : {}),
      ...(sessionToken ? { "X-GMS-Admin-Session": sessionToken } : {}),
    };
  }

  function cacheEls() {
    els.overlay = document.getElementById("seller-flash-deal-modal-overlay");
    els.modal = document.getElementById("seller-flash-deal-modal");
    els.form = document.getElementById("seller-flash-deal-modal-form");
    els.title = document.getElementById("seller-flash-deal-modal-title");
    els.subtitle = document.querySelector("[data-seller-flash-deal-subtitle]");
    els.closeButton = document.getElementById("seller-flash-deal-modal-close-button");
    els.cancelButton = document.getElementById("seller-flash-deal-modal-cancel-button");
    els.endButton = document.getElementById("seller-flash-deal-modal-end-button");
    els.editButton = document.getElementById("seller-flash-deal-modal-edit-button");
    els.submitButton = document.getElementById("seller-flash-deal-modal-submit-button");
    els.submitLabel = document.querySelector("[data-seller-flash-deal-submit-label]");
    els.feedback = document.querySelector("[data-seller-flash-deal-modal-feedback]");
    els.footerNote = document.querySelector("[data-seller-flash-deal-footer-note]");
    els.productName = document.querySelector("[data-seller-flash-deal-product-name]");
    els.productMeta = document.querySelector("[data-seller-flash-deal-product-meta]");
    els.productThumb = document.querySelector("[data-seller-flash-deal-product-thumb]");
    els.statusPill = document.querySelector("[data-seller-flash-deal-status]");
    els.composePanel = document.querySelector("[data-seller-flash-deal-compose]");
    els.submittedPanel = document.querySelector("[data-seller-flash-deal-submitted]");
    els.submittedBanner = document.querySelector(
      "[data-seller-flash-deal-submitted-banner]",
    );
    els.summaryPrice = document.querySelector("[data-seller-flash-deal-summary-price]");
    els.summaryStock = document.querySelector("[data-seller-flash-deal-summary-stock]");
    els.summarySchedule = document.querySelector(
      "[data-seller-flash-deal-summary-schedule]",
    );
    els.summaryBuyerLimit = document.querySelector(
      "[data-seller-flash-deal-summary-buyer-limit]",
    );
    els.summaryNotes = document.querySelector("[data-seller-flash-deal-summary-notes]");
    els.productIdInput = document.getElementById("seller-flash-deal-product-id");
    els.dealIdInput = document.getElementById("seller-flash-deal-id");
    els.priceInput = document.getElementById("seller-flash-deal-price-input");
    els.stockInput = document.getElementById("seller-flash-deal-stock-input");
    els.startInput = document.getElementById("seller-flash-deal-start-input");
    els.endInput = document.getElementById("seller-flash-deal-end-input");
    els.buyerLimitInput = document.getElementById("seller-flash-deal-buyer-limit-input");
    els.notesInput = document.getElementById("seller-flash-deal-notes-input");
    els.stockHelper = document.querySelector("[data-seller-flash-deal-stock-helper]");
  }

  function setFeedback(message, tone = "") {
    if (!(els.feedback instanceof HTMLElement)) return;
    if (!message) {
      els.feedback.hidden = true;
      els.feedback.textContent = "";
      els.feedback.classList.remove("error", "notice", "success");
      return;
    }
    els.feedback.hidden = false;
    els.feedback.textContent = message;
    els.feedback.classList.remove("error", "notice", "success");
    if (tone) els.feedback.classList.add(tone);
  }

  function formatMoney(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return "₱0.00";
    return `₱${num.toFixed(2)}`;
  }

  function formatDateTime(isoOrDate) {
    const date = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function toLocalInputValue(isoOrDate) {
    const date = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
    if (Number.isNaN(date.getTime())) return "";
    const pad = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function defaultSchedule() {
    const start = new Date(Date.now() + 5 * 60 * 1000);
    const end = new Date(start.getTime() + 6 * 60 * 60 * 1000);
    return { start, end };
  }

  function statusLabel(deal) {
    if (!deal) return "";
    const display = String(deal.displayStatus || "").toLowerCase();
    if (display === "pending") return "Pending review";
    if (display === "rejected") return "Rejected";
    if (display === "live") return "Live";
    if (display === "upcoming") return "Upcoming";
    if (display === "ended") return "Ended";
    if (display === "cancelled") return "Cancelled";
    const approval = String(deal.approvalStatus || "").toLowerCase();
    if (approval === "pending") return "Pending review";
    if (approval === "rejected") return "Rejected";
    if (approval === "revision") return "Needs revision";
    const status = String(deal.status || "").toLowerCase();
    if (status === "live") return "Live";
    if (status === "upcoming") return "Upcoming";
    if (status === "ended") return "Ended";
    if (status === "cancelled") return "Cancelled";
    return status || "Draft";
  }

  function statusToneClass(deal) {
    if (!deal) return "";
    const display = String(deal.displayStatus || deal.status || "").toLowerCase();
    if (display === "pending" || display === "revision") return "is-pending";
    if (display === "live") return "is-live";
    if (display === "upcoming") return "is-upcoming";
    if (
      display === "ended" ||
      display === "cancelled" ||
      display === "rejected"
    ) {
      return "is-ended";
    }
    return "is-pending";
  }

  function dealFlags(deal) {
    const status = String(deal?.displayStatus || deal?.status || "").toLowerCase();
    const approval = String(deal?.approvalStatus || "").toLowerCase();
    const canEdit =
      !deal ||
      status === "upcoming" ||
      status === "pending" ||
      approval === "pending" ||
      approval === "revision" ||
      !deal.id;
    const canEndOrCancel =
      Boolean(deal?.id) &&
      status !== "ended" &&
      status !== "cancelled" &&
      status !== "rejected";
    const isLive = status === "live";
    const isTerminal =
      status === "ended" || status === "cancelled" || status === "rejected";
    return { status, approval, canEdit, canEndOrCancel, isLive, isTerminal };
  }

  function paintProduct(product) {
    if (els.productName) {
      els.productName.textContent = product?.name || "Listing";
    }
    if (els.productMeta) {
      els.productMeta.textContent = `${formatMoney(product?.originalPrice)} · Stock ${
        product?.sellableStock ?? 0
      }`;
    }
    if (els.stockHelper) {
      els.stockHelper.textContent = `Max equals current sellable stock (${
        product?.sellableStock ?? 0
      }).`;
    }
    if (els.stockInput) {
      const max = Math.max(1, Number(product?.sellableStock) || 1);
      els.stockInput.max = String(max);
    }
    if (els.productThumb instanceof HTMLElement) {
      const imageUrl = String(product?.imageUrl || "").trim();
      if (imageUrl) {
        els.productThumb.innerHTML = `<img src="${imageUrl.replace(/"/g, "&quot;")}" alt="" />`;
        els.productThumb.style.backgroundImage = "";
      } else {
        els.productThumb.innerHTML = "";
        els.productThumb.style.backgroundImage = "";
      }
    }
  }

  function paintStatus(deal) {
    if (!(els.statusPill instanceof HTMLElement)) return;
    if (!deal) {
      els.statusPill.hidden = true;
      els.statusPill.textContent = "";
      els.statusPill.className = "seller-flash-deal-modal__status-pill";
      return;
    }
    els.statusPill.hidden = false;
    els.statusPill.textContent = statusLabel(deal);
    els.statusPill.className = `seller-flash-deal-modal__status-pill ${statusToneClass(deal)}`;
  }

  function paintSubmittedSummary(deal) {
    if (els.summaryPrice) {
      els.summaryPrice.textContent = formatMoney(deal?.flashPrice);
    }
    if (els.summaryStock) {
      const sold = Number(deal?.dealStockSold) || 0;
      const limit = Number(deal?.dealStockLimit) || 0;
      els.summaryStock.textContent = limit
        ? `${sold} sold / ${limit} deal stock`
        : "—";
    }
    if (els.summarySchedule) {
      els.summarySchedule.textContent =
        deal?.startsAt && deal?.endsAt
          ? `${formatDateTime(deal.startsAt)} → ${formatDateTime(deal.endsAt)}`
          : "—";
    }
    if (els.summaryBuyerLimit) {
      els.summaryBuyerLimit.textContent = String(deal?.perBuyerLimit || 1);
    }
    if (els.summaryNotes) {
      const notes = String(deal?.notes || "").trim();
      els.summaryNotes.textContent = notes || "No notes";
    }
    if (els.submittedBanner instanceof HTMLElement) {
      const { status, approval, isLive, isTerminal } = dealFlags(deal);
      if (isLive) {
        els.submittedBanner.textContent =
          "This Flash Deal is live. You can end it early if needed.";
      } else if (approval === "revision") {
        els.submittedBanner.textContent =
          "Super Admin requested changes. Edit and re-submit.";
      } else if (status === "pending" || approval === "pending") {
        els.submittedBanner.textContent =
          "Submitted for Super Admin review. Edit anytime before it is approved.";
      } else if (isTerminal) {
        els.submittedBanner.textContent = `This Flash Deal is ${statusLabel(deal).toLowerCase()}.`;
      } else {
        els.submittedBanner.textContent =
          "Flash Deal details. Use Edit to update and re-submit.";
      }
    }
  }

  function setFormEditable(editable) {
    [
      els.priceInput,
      els.stockInput,
      els.startInput,
      els.endInput,
      els.buyerLimitInput,
      els.notesInput,
    ].forEach((input) => {
      if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
        input.disabled = !editable;
      }
    });
  }

  function fillForm(deal, product) {
    if (els.productIdInput) els.productIdInput.value = product?.id || "";
    if (els.dealIdInput) els.dealIdInput.value = deal?.id || "";
    if (els.priceInput) {
      els.priceInput.value =
        deal?.flashPrice != null ? String(deal.flashPrice) : "";
    }
    if (els.stockInput) {
      els.stockInput.value =
        deal?.dealStockLimit != null
          ? String(deal.dealStockLimit)
          : String(
              Math.min(
                Math.max(1, product?.sellableStock || 1),
                product?.sellableStock || 1,
              ),
            );
    }
    if (els.buyerLimitInput) {
      els.buyerLimitInput.value = String(deal?.perBuyerLimit || 1);
    }
    if (els.notesInput) {
      els.notesInput.value = deal?.notes || "";
    }
    if (deal?.startsAt && deal?.endsAt) {
      if (els.startInput) els.startInput.value = toLocalInputValue(deal.startsAt);
      if (els.endInput) els.endInput.value = toLocalInputValue(deal.endsAt);
    } else {
      const schedule = defaultSchedule();
      if (els.startInput) els.startInput.value = toLocalInputValue(schedule.start);
      if (els.endInput) els.endInput.value = toLocalInputValue(schedule.end);
    }
  }

  function applyMode(mode) {
    modalMode = mode;
    const { canEdit, canEndOrCancel, isLive, isTerminal } = dealFlags(currentDeal);
    const isSubmittedView = mode === MODE.SUBMITTED;
    const isCompose = mode === MODE.CREATE || mode === MODE.EDIT;

    if (els.composePanel instanceof HTMLElement) {
      els.composePanel.hidden = !isCompose;
    }
    if (els.submittedPanel instanceof HTMLElement) {
      els.submittedPanel.hidden = !isSubmittedView;
    }

    if (els.title) {
      if (mode === MODE.CREATE) els.title.textContent = "Create Flash Deal";
      else if (mode === MODE.EDIT) els.title.textContent = "Edit Flash Deal";
      else els.title.textContent = "Flash Deal submitted";
    }
    if (els.subtitle) {
      if (mode === MODE.CREATE) {
        els.subtitle.textContent =
          "Set a timed flash price and deal stock for this listing. Submitted deals await Super Admin review.";
      } else if (mode === MODE.EDIT) {
        els.subtitle.textContent =
          "Update the deal details, then re-submit for Super Admin review.";
      } else {
        els.subtitle.textContent =
          "Your Flash Deal is on file. Review the details or edit before approval.";
      }
    }
    if (els.footerNote) {
      if (isSubmittedView) {
        els.footerNote.textContent = isLive
          ? "Live deals stay active until end time — or end them early from here."
          : "Pending deals need Super Admin approval. Tap Edit to change details and re-submit.";
      } else if (mode === MODE.EDIT) {
        els.footerNote.textContent =
          "Saving sends this Flash Deal back to Super Admin for review.";
      } else {
        els.footerNote.textContent =
          "Pending deals need Super Admin approval. Approved deals go Live automatically at start time.";
      }
    }

    setFormEditable(isCompose && canEdit && !isLive);
    if (els.submitButton instanceof HTMLButtonElement) {
      els.submitButton.hidden = !isCompose || isLive || isTerminal;
    }
    if (els.submitLabel) {
      els.submitLabel.textContent =
        mode === MODE.EDIT || currentDeal?.id
          ? "Update & re-submit"
          : "Submit Flash Deal";
    }
    if (els.editButton instanceof HTMLButtonElement) {
      els.editButton.hidden = !(isSubmittedView && canEdit && !isLive && !isTerminal);
    }
    if (els.endButton instanceof HTMLButtonElement) {
      els.endButton.hidden = !canEndOrCancel;
      els.endButton.textContent = isLive ? "End now" : "Cancel deal";
    }
    if (els.cancelButton instanceof HTMLButtonElement) {
      els.cancelButton.textContent = "Close";
    }

    if (isSubmittedView) {
      paintSubmittedSummary(currentDeal);
    }
  }

  function closeModal() {
    if (!(els.overlay instanceof HTMLElement)) return;
    els.overlay.classList.remove("is-open");
    els.overlay.setAttribute("aria-hidden", "true");
    window.setTimeout(() => {
      if (els.overlay) els.overlay.hidden = true;
    }, 160);
    currentProduct = null;
    currentDeal = null;
    modalMode = MODE.CREATE;
    setFeedback("");
  }

  function openModalShell() {
    if (!(els.overlay instanceof HTMLElement)) return;
    els.overlay.hidden = false;
    els.overlay.setAttribute("aria-hidden", "false");
    requestAnimationFrame(() => {
      els.overlay?.classList.add("is-open");
    });
    els.modal?.focus?.();
  }

  async function loadForProduct(productId) {
    const response = await fetch(
      `/api/admin/flash-deals/for-product/${encodeURIComponent(productId)}`,
      { headers: headers(), credentials: "same-origin" },
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(
          "Flash Deal API not found. Restart the backend server, then hard refresh this page.",
        );
      }
      throw new Error(data.message || "Unable to load Flash Deal.");
    }
    return data;
  }

  async function openForProduct(productLike) {
    cacheEls();
    if (!(els.overlay instanceof HTMLElement) || !(els.form instanceof HTMLFormElement)) {
      window.alert("Flash Deal modal is not available on this page.");
      return;
    }
    bindOnce();
    const productId = String(
      productLike?.id || productLike?.productId || "",
    ).trim();
    if (!productId) {
      window.alert("Missing product id.");
      return;
    }
    setFeedback("");
    openModalShell();
    try {
      const data = await loadForProduct(productId);
      currentProduct = data.product || null;
      currentDeal = data.deal || null;
      paintProduct(currentProduct);
      paintStatus(currentDeal);
      fillForm(currentDeal, currentProduct);
      if (currentDeal?.id) {
        applyMode(MODE.SUBMITTED);
      } else {
        applyMode(MODE.CREATE);
      }
    } catch (error) {
      closeModal();
      window.alert(
        error instanceof Error ? error.message : "Unable to open Flash Deal.",
      );
    }
  }

  function enterEditMode() {
    if (!currentDeal?.id) return;
    const { canEdit, isLive } = dealFlags(currentDeal);
    if (!canEdit || isLive) return;
    fillForm(currentDeal, currentProduct);
    applyMode(MODE.EDIT);
    setFeedback("");
    els.priceInput?.focus?.();
  }

  function collectPayload() {
    return {
      productId: String(els.productIdInput?.value || "").trim(),
      flashPrice: String(els.priceInput?.value || "").trim(),
      dealStockLimit: String(els.stockInput?.value || "").trim(),
      startsAt: els.startInput?.value
        ? new Date(els.startInput.value).toISOString()
        : "",
      endsAt: els.endInput?.value
        ? new Date(els.endInput.value).toISOString()
        : "",
      perBuyerLimit: String(els.buyerLimitInput?.value || "1").trim(),
      notes: String(els.notesInput?.value || "").trim(),
    };
  }

  async function submitForm(event) {
    event.preventDefault();
    if (modalMode === MODE.SUBMITTED) return;
    setFeedback("");
    const dealId = String(els.dealIdInput?.value || "").trim();
    const payload = collectPayload();
    if (!payload.productId) {
      setFeedback("Product is required.", "error");
      return;
    }
    const url = dealId
      ? `/api/admin/flash-deals/${encodeURIComponent(dealId)}`
      : "/api/admin/flash-deals";
    const method = dealId ? "PUT" : "POST";
    if (els.submitButton instanceof HTMLButtonElement) {
      els.submitButton.disabled = true;
    }
    try {
      const response = await fetch(url, {
        method,
        headers: headers({ "Content-Type": "application/json" }),
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "Unable to save Flash Deal.");
      }
      currentDeal = data.deal || null;
      paintStatus(currentDeal);
      fillForm(currentDeal, currentProduct);
      applyMode(MODE.SUBMITTED);
      setFeedback(data.message || "Flash Deal submitted for review.", "success");
      window.dispatchEvent(new CustomEvent("gms-flash-deals-changed"));
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "Unable to save Flash Deal.",
        "error",
      );
    } finally {
      if (els.submitButton instanceof HTMLButtonElement) {
        els.submitButton.disabled = false;
      }
    }
  }

  async function cancelDeal() {
    const dealId = String(els.dealIdInput?.value || "").trim();
    if (!dealId) return;
    const { isLive } = dealFlags(currentDeal);
    if (
      !window.confirm(
        isLive
          ? "End this Flash Deal now? Buyers will lose the flash price."
          : "Cancel this Flash Deal?",
      )
    ) {
      return;
    }
    setFeedback("");
    try {
      const response = await fetch(
        isLive
          ? `/api/admin/flash-deals/${encodeURIComponent(dealId)}/end`
          : `/api/admin/flash-deals/${encodeURIComponent(dealId)}`,
        {
          method: isLive ? "POST" : "DELETE",
          headers: headers(isLive ? { "Content-Type": "application/json" } : {}),
          credentials: "same-origin",
          body: isLive ? "{}" : undefined,
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          data.message ||
            (isLive ? "Unable to end Flash Deal." : "Unable to cancel Flash Deal."),
        );
      }
      currentDeal = data.deal || null;
      paintStatus(currentDeal);
      fillForm(currentDeal, currentProduct);
      if (currentDeal?.id) {
        applyMode(MODE.SUBMITTED);
      } else {
        applyMode(MODE.CREATE);
      }
      setFeedback(
        data.message || (isLive ? "Flash Deal ended." : "Flash Deal cancelled."),
        "success",
      );
      window.dispatchEvent(new CustomEvent("gms-flash-deals-changed"));
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : isLive
            ? "Unable to end Flash Deal."
            : "Unable to cancel Flash Deal.",
        "error",
      );
    }
  }

  function bindOnce() {
    if (bound) return;
    bound = true;
    document.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;
      if (
        target.closest(
          "#seller-flash-deal-modal-close-button, #seller-flash-deal-modal-cancel-button",
        )
      ) {
        closeModal();
        return;
      }
      if (target.closest("#seller-flash-deal-modal-edit-button")) {
        enterEditMode();
        return;
      }
      if (target.closest("#seller-flash-deal-modal-end-button")) {
        void cancelDeal();
        return;
      }
      if (target.id === "seller-flash-deal-modal-overlay") {
        closeModal();
      }
    });
    document.addEventListener("submit", (event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || form.id !== "seller-flash-deal-modal-form") {
        return;
      }
      void submitForm(event);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      if (els.overlay && !els.overlay.hidden) {
        closeModal();
      }
    });
  }

  function boot() {
    cacheEls();
    bindOnce();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }

  window.SwitchSellerFlashDeals = {
    openForProduct,
    close: closeModal,
  };
})();
