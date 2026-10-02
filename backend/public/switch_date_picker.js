(() => {
  const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  let panel = null;
  let activeRoot = null;
  let viewMonth = null;
  let draftDate = null;
  let positionFrame = 0;
  let listenersBound = false;

  function parseYmd(value) {
    const raw = String(value || "").trim();
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function formatYmd(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function formatDisplay(value) {
    const date = value instanceof Date ? value : parseYmd(value);
    if (!(date instanceof Date)) return "mm/dd/yyyy";
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  }

  function sameDay(left, right) {
    return left instanceof Date
      && right instanceof Date
      && left.getFullYear() === right.getFullYear()
      && left.getMonth() === right.getMonth()
      && left.getDate() === right.getDate();
  }

  function startOfDay(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function applyMinDateOption(root, minDate) {
    if (!(root instanceof HTMLElement) || minDate == null) return;
    if (minDate === false || minDate === "") {
      delete root.dataset.switchDateMin;
      return;
    }
    if (minDate === "today" || minDate === true) {
      root.dataset.switchDateMin = "today";
      return;
    }
    const date = minDate instanceof Date ? startOfDay(minDate) : parseYmd(minDate);
    if (date) root.dataset.switchDateMin = formatYmd(date);
  }

  function getMinDate(root) {
    const raw = String(root?.dataset?.switchDateMin || "").trim();
    if (!raw) return null;
    if (raw === "today") return startOfDay(new Date());
    return parseYmd(raw);
  }

  function isBeforeMin(date, minDate) {
    const day = startOfDay(date);
    const min = startOfDay(minDate);
    return Boolean(day && min && day.getTime() < min.getTime());
  }

  function requireApply(root) {
    return root instanceof HTMLElement && root.dataset.switchDateApply === "true";
  }

  function findPairedTimePicker(root) {
    if (!(root instanceof HTMLElement)) return null;
    const pair = root.closest(".sa-voucher-modal__datetime-pair");
    const timeRoot = pair?.querySelector("[data-switch-time-picker]");
    return timeRoot instanceof HTMLElement ? timeRoot : null;
  }

  function unlockPairedTimePicker(timeRoot) {
    if (!(timeRoot instanceof HTMLElement)) return;
    timeRoot.classList.remove("is-disabled");
    const trigger = timeRoot.querySelector(".product-expiry-date-picker__trigger");
    if (trigger instanceof HTMLButtonElement) {
      trigger.disabled = false;
      trigger.removeAttribute("aria-disabled");
    }
  }

  function openPairedTimePicker(root) {
    const timeRoot = findPairedTimePicker(root);
    if (!timeRoot) return;
    unlockPairedTimePicker(timeRoot);
    window.setTimeout(() => {
      window.SwitchTimePicker?.open(timeRoot);
      window.requestAnimationFrame(() => {
        document
          .querySelector("#switch-time-calendar [data-switch-time-calendar-hours] .is-selected")
          ?.focus?.({ preventScroll: true });
      });
    }, 0);
  }

  function eventInside(node, event) {
    if (!(node instanceof Node)) return false;
    const path = typeof event.composedPath === "function" ? event.composedPath() : [];
    if (path.includes(node)) return true;
    return event.target instanceof Node && node.contains(event.target);
  }

  function parts(root) {
    if (!(root instanceof HTMLElement)) return null;
    return {
      input: root.querySelector(".product-expiry-date-picker__native"),
      trigger: root.querySelector(".product-expiry-date-picker__trigger"),
      value: root.querySelector(".product-expiry-date-picker__value"),
    };
  }

  function sync(root) {
    const els = parts(root);
    if (!els?.input || !els.trigger) return;
    const raw = String(els.input.value || "").trim();
    const hasValue = Boolean(parseYmd(raw));
    if (els.value) {
      els.value.textContent = hasValue
        ? formatDisplay(raw)
        : String(root.dataset.switchEmpty || "mm/dd/yyyy");
    }
    els.trigger.classList.toggle("is-empty", !hasValue);
    const label = els.trigger.getAttribute("data-date-label") || "date";
    els.trigger.setAttribute(
      "aria-label",
      hasValue ? `${label} ${formatDisplay(raw)}. Open calendar.` : `Select ${label}`,
    );
    root.classList.toggle("has-expiry-date", hasValue);
    syncClearButton(root, hasValue);
  }

  function allowClear(root) {
    return root instanceof HTMLElement && root.dataset.switchDateAllowClear !== "false";
  }

  function syncClearButton(root, hasValue) {
    const clear = panel?.querySelector("[data-switch-date-calendar-clear]");
    if (!(clear instanceof HTMLButtonElement) || activeRoot !== root) return;
    clear.hidden = !allowClear(root) || !hasValue;
  }

  function setValue(root, nextValue, { emit = true } = {}) {
    const els = parts(root);
    if (!els?.input) return;
    const date = nextValue instanceof Date ? nextValue : parseYmd(nextValue);
    if (date && isBeforeMin(date, getMinDate(root))) return;
    els.input.value = date ? formatYmd(date) : "";
    sync(root);
    if (emit) {
      els.input.dispatchEvent(new Event("input", { bubbles: true }));
      els.input.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  function getValue(root) {
    return String(parts(root)?.input?.value || "").trim();
  }

  function render() {
    if (!(panel instanceof HTMLElement)) return;
    const monthEl = panel.querySelector("[data-switch-date-calendar-month]");
    const daysEl = panel.querySelector("[data-switch-date-calendar-days]");
    if (!(monthEl instanceof HTMLElement) || !(daysEl instanceof HTMLElement)) return;

    const committedDate = parseYmd(getValue(activeRoot));
    const selectedDate = startOfDay(draftDate) || committedDate;
    const today = new Date();
    const base = viewMonth instanceof Date
      ? viewMonth
      : new Date((selectedDate ?? today).getFullYear(), (selectedDate ?? today).getMonth(), 1);
    viewMonth = new Date(base.getFullYear(), base.getMonth(), 1);
    monthEl.textContent = new Intl.DateTimeFormat("en-US", {
      month: "long",
      year: "numeric",
    }).format(viewMonth);
    daysEl.replaceChildren();

    const firstVisibleDay = new Date(
      viewMonth.getFullYear(),
      viewMonth.getMonth(),
      1 - viewMonth.getDay(),
    );
    const daysInViewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
    const visibleDayCount = Math.max(
      35,
      Math.ceil((viewMonth.getDay() + daysInViewMonth) / 7) * 7,
    );

    for (let index = 0; index < visibleDayCount; index += 1) {
      const dayDate = new Date(
        firstVisibleDay.getFullYear(),
        firstVisibleDay.getMonth(),
        firstVisibleDay.getDate() + index,
      );
      const dayButton = document.createElement("button");
      dayButton.type = "button";
      dayButton.className = "product-expiry-calendar__day";
      dayButton.textContent = String(dayDate.getDate());
      dayButton.dataset.date = formatYmd(dayDate);
      dayButton.setAttribute(
        "aria-label",
        new Intl.DateTimeFormat("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        }).format(dayDate),
      );
      if (dayDate.getMonth() !== viewMonth.getMonth()) dayButton.classList.add("is-outside-month");
      if (dayDate.getDay() === 0) dayButton.classList.add("is-sunday");
      if (sameDay(dayDate, today)) dayButton.classList.add("is-today");
      if (sameDay(dayDate, selectedDate)) {
        dayButton.classList.add("is-selected");
        dayButton.setAttribute("aria-selected", "true");
      }
      const minDate = getMinDate(activeRoot);
      const disabled = isBeforeMin(dayDate, minDate);
      if (disabled) {
        dayButton.disabled = true;
        dayButton.classList.add("is-disabled");
        dayButton.setAttribute("aria-disabled", "true");
      }
      dayButton.addEventListener("click", () => {
        if (!(activeRoot instanceof HTMLElement) || disabled) return;
        if (requireApply(activeRoot)) {
          draftDate = dayDate;
          render();
          return;
        }
        setValue(activeRoot, dayDate);
        setOpen(false, { restoreFocus: true });
      });
      daysEl.append(dayButton);
    }

    const prev = panel.querySelector("[data-switch-date-calendar-previous]");
    if (prev instanceof HTMLButtonElement) {
      const minDate = getMinDate(activeRoot);
      const locked = Boolean(
        minDate
        && (viewMonth.getFullYear() < minDate.getFullYear()
          || (viewMonth.getFullYear() === minDate.getFullYear() && viewMonth.getMonth() <= minDate.getMonth())),
      );
      prev.disabled = locked;
      prev.setAttribute("aria-disabled", String(locked));
    }

    syncClearButton(activeRoot, Boolean(committedDate));
    syncApplyButton();
  }

  function syncApplyButton() {
    const apply = panel?.querySelector("[data-switch-date-calendar-apply]");
    if (!(apply instanceof HTMLButtonElement) || !(panel instanceof HTMLElement)) return;
    const needsApply = requireApply(activeRoot);
    apply.hidden = !needsApply;
    apply.disabled = !startOfDay(draftDate);
    apply.textContent = findPairedTimePicker(activeRoot) ? "Next" : "Apply";
    panel.classList.toggle("has-apply", needsApply);
  }

  function position() {
    const els = parts(activeRoot);
    if (!(panel instanceof HTMLElement) || panel.hidden || !(els?.trigger instanceof HTMLElement)) {
      return;
    }
    const triggerRect = els.trigger.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const viewportPadding = 12;
    const panelGap = 13;
    const panelWidth = panelRect.width;
    const panelHeight = panelRect.height;
    const preferredLeft = triggerRect.right - panelWidth;
    const maxLeft = Math.max(viewportPadding, window.innerWidth - panelWidth - viewportPadding);
    const left = Math.min(Math.max(viewportPadding, preferredLeft), maxLeft);
    let top = triggerRect.bottom + panelGap;
    let opensUp = false;
    if (top + panelHeight > window.innerHeight - viewportPadding) {
      const upwardTop = triggerRect.top - panelHeight - panelGap;
      if (upwardTop >= viewportPadding) {
        top = upwardTop;
        opensUp = true;
      } else {
        top = Math.max(viewportPadding, window.innerHeight - panelHeight - viewportPadding);
      }
    }
    const triggerCenter = triggerRect.left + triggerRect.width / 2;
    const arrowLeft = Math.min(Math.max(22, triggerCenter - left), panelWidth - 22);
    panel.classList.toggle("is-open-up", opensUp);
    panel.style.left = `${Math.round(left)}px`;
    panel.style.top = `${Math.round(top)}px`;
    panel.style.setProperty("--product-expiry-calendar-arrow-left", `${Math.round(arrowLeft)}px`);
  }

  function requestPosition() {
    if (positionFrame) return;
    positionFrame = window.requestAnimationFrame(() => {
      positionFrame = 0;
      position();
    });
  }

  function setOpen(isOpen, { restoreFocus = false } = {}) {
    const root = activeRoot;
    const els = parts(root);
    if (!(panel instanceof HTMLElement) || !els?.trigger) return;
    const nextIsOpen = Boolean(isOpen);
    panel.hidden = !nextIsOpen;
    root.classList.toggle("is-open", nextIsOpen);
    els.trigger.setAttribute("aria-expanded", nextIsOpen ? "true" : "false");
    if (nextIsOpen) {
      window.SwitchTimePicker?.close();
      draftDate = parseYmd(els.input?.value);
      const selectedDate = draftDate ?? new Date();
      viewMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      render();
      requestPosition();
      window.requestAnimationFrame(() => {
        panel.querySelector(
          ".product-expiry-calendar__day.is-selected, .product-expiry-calendar__day.is-today",
        )?.focus?.({ preventScroll: true });
      });
      return;
    }
    if (restoreFocus) els.trigger.focus({ preventScroll: true });
  }

  function ensurePanel() {
    if (panel instanceof HTMLElement) return panel;
    const next = document.createElement("div");
    next.id = "switch-date-calendar";
    next.className = "product-expiry-calendar";
    next.hidden = true;
    next.setAttribute("role", "dialog");
    next.setAttribute("aria-label", "Choose date");
    next.innerHTML = `
      <div class="product-expiry-calendar__header">
        <button type="button" class="product-expiry-calendar__nav" data-switch-date-calendar-previous aria-label="Previous month">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>
        </button>
        <strong class="product-expiry-calendar__month" data-switch-date-calendar-month></strong>
        <button type="button" class="product-expiry-calendar__nav" data-switch-date-calendar-next aria-label="Next month">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"></path></svg>
        </button>
      </div>
      <div class="product-expiry-calendar__weekdays" aria-hidden="true">
        ${WEEKDAYS.map((weekday) => `<span class="product-expiry-calendar__weekday${weekday === "Su" ? " is-sunday" : ""}">${weekday}</span>`).join("")}
      </div>
      <div class="product-expiry-calendar__days" role="grid" data-switch-date-calendar-days></div>
      <div class="product-expiry-calendar__footer">
        <button type="button" class="product-expiry-calendar__clear" data-switch-date-calendar-clear hidden aria-label="Remove date" title="Remove date">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M18 6 6 18"/>
            <path d="m6 6 12 12"/>
          </svg>
          <span>Remove date</span>
        </button>
        <button type="button" class="product-expiry-calendar__today" data-switch-date-calendar-today>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M8 2v4"></path><path d="M16 2v4"></path><rect width="18" height="18" x="3" y="4" rx="2"></rect><path d="M3 10h18"></path>
          </svg>
          <span>Today</span>
        </button>
        <button type="button" class="product-expiry-calendar__apply" data-switch-date-calendar-apply hidden>
          Apply
        </button>
      </div>
    `;
    document.body.append(next);
    next.addEventListener("click", (event) => {
      event.stopPropagation();
    });
    next.querySelector("[data-switch-date-calendar-previous]")?.addEventListener("click", () => {
      const month = viewMonth ?? new Date();
      const previous = new Date(month.getFullYear(), month.getMonth() - 1, 1);
      const minDate = getMinDate(activeRoot);
      if (minDate && (previous.getFullYear() < minDate.getFullYear()
        || (previous.getFullYear() === minDate.getFullYear() && previous.getMonth() < minDate.getMonth()))) {
        return;
      }
      viewMonth = previous;
      render();
      requestPosition();
    });
    next.querySelector("[data-switch-date-calendar-next]")?.addEventListener("click", () => {
      const month = viewMonth ?? new Date();
      viewMonth = new Date(month.getFullYear(), month.getMonth() + 1, 1);
      render();
      requestPosition();
    });
    next.querySelector("[data-switch-date-calendar-today]")?.addEventListener("click", () => {
      if (!(activeRoot instanceof HTMLElement)) return;
      const today = startOfDay(new Date());
      if (isBeforeMin(today, getMinDate(activeRoot))) return;
      if (requireApply(activeRoot)) {
        draftDate = today;
        viewMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        render();
        return;
      }
      setValue(activeRoot, today);
      setOpen(false, { restoreFocus: true });
    });
    next.querySelector("[data-switch-date-calendar-apply]")?.addEventListener("click", () => {
      if (!(activeRoot instanceof HTMLElement) || !startOfDay(draftDate)) return;
      const root = activeRoot;
      setValue(root, draftDate);
      setOpen(false);
      openPairedTimePicker(root);
    });
    next.querySelector("[data-switch-date-calendar-clear]")?.addEventListener("click", () => {
      if (!(activeRoot instanceof HTMLElement)) return;
      setValue(activeRoot, "");
      setOpen(false, { restoreFocus: true });
    });
    panel = next;
    return panel;
  }

  function bindDocumentListeners() {
    if (listenersBound) return;
    listenersBound = true;
    document.addEventListener("click", (event) => {
      if (!(panel instanceof HTMLElement) || panel.hidden) return;
      if (eventInside(panel, event) || eventInside(activeRoot, event)) return;
      setOpen(false);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || panel?.hidden !== false) return;
      event.preventDefault();
      setOpen(false, { restoreFocus: true });
    });
    window.addEventListener("resize", requestPosition);
  }

  function bind(root, options = {}) {
    const els = parts(root);
    if (!els?.input || !els.trigger) {
      sync(root);
      return;
    }
    if (options.allowClear === false) {
      root.dataset.switchDateAllowClear = "false";
    }
    applyMinDateOption(root, options.minDate);
    if (options.requireApply) {
      root.dataset.switchDateApply = "true";
    }
    if (root.dataset.switchDatePickerReady === "true") {
      sync(root);
      if (activeRoot === root && panel && !panel.hidden) render();
      return;
    }
    root.dataset.switchDatePickerReady = "true";
    ensurePanel();
    bindDocumentListeners();
    sync(root);
    els.trigger.addEventListener("click", () => {
      const alreadyOpen = activeRoot === root && panel?.hidden === false;
      if (alreadyOpen) {
        setOpen(false);
        return;
      }
      if (activeRoot instanceof HTMLElement && activeRoot !== root) {
        activeRoot.classList.remove("is-open");
        parts(activeRoot)?.trigger?.setAttribute("aria-expanded", "false");
      }
      activeRoot = root;
      els.trigger.setAttribute("aria-controls", "switch-date-calendar");
      setOpen(true);
    });
    els.trigger.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowDown") return;
      event.preventDefault();
      activeRoot = root;
      setOpen(true);
    });
    els.input.addEventListener("change", () => {
      sync(root);
      if (activeRoot === root && panel && !panel.hidden) render();
    });
  }

  function close() {
    setOpen(false);
  }

  function open(root) {
    if (!(root instanceof HTMLElement)) return;
    const els = parts(root);
    if (!els?.trigger) return;
    if (activeRoot instanceof HTMLElement && activeRoot !== root) {
      activeRoot.classList.remove("is-open");
      parts(activeRoot)?.trigger?.setAttribute("aria-expanded", "false");
    }
    activeRoot = root;
    els.trigger.setAttribute("aria-controls", "switch-date-calendar");
    setOpen(true);
  }

  window.SwitchDatePicker = {
    bind,
    sync,
    setValue,
    getValue,
    open,
    close,
  };
})();

(() => {
  let panel = null;
  let activeRoot = null;
  let positionFrame = 0;
  let listenersBound = false;
  let draft = { hours: 12, minutes: 0 };

  function eventInside(node, event) {
    if (!(node instanceof Node)) return false;
    const path = typeof event.composedPath === "function" ? event.composedPath() : [];
    if (path.includes(node)) return true;
    return event.target instanceof Node && node.contains(event.target);
  }

  function parseHm(value) {
    const match = String(value || "").trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours > 23 || minutes > 59) {
      return null;
    }
    return { hours, minutes };
  }

  function formatHm(hours, minutes) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }

  function formatDisplay(value) {
    const parsed = value && typeof value === "object" && !Array.isArray(value)
      ? value
      : parseHm(value);
    if (!parsed) return "--:--";
    const hour12 = parsed.hours % 12 || 12;
    const period = parsed.hours >= 12 ? "PM" : "AM";
    return `${hour12}:${String(parsed.minutes).padStart(2, "0")} ${period}`;
  }

  function parts(root) {
    if (!(root instanceof HTMLElement)) return null;
    return {
      input: root.querySelector(".product-expiry-date-picker__native"),
      trigger: root.querySelector(".product-expiry-date-picker__trigger"),
      value: root.querySelector(".product-expiry-date-picker__value"),
    };
  }

  function sync(root) {
    const els = parts(root);
    if (!els?.input || !els.trigger) return;
    const raw = String(els.input.value || "").trim();
    const parsed = parseHm(raw);
    if (els.value) {
      els.value.textContent = parsed
        ? formatDisplay(parsed)
        : String(root.dataset.switchEmpty || "--:--");
    }
    els.trigger.classList.toggle("is-empty", !parsed);
    const label = els.trigger.getAttribute("data-time-label") || "time";
    els.trigger.setAttribute(
      "aria-label",
      parsed ? `${label} ${formatDisplay(parsed)}. Open time picker.` : `Select ${label}`,
    );
    root.classList.toggle("has-expiry-date", Boolean(parsed));
  }

  function setValue(root, nextValue, { emit = true } = {}) {
    const els = parts(root);
    if (!els?.input) return;
    const parsed = typeof nextValue === "string"
      ? parseHm(nextValue)
      : nextValue && typeof nextValue === "object"
        ? parseHm(formatHm(nextValue.hours, nextValue.minutes))
        : null;
    els.input.value = parsed ? formatHm(parsed.hours, parsed.minutes) : "";
    sync(root);
    if (emit) {
      els.input.dispatchEvent(new Event("input", { bubbles: true }));
      els.input.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  function getValue(root) {
    return String(parts(root)?.input?.value || "").trim();
  }

  function currentDraft() {
    return draft;
  }

  function toMinutes(hm) {
    return Number(hm?.hours || 0) * 60 + Number(hm?.minutes || 0);
  }

  function getMinHm(root) {
    return parseHm(String(root?.dataset?.switchTimeMin || "").trim());
  }

  function applyMinTimeOption(root, minTime) {
    if (!(root instanceof HTMLElement)) return;
    if (minTime == null || minTime === false || minTime === "") {
      delete root.dataset.switchTimeMin;
      return;
    }
    const parsed = typeof minTime === "string"
      ? parseHm(minTime)
      : minTime && typeof minTime === "object"
        ? parseHm(formatHm(minTime.hours, minTime.minutes))
        : null;
    if (parsed) root.dataset.switchTimeMin = formatHm(parsed.hours, parsed.minutes);
    else delete root.dataset.switchTimeMin;
  }

  function clampToMin(root, hm) {
    const min = getMinHm(root);
    if (!min || !hm) return hm;
    return toMinutes(hm) < toMinutes(min) ? { hours: min.hours, minutes: min.minutes } : hm;
  }

  function hour24(hour12, period) {
    return period === "PM" ? (hour12 % 12) + 12 : hour12 % 12;
  }

  function optionButton(label, selected, onSelect, { disabled = false } = {}) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "product-expiry-calendar__day product-expiry-time-calendar__option";
    button.textContent = label;
    if (selected) {
      button.classList.add("is-selected");
      button.setAttribute("aria-selected", "true");
    }
    if (disabled) {
      button.disabled = true;
      button.classList.add("is-disabled");
      button.setAttribute("aria-disabled", "true");
      return button;
    }
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      onSelect();
    });
    return button;
  }

  function scrollSelected(list) {
    if (!(list instanceof HTMLElement)) return;
    const selected = list.querySelector(".is-selected");
    if (!(selected instanceof HTMLElement)) return;
    const top = selected.offsetTop - (list.clientHeight / 2) + (selected.clientHeight / 2);
    list.scrollTop = Math.max(0, top);
  }

  function render() {
    if (!(panel instanceof HTMLElement)) return;
    const titleEl = panel.querySelector("[data-switch-time-calendar-title]");
    const hoursEl = panel.querySelector("[data-switch-time-calendar-hours]");
    const minutesEl = panel.querySelector("[data-switch-time-calendar-minutes]");
    const periodsEl = panel.querySelector("[data-switch-time-calendar-periods]");
    if (!(hoursEl instanceof HTMLElement) || !(minutesEl instanceof HTMLElement) || !(periodsEl instanceof HTMLElement)) {
      return;
    }
    const selected = clampToMin(activeRoot, currentDraft());
    draft = { hours: selected.hours, minutes: selected.minutes };
    const hour12 = selected.hours % 12 || 12;
    const period = selected.hours >= 12 ? "PM" : "AM";
    const minHm = getMinHm(activeRoot);
    const minMinutes = minHm ? toMinutes(minHm) : null;
    if (titleEl instanceof HTMLElement) titleEl.textContent = formatDisplay(selected);

    hoursEl.replaceChildren();
    for (let hour = 1; hour <= 12; hour += 1) {
      const nextHours = hour24(hour, period);
      const hourDisabled = minMinutes != null && nextHours * 60 + 59 < minMinutes;
      hoursEl.append(optionButton(String(hour), hour === hour12, () => {
        if (!(activeRoot instanceof HTMLElement) || hourDisabled) return;
        if (minMinutes != null && nextHours * 60 + 59 < minMinutes) return;
        draft = clampToMin(activeRoot, { hours: nextHours, minutes: selected.minutes });
        render();
      }, { disabled: hourDisabled }));
    }

    minutesEl.replaceChildren();
    for (let minute = 0; minute < 60; minute += 1) {
      const minuteDisabled = minMinutes != null && selected.hours * 60 + minute < minMinutes;
      minutesEl.append(optionButton(String(minute).padStart(2, "0"), minute === selected.minutes, () => {
        if (!(activeRoot instanceof HTMLElement) || minuteDisabled) return;
        if (minMinutes != null && selected.hours * 60 + minute < minMinutes) return;
        draft = clampToMin(activeRoot, { hours: selected.hours, minutes: minute });
        render();
      }, { disabled: minuteDisabled }));
    }

    periodsEl.replaceChildren();
    ["AM", "PM"].forEach((nextPeriod) => {
      const periodDisabled = nextPeriod === "AM" && minMinutes != null && 11 * 60 + 59 < minMinutes;
      periodsEl.append(optionButton(nextPeriod, nextPeriod === period, () => {
        if (!(activeRoot instanceof HTMLElement)) return;
        const base = selected.hours % 12;
        const nextHours = nextPeriod === "PM" ? base + 12 : base;
        draft = clampToMin(activeRoot, { hours: nextHours, minutes: selected.minutes });
        render();
      }, { disabled: periodDisabled }));
    });

    window.requestAnimationFrame(() => {
      scrollSelected(hoursEl);
      scrollSelected(minutesEl);
    });
  }

  function position() {
    const els = parts(activeRoot);
    if (!(panel instanceof HTMLElement) || panel.hidden || !(els?.trigger instanceof HTMLElement)) {
      return;
    }
    const triggerRect = els.trigger.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const viewportPadding = 12;
    const panelGap = 13;
    const panelWidth = panelRect.width;
    const panelHeight = panelRect.height;
    const preferredLeft = triggerRect.right - panelWidth;
    const maxLeft = Math.max(viewportPadding, window.innerWidth - panelWidth - viewportPadding);
    const left = Math.min(Math.max(viewportPadding, preferredLeft), maxLeft);
    let top = triggerRect.bottom + panelGap;
    let opensUp = false;
    if (top + panelHeight > window.innerHeight - viewportPadding) {
      const upwardTop = triggerRect.top - panelHeight - panelGap;
      if (upwardTop >= viewportPadding) {
        top = upwardTop;
        opensUp = true;
      } else {
        top = Math.max(viewportPadding, window.innerHeight - panelHeight - viewportPadding);
      }
    }
    const triggerCenter = triggerRect.left + triggerRect.width / 2;
    const arrowLeft = Math.min(Math.max(22, triggerCenter - left), panelWidth - 22);
    panel.classList.toggle("is-open-up", opensUp);
    panel.style.left = `${Math.round(left)}px`;
    panel.style.top = `${Math.round(top)}px`;
    panel.style.setProperty("--product-expiry-calendar-arrow-left", `${Math.round(arrowLeft)}px`);
  }

  function requestPosition() {
    if (positionFrame) return;
    positionFrame = window.requestAnimationFrame(() => {
      positionFrame = 0;
      position();
    });
  }

  function setOpen(isOpen, { restoreFocus = false } = {}) {
    const root = activeRoot;
    const els = parts(root);
    if (!(panel instanceof HTMLElement) || !els?.trigger) return;
    const nextIsOpen = Boolean(isOpen);
    panel.hidden = !nextIsOpen;
    root.classList.toggle("is-open", nextIsOpen);
    els.trigger.setAttribute("aria-expanded", nextIsOpen ? "true" : "false");
    if (nextIsOpen) {
      if (els.trigger.disabled || root.classList.contains("is-disabled")) {
        panel.hidden = true;
        root.classList.remove("is-open");
        els.trigger.setAttribute("aria-expanded", "false");
        return;
      }
      window.SwitchDatePicker?.close();
      draft = clampToMin(root, parseHm(els.input?.value) || {
        hours: new Date().getHours(),
        minutes: new Date().getMinutes(),
      });
      render();
      requestPosition();
      window.requestAnimationFrame(() => {
        panel.querySelector(
          "[data-switch-time-calendar-hours] .is-selected, .product-expiry-time-calendar__option.is-selected",
        )?.focus?.({ preventScroll: true });
      });
      return;
    }
    if (restoreFocus) els.trigger.focus({ preventScroll: true });
  }

  function ensurePanel() {
    if (panel instanceof HTMLElement) return panel;
    const next = document.createElement("div");
    next.id = "switch-time-calendar";
    next.className = "product-expiry-calendar product-expiry-time-calendar";
    next.hidden = true;
    next.setAttribute("role", "dialog");
    next.setAttribute("aria-label", "Choose time");
    next.innerHTML = `
      <div class="product-expiry-calendar__header is-time">
        <strong class="product-expiry-calendar__month" data-switch-time-calendar-title>Choose time</strong>
      </div>
      <div class="product-expiry-time-calendar__body">
        <div class="product-expiry-time-calendar__column">
          <span class="product-expiry-calendar__weekday">Hour</span>
          <div class="product-expiry-time-calendar__list" role="listbox" aria-label="Hour" data-switch-time-calendar-hours></div>
        </div>
        <div class="product-expiry-time-calendar__column">
          <span class="product-expiry-calendar__weekday">Min</span>
          <div class="product-expiry-time-calendar__list" role="listbox" aria-label="Minute" data-switch-time-calendar-minutes></div>
        </div>
        <div class="product-expiry-time-calendar__column is-period">
          <span class="product-expiry-calendar__weekday">Period</span>
          <div class="product-expiry-time-calendar__list is-period" role="listbox" aria-label="AM or PM" data-switch-time-calendar-periods></div>
        </div>
      </div>
      <div class="product-expiry-calendar__footer">
        <button type="button" class="product-expiry-calendar__today" data-switch-time-calendar-now>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 6v6l4 2"></path>
          </svg>
          <span>Now</span>
        </button>
        <button type="button" class="product-expiry-calendar__apply" data-switch-time-calendar-apply>
          Apply
        </button>
      </div>
    `;
    document.body.append(next);
    next.addEventListener("click", (event) => {
      event.stopPropagation();
    });
    next.querySelector("[data-switch-time-calendar-now]")?.addEventListener("click", () => {
      if (!(activeRoot instanceof HTMLElement)) return;
      const now = new Date();
      draft = clampToMin(activeRoot, { hours: now.getHours(), minutes: now.getMinutes() });
      render();
      requestPosition();
    });
    next.querySelector("[data-switch-time-calendar-apply]")?.addEventListener("click", () => {
      if (!(activeRoot instanceof HTMLElement)) return;
      const nextValue = clampToMin(activeRoot, draft);
      const minHm = getMinHm(activeRoot);
      if (minHm && toMinutes(nextValue) < toMinutes(minHm)) return;
      setValue(activeRoot, formatHm(nextValue.hours, nextValue.minutes));
      setOpen(false, { restoreFocus: true });
    });
    panel = next;
    return panel;
  }

  function bindDocumentListeners() {
    if (listenersBound) return;
    listenersBound = true;
    document.addEventListener("click", (event) => {
      if (!(panel instanceof HTMLElement) || panel.hidden) return;
      if (eventInside(panel, event) || eventInside(activeRoot, event)) return;
      if (activeRoot?.closest?.("[data-voucher-settings-popover]")) return;
      setOpen(false);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || panel?.hidden !== false) return;
      event.preventDefault();
      event.stopPropagation();
      setOpen(false, { restoreFocus: true });
    });
    window.addEventListener("resize", requestPosition);
  }

  function setMinTime(root, minTime) {
    applyMinTimeOption(root, minTime);
    if (activeRoot === root && panel && !panel.hidden) {
      draft = clampToMin(root, draft);
      render();
    }
  }

  function bind(root, options = {}) {
    const els = parts(root);
    if (!els?.input || !els.trigger) {
      sync(root);
      return;
    }
    if (Object.prototype.hasOwnProperty.call(options, "minTime")) {
      applyMinTimeOption(root, options.minTime);
    }
    if (root.dataset.switchTimePickerReady === "true") {
      sync(root);
      if (activeRoot === root && panel && !panel.hidden) render();
      return;
    }
    root.dataset.switchTimePickerReady = "true";
    ensurePanel();
    bindDocumentListeners();
    sync(root);
    els.trigger.addEventListener("click", () => {
      if (els.trigger.disabled || root.classList.contains("is-disabled")) return;
      const alreadyOpen = activeRoot === root && panel?.hidden === false;
      if (alreadyOpen) {
        if (!root.closest("[data-voucher-settings-popover]")) {
          setOpen(false);
        }
        return;
      }
      if (activeRoot instanceof HTMLElement && activeRoot !== root) {
        activeRoot.classList.remove("is-open");
        parts(activeRoot)?.trigger?.setAttribute("aria-expanded", "false");
      }
      activeRoot = root;
      els.trigger.setAttribute("aria-controls", "switch-time-calendar");
      setOpen(true);
    });
    els.trigger.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowDown") return;
      if (els.trigger.disabled || root.classList.contains("is-disabled")) return;
      event.preventDefault();
      activeRoot = root;
      setOpen(true);
    });
    els.input.addEventListener("change", () => {
      sync(root);
      if (activeRoot === root && panel && !panel.hidden) render();
    });
  }

  function close(root) {
    if (root instanceof HTMLElement && activeRoot !== root) return;
    if (panel?.hidden !== false) return;
    setOpen(false);
  }

  function open(root) {
    if (!(root instanceof HTMLElement)) return;
    const els = parts(root);
    if (!els?.trigger || els.trigger.disabled || root.classList.contains("is-disabled")) return;
    if (activeRoot instanceof HTMLElement && activeRoot !== root) {
      activeRoot.classList.remove("is-open");
      parts(activeRoot)?.trigger?.setAttribute("aria-expanded", "false");
    }
    activeRoot = root;
    els.trigger.setAttribute("aria-controls", "switch-time-calendar");
    setOpen(true);
  }

  window.SwitchTimePicker = {
    bind,
    sync,
    setValue,
    getValue,
    setMinTime,
    open,
    close,
  };
})();
