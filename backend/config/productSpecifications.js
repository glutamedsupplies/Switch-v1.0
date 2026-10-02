// Product specifications per category.
//
// The seller "Add Listing" dropdown only shows the specifications of the listing's
// primary (first selected) category, and each variant uses the same list.
// The Super Admin "Specifications" page shows what is configured here.
//
// To add specifications for a category, add (or edit) an entry in
// PRODUCT_SPECIFICATIONS_BY_CATEGORY. The category name must match the name
// created in Super Admin > Business Type (not case-sensitive).
//
// Each specification:
//   - key:         unique within the category, lowercase, no spaces (never rename once used)
//   - label:       text shown in the dropdown
//   - placeholder: example value shown inside the value input
//   - maxLength:   optional, max characters for the value (defaults to 120)
//
// Categories that are not listed use DEFAULT_PRODUCT_SPECIFICATIONS.
//
// Super Admin > Specifications can also edit the list of any category. Those edits are
// saved to backend/data/product_specifications.json and take priority over this file;
// "Reset to code list" in Super Admin removes the saved edit again.
const fs = require("fs");
const path = require("path");

const PRODUCT_SPECIFICATIONS_BY_CATEGORY = {
  Drinks: [
    { key: "size", label: "Size", placeholder: "e.g. 16 oz / Grande" },
    { key: "temperature", label: "Temperature", placeholder: "e.g. Iced / Hot" },
    { key: "sugar_level", label: "Sugar Level", placeholder: "e.g. 50%" },
    { key: "flavor", label: "Flavor", placeholder: "e.g. Mango" },
    { key: "volume", label: "Volume", placeholder: "e.g. 500 ml" },
    { key: "caffeine", label: "Caffeine", placeholder: "e.g. With caffeine / Decaf" },
  ],
  Meals: [
    { key: "serving_size", label: "Serving Size", placeholder: "e.g. Good for 2" },
    { key: "main_ingredient", label: "Main Ingredient", placeholder: "e.g. Chicken" },
    { key: "spice_level", label: "Spice Level", placeholder: "e.g. Mild" },
    { key: "rice", label: "Rice", placeholder: "e.g. With plain rice" },
    { key: "preparation_time", label: "Preparation Time", placeholder: "e.g. 15 minutes" },
    { key: "allergens", label: "Allergens", placeholder: "e.g. Contains peanuts" },
  ],
  Desserts: [
    { key: "size", label: "Size", placeholder: "e.g. 6 inches / Slice" },
    { key: "flavor", label: "Flavor", placeholder: "e.g. Chocolate" },
    { key: "serving_size", label: "Serving Size", placeholder: "e.g. Good for 8" },
    { key: "sweetness", label: "Sweetness", placeholder: "e.g. Less sweet" },
    { key: "allergens", label: "Allergens", placeholder: "e.g. Contains dairy" },
  ],
  Soup: [
    { key: "size", label: "Size", placeholder: "e.g. Bowl / Pot" },
    { key: "serving_size", label: "Serving Size", placeholder: "e.g. Good for 3" },
    { key: "main_ingredient", label: "Main Ingredient", placeholder: "e.g. Pork" },
    { key: "spice_level", label: "Spice Level", placeholder: "e.g. Mild" },
    { key: "allergens", label: "Allergens", placeholder: "e.g. Contains shrimp" },
  ],
  Apparel: [
    { key: "size", label: "Size", placeholder: "e.g. Medium" },
    { key: "color", label: "Color", placeholder: "e.g. Black" },
    { key: "material", label: "Material", placeholder: "e.g. 100% cotton" },
    { key: "fit", label: "Fit", placeholder: "e.g. Regular fit" },
    { key: "brand", label: "Brand", placeholder: "e.g. Uniqlo" },
    { key: "gender", label: "Gender", placeholder: "e.g. Unisex" },
  ],
  Phones: [
    { key: "brand", label: "Brand", placeholder: "e.g. Samsung" },
    { key: "model", label: "Model", placeholder: "e.g. Galaxy A55 5G" },
    { key: "storage", label: "Storage", placeholder: "e.g. 128 GB" },
    { key: "color", label: "Color", placeholder: "e.g. Midnight black" },
    { key: "warranty", label: "Warranty", placeholder: "e.g. 1 year local warranty" },
  ],
};

const DEFAULT_PRODUCT_SPECIFICATIONS = [
  { key: "brand", label: "Brand", placeholder: "e.g. Samsung" },
  { key: "model", label: "Model", placeholder: "e.g. Galaxy A55 5G" },
  { key: "sku", label: "SKU", placeholder: "e.g. SAM-A55-128-BLK" },
  { key: "warranty", label: "Warranty", placeholder: "e.g. 1 year local warranty" },
  { key: "material", label: "Material", placeholder: "e.g. Stainless steel" },
  { key: "color", label: "Color", placeholder: "e.g. Midnight black" },
  { key: "size", label: "Size", placeholder: "e.g. Medium / 42 mm" },
  { key: "weight", label: "Weight", placeholder: "e.g. 250 g" },
  { key: "dimensions", label: "Dimensions", placeholder: "e.g. 15 x 7 x 0.8 cm" },
  { key: "country_of_origin", label: "Country of Origin", placeholder: "e.g. Philippines" },
];

// Capped by how many specifications the category has.
const MIN_REQUIRED_PRODUCT_SPECIFICATIONS = 3;
const MIN_REQUIRED_VARIANT_SPECIFICATIONS = 1;
const DEFAULT_SPECIFICATION_VALUE_MAX_LENGTH = 120;

function normalizeSpecificationKey(value) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeCategoryKey(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim().toLowerCase();
}

function normalizeSpecificationOptions(options) {
  const seenKeys = new Set();
  const normalized = [];
  for (const option of Array.isArray(options) ? options : []) {
    const key = normalizeSpecificationKey(option?.key);
    const label = String(option?.label ?? "").trim();
    if (!key || !label || seenKeys.has(key)) {
      continue;
    }
    seenKeys.add(key);
    const maxLength = Number(option?.maxLength);
    normalized.push({
      key,
      label,
      placeholder: String(option?.placeholder ?? "").trim(),
      maxLength: Number.isInteger(maxLength) && maxLength > 0
        ? maxLength
        : DEFAULT_SPECIFICATION_VALUE_MAX_LENGTH,
    });
  }
  return normalized;
}

function buildSpecificationSettings(name, options, isDefault, source = "code") {
  const normalizedOptions = normalizeSpecificationOptions(options);
  return {
    name,
    key: isDefault ? "" : normalizeCategoryKey(name),
    isDefault,
    source,
    options: normalizedOptions,
    minRequired: Math.min(MIN_REQUIRED_PRODUCT_SPECIFICATIONS, normalizedOptions.length),
    variantMinRequired: Math.min(MIN_REQUIRED_VARIANT_SPECIFICATIONS, normalizedOptions.length),
  };
}

// Super Admin edits, loaded from the storage file. Keyed by normalized category name;
// DEFAULT_STORED_KEY holds an edited default list.
const DEFAULT_STORED_KEY = "__default__";
const MAX_EDITABLE_SPECIFICATION_OPTIONS = 30;
const MAX_SPECIFICATION_LABEL_LENGTH = 60;
const MAX_SPECIFICATION_PLACEHOLDER_LENGTH = 80;
const MAX_SPECIFICATION_VALUE_LENGTH = 500;
let storageFilePath = "";
let storedSpecifications = new Map();

function readStoredSpecificationsFile(filePath) {
  const stored = new Map();
  let decoded = null;
  try {
    decoded = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return stored;
  }
  for (const entry of Array.isArray(decoded?.categories) ? decoded.categories : []) {
    const name = String(entry?.name ?? "").replace(/\s+/g, " ").trim();
    const key = entry?.isDefault ? DEFAULT_STORED_KEY : normalizeCategoryKey(name);
    if (!key || !Array.isArray(entry?.options)) {
      continue;
    }
    stored.set(key, {
      name: entry?.isDefault ? "Default" : name,
      isDefault: Boolean(entry?.isDefault),
      options: normalizeSpecificationOptions(entry.options),
      updatedAt: String(entry?.updatedAt ?? ""),
    });
  }
  return stored;
}

function configureProductSpecificationStorage(filePath) {
  storageFilePath = String(filePath ?? "");
  storedSpecifications = storageFilePath ? readStoredSpecificationsFile(storageFilePath) : new Map();
}

async function writeStoredSpecifications(nextStored) {
  if (!storageFilePath) {
    throw new Error("Specification storage is not configured.");
  }
  const payload = {
    categories: [...nextStored.values()].map((entry) => ({
      name: entry.name,
      isDefault: entry.isDefault,
      options: entry.options,
      updatedAt: entry.updatedAt,
    })),
  };
  await fs.promises.mkdir(path.dirname(storageFilePath), { recursive: true });
  const temporaryPath = `${storageFilePath}.${process.pid}-${Date.now()}.tmp`;
  try {
    await fs.promises.writeFile(temporaryPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    await fs.promises.rename(temporaryPath, storageFilePath);
  } finally {
    await fs.promises.unlink(temporaryPath).catch(() => {});
  }
  storedSpecifications = nextStored;
}

function createSpecificationInputError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function slugifySpecificationLabel(label) {
  return String(label ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

// Validates a list typed in Super Admin. Existing keys are kept so saved listing
// values stay attached; new rows get a key generated from the label.
function sanitizeEditableSpecificationOptions(options) {
  if (!Array.isArray(options)) {
    throw createSpecificationInputError("Specifications must be a list.");
  }
  if (options.length > MAX_EDITABLE_SPECIFICATION_OPTIONS) {
    throw createSpecificationInputError(
      `A category can have at most ${MAX_EDITABLE_SPECIFICATION_OPTIONS} specifications.`,
    );
  }

  const usedKeys = new Set();
  const usedLabels = new Set();
  return options.map((option, index) => {
    const label = String(option?.label ?? "").replace(/\s+/g, " ").trim();
    if (!label) {
      throw createSpecificationInputError(`Specification ${index + 1} needs a name.`);
    }
    if (label.length > MAX_SPECIFICATION_LABEL_LENGTH) {
      throw createSpecificationInputError(
        `"${label.slice(0, 20)}…" is too long (max ${MAX_SPECIFICATION_LABEL_LENGTH} characters).`,
      );
    }
    const labelKey = label.toLowerCase();
    if (usedLabels.has(labelKey)) {
      throw createSpecificationInputError(`"${label}" is listed more than once.`);
    }
    usedLabels.add(labelKey);

    const requestedKey = normalizeSpecificationKey(option?.key);
    let key = /^[a-z0-9_]{1,40}$/.test(requestedKey) ? requestedKey : slugifySpecificationLabel(label);
    if (!key) {
      key = `spec_${index + 1}`;
    }
    const baseKey = key;
    let suffix = 2;
    while (usedKeys.has(key)) {
      key = `${baseKey}_${suffix}`;
      suffix += 1;
    }
    usedKeys.add(key);

    const maxLength = Number(option?.maxLength);
    return {
      key,
      label,
      placeholder: String(option?.placeholder ?? "").trim().slice(0, MAX_SPECIFICATION_PLACEHOLDER_LENGTH),
      maxLength: Number.isInteger(maxLength) && maxLength > 0
        ? Math.min(maxLength, MAX_SPECIFICATION_VALUE_LENGTH)
        : DEFAULT_SPECIFICATION_VALUE_MAX_LENGTH,
    };
  });
}

async function saveCategorySpecifications(categoryName, options, { isDefault = false } = {}) {
  const name = isDefault ? "Default" : String(categoryName ?? "").replace(/\s+/g, " ").trim();
  const key = isDefault ? DEFAULT_STORED_KEY : normalizeCategoryKey(name);
  if (!key) {
    throw createSpecificationInputError("Choose a category first.");
  }
  const sanitizedOptions = sanitizeEditableSpecificationOptions(options);
  const nextStored = new Map(storedSpecifications);
  nextStored.set(key, {
    name,
    isDefault,
    options: sanitizedOptions,
    updatedAt: new Date().toISOString(),
  });
  await writeStoredSpecifications(nextStored);
  return isDefault ? getDefaultSpecificationSettings() : resolveCategorySpecificationSettings(name);
}

async function resetCategorySpecifications(categoryName, { isDefault = false } = {}) {
  const key = isDefault ? DEFAULT_STORED_KEY : normalizeCategoryKey(categoryName);
  if (!key || !storedSpecifications.has(key)) {
    return false;
  }
  const nextStored = new Map(storedSpecifications);
  nextStored.delete(key);
  await writeStoredSpecifications(nextStored);
  return true;
}

function getCodeCategoryNames() {
  return new Set(
    Object.keys(PRODUCT_SPECIFICATIONS_BY_CATEGORY).map((name) => normalizeCategoryKey(name)),
  );
}

function getCategorySpecificationSettingsList() {
  const seenKeys = new Set();
  const list = [];
  for (const [key, entry] of storedSpecifications) {
    if (key === DEFAULT_STORED_KEY || seenKeys.has(key)) {
      continue;
    }
    seenKeys.add(key);
    list.push(buildSpecificationSettings(entry.name, entry.options, false, "custom"));
  }
  for (const [name, options] of Object.entries(PRODUCT_SPECIFICATIONS_BY_CATEGORY)) {
    const displayName = String(name ?? "").replace(/\s+/g, " ").trim();
    const key = normalizeCategoryKey(displayName);
    if (!key || seenKeys.has(key)) {
      continue;
    }
    seenKeys.add(key);
    list.push(buildSpecificationSettings(displayName, options, false, "code"));
  }
  const codeCategoryKeys = getCodeCategoryNames();
  return list.map((settings) => ({ ...settings, hasCodeList: codeCategoryKeys.has(settings.key) }));
}

function getDefaultSpecificationSettings() {
  const storedDefault = storedSpecifications.get(DEFAULT_STORED_KEY);
  return storedDefault
    ? buildSpecificationSettings("Default", storedDefault.options, true, "custom")
    : buildSpecificationSettings("Default", DEFAULT_PRODUCT_SPECIFICATIONS, true, "code");
}

function resolveCategorySpecificationSettings(categoryName) {
  const categoryKey = normalizeCategoryKey(categoryName);
  const categorySettings = categoryKey
    ? getCategorySpecificationSettingsList().find((settings) => settings.key === categoryKey)
    : null;
  return categorySettings || getDefaultSpecificationSettings();
}

function getProductSpecificationConfig() {
  return {
    minRequired: MIN_REQUIRED_PRODUCT_SPECIFICATIONS,
    variantMinRequired: MIN_REQUIRED_VARIANT_SPECIFICATIONS,
    defaultSettings: getDefaultSpecificationSettings(),
    categories: getCategorySpecificationSettingsList(),
  };
}

// Keeps only specifications defined for the category, one per key, with a non-empty value.
function normalizeProductSpecifications(value, categoryName) {
  const optionsByKey = new Map(
    resolveCategorySpecificationSettings(categoryName).options.map((option) => [option.key, option]),
  );
  const seenKeys = new Set();
  const specifications = [];
  for (const entry of Array.isArray(value) ? value : []) {
    const key = normalizeSpecificationKey(entry?.key);
    const option = optionsByKey.get(key);
    if (!option || seenKeys.has(key)) {
      continue;
    }
    const specValue = String(entry?.value ?? "").trim().slice(0, option.maxLength);
    if (!specValue) {
      continue;
    }
    seenKeys.add(key);
    specifications.push({ key, label: option.label, value: specValue });
  }
  return specifications;
}

function assertProductSpecificationsComplete(product) {
  const settings = resolveCategorySpecificationSettings(product?.category);
  const categoryLabel = settings.isDefault ? "this category" : settings.name;
  const count = Array.isArray(product?.specifications) ? product.specifications.length : 0;
  if (count < settings.minRequired) {
    throw new Error(
      `Add at least ${settings.minRequired} specifications for ${categoryLabel} (currently ${count}).`,
    );
  }

  const variants = Array.isArray(product?.variants) ? product.variants : [];
  variants.forEach((variant, index) => {
    const variantCount = Array.isArray(variant?.specifications) ? variant.specifications.length : 0;
    if (variantCount < settings.variantMinRequired) {
      throw new Error(
        `Variant ${index + 1} needs at least ${settings.variantMinRequired} `
        + `specification${settings.variantMinRequired === 1 ? "" : "s"} for ${categoryLabel}.`,
      );
    }
  });
}

module.exports = {
  PRODUCT_SPECIFICATIONS_BY_CATEGORY,
  DEFAULT_PRODUCT_SPECIFICATIONS,
  MIN_REQUIRED_PRODUCT_SPECIFICATIONS,
  MIN_REQUIRED_VARIANT_SPECIFICATIONS,
  getProductSpecificationConfig,
  resolveCategorySpecificationSettings,
  normalizeProductSpecifications,
  assertProductSpecificationsComplete,
  configureProductSpecificationStorage,
  saveCategorySpecifications,
  resetCategorySpecifications,
};
