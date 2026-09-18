#include <Arduino.h>
#include <Adafruit_Fingerprint.h>
#include <string.h>

// Super Admin flash trigger ping 2 — harmless comment; remove anytime.
// One sketch, with the transport and non-volatile storage selected by the
// board core at compile time. The pin map stays identical in both variants.
#if defined(ARDUINO_ARCH_ESP32)
  #include <Preferences.h>
  #include <Wire.h>
  #include <Adafruit_GFX.h>
  #include <Adafruit_SH110X.h>
  #include <Fonts/FreeMono9pt7b.h>
  #include <Fonts/FreeSans9pt7b.h>
  #include <Fonts/FreeSansBold9pt7b.h>
  #include <Fonts/FreeSansBold12pt7b.h>
  #include <FluxGarage_RoboEyes.h>
  #define GMS_BOARD_ESP32 1
#elif defined(ARDUINO_ARCH_AVR)
  #include <EEPROM.h>
  #include <SoftwareSerial.h>
  #include <U8g2lib.h>
  #define GMS_BOARD_AVR 1
#else
  #error "Unsupported board core. Use an ESP32/ESP32-S3 board or a classic AVR Uno/Nano with this pin map."
#endif

#if defined(GMS_BOARD_AVR)
  #define GMS_STREQ(value, literal) (strcmp_P((value), PSTR(literal)) == 0)
  #define GMS_FTEXT(fullText, compactText) F(compactText)
#else
  #define GMS_STREQ(value, literal) (strcmp((value), (literal)) == 0)
  #define GMS_FTEXT(fullText, compactText) F(fullText)
#endif

// User-provided hardware pins.
#define OLED_SDA 8
#define OLED_SCL 9
#define FINGER_RX 16
#define FINGER_TX 17
#define BUZZER_PIN 10

#define USB_SERIAL_BAUD 115200
#define FINGER_SERIAL_BAUD 57600
#define DEVICE_PROTOCOL_VERSION 30
#define FINGERPRINT_STEP_TIMEOUT_MS 60000UL
#define FINGERPRINT_VERIFY_TIMEOUT_MS 90000UL
#define CONFIG_MAGIC 0x474D5342UL
#define CONFIG_VERSION 7
#define MAX_MELODY_NOTES 16
#define MAX_PRESET_MELODY_NOTES 12
#define BUZZER_PRESET_SLOT_COUNT 4
#define LED_SCENE_COUNT 7
#define MAX_OLED_TEXT 32
#define COMMAND_BUFFER_SIZE 176
#define OLED_ADDRESS 0x3C
#define OLED_WIDTH 128
#define OLED_HEIGHT 64
#define OLED_RESET -1
#define ROBO_EYE_SPACING 10
#define ROBO_EYE_BLINK_INTERVAL_MS 7000
#define ROBO_EYE_BLINK_SECONDS 7
#define ROBO_EYE_ANIMATION_SPEED 5
#define ROBO_OLED_CONTRAST 180
#define LED_SPEED_IDLE 200
#define LED_SPEED_ALERT 10
#define LED_HOST_IDLE_MS 20000UL
#define LED_STATUS_FLASH_MS 1800UL
// OLED/LED auto-sleep window (local civil time): 7:00 PM → 9:00 AM.
#define OLED_SLEEP_START_HOUR 19
#define OLED_SLEEP_END_HOUR 9

enum LedSceneId : uint8_t {
  LED_SCENE_SLEEP = 0,
  LED_SCENE_BREAK = 1,
  LED_SCENE_NORMAL = 2,
  LED_SCENE_SETTINGS = 3,
  LED_SCENE_ENROLL = 4,
  LED_SCENE_SUCCESS = 5,
  LED_SCENE_ERROR = 6,
};

#if defined(GMS_BOARD_ESP32)
uint32_t currentSyncedEpoch();

bool hostConnected = false;
bool settingsPanelActive = false;
bool enrollModeActive = false;
bool fingerprintCancelRequested = false;
bool fingerprintOperationActive = false;
bool fingerprintLedHostOverride = false;
uint32_t lastHostActivityMs = 0;
uint8_t ledTemporaryScene = 255;
uint32_t ledTemporaryUntilMs = 0;
uint8_t lastAppliedLedScene = 255;
#endif

#if defined(GMS_BOARD_ESP32)
  #include <time.h>
#endif

// The ESP32 color probe confirmed that this sensor accepts Aura color indexes
// 1 through 7. Adafruit names the first three; keep the remaining raw indexes
// explicit so the Super Admin color wheel can address the full sensor palette.
#define GMS_FINGERPRINT_LED_GREEN 0x04
#define GMS_FINGERPRINT_LED_YELLOW 0x05
#define GMS_FINGERPRINT_LED_CYAN 0x06
#define GMS_FINGERPRINT_LED_WHITE 0x07

#if defined(GMS_BOARD_ESP32)
const uint8_t BUILT_IN_ADMIN_SLOT_1 = 1;
const uint8_t BUILT_IN_ADMIN_SLOT_2 = 2;
const uint8_t USER_FINGERPRINT_FIRST_SLOT = 3;
const uint32_t ADMIN_AUTHORIZATION_WINDOW_MS = 30000UL;
uint32_t adminAuthorizationExpiresAt = 0;
#endif

// ESP32-S3 boards expose the upload COM port through native USB. Keep the
// controller protocol on that port even when "USB CDC On Boot" was left
// disabled in Arduino IDE. Other ESP32 and AVR boards continue to use Serial.
#if defined(CONFIG_IDF_TARGET_ESP32S3) && defined(ARDUINO_USB_MODE) && !ARDUINO_USB_CDC_ON_BOOT
  #if ARDUINO_USB_MODE
    #include <HWCDC.h>
    HWCDC gmsControlSerial;
  #else
    #include <USB.h>
    USBCDC gmsControlSerial;
    #define GMS_START_TINYUSB 1
  #endif
#else
  #define gmsControlSerial Serial
#endif

#if defined(GMS_BOARD_ESP32)
HardwareSerial fingerSerial(1);
Preferences preferences;
bool persistentStorageReady = false;

#define SLEEP_ZZZ_STEP_MS 800UL
#define SLEEP_BREATHING_MS 1700UL

uint8_t sleepZStep = 1;
uint32_t sleepZTimer = 0;
uint32_t sleepBreathingTimer = 0;
bool sleepDeepBreath = false;
bool sleepZzzOverlayActive = false;
uint32_t happyLaughTimer = 0;
uint32_t statusExpressionUntilMs = 0;

class SleepDisplay : public Adafruit_SH1106G {
public:
  SleepDisplay(uint16_t w, uint16_t h, TwoWire *twi, int8_t rst)
    : Adafruit_SH1106G(w, h, twi, rst) {}

  void display() {
    if (sleepZzzOverlayActive) {
      setTextColor(SH110X_WHITE);
      setTextSize(1);
      setCursor(101, 30);
      print("z");
      if (sleepZStep >= 2) {
        setCursor(109, 20);
        print("Z");
      }
      if (sleepZStep >= 3) {
        setCursor(117, 9);
        print("Z");
      }
    }
    Adafruit_SH1106G::display();
  }
};

SleepDisplay display(OLED_WIDTH, OLED_HEIGHT, &Wire, OLED_RESET);
RoboEyes<SleepDisplay> roboEyes(display);
bool oledReady = false;
bool roboEyesActive = false;
#else
SoftwareSerial fingerSerial(FINGER_RX, FINGER_TX);
// Software I2C preserves pins 8/9 on classic AVR boards.
U8G2_SSD1306_128X64_NONAME_1_SW_I2C oled(
  U8G2_R0,
  OLED_SCL,
  OLED_SDA,
  U8X8_PIN_NONE
);
#endif

// The Stream constructor lets this same sensor driver use SoftwareSerial on
// AVR and a pin-routed hardware UART on ESP32.
Adafruit_Fingerprint finger((Stream *)&fingerSerial);

struct MelodyNote {
  uint16_t frequency;
  uint16_t durationMs;
};

struct PresetMelody {
  uint8_t count;
  MelodyNote notes[MAX_PRESET_MELODY_NOTES];
};

struct LegacyDeviceConfigV2 {
  uint32_t magic;
  uint8_t version;
  uint8_t fingerprintLedMode;
  uint8_t fingerprintLedColor;
  uint8_t fingerprintLedSpeed;
  uint8_t fingerprintLedCycles;
  uint8_t oledFont;
  uint8_t oledContrast;
  uint8_t buzzerPreset;
  uint8_t melodyCount;
  char oledText[MAX_OLED_TEXT + 1];
  MelodyNote melody[MAX_MELODY_NOTES];
};

struct LegacyDeviceConfigV3 {
  uint32_t magic;
  uint8_t version;
  uint8_t fingerprintLedMode;
  uint8_t fingerprintLedColor;
  uint8_t fingerprintLedSpeed;
  uint8_t fingerprintLedCycles;
  uint8_t oledFont;
  uint8_t oledContrast;
  uint8_t displayMode;
  uint8_t eyeExpression;
  uint16_t eyeBlinkInterval;
  uint8_t eyeAnimationSpeed;
  uint8_t eyeSize;
  uint8_t eyeSpacing;
  uint8_t buzzerPreset;
  uint8_t melodyCount;
  char oledText[MAX_OLED_TEXT + 1];
  MelodyNote melody[MAX_MELODY_NOTES];
};

struct LegacyDeviceConfigV4 {
  uint32_t magic;
  uint8_t version;
  uint8_t fingerprintLedMode;
  uint8_t fingerprintLedColor;
  uint8_t fingerprintLedSpeed;
  uint8_t fingerprintLedCycles;
  uint8_t oledFont;
  uint8_t oledContrast;
  uint8_t displayMode;
  uint8_t eyeExpression;
  uint16_t eyeBlinkInterval;
  uint8_t eyeAnimationSpeed;
  uint8_t eyeSize;
  uint8_t eyeSpacing;
  uint8_t buzzerPreset;
  uint8_t buzzerMelodyMode[BUZZER_PRESET_SLOT_COUNT];
  PresetMelody buzzerMelodies[BUZZER_PRESET_SLOT_COUNT];
  char oledText[MAX_OLED_TEXT + 1];
};

struct LegacyDeviceConfigV5 {
  uint32_t magic;
  uint8_t version;
  uint8_t fingerprintLedMode;
  uint8_t fingerprintLedColor;
  uint8_t fingerprintLedSpeed;
  uint8_t fingerprintLedCycles;
  uint8_t oledFont;
  uint8_t oledContrast;
  uint8_t displayMode;
  uint8_t eyeExpression;
  uint16_t eyeBlinkInterval;
  uint8_t eyeAnimationSpeed;
  uint8_t eyeSize;
  uint8_t eyeSpacing;
  uint8_t buzzerPreset;
  uint8_t buzzerMelodyMode[BUZZER_PRESET_SLOT_COUNT];
  PresetMelody buzzerMelodies[BUZZER_PRESET_SLOT_COUNT];
  uint8_t ledSceneColor[LED_SCENE_COUNT];
  char oledText[MAX_OLED_TEXT + 1];
};

struct LegacyDeviceConfigV6 {
  uint32_t magic;
  uint8_t version;
  uint8_t fingerprintLedMode;
  uint8_t fingerprintLedColor;
  uint8_t fingerprintLedSpeed;
  uint8_t fingerprintLedCycles;
  uint8_t oledFont;
  uint8_t oledDatetimeFont;
  uint8_t oledContrast;
  uint8_t displayMode;
  uint8_t eyeExpression;
  uint16_t eyeBlinkInterval;
  uint8_t eyeAnimationSpeed;
  uint8_t eyeSize;
  uint8_t eyeSpacing;
  uint8_t buzzerPreset;
  uint8_t buzzerMelodyMode[BUZZER_PRESET_SLOT_COUNT];
  PresetMelody buzzerMelodies[BUZZER_PRESET_SLOT_COUNT];
  uint8_t ledSceneColor[LED_SCENE_COUNT];
  char oledText[MAX_OLED_TEXT + 1];
};

struct DeviceConfig {
  uint32_t magic;
  uint8_t version;
  uint8_t fingerprintLedMode;
  uint8_t fingerprintLedColor;
  uint8_t fingerprintLedSpeed;
  uint8_t fingerprintLedCycles;
  uint8_t oledFont;
  uint8_t oledDatetimeFont;
  uint8_t oledTimeFormat;
  uint8_t oledTimezoneAuto;
  int16_t oledTimezoneOffsetMinutes;
  uint8_t oledContrast;
  uint8_t displayMode;
  uint8_t eyeExpression;
  uint16_t eyeBlinkInterval;
  uint8_t eyeAnimationSpeed;
  uint8_t eyeSize;
  uint8_t eyeSpacing;
  uint8_t buzzerPreset;
  uint8_t buzzerMelodyMode[BUZZER_PRESET_SLOT_COUNT];
  PresetMelody buzzerMelodies[BUZZER_PRESET_SLOT_COUNT];
  uint8_t ledSceneColor[LED_SCENE_COUNT];
  char oledText[MAX_OLED_TEXT + 1];
};

enum OledFontId : uint8_t {
  OLED_FONT_SMALL = 0,
  OLED_FONT_MEDIUM = 1,
  OLED_FONT_BOLD = 2,
  OLED_FONT_MONO = 3,
  OLED_FONT_LARGE = 4,
};

enum OledDatetimeFontId : uint8_t {
  OLED_DATETIME_FONT_XL = 0,
  OLED_DATETIME_FONT_LARGE = 1,
  OLED_DATETIME_FONT_MEDIUM = 2,
  OLED_DATETIME_FONT_COMPACT = 3,
};

enum OledTimeFormatId : uint8_t {
  OLED_TIME_LOCAL = 0,
  OLED_TIME_24H = 1,
};

enum BuzzerMelodyModeId : uint8_t {
  BUZZER_MELODY_BUILTIN = 0,
  BUZZER_MELODY_CUSTOM = 1,
  BUZZER_MELODY_SILENT = 2,
};

enum BuzzerMelodySlotId : uint8_t {
  BUZZER_SLOT_SUCCESS = 0,
  BUZZER_SLOT_WELCOME = 1,
  BUZZER_SLOT_WARNING = 2,
  BUZZER_SLOT_ERROR = 3,
};

enum BuzzerPresetId : uint8_t {
  BUZZER_SUCCESS = 0,
  BUZZER_WELCOME = 1,
  BUZZER_WARNING = 2,
  BUZZER_ERROR = 3,
  BUZZER_CUSTOM = 4,
  BUZZER_SILENT = 5,
};

enum DisplayModeId : uint8_t {
  DISPLAY_MODE_TEXT = 0,
  DISPLAY_MODE_EYES = 1,
  DISPLAY_MODE_DATETIME = 2,
};

enum EyeExpressionId : uint8_t {
  EYE_NEUTRAL = 0,
  EYE_HAPPY = 1,
  EYE_EXCITED = 2,
  EYE_THINKING = 3,
  EYE_SCANNING = 4,
  EYE_SUCCESS = 5,
  EYE_ERROR = 6,
  EYE_SLEEPY = 7,
  EYE_SURPRISED = 8,
  EYE_SETTINGS = 9,
};

DeviceConfig config;
bool fingerprintReady = false;
char commandBuffer[COMMAND_BUFFER_SIZE];
size_t commandLength = 0;
uint32_t lastDatetimeDrawnAt = 0;
uint32_t syncedEpoch = 0;
uint32_t syncedAtMillis = 0;
int16_t syncedTimezoneOffsetMinutes = 480;
bool statusDisplayActive = false;
uint8_t activeEyeExpression = EYE_SCANNING;
uint8_t lastStatusRoboExpression = 255;

bool refreshFingerprintTemplateCount() {
#if defined(GMS_BOARD_ESP32)
  return finger.getTemplateCount() == FINGERPRINT_OK;
#else
  return false;
#endif
}

void sendOk(const __FlashStringHelper *eventName, const __FlashStringHelper *message) {
  gmsControlSerial.print(F("{\"event\":\""));
  gmsControlSerial.print(eventName);
  gmsControlSerial.print(F("\",\"ok\":true,\"message\":\""));
  gmsControlSerial.print(message);
  gmsControlSerial.println(F("\"}"));
}

void sendError(const __FlashStringHelper *message) {
  gmsControlSerial.print(F("{\"event\":\"error\",\"ok\":false,\"message\":\""));
  gmsControlSerial.print(message);
  gmsControlSerial.println(F("\"}"));
}

void sendFingerprintStage(const __FlashStringHelper *message) {
  gmsControlSerial.print(F("{\"event\":\"fingerprint-stage\",\"ok\":true,\"message\":\""));
  gmsControlSerial.print(message);
  gmsControlSerial.println(F("\"}"));
}

void sendFingerprintRetry(const __FlashStringHelper *message) {
  gmsControlSerial.print(F("{\"event\":\"fingerprint-retry\",\"ok\":true,\"message\":\""));
  gmsControlSerial.print(message);
  gmsControlSerial.println(F("\"}"));
}

uint32_t remainingMs(uint32_t startedAt, uint32_t timeoutMs) {
  uint32_t elapsed = millis() - startedAt;
  return elapsed >= timeoutMs ? 0 : timeoutMs - elapsed;
}

void sendHello() {
  gmsControlSerial.print(F("{\"event\":\"hello\",\"ok\":true,\"device\":\"Universal Retina Scan Controller\",\"board\":\""));
#if defined(CONFIG_IDF_TARGET_ESP32S3)
  gmsControlSerial.print(F("esp32-s3"));
#elif defined(GMS_BOARD_ESP32)
  gmsControlSerial.print(F("esp32"));
#else
  gmsControlSerial.print(F("avr"));
#endif
  gmsControlSerial.print(F("\",\"protocol\":"));
  gmsControlSerial.print(DEVICE_PROTOCOL_VERSION);
  gmsControlSerial.print(F(",\"fingerprint\":"));
  gmsControlSerial.print(fingerprintReady ? F("true") : F("false"));
#if defined(GMS_BOARD_ESP32)
  gmsControlSerial.print(F(",\"fingerprintCapacity\":"));
  gmsControlSerial.print(fingerprintReady ? finger.capacity : 0);
  gmsControlSerial.print(F(",\"fingerprintTemplates\":"));
  gmsControlSerial.print(fingerprintReady ? finger.templateCount : 0);
  gmsControlSerial.println(F(",\"fingerprintConfirmation\":true,\"fingerprintLedProbe\":true,\"fingerprintLedBlinkTest\":true,\"fingerprintLedColorCount\":7,\"builtInAdminAuth\":true,\"builtInAdminSlots\":[1,2],\"fingerprintSlots\":true,\"oled\":true,\"robotEyes\":true,\"buzzer\":true,\"fingerprintAuraLedControl\":true,\"configRead\":true}"));
#else
  gmsControlSerial.println(F(",\"fingerprintConfirmation\":true,\"configRead\":true}"));
#endif
}

void resetConfigDefaults() {
  memset(&config, 0, sizeof(config));
  config.magic = CONFIG_MAGIC;
  config.version = CONFIG_VERSION;
  config.fingerprintLedMode = FINGERPRINT_LED_BREATHING;
  config.fingerprintLedColor = GMS_FINGERPRINT_LED_CYAN;
  config.fingerprintLedSpeed = LED_SPEED_IDLE;
  config.fingerprintLedCycles = 0;
  config.oledFont = OLED_FONT_MEDIUM;
  config.oledDatetimeFont = OLED_DATETIME_FONT_XL;
  config.oledTimeFormat = OLED_TIME_LOCAL;
  config.oledTimezoneAuto = 1;
  config.oledTimezoneOffsetMinutes = 480;
  config.oledContrast = ROBO_OLED_CONTRAST;
  config.displayMode = DISPLAY_MODE_EYES;
  config.eyeExpression = EYE_SCANNING;
  config.eyeBlinkInterval = ROBO_EYE_BLINK_INTERVAL_MS;
  config.eyeAnimationSpeed = ROBO_EYE_ANIMATION_SPEED;
  config.eyeSize = 2;
  config.eyeSpacing = ROBO_EYE_SPACING;
  config.buzzerPreset = BUZZER_SUCCESS;
  for (uint8_t slot = 0; slot < BUZZER_PRESET_SLOT_COUNT; slot += 1) {
    config.buzzerMelodyMode[slot] = BUZZER_MELODY_BUILTIN;
    config.buzzerMelodies[slot].count = 0;
  }
  config.ledSceneColor[LED_SCENE_SLEEP] = GMS_FINGERPRINT_LED_WHITE;
  config.ledSceneColor[LED_SCENE_BREAK] = FINGERPRINT_LED_BLUE;
  config.ledSceneColor[LED_SCENE_NORMAL] = GMS_FINGERPRINT_LED_CYAN;
  config.ledSceneColor[LED_SCENE_SETTINGS] = GMS_FINGERPRINT_LED_YELLOW;
  config.ledSceneColor[LED_SCENE_ENROLL] = FINGERPRINT_LED_BLUE;
  config.ledSceneColor[LED_SCENE_SUCCESS] = GMS_FINGERPRINT_LED_GREEN;
  config.ledSceneColor[LED_SCENE_ERROR] = FINGERPRINT_LED_RED;
  strncpy(config.oledText, "RETINA SCAN yeah yeah ", MAX_OLED_TEXT);
  config.oledText[MAX_OLED_TEXT] = '\0';
}

bool saveConfig();

bool migrateLegacyConfig(const LegacyDeviceConfigV2 &legacy) {
  if (
    legacy.magic != CONFIG_MAGIC
    || legacy.version != 2
    || legacy.melodyCount > MAX_MELODY_NOTES
    || legacy.oledFont > OLED_FONT_MONO
  ) {
    return false;
  }
  resetConfigDefaults();
  config.fingerprintLedMode = legacy.fingerprintLedMode;
  config.fingerprintLedColor = legacy.fingerprintLedColor;
  config.fingerprintLedSpeed = legacy.fingerprintLedSpeed;
  config.fingerprintLedCycles = legacy.fingerprintLedCycles;
  config.oledFont = legacy.oledFont;
  config.oledContrast = legacy.oledContrast;
  config.buzzerPreset = legacy.buzzerPreset;
  if (legacy.melodyCount > 0 && legacy.melodyCount <= MAX_MELODY_NOTES) {
    config.buzzerMelodies[BUZZER_SLOT_SUCCESS].count = constrain(
      legacy.melodyCount,
      (uint8_t)0,
      (uint8_t)MAX_PRESET_MELODY_NOTES
    );
    memcpy(
      config.buzzerMelodies[BUZZER_SLOT_SUCCESS].notes,
      legacy.melody,
      config.buzzerMelodies[BUZZER_SLOT_SUCCESS].count * sizeof(MelodyNote)
    );
    config.buzzerMelodyMode[BUZZER_SLOT_SUCCESS] = BUZZER_MELODY_CUSTOM;
  }
  memcpy(config.oledText, legacy.oledText, sizeof(config.oledText));
  config.oledText[MAX_OLED_TEXT] = '\0';
  return true;
}

bool migrateLegacyConfigV3(const LegacyDeviceConfigV3 &legacy) {
  if (
    legacy.magic != CONFIG_MAGIC
    || legacy.version != 3
    || legacy.melodyCount > MAX_MELODY_NOTES
    || legacy.oledFont > OLED_FONT_MONO
  ) {
    return false;
  }
  resetConfigDefaults();
  config.fingerprintLedMode = legacy.fingerprintLedMode;
  config.fingerprintLedColor = legacy.fingerprintLedColor;
  config.fingerprintLedSpeed = legacy.fingerprintLedSpeed;
  config.fingerprintLedCycles = legacy.fingerprintLedCycles;
  config.oledFont = legacy.oledFont;
  config.oledContrast = legacy.oledContrast;
  config.displayMode = legacy.displayMode;
  config.eyeExpression = legacy.eyeExpression;
  config.eyeBlinkInterval = legacy.eyeBlinkInterval;
  config.eyeAnimationSpeed = legacy.eyeAnimationSpeed;
  config.eyeSize = legacy.eyeSize;
  config.eyeSpacing = legacy.eyeSpacing;
  config.buzzerPreset = legacy.buzzerPreset;
  if (legacy.melodyCount > 0) {
    config.buzzerMelodies[BUZZER_SLOT_SUCCESS].count = constrain(
      legacy.melodyCount,
      (uint8_t)0,
      (uint8_t)MAX_PRESET_MELODY_NOTES
    );
    memcpy(
      config.buzzerMelodies[BUZZER_SLOT_SUCCESS].notes,
      legacy.melody,
      config.buzzerMelodies[BUZZER_SLOT_SUCCESS].count * sizeof(MelodyNote)
    );
    config.buzzerMelodyMode[BUZZER_SLOT_SUCCESS] = BUZZER_MELODY_CUSTOM;
  }
  memcpy(config.oledText, legacy.oledText, sizeof(config.oledText));
  config.oledText[MAX_OLED_TEXT] = '\0';
  return true;
}

bool migrateLegacyConfigV4(const LegacyDeviceConfigV4 &legacy) {
  if (
    legacy.magic != CONFIG_MAGIC
    || legacy.version != 4
  ) {
    return false;
  }
  resetConfigDefaults();
  config.fingerprintLedMode = legacy.fingerprintLedMode;
  config.fingerprintLedColor = legacy.fingerprintLedColor;
  config.fingerprintLedSpeed = legacy.fingerprintLedSpeed;
  config.fingerprintLedCycles = legacy.fingerprintLedCycles;
  config.oledFont = legacy.oledFont;
  config.oledContrast = legacy.oledContrast;
  config.displayMode = legacy.displayMode;
  config.eyeExpression = legacy.eyeExpression;
  config.eyeBlinkInterval = legacy.eyeBlinkInterval;
  config.eyeAnimationSpeed = legacy.eyeAnimationSpeed;
  config.eyeSize = legacy.eyeSize;
  config.eyeSpacing = legacy.eyeSpacing;
  config.buzzerPreset = legacy.buzzerPreset;
  memcpy(config.buzzerMelodyMode, legacy.buzzerMelodyMode, sizeof(config.buzzerMelodyMode));
  memcpy(config.buzzerMelodies, legacy.buzzerMelodies, sizeof(config.buzzerMelodies));
  memcpy(config.oledText, legacy.oledText, sizeof(config.oledText));
  config.oledText[MAX_OLED_TEXT] = '\0';
  return true;
}

bool migrateLegacyConfigV5(const LegacyDeviceConfigV5 &legacy) {
  if (
    legacy.magic != CONFIG_MAGIC
    || legacy.version != 5
  ) {
    return false;
  }
  resetConfigDefaults();
  config.fingerprintLedMode = legacy.fingerprintLedMode;
  config.fingerprintLedColor = legacy.fingerprintLedColor;
  config.fingerprintLedSpeed = legacy.fingerprintLedSpeed;
  config.fingerprintLedCycles = legacy.fingerprintLedCycles;
  config.oledFont = legacy.oledFont;
  config.oledContrast = legacy.oledContrast;
  config.displayMode = legacy.displayMode;
  config.eyeExpression = legacy.eyeExpression;
  config.eyeBlinkInterval = legacy.eyeBlinkInterval;
  config.eyeAnimationSpeed = legacy.eyeAnimationSpeed;
  config.eyeSize = legacy.eyeSize;
  config.eyeSpacing = legacy.eyeSpacing;
  config.buzzerPreset = legacy.buzzerPreset;
  memcpy(config.buzzerMelodyMode, legacy.buzzerMelodyMode, sizeof(config.buzzerMelodyMode));
  memcpy(config.buzzerMelodies, legacy.buzzerMelodies, sizeof(config.buzzerMelodies));
  memcpy(config.ledSceneColor, legacy.ledSceneColor, sizeof(config.ledSceneColor));
  memcpy(config.oledText, legacy.oledText, sizeof(config.oledText));
  config.oledText[MAX_OLED_TEXT] = '\0';
  config.oledDatetimeFont = OLED_DATETIME_FONT_XL;
  return true;
}

bool migrateLegacyConfigV6(const LegacyDeviceConfigV6 &legacy) {
  if (
    legacy.magic != CONFIG_MAGIC
    || legacy.version != 6
  ) {
    return false;
  }
  resetConfigDefaults();
  config.fingerprintLedMode = legacy.fingerprintLedMode;
  config.fingerprintLedColor = legacy.fingerprintLedColor;
  config.fingerprintLedSpeed = legacy.fingerprintLedSpeed;
  config.fingerprintLedCycles = legacy.fingerprintLedCycles;
  config.oledFont = legacy.oledFont;
  config.oledDatetimeFont = legacy.oledDatetimeFont;
  config.oledContrast = legacy.oledContrast;
  config.displayMode = legacy.displayMode;
  config.eyeExpression = legacy.eyeExpression;
  config.eyeBlinkInterval = legacy.eyeBlinkInterval;
  config.eyeAnimationSpeed = legacy.eyeAnimationSpeed;
  config.eyeSize = legacy.eyeSize;
  config.eyeSpacing = legacy.eyeSpacing;
  config.buzzerPreset = legacy.buzzerPreset;
  memcpy(config.buzzerMelodyMode, legacy.buzzerMelodyMode, sizeof(config.buzzerMelodyMode));
  memcpy(config.buzzerMelodies, legacy.buzzerMelodies, sizeof(config.buzzerMelodies));
  memcpy(config.ledSceneColor, legacy.ledSceneColor, sizeof(config.ledSceneColor));
  memcpy(config.oledText, legacy.oledText, sizeof(config.oledText));
  config.oledText[MAX_OLED_TEXT] = '\0';
  return true;
}

void loadConfig() {
  bool loaded = false;
  bool migrated = false;
  LegacyDeviceConfigV2 legacy;
  LegacyDeviceConfigV3 legacyV3;
  LegacyDeviceConfigV4 legacyV4;
  LegacyDeviceConfigV5 legacyV5;
  LegacyDeviceConfigV6 legacyV6;
#if defined(GMS_BOARD_ESP32)
  persistentStorageReady = preferences.begin("gms-bio", false);
  const size_t storedLength = persistentStorageReady ? preferences.getBytesLength("config") : 0;
  if (persistentStorageReady && storedLength == sizeof(config)) {
    loaded = preferences.getBytes("config", &config, sizeof(config)) == sizeof(config);
  } else if (persistentStorageReady && storedLength == sizeof(legacyV6)) {
    if (preferences.getBytes("config", &legacyV6, sizeof(legacyV6)) == sizeof(legacyV6)) {
      migrated = migrateLegacyConfigV6(legacyV6);
      loaded = migrated;
    }
  } else if (persistentStorageReady && storedLength == sizeof(legacyV5)) {
    if (preferences.getBytes("config", &legacyV5, sizeof(legacyV5)) == sizeof(legacyV5)) {
      migrated = migrateLegacyConfigV5(legacyV5);
      loaded = migrated;
    }
  } else if (persistentStorageReady && storedLength == sizeof(legacyV4)) {
    if (preferences.getBytes("config", &legacyV4, sizeof(legacyV4)) == sizeof(legacyV4)) {
      migrated = migrateLegacyConfigV4(legacyV4);
      loaded = migrated;
    }
  } else if (persistentStorageReady && storedLength == sizeof(legacyV3)) {
    if (preferences.getBytes("config", &legacyV3, sizeof(legacyV3)) == sizeof(legacyV3)) {
      migrated = migrateLegacyConfigV3(legacyV3);
      loaded = migrated;
    }
  } else if (persistentStorageReady && storedLength == sizeof(legacy)) {
    if (preferences.getBytes("config", &legacy, sizeof(legacy)) == sizeof(legacy)) {
      migrated = migrateLegacyConfig(legacy);
      loaded = migrated;
    }
  }
#else
  uint8_t storedVersion = EEPROM.read(offsetof(DeviceConfig, version));
  if (storedVersion == CONFIG_VERSION) {
    EEPROM.get(0, config);
    loaded = true;
  } else if (storedVersion == 6) {
    EEPROM.get(0, legacyV6);
    migrated = migrateLegacyConfigV6(legacyV6);
    loaded = migrated;
  } else if (storedVersion == 5) {
    EEPROM.get(0, legacyV5);
    migrated = migrateLegacyConfigV5(legacyV5);
    loaded = migrated;
  } else if (storedVersion == 4) {
    EEPROM.get(0, legacyV4);
    migrated = migrateLegacyConfigV4(legacyV4);
    loaded = migrated;
  } else if (storedVersion == 3) {
    EEPROM.get(0, legacyV3);
    migrated = migrateLegacyConfigV3(legacyV3);
    loaded = migrated;
  } else if (storedVersion == 2) {
    EEPROM.get(0, legacy);
    migrated = migrateLegacyConfig(legacy);
    loaded = migrated;
  }
#endif
  bool buzzerConfigValid = true;
  for (uint8_t slot = 0; slot < BUZZER_PRESET_SLOT_COUNT; slot += 1) {
    if (
      config.buzzerMelodyMode[slot] > BUZZER_MELODY_SILENT
      || config.buzzerMelodies[slot].count > MAX_PRESET_MELODY_NOTES
    ) {
      buzzerConfigValid = false;
      break;
    }
  }
  bool ledSceneColorsValid = true;
  for (uint8_t scene = 0; scene < LED_SCENE_COUNT; scene += 1) {
    if (
      config.ledSceneColor[scene] < FINGERPRINT_LED_RED
      || config.ledSceneColor[scene] > GMS_FINGERPRINT_LED_WHITE
    ) {
      ledSceneColorsValid = false;
      break;
    }
  }
  if (
    !loaded
    || config.magic != CONFIG_MAGIC
    || config.version != CONFIG_VERSION
    || !buzzerConfigValid
    || !ledSceneColorsValid
    || config.oledFont > OLED_FONT_LARGE
    || config.oledDatetimeFont > OLED_DATETIME_FONT_COMPACT
    || config.oledTimeFormat > OLED_TIME_24H
    || config.oledTimezoneAuto > 1
    || config.oledTimezoneOffsetMinutes < -720
    || config.oledTimezoneOffsetMinutes > 840
    || config.fingerprintLedMode < FINGERPRINT_LED_BREATHING
    || config.fingerprintLedMode > FINGERPRINT_LED_GRADUAL_OFF
    || config.fingerprintLedColor < FINGERPRINT_LED_RED
#if defined(GMS_BOARD_ESP32)
    || config.fingerprintLedColor > GMS_FINGERPRINT_LED_WHITE
#else
    || config.fingerprintLedColor > FINGERPRINT_LED_PURPLE
#endif
    || config.fingerprintLedSpeed == 0
    || config.displayMode > DISPLAY_MODE_DATETIME
    || config.eyeExpression > EYE_SETTINGS
    || config.eyeBlinkInterval < 1000
    || config.eyeBlinkInterval > 12000
    || config.eyeAnimationSpeed < 1
    || config.eyeAnimationSpeed > 10
    || config.eyeSize < 1
    || config.eyeSize > 3
    || config.eyeSpacing < 4
    || config.eyeSpacing > 24
  ) {
    resetConfigDefaults();
    saveConfig();
  } else if (migrated) {
    saveConfig();
  }
  config.oledText[MAX_OLED_TEXT] = '\0';
  config.oledContrast = ROBO_OLED_CONTRAST;
  config.eyeBlinkInterval = ROBO_EYE_BLINK_INTERVAL_MS;
  config.eyeAnimationSpeed = ROBO_EYE_ANIMATION_SPEED;
  config.eyeSpacing = ROBO_EYE_SPACING;
  if (!config.oledTimezoneAuto) {
    syncedTimezoneOffsetMinutes = config.oledTimezoneOffsetMinutes;
  }
}

bool saveConfig() {
  config.magic = CONFIG_MAGIC;
  config.version = CONFIG_VERSION;
#if defined(GMS_BOARD_ESP32)
  if (!persistentStorageReady) {
    return false;
  }
  return preferences.putBytes("config", &config, sizeof(config)) == sizeof(config);
#else
  EEPROM.put(0, config);
  return true;
#endif
}

#if defined(GMS_BOARD_ESP32)
void refreshOperationalLed();
void syncOledToHostState();
void updateEyeAnimation();
void pumpDeviceAnimation();
void delayWithAnimation(uint32_t durationMs);
#endif
void handleCommand(char *line);

bool applyFingerprintLed() {
  if (!fingerprintReady) {
    return false;
  }
#if defined(GMS_BOARD_ESP32)
  refreshOperationalLed();
  return true;
#else
  return finger.LEDcontrol(
    config.fingerprintLedMode,
    config.fingerprintLedSpeed,
    config.fingerprintLedColor,
    config.fingerprintLedCycles
  ) == FINGERPRINT_OK;
#endif
}

#if defined(GMS_BOARD_ESP32)
void markHostActivity() {
  hostConnected = true;
  lastHostActivityMs = millis();
}

bool isScheduledBreakTime() {
  // Scheduled break-time lighting is disabled (no auto purple at night / lunch).
  return false;
}

bool getLocalCivilHour(int *hourOut) {
  if (hourOut == NULL) {
    return false;
  }
  const uint32_t epoch = currentSyncedEpoch();
  if (epoch == 0) {
    return false;
  }
  const time_t localEpoch = (time_t)((int32_t)epoch + ((int32_t)syncedTimezoneOffsetMinutes * 60));
  struct tm parts;
  gmtime_r(&localEpoch, &parts);
  *hourOut = parts.tm_hour;
  return true;
}

bool isScheduledOledSleepWindow() {
  // Sleep window: 19:00 inclusive through 08:59. Wake from 09:00 until 18:59.
  int hour = 0;
  if (!getLocalCivilHour(&hour)) {
    // No PC time sync yet — do not force sleep.
    return false;
  }
  return hour >= OLED_SLEEP_START_HOUR || hour < OLED_SLEEP_END_HOUR;
}

void applyLedScene(uint8_t scene) {
  if (!fingerprintReady) {
    return;
  }
  if (scene >= LED_SCENE_COUNT) {
    return;
  }
  fingerprintLedHostOverride = false;
  uint8_t color = config.ledSceneColor[scene];
  uint8_t mode = FINGERPRINT_LED_ON;
  uint8_t speed = LED_SPEED_IDLE;
  uint8_t cycles = 0;
  switch (scene) {
    case LED_SCENE_SLEEP:
      mode = FINGERPRINT_LED_ON;
      speed = LED_SPEED_IDLE;
      break;
    case LED_SCENE_BREAK:
      mode = FINGERPRINT_LED_BREATHING;
      speed = LED_SPEED_ALERT;
      break;
    case LED_SCENE_NORMAL:
      mode = FINGERPRINT_LED_BREATHING;
      speed = LED_SPEED_IDLE;
      break;
    case LED_SCENE_SETTINGS:
      mode = FINGERPRINT_LED_BREATHING;
      speed = LED_SPEED_IDLE;
      break;
    case LED_SCENE_ENROLL:
      mode = FINGERPRINT_LED_ON;
      speed = LED_SPEED_IDLE;
      break;
    case LED_SCENE_SUCCESS:
      mode = FINGERPRINT_LED_BREATHING;
      speed = LED_SPEED_ALERT;
      break;
    case LED_SCENE_ERROR:
      mode = FINGERPRINT_LED_BREATHING;
      speed = LED_SPEED_ALERT;
      break;
    default:
      return;
  }
  lastAppliedLedScene = scene;
  finger.LEDcontrol(mode, speed, color, cycles);
}

uint8_t resolveLedScene() {
  const uint32_t now = millis();
  if (ledTemporaryScene <= LED_SCENE_ERROR && ledTemporaryUntilMs != 0) {
    if ((int32_t)(ledTemporaryUntilMs - now) > 0) {
      return ledTemporaryScene;
    }
    ledTemporaryScene = 255;
    ledTemporaryUntilMs = 0;
  }
  if (enrollModeActive) {
    return LED_SCENE_ENROLL;
  }
  // Retina settings panel keeps the OLED awake even after 7pm.
  if (settingsPanelActive) {
    return LED_SCENE_SETTINGS;
  }

  const bool hostIdle =
    !hostConnected
    || lastHostActivityMs == 0
    || (int32_t)(now - lastHostActivityMs) > (int32_t)LED_HOST_IDLE_MS;
  if (hostConnected && hostIdle) {
    hostConnected = false;
  }

  // Sleep when Super Admin is not connected, or inside 7pm–9am (settings closed).
  if (!hostConnected || isScheduledOledSleepWindow()) {
    return LED_SCENE_SLEEP;
  }

  if (isScheduledBreakTime()) {
    return LED_SCENE_BREAK;
  }
  return LED_SCENE_NORMAL;
}

void refreshOperationalLed() {
  applyLedScene(resolveLedScene());
  syncOledToHostState();
}

void showTemporaryLedScene(uint8_t scene, uint32_t durationMs = LED_STATUS_FLASH_MS) {
  ledTemporaryScene = scene;
  ledTemporaryUntilMs = millis() + durationMs;
  applyLedScene(scene);
}

void clearTemporaryLedScene() {
  ledTemporaryScene = 255;
  ledTemporaryUntilMs = 0;
  statusExpressionUntilMs = 0;
  applyLedScene(resolveLedScene());
}

void setEnrollLedMode(bool active) {
  enrollModeActive = active;
  lastAppliedLedScene = 255;
  refreshOperationalLed();
}

void setSettingsLedMode(bool active) {
  settingsPanelActive = active;
  lastAppliedLedScene = 255;
  refreshOperationalLed();
}

void updateOperationalLed() {
  // Keep Super Admin preview / compile purple / flash color-shuffle until a scene restore.
  if (fingerprintLedHostOverride) {
    return;
  }
  const uint8_t previousScene = lastAppliedLedScene;
  const uint8_t scene = resolveLedScene();
  if (scene != lastAppliedLedScene) {
    applyLedScene(scene);
    // When success/error color ends, drop happy/angry eyes with it.
    if (
      statusExpressionUntilMs != 0
      && (previousScene == LED_SCENE_SUCCESS || previousScene == LED_SCENE_ERROR)
      && scene != LED_SCENE_SUCCESS
      && scene != LED_SCENE_ERROR
    ) {
      statusExpressionUntilMs = 0;
      if (
        statusDisplayActive
        && (activeEyeExpression == EYE_SUCCESS || activeEyeExpression == EYE_ERROR || activeEyeExpression == EYE_HAPPY)
      ) {
        if (enrollModeActive) {
          activeEyeExpression = EYE_SCANNING;
          startRoboEyes(EYE_SCANNING);
          lastStatusRoboExpression = EYE_SCANNING;
        } else {
          restoreConfiguredOutputs();
        }
        return;
      }
    }
    syncOledToHostState();
  }
}
#endif

void applyStatusLedForExpression(uint8_t expression) {
#if defined(GMS_BOARD_ESP32)
  if (expression == EYE_SUCCESS || expression == EYE_HAPPY) {
    showTemporaryLedScene(LED_SCENE_SUCCESS, LED_STATUS_FLASH_MS);
    statusExpressionUntilMs = ledTemporaryUntilMs;
    return;
  }
  if (expression == EYE_ERROR) {
    showTemporaryLedScene(LED_SCENE_ERROR, LED_STATUS_FLASH_MS);
    statusExpressionUntilMs = ledTemporaryUntilMs;
    return;
  }
  if (statusExpressionUntilMs != 0) {
    clearTemporaryLedScene();
  }
#else
  (void)expression;
#endif
}

void formatDatetimeTimeLine(char *timeLine, size_t size, const struct tm &parts) {
  if (config.oledTimeFormat == OLED_TIME_24H) {
    snprintf(timeLine, size, "%02d:%02d", parts.tm_hour, parts.tm_min);
    return;
  }
  const int hour12 = parts.tm_hour % 12 == 0 ? 12 : parts.tm_hour % 12;
  const char *meridiem = parts.tm_hour >= 12 ? "PM" : "AM";
  snprintf(timeLine, size, "%d:%02d %s", hour12, parts.tm_min, meridiem);
}

#if defined(GMS_BOARD_ESP32)
void applyRoboEyesGeometry() {
  uint8_t width = 38;
  uint8_t height = 32;
  if (config.eyeSize == 1) {
    width = 28;
    height = 24;
  } else if (config.eyeSize == 3) {
    width = 44;
    height = 36;
  }
  roboEyes.setWidth(width, width);
  roboEyes.setHeight(height, height);
  roboEyes.setBorderradius(8, 8);
  roboEyes.setSpacebetween(ROBO_EYE_SPACING);
}

void applyRoboEyesMood(uint8_t expression) {
  if (expression == EYE_SUCCESS || expression == EYE_HAPPY) {
    roboEyes.setMood(HAPPY);
  } else if (expression == EYE_ERROR) {
    roboEyes.setMood(ANGRY);
  } else if (expression == EYE_SLEEPY) {
    roboEyes.setMood(TIRED);
  } else {
    roboEyes.setMood(DEFAULT);
  }
}

void startHappyEyes() {
  if (!oledReady) {
    return;
  }
  stopSleepMode();
  // Success face: soft rounded happy eyes with gentle idle + laugh bursts.
  roboEyes.setWidth(38, 38);
  roboEyes.setHeight(27, 27);
  roboEyes.setBorderradius(10, 10);
  roboEyes.setSpacebetween(12);
  roboEyes.setMood(HAPPY);
  roboEyes.setAutoblinker(ON, 3, 2);
  roboEyes.setIdleMode(ON, 2, 2);
  roboEyes.setCuriosity(ON);
  roboEyes.setPosition(DEFAULT);
  roboEyes.setDisplayColors(0, 1);
  roboEyes.open();
  roboEyesActive = true;
  happyLaughTimer = millis();
  roboEyes.anim_laugh();
  lastStatusRoboExpression = EYE_SUCCESS;
}

void startAngryEyes() {
  if (!oledReady) {
    return;
  }
  stopSleepMode();
  applyRoboEyesGeometry();
  roboEyes.setMood(ANGRY);
  roboEyes.setAutoblinker(ON, 2, 1);
  roboEyes.setIdleMode(OFF, 0, 0);
  roboEyes.setCuriosity(OFF);
  roboEyes.setPosition(DEFAULT);
  roboEyes.setDisplayColors(0, 1);
  roboEyes.open();
  roboEyesActive = true;
  lastStatusRoboExpression = EYE_ERROR;
}

void updateHappyLaugh() {
  if (activeEyeExpression != EYE_SUCCESS && activeEyeExpression != EYE_HAPPY) {
    return;
  }
  if (!roboEyesActive || sleepZzzOverlayActive) {
    return;
  }
  const uint32_t now = millis();
  if (now - happyLaughTimer < 5000UL) {
    return;
  }
  happyLaughTimer = now;
  roboEyes.anim_laugh();
}

void stopSleepMode() {
  sleepZzzOverlayActive = false;
  sleepZStep = 1;
  sleepDeepBreath = false;
}

void startSleepMode() {
  if (!oledReady) {
    return;
  }
  sleepZzzOverlayActive = true;
  sleepZStep = 1;
  sleepZTimer = millis();
  sleepBreathingTimer = millis();
  sleepDeepBreath = false;
  roboEyes.setMood(TIRED);
  roboEyes.setIdleMode(OFF);
  roboEyes.setCuriosity(OFF);
  roboEyes.setWidth(35, 35);
  roboEyes.setHeight(10, 10);
  roboEyes.setBorderradius(8, 8);
  roboEyes.setSpacebetween(12);
  roboEyes.setPosition(S);
  roboEyes.setAutoblinker(OFF, 0, 0);
  roboEyes.setDisplayColors(0, 1);
  roboEyes.open();
  roboEyesActive = true;
  lastStatusRoboExpression = EYE_SLEEPY;
}

void updateSleepZzz() {
  const uint32_t now = millis();
  if (now - sleepZTimer < SLEEP_ZZZ_STEP_MS) {
    return;
  }
  sleepZTimer = now;
  sleepZStep += 1;
  if (sleepZStep > 3) {
    sleepZStep = 1;
  }
}

void updateSleepBreathing() {
  const uint32_t now = millis();
  if (now - sleepBreathingTimer < SLEEP_BREATHING_MS) {
    return;
  }
  sleepBreathingTimer = now;
  sleepDeepBreath = !sleepDeepBreath;
  roboEyes.setHeight(sleepDeepBreath ? 6 : 10, sleepDeepBreath ? 6 : 10);
}

void startRoboEyes(uint8_t expression) {
  if (!oledReady) {
    return;
  }
  // Legacy "settings" face maps to normal idle eyes (no gear frame).
  if (expression == EYE_SETTINGS) {
    expression = EYE_SCANNING;
  }
  if (expression == EYE_SLEEPY) {
    startSleepMode();
    return;
  }
  if (expression == EYE_SUCCESS || expression == EYE_HAPPY) {
    startHappyEyes();
    return;
  }
  if (expression == EYE_ERROR) {
    startAngryEyes();
    return;
  }
  stopSleepMode();
  applyRoboEyesGeometry();
  applyRoboEyesMood(expression);
  roboEyes.setAutoblinker(ON, ROBO_EYE_BLINK_SECONDS, 2);
  const bool idleOn = expression == EYE_SCANNING
    || expression == EYE_NEUTRAL
    || expression == EYE_THINKING
    || expression == EYE_SURPRISED
    || expression == EYE_EXCITED;
  roboEyes.setIdleMode(idleOn ? ON : OFF, 2, 2);
  roboEyes.setCuriosity(expression == EYE_SCANNING || expression == EYE_NEUTRAL ? ON : OFF);
  roboEyes.setPosition(DEFAULT);
  roboEyes.setDisplayColors(0, 1);
  roboEyes.open();
  roboEyesActive = true;
  lastStatusRoboExpression = expression;
}

void applyOledTextFont(uint8_t fontId) {
#if defined(GMS_BOARD_ESP32)
  // Real GFX typefaces (not only textSize). JSON upload selects one of these presets.
  switch (fontId) {
    case OLED_FONT_SMALL:
      display.setFont();
      display.setTextSize(1);
      break;
    case OLED_FONT_BOLD:
      display.setFont(&FreeSansBold9pt7b);
      display.setTextSize(1);
      break;
    case OLED_FONT_MONO:
      display.setFont(&FreeMono9pt7b);
      display.setTextSize(1);
      break;
    case OLED_FONT_LARGE:
      display.setFont(&FreeSansBold12pt7b);
      display.setTextSize(1);
      break;
    case OLED_FONT_MEDIUM:
    default:
      display.setFont(&FreeSans9pt7b);
      display.setTextSize(1);
      break;
  }
#else
  switch (fontId) {
    case OLED_FONT_SMALL:
    case OLED_FONT_MONO:
      display.setTextSize(1);
      break;
    case OLED_FONT_BOLD:
      display.setTextSize(2);
      break;
    case OLED_FONT_LARGE:
      display.setTextSize(3);
      break;
    case OLED_FONT_MEDIUM:
    default:
      display.setTextSize(1);
      break;
  }
#endif
}

int oledTextBaselineForFont(uint8_t fontId, bool twoLine, bool firstLine) {
#if defined(GMS_BOARD_ESP32)
  switch (fontId) {
    case OLED_FONT_LARGE:
      if (twoLine) {
        return firstLine ? 26 : 54;
      }
      return 42;
    case OLED_FONT_BOLD:
    case OLED_FONT_MONO:
    case OLED_FONT_MEDIUM:
      if (twoLine) {
        return firstLine ? 24 : 50;
      }
      return 38;
    case OLED_FONT_SMALL:
    default:
      if (twoLine) {
        return firstLine ? 22 : 38;
      }
      return 28;
  }
#else
  if (twoLine) {
    if (firstLine) {
      return fontId == OLED_FONT_LARGE ? 14 : 22;
    }
    return fontId == OLED_FONT_LARGE ? 42 : 38;
  }
  return fontId == OLED_FONT_LARGE ? 24 : 28;
#endif
}

void getDatetimeFontLayout(uint8_t fontId, uint8_t &timeSize, uint8_t &dateSize, int &timeY, int &dateY) {
  timeSize = 3;
  dateSize = 1;
  timeY = 12;
  dateY = 52;
  switch (fontId) {
    case OLED_DATETIME_FONT_LARGE:
      timeSize = 2;
      dateSize = 1;
      timeY = 16;
      dateY = 50;
      break;
    case OLED_DATETIME_FONT_MEDIUM:
      timeSize = 2;
      dateSize = 1;
      timeY = 18;
      dateY = 48;
      break;
    case OLED_DATETIME_FONT_COMPACT:
      timeSize = 2;
      dateSize = 1;
      timeY = 8;
      dateY = 44;
      break;
    case OLED_DATETIME_FONT_XL:
    default:
      break;
  }
}

void drawOledText(const char *text) {
  if (!oledReady) {
    return;
  }
  stopSleepMode();
  roboEyesActive = false;
  char firstLine[18];
  char secondLine[18];
  memset(firstLine, 0, sizeof(firstLine));
  memset(secondLine, 0, sizeof(secondLine));
  size_t length = min(strlen(text), (size_t)MAX_OLED_TEXT);
  size_t split = min(length, (size_t)16);
  memcpy(firstLine, text, split);
  if (length > split) {
    memcpy(secondLine, text + split, min(length - split, (size_t)16));
  }
  display.clearDisplay();
  display.setTextColor(SH110X_WHITE);
  applyOledTextFont(config.oledFont);
  int16_t x1 = 0, y1 = 0;
  uint16_t w = 0, h = 0;
  const bool twoLine = secondLine[0] != '\0';
  if (twoLine) {
    display.getTextBounds(firstLine, 0, 0, &x1, &y1, &w, &h);
    display.setCursor(
      max(0, (OLED_WIDTH - (int)w) / 2),
      oledTextBaselineForFont(config.oledFont, true, true)
    );
    display.print(firstLine);
    display.getTextBounds(secondLine, 0, 0, &x1, &y1, &w, &h);
    display.setCursor(
      max(0, (OLED_WIDTH - (int)w) / 2),
      oledTextBaselineForFont(config.oledFont, true, false)
    );
    display.print(secondLine);
  } else {
    display.getTextBounds(firstLine, 0, 0, &x1, &y1, &w, &h);
    display.setCursor(
      max(0, (OLED_WIDTH - (int)w) / 2),
      oledTextBaselineForFont(config.oledFont, false, true)
    );
    display.print(firstLine);
  }
  display.display();
}

uint32_t currentSyncedEpoch() {
  if (syncedEpoch == 0) {
    return 0;
  }
  return syncedEpoch + ((millis() - syncedAtMillis) / 1000UL);
}

void drawDatetimeDisplay() {
  if (!oledReady) {
    return;
  }
  stopSleepMode();
  roboEyesActive = false;
  const uint32_t epoch = currentSyncedEpoch();
  char timeLine[16];
  char dateLine[24];
  if (epoch == 0) {
    snprintf(timeLine, sizeof(timeLine), "--:--");
    snprintf(dateLine, sizeof(dateLine), "Sync time from PC");
  } else {
    const time_t localEpoch = (time_t)((int32_t)epoch + ((int32_t)syncedTimezoneOffsetMinutes * 60));
    struct tm parts;
    gmtime_r(&localEpoch, &parts);
    formatDatetimeTimeLine(timeLine, sizeof(timeLine), parts);
    static const char *const weekdays[] = {
      "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"
    };
    static const char *const months[] = {
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    };
    snprintf(
      dateLine,
      sizeof(dateLine),
      "%s %s %02d %04d",
      weekdays[constrain(parts.tm_wday, 0, 6)],
      months[constrain(parts.tm_mon, 0, 11)],
      parts.tm_mday,
      parts.tm_year + 1900
    );
  }
  display.clearDisplay();
  display.setTextColor(SH110X_WHITE);
  display.setFont();
  uint8_t timeSize = 3;
  uint8_t dateSize = 1;
  int timeY = 12;
  int dateY = 52;
  getDatetimeFontLayout(config.oledDatetimeFont, timeSize, dateSize, timeY, dateY);
  switch (config.oledDatetimeFont) {
    case OLED_DATETIME_FONT_LARGE:
      display.setFont(&FreeSansBold12pt7b);
      timeSize = 1;
      timeY = 34;
      dateY = 54;
      break;
    case OLED_DATETIME_FONT_MEDIUM:
      display.setFont(&FreeSansBold9pt7b);
      timeSize = 1;
      timeY = 32;
      dateY = 52;
      break;
    case OLED_DATETIME_FONT_COMPACT:
      display.setFont(&FreeSans9pt7b);
      timeSize = 1;
      timeY = 28;
      dateY = 50;
      break;
    case OLED_DATETIME_FONT_XL:
    default:
      display.setFont(&FreeSansBold12pt7b);
      timeSize = 1;
      timeY = 36;
      dateY = 56;
      break;
  }
  display.setTextSize(timeSize);
  int16_t x1 = 0, y1 = 0;
  uint16_t w = 0, h = 0;
  display.getTextBounds(timeLine, 0, 0, &x1, &y1, &w, &h);
  display.setCursor(max(0, (OLED_WIDTH - (int)w) / 2), timeY);
  display.print(timeLine);
  display.setFont();
  display.setTextSize(dateSize);
  display.getTextBounds(dateLine, 0, 0, &x1, &y1, &w, &h);
  display.setCursor(max(0, (OLED_WIDTH - (int)w) / 2), dateY);
  display.print(dateLine);
  display.display();
  lastDatetimeDrawnAt = millis();
}

void drawConfiguredDisplay() {
  statusDisplayActive = false;
  if (!oledReady) {
    return;
  }
  if (config.displayMode == DISPLAY_MODE_EYES) {
    activeEyeExpression = EYE_SCANNING;
    startRoboEyes(activeEyeExpression);
  } else if (config.displayMode == DISPLAY_MODE_DATETIME) {
    drawDatetimeDisplay();
  } else {
    drawOledText(config.oledText);
  }
}

void syncOledToHostState() {
  if (!oledReady) {
    return;
  }
  if (statusDisplayActive || enrollModeActive) {
    return;
  }
  if (resolveLedScene() == LED_SCENE_SLEEP) {
    if (activeEyeExpression != EYE_SLEEPY) {
      statusDisplayActive = false;
      activeEyeExpression = EYE_SLEEPY;
      startRoboEyes(EYE_SLEEPY);
    }
    return;
  }
  if (activeEyeExpression == EYE_SLEEPY) {
    stopSleepMode();
    drawConfiguredDisplay();
  }
}

void showStatusDisplay(const __FlashStringHelper *text, uint8_t expression) {
  (void)text;
  statusDisplayActive = true;
  const uint8_t nextExpression = expression == EYE_SETTINGS ? EYE_SCANNING : expression;
  applyStatusLedForExpression(nextExpression);
  // Always refresh success/error faces so happy/angry stay locked to the LED flash.
  const bool forceRefresh = nextExpression == EYE_SUCCESS
    || nextExpression == EYE_HAPPY
    || nextExpression == EYE_ERROR;
  if (forceRefresh || !roboEyesActive || nextExpression != lastStatusRoboExpression) {
    activeEyeExpression = nextExpression;
    startRoboEyes(activeEyeExpression);
    lastStatusRoboExpression = nextExpression;
  }
}

void updateEyeAnimation() {
  if (!oledReady) {
    return;
  }
  if (!statusDisplayActive && config.displayMode != DISPLAY_MODE_EYES && activeEyeExpression != EYE_SLEEPY) {
    return;
  }
  if (roboEyesActive) {
    if (sleepZzzOverlayActive) {
      updateSleepZzz();
      updateSleepBreathing();
    } else {
      updateHappyLaugh();
    }
    roboEyes.update();
  }
}

void updateDatetimeAnimation() {
  if (statusDisplayActive || config.displayMode != DISPLAY_MODE_DATETIME) {
    return;
  }
  if (millis() - lastDatetimeDrawnAt < 1000) {
    return;
  }
  drawDatetimeDisplay();
}

bool beginOledDisplay() {
  Wire.begin(OLED_SDA, OLED_SCL);
  delay(250);
  oledReady = display.begin(OLED_ADDRESS, true);
  if (!oledReady) {
    return false;
  }
  display.clearDisplay();
  display.display();
  roboEyes.begin(OLED_WIDTH, OLED_HEIGHT, 60);
  roboEyes.setDisplayColors(0, 1);
  applyRoboEyesGeometry();
  roboEyes.setAutoblinker(ON, ROBO_EYE_BLINK_SECONDS, 2);
  roboEyes.setIdleMode(ON, 2, 2);
  roboEyes.setCuriosity(ON);
  roboEyes.setMood(DEFAULT);
  roboEyes.setPosition(DEFAULT);
  roboEyes.open();
  roboEyesActive = true;
  return true;
}

void restoreConfiguredOutputs() {
  statusDisplayActive = false;
  lastStatusRoboExpression = 255;
  statusExpressionUntilMs = 0;
#if defined(GMS_BOARD_ESP32)
  ledTemporaryScene = 255;
  ledTemporaryUntilMs = 0;
#endif
  applyFingerprintLed();
  drawConfiguredDisplay();
  syncOledToHostState();
}

#else
void setOledFont() {
  switch (config.oledFont) {
    case OLED_FONT_SMALL:
      oled.setFont(u8g2_font_5x7_tr);
      break;
    case OLED_FONT_BOLD:
      oled.setFont(u8g2_font_7x13B_tr);
      break;
    case OLED_FONT_MONO:
      oled.setFont(u8g2_font_t0_12_tr);
      break;
    case OLED_FONT_LARGE:
      oled.setFont(u8g2_font_logisoso22_tr);
      break;
    case OLED_FONT_MEDIUM:
    default:
      oled.setFont(u8g2_font_6x12_tr);
      break;
  }
}

void drawCenteredLine(const char *text, uint8_t y) {
  int width = oled.getStrWidth(text);
  int x = max(0, (128 - width) / 2);
  oled.drawStr(x, y, text);
}

void drawOledText(const char *text) {
  char firstLine[18];
  char secondLine[18];
  memset(firstLine, 0, sizeof(firstLine));
  memset(secondLine, 0, sizeof(secondLine));
  size_t length = min(strlen(text), (size_t)MAX_OLED_TEXT);
  size_t split = min(length, (size_t)16);
  memcpy(firstLine, text, split);
  if (length > split) {
    memcpy(secondLine, text + split, min(length - split, (size_t)16));
  }
  oled.setContrast(ROBO_OLED_CONTRAST);
  oled.firstPage();
  do {
    const uint8_t singleLineY = config.oledFont == OLED_FONT_LARGE ? 42 : 38;
    const uint8_t firstLineY = config.oledFont == OLED_FONT_LARGE ? 24 : 28;
    const uint8_t secondLineY = config.oledFont == OLED_FONT_LARGE ? 52 : 48;
    setOledFont();
    if (secondLine[0]) {
      drawCenteredLine(firstLine, firstLineY);
      drawCenteredLine(secondLine, secondLineY);
    } else {
      drawCenteredLine(firstLine, singleLineY);
    }
  } while (oled.nextPage());
}

void drawRobotEyesOnly() {
  const uint8_t eyeWidth = config.eyeSize == 1 ? 28 : config.eyeSize == 3 ? 44 : 38;
  const uint8_t eyeHeight = config.eyeSize == 1 ? 24 : config.eyeSize == 3 ? 36 : 32;
  const uint8_t totalWidth = eyeWidth * 2 + ROBO_EYE_SPACING;
  const uint8_t leftX = (128 - totalWidth) / 2;
  const uint8_t rightX = leftX + eyeWidth + ROBO_EYE_SPACING;
  const uint8_t topY = (64 - eyeHeight) / 2;
  oled.setContrast(ROBO_OLED_CONTRAST);
  oled.firstPage();
  do {
    oled.setDrawColor(1);
    oled.drawRBox(leftX, topY, eyeWidth, eyeHeight, 8);
    oled.drawRBox(rightX, topY, eyeWidth, eyeHeight, 8);
  } while (oled.nextPage());
}

uint32_t currentSyncedEpoch() {
  if (syncedEpoch == 0) return 0;
  return syncedEpoch + ((millis() - syncedAtMillis) / 1000UL);
}

void drawDatetimeDisplay() {
  char timeLine[16];
  char dateLine[24];
  const uint32_t epoch = currentSyncedEpoch();
  if (epoch == 0) {
    snprintf(timeLine, sizeof(timeLine), "--:--");
    snprintf(dateLine, sizeof(dateLine), "Sync PC");
  } else {
    const time_t localEpoch = (time_t)((int32_t)epoch + ((int32_t)syncedTimezoneOffsetMinutes * 60));
    struct tm parts;
    gmtime_r(&localEpoch, &parts);
    formatDatetimeTimeLine(timeLine, sizeof(timeLine), parts);
    static const char *const weekdays[] = { "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat" };
    static const char *const months[] = {
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    };
    snprintf(
      dateLine,
      sizeof(dateLine),
      "%s %s %02d",
      weekdays[constrain(parts.tm_wday, 0, 6)],
      months[constrain(parts.tm_mon, 0, 11)],
      parts.tm_mday
    );
  }
  oled.firstPage();
  do {
    switch (config.oledDatetimeFont) {
      case OLED_DATETIME_FONT_LARGE:
        oled.setFont(u8g2_font_logisoso24_tn);
        drawCenteredLine(timeLine, 34);
        oled.setFont(u8g2_font_6x12_tr);
        drawCenteredLine(dateLine, 54);
        break;
      case OLED_DATETIME_FONT_MEDIUM:
        oled.setFont(u8g2_font_logisoso20_tn);
        drawCenteredLine(timeLine, 32);
        oled.setFont(u8g2_font_6x12_tr);
        drawCenteredLine(dateLine, 52);
        break;
      case OLED_DATETIME_FONT_COMPACT:
        oled.setFont(u8g2_font_logisoso18_tn);
        drawCenteredLine(timeLine, 28);
        oled.setFont(u8g2_font_5x7_tr);
        drawCenteredLine(dateLine, 48);
        break;
      case OLED_DATETIME_FONT_XL:
      default:
        oled.setFont(u8g2_font_logisoso32_tn);
        drawCenteredLine(timeLine, 38);
        oled.setFont(u8g2_font_6x12_tr);
        drawCenteredLine(dateLine, 56);
        break;
    }
  } while (oled.nextPage());
  lastDatetimeDrawnAt = millis();
}

void drawConfiguredDisplay() {
  statusDisplayActive = false;
  if (config.displayMode == DISPLAY_MODE_EYES) {
    drawRobotEyesOnly();
  } else if (config.displayMode == DISPLAY_MODE_DATETIME) {
    drawDatetimeDisplay();
  } else {
    drawOledText(config.oledText);
  }
}

void showStatusDisplay(const __FlashStringHelper *text, uint8_t expression) {
  (void)text;
  statusDisplayActive = true;
  activeEyeExpression = expression;
  applyStatusLedForExpression(expression);
  drawRobotEyesOnly();
}

void updateEyeAnimation() {}
void updateDatetimeAnimation() {
  if (statusDisplayActive || config.displayMode != DISPLAY_MODE_DATETIME) return;
  if (millis() - lastDatetimeDrawnAt < 1000) return;
  drawDatetimeDisplay();
}

bool beginOledDisplay() {
  oled.begin();
  return true;
}

void restoreConfiguredOutputs() {
  statusDisplayActive = false;
  lastStatusRoboExpression = 255;
  applyFingerprintLed();
  drawConfiguredDisplay();
}
#endif

void pumpDeviceAnimation() {
#if defined(GMS_BOARD_ESP32)
  updateOperationalLed();
#endif
  updateEyeAnimation();
}

#if defined(GMS_BOARD_ESP32)
char fingerprintCancelBuffer[COMMAND_BUFFER_SIZE];
uint8_t fingerprintCancelLength = 0;
#define HOST_CMD_QUEUE_SIZE 8
char hostCmdQueue[HOST_CMD_QUEUE_SIZE][COMMAND_BUFFER_SIZE];
uint8_t hostCmdQueueHead = 0;
uint8_t hostCmdQueueCount = 0;

void enqueueHostCommand(const char *command) {
  if (!command || !command[0] || hostCmdQueueCount >= HOST_CMD_QUEUE_SIZE) {
    return;
  }
  const uint8_t slot = (hostCmdQueueHead + hostCmdQueueCount) % HOST_CMD_QUEUE_SIZE;
  strncpy(hostCmdQueue[slot], command, COMMAND_BUFFER_SIZE - 1);
  hostCmdQueue[slot][COMMAND_BUFFER_SIZE - 1] = '\0';
  hostCmdQueueCount += 1;
}

bool isFingerprintEnrollCommand(const char *command) {
  return command
    && (
      GMS_STREQ(command, "FP_ENROLL_AUTO")
      || strncmp(command, "FP_ENROLL|", 10) == 0
      || GMS_STREQ(command, "FP_ENROLL")
    );
}

void pruneQueuedEnrollCommands() {
  if (hostCmdQueueCount == 0) {
    return;
  }
  char kept[HOST_CMD_QUEUE_SIZE][COMMAND_BUFFER_SIZE];
  uint8_t keptCount = 0;
  for (uint8_t i = 0; i < hostCmdQueueCount; i += 1) {
    const uint8_t idx = (hostCmdQueueHead + i) % HOST_CMD_QUEUE_SIZE;
    if (isFingerprintEnrollCommand(hostCmdQueue[idx])) {
      continue;
    }
    strncpy(kept[keptCount], hostCmdQueue[idx], COMMAND_BUFFER_SIZE - 1);
    kept[keptCount][COMMAND_BUFFER_SIZE - 1] = '\0';
    keptCount += 1;
  }
  hostCmdQueueHead = 0;
  hostCmdQueueCount = keptCount;
  for (uint8_t i = 0; i < keptCount; i += 1) {
    strncpy(hostCmdQueue[i], kept[i], COMMAND_BUFFER_SIZE - 1);
    hostCmdQueue[i][COMMAND_BUFFER_SIZE - 1] = '\0';
  }
}

void processQueuedHostCommands() {
  while (hostCmdQueueCount > 0) {
    char queued[COMMAND_BUFFER_SIZE];
    strncpy(queued, hostCmdQueue[hostCmdQueueHead], COMMAND_BUFFER_SIZE);
    queued[COMMAND_BUFFER_SIZE - 1] = '\0';
    hostCmdQueueHead = (hostCmdQueueHead + 1) % HOST_CMD_QUEUE_SIZE;
    hostCmdQueueCount -= 1;
    if (queued[0]) {
      handleCommand(queued);
    }
  }
}

void beginFingerprintOperation() {
  fingerprintCancelRequested = false;
  fingerprintCancelLength = 0;
  fingerprintOperationActive = true;
}

void endFingerprintOperation() {
  fingerprintCancelRequested = false;
  fingerprintCancelLength = 0;
  fingerprintOperationActive = false;
}

void applyFingerprintCancelNow() {
  // Latch cancel whenever an enroll/scan is actually running — even if enroll
  // lighting was already cleared by LED|settings. Skipping the latch left the
  // ESP stuck in waitForFingerImage and made re-enroll lag for seconds.
  const bool wasActive = fingerprintOperationActive || enrollModeActive;
  fingerprintLedHostOverride = false;
  setEnrollLedMode(false);
  ledTemporaryScene = 255;
  ledTemporaryUntilMs = 0;
  statusExpressionUntilMs = 0;
  statusDisplayActive = false;
  restoreConfiguredOutputs();
  pruneQueuedEnrollCommands();
  if (fingerprintCancelRequested) {
    return;
  }
  if (!wasActive) {
    // Idle preempt — silent, no latch.
    return;
  }
  fingerprintCancelRequested = true;
  gmsControlSerial.println(
    F("{\"event\":\"fingerprint-cancelled\",\"ok\":false,\"message\":\"Fingerprint operation cancelled\"}")
  );
}

void pollFingerprintHostCancel() {
  while (gmsControlSerial.available() > 0) {
    const char incoming = (char)gmsControlSerial.read();
    if (incoming == '\r') {
      continue;
    }
    if (incoming == '\n') {
      fingerprintCancelBuffer[fingerprintCancelLength] = '\0';
      fingerprintCancelLength = 0;
      if (
        GMS_STREQ(fingerprintCancelBuffer, "FP_CANCEL")
        || GMS_STREQ(fingerprintCancelBuffer, "LED|enroll-end")
      ) {
        applyFingerprintCancelNow();
      } else if (GMS_STREQ(fingerprintCancelBuffer, "LED|enroll")) {
        // Re-open of the fingerprint modal while the previous enroll is still
        // unwinding — turn blue on now, and run the command after we return.
        fingerprintLedHostOverride = false;
        setEnrollLedMode(true);
        enqueueHostCommand(fingerprintCancelBuffer);
      } else if (
        GMS_STREQ(fingerprintCancelBuffer, "LED|settings")
        || GMS_STREQ(fingerprintCancelBuffer, "LED|normal")
        || GMS_STREQ(fingerprintCancelBuffer, "LED|restore")
      ) {
        // Modal closed / cancel restore — drop blue immediately, then queue the
        // full scene command so settings/normal apply when the enroll loop ends.
        fingerprintLedHostOverride = false;
        setEnrollLedMode(false);
        enqueueHostCommand(fingerprintCancelBuffer);
      } else if (isFingerprintEnrollCommand(fingerprintCancelBuffer)) {
        // Restart enroll cleanly: cancel the current scan, keep only this latest
        // enroll command so the ESP never runs a stack of enrolls back-to-back.
        applyFingerprintCancelNow();
        pruneQueuedEnrollCommands();
        fingerprintLedHostOverride = false;
        setEnrollLedMode(true);
        enqueueHostCommand(fingerprintCancelBuffer);
      } else if (fingerprintCancelBuffer[0]) {
        enqueueHostCommand(fingerprintCancelBuffer);
      }
      continue;
    }
    if (fingerprintCancelLength < sizeof(fingerprintCancelBuffer) - 1) {
      fingerprintCancelBuffer[fingerprintCancelLength++] = incoming;
    } else {
      fingerprintCancelLength = 0;
    }
  }
}

bool fingerprintOperationCancelled() {
  pollFingerprintHostCancel();
  return fingerprintCancelRequested;
}
#endif

void delayWithAnimation(uint32_t durationMs) {
  if (durationMs == 0) {
    return;
  }
  const uint32_t endAt = millis() + durationMs;
  while ((int32_t)(endAt - millis()) > 0) {
#if defined(GMS_BOARD_ESP32)
    if (fingerprintOperationCancelled()) {
      return;
    }
#endif
    pumpDeviceAnimation();
    delay(16);
  }
}

void waitForTemporaryFeedback() {
#if defined(GMS_BOARD_ESP32)
  while (ledTemporaryUntilMs != 0 && (int32_t)(ledTemporaryUntilMs - millis()) > 0) {
    pumpDeviceAnimation();
    delay(16);
  }
#else
  delayWithAnimation(450);
#endif
}

uint8_t runFingerImage2Tz(uint8_t bufferId) {
  pumpDeviceAnimation();
  const uint8_t result = finger.image2Tz(bufferId);
  pumpDeviceAnimation();
  return result;
}

uint8_t runFingerSearch(uint8_t bufferId) {
  pumpDeviceAnimation();
  const uint8_t result = finger.fingerSearch(bufferId);
  pumpDeviceAnimation();
  return result;
}

uint8_t runFingerCreateModel() {
  pumpDeviceAnimation();
  const uint8_t result = finger.createModel();
  pumpDeviceAnimation();
  return result;
}

uint8_t runFingerStoreModel(uint8_t slot) {
  pumpDeviceAnimation();
  const uint8_t result = finger.storeModel(slot);
  pumpDeviceAnimation();
  return result;
}

uint8_t runFingerLoadModel(uint8_t slot) {
  pumpDeviceAnimation();
  const uint8_t result = finger.loadModel(slot);
  pumpDeviceAnimation();
  return result;
}

void playNote(uint16_t frequency, uint16_t durationMs) {
  durationMs = constrain(durationMs, 20, 3000);
  if (frequency == 0) {
    noTone(BUZZER_PIN);
    delayWithAnimation(durationMs);
    return;
  }
  tone(BUZZER_PIN, constrain(frequency, 31, 8000), durationMs);
  delayWithAnimation(durationMs + 25);
  noTone(BUZZER_PIN);
}

void playCustomMelody() {
  playMelodySlot(BUZZER_SLOT_SUCCESS);
}

void playMelodySlot(uint8_t slot) {
  if (slot >= BUZZER_PRESET_SLOT_COUNT) {
    return;
  }
  for (uint8_t index = 0; index < config.buzzerMelodies[slot].count; index += 1) {
    playNote(
      config.buzzerMelodies[slot].notes[index].frequency,
      config.buzzerMelodies[slot].notes[index].durationMs
    );
  }
}

void playBuiltinBuzzerPreset(uint8_t preset) {
  if (preset == BUZZER_WELCOME) {
    playNote(523, 110);
    playNote(659, 110);
    playNote(784, 180);
  } else if (preset == BUZZER_WARNING) {
    playNote(740, 130);
    playNote(0, 70);
    playNote(740, 130);
  } else if (preset == BUZZER_ERROR) {
    playNote(330, 180);
    playNote(247, 260);
  } else {
    playNote(880, 100);
    playNote(1175, 180);
  }
}

uint8_t buzzerPresetToSlot(uint8_t preset) {
  if (preset == BUZZER_WELCOME) {
    return BUZZER_SLOT_WELCOME;
  }
  if (preset == BUZZER_WARNING) {
    return BUZZER_SLOT_WARNING;
  }
  if (preset == BUZZER_ERROR) {
    return BUZZER_SLOT_ERROR;
  }
  return BUZZER_SLOT_SUCCESS;
}

void playBuzzerPreset(uint8_t preset) {
  if (preset == BUZZER_SILENT) {
    noTone(BUZZER_PIN);
    return;
  }
  if (preset == BUZZER_CUSTOM) {
    preset = BUZZER_SUCCESS;
  }
  const uint8_t slot = buzzerPresetToSlot(preset);
  if (config.buzzerMelodyMode[slot] == BUZZER_MELODY_SILENT) {
    noTone(BUZZER_PIN);
    return;
  }
  if (
    config.buzzerMelodyMode[slot] == BUZZER_MELODY_CUSTOM
    && config.buzzerMelodies[slot].count > 0
  ) {
    playMelodySlot(slot);
    return;
  }
  playBuiltinBuzzerPreset(preset);
}

uint8_t buzzerSlotFromName(const char *name) {
  if (strcmp(name, "welcome") == 0) return BUZZER_SLOT_WELCOME;
  if (strcmp(name, "warning") == 0) return BUZZER_SLOT_WARNING;
  if (strcmp(name, "error") == 0) return BUZZER_SLOT_ERROR;
  return BUZZER_SLOT_SUCCESS;
}

const __FlashStringHelper *buzzerSlotNameFromId(uint8_t slot) {
  if (slot == BUZZER_SLOT_WELCOME) return F("welcome");
  if (slot == BUZZER_SLOT_WARNING) return F("warning");
  if (slot == BUZZER_SLOT_ERROR) return F("error");
  return F("success");
}

uint8_t buzzerMelodyModeFromName(const char *name) {
  if (strcmp(name, "custom") == 0 || strcmp(name, "uploaded") == 0) return BUZZER_MELODY_CUSTOM;
  if (strcmp(name, "silent") == 0) return BUZZER_MELODY_SILENT;
  return BUZZER_MELODY_BUILTIN;
}

const __FlashStringHelper *buzzerMelodyModeNameFromId(uint8_t mode) {
  if (mode == BUZZER_MELODY_CUSTOM) return F("custom");
  if (mode == BUZZER_MELODY_SILENT) return F("silent");
  return F("builtin");
}

void signalEnrollScanStepSuccess() {
  playBuzzerPreset(BUZZER_SUCCESS);
#if defined(GMS_BOARD_ESP32)
  statusDisplayActive = true;
  activeEyeExpression = EYE_SUCCESS;
  showTemporaryLedScene(LED_SCENE_SUCCESS, 1400);
  statusExpressionUntilMs = ledTemporaryUntilMs;
  startHappyEyes();
  // Avoid "Scan captured" wording so Super Admin never flashes that title
  // right before an already-registered rejection on older firmware paths.
  sendFingerprintStage(F("Continue enrollment"));
  delayWithAnimation(200);
#endif
}

uint8_t fontIdFromName(const char *name) {
  if (strcmp(name, "small") == 0) return OLED_FONT_SMALL;
  if (strcmp(name, "bold") == 0) return OLED_FONT_BOLD;
  if (strcmp(name, "mono") == 0) return OLED_FONT_MONO;
  if (strcmp(name, "large") == 0) return OLED_FONT_LARGE;
  return OLED_FONT_MEDIUM;
}

uint8_t datetimeFontIdFromName(const char *name) {
  if (GMS_STREQ(name, "clock-large") || GMS_STREQ(name, "large")) return OLED_DATETIME_FONT_LARGE;
  if (GMS_STREQ(name, "clock-medium") || GMS_STREQ(name, "medium")) return OLED_DATETIME_FONT_MEDIUM;
  if (GMS_STREQ(name, "clock-compact") || GMS_STREQ(name, "compact")) return OLED_DATETIME_FONT_COMPACT;
  return OLED_DATETIME_FONT_XL;
}

uint8_t buzzerPresetFromName(const char *name) {
  if (strcmp(name, "welcome") == 0) return BUZZER_WELCOME;
  if (strcmp(name, "warning") == 0) return BUZZER_WARNING;
  if (strcmp(name, "error") == 0) return BUZZER_ERROR;
  if (strcmp(name, "custom") == 0) return BUZZER_CUSTOM;
  if (strcmp(name, "silent") == 0) return BUZZER_SILENT;
  return BUZZER_SUCCESS;
}

uint8_t fingerprintLedModeFromName(const char *name) {
  if (strcmp(name, "flashing") == 0) return FINGERPRINT_LED_FLASHING;
  if (strcmp(name, "on") == 0) return FINGERPRINT_LED_ON;
  if (strcmp(name, "off") == 0) return FINGERPRINT_LED_OFF;
  if (strcmp(name, "gradual-on") == 0) return FINGERPRINT_LED_GRADUAL_ON;
  if (strcmp(name, "gradual-off") == 0) return FINGERPRINT_LED_GRADUAL_OFF;
  return FINGERPRINT_LED_BREATHING;
}

uint8_t fingerprintLedColorFromName(const char *name) {
  if (strcmp(name, "red") == 0) return FINGERPRINT_LED_RED;
  if (strcmp(name, "purple") == 0) return FINGERPRINT_LED_PURPLE;
  if (strcmp(name, "green") == 0) return GMS_FINGERPRINT_LED_GREEN;
  if (strcmp(name, "yellow") == 0) return GMS_FINGERPRINT_LED_YELLOW;
  if (strcmp(name, "cyan") == 0) return GMS_FINGERPRINT_LED_CYAN;
  if (strcmp(name, "white") == 0) return GMS_FINGERPRINT_LED_WHITE;
  return FINGERPRINT_LED_BLUE;
}

uint8_t ledSceneFromName(const char *name) {
  if (GMS_STREQ(name, "break")) return LED_SCENE_BREAK;
  if (GMS_STREQ(name, "normal")) return LED_SCENE_NORMAL;
  if (GMS_STREQ(name, "settings")) return LED_SCENE_SETTINGS;
  if (GMS_STREQ(name, "enroll")) return LED_SCENE_ENROLL;
  if (GMS_STREQ(name, "success")) return LED_SCENE_SUCCESS;
  if (GMS_STREQ(name, "error")) return LED_SCENE_ERROR;
  return LED_SCENE_SLEEP;
}

const __FlashStringHelper *ledSceneNameFromId(uint8_t id) {
  if (id == LED_SCENE_BREAK) return F("break");
  if (id == LED_SCENE_NORMAL) return F("normal");
  if (id == LED_SCENE_SETTINGS) return F("settings");
  if (id == LED_SCENE_ENROLL) return F("enroll");
  if (id == LED_SCENE_SUCCESS) return F("success");
  if (id == LED_SCENE_ERROR) return F("error");
  return F("sleep");
}

const __FlashStringHelper *fontNameFromId(uint8_t id) {
  if (id == OLED_FONT_SMALL) return F("small");
  if (id == OLED_FONT_BOLD) return F("bold");
  if (id == OLED_FONT_MONO) return F("mono");
  if (id == OLED_FONT_LARGE) return F("large");
  return F("medium");
}

const __FlashStringHelper *datetimeFontNameFromId(uint8_t id) {
  if (id == OLED_DATETIME_FONT_LARGE) return F("clock-large");
  if (id == OLED_DATETIME_FONT_MEDIUM) return F("clock-medium");
  if (id == OLED_DATETIME_FONT_COMPACT) return F("clock-compact");
  return F("clock-xl");
}

const __FlashStringHelper *timeFormatNameFromId(uint8_t id) {
  return id == OLED_TIME_24H ? F("24h") : F("local");
}

const __FlashStringHelper *buzzerPresetNameFromId(uint8_t id) {
  if (id == BUZZER_WELCOME) return F("welcome");
  if (id == BUZZER_WARNING) return F("warning");
  if (id == BUZZER_ERROR) return F("error");
  if (id == BUZZER_CUSTOM) return F("custom");
  if (id == BUZZER_SILENT) return F("silent");
  return F("success");
}

const __FlashStringHelper *fingerprintLedModeNameFromId(uint8_t id) {
  if (id == FINGERPRINT_LED_FLASHING) return F("flashing");
  if (id == FINGERPRINT_LED_ON) return F("on");
  if (id == FINGERPRINT_LED_OFF) return F("off");
  if (id == FINGERPRINT_LED_GRADUAL_ON) return F("gradual-on");
  if (id == FINGERPRINT_LED_GRADUAL_OFF) return F("gradual-off");
  return F("breathing");
}

const __FlashStringHelper *fingerprintLedColorNameFromId(uint8_t id) {
  if (id == FINGERPRINT_LED_RED) return F("red");
  if (id == FINGERPRINT_LED_PURPLE) return F("purple");
  if (id == GMS_FINGERPRINT_LED_GREEN) return F("green");
  if (id == GMS_FINGERPRINT_LED_YELLOW) return F("yellow");
  if (id == GMS_FINGERPRINT_LED_CYAN) return F("cyan");
  if (id == GMS_FINGERPRINT_LED_WHITE) return F("white");
  return F("blue");
}

uint8_t displayModeFromName(const char *name) {
  if (GMS_STREQ(name, "eyes")) return DISPLAY_MODE_EYES;
  if (GMS_STREQ(name, "datetime") || GMS_STREQ(name, "date-time") || GMS_STREQ(name, "clock")) {
    return DISPLAY_MODE_DATETIME;
  }
  return DISPLAY_MODE_TEXT;
}

const __FlashStringHelper *displayModeNameFromId(uint8_t id) {
  if (id == DISPLAY_MODE_EYES) return F("eyes");
  if (id == DISPLAY_MODE_DATETIME) return F("datetime");
  return F("text");
}

uint8_t eyeExpressionFromName(const char *name) {
  if (GMS_STREQ(name, "happy")) return EYE_HAPPY;
  if (GMS_STREQ(name, "excited")) return EYE_EXCITED;
  if (GMS_STREQ(name, "thinking")) return EYE_THINKING;
  if (GMS_STREQ(name, "scanning") || GMS_STREQ(name, "watching")) return EYE_SCANNING;
  if (GMS_STREQ(name, "success")) return EYE_SUCCESS;
  if (GMS_STREQ(name, "error") || GMS_STREQ(name, "angry")) return EYE_ERROR;
  if (GMS_STREQ(name, "sleepy")) return EYE_SLEEPY;
  if (GMS_STREQ(name, "surprised")) return EYE_SURPRISED;
  if (GMS_STREQ(name, "settings") || GMS_STREQ(name, "setting")) return EYE_SETTINGS;
  return EYE_NEUTRAL;
}

const __FlashStringHelper *eyeExpressionNameFromId(uint8_t id) {
  if (id == EYE_HAPPY) return F("happy");
  if (id == EYE_EXCITED) return F("excited");
  if (id == EYE_THINKING) return F("thinking");
  if (id == EYE_SCANNING) return F("scanning");
  if (id == EYE_SUCCESS) return F("success");
  if (id == EYE_ERROR) return F("error");
  if (id == EYE_SLEEPY) return F("sleepy");
  if (id == EYE_SURPRISED) return F("surprised");
  if (id == EYE_SETTINGS) return F("settings");
  return F("neutral");
}

void printJsonEscaped(const char *value) {
  const char *cursor = value ? value : "";
  while (*cursor) {
    const char character = *cursor++;
    if (character == '"') {
      gmsControlSerial.print(F("\\\""));
    } else if (character == '\\') {
      gmsControlSerial.print(F("\\\\"));
    } else if ((uint8_t)character < 0x20) {
      gmsControlSerial.write(' ');
    } else {
      gmsControlSerial.write(character);
    }
  }
}

void sendDeviceConfig() {
  gmsControlSerial.print(F("{\"event\":\"config\",\"ok\":true,\"message\":\"Device configuration loaded\",\"config\":{\"fingerprintLed\":{\"mode\":\""));
  gmsControlSerial.print(fingerprintLedModeNameFromId(config.fingerprintLedMode));
  gmsControlSerial.print(F("\",\"color\":\""));
  gmsControlSerial.print(fingerprintLedColorNameFromId(config.fingerprintLedColor));
  gmsControlSerial.print(F("\",\"speed\":"));
  gmsControlSerial.print(config.fingerprintLedSpeed);
  gmsControlSerial.print(F(",\"cycles\":"));
  gmsControlSerial.print(config.fingerprintLedCycles);
  gmsControlSerial.print(F("},\"oled\":{\"mode\":\""));
  gmsControlSerial.print(displayModeNameFromId(config.displayMode));
  gmsControlSerial.print(F("\",\"font\":\""));
  gmsControlSerial.print(fontNameFromId(config.oledFont));
  gmsControlSerial.print(F("\",\"datetimeFont\":\""));
  gmsControlSerial.print(datetimeFontNameFromId(config.oledDatetimeFont));
  gmsControlSerial.print(F("\",\"datetimeSettings\":{\"timeFormat\":\""));
  gmsControlSerial.print(timeFormatNameFromId(config.oledTimeFormat));
  gmsControlSerial.print(F("\",\"timezoneAuto\":"));
  gmsControlSerial.print(config.oledTimezoneAuto ? F("true") : F("false"));
  gmsControlSerial.print(F(",\"timezoneOffsetMinutes\":"));
  gmsControlSerial.print(config.oledTimezoneOffsetMinutes);
  gmsControlSerial.print(F("},\"text\":\""));
  printJsonEscaped(config.oledText);
  gmsControlSerial.print(F("\",\"contrast\":"));
  gmsControlSerial.print(ROBO_OLED_CONTRAST);
  gmsControlSerial.print(F(",\"eyes\":{\"expression\":\"scanning\",\"blinkInterval\":"));
  gmsControlSerial.print(ROBO_EYE_BLINK_INTERVAL_MS);
  gmsControlSerial.print(F(",\"animationSpeed\":"));
  gmsControlSerial.print(ROBO_EYE_ANIMATION_SPEED);
  gmsControlSerial.print(F(",\"eyeSize\":"));
  gmsControlSerial.print(config.eyeSize);
  gmsControlSerial.print(F(",\"spacing\":"));
  gmsControlSerial.print(ROBO_EYE_SPACING);
  gmsControlSerial.print(F("}},\"buzzer\":{\"preset\":\""));
  gmsControlSerial.print(buzzerPresetNameFromId(config.buzzerPreset));
  gmsControlSerial.print(F("\",\"presets\":{"));
  for (uint8_t slot = 0; slot < BUZZER_PRESET_SLOT_COUNT; slot += 1) {
    if (slot > 0) {
      gmsControlSerial.write(',');
    }
    gmsControlSerial.print(F("\""));
    gmsControlSerial.print(buzzerSlotNameFromId(slot));
    gmsControlSerial.print(F("\":{\"mode\":\""));
    gmsControlSerial.print(buzzerMelodyModeNameFromId(config.buzzerMelodyMode[slot]));
    gmsControlSerial.print(F("\",\"notes\":["));
    for (uint8_t index = 0; index < config.buzzerMelodies[slot].count; index += 1) {
      if (index > 0) {
        gmsControlSerial.write(',');
      }
      gmsControlSerial.print(F("{\"frequency\":"));
      gmsControlSerial.print(config.buzzerMelodies[slot].notes[index].frequency);
      gmsControlSerial.print(F(",\"duration\":"));
      gmsControlSerial.print(config.buzzerMelodies[slot].notes[index].durationMs);
      gmsControlSerial.write('}');
    }
    gmsControlSerial.print(F("]}"));
  }
  gmsControlSerial.print(F("}},\"lighting\":{\"scenes\":{"));
  for (uint8_t scene = 0; scene < LED_SCENE_COUNT; scene += 1) {
    if (scene > 0) {
      gmsControlSerial.write(',');
    }
    gmsControlSerial.print(F("\""));
    gmsControlSerial.print(ledSceneNameFromId(scene));
    gmsControlSerial.print(F("\":\""));
    gmsControlSerial.print(fingerprintLedColorNameFromId(config.ledSceneColor[scene]));
    gmsControlSerial.print(F("\""));
  }
  gmsControlSerial.println(F("}}}}"));
}

bool waitForFingerImage(uint32_t timeoutMs) {
  uint32_t startedAt = millis();
  while (remainingMs(startedAt, timeoutMs) > 0) {
#if defined(GMS_BOARD_ESP32)
    if (fingerprintOperationCancelled()) {
      return false;
    }
#endif
    pumpDeviceAnimation();
    const uint8_t imageResult = finger.getImage();
#if defined(GMS_BOARD_ESP32)
    // Sensor UART can block briefly — re-check cancel immediately after.
    if (fingerprintCancelRequested || fingerprintOperationCancelled()) {
      return false;
    }
#endif
    if (imageResult == FINGERPRINT_OK) {
      return true;
    }
    delayWithAnimation(12);
  }
  return false;
}

bool waitForFingerRemoval(uint32_t timeoutMs) {
  uint32_t startedAt = millis();
  uint8_t clearCount = 0;
  while (remainingMs(startedAt, timeoutMs) > 0) {
#if defined(GMS_BOARD_ESP32)
    if (fingerprintOperationCancelled()) {
      return false;
    }
#endif
    pumpDeviceAnimation();
    if (finger.getImage() == FINGERPRINT_NOFINGER) {
      clearCount += 1;
      if (clearCount >= 4) {
        return true;
      }
    } else {
      clearCount = 0;
    }
    delayWithAnimation(25);
  }
  return false;
}

void promptFingerprintRetry(
  const __FlashStringHelper *message,
  const __FlashStringHelper *scanLabel,
  const __FlashStringHelper *displayLabel
) {
  sendFingerprintRetry(message);
  playBuzzerPreset(BUZZER_WARNING);
  showStatusDisplay(F("TRY AGAIN"), EYE_ERROR);
  waitForFingerRemoval(8000);
  delayWithAnimation(250);
  sendFingerprintStage(scanLabel);
  showStatusDisplay(displayLabel, EYE_SCANNING);
}

bool waitForLift(uint32_t timeoutMs) {
  uint32_t startedAt = millis();
  sendFingerprintStage(GMS_FTEXT("Remove the finger", "Remove finger"));
  showStatusDisplay(F("REMOVE FINGER"), EYE_SCANNING);
  while (remainingMs(startedAt, timeoutMs) > 0) {
    uint32_t slice = remainingMs(startedAt, timeoutMs);
    if (slice > 8000) slice = 8000;
    if (waitForFingerRemoval(slice)) {
      delayWithAnimation(250);
      return true;
    }
    sendFingerprintStage(F("Lift your finger to continue"));
    showStatusDisplay(F("REMOVE FINGER"), EYE_SCANNING);
  }
  return false;
}

bool captureFingerprintTemplate(
  uint8_t bufferId,
  uint32_t timeoutMs,
  const __FlashStringHelper *scanLabel,
  const __FlashStringHelper *displayLabel
) {
  uint32_t startedAt = millis();
  sendFingerprintStage(scanLabel);
  showStatusDisplay(displayLabel, EYE_SCANNING);
  while (remainingMs(startedAt, timeoutMs) > 0) {
    uint32_t slice = remainingMs(startedAt, timeoutMs);
    if (slice > 20000) slice = 20000;
    if (!waitForFingerImage(slice)) {
      continue;
    }
    if (runFingerImage2Tz(bufferId) == FINGERPRINT_OK) {
      // Do not flash success here. Enroll must check for an already-registered
      // print first, otherwise existing fingers briefly show green before red.
      return true;
    }
    promptFingerprintRetry(
      GMS_FTEXT("Scan unclear. Stay on this same step and try again.", "Unclear; retry step"),
      scanLabel,
      displayLabel
    );
  }
  return false;
}

bool mergeStoredFingerprintSample(
  uint8_t slot,
  const __FlashStringHelper *scanLabel,
  const __FlashStringHelper *displayLabel
) {
  uint32_t startedAt = millis();
  sendFingerprintStage(scanLabel);
  showStatusDisplay(displayLabel, EYE_SCANNING);
  while (remainingMs(startedAt, FINGERPRINT_STEP_TIMEOUT_MS) > 0) {
    uint32_t slice = remainingMs(startedAt, FINGERPRINT_STEP_TIMEOUT_MS);
    if (slice > 20000) slice = 20000;
    if (!waitForFingerImage(slice)) {
      continue;
    }
    if (runFingerImage2Tz(2) != FINGERPRINT_OK) {
      promptFingerprintRetry(
        GMS_FTEXT("Scan unclear. Stay on this same angle and try again.", "Unclear; retry angle"),
        scanLabel,
        displayLabel
      );
      continue;
    }
    if (runFingerLoadModel(slot) != FINGERPRINT_OK) {
      return false;
    }
    if (runFingerCreateModel() != FINGERPRINT_OK) {
      promptFingerprintRetry(
        GMS_FTEXT("This angle did not match. Retry this same angle, not from the start.", "Retry this angle"),
        scanLabel,
        displayLabel
      );
      continue;
    }
    if (runFingerStoreModel(slot) != FINGERPRINT_OK) {
      promptFingerprintRetry(
        GMS_FTEXT("Could not save that angle. Retry this same step.", "Save retry"),
        scanLabel,
        displayLabel
      );
      continue;
    }
    return true;
  }
  return false;
}

void discardUnconfirmedFingerprint(uint8_t slot) {
  if (slot >= 1) {
    finger.deleteModel(slot);
  }
}

void failFingerprintEnroll(
  uint8_t slot,
  bool stored,
  const __FlashStringHelper *message,
  const __FlashStringHelper *displayLabel
) {
  if (stored) {
    discardUnconfirmedFingerprint(slot);
  }
  sendError(message);
  showStatusDisplay(displayLabel, EYE_ERROR);
  waitForTemporaryFeedback();
#if defined(GMS_BOARD_ESP32)
  setEnrollLedMode(false);
#endif
  restoreConfiguredOutputs();
}

#if defined(GMS_BOARD_ESP32)
#define GMS_FINGERPRINT_READINDEX 0x1F

bool isBuiltInAdminSlot(uint16_t slot) {
  return slot == BUILT_IN_ADMIN_SLOT_1 || slot == BUILT_IN_ADMIN_SLOT_2;
}

bool readFingerprintIndexPage(uint8_t page, uint8_t *bitmap32) {
  uint8_t commandData[] = { GMS_FINGERPRINT_READINDEX, page };
  Adafruit_Fingerprint_Packet command(
    FINGERPRINT_COMMANDPACKET,
    sizeof(commandData),
    commandData
  );
  finger.writeStructuredPacket(command);
  uint8_t responseData[64] = {0};
  Adafruit_Fingerprint_Packet response(
    FINGERPRINT_ACKPACKET,
    sizeof(responseData),
    responseData
  );
  if (finger.getStructuredPacket(&response, 1500) != FINGERPRINT_OK) {
    return false;
  }
  if (response.type != FINGERPRINT_ACKPACKET || response.data[0] != FINGERPRINT_OK) {
    return false;
  }
  memcpy(bitmap32, &response.data[1], 32);
  return true;
}

bool fingerprintIndexSlotOccupied(const uint8_t *bitmap32, uint16_t slot) {
  const uint16_t index = slot % 256;
  return (bitmap32[index / 8] & (1 << (index % 8))) != 0;
}

void sendBuiltInAdminStatus() {
  const bool slot1Saved = fingerprintReady && finger.loadModel(BUILT_IN_ADMIN_SLOT_1) == FINGERPRINT_OK;
  const bool slot2Saved = fingerprintReady && finger.loadModel(BUILT_IN_ADMIN_SLOT_2) == FINGERPRINT_OK;
  gmsControlSerial.print(F("{\"event\":\"fingerprint-admin-status\",\"ok\":true,\"slots\":{\"1\":"));
  gmsControlSerial.print(slot1Saved ? F("true") : F("false"));
  gmsControlSerial.print(F(",\"2\":"));
  gmsControlSerial.print(slot2Saved ? F("true") : F("false"));
  gmsControlSerial.println(F("},\"message\":\"Built-in admin slot status loaded\"}"));
}

void sendFingerprintSlots() {
  if (!fingerprintReady) {
    sendError(F("Fingerprint sensor is not detected"));
    return;
  }
  const uint16_t slotLimit = finger.capacity > 0 ? finger.capacity : (uint16_t)127;
  const bool countKnown = refreshFingerprintTemplateCount();
  const uint16_t expected = countKnown ? finger.templateCount : slotLimit;
  gmsControlSerial.print(F("{\"event\":\"fingerprint-slots\",\"ok\":true,\"slots\":["));
  bool first = true;
  uint16_t found = 0;
  for (uint16_t slot = 1; slot <= slotLimit && slot <= 255; slot += 1) {
    if (countKnown && found >= expected) {
      break;
    }
    if (runFingerLoadModel(slot) != FINGERPRINT_OK) {
      continue;
    }
    if (!first) {
      gmsControlSerial.write(',');
    }
    gmsControlSerial.print(slot);
    first = false;
    found += 1;
  }
  gmsControlSerial.print(F("],\"templateCount\":"));
  gmsControlSerial.print(countKnown ? finger.templateCount : found);
  gmsControlSerial.println(F("}"));
}

bool consumeBuiltInAdminAuthorization() {
  const bool authorized = adminAuthorizationExpiresAt != 0
    && (int32_t)(adminAuthorizationExpiresAt - millis()) > 0;
  adminAuthorizationExpiresAt = 0;
  return authorized;
}
#endif

void verifyFingerprint(bool builtInAdminOnly = false) {
  if (!fingerprintReady) {
    sendError(F("Fingerprint sensor is not detected"));
    return;
  }

  const bool templateCountKnown = refreshFingerprintTemplateCount();
  if (templateCountKnown && finger.templateCount == 0) {
    gmsControlSerial.println(GMS_FTEXT(
      "{\"event\":\"fingerprint-database-empty\",\"ok\":false,\"templateCount\":0,\"message\":\"No fingerprint is stored. Enroll first.\"}",
      "{\"event\":\"fingerprint-database-empty\",\"ok\":false,\"message\":\"No saved print\"}"
    ));
    playBuzzerPreset(BUZZER_ERROR);
    showStatusDisplay(F("NO SAVED PRINT"), EYE_ERROR);
    waitForTemporaryFeedback();
    restoreConfiguredOutputs();
    return;
  }

  const __FlashStringHelper *scanLabel = F("Place a finger on the scanner");
  const __FlashStringHelper *displayLabel = F("PLACE FINGER");
  uint32_t startedAt = millis();
#if defined(GMS_BOARD_ESP32)
  beginFingerprintOperation();
  // Blue enroll lighting while waiting for a finger; restore yellow settings afterward.
  setEnrollLedMode(true);
#endif
  sendFingerprintStage(scanLabel);
  showStatusDisplay(displayLabel, EYE_SCANNING);

  while (remainingMs(startedAt, FINGERPRINT_VERIFY_TIMEOUT_MS) > 0) {
#if defined(GMS_BOARD_ESP32)
    if (fingerprintOperationCancelled()) {
      fingerprintCancelRequested = false;
      setEnrollLedMode(false);
      endFingerprintOperation();
      return;
    }
#endif
    uint32_t slice = remainingMs(startedAt, FINGERPRINT_VERIFY_TIMEOUT_MS);
    if (slice > 15000) slice = 15000;
    if (!waitForFingerImage(slice)) {
#if defined(GMS_BOARD_ESP32)
      if (fingerprintCancelRequested) {
        fingerprintCancelRequested = false;
        setEnrollLedMode(false);
        endFingerprintOperation();
        return;
      }
#endif
      continue;
    }
    if (runFingerImage2Tz(1) != FINGERPRINT_OK) {
      promptFingerprintRetry(
        GMS_FTEXT("Fingerprint was unclear. Try again.", "Unclear; try again"),
        scanLabel,
        displayLabel
      );
      continue;
    }

    const uint8_t searchResult = runFingerSearch(1);
    if (searchResult != FINGERPRINT_OK) {
      promptFingerprintRetry(
        GMS_FTEXT("Wrong fingerprint. Try again.", "Wrong print; retry"),
        scanLabel,
        displayLabel
      );
      continue;
    }
#if defined(GMS_BOARD_ESP32)
    if (builtInAdminOnly) {
      // Any already-registered print may authorize settings save
      // (built-in slots 1/2 and later enrolled fingerprints).
      adminAuthorizationExpiresAt = millis() + ADMIN_AUTHORIZATION_WINDOW_MS;
      gmsControlSerial.print(F("{\"event\":\"fingerprint-admin-authorized\",\"ok\":true,\"id\":"));
      gmsControlSerial.print(finger.fingerID);
      gmsControlSerial.print(F(",\"confidence\":"));
      gmsControlSerial.print(finger.confidence);
      gmsControlSerial.print(F(",\"builtIn\":"));
      gmsControlSerial.print(isBuiltInAdminSlot(finger.fingerID) ? F("true") : F("false"));
      gmsControlSerial.println(F(",\"message\":\"Registered fingerprint authorized settings save\"}"));
      playBuzzerPreset(BUZZER_SUCCESS);
      setEnrollLedMode(false);
      endFingerprintOperation();
      showStatusDisplay(F("PRINT VERIFIED"), EYE_SUCCESS);
      waitForTemporaryFeedback();
      restoreConfiguredOutputs();
      return;
    }
#else
    (void)builtInAdminOnly;
#endif
    gmsControlSerial.print(F("{\"event\":\"fingerprint-match\",\"ok\":true,\"id\":"));
    gmsControlSerial.print(finger.fingerID);
    gmsControlSerial.print(F(",\"confidence\":"));
    gmsControlSerial.print(finger.confidence);
    gmsControlSerial.println(F(",\"message\":\"Fingerprint matched\"}"));
    playBuzzerPreset(config.buzzerPreset);
#if defined(GMS_BOARD_ESP32)
    setEnrollLedMode(false);
    endFingerprintOperation();
#endif
    showStatusDisplay(F("ACCESS GRANTED"), EYE_SUCCESS);
    waitForTemporaryFeedback();
    restoreConfiguredOutputs();
    return;
  }

#if defined(GMS_BOARD_ESP32)
  setEnrollLedMode(false);
  endFingerprintOperation();
#endif
  sendError(F("Fingerprint scan timed out"));
  showStatusDisplay(F("SCAN TIMEOUT"), EYE_ERROR);
  waitForTemporaryFeedback();
  restoreConfiguredOutputs();
}

void sendAlreadyRegisteredFingerprint(uint8_t step, uint16_t matchedId) {
  gmsControlSerial.print(F("{\"event\":\"fingerprint-already-registered\",\"ok\":false,\"step\":"));
  gmsControlSerial.print(step);
  gmsControlSerial.print(F(",\"id\":"));
  gmsControlSerial.print(matchedId);
  gmsControlSerial.println(GMS_FTEXT(
    ",\"message\":\"This fingerprint is already registered and cannot be enrolled again\"}",
    ",\"message\":\"Finger already registered\"}"
  ));
  playBuzzerPreset(BUZZER_ERROR);
  showStatusDisplay(F("ALREADY SAVED"), EYE_ERROR);
  waitForTemporaryFeedback();
#if defined(GMS_BOARD_ESP32)
  setEnrollLedMode(false);
#endif
  restoreConfiguredOutputs();
}

void enrollFingerprint(uint8_t slot) {
  if (!fingerprintReady) {
    sendError(F("Fingerprint sensor is not detected"));
    return;
  }
#if defined(GMS_BOARD_ESP32)
  setEnrollLedMode(true);
#endif
  const uint16_t slotLimit = finger.capacity > 0 ? finger.capacity : (uint16_t)127;
  if (slot < 1 || slot > slotLimit) {
    sendError(F("Fingerprint slot is outside this sensor's capacity"));
#if defined(GMS_BOARD_ESP32)
    setEnrollLedMode(false);
#endif
    return;
  }

  if (fingerprintCancelRequested) {
    fingerprintCancelRequested = false;
    return;
  }

  if (!captureFingerprintTemplate(
        1,
        FINGERPRINT_STEP_TIMEOUT_MS,
        F("SCAN 1 OF 2"),
        GMS_FTEXT("SCAN 1 OF 2", "SCAN 1")
      )) {
#if defined(GMS_BOARD_ESP32)
    if (fingerprintCancelRequested) {
      fingerprintCancelRequested = false;
      return;
    }
#endif
    sendError(GMS_FTEXT("First scan timed out. Stay on this step and try enroll again.", "Scan 1 timed out"));
    showStatusDisplay(F("SCAN TIMEOUT"), EYE_ERROR);
    waitForTemporaryFeedback();
#if defined(GMS_BOARD_ESP32)
    setEnrollLedMode(false);
#endif
    restoreConfiguredOutputs();
    return;
  }

  // Reject fingers that are already stored, including built-in slots 1 and 2.
  // Check BEFORE any success feedback so existing prints go straight to red error.
  if (runFingerSearch(1) == FINGERPRINT_OK) {
    sendAlreadyRegisteredFingerprint(1, finger.fingerID);
    return;
  }
  signalEnrollScanStepSuccess();

  if (!waitForLift(FINGERPRINT_STEP_TIMEOUT_MS)) {
#if defined(GMS_BOARD_ESP32)
    if (fingerprintCancelRequested) {
      fingerprintCancelRequested = false;
      return;
    }
#endif
    sendError(GMS_FTEXT("Lift your finger to continue the same enroll step.", "Lift finger"));
    showStatusDisplay(F("REMOVE FINGER"), EYE_ERROR);
    waitForTemporaryFeedback();
#if defined(GMS_BOARD_ESP32)
    setEnrollLedMode(false);
#endif
    restoreConfiguredOutputs();
    return;
  }

  const __FlashStringHelper *secondScanLabel = F("SCAN 2 OF 2");
  const __FlashStringHelper *secondDisplayLabel = GMS_FTEXT("SCAN 2 OF 2", "SCAN 2");
  uint32_t secondStartedAt = millis();
  bool pairReady = false;
  sendFingerprintStage(secondScanLabel);
  showStatusDisplay(secondDisplayLabel, EYE_SCANNING);
  while (remainingMs(secondStartedAt, FINGERPRINT_STEP_TIMEOUT_MS) > 0) {
#if defined(GMS_BOARD_ESP32)
    if (fingerprintOperationCancelled()) {
      fingerprintCancelRequested = false;
      return;
    }
#endif
    uint32_t slice = remainingMs(secondStartedAt, FINGERPRINT_STEP_TIMEOUT_MS);
    if (slice > 20000) slice = 20000;
    if (!waitForFingerImage(slice)) {
#if defined(GMS_BOARD_ESP32)
      if (fingerprintCancelRequested) {
        fingerprintCancelRequested = false;
        return;
      }
#endif
      continue;
    }
    if (runFingerImage2Tz(2) != FINGERPRINT_OK) {
      promptFingerprintRetry(
        GMS_FTEXT("Second scan was unclear. Retry scan 2, not from the start.", "Retry scan 2"),
        secondScanLabel,
        secondDisplayLabel
      );
      continue;
    }
    // If scan 2 is a different finger that is already enrolled, restart enroll from step 1.
    if (runFingerSearch(2) == FINGERPRINT_OK) {
      sendAlreadyRegisteredFingerprint(2, finger.fingerID);
      return;
    }
    if (runFingerCreateModel() != FINGERPRINT_OK) {
      promptFingerprintRetry(
        GMS_FTEXT("Second scan did not match. Retry scan 2 with the same finger.", "Retry scan 2"),
        secondScanLabel,
        secondDisplayLabel
      );
      continue;
    }
    pairReady = true;
    signalEnrollScanStepSuccess();
    break;
  }
  if (!pairReady) {
#if defined(GMS_BOARD_ESP32)
    if (fingerprintCancelRequested) {
      fingerprintCancelRequested = false;
      return;
    }
#endif
    sendError(GMS_FTEXT("Second scan timed out. First scan was not registered.", "Scan 2 timed out"));
    showStatusDisplay(F("SCAN TIMEOUT"), EYE_ERROR);
    waitForTemporaryFeedback();
#if defined(GMS_BOARD_ESP32)
    setEnrollLedMode(false);
#endif
    restoreConfiguredOutputs();
    return;
  }
  if (runFingerStoreModel(slot) != FINGERPRINT_OK) {
    failFingerprintEnroll(
      slot,
      false,
      GMS_FTEXT("Unable to save the fingerprint template", "Save failed"),
      F("SAVE FAILED")
    );
    return;
  }
  const bool stored = true;

  if (!waitForLift(FINGERPRINT_STEP_TIMEOUT_MS)) {
    failFingerprintEnroll(
      slot,
      stored,
      GMS_FTEXT("Lift your finger before the final confirm scan.", "Lift finger"),
      F("REMOVE FINGER")
    );
    return;
  }

  uint32_t confirmStartedAt = millis();
  bool confirmed = false;
  sendFingerprintStage(F("SCAN CONFIRM MATCH"));
  showStatusDisplay(F("CONFIRM PRINT"), EYE_SCANNING);
  while (remainingMs(confirmStartedAt, FINGERPRINT_STEP_TIMEOUT_MS) > 0) {
    uint32_t slice = remainingMs(confirmStartedAt, FINGERPRINT_STEP_TIMEOUT_MS);
    if (slice > 20000) slice = 20000;
    if (!waitForFingerImage(slice)) {
      continue;
    }
    if (runFingerImage2Tz(1) != FINGERPRINT_OK) {
      promptFingerprintRetry(
        GMS_FTEXT("Confirm scan was unclear. Place the same finger again.", "Confirm unclear"),
        F("SCAN CONFIRM MATCH"),
        F("CONFIRM PRINT")
      );
      continue;
    }
    if (runFingerSearch(1) == FINGERPRINT_OK && finger.fingerID == slot) {
      confirmed = true;
      break;
    }
    promptFingerprintRetry(
      GMS_FTEXT("Confirm did not match. Place the same finger again.", "Confirm mismatch"),
      F("SCAN CONFIRM MATCH"),
      F("CONFIRM PRINT")
    );
  }
  if (!confirmed) {
    failFingerprintEnroll(
      slot,
      stored,
      GMS_FTEXT("Could not confirm the fingerprint. Nothing was registered; enroll again.", "Confirm retry"),
      F("TRY AGAIN")
    );
    return;
  }

  const bool templatesKnown = refreshFingerprintTemplateCount();
  gmsControlSerial.print(F("{\"event\":\"fingerprint-enrolled\",\"ok\":true,\"id\":"));
  gmsControlSerial.print(slot);
  gmsControlSerial.print(F(",\"validated\":true,\"templateCount\":"));
  gmsControlSerial.print(templatesKnown ? finger.templateCount : 0);
  gmsControlSerial.println(GMS_FTEXT(
    ",\"message\":\"Two-scan fingerprint enrolled successfully\"}",
    ",\"message\":\"2-scan enrolled\"}"
  ));
  playBuzzerPreset(BUZZER_SUCCESS);
  showStatusDisplay(F("ENROLL SAVED"), EYE_SUCCESS);
  waitForTemporaryFeedback();
#if defined(GMS_BOARD_ESP32)
  setEnrollLedMode(false);
#endif
  restoreConfiguredOutputs();
}

#if defined(GMS_BOARD_ESP32)
void enrollFingerprintAutomatically() {
  if (!fingerprintReady) {
    sendError(F("Fingerprint sensor is not detected"));
    return;
  }
  beginFingerprintOperation();
  setEnrollLedMode(true);
  const uint16_t slotLimit = finger.capacity > 0 ? finger.capacity : (uint16_t)127;
  uint8_t indexBitmap[32];
  const bool haveIndex = readFingerprintIndexPage(0, indexBitmap);
  if (fingerprintOperationCancelled()) {
    fingerprintCancelRequested = false;
    setEnrollLedMode(false);
    endFingerprintOperation();
    return;
  }
  for (uint16_t slot = USER_FINGERPRINT_FIRST_SLOT; slot <= slotLimit && slot <= 255; slot += 1) {
    if (fingerprintOperationCancelled()) {
      fingerprintCancelRequested = false;
      setEnrollLedMode(false);
      endFingerprintOperation();
      return;
    }
    bool occupied = false;
    if (haveIndex) {
      occupied = fingerprintIndexSlotOccupied(indexBitmap, slot);
    } else {
      const uint8_t loadResult = finger.loadModel(slot);
      if (fingerprintOperationCancelled()) {
        fingerprintCancelRequested = false;
        setEnrollLedMode(false);
        endFingerprintOperation();
        return;
      }
      if (loadResult == FINGERPRINT_PACKETRECIEVEERR) {
        delay(20);
        if (fingerprintOperationCancelled()) {
          fingerprintCancelRequested = false;
          setEnrollLedMode(false);
          endFingerprintOperation();
          return;
        }
        occupied = finger.loadModel(slot) == FINGERPRINT_OK;
      } else {
        occupied = loadResult == FINGERPRINT_OK;
      }
    }
    if (occupied) {
      continue;
    }
    enrollFingerprint((uint8_t)slot);
    fingerprintCancelRequested = false;
    setEnrollLedMode(false);
    endFingerprintOperation();
    return;
  }
  sendError(F("The fingerprint sensor database is full"));
  setEnrollLedMode(false);
  endFingerprintOperation();
}
#endif

void deleteFingerprint(uint8_t slot) {
  if (!fingerprintReady) {
    sendError(F("Fingerprint sensor is not detected"));
    return;
  }
  const uint16_t slotLimit = finger.capacity > 0 ? finger.capacity : (uint16_t)127;
  if (slot < 1 || slot > slotLimit) {
    sendError(F("Fingerprint slot is outside this sensor's capacity"));
    return;
  }
  if (finger.deleteModel(slot) != FINGERPRINT_OK) {
    sendError(F("Unable to delete the fingerprint slot"));
    return;
  }
  gmsControlSerial.print(F("{\"event\":\"fingerprint-deleted\",\"ok\":true,\"id\":"));
  gmsControlSerial.print(slot);
  gmsControlSerial.println(F(",\"message\":\"Fingerprint slot deleted\"}"));
}

void handleFingerprintLedCommand(char *savePointer) {
  char *mode = strtok_r(NULL, "|", &savePointer);
  char *color = strtok_r(NULL, "|", &savePointer);
  char *speed = strtok_r(NULL, "|", &savePointer);
  char *cycles = strtok_r(NULL, "|", &savePointer);
  if (!mode || !color || !speed || !cycles) {
    sendError(F("Fingerprint LED command is incomplete"));
    return;
  }
  if (!fingerprintReady) {
    sendError(F("Fingerprint sensor is not detected"));
    return;
  }
  const uint8_t ledMode = fingerprintLedModeFromName(mode);
  const uint8_t ledColor = fingerprintLedColorFromName(color);
  const uint8_t ledSpeed = constrain(atoi(speed), 1, 255);
  const uint8_t ledCycles = constrain(atoi(cycles), 0, 255);
#if defined(GMS_BOARD_ESP32)
  // Host override for lighting preview + firmware compile/upload LED shows.
  // Without this, updateOperationalLed() immediately restores yellow settings.
  markHostActivity();
  fingerprintLedHostOverride = true;
  lastAppliedLedScene = 255;
  if (finger.LEDcontrol(ledMode, ledSpeed, ledColor, ledCycles) != FINGERPRINT_OK) {
    fingerprintLedHostOverride = false;
    sendError(F("Fingerprint sensor does not support Aura LED control"));
    return;
  }
  sendOk(F("finger-led-updated"), F("Fingerprint sensor lighting applied"));
#else
  config.fingerprintLedMode = ledMode;
  config.fingerprintLedColor = ledColor;
  config.fingerprintLedSpeed = ledSpeed;
  config.fingerprintLedCycles = ledCycles;
  if (!applyFingerprintLed()) {
    sendError(F("Fingerprint sensor does not support Aura LED control"));
    return;
  }
  sendOk(F("finger-led-updated"), F("Fingerprint sensor lighting applied"));
#endif
}

#if defined(GMS_BOARD_ESP32)
void testFingerprintLedStyle(uint8_t styleIndex, const char *colorName) {
  if (!fingerprintReady) {
    sendError(F("Fingerprint sensor is not detected"));
    return;
  }
  if (styleIndex < FINGERPRINT_LED_BREATHING || styleIndex > FINGERPRINT_LED_GRADUAL_OFF) {
    sendError(F("Sensor LED style index must be from 1 to 6"));
    return;
  }
  const uint8_t colorIndex = fingerprintLedColorFromName(colorName);
  showStatusDisplay(F("LED STYLE TEST"), EYE_SETTINGS);
  if (styleIndex == FINGERPRINT_LED_GRADUAL_ON) {
    finger.LEDcontrol(FINGERPRINT_LED_OFF, 25, colorIndex, 0);
    delay(180);
  } else if (styleIndex == FINGERPRINT_LED_GRADUAL_OFF) {
    finger.LEDcontrol(FINGERPRINT_LED_ON, 25, colorIndex, 0);
    delay(260);
  }
  const uint8_t speed = styleIndex == FINGERPRINT_LED_BREATHING
    ? 80
    : styleIndex == FINGERPRINT_LED_FLASHING ? 25 : 120;
  const uint8_t cycles = styleIndex == FINGERPRINT_LED_FLASHING ? 10 : 0;
  if (finger.LEDcontrol(styleIndex, speed, colorIndex, cycles) != FINGERPRINT_OK) {
    restoreConfiguredOutputs();
    sendError(F("Fingerprint sensor LED style test failed"));
    return;
  }
  delay(styleIndex == FINGERPRINT_LED_OFF ? 1200 : 2200);
  restoreConfiguredOutputs();
  gmsControlSerial.print(F("{\"event\":\"finger-led-style-complete\",\"ok\":true,\"styleIndex\":"));
  gmsControlSerial.print(styleIndex);
  gmsControlSerial.print(F(",\"colorIndex\":"));
  gmsControlSerial.print(colorIndex);
  gmsControlSerial.println(F(",\"message\":\"Sensor LED style-index test completed\"}"));
}

void probeFingerprintLedColors() {
  if (!fingerprintReady) {
    sendError(F("Fingerprint sensor is not detected"));
    return;
  }
  uint8_t acknowledgedMask = 0;
  for (uint8_t colorIndex = 1; colorIndex <= 7; colorIndex += 1) {
    showStatusDisplay(F("LED PROBE"), EYE_SETTINGS);
    const bool acknowledged = finger.LEDcontrol(
      FINGERPRINT_LED_ON,
      35,
      colorIndex,
      0
    ) == FINGERPRINT_OK;
    if (acknowledged) acknowledgedMask |= (uint8_t)(1U << (colorIndex - 1));
    gmsControlSerial.print(F("{\"event\":\"finger-led-probe-stage\",\"ok\":true,\"index\":"));
    gmsControlSerial.print(colorIndex);
    gmsControlSerial.print(F(",\"acknowledged\":"));
    gmsControlSerial.print(acknowledged ? F("true") : F("false"));
    gmsControlSerial.print(F(",\"message\":\"Color index "));
    gmsControlSerial.print(colorIndex);
    gmsControlSerial.println(acknowledged
      ? F(" is active; observe the sensor now.\"}")
      : F(" was rejected by the sensor.\"}"));
    delay(acknowledged ? 1400 : 350);
    finger.LEDcontrol(FINGERPRINT_LED_OFF, 35, colorIndex, 0);
    delay(220);
  }
  restoreConfiguredOutputs();
  gmsControlSerial.print(F("{\"event\":\"finger-led-probe-complete\",\"ok\":true,\"acknowledged\":["));
  bool needsComma = false;
  for (uint8_t colorIndex = 1; colorIndex <= 7; colorIndex += 1) {
    if ((acknowledgedMask & (uint8_t)(1U << (colorIndex - 1))) == 0) continue;
    if (needsComma) gmsControlSerial.write(',');
    gmsControlSerial.print(colorIndex);
    needsComma = true;
  }
  gmsControlSerial.println(F("],\"message\":\"Color probe finished and saved lighting was restored.\"}"));
}
#endif

void handleOledCommand(char *savePointer) {
  char *fontName = strtok_r(NULL, "|", &savePointer);
  char *contrast = strtok_r(NULL, "|", &savePointer);
  char *text = strtok_r(NULL, "|", &savePointer);
  if (!fontName || !contrast || !text) {
    sendError(F("OLED command is incomplete"));
    return;
  }
  config.oledFont = fontIdFromName(fontName);
  config.oledContrast = ROBO_OLED_CONTRAST;
  config.displayMode = DISPLAY_MODE_TEXT;
  strncpy(config.oledText, text, MAX_OLED_TEXT);
  config.oledText[MAX_OLED_TEXT] = '\0';
  drawOledText(config.oledText);
  sendOk(F("oled-updated"), F("OLED preview applied"));
}

void handleDisplayCommand(char *savePointer) {
  char *displayMode = strtok_r(NULL, "|", &savePointer);
  char *textFont = strtok_r(NULL, "|", &savePointer);
  char *maybeDatetimeOrContrast = strtok_r(NULL, "|", &savePointer);
  if (!displayMode || !textFont || !maybeDatetimeOrContrast) {
    sendError(F("Display command is incomplete"));
    return;
  }
  char *datetimeFont = NULL;
  char *contrast = NULL;
  char *text = NULL;
  const bool legacyFormat =
    strspn(maybeDatetimeOrContrast, "0123456789") == strlen(maybeDatetimeOrContrast)
    && atoi(maybeDatetimeOrContrast) >= 1
    && atoi(maybeDatetimeOrContrast) <= 255;
  if (legacyFormat) {
    contrast = maybeDatetimeOrContrast;
    text = strtok_r(NULL, "|", &savePointer);
  } else {
    datetimeFont = maybeDatetimeOrContrast;
    contrast = strtok_r(NULL, "|", &savePointer);
    text = strtok_r(NULL, "|", &savePointer);
  }
  char *expression = strtok_r(NULL, "|", &savePointer);
  char *blinkInterval = strtok_r(NULL, "|", &savePointer);
  char *animationSpeed = strtok_r(NULL, "|", &savePointer);
  char *eyeSize = strtok_r(NULL, "|", &savePointer);
  char *eyeSpacing = strtok_r(NULL, "|", &savePointer);
  if (
    !contrast || !text || !expression
    || !blinkInterval || !animationSpeed || !eyeSize || !eyeSpacing
  ) {
    sendError(F("Display command is incomplete"));
    return;
  }
  config.displayMode = displayModeFromName(displayMode);
  config.oledFont = fontIdFromName(textFont);
  if (datetimeFont) {
    config.oledDatetimeFont = datetimeFontIdFromName(datetimeFont);
  }
  config.oledContrast = ROBO_OLED_CONTRAST;
  strncpy(config.oledText, text, MAX_OLED_TEXT);
  config.oledText[MAX_OLED_TEXT] = '\0';
  config.eyeExpression = EYE_SCANNING;
  (void)expression;
  (void)blinkInterval;
  (void)animationSpeed;
  (void)contrast;
  (void)eyeSpacing;
  config.eyeBlinkInterval = ROBO_EYE_BLINK_INTERVAL_MS;
  config.eyeAnimationSpeed = ROBO_EYE_ANIMATION_SPEED;
  config.eyeSize = constrain(atoi(eyeSize), 1, 3);
  config.eyeSpacing = ROBO_EYE_SPACING;
  drawConfiguredDisplay();
  sendOk(F("display-updated"), F("OLED display preview applied"));
}

void handleFaceCommand(char *savePointer) {
  char *expression = strtok_r(NULL, "|", &savePointer);
  if (!expression) {
    sendError(F("Face command is incomplete"));
    return;
  }
  if (GMS_STREQ(expression, "restore") || GMS_STREQ(expression, "idle")) {
    restoreConfiguredOutputs();
    sendOk(F("face-updated"), F("Configured face restored"));
    return;
  }
  showStatusDisplay(F("STATUS"), eyeExpressionFromName(expression));
  sendOk(F("face-updated"), F("Status face applied"));
}

void handleTimeCommand(char *savePointer) {
  char *epochText = strtok_r(NULL, "|", &savePointer);
  char *offsetText = strtok_r(NULL, "|", &savePointer);
  char *formatText = strtok_r(NULL, "|", &savePointer);
  char *autoText = strtok_r(NULL, "|", &savePointer);
  if (!epochText) {
    sendError(F("Time command is incomplete"));
    return;
  }
  const uint32_t epoch = (uint32_t)strtoul(epochText, NULL, 10);
  if (epoch < 1700000000UL) {
    sendError(F("Time epoch is invalid"));
    return;
  }
  syncedEpoch = epoch;
  syncedAtMillis = millis();
  if (offsetText) {
    syncedTimezoneOffsetMinutes = constrain(atoi(offsetText), -720, 840);
  }
  if (formatText) {
    config.oledTimeFormat = (
      GMS_STREQ(formatText, "24h")
      || GMS_STREQ(formatText, "24")
      || GMS_STREQ(formatText, "24-hour")
    ) ? OLED_TIME_24H : OLED_TIME_LOCAL;
  }
  if (autoText) {
    config.oledTimezoneAuto = (
      GMS_STREQ(autoText, "auto")
      || GMS_STREQ(autoText, "1")
      || GMS_STREQ(autoText, "true")
    ) ? 1 : 0;
    if (!config.oledTimezoneAuto) {
      config.oledTimezoneOffsetMinutes = syncedTimezoneOffsetMinutes;
    }
  }
  if (config.displayMode == DISPLAY_MODE_DATETIME && !statusDisplayActive) {
    drawDatetimeDisplay();
  }
#if defined(GMS_BOARD_ESP32)
  refreshOperationalLed();
#endif
  sendOk(F("time-updated"), F("Device clock synchronized"));
}

void handleMelodyCommand(char *savePointer) {
  char *presetOrCount = strtok_r(NULL, "|", &savePointer);
  char *requestedCount = strtok_r(NULL, "|", &savePointer);
  char *encodedNotes = strtok_r(NULL, "|", &savePointer);
  if (!presetOrCount) {
    sendError(F("Melody command is incomplete"));
    return;
  }
  const char *presetName = presetOrCount;
  if (!encodedNotes && requestedCount) {
    encodedNotes = requestedCount;
    requestedCount = presetOrCount;
    presetName = "success";
  }
  if (!requestedCount || !encodedNotes) {
    sendError(F("Melody command is incomplete"));
    return;
  }
  const uint8_t slot = buzzerSlotFromName(presetName);
  uint8_t count = constrain(atoi(requestedCount), 0, MAX_PRESET_MELODY_NOTES);
  uint8_t parsedCount = 0;
  char *noteSavePointer = NULL;
  char *note = strtok_r(encodedNotes, ";", &noteSavePointer);
  while (note && parsedCount < count) {
    char *separator = strchr(note, ',');
    if (separator) {
      *separator = '\0';
      config.buzzerMelodies[slot].notes[parsedCount].frequency = constrain(atoi(note), 0, 8000);
      config.buzzerMelodies[slot].notes[parsedCount].durationMs = constrain(atoi(separator + 1), 20, 3000);
      parsedCount += 1;
    }
    note = strtok_r(NULL, ";", &noteSavePointer);
  }
  config.buzzerMelodies[slot].count = parsedCount;
  config.buzzerMelodyMode[slot] = parsedCount > 0 ? BUZZER_MELODY_CUSTOM : BUZZER_MELODY_BUILTIN;
  sendOk(F("melody-updated"), F("Custom buzzer melody loaded"));
}

void handleLedCommand(char *savePointer) {
  char *mode = strtok_r(NULL, "|", &savePointer);
  if (!mode) {
    sendError(F("LED command is incomplete"));
    return;
  }
#if defined(GMS_BOARD_ESP32)
  markHostActivity();
  if (GMS_STREQ(mode, "settings")) {
    fingerprintLedHostOverride = false;
    setEnrollLedMode(false);
    setSettingsLedMode(true);
    sendOk(F("led-updated"), F("Settings lighting applied"));
    return;
  }
  if (GMS_STREQ(mode, "normal") || GMS_STREQ(mode, "restore")) {
    fingerprintLedHostOverride = false;
    setEnrollLedMode(false);
    setSettingsLedMode(false);
    sendOk(F("led-updated"), F("Normal lighting restored"));
    return;
  }
  if (GMS_STREQ(mode, "sleep") || GMS_STREQ(mode, "disconnect")) {
    hostConnected = false;
    settingsPanelActive = false;
    ledTemporaryScene = 255;
    ledTemporaryUntilMs = 0;
    refreshOperationalLed();
    sendOk(F("led-updated"), F("Sleep lighting applied"));
    return;
  }
  if (GMS_STREQ(mode, "wake") || GMS_STREQ(mode, "connect")) {
    markHostActivity();
    refreshOperationalLed();
    sendOk(F("led-updated"), F("Host connection lighting applied"));
    return;
  }
  if (GMS_STREQ(mode, "enroll")) {
    fingerprintLedHostOverride = false;
    setEnrollLedMode(true);
    sendOk(F("led-updated"), F("Enroll lighting applied"));
    return;
  }
  if (GMS_STREQ(mode, "enroll-end")) {
    fingerprintLedHostOverride = false;
    setEnrollLedMode(false);
    sendOk(F("led-updated"), F("Enroll lighting cleared"));
    return;
  }
#endif
  sendError(F("Unsupported LED mode"));
}

void handleLedColorCommand(char *savePointer) {
  char *sceneName = strtok_r(NULL, "|", &savePointer);
  char *colorName = strtok_r(NULL, "|", &savePointer);
  if (!sceneName || !colorName) {
    sendError(F("LED color command is incomplete"));
    return;
  }
  const uint8_t scene = ledSceneFromName(sceneName);
  if (scene >= LED_SCENE_COUNT) {
    sendError(F("Unknown lighting scene"));
    return;
  }
  config.ledSceneColor[scene] = fingerprintLedColorFromName(colorName);
#if defined(GMS_BOARD_ESP32)
  markHostActivity();
  if (resolveLedScene() == scene || lastAppliedLedScene == scene) {
    applyLedScene(scene);
  }
#endif
  sendOk(F("led-color-updated"), F("Lighting scene color updated"));
}

void handleCommand(char *line) {
  char *savePointer = NULL;
  char *command = strtok_r(line, "|", &savePointer);
  if (!command) {
    return;
  }

#if defined(GMS_BOARD_ESP32)
  markHostActivity();
#endif

  if (strcmp(command, "HELLO") == 0 || strcmp(command, "STATUS") == 0) {
    sendHello();
    return;
  }
  if (strcmp(command, "CONFIG_GET") == 0) {
    sendDeviceConfig();
    return;
  }
  if (strcmp(command, "LED") == 0) {
    handleLedCommand(savePointer);
    return;
  }
  if (strcmp(command, "LED_COLOR") == 0) {
    handleLedColorCommand(savePointer);
    return;
  }
  if (strcmp(command, "FINGER_LED") == 0) {
    handleFingerprintLedCommand(savePointer);
    return;
  }
#if defined(GMS_BOARD_ESP32)
  if (GMS_STREQ(command, "FINGER_LED_STYLE_TEST")) {
    char *style = strtok_r(NULL, "|", &savePointer);
    char *color = strtok_r(NULL, "|", &savePointer);
    if (!style || !color) {
      sendError(F("LED style test command is incomplete"));
      return;
    }
    testFingerprintLedStyle(constrain(atoi(style), 0, 255), color);
    return;
  }
  if (GMS_STREQ(command, "FINGER_LED_PROBE")) {
    probeFingerprintLedColors();
    return;
  }
#endif
  if (strcmp(command, "OLED") == 0) {
    handleOledCommand(savePointer);
    return;
  }
  if (strcmp(command, "DISPLAY") == 0) {
    handleDisplayCommand(savePointer);
    return;
  }
  if (strcmp(command, "TIME") == 0) {
    handleTimeCommand(savePointer);
    return;
  }
  if (strcmp(command, "FACE") == 0) {
    handleFaceCommand(savePointer);
    return;
  }
  if (strcmp(command, "MELODY") == 0) {
    handleMelodyCommand(savePointer);
    return;
  }
  if (strcmp(command, "BUZZER_SET") == 0) {
    char *presetName = strtok_r(NULL, "|", &savePointer);
    char *modeName = strtok_r(NULL, "|", &savePointer);
    if (!presetName) {
      sendError(F("Buzzer preset is missing"));
      return;
    }
    if (modeName) {
      const uint8_t slot = buzzerSlotFromName(presetName);
      config.buzzerMelodyMode[slot] = buzzerMelodyModeFromName(modeName);
      if (
        config.buzzerMelodyMode[slot] == BUZZER_MELODY_CUSTOM
        && config.buzzerMelodies[slot].count == 0
      ) {
        sendError(F("Upload a melody before selecting custom buzzer mode"));
        return;
      }
    } else {
      config.buzzerPreset = buzzerPresetFromName(presetName);
    }
    sendOk(F("buzzer-updated"), F("Buzzer preset configured"));
    return;
  }
  if (strcmp(command, "BUZZER") == 0) {
    char *presetName = strtok_r(NULL, "|", &savePointer);
    if (!presetName) {
      sendError(F("Buzzer preset is missing"));
      return;
    }
    playBuzzerPreset(buzzerPresetFromName(presetName));
    sendOk(F("buzzer-played"), F("Buzzer preset played"));
    return;
  }
  if (strcmp(command, "FP_VERIFY") == 0) {
    verifyFingerprint();
    return;
  }
#if defined(GMS_BOARD_ESP32)
  if (GMS_STREQ(command, "FP_ADMIN_STATUS")) {
    sendBuiltInAdminStatus();
    return;
  }
  if (GMS_STREQ(command, "FP_SLOTS")) {
    sendFingerprintSlots();
    return;
  }
  if (GMS_STREQ(command, "FP_ADMIN_VERIFY")) {
    verifyFingerprint(true);
    return;
  }
  if (GMS_STREQ(command, "FP_CANCEL")) {
    applyFingerprintCancelNow();
    return;
  }
  if (GMS_STREQ(command, "FP_ENROLL_AUTO")) {
    enrollFingerprintAutomatically();
    return;
  }
#endif
  if (strcmp(command, "FP_ENROLL") == 0) {
    char *slot = strtok_r(NULL, "|", &savePointer);
#if defined(GMS_BOARD_ESP32)
    beginFingerprintOperation();
#endif
    enrollFingerprint(slot ? atoi(slot) : 0);
#if defined(GMS_BOARD_ESP32)
    endFingerprintOperation();
#endif
    return;
  }
  if (strcmp(command, "FP_DELETE") == 0) {
    char *slot = strtok_r(NULL, "|", &savePointer);
    deleteFingerprint(slot ? atoi(slot) : 0);
    return;
  }
  if (strcmp(command, "CONFIG_SAVE") == 0) {
#if defined(GMS_BOARD_ESP32)
    if (!consumeBuiltInAdminAuthorization()) {
      sendError(F("Built-in administrator fingerprint is required before saving"));
      return;
    }
#endif
    if (saveConfig()) {
      sendOk(F("config-saved"), F("Configuration saved to non-volatile storage"));
    } else {
      sendError(F("Non-volatile storage is unavailable"));
    }
    return;
  }

  sendError(F("Unsupported device command"));
}

void readUsbSerialCommands() {
#if defined(GMS_BOARD_ESP32)
  processQueuedHostCommands();
#endif
  while (gmsControlSerial.available() > 0) {
    char incoming = (char)gmsControlSerial.read();
    if (incoming == '\r') {
      continue;
    }
    if (incoming == '\n') {
      commandBuffer[commandLength] = '\0';
      if (commandLength > 0) {
        handleCommand(commandBuffer);
      }
      commandLength = 0;
      continue;
    }
    if (commandLength < COMMAND_BUFFER_SIZE - 1) {
      commandBuffer[commandLength++] = incoming;
    } else {
      commandLength = 0;
      sendError(F("Serial command exceeded the buffer limit"));
    }
  }
}

void setup() {
  pinMode(BUZZER_PIN, OUTPUT);
  noTone(BUZZER_PIN);

  gmsControlSerial.begin(USB_SERIAL_BAUD);
#if defined(GMS_START_TINYUSB)
  USB.begin();
#endif
  loadConfig();
  beginOledDisplay();
  restoreConfiguredOutputs();

#if defined(GMS_BOARD_ESP32)
  fingerSerial.begin(FINGER_SERIAL_BAUD, SERIAL_8N1, FINGER_RX, FINGER_TX);
#else
  fingerSerial.begin(FINGER_SERIAL_BAUD);
#endif
  delay(1000);
  fingerprintReady = finger.verifyPassword();
  if (fingerprintReady) {
#if defined(GMS_BOARD_ESP32)
    finger.getParameters();
#endif
    refreshFingerprintTemplateCount();
    applyFingerprintLed();
  }

  delay(250);
  gmsControlSerial.println(F("{\"event\":\"ready\",\"ok\":true,\"message\":\"GMS universal biometric controller ready\"}"));
  sendHello();
}

void loop() {
  readUsbSerialCommands();
  updateEyeAnimation();
  updateDatetimeAnimation();
#if defined(GMS_BOARD_ESP32)
  updateOperationalLed();
#endif
}
