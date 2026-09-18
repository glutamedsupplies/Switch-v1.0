(() => {
  "use strict";

  function splitTrendNote(note) {
    const text = String(note || "").trim();
    if (!text) {
      return { value: "", period: "" };
    }
    const spaceIndex = text.indexOf(" ");
    if (spaceIndex <= 0) {
      return { value: text, period: "" };
    }
    return {
      value: text.slice(0, spaceIndex),
      period: text.slice(spaceIndex + 1).trim(),
    };
  }

  function buildAdminSummaryCard(config = {}) {
    const {
      key = "",
      label = "",
      value = "0",
      note = "",
      trendValue = "",
      trendPeriod = "",
      icon = "",
      tone = key,
      interactive = false,
      active = false,
      dataset = {},
      valueId = "",
      valueAttr = "",
      trendClass = "",
    } = config;

    const card = document.createElement(interactive ? "button" : "article");
    card.className = `super-admin-stat${active ? " is-active" : ""}`;
    if (interactive) {
      card.type = "button";
      card.setAttribute("aria-pressed", active ? "true" : "false");
    }
    if (key) {
      card.dataset.adminSummaryStat = key;
    }
    if (tone) {
      card.dataset.adminSummaryTone = tone;
    }
    Object.entries(dataset).forEach(([attr, attrValue]) => {
      if (attrValue !== undefined && attrValue !== null) {
        card.dataset[attr] = String(attrValue);
      }
    });

    const labelEl = document.createElement("span");
    labelEl.className = "super-admin-stat__label";
    labelEl.textContent = label;

    const iconEl = document.createElement("span");
    iconEl.className = "super-admin-stat__icon";
    iconEl.setAttribute("aria-hidden", "true");
    iconEl.innerHTML = icon;

    const valueEl = document.createElement("strong");
    if (valueId) {
      valueEl.id = valueId;
    }
    if (valueAttr) {
      valueEl.setAttribute(valueAttr, "");
    }
    valueEl.textContent = String(value);

    const noteParts = splitTrendNote(note);
    const trend = document.createElement("span");
    trend.className = `super-admin-stat__trend${trendClass ? ` ${trendClass}` : ""}`;
    const trendValueEl = document.createElement("span");
    trendValueEl.className = "super-admin-stat__trend-value";
    trendValueEl.textContent = trendValue || noteParts.value || note;
    const trendPeriodEl = document.createElement("span");
    trendPeriodEl.className = "super-admin-stat__trend-period";
    trendPeriodEl.textContent = trendPeriod || noteParts.period;
    trend.append(trendValueEl, trendPeriodEl);

    card.append(labelEl, iconEl, valueEl, trend);
    return card;
  }

  function renderAdminSummaryCards(container, cards, options = {}) {
    if (!(container instanceof HTMLElement)) {
      return;
    }

    const activeKey = String(options.activeKey || "");
    container.classList.add("super-admin-stats");
    container.replaceChildren(
      ...cards.map((entry) => buildAdminSummaryCard({
        ...entry,
        active: activeKey
          ? entry.key === activeKey
          : Boolean(entry.active),
        interactive: entry.interactive ?? options.interactive ?? false,
      })),
    );
  }

  window.GmsAdminSummaryCards = Object.freeze({
    build: buildAdminSummaryCard,
    render: renderAdminSummaryCards,
  });
})();
