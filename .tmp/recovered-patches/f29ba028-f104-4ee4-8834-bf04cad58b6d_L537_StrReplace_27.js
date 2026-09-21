  function hideFirmwareUploadSnackbar() {
    window.clearTimeout(firmwareUploadSnackbarHideTimer);
    firmwareUploadSnackbarHideTimer = 0;
    const snackbar = firmwareUploadSnackbarElements;
    if (!(snackbar?.root instanceof HTMLElement)) {
      return;
    }
    snackbar.root.classList.remove("is-visible", "is-success", "is-error", "is-loading");
    window.setTimeout(() => {
      if (snackbar.root && !snackbar.root.classList.contains("is-visible")) {
        snackbar.root.hidden = true;
      }
    }, 180);
  }

  function ensureFirmwareUpdatedModal() {
    if (firmwareUpdatedModalElements?.root instanceof HTMLElement) {
      return firmwareUpdatedModalElements;
    }
    const root = document.createElement("div");
    root.className = "admin-biometric-firmware-updated-overlay";
    root.hidden = true;
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-labelledby", "admin-biometric-firmware-updated-title");
    root.innerHTML = `
      <div class="admin-biometric-firmware-updated-modal">
        <span class="admin-biometric-firmware-updated-modal__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="9"></circle>
            <path d="m8.5 12.2 2.4 2.4 4.6-5.2"></path>
          </svg>
        </span>
        <h2 id="admin-biometric-firmware-updated-title">Firmware updated</h2>
        <p data-biometric-firmware-updated-message>Flash complete. Reconnect the controller when the COM port returns.</p>
      </div>
    `;
    document.body?.appendChild(root);
    firmwareUpdatedModalElements = {
      root,
      message: root.querySelector("[data-biometric-firmware-updated-message]"),
    };
    return firmwareUpdatedModalElements;
  }

  function hideFirmwareUpdatedModal() {
    window.clearTimeout(firmwareUpdatedModalHideTimer);
    firmwareUpdatedModalHideTimer = 0;
    const modal = firmwareUpdatedModalElements;
    if (!(modal?.root instanceof HTMLElement)) {
      return;
    }
    modal.root.classList.remove("is-open");
    window.setTimeout(() => {
      if (modal.root && !modal.root.classList.contains("is-open")) {
        modal.root.hidden = true;
      }
    }, 220);
  }

  function showFirmwareUpdatedModal(message = "") {
    const modal = ensureFirmwareUpdatedModal();
    if (modal.message instanceof HTMLElement) {
      modal.message.textContent = String(message || "")
        .replace(/\s+/g, " ")
        .trim()
        || "Flash complete. Reconnect the controller when the COM port returns.";
    }
    hideFirmwareUploadSnackbar();
    modal.root.hidden = false;
    window.clearTimeout(firmwareUpdatedModalHideTimer);
    window.requestAnimationFrame(() => {
      modal.root.classList.add("is-open");
    });
    firmwareUpdatedModalHideTimer = window.setTimeout(() => {
      hideFirmwareUpdatedModal();
    }, 3600);
  }

  function applyFirmwareCheckLighting() {