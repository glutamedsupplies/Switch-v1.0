  async function compileFirmwarePayload(body) {
    firmwareBusy = true;
    syncFirmwareUi();
    showFirmwareUploadSnackbar("Building firmware", "Building the project .ino sketch on the server…", {
      mode: "loading",
      percent: 12,
    });
    startFirmwareFlashLighting();
    try {
      showFirmwareUploadSnackbar("Building firmware", "Compiling with arduino-cli (cached builds are faster next time)…", {
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
      if (!payload?.flashId || !Array.isArray(payload?.files) || !payload.files.length) {
        pendingFirmwareFlash = null;
        throw new Error(
          "Firmware build did not return downloadable binaries. Restart the backend, hard-refresh Super Admin, then flash again.",
        );
      }
      syncFirmwareUi();
      return payload;
    } catch (error) {
      showFirmwareUploadSnackbar(
        "Build failed",
        error instanceof Error ? error.message : "Unable to build firmware.",
        { mode: "error", percent: 100 },
      );
      setFeedback(error instanceof Error ? error.message : "Unable to build firmware.", "error");
      stopFirmwareUploadLighting();
      firmwareBusy = false;
      syncFirmwareUi();
      throw error;
    }
  }