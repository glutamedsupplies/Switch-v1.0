const themeForm = document.getElementById("theme-form");
const themeFeedback = document.getElementById("theme-feedback");
const previewSwatch = document.getElementById("theme-preview-swatch");
const hexValue = document.getElementById("theme-hex-value");
const rgbValue = document.getElementById("theme-rgb-value");
const resetThemeButton = document.getElementById("reset-theme-button");

const colorControls = {
  r: {
    range: document.getElementById("red-range"),
    input: document.getElementById("red-input"),
  },
  g: {
    range: document.getElementById("green-range"),
    input: document.getElementById("green-input"),
  },
  b: {
    range: document.getElementById("blue-range"),
    input: document.getElementById("blue-input"),
  },
};

function setFeedback(message, mode = "") {
  themeFeedback.textContent = message;
  themeFeedback.className = "feedback-note";
  if (mode) {
    themeFeedback.classList.add(mode);
  }
}

function getThemeFromControls() {
  return window.WebTheme.normalizeTheme({
    r: colorControls.r.range.value,
    g: colorControls.g.range.value,
    b: colorControls.b.range.value,
  });
}

function setControls(theme) {
  const normalizedTheme = window.WebTheme.normalizeTheme(theme);

  for (const [channel, controls] of Object.entries(colorControls)) {
    controls.range.value = normalizedTheme[channel];
    controls.input.value = normalizedTheme[channel];
  }

  return normalizedTheme;
}

function updatePreview(theme) {
  const normalizedTheme = window.WebTheme.normalizeTheme(theme);

  window.WebTheme.applyTheme(normalizedTheme);
  previewSwatch.style.background = window.WebTheme.toRgb(normalizedTheme);
  hexValue.textContent = window.WebTheme.rgbToHex(normalizedTheme);
  rgbValue.textContent = `${normalizedTheme.r}, ${normalizedTheme.g}, ${normalizedTheme.b}`;
}

function syncChannel(channel, value) {
  const normalizedTheme = getThemeFromControls();
  normalizedTheme[channel] = value;
  const theme = setControls(normalizedTheme);
  updatePreview(theme);
}

for (const [channel, controls] of Object.entries(colorControls)) {
  controls.range.addEventListener("input", (event) => {
    syncChannel(channel, event.target.value);
    setFeedback("Preview updated. Click Apply Theme to save it.");
  });

  controls.input.addEventListener("input", (event) => {
    syncChannel(channel, event.target.value);
    setFeedback("Preview updated. Click Apply Theme to save it.");
  });
}

themeForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const savedTheme = window.WebTheme.saveTheme(getThemeFromControls());
  setControls(savedTheme);
  updatePreview(savedTheme);
  setFeedback("Theme saved. The whole web server now uses your selected primary color.", "success");
});

resetThemeButton.addEventListener("click", () => {
  const defaultTheme = window.WebTheme.resetTheme();
  setControls(defaultTheme);
  updatePreview(defaultTheme);
  setFeedback("Theme reset to the default primary color.", "success");
});

const initialTheme = setControls(window.WebTheme.loadTheme());
updatePreview(initialTheme);


