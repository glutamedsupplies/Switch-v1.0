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
4. Click **Compile project .ino** (uses `hardware/gms_biometric_controller/gms_biometric_controller.ino`) or upload an edited `.ino`.
5. Click **Flash ESP32**, pick the COM port, and wait for the progress bar to finish.
6. Reconnect the controller when the USB serial port returns.

Optional: set `GMS_BIOMETRIC_FQBN` if you use a different ESP32 board target (default `esp32:esp32:esp32s3`).