  function isFirmwareUpdateAvailable() {
    if (firmwareBusy) {
      return false;
    }
    if (!firmwareToolingStatus?.sketchExists) {
      return false;
    }
    const serverHash = String(firmwareToolingStatus.sketchHash || "").trim();
    if (!serverHash) {
      return false;
    }
    const serverProtocol = Number(firmwareToolingStatus.protocolVersion) || 0;
    const flashed = getFlashedFirmwareRecord();

    // No flash baseline in this browser yet — allow Flash so any .ino edit can upload.
    if (!flashed.sketchHash) {
      return true;
    }
    if (serverHash !== flashed.sketchHash) {
      return true;
    }
    if (
      serverProtocol > 0
      && deviceVerified
      && deviceProtocolVersion > 0
      && deviceProtocolVersion < serverProtocol
    ) {
      return true;
    }
    return false;
  }

  /** Enroll → OLED editing requires a connected device with up-to-date flashed firmware. */
  function canEditBiometricSettings() {
    if (!activePort || !deviceVerified || deviceBusy || firmwareBusy) {
      return false;
    }
    if (!firmwareToolingStatus?.sketchExists) {
      return false;
    }
    const serverProtocol = Number(firmwareToolingStatus.protocolVersion) || 0;
    if (serverProtocol > 0 && deviceProtocolVersion > 0 && deviceProtocolVersion < serverProtocol) {
      return false;
    }
    if (isFirmwareUpdateAvailable()) {
      return false;
    }
    return true;
  }

  function syncBiometricSettingsAccess() {
    if (!refs || !root) {
      return;
    }
    const deviceReady = Boolean(activePort && deviceVerified);
    const canEdit = canEditBiometricSettings();
    const settingsShell = root.querySelector(".admin-biometric-settings");

    if (refs.fetchDeviceButton instanceof HTMLElement) {
      refs.fetchDeviceButton.hidden = !deviceReady;
      refs.fetchDeviceButton.disabled = !canEdit;
      refs.fetchDeviceButton.title = !deviceReady
        ? "Connect the controller first."
        : !canEdit
          ? "Flash the latest firmware before fetching settings."
          : "Fetch saved settings from the controller.";
    }
    if (refs.settingsToggle instanceof HTMLElement) {
      // Show wrench when a traced device is present — do not auto-open the panel.
      refs.settingsToggle.hidden = !deviceReady;
      refs.settingsToggle.disabled = !deviceReady;
      refs.settingsToggle.title = !deviceReady
        ? "Connect the controller first."
        : settingsPanelOpen
          ? "Hide settings"
          : canEdit
            ? "Show settings"
            : "Show settings — flash firmware to unlock editing";
    }
    if (settingsShell instanceof HTMLElement) {
      settingsShell.classList.toggle("is-device-ready", deviceReady);
      settingsShell.classList.toggle("is-firmware-locked", deviceReady && !canEdit);
    }
    if (refs.firmwareLockNote instanceof HTMLElement) {
      refs.firmwareLockNote.hidden = !deviceReady || canEdit;
    }

    if (!deviceReady && settingsPanelOpen) {
      closeSettingsPanelIfOpen({ animate: true });
    }
  }

  function syncFirmwareUi() {