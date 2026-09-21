  }

  function ensureFirmwareUploadSnackbar() {
    if (firmwareUploadSnackbarElements?.root instanceof HTMLElement) {
      return firmwareUploadSnackbarElements;
    }
    const root = document.createElement("aside");
    root.className = "admin-biometric-firmware-snackbar";
    root.hidden = true;
    root.setAttribute("role", "status");
    root.setAttribute("aria-live", "polite");

    const icon = document.createElement("span");
    icon.className = "admin-biometric-firmware-snackbar__icon";
    icon.setAttribute("aria-hidden", "true");
    icon.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 3v12"></path>
        <path d="m17 8-5-5-5 5"></path>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
      </svg>
    `;

    const copy = document.createElement("div");
    copy.className = "admin-biometric-firmware-snackbar__copy";
    const title = document.createElement("strong");
    const message = document.createElement("span");
    copy.append(title, message);

    const progress = document.createElement("div");
    progress.className = "admin-biometric-firmware-snackbar__progress";
    progress.setAttribute("aria-hidden", "true");
    const progressBar = document.createElement("span");
    progressBar.className = "admin-biometric-firmware-snackbar__progress-bar";
    progress.appendChild(progressBar);

    root.append(icon, copy, progress);
    document.body?.appendChild(root);
    firmwareUploadSnackbarElements = { root, title, message, progressBar };
    return firmwareUploadSnackbarElements;
  }

  function showFirmwareUploadSnackbar(title, message, options = {}) {
    const snackbar = ensureFirmwareUploadSnackbar();
    const mode = String(options.mode || "loading").trim().toLowerCase();
    const percent = Number(options.percent);
    const hasPercent = Number.isFinite(percent);
    snackbar.title.textContent = String(title || "Uploading firmware").trim() || "Uploading firmware";
    snackbar.message.textContent = String(message || "").replace(/\s+/g, " ").trim();
    snackbar.root.classList.toggle("is-success", mode === "success");
    snackbar.root.classList.toggle("is-error", mode === "error");
    snackbar.root.classList.toggle("is-loading", mode === "loading");
    snackbar.root.hidden = false;
    window.clearTimeout(firmwareUploadSnackbarHideTimer);
    window.requestAnimationFrame(() => {
      snackbar.root.classList.add("is-visible");
      snackbar.progressBar.classList.toggle("is-indeterminate", !hasPercent && mode === "loading");
      snackbar.progressBar.style.width = hasPercent
        ? `${Math.min(100, Math.max(0, percent))}%`
        : mode === "success"
          ? "100%"
          : mode === "error"
            ? "100%"
            : "18%";
    });
    if (mode === "success" || mode === "error") {
      firmwareUploadSnackbarHideTimer = window.setTimeout(() => {
        hideFirmwareUploadSnackbar();
      }, mode === "success" ? 4200 : 5600);
    }
  }

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

  function pulseFirmwareUploadLed(colorName) {
    if (!activePort?.writable || !deviceVerified || firmwareLedCycleStop) {
      return;
    }
    void sendSerialLine(`FINGER_LED|on|${colorName}|200|0`).catch(() => {});
  }

  function startFirmwareUploadLighting() {
    stopFirmwareUploadLighting();
    if (!activePort || !deviceVerified) {
      return;
    }
    firmwareLedCycleStop = false;
    let colorIndex = 0;
    const tick = () => {
      if (firmwareLedCycleStop || !activePort || !deviceVerified) {
        return;
      }
      pulseFirmwareUploadLed(firmwareUploadLedColors[colorIndex % firmwareUploadLedColors.length]);
      colorIndex += 1;
      firmwareLedCycleTimer = window.setTimeout(tick, 100);
    };
    tick();
  }

  function stopFirmwareUploadLighting() {
    firmwareLedCycleStop = true;
    window.clearTimeout(firmwareLedCycleTimer);
    firmwareLedCycleTimer = 0;
  }

  function syncFirmwareUi() {
    const statusNode = refs?.firmwareStatus;