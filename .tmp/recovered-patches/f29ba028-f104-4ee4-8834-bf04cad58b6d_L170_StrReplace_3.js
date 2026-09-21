function normalizeAdminBiometricLightingSettings(lightingInput, previousLighting = {}) {
  const defaults = {
    sleep: "white",
    break: "purple",
    normal: "cyan",
    settings: "yellow",
    enroll: "blue",
    success: "green",
    error: "red",
  };
  const inputScenes = lightingInput?.scenes && typeof lightingInput.scenes === "object"
    ? lightingInput.scenes
    : {};
  const previousScenes = previousLighting?.scenes && typeof previousLighting.scenes === "object"
    ? previousLighting.scenes
    : {};
  const scenes = {};
  for (const key of Object.keys(defaults)) {
    const color = String(inputScenes[key] ?? previousScenes[key] ?? defaults[key])
      .trim()
      .toLowerCase();
    scenes[key] = ADMIN_BIOMETRIC_FINGERPRINT_LED_COLORS.has(color) ? color : defaults[key];
  }
  return { scenes };
}

function normalizeAdminBiometricSettings(value, previousValue = null) {