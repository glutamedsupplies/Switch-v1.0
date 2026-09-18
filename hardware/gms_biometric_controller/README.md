# GMS Adaptive Biometric Controller

This folder contains one adaptive Arduino sketch for the Super Admin Settings > Biometrics & Device Controller panel. The same `.ino` automatically selects the correct fingerprint UART and persistent-storage implementation for these supported board families:

| Board family | Fingerprint transport | Persistent storage |
| --- | --- | --- |
| ESP32 / ESP32-S3 | Hardware UART 1, mapped to GPIO 16/17 | Preferences (NVS) |
| Classic AVR Uno / Nano | SoftwareSerial on pins 16/17 (A2/A3) | EEPROM |

Other board cores stop with a clear compile-time message. A truly universal binary is not possible because Arduino-compatible boards do not share the same UART routing, storage API, pin count, or USB implementation. This is still one source file: choose a supported board in Arduino IDE and compile it without manually swapping firmware versions.

## Shared wiring

| Module | Module pin | Controller pin |
| --- | --- | --- |
| SH1106 OLED | SDA | 8 |
| SH1106 OLED | SCL | 9 |
| Fingerprint sensor | TX | 16 (`FINGER_RX`) |
| Fingerprint sensor | RX | 17 (`FINGER_TX`) |
| Passive buzzer | Signal | 10 |

Always cross the fingerprint UART: sensor TX goes to controller RX 16, and sensor RX goes to controller TX 17. Connect all module grounds to controller GND. Check the fingerprint sensor voltage before wiring it; ESP32-S3 GPIO is 3.3 V only. Add level shifting when the sensor UART is not 3.3 V safe.

On ESP32, the OLED uses hardware I2C on pins 8/9 at address `0x3C` with FluxGarage RoboEyes (eyes only). Classic AVR builds keep software I2C + U8g2 for the same pins. No external RGB pins are needed: the lighting control targets the fingerprint sensor's built-in Aura LED through the same UART connection.

Aura-compatible fingerprint modules normally support red, blue, and purple plus breathing, flashing, always-on/off, and gradual effects. Older fingerprint modules without the Aura command can still scan fingerprints, but the firmware will return a clear unsupported-lighting response when a lighting test is requested.

On ESP32-S3, the sketch now binds the controller protocol to the native USB COM port even when Arduino IDE's **USB CDC On Boot** option is disabled. After replacing an older firmware build, unplug/replug the board once and select its newly enumerated COM device in Super Admin.

## Required Arduino libraries

Install these from Arduino IDE > Library Manager:

- Adafruit Fingerprint Sensor Library
- Adafruit GFX Library
- Adafruit SH110X
- FluxGarage RoboEyes
- U8g2 by oliver (AVR builds only)

`SoftwareSerial` and `EEPROM` come from the Arduino AVR Boards core and are compiled only for AVR. `HardwareSerial`, `Preferences`, and `Wire` come from the ESP32 board core and are compiled only for ESP32.

## ESP32-S3 setup

1. Install or update **esp32 by Espressif Systems** in Boards Manager.
2. Select **Tools > Board > esp32 > ESP32S3 Dev Module**.
3. If the board uses the ESP32-S3 native USB connector, set **USB CDC On Boot > Enabled**.
4. Open `gms_biometric_controller.ino`, select the detected port, and upload.

The fingerprint sensor uses hardware UART 1 at 57600 baud with RX 16 and TX 17. The Super Admin USB connection uses 115200 baud.

## Classic Uno/Nano setup

1. Install or update **Arduino AVR Boards** in Boards Manager.
2. Select **Arduino Uno** or the matching classic Nano board.
3. Select the detected port and upload the same `.ino` file.

On AVR, pins 16/17 mean A2/A3 and the sketch automatically uses SoftwareSerial. Do not install a random standalone `SoftwareSerial` library.

## Serial protocol

Commands are newline-terminated UTF-8 text. Device responses are newline-delimited JSON. The `HELLO` response identifies itself as `GMS Universal Biometric Controller` and includes `board: esp32-s3`, `esp32`, or `avr`.

| Command | Purpose |
| --- | --- |
| `HELLO` or `STATUS` | Return controller identity, board family, and capability status |
| `FP_ENROLL|12` | Enroll the center, left, right, and upper side of the same finger into slot 12 |
| `FP_ENROLL_AUTO` | Find the first available slot from 1 to the sensor capacity and enroll there automatically |
| `FP_VERIFY` | Convert the scan to a feature template and search the sensor's internal template database |
| `FP_DELETE|12` | Delete fingerprint slot 12 |
| `FP_ADMIN_STATUS` | Read whether reserved built-in administrator slots 1 and 2 contain templates |
| `FP_ADMIN_VERIFY` | Authorize a settings save only when the scan matches built-in slot 1 or 2 |
| `FINGER_LED|breathing|green|50|0` | Set the fingerprint sensor Aura LED effect, one of seven indexed colors, speed, and repeat count |
| `FINGER_LED_STYLE_TEST|2|green` | Test LED style index 1–6 using the selected indexed color, then restore the configured lighting |
| `FINGER_LED_PROBE` | On ESP32, test raw sensor color indexes 1–7, report acknowledged indexes, and restore the saved lighting |
| `CONFIG_GET` | Read the configuration currently stored in the controller and return it to Super Admin |
| `DISPLAY|eyes|medium|180|GMS BIOMETRICS|happy|4000|5|2|10` | Configure text/Robot Eyes display mode, default expression, blink timing, speed, size, and spacing |
| `OLED|medium|180|GMS BIOMETRICS` | Set compiled font, contrast, and display text |
| `MELODY|3|880,120;0,60;1175,180` | Load up to 16 frequency/duration notes |
| `BUZZER_SET|success` | Select a buzzer preset without playing it |
| `BUZZER|success` | Play `success`, `welcome`, `warning`, `error`, `custom`, or `silent` |
| `CONFIG_SAVE` | Save settings to EEPROM on AVR or Preferences/NVS on ESP32 |

Available OLED font IDs are `small`, `medium`, `bold`, `mono`, and `large` for text mode, plus `clock-xl` / `clock-large` / `clock-medium` / `clock-compact` for date/time mode. On ESP32 these map to compiled Adafruit GFX typefaces (`FreeSans`, `FreeSansBold`, `FreeMono`) — not runtime `.ttf` loading. Super Admin JSON upload selects one of those built-in presets; example files are `oled-font-gms-bold.json` and `oled-font-gms-large.json`. Arbitrary TrueType uploads are not supported.

## Fingerprint storage and verification

The fingerprint module stores a processed feature template in its own flash memory. The controller does not save a raw fingerprint photograph. Raw images are unnecessary for matching and create avoidable biometric privacy and security risk.

Protocol version 4 reads the sensor capacity on ESP32, reports the internal template count, uses the standard database search command, and only reports enrollment success after a third scan matches the exact slot that was written. If confirmation fails, the unconfirmed slot is removed instead of leaving a false-success enrollment behind.

Protocol version 5 adds the ESP32 raw Aura LED color-index probe. An acknowledged index only confirms that the sensor accepted the command; the controller has no optical color sensor, so the displayed color must be observed and associated with its index by the operator.

Protocol version 6 uses four-angle enrollment. The center and left scans create the initial template, then the right and upper-side scans are merged into the same sensor slot. Enrollment only succeeds after the controller searches the completed template and finds that exact slot; a failed or mismatched enrollment is removed.

Protocol version 7 exposes ESP32 sensor LED indexes 1 through 7 as red, blue, purple, green, yellow, cyan, and white. The Super Admin color wheel maps arbitrary RGB selections to the nearest index and applies changes to the connected sensor in real time. These are raw sensor palette indexes, so the exact emitted shade can vary by fingerprint module.

Protocol version 8 uses sensor slots 1 and 2 as the built-in administrator identities for settings authorization without app registration. A successful `FP_ADMIN_VERIFY` opens one 30-second authorization window; `CONFIG_SAVE` consumes that authorization and otherwise refuses to persist device changes. Enrollment uses `FP_ENROLL_AUTO` to select the first free slot from 1 up to the detected sensor capacity. Slots 1 and 2 remain available to enrollment or deletion, so deleting both removes settings-save authorization until they are enrolled again.

## Buzzer melody upload

The Super Admin panel accepts JSON or text melody files. A JSON example is included in this folder. Text format can use frequency/duration pairs:

```text
880:120, 0:60, 1175:180
```

A frequency of `0` is a rest. At most 16 notes are stored. A passive buzzer on pin 10 cannot reproduce WAV or MP3 audio; recorded audio requires hardware such as a DFPlayer Mini and microSD card.

## Browser connection

Use current Chrome or Edge over HTTPS or `localhost`. Click **Select COM Device** in Super Admin Settings, select the uploaded controller, then click **Connect**. The page waits for the board reset and validates the GMS device identity and protocol before enabling fingerprint or customization actions.

## Super Admin firmware flash (no Arduino IDE)

Super Admin can compile the project `.ino` on the server and flash an ESP32-S3 from the browser:

1. Install [Arduino CLI](https://arduino.github.io/arduino-cli/) on the machine running the Node backend.
2. Install the board core and libraries once:

```bash
arduino-cli core update-index
arduino-cli core install esp32:esp32
arduino-cli lib install "Adafruit Fingerprint Sensor Library" "Adafruit GFX Library" "Adafruit SH110X" "FluxGarage RoboEyes"
```

3. Open Super Admin → Settings → Retina Scan & Device Controller → wrench icon → **Firmware update**.
4. Edit `hardware/gms_biometric_controller/gms_biometric_controller.ino` in any editor as needed. **Flash ESP32** builds and uploads when the sketch changed or the device protocol is behind.
5. Click **Flash ESP32**, scan a registered fingerprint, wait for the build + progress bar to finish. Repeat flashes reuse a compile cache and are usually faster.
6. Reconnect the controller when the USB serial port returns.

Optional: set `GMS_BIOMETRIC_FQBN` if you use a different ESP32 board target (default `esp32:esp32:esp32s3`).
