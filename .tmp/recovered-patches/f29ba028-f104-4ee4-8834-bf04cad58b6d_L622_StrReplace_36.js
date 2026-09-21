  async function refreshFirmwareToolingStatus() {
    try {
      const response = await fetch("/api/super-admin/biometric-firmware/compile", {
        headers: getSuperAdminHeaders(),
      });
      const payload = await response.json();
      firmwareToolingStatus = payload?.status && typeof payload.status === "object" ? payload.status : null;
    } catch (error) {
      firmwareToolingStatus = null;
    } finally {
      syncFirmwareUi();
    }
  }

  function stopFirmwareStatusPolling() {
    window.clearInterval(firmwareStatusPollTimer);
    firmwareStatusPollTimer = 0;
  }

  function startFirmwareStatusPolling() {
    stopFirmwareStatusPolling();
    firmwareStatusPollTimer = window.setInterval(() => {
      if (!settingsPanelOpen || firmwareBusy) {
        return;
      }
      void refreshFirmwareToolingStatus();
    }, firmwareStatusPollMs);
  }