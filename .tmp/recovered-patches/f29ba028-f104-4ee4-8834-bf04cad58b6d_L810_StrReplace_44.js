  /** Enroll → OLED editing requires a connected device with up-to-date flashed firmware. */
  function isFirmwareUnlockedForEditing() {
    if (!activePort || !deviceVerified) {
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
    if (serverProtocol > 0 && deviceProtocolVersion > 0 && deviceProtocolVersion < serverProtocol) {
      return false;
    }
    const flashed = getFlashedFirmwareRecord();
    if (!flashed.sketchHash || flashed.sketchHash !== serverHash) {
      return false;
    }
    return true;
  }

  function canEditBiometricSettings(options = {}) {
    if (!isFirmwareUnlockedForEditing()) {
      return false;
    }
    if (!options.ignoreBusy && (deviceBusy || firmwareBusy)) {
      return false;
    }
    return true;
  }

  function syncBiometricSettingsAccess() {
    if (!refs || !root) {
      return;
    }
    const deviceReady = Boolean(activePort && deviceVerified);
    const firmwareUnlocked = isFirmwareUnlockedForEditing();
    const canEdit = canEditBiometricSettings();
    const settingsShell = root.querySelector(".admin-biometric-settings");

    if (refs.fetchDeviceButton instanceof HTMLElement) {
      refs.fetchDeviceButton.hidden = !deviceReady;
      refs.fetchDeviceButton.disabled = !canEdit;
      refs.fetchDeviceButton.title = !deviceReady
        ? "Connect the controller first."
        : !firmwareUnlocked
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
          : firmwareUnlocked
            ? "Show settings"
            : "Show settings — flash firmware to unlock editing";
    }
    if (settingsShell instanceof HTMLElement) {
      settingsShell.classList.toggle("is-device-ready", deviceReady);
      settingsShell.classList.toggle("is-firmware-locked", deviceReady && !firmwareUnlocked);
    }
    if (refs.firmwareLockNote instanceof HTMLElement) {
      refs.firmwareLockNote.hidden = !deviceReady || firmwareUnlocked;
    }

    if (!deviceReady && settingsPanelOpen) {
      closeSettingsPanelIfOpen({ animate: true });
    }
  }