  function uint8ArrayToBinaryString(bytes) {
    const source = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
    const chunkSize = 0x8000;
    let output = "";
    for (let index = 0; index < source.length; index += chunkSize) {
      output += String.fromCharCode.apply(null, source.subarray(index, index + chunkSize));
    }
    return output;
  }

  async function loadFirmwareFlashFileArray(firmwarePayload) {
    const files = Array.isArray(firmwarePayload?.files) ? firmwarePayload.files : [];
    if (!files.length) {
      throw new Error("No compiled firmware segments are ready to flash.");
    }
    const flashId = String(firmwarePayload?.flashId || "").trim();
    const fileArray = [];
    for (const file of files) {
      const address = Number(file.address) || 0;
      const expectedSize = Number(file.size) || 0;
      let bytes = null;
      if (flashId && file.name) {
        const response = await fetch(
          `/api/super-admin/biometric-firmware/compile?flashId=${encodeURIComponent(flashId)}&name=${encodeURIComponent(file.name)}`,
          { headers: getSuperAdminHeaders({ Accept: "application/octet-stream" }) },
        );
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload?.message || `Unable to download firmware segment ${file.name}.`);
        }
        bytes = new Uint8Array(await response.arrayBuffer());
      } else if (file.base64) {
        // Legacy fallback for older compile responses.
        const cleaned = String(file.base64 || "").replace(/\s+/g, "");
        const binary = window.atob(cleaned);
        bytes = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index += 1) {
          bytes[index] = binary.charCodeAt(index);
        }
      } else {
        throw new Error(`Firmware segment ${file.name || "unknown"} is missing binary data. Build again.`);
      }
      if (!bytes.length) {
        throw new Error(`Firmware segment ${file.name || "unknown"} is empty.`);
      }
      if (expectedSize > 0 && bytes.length !== expectedSize) {
        throw new Error(
          `Firmware segment ${file.name || "unknown"} size mismatch (${bytes.length} vs ${expectedSize}). Build again.`,
        );
      }
      fileArray.push({
        data: uint8ArrayToBinaryString(bytes),
        address,
      });
    }
    return fileArray;
  }

  async function resolveAuthorizedFlashPort(preferredPort) {