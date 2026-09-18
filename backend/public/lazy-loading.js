(() => {
  "use strict";

  const lazyRootMargin = "640px 0px";
  const lazyMediaSelector = [
    "img",
    "iframe",
    "video",
    "[data-src]",
    "[data-srcset]",
    "[data-bg]",
    "[data-lazy-background]",
  ].join(",");
  const eagerSelector = [
    "[data-lazy-eager]",
    "[data-no-lazy]",
    '[loading="eager"]',
    '[fetchpriority="high"]',
    ".dashboard-sidebar__logo",
    ".super-admin-drawer-header__logo",
    ".admin-signup-brand",
    ".admin-signup-public-brand",
    ".login-brand",
    ".brand",
  ].join(",");
  const transparentPixel =
    "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
  const transparentContentImageClass =
    "gms-admin-content-image--transparent";
  const adminContentImageSelector = [
    ".dashboard-content img",
    "[data-main-content] img",
    ".product-editor-shell img",
    ".product-composer-modal img",
    ".product-gallery-modal img",
    ".product-model-scan-modal img",
    ".android-preview-stage img",
    ".product-image img",
    ".product-insight-shell img",
    ".stock-monitor-shell img",
    ".packing-dashboard-shell img",
    ".super-admin-content img",
    ".super-admin-product-detail-modal img",
    ".super-admin-product-image-upload-modal img",
    ".super-admin-image-zoom-modal img",
    ".super-admin-reject-evidence-modal img",
    ".super-admin-product-delete-modal img",
    ".super-admin-store-type-modal img",
  ].join(",");

  const supportsNativeImageLazy =
    "HTMLImageElement" in window && "loading" in HTMLImageElement.prototype;
  const supportsNativeIframeLazy =
    "HTMLIFrameElement" in window && "loading" in HTMLIFrameElement.prototype;
  const preparedElements = new WeakSet();
  const pendingElements = new WeakSet();
  const pendingTransparencyChecks = new WeakSet();
  const transparencyBySource = new Map();
  let observer = null;

  function isElement(node) {
    return node instanceof Element;
  }

  function isDeferredMedia(element) {
    return Boolean(
      element?.dataset?.src ||
        element?.dataset?.srcset ||
        element?.dataset?.bg ||
        element?.dataset?.lazyBackground,
    );
  }

  function isEagerMedia(element) {
    return Boolean(element?.closest?.(eagerSelector));
  }

  function isInlineOrLocalUrl(value) {
    return /^(?:data|blob|about):/i.test(String(value || "").trim());
  }

  function setLowFetchPriority(element) {
    if (
      !element.hasAttribute("fetchpriority") &&
      !isEagerMedia(element)
    ) {
      element.setAttribute("fetchpriority", "low");
    }
  }

  function setNativeLazy(element, supportsNativeLazy) {
    if (
      supportsNativeLazy &&
      !element.hasAttribute("loading") &&
      !isEagerMedia(element)
    ) {
      element.setAttribute("loading", "lazy");
    }
  }

  function isAdminContentImage(image) {
    return (
      image instanceof HTMLImageElement &&
      !image.matches('[aria-hidden="true"], [data-no-transparency-grid]') &&
      image.matches(adminContentImageSelector)
    );
  }

  function applyImageTransparencyState(image, source, hasTransparency) {
    const activeSource = String(image.currentSrc || image.src || "").trim();
    if (!activeSource || activeSource !== source) {
      return;
    }

    image.classList.toggle(
      transparentContentImageClass,
      hasTransparency,
    );
    image.dataset.imageBackground = hasTransparency
      ? "transparent"
      : "opaque";
  }

  function inspectImageTransparency(image) {
    if (
      !isAdminContentImage(image) ||
      !image.complete ||
      image.naturalWidth <= 0 ||
      image.naturalHeight <= 0
    ) {
      return;
    }

    const source = String(image.currentSrc || image.src || "").trim();
    if (
      !source ||
      source === transparentPixel ||
      image.dataset?.src ||
      pendingTransparencyChecks.has(image)
    ) {
      return;
    }

    if (transparencyBySource.has(source)) {
      applyImageTransparencyState(
        image,
        source,
        transparencyBySource.get(source),
      );
      return;
    }

    pendingTransparencyChecks.add(image);
    window.setTimeout(() => {
      try {
        const maxSampleSide = 64;
        const sampleScale = Math.min(
          1,
          maxSampleSide / Math.max(image.naturalWidth, image.naturalHeight),
        );
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.naturalWidth * sampleScale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * sampleScale));
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) {
          return;
        }

        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const pixels = context.getImageData(
          0,
          0,
          canvas.width,
          canvas.height,
        ).data;
        let hasTransparency = false;
        for (let index = 3; index < pixels.length; index += 4) {
          if (pixels[index] < 250) {
            hasTransparency = true;
            break;
          }
        }

        transparencyBySource.set(source, hasTransparency);
        applyImageTransparencyState(image, source, hasTransparency);
      } catch (error) {
        image.classList.remove(transparentContentImageClass);
        delete image.dataset.imageBackground;
      } finally {
        pendingTransparencyChecks.delete(image);
      }
    }, 0);
  }

  function prepareImageTransparency(image) {
    if (!isAdminContentImage(image)) {
      image.classList.remove(transparentContentImageClass);
      delete image.dataset.imageBackground;
      return;
    }

    if (image.complete && image.naturalWidth > 0) {
      inspectImageTransparency(image);
      return;
    }

    image.addEventListener(
      "load",
      () => inspectImageTransparency(image),
      { once: true },
    );
  }

  function loadDeferredMedia(element) {
    if (!isElement(element)) {
      return;
    }

    const { src, srcset, bg, lazyBackground } = element.dataset || {};
    if (srcset) {
      element.setAttribute("srcset", srcset);
      delete element.dataset.srcset;
    }
    if (src) {
      element.setAttribute("src", src);
      delete element.dataset.src;
    }
    if (bg || lazyBackground) {
      const backgroundUrl = String(bg || lazyBackground || "").replace(/"/g, '\\"');
      element.style.backgroundImage = `url("${backgroundUrl}")`;
      delete element.dataset.bg;
      delete element.dataset.lazyBackground;
    }

    if (element instanceof HTMLVideoElement) {
      element.querySelectorAll("source[data-src], source[data-srcset]").forEach((source) => {
        if (source.dataset.src) {
          source.setAttribute("src", source.dataset.src);
          delete source.dataset.src;
        }
        if (source.dataset.srcset) {
          source.setAttribute("srcset", source.dataset.srcset);
          delete source.dataset.srcset;
        }
      });
      element.load();
    }

    pendingElements.delete(element);
    element.dispatchEvent(new CustomEvent("gms:lazyloaded", { bubbles: true }));
  }

  function observeDeferredMedia(element) {
    if (!isDeferredMedia(element)) {
      return;
    }
    if (!observer) {
      loadDeferredMedia(element);
      return;
    }
    if (!pendingElements.has(element)) {
      pendingElements.add(element);
      observer.observe(element);
    }
  }

  function prepareImage(image) {
    if (!(image instanceof HTMLImageElement)) {
      return;
    }

    prepareImageTransparency(image);

    if (!image.hasAttribute("decoding")) {
      image.setAttribute("decoding", "async");
    }

    const currentSrc = image.getAttribute("src") || "";
    if (isEagerMedia(image) || isInlineOrLocalUrl(currentSrc)) {
      return;
    }

    if (!currentSrc && image.dataset?.src) {
      image.setAttribute("src", transparentPixel);
    }

    if (currentSrc || image.dataset?.src || image.dataset?.srcset) {
      setNativeLazy(image, supportsNativeImageLazy);
      setLowFetchPriority(image);
    }

    observeDeferredMedia(image);
  }

  function prepareIframe(iframe) {
    if (!(iframe instanceof HTMLIFrameElement)) {
      return;
    }

    const currentSrc = iframe.getAttribute("src") || "";
    if (isEagerMedia(iframe) || isInlineOrLocalUrl(currentSrc)) {
      return;
    }

    if (currentSrc || iframe.dataset?.src) {
      setNativeLazy(iframe, supportsNativeIframeLazy);
      setLowFetchPriority(iframe);
    }

    observeDeferredMedia(iframe);
  }

  function prepareVideo(video) {
    if (!(video instanceof HTMLVideoElement) || isEagerMedia(video)) {
      return;
    }
    if (!video.hasAttribute("autoplay") && !video.hasAttribute("preload")) {
      video.setAttribute("preload", "metadata");
    }
    observeDeferredMedia(video);
  }

  function prepareElement(element) {
    if (!isElement(element) || preparedElements.has(element)) {
      return;
    }

    preparedElements.add(element);
    if (element instanceof HTMLImageElement) {
      prepareImage(element);
      return;
    }
    if (element instanceof HTMLIFrameElement) {
      prepareIframe(element);
      return;
    }
    if (element instanceof HTMLVideoElement) {
      prepareVideo(element);
      return;
    }
    observeDeferredMedia(element);
  }

  function scan(root = document) {
    const scope = root?.querySelectorAll ? root : document;
    if (isElement(scope) && scope.matches(lazyMediaSelector)) {
      prepareElement(scope);
    }
    scope.querySelectorAll?.(lazyMediaSelector).forEach(prepareElement);
  }

  if ("IntersectionObserver" in window) {
    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting && entry.intersectionRatio <= 0) {
          return;
        }
        observer.unobserve(entry.target);
        loadDeferredMedia(entry.target);
      });
    }, { rootMargin: lazyRootMargin });
  }

  const mutationObserver = new MutationObserver((records) => {
    records.forEach((record) => {
      if (record.type === "attributes" && isElement(record.target)) {
        preparedElements.delete(record.target);
        scan(record.target);
        return;
      }
      record.addedNodes.forEach((node) => {
        if (isElement(node)) {
          scan(node);
        }
      });
    });
  });

  function start() {
    scan(document);
    mutationObserver.observe(document.documentElement, {
      attributeFilter: [
        "src",
        "srcset",
        "data-src",
        "data-srcset",
        "data-bg",
        "data-lazy-background",
      ],
      attributes: true,
      childList: true,
      subtree: true,
    });
  }

  if (document.documentElement) {
    start();
  } else {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  }

  window.GMSLazyLoad = Object.freeze({
    load: loadDeferredMedia,
    scan,
  });
})();
