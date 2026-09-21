  async function compileFirmwarePayload(body) {
    firmwareBusy = true;
    syncFirmwareUi();
    showFirmwareUploadSnackbar("Compiling firmware", "Building the .ino sketch on the server…", {
      mode: "loading",
      percent: 12,
    });
    startFirmwareUploadLighting();
    try {
      showFirmwareUploadSnackbar("Compiling firmware", "Installing libraries and building binaries…", {
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
        throw new Error(payload?.message || "Unable to compile firmware.");
      }
      pendingFirmwareFlash = payload;
      showFirmwareUploadSnackbar(
        "Firmware ready",
        payload?.protocolVersion
          ? `Compiled successfully · protocol v${payload.protocolVersion}. You can flash now.`
          : "Compiled successfully. You can flash now.",
        { mode: "success", percent: 100 },
      );
      setFeedback(
        payload?.protocolVersion
          ? `Firmware compiled (protocol v${payload.protocolVersion}). Click Flash ESP32 when ready.`
          : "Firmware compiled. Click Flash ESP32 when ready.",
        "success",
      );
      addActivity("Biometric firmware compiled on the server.");
      syncFirmwareUi();
    } catch (error) {
      showFirmwareUploadSnackbar(
        "Compile failed",
        error instanceof Error ? error.message : "Unable to compile firmware.",
        { mode: "error", percent: 100 },
      );
      setFeedback(error instanceof Error ? error.message : "Unable to compile firmware.", "error");
    } finally {
      stopFirmwareUploadLighting();
      firmwareBusy = false;
      syncFirmwareUi();
    }
  }