(function () {
  if (window.gmsSuperAdminBiometricSettingsLoaded) {
    return;
  }
  window.gmsSuperAdminBiometricSettingsLoaded = true;

  const superAdminSessionKey = "gms-super-admin-session";
  const buzzerSoundKeys = ["success", "welcome", "error"];
  const allowedBuzzerModes = new Set(["builtin", "custom", "silent"]);
  const maxBuzzerMelodiesPerSound = 24;
  const buzzerSoundLabels = {
    success: "Success",
    welcome: "Welcome",
    error: "Error",
  };
  const stylesheetUrl = "/admin_biometric_settings.css?v=biometric-fingerprint-icon-1";
  const buzzerUploadIconMarkup = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
      <path d="M12 3v12"/>
      <path d="m17 8-5-5-5 5"/>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    </svg>
  `;
  const lightingSceneKeys = ["sleep", "break", "normal", "settings", "enroll", "success", "error"];
  const lightingSceneLabels = {
    sleep: "Sleep mode",
    break: "Break time",
    normal: "Normal / connected",
    settings: "Settings panel",
    enroll: "Fingerprint enroll",
    success: "Success",
    error: "Error",
  };
  const lightingSceneDefaults = {
    sleep: "white",
    break: "blue",
    normal: "cyan",
    settings: "yellow",
    enroll: "blue",
    success: "green",
    error: "red",
  };
  const fingerprintLedColorOptionsMarkup = ["red", "blue", "purple", "green", "yellow", "cyan", "white"]
    .map((color) => `<option value="${color}">${color.charAt(0).toUpperCase()}${color.slice(1)}</option>`)
    .join("");
  const biometricSelectDropdowns = [];
  const biometricDropdownScrollBound = new WeakSet();
  let biometricDropdownDocumentScrollBound = false;
  const biometricSelectDropdownArrowMarkup = `
    <svg class="super-admin-ban-modal__reason-trigger-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="m6 9 6 6 6-6"></path>
    </svg>
  `;
  const defaultOledText = "RETINA SCAN";
  const defaultDeviceName = "Universal Retina Scan Controller";
  const connectionPowerOnIconMarkup = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" class="admin-biometric-connection__icon is-on">
      <path d="M12 2v10"/>
      <path d="M18.4 6.6a9 9 0 1 1-12.77.04"/>
    </svg>
  `;
  const connectionPowerOffIconMarkup = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" class="admin-biometric-connection__icon is-off">
      <path d="M18.36 6.64A9 9 0 0 1 20.77 15"/>
      <path d="M6.16 6.16a9 9 0 1 0 12.68 12.68"/>
      <path d="M12 2v4"/>
      <path d="m2 2 20 20"/>
    </svg>
  `;
  const fingerprintIconMarkup = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-fingerprint-pattern-icon lucide-fingerprint-pattern" aria-hidden="true" focusable="false">
      <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"/>
      <path d="M14 13.12c0 2.38 0 6.38-1 8.88"/>
      <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"/>
      <path d="M2 12a10 10 0 0 1 18-6"/>
      <path d="M2 16h.01"/>
      <path d="M21.8 16c.2-2 .131-5.354 0-6"/>
      <path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2"/>
      <path d="M8.65 22c.21-.66.45-1.32.57-2"/>
      <path d="M9 6.8a6 6 0 0 1 9 5.2v2"/>
    </svg>
  `;
  const registeredFingerprintsStorageKey = "gms-biometric-registered-prints";
  const enrollScanTotal = 2;
  const controllerBaudRate = 115200;
  const allowedBaudRates = new Set([controllerBaudRate]);
  const allowedFonts = new Set(["small", "medium", "bold", "mono", "large"]);
  const allowedDatetimeFonts = new Set(["clock-xl", "clock-large", "clock-medium", "clock-compact"]);
  const oledTextFontLabels = {
    small: "Small (default bitmap)",
    medium: "Medium Sans",
    bold: "Bold Sans",
    mono: "Monospace",
    large: "Large Bold Billboard",
  };
  const oledDatetimeFontLabels = {
    "clock-xl": "Extra large clock",
    "clock-large": "Large clock",
    "clock-medium": "Medium clock",
    "clock-compact": "Compact clock",
  };
  const oledTextFontOptionsMarkup = ["small", "medium", "bold", "mono", "large"]
    .map((key) => `<option value="${key}">${oledTextFontLabels[key]}</option>`)
    .join("");
  const oledDatetimeFontOptionsMarkup = ["clock-xl", "clock-large", "clock-medium", "clock-compact"]
    .map((key) => `<option value="${key}">${oledDatetimeFontLabels[key]}</option>`)
    .join("");
  const oledTimezoneOptions = [
    { value: "Asia/Manila", label: "Philippines — Manila" },
    { value: "Asia/Singapore", label: "Singapore" },
    { value: "Asia/Tokyo", label: "Japan — Tokyo" },
    { value: "Asia/Seoul", label: "Korea — Seoul" },
    { value: "Asia/Shanghai", label: "China — Shanghai" },
    { value: "Asia/Hong_Kong", label: "Hong Kong" },
    { value: "Asia/Kolkata", label: "India — Kolkata" },
    { value: "Asia/Dubai", label: "UAE — Dubai" },
    { value: "Europe/London", label: "United Kingdom — London" },
    { value: "Europe/Paris", label: "Europe — Paris" },
    { value: "America/New_York", label: "US — Eastern (New York)" },
    { value: "America/Chicago", label: "US — Central (Chicago)" },
    { value: "America/Denver", label: "US — Mountain (Denver)" },
    { value: "America/Los_Angeles", label: "US — Pacific (Los Angeles)" },
    { value: "Australia/Sydney", label: "Australia — Sydney" },
    { value: "Pacific/Auckland", label: "New Zealand — Auckland" },
    { value: "UTC", label: "UTC" },
  ];
  const allowedOledTimezones = new Set(oledTimezoneOptions.map((entry) => entry.value));
  const oledTimezoneOptionsMarkup = oledTimezoneOptions
    .map((entry) => `<option value="${entry.value}">${entry.label}</option>`)
    .join("");
  const allowedOledModes = new Set(["text", "eyes", "datetime"]);
  const allowedEyeExpressions = new Set([
    "neutral",
    "happy",
    "excited",
    "thinking",
    "scanning",
    "success",
    "error",
    "sleepy",
    "surprised",
    "settings",
  ]);
  const allowedPresets = new Set(["success", "welcome", "warning", "error", "custom", "silent"]);
  const allowedFingerprintLedColors = new Set([
    "red",
    "blue",
    "purple",
    "green",
    "yellow",
    "cyan",
    "white",
  ]);
  const fingerprintLedColorProfiles = Object.freeze({
    red: { index: 1, hex: "#f43f5e", rgb: [244, 63, 94] },
    blue: { index: 2, hex: "#2188ff", rgb: [33, 136, 255] },
    purple: { index: 3, hex: "#9b5cff", rgb: [155, 92, 255] },
    green: { index: 4, hex: "#22c55e", rgb: [34, 197, 94] },
    yellow: { index: 5, hex: "#facc15", rgb: [250, 204, 21] },
    cyan: { index: 6, hex: "#22d3ee", rgb: [34, 211, 238] },
    white: { index: 7, hex: "#ffffff", rgb: [255, 255, 255] },
  });
  const fingerprintLedModeProfiles = Object.freeze({
    breathing: { index: 1, label: "Breathing" },
    flashing: { index: 2, label: "Flashing" },
    on: { index: 3, label: "Always on" },
    off: { index: 4, label: "Always off" },
    "gradual-on": { index: 5, label: "Gradual on" },
    "gradual-off": { index: 6, label: "Gradual off" },
  });
  const allowedFingerprintLedModes = new Set(Object.keys(fingerprintLedModeProfiles));
  const textEncoder = new TextEncoder();

  let root = null;
  let refs = null;
  let settings = createDefaultSettings();
  let authorizedPorts = [];
  let selectedPort = null;
  let activePort = null;
  let serialConnectionPromise = null;
  let serialWriteChain = Promise.resolve();
  let serialReader = null;
  let serialReadLoop = null;
  let serialReadBuffer = "";
  let disconnecting = false;
  let deviceVerified = false;
  let connectedDeviceName = "";
  let deviceProtocolVersion = 0;
  let deviceCanReadConfig = false;
  let deviceCanProbeFingerprintLed = false;
  let deviceCanBlinkFingerprintLed = false;
  let deviceCanAuthorizeBuiltInAdmin = false;
  let deviceCanListFingerprintSlots = false;
  let deviceFingerprintCapacity = 127;
  let deviceFingerprintTemplates = 0;
  let deviceBusy = false;
  let deviceBusyToken = 0;
  let pendingDeviceResponse = null;
  let handshakeTimer = 0;
  let handshakeState = "idle";
  let handshakeAttempts = 0;
  let oledPreviewTimer = 0;
  let lightingPreviewTimer = 0;
  let lightingPreviewRestoreTimer = 0;
  let lightingPreviewGeneration = 0;
  let lightingStateSyncTimer = 0;
  let lightingStateKeepaliveTimer = 0;
  let lastSentLightingMode = "";
  let lightingSyncGeneration = 0;
  let loadSequence = 0;
  let activityLog = [];
  let builtInAdminSlotStatus = { 1: null, 2: null };
  let savedFingerprintSlots = [];
  let pendingFingerprintSlots = [];
  let enrollModal = null;
  let enrollModalOpen = false;
  let enrollModalMode = "enroll";
  let enrollSession = 0;
  let enrollStartGeneration = 0;
  let retinaSecurityActionLabel = "";
  let enrollProgress = 0;
  let enrollStep = 0;
  let enrollStagesSeen = new Set();
  let deleteModal = null;
  let lastAlreadyRegisteredStep = 0;
  let settingsPanelOpen = false;
  let settingsPanelCloseTimer = 0;
  const settingsPanelAnimationMs = 380;
  let pendingFirmwareFlash = null;
  let firmwareToolingStatus = null;
  let firmwareBusy = false;
  let firmwareStatusPollTimer = 0;
  const firmwareStatusPollMs = 2500;
  let firmwareUploadSnackbarElements = null;
  let firmwareUploadSnackbarHideTimer = 0;
  let firmwareUploadSnackbarCountdownFrame = 0;
  let firmwareUpdatedModalElements = null;
  let firmwareUpdatedModalHideTimer = 0;
  let firmwareUpdatedAnimation = null;
  let firmwareUpdatedLottieLoadPromise = null;
  const firmwareUpdatedLottiePlayerUrl = "/vendor/lottie.min.js";
  const firmwareUpdatedAnimationPath = "/animations/employee-account-check.json";
  const firmwareUpdatedAnimationMs = 1500;
  const firmwareUpdatedHoldMs = 500;
  let firmwareLedCycleTimer = 0;
  let firmwareLedCycleStop = false;
  let firmwareLedMode = "";
  const firmwareFlashLedColors = ["red", "green", "yellow", "blue", "purple", "cyan", "white"];
  const firmwareFlashedHashKey = "gms-biometric-flashed-sketch-hash";
  const firmwareFlashedProtocolKey = "gms-biometric-flashed-protocol-version";
  let committedSettingsKey = "";
  let settingsDirty = false;
  let settingsDirtyRecheckTimer = 0;
  let syncConnectionUiTimer = 0;

  function buildSettingsCommitKey(sourceSettings = null) {
    const snapshot = sourceSettings
      ? normalizeSettings(sourceSettings)
      : normalizeSettings(collectSettings());
    const pendingSlots = [...pendingFingerprintSlots]
      .map((slot) => Number(slot) || 0)
      .filter((slot) => slot > 0)
      .sort((left, right) => left - right);
    return JSON.stringify({ settings: snapshot, pendingSlots });
  }

  function markSettingsCommitted(sourceSettings = null) {
    window.clearTimeout(settingsDirtyRecheckTimer);
    settingsDirtyRecheckTimer = 0;
    committedSettingsKey = buildSettingsCommitKey(sourceSettings || settings);
    settingsDirty = false;
    scheduleSyncConnectionUi();
  }

  function hasUnsavedSettingsChanges() {
    return Boolean(committedSettingsKey) && settingsDirty;
  }

  function notifySettingsEdited() {
    settings = collectSettings();
    settingsDirty = true;
    scheduleSyncConnectionUi();
    window.clearTimeout(settingsDirtyRecheckTimer);
    // Recheck later so reverting edits can disable Apply again without locking the UI.
    settingsDirtyRecheckTimer = window.setTimeout(() => {
      settingsDirtyRecheckTimer = 0;
      if (!committedSettingsKey) {
        settingsDirty = false;
        scheduleSyncConnectionUi();
        return;
      }
      try {
        settingsDirty = buildSettingsCommitKey() !== committedSettingsKey;
      } catch (error) {
        settingsDirty = true;
      }
      scheduleSyncConnectionUi();
    }, 250);
  }

  function scheduleSyncConnectionUi() {
    if (syncConnectionUiTimer) {
      return;
    }
    syncConnectionUiTimer = window.setTimeout(() => {
      syncConnectionUiTimer = 0;
      syncConnectionUi();
    }, 0);
  }

  function detectLocalTimezone() {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Manila";
    } catch (error) {
      return "Asia/Manila";
    }
  }

  function getTimezoneOffsetMinutes(timeZone, date = new Date()) {
    const zone = allowedOledTimezones.has(String(timeZone || "").trim())
      ? String(timeZone).trim()
      : detectLocalTimezone();
    try {
      const utcDate = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
      const zoneDate = new Date(date.toLocaleString("en-US", { timeZone: zone }));
      return Math.round((zoneDate.getTime() - utcDate.getTime()) / 60000);
    } catch (error) {
      return -date.getTimezoneOffset();
    }
  }

  function createDefaultDatetimeSettings() {
    return {
      use24HourFormat: false,
      timezoneAuto: true,
      timezone: detectLocalTimezone(),
    };
  }

  function normalizeDatetimeSettings(input, previous = createDefaultDatetimeSettings()) {
    const source = input && typeof input === "object" ? input : {};
    const timezone = String(source.timezone ?? previous.timezone ?? detectLocalTimezone()).trim();
    return {
      use24HourFormat: typeof source.use24HourFormat === "boolean"
        ? source.use24HourFormat
        : Boolean(previous.use24HourFormat),
      timezoneAuto: typeof source.timezoneAuto === "boolean"
        ? source.timezoneAuto
        : previous.timezoneAuto !== false,
      timezone: allowedOledTimezones.has(timezone) ? timezone : detectLocalTimezone(),
    };
  }

  function createDefaultOledFontProfile(preset = "medium") {
    return { preset, profileName: "" };
  }

  function createDefaultOledFontsSettings() {
    return {
      text: createDefaultOledFontProfile("medium"),
      datetime: createDefaultOledFontProfile("clock-xl"),
    };
  }

  function normalizeOledFontProfile(input, allowedPresets, fallbackPreset, previous = createDefaultOledFontProfile(fallbackPreset)) {
    const preset = String(input?.preset ?? previous?.preset ?? fallbackPreset).trim().toLowerCase();
    return {
      preset: allowedPresets.has(preset) ? preset : fallbackPreset,
      profileName: String(input?.profileName ?? previous?.profileName ?? "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 80),
    };
  }

  function normalizeOledFontsSettings(input, previous = createDefaultOledFontsSettings(), legacyFont = "medium") {
    const previousFonts = previous?.text || previous?.datetime
      ? previous
      : createDefaultOledFontsSettings();
    const inputFonts = input && typeof input === "object" ? input : {};
    const legacyTextPreset = allowedFonts.has(String(legacyFont).trim().toLowerCase())
      ? String(legacyFont).trim().toLowerCase()
      : "medium";
    return {
      text: normalizeOledFontProfile(
        inputFonts.text ?? previousFonts.text,
        allowedFonts,
        legacyTextPreset,
        { ...createDefaultOledFontProfile("medium"), ...(previousFonts.text || {}) },
      ),
      datetime: normalizeOledFontProfile(
        inputFonts.datetime ?? previousFonts.datetime,
        allowedDatetimeFonts,
        "clock-xl",
        { ...createDefaultOledFontProfile("clock-xl"), ...(previousFonts.datetime || {}) },
      ),
    };
  }

  function createDefaultSettings() {
    return {
      enabled: true,
      deviceType: "auto",
      baudRate: controllerBaudRate,
      selectedDevice: { label: "", usbVendorId: null, usbProductId: null },
      fingerprint: { defaultSlot: 1 },
      buzzer: createDefaultBuzzerSettings(),
      lighting: createDefaultLightingSettings(),
      fingerprintLed: { color: "cyan", hex: "#22d3ee", mode: "breathing", speed: 200, cycles: 0 },
      oled: {
        mode: "eyes",
        font: "medium",
        fonts: createDefaultOledFontsSettings(),
        datetimeSettings: createDefaultDatetimeSettings(),
        text: defaultOledText,
        contrast: 180,
        eyes: { expression: "scanning", blinkInterval: 7000, animationSpeed: 5, eyeSize: 2, spacing: 10 },
      },
      pins: {
        oledSda: 8,
        oledScl: 9,
        fingerprintRx: 16,
        fingerprintTx: 17,
        buzzer: 10,
      },
    };
  }

  function createDefaultBuzzerPreset() {
    return { mode: "builtin", melodyName: "", notes: [], library: [], selectedMelodyId: "" };
  }

  function createBuzzerMelodyId() {
    return `melody-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function normalizeBuzzerMelodyLibraryEntry(input, fallback = null) {
    const source = input && typeof input === "object" ? input : fallback;
    if (!source) {
      return null;
    }
    const notes = normalizeMelodyNotes(source.notes);
    if (!notes.length) {
      return null;
    }
    const id = String(source.id ?? createBuzzerMelodyId())
      .replace(/\s+/g, "")
      .trim()
      .slice(0, 48) || createBuzzerMelodyId();
    return {
      id,
      melodyName: String(source.melodyName ?? "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 80),
      notes,
    };
  }

  function normalizeBuzzerMelodyLibrary(input, fallbackLibrary = [], activeNotes = [], activeName = "", activeId = "") {
    const seenIds = new Set();
    const library = [];
    const appendEntry = (entryInput, entryFallback = null) => {
      const normalized = normalizeBuzzerMelodyLibraryEntry(entryInput, entryFallback);
      if (!normalized || seenIds.has(normalized.id)) {
        return;
      }
      seenIds.add(normalized.id);
      library.push(normalized);
    };
    const sourceLists = [
      ...(Array.isArray(input) ? input : []),
      ...(Array.isArray(fallbackLibrary) ? fallbackLibrary : []),
    ];
    sourceLists.forEach((entry) => appendEntry(entry));
    const legacyNotes = normalizeMelodyNotes(activeNotes);
    if (legacyNotes.length) {
      const legacyId = String(activeId || "").trim() || createBuzzerMelodyId();
      const hasMatchingNotes = library.some((entry) =>
        entry.notes.length === legacyNotes.length
        && entry.notes.every((note, index) =>
          note.frequency === legacyNotes[index]?.frequency
          && note.duration === legacyNotes[index]?.duration,
        ),
      );
      if (!hasMatchingNotes) {
        appendEntry({
          id: legacyId,
          melodyName: activeName,
          notes: legacyNotes,
        });
      }
    }
    return library.slice(0, maxBuzzerMelodiesPerSound);
  }

  function resolveActiveBuzzerMelody(preset, library) {
    const selectedMelodyId = String(preset?.selectedMelodyId ?? "").trim();
    if (selectedMelodyId) {
      const selectedEntry = library.find((entry) => entry.id === selectedMelodyId);
      if (selectedEntry) {
        return selectedEntry;
      }
    }
    const legacyNotes = normalizeMelodyNotes(preset?.notes);
    if (legacyNotes.length) {
      const legacyMatch = library.find((entry) =>
        entry.notes.length === legacyNotes.length
        && entry.notes.every((note, index) =>
          note.frequency === legacyNotes[index]?.frequency
          && note.duration === legacyNotes[index]?.duration,
        ),
      );
      if (legacyMatch) {
        return legacyMatch;
      }
    }
    return library.length ? library[library.length - 1] : null;
  }

  function createDefaultBuzzerSettings() {
    return {
      presets: {
        success: createDefaultBuzzerPreset(),
        welcome: createDefaultBuzzerPreset(),
        error: createDefaultBuzzerPreset(),
      },
    };
  }

  function createDefaultLightingSettings() {
    return {
      scenes: Object.fromEntries(
        lightingSceneKeys.map((key) => [key, lightingSceneDefaults[key]]),
      ),
    };
  }

  function normalizeLightingSettings(value, fallback = createDefaultLightingSettings()) {
    const input = value && typeof value === "object" ? value : {};
    const inputScenes = input.scenes && typeof input.scenes === "object" ? input.scenes : {};
    const fallbackScenes = fallback?.scenes && typeof fallback.scenes === "object"
      ? fallback.scenes
      : createDefaultLightingSettings().scenes;
    return {
      scenes: Object.fromEntries(
        lightingSceneKeys.map((key) => {
          const color = String(inputScenes[key] ?? fallbackScenes[key] ?? lightingSceneDefaults[key])
            .trim()
            .toLowerCase();
          return [key, allowedFingerprintLedColors.has(color) ? color : lightingSceneDefaults[key]];
        }),
      ),
    };
  }

  function normalizeBuzzerPreset(input, fallback = createDefaultBuzzerPreset()) {
    let mode = String(input?.mode ?? fallback.mode ?? "builtin").trim().toLowerCase();
    const library = normalizeBuzzerMelodyLibrary(
      input?.library ?? fallback.library,
      fallback.library,
      input?.notes ?? fallback.notes,
      input?.melodyName ?? fallback.melodyName,
      input?.selectedMelodyId ?? fallback.selectedMelodyId,
    );
    if (!allowedBuzzerModes.has(mode)) {
      mode = "builtin";
    }
    let selectedMelodyId = String(input?.selectedMelodyId ?? fallback.selectedMelodyId ?? "").trim();
    let melodyName = "";
    let notes = [];
    if (mode === "custom") {
      const activeEntry = resolveActiveBuzzerMelody({ ...input, selectedMelodyId, notes: input?.notes }, library);
      if (activeEntry) {
        selectedMelodyId = activeEntry.id;
        melodyName = activeEntry.melodyName;
        notes = activeEntry.notes;
      } else {
        mode = "builtin";
        selectedMelodyId = "";
      }
    } else {
      selectedMelodyId = "";
    }
    return {
      mode,
      melodyName,
      notes,
      library,
      selectedMelodyId,
    };
  }

  function normalizeBuzzerSettings(input, previous = createDefaultBuzzerSettings()) {
    const previousPresets = previous?.presets && typeof previous.presets === "object"
      ? previous.presets
      : createDefaultBuzzerSettings().presets;
    const inputPresets = input?.presets && typeof input.presets === "object" ? input.presets : {};
    const legacyNotes = normalizeMelodyNotes(input?.notes ?? previous?.notes);
    const legacyPreset = String(input?.preset ?? previous?.preset ?? "success").trim().toLowerCase();
    const presets = {};
    for (const key of buzzerSoundKeys) {
      presets[key] = normalizeBuzzerPreset(
        inputPresets[key] ?? previousPresets[key],
        previousPresets[key] ?? createDefaultBuzzerPreset(),
      );
    }
    if (legacyNotes.length && (legacyPreset === "custom" || input?.melodyName || previous?.melodyName)) {
      presets.success = normalizeBuzzerPreset({
        mode: "custom",
        melodyName: String(input?.melodyName ?? previous?.melodyName ?? "Custom melody").trim(),
        notes: legacyNotes,
      });
    }
    return { presets };
  }

  function clampInteger(value, minimum, maximum, fallback) {
    const number = Number(value);
    return Number.isFinite(number)
      ? Math.min(maximum, Math.max(minimum, Math.trunc(number)))
      : fallback;
  }

  function waitMs(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, Math.max(0, Number(ms) || 0)));
  }

  function normalizeColorHex(value, fallback = "#2188ff") {
    const color = String(value ?? "").trim().toLowerCase();
    return /^#[0-9a-f]{6}$/.test(color) ? color : fallback;
  }

  function getFingerprintLedColorHex(colorName) {
    return fingerprintLedColorProfiles[colorName]?.hex || fingerprintLedColorProfiles.blue.hex;
  }

  function getFingerprintLedColorIndex(colorName) {
    return fingerprintLedColorProfiles[colorName]?.index || fingerprintLedColorProfiles.blue.index;
  }

  function getFingerprintLedModeProfile(modeName) {
    return fingerprintLedModeProfiles[modeName] || fingerprintLedModeProfiles.breathing;
  }

  function resolveFingerprintLedColor(value) {
    const directName = String(value ?? "").trim().toLowerCase();
    if (allowedFingerprintLedColors.has(directName)) {
      return directName;
    }
    const hex = normalizeColorHex(value);
    const selectedRgb = [
      Number.parseInt(hex.slice(1, 3), 16),
      Number.parseInt(hex.slice(3, 5), 16),
      Number.parseInt(hex.slice(5, 7), 16),
    ];
    return Object.entries(fingerprintLedColorProfiles).reduce(
      (closest, [name, profile]) => {
        const distance = profile.rgb.reduce(
          (total, channel, index) => total + (channel - selectedRgb[index]) ** 2,
          0,
        );
        return distance < closest.distance ? { name, distance } : closest;
      },
      { name: "blue", distance: Number.POSITIVE_INFINITY },
    ).name;
  }

  const workspacePaletteLightingScenes = ["normal", "settings"];

  function shouldPreviewWorkspaceColorOnRetina(source) {
    const normalized = String(source || "").trim().toLowerCase();
    return [
      "super-admin-picker",
      "super-admin",
      "local",
      "picker",
    ].includes(normalized);
  }

  function applyWorkspaceColorToRetinaScan(color, options = {}) {
    const ledColor = resolveFingerprintLedColor(color);
    const ledHex = getFingerprintLedColorHex(ledColor);
    let didChange = false;

    if (!settings.lighting || typeof settings.lighting !== "object") {
      settings.lighting = createDefaultLightingSettings();
    }
    if (!settings.lighting.scenes || typeof settings.lighting.scenes !== "object") {
      settings.lighting.scenes = { ...lightingSceneDefaults };
    }

    for (const key of workspacePaletteLightingScenes) {
      if (settings.lighting.scenes[key] !== ledColor) {
        settings.lighting.scenes[key] = ledColor;
        didChange = true;
      }
      const select = refs?.lightingScenes?.[key];
      if (select instanceof HTMLSelectElement && select.value !== ledColor) {
        select.value = ledColor;
        didChange = true;
      }
      const entry = biometricSelectDropdowns.find((item) => item.select === select);
      if (entry) {
        syncBiometricSelectDropdown(entry);
      }
    }

    if (!settings.fingerprintLed || typeof settings.fingerprintLed !== "object") {
      settings.fingerprintLed = {
        color: ledColor,
        hex: ledHex,
        mode: "breathing",
        speed: 200,
        cycles: 0,
      };
      didChange = true;
    } else if (
      settings.fingerprintLed.color !== ledColor
      || normalizeColorHex(settings.fingerprintLed.hex, ledHex) !== ledHex
    ) {
      settings.fingerprintLed.color = ledColor;
      settings.fingerprintLed.hex = ledHex;
      didChange = true;
    }

    const shouldPersist = options.persist === true;
    if (didChange && !shouldPersist) {
      notifySettingsEdited();
    }

    const previewScene = settingsPanelOpen ? "settings" : "normal";
    const canTalkToDevice = Boolean(activePort && deviceVerified);
    const shouldPreview = options.preview !== false
      && shouldPreviewWorkspaceColorOnRetina(options.source)
      && canTalkToDevice
      && !shouldPersist;

    if (shouldPreview) {
      scheduleLiveLightingPreview(previewScene);
      setFeedback(
        `Retina scan lighting matched workspace color · ${ledColor}.`,
        "success",
      );
    }

    if (!shouldPersist) {
      return Promise.resolve(ledColor);
    }

    return (async () => {
      if (!canTalkToDevice) {
        if (didChange) {
          notifySettingsEdited();
        }
        setFeedback(
          `Workspace color updated · ${ledColor}. Connect the retina scan controller to sync scanner lighting.`,
          "warning",
        );
        return ledColor;
      }

      if (deviceBusy || firmwareBusy) {
        if (didChange) {
          notifySettingsEdited();
        }
        setFeedback("Wait for the current device action to finish, then try the color again.", "warning");
        return ledColor;
      }

      deviceBusy = true;
      window.clearTimeout(lightingPreviewTimer);
      window.clearTimeout(lightingPreviewRestoreTimer);
      lightingPreviewTimer = 0;
      lightingPreviewRestoreTimer = 0;
      lightingPreviewGeneration += 1;
      syncConnectionUi();
      setFeedback(`Saving retina scan lighting · ${ledColor}...`);

      try {
        for (const key of workspacePaletteLightingScenes) {
          const sceneColor = settings.lighting.scenes[key] || ledColor;
          await sendSerialCommandAndWait(`LED_COLOR|${key}|${sceneColor}`, "led-color-updated");
        }
        await sendSerialCommandAndWait("CONFIG_SAVE", "config-saved");
        const savedToServer = await saveSettings({ keepFeedback: true });
        markSettingsCommitted(settings);
        syncDeviceLightingToUiState({ sticky: true });
        if (!savedToServer) {
          setFeedback(
            `Retina scan lighting saved on device · ${ledColor}, but the settings copy failed.`,
            "warning",
          );
          addActivity(`Workspace palette lighting saved on device (${ledColor}), server copy failed.`, "warning");
          return ledColor;
        }
        setFeedback(`Retina scan lighting updated · ${ledColor}.`, "success");
        addActivity(`Workspace palette lighting saved to controller (${ledColor}).`, "success");
        showDeviceSnackbar("Workspace color", `Scanner lighting updated to ${ledColor}.`, "success");
      } catch (error) {
        if (didChange) {
          notifySettingsEdited();
        }
        setFeedback(
          error instanceof Error ? error.message : "Unable to save retina scan lighting for the workspace color.",
          "error",
        );
        addActivity("Unable to save workspace palette lighting to the controller.", "error");
      } finally {
        deviceBusy = false;
        syncConnectionUi();
      }

      return ledColor;
    })();
  }

  function normalizeOptionalUsbId(value) {
    if (value === null || value === undefined || value === "") {
      return null;
    }
    const number = Number(value);
    return Number.isInteger(number) && number >= 0 && number <= 65535 ? number : null;
  }

  function normalizeSettings(value) {
    const fallback = createDefaultSettings();
    const input = value && typeof value === "object" ? value : {};
    const selectedDevice = input.selectedDevice && typeof input.selectedDevice === "object"
      ? input.selectedDevice
      : {};
    const fingerprint = input.fingerprint && typeof input.fingerprint === "object"
      ? input.fingerprint
      : {};
    const buzzer = input.buzzer && typeof input.buzzer === "object" ? input.buzzer : {};
    const fingerprintLed = input.fingerprintLed && typeof input.fingerprintLed === "object"
      ? input.fingerprintLed
      : {};
    const oled = input.oled && typeof input.oled === "object" ? input.oled : {};
    const oledEyes = oled.eyes && typeof oled.eyes === "object" ? oled.eyes : {};
    const baudRate = Number(input.baudRate);
    const fingerprintLedColor = String(fingerprintLed.color ?? "cyan").trim().toLowerCase();
    const normalizedFingerprintLedColor = allowedFingerprintLedColors.has(fingerprintLedColor)
      ? fingerprintLedColor
      : "cyan";
    const fingerprintLedHex = normalizeColorHex(
      fingerprintLed.hex,
      getFingerprintLedColorHex(normalizedFingerprintLedColor),
    );
    const fingerprintLedMode = String(fingerprintLed.mode ?? "breathing").trim().toLowerCase();
    const font = String(oled.font ?? "medium").trim().toLowerCase();
    const oledMode = String(oled.mode ?? "eyes").trim().toLowerCase();
    const fontsInput = oled.fonts && typeof oled.fonts === "object"
      ? oled.fonts
      : {
          text: { preset: font, profileName: "" },
          datetime: {
            preset: String(oled.datetimeFont ?? fallback.oled.fonts?.datetime?.preset ?? "clock-xl")
              .trim()
              .toLowerCase(),
            profileName: "",
          },
        };
    const oledFonts = normalizeOledFontsSettings(fontsInput, fallback.oled.fonts, font);
    const datetimeInput = oled.datetimeSettings && typeof oled.datetimeSettings === "object"
      ? oled.datetimeSettings
      : {};
    const datetimeSettings = normalizeDatetimeSettings(
      {
        use24HourFormat: typeof datetimeInput.use24HourFormat === "boolean"
          ? datetimeInput.use24HourFormat
          : datetimeInput.timeFormat === "24h",
        timezoneAuto: datetimeInput.timezoneAuto,
        timezone: datetimeInput.timezone ?? datetimeInput.timeZone,
      },
      fallback.oled.datetimeSettings,
    );
    const eyeExpression = String(oledEyes.expression ?? "scanning").trim().toLowerCase();
    return {
      ...fallback,
      enabled: true,
      deviceType: "auto",
      baudRate: allowedBaudRates.has(baudRate) ? baudRate : fallback.baudRate,
      selectedDevice: {
        label: String(selectedDevice.label ?? "").replace(/\s+/g, " ").trim().slice(0, 100),
        usbVendorId: normalizeOptionalUsbId(selectedDevice.usbVendorId),
        usbProductId: normalizeOptionalUsbId(selectedDevice.usbProductId),
      },
      fingerprint: {
        defaultSlot: clampInteger(fingerprint.defaultSlot, 1, 255, 1),
      },
      buzzer: normalizeBuzzerSettings(buzzer, fallback.buzzer),
      lighting: normalizeLightingSettings(input.lighting, fallback.lighting),
      fingerprintLed: {
        color: resolveFingerprintLedColor(fingerprintLedHex),
        hex: fingerprintLedHex,
        mode: allowedFingerprintLedModes.has(fingerprintLedMode) ? fingerprintLedMode : "breathing",
        speed: clampInteger(fingerprintLed.speed, 1, 255, 200),
        cycles: clampInteger(fingerprintLed.cycles, 0, 255, 0),
      },
      oled: {
        mode: allowedOledModes.has(oledMode) ? oledMode : "eyes",
        font: oledFonts.text.preset,
        fonts: oledFonts,
        datetimeSettings,
        text: sanitizeOledText(oled.text),
        contrast: 180,
        eyes: {
          expression: "scanning",
          blinkInterval: 7000,
          animationSpeed: 5,
          eyeSize: clampInteger(oledEyes.eyeSize, 1, 3, 2),
          spacing: 10,
        },
      },
      pins: fallback.pins,
    };
  }

  function normalizeMelodyNotes(value) {
    if (!Array.isArray(value)) {
      return [];
    }
    return value.slice(0, 16).map((note) => ({
      frequency: clampInteger(note?.frequency, 0, 8000, 0),
      duration: clampInteger(note?.duration, 20, 3000, 180),
    }));
  }

  function displayDeviceName(name) {
    return String(name || defaultDeviceName).replace(/^GMS\s+/i, "").trim() || defaultDeviceName;
  }

  function sanitizeOledText(value) {
    const text = String(value ?? defaultOledText)
      .replace(/[|\r\n]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 32);
    if (!text || /^GMS(\s+(BIOMETRICS|RETINA SCAN))?$/i.test(text) || /^GMS RETINA SCAN$/i.test(text)) {
      return defaultOledText;
    }
    return text;
  }

  function ensureStyles() {
    if (
      document.querySelector("link[data-admin-biometric-settings-styles]")
      || document.querySelector("link[href*='/admin_biometric_settings.css']")
      || Array.from(document.styleSheets || []).some((sheet) =>
        String(sheet.href || "").includes("/admin_biometric_settings.css"),
      )
    ) {
      return;
    }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = stylesheetUrl;
    link.dataset.adminBiometricSettingsStyles = "true";
    document.head.appendChild(link);
  }

  function readSuperAdminSession() {
    try {
      const raw = window.sessionStorage.getItem(superAdminSessionKey);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function getSuperAdminHeaders(extra = {}) {
    const session = readSuperAdminSession() || {};
    const token = String(session.token ?? "").trim();
    return {
      ...extra,
      ...(token ? { "X-GMS-Super-Admin-Token": token } : {}),
    };
  }

  function serialSupported() {
    return Boolean(window.isSecureContext && navigator.serial);
  }

  function render() {
    root = document.querySelector("[data-super-admin-biometric-settings-root]");
    if (!(root instanceof HTMLElement)) {
      refs = null;
      return false;
    }
    if (root.dataset.biometricReady === "true") {
      return true;
    }

    root.dataset.biometricReady = "true";
    root.innerHTML = `
      <div class="admin-biometric-settings">
        <header class="admin-biometric-hero">
          <span class="admin-biometric-hero__icon" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-fingerprint-pattern-icon lucide-fingerprint-pattern" aria-hidden="true" focusable="false">
              <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"/>
              <path d="M14 13.12c0 2.38 0 6.38-1 8.88"/>
              <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"/>
              <path d="M2 12a10 10 0 0 1 18-6"/>
              <path d="M2 16h.01"/>
              <path d="M21.8 16c.2-2 .131-5.354 0-6"/>
              <path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2"/>
              <path d="M8.65 22c.21-.66.45-1.32.57-2"/>
              <path d="M9 6.8a6 6 0 0 1 9 5.2v2"/>
            </svg>
          </span>
          <span class="admin-biometric-hero__copy">
            <strong>Retina Scan Device Controller</strong>
            <small>One controller only. The page detects the USB serial device automatically.</small>
          </span>
          <span class="admin-biometric-hero__status">
            <button type="button" class="admin-biometric-connection is-offline" data-biometric-connection-status data-biometric-action="toggle-connection" title="Connect">
              ${connectionPowerOnIconMarkup}${connectionPowerOffIconMarkup}<span>connect: ${defaultDeviceName}</span>
            </button>
            <button type="button" class="admin-biometric-button is-secondary" data-biometric-action="fetch-device-settings" hidden>Fetch from device</button>
            <button type="button" class="admin-biometric-wrench" data-biometric-action="toggle-settings" aria-expanded="false" aria-controls="admin-biometric-settings-panel" title="Show settings" hidden>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z"/>
              </svg>
            </button>
          </span>
        </header>

        <div class="admin-biometric-settings__panel" id="admin-biometric-settings-panel" data-biometric-settings-panel hidden aria-hidden="true">
        <div class="admin-biometric-settings__panel-inner">

        <p class="admin-biometric-firmware-lock-note" data-biometric-firmware-lock-note hidden>
          Flash or Install the latest firmware first. Enroll, buzzer, lighting, and OLED stay locked until the controller is up to date.
        </p>

        <section class="admin-biometric-card admin-biometric-card--firmware" aria-labelledby="admin-biometric-firmware-title">
          <div class="admin-biometric-card__heading">
            <span><strong id="admin-biometric-firmware-title">Firmware update</strong><small>Edit the project .ino in any editor, then flash from Chrome — no Arduino IDE needed to upload.</small></span>
          </div>
          <div class="admin-biometric-firmware-controls">
            <p class="admin-biometric-firmware-status" data-biometric-firmware-status>Checking compile tools…</p>
            <div class="admin-biometric-firmware-actions">
              <button type="button" class="admin-biometric-button is-primary" data-biometric-action="flash-firmware" disabled>Flash ESP32</button>
              <button type="button" class="admin-biometric-button is-secondary" data-biometric-action="install-firmware" disabled title="Use for a blank ESP32 or a board that does not match Super Admin">Install firmware</button>
            </div>
            <p class="admin-biometric-file-name" data-biometric-firmware-build-name>Connect the controller to compare firmware status.</p>
            <p class="admin-biometric-limit-note"><strong>Install firmware</strong> works on blank or incompatible boards (no handshake required). <strong>Flash ESP32</strong> updates a detected GMS controller. Needs <code>arduino-cli</code> installed once. Hold BOOT if download mode does not start.</p>
          </div>
        </section>

        <section class="admin-biometric-card" aria-labelledby="admin-biometric-fingerprint-title">
          <div class="admin-biometric-card__heading">
            <span><strong id="admin-biometric-fingerprint-title">Retina scanner</strong><small>Registered fingerprints · Save to keep</small></span>
            <button type="button" class="admin-biometric-button is-secondary" data-biometric-device-action="FP_VERIFY">Verify scan</button>
          </div>
          <div class="admin-biometric-print-carousel">
            <button type="button" class="admin-biometric-print-carousel__button is-start" data-biometric-print-carousel="-1" aria-label="Previous fingerprints" title="Previous" hidden>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>
            </button>
            <div class="admin-biometric-print-grid" data-biometric-print-grid></div>
            <button type="button" class="admin-biometric-print-carousel__button is-end" data-biometric-print-carousel="1" aria-label="Next fingerprints" title="Next" hidden>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"></path></svg>
            </button>
          </div>
        </section>

        <div class="admin-biometric-customization-grid">
          <section class="admin-biometric-card admin-biometric-card--buzzer" aria-labelledby="admin-biometric-buzzer-title">
            <div class="admin-biometric-card__heading">
              <span><strong id="admin-biometric-buzzer-title">Buzzer sounds</strong><small>Upload melodies anytime, then pick which sound each event uses.</small></span>
            </div>
            <div class="admin-biometric-buzzer-presets">
              ${["success", "welcome", "error"].map((key) => `
              <article class="admin-biometric-buzzer-preset" data-buzzer-preset="${key}">
                <h4 class="admin-biometric-buzzer-preset__title">${key === "success" ? "Success sound" : key === "welcome" ? "Welcome sound" : "Error sound"}</h4>
                <p class="admin-biometric-buzzer-format">Accepted formats: .json, .txt</p>
                <div class="admin-biometric-buzzer-controls">
                  <label class="admin-biometric-upload admin-biometric-upload--compact">
                    <input type="file" accept=".json,.txt,application/json,text/plain" data-biometric-buzzer-upload="${key}" />
                    <span class="admin-biometric-upload__content">${buzzerUploadIconMarkup}<span>Upload</span></span>
                  </label>
                  <label class="admin-biometric-field admin-biometric-buzzer-sound">
                    <select data-biometric-buzzer-mode="${key}">
                      <option value="builtin">Default ${key} tone</option>
                <option value="silent">Silent</option>
              </select>
            </label>
            </div>
                <p class="admin-biometric-file-name" data-biometric-buzzer-name="${key}">No melodies uploaded.</p>
                <button type="button" class="admin-biometric-button is-secondary" data-biometric-action="test-buzzer-${key}">Test ${key}</button>
              </article>`).join("")}
            </div>
            <p class="admin-biometric-limit-note">Pin 10 tone melodies only; MP3/WAV needs a DFPlayer Mini.</p>
          </section>

          <section class="admin-biometric-card admin-biometric-card--lighting" aria-labelledby="admin-biometric-lighting-title">
            <div class="admin-biometric-card__heading">
              <span><strong id="admin-biometric-lighting-title">Scanner lighting colors</strong><small>Changes preview live on the scanner. Apply & save to keep after restart.</small></span>
            </div>
            <div class="admin-biometric-lighting-scenes">
              ${lightingSceneKeys.map((key) => `
              <label class="admin-biometric-field admin-biometric-lighting-scene">
                <span>${lightingSceneLabels[key]}</span>
                <select data-biometric-lighting-scene="${key}">
                  ${fingerprintLedColorOptionsMarkup}
              </select>
              </label>`).join("")}
            </div>
            <p class="admin-biometric-limit-note">Colors: red, blue, purple, green, yellow, cyan, white.</p>
          </section>

          <section class="admin-biometric-card admin-biometric-card--oled" aria-labelledby="admin-biometric-oled-title">
            <div class="admin-biometric-card__heading">
              <span><strong id="admin-biometric-oled-title">OLED display</strong><small>Robot face monitor · sleeps when disconnected, and 7:00 PM–9:00 AM when settings are closed</small></span>
            </div>
            <div class="admin-biometric-oled-controls">
              <label class="admin-biometric-field"><span>Display mode</span><select data-biometric-oled-mode><option value="eyes">Robot eyes</option><option value="datetime">Date and time</option><option value="text">Text display</option></select></label>
              <div class="admin-biometric-oled-font-block" data-biometric-oled-text-control hidden>
                <h4 class="admin-biometric-oled-font-block__title">Text font</h4>
                <p class="admin-biometric-oled-font-block__note">Upload a preset JSON to switch the built-in OLED typeface. Example files: oled-font-gms-bold.json / oled-font-gms-large.json</p>
                <div class="admin-biometric-oled-font-row">
                  <label class="admin-biometric-upload admin-biometric-upload--compact">
                    <input type="file" accept=".json,.txt,application/json,text/plain" data-biometric-oled-text-font-upload />
                    <span class="admin-biometric-upload__content">${buzzerUploadIconMarkup}<span>Upload</span></span>
                  </label>
                  <label class="admin-biometric-field admin-biometric-oled-font-select">
                    <select data-biometric-oled-text-font>${oledTextFontOptionsMarkup}</select>
                  </label>
                </div>
                <p class="admin-biometric-file-name" data-biometric-oled-text-font-name>No font profile uploaded.</p>
                <label class="admin-biometric-field"><span>Display text</span><input type="text" maxlength="32" data-biometric-oled-text /></label>
              </div>
              <div class="admin-biometric-oled-font-block" data-biometric-oled-datetime-control hidden>
                <h4 class="admin-biometric-oled-font-block__title">Clock font</h4>
                <p class="admin-biometric-oled-font-block__note">Upload a preset JSON to switch the built-in OLED typeface. Example files: oled-font-gms-bold.json / oled-font-gms-large.json</p>
                <div class="admin-biometric-oled-font-row">
                  <label class="admin-biometric-upload admin-biometric-upload--compact">
                    <input type="file" accept=".json,.txt,application/json,text/plain" data-biometric-oled-datetime-font-upload />
                    <span class="admin-biometric-upload__content">${buzzerUploadIconMarkup}<span>Upload</span></span>
                  </label>
                  <label class="admin-biometric-field admin-biometric-oled-font-select">
                    <select data-biometric-oled-datetime-font>${oledDatetimeFontOptionsMarkup}</select>
                  </label>
                </div>
                <p class="admin-biometric-file-name" data-biometric-oled-datetime-font-name>No font profile uploaded.</p>
                <div class="admin-biometric-oled-datetime-settings" data-biometric-oled-datetime-settings>
                  <label class="super-admin-settings-toggle admin-biometric-oled-toggle">
                    <span>Use 24-hour format</span>
                    <input type="checkbox" data-biometric-oled-24h />
                    <span class="super-admin-settings-switch" aria-hidden="true"></span>
                  </label>
                  <p class="admin-biometric-limit-note">Off uses local 12-hour time with AM/PM.</p>
                  <label class="super-admin-settings-toggle admin-biometric-oled-toggle">
                    <span>Set time zone automatically</span>
                    <input type="checkbox" data-biometric-oled-timezone-auto checked />
                    <span class="super-admin-settings-switch" aria-hidden="true"></span>
                  </label>
                  <p class="admin-biometric-limit-note" data-biometric-oled-timezone-auto-note>Uses this computer's time zone when connected.</p>
                  <label class="admin-biometric-field" data-biometric-oled-timezone-manual hidden>
                    <span>Time zone</span>
                    <select data-biometric-oled-timezone>${oledTimezoneOptionsMarkup}</select>
                  </label>
                </div>
                <p class="admin-biometric-limit-note">Big clock on top, current date underneath. Synced when connected.</p>
              </div>
              <label class="admin-biometric-field" data-biometric-oled-eyes-control><span>Eye size</span><select data-biometric-eye-size><option value="1">Small</option><option value="2" selected>Medium</option><option value="3">Large</option></select></label>
            </div>
          </section>
        </div>

        <section class="admin-biometric-console" aria-label="Device response log">
          <div><strong>Device activity</strong><button type="button" data-biometric-action="clear-log">Clear</button></div>
          <pre data-biometric-log>No device activity yet.</pre>
        </section>

        <p class="admin-biometric-feedback" role="status" aria-live="polite" data-biometric-feedback></p>
        <footer class="admin-biometric-footer">
          <button type="button" class="admin-biometric-button is-primary" data-biometric-action="send-settings">Apply &amp; save to device</button>
        </footer>
        </div>
        </div>
      </div>`;

    refs = {
      connectionStatus: root.querySelector("[data-biometric-connection-status]"),
      buzzerModes: Object.fromEntries(
        buzzerSoundKeys.map((key) => [key, root.querySelector(`[data-biometric-buzzer-mode="${key}"]`)]),
      ),
      buzzerUploads: Object.fromEntries(
        buzzerSoundKeys.map((key) => [key, root.querySelector(`[data-biometric-buzzer-upload="${key}"]`)]),
      ),
      buzzerNames: Object.fromEntries(
        buzzerSoundKeys.map((key) => [key, root.querySelector(`[data-biometric-buzzer-name="${key}"]`)]),
      ),
      lightingScenes: Object.fromEntries(
        lightingSceneKeys.map((key) => [key, root.querySelector(`[data-biometric-lighting-scene="${key}"]`)]),
      ),
      oledMode: root.querySelector("[data-biometric-oled-mode]"),
      oledTextFont: root.querySelector("[data-biometric-oled-text-font]"),
      oledDatetimeFont: root.querySelector("[data-biometric-oled-datetime-font]"),
      oledTextFontUpload: root.querySelector("[data-biometric-oled-text-font-upload]"),
      oledDatetimeFontUpload: root.querySelector("[data-biometric-oled-datetime-font-upload]"),
      oledTextFontName: root.querySelector("[data-biometric-oled-text-font-name]"),
      oledDatetimeFontName: root.querySelector("[data-biometric-oled-datetime-font-name]"),
      oledUse24Hour: root.querySelector("[data-biometric-oled-24h]"),
      oledTimezoneAuto: root.querySelector("[data-biometric-oled-timezone-auto]"),
      oledTimezone: root.querySelector("[data-biometric-oled-timezone]"),
      oledTimezoneManualControls: Array.from(root.querySelectorAll("[data-biometric-oled-timezone-manual]")),
      oledTimezoneAutoNote: root.querySelector("[data-biometric-oled-timezone-auto-note]"),
      oledText: root.querySelector("[data-biometric-oled-text]"),
      oledTextControls: Array.from(root.querySelectorAll("[data-biometric-oled-text-control]")),
      oledDatetimeControls: Array.from(root.querySelectorAll("[data-biometric-oled-datetime-control]")),
      oledEyesControls: Array.from(root.querySelectorAll("[data-biometric-oled-eyes-control]")),
      eyeSize: root.querySelector("[data-biometric-eye-size]"),
      feedback: root.querySelector("[data-biometric-feedback]"),
      log: root.querySelector("[data-biometric-log]"),
      connectButton: root.querySelector("[data-biometric-action='toggle-connection']"),
      fetchDeviceButton: root.querySelector("[data-biometric-action='fetch-device-settings']"),
      sendButton: root.querySelector("[data-biometric-action='send-settings']"),
      settingsPanel: root.querySelector("[data-biometric-settings-panel]"),
      settingsToggle: root.querySelector("[data-biometric-action='toggle-settings']"),
      printGrid: root.querySelector("[data-biometric-print-grid]"),
      printCarouselPrev: root.querySelector("[data-biometric-print-carousel='-1']"),
      printCarouselNext: root.querySelector("[data-biometric-print-carousel='1']"),
      firmwareStatus: root.querySelector("[data-biometric-firmware-status]"),
      firmwareBuildName: root.querySelector("[data-biometric-firmware-build-name]"),
      firmwareFlashButton: root.querySelector("[data-biometric-action='flash-firmware']"),
      firmwareInstallButton: root.querySelector("[data-biometric-action='install-firmware']"),
      firmwareLockNote: root.querySelector("[data-biometric-firmware-lock-note]"),
    };
    enhanceBiometricSelectDropdowns();
    bindEvents();
    applySettingsToForm();
    syncSettingsPanel({ animate: false });
    syncConnectionUi();
    void refreshFirmwareToolingStatus();
    savedFingerprintSlots = loadRegisteredFingerprintSlotsFromStorage();
    renderSavedFingerprintGrid();
    return true;
  }

  function watchSelectValue(select, onValueSet) {
    if (!(select instanceof HTMLSelectElement)) {
      return;
    }
    const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
    if (!descriptor?.get || !descriptor?.set) {
      return;
    }
    Object.defineProperty(select, "value", {
      configurable: true,
      enumerable: true,
      get() {
        return descriptor.get.call(this);
      },
      set(nextValue) {
        descriptor.set.call(this, nextValue);
        onValueSet();
      },
    });
  }

  function syncBiometricSelectDropdown(entry) {
    if (!entry?.select) {
      return;
    }
    const value = String(entry.select.value || "");
    const selectedOption = entry.select.selectedOptions?.[0];
    const label = value && selectedOption
      ? String(selectedOption.textContent || value).trim()
      : "Select option";
    if (entry.label instanceof HTMLElement) {
      entry.label.textContent = label;
      entry.label.title = label;
    }
    entry.options.forEach((option) => {
      const isSelected = option.dataset.biometricSelectOption === value;
      option.classList.toggle("is-selected", isSelected);
      option.setAttribute("aria-checked", String(isSelected));
    });
  }

  function clearBiometricSelectMenuInlineStyles(menu) {
    if (!(menu instanceof HTMLElement)) {
      return;
    }
    menu.style.position = "";
    menu.style.top = "";
    menu.style.bottom = "";
    menu.style.left = "";
    menu.style.right = "";
    menu.style.width = "";
    menu.style.minWidth = "";
    menu.style.maxWidth = "";
    menu.style.maxHeight = "";
    menu.style.overflow = "";
    menu.style.visibility = "";
    menu.style.zIndex = "";
    menu.style.opacity = "";
    menu.style.pointerEvents = "";
    menu.style.transform = "";
    menu.style.animation = "";
    menu.classList.remove("is-trigger-anchored");
    menu.classList.remove("is-drop-animating");
    delete menu.dataset.openDirection;
  }

  function restoreBiometricSelectMenuHost(entry) {
    const menu = entry?.menu;
    const host = entry?.dropdown;
    if (!(menu instanceof HTMLElement)) {
      return;
    }
    if (host instanceof HTMLElement && host.isConnected && menu.parentElement !== host) {
      host.appendChild(menu);
    }
  }

  function positionBiometricSelectMenu(entry) {
    if (!(entry?.trigger instanceof HTMLElement) || !(entry?.menu instanceof HTMLElement)) {
      return;
    }
    const menu = entry.menu;
    const triggerRect = entry.trigger.getBoundingClientRect();
    const viewportPadding = 12;
    const gap = 8;
    const maxMenuWidth = Math.max(
      triggerRect.width,
      Math.min(window.innerWidth - viewportPadding * 2, 560),
    );

    if (menu.parentElement !== document.body) {
      document.body.appendChild(menu);
    }

    menu.classList.add("is-trigger-anchored");
    menu.classList.remove("is-drop-animating");
    menu.hidden = false;
    menu.style.position = "fixed";
    menu.style.left = `${Math.round(triggerRect.left)}px`;
    menu.style.top = `${Math.round(triggerRect.bottom + gap)}px`;
    menu.style.right = "auto";
    menu.style.bottom = "auto";
    menu.style.width = "max-content";
    menu.style.minWidth = `${Math.round(triggerRect.width)}px`;
    menu.style.maxWidth = `${Math.round(maxMenuWidth)}px`;
    menu.style.maxHeight = "min(280px, calc(100vh - 24px))";
    menu.style.overflowY = "auto";
    menu.style.overflowX = "hidden";
    menu.style.zIndex = "12050";
    menu.style.opacity = "0";
    menu.style.visibility = "hidden";
    menu.style.pointerEvents = "none";

    const menuRect = menu.getBoundingClientRect();
    const menuWidth = Math.max(Math.ceil(menuRect.width), Math.round(triggerRect.width));
    const menuHeight = Math.ceil(menuRect.height);

    let top = triggerRect.bottom + gap;
    let openUp = false;
    if (
      top + menuHeight > window.innerHeight - viewportPadding
      && triggerRect.top - gap - menuHeight >= viewportPadding
    ) {
      top = triggerRect.top - gap - menuHeight;
      openUp = true;
    } else if (top + menuHeight > window.innerHeight - viewportPadding) {
      top = Math.max(viewportPadding, window.innerHeight - viewportPadding - menuHeight);
    }

    let left = triggerRect.left;
    if (left + menuWidth > window.innerWidth - viewportPadding) {
      left = Math.max(viewportPadding, window.innerWidth - viewportPadding - menuWidth);
    }
    left = Math.max(viewportPadding, left);

    menu.style.left = `${Math.round(left)}px`;
    menu.style.top = `${Math.round(top)}px`;
    menu.style.width = `${menuWidth}px`;
    menu.dataset.openDirection = openUp ? "up" : "down";
    menu.style.visibility = "";
    menu.style.pointerEvents = "";

    // Start drop only after the menu is visible and placed.
    window.requestAnimationFrame(() => {
      if (!(menu.isConnected) || menu.hidden || entry.trigger?.getAttribute("aria-expanded") !== "true") {
        return;
      }
      menu.style.opacity = "";
      menu.classList.remove("is-drop-animating");
      void menu.offsetWidth;
      menu.classList.add("is-drop-animating");
    });
  }

  function setBiometricSelectDropdownOpen(targetEntry, isOpen) {
    biometricSelectDropdowns.forEach((entry) => {
      const shouldOpen = Boolean(isOpen && entry === targetEntry);
      entry.dropdown?.classList.toggle("is-open", shouldOpen);
      entry.trigger?.setAttribute("aria-expanded", String(shouldOpen));
      if (entry.menu instanceof HTMLElement) {
        if (shouldOpen) {
          positionBiometricSelectMenu(entry);
        } else {
          entry.menu.hidden = true;
          clearBiometricSelectMenuInlineStyles(entry.menu);
          restoreBiometricSelectMenuHost(entry);
        }
      }
    });
  }

  function closeBiometricSelectDropdowns() {
    setBiometricSelectDropdownOpen(null, false);
  }

  function isBiometricScrollContainer(element) {
    if (!(element instanceof Element)) {
      return false;
    }
    const style = window.getComputedStyle(element);
    const overflowY = style.overflowY;
    const allowsScroll = overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay";
    return allowsScroll && element.scrollHeight > element.clientHeight + 1;
  }

  function collectBiometricDropdownScrollContainers() {
    const containers = new Set();
    const mainPanel = document.querySelector(".super-admin-panel-container");
    if (mainPanel instanceof Element) {
      containers.add(mainPanel);
    }
    if (root instanceof Element) {
      let node = root.parentElement;
      while (node) {
        if (isBiometricScrollContainer(node)) {
          containers.add(node);
        }
        node = node.parentElement;
      }
    }
    return containers;
  }

  function shouldKeepBiometricDropdownOpenForScroll(event) {
    const target = event?.target;
    if (!(target instanceof Node)) {
      return false;
    }
    return biometricSelectDropdowns.some((entry) =>
      entry.menu instanceof HTMLElement &&
      entry.trigger?.getAttribute("aria-expanded") === "true" &&
      entry.menu.contains(target),
    );
  }

  function handleBiometricDropdownScrollClose(event) {
    if (shouldKeepBiometricDropdownOpenForScroll(event)) {
      return;
    }
    closeBiometricSelectDropdowns();
  }

  function bindBiometricDropdownScrollClose() {
    collectBiometricDropdownScrollContainers().forEach((container) => {
      if (biometricDropdownScrollBound.has(container)) {
        return;
      }
      biometricDropdownScrollBound.add(container);
      container.addEventListener("scroll", handleBiometricDropdownScrollClose, { passive: true });
      container.addEventListener("wheel", handleBiometricDropdownScrollClose, { passive: true });
    });
    if (!biometricDropdownDocumentScrollBound) {
      biometricDropdownDocumentScrollBound = true;
      document.addEventListener("scroll", handleBiometricDropdownScrollClose, { passive: true, capture: true });
      window.addEventListener("scroll", handleBiometricDropdownScrollClose, { passive: true, capture: true });
    }
  }

  function enhanceBiometricSelect(select) {
    if (!(select instanceof HTMLSelectElement) || select.dataset.biometricDropdownEnhanced === "true") {
      return null;
    }
    select.dataset.biometricDropdownEnhanced = "true";
    select.classList.add("super-admin-ban-modal__native-reason-select");
    select.tabIndex = -1;
    select.setAttribute("aria-hidden", "true");

    const dropdown = document.createElement("span");
    dropdown.className = "universal-dropdown super-admin-ban-modal__reason-select admin-biometric-dropdown";
    select.parentNode?.insertBefore(dropdown, select);
    dropdown.appendChild(select);

    const menuId = `admin-biometric-select-menu-${biometricSelectDropdowns.length + 1}`;
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "super-admin-ban-modal__reason-trigger";
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("aria-haspopup", "menu");
    trigger.setAttribute("aria-controls", menuId);

    const label = document.createElement("span");
    label.dataset.biometricSelectLabel = "";
    trigger.append(label);
    trigger.insertAdjacentHTML("beforeend", biometricSelectDropdownArrowMarkup);

    const menu = document.createElement("div");
    menu.id = menuId;
    menu.className = "universal-dropdown__panel super-admin-company-card__action-menu super-admin-ban-modal__reason-menu admin-biometric-dropdown__menu";
    menu.setAttribute("role", "menu");
    menu.hidden = true;

    const options = Array.from(select.options).map((option) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "super-admin-company-card__action-item super-admin-ban-modal__reason-option";
      button.setAttribute("role", "menuitemradio");
      button.setAttribute("aria-checked", "false");
      button.dataset.biometricSelectOption = option.value;
      button.textContent = String(option.textContent || option.value).trim();
      button.addEventListener("click", () => {
        select.value = option.value;
        select.dispatchEvent(new Event("change", { bubbles: true }));
        closeBiometricSelectDropdowns();
        trigger.focus();
      });
      menu.appendChild(button);
      return button;
    });

    dropdown.append(trigger, menu);

    const entry = { select, dropdown, trigger, label, menu, options };
    watchSelectValue(select, () => syncBiometricSelectDropdown(entry));
    syncBiometricSelectDropdown(entry);

    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (select.disabled || trigger.disabled) {
        return;
      }
      const isOpen = trigger.getAttribute("aria-expanded") === "true";
      setBiometricSelectDropdownOpen(entry, !isOpen);
    });

    return entry;
  }

  function refreshBiometricSelectOptions(select, optionDefinitions) {
    if (!(select instanceof HTMLSelectElement)) {
      return;
    }
    const entry = biometricSelectDropdowns.find((item) => item.select === select);
    const previousValue = String(select.value || "");
    select.innerHTML = "";
    if (entry?.menu instanceof HTMLElement) {
      entry.menu.innerHTML = "";
      entry.options = [];
    }
    optionDefinitions.forEach((definition) => {
      const value = String(definition?.value ?? "");
      const label = String(definition?.label ?? value).trim() || value;
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      if (definition?.disabled) {
        option.disabled = true;
      }
      select.appendChild(option);
      if (entry?.menu instanceof HTMLElement) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "super-admin-company-card__action-item super-admin-ban-modal__reason-option";
        button.setAttribute("role", "menuitemradio");
        button.setAttribute("aria-checked", "false");
        button.dataset.biometricSelectOption = value;
        button.textContent = label;
        button.disabled = Boolean(definition?.disabled);
        button.addEventListener("click", () => {
          if (button.disabled) {
            return;
          }
          select.value = value;
          select.dispatchEvent(new Event("change", { bubbles: true }));
          closeBiometricSelectDropdowns();
          entry.trigger?.focus();
        });
        entry.menu.appendChild(button);
        entry.options.push(button);
      }
    });
    const fallbackValue = optionDefinitions.find((definition) => !definition?.disabled)?.value || "builtin";
    select.value = optionDefinitions.some((definition) => definition?.value === previousValue)
      ? previousValue
      : fallbackValue;
    if (entry) {
      syncBiometricSelectDropdown(entry);
    }
  }

  function buildBuzzerModeOptions(presetKey) {
    const preset = settings.buzzer.presets[presetKey] ?? createDefaultBuzzerPreset();
    const library = Array.isArray(preset.library) ? preset.library : [];
    const options = [
      { value: "builtin", label: `Default ${presetKey} tone` },
      { value: "silent", label: "Silent" },
    ];
    library.forEach((entry) => {
      const label = melodyDisplayNameFromFileName(
        entry.melodyName,
        `${buzzerSoundLabels[presetKey]} melody`,
      );
      const noteCount = Array.isArray(entry.notes) ? entry.notes.length : 0;
      options.push({
        value: `custom:${entry.id}`,
        label: noteCount
          ? `${label} · ${noteCount} note${noteCount === 1 ? "" : "s"}`
          : label,
      });
    });
    return options;
  }

  function getBuzzerModeSelectValue(preset) {
    if (preset.mode === "silent") {
      return "silent";
    }
    if (preset.mode === "custom") {
      const melodyId = String(preset.selectedMelodyId || "").trim();
      if (melodyId) {
        return `custom:${melodyId}`;
      }
      const activeEntry = resolveActiveBuzzerMelody(preset, preset.library || []);
      if (activeEntry) {
        return `custom:${activeEntry.id}`;
      }
    }
    return "builtin";
  }

  function applyBuzzerModeSelection(presetKey, rawValue = "") {
    const value = String(rawValue || refs.buzzerModes?.[presetKey]?.value || "builtin").trim();
    const preset = settings.buzzer.presets[presetKey] ?? createDefaultBuzzerPreset();
    if (value === "silent") {
      preset.mode = "silent";
      preset.selectedMelodyId = "";
      preset.notes = [];
      preset.melodyName = "";
    } else if (value.startsWith("custom:")) {
      const melodyId = value.slice("custom:".length);
      const entry = (preset.library || []).find((item) => item.id === melodyId);
      if (entry) {
        preset.mode = "custom";
        preset.selectedMelodyId = entry.id;
        preset.notes = entry.notes;
        preset.melodyName = entry.melodyName;
      } else {
        preset.mode = "builtin";
        preset.selectedMelodyId = "";
        preset.notes = [];
        preset.melodyName = "";
      }
    } else {
      preset.mode = "builtin";
      preset.selectedMelodyId = "";
      preset.notes = [];
      preset.melodyName = "";
    }
    settings.buzzer.presets[presetKey] = normalizeBuzzerPreset(preset, preset);
    settingsDirty = true;
    scheduleSyncConnectionUi();
  }

  function enhanceBiometricSelectDropdowns() {
    biometricSelectDropdowns.length = 0;
    const selects = [
      ...buzzerSoundKeys.map((key) => refs.buzzerModes[key]),
      ...lightingSceneKeys.map((key) => refs.lightingScenes[key]),
      refs.oledMode,
      refs.oledTextFont,
      refs.oledDatetimeFont,
      refs.oledTimezone,
      refs.eyeSize,
    ];
    selects.forEach((select) => {
      const entry = enhanceBiometricSelect(select);
      if (entry) {
        biometricSelectDropdowns.push(entry);
      }
    });
  }

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function syncSettingsPanel(options = {}) {
    if (!refs?.settingsPanel || !refs.settingsToggle) {
      return;
    }
    const panel = refs.settingsPanel;
    const animate = options.animate !== false && !prefersReducedMotion();
    window.clearTimeout(settingsPanelCloseTimer);

    refs.settingsToggle.setAttribute("aria-expanded", settingsPanelOpen ? "true" : "false");
    refs.settingsToggle.title = settingsPanelOpen ? "Hide settings" : "Show settings";
    refs.settingsToggle.classList.toggle("is-open", settingsPanelOpen);
    root.querySelector(".admin-biometric-settings")?.classList.toggle("is-settings-open", settingsPanelOpen);
    panel.setAttribute("aria-hidden", settingsPanelOpen ? "false" : "true");

    if (settingsPanelOpen) {
      panel.hidden = false;
      bindBiometricDropdownScrollClose();
      if (animate) {
        panel.classList.remove("is-open");
        void panel.offsetHeight;
        panel.classList.add("is-open");
      } else {
        panel.classList.add("is-open");
      }
      return;
    }

    panel.classList.remove("is-open");
    if (animate && !panel.hidden) {
      settingsPanelCloseTimer = window.setTimeout(() => {
        if (!settingsPanelOpen) {
          panel.hidden = true;
        }
      }, settingsPanelAnimationMs);
      return;
    }

    panel.hidden = true;
  }

  function sendDeviceLedMode(mode, options = {}) {
    if (!activePort || !deviceVerified) {
      return Promise.resolve();
    }
    const force = options.force === true;
    const normalized = String(mode || "").trim();
    if (!normalized) {
      return Promise.resolve();
    }
    if (!force && lastSentLightingMode === normalized) {
      return Promise.resolve();
    }
    lastSentLightingMode = normalized;
    return sendSerialLine(`LED|${normalized}`).catch(() => {});
  }

  function resolveUiLightingMode() {
    if (enrollModalOpen) {
      return "enroll";
    }
    if (
      firmwareLedMode === "compile"
      || firmwareLedMode === "compile-done"
      || firmwareLedMode === "flash"
    ) {
      return "";
    }
    if (settingsPanelOpen) {
      return "settings";
    }
    return "normal";
  }

  function syncDeviceLightingToUiState(options = {}) {
    const sticky = options.sticky === true;
    if (!activePort || !deviceVerified) {
      return;
    }
    const mode = resolveUiLightingMode();
    if (!mode) {
      return;
    }
    const generation = ++lightingSyncGeneration;
    const apply = (force = false) => {
      if (generation !== lightingSyncGeneration) {
        return;
      }
      if (!activePort || !deviceVerified) {
        return;
      }
      if (resolveUiLightingMode() !== mode) {
        return;
      }
      void sendDeviceLedMode(mode, { force });
    };
    apply(true);
    window.clearTimeout(lightingStateSyncTimer);
    if (!sticky) {
      return;
    }
    // One delayed re-assert only — serial writes are queued, so avoid spam.
    lightingStateSyncTimer = window.setTimeout(() => apply(true), 220);
  }

  function startLightingStateKeepalive() {
    window.clearInterval(lightingStateKeepaliveTimer);
    lightingStateKeepaliveTimer = window.setInterval(() => {
      if (!activePort || !deviceVerified) {
        return;
      }
      if (
        firmwareBusy
        || firmwareLedMode === "compile"
        || firmwareLedMode === "compile-done"
        || firmwareLedMode === "flash"
      ) {
        return;
      }
      const mode = resolveUiLightingMode();
      if (!mode) {
        return;
      }
      // Do not force-resend enroll — open/close sticky sync owns blue so Cancel
      // is never fought by a 2.5s keepalive that re-arms LED|enroll.
      void sendDeviceLedMode(mode);
    }, 2500);
  }

  function stopLightingStateKeepalive() {
    window.clearInterval(lightingStateKeepaliveTimer);
    lightingStateKeepaliveTimer = 0;
  }

  function restoreScannerLightingAfterModal() {
    syncDeviceLightingToUiState({ sticky: true });
  }

  async function cancelActiveFingerprintOperation() {
    if (!activePort || !deviceVerified) {
      syncDeviceLightingToUiState({ sticky: true });
      return;
    }
    lastSentLightingMode = "";
    try {
      await sendSerialLine("FP_CANCEL");
    } catch {
      // ignore — still restore lighting below
    }
    syncDeviceLightingToUiState({ sticky: true });
  }

  function toggleSettingsPanel() {
    // Wrench only appears when a traced device is connected — never auto-opens.
    if (!activePort || !deviceVerified) {
      setFeedback("Connect and detect the retina scan controller before opening settings.", "warning");
      return;
    }
    settingsPanelOpen = !settingsPanelOpen;
    if (!settingsPanelOpen) {
      closeBiometricSelectDropdowns();
      stopFirmwareStatusPolling();
      window.clearTimeout(lightingPreviewTimer);
      window.clearTimeout(lightingPreviewRestoreTimer);
      lightingPreviewTimer = 0;
      lightingPreviewRestoreTimer = 0;
      lightingPreviewGeneration += 1;
      if (activePort && deviceVerified) {
        syncDeviceLightingToUiState({ sticky: true });
        if (deviceProtocolVersion >= 15) {
          void sendSerialLine("FACE|restore").catch(() => {});
        }
      }
    } else if (activePort && deviceVerified) {
      syncDeviceLightingToUiState({ sticky: true });
      if (deviceProtocolVersion >= 15) {
        void sendSerialCommandAndWait("FACE|scanning", "face-updated", 3000).catch(() => {});
      }
    }
    if (settingsPanelOpen) {
      void refreshFirmwareToolingStatus();
      startFirmwareStatusPolling();
      startLightingStateKeepalive();
    } else if (!enrollModalOpen) {
      stopLightingStateKeepalive();
    }
    syncSettingsPanel({ animate: true });
  }

  function closeSettingsPanelIfOpen(options = {}) {
    if (!settingsPanelOpen) {
      return;
    }
    settingsPanelOpen = false;
    closeBiometricSelectDropdowns();
    stopFirmwareStatusPolling();
    window.clearTimeout(lightingPreviewTimer);
    window.clearTimeout(lightingPreviewRestoreTimer);
    lightingPreviewTimer = 0;
    lightingPreviewRestoreTimer = 0;
    lightingPreviewGeneration += 1;
    if (!enrollModalOpen) {
      stopLightingStateKeepalive();
    }
    syncSettingsPanel({ animate: options.animate !== false });
  }

  function bindEvents() {
    refs.oledMode.addEventListener("change", () => {
      closeBiometricSelectDropdowns();
      handleOledEditorChange();
    });
    refs.oledTextFont?.addEventListener("change", handleOledEditorChange);
    refs.oledDatetimeFont?.addEventListener("change", handleOledEditorChange);
    refs.oledUse24Hour?.addEventListener("change", handleOledEditorChange);
    refs.oledTimezoneAuto?.addEventListener("change", () => {
      syncDatetimeSettingsUi();
      handleOledEditorChange();
    });
    refs.oledTimezone?.addEventListener("change", handleOledEditorChange);
    refs.oledText?.addEventListener("input", handleOledEditorChange);
    refs.eyeSize.addEventListener("change", handleOledEditorChange);
    lightingSceneKeys.forEach((key) => {
      refs.lightingScenes[key]?.addEventListener("change", () => {
        closeBiometricSelectDropdowns();
        handleLightingSceneChange(key);
      });
    });
    refs.oledTextFontUpload?.addEventListener("change", (event) => {
      void handleOledFontUpload("text", event);
    });
    refs.oledDatetimeFontUpload?.addEventListener("change", (event) => {
      void handleOledFontUpload("datetime", event);
    });
    buzzerSoundKeys.forEach((key) => {
      refs.buzzerUploads[key]?.addEventListener("change", (event) => {
        void handleBuzzerMelodyUpload(key, event);
      });
      refs.buzzerModes[key]?.addEventListener("change", () => {
        closeBiometricSelectDropdowns();
        applyBuzzerModeSelection(key);
        notifySettingsEdited();
      });
    });
    root.querySelectorAll("[data-biometric-action]").forEach((button) => {
      button.addEventListener("click", () => handleUiAction(button.dataset.biometricAction));
    });
    document.addEventListener("click", (event) => {
      if (!(event.target instanceof Node)) {
        closeBiometricSelectDropdowns();
        return;
      }
      const insideOpenDropdown = biometricSelectDropdowns.some((entry) => {
        if (entry.trigger?.getAttribute("aria-expanded") !== "true") {
          return false;
        }
        if (entry.dropdown instanceof HTMLElement && entry.dropdown.contains(event.target)) {
          return true;
        }
        return entry.menu instanceof HTMLElement && entry.menu.contains(event.target);
      });
      if (!insideOpenDropdown) {
        closeBiometricSelectDropdowns();
      }
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeBiometricSelectDropdowns();
      }
    });
    window.addEventListener("resize", closeBiometricSelectDropdowns);
    window.addEventListener("focus", () => {
      if (settingsPanelOpen) {
        void refreshFirmwareToolingStatus();
      }
    });
    bindBiometricDropdownScrollClose();
    root.addEventListener("click", (event) => {
      const deleteButton = event.target instanceof Element
        ? event.target.closest("[data-biometric-delete-slot]")
        : null;
      if (deleteButton instanceof HTMLElement && root.contains(deleteButton)) {
        if (deleteButton.disabled) {
          return;
        }
        event.preventDefault();
        void handleFingerprintSlotDelete(Number(deleteButton.dataset.biometricDeleteSlot));
        return;
      }
      const actionButton = event.target instanceof Element
        ? event.target.closest("[data-biometric-device-action]")
        : null;
      if (!(actionButton instanceof HTMLElement) || !root.contains(actionButton)) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      const action = String(actionButton.dataset.biometricDeviceAction || "").trim();
      if (action === "FP_ENROLL") {
        void startFingerprintEnrollment();
        return;
      }
      if (actionButton.disabled) {
        if (!activePort || !deviceVerified) {
          setFeedback("Connect and detect the retina scan controller first.", "warning");
        } else if (deviceBusy) {
          setFeedback("Wait for the current device action to finish.", "warning");
        }
        return;
      }
      void handleFingerprintAction(action);
    });
  }

  function applySettingsToForm() {
    if (!refs) {
      return;
    }
    buzzerSoundKeys.forEach((key) => {
      syncBuzzerPresetUi(key);
    });
    lightingSceneKeys.forEach((key) => {
      if (refs.lightingScenes[key]) {
        refs.lightingScenes[key].value = settings.lighting?.scenes?.[key] || lightingSceneDefaults[key];
      }
    });
    refs.oledMode.value = settings.oled.mode;
    refs.oledTextFont.value = settings.oled.fonts?.text?.preset || settings.oled.font;
    refs.oledDatetimeFont.value = settings.oled.fonts?.datetime?.preset || "clock-xl";
    refs.oledText.value = settings.oled.text;
    refs.eyeSize.value = String(settings.oled.eyes.eyeSize);
    if (refs.oledUse24Hour) {
      refs.oledUse24Hour.checked = Boolean(settings.oled.datetimeSettings?.use24HourFormat);
    }
    if (refs.oledTimezoneAuto) {
      refs.oledTimezoneAuto.checked = settings.oled.datetimeSettings?.timezoneAuto !== false;
    }
    if (refs.oledTimezone) {
      refs.oledTimezone.value = allowedOledTimezones.has(settings.oled.datetimeSettings?.timezone)
        ? settings.oled.datetimeSettings.timezone
        : detectLocalTimezone();
    }
    syncOledFontUi("text");
    syncOledFontUi("datetime");
    syncDatetimeSettingsUi();
    syncVisualPreviews();
    syncConnectionUi();
  }

  function collectSettings() {
    const device = getSelectedDeviceMetadata();
    return normalizeSettings({
      enabled: true,
      deviceType: "auto",
      baudRate: controllerBaudRate,
      selectedDevice: device || settings.selectedDevice,
      fingerprint: { defaultSlot: settings.fingerprint.defaultSlot },
      buzzer: {
        presets: Object.fromEntries(
          buzzerSoundKeys.map((key) => {
            applyBuzzerModeSelection(key);
            return [key, normalizeBuzzerPreset(settings.buzzer.presets[key])];
          }),
        ),
      },
      lighting: {
        scenes: Object.fromEntries(
          lightingSceneKeys.map((key) => [
            key,
            refs.lightingScenes[key]?.value || settings.lighting?.scenes?.[key] || lightingSceneDefaults[key],
          ]),
        ),
      },
      fingerprintLed: {
        color: resolveFingerprintLedColor(
          refs.lightingScenes?.normal?.value
            || settings.lighting?.scenes?.normal
            || settings.fingerprintLed?.color
            || "cyan",
        ),
        hex: getFingerprintLedColorHex(
          resolveFingerprintLedColor(
            refs.lightingScenes?.normal?.value
              || settings.lighting?.scenes?.normal
              || settings.fingerprintLed?.color
              || "cyan",
          ),
        ),
        mode: "breathing",
        speed: 200,
        cycles: 0,
      },
      oled: {
        mode: refs.oledMode.value,
        font: refs.oledTextFont?.value || settings.oled.font,
        fonts: {
          text: normalizeOledFontProfile(
            {
              preset: refs.oledTextFont?.value,
              profileName: settings.oled.fonts?.text?.profileName,
            },
            allowedFonts,
            "medium",
            settings.oled.fonts?.text,
          ),
          datetime: normalizeOledFontProfile(
            {
              preset: refs.oledDatetimeFont?.value,
              profileName: settings.oled.fonts?.datetime?.profileName,
            },
            allowedDatetimeFonts,
            "clock-xl",
            settings.oled.fonts?.datetime,
          ),
        },
        datetimeSettings: normalizeDatetimeSettings({
          use24HourFormat: refs.oledUse24Hour?.checked,
          timezoneAuto: refs.oledTimezoneAuto?.checked !== false,
          timezone: refs.oledTimezone?.value,
        }, settings.oled.datetimeSettings),
        text: refs.oledText.value,
        contrast: 180,
        eyes: {
          expression: "scanning",
          blinkInterval: 7000,
          animationSpeed: 5,
          eyeSize: Number(refs.eyeSize.value),
          spacing: 10,
        },
      },
      pins: settings.pins,
    });
  }

  function syncVisualPreviews() {
    if (!refs) {
      return;
    }
    const oledMode = allowedOledModes.has(refs.oledMode.value) ? refs.oledMode.value : "eyes";
    refs.oledTextControls.forEach((control) => { control.hidden = oledMode !== "text"; });
    refs.oledDatetimeControls.forEach((control) => { control.hidden = oledMode !== "datetime"; });
    refs.oledEyesControls.forEach((control) => { control.hidden = oledMode !== "eyes"; });
    syncDatetimeSettingsUi();
  }

  function syncDatetimeSettingsUi() {
    if (!refs) {
      return;
    }
    const timezoneAuto = refs.oledTimezoneAuto?.checked !== false;
    refs.oledTimezoneManualControls.forEach((control) => {
      control.hidden = timezoneAuto;
    });
    if (refs.oledTimezoneAutoNote instanceof HTMLElement) {
      refs.oledTimezoneAutoNote.hidden = !timezoneAuto;
    }
  }

  function handleOledEditorChange() {
    syncVisualPreviews();
    notifySettingsEdited();
    scheduleLiveOledPreview();
  }

  function getLightingScenePreviewCommand(sceneKey, colorName) {
    const color = allowedFingerprintLedColors.has(colorName) ? colorName : lightingSceneDefaults[sceneKey] || "blue";
    // Match firmware applyLedScene styles so the preview looks like the real mode.
    if (sceneKey === "sleep" || sceneKey === "enroll") {
      return `FINGER_LED|on|${color}|200|0`;
    }
    if (sceneKey === "break" || sceneKey === "success" || sceneKey === "error") {
      return `FINGER_LED|breathing|${color}|10|0`;
    }
    return `FINGER_LED|breathing|${color}|200|0`;
  }

  function handleLightingSceneChange(sceneKey) {
    notifySettingsEdited();
    scheduleLiveLightingPreview(sceneKey);
  }

  function scheduleLiveLightingPreview(sceneKey) {
    window.clearTimeout(lightingPreviewTimer);
    window.clearTimeout(lightingPreviewRestoreTimer);
    lightingPreviewTimer = 0;
    lightingPreviewRestoreTimer = 0;
    if (!activePort || !deviceVerified) {
      return;
    }
    const key = lightingSceneKeys.includes(sceneKey) ? sceneKey : "settings";
    const generation = ++lightingPreviewGeneration;
    let busyRetries = 0;

    const runPreview = () => {
      lightingPreviewTimer = 0;
      if (generation !== lightingPreviewGeneration) {
        return;
      }
      if (!activePort || !deviceVerified) {
        return;
      }
      // Don't block later color edits on an in-flight command — retry this generation shortly.
      if (pendingDeviceResponse || deviceBusy || firmwareBusy) {
        busyRetries += 1;
        if (busyRetries > 40) {
        return;
      }
        lightingPreviewTimer = window.setTimeout(runPreview, 120);
        return;
      }

      const color = refs.lightingScenes[key]?.value
        || settings.lighting?.scenes?.[key]
        || lightingSceneDefaults[key];

      void (async () => {
        try {
          // Fire-and-forget so rapid dropdown changes stay realtime (no wait lock).
          await sendSerialLine(`LED_COLOR|${key}|${color}`);
          if (generation !== lightingPreviewGeneration) {
            return;
          }
          await sendSerialLine(getLightingScenePreviewCommand(key, color));
          if (generation !== lightingPreviewGeneration) {
            return;
          }
        setFeedback(
            `${lightingSceneLabels[key] || key} lighting preview · ${color}. Apply & save to keep after restart.`,
          "success",
        );
          lightingPreviewRestoreTimer = window.setTimeout(() => {
            lightingPreviewRestoreTimer = 0;
            if (generation !== lightingPreviewGeneration) {
              return;
            }
            if (!activePort || !deviceVerified) {
              return;
            }
            syncDeviceLightingToUiState({ sticky: true });
          }, 4500);
      } catch (error) {
          if (generation !== lightingPreviewGeneration) {
            return;
          }
          setFeedback(
            error instanceof Error ? error.message : "Unable to preview scanner lighting.",
            "error",
          );
        }
      })();
    };

    lightingPreviewTimer = window.setTimeout(runPreview, 80);
  }

  function scheduleLiveOledPreview() {
    window.clearTimeout(oledPreviewTimer);
    oledPreviewTimer = 0;
    if (!activePort || !deviceVerified) {
      return;
    }
    oledPreviewTimer = window.setTimeout(() => {
      oledPreviewTimer = 0;
      if (!activePort || !deviceVerified) {
        return;
      }
      if (deviceBusy) {
        scheduleLiveOledPreview();
        return;
      }
      void (async () => {
        if (refs.oledMode?.value === "datetime") {
          await syncDeviceClock();
        }
        await runDeviceCommand(getDisplayCommand(), "Updating OLED preview...", {
          expectedEvents: getDisplayResponseEvent(),
          successMessage: "OLED preview updated. Use Apply & save to device to keep it after restart.",
        });
      })();
    }, 450);
  }

  function setFeedback(message, type = "") {
    if (!refs?.feedback) {
      return;
    }
    refs.feedback.textContent = String(message || "");
    refs.feedback.className = `admin-biometric-feedback${type ? ` is-${type}` : ""}`;
  }

  function showDeviceSnackbar(title, message, mode = "success") {
    const normalizedTitle = String(title || "Device").trim() || "Device";
    const normalizedMessage = String(message || "").replace(/\s+/g, " ").trim();
    if (typeof window.showSuperAdminSnackbar === "function") {
      window.showSuperAdminSnackbar(normalizedTitle, normalizedMessage, mode);
      return;
    }
    setFeedback(normalizedMessage || normalizedTitle, mode === "error" ? "error" : mode === "success" ? "success" : "");
  }

  function addActivity(message, type = "info") {
    const text = String(message || "").replace(/\s+/g, " ").trim();
    if (!text) {
      return;
    }
    activityLog.unshift({
      time: new Intl.DateTimeFormat("en-PH", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date()),
      text,
      type,
    });
    activityLog = activityLog.slice(0, 12);
    if (refs?.log) {
      refs.log.textContent = activityLog.length
        ? activityLog.map((entry) => `[${entry.time}] ${entry.text}`).join("\n")
        : "No device activity yet.";
    }
  }

  async function loadSettings() {
    const sequence = ++loadSequence;
    setFeedback("Loading device configuration...");
    try {
      const response = await fetch("/api/super-admin/biometric-settings", {
        cache: "no-store",
        headers: getSuperAdminHeaders({ Accept: "application/json" }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "Unable to load biometric device settings.");
      }
      if (sequence !== loadSequence) {
        return;
      }
      settings = normalizeSettings(data.settings);
      applySettingsToForm();
      markSettingsCommitted(settings);
      const detectedPort = await refreshAuthorizedPorts({ quiet: true });
      if (detectedPort && !activePort) {
        setFeedback("Device detected. Connecting automatically...");
        await connectSerialPort();
      } else if (!detectedPort) {
        setFeedback("");
      }
    } catch (error) {
      if (sequence === loadSequence) {
        setFeedback(error instanceof Error ? error.message : "Unable to load device settings.", "error");
      }
    }
  }

  async function saveSettings(options = {}) {
    settings = collectSettings();
    if (refs.sendButton) {
      refs.sendButton.disabled = true;
    }
    setFeedback("Saving device configuration...");
    try {
      const response = await fetch("/api/super-admin/biometric-settings", {
        method: "PUT",
        headers: getSuperAdminHeaders({ "Content-Type": "application/json", Accept: "application/json" }),
        body: JSON.stringify({ settings }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "Unable to save biometric device settings.");
      }
      settings = normalizeSettings(data.settings);
      applySettingsToForm();
      markSettingsCommitted(settings);
      if (options.keepFeedback !== true) {
      setFeedback("Retina scan device configuration saved.", "success");
      }
      addActivity("Configuration saved.", "success");
      return true;
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to save device settings.", "error");
      return false;
    } finally {
      syncConnectionUi();
      if (options.keepFeedback !== true && refs.feedback.classList.contains("is-success")) {
        window.setTimeout(() => {
          if (refs?.feedback?.classList.contains("is-success")) {
            setFeedback("");
          }
        }, 2600);
      }
    }
  }

  function getPortInfo(port) {
    try {
      return typeof port?.getInfo === "function" ? port.getInfo() : {};
    } catch (error) {
      return {};
    }
  }

  function formatUsbId(value) {
    return Number.isFinite(Number(value))
      ? Number(value).toString(16).padStart(4, "0").toUpperCase()
      : "----";
  }

  function getPortLabel(port, index) {
    const info = getPortInfo(port);
    const vendorId = Number(info.usbVendorId);
    const productId = Number(info.usbProductId);
    const bridgeVendor = vendorId === 0x1a86 || vendorId === 0x10c4 || vendorId === 0x2341 || vendorId === 0x2a03;
    const family = bridgeVendor ? "USB serial controller" : "Serial device";
    return `${family} ${index + 1} · USB ${formatUsbId(vendorId)}:${formatUsbId(productId)}`;
  }

  function getSelectedDeviceMetadata() {
    if (!selectedPort) {
      return null;
    }
    const index = authorizedPorts.indexOf(selectedPort);
    const info = getPortInfo(selectedPort);
    return {
      label: getPortLabel(selectedPort, Math.max(0, index)),
      usbVendorId: Number.isFinite(Number(info.usbVendorId)) ? Number(info.usbVendorId) : null,
      usbProductId: Number.isFinite(Number(info.usbProductId)) ? Number(info.usbProductId) : null,
    };
  }

  function findPreferredPortIndex(ports = authorizedPorts) {
    const list = Array.isArray(ports) ? ports : [];
    const saved = settings.selectedDevice || {};
    const vendorId = normalizeOptionalUsbId(saved.usbVendorId);
    const productId = normalizeOptionalUsbId(saved.usbProductId);
    if (vendorId === null) {
      return list.length === 1 ? 0 : -1;
    }
    return list.findIndex((port) => {
      const info = getPortInfo(port);
      return Number(info.usbVendorId) === vendorId
        && (productId === null || Number(info.usbProductId) === productId);
    });
  }

  async function forgetExtraPorts(ports, keepPort) {
    const extras = ports.filter((port) => port !== keepPort);
    for (const port of extras) {
      try {
        if (typeof port.forget === "function") {
          await port.forget();
        }
      } catch (_error) {
        // Ignore forget failures; we still keep only one selected port in UI.
      }
    }
  }

  async function applySingleAuthorizedPort(ports, options = {}) {
    const list = Array.isArray(ports) ? ports.slice() : [];
    let keepPort = options.preferredPort
      || (selectedPort && list.includes(selectedPort) ? selectedPort : null)
      || (activePort && list.includes(activePort) ? activePort : null);
    if (!keepPort) {
      const preferredIndex = findPreferredPortIndex(list);
      keepPort = preferredIndex >= 0 ? list[preferredIndex] : list[0] || null;
    }

    if (list.length > 1 && keepPort) {
      await forgetExtraPorts(list, keepPort);
      authorizedPorts = [keepPort];
      selectedPort = keepPort;
      syncConnectionUi();
      if (!options.quiet) {
        showDeviceSnackbar(
          "Only one device allowed",
          "Extra COM devices were cleared. Only one retina scan controller can be used.",
          "error",
        );
      }
      addActivity("Rejected multiple COM devices. Kept a single authorized controller.", "error");
      return { port: keepPort, limited: true };
    }

    authorizedPorts = keepPort ? [keepPort] : [];
    selectedPort = keepPort;
    syncConnectionUi();
    return { port: keepPort, limited: false };
  }

  async function refreshAuthorizedPorts(options = {}) {
    if (!serialSupported()) {
      syncConnectionUi();
      if (!options.quiet) {
        showDeviceSnackbar(
          "Device detection failed",
          "Web Serial requires Chrome or Edge on HTTPS or localhost.",
          "error",
        );
      }
      return null;
    }
    try {
      const ports = await navigator.serial.getPorts();
      const result = await applySingleAuthorizedPort(ports, {
        quiet: options.quiet,
        preferredPort: options.preferredPort || null,
      });
      if (options.quiet) {
        return result.port;
      }
      if (result.limited) {
        return result.port;
      }
      if (result.port) {
        const label = getSelectedDeviceMetadata()?.label || "retina scan controller";
        showDeviceSnackbar("Device detected", `${label} is ready. Connecting automatically...`, "success");
        addActivity(`Detected ${label}.`, "success");
      } else if (options.allowRequest) {
        return requestSerialPort({ quiet: false });
      } else {
        showDeviceSnackbar(
          "No device found",
          "Plug in the retina scan controller, then try Connect again.",
          "error",
        );
      }
      return result.port;
    } catch (error) {
      showDeviceSnackbar(
        "Device detection failed",
        error instanceof Error ? error.message : "Unable to detect serial devices.",
        "error",
      );
      return null;
    }
  }

  async function requestSerialPort(options = {}) {
    if (!serialSupported()) {
      showDeviceSnackbar("Device detection failed", "Web Serial is unavailable in this browser.", "error");
      return null;
    }
    if (selectedPort || authorizedPorts.length > 0) {
      showDeviceSnackbar(
        "Only one device allowed",
        "A retina scan controller is already authorized. Disconnect or forget it before adding another.",
        "error",
      );
      return selectedPort;
    }
    try {
      const port = await navigator.serial.requestPort();
      const ports = await navigator.serial.getPorts();
      if (!ports.includes(port)) {
        ports.push(port);
      }
      const result = await applySingleAuthorizedPort(ports, {
        quiet: true,
        preferredPort: port,
      });
      settings = collectSettings();
      if (!options.quiet) {
        const label = getSelectedDeviceMetadata()?.label || "retina scan controller";
        showDeviceSnackbar("Device detected", `${label} is authorized. Connecting automatically...`, "success");
        addActivity(`Authorized ${label}.`, "success");
      }
      return result.port;
    } catch (error) {
      if (error?.name !== "NotFoundError") {
        showDeviceSnackbar(
          "Device detection failed",
          error instanceof Error ? error.message : "Unable to authorize a COM device.",
          "error",
        );
      }
      return null;
    }
  }

  function syncConnectionUi() {
    if (!refs) {
      return;
    }
    const connected = Boolean(activePort);
    const deviceReady = connected && deviceVerified;
    const handshakeFailed = connected && !deviceVerified && handshakeState === "failed";
    const canEdit = canEditBiometricSettings();
    const firmwareUnlocked = isFirmwareUnlockedForEditing();
    refs.connectionStatus.classList.toggle("is-online", deviceReady);
    refs.connectionStatus.classList.toggle("is-pending", connected && !deviceReady && !handshakeFailed);
    refs.connectionStatus.classList.toggle("is-offline", !deviceReady);
    const deviceLabel = displayDeviceName(deviceReady ? connectedDeviceName : defaultDeviceName);
    refs.connectionStatus.querySelector("span").textContent = `${deviceReady ? "connected" : "connect"}: ${deviceLabel}`;
    refs.connectionStatus.title = handshakeFailed
      ? "Retry detection"
      : connected
        ? "Disconnect"
        : "Connect";
    refs.connectButton.disabled = !connected && !serialSupported();
    const unsavedChanges = hasUnsavedSettingsChanges();
    refs.sendButton.disabled = !canEdit
      || !deviceCanAuthorizeBuiltInAdmin
      || !unsavedChanges;
    refs.sendButton.title = !deviceReady
      ? "Connect the controller first."
      : !firmwareUnlocked
        ? "Flash the latest firmware before applying settings."
        : !deviceCanAuthorizeBuiltInAdmin
          ? "Upload firmware protocol 8 or newer and connect the controller."
          : !unsavedChanges
            ? "No settings changes to apply."
            : "Apply settings after a registered fingerprint authorizes the change.";
    root.querySelectorAll("[data-biometric-device-action]").forEach((button) => {
      const ready = firmwareUnlocked && !deviceBusy && !firmwareBusy;
      if (button.dataset.biometricDeviceAction === "FP_ENROLL" || button.hasAttribute("data-biometric-enroll-trigger")) {
        button.disabled = !ready;
        button.classList.toggle("is-unavailable", !ready);
        return;
      }
      button.disabled = !ready;
      button.classList.toggle("is-unavailable", !ready);
    });
    root.querySelectorAll("[data-biometric-delete-slot]").forEach((button) => {
      button.disabled = !firmwareUnlocked || deviceBusy || firmwareBusy;
    });
    const testBuzzerButton = root.querySelector("[data-biometric-action='test-buzzer-success']");
    if (testBuzzerButton) {
      testBuzzerButton.disabled = !firmwareUnlocked || deviceBusy || firmwareBusy;
    }
    buzzerSoundKeys.forEach((key) => {
      const button = root.querySelector(`[data-biometric-action='test-buzzer-${key}']`);
      if (button) {
        button.disabled = !firmwareUnlocked || deviceBusy || firmwareBusy;
      }
    });
    syncFirmwareUi();
  }

  async function toggleConnection() {
    if (activePort && !deviceVerified && handshakeState === "failed") {
      beginControllerHandshake(activePort);
      return;
    }
    if (activePort) {
      await disconnectSerialPort();
      return;
    }
    await connectSerialPort();
  }

  function getSerialOpenErrorMessage(error) {
    const originalMessage = error instanceof Error ? error.message : String(error || "");
    const errorName = String(error?.name || "");
    if (
      errorName === "NetworkError"
      || /failed to open serial port|unable to open|access is denied/i.test(originalMessage)
    ) {
      return "The COM port is busy or changed after reset. Close other device tabs or serial monitors, then unplug and replug the board.";
    }
    if (errorName === "InvalidStateError" || /already open/i.test(originalMessage)) {
      return "This COM port is already open. Disconnect it from the other browser tab or serial monitor, then try again.";
    }
    return originalMessage || "Unable to open the COM device.";
  }

  function stopControllerHandshake(nextState = "idle") {
    window.clearTimeout(handshakeTimer);
    handshakeTimer = 0;
    handshakeAttempts = 0;
    handshakeState = nextState;
  }

  function finishControllerHandshakeFailure(port) {
    if (activePort !== port || deviceVerified) {
      return;
    }
    stopControllerHandshake("failed");
    syncConnectionUi();
    setFeedback(
      "The COM port opened, but this board did not identify as a GMS retina controller. Use Install firmware for a blank or mismatched ESP32, then press Retry detection.",
      "warning",
    );
    addActivity("Controller handshake failed after multiple HELLO attempts.", "error");
  }

  function scheduleControllerHandshakeAttempt(port, delayMs) {
    window.clearTimeout(handshakeTimer);
    handshakeTimer = window.setTimeout(async () => {
      handshakeTimer = 0;
      if (activePort !== port || deviceVerified || handshakeState !== "detecting") {
        return;
      }
      handshakeAttempts += 1;
      try {
        await sendSerialLine("HELLO");
      } catch (error) {
        if (activePort === port) {
          stopControllerHandshake("failed");
          syncConnectionUi();
          setFeedback(error instanceof Error ? error.message : "Unable to request controller identification.", "error");
        }
        return;
      }
      if (activePort !== port || deviceVerified) {
        return;
      }
      if (handshakeAttempts < 6) {
        scheduleControllerHandshakeAttempt(port, 1250);
        return;
      }
      handshakeTimer = window.setTimeout(() => finishControllerHandshakeFailure(port), 1500);
    }, Math.max(0, Number(delayMs) || 0));
  }

  function beginControllerHandshake(port) {
    if (!port || activePort !== port) {
      return;
    }
    stopControllerHandshake("detecting");
    deviceVerified = false;
    connectedDeviceName = "";
    syncConnectionUi();
    setFeedback("Detecting the retina scan controller...");
    addActivity("Requesting controller identification.");
    scheduleControllerHandshakeAttempt(port, 250);
  }

  async function connectSerialPort() {
    if (activePort) {
      return activePort;
    }
    if (serialConnectionPromise) {
      return serialConnectionPromise;
    }
    serialConnectionPromise = openSerialPort();
    try {
      return await serialConnectionPromise;
    } finally {
      serialConnectionPromise = null;
      syncConnectionUi();
    }
  }

  async function openSerialPort() {
    if (!selectedPort) {
      const detected = await refreshAuthorizedPorts({ quiet: true, allowRequest: false });
      if (!detected) {
        const authorized = await requestSerialPort({ quiet: true });
        if (!authorized) {
          showDeviceSnackbar(
            "No device found",
            "Plug in the retina scan controller, then try Connect again.",
            "error",
          );
          return null;
        }
      }
    }
    if (!selectedPort) {
      showDeviceSnackbar("No device found", "Unable to authorize a retina scan controller.", "error");
      return null;
    }
    const baudRate = controllerBaudRate;
    refs.connectButton.disabled = true;
    setFeedback("Opening serial connection...");
    try {
      await selectedPort.open({ baudRate, bufferSize: 1024 });
      activePort = selectedPort;
      deviceVerified = false;
      connectedDeviceName = "";
      deviceProtocolVersion = 0;
      deviceCanReadConfig = false;
      deviceCanProbeFingerprintLed = false;
      deviceCanBlinkFingerprintLed = false;
      deviceCanAuthorizeBuiltInAdmin = false;
      deviceCanListFingerprintSlots = false;
      deviceFingerprintCapacity = 127;
      deviceFingerprintTemplates = 0;
      builtInAdminSlotStatus = { 1: null, 2: null };
      savedFingerprintSlots = loadRegisteredFingerprintSlotsFromStorage();
      renderSavedFingerprintGrid();
      handshakeState = "detecting";
      serialReadBuffer = "";
      startSerialReadLoop();
      syncConnectionUi();
      settings = collectSettings();
      addActivity(`Connected at ${baudRate.toLocaleString()} baud.`, "success");
      setFeedback("Device connected. Waiting for controller identification...", "success");
      beginControllerHandshake(activePort);
      return activePort;
    } catch (error) {
      const message = getSerialOpenErrorMessage(error);
      if (activePort) {
        await disconnectSerialPort({ quiet: true });
      } else {
        deviceVerified = false;
        connectedDeviceName = "";
        stopControllerHandshake("idle");
        syncConnectionUi();
      }
      showDeviceSnackbar("Connection failed", message, "error");
      setFeedback(message, "error");
      addActivity("Serial connection failed.", "error");
      return null;
    }
  }

  function startSerialReadLoop() {
    if (!activePort?.readable || serialReadLoop) {
      return;
    }
    serialReadLoop = (async () => {
      const readPort = activePort;
      serialReader = readPort.readable.getReader();
      const decoder = new TextDecoder();
      try {
        while (activePort === readPort && serialReader) {
          const { value, done } = await serialReader.read();
          if (done) {
            break;
          }
          serialReadBuffer += decoder.decode(value, { stream: true });
          const lines = serialReadBuffer.split(/\r?\n/);
          serialReadBuffer = lines.pop() || "";
          lines.map((line) => line.trim()).filter(Boolean).forEach(handleSerialMessage);
        }
      } catch (error) {
        if (!disconnecting) {
          setFeedback(error instanceof Error ? error.message : "Serial connection was interrupted.", "error");
          addActivity("Serial read stopped unexpectedly.", "error");
        }
      } finally {
        const stoppedUnexpectedly = !disconnecting && activePort === readPort;
        try {
          serialReader?.releaseLock();
        } catch (error) {
          // Reader may already be released during disconnect.
        }
        serialReader = null;
        serialReadLoop = null;
        if (stoppedUnexpectedly) {
          deviceVerified = false;
          connectedDeviceName = "";
          deviceBusy = false;
          stopControllerHandshake("idle");
          rejectPendingDeviceResponse(new Error("The serial connection stopped before the device replied."));
          try {
            if (readPort.readable || readPort.writable) {
              await readPort.close();
            }
          } catch (error) {
            // The browser may have already closed a physically removed port.
          }
          if (activePort === readPort) {
            activePort = null;
          }
          syncConnectionUi();
          setFeedback("The serial connection stopped. Reconnect the COM device to continue.", "error");
        }
      }
    })();
  }

  function handleSerialMessage(line) {
    let message = null;
    try {
      message = JSON.parse(line);
    } catch (error) {
      addActivity(line);
      return;
    }
    const eventName = String(message?.event ?? message?.type ?? "device").trim();
    const detail = String(message?.message ?? message?.status ?? message?.device ?? eventName).trim();
    const isRetryEvent = eventName === "fingerprint-retry"
      || eventName === "fingerprint-scan-error"
      || eventName === "fingerprint-no-match"
      || eventName === "fingerprint-admin-denied";
    const isCancelEvent = eventName === "fingerprint-cancelled"
      || /operation cancelled/i.test(detail);
    const isError = !isRetryEvent && !isCancelEvent && (eventName === "error" || message?.ok === false);
    const skipRoutineAck = eventName === "finger-led-updated"
      || eventName === "led-updated"
      || eventName === "led-color-updated"
      || eventName === "time-updated"
      || eventName === "face-updated"
      || isCancelEvent
      || (Boolean(firmwareBusy || firmwareLedMode)
        && (eventName === "finger-led-updated" || eventName === "led-updated"));
    if (!skipRoutineAck) {
    addActivity(detail, isRetryEvent ? "warning" : isError ? "error" : "success");
    }
    settlePendingDeviceResponse(eventName, message);
    if (eventName === "hello") {
      const protocolVersion = Number(message.protocol);
      const compatibleProtocol = Number.isInteger(protocolVersion) && protocolVersion >= 1;
      const compatibleDevice = /\b((Retina Scan)|Biometric) Controller\b/i.test(String(message.device ?? "").trim());
      if (message.ok !== true || !compatibleProtocol || !compatibleDevice) {
        deviceVerified = false;
        connectedDeviceName = "";
        stopControllerHandshake("failed");
        syncConnectionUi();
        setFeedback("The selected port did not identify as a compatible retina scan controller.", "warning");
        addActivity("Rejected an incompatible controller handshake.", "error");
        return;
      }
      const firstSuccessfulDetection = !deviceVerified;
      deviceVerified = true;
      connectedDeviceName = String(message.device ?? "").trim() || defaultDeviceName;
      deviceProtocolVersion = protocolVersion;
      deviceCanReadConfig = message.configRead === true || protocolVersion >= 2;
      deviceCanProbeFingerprintLed = message.fingerprintLedProbe === true;
      deviceCanBlinkFingerprintLed = message.fingerprintLedBlinkTest === true;
      deviceCanAuthorizeBuiltInAdmin = message.builtInAdminAuth === true && protocolVersion >= 8;
      deviceCanListFingerprintSlots = message.fingerprintSlots === true || protocolVersion >= 10;
      deviceFingerprintCapacity = clampInteger(message.fingerprintCapacity, 1, 255, 127);
      deviceFingerprintTemplates = clampInteger(message.fingerprintTemplates, 0, 255, 0);
      if (firstSuccessfulDetection) {
        builtInAdminSlotStatus = { 1: null, 2: null };
        savedFingerprintSlots = loadRegisteredFingerprintSlotsFromStorage();
        renderSavedFingerprintGrid();
      }
      stopControllerHandshake("verified");
      window.clearTimeout(handshakeTimer);
      handshakeTimer = 0;
      syncConnectionUi();
      setFeedback(
        deviceCanReadConfig
          ? `${message.device || "Retina scan controller"} detected. Fetching its saved configuration...`
          : `${message.device || "Retina scan controller"} connected. Upload the latest firmware to fetch its saved configuration.`,
        deviceCanReadConfig ? "success" : "warning",
      );
      if (firstSuccessfulDetection) {
        syncDeviceLightingToUiState({ sticky: true });
        // Wrench/fetch appear on connect, but settings stay collapsed until the user opens them.
        if (settingsPanelOpen || enrollModalOpen) {
          startLightingStateKeepalive();
        }
        window.setTimeout(async () => {
          if (!activePort || !deviceVerified) {
            return;
          }
          await refreshFirmwareToolingStatus();
          if (!activePort || !deviceVerified) {
            return;
          }
          deviceBusy = true;
          scheduleSyncConnectionUi();
          try {
          try {
            await syncDeviceClock();
          } catch (error) {
            // ignore
          }
          if (deviceCanAuthorizeBuiltInAdmin) {
            try {
              await sendSerialLine("FP_ADMIN_STATUS");
            } catch (error) {
              addActivity("Unable to read built-in administrator fingerprint status.", "error");
            }
          }
          try {
            await reconcileUnsavedFingerprintSlotsWithDevice();
          } catch (error) {
            addActivity("Unable to sync unsaved fingerprint slots with the scanner.", "error");
          }
          if (deviceCanReadConfig && isFirmwareUnlockedForEditing()) {
              await fetchDeviceConfiguration({ automatic: true, alreadyBusy: true });
            }
          } finally {
            deviceBusy = false;
            scheduleSyncConnectionUi();
          }
        }, 0);
      }
      return;
    }
    if (eventName === "fingerprint-stage") {
      applyFingerprintStageToModal(detail);
      return;
    }
    if (eventName === "fingerprint-retry" || eventName === "fingerprint-scan-error" || eventName === "fingerprint-no-match" || eventName === "fingerprint-admin-denied") {
      applyFingerprintRetryToModal(detail);
      return;
    }
    if (eventName === "fingerprint-enrolled") {
      deviceFingerprintTemplates = clampInteger(
        message.templateCount,
        0,
        255,
        Math.max(deviceFingerprintTemplates, visibleSavedFingerprintSlots().length + 1),
      );
      rememberPendingFingerprintSlot(message.id);
      setEnrollModalState({
        progress: 100,
        step: enrollScanTotal,
        title: "Fingerprint enrolled",
        hint: "Added to Registered. Save settings to keep it after refresh.",
        status: "success",
      });
      return;
    }
    if (eventName === "fingerprint-deleted") {
      forgetFingerprintSlot(message.id);
      if (deviceFingerprintTemplates > 0) {
        deviceFingerprintTemplates -= 1;
      }
      return;
    }
    if (eventName === "fingerprint-slots") {
      return;
    }
    if (eventName === "fingerprint-match") {
      setFeedback("Fingerprint matched.", "success");
      return;
    }
    if (eventName === "fingerprint-admin-status") {
      builtInAdminSlotStatus = {
        1: message?.slots?.["1"] === true,
        2: message?.slots?.["2"] === true,
      };
      syncConnectionUi();
      return;
    }
    if (eventName === "fingerprint-admin-authorized") {
      if (enrollModalOpen && enrollModalMode === "scan") {
        setEnrollModalState({
          progress: 100,
          title: "Authorized",
          hint: formatRetinaSecurityProceedHint(retinaSecurityActionLabel || "continue"),
          status: "success",
        });
      }
      setFeedback("Retina Security authorized.", "success");
      return;
    }
    if (eventName === "finger-led-probe-stage") {
      setFeedback(detail || `Testing raw color index ${message.index ?? ""}...`, message.acknowledged === false ? "warning" : "");
      return;
    }
    if (eventName === "finger-led-probe-complete") {
      const indexes = Array.isArray(message.acknowledged)
        ? message.acknowledged.map((value) => Number(value)).filter(Number.isInteger)
        : [];
      setFeedback(
        `Color probe finished. Acknowledged indexes: ${indexes.length ? indexes.join(", ") : "none"}. Saved lighting was restored.`,
        indexes.length ? "success" : "warning",
      );
      return;
    }
    if (eventName === "fingerprint-already-registered") {
      lastAlreadyRegisteredStep = clampInteger(message.step, 1, enrollScanTotal, enrollStep >= 2 ? 2 : 1);
      if (enrollModalOpen && enrollModalMode === "enroll") {
        setEnrollModalState({
          progress: Math.max(18, enrollProgress),
          step: lastAlreadyRegisteredStep,
          title: "Already registered",
          hint: detail || "This fingerprint is already saved and cannot be enrolled again.",
          status: "error",
        });
        setFeedback("This fingerprint is already registered.", "error");
      }
      return;
    }
    if (eventName === "fingerprint-cancelled" || /operation cancelled/i.test(detail)) {
      // Intentional cancel / enroll restart — never paint the enroll modal red.
      return;
    }
    if (isError) {
      if (enrollModalOpen && !/already registered/i.test(detail)) {
        setEnrollModalState({
          status: "error",
          title: enrollModalMode === "scan" ? "Scan failed" : "Enrollment failed",
          hint: detail || "The device reported an error.",
        });
      }
      setFeedback(detail || "The device reported an error.", "error");
    }
  }

  async function disconnectSerialPort(options = {}) {
    if (!activePort) {
      return;
    }
    await discardPendingFingerprintSlots({ deleteFromDevice: true, quiet: true });
    disconnecting = true;
    const port = activePort;
    deviceVerified = false;
    connectedDeviceName = "";
    deviceProtocolVersion = 0;
    closeSettingsPanelIfOpen({ animate: true });
    stopLightingStateKeepalive();
    window.clearTimeout(lightingStateSyncTimer);
    lightingStateSyncTimer = 0;
    lastSentLightingMode = "";
    serialWriteChain = Promise.resolve();
    savedFingerprintSlots = loadRegisteredFingerprintSlotsFromStorage();
    renderSavedFingerprintGrid();
    oledPreviewTimer = 0;
    stopControllerHandshake("idle");
    rejectPendingDeviceResponse(new Error("The serial device was disconnected."));
    try {
      await sendSerialLine("LED|sleep");
    } catch (error) {
      // Continue closing the serial port.
    }
    try {
      await serialReader?.cancel();
    } catch (error) {
      // Continue closing the serial port.
    }
    try {
      await serialReadLoop;
    } catch (error) {
      // The read loop reports relevant errors itself.
    }
    let closeError = null;
    try {
      await port.close();
    } catch (error) {
      closeError = error instanceof Error ? error : new Error("Unable to close the COM device.");
    } finally {
      activePort = closeError && (port.readable || port.writable) ? port : null;
      disconnecting = false;
      syncConnectionUi();
      if (!options.quiet && closeError) {
        setFeedback(closeError.message, "error");
        addActivity("Unable to release the serial device.", "error");
      } else if (!options.quiet) {
        setFeedback("COM device disconnected.");
        addActivity("Serial device disconnected.");
      }
    }
  }

  async function sendSerialLine(command) {
    const normalizedCommand = String(command ?? "").replace(/[\r\n]+/g, "").trim();
    if (!normalizedCommand || normalizedCommand.length > 172) {
      throw new Error("Device command is empty or too long.");
    }
    const writeTask = async () => {
      if (!activePort?.writable) {
        throw new Error("Connect the selected COM device first.");
      }
      const writer = activePort.writable.getWriter();
      try {
        await writer.write(textEncoder.encode(`${normalizedCommand}\n`));
      } finally {
        try {
          writer.releaseLock();
        } catch {
          // ignore release races during disconnect
        }
      }
    };
    // Serialize all writes — concurrent getWriter() throws WritableStream is locked.
    const run = serialWriteChain.then(writeTask, writeTask);
    serialWriteChain = run.catch(() => {});
    return run;
  }

  function rejectPendingDeviceResponse(error) {
    if (!pendingDeviceResponse) {
      return;
    }
    const pending = pendingDeviceResponse;
    pendingDeviceResponse = null;
    window.clearTimeout(pending.timer);
    pending.reject(error instanceof Error ? error : new Error(String(error || "Device response failed.")));
  }

  function settlePendingDeviceResponse(eventName, message) {
    if (!pendingDeviceResponse) {
      return;
    }
    if (
      pendingDeviceResponse.expectedEvents.has(eventName)
      && message?.ok !== false
    ) {
      const pending = pendingDeviceResponse;
      pendingDeviceResponse = null;
      window.clearTimeout(pending.timer);
      pending.resolve(message);
      return;
    }
    if (eventName === "fingerprint-stage" || eventName === "fingerprint-retry") {
      return;
    }
    if (eventName === "fingerprint-already-registered" || eventName === "error" || message?.ok === false) {
      rejectPendingDeviceResponse(new Error(String(message?.message || "The device reported an error.")));
    }
  }

  async function sendSerialCommandAndWait(command, expectedEvents, timeoutMs = 5000) {
    if (pendingDeviceResponse) {
      throw new Error("Wait for the current device command to finish.");
    }
    const eventNames = Array.isArray(expectedEvents) ? expectedEvents : [expectedEvents];
    let resolveResponse;
    let rejectResponse;
    const responsePromise = new Promise((resolve, reject) => {
      resolveResponse = resolve;
      rejectResponse = reject;
    });
    responsePromise.catch(() => {});
    const timer = window.setTimeout(() => {
      rejectPendingDeviceResponse(new Error("The retina scan controller did not confirm the command in time."));
    }, Math.max(1000, Number(timeoutMs) || 5000));
    pendingDeviceResponse = {
      expectedEvents: new Set(eventNames.map((name) => String(name || "").trim()).filter(Boolean)),
      resolve: resolveResponse,
      reject: rejectResponse,
      timer,
    };
    try {
      await sendSerialLine(command);
      return await responsePromise;
    } catch (error) {
      if (pendingDeviceResponse) {
        rejectPendingDeviceResponse(error);
      }
      responsePromise.catch(() => {});
      throw error;
    }
  }

  function mergeDeviceConfiguration(deviceConfig) {
    const current = collectSettings();
    const input = deviceConfig && typeof deviceConfig === "object" ? deviceConfig : {};
    const deviceBuzzer = input.buzzer && typeof input.buzzer === "object" ? input.buzzer : {};
    const devicePresets = deviceBuzzer.presets && typeof deviceBuzzer.presets === "object"
      ? deviceBuzzer.presets
      : {};
    const mergedPresets = {};
    for (const key of buzzerSoundKeys) {
      const devicePreset = devicePresets[key] && typeof devicePresets[key] === "object"
        ? devicePresets[key]
        : {};
      mergedPresets[key] = normalizeBuzzerPreset(
        {
          mode: devicePreset.mode,
          melodyName: normalizeMelodyNotes(devicePreset.notes).length
            ? String(devicePreset.melodyName || `${buzzerSoundLabels[key]} melody`)
            : "",
          notes: devicePreset.notes,
          library: current.buzzer.presets[key]?.library,
          selectedMelodyId: current.buzzer.presets[key]?.selectedMelodyId,
        },
        current.buzzer.presets[key],
      );
    }
    if (!Object.keys(devicePresets).length && Array.isArray(deviceBuzzer.notes)) {
      mergedPresets.success = normalizeBuzzerPreset({
        mode: normalizeMelodyNotes(deviceBuzzer.notes).length ? "custom" : "builtin",
        melodyName: normalizeMelodyNotes(deviceBuzzer.notes).length ? "Device melody" : "",
        notes: deviceBuzzer.notes,
      }, current.buzzer.presets.success);
    }
    settings = normalizeSettings({
      ...current,
      fingerprintLed: input.fingerprintLed && typeof input.fingerprintLed === "object"
        ? input.fingerprintLed
        : current.fingerprintLed,
      lighting: input.lighting && typeof input.lighting === "object"
        ? input.lighting
        : current.lighting,
      oled: input.oled && typeof input.oled === "object" ? input.oled : current.oled,
      buzzer: { presets: mergedPresets },
    });
    applySettingsToForm();
  }

  async function fetchDeviceConfiguration(options = {}) {
    if (!activePort || !deviceVerified) {
      setFeedback("Connect and detect the retina scan controller before fetching its settings.", "error");
      return false;
    }
    if (!canEditBiometricSettings({ ignoreBusy: options.alreadyBusy === true })) {
      if (!options.automatic) {
        setFeedback("Flash the latest firmware before fetching settings.", "warning");
      }
      return false;
    }
    if (!deviceCanReadConfig || deviceProtocolVersion < 2) {
      setFeedback("This controller firmware cannot return saved settings yet. Upload the latest firmware first.", "warning");
      return false;
    }
    if (deviceBusy && !options.alreadyBusy) {
      if (!options.automatic) {
        setFeedback("Wait for the current device action to finish.", "warning");
      }
      return false;
    }
    const manageBusy = !options.alreadyBusy;
    if (manageBusy) {
    deviceBusy = true;
      scheduleSyncConnectionUi();
    }
    setFeedback("Fetching the configuration stored in the controller...");
    try {
      const response = await sendSerialCommandAndWait("CONFIG_GET", "config", 6000);
      mergeDeviceConfiguration(response?.config);
      markSettingsCommitted(settings);
      if (options.automatic) {
        setFeedback("Device configuration loaded from the controller.", "success");
        addActivity("Fetched OLED, buzzer, and lighting configuration from the controller.", "success");
        // Save in the background so connect does not freeze the page on a large JSON write.
        void saveSettings({ keepFeedback: true }).catch(() => {});
        return true;
      }
      const saved = await saveSettings({ keepFeedback: true });
      if (!saved) {
        addActivity("Device settings were loaded, but saving them failed.", "error");
        return false;
      }
      setFeedback("Device configuration fetched and saved.", "success");
      addActivity("Fetched the saved OLED, buzzer, and fingerprint lighting configuration from the controller.", "success");
      return true;
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to fetch the controller configuration.", "error");
      addActivity("Unable to fetch saved configuration from the controller.", "error");
      return false;
    } finally {
      if (manageBusy) {
      deviceBusy = false;
        scheduleSyncConnectionUi();
      }
    }
  }

  async function runDeviceCommand(command, pendingMessage, options = {}) {
    if (!activePort || !deviceVerified) {
      setFeedback("Connect and detect a compatible retina scan controller first.", "error");
      return;
    }
    if (deviceBusy) {
      setFeedback("Wait for the current device action to finish.", "warning");
      return;
    }
    deviceBusy = true;
    syncConnectionUi();
    try {
      setFeedback(pendingMessage || "Sending command to device...");
      const response = options.expectedEvents
        ? await sendSerialCommandAndWait(command, options.expectedEvents, options.timeoutMs)
        : (await sendSerialLine(command), null);
      addActivity(`Sent ${String(command).split("|")[0]} command.`);
      if (options.successMessage && response?.ok !== false) {
        setFeedback(options.successMessage, "success");
      }
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to send the device command.", "error");
    } finally {
      deviceBusy = false;
      syncConnectionUi();
    }
  }

  function resolveOledTextFontPreset() {
    const preset = String(refs.oledTextFont?.value || settings.oled.fonts?.text?.preset || "medium")
      .trim()
      .toLowerCase();
    return allowedFonts.has(preset) ? preset : "medium";
  }

  function resolveOledDatetimeFontPreset() {
    const preset = String(refs.oledDatetimeFont?.value || settings.oled.fonts?.datetime?.preset || "clock-xl")
      .trim()
      .toLowerCase();
    return allowedDatetimeFonts.has(preset) ? preset : "clock-xl";
  }

  function getOledCommand() {
    const font = resolveOledTextFontPreset();
    return `OLED|${font}|180|${sanitizeOledText(refs.oledText.value)}`;
  }

  function getDisplayCommand() {
    const mode = allowedOledModes.has(refs.oledMode.value) ? refs.oledMode.value : "eyes";
    if (deviceProtocolVersion > 0 && deviceProtocolVersion < 3 && mode === "text") {
      return getOledCommand();
    }
    const textFont = resolveOledTextFontPreset();
    const datetimeFont = resolveOledDatetimeFontPreset();
    const eyeSize = clampInteger(refs.eyeSize.value, 1, 3, 2);
    return `DISPLAY|${mode}|${textFont}|${datetimeFont}|180|${sanitizeOledText(refs.oledText.value)}|scanning|7000|5|${eyeSize}|10`;
  }

  function resolveDeviceTimezoneOffsetMinutes(datetimeSettings = settings.oled?.datetimeSettings) {
    const normalized = normalizeDatetimeSettings(datetimeSettings);
    if (normalized.timezoneAuto) {
      return -new Date().getTimezoneOffset();
    }
    return getTimezoneOffsetMinutes(normalized.timezone);
  }

  function getDeviceTimeCommand() {
    const epoch = Math.floor(Date.now() / 1000);
    const datetimeSettings = normalizeDatetimeSettings(collectSettings().oled.datetimeSettings);
    const offset = resolveDeviceTimezoneOffsetMinutes(datetimeSettings);
    const format = datetimeSettings.use24HourFormat ? "24h" : "local";
    const autoMode = datetimeSettings.timezoneAuto ? "auto" : "manual";
    return `TIME|${epoch}|${offset}|${format}|${autoMode}`;
  }

  async function syncDeviceClock() {
    if (!activePort || !deviceVerified || deviceProtocolVersion < 15) {
      return;
    }
    try {
      await sendSerialCommandAndWait(getDeviceTimeCommand(), "time-updated", 4000);
    } catch (error) {
      // Clock sync is best-effort for datetime mode.
    }
  }

  function getDisplayResponseEvent() {
    return deviceProtocolVersion > 0 && deviceProtocolVersion < 3 && refs.oledMode.value === "text"
      ? "oled-updated"
      : "display-updated";
  }

  function getMelodyCommand(presetKey) {
    const preset = settings.buzzer.presets[presetKey] ?? createDefaultBuzzerPreset();
    const notes = normalizeMelodyNotes(preset.notes);
    return `MELODY|${presetKey}|${notes.length}|${notes.map((note) => `${note.frequency},${note.duration}`).join(";")}`;
  }

  async function sendBuzzerPresetsToDevice() {
    for (const key of buzzerSoundKeys) {
      const preset = settings.buzzer.presets[key] ?? createDefaultBuzzerPreset();
      if (preset.mode === "custom" && preset.notes.length) {
        await sendSerialCommandAndWait(getMelodyCommand(key), "melody-updated");
      }
      await sendSerialCommandAndWait(`BUZZER_SET|${key}|${preset.mode}`, "buzzer-updated");
    }
  }

  async function sendLightingColorsToDevice() {
    const scenes = settings.lighting?.scenes || createDefaultLightingSettings().scenes;
    for (const key of lightingSceneKeys) {
      const color = scenes[key] || lightingSceneDefaults[key];
      await sendSerialCommandAndWait(`LED_COLOR|${key}|${color}`, "led-color-updated");
    }
  }

  function formatRetinaSecurityProceedHint(actionLabel) {
    const detail = String(actionLabel || "").trim();
    if (!detail) {
      return "Place your finger to proceed";
    }
    return `Place your finger to proceed · ${detail}`;
  }

  async function authorizeBuiltInAdminFingerprint(actionLabel = "continue") {
    const normalizedActionLabel = String(actionLabel || "continue").trim() || "continue";
    if (!activePort || !deviceVerified) {
      setFeedback("Connect the retina scan controller before continuing. Retina Security is required.", "error");
      showDeviceSnackbar("Controller required", "Connect the retina scan controller to use Retina Security.", "error");
      return false;
    }
    if (!deviceCanAuthorizeBuiltInAdmin || deviceProtocolVersion < 8) {
      setFeedback("Upload firmware protocol 8 or newer to enable Retina Security.", "warning");
      return false;
    }
    const hasBuiltIn = builtInAdminSlotStatus[1] === true || builtInAdminSlotStatus[2] === true;
    const hasRegisteredExtra = visibleSavedFingerprintSlots().length > 0;
    const hasAnyTemplate = deviceFingerprintTemplates > 0 || hasBuiltIn || hasRegisteredExtra;
    if (!hasAnyTemplate) {
      setFeedback("No registered print found. Enroll a print in Retina Security settings first.", "error");
      return false;
    }
    if (deviceBusy) {
      setFeedback("Wait for the current device action to finish.", "warning");
      return false;
    }
    window.clearTimeout(oledPreviewTimer);
    oledPreviewTimer = 0;
    deviceBusy = true;
    syncConnectionUi();
    openScanModal({ actionLabel: normalizedActionLabel });
    setFeedback(`Retina Security · ${formatRetinaSecurityProceedHint(normalizedActionLabel)}`);
    const deadline = Date.now() + 90000;
    let lastMessage = "Retina Security did not authorize this action.";
    try {
      while (Date.now() < deadline && enrollModalOpen) {
        try {
          await sendSerialCommandAndWait(
            "FP_ADMIN_VERIFY",
            "fingerprint-admin-authorized",
            Math.max(4000, deadline - Date.now()),
          );
          setEnrollModalState({
            progress: 100,
            title: "Authorized",
            hint: `Retina Security verified · Continuing ${normalizedActionLabel}…`,
            status: "success",
          });
          setFeedback("Retina Security authorized.", "success");
          showDeviceSnackbar("Retina Security", "Authorized. Continuing the action.", "success");
          await waitMs(700);
          closeEnrollModal();
          return true;
        } catch (error) {
          lastMessage = error instanceof Error ? error.message : lastMessage;
          if (/cancel/i.test(lastMessage) || !enrollModalOpen) {
            break;
          }
          if (/timed out|did not confirm/i.test(lastMessage)) {
            break;
          }
          applyFingerprintRetryToModal(lastMessage);
          await waitMs(350);
        }
      }
      if (enrollModalOpen && enrollModalMode === "scan") {
        setEnrollModalState({
          progress: Math.max(18, enrollProgress),
          title: "Try again",
          hint: formatRetinaSecurityProceedHint(normalizedActionLabel),
          status: /cancel/i.test(lastMessage) ? "active" : "error",
        });
      }
      setFeedback(lastMessage, /cancel/i.test(lastMessage) ? "warning" : "error");
      if (!/cancel/i.test(lastMessage)) {
        showDeviceSnackbar("Retina Security", lastMessage, "error");
      }
      return false;
    } finally {
      deviceBusy = false;
      syncConnectionUi();
      if (!enrollModalOpen) {
        restoreScannerLightingAfterModal();
      }
    }
  }

  async function sendAllSettings() {
    if (!activePort || !deviceVerified) {
      setFeedback("Connect and detect a compatible retina scan controller before sending settings.", "error");
      return;
    }
    if (!isFirmwareUnlockedForEditing()) {
      setFeedback("Flash the latest firmware before applying settings.", "warning");
      return;
    }
    if (deviceBusy) {
      setFeedback("Wait for the current device action to finish.", "warning");
      return;
    }
    settings = collectSettings();
    for (const key of buzzerSoundKeys) {
      const preset = settings.buzzer.presets[key];
      if (preset?.mode === "custom" && !preset.notes.length) {
        setFeedback(`Upload a ${key} melody file before using the custom sound option.`, "error");
      return;
      }
    }
    if (!await authorizeBuiltInAdminFingerprint("apply and save the device settings")) {
      return;
    }
    deviceBusy = true;
    window.clearTimeout(oledPreviewTimer);
    oledPreviewTimer = 0;
    syncConnectionUi();
    setFeedback("Sending lighting, buzzer, and OLED display settings to the controller...");
    try {
      await syncDeviceClock();
      await sendSerialCommandAndWait(getDisplayCommand(), getDisplayResponseEvent());
      await sendLightingColorsToDevice();
      await sendBuzzerPresetsToDevice();
      await sendSerialCommandAndWait("CONFIG_SAVE", "config-saved");
      const savedToServer = await saveSettings({ keepFeedback: true });
      if (!savedToServer) {
        addActivity("Device storage was updated, but saving the settings copy failed.", "error");
        return;
      }
      commitPendingFingerprintSlots();
      markSettingsCommitted(settings);
      setFeedback("Configuration and fingerprints sent to the device and saved.", "success");
      addActivity("Lighting, buzzer, and OLED configuration saved to the controller.", "success");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to apply settings to the device.", "error");
      addActivity("Unable to apply settings to the device.", "error");
    } finally {
      deviceBusy = false;
      syncConnectionUi();
    }
  }

  async function handleFingerprintAction(action) {
    if (!isFirmwareUnlockedForEditing()) {
      setFeedback("Flash the latest firmware before using fingerprint actions.", "warning");
      return;
    }
    if (action === "FP_VERIFY") {
      await runDeviceCommand("FP_VERIFY", "Place a finger on the scanner...", {
        expectedEvents: ["fingerprint-match"],
        timeoutMs: 90000,
        successMessage: "Fingerprint verification completed.",
      });
      return;
    }
    if (action === "FP_ENROLL") {
      await startFingerprintEnrollment();
    }
  }

  function isBuiltInFingerprintSlot(slot) {
    return slot === 1 || slot === 2;
  }

  function normalizeRegisteredFingerprintSlots(value) {
    const seen = new Set();
    const slots = [];
    for (const entry of Array.isArray(value) ? value : []) {
      const slot = Number(entry);
      if (!Number.isInteger(slot) || isBuiltInFingerprintSlot(slot) || slot < 3 || slot > deviceFingerprintCapacity || seen.has(slot)) {
        continue;
      }
      seen.add(slot);
      slots.push(slot);
    }
    return slots;
  }

  function loadRegisteredFingerprintSlotsFromStorage() {
    try {
      return normalizeRegisteredFingerprintSlots(
        JSON.parse(window.localStorage.getItem(registeredFingerprintsStorageKey) || "[]"),
      );
    } catch (error) {
      return [];
    }
  }

  function persistRegisteredFingerprintSlots() {
    try {
      window.localStorage.setItem(
        registeredFingerprintsStorageKey,
        JSON.stringify(committedFingerprintSlots()),
      );
    } catch (error) {
      // Ignore private-mode or quota failures.
    }
  }

  function committedFingerprintSlots() {
    return savedFingerprintSlots.filter((slot) => !isBuiltInFingerprintSlot(slot));
  }

  function visibleSavedFingerprintSlots() {
    const committed = committedFingerprintSlots();
    const pending = pendingFingerprintSlots.filter(
      (slot) => !isBuiltInFingerprintSlot(slot) && !committed.includes(slot),
    );
    return [...committed, ...pending];
  }

  function isPendingFingerprintSlot(slot) {
    return pendingFingerprintSlots.includes(Number(slot));
  }

  function extraFingerprintNumber(slot) {
    const extras = visibleSavedFingerprintSlots();
    const index = extras.indexOf(slot);
    return index >= 0 ? index + 1 : extras.length + 1;
  }

  function extraFingerprintLabel(slot) {
    const base = `Fingerprint ${extraFingerprintNumber(slot)}`;
    return isPendingFingerprintSlot(slot) ? `${base} · Unsaved` : base;
  }

  function rememberPendingFingerprintSlot(value) {
    const slot = Number(value);
    if (!Number.isInteger(slot) || isBuiltInFingerprintSlot(slot) || slot < 3) {
      return;
    }
    if (!pendingFingerprintSlots.includes(slot) && !savedFingerprintSlots.includes(slot)) {
      pendingFingerprintSlots = [...pendingFingerprintSlots, slot];
    }
    renderSavedFingerprintGrid();
    settingsDirty = true;
    scheduleSyncConnectionUi();
  }

  function commitPendingFingerprintSlots() {
    if (!pendingFingerprintSlots.length) {
      renderSavedFingerprintGrid();
      return 0;
    }
    const count = pendingFingerprintSlots.length;
    for (const slot of pendingFingerprintSlots) {
      if (!savedFingerprintSlots.includes(slot)) {
        savedFingerprintSlots = [...savedFingerprintSlots, slot];
      }
    }
    pendingFingerprintSlots = [];
    persistRegisteredFingerprintSlots();
    renderSavedFingerprintGrid();
    addActivity(
      `Saved ${count} fingerprint${count === 1 ? "" : "s"}. They will keep after refresh.`,
      "success",
    );
    return count;
  }

  function forgetFingerprintSlot(value) {
    const slot = Number(value);
    savedFingerprintSlots = savedFingerprintSlots.filter((entry) => entry !== slot);
    pendingFingerprintSlots = pendingFingerprintSlots.filter((entry) => entry !== slot);
    persistRegisteredFingerprintSlots();
    renderSavedFingerprintGrid();
    settingsDirty = true;
    scheduleSyncConnectionUi();
  }

  async function discardPendingFingerprintSlots(options = {}) {
    const slots = [...pendingFingerprintSlots];
    pendingFingerprintSlots = [];
    renderSavedFingerprintGrid();
    try {
      settingsDirty = Boolean(committedSettingsKey) && buildSettingsCommitKey() !== committedSettingsKey;
    } catch (error) {
      settingsDirty = false;
    }
    scheduleSyncConnectionUi();
    if (!options.deleteFromDevice || !slots.length || !activePort || !deviceVerified) {
      return;
    }
    for (const slot of slots) {
      try {
        await sendSerialCommandAndWait(`FP_DELETE|${slot}`, "fingerprint-deleted", 5000);
      } catch (error) {
        if (!options.quiet) {
          addActivity(`Unable to remove unsaved fingerprint slot ${slot} from the scanner.`, "error");
        }
      }
    }
  }

  async function reconcileUnsavedFingerprintSlotsWithDevice() {
    if (!activePort || !deviceVerified || !deviceCanListFingerprintSlots) {
      return;
    }
    const response = await sendSerialCommandAndWait("FP_SLOTS", "fingerprint-slots", 12000);
    const deviceSlots = normalizeRegisteredFingerprintSlots(response?.slots);
    const keep = new Set([
      ...committedFingerprintSlots(),
      ...pendingFingerprintSlots,
    ]);
    let removed = 0;
    for (const slot of deviceSlots) {
      if (isBuiltInFingerprintSlot(slot) || keep.has(slot)) {
        continue;
      }
      try {
        await sendSerialCommandAndWait(`FP_DELETE|${slot}`, "fingerprint-deleted", 5000);
        removed += 1;
      } catch (error) {
        addActivity(`Unable to clear unsaved scanner slot ${slot}.`, "error");
      }
    }
    if (removed > 0) {
      addActivity(
        `Removed ${removed} unsaved fingerprint${removed === 1 ? "" : "s"} from the scanner.`,
        "success",
      );
    }
    renderSavedFingerprintGrid();
  }

  function scrollFingerprintCarousel(direction = 1) {
    const track = refs?.printGrid;
    if (!(track instanceof HTMLElement)) {
      return;
    }
    const firstCard = track.querySelector(":scope > *");
    const gap = 12;
    const cardWidth = firstCard instanceof HTMLElement
      ? firstCard.getBoundingClientRect().width
      : 132;
    const visibleCount = Math.max(1, Math.floor((track.clientWidth + gap) / (cardWidth + gap)));
    track.scrollBy({
      left: (cardWidth + gap) * visibleCount * (direction < 0 ? -1 : 1),
      behavior: "smooth",
    });
  }

  function syncFingerprintCarouselControls() {
    const track = refs?.printGrid;
    const prevButton = refs?.printCarouselPrev;
    const nextButton = refs?.printCarouselNext;
    if (!(track instanceof HTMLElement)) {
      return;
    }
    const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
    const canScroll = maxScroll > 6;
    [prevButton, nextButton].forEach((button) => {
      if (button instanceof HTMLElement) {
        button.hidden = !canScroll;
      }
    });
    if (prevButton instanceof HTMLElement) {
      prevButton.disabled = !canScroll || track.scrollLeft <= 4;
    }
    if (nextButton instanceof HTMLElement) {
      nextButton.disabled = !canScroll || track.scrollLeft >= maxScroll - 4;
    }
  }

  function bindFingerprintCarousel() {
    const track = refs?.printGrid;
    if (!(track instanceof HTMLElement)) {
      return;
    }
    if (track.dataset.cardCarouselBound !== "true") {
      track.dataset.cardCarouselBound = "true";
      track.addEventListener("scroll", syncFingerprintCarouselControls, { passive: true });
      window.addEventListener("resize", syncFingerprintCarouselControls);
      refs.printCarouselPrev?.addEventListener("click", () => scrollFingerprintCarousel(-1));
      refs.printCarouselNext?.addEventListener("click", () => scrollFingerprintCarousel(1));
    }
    window.requestAnimationFrame(syncFingerprintCarouselControls);
  }

  function renderSavedFingerprintGrid() {
    if (!refs?.printGrid) {
      return;
    }
    const visibleSlots = visibleSavedFingerprintSlots();
    const enrollCard = `
      <article class="admin-biometric-print-card admin-biometric-print-card--insert">
        <button
          type="button"
          class="admin-biometric-print-card__preview admin-biometric-print-dropzone"
          data-biometric-enroll-trigger
          data-biometric-device-action="FP_ENROLL"
        >
          <span class="admin-biometric-print-dropzone__icon" aria-hidden="true">${fingerprintIconMarkup}</span>
          <strong>Enroll fingerprint</strong>
          <span class="admin-biometric-print-dropzone__or">or</span>
          <span class="admin-biometric-print-dropzone__browse">Scan finger</span>
        </button>
        <strong>Enroll fingerprint</strong>
      </article>`;
    const savedCards = visibleSlots.map((slot) => `
      <article class="admin-biometric-print-card${isPendingFingerprintSlot(slot) ? " is-unsaved" : ""}">
        <div class="admin-biometric-print-card__preview">
          <span class="admin-biometric-print-card__glyph" aria-hidden="true">${fingerprintIconMarkup}</span>
          <button
            type="button"
            class="admin-biometric-print-card__remove"
            data-biometric-delete-slot="${slot}"
            aria-label="Delete ${extraFingerprintLabel(slot)}"
            ${!deviceVerified || deviceBusy ? "disabled" : ""}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M18 6 6 18"></path>
              <path d="m6 6 12 12"></path>
            </svg>
          </button>
        </div>
        <strong>${extraFingerprintLabel(slot)}</strong>
      </article>`).join("");
    refs.printGrid.innerHTML = `${enrollCard}${savedCards}`;
    const enrollTrigger = refs.printGrid.querySelector("[data-biometric-enroll-trigger]");
    if (enrollTrigger instanceof HTMLElement) {
      enrollTrigger.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        void startFingerprintEnrollment();
      });
    }
    bindFingerprintCarousel();
    syncConnectionUi();
  }

  async function handleFingerprintSlotDelete(slot) {
    if (!Number.isInteger(slot) || isBuiltInFingerprintSlot(slot) || slot < 3 || slot > deviceFingerprintCapacity) {
      setFeedback("That fingerprint cannot be deleted.", "error");
      return;
    }
    const label = extraFingerprintLabel(slot);
    const confirmed = await openDeleteFingerprintModal(label);
    if (!confirmed) {
      return;
    }
    await runDeviceCommand(`FP_DELETE|${slot}`, `Deleting ${label}...`, {
      expectedEvents: "fingerprint-deleted",
      timeoutMs: 5000,
      successMessage: `${label} deleted.`,
    });
  }

  function ensureDeleteFingerprintModal() {
    if (deleteModal?.root?.isConnected) {
      return deleteModal;
    }
    const overlay = document.createElement("div");
    overlay.className = "admin-biometric-delete-overlay";
    overlay.hidden = true;
    overlay.dataset.biometricDeleteOverlay = "true";
    overlay.innerHTML = `
      <div
        class="admin-biometric-delete-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-biometric-delete-title"
        tabindex="-1"
        data-biometric-delete-dialog
      >
        <header class="admin-biometric-delete-modal__header">
          <h2 id="admin-biometric-delete-title">Delete fingerprint</h2>
          <button type="button" class="admin-biometric-delete-modal__close" data-biometric-delete-cancel aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M18 6 6 18"></path>
              <path d="m6 6 12 12"></path>
            </svg>
          </button>
        </header>
        <div class="admin-biometric-delete-modal__body">
          <span class="admin-biometric-delete-modal__icon" aria-hidden="true">${fingerprintIconMarkup}</span>
          <p class="admin-biometric-delete-modal__lead" data-biometric-delete-lead>Delete this fingerprint?</p>
          <p class="admin-biometric-delete-modal__hint" data-biometric-delete-hint>
            This removes the saved print from the scanner. This cannot be undone.
          </p>
        </div>
        <footer class="admin-biometric-delete-modal__actions">
          <button type="button" class="admin-biometric-button is-secondary" data-biometric-delete-cancel>Cancel</button>
          <button type="button" class="admin-biometric-button is-danger" data-biometric-delete-confirm>Delete</button>
        </footer>
      </div>
    `;
    document.body.appendChild(overlay);
    deleteModal = {
      root: overlay,
      dialog: overlay.querySelector("[data-biometric-delete-dialog]"),
      lead: overlay.querySelector("[data-biometric-delete-lead]"),
      hint: overlay.querySelector("[data-biometric-delete-hint]"),
      confirmButton: overlay.querySelector("[data-biometric-delete-confirm]"),
      cancelButtons: Array.from(overlay.querySelectorAll("[data-biometric-delete-cancel]")),
    };
    return deleteModal;
  }

  function openDeleteFingerprintModal(label) {
    const modal = ensureDeleteFingerprintModal();
    if (modal.lead) {
      modal.lead.textContent = `Delete ${label}?`;
    }
    if (modal.hint) {
      modal.hint.textContent = `${label} will be removed from the scanner. You can enroll a new fingerprint anytime.`;
    }
    modal.root.hidden = false;
    modal.root.removeAttribute("hidden");
    document.body.classList.add("admin-biometric-delete-open");
    window.requestAnimationFrame(() => {
      modal.root.classList.add("is-open");
      modal.confirmButton?.focus?.({ preventScroll: true });
    });
    return new Promise((resolve) => {
      const finish = (confirmed) => {
        modal.root.classList.remove("is-open");
        document.body.classList.remove("admin-biometric-delete-open");
        window.setTimeout(() => {
          modal.root.hidden = true;
          modal.root.setAttribute("hidden", "");
        }, 180);
        modal.cancelButtons.forEach((button) => button.removeEventListener("click", onCancel));
        modal.confirmButton?.removeEventListener("click", onConfirm);
        modal.root.removeEventListener("click", onOverlay);
        document.removeEventListener("keydown", onKeydown);
        resolve(confirmed);
      };
      const onCancel = () => finish(false);
      const onConfirm = () => finish(true);
      const onOverlay = (event) => {
        if (event.target === modal.root) {
          finish(false);
        }
      };
      const onKeydown = (event) => {
        if (event.key === "Escape") {
          finish(false);
        }
      };
      modal.cancelButtons.forEach((button) => button.addEventListener("click", onCancel));
      modal.confirmButton?.addEventListener("click", onConfirm);
      modal.root.addEventListener("click", onOverlay);
      document.addEventListener("keydown", onKeydown);
    });
  }

  function ensureEnrollModal() {
    if (enrollModal?.root?.isConnected) {
      return enrollModal;
    }

    const overlay = document.createElement("div");
    overlay.className = "admin-biometric-enroll-overlay";
    overlay.hidden = true;
    overlay.dataset.biometricEnrollOverlay = "true";
    overlay.innerHTML = `
      <div
        class="admin-biometric-enroll-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-biometric-enroll-title"
        tabindex="-1"
        data-biometric-enroll-dialog
      >
        <header class="admin-biometric-enroll-modal__header">
          <button type="button" class="admin-biometric-enroll-modal__back" data-biometric-enroll-close aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <h2 id="admin-biometric-enroll-title" data-biometric-enroll-title>Fingerprint settings</h2>
          <button type="button" class="admin-biometric-enroll-modal__cancel" data-biometric-enroll-close>Cancel</button>
        </header>
        <div class="admin-biometric-enroll-modal__body">
          <span class="admin-biometric-enroll-modal__badge" aria-hidden="true">${fingerprintIconMarkup}</span>
          <p class="admin-biometric-enroll-modal__lead" data-biometric-enroll-lead>Set up your fingerprint</p>
          <div class="admin-biometric-enroll-modal__glyph" data-biometric-enroll-glyph aria-hidden="true">
            <span class="admin-biometric-enroll-modal__glyph-base">${fingerprintIconMarkup}</span>
            <span class="admin-biometric-enroll-modal__glyph-fill" data-biometric-enroll-fill>${fingerprintIconMarkup}</span>
          </div>
          <p class="admin-biometric-enroll-modal__hint" data-biometric-enroll-hint>
            Scan the same finger twice. Already registered prints cannot be enrolled again.
          </p>
          <div class="admin-biometric-enroll-modal__steps" data-biometric-enroll-steps aria-hidden="true">
            <i></i><i></i>
          </div>
        </div>
      </div>
    `;

    const dialog = overlay.querySelector("[data-biometric-enroll-dialog]");
    const heading = overlay.querySelector("[data-biometric-enroll-title]");
    const lead = overlay.querySelector("[data-biometric-enroll-lead]");
    const hint = overlay.querySelector("[data-biometric-enroll-hint]");
    const fill = overlay.querySelector("[data-biometric-enroll-fill]");
    const steps = overlay.querySelector("[data-biometric-enroll-steps]");
    const glyph = overlay.querySelector("[data-biometric-enroll-glyph]");

    overlay.querySelectorAll("[data-biometric-enroll-close]").forEach((button) => {
      button.addEventListener("click", () => closeEnrollModal());
    });
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        closeEnrollModal();
      }
    });
    if (!window.gmsBiometricEnrollEscapeBound) {
      window.gmsBiometricEnrollEscapeBound = true;
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && enrollModalOpen) {
          closeEnrollModal();
        }
      });
    }

    document.body.appendChild(overlay);
    enrollModal = { root: overlay, dialog, heading, lead, hint, fill, steps, glyph };
    return enrollModal;
  }

  function setEnrollModalState({
    progress = enrollProgress,
    step = enrollStep,
    title,
    hint,
    status = "active",
  } = {}) {
    const modal = ensureEnrollModal();
    enrollProgress = Math.max(0, Math.min(100, Number(progress) || 0));
    enrollStep = Math.max(0, Math.min(enrollScanTotal, Number(step) || 0));
    modal.root.dataset.status = status;
    modal.root.dataset.mode = enrollModalMode;
    modal.fill.style.setProperty("--enroll-progress", `${enrollProgress}%`);
    modal.glyph.dataset.progress = String(Math.round(enrollProgress));
    if (modal.steps) {
      modal.steps.hidden = enrollModalMode === "scan";
    }
    if (typeof title === "string" && title.trim()) {
      modal.lead.textContent = title.trim();
    }
    if (typeof hint === "string" && hint.trim()) {
      modal.hint.textContent = hint.trim();
    }
    Array.from(modal.steps.children).forEach((dot, index) => {
      dot.classList.toggle("is-done", index < enrollStep);
      dot.classList.toggle("is-current", index === enrollStep - 1 || (enrollStep === 0 && index === 0 && status === "active"));
    });
  }

  function applyFingerprintRetryToModal(detail) {
    const hint = String(detail || "That scan did not match. Stay on this same step and try again.").trim();
    setFeedback(hint, "error");
    if (!enrollModalOpen) {
      return;
    }
    setEnrollModalState({
      progress: Math.max(18, enrollProgress),
      step: enrollStep,
      title: "Try again",
      hint,
      status: "error",
    });
  }

  function applyFingerprintStageToModal(detail) {
    if (!enrollModalOpen) {
      return;
    }
    if (enrollModalMode === "scan") {
      const retry = /try again|retry|unclear|wrong fingerprint|not a super admin/i.test(String(detail || ""));
      setEnrollModalState({
        progress: retry ? Math.max(18, enrollProgress) : 48,
        title: retry ? "Try again" : "Place your finger to proceed",
        hint: retry
          ? String(detail || "Keep your finger still until it is read.").trim()
          : formatRetinaSecurityProceedHint(retinaSecurityActionLabel),
        status: retry ? "error" : "active",
      });
      return;
    }
    updateEnrollModalFromStage(detail);
  }

  function updateEnrollModalFromStage(message) {
    if (!enrollModalOpen) {
      return;
    }
    const raw = String(message || "").trim();
    const detail = raw.toLowerCase();
    if (/already registered|cannot be enrolled again/.test(detail)) {
      return;
    }
    // Never show a "Scan captured" flash during enroll. That stage can arrive
    // right before fingerprint-already-registered and looks like a false success.
    if (/scan captured|captured\. continue|continue enrollment/.test(detail)) {
      return;
    }
    const scanMatch = detail.match(/scan\s+([1-2])\s+of\s+2/);
    if (scanMatch) {
      const scanNumber = Math.max(1, Math.min(enrollScanTotal, Number(scanMatch[1]) || 1));
      enrollStagesSeen.add(scanNumber);
      const scanGuidance = [
        {
          title: "Scan 1 of 2",
          hint: "Place your finger flat on the scanner",
        },
        {
          title: "Scan 2 of 2",
          hint: "Lift, then place the same finger again",
        },
      ][scanNumber - 1];
      const retrying = /try again|retry|unclear|did not match/.test(detail);
      setEnrollModalState({
        progress: [28, 72][scanNumber - 1],
        step: scanNumber,
        title: retrying ? "Try that scan again" : scanGuidance.title,
        hint: retrying
          ? `${raw} · Scan ${scanNumber} of ${enrollScanTotal}`
          : `${scanGuidance.hint} · Then lift your finger`,
        status: retrying ? "error" : "active",
      });
      return;
    }
    if (/confirm/.test(detail)) {
      setEnrollModalState({
        progress: 92,
        step: enrollScanTotal,
        title: "Final confirm scan",
        hint: "Place the same finger one more time to confirm registration",
        status: "active",
      });
      return;
    }
    if (/try again|retry|unclear|did not match|wrong fingerprint|already registered/.test(detail)) {
      setEnrollModalState({
        progress: Math.max(18, enrollProgress),
        step: enrollStep,
        title: /already registered/.test(detail) ? "Already registered" : "Try that scan again",
        hint: raw || "Stay on this same step and scan again.",
        status: "error",
      });
      return;
    }
    if (detail.includes("remove") || detail.includes("lift")) {
      setEnrollModalState({
        progress: Math.min(88, enrollProgress + 8),
        step: enrollStep,
        title: "Lift your finger",
        hint: "Remove your finger completely before the next scan",
        status: "active",
      });
    }
  }

  function openFingerprintModal(mode, { heading, title, hint, progress = 12, step = 0 } = {}) {
    const modal = ensureEnrollModal();
    enrollModalMode = mode === "scan" ? "scan" : "enroll";
    enrollModalOpen = true;
    enrollSession += 1;
    lastSentLightingMode = "";
    document.body.classList.add("admin-biometric-enroll-open");
    modal.root.hidden = false;
    modal.root.removeAttribute("hidden");
    modal.root.classList.add("is-open");
    if (modal.heading) {
      modal.heading.textContent = heading
        || (enrollModalMode === "scan" ? "Retina Security" : "Fingerprint settings");
    }
    setEnrollModalState({
      progress,
      step,
      title,
      hint,
      status: "active",
    });
    syncDeviceLightingToUiState({ sticky: true });
    startLightingStateKeepalive();
    window.requestAnimationFrame(() => {
      modal.dialog?.focus?.({ preventScroll: true });
    });
  }

  function openScanModal(options = {}) {
    const actionLabel = String(options.actionLabel || "").trim();
    retinaSecurityActionLabel = actionLabel;
    openFingerprintModal("scan", {
      heading: "Retina Security",
      title: "Place your finger to proceed",
      hint: formatRetinaSecurityProceedHint(actionLabel),
      progress: 18,
      step: 0,
    });
  }

  function openEnrollModal() {
    enrollStagesSeen = new Set();
    lastAlreadyRegisteredStep = 0;
    retinaSecurityActionLabel = "";
    openFingerprintModal("enroll", {
      heading: "Fingerprint settings",
      title: "Scan 1 of 2",
      hint: "Place your finger flat on the scanner · Then lift your finger",
      progress: 28,
      step: 1,
    });
  }

  function resetEnrollModalToFirstStep(hint) {
    enrollStagesSeen = new Set();
    lastAlreadyRegisteredStep = 0;
    setEnrollModalState({
      progress: 28,
      step: 1,
      title: "Scan 1 of 2",
      hint: hint || "Place your finger flat on the scanner · Then lift your finger",
      status: "active",
    });
    syncDeviceLightingToUiState({ sticky: true });
  }

  function closeEnrollModal() {
    if (enrollModalOpen && pendingDeviceResponse && enrollModal?.root?.dataset.status !== "success") {
      rejectPendingDeviceResponse(new Error("Fingerprint scan cancelled."));
    }
    enrollModalOpen = false;
    retinaSecurityActionLabel = "";
    document.body.classList.remove("admin-biometric-enroll-open");
    void cancelActiveFingerprintOperation();
    if (!enrollModalOpen && !settingsPanelOpen) {
      stopLightingStateKeepalive();
    } else {
      startLightingStateKeepalive();
    }
    if (!enrollModal?.root) {
      return;
    }
    enrollModal.root.classList.remove("is-open");
    window.setTimeout(() => {
      if (!enrollModalOpen && enrollModal?.root) {
        enrollModal.root.hidden = true;
        enrollModal.root.setAttribute("hidden", "");
        enrollModal.root.dataset.status = "active";
      }
    }, 180);
  }

  function isAlreadyRegisteredMessage(message) {
    return /already registered|cannot be enrolled again/i.test(String(message || ""));
  }

  async function startFingerprintEnrollment() {
    // Each new click owns the latest generation. Older runs exit so we never
    // stack waits on the PC. The ESP cancels+restarts on FP_ENROLL_AUTO itself.
    const generation = ++enrollStartGeneration;

    if (!isFirmwareUnlockedForEditing()) {
      setFeedback(
        !activePort || !deviceVerified
          ? "Connect and detect the retina scan controller first."
          : "Flash the latest firmware before enrolling fingerprints.",
        "warning",
      );
      return;
    }

    if (pendingDeviceResponse) {
      rejectPendingDeviceResponse(new Error("Fingerprint scan cancelled."));
    }

    openEnrollModal();
    const session = enrollSession;
    if (!activePort || !deviceVerified) {
      setEnrollModalState({
        status: "error",
        title: "Controller not connected",
        hint: "Connect the retina scan controller first, then try enroll again.",
      });
      setFeedback("Connect and detect a compatible retina scan controller first.", "error");
      return;
    }

    // Show the real Scan 1 copy immediately — do not wait for the ESP stage event.
    setEnrollModalState({
      progress: 28,
      step: 1,
      title: "Scan 1 of 2",
      hint: "Place your finger flat on the scanner · Then lift your finger",
      status: "active",
    });

    const busyToken = ++deviceBusyToken;
    deviceBusy = true;
    syncConnectionUi();
    try {
      while (enrollModalOpen && enrollSession === session && enrollStartGeneration === generation) {
        try {
          setFeedback("Enrolling fingerprint...");
          lastAlreadyRegisteredStep = 0;
          lastSentLightingMode = "";
          syncDeviceLightingToUiState({ sticky: true });
          if (pendingDeviceResponse) {
            rejectPendingDeviceResponse(new Error("Fingerprint scan cancelled."));
          }
          // Send enroll immediately. If a prior enroll is still unwinding on the
          // ESP, firmware cancels it and keeps only this latest FP_ENROLL_AUTO.
          const response = await sendSerialCommandAndWait("FP_ENROLL_AUTO", "fingerprint-enrolled", 260000);
          if (
            enrollStartGeneration !== generation
            || enrollSession !== session
            || !enrollModalOpen
          ) {
            return;
          }
          const slot = clampInteger(response?.id, 3, deviceFingerprintCapacity, 3);
          rememberPendingFingerprintSlot(slot);
          const label = extraFingerprintLabel(slot);
          addActivity(`${label} added. Save settings to keep it after refresh.`, "success");
          setEnrollModalState({
            progress: 100,
            step: enrollScanTotal,
            title: "Fingerprint enrolled",
            hint: `${label} is in Registered. Save settings to keep it.`,
            status: "success",
          });
          setFeedback(`${label} added. Save settings to keep it after refresh.`, "success");
          showDeviceSnackbar("Fingerprint enrolled", `${label} · Save to keep`, "success");
          window.setTimeout(() => {
            if (enrollSession === session && enrollStartGeneration === generation) {
              closeEnrollModal();
            }
          }, 1400);
          return;
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unable to enroll fingerprint.";
          if (
            enrollStartGeneration !== generation
            || enrollSession !== session
            || /cancel/i.test(message)
            || !enrollModalOpen
          ) {
            return;
          }
          if (isAlreadyRegisteredMessage(message)) {
            const pastFirstStep = lastAlreadyRegisteredStep >= 2
              || enrollStagesSeen.has(2)
              || enrollStep >= 2;
            if (pastFirstStep) {
              resetEnrollModalToFirstStep(
                "That finger is already registered. Place a new finger to start Scan 1 of 2 again.",
              );
              setFeedback("Already registered. Restarting from Scan 1.", "warning");
              showDeviceSnackbar("Already registered", "Start again from Scan 1 with a new finger.", "warning");
              await waitMs(700);
              continue;
            }
            setEnrollModalState({
              status: "error",
              title: "Already registered",
              hint: "This fingerprint is already saved and cannot be enrolled again.",
            });
            setFeedback("This fingerprint is already registered.", "error");
            showDeviceSnackbar("Already registered", "Enrollment closed because this print is already saved.", "error");
            await waitMs(1500);
            if (enrollSession === session && enrollStartGeneration === generation) {
              closeEnrollModal();
            }
            return;
          }
          setEnrollModalState({
            status: "error",
            title: "Enrollment failed",
            hint: message,
          });
          setFeedback(message, "error");
          showDeviceSnackbar("Enrollment failed", message, "error");
          return;
        }
      }
    } finally {
      if (deviceBusyToken === busyToken) {
        deviceBusy = false;
        syncConnectionUi();
        if (!enrollModalOpen) {
          restoreScannerLightingAfterModal();
        }
      }
    }
  }

  function parseMelodyFileContent(rawText) {
    const text = String(rawText ?? "").trim();
    if (!text) {
      throw new Error("The melody file is empty.");
    }
    try {
      const parsed = JSON.parse(text);
      const notes = Array.isArray(parsed) ? parsed : parsed?.notes;
      if (Array.isArray(notes)) {
        const normalized = normalizeMelodyNotes(notes.map((note) => ({
          frequency: note?.frequency ?? note?.freq ?? note?.tone,
          duration: note?.duration ?? note?.ms ?? note?.length,
        })));
        if (normalized.length) {
          return normalized;
        }
      }
    } catch (error) {
      // Fall back to freq:duration or freq,duration text pairs.
    }
    const matches = [...text.matchAll(/(\d{1,4})\s*[:,]\s*(\d{1,4})/g)];
    const notes = normalizeMelodyNotes(matches.map((match) => ({
      frequency: Number(match[1]),
      duration: Number(match[2]),
    })));
    if (!notes.length) {
      throw new Error("Use JSON notes or text pairs such as 880:120, 1047:180.");
    }
    return notes;
  }

  function parseFontProfileFileContent(text, allowedPresets, fallbackPreset) {
    const trimmed = String(text || "").trim();
    if (!trimmed) {
      throw new Error("The font profile file is empty.");
    }
    let preset = fallbackPreset;
    let profileName = "";
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object") {
        const requestedPreset = String(parsed.preset ?? parsed.font ?? parsed.style ?? fallbackPreset)
          .trim()
          .toLowerCase();
        if (allowedPresets.has(requestedPreset)) {
          preset = requestedPreset;
        }
        profileName = String(parsed.name ?? parsed.profileName ?? parsed.label ?? "")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 80);
      }
    } catch (error) {
      const inlinePreset = trimmed.toLowerCase();
      if (allowedPresets.has(inlinePreset)) {
        preset = inlinePreset;
      } else {
        throw new Error('Use JSON like {"preset":"bold","name":"My font"} or a plain preset name.');
      }
    }
    if (!allowedPresets.has(preset)) {
      throw new Error("The font preset in that file is not supported on this OLED.");
    }
    return { preset, profileName };
  }

  async function handleOledFontUpload(fontKind, event) {
    const uploadInput = fontKind === "datetime"
      ? refs.oledDatetimeFontUpload
      : refs.oledTextFontUpload;
    const select = fontKind === "datetime" ? refs.oledDatetimeFont : refs.oledTextFont;
    const allowedPresets = fontKind === "datetime" ? allowedDatetimeFonts : allowedFonts;
    const fallbackPreset = fontKind === "datetime" ? "clock-xl" : "medium";
    const labels = fontKind === "datetime" ? oledDatetimeFontLabels : oledTextFontLabels;
    const input = event?.target instanceof HTMLInputElement ? event.target : uploadInput;
    const file = input?.files?.[0];
    if (input) {
      input.value = "";
    }
    if (!file) {
      return;
    }
    if (file.size > 16 * 1024) {
      setFeedback("Keep OLED font profile files under 16 KB.", "error");
      return;
    }
    try {
      const profile = parseFontProfileFileContent(await file.text(), allowedPresets, fallbackPreset);
      const profileName = profile.profileName
        || melodyDisplayNameFromFileName(file.name, labels[profile.preset] || "Custom font");
      settings = collectSettings();
      settings.oled.fonts[fontKind] = normalizeOledFontProfile(
        { preset: profile.preset, profileName },
        allowedPresets,
        fallbackPreset,
      );
      settings.oled.font = settings.oled.fonts.text.preset;
      if (fontKind === "datetime") {
        if (refs.oledMode) {
          refs.oledMode.value = "datetime";
        }
        settings.oled.mode = "datetime";
      } else {
        if (refs.oledMode) {
          refs.oledMode.value = "text";
        }
        settings.oled.mode = "text";
        if (refs.oledText && !String(refs.oledText.value || "").trim()) {
          refs.oledText.value = "GMS BOLD";
        }
      }
      if (select) {
        select.value = profile.preset;
      }
      syncVisualPreviews();
      syncOledFontUi(fontKind);
      handleOledEditorChange();
      setFeedback(
        `${fontKind === "datetime" ? "Clock" : "Text"} font applied on OLED (${labels[profile.preset] || profile.preset}).`,
        "success",
      );
      addActivity(`Loaded ${fontKind} OLED font profile ${profileName}.`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to read the font profile file.", "error");
    }
  }

  function syncOledFontUi(fontKind) {
    const profile = settings.oled.fonts?.[fontKind] ?? createDefaultOledFontProfile(fontKind === "datetime" ? "clock-xl" : "medium");
    const labels = fontKind === "datetime" ? oledDatetimeFontLabels : oledTextFontLabels;
    const allowedPresets = fontKind === "datetime" ? allowedDatetimeFonts : allowedFonts;
    const select = fontKind === "datetime" ? refs.oledDatetimeFont : refs.oledTextFont;
    const nameNode = fontKind === "datetime" ? refs.oledDatetimeFontName : refs.oledTextFontName;
    const preset = allowedPresets.has(profile.preset) ? profile.preset : (fontKind === "datetime" ? "clock-xl" : "medium");
    const defaultLabel = labels[preset] || preset;
    const customLabel = profile.profileName
      ? melodyDisplayNameFromFileName(profile.profileName, defaultLabel)
      : "";
    if (select) {
      select.value = preset;
      syncBiometricSelectOptionLabel(select, preset, customLabel || defaultLabel);
    }
    if (nameNode) {
      nameNode.textContent = profile.profileName
        ? `${customLabel || defaultLabel} · preset ${preset}`
        : "No font profile uploaded.";
    }
  }

  function melodyDisplayNameFromFileName(fileName, fallback = "Custom melody") {
    const base = String(fileName || "")
      .replace(/^.*[\\/]/, "")
      .replace(/\.[^.]+$/, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80);
    return base || fallback;
  }

  function syncBiometricSelectOptionLabel(select, value, labelText) {
    if (!(select instanceof HTMLSelectElement)) {
      return;
    }
    const option = select.querySelector(`option[value="${value}"]`);
    if (option) {
      option.textContent = labelText;
    }
    const entry = biometricSelectDropdowns.find((item) => item.select === select);
    if (!entry) {
      return;
    }
    const menuOption = entry.options.find((button) => button.dataset.biometricSelectOption === value);
    if (menuOption) {
      menuOption.textContent = labelText;
    }
    syncBiometricSelectDropdown(entry);
  }

  async function handleBuzzerMelodyUpload(presetKey, event) {
    const input = event?.target instanceof HTMLInputElement ? event.target : refs.buzzerUploads[presetKey];
    const file = input?.files?.[0];
    if (input) {
      input.value = "";
    }
    if (!file) {
      return;
    }
    if (file.size > 64 * 1024) {
      setFeedback("Keep buzzer melody files under 64 KB.", "error");
      return;
    }
    try {
      settings = collectSettings();
      const preset = settings.buzzer.presets[presetKey] ?? createDefaultBuzzerPreset();
      const library = Array.isArray(preset.library) ? preset.library : [];
      if (library.length >= maxBuzzerMelodiesPerSound) {
        setFeedback(`Each sound can store up to ${maxBuzzerMelodiesPerSound} uploaded melodies.`, "error");
        return;
      }
      const notes = parseMelodyFileContent(await file.text());
      const melodyName = melodyDisplayNameFromFileName(
        file.name,
        `${buzzerSoundLabels[presetKey]} melody`,
      );
      const entry = normalizeBuzzerMelodyLibraryEntry({
        id: createBuzzerMelodyId(),
        melodyName,
        notes,
      });
      if (!entry) {
        throw new Error("The melody file did not contain any playable notes.");
      }
      preset.library = [...library, entry];
      preset.mode = "custom";
      preset.selectedMelodyId = entry.id;
      preset.notes = entry.notes;
      preset.melodyName = entry.melodyName;
      settings.buzzer.presets[presetKey] = normalizeBuzzerPreset(preset, preset);
      syncBuzzerPresetUi(presetKey);
      notifySettingsEdited();
      setFeedback(
        `${buzzerSoundLabels[presetKey]} melody added (${notes.length} note${notes.length === 1 ? "" : "s"}).`,
        "success",
      );
      addActivity(`Added ${presetKey} buzzer melody ${melodyName}.`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to read the melody file.", "error");
    }
  }

  function syncBuzzerPresetUi(presetKey) {
    const preset = settings.buzzer.presets[presetKey] ?? createDefaultBuzzerPreset();
    const nameNode = refs.buzzerNames?.[presetKey];
    const modeSelect = refs.buzzerModes?.[presetKey];
    const library = Array.isArray(preset.library) ? preset.library : [];
    refreshBiometricSelectOptions(modeSelect, buildBuzzerModeOptions(presetKey));
    if (modeSelect) {
      modeSelect.value = getBuzzerModeSelectValue(preset);
      const entry = biometricSelectDropdowns.find((item) => item.select === modeSelect);
      if (entry) {
        syncBiometricSelectDropdown(entry);
      }
    }
    if (nameNode) {
      if (!library.length) {
        nameNode.textContent = "No melodies uploaded.";
      } else {
        nameNode.textContent = `${library.length} uploaded melod${library.length === 1 ? "y" : "ies"}.`;
      }
    }
  }

  async function testBuzzerPreset(presetKey) {
    settings = collectSettings();
    const preset = settings.buzzer.presets[presetKey] ?? createDefaultBuzzerPreset();
    if (preset.mode === "custom" && !preset.notes.length) {
      setFeedback(`Upload a ${presetKey} melody file before testing the custom option.`, "error");
        return;
      }
      if (!activePort || !deviceVerified) {
        setFeedback("Connect and detect a compatible retina scan controller first.", "error");
        return;
      }
      if (!isFirmwareUnlockedForEditing()) {
        setFeedback("Flash the latest firmware before testing the buzzer.", "warning");
        return;
      }
      if (deviceBusy) {
        setFeedback("Wait for the current device action to finish.", "warning");
        return;
      }
      deviceBusy = true;
      syncConnectionUi();
      try {
      if (preset.mode === "custom" && preset.notes.length) {
        await sendSerialCommandAndWait(getMelodyCommand(presetKey), "melody-updated");
      }
      await sendSerialCommandAndWait(`BUZZER_SET|${presetKey}|${preset.mode}`, "buzzer-updated");
      const melodyDuration = preset.mode === "custom"
        ? preset.notes.reduce((total, note) => total + note.duration + 25, 0)
        : 0;
      const timeoutMs = preset.mode === "custom"
        ? Math.min(60000, melodyDuration + 5000)
        : 5000;
      await sendSerialCommandAndWait(`BUZZER|${presetKey}`, "buzzer-played", timeoutMs);
      setFeedback(`${buzzerSoundLabels[presetKey]} sound played on the device.`, "success");
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Unable to test the buzzer.", "error");
      } finally {
        deviceBusy = false;
        syncConnectionUi();
      }
  }

  function ensureFirmwareUploadSnackbar() {
    if (firmwareUploadSnackbarElements?.root instanceof HTMLElement) {
      return firmwareUploadSnackbarElements;
    }
    const root = document.createElement("aside");
    root.className = "admin-biometric-firmware-snackbar";
    root.hidden = true;
    root.setAttribute("role", "status");
    root.setAttribute("aria-live", "polite");

    const icon = document.createElement("span");
    icon.className = "admin-biometric-firmware-snackbar__icon";
    icon.setAttribute("aria-hidden", "true");
    icon.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 3v12"></path>
        <path d="m17 8-5-5-5 5"></path>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
      </svg>
    `;

    const copy = document.createElement("div");
    copy.className = "admin-biometric-firmware-snackbar__copy";
    const title = document.createElement("strong");
    const message = document.createElement("span");
    copy.append(title, message);

    const progress = document.createElement("div");
    progress.className = "admin-biometric-firmware-snackbar__progress";
    progress.setAttribute("aria-hidden", "true");
    const progressBar = document.createElement("span");
    progressBar.className = "admin-biometric-firmware-snackbar__progress-bar";
    progress.appendChild(progressBar);

    root.append(icon, copy, progress);
    document.body?.appendChild(root);
    firmwareUploadSnackbarElements = { root, title, message, progressBar };
    return firmwareUploadSnackbarElements;
  }

  function stopFirmwareUploadSnackbarCountdown() {
    window.cancelAnimationFrame(firmwareUploadSnackbarCountdownFrame);
    firmwareUploadSnackbarCountdownFrame = 0;
  }

  function startFirmwareUploadSnackbarCountdown(durationMs) {
    stopFirmwareUploadSnackbarCountdown();
    const snackbar = firmwareUploadSnackbarElements?.root;
    const progressBar = firmwareUploadSnackbarElements?.progressBar;
    if (!(snackbar instanceof HTMLElement) || !(progressBar instanceof HTMLElement)) {
      return;
    }
    const normalizedDuration = Math.max(1, Number(durationMs) || 4200);
    const startedAt = window.performance.now();

    const updateCountdown = (now) => {
      if (!snackbar.classList.contains("is-visible")) {
        firmwareUploadSnackbarCountdownFrame = 0;
        return;
      }
      const remainingRatio = Math.max(0, 1 - ((now - startedAt) / normalizedDuration));
      progressBar.style.width = `${(remainingRatio * 100).toFixed(2)}%`;
      if (remainingRatio > 0) {
        firmwareUploadSnackbarCountdownFrame = window.requestAnimationFrame(updateCountdown);
      } else {
        firmwareUploadSnackbarCountdownFrame = 0;
      }
    };

    firmwareUploadSnackbarCountdownFrame = window.requestAnimationFrame(updateCountdown);
  }

  function showFirmwareUploadSnackbar(title, message, options = {}) {
    const snackbar = ensureFirmwareUploadSnackbar();
    const mode = String(options.mode || "loading").trim().toLowerCase();
    const percent = Number(options.percent);
    const hasPercent = Number.isFinite(percent);
    const autoDismissMs = mode === "success" ? 4200 : mode === "error" ? 5600 : 0;
    snackbar.title.textContent = String(title || "Uploading firmware").trim() || "Uploading firmware";
    snackbar.message.textContent = String(message || "").replace(/\s+/g, " ").trim();
    snackbar.root.classList.toggle("is-success", mode === "success");
    snackbar.root.classList.toggle("is-error", mode === "error");
    snackbar.root.classList.toggle("is-loading", mode === "loading");
    snackbar.root.style.setProperty(
      "--admin-biometric-snackbar-dismiss-duration",
      `${autoDismissMs || 4200}ms`,
    );
    snackbar.root.hidden = false;
    window.clearTimeout(firmwareUploadSnackbarHideTimer);
    stopFirmwareUploadSnackbarCountdown();
    snackbar.progressBar.classList.remove("is-indeterminate", "is-countdown");
    window.requestAnimationFrame(() => {
      snackbar.root.classList.add("is-visible");
      snackbar.progressBar.style.width = hasPercent
        ? `${Math.min(100, Math.max(0, percent))}%`
        : mode === "success"
          ? "100%"
          : mode === "error"
            ? "100%"
            : "18%";
      void snackbar.progressBar.offsetWidth;
      snackbar.progressBar.classList.toggle("is-indeterminate", !hasPercent && mode === "loading");
      if (autoDismissMs > 0) {
        startFirmwareUploadSnackbarCountdown(autoDismissMs);
      }
    });
    if (autoDismissMs > 0) {
      firmwareUploadSnackbarHideTimer = window.setTimeout(() => {
        hideFirmwareUploadSnackbar();
      }, autoDismissMs);
    }
  }

  function hideFirmwareUploadSnackbar() {
    window.clearTimeout(firmwareUploadSnackbarHideTimer);
    firmwareUploadSnackbarHideTimer = 0;
    stopFirmwareUploadSnackbarCountdown();
    const snackbar = firmwareUploadSnackbarElements;
    if (!(snackbar?.root instanceof HTMLElement)) {
      return;
    }
    snackbar.root.classList.remove("is-visible", "is-success", "is-error", "is-loading");
    snackbar.progressBar?.classList.remove("is-indeterminate", "is-countdown");
    window.setTimeout(() => {
      if (snackbar.root && !snackbar.root.classList.contains("is-visible")) {
        snackbar.root.hidden = true;
      }
    }, 180);
  }

  function ensureFirmwareUpdatedLottiePlayer() {
    if (window.lottie?.loadAnimation) {
      return Promise.resolve(true);
    }
    if (firmwareUpdatedLottieLoadPromise) {
      return firmwareUpdatedLottieLoadPromise;
    }
    firmwareUpdatedLottieLoadPromise = new Promise((resolve) => {
      const existingScript = document.querySelector(
        `script[src$="${firmwareUpdatedLottiePlayerUrl}"], script[src*="${firmwareUpdatedLottiePlayerUrl}?"]`,
      );
      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(Boolean(window.lottie?.loadAnimation)), { once: true });
        existingScript.addEventListener("error", () => resolve(false), { once: true });
        if (window.lottie?.loadAnimation) {
          resolve(true);
        }
        return;
      }
      const scriptElement = document.createElement("script");
      scriptElement.src = firmwareUpdatedLottiePlayerUrl;
      scriptElement.async = true;
      scriptElement.addEventListener("load", () => resolve(Boolean(window.lottie?.loadAnimation)), { once: true });
      scriptElement.addEventListener("error", () => resolve(false), { once: true });
      document.head.appendChild(scriptElement);
    });
    return firmwareUpdatedLottieLoadPromise;
  }

  function destroyFirmwareUpdatedAnimation() {
    if (firmwareUpdatedAnimation?.destroy) {
      firmwareUpdatedAnimation.destroy();
    }
    firmwareUpdatedAnimation = null;
  }

  async function playFirmwareUpdatedAnimation() {
    const container = firmwareUpdatedModalElements?.icon?.querySelector(
      "[data-biometric-firmware-updated-lottie]",
    );
    if (!(container instanceof HTMLElement)) {
      return;
    }
    destroyFirmwareUpdatedAnimation();
    container.innerHTML = "";
    const canUseLottie = await ensureFirmwareUpdatedLottiePlayer();
    if (
      !canUseLottie
      || !window.lottie?.loadAnimation
      || !container.isConnected
      || firmwareUpdatedModalElements?.root?.hidden
    ) {
      return;
    }
    firmwareUpdatedAnimation = window.lottie.loadAnimation({
      container,
      renderer: "svg",
      loop: false,
      autoplay: true,
      path: firmwareUpdatedAnimationPath,
    });
  }

  function ensureFirmwareUpdatedModal() {
    if (firmwareUpdatedModalElements?.root instanceof HTMLElement) {
      return firmwareUpdatedModalElements;
    }
    const root = document.createElement("div");
    root.className = "validation-modal-overlay admin-biometric-firmware-updated-overlay";
    root.hidden = true;
    root.setAttribute("aria-hidden", "true");
    root.innerHTML = `
      <section
        class="validation-modal validation-modal--success admin-biometric-firmware-updated-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-biometric-firmware-updated-title"
        tabindex="-1"
      >
        <div class="validation-modal__top">
          <div
            class="validation-modal__icon validation-modal__icon--success"
            aria-hidden="true"
            role="presentation"
            tabindex="-1"
            data-biometric-firmware-updated-icon
          >
            <div class="product-validation-lottie-check" data-biometric-firmware-updated-lottie></div>
          </div>
        </div>
        <div class="validation-modal__body">
          <h2 class="validation-modal__title" id="admin-biometric-firmware-updated-title">Firmware updated</h2>
          <p class="validation-modal__copy" data-biometric-firmware-updated-message>Flash complete. Reconnect the controller when the COM port returns.</p>
        </div>
      </section>
    `;
    document.body?.appendChild(root);
    firmwareUpdatedModalElements = {
      root,
      icon: root.querySelector("[data-biometric-firmware-updated-icon]"),
      message: root.querySelector("[data-biometric-firmware-updated-message]"),
    };
    return firmwareUpdatedModalElements;
  }

  function hideFirmwareUpdatedModal() {
    window.clearTimeout(firmwareUpdatedModalHideTimer);
    firmwareUpdatedModalHideTimer = 0;
    const modal = firmwareUpdatedModalElements;
    if (!(modal?.root instanceof HTMLElement)) {
      destroyFirmwareUpdatedAnimation();
      return;
    }
    modal.root.classList.remove("is-open");
    modal.root.setAttribute("aria-hidden", "true");
    window.setTimeout(() => {
      if (modal.root && !modal.root.classList.contains("is-open")) {
        destroyFirmwareUpdatedAnimation();
        modal.root.hidden = true;
      }
    }, 220);
  }

  function showFirmwareUpdatedModal(message = "") {
    const modal = ensureFirmwareUpdatedModal();
    if (modal.message instanceof HTMLElement) {
      modal.message.textContent = String(message || "")
        .replace(/\s+/g, " ")
        .trim()
        || "Flash complete. Reconnect the controller when the COM port returns.";
    }
    hideFirmwareUploadSnackbar();
    modal.root.hidden = false;
    modal.root.setAttribute("aria-hidden", "false");
    window.clearTimeout(firmwareUpdatedModalHideTimer);
    window.requestAnimationFrame(() => {
      modal.root.classList.add("is-open");
    });
    void playFirmwareUpdatedAnimation();
    firmwareUpdatedModalHideTimer = window.setTimeout(() => {
      hideFirmwareUpdatedModal();
    }, firmwareUpdatedAnimationMs + firmwareUpdatedHoldMs);
  }

  function pulseFirmwareFlashLed(colorName) {
    if (!activePort?.writable || !deviceVerified || firmwareLedCycleStop) {
      return;
    }
    void sendSerialLine(`FINGER_LED|on|${colorName}|200|0`).catch(() => {});
  }

  function startFirmwareCompileLighting() {
    stopFirmwareUploadLighting({ restoreDeviceLed: false });
    if (!activePort || !deviceVerified) {
      return;
    }
    firmwareLedCycleStop = false;
    firmwareLedMode = "compile";
    let colorIndex = 0;
    const tick = () => {
      if (firmwareLedCycleStop || firmwareLedMode !== "compile" || !activePort || !deviceVerified) {
        return;
      }
      // Compiling: classic 7-color shuffle (red → green → yellow → blue → purple → cyan → white).
      pulseFirmwareFlashLed(firmwareFlashLedColors[colorIndex % firmwareFlashLedColors.length]);
      colorIndex += 1;
      firmwareLedCycleTimer = window.setTimeout(tick, 100);
    };
    tick();
  }

  function startFirmwareCompileDoneLighting() {
    stopFirmwareUploadLighting({ restoreDeviceLed: false });
    if (!activePort || !deviceVerified) {
      return;
    }
    firmwareLedCycleStop = false;
    firmwareLedMode = "compile-done";
    // Done compiling: solid purple/violet breathing until flash disconnects the port.
    void sendSerialLine("FINGER_LED|breathing|purple|200|0").catch(() => {});
  }

  function startFirmwareFlashLighting() {
    // Keep purple/violet from compile-done through flash prepare (no 7-color here).
    startFirmwareCompileDoneLighting();
    firmwareLedMode = "flash";
  }

  function stopFirmwareUploadLighting(options = {}) {
    const restoreDeviceLed = options.restoreDeviceLed !== false;
    firmwareLedCycleStop = true;
    firmwareLedMode = "";
    window.clearTimeout(firmwareLedCycleTimer);
    firmwareLedCycleTimer = 0;
    if (!restoreDeviceLed || !activePort || !deviceVerified) {
      return;
    }
    if (settingsPanelOpen) {
      void sendDeviceLedMode("settings");
      return;
    }
    void sendDeviceLedMode("normal");
  }

  function getFlashedFirmwareRecord() {
    try {
      return {
        sketchHash: String(window.localStorage.getItem(firmwareFlashedHashKey) || "").trim(),
        protocolVersion: Number(window.localStorage.getItem(firmwareFlashedProtocolKey) || 0) || 0,
      };
    } catch {
      return { sketchHash: "", protocolVersion: 0 };
    }
  }

  function saveFlashedFirmwareRecord(sketchHash, protocolVersion) {
    try {
      if (sketchHash) {
        window.localStorage.setItem(firmwareFlashedHashKey, String(sketchHash));
      }
      if (protocolVersion) {
        window.localStorage.setItem(firmwareFlashedProtocolKey, String(protocolVersion));
      }
    } catch {
      // ignore storage failures
    }
  }

  function isFirmwareUpdateAvailable() {
    if (firmwareBusy) {
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
    const flashed = getFlashedFirmwareRecord();

    // No flash baseline in this browser yet — allow Flash so any .ino edit can upload.
    if (!flashed.sketchHash) {
      return true;
    }
    if (serverHash !== flashed.sketchHash) {
      return true;
    }
    if (
      serverProtocol > 0
      && deviceVerified
      && deviceProtocolVersion > 0
      && deviceProtocolVersion < serverProtocol
    ) {
      return true;
    }
    return false;
  }

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

  function syncFirmwareUi() {
    const statusNode = refs?.firmwareStatus;
    const buildNode = refs?.firmwareBuildName;
    const flashButton = refs?.firmwareFlashButton;
    const installButton = refs?.firmwareInstallButton;
    const serverProtocol = Number(firmwareToolingStatus?.protocolVersion) || 0;
    const updateAvailable = isFirmwareUpdateAvailable();
    const canInstall = Boolean(
      serialSupported()
      && firmwareToolingStatus?.arduinoCli
      && firmwareToolingStatus?.sketchExists
      && !firmwareBusy
      && !deviceBusy,
    );
    const handshakeFailed = Boolean(activePort && !deviceVerified && handshakeState === "failed");
    const needsInstall = !deviceVerified || handshakeFailed
      || (deviceVerified && serverProtocol > 0 && deviceProtocolVersion > 0 && deviceProtocolVersion < serverProtocol);

    if (statusNode instanceof HTMLElement) {
      if (firmwareBusy) {
        statusNode.textContent = "Working on firmware…";
      } else if (!firmwareToolingStatus) {
        statusNode.textContent = "Checking compile tools…";
      } else if (!firmwareToolingStatus.arduinoCli) {
        statusNode.textContent = updateAvailable
          ? `Update available · install arduino-cli on the server to build · protocol v${serverProtocol || "?"}`
          : "Install arduino-cli on the server to build firmware from the project .ino.";
      } else if (!firmwareToolingStatus.sketchExists) {
        statusNode.textContent = "Project firmware sketch was not found on the server.";
      } else if (handshakeFailed) {
        statusNode.textContent = "Board connected but not a matching GMS controller · use Install firmware";
      } else if (!deviceVerified) {
        statusNode.textContent = `Ready to install · server protocol v${serverProtocol || "?"}`;
      } else if (updateAvailable) {
        statusNode.textContent = deviceVerified && deviceProtocolVersion > 0 && serverProtocol > deviceProtocolVersion
          ? `Update available · device v${deviceProtocolVersion} · server v${serverProtocol}`
          : `Update available · server protocol v${serverProtocol || "?"}`;
      } else {
        statusNode.textContent = deviceVerified && deviceProtocolVersion > 0
          ? `Up to date · device and server protocol v${deviceProtocolVersion}`
          : `Up to date · server protocol v${serverProtocol || "?"}`;
      }
    }
    if (buildNode instanceof HTMLElement) {
      if (handshakeFailed) {
        buildNode.textContent = "Mismatched or blank firmware detected. Click Install firmware.";
      } else if (!deviceVerified) {
        buildNode.textContent = "Blank or undetected ESP32? Click Install firmware, then Connect.";
      } else if (updateAvailable) {
        buildNode.textContent = "Firmware changed. Click Flash ESP32 to build and upload.";
      } else {
        buildNode.textContent = "No firmware changes detected. Flash is not needed.";
      }
    }
    if (flashButton instanceof HTMLButtonElement) {
      flashButton.disabled = firmwareBusy
        || !updateAvailable
        || !firmwareToolingStatus?.arduinoCli
        || !serialSupported()
        || !activePort
        || !deviceVerified;
      flashButton.title = !deviceVerified
        ? "Connect a matching GMS controller first, or use Install firmware for blank boards."
        : !updateAvailable
          ? "Firmware is already up to date."
          : "Build and upload the latest Super Admin firmware.";
    }
    if (installButton instanceof HTMLButtonElement) {
      installButton.disabled = !canInstall;
      installButton.classList.toggle("is-emphasized", needsInstall && canInstall);
      installButton.title = !serialSupported()
        ? "Web Serial requires Chrome or Edge on HTTPS or localhost."
        : !firmwareToolingStatus?.arduinoCli
          ? "Install arduino-cli on the server first."
          : "Install Super Admin firmware on a blank or incompatible ESP32.";
    }
    syncBiometricSettingsAccess();
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

  async function compileFirmwarePayload(body) {
    firmwareBusy = true;
    syncFirmwareUi();
    showFirmwareUploadSnackbar("Building firmware", "Scanner shuffles all 7 colors while compiling the project .ino…", {
      mode: "loading",
      percent: 12,
    });
    startFirmwareCompileLighting();
    try {
      showFirmwareUploadSnackbar("Building firmware", "Compiling with arduino-cli — 7-color cycle on the scanner (cached builds are faster next time)…", {
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
      startFirmwareCompileDoneLighting();
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

  function uint8ArrayToBinaryString(bytes) {
    const source = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
    const chunkSize = 0x8000;
    let output = "";
    for (let index = 0; index < source.length; index += chunkSize) {
      output += String.fromCharCode.apply(null, source.subarray(index, index + chunkSize));
    }
    return output;
  }

  async function loadEsptoolModule() {
    // Prefer the vendored Rollup bundle. esm.sh's ESM build breaks stub JSON and
    // throws Window.atob("…not correctly encoded") while entering download mode.
    const candidates = [
      "/vendor/esptool-js-0.5.4.bundle.js",
      "https://cdn.jsdelivr.net/npm/esptool-js@0.5.4/bundle.js",
    ];
    let lastError = null;
    for (const url of candidates) {
      try {
        const esptoolModule = await import(url);
        const Transport = esptoolModule.Transport || esptoolModule.default?.Transport;
        const ESPLoader = esptoolModule.ESPLoader || esptoolModule.default?.ESPLoader;
        if (Transport && ESPLoader) {
          return { Transport, ESPLoader };
        }
        lastError = new Error(`esptool module at ${url} is missing Transport/ESPLoader exports.`);
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError instanceof Error
      ? lastError
      : new Error("Unable to load the browser flasher module.");
  }

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

  async function resolveAuthorizedFlashPort(preferredPort) {
    if (preferredPort) {
      return preferredPort;
    }
    const ports = await navigator.serial.getPorts();
    if (selectedPort && ports.includes(selectedPort)) {
      return selectedPort;
    }
    if (ports.length === 1) {
      return ports[0];
    }
    throw new Error(
      "No authorized COM port is available for flashing. Connect the controller first, then click Flash ESP32 again.",
    );
  }

  async function resolveInstallFlashPort() {
    if (activePort) {
      return activePort;
    }
    if (selectedPort) {
      return selectedPort;
    }
    const ports = await navigator.serial.getPorts();
    if (ports.length === 1) {
      selectedPort = ports[0];
      authorizedPorts = ports.slice();
      return selectedPort;
    }
    if (ports.length > 1) {
      throw new Error(
        "Multiple COM ports are authorized. Forget unused devices in Chrome, leave one ESP32 plugged in, then try Install firmware again.",
      );
    }
    const authorized = await requestSerialPort({ quiet: true });
    if (authorized) {
      return authorized;
    }
    throw new Error("Select the ESP32 COM port to install firmware.");
  }

  async function flashPendingFirmware(options = {}) {
    const isInstall = options.mode === "install";
    if (!serialSupported()) {
      setFeedback("Web Serial requires Chrome or Edge on HTTPS or localhost.", "error");
      return;
    }
    if (deviceBusy || firmwareBusy) {
      setFeedback("Wait for the current device action to finish.", "warning");
      return;
    }
    if (!isInstall) {
      if (!activePort || !deviceVerified) {
        setFeedback("Connect a matching GMS controller before flashing, or use Install firmware for blank boards.", "error");
        return;
      }
      if (!isFirmwareUpdateAvailable()) {
        setFeedback("Firmware is already up to date. Nothing to flash.", "success");
        return;
      }
    }
    if (!firmwareToolingStatus?.arduinoCli) {
      setFeedback(
        "arduino-cli is not installed on the server. Install Arduino CLI and the esp32 board core, then retry.",
        "error",
      );
      return;
    }
    if (!firmwareToolingStatus?.sketchExists) {
      setFeedback("Project firmware sketch was not found on the server.", "error");
      return;
    }

    let flashPort = null;
    try {
      flashPort = isInstall
        ? await resolveInstallFlashPort()
        : activePort;
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to select an ESP32 COM port.", "error");
      return;
    }
    if (!flashPort) {
      setFeedback("Select the ESP32 COM port first.", "error");
      return;
    }

    // Updates on a live GMS board still require admin fingerprint. Fresh installs cannot.
    if (!isInstall) {
      if (!await authorizeBuiltInAdminFingerprint("flash firmware to the ESP32")) {
        return;
      }
    }

    try {
      pendingFirmwareFlash = null;
      await compileFirmwarePayload({ source: "repo" });
      if (!pendingFirmwareFlash?.flashId || !pendingFirmwareFlash?.files?.length) {
        throw new Error("Firmware build finished but no downloadable flash files were returned.");
      }
    } catch (error) {
      return;
    }
    firmwareBusy = true;
    syncFirmwareUi();
    const prepareLabel = isInstall
      ? "Compile finished — preparing first-time install. Do not unplug the device."
      : "Compile finished — scanner is purple/violet while preparing to flash. Do not unplug the device.";
    showFirmwareUploadSnackbar(isInstall ? "Installing firmware" : "Uploading firmware", prepareLabel, {
      mode: "loading",
      percent: 4,
    });
    if (!isInstall) {
      startFirmwareFlashLighting();
    }
    try {
      showFirmwareUploadSnackbar(
        isInstall ? "Installing firmware" : "Uploading firmware",
        "Downloading compiled firmware binaries…",
        {
          mode: "loading",
          percent: 8,
        },
      );
      const fileArray = await loadFirmwareFlashFileArray(pendingFirmwareFlash);
      showFirmwareUploadSnackbar(
        isInstall ? "Installing firmware" : "Uploading firmware",
        "Preparing the ESP32 for flashing…",
        {
          mode: "loading",
          percent: 12,
        },
      );
      if (activePort) {
        await disconnectSerialPort({ quiet: true });
        stopFirmwareUploadLighting({ restoreDeviceLed: false });
        await waitMs(900);
      }
      showFirmwareUploadSnackbar(
        isInstall ? "Installing firmware" : "Uploading firmware",
        "Preparing the ESP32 for flashing… Hold BOOT if download mode does not start.",
        {
          mode: "loading",
          percent: 16,
        },
      );
      const { Transport, ESPLoader } = await loadEsptoolModule();
      const port = await resolveAuthorizedFlashPort(flashPort);
      const transport = new Transport(port, true);
      const terminal = {
        clean: () => {},
        writeLine: (line) => addActivity(String(line || "").trim()),
        write: () => {},
      };
      const loader = new ESPLoader({ transport, baudrate: 921600, terminal });
      showFirmwareUploadSnackbar(
        isInstall ? "Installing firmware" : "Uploading firmware",
        "Connecting to the ESP32 bootloader…",
        {
          mode: "loading",
          percent: 24,
        },
      );
      let chipName = "";
      try {
        chipName = await loader.main();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error || "");
        if (/atob|not correctly encoded/i.test(message)) {
          throw new Error(
            "Browser flasher failed while loading the ESP stub (atob). Hard-refresh Super Admin so the local esptool bundle loads, then flash again.",
          );
        }
        throw error;
      }
      addActivity(`Flasher connected to ${chipName || "ESP32"}.`);
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
          const ratio = written / total;
          const percent = Math.min(99, Math.round(24 + ratio * 74));
          showFirmwareUploadSnackbar(
            isInstall ? "Installing firmware" : "Uploading firmware",
            `Writing firmware to ESP32… ${Math.min(100, Math.round(ratio * 100))}%`,
            { mode: "loading", percent },
          );
        },
      });
      await loader.after("hard_reset");
      await transport.disconnect();
      saveFlashedFirmwareRecord(pendingFirmwareFlash?.sketchHash, pendingFirmwareFlash?.protocolVersion);
      pendingFirmwareFlash = null;
      const successMessage = isInstall
        ? "Firmware installed successfully. Wait a few seconds, then press Connect."
        : "Firmware updated successfully. Wait a few seconds, then connect the controller again.";
      showFirmwareUpdatedModal(successMessage);
      setFeedback(successMessage, "success");
      addActivity(isInstall
        ? "Biometric firmware installed from Super Admin (blank/mismatched board)."
        : "Biometric firmware flashed from Super Admin.");
      void refreshFirmwareToolingStatus();
    } catch (error) {
      showFirmwareUploadSnackbar(
        isInstall ? "Install failed" : "Upload failed",
        error instanceof Error ? error.message : "Unable to flash firmware.",
        { mode: "error", percent: 100 },
      );
      setFeedback(error instanceof Error ? error.message : "Unable to flash firmware.", "error");
      addActivity(isInstall ? "Firmware install failed." : "Firmware flash failed.", "error");
    } finally {
      stopFirmwareUploadLighting();
      firmwareBusy = false;
      syncFirmwareUi();
      syncConnectionUi();
    }
  }

  async function handleUiAction(action) {
    if (action === "refresh-ports") {
      const detectedPort = await refreshAuthorizedPorts({ allowRequest: true });
      if (detectedPort && !activePort) {
        await connectSerialPort();
      }
    } else if (action === "toggle-connection") {
      await toggleConnection();
    } else if (action === "fetch-device-settings") {
      await fetchDeviceConfiguration();
    } else if (action?.startsWith("test-buzzer-")) {
      const presetKey = action.slice("test-buzzer-".length);
      if (buzzerSoundKeys.includes(presetKey)) {
        await testBuzzerPreset(presetKey);
      }
    } else if (action === "toggle-settings") {
      toggleSettingsPanel();
    } else if (action === "send-settings") {
      await sendAllSettings();
    } else if (action === "flash-firmware") {
      await flashPendingFirmware({ mode: "update" });
    } else if (action === "install-firmware") {
      await flashPendingFirmware({ mode: "install" });
    } else if (action === "clear-log") {
      activityLog = [];
      refs.log.textContent = "No device activity yet.";
    }
  }

  function initialize(options = {}) {
    ensureStyles();
    if (!render()) {
      return;
    }
    if (options.reload !== false) {
      void loadSettings();
    } else {
      void (async () => {
        const detectedPort = await refreshAuthorizedPorts({ quiet: true });
        if (detectedPort && !activePort) {
          await connectSerialPort();
        }
      })();
    }
  }

  if (navigator.serial?.addEventListener) {
    navigator.serial.addEventListener("connect", async (event) => {
      const connectedPort = event?.port || null;
      const port = await refreshAuthorizedPorts({
        quiet: true,
        preferredPort: connectedPort,
      });
      if (port) {
        const label = getSelectedDeviceMetadata()?.label || "retina scan controller";
        showDeviceSnackbar("Device detected", `${label} appeared on the USB serial bus. Connecting automatically...`, "success");
        addActivity(`USB bus detected ${label}.`, "success");
        if (!activePort) {
          await connectSerialPort();
        }
      } else {
        showDeviceSnackbar(
          "Device detection failed",
          "A serial device connected, but it could not be authorized.",
          "error",
        );
      }
    });
    navigator.serial.addEventListener("disconnect", (event) => {
      if (event.port === activePort || event.target === activePort) {
        activePort = null;
        deviceVerified = false;
        connectedDeviceName = "";
        deviceProtocolVersion = 0;
        pendingFingerprintSlots = [];
        renderSavedFingerprintGrid();
        rejectPendingDeviceResponse(new Error("The connected serial device was removed."));
        window.clearTimeout(handshakeTimer);
        handshakeTimer = 0;
        syncConnectionUi();
        showDeviceSnackbar("Device removed", "The connected retina scan controller was unplugged. Unsaved fingerprints were cleared from this page.", "error");
        setFeedback("The connected serial device was removed. Unsaved fingerprints will be cleared from the scanner on next connect.", "error");
        addActivity("Serial device removed.", "error");
      }
      void refreshAuthorizedPorts({ quiet: true });
    });
  }

  window.gmsAuthorizeSuperAdminFingerprint = authorizeBuiltInAdminFingerprint;
  window.gmsIsSuperAdminFingerprintReady = () => Boolean(
    activePort
    && deviceVerified
    && deviceCanAuthorizeBuiltInAdmin
    && deviceProtocolVersion >= 8,
  );
  window.gmsApplyWorkspaceColorToRetinaScan = applyWorkspaceColorToRetinaScan;

  window.addEventListener("gms:workspace-color-changed", (event) => {
    const color = String(event?.detail?.color || "").trim();
    if (!/^#[0-9a-f]{6}$/i.test(color)) {
      return;
    }
    const source = String(event?.detail?.source || "local").trim();
    // Picker flow authorizes + persists explicitly after Retina Security.
    if (source === "super-admin-picker") {
      return;
    }
    void applyWorkspaceColorToRetinaScan(color, {
      source,
      preview: false,
      persist: false,
    });
  });

  ensureStyles();
  const initializeWhenReady = () => initialize({ reload: true });
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeWhenReady, { once: true });
  } else {
    initializeWhenReady();
  }
  window.addEventListener("beforeunload", () => {
    void disconnectSerialPort({ quiet: true });
  });
})();
