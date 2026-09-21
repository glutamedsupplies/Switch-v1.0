const ADMIN_BIOMETRIC_BUZZER_MODES = new Set(["builtin", "custom", "silent"]);
const ADMIN_BIOMETRIC_BUZZER_SOUND_KEYS = ["success", "welcome", "error"];

function normalizeAdminBiometricBuzzerPreset(value, fallback = { mode: "builtin", melodyName: "", notes: [] }) {
  const input = value && typeof value === "object" ? value : {};
  const mode = String(input.mode ?? fallback.mode ?? "builtin").trim().toLowerCase();
  const rawNotes = Array.isArray(input.notes) ? input.notes : Array.isArray(fallback.notes) ? fallback.notes : [];
  const notes = rawNotes.slice(0, 12).map((note) => ({
    frequency: clampAdminBiometricInteger(note?.frequency, 0, 8000, 0),
    duration: clampAdminBiometricInteger(note?.duration, 20, 3000, 180),
  }));
  return {
    mode: ADMIN_BIOMETRIC_BUZZER_MODES.has(mode) ? mode : "builtin",
    melodyName: String(input.melodyName ?? fallback.melodyName ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80),
    notes,
  };
}

function normalizeAdminBiometricBuzzerSettings(buzzerInput, previousBuzzer = {}) {
  const inputPresets = buzzerInput?.presets && typeof buzzerInput.presets === "object"
    ? buzzerInput.presets
    : {};
  const previousPresets = previousBuzzer?.presets && typeof previousBuzzer.presets === "object"
    ? previousBuzzer.presets
    : {};
  const presets = {};
  for (const key of ADMIN_BIOMETRIC_BUZZER_SOUND_KEYS) {
    presets[key] = normalizeAdminBiometricBuzzerPreset(
      inputPresets[key],
      previousPresets[key] ?? { mode: "builtin", melodyName: "", notes: [] },
    );
  }
  const legacyNotes = Array.isArray(buzzerInput?.notes)
    ? buzzerInput.notes
    : Array.isArray(previousBuzzer?.notes)
      ? previousBuzzer.notes
      : [];
  if (legacyNotes.length) {
    presets.success = normalizeAdminBiometricBuzzerPreset({
      mode: "custom",
      melodyName: String(buzzerInput?.melodyName ?? previousBuzzer?.melodyName ?? "Custom melody"),
      notes: legacyNotes,
    });
  }
  return { presets };
}

function clampAdminBiometricInteger(value, minimum, maximum, fallback) {