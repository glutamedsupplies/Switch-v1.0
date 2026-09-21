  async function compileFirmwarePayload(body, options = {}) {
    const forFlash = options.forFlash === true;
    firmwareBusy = true;
    syncFirmwareUi();
    showFirmwareUploadSnackbar(
      forFlash ? "Building firmware" : "Preparing update",
      "Building the project .ino sketch on the server…",
      {
        mode: "loading",
        percent: 12,
      },
    );
    if (forFlash) {
      startFirmwareFlashLighting();
    } else {
      startFirmwareCheckLighting();
    }
    try {
      showFirmwareUploadSnackbar(
        forFlash ? "Building firmware" : "Preparing update",
        "Compiling with arduino-cli (cached builds are faster next time)…",
        {
          mode: "loading",
          percent: 34,
        },
      );
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
      if (!forFlash) {
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
        stopFirmwareUploadLighting();
      }
      syncFirmwareUi();
      return payload;
    } catch (error) {
      showFirmwareUploadSnackbar(
        forFlash ? "Build failed" : "Update check failed",
        error instanceof Error ? error.message : "Unable to build firmware.",
        { mode: "error", percent: 100 },
      );
      setFeedback(error instanceof Error ? error.message : "Unable to build firmware.", "error");
      stopFirmwareUploadLighting();
      throw error;
    } finally {
      if (!forFlash) {
        firmwareBusy = false;
        syncFirmwareUi();
      }
    }
  }

  async function checkFirmwareUpdates() {
    firmwareBusy = true;
    syncFirmwareUi();
    startFirmwareCheckLighting();
    try {
      await refreshFirmwareToolingStatus();
      const updateAvailable = isFirmwareUpdateAvailable();
      if (updateAvailable) {
        const serverProtocol = Number(firmwareToolingStatus?.protocolVersion) || 0;
        showFirmwareUploadSnackbar(
          "Update available",
          serverProtocol
            ? `New project firmware detected · protocol v${serverProtocol}. Click Flash ESP32 to build and upload.`
            : "New project firmware detected. Click Flash ESP32 to build and upload.",
          { mode: "success", percent: 100 },
        );
        setFeedback("Update available. Flash ESP32 will compile and upload (compile only runs on flash).", "success");
        addActivity("Firmware update check: update available.");
      } else {
        showFirmwareUploadSnackbar(
          "Up to date",
          "No sketch changes detected. Flash is not needed.",
          { mode: "success", percent: 100 },
        );
        setFeedback("Firmware is already up to date.", "success");
        addActivity("Firmware update check: up to date.");
      }
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to check for firmware updates.", "error");
    } finally {
      stopFirmwareUploadLighting();
      firmwareBusy = false;
      syncFirmwareUi();
    }
  }