        <div class="admin-biometric-settings__panel-inner">

        <section class="admin-biometric-card admin-biometric-card--firmware" aria-labelledby="admin-biometric-firmware-title">
          <div class="admin-biometric-card__heading">
            <span><strong id="admin-biometric-firmware-title">Firmware update</strong><small>Edit the .ino in VS Code, compile here, then flash the ESP32 from Chrome — no Arduino IDE.</small></span>
          </div>
          <div class="admin-biometric-firmware-controls">
            <p class="admin-biometric-firmware-status" data-biometric-firmware-status>Checking compile tools…</p>
            <div class="admin-biometric-firmware-actions">
              <button type="button" class="admin-biometric-button is-secondary" data-biometric-action="compile-firmware-repo">Compile project .ino</button>
              <label class="admin-biometric-upload admin-biometric-upload--compact">
                <input type="file" accept=".ino,text/plain" data-biometric-firmware-upload />
                <span class="admin-biometric-upload__content">${buzzerUploadIconMarkup}<span>Upload .ino</span></span>
              </label>
              <button type="button" class="admin-biometric-button is-primary" data-biometric-action="flash-firmware" disabled>Flash ESP32</button>
            </div>
            <p class="admin-biometric-file-name" data-biometric-firmware-build-name>No compiled firmware yet.</p>
            <p class="admin-biometric-limit-note">Disconnects the live controller link, flashes over USB, then reconnect when the COM port comes back. ESP32-S3 only. Server needs <code>arduino-cli</code> with the esp32 core and libraries installed once.</p>
          </div>
        </section>

        <section class="admin-biometric-card" aria-labelledby="admin-biometric-fingerprint-title">