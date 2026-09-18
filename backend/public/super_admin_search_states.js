(function () {
  const assets = Object.freeze({
    loading: "/assets/super-admin-search-loading.svg",
    empty: "/assets/super-admin-search-empty.svg",
  });
  const svgNamespace = "http://www.w3.org/2000/svg";
  const visualSettings = Object.freeze({
    loading: Object.freeze({ viewBox: "0 0 75 75" }),
    empty: Object.freeze({ viewBox: "0 0 500 500" }),
  });
  const emptyArtworkAccentValues = new Set(["#29816a", "rgb(41,129,106)"]);
  const svgTemplates = new Map();
  const svgRequests = new Map();

  function loadSvgTemplate(variant) {
    if (svgTemplates.has(variant)) {
      return Promise.resolve(svgTemplates.get(variant));
    }
    if (svgRequests.has(variant)) {
      return svgRequests.get(variant);
    }

    const request = fetch(assets[variant], { credentials: "same-origin" })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Unable to load ${assets[variant]}`);
        }
        return response.text();
      })
      .then((source) => {
        const parsed = new DOMParser().parseFromString(source, "image/svg+xml");
        if (parsed.querySelector("parsererror") || parsed.documentElement.localName !== "svg") {
          throw new Error(`Invalid SVG source at ${assets[variant]}`);
        }
        const template = document.importNode(parsed.documentElement, true);
        svgTemplates.set(variant, template);
        return template;
      })
      .catch(() => null);

    svgRequests.set(variant, request);
    return request;
  }

  function applySvgThemeColors(visual, variant) {
    if (variant !== "empty") {
      return;
    }

    for (const element of visual.querySelectorAll("[style]")) {
      const fill = String(element.style.fill || "").replace(/\s+/g, "").toLowerCase();
      const stroke = String(element.style.stroke || "").replace(/\s+/g, "").toLowerCase();
      if (emptyArtworkAccentValues.has(fill)) {
        element.style.fill = "var(--accent)";
        element.dataset.superAdminSearchAccent = "fill";
      }
      if (emptyArtworkAccentValues.has(stroke)) {
        element.style.stroke = "var(--accent)";
        element.dataset.superAdminSearchAccent = "stroke";
      }
    }
  }

  function fillSvgVisual(visual, template, variant) {
    visual.replaceChildren(
      ...Array.from(template.childNodes, (node) => document.importNode(node, true)),
    );
    applySvgThemeColors(visual, variant);
    visual.dataset.svgReady = "true";
  }

  function createSvgVisual(variant) {
    const visual = document.createElementNS(svgNamespace, "svg");
    visual.classList.add("super-admin-search-state__visual");
    visual.setAttribute("viewBox", visualSettings[variant].viewBox);
    visual.setAttribute("preserveAspectRatio", "xMidYMid meet");
    visual.setAttribute("aria-hidden", "true");
    visual.setAttribute("focusable", "false");

    const template = svgTemplates.get(variant);
    if (template) {
      fillSvgVisual(visual, template, variant);
    } else {
      loadSvgTemplate(variant).then((loadedTemplate) => {
        if (loadedTemplate && visual.isConnected) {
          fillSvgVisual(visual, loadedTemplate, variant);
        }
      });
    }
    return visual;
  }

  function create(options = {}) {
    const variant = options.variant === "loading" ? "loading" : "empty";
    const state = document.createElement("div");
    state.className = `super-admin-search-state is-${variant}`;
    state.dataset.superAdminSearchState = variant;
    state.setAttribute("role", "status");
    state.setAttribute("aria-live", "polite");
    state.setAttribute("aria-busy", String(variant === "loading"));

    if (options.compact === true) {
      state.classList.add("is-compact");
    }
    for (const className of String(options.className || "").split(/\s+/).filter(Boolean)) {
      state.classList.add(className);
    }

    const visual = createSvgVisual(variant);

    const message = document.createElement("p");
    message.className = "super-admin-search-state__message";
    message.textContent = String(options.message || (variant === "loading" ? "Searching..." : "No results found."));
    state.append(visual, message);
    return state;
  }

  function render(container, options = {}) {
    if (!(container instanceof HTMLElement)) {
      return null;
    }
    const state = create(options);
    container.replaceChildren(state);
    return state;
  }

  function setInputBusy(input, isBusy) {
    if (!(input instanceof HTMLInputElement)) {
      return;
    }
    const busy = Boolean(isBusy);
    input.setAttribute("aria-busy", String(busy));
    input.closest(".product-panel-toolbar__search, .super-admin-store-type-category-modal__icon-picker, .business-type-showcase__icon-picker-panel")
      ?.classList.toggle("is-searching", busy);
  }

  window.SuperAdminSearchState = Object.freeze({
    assets,
    create,
    render,
    setInputBusy,
  });

  loadSvgTemplate("loading");
  loadSvgTemplate("empty");
})();
