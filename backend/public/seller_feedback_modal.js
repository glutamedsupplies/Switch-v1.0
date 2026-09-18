(() => {
  "use strict";

  if (window.__gmsSellerFeedbackModalReady) {
    return;
  }
  window.__gmsSellerFeedbackModalReady = true;

  const adminSessionKey = "gms-admin-session";
  const maxPhotos = 1;
  const maxVideos = 1;
  const maxPhotoBytes = 10 * 1024 * 1024;
  const maxVideoBytes = 50 * 1024 * 1024;

  const RATING_LABELS = {
    1: "Poor",
    2: "Fair",
    3: "Good",
    4: "Very Good",
    5: "Excellent",
  };

  const FEEDBACK_CATEGORIES = Object.freeze([
    "Suggestions for improvement",
    "Report a bug or issue",
    "Share your experience",
    "Other feedback",
  ]);

  const FEEDBACK_LOTTIE_URL = "/animations/ranting-and-reviews.json?v=2";
  const FEEDBACK_LOTTIE_PLAYER_URL = "/vendor/lottie.min.js";
  const FEEDBACK_LOTTIE_BOX_FILL = Object.freeze([0.4549, 0.2, 0.9333]);
  const FEEDBACK_LOTTIE_STAR_OUTLINE = Object.freeze([0.2706, 0.0706, 0.6941]);

  let overlay = null;
  let illustrationAnimation = null;
  let lottieLoadPromise = null;
  let feedbackLottieBaseData = null;
  let feedbackLottieDataPromise = null;
  let selectedRating = 0;
  let selectedCategory = "";
  let submitting = false;
  let photos = [];
  let videos = [];

  function readAdminSession() {
    try {
      const raw = window.sessionStorage.getItem(adminSessionKey);
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (error) {
      return null;
    }
  }

  function getAdminId(session) {
    return String(session?.adminId ?? session?.id ?? session?.accountCode ?? "").trim();
  }

  function makeMediaId() {
    return globalThis.crypto?.randomUUID?.() || `feedback-media-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function getFileKind(file) {
    const type = String(file?.type || "").toLowerCase();
    const name = String(file?.name || "").toLowerCase();
    if (type.startsWith("image/") || /\.(jpe?g|png|webp|gif)$/i.test(name)) {
      return "image";
    }
    if (type.startsWith("video/") || /\.(mp4|mov|m4v|webm|avi|mkv|3gp)$/i.test(name)) {
      return "video";
    }
    return "";
  }

  function getContentType(file, kind) {
    const type = String(file?.type || "").trim();
    if (type.includes("/")) {
      return type;
    }
    const extension = String(file?.name || "").toLowerCase().split(".").pop();
    const types = {
      jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif",
      mp4: "video/mp4", mov: "video/quicktime", m4v: "video/x-m4v", webm: "video/webm",
      avi: "video/x-msvideo", mkv: "video/x-matroska", "3gp": "video/3gpp",
    };
    return types[extension] || (kind === "video" ? "video/mp4" : "image/jpeg");
  }

  function formatFileSize(bytes) {
    const size = Number(bytes) || 0;
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  function getFileExtension(name) {
    const ext = String(name || "").split(".").pop()?.toUpperCase() || "";
    return ext.length <= 5 ? ext : "";
  }

  const MODAL_VERSION = "15";

  function colorsNear(first, second, epsilon = 0.001) {
    return (
      Math.abs(first[0] - second[0]) < epsilon
      && Math.abs(first[1] - second[1]) < epsilon
      && Math.abs(first[2] - second[2]) < epsilon
    );
  }

  function parseCssColorToLottieRgb(colorValue) {
    const normalized = String(colorValue || "").trim();
    if (!normalized) {
      return [...FEEDBACK_LOTTIE_BOX_FILL];
    }

    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext("2d");
    if (!context) {
      return [...FEEDBACK_LOTTIE_BOX_FILL];
    }

    try {
      context.fillStyle = "#000000";
      context.fillStyle = normalized;
      context.fillRect(0, 0, 1, 1);
      const [red, green, blue] = context.getImageData(0, 0, 1, 1).data;
      return [red / 255, green / 255, blue / 255];
    } catch (error) {
      return [...FEEDBACK_LOTTIE_BOX_FILL];
    }
  }

  function getIllustrationAccentColors() {
    const rootStyle = getComputedStyle(document.documentElement);
    const box = rootStyle.getPropertyValue("--accent").trim() || "#2563eb";
    const outline = rootStyle.getPropertyValue("--accent-strong").trim() || box;
    return { box, outline };
  }

  function syncIllustrationAccentVars() {
    const container = overlay?.querySelector("[data-seller-feedback-illustration]");
    if (!(container instanceof HTMLElement)) {
      return;
    }

    const { box, outline } = getIllustrationAccentColors();
    container.style.setProperty("--sfm-lottie-box-fill", box);
    container.style.setProperty("--sfm-lottie-star-outline", outline);
  }

  function patchStarBoxLayer(layer, accentColors) {
    if (layer?.nm !== "Star box" || !Array.isArray(layer.shapes)) {
      return;
    }

    const boxRgb = parseCssColorToLottieRgb(accentColors.box);
    const outlineRgb = parseCssColorToLottieRgb(accentColors.outline);

    layer.shapes.forEach((shape) => {
      if (!Array.isArray(shape.it)) {
        return;
      }
      shape.it.forEach((item) => {
        if (item?.ty !== "fl" || !item.c || !Array.isArray(item.c.k)) {
          return;
        }
        if (colorsNear(item.c.k, FEEDBACK_LOTTIE_BOX_FILL)) {
          item.c.k = boxRgb;
          return;
        }
        if (colorsNear(item.c.k, FEEDBACK_LOTTIE_STAR_OUTLINE)) {
          item.c.k = outlineRgb;
        }
      });
    });
  }

  function patchAnimationStarBoxColors(animationData, accentColors = getIllustrationAccentColors()) {
    const patchedData = JSON.parse(JSON.stringify(animationData));

    function walkLayers(layers) {
      if (!Array.isArray(layers)) {
        return;
      }
      layers.forEach((layer) => {
        patchStarBoxLayer(layer, accentColors);
        walkLayers(layer.layers);
      });
    }

    walkLayers(patchedData.layers);
    if (Array.isArray(patchedData.assets)) {
      patchedData.assets.forEach((asset) => walkLayers(asset.layers));
    }

    return patchedData;
  }

  async function loadFeedbackLottieBaseData() {
    if (feedbackLottieBaseData) {
      return feedbackLottieBaseData;
    }
    if (!feedbackLottieDataPromise) {
      feedbackLottieDataPromise = fetch(FEEDBACK_LOTTIE_URL, { cache: "force-cache" })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Unable to load feedback illustration.");
          }
          return response.json();
        })
        .then((data) => {
          feedbackLottieBaseData = data;
          return data;
        })
        .catch((error) => {
          feedbackLottieDataPromise = null;
          throw error;
        });
    }
    return feedbackLottieDataPromise;
  }

  function handleIllustrationAccentThemeChange() {
    if (!document.body.classList.contains("seller-feedback-modal-open")) {
      return;
    }
    syncIllustrationAccentVars();
    void mountIllustrationLottie();
  }

  function ensureLottiePlayer() {
    if (window.lottie?.loadAnimation) {
      return Promise.resolve(true);
    }
    if (lottieLoadPromise) {
      return lottieLoadPromise;
    }
    lottieLoadPromise = new Promise((resolve) => {
      const existingScript = document.querySelector(`script[src="${FEEDBACK_LOTTIE_PLAYER_URL}"], script[src^="${FEEDBACK_LOTTIE_PLAYER_URL}?"]`);
      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(Boolean(window.lottie?.loadAnimation)), { once: true });
        existingScript.addEventListener("error", () => resolve(false), { once: true });
        if (window.lottie?.loadAnimation) {
          resolve(true);
        }
        return;
      }
      const scriptElement = document.createElement("script");
      scriptElement.src = FEEDBACK_LOTTIE_PLAYER_URL;
      scriptElement.async = true;
      scriptElement.addEventListener("load", () => resolve(Boolean(window.lottie?.loadAnimation)), { once: true });
      scriptElement.addEventListener("error", () => resolve(false), { once: true });
      document.head.appendChild(scriptElement);
    });
    return lottieLoadPromise;
  }

  function destroyIllustrationLottie() {
    if (illustrationAnimation?.destroy) {
      illustrationAnimation.destroy();
    }
    illustrationAnimation = null;
  }

  async function mountIllustrationLottie() {
    const container = overlay?.querySelector("[data-seller-feedback-illustration]");
    if (!(container instanceof HTMLElement)) {
      return;
    }
    destroyIllustrationLottie();
    container.innerHTML = "";
    syncIllustrationAccentVars();

    const ready = await ensureLottiePlayer();
    if (!ready || !window.lottie?.loadAnimation) {
      return;
    }

    let animationData = null;
    try {
      animationData = patchAnimationStarBoxColors(await loadFeedbackLottieBaseData());
    } catch (error) {
      return;
    }

    illustrationAnimation = window.lottie.loadAnimation({
      container,
      renderer: "svg",
      loop: false,
      autoplay: true,
      animationData,
    });
    illustrationAnimation.addEventListener("DOMLoaded", syncIllustrationAccentVars);
  }

  function ensureOverlay() {
    const existingOverlay = document.querySelector(".seller-feedback-modal-overlay");
    if (
      existingOverlay instanceof HTMLElement
      && existingOverlay.dataset.sellerFeedbackVersion !== MODAL_VERSION
    ) {
      existingOverlay.remove();
      overlay = null;
    }

    if (overlay instanceof HTMLElement) {
      return overlay;
    }

    overlay = document.createElement("div");
    overlay.className = "seller-feedback-modal-overlay";
    overlay.dataset.sellerFeedbackVersion = MODAL_VERSION;
    overlay.hidden = true;
    overlay.innerHTML = `
      <div class="seller-feedback-modal" role="dialog" aria-modal="true" aria-labelledby="seller-feedback-modal-title">
        <header class="seller-feedback-modal__header">
          <h2 id="seller-feedback-modal-title" class="seller-feedback-modal__header-title">
            <span class="seller-feedback-modal__header-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"></path>
                <path d="M12 11h.01"></path>
                <path d="M16 11h.01"></path>
                <path d="M8 11h.01"></path>
              </svg>
            </span>
            Feedback
          </h2>
          <p class="seller-feedback-modal__header-tagline">We value your feedback 💜</p>
        </header>
        <form class="seller-feedback-modal__form" data-seller-feedback-form>
          <div class="seller-feedback-modal__body">
            <aside class="seller-feedback-modal__sidebar" aria-label="Feedback information">
              <h3>We'd love to hear from you!</h3>
              <p class="seller-feedback-modal__sidebar-intro">Your feedback helps us improve and build a better experience for everyone.</p>
              <div class="seller-feedback-modal__illustration" data-seller-feedback-illustration aria-hidden="true"></div>
              <div class="seller-feedback-modal__share-card">
                <h4>What can you share?</h4>
                <ul class="seller-feedback-modal__share-list">
                  <li>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"></path><path d="M9 18h6"></path><path d="M10 22h4"></path></svg>
                    Suggestions for improvement
                  </li>
                  <li>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20v-9"></path><path d="M14 7a4 4 0 0 1 4 4v3a6 6 0 0 1-12 0v-3a4 4 0 0 1 4-4z"></path><path d="M14.12 3.88 16 2"></path><path d="M21 21a4 4 0 0 0-3.81-4"></path><path d="M21 5a4 4 0 0 1-3.55 3.97"></path><path d="M22 13h-4"></path><path d="M3 21a4 4 0 0 1 3.81-4"></path><path d="M3 5a4 4 0 0 0 3.55 3.97"></path><path d="M6 13H2"></path><path d="m8 2 1.88 1.88"></path><path d="M9 7.13V6a3 3 0 1 1 6 0v1.13"></path></svg>
                    Report a bug or issue
                  </li>
                  <li>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 14h2a2 2 0 0 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 16"></path><path d="m14.45 13.39 5.05-4.694C20.196 8 21 6.85 21 5.75a2.75 2.75 0 0 0-4.797-1.837.276.276 0 0 1-.406 0A2.75 2.75 0 0 0 11 5.75c0 1.2.802 2.248 1.5 2.946L16 11.95"></path><path d="m2 15 6 6"></path><path d="m7 20 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a1 1 0 0 0-2.75-2.91"></path></svg>
                    Share your experience
                  </li>
                  <li>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"></path></svg>
                    Other feedback
                  </li>
                </ul>
              </div>
            </aside>
            <div class="seller-feedback-modal__panel">
              <div class="seller-feedback-modal__rating-block" data-seller-feedback-rating-field>
                <p class="seller-feedback-modal__field-label">Rate your experience</p>
                <div class="seller-feedback-modal__rating-row">
                  <fieldset class="seller-feedback-modal__rating">
                    <legend class="seller-feedback-modal__sr-only">Rating</legend>
                    <div class="seller-feedback-modal__rating-control" data-seller-feedback-rating-control>
                      <div class="seller-feedback-modal__stars" data-seller-feedback-stars role="group" aria-label="Rating">
                        ${[1, 2, 3, 4, 5].map((value) => `
                          <button type="button" class="seller-feedback-modal__star" data-rating="${value}" aria-label="${value} star${value === 1 ? "" : "s"}">★</button>
                        `).join("")}
                      </div>
                    </div>
                  </fieldset>
                  <div class="seller-feedback-modal__category-picker" data-seller-feedback-category-field>
                    <span class="seller-feedback-modal__sr-only" id="seller-feedback-category-label">Feedback category</span>
                    <span class="seller-feedback-modal__category-select" data-seller-feedback-category-dropdown>
                      <select
                        class="seller-feedback-modal__native-category-select"
                        data-seller-feedback-category-select
                        tabindex="-1"
                        aria-hidden="true"
                        aria-labelledby="seller-feedback-category-label"
                      >
                        <option value="" selected disabled>Select feedback category</option>
                        ${FEEDBACK_CATEGORIES.map((category) => `
                          <option value="${category}">${category}</option>
                        `).join("")}
                      </select>
                      <button
                        type="button"
                        class="seller-feedback-modal__category-trigger"
                        data-seller-feedback-category-trigger
                        aria-expanded="false"
                        aria-haspopup="menu"
                        aria-controls="seller-feedback-category-menu"
                        aria-labelledby="seller-feedback-category-label"
                      >
                        <span data-seller-feedback-category-label>Select feedback category</span>
                        <svg class="seller-feedback-modal__category-trigger-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                          <path d="m6 9 6 6 6-6"></path>
                        </svg>
                      </button>
                      <div
                        class="seller-feedback-modal__category-menu"
                        id="seller-feedback-category-menu"
                        role="menu"
                        hidden
                        data-seller-feedback-category-menu
                      >
                        ${FEEDBACK_CATEGORIES.map((category) => `
                          <button
                            type="button"
                            class="seller-feedback-modal__category-option"
                            role="menuitemradio"
                            aria-checked="false"
                            data-seller-feedback-category-option="${category}"
                          >${category}</button>
                        `).join("")}
                      </div>
                    </span>
                  </div>
                  <span class="seller-feedback-modal__rating-label" data-seller-feedback-rating-label aria-live="polite"></span>
                </div>
                <p
                  class="seller-feedback-modal__field-message"
                  id="seller-feedback-rating-message"
                  data-seller-feedback-rating-message
                  hidden
                ></p>
                <p
                  class="seller-feedback-modal__field-message"
                  id="seller-feedback-category-message"
                  data-seller-feedback-category-message
                  hidden
                ></p>
              </div>

              <div class="seller-feedback-modal__feedback-block" data-seller-feedback-message-field>
                <label class="seller-feedback-modal__field-label" for="seller-feedback-message">Your Feedback *</label>
                <div class="seller-feedback-modal__textarea-wrap">
                  <textarea id="seller-feedback-message" name="message" rows="5" maxlength="1000" placeholder="Tell us what you think..." required data-seller-feedback-message aria-describedby="seller-feedback-message-validation"></textarea>
                  <span class="seller-feedback-modal__char-count" data-seller-feedback-char-count>0 / 1000</span>
                </div>
                <p
                  class="seller-feedback-modal__field-message"
                  id="seller-feedback-message-validation"
                  data-seller-feedback-message-validation
                  hidden
                ></p>
              </div>

              <div class="seller-feedback-modal__upload-grid">
                <div class="seller-feedback-modal__upload-col" data-seller-feedback-photo-col>
                  <div class="seller-feedback-modal__upload-head">
                    <span>Image Upload (optional)</span>
                    <button type="button" class="seller-feedback-modal__replace-btn" data-seller-feedback-photo-replace hidden>Replace File</button>
                  </div>
                  <div class="seller-feedback-modal__upload-slot" data-seller-feedback-photo-slot>
                    <button type="button" class="seller-feedback-modal__dropzone" data-seller-feedback-photo-dropzone aria-label="Upload image">
                      <span class="seller-feedback-modal__dropzone-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path></svg>
                      </span>
                      <p class="seller-feedback-modal__dropzone-text">Drag and drop image here</p>
                      <p class="seller-feedback-modal__dropzone-or">or</p>
                      <span class="seller-feedback-modal__choose-btn">Choose Image</span>
                    </button>
                    <div class="seller-feedback-modal__file-card" data-seller-feedback-photo-card>
                      <div class="seller-feedback-modal__file-preview" data-seller-feedback-photo-preview></div>
                      <div class="seller-feedback-modal__file-meta">
                        <p class="seller-feedback-modal__file-name" data-seller-feedback-photo-name></p>
                        <div class="seller-feedback-modal__file-details">
                          <span data-seller-feedback-photo-size></span>
                          <span class="seller-feedback-modal__file-status">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>
                            Upload complete
                          </span>
                        </div>
                      </div>
                      <div class="seller-feedback-modal__file-actions">
                        <button type="button" class="seller-feedback-modal__file-action" data-seller-feedback-photo-replace-action>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path><path d="M16 16h5v5"></path></svg>
                          Replace
                        </button>
                        <button type="button" class="seller-feedback-modal__file-action" data-seller-feedback-photo-view>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                          View
                        </button>
                        <button type="button" class="seller-feedback-modal__file-action seller-feedback-modal__file-action--danger" data-seller-feedback-photo-remove>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                  <p class="seller-feedback-modal__upload-hint">JPG, PNG, GIF up to 10MB</p>
                  <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" hidden data-seller-feedback-photo-input aria-label="Choose image" />
                </div>

                <div class="seller-feedback-modal__upload-col" data-seller-feedback-video-col>
                  <div class="seller-feedback-modal__upload-head">
                    <span>Video Upload (optional)</span>
                    <button type="button" class="seller-feedback-modal__replace-btn" data-seller-feedback-video-replace hidden>Replace File</button>
                  </div>
                  <div class="seller-feedback-modal__upload-slot" data-seller-feedback-video-slot>
                    <button type="button" class="seller-feedback-modal__dropzone" data-seller-feedback-video-dropzone aria-label="Upload video">
                      <span class="seller-feedback-modal__dropzone-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"></path><rect x="2" y="6" width="14" height="12" rx="2"></rect></svg>
                      </span>
                      <p class="seller-feedback-modal__dropzone-text">Drag and drop video here</p>
                      <p class="seller-feedback-modal__dropzone-or">or</p>
                      <span class="seller-feedback-modal__choose-btn">Choose Video</span>
                    </button>
                    <div class="seller-feedback-modal__file-card" data-seller-feedback-video-card>
                      <div class="seller-feedback-modal__file-preview" data-seller-feedback-video-preview>
                        <span class="seller-feedback-modal__file-play" aria-hidden="true"><span><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"></path></svg></span></span>
                      </div>
                      <div class="seller-feedback-modal__file-meta">
                        <p class="seller-feedback-modal__file-name" data-seller-feedback-video-name></p>
                        <div class="seller-feedback-modal__file-details">
                          <span data-seller-feedback-video-size></span>
                          <span class="seller-feedback-modal__file-status">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>
                            Upload complete
                          </span>
                        </div>
                      </div>
                      <div class="seller-feedback-modal__file-actions">
                        <button type="button" class="seller-feedback-modal__file-action" data-seller-feedback-video-replace-action>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path><path d="M16 16h5v5"></path></svg>
                          Replace
                        </button>
                        <button type="button" class="seller-feedback-modal__file-action" data-seller-feedback-video-preview>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                          Preview
                        </button>
                        <button type="button" class="seller-feedback-modal__file-action seller-feedback-modal__file-action--danger" data-seller-feedback-video-remove>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                  <p class="seller-feedback-modal__upload-hint">MP4, MOV, WEBM up to 50MB</p>
                  <input type="file" accept="video/mp4,video/quicktime,video/webm,video/*" hidden data-seller-feedback-video-input aria-label="Choose video" />
                </div>
              </div>

              <div class="seller-feedback-modal__privacy">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                Your feedback is confidential and will only be used to improve our services.
              </div>
            </div>
          </div>
          <footer class="seller-feedback-modal__footer">
            <p class="seller-feedback-modal__status" data-seller-feedback-status hidden></p>
            <div class="seller-feedback-modal__actions">
              <button type="button" class="seller-feedback-modal__button seller-feedback-modal__button--ghost" data-seller-feedback-close>Cancel</button>
              <button type="submit" class="seller-feedback-modal__button seller-feedback-modal__button--primary" data-seller-feedback-submit>
                Submit Feedback
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="m22 2-7 20-4-9-9-4Z"></path>
                  <path d="M22 2 11 13"></path>
                </svg>
              </button>
            </div>
          </footer>
        </form>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        closeModal();
      }
    });

    overlay.querySelectorAll("[data-seller-feedback-close]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        closeModal();
      });
    });

    overlay.querySelector("[data-seller-feedback-stars]")?.addEventListener("click", (event) => {
      const star = event.target?.closest?.("[data-rating]");
      if (!(star instanceof HTMLElement)) {
        return;
      }
      selectedRating = Number(star.dataset.rating) || 0;
      syncStars();
      clearFeedbackFieldError("rating");
      setStatus("", "");
    });

    overlay.querySelector("[data-seller-feedback-category-trigger]")?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const trigger = overlay.querySelector("[data-seller-feedback-category-trigger]");
      if (!(trigger instanceof HTMLButtonElement) || trigger.disabled || submitting) {
        return;
      }
      const isOpen = trigger.getAttribute("aria-expanded") === "true";
      setFeedbackCategoryDropdownOpen(!isOpen);
    });

    overlay.querySelectorAll("[data-seller-feedback-category-option]").forEach((option) => {
      option.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!(option instanceof HTMLButtonElement)) {
          return;
        }
        setFeedbackCategory(option.dataset.sellerFeedbackCategoryOption || "", { dispatchChange: true });
        setFeedbackCategoryDropdownOpen(false);
        overlay.querySelector("[data-seller-feedback-category-trigger]")?.focus?.();
        clearFeedbackFieldError("category");
        setStatus("", "");
      });
    });

    overlay.querySelector("[data-seller-feedback-category-select]")?.addEventListener("change", () => {
      syncFeedbackCategoryDropdown();
      clearFeedbackFieldError("category");
    });

    document.addEventListener("click", handleFeedbackCategoryOutsideClick);
    document.addEventListener("keydown", handleFeedbackCategoryEscape);

    overlay.querySelector("[data-seller-feedback-message]")?.addEventListener("input", () => {
      syncCharCount();
      clearFeedbackFieldError("message");
    });

    const photoInput = overlay.querySelector("[data-seller-feedback-photo-input]");
    const videoInput = overlay.querySelector("[data-seller-feedback-video-input]");

    overlay.querySelector("[data-seller-feedback-photo-dropzone]")?.addEventListener("click", () => {
      if (!submitting) photoInput?.click();
    });
    overlay.querySelector("[data-seller-feedback-video-dropzone]")?.addEventListener("click", () => {
      if (!submitting) videoInput?.click();
    });
    overlay.querySelectorAll("[data-seller-feedback-photo-replace], [data-seller-feedback-photo-replace-action]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        if (!submitting) photoInput?.click();
      });
    });
    overlay.querySelectorAll("[data-seller-feedback-video-replace], [data-seller-feedback-video-replace-action]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        if (!submitting) videoInput?.click();
      });
    });

    photoInput?.addEventListener("change", (event) => {
      addFiles(event.target?.files, "image", true);
      event.target.value = "";
    });
    videoInput?.addEventListener("change", (event) => {
      addFiles(event.target?.files, "video", true);
      event.target.value = "";
    });

    overlay.querySelector("[data-seller-feedback-photo-remove]")?.addEventListener("click", (event) => {
      event.preventDefault();
      removeMediaByKind("image");
    });
    overlay.querySelector("[data-seller-feedback-video-remove]")?.addEventListener("click", (event) => {
      event.preventDefault();
      removeMediaByKind("video");
    });

    overlay.querySelector("[data-seller-feedback-photo-view]")?.addEventListener("click", (event) => {
      event.preventDefault();
      const media = photos[0];
      if (media?.previewUrl) {
        window.open(media.previewUrl, "_blank", "noopener,noreferrer");
      }
    });
    overlay.querySelector("[data-seller-feedback-video-preview]")?.addEventListener("click", (event) => {
      event.preventDefault();
      const media = videos[0];
      if (media?.previewUrl) {
        window.open(media.previewUrl, "_blank", "noopener,noreferrer");
      }
    });

    bindDropzone(overlay.querySelector("[data-seller-feedback-photo-dropzone]"), "image");
    bindDropzone(overlay.querySelector("[data-seller-feedback-video-dropzone]"), "video");

    overlay.querySelector("[data-seller-feedback-form]")?.addEventListener("submit", (event) => {
      event.preventDefault();
      void submitFeedback();
    });

    return overlay;
  }

  function bindDropzone(dropzone, kind) {
    if (!(dropzone instanceof HTMLElement)) {
      return;
    }
    ["dragenter", "dragover"].forEach((name) => dropzone.addEventListener(name, (event) => {
      event.preventDefault();
      dropzone.classList.add("is-drag-over");
    }));
    ["dragleave", "drop"].forEach((name) => dropzone.addEventListener(name, (event) => {
      event.preventDefault();
      if (name === "dragleave" && event.relatedTarget instanceof Node && dropzone.contains(event.relatedTarget)) {
        return;
      }
      dropzone.classList.remove("is-drag-over");
      if (name === "drop") {
        addFiles(event.dataTransfer?.files, kind, true);
      }
    }));
  }

  function setFeedbackCategoryDropdownOpen(isOpen) {
    const dropdown = overlay?.querySelector("[data-seller-feedback-category-dropdown]");
    const menu = overlay?.querySelector("[data-seller-feedback-category-menu]");
    const trigger = overlay?.querySelector("[data-seller-feedback-category-trigger]");
    const shouldOpen = Boolean(isOpen);
    if (menu instanceof HTMLElement) {
      menu.hidden = !shouldOpen;
    }
    if (trigger instanceof HTMLButtonElement) {
      trigger.setAttribute("aria-expanded", String(shouldOpen));
    }
    if (dropdown instanceof HTMLElement) {
      dropdown.classList.toggle("is-open", shouldOpen);
    }
  }

  function syncFeedbackCategoryDropdown() {
    const select = overlay?.querySelector("[data-seller-feedback-category-select]");
    const label = overlay?.querySelector("[data-seller-feedback-category-label]");
    const value = select instanceof HTMLSelectElement
      ? String(select.value || selectedCategory || "").trim()
      : String(selectedCategory || "").trim();
    selectedCategory = value;
    const selectedOption = select instanceof HTMLSelectElement ? select.selectedOptions?.[0] : null;
    const displayLabel = value && selectedOption
      ? selectedOption.textContent || value
      : "Select feedback category";
    if (label instanceof HTMLElement) {
      label.textContent = displayLabel;
    }
    overlay?.querySelectorAll("[data-seller-feedback-category-option]").forEach((option) => {
      if (!(option instanceof HTMLButtonElement)) {
        return;
      }
      const isSelected = option.dataset.sellerFeedbackCategoryOption === value;
      option.classList.toggle("is-selected", isSelected);
      option.setAttribute("aria-checked", isSelected ? "true" : "false");
    });
  }

  function setFeedbackCategory(value, { dispatchChange = false } = {}) {
    const nextValue = String(value || "").trim();
    selectedCategory = FEEDBACK_CATEGORIES.includes(nextValue) ? nextValue : "";
    const select = overlay?.querySelector("[data-seller-feedback-category-select]");
    if (select instanceof HTMLSelectElement) {
      select.value = selectedCategory;
      if (dispatchChange) {
        select.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }
    syncFeedbackCategoryDropdown();
  }

  function handleFeedbackCategoryOutsideClick(event) {
    if (!document.body.classList.contains("seller-feedback-modal-open")) {
      return;
    }
    const dropdown = overlay?.querySelector("[data-seller-feedback-category-dropdown]");
    if (!(dropdown instanceof HTMLElement)) {
      return;
    }
    if (event.target instanceof Node && dropdown.contains(event.target)) {
      return;
    }
    setFeedbackCategoryDropdownOpen(false);
  }

  function handleFeedbackCategoryEscape(event) {
    if (event.key !== "Escape" || !document.body.classList.contains("seller-feedback-modal-open")) {
      return;
    }
    const trigger = overlay?.querySelector("[data-seller-feedback-category-trigger]");
    if (trigger instanceof HTMLButtonElement && trigger.getAttribute("aria-expanded") === "true") {
      event.preventDefault();
      event.stopPropagation();
      setFeedbackCategoryDropdownOpen(false);
      trigger.focus();
    }
  }

  function syncStars() {
    overlay?.querySelectorAll("[data-rating]").forEach((button) => {
      const value = Number(button.dataset.rating) || 0;
      button.classList.toggle("is-active", value <= selectedRating && selectedRating > 0);
      button.setAttribute("aria-pressed", value === selectedRating ? "true" : "false");
    });
    const label = overlay?.querySelector("[data-seller-feedback-rating-label]");
    if (label instanceof HTMLElement) {
      const text = RATING_LABELS[selectedRating] || "";
      label.classList.toggle("is-set", Boolean(text));
      label.innerHTML = text
        ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>${text}`
        : "";
    }
  }

  function syncCharCount() {
    const field = overlay?.querySelector("[data-seller-feedback-message]");
    const counter = overlay?.querySelector("[data-seller-feedback-char-count]");
    if (!(field instanceof HTMLTextAreaElement) || !(counter instanceof HTMLElement)) {
      return;
    }
    counter.textContent = `${field.value.length} / 1000`;
  }

  function setFeedbackFieldError(field, message) {
    const normalizedMessage = String(message || "").trim();
    const ratingField = overlay?.querySelector("[data-seller-feedback-rating-field]");
    const ratingMessage = overlay?.querySelector("[data-seller-feedback-rating-message]");
    const ratingControl = overlay?.querySelector("[data-seller-feedback-rating-control]");
    const categoryField = overlay?.querySelector("[data-seller-feedback-category-field]");
    const categoryMessage = overlay?.querySelector("[data-seller-feedback-category-message]");
    const categoryDropdown = overlay?.querySelector("[data-seller-feedback-category-dropdown]");
    const messageField = overlay?.querySelector("[data-seller-feedback-message-field]");
    const messageValidation = overlay?.querySelector("[data-seller-feedback-message-validation]");
    const messageInput = overlay?.querySelector("[data-seller-feedback-message]");

    if (field === "rating") {
      ratingField?.classList.toggle("has-validation-error", Boolean(normalizedMessage));
      if (ratingMessage instanceof HTMLElement) {
        ratingMessage.hidden = !normalizedMessage;
        ratingMessage.textContent = normalizedMessage;
      }
      ratingControl?.setAttribute("aria-invalid", normalizedMessage ? "true" : "false");
      if (normalizedMessage) {
        ratingControl?.setAttribute("aria-describedby", "seller-feedback-rating-message");
      } else {
        ratingControl?.removeAttribute("aria-describedby");
      }
      return;
    }

    if (field === "category") {
      categoryField?.classList.toggle("has-validation-error", Boolean(normalizedMessage));
      if (categoryMessage instanceof HTMLElement) {
        categoryMessage.hidden = !normalizedMessage;
        categoryMessage.textContent = normalizedMessage;
      }
      categoryDropdown?.setAttribute("aria-invalid", normalizedMessage ? "true" : "false");
      if (normalizedMessage) {
        categoryDropdown?.setAttribute("aria-describedby", "seller-feedback-category-message");
      } else {
        categoryDropdown?.removeAttribute("aria-describedby");
      }
      return;
    }

    if (field === "message") {
      messageField?.classList.toggle("has-validation-error", Boolean(normalizedMessage));
      if (messageValidation instanceof HTMLElement) {
        messageValidation.hidden = !normalizedMessage;
        messageValidation.textContent = normalizedMessage;
      }
      if (messageInput instanceof HTMLElement) {
        messageInput.classList.toggle("seller-feedback-modal__input-invalid", Boolean(normalizedMessage));
        messageInput.setAttribute("aria-invalid", normalizedMessage ? "true" : "false");
        if (normalizedMessage) {
          messageInput.setAttribute("aria-describedby", "seller-feedback-message-validation");
        } else {
          messageInput.removeAttribute("aria-describedby");
        }
      }
    }
  }

  function clearFeedbackFieldError(field) {
    if (field === "rating" || field === "all") {
      setFeedbackFieldError("rating", "");
    }
    if (field === "category" || field === "all") {
      setFeedbackFieldError("category", "");
    }
    if (field === "message" || field === "all") {
      setFeedbackFieldError("message", "");
    }
  }

  function setStatus(message, tone) {
    const status = overlay?.querySelector("[data-seller-feedback-status]");
    if (!(status instanceof HTMLElement)) {
      return;
    }
    const text = String(message || "").trim();
    status.hidden = !text;
    status.textContent = text;
    status.classList.toggle("is-error", tone === "error");
    status.classList.toggle("is-success", tone === "success");
  }

  function addFiles(fileList, preferredKind = "", replace = false) {
    if (submitting) {
      return;
    }
    let rejectedType = false;
    let rejectedPhotoLimit = false;
    let rejectedVideoLimit = false;
    let rejectedPhotoSize = false;
    let rejectedVideoSize = false;
    Array.from(fileList || []).forEach((file) => {
      if (!(file instanceof File)) {
        return;
      }
      const kind = preferredKind || getFileKind(file);
      if (!kind) {
        rejectedType = true;
        return;
      }
      if (kind === "image") {
        if (photos.length >= maxPhotos && !replace) {
          rejectedPhotoLimit = true;
          return;
        }
        if (file.size > maxPhotoBytes) {
          rejectedPhotoSize = true;
          return;
        }
        if (replace && photos[0]?.previewUrl) {
          URL.revokeObjectURL(photos[0].previewUrl);
        }
        if (replace) {
          photos = [];
        }
        photos.push({ id: makeMediaId(), kind, file, previewUrl: URL.createObjectURL(file) });
        return;
      }
      if (videos.length >= maxVideos && !replace) {
        rejectedVideoLimit = true;
        return;
      }
      if (file.size > maxVideoBytes) {
        rejectedVideoSize = true;
        return;
      }
      if (replace && videos[0]?.previewUrl) {
        URL.revokeObjectURL(videos[0].previewUrl);
      }
      if (replace) {
        videos = [];
      }
      videos.push({ id: makeMediaId(), kind, file, previewUrl: URL.createObjectURL(file) });
    });
    renderMedia();
    const errors = [];
    if (rejectedPhotoLimit) errors.push("Only one image is allowed.");
    if (rejectedVideoLimit) errors.push("Only one video is allowed.");
    if (rejectedPhotoSize) errors.push("Image must be 10 MB or smaller.");
    if (rejectedVideoSize) errors.push("Video must be 50 MB or smaller.");
    if (rejectedType) errors.push("Only photo and video files are supported.");
    setStatus(errors.join(" "), errors.length ? "error" : "");
  }

  function removeMediaByKind(kind) {
    const list = kind === "image" ? photos : videos;
    list.forEach((media) => {
      if (media.previewUrl) URL.revokeObjectURL(media.previewUrl);
    });
    if (kind === "image") {
      photos = [];
    } else {
      videos = [];
    }
    renderMedia();
  }

  function renderPhotoMedia() {
    const slot = overlay?.querySelector("[data-seller-feedback-photo-slot]");
    const replaceHead = overlay?.querySelector("[data-seller-feedback-photo-replace]");
    const preview = overlay?.querySelector("[data-seller-feedback-photo-preview]");
    const nameNode = overlay?.querySelector("[data-seller-feedback-photo-name]");
    const sizeNode = overlay?.querySelector("[data-seller-feedback-photo-size]");
    const media = photos[0];

    if (!(slot instanceof HTMLElement)) {
      return;
    }

    slot.classList.toggle("has-file", Boolean(media));
    if (replaceHead instanceof HTMLElement) {
      replaceHead.hidden = !media;
    }

    if (!media) {
      if (preview instanceof HTMLElement) preview.innerHTML = "";
      return;
    }

    if (preview instanceof HTMLElement) {
      preview.innerHTML = "";
      const image = document.createElement("img");
      image.src = media.previewUrl;
      image.alt = media.file.name;
      image.loading = "lazy";
      image.decoding = "async";
      preview.append(image);
    }
    if (nameNode instanceof HTMLElement) {
      nameNode.textContent = media.file.name;
    }
    if (sizeNode instanceof HTMLElement) {
      const ext = getFileExtension(media.file.name);
      sizeNode.textContent = `${formatFileSize(media.file.size)}${ext ? ` · ${ext}` : ""}`;
    }
  }

  function renderVideoMedia() {
    const slot = overlay?.querySelector("[data-seller-feedback-video-slot]");
    const replaceHead = overlay?.querySelector("[data-seller-feedback-video-replace]");
    const preview = overlay?.querySelector("[data-seller-feedback-video-preview]");
    const nameNode = overlay?.querySelector("[data-seller-feedback-video-name]");
    const sizeNode = overlay?.querySelector("[data-seller-feedback-video-size]");
    const media = videos[0];

    if (!(slot instanceof HTMLElement)) {
      return;
    }

    slot.classList.toggle("has-file", Boolean(media));
    if (replaceHead instanceof HTMLElement) {
      replaceHead.hidden = !media;
    }

    if (!media) {
      return;
    }

    if (preview instanceof HTMLElement) {
      preview.innerHTML = "";
      const play = document.createElement("span");
      play.className = "seller-feedback-modal__file-play";
      play.setAttribute("aria-hidden", "true");
      play.innerHTML = '<span><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"></path></svg></span>';

      const video = document.createElement("video");
      video.src = media.previewUrl;
      video.muted = true;
      video.preload = "metadata";
      video.playsInline = true;
      preview.append(video, play);
    }
    if (nameNode instanceof HTMLElement) {
      nameNode.textContent = media.file.name;
    }
    if (sizeNode instanceof HTMLElement) {
      const ext = getFileExtension(media.file.name);
      sizeNode.textContent = `${formatFileSize(media.file.size)}${ext ? ` · ${ext}` : ""}`;
    }
  }

  function renderMedia() {
    renderPhotoMedia();
    renderVideoMedia();
  }

  function clearMedia() {
    [...photos, ...videos].forEach((media) => {
      if (media.previewUrl) URL.revokeObjectURL(media.previewUrl);
    });
    photos = [];
    videos = [];
    renderMedia();
  }

  function openModal() {
    const root = ensureOverlay();
    clearMedia();
    syncIllustrationAccentVars();
    root.querySelector("[data-seller-feedback-form]")?.reset();
    selectedRating = 0;
    selectedCategory = "";
    setFeedbackCategory("");
    setFeedbackCategoryDropdownOpen(false);
    syncFeedbackCategoryDropdown();
    submitting = false;
    syncStars();
    syncCharCount();
    clearFeedbackFieldError("all");
    setStatus("", "");
    setSubmitButtonState({ disabled: false, label: "Submit Feedback" });
    root.hidden = false;
    document.body.classList.add("seller-feedback-modal-open", "modal-open");
    window.requestAnimationFrame(() => {
      root.classList.add("is-open");
      void mountIllustrationLottie();
      root.querySelector("[data-seller-feedback-message]")?.focus();
    });
  }

  function closeModal() {
    if (!(overlay instanceof HTMLElement) || submitting) {
      return;
    }
    overlay.classList.remove("is-open");
    document.body.classList.remove("seller-feedback-modal-open", "modal-open");
    setFeedbackCategoryDropdownOpen(false);
    destroyIllustrationLottie();
    window.setTimeout(() => {
      if (overlay) {
        overlay.hidden = true;
        clearMedia();
      }
    }, 180);
  }

  async function uploadFeedbackMedia(media, auth) {
    const response = await fetch("/api/platform-feedback/uploads", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": getContentType(media.file, media.kind),
        "X-File-Name": encodeURIComponent(media.file.name || `feedback-${media.kind}`),
        "X-Feedback-Type": "seller",
        "X-GMS-Admin-ID": auth.adminId,
        "X-GMS-Admin-Session": auth.sessionToken,
      },
      body: media.file,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.attachment) {
      throw new Error(payload?.message || `Unable to upload ${media.file.name}.`);
    }
    return payload.attachment;
  }

  function setSubmitButtonState({ disabled = false, label = "Submit Feedback" } = {}) {
    const submitButton = overlay?.querySelector("[data-seller-feedback-submit]");
    if (submitButton instanceof HTMLButtonElement) {
      submitButton.disabled = Boolean(disabled);
      const labelText = submitButton.childNodes[0];
      if (labelText instanceof Text) {
        labelText.textContent = `${label} `;
      }
    }
  }

  async function resolveFeedbackAuth() {
    const session = readAdminSession();
    const adminId = getAdminId(session);
    let sessionToken = String(session?.sessionToken || "").trim();

    if (adminId && !sessionToken) {
      try {
        const response = await fetch("/api/admin-account", {
          cache: "no-store",
          headers: {
            Accept: "application/json",
            "X-GMS-Admin-ID": adminId,
          },
        });
        const payload = await response.json().catch(() => ({}));
        const refreshedToken = String(payload?.admin?.sessionToken || "").trim();
        if (response.ok && refreshedToken) {
          sessionToken = refreshedToken;
          try {
            window.sessionStorage.setItem(
              adminSessionKey,
              JSON.stringify({
                ...session,
                adminId,
                role: "admin",
                sessionToken: refreshedToken,
              }),
            );
          } catch (error) {
            // Keep going with the in-memory token for this submit.
          }
        }
      } catch (error) {
        // Fall through to the existing sign-in prompt.
      }
    }

    return { adminId, sessionToken };
  }

  async function submitFeedback() {
    if (submitting) return;
    clearFeedbackFieldError("all");
    const auth = await resolveFeedbackAuth();
    if (!auth.adminId || !auth.sessionToken) {
      setStatus("Sign in again as seller admin to send feedback.", "error");
      return;
    }
    if (!selectedRating) {
      setFeedbackFieldError("rating", "Choose a rating from 1 to 5 stars.");
      overlay?.querySelector("[data-seller-feedback-stars] [data-rating]")?.focus();
      return;
    }
    if (!selectedCategory) {
      setFeedbackFieldError("category", "Choose a feedback category.");
      overlay?.querySelector("[data-seller-feedback-category-trigger]")?.focus();
      return;
    }
    const messageField = overlay?.querySelector("[data-seller-feedback-message]");
    const message = String(messageField?.value || "").trim();
    if (!message) {
      setFeedbackFieldError("message", "Please enter your feedback.");
      messageField?.focus();
      return;
    }

    submitting = true;
    setSubmitButtonState({ disabled: true, label: "Submitting…" });
    let succeeded = false;
    try {
      const selectedMedia = [...photos, ...videos];
      const attachments = [];
      for (let index = 0; index < selectedMedia.length; index += 1) {
        setStatus(`Uploading ${index + 1} of ${selectedMedia.length} attachment${selectedMedia.length === 1 ? "" : "s"}…`, "");
        attachments.push(await uploadFeedbackMedia(selectedMedia[index], auth));
      }
      setStatus("Sending feedback…", "");
      const response = await fetch("/api/platform-feedback", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-GMS-Admin-ID": auth.adminId,
          "X-GMS-Admin-Session": auth.sessionToken,
        },
        body: JSON.stringify({
          type: "seller",
          rating: selectedRating,
          category: selectedCategory,
          message,
          attachments,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to submit feedback.");
      }
      succeeded = true;
      setStatus(payload?.message || "Feedback submitted successfully.", "success");
      window.setTimeout(() => {
        submitting = false;
        closeModal();
      }, 900);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to submit feedback.", "error");
    } finally {
      if (!succeeded) {
        submitting = false;
        setSubmitButtonState({ disabled: false, label: "Submit Feedback" });
      }
    }
  }

  document.addEventListener("click", (event) => {
    const trigger = event.target?.closest?.("[data-seller-feedback-open], [data-main-action='feedback']");
    if (!(trigger instanceof HTMLElement)) return;
    event.preventDefault();
    event.stopPropagation();
    openModal();
  }, true);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && document.body.classList.contains("seller-feedback-modal-open")) {
      closeModal();
    }
  });
  window.gmsOpenSellerFeedbackModal = openModal;
  window.addEventListener("gms:workspace-color-changed", handleIllustrationAccentThemeChange);
  window.addEventListener("gms-theme-scope-updated", handleIllustrationAccentThemeChange);
})();
