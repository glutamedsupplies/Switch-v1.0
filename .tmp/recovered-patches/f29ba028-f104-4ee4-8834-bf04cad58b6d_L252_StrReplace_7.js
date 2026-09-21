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

const ADMIN_BIOMETRIC_OLED_TIMEZONES = new Set([
  "Asia/Manila",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Asia/Shanghai",
  "Asia/Hong_Kong",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Australia/Sydney",
  "Pacific/Auckland",
  "UTC",
]);

function normalizeAdminBiometricDatetimeSettings(input, previous = {}) {
  const source = input && typeof input === "object" ? input : {};
  const fallback = previous && typeof previous === "object" ? previous : {};
  const timezone = String(source.timezone ?? source.timeZone ?? fallback.timezone ?? "Asia/Manila").trim();
  return {
    use24HourFormat: typeof source.use24HourFormat === "boolean"
      ? source.use24HourFormat
      : source.timeFormat === "24h" || fallback.use24HourFormat === true,
    timezoneAuto: typeof source.timezoneAuto === "boolean"
      ? source.timezoneAuto
      : fallback.timezoneAuto !== false,
    timezone: ADMIN_BIOMETRIC_OLED_TIMEZONES.has(timezone) ? timezone : "Asia/Manila",
  };
}

function normalizeAdminBiometricSettings(value, previousValue = null) {