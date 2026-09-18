(() => {
  "use strict";

  const FILTERS = [
    { id: "pending", label: "Pending" },
    { id: "all", label: "All" },
    { id: "upcoming", label: "Upcoming" },
    { id: "live", label: "Live" },
    { id: "ended", label: "Ended" },
    { id: "rejected", label: "Rejected" },
  ];

  const els = {
    list: null,
    total: null,
    pendingBadge: null,
    filterGroup: null,
    feedback: null,
  };

  const state = {
    items: [],
    filter: "pending",
    loading: false,
    actingId: "",
    bound: false,
  };

  function refreshElements() {
    els.list = document.querySelector("[data-super-admin-flash-deals-list]");
    els.total = document.querySelector("[data-super-admin-flash-deals-total]");
    els.pendingBadge = document.querySelector(
      "[data-super-admin-flash-deal-pending-count]",
    );
    els.filterGroup = document.querySelector(
      "[data-super-admin-flash-deals-filters]",
    );
    els.feedback = document.querySelector(
      "[data-super-admin-flash-deals-feedback]",
    );
  }

  function headers(extra = {}) {
    let token = "";
    try {
      const raw =
        sessionStorage.getItem("gms-super-admin-session") ||
        localStorage.getItem("gms-super-admin-session");
      const session = raw ? JSON.parse(raw) : null;
      token = String(session?.token || "").trim();
    } catch (_) {
      token = "";
    }
    return {
      Accept: "application/json",
      ...extra,
      ...(token ? { "X-GMS-Super-Admin-Token": token } : {}),
    };
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatMoney(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return "—";
    return `₱${num.toLocaleString("en-PH", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  }

  function formatWhen(value) {
    const date = new Date(String(value || ""));
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }

  function displayStatus(deal) {
    const approval = String(deal?.approvalStatus || "").trim().toLowerCase();
    const status = String(deal?.displayStatus || deal?.status || "")
      .trim()
      .toLowerCase();
    if (approval === "pending" || approval === "revision") return "pending";
    if (approval === "rejected" || status === "rejected") return "rejected";
    if (status === "cancelled") return "cancelled";
    if (status === "live") return "live";
    if (status === "ended") return "ended";
    if (status === "upcoming") return "upcoming";
    return status || "upcoming";
  }

  function statusLabel(status) {
    switch (status) {
      case "pending":
        return "Pending";
      case "upcoming":
        return "Upcoming";
      case "live":
        return "Live";
      case "ended":
        return "Ended";
      case "rejected":
        return "Rejected";
      case "cancelled":
        return "Cancelled";
      default:
        return status || "—";
    }
  }

  function setFeedback(message, tone = "") {
    refreshElements();
    if (!(els.feedback instanceof HTMLElement)) return;
    const text = String(message || "").trim();
    if (!text) {
      els.feedback.hidden = true;
      els.feedback.textContent = "";
      els.feedback.removeAttribute("data-tone");
      return;
    }
    els.feedback.hidden = false;
    els.feedback.textContent = text;
    if (tone) {
      els.feedback.setAttribute("data-tone", tone);
    } else {
      els.feedback.removeAttribute("data-tone");
    }
  }

  function pendingCount() {
    return state.items.filter((deal) => displayStatus(deal) === "pending")
      .length;
  }

  function filteredItems() {
    if (state.filter === "all") return state.items;
    return state.items.filter((deal) => displayStatus(deal) === state.filter);
  }

  function syncPendingBadge() {
    refreshElements();
    const count = pendingCount();
    if (els.pendingBadge instanceof HTMLElement) {
      els.pendingBadge.textContent = String(count);
      els.pendingBadge.hidden = count <= 0;
    }
  }

  function renderFilters() {
    refreshElements();
    if (!(els.filterGroup instanceof HTMLElement)) return;
    els.filterGroup.innerHTML = FILTERS.map((filter) => {
      const active = state.filter === filter.id;
      const count =
        filter.id === "all"
          ? state.items.length
          : state.items.filter((deal) => displayStatus(deal) === filter.id)
              .length;
      return `
        <button
          type="button"
          class="sa-flash-deals-filter${active ? " is-active" : ""}"
          data-flash-deal-filter="${escapeHtml(filter.id)}"
          aria-pressed="${active ? "true" : "false"}"
        >
          <span>${escapeHtml(filter.label)}</span>
          <strong>${count}</strong>
        </button>
      `;
    }).join("");
  }

  function dealCardHtml(deal) {
    const status = displayStatus(deal);
    const canDecide = status === "pending";
    const productName =
      String(deal.productName || "").trim() ||
      String(deal.productId || "Listing").trim() ||
      "Listing";
    const seller =
      String(deal.sellerAdminId || "").trim() || "Seller";
    const remaining = Number(deal.dealStockRemaining);
    const sold = Number(deal.dealStockSold) || 0;
    const reserved = Number(deal.dealStockReserved) || 0;
    const limit = Number(deal.dealStockLimit) || 0;
    const notes = String(deal.notes || "").trim();
    const busy = state.actingId === deal.id;

    return `
      <article class="sa-flash-deal-card is-${escapeHtml(status)}" data-flash-deal-id="${escapeHtml(deal.id || "")}">
        <header class="sa-flash-deal-card__head">
          <div>
            <p class="sa-flash-deal-card__eyebrow">${escapeHtml(String(deal.platformId || "shop").toUpperCase())}</p>
            <h3>${escapeHtml(productName)}</h3>
            <p class="sa-flash-deal-card__seller">Seller · ${escapeHtml(seller)}</p>
          </div>
          <span class="sa-flash-deal-card__status is-${escapeHtml(status)}">${escapeHtml(statusLabel(status))}</span>
        </header>

        <dl class="sa-flash-deal-card__stats">
          <div>
            <dt>Flash price</dt>
            <dd>${escapeHtml(formatMoney(deal.flashPrice))}</dd>
          </div>
          <div>
            <dt>Original</dt>
            <dd>${escapeHtml(formatMoney(deal.originalPriceSnapshot))}</dd>
          </div>
          <div>
            <dt>Stock</dt>
            <dd>${Number.isFinite(remaining) ? remaining : "—"} left · ${sold} sold · ${reserved} held / ${limit}</dd>
          </div>
          <div>
            <dt>Buyer limit</dt>
            <dd>${Number(deal.perBuyerLimit) || 1}</dd>
          </div>
          <div>
            <dt>Starts</dt>
            <dd>${escapeHtml(formatWhen(deal.startsAt))}</dd>
          </div>
          <div>
            <dt>Ends</dt>
            <dd>${escapeHtml(formatWhen(deal.endsAt))}</dd>
          </div>
        </dl>

        ${
          notes
            ? `<p class="sa-flash-deal-card__notes">${escapeHtml(notes)}</p>`
            : ""
        }

        ${
          canDecide
            ? `<footer class="sa-flash-deal-card__actions">
                <button
                  type="button"
                  class="button primary"
                  data-flash-deal-approve="${escapeHtml(deal.id || "")}"
                  ${busy ? "disabled" : ""}
                >Approve</button>
                <button
                  type="button"
                  class="button ghost"
                  data-flash-deal-reject="${escapeHtml(deal.id || "")}"
                  ${busy ? "disabled" : ""}
                >Reject</button>
              </footer>`
            : ""
        }
      </article>
    `;
  }

  function renderList() {
    refreshElements();
    renderFilters();
    syncPendingBadge();
    if (els.total) {
      els.total.textContent = `(${state.items.length})`;
    }
    if (!(els.list instanceof HTMLElement)) return;
    const items = filteredItems();
    if (!items.length) {
      const emptyCopy =
        state.filter === "pending"
          ? "No Flash Deals waiting for review."
          : "No Flash Deals in this filter.";
      els.list.innerHTML = `<div class="empty-state">${emptyCopy}</div>`;
      return;
    }
    els.list.innerHTML = items.map((deal) => dealCardHtml(deal)).join("");
  }

  async function decide(dealId, decision) {
    const id = String(dealId || "").trim();
    if (!id || state.actingId) return;
    const label = decision === "approve" ? "Approve" : "Reject";
    if (
      decision === "reject" &&
      !window.confirm("Reject this Flash Deal? The seller will be notified.")
    ) {
      return;
    }
    state.actingId = id;
    renderList();
    try {
      const response = await fetch(
        `/api/super-admin/flash-deals/${encodeURIComponent(id)}/${decision}`,
        {
          method: "POST",
          headers: headers({ "Content-Type": "application/json" }),
          body: "{}",
        },
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.message || `Unable to ${label.toLowerCase()} Flash Deal.`);
      }
      const nextDeal = body.deal;
      if (nextDeal && nextDeal.id) {
        const index = state.items.findIndex((entry) => entry.id === nextDeal.id);
        if (index >= 0) {
          state.items[index] = nextDeal;
        } else {
          state.items.unshift(nextDeal);
        }
      }
      setFeedback(body.message || `Flash Deal ${label.toLowerCase()}d.`, "success");
      renderList();
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : `Unable to ${label.toLowerCase()} Flash Deal.`,
        "error",
      );
      renderList();
    } finally {
      state.actingId = "";
      renderList();
    }
  }

  async function load({ quiet = false } = {}) {
    refreshElements();
    if (state.loading) return;
    state.loading = true;
    if (els.list instanceof HTMLElement && !quiet) {
      els.list.innerHTML = '<div class="empty-state">Loading Flash Deals…</div>';
    }
    try {
      const response = await fetch("/api/super-admin/flash-deals", {
        headers: headers(),
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message || "Unable to load Flash Deals.");
      }
      state.items = Array.isArray(payload.deals) ? payload.deals : [];
      renderList();
    } catch (error) {
      if (els.list instanceof HTMLElement) {
        els.list.innerHTML = `<div class="empty-state">${escapeHtml(
          error instanceof Error ? error.message : "Unable to load Flash Deals.",
        )}</div>`;
      }
      if (!quiet) {
        setFeedback(
          error instanceof Error ? error.message : "Unable to load Flash Deals.",
          "error",
        );
      }
    } finally {
      state.loading = false;
    }
  }

  function onClick(event) {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const filterButton = target.closest("[data-flash-deal-filter]");
    if (filterButton) {
      const next = String(filterButton.getAttribute("data-flash-deal-filter") || "")
        .trim()
        .toLowerCase();
      if (next && next !== state.filter) {
        state.filter = next;
        renderList();
      }
      return;
    }

    const approveButton = target.closest("[data-flash-deal-approve]");
    if (approveButton) {
      void decide(approveButton.getAttribute("data-flash-deal-approve"), "approve");
      return;
    }

    const rejectButton = target.closest("[data-flash-deal-reject]");
    if (rejectButton) {
      void decide(rejectButton.getAttribute("data-flash-deal-reject"), "reject");
    }
  }

  function bind() {
    refreshElements();
    if (state.bound) return;
    state.bound = true;
    document.addEventListener("click", onClick);
  }

  window.SuperAdminFlashDeals = {
    load,
    bind,
    get loading() {
      return state.loading;
    },
    get pendingCount() {
      return pendingCount();
    },
  };

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      () => {
        bind();
        void load({ quiet: true });
      },
      { once: true },
    );
  } else {
    bind();
    void load({ quiet: true });
  }
})();
