const settingsMenus = [];
const loginLogoStorageKey = "gms-login-logo";
const loginLogoNameStorageKey = "gms-login-logo-name";
const notificationSeenStorageKey = "gms-notification-seen-signature";
const companyAcronymStorageKey = "gms-company-acronyms";
const employeePositionStorageKey = "gms-employee-positions";
const loginLogoTargets = document.querySelectorAll("[data-login-logo]");
const notificationEntries = [];
const notificationRefreshMs = 10000;
const notificationFetchLimit = 200;
const notificationReadActivityLimit = 300;
const notificationPreviewLimit = 5;
const sellerNotificationPreviewLimit = 4;
const notificationChangeHighlightClass = "activity-item__change-highlight";
const notificationSoundUrl = "/audio/universfield-new-notification-024-370048.mp3";
const settingsDropdownAnimationMs = 220;
const settingsDrawerBodyClass = "settings-drawer-open";
const settingsDrawerShellClass = "dashboard-shell--settings-open";
const recentThemeConfigStorageKey = "gms-recent-theme-configs";
const recentDashboardBackgroundConfigStorageKey = "gms-recent-dashboard-background-configs";
const maxRecentSpectrumConfigs = 5;
const defaultCompanyAcronyms = Object.freeze([]);
const defaultEmployeePositions = Object.freeze(["Packing", "Admin Employee"]);
const settingsMenuSquarePenIconMarkup = '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-square-pen-icon lucide-square-pen"><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"/></svg>';
const themedTooltipSelector = [
  ".dashboard-sidebar__logo",
  ".dashboard-nav__item",
  ".settings-toggle",
  ".dashboard-tool-button",
  ".scroll-top-button",
  ".product-panel-toolbar__nav-toggle",
  ".category-shortcut-fab__trigger",
].join(", ");
let scrollTopButton = null;
let currentNotificationTotal = 0;
let currentNotifications = [];
let latestNotificationSignature = "";
let seenNotificationState = loadSeenNotificationState();
let seenNotificationSignature = seenNotificationState.signature;
let lastNotificationSoundSignature = latestNotificationSignature || seenNotificationSignature || "";
let notificationAudio = null;
let notificationRealtimeRefreshTimer = 0;
let notificationLoadSequence = 0;

function isSellerAdminSettingsIconPage() {
  const pathname = String(window.location?.pathname || "").trim().toLowerCase();
  return !document.body?.classList?.contains("super-admin-page")
    && !/\/(?:super_admin|user_data|root_login)\.html$/.test(pathname);
}

function resolveThemedTooltipText(element, preferredText = "") {
  if (!element || typeof element.getAttribute !== "function") {
    return "";
  }

  const preferred = String(preferredText || "").trim();
  if (preferred) {
    return preferred;
  }

  const navTooltip = String(element.dataset?.navTooltip || "").trim();
  if (navTooltip) {
    return navTooltip;
  }

  const uiTooltip = String(element.dataset?.uiTooltip || "").trim();
  if (uiTooltip) {
    return uiTooltip;
  }

  const title = String(element.getAttribute("title") || "").trim();
  if (title) {
    return title;
  }

  return String(element.getAttribute("aria-label") || "").trim();
}

function syncThemedTooltip(element, preferredText = "") {
  if (!element || typeof element.getAttribute !== "function") {
    return;
  }

  const tooltipText = resolveThemedTooltipText(element, preferredText);
  if (!tooltipText) {
    return;
  }

  if (element.classList.contains("dashboard-nav__item") || element.hasAttribute("data-nav-tooltip")) {
    element.setAttribute("data-nav-tooltip", tooltipText);
  } else {
    element.setAttribute("data-ui-tooltip", tooltipText);
  }

  element.removeAttribute("title");
}

function applyThemedTooltips(root = document) {
  if (!root) {
    return;
  }

  const tooltipElements = new Set();

  if (root.nodeType === 1 && typeof root.matches === "function" && root.matches(themedTooltipSelector)) {
    tooltipElements.add(root);
  }

  if (typeof root.querySelectorAll === "function") {
    for (const element of root.querySelectorAll(themedTooltipSelector)) {
      tooltipElements.add(element);
    }
  }

  for (const element of tooltipElements) {
    syncThemedTooltip(element);
  }
}

function formatRgb(theme) {
  return `RGB ${theme.r}, ${theme.g}, ${theme.b}`;
}

function getActiveThemeScopeLabel() {
  const scope = window.WebTheme?.getActiveThemeStorageScope?.();

  if (scope?.type === "employee-account") {
    return "your employee account";
  }

  if (scope?.type === "employee-position") {
    return "this employee role";
  }

  if (scope?.type === "admin-account") {
    return "this admin account";
  }

  return "this browser";
}

function getActiveThemeScopeCopy() {
  const scope = window.WebTheme?.getActiveThemeStorageScope?.();

  if (scope?.type === "employee-account") {
    return "Pick a color for your employee account. It stays after logout.";
  }

  if (scope?.type === "admin-account") {
    return "Pick a color for this admin account.";
  }

  return "Pick a color for this browser until an account signs in.";
}

function updateThemeScopeCopy(menu) {
  const copy = menu?.querySelector?.(".settings-dropdown__copy");
  if (copy instanceof HTMLElement) {
    copy.textContent = getActiveThemeScopeCopy();
  }
}

function clampUnit(value) {
  return Math.min(1, Math.max(0, value));
}

function rgbToHsv(input) {
  const theme = window.WebTheme.normalizeTheme(input);
  const red = theme.r / 255;
  const green = theme.g / 255;
  const blue = theme.b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let hue = 0;

  if (delta !== 0) {
    if (max === red) {
      hue = ((green - blue) / delta) % 6;
    } else if (max === green) {
      hue = (blue - red) / delta + 2;
    } else {
      hue = (red - green) / delta + 4;
    }
  }

  hue = ((hue * 60) + 360) % 360;

  return {
    h: hue,
    s: max === 0 ? 0 : delta / max,
    v: max,
  };
}

function hsvToTheme(input) {
  const hue = ((Number(input?.h) % 360) + 360) % 360;
  const saturation = clampUnit(Number(input?.s) || 0);
  const value = clampUnit(Number(input?.v) || 0);
  const chroma = value * saturation;
  const hueSection = hue / 60;
  const secondary = chroma * (1 - Math.abs((hueSection % 2) - 1));
  const match = value - chroma;
  let red = 0;
  let green = 0;
  let blue = 0;

  if (hueSection >= 0 && hueSection < 1) {
    red = chroma;
    green = secondary;
  } else if (hueSection < 2) {
    red = secondary;
    green = chroma;
  } else if (hueSection < 3) {
    green = chroma;
    blue = secondary;
  } else if (hueSection < 4) {
    green = secondary;
    blue = chroma;
  } else if (hueSection < 5) {
    red = secondary;
    blue = chroma;
  } else {
    red = chroma;
    blue = secondary;
  }

  return window.WebTheme.normalizeTheme({
    r: Math.round((red + match) * 255),
    g: Math.round((green + match) * 255),
    b: Math.round((blue + match) * 255),
  });
}

function getCarouselButtons(carousel) {
  if (!(carousel instanceof HTMLElement)) {
    return [];
  }

  return [...carousel.querySelectorAll(".product-form-section-carousel__button")]
    .filter((button) => button.closest(".product-form-section-carousel") === carousel);
}

function getActiveCarouselButtonIndex(buttons, carousel) {
  const activeIndex = buttons.findIndex((button) =>
    button.classList.contains("is-active") ||
    button.getAttribute("aria-pressed") === "true" ||
    button.getAttribute("aria-selected") === "true",
  );

  if (activeIndex >= 0) {
    return activeIndex;
  }

  const storedIndex = Number(carousel?.dataset?.carouselActiveIndex);
  return Number.isFinite(storedIndex) ? storedIndex : -1;
}

function animateCarouselButtonText(button, direction) {
  return;
}

function handleCarouselButtonActivation(event) {
  const button = event.target?.closest?.(".product-form-section-carousel__button");
  if (!(button instanceof HTMLButtonElement) || button.disabled) {
    return;
  }

  const carousel = button.closest(".product-form-section-carousel");
  if (!(carousel instanceof HTMLElement)) {
    return;
  }

  const buttons = getCarouselButtons(carousel);
  const nextIndex = buttons.indexOf(button);
  if (nextIndex < 0) {
    return;
  }

  const previousIndex = getActiveCarouselButtonIndex(buttons, carousel);
  if (previousIndex === nextIndex) {
    return;
  }

  buttons.forEach((item) => {
    item.classList.remove("is-carousel-text-slide-left", "is-carousel-text-slide-right");
  });
  carousel.dataset.carouselActiveIndex = String(nextIndex);
}

function hueToCss(hue) {
  return `hsl(${Math.round(hue)}, 100%, 50%)`;
}

function rgbToCss(input) {
  const theme = window.WebTheme.normalizeTheme(input);
  return `rgb(${theme.r}, ${theme.g}, ${theme.b})`;
}

function rgbaToCss(input, alpha = 1) {
  const theme = window.WebTheme.normalizeTheme(input);
  return `rgba(${theme.r}, ${theme.g}, ${theme.b}, ${clampUnit(Number(alpha) || 0)})`;
}

function getTransparencyBackdropCss() {
  return "conic-gradient(from 45deg, rgba(148, 163, 184, 0.28) 0deg 90deg, #ffffff 90deg 180deg, rgba(148, 163, 184, 0.28) 180deg 270deg, #ffffff 270deg 360deg) center / 12px 12px";
}

function getAlphaSwatchFill(theme, alpha = 1) {
  return `linear-gradient(0deg, ${rgbaToCss(theme, alpha)}, ${rgbaToCss(theme, alpha)}), ${getTransparencyBackdropCss()}`;
}

function mixTheme(firstTheme, secondTheme, ratio) {
  const first = window.WebTheme.normalizeTheme(firstTheme);
  const second = window.WebTheme.normalizeTheme(secondTheme);
  const weight = clampUnit(Number(ratio) || 0);

  return window.WebTheme.normalizeTheme({
    r: Math.round(first.r + ((second.r - first.r) * weight)),
    g: Math.round(first.g + ((second.g - first.g) * weight)),
    b: Math.round(first.b + ((second.b - first.b) * weight)),
  });
}

function getSpectrumSwatchFill(theme, mode = "solid") {
  const base = window.WebTheme.normalizeTheme(theme);
  if (mode === "gradient") {
    const lightTone = mixTheme(base, { r: 255, g: 255, b: 255 }, 0.28);
    const deepTone = mixTheme(base, { r: 15, g: 23, b: 42 }, 0.22);
    return `linear-gradient(135deg, ${rgbToCss(lightTone)} 0%, ${rgbToCss(base)} 52%, ${rgbToCss(deepTone)} 100%)`;
  }

  return window.WebTheme.rgbToHex(base);
}

function getGradientFill(startTheme, endTheme, options = {}) {
  const angle = typeof options.angle === "string" && options.angle.trim() ? options.angle : "135deg";
  const rawStartStop = clampUnit(Number(options.startStop));
  const rawEndStop = clampUnit(Number(options.endStop));
  const startStop = Number.isFinite(rawStartStop) ? rawStartStop : 0;
  const endStop = Number.isFinite(rawEndStop) ? rawEndStop : 1;
  const resolvedEndStop = Math.max(endStop, Math.min(1, startStop + 0.001));
  const startAlpha = clampUnit(Number(options.startAlpha ?? 1));
  const endAlpha = clampUnit(Number(options.endAlpha ?? 1));
  const hasMiddleTheme = Boolean(options.middleTheme);
  const rawMiddleStop = clampUnit(
    Number(options.middleStop ?? window.WebTheme.defaultGradientMiddlePosition ?? 0.5),
  );
  const resolvedMiddleStop = hasMiddleTheme
    ? Math.min(
        Math.max(startStop + 0.001, rawMiddleStop),
        Math.min(1, resolvedEndStop - 0.001),
      )
    : null;
  const middleAlpha = hasMiddleTheme
    ? clampUnit(Number(options.middleAlpha ?? (startAlpha + endAlpha) / 2))
    : null;

  if (!hasMiddleTheme) {
    return `linear-gradient(
      ${angle},
      ${rgbaToCss(startTheme, startAlpha)} 0%,
      ${rgbaToCss(startTheme, startAlpha)} ${startStop * 100}%,
      ${rgbaToCss(endTheme, endAlpha)} ${resolvedEndStop * 100}%,
      ${rgbaToCss(endTheme, endAlpha)} 100%
    )`;
  }

  return `linear-gradient(
    ${angle},
    ${rgbaToCss(startTheme, startAlpha)} 0%,
    ${rgbaToCss(startTheme, startAlpha)} ${startStop * 100}%,
    ${rgbaToCss(options.middleTheme, middleAlpha)} ${resolvedMiddleStop * 100}%,
    ${rgbaToCss(endTheme, endAlpha)} ${resolvedEndStop * 100}%,
    ${rgbaToCss(endTheme, endAlpha)} 100%
  )`;
}

function formatGradientAngleLabel(angle) {
  return `${window.WebTheme.normalizeGradientAngle(angle)}deg`;
}

function createDefaultGradientStops(theme) {
  const base = window.WebTheme.normalizeTheme(theme);
  const lightTone = mixTheme(base, { r: 255, g: 255, b: 255 }, 0.28);
  const deepTone = mixTheme(base, { r: 15, g: 23, b: 42 }, 0.22);
  return {
    start: { ...lightTone },
    middle: { ...base },
    end: { ...deepTone },
  };
}

function createSpectrumEditorMarkup(prefix) {
  return `
    <div class="settings-spectrum__panel" data-spectrum-${prefix}-panel>
      <span class="settings-spectrum__panel-handle" aria-hidden="true"></span>
    </div>

    <div class="settings-spectrum__hue" data-spectrum-${prefix}-hue>
      <span class="settings-spectrum__hue-handle" aria-hidden="true"></span>
    </div>

    <div class="settings-spectrum__inputs">
      <label class="settings-spectrum__field settings-spectrum__field--hex">
        <span>Hex</span>
        <input type="text" inputmode="text" maxlength="7" value="#2563EB" data-spectrum-${prefix}-hex />
      </label>
      <label class="settings-spectrum__field">
        <span>R</span>
        <input type="number" min="0" max="255" value="37" data-spectrum-${prefix}-red />
      </label>
      <label class="settings-spectrum__field">
        <span>G</span>
        <input type="number" min="0" max="255" value="99" data-spectrum-${prefix}-green />
      </label>
      <label class="settings-spectrum__field">
        <span>B</span>
        <input type="number" min="0" max="255" value="235" data-spectrum-${prefix}-blue />
      </label>
    </div>
  `;
}

function getSpectrumEditor(root, prefix) {
  const panel = root.querySelector(`[data-spectrum-${prefix}-panel]`);
  const hue = root.querySelector(`[data-spectrum-${prefix}-hue]`);

  return {
    panel,
    panelHandle: panel?.querySelector(".settings-spectrum__panel-handle") ?? null,
    hue,
    hueHandle: hue?.querySelector(".settings-spectrum__hue-handle") ?? null,
    hexInput: root.querySelector(`[data-spectrum-${prefix}-hex]`),
    redInput: root.querySelector(`[data-spectrum-${prefix}-red]`),
    greenInput: root.querySelector(`[data-spectrum-${prefix}-green]`),
    blueInput: root.querySelector(`[data-spectrum-${prefix}-blue]`),
    state: rgbToHsv(window.WebTheme.loadTheme()),
  };
}

function isSpectrumEditorReady(editor) {
  return (
    editor &&
    editor.panel instanceof HTMLElement &&
    editor.panelHandle instanceof HTMLElement &&
    editor.hue instanceof HTMLElement &&
    editor.hueHandle instanceof HTMLElement &&
    editor.hexInput instanceof HTMLInputElement &&
    editor.redInput instanceof HTMLInputElement &&
    editor.greenInput instanceof HTMLInputElement &&
    editor.blueInput instanceof HTMLInputElement
  );
}

function renderStandaloneSpectrumEditor(editor, theme) {
  if (!isSpectrumEditorReady(editor)) {
    return;
  }

  const normalizedTheme = window.WebTheme.normalizeTheme(theme);
  const hsv = rgbToHsv(normalizedTheme);
  const hexValue = window.WebTheme.rgbToHex(normalizedTheme);
  const activeElement = document.activeElement;

  editor.state = hsv;
  editor.panel.style.background = `
    linear-gradient(to top, #000 0%, transparent 100%),
    linear-gradient(to right, #fff 0%, ${hueToCss(hsv.h)} 100%)
  `;

  if (activeElement !== editor.hexInput) {
    editor.hexInput.value = hexValue;
  }
  if (activeElement !== editor.redInput) {
    editor.redInput.value = String(normalizedTheme.r);
  }
  if (activeElement !== editor.greenInput) {
    editor.greenInput.value = String(normalizedTheme.g);
  }
  if (activeElement !== editor.blueInput) {
    editor.blueInput.value = String(normalizedTheme.b);
  }

  editor.panelHandle.hidden = false;
  editor.panelHandle.style.left = `${hsv.s * 100}%`;
  editor.panelHandle.style.top = `${(1 - hsv.v) * 100}%`;
  editor.hueHandle.style.left = `${(hsv.h / 360) * 100}%`;
}

function normalizeSeenNotificationState(value) {
  if (value && typeof value === "object") {
    const rawReadActivityIds = Array.isArray(value.readActivityIds)
      ? value.readActivityIds
      : Array.isArray(value.readActivityKeys)
        ? value.readActivityKeys
        : [];
    const readActivityIds = [];
    const seenReadActivityIds = new Set();
    for (const rawId of rawReadActivityIds) {
      const readActivityId = String(rawId ?? "").trim();
      if (!readActivityId || seenReadActivityIds.has(readActivityId)) {
        continue;
      }
      seenReadActivityIds.add(readActivityId);
      readActivityIds.push(readActivityId);
    }

    return {
      signature: String(value.signature ?? "").trim(),
      latestActivityId: String(value.latestActivityId ?? "").trim(),
      latestActivityCreatedAt: String(value.latestActivityCreatedAt ?? "").trim(),
      badgeSignature: String(value.badgeSignature ?? "").trim(),
      badgeLatestActivityId: String(value.badgeLatestActivityId ?? "").trim(),
      badgeLatestActivityCreatedAt: String(value.badgeLatestActivityCreatedAt ?? "").trim(),
      readActivityIds: readActivityIds.slice(0, notificationReadActivityLimit),
      readMode: String(value.readMode ?? "").trim(),
      seenAt: String(value.seenAt ?? "").trim(),
      badgeSeenAt: String(value.badgeSeenAt ?? "").trim(),
    };
  }

  return {
    signature: String(value ?? "").trim(),
    latestActivityId: "",
    latestActivityCreatedAt: "",
    badgeSignature: "",
    badgeLatestActivityId: "",
    badgeLatestActivityCreatedAt: "",
    readActivityIds: [],
    readMode: "",
    seenAt: "",
    badgeSeenAt: "",
  };
}

function loadSeenNotificationState() {
  try {
    const rawValue = localStorage.getItem(getNotificationSeenStorageKey()) ?? "";
    if (!rawValue) {
      return normalizeSeenNotificationState("");
    }

    try {
      return normalizeSeenNotificationState(JSON.parse(rawValue));
    } catch (error) {
      return normalizeSeenNotificationState(rawValue);
    }
  } catch (error) {
    return normalizeSeenNotificationState("");
  }
}

function saveSeenNotificationState(state) {
  const normalizedState = normalizeSeenNotificationState(state);
  try {
    localStorage.setItem(getNotificationSeenStorageKey(), JSON.stringify(normalizedState));
  } catch (error) {
    // Ignore storage errors for notification seen state.
  }
}

function getNotificationAudio() {
  if (notificationAudio) {
    return notificationAudio;
  }

  notificationAudio = new Audio(notificationSoundUrl);
  notificationAudio.preload = "auto";
  notificationAudio.volume = 0.72;
  return notificationAudio;
}

function playNotificationSound(nextSignature) {
  const normalizedSignature = String(nextSignature ?? "").trim();
  if (!normalizedSignature || normalizedSignature === lastNotificationSoundSignature) {
    return;
  }
  if (window.GMSPlatformSettings?.notificationSounds === false) {
    lastNotificationSoundSignature = normalizedSignature;
    return;
  }

  lastNotificationSoundSignature = normalizedSignature;
  try {
    const audio = getNotificationAudio();
    audio.currentTime = 0;
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {
        // Browsers can block autoplay until the user interacts with the page.
      });
    }
  } catch (error) {
    // Notification sound is best-effort only.
  }
}

function readNotificationSessionStorageJson(key) {
  try {
    return JSON.parse(window.sessionStorage?.getItem(key) || "null");
  } catch (error) {
    return null;
  }
}

function writeNotificationSessionStorageJson(key, value) {
  try {
    window.sessionStorage?.setItem(key, JSON.stringify(value));
  } catch (error) {
    // Keep notification navigation best-effort when storage is unavailable.
  }
}

function getNotificationSessionMatchValues(session) {
  return [
    session?.id,
    session?.accountCode,
    session?.employeeId,
    session?.email,
  ]
    .map((value) => String(value ?? "").trim().toLowerCase())
    .filter(Boolean);
}

function isMatchingNotificationEmployeeAccount(account, sessionMatchValues) {
  if (!account || typeof account !== "object" || !sessionMatchValues.length) {
    return false;
  }

  return [
    account.id,
    account.accountCode,
    account.employeeId,
    account.email,
  ]
    .map((value) => String(value ?? "").trim().toLowerCase())
    .some((value) => value && sessionMatchValues.includes(value));
}

function hasNotificationAdminSession() {
  const adminSession = readNotificationSessionStorageJson("gms-admin-session");
  return Boolean(
    adminSession &&
    typeof adminSession === "object" &&
    (
      String(adminSession.role ?? "").trim().toLowerCase() === "admin" ||
      adminSession.adminId ||
      adminSession.email ||
      adminSession.id ||
      adminSession.accountCode
    ),
  );
}

async function refreshNotificationEmployeeSession() {
  if (hasNotificationAdminSession()) {
    return null;
  }

  if (typeof window.gmsRefreshEmployeeAccessSession === "function") {
    try {
      const refreshedSession = await window.gmsRefreshEmployeeAccessSession();
      if (refreshedSession && typeof refreshedSession === "object") {
        return refreshedSession;
      }
    } catch (error) {
      // Fall back to the local refresh path below.
    }
  }

  const employeeSession = readNotificationSessionStorageJson("gms-employee-session");
  if (!employeeSession || typeof employeeSession !== "object") {
    return employeeSession;
  }

  const sessionMatchValues = getNotificationSessionMatchValues(employeeSession);
  if (!sessionMatchValues.length) {
    return employeeSession;
  }

  try {
    const adminId = getNotificationAdminScope();
    const accountsUrl = adminId
      ? `/api/accounts?adminId=${encodeURIComponent(adminId)}`
      : "/api/accounts";
    const response = await fetch(accountsUrl, { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return employeeSession;
    }

    const accounts = Array.isArray(data?.accounts) ? data.accounts : [];
    const account = accounts.find((candidate) =>
      isMatchingNotificationEmployeeAccount(candidate, sessionMatchValues),
    );
    if (!account) {
      return employeeSession;
    }

    const nextSession = {
      ...employeeSession,
      ...account,
      dashboardPath: account.dashboardPath || employeeSession.dashboardPath,
      signedInAt: employeeSession.signedInAt || new Date().toISOString(),
    };
    writeNotificationSessionStorageJson("gms-employee-session", nextSession);
    window.dispatchEvent(
      new CustomEvent("gms-employee-session-updated", {
        detail: { session: nextSession },
      }),
    );
    return nextSession;
  } catch (error) {
    return employeeSession;
  }
}

function getNotificationViewer() {
  if (hasNotificationAdminSession()) {
    const adminSession = readNotificationSessionStorageJson("gms-admin-session");
    return {
      role: "admin",
      accountId: String(adminSession?.email ?? adminSession?.adminId ?? "admin").trim(),
      accessPermissions: [],
      accessPermissionGrantedAt: {},
    };
  }

  const employeeSession = readNotificationSessionStorageJson("gms-employee-session");
  if (employeeSession && isEmployeeWorkspacePage()) {
    return {
      role: "employee",
      accountId: String(
        employeeSession.employeeId ??
          employeeSession.accountCode ??
          employeeSession.id ??
          "",
      ).trim(),
      accessPermissions: Array.isArray(employeeSession.accessPermissions)
        ? employeeSession.accessPermissions
        : [],
      accessPermissionGrantedAt:
        employeeSession.accessPermissionGrantedAt &&
        typeof employeeSession.accessPermissionGrantedAt === "object"
          ? employeeSession.accessPermissionGrantedAt
          : {},
    };
  }

  const adminSession = readNotificationSessionStorageJson("gms-admin-session");
  return {
    role: "admin",
    accountId: String(adminSession?.email ?? "admin").trim(),
    accessPermissions: [],
    accessPermissionGrantedAt: {},
  };
}

function getNotificationSeenStorageKey() {
  const viewer = getNotificationViewer();
  const safeAccountId = String(viewer.accountId || "global").trim().toLowerCase();
  return `${notificationSeenStorageKey}:${viewer.role}:${safeAccountId}`;
}

function getNotificationAdminScope() {
  const adminSession = readNotificationSessionStorageJson("gms-admin-session");
  const adminScope = normalizeLogoStorageScope(
    adminSession?.adminId ??
      adminSession?.tenantId ??
      adminSession?.workspaceId ??
      adminSession?.id ??
      adminSession?.accountCode,
  );
  if (adminScope) {
    return adminScope;
  }

  const employeeSession = readNotificationSessionStorageJson("gms-employee-session");
  return normalizeLogoStorageScope(
    employeeSession?.adminId ??
      employeeSession?.ownerAdminId ??
      employeeSession?.tenantId ??
      employeeSession?.workspaceId ??
      employeeSession?.storeAdminId,
  );
}

function buildNotificationActivityUrl() {
  const viewer = getNotificationViewer();
  const adminId = getNotificationAdminScope();
  if (!adminId) {
    return "";
  }

  const params = new URLSearchParams({
    limit: String(notificationFetchLimit),
    viewerRole: viewer.role,
    viewerAccountId: viewer.accountId,
    adminId,
  });

  if (viewer.role === "employee" && viewer.accessPermissions.length) {
    params.set(
      "accessPermissions",
      viewer.accessPermissions.map((permission) => String(permission ?? "").trim()).filter(Boolean).join(","),
    );
    params.set("accessPermissionGrantedAt", JSON.stringify(viewer.accessPermissionGrantedAt || {}));
  }

  return `/api/activity?${params.toString()}`;
}

function syncThemeAcrossMenus(themeConfig) {
  const savedThemeConfig = window.WebTheme.saveThemeConfig(themeConfig);

  for (const otherMenu of settingsMenus) {
    applyMenuThemeConfigState(otherMenu, savedThemeConfig);
    updateSettingsMenu(
      otherMenu,
      savedThemeConfig.theme,
      getMenuDashboardBackgroundConfig(otherMenu),
      savedThemeConfig,
    );
  }

  return savedThemeConfig;
}

function syncDashboardBackgroundAcrossMenus(background) {
  const savedBackgroundConfig = window.WebTheme.saveDashboardBackgroundConfig(background);

  for (const otherMenu of settingsMenus) {
    applyMenuDashboardBackgroundConfigState(otherMenu, savedBackgroundConfig);
    updateDashboardBackgroundField(otherMenu, savedBackgroundConfig);
  }

  return savedBackgroundConfig;
}

function resolveScopedRecentSpectrumStorageKey(storageKey) {
  if (
    storageKey === recentThemeConfigStorageKey &&
    typeof window.WebTheme?.getThemeStorageKey === "function"
  ) {
    return `${storageKey}:${window.WebTheme.getThemeStorageKey()}`;
  }

  if (
    storageKey === recentDashboardBackgroundConfigStorageKey &&
    typeof window.WebTheme?.getDashboardBackgroundStorageKey === "function"
  ) {
    return `${storageKey}:${window.WebTheme.getDashboardBackgroundStorageKey()}`;
  }

  return storageKey;
}

function loadRecentSpectrumConfigs(storageKey, normalizeConfig) {
  const scopedStorageKey = resolveScopedRecentSpectrumStorageKey(storageKey);

  try {
    const stored = localStorage.getItem(scopedStorageKey);
    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .slice(0, maxRecentSpectrumConfigs)
      .map((item) => normalizeConfig(item));
  } catch (error) {
    return [];
  }
}

function saveRecentSpectrumConfigs(storageKey, configs) {
  const scopedStorageKey = resolveScopedRecentSpectrumStorageKey(storageKey);

  try {
    localStorage.setItem(
      scopedStorageKey,
      JSON.stringify(configs.slice(0, maxRecentSpectrumConfigs)),
    );
  } catch (error) {
    // Ignore storage errors and keep recent configs for this session only.
  }
}

function loadRecentThemeConfigs() {
  return loadRecentSpectrumConfigs(
    recentThemeConfigStorageKey,
    window.WebTheme.normalizeThemeConfig,
  );
}

function loadRecentDashboardBackgroundConfigs() {
  return loadRecentSpectrumConfigs(
    recentDashboardBackgroundConfigStorageKey,
    window.WebTheme.normalizeDashboardBackgroundConfig,
  );
}

function pushRecentThemeConfig(config) {
  const normalized = window.WebTheme.normalizeThemeConfig(config);
  const signature = JSON.stringify(normalized);
  const nextConfigs = [
    normalized,
    ...loadRecentThemeConfigs().filter((item) => JSON.stringify(item) !== signature),
  ].slice(0, maxRecentSpectrumConfigs);

  saveRecentSpectrumConfigs(recentThemeConfigStorageKey, nextConfigs);
  return nextConfigs;
}

function pushRecentDashboardBackgroundConfig(config) {
  const normalized = window.WebTheme.normalizeDashboardBackgroundConfig(config);
  const signature = JSON.stringify(normalized);
  const nextConfigs = [
    normalized,
    ...loadRecentDashboardBackgroundConfigs().filter((item) => JSON.stringify(item) !== signature),
  ].slice(0, maxRecentSpectrumConfigs);

  saveRecentSpectrumConfigs(recentDashboardBackgroundConfigStorageKey, nextConfigs);
  return nextConfigs;
}

function getRecentSpectrumSwatchFill(config, normalizeConfig, solidFallback) {
  const normalizedConfig = normalizeConfig(config);
  if (normalizedConfig.mode === "gradient") {
    return getGradientFill(
      normalizedConfig.gradientStops.start,
      normalizedConfig.gradientStops.end,
      {
        angle: `${normalizedConfig.gradientAngle}deg`,
        startStop: normalizedConfig.indicatorRange.start,
        middleTheme: normalizedConfig.gradientMiddleEnabled
          ? normalizedConfig.gradientStops.middle
          : null,
        middleStop: normalizedConfig.gradientMiddlePosition,
        middleAlpha: normalizedConfig.gradientOpacity.middle,
        endStop: normalizedConfig.indicatorRange.end,
        startAlpha: normalizedConfig.gradientOpacity.start,
        endAlpha: normalizedConfig.gradientOpacity.end,
      },
    );
  }

  return window.WebTheme.rgbToHex(normalizedConfig.theme, solidFallback);
}

function areThemesEqual(firstTheme, secondTheme) {
  const first = window.WebTheme.normalizeTheme(firstTheme);
  const second = window.WebTheme.normalizeTheme(secondTheme);

  return first.r === second.r && first.g === second.g && first.b === second.b;
}

function cloneGradientStops(input, fallbackTheme) {
  const normalized = window.WebTheme.normalizeGradientStops(input, fallbackTheme);
  return {
    start: { ...normalized.start },
    middle: { ...normalized.middle },
    end: { ...normalized.end },
  };
}

function cloneIndicatorRange(input) {
  const normalized = window.WebTheme.normalizeThemeConfig({
    indicatorRange: input,
  }).indicatorRange;
  return {
    start: normalized.start,
    end: normalized.end,
  };
}

function cloneGradientAngle(input) {
  return window.WebTheme.normalizeGradientAngle(input);
}

function cloneGradientMiddlePosition(input, indicatorRange = null) {
  return window.WebTheme.normalizeGradientMiddlePosition(input, indicatorRange);
}

function cloneGradientOpacity(input) {
  const normalized = window.WebTheme.normalizeGradientOpacity(input);
  return {
    start: normalized.start,
    middle: normalized.middle,
    end: normalized.end,
  };
}

function areThemeConfigsEqual(firstConfig, secondConfig) {
  const first = window.WebTheme.normalizeThemeConfig(firstConfig);
  const second = window.WebTheme.normalizeThemeConfig(secondConfig);

  return (
    first.mode === second.mode &&
    areThemesEqual(first.theme, second.theme) &&
    areThemesEqual(first.gradientStops.start, second.gradientStops.start) &&
    areThemesEqual(first.gradientStops.end, second.gradientStops.end) &&
    first.gradientPrimaryStop === second.gradientPrimaryStop &&
    first.gradientMiddleEnabled === second.gradientMiddleEnabled &&
    Math.abs(first.indicatorRange.start - second.indicatorRange.start) < 0.0001 &&
    Math.abs(first.indicatorRange.end - second.indicatorRange.end) < 0.0001 &&
    (!first.gradientMiddleEnabled ||
      Math.abs(first.gradientMiddlePosition - second.gradientMiddlePosition) < 0.0001) &&
    Math.abs(first.gradientAngle - second.gradientAngle) < 0.0001 &&
    Math.abs(first.gradientOpacity.start - second.gradientOpacity.start) < 0.0001 &&
    (!first.gradientMiddleEnabled ||
      Math.abs(first.gradientOpacity.middle - second.gradientOpacity.middle) < 0.0001) &&
    (!first.gradientMiddleEnabled ||
      areThemesEqual(first.gradientStops.middle, second.gradientStops.middle)) &&
    Math.abs(first.gradientOpacity.end - second.gradientOpacity.end) < 0.0001
  );
}

function applyMenuThemeConfigState(menu, config) {
  if (!(menu instanceof HTMLElement)) {
    return window.WebTheme.normalizeThemeConfig(config);
  }

  const normalizedConfig = window.WebTheme.normalizeThemeConfig(config);
  menu._draftTheme = normalizedConfig.theme;
  menu._themeMode = normalizedConfig.mode;
  menu._gradientStops = cloneGradientStops(normalizedConfig.gradientStops, normalizedConfig.theme);
  menu._indicatorRange = cloneIndicatorRange(normalizedConfig.indicatorRange);
  menu._gradientMiddleEnabled = Boolean(normalizedConfig.gradientMiddleEnabled);
  menu._gradientMiddlePosition = cloneGradientMiddlePosition(
    normalizedConfig.gradientMiddlePosition,
    normalizedConfig.indicatorRange,
  );
  menu._gradientAngle = cloneGradientAngle(normalizedConfig.gradientAngle);
  menu._gradientOpacity = cloneGradientOpacity(normalizedConfig.gradientOpacity);
  menu._gradientPrimaryStop = window.WebTheme.normalizeGradientPrimaryStop(
    normalizedConfig.gradientPrimaryStop,
    normalizedConfig.theme,
    normalizedConfig.gradientStops,
  );

  if (menu._spectrumPicker) {
    menu._spectrumPicker.mode = normalizedConfig.mode;
    menu._spectrumPicker.gradientStops = cloneGradientStops(
      normalizedConfig.gradientStops,
      normalizedConfig.theme,
    );
    menu._spectrumPicker.indicatorRange = cloneIndicatorRange(normalizedConfig.indicatorRange);
    menu._spectrumPicker.gradientMiddleEnabled = Boolean(normalizedConfig.gradientMiddleEnabled);
    menu._spectrumPicker.gradientMiddlePosition = cloneGradientMiddlePosition(
      normalizedConfig.gradientMiddlePosition,
      normalizedConfig.indicatorRange,
    );
    menu._spectrumPicker.gradientAngle = cloneGradientAngle(normalizedConfig.gradientAngle);
    menu._spectrumPicker.gradientOpacity = cloneGradientOpacity(normalizedConfig.gradientOpacity);
    menu._spectrumPicker.gradientPrimaryStop = menu._gradientPrimaryStop;
  }

  return normalizedConfig;
}

function getMenuThemeConfig(menu) {
  const savedConfig = window.WebTheme.loadThemeConfig();
  if (!(menu instanceof HTMLElement)) {
    return savedConfig;
  }

  const picker = menu._spectrumPicker;
  return window.WebTheme.normalizeThemeConfig({
    theme: getMenuDraftTheme(menu),
    mode: picker?.mode ?? menu._themeMode ?? savedConfig.mode,
    gradientStops: picker?.gradientStops ?? menu._gradientStops ?? savedConfig.gradientStops,
    indicatorRange: picker?.indicatorRange ?? menu._indicatorRange ?? savedConfig.indicatorRange,
    gradientMiddleEnabled:
      picker?.gradientMiddleEnabled ??
      menu._gradientMiddleEnabled ??
      savedConfig.gradientMiddleEnabled,
    gradientMiddlePosition:
      picker?.gradientMiddlePosition ??
      menu._gradientMiddlePosition ??
      savedConfig.gradientMiddlePosition,
    gradientAngle: picker?.gradientAngle ?? menu._gradientAngle ?? savedConfig.gradientAngle,
    gradientOpacity: picker?.gradientOpacity ?? menu._gradientOpacity ?? savedConfig.gradientOpacity,
    gradientPrimaryStop:
      picker?.gradientPrimaryStop ??
      menu._gradientPrimaryStop ??
      savedConfig.gradientPrimaryStop,
  });
}

function applyMenuDashboardBackgroundConfigState(menu, config) {
  if (!(menu instanceof HTMLElement)) {
    return window.WebTheme.normalizeDashboardBackgroundConfig(config);
  }

  const normalizedConfig = window.WebTheme.normalizeDashboardBackgroundConfig(config);
  menu._draftDashboardBackground = normalizedConfig.theme;
  menu._dashboardBackgroundMode = normalizedConfig.mode;
  menu._dashboardBackgroundGradientStops = cloneGradientStops(
    normalizedConfig.gradientStops,
    normalizedConfig.theme,
  );
  menu._dashboardBackgroundIndicatorRange = cloneIndicatorRange(normalizedConfig.indicatorRange);
  menu._dashboardBackgroundGradientMiddleEnabled = Boolean(normalizedConfig.gradientMiddleEnabled);
  menu._dashboardBackgroundGradientMiddlePosition = cloneGradientMiddlePosition(
    normalizedConfig.gradientMiddlePosition,
    normalizedConfig.indicatorRange,
  );
  menu._dashboardBackgroundGradientAngle = cloneGradientAngle(normalizedConfig.gradientAngle);
  menu._dashboardBackgroundGradientOpacity = cloneGradientOpacity(normalizedConfig.gradientOpacity);

  if (menu._dashboardBackgroundPicker) {
    menu._dashboardBackgroundPicker.mode = normalizedConfig.mode;
    menu._dashboardBackgroundPicker.gradientStops = cloneGradientStops(
      normalizedConfig.gradientStops,
      normalizedConfig.theme,
    );
    menu._dashboardBackgroundPicker.indicatorRange = cloneIndicatorRange(
      normalizedConfig.indicatorRange,
    );
    menu._dashboardBackgroundPicker.gradientMiddleEnabled = Boolean(
      normalizedConfig.gradientMiddleEnabled,
    );
    menu._dashboardBackgroundPicker.gradientMiddlePosition = cloneGradientMiddlePosition(
      normalizedConfig.gradientMiddlePosition,
      normalizedConfig.indicatorRange,
    );
    menu._dashboardBackgroundPicker.gradientAngle = cloneGradientAngle(
      normalizedConfig.gradientAngle,
    );
    menu._dashboardBackgroundPicker.gradientOpacity = cloneGradientOpacity(
      normalizedConfig.gradientOpacity,
    );
  }

  return normalizedConfig;
}

function updateDashboardBackgroundSaveState(menu) {
  if (!(menu instanceof HTMLElement)) {
    return;
  }

  const saveButton = menu.querySelector("[data-dashboard-background-save]");
  const resetButton = menu.querySelector("[data-dashboard-background-reset]");
  const draftConfig = getMenuDashboardBackgroundConfig(menu);
  const savedConfig = window.WebTheme.loadDashboardBackgroundConfig();
  const defaultConfig = window.WebTheme.normalizeDashboardBackgroundConfig(
    window.WebTheme.defaultDashboardBackground,
  );

  if (saveButton instanceof HTMLButtonElement) {
    saveButton.disabled = areThemeConfigsEqual(draftConfig, savedConfig);
  }

  if (resetButton instanceof HTMLButtonElement) {
    resetButton.disabled = areThemeConfigsEqual(draftConfig, defaultConfig);
  }
}

function applyMenuDraftDashboardBackgroundPreview(menu) {
  const draftConfig = getMenuDashboardBackgroundConfig(menu);
  const backgroundInput = menu?.querySelector?.("[data-dashboard-background-input]");

  if (backgroundInput instanceof HTMLInputElement) {
    backgroundInput.value = window.WebTheme.rgbToHex(
      draftConfig.theme,
      window.WebTheme.defaultDashboardBackground,
    );
  }

  window.WebTheme.applyDashboardBackground(draftConfig);
  updateDashboardBackgroundSaveState(menu);

  if (menu?._dashboardBackgroundPicker) {
    renderSpectrumPicker(menu._dashboardBackgroundPicker, draftConfig.theme);
  }

  return draftConfig;
}

function setMenuDraftDashboardBackgroundConfig(menu, config) {
  const normalizedConfig = applyMenuDashboardBackgroundConfigState(menu, config);
  window.WebTheme.applyDashboardBackground(normalizedConfig);
  updateDashboardBackgroundField(menu, normalizedConfig);
  return normalizedConfig;
}

function setMenuDraftDashboardBackground(menu, background) {
  const normalizedBackground = window.WebTheme.normalizeDashboardBackground(background);
  if (menu instanceof HTMLElement) {
    menu._draftDashboardBackground = normalizedBackground;
    applyMenuDraftDashboardBackgroundPreview(menu);
  }

  return normalizedBackground;
}

function getMenuDraftDashboardBackground(menu) {
  if (!(menu instanceof HTMLElement)) {
    return window.WebTheme.loadDashboardBackgroundConfig().theme;
  }

  if (!menu._draftDashboardBackground) {
    menu._draftDashboardBackground = window.WebTheme.loadDashboardBackgroundConfig().theme;
  }

  return window.WebTheme.normalizeDashboardBackground(menu._draftDashboardBackground);
}

function getMenuDashboardBackgroundConfig(menu) {
  const savedConfig = window.WebTheme.loadDashboardBackgroundConfig();
  if (!(menu instanceof HTMLElement)) {
    return savedConfig;
  }

  const picker = menu._dashboardBackgroundPicker;
  return window.WebTheme.normalizeDashboardBackgroundConfig({
    theme: getMenuDraftDashboardBackground(menu),
    mode: picker?.mode ?? menu._dashboardBackgroundMode ?? savedConfig.mode,
    gradientStops:
      picker?.gradientStops ?? menu._dashboardBackgroundGradientStops ?? savedConfig.gradientStops,
    indicatorRange:
      picker?.indicatorRange ??
      menu._dashboardBackgroundIndicatorRange ??
      savedConfig.indicatorRange,
    gradientMiddleEnabled:
      picker?.gradientMiddleEnabled ??
      menu._dashboardBackgroundGradientMiddleEnabled ??
      savedConfig.gradientMiddleEnabled,
    gradientMiddlePosition:
      picker?.gradientMiddlePosition ??
      menu._dashboardBackgroundGradientMiddlePosition ??
      savedConfig.gradientMiddlePosition,
    gradientAngle:
      picker?.gradientAngle ?? menu._dashboardBackgroundGradientAngle ?? savedConfig.gradientAngle,
    gradientOpacity:
      picker?.gradientOpacity ??
      menu._dashboardBackgroundGradientOpacity ??
      savedConfig.gradientOpacity,
  });
}

function getMenuDraftTheme(menu) {
  if (!(menu instanceof HTMLElement)) {
    return window.WebTheme.loadTheme();
  }

  if (!menu._draftTheme) {
    menu._draftTheme = window.WebTheme.loadTheme();
  }

  return window.WebTheme.normalizeTheme(menu._draftTheme);
}

function restoreSavedThemePreview() {
  const workspaceColor = window.WebTheme?.getWorkspaceColor?.();
  if (workspaceColor && window.WebTheme?.applyWorkspaceColor) {
    return window.WebTheme.applyWorkspaceColor(workspaceColor, {
      cache: false,
      dispatch: false,
      source: "settings-close",
    });
  }
  return window.WebTheme.applyTheme(window.WebTheme.loadThemeConfig());
}

function restoreSavedDashboardBackgroundPreview() {
  return window.WebTheme.applyDashboardBackground(window.WebTheme.loadDashboardBackgroundConfig());
}

function isSellerAdminNotificationEntry(entry) {
  return Boolean(entry?.root?.classList?.contains("seller-admin-notification-menu"));
}

function closeNotificationMenu(entry) {
  if (!entry?.toggle || !entry?.dropdown) {
    return;
  }

  entry.toggle.setAttribute("aria-expanded", "false");
  entry.dropdown.hidden = true;
  entry.dropdown.classList.remove("dashboard-notification-dropdown--closing");
  entry.hasExpandedNotifications = false;
  entry.collapsedNotificationListHeight = 0;
  syncNotificationDrawerScrollLock();
}

function finalizeNotificationMenuClose(entry) {
  if (!entry?.toggle || !entry?.dropdown) {
    return;
  }

  if (entry.closeTimer) {
    window.clearTimeout(entry.closeTimer);
    entry.closeTimer = 0;
  }

  entry.toggle.setAttribute("aria-expanded", "false");
  entry.dropdown.hidden = true;
  entry.dropdown.classList.remove("dashboard-notification-dropdown--closing");
  entry.hasExpandedNotifications = false;
  entry.collapsedNotificationListHeight = 0;
  syncNotificationDrawerScrollLock();
}

function closeNotificationMenuWithAnimation(entry) {
  finalizeNotificationMenuClose(entry);
}

function closeAllNotificationMenus(exceptEntry = null) {
  for (const entry of notificationEntries) {
    if (entry !== exceptEntry) {
      closeNotificationMenuWithAnimation(entry);
    }
  }
}

function isNotificationDrawerEntry(entry) {
  return false;
}

function isNotificationMenuOpen(entry) {
  return (
    entry?.toggle instanceof HTMLElement &&
    entry?.dropdown instanceof HTMLElement &&
    !entry.dropdown.hidden &&
    entry.toggle.getAttribute("aria-expanded") === "true"
  );
}

function syncNotificationDrawerScrollLock() {
  const hasOpenSellerNotification = notificationEntries.some(
    (entry) => isNotificationMenuOpen(entry) && isSellerAdminNotificationEntry(entry),
  );

  document.documentElement.classList.toggle(
    "seller-admin-notification-open",
    hasOpenSellerNotification,
  );
  document.body.classList.toggle(
    "seller-admin-notification-open",
    hasOpenSellerNotification,
  );
  document.documentElement.classList.remove("notification-drawer-open");
  document.body.classList.remove("notification-drawer-open");
}

function createNotificationCloseButtonElement() {
  const button = document.createElement("button");
  button.type = "button";
  button.className =
    "product-gallery-modal__close validation-modal__close dashboard-notification-dropdown__close";
  button.setAttribute("aria-label", "Close notification");
  button.setAttribute("title", "Close notification");
  button.setAttribute("data-notification-close", "");
  button.innerHTML = `<i class="fa-solid fa-xmark" aria-hidden="true"></i>`;
  return button;
}

function createNotificationSignature(activities, total) {
  const firstActivity = Array.isArray(activities) && activities.length ? activities[0] : null;
  if (!firstActivity) {
    return "";
  }

  return [
    total,
    firstActivity.id ?? "",
    firstActivity.createdAt ?? "",
    firstActivity.title ?? "",
    firstActivity.description ?? "",
  ].join("::");
}

function getNotificationActivityCreatedTime(activity) {
  const timestamp = new Date(activity?.createdAt ?? "").getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function getNotificationActivityReadKey(activity) {
  const id = String(activity?.id ?? "").trim();
  if (id) {
    return id;
  }

  return [
    activity?.createdAt ?? "",
    activity?.title ?? "",
    activity?.description ?? "",
    activity?.targetUrl ?? "",
  ]
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .join("::");
}

function getReadNotificationActivityIdSet() {
  const readActivityIds = Array.isArray(seenNotificationState.readActivityIds)
    ? seenNotificationState.readActivityIds
    : [];
  return new Set(readActivityIds.map((id) => String(id ?? "").trim()).filter(Boolean));
}

function hasExplicitNotificationReadState() {
  return (
    seenNotificationState.readMode === "activity" ||
    (Array.isArray(seenNotificationState.readActivityIds) && seenNotificationState.readActivityIds.length > 0)  
  );
}

function isNotificationActivityLegacySeen(activity) {
  if (hasExplicitNotificationReadState()) {
    return false;
  }

  if (
    seenNotificationState.signature &&
    latestNotificationSignature &&
    seenNotificationState.signature === latestNotificationSignature
  ) {
    return true;
  }

  const seenActivityId = String(seenNotificationState.latestActivityId ?? "").trim();
  const activityId = String(activity?.id ?? "").trim();
  if (seenActivityId && activityId && activityId === seenActivityId) {
    return true;
  }

  const seenTime = getNotificationActivityCreatedTime({
    createdAt: seenNotificationState.latestActivityCreatedAt,
  });
  const activityTime = getNotificationActivityCreatedTime(activity);
  if (seenTime !== null && activityTime !== null) {
    return activityTime <= seenTime;
  }

  return false;
}

function isNotificationActivityRead(activity) {
  const readKey = getNotificationActivityReadKey(activity);
  if (readKey && getReadNotificationActivityIdSet().has(readKey)) {
    return true;
  }

  return isNotificationActivityLegacySeen(activity);
}

function getUnreadNotificationActivities(activities = currentNotifications) {
  const visibleActivities = Array.isArray(activities) ? activities : [];
  return visibleActivities.filter((activity) => !isNotificationActivityRead(activity));
}

function getNotificationUnreadCount(activities = currentNotifications) {
  return getUnreadNotificationActivities(activities).length;
}

function getNotificationBadgeSeenState() {
  return {
    signature: String(seenNotificationState.badgeSignature ?? "").trim(),
    latestActivityId: String(seenNotificationState.badgeLatestActivityId ?? "").trim(),
    latestActivityCreatedAt: String(
      seenNotificationState.badgeLatestActivityCreatedAt ?? "",
    ).trim(),
  };
}

function getNotificationLegacyBadgeSeenState() {
  return {
    signature: String(seenNotificationState.signature ?? "").trim(),
    latestActivityId: String(seenNotificationState.latestActivityId ?? "").trim(),
    latestActivityCreatedAt: String(seenNotificationState.latestActivityCreatedAt ?? "").trim(),
  };
}

function countNotificationActivitiesAfterSeenState(activities, seenState) {
  const visibleActivities = Array.isArray(activities) ? activities : [];
  if (!visibleActivities.length) {
    return 0;
  }

  const seenSignature = String(seenState?.signature ?? "").trim();
  if (seenSignature && latestNotificationSignature && seenSignature === latestNotificationSignature) {
    return 0;
  }

  const seenActivityId = String(seenState?.latestActivityId ?? "").trim();
  if (seenActivityId) {
    const seenIndex = visibleActivities.findIndex((activity) => {
      const activityId = String(activity?.id ?? "").trim();
      const activityKey = getNotificationActivityReadKey(activity);
      return (
        (activityId && activityId === seenActivityId) ||
        (activityKey && activityKey === seenActivityId)
      );
    });
    if (seenIndex >= 0) {
      return seenIndex;
    }
  }

  const seenTime = getNotificationActivityCreatedTime({
    createdAt: seenState?.latestActivityCreatedAt,
  });
  if (seenTime !== null) {
    return visibleActivities.filter((activity) => {
      const activityTime = getNotificationActivityCreatedTime(activity);
      return activityTime !== null && activityTime > seenTime;
    }).length;
  }

  return null;
}

function getNotificationBadgeUnreadCount(activities = currentNotifications) {
  const visibleActivities = Array.isArray(activities) ? activities : [];
  if (!visibleActivities.length) {
    return 0;
  }

  const badgeSeenCount = countNotificationActivitiesAfterSeenState(
    visibleActivities,
    getNotificationBadgeSeenState(),
  );
  if (badgeSeenCount !== null) {
    return badgeSeenCount;
  }

  const legacySeenCount = countNotificationActivitiesAfterSeenState(
    visibleActivities,
    getNotificationLegacyBadgeSeenState(),
  );
  return legacySeenCount !== null ? legacySeenCount : getNotificationUnreadCount(visibleActivities);
}

function syncNotificationBadges() {
  const unreadCount = getNotificationBadgeUnreadCount();

  for (const entry of notificationEntries) {
    if (entry.badge) {
      entry.badge.hidden = unreadCount <= 0;
      entry.badge.textContent = unreadCount > 99 ? "99+" : String(unreadCount);
    }

    if (entry.countPill) {
      entry.countPill.textContent = String(currentNotificationTotal);
    }
  }
}

function hasUnreadNotificationActivity() {
  return getNotificationUnreadCount() > 0;
}

function markNotificationBadgeSeen() {
  const latestActivity = currentNotifications[0] || null;
  const latestActivityId = getNotificationActivityReadKey(latestActivity) || "";

  seenNotificationState = normalizeSeenNotificationState({
    ...seenNotificationState,
    badgeSignature: latestNotificationSignature,
    badgeLatestActivityId: latestActivityId,
    badgeLatestActivityCreatedAt: latestActivity?.createdAt ?? "",
    badgeSeenAt: new Date().toISOString(),
  });
  saveSeenNotificationState(seenNotificationState);
  syncNotificationBadges();
}

function markNotificationActivityRead(activity) {
  const readKey = getNotificationActivityReadKey(activity);
  if (!readKey) {
    return;
  }

  const readActivityIds = getReadNotificationActivityIdSet();
  if (!hasExplicitNotificationReadState()) {
    for (const currentActivity of currentNotifications) {
      if (!isNotificationActivityLegacySeen(currentActivity)) {
        continue;
      }
      const legacyReadKey = getNotificationActivityReadKey(currentActivity);
      if (legacyReadKey) {
        readActivityIds.add(legacyReadKey);
      }
    }
  }
  readActivityIds.add(readKey);

  const nextReadActivityIds = Array.from(readActivityIds)
    .filter(Boolean)
    .slice(-notificationReadActivityLimit);
  seenNotificationState = normalizeSeenNotificationState({
    ...seenNotificationState,
    signature: latestNotificationSignature || seenNotificationState.signature,
    readActivityIds: nextReadActivityIds,
    readMode: "activity",
    seenAt: new Date().toISOString(),
  });
  seenNotificationSignature = seenNotificationState.signature;
  saveSeenNotificationState(seenNotificationState);
  syncNotificationBadges();
  renderNotificationActivities(currentNotifications);
}

function markNotificationsSeen() {
  const latestActivity = currentNotifications[0] || null;
  seenNotificationState = normalizeSeenNotificationState({
    signature: latestNotificationSignature,
    latestActivityId: latestActivity?.id ?? "",
    latestActivityCreatedAt: latestActivity?.createdAt ?? "",
    badgeSignature: latestNotificationSignature,
    badgeLatestActivityId: getNotificationActivityReadKey(latestActivity) || "",
    badgeLatestActivityCreatedAt: latestActivity?.createdAt ?? "",
    readActivityIds: currentNotifications
      .map((activity) => getNotificationActivityReadKey(activity))
      .filter(Boolean)
      .slice(-notificationReadActivityLimit),
    readMode: "activity",
    seenAt: new Date().toISOString(),
    badgeSeenAt: new Date().toISOString(),
  });
  seenNotificationSignature = seenNotificationState.signature;
  saveSeenNotificationState(seenNotificationState);
  syncNotificationBadges();
  renderNotificationActivities(currentNotifications);
}

function formatRelativeTime(value) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) {
    return "Just now";
  }

  const diffMs = Date.now() - timestamp;
  const diffSeconds = Math.max(0, Math.round(diffMs / 1000));

  if (diffSeconds < 10) {
    return "Just now";
  }

  if (diffSeconds < 60) {
    return `${diffSeconds} seconds ago`;
  }

  const diffMinutes = Math.round(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}

function getNotificationSessionProfileImageUrl(session) {
  return [
    session?.profileImageUrl,
    session?.avatarUrl,
    session?.photoUrl,
    session?.profilePhotoUrl,
    session?.employeePhotoUrl,
    session?.pictureUrl,
    session?.imageUrl,
    session?.logoUrl,
  ]
    .map((value) => String(value ?? "").trim())
    .find(Boolean) || "";
}

function normalizeLogoStorageScope(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getActiveLogoStorageScope() {
  const adminSession = readNotificationSessionStorageJson("gms-admin-session");
  const adminScope = normalizeLogoStorageScope(
    adminSession?.adminId ??
      adminSession?.id ??
      adminSession?.accountCode ??
      adminSession?.email,
  );
  if (adminScope) {
    return `admin:${adminScope}`;
  }

  const employeeSession = readNotificationSessionStorageJson("gms-employee-session");
  const employeeScope = normalizeLogoStorageScope(
    employeeSession?.adminId ??
      employeeSession?.ownerAdminId ??
      employeeSession?.tenantId ??
      employeeSession?.workspaceId,
  );
  if (employeeScope) {
    return `admin:${employeeScope}`;
  }

  return "";
}

function getScopedLoginLogoStorageKey(baseKey) {
  const scope = getActiveLogoStorageScope();
  return scope ? `${baseKey}:${scope}` : baseKey;
}

function getScopedEmployeeSetupStorageKey(baseKey) {
  const scope = getActiveLogoStorageScope();
  return scope ? `${baseKey}:${scope}` : baseKey;
}

function getCurrentWorkspaceProfileImageUrl() {
  const image = document.querySelector(
    ".product-panel-toolbar__avatar-image:not([hidden])",
  );
  return image instanceof HTMLImageElement ? String(image.currentSrc || image.src || "").trim() : "";
}

function normalizeEmployeeWorkspacePermissions(value) {
  const retiredPermissions = new Set(["payment-partners", "delivery-partners"]);
  return Array.isArray(value)
    ? value
        .map((permission) => String(permission ?? "").trim().toLowerCase())
        .filter((permission) => permission && !retiredPermissions.has(permission))
    : [];
}

function getEquivalentEmployeeWorkspacePermissions(permission) {
  const normalizedPermission = String(permission ?? "").trim().toLowerCase();
  if (normalizedPermission === "admin-inventory" || normalizedPermission === "employee-inventory") {
    return ["admin-inventory", "employee-inventory"];
  }

  return normalizedPermission ? [normalizedPermission] : [];
}

function hasEquivalentEmployeeWorkspacePermission(accessPermissions, permission) {
  const allowedPermissions = new Set();
  for (const accessPermission of normalizeEmployeeWorkspacePermissions(accessPermissions)) {
    for (const equivalentPermission of getEquivalentEmployeeWorkspacePermissions(accessPermission)) {
      allowedPermissions.add(equivalentPermission);
    }
  }

  return getEquivalentEmployeeWorkspacePermissions(permission).some((equivalentPermission) =>
    allowedPermissions.has(equivalentPermission),
  );
}

function isNotificationInventoryPath(pathname = "") {
  return /^\/(?:stock|main_inventory_embed|employee_stock|main)\.html$/i.test(String(pathname || "").trim());
}

function resolveNotificationInventoryTargetForViewer(targetUrl) {
  if (!(targetUrl instanceof URL) || !isNotificationInventoryPath(targetUrl.pathname)) {
    return targetUrl;
  }

  const viewer = getNotificationViewer();
  if (viewer.role === "employee") {
    targetUrl.pathname = "/main.html";
    targetUrl.hash = "inventory";
    targetUrl.searchParams.set("role", "admin");
  }

  return targetUrl;
}

function getEmployeeWorkspacePermissionForPath(pathname = window.location.pathname) {
  const normalizedPath = String(pathname || "").trim().toLowerCase();
  const permissionByPath = {
    "/main.html": "admin-dashboard",
    "/admin_dashboard.html": "admin-dashboard",
    "/employee_dashboard.html": "employee-dashboard",
    "/packing_dashboard.html": "packing-dashboard",
    "/live_chat.html": "live-chat",
    "/concern.html": "concern",
    "/employee_order_insight.html": "employee-order",
    "/employee_stock.html": "employee-inventory",
    "/insight.html": "insight",
    "/listing_insight.html": "product-insight",
    "/product_panel.html": "products",
    "/edit_products.html": "products",
    "/main.html": "admin-dashboard",
    "/main_inventory_embed.html": "admin-inventory",
    "/stock.html": "admin-inventory",
    "/employee_data.html": "employee-data",
    "/register.html": "register",
  };

  return permissionByPath[normalizedPath] || "";
}

function hasEmployeeWorkspaceAccessForCurrentPage() {
  if (hasNotificationAdminSession()) {
    return false;
  }

  const employeeSession = readNotificationSessionStorageJson("gms-employee-session");
  if (!employeeSession || typeof employeeSession !== "object") {
    return false;
  }

  const accessPermissions = normalizeEmployeeWorkspacePermissions(employeeSession.accessPermissions);
  const hasConfiguredAccess =
    employeeSession.accessPermissionsConfigured || accessPermissions.length > 0;
  const pagePermission = getEmployeeWorkspacePermissionForPath();
  return Boolean(
    hasConfiguredAccess &&
      pagePermission &&
      hasEquivalentEmployeeWorkspacePermission(accessPermissions, pagePermission),
  );
}

function isEmployeeWorkspacePage() {
  const searchParams = new URLSearchParams(window.location.search);
  const explicitRole = String(searchParams.get("role") ?? searchParams.get("workspace") ?? "").trim().toLowerCase();
  if (explicitRole === "employee") {
    return true;
  }

  if (hasNotificationAdminSession()) {
    return false;
  }

  if (hasEmployeeWorkspaceAccessForCurrentPage()) {
    return true;
  }

  return Boolean(
    document.querySelector("script[data-employee-access-guard]") ||
      document.querySelector(
        [
          ".dashboard-nav[aria-label='Employee navigation']",
          ".dashboard-sidebar__logo[href='/employee_dashboard.html']",
          ".product-panel-toolbar__profile[data-employee-workspace-profile='true']",
        ].join(", "),
      ),
  );
}

function normalizeNotificationActor(activity) {
  const actor = activity?.actor && typeof activity.actor === "object" ? activity.actor : {};
  const rawRole = String(actor.role ?? "").trim().toLowerCase();
  const role = ["super_admin", "super-admin", "superadmin", "root"].includes(rawRole)
    ? "super_admin"
    : ["user", "buyer", "customer", "app_user", "app-user"].includes(rawRole)
      ? "user"
      : rawRole === "employee" || rawRole === "admin"
        ? rawRole
        : "";
  const displayName = String(
    actor.displayName ??
      actor.name ??
      [actor.firstName, actor.lastName].filter(Boolean).join(" ") ??
      "",
  ).replace(/\s+/g, " ").trim();
  const accountId = String(
    actor.accountId ??
      actor.employeeId ??
      actor.email ??
      actor.id ??
      "",
  ).trim();

  return {
    role,
    accountId,
    displayName: role === "super_admin" ? "Super Admin" : displayName || (
      role === "super_admin"
        ? "Super Admin"
        : role === "employee"
          ? "Employee"
          : role === "user"
            ? "App User"
            : role === "admin"
              ? "Admin"
              : ""
    ),
    profileImageUrl: getNotificationSessionProfileImageUrl(actor),
  };
}

function getNotificationActorImageUrl(actor) {
  if (actor.profileImageUrl) {
    return actor.profileImageUrl;
  }

  if (actor.role === "admin") {
    return getNotificationSessionProfileImageUrl(
      readNotificationSessionStorageJson("gms-admin-session"),
    ) || loadStoredLogo().dataUrl || "";
  }

  const employeeSession = readNotificationSessionStorageJson("gms-employee-session");
  const sessionAccountId = String(
    employeeSession?.employeeId ??
      employeeSession?.accountCode ??
      employeeSession?.id ??
      "",
  ).trim().toLowerCase();
  const actorAccountId = String(actor.accountId ?? "").trim().toLowerCase();

  if (
    isEmployeeWorkspacePage() &&
    actorAccountId &&
    sessionAccountId &&
    actorAccountId === sessionAccountId
  ) {
    return getNotificationSessionProfileImageUrl(employeeSession) || getCurrentWorkspaceProfileImageUrl();
  }

  return "";
}

function getNotificationProfileFallbackIconMarkup(role = "") {
  if (role === "super_admin") {
    return `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
        <path d="M12 3.2 19 6v5.2c0 4.5-2.8 7.7-7 9.6-4.2-1.9-7-5.1-7-9.6V6l7-2.8Z" stroke-linejoin="round"></path>
        <path d="m9.2 12 1.8 1.8 3.9-4" stroke-linecap="round" stroke-linejoin="round"></path>
      </svg>`;
  }

  if (role === "user") {
    return `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
        <circle cx="12" cy="8.2" r="3.4"></circle>
        <path d="M5.8 19.2a6.2 6.2 0 0 1 12.4 0" stroke-linecap="round"></path>
        <path d="M18.6 5.7h2.4M19.8 4.5v2.4" stroke-linecap="round"></path>
      </svg>`;
  }

  return `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <circle cx="12" cy="8.2" r="3.4"></circle>
      <path d="M5.8 19.2a6.2 6.2 0 0 1 12.4 0" stroke-linecap="round"></path>
    </svg>`;
}

function getNotificationActivityBadgeConfig(activity) {
  const action = String(activity?.action ?? "").trim().toLowerCase();
  const type = String(activity?.type ?? "").trim().toLowerCase();
  const title = String(activity?.title ?? "").trim().toLowerCase();
  const description = String(activity?.description ?? "").trim().toLowerCase();
  const stockAdjustmentMatch = description.match(/\bwas\s+(add|deduct)\s+\d+(?:\.\d+)?\s+stock\b/i);

  if (
    type === "product-revision"
    || action === "revision-requested"
    || action === "product-revision"
    || title.includes("revision")
  ) {
    return {
      label: "Request revision",
      modifier: "updated",
      icon: "fa-pen",
      iconMarkup: isSellerAdminSettingsIconPage() ? settingsMenuSquarePenIconMarkup : "",
    };
  }

  if (type === "product-approved" || action === "approved") {
    return {
      label: "Approved",
      modifier: "created",
      icon: "fa-check",
    };
  }

  if (type === "product-rejected" || action === "rejected") {
    return {
      label: "Rejected",
      modifier: "deleted",
      icon: "fa-ban",
    };
  }

  if (type === "listing-restriction" || type === "seller-restriction" || type === "restriction") {
    return {
      label: "Restricted",
      modifier: "updated",
      icon: "fa-lock",
    };
  }

  if (type === "seller-ban" || action === "ban") {
    return {
      label: "Banned",
      modifier: "deleted",
      icon: "fa-ban",
    };
  }

  if (type === "seller-account-deletion" || action === "deletion-scheduled") {
    return {
      label: "Deleting",
      modifier: "deleted",
      icon: "fa-trash",
    };
  }

  if (type === "seller-account-deletion-canceled" || action === "deletion-canceled") {
    return {
      label: "Kept",
      modifier: "created",
      icon: "fa-check",
    };
  }

  if (stockAdjustmentMatch) {
    const stockAction = String(stockAdjustmentMatch[1] ?? "").toLowerCase();
    return {
      label: stockAction === "deduct" ? "Deducted stock" : "Added stock",
      modifier: stockAction === "deduct" ? "updated" : "created",
      icon: stockAction === "deduct" ? "fa-minus" : "fa-plus",
    };
  }

  if (action === "created" || /\b(add|added|created)\b/.test(`${title} ${description}`)) {
    return {
      label: "Added",
      modifier: "created",
      icon: "fa-plus",
    };
  }

  if (action === "deleted" || /\b(delete|deleted|removed)\b/.test(`${title} ${description}`)) {
    return {
      label: "Deleted",
      modifier: "deleted",
      icon: "fa-trash",
    };
  }

  if (action === "updated" || /\b(update|updated|edit|edited)\b/.test(`${title} ${description}`)) {
    return {
      label: "Edited",
      modifier: "updated",
      icon: "fa-pen",
      iconMarkup: isSellerAdminSettingsIconPage() ? settingsMenuSquarePenIconMarkup : "",
    };
  }

  return null;
}

function createNotificationActivityBadge(activity) {
  const config = getNotificationActivityBadgeConfig(activity);
  if (!config) {
    return null;
  }

  const badge = document.createElement("span");
  badge.className = `activity-item__action-badge activity-item__action-badge--${config.modifier}`;
  badge.setAttribute("title", config.label);
  badge.innerHTML = config.iconMarkup
    || `<i class="fa-solid ${config.icon}" aria-hidden="true"></i>`;
  return badge;
}

function createNotificationAvatar(activity) {
  const actor = normalizeNotificationActor(activity);
  const avatar = document.createElement("span");
  avatar.className = `activity-item__avatar activity-item__avatar--${actor.role || "unknown"}`;
  avatar.setAttribute("aria-hidden", "true");

  const fallbackIcon = document.createElement("span");
  fallbackIcon.className = "activity-item__avatar-icon";
  fallbackIcon.innerHTML = getNotificationProfileFallbackIconMarkup(actor.role);

  const imageUrl = getNotificationActorImageUrl(actor);
  if (imageUrl) {
    const image = document.createElement("img");
    image.alt = "";
    image.loading = "lazy";
    image.src = imageUrl;
    image.addEventListener("error", () => {
      image.remove();
      fallbackIcon.hidden = false;
      avatar.classList.remove("has-image");
    });
    fallbackIcon.hidden = true;
    avatar.classList.add("has-image");
    avatar.append(image);
  }

  avatar.append(fallbackIcon);
  const actionBadge = createNotificationActivityBadge(activity);
  if (actionBadge) {
    avatar.append(actionBadge);
  }
  return avatar;
}

function getNotificationTextAfterActor(text, actorLabel) {
  const normalizedText = text.toLowerCase();
  const normalizedActorLabel = actorLabel.toLowerCase();
  if (normalizedText.startsWith(normalizedActorLabel)) {
    return text.slice(actorLabel.length);
  }

  const actionMatch = text.match(/^\s*.+?\s+((?:was\s+)?(?:update|add|delete|remove|added|deleted|removed)\b.*)$/i);
  if (actionMatch) {
    return ` ${actionMatch[1]}`;
  }

  return ` ${text}`;
}

function appendNotificationTextPart(parent, text, className = "") {
  if (!text) {
    return;
  }

  if (!className) {
    parent.append(document.createTextNode(text));
    return;
  }

  const highlight = document.createElement("span");
  highlight.className = className;
  highlight.textContent = text;
  parent.append(highlight);
}

function appendNotificationPatternParts(parent, text, regex, highlightedGroupIndexes) {
  const match = text.match(regex);
  if (!match) {
    return false;
  }

  const highlightedGroups = new Set(highlightedGroupIndexes);
  for (let index = 1; index < match.length; index += 1) {
    appendNotificationTextPart(
      parent,
      match[index],
      highlightedGroups.has(index) ? notificationChangeHighlightClass : "",
    );
  }

  return true;
}

function appendNotificationHighlightedText(parent, text) {
  const highlightPatterns = [
    {
      regex: /^(\s*was\s+(?:add|deduct)\s+)(\d+(?:\.\d+)?)(\s+stock of\s+)(.+?)(\s+total of\s+)(\d+(?:\.\d+)?)(\.?)$/i,
      groups: [2, 6],
    },
    {
      regex: /^(\s*was\s+(?:add|deduct)\s+)(\d+(?:\.\d+)?)(\s+stock\b.*)$/i,
      groups: [2],
    },
    {
      regex: /^(\s*was update the product name\s+)(.+?)(\s+to\s+)(.+?)(\.?)$/i,
      groups: [2, 4],
    },
    {
      regex: /^(\s*was update the variant name\s+)(.+?)(\s+to\s+)(.+?)(\s+of\s+)(.+?)(\.?)$/i,
      groups: [2, 4, 6],
    },
    {
      regex: /^(\s*update the\s+)(.+?)(\s+variant price of\s+)(.+?)(\s+to\s+)(.+?)(\.?)$/i,
      groups: [2, 4, 6],
    },
    {
      regex: /^(\s*was update the .+? of variant\s+)(.+?)(\s+of\s+)(.+?)(\s+to\s+)(.+?)(\.?)$/i,
      groups: [2, 4, 6],
    },
    {
      regex: /^(\s*was update the .+? of variant\s+)(.+?)(\s+of\s+)(.+?)(\.?)$/i,
      groups: [2, 4],
    },
    {
      regex: /^(\s*was update the category of\s+)(.+?)(\s+to\s+)(.+?)(\.?)$/i,
      groups: [2, 4],
    },
    {
      regex: /^(\s*was update the .+? of\s+)(.+?)(\s+to\s+)(.+?)(\.?)$/i,
      groups: [2, 4],
    },
    {
      regex: /^(\s*was update the .+? of\s+)(.+?)(\.?)$/i,
      groups: [2],
    },
    {
      regex: /^(\s*update the\s+)(.+?)(\s+(?:sale\s+)?price\s+to\s+)(.+?)(\.?)$/i,
      groups: [2, 4],
    },
    {
      regex: /^(\s*was add product\s+)(.+?)(\.?)$/i,
      groups: [2],
    },
    {
      regex: /^(\s*was update the product\s+)(.+?)(\.?)$/i,
      groups: [2],
    },
    {
      regex: /^(\s*added the variant\s+)(.+?)(\s+of\s+)(.+?)(\.?)$/i,
      groups: [2, 4],
    },
    {
      regex: /^(\s*removed the variant\s+)(.+?)(\s+of\s+)(.+?)(\.?)$/i,
      groups: [2, 4],
    },
    {
      regex: /^(\s*deleted\s+)(.+?)(\s+from the\s+)(.+?)(\s+category\.?)$/i,
      groups: [2, 4],
    },
    {
      regex: /^(\s*)(.+?)(\s+details were updated in the\s+)(.+?)(\s+category\.?)$/i,
      groups: [2, 4],
    },
    {
      regex: /^(\s*)(.+?)(\s+was\s+(?:updated|created|deleted)\s+in the\s+)(.+?)(\s+category\.?)$/i,
      groups: [2, 4],
    },
  ];

  for (const pattern of highlightPatterns) {
    if (appendNotificationPatternParts(parent, text, pattern.regex, pattern.groups)) {
      return;
    }
  }

  appendNotificationTextPart(parent, text);
}

function createNotificationDescription(activity) {
  const description = document.createElement("p");
  const text = String(
    activity?.description || "A product action was recorded in the admin panel.",
  ).trim();
  const actor = normalizeNotificationActor(activity);
  const viewer = getNotificationViewer();
  const shouldHighlightActor =
    (viewer.role === "employee" && actor.role === "admin") ||
    (viewer.role === "admin" && ["employee", "super_admin", "user"].includes(actor.role));

  const actorLabel = actor.displayName || (
    actor.role === "super_admin"
      ? "Super Admin"
      : actor.role === "user"
        ? "App User"
        : actor.role === "employee"
          ? "Employee"
          : actor.role === "admin"
            ? "Admin"
            : ""
  );
  const normalizedText = text.toLowerCase();
  const normalizedActorLabel = actorLabel.toLowerCase();

  if (actorLabel && normalizedText.startsWith(normalizedActorLabel)) {
    appendNotificationTextPart(
      description,
      text.slice(0, actorLabel.length),
      shouldHighlightActor ? "activity-item__actor-highlight" : "",
    );
    appendNotificationHighlightedText(description, text.slice(actorLabel.length));
    return description;
  }

  if (!shouldHighlightActor) {
    appendNotificationHighlightedText(description, text);
    return description;
  }

  const actorHighlight = document.createElement("span");
  actorHighlight.className = "activity-item__actor-highlight";
  actorHighlight.textContent = actorLabel || "Admin";
  const remainingText = getNotificationTextAfterActor(text, actorLabel);

  description.append(actorHighlight);
  appendNotificationHighlightedText(description, remainingText);
  return description;
}

function getNotificationActivityTargetUrl(activity) {
  const action = String(activity?.action ?? "").trim().toLowerCase();
  const type = String(activity?.type ?? "").trim().toLowerCase();
  const productId = String(activity?.productId ?? "").trim();
  const changeCount = Number(activity?.changeCount);
  const isSingleProductUpdate =
    type === "product" && action === "updated" && changeCount === 1 && Boolean(productId);
  const resolvedFocusTarget = isSingleProductUpdate
    ? getNotificationProductUpdateFocusTarget(activity)
    : "";
  const isVisibilityProductUpdate = isSingleProductUpdate && resolvedFocusTarget === "visibility";
  const explicitTargetUrl = String(
    activity?.targetUrl ?? activity?.actionUrl ?? activity?.href ?? "",
  ).trim();
  if (explicitTargetUrl) {
    try {
      const targetUrl = new URL(explicitTargetUrl, window.location.origin);
      if (targetUrl.origin === window.location.origin) {
        const targetFocus = String(targetUrl.searchParams.get("focus") ?? "").trim().toLowerCase();
        if (
          type === "product"
          && productId
          && targetUrl.pathname === "/edit_products.html"
          && (isVisibilityProductUpdate || targetFocus === "visibility")
        ) {
          const params = new URLSearchParams({
            product: productId,
            notificationFocus: "1",
          });
          return `/product_panel.html?${params.toString()}`;
        }

        if (isSingleProductUpdate && targetUrl.pathname === "/edit_products.html") {
          targetUrl.searchParams.set("edit", productId);
          targetUrl.searchParams.set("focus", resolvedFocusTarget || "details");
          targetUrl.searchParams.set("notificationFocus", "1");
          addNotificationProductVariantTargetParams(targetUrl.searchParams, activity);
        }
        const resolvedTargetUrl = resolveNotificationInventoryTargetForViewer(targetUrl);
        return `${resolvedTargetUrl.pathname}${resolvedTargetUrl.search}${resolvedTargetUrl.hash}`;
      }
    } catch (_) {
      return "";
    }
  }

  if (!isSingleProductUpdate) {
    if (
      (type === "product-revision" || action === "revision-requested" || action === "product-revision")
      && productId
    ) {
      const params = new URLSearchParams({
        product: productId,
        notificationFocus: "1",
      });
      return `/product_panel.html?${params.toString()}`;
    }
    if (
      ["product-approved", "product-rejected", "product-unrejected", "listing-restriction"].includes(type)
      && productId
    ) {
      const params = new URLSearchParams({
        product: productId,
        notificationFocus: "1",
      });
      return `/product_panel.html?${params.toString()}`;
    }
    if (
      ["seller-ban", "seller-unban", "seller-deactivate", "seller-unrestrict", "seller-restriction", "restriction", "warning", "notice", "seller-notification", "seller-account-deletion", "seller-account-deletion-canceled"].includes(type)
    ) {
      if (type === "seller-account-deletion" || type === "seller-account-deletion-canceled") {
        return "/main.html#account-settings";
      }
      return "/main.html#dashboard";
    }
    if (type === "product" && productId && (action === "created" || action === "updated")) {
      const params = new URLSearchParams({
        product: productId,
        notificationFocus: "1",
      });
      return `/product_panel.html?${params.toString()}`;
    }
    return "";
  }

  if (isVisibilityProductUpdate) {
    const params = new URLSearchParams({
      product: productId,
      notificationFocus: "1",
    });
    return `/product_panel.html?${params.toString()}`;
  }

  const params = new URLSearchParams({
    edit: productId,
    focus: resolvedFocusTarget || "details",
    notificationFocus: "1",
  });
  addNotificationProductVariantTargetParams(params, activity);
  return `/edit_products.html?${params.toString()}`;
}

function addNotificationProductVariantTargetParams(params, activity) {
  if (!(params instanceof URLSearchParams)) {
    return;
  }

  const changeType = String(activity?.changeType ?? "").trim().toLowerCase();
  if (!changeType.startsWith("variant-")) {
    return;
  }

  const variantId = String(activity?.changeVariantId ?? activity?.variantId ?? "").trim();
  const variantName = String(activity?.changeVariantName ?? activity?.variantName ?? "").trim();
  if (variantId) {
    params.set("variantId", variantId);
  }
  if (variantName) {
    params.set("variant", variantName);
  }
}

function getNotificationProductUpdateFocusTarget(activity) {
  const changeType = String(activity?.changeType ?? "").trim().toLowerCase();
  const changeLabel = String(activity?.changeLabel ?? "").trim().toLowerCase();

  if (changeType === "name") {
    return "name";
  }
  if (changeType === "category") {
    return "category";
  }
  if (changeType === "price") {
    return changeLabel.includes("sale") ? "sales-price" : "original-price";
  }
  if (changeType === "field") {
    if (changeLabel === "description") {
      return "description";
    }
    if (changeLabel === "stock") {
      return "stock";
    }
    if (changeLabel === "sold") {
      return "sold";
    }
    if (changeLabel === "rating") {
      return "rating";
    }
    if (changeLabel === "barcode") {
      return "barcode";
    }
    if (changeLabel === "visibility") {
      return "visibility";
    }
  }
  if (changeType.startsWith("variant-")) {
    return changeType;
  }
  if (changeType === "image-search" || changeType === "visual-search") {
    return "image-search";
  }
  if (changeType === "photo" || changeType === "display") {
    return "main-image";
  }
  if (changeType === "video") {
    return "video";
  }
  if (changeType === "3d-model") {
    return "3d-model";
  }

  const changeTarget = String(activity?.changeTarget ?? "").trim();
  return changeTarget && changeTarget !== "details" ? changeTarget : "details";
}

async function activateNotificationTarget(targetUrl) {
  if (!targetUrl) {
    return;
  }

  let resolvedTargetUrl = String(targetUrl);
  try {
    const url = new URL(resolvedTargetUrl, window.location.origin);
    if (
      url.origin === window.location.origin &&
      isNotificationInventoryPath(url.pathname) &&
      getNotificationViewer().role === "employee"
    ) {
      await refreshNotificationEmployeeSession();
      const inventoryTargetUrl = resolveNotificationInventoryTargetForViewer(url);
      resolvedTargetUrl = `${inventoryTargetUrl.pathname}${inventoryTargetUrl.search}${inventoryTargetUrl.hash}`;
    }
    if (
      url.origin === window.location.origin &&
      /\/main\.html$/i.test(url.pathname) &&
      url.hash.replace(/^#/, "") === "account-settings" &&
      typeof window.gmsOpenAdminAccountSettings === "function"
    ) {
      window.gmsOpenAdminAccountSettings({ tab: "security" });
      return;
    }
  } catch (error) {
    // Keep the original target if URL parsing fails.
  }

  window.location.href = resolvedTargetUrl;
}

function createNotificationItem(activity, isNewNotification = false) {
  const wrapper = document.createElement("article");
  wrapper.className = "activity-item activity-item--notification";
  wrapper.classList.toggle("is-new-notification", isNewNotification);
  const targetUrl = getNotificationActivityTargetUrl(activity);
  if (targetUrl) {
    wrapper.classList.add("activity-item--clickable");
    wrapper.tabIndex = 0;
    wrapper.setAttribute("role", "link");
    wrapper.setAttribute("aria-label", "Open notification");
    wrapper.addEventListener("click", (event) => {
      if (event.defaultPrevented || event.target?.closest?.("a, button")) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      markNotificationActivityRead(activity);
      activateNotificationTarget(targetUrl);
    });
    wrapper.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }
      event.preventDefault();
      markNotificationActivityRead(activity);
      activateNotificationTarget(targetUrl);
    });
  } else {
    wrapper.addEventListener("click", (event) => {
      if (event.defaultPrevented || event.target?.closest?.("a, button")) {
        return;
      }
      event.stopPropagation();
      markNotificationActivityRead(activity);
    });
  }

  const description = createNotificationDescription(activity);

  const timestamp = document.createElement("span");
  timestamp.className = "activity-item__timestamp";
  timestamp.textContent = formatRelativeTime(activity.createdAt);

  const body = document.createElement("div");
  body.className = "activity-item__body";
  body.append(description, timestamp);

  const unreadDot = document.createElement("span");
  unreadDot.className = "dashboard-notification-unread-dot";
  unreadDot.hidden = !isNewNotification;
  unreadDot.setAttribute("aria-hidden", "true");

  wrapper.append(createNotificationAvatar(activity), body, unreadDot);
  return wrapper;
}

function getNotificationListRenderedHeight(list) {
  if (!(list instanceof HTMLElement)) {
    return 0;
  }

  return Math.ceil(Math.max(
    list.getBoundingClientRect().height,
    list.scrollHeight,
    0,
  ));
}

function getNotificationListGap(list) {
  if (!(list instanceof HTMLElement)) {
    return 0;
  }

  const listStyles = window.getComputedStyle(list);
  return Number.parseFloat(listStyles.rowGap || listStyles.gap || "0") || 0;
}

function getNotificationExpansionStepHeight(entry) {
  const firstCard = entry?.list?.querySelector(".activity-item--notification");
  if (!(firstCard instanceof HTMLElement)) {
    return 0;
  }

  return Math.ceil(firstCard.getBoundingClientRect().height + getNotificationListGap(entry.list));
}

function getNotificationListViewportLimit(entry) {
  if (!(entry?.list instanceof HTMLElement)) {
    return Math.max(360, Math.floor(window.innerHeight * 0.72));
  }

  const listTop = entry.list.getBoundingClientRect().top;
  const availableHeight = window.innerHeight - listTop - 24;
  return Math.max(320, Math.floor(availableHeight));
}

function positionSellerNotificationPanel(entry) {
  if (
    !isSellerAdminNotificationEntry(entry) ||
    !(entry.toggle instanceof HTMLElement) ||
    !(entry.dropdown instanceof HTMLElement)
  ) {
    return;
  }

  const buttonRect = entry.toggle.getBoundingClientRect();
  const preferredTop = Math.max(12, Math.ceil(buttonRect.bottom + 8));
  const panelTop = window.innerHeight - preferredTop >= 320 ? preferredTop : 12;
  const panelRight = Math.max(12, Math.ceil(window.innerWidth - buttonRect.right));

  entry.dropdown.style.setProperty(
    "--seller-admin-notification-panel-top",
    `${panelTop}px`,
  );
  entry.dropdown.style.setProperty(
    "--seller-admin-notification-panel-right",
    `${panelRight}px`,
  );

  const availableHeight = Math.max(240, Math.floor(window.innerHeight - panelTop - 20));
  entry.dropdown.style.setProperty(
    "--seller-admin-notification-expanded-height",
    `${availableHeight}px`,
  );
}

function repositionOpenNotificationPanels() {
  for (const entry of notificationEntries) {
    if (isNotificationMenuOpen(entry)) {
      positionSellerNotificationPanel(entry);
    }
  }
}

function syncNotificationListVisibleHeight(entry, visibleCardCount = notificationPreviewLimit) {
  if (!(entry?.list instanceof HTMLElement)) {
    return;
  }

  if (!entry.list.classList.contains("dashboard-notification-list--scrollable")) {
    entry.list.style.removeProperty("max-height");
    return;
  }

  const cards = Array.from(entry.list.querySelectorAll(".activity-item--notification"))
    .filter((card) => card instanceof HTMLElement)
    .slice(0, visibleCardCount);
  if (!cards.length) {
    entry.list.style.removeProperty("max-height");
    return;
  }

  const gap = getNotificationListGap(entry.list);
  const measuredHeight = cards.reduce(
    (total, card) => total + card.getBoundingClientRect().height,
    0,
  ) + (Math.max(0, cards.length - 1) * gap);
  const collapsedHeight = Number(entry.collapsedNotificationListHeight ?? 0);
  const expandedHeight = entry.hasExpandedNotifications && collapsedHeight > 0
    ? collapsedHeight + getNotificationExpansionStepHeight(entry)
    : 0;
  const targetHeight = Math.max(measuredHeight, expandedHeight);
  const viewportLimit = getNotificationListViewportLimit(entry);
  entry.list.style.maxHeight = `${Math.min(Math.ceil(targetHeight), viewportLimit)}px`;
}

function getNotificationEntryFilter(entry) {
  return entry?.notificationFilter === "unread" ? "unread" : "all";
}

function getFilteredNotificationActivities(entry, activities) {
  const visibleActivities = Array.isArray(activities) ? activities : [];
  return getNotificationEntryFilter(entry) === "unread"
    ? getUnreadNotificationActivities(visibleActivities)
    : visibleActivities;
}

function syncNotificationFilterControls(entry) {
  const filterButtons = Array.isArray(entry?.filterButtons) ? entry.filterButtons : [];
  const activeFilter = getNotificationEntryFilter(entry);
  for (const button of filterButtons) {
    if (!(button instanceof HTMLButtonElement)) {
      continue;
    }
    const isActive = button.dataset.notificationFilter === activeFilter;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", isActive ? "true" : "false");
    button.tabIndex = isActive ? 0 : -1;
  }
}

function renderNotificationActivities(activities, message = "No notification yet.") {
  for (const entry of notificationEntries) {
    if (!entry.list) {
      continue;
    }

    syncNotificationFilterControls(entry);
    const filteredActivities = getFilteredNotificationActivities(entry, activities);
    const emptyMessage = getNotificationEntryFilter(entry) === "unread"
      ? "No unread notification."
      : message;
    const usesSellerPanel = isSellerAdminNotificationEntry(entry);
    const previewLimit = usesSellerPanel
      ? sellerNotificationPreviewLimit
      : notificationPreviewLimit;
    const canExpand = filteredActivities.length > previewLimit;
    if (!canExpand) {
      entry.hasExpandedNotifications = false;
    }
    const isExpanded = canExpand && entry.hasExpandedNotifications === true;
    const visibleActivities = isExpanded
      ? filteredActivities.slice()
      : filteredActivities.slice(0, previewLimit);
    const shouldUseListScrollbar =
      isExpanded && filteredActivities.length > previewLimit;
    entry.dropdown?.classList.toggle("is-notification-expanded", isExpanded);
    entry.dropdown?.classList.toggle("is-notification-scrollable", shouldUseListScrollbar);
    entry.list.classList.toggle("is-notification-expanded", isExpanded);
    entry.list.classList.toggle("is-notification-scrollable", shouldUseListScrollbar);
    entry.list.classList.toggle(
      "dashboard-notification-list--scrollable",
      shouldUseListScrollbar,
    );
    if (entry.footer instanceof HTMLElement) {
      entry.footer.hidden = !canExpand;
    }
    if (entry.showAllButton instanceof HTMLButtonElement) {
      entry.showAllButton.textContent = isExpanded
        ? "Show fewer notifications"
        : "Show all notifications";
      entry.showAllButton.setAttribute("aria-expanded", String(isExpanded));
    }
    entry.list.replaceChildren();

    if (!filteredActivities.length) {
      const emptyState = document.createElement("div");
      emptyState.className = "empty-state";
      emptyState.textContent = emptyMessage;
      entry.list.appendChild(emptyState);
      if (usesSellerPanel) {
        entry.list.style.removeProperty("max-height");
      } else {
        syncNotificationListVisibleHeight(entry);
      }
      if (isNotificationMenuOpen(entry)) {
        positionSellerNotificationPanel(entry);
      }
      continue;
    }

    visibleActivities.forEach((activity) => {
      entry.list.appendChild(createNotificationItem(activity, !isNotificationActivityRead(activity)));
    });

    const hasMoreNotifications =
      !isExpanded &&
      filteredActivities.length > visibleActivities.length;

    if (hasMoreNotifications && !(entry.showAllButton instanceof HTMLButtonElement)) {
      const showMoreButton = document.createElement("button");
      showMoreButton.type = "button";
      showMoreButton.className = "dashboard-notification-show-more";
      showMoreButton.textContent = "Show more notification";
      showMoreButton.addEventListener("click", (event) => {
        event.stopPropagation();
        entry.collapsedNotificationListHeight = getNotificationListRenderedHeight(entry.list);
        entry.hasExpandedNotifications = true;
        renderNotificationActivities(currentNotifications);
      });
      entry.list.appendChild(showMoreButton);
      entry.collapsedNotificationListHeight = getNotificationListRenderedHeight(entry.list);
    } else if (!isExpanded) {
      entry.collapsedNotificationListHeight = 0;
    }

    if (usesSellerPanel) {
      entry.list.style.removeProperty("max-height");
    } else {
      syncNotificationListVisibleHeight(entry, isExpanded ? visibleActivities.length : previewLimit);
    }
    if (isNotificationMenuOpen(entry)) {
      positionSellerNotificationPanel(entry);
    }
  }
}

function registerSettingsMenu(menu) {
  if (!(menu instanceof HTMLElement) || settingsMenus.includes(menu)) {
    return;
  }

  settingsMenus.push(menu);
}

function registerSettingsMenusFromDom(root = document) {
  root.querySelectorAll("[data-settings-menu]").forEach(registerSettingsMenu);
}

function normalizeCompanyAcronym(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
}

function normalizeCompanyAcronymList(values, options = {}) {
  const normalizedValues = Array.isArray(values) ? values : [];
  const acronyms = [];

  for (const value of normalizedValues) {
    const acronym = normalizeCompanyAcronym(value);
    if (acronym.length < 2 || acronyms.includes(acronym)) {
      continue;
    }

    acronyms.push(acronym);
  }

  return acronyms.length || options.allowEmpty ? acronyms : [...defaultCompanyAcronyms];
}

function normalizeEmployeePosition(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);
}

function isDefaultEmployeePosition(value) {
  const normalizedValue = normalizeEmployeePosition(value).toLowerCase();
  return defaultEmployeePositions.some(
    (position) => position.toLowerCase() === normalizedValue,
  );
}

function normalizeEmployeePositionList(values) {
  const normalizedValues = [
    ...defaultEmployeePositions,
    ...(Array.isArray(values) ? values : []),
  ];
  const positions = [];
  const seenPositions = new Set();

  for (const value of normalizedValues) {
    const position = normalizeEmployeePosition(value);
    const key = position.toLowerCase();
    if (position.length < 2 || seenPositions.has(key)) {
      continue;
    }

    seenPositions.add(key);
    positions.push(position);
  }

  return positions;
}

function loadSettingsList(storageKey, defaults, normalizer) {
  try {
    const scopedStorageKey = getScopedEmployeeSetupStorageKey(storageKey);
    const parsed = JSON.parse(window.localStorage.getItem(scopedStorageKey) || "null");
    return normalizer(Array.isArray(parsed) ? parsed : defaults);
  } catch (error) {
    console.warn("Unable to load employee setup settings.", error);
    return normalizer(defaults);
  }
}

function saveSettingsList(storageKey, values, normalizer) {
  const normalizedValues = normalizer(values);

  try {
    window.localStorage.setItem(getScopedEmployeeSetupStorageKey(storageKey), JSON.stringify(normalizedValues));
  } catch (error) {
    console.warn("Unable to save employee setup settings.", error);
  }

  return normalizedValues;
}

function loadCompanyAcronyms() {
  return loadSettingsList(
    companyAcronymStorageKey,
    defaultCompanyAcronyms,
    (values) => normalizeCompanyAcronymList(values, { allowEmpty: true }),
  );
}

function saveCompanyAcronyms(values) {
  const acronyms = saveSettingsList(
    companyAcronymStorageKey,
    values,
    (items) => normalizeCompanyAcronymList(items, { allowEmpty: true }),
  );

  window.dispatchEvent(new CustomEvent("gms:company-acronyms-updated", {
    detail: { acronyms },
  }));

  return acronyms;
}

function loadEmployeePositions() {
  return loadSettingsList(
    employeePositionStorageKey,
    defaultEmployeePositions,
    normalizeEmployeePositionList,
  );
}

function saveEmployeePositions(values) {
  const positions = saveSettingsList(
    employeePositionStorageKey,
    values,
    normalizeEmployeePositionList,
  );

  window.dispatchEvent(new CustomEvent("gms:employee-positions-updated", {
    detail: { positions },
  }));

  return positions;
}

window.GMSCompanyAcronyms = {
  storageKey: companyAcronymStorageKey,
  defaults: [...defaultCompanyAcronyms],
  normalize: normalizeCompanyAcronym,
  load: loadCompanyAcronyms,
  save: saveCompanyAcronyms,
};

window.GMSEmployeePositions = {
  storageKey: employeePositionStorageKey,
  defaults: [...defaultEmployeePositions],
  normalize: normalizeEmployeePosition,
  load: loadEmployeePositions,
  save: saveEmployeePositions,
};

function createEmployeeSetupSettingsElement() {
  const wrapper = document.createElement("section");
  wrapper.className = "settings-employee-setup";
  wrapper.setAttribute("data-employee-settings-panel", "");
  wrapper.innerHTML = `
    <div class="settings-employee-setup__top-panel">
      <div class="settings-employee-setup__switcher" role="group" aria-label="Create role type">
        <button
          type="button"
          class="settings-employee-setup__view-button is-active"
          data-employee-setup-view-button
          data-employee-setup-view="company-acronym"
          aria-pressed="true"
        >
          Company Acronym
        </button>
        <button
          type="button"
          class="settings-employee-setup__view-button"
          data-employee-setup-view-button
          data-employee-setup-view="employee-position"
          aria-pressed="false"
        >
          Position
        </button>
      </div>

      <div class="settings-employee-setup__header-panel is-active" data-employee-setup-form="company-acronym">
        <div class="settings-employee-setup__heading">
          <h3>Company Acronym</h3>
        </div>
        <div class="settings-employee-setup__row">
          <input
            type="text"
            maxlength="8"
            placeholder="Enter company acronym"
            autocomplete="off"
            spellcheck="false"
            data-company-acronym-input
          />
          <button type="button" class="dashboard-link-button settings-employee-setup__add" data-company-acronym-add>
            Add
          </button>
        </div>
      </div>

      <div class="settings-employee-setup__header-panel" data-employee-setup-form="employee-position" hidden>
        <div class="settings-employee-setup__row">
          <input
            type="text"
            maxlength="40"
            placeholder="Enter position"
            autocomplete="off"
            spellcheck="false"
            data-employee-position-input
          />
          <button type="button" class="dashboard-link-button settings-employee-setup__add" data-employee-position-add>
            Add
          </button>
        </div>
      </div>
    </div>

    <div class="settings-employee-setup__list-panel is-active" data-employee-setup-section="company-acronym">
      <div class="settings-employee-setup__chips" data-company-acronym-list></div>
      <p class="settings-employee-setup__status" data-company-acronym-status></p>
    </div>

    <div class="settings-employee-setup__list-panel" data-employee-setup-section="employee-position" hidden>
      <div class="settings-employee-setup__chips" data-employee-position-list></div>
      <p class="settings-employee-setup__status" data-employee-position-status></p>
    </div>
  `;
  return wrapper;
}

function getEmployeeSetupActiveInput(panel) {
  if (!(panel instanceof HTMLElement)) {
    return null;
  }

  const activeForm = panel.querySelector("[data-employee-setup-form]:not([hidden])");
  const input = activeForm?.querySelector?.("input");
  return input instanceof HTMLInputElement ? input : null;
}

function setEmployeeSetupActiveView(panel, view = "company-acronym", options = {}) {
  if (!(panel instanceof HTMLElement)) {
    return;
  }

  const activeView = view === "employee-position" ? "employee-position" : "company-acronym";
  panel.dataset.employeeSetupActiveView = activeView;

  panel.querySelectorAll("[data-employee-setup-view-button]").forEach((button) => {
    if (!(button instanceof HTMLButtonElement)) {
      return;
    }

    const isActive = button.dataset.employeeSetupView === activeView;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });

  panel.querySelectorAll("[data-employee-setup-form]").forEach((form) => {
    if (!(form instanceof HTMLElement)) {
      return;
    }

    const isActive = form.dataset.employeeSetupForm === activeView;
    form.hidden = !isActive;
    form.classList.toggle("is-active", isActive);
  });

  panel.querySelectorAll("[data-employee-setup-section]").forEach((section) => {
    if (!(section instanceof HTMLElement)) {
      return;
    }

    const isActive = section.dataset.employeeSetupSection === activeView;
    section.hidden = !isActive;
    section.classList.toggle("is-active", isActive);
  });

  if (options.focus) {
    window.setTimeout(() => getEmployeeSetupActiveInput(panel)?.focus(), 0);
  }
}

function setEmployeeSetupStatus(panel, kind, message) {
  const status = panel.querySelector(`[data-${kind}-status]`);
  if (status instanceof HTMLElement) {
    status.textContent = message;
  }
}

function createEmployeeSetupIcon(name) {
  if (name === "edit") {
    if (isSellerAdminSettingsIconPage()) {
      return settingsMenuSquarePenIconMarkup;
    }

    return `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true" focusable="false">
        <path d="m4 20 4.2-1 9-9a2.1 2.1 0 0 0-3-3l-9 9L4 20Z" stroke-linejoin="round" />
        <path d="m12.8 6.2 3 3" stroke-linecap="round" />
      </svg>
    `;
  }

  if (name === "delete") {
    return `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true" focusable="false">
        <path d="M5.5 7.5h13" stroke-linecap="round" />
        <path d="M9.5 4.5h5" stroke-linecap="round" />
        <path d="m8.5 7.5.6 10a1 1 0 0 0 1 .9h3.8a1 1 0 0 0 1-.9l.6-10" stroke-linejoin="round" />
        <path d="M10 10.5v4.5" stroke-linecap="round" />
        <path d="M14 10.5v4.5" stroke-linecap="round" />
      </svg>
    `;
  }

  if (name === "save") {
    return `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
        <path d="m5 12 4.2 4.2L19 6.5"></path>
      </svg>
    `;
  }

  return `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
      <path d="M7 7 17 17"></path>
      <path d="M17 7 7 17"></path>
    </svg>
  `;
}

function getEmployeeSetupEditState(panel) {
  if (!(panel instanceof HTMLElement)) {
    return { kind: "", value: "" };
  }

  return {
    kind: panel.dataset.employeeSetupEditKind || "",
    value: panel.dataset.employeeSetupEditValue || "",
  };
}

function setEmployeeSetupEditState(panel, kind = "", value = "") {
  if (!(panel instanceof HTMLElement)) {
    return;
  }

  if (!kind || !value) {
    delete panel.dataset.employeeSetupEditKind;
    delete panel.dataset.employeeSetupEditValue;
    return;
  }

  panel.dataset.employeeSetupEditKind = kind;
  panel.dataset.employeeSetupEditValue = value;
}

function createEmployeeSetupItem(panel, value, options = {}) {
  const kind = options.kind || "";
  const item = document.createElement("div");
  item.className = "category-chip settings-employee-setup__item";
  item.dataset.employeeSetupKind = kind;
  item.dataset.employeeSetupValue = value;
  if (options.locked) {
    item.classList.add("is-locked");
  }

  const editState = getEmployeeSetupEditState(panel);
  const isEditing = editState.kind === kind && editState.value === value;
  if (isEditing) {
    item.classList.add("is-editing");

    const editInput = document.createElement("input");
    editInput.type = "text";
    editInput.className = "category-chip__input settings-employee-setup__item-input";
    editInput.value = value;
    editInput.autocomplete = "off";
    editInput.spellcheck = false;
    editInput.placeholder = kind === "company-acronym" ? "Enter company acronym" : "Enter position";
    editInput.maxLength = kind === "company-acronym" ? 8 : 40;
    editInput.dataset.employeeSetupEditInput = "";
    editInput.setAttribute("aria-label", `Edit ${value}`);

    const actionGroup = document.createElement("div");
    actionGroup.className = "category-chip__actions category-chip__actions--editing";

    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.className = "category-chip__save";
    saveButton.dataset.employeeSetupSave = "";
    saveButton.dataset.employeeSetupKind = kind;
    saveButton.dataset.employeeSetupValue = value;
    saveButton.setAttribute("aria-label", `Save ${value}`);
    saveButton.title = `Save ${value}`;
    saveButton.innerHTML = createEmployeeSetupIcon("save");

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className = "ghost-button category-chip__cancel";
    cancelButton.dataset.employeeSetupCancel = "";
    cancelButton.setAttribute("aria-label", `Cancel editing ${value}`);
    cancelButton.title = `Cancel editing ${value}`;
    cancelButton.innerHTML = createEmployeeSetupIcon("cancel");

    actionGroup.append(saveButton, cancelButton);
    item.append(editInput, actionGroup);
    window.setTimeout(() => {
      editInput.focus();
      editInput.select();
    }, 0);
    return item;
  }

  const main = document.createElement("div");
  main.className = "category-chip__main";

  const label = document.createElement("span");
  label.className = "category-chip__name";
  label.textContent = value;
  main.appendChild(label);

  const actionGroup = document.createElement("div");
  actionGroup.className = "category-chip__actions";

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "ghost-button icon-action-button category-chip__edit";
  editButton.disabled = Boolean(options.editDisabled);
  editButton.dataset.employeeSetupEdit = "";
  editButton.dataset.employeeSetupKind = kind;
  editButton.dataset.employeeSetupValue = value;
  editButton.setAttribute("aria-label", options.editDisabled ? `${value} is a default position` : `Edit ${value}`);
  editButton.title = options.editDisabled ? "Default position" : `Edit ${value}`;
  editButton.innerHTML = createEmployeeSetupIcon("edit");

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className =
    "ghost-button icon-action-button icon-action-button--danger category-chip__delete";
  deleteButton.disabled = Boolean(options.disabled);
  deleteButton.dataset.employeeSetupDelete = "";
  deleteButton.dataset.employeeSetupKind = kind;
  deleteButton.dataset.employeeSetupValue = value;
  deleteButton.setAttribute("aria-label", options.disabled ? `${value} is a default position` : `Delete ${value}`);
  deleteButton.title = options.disabled ? "Default position" : `Delete ${value}`;
  deleteButton.innerHTML = createEmployeeSetupIcon("delete");

  actionGroup.append(editButton, deleteButton);
  item.append(main, actionGroup);
  return item;
}

function renderEmployeeSetupPanel(panel) {
  const acronymList = panel.querySelector("[data-company-acronym-list]");
  const positionList = panel.querySelector("[data-employee-position-list]");
  const acronyms = loadCompanyAcronyms();
  const positions = loadEmployeePositions();

  if (acronymList instanceof HTMLElement) {
    acronymList.replaceChildren(
      ...acronyms.map((acronym) => createEmployeeSetupItem(panel, acronym, {
        kind: "company-acronym",
      })),
    );
  }

  if (positionList instanceof HTMLElement) {
    positionList.replaceChildren(
      ...positions.map((position) => createEmployeeSetupItem(panel, position, {
        kind: "employee-position",
        disabled: isDefaultEmployeePosition(position),
        editDisabled: isDefaultEmployeePosition(position),
        locked: isDefaultEmployeePosition(position),
      })),
    );
  }
}

function refreshEmployeeSetupPanels() {
  document
    .querySelectorAll("[data-employee-settings-panel]")
    .forEach((panel) => renderEmployeeSetupPanel(panel));
}

function bindEmployeeSetupPanel(panel) {
  if (!(panel instanceof HTMLElement) || panel.dataset.employeeSetupBound === "true") {
    return;
  }

  panel.dataset.employeeSetupBound = "true";
  const acronymInput = panel.querySelector("[data-company-acronym-input]");
  const acronymAddButton = panel.querySelector("[data-company-acronym-add]");
  const acronymList = panel.querySelector("[data-company-acronym-list]");
  const positionInput = panel.querySelector("[data-employee-position-input]");
  const positionAddButton = panel.querySelector("[data-employee-position-add]");
  const positionList = panel.querySelector("[data-employee-position-list]");

  panel.addEventListener("click", (event) => {
    const viewButton = event.target?.closest?.("[data-employee-setup-view-button]");
    if (!(viewButton instanceof HTMLButtonElement)) {
      return;
    }

    setEmployeeSetupEditState(panel);
    setEmployeeSetupActiveView(panel, viewButton.dataset.employeeSetupView, { focus: true });
    refreshEmployeeSetupPanels();
  });

  const addAcronym = () => {
    if (!(acronymInput instanceof HTMLInputElement)) {
      return;
    }

    const acronym = normalizeCompanyAcronym(acronymInput.value);
    const acronyms = loadCompanyAcronyms();
    if (acronym.length < 2) {
      setEmployeeSetupStatus(panel, "company-acronym", "Company acronym needs at least 2 letters or numbers.");
      acronymInput.focus();
      return;
    }

    if (acronyms.includes(acronym)) {
      setEmployeeSetupStatus(panel, "company-acronym", `${acronym} already exists.`);
      acronymInput.focus();
      return;
    }

    saveCompanyAcronyms([...acronyms, acronym]);
    acronymInput.value = "";
    setEmployeeSetupStatus(panel, "company-acronym", "");
    refreshEmployeeSetupPanels();
    acronymInput.focus();
    window.GMSAdminSuccessModal?.show?.({
      title: "Success",
      copy: `${acronym} added successfully.`,
    });
  };

  const addPosition = () => {
    if (!(positionInput instanceof HTMLInputElement)) {
      return;
    }

    const position = normalizeEmployeePosition(positionInput.value);
    const positions = loadEmployeePositions();
    const positionExists = positions.some((item) => item.toLowerCase() === position.toLowerCase());
    if (position.length < 2) {
      setEmployeeSetupStatus(panel, "employee-position", "Position needs at least 2 characters.");
      positionInput.focus();
      return;
    }

    if (positionExists) {
      setEmployeeSetupStatus(panel, "employee-position", `${position} already exists.`);
      positionInput.focus();
      return;
    }

    saveEmployeePositions([...positions, position]);
    positionInput.value = "";
    setEmployeeSetupStatus(panel, "employee-position", "");
    refreshEmployeeSetupPanels();
    positionInput.focus();
    window.GMSAdminSuccessModal?.show?.({
      title: "Success",
      copy: `${position} added successfully.`,
    });
  };

  const showEmployeeSetupEditSuccess = (copy) => {
    window.GMSAdminSuccessModal?.show?.({
      title: "Saved",
      copy,
    });
  };

  const updateAcronym = (previousValue, nextValue, focusTarget = null) => {
    const previousAcronym = normalizeCompanyAcronym(previousValue);
    const nextAcronym = normalizeCompanyAcronym(nextValue);
    const acronyms = loadCompanyAcronyms();

    if (nextAcronym.length < 2) {
      setEmployeeSetupStatus(panel, "company-acronym", "Company acronym needs at least 2 letters or numbers.");
      focusTarget?.focus?.();
      return;
    }

    const acronymExists = acronyms.some(
      (item) => item !== previousAcronym && item === nextAcronym,
    );
    if (acronymExists) {
      setEmployeeSetupStatus(panel, "company-acronym", `${nextAcronym} already exists.`);
      focusTarget?.focus?.();
      return;
    }

    saveCompanyAcronyms(
      acronyms.map((item) => (item === previousAcronym ? nextAcronym : item)),
    );
    setEmployeeSetupEditState(panel);
    setEmployeeSetupStatus(panel, "company-acronym", `${previousAcronym} updated to ${nextAcronym}.`);
    refreshEmployeeSetupPanels();
    showEmployeeSetupEditSuccess(`${previousAcronym} updated to ${nextAcronym}.`);
  };

  const updatePosition = (previousValue, nextValue, focusTarget = null) => {
    const previousPosition = normalizeEmployeePosition(previousValue);
    const nextPosition = normalizeEmployeePosition(nextValue);
    const previousKey = previousPosition.toLowerCase();
    const nextKey = nextPosition.toLowerCase();
    const positions = loadEmployeePositions();

    if (isDefaultEmployeePosition(previousPosition)) {
      setEmployeeSetupStatus(panel, "employee-position", `${previousPosition} is a default position.`);
      return;
    }

    if (nextPosition.length < 2) {
      setEmployeeSetupStatus(panel, "employee-position", "Position needs at least 2 characters.");
      focusTarget?.focus?.();
      return;
    }

    const positionExists = positions.some(
      (item) => item.toLowerCase() !== previousKey && item.toLowerCase() === nextKey,
    );
    if (positionExists) {
      setEmployeeSetupStatus(panel, "employee-position", `${nextPosition} already exists.`);
      focusTarget?.focus?.();
      return;
    }

    saveEmployeePositions(
      positions.map((item) => (item.toLowerCase() === previousKey ? nextPosition : item)),
    );
    setEmployeeSetupEditState(panel);
    setEmployeeSetupStatus(panel, "employee-position", `${previousPosition} updated to ${nextPosition}.`);
    refreshEmployeeSetupPanels();
    showEmployeeSetupEditSuccess(`${previousPosition} updated to ${nextPosition}.`);
  };

  const saveEmployeeSetupEdit = (kind, previousValue, editInput) => {
    if (!(editInput instanceof HTMLInputElement)) {
      return;
    }

    if (kind === "company-acronym") {
      updateAcronym(previousValue, editInput.value, editInput);
      return;
    }

    if (kind === "employee-position") {
      updatePosition(previousValue, editInput.value, editInput);
    }
  };

  const handleEmployeeSetupListClick = (event) => {
    const editButton = event.target?.closest?.("button[data-employee-setup-edit]");
    if (editButton instanceof HTMLButtonElement) {
      const kind = editButton.dataset.employeeSetupKind || "";
      const value = editButton.dataset.employeeSetupValue || "";
      setEmployeeSetupEditState(panel, kind, value);
      refreshEmployeeSetupPanels();
      return;
    }

    const cancelButton = event.target?.closest?.("button[data-employee-setup-cancel]");
    if (cancelButton instanceof HTMLButtonElement) {
      setEmployeeSetupEditState(panel);
      refreshEmployeeSetupPanels();
      return;
    }

    const saveButton = event.target?.closest?.("button[data-employee-setup-save]");
    if (saveButton instanceof HTMLButtonElement) {
      const item = saveButton.closest(".settings-employee-setup__item");
      const editInput = item?.querySelector("[data-employee-setup-edit-input]");
      saveEmployeeSetupEdit(
        saveButton.dataset.employeeSetupKind || "",
        saveButton.dataset.employeeSetupValue || "",
        editInput,
      );
      return;
    }

    const deleteButton = event.target?.closest?.("button[data-employee-setup-delete]");
    if (!(deleteButton instanceof HTMLButtonElement) || deleteButton.disabled) {
      return;
    }

    const kind = deleteButton.dataset.employeeSetupKind || "";
    const value = deleteButton.dataset.employeeSetupValue || "";
    if (kind === "company-acronym") {
      openSettingsValidationModal({
        variant: "error",
        title: "Delete Company Acronym",
        copy: `Delete ${value} from company acronyms? Employees can still register without an acronym.`,
        primaryLabel: "Delete",
        secondaryLabel: "Cancel",
        restoreFocusTarget: deleteButton,
        onAction: () => {
          const nextAcronyms = loadCompanyAcronyms().filter((item) => item !== value);
          saveCompanyAcronyms(nextAcronyms);
          setEmployeeSetupStatus(panel, "company-acronym", `${value} removed.`);
          refreshEmployeeSetupPanels();
        },
      });
      return;
    }

    if (kind === "employee-position") {
      if (isDefaultEmployeePosition(value)) {
        setEmployeeSetupStatus(panel, "employee-position", `${value} is a default position.`);
        return;
      }

      openSettingsValidationModal({
        variant: "error",
        title: "Delete Position",
        copy: `Delete ${value} from employee positions? Existing employees with this position will wait for admin access after login.`,
        primaryLabel: "Delete",
        secondaryLabel: "Cancel",
        restoreFocusTarget: deleteButton,
        onAction: () => {
          const nextPositions = loadEmployeePositions().filter(
            (item) => item.toLowerCase() !== value.toLowerCase(),
          );
          saveEmployeePositions(nextPositions);
          setEmployeeSetupStatus(panel, "employee-position", `${value} removed.`);
          refreshEmployeeSetupPanels();
        },
      });
    }
  };

  const handleEmployeeSetupListInput = (event) => {
    const editInput = event.target;
    if (!(editInput instanceof HTMLInputElement) || !editInput.hasAttribute("data-employee-setup-edit-input")) {
      return;
    }

    const item = editInput.closest("[data-employee-setup-kind]");
    if (item?.dataset.employeeSetupKind === "company-acronym") {
      const cursorPosition = editInput.selectionStart ?? editInput.value.length;
      editInput.value = normalizeCompanyAcronym(editInput.value);
      editInput.setSelectionRange(cursorPosition, cursorPosition);
    }
  };

  const handleEmployeeSetupListKeydown = (event) => {
    const editInput = event.target;
    if (!(editInput instanceof HTMLInputElement) || !editInput.hasAttribute("data-employee-setup-edit-input")) {
      return;
    }

    const item = editInput.closest("[data-employee-setup-kind][data-employee-setup-value]");
    if (!(item instanceof HTMLElement)) {
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      saveEmployeeSetupEdit(
        item.dataset.employeeSetupKind || "",
        item.dataset.employeeSetupValue || "",
        editInput,
      );
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setEmployeeSetupEditState(panel);
      refreshEmployeeSetupPanels();
    }
  };

  acronymAddButton?.addEventListener("click", addAcronym);
  positionAddButton?.addEventListener("click", addPosition);

  acronymInput?.addEventListener("input", () => {
    if (acronymInput instanceof HTMLInputElement) {
      const cursorPosition = acronymInput.selectionStart ?? acronymInput.value.length;
      acronymInput.value = normalizeCompanyAcronym(acronymInput.value);
      acronymInput.setSelectionRange(cursorPosition, cursorPosition);
    }
  });

  acronymInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addAcronym();
    }
  });

  positionInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addPosition();
    }
  });

  acronymList?.addEventListener("click", handleEmployeeSetupListClick);
  acronymList?.addEventListener("input", handleEmployeeSetupListInput);
  acronymList?.addEventListener("keydown", handleEmployeeSetupListKeydown);

  positionList?.addEventListener("click", handleEmployeeSetupListClick);
  positionList?.addEventListener("input", handleEmployeeSetupListInput);
  positionList?.addEventListener("keydown", handleEmployeeSetupListKeydown);

  renderEmployeeSetupPanel(panel);
  setEmployeeSetupActiveView(panel, panel.dataset.employeeSetupActiveView || "company-acronym");
}

function ensureEmployeeSetupSettings(menu) {
  if (!isDashboardSettingsMenu(menu)) {
    return null;
  }

  const dropdown = menu.querySelector("[data-settings-dropdown]");
  if (!(dropdown instanceof HTMLElement)) {
    return null;
  }

  let panel = dropdown.querySelector("[data-employee-settings-panel]");
  if (!(panel instanceof HTMLElement)) {
    panel = createEmployeeSetupSettingsElement();
    const copy = dropdown.querySelector(".settings-dropdown__copy");
    if (copy?.nextSibling) {
      dropdown.insertBefore(panel, copy.nextSibling);
    } else if (copy) {
      dropdown.appendChild(panel);
    } else {
      dropdown.insertBefore(panel, dropdown.firstChild);
    }
  }

  bindEmployeeSetupPanel(panel);
  return panel;
}

window.addEventListener("gms:company-acronyms-updated", refreshEmployeeSetupPanels);
window.addEventListener("gms:employee-positions-updated", refreshEmployeeSetupPanels);

function createSettingsCloseButtonElement() {
  const button = document.createElement("button");
  button.type = "button";
  button.className =
    "product-gallery-modal__close validation-modal__close settings-dropdown__close";
  button.setAttribute("aria-label", "Close settings");
  button.setAttribute("title", "Close settings");
  button.setAttribute("data-settings-close", "");
  button.innerHTML = `<i class="fa-solid fa-xmark" aria-hidden="true"></i>`;
  return button;
}

function isDashboardSettingsMenu(menu) {
  return (
    menu instanceof HTMLElement &&
    menu.closest(".dashboard-shell--panel-nav") instanceof HTMLElement
  );
}

function isSettingsDrawerMenu(menu) {
  return (
    menu instanceof HTMLElement &&
    menu.closest(".dashboard-shell--panel-nav, .login-page-shell--settings-drawer") instanceof HTMLElement
  );
}

function ensureSettingsCloseButton(menu) {
  if (!isSettingsDrawerMenu(menu)) {
    return null;
  }

  const dropdown = menu.querySelector("[data-settings-dropdown]");
  if (!(dropdown instanceof HTMLElement)) {
    return null;
  }

  let closeButton = dropdown.querySelector("[data-settings-close]");
  if (!(closeButton instanceof HTMLButtonElement)) {
    closeButton = createSettingsCloseButtonElement();
    dropdown.insertBefore(closeButton, dropdown.firstChild);
  }

  return closeButton;
}

function createDashboardBackgroundFieldElement() {
  const wrapper = document.createElement("div");
  wrapper.className = "settings-dashboard-background";
  wrapper.setAttribute("data-dashboard-background-field", "");
  wrapper.innerHTML = `
    <div class="settings-color-field settings-color-field--primary">
      <span>Background Color</span>
      <input
        type="color"
        value="#F3F4F6"
        class="settings-color-field__native-input"
        data-dashboard-background-input
      />
    </div>

    <button
      type="button"
      class="ghost-button settings-reset-button"
      data-dashboard-background-reset
    >
      Reset Default
    </button>
  `;
  return wrapper;
}

function ensureDashboardBackgroundField(menu) {
  if (!isDashboardSettingsMenu(menu)) {
    return null;
  }

  const dropdown = menu.querySelector("[data-settings-dropdown]");
  if (!(dropdown instanceof HTMLElement)) {
    return null;
  }

  let field = dropdown.querySelector("[data-dashboard-background-field]");
  if (!(field instanceof HTMLElement)) {
    field = createDashboardBackgroundFieldElement();
    const resetButton = dropdown.querySelector("[data-theme-reset]");
    if (resetButton) {
      dropdown.insertBefore(field, resetButton);
    } else {
      dropdown.appendChild(field);
    }
  }

  return field;
}

function ensureSettingsColorGrid(menu) {
  const dropdown = menu.querySelector("[data-settings-dropdown]");
  const primaryField = menu.querySelector("[data-theme-color-input]")?.closest(".settings-color-field");
  const backgroundField = dropdown?.querySelector("[data-dashboard-background-field]");

  if (!(dropdown instanceof HTMLElement) || !(primaryField instanceof HTMLElement)) {
    return null;
  }

  let grid = dropdown.querySelector("[data-settings-color-grid]");
  if (!(grid instanceof HTMLElement)) {
    grid = document.createElement("div");
    grid.className = "settings-color-grid";
    grid.setAttribute("data-settings-color-grid", "");
    dropdown.insertBefore(grid, primaryField);
  }

  if (primaryField.parentElement !== grid) {
    grid.appendChild(primaryField);
  }

  if (backgroundField instanceof HTMLElement && backgroundField.parentElement !== grid) {
    grid.appendChild(backgroundField);
  }

  return grid;
}

function createThemeSaveActionsElement() {
  const wrapper = document.createElement("div");
  wrapper.className = "settings-theme-actions";
  wrapper.setAttribute("data-theme-actions", "");
  wrapper.innerHTML = `
    <button
      type="button"
      class="dashboard-link-button settings-save-button"
      data-theme-save
      disabled
    >
      Save
    </button>
  `;
  return wrapper;
}

function createDashboardBackgroundSaveActionsElement() {
  const wrapper = document.createElement("div");
  wrapper.className = "settings-theme-actions";
  wrapper.setAttribute("data-dashboard-background-actions", "");
  wrapper.innerHTML = `
    <button
      type="button"
      class="dashboard-link-button settings-save-button"
      data-dashboard-background-save
      disabled
    >
      Save
    </button>
  `;
  return wrapper;
}

function ensureThemeSaveActions(menu) {
  const dropdown = menu.querySelector("[data-settings-dropdown]");
  if (!(dropdown instanceof HTMLElement)) {
    return null;
  }

  const copy = dropdown.querySelector(".settings-dropdown__copy");
  if (copy) {
    copy.textContent = "Pick a color, then confirm Save.";
  }

  let actions = dropdown.querySelector("[data-theme-actions]");
  const resetButton = dropdown.querySelector("[data-theme-reset]");
  const spectrumPopover = dropdown.querySelector("[data-spectrum-popover]");
  if (!(actions instanceof HTMLElement)) {
    actions = createThemeSaveActionsElement();
    if (spectrumPopover instanceof HTMLElement) {
      spectrumPopover.appendChild(actions);
    } else {
      const backgroundField = dropdown.querySelector("[data-dashboard-background-field]");
      const anchor = backgroundField || resetButton;

      if (anchor) {
        dropdown.insertBefore(actions, anchor);
      } else {
        dropdown.appendChild(actions);
      }
    }
  } else if (spectrumPopover instanceof HTMLElement && actions.parentElement !== spectrumPopover) {
    spectrumPopover.appendChild(actions);
  }

  if (resetButton instanceof HTMLElement) {
    const saveButton = actions.querySelector("[data-theme-save]");

    if (saveButton instanceof HTMLElement) {
      actions.insertBefore(resetButton, saveButton);
    } else {
      actions.appendChild(resetButton);
    }
  }

  return actions;
}

function ensureDashboardBackgroundSaveActions(menu) {
  const dropdown = menu.querySelector("[data-settings-dropdown]");
  if (!(dropdown instanceof HTMLElement)) {
    return null;
  }

  const backgroundField = dropdown.querySelector("[data-dashboard-background-field]");
  if (!(backgroundField instanceof HTMLElement)) {
    return null;
  }

  const resetButton = backgroundField.querySelector("[data-dashboard-background-reset]");
  const spectrumPopover = backgroundField.querySelector("[data-spectrum-popover]");
  let actions = dropdown.querySelector("[data-dashboard-background-actions]");
  if (!(actions instanceof HTMLElement)) {
    actions = createDashboardBackgroundSaveActionsElement();
    if (spectrumPopover instanceof HTMLElement) {
      spectrumPopover.appendChild(actions);
    } else {
      backgroundField.appendChild(actions);
    }
  } else if (spectrumPopover instanceof HTMLElement && actions.parentElement !== spectrumPopover) {
    spectrumPopover.appendChild(actions);
  }

  if (resetButton instanceof HTMLElement) {
    const saveButton = actions.querySelector("[data-dashboard-background-save]");

    if (saveButton instanceof HTMLElement) {
      actions.insertBefore(resetButton, saveButton);
    } else {
      actions.appendChild(resetButton);
    }
  }

  return actions;
}

function createSettingsMenuElement() {
  const root = document.createElement("div");
  root.className = "settings-menu";
  root.setAttribute("data-settings-menu", "");
  root.innerHTML = `
    <button
      class="settings-toggle"
      type="button"
      aria-label="Color Picker"
      aria-haspopup="true"
      aria-expanded="false"
      data-ui-tooltip="Color Picker"
      data-settings-toggle
    >
      <span class="settings-toggle__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <path
            d="M10.4 2.8h3.2l.5 2.1c.4.1.9.3 1.3.5l1.9-1.1 2.3 2.3-1.1 1.9c.2.4.4.8.5 1.3l2.1.5v3.2l-2.1.5c-.1.5-.3.9-.5 1.3l1.1 1.9-2.3 2.3-1.9-1.1c-.4.2-.8.4-1.3.5l-.5 2.1h-3.2l-.5-2.1c-.5-.1-.9-.3-1.3-.5l-1.9 1.1-2.3-2.3 1.1-1.9a5 5 0 0 1-.5-1.3l-2.1-.5v-3.2l2.1-.5c.1-.5.3-.9.5-1.3L4.5 6.6l2.3-2.3 1.9 1.1c.4-.2.8-.4 1.3-.5Z"
            stroke-linejoin="round"
          />
          <circle cx="12" cy="12" r="3.2" />
        </svg>
      </span>
      <span class="settings-toggle__swatch" aria-hidden="true"></span>
    </button>

    <div class="settings-dropdown" hidden data-settings-dropdown>
      <p class="settings-dropdown__eyebrow">Theme Settings</p>
      <h2 class="settings-dropdown__title">Color Picker</h2>
      <p class="settings-dropdown__copy">
        Pick a color and it updates the whole web server instantly.
      </p>

      <div class="settings-color-field settings-color-field--primary">
        <span>Primary Color</span>
        <input type="color" value="#2563EB" data-theme-color-input />
      </div>

      <button
        type="button"
        class="ghost-button settings-reset-button"
        data-theme-reset
      >
        Reset Default
      </button>
    </div>
  `;

  applyThemedTooltips(root);
  return root;
}

function findDashboardHeaderSection() {
  return document.querySelector(
    ".dashboard-content > .hero, .dashboard-content .delivery-hero, .dashboard-content .payment-hero",
  );
}

function ensureHeroActionsContainer(section) {
  if (!(section instanceof HTMLElement)) {
    return null;
  }

  const existingActions = Array.from(section.children).find(
    (child) => child instanceof HTMLElement && child.classList.contains("hero-actions"),
  );
  if (existingActions) {
    return existingActions;
  }

  const content = document.createElement("div");
  content.className = "dashboard-header-content";

  while (section.firstChild) {
    content.appendChild(section.firstChild);
  }

  const actions = document.createElement("div");
  actions.className = "hero-actions";
  actions.appendChild(content);
  section.appendChild(actions);
  return actions;
}

function ensureDashboardHeroToolsContainer() {
  const existingContainer = document.querySelector(".dashboard-content .dashboard-hero-tools");
  if (existingContainer instanceof HTMLElement) {
    return existingContainer;
  }

  const headerSection = findDashboardHeaderSection();
  const actions = ensureHeroActionsContainer(headerSection);
  if (!(actions instanceof HTMLElement)) {
    return null;
  }

  const existingTools = Array.from(actions.children).find(
    (child) => child instanceof HTMLElement && child.classList.contains("dashboard-hero-tools"),
  );
  if (existingTools) {
    return existingTools;
  }

  const tools = document.createElement("div");
  tools.className = "dashboard-hero-tools";
  actions.appendChild(tools);
  return tools;
}

function isSellerAdminSpaFrameDocument() {
  return Boolean(
    document.documentElement?.classList?.contains("admin-spa-frame-document") ||
    document.body?.classList?.contains("admin-spa-frame-document") ||
    (
      window.self !== window.top &&
      new URLSearchParams(window.location.search).get("__gms_admin_spa_frame") === "1"
    ),
  );
}

function isMainInventoryEmbedDocument() {
  return /\/main_inventory_embed\.html$/i.test(String(window.location.pathname || "").trim())
    && (
      document.body?.classList?.contains("stock-main-inventory-embedded")
      || new URLSearchParams(window.location.search).get("main_inventory") === "1"
    );
}

function shouldUseSellerAdminNotificationOnlyHeader() {
  if (isMainInventoryEmbedDocument()) {
    return false;
  }

  const hasSellerAdminChrome = Boolean(
    hasNotificationAdminSession() ||
    document.body?.classList.contains("admin-super-sidebar-enabled") ||
    document.body?.classList.contains("seller-dashboard-page") ||
    isSellerAdminSpaFrameDocument(),
  );
  return Boolean(
    hasSellerAdminChrome &&
    isSellerAdminSettingsIconPage() &&
    document.querySelector(".dashboard-layout"),
  );
}

function getSellerAdminNotificationHost() {
  return (
    document.querySelector(
      ".dashboard-content > .hero.admin-super-header .admin-super-header__actions",
    ) ||
    document.querySelector(".dashboard-content .dashboard-hero-tools") ||
    document.querySelector(".dashboard-content .hero-actions")
  );
}

function removeLegacySellerAdminNotifications() {
  document.querySelectorAll("[data-settings-menu]").forEach((menu) => menu.remove());
  document.querySelectorAll("[data-notification-menu]").forEach((menu) => {
    if (menu.hasAttribute("data-seller-admin-notification")) {
      return;
    }
    menu.remove();
  });
}

function createSellerAdminNotificationButton() {
  const root = document.createElement("div");
  root.className = "seller-admin-notification-menu";
  root.setAttribute("data-seller-admin-notification", "");
  root.innerHTML = `
    <button
      class="seller-admin-notification-btn"
      type="button"
      id="seller-admin-notification-btn"
      aria-label="Workspace notifications"
      aria-expanded="false"
      aria-controls="seller-admin-notification-panel"
      title="Workspace notifications"
      data-notification-toggle
    >
      <span class="seller-admin-notification-icon seller-admin-notification-icon--outline" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10.268 21a2 2 0 0 0 3.464 0"></path>
          <path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"></path>
        </svg>
      </span>
      <span class="seller-admin-notification-icon seller-admin-notification-icon--filled" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10.268 21a2 2 0 0 0 3.464 0" fill="none"></path>
          <path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" fill="currentColor"></path>
        </svg>
      </span>
      <span class="seller-admin-notification-badge" data-notification-badge hidden>0</span>
    </button>
  `;
  return root;
}

function createSellerAdminNotificationPanel() {
  const panel = document.createElement("div");
  panel.className = "seller-admin-notification-panel dashboard-notification-dropdown";
  panel.id = "seller-admin-notification-panel";
  panel.hidden = true;
  panel.setAttribute("data-notification-dropdown", "");
  panel.innerHTML = `
    <button
      type="button"
      class="dashboard-notification-dropdown__close seller-admin-notification-panel__close"
      aria-label="Close notification"
      title="Close notification"
      data-notification-close
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="m18 6-12 12"></path>
        <path d="m6 6 12 12"></path>
      </svg>
    </button>
    <div class="dashboard-notification-dropdown__header">
      <div>
        <h2 class="dashboard-notification-dropdown__title">Notification</h2>
        <div class="dashboard-notification-filter" role="tablist" aria-label="Notification filter">
          <button type="button" class="dashboard-notification-filter__button is-active" data-notification-filter="all" role="tab" aria-selected="true">All</button>
          <button type="button" class="dashboard-notification-filter__button" data-notification-filter="unread" role="tab" aria-selected="false">Unread</button>
        </div>
      </div>
    </div>
    <div class="activity-list dashboard-notification-list seller-admin-notification-list" aria-live="polite">
      <div class="empty-state">No notification yet.</div>
    </div>
    <div class="seller-admin-notification-panel__footer" data-notification-footer hidden>
      <button
        type="button"
        class="dashboard-notification-show-more seller-admin-notification-panel__show-all"
        data-notification-show-all
        aria-expanded="false"
      >
        Show all notifications
      </button>
    </div>
  `;
  return panel;
}

function mountSellerAdminNotificationChrome() {
  if (!shouldUseSellerAdminNotificationOnlyHeader()) {
    return null;
  }

  document.body?.classList.add("seller-admin-notification-enabled");
  removeLegacySellerAdminNotifications();

  const existingRoot = document.querySelector("[data-seller-admin-notification]");
  let existingPanel = document.getElementById("seller-admin-notification-panel");
  if (existingRoot instanceof HTMLElement) {
    if (!(existingPanel instanceof HTMLElement)) {
      existingPanel = createSellerAdminNotificationPanel();
      document.body.appendChild(existingPanel);
    }
    existingRoot._sellerNotificationPanel = existingPanel;
    return existingRoot;
  }

  const host = getSellerAdminNotificationHost();
  if (!(host instanceof HTMLElement)) {
    return null;
  }

  const root = createSellerAdminNotificationButton();
  const panel = createSellerAdminNotificationPanel();
  root._sellerNotificationPanel = panel;
  host.appendChild(root);
  document.body.appendChild(panel);
  return root;
}

function ensureSellerAdminNotificationHeaderReady() {
  if (!isSellerAdminSettingsIconPage() || !document.querySelector(".dashboard-layout")) {
    return null;
  }

  if (!shouldUseSellerAdminNotificationOnlyHeader()) {
    return null;
  }

  const root = mountSellerAdminNotificationChrome();
  if (!(root instanceof HTMLElement)) {
    return null;
  }

  return ensureNotificationMenu(null, root);
}

function scheduleSellerAdminNotificationHeaderReady() {
  if (ensureSellerAdminNotificationHeaderReady()) {
    return;
  }

  let attempts = 0;
  const maxAttempts = 50;
  const retryTimer = window.setInterval(() => {
    attempts += 1;
    if (ensureSellerAdminNotificationHeaderReady() || attempts >= maxAttempts) {
      window.clearInterval(retryTimer);
    }
  }, 80);

  const observer = new MutationObserver(() => {
    if (ensureSellerAdminNotificationHeaderReady()) {
      observer.disconnect();
      window.clearInterval(retryTimer);
    }
  });

  if (document.body) {
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
      childList: true,
      subtree: true,
    });
    window.setTimeout(() => observer.disconnect(), 6000);
  }
}

function ensureSettingsMenuForDashboardPage() {
  if (shouldUseSellerAdminNotificationOnlyHeader()) {
    return;
  }

  if (document.querySelector("[data-settings-menu]")) {
    registerSettingsMenusFromDom();
    return;
  }

  if (!document.querySelector(".dashboard-layout")) {
    return;
  }

  const toolsContainer = ensureDashboardHeroToolsContainer();
  if (!(toolsContainer instanceof HTMLElement)) {
    return;
  }

  const menu = createSettingsMenuElement();
  toolsContainer.appendChild(menu);
  registerSettingsMenu(menu);
}

function createNotificationMenuElement() {
  const root = document.createElement("div");
  root.className = "dashboard-tool-menu dashboard-notification-menu universal-dropdown";
  root.setAttribute("data-notification-menu", "");
  root.innerHTML = `
    <button
      class="dashboard-tool-button dashboard-tool-button--notification"
      type="button"
      aria-label="Notification"
      aria-haspopup="true"
      aria-expanded="false"
      title="Notification"
      data-notification-toggle
    >
      <span class="dashboard-tool-button__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M10.268 21a2 2 0 0 0 3.464 0"></path>
          <path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"></path>
        </svg>
      </span>
      <span class="dashboard-notification-badge" hidden aria-hidden="true"></span>
    </button>
    <div class="dashboard-notification-dropdown" hidden data-notification-dropdown>
      <div class="dashboard-notification-dropdown__header">
        <div>
          <h2 class="dashboard-notification-dropdown__title">Notification</h2>
        </div>
        <span class="count-pill">0</span>
      </div>
      <div class="activity-list dashboard-notification-list">
        <div class="empty-state">No notification yet.</div>
      </div>
    </div>
  `;

  applyThemedTooltips(root);
  return root;
}

function findSiblingNotificationMenu(settingsMenu) {
  const parent = settingsMenu.parentElement;
  if (!parent) {
    return null;
  }

  for (const child of parent.children) {
    if (child instanceof HTMLElement && child.hasAttribute("data-notification-menu")) {
      return child;
    }
  }

  return null;
}

function ensureNotificationMenu(settingsMenu = null, notificationRoot = null) {
  const settingsMenuElement = settingsMenu instanceof HTMLElement ? settingsMenu : null;
  if (settingsMenuElement && !settingsMenuElement.parentElement) {
    return null;
  }

  let root = notificationRoot instanceof HTMLElement
    ? notificationRoot
    : settingsMenuElement
      ? findSiblingNotificationMenu(settingsMenuElement)
      : null;
  if (!root) {
    if (!settingsMenuElement?.parentElement) {
      return null;
    }
    root = createNotificationMenuElement();
    settingsMenuElement.parentElement.insertBefore(root, settingsMenuElement);
  }

  if (settingsMenuElement?.classList.contains("login-page-settings")) {
    root.classList.add("login-page-notification");
  }

  if (root._notificationEntry) {
    const existing = root._notificationEntry;
    if (root._sellerNotificationPanel instanceof HTMLElement) {
      existing.dropdown = root._sellerNotificationPanel;
    }
    return existing;
  }

  const toggle = root.querySelector("[data-notification-toggle]");
  const dropdown = root.querySelector("[data-notification-dropdown]")
    || root._sellerNotificationPanel
    || document.getElementById(toggle?.getAttribute("aria-controls") || "");
  const entry = {
    root,
    toggle,
    dropdown,
    closeButton: null,
    badge: root.querySelector("[data-notification-badge], .dashboard-notification-badge, .seller-admin-notification-badge"),
    countPill: root.querySelector(".count-pill") || dropdown?.querySelector?.(".count-pill"),
    list: (dropdown instanceof HTMLElement ? dropdown : root).querySelector(".dashboard-notification-list"),
    footer: (dropdown instanceof HTMLElement ? dropdown : root).querySelector("[data-notification-footer]"),
    showAllButton: (dropdown instanceof HTMLElement ? dropdown : root).querySelector("[data-notification-show-all]"),
    filterButtons: Array.from((dropdown instanceof HTMLElement ? dropdown : root).querySelectorAll("[data-notification-filter]")),
    notificationFilter: "all",
    closeTimer: 0,
    hasExpandedNotifications: false,
    collapsedNotificationListHeight: 0,
  };

  if (!entry.toggle || !entry.dropdown || !entry.badge || !entry.list) {
    return null;
  }

  entry.closeButton = entry.dropdown.querySelector("[data-notification-close]");
  if (!(entry.closeButton instanceof HTMLButtonElement) && isNotificationDrawerEntry(entry)) {
    entry.closeButton = createNotificationCloseButtonElement();
    entry.dropdown.insertBefore(entry.closeButton, entry.dropdown.firstChild);
  }

  for (const filterButton of entry.filterButtons) {
    if (!(filterButton instanceof HTMLButtonElement)) {
      continue;
    }
    filterButton.addEventListener("click", (event) => {
      event.stopPropagation();
      const nextFilter = filterButton.dataset.notificationFilter === "unread" ? "unread" : "all";
      if (entry.notificationFilter === nextFilter) {
        return;
      }
      entry.notificationFilter = nextFilter;
      entry.hasExpandedNotifications = false;
      entry.collapsedNotificationListHeight = 0;
      renderNotificationActivities(currentNotifications);
    });
    filterButton.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
        return;
      }
      event.preventDefault();
      const buttons = entry.filterButtons.filter((button) => button instanceof HTMLButtonElement);
      const currentIndex = buttons.indexOf(filterButton);
      if (currentIndex < 0 || !buttons.length) {
        return;
      }
      const nextIndex = event.key === "Home"
        ? 0
        : event.key === "End"
          ? buttons.length - 1
          : event.key === "ArrowLeft"
            ? (currentIndex - 1 + buttons.length) % buttons.length
            : (currentIndex + 1) % buttons.length;
      buttons[nextIndex]?.focus();
      buttons[nextIndex]?.click();
    });
  }

  const openSellerNotificationPanel = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const nextIsOpen = entry.toggle.getAttribute("aria-expanded") !== "true";

    closeAllNotificationMenus(entry);
    if (settingsMenuElement) {
      closeSettingsMenu(settingsMenuElement);
    }

    if (entry.closeTimer) {
      window.clearTimeout(entry.closeTimer);
      entry.closeTimer = 0;
    }

    entry.dropdown.classList.remove("dashboard-notification-dropdown--closing");
    entry.toggle.setAttribute("aria-expanded", nextIsOpen ? "true" : "false");
    if (nextIsOpen) {
      if (isSellerAdminNotificationEntry(entry) && entry.dropdown.parentElement !== document.body) {
        document.body.appendChild(entry.dropdown);
      }
      entry.dropdown.hidden = false;
      markNotificationBadgeSeen();
      renderNotificationActivities(currentNotifications);
      positionSellerNotificationPanel(entry);
      window.requestAnimationFrame(() => positionSellerNotificationPanel(entry));
    } else {
      closeNotificationMenuWithAnimation(entry);
    }
    syncNotificationDrawerScrollLock();
  };

  entry.toggle.addEventListener("click", openSellerNotificationPanel);

  entry.dropdown.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  entry.closeButton?.addEventListener("click", (event) => {
    event.stopPropagation();
    closeNotificationMenuWithAnimation(entry);
  });

  entry.showAllButton?.addEventListener("click", (event) => {
    event.stopPropagation();
    entry.hasExpandedNotifications = !entry.hasExpandedNotifications;
    entry.collapsedNotificationListHeight = 0;
    renderNotificationActivities(currentNotifications);
  });

  root._notificationEntry = entry;
  notificationEntries.push(entry);
  syncNotificationBadges();
  renderNotificationActivities(currentNotifications);
  return entry;
}

const settingsValidationIcons = Object.freeze({
  success: '<div class="settings-validation-lottie-check" data-settings-validation-lottie-check></div>',
  notice: '<i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>',
  error: '<i class="fa-solid fa-circle-xmark" aria-hidden="true"></i>',
});

const settingsValidationLottiePlayerUrl = "/vendor/lottie.min.js";
const settingsValidationSuccessAnimationPath = "/animations/employee-account-check.json";
let settingsValidationModalElements = null;
let settingsValidationOnAction = null;
let settingsValidationOnSecondaryAction = null;
let settingsValidationAllowOverlayClose = true;
let settingsValidationRestoreFocusTarget = null;
let settingsValidationSuccessAnimation = null;
let settingsValidationLottieLoadPromise = null;
let settingsValidationAutoCloseTimer = 0;

function syncSettingsModalBodyState() {
  const hasOpenValidationModal = Boolean(
    document.querySelector(".validation-modal-overlay:not([hidden])"),
  );
  document.body.classList.toggle("modal-open", hasOpenValidationModal);
}

function isSettingsMenuOpen(menu) {
  if (!(menu instanceof HTMLElement)) {
    return false;
  }

  const button = menu.querySelector("[data-settings-toggle]");
  const dropdown = menu.querySelector("[data-settings-dropdown]");
  return (
    button instanceof HTMLElement &&
    dropdown instanceof HTMLElement &&
    !dropdown.hidden &&
    button.getAttribute("aria-expanded") === "true"
  );
}

function syncSettingsDrawerScrollLock() {
  const openMenus = settingsMenus.filter((menu) => isSettingsMenuOpen(menu));
  const hasOpenDrawerSettings = openMenus.some(isSettingsDrawerMenu);

  document.documentElement.classList.toggle(settingsDrawerBodyClass, hasOpenDrawerSettings);
  document.body.classList.toggle(settingsDrawerBodyClass, hasOpenDrawerSettings);

  for (const shell of document.querySelectorAll(`.dashboard-shell--panel-nav.${settingsDrawerShellClass}`)) {
    shell.classList.remove(settingsDrawerShellClass);
  }
}

function getOpenSettingsDrawerDropdown() {
  for (const menu of settingsMenus) {
    if (!isSettingsDrawerMenu(menu)) {
      continue;
    }

    if (!isSettingsMenuOpen(menu)) {
      continue;
    }

    const dropdown = menu.querySelector("[data-settings-dropdown]");
    if (dropdown instanceof HTMLElement && !dropdown.hidden) {
      return dropdown;
    }
  }

  return null;
}

function getOpenNotificationDrawerDropdown() {
  for (const entry of notificationEntries) {
    if (!isNotificationDrawerEntry(entry) || !isNotificationMenuOpen(entry)) {
      continue;
    }

    if (entry.dropdown instanceof HTMLElement && !entry.dropdown.hidden) {
      return entry.dropdown;
    }
  }

  return null;
}

function shouldPreventDashboardScrollFromEvent(target) {
  const dropdown = getOpenSettingsDrawerDropdown() ?? getOpenNotificationDrawerDropdown();
  if (!(dropdown instanceof HTMLElement)) {
    return false;
  }

  return !(target instanceof Node) || !dropdown.contains(target);
}

function ensureSettingsValidationLottiePlayer() {
  if (window.lottie?.loadAnimation) {
    return Promise.resolve(true);
  }

  if (settingsValidationLottieLoadPromise) {
    return settingsValidationLottieLoadPromise;
  }

  settingsValidationLottieLoadPromise = new Promise((resolve) => {
    const existingScript = document.querySelector(
      `script[src$="${settingsValidationLottiePlayerUrl}"], script[src*="${settingsValidationLottiePlayerUrl}?"]`,
    );
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(Boolean(window.lottie?.loadAnimation)), { once: true });
      existingScript.addEventListener("error", () => resolve(false), { once: true });
      if (window.lottie?.loadAnimation) {
        resolve(true);
      }
      return;
    }

    const scriptElement = document.createElement("script");
    scriptElement.src = settingsValidationLottiePlayerUrl;
    scriptElement.async = true;
    scriptElement.addEventListener("load", () => resolve(Boolean(window.lottie?.loadAnimation)), { once: true });
    scriptElement.addEventListener("error", () => resolve(false), { once: true });
    document.head.appendChild(scriptElement);
  });

  return settingsValidationLottieLoadPromise;
}

function destroySettingsValidationSuccessAnimation() {
  if (settingsValidationSuccessAnimation?.destroy) {
    settingsValidationSuccessAnimation.destroy();
  }
  settingsValidationSuccessAnimation = null;
}

async function playSettingsValidationSuccessAnimation() {
  const container = settingsValidationModalElements?.icon?.querySelector("[data-settings-validation-lottie-check]");
  if (!(container instanceof HTMLElement)) {
    return;
  }

  destroySettingsValidationSuccessAnimation();
  container.innerHTML = "";

  const canUseLottie = await ensureSettingsValidationLottiePlayer();
  if (
    !canUseLottie
    || !window.lottie?.loadAnimation
    || !container.isConnected
    || settingsValidationModalElements?.overlay?.hidden
  ) {
    return;
  }

  settingsValidationSuccessAnimation = window.lottie.loadAnimation({
    container,
    renderer: "svg",
    loop: false,
    autoplay: true,
    path: settingsValidationSuccessAnimationPath,
  });
}

function ensureSettingsValidationModal() {
  if (settingsValidationModalElements) {
    return settingsValidationModalElements;
  }

  const overlay = document.createElement("div");
  overlay.className = "validation-modal-overlay";
  overlay.hidden = true;
  overlay.setAttribute("data-settings-validation-modal-overlay", "");
  overlay.innerHTML = `
    <div
      class="validation-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-validation-modal-title"
    >
      <button
        type="button"
        class="product-gallery-modal__close validation-modal__close"
        aria-label="Close validation modal"
        title="Close validation modal"
        data-settings-validation-modal-close
      >
        <i class="fa-solid fa-xmark" aria-hidden="true"></i>
      </button>
      <div class="validation-modal__top">
        <div
          class="validation-modal__icon validation-modal__icon--notice"
          data-settings-validation-modal-icon
        >
          <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
        </div>
      </div>
      <div class="validation-modal__body">
        <h2 class="validation-modal__title" id="settings-validation-modal-title">
          Confirm Save
        </h2>
        <p class="validation-modal__copy" data-settings-validation-modal-copy></p>
        <div class="validation-modal__actions">
          <button
            type="button"
            class="ghost-button validation-modal__action-button validation-modal__action-button--secondary"
            data-settings-validation-modal-secondary
          >
            Cancel
          </button>
          <button
            type="button"
            class="dashboard-link-button validation-modal__action-button"
            data-settings-validation-modal-action
          >
            Save
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const closeButton = overlay.querySelector("[data-settings-validation-modal-close]");
  const icon = overlay.querySelector("[data-settings-validation-modal-icon]");
  const title = overlay.querySelector("#settings-validation-modal-title");
  const copy = overlay.querySelector("[data-settings-validation-modal-copy]");
  const secondaryButton = overlay.querySelector("[data-settings-validation-modal-secondary]");
  const actionButton = overlay.querySelector("[data-settings-validation-modal-action]");
  const actions = overlay.querySelector(".validation-modal__actions");

  settingsValidationModalElements = {
    overlay,
    closeButton,
    icon,
    title,
    copy,
    actions,
    secondaryButton,
    actionButton,
  };

  closeButton?.addEventListener("click", () => {
    closeSettingsValidationModal();
  });

  actionButton?.addEventListener("click", () => {
    if (typeof settingsValidationOnAction === "function") {
      const handled = settingsValidationOnAction();
      if (handled === false) {
        return;
      }
    }

    closeSettingsValidationModal();
  });

  secondaryButton?.addEventListener("click", () => {
    if (typeof settingsValidationOnSecondaryAction === "function") {
      const handled = settingsValidationOnSecondaryAction();
      if (handled === false) {
        return;
      }
    }

    closeSettingsValidationModal();
  });

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay && settingsValidationAllowOverlayClose) {
      closeSettingsValidationModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      settingsValidationModalElements &&
      !settingsValidationModalElements.overlay.hidden &&
      settingsValidationAllowOverlayClose
    ) {
      closeSettingsValidationModal();
    }
  });

  return settingsValidationModalElements;
}

function hideSettingsValidationModalOverlay(callback) {
  if (!settingsValidationModalElements) {
    if (typeof callback === "function") {
      callback();
    }
    return;
  }

  const overlay = settingsValidationModalElements.overlay;
  if (!(overlay instanceof HTMLElement)) {
    if (typeof callback === "function") {
      callback();
    }
    return;
  }

  overlay.classList.remove("is-open");

  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) {
      return;
    }

    cleanedUp = true;
    overlay.hidden = true;
    overlay.removeEventListener("transitionend", handleTransitionEnd);
    window.clearTimeout(exitTimer);

    if (typeof callback === "function") {
      callback();
    }
  };

  const handleTransitionEnd = (event) => {
    if (event.target !== overlay) {
      return;
    }
    cleanup();
  };

  overlay.addEventListener("transitionend", handleTransitionEnd);
  const exitTimer = window.setTimeout(cleanup, 300);
}

function closeSettingsValidationModal() {
  if (!settingsValidationModalElements) {
    return;
  }

  window.clearTimeout(settingsValidationAutoCloseTimer);
  settingsValidationAutoCloseTimer = 0;

  hideSettingsValidationModalOverlay(() => {
    destroySettingsValidationSuccessAnimation();
    settingsValidationOnAction = null;
    settingsValidationOnSecondaryAction = null;
    settingsValidationAllowOverlayClose = true;
    const focusTarget = settingsValidationRestoreFocusTarget;
    settingsValidationRestoreFocusTarget = null;
    syncSettingsModalBodyState();

    if (focusTarget instanceof HTMLElement) {
      focusTarget.focus();
    }
  });
}

function openSettingsValidationModal(config) {
  const modal = ensureSettingsValidationModal();
  const variant = config?.variant === "success" ? "success" : config?.variant === "error" ? "error" : "notice";
  const isAutoSuccess = variant === "success" && config?.autoClose !== false;
  const primaryLabel = String(config?.primaryLabel || "Okay").trim() || "Okay";
  const secondaryLabel = String(config?.secondaryLabel || "").trim();

  window.clearTimeout(settingsValidationAutoCloseTimer);
  settingsValidationAutoCloseTimer = 0;
  modal.title.textContent = String(config?.title || "Notice");
  modal.copy.textContent = String(config?.copy || "");
  modal.icon.className = `validation-modal__icon validation-modal__icon--${variant}`;
  modal.icon.innerHTML = settingsValidationIcons[variant];
  if (variant === "success") {
    void playSettingsValidationSuccessAnimation();
  } else {
    destroySettingsValidationSuccessAnimation();
  }
  modal.actionButton.textContent = primaryLabel;
  modal.secondaryButton.textContent = secondaryLabel || "Cancel";
  modal.actionButton.hidden = isAutoSuccess;
  modal.secondaryButton.hidden = isAutoSuccess || secondaryLabel === "";
  if (modal.actions instanceof HTMLElement) {
    modal.actions.hidden = isAutoSuccess;
  }
  if (modal.closeButton instanceof HTMLElement) {
    modal.closeButton.hidden = isAutoSuccess;
  }
  settingsValidationOnAction =
    !isAutoSuccess && typeof config?.onAction === "function" ? config.onAction : null;
  settingsValidationOnSecondaryAction =
    !isAutoSuccess && typeof config?.onSecondaryAction === "function" ? config.onSecondaryAction : null;
  settingsValidationAllowOverlayClose = isAutoSuccess ? false : config?.allowOverlayClose !== false;
  settingsValidationRestoreFocusTarget =
    config?.restoreFocusTarget instanceof HTMLElement ? config.restoreFocusTarget : null;
  modal.overlay.hidden = false;
  window.requestAnimationFrame(() => {
    modal.overlay.classList.add("is-open");
  });
  syncSettingsModalBodyState();

  if (isAutoSuccess) {
    settingsValidationAutoCloseTimer = window.setTimeout(() => {
      if (!modal.overlay.hidden) {
        closeSettingsValidationModal();
      }
    }, Number(config?.autoCloseMs) > 0 ? Number(config.autoCloseMs) : 1500);
    return;
  }

  window.setTimeout(() => {
    if (!modal.overlay.hidden) {
      modal.actionButton.focus();
    }
  }, 0);
}

async function loadNotificationActivity() {
  if (!notificationEntries.length) {
    return;
  }

  const activityUrl = buildNotificationActivityUrl();
  if (!activityUrl) {
    currentNotifications = [];
    currentNotificationTotal = 0;
    syncNotificationBadges();
    renderNotificationActivities([]);
    return;
  }

  const loadSequence = ++notificationLoadSequence;
  try {
    seenNotificationState = loadSeenNotificationState();
    seenNotificationSignature = seenNotificationState.signature;
    const response = await fetch(activityUrl);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to load recent activity.");
    }

    if (loadSequence !== notificationLoadSequence) {
      return;
    }

    const activities = Array.isArray(data.activities) ? data.activities : [];
    const total = Number.isFinite(data.total) ? data.total : activities.length;
    currentNotifications = activities;
    currentNotificationTotal = total;
    const previousLatestNotificationSignature = latestNotificationSignature;
    latestNotificationSignature = createNotificationSignature(activities, total);
    if (
      previousLatestNotificationSignature &&
      latestNotificationSignature &&
      latestNotificationSignature !== previousLatestNotificationSignature &&
      latestNotificationSignature !== seenNotificationSignature
    ) {
      playNotificationSound(latestNotificationSignature);
    }
    syncNotificationBadges();
    renderNotificationActivities(activities);
  } catch (error) {
    if (loadSequence !== notificationLoadSequence) {
      return;
    }
    console.error(error);
    currentNotifications = [];
    currentNotificationTotal = 0;
    latestNotificationSignature = "";
    syncNotificationBadges();
    renderNotificationActivities([], "Unable to load notification right now.");
  }
}

function scheduleNotificationRealtimeRefresh(delayMs = 90) {
  window.clearTimeout(notificationRealtimeRefreshTimer);
  notificationRealtimeRefreshTimer = window.setTimeout(() => {
    notificationRealtimeRefreshTimer = 0;
    void loadNotificationActivity();
  }, Math.max(0, Number(delayMs) || 0));
}

function handleNotificationRealtimeChange(event) {
  if (!notificationEntries.length) {
    return;
  }

  const detail = event?.detail && typeof event.detail === "object" ? event.detail : {};
  if (detail.type === "ready") {
    if (detail.reconnected === true) {
      scheduleNotificationRealtimeRefresh(0);
    }
    return;
  }
  if (detail.type !== "data-change") {
    return;
  }

  const topics = Array.isArray(detail.topics)
    ? detail.topics.map((topic) => String(topic ?? "").trim().toLowerCase())
    : [];
  const notificationTopics = new Set([
    "all",
    "activity",
    "accounts",
    "buyers",
    "employees",
    "products",
    "product-requests",
    "inventory",
    "orders",
    "chat",
    "followers",
  ]);
  if (topics.some((topic) => notificationTopics.has(topic))) {
    scheduleNotificationRealtimeRefresh();
  }
}

function startPointerTracking(startEvent, onMove, onStop = null) {
  const move = (event) => {
    onMove(event);
  };
  const stop = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", stop);
    window.removeEventListener("pointercancel", stop);
    if (typeof onStop === "function") {
      onStop();
    }
  };

  startEvent.preventDefault();
  onMove(startEvent);
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", stop);
  window.addEventListener("pointercancel", stop);
}

function parseThemeHexInput(value) {
  const normalizedValue = String(value ?? "").trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalizedValue)) {
    return null;
  }

  return window.WebTheme.hexToTheme(`#${normalizedValue}`);
}

function parseThemeChannelInput(value, fallback) {
  const parsedValue = Number.parseInt(String(value ?? "").trim(), 10);
  if (!Number.isFinite(parsedValue)) {
    return fallback;
  }

  return Math.min(255, Math.max(0, parsedValue));
}

function getMenuSpectrumPickers(menu) {
  if (!(menu instanceof HTMLElement)) {
    return [];
  }

  return [menu._spectrumPicker, menu._dashboardBackgroundPicker].filter(
    (picker) => picker?.popover && picker?.trigger && picker?.spectrum,
  );
}

function refreshRecentSpectrumSwatches() {
  for (const menu of settingsMenus) {
    for (const picker of getMenuSpectrumPickers(menu)) {
      picker?.refreshRecent?.();
    }
  }
}

function closeSpectrumPickerInstance(picker) {
  if (!picker?.popover || !picker?.trigger || !picker?.spectrum) {
    return;
  }

  picker.isInteracting = false;
  picker.dropdown?.classList.remove("settings-dropdown--picker-open");
  if (picker.expandedClass) {
    picker.dropdown?.classList.remove(picker.expandedClass);
  }
  picker.layoutTarget?.classList.remove("is-expanded");
  picker.spectrum.classList.remove("is-open");
  if ("open" in picker.spectrum) {
    picker.spectrum.open = false;
  }
  picker.popover.hidden = true;
  picker.trigger.setAttribute("aria-expanded", "false");
}

function closeSpectrumPicker(menu) {
  for (const picker of getMenuSpectrumPickers(menu)) {
    closeSpectrumPickerInstance(picker);
  }
}

function closeAllSpectrumPickers(exceptPicker = null) {
  for (const menu of settingsMenus) {
    for (const picker of getMenuSpectrumPickers(menu)) {
      if (picker !== exceptPicker) {
        closeSpectrumPickerInstance(picker);
      }
    }
  }
}

function positionSpectrumPicker(menu) {
  for (const picker of getMenuSpectrumPickers(menu)) {
    if (!picker?.popover || picker.popover.hidden) {
      continue;
    }
  }
}

function repositionOpenSpectrumPickers() {
  for (const menu of settingsMenus) {
    positionSpectrumPicker(menu);
  }
}

function renderSpectrumPicker(picker, theme) {
  if (!picker) {
    return;
  }

  const gradientMiddleEnabled = Boolean(picker.gradientMiddleEnabled);
  const activeGradientStop =
    picker.activeGradientStop === "middle" && gradientMiddleEnabled
      ? "middle"
      : picker.activeGradientStop === "end"
        ? "end"
        : "start";
  const baseTheme = window.WebTheme.normalizeTheme(theme);
  picker.gradientStops ??= createDefaultGradientStops(baseTheme);
  const editingTheme =
    picker.mode === "gradient"
      ? window.WebTheme.normalizeTheme(picker.gradientStops[activeGradientStop])
      : baseTheme;
  const hsv = rgbToHsv(editingTheme);
  const hexValue = window.WebTheme.rgbToHex(editingTheme);
  const activeElement = document.activeElement;

  picker.state = hsv;
  picker.spectrum.classList.toggle("is-gradient-mode", picker.mode === "gradient");
  picker.spectrum.classList.toggle(
    "has-primary-stop-selector",
    Boolean(picker.enableGradientPrimaryStopSelector),
  );
  picker.gradientPrimaryStop = window.WebTheme.normalizeGradientPrimaryStop(
    picker.gradientPrimaryStop,
    baseTheme,
    picker.gradientStops,
  );
  picker.panel.style.background = `
    linear-gradient(to top, #000 0%, transparent 100%),
    linear-gradient(to right, #fff 0%, ${hueToCss(hsv.h)} 100%)
  `;
  const indicatorStart = clampUnit(
    Number.isFinite(picker.indicatorRange?.start) ? picker.indicatorRange.start : 0.16,
  );
  const indicatorEnd = clampUnit(
    Number.isFinite(picker.indicatorRange?.end) ? picker.indicatorRange.end : 0.82,
  );
  const opacityStart = clampUnit(
    Number.isFinite(picker.gradientOpacity?.start) ? picker.gradientOpacity.start : 1,
  );
  const opacityMiddle = clampUnit(
    Number.isFinite(picker.gradientOpacity?.middle)
      ? picker.gradientOpacity.middle
      : (opacityStart + clampUnit(picker.gradientOpacity?.end, 1)) / 2,
  );
  const opacityEnd = clampUnit(
    Number.isFinite(picker.gradientOpacity?.end) ? picker.gradientOpacity.end : 1,
  );
  const normalizedIndicatorRange = {
    start: Math.min(indicatorStart, Math.max(0, indicatorEnd - 0.08)),
    end: Math.max(indicatorEnd, Math.min(1, indicatorStart + 0.08)),
  };
  const gradientMiddlePosition = window.WebTheme.normalizeGradientMiddlePosition(
    picker.gradientMiddlePosition,
    normalizedIndicatorRange,
  );
  picker.indicatorRange = normalizedIndicatorRange;
  picker.gradientOpacity = {
    start: opacityStart,
    middle: opacityMiddle,
    end: opacityEnd,
  };
  picker.gradientMiddlePosition = gradientMiddlePosition;
  const gradientAngle = window.WebTheme.normalizeGradientAngle(
    Number.isFinite(picker.gradientAngle) ? picker.gradientAngle : window.WebTheme.defaultGradientAngle,
  );
  picker.gradientAngle = gradientAngle;
  const gradientCoverageFill = getGradientFill(
    picker.gradientStops.start,
    picker.gradientStops.end,
    {
      angle: `${gradientAngle}deg`,
      startStop: picker.indicatorRange.start,
      middleTheme: gradientMiddleEnabled ? picker.gradientStops.middle : null,
      middleStop: gradientMiddlePosition,
      middleAlpha: picker.gradientOpacity.middle,
      endStop: picker.indicatorRange.end,
      startAlpha: picker.gradientOpacity.start,
      endAlpha: picker.gradientOpacity.end,
    },
  );
  const indicatorCoverageFill = getGradientFill(
    picker.gradientStops.start,
    picker.gradientStops.end,
    {
      angle: "90deg",
      startStop: picker.indicatorRange.start,
      middleTheme: gradientMiddleEnabled ? picker.gradientStops.middle : null,
      middleStop: gradientMiddlePosition,
      middleAlpha: picker.gradientOpacity.middle,
      endStop: picker.indicatorRange.end,
      startAlpha: picker.gradientOpacity.start,
      endAlpha: picker.gradientOpacity.end,
    },
  );
  const solidCoverageFill = rgbToCss(baseTheme);
  const solidCoverageHoverFill = rgbToCss(
    mixTheme(baseTheme, { r: 0, g: 0, b: 0 }, 0.18),
  );
  const gradientCoverageHoverFill = getGradientFill(
    mixTheme(picker.gradientStops.start, { r: 0, g: 0, b: 0 }, 0.12),
    mixTheme(picker.gradientStops.end, { r: 0, g: 0, b: 0 }, 0.12),
    {
      angle: `${gradientAngle}deg`,
      startStop: picker.indicatorRange.start,
      middleTheme: gradientMiddleEnabled
        ? mixTheme(picker.gradientStops.middle, { r: 0, g: 0, b: 0 }, 0.12)
        : null,
      middleStop: gradientMiddlePosition,
      middleAlpha: picker.gradientOpacity.middle,
      endStop: picker.indicatorRange.end,
      startAlpha: picker.gradientOpacity.start,
      endAlpha: picker.gradientOpacity.end,
    },
  );
  picker.spectrum.style.setProperty("--settings-spectrum-solid-preview", solidCoverageFill);
  picker.spectrum.style.setProperty(
    "--settings-spectrum-solid-preview-hover",
    solidCoverageHoverFill,
  );
  picker.spectrum.style.setProperty(
    "--settings-spectrum-gradient-preview",
    gradientCoverageFill,
  );
  picker.spectrum.style.setProperty(
    "--settings-spectrum-gradient-preview-hover",
    gradientCoverageHoverFill,
  );
  picker.triggerSwatch.style.background =
    picker.mode === "gradient"
      ? gradientCoverageFill
      : getSpectrumSwatchFill(editingTheme, picker.mode);
  picker.triggerValue.textContent =
    picker.mode === "gradient" ? "Gradient" : hexValue;
  picker.indicator.hidden = picker.mode !== "gradient";
  picker.indicatorSwatch.style.background =
    picker.mode === "gradient"
      ? `${indicatorCoverageFill}, ${getTransparencyBackdropCss()}`
      : getSpectrumSwatchFill(editingTheme, "solid");
  picker.spectrum.classList.toggle("has-middle-stop", picker.mode === "gradient" && gradientMiddleEnabled);
  for (const handle of picker.indicatorHandles) {
    const handleKey =
      handle.dataset.spectrumIndicatorHandle === "middle"
        ? "middle"
        : handle.dataset.spectrumIndicatorHandle === "end"
        ? "end"
        : "start";
    const handlePosition =
      handleKey === "start"
        ? picker.indicatorRange.start
        : handleKey === "middle"
          ? gradientMiddlePosition
        : picker.indicatorRange.end;
    handle.hidden = handleKey === "middle" ? !gradientMiddleEnabled : false;
    handle.style.left = `${handlePosition * 100}%`;
    handle.style.background = rgbaToCss(
      picker.gradientStops[handleKey],
      picker.gradientOpacity[handleKey],
    );
    handle.classList.toggle("is-active", picker.mode === "gradient" && handleKey === activeGradientStop);
  }
  for (const button of picker.modeButtons) {
    const buttonMode = button.dataset.spectrumMode === "gradient" ? "gradient" : "solid";
    const buttonPreviewFill =
      buttonMode === "gradient" ? gradientCoverageFill : solidCoverageFill;
    const buttonPreviewHoverFill =
      buttonMode === "gradient" ? gradientCoverageHoverFill : solidCoverageHoverFill;
    const isActive = button.dataset.spectrumMode === picker.mode;
    if (buttonMode === "gradient") {
      button.style.setProperty("--settings-spectrum-gradient-preview", buttonPreviewFill);
      button.style.setProperty(
        "--settings-spectrum-gradient-preview-hover",
        buttonPreviewHoverFill,
      );
    } else {
      button.style.setProperty("--settings-spectrum-solid-preview", buttonPreviewFill);
      button.style.setProperty(
        "--settings-spectrum-solid-preview-hover",
        buttonPreviewHoverFill,
      );
    }
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
    button.style.background = isActive ? buttonPreviewFill : "";
    button.style.borderColor = isActive ? "transparent" : "";
    button.style.color = isActive ? "var(--accent-contrast)" : "";
  }
  if (picker.gradientPreview) {
    picker.gradientPreview.style.background = `${gradientCoverageFill}, ${getTransparencyBackdropCss()}`;
  }
  if (picker.opacity) {
    picker.opacity.hidden = picker.mode !== "gradient";
  }
  if (picker.primaryStopGroup) {
    picker.primaryStopGroup.hidden =
      picker.mode !== "gradient" || !picker.enableGradientPrimaryStopSelector;
  }
  for (const button of picker.primaryStopButtons ?? []) {
    const stopKey = button.dataset.spectrumPrimaryStop === "end" ? "end" : "start";
    const isActive = picker.mode === "gradient" && stopKey === picker.gradientPrimaryStop;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  }
  if (picker.opacityStartCircle) {
    picker.opacityStartCircle.style.background = getAlphaSwatchFill(
      picker.gradientStops.start,
      picker.gradientOpacity.start,
    );
  }
  if (picker.opacityMiddleCircle) {
    picker.opacityMiddleCircle.hidden = !gradientMiddleEnabled;
    picker.opacityMiddleCircle.style.background = getAlphaSwatchFill(
      picker.gradientStops.middle,
      picker.gradientOpacity.middle,
    );
  }
  if (picker.opacityEndCircle) {
    picker.opacityEndCircle.style.background = getAlphaSwatchFill(
      picker.gradientStops.end,
      picker.gradientOpacity.end,
    );
  }
  if (picker.opacityStartValue) {
    picker.opacityStartValue.textContent = `${Math.round(picker.gradientOpacity.start * 100)}%`;
  }
  if (picker.opacityMiddleValue) {
    picker.opacityMiddleValue.hidden = !gradientMiddleEnabled;
    picker.opacityMiddleValue.textContent = `${Math.round(picker.gradientOpacity.middle * 100)}%`;
  }
  if (picker.opacityEndValue) {
    picker.opacityEndValue.textContent = `${Math.round(picker.gradientOpacity.end * 100)}%`;
  }
  if (picker.opacityActiveValue) {
    picker.opacityActiveValue.textContent = `${
      Math.round(picker.gradientOpacity[activeGradientStop] * 100)
    }%`;
  }
  if (picker.opacitySlider) {
    picker.opacitySlider.value = String(Math.round(picker.gradientOpacity[activeGradientStop] * 100));
    picker.opacitySlider.style.setProperty(
      "--gradient-opacity-slider-fill",
      `linear-gradient(90deg, ${rgbaToCss(picker.gradientStops[activeGradientStop], 0)}, ${rgbaToCss(
        picker.gradientStops[activeGradientStop],
        1,
      )})`,
    );
    picker.opacitySlider.style.setProperty(
      "--gradient-opacity-thumb-color",
      rgbaToCss(
        picker.gradientStops[activeGradientStop],
        picker.gradientOpacity[activeGradientStop],
      ),
    );
  }
  picker.opacityStartTrigger?.classList.toggle("is-active", activeGradientStop === "start");
  if (picker.opacityMiddleTrigger) {
    picker.opacityMiddleTrigger.hidden = !gradientMiddleEnabled;
    picker.opacityMiddleTrigger.classList.toggle("is-active", activeGradientStop === "middle");
  }
  picker.opacityEndTrigger?.classList.toggle("is-active", activeGradientStop === "end");
  if (picker.triggerSwatch && picker.mode === "gradient") {
    picker.triggerSwatch.style.background = `${gradientCoverageFill}, ${getTransparencyBackdropCss()}`;
  }
  if (picker.gradientStartSwatch) {
    picker.gradientStartSwatch.style.background = getAlphaSwatchFill(
      picker.gradientStops.start,
      picker.gradientOpacity.start,
    );
  }
  if (picker.gradientEndSwatch) {
    picker.gradientEndSwatch.style.background = getAlphaSwatchFill(
      picker.gradientStops.end,
      picker.gradientOpacity.end,
    );
  }
  if (picker.gradientMiddleSwatch) {
    picker.gradientMiddleSwatch.hidden = !gradientMiddleEnabled;
    picker.gradientMiddleSwatch.style.background = getAlphaSwatchFill(
      picker.gradientStops.middle,
      picker.gradientOpacity.middle,
    );
  }
  if (picker.gradientStartValue) {
    picker.gradientStartValue.textContent = window.WebTheme.rgbToHex(
      picker.gradientStops.start,
    );
  }
  if (picker.gradientMiddleValue) {
    picker.gradientMiddleValue.hidden = !gradientMiddleEnabled;
    picker.gradientMiddleValue.textContent = window.WebTheme.rgbToHex(
      picker.gradientStops.middle,
    );
  }
  if (picker.gradientEndValue) {
    picker.gradientEndValue.textContent = window.WebTheme.rgbToHex(
      picker.gradientStops.end,
    );
  }
  picker.gradientStartTrigger?.classList.toggle("is-active", activeGradientStop === "start");
  if (picker.gradientMiddleTrigger) {
    picker.gradientMiddleTrigger.hidden = !gradientMiddleEnabled;
    picker.gradientMiddleTrigger.classList.toggle("is-active", activeGradientStop === "middle");
  }
  picker.gradientEndTrigger?.classList.toggle("is-active", activeGradientStop === "end");
  if (activeElement !== picker.hexInput) {
    picker.hexInput.value = hexValue;
  }
  if (activeElement !== picker.redInput) {
    picker.redInput.value = String(editingTheme.r);
  }
  if (activeElement !== picker.greenInput) {
    picker.greenInput.value = String(editingTheme.g);
  }
  if (activeElement !== picker.blueInput) {
    picker.blueInput.value = String(editingTheme.b);
  }
  if (picker.direction) {
    picker.direction.hidden = picker.mode !== "gradient";
  }
  if (picker.directionPad) {
    picker.directionPad.style.background = `${gradientCoverageFill}, ${getTransparencyBackdropCss()}`;
    picker.directionPad.style.setProperty("--gradient-direction-progress", `${(gradientAngle / 360) * 100}%`);
  }
  if (picker.directionValue) {
    picker.directionValue.textContent = formatGradientAngleLabel(gradientAngle);
  }
  picker.panel.style.setProperty(
    "--gradient-start-color",
    window.WebTheme.rgbToHex(picker.gradientStops.start),
  );
  picker.panel.style.setProperty(
    "--gradient-middle-color",
    window.WebTheme.rgbToHex(picker.gradientStops.middle),
  );
  picker.panel.style.setProperty(
    "--gradient-end-color",
    window.WebTheme.rgbToHex(picker.gradientStops.end),
  );
  picker.panel.style.setProperty("--gradient-middle-position", `${gradientMiddlePosition * 100}%`);
  picker.spectrum.classList.toggle(
    "is-gradient-flyout-open",
    picker.mode === "gradient" && Boolean(picker.gradientFlyoutOpen),
  );
  picker.panelHandle.hidden = false;
  picker.panelHandle.style.background = rgbaToCss(
    picker.gradientStops[activeGradientStop],
    picker.gradientOpacity[activeGradientStop],
  );
  picker.panelHandle.style.left = `${hsv.s * 100}%`;
  picker.panelHandle.style.top = `${(1 - hsv.v) * 100}%`;
  picker.hueHandle.style.left = `${(hsv.h / 360) * 100}%`;

  if (picker.gradientEditor) {
    renderStandaloneSpectrumEditor(picker.gradientEditor, editingTheme);
  }
}

function getSpectrumPickerMarkup(triggerLabel = "Current Color") {
  return `
    <summary
      class="settings-spectrum__trigger"
      aria-haspopup="dialog"
      aria-expanded="false"
      data-spectrum-trigger
    >
      <span class="settings-spectrum__trigger-swatch" data-spectrum-trigger-swatch></span>
      <span class="settings-spectrum__trigger-copy">
        <span class="settings-spectrum__trigger-label">${triggerLabel}</span>
        <span class="settings-spectrum__trigger-value" data-spectrum-trigger-value>#2563EB</span>
      </span>
      <span class="settings-spectrum__trigger-caret" aria-hidden="true"></span>
    </summary>

    <div class="settings-spectrum__popover" hidden data-spectrum-popover>
      <div class="settings-spectrum__mode-row" role="group" aria-label="Color style">
        <button
          type="button"
          class="settings-spectrum__mode-button settings-spectrum__mode-button--solid is-active"
          data-spectrum-mode="solid"
          aria-pressed="true"
        >
          Solid
        </button>
        <button
          type="button"
          class="settings-spectrum__mode-button settings-spectrum__mode-button--gradient"
          data-spectrum-mode="gradient"
          aria-pressed="false"
        >
          Gradient
        </button>
      </div>

      <div class="settings-spectrum__solid-controls" data-spectrum-solid-controls>
        <div class="settings-spectrum__indicator" data-spectrum-indicator>
          <span class="settings-spectrum__indicator-swatch" data-spectrum-indicator-swatch>
            <button
              type="button"
              class="settings-spectrum__indicator-handle"
              data-spectrum-indicator-handle="start"
              data-spectrum-indicator-tooltip="Color 1"
              aria-label="Adjust Color 1 indicator"
            ></button>
            <button
              type="button"
              class="settings-spectrum__indicator-handle"
              data-spectrum-indicator-handle="middle"
              data-spectrum-indicator-tooltip="Color 3"
              aria-label="Adjust Color 3 indicator"
              hidden
            ></button>
            <button
              type="button"
              class="settings-spectrum__indicator-handle"
              data-spectrum-indicator-handle="end"
              data-spectrum-indicator-tooltip="Color 2"
              aria-label="Adjust Color 2 indicator"
            ></button>
          </span>
        </div>

        <div
          class="settings-spectrum__primary-stop"
          data-spectrum-primary-stop-group
          hidden
          role="group"
          aria-label="Primary gradient color"
        >
          <button
            type="button"
            class="settings-spectrum__primary-stop-option is-active"
            data-spectrum-primary-stop="start"
            aria-pressed="true"
          >
            <span class="settings-spectrum__primary-stop-check" aria-hidden="true"></span>
            <span>Color 1</span>
          </button>
          <button
            type="button"
            class="settings-spectrum__primary-stop-option"
            data-spectrum-primary-stop="end"
            aria-pressed="false"
          >
            <span class="settings-spectrum__primary-stop-check" aria-hidden="true"></span>
            <span>Color 2</span>
          </button>
        </div>

        <div class="settings-spectrum__opacity" data-spectrum-opacity>
          <div class="settings-spectrum__opacity-row">
            <button
              type="button"
              class="settings-spectrum__opacity-stop"
              data-spectrum-opacity-trigger="start"
            >
              <span
                class="settings-spectrum__opacity-stop-circle"
                data-spectrum-opacity-start-circle
              ></span>
              <span class="settings-spectrum__opacity-stop-copy">
                <span class="settings-spectrum__opacity-stop-label">Color 1</span>
                <span
                  class="settings-spectrum__opacity-stop-value"
                  data-spectrum-opacity-start-value
                >100%</span>
              </span>
            </button>

            <button
              type="button"
              class="settings-spectrum__opacity-stop"
              data-spectrum-opacity-trigger="middle"
              hidden
            >
              <span
                class="settings-spectrum__opacity-stop-circle"
                data-spectrum-opacity-middle-circle
              ></span>
              <span class="settings-spectrum__opacity-stop-copy">
                <span class="settings-spectrum__opacity-stop-label">Color 3</span>
                <span
                  class="settings-spectrum__opacity-stop-value"
                  data-spectrum-opacity-middle-value
                >100%</span>
              </span>
            </button>

            <button
              type="button"
              class="settings-spectrum__opacity-stop"
              data-spectrum-opacity-trigger="end"
            >
              <span
                class="settings-spectrum__opacity-stop-circle"
                data-spectrum-opacity-end-circle
              ></span>
              <span class="settings-spectrum__opacity-stop-copy">
                <span class="settings-spectrum__opacity-stop-label">Color 2</span>
                <span
                  class="settings-spectrum__opacity-stop-value"
                  data-spectrum-opacity-end-value
                >100%</span>
              </span>
            </button>
          </div>

          <div class="settings-spectrum__opacity-slider-row">
            <span class="settings-spectrum__opacity-slider-label">Opacity</span>
            <span class="settings-spectrum__opacity-slider-value" data-spectrum-opacity-active-value>
              100%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value="100"
            class="settings-spectrum__opacity-slider"
            data-spectrum-opacity-slider
            aria-label="Adjust active gradient color opacity"
          />
        </div>

        <div class="settings-spectrum__panel" data-spectrum-panel>
          <span class="settings-spectrum__panel-handle" aria-hidden="true"></span>
        </div>

        <div class="settings-spectrum__hue" data-spectrum-hue>
          <span class="settings-spectrum__hue-handle" aria-hidden="true"></span>
        </div>

        <div class="settings-spectrum__inputs">
          <label class="settings-spectrum__field settings-spectrum__field--hex">
            <span>Hex</span>
            <input type="text" inputmode="text" maxlength="7" value="#2563EB" data-spectrum-hex />
          </label>
          <label class="settings-spectrum__field">
            <span>R</span>
            <input type="number" min="0" max="255" value="37" data-spectrum-red />
          </label>
          <label class="settings-spectrum__field">
            <span>G</span>
            <input type="number" min="0" max="255" value="99" data-spectrum-green />
          </label>
          <label class="settings-spectrum__field">
            <span>B</span>
            <input type="number" min="0" max="255" value="235" data-spectrum-blue />
          </label>
        </div>

        <div class="settings-spectrum__gradient-flyout" hidden data-spectrum-gradient-flyout>
          <div class="settings-spectrum__gradient-flyout-card" data-spectrum-gradient-flyout-card>
            ${createSpectrumEditorMarkup("gradient-editor")}
          </div>
        </div>
      </div>

      <div class="settings-spectrum__gradient" data-spectrum-gradient>
        <div class="settings-spectrum__gradient-preview" data-spectrum-gradient-preview></div>
        <div class="settings-spectrum__gradient-stops">
          <button
            type="button"
            class="settings-spectrum__gradient-stop"
            data-spectrum-gradient-start-trigger
          >
            <span
              class="settings-spectrum__gradient-stop-swatch"
              data-spectrum-gradient-start-swatch
            ></span>
            <span class="settings-spectrum__gradient-stop-copy">
              <span class="settings-spectrum__gradient-stop-label">Start Color</span>
              <span
                class="settings-spectrum__gradient-stop-value"
                data-spectrum-gradient-start-value
              >#2563EB</span>
            </span>
          </button>
          <button
            type="button"
            class="settings-spectrum__gradient-stop"
            data-spectrum-gradient-middle-trigger
            hidden
          >
            <span
              class="settings-spectrum__gradient-stop-swatch"
              data-spectrum-gradient-middle-swatch
            ></span>
            <span class="settings-spectrum__gradient-stop-copy">
              <span class="settings-spectrum__gradient-stop-label">Color 3</span>
              <span
                class="settings-spectrum__gradient-stop-value"
                data-spectrum-gradient-middle-value
              >#5C86BA</span>
            </span>
          </button>
          <button
            type="button"
            class="settings-spectrum__gradient-stop"
            data-spectrum-gradient-end-trigger
          >
            <span
              class="settings-spectrum__gradient-stop-swatch"
              data-spectrum-gradient-end-swatch
            ></span>
            <span class="settings-spectrum__gradient-stop-copy">
              <span class="settings-spectrum__gradient-stop-label">End Color</span>
              <span
                class="settings-spectrum__gradient-stop-value"
                data-spectrum-gradient-end-value
              >#1D4ED8</span>
            </span>
          </button>
        </div>
      </div>

      <div class="settings-spectrum__direction" data-spectrum-direction>
        <div class="settings-spectrum__direction-header">
          <span class="settings-spectrum__direction-label">Gradient Line</span>
          <span class="settings-spectrum__direction-value" data-spectrum-direction-value>135deg</span>
        </div>
        <button
          type="button"
          class="settings-spectrum__direction-pad"
          data-spectrum-direction-pad
          aria-label="Adjust gradient line direction"
        >
          <span class="settings-spectrum__direction-grid" aria-hidden="true"></span>
          <span class="settings-spectrum__direction-line" aria-hidden="true"></span>
          <span class="settings-spectrum__direction-center" aria-hidden="true"></span>
          <span class="settings-spectrum__direction-handle" data-spectrum-direction-handle></span>
        </button>
      </div>
    </div>
  `;
}

function ensureConfigSpectrumPicker(menu, colorInput, options = {}) {
  const {
    pickerKey,
    titleText,
    triggerLabel = "Current Color",
    recentLabel = "Recent",
    expandedClass = "",
    stripPrimaryMeta = false,
    resolveLayoutTarget = null,
    getDraftTheme,
    setDraftTheme,
    applyPreviewConfig,
    initialTheme,
    loadRecentConfigs = null,
    applyRecentConfig = null,
    normalizeRecentConfig = null,
    solidRecentFallback = null,
    enableGradientPrimaryStopSelector = false,
  } = options;

  if (
    !pickerKey ||
    typeof getDraftTheme !== "function" ||
    typeof setDraftTheme !== "function" ||
    typeof applyPreviewConfig !== "function"
  ) {
    return null;
  }

  if (menu[pickerKey]) {
    return menu[pickerKey];
  }

  const field = colorInput.closest(".settings-color-field");
  if (!(field instanceof HTMLElement)) {
    return null;
  }

  if (stripPrimaryMeta) {
    const primaryMeta = menu.querySelector(".settings-color-meta");
    if (
      primaryMeta instanceof HTMLElement &&
      (primaryMeta.querySelector("[data-theme-hex]") ||
        primaryMeta.querySelector("[data-theme-rgb]"))
    ) {
      primaryMeta.remove();
    }
  }

  const title = field.querySelector("span");
  if (title) {
    title.textContent = titleText;
  }

  field.classList.add("settings-color-field--primary");
  const layoutTarget =
    typeof resolveLayoutTarget === "function" ? resolveLayoutTarget(field) : field;
  if (layoutTarget instanceof HTMLElement) {
    layoutTarget.classList.add("settings-color-block");
  }
  colorInput.classList.add("settings-color-field__native-input");
  colorInput.classList.remove("settings-spectrum__native-input");

  const spectrum = document.createElement("details");
  spectrum.className = "settings-spectrum";
  spectrum.innerHTML = getSpectrumPickerMarkup(triggerLabel);
  field.insertBefore(spectrum, colorInput);

  let recent = null;
  let recentGrid = null;
  if (
    typeof loadRecentConfigs === "function" &&
    typeof applyRecentConfig === "function" &&
    typeof normalizeRecentConfig === "function"
  ) {
    recent = document.createElement("div");
    recent.className = "settings-spectrum__recent";
    recent.hidden = true;
    recent.innerHTML = `
      <span class="settings-spectrum__recent-label">${recentLabel}</span>
      <div class="settings-spectrum__recent-grid" data-spectrum-recent-grid></div>
    `;
    recentGrid = recent.querySelector("[data-spectrum-recent-grid]");
  }

  const trigger = spectrum.querySelector("[data-spectrum-trigger]");
  const triggerSwatch = spectrum.querySelector("[data-spectrum-trigger-swatch]");
  const triggerValue = spectrum.querySelector("[data-spectrum-trigger-value]");
  const popover = spectrum.querySelector("[data-spectrum-popover]");
  const indicator = spectrum.querySelector("[data-spectrum-indicator]");
  const indicatorSwatch = spectrum.querySelector("[data-spectrum-indicator-swatch]");
  const indicatorHandles = Array.from(
    spectrum.querySelectorAll("[data-spectrum-indicator-handle]"),
  ).filter((handle) => handle instanceof HTMLButtonElement);
  const primaryStopGroup = spectrum.querySelector("[data-spectrum-primary-stop-group]");
  const primaryStopButtons = Array.from(
    spectrum.querySelectorAll("[data-spectrum-primary-stop]"),
  ).filter((button) => button instanceof HTMLButtonElement);
  const panel = spectrum.querySelector("[data-spectrum-panel]");
  const panelHandle = spectrum.querySelector(".settings-spectrum__panel-handle");
  const hue = spectrum.querySelector("[data-spectrum-hue]");
  const hueHandle = spectrum.querySelector(".settings-spectrum__hue-handle");
  const hexInput = spectrum.querySelector("[data-spectrum-hex]");
  const redInput = spectrum.querySelector("[data-spectrum-red]");
  const greenInput = spectrum.querySelector("[data-spectrum-green]");
  const blueInput = spectrum.querySelector("[data-spectrum-blue]");
  const gradientPreview = spectrum.querySelector("[data-spectrum-gradient-preview]");
  const gradientStartTrigger = spectrum.querySelector("[data-spectrum-gradient-start-trigger]");
  const gradientStartSwatch = spectrum.querySelector("[data-spectrum-gradient-start-swatch]");
  const gradientStartValue = spectrum.querySelector("[data-spectrum-gradient-start-value]");
  const gradientMiddleTrigger = spectrum.querySelector("[data-spectrum-gradient-middle-trigger]");
  const gradientMiddleSwatch = spectrum.querySelector("[data-spectrum-gradient-middle-swatch]");
  const gradientMiddleValue = spectrum.querySelector("[data-spectrum-gradient-middle-value]");
  const gradientEndTrigger = spectrum.querySelector("[data-spectrum-gradient-end-trigger]");
  const gradientEndSwatch = spectrum.querySelector("[data-spectrum-gradient-end-swatch]");
  const gradientEndValue = spectrum.querySelector("[data-spectrum-gradient-end-value]");
  const gradientFlyout = spectrum.querySelector("[data-spectrum-gradient-flyout]");
  const gradientFlyoutCard = spectrum.querySelector("[data-spectrum-gradient-flyout-card]");
  const gradientEditor = getSpectrumEditor(spectrum, "gradient-editor");
  const opacity = spectrum.querySelector("[data-spectrum-opacity]");
  const opacitySlider = spectrum.querySelector("[data-spectrum-opacity-slider]");
  const opacityActiveValue = spectrum.querySelector("[data-spectrum-opacity-active-value]");
  const opacityStartTrigger = spectrum.querySelector('[data-spectrum-opacity-trigger="start"]');
  const opacityMiddleTrigger = spectrum.querySelector('[data-spectrum-opacity-trigger="middle"]');
  const opacityEndTrigger = spectrum.querySelector('[data-spectrum-opacity-trigger="end"]');
  const opacityStartCircle = spectrum.querySelector("[data-spectrum-opacity-start-circle]");
  const opacityMiddleCircle = spectrum.querySelector("[data-spectrum-opacity-middle-circle]");
  const opacityEndCircle = spectrum.querySelector("[data-spectrum-opacity-end-circle]");
  const opacityStartValue = spectrum.querySelector("[data-spectrum-opacity-start-value]");
  const opacityMiddleValue = spectrum.querySelector("[data-spectrum-opacity-middle-value]");
  const opacityEndValue = spectrum.querySelector("[data-spectrum-opacity-end-value]");
  const direction = spectrum.querySelector("[data-spectrum-direction]");
  const directionPad = spectrum.querySelector("[data-spectrum-direction-pad]");
  const directionValue = spectrum.querySelector("[data-spectrum-direction-value]");
  const directionHandle = spectrum.querySelector("[data-spectrum-direction-handle]");
  const modeButtons = Array.from(
    spectrum.querySelectorAll("[data-spectrum-mode]"),
  ).filter((button) => button instanceof HTMLButtonElement);

  if (recent instanceof HTMLElement && popover instanceof HTMLElement) {
    popover.appendChild(recent);
  }

  if (
    !(trigger instanceof HTMLElement) ||
    !(triggerSwatch instanceof HTMLElement) ||
    !(triggerValue instanceof HTMLElement) ||
    !(popover instanceof HTMLElement) ||
    !(indicator instanceof HTMLElement) ||
    !(indicatorSwatch instanceof HTMLElement) ||
    indicatorHandles.length !== 3 ||
    !(primaryStopGroup instanceof HTMLElement) ||
    primaryStopButtons.length !== 2 ||
    !(panel instanceof HTMLElement) ||
    !(panelHandle instanceof HTMLElement) ||
    !(hue instanceof HTMLElement) ||
    !(hueHandle instanceof HTMLElement) ||
    !(hexInput instanceof HTMLInputElement) ||
    !(redInput instanceof HTMLInputElement) ||
    !(greenInput instanceof HTMLInputElement) ||
    !(blueInput instanceof HTMLInputElement) ||
    !(gradientPreview instanceof HTMLElement) ||
    !(gradientStartTrigger instanceof HTMLButtonElement) ||
    !(gradientStartSwatch instanceof HTMLElement) ||
    !(gradientStartValue instanceof HTMLElement) ||
    !(gradientMiddleTrigger instanceof HTMLButtonElement) ||
    !(gradientMiddleSwatch instanceof HTMLElement) ||
    !(gradientMiddleValue instanceof HTMLElement) ||
    !(gradientEndTrigger instanceof HTMLButtonElement) ||
    !(gradientEndSwatch instanceof HTMLElement) ||
    !(gradientEndValue instanceof HTMLElement) ||
    !(gradientFlyout instanceof HTMLElement) ||
    !(gradientFlyoutCard instanceof HTMLElement) ||
    !(opacity instanceof HTMLElement) ||
    !(opacitySlider instanceof HTMLInputElement) ||
    !(opacityActiveValue instanceof HTMLElement) ||
    !(opacityStartTrigger instanceof HTMLButtonElement) ||
    !(opacityMiddleTrigger instanceof HTMLButtonElement) ||
    !(opacityEndTrigger instanceof HTMLButtonElement) ||
    !(opacityStartCircle instanceof HTMLElement) ||
    !(opacityMiddleCircle instanceof HTMLElement) ||
    !(opacityEndCircle instanceof HTMLElement) ||
    !(opacityStartValue instanceof HTMLElement) ||
    !(opacityMiddleValue instanceof HTMLElement) ||
    !(opacityEndValue instanceof HTMLElement) ||
    !(direction instanceof HTMLElement) ||
    !(directionPad instanceof HTMLButtonElement) ||
    !(directionValue instanceof HTMLElement) ||
    !(directionHandle instanceof HTMLElement) ||
    !isSpectrumEditorReady(gradientEditor) ||
    modeButtons.length === 0
  ) {
    return null;
  }

  const resolvedInitialTheme = window.WebTheme.normalizeTheme(
    typeof initialTheme === "function" ? initialTheme(menu) : getDraftTheme(menu),
  );
  const picker = {
    field,
    spectrum,
    dropdown: field.closest("[data-settings-dropdown]"),
    trigger,
    triggerSwatch,
    triggerValue,
    popover,
    indicator,
    indicatorSwatch,
    indicatorHandles,
    primaryStopGroup,
    primaryStopButtons,
    panel,
    panelHandle,
    hue,
    hueHandle,
    hexInput,
    redInput,
    greenInput,
    blueInput,
    gradientPreview,
    gradientStartTrigger,
    gradientStartSwatch,
    gradientStartValue,
    gradientMiddleTrigger,
    gradientMiddleSwatch,
    gradientMiddleValue,
    gradientEndTrigger,
    gradientEndSwatch,
    gradientEndValue,
    gradientFlyout,
    gradientFlyoutCard,
    gradientEditor,
    opacity,
    opacitySlider,
    opacityActiveValue,
    opacityStartTrigger,
    opacityMiddleTrigger,
    opacityEndTrigger,
    opacityStartCircle,
    opacityMiddleCircle,
    opacityEndCircle,
    opacityStartValue,
    opacityMiddleValue,
    opacityEndValue,
    direction,
    directionPad,
    directionValue,
    directionHandle,
    modeButtons,
    layoutTarget: layoutTarget instanceof HTMLElement ? layoutTarget : field,
    recent,
    recentGrid,
    expandedClass,
    mode: "solid",
    gradientStops: null,
    activeGradientStop: "start",
    gradientPrimaryStop: window.WebTheme.defaultGradientPrimaryStop ?? "start",
    enableGradientPrimaryStopSelector: Boolean(enableGradientPrimaryStopSelector),
    gradientMiddleEnabled: false,
    gradientMiddlePosition: window.WebTheme.defaultGradientMiddlePosition ?? 0.5,
    gradientFlyoutOpen: false,
    indicatorRange: {
      start: 0.16,
      end: 0.82,
    },
    gradientAngle: window.WebTheme.defaultGradientAngle ?? 135,
    gradientOpacity: {
      start: window.WebTheme.defaultGradientOpacity?.start ?? 1,
      middle:
        window.WebTheme.defaultGradientOpacity?.middle ??
        window.WebTheme.defaultGradientOpacity?.start ??
        1,
      end: window.WebTheme.defaultGradientOpacity?.end ?? 1,
    },
    isInteracting: false,
    state: rgbToHsv(resolvedInitialTheme),
  };

  const renderCurrentTheme = () => {
    renderSpectrumPicker(picker, getDraftTheme(menu));
  };

  const renderRecentConfigs = () => {
    if (!(picker.recent instanceof HTMLElement) || !(picker.recentGrid instanceof HTMLElement)) {
      return;
    }

    const recentConfigs = loadRecentConfigs().slice(0, maxRecentSpectrumConfigs);
    picker.recentGrid.textContent = "";
    picker.recent.hidden = recentConfigs.length === 0;

    recentConfigs.forEach((config, index) => {
      const normalizedConfig = normalizeRecentConfig(config);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "settings-spectrum__recent-swatch";
      button.style.background = getRecentSpectrumSwatchFill(
        normalizedConfig,
        normalizeRecentConfig,
        solidRecentFallback,
      );
      button.setAttribute(
        "aria-label",
        normalizedConfig.mode === "gradient"
          ? `Use recent gradient ${index + 1}`
          : `Use recent color ${window.WebTheme.rgbToHex(normalizedConfig.theme, solidRecentFallback)}`,
      );
      button.setAttribute(
        "title",
        normalizedConfig.mode === "gradient"
          ? `Recent ${index + 1}`
          : window.WebTheme.rgbToHex(normalizedConfig.theme, solidRecentFallback),
      );
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        applyRecentConfig(menu, normalizedConfig);
      });
      picker.recentGrid.appendChild(button);
    });
  };

  picker.refreshRecent = renderRecentConfigs;

  const ensureGradientStops = () => {
    picker.gradientStops ??= createDefaultGradientStops(getDraftTheme(menu));
    return picker.gradientStops;
  };

  const applyGradientStops = () => {
    const gradientStops = ensureGradientStops();
    const primaryStop =
      picker.enableGradientPrimaryStopSelector && picker.gradientPrimaryStop === "end"
        ? "end"
        : "start";
    picker.gradientPrimaryStop = primaryStop;
    setDraftTheme(menu, gradientStops[primaryStop]);
  };

  const getActiveGradientStopKey = () =>
    picker.activeGradientStop === "middle" && picker.gradientMiddleEnabled
      ? "middle"
      : picker.activeGradientStop === "end"
        ? "end"
        : "start";

  const getGradientMiddlePositionFromClientX = (clientX) => {
    const bounds = indicatorSwatch.getBoundingClientRect();
    if (!bounds.width) {
      return window.WebTheme.normalizeGradientMiddlePosition(
        picker.gradientMiddlePosition,
        picker.indicatorRange,
      );
    }

    return window.WebTheme.normalizeGradientMiddlePosition(
      clampUnit((clientX - bounds.left) / bounds.width),
      picker.indicatorRange,
    );
  };

  const ensureGradientMiddleStop = (position = null) => {
    const gradientStops = ensureGradientStops();
    const nextPosition = window.WebTheme.normalizeGradientMiddlePosition(
      position ?? picker.gradientMiddlePosition,
      picker.indicatorRange,
    );

    if (!picker.gradientMiddleEnabled) {
      gradientStops.middle = mixTheme(gradientStops.start, gradientStops.end, nextPosition);
      picker.gradientOpacity.middle = clampUnit(
        picker.gradientOpacity.start +
          ((picker.gradientOpacity.end - picker.gradientOpacity.start) * nextPosition),
        (picker.gradientOpacity.start + picker.gradientOpacity.end) / 2,
      );
    } else if (!gradientStops.middle) {
      gradientStops.middle = mixTheme(gradientStops.start, gradientStops.end, nextPosition);
    }

    picker.gradientMiddleEnabled = true;
    picker.gradientMiddlePosition = nextPosition;
    picker.activeGradientStop = "middle";
    applyGradientStops();
    return nextPosition;
  };

  const getEditingTheme = () => {
    if (picker.mode === "gradient") {
      return window.WebTheme.normalizeTheme(ensureGradientStops()[getActiveGradientStopKey()]);
    }

    return getDraftTheme(menu);
  };

  const setEditingTheme = (theme) => {
    if (picker.mode === "gradient") {
      ensureGradientStops()[getActiveGradientStopKey()] = window.WebTheme.normalizeTheme(theme);
      applyGradientStops();
      return;
    }

    setDraftTheme(menu, theme);
  };

  const applyThemeFromState = () => {
    const nextTheme = hsvToTheme(picker.state);
    setEditingTheme(nextTheme);
  };

  const updatePanelFromPointer = (event) => {
    const bounds = panel.getBoundingClientRect();
    picker.state.s = clampUnit((event.clientX - bounds.left) / bounds.width);
    picker.state.v = 1 - clampUnit((event.clientY - bounds.top) / bounds.height);
    applyThemeFromState();
  };

  const updateGradientMiddleFromPointer = (event) => {
    ensureGradientMiddleStop(getGradientMiddlePositionFromClientX(event.clientX));
    applyPreviewConfig(menu);
    renderCurrentTheme();
  };

  const updateIndicatorHandleFromPointer = (handleKey, event) => {
    const bounds = indicatorSwatch.getBoundingClientRect();
    if (!bounds.width) {
      return;
    }

    const nextPosition = clampUnit((event.clientX - bounds.left) / bounds.width);
    const barrierGap = 0.04;
    const edgeGap = barrierGap * 2;

    if (handleKey === "middle") {
      ensureGradientMiddleStop(nextPosition);
    } else if (handleKey === "end") {
      const minimumEnd = picker.gradientMiddleEnabled
        ? Math.min(1, picker.gradientMiddlePosition + barrierGap)
        : Math.min(1, picker.indicatorRange.start + edgeGap);
      picker.indicatorRange.end = Math.max(nextPosition, minimumEnd);
    } else {
      const maximumStart = picker.gradientMiddleEnabled
        ? Math.max(0, picker.gradientMiddlePosition - barrierGap)
        : Math.max(0, picker.indicatorRange.end - edgeGap);
      picker.indicatorRange.start = Math.min(nextPosition, maximumStart);
    }

    if (picker.gradientMiddleEnabled) {
      picker.gradientMiddlePosition = window.WebTheme.normalizeGradientMiddlePosition(
        picker.gradientMiddlePosition,
        picker.indicatorRange,
      );
    }

    applyPreviewConfig(menu);
    renderCurrentTheme();
  };

  const updateGradientAngleFromPointer = (event) => {
    const bounds = directionPad.getBoundingClientRect();
    if (!bounds.width) {
      return;
    }

    const nextPosition = clampUnit((event.clientX - bounds.left) / bounds.width);
    picker.gradientAngle = window.WebTheme.normalizeGradientAngle(nextPosition * 360);
    applyPreviewConfig(menu);
    renderCurrentTheme();
  };

  const setActiveGradientOpacity = (value) => {
    const stopKey = getActiveGradientStopKey();
    picker.gradientOpacity[stopKey] = clampUnit(Number(value) / 100);
    applyPreviewConfig(menu);
    renderCurrentTheme();
  };

  const updateHueFromPointer = (event) => {
    const bounds = hue.getBoundingClientRect();
    const hueValue = clampUnit((event.clientX - bounds.left) / bounds.width);
    picker.state.h = hueValue >= 1 ? 359 : hueValue * 360;
    applyThemeFromState();
  };

  const applyRgbInputs = () => {
    const currentTheme = getEditingTheme();
    const nextTheme = {
      r: parseThemeChannelInput(redInput.value, currentTheme.r),
      g: parseThemeChannelInput(greenInput.value, currentTheme.g),
      b: parseThemeChannelInput(blueInput.value, currentTheme.b),
    };

    setEditingTheme(nextTheme);
  };

  const applyHexInput = () => {
    const nextTheme = parseThemeHexInput(hexInput.value);
    if (nextTheme) {
      setEditingTheme(nextTheme);
    }
  };

  const syncVisibleInputs = () => {
    renderCurrentTheme();
  };

  const closeGradientFlyout = () => {
    picker.gradientFlyoutOpen = false;
    picker.gradientFlyout.hidden = true;
    picker.spectrum.classList.remove("is-gradient-flyout-open");
  };

  const openGradientFlyout = () => {
    picker.gradientFlyoutOpen = true;
    picker.gradientFlyout.hidden = false;
    picker.spectrum.classList.add("is-gradient-flyout-open");
    renderCurrentTheme();
  };

  const toggleGradientFlyout = () => {
    if (picker.gradientFlyoutOpen) {
      closeGradientFlyout();
      return;
    }

    openGradientFlyout();
  };

  const startSpectrumInteraction = (event, onMove) => {
    picker.isInteracting = true;
    startPointerTracking(event, onMove, () => {
      window.setTimeout(() => {
        picker.isInteracting = false;
      }, 0);
    });
  };

  trigger.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  spectrum.addEventListener("toggle", () => {
    if (spectrum.open) {
      closeAllSpectrumPickers(picker);
      picker.dropdown?.classList.add("settings-dropdown--picker-open");
      if (picker.expandedClass) {
        picker.dropdown?.classList.add(picker.expandedClass);
      }
      picker.layoutTarget?.classList.add("is-expanded");
      picker.spectrum.classList.add("is-open");
      picker.popover.hidden = false;
      picker.trigger.setAttribute("aria-expanded", "true");
      positionSpectrumPicker(menu);
      return;
    }

    picker.dropdown?.classList.remove("settings-dropdown--picker-open");
    if (picker.expandedClass) {
      picker.dropdown?.classList.remove(picker.expandedClass);
    }
    picker.layoutTarget?.classList.remove("is-expanded");
    picker.spectrum.classList.remove("is-open");
    picker.popover.hidden = true;
    picker.trigger.setAttribute("aria-expanded", "false");
    closeGradientFlyout();
  });

  popover.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
  });

  popover.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  indicatorSwatch.addEventListener("pointerdown", (event) => {
    if (picker.mode === "gradient" && !(event.target instanceof HTMLButtonElement)) {
      event.preventDefault();
      event.stopPropagation();
      updateGradientMiddleFromPointer(event);
      startSpectrumInteraction(event, updateGradientMiddleFromPointer);
      return;
    }

    event.stopPropagation();
  });

  gradientFlyout.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
  });

  gradientFlyout.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  directionPad.addEventListener("pointerdown", (event) => {
    if (picker.mode !== "gradient") {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    startSpectrumInteraction(event, updateGradientAngleFromPointer);
  });

  directionPad.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
  });

  opacitySlider.addEventListener("input", (event) => {
    if (picker.mode !== "gradient") {
      return;
    }

    setActiveGradientOpacity(event.target.value);
  });

  opacitySlider.addEventListener("change", (event) => {
    if (picker.mode !== "gradient") {
      return;
    }

    setActiveGradientOpacity(event.target.value);
  });

  opacityStartTrigger.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    picker.activeGradientStop = "start";
    renderCurrentTheme();
  });

  opacityMiddleTrigger.addEventListener("click", (event) => {
    if (!picker.gradientMiddleEnabled) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    picker.activeGradientStop = "middle";
    renderCurrentTheme();
  });

  opacityEndTrigger.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    picker.activeGradientStop = "end";
    renderCurrentTheme();
  });

  for (const button of primaryStopButtons) {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (picker.mode !== "gradient" || !picker.enableGradientPrimaryStopSelector) {
        return;
      }

      picker.gradientPrimaryStop =
        button.dataset.spectrumPrimaryStop === "end" ? "end" : "start";
      applyGradientStops();
      renderCurrentTheme();
    });
  }

  for (const handle of indicatorHandles) {
    handle.addEventListener("pointerdown", (event) => {
      if (picker.mode !== "gradient") {
        return;
      }

      const handleKey =
        handle.dataset.spectrumIndicatorHandle === "middle"
          ? "middle"
          : handle.dataset.spectrumIndicatorHandle === "end"
            ? "end"
            : "start";
      picker.activeGradientStop = handleKey;
      renderCurrentTheme();
      event.preventDefault();
      event.stopPropagation();
      startSpectrumInteraction(event, (moveEvent) => {
        updateIndicatorHandleFromPointer(handleKey, moveEvent);
      });
    });

    handle.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
  }

  for (const button of modeButtons) {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const nextMode = button.dataset.spectrumMode === "gradient" ? "gradient" : "solid";
      if (picker.mode === nextMode) {
        return;
      }

      picker.mode = nextMode;
      if (nextMode === "gradient") {
        picker.activeGradientStop = "start";
        picker.gradientPrimaryStop = "start";
        picker.gradientStops = createDefaultGradientStops(getDraftTheme(menu));
        picker.gradientMiddleEnabled = false;
        picker.gradientMiddlePosition = window.WebTheme.defaultGradientMiddlePosition ?? 0.5;
        picker.gradientOpacity = {
          start: window.WebTheme.defaultGradientOpacity?.start ?? 1,
          middle:
            window.WebTheme.defaultGradientOpacity?.middle ??
            window.WebTheme.defaultGradientOpacity?.start ??
            1,
          end: window.WebTheme.defaultGradientOpacity?.end ?? 1,
        };
      }
      closeGradientFlyout();
      applyPreviewConfig(menu);
      renderCurrentTheme();
    });
  }

  gradientStartTrigger.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    picker.activeGradientStop = "start";
    renderCurrentTheme();
  });

  gradientMiddleTrigger.addEventListener("click", (event) => {
    if (!picker.gradientMiddleEnabled) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    picker.activeGradientStop = "middle";
    renderCurrentTheme();
  });

  gradientEndTrigger.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    picker.activeGradientStop = "end";
    renderCurrentTheme();
  });

  panelHandle.addEventListener("pointerdown", (event) => {
    startSpectrumInteraction(event, updatePanelFromPointer);
  });

  panelHandle.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
  });

  panel.addEventListener("pointerdown", (event) => {
    startSpectrumInteraction(event, updatePanelFromPointer);
  });

  panel.addEventListener("click", (event) => {
    if (picker.mode !== "gradient") {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
  });

  hue.addEventListener("pointerdown", (event) => {
    startSpectrumInteraction(event, updateHueFromPointer);
  });

  hexInput.addEventListener("input", applyHexInput);
  hexInput.addEventListener("change", applyHexInput);
  hexInput.addEventListener("blur", syncVisibleInputs);

  for (const input of [redInput, greenInput, blueInput]) {
    input.addEventListener("input", applyRgbInputs);
    input.addEventListener("change", applyRgbInputs);
    input.addEventListener("blur", syncVisibleInputs);
  }

  const bindGradientEditor = () => {
    const editor = picker.gradientEditor;
    if (!isSpectrumEditorReady(editor)) {
      return;
    }

    const applyGradientEditorTheme = (theme) => {
      setEditingTheme(theme);
    };

    const updateGradientEditorPanelFromPointer = (event) => {
      const bounds = editor.panel.getBoundingClientRect();
      editor.state.s = clampUnit((event.clientX - bounds.left) / bounds.width);
      editor.state.v = 1 - clampUnit((event.clientY - bounds.top) / bounds.height);
      applyGradientEditorTheme(hsvToTheme(editor.state));
    };

    const updateGradientEditorHueFromPointer = (event) => {
      const bounds = editor.hue.getBoundingClientRect();
      const hueValue = clampUnit((event.clientX - bounds.left) / bounds.width);
      editor.state.h = hueValue >= 1 ? 359 : hueValue * 360;
      applyGradientEditorTheme(hsvToTheme(editor.state));
    };

    const applyGradientEditorHexInput = () => {
      const nextTheme = parseThemeHexInput(editor.hexInput.value);
      if (nextTheme) {
        applyGradientEditorTheme(nextTheme);
      }
    };

    const applyGradientEditorRgbInputs = () => {
      const currentTheme = getEditingTheme();
      applyGradientEditorTheme({
        r: parseThemeChannelInput(editor.redInput.value, currentTheme.r),
        g: parseThemeChannelInput(editor.greenInput.value, currentTheme.g),
        b: parseThemeChannelInput(editor.blueInput.value, currentTheme.b),
      });
    };

    editor.panel.addEventListener("pointerdown", (event) => {
      startSpectrumInteraction(event, updateGradientEditorPanelFromPointer);
    });
    editor.hue.addEventListener("pointerdown", (event) => {
      startSpectrumInteraction(event, updateGradientEditorHueFromPointer);
    });
    editor.hexInput.addEventListener("input", applyGradientEditorHexInput);
    editor.hexInput.addEventListener("change", applyGradientEditorHexInput);
    editor.hexInput.addEventListener("blur", syncVisibleInputs);

    for (const input of [editor.redInput, editor.greenInput, editor.blueInput]) {
      input.addEventListener("input", applyGradientEditorRgbInputs);
      input.addEventListener("change", applyGradientEditorRgbInputs);
      input.addEventListener("blur", syncVisibleInputs);
    }
  };

  bindGradientEditor();

  menu[pickerKey] = picker;
  renderRecentConfigs();
  renderCurrentTheme();
  return picker;
}

function ensureSpectrumPicker(menu, colorInput) {
  return ensureConfigSpectrumPicker(menu, colorInput, {
    pickerKey: "_spectrumPicker",
    titleText: "Primary Color",
    triggerLabel: "Current Color",
    recentLabel: "Recent",
    expandedClass: "settings-dropdown--primary-expanded",
    stripPrimaryMeta: true,
    resolveLayoutTarget: (field) => field,
    enableGradientPrimaryStopSelector: true,
    getDraftTheme: () => getMenuDraftTheme(menu),
    setDraftTheme: (targetMenu, theme) => {
      setMenuDraftTheme(targetMenu, theme);
    },
    applyPreviewConfig: (targetMenu) => {
      window.WebTheme.applyTheme(getMenuThemeConfig(targetMenu));
    },
    initialTheme: () => window.WebTheme.loadTheme(),
    loadRecentConfigs: loadRecentThemeConfigs,
    applyRecentConfig: (targetMenu, config) => {
      setMenuDraftThemeConfig(targetMenu, config);
    },
    normalizeRecentConfig: window.WebTheme.normalizeThemeConfig,
    solidRecentFallback: window.WebTheme.defaultTheme,
  });
}

function ensureDashboardBackgroundSpectrum(menu) {
  if (menu._dashboardBackgroundPicker) {
    return menu._dashboardBackgroundPicker;
  }

  const colorInput = menu.querySelector("[data-dashboard-background-input]");
  if (!(colorInput instanceof HTMLInputElement)) {
    return null;
  }

  return ensureConfigSpectrumPicker(menu, colorInput, {
    pickerKey: "_dashboardBackgroundPicker",
    titleText: "Background Color",
    triggerLabel: "Current Background",
    recentLabel: "Recent",
    resolveLayoutTarget: (field) => field.closest("[data-dashboard-background-field]") ?? field,
    getDraftTheme: () => getMenuDraftDashboardBackground(menu),
    setDraftTheme: (targetMenu, theme) => {
      setMenuDraftDashboardBackground(targetMenu, theme);
    },
    applyPreviewConfig: (targetMenu) => {
      applyMenuDraftDashboardBackgroundPreview(targetMenu);
    },
    initialTheme: () => window.WebTheme.loadDashboardBackgroundConfig().theme,
    loadRecentConfigs: loadRecentDashboardBackgroundConfigs,
    applyRecentConfig: (targetMenu, config) => {
      setMenuDraftDashboardBackgroundConfig(targetMenu, config);
    },
    normalizeRecentConfig: window.WebTheme.normalizeDashboardBackgroundConfig,
    solidRecentFallback: window.WebTheme.defaultDashboardBackground,
  });
}

function updateScrollTopButtonVisibility() {
  if (!scrollTopButton) {
    return;
  }

  const shouldShow = window.scrollY > 220;
  scrollTopButton.classList.toggle("is-visible", shouldShow);
}

function ensureScrollTopButton() {
  if (scrollTopButton || !document.body) {
    return;
  }

  scrollTopButton = document.createElement("button");
  scrollTopButton.type = "button";
  scrollTopButton.className = "scroll-top-button";
  scrollTopButton.setAttribute("aria-label", "Scroll to top");
  scrollTopButton.setAttribute("data-ui-tooltip", "Scroll to top");
  scrollTopButton.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9">
      <path d="M12 18V6" stroke-linecap="round" />
      <path d="m7.5 10.5 4.5-4.5 4.5 4.5" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  `;

  scrollTopButton.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  });

  document.body.appendChild(scrollTopButton);
  applyThemedTooltips(scrollTopButton);
  updateScrollTopButtonVisibility();
}

function loadStoredLogo() {
  try {
    const logoKey = getScopedLoginLogoStorageKey(loginLogoStorageKey);
    const logoNameKey = getScopedLoginLogoStorageKey(loginLogoNameStorageKey);
    return {
      dataUrl: localStorage.getItem(logoKey) ?? "",
      name: localStorage.getItem(logoNameKey) ?? "",
    };
  } catch (error) {
    return { dataUrl: "", name: "" };
  }
}

function getDefaultWorkspaceLogoIconMarkup() {
  return `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-building2-icon lucide-building-2" aria-hidden="true">
      <path d="M10 12h4"></path><path d="M10 8h4"></path><path d="M14 21v-3a2 2 0 0 0-4 0v3"></path><path d="M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2"></path><path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"></path>
    </svg>`;
}

function shouldUseDefaultWorkspaceLogoIcon(target) {
  return Boolean(
    target?.classList?.contains("dashboard-sidebar__logo") ||
      target?.classList?.contains("product-panel-toolbar__avatar"),
  );
}

function updateLoginLogoTargets(dataUrl) {
  for (const target of loginLogoTargets) {
    if (target.dataset.employeeWorkspaceAvatar === "true") {
      continue;
    }

    const image = target.querySelector("[data-logo-image]");
    const placeholder = target.querySelector("[data-logo-placeholder]");

    if (!image || !placeholder) {
      continue;
    }

    target.removeAttribute("data-default-logo-src");

    if (dataUrl) {
      image.src = dataUrl;
      image.hidden = false;
      placeholder.hidden = true;
    } else {
      image.removeAttribute("src");
      image.hidden = true;
      placeholder.innerHTML = shouldUseDefaultWorkspaceLogoIcon(target)
        ? getDefaultWorkspaceLogoIconMarkup()
        : "";
      placeholder.hidden = false;
    }
  }
}

function saveLoginLogo(dataUrl, fileName) {
  try {
    localStorage.setItem(getScopedLoginLogoStorageKey(loginLogoStorageKey), dataUrl);
    localStorage.setItem(getScopedLoginLogoStorageKey(loginLogoNameStorageKey), fileName);
  } catch (error) {
    // Ignore storage errors and still update the current page.
  }

  updateLoginLogoTargets(dataUrl);
}

function clearStoredLoginLogo() {
  try {
    localStorage.removeItem(getScopedLoginLogoStorageKey(loginLogoStorageKey));
    localStorage.removeItem(getScopedLoginLogoStorageKey(loginLogoNameStorageKey));
  } catch (error) {
    // Ignore storage errors and still clear the current page.
  }

  updateLoginLogoTargets("");
}

function updateLogoRemoveButton(menu) {
  const removeButton = menu.querySelector("[data-logo-remove]");
  if (removeButton instanceof HTMLButtonElement) {
    removeButton.hidden = !loadStoredLogo().dataUrl;
  }
}

function updateLogoFileName(menu, fileName) {
  const nameLabel = menu.querySelector("[data-logo-file-name]");
  if (nameLabel) {
    nameLabel.textContent = fileName || "No file selected";
  }

  updateLogoRemoveButton(menu);
}

function buildAverageTheme(fallbackTheme, pixels) {
  let totalWeight = 0;
  let redTotal = 0;
  let greenTotal = 0;
  let blueTotal = 0;

  for (let index = 0; index < pixels.length; index += 4) {
    const alpha = pixels[index + 3];
    if (alpha < 80) {
      continue;
    }

    const weight = alpha / 255;
    totalWeight += weight;
    redTotal += pixels[index] * weight;
    greenTotal += pixels[index + 1] * weight;
    blueTotal += pixels[index + 2] * weight;
  }

  if (totalWeight === 0) {
    return fallbackTheme;
  }

  return window.WebTheme.normalizeTheme({
    r: Math.round(redTotal / totalWeight),
    g: Math.round(greenTotal / totalWeight),
    b: Math.round(blueTotal / totalWeight),
  });
}

function scoreLogoPixel(red, green, blue, alpha) {
  if (alpha < 96) {
    return 0;
  }

  const maxChannel = Math.max(red, green, blue);
  const minChannel = Math.min(red, green, blue);
  const saturation = maxChannel - minChannel;
  const brightness = (red * 299 + green * 587 + blue * 114) / 1000;

  if (brightness > 248 && saturation < 24) {
    return 0;
  }

  if (brightness < 18 && saturation < 24) {
    return 0;
  }

  const alphaWeight = alpha / 255;
  const brightnessPreference = 1 - Math.abs(brightness - 148) / 180;

  return Math.max(0.25, saturation / 255) * Math.max(0.2, brightnessPreference) * alphaWeight;
}

function extractThemeFromImageData(imageData, fallbackTheme) {
  const pixels = imageData.data;
  const buckets = new Map();

  for (let index = 0; index < pixels.length; index += 4) {
    const red = pixels[index];
    const green = pixels[index + 1];
    const blue = pixels[index + 2];
    const alpha = pixels[index + 3];
    const score = scoreLogoPixel(red, green, blue, alpha);

    if (score === 0) {
      continue;
    }

    const bucketRed = Math.round(red / 24) * 24;
    const bucketGreen = Math.round(green / 24) * 24;
    const bucketBlue = Math.round(blue / 24) * 24;
    const bucketKey = `${bucketRed}|${bucketGreen}|${bucketBlue}`;
    const bucket = buckets.get(bucketKey) ?? {
      score: 0,
      redTotal: 0,
      greenTotal: 0,
      blueTotal: 0,
    };

    bucket.score += score;
    bucket.redTotal += red * score;
    bucket.greenTotal += green * score;
    bucket.blueTotal += blue * score;
    buckets.set(bucketKey, bucket);
  }

  let bestBucket = null;

  for (const bucket of buckets.values()) {
    if (!bestBucket || bucket.score > bestBucket.score) {
      bestBucket = bucket;
    }
  }

  if (!bestBucket || bestBucket.score <= 0) {
    return buildAverageTheme(fallbackTheme, pixels);
  }

  return window.WebTheme.normalizeTheme({
    r: Math.round(bestBucket.redTotal / bestBucket.score),
    g: Math.round(bestBucket.greenTotal / bestBucket.score),
    b: Math.round(bestBucket.blueTotal / bestBucket.score),
  });
}

function detectThemeFromLogo(
  dataUrl,
  fallbackTheme = window.WebTheme.defaultTheme,
) {
  return new Promise((resolve) => {
    const image = new Image();

    image.addEventListener("load", () => {
      try {
        const longestSide = Math.max(image.naturalWidth || 1, image.naturalHeight || 1);
        const scale = Math.min(1, 56 / longestSide);
        const canvas = document.createElement("canvas");
        const width = Math.max(1, Math.round((image.naturalWidth || 1) * scale));
        const height = Math.max(1, Math.round((image.naturalHeight || 1) * scale));
        const context = canvas.getContext("2d", { willReadFrequently: true });

        if (!context) {
          resolve(window.WebTheme.normalizeTheme(fallbackTheme));
          return;
        }

        canvas.width = width;
        canvas.height = height;
        context.clearRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);

        resolve(
          extractThemeFromImageData(
            context.getImageData(0, 0, width, height),
            window.WebTheme.normalizeTheme(fallbackTheme),
          ),
        );
      } catch (error) {
        resolve(window.WebTheme.normalizeTheme(fallbackTheme));
      }
    });

    image.addEventListener("error", () => {
      resolve(window.WebTheme.normalizeTheme(fallbackTheme));
    });

    image.src = dataUrl;
  });
}

function clearSettingsMenuCloseTimer(menu) {
  if (!(menu instanceof HTMLElement) || !menu._settingsDropdownCloseTimer) {
    return;
  }

  window.clearTimeout(menu._settingsDropdownCloseTimer);
  menu._settingsDropdownCloseTimer = null;
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function finalizeSettingsMenuClose(menu, button, dropdown) {
  clearSettingsMenuCloseTimer(menu);
  dropdown.classList.remove("settings-dropdown--closing");
  button.setAttribute("aria-expanded", "false");
  dropdown.hidden = true;
  dropdown.style.top = "";
  dropdown.style.left = "";
  dropdown.style.right = "";
  syncSettingsDrawerScrollLock();
}

function closeSettingsMenu(menu, options = {}) {
  const { animate = false } = options;
  const button = menu.querySelector("[data-settings-toggle]");
  const dropdown = menu.querySelector("[data-settings-dropdown]");

  if (!button || !dropdown) {
    return;
  }

  closeSpectrumPicker(menu);

  const savedThemeConfig = window.WebTheme.loadThemeConfig();
  const savedBackgroundConfig = window.WebTheme.loadDashboardBackgroundConfig();
  if (menu instanceof HTMLElement) {
    applyMenuThemeConfigState(menu, savedThemeConfig);
    applyMenuDashboardBackgroundConfigState(menu, savedBackgroundConfig);
    if (menu._spectrumPicker) {
      menu._spectrumPicker.activeGradientStop = "start";
      menu._spectrumPicker.gradientFlyoutOpen = false;
      renderSpectrumPicker(menu._spectrumPicker, savedThemeConfig.theme);
    }
    if (menu._dashboardBackgroundPicker) {
      menu._dashboardBackgroundPicker.activeGradientStop = "start";
      menu._dashboardBackgroundPicker.gradientFlyoutOpen = false;
      renderSpectrumPicker(menu._dashboardBackgroundPicker, savedBackgroundConfig.theme);
    }
  }

  restoreSavedThemePreview();
  restoreSavedDashboardBackgroundPreview();

  clearSettingsMenuCloseTimer(menu);

  const shouldAnimateClose = animate || isSettingsDrawerMenu(menu);

  if (shouldAnimateClose && !dropdown.hidden && !prefersReducedMotion()) {
    button.setAttribute("aria-expanded", "false");
    dropdown.hidden = false;
    dropdown.classList.add("settings-dropdown--closing");
    if (menu instanceof HTMLElement) {
      menu._settingsDropdownCloseTimer = window.setTimeout(() => {
        finalizeSettingsMenuClose(menu, button, dropdown);
      }, settingsDropdownAnimationMs);
    }
    return;
  }

  finalizeSettingsMenuClose(menu, button, dropdown);
}

function positionSettingsDropdown(menu) {
  const dropdown = menu.querySelector("[data-settings-dropdown]");

  if (!dropdown || dropdown.hidden) {
    return;
  }

  dropdown.style.width = "";
  dropdown.style.top = "";
  dropdown.style.left = "";
  dropdown.style.right = "";
}

function repositionOpenSettingsMenus() {
  for (const menu of settingsMenus) {
    const button = menu.querySelector("[data-settings-toggle]");
    const dropdown = menu.querySelector("[data-settings-dropdown]");
    if (
      button &&
      dropdown &&
      !dropdown.hidden &&
      button.getAttribute("aria-expanded") === "true"
    ) {
      positionSettingsDropdown(menu);
    }
  }
}

function openSettingsMenu(menu) {
  const button = menu.querySelector("[data-settings-toggle]");
  const dropdown = menu.querySelector("[data-settings-dropdown]");

  if (!button || !dropdown) {
    return;
  }

  for (const otherMenu of settingsMenus) {
    if (otherMenu !== menu) {
      closeSettingsMenu(otherMenu);
    }
  }

  closeAllNotificationMenus();
  const savedThemeConfig = applyMenuThemeConfigState(menu, window.WebTheme.loadThemeConfig());
  clearSettingsMenuCloseTimer(menu);
  dropdown.classList.remove("settings-dropdown--closing");
  button.setAttribute("aria-expanded", "true");
  dropdown.hidden = false;
  updateSettingsMenu(
    menu,
    savedThemeConfig.theme,
    window.WebTheme.loadDashboardBackgroundConfig(),
    savedThemeConfig,
  );
  positionSettingsDropdown(menu);
  syncSettingsDrawerScrollLock();
}

function updateDashboardBackgroundField(menu, backgroundConfig) {
  const resolvedBackgroundConfig = applyMenuDashboardBackgroundConfigState(
    menu,
    backgroundConfig ?? window.WebTheme.loadDashboardBackgroundConfig(),
  );
  const normalizedBackground = resolvedBackgroundConfig.theme;
  const backgroundInput = menu.querySelector("[data-dashboard-background-input]");
  const hexValue = window.WebTheme.rgbToHex(
    normalizedBackground,
    window.WebTheme.defaultDashboardBackground,
  );

  if (backgroundInput) {
    backgroundInput.value = hexValue;
  }

  if (menu._dashboardBackgroundPicker) {
    renderSpectrumPicker(menu._dashboardBackgroundPicker, normalizedBackground);
  }

  updateDashboardBackgroundSaveState(menu);
  return resolvedBackgroundConfig;
}

function updateSettingsMenu(
  menu,
  theme,
  dashboardBackground = window.WebTheme.loadDashboardBackgroundConfig(),
  themeConfig = null,
) {
  const normalizedTheme = window.WebTheme.normalizeTheme(theme);
  const colorInput = menu.querySelector("[data-theme-color-input]");
  const hexLabel = menu.querySelector("[data-theme-hex]");
  const rgbLabel = menu.querySelector("[data-theme-rgb]");
  const saveButton = menu.querySelector("[data-theme-save]");
  const resolvedThemeConfig = applyMenuThemeConfigState(
    menu,
    themeConfig ?? { ...getMenuThemeConfig(menu), theme: normalizedTheme },
  );

  updateThemeScopeCopy(menu);

  if (colorInput) {
    colorInput.value = window.WebTheme.rgbToHex(normalizedTheme);
  }

  if (hexLabel) {
    hexLabel.textContent = window.WebTheme.rgbToHex(normalizedTheme);
  }

  if (rgbLabel) {
    rgbLabel.textContent = formatRgb(normalizedTheme);
  }

  updateDashboardBackgroundField(menu, dashboardBackground);
  if (menu._spectrumPicker) {
    renderSpectrumPicker(menu._spectrumPicker, normalizedTheme);
  }

  if (saveButton instanceof HTMLButtonElement) {
    saveButton.disabled = areThemeConfigsEqual(
      { ...getMenuThemeConfig(menu), theme: normalizedTheme },
      window.WebTheme.loadThemeConfig(),
    );
  }
}

function setMenuDraftThemeConfig(menu, config) {
  const normalizedConfig = applyMenuThemeConfigState(menu, config);
  window.WebTheme.applyTheme(normalizedConfig);
  updateSettingsMenu(
    menu,
    normalizedConfig.theme,
    getMenuDashboardBackgroundConfig(menu),
    normalizedConfig,
  );
  return normalizedConfig;
}

function setMenuDraftTheme(menu, theme) {
  const normalizedTheme = window.WebTheme.normalizeTheme(theme);
  if (menu instanceof HTMLElement) {
    menu._draftTheme = normalizedTheme;
  }

  const draftConfig = getMenuThemeConfig(menu);
  window.WebTheme.applyTheme(draftConfig);
  updateSettingsMenu(
    menu,
    normalizedTheme,
    getMenuDashboardBackgroundConfig(menu),
    draftConfig,
  );
}

function openEmployeeSetupSettingsMenu() {
  const menu = settingsMenus.find((entry) => isDashboardSettingsMenu(entry));
  if (!(menu instanceof HTMLElement)) {
    return;
  }

  const dropdown = menu.querySelector("[data-settings-dropdown]");
  if (!(dropdown instanceof HTMLElement)) {
    return;
  }

  ensureEmployeeSetupSettings(menu);
  dropdown.classList.add("settings-dropdown--employee-setup-only");
  const title = dropdown.querySelector(".settings-dropdown__title");
  if (title instanceof HTMLElement) {
    title.textContent = "Create Role";
  }
  openSettingsMenu(menu);
  window.setTimeout(() => {
    const panel = dropdown.querySelector("[data-employee-settings-panel]");
    const activeInput = getEmployeeSetupActiveInput(panel);
    (activeInput ?? dropdown.querySelector("[data-company-acronym-input]"))?.focus?.();
  }, 120);
}

function refreshSettingsMenusFromThemeScope(event = null) {
  const themeConfig =
    event?.detail?.themeConfig ?? window.WebTheme.loadThemeConfig();
  const dashboardBackgroundConfig =
    event?.detail?.dashboardBackgroundConfig ??
    window.WebTheme.loadDashboardBackgroundConfig();

  for (const menu of settingsMenus) {
    if (!(menu instanceof HTMLElement)) {
      continue;
    }

    applyMenuThemeConfigState(menu, themeConfig);
    applyMenuDashboardBackgroundConfigState(menu, dashboardBackgroundConfig);
    updateSettingsMenu(
      menu,
      themeConfig.theme,
      dashboardBackgroundConfig,
      themeConfig,
    );
  }

  refreshRecentSpectrumSwatches();
}

window.addEventListener("gms:close-notification-dropdowns", () => {
  closeAllNotificationMenus();
});

window.addEventListener("gms:open-employee-settings", openEmployeeSetupSettingsMenu);
window.addEventListener("gms-theme-scope-updated", refreshSettingsMenusFromThemeScope);

scheduleSellerAdminNotificationHeaderReady();
if (!document.querySelector("[data-seller-admin-notification]")) {
  registerSettingsMenusFromDom();
  ensureSettingsMenuForDashboardPage();
  registerSettingsMenusFromDom();
  document.querySelectorAll("[data-notification-menu]").forEach((notificationMenu) => {
    ensureNotificationMenu(null, notificationMenu);
  });
}

for (const menu of settingsMenus) {
  const button = menu.querySelector("[data-settings-toggle]");
  const dropdown = menu.querySelector("[data-settings-dropdown]");
  const colorInput = menu.querySelector("[data-theme-color-input]");
  const resetButton = menu.querySelector("[data-theme-reset]");
  const logoInput = menu.querySelector("[data-logo-file-input]");
  const logoRemoveButton = menu.querySelector("[data-logo-remove]");
  const closeButton = ensureSettingsCloseButton(menu);
  ensureDashboardBackgroundField(menu);
  ensureSettingsColorGrid(menu);
  ensureEmployeeSetupSettings(menu);

  if (!button || !dropdown || !colorInput || !resetButton) {
    continue;
  }

  if (!menu.hasAttribute("data-settings-menu-skip-notification") && !shouldUseSellerAdminNotificationOnlyHeader()) {
    ensureNotificationMenu(menu);
  }
  ensureSpectrumPicker(menu, colorInput);
  ensureThemeSaveActions(menu);
  ensureDashboardBackgroundSpectrum(menu);
  ensureDashboardBackgroundSaveActions(menu);
  const backgroundInput = menu.querySelector("[data-dashboard-background-input]");
  const backgroundResetButton = menu.querySelector("[data-dashboard-background-reset]");
  const backgroundSaveButton = menu.querySelector("[data-dashboard-background-save]");
  const saveButton = menu.querySelector("[data-theme-save]");
  updateSettingsMenu(menu, window.WebTheme.loadTheme());
  updateLogoFileName(menu, loadStoredLogo().name);
  button.addEventListener("click", () => {
    const isOpen = button.getAttribute("aria-expanded") === "true";

    if (isOpen) {
      closeSettingsMenu(menu);
      return;
    }

    dropdown.classList.remove("settings-dropdown--employee-setup-only");
    const title = dropdown.querySelector(".settings-dropdown__title");
    if (title instanceof HTMLElement) {
      title.textContent = "Color Picker";
    }
    openSettingsMenu(menu);
  });

  if (closeButton) {
    closeButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      closeSettingsMenu(menu, { animate: true });
      button.focus();
    });
  }

  const handleColorChange = (event) => {
    const theme = window.WebTheme.hexToTheme(event.target.value);
    setMenuDraftTheme(menu, theme);
  };

  colorInput.addEventListener("input", handleColorChange);
  colorInput.addEventListener("change", handleColorChange);

  if (saveButton instanceof HTMLButtonElement) {
    saveButton.addEventListener("click", () => {
      const draftThemeConfig = getMenuThemeConfig(menu);
      const nextHex = window.WebTheme.rgbToHex(draftThemeConfig.theme);
      const isGradientTheme = draftThemeConfig.mode === "gradient";
      const gradientPrimaryLabel =
        draftThemeConfig.gradientPrimaryStop === "end" ? "Color 2" : "Color 1";
      const themeScopeLabel = getActiveThemeScopeLabel();

      openSettingsValidationModal({
        variant: "notice",
        title: isGradientTheme ? "Save Gradient Theme" : "Save Primary Color",
        copy: isGradientTheme
          ? `Save this gradient button theme using ${nextHex} as ${gradientPrimaryLabel} primary color for ${themeScopeLabel}?`
          : `Save ${nextHex} as the primary color for ${themeScopeLabel}?`,
        primaryLabel: "Save",
        secondaryLabel: "Cancel",
        restoreFocusTarget: saveButton,
        onAction: () => {
          const savedThemeConfig = syncThemeAcrossMenus(draftThemeConfig);
          pushRecentThemeConfig(savedThemeConfig);
          refreshRecentSpectrumSwatches();

          openSettingsValidationModal({
            variant: "success",
            title: "Success",
            copy:
              savedThemeConfig.mode === "gradient"
                ? "Gradient button theme has been saved successfully."
                : `Primary color ${window.WebTheme.rgbToHex(savedThemeConfig.theme)} has been saved successfully.`,
            primaryLabel: "Okay",
            restoreFocusTarget: saveButton,
          });

          return false;
        },
      });
    });
  }

  if (backgroundInput) {
    const handleDashboardBackgroundChange = (event) => {
      const background = window.WebTheme.hexToDashboardBackground(event.target.value);
      setMenuDraftDashboardBackground(menu, background);
    };

    backgroundInput.addEventListener("input", handleDashboardBackgroundChange);
    backgroundInput.addEventListener("change", handleDashboardBackgroundChange);
  }

  if (backgroundResetButton instanceof HTMLButtonElement) {
    backgroundResetButton.addEventListener("click", () => {
      openSettingsValidationModal({
        variant: "notice",
        title: "Important Notice",
        copy: "Reset the background color back to its default setting?",
        primaryLabel: "Reset",
        secondaryLabel: "Cancel",
        restoreFocusTarget: backgroundResetButton,
        onAction: () => {
          const defaultBackgroundConfig = window.WebTheme.normalizeDashboardBackgroundConfig(
            window.WebTheme.defaultDashboardBackground,
          );
          updateDashboardBackgroundField(menu, defaultBackgroundConfig);
          applyMenuDraftDashboardBackgroundPreview(menu);
        },
      });
    });
  }

  if (backgroundSaveButton instanceof HTMLButtonElement) {
    backgroundSaveButton.addEventListener("click", () => {
      const draftBackgroundConfig = getMenuDashboardBackgroundConfig(menu);
      const nextHex = window.WebTheme.rgbToHex(
        draftBackgroundConfig.theme,
        window.WebTheme.defaultDashboardBackground,
      );
      const isGradientBackground = draftBackgroundConfig.mode === "gradient";
      const themeScopeLabel = getActiveThemeScopeLabel();

      openSettingsValidationModal({
        variant: "notice",
        title: isGradientBackground ? "Save Background Gradient" : "Save Background Color",
        copy: isGradientBackground
          ? `Save this gradient as the dashboard background for ${themeScopeLabel}?`
          : `Save ${nextHex} as the dashboard background color for ${themeScopeLabel}?`,
        primaryLabel: "Save",
        secondaryLabel: "Cancel",
        restoreFocusTarget: backgroundSaveButton,
        onAction: () => {
          const savedBackgroundConfig = syncDashboardBackgroundAcrossMenus(draftBackgroundConfig);
          pushRecentDashboardBackgroundConfig(savedBackgroundConfig);
          refreshRecentSpectrumSwatches();

          openSettingsValidationModal({
            variant: "success",
            title: "Success",
            copy:
              savedBackgroundConfig.mode === "gradient"
                ? "Dashboard background gradient has been saved successfully."
                : `Dashboard background color ${window.WebTheme.rgbToHex(savedBackgroundConfig.theme, window.WebTheme.defaultDashboardBackground)} has been saved successfully.`,
            primaryLabel: "Okay",
            restoreFocusTarget: backgroundSaveButton,
          });

          return false;
        },
      });
    });
  }

  if (logoInput) {
    logoInput.addEventListener("change", async () => {
      const file = logoInput.files?.[0];

      if (!file) {
        updateLogoFileName(menu, loadStoredLogo().name);
        return;
      }

      if (!String(file.type).startsWith("image/")) {
        updateLogoFileName(menu, "Please select an image file.");
        logoInput.value = "";
        return;
      }

      const reader = new FileReader();
      reader.addEventListener("load", async () => {
        const dataUrl = typeof reader.result === "string" ? reader.result : "";
        saveLoginLogo(dataUrl, file.name);
        updateLogoFileName(menu, `Applying theme from ${file.name}...`);

        const detectedTheme = await detectThemeFromLogo(dataUrl);
        const savedThemeConfig = syncThemeAcrossMenus(detectedTheme);

        for (const otherMenu of settingsMenus) {
          updateLogoFileName(otherMenu, file.name);
          updateSettingsMenu(
            otherMenu,
            savedThemeConfig.theme,
            getMenuDashboardBackgroundConfig(otherMenu),
            savedThemeConfig,
          );
        }
      });
      reader.readAsDataURL(file);
    });
  }

  if (logoRemoveButton instanceof HTMLButtonElement) {
    logoRemoveButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      clearStoredLoginLogo();

      for (const otherMenu of settingsMenus) {
        const otherLogoInput = otherMenu.querySelector("[data-logo-file-input]");
        if (otherLogoInput instanceof HTMLInputElement) {
          otherLogoInput.value = "";
        }
        updateLogoFileName(otherMenu, "");
      }
    });
  }

  resetButton.addEventListener("click", () => {
    const storedLogo = loadStoredLogo();
    openSettingsValidationModal({
      variant: "notice",
      title: "Important Notice",
      copy: storedLogo.dataUrl
        ? "Reset the primary color using your saved logo theme?"
        : "Reset the primary color back to its default setting?",
      primaryLabel: "Reset",
      secondaryLabel: "Cancel",
      restoreFocusTarget: resetButton,
      onAction: async () => {
        const fallbackTheme = window.WebTheme.defaultTheme;
        const nextTheme = storedLogo.dataUrl
          ? await detectThemeFromLogo(storedLogo.dataUrl, fallbackTheme)
          : fallbackTheme;
        syncThemeAcrossMenus(nextTheme);
      },
    });
  });
}

syncSettingsDrawerScrollLock();

document.addEventListener("click", (event) => {
  for (const menu of settingsMenus) {
    const isInteractingWithPicker = getMenuSpectrumPickers(menu).some(
      (picker) => picker?.isInteracting,
    );
    if (isInteractingWithPicker) {
      continue;
    }

    if (!menu.contains(event.target)) {
      closeSettingsMenu(menu);
    }
  }

  for (const entry of notificationEntries) {
    const target = event.target;
    const clickedInsideRoot = entry.root?.contains?.(target);
    const clickedInsidePanel = entry.dropdown?.contains?.(target);
    if (!clickedInsideRoot && !clickedInsidePanel) {
      closeNotificationMenuWithAnimation(entry);
    }
  }
});

document.addEventListener("click", handleCarouselButtonActivation, {
  capture: true,
});

// Sync workspace color from superadmin picker
function syncWorkspaceColorFromSuperAdmin() {
  let savedColor = "";
  try {
    savedColor = String(window.localStorage?.getItem("gms-workspace-color") || "").trim().toLowerCase();
  } catch (error) {
    savedColor = "";
  }

  if (!/^#[0-9a-f]{6}$/i.test(savedColor)) {
    return;
  }

  const rgb = savedColor
    .slice(1)
    .match(/.{2}/g)
    ?.map((part) => String(Number.parseInt(part, 16)))
    .join(", ");

  if (!rgb) {
    return;
  }

  const appliedSharedTheme = Boolean(window.WebTheme?.applyWorkspaceColor);
  if (appliedSharedTheme) {
    window.WebTheme.applyWorkspaceColor(savedColor, {
      cache: false,
      dispatch: false,
      source: "settings-sync",
    });
  }

  if (!appliedSharedTheme) {
    document.documentElement.style.setProperty("--accent", savedColor);
    document.documentElement.style.setProperty("--accent-text", savedColor);
    document.documentElement.style.setProperty("--accent-strong", savedColor);
    document.documentElement.style.setProperty("--accent-button-bg", savedColor);
    document.documentElement.style.setProperty("--accent-button-hover-bg", savedColor);
    document.documentElement.style.setProperty("--accent-rgb", rgb);
  }

  // Update color picker in settings dropdown if exists
  const colorInput = document.querySelector("[data-theme-color-input]");
  const hexLabel = document.querySelector("[data-theme-hex]");
  const rgbLabel = document.querySelector("[data-theme-rgb]");

  if (colorInput instanceof HTMLInputElement) {
    colorInput.value = savedColor;
  }
  if (hexLabel) {
    hexLabel.textContent = savedColor.toUpperCase();
  }
  if (rgbLabel) {
    rgbLabel.textContent = `RGB ${rgb}`;
  }
}

// Initialize on page load
syncWorkspaceColorFromSuperAdmin();

// Listen for storage changes from superadmin
window.addEventListener("storage", (event) => {
  if (event.key === "gms-workspace-color") {
    syncWorkspaceColorFromSuperAdmin();
  }
});
window.addEventListener("gms:workspace-color-changed", syncWorkspaceColorFromSuperAdmin);

const storedLogo = loadStoredLogo();
updateLoginLogoTargets(storedLogo.dataUrl);
ensureScrollTopButton();
applyThemedTooltips(document);
window.addEventListener("gms:realtime-change", handleNotificationRealtimeChange);
loadNotificationActivity();
window.setInterval(loadNotificationActivity, notificationRefreshMs);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    loadNotificationActivity();
  }
});
window.addEventListener("scroll", updateScrollTopButtonVisibility, {
  passive: true,
});
window.addEventListener("resize", updateScrollTopButtonVisibility);
window.addEventListener("resize", repositionOpenSettingsMenus);
window.addEventListener("resize", repositionOpenSpectrumPickers);
window.addEventListener("resize", repositionOpenNotificationPanels);
document.addEventListener("scroll", repositionOpenSettingsMenus, {
  passive: true,
  capture: true,
});
document.addEventListener("scroll", repositionOpenSpectrumPickers, {
  passive: true,
  capture: true,
});

document.addEventListener("wheel", (event) => {
  if (!shouldPreventDashboardScrollFromEvent(event.target)) {
    return;
  }

  event.preventDefault();
}, {
  passive: false,
  capture: true,
});

document.addEventListener("touchmove", (event) => {
  if (!shouldPreventDashboardScrollFromEvent(event.target)) {
    return;
  }

  event.preventDefault();
}, {
  passive: false,
  capture: true,
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") {
    const scrollKeys = new Set([
      "ArrowDown",
      "ArrowUp",
      "PageDown",
      "PageUp",
      "Home",
      "End",
      " ",
    ]);
    if (!scrollKeys.has(event.key) || !shouldPreventDashboardScrollFromEvent(event.target)) {
      return;
    }

    event.preventDefault();
    return;
  }

  let closedSpectrumPicker = false;

  for (const menu of settingsMenus) {
    const hasOpenPicker = getMenuSpectrumPickers(menu).some(
      (picker) => picker?.popover && !picker.popover.hidden,
    );
    if (hasOpenPicker) {
      closeSpectrumPicker(menu);
      closedSpectrumPicker = true;
    }
  }

  if (closedSpectrumPicker) {
    return;
  }

  for (const menu of settingsMenus) {
    closeSettingsMenu(menu);
  }

  closeAllNotificationMenus();
});
