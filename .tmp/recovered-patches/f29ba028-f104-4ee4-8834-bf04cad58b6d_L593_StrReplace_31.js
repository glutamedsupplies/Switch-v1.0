  async function loadFirmwareFlashFileArray(firmwarePayload) {
    const files = Array.isArray(firmwarePayload?.files) ? firmwarePayload.files : [];
    if (!files.length) {
      throw new Error("No compiled firmware segments are ready to flash.");
    }
    const flashId = String(firmwarePayload?.flashId || "").trim();
    if (!flashId) {
      // Old/stale builds carried huge base64 in JSON and failed in atob().
      throw new Error(
        "This firmware build is outdated for the new flasher. Click Flash ESP32 again so the server rebuilds it.",
      );
    }
    const fileArray = [];
    for (const file of files) {
      const address = Number(file.address) || 0;
      const expectedSize = Number(file.size) || 0;
      const fileName = String(file.name || "").trim();
      if (!fileName) {
        throw new Error("A firmware segment is missing its file name. Rebuild and flash again.");
      }
      const response = await fetch(
        `/api/super-admin/biometric-firmware/compile?flashId=${encodeURIComponent(flashId)}&name=${encodeURIComponent(fileName)}`,
        { headers: getSuperAdminHeaders({ Accept: "application/octet-stream" }) },
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.message || `Unable to download firmware segment ${fileName}. Restart the backend, then flash again.`);
      }
      const contentType = String(response.headers.get("content-type") || "").toLowerCase();
      if (contentType.includes("application/json")) {
        throw new Error(
          "Server returned JSON instead of a firmware binary. Restart the backend so the new flash download API is loaded, then flash again.",
        );
      }
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (!bytes.length) {
        throw new Error(`Firmware segment ${fileName} is empty.`);
      }
      if (expectedSize > 0 && bytes.length !== expectedSize) {
        throw new Error(
          `Firmware segment ${fileName} size mismatch (${bytes.length} vs ${expectedSize}). Rebuild and flash again.`,
        );
      }
      // Detect accidental JSON/HTML download (starts with '{' or '<').
      if (bytes[0] === 0x7b || bytes[0] === 0x3c) {
        throw new Error(
          "Downloaded firmware looks like a web response, not a binary. Restart the backend and hard-refresh Super Admin, then flash again.",
        );
      }
      fileArray.push({
        data: uint8ArrayToBinaryString(bytes),
        address,
      });
    }
    return fileArray;
  }