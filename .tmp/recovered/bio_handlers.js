async function handleSuperAdminBiometricSettingsApi(request, response) {
  if (!requireSuperAdmin(request, response)) {
    return;
  }
  if (!["GET", "PUT"].includes(request.method)) {
    sendJson(response, 405, { message: "Method not allowed." });
    return;
  }

  try {
    if (request.method === "GET") {
      sendJson(response, 200, { settings: await readBiometricSettings() });
      return;
    }

    const payload = await parseRequestBody(request);
    const nextSettings = await enqueueSerializedMutation("biometric-settings", async () => {
      const existingSettings = await readBiometricSettings();
      return writeBiometricSettings(normalizeAdminBiometricSettings(
        {
          ...(payload?.settings && typeof payload.settings === "object" ? payload.settings : payload),
          updatedAt: new Date().toISOString(),
        },
        existingSettings,
      ));
    });
    sendJson(response, 200, {
      settings: nextSettings,
      message: "Super Admin biometric device settings saved.",
    });
  } catch (error) {
    sendJson(response, 400, {
      message: error instanceof Error
        ? error.message
        : "Unable to update biometric device settings.",
    });
  }
}

async function handleSuperAdminBiometricFirmwareApi(request, response) {
  if (!requireSuperAdmin(request, response)) {
    return;
  }
  if (!biometricFirmwareCompile) {
    sendJson(response, 503, {
      message: "Firmware compile service is unavailable on this server.",
    });
    return;
  }

  try {
    if (request.method === "GET") {
      sendJson(response, 200, {
        ok: true,
        status: await biometricFirmwareCompile.getBiometricFirmwareToolingStatus(),
      });
      return;
    }

    if (request.method !== "POST") {
      sendJson(response, 405, { message: "Method not allowed." });
      return;
    }

    const payload = await parseRequestBody(request);
    const source = String(payload?.source ?? "repo").trim().toLowerCase();
    let compiled = null;
    if (source === "upload") {
      compiled = await biometricFirmwareCompile.compileBiometricFirmwareFromSketchText(payload?.sketch);
    } else {
      compiled = await biometricFirmwareCompile.compileBiometricFirmwareFromRepo();
    }

    sendJson(response, 200, {
      ok: true,
      message: "Firmware compiled. Select the ESP32 COM port to flash it from this browser.",
      fqbn: compiled.fqbn,
      source: compiled.source,
      protocolVersion: compiled.protocolVersion,
      files: compiled.files,
    });
  } catch (error) {
    sendJson(response, 400, {
      ok: false,
      message: error instanceof Error
        ? error.message
        : "Unable to compile biometric firmware.",
    });
  }
}