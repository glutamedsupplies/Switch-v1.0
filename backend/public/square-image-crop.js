(() => {
  const SQUARE_TOLERANCE = 0.01;
  const OUTPUT_SIZE = 1080;
  const MIN_ZOOM = 1;
  const MAX_ZOOM = 3;

  function isSvgFile(file) {
    const type = String(file?.type || "").toLowerCase();
    const name = String(file?.name || "").toLowerCase();
    return type === "image/svg+xml" || name.endsWith(".svg");
  }

  function isNearlySquare(width, height) {
    const w = Number(width) || 0;
    const h = Number(height) || 0;
    if (w <= 0 || h <= 0) {
      return false;
    }
    const ratio = Math.abs(w - h) / Math.max(w, h);
    return ratio <= SQUARE_TOLERANCE;
  }

  function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.addEventListener(
        "load",
        () => {
          resolve({ image, url, width: image.naturalWidth, height: image.naturalHeight });
        },
        { once: true },
      );
      image.addEventListener(
        "error",
        () => {
          URL.revokeObjectURL(url);
          reject(new Error("The selected file is not a readable image."));
        },
        { once: true },
      );
      image.src = url;
    });
  }

  function getOutputType(file) {
    const type = String(file?.type || "").toLowerCase();
    if (type === "image/png") {
      return "image/png";
    }
    if (type === "image/webp") {
      return "image/webp";
    }
    return "image/jpeg";
  }

  function getOutputName(file, outputType) {
    const base = String(file?.name || "image")
      .replace(/\.[^.]+$/, "")
      .replace(/[^\w.-]+/g, "-") || "image";
    const extension = outputType === "image/png" ? "png" : outputType === "image/webp" ? "webp" : "jpg";
    return `${base}-square.${extension}`;
  }

  function canvasToFile(canvas, file) {
    const outputType = getOutputType(file);
    const quality = outputType === "image/jpeg" ? 0.92 : undefined;
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!(blob instanceof Blob)) {
            reject(new Error("Unable to crop this image."));
            return;
          }
          resolve(new File([blob], getOutputName(file, outputType), { type: outputType }));
        },
        outputType,
        quality,
      );
    });
  }

  function getCoverScale(imageWidth, imageHeight, frameSize) {
    return Math.max(frameSize / imageWidth, frameSize / imageHeight);
  }

  function clampOffset(offset, imageSize, frameSize, scale) {
    const painted = imageSize * scale;
    const min = Math.min(0, frameSize - painted);
    const max = 0;
    return Math.min(max, Math.max(min, offset));
  }

  function cropImageToSquareFile(image, file, frame, offsetX, offsetY, scale) {
    const sourceX = Math.max(0, -offsetX / scale);
    const sourceY = Math.max(0, -offsetY / scale);
    const sourceSize = frame / scale;
    const outputSize = Math.min(
      OUTPUT_SIZE,
      Math.max(1, Math.round(Math.min(image.naturalWidth, image.naturalHeight, sourceSize))),
    );
    const canvas = document.createElement("canvas");
    canvas.width = outputSize;
    canvas.height = outputSize;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Unable to crop this image.");
    }
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceSize,
      sourceSize,
      0,
      0,
      outputSize,
      outputSize,
    );
    return canvasToFile(canvas, file);
  }

  function createCropModal({ title = "Crop image", copy = "Drag to position. Use + / − or the slider to zoom." } = {}) {
    const overlay = document.createElement("div");
    overlay.className = "gms-square-crop-overlay";
    overlay.setAttribute("role", "presentation");
    overlay.innerHTML = `
      <section class="gms-square-crop-dialog" role="dialog" aria-modal="true" aria-labelledby="gms-square-crop-title" tabindex="-1">
        <header class="gms-square-crop-dialog__header">
          <div>
            <h2 id="gms-square-crop-title">${title}</h2>
            <p>${copy}</p>
          </div>
          <button type="button" class="gms-square-crop-dialog__close" data-crop-cancel aria-label="Cancel crop">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
              <path d="M7 7 17 17" stroke-linecap="round" />
              <path d="M17 7 7 17" stroke-linecap="round" />
            </svg>
          </button>
        </header>
        <div class="gms-square-crop-stage" data-crop-stage>
          <img data-crop-image alt="" draggable="false" />
          <span class="gms-square-crop-mask" aria-hidden="true"></span>
        </div>
        <div class="gms-square-crop-dialog__zoom" data-crop-zoom-controls>
          <button type="button" class="gms-square-crop-dialog__zoom-button" data-crop-zoom-out aria-label="Zoom out" title="Zoom out">-</button>
          <input
            type="range"
            class="gms-square-crop-dialog__zoom-range"
            min="${MIN_ZOOM}"
            max="${MAX_ZOOM}"
            step="0.01"
            value="${MIN_ZOOM}"
            data-crop-zoom
            aria-label="Zoom"
          />
          <button type="button" class="gms-square-crop-dialog__zoom-button" data-crop-zoom-in aria-label="Zoom in" title="Zoom in">+</button>
          <span class="gms-square-crop-dialog__zoom-label" data-crop-zoom-label>100%</span>
        </div>
        <footer class="gms-square-crop-dialog__footer">
          <button type="button" class="gms-square-crop-dialog__button gms-square-crop-dialog__button--ghost" data-crop-cancel>Cancel</button>
          <button type="button" class="gms-square-crop-dialog__button gms-square-crop-dialog__button--primary" data-crop-apply>Apply</button>
        </footer>
      </section>
    `;
    return overlay;
  }

  function openSquareCropper(image, file, options = {}) {
    return new Promise((resolve) => {
      const overlay = createCropModal(options);
      const stage = overlay.querySelector("[data-crop-stage]");
      const preview = overlay.querySelector("[data-crop-image]");
      const zoomInput = overlay.querySelector("[data-crop-zoom]");
      const zoomOutButton = overlay.querySelector("[data-crop-zoom-out]");
      const zoomInButton = overlay.querySelector("[data-crop-zoom-in]");
      const zoomLabel = overlay.querySelector("[data-crop-zoom-label]");
      const dialog = overlay.querySelector(".gms-square-crop-dialog");
      const ZOOM_BUTTON_STEP = 0.25;
      let settled = false;
      let frameSize = 320;
      let zoom = MIN_ZOOM;
      let offsetX = 0;
      let offsetY = 0;
      let drag = null;

      const finish = (result) => {
        if (settled) {
          return;
        }
        settled = true;
        overlay.classList.remove("is-open");
        window.setTimeout(() => overlay.remove(), 180);
        resolve(result);
      };

      const applyTransform = () => {
        const scale = getCoverScale(image.naturalWidth, image.naturalHeight, frameSize) * zoom;
        offsetX = clampOffset(offsetX, image.naturalWidth, frameSize, scale);
        offsetY = clampOffset(offsetY, image.naturalHeight, frameSize, scale);
        preview.style.width = `${image.naturalWidth * scale}px`;
        preview.style.height = `${image.naturalHeight * scale}px`;
        preview.style.left = `${offsetX}px`;
        preview.style.top = `${offsetY}px`;
      };

      const syncZoomControls = () => {
        const progress = ((zoom - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM)) * 100;
        if (zoomInput instanceof HTMLInputElement) {
          zoomInput.value = String(zoom);
          zoomInput.style.setProperty("--zoom-range-progress", `${progress}%`);
        }
        if (zoomLabel) {
          zoomLabel.textContent = `${Math.round(zoom * 100)}%`;
        }
        if (zoomOutButton instanceof HTMLButtonElement) {
          zoomOutButton.disabled = zoom <= MIN_ZOOM + 0.001;
        }
        if (zoomInButton instanceof HTMLButtonElement) {
          zoomInButton.disabled = zoom >= MAX_ZOOM - 0.001;
        }
      };

      const setZoom = (nextZoom, { keepCenter = true } = {}) => {
        const previousScale = getCoverScale(image.naturalWidth, image.naturalHeight, frameSize) * zoom;
        zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(nextZoom) || MIN_ZOOM));
        const nextScale = getCoverScale(image.naturalWidth, image.naturalHeight, frameSize) * zoom;
        if (keepCenter) {
          const centerX = frameSize / 2;
          const centerY = frameSize / 2;
          const imageX = (centerX - offsetX) / previousScale;
          const imageY = (centerY - offsetY) / previousScale;
          offsetX = centerX - imageX * nextScale;
          offsetY = centerY - imageY * nextScale;
        }
        syncZoomControls();
        applyTransform();
      };

      const centerCover = () => {
        const scale = getCoverScale(image.naturalWidth, image.naturalHeight, frameSize) * zoom;
        offsetX = (frameSize - image.naturalWidth * scale) / 2;
        offsetY = (frameSize - image.naturalHeight * scale) / 2;
        applyTransform();
      };

      preview.src = image.src;
      document.body.append(overlay);
      window.requestAnimationFrame(() => {
        overlay.classList.add("is-open");
        frameSize = stage.getBoundingClientRect().width || 320;
        centerCover();
        syncZoomControls();
        dialog?.focus?.({ preventScroll: true });
      });

      zoomInput.addEventListener("input", () => {
        setZoom(Number(zoomInput.value) || MIN_ZOOM);
      });
      zoomOutButton?.addEventListener("click", () => {
        setZoom(zoom - ZOOM_BUTTON_STEP);
      });
      zoomInButton?.addEventListener("click", () => {
        setZoom(zoom + ZOOM_BUTTON_STEP);
      });

      const onPointerMove = (event) => {
        if (!drag) {
          return;
        }
        offsetX = drag.startOffsetX + (event.clientX - drag.startX);
        offsetY = drag.startOffsetY + (event.clientY - drag.startY);
        applyTransform();
      };
      const onPointerUp = () => {
        drag = null;
        stage.classList.remove("is-dragging");
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
      };

      stage.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        drag = {
          startX: event.clientX,
          startY: event.clientY,
          startOffsetX: offsetX,
          startOffsetY: offsetY,
        };
        stage.classList.add("is-dragging");
        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerUp);
      });

      overlay.querySelectorAll("[data-crop-cancel]").forEach((button) => {
        button.addEventListener("click", () => finish(null));
      });
      overlay.addEventListener("click", (event) => {
        if (event.target === overlay) {
          finish(null);
        }
      });
      overlay.querySelector("[data-crop-apply]")?.addEventListener("click", async () => {
        try {
          const scale = getCoverScale(image.naturalWidth, image.naturalHeight, frameSize) * zoom;
          const croppedFile = await cropImageToSquareFile(
            image,
            file,
            frameSize,
            offsetX,
            offsetY,
            scale,
          );
          finish(croppedFile);
        } catch (error) {
          finish(null);
        }
      });
    });
  }

  async function downscaleImageIfNeeded(image, file, maxSize = OUTPUT_SIZE) {
    const width = image.naturalWidth;
    const height = image.naturalHeight;
    if (width <= maxSize && height <= maxSize) {
      return null;
    }
    const scale = Math.min(maxSize / width, maxSize / height);
    const outputWidth = Math.max(1, Math.round(width * scale));
    const outputHeight = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Unable to resize this image.");
    }
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, 0, 0, outputWidth, outputHeight);
    return canvasToFile(canvas, file);
  }

  async function prepareSquareImageFile(file, options = {}) {
    if (!(file instanceof File) || isSvgFile(file)) {
      return file;
    }

    const loaded = await loadImageFromFile(file);
    try {
      if (isNearlySquare(loaded.width, loaded.height)) {
        const downscaled = await downscaleImageIfNeeded(loaded.image, file);
        return downscaled || file;
      }
      const cropped = await openSquareCropper(loaded.image, file, options);
      if (!(cropped instanceof File)) {
        return cropped;
      }
      const croppedLoaded = await loadImageFromFile(cropped);
      try {
        const downscaled = await downscaleImageIfNeeded(croppedLoaded.image, cropped);
        return downscaled || cropped;
      } finally {
        URL.revokeObjectURL(croppedLoaded.url);
      }
    } finally {
      URL.revokeObjectURL(loaded.url);
    }
  }

  window.GMS_SQUARE_IMAGE_CROP = {
    isNearlySquare,
    prepareSquareImageFile,
  };
})();
