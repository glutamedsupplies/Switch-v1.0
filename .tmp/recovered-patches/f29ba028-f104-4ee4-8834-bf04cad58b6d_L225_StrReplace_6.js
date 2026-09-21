    oled: {
      mode: ADMIN_BIOMETRIC_OLED_MODES.has(requestedOledMode) ? requestedOledMode : "text",
      font: ADMIN_BIOMETRIC_OLED_FONTS.has(requestedOledFont) ? requestedOledFont : "medium",
      datetimeFont: ADMIN_BIOMETRIC_OLED_DATETIME_FONTS.has(requestedOledDatetimeFont)
        ? requestedOledDatetimeFont
        : "clock-xl",
      fonts: normalizeAdminBiometricOledFonts(
        {
          ...oledInput,
          fonts: oledInput.fonts && typeof oledInput.fonts === "object"
            ? oledInput.fonts
            : {
                text: { preset: requestedOledFont, profileName: "" },
                datetime: { preset: requestedOledDatetimeFont, profileName: "" },
              },
        },
        previousOled,
        requestedOledFont,
      ),
      text: String(oledInput.text ?? previousOled.text ?? "RETINA SCAN")