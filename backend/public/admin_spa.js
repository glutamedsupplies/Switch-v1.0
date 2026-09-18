(() => {
  "use strict";

  if (!document.documentElement.hasAttribute("data-admin-spa-shell")) {
    return;
  }

  const frame = document.querySelector("[data-admin-spa-frame]");
  const content = document.querySelector("[data-admin-spa-content]");
  const loadingState = document.querySelector("[data-admin-spa-loading]");
  const errorState = document.querySelector("[data-admin-spa-error]");
  const retryButton = document.querySelector("[data-admin-spa-retry]");
  const navigationBackdrop = document.querySelector("[data-admin-spa-nav-backdrop]");

  if (!(frame instanceof HTMLIFrameElement) || !content) {
    return;
  }

  const frameQueryKey = "__gms_admin_spa_frame";
  const fallbackRouteQueryKey = "route";
  const frameStylesheetHref = "/admin_spa.css?v=admin-seller-shell-poppins-4";
  const adminFontsStylesheetHref = "/admin-fonts.css?v=admin-seller-super-admin-font-2";
  const navigationCollapsedStorageKey = "gms-admin-spa-navigation-collapsed";
  const desktopNavigationMedia = window.matchMedia("(min-width: 861px)");
  const sidebarMotionMs = 240;
  const routeDefinitions = Object.freeze([
    { path: "/admin_dashboard.html", key: "dashboard", title: "Store Overview" },
    { path: "/concern.html", key: "concern", title: "Concern" },
    { path: "/product_panel.html", key: "products", title: "Products" },
    { path: "/edit_products.html", key: "products", title: "Edit Listing" },
    { path: "/stock.html", key: "stock", title: "Inventory" },
    { path: "/payment_partners.html", key: "payment-partners", title: "Payment Partners" },
    { path: "/delivery_partners.html", key: "delivery-partners", title: "Delivery Partners" },
    { path: "/employee_data.html", canonicalPath: "/Employee_data.html", key: "employee-data", title: "Employee Data" },
    { path: "/register.html", key: "register", title: "Register" },
    { path: "/face_verfication.html", key: "register", title: "Face Verification" },
    { path: "/packing_dashboard.html", key: "packing-dashboard", title: "Packing" },
    { path: "/traking.html", key: "packing-dashboard", title: "Tracking" },
  ]);
  const routeByPath = new Map(
    routeDefinitions.map((route) => [route.path.toLowerCase(), route]),
  );

  function getRouteKey(route) {
    return route?.definition?.key || "dashboard";
  }

  function getRouteTitle(route) {
    return route?.definition?.title || "Store Overview";
  }

  const promotedTopLevelPaths = new Set([
    "/main.html",
    "/login.html",
    "/root_login.html",
    "/employee_access_pending.html",
  ]);

  let currentRoute = null;
  let loadSequence = 0;
  let loadFailureTimer = 0;

  function getRouteDefinition(pathname) {
    return routeByPath.get(String(pathname || "").trim().toLowerCase()) || null;
  }

  function normalizeRouteTarget(rawTarget) {
    let url;
    try {
      url = new URL(String(rawTarget || ""), window.location.origin);
    } catch (error) {
      return null;
    }

    if (url.origin !== window.location.origin) {
      return null;
    }

    const definition = getRouteDefinition(url.pathname);
    if (!definition) {
      return null;
    }

    url.pathname = definition.canonicalPath || definition.path;
    url.searchParams.delete(frameQueryKey);
    return { definition, url };
  }

  function getPublicRouteValue(url) {
    return `${url.pathname}${url.search}${url.hash}`;
  }

  function getComparableRouteValue(url) {
    const comparableUrl = new URL(url.href);
    comparableUrl.searchParams.delete(frameQueryKey);
    return getPublicRouteValue(comparableUrl);
  }

  function getFrameRouteValue(url) {
    const frameUrl = new URL(url.href);
    frameUrl.searchParams.set(frameQueryKey, "1");
    return getPublicRouteValue(frameUrl);
  }

  function getInitialRoute() {
    return normalizeRouteTarget(window.location.href)
      || normalizeRouteTarget("/admin_dashboard.html");
  }

  function setLoadingState(isLoading) {
    content.setAttribute("aria-busy", isLoading ? "true" : "false");
    content.classList.toggle("is-loading", isLoading);
    frame.classList.toggle("is-ready", !isLoading);
    if (loadingState) {
      loadingState.hidden = !isLoading;
    }
    if (isLoading && errorState) {
      errorState.hidden = true;
    }
  }

  function showLoadError() {
    window.clearTimeout(loadFailureTimer);
    content.setAttribute("aria-busy", "false");
    content.classList.remove("is-loading");
    frame.classList.remove("is-ready");
    if (loadingState) {
      loadingState.hidden = true;
    }
    if (errorState) {
      errorState.hidden = false;
    }
  }

  function closeMobileNavigation() {
    if (desktopNavigationMedia.matches) {
      return;
    }
    document.body.classList.remove("admin-spa-nav-open");
    if (navigationBackdrop) {
      navigationBackdrop.hidden = true;
    }
  }

  function ensureSidebarMotionStyles() {
    if (document.getElementById("admin-spa-sidebar-motion")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "admin-spa-sidebar-motion";
    // Injected after theme.js so reduced-motion cannot zero-out drawer width motion.
    style.textContent = `
      @media (min-width: 861px) {
        html.gms-reduced-motion body.admin-spa-host.admin-super-sidebar-enabled .admin-spa-sidebar,
        body.admin-spa-host.admin-super-sidebar-enabled .admin-spa-sidebar {
          transition-property: width, max-width, padding, box-shadow !important;
          transition-duration: ${sidebarMotionMs}ms, ${sidebarMotionMs}ms, ${sidebarMotionMs}ms, 180ms !important;
          transition-timing-function: cubic-bezier(0.22, 1, 0.36, 1) !important;
          transition-delay: 0ms !important;
        }

        html.gms-reduced-motion body.admin-spa-host.admin-super-sidebar-enabled .admin-spa-sidebar .dashboard-nav__label,
        html.gms-reduced-motion body.admin-spa-host.admin-super-sidebar-enabled .admin-spa-sidebar .super-admin-drawer-header__copy,
        body.admin-spa-host.admin-super-sidebar-enabled .admin-spa-sidebar .dashboard-nav__label,
        body.admin-spa-host.admin-super-sidebar-enabled .admin-spa-sidebar .super-admin-drawer-header__copy {
          transition-property: opacity, transform !important;
          transition-duration: 180ms, 200ms !important;
          transition-timing-function: ease, cubic-bezier(0.22, 1, 0.36, 1) !important;
          transition-delay: 0ms !important;
        }
      }

      @media (max-width: 860px) {
        body.admin-spa-host.admin-super-sidebar-enabled .admin-spa-sidebar {
          transition-property: transform, opacity, visibility, box-shadow !important;
          transition-duration: 220ms, 180ms, 0ms, 180ms !important;
          transition-timing-function: cubic-bezier(0.22, 1, 0.36, 1) !important;
          transition-delay: 0ms !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function setDesktopNavigationCollapsed(isCollapsed) {
    const isDesktop = desktopNavigationMedia.matches;
    const shouldCollapse = Boolean(isCollapsed) && isDesktop;
    const shouldOpen = isDesktop && !shouldCollapse;

    document.body.classList.toggle("admin-spa-nav-collapsed", shouldCollapse);
    // Mirror Super Admin: positive open class drives the 76px → 250px drawer motion.
    document.body.classList.toggle("admin-spa-nav-open", shouldOpen);

    try {
      window.localStorage.setItem(
        navigationCollapsedStorageKey,
        shouldCollapse ? "true" : "false",
      );
    } catch (error) {
      // Navigation remains usable when storage is unavailable.
    }
  }

  function toggleNavigation() {
    if (desktopNavigationMedia.matches) {
      const isOpen = document.body.classList.contains("admin-spa-nav-open");
      setDesktopNavigationCollapsed(isOpen);
      return;
    }

    const isOpen = !document.body.classList.contains("admin-spa-nav-open");
    document.body.classList.remove("admin-spa-nav-collapsed");
    document.body.classList.toggle("admin-spa-nav-open", isOpen);
    if (navigationBackdrop) {
      navigationBackdrop.hidden = !isOpen;
    }
  }

  function restoreNavigationPreference() {
    let shouldCollapse = true;
    try {
      const storedPreference = window.localStorage.getItem(navigationCollapsedStorageKey);
      shouldCollapse = storedPreference === null ? true : storedPreference === "true";
    } catch (error) {
      shouldCollapse = true;
    }
    setDesktopNavigationCollapsed(shouldCollapse);
  }

  function syncNavigationViewportMode() {
    const isMobileViewport = !desktopNavigationMedia.matches;
    document.body.classList.toggle("admin-spa-mobile", isMobileViewport);
    try {
      frame.contentDocument?.documentElement.classList.toggle(
        "admin-spa-frame-mobile",
        isMobileViewport,
      );
    } catch (error) {
      // The child document may be between navigations.
    }
  }

  function updateNavigationState(route) {
    const activeKey = getRouteKey(route);
    if (typeof window.gmsAdminNavigation?.setActivePage === "function") {
      window.gmsAdminNavigation.setActivePage(activeKey);
      return;
    }

    document.querySelectorAll(".dashboard-nav__item[data-stock-nav-item]").forEach((item) => {
      const isActive = item.dataset.stockNavItem === activeKey;
      item.classList.toggle("is-active", isActive);
      if (isActive) {
        item.setAttribute("aria-current", "page");
      } else {
        item.removeAttribute("aria-current");
      }
    });
  }

  function updateDocumentTitle(route, childTitle = "") {
    const normalizedChildTitle = String(childTitle || "").trim();
    const routeTitle = getRouteTitle(route);
    document.title = normalizedChildTitle || `${routeTitle} | Switch`;
    frame.title = `${routeTitle} content`;
  }

  function dispatchRouteChange(route) {
    window.dispatchEvent(new CustomEvent("gms-admin-spa-route-change", {
      detail: {
        key: getRouteKey(route),
        path: getPublicRouteValue(route.url),
      },
    }));
  }

  function navigate(rawTarget, options = {}) {
    const route = normalizeRouteTarget(rawTarget);
    if (!route) {
      return false;
    }

    const nextRouteValue = getPublicRouteValue(route.url);
    const currentRouteValue = currentRoute ? getPublicRouteValue(currentRoute.url) : "";
    const shouldReload = options.force === true || nextRouteValue !== currentRouteValue;
    const historyMode = options.history || "push";

    currentRoute = route;
    closeMobileNavigation();
    updateNavigationState(route);
    updateDocumentTitle(route);

    if (historyMode === "replace") {
      window.history.replaceState({ adminSpa: true, route: nextRouteValue }, "", nextRouteValue);
    } else if (historyMode === "push" && nextRouteValue !== getComparableRouteValue(new URL(window.location.href))) {
      window.history.pushState({ adminSpa: true, route: nextRouteValue }, "", nextRouteValue);
    }

    if (!shouldReload) {
      return true;
    }

    loadSequence += 1;
    const activeLoadSequence = loadSequence;
    setLoadingState(true);
    window.clearTimeout(loadFailureTimer);
    loadFailureTimer = window.setTimeout(() => {
      if (activeLoadSequence === loadSequence && !frame.classList.contains("is-ready")) {
        showLoadError();
      }
    }, 15000);
    const frameRouteValue = getFrameRouteValue(route.url);
    if (frame.dataset.adminSpaLoaded === "true" && frame.contentWindow) {
      frame.contentWindow.location.replace(frameRouteValue);
    } else {
      frame.src = frameRouteValue;
    }
    dispatchRouteChange(route);
    return true;
  }

  function isModifiedActivation(event) {
    return event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
  }

  function getAnchorFromEvent(event) {
    const target = event.target;
    return target instanceof Element ? target.closest("a[href]") : null;
  }

  function handleRouteAnchorActivation(event, anchor) {
    const rawHref = String(anchor?.getAttribute?.("href") || "").trim();
    if (
      !anchor
      || !rawHref
      || rawHref.startsWith("#")
      || /^javascript:/i.test(rawHref)
      || isModifiedActivation(event)
      || anchor.hasAttribute("download")
      || String(anchor.target || "").toLowerCase() === "_blank"
    ) {
      return false;
    }

    const route = normalizeRouteTarget(anchor.href);
    if (!route) {
      return false;
    }

    event.preventDefault();
    navigate(route.url.href);
    return true;
  }

  function promoteChildNavigation(url) {
    const target = new URL(url.href);
    target.searchParams.delete(frameQueryKey);
    window.location.assign(getPublicRouteValue(target));
  }

  function installFrameStyles(frameDocument) {
    frameDocument.documentElement.classList.add("admin-spa-frame-document");
    frameDocument.documentElement.classList.toggle(
      "admin-spa-frame-mobile",
      !desktopNavigationMedia.matches,
    );
    frameDocument.body?.classList.add("admin-spa-frame-document");

    let fontsStylesheet = frameDocument.querySelector("link[data-admin-fonts-styles]");
    if (!(fontsStylesheet instanceof HTMLLinkElement)) {
      fontsStylesheet = frameDocument.createElement("link");
      fontsStylesheet.rel = "stylesheet";
      fontsStylesheet.href = adminFontsStylesheetHref;
      fontsStylesheet.dataset.adminFontsStyles = "true";
      frameDocument.head?.insertBefore(fontsStylesheet, frameDocument.head.firstChild);
    }

    let stylesheet = frameDocument.querySelector("link[data-admin-spa-frame-styles]");
    if (stylesheet instanceof HTMLLinkElement) {
      return Promise.resolve();
    }

    stylesheet = frameDocument.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = frameStylesheetHref;
    stylesheet.dataset.adminSpaFrameStyles = "true";

    return new Promise((resolve) => {
      let resolved = false;
      const finish = () => {
        if (resolved) {
          return;
        }
        resolved = true;
        resolve();
      };
      stylesheet.addEventListener("load", finish, { once: true });
      stylesheet.addEventListener("error", finish, { once: true });
      frameDocument.head?.appendChild(stylesheet);
      window.setTimeout(finish, 500);
    });
  }

  function installChildRouteBridge(frameDocument) {
    frameDocument.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof frame.contentWindow.Element)) {
        return;
      }

      const navigationToggle = target.closest(
        "[data-admin-super-header-nav-toggle], [data-dashboard-sidebar-toggle]",
      );
      if (navigationToggle) {
        event.preventDefault();
        event.stopImmediatePropagation();
        toggleNavigation();
        return;
      }

      const anchor = target.closest("a[href]");
      handleRouteAnchorActivation(event, anchor);
    }, true);
  }

  async function handleFrameLoad() {
    const activeLoadSequence = loadSequence;
    let frameWindow;
    let frameDocument;
    let loadedUrl;

    try {
      frameWindow = frame.contentWindow;
      frameDocument = frame.contentDocument;
      loadedUrl = new URL(frameWindow.location.href);
    } catch (error) {
      showLoadError();
      return;
    }

    if (!frameDocument || loadedUrl.href === "about:blank") {
      return;
    }

    frame.dataset.adminSpaLoaded = "true";

    const loadedRoute = normalizeRouteTarget(loadedUrl.href);
    if (!loadedRoute) {
      if (promotedTopLevelPaths.has(loadedUrl.pathname.toLowerCase())) {
        promoteChildNavigation(loadedUrl);
        return;
      }
      showLoadError();
      return;
    }

    const cleanChildRoute = getPublicRouteValue(loadedRoute.url);
    try {
      frameWindow.history.replaceState(frameWindow.history.state, "", cleanChildRoute);
    } catch (error) {
      // The route still works if the child history cannot be cleaned.
    }

    const hasDashboardContent = Boolean(
      frameDocument.querySelector(".dashboard-content, [data-product-editor-page], main"),
    );
    if (!hasDashboardContent) {
      showLoadError();
      return;
    }

    currentRoute = loadedRoute;
    const parentRouteValue = getComparableRouteValue(new URL(window.location.href));
    if (cleanChildRoute !== parentRouteValue) {
      window.history.replaceState({ adminSpa: true, route: cleanChildRoute }, "", cleanChildRoute);
    }

    updateNavigationState(loadedRoute);
    updateDocumentTitle(loadedRoute, frameDocument.title);
    installChildRouteBridge(frameDocument);
    await installFrameStyles(frameDocument);

    if (activeLoadSequence !== loadSequence) {
      return;
    }

    window.clearTimeout(loadFailureTimer);
    window.requestAnimationFrame(() => {
      if (activeLoadSequence !== loadSequence) {
        return;
      }
      setLoadingState(false);
      frame.focus({ preventScroll: true });
    });
  }

  document.addEventListener("click", (event) => {
    const anchor = getAnchorFromEvent(event);
    handleRouteAnchorActivation(event, anchor);
  }, true);

  frame.addEventListener("load", () => {
    void handleFrameLoad();
  });

  retryButton?.addEventListener("click", () => {
    if (currentRoute) {
      navigate(currentRoute.url.href, { history: "none", force: true });
    }
  });

  navigationBackdrop?.addEventListener("click", closeMobileNavigation);

  window.addEventListener("popstate", () => {
    navigate(window.location.href, { history: "none", force: true });
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMobileNavigation();
    }
  });

  desktopNavigationMedia.addEventListener("change", () => {
    closeMobileNavigation();
    syncNavigationViewportMode();
    restoreNavigationPreference();
  });

  ensureSidebarMotionStyles();
  syncNavigationViewportMode();
  restoreNavigationPreference();
  const initialRoute = getInitialRoute();
  if (initialRoute) {
    navigate(initialRoute.url.href, { history: "replace", force: true });
  }
})();
