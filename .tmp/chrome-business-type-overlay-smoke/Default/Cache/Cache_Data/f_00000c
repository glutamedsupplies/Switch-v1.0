const rootLoginWorkspaceColorStorageKey = "gms-workspace-color";

applyRootLoginWorkspaceColor();

if (window.lucide && typeof window.lucide.createIcons === "function") {
  window.lucide.createIcons();
}

const rootLoginForm = document.getElementById("root-login-form");
const rootLoginFeedback = document.getElementById("root-login-feedback");
const rootIdentifierInput = document.getElementById("root-login-identifier-input");
const rootPasswordInput = document.getElementById("root-login-password-input");
const rootSubmitButton = document.getElementById("root-login-submit-button");
const rootSubmitLabel = rootSubmitButton.querySelector("[data-root-submit-label]");
const rootSubmitSpinner = rootSubmitButton.querySelector("[data-root-submit-spinner]");
const rootStatusModalOverlay = document.getElementById("root-login-status-modal-overlay");
const rootStatusModalDialog = document.querySelector(".root-login-status-modal");
const rootStatusModalClose = document.getElementById("root-login-status-modal-close");
const rootStatusModalIcon = document.getElementById("root-login-status-modal-icon");
const rootStatusModalTitle = document.getElementById("root-login-status-modal-title");
const rootStatusModalCopy = document.getElementById("root-login-status-modal-copy");
const rootStatusModalActions = document.querySelector(".root-login-status-modal__actions");
const rootStatusModalAction = document.getElementById("root-login-status-modal-action");
const rootStatusModalSecondaryAction = document.getElementById(
  "root-login-status-modal-secondary-action",
);
const rootValidationStateClassNames = ["is-error"];
const rootLoginLottiePlayerUrl = "/vendor/lottie.min.js";
const rootLoginSuccessAnimationPath = "/animations/employee-account-check.json";
const rootLoginSuccessModalMs = 2000;
let rootLoginLottieLoadPromise = null;
let rootLoginSuccessAnimation = null;
let rootStatusModalHideTimer = 0;

function parseRootLoginHexColor(color) {
  const match = String(color || "").trim().match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!match) {
    return null;
  }

  return {
    r: Number.parseInt(match[1], 16),
    g: Number.parseInt(match[2], 16),
    b: Number.parseInt(match[3], 16),
  };
}

function getSavedRootLoginWorkspaceColor() {
  try {
    const savedColor = String(
      window.localStorage.getItem(rootLoginWorkspaceColorStorageKey) || "",
    ).trim().toLowerCase();
    return parseRootLoginHexColor(savedColor) ? savedColor : "";
  } catch (error) {
    return "";
  }
}

function mixRootLoginColor(rgb, amount) {
  return {
    r: Math.max(0, Math.round(rgb.r * (1 - amount))),
    g: Math.max(0, Math.round(rgb.g * (1 - amount))),
    b: Math.max(0, Math.round(rgb.b * (1 - amount))),
  };
}

function toRootLoginRgbValue(rgb) {
  return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
}

function getRootLoginContrastColor(rgb) {
  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return brightness >= 150 ? "#111827" : "#ffffff";
}

function syncRootLoginAccentVariables(color) {
  const rgb = parseRootLoginHexColor(color);
  if (!rgb) {
    return;
  }

  const hoverRgb = mixRootLoginColor(rgb, 0.18);
  const root = document.documentElement;
  root.style.setProperty("--accent", toRootLoginRgbValue(rgb));
  root.style.setProperty("--accent-rgb", `${rgb.r}, ${rgb.g}, ${rgb.b}`);
  root.style.setProperty("--accent-text", toRootLoginRgbValue(hoverRgb));
  root.style.setProperty("--accent-button-bg", toRootLoginRgbValue(rgb));
  root.style.setProperty("--accent-button-hover-bg", toRootLoginRgbValue(hoverRgb));
  root.style.setProperty("--accent-contrast", getRootLoginContrastColor(rgb));
}

function applyRootLoginWorkspaceColor() {
  const savedColor = getSavedRootLoginWorkspaceColor();
  if (!savedColor) {
    return;
  }

  if (window.WebTheme?.applyTheme && window.WebTheme?.hexToTheme) {
    window.WebTheme.applyTheme({
      mode: "solid",
      theme: window.WebTheme.hexToTheme(savedColor),
    });
    return;
  }

  syncRootLoginAccentVariables(savedColor);
}

function setRootFeedback(message, mode) {
  rootLoginFeedback.textContent = message;
  rootLoginFeedback.className = "feedback-note";
  if (mode) {
    rootLoginFeedback.classList.add(mode);
  }
}

function setRootSubmitLoading(isLoading) {
  const loading = Boolean(isLoading);
  rootSubmitButton.disabled = loading;
  rootSubmitButton.setAttribute("aria-disabled", loading ? "true" : "false");
  rootSubmitButton.setAttribute("aria-busy", loading ? "true" : "false");
  rootSubmitButton.classList.toggle("is-loading", loading);
  if (rootSubmitSpinner instanceof HTMLElement) {
    rootSubmitSpinner.hidden = !loading;
  }
  rootSubmitLabel.textContent = loading ? "Signing in..." : "Sign in";
}

function destroyRootLoginSuccessAnimation() {
  if (rootLoginSuccessAnimation?.destroy) {
    rootLoginSuccessAnimation.destroy();
  }
  rootLoginSuccessAnimation = null;
}

function ensureRootLoginLottiePlayer() {
  if (window.lottie?.loadAnimation) {
    return Promise.resolve(true);
  }

  if (rootLoginLottieLoadPromise) {
    return rootLoginLottieLoadPromise;
  }

  rootLoginLottieLoadPromise = new Promise((resolve) => {
    const existingScript = document.querySelector(
      `script[src$="${rootLoginLottiePlayerUrl}"], script[src*="${rootLoginLottiePlayerUrl}?"]`,
    );

    if (existingScript) {
      existingScript.addEventListener(
        "load",
        () => resolve(Boolean(window.lottie?.loadAnimation)),
        { once: true },
      );
      existingScript.addEventListener("error", () => resolve(false), { once: true });
      if (window.lottie?.loadAnimation) {
        resolve(true);
      }
      return;
    }

    const scriptElement = document.createElement("script");
    scriptElement.src = rootLoginLottiePlayerUrl;
    scriptElement.async = true;
    scriptElement.addEventListener(
      "load",
      () => resolve(Boolean(window.lottie?.loadAnimation)),
      { once: true },
    );
    scriptElement.addEventListener("error", () => resolve(false), { once: true });
    document.head.appendChild(scriptElement);
  });

  return rootLoginLottieLoadPromise;
}

async function playRootLoginSuccessAnimation() {
  const container = rootStatusModalIcon?.querySelector("[data-root-login-success-lottie]");
  if (!(container instanceof HTMLElement)) {
    return;
  }

  destroyRootLoginSuccessAnimation();
  container.innerHTML = "";

  const canUseLottie = await ensureRootLoginLottiePlayer();
  if (
    !canUseLottie ||
    !window.lottie?.loadAnimation ||
    !container.isConnected ||
    rootStatusModalOverlay?.hidden
  ) {
    container.innerHTML = '<i data-lucide="check-circle-2"></i>';
    refreshRootLoginIcons(container);
    return;
  }

  rootLoginSuccessAnimation = window.lottie.loadAnimation({
    container,
    renderer: "svg",
    loop: false,
    autoplay: true,
    path: rootLoginSuccessAnimationPath,
  });
}

function setRootStatusModalMode(mode) {
  if (!(rootStatusModalIcon instanceof HTMLElement)) {
    return;
  }

  if (rootStatusModalDialog instanceof HTMLElement) {
    rootStatusModalDialog.classList.toggle("root-login-status-modal--danger", mode === "error");
    rootStatusModalDialog.classList.toggle("root-login-status-modal--success", mode === "success");
  }
  if (rootStatusModalOverlay instanceof HTMLElement) {
    rootStatusModalOverlay.classList.toggle(
      "root-login-status-modal-overlay--danger",
      mode === "error",
    );
  }
  if (rootStatusModalClose instanceof HTMLButtonElement) {
    rootStatusModalClose.hidden = mode !== "error";
  }

  rootStatusModalIcon.className = "validation-modal__icon";
  if (mode === "success") {
    rootStatusModalIcon.classList.add("validation-modal__icon--success");
    rootStatusModalIcon.innerHTML =
      '<div class="product-validation-lottie-check" data-root-login-success-lottie></div>';
    void playRootLoginSuccessAnimation();
    return;
  }

  destroyRootLoginSuccessAnimation();
  rootStatusModalIcon.classList.add("validation-modal__icon--notice");
  rootStatusModalIcon.innerHTML = '<span class="root-login-status-modal__spinner"></span>';
}

function showRootStatusModal(config = {}) {
  if (
    !(rootStatusModalOverlay instanceof HTMLElement) ||
    !(rootStatusModalTitle instanceof HTMLElement) ||
    !(rootStatusModalCopy instanceof HTMLElement)
  ) {
    return;
  }

  const mode = String(config.mode || "loading").trim().toLowerCase();
  if (rootStatusModalHideTimer) {
    window.clearTimeout(rootStatusModalHideTimer);
    rootStatusModalHideTimer = 0;
  }
  setRootStatusModalMode(mode);
  rootStatusModalTitle.textContent = String(config.title || "Signing In").trim();
  rootStatusModalCopy.textContent = String(config.copy || "Checking your Super Admin access.").trim();
  rootStatusModalCopy.hidden = !rootStatusModalCopy.textContent;
  const showActions = config.hideActions === false;
  if (rootStatusModalActions instanceof HTMLElement) {
    rootStatusModalActions.hidden = !showActions;
  }
  if (rootStatusModalSecondaryAction instanceof HTMLButtonElement) {
    rootStatusModalSecondaryAction.textContent = String(config.secondaryActionLabel || "Cancel").trim();
    rootStatusModalSecondaryAction.hidden = !showActions || config.hideSecondaryAction === true;
  }
  if (rootStatusModalAction instanceof HTMLButtonElement) {
    rootStatusModalAction.textContent = String(config.actionLabel || "Try Again").trim();
    rootStatusModalAction.hidden = !showActions;
  }
  rootStatusModalOverlay.hidden = false;
  rootStatusModalOverlay.setAttribute("aria-hidden", "false");
  window.requestAnimationFrame(() => {
    rootStatusModalOverlay.classList.add("is-open");
    if (rootStatusModalAction instanceof HTMLButtonElement && !rootStatusModalAction.hidden) {
      rootStatusModalAction.focus({ preventScroll: true });
      return;
    }
    rootStatusModalDialog?.focus?.({ preventScroll: true });
  });
}

function hideRootStatusModal() {
  if (!(rootStatusModalOverlay instanceof HTMLElement)) {
    return;
  }

  if (rootStatusModalHideTimer) {
    window.clearTimeout(rootStatusModalHideTimer);
    rootStatusModalHideTimer = 0;
  }
  destroyRootLoginSuccessAnimation();
  rootStatusModalOverlay.classList.remove("is-open");
  rootStatusModalOverlay.setAttribute("aria-hidden", "true");
  rootStatusModalHideTimer = window.setTimeout(() => {
    rootStatusModalOverlay.hidden = true;
    rootStatusModalHideTimer = 0;
  }, 220);
}

function waitForRootLoginSuccessModal() {
  return new Promise((resolve) => {
    window.setTimeout(resolve, rootLoginSuccessModalMs);
  });
}

function closeRootStatusModalAndFocus() {
  hideRootStatusModal();
  rootPasswordInput.focus();
  if (typeof rootPasswordInput.select === "function") {
    rootPasswordInput.select();
  }
}

function refreshRootLoginIcons(root = document) {
  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons({ root });
  }
}

function getRootValidationField(field) {
  const fieldShell = field?.closest?.(".root-login-field");
  return fieldShell instanceof HTMLElement ? fieldShell : null;
}

function getRootValidationControl(field) {
  const control = getRootValidationField(field)?.querySelector(".root-login-field__control");
  return control instanceof HTMLElement ? control : null;
}

function ensureRootFieldValidationUi(field) {
  const fieldShell = getRootValidationField(field);
  const control = getRootValidationControl(field);
  if (!fieldShell || !control) {
    return null;
  }

  let status = control.querySelector(".root-login-field-status");
  if (!(status instanceof HTMLElement)) {
    status = document.createElement("span");
    status.className = "root-login-field-status";
    status.setAttribute("aria-hidden", "true");
    const passwordToggle = control.querySelector(".password-field__toggle");
    if (passwordToggle instanceof HTMLElement) {
      control.insertBefore(status, passwordToggle);
    } else {
      control.append(status);
    }
  }

  let message = fieldShell.querySelector(".root-login-field-message");
  if (!(message instanceof HTMLElement)) {
    message = document.createElement("span");
    message.className = "root-login-field-message";
    message.setAttribute("aria-live", "polite");
    message.id = `${field.id || field.name || "root-login-field"}-validation-message`;
    fieldShell.append(message);
  }

  return { fieldShell, status, message };
}

function setRootFieldState(field, mode = "", messageText = "") {
  const ui = ensureRootFieldValidationUi(field);
  if (!ui) {
    return;
  }

  ui.fieldShell.classList.remove(...rootValidationStateClassNames);
  ui.status.innerHTML = "";
  ui.message.textContent = "";
  ui.fieldShell.classList.remove("has-field-message");
  field.removeAttribute("aria-describedby");
  field.removeAttribute("aria-invalid");

  if (!mode) {
    return;
  }

  ui.fieldShell.classList.add(`is-${mode}`);
  ui.status.innerHTML = `<i data-lucide="${mode === "error" ? "circle-alert" : "info"}"></i>`;
  ui.message.textContent = String(messageText || "").trim();
  ui.fieldShell.classList.toggle("has-field-message", Boolean(ui.message.textContent));
  if (ui.message.textContent) {
    field.setAttribute("aria-describedby", ui.message.id);
  }
  field.setAttribute("aria-invalid", mode === "error" ? "true" : "false");
  refreshRootLoginIcons(ui.status);
}

function clearRootFieldState(field) {
  setRootFieldState(field, "");
}

function focusRootInvalidField(field, message) {
  setRootFeedback("");
  setRootFieldState(field, "error", message);
  if (field instanceof HTMLElement) {
    field.focus();
    if (typeof field.select === "function") {
      field.select();
    }
  }
}

function clearRootValidationState() {
  clearRootFieldState(rootIdentifierInput);
  clearRootFieldState(rootPasswordInput);
}

async function verifyRootLogin(username, password) {
  const response = await fetch("/api/super-admin-login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const loginError = new Error(
      response.status === 401
        ? "Incorrect root credentials. Please try again."
        : data.message || "Unable to sign in root.",
    );
    loginError.status = response.status;
    throw loginError;
  }

  return data;
}

function clearActiveAdminScope() {
  try {
    window.localStorage.removeItem("gms-admin-id");
  } catch (error) {
    console.warn("Unable to clear admin scope.", error);
  }
}

rootLoginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearRootValidationState();
  setRootFeedback("");

  const formData = new FormData(rootLoginForm);
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();

  if (!username) {
    focusRootInvalidField(rootIdentifierInput, "Please enter the root username.");
    return;
  }

  if (!password) {
    focusRootInvalidField(rootPasswordInput, "Please enter the root password.");
    return;
  }

  if (password.length < 6) {
    focusRootInvalidField(rootPasswordInput, "Password must be at least 6 characters long.");
    return;
  }

  setRootSubmitLoading(true);
  setRootFeedback("Checking root account...");

  try {
    const rootLoginData = await verifyRootLogin(username, password);
    setRootSubmitLoading(false);
    const rootSession = {
      ...(rootLoginData.root || {}),
      token: rootLoginData.token,
      role: "root",
      signedInAt: new Date().toISOString(),
    };
    window.sessionStorage.removeItem("gms-admin-session");
    window.sessionStorage.removeItem("gms-employee-session");
    clearActiveAdminScope();
    window.sessionStorage.setItem(
      "gms-super-admin-session",
      JSON.stringify(rootSession),
    );
    const successMessage = rootLoginData.message || "Root login successful.";
    setRootFeedback(successMessage, "success");
    showRootStatusModal({
      mode: "success",
      title: "Access Approved",
      copy: "Super Admin access confirmed. Redirecting to your workspace.",
    });
    await waitForRootLoginSuccessModal();
    window.location.replace(rootLoginData.redirectPath || "/super_admin.html");
  } catch (error) {
    setRootSubmitLoading(false);
    const errorMessage = error instanceof Error ? error.message : "Unable to sign in root.";
    if (error?.status === 401) {
      setRootFieldState(rootIdentifierInput, "error", "Check your username.");
      focusRootInvalidField(rootPasswordInput, errorMessage);
      hideRootStatusModal();
      return;
    }
    hideRootStatusModal();
    setRootFeedback(errorMessage, "error");
  }
});

rootIdentifierInput.addEventListener("input", () => {
  setRootFeedback("");
  clearRootFieldState(rootIdentifierInput);
});
rootPasswordInput.addEventListener("input", () => {
  setRootFeedback("");
  clearRootFieldState(rootPasswordInput);
});
rootStatusModalAction?.addEventListener("click", closeRootStatusModalAndFocus);
rootStatusModalSecondaryAction?.addEventListener("click", closeRootStatusModalAndFocus);
rootStatusModalClose?.addEventListener("click", closeRootStatusModalAndFocus);
rootStatusModalOverlay?.addEventListener("click", (event) => {
  if (
    event.target === rootStatusModalOverlay &&
    rootStatusModalOverlay.querySelector(".validation-modal__icon--error")
  ) {
    closeRootStatusModalAndFocus();
  }
});
document.addEventListener("keydown", (event) => {
  if (
    event.key === "Escape" &&
    rootStatusModalOverlay instanceof HTMLElement &&
    !rootStatusModalOverlay.hidden &&
    rootStatusModalOverlay.querySelector(".validation-modal__icon--error")
  ) {
    closeRootStatusModalAndFocus();
  }
});
