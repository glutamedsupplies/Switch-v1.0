  return { scenes };
}

function normalizeAdminBiometricOledFontProfile(
  input,
  allowedPresets,
  fallbackPreset,
  previous = { preset: fallbackPreset, profileName: "" },
) {
  const preset = String(input?.preset ?? previous?.preset ?? fallbackPreset).trim().toLowerCase();
  return {
    preset: allowedPresets.has(preset) ? preset : fallbackPreset,
    profileName: String(input?.profileName ?? previous?.profileName ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80),
  };
}

function normalizeAdminBiometricOledFonts(oledInput, previousOled = {}, legacyFont = "medium") {
  const previousFonts = previousOled?.fonts && typeof previousOled.fonts === "object"
    ? previousOled.fonts
    : {
        text: { preset: legacyFont, profileName: "" },
        datetime: {
          preset: String(previousOled.datetimeFont ?? "clock-xl").trim().toLowerCase(),
          profileName: "",
        },
      };
  const inputFonts = oledInput?.fonts && typeof oledInput.fonts === "object" ? oledInput.fonts : {};
  const legacyTextPreset = ADMIN_BIOMETRIC_OLED_FONTS.has(String(legacyFont).trim().toLowerCase())
    ? String(legacyFont).trim().toLowerCase()
    : "medium";
  return {
    text: normalizeAdminBiometricOledFontProfile(
      inputFonts.text ?? previousFonts.text,
      ADMIN_BIOMETRIC_OLED_FONTS,
      legacyTextPreset,
      previousFonts.text,
    ),
    datetime: normalizeAdminBiometricOledFontProfile(
      inputFonts.datetime ?? previousFonts.datetime,
      ADMIN_BIOMETRIC_OLED_DATETIME_FONTS,
      "clock-xl",
      previousFonts.datetime,
    ),
  };
}

function normalizeAdminBiometricSettings(value, previousValue = null) {