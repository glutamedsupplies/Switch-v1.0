  async function compileFirmwarePayload(body) {
    firmwareBusy = true;
    syncFirmwareUi();
    showFirmwareUploadSnackbar("Checking for updates", "Building the project .ino sketch on the server…", {
      mode: "loading",
      percent: 12,
    });
    startFirmwareUploadLighting();
    try {
      showFirmwareUploadSnackbar("Checking for updates", "Installing libraries and building binaries…", {
        mode: "loading",
        percent: 34,
      });
      const response = await fetch("/api/super-admin/biometric-firmware/compile", {
        method: "POST",
        headers: getSuperAdminHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok || payload?.ok === false) {
        throw new Error(payload?.message || "Unable to build firmware.");
      }
      pendingFirmwareFlash = payload;
      showFirmwareUploadSnackbar(
        "Update ready",
        payload?.protocolVersion
          ? `Firmware built · protocol v${payload.protocolVersion}. You can flash now.`
          : "Firmware built. You can flash now.",
        { mode: "success", percent: 100 },
      );
      setFeedback(
        payload?.protocolVersion
          ? `Firmware update ready (protocol v${payload.protocolVersion}). Click Flash ESP32 when ready.`
          : "Firmware update ready. Click Flash ESP32 when ready.",
        "success",
      );
      addActivity("Biometric firmware update built on the server.");
      syncFirmwareUi();
    } catch (error) {
      showFirmwareUploadSnackbar(
        "Update check failed",
        error instanceof Error ? error.message : "Unable to build firmware.",
        { mode: "error", percent: 100 },
      );
      setFeedback(error instanceof Error ? error.message : "Unable to build firmware.", "error");
    } finally {
      stopFirmwareUploadLighting();
      firmwareBusy = false;
      syncFirmwareUi();
    }
  }

  async function checkFirmwareUpdates() {
    if (!isFirmwareUpdateAvailable()) {
      setFeedback("Firmware is already up to date.", "success");
      return;
    }
    await compileFirmwarePayload({ source: "repo" });
  }