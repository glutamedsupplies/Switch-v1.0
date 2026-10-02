(function () {
  "use strict";

  const artworkSrc = "/assets/super-admin-company-empty-3d.webp";
  const loadingMessagePattern = /^(loading|searching|refreshing|checking|fetching|syncing|preparing)\b/i;
  const filteredMessagePattern = /\b(match|matching|search|filter|filtered|found for)\b/i;
  const errorMessagePattern = /\b(unable|couldn['’]?t|failed|error)\b/i;

  const configurations = Object.freeze([
    {
      key: "business-types",
      selector: ".super-admin-store-type-list:not(.super-admin-platform-list) > .empty-state",
      title: "No business types yet",
      description: "Create a business type to organize its categories and connect catalog activity across the marketplace.",
      actionSelector: "#open-store-type-modal-button",
      actionLabel: "Add business type",
      actionIcon: "plus",
    },
    {
      key: "platforms",
      selector: ".super-admin-platform-list > .empty-state",
      title: "No platforms yet",
      description: "Add Shop, Food, Hotels, Groceries, or a custom platform to make it available in the app.",
      actionSelector: "#open-platform-modal-button",
      actionLabel: "Add platform",
      actionIcon: "plus",
    },
    {
      key: "trending-searches",
      selector: ".super-admin-trending-list > .super-admin-trending-empty-cell",
      title: "No trending searches yet",
      description: "Organic search rankings will appear here as buyers start searching across the marketplace.",
    },
    {
      key: "vouchers",
      selector: ".sa-vouchers-list > .sa-vouchers-empty-cell",
      title: "No vouchers yet",
      description: "Create a platform voucher to give buyers a new offer they can use at checkout.",
      actionSelector: "[data-super-admin-voucher-add]",
      actionLabel: "Create voucher",
      actionIcon: "plus",
    },
    {
      key: "flash-deals",
      selector: ".sa-flash-deals-list > .sa-flash-deals-empty-cell",
      title: "No Flash Deals yet",
      description: "Seller Flash Deal campaigns will appear here as soon as they are created and scheduled.",
    },
    {
      key: "product-requests",
      selector: "[data-super-admin-product-request-empty]",
      title: "No products in review",
      description: "New seller listing requests will appear here when they are ready for Super Admin review.",
    },
    {
      key: "payment-partners",
      selector: "[data-super-admin-payment-partners-list] > .partner-data-list-empty",
      title: "No payment partners yet",
      description: "Sync PayMongo to load the payment methods your account can accept at checkout.",
      actionSelector: "[data-super-admin-paymongo-sync]",
      actionLabel: "Sync PayMongo",
      actionIcon: "plus",
    },
    {
      key: "delivery-partners",
      selector: "[data-super-admin-delivery-partners-list] > .partner-data-list-empty",
      title: "No delivery partners yet",
      description: "Add a delivery provider for seller fulfillment, shipping labels, and waybills.",
      actionSelector: "[data-super-admin-delivery-partner-add]",
      actionLabel: "Add delivery partner",
      actionIcon: "plus",
    },
    {
      key: "ai-integrations",
      selector: ".super-admin-ai-data-list > .super-admin-ai-data-list__empty",
      title: "No AI provider connected yet",
      description: "Connect an AI provider to configure chat, auto-reply, and photo enhancement features.",
      actionSelector: "[data-ai-integration-enter-key]",
      actionLabel: "Enter API key",
      actionIcon: "key",
    },
    {
      key: "seller-feedback",
      selector: "[data-platform-feedback-list=\"seller\"] > .buyer-data-empty",
      title: "No seller feedback yet",
      description: "Seller ratings, concerns, and supporting media will appear here when feedback is submitted.",
    },
    {
      key: "user-feedback",
      selector: "[data-platform-feedback-list=\"user\"] > .buyer-data-empty",
      title: "No user feedback yet",
      description: "Buyer ratings, concerns, and supporting media will appear here when feedback is submitted.",
    },
    {
      key: "user-data",
      selector: ".sa-buyer-showcase-list > .buyer-data-list-empty",
      title: "No registered buyers yet",
      description: "New buyer accounts will appear here after they finish registration in the app.",
    },
    {
      key: "settings",
      selector: "[data-platform-setting-empty]",
      title: "No settings found",
      description: "Try another keyword to find the platform control or setting you need.",
    },
  ]);

  const configurationsByKey = new Map(configurations.map((configuration) => [configuration.key, configuration]));
  let reconciliationFrame = 0;

  function createActionIcon(kind) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");

    const firstPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    if (kind === "key") {
      firstPath.setAttribute("d", "M21 2 9.6 13.4");
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", "6.5");
      circle.setAttribute("cy", "16.5");
      circle.setAttribute("r", "4.5");
      const secondPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
      secondPath.setAttribute("d", "m15 8 2 2 2-2-2-2");
      svg.append(firstPath, circle, secondPath);
    } else {
      firstPath.setAttribute("d", "M12 5v14M5 12h14");
      svg.append(firstPath);
    }
    return svg;
  }

  function normalizeMessage(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function readCurrentMessage(element) {
    if (element.querySelector(":scope > .super-admin-company-empty__card")) {
      return normalizeMessage(element.dataset.saUniversalEmptyMessage);
    }
    return normalizeMessage(
      element.querySelector(".super-admin-search-state__message")?.textContent || element.textContent,
    );
  }

  function getSurface(element) {
    return element.closest(
      ".buyer-data-table-card, .buyer-data-directory, .super-admin-ai-integration__content, [data-super-admin-section]",
    );
  }

  function clearEmptyMarkers(element) {
    element.classList.remove("super-admin-company-empty", "sa-universal-empty-state");
    delete element.dataset.saUniversalEmptyKey;
    delete element.dataset.saUniversalEmptyMessage;
  }

  function removeStaleMarkers() {
    document.querySelectorAll(".has-sa-universal-empty").forEach((element) => {
      if (!element.querySelector(":scope > .sa-universal-empty-state")) {
        element.classList.remove("has-sa-universal-empty");
      }
    });
    document.querySelectorAll(".has-sa-universal-empty-surface").forEach((element) => {
      if (!element.querySelector(".sa-universal-empty-state")) {
        element.classList.remove("has-sa-universal-empty-surface");
      }
    });
  }

  function buildEmptyState(element, configuration, message) {
    const isFiltered = filteredMessagePattern.test(message);
    const isError = errorMessagePattern.test(message);
    const title = message && (isFiltered || isError) ? message.replace(/[.!]+$/, "") : configuration.title;
    const description = isError
      ? "Check the connection and try loading this section again."
      : isFiltered
        ? "Try adjusting the search or filters to return to the complete directory."
        : configuration.description;

    const card = document.createElement("div");
    card.className = "super-admin-company-empty__card";

    const visual = document.createElement("div");
    visual.className = "super-admin-company-empty__visual";
    visual.setAttribute("aria-hidden", "true");
    const glow = document.createElement("span");
    glow.className = "super-admin-company-empty__glow";
    const image = document.createElement("img");
    image.className = "super-admin-company-empty__icon";
    image.src = artworkSrc;
    image.alt = "";
    image.decoding = "async";
    visual.append(glow, image);

    const copy = document.createElement("div");
    copy.className = "super-admin-company-empty__copy";
    const heading = document.createElement("h3");
    heading.textContent = title;
    const body = document.createElement("p");
    body.className = "super-admin-company-empty__description";
    body.textContent = description;
    copy.append(heading, body);
    card.append(visual, copy);

    const trigger = configuration.actionSelector
      ? document.querySelector(configuration.actionSelector)
      : null;
    if (!isFiltered && !isError && trigger instanceof HTMLElement) {
      const actions = document.createElement("div");
      actions.className = "super-admin-company-empty__actions";
      const action = document.createElement("button");
      action.type = "button";
      action.className = "super-admin-company-empty__action";
      action.dataset.saUniversalEmptyAction = configuration.key;
      action.append(createActionIcon(configuration.actionIcon), document.createTextNode(configuration.actionLabel));
      actions.append(action);
      card.append(actions);
    }

    element.classList.remove("has-super-admin-search-state");
    element.classList.add("super-admin-company-empty", "sa-universal-empty-state");
    element.dataset.saUniversalEmptyKey = configuration.key;
    element.dataset.saUniversalEmptyMessage = message || configuration.title;
    element.setAttribute("role", "status");
    element.setAttribute("aria-live", "polite");
    element.setAttribute("aria-atomic", "true");
    element.setAttribute("aria-busy", "false");
    element.replaceChildren(card);

    element.parentElement?.classList.add("has-sa-universal-empty");
    getSurface(element)?.classList.add("has-sa-universal-empty-surface");
  }

  function clearViewportLock() {
    document.documentElement.classList.remove("sa-empty-state-viewport-lock");
    document.body.classList.remove("sa-empty-state-viewport-lock");
  }

  function reconcileEmptyStates() {
    reconciliationFrame = 0;

    for (const configuration of configurations) {
      document.querySelectorAll(configuration.selector).forEach((element) => {
        if (!(element instanceof HTMLElement)) {
          return;
        }
        const message = readCurrentMessage(element);
        const hasLoadingState = Boolean(element.querySelector(".super-admin-search-state.is-loading"));
        if (hasLoadingState || loadingMessagePattern.test(message)) {
          clearEmptyMarkers(element);
          return;
        }

        const renderedMessage = normalizeMessage(element.dataset.saUniversalEmptyMessage);
        const hasCard = Boolean(element.querySelector(":scope > .super-admin-company-empty__card"));
        if (!hasCard || renderedMessage !== message) {
          buildEmptyState(element, configuration, message);
        } else {
          element.parentElement?.classList.add("has-sa-universal-empty");
          getSurface(element)?.classList.add("has-sa-universal-empty-surface");
        }
        element.style.removeProperty("--sa-empty-viewport-height");
      });
    }

    document.querySelectorAll("[data-super-admin-empty].super-admin-company-empty").forEach((element) => {
      element.style.removeProperty("--sa-empty-viewport-height");
    });
    removeStaleMarkers();
    clearViewportLock();
  }

  function scheduleReconciliation() {
    if (reconciliationFrame) {
      return;
    }
    reconciliationFrame = window.requestAnimationFrame(reconcileEmptyStates);
  }

  document.addEventListener("click", (event) => {
    const action = event.target.closest("[data-sa-universal-empty-action]");
    if (!(action instanceof HTMLButtonElement)) {
      return;
    }
    const configuration = configurationsByKey.get(action.dataset.saUniversalEmptyAction);
    const trigger = configuration?.actionSelector
      ? document.querySelector(configuration.actionSelector)
      : null;
    if (!(trigger instanceof HTMLElement) || trigger.matches(":disabled")) {
      return;
    }
    trigger.click();
  });

  const observer = new MutationObserver((mutations) => {
    const onlyDecorativeMotion = mutations.every((mutation) => {
      const target = mutation.target instanceof Element ? mutation.target : mutation.target?.parentElement;
      return Boolean(target?.closest("[data-sa-motion]"));
    });
    if (!onlyDecorativeMotion) {
      scheduleReconciliation();
    }
  });

  function initialize() {
    const observationRoot = document.querySelector("main.super-admin-shell, main") || document.body;
    observer.observe(observationRoot, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["hidden"],
    });
    scheduleReconciliation();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }

  window.addEventListener("resize", scheduleReconciliation, { passive: true });
  window.visualViewport?.addEventListener("resize", scheduleReconciliation, { passive: true });
  window.addEventListener("hashchange", scheduleReconciliation);
  window.addEventListener("gms:super-admin-section-changed", scheduleReconciliation);
})();
