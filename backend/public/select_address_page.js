/**
 * Web Select Address — parity with Flutter SelectAddressPage (map + bottom sheet).
 */
(() => {
  const PH_CENTER = { lat: 12.8797, lng: 121.774 };
  const SHEET_FRACTION = 0.42;
  const MAP_TYPES = ["roadmap", "hybrid", "satellite", "terrain"];

  let mapsJsPromise = null;
  let mapsConfigPromise = null;

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function resolvedBarangay(place = {}) {
    return String(place.barangay || place.street || "").trim();
  }

  function formatRegionLine(province, city, barangay) {
    return [province, city, barangay].map((p) => String(p || "").trim()).filter(Boolean).join(", ");
  }

  function regionLocationFromPlace(place = {}) {
    const label = String(place.label || place.description || "").trim();
    const id = String(place.id || "").trim();
    return {
      code: id || `name:${label}`,
      name: label,
      description: String(place.description || "").trim(),
    };
  }

  function regionLocationNamed(name) {
    const trimmed = String(name || "").trim();
    return { code: `name:${trimmed}`, name: trimmed, description: "" };
  }

  function hasGooglePlaceId(region) {
    const code = String(region?.code || "").trim();
    return code && !code.startsWith("name:") && !code.startsWith("seed:");
  }

  async function fetchMapsConfig() {
    if (!mapsConfigPromise) {
      mapsConfigPromise = fetch("/api/maps/config")
        .then((r) => r.json().catch(() => ({})))
        .then((data) => ({
          enabled: Boolean(data?.enabled),
          browserKey: String(data?.browserKey || "").trim(),
        }))
        .catch(() => ({ enabled: false, browserKey: "" }));
    }
    return mapsConfigPromise;
  }

  async function loadGoogleMapsJs(apiKey) {
    if (window.google?.maps) return window.google.maps;
    if (mapsJsPromise) return mapsJsPromise;
    mapsJsPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector("script[data-switch-google-maps-js]");
      if (existing) {
        existing.addEventListener("load", () => resolve(window.google?.maps));
        existing.addEventListener("error", reject);
        return;
      }
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`;
      script.async = true;
      script.defer = true;
      script.dataset.switchGoogleMapsJs = "1";
      script.onload = () => resolve(window.google?.maps);
      script.onerror = reject;
      document.head.appendChild(script);
    });
    return mapsJsPromise;
  }

  async function searchPlaces(query) {
    const trimmed = String(query || "").trim();
    if (trimmed.length < 2) return [];
    const response = await fetch(`/api/maps/places/autocomplete?q=${encodeURIComponent(trimmed)}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return [];
    return Array.isArray(data.places) ? data.places : [];
  }

  async function resolvePlaceDetails(place) {
    if (!place?.id || String(place.id).startsWith("osm:")) return place;
    if (place.lat != null && place.lng != null && resolvedBarangay(place) && place.city && place.province) {
      return place;
    }
    try {
      const response = await fetch(`/api/maps/places/details?placeId=${encodeURIComponent(place.id)}`);
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.place) return data.place;
    } catch (_) {}
    return place;
  }

  async function reverseGeocode(lat, lng) {
    if (lat < 4.2 || lat > 21.5 || lng < 116 || lng > 127.5) return null;
    const response = await fetch(
      `/api/maps/geocode/reverse?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`,
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.place) return null;
    return data.place;
  }

  async function searchRegions({ level, province = "", provincePlaceId = "", city = "", cityPlaceId = "" }) {
    const params = new URLSearchParams({ level });
    if (province) params.set("province", province);
    if (provincePlaceId) params.set("provincePlaceId", provincePlaceId);
    if (city) params.set("city", city);
    if (cityPlaceId) params.set("cityPlaceId", cityPlaceId);
    const response = await fetch(`/api/maps/regions/autocomplete?${params}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return [];
    return Array.isArray(data.places) ? data.places : [];
  }

  async function geocodeRegionQuery(query) {
    const trimmed = String(query || "").trim();
    if (trimmed.length < 2) return null;
    const q = trimmed.toLowerCase().includes("philippines") ? trimmed : `${trimmed}, Philippines`;
    const places = await searchPlaces(q);
    for (const place of places) {
      let resolved = place;
      if (place.lat == null || place.lng == null) {
        resolved = await resolvePlaceDetails(place);
      }
      if (resolved?.lat != null && resolved?.lng != null) return resolved;
    }
    return null;
  }

  /**
   * @param {object} options
   * @param {object} [options.session]
   * @param {string} [options.initialEditId]
   * @param {() => void} [options.onSaved]
   * @param {() => void} [options.onClose]
   * @returns {Promise<boolean|null>}
   */
  function openSelectAddressPage(options = {}) {
    const auth = window.SwitchBuyerAuth;
    if (!auth) return Promise.resolve(null);

    const session = options.session || auth.readBuyerSession?.() || {};
    const initialEditId = String(options.initialEditId || "").trim();
    const onSaved = typeof options.onSaved === "function" ? options.onSaved : null;
    const onClose = typeof options.onClose === "function" ? options.onClose : null;

    return new Promise((resolve) => {
      let book = auth.readSavedAccountAddressBook?.(session) || {
        selectedId: "",
        useCurrentLocation: false,
        entries: [],
      };

      const state = {
        editingId: initialEditId || "",
        lat: null,
        lng: null,
        detailsLine: "",
        draftProvince: "",
        draftCity: "",
        draftBarangay: "",
        selectedProvince: null,
        selectedCity: null,
        selectedBarangay: null,
        searchMode: false,
        searching: false,
        reverseGeocoding: false,
        saving: false,
        locating: false,
        pinLifted: false,
        lockRegionFromPicker: false,
        ignoreCameraIdle: false,
        mapTypeIndex: 0,
        regionLoadError: "",
      };

      let map = null;
      let searchTimer = 0;
      let searchRequestId = 0;
      let reverseRequestId = 0;
      let cameraIdleTimer = 0;
      let suggestions = [];
      let sheetHeightPx = 0;

      const overlay = document.createElement("div");
      overlay.className = "sap-overlay";
      overlay.setAttribute("role", "dialog");
      overlay.setAttribute("aria-modal", "true");
      overlay.innerHTML = `
        <div class="sap-map" data-sap-map></div>
        <div class="sap-map-fallback" data-sap-map-fallback hidden>Map unavailable — check Google Maps configuration.</div>
        <div class="sap-pin-layer" data-sap-pin-layer>
          <div class="sap-pin-wrap" data-sap-pin-wrap>
            <div class="sap-pin-hint">Drag map to match your location</div>
            <div class="sap-pin-icon">
              <div class="sap-pin-shadow"></div>
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/></svg>
            </div>
          </div>
        </div>
        <header class="sap-header" data-sap-header>
          <div class="sap-header-inner">
            <button type="button" class="sap-back" data-sap-back aria-label="Back">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <label class="sap-search-field">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              <input type="search" data-sap-search placeholder="Search location, area or landmark..." autocomplete="off" />
              <button type="button" class="sap-search-clear" data-sap-search-clear hidden aria-label="Clear">×</button>
            </label>
          </div>
        </header>
        <div class="sap-search-panel" data-sap-search-panel hidden>
          <div class="sap-search-divider"></div>
          <div data-sap-search-content></div>
        </div>
        <div class="sap-map-controls" data-sap-map-controls>
          <button type="button" class="sap-map-btn" data-sap-map-type aria-label="Map type">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2 2 7l10 5 10-5-10-5Z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/></svg>
          </button>
          <button type="button" class="sap-map-btn is-blue" data-sap-locate aria-label="My location">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="8"/></svg>
          </button>
        </div>
        <div class="sap-sheet" data-sap-sheet>
          <div class="sap-sheet-body">
            <h2 class="sap-sheet-title" data-sap-sheet-title>Add Address</h2>
            <div class="sap-location-card">
              <div class="sap-location-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/><circle cx="12" cy="12" r="3"/></svg>
              </div>
              <div class="sap-location-copy">
                <strong>Location</strong>
                <span data-sap-location-line>Move the map to set your location</span>
                <div class="sap-progress" data-sap-reverse-progress hidden><span></span></div>
              </div>
            </div>
          </div>
          <div class="sap-sheet-footer">
            <p class="sap-region-label">Region</p>
            <button type="button" class="sap-region-field" data-sap-region-field>
              <span data-sap-region-line>Select region</span>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m18 15-6-6-6 6"/></svg>
            </button>
            <p class="sap-region-error" data-sap-region-error hidden></p>
            <button type="button" class="sap-save" data-sap-save>Save Address</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);
      document.body.classList.add("sap-open");

      const els = {
        mapCanvas: overlay.querySelector("[data-sap-map]"),
        mapFallback: overlay.querySelector("[data-sap-map-fallback]"),
        pinLayer: overlay.querySelector("[data-sap-pin-layer]"),
        pinWrap: overlay.querySelector("[data-sap-pin-wrap]"),
        header: overlay.querySelector("[data-sap-header]"),
        back: overlay.querySelector("[data-sap-back]"),
        searchInput: overlay.querySelector("[data-sap-search]"),
        searchClear: overlay.querySelector("[data-sap-search-clear]"),
        searchPanel: overlay.querySelector("[data-sap-search-panel]"),
        searchContent: overlay.querySelector("[data-sap-search-content]"),
        sheet: overlay.querySelector("[data-sap-sheet]"),
        mapControls: overlay.querySelector("[data-sap-map-controls]"),
        sheetTitle: overlay.querySelector("[data-sap-sheet-title]"),
        locationLine: overlay.querySelector("[data-sap-location-line]"),
        reverseProgress: overlay.querySelector("[data-sap-reverse-progress]"),
        regionField: overlay.querySelector("[data-sap-region-field]"),
        regionLine: overlay.querySelector("[data-sap-region-line]"),
        regionError: overlay.querySelector("[data-sap-region-error]"),
        saveBtn: overlay.querySelector("[data-sap-save]"),
        mapTypeBtn: overlay.querySelector("[data-sap-map-type]"),
        locateBtn: overlay.querySelector("[data-sap-locate]"),
      };

      function composedRegionLine() {
        return formatRegionLine(
          state.selectedProvince?.name,
          state.selectedCity?.name,
          state.selectedBarangay?.name,
        );
      }

      function hydrateRegionSelectors(province, city, barangay) {
        state.selectedProvince = province ? regionLocationNamed(province) : null;
        state.selectedCity = city ? regionLocationNamed(city) : null;
        state.selectedBarangay = barangay ? regionLocationNamed(barangay) : null;
      }

      function updateSheetLayout() {
        sheetHeightPx = Math.round(window.innerHeight * SHEET_FRACTION);
        if (els.pinLayer) els.pinLayer.style.bottom = `${sheetHeightPx}px`;
        if (els.mapControls) els.mapControls.style.bottom = `${sheetHeightPx + 14}px`;
        if (map) {
          map.setOptions({ padding: { bottom: sheetHeightPx, top: 0, left: 0, right: 0 } });
        }
      }

      function renderChrome() {
        const isEdit = Boolean(state.editingId);
        if (els.sheetTitle) els.sheetTitle.textContent = isEdit ? "Edit Address" : "Add Address";
        if (els.saveBtn) {
          els.saveBtn.textContent = isEdit ? "Update Address" : "Save Address";
          els.saveBtn.disabled = state.saving;
          els.saveBtn.innerHTML = state.saving
            ? '<span class="sap-spinner" aria-hidden="true"></span>'
            : escapeHtml(isEdit ? "Update Address" : "Save Address");
        }

        const locationText = (() => {
          const details = state.detailsLine.trim();
          if (details) return details;
          const region = composedRegionLine();
          if (region) return region;
          if (state.reverseGeocoding) return "Finding address at pin...";
          return "Move the map to set your location";
        })();
        if (els.locationLine) els.locationLine.textContent = locationText;
        if (els.reverseProgress) els.reverseProgress.hidden = !state.reverseGeocoding;

        const region = composedRegionLine();
        if (els.regionLine) {
          els.regionLine.textContent = region || "Select region";
          els.regionField?.classList.toggle("has-value", Boolean(region));
        }
        if (els.regionError) {
          els.regionError.hidden = !state.regionLoadError;
          els.regionError.textContent = state.regionLoadError;
        }

        if (els.header) els.header.classList.toggle("is-search-mode", state.searchMode);
        if (els.searchPanel) els.searchPanel.hidden = !state.searchMode;
        if (els.sheet) els.sheet.hidden = state.searchMode;
        if (els.mapControls) els.mapControls.hidden = state.searchMode;
        if (els.pinLayer) els.pinLayer.hidden = state.searchMode;
        if (els.searchClear) {
          els.searchClear.hidden = !state.searchMode || !els.searchInput?.value;
        }
        if (els.pinWrap) els.pinWrap.classList.toggle("is-lifted", state.pinLifted);
        if (els.locateBtn) els.locateBtn.disabled = state.locating;
      }

      function closeOverlay(saved = false) {
        window.clearTimeout(searchTimer);
        window.clearTimeout(cameraIdleTimer);
        overlay.remove();
        document.body.classList.remove("sap-open");
        if (saved) onSaved?.();
        else onClose?.();
        resolve(saved ? true : null);
      }

      async function moveCamera(lat, lng, animate = true) {
        if (!map) return;
        state.ignoreCameraIdle = true;
        const center = { lat, lng };
        if (animate) map.panTo(center);
        else map.setCenter(center);
        map.setZoom(16.5);
        await new Promise((r) => window.setTimeout(r, 280));
        state.ignoreCameraIdle = false;
      }

      async function reverseGeocodeCenter() {
        if (!map) return;
        const center = map.getCenter();
        if (!center) return;
        const lat = center.lat();
        const lng = center.lng();
        const requestId = ++reverseRequestId;
        state.reverseGeocoding = true;
        renderChrome();
        try {
          const place = await reverseGeocode(lat, lng);
          if (requestId !== reverseRequestId) return;
          if (!place) {
            state.lat = lat;
            state.lng = lng;
            return;
          }
          const line = String(place.description || place.label || "").trim();
          state.lat = place.lat ?? lat;
          state.lng = place.lng ?? lng;
          state.detailsLine = line;
          if (!state.lockRegionFromPicker) {
            if (place.province) state.draftProvince = place.province;
            if (place.city) state.draftCity = place.city;
            const brgy = resolvedBarangay(place);
            if (brgy) state.draftBarangay = brgy;
            hydrateRegionSelectors(
              place.province || state.draftProvince,
              place.city || state.draftCity,
              brgy || state.draftBarangay,
            );
          }
        } finally {
          if (requestId === reverseRequestId) {
            state.reverseGeocoding = false;
            renderChrome();
          }
        }
      }

      function onCameraIdle() {
        if (state.ignoreCameraIdle || state.searchMode) return;
        window.clearTimeout(cameraIdleTimer);
        cameraIdleTimer = window.setTimeout(() => {
          void reverseGeocodeCenter();
        }, 420);
      }

      async function applyEntry(entry) {
        if (!entry) return;
        state.editingId = entry.id || "";
        state.lat = entry.lat;
        state.lng = entry.lng;
        state.detailsLine = auth.addressSummaryLine?.(entry) || entry.search || "";
        state.draftProvince = entry.province || "";
        state.draftCity = entry.city || "";
        state.draftBarangay = entry.street || "";
        hydrateRegionSelectors(entry.province, entry.city, entry.street);
        if (entry.lat != null && entry.lng != null) {
          await moveCamera(entry.lat, entry.lng, false);
        }
        renderChrome();
      }

      function renderSearchContent() {
        if (!(els.searchContent instanceof HTMLElement)) return;
        const query = String(els.searchInput?.value || "").trim();

        if (state.searching) {
          els.searchContent.innerHTML =
            '<div class="sap-search-loading"><span class="sap-spinner"></span></div>';
          return;
        }

        if (query.length < 2) {
          els.searchContent.innerHTML = `
            <div class="sap-search-empty">
              <button type="button" class="sap-use-current" data-sap-use-current ${state.locating ? "disabled" : ""}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="8"/></svg>
                Use current location
              </button>
              ${state.locating ? '<p class="sap-search-hint">Finding your location...</p>' : ""}
              <p class="sap-search-hint">Search for a street, barangay, city, or landmark</p>
            </div>`;
          els.searchContent.querySelector("[data-sap-use-current]")?.addEventListener("click", () => {
            void useCurrentLocation(true);
          });
          return;
        }

        if (!suggestions.length) {
          els.searchContent.innerHTML = `
            <div class="sap-search-empty">
              <p class="sap-not-found-title">Location not found</p>
              <p class="sap-not-found-copy">No locations found for "${escapeHtml(query)}"</p>
              <p class="sap-search-hint">Try another street, barangay, city, or landmark.</p>
            </div>`;
          return;
        }

        els.searchContent.innerHTML = suggestions
          .map(
            (place, index) => `
          <button type="button" class="sap-suggestion" data-sap-suggestion="${index}">
            <span class="sap-suggestion-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
            </span>
            <span class="sap-suggestion-copy">
              <strong>${escapeHtml(place.label || "")}</strong>
              <span>${escapeHtml(place.description || "")}</span>
            </span>
          </button>`,
          )
          .join("");

        els.searchContent.querySelectorAll("[data-sap-suggestion]").forEach((button) => {
          button.addEventListener("click", () => {
            const index = Number(button.getAttribute("data-sap-suggestion"));
            void selectSuggestion(suggestions[index]);
          });
        });
      }

      async function runSearch(query) {
        const requestId = ++searchRequestId;
        state.searching = true;
        renderSearchContent();
        try {
          suggestions = await searchPlaces(query);
        } catch (_) {
          suggestions = [];
        }
        if (requestId !== searchRequestId) return;
        state.searching = false;
        renderSearchContent();
      }

      function enterSearchMode() {
        state.searchMode = true;
        suggestions = [];
        if (els.searchInput) {
          els.searchInput.value = "";
          els.searchInput.focus();
        }
        renderChrome();
        renderSearchContent();
      }

      function exitSearchMode() {
        state.searchMode = false;
        state.searching = false;
        suggestions = [];
        if (els.searchInput) {
          els.searchInput.value = "";
          els.searchInput.blur();
        }
        renderChrome();
      }

      async function selectSuggestion(place) {
        if (!place) return;
        state.searching = true;
        renderSearchContent();
        const resolved = await resolvePlaceDetails(place);
        const line = String(resolved.description || resolved.label || "").trim();
        if (resolved.province) state.draftProvince = resolved.province;
        if (resolved.city) state.draftCity = resolved.city;
        const brgy = resolvedBarangay(resolved);
        if (brgy) state.draftBarangay = brgy;
        state.lat = resolved.lat ?? null;
        state.lng = resolved.lng ?? null;
        state.detailsLine = line;
        state.lockRegionFromPicker = false;
        hydrateRegionSelectors(resolved.province, resolved.city, brgy);
        state.searching = false;
        exitSearchMode();
        if (resolved.lat != null && resolved.lng != null) {
          await moveCamera(resolved.lat, resolved.lng);
        }
        renderChrome();
      }

      async function useCurrentLocation(fromSearch = false) {
        if (!navigator.geolocation || state.locating) return;
        state.locating = true;
        renderChrome();
        if (fromSearch) renderSearchContent();
        try {
          const position = await new Promise((res, rej) => {
            navigator.geolocation.getCurrentPosition(res, rej, {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 60000,
            });
          });
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const place = await reverseGeocode(lat, lng);
          if (!place) return;
          state.lat = place.lat ?? lat;
          state.lng = place.lng ?? lng;
          state.detailsLine = String(place.description || place.label || "").trim();
          if (place.province) state.draftProvince = place.province;
          if (place.city) state.draftCity = place.city;
          const brgy = resolvedBarangay(place);
          if (brgy) state.draftBarangay = brgy;
          state.lockRegionFromPicker = false;
          hydrateRegionSelectors(place.province, place.city, brgy);
          await moveCamera(state.lat, state.lng);
          if (fromSearch) exitSearchMode();
        } catch (_) {
          /* ignore */
        } finally {
          state.locating = false;
          renderChrome();
          if (fromSearch) renderSearchContent();
        }
      }

      async function locateMapFromSelectedRegion() {
        const province = state.selectedProvince?.name || "";
        const city = state.selectedCity?.name || "";
        const barangay = state.selectedBarangay?.name || "";
        const query = formatRegionLine(province, city, barangay);
        if (!query) return;

        let place = null;
        for (const selected of [state.selectedBarangay, state.selectedCity, state.selectedProvince]) {
          if (!selected || !hasGooglePlaceId(selected)) continue;
          place = await resolvePlaceDetails({ id: selected.code, label: selected.name, description: selected.description });
          if (place?.lat != null && place?.lng != null) break;
          place = null;
        }

        if (!place) {
          const candidates = [
            barangay && city ? `${barangay}, ${city}, Philippines` : "",
            query ? `${query}, Philippines` : "",
            city && province ? `${city}, ${province}, Philippines` : "",
          ].filter(Boolean);
          for (const candidate of candidates) {
            place = await geocodeRegionQuery(candidate);
            if (place) break;
          }
        }

        if (!place?.lat || !place?.lng) return;
        const line = String(place.description || place.label || query).trim();
        state.lat = place.lat;
        state.lng = place.lng;
        state.detailsLine = line;
        state.draftProvince = province;
        state.draftCity = city;
        state.draftBarangay = barangay;
        state.lockRegionFromPicker = true;
        await moveCamera(place.lat, place.lng);
        renderChrome();
      }

      function openRegionPicker() {
        const regionOverlay = document.createElement("div");
        regionOverlay.className = "sap-region-overlay";
        regionOverlay.innerHTML = `
          <div class="sap-region-sheet" role="dialog" aria-label="Select region">
            <div class="sap-region-head">
              <button type="button" class="sap-back" data-rp-back aria-label="Back">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m15 18-6-6 6-6"/></svg>
              </button>
              <h3 data-rp-title>Select province</h3>
            </div>
            <div class="sap-region-list" data-rp-list></div>
          </div>`;
        document.body.appendChild(regionOverlay);

        const rp = {
          step: 0,
          loading: false,
          provinces: [],
          cities: [],
          barangays: [],
          province: state.selectedProvince,
          city: state.selectedCity,
          barangay: state.selectedBarangay,
        };

        const rpList = regionOverlay.querySelector("[data-rp-list]");
        const rpTitle = regionOverlay.querySelector("[data-rp-title]");
        const rpBack = regionOverlay.querySelector("[data-rp-back]");

        function closeRegionPicker(result) {
          regionOverlay.remove();
          if (result) {
            state.selectedProvince = result.province;
            state.selectedCity = result.city;
            state.selectedBarangay = result.barangay;
            state.draftProvince = result.province.name;
            state.draftCity = result.city.name;
            state.draftBarangay = result.barangay.name;
            state.regionLoadError = "";
            renderChrome();
            void locateMapFromSelectedRegion();
          }
        }

        async function loadStep() {
          rp.loading = true;
          if (rpTitle) {
            rpTitle.textContent =
              rp.step === 1 ? "Select municipality" : rp.step === 2 ? "Select barangay" : "Select province";
          }
          if (rpList) rpList.innerHTML = '<div class="sap-region-loading">Loading…</div>';
          try {
            if (rp.step === 0) {
              const places = await searchRegions({ level: "province" });
              rp.provinces = places.map(regionLocationFromPlace);
            } else if (rp.step === 1 && rp.province) {
              const places = await searchRegions({
                level: "city",
                province: rp.province.name,
                provincePlaceId: hasGooglePlaceId(rp.province) ? rp.province.code : "",
              });
              rp.cities = places.map(regionLocationFromPlace);
            } else if (rp.step === 2 && rp.city) {
              const places = await searchRegions({
                level: "barangay",
                province: rp.province?.name || "",
                provincePlaceId: hasGooglePlaceId(rp.province) ? rp.province.code : "",
                city: rp.city.name,
                cityPlaceId: hasGooglePlaceId(rp.city) ? rp.city.code : "",
              });
              rp.barangays = places.map(regionLocationFromPlace);
            }
          } catch (_) {
            if (rpList) rpList.innerHTML = '<div class="sap-region-empty">Unable to load regions.</div>';
            rp.loading = false;
            return;
          }
          rp.loading = false;
          renderRegionList();
        }

        function renderRegionList() {
          const items =
            rp.step === 1 ? rp.cities : rp.step === 2 ? rp.barangays : rp.provinces;
          if (!(rpList instanceof HTMLElement)) return;
          if (!items.length) {
            rpList.innerHTML = '<div class="sap-region-empty">No results found.</div>';
            return;
          }
          const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
          let html = "";
          let lastLetter = "";
          for (const item of sorted) {
            const letter = (item.name[0] || "#").toUpperCase();
            if (letter !== lastLetter) {
              html += `<div class="sap-region-letter">${escapeHtml(letter)}</div>`;
              lastLetter = letter;
            }
            const selected =
              (rp.step === 0 && rp.province?.name === item.name) ||
              (rp.step === 1 && rp.city?.name === item.name) ||
              (rp.step === 2 && rp.barangay?.name === item.name);
            html += `<button type="button" class="sap-region-item${selected ? " is-selected" : ""}" data-rp-item="${escapeHtml(item.code)}">${escapeHtml(item.name)}</button>`;
          }
          rpList.innerHTML = html;
          rpList.querySelectorAll("[data-rp-item]").forEach((button) => {
            button.addEventListener("click", () => {
              const code = button.getAttribute("data-rp-item");
              const item = items.find((row) => row.code === code);
              if (!item) return;
              if (rp.step === 0) {
                rp.province = item;
                rp.city = null;
                rp.barangay = null;
                rp.step = 1;
                void loadStep();
              } else if (rp.step === 1) {
                rp.city = item;
                rp.barangay = null;
                rp.step = 2;
                void loadStep();
              } else {
                rp.barangay = item;
                closeRegionPicker({ province: rp.province, city: rp.city, barangay: rp.barangay });
              }
            });
          });
        }

        rpBack?.addEventListener("click", () => {
          if (rp.step === 0) closeRegionPicker(null);
          else if (rp.step === 2) {
            rp.step = 1;
            void loadStep();
          } else {
            rp.step = 0;
            void loadStep();
          }
        });

        regionOverlay.addEventListener("click", (event) => {
          if (event.target === regionOverlay) closeRegionPicker(null);
        });

        if (rp.province && rp.city) rp.step = 2;
        else if (rp.province) rp.step = 1;
        void loadStep();
      }

      async function saveAddress() {
        if (state.saving) return;
        const province = state.selectedProvince?.name?.trim() || "";
        const city = state.selectedCity?.name?.trim() || "";
        const barangay = state.selectedBarangay?.name?.trim() || "";
        if (!province || !city || !barangay) {
          state.regionLoadError = "Select province, municipality, and barangay before saving.";
          renderChrome();
          return;
        }
        state.saving = true;
        renderChrome();
        try {
          const searchLine = state.detailsLine.trim();
          const id = state.editingId || `addr_${Date.now()}`;
          const entry = auth.normalizeAddressEntry({
            id,
            search: searchLine,
            unit: "",
            street: barangay,
            city,
            province,
            postal: "",
            label: "Saved location",
            lat: state.lat,
            lng: state.lng,
          });
          const index = (book.entries || []).findIndex((item) => item.id === entry.id);
          if (index >= 0) book.entries[index] = entry;
          else book.entries.push(entry);
          book.selectedId = entry.id;
          book.useCurrentLocation = false;
          auth.writeSavedAccountAddressBook?.(session, book);
          closeOverlay(true);
        } catch (_) {
          state.regionLoadError = "Unable to save address.";
        } finally {
          state.saving = false;
          renderChrome();
        }
      }

      async function initMap() {
        updateSheetLayout();
        const config = await fetchMapsConfig();
        if (!config.enabled || !config.browserKey) {
          if (els.mapFallback) els.mapFallback.hidden = false;
          return;
        }
        try {
          await loadGoogleMapsJs(config.browserKey);
          if (!(els.mapCanvas instanceof HTMLElement) || !window.google?.maps) {
            if (els.mapFallback) els.mapFallback.hidden = false;
            return;
          }
          const hasCoords = state.lat != null && state.lng != null;
          map = new window.google.maps.Map(els.mapCanvas, {
            center: hasCoords ? { lat: state.lat, lng: state.lng } : PH_CENTER,
            zoom: hasCoords ? 16.5 : 5.5,
            disableDefaultUI: true,
            zoomControl: false,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            clickableIcons: false,
            gestureHandling: "greedy",
            mapTypeId: MAP_TYPES[state.mapTypeIndex],
          });
          map.addListener("dragstart", () => {
            if (state.lockRegionFromPicker) state.lockRegionFromPicker = false;
            state.pinLifted = true;
            renderChrome();
          });
          map.addListener("idle", () => {
            state.pinLifted = false;
            renderChrome();
            onCameraIdle();
          });
          updateSheetLayout();
        } catch (_) {
          if (els.mapFallback) els.mapFallback.hidden = false;
        }
      }

      // Events
      els.back?.addEventListener("click", () => {
        if (state.searchMode) exitSearchMode();
        else closeOverlay(false);
      });

      els.searchInput?.addEventListener("focus", () => {
        if (!state.searchMode) enterSearchMode();
      });

      els.searchInput?.addEventListener("input", () => {
        if (!state.searchMode) enterSearchMode();
        if (els.searchClear) els.searchClear.hidden = !els.searchInput.value;
        window.clearTimeout(searchTimer);
        const query = String(els.searchInput.value || "").trim();
        searchTimer = window.setTimeout(() => void runSearch(query), 380);
      });

      els.searchClear?.addEventListener("click", () => {
        if (els.searchInput) {
          els.searchInput.value = "";
          els.searchInput.focus();
        }
        suggestions = [];
        renderSearchContent();
        if (els.searchClear) els.searchClear.hidden = true;
      });

      els.mapTypeBtn?.addEventListener("click", () => {
        state.mapTypeIndex = (state.mapTypeIndex + 1) % MAP_TYPES.length;
        if (map) map.setMapTypeId(MAP_TYPES[state.mapTypeIndex]);
      });

      els.locateBtn?.addEventListener("click", () => void useCurrentLocation(false));
      els.regionField?.addEventListener("click", () => openRegionPicker());
      els.saveBtn?.addEventListener("click", () => void saveAddress());

      window.addEventListener("resize", updateSheetLayout, { passive: true });

      overlay.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          if (state.searchMode) exitSearchMode();
          else closeOverlay(false);
        }
      });

      // Bootstrap
      void (async () => {
        await auth.syncSavedAccountAddressBook?.(session);
        book = auth.readSavedAccountAddressBook?.(session) || book;
        const editEntry =
          initialEditId &&
          (book.entries || []).find((item) => item.id === initialEditId);
        if (editEntry) {
          await applyEntry(editEntry);
        } else {
          const selected = (book.entries || []).find((item) => item.id === book.selectedId);
          if (selected && selected.id !== auth.CURRENT_LOCATION_ADDRESS_ID) {
            await applyEntry(selected);
          } else {
            hydrateRegionSelectors("", "", "");
          }
        }
        renderChrome();
        await initMap();
        if (!editEntry && state.lat == null) {
          void reverseGeocodeCenter();
        }
      })();
    });
  }

  window.SwitchSelectAddress = {
    openSelectAddressPage,
  };
})();
