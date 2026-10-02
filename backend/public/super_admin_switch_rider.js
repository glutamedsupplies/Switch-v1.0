(function () {
  "use strict";

  const API_BASE = "/api/super-admin/switch-rider";
  const SECTION = "switch-rider";
  const PAGE_SIZE = 50;
  const AUTO_REFRESH_MS = 30000;
  const BADGE_REFRESH_MS = 60000;
  const bootHash = String(window.location.hash || "");

  const TABS = [
    { id: "overview", label: "Overview" },
    { id: "riders", label: "Riders" },
    { id: "deliveries", label: "Deliveries" },
    { id: "remittances", label: "COD Remittances" },
    { id: "incidents", label: "Support & Incidents" },
    { id: "settings", label: "Settings" },
  ];
  const RIDER_VIEWS = [
    ["all", "All"],
    ["pending", "Pending review"],
    ["active", "Active"],
    ["online", "Online now"],
    ["suspended", "Suspended"],
    ["rejected", "Rejected"],
    ["deactivated", "Deactivated"],
  ];
  const DELIVERY_VIEWS = [
    ["all", "All"],
    ["preparing", "Preparing"],
    ["waiting", "Waiting for rider"],
    ["assigned", "Assigned"],
    ["pickup", "To pickup"],
    ["in_transit", "In transit"],
    ["delivered", "Delivered"],
    ["failed", "Failed / returns"],
    ["cancelled", "Cancelled"],
  ];
  const REMITTANCE_FILTERS = [
    ["REMITTED", "To verify"],
    ["VERIFIED", "Verified"],
    ["REJECTED", "Rejected"],
    ["ALL", "All"],
  ];
  const INCIDENT_FILTERS = [
    ["ACTIVE", "Open & in review"],
    ["OPEN", "Open"],
    ["IN_REVIEW", "In review"],
    ["RESOLVED", "Resolved"],
    ["ALL", "All"],
  ];
  const RIDER_STATUS_LABELS = {
    PENDING_VERIFICATION: "Pending verification",
    APPROVED: "Approved",
    REJECTED: "Rejected",
    ACTIVE: "Active",
    SUSPENDED: "Suspended",
    DEACTIVATED: "Deactivated",
  };
  const AVAILABILITY_LABELS = { OFFLINE: "Offline", ONLINE: "Online", ON_DELIVERY: "On delivery" };
  const VEHICLES = ["BICYCLE", "MOTORCYCLE", "CAR", "VAN"];
  const VEHICLE_LABELS = { BICYCLE: "Bicycle", MOTORCYCLE: "Motorcycle", CAR: "Car", VAN: "Van" };
  const DOCUMENT_LABELS = {
    DRIVERS_LICENSE: "Driver's license",
    VEHICLE_REGISTRATION: "Vehicle registration (OR/CR)",
    GOVERNMENT_ID: "Government ID",
    SELFIE: "Selfie",
    PROFILE_PHOTO: "Profile photo",
  };
  const METHOD_LABELS = { GCASH: "GCash", BANK_TRANSFER: "Bank transfer", CASH_AT_HUB: "Cash at hub", MANUAL: "Manual" };
  const PROOF_LABELS = { DELIVERY: "Proof of delivery", FAILED_ATTEMPT: "Failed attempt evidence" };
  const TERMINAL = new Set(["DELIVERED", "RETURNED_TO_SELLER", "CANCELLED"]);
  const IN_CUSTODY = new Set([
    "PICKED_UP",
    "IN_TRANSIT",
    "ARRIVED_AT_DROPOFF",
    "FAILED_DELIVERY",
    "RETURN_REQUIRED",
    "RETURNING_TO_SELLER",
  ]);
  const ASSIGNABLE = new Set(["WAITING_FOR_RIDER", "OFFERED"]);
  const REASSIGNABLE = new Set(["RIDER_ASSIGNED", "RIDER_TO_PICKUP", "ARRIVED_AT_PICKUP"]);

  const RIDER_ACTIONS = {
    approve: {
      label: "Approve rider",
      from: ["PENDING_VERIFICATION", "REJECTED"],
      tone: "primary",
      reason: false,
      description: "Pending documents are marked approved and the rider can go online to receive jobs.",
    },
    reject: {
      label: "Reject application",
      from: ["PENDING_VERIFICATION"],
      tone: "danger",
      reason: true,
      description: "The rider sees this reason in the app and can re-upload documents.",
    },
    suspend: {
      label: "Suspend",
      from: ["APPROVED", "ACTIVE"],
      tone: "danger",
      reason: true,
      description: "The rider is taken offline immediately. Deliveries not yet picked up are re-dispatched to other riders.",
    },
    reactivate: {
      label: "Reactivate",
      from: ["SUSPENDED", "DEACTIVATED"],
      tone: "primary",
      reason: false,
      description: "The rider can go online and receive jobs again.",
    },
    deactivate: {
      label: "Deactivate",
      from: ["PENDING_VERIFICATION", "APPROVED", "REJECTED", "ACTIVE", "SUSPENDED"],
      tone: "danger",
      reason: true,
      description: "The rider can no longer go online or receive jobs. Deliveries not yet picked up are re-dispatched.",
    },
  };

  const INTERVENTIONS = {
    FORCE_RETURN: {
      label: "Force return to seller",
      tone: "danger",
      description: "Stops this delivery. The rider must bring the parcel back to the seller and confirm with the return PIN.",
    },
    MARK_RETURNED: {
      label: "Mark returned to seller",
      tone: "primary",
      description: "Use only after confirming with the seller that the parcel is back in their hands.",
    },
    RESET_PIN_ATTEMPTS: {
      label: "Reset PIN attempts",
      tone: "neutral",
      description: "Unlocks PIN entry after too many wrong attempts.",
    },
    ROTATE_PINS: {
      label: "Issue new PINs",
      tone: "neutral",
      description: "Invalidates the current pickup, delivery and return PINs. The seller and buyer will see the new PINs.",
    },
  };

  const DISPATCH_RESULTS = {
    NOT_DISPATCHABLE: "This delivery is no longer waiting for a rider.",
    MANUAL_DISPATCH: "Auto-dispatch is off or this delivery is on manual dispatch. Assign a rider manually.",
    MAX_ATTEMPTS: "Maximum dispatch attempts reached. Assign a rider manually.",
    NO_ELIGIBLE_RIDER: "No eligible rider is online near the pickup right now.",
  };

  const SETTINGS_GROUPS = [
    {
      title: "Dispatch",
      fields: [
        ["offerTimeoutSeconds", "Offer timeout (seconds)", 10, 300, 1, "How long a rider has to accept an offer."],
        ["offerRadiusKm", "Offer radius (km)", 0.5, 100, 0.5, "Only riders this close to the pickup get auto offers."],
        ["maxActiveJobsPerRider", "Max active jobs per rider", 1, 5, 1, ""],
        ["maxDispatchAttempts", "Max auto-dispatch attempts", 1, 100, 1, "After this, the delivery needs manual assignment."],
        ["dispatchStuckMinutes", "Alert when waiting longer than (minutes)", 1, 240, 1, "Super Admin is notified about stuck deliveries."],
      ],
    },
    {
      title: "Location",
      fields: [
        ["locationStaleSeconds", "Location considered stale after (seconds)", 30, 3600, 1, "Riders with older locations don't get auto offers."],
        ["locationMinIntervalSeconds", "Minimum seconds between location updates", 3, 120, 1, ""],
        ["locationRetentionDays", "Keep location history (days)", 1, 90, 1, "Older rider location points are purged."],
      ],
    },
    {
      title: "Distance & pricing",
      fields: [
        ["maxDeliveryDistanceKm", "Max delivery distance (km)", 1, 300, 0.5, ""],
        ["bicycleMaxKm", "Bicycle max distance (km)", 0.5, 50, 0.5, ""],
        ["roadFactor", "Road distance factor", 1, 3, 0.05, "Straight-line distance × this factor estimates road distance."],
        ["averageSpeedKph", "Average speed for ETA (kph)", 5, 120, 1, "ETAs shown to buyers are estimates."],
        ["surgeMultiplier", "Surge multiplier", 1, 5, 0.05, "Applied to the whole delivery fee."],
        ["quoteTtlSeconds", "Checkout quote valid for (seconds)", 60, 3600, 1, ""],
      ],
    },
    {
      title: "Rider earnings",
      fields: [
        ["riderSharePercent", "Rider share of delivery fee (%)", 10, 100, 1, ""],
        ["failedAttemptRiderPercent", "Rider share for failed attempts (%)", 0, 100, 1, "Paid when a delivery fails and is returned."],
        ["earningsHoldHours", "Hold earnings before payout (hours)", 0, 720, 1, "Earnings move from pending to available after this."],
      ],
    },
  ];

  const state = {
    tab: "overview",
    overview: null,
    settings: null,
    settingsDraft: null,
    riders: { view: "all", search: "", offset: 0, data: null },
    deliveries: { view: "all", search: "", offset: 0, data: null },
    remittances: { status: "REMITTED", data: null },
    incidents: { status: "ACTIVE", data: null },
    detail: null,
    loading: false,
    error: "",
    pendingFocus: null,
    initialized: false,
  };

  let root = null;
  let sectionEl = null;
  let renderSeq = 0;
  let searchTimer = 0;
  let autoRefreshTimer = 0;
  let objectUrls = [];

  // ------------------------------------------------------------------ utilities

  function headers(extra = {}) {
    let token = "";
    try {
      const raw = sessionStorage.getItem("gms-super-admin-session") || localStorage.getItem("gms-super-admin-session");
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

  async function api(path, { method = "GET", body } = {}) {
    let response;
    try {
      response = await fetch(API_BASE + path, {
        method,
        cache: "no-store",
        headers: headers(body !== undefined ? { "Content-Type": "application/json" } : {}),
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (_) {
      throw new Error("Can't reach the server. Check your connection and try again.");
    }
    let payload = null;
    try {
      payload = await response.json();
    } catch (_) {
      payload = null;
    }
    if (!response.ok) {
      const error = new Error(payload?.message || `Request failed (${response.status}).`);
      error.status = response.status;
      error.code = payload?.code || "";
      throw error;
    }
    return payload || {};
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  const pesoFormatter = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });
  function peso(value) {
    const amount = Number(value);
    return pesoFormatter.format(Number.isFinite(amount) ? amount : 0);
  }

  function dateTime(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
  }

  function ageLabel(seconds) {
    if (seconds === null || seconds === undefined) return "No location yet";
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.round(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.round(seconds / 3600)} h ago`;
    return `${Math.round(seconds / 86400)} d ago`;
  }

  function phone(countryCode, number) {
    const digits = String(number || "").trim();
    if (!digits) return "—";
    return countryCode && !digits.startsWith("+") ? `${countryCode} ${digits}` : digits;
  }

  function percent(value) {
    return value === null || value === undefined ? "—" : `${value}%`;
  }

  function label(map, key) {
    return map[key] || String(key || "—").replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
  }

  function toneForJob(status) {
    if (status === "DELIVERED") return "success";
    if (status === "CANCELLED") return "muted";
    if (["FAILED_DELIVERY", "RETURN_REQUIRED", "RETURNING_TO_SELLER", "RETURNED_TO_SELLER"].includes(status)) return "danger";
    if (["WAITING_FOR_RIDER", "OFFERED", "PREPARING"].includes(status)) return "warning";
    return "info";
  }

  function toneForRider(status) {
    if (status === "ACTIVE" || status === "APPROVED") return "success";
    if (status === "PENDING_VERIFICATION") return "warning";
    if (status === "SUSPENDED" || status === "REJECTED") return "danger";
    return "muted";
  }

  function toneForReview(status) {
    if (status === "APPROVED" || status === "VERIFIED" || status === "RESOLVED") return "success";
    if (status === "REJECTED") return "danger";
    if (status === "IN_REVIEW") return "info";
    return "warning";
  }

  function chip(text, tone = "muted") {
    return `<span class="sr-chip sr-chip--${tone}">${escapeHtml(text)}</span>`;
  }

  function button(text, attrs = {}, tone = "neutral") {
    const attributes = Object.entries(attrs)
      .map(([key, value]) => (value === true ? key : `${key}="${escapeHtml(value)}"`))
      .join(" ");
    return `<button type="button" class="sr-btn sr-btn--${tone}" ${attributes}>${escapeHtml(text)}</button>`;
  }

  function infoRow(name, value, { html = false } = {}) {
    return `<div class="sr-info"><dt>${escapeHtml(name)}</dt><dd>${html ? value : escapeHtml(value ?? "—") || "—"}</dd></div>`;
  }

  function card(title, body, { actions = "" } = {}) {
    return `<section class="sr-card"><header class="sr-card__head"><h3>${escapeHtml(title)}</h3>${actions ? `<div class="sr-card__actions">${actions}</div>` : ""}</header><div class="sr-card__body">${body}</div></section>`;
  }

  function empty(text) {
    return `<p class="sr-empty">${escapeHtml(text)}</p>`;
  }

  function authImage(url, alt) {
    return `<button type="button" class="sr-thumb" data-sr-action="open-image" data-src="${escapeHtml(url)}" aria-label="Open ${escapeHtml(alt)}"><img alt="${escapeHtml(alt)}" data-sr-auth-src="${escapeHtml(url)}" /></button>`;
  }

  function revokeObjectUrls() {
    for (const url of objectUrls) URL.revokeObjectURL(url);
    objectUrls = [];
  }

  async function fetchBlobUrl(url) {
    const response = await fetch(url, { headers: headers({ Accept: "image/*" }), cache: "no-store" });
    if (!response.ok) throw new Error("Image unavailable");
    const objectUrl = URL.createObjectURL(await response.blob());
    objectUrls.push(objectUrl);
    return objectUrl;
  }

  function hydrateImages(scope) {
    scope.querySelectorAll("img[data-sr-auth-src]").forEach((img) => {
      const url = img.getAttribute("data-sr-auth-src");
      img.removeAttribute("data-sr-auth-src");
      fetchBlobUrl(url)
        .then((objectUrl) => {
          img.src = objectUrl;
          img.closest(".sr-thumb")?.setAttribute("data-object-url", objectUrl);
        })
        .catch(() => {
          img.closest(".sr-thumb")?.classList.add("is-missing");
        });
    });
  }

  function toast(message, tone = "success") {
    let host = document.querySelector(".sr-toast-host");
    if (!host) {
      host = document.createElement("div");
      host.className = "sr-toast-host";
      host.setAttribute("role", "status");
      host.setAttribute("aria-live", "polite");
      document.body.appendChild(host);
    }
    const item = document.createElement("div");
    item.className = `sr-toast sr-toast--${tone}`;
    item.textContent = message;
    host.appendChild(item);
    window.setTimeout(() => item.remove(), 4200);
  }

  function isModalOpen() {
    return Boolean(document.querySelector(".sr-modal"));
  }

  function openModal({ title, bodyHtml, wide = false, onMount }) {
    const overlay = document.createElement("div");
    overlay.className = "sr-modal";
    overlay.innerHTML = `
      <div class="sr-modal__dialog ${wide ? "sr-modal__dialog--wide" : ""}" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
        <header class="sr-modal__head">
          <h3>${escapeHtml(title)}</h3>
          <button type="button" class="sr-modal__close" data-sr-modal-close aria-label="Close">×</button>
        </header>
        <div class="sr-modal__body">${bodyHtml}</div>
      </div>`;
    const close = () => {
      overlay.remove();
      document.removeEventListener("keydown", onKey);
    };
    const onKey = (event) => {
      if (event.key === "Escape") close();
    };
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay || event.target.closest("[data-sr-modal-close]")) close();
    });
    document.addEventListener("keydown", onKey);
    document.body.appendChild(overlay);
    onMount?.(overlay, close);
    return close;
  }

  /** Form dialog. `onSubmit` may throw; the error is shown inline and the dialog stays open. */
  function formModal({ title, description = "", fields = [], confirmLabel = "Save", tone = "primary", onSubmit }) {
    const fieldHtml = fields
      .map((field) => {
        const id = `sr-field-${field.name}`;
        const required = field.required ? "required" : "";
        const hint = field.hint ? `<small>${escapeHtml(field.hint)}</small>` : "";
        let control;
        if (field.type === "textarea") {
          control = `<textarea id="${id}" name="${field.name}" rows="3" maxlength="${field.maxLength || 500}" ${required} placeholder="${escapeHtml(field.placeholder || "")}">${escapeHtml(field.value || "")}</textarea>`;
        } else if (field.type === "select") {
          control = `<select id="${id}" name="${field.name}" ${required}>${field.options
            .map((option) => `<option value="${escapeHtml(option.value)}" ${option.value === field.value ? "selected" : ""}>${escapeHtml(option.label)}</option>`)
            .join("")}</select>`;
        } else {
          control = `<input id="${id}" name="${field.name}" type="${field.type || "text"}" ${required} value="${escapeHtml(field.value ?? "")}"
            ${field.min !== undefined ? `min="${field.min}"` : ""} ${field.max !== undefined ? `max="${field.max}"` : ""} ${field.step ? `step="${field.step}"` : ""}
            maxlength="${field.maxLength || 120}" placeholder="${escapeHtml(field.placeholder || "")}" />`;
        }
        return `<label class="sr-field" for="${id}"><span>${escapeHtml(field.label)}${field.required ? " *" : ""}</span>${control}${hint}</label>`;
      })
      .join("");
    openModal({
      title,
      bodyHtml: `
        <form class="sr-form" novalidate>
          ${description ? `<p class="sr-form__description">${escapeHtml(description)}</p>` : ""}
          ${fieldHtml}
          <p class="sr-form__error" data-sr-form-error hidden></p>
          <div class="sr-form__actions">
            <button type="button" class="sr-btn sr-btn--neutral" data-sr-modal-close>Cancel</button>
            <button type="submit" class="sr-btn sr-btn--${tone}">${escapeHtml(confirmLabel)}</button>
          </div>
        </form>`,
      onMount(overlay, close) {
        const form = overlay.querySelector("form");
        const errorEl = overlay.querySelector("[data-sr-form-error]");
        const submit = form.querySelector('button[type="submit"]');
        form.querySelector("input, textarea, select")?.focus();
        form.addEventListener("submit", async (event) => {
          event.preventDefault();
          const values = {};
          for (const field of fields) {
            const input = form.elements[field.name];
            const value = String(input?.value ?? "").trim();
            if (field.required && !value) {
              errorEl.textContent = `${field.label} is required.`;
              errorEl.hidden = false;
              input?.focus();
              return;
            }
            values[field.name] = value;
          }
          errorEl.hidden = true;
          submit.disabled = true;
          const original = submit.textContent;
          submit.textContent = "Working…";
          try {
            await onSubmit(values);
            close();
          } catch (error) {
            errorEl.textContent = error?.message || "Something went wrong.";
            errorEl.hidden = false;
            submit.disabled = false;
            submit.textContent = original;
          }
        });
      },
    });
  }

  // ------------------------------------------------------------------- routing

  function parseFocus(url) {
    const text = String(url || "");
    const index = text.indexOf(`#${SECTION}`);
    if (index < 0) return null;
    const query = text.slice(index).split("?")[1] || "";
    const params = new URLSearchParams(query);
    const delivery = String(params.get("delivery") || "").trim();
    const rider = String(params.get("rider") || "").trim();
    return { delivery, rider };
  }

  function applyFocus(focus) {
    if (!focus) return;
    if (focus.delivery) {
      state.tab = "deliveries";
      state.detail = { kind: "delivery", id: focus.delivery, data: null };
    } else if (focus.rider) {
      state.tab = "riders";
      state.detail = { kind: "rider", id: focus.rider, data: null };
    }
  }

  function isVisible() {
    return Boolean(sectionEl && !sectionEl.hidden);
  }

  function focusFromTargetUrl(url) {
    const focus = parseFocus(url);
    if (!focus) return;
    applyFocus(focus);
    if (!focus.delivery && !focus.rider) state.detail = null;
    // setActiveSection runs right after the notification hook; render once the section is shown.
    window.setTimeout(() => {
      if (isVisible()) load();
    }, 0);
  }

  // ------------------------------------------------------------------ loading

  async function load({ silent = false } = {}) {
    if (!root) return;
    const seq = ++renderSeq;
    if (!silent) {
      state.loading = true;
      state.error = "";
      render();
    }
    try {
      if (state.detail) {
        if (state.detail.kind === "rider") {
          state.detail.data = await api(`/riders/${encodeURIComponent(state.detail.id)}`);
        } else {
          state.detail.data = (await api(`/deliveries/${encodeURIComponent(state.detail.id)}`)).delivery;
        }
      } else if (state.tab === "overview") {
        const payload = await api("/overview");
        state.overview = payload.overview;
        state.settings = payload.settings;
        paintNavBadge(state.overview);
      } else if (state.tab === "riders") {
        const r = state.riders;
        const params = new URLSearchParams({ view: r.view, search: r.search, limit: PAGE_SIZE, offset: r.offset });
        r.data = await api(`/riders?${params}`);
      } else if (state.tab === "deliveries") {
        const d = state.deliveries;
        const params = new URLSearchParams({ view: d.view, search: d.search, limit: PAGE_SIZE, offset: d.offset });
        d.data = await api(`/deliveries?${params}`);
      } else if (state.tab === "remittances") {
        state.remittances.data = await api(`/remittances?status=${encodeURIComponent(state.remittances.status)}`);
      } else if (state.tab === "incidents") {
        state.incidents.data = (await api(`/incidents?status=${encodeURIComponent(state.incidents.status)}`)).incidents;
      } else if (state.tab === "settings") {
        state.settings = (await api("/settings")).settings;
        state.settingsDraft = JSON.parse(JSON.stringify(state.settings));
      }
      if (seq !== renderSeq) return;
      state.loading = false;
      state.error = "";
    } catch (error) {
      if (seq !== renderSeq) return;
      state.loading = false;
      if (!silent) state.error = error.message;
    }
    render();
  }

  async function refreshNavBadge() {
    try {
      paintNavBadge((await api("/overview")).overview);
    } catch (_) {
      // The badge keeps its last value when the overview can't be loaded.
    }
  }

  function paintNavBadge(overview) {
    const badge = document.querySelector("[data-switch-rider-nav-count]");
    if (!badge || !overview) return;
    const count =
      Number(overview?.riders?.pending || 0) +
      Number(overview?.cod?.remittancesToVerify || 0) +
      Number(overview?.incidents?.open || 0) +
      Number(overview?.deliveries?.stuck || 0);
    badge.textContent = String(count);
    badge.hidden = count <= 0;
  }

  function scheduleAutoRefresh() {
    window.clearInterval(autoRefreshTimer);
    autoRefreshTimer = window.setInterval(() => {
      if (document.hidden) return;
      if (!isVisible()) return;
      if (isModalOpen() || state.loading) return;
      if (state.tab === "settings") return;
      if (root.contains(document.activeElement) && document.activeElement.matches("input, textarea, select")) return;
      load({ silent: true });
    }, AUTO_REFRESH_MS);
  }

  // ----------------------------------------------------------------- rendering

  function render() {
    if (!root) return;
    revokeObjectUrls();
    const tabs = TABS.map(
      (tab) =>
        `<button type="button" class="sr-tab ${tab.id === state.tab ? "is-active" : ""}" data-sr-action="tab" data-tab="${tab.id}" aria-pressed="${tab.id === state.tab}">${escapeHtml(tab.label)}</button>`,
    ).join("");
    let body;
    if (state.loading && !hasDataForCurrentView()) {
      body = `<div class="sr-loading" aria-busy="true">Loading…</div>`;
    } else if (state.error) {
      body = `<div class="sr-error"><p>${escapeHtml(state.error)}</p>${button("Try again", { "data-sr-action": "refresh" }, "primary")}</div>`;
    } else if (state.detail) {
      body = state.detail.kind === "rider" ? renderRiderDetail(state.detail.data) : renderDeliveryDetail(state.detail.data);
    } else {
      body = {
        overview: renderOverview,
        riders: renderRiders,
        deliveries: renderDeliveries,
        remittances: renderRemittances,
        incidents: renderIncidents,
        settings: renderSettings,
      }[state.tab]();
    }
    const focused = document.activeElement?.getAttribute?.("data-sr-search");
    const caret = focused ? document.activeElement.selectionStart : null;
    root.innerHTML = `
      <div class="sr-shell">
        <div class="sr-toolbar">
          <nav class="sr-tabs" aria-label="Switch Rider sections">${tabs}</nav>
          ${button(state.loading ? "Refreshing…" : "Refresh", { "data-sr-action": "refresh", ...(state.loading ? { disabled: true } : {}) })}
        </div>
        <div class="sr-body">${body}</div>
      </div>`;
    hydrateImages(root);
    if (focused) {
      const input = root.querySelector(`[data-sr-search="${focused}"]`);
      if (input) {
        input.focus();
        if (caret !== null) input.setSelectionRange(caret, caret);
      }
    }
  }

  function hasDataForCurrentView() {
    if (state.detail) return Boolean(state.detail.data);
    return Boolean(
      {
        overview: state.overview,
        riders: state.riders.data,
        deliveries: state.deliveries.data,
        remittances: state.remittances.data,
        incidents: state.incidents.data,
        settings: state.settingsDraft,
      }[state.tab],
    );
  }

  function statTile(title, value, { tone = "", goto = "", hint = "" } = {}) {
    const inner = `<span class="sr-stat__label">${escapeHtml(title)}</span><strong class="sr-stat__value">${escapeHtml(value)}</strong>${hint ? `<span class="sr-stat__hint">${escapeHtml(hint)}</span>` : ""}`;
    return goto
      ? `<button type="button" class="sr-stat ${tone ? `sr-stat--${tone}` : ""}" data-sr-action="goto" data-goto="${escapeHtml(goto)}">${inner}</button>`
      : `<div class="sr-stat ${tone ? `sr-stat--${tone}` : ""}">${inner}</div>`;
  }

  function renderOverview() {
    const o = state.overview || {};
    const s = state.settings || {};
    const r = o.riders || {};
    const d = o.deliveries || {};
    const i = o.incidents || {};
    const c = o.cod || {};
    const banner = !s.enabled
      ? `<div class="sr-banner sr-banner--warning"><div><strong>Switch Rider is turned off.</strong> Buyers can't choose Switch Rider at checkout and riders can't go online.</div>${button("Open settings", { "data-sr-action": "tab", "data-tab": "settings" }, "primary")}</div>`
      : !s.autoDispatch
        ? `<div class="sr-banner sr-banner--info"><div><strong>Auto-dispatch is off.</strong> Every ready delivery must be assigned manually.</div>${button("Open settings", { "data-sr-action": "tab", "data-tab": "settings" })}</div>`
        : "";
    return `
      ${banner}
      <div class="sr-overview">
        ${card(
          "Riders",
          `<div class="sr-stats">
            ${statTile("Pending verification", r.pending ?? 0, { tone: r.pending ? "warning" : "", goto: "riders:pending" })}
            ${statTile("Online", r.online ?? 0, { goto: "riders:online" })}
            ${statTile("On delivery", r.on_delivery ?? 0, { goto: "riders:online" })}
          </div>`,
        )}
        ${card(
          "Deliveries",
          `<div class="sr-stats">
            ${statTile("Waiting for rider", d.waiting ?? 0, { tone: d.waiting ? "warning" : "", goto: "deliveries:waiting" })}
            ${statTile("Stuck (needs attention)", d.stuck ?? 0, { tone: d.stuck ? "danger" : "", goto: "deliveries:waiting" })}
            ${statTile("Active now", d.active ?? 0, { goto: "deliveries:in_transit" })}
            ${statTile("Delivered today", d.delivered_today ?? 0, { tone: "success", goto: "deliveries:delivered" })}
            ${statTile("Failed today", d.failed_today ?? 0, { tone: d.failed_today ? "danger" : "", goto: "deliveries:failed" })}
          </div>`,
        )}
        ${card(
          "Cash on delivery",
          `<div class="sr-stats">
            ${statTile("COD held by riders", peso(c.outstanding), { hint: "Collected but not yet remitted" })}
            ${statTile("Remittances to verify", c.remittancesToVerify ?? 0, { tone: c.remittancesToVerify ? "warning" : "", goto: "remittances:REMITTED" })}
          </div>`,
        )}
        ${card(
          "Support",
          `<div class="sr-stats">
            ${statTile("Open tickets", i.open ?? 0, { goto: "incidents:ACTIVE" })}
            ${statTile("Safety incidents", i.safety ?? 0, { tone: i.safety ? "danger" : "", goto: "incidents:ACTIVE" })}
          </div>`,
        )}
      </div>`;
  }

  function filterChips(items, active, action, summary) {
    return `<div class="sr-filters" role="group">${items
      .map(([value, text]) => {
        const count = summary && summary[value] !== undefined ? ` <span class="sr-filter__count">${summary[value]}</span>` : "";
        return `<button type="button" class="sr-filter ${value === active ? "is-active" : ""}" data-sr-action="${action}" data-value="${value}" aria-pressed="${value === active}">${escapeHtml(text)}${count}</button>`;
      })
      .join("")}</div>`;
  }

  function pager(kind, total, offset) {
    if (total <= PAGE_SIZE) return "";
    const from = offset + 1;
    const to = Math.min(total, offset + PAGE_SIZE);
    return `<div class="sr-pager">
      <span>${from}–${to} of ${total}</span>
      ${button("Previous", { "data-sr-action": "page", "data-kind": kind, "data-dir": "-1", ...(offset <= 0 ? { disabled: true } : {}) })}
      ${button("Next", { "data-sr-action": "page", "data-kind": kind, "data-dir": "1", ...(to >= total ? { disabled: true } : {}) })}
    </div>`;
  }

  function renderRiders() {
    const r = state.riders;
    const data = r.data || { riders: [], total: 0, summary: {} };
    const rows = data.riders
      .map(
        (rider) => `
        <tr class="sr-row" data-sr-action="open-rider" data-id="${escapeHtml(rider.id)}" tabindex="0">
          <td><strong>${escapeHtml(rider.fullName)}</strong><span class="sr-sub">${escapeHtml(rider.riderCode)}</span></td>
          <td>${escapeHtml(phone(rider.countryCode, rider.mobileNumber))}</td>
          <td>${escapeHtml(label(VEHICLE_LABELS, rider.vehicle?.type))}<span class="sr-sub">${escapeHtml(rider.vehicle?.plateNumber || "")}</span></td>
          <td>${chip(label(RIDER_STATUS_LABELS, rider.status), toneForRider(rider.status))}</td>
          <td>${chip(label(AVAILABILITY_LABELS, rider.availabilityStatus), rider.availabilityStatus === "OFFLINE" ? "muted" : "success")}</td>
          <td>${rider.ratingCount ? `${Number(rider.ratingAverage).toFixed(2)} ★ <span class="sr-sub">${rider.ratingCount} ratings</span>` : "—"}</td>
          <td>${escapeHtml(rider.deliveredCount ?? 0)}</td>
          <td>${escapeHtml(dateTime(rider.createdAt))}</td>
        </tr>`,
      )
      .join("");
    return `
      <div class="sr-list-head">
        ${filterChips(RIDER_VIEWS, r.view, "rider-view", data.summary)}
        <input type="search" class="sr-search" data-sr-search="riders" value="${escapeHtml(r.search)}" placeholder="Search name, rider code, mobile or plate" aria-label="Search riders" />
      </div>
      ${
        data.riders.length
          ? `<div class="sr-table-wrap"><table class="sr-table">
              <thead><tr><th>Rider</th><th>Mobile</th><th>Vehicle</th><th>Status</th><th>Availability</th><th>Rating</th><th>Delivered</th><th>Registered</th></tr></thead>
              <tbody>${rows}</tbody></table></div>${pager("riders", data.total, r.offset)}`
          : empty(r.search ? "No riders match your search." : "No riders in this view yet.")
      }`;
  }

  function renderDeliveries() {
    const d = state.deliveries;
    const data = d.data || { deliveries: [], total: 0, summary: {} };
    const rows = data.deliveries
      .map(
        (job) => `
        <tr class="sr-row" data-sr-action="open-delivery" data-id="${escapeHtml(job.id)}" tabindex="0">
          <td><strong>${escapeHtml(job.deliveryCode)}</strong><span class="sr-sub">Order ${escapeHtml(job.orderReference)}</span></td>
          <td>${escapeHtml(job.sellerName || "—")}</td>
          <td>${escapeHtml(job.customerArea || "—")}</td>
          <td>${job.riderName ? `${escapeHtml(job.riderName)}<span class="sr-sub">${escapeHtml(job.riderCode)}</span>` : '<span class="sr-sub">Unassigned</span>'}</td>
          <td>${chip(job.statusLabel, toneForJob(job.status))}${job.stuck ? ` ${chip("Stuck", "danger")}` : ""}</td>
          <td>${job.paymentMethod === "COD" ? `COD ${escapeHtml(peso(job.codAmount))}` : "Prepaid"}</td>
          <td>${escapeHtml(peso(job.deliveryFee))}<span class="sr-sub">Rider ${escapeHtml(peso(job.riderEarning))}</span></td>
          <td>${escapeHtml(dateTime(job.createdAt))}</td>
        </tr>`,
      )
      .join("");
    return `
      <div class="sr-list-head">
        ${filterChips(DELIVERY_VIEWS, d.view, "delivery-view", data.summary)}
        <input type="search" class="sr-search" data-sr-search="deliveries" value="${escapeHtml(d.search)}" placeholder="Search delivery code, order, seller, area or rider" aria-label="Search deliveries" />
      </div>
      ${
        data.deliveries.length
          ? `<div class="sr-table-wrap"><table class="sr-table">
              <thead><tr><th>Delivery</th><th>Seller</th><th>Drop-off area</th><th>Rider</th><th>Status</th><th>Payment</th><th>Fee</th><th>Created</th></tr></thead>
              <tbody>${rows}</tbody></table></div>${pager("deliveries", data.total, d.offset)}`
          : empty(d.search ? "No deliveries match your search." : "No deliveries in this view.")
      }`;
  }

  function renderRemittances() {
    const data = state.remittances.data || { remittances: [], platformOutstandingCod: 0 };
    const rows = data.remittances
      .map(
        (item) => `
        <tr>
          <td><button type="button" class="sr-link" data-sr-action="open-rider" data-id="${escapeHtml(item.riderId)}">${escapeHtml(item.riderName)}</button><span class="sr-sub">${escapeHtml(item.riderCode)}</span></td>
          <td><strong>${escapeHtml(peso(item.amount))}</strong></td>
          <td>${escapeHtml(label(METHOD_LABELS, item.method))}<span class="sr-sub">${escapeHtml(item.reference || "No reference")}</span></td>
          <td>${escapeHtml(item.note || "—")}</td>
          <td>${escapeHtml(dateTime(item.createdAt))}</td>
          <td>${chip(label({ REMITTED: "Awaiting verification" }, item.status), toneForReview(item.status))}</td>
          <td class="sr-actions-cell">${
            item.status === "REMITTED"
              ? `${button("Verify", { "data-sr-action": "remit-review", "data-id": item.id, "data-decision": "VERIFIED", "data-amount": item.amount }, "primary")}
                 ${button("Reject", { "data-sr-action": "remit-review", "data-id": item.id, "data-decision": "REJECTED", "data-amount": item.amount }, "danger")}`
              : escapeHtml(item.verifiedAt ? dateTime(item.verifiedAt) : "")
          }</td>
        </tr>`,
      )
      .join("");
    return `
      <div class="sr-list-head">
        ${filterChips(REMITTANCE_FILTERS, state.remittances.status, "remit-filter")}
        <div class="sr-inline-stat">COD held by riders: <strong>${escapeHtml(peso(data.platformOutstandingCod))}</strong></div>
      </div>
      <p class="sr-note">Verify only after the money has arrived in the Switch account or was received at the hub. COD is the seller's money and is never counted as rider earnings.</p>
      ${
        data.remittances.length
          ? `<div class="sr-table-wrap"><table class="sr-table">
              <thead><tr><th>Rider</th><th>Amount</th><th>Method</th><th>Rider note</th><th>Submitted</th><th>Status</th><th></th></tr></thead>
              <tbody>${rows}</tbody></table></div>`
          : empty("No remittances in this view.")
      }`;
  }

  function renderIncidents() {
    const items = state.incidents.data || [];
    const list = items
      .map(
        (item) => `
        <article class="sr-incident ${item.isSafety ? "is-safety" : ""}">
          <header>
            <div>
              ${item.isSafety ? chip("Safety", "danger") : ""} ${chip(item.categoryLabel, "info")} ${chip(label({ IN_REVIEW: "In review" }, item.status), toneForReview(item.status))}
            </div>
            <span class="sr-sub">${escapeHtml(dateTime(item.createdAt))}</span>
          </header>
          <p>${escapeHtml(item.description || "No description provided.")}</p>
          <div class="sr-incident__meta">
            <span>Rider: <button type="button" class="sr-link" data-sr-action="open-rider" data-id="${escapeHtml(item.riderId)}">${escapeHtml(item.riderName || item.riderCode || "Rider")}</button></span>
            ${item.deliveryId ? `<span>Delivery: <button type="button" class="sr-link" data-sr-action="open-delivery" data-id="${escapeHtml(item.deliveryId)}">${escapeHtml(item.deliveryCode)}</button></span>` : ""}
          </div>
          ${item.resolution ? `<p class="sr-incident__resolution"><strong>Resolution:</strong> ${escapeHtml(item.resolution)}</p>` : ""}
          ${
            item.status !== "RESOLVED"
              ? `<div class="sr-incident__actions">
                  ${item.status === "OPEN" ? button("Mark in review", { "data-sr-action": "incident-update", "data-id": item.id, "data-status": "IN_REVIEW" }) : ""}
                  ${button("Resolve", { "data-sr-action": "incident-update", "data-id": item.id, "data-status": "RESOLVED" }, "primary")}
                </div>`
              : ""
          }
        </article>`,
      )
      .join("");
    return `
      <div class="sr-list-head">${filterChips(INCIDENT_FILTERS, state.incidents.status, "incident-filter")}</div>
      ${items.length ? `<div class="sr-incidents">${list}</div>` : empty("No tickets in this view.")}`;
  }

  function renderSettings() {
    const s = state.settingsDraft;
    if (!s) return empty("Settings are unavailable.");
    const groups = SETTINGS_GROUPS.map((group) =>
      card(
        group.title,
        `<div class="sr-settings-grid">${group.fields
          .map(
            ([key, text, min, max, step, hint]) => `
            <label class="sr-field">
              <span>${escapeHtml(text)}</span>
              <input type="number" data-sr-setting="${key}" value="${escapeHtml(s[key])}" min="${min}" max="${max}" step="${step}" required />
              <small>${escapeHtml(hint ? `${hint} ` : "")}Allowed ${min}–${max}.</small>
            </label>`,
          )
          .join("")}</div>`,
      ),
    ).join("");
    const pricingRows = VEHICLES.map((vehicle) => {
      const p = s.vehiclePricing?.[vehicle] || {};
      const input = (field) =>
        `<input type="number" min="0" step="0.5" data-sr-pricing="${vehicle}.${field}" value="${escapeHtml(p[field] ?? 0)}" aria-label="${VEHICLE_LABELS[vehicle]} ${field}" />`;
      return `<tr><th scope="row">${VEHICLE_LABELS[vehicle]}</th><td>${input("baseFee")}</td><td>${input("includedKm")}</td><td>${input("perKm")}</td><td>${input("minFee")}</td></tr>`;
    }).join("");
    const zoneRows = (s.serviceZones || [])
      .map(
        (zone, index) => `
        <tr data-sr-zone-index="${index}">
          <td><input type="text" data-sr-zone-field="name" value="${escapeHtml(zone.name || "")}" maxlength="80" placeholder="e.g. Makati CBD" aria-label="Zone name" /></td>
          <td><input type="number" step="0.000001" min="-90" max="90" data-sr-zone-field="centerLat" value="${escapeHtml(zone.centerLat ?? "")}" aria-label="Center latitude" /></td>
          <td><input type="number" step="0.000001" min="-180" max="180" data-sr-zone-field="centerLng" value="${escapeHtml(zone.centerLng ?? "")}" aria-label="Center longitude" /></td>
          <td><input type="number" step="0.5" min="0.5" max="200" data-sr-zone-field="radiusKm" value="${escapeHtml(zone.radiusKm ?? 10)}" aria-label="Radius km" /></td>
          <td><label class="sr-check"><input type="checkbox" data-sr-zone-field="active" ${zone.active !== false ? "checked" : ""} /> Active</label></td>
          <td>${button("Remove", { "data-sr-action": "remove-zone", "data-index": index }, "danger")}</td>
        </tr>`,
      )
      .join("");
    return `
      <form class="sr-settings" data-sr-settings-form novalidate>
        ${card(
          "Service",
          `<div class="sr-settings-grid">
            <label class="sr-check sr-check--big"><input type="checkbox" data-sr-setting="enabled" ${s.enabled ? "checked" : ""} />
              <span><strong>Switch Rider enabled</strong><small>Buyers can choose Switch Rider at checkout and riders can go online.</small></span></label>
            <label class="sr-check sr-check--big"><input type="checkbox" data-sr-setting="autoDispatch" ${s.autoDispatch ? "checked" : ""} />
              <span><strong>Auto-dispatch</strong><small>Offer ready deliveries to the nearest eligible rider automatically.</small></span></label>
            <label class="sr-check sr-check--big"><input type="checkbox" data-sr-setting="dispatchOnCheckout" ${s.dispatchOnCheckout !== false ? "checked" : ""} />
              <span><strong>Find a rider at checkout</strong><small>Start looking for the nearest rider to the store as soon as the buyer checks out. Off = wait for the seller's "Ready for Rider".</small></span></label>
            <label class="sr-field"><span>Default vehicle type</span>
              <select data-sr-setting="defaultVehicleType">${VEHICLES.map((v) => `<option value="${v}" ${s.defaultVehicleType === v ? "selected" : ""}>${VEHICLE_LABELS[v]}</option>`).join("")}</select>
              <small>Used when a listing doesn't require a bigger vehicle.</small></label>
          </div>`,
        )}
        ${groups}
        ${card(
          "Delivery fee by vehicle (₱)",
          `<div class="sr-table-wrap"><table class="sr-table sr-table--form">
            <thead><tr><th>Vehicle</th><th>Base fee</th><th>Included km</th><th>Per extra km</th><th>Minimum fee</th></tr></thead>
            <tbody>${pricingRows}</tbody></table></div>
           <p class="sr-note">Fee = max(minimum, base + per km × km beyond included) × surge. The backend always recalculates the fee; buyers can't change it.</p>`,
        )}
        ${card(
          "Service zones",
          `${
            zoneRows
              ? `<div class="sr-table-wrap"><table class="sr-table sr-table--form">
                  <thead><tr><th>Name</th><th>Center latitude</th><th>Center longitude</th><th>Radius (km)</th><th></th><th></th></tr></thead>
                  <tbody>${zoneRows}</tbody></table></div>`
              : empty("No zones yet. With no active zones, Switch Rider is available anywhere within the max delivery distance.")
          }
          <p class="sr-note">Pickup and drop-off must both be inside an active zone when at least one zone is active.</p>`,
          { actions: button("Add zone", { "data-sr-action": "add-zone" }) },
        )}
        <p class="sr-form__error" data-sr-settings-error hidden></p>
        <div class="sr-settings__actions">
          ${button("Discard changes", { "data-sr-action": "reset-settings" })}
          ${button("Save settings", { "data-sr-action": "save-settings" }, "primary")}
        </div>
      </form>`;
  }

  function renderRiderDetail(data) {
    if (!data) return empty("Rider not found.");
    const rider = data.rider;
    const actions = Object.entries(RIDER_ACTIONS)
      .filter(([, rule]) => rule.from.includes(rider.status))
      .map(([action, rule]) => button(rule.label, { "data-sr-action": "rider-status", "data-status-action": action }, rule.tone))
      .join("");
    const documents = data.documents.length
      ? `<div class="sr-docs">${data.documents
          .map(
            (doc) => `
            <figure class="sr-doc">
              ${authImage(doc.url, label(DOCUMENT_LABELS, doc.docType))}
              <figcaption>
                <strong>${escapeHtml(label(DOCUMENT_LABELS, doc.docType))}</strong>
                ${chip(label({}, doc.reviewStatus), toneForReview(doc.reviewStatus))}
                <span class="sr-sub">Uploaded ${escapeHtml(dateTime(doc.uploadedAt))}</span>
                ${doc.reviewNote ? `<span class="sr-sub">Note: ${escapeHtml(doc.reviewNote)}</span>` : ""}
                <span class="sr-doc__actions">
                  ${doc.reviewStatus !== "APPROVED" ? button("Approve", { "data-sr-action": "doc-review", "data-id": doc.id, "data-decision": "APPROVED", "data-doc": doc.docType }, "primary") : ""}
                  ${doc.reviewStatus !== "REJECTED" ? button("Reject", { "data-sr-action": "doc-review", "data-id": doc.id, "data-decision": "REJECTED", "data-doc": doc.docType }, "danger") : ""}
                </span>
              </figcaption>
            </figure>`,
          )
          .join("")}</div>`
      : empty("The rider hasn't uploaded any documents yet.");
    const e = data.earnings || {};
    const balances = e.balances || {};
    const cash = data.cash || {};
    const perf = data.performance || {};
    const location = rider.lastLocation
      ? `<a href="https://www.google.com/maps?q=${rider.lastLocation.lat},${rider.lastLocation.lng}" target="_blank" rel="noopener">${rider.lastLocation.lat.toFixed(5)}, ${rider.lastLocation.lng.toFixed(5)}</a> <span class="sr-sub">${escapeHtml(dateTime(rider.lastLocation.at))}</span>`
      : "—";
    const deliveries = data.deliveries.length
      ? `<div class="sr-table-wrap"><table class="sr-table"><thead><tr><th>Delivery</th><th>Route</th><th>Status</th><th>Payment</th><th>Earning</th><th>Created</th></tr></thead><tbody>${data.deliveries
          .map(
            (job) => `<tr class="sr-row" data-sr-action="open-delivery" data-id="${escapeHtml(job.id)}" tabindex="0">
              <td><strong>${escapeHtml(job.deliveryCode)}</strong></td><td>${escapeHtml(job.route)}</td>
              <td>${chip(job.statusLabel, toneForJob(job.status))}</td>
              <td>${job.paymentMethod === "COD" ? `COD ${escapeHtml(peso(job.codAmount))}` : "Prepaid"}</td>
              <td>${escapeHtml(peso(job.riderEarning))}</td><td>${escapeHtml(dateTime(job.createdAt))}</td></tr>`,
          )
          .join("")}</tbody></table></div>`
      : empty("No deliveries yet.");
    const payouts = data.payouts.length
      ? `<ul class="sr-lines">${data.payouts
          .map((p) => `<li><span>${escapeHtml(label(METHOD_LABELS, p.method))}${p.reference ? ` · ${escapeHtml(p.reference)}` : ""}<span class="sr-sub">${escapeHtml(dateTime(p.createdAt))}</span></span><strong>${escapeHtml(peso(p.amount))}</strong></li>`)
          .join("")}</ul>`
      : empty("No payouts yet.");
    const ratings = data.ratings.length
      ? `<ul class="sr-lines">${data.ratings
          .map((rt) => `<li><span>${"★".repeat(rt.stars)}${"☆".repeat(5 - rt.stars)} ${rt.flagged ? chip("Flagged", "danger") : ""}<span class="sr-sub">${escapeHtml(rt.deliveryCode)} · ${escapeHtml(dateTime(rt.createdAt))}</span>${rt.comment ? `<span class="sr-sub">“${escapeHtml(rt.comment)}”</span>` : ""}</span></li>`)
          .join("")}</ul>`
      : empty("No ratings yet.");
    const incidents = data.incidents.length
      ? `<ul class="sr-lines">${data.incidents
          .map((it) => `<li><span>${it.isSafety ? chip("Safety", "danger") : ""} ${escapeHtml(it.categoryLabel)}<span class="sr-sub">${escapeHtml(it.description || "")}</span></span>${chip(label({ IN_REVIEW: "In review" }, it.status), toneForReview(it.status))}</li>`)
          .join("")}</ul>`
      : empty("No support tickets.");
    return `
      <div class="sr-detail">
        <div class="sr-detail__head">
          ${button("← Back to riders", { "data-sr-action": "back" })}
          <div class="sr-detail__title">
            ${rider.hasProfilePhoto ? `<span class="sr-avatar">${authImage(`${API_BASE}/riders/${encodeURIComponent(rider.id)}/photo`, "Profile photo")}</span>` : `<span class="sr-avatar sr-avatar--initials">${escapeHtml((rider.firstName || "?").charAt(0))}</span>`}
            <div>
              <h3>${escapeHtml(rider.fullName)} <span class="sr-sub">${escapeHtml(rider.riderCode)}</span></h3>
              <div>${chip(label(RIDER_STATUS_LABELS, rider.status), toneForRider(rider.status))} ${chip(label(AVAILABILITY_LABELS, rider.availabilityStatus), rider.availabilityStatus === "OFFLINE" ? "muted" : "success")}
              ${rider.currentDeliveryId ? button("Open current delivery", { "data-sr-action": "open-delivery", "data-id": rider.currentDeliveryId }) : ""}</div>
              ${rider.statusReason ? `<p class="sr-sub">Reason: ${escapeHtml(rider.statusReason)}</p>` : ""}
            </div>
          </div>
          <div class="sr-detail__actions">${actions}</div>
        </div>
        <div class="sr-grid">
          ${card(
            "Profile",
            `<dl class="sr-dl">
              ${infoRow("Mobile", phone(rider.countryCode, rider.mobileNumber))}
              ${infoRow("Email", rider.email || "—")}
              ${infoRow("Birthday", rider.birthday || "—")}
              ${infoRow("Vehicle", `${label(VEHICLE_LABELS, rider.vehicle?.type)}${rider.vehicle?.model ? ` · ${rider.vehicle.model}` : ""}${rider.vehicle?.color ? ` · ${rider.vehicle.color}` : ""}`)}
              ${infoRow("Plate number", rider.vehicle?.plateNumber || "—")}
              ${infoRow("Emergency contact", rider.emergencyContact?.name ? `${rider.emergencyContact.name} (${rider.emergencyContact.relationship || "—"}) · ${rider.emergencyContact.phone}` : "—")}
              ${infoRow("Registered", dateTime(rider.createdAt))}
              ${infoRow("Approved", rider.approvedAt ? dateTime(rider.approvedAt) : "—")}
              ${infoRow("Last sign-in", dateTime(rider.lastLoginAt))}
              ${infoRow("Last location", location, { html: true })}
            </dl>`,
          )}
          ${card(
            "Performance (last 30 days)",
            `<div class="sr-stats sr-stats--compact">
              ${statTile("Acceptance", percent(perf.acceptanceRate))}
              ${statTile("Completion", percent(perf.completionRate))}
              ${statTile("Cancellation", percent(perf.cancellationRate))}
              ${statTile("On time", percent(perf.onTimeRate))}
              ${statTile("Delivered", perf.deliveredCount ?? 0)}
              ${statTile("Rating", perf.ratingCount ? `${Number(perf.ratingAverage).toFixed(2)} ★` : "—", { hint: `${perf.ratingCount || 0} ratings` })}
            </div>`,
          )}
        </div>
        ${card("Documents", documents)}
        <div class="sr-grid">
          ${card(
            "Earnings",
            `<div class="sr-stats sr-stats--compact">
              ${statTile("Today", peso(e.today))}
              ${statTile("This week", peso(e.week))}
              ${statTile("This month", peso(e.month))}
              ${statTile("Pending", peso(balances.pending), { hint: "On hold" })}
              ${statTile("Available", peso(balances.available), { tone: "success", hint: "Ready for payout" })}
              ${statTile("Paid out", peso(balances.paid))}
            </div>
            <h4 class="sr-subhead">Payouts</h4>${payouts}`,
            {
              actions:
                button("Record payout", { "data-sr-action": "payout", "data-available": balances.available || 0, ...(balances.available > 0 ? {} : { disabled: true }) }, "primary") +
                button("Adjust earnings", { "data-sr-action": "adjust" }),
            },
          )}
          ${card(
            "COD cash wallet",
            `<div class="sr-stats sr-stats--compact">
              ${statTile("Collected", peso(cash.collected))}
              ${statTile("Awaiting verification", peso(cash.remittedAwaitingVerification))}
              ${statTile("Verified", peso(cash.verified))}
              ${statTile("Outstanding", peso(cash.outstanding), { tone: cash.outstanding > 0 ? "warning" : "" })}
            </div>
            <p class="sr-note">COD is seller money held by the rider. It is never part of rider earnings.</p>
            ${
              (cash.remittances || []).length
                ? `<ul class="sr-lines">${cash.remittances
                    .map((m) => `<li><span>${escapeHtml(label(METHOD_LABELS, m.method))}${m.reference ? ` · ${escapeHtml(m.reference)}` : ""}<span class="sr-sub">${escapeHtml(dateTime(m.createdAt))}</span></span><span>${escapeHtml(peso(m.amount))} ${chip(label({ REMITTED: "Awaiting verification" }, m.status), toneForReview(m.status))}</span></li>`)
                    .join("")}</ul>`
                : ""
            }`,
            { actions: cash.remittedAwaitingVerification > 0 ? button("Review remittances", { "data-sr-action": "goto", "data-goto": "remittances:REMITTED" }) : "" },
          )}
        </div>
        ${card("Recent deliveries", deliveries)}
        <div class="sr-grid">
          ${card("Ratings", ratings)}
          ${card("Support tickets", incidents)}
        </div>
      </div>`;
  }

  function renderDeliveryDetail(job) {
    if (!job) return empty("Delivery not found.");
    const status = job.status;
    const attempts = job.pinAttempts || {};
    const hasAttempts = Number(attempts.pickup) + Number(attempts.delivery) + Number(attempts.return) > 0;
    const actions = [];
    if (ASSIGNABLE.has(status)) actions.push(button("Assign rider", { "data-sr-action": "assign" }, "primary"));
    if (REASSIGNABLE.has(status)) actions.push(button("Reassign rider", { "data-sr-action": "assign" }, "primary"));
    if (status === "WAITING_FOR_RIDER") actions.push(button("Run auto-dispatch", { "data-sr-action": "redispatch" }));
    if (["PICKED_UP", "IN_TRANSIT", "ARRIVED_AT_DROPOFF"].includes(status)) {
      actions.push(
        job.codCollectedAt
          ? button(INTERVENTIONS.FORCE_RETURN.label, { disabled: true, title: "Cash was already collected. Resolve the payment first." }, "danger")
          : button(INTERVENTIONS.FORCE_RETURN.label, { "data-sr-action": "intervene", "data-intervention": "FORCE_RETURN" }, "danger"),
      );
    }
    if (["RETURN_REQUIRED", "RETURNING_TO_SELLER"].includes(status)) {
      actions.push(button(INTERVENTIONS.MARK_RETURNED.label, { "data-sr-action": "intervene", "data-intervention": "MARK_RETURNED" }, "primary"));
    }
    if (!TERMINAL.has(status) && hasAttempts) {
      actions.push(button(INTERVENTIONS.RESET_PIN_ATTEMPTS.label, { "data-sr-action": "intervene", "data-intervention": "RESET_PIN_ATTEMPTS" }));
    }
    if (!TERMINAL.has(status)) {
      actions.push(button(INTERVENTIONS.ROTATE_PINS.label, { "data-sr-action": "intervene", "data-intervention": "ROTATE_PINS" }));
    }
    if (!TERMINAL.has(status) && !IN_CUSTODY.has(status)) {
      actions.push(button("Cancel delivery", { "data-sr-action": "cancel" }, "danger"));
    }
    const rider = job.rider;
    const history = (job.history || [])
      .map(
        (h) => `<li><span class="sr-timeline__dot"></span><div><strong>${escapeHtml(label({}, h.toStatus))}</strong>
          <span class="sr-sub">${escapeHtml(dateTime(h.at))} · ${escapeHtml(h.actorType || "system")}</span>${h.note ? `<span class="sr-sub">${escapeHtml(h.note)}</span>` : ""}</div></li>`,
      )
      .join("");
    const offers = (job.offers || []).length
      ? `<ul class="sr-lines">${job.offers
          .map(
            (o) => `<li><span><button type="button" class="sr-link" data-sr-action="open-rider" data-id="${escapeHtml(o.riderId)}">${escapeHtml(o.riderName)}</button> <span class="sr-sub">${escapeHtml(o.riderCode)} · ${o.distanceToPickupKm ? `${o.distanceToPickupKm} km away · ` : ""}${escapeHtml(dateTime(o.offeredAt))}</span>${o.declineReason ? `<span class="sr-sub">Declined: ${escapeHtml(o.declineReason)}</span>` : ""}</span>${chip(label({}, o.status), o.status === "ACCEPTED" ? "success" : o.status === "PENDING" ? "warning" : "muted")}</li>`,
          )
          .join("")}</ul>`
      : empty("No offers sent yet.");
    const proofs = (job.proofs || []).length
      ? `<div class="sr-docs">${job.proofs
          .map(
            (p) => `<figure class="sr-doc">${authImage(`${API_BASE}/proofs/${encodeURIComponent(p.id)}`, label(PROOF_LABELS, p.type))}
              <figcaption><strong>${escapeHtml(label(PROOF_LABELS, p.type))}</strong><span class="sr-sub">${escapeHtml(dateTime(p.uploadedAt))}</span></figcaption></figure>`,
          )
          .join("")}</div>`
      : empty("No photos uploaded.");
    const audit = (job.audit || []).length
      ? `<ul class="sr-lines sr-lines--small">${job.audit
          .map((a) => `<li><span><strong>${escapeHtml(label({}, a.action))}</strong><span class="sr-sub">${escapeHtml(a.actorType)}${a.actorId ? ` · ${escapeHtml(a.actorId)}` : ""} · ${escapeHtml(dateTime(a.at))}</span>${a.metadata?.note || a.metadata?.reason ? `<span class="sr-sub">${escapeHtml(a.metadata.note || a.metadata.reason)}</span>` : ""}</span></li>`)
          .join("")}</ul>`
      : empty("No audit entries.");
    const incidents = (job.incidents || []).length
      ? `<ul class="sr-lines">${job.incidents
          .map((it) => `<li><span>${it.isSafety ? chip("Safety", "danger") : ""} ${escapeHtml(it.categoryLabel)}<span class="sr-sub">${escapeHtml(it.description || "")}</span></span>${chip(label({ IN_REVIEW: "In review" }, it.status), toneForReview(it.status))}</li>`)
          .join("")}</ul>`
      : "";
    return `
      <div class="sr-detail">
        <div class="sr-detail__head">
          ${button("← Back to deliveries", { "data-sr-action": "back" })}
          <div class="sr-detail__title">
            <div>
              <h3>${escapeHtml(job.deliveryCode)} <span class="sr-sub">Order ${escapeHtml(String(job.orderGroupId || "").slice(-8).toUpperCase())}</span></h3>
              <div>${chip(job.statusLabel, toneForJob(status))} ${chip(job.dispatchMode === "MANUAL" ? "Manual dispatch" : "Auto dispatch", "muted")} ${chip(`${job.dispatchAttempts} offer attempt${job.dispatchAttempts === 1 ? "" : "s"}`, "muted")}</div>
              ${job.failureReason ? `<p class="sr-sub">Failure: ${escapeHtml(label({}, job.failureReason))}${job.failureNote ? ` · ${escapeHtml(job.failureNote)}` : ""}</p>` : ""}
              ${job.cancellation?.reason ? `<p class="sr-sub">Cancelled by ${escapeHtml(job.cancellation.role || "system")}: ${escapeHtml(job.cancellation.reason)}</p>` : ""}
            </div>
          </div>
          <div class="sr-detail__actions">${actions.join("")}</div>
        </div>
        <div class="sr-grid">
          ${card(
            "Pickup (seller)",
            `<dl class="sr-dl">${infoRow("Name", job.pickup?.name)}${infoRow("Phone", job.pickup?.phone)}${infoRow("Address", job.pickup?.address)}${infoRow("Area", job.pickup?.area)}</dl>`,
          )}
          ${card(
            "Drop-off (buyer)",
            `<dl class="sr-dl">${infoRow("Name", job.dropoff?.name)}${infoRow("Phone", job.dropoff?.phoneMasked)}${infoRow("Address", job.dropoff?.address)}${infoRow("Area", job.dropoff?.area)}</dl>`,
          )}
        </div>
        <div class="sr-grid">
          ${card(
            "Rider",
            rider
              ? `<dl class="sr-dl">
                  ${infoRow("Rider", `<button type="button" class="sr-link" data-sr-action="open-rider" data-id="${escapeHtml(rider.id)}">${escapeHtml(rider.fullName)}</button> <span class="sr-sub">${escapeHtml(rider.riderCode)}</span>`, { html: true })}
                  ${infoRow("Mobile", phone(rider.countryCode, rider.mobileNumber))}
                  ${infoRow("Vehicle", `${label(VEHICLE_LABELS, rider.vehicle?.type)} · ${rider.vehicle?.plateNumber || "—"}`)}
                  ${infoRow("Availability", label(AVAILABILITY_LABELS, rider.availabilityStatus))}
                  ${infoRow("Last location", rider.lastLocation ? dateTime(rider.lastLocation.at) : "—")}
                </dl>`
              : empty("No rider assigned."),
          )}
          ${card(
            "Parcel & payment",
            `<dl class="sr-dl">
              ${infoRow("Packages", `${job.packageCount}${job.packageNotes ? ` · ${job.packageNotes}` : ""}`)}
              ${infoRow("Vehicle required", label(VEHICLE_LABELS, job.vehicleTypeRequired))}
              ${infoRow("Distance / ETA", `${job.distanceKm} km · ~${job.estimatedMinutes} min (estimate)`)}
              ${infoRow("Payment", job.paymentMethod === "COD" ? `Cash on delivery · ${peso(job.codAmount)}` : "Prepaid")}
              ${job.paymentMethod === "COD" ? infoRow("COD collected", job.codCollectedAt ? `${peso(job.codCollectedAmount)} · ${dateTime(job.codCollectedAt)}` : "Not yet") : ""}
              ${infoRow("Delivery fee (quoted)", peso(job.quotedDeliveryFee))}
              ${infoRow("Buyer paid", peso(job.customerDeliveryFee))}
              ${infoRow("Platform subsidy", peso(job.platformSubsidy))}
              ${infoRow("Rider earning", peso(job.riderEarning))}
              ${infoRow("Platform margin", peso(job.platformDeliveryMargin))}
              ${infoRow("Delivery confirmed by", job.deliveryConfirmationType ? label({}, job.deliveryConfirmationType) : "—")}
              ${infoRow("Wrong PIN attempts", `Pickup ${attempts.pickup || 0} · Delivery ${attempts.delivery || 0} · Return ${attempts.return || 0}`)}
              ${job.rating ? infoRow("Buyer rating", `${"★".repeat(job.rating.stars)}${job.rating.comment ? ` “${job.rating.comment}”` : ""}`) : ""}
            </dl>`,
          )}
        </div>
        <div class="sr-grid">
          ${card("Status timeline", history ? `<ol class="sr-timeline">${history}</ol>` : empty("No history yet."))}
          ${card("Offers", offers)}
        </div>
        ${card("Photos", proofs)}
        ${incidents ? card("Support tickets", incidents) : ""}
        ${card("Audit log", audit)}
      </div>`;
  }

  // ------------------------------------------------------------------ actions

  function openRider(id) {
    state.detail = { kind: "rider", id, data: null };
    state.tab = "riders";
    load();
  }

  function openDelivery(id) {
    state.detail = { kind: "delivery", id, data: null };
    state.tab = "deliveries";
    load();
  }

  function riderStatusAction(action) {
    const rider = state.detail?.data?.rider;
    const rule = RIDER_ACTIONS[action];
    if (!rider || !rule) return;
    formModal({
      title: `${rule.label}: ${rider.fullName}`,
      description: rule.description,
      fields: rule.reason ? [{ name: "reason", label: "Reason (shown to the rider)", type: "textarea", required: true }] : [],
      confirmLabel: rule.label,
      tone: rule.tone === "danger" ? "danger" : "primary",
      async onSubmit(values) {
        await api(`/riders/${encodeURIComponent(rider.id)}/status`, { method: "POST", body: { action, reason: values.reason || "" } });
        toast(`${rule.label}: done.`);
        await load({ silent: true });
        refreshNavBadge();
      },
    });
  }

  function documentReview(id, decision, docType) {
    const approve = decision === "APPROVED";
    formModal({
      title: `${approve ? "Approve" : "Reject"} ${label(DOCUMENT_LABELS, docType)}`,
      description: approve ? "Confirm the document is clear, valid and matches the rider." : "The rider is notified and asked to re-upload this document.",
      fields: approve ? [] : [{ name: "note", label: "What needs fixing (shown to the rider)", type: "textarea", required: true, maxLength: 300 }],
      confirmLabel: approve ? "Approve document" : "Reject document",
      tone: approve ? "primary" : "danger",
      async onSubmit(values) {
        await api(`/documents/${encodeURIComponent(id)}/review`, { method: "POST", body: { decision, note: values.note || "" } });
        toast(approve ? "Document approved." : "Document rejected. The rider was notified.");
        await load({ silent: true });
      },
    });
  }

  function recordPayout(available) {
    const rider = state.detail?.data?.rider;
    if (!rider) return;
    formModal({
      title: `Record payout: ${rider.fullName}`,
      description: `Available for payout: ${peso(available)}. Record the payout after sending the money.`,
      fields: [
        { name: "amount", label: "Amount (₱)", type: "number", required: true, min: 1, max: available, step: "0.01", value: available },
        {
          name: "method",
          label: "Method",
          type: "select",
          value: "GCASH",
          options: [
            { value: "GCASH", label: "GCash" },
            { value: "BANK_TRANSFER", label: "Bank transfer" },
            { value: "MANUAL", label: "Manual / cash" },
          ],
        },
        { name: "reference", label: "Reference number", placeholder: "Required for GCash and bank transfer", maxLength: 80 },
        { name: "note", label: "Note", type: "textarea", maxLength: 300 },
      ],
      confirmLabel: "Record payout",
      async onSubmit(values) {
        const amount = Number(values.amount);
        if (!Number.isFinite(amount) || amount <= 0) throw new Error("Enter a valid amount.");
        if (amount > Number(available) + 0.001) throw new Error(`Only ${peso(available)} is available.`);
        if (values.method !== "MANUAL" && !values.reference) throw new Error("Enter the transfer reference number.");
        await api(`/riders/${encodeURIComponent(rider.id)}/payouts`, { method: "POST", body: { ...values, amount } });
        toast("Payout recorded. The rider was notified.");
        await load({ silent: true });
      },
    });
  }

  function adjustEarnings() {
    const rider = state.detail?.data?.rider;
    if (!rider) return;
    formModal({
      title: `Adjust earnings: ${rider.fullName}`,
      description: "Use a positive amount for bonuses or corrections in the rider's favor, negative to deduct. Goes to the available balance.",
      fields: [
        { name: "amount", label: "Amount (₱, e.g. 50 or -20)", type: "number", required: true, step: "0.01", min: -100000, max: 100000 },
        { name: "note", label: "Reason (shown to the rider)", type: "textarea", required: true, maxLength: 300 },
      ],
      confirmLabel: "Apply adjustment",
      async onSubmit(values) {
        const amount = Number(values.amount);
        if (!Number.isFinite(amount) || amount === 0) throw new Error("Enter a non-zero amount.");
        await api(`/riders/${encodeURIComponent(rider.id)}/adjustments`, { method: "POST", body: { amount, note: values.note } });
        toast("Adjustment applied.");
        await load({ silent: true });
      },
    });
  }

  async function openAssignDialog() {
    const job = state.detail?.data;
    if (!job) return;
    const reassign = REASSIGNABLE.has(job.status);
    openModal({
      title: `${reassign ? "Reassign" : "Assign"} rider · ${job.deliveryCode}`,
      wide: true,
      bodyHtml: `
        ${reassign ? `<p class="sr-banner sr-banner--warning">The current rider (${escapeHtml(job.rider?.fullName || "")}) will be released and notified.</p>` : ""}
        <label class="sr-field"><span>Note (optional, kept in the audit log)</span><input type="text" maxlength="300" data-sr-assign-note /></label>
        <p class="sr-form__error" data-sr-assign-error hidden></p>
        <div data-sr-eligible><div class="sr-loading">Loading riders…</div></div>`,
      async onMount(overlay, close) {
        const host = overlay.querySelector("[data-sr-eligible]");
        const errorEl = overlay.querySelector("[data-sr-assign-error]");
        let riders;
        try {
          riders = (await api(`/deliveries/${encodeURIComponent(job.id)}/eligible-riders`)).riders || [];
        } catch (error) {
          host.innerHTML = `<div class="sr-error"><p>${escapeHtml(error.message)}</p></div>`;
          return;
        }
        if (!riders.length) {
          host.innerHTML = empty("No approved riders yet.");
          return;
        }
        host.innerHTML = `<div class="sr-table-wrap"><table class="sr-table">
          <thead><tr><th>Rider</th><th>Vehicle</th><th>Availability</th><th>Distance to pickup</th><th>Location</th><th>Active jobs</th><th></th></tr></thead>
          <tbody>${riders
            .map(
              (r) => `<tr class="${r.eligible ? "" : "is-blocked"}">
                <td><strong>${escapeHtml(r.fullName)}</strong><span class="sr-sub">${escapeHtml(r.riderCode)}${r.ratingCount ? ` · ${Number(r.ratingAverage).toFixed(1)} ★` : ""}</span></td>
                <td>${escapeHtml(label(VEHICLE_LABELS, r.vehicle?.type))}</td>
                <td>${chip(label(AVAILABILITY_LABELS, r.availabilityStatus), r.availabilityStatus === "OFFLINE" ? "muted" : "success")}</td>
                <td>${r.distanceToPickupKm === null ? "—" : `${r.distanceToPickupKm} km`}</td>
                <td>${escapeHtml(ageLabel(r.locationAgeSeconds))}</td>
                <td>${escapeHtml(r.activeJobs)}</td>
                <td class="sr-actions-cell">${
                  r.eligible
                    ? button("Assign", { "data-assign-rider": r.id }, "primary")
                    : `<span class="sr-blocked">${r.blockedReasons.map((reason) => escapeHtml(reason.label)).join("<br />")}</span>`
                }</td>
              </tr>`,
            )
            .join("")}</tbody></table></div>`;
        host.addEventListener("click", async (event) => {
          const target = event.target.closest("[data-assign-rider]");
          if (!target) return;
          host.querySelectorAll("[data-assign-rider]").forEach((b) => (b.disabled = true));
          target.textContent = "Assigning…";
          errorEl.hidden = true;
          try {
            const note = overlay.querySelector("[data-sr-assign-note]").value.trim();
            const payload = await api(`/deliveries/${encodeURIComponent(job.id)}/assign`, {
              method: "POST",
              body: { riderId: target.getAttribute("data-assign-rider"), note },
            });
            close();
            state.detail.data = payload.delivery;
            render();
            toast("Rider assigned. The rider, seller and buyer were notified.");
          } catch (error) {
            errorEl.textContent = error.message;
            errorEl.hidden = false;
            host.querySelectorAll("[data-assign-rider]").forEach((b) => (b.disabled = false));
            target.textContent = "Assign";
          }
        });
      },
    });
  }

  async function redispatch(trigger) {
    const job = state.detail?.data;
    if (!job) return;
    trigger.disabled = true;
    try {
      const payload = await api(`/deliveries/${encodeURIComponent(job.id)}/redispatch`, { method: "POST" });
      state.detail.data = payload.delivery;
      render();
      if (payload.result?.offered) toast("Offer sent to the nearest eligible rider.");
      else toast(DISPATCH_RESULTS[payload.result?.reason] || "No offer was sent.", "warning");
    } catch (error) {
      trigger.disabled = false;
      toast(error.message, "danger");
    }
  }

  function cancelDelivery() {
    const job = state.detail?.data;
    if (!job) return;
    formModal({
      title: `Cancel ${job.deliveryCode}`,
      description: "The rider (if any) is released. The seller and buyer are notified. This can't be undone.",
      fields: [{ name: "reason", label: "Cancellation reason", type: "textarea", required: true, maxLength: 300 }],
      confirmLabel: "Cancel delivery",
      tone: "danger",
      async onSubmit(values) {
        const payload = await api(`/deliveries/${encodeURIComponent(job.id)}/cancel`, { method: "POST", body: { reason: values.reason } });
        state.detail.data = payload.delivery;
        render();
        toast("Delivery cancelled.");
      },
    });
  }

  function intervene(code) {
    const job = state.detail?.data;
    const rule = INTERVENTIONS[code];
    if (!job || !rule) return;
    formModal({
      title: `${rule.label} · ${job.deliveryCode}`,
      description: rule.description,
      fields: [{ name: "note", label: "Investigation note (required)", type: "textarea", required: true }],
      confirmLabel: rule.label,
      tone: rule.tone === "danger" ? "danger" : "primary",
      async onSubmit(values) {
        const payload = await api(`/deliveries/${encodeURIComponent(job.id)}/intervene`, { method: "POST", body: { action: code, note: values.note } });
        state.detail.data = payload.delivery;
        render();
        toast(`${rule.label}: done.`);
      },
    });
  }

  function reviewRemittance(id, decision, amount) {
    const verify = decision === "VERIFIED";
    formModal({
      title: `${verify ? "Verify" : "Reject"} remittance of ${peso(amount)}`,
      description: verify
        ? "Confirm the full amount has arrived. The rider's COD balance is cleared for these collections."
        : "The collections go back to the rider's outstanding COD balance.",
      fields: [
        {
          name: "note",
          label: verify ? "Note (optional)" : "Reason (shown to the rider)",
          type: "textarea",
          required: !verify,
          maxLength: 300,
        },
      ],
      confirmLabel: verify ? "Verify remittance" : "Reject remittance",
      tone: verify ? "primary" : "danger",
      async onSubmit(values) {
        await api(`/remittances/${encodeURIComponent(id)}/review`, { method: "POST", body: { decision, note: values.note || "" } });
        toast(verify ? "Remittance verified." : "Remittance rejected. The rider was notified.");
        await load({ silent: true });
        refreshNavBadge();
      },
    });
  }

  function updateIncident(id, status) {
    const resolve = status === "RESOLVED";
    formModal({
      title: resolve ? "Resolve ticket" : "Mark ticket in review",
      description: "The rider is notified in the app.",
      fields: [
        {
          name: "resolution",
          label: resolve ? "How was it resolved?" : "Message to the rider (optional)",
          type: "textarea",
          required: resolve,
          maxLength: 1000,
        },
      ],
      confirmLabel: resolve ? "Resolve" : "Mark in review",
      async onSubmit(values) {
        await api(`/incidents/${encodeURIComponent(id)}`, { method: "POST", body: { status, resolution: values.resolution || "" } });
        toast(resolve ? "Ticket resolved." : "Ticket marked in review.");
        await load({ silent: true });
        refreshNavBadge();
      },
    });
  }

  function syncSettingsDraftFromForm() {
    const form = root.querySelector("[data-sr-settings-form]");
    const draft = state.settingsDraft;
    if (!form || !draft) return;
    form.querySelectorAll("[data-sr-setting]").forEach((input) => {
      const key = input.getAttribute("data-sr-setting");
      if (input.type === "checkbox") draft[key] = input.checked;
      else if (input.type === "number") draft[key] = input.value === "" ? "" : Number(input.value);
      else draft[key] = input.value;
    });
    form.querySelectorAll("[data-sr-pricing]").forEach((input) => {
      const [vehicle, field] = input.getAttribute("data-sr-pricing").split(".");
      draft.vehiclePricing = draft.vehiclePricing || {};
      draft.vehiclePricing[vehicle] = draft.vehiclePricing[vehicle] || {};
      draft.vehiclePricing[vehicle][field] = input.value === "" ? "" : Number(input.value);
    });
    const zones = [];
    form.querySelectorAll("[data-sr-zone-index]").forEach((row) => {
      const value = (field) => row.querySelector(`[data-sr-zone-field="${field}"]`);
      zones.push({
        ...(draft.serviceZones?.[Number(row.getAttribute("data-sr-zone-index"))] || {}),
        name: value("name").value.trim(),
        centerLat: value("centerLat").value === "" ? "" : Number(value("centerLat").value),
        centerLng: value("centerLng").value === "" ? "" : Number(value("centerLng").value),
        radiusKm: value("radiusKm").value === "" ? "" : Number(value("radiusKm").value),
        active: value("active").checked,
      });
    });
    draft.serviceZones = zones;
  }

  function validateSettingsDraft(draft) {
    for (const group of SETTINGS_GROUPS) {
      for (const [key, text, min, max] of group.fields) {
        const value = draft[key];
        if (value === "" || !Number.isFinite(value) || value < min || value > max) return `${text} must be between ${min} and ${max}.`;
      }
    }
    for (const vehicle of VEHICLES) {
      const pricing = draft.vehiclePricing?.[vehicle] || {};
      for (const field of ["baseFee", "includedKm", "perKm", "minFee"]) {
        if (pricing[field] === "" || !Number.isFinite(pricing[field]) || pricing[field] < 0) return `${VEHICLE_LABELS[vehicle]} pricing needs a valid ${field}.`;
      }
    }
    for (const [index, zone] of (draft.serviceZones || []).entries()) {
      const name = zone.name || `Zone ${index + 1}`;
      if (!Number.isFinite(zone.centerLat) || zone.centerLat < -90 || zone.centerLat > 90) return `${name}: enter a valid center latitude.`;
      if (!Number.isFinite(zone.centerLng) || zone.centerLng < -180 || zone.centerLng > 180) return `${name}: enter a valid center longitude.`;
      if (!Number.isFinite(zone.radiusKm) || zone.radiusKm < 0.5 || zone.radiusKm > 200) return `${name}: radius must be 0.5–200 km.`;
    }
    return "";
  }

  async function saveSettings(trigger) {
    syncSettingsDraftFromForm();
    const errorEl = root.querySelector("[data-sr-settings-error]");
    const problem = validateSettingsDraft(state.settingsDraft);
    if (problem) {
      errorEl.textContent = problem;
      errorEl.hidden = false;
      return;
    }
    if (state.settings?.enabled && !state.settingsDraft.enabled) {
      if (!window.confirm("Turn off Switch Rider? Buyers won't be able to choose it at checkout and riders can't go online. Deliveries already in progress continue. Sellers with a pickup location will be notified.")) return;
    }
    trigger.disabled = true;
    trigger.textContent = "Saving…";
    try {
      const payload = await api("/settings", { method: "PUT", body: { settings: state.settingsDraft } });
      state.settings = payload.settings;
      state.settingsDraft = JSON.parse(JSON.stringify(payload.settings));
      render();
      toast("Switch Rider settings saved.");
    } catch (error) {
      errorEl.textContent = error.message;
      errorEl.hidden = false;
      trigger.disabled = false;
      trigger.textContent = "Save settings";
    }
  }

  function openImage(trigger) {
    const src = trigger.getAttribute("data-object-url");
    if (!src) {
      toast("This image couldn't be loaded.", "danger");
      return;
    }
    openModal({
      title: trigger.getAttribute("aria-label")?.replace(/^Open /, "") || "Image",
      wide: true,
      bodyHtml: `<img class="sr-lightbox" src="${escapeHtml(src)}" alt="" />`,
    });
  }

  function handleClick(event) {
    const target = event.target.closest("[data-sr-action]");
    if (!target || !root.contains(target) || target.disabled) return;
    const action = target.getAttribute("data-sr-action");
    const id = target.getAttribute("data-id");
    switch (action) {
      case "tab":
        state.tab = target.getAttribute("data-tab");
        state.detail = null;
        load();
        break;
      case "refresh":
        load();
        break;
      case "goto": {
        const [tab, value] = String(target.getAttribute("data-goto")).split(":");
        state.tab = tab;
        state.detail = null;
        if (tab === "riders") Object.assign(state.riders, { view: value, offset: 0 });
        if (tab === "deliveries") Object.assign(state.deliveries, { view: value, offset: 0 });
        if (tab === "remittances") state.remittances.status = value;
        if (tab === "incidents") state.incidents.status = value;
        load();
        break;
      }
      case "rider-view":
        Object.assign(state.riders, { view: target.getAttribute("data-value"), offset: 0 });
        load();
        break;
      case "delivery-view":
        Object.assign(state.deliveries, { view: target.getAttribute("data-value"), offset: 0 });
        load();
        break;
      case "remit-filter":
        state.remittances.status = target.getAttribute("data-value");
        load();
        break;
      case "incident-filter":
        state.incidents.status = target.getAttribute("data-value");
        load();
        break;
      case "page": {
        const bucket = state[target.getAttribute("data-kind")];
        bucket.offset = Math.max(0, bucket.offset + Number(target.getAttribute("data-dir")) * PAGE_SIZE);
        load();
        break;
      }
      case "open-rider":
        openRider(id);
        break;
      case "open-delivery":
        openDelivery(id);
        break;
      case "back":
        state.detail = null;
        load();
        break;
      case "rider-status":
        riderStatusAction(target.getAttribute("data-status-action"));
        break;
      case "doc-review":
        documentReview(id, target.getAttribute("data-decision"), target.getAttribute("data-doc"));
        break;
      case "payout":
        recordPayout(Number(target.getAttribute("data-available")) || 0);
        break;
      case "adjust":
        adjustEarnings();
        break;
      case "assign":
        openAssignDialog();
        break;
      case "redispatch":
        redispatch(target);
        break;
      case "cancel":
        cancelDelivery();
        break;
      case "intervene":
        intervene(target.getAttribute("data-intervention"));
        break;
      case "remit-review":
        reviewRemittance(id, target.getAttribute("data-decision"), Number(target.getAttribute("data-amount")) || 0);
        break;
      case "incident-update":
        updateIncident(id, target.getAttribute("data-status"));
        break;
      case "add-zone":
        syncSettingsDraftFromForm();
        state.settingsDraft.serviceZones = [...(state.settingsDraft.serviceZones || []), { name: "", centerLat: "", centerLng: "", radiusKm: 10, active: true }];
        render();
        break;
      case "remove-zone":
        syncSettingsDraftFromForm();
        state.settingsDraft.serviceZones.splice(Number(target.getAttribute("data-index")), 1);
        render();
        break;
      case "reset-settings":
        state.settingsDraft = JSON.parse(JSON.stringify(state.settings));
        render();
        break;
      case "save-settings":
        saveSettings(target);
        break;
      case "open-image":
        openImage(target);
        break;
      default:
        break;
    }
  }

  function handleKeydown(event) {
    if (event.key !== "Enter") return;
    const row = event.target.closest?.("tr[data-sr-action]");
    if (row) handleClick({ target: row });
  }

  function handleInput(event) {
    const kind = event.target.getAttribute?.("data-sr-search");
    if (!kind) return;
    window.clearTimeout(searchTimer);
    const value = event.target.value;
    searchTimer = window.setTimeout(() => {
      Object.assign(state[kind], { search: value.trim(), offset: 0 });
      load({ silent: true });
    }, 350);
  }

  // --------------------------------------------------------------------- boot

  function init() {
    sectionEl = document.querySelector(`[data-super-admin-section="${SECTION}"]`);
    root = sectionEl?.querySelector("[data-switch-rider-root]") || null;
    if (!root) return;
    root.addEventListener("click", handleClick);
    root.addEventListener("keydown", handleKeydown);
    root.addEventListener("input", handleInput);
    state.pendingFocus = parseFocus(bootHash);
    applyFocus(state.pendingFocus);

    const onVisibility = () => {
      if (!isVisible()) return;
      if (!state.initialized) {
        state.initialized = true;
        load();
      } else if (!isModalOpen()) {
        load({ silent: hasDataForCurrentView() });
      }
    };
    new MutationObserver(onVisibility).observe(sectionEl, { attributes: true, attributeFilter: ["hidden"] });
    onVisibility();
    scheduleAutoRefresh();
    window.setTimeout(refreshNavBadge, 1500);
    window.setInterval(() => {
      if (!document.hidden) refreshNavBadge();
    }, BADGE_REFRESH_MS);
  }

  function applyTabView(tab, value) {
    state.tab = TABS.some((entry) => entry.id === tab) ? tab : "overview";
    state.detail = null;
    if (!value) return;
    if (state.tab === "riders" && state.riders.view !== value) Object.assign(state.riders, { view: value, offset: 0, data: null });
    if (state.tab === "deliveries" && state.deliveries.view !== value) Object.assign(state.deliveries, { view: value, offset: 0, data: null });
    if (state.tab === "remittances" && state.remittances.status !== value) Object.assign(state.remittances, { status: value, data: null });
    if (state.tab === "incidents" && state.incidents.status !== value) Object.assign(state.incidents, { status: value, data: null });
  }

  /** Opens the Switch Rider section on a tab (and optional filter) from elsewhere in Super Admin. */
  function open({ tab = "overview", view = "" } = {}) {
    applyTabView(tab, view);
    if (isVisible()) {
      load();
      return;
    }
    const navTarget = document.querySelector(`[data-super-admin-section-target="${SECTION}"]`);
    if (navTarget) {
      navTarget.click();
    } else {
      window.location.hash = SECTION;
    }
  }

  async function getOverview() {
    const payload = await api("/overview");
    paintNavBadge(payload.overview);
    return payload;
  }

  /** Returns the saved settings, or null when the admin cancelled the confirmation. */
  async function setEnabled(enabled) {
    const next = Boolean(enabled);
    const confirmText = next
      ? "Turn on Switch Rider? Buyers can choose it at checkout and approved riders can go online. Sellers with a pickup location will be notified."
      : "Turn off Switch Rider? Buyers won't be able to choose it at checkout and riders can't go online. Deliveries already in progress continue. Sellers with a pickup location will be notified.";
    if (!window.confirm(confirmText)) return null;
    const payload = await api("/settings", { method: "PUT", body: { settings: { enabled: next } } });
    state.settings = payload.settings;
    if (state.settingsDraft) state.settingsDraft.enabled = payload.settings.enabled;
    if (isVisible()) load({ silent: true });
    return payload.settings;
  }

  window.SuperAdminSwitchRider = { focusFromTargetUrl, refresh: () => load(), open, getOverview, setEnabled };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
