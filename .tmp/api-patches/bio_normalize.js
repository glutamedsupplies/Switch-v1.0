const ADMIN_BIOMETRIC_BUZZER_MODES = new Set(["builtin", "custom", "silent"]);
const ADMIN_BIOMETRIC_BUZZER_SOUND_KEYS = ["success", "welcome", "error"];
const ADMIN_BIOMETRIC_MAX_BUZZER_LIBRARY = 24;

function normalizeAdminBiometricBuzzerMelodyEntry(value, fallback = null) {
  const input = value && typeof value === "object" ? value : fallback;
  if (!input) {
    return null;
  }
  const rawNotes = Array.isArray(input.notes) ? input.notes : [];
  const notes = rawNotes.slice(0, 12).map((note) => ({
    frequency: clampAdminBiometricInteger(note?.frequency, 0, 8000, 0),
    duration: clampAdminBiometricInteger(note?.duration, 20, 3000, 180),
  })).filter((note) => note.frequency > 0 && note.duration > 0);
  if (!notes.length) {
    return null;
  }
  const id = String(input.id ?? `melody-${Date.now().toString(36)}`)
    .replace(/\s+/g, "")
    .trim()
    .slice(0, 48) || `melody-${Date.now().toString(36)}`;
  return {
    id,
    melodyName: String(input.melodyName ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80),
    notes,
  };
}

function normalizeAdminBiometricBuzzerLibrary(inputLibrary, fallbackLibrary = [], activeNotes = [], activeName = "", activeId = "") {
  const seenIds = new Set();
  const library = [];
  const appendEntry = (entryValue, entryFallback = null) => {
    const normalized = normalizeAdminBiometricBuzzerMelodyEntry(entryValue, entryFallback);
    if (!normalized || seenIds.has(normalized.id)) {
      return;
    }
    seenIds.add(normalized.id);
    library.push(normalized);
  };
  [...(Array.isArray(inputLibrary) ? inputLibrary : []), ...(Array.isArray(fallbackLibrary) ? fallbackLibrary : [])]
    .forEach((entry) => appendEntry(entry));
  const legacyNotes = Array.isArray(activeNotes)
    ? activeNotes.slice(0, 12).map((note) => ({
      frequency: clampAdminBiometricInteger(note?.frequency, 0, 8000, 0),
      duration: clampAdminBiometricInteger(note?.duration, 20, 3000, 180),
    })).filter((note) => note.frequency > 0 && note.duration > 0)
    : [];
  if (legacyNotes.length) {
    const legacyId = String(activeId || "").trim() || `melody-${Date.now().toString(36)}`;
    const hasMatch = library.some((entry) =>
      entry.notes.length === legacyNotes.length
      && entry.notes.every((note, index) =>
        note.frequency === legacyNotes[index]?.frequency
        && note.duration === legacyNotes[index]?.duration,
      ),
    );
    if (!hasMatch) {
      appendEntry({
        id: legacyId,
        melodyName: activeName,
        notes: legacyNotes,
      });
    }
  }
  return library.slice(0, ADMIN_BIOMETRIC_MAX_BUZZER_LIBRARY);
}

function normalizeAdminBiometricBuzzerPreset(value, fallback = { mode: "builtin", melodyName: "", notes: [], library: [], selectedMelodyId: "" }) {
  const input = value && typeof value === "object" ? value : {};
  let mode = String(input.mode ?? fallback.mode ?? "builtin").trim().toLowerCase();
  const library = normalizeAdminBiometricBuzzerLibrary(
    input.library,
    fallback.library,
    input.notes ?? fallback.notes,
    input.melodyName ?? fallback.melodyName,
    input.selectedMelodyId ?? fallback.selectedMelodyId,
  );
  if (!ADMIN_BIOMETRIC_BUZZER_MODES.has(mode)) {
    mode = "builtin";
  }
  let selectedMelodyId = String(input.selectedMelodyId ?? fallback.selectedMelodyId ?? "").trim();
  let melodyName = "";
  let notes = [];
  if (mode === "custom") {
    const selectedEntry = library.find((entry) => entry.id === selectedMelodyId)
      || library[library.length - 1]
      || null;
    if (selectedEntry) {
      selectedMelodyId = selectedEntry.id;
      melodyName = selectedEntry.melodyName;
      notes = selectedEntry.notes;
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