(function () {
  const API_KEY = "GMS_ADMIN_SEARCH_NOT_FOUND";
  const ASSET_PATH = "/animations/admin-seller-search-empty.json?v=admin-seller-search-empty-1";
  const LOTTIE_SCRIPT_PATH = "/vendor/lottie.min.js?v=admin-search-not-found-2";
  const STYLE_ID = "gms-admin-search-not-found-styles";
  const STATE_SELECTOR = "[data-gms-admin-search-not-found]";
  const instances = new WeakMap();
  let lottieLoadPromise = null;

  if (window[API_KEY]) {
    return;
  }

  function installStyles() {
    if (document.getElementById(STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .gms-admin-search-not-found {
        box-sizing: border-box;
        display: flex !important;
        grid-column: 1 / -1;
        width: 100%;
        min-width: 0;
        min-height: clamp(280px, 44vh, 480px);
        margin: 0;
        padding: 28px 20px 34px;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        border: 0 !important;
        background: transparent !important;
        box-shadow: none !important;
        text-align: center;
      }

      .gms-admin-search-not-found__animation {
        display: block;
        width: min(240px, 64vw);
        aspect-ratio: 1;
        flex: 0 0 auto;
        overflow: hidden;
        pointer-events: none;
      }

      .gms-admin-search-not-found__animation > svg {
        display: block;
        width: 100% !important;
        height: 100% !important;
      }

      .gms-admin-search-not-found__label {
        margin: 0;
        color: var(--main-orders-ink, var(--text, #101828));
        font: 700 16px/1.35 Inter, Poppins, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        letter-spacing: 0;
      }

      .gms-admin-search-not-found__copy {
        max-width: 280px;
        margin: 2px 0 0;
        color: var(--main-orders-muted, var(--muted, #667085));
        font: 500 12px/1.45 Inter, Poppins, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        letter-spacing: 0;
      }

      .gms-admin-search-not-found.is-compact {
        min-height: 220px;
        padding: 18px 12px 24px;
      }

      .gms-admin-search-not-found.is-compact .gms-admin-search-not-found__animation {
        width: min(154px, 80%);
      }

      .gms-admin-search-not-found.is-compact .gms-admin-search-not-found__label {
        font-size: 14px;
      }

      .gms-admin-search-not-found.is-compact .gms-admin-search-not-found__copy {
        max-width: 210px;
        font-size: 11px;
      }

      .lcx-thread-list > .gms-admin-search-not-found {
        min-height: 100%;
      }

      @media (max-width: 680px) {
        .gms-admin-search-not-found {
          min-height: 300px;
          padding: 24px 14px 30px;
        }

        .gms-admin-search-not-found__animation {
          width: min(200px, 68vw);
        }
      }
    `;
    document.head.appendChild(style);
  }

  function ensureLottie() {
    if (window.lottie && typeof window.lottie.loadAnimation === "function") {
      return Promise.resolve(window.lottie);
    }
    if (lottieLoadPromise) {
      return lottieLoadPromise;
    }

    lottieLoadPromise = new Promise((resolve, reject) => {
      let script = document.querySelector(`script[src^="${LOTTIE_SCRIPT_PATH.split("?")[0]}"]`);
      const handleLoad = () => {
        if (window.lottie && typeof window.lottie.loadAnimation === "function") {
          resolve(window.lottie);
        } else {
          reject(new Error("Lottie loaded without an animation API."));
        }
      };
      const handleError = () => reject(new Error("Unable to load the Lottie player."));

      if (script) {
        script.addEventListener("load", handleLoad, { once: true });
        script.addEventListener("error", handleError, { once: true });
        window.setTimeout(() => {
          if (window.lottie && typeof window.lottie.loadAnimation === "function") {
            resolve(window.lottie);
          }
        }, 0);
        return;
      }

      script = document.createElement("script");
      script.src = LOTTIE_SCRIPT_PATH;
      script.async = true;
      script.dataset.gmsAdminSearchNotFoundLottie = "true";
      script.addEventListener("load", handleLoad, { once: true });
      script.addEventListener("error", handleError, { once: true });
      document.head.appendChild(script);
    }).catch((error) => {
      lottieLoadPromise = null;
      throw error;
    });

    return lottieLoadPromise;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function getLabel(options = {}) {
    const label = String(options.label || "").replace(/\s+/g, " ").trim();
    return label || "Not Found";
  }

  function getCopy(options = {}) {
    return String(options.copy || "").replace(/\s+/g, " ").trim();
  }

  function getStates(root) {
    if (!(root instanceof Element || root instanceof Document || root instanceof DocumentFragment)) {
      return [];
    }

    const states = [];
    if (root instanceof Element && root.matches(STATE_SELECTOR)) {
      states.push(root);
    }
    root.querySelectorAll?.(STATE_SELECTOR).forEach((state) => states.push(state));
    return states;
  }

  function mountState(state) {
    if (!(state instanceof HTMLElement) || instances.has(state)) {
      return;
    }

    const animationContainer = state.querySelector(
      "[data-gms-admin-search-not-found-animation]",
    );
    if (!(animationContainer instanceof HTMLElement)) {
      return;
    }

    ensureLottie()
      .then((lottie) => {
        if (!state.isConnected || instances.has(state)) {
          return;
        }
        const animation = lottie.loadAnimation({
          container: animationContainer,
          renderer: "svg",
          loop: true,
          autoplay: true,
          path: ASSET_PATH,
          rendererSettings: {
            preserveAspectRatio: "xMidYMid meet",
            progressiveLoad: true,
          },
        });
        instances.set(state, animation);
      })
      .catch(() => {
        // Keep the centered label visible if the local animation player cannot load.
      });
  }

  function mount(root = document) {
    getStates(root).forEach(mountState);
  }

  function destroy(root) {
    getStates(root).forEach((state) => {
      const animation = instances.get(state);
      if (animation && typeof animation.destroy === "function") {
        animation.destroy();
      }
      instances.delete(state);
    });
  }

  function create(options = {}) {
    const state = document.createElement("div");
    state.className = [
      "gms-admin-search-not-found",
      options.compact ? "is-compact" : "",
      String(options.className || "").trim(),
    ].filter(Boolean).join(" ");
    state.dataset.gmsAdminSearchNotFound = "true";
    state.setAttribute("role", "status");
    state.setAttribute("aria-live", "polite");

    const animation = document.createElement("div");
    animation.className = "gms-admin-search-not-found__animation";
    animation.dataset.gmsAdminSearchNotFoundAnimation = "true";
    animation.setAttribute("aria-hidden", "true");

    const label = document.createElement("p");
    label.className = "gms-admin-search-not-found__label";
    label.textContent = getLabel(options);

    state.append(animation, label);
    const copy = getCopy(options);
    if (copy) {
      const copyEl = document.createElement("p");
      copyEl.className = "gms-admin-search-not-found__copy";
      copyEl.textContent = copy;
      state.appendChild(copyEl);
    }
    window.queueMicrotask(() => mountState(state));
    return state;
  }

  function markup(options = {}) {
    const compactClass = options.compact ? " is-compact" : "";
    const extraClass = String(options.className || "").trim();
    const copy = getCopy(options);
    return `
      <div
        class="gms-admin-search-not-found${compactClass}${extraClass ? ` ${extraClass}` : ""}"
        data-gms-admin-search-not-found
        role="status"
        aria-live="polite"
      >
        <div
          class="gms-admin-search-not-found__animation"
          data-gms-admin-search-not-found-animation
          aria-hidden="true"
        ></div>
        <p class="gms-admin-search-not-found__label">${escapeHtml(getLabel(options))}</p>
        ${copy ? `<p class="gms-admin-search-not-found__copy">${escapeHtml(copy)}</p>` : ""}
      </div>
    `;
  }

  function replace(container, options = {}) {
    if (!(container instanceof Element)) {
      return null;
    }
    destroy(container);
    const state = create(options);
    container.replaceChildren(state);
    return state;
  }

  installStyles();
  window[API_KEY] = Object.freeze({
    assetPath: ASSET_PATH,
    create,
    destroy,
    markup,
    mount,
    replace,
  });

  const observer = new MutationObserver((records) => {
    records.forEach((record) => {
      record.removedNodes.forEach((node) => destroy(node));
      record.addedNodes.forEach((node) => mount(node));
    });
  });

  function start() {
    mount(document);
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
}());
