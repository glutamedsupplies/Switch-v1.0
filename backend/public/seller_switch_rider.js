(function () {
  "use strict";

  const API = "/api/switch-rider/seller";
  const POLL_MS = 15000;
  const VEHICLE_LABELS = { BICYCLE: "Bicycle", MOTORCYCLE: "Motorcycle", CAR: "Car", VAN: "Van" };
  const STATUS_TONES = {
    PREPARING: "muted",
    WAITING_FOR_RIDER: "warning",
    OFFERED: "warning",
    DELIVERED: "success",
    CANCELLED: "muted",
    FAILED_DELIVERY: "danger",
    RETURN_REQUIRED: "danger",
    RETURNING_TO_SELLER: "danger",
    RETURNED_TO_SELLER: "muted",
  };

  const state = {
    group: null,
    delivery: null,
    deliveryLoaded: false,
    pickup: null,
    pickupLoaded: false,
    editingPickup: false,
    busy: false,
    error: "",
  };

  let panel = null;
  let pollTimer = 0;
  let map = null;
  let marker = null;

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  const pesoFormatter = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

  async function api(path, { method = "GET", body } = {}) {
    let response;
    try {
      response = await fetch(API + path, {
        method,
        cache: "no-store",
        credentials: "same-origin",
        headers: { Accept: "application/json", ...(body !== undefined ? { "Content-Type": "application/json" } : {}) },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (_) {
      throw new Error("Can't reach the server. Check your connection.");
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload?.message || `Request failed (${response.status}).`);
      error.code = payload?.code || "";
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  function isSwitchRiderGroup(group) {
    return String(group?.courier || "").replace(/\s+/g, " ").trim().toLowerCase() === "switch rider";
  }

  function groupId(group) {
    return String(group?.createdAtEpochMs || "");
  }

  function isToShip(group) {
    return String(group?.stage || "").toLowerCase() === "toship";
  }

  // ----------------------------------------------------------------- loading

  async function loadPickup() {
    try {
      state.pickup = (await api("/pickup-location")).pickupLocation || null;
    } catch (_) {
      state.pickup = null;
    }
    state.pickupLoaded = true;
  }

  async function loadDelivery() {
    const id = groupId(state.group);
    if (!id) return;
    try {
      const delivery = (await api(`/deliveries/${encodeURIComponent(id)}`)).delivery || null;
      if (groupId(state.group) !== id) return;
      state.delivery = delivery;
      state.error = "";
    } catch (error) {
      if (groupId(state.group) !== id) return;
      state.error = error.status === 401 ? "Sign in again to see Switch Rider status." : error.message;
    }
    state.deliveryLoaded = true;
  }

  async function refresh() {
    await Promise.all([loadDelivery(), state.pickupLoaded ? null : loadPickup()]);
    paint();
  }

  function schedulePoll() {
    window.clearInterval(pollTimer);
    pollTimer = window.setInterval(() => {
      if (document.hidden || !state.group || state.editingPickup || state.busy) return;
      loadDelivery().then(paint);
    }, POLL_MS);
  }

  // ----------------------------------------------------------------- render

  function render(group) {
    panel = panel || document.querySelector("[data-switch-rider-seller-panel]");
    if (!panel) return;
    const relevant = group && isSwitchRiderGroup(group);
    if (!relevant) {
      state.group = null;
      panel.hidden = true;
      window.clearInterval(pollTimer);
      return;
    }
    const changed = groupId(group) !== groupId(state.group);
    const stageChanged = !changed && String(group.stage) !== String(state.group?.stage);
    state.group = group;
    panel.hidden = false;
    if (changed) {
      state.delivery = null;
      state.deliveryLoaded = false;
      state.error = "";
      state.editingPickup = false;
      paint();
      refresh();
      schedulePoll();
    } else if (stageChanged) {
      loadDelivery().then(paint);
    }
  }

  function chip(text, tone) {
    return `<span class="seller-sr__chip seller-sr__chip--${tone || "info"}">${escapeHtml(text)}</span>`;
  }

  function paint() {
    if (!panel || !state.group) return;
    if (state.editingPickup) return;
    const d = state.delivery;
    let body = "";

    if (!state.deliveryLoaded) {
      body = `<p class="seller-sr__muted">Loading Switch Rider status…</p>`;
    } else if (state.error) {
      body = `<p class="seller-sr__error">${escapeHtml(state.error)}</p>
        <button type="button" class="seller-sr__btn" data-seller-sr-action="retry">Try again</button>`;
    } else {
      body = renderDelivery(d);
    }

    panel.innerHTML = `
      <div class="seller-sr__head">
        <div>
          <p class="seller-sr__eyebrow">Delivery by</p>
          <h3>Switch Rider</h3>
        </div>
        ${d ? chip(d.statusLabel, STATUS_TONES[d.status] || "info") : chip("Not requested", "muted")}
      </div>
      ${body}
      ${renderPickupSummary()}`;
  }

  function renderDelivery(d) {
    const parts = [];
    const canCallRider = !d || d.canMarkReady;
    if (canCallRider) {
      if (!state.pickupLoaded || !state.pickup) {
        parts.push(`<p class="seller-sr__warning">Set your pickup location below before calling a rider.</p>`);
      } else if (!isToShip(state.group) && !d) {
        parts.push(`<p class="seller-sr__muted">Pack the order first. Once it's in <strong>To Ship</strong>, press <strong>Ready for Rider</strong>.</p>`);
      } else {
        parts.push(`
          <p class="seller-sr__muted">Press Ready for Rider only when the parcel is sealed. Switch dispatches the nearest verified rider to your pickup location.</p>
          <button type="button" class="seller-sr__btn seller-sr__btn--primary" data-seller-sr-action="ready" ${state.busy ? "disabled" : ""}>
            ${state.busy ? "Calling a rider…" : "Ready for Rider"}
          </button>`);
      }
    }
    if (!d) return parts.join("");

    parts.unshift(`<p class="seller-sr__code">Delivery ${escapeHtml(d.deliveryCode)}${d.distanceKm ? ` · ${escapeHtml(d.distanceKm)} km · ~${escapeHtml(d.estimatedMinutes)} min (estimate)` : ""}</p>`);

    if (d.pickupPin) {
      parts.push(`
        <div class="seller-sr__pin">
          <span>Pickup PIN</span>
          <strong>${escapeHtml(d.pickupPin)}</strong>
          <small>Give this PIN only to the Switch rider when you hand over the parcel. Never share it by chat or phone.</small>
        </div>`);
    }
    if (d.returnPin) {
      parts.push(`
        <div class="seller-sr__pin seller-sr__pin--return">
          <span>Return PIN</span>
          <strong>${escapeHtml(d.returnPin)}</strong>
          <small>The rider is bringing the parcel back. Check the parcel, then give this PIN to the rider to confirm the return.</small>
        </div>`);
    }
    if (d.rider) {
      const r = d.rider;
      parts.push(`
        <div class="seller-sr__rider">
          ${r.photoUrl ? `<img src="${escapeHtml(r.photoUrl)}" alt="" class="seller-sr__avatar" />` : `<span class="seller-sr__avatar seller-sr__avatar--initials">${escapeHtml((r.firstName || "R").charAt(0))}</span>`}
          <div>
            <strong>${escapeHtml(r.firstName || "Your rider")}</strong>
            <span>${escapeHtml(VEHICLE_LABELS[r.vehicleType] || r.vehicleType || "")}${r.plateNumber ? ` · ${escapeHtml(r.plateNumber)}` : ""}${r.vehicleColor ? ` · ${escapeHtml(r.vehicleColor)}` : ""}</span>
            ${r.ratingCount ? `<span>${Number(r.ratingAverage).toFixed(1)} ★ (${r.ratingCount})</span>` : ""}
          </div>
          ${d.riderPhone ? `<a class="seller-sr__btn" href="tel:${escapeHtml(d.riderPhone)}">Call rider</a>` : ""}
        </div>`);
    } else if (["WAITING_FOR_RIDER", "OFFERED"].includes(d.status)) {
      parts.push(`<p class="seller-sr__muted">Finding a rider near your pickup location…</p>`);
    }
    if (d.paymentMethod === "COD" && d.codAmount > 0) {
      parts.push(`<p class="seller-sr__muted">Cash on delivery: the rider collects <strong>${escapeHtml(pesoFormatter.format(d.codAmount))}</strong> from the buyer and remits it to Switch.</p>`);
    }
    if (d.failureReason) {
      parts.push(`<p class="seller-sr__warning">Delivery attempt failed: ${escapeHtml(d.failureReason.replace(/_/g, " ").toLowerCase())}.</p>`);
    }
    if (d.cancellationReason) {
      parts.push(`<p class="seller-sr__warning">Cancelled${d.cancelledByRole ? ` by ${escapeHtml(d.cancelledByRole.replace(/_/g, " "))}` : ""}: ${escapeHtml(d.cancellationReason)}</p>`);
    }
    return parts.join("");
  }

  function renderPickupSummary() {
    if (!state.pickupLoaded) return "";
    const p = state.pickup;
    return `
      <div class="seller-sr__pickup">
        <div>
          <span class="seller-sr__eyebrow">Pickup location</span>
          ${
            p
              ? `<strong>${escapeHtml(p.address)}</strong>
                 <span>${escapeHtml(p.contactName)} · ${escapeHtml(p.contactPhone)}</span>
                 <a href="https://www.google.com/maps?q=${p.lat},${p.lng}" target="_blank" rel="noopener">View pin on map</a>`
              : `<strong>Not set yet</strong>`
          }
        </div>
        <button type="button" class="seller-sr__btn" data-seller-sr-action="edit-pickup">${p ? "Edit" : "Set pickup location"}</button>
      </div>`;
  }

  function renderPickupForm() {
    const p = state.pickup || {};
    const hasMap = Boolean(window.L);
    panel.innerHTML = `
      <form class="seller-sr__form" data-seller-sr-pickup-form novalidate>
        <div class="seller-sr__head"><h3>Pickup location</h3></div>
        <p class="seller-sr__muted">Riders come to this exact spot. ${hasMap ? "Click the map to move the pin, or" : "Use"} your current location if you're at the shop.</p>
        ${hasMap ? `<div class="seller-sr__map" data-seller-sr-map></div>` : ""}
        <button type="button" class="seller-sr__btn" data-seller-sr-action="locate">Use my current location</button>
        <div class="seller-sr__grid">
          <label>Latitude<input name="lat" type="number" step="0.000001" min="-90" max="90" value="${escapeHtml(p.lat ?? "")}" required /></label>
          <label>Longitude<input name="lng" type="number" step="0.000001" min="-180" max="180" value="${escapeHtml(p.lng ?? "")}" required /></label>
        </div>
        <label>Full pickup address<textarea name="address" rows="2" maxlength="300" required>${escapeHtml(p.address || "")}</textarea></label>
        <label>Area / barangay<input name="area" maxlength="80" value="${escapeHtml(p.area || "")}" placeholder="e.g. Poblacion, Makati" /></label>
        <div class="seller-sr__grid">
          <label>Contact name<input name="contactName" maxlength="80" value="${escapeHtml(p.contactName || "")}" required /></label>
          <label>Contact mobile<input name="contactPhone" maxlength="20" inputmode="tel" value="${escapeHtml(p.contactPhone || "")}" required placeholder="09XX XXX XXXX" /></label>
        </div>
        <label>Notes for riders<input name="notes" maxlength="300" value="${escapeHtml(p.notes || "")}" placeholder="Landmark, gate, parking" /></label>
        <p class="seller-sr__error" data-seller-sr-form-error hidden></p>
        <div class="seller-sr__actions">
          <button type="button" class="seller-sr__btn" data-seller-sr-action="cancel-pickup">Cancel</button>
          <button type="submit" class="seller-sr__btn seller-sr__btn--primary">Save pickup location</button>
        </div>
      </form>`;
    if (hasMap) mountMap(p);
  }

  function mountMap(p) {
    const host = panel.querySelector("[data-seller-sr-map]");
    if (!host) return;
    const start = Number.isFinite(p.lat) && Number.isFinite(p.lng) ? [p.lat, p.lng] : [14.5995, 120.9842];
    map = window.L.map(host, { scrollWheelZoom: false }).setView(start, Number.isFinite(p.lat) ? 16 : 11);
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);
    marker = window.L.marker(start, { draggable: true }).addTo(map);
    const sync = (latlng) => setCoordinates(latlng.lat, latlng.lng, { moveMap: false });
    marker.on("dragend", () => sync(marker.getLatLng()));
    map.on("click", (event) => {
      marker.setLatLng(event.latlng);
      sync(event.latlng);
    });
    window.setTimeout(() => map?.invalidateSize(), 50);
  }

  function setCoordinates(lat, lng, { moveMap = true } = {}) {
    const form = panel.querySelector("[data-seller-sr-pickup-form]");
    if (!form) return;
    form.elements.lat.value = Number(lat).toFixed(6);
    form.elements.lng.value = Number(lng).toFixed(6);
    if (moveMap && map && marker) {
      marker.setLatLng([lat, lng]);
      map.setView([lat, lng], 17);
    }
  }

  function destroyMap() {
    if (map) map.remove();
    map = null;
    marker = null;
  }

  // ---------------------------------------------------------------- actions

  async function markReady() {
    if (!state.group || state.busy) return;
    if (!window.confirm("Call a Switch Rider for this order? Only confirm when the parcel is sealed and ready for pickup.")) return;
    state.busy = true;
    paint();
    try {
      state.delivery = (await api(`/deliveries/${encodeURIComponent(groupId(state.group))}/ready`, { method: "POST" })).delivery;
      state.error = "";
    } catch (error) {
      window.alert(error.message);
    } finally {
      state.busy = false;
      paint();
    }
  }

  function locate(trigger) {
    if (!navigator.geolocation) {
      window.alert("This browser can't share your location. Click the map or enter the coordinates instead.");
      return;
    }
    trigger.disabled = true;
    trigger.textContent = "Locating…";
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates(position.coords.latitude, position.coords.longitude);
        trigger.disabled = false;
        trigger.textContent = "Use my current location";
      },
      () => {
        window.alert("Location permission was denied or unavailable. Click the map or enter the coordinates instead.");
        trigger.disabled = false;
        trigger.textContent = "Use my current location";
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }

  async function savePickup(form) {
    const errorEl = form.querySelector("[data-seller-sr-form-error]");
    const submit = form.querySelector('button[type="submit"]');
    const values = Object.fromEntries(new FormData(form).entries());
    const lat = Number(values.lat);
    const lng = Number(values.lng);
    let problem = "";
    if (values.lat === "" || values.lng === "" || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      problem = "Pin the pickup location on the map or use your current location.";
    } else if (String(values.address || "").trim().length < 8) {
      problem = "Enter the full pickup address.";
    } else if (!String(values.contactName || "").trim() || String(values.contactPhone || "").replace(/\D/g, "").length < 10) {
      problem = "Enter a pickup contact name and mobile number.";
    }
    if (problem) {
      errorEl.textContent = problem;
      errorEl.hidden = false;
      return;
    }
    submit.disabled = true;
    submit.textContent = "Saving…";
    try {
      state.pickup = (await api("/pickup-location", { method: "PUT", body: { ...values, lat, lng } })).pickupLocation;
      state.editingPickup = false;
      destroyMap();
      paint();
    } catch (error) {
      errorEl.textContent = error.message;
      errorEl.hidden = false;
      submit.disabled = false;
      submit.textContent = "Save pickup location";
    }
  }

  function handleClick(event) {
    const target = event.target.closest("[data-seller-sr-action]");
    if (!target || !panel?.contains(target) || target.disabled) return;
    const action = target.getAttribute("data-seller-sr-action");
    if (action === "ready") markReady();
    else if (action === "retry") {
      state.deliveryLoaded = false;
      paint();
      refresh();
    } else if (action === "edit-pickup") {
      state.editingPickup = true;
      renderPickupForm();
    } else if (action === "cancel-pickup") {
      state.editingPickup = false;
      destroyMap();
      paint();
    } else if (action === "locate") locate(target);
  }

  function handleSubmit(event) {
    const form = event.target.closest("[data-seller-sr-pickup-form]");
    if (!form) return;
    event.preventDefault();
    savePickup(form);
  }

  function init() {
    panel = document.querySelector("[data-switch-rider-seller-panel]");
    if (!panel) return;
    panel.addEventListener("click", handleClick);
    panel.addEventListener("submit", handleSubmit);
  }

  window.SellerSwitchRider = { render };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
