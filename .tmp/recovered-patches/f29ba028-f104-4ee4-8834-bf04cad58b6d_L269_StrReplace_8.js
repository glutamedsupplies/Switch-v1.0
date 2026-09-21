  function closeBiometricSelectDropdowns() {
    setBiometricSelectDropdownOpen(null, false);
  }

  function isBiometricScrollContainer(element) {
    if (!(element instanceof Element)) {
      return false;
    }
    const style = window.getComputedStyle(element);
    const overflowY = style.overflowY;
    const allowsScroll = overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay";
    return allowsScroll && element.scrollHeight > element.clientHeight + 1;
  }

  function collectBiometricDropdownScrollContainers() {
    const containers = new Set();
    const mainPanel = document.querySelector(".super-admin-panel-container");
    if (mainPanel instanceof Element) {
      containers.add(mainPanel);
    }
    if (root instanceof Element) {
      let node = root.parentElement;
      while (node) {
        if (isBiometricScrollContainer(node)) {
          containers.add(node);
        }
        node = node.parentElement;
      }
    }
    return containers;
  }

  function shouldKeepBiometricDropdownOpenForScroll(event) {
    const target = event?.target;
    if (!(target instanceof Node)) {
      return false;
    }
    return biometricSelectDropdowns.some((entry) =>
      entry.menu instanceof HTMLElement &&
      entry.trigger?.getAttribute("aria-expanded") === "true" &&
      entry.menu.contains(target),
    );
  }

  function handleBiometricDropdownScrollClose(event) {
    if (shouldKeepBiometricDropdownOpenForScroll(event)) {
      return;
    }
    closeBiometricSelectDropdowns();
  }

  function bindBiometricDropdownScrollClose() {
    collectBiometricDropdownScrollContainers().forEach((container) => {
      if (biometricDropdownScrollBound.has(container)) {
        return;
      }
      biometricDropdownScrollBound.add(container);
      container.addEventListener("scroll", handleBiometricDropdownScrollClose, { passive: true });
      container.addEventListener("wheel", handleBiometricDropdownScrollClose, { passive: true });
    });
    if (!biometricDropdownDocumentScrollBound) {
      biometricDropdownDocumentScrollBound = true;
      document.addEventListener("scroll", handleBiometricDropdownScrollClose, { passive: true, capture: true });
      window.addEventListener("scroll", handleBiometricDropdownScrollClose, { passive: true, capture: true });
    }
  }

  function enhanceBiometricSelect(select) {