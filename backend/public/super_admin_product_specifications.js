(function () {
  const DEFAULT_CATEGORY_VALUE = "__default__";
  const MAX_OPTIONS = 30;
  const state = {
    loading: false,
    loaded: false,
    saving: false,
    config: null,
    selectedValue: "",
    categoryOptions: [],
    draftRows: [],
    savedSnapshot: "[]",
  };

  function getSection() {
    return document.querySelector('[data-super-admin-section="product-specifications"]');
  }

  function getElement(selector) {
    return getSection()?.querySelector(selector) ?? null;
  }

  function headers(extra = {}) {
    let token = "";
    try {
      const raw =
        sessionStorage.getItem("gms-super-admin-session") ||
        localStorage.getItem("gms-super-admin-session");
      const session = raw ? JSON.parse(raw) : null;
      token = String(session?.token || "").trim();
    } catch (_) {
      token = "";
    }
    return {
      Accept: "application/json",
      ...extra,
      ...(token ? { "X-GMS-Super-Admin-Token": token } : {}),
    };
  }

  function renderState(container, message) {
    const paragraph = document.createElement("p");
    paragraph.className = "sa-product-specs__state";
    paragraph.textContent = message;
    container.replaceChildren(paragraph);
  }

  function setFeedback(message, tone = "") {
    const feedback = getElement("[data-product-specifications-feedback]");
    if (!feedback) {
      return;
    }
    feedback.textContent = message;
    feedback.dataset.tone = tone;
  }

  function normalizeKey(value) {
    return String(value ?? "").trim().toLowerCase();
  }

  function getCategorySettings(categoryName) {
    const categories = Array.isArray(state.config?.categories) ? state.config.categories : [];
    const key = normalizeKey(categoryName).replace(/\s+/g, " ");
    return categories.find((settings) => settings?.key === key) || null;
  }

  function getSelectedTarget() {
    if (state.selectedValue === DEFAULT_CATEGORY_VALUE) {
      return { isDefault: true, categoryName: "", label: "the default list" };
    }
    const option = state.categoryOptions.find((entry) => entry.value === state.selectedValue);
    const categoryName = option?.categoryName || "";
    return { isDefault: false, categoryName, label: categoryName };
  }

  function getSelectedSettings() {
    const target = getSelectedTarget();
    if (target.isDefault) {
      return { settings: state.config?.defaultSettings || null, isOwnList: true };
    }
    const ownSettings = getCategorySettings(target.categoryName);
    return {
      settings: ownSettings || state.config?.defaultSettings || null,
      isOwnList: Boolean(ownSettings),
    };
  }

  function serializeDraft(rows = state.draftRows) {
    return JSON.stringify(rows.map((row) => ({
      key: row.key,
      label: row.label.trim(),
      placeholder: row.placeholder.trim(),
    })));
  }

  function isDirty() {
    return serializeDraft() !== state.savedSnapshot;
  }

  function buildCategoryGroups() {
    const config = state.config;
    const groups = [];
    const listedKeys = new Set();

    for (const businessType of Array.isArray(config?.businessTypes) ? config.businessTypes : []) {
      const categories = (Array.isArray(businessType?.categories) ? businessType.categories : [])
        .map((name) => String(name ?? "").trim())
        .filter(Boolean);
      if (!categories.length) {
        continue;
      }
      categories.forEach((name) => listedKeys.add(normalizeKey(name)));
      groups.push({ label: String(businessType?.name ?? "Business type"), categories });
    }

    const otherCategories = (Array.isArray(config?.categories) ? config.categories : [])
      .filter((settings) => settings?.key && !listedKeys.has(settings.key))
      .map((settings) => String(settings.name ?? settings.key));
    if (otherCategories.length) {
      groups.push({ label: "Not in any business type", categories: otherCategories });
    }
    return groups;
  }

  function createCategoryOptionButton(option) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "sa-choice-option";
    button.dataset.productSpecificationsValue = option.value;
    button.setAttribute("role", "option");
    button.textContent = option.label;
    return button;
  }

  function syncCategoryPickerSelection() {
    const selected = state.categoryOptions.find((entry) => entry.value === state.selectedValue);
    const label = getElement("[data-product-specifications-category-label]");
    if (label) {
      label.textContent = selected?.label || "Select a category";
    }
    getElement("[data-product-specifications-category-menu]")
      ?.querySelectorAll("[data-product-specifications-value]")
      .forEach((button) => {
        const isActive = button.dataset.productSpecificationsValue === state.selectedValue;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-selected", String(isActive));
      });
  }

  function renderCategoryPicker() {
    const menu = getElement("[data-product-specifications-category-menu]");
    if (!menu) {
      return;
    }

    const fragment = document.createDocumentFragment();
    const options = [];
    for (const group of buildCategoryGroups()) {
      const heading = document.createElement("div");
      heading.className = "sa-choice-group-label";
      heading.setAttribute("role", "presentation");
      heading.textContent = group.label;
      fragment.append(heading);
      for (const name of group.categories) {
        const option = {
          value: `${group.label}::${name}`,
          label: getCategorySettings(name) ? name : `${name} (default list)`,
          categoryName: name,
        };
        fragment.append(createCategoryOptionButton(option));
        options.push(option);
      }
    }
    const defaultOption = {
      value: DEFAULT_CATEGORY_VALUE,
      label: "Default list (categories without their own list)",
      categoryName: "",
    };
    fragment.append(createCategoryOptionButton(defaultOption));
    options.push(defaultOption);

    menu.replaceChildren(fragment);
    state.categoryOptions = options;
    if (!options.some((entry) => entry.value === state.selectedValue)) {
      state.selectedValue = options[0].value;
    }
    syncCategoryPickerSelection();
  }

  function isCategoryMenuOpen() {
    return Boolean(getElement("[data-product-specifications-dropdown]")?.classList.contains("is-open"));
  }

  function setCategoryMenuOpen(open, { focusTrigger = false } = {}) {
    const dropdown = getElement("[data-product-specifications-dropdown]");
    const toggle = getElement("[data-product-specifications-toggle]");
    const menu = getElement("[data-product-specifications-category-menu]");
    if (!dropdown || !toggle || !menu) {
      return;
    }
    dropdown.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    menu.hidden = !open;
    if (open) {
      const active = menu.querySelector(".sa-choice-option.is-active") || menu.querySelector(".sa-choice-option");
      active?.scrollIntoView({ block: "nearest" });
      active?.focus({ preventScroll: true });
    } else if (focusTrigger) {
      toggle.focus();
    }
  }

  function selectCategory(value) {
    setCategoryMenuOpen(false, { focusTrigger: true });
    if (value === state.selectedValue) {
      return;
    }
    if (isDirty() && !window.confirm("You have unsaved changes. Discard them?")) {
      return;
    }
    state.selectedValue = value;
    syncCategoryPickerSelection();
    setFeedback("");
    renderSelectedCategory();
  }

  function resetDraftFromSettings() {
    const { settings, isOwnList } = getSelectedSettings();
    // A category on the default list starts empty so saving creates its own list.
    const options = isOwnList && Array.isArray(settings?.options) ? settings.options : [];
    state.draftRows = options.map((option) => ({
      key: String(option?.key ?? ""),
      label: String(option?.label ?? ""),
      placeholder: String(option?.placeholder ?? ""),
    }));
    state.savedSnapshot = serializeDraft();
  }

  function syncSourceBadge() {
    const sourceElement = getElement("[data-product-specifications-source]");
    const resetButton = getElement("[data-product-specifications-reset]");
    const target = getSelectedTarget();
    const { settings, isOwnList } = getSelectedSettings();

    let text = "Uses the default list — add specifications to give it its own list";
    let isCustom = false;
    if (isOwnList && settings) {
      isCustom = true;
      const origin = settings.source === "custom" ? "Edited in Super Admin" : "Starting list from code";
      text = `${origin} · min ${settings.minRequired} per listing, ${settings.variantMinRequired} per variant`;
    }
    if (sourceElement) {
      sourceElement.textContent = text;
      sourceElement.classList.toggle("is-custom", isCustom);
    }
    if (resetButton) {
      resetButton.hidden = !(settings?.source === "custom" && (isOwnList || target.isDefault));
      resetButton.textContent = target.isDefault || settings?.hasCodeList
        ? "Reset to code list"
        : "Use default list";
    }
  }

  function syncActionState() {
    const saveButton = getElement("[data-product-specifications-save]");
    const addButton = getElement("[data-product-specifications-add]");
    const resetButton = getElement("[data-product-specifications-reset]");
    const countElement = getElement("[data-product-specifications-count]");
    if (saveButton) {
      saveButton.disabled = state.saving || !state.config || !isDirty();
    }
    if (addButton) {
      addButton.disabled = state.saving || !state.config || state.draftRows.length >= MAX_OPTIONS;
    }
    if (resetButton) {
      resetButton.disabled = state.saving;
    }
    if (countElement) {
      countElement.textContent = `(${state.draftRows.length})`;
    }
  }

  function renderRows() {
    const rowsContainer = getElement("[data-product-specifications-rows]");
    if (!rowsContainer) {
      return;
    }
    if (!state.draftRows.length) {
      const { isOwnList } = getSelectedSettings();
      renderState(
        rowsContainer,
        isOwnList
          ? "No specifications yet. Sellers won't need any for this category."
          : "This category uses the default list. Click Add specification to create its own list.",
      );
      syncActionState();
      return;
    }

    const fragment = document.createDocumentFragment();
    state.draftRows.forEach((row, rowIndex) => {
      const rowElement = document.createElement("div");
      rowElement.className = "sa-product-specs__row sa-product-specs__row--edit";
      rowElement.setAttribute("role", "row");
      rowElement.dataset.rowIndex = String(rowIndex);

      const labelInput = document.createElement("input");
      labelInput.type = "text";
      labelInput.className = "sa-product-specs__input";
      labelInput.maxLength = 60;
      labelInput.placeholder = "e.g. Sugar Level";
      labelInput.value = row.label;
      labelInput.dataset.field = "label";
      labelInput.setAttribute("aria-label", `Specification ${rowIndex + 1} name`);

      const placeholderInput = document.createElement("input");
      placeholderInput.type = "text";
      placeholderInput.className = "sa-product-specs__input";
      placeholderInput.maxLength = 80;
      placeholderInput.placeholder = "e.g. 50%";
      placeholderInput.value = row.placeholder;
      placeholderInput.dataset.field = "placeholder";
      placeholderInput.setAttribute("aria-label", `Specification ${rowIndex + 1} example value`);

      const key = document.createElement("code");
      key.setAttribute("role", "cell");
      key.textContent = row.key || "new";
      key.title = row.key ? "Saved key (stays the same when renamed)" : "Key is created when you save";

      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "sa-product-specs__remove";
      removeButton.dataset.action = "remove";
      removeButton.setAttribute("aria-label", `Remove ${row.label || `specification ${rowIndex + 1}`}`);
      removeButton.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';

      rowElement.append(labelInput, placeholderInput, key, removeButton);
      fragment.append(rowElement);
    });
    rowsContainer.replaceChildren(fragment);
    syncActionState();
  }

  function renderSelectedCategory({ keepDraft = false } = {}) {
    if (!keepDraft) {
      resetDraftFromSettings();
    }
    syncSourceBadge();
    renderRows();
  }

  function render(config, { keepSelection = true } = {}) {
    state.config = config;
    const minElement = getElement("[data-product-specifications-min]");
    const variantMinElement = getElement("[data-product-specifications-variant-min]");
    if (minElement) {
      minElement.textContent = String(Number(config?.minRequired) || 0);
    }
    if (variantMinElement) {
      variantMinElement.textContent = String(Number(config?.variantMinRequired) || 0);
    }
    if (!keepSelection) {
      state.selectedValue = "";
    }
    renderCategoryPicker();
    renderSelectedCategory();
  }

  function getRowIndex(target) {
    const rowElement = target instanceof Element ? target.closest("[data-row-index]") : null;
    const rowIndex = Number(rowElement?.dataset.rowIndex);
    return Number.isInteger(rowIndex) && state.draftRows[rowIndex] ? rowIndex : -1;
  }

  function validateDraft() {
    const seen = new Set();
    for (const [index, row] of state.draftRows.entries()) {
      const label = row.label.replace(/\s+/g, " ").trim();
      if (!label) {
        return { message: `Specification ${index + 1} needs a name.`, rowIndex: index };
      }
      if (seen.has(label.toLowerCase())) {
        return { message: `"${label}" is listed more than once.`, rowIndex: index };
      }
      seen.add(label.toLowerCase());
    }
    return null;
  }

  async function sendChange(method, body) {
    const response = await fetch("/api/super-admin/product-specifications", {
      method,
      headers: headers({ "Content-Type": "application/json" }),
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || "Unable to save specifications.");
    }
    return data;
  }

  async function save() {
    if (state.saving || !isDirty()) {
      return;
    }
    const issue = validateDraft();
    if (issue) {
      setFeedback(issue.message, "error");
      getElement(`[data-row-index="${issue.rowIndex}"] [data-field="label"]`)?.focus();
      return;
    }

    const target = getSelectedTarget();
    state.saving = true;
    syncActionState();
    setFeedback("Saving…");
    try {
      const data = await sendChange("PUT", {
        category: target.categoryName,
        isDefault: target.isDefault,
        options: state.draftRows.map((row) => ({
          key: row.key || undefined,
          label: row.label.trim(),
          placeholder: row.placeholder.trim(),
        })),
      });
      state.saving = false;
      render(data);
      setFeedback(`Saved specifications for ${target.label}.`, "success");
    } catch (error) {
      state.saving = false;
      syncActionState();
      setFeedback(error instanceof Error ? error.message : "Unable to save specifications.", "error");
    }
  }

  async function resetToCode() {
    if (state.saving) {
      return;
    }
    const target = getSelectedTarget();
    const { settings } = getSelectedSettings();
    const destination = target.isDefault || settings?.hasCodeList ? "the list in code" : "the default list";
    const confirmed = window.confirm(
      `Switch ${target.label} back to ${destination}? Your edits for it will be removed.`,
    );
    if (!confirmed) {
      return;
    }
    state.saving = true;
    syncActionState();
    setFeedback("Resetting…");
    try {
      const data = await sendChange("DELETE", {
        category: target.categoryName,
        isDefault: target.isDefault,
      });
      state.saving = false;
      render(data);
      setFeedback(`${target.isDefault ? "Default list" : target.label} now uses ${destination}.`, "success");
    } catch (error) {
      state.saving = false;
      syncActionState();
      setFeedback(error instanceof Error ? error.message : "Unable to reset specifications.", "error");
    }
  }

  function bind() {
    const section = getSection();
    if (!section || section.dataset.productSpecificationsBound) {
      return;
    }
    section.dataset.productSpecificationsBound = "true";

    const dropdown = getElement("[data-product-specifications-dropdown]");
    const menu = getElement("[data-product-specifications-category-menu]");
    getElement("[data-product-specifications-toggle]")?.addEventListener("click", () => {
      setCategoryMenuOpen(!isCategoryMenuOpen());
    });
    menu?.addEventListener("click", (event) => {
      const option = event.target instanceof Element
        ? event.target.closest("[data-product-specifications-value]")
        : null;
      if (option) {
        selectCategory(option.dataset.productSpecificationsValue);
      }
    });
    menu?.addEventListener("keydown", (event) => {
      const options = Array.from(menu.querySelectorAll(".sa-choice-option"));
      const index = options.indexOf(document.activeElement);
      let next = -1;
      if (event.key === "ArrowDown") {
        next = Math.min(options.length - 1, index + 1);
      } else if (event.key === "ArrowUp") {
        next = Math.max(0, index - 1);
      } else if (event.key === "Home") {
        next = 0;
      } else if (event.key === "End") {
        next = options.length - 1;
      } else if (event.key === "Tab") {
        setCategoryMenuOpen(false);
        return;
      }
      if (next >= 0) {
        event.preventDefault();
        options[next]?.focus();
      }
    });
    document.addEventListener("pointerdown", (event) => {
      if (isCategoryMenuOpen() && !(event.target instanceof Node && dropdown?.contains(event.target))) {
        setCategoryMenuOpen(false);
      }
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && isCategoryMenuOpen()) {
        setCategoryMenuOpen(false, { focusTrigger: true });
      }
    });

    const rowsContainer = getElement("[data-product-specifications-rows]");
    rowsContainer?.addEventListener("input", (event) => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement) || !input.dataset.field) {
        return;
      }
      const rowIndex = getRowIndex(input);
      if (rowIndex < 0) {
        return;
      }
      state.draftRows[rowIndex][input.dataset.field] = input.value;
      setFeedback("");
      syncActionState();
    });
    rowsContainer?.addEventListener("click", (event) => {
      const removeButton = event.target instanceof Element
        ? event.target.closest('[data-action="remove"]')
        : null;
      if (!removeButton) {
        return;
      }
      const rowIndex = getRowIndex(removeButton);
      if (rowIndex < 0) {
        return;
      }
      state.draftRows.splice(rowIndex, 1);
      renderRows();
    });

    getElement("[data-product-specifications-add]")?.addEventListener("click", () => {
      if (state.draftRows.length >= MAX_OPTIONS) {
        return;
      }
      state.draftRows.push({ key: "", label: "", placeholder: "" });
      renderRows();
      getElement(`[data-row-index="${state.draftRows.length - 1}"] [data-field="label"]`)?.focus();
    });
    getElement("[data-product-specifications-save]")?.addEventListener("click", () => {
      void save();
    });
    getElement("[data-product-specifications-reset]")?.addEventListener("click", () => {
      void resetToCode();
    });
  }

  async function load(options = {}) {
    bind();
    if (state.loading || (state.loaded && !options.force)) {
      return;
    }

    const rowsContainer = getElement("[data-product-specifications-rows]");
    state.loading = true;
    try {
      const response = await fetch("/api/super-admin/product-specifications", {
        headers: headers(),
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "Unable to load specifications.");
      }
      render(data);
      state.loaded = true;
    } catch (error) {
      if (rowsContainer) {
        renderState(rowsContainer, "Unable to load specifications. Refresh to try again.");
      }
    } finally {
      state.loading = false;
    }
  }

  window.SuperAdminProductSpecifications = {
    load,
    get loading() {
      return state.loading;
    },
  };
})();
