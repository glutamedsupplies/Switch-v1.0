(() => {
  /**
   * Shared scroll dock: move a platform search form into the sticky/fixed site
   * header when it scrolls off-screen, and restore it when scrolling back up.
   * Used by home (main_dart) and every platform storefront (switch_shop).
   *
   * PlatformSearchDock.attach({ form, home, headerSlot, header, input, onAfterMove })
   */
  function attach(options = {}) {
    const form = options.form;
    const home = options.home;
    const headerSlot = options.headerSlot;
    const header = options.header;
    const input = options.input;
    if (
      !(form instanceof HTMLElement) ||
      !(home instanceof HTMLElement) ||
      !(headerSlot instanceof HTMLElement) ||
      !(header instanceof HTMLElement) ||
      !home.parentElement
    ) {
      return null;
    }

    let sentinel = home.previousElementSibling;
    if (
      !(sentinel instanceof HTMLElement) ||
      !sentinel.classList.contains("md-platform-search-sentinel")
    ) {
      sentinel = document.createElement("div");
      sentinel.className = "md-platform-search-sentinel";
      sentinel.setAttribute("aria-hidden", "true");
      home.parentElement.insertBefore(sentinel, home);
    }

    let docked = false;
    let brandHeaderHeight = Math.ceil(header.getBoundingClientRect().height);
    let lockedMaxWidthPx = 0;

    function restoreInputFocus(hadFocus, selectionStart, selectionEnd) {
      if (!hadFocus || !(input instanceof HTMLInputElement)) return;
      const apply = () => {
        input.focus({ preventScroll: true });
        if (selectionStart != null && selectionEnd != null) {
          try {
            input.setSelectionRange(selectionStart, selectionEnd);
          } catch (_) {
            // type=search may not support selection in some browsers
          }
        }
      };
      apply();
      requestAnimationFrame(apply);
    }

    function moveForm(to) {
      const hadFocus =
        input instanceof HTMLInputElement && document.activeElement === input;
      const selectionStart =
        hadFocus && typeof input.selectionStart === "number"
          ? input.selectionStart
          : null;
      const selectionEnd =
        hadFocus && typeof input.selectionEnd === "number"
          ? input.selectionEnd
          : null;
      to.appendChild(form);
      restoreInputFocus(hadFocus, selectionStart, selectionEnd);
      if (typeof options.onAfterMove === "function") {
        try {
          options.onAfterMove({ docked, hadFocus });
        } catch (_) {
          // ignore host callback errors
        }
      }
    }

    /**
     * Keep the hero width as a max, but let the slot shrink so the search
     * actually fits inside the header row (brand + actions) instead of
     * forcing a second row / looking stuck under the header.
     */
    function applyLockedSize() {
      if (!lockedMaxWidthPx) return;
      form.style.width = "100%";
      form.style.maxWidth = "100%";
      form.style.minWidth = "0";
      headerSlot.style.width = "auto";
      headerSlot.style.maxWidth = `${lockedMaxWidthPx}px`;
      headerSlot.style.minWidth = "0";
      headerSlot.style.flex = "1 1 auto";
    }

    function clearLockedSize() {
      form.style.width = "";
      form.style.maxWidth = "";
      form.style.minWidth = "";
      headerSlot.style.width = "";
      headerSlot.style.maxWidth = "";
      headerSlot.style.minWidth = "";
      headerSlot.style.flex = "";
      lockedMaxWidthPx = 0;
    }

    function dock() {
      if (docked) return;
      brandHeaderHeight = Math.ceil(header.getBoundingClientRect().height);
      const rect = form.getBoundingClientRect();
      lockedMaxWidthPx = Math.max(160, Math.round(rect.width));
      home.style.minHeight = `${Math.ceil(rect.height)}px`;
      docked = true;
      moveForm(headerSlot);
      headerSlot.hidden = false;
      form.classList.add("is-in-header");
      header.classList.add("has-search");
      applyLockedSize();
    }

    function undock() {
      if (!docked) return;
      docked = false;
      moveForm(home);
      headerSlot.hidden = true;
      form.classList.remove("is-in-header");
      header.classList.remove("has-search");
      clearLockedSize();
      home.style.minHeight = "";
      brandHeaderHeight = Math.ceil(header.getBoundingClientRect().height);
    }

    const update = () => {
      if (!docked) {
        brandHeaderHeight = Math.ceil(header.getBoundingClientRect().height);
        if (form.getBoundingClientRect().top <= brandHeaderHeight + 2) {
          dock();
        }
        return;
      }
      const homeWidth = Math.round(home.getBoundingClientRect().width);
      if (homeWidth > 0 && homeWidth !== lockedMaxWidthPx) {
        lockedMaxWidthPx = Math.max(160, homeWidth);
        applyLockedSize();
      }
      if (home.getBoundingClientRect().top > brandHeaderHeight + 16) {
        undock();
      }
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    return {
      dock,
      undock,
      isDocked: () => docked,
      refresh: update,
    };
  }

  window.PlatformSearchDock = { attach };
})();
