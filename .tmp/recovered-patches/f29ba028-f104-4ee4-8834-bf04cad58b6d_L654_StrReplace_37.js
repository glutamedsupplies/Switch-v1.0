  function ensureFirmwareUpdatedLottiePlayer() {
    if (window.lottie?.loadAnimation) {
      return Promise.resolve(true);
    }
    if (firmwareUpdatedLottieLoadPromise) {
      return firmwareUpdatedLottieLoadPromise;
    }
    firmwareUpdatedLottieLoadPromise = new Promise((resolve) => {
      const existingScript = document.querySelector(
        `script[src$="${firmwareUpdatedLottiePlayerUrl}"], script[src*="${firmwareUpdatedLottiePlayerUrl}?"]`,
      );
      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(Boolean(window.lottie?.loadAnimation)), { once: true });
        existingScript.addEventListener("error", () => resolve(false), { once: true });
        if (window.lottie?.loadAnimation) {
          resolve(true);
        }
        return;
      }
      const scriptElement = document.createElement("script");
      scriptElement.src = firmwareUpdatedLottiePlayerUrl;
      scriptElement.async = true;
      scriptElement.addEventListener("load", () => resolve(Boolean(window.lottie?.loadAnimation)), { once: true });
      scriptElement.addEventListener("error", () => resolve(false), { once: true });
      document.head.appendChild(scriptElement);
    });
    return firmwareUpdatedLottieLoadPromise;
  }

  function destroyFirmwareUpdatedAnimation() {
    if (firmwareUpdatedAnimation?.destroy) {
      firmwareUpdatedAnimation.destroy();
    }
    firmwareUpdatedAnimation = null;
  }

  async function playFirmwareUpdatedAnimation() {
    const container = firmwareUpdatedModalElements?.icon?.querySelector(
      "[data-biometric-firmware-updated-lottie]",
    );
    if (!(container instanceof HTMLElement)) {
      return;
    }
    destroyFirmwareUpdatedAnimation();
    container.innerHTML = "";
    const canUseLottie = await ensureFirmwareUpdatedLottiePlayer();
    if (
      !canUseLottie
      || !window.lottie?.loadAnimation
      || !container.isConnected
      || firmwareUpdatedModalElements?.root?.hidden
    ) {
      return;
    }
    firmwareUpdatedAnimation = window.lottie.loadAnimation({
      container,
      renderer: "svg",
      loop: false,
      autoplay: true,
      path: firmwareUpdatedAnimationPath,
    });
  }

  function ensureFirmwareUpdatedModal() {
    if (firmwareUpdatedModalElements?.root instanceof HTMLElement) {
      return firmwareUpdatedModalElements;
    }
    const root = document.createElement("div");
    root.className = "validation-modal-overlay admin-biometric-firmware-updated-overlay";
    root.hidden = true;
    root.setAttribute("aria-hidden", "true");
    root.innerHTML = `
      <section
        class="validation-modal validation-modal--success admin-biometric-firmware-updated-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-biometric-firmware-updated-title"
        tabindex="-1"
      >
        <div class="validation-modal__top">
          <div
            class="validation-modal__icon validation-modal__icon--success"
            aria-hidden="true"
            role="presentation"
            tabindex="-1"
            data-biometric-firmware-updated-icon
          >
            <div class="product-validation-lottie-check" data-biometric-firmware-updated-lottie></div>
          </div>
        </div>
        <div class="validation-modal__body">
          <h2 class="validation-modal__title" id="admin-biometric-firmware-updated-title">Firmware updated</h2>
          <p class="validation-modal__copy" data-biometric-firmware-updated-message>Flash complete. Reconnect the controller when the COM port returns.</p>
        </div>
      </section>
    `;
    document.body?.appendChild(root);
    firmwareUpdatedModalElements = {
      root,
      icon: root.querySelector("[data-biometric-firmware-updated-icon]"),
      message: root.querySelector("[data-biometric-firmware-updated-message]"),
    };
    return firmwareUpdatedModalElements;
  }

  function hideFirmwareUpdatedModal() {
    window.clearTimeout(firmwareUpdatedModalHideTimer);
    firmwareUpdatedModalHideTimer = 0;
    const modal = firmwareUpdatedModalElements;
    if (!(modal?.root instanceof HTMLElement)) {
      destroyFirmwareUpdatedAnimation();
      return;
    }
    modal.root.classList.remove("is-open");
    modal.root.setAttribute("aria-hidden", "true");
    window.setTimeout(() => {
      if (modal.root && !modal.root.classList.contains("is-open")) {
        destroyFirmwareUpdatedAnimation();
        modal.root.hidden = true;
      }
    }, 220);
  }

  function showFirmwareUpdatedModal(message = "") {
    const modal = ensureFirmwareUpdatedModal();
    if (modal.message instanceof HTMLElement) {
      modal.message.textContent = String(message || "")
        .replace(/\s+/g, " ")
        .trim()
        || "Flash complete. Reconnect the controller when the COM port returns.";
    }
    hideFirmwareUploadSnackbar();
    modal.root.hidden = false;
    modal.root.setAttribute("aria-hidden", "false");
    window.clearTimeout(firmwareUpdatedModalHideTimer);
    window.requestAnimationFrame(() => {
      modal.root.classList.add("is-open");
    });
    void playFirmwareUpdatedAnimation();
    firmwareUpdatedModalHideTimer = window.setTimeout(() => {
      hideFirmwareUpdatedModal();
    }, firmwareUpdatedAnimationMs + firmwareUpdatedHoldMs);
  }