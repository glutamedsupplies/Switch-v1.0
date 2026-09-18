const loginWorkspaceColorStorageKey = "gms-workspace-color";

applyLoginWorkspaceColor();
window.addEventListener("storage", (event) => {
  if (event.key === loginWorkspaceColorStorageKey) {
    applyLoginWorkspaceColor();
  }
});

const loginPanelTitle = document.getElementById("login-panel-title");
const loginFeedback = document.getElementById("login-feedback");
const loginForm = document.getElementById("login-form");
const loginPanel = document.getElementById("login-panel");
const languageSelect = document.getElementById("login-language-select");
const languageDropdown = document.querySelector("[data-login-language-dropdown]");
const languageTrigger = document.querySelector("[data-login-language-trigger]");
const languageLabel = document.querySelector("[data-login-language-label]");
const languageMenu = document.querySelector("[data-login-language-menu]");
const languageOptions = Array.from(document.querySelectorAll("[data-login-language-option]"));
const identifierLabel = document.getElementById("login-identifier-label");
const identifierText = document.getElementById("login-identifier-text");
const identifierInput = document.getElementById("login-identifier-input");
const identifierMessage = document.getElementById("login-identifier-message");
const employeeIdStatus = document.getElementById("login-employee-id-status");
const loginPanelSubtitle = document.getElementById("login-panel-subtitle");
const passwordText = document.getElementById("login-password-text");
const passwordLabel = document.getElementById("login-password-label");
const passwordInput = document.getElementById("login-password-input");
const passwordMessage = document.getElementById("login-password-message");
const loginSecurityNoteText = document.getElementById("login-security-note-text");
const loginMetaRow = document.getElementById("login-meta-row");
const savedAccountsLink = document.getElementById("login-saved-accounts-link");
const helpLink = document.getElementById("login-help-link");
const submitButton = document.getElementById("login-submit-button");
const submitButtonLabel = submitButton?.querySelector("[data-login-submit-label]");
const roleButtons = Array.from(document.querySelectorAll("[data-login-role-button]"));
const loginRemembered = document.getElementById("login-remembered");
const loginCredentials = document.getElementById("login-credentials");
const loginRememberedList = document.getElementById("login-remembered-list");
const loginRememberedEmailBtn = document.getElementById("login-remembered-email-btn");
const loginRememberedTitle = document.getElementById("login-remembered-title");
const loginRememberedSubtitle = document.getElementById("login-remembered-subtitle");
const loginRememberedDeleteOverlay = document.getElementById("login-remembered-delete-overlay");
const loginRememberedDeleteModal = document.getElementById("login-remembered-delete-modal");
const loginRememberedDeleteClose = document.getElementById("login-remembered-delete-close");
const loginRememberedDeleteCancel = document.getElementById("login-remembered-delete-cancel");
const loginRememberedDeleteConfirm = document.getElementById("login-remembered-delete-confirm");
const loginRememberedDeleteTitle = document.getElementById("login-remembered-delete-title");
const loginRememberedDeleteCopy = document.getElementById("login-remembered-delete-copy");
const adminBannedModalOverlay = document.getElementById("admin-banned-modal-overlay");
const adminBannedModal = adminBannedModalOverlay?.querySelector(".admin-banned-modal");
const adminBannedModalCopy = document.getElementById("admin-banned-modal-copy");
const adminBannedModalMore = document.getElementById("admin-banned-modal-more");
const adminBannedModalReason = document.getElementById("admin-banned-modal-reason");
const adminBannedModalXClose = document.getElementById("admin-banned-modal-x-close");
const adminBannedCloseButton = document.getElementById("admin-banned-close-button");
const adminBannedSupportButton = document.getElementById("admin-banned-support-button");
const guestActionLabels = Array.from(document.querySelectorAll(".login-guest-label"));
const loginSignupPrompts = Array.from(document.querySelectorAll(".login-signup-prompt"));
const loginSignupLinks = Array.from(document.querySelectorAll(".login-signup-link"));
const loginPrivacyLink = document.getElementById("login-privacy-link");
const loginTermsLink = document.getElementById("login-terms-link");
const loginSupportPrompt = document.getElementById("login-support-prompt");
const loginHelpCentreLink = document.getElementById("login-help-centre-link");
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const employeeIdPattern = /^(?:\d{1,6}|[A-Z0-9]{2,8}-\d{1,6}|[A-Z0-9]{2,8}\d{1,6})$/i;
// Temporarily hide seller/admin workspace: login.html shares buyer entry with login.dart.
const BUYER_APP_MODE = true;
const mainWorkspacePath = BUYER_APP_MODE ? "/main_dart.html" : "/main.html";
const BUYER_SESSION_KEY = "gms-buyer-session";
const LOGIN_LANGUAGE_STORAGE_KEY = "gms-login-language";
const googleVerifyState = {
  active: false,
  idToken: "",
  accessToken: "",
  email: "",
  resendAvailableAt: 0,
  resendTimerId: 0,
  submitting: false,
};

function readPersistedBuyerSession() {
  try {
    const raw =
      window.localStorage.getItem(BUYER_SESSION_KEY)
      || window.sessionStorage.getItem(BUYER_SESSION_KEY)
      || "";
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!session || typeof session !== "object") return null;
    const accountId = String(session.accountId || session.id || "").trim();
    const email = String(session.email || "").trim();
    if (!accountId && !email) return null;
    return session;
  } catch (error) {
    return null;
  }
}

function getLoginDeviceKey() {
  const storageKey = "gms_account_device_key";
  try {
    const existing = String(window.localStorage.getItem(storageKey) || "").trim();
    if (existing) return existing;
    const generated = `web_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(storageKey, generated);
    return generated;
  } catch (error) {
    return "";
  }
}

async function fetchDeviceSessionStatus({ accountId = "", email = "" } = {}) {
  const deviceKey = getLoginDeviceKey();
  if (!deviceKey) return null;
  const params = new URLSearchParams({ deviceKey });
  if (accountId) params.set("accountId", accountId);
  if (email) params.set("email", email);
  try {
    const response = await fetch(`/api/account/devices/status?${params.toString()}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return null;
    return payload;
  } catch (error) {
    return null;
  }
}

function clearPersistedBuyerSession() {
  try {
    window.sessionStorage.removeItem(BUYER_SESSION_KEY);
    window.localStorage.removeItem(BUYER_SESSION_KEY);
  } catch (error) {}
}

function forgetRememberedSellerMatching({ accountId = "", email = "" } = {}) {
  const id = String(accountId || "").trim().toLowerCase();
  const mail = String(email || "").trim().toLowerCase();
  if (!id && !mail) return;
  const next = readRememberedSellerAccounts().filter((entry) => {
    const entryId = String(entry.adminId || entry.id || "").trim().toLowerCase();
    const entryEmail = String(entry.email || "").trim().toLowerCase();
    if (id && entryId && entryId === id) return false;
    if (mail && entryEmail && entryEmail === mail) return false;
    return true;
  });
  writeRememberedSellerAccounts(next);
}

async function forgetRevokedDeviceLogin() {
  const session = readPersistedBuyerSession();
  if (session) {
    const accountId = String(session.accountId || session.id || "").trim();
    const email = String(session.email || "").trim();
    const status = await fetchDeviceSessionStatus({ accountId, email });
    if (status && status.known && status.active === false) {
      clearPersistedBuyerSession();
      forgetRememberedSellerMatching({ accountId, email });
      return true;
    }
  }

  let rememberChanged = false;
  for (const entry of readRememberedSellerAccounts()) {
    const accountId = String(entry.adminId || entry.id || "").trim();
    const email = String(entry.email || "").trim();
    if (!accountId && !email) continue;
    const status = await fetchDeviceSessionStatus({ accountId, email });
    if (status && status.known && status.active === false) {
      forgetRememberedSellerMatching({ accountId, email });
      rememberChanged = true;
    }
  }
  return rememberChanged ? "remember" : false;
}

function redirectAuthenticatedBuyerFromLogin() {
  if (!BUYER_APP_MODE) {
    return false;
  }
  const buyerSession = readPersistedBuyerSession();
  if (!buyerSession) {
    return false;
  }
  window.location.replace(mainWorkspacePath);
  return true;
}

void (async () => {
  const revoked = await forgetRevokedDeviceLogin();
  if (revoked && typeof paintRememberedSellerAccounts === "function") {
    paintRememberedSellerAccounts(readRememberedSellerAccounts(), { forcePaint: true });
  }
  if (revoked !== true) {
    redirectAuthenticatedBuyerFromLogin();
  }
})();

const LOGIN_LANGUAGE_HTML_LANG = {
  en: "en",
  zh: "zh-CN",
  es: "es",
  hi: "hi",
  ar: "ar",
  fr: "fr",
  pt: "pt",
  ru: "ru",
  ja: "ja",
  de: "de",
  ko: "ko",
  vi: "vi",
  id: "id",
  tl: "tl",
  th: "th",
};
const LOGIN_LANGUAGE_ALIASES = {
  fil: "tl",
  tagalog: "tl",
  "zh-cn": "zh",
  "zh-tw": "zh",
  "pt-br": "pt",
  "pt-pt": "pt",
};
let activeRole = BUYER_APP_MODE ? "buyer" : "admin";
let activeLanguage = "en";
let loginValidationFocusTarget = null;
let employeeIdValidationTimer = 0;
let adminEmailValidationTimer = 0;
let employeeIdValidationRequestId = 0;
let adminEmailValidationRequestId = 0;
let employeeIdentifierValidAccount = null;
let adminIdentifierValidAccount = null;
let adminIdentifierValidEmail = "";
let lastInvalidEmployeeIdPopupValue = "";
let lastInvalidAdminEmailPopupValue = "";
let loginValidationLottie = null;

const loginSuccessAnimationPath = "/animations/check-mark.json";
const loginSuccessModalAnimationPath = "/animations/employee-account-check.json";
const LOGIN_SUCCESS_MODAL_AUTO_CLOSE_MS = 2000;
const LOGIN_LOADING_MIN_MS = 1000;
let loginPanelForgotSubmitting = false;
let loginPanelFormSubmitting = false;
const loginValidationErrorIconMarkup = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <circle cx="12" cy="12" r="10"></circle>
    <path d="M12 8v4"></path>
    <path d="M12 16h.01"></path>
  </svg>
`;

function waitLoginMs(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, Math.max(0, Number(ms) || 0));
  });
}

async function ensureLoginLoadingDelay(startedAt, minMs = LOGIN_LOADING_MIN_MS) {
  const elapsed = Date.now() - Number(startedAt || Date.now());
  const remaining = Math.max(0, minMs - elapsed);
  if (remaining > 0) {
    await waitLoginMs(remaining);
  }
}

function parseLoginHexColor(color) {
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

function getSavedLoginWorkspaceColor() {
  try {
    const savedColor = String(
      window.localStorage.getItem(loginWorkspaceColorStorageKey) || "",
    ).trim().toLowerCase();
    return parseLoginHexColor(savedColor) ? savedColor : "";
  } catch (error) {
    return "";
  }
}

function mixLoginColor(rgb, amount) {
  return {
    r: Math.max(0, Math.round(rgb.r * (1 - amount))),
    g: Math.max(0, Math.round(rgb.g * (1 - amount))),
    b: Math.max(0, Math.round(rgb.b * (1 - amount))),
  };
}

function toLoginRgbValue(rgb) {
  return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
}

function getLoginContrastColor(rgb) {
  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return brightness >= 150 ? "#111827" : "#ffffff";
}

function syncLoginAccentVariables(color) {
  const rgb = parseLoginHexColor(color);
  if (!rgb) {
    return;
  }

  const hoverRgb = mixLoginColor(rgb, 0.18);
  const root = document.documentElement;
  root.style.setProperty("--accent", toLoginRgbValue(rgb));
  root.style.setProperty("--accent-rgb", `${rgb.r}, ${rgb.g}, ${rgb.b}`);
  root.style.setProperty("--accent-strong", toLoginRgbValue(hoverRgb));
  root.style.setProperty("--accent-text", toLoginRgbValue(hoverRgb));
  root.style.setProperty("--accent-button-bg", toLoginRgbValue(rgb));
  root.style.setProperty("--accent-button-hover-bg", toLoginRgbValue(hoverRgb));
  root.style.setProperty("--accent-contrast", getLoginContrastColor(rgb));
}

function applyLoginWorkspaceColor() {
  const savedColor = getSavedLoginWorkspaceColor();
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

  syncLoginAccentVariables(savedColor);
}

const loginRoles = {
  buyer: {
    title: "Login to Continue",
    idleMessage: "",
    identifierLabel: "Email",
    identifierName: "email",
    identifierType: "email",
    identifierPlaceholder: "you@gmail.com",
    identifierAutocomplete: "email",
    identifierReadOnly: false,
    autoGenerateIdentifier: false,
    passwordLabel: "Password",
    passwordPlaceholder: "Enter your password",
    passwordAutocomplete: "current-password",
    helpText: "Forgot password?",
    submitText: "Sign in",
    showLoginMeta: true,
    showSecondaryAction: false,
  },
  admin: {
    title: "Login to Continue",
    idleMessage: "",
    identifierLabel: "Seller email or Employee ID",
    identifierName: "identifier",
    identifierType: "text",
    identifierPlaceholder: "Seller email or employee ID",
    identifierAutocomplete: "username",
    identifierReadOnly: false,
    autoGenerateIdentifier: false,
    passwordLabel: "Password",
    passwordPlaceholder: "Enter your password",
    passwordAutocomplete: "current-password",
    helpText: "Forgot password?",
    submitText: "Sign in",
    showLoginMeta: true,
    showSecondaryAction: false,
  },
  employee: {
    title: "Login to Continue",
    idleMessage: "",
    identifierLabel: "Seller email or Employee ID",
    identifierName: "identifier",
    identifierType: "text",
    identifierPlaceholder: "Seller email or employee ID",
    identifierAutocomplete: "username",
    identifierReadOnly: false,
    passwordLabel: "Password",
    passwordPlaceholder: "Enter your password",
    passwordAutocomplete: "current-password",
    helpText: "Need account help?",
    submitText: "Sign in",
    showLoginMeta: true,
    showSecondaryAction: false,
  },
};

const loginTranslations = {
  en: {
    "panel.subtitle": "Sign in to browse Switch shops and products.",
    "remembered.title": "Welcome back",
    "remembered.subtitle.single": "Tap your profile to continue, or sign in with email.",
    "remembered.subtitle.multi": "Choose a saved seller account to continue.",
    "remembered.button.email": "Sign in with email",
    "remembered.detail.saved": "Saved seller account",
    "guest.cta": "Continue as Guest",
    "signup.prompt": "Don't have an account?",
    "signup.link": "Sign up",
    "support.privacy": "Privacy Policy",
    "support.terms": "Terms & Conditions",
    "support.prompt": "Need support?",
    "support.link": "Help Centre",
    "security.note": "Your Switch account keeps orders and favorites in sync.",
    "role.buyer.title": "Login to Continue",
    "role.buyer.identifierLabel": "Email",
    "role.buyer.identifierPlaceholder": "you@gmail.com",
    "role.buyer.passwordLabel": "Password",
    "role.buyer.passwordPlaceholder": "Enter your password",
    "role.buyer.helpText": "Forgot password?",
    "role.buyer.submitText": "Sign in",
    "role.admin.title": "Login to Continue",
    "role.admin.identifierLabel": "Seller email or Employee ID",
    "role.admin.identifierPlaceholder": "Seller email or employee ID",
    "role.admin.passwordLabel": "Password",
    "role.admin.passwordPlaceholder": "Enter your password",
    "role.admin.helpText": "Forgot password?",
    "role.admin.submitText": "Sign in",
    "role.employee.title": "Login to Continue",
    "role.employee.identifierLabel": "Seller email or Employee ID",
    "role.employee.identifierPlaceholder": "Seller email or employee ID",
    "role.employee.passwordLabel": "Password",
    "role.employee.passwordPlaceholder": "Enter your password",
    "role.employee.helpText": "Need account help?",
    "role.employee.submitText": "Sign in",
    "forgot.email.label": "Email address",
    "forgot.email.placeholder": "you@gmail.com",
    "forgot.password.label": "New password",
    "forgot.password.placeholder": "8+ chars, 1 uppercase, 1 number",
    "forgot.confirm.label": "Confirm password",
    "forgot.confirm.placeholder": "Re-enter new password",
    "forgot.step.email.title": "Forgot password",
    "forgot.step.email.subtitle": "Enter your registered Gmail and we will send a reset code.",
    "forgot.step.code.title": "Enter reset code",
    "forgot.step.code.subtitle": "Enter the 6-digit code we sent.",
    "forgot.step.password.title": "Create new password",
    "forgot.step.password.subtitle": "Choose a new password for your Switch seller account.",
    "forgot.submit.send": "Send code",
    "forgot.submit.update": "Update password",
    "forgot.back.cancel": "Cancel",
    "forgot.code.hint.default": "Enter the 6-digit code.",
    "forgot.code.hint.sent": "Code sent to {email}",
    "forgot.resend.default": "Resend code",
    "feedback.checkingSeller": "Checking seller account...",
    "feedback.checkingEmployee": "Checking employee account...",
    "feedback.google.adminOnly": "Google sign-in is available for seller admin accounts.",
    "feedback.google.unavailable": "Google sign-in helper is not loaded.",
    "feedback.method.comingSoon": "This sign-in method is coming soon for seller accounts.",
  },
  zh: {
    "panel.subtitle": "登录以继续进入您的平台工作区。",
    "remembered.title": "欢迎回来",
    "remembered.subtitle.single": "点按您的资料继续，或使用邮箱登录。",
    "remembered.subtitle.multi": "选择已保存的卖家账户以继续。",
    "remembered.button.email": "使用邮箱登录",
    "remembered.detail.saved": "已保存的卖家账户",
    "guest.cta": "以访客身份继续",
    "signup.prompt": "还没有账户？",
    "signup.link": "注册",
    "support.privacy": "隐私政策",
    "support.terms": "条款与条件",
    "support.prompt": "需要帮助？",
    "support.link": "帮助中心",
    "security.note": "仅供授权平台管理员使用的受保护访问。",
    "role.admin.title": "登录以继续",
    "role.admin.identifierLabel": "卖家邮箱或员工 ID",
    "role.admin.identifierPlaceholder": "卖家邮箱或员工 ID",
    "role.admin.passwordLabel": "密码",
    "role.admin.passwordPlaceholder": "输入您的密码",
    "role.admin.helpText": "忘记密码？",
    "role.admin.submitText": "登录",
    "role.employee.title": "登录以继续",
    "role.employee.identifierLabel": "卖家邮箱或员工 ID",
    "role.employee.identifierPlaceholder": "卖家邮箱或员工 ID",
    "role.employee.passwordLabel": "密码",
    "role.employee.passwordPlaceholder": "输入您的密码",
    "role.employee.helpText": "需要账户帮助？",
    "role.employee.submitText": "登录",
    "forgot.email.label": "电子邮箱",
    "forgot.email.placeholder": "you@gmail.com",
    "forgot.password.label": "新密码",
    "forgot.password.placeholder": "至少8位，含1个大写字母和1个数字",
    "forgot.confirm.label": "确认密码",
    "forgot.confirm.placeholder": "再次输入新密码",
    "forgot.step.email.title": "忘记密码",
    "forgot.step.email.subtitle": "输入您注册的 Gmail，我们将发送重置验证码。",
    "forgot.step.code.title": "输入重置验证码",
    "forgot.step.code.subtitle": "输入我们发送的6位验证码。",
    "forgot.step.password.title": "创建新密码",
    "forgot.step.password.subtitle": "为您的 Switch 卖家账户选择新密码。",
    "forgot.submit.send": "发送验证码",
    "forgot.submit.update": "更新密码",
    "forgot.back.cancel": "取消",
    "forgot.code.hint.default": "输入6位验证码。",
    "forgot.code.hint.sent": "验证码已发送至 {email}",
    "forgot.resend.default": "重新发送验证码",
    "feedback.checkingSeller": "正在检查卖家账户...",
    "feedback.checkingEmployee": "正在检查员工账户...",
    "feedback.google.adminOnly": "Google 登录仅适用于卖家管理员账户。",
    "feedback.google.unavailable": "Google 登录助手未加载。",
    "feedback.method.comingSoon": "此登录方式即将面向卖家账户推出。",
  },
  es: {
    "panel.subtitle": "Inicia sesión para continuar a tu espacio de trabajo.",
    "remembered.title": "Bienvenido de nuevo",
    "remembered.subtitle.single": "Toca tu perfil para continuar, o inicia sesión con el correo.",
    "remembered.subtitle.multi": "Elige una cuenta de vendedor guardada para continuar.",
    "remembered.button.email": "Iniciar sesión con correo",
    "remembered.detail.saved": "Cuenta de vendedor guardada",
    "guest.cta": "Continuar como invitado",
    "signup.prompt": "¿No tienes una cuenta?",
    "signup.link": "Registrarse",
    "support.privacy": "Política de privacidad",
    "support.terms": "Términos y condiciones",
    "support.prompt": "¿Necesitas ayuda?",
    "support.link": "Centro de ayuda",
    "security.note": "Acceso protegido solo para administradores autorizados de la plataforma.",
    "role.admin.title": "Inicia sesión para continuar",
    "role.admin.identifierLabel": "Correo del vendedor o ID de empleado",
    "role.admin.identifierPlaceholder": "Correo del vendedor o ID de empleado",
    "role.admin.passwordLabel": "Contraseña",
    "role.admin.passwordPlaceholder": "Introduce tu contraseña",
    "role.admin.helpText": "¿Olvidaste la contraseña?",
    "role.admin.submitText": "Iniciar sesión",
    "role.employee.title": "Inicia sesión para continuar",
    "role.employee.identifierLabel": "Correo del vendedor o ID de empleado",
    "role.employee.identifierPlaceholder": "Correo del vendedor o ID de empleado",
    "role.employee.passwordLabel": "Contraseña",
    "role.employee.passwordPlaceholder": "Introduce tu contraseña",
    "role.employee.helpText": "¿Necesitas ayuda con la cuenta?",
    "role.employee.submitText": "Iniciar sesión",
    "forgot.email.label": "Correo electrónico",
    "forgot.email.placeholder": "you@gmail.com",
    "forgot.password.label": "Nueva contraseña",
    "forgot.password.placeholder": "8+ caracteres, 1 mayúscula, 1 número",
    "forgot.confirm.label": "Confirmar contraseña",
    "forgot.confirm.placeholder": "Vuelve a introducir la nueva contraseña",
    "forgot.step.email.title": "Olvidé la contraseña",
    "forgot.step.email.subtitle": "Introduce tu Gmail registrado y te enviaremos un código de restablecimiento.",
    "forgot.step.code.title": "Introduce el código",
    "forgot.step.code.subtitle": "Introduce el código de 6 dígitos que enviamos.",
    "forgot.step.password.title": "Crear nueva contraseña",
    "forgot.step.password.subtitle": "Elige una nueva contraseña para tu cuenta de vendedor Switch.",
    "forgot.submit.send": "Enviar código",
    "forgot.submit.update": "Actualizar contraseña",
    "forgot.back.cancel": "Cancelar",
    "forgot.code.hint.default": "Introduce el código de 6 dígitos.",
    "forgot.code.hint.sent": "Código enviado a {email}",
    "forgot.resend.default": "Reenviar código",
    "feedback.checkingSeller": "Comprobando cuenta de vendedor...",
    "feedback.checkingEmployee": "Comprobando cuenta de empleado...",
    "feedback.google.adminOnly": "El inicio con Google está disponible para cuentas de administrador vendedor.",
    "feedback.google.unavailable": "El asistente de Google no está cargado.",
    "feedback.method.comingSoon": "Este método de inicio de sesión estará disponible pronto para cuentas de vendedor.",
  },
  hi: {
    "panel.subtitle": "अपने प्लेटफ़ॉर्म वर्कस्पेस में जारी रखने के लिए साइन इन करें।",
    "remembered.title": "वापसी पर स्वागत है",
    "remembered.subtitle.single": "जारी रखने के लिए अपनी प्रोफ़ाइल टैप करें, या ईमेल से साइन इन करें।",
    "remembered.subtitle.multi": "जारी रखने के लिए एक सहेजा विक्रेता खाता चुनें।",
    "remembered.button.email": "ईमेल से साइन इन करें",
    "remembered.detail.saved": "सहेजा विक्रेता खाता",
    "guest.cta": "अतिथि के रूप में जारी रखें",
    "signup.prompt": "खाता नहीं है?",
    "signup.link": "साइन अप करें",
    "support.privacy": "गोपनीयता नीति",
    "support.terms": "नियम और शर्तें",
    "support.prompt": "सहायता चाहिए?",
    "support.link": "सहायता केंद्र",
    "security.note": "केवल अधिकृत प्लेटफ़ॉर्म प्रशासकों के लिए सुरक्षित पहुँच।",
    "role.admin.title": "जारी रखने के लिए लॉगिन करें",
    "role.admin.identifierLabel": "विक्रेता ईमेल या कर्मचारी ID",
    "role.admin.identifierPlaceholder": "विक्रेता ईमेल या कर्मचारी ID",
    "role.admin.passwordLabel": "पासवर्ड",
    "role.admin.passwordPlaceholder": "अपना पासवर्ड दर्ज करें",
    "role.admin.helpText": "पासवर्ड भूल गए?",
    "role.admin.submitText": "साइन इन",
    "role.employee.title": "जारी रखने के लिए लॉगिन करें",
    "role.employee.identifierLabel": "विक्रेता ईमेल या कर्मचारी ID",
    "role.employee.identifierPlaceholder": "विक्रेता ईमेल या कर्मचारी ID",
    "role.employee.passwordLabel": "पासवर्ड",
    "role.employee.passwordPlaceholder": "अपना पासवर्ड दर्ज करें",
    "role.employee.helpText": "खाते में मदद चाहिए?",
    "role.employee.submitText": "साइन इन",
    "forgot.email.label": "ईमेल पता",
    "forgot.email.placeholder": "you@gmail.com",
    "forgot.password.label": "नया पासवर्ड",
    "forgot.password.placeholder": "8+ अक्षर, 1 बड़ा अक्षर, 1 संख्या",
    "forgot.confirm.label": "पासवर्ड की पुष्टि करें",
    "forgot.confirm.placeholder": "नया पासवर्ड फिर से दर्ज करें",
    "forgot.step.email.title": "पासवर्ड भूल गए",
    "forgot.step.email.subtitle": "अपना पंजीकृत Gmail दर्ज करें और हम रीसेट कोड भेजेंगे।",
    "forgot.step.code.title": "रीसेट कोड दर्ज करें",
    "forgot.step.code.subtitle": "हमारे भेजे गए 6-अंकों का कोड दर्ज करें।",
    "forgot.step.password.title": "नया पासवर्ड बनाएँ",
    "forgot.step.password.subtitle": "अपने Switch विक्रेता खाते के लिए नया पासवर्ड चुनें।",
    "forgot.submit.send": "कोड भेजें",
    "forgot.submit.update": "पासवर्ड अपडेट करें",
    "forgot.back.cancel": "रद्द करें",
    "forgot.code.hint.default": "6-अंकों का कोड दर्ज करें।",
    "forgot.code.hint.sent": "कोड {email} पर भेजा गया",
    "forgot.resend.default": "कोड फिर भेजें",
    "feedback.checkingSeller": "विक्रेता खाता जाँच रहा है...",
    "feedback.checkingEmployee": "कर्मचारी खाता जाँच रहा है...",
    "feedback.google.adminOnly": "Google साइन-इन विक्रेता व्यवस्थापक खातों के लिए उपलब्ध है।",
    "feedback.google.unavailable": "Google साइन-इन सहायक लोड नहीं हुआ।",
    "feedback.method.comingSoon": "यह साइन-इन विधि जल्द ही विक्रेता खातों के लिए आएगी।",
  },
  ar: {
    "panel.subtitle": "سجّل الدخول للمتابعة إلى مساحة عمل المنصة.",
    "remembered.title": "مرحبًا بعودتك",
    "remembered.subtitle.single": "اضغط على ملفك الشخصي للمتابعة، أو سجّل الدخول بالبريد.",
    "remembered.subtitle.multi": "اختر حساب بائع محفوظ للمتابعة.",
    "remembered.button.email": "تسجيل الدخول بالبريد",
    "remembered.detail.saved": "حساب بائع محفوظ",
    "guest.cta": "المتابعة كزائر",
    "signup.prompt": "ليس لديك حساب؟",
    "signup.link": "إنشاء حساب",
    "support.privacy": "سياسة الخصوصية",
    "support.terms": "الشروط والأحكام",
    "support.prompt": "تحتاج دعمًا؟",
    "support.link": "مركز المساعدة",
    "security.note": "وصول محمي لمسؤولي المنصة المصرّح لهم فقط.",
    "role.admin.title": "سجّل الدخول للمتابعة",
    "role.admin.identifierLabel": "بريد البائع أو معرّف الموظف",
    "role.admin.identifierPlaceholder": "بريد البائع أو معرّف الموظف",
    "role.admin.passwordLabel": "كلمة المرور",
    "role.admin.passwordPlaceholder": "أدخل كلمة المرور",
    "role.admin.helpText": "نسيت كلمة المرور؟",
    "role.admin.submitText": "تسجيل الدخول",
    "role.employee.title": "سجّل الدخول للمتابعة",
    "role.employee.identifierLabel": "بريد البائع أو معرّف الموظف",
    "role.employee.identifierPlaceholder": "بريد البائع أو معرّف الموظف",
    "role.employee.passwordLabel": "كلمة المرور",
    "role.employee.passwordPlaceholder": "أدخل كلمة المرور",
    "role.employee.helpText": "تحتاج مساعدة في الحساب؟",
    "role.employee.submitText": "تسجيل الدخول",
    "forgot.email.label": "عنوان البريد الإلكتروني",
    "forgot.email.placeholder": "you@gmail.com",
    "forgot.password.label": "كلمة مرور جديدة",
    "forgot.password.placeholder": "8+ أحرف، حرف كبير واحد، رقم واحد",
    "forgot.confirm.label": "تأكيد كلمة المرور",
    "forgot.confirm.placeholder": "أعد إدخال كلمة المرور الجديدة",
    "forgot.step.email.title": "نسيت كلمة المرور",
    "forgot.step.email.subtitle": "أدخل Gmail المسجّل وسنرسل رمز إعادة التعيين.",
    "forgot.step.code.title": "أدخل رمز إعادة التعيين",
    "forgot.step.code.subtitle": "أدخل الرمز المكوّن من 6 أرقام الذي أرسلناه.",
    "forgot.step.password.title": "إنشاء كلمة مرور جديدة",
    "forgot.step.password.subtitle": "اختر كلمة مرور جديدة لحساب بائع Switch.",
    "forgot.submit.send": "إرسال الرمز",
    "forgot.submit.update": "تحديث كلمة المرور",
    "forgot.back.cancel": "إلغاء",
    "forgot.code.hint.default": "أدخل الرمز المكوّن من 6 أرقام.",
    "forgot.code.hint.sent": "تم إرسال الرمز إلى {email}",
    "forgot.resend.default": "إعادة إرسال الرمز",
    "feedback.checkingSeller": "جارٍ التحقق من حساب البائع...",
    "feedback.checkingEmployee": "جارٍ التحقق من حساب الموظف...",
    "feedback.google.adminOnly": "تسجيل الدخول عبر Google متاح لحسابات مسؤول البائع.",
    "feedback.google.unavailable": "أداة تسجيل الدخول عبر Google غير محمّلة.",
    "feedback.method.comingSoon": "طريقة تسجيل الدخول هذه قادمة قريبًا لحسابات البائع.",
  },
  fr: {
    "panel.subtitle": "Connectez-vous pour continuer vers votre espace de travail.",
    "remembered.title": "Bon retour",
    "remembered.subtitle.single": "Touchez votre profil pour continuer, ou connectez-vous par e-mail.",
    "remembered.subtitle.multi": "Choisissez un compte vendeur enregistré pour continuer.",
    "remembered.button.email": "Se connecter avec l'e-mail",
    "remembered.detail.saved": "Compte vendeur enregistré",
    "guest.cta": "Continuer en tant qu'invité",
    "signup.prompt": "Vous n'avez pas de compte ?",
    "signup.link": "S'inscrire",
    "support.privacy": "Politique de confidentialité",
    "support.terms": "Conditions générales",
    "support.prompt": "Besoin d'aide ?",
    "support.link": "Centre d'aide",
    "security.note": "Accès protégé réservé aux administrateurs autorisés de la plateforme.",
    "role.admin.title": "Connectez-vous pour continuer",
    "role.admin.identifierLabel": "E-mail vendeur ou ID employé",
    "role.admin.identifierPlaceholder": "E-mail vendeur ou ID employé",
    "role.admin.passwordLabel": "Mot de passe",
    "role.admin.passwordPlaceholder": "Entrez votre mot de passe",
    "role.admin.helpText": "Mot de passe oublié ?",
    "role.admin.submitText": "Se connecter",
    "role.employee.title": "Connectez-vous pour continuer",
    "role.employee.identifierLabel": "E-mail vendeur ou ID employé",
    "role.employee.identifierPlaceholder": "E-mail vendeur ou ID employé",
    "role.employee.passwordLabel": "Mot de passe",
    "role.employee.passwordPlaceholder": "Entrez votre mot de passe",
    "role.employee.helpText": "Besoin d'aide pour le compte ?",
    "role.employee.submitText": "Se connecter",
    "forgot.email.label": "Adresse e-mail",
    "forgot.email.placeholder": "you@gmail.com",
    "forgot.password.label": "Nouveau mot de passe",
    "forgot.password.placeholder": "8+ caractères, 1 majuscule, 1 chiffre",
    "forgot.confirm.label": "Confirmer le mot de passe",
    "forgot.confirm.placeholder": "Ressaisissez le nouveau mot de passe",
    "forgot.step.email.title": "Mot de passe oublié",
    "forgot.step.email.subtitle": "Entrez votre Gmail enregistré et nous enverrons un code de réinitialisation.",
    "forgot.step.code.title": "Entrez le code",
    "forgot.step.code.subtitle": "Entrez le code à 6 chiffres que nous avons envoyé.",
    "forgot.step.password.title": "Créer un nouveau mot de passe",
    "forgot.step.password.subtitle": "Choisissez un nouveau mot de passe pour votre compte vendeur Switch.",
    "forgot.submit.send": "Envoyer le code",
    "forgot.submit.update": "Mettre à jour le mot de passe",
    "forgot.back.cancel": "Annuler",
    "forgot.code.hint.default": "Entrez le code à 6 chiffres.",
    "forgot.code.hint.sent": "Code envoyé à {email}",
    "forgot.resend.default": "Renvoyer le code",
    "feedback.checkingSeller": "Vérification du compte vendeur...",
    "feedback.checkingEmployee": "Vérification du compte employé...",
    "feedback.google.adminOnly": "La connexion Google est disponible pour les comptes admin vendeur.",
    "feedback.google.unavailable": "L'assistant de connexion Google n'est pas chargé.",
    "feedback.method.comingSoon": "Cette méthode de connexion arrive bientôt pour les comptes vendeur.",
  },
  pt: {
    "panel.subtitle": "Entre para continuar para o seu espaço de trabalho.",
    "remembered.title": "Bem-vindo de volta",
    "remembered.subtitle.single": "Toque no seu perfil para continuar, ou entre com o e-mail.",
    "remembered.subtitle.multi": "Escolha uma conta de vendedor salva para continuar.",
    "remembered.button.email": "Entrar com e-mail",
    "remembered.detail.saved": "Conta de vendedor salva",
    "guest.cta": "Continuar como convidado",
    "signup.prompt": "Não tem uma conta?",
    "signup.link": "Cadastre-se",
    "support.privacy": "Política de Privacidade",
    "support.terms": "Termos e Condições",
    "support.prompt": "Precisa de suporte?",
    "support.link": "Central de Ajuda",
    "security.note": "Acesso protegido apenas para administradores autorizados da plataforma.",
    "role.admin.title": "Entre para continuar",
    "role.admin.identifierLabel": "E-mail do vendedor ou ID do funcionário",
    "role.admin.identifierPlaceholder": "E-mail do vendedor ou ID do funcionário",
    "role.admin.passwordLabel": "Senha",
    "role.admin.passwordPlaceholder": "Digite sua senha",
    "role.admin.helpText": "Esqueceu a senha?",
    "role.admin.submitText": "Entrar",
    "role.employee.title": "Entre para continuar",
    "role.employee.identifierLabel": "E-mail do vendedor ou ID do funcionário",
    "role.employee.identifierPlaceholder": "E-mail do vendedor ou ID do funcionário",
    "role.employee.passwordLabel": "Senha",
    "role.employee.passwordPlaceholder": "Digite sua senha",
    "role.employee.helpText": "Precisa de ajuda com a conta?",
    "role.employee.submitText": "Entrar",
    "forgot.email.label": "Endereço de e-mail",
    "forgot.email.placeholder": "you@gmail.com",
    "forgot.password.label": "Nova senha",
    "forgot.password.placeholder": "8+ caracteres, 1 maiúscula, 1 número",
    "forgot.confirm.label": "Confirmar senha",
    "forgot.confirm.placeholder": "Digite novamente a nova senha",
    "forgot.step.email.title": "Esqueci a senha",
    "forgot.step.email.subtitle": "Digite seu Gmail registrado e enviaremos um código de redefinição.",
    "forgot.step.code.title": "Digite o código",
    "forgot.step.code.subtitle": "Digite o código de 6 dígitos que enviamos.",
    "forgot.step.password.title": "Criar nova senha",
    "forgot.step.password.subtitle": "Escolha uma nova senha para sua conta de vendedor Switch.",
    "forgot.submit.send": "Enviar código",
    "forgot.submit.update": "Atualizar senha",
    "forgot.back.cancel": "Cancelar",
    "forgot.code.hint.default": "Digite o código de 6 dígitos.",
    "forgot.code.hint.sent": "Código enviado para {email}",
    "forgot.resend.default": "Reenviar código",
    "feedback.checkingSeller": "Verificando conta do vendedor...",
    "feedback.checkingEmployee": "Verificando conta do funcionário...",
    "feedback.google.adminOnly": "O login com Google está disponível para contas de admin vendedor.",
    "feedback.google.unavailable": "O auxiliar de login do Google não está carregado.",
    "feedback.method.comingSoon": "Este método de login estará disponível em breve para contas de vendedor.",
  },
  ru: {
    "panel.subtitle": "Войдите, чтобы продолжить работу в пространстве платформы.",
    "remembered.title": "С возвращением",
    "remembered.subtitle.single": "Нажмите на профиль, чтобы продолжить, или войдите по электронной почте.",
    "remembered.subtitle.multi": "Выберите сохранённый аккаунт продавца, чтобы продолжить.",
    "remembered.button.email": "Войти по электронной почте",
    "remembered.detail.saved": "Сохранённый аккаунт продавца",
    "guest.cta": "Продолжить как гость",
    "signup.prompt": "Нет аккаунта?",
    "signup.link": "Зарегистрироваться",
    "support.privacy": "Политика конфиденциальности",
    "support.terms": "Условия использования",
    "support.prompt": "Нужна помощь?",
    "support.link": "Справочный центр",
    "security.note": "Защищённый доступ только для авторизованных администраторов платформы.",
    "role.admin.title": "Войдите, чтобы продолжить",
    "role.admin.identifierLabel": "Email продавца или ID сотрудника",
    "role.admin.identifierPlaceholder": "Email продавца или ID сотрудника",
    "role.admin.passwordLabel": "Пароль",
    "role.admin.passwordPlaceholder": "Введите пароль",
    "role.admin.helpText": "Забыли пароль?",
    "role.admin.submitText": "Войти",
    "role.employee.title": "Войдите, чтобы продолжить",
    "role.employee.identifierLabel": "Email продавца или ID сотрудника",
    "role.employee.identifierPlaceholder": "Email продавца или ID сотрудника",
    "role.employee.passwordLabel": "Пароль",
    "role.employee.passwordPlaceholder": "Введите пароль",
    "role.employee.helpText": "Нужна помощь с аккаунтом?",
    "role.employee.submitText": "Войти",
    "forgot.email.label": "Адрес электронной почты",
    "forgot.email.placeholder": "you@gmail.com",
    "forgot.password.label": "Новый пароль",
    "forgot.password.placeholder": "8+ символов, 1 заглавная, 1 цифра",
    "forgot.confirm.label": "Подтвердите пароль",
    "forgot.confirm.placeholder": "Введите новый пароль ещё раз",
    "forgot.step.email.title": "Забыли пароль",
    "forgot.step.email.subtitle": "Введите зарегистрированный Gmail, и мы отправим код сброса.",
    "forgot.step.code.title": "Введите код сброса",
    "forgot.step.code.subtitle": "Введите 6-значный код, который мы отправили.",
    "forgot.step.password.title": "Создайте новый пароль",
    "forgot.step.password.subtitle": "Выберите новый пароль для аккаунта продавца Switch.",
    "forgot.submit.send": "Отправить код",
    "forgot.submit.update": "Обновить пароль",
    "forgot.back.cancel": "Отмена",
    "forgot.code.hint.default": "Введите 6-значный код.",
    "forgot.code.hint.sent": "Код отправлен на {email}",
    "forgot.resend.default": "Отправить код снова",
    "feedback.checkingSeller": "Проверка аккаунта продавца...",
    "feedback.checkingEmployee": "Проверка аккаунта сотрудника...",
    "feedback.google.adminOnly": "Вход через Google доступен для аккаунтов админа продавца.",
    "feedback.google.unavailable": "Помощник входа Google не загружен.",
    "feedback.method.comingSoon": "Этот способ входа скоро будет доступен для аккаунтов продавца.",
  },
  ja: {
    "panel.subtitle": "プラットフォームのワークスペースに進むにはサインインしてください。",
    "remembered.title": "おかえりなさい",
    "remembered.subtitle.single": "プロフィールをタップして続けるか、メールでサインインしてください。",
    "remembered.subtitle.multi": "保存済みの出品者アカウントを選んで続けてください。",
    "remembered.button.email": "メールでサインイン",
    "remembered.detail.saved": "保存済みの出品者アカウント",
    "guest.cta": "ゲストとして続ける",
    "signup.prompt": "アカウントをお持ちでないですか？",
    "signup.link": "新規登録",
    "support.privacy": "プライバシーポリシー",
    "support.terms": "利用規約",
    "support.prompt": "サポートが必要ですか？",
    "support.link": "ヘルプセンター",
    "security.note": "承認されたプラットフォーム管理者のみが利用できる保護されたアクセスです。",
    "role.admin.title": "続行するにはログイン",
    "role.admin.identifierLabel": "出品者メールまたは従業員 ID",
    "role.admin.identifierPlaceholder": "出品者メールまたは従業員 ID",
    "role.admin.passwordLabel": "パスワード",
    "role.admin.passwordPlaceholder": "パスワードを入力",
    "role.admin.helpText": "パスワードをお忘れですか？",
    "role.admin.submitText": "サインイン",
    "role.employee.title": "続行するにはログイン",
    "role.employee.identifierLabel": "出品者メールまたは従業員 ID",
    "role.employee.identifierPlaceholder": "出品者メールまたは従業員 ID",
    "role.employee.passwordLabel": "パスワード",
    "role.employee.passwordPlaceholder": "パスワードを入力",
    "role.employee.helpText": "アカウントのヘルプが必要ですか？",
    "role.employee.submitText": "サインイン",
    "forgot.email.label": "メールアドレス",
    "forgot.email.placeholder": "you@gmail.com",
    "forgot.password.label": "新しいパスワード",
    "forgot.password.placeholder": "8文字以上、大文字1、数字1",
    "forgot.confirm.label": "パスワードの確認",
    "forgot.confirm.placeholder": "新しいパスワードを再入力",
    "forgot.step.email.title": "パスワードを忘れた場合",
    "forgot.step.email.subtitle": "登録済みの Gmail を入力すると、リセットコードを送信します。",
    "forgot.step.code.title": "リセットコードを入力",
    "forgot.step.code.subtitle": "送信した6桁のコードを入力してください。",
    "forgot.step.password.title": "新しいパスワードを作成",
    "forgot.step.password.subtitle": "Switch 出品者アカウント用の新しいパスワードを選んでください。",
    "forgot.submit.send": "コードを送信",
    "forgot.submit.update": "パスワードを更新",
    "forgot.back.cancel": "キャンセル",
    "forgot.code.hint.default": "6桁のコードを入力してください。",
    "forgot.code.hint.sent": "{email} にコードを送信しました",
    "forgot.resend.default": "コードを再送信",
    "feedback.checkingSeller": "出品者アカウントを確認中...",
    "feedback.checkingEmployee": "従業員アカウントを確認中...",
    "feedback.google.adminOnly": "Google サインインは出品者管理者アカウントで利用できます。",
    "feedback.google.unavailable": "Google サインインヘルパーが読み込まれていません。",
    "feedback.method.comingSoon": "このサインイン方法は間もなく出品者アカウントで利用可能になります。",
  },
  de: {
    "panel.subtitle": "Melden Sie sich an, um zu Ihrem Plattform-Arbeitsbereich fortzufahren.",
    "remembered.title": "Willkommen zurück",
    "remembered.subtitle.single": "Tippen Sie auf Ihr Profil, um fortzufahren, oder melden Sie sich per E-Mail an.",
    "remembered.subtitle.multi": "Wählen Sie ein gespeichertes Verkäuferkonto, um fortzufahren.",
    "remembered.button.email": "Mit E-Mail anmelden",
    "remembered.detail.saved": "Gespeichertes Verkäuferkonto",
    "guest.cta": "Als Gast fortfahren",
    "signup.prompt": "Noch kein Konto?",
    "signup.link": "Registrieren",
    "support.privacy": "Datenschutzrichtlinie",
    "support.terms": "Allgemeine Geschäftsbedingungen",
    "support.prompt": "Brauchen Sie Hilfe?",
    "support.link": "Hilfezentrum",
    "security.note": "Geschützter Zugriff nur für autorisierte Plattformadministratoren.",
    "role.admin.title": "Anmelden, um fortzufahren",
    "role.admin.identifierLabel": "Verkäufer-E-Mail oder Mitarbeiter-ID",
    "role.admin.identifierPlaceholder": "Verkäufer-E-Mail oder Mitarbeiter-ID",
    "role.admin.passwordLabel": "Passwort",
    "role.admin.passwordPlaceholder": "Passwort eingeben",
    "role.admin.helpText": "Passwort vergessen?",
    "role.admin.submitText": "Anmelden",
    "role.employee.title": "Anmelden, um fortzufahren",
    "role.employee.identifierLabel": "Verkäufer-E-Mail oder Mitarbeiter-ID",
    "role.employee.identifierPlaceholder": "Verkäufer-E-Mail oder Mitarbeiter-ID",
    "role.employee.passwordLabel": "Passwort",
    "role.employee.passwordPlaceholder": "Passwort eingeben",
    "role.employee.helpText": "Hilfe zum Konto benötigt?",
    "role.employee.submitText": "Anmelden",
    "forgot.email.label": "E-Mail-Adresse",
    "forgot.email.placeholder": "you@gmail.com",
    "forgot.password.label": "Neues Passwort",
    "forgot.password.placeholder": "8+ Zeichen, 1 Großbuchstabe, 1 Zahl",
    "forgot.confirm.label": "Passwort bestätigen",
    "forgot.confirm.placeholder": "Neues Passwort erneut eingeben",
    "forgot.step.email.title": "Passwort vergessen",
    "forgot.step.email.subtitle": "Geben Sie Ihre registrierte Gmail ein und wir senden einen Reset-Code.",
    "forgot.step.code.title": "Reset-Code eingeben",
    "forgot.step.code.subtitle": "Geben Sie den 6-stelligen Code ein, den wir gesendet haben.",
    "forgot.step.password.title": "Neues Passwort erstellen",
    "forgot.step.password.subtitle": "Wählen Sie ein neues Passwort für Ihr Switch-Verkäuferkonto.",
    "forgot.submit.send": "Code senden",
    "forgot.submit.update": "Passwort aktualisieren",
    "forgot.back.cancel": "Abbrechen",
    "forgot.code.hint.default": "Geben Sie den 6-stelligen Code ein.",
    "forgot.code.hint.sent": "Code an {email} gesendet",
    "forgot.resend.default": "Code erneut senden",
    "feedback.checkingSeller": "Verkäuferkonto wird geprüft...",
    "feedback.checkingEmployee": "Mitarbeiterkonto wird geprüft...",
    "feedback.google.adminOnly": "Google-Anmeldung ist für Verkäufer-Admin-Konten verfügbar.",
    "feedback.google.unavailable": "Google-Anmeldehilfe ist nicht geladen.",
    "feedback.method.comingSoon": "Diese Anmeldemethode kommt bald für Verkäuferkonten.",
  },
  ko: {
    "panel.subtitle": "플랫폼 워크스페이스로 계속하려면 로그인하세요.",
    "remembered.title": "다시 오신 것을 환영합니다",
    "remembered.subtitle.single": "프로필을 눌러 계속하거나 이메일로 로그인하세요.",
    "remembered.subtitle.multi": "저장된 판매자 계정을 선택해 계속하세요.",
    "remembered.button.email": "이메일로 로그인",
    "remembered.detail.saved": "저장된 판매자 계정",
    "guest.cta": "게스트로 계속",
    "signup.prompt": "계정이 없으신가요?",
    "signup.link": "가입하기",
    "support.privacy": "개인정보 처리방침",
    "support.terms": "이용약관",
    "support.prompt": "도움이 필요하신가요?",
    "support.link": "고객센터",
    "security.note": "승인된 플랫폼 관리자만 사용할 수 있는 보호된 액세스입니다.",
    "role.admin.title": "계속하려면 로그인",
    "role.admin.identifierLabel": "판매자 이메일 또는 직원 ID",
    "role.admin.identifierPlaceholder": "판매자 이메일 또는 직원 ID",
    "role.admin.passwordLabel": "비밀번호",
    "role.admin.passwordPlaceholder": "비밀번호를 입력하세요",
    "role.admin.helpText": "비밀번호를 잊으셨나요?",
    "role.admin.submitText": "로그인",
    "role.employee.title": "계속하려면 로그인",
    "role.employee.identifierLabel": "판매자 이메일 또는 직원 ID",
    "role.employee.identifierPlaceholder": "판매자 이메일 또는 직원 ID",
    "role.employee.passwordLabel": "비밀번호",
    "role.employee.passwordPlaceholder": "비밀번호를 입력하세요",
    "role.employee.helpText": "계정 도움이 필요하신가요?",
    "role.employee.submitText": "로그인",
    "forgot.email.label": "이메일 주소",
    "forgot.email.placeholder": "you@gmail.com",
    "forgot.password.label": "새 비밀번호",
    "forgot.password.placeholder": "8자 이상, 대문자 1개, 숫자 1개",
    "forgot.confirm.label": "비밀번호 확인",
    "forgot.confirm.placeholder": "새 비밀번호를 다시 입력",
    "forgot.step.email.title": "비밀번호 찾기",
    "forgot.step.email.subtitle": "등록된 Gmail을 입력하면 재설정 코드를 보내드립니다.",
    "forgot.step.code.title": "재설정 코드 입력",
    "forgot.step.code.subtitle": "전송한 6자리 코드를 입력하세요.",
    "forgot.step.password.title": "새 비밀번호 만들기",
    "forgot.step.password.subtitle": "Switch 판매자 계정의 새 비밀번호를 선택하세요.",
    "forgot.submit.send": "코드 보내기",
    "forgot.submit.update": "비밀번호 업데이트",
    "forgot.back.cancel": "취소",
    "forgot.code.hint.default": "6자리 코드를 입력하세요.",
    "forgot.code.hint.sent": "{email}(으)로 코드가 전송되었습니다",
    "forgot.resend.default": "코드 다시 보내기",
    "feedback.checkingSeller": "판매자 계정 확인 중...",
    "feedback.checkingEmployee": "직원 계정 확인 중...",
    "feedback.google.adminOnly": "Google 로그인은 판매자 관리자 계정에서 사용할 수 있습니다.",
    "feedback.google.unavailable": "Google 로그인 도우미가 로드되지 않았습니다.",
    "feedback.method.comingSoon": "이 로그인 방법은 곧 판매자 계정에서 제공됩니다.",
  },
  vi: {
    "panel.subtitle": "Đăng nhập để tiếp tục vào không gian làm việc của nền tảng.",
    "remembered.title": "Chào mừng trở lại",
    "remembered.subtitle.single": "Chạm vào hồ sơ để tiếp tục, hoặc đăng nhập bằng email.",
    "remembered.subtitle.multi": "Chọn tài khoản người bán đã lưu để tiếp tục.",
    "remembered.button.email": "Đăng nhập bằng email",
    "remembered.detail.saved": "Tài khoản người bán đã lưu",
    "guest.cta": "Tiếp tục với tư cách Khách",
    "signup.prompt": "Chưa có tài khoản?",
    "signup.link": "Đăng ký",
    "support.privacy": "Chính sách quyền riêng tư",
    "support.terms": "Điều khoản & Điều kiện",
    "support.prompt": "Cần hỗ trợ?",
    "support.link": "Trung tâm trợ giúp",
    "security.note": "Truy cập được bảo vệ chỉ dành cho quản trị viên nền tảng được ủy quyền.",
    "role.admin.title": "Đăng nhập để tiếp tục",
    "role.admin.identifierLabel": "Email người bán hoặc mã nhân viên",
    "role.admin.identifierPlaceholder": "Email người bán hoặc mã nhân viên",
    "role.admin.passwordLabel": "Mật khẩu",
    "role.admin.passwordPlaceholder": "Nhập mật khẩu của bạn",
    "role.admin.helpText": "Quên mật khẩu?",
    "role.admin.submitText": "Đăng nhập",
    "role.employee.title": "Đăng nhập để tiếp tục",
    "role.employee.identifierLabel": "Email người bán hoặc mã nhân viên",
    "role.employee.identifierPlaceholder": "Email người bán hoặc mã nhân viên",
    "role.employee.passwordLabel": "Mật khẩu",
    "role.employee.passwordPlaceholder": "Nhập mật khẩu của bạn",
    "role.employee.helpText": "Cần trợ giúp tài khoản?",
    "role.employee.submitText": "Đăng nhập",
    "forgot.email.label": "Địa chỉ email",
    "forgot.email.placeholder": "you@gmail.com",
    "forgot.password.label": "Mật khẩu mới",
    "forgot.password.placeholder": "8+ ký tự, 1 chữ hoa, 1 số",
    "forgot.confirm.label": "Xác nhận mật khẩu",
    "forgot.confirm.placeholder": "Nhập lại mật khẩu mới",
    "forgot.step.email.title": "Quên mật khẩu",
    "forgot.step.email.subtitle": "Nhập Gmail đã đăng ký và chúng tôi sẽ gửi mã đặt lại.",
    "forgot.step.code.title": "Nhập mã đặt lại",
    "forgot.step.code.subtitle": "Nhập mã 6 chữ số chúng tôi đã gửi.",
    "forgot.step.password.title": "Tạo mật khẩu mới",
    "forgot.step.password.subtitle": "Chọn mật khẩu mới cho tài khoản người bán Switch.",
    "forgot.submit.send": "Gửi mã",
    "forgot.submit.update": "Cập nhật mật khẩu",
    "forgot.back.cancel": "Hủy",
    "forgot.code.hint.default": "Nhập mã 6 chữ số.",
    "forgot.code.hint.sent": "Đã gửi mã tới {email}",
    "forgot.resend.default": "Gửi lại mã",
    "feedback.checkingSeller": "Đang kiểm tra tài khoản người bán...",
    "feedback.checkingEmployee": "Đang kiểm tra tài khoản nhân viên...",
    "feedback.google.adminOnly": "Đăng nhập Google dành cho tài khoản quản trị người bán.",
    "feedback.google.unavailable": "Trình trợ giúp đăng nhập Google chưa được tải.",
    "feedback.method.comingSoon": "Phương thức đăng nhập này sẽ sớm có cho tài khoản người bán.",
  },
  id: {
    "panel.subtitle": "Masuk untuk melanjutkan ke ruang kerja platform Anda.",
    "remembered.title": "Selamat datang kembali",
    "remembered.subtitle.single": "Ketuk profil Anda untuk melanjutkan, atau masuk dengan email.",
    "remembered.subtitle.multi": "Pilih akun penjual tersimpan untuk melanjutkan.",
    "remembered.button.email": "Masuk dengan email",
    "remembered.detail.saved": "Akun penjual tersimpan",
    "guest.cta": "Lanjutkan sebagai Tamu",
    "signup.prompt": "Belum punya akun?",
    "signup.link": "Daftar",
    "support.privacy": "Kebijakan Privasi",
    "support.terms": "Syarat & Ketentuan",
    "support.prompt": "Butuh dukungan?",
    "support.link": "Pusat Bantuan",
    "security.note": "Akses terlindungi hanya untuk administrator platform yang berwenang.",
    "role.admin.title": "Masuk untuk melanjutkan",
    "role.admin.identifierLabel": "Email penjual atau ID karyawan",
    "role.admin.identifierPlaceholder": "Email penjual atau ID karyawan",
    "role.admin.passwordLabel": "Kata sandi",
    "role.admin.passwordPlaceholder": "Masukkan kata sandi Anda",
    "role.admin.helpText": "Lupa kata sandi?",
    "role.admin.submitText": "Masuk",
    "role.employee.title": "Masuk untuk melanjutkan",
    "role.employee.identifierLabel": "Email penjual atau ID karyawan",
    "role.employee.identifierPlaceholder": "Email penjual atau ID karyawan",
    "role.employee.passwordLabel": "Kata sandi",
    "role.employee.passwordPlaceholder": "Masukkan kata sandi Anda",
    "role.employee.helpText": "Butuh bantuan akun?",
    "role.employee.submitText": "Masuk",
    "forgot.email.label": "Alamat email",
    "forgot.email.placeholder": "you@gmail.com",
    "forgot.password.label": "Kata sandi baru",
    "forgot.password.placeholder": "8+ karakter, 1 huruf besar, 1 angka",
    "forgot.confirm.label": "Konfirmasi kata sandi",
    "forgot.confirm.placeholder": "Masukkan ulang kata sandi baru",
    "forgot.step.email.title": "Lupa kata sandi",
    "forgot.step.email.subtitle": "Masukkan Gmail terdaftar dan kami akan mengirim kode reset.",
    "forgot.step.code.title": "Masukkan kode reset",
    "forgot.step.code.subtitle": "Masukkan kode 6 digit yang kami kirim.",
    "forgot.step.password.title": "Buat kata sandi baru",
    "forgot.step.password.subtitle": "Pilih kata sandi baru untuk akun penjual Switch Anda.",
    "forgot.submit.send": "Kirim kode",
    "forgot.submit.update": "Perbarui kata sandi",
    "forgot.back.cancel": "Batal",
    "forgot.code.hint.default": "Masukkan kode 6 digit.",
    "forgot.code.hint.sent": "Kode dikirim ke {email}",
    "forgot.resend.default": "Kirim ulang kode",
    "feedback.checkingSeller": "Memeriksa akun penjual...",
    "feedback.checkingEmployee": "Memeriksa akun karyawan...",
    "feedback.google.adminOnly": "Masuk Google tersedia untuk akun admin penjual.",
    "feedback.google.unavailable": "Pembantu masuk Google belum dimuat.",
    "feedback.method.comingSoon": "Metode masuk ini akan segera tersedia untuk akun penjual.",
  },
  tl: {
    "panel.subtitle": "Mag-sign in para makapagpatuloy sa iyong workspace.",
    "remembered.title": "Maligayang pagbabalik",
    "remembered.subtitle.single": "I-tap ang profile mo para magpatuloy, o mag-sign in gamit ang email.",
    "remembered.subtitle.multi": "Pumili ng naka-save na seller account para magpatuloy.",
    "remembered.button.email": "Mag-sign in gamit ang email",
    "remembered.detail.saved": "Naka-save na seller account",
    "guest.cta": "Magpatuloy bilang Guest",
    "signup.prompt": "Wala ka pang account?",
    "signup.link": "Mag-sign up",
    "support.privacy": "Patakaran sa Privacy",
    "support.terms": "Mga Tuntunin at Kondisyon",
    "support.prompt": "Kailangan ng tulong?",
    "support.link": "Help Centre",
    "security.note": "Protektadong access para lang sa mga awtorisadong platform administrator.",
    "role.admin.title": "Mag-login para Magpatuloy",
    "role.admin.identifierLabel": "Seller email o Employee ID",
    "role.admin.identifierPlaceholder": "Seller email o employee ID",
    "role.admin.passwordLabel": "Password",
    "role.admin.passwordPlaceholder": "Ilagay ang iyong password",
    "role.admin.helpText": "Nakalimutan ang password?",
    "role.admin.submitText": "Mag-sign in",
    "role.employee.title": "Mag-login para Magpatuloy",
    "role.employee.identifierLabel": "Seller email o Employee ID",
    "role.employee.identifierPlaceholder": "Seller email o employee ID",
    "role.employee.passwordLabel": "Password",
    "role.employee.passwordPlaceholder": "Ilagay ang iyong password",
    "role.employee.helpText": "Kailangan ng tulong sa account?",
    "role.employee.submitText": "Mag-sign in",
    "forgot.email.label": "Email address",
    "forgot.email.placeholder": "you@gmail.com",
    "forgot.password.label": "Bagong password",
    "forgot.password.placeholder": "8+ chars, 1 uppercase, 1 number",
    "forgot.confirm.label": "Kumpirmahin ang password",
    "forgot.confirm.placeholder": "Ilagay ulit ang bagong password",
    "forgot.step.email.title": "Nakalimutan ang password",
    "forgot.step.email.subtitle": "Ilagay ang iyong rehistradong Gmail at magpapadala kami ng reset code.",
    "forgot.step.code.title": "Ilagay ang reset code",
    "forgot.step.code.subtitle": "Ilagay ang 6-digit code na ipinadala namin.",
    "forgot.step.password.title": "Gumawa ng bagong password",
    "forgot.step.password.subtitle": "Pumili ng bagong password para sa iyong Switch seller account.",
    "forgot.submit.send": "Ipadala ang code",
    "forgot.submit.update": "I-update ang password",
    "forgot.back.cancel": "Kanselahin",
    "forgot.code.hint.default": "Ilagay ang 6-digit code.",
    "forgot.code.hint.sent": "Naipadala ang code sa {email}",
    "forgot.resend.default": "Ipadala muli ang code",
    "feedback.checkingSeller": "Tine-check ang seller account...",
    "feedback.checkingEmployee": "Tine-check ang employee account...",
    "feedback.google.adminOnly": "Available lang ang Google sign-in para sa seller admin accounts.",
    "feedback.google.unavailable": "Hindi available ang Google sign-in helper.",
    "feedback.method.comingSoon": "Paparating pa lang ang sign-in method na ito para sa seller accounts.",
  },
  th: {
    "panel.subtitle": "ลงชื่อเข้าใช้เพื่อไปยังพื้นที่ทำงานของแพลตฟอร์ม",
    "remembered.title": "ยินดีต้อนรับกลับ",
    "remembered.subtitle.single": "แตะโปรไฟล์เพื่อดำเนินการต่อ หรือลงชื่อเข้าใช้ด้วยอีเมล",
    "remembered.subtitle.multi": "เลือกบัญชีผู้ขายที่บันทึกไว้เพื่อดำเนินการต่อ",
    "remembered.button.email": "ลงชื่อเข้าใช้ด้วยอีเมล",
    "remembered.detail.saved": "บัญชีผู้ขายที่บันทึกไว้",
    "guest.cta": "ดำเนินการต่อในฐานะผู้เยี่ยมชม",
    "signup.prompt": "ยังไม่มีบัญชี?",
    "signup.link": "สมัครใช้งาน",
    "support.privacy": "นโยบายความเป็นส่วนตัว",
    "support.terms": "ข้อกำหนดและเงื่อนไข",
    "support.prompt": "ต้องการความช่วยเหลือ?",
    "support.link": "ศูนย์ช่วยเหลือ",
    "security.note": "การเข้าถึงที่มีการป้องกันสำหรับผู้ดูแลแพลตฟอร์มที่ได้รับอนุญาตเท่านั้น",
    "role.admin.title": "ลงชื่อเข้าใช้เพื่อดำเนินการต่อ",
    "role.admin.identifierLabel": "อีเมลผู้ขายหรือรหัสพนักงาน",
    "role.admin.identifierPlaceholder": "อีเมลผู้ขายหรือรหัสพนักงาน",
    "role.admin.passwordLabel": "รหัสผ่าน",
    "role.admin.passwordPlaceholder": "กรอกรหัสผ่านของคุณ",
    "role.admin.helpText": "ลืมรหัสผ่าน?",
    "role.admin.submitText": "ลงชื่อเข้าใช้",
    "role.employee.title": "ลงชื่อเข้าใช้เพื่อดำเนินการต่อ",
    "role.employee.identifierLabel": "อีเมลผู้ขายหรือรหัสพนักงาน",
    "role.employee.identifierPlaceholder": "อีเมลผู้ขายหรือรหัสพนักงาน",
    "role.employee.passwordLabel": "รหัสผ่าน",
    "role.employee.passwordPlaceholder": "กรอกรหัสผ่านของคุณ",
    "role.employee.helpText": "ต้องการความช่วยเหลือเกี่ยวกับบัญชี?",
    "role.employee.submitText": "ลงชื่อเข้าใช้",
    "forgot.email.label": "ที่อยู่อีเมล",
    "forgot.email.placeholder": "you@gmail.com",
    "forgot.password.label": "รหัสผ่านใหม่",
    "forgot.password.placeholder": "อย่างน้อย 8 ตัวอักษร มีตัวพิมพ์ใหญ่ 1 ตัว และตัวเลข 1 ตัว",
    "forgot.confirm.label": "ยืนยันรหัสผ่าน",
    "forgot.confirm.placeholder": "กรอกรหัสผ่านใหม่อีกครั้ง",
    "forgot.step.email.title": "ลืมรหัสผ่าน",
    "forgot.step.email.subtitle": "กรอก Gmail ที่ลงทะเบียนไว้ แล้วเราจะส่งรหัสรีเซ็ต",
    "forgot.step.code.title": "กรอกรหัสรีเซ็ต",
    "forgot.step.code.subtitle": "กรอกรหัส 6 หลักที่เราส่งไป",
    "forgot.step.password.title": "สร้างรหัสผ่านใหม่",
    "forgot.step.password.subtitle": "เลือกรหัสผ่านใหม่สำหรับบัญชีผู้ขาย Switch ของคุณ",
    "forgot.submit.send": "ส่งรหัส",
    "forgot.submit.update": "อัปเดตรหัสผ่าน",
    "forgot.back.cancel": "ยกเลิก",
    "forgot.code.hint.default": "กรอกรหัส 6 หลัก",
    "forgot.code.hint.sent": "ส่งรหัสไปที่ {email} แล้ว",
    "forgot.resend.default": "ส่งรหัสอีกครั้ง",
    "feedback.checkingSeller": "กำลังตรวจสอบบัญชีผู้ขาย...",
    "feedback.checkingEmployee": "กำลังตรวจสอบบัญชีพนักงาน...",
    "feedback.google.adminOnly": "การลงชื่อเข้าใช้ด้วย Google ใช้ได้กับบัญชีแอดมินผู้ขาย",
    "feedback.google.unavailable": "ตัวช่วยลงชื่อเข้าใช้ด้วย Google ยังไม่ได้โหลด",
    "feedback.method.comingSoon": "วิธีลงชื่อเข้าใช้นี้จะพร้อมใช้งานเร็วๆ นี้สำหรับบัญชีผู้ขาย",
  },
};

function t(key, replacements = {}) {
  const table = loginTranslations[activeLanguage] || loginTranslations.en;
  const fallback = loginTranslations.en[key] || key;
  let output = table[key] || fallback;
  Object.entries(replacements).forEach(([name, value]) => {
    output = output.replaceAll(`{${name}}`, String(value ?? ""));
  });
  return output;
}

function normalizeLoginLanguage(language) {
  const raw = String(language || "").trim().toLowerCase();
  if (!raw) {
    return "en";
  }
  const aliased = LOGIN_LANGUAGE_ALIASES[raw] || raw;
  return loginTranslations[aliased] ? aliased : "en";
}

function getSavedLoginLanguage() {
  try {
    const saved = String(window.localStorage.getItem(LOGIN_LANGUAGE_STORAGE_KEY) || "").trim().toLowerCase();
    return normalizeLoginLanguage(saved);
  } catch (error) {
    return "en";
  }
}

function saveLoginLanguage(language) {
  try {
    window.localStorage.setItem(LOGIN_LANGUAGE_STORAGE_KEY, language);
  } catch (error) {}
}

function getRoleConfig(role) {
  const roleConfig = loginRoles[role];
  if (!roleConfig) {
    return null;
  }
  return {
    ...roleConfig,
    title: t(`role.${role}.title`),
    identifierLabel: t(`role.${role}.identifierLabel`),
    identifierPlaceholder: t(`role.${role}.identifierPlaceholder`),
    passwordLabel: t(`role.${role}.passwordLabel`),
    passwordPlaceholder: t(`role.${role}.passwordPlaceholder`),
    helpText: t(`role.${role}.helpText`),
    submitText: t(`role.${role}.submitText`),
  };
}

const REMEMBERED_SELLER_ACCOUNTS_KEY = "gms-remembered-seller-accounts";
const REMEMBERED_SELLER_ACCOUNTS_MAX = 8;
const REMEMBERED_SELLER_DEFAULT_LOGO_SVG = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
    <path d="M10 12h4"></path>
    <path d="M10 8h4"></path>
    <path d="M14 21v-3a2 2 0 0 0-4 0v3"></path>
    <path d="M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2"></path>
    <path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"></path>
  </svg>
`.trim();
let loginSigninMode = "credentials";
let rememberedSellerLogoRefreshId = 0;
let loginSigninSlideTimer = 0;
let rememberedSellerDeleteKey = "";
let rememberedSellerDeleteLabel = "";

function firstRememberedText(values, fallback = "") {
  for (const value of values) {
    const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
    if (normalized) {
      return normalized;
    }
  }
  return fallback;
}

function firstRememberedUrl(values) {
  for (const value of values) {
    const normalized = String(value ?? "").trim();
    if (normalized) {
      return normalized;
    }
  }
  return "";
}

function getRememberedSellerDisplayName(account = {}) {
  return firstRememberedText([
    account.companyName,
    account.storeName,
    account.businessName,
    account.sellerName,
    account.shopName,
    account.displayName,
    account.name,
    [account.firstName, account.lastName].filter(Boolean).join(" "),
    account.email,
  ], "Seller");
}

function getRememberedSellerProfileImageUrl(account = {}) {
  if (account.businessLogoSkipped === true) {
    return "";
  }
  return firstRememberedUrl([
    account.companyPictureUrl,
    account.companyProfileImageUrl,
    account.businessLogoUrl,
    account.profileImageUrl,
    account.avatarUrl,
    account.photoUrl,
    account.profilePhotoUrl,
    account.pictureUrl,
    account.imageUrl,
    account.logoUrl,
    account.company?.companyPictureUrl,
    account.company?.profileImageUrl,
    account.company?.logoUrl,
    account.store?.companyPictureUrl,
    account.store?.profileImageUrl,
    account.store?.logoUrl,
    account.profile?.companyPictureUrl,
    account.profile?.profileImageUrl,
    account.profile?.logoUrl,
  ]);
}

function getRememberedSellerLogoToneIndex(account = {}) {
  const source = String(
    account.adminId
    || account.id
    || account.email
    || account.displayName
    || account.companyName
    || "Seller",
  );
  let hash = 0;
  for (const char of source) {
    hash = (hash + char.charCodeAt(0)) % 6;
  }
  return hash + 1;
}

function normalizeRememberedSellerAccount(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }
  const email = String(entry.email || "").trim().toLowerCase();
  const adminId = String(entry.adminId || entry.id || "").trim();
  if (!email && !adminId) {
    return null;
  }
  const businessLogoSkipped = entry.businessLogoSkipped === true;
  const profileImageUrl = businessLogoSkipped
    ? ""
    : getRememberedSellerProfileImageUrl(entry);
  return {
    adminId,
    email,
    displayName: getRememberedSellerDisplayName(entry),
    companyName: firstRememberedText([
      entry.companyName,
      entry.storeName,
      entry.businessName,
    ], ""),
    businessLogoSkipped,
    companyPictureUrl: profileImageUrl,
    profileImageUrl,
    lastUsedAt: String(entry.lastUsedAt || "").trim() || new Date().toISOString(),
  };
}

function readRememberedSellerAccounts() {
  try {
    const raw = window.localStorage.getItem(REMEMBERED_SELLER_ACCOUNTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map((entry) => normalizeRememberedSellerAccount(entry))
      .filter(Boolean)
      .sort((a, b) => String(b.lastUsedAt).localeCompare(String(a.lastUsedAt)))
      .slice(0, REMEMBERED_SELLER_ACCOUNTS_MAX);
  } catch (error) {
    console.warn("Unable to read remembered seller accounts.", error);
    return [];
  }
}

function writeRememberedSellerAccounts(accounts) {
  try {
    window.localStorage.setItem(
      REMEMBERED_SELLER_ACCOUNTS_KEY,
      JSON.stringify(
        (Array.isArray(accounts) ? accounts : [])
          .map((entry) => normalizeRememberedSellerAccount(entry))
          .filter(Boolean)
          .slice(0, REMEMBERED_SELLER_ACCOUNTS_MAX),
      ),
    );
  } catch (error) {
    console.warn("Unable to save remembered seller accounts.", error);
  }
}

function upsertRememberedSellerAccount(accountInput) {
  if (!accountInput || typeof accountInput !== "object") {
    return;
  }

  const nextEntry = normalizeRememberedSellerAccount({
    ...accountInput,
    adminId: accountInput.adminId || accountInput.id || accountInput.accountCode || "",
    email: accountInput.email || accountInput.adminEmail || "",
    lastUsedAt: new Date().toISOString(),
  });
  if (!nextEntry) {
    return;
  }

  const existing = readRememberedSellerAccounts().filter((entry) => {
    if (nextEntry.adminId && entry.adminId && entry.adminId === nextEntry.adminId) {
      return false;
    }
    if (nextEntry.email && entry.email && entry.email === nextEntry.email) {
      return false;
    }
    return true;
  });

  writeRememberedSellerAccounts([nextEntry, ...existing]);
}

function removeRememberedSellerAccount(accountKey) {
  const key = String(accountKey || "").trim().toLowerCase();
  if (!key) {
    return;
  }
  const next = readRememberedSellerAccounts().filter((entry) => {
    const adminId = String(entry.adminId || "").trim().toLowerCase();
    const email = String(entry.email || "").trim().toLowerCase();
    return adminId !== key && email !== key;
  });
  writeRememberedSellerAccounts(next);
}

async function refreshRememberedSellerAccountLogos() {
  const accounts = readRememberedSellerAccounts();
  if (!accounts.length) {
    return accounts;
  }

  const refreshed = await Promise.all(
    accounts.map(async (entry) => {
      if (!entry.email) {
        return entry;
      }
      try {
        const remoteAccount = await findAdminAccountByEmail(entry.email);
        if (!remoteAccount || typeof remoteAccount !== "object") {
          return entry;
        }
        return normalizeRememberedSellerAccount({
          ...entry,
          ...remoteAccount,
          email: remoteAccount.email || entry.email,
          adminId: remoteAccount.adminId || entry.adminId,
          lastUsedAt: entry.lastUsedAt,
        }) || entry;
      } catch (error) {
        return entry;
      }
    }),
  );

  writeRememberedSellerAccounts(refreshed);
  return readRememberedSellerAccounts();
}

function escapeLoginHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function syncSavedAccountsLinkVisibility() {
  const accounts = readRememberedSellerAccounts();
  const shouldShow = activeRole === "admin"
    && loginSigninMode === "credentials"
    && accounts.length > 0;
  if (savedAccountsLink) {
    savedAccountsLink.hidden = !shouldShow;
  }
}

function syncLoginSigninSurfaceClass() {
  const root = document.documentElement;
  root.classList.toggle("login-signin-accounts", loginSigninMode === "accounts");
  if (loginSigninMode === "accounts") {
    root.classList.remove("login-forgot-pending");
  }
}

function syncSigninSurfaceAttributes() {
  const signinView = document.getElementById("login-view-signin");
  if (!(signinView instanceof HTMLElement)) {
    return;
  }
  signinView.dataset.signinMode = loginSigninMode;
}

function getRememberedAccountsPaintSignature(accounts) {
  return (Array.isArray(accounts) ? accounts : [])
    .map((account) => [
      account.adminId || "",
      account.email || "",
      account.displayName || "",
      account.profileImageUrl || account.companyPictureUrl || "",
      account.businessLogoSkipped === true ? "1" : "0",
    ].join("|"))
    .join(";;");
}

function setLoginSigninMode(mode, options = {}) {
  const nextMode = mode === "accounts" ? "accounts" : "credentials";
  const accounts = readRememberedSellerAccounts();
  const canShowAccounts = nextMode === "accounts" && accounts.length > 0 && activeRole === "admin";
  const previousMode = loginSigninMode;
  loginSigninMode = canShowAccounts ? "accounts" : "credentials";
  const shouldSlide =
    Boolean(options.animate)
    && previousMode !== loginSigninMode
    && loginRemembered instanceof HTMLElement
    && loginCredentials instanceof HTMLElement;

  window.clearTimeout(loginSigninSlideTimer);
  if (shouldSlide) {
    const signinView = document.getElementById("login-view-signin");
    signinView?.classList.add("is-signin-sliding");
  }

  if (loginRemembered) {
    loginRemembered.hidden = loginSigninMode !== "accounts";
    loginRemembered.setAttribute("aria-hidden", String(loginSigninMode !== "accounts"));
    loginRemembered.classList.toggle(
      "is-animated",
      Boolean(options.animate) && loginSigninMode === "accounts" && previousMode !== "accounts",
    );
  }
  if (loginCredentials) {
    loginCredentials.hidden = loginSigninMode === "accounts";
    loginCredentials.setAttribute("aria-hidden", String(loginSigninMode === "accounts"));
  }
  syncLoginSigninSurfaceClass();
  syncSigninSurfaceAttributes();

  if (shouldSlide) {
    loginSigninSlideTimer = window.setTimeout(() => {
      const signinView = document.getElementById("login-view-signin");
      signinView?.classList.remove("is-signin-sliding");
      loginSigninSlideTimer = 0;
    }, 420);
  }

  if (loginSigninMode === "accounts") {
    void renderRememberedSellerAccounts({
      refreshLogos: options.refreshLogos !== false,
      forcePaint: options.forcePaint === true,
    });
    if (options.focusEmailButton) {
      loginRememberedEmailBtn?.focus();
    }
  } else if (options.focusIdentifier) {
    identifierInput?.focus();
  }

  syncSavedAccountsLinkVisibility();
}

function updateRememberedSellerAccountsInPlace(accounts) {
  if (!(loginRememberedList instanceof HTMLElement)) {
    return false;
  }

  const items = Array.from(loginRememberedList.querySelectorAll(".login-remembered__item"));
  if (items.length !== accounts.length) {
    return false;
  }

  for (let index = 0; index < accounts.length; index += 1) {
    const account = accounts[index];
    const item = items[index];
    const accountKey = String(account.adminId || account.email || "");
    const selectButton = item.querySelector(".login-remembered__avatar-btn");
    const removeButton = item.querySelector("[data-remembered-remove]");
    const nameNode = item.querySelector(".login-remembered__name");
    const detailNode = item.querySelector(".login-remembered__detail");
    const media = item.querySelector(".login-remembered__avatar-media");
    const fallback = item.querySelector(".login-remembered__avatar-fallback");
    if (!selectButton || !removeButton || !nameNode || !detailNode || !media || !fallback) {
      return false;
    }
    if (String(item.getAttribute("data-remembered-select") || "") !== accountKey) {
      return false;
    }

    const imageUrl = String(account.profileImageUrl || account.companyPictureUrl || "").trim();
    const toneIndex = getRememberedSellerLogoToneIndex(account);
    const name = account.displayName || "Seller";
    const email = account.email || "";
    const label = email ? `${name} (${email})` : name;

    item.setAttribute("data-remembered-select", accountKey);
    item.setAttribute("aria-label", `Continue as ${label}`);
    item.title = label;
    selectButton.className = `login-remembered__avatar-btn seller-company-logo--tone-${toneIndex}${imageUrl ? " has-image" : ""}`;
    removeButton.setAttribute("aria-label", `Remove ${name} from saved accounts`);
    nameNode.textContent = name;
    detailNode.textContent = email || t("remembered.detail.saved");

    let image = media.querySelector("[data-remembered-avatar-image]");
    if (imageUrl) {
      if (!(image instanceof HTMLImageElement)) {
        image = document.createElement("img");
        image.alt = "";
        image.setAttribute("data-remembered-avatar-image", "");
        media.insertBefore(image, fallback);
        image.addEventListener("error", () => {
          image.hidden = true;
          selectButton.classList.remove("has-image");
          fallback.hidden = false;
        });
      }
      if (image.getAttribute("src") !== imageUrl) {
        image.hidden = false;
        image.src = imageUrl;
      }
      fallback.hidden = true;
    } else {
      if (image) {
        image.remove();
      }
      selectButton.classList.remove("has-image");
      fallback.hidden = false;
      if (!fallback.querySelector("svg")) {
        fallback.innerHTML = REMEMBERED_SELLER_DEFAULT_LOGO_SVG;
      }
    }
  }

  if (loginRememberedSubtitle) {
    loginRememberedSubtitle.textContent = accounts.length === 1
      ? t("remembered.subtitle.single")
      : t("remembered.subtitle.multi");
  }
  return true;
}

function paintRememberedSellerAccounts(accountsInput, options = {}) {
  if (!(loginRememberedList instanceof HTMLElement)) {
    return;
  }

  const accounts = Array.isArray(accountsInput) ? accountsInput : readRememberedSellerAccounts();
  const nextSignature = getRememberedAccountsPaintSignature(accounts);
  const forcePaint = options.forcePaint === true;
  if (
    !forcePaint
    && loginRememberedList.dataset.paintSignature === nextSignature
    && loginRememberedList.childElementCount === accounts.length
  ) {
    return;
  }

  if (!forcePaint && updateRememberedSellerAccountsInPlace(accounts)) {
    loginRememberedList.dataset.paintSignature = nextSignature;
    return;
  }

  if (loginRememberedSubtitle) {
    loginRememberedSubtitle.textContent = accounts.length === 1
      ? t("remembered.subtitle.single")
      : t("remembered.subtitle.multi");
  }

  if (!accounts.length) {
    loginRememberedList.innerHTML = "";
    delete loginRememberedList.dataset.paintSignature;
    setLoginSigninMode("credentials", { refreshLogos: false });
    return;
  }

  loginRememberedList.innerHTML = accounts.map((account, index) => {
    const name = escapeLoginHtml(account.displayName || "Seller");
    const email = escapeLoginHtml(account.email || "");
    const imageUrl = escapeLoginHtml(account.profileImageUrl || account.companyPictureUrl || "");
    const toneIndex = getRememberedSellerLogoToneIndex(account);
    const accountKey = escapeLoginHtml(account.adminId || account.email);
    const label = email ? `${name} (${email})` : name;
    const hasImage = Boolean(imageUrl);
    return `
      <div class="login-remembered__item" role="listitem" data-remembered-select="${accountKey}" tabindex="0" aria-label="Continue as ${label}" title="${label}" style="z-index:${index + 1}">
        <div class="login-remembered__avatar-wrap">
          <button
            type="button"
            class="login-remembered__avatar-btn seller-company-logo--tone-${toneIndex}${hasImage ? " has-image" : ""}"
            tabindex="-1"
            aria-hidden="true"
          >
            <span class="login-remembered__avatar-media">
              ${hasImage
                ? `<img src="${imageUrl}" alt="" data-remembered-avatar-image />`
                : ""}
              <span class="login-remembered__avatar-fallback" ${hasImage ? "hidden" : ""}>
                ${REMEMBERED_SELLER_DEFAULT_LOGO_SVG}
              </span>
            </span>
          </button>
        </div>
        <span class="login-remembered__copy">
          <span class="login-remembered__name">${name}</span>
          <span class="login-remembered__detail">${email || "Saved seller account"}</span>
        </span>
        <button
          type="button"
          class="login-remembered__remove"
          data-remembered-remove="${accountKey}"
          aria-label="Remove ${name} from saved accounts"
          title="Remove"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"></path>
            <path d="m6 6 12 12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"></path>
          </svg>
        </button>
      </div>
    `;
  }).join("");
  loginRememberedList.dataset.paintSignature = nextSignature;

  loginRememberedList.querySelectorAll("[data-remembered-avatar-image]").forEach((image) => {
    image.addEventListener("error", () => {
      image.hidden = true;
      const button = image.closest(".login-remembered__avatar-btn");
      button?.classList.remove("has-image");
      const fallback = image.parentElement?.querySelector(".login-remembered__avatar-fallback");
      if (fallback) {
        fallback.hidden = false;
      }
    });
  });
}

async function renderRememberedSellerAccounts(options = {}) {
  const { refreshLogos = false, forcePaint = false } = options;
  const cachedAccounts = readRememberedSellerAccounts();
  paintRememberedSellerAccounts(cachedAccounts, { forcePaint });

  if (!refreshLogos || !cachedAccounts.length || loginSigninMode !== "accounts") {
    return;
  }

  const refreshId = ++rememberedSellerLogoRefreshId;
  try {
    const refreshedAccounts = await refreshRememberedSellerAccountLogos();
    if (refreshId !== rememberedSellerLogoRefreshId || loginSigninMode !== "accounts") {
      return;
    }
    paintRememberedSellerAccounts(refreshedAccounts);
  } catch (error) {
    console.warn("Unable to refresh remembered seller logos.", error);
  }
}

function selectRememberedSellerAccount(accountKey) {
  const key = String(accountKey || "").trim().toLowerCase();
  const account = readRememberedSellerAccounts().find((entry) => {
    const adminId = String(entry.adminId || "").trim().toLowerCase();
    const email = String(entry.email || "").trim().toLowerCase();
    return adminId === key || email === key;
  });
  if (!account?.email) {
    return;
  }

  if (activeRole !== "admin") {
    setActiveRole("admin", { quiet: true, preserveCredentials: false });
  }

  setLoginSigninMode("credentials");
  identifierInput.value = account.email;
  passwordInput.value = "";
  setLoginPasswordState("");
  setFeedback("");
  adminIdentifierValidAccount = null;
  adminIdentifierValidEmail = "";
  setLoginIdentifierState("");
  setEmployeePasswordVisible(true);
  setLoginSubmitAvailability();
  passwordInput.focus();
}

function closeRememberedSellerDeleteModal() {
  if (!(loginRememberedDeleteOverlay instanceof HTMLElement)) {
    rememberedSellerDeleteKey = "";
    rememberedSellerDeleteLabel = "";
    return;
  }
  loginRememberedDeleteOverlay.classList.remove("is-open");
  loginRememberedDeleteOverlay.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  window.setTimeout(() => {
    if (!loginRememberedDeleteOverlay.classList.contains("is-open")) {
      loginRememberedDeleteOverlay.hidden = true;
    }
  }, 180);
  rememberedSellerDeleteKey = "";
  rememberedSellerDeleteLabel = "";
}

function openRememberedSellerDeleteModal(accountKey) {
  const key = String(accountKey || "").trim();
  if (!key || !(loginRememberedDeleteOverlay instanceof HTMLElement)) {
    return;
  }
  const account = readRememberedSellerAccounts().find((entry) => (
    String(entry.adminId || "").trim() === key || String(entry.email || "").trim() === key
  ));
  rememberedSellerDeleteKey = key;
  rememberedSellerDeleteLabel = account?.displayName || "this saved account";
  if (loginRememberedDeleteTitle) {
    loginRememberedDeleteTitle.textContent =
      account?.displayName
        ? `Remove ${account.displayName}?`
        : "Remove saved account?";
  }
  if (loginRememberedDeleteCopy) {
    loginRememberedDeleteCopy.textContent =
      "Next time you log in on this device, you'll need to enter the email and password again.";
  }
  loginRememberedDeleteOverlay.hidden = false;
  loginRememberedDeleteOverlay.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  window.requestAnimationFrame(() => {
    loginRememberedDeleteOverlay.classList.add("is-open");
    loginRememberedDeleteConfirm?.focus({ preventScroll: true });
  });
}

function handleRememberedSellerRemove(accountKey) {
  removeRememberedSellerAccount(accountKey);
  const remaining = readRememberedSellerAccounts();
  if (!remaining.length) {
    setLoginSigninMode("credentials", { focusIdentifier: true });
    return;
  }
  void renderRememberedSellerAccounts({ refreshLogos: false, forcePaint: true });
  syncSavedAccountsLinkVisibility();
}

function setFeedback(message, mode) {
  loginFeedback.textContent = message;
  loginFeedback.className = "feedback-note";
  if (mode) {
    loginFeedback.classList.add(mode);
  }
}

function stopLoginValidationLottie() {
  if (loginValidationLottie?.destroy) {
    loginValidationLottie.destroy();
  }
  loginValidationLottie = null;
  employeeIdStatus?.classList.remove("has-lottie");
}

function playLoginValidationSuccessLottie() {
  const target = employeeIdStatus?.querySelector("[data-login-validation-lottie]");
  if (!target) {
    return;
  }

  stopLoginValidationLottie();
  target.innerHTML = "";
  if (!window.lottie?.loadAnimation) {
    return;
  }

  try {
    loginValidationLottie = window.lottie.loadAnimation({
      container: target,
      renderer: "svg",
      loop: false,
      autoplay: true,
      path: loginSuccessAnimationPath,
    });
    employeeIdStatus?.classList.add("has-lottie");
  } catch (error) {
    loginValidationLottie = null;
  }
}

function normalizeLoginModalText(value, fallback = "") {
  const normalized = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
  return normalized || fallback;
}

function formatAdminBanDescription(description) {
  const normalized = normalizeLoginModalText(description);
  if (!normalized) {
    return "Your account has been suspended.";
  }
  return /^your account\b/i.test(normalized)
    ? normalized
    : `Your account has been banned due to ${normalized}`;
}

function clearLoginSessions() {
  try {
    window.sessionStorage.removeItem("gms-admin-session");
    window.sessionStorage.removeItem("gms-employee-session");
    window.sessionStorage.removeItem("gms-super-admin-session");
  } catch (error) {
    console.warn("Unable to clear login sessions.", error);
  }

  clearActiveAdminScope();
}

function openAdminBannedModal(options = {}) {
  const reason = normalizeLoginModalText(
    options.reason,
    "Multiple policy violations detected",
  );
  const description = formatAdminBanDescription(options.description);

  if (adminBannedModalReason) {
    adminBannedModalReason.textContent = reason;
  }

  if (adminBannedModalCopy) {
    adminBannedModalCopy.textContent = description;
  }

  adminBannedModal?.classList.remove("is-description-expanded");
  if (adminBannedModalMore) {
    adminBannedModalMore.textContent = "More";
    adminBannedModalMore.hidden = true;
  }

  clearLoginSessions();
  setFeedback("");

  if (!adminBannedModalOverlay) {
    return;
  }

  adminBannedModalOverlay.hidden = false;
  adminBannedModalOverlay.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");

  window.requestAnimationFrame(() => {
    adminBannedModalOverlay.classList.add("is-open");
    updateAdminBannedModalMoreButton();
    adminBannedModal?.focus();
  });
}

function updateAdminBannedModalMoreButton() {
  if (!adminBannedModalCopy || !adminBannedModalMore) {
    return;
  }

  const isExpanded = adminBannedModal?.classList.contains("is-description-expanded");
  adminBannedModalMore.hidden = !isExpanded && adminBannedModalCopy.scrollHeight <= adminBannedModalCopy.clientHeight + 1;
}

function closeAdminBannedModal() {
  if (!adminBannedModalOverlay) {
    return;
  }

  adminBannedModalOverlay.classList.remove("is-open");
  adminBannedModalOverlay.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  window.setTimeout(() => {
    adminBannedModalOverlay.hidden = true;
  }, 180);
}

function isAdminBannedLoginError(error) {
  const data = error?.data && typeof error.data === "object" ? error.data : {};
  const accountStatus = String(
    data.accountStatus ?? data.status ?? data.accountState ?? "",
  ).trim().toLowerCase();
  const message = String(error?.message ?? "");
  return error?.status === 403 && (
    accountStatus === "banned" ||
    data.isBanned === true ||
    /\bbanned\b/i.test(message)
  );
}

function getAdminBanReasonFromError(error) {
  const data = error?.data && typeof error.data === "object" ? error.data : {};
  return normalizeLoginModalText(
    data.banReason ?? data.reason ?? data.lastBanReason,
    "Multiple policy violations detected",
  );
}

function getAdminBanDescriptionFromError(error) {
  const data = error?.data && typeof error.data === "object" ? error.data : {};
  return normalizeLoginModalText(
    data.banDescription ?? data.description ?? data.banDetails,
  );
}

function normalizeLoginEmployeeId(value) {
  return String(value ?? "").trim().toUpperCase();
}

function normalizeLoginEmployeeIdNumber(value) {
  return String(value ?? "").replace(/\D/g, "").slice(0, 6);
}

function parseLoginEmployeeId(value) {
  const normalized = normalizeLoginEmployeeId(value).replace(/\s+/g, "");
  const dashedMatch = normalized.match(/^([A-Z0-9]{2,8})-(\d{1,6})$/);
  if (dashedMatch) {
    return {
      acronym: dashedMatch[1],
      number: dashedMatch[2].padStart(6, "0"),
      hasAcronym: true,
    };
  }

  const compactMatch = normalized.match(/^([A-Z0-9]*?[A-Z][A-Z0-9]*?)(\d{1,6})$/);
  if (compactMatch) {
    return {
      acronym: compactMatch[1],
      number: compactMatch[2].padStart(6, "0"),
      hasAcronym: true,
    };
  }

  const number = normalizeLoginEmployeeIdNumber(normalized);
  return {
    acronym: "",
    number: number ? number.padStart(6, "0") : "",
    hasAcronym: false,
  };
}

function getLoginEmployeeIdNumber(value) {
  return parseLoginEmployeeId(value).number;
}

function isLoginEmployeeIdentifierMatch(inputValue, accountValue) {
  const inputId = parseLoginEmployeeId(inputValue);
  const accountId = parseLoginEmployeeId(accountValue);
  if (!inputId.number || !accountId.number) {
    return false;
  }

  if (inputId.hasAcronym) {
    return inputId.acronym === accountId.acronym && inputId.number === accountId.number;
  }

  return inputId.number === accountId.number;
}

function normalizeLoginEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeLoginAdminScope(value, fallback = "") {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || fallback;
}

function getAccountAdminScope(account, fallback = "admin") {
  if (!account || typeof account !== "object") {
    return fallback;
  }

  return normalizeLoginAdminScope(
    account.adminId ??
      account.ownerAdminId ??
      account.tenantId ??
      account.workspaceId ??
      account.storeAdminId ??
      account.id ??
      account.accountCode,
    fallback,
  );
}

function saveActiveAdminScope(adminId) {
  const normalizedAdminId = normalizeLoginAdminScope(adminId, "");
  if (!normalizedAdminId) {
    return;
  }

  try {
    window.localStorage.setItem("gms-admin-id", normalizedAdminId);
  } catch (error) {
    console.warn("Unable to save admin scope.", error);
  }
}

function clearActiveAdminScope() {
  try {
    window.localStorage.removeItem("gms-admin-id");
  } catch (error) {
    console.warn("Unable to clear admin scope.", error);
  }
}

function getEmployeeAccountIdentifier(account) {
  return normalizeLoginEmployeeId(account?.employeeId ?? account?.accountCode ?? "");
}

function isCurrentAdminIdentifierMatched() {
  if (activeRole !== "admin") {
    return true;
  }

  const currentAdminEmail = normalizeLoginEmail(identifierInput.value);
  return Boolean(
    currentAdminEmail &&
    currentAdminEmail === adminIdentifierValidEmail &&
    adminIdentifierValidAccount,
  );
}

function isCurrentEmployeeIdentifierMatched() {
  if (activeRole !== "employee") {
    return true;
  }

  const currentEmployeeId = normalizeLoginEmployeeId(identifierInput.value);
  const matchedEmployeeId = getEmployeeAccountIdentifier(employeeIdentifierValidAccount);
  return isLoginEmployeeIdentifierMatch(currentEmployeeId, matchedEmployeeId);
}

function setLoginMetaVisibility() {
  const roleConfig = getRoleConfig(activeRole);
  const shouldShowMeta = Boolean(roleConfig?.showLoginMeta)
    && (activeRole !== "employee" || Boolean(employeeIdentifierValidAccount));
  loginMetaRow.hidden = !shouldShowMeta;
  syncSavedAccountsLinkVisibility();
}

function setLoginSubmitAvailability(options = {}) {
  const { submitting = false } = options;
  // Validate on Sign in only — keep the button usable while typing.
  const isDisabled = Boolean(submitting);
  loginPanelFormSubmitting = Boolean(submitting);
  submitButton.disabled = isDisabled;
  submitButton.setAttribute("aria-disabled", String(isDisabled));
  submitButton.classList.toggle("is-login-ready", !isDisabled);
  syncLoginPanelLoading();
}

let loginPasswordRevealTimer = 0;

function measureLoginPasswordGateHeight() {
  if (!(passwordLabel instanceof HTMLElement)) {
    return 120;
  }
  const body = passwordLabel.querySelector(".login-password-gate__body");
  if (!(body instanceof HTMLElement)) {
    return 120;
  }
  return Math.max(96, Math.ceil(body.scrollHeight || 120));
}

function setEmployeePasswordVisible(isVisible, options = {}) {
  const { clearPassword = false } = options;
  if (!(passwordLabel instanceof HTMLElement)) {
    return;
  }

  const shouldHide = !isVisible;
  const isCurrentlyHidden = passwordLabel.classList.contains("is-hidden");

  passwordInput.disabled = shouldHide;
  passwordInput.required = isVisible;
  passwordLabel.setAttribute("aria-hidden", String(shouldHide));

  if (shouldHide && clearPassword) {
    passwordInput.value = "";
    passwordInput.type = "password";
    setLoginPasswordState("");
  }

  if (shouldHide === isCurrentlyHidden) {
    setLoginMetaVisibility();
    setLoginSubmitAvailability();
    return;
  }

  window.clearTimeout(loginPasswordRevealTimer);

  if (isVisible) {
    passwordLabel.style.setProperty(
      "--login-password-expanded-height",
      `${measureLoginPasswordGateHeight()}px`,
    );
    passwordLabel.classList.remove("is-opening");
    passwordLabel.classList.add("is-hidden");
    void passwordLabel.offsetWidth;

    passwordLabel.classList.remove("is-hidden");
    passwordLabel.classList.add("is-opening");
    loginPasswordRevealTimer = window.setTimeout(() => {
      passwordLabel.classList.remove("is-opening");
      loginPasswordRevealTimer = 0;
    }, 260);
  } else {
    passwordLabel.classList.remove("is-opening");
    passwordLabel.classList.add("is-hidden");
  }

  setLoginMetaVisibility();
  setLoginSubmitAvailability();
}

function setLoginFieldMessage(fieldShell, input, messageElement, mode = "", message = "") {
  if (!(fieldShell instanceof HTMLElement) || !(input instanceof HTMLElement) || !(messageElement instanceof HTMLElement)) {
    return;
  }

  const normalizedMessage = String(message || "").trim();
  fieldShell.classList.remove("has-validation-error", "has-validation-checking");
  messageElement.classList.remove("is-error", "is-checking");
  messageElement.textContent = "";
  input.removeAttribute("aria-invalid");
  input.removeAttribute("aria-describedby");

  if (mode === "checking" && normalizedMessage) {
    fieldShell.classList.add("has-validation-checking");
    messageElement.classList.add("is-checking");
    messageElement.textContent = normalizedMessage;
    input.setAttribute("aria-describedby", messageElement.id);
    return;
  }

  if (mode !== "invalid" || !normalizedMessage) {
    return;
  }

  fieldShell.classList.add("has-validation-error");
  messageElement.classList.add("is-error");
  messageElement.textContent = normalizedMessage;
  input.setAttribute("aria-invalid", "true");
  input.setAttribute("aria-describedby", messageElement.id);
}

function setLoginPasswordState(mode = "", message = "") {
  passwordInput.classList.remove("login-password-invalid");
  setLoginFieldMessage(passwordLabel, passwordInput, passwordMessage, mode, message);
  if (mode === "invalid") {
    passwordInput.classList.add("login-password-invalid");
  }
}

function setLoginIdentifierState(mode = "", message = "Invalid Employee ID") {
  const fallbackIcon = employeeIdStatus?.querySelector(".login-validation-fallback");
  identifierInput.classList.remove("login-employee-id-valid", "login-employee-id-invalid");
  employeeIdStatus.classList.remove("is-valid", "is-invalid", "is-checking");
  stopLoginValidationLottie();
  if (fallbackIcon) {
    fallbackIcon.innerHTML = "";
  }
  setLoginFieldMessage(identifierLabel, identifierInput, identifierMessage);
  delete employeeIdStatus.dataset.employeeTooltip;
  employeeIdStatus.removeAttribute("aria-label");
  employeeIdStatus.removeAttribute("tabindex");

  if (activeRole !== "admin" && activeRole !== "employee") {
    syncLoginPanelLoading();
    return;
  }

  if (mode === "valid") {
    // Correct values stay neutral — only errors show red styling.
    employeeIdStatus.setAttribute("aria-label", "Account verified");
  }

  if (mode === "checking") {
    employeeIdStatus.classList.add("is-checking");
    employeeIdStatus.setAttribute("aria-label", "Checking account");
    setLoginFieldMessage(
      identifierLabel,
      identifierInput,
      identifierMessage,
      "checking",
      "Checking account...",
    );
  }

  if (mode === "invalid") {
    identifierInput.classList.add("login-employee-id-invalid");
    employeeIdStatus.classList.add("is-invalid");
    employeeIdStatus.setAttribute("aria-label", message);
    setLoginFieldMessage(identifierLabel, identifierInput, identifierMessage, "invalid", message);
    if (fallbackIcon) {
      fallbackIcon.innerHTML = loginValidationErrorIconMarkup;
    }
  }

  syncLoginPanelLoading();
}

function setEmployeeIdentifierState(mode = "", message = "Invalid Employee ID") {
  setLoginIdentifierState(mode, message);
}

function resetEmployeeIdentifierState(options = {}) {
  const { hidePassword = true, clearPassword = false } = options;
  window.clearTimeout(employeeIdValidationTimer);
  window.clearTimeout(adminEmailValidationTimer);
  employeeIdValidationRequestId += 1;
  employeeIdentifierValidAccount = null;
  adminIdentifierValidAccount = null;
  adminIdentifierValidEmail = "";
  lastInvalidEmployeeIdPopupValue = "";
  lastInvalidAdminEmailPopupValue = "";
  setLoginIdentifierState("");
  setEmployeePasswordVisible(!hidePassword, { clearPassword });
}

async function findEmployeeAccountById(employeeId) {
  const normalizedEmployeeId = normalizeLoginEmployeeId(employeeId);
  const response = await fetch(
    `/api/employee-lookup?employeeId=${encodeURIComponent(normalizedEmployeeId)}`,
    {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    },
  );
  const data = await response.json().catch(() => ({}));

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(data?.message || "Unable to check employee ID.");
  }

  const account = data?.account && typeof data.account === "object" ? data.account : null;
  if (String(account?.role ?? "").trim().toLowerCase() !== "employee") {
    return null;
  }

  return account;
}

function showEmployeeIdValidationModal(message, employeeId, options = {}) {
  const { force = false, openDialog = false } = options;
  setEmployeeIdentifierState("invalid", message);
  employeeIdentifierValidAccount = null;
  setEmployeePasswordVisible(false, { clearPassword: true });

  const normalizedEmployeeId = normalizeLoginEmployeeId(employeeId);
  if (!force && normalizedEmployeeId === lastInvalidEmployeeIdPopupValue) {
    return;
  }

  lastInvalidEmployeeIdPopupValue = normalizedEmployeeId;
  if (!openDialog) {
    return;
  }

  openLoginValidationModal(message, {
    title: "Invalid Employee ID",
    actionLabel: "Review Employee ID",
    focusTarget: identifierInput,
  });
}

function showAdminEmailValidationPopup(message, email, options = {}) {
  const { force = false, openDialog = false } = options;
  setLoginIdentifierState("invalid", message);
  adminIdentifierValidAccount = null;
  adminIdentifierValidEmail = "";
  setEmployeePasswordVisible(false, { clearPassword: true });

  const normalizedEmail = normalizeLoginEmail(email);
  if (!force && normalizedEmail === lastInvalidAdminEmailPopupValue) {
    return;
  }

  lastInvalidAdminEmailPopupValue = normalizedEmail;
  if (!openDialog) {
    return;
  }

  openLoginValidationModal(message, {
    title: "Invalid Seller Email",
    actionLabel: "Review Seller Email",
    focusTarget: identifierInput,
  });
}

async function findAdminAccountByEmail(email) {
  const normalizedEmail = normalizeLoginEmail(email);
  const response = await fetch(
    `/api/admin-lookup?email=${encodeURIComponent(normalizedEmail)}`,
    {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    },
  );
  const data = await response.json().catch(() => ({}));

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const lookupError = new Error(data?.message || "Unable to check seller account.");
    lookupError.status = response.status;
    lookupError.data = data && typeof data === "object" ? data : {};
    throw lookupError;
  }

  return data?.account && typeof data.account === "object" ? data.account : null;
}

async function validateAdminIdentifier(options = {}) {
  const { showModal = false, forcePopup = false } = options;

  if (activeRole !== "admin") {
    return { valid: true, email: "" };
  }

  const adminEmail = normalizeLoginEmail(identifierInput.value);
  identifierInput.value = adminEmail;

  if (isCurrentAdminIdentifierMatched()) {
    setFeedback("");
    setLoginIdentifierState("valid");
    setEmployeePasswordVisible(true);
    return { valid: true, email: adminEmail };
  }

  const requestId = ++adminEmailValidationRequestId;

  if (!adminEmail) {
    adminIdentifierValidAccount = null;
    adminIdentifierValidEmail = "";
    setLoginIdentifierState("");
    setEmployeePasswordVisible(false, { clearPassword: true });
    return { valid: false, message: "Please enter seller email address." };
  }

  if (!emailPattern.test(adminEmail)) {
    const message = "Invalid Seller Email";
    if (showModal) {
      showAdminEmailValidationPopup(message, adminEmail, { force: forcePopup });
    } else {
      setLoginIdentifierState("invalid", message);
      setEmployeePasswordVisible(false, { clearPassword: true });
    }
    return { valid: false, message };
  }

  const loadingStartedAt = Date.now();
  try {
    setFeedback("");
    setLoginIdentifierState("checking");
    const adminAccount = await findAdminAccountByEmail(adminEmail);
    await ensureLoginLoadingDelay(loadingStartedAt);
    if (requestId !== adminEmailValidationRequestId) {
      return { valid: false, stale: true, message: "" };
    }

    if (!adminAccount) {
      const message = "Registered seller account not found.";
      if (showModal) {
        showAdminEmailValidationPopup(message, adminEmail, { force: forcePopup });
      } else {
        setLoginIdentifierState("invalid", message);
        setEmployeePasswordVisible(false, { clearPassword: true });
      }
      return { valid: false, message };
    }

    adminIdentifierValidAccount = adminAccount;
    adminIdentifierValidEmail = adminEmail;
    lastInvalidAdminEmailPopupValue = "";
    setLoginIdentifierState("valid");
    setEmployeePasswordVisible(true);
    setLoginSubmitAvailability();
    return { valid: true, email: adminEmail, account: adminAccount };
  } catch (error) {
    console.warn("Unable to check seller account.", error);
    await ensureLoginLoadingDelay(loadingStartedAt);
    setFeedback("");
    if (requestId === adminEmailValidationRequestId && showModal) {
      openLoginValidationModal(
        error instanceof Error ? error.message : "Unable to check seller account.",
        {
          title: "Seller Account Check Failed",
          actionLabel: "Try Again",
          focusTarget: identifierInput,
        },
      );
    }
    if (requestId !== adminEmailValidationRequestId) {
      return { valid: false, stale: true, message: "" };
    }
    setLoginIdentifierState("invalid", error instanceof Error ? error.message : "Unable to check seller account.");
    setEmployeePasswordVisible(false, { clearPassword: true });
    return {
      valid: false,
      message: error instanceof Error ? error.message : "Unable to check seller account.",
    };
  }
}

function scheduleAdminIdentifierValidation() {
  if (activeRole !== "admin") {
    return;
  }

  const adminEmail = normalizeLoginEmail(identifierInput.value);
  identifierInput.value = adminEmail;
  window.clearTimeout(adminEmailValidationTimer);
  adminEmailValidationRequestId += 1;
  adminIdentifierValidAccount = null;
  adminIdentifierValidEmail = "";
  lastInvalidAdminEmailPopupValue = "";
  setLoginIdentifierState("");
  setEmployeePasswordVisible(false, { clearPassword: true });
  setFeedback("");

  if (!adminEmail) {
    setLoginSubmitAvailability();
    return;
  }

  adminEmailValidationTimer = window.setTimeout(() => {
    void validateAdminIdentifier({
      showModal: adminEmail.includes("@") && adminEmail.includes("."),
    });
  }, 360);
}

function inferLoginRoleFromIdentifier(value) {
  const rawValue = String(value ?? "").trim();
  if (!rawValue) {
    return "admin";
  }

  if (rawValue.includes("@")) {
    return "admin";
  }

  const normalizedEmployeeId = normalizeLoginEmployeeId(rawValue);
  const employeeIdNumber = normalizeLoginEmployeeIdNumber(normalizedEmployeeId);
  if (employeeIdPattern.test(normalizedEmployeeId) && employeeIdNumber.length >= 6) {
    return "employee";
  }

  return "admin";
}

function handleLoginIdentifierInput() {
  const currentValue = identifierInput.value;

  if (BUYER_APP_MODE || activeRole === "buyer") {
    if (activeRole !== "buyer") {
      setActiveRole("buyer", {
        preserveCredentials: true,
        quiet: true,
      });
      identifierInput.value = currentValue;
    }

    const trimmedValue = String(identifierInput.value || "").trim();
    window.clearTimeout(employeeIdValidationTimer);
    window.clearTimeout(adminEmailValidationTimer);
    employeeIdValidationRequestId += 1;
    adminEmailValidationRequestId += 1;
    adminIdentifierValidAccount = null;
    adminIdentifierValidEmail = "";
    employeeIdentifierValidAccount = null;
    setLoginIdentifierState("");
    setLoginPasswordState("");
    setFeedback("");
    setEmployeePasswordVisible(Boolean(trimmedValue), {
      clearPassword: !trimmedValue,
    });
    setLoginSubmitAvailability();
    return;
  }

  const nextRole = inferLoginRoleFromIdentifier(currentValue);
  if (nextRole !== activeRole) {
    setActiveRole(nextRole, {
      preserveCredentials: true,
      quiet: true,
    });
    identifierInput.value = nextRole === "employee"
      ? normalizeLoginEmployeeId(currentValue)
      : currentValue;
  }

  const trimmedValue = String(identifierInput.value || "").trim();
  if (nextRole === "admin") {
    const email = normalizeLoginEmail(trimmedValue);
    if (!email || email !== adminIdentifierValidEmail) {
      adminIdentifierValidAccount = null;
      adminIdentifierValidEmail = "";
    }
  } else {
    const employeeId = normalizeLoginEmployeeId(trimmedValue);
    const matchedId = getEmployeeAccountIdentifier(employeeIdentifierValidAccount);
    if (!employeeId || !isLoginEmployeeIdentifierMatch(employeeId, matchedId)) {
      employeeIdentifierValidAccount = null;
    }
  }

  window.clearTimeout(employeeIdValidationTimer);
  window.clearTimeout(adminEmailValidationTimer);
  employeeIdValidationRequestId += 1;
  adminEmailValidationRequestId += 1;
  setLoginIdentifierState("");
  setLoginPasswordState("");
  setFeedback("");
  setEmployeePasswordVisible(Boolean(trimmedValue), {
    clearPassword: !trimmedValue,
  });
  setLoginSubmitAvailability();
}

function scheduleLoginIdentifierValidation() {
  handleLoginIdentifierInput();
}

async function verifyAdminLogin(email, password) {
  try {
    const response = await fetch("/api/admin-login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json().catch(() => ({}));

    if (response.status === 404) {
      return { connected: false };
    }

    if (!response.ok) {
      const loginError = new Error(
        response.status === 401
          ? data.message || "Admin email or password is incorrect."
          : data.message || "Unable to sign in admin.",
      );
      loginError.status = response.status;
      loginError.data = data && typeof data === "object" ? data : {};
      throw loginError;
    }

    return { connected: true, data };
  } catch (error) {
    if (error instanceof TypeError) {
      return { connected: false };
    }

    throw error;
  }
}

async function validateEmployeeIdentifier(options = {}) {
  const { showModal = false, forcePopup = false } = options;

  if (activeRole !== "employee") {
    return { valid: true, account: null };
  }

  const employeeId = normalizeLoginEmployeeId(identifierInput.value);
  identifierInput.value = employeeId;

  if (isCurrentEmployeeIdentifierMatched()) {
    setFeedback("");
    setEmployeeIdentifierState("valid");
    setEmployeePasswordVisible(true);
    return { valid: true, account: employeeIdentifierValidAccount };
  }

  const requestId = ++employeeIdValidationRequestId;

  if (!employeeId) {
    employeeIdentifierValidAccount = null;
    setEmployeeIdentifierState("");
    setEmployeePasswordVisible(false, { clearPassword: true });
    return { valid: false, message: "Please enter employee ID." };
  }

  if (!employeeIdPattern.test(employeeId)) {
    const message = "Invalid Employee ID";
    if (showModal) {
      showEmployeeIdValidationModal(message, employeeId, { force: forcePopup });
    } else {
      setEmployeeIdentifierState("invalid", message);
      setEmployeePasswordVisible(false, { clearPassword: true });
    }
    return { valid: false, message };
  }

  const loadingStartedAt = Date.now();
  try {
    setFeedback("");
    setEmployeeIdentifierState("checking");
    const employeeAccount = await findEmployeeAccountById(employeeId);
    await ensureLoginLoadingDelay(loadingStartedAt);
    if (requestId !== employeeIdValidationRequestId) {
      return { valid: false, stale: true, message: "" };
    }

    setFeedback("");

    if (!employeeAccount) {
      const message = "Invalid Employee ID";
      if (showModal) {
        showEmployeeIdValidationModal(message, employeeId, { force: forcePopup });
      } else {
        setEmployeeIdentifierState("invalid", message);
        setEmployeePasswordVisible(false, { clearPassword: true });
      }
      return { valid: false, message };
    }

    employeeIdentifierValidAccount = employeeAccount;
    lastInvalidEmployeeIdPopupValue = "";
    setEmployeeIdentifierState("valid");
    setEmployeePasswordVisible(true);
    return { valid: true, account: employeeAccount };
  } catch (error) {
    console.warn("Unable to check employee ID.", error);
    await ensureLoginLoadingDelay(loadingStartedAt);
    setFeedback("");
    if (requestId !== employeeIdValidationRequestId) {
      return { valid: false, stale: true, message: "" };
    }
    if (showModal) {
      openLoginValidationModal(
        error instanceof Error ? error.message : "Unable to check employee ID.",
        {
          title: "Employee ID Check Failed",
          actionLabel: "Try Again",
          focusTarget: identifierInput,
        },
      );
    }
    return {
      valid: false,
      message: error instanceof Error ? error.message : "Unable to check employee ID.",
    };
  }
}

function scheduleEmployeeIdentifierValidation() {
  if (activeRole !== "employee") {
    return;
  }

  const employeeId = normalizeLoginEmployeeId(identifierInput.value);
  identifierInput.value = employeeId;
  window.clearTimeout(employeeIdValidationTimer);
  employeeIdValidationRequestId += 1;
  employeeIdentifierValidAccount = null;
  lastInvalidEmployeeIdPopupValue = "";
  setEmployeeIdentifierState("");
  setEmployeePasswordVisible(false, { clearPassword: true });
  setFeedback("");

  if (
    !employeeId ||
    (employeeId.includes("-") && employeeId.length < 10) ||
    (!employeeId.includes("-") && normalizeLoginEmployeeIdNumber(employeeId).length < 6)
  ) {
    return;
  }

  employeeIdValidationTimer = window.setTimeout(() => {
    void validateEmployeeIdentifier({ showModal: true });
  }, 450);
}

function closeLoginValidationModal(options = {}) {
  const { restoreFocus = true } = options;

  if (restoreFocus && loginValidationFocusTarget instanceof HTMLElement) {
    window.setTimeout(() => {
      loginValidationFocusTarget.focus();
    }, 0);
  }

  loginValidationFocusTarget = null;
}

function openLoginValidationModal(message, options = {}) {
  const {
    title = "Error",
    focusTarget = null,
  } = options;

  loginValidationFocusTarget = focusTarget instanceof HTMLElement ? focusTarget : null;
  setFeedback("");

  window.setTimeout(() => {
    loginValidationFocusTarget?.focus();
  }, 0);
}

function openPasswordValidationModal(message, options = {}) {
  setLoginPasswordState("invalid", message);
  openLoginValidationModal(message, {
    title: "Invalid Password",
    actionLabel: "Review Password",
    focusTarget: passwordInput,
    ...options,
  });
}

function getEmployeeDashboardPath(accountOrPosition) {
  const account = accountOrPosition && typeof accountOrPosition === "object"
    ? accountOrPosition
    : null;
  const normalizedPosition =
    String(account?.position ?? accountOrPosition ?? "").trim().toLowerCase();
  const permissionPaths = [
    ["admin-dashboard", "/main.html#dashboard"],
    ["live-chat", "/main.html#live-chat"],
    ["insight", "/insight.html"],
    ["product-insight", "/listing_insight.html"],
    ["products", "/product_panel.html"],
    ["admin-inventory", "/main.html#inventory"],
    ["employee-data", "/Employee_data.html"],
    ["register", "/register.html"],
    ["employee-dashboard", "/employee_dashboard.html"],
  ];

  if (
    Array.isArray(account?.accessPermissions)
    && (account.accessPermissionsConfigured || account.accessPermissions.length > 0)
  ) {
    const accessPermissions = account.accessPermissions.map((permission) =>
      String(permission ?? "").trim().toLowerCase(),
    );
    if (normalizedPosition === "packing") {
      return accessPermissions.includes("packing-dashboard")
        ? "/packing_dashboard.html"
        : "/employee_access_pending.html";
    }
    const matchedPermission = permissionPaths.find(([permission]) =>
      accessPermissions.includes(permission),
    );
    return matchedPermission?.[1] || "/employee_access_pending.html";
  }

  if (normalizedPosition === "packing") {
    return "/packing_dashboard.html";
  }
  if (normalizedPosition) {
    return "/employee_dashboard.html";
  }

  return "/employee_access_pending.html";
}

function readActiveEmployeeSession() {
  try {
    const rawSession = window.sessionStorage.getItem("gms-employee-session");
    return rawSession ? JSON.parse(rawSession) : null;
  } catch (error) {
    return null;
  }
}

function redirectAuthenticatedEmployeeFromLogin(role) {
  if (role !== "employee") {
    return false;
  }

  const employeeSession = readActiveEmployeeSession();
  if (!employeeSession || typeof employeeSession !== "object") {
    return false;
  }

  const storedDashboardPath = String(employeeSession.dashboardPath ?? "").trim();
  const redirectPath = /^\/live_chat\.html(?:[?#]|$)/i.test(storedDashboardPath)
    ? "/main.html#live-chat"
    : storedDashboardPath || getEmployeeDashboardPath(employeeSession);
  if (redirectPath !== String(employeeSession.dashboardPath ?? "").trim()) {
    try {
      window.sessionStorage.setItem(
        "gms-employee-session",
        JSON.stringify({
          ...employeeSession,
          dashboardPath: redirectPath,
        }),
      );
    } catch (error) {
      console.warn("Unable to update employee dashboard path.", error);
    }
  }
  window.location.replace(mainWorkspacePath);
  return true;
}

function setActiveRole(role, options = {}) {
  const { preserveCredentials = false, quiet = false } = options;
  if (BUYER_APP_MODE) {
    role = "buyer";
  }
  const roleConfig = getRoleConfig(role);
  if (!roleConfig) {
    return;
  }

  const currentIdentifierValue = identifierInput.value;
  const currentPasswordValue = passwordInput.value;
  closeLoginValidationModal({ restoreFocus: false });
  activeRole = role;
  loginForm.classList.toggle("is-admin-login", role === "admin");
  loginForm.classList.toggle("is-employee-login", role === "employee");
  loginForm.classList.toggle("is-buyer-login", role === "buyer");

  roleButtons.forEach((button) => {
    const isActive = button.dataset.role === role;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  loginPanelTitle.textContent = roleConfig.title;
  if (loginPanelSubtitle) {
    loginPanelSubtitle.textContent = t("panel.subtitle");
  }
  if (googleVerifyState.active) {
    if (loginPanelTitle) {
      loginPanelTitle.textContent = "Enter verification code";
    }
    if (loginPanelSubtitle) {
      loginPanelSubtitle.textContent = `We sent a 6-digit code to ${googleVerifyState.email}.`;
    }
  }
  identifierText.textContent = roleConfig.identifierLabel;
  identifierInput.type = roleConfig.identifierType;
  identifierInput.name = roleConfig.identifierName;
  identifierInput.placeholder = roleConfig.identifierPlaceholder;
  identifierInput.autocomplete = roleConfig.identifierAutocomplete;
  identifierInput.readOnly = Boolean(roleConfig.identifierReadOnly);
  passwordText.textContent = roleConfig.passwordLabel;
  passwordInput.placeholder = roleConfig.passwordPlaceholder;
  passwordInput.autocomplete = roleConfig.passwordAutocomplete;
  identifierInput.value = preserveCredentials ? currentIdentifierValue : "";
  passwordInput.value = preserveCredentials ? currentPasswordValue : "";
  helpLink.textContent = roleConfig.helpText;
  if (submitButtonLabel) {
    submitButtonLabel.textContent = roleConfig.submitText;
  } else {
    submitButton.textContent = roleConfig.submitText;
  }
  resetEmployeeIdentifierState({
    hidePassword: true,
    clearPassword: !preserveCredentials,
  });
  if (preserveCredentials) {
    identifierInput.value = currentIdentifierValue;
    passwordInput.value = currentPasswordValue;
  }
  setLoginMetaVisibility();
  if (role === "employee" && loginSigninMode === "accounts") {
    setLoginSigninMode("credentials");
  } else {
    syncSavedAccountsLinkVisibility();
  }
  if (!quiet) {
    setFeedback(roleConfig.idleMessage);
  }
}

function getLoginLanguageOptionLabel(language) {
  const code = normalizeLoginLanguage(language);
  if (languageSelect instanceof HTMLSelectElement) {
    const option = Array.from(languageSelect.options).find((entry) => entry.value === code);
    if (option) {
      return String(option.textContent || "").trim() || code;
    }
  }
  const menuOption = languageOptions.find((entry) => entry.getAttribute("data-login-language-option") === code);
  return String(menuOption?.textContent || code).trim() || code;
}

function syncLoginLanguageDropdownUI(language = activeLanguage) {
  const nextLanguage = normalizeLoginLanguage(language);
  const label = getLoginLanguageOptionLabel(nextLanguage);
  if (languageLabel instanceof HTMLElement) {
    languageLabel.textContent = label;
  }
  if (languageSelect instanceof HTMLSelectElement && languageSelect.value !== nextLanguage) {
    languageSelect.value = nextLanguage;
  }
  languageOptions.forEach((option) => {
    const isSelected = option.getAttribute("data-login-language-option") === nextLanguage;
    option.classList.toggle("is-selected", isSelected);
    option.setAttribute("aria-checked", String(isSelected));
  });
}

function setLoginLanguageDropdownOpen(shouldOpen) {
  const open = Boolean(shouldOpen);
  if (languageDropdown instanceof HTMLElement) {
    languageDropdown.classList.toggle("is-open", open);
  }
  if (languageMenu instanceof HTMLElement) {
    languageMenu.hidden = !open;
  }
  if (languageTrigger instanceof HTMLButtonElement) {
    languageTrigger.setAttribute("aria-expanded", String(open));
  }
}

function closeLoginLanguageDropdown() {
  setLoginLanguageDropdownOpen(false);
}

function toggleLoginLanguageDropdown() {
  const isOpen = languageDropdown instanceof HTMLElement && languageDropdown.classList.contains("is-open");
  setLoginLanguageDropdownOpen(!isOpen);
}

function applyLoginLanguage(language, options = {}) {
  const nextLanguage = normalizeLoginLanguage(language);
  activeLanguage = nextLanguage;
  document.documentElement.lang = LOGIN_LANGUAGE_HTML_LANG[nextLanguage] || "en";
  document.documentElement.dir = nextLanguage === "ar" ? "rtl" : "ltr";
  document.body?.classList.toggle("login-page--rtl", nextLanguage === "ar");
  syncLoginLanguageDropdownUI(nextLanguage);
  if (options.persist !== false) {
    saveLoginLanguage(nextLanguage);
  }

  if (loginPanelSubtitle) loginPanelSubtitle.textContent = t("panel.subtitle");
  if (loginRememberedEmailBtn?.querySelector("span")) {
    loginRememberedEmailBtn.querySelector("span").textContent = t("remembered.button.email");
  }
  if (loginRememberedTitle) loginRememberedTitle.textContent = t("remembered.title");
  if (loginSecurityNoteText) loginSecurityNoteText.textContent = t("security.note");
  guestActionLabels.forEach((node) => {
    node.textContent = t("guest.cta");
  });
  loginSignupPrompts.forEach((node) => {
    node.textContent = t("signup.prompt");
  });
  loginSignupLinks.forEach((node) => {
    node.textContent = t("signup.link");
  });
  if (loginPrivacyLink) loginPrivacyLink.textContent = t("support.privacy");
  if (loginTermsLink) loginTermsLink.textContent = t("support.terms");
  if (loginSupportPrompt) loginSupportPrompt.textContent = t("support.prompt");
  if (loginHelpCentreLink) loginHelpCentreLink.textContent = t("support.link");

  if (forgotEmailInput) forgotEmailInput.placeholder = t("forgot.email.placeholder");
  if (forgotPasswordInput) forgotPasswordInput.placeholder = t("forgot.password.placeholder");
  if (forgotPasswordConfirmInput) forgotPasswordConfirmInput.placeholder = t("forgot.confirm.placeholder");

  const forgotEmailLabel = forgotEmailField?.querySelector(".login-field__label");
  const forgotPasswordLabelText = forgotPasswordField?.querySelector(".login-field__label");
  const forgotConfirmLabelText = forgotPasswordConfirmField?.querySelector(".login-field__label");
  if (forgotEmailLabel) forgotEmailLabel.textContent = t("forgot.email.label");
  if (forgotPasswordLabelText) forgotPasswordLabelText.textContent = t("forgot.password.label");
  if (forgotConfirmLabelText) forgotConfirmLabelText.textContent = t("forgot.confirm.label");

  setActiveRole(activeRole, { preserveCredentials: true, quiet: true });
  paintRememberedSellerAccounts(readRememberedSellerAccounts(), { forcePaint: true });
  try {
    if (forgotState && typeof setForgotStep === "function") {
      setForgotStep(forgotState.step, { animate: false });
    }
  } catch (error) {
    // Forgot-password UI may still be initializing during early boot.
  }
}

languageSelect?.addEventListener("change", (event) => {
  applyLoginLanguage(event.target.value);
  closeLoginLanguageDropdown();
});

languageTrigger?.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  toggleLoginLanguageDropdown();
});

languageOptions.forEach((option) => {
  option.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const nextLanguage = normalizeLoginLanguage(option.getAttribute("data-login-language-option"));
    if (languageSelect instanceof HTMLSelectElement) {
      languageSelect.value = nextLanguage;
      languageSelect.dispatchEvent(new Event("change", { bubbles: true }));
    } else {
      applyLoginLanguage(nextLanguage);
      closeLoginLanguageDropdown();
    }
  });
});

document.addEventListener("click", (event) => {
  if (!(languageDropdown instanceof HTMLElement) || !languageDropdown.classList.contains("is-open")) {
    return;
  }
  if (event.target instanceof Node && languageDropdown.contains(event.target)) {
    return;
  }
  closeLoginLanguageDropdown();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeLoginLanguageDropdown();
  }
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(loginForm);
  const identifier = String(identifierInput.value ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();

  // Buyer entry (same APIs as login.dart) — seller/admin workspace hidden for now.
  if (BUYER_APP_MODE || activeRole === "buyer") {
    const email = normalizeLoginEmail(identifier);
    if (!email || !emailPattern.test(email)) {
      openLoginValidationModal("Please enter a valid email address.", {
        title: "Email Required",
        actionLabel: "Try Again",
        focusTarget: identifierInput,
      });
      identifierInput.focus();
      return;
    }
    if (!password) {
      openPasswordValidationModal("Please enter your password.", {
        title: "Password Required",
        actionLabel: "Enter Password",
      });
      return;
    }
    if (password.length < 6) {
      openPasswordValidationModal("Password must be at least 6 characters long.");
      return;
    }

    const loadingStartedAt = Date.now();
    setLoginSubmitAvailability({ submitting: true });
    setFeedback("Checking your Switch account...");

    try {
      const response = await fetch("/api/accounts/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json().catch(() => ({}));
      await ensureLoginLoadingDelay(loadingStartedAt);

      if (!response.ok) {
        const loginError = new Error(data.message || "Unable to sign in.");
        loginError.status = response.status;
        loginError.data = data;
        throw loginError;
      }

      persistBuyerSessionFromLogin(data, email);
    } catch (error) {
      await ensureLoginLoadingDelay(loadingStartedAt);
      setLoginSubmitAvailability();
      const message = error instanceof Error ? error.message : "Unable to sign in.";
      const errorCode = error?.data?.code || "";
      if (
        errorCode === "google_sign_in_required"
        || /google sign-in/i.test(message)
      ) {
        openLoginValidationModal(message, {
          title: "Continue with Google",
          actionLabel: "OK",
          focusTarget: identifierInput,
        });
      } else if (error?.status === 401 || /password/i.test(message)) {
        openPasswordValidationModal(message);
      } else {
        openLoginValidationModal(message, {
          title: "Sign-in Error",
          actionLabel: "Try Again",
          focusTarget: identifierInput,
        });
      }
    }
    return;
  }

  const submittedRole = inferLoginRoleFromIdentifier(identifier);
  if (submittedRole !== activeRole) {
    setActiveRole(submittedRole, {
      preserveCredentials: true,
      quiet: true,
    });
    identifierInput.value = submittedRole === "employee"
      ? normalizeLoginEmployeeId(identifier)
      : identifier;
  }

  if (activeRole === "admin") {
    if (!identifier) {
      showAdminEmailValidationPopup("Registered seller account not found.", identifier, { force: true });
      identifierInput.focus();
      return;
    }

    const adminEmailValidationState = await validateAdminIdentifier({
      showModal: true,
      forcePopup: true,
    });
    if (!adminEmailValidationState.valid) {
      return;
    }

    if (!password) {
      openPasswordValidationModal("Please enter your seller password.", {
        title: "Password Required",
        actionLabel: "Enter Password",
      });
      return;
    }
  }

  if (activeRole === "employee") {
    if (!identifier) {
      showEmployeeIdValidationModal("Invalid Employee ID", identifier, { force: true });
      identifierInput.focus();
      return;
    }

    const employeeIdValidationState = await validateEmployeeIdentifier({
      showModal: true,
      forcePopup: true,
    });
    if (!employeeIdValidationState.valid) {
      return;
    }

    if (!password) {
      openPasswordValidationModal("Please enter your employee password.", {
        title: "Password Required",
        actionLabel: "Enter Password",
      });
      return;
    }
  }

  if (password.length < 6) {
    openPasswordValidationModal("Password must be at least 6 characters long.");
    return;
  }

  if (activeRole === "admin") {
    const adminEmail = normalizeLoginEmail(identifierInput.value);
    const loadingStartedAt = Date.now();
    setLoginSubmitAvailability({ submitting: true });
    setFeedback(t("feedback.checkingSeller"));

    try {
      const adminLoginState = await verifyAdminLogin(adminEmail, password);
      await ensureLoginLoadingDelay(loadingStartedAt);

      if (!adminLoginState.connected) {
        setLoginSubmitAvailability();
        setFeedback(
          "Seller login validation is ready. Connect /api/admin-login when the database is available.",
        );
        return;
      }

      const dashboardPath =
        String(
          adminLoginState.data?.dashboardPath ??
            adminLoginState.data?.redirectPath ??
            "/main.html#dashboard",
        ).trim() || "/main.html#dashboard";
      const redirectPath = mainWorkspacePath;
      setFeedback(
        adminLoginState.data?.message || "Seller login successful.",
        "success",
      );

      try {
        const adminData = adminLoginState.data?.admin || {};
        const adminScopeId = getAccountAdminScope(adminData, "admin");
        const adminSession = {
          ...adminData,
          role: "admin",
          adminId: adminScopeId,
          email: adminEmail,
          dashboardPath,
          signedInAt: new Date().toISOString(),
        };
        window.sessionStorage.removeItem("gms-employee-session");
        window.sessionStorage.removeItem("gms-super-admin-session");
        saveActiveAdminScope(adminScopeId);
        window.sessionStorage.setItem(
          "gms-admin-session",
          JSON.stringify(adminSession),
        );
        upsertRememberedSellerAccount(adminSession);
        window.dispatchEvent(
          new CustomEvent("gms-admin-session-updated", {
            detail: { session: adminSession },
          }),
        );
      } catch (storageError) {
        console.warn("Unable to save admin session.", storageError);
      }

      if (redirectPath) {
        window.location.href = redirectPath;
      } else {
        setLoginSubmitAvailability();
      }
    } catch (error) {
      await ensureLoginLoadingDelay(loadingStartedAt);
      setLoginSubmitAvailability();
      const adminErrorMessage = error instanceof Error
        ? error.message
        : "Unable to sign in admin.";
      const isPasswordError = error?.status === 401 || /password/i.test(adminErrorMessage);

      if (isAdminBannedLoginError(error)) {
        openAdminBannedModal({
          reason: getAdminBanReasonFromError(error),
          description: getAdminBanDescriptionFromError(error),
        });
      } else if (isPasswordError) {
        openPasswordValidationModal(adminErrorMessage);
      } else {
        openLoginValidationModal(adminErrorMessage, {
          title: "Seller Login Error",
          actionLabel: "Try Again",
          focusTarget: identifierInput,
        });
      }
    }
    return;
  }

  if (activeRole === "employee") {
    const loadingStartedAt = Date.now();
    setLoginSubmitAvailability({ submitting: true });
    setFeedback(t("feedback.checkingEmployee"));
    const resolvedEmployeeId =
      getEmployeeAccountIdentifier(employeeIdentifierValidAccount) || normalizeLoginEmployeeId(identifier);

    try {
      const response = await fetch("/api/employee-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employeeId: resolvedEmployeeId,
          password,
        }),
      });
      const data = await response.json().catch(() => ({}));
      await ensureLoginLoadingDelay(loadingStartedAt);

      if (!response.ok) {
        const loginError = new Error(
          response.status === 401
            ? "Incorrect password. Please try again."
            : data.message || "Unable to sign in employee.",
        );
        loginError.status = response.status;
        throw loginError;
      }

      const employeeAccount = data.account || {
        employeeId: resolvedEmployeeId,
        position: "",
      };
      const dashboardPath =
        String(data.dashboardPath ?? data.redirectPath ?? "").trim()
        || getEmployeeDashboardPath(employeeAccount);
      const redirectPath = mainWorkspacePath;

      try {
        const employeeAdminScopeId = normalizeLoginAdminScope(
          data.adminId,
          getAccountAdminScope(employeeAccount, "admin"),
        );
        const employeeSession = {
          ...employeeAccount,
          adminId: employeeAdminScopeId,
          dashboardPath,
          signedInAt: new Date().toISOString(),
        };
        window.sessionStorage.removeItem("gms-admin-session");
        window.sessionStorage.removeItem("gms-super-admin-session");
        saveActiveAdminScope(employeeAdminScopeId);
        window.sessionStorage.setItem(
          "gms-employee-session",
          JSON.stringify(employeeSession),
        );
        window.dispatchEvent(
          new CustomEvent("gms-employee-session-updated", {
            detail: { session: employeeSession },
          }),
        );
      } catch (storageError) {
        console.warn("Unable to save employee session.", storageError);
      }

      setFeedback("Employee login successful. Redirecting...", "success");
      window.location.replace(redirectPath);
    } catch (error) {
      await ensureLoginLoadingDelay(loadingStartedAt);
      setLoginSubmitAvailability();
      const loginErrorMessage = error instanceof Error
        ? error.message
        : "Unable to sign in employee.";
      const isPasswordError = employeeIdentifierValidAccount
        && (error?.status === 401 || /password/i.test(loginErrorMessage));

      if (isPasswordError) {
        openPasswordValidationModal(loginErrorMessage);
      } else {
        openLoginValidationModal(loginErrorMessage, {
          title: "Employee Login Error",
          actionLabel: "Try Again",
          focusTarget: identifierInput,
        });
      }
    }
    return;
  }

  setFeedback("");
});

adminBannedCloseButton?.addEventListener("click", () => {
  closeAdminBannedModal();
  identifierInput.focus();
});

adminBannedModalXClose?.addEventListener("click", () => {
  closeAdminBannedModal();
  identifierInput.focus();
});

adminBannedModalMore?.addEventListener("click", () => {
  const isExpanded = adminBannedModal?.classList.toggle("is-description-expanded");
  adminBannedModalMore.textContent = isExpanded ? "Show less" : "More";
  updateAdminBannedModalMoreButton();
});

adminBannedSupportButton?.addEventListener("click", () => {
  const email = normalizeLoginEmail(identifierInput.value);
  const subject = encodeURIComponent("Admin account ban review");
  const body = encodeURIComponent(
    email
      ? `Hello support,\n\nPlease review the banned admin account for ${email}.\n\nThank you.`
      : "Hello support,\n\nPlease review my banned admin account.\n\nThank you.",
  );
  window.location.href = `mailto:support@gmsshopping.com?subject=${subject}&body=${body}`;
});

roleButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setActiveRole(button.dataset.role);
  });
});

loginRememberedList?.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target : null;
  const removeButton = target?.closest?.("[data-remembered-remove]");
  if (removeButton) {
    event.preventDefault();
    event.stopPropagation();
    openRememberedSellerDeleteModal(removeButton.getAttribute("data-remembered-remove"));
    return;
  }

  const selectButton = target?.closest?.("[data-remembered-select]");
  if (selectButton) {
    selectRememberedSellerAccount(selectButton.getAttribute("data-remembered-select"));
  }
});

loginRememberedList?.addEventListener("keydown", (event) => {
  const target = event.target instanceof Element ? event.target : null;
  const item = target?.closest?.("[data-remembered-select]");
  if (!item) {
    return;
  }
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    selectRememberedSellerAccount(item.getAttribute("data-remembered-select"));
  }
});

loginRememberedDeleteConfirm?.addEventListener("click", () => {
  if (!rememberedSellerDeleteKey) {
    closeRememberedSellerDeleteModal();
    return;
  }
  const key = rememberedSellerDeleteKey;
  closeRememberedSellerDeleteModal();
  handleRememberedSellerRemove(key);
});

loginRememberedDeleteCancel?.addEventListener("click", () => {
  closeRememberedSellerDeleteModal();
});

loginRememberedDeleteClose?.addEventListener("click", () => {
  closeRememberedSellerDeleteModal();
});

loginRememberedDeleteOverlay?.addEventListener("click", (event) => {
  if (event.target === loginRememberedDeleteOverlay) {
    closeRememberedSellerDeleteModal();
  }
});

loginRememberedEmailBtn?.addEventListener("click", () => {
  setLoginSigninMode("credentials", { focusIdentifier: true, refreshLogos: false });
});

savedAccountsLink?.addEventListener("click", () => {
  setLoginSigninMode("accounts", { focusEmailButton: true, animate: true, refreshLogos: true });
});

identifierInput.addEventListener("input", () => {
  handleLoginIdentifierInput();
});

passwordInput.addEventListener("input", () => {
  setLoginPasswordState("");
  setLoginSubmitAvailability();
});

const initialSearchParams = new URLSearchParams(window.location.search);
const requestedInitialRole = initialSearchParams.get("role");
const loginIntent = String(initialSearchParams.get("intent") || "").trim().toLowerCase();
const wantsSellerUpgrade =
  loginIntent === "seller-upgrade" ||
  loginIntent === "become-seller" ||
  loginIntent === "be-part-of-switch";
activeLanguage = getSavedLoginLanguage();
const initialRole = BUYER_APP_MODE
  ? "buyer"
  : wantsSellerUpgrade
    ? "buyer"
    : (loginRoles[requestedInitialRole] ? requestedInitialRole : "admin");

if (BUYER_APP_MODE) {
  document.body.classList.add("login-page--buyer-app");
  document.documentElement.classList.add("login-buyer-app");
  loginSignupLinks.forEach((link) => {
    if (link instanceof HTMLAnchorElement) {
      link.href = "/login.html";
      link.addEventListener("click", (event) => {
        event.preventDefault();
        setFeedback("Create your Switch account with Google, or use email after signing up in the app.", "error");
      });
    }
  });
  document.querySelectorAll(".login-seller-button--guest").forEach((link) => {
    if (link instanceof HTMLAnchorElement) {
      link.href = "/main_dart.html?guest=1";
      link.addEventListener("click", () => {
        try {
          window.sessionStorage.removeItem(BUYER_SESSION_KEY);
          window.localStorage.removeItem(BUYER_SESSION_KEY);
          window.localStorage.setItem("gms-buyer-guest", "1");
        } catch (_) {}
      });
    }
  });
}

if (wantsSellerUpgrade) {
  try {
    window.sessionStorage.setItem("gms-seller-upgrade-intent", "1");
  } catch (_) {}
  window.setTimeout(() => {
    setFeedback(
      "Create or sign in to your buyer account, then use Be Part of Switch / Start upgrade to create your company.",
      "error",
    );
  }, 0);
}

if (!redirectAuthenticatedEmployeeFromLogin(initialRole)) {
  try {
    setActiveRole(initialRole, { quiet: true });
    applyLoginLanguage(activeLanguage, { persist: false });
  } catch (error) {
    console.warn("Unable to initialize login language/role.", error);
  }
  if (
    !BUYER_APP_MODE
    && initialRole === "admin"
    && readRememberedSellerAccounts().length > 0
    && !document.documentElement.classList.contains("login-forgot-pending")
  ) {
    setLoginSigninMode("accounts", { refreshLogos: true, animate: false, forcePaint: true });
  } else {
    setLoginSigninMode("credentials", { refreshLogos: false, animate: false });
  }
}
syncSigninSurfaceAttributes();

function enableLoginPageInteractions() {
  document.documentElement.classList.remove("login-booting");
  document.body.classList.add("login-page--ready");
}

window.requestAnimationFrame(() => {
  window.requestAnimationFrame(enableLoginPageInteractions);
});

function persistBuyerSessionFromLogin(data, fallbackEmail = "") {
  const account = data?.account && typeof data.account === "object" ? data.account : {};
  const unified = data?.session && typeof data.session === "object" ? data.session : {};
  const email = String(account.email || fallbackEmail || "").trim().toLowerCase();
  const firstName = String(account.firstName || "").trim();
  const lastName = String(account.lastName || "").trim();
  const displayName = [firstName, lastName].filter(Boolean).join(" ")
    || String(account.username || account.name || email.split("@")[0] || "Shopper").trim();

  const baseMessage = data?.message || "Login successful.";
  setFeedback(email ? `${baseMessage} (${email})` : baseMessage, "success");

  try {
    const buyerSession = {
      ...account,
      role: "user",
      activeMode: String(unified.activeMode || "buyer").trim() || "buyer",
      availableModes: Array.isArray(unified.availableModes)
        ? unified.availableModes
        : ["buyer"],
      activeCompanyId: unified.activeCompanyId || null,
      activeCompany: unified.activeCompany || null,
      companies: Array.isArray(unified.companies) ? unified.companies : [],
      capabilities: Array.isArray(unified.capabilities) ? unified.capabilities : [],
      accountId: String(account.id || account.accountId || "").trim(),
      email,
      displayName,
      signedInAt: new Date().toISOString(),
    };
    window.sessionStorage.removeItem("gms-admin-session");
    window.sessionStorage.removeItem("gms-employee-session");
    window.sessionStorage.removeItem("gms-super-admin-session");
    window.sessionStorage.setItem(BUYER_SESSION_KEY, JSON.stringify(buyerSession));
    window.localStorage.setItem(BUYER_SESSION_KEY, JSON.stringify(buyerSession));
    window.localStorage.setItem("gms-buyer-guest", "0");

    // Keep guest-selected language (or account preferredLanguage). Never force English.
    if (window.SwitchBuyerAuth?.applyAccountLanguagePreference) {
      window.SwitchBuyerAuth.applyAccountLanguagePreference(buyerSession, {
        forceSync: !String(account.preferredLanguage || "").trim(),
      });
    } else {
      const guestLanguage = (() => {
        try {
          return window.localStorage.getItem(LOGIN_LANGUAGE_STORAGE_KEY) || "en";
        } catch (_) {
          return "en";
        }
      })();
      const accountLanguage = String(
        account.preferredLanguage || account.language || guestLanguage,
      ).trim();
      try {
        window.localStorage.setItem(LOGIN_LANGUAGE_STORAGE_KEY, accountLanguage || guestLanguage);
      } catch (_) {}
    }

    window.dispatchEvent(
      new CustomEvent("gms-buyer-session-updated", {
        detail: { session: buyerSession },
      }),
    );

    try {
      const accountId = String(buyerSession.accountId || "").trim();
      if (accountId) {
        let deviceKey = "";
        try {
          deviceKey = String(window.localStorage.getItem("gms_account_device_key") || "").trim();
          if (!deviceKey) {
            deviceKey = `web_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
            window.localStorage.setItem("gms_account_device_key", deviceKey);
          }
        } catch (_) {
          deviceKey = `web_${Date.now().toString(36)}`;
        }
        void fetch("/api/account/devices/register", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            accountId,
            email: String(buyerSession.email || "").trim(),
            deviceKey,
            userAgent: navigator.userAgent || "",
            clientKind: "browser",
            reactivate: true,
          }),
          keepalive: true,
        }).catch(() => {});
      }
    } catch (deviceError) {
      console.warn("Unable to register login device.", deviceError);
    }
  } catch (storageError) {
    console.warn("Unable to save buyer session.", storageError);
  }

  let sellerUpgradeIntent = wantsSellerUpgrade;
  try {
    sellerUpgradeIntent =
      sellerUpgradeIntent || window.sessionStorage.getItem("gms-seller-upgrade-intent") === "1";
    window.sessionStorage.removeItem("gms-seller-upgrade-intent");
  } catch (_) {}

  window.location.href = sellerUpgradeIntent
    ? "/switch_account.html?tab=seller&becomeSeller=1"
    : mainWorkspacePath;
}

function persistAdminSessionFromLogin(adminLoginState, fallbackEmail = "") {
  const dashboardPath =
    String(
      adminLoginState.data?.dashboardPath ??
        adminLoginState.data?.redirectPath ??
        "/main.html#dashboard",
    ).trim() || "/main.html#dashboard";
  const redirectPath = mainWorkspacePath;
  setFeedback(
    adminLoginState.data?.message || "Seller login successful.",
    "success",
  );

  try {
    const adminData = adminLoginState.data?.admin || {};
    const adminScopeId = getAccountAdminScope(adminData, "admin");
    const adminSession = {
      ...adminData,
      role: "admin",
      adminId: adminScopeId,
      email: String(adminData.email || fallbackEmail || "").trim().toLowerCase(),
      dashboardPath,
      signedInAt: new Date().toISOString(),
    };
    window.sessionStorage.removeItem("gms-employee-session");
    window.sessionStorage.removeItem("gms-super-admin-session");
    saveActiveAdminScope(adminScopeId);
    window.sessionStorage.setItem(
      "gms-admin-session",
      JSON.stringify(adminSession),
    );
    upsertRememberedSellerAccount(adminSession);
    window.dispatchEvent(
      new CustomEvent("gms-admin-session-updated", {
        detail: { session: adminSession },
      }),
    );
  } catch (storageError) {
    console.warn("Unable to save admin session.", storageError);
  }

  window.location.href = redirectPath;
}

async function handleBuyerGoogleSignIn() {
  if (!window.SwitchGoogleAuth?.signInWithGoogle) {
    setFeedback(t("feedback.google.unavailable"), "error");
    return;
  }

  if (googleVerifyState.active) {
    return;
  }

  const loadingStartedAt = Date.now();
  setLoginSubmitAvailability({ submitting: true });

  try {
    const profile = await window.SwitchGoogleAuth.signInWithGoogle();
    // Match login.dart: existing account → home; new email → verify code first.
    const response = await fetch("/api/auth/google/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        idToken: profile.idToken || undefined,
        accessToken: profile.accessToken || undefined,
        createIfMissing: false,
        preferredLanguage: normalizeLoginLanguage(activeLanguage),
      }),
    });
    const data = await response.json().catch(() => ({}));
    await ensureLoginLoadingDelay(loadingStartedAt);

    if (response.status === 404 || data.code === "not_found" || data.code === "verification_required") {
      setLoginSubmitAvailability();
      await beginGoogleRegisterVerification(profile, data.profile || {
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
      });
      return;
    }

    if (!response.ok) {
      const loginError = new Error(data.message || "Unable to sign in with Google.");
      loginError.status = response.status;
      loginError.data = data;
      throw loginError;
    }

    persistBuyerSessionFromLogin(data, profile.email || data.account?.email);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/cancelled|canceled|popup_closed|closed/i.test(message)) {
      setLoginSubmitAvailability();
      setFeedback("");
      return;
    }

    await ensureLoginLoadingDelay(loadingStartedAt);
    setLoginSubmitAvailability();
    setFeedback(message || "Unable to sign in with Google.", "error");
  }
}

const googleVerifyPanel = document.getElementById("login-google-verify");
const googleVerifyInputsWrap = document.getElementById("login-google-verify-code-inputs");
const googleVerifyInputs = Array.from(
  googleVerifyInputsWrap?.querySelectorAll("input") || [],
);
const googleVerifyResendButton = document.getElementById("login-google-verify-resend");
const googleVerifyMessage = document.getElementById("login-google-verify-message");
const googleVerifyBackButton = document.getElementById("login-google-verify-back");
const googleVerifyDefaultTitle = () => t("role.buyer.title") || "Login to Continue";
const googleVerifyDefaultSubtitle = () =>
  t("panel.subtitle") || "Sign in to browse Switch shops and products.";

function setGoogleVerifyMessage(message = "", mode = "") {
  if (!googleVerifyMessage) {
    return;
  }
  googleVerifyMessage.textContent = message || "";
  googleVerifyMessage.classList.toggle("is-error", mode === "error");
  googleVerifyMessage.classList.toggle("is-success", mode === "success");
  googleVerifyMessage.classList.toggle("is-checking", mode === "checking");
}

function clearGoogleVerifyInputs() {
  googleVerifyInputs.forEach((input) => {
    input.value = "";
    input.disabled = false;
  });
  googleVerifyInputsWrap?.classList.remove("is-error", "is-valid");
}

function getGoogleVerifyCodeValue() {
  return googleVerifyInputs.map((input) => String(input.value || "").trim()).join("");
}

function updateGoogleVerifyResendButton() {
  if (!googleVerifyResendButton) {
    return;
  }
  const remainingMs = Math.max(0, googleVerifyState.resendAvailableAt - Date.now());
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const coolingDown = remainingSeconds > 0;
  googleVerifyResendButton.disabled = coolingDown || googleVerifyState.submitting;
  googleVerifyResendButton.textContent = coolingDown
    ? `Resend code (${remainingSeconds}s)`
    : "Resend code";
}

function startGoogleVerifyResendTimer(resendAvailableAt) {
  window.clearInterval(googleVerifyState.resendTimerId);
  googleVerifyState.resendAvailableAt = Number(resendAvailableAt) || Date.now() + 60000;
  updateGoogleVerifyResendButton();
  googleVerifyState.resendTimerId = window.setInterval(() => {
    updateGoogleVerifyResendButton();
    if (Date.now() >= googleVerifyState.resendAvailableAt) {
      window.clearInterval(googleVerifyState.resendTimerId);
      googleVerifyState.resendTimerId = 0;
    }
  }, 1000);
}

function openGoogleVerifyPanel(email) {
  googleVerifyState.active = true;
  loginCredentials?.classList.add("is-google-verify");
  if (googleVerifyPanel) {
    googleVerifyPanel.hidden = false;
    googleVerifyPanel.setAttribute("aria-hidden", "false");
  }
  if (loginPanelTitle) {
    loginPanelTitle.textContent = "Enter verification code";
  }
  if (loginPanelSubtitle) {
    loginPanelSubtitle.textContent = `We sent a 6-digit code to ${email}.`;
  }
  setFeedback("");
  setGoogleVerifyMessage("");
  clearGoogleVerifyInputs();
  window.setTimeout(() => {
    googleVerifyInputs[0]?.focus({ preventScroll: true });
  }, 0);
}

function closeGoogleVerifyPanel() {
  googleVerifyState.active = false;
  googleVerifyState.idToken = "";
  googleVerifyState.accessToken = "";
  googleVerifyState.email = "";
  googleVerifyState.submitting = false;
  window.clearInterval(googleVerifyState.resendTimerId);
  googleVerifyState.resendTimerId = 0;
  googleVerifyState.resendAvailableAt = 0;
  loginCredentials?.classList.remove("is-google-verify");
  if (googleVerifyPanel) {
    googleVerifyPanel.hidden = true;
    googleVerifyPanel.setAttribute("aria-hidden", "true");
  }
  clearGoogleVerifyInputs();
  setGoogleVerifyMessage("");
  if (loginPanelTitle) {
    loginPanelTitle.textContent = googleVerifyDefaultTitle();
  }
  if (loginPanelSubtitle) {
    loginPanelSubtitle.textContent = googleVerifyDefaultSubtitle();
  }
  updateGoogleVerifyResendButton();
  setLoginSubmitAvailability();
}

async function sendGoogleRegisterVerificationCode({ isResend = false } = {}) {
  const email = normalizeLoginEmail(googleVerifyState.email || "");
  if (!email || !emailPattern.test(email)) {
    setGoogleVerifyMessage("Google did not provide a valid email address.", "error");
    return false;
  }

  googleVerifyState.submitting = true;
  updateGoogleVerifyResendButton();
  setGoogleVerifyMessage(isResend ? "Resending code..." : "Sending code...", "checking");
  const loadingStartedAt = Date.now();

  try {
    const response = await fetch("/api/auth/verification/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        purpose: "registration",
        channel: "email",
        email,
        target: email,
      }),
    });
    const data = await response.json().catch(() => ({}));
    await ensureLoginLoadingDelay(loadingStartedAt);
    if (!response.ok) {
      throw new Error(data.message || "Unable to send verification code.");
    }

    const resendAt = data.resendAvailableAt
      ? Date.parse(data.resendAvailableAt)
      : Date.now() + Number(data.resendCooldownSeconds || 60) * 1000;
    startGoogleVerifyResendTimer(resendAt);
    clearGoogleVerifyInputs();
    setGoogleVerifyMessage(
      isResend ? `Code resent to ${email}.` : `Code sent to ${email}.`,
      "success",
    );
    googleVerifyInputs[0]?.focus({ preventScroll: true });
    return true;
  } catch (error) {
    await ensureLoginLoadingDelay(loadingStartedAt);
    setGoogleVerifyMessage(
      error instanceof Error ? error.message : "Unable to send verification code.",
      "error",
    );
    return false;
  } finally {
    googleVerifyState.submitting = false;
    updateGoogleVerifyResendButton();
  }
}

async function beginGoogleRegisterVerification(profile, apiProfile = {}) {
  const email = normalizeLoginEmail(
    apiProfile.email || profile.email || "",
  );
  if (!email || !emailPattern.test(email)) {
    setFeedback("Google did not provide a valid email address.", "error");
    return;
  }

  googleVerifyState.idToken = profile.idToken || "";
  googleVerifyState.accessToken = profile.accessToken || "";
  googleVerifyState.email = email;
  openGoogleVerifyPanel(email);

  const sent = await sendGoogleRegisterVerificationCode({ isResend: false });
  if (!sent) {
    closeGoogleVerifyPanel();
    setFeedback(
      googleVerifyMessage?.textContent || "Unable to send verification code.",
      "error",
    );
  }
}

async function verifyGoogleRegisterCode() {
  if (!googleVerifyState.active || googleVerifyState.submitting) {
    return false;
  }

  const code = getGoogleVerifyCodeValue();
  setGoogleVerifyMessage("");
  googleVerifyInputsWrap?.classList.remove("is-error", "is-valid");

  if (!/^\d{6}$/.test(code)) {
    googleVerifyInputsWrap?.classList.add("is-error");
    setGoogleVerifyMessage("Enter the 6-digit verification code.", "error");
    googleVerifyInputs.find((input) => !input.value)?.focus()
      || googleVerifyInputs[0]?.focus();
    return false;
  }

  googleVerifyState.submitting = true;
  updateGoogleVerifyResendButton();
  googleVerifyInputs.forEach((input) => {
    input.disabled = true;
  });
  setGoogleVerifyMessage("Verifying code...", "checking");
  const loadingStartedAt = Date.now();

  try {
    const verifyResponse = await fetch("/api/auth/verification/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        purpose: "registration",
        channel: "email",
        email: googleVerifyState.email,
        target: googleVerifyState.email,
        code,
      }),
    });
    const verifyData = await verifyResponse.json().catch(() => ({}));
    if (!verifyResponse.ok) {
      throw new Error(verifyData.message || "Incorrect verification code.");
    }

    const verificationToken = String(verifyData.verificationToken || "").trim();
    if (!verificationToken) {
      throw new Error("Verification succeeded but no token was returned.");
    }

    const loginResponse = await fetch("/api/auth/google/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        idToken: googleVerifyState.idToken || undefined,
        accessToken: googleVerifyState.accessToken || undefined,
        createIfMissing: true,
        verificationToken,
        preferredLanguage: normalizeLoginLanguage(activeLanguage),
      }),
    });
    const loginData = await loginResponse.json().catch(() => ({}));
    await ensureLoginLoadingDelay(loadingStartedAt);
    if (!loginResponse.ok) {
      throw new Error(loginData.message || "Unable to create your Switch account.");
    }

    const email = googleVerifyState.email;
    closeGoogleVerifyPanel();
    persistBuyerSessionFromLogin(loginData, email || loginData.account?.email);
    return true;
  } catch (error) {
    await ensureLoginLoadingDelay(loadingStartedAt);
    googleVerifyInputsWrap?.classList.add("is-error");
    setGoogleVerifyMessage(
      error instanceof Error ? error.message : "Unable to verify code.",
      "error",
    );
    return false;
  } finally {
    googleVerifyState.submitting = false;
    updateGoogleVerifyResendButton();
    googleVerifyInputs.forEach((input) => {
      input.disabled = false;
    });
  }
}

googleVerifyInputs.forEach((input, index) => {
  input.addEventListener("input", () => {
    googleVerifyInputsWrap?.classList.remove("is-error", "is-valid");
    const value = String(input.value || "").replace(/\D/g, "").slice(0, 1);
    input.value = value;
    if (value && index < googleVerifyInputs.length - 1) {
      googleVerifyInputs[index + 1].focus();
    }
    if (getGoogleVerifyCodeValue().length === 6) {
      void verifyGoogleRegisterCode();
    }
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Backspace" && !input.value && index > 0) {
      googleVerifyInputs[index - 1].focus();
    }
  });

  input.addEventListener("paste", (event) => {
    event.preventDefault();
    const text = String(event.clipboardData?.getData("text") || "")
      .replace(/\D/g, "")
      .slice(0, 6);
    googleVerifyInputs.forEach((codeInput, codeIndex) => {
      codeInput.value = text[codeIndex] || "";
    });
    const focusIndex = Math.min(text.length, googleVerifyInputs.length - 1);
    googleVerifyInputs[focusIndex]?.focus();
    if (text.length === 6) {
      void verifyGoogleRegisterCode();
    }
  });
});

googleVerifyResendButton?.addEventListener("click", () => {
  void sendGoogleRegisterVerificationCode({ isResend: true });
});

googleVerifyBackButton?.addEventListener("click", () => {
  closeGoogleVerifyPanel();
  setFeedback("");
});

async function handleSellerGoogleSignIn() {
  if (BUYER_APP_MODE) {
    await handleBuyerGoogleSignIn();
    return;
  }

  if (activeRole !== "admin") {
    setFeedback(t("feedback.google.adminOnly"), "error");
    return;
  }

  if (!window.SwitchGoogleAuth?.signInWithGoogle) {
    setFeedback(t("feedback.google.unavailable"), "error");
    return;
  }

  const loadingStartedAt = Date.now();
  setLoginSubmitAvailability({ submitting: true });

  try {
    const profile = await window.SwitchGoogleAuth.signInWithGoogle();
    const response = await fetch("/api/auth/google/seller-login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        idToken: profile.idToken || undefined,
        accessToken: profile.accessToken || undefined,
        createIfMissing: true,
      }),
    });
    const data = await response.json().catch(() => ({}));
    await ensureLoginLoadingDelay(loadingStartedAt);

    if (!response.ok) {
      const loginError = new Error(data.message || "Unable to sign in with Google.");
      loginError.status = response.status;
      loginError.data = data;
      throw loginError;
    }

    // Existing Google-linked seller → sign in.
    // New Google email → auto-register seller, then continue to dashboard.
    persistAdminSessionFromLogin({ connected: true, data }, profile.email);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/cancelled|canceled|popup_closed|closed/i.test(message)) {
      setLoginSubmitAvailability();
      setFeedback("");
      return;
    }

    await ensureLoginLoadingDelay(loadingStartedAt);
    setLoginSubmitAvailability();
    if (isAdminBannedLoginError(error)) {
      openAdminBannedModal({
        reason: getAdminBanReasonFromError(error),
        description: getAdminBanDescriptionFromError(error),
      });
      return;
    }

    setFeedback(
      message || "Unable to sign in with Google.",
      "error",
    );
  }
}

document.querySelectorAll(".login-social-button--google").forEach((button) => {
  button.addEventListener("click", () => {
    void handleSellerGoogleSignIn();
  });
});

document.querySelectorAll(".login-social-button--facebook, .login-social-button--phone").forEach((button) => {
  button.addEventListener("click", () => {
  setFeedback(t("feedback.method.comingSoon"));
  });
});

/* -------------------------------------------------------------------------- */
/* Forgot password (Gmail OTP reset) — in-panel slide                         */
/* -------------------------------------------------------------------------- */

const loginViewSignin = document.getElementById("login-view-signin");
const loginViewForgot = document.getElementById("login-view-forgot");
const forgotForm = document.getElementById("login-forgot-form");
const forgotStage = document.getElementById("login-forgot-stage");
const forgotActions = document.getElementById("login-forgot-actions");
const forgotTitle = document.getElementById("login-forgot-title");
const forgotSubtitle = document.getElementById("login-forgot-subtitle");
const forgotEmailInput = document.getElementById("login-forgot-email");
const forgotEmailField = document.getElementById("login-forgot-email-field");
const forgotEmailStatus = document.getElementById("login-forgot-email-status");
const forgotEmailMessage = document.getElementById("login-forgot-email-message");
const forgotCodeHint = document.getElementById("login-forgot-code-hint");
const forgotCodeInputsWrap = document.getElementById("login-forgot-code-inputs");
const forgotCodeInputs = Array.from(
  forgotCodeInputsWrap?.querySelectorAll("input") || [],
);
const forgotCodeMessage = document.getElementById("login-forgot-code-message");
const forgotPasswordInput = document.getElementById("login-forgot-password");
const forgotPasswordField = document.getElementById("login-forgot-password-field");
const forgotPasswordMessage = document.getElementById("login-forgot-password-message");
const forgotPasswordStatus = document.getElementById("login-forgot-password-status");
const forgotPasswordConfirmInput = document.getElementById("login-forgot-password-confirm");
const forgotPasswordConfirmField = document.getElementById("login-forgot-password-confirm-field");
const forgotPasswordConfirmMessage = document.getElementById("login-forgot-password-confirm-message");
const forgotPasswordConfirmStatus = document.getElementById("login-forgot-password-confirm-status");
const forgotFeedback = document.getElementById("login-forgot-feedback");
const forgotSubmitButton = document.getElementById("login-forgot-submit");
const forgotSubmitLabel = forgotSubmitButton?.querySelector("[data-forgot-submit-label]");
const forgotSubmitIcon = forgotSubmitButton?.querySelector("[data-forgot-submit-icon]");
const forgotBackButton = document.getElementById("login-forgot-back");
const forgotResendButton = document.getElementById("login-forgot-resend");
const forgotInterruptOverlay = document.getElementById("login-forgot-interrupt-overlay");
const forgotInterruptModal = forgotInterruptOverlay?.querySelector(".login-confirm-modal");
const forgotInterruptContinueButton = document.getElementById("login-forgot-interrupt-continue");
const forgotInterruptBackButton = document.getElementById("login-forgot-interrupt-back");
const forgotInterruptCloseButton = document.getElementById("login-forgot-interrupt-close");
const loginSuccessModalOverlay = document.getElementById("login-success-modal-overlay");
const loginSuccessModal = document.getElementById("login-success-modal");
const loginSuccessModalTitle = document.getElementById("login-success-modal-title");
const loginSuccessModalCopy = document.getElementById("login-success-modal-copy");
const loginSuccessModalIcon = document.getElementById("login-success-modal-icon");
const FORGOT_RESEND_SECONDS = 60;
const PANEL_SLIDE_MS = 420;
const FORGOT_FLOW_STORAGE_KEY = "gms-login-forgot-flow";
const FORGOT_FLOW_MAX_AGE_MS = 30 * 60 * 1000;
const FORGOT_STEP_ORDER = { email: 0, code: 1, password: 2 };

const forgotState = {
  step: "email",
  email: "",
  verificationToken: "",
  submitting: false,
  resendAvailableAt: 0,
  resendTimerId: 0,
  panelOpen: false,
  slideTimerId: 0,
  stepSlideTimerId: 0,
  validEmail: "",
  interruptPendingAction: null,
};

let forgotEmailValidationTimer = 0;
let forgotEmailValidationRequestId = 0;
let forgotValidationLottie = null;
let forgotPasswordValidationLottie = null;
let forgotConfirmValidationLottie = null;
let loginSuccessModalLottie = null;
let loginSuccessModalTimerId = 0;
let loginSuccessModalOnClose = null;

function clearForgotPasswordFlowPersistence() {
  try {
    window.sessionStorage.removeItem(FORGOT_FLOW_STORAGE_KEY);
  } catch (error) {
    // Ignore storage failures.
  }
}

function persistForgotPasswordFlow() {
  if (!forgotState.panelOpen) {
    clearForgotPasswordFlowPersistence();
    return;
  }

  try {
    window.sessionStorage.setItem(
      FORGOT_FLOW_STORAGE_KEY,
      JSON.stringify({
        step: forgotState.step,
        email: forgotState.email,
        validEmail: forgotState.validEmail || forgotState.email,
        verificationToken: forgotState.verificationToken,
        resendAvailableAt: forgotState.resendAvailableAt,
        savedAt: Date.now(),
      }),
    );
  } catch (error) {
    // Ignore storage failures.
  }
}

function readForgotPasswordFlowPersistence() {
  try {
    const raw = window.sessionStorage.getItem(FORGOT_FLOW_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object") {
      clearForgotPasswordFlowPersistence();
      return null;
    }
    const savedAt = Number(data.savedAt || 0);
    if (!savedAt || Date.now() - savedAt > FORGOT_FLOW_MAX_AGE_MS) {
      clearForgotPasswordFlowPersistence();
      return null;
    }
    return data;
  } catch (error) {
    clearForgotPasswordFlowPersistence();
    return null;
  }
}

function resumeForgotResendTimer() {
  window.clearInterval(forgotState.resendTimerId);
  forgotState.resendTimerId = 0;
  updateForgotResendButton();
  if (Date.now() >= forgotState.resendAvailableAt) {
    return;
  }
  forgotState.resendTimerId = window.setInterval(() => {
    updateForgotResendButton();
    if (Date.now() >= forgotState.resendAvailableAt) {
      window.clearInterval(forgotState.resendTimerId);
      forgotState.resendTimerId = 0;
    }
  }, 250);
}

function setForgotSubmitting(isSubmitting) {
  forgotState.submitting = Boolean(isSubmitting);
  loginPanelForgotSubmitting = forgotState.submitting;
  syncForgotSubmitAvailability();
  syncLoginPanelLoading();
}

function syncLoginPanelLoading() {
  const checkingForgot = document
    .getElementById("login-forgot-email-status")
    ?.classList.contains("is-checking");
  const checkingLogin = employeeIdStatus?.classList.contains("is-checking");
  const shouldLoad = Boolean(
    checkingForgot || checkingLogin || loginPanelForgotSubmitting || loginPanelFormSubmitting,
  );
  if (!(loginPanel instanceof HTMLElement)) {
    return;
  }

  const wasLoading = loginPanel.classList.contains("is-loading");
  loginPanel.classList.toggle("is-loading", shouldLoad);
  loginPanel.setAttribute("aria-busy", shouldLoad ? "true" : "false");

  // Restart bars immediately so the colored sweep is visible right away.
  if (shouldLoad && !wasLoading) {
    const bars = loginPanel.querySelectorAll(".login-panel__top-loader-bar");
    bars.forEach((bar) => {
      bar.style.animation = "none";
      void bar.offsetWidth;
      bar.style.animation = "";
    });
  }
}

function isForgotPasswordReadyToSubmit() {
  const password = String(forgotPasswordInput?.value || "");
  const confirmPassword = String(forgotPasswordConfirmInput?.value || "");
  if (!password || !confirmPassword) {
    return false;
  }
  if (getForgotPasswordRuleError(password)) {
    return false;
  }
  return password === confirmPassword;
}

function syncForgotSubmitAvailability() {
  if (!(forgotSubmitButton instanceof HTMLElement)) {
    return;
  }

  if (forgotState.step === "email") {
    // Email step stays clickable; empty/invalid shows red error on submit.
    const ready = !forgotState.submitting;
    forgotSubmitButton.disabled = !ready;
    forgotSubmitButton.classList.toggle("is-forgot-ready", ready);
    forgotSubmitButton.setAttribute("aria-disabled", String(!ready));
    if (forgotSubmitIcon instanceof HTMLElement) {
      forgotSubmitIcon.hidden = false;
    }
    return;
  }

  if (forgotState.step === "password") {
    // Password step stays clickable; empty/invalid shows red error on submit.
    const ready = !forgotState.submitting;
    forgotSubmitButton.disabled = !ready;
    forgotSubmitButton.classList.toggle("is-forgot-ready", ready);
    forgotSubmitButton.setAttribute("aria-disabled", String(!ready));
    if (forgotSubmitIcon instanceof HTMLElement) {
      forgotSubmitIcon.hidden = true;
    }
    return;
  }

  forgotSubmitButton.disabled = true;
  forgotSubmitButton.classList.remove("is-forgot-ready");
  forgotSubmitButton.setAttribute("aria-disabled", "true");
  if (forgotSubmitIcon instanceof HTMLElement) {
    forgotSubmitIcon.hidden = true;
  }
}

function stopForgotValidationLottie() {
  if (forgotValidationLottie?.destroy) {
    forgotValidationLottie.destroy();
  }
  forgotValidationLottie = null;
  forgotEmailStatus?.classList.remove("has-lottie");
}

function playForgotValidationSuccessLottie() {
  const target = forgotEmailStatus?.querySelector("[data-login-validation-lottie]");
  if (!target) {
    return;
  }

  stopForgotValidationLottie();
  target.innerHTML = "";
  if (!window.lottie?.loadAnimation) {
    return;
  }

  try {
    forgotValidationLottie = window.lottie.loadAnimation({
      container: target,
      renderer: "svg",
      loop: false,
      autoplay: true,
      path: loginSuccessAnimationPath,
    });
    forgotEmailStatus?.classList.add("has-lottie");
  } catch (error) {
    forgotValidationLottie = null;
  }
}

function stopForgotPasswordFieldLottie(which = "password") {
  const isConfirm = which === "confirm";
  const status = isConfirm ? forgotPasswordConfirmStatus : forgotPasswordStatus;
  const current = isConfirm ? forgotConfirmValidationLottie : forgotPasswordValidationLottie;
  if (current?.destroy) {
    current.destroy();
  }
  if (isConfirm) {
    forgotConfirmValidationLottie = null;
  } else {
    forgotPasswordValidationLottie = null;
  }
  status?.classList.remove("has-lottie");
  const target = status?.querySelector("[data-login-validation-lottie]");
  if (target) {
    target.innerHTML = "";
  }
}

function playForgotPasswordFieldSuccessLottie(which = "password") {
  const isConfirm = which === "confirm";
  const status = isConfirm ? forgotPasswordConfirmStatus : forgotPasswordStatus;
  const target = status?.querySelector("[data-login-validation-lottie]");
  if (!target) {
    return;
  }

  stopForgotPasswordFieldLottie(which);
  if (!window.lottie?.loadAnimation) {
    return;
  }

  try {
    const animation = window.lottie.loadAnimation({
      container: target,
      renderer: "svg",
      loop: false,
      autoplay: true,
      path: loginSuccessAnimationPath,
    });
    if (isConfirm) {
      forgotConfirmValidationLottie = animation;
    } else {
      forgotPasswordValidationLottie = animation;
    }
    status?.classList.add("has-lottie");
  } catch (error) {
    if (isConfirm) {
      forgotConfirmValidationLottie = null;
    } else {
      forgotPasswordValidationLottie = null;
    }
  }
}

function setForgotEmailState(mode = "", message = "") {
  if (!(forgotEmailInput instanceof HTMLElement)) {
    return;
  }

  const fallbackIcon = forgotEmailStatus?.querySelector(".login-validation-fallback");
  forgotEmailInput.classList.remove("login-employee-id-valid", "login-employee-id-invalid");
  forgotEmailStatus?.classList.remove("is-valid", "is-invalid", "is-checking");
  stopForgotValidationLottie();
  if (fallbackIcon) {
    fallbackIcon.innerHTML = "";
  }
  setLoginFieldMessage(forgotEmailField, forgotEmailInput, forgotEmailMessage);
  if (forgotEmailStatus) {
    delete forgotEmailStatus.dataset.employeeTooltip;
    forgotEmailStatus.removeAttribute("aria-label");
    forgotEmailStatus.removeAttribute("tabindex");
  }

  if (mode === "valid") {
    // Correct email stays neutral — only errors show red styling.
    forgotEmailStatus?.setAttribute("aria-label", "Account verified");
  }

  if (mode === "checking") {
    forgotEmailStatus?.classList.add("is-checking");
    forgotEmailStatus?.setAttribute("aria-label", "Checking account");
  }

  if (mode === "invalid") {
    forgotEmailInput.classList.add("login-employee-id-invalid");
    forgotEmailStatus?.classList.add("is-invalid");
    forgotEmailStatus?.setAttribute("aria-label", message || "Invalid email");
    setLoginFieldMessage(
      forgotEmailField,
      forgotEmailInput,
      forgotEmailMessage,
      "invalid",
      message || "This email is not registered on Switch.",
    );
    if (fallbackIcon) {
      fallbackIcon.innerHTML = loginValidationErrorIconMarkup;
    }
  }

  syncForgotSubmitAvailability();
  syncLoginPanelLoading();
  syncForgotStageHeight();
}

function isCurrentForgotEmailMatched() {
  const email = normalizeLoginEmail(forgotEmailInput?.value || "");
  return Boolean(email && forgotState.validEmail && email === forgotState.validEmail);
}

async function validateForgotEmail() {
  if (!(forgotEmailInput instanceof HTMLElement)) {
    return { valid: false, message: "" };
  }

  const email = normalizeLoginEmail(forgotEmailInput.value);
  forgotEmailInput.value = email;
  const requestId = ++forgotEmailValidationRequestId;

  if (isCurrentForgotEmailMatched()) {
    setForgotEmailState("valid");
    return { valid: true, email };
  }

  forgotState.validEmail = "";

  if (!email) {
    setForgotEmailState("");
    return { valid: false, message: "Enter your Gmail address." };
  }

  if (!emailPattern.test(email)) {
    setForgotEmailState("invalid", "Enter a valid Gmail address.");
    return { valid: false, message: "Enter a valid Gmail address." };
  }

  const loadingStartedAt = Date.now();
  try {
    setForgotEmailState("checking");
    const adminAccount = await findAdminAccountByEmail(email);
    await ensureLoginLoadingDelay(loadingStartedAt);
    if (requestId !== forgotEmailValidationRequestId) {
      return { valid: false, stale: true, message: "" };
    }

    if (!adminAccount) {
      setForgotEmailState("invalid", "This email is not registered on Switch.");
      return { valid: false, message: "This email is not registered on Switch." };
    }

    forgotState.validEmail = email;
    setForgotEmailState("valid");
    return { valid: true, email, account: adminAccount };
  } catch (error) {
    await ensureLoginLoadingDelay(loadingStartedAt);
    if (requestId !== forgotEmailValidationRequestId) {
      return { valid: false, stale: true, message: "" };
    }
    const message = error instanceof Error ? error.message : "Unable to verify seller account.";
    setForgotEmailState("invalid", message);
    return { valid: false, message };
  }
}

function scheduleForgotEmailValidation() {
  if (!(forgotEmailInput instanceof HTMLElement) || forgotState.step !== "email") {
    return;
  }

  const email = normalizeLoginEmail(forgotEmailInput.value);
  forgotEmailInput.value = email;
  window.clearTimeout(forgotEmailValidationTimer);
  forgotEmailValidationRequestId += 1;
  forgotState.validEmail = "";
  setForgotEmailState("");
  setForgotFeedback("");

  if (!email) {
    return;
  }

  forgotEmailValidationTimer = window.setTimeout(() => {
    void validateForgotEmail();
  }, 360);
}

function setForgotFieldMessage(node, message, mode = "") {
  if (!node) {
    return;
  }
  const normalizedMessage = String(message || "").trim();
  node.textContent = normalizedMessage;
  node.classList.toggle("is-error", mode === "error" && Boolean(normalizedMessage));
  node.classList.toggle("is-checking", mode === "checking" && Boolean(normalizedMessage));
  syncForgotStageHeight();
}

function setForgotFeedback(message, mode = "") {
  if (!forgotFeedback) {
    return;
  }
  forgotFeedback.textContent = message || "";
  forgotFeedback.className = "login-forgot-feedback";
  if (mode) {
    forgotFeedback.classList.add(mode === "error" ? "is-error" : `is-${mode}`);
  }
}

function clearForgotCodeInputs() {
  forgotCodeInputs.forEach((input) => {
    input.value = "";
  });
  forgotCodeInputsWrap?.classList.remove("is-error", "is-valid");
  setForgotFieldMessage(forgotCodeMessage, "");
}

function getForgotCodeValue() {
  return forgotCodeInputs.map((input) => String(input.value || "").trim()).join("");
}

function updateForgotResendButton() {
  if (!forgotResendButton) {
    return;
  }
  const remainingMs = Math.max(0, forgotState.resendAvailableAt - Date.now());
  if (remainingMs <= 0) {
    forgotResendButton.disabled = forgotState.submitting || forgotState.step !== "code";
    forgotResendButton.textContent = t("forgot.resend.default");
    return;
  }
  const seconds = Math.ceil(remainingMs / 1000);
  forgotResendButton.disabled = true;
  forgotResendButton.textContent = `${t("forgot.resend.default")} (${String(seconds).padStart(2, "0")}s)`;
}

function startForgotResendTimer() {
  window.clearInterval(forgotState.resendTimerId);
  forgotState.resendAvailableAt = Date.now() + FORGOT_RESEND_SECONDS * 1000;
  updateForgotResendButton();
  forgotState.resendTimerId = window.setInterval(() => {
    updateForgotResendButton();
    if (Date.now() >= forgotState.resendAvailableAt) {
      window.clearInterval(forgotState.resendTimerId);
      forgotState.resendTimerId = 0;
    }
  }, 250);
  persistForgotPasswordFlow();
}

function syncForgotStageHeight() {
  if (!forgotStage) {
    return;
  }
  const activeStep = forgotForm?.querySelector(
    `.login-forgot-step[data-forgot-step="${forgotState.step}"]`,
  );
  if (!(activeStep instanceof HTMLElement)) {
    forgotStage.style.height = "";
    return;
  }
  forgotStage.style.height = `${Math.max(activeStep.scrollHeight, 1)}px`;
}

function setForgotStep(step, options = {}) {
  const { animate = true } = options;
  const nextStep = FORGOT_STEP_ORDER[step] == null ? "email" : step;
  const previousStep = forgotState.step;
  const shouldAnimate = animate && previousStep !== nextStep && Boolean(forgotForm);

  if (shouldAnimate) {
    window.clearTimeout(forgotState.stepSlideTimerId);
    forgotForm.classList.add("is-step-sliding");
    void forgotForm.offsetWidth;
  }

  forgotState.step = nextStep;
  if (forgotForm) {
    forgotForm.dataset.forgotActive = nextStep;
  }

  const steps = Array.from(forgotForm?.querySelectorAll("[data-forgot-step]") || []);
  steps.forEach((panel) => {
    const isActive = panel.dataset.forgotStep === nextStep;
    panel.classList.toggle("is-active", isActive);
    panel.setAttribute("aria-hidden", String(!isActive));
  });

  if (nextStep === "email") {
    if (forgotTitle) forgotTitle.textContent = t("forgot.step.email.title");
    if (forgotSubtitle) {
      forgotSubtitle.textContent = t("forgot.step.email.subtitle");
    }
    if (forgotSubmitLabel) forgotSubmitLabel.textContent = t("forgot.submit.send");
    if (forgotSubmitButton) forgotSubmitButton.hidden = false;
    if (forgotSubmitIcon instanceof HTMLElement) forgotSubmitIcon.hidden = false;
    forgotSubmitButton?.classList.remove("is-icon-hidden");
    forgotActions?.classList.remove("is-cancel-only");
    if (forgotBackButton) forgotBackButton.textContent = t("forgot.back.cancel");
  } else if (nextStep === "code") {
    if (forgotTitle) forgotTitle.textContent = t("forgot.step.code.title");
    if (forgotSubtitle) {
      forgotSubtitle.textContent = t("forgot.step.code.subtitle");
    }
    if (forgotCodeHint) {
      forgotCodeHint.textContent = forgotState.email
        ? t("forgot.code.hint.sent", { email: forgotState.email })
        : t("forgot.code.hint.default");
    }
    if (forgotSubmitButton) forgotSubmitButton.hidden = true;
    if (forgotSubmitIcon instanceof HTMLElement) forgotSubmitIcon.hidden = true;
    forgotActions?.classList.add("is-cancel-only");
    if (forgotBackButton) forgotBackButton.textContent = t("forgot.back.cancel");
    updateForgotResendButton();
  } else {
    if (forgotTitle) forgotTitle.textContent = t("forgot.step.password.title");
    if (forgotSubtitle) {
      forgotSubtitle.textContent = t("forgot.step.password.subtitle");
    }
    if (forgotSubmitLabel) forgotSubmitLabel.textContent = t("forgot.submit.update");
    if (forgotSubmitButton) forgotSubmitButton.hidden = false;
    if (forgotSubmitIcon instanceof HTMLElement) forgotSubmitIcon.hidden = true;
    forgotSubmitButton?.classList.add("is-icon-hidden");
    forgotActions?.classList.remove("is-cancel-only");
    if (forgotBackButton) forgotBackButton.textContent = t("forgot.back.cancel");
  }

  syncForgotStageHeight();
  syncForgotSubmitAvailability();
  persistForgotPasswordFlow();

  if (shouldAnimate) {
    forgotState.stepSlideTimerId = window.setTimeout(() => {
      forgotForm?.classList.remove("is-step-sliding");
      syncForgotStageHeight();
      forgotState.stepSlideTimerId = 0;
    }, PANEL_SLIDE_MS);
  }
}

function maybeAutoVerifyForgotCode() {
  if (forgotState.step !== "code" || forgotState.submitting) {
    return;
  }
  const code = getForgotCodeValue();
  if (!/^\d{6}$/.test(code)) {
    return;
  }
  void verifyForgotPasswordCode();
}

function resetForgotPasswordFlow() {
  forgotState.step = "email";
  forgotState.email = "";
  forgotState.verificationToken = "";
  forgotState.validEmail = "";
  setForgotSubmitting(false);
  forgotState.resendAvailableAt = 0;
  window.clearInterval(forgotState.resendTimerId);
  forgotState.resendTimerId = 0;
  window.clearTimeout(forgotEmailValidationTimer);
  forgotEmailValidationRequestId += 1;

  if (forgotEmailInput) forgotEmailInput.value = "";
  if (forgotPasswordInput) forgotPasswordInput.value = "";
  if (forgotPasswordConfirmInput) forgotPasswordConfirmInput.value = "";
  clearForgotCodeInputs();
  setForgotEmailState("");
  clearForgotPasswordValidation();
  setForgotFeedback("");
  setForgotStep("email", { animate: false });
  updateForgotResendButton();
  syncForgotSubmitAvailability();
  if (forgotSubmitButton) {
    forgotSubmitButton.hidden = false;
  }
  forgotActions?.classList.remove("is-cancel-only");
  clearForgotPasswordFlowPersistence();
}

function openForgotPasswordView() {
  if (!loginPanel || forgotState.panelOpen) {
    return;
  }
  resetForgotPasswordFlow();

  forgotState.panelOpen = true;
  document.documentElement.classList.remove("login-signin-accounts", "login-forgot-pending");
  loginViewForgot?.setAttribute("aria-hidden", "false");
  loginViewSignin?.setAttribute("aria-hidden", "true");
  window.clearTimeout(forgotState.slideTimerId);
  loginPanel.classList.add("is-sliding");
  // Force layout so the transition starts from translateX(100%) → 0
  void loginPanel.offsetWidth;
  loginPanel.classList.add("is-forgot-view");
  persistForgotPasswordFlow();
  forgotState.slideTimerId = window.setTimeout(() => {
    loginPanel.classList.remove("is-sliding");
    forgotEmailInput?.focus({ preventScroll: true });
  }, PANEL_SLIDE_MS);
}

function closeForgotPasswordView() {
  if (!loginPanel || !forgotState.panelOpen) {
    return;
  }
  forgotState.panelOpen = false;
  clearForgotPasswordFlowPersistence();
  document.documentElement.classList.remove("login-forgot-pending");
  syncLoginSigninSurfaceClass();
  window.clearTimeout(forgotState.slideTimerId);
  loginPanel.classList.add("is-sliding");
  void loginPanel.offsetWidth;
  loginPanel.classList.remove("is-forgot-view");
  loginViewForgot?.setAttribute("aria-hidden", "true");
  loginViewSignin?.setAttribute("aria-hidden", "false");
  window.clearInterval(forgotState.resendTimerId);
  forgotState.resendTimerId = 0;
  forgotState.slideTimerId = window.setTimeout(() => {
    loginPanel.classList.remove("is-sliding");
    helpLink?.focus({ preventScroll: true });
  }, PANEL_SLIDE_MS);
}

function restoreForgotPasswordFlowIfNeeded() {
  if (!loginPanel) {
    return false;
  }

  const saved = readForgotPasswordFlowPersistence();
  if (!saved) {
    return false;
  }

  const email = normalizeLoginEmail(saved.email || saved.validEmail || "");
  if (!email || !emailPattern.test(email)) {
    clearForgotPasswordFlowPersistence();
    return false;
  }

  let step = String(saved.step || "email");
  const verificationToken = String(saved.verificationToken || "").trim();
  if (step === "password" && !verificationToken) {
    step = "code";
  }
  if (step !== "email" && step !== "code" && step !== "password") {
    step = "email";
  }

  if (activeRole !== "admin") {
    setActiveRole("admin", { quiet: true, preserveCredentials: true });
  }

  forgotState.email = email;
  forgotState.validEmail = email;
  forgotState.verificationToken = verificationToken;
  forgotState.resendAvailableAt = Number(saved.resendAvailableAt || 0);
  setForgotSubmitting(false);

  if (forgotEmailInput) {
    forgotEmailInput.value = email;
  }
  if (forgotPasswordInput) forgotPasswordInput.value = "";
  if (forgotPasswordConfirmInput) forgotPasswordConfirmInput.value = "";
  clearForgotCodeInputs();
  clearForgotPasswordValidation();
  setForgotFeedback("");
  setForgotEmailState("valid");

  forgotState.panelOpen = true;
  document.documentElement.classList.remove("login-signin-accounts", "login-forgot-pending");
  loginViewForgot?.setAttribute("aria-hidden", "false");
  loginViewSignin?.setAttribute("aria-hidden", "true");
  loginPanel.classList.remove("is-sliding");
  loginPanel.classList.add("is-forgot-view");
  setForgotStep(step, { animate: false });

  if (step === "code") {
    resumeForgotResendTimer();
    window.setTimeout(() => {
      forgotCodeInputs[0]?.focus({ preventScroll: true });
    }, 0);
  } else if (step === "password") {
    window.setTimeout(() => {
      forgotPasswordInput?.focus({ preventScroll: true });
    }, 0);
  } else {
    window.setTimeout(() => {
      forgotEmailInput?.focus({ preventScroll: true });
    }, 0);
  }

  persistForgotPasswordFlow();
  return true;
}

function isForgotPasswordMidTransaction() {
  return forgotState.panelOpen && (forgotState.step === "code" || forgotState.step === "password");
}

function closeForgotInterruptModal() {
  if (!forgotInterruptOverlay) {
    return;
  }
  forgotInterruptOverlay.classList.remove("is-open");
  forgotInterruptOverlay.setAttribute("aria-hidden", "true");
  window.setTimeout(() => {
    if (!forgotInterruptOverlay.classList.contains("is-open")) {
      forgotInterruptOverlay.hidden = true;
    }
  }, 200);
  document.body.classList.remove("modal-open");
  forgotState.interruptPendingAction = null;
}

function stopLoginSuccessModalLottie() {
  if (loginSuccessModalLottie?.destroy) {
    loginSuccessModalLottie.destroy();
  }
  loginSuccessModalLottie = null;
}

function closeLoginSuccessModal() {
  window.clearTimeout(loginSuccessModalTimerId);
  loginSuccessModalTimerId = 0;
  stopLoginSuccessModalLottie();

  if (!loginSuccessModalOverlay) {
    loginSuccessModalOnClose = null;
    return;
  }

  loginSuccessModalOverlay.classList.remove("is-open");
  loginSuccessModalOverlay.setAttribute("aria-hidden", "true");
  window.setTimeout(() => {
    if (!loginSuccessModalOverlay.classList.contains("is-open")) {
      loginSuccessModalOverlay.hidden = true;
    }
  }, 180);
  document.body.classList.remove("modal-open");

  const onClose = loginSuccessModalOnClose;
  loginSuccessModalOnClose = null;
  if (typeof onClose === "function") {
    onClose();
  }
}

function openLoginSuccessModal({
  title = "Success",
  copy = "",
  autoCloseMs = LOGIN_SUCCESS_MODAL_AUTO_CLOSE_MS,
  onClose = null,
} = {}) {
  if (!loginSuccessModalOverlay) {
    if (typeof onClose === "function") {
      onClose();
    }
    return;
  }

  closeForgotInterruptModal();
  window.clearTimeout(loginSuccessModalTimerId);
  stopLoginSuccessModalLottie();
  loginSuccessModalOnClose = typeof onClose === "function" ? onClose : null;

  if (loginSuccessModalTitle) {
    loginSuccessModalTitle.textContent = title;
  }
  if (loginSuccessModalCopy) {
    loginSuccessModalCopy.textContent = copy;
  }

  const lottieHost = loginSuccessModalIcon?.querySelector("[data-login-success-lottie]");
  if (lottieHost) {
    lottieHost.innerHTML = "";
  }

  loginSuccessModalOverlay.hidden = false;
  loginSuccessModalOverlay.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  window.requestAnimationFrame(() => {
    loginSuccessModalOverlay.classList.add("is-open");
    loginSuccessModal?.focus({ preventScroll: true });

    if (lottieHost && window.lottie?.loadAnimation) {
      try {
        loginSuccessModalLottie = window.lottie.loadAnimation({
          container: lottieHost,
          renderer: "svg",
          loop: false,
          autoplay: true,
          path: loginSuccessModalAnimationPath,
        });
      } catch (error) {
        loginSuccessModalLottie = null;
      }
    }
  });

  loginSuccessModalTimerId = window.setTimeout(() => {
    closeLoginSuccessModal();
  }, Math.max(800, Number(autoCloseMs) || LOGIN_SUCCESS_MODAL_AUTO_CLOSE_MS));
}

function openForgotInterruptModal(pendingAction) {
  if (!forgotInterruptOverlay || typeof pendingAction !== "function") {
    return;
  }
  forgotState.interruptPendingAction = pendingAction;

  const title = document.getElementById("login-forgot-interrupt-title");
  const copy = document.getElementById("login-forgot-interrupt-copy");
  if (forgotState.step === "password") {
    if (title) title.textContent = "Leave password setup?";
    if (copy) {
      copy.textContent =
        "Going back will cancel creating your new password and return you to sign in.";
    }
  } else if (forgotState.step === "code") {
    if (title) title.textContent = "Leave password reset?";
    if (copy) {
      copy.textContent =
        "Going back will cancel this reset. You may need to request a new code later.";
    }
  } else {
    if (title) title.textContent = "Leave password reset?";
    if (copy) {
      copy.textContent = "Going back will close password reset and return you to sign in.";
    }
  }

  forgotInterruptOverlay.hidden = false;
  forgotInterruptOverlay.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  window.requestAnimationFrame(() => {
    forgotInterruptOverlay.classList.add("is-open");
    forgotInterruptContinueButton?.focus({ preventScroll: true });
  });
}

function requestForgotNavigateBack() {
  if (forgotState.submitting || !forgotState.panelOpen) {
    return;
  }

  // Email step can cancel immediately. Notice modal starts at verification code.
  if (!isForgotPasswordMidTransaction()) {
    closeForgotPasswordView();
    return;
  }

  openForgotInterruptModal(() => {
    closeForgotPasswordView();
  });
}

function confirmForgotInterruptGoBack() {
  const pendingAction = forgotState.interruptPendingAction;
  closeForgotInterruptModal();
  if (typeof pendingAction === "function") {
    pendingAction();
  }
}

async function sendForgotPasswordCode({ isResend = false } = {}) {
  const email = normalizeLoginEmail(forgotEmailInput?.value || forgotState.email || "");
  if (forgotEmailInput) {
    forgotEmailInput.value = email;
  }

  setForgotFeedback("");

  if (!email) {
    setForgotEmailState("invalid", "Enter your Gmail address.");
    forgotEmailInput?.focus();
    return false;
  }
  if (!emailPattern.test(email)) {
    setForgotEmailState("invalid", "Enter a valid Gmail address.");
    forgotEmailInput?.focus();
    return false;
  }

  setForgotSubmitting(true);
  if (forgotResendButton) forgotResendButton.disabled = true;
  const loadingStartedAt = Date.now();

  try {
    const lookup = isCurrentForgotEmailMatched()
      ? { valid: true, email }
      : await validateForgotEmail();

    if (!lookup.valid) {
      if (!lookup.stale) {
        setForgotFeedback("");
        setForgotStep("email");
        forgotEmailInput?.focus();
      }
      return false;
    }

    setForgotEmailState("valid");
    setForgotFeedback(isResend ? "Resending code..." : "Sending reset code...");
    const sendResponse = await fetch("/api/auth/verification/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        purpose: "password_reset",
        channel: "email",
        email,
        target: email,
      }),
    });
    const sendData = await sendResponse.json().catch(() => ({}));
    await ensureLoginLoadingDelay(loadingStartedAt);

    if (sendResponse.status === 404) {
      const message = sendData.message || "This email is not registered on Switch.";
      forgotState.validEmail = "";
      setForgotEmailState("invalid", message);
      setForgotFeedback("");
      setForgotStep("email");
      forgotEmailInput?.focus();
      return false;
    }

    if (!sendResponse.ok) {
      throw new Error(sendData.message || "Unable to send reset code.");
    }

    forgotState.email = email;
    forgotState.validEmail = email;
    forgotState.verificationToken = "";
    clearForgotCodeInputs();
    setForgotStep("code");
    startForgotResendTimer();
    setForgotFeedback(`Code sent to ${email}.`, "success");
    window.setTimeout(() => forgotCodeInputs[0]?.focus({ preventScroll: true }), PANEL_SLIDE_MS);
    return true;
  } catch (error) {
    await ensureLoginLoadingDelay(loadingStartedAt);
    setForgotFeedback(
      error instanceof Error ? error.message : "Unable to send reset code.",
      "error",
    );
    return false;
  } finally {
    setForgotSubmitting(false);
    updateForgotResendButton();
  }
}

async function verifyForgotPasswordCode() {
  const code = getForgotCodeValue();
  setForgotFieldMessage(forgotCodeMessage, "");
  setForgotFeedback("");
  forgotCodeInputsWrap?.classList.remove("is-error", "is-valid");

  if (!/^\d{6}$/.test(code)) {
    forgotCodeInputsWrap?.classList.add("is-error");
    setForgotFieldMessage(forgotCodeMessage, "Enter the 6-digit code from your Gmail.", "error");
    forgotCodeInputs.find((input) => !input.value)?.focus() || forgotCodeInputs[0]?.focus();
    return false;
  }

  setForgotSubmitting(true);
  forgotCodeInputs.forEach((input) => {
    input.disabled = true;
  });
  setForgotFieldMessage(forgotCodeMessage, "Verifying code...", "checking");
  const loadingStartedAt = Date.now();

  try {
    const response = await fetch("/api/auth/verification/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        purpose: "password_reset",
        channel: "email",
        email: forgotState.email,
        target: forgotState.email,
        code,
      }),
    });
    const data = await response.json().catch(() => ({}));
    await ensureLoginLoadingDelay(loadingStartedAt);
    if (!response.ok) {
      throw new Error(data.message || "Incorrect verification code.");
    }

    forgotState.verificationToken = String(data.verificationToken || "").trim();
    if (!forgotState.verificationToken) {
      throw new Error("Verification succeeded but no reset token was returned.");
    }

    setForgotFieldMessage(forgotCodeMessage, "");
    setForgotStep("password");
    setForgotFeedback("Code verified. Create your new password.", "success");
    window.setTimeout(() => forgotPasswordInput?.focus(), PANEL_SLIDE_MS);
    return true;
  } catch (error) {
    await ensureLoginLoadingDelay(loadingStartedAt);
    forgotCodeInputsWrap?.classList.add("is-error");
    setForgotFieldMessage(
      forgotCodeMessage,
      error instanceof Error ? error.message : "Unable to verify code.",
      "error",
    );
    return false;
  } finally {
    setForgotSubmitting(false);
    forgotCodeInputs.forEach((input) => {
      input.disabled = false;
    });
  }
}

async function submitForgotNewPassword() {
  setForgotFeedback("");
  const passwordValid = validateForgotNewPasswordField({ force: true });
  const confirmValid = validateForgotConfirmPasswordField({ force: true });
  if (!passwordValid) {
    forgotPasswordInput?.focus();
    return false;
  }
  if (!confirmValid) {
    forgotPasswordConfirmInput?.focus();
    return false;
  }

  const password = String(forgotPasswordInput?.value || "");
  const confirmPassword = String(forgotPasswordConfirmInput?.value || "");

  setForgotSubmitting(true);
  setForgotFeedback("Updating password...");
  const loadingStartedAt = Date.now();

  try {
    const response = await fetch("/api/auth/password-reset", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        email: forgotState.email,
        password,
        confirmPassword,
        verificationToken: forgotState.verificationToken,
      }),
    });
    const data = await response.json().catch(() => ({}));
    await ensureLoginLoadingDelay(loadingStartedAt);
    if (!response.ok) {
      throw new Error(data.message || "Unable to update password.");
    }

    const resetEmail = forgotState.email;
    openLoginSuccessModal({
      title: "Success",
      copy: "Password updated. Sign in with your new password.",
      onClose: async () => {
        closeForgotPasswordView();
        resetForgotPasswordFlow();
        if (activeRole === "admin" && resetEmail && identifierInput) {
          identifierInput.value = resetEmail;
          await validateAdminIdentifier({ showModal: false });
        }
        passwordInput?.focus({ preventScroll: true });
      },
    });
    return true;
  } catch (error) {
    await ensureLoginLoadingDelay(loadingStartedAt);
    const message = error instanceof Error ? error.message : "Unable to update password.";
    if (/match/i.test(message)) {
      setForgotPasswordFieldState("confirm", "invalid", message);
      forgotPasswordConfirmInput?.focus();
    } else {
      setForgotPasswordFieldState("password", "invalid", message);
      forgotPasswordInput?.focus();
    }
    setForgotFeedback(message, "error");
    return false;
  } finally {
    setForgotSubmitting(false);
  }
}

function getForgotPasswordRuleError(password) {
  const value = String(password || "");
  if (!value) {
    return "Enter a new password.";
  }
  if (value.length < 8) {
    return "Password must be at least 8 characters.";
  }
  if (!/[A-Z]/.test(value)) {
    return "Include at least 1 uppercase letter.";
  }
  if (!/\d/.test(value)) {
    return "Include at least 1 number.";
  }
  return "";
}

function setForgotPasswordFieldState(which, mode = "", message = "") {
  const isConfirm = which === "confirm";
  const field = isConfirm ? forgotPasswordConfirmField : forgotPasswordField;
  const input = isConfirm ? forgotPasswordConfirmInput : forgotPasswordInput;
  const messageNode = isConfirm ? forgotPasswordConfirmMessage : forgotPasswordMessage;
  const status = isConfirm ? forgotPasswordConfirmStatus : forgotPasswordStatus;
  if (!(input instanceof HTMLElement)) {
    return;
  }

  const fallbackIcon = status?.querySelector(".login-validation-fallback");
  input.classList.remove("login-password-invalid", "login-password-valid");
  status?.classList.remove("is-valid", "is-invalid", "is-checking");
  stopForgotPasswordFieldLottie(which);

  if (fallbackIcon) {
    fallbackIcon.innerHTML = "";
  }
  setLoginFieldMessage(field, input, messageNode);

  if (mode === "invalid" && message) {
    input.classList.add("login-password-invalid");
    status?.classList.add("is-invalid");
    status?.setAttribute("aria-label", message);
    setLoginFieldMessage(field, input, messageNode, "invalid", message);
    if (fallbackIcon) {
      fallbackIcon.innerHTML = loginValidationErrorIconMarkup;
    }
  } else if (status) {
    status.removeAttribute("aria-label");
  }

  syncForgotSubmitAvailability();
  syncForgotStageHeight();
}

function clearForgotPasswordValidation() {
  setForgotPasswordFieldState("password");
  setForgotPasswordFieldState("confirm");
}

function validateForgotNewPasswordField(options = {}) {
  const { force = false } = options;
  const password = String(forgotPasswordInput?.value || "");
  if (!password && !force) {
    setForgotPasswordFieldState("password");
    return true;
  }
  const ruleError = getForgotPasswordRuleError(password);
  if (ruleError) {
    setForgotPasswordFieldState("password", "invalid", ruleError);
    return false;
  }
  setForgotPasswordFieldState("password");
  return true;
}

function validateForgotConfirmPasswordField(options = {}) {
  const { force = false } = options;
  const password = String(forgotPasswordInput?.value || "");
  const confirmPassword = String(forgotPasswordConfirmInput?.value || "");
  if (!confirmPassword && !force) {
    setForgotPasswordFieldState("confirm");
    return true;
  }
  if (!confirmPassword) {
    setForgotPasswordFieldState("confirm", "invalid", "Confirm your new password.");
    return false;
  }
  if (password !== confirmPassword) {
    setForgotPasswordFieldState("confirm", "invalid", "Passwords do not match.");
    return false;
  }
  setForgotPasswordFieldState("confirm");
  return true;
}

forgotCodeInputs.forEach((input, index) => {
  input.addEventListener("input", () => {
    const digits = String(input.value || "").replace(/\D/g, "");
    input.value = digits.slice(0, 1);
    forgotCodeInputsWrap?.classList.remove("is-error", "is-valid");
    setForgotFieldMessage(forgotCodeMessage, "");
    if (input.value && index < forgotCodeInputs.length - 1) {
      forgotCodeInputs[index + 1].focus();
    }
    maybeAutoVerifyForgotCode();
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Backspace" && !input.value && index > 0) {
      forgotCodeInputs[index - 1].focus();
    }
  });

  input.addEventListener("paste", (event) => {
    const text = String(event.clipboardData?.getData("text") || "").replace(/\D/g, "");
    if (!text) {
      return;
    }
    event.preventDefault();
    forgotCodeInputs.forEach((codeInput, codeIndex) => {
      codeInput.value = text[codeIndex] || "";
    });
    const focusIndex = Math.min(text.length, forgotCodeInputs.length - 1);
    forgotCodeInputs[focusIndex]?.focus();
    maybeAutoVerifyForgotCode();
  });
});

forgotEmailInput?.addEventListener("input", () => {
  if (forgotState.step !== "email") {
    return;
  }
  window.clearTimeout(forgotEmailValidationTimer);
  forgotEmailValidationRequestId += 1;
  forgotState.validEmail = "";
  setForgotEmailState("");
  setForgotFeedback("");
  syncForgotSubmitAvailability();
});

forgotPasswordInput?.addEventListener("input", () => {
  if (forgotState.step !== "password") {
    return;
  }
  setForgotPasswordFieldState("password");
  if (forgotPasswordConfirmInput?.value) {
    setForgotPasswordFieldState("confirm");
  }
  syncForgotSubmitAvailability();
  syncForgotStageHeight();
});

forgotPasswordConfirmInput?.addEventListener("input", () => {
  if (forgotState.step !== "password") {
    return;
  }
  setForgotPasswordFieldState("confirm");
  syncForgotSubmitAvailability();
  syncForgotStageHeight();
});

helpLink?.addEventListener("click", (event) => {
  event.preventDefault();
  if (activeRole !== "admin") {
    setFeedback("Ask your seller admin to reset employee access from Account settings.");
    return;
  }
  openForgotPasswordView();
});

forgotBackButton?.addEventListener("click", () => {
  requestForgotNavigateBack();
});

forgotInterruptContinueButton?.addEventListener("click", () => {
  // Stay in the current forgot-password step — do not leave the process.
  closeForgotInterruptModal();
  if (forgotState.step === "email") {
    forgotEmailInput?.focus({ preventScroll: true });
    return;
  }
  if (forgotState.step === "code") {
    forgotCodeInputs.find((input) => !input.value)?.focus({ preventScroll: true })
      || forgotCodeInputs[0]?.focus({ preventScroll: true });
    return;
  }
  if (forgotState.step === "password") {
    forgotPasswordInput?.focus({ preventScroll: true });
  }
});

forgotInterruptBackButton?.addEventListener("click", () => {
  // Only "Go back" clears the process and returns to the login page.
  confirmForgotInterruptGoBack();
});

forgotInterruptCloseButton?.addEventListener("click", () => {
  // X / dismiss keeps the forgot-password process open.
  closeForgotInterruptModal();
});

forgotInterruptOverlay?.addEventListener("click", (event) => {
  if (event.target === forgotInterruptOverlay) {
    closeForgotInterruptModal();
  }
});

forgotResendButton?.addEventListener("click", () => {
  if (forgotState.submitting || Date.now() < forgotState.resendAvailableAt) {
    return;
  }
  void sendForgotPasswordCode({ isResend: true });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && loginSuccessModalOverlay?.classList.contains("is-open")) {
    event.preventDefault();
    closeLoginSuccessModal();
    return;
  }

  if (event.key === "Escape" && forgotInterruptOverlay?.classList.contains("is-open")) {
    event.preventDefault();
    closeForgotInterruptModal();
    return;
  }

  if (event.key === "Escape" && forgotState.panelOpen && !forgotState.submitting) {
    requestForgotNavigateBack();
  }
});

forgotForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (forgotState.submitting) {
    return;
  }
  if (forgotState.step === "email") {
    await sendForgotPasswordCode();
    return;
  }
  if (forgotState.step === "code") {
    // Code auto-verifies when all 6 digits are entered — no submit button.
    return;
  }
  if (!isForgotPasswordReadyToSubmit()) {
    validateForgotNewPasswordField({ force: true });
    validateForgotConfirmPasswordField({ force: true });
    syncForgotSubmitAvailability();
    return;
  }
  await submitForgotNewPassword();
});

syncForgotSubmitAvailability();
syncLoginPanelLoading();
restoreForgotPasswordFlowIfNeeded();
