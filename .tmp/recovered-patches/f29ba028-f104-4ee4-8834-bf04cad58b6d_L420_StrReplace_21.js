        <section class="admin-biometric-card admin-biometric-card--firmware" aria-labelledby="admin-biometric-firmware-title">
          <div class="admin-biometric-card__heading">
            <span><strong id="admin-biometric-firmware-title">Firmware update</strong><small>Edit the project .ino in VS Code, then check for updates and flash from Chrome — no Arduino IDE.</small></span>
          </div>
          <div class="admin-biometric-firmware-controls">
            <p class="admin-biometric-firmware-status" data-biometric-firmware-status>Checking compile tools…</p>
            <div class="admin-biometric-firmware-actions">
              <button type="button" class="admin-biometric-button is-secondary" data-biometric-action="check-firmware-updates" disabled>Check for updates</button>
              <button type="button" class="admin-biometric-button is-primary" data-biometric-action="flash-firmware" disabled>Flash ESP32</button>
            </div>
            <p class="admin-biometric-file-name" data-biometric-firmware-build-name>Connect the controller to check firmware status.</p>
            <p class="admin-biometric-limit-note">Requires a registered built-in fingerprint scan before flash. Server needs <code>arduino-cli</code> with the esp32 core and libraries installed once.</p>
          </div>
        </section>