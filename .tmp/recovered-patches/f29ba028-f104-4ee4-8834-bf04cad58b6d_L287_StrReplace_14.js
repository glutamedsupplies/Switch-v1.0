  }

  function syncFirmwareUi() {
    const statusNode = refs?.firmwareStatus;
    const buildNode = refs?.firmwareBuildName;
    const flashButton = refs?.firmwareFlashButton;
    if (statusNode instanceof HTMLElement) {
      if (firmwareBusy) {
        statusNode.textContent = "Working on firmware…";
      } else if (!firmwareToolingStatus) {
        statusNode.textContent = "Checking compile tools…";
      } else if (!firmwareToolingStatus.arduinoCli) {
        statusNode.textContent = "Install arduino-cli on the server to compile .ino files from Super Admin.";
      } else {
        statusNode.textContent = `Ready · ${firmwareToolingStatus.fqbn}${firmwareToolingStatus.protocolVersion ? ` · protocol v${firmwareToolingStatus.protocolVersion}` : ""}`;
      }
    }
    if (buildNode instanceof HTMLElement) {
      if (!pendingFirmwareFlash?.files?.length) {
        buildNode.textContent = "No compiled firmware yet.";
      } else {
        const totalBytes = pendingFirmwareFlash.files.reduce((sum, file) => sum + Number(file.size || 0), 0);
        const label = pendingFirmwareFlash.source === "upload" ? "Uploaded sketch" : "Project sketch";
        buildNode.textContent = `${label} compiled · ${pendingFirmwareFlash.files.length} segments · ${Math.max(1, Math.round(totalBytes / 1024))} KB`;
      }
    }
    if (flashButton instanceof HTMLButtonElement) {
      flashButton.disabled = firmwareBusy || !pendingFirmwareFlash?.files?.length || !serialSupported();
    }
  }

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

  async function compileFirmwarePayload(body) {
    firmwareBusy = true;
    syncFirmwareUi();
    try {
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
      setFeedback(
        payload?.protocolVersion
          ? `Firmware compiled (protocol v${payload.protocolVersion}). Click Flash ESP32 when ready.`
          : "Firmware compiled. Click Flash ESP32 when ready.",
        "success",
      );
      addActivity("Biometric firmware compiled on the server.");
      syncFirmwareUi();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to compile firmware.", "error");
    } finally {
      firmwareBusy = false;
      syncFirmwareUi();
    }
  }

  async function compileFirmwareFromRepo() {
    await compileFirmwarePayload({ source: "repo" });
  }

  async function handleFirmwareSketchUpload(event) {
    const input = event?.target instanceof HTMLInputElement ? event.target : refs.firmwareUpload;
    const file = input?.files?.[0];
    if (input) {
      input.value = "";
    }
    if (!file) {
      return;
    }
    if (!/\.ino$/i.test(file.name)) {
      setFeedback("Upload a .ino sketch file.", "error");
      return;
    }
    try {
      const sketch = await file.text();
      await compileFirmwarePayload({ source: "upload", sketch });
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to read the .ino file.", "error");
    }
  }

  function decodeBase64Firmware(base64Value) {
    const binary = window.atob(String(base64Value || ""));
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  }

  async function flashPendingFirmware() {
    if (!serialSupported()) {
      setFeedback("Web Serial requires Chrome or Edge on HTTPS or localhost.", "error");
      return;
    }
    if (!pendingFirmwareFlash?.files?.length) {
      setFeedback("Compile firmware first before flashing.", "error");
      return;
    }
    if (deviceBusy || firmwareBusy) {
      setFeedback("Wait for the current device action to finish.", "warning");
      return;
    }
    firmwareBusy = true;
    syncFirmwareUi();
    try {
      if (activePort) {
        setFeedback("Disconnecting the live controller before firmware flash…");
        await disconnectSerialPort({ quiet: true });
        await waitMs(900);
      }
      setFeedback("Select the ESP32 COM port. Hold BOOT if the board does not enter download mode.");
      const esptoolModule = await import("https://esm.sh/esptool-js@0.5.4");
      const Transport = esptoolModule.Transport || esptoolModule.default?.Transport;
      const ESPLoader = esptoolModule.ESPLoader || esptoolModule.default?.ESPLoader;
      if (!Transport || !ESPLoader) {
        throw new Error("Unable to load the browser flasher module.");
      }
      const port = await navigator.serial.requestPort();
      const transport = new Transport(port, true);
      const terminal = {
        clean: () => {},
        writeLine: (line) => addActivity(String(line || "").trim()),
        write: () => {},
      };
      const loader = new ESPLoader({ transport, baudrate: 921600, terminal });
      const chipName = await loader.main();
      addActivity(`Flasher connected to ${chipName || "ESP32"}.`);
      const fileArray = pendingFirmwareFlash.files.map((file) => ({
        data: decodeBase64Firmware(file.base64),
        address: Number(file.address) || 0,
      }));
      await loader.writeFlash({
        fileArray,
        flashMode: "dio",
        flashFreq: "80m",
        flashSize: "4MB",
        eraseAll: false,
        compress: true,
        reportProgress: (_fileIndex, written, total) => {
          if (!total) {
            return;
          }
          const percent = Math.min(100, Math.round((written / total) * 100));
          setFeedback(`Flashing firmware… ${percent}%`);
        },
      });
      await loader.after("hard_reset");
      await transport.disconnect();
      pendingFirmwareFlash = null;
      setFeedback("Firmware flashed. Wait a few seconds, then connect the controller again.", "success");
      addActivity("Biometric firmware flashed from Super Admin.");
      void refreshFirmwareToolingStatus();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to flash firmware.", "error");
      addActivity("Firmware flash failed.", "error");
    } finally {
      firmwareBusy = false;
      syncFirmwareUi();
      syncConnectionUi();
    }
  }

  async function handleUiAction(action) {